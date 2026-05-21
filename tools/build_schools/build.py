"""
build.py — Campus Ready Foundation school master file builder.

Pipeline:
  Task 4: Read IPEDS HD2023 + IC2023, apply locked filter rules,
          emit crf_schools_master_raw.json (aliases empty) and
          crf_excluded_institutions.txt.
  Task 5: Parse IALIAS, load DormShopper export, run ambiguity check
          across the combined alias pool, merge surviving aliases into
          the master, emit crf_schools_merged.json and
          ambiguous_aliases_dropped.txt.
  Task 6: Inspection report (printed to stdout).

Run from tools/build_schools/:
    python3 build.py --source prod   # production DormShopper export
    python3 build.py --source sample # 20-record sample (development)

Reproducing the IPEDS inputs from scratch (not committed; ~10 MB):

    mkdir -p raw dict
    cd raw
    for f in HD2023.zip IC2023.zip HD2023_Dict.zip IC2023_Dict.zip; do
        curl -O "https://nces.ed.gov/ipeds/datacenter/data/$f"
        unzip -o "$f"
    done
    mv *_dict.xlsx ../dict/
"""

import csv
import json
import re
import sys
from collections import Counter, defaultdict

HD_PATH = 'raw/HD2023.csv'
IC_PATH = 'raw/IC2023.csv'
DORMSHOPPER_SAMPLE = '/Users/campusready/Downloads/crf_schools_SAMPLE.json'
DORMSHOPPER_PROD   = '/Users/campusready/Downloads/crf_schools_export.json'

OUT_MASTER  = 'crf_schools_master_raw.json'
OUT_MERGED  = 'crf_schools_merged.json'
OUT_EXCLUDED = 'crf_excluded_institutions.txt'
OUT_AMBIG    = 'ambiguous_aliases_dropped.txt'
RENAME_CROSSWALK = 'rename_crosswalk.json'

# Housing-note language (single source of truth; can be tuned later).
NOTE_NO_HOUSING = (
    "This school does not offer on-campus housing. "
    "The Campus Ready grant is for students moving into on-campus housing "
    "for their freshman year."
)
NOTE_LOW_CAPACITY = (
    "This school reports very limited on-campus housing. "
    "Please contact us at apply@campusready.org to confirm your eligibility "
    "before completing your application."
)

ICLEVEL_LABEL = {
    '1': '4-year',
    '2': '2-year',
    '3': 'less-than-2-year',
}

# Used only as a last-resort tiebreaker after city. DormShopper exports the
# full state name; IPEDS exports the two-letter abbreviation. Normalizing
# both to the abbreviation form makes the field usable for disambiguation
# without trusting it as a primary match field.
US_STATE_ABBR = {
    'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
    'colorado':'CO','connecticut':'CT','delaware':'DE','district of columbia':'DC',
    'florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL',
    'indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA',
    'maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI',
    'minnesota':'MN','mississippi':'MS','missouri':'MO','montana':'MT',
    'nebraska':'NE','nevada':'NV','new hampshire':'NH','new jersey':'NJ',
    'new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND',
    'ohio':'OH','oklahoma':'OK','oregon':'OR','pennsylvania':'PA',
    'rhode island':'RI','south carolina':'SC','south dakota':'SD','tennessee':'TN',
    'texas':'TX','utah':'UT','vermont':'VT','virginia':'VA','washington':'WA',
    'west virginia':'WV','wisconsin':'WI','wyoming':'WY',
    'american samoa':'AS','guam':'GU','northern mariana islands':'MP',
    'puerto rico':'PR','virgin islands':'VI',
}

def state_to_abbr(value):
    """Normalize a state value (full name or abbreviation) to a two-letter
    uppercase code, or '' if it can't be resolved."""
    if not value:
        return ''
    v = value.strip()
    if len(v) == 2:
        return v.upper()
    return US_STATE_ABBR.get(v.lower(), '')

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def normalize(s):
    """Lowercase, strip diacritics, strip punctuation, collapse whitespace."""
    if not s:
        return ''
    import unicodedata
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r'[^a-z0-9 ]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def slugify(name):
    """URL-safe slug from an institution name."""
    s = normalize(name)
    return s.replace(' ', '-')

def clean_zip(z):
    """Take first 5 digits of a ZIP string. Return None if not valid."""
    if not z:
        return None
    z = str(z).strip()
    m = re.match(r'(\d{5})', z)
    return m.group(1) if m else None

def load_csv_by_unitid(path):
    """Load an IPEDS CSV into dict keyed by UNITID (BOM-aware)."""
    with open(path, encoding='latin-1') as f:
        r = csv.DictReader(f)
        first = r.fieldnames[0]  # may include BOM
        out = {}
        for row in r:
            uid = row[first]
            row['UNITID'] = uid
            out[uid] = row
        return out

def parse_ialias(value):
    """Split a raw IALIAS string into tokens.

    The field uses inconsistent delimiters in IPEDS: pipe, comma, or
    'space pipe space'. Tokenize on either delimiter and discard empties.
    """
    if not value:
        return []
    v = value.strip()
    if not v:
        return []
    # Split on pipe or comma. Trim each piece.
    parts = re.split(r'[|,]', v)
    tokens = [p.strip() for p in parts if p and p.strip()]
    # Deduplicate within a record while preserving first-seen order.
    seen = set()
    out = []
    for t in tokens:
        key = normalize(t)
        if key and key not in seen:
            seen.add(key)
            out.append(t)
    return out

# ──────────────────────────────────────────────────────────────────────────────
# Task 4: Build the raw master from IPEDS
# ──────────────────────────────────────────────────────────────────────────────

def build_master():
    hd = load_csv_by_unitid(HD_PATH)
    ic = load_csv_by_unitid(IC_PATH)

    excluded = []   # (unitid, name, reason)
    records  = []   # final master records

    seen_slugs = defaultdict(list)   # slug -> [unitid,...]

    for uid, h in hd.items():
        name = (h.get('INSTNM') or '').strip()
        cyactive = h.get('CYACTIVE', '')
        sector   = h.get('SECTOR', '')
        iclevel  = h.get('ICLEVEL', '')
        i = ic.get(uid, {})
        room    = i.get('ROOM', '')
        roomcap = i.get('ROOMCAP', '')

        # ── Exclusion rules ─────────────────────────────────────────────
        if cyactive != '1':
            excluded.append((uid, name, f'CYACTIVE={cyactive} (closed or out-of-scope)'))
            continue
        if sector == '0':
            excluded.append((uid, name, 'SECTOR=0 (administrative unit)'))
            continue
        if not i:
            excluded.append((uid, name, 'no IC record (housing data missing)'))
            continue
        if room in ('-1', '-2', ''):
            excluded.append((uid, name, f'ROOM={room} (unknown / not applicable)'))
            continue
        if room not in ('1', '2'):
            excluded.append((uid, name, f'ROOM={room} (unexpected value)'))
            continue

        # ── Build record ────────────────────────────────────────────────
        has_housing = (room == '1')
        try:
            capacity = int(roomcap) if roomcap not in ('', '.', None) else None
        except ValueError:
            capacity = None

        # Eligibility & note
        if has_housing and (capacity is not None) and capacity >= 50:
            housing_eligible = True
            housing_note = None
        elif has_housing and (capacity is None or capacity < 50):
            housing_eligible = False
            housing_note = NOTE_LOW_CAPACITY
        else:  # ROOM == 2
            housing_eligible = False
            housing_note = NOTE_NO_HOUSING

        zip5 = clean_zip(h.get('ZIP'))
        city = (h.get('CITY') or '').strip()
        state = (h.get('STABBR') or '').strip().upper()

        slug = slugify(name)
        seen_slugs[slug].append(uid)

        record = {
            'unitid': int(uid),
            'school_id': slug,  # may be revised after collision pass
            'name': name,
            'city': city,
            'state': state,
            'zip': zip5,
            'institution_type': ICLEVEL_LABEL.get(iclevel),
            'has_housing': has_housing,
            'housing_capacity': capacity,
            'housing_eligible': housing_eligible,
            'housing_note': housing_note,
            'aliases': [],
        }
        records.append(record)

    # Resolve slug collisions by appending state code (or a numeric suffix
    # if state-appended slugs still collide).
    by_slug = defaultdict(list)
    for r in records:
        by_slug[r['school_id']].append(r)
    for slug, group in by_slug.items():
        if len(group) > 1:
            # Try state suffix first
            new_assignments = {}
            for r in group:
                cand = f"{slug}-{r['state'].lower()}" if r['state'] else slug
                new_assignments.setdefault(cand, []).append(r)
            # If state-appended slugs still collide, fall back to UNITID
            for cand, sub in new_assignments.items():
                if len(sub) == 1:
                    sub[0]['school_id'] = cand
                else:
                    for r in sub:
                        r['school_id'] = f"{cand}-{r['unitid']}"

    # Sort alphabetically by name (case-insensitive)
    records.sort(key=lambda r: r['name'].lower())

    # Write outputs
    with open(OUT_MASTER, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    with open(OUT_EXCLUDED, 'w', encoding='utf-8') as f:
        f.write('# Records excluded from the picker entirely.\n')
        f.write('# Format: UNITID | reason | name\n\n')
        for uid, name, reason in sorted(excluded, key=lambda x: (x[2], x[1].lower())):
            f.write(f'{uid} | {reason} | {name}\n')

    return records, excluded

# ──────────────────────────────────────────────────────────────────────────────
# Task 5: Parse IALIAS, ingest DormShopper, run ambiguity check, merge
# ──────────────────────────────────────────────────────────────────────────────

def load_dormshopper(path):
    """Return list of {name, city, aliases:[...]} dicts.

    Per integration instructions, zip and state from this source are not
    trustworthy (zip is placeholder, state is in full-name form). school_id
    uses a different convention from IPEDS. City is reliable and is used
    only as a tiebreaker when normalized name matching produces multiple
    candidates. Skips the _meta wrapper present in the sample file.
    """
    with open(path, encoding='utf-8') as f:
        raw = json.load(f)
    out = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        if '_meta' in entry:
            continue
        if not entry.get('name'):
            continue
        out.append({
            'name': entry['name'],
            'city': entry.get('city', '') or '',
            'state': entry.get('state', '') or '',
            'aliases': entry.get('aliases', []) or [],
        })
    return out

def merge_aliases(records, dormshopper_path):
    """Populate records[i]['aliases'] from IALIAS and DormShopper, after
    running an ambiguity check that drops any normalized token mapping to
    two or more different UNITIDs.

    Returns (matched_dormshopper_count, unmatched_dormshopper_names,
             ambiguous_dropped, ipeds_alias_total_in, ds_alias_total_in).
    """
    # Re-load HD just to get raw IALIAS values (records already filtered)
    hd = load_csv_by_unitid(HD_PATH)

    # Per-record candidate aliases keyed by UNITID: {unitid: {source: [tokens]}}
    candidates = defaultdict(lambda: {'ipeds': [], 'dormshopper': []})

    # IPEDS aliases — only for institutions we kept in the master
    keep_uids = {r['unitid'] for r in records}
    ipeds_alias_total = 0
    for r in records:
        raw = hd.get(str(r['unitid']), {}).get('IALIAS', '')
        toks = parse_ialias(raw)
        candidates[r['unitid']]['ipeds'] = toks
        ipeds_alias_total += len(toks)

    # DormShopper records — match each to a master record by normalized name.
    # Match cascade (first hit wins):
    #   1. Rename crosswalk — explicit DormShopper-name → UNITID overrides
    #      for known renames and reorganizations IPEDS hasn't caught up to.
    #   2. Exact normalized-name match.
    #   3. Loose match — drop leading "the ", treat dashes/commas as spaces.
    #   4. City tiebreaker — if 2+ exact-name matches across different states,
    #      compare normalized DormShopper city to each IPEDS city. If exactly
    #      one IPEDS record matches, use it.
    #   5. Forward prefix — IPEDS name starts with DormShopper name + space.
    #      Handles "University of Pittsburgh" → "University of Pittsburgh-
    #      Pittsburgh Campus" and similar.
    #   6. Reverse prefix — DormShopper name starts with IPEDS name + space.
    #      Handles "Saint Joseph's University - Philadelphia" → "Saint
    #      Joseph's University".
    ds = load_dormshopper(dormshopper_path)

    def loose(name):
        """Aggressive normalization for fuzzy matching: drop leading 'the ',
        treat dashes/commas as spaces."""
        n = normalize(name.replace('-', ' ').replace(',', ' '))
        if n.startswith('the '):
            n = n[4:]
        return n

    # Build lookups
    name_to_uids = defaultdict(list)
    loose_to_uids = defaultdict(list)
    for r in records:
        name_to_uids[normalize(r['name'])].append(r['unitid'])
        loose_to_uids[loose(r['name'])].append(r['unitid'])

    uid_to_record = {r['unitid']: r for r in records}

    # Load rename crosswalk
    crosswalk = {}
    try:
        with open(RENAME_CROSSWALK, encoding='utf-8') as f:
            for entry in json.load(f):
                key = normalize(entry['dormshopper_name'])
                crosswalk[key] = entry['unitid']
    except FileNotFoundError:
        pass

    matched = 0
    unmatched = []
    ds_alias_total = 0
    match_sources = Counter()  # for the report

    def tiebreak(candidate_uids, ds_city_norm, ds_state_abbr):
        """Resolve a multi-candidate name match using city, then state.

        Returns (chosen_uids, source_label). chosen_uids is a single-element
        list on success, empty on failure to disambiguate.
        """
        # City first
        if ds_city_norm:
            city_hits = [u for u in candidate_uids
                         if normalize(uid_to_record[u]['city']) == ds_city_norm]
            if len(city_hits) == 1:
                return city_hits, 'city-tiebreaker'
            # If city ties (e.g., Anderson University in cities both named
            # "Anderson"), fall through to state.
            if len(city_hits) > 1 and ds_state_abbr:
                state_hits = [u for u in city_hits
                              if state_to_abbr(uid_to_record[u]['state']) == ds_state_abbr]
                if len(state_hits) == 1:
                    return state_hits, 'state-tiebreaker'
            # If city had zero hits, also try state directly across the
            # full candidate set as a fallback.
            if not city_hits and ds_state_abbr:
                state_hits = [u for u in candidate_uids
                              if state_to_abbr(uid_to_record[u]['state']) == ds_state_abbr]
                if len(state_hits) == 1:
                    return state_hits, 'state-tiebreaker'
        elif ds_state_abbr:
            state_hits = [u for u in candidate_uids
                          if state_to_abbr(uid_to_record[u]['state']) == ds_state_abbr]
            if len(state_hits) == 1:
                return state_hits, 'state-tiebreaker'
        return [], None

    for entry in ds:
        nname  = normalize(entry['name'])
        lname  = loose(entry['name'])
        ds_city_norm  = normalize(entry.get('city',''))
        ds_state_abbr = state_to_abbr(entry.get('state',''))

        uids = []
        source = None

        # Step 1: crosswalk
        if nname in crosswalk:
            target_uid = crosswalk[nname]
            if target_uid in uid_to_record:
                uids = [target_uid]
                source = 'crosswalk'

        # Step 2: exact
        if not uids:
            cand = name_to_uids.get(nname, [])
            if len(cand) == 1:
                uids = cand
                source = 'exact'
            elif len(cand) > 1:
                uids, source = tiebreak(cand, ds_city_norm, ds_state_abbr)

        # Step 3: loose match
        if not uids:
            cand = loose_to_uids.get(lname, [])
            if len(cand) == 1:
                uids = cand
                source = 'loose'
            elif len(cand) > 1:
                uids, source = tiebreak(cand, ds_city_norm, ds_state_abbr)

        # Step 5: forward prefix (IPEDS name starts with DormShopper name)
        if not uids:
            prefix_uids = []
            for ipeds_loose, uid_list in loose_to_uids.items():
                if ipeds_loose.startswith(lname + ' '):
                    prefix_uids.extend(uid_list)
            if len(prefix_uids) == 1:
                uids = prefix_uids
                source = 'forward-prefix'
            elif len(prefix_uids) > 1:
                # Pick largest by housing capacity — reliably the main campus
                def score(uid):
                    r = uid_to_record.get(uid, {})
                    cap = r.get('housing_capacity') or 0
                    return (cap, -uid)
                uids = [max(prefix_uids, key=score)]
                source = 'forward-prefix-capacity'

        # Step 6: reverse prefix (DormShopper name starts with IPEDS name)
        if not uids:
            rev_uids = []
            for ipeds_loose, uid_list in loose_to_uids.items():
                if lname.startswith(ipeds_loose + ' '):
                    rev_uids.extend(uid_list)
            if len(rev_uids) == 1:
                uids = rev_uids
                source = 'reverse-prefix'
            elif len(rev_uids) > 1:
                def score(uid):
                    r = uid_to_record.get(uid, {})
                    cap = r.get('housing_capacity') or 0
                    return (cap, -uid)
                uids = [max(rev_uids, key=score)]
                source = 'reverse-prefix-capacity'

        if len(uids) == 1:
            uid = uids[0]
            candidates[uid]['dormshopper'] = list(entry['aliases'])
            matched += 1
            ds_alias_total += len(entry['aliases'])
            match_sources[source] += 1
        else:
            unmatched.append(entry['name'])

    # ── Ambiguity check ──────────────────────────────────────────────────
    # Map each normalized token to the set of UNITIDs claiming it (any source).
    token_to_uids = defaultdict(set)
    token_examples = defaultdict(list)  # for logging — preserve a raw form
    for uid, sources in candidates.items():
        all_toks = sources['ipeds'] + sources['dormshopper']
        seen_local = set()
        for t in all_toks:
            n = normalize(t)
            if not n:
                continue
            if n in seen_local:
                continue
            seen_local.add(n)
            token_to_uids[n].add(uid)
            token_examples[n].append((uid, t))

    # Reason 1: alias-to-alias conflict — token claimed by 2+ schools' alias lists.
    alias_conflict = {n for n, uids in token_to_uids.items() if len(uids) >= 2}

    # Reason 2: exact-name collision — token exactly equals the normalized
    # official name of a different school. Belt-and-suspenders against the
    # case where an alias would shadow a real institution name.
    name_to_uid_single = {}
    for r in records:
        name_to_uid_single[normalize(r['name'])] = r['unitid']

    name_collision = {}  # normalized_token -> uid of the school whose name it equals
    for n, uids in token_to_uids.items():
        if n in name_to_uid_single:
            owner_uid = name_to_uid_single[n]
            # Only collision if the alias is on a DIFFERENT school's list
            other_uids = {u for u in uids if u != owner_uid}
            if other_uids:
                name_collision[n] = owner_uid

    ambiguous = alias_conflict | set(name_collision.keys())

    # ── Apply ambiguity filter and write merged file ──────────────────────
    for uid, sources in candidates.items():
        merged = []
        seen = set()
        # DormShopper wins on within-school dedupe (cleaner curation), so
        # walk DormShopper first, then IPEDS, skipping ambiguous tokens.
        for t in sources['dormshopper'] + sources['ipeds']:
            n = normalize(t)
            if not n or n in ambiguous or n in seen:
                continue
            seen.add(n)
            merged.append(t)
        if uid in uid_to_record:
            uid_to_record[uid]['aliases'] = merged

    with open(OUT_MERGED, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    # ── Ambiguity log ────────────────────────────────────────────────────
    with open(OUT_AMBIG, 'w', encoding='utf-8') as f:
        f.write('# Aliases dropped because they would match two or more institutions.\n')
        f.write('# Schools remain in the picker; only the conflicting alias is removed.\n')
        f.write('# Two reasons are tracked:\n')
        f.write('#   [alias-to-alias conflict]  token appears as an alias on 2+ schools\n')
        f.write('#   [exact-name collision]     token exactly equals the official name\n')
        f.write('#                              of a different school\n\n')

        f.write('## Alias-to-alias conflicts ({} tokens)\n\n'.format(len(alias_conflict)))
        for n in sorted(alias_conflict):
            examples = token_examples[n]
            uid_to_first = {}
            for uid, raw in examples:
                uid_to_first.setdefault(uid, raw)
            f.write(f'[alias-to-alias] {n}\n')
            for uid, raw in uid_to_first.items():
                rec = uid_to_record.get(uid)
                school_name = rec['name'] if rec else '?'
                f.write(f'    {uid}={raw!r} ({school_name})\n')
            f.write('\n')

        f.write('## Exact-name collisions ({} tokens)\n\n'.format(len(name_collision)))
        for n in sorted(name_collision):
            owner_uid = name_collision[n]
            owner_rec = uid_to_record.get(owner_uid)
            owner_name = owner_rec['name'] if owner_rec else '?'
            f.write(f'[exact-name collision] {n}\n')
            f.write(f'    is the official name of: {owner_uid} ({owner_name})\n')
            f.write('    claimed as an alias by:\n')
            other_uids = {u for u, _ in token_examples[n] if u != owner_uid}
            for uid in sorted(other_uids):
                rec = uid_to_record.get(uid)
                school_name = rec['name'] if rec else '?'
                # find a raw example
                raw = next((r for u, r in token_examples[n] if u == uid), n)
                f.write(f'        {uid}={raw!r} ({school_name})\n')
            f.write('\n')

    return (matched, unmatched, sorted(ambiguous), ipeds_alias_total,
            ds_alias_total, match_sources, len(alias_conflict),
            len(name_collision))

# ──────────────────────────────────────────────────────────────────────────────
# Task 6: Inspection report
# ──────────────────────────────────────────────────────────────────────────────

def inspection_report(records, excluded, matched_ds, unmatched_ds, ambiguous,
                      ipeds_alias_total_in, ds_alias_total_in,
                      match_sources, n_alias_conflict, n_name_collision):
    n = len(records)
    print('\n' + '=' * 70)
    print('TASK 6 — INSPECTION REPORT')
    print('=' * 70)

    # 1. Uniqueness
    slug_counts = Counter(r['school_id'] for r in records)
    uid_counts  = Counter(r['unitid']    for r in records)
    slug_dupes = [s for s,c in slug_counts.items() if c>1]
    uid_dupes  = [u for u,c in uid_counts.items()  if c>1]
    print(f'\n1. Uniqueness')
    print(f'   Total records:          {n}')
    print(f'   Duplicate school_id:    {len(slug_dupes)}  (should be 0)')
    print(f'   Duplicate unitid:       {len(uid_dupes)}   (should be 0)')
    if slug_dupes: print(f'   Examples: {slug_dupes[:5]}')

    # 2. ZIP completeness
    with_zip    = sum(1 for r in records if r['zip'])
    missing_zip = [r for r in records if not r['zip']]
    print(f'\n2. ZIP completeness')
    print(f'   Valid 5-digit ZIP:      {with_zip} ({100*with_zip/n:.1f}%)')
    print(f'   Missing or malformed:   {len(missing_zip)}')
    for r in missing_zip[:10]:
        print(f'     - {r["unitid"]} {r["name"]}')

    # 3. Housing distribution among housing_eligible=true
    elig = [r for r in records if r['housing_eligible']]
    print(f'\n3. Housing distribution among housing_eligible=true ({len(elig)} schools)')
    by_type = Counter(r['institution_type'] for r in elig)
    for k in sorted(by_type, key=lambda x: -by_type[x]):
        print(f'   {str(k):20s}: {by_type[k]}')

    # Also report counts at each gate for context
    n_in_picker     = len(records)
    n_eligible      = sum(1 for r in records if r['housing_eligible'])
    n_no_housing    = sum(1 for r in records if not r['has_housing'])
    n_low_capacity  = sum(1 for r in records if r['has_housing'] and not r['housing_eligible'])
    print(f'\n   Cross-check counts:')
    print(f'     Total in picker:                 {n_in_picker}')
    print(f'     Eligible (ROOM=1, cap>=50):      {n_eligible}')
    print(f'     Visible but no housing:          {n_no_housing}')
    print(f'     Visible but cap<50 or unknown:   {n_low_capacity}')
    print(f'     Excluded entirely:               {len(excluded)}')

    # 4. Alias coverage
    with_alias = sum(1 for r in records if r['aliases'])
    print(f'\n4. Alias coverage')
    print(f'   Records with >=1 alias: {with_alias} ({100*with_alias/n:.1f}%)')
    print(f'   IPEDS alias tokens (pre-ambiguity):       {ipeds_alias_total_in}')
    print(f'   DormShopper alias tokens (pre-ambiguity): {ds_alias_total_in}')
    print(f'   Tokens dropped — alias-to-alias conflict: {n_alias_conflict}')
    print(f'   Tokens dropped — exact-name collision:    {n_name_collision}')
    print(f'   Tokens dropped — total:                   {len(ambiguous)}')
    print(f'   DormShopper records matched to master:    {matched_ds}')
    print(f'   DormShopper records unmatched:            {len(unmatched_ds)}')
    if match_sources:
        print(f'   Match-source breakdown:')
        for src in sorted(match_sources, key=lambda s: -match_sources[s]):
            print(f'     {src:30s} {match_sources[src]}')
    if unmatched_ds:
        for u in unmatched_ds:
            print(f'     - {u}')

    # 5. Spot check — 10 records spanning types
    print(f'\n5. Spot check (10 records)')
    # Pick a mix: 3 large public 4-yr, 2 HBCU, 2 private 4-yr, 1 community college w/ housing,
    # 1 not-eligible (no housing), 1 low-capacity case if present.
    picks = []
    wanted = [
        ('UC Berkeley',                lambda r: r['name'] == 'University of California-Berkeley'),
        ('UT Austin',                  lambda r: r['name'] == 'The University of Texas at Austin'),
        ('Michigan-Ann Arbor',         lambda r: r['name'] == 'University of Michigan-Ann Arbor'),
        ('Howard',                     lambda r: r['name'] == 'Howard University'),
        ('Spelman',                    lambda r: r['name'] == 'Spelman College'),
        ('Reed (small LAC)',           lambda r: r['name'] == 'Reed College'),
        ('Penn State World Campus',    lambda r: r['name'] == 'Pennsylvania State University-World Campus'),
        ('SNHU (hybrid)',              lambda r: r['name'] == 'Southern New Hampshire University'),
        ('De Anza (no-housing CC)',    lambda r: r['name'] == 'De Anza College'),
        ('A low-capacity edge case',   lambda r: r['has_housing'] and not r['housing_eligible']),
    ]
    for label, pred in wanted:
        for r in records:
            if pred(r):
                picks.append((label, r)); break
    for label, r in picks:
        print(f'\n   --- {label} ---')
        for k in ['unitid','school_id','name','city','state','zip','institution_type',
                  'has_housing','housing_capacity','housing_eligible','housing_note','aliases']:
            v = r.get(k)
            if isinstance(v, str) and v and len(v) > 80:
                v = v[:77] + '...'
            print(f'     {k:20s} = {v!r}')

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--source', choices=['sample','prod'], default='prod',
                   help='DormShopper alias source: sample (20 records) or '
                        'prod (full export). Default: prod.')
    args = p.parse_args()
    ds_path = DORMSHOPPER_PROD if args.source == 'prod' else DORMSHOPPER_SAMPLE
    print(f'DormShopper source: {args.source} ({ds_path})')

    print('Building master from IPEDS...')
    records, excluded = build_master()
    print(f'  -> wrote {OUT_MASTER} ({len(records)} records)')
    print(f'  -> wrote {OUT_EXCLUDED} ({len(excluded)} records)')

    print('\nMerging aliases (IALIAS + DormShopper)...')
    (matched, unmatched, ambiguous, ipeds_in, ds_in,
     match_sources, n_alias_conflict, n_name_collision) = merge_aliases(records, ds_path)
    print(f'  -> wrote {OUT_MERGED}')
    print(f'  -> wrote {OUT_AMBIG} ({len(ambiguous)} ambiguous tokens dropped: '
          f'{n_alias_conflict} alias-to-alias, {n_name_collision} exact-name)')

    inspection_report(records, excluded, matched, unmatched, ambiguous, ipeds_in, ds_in,
                      match_sources, n_alias_conflict, n_name_collision)

if __name__ == '__main__':
    main()
