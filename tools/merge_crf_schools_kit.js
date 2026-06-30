/**
 * merge_crf_schools_kit.js
 *
 * Joins crf_schools_kit.json (from school_brands export) with crf_schools_merged.json
 * (IPEDS data) on the school slug to attach numeric unitid to each record.
 *
 * Run from the tools directory:
 *   node merge_crf_schools_kit.js
 *
 * Output: crf_schools_kit.json (overwritten in place, now keyed on numeric unitid)
 */

const fs = require('fs');
const path = require('path');

const kitPath = path.join(__dirname, 'crf_schools_kit.json');
const mergedPath = path.join(__dirname, 'build_schools', 'crf_schools_merged.json');

const kitSchools = JSON.parse(fs.readFileSync(kitPath, 'utf8'));
const mergedSchools = JSON.parse(fs.readFileSync(mergedPath, 'utf8'));

// Manual overrides for schools that were renamed or use a completely different slug
// in crf_schools_merged vs. school_brands. Keyed by the normalized school_brands slug.
const MANUAL_OVERRIDES = {
  'manhattan-university':                          192703,  // was manhattan-college
  'manhattanville-university':                     192749,  // was manhattanville-college
  'marist-university':                             192819,  // was marist-college
  'indiana-universitypurdue-universityindianapolis': 151111, // renamed to indiana-university-indianapolis
  'bloomfield-college-of-montclair-state-university': 183822, // merged into Montclair State, still has own UNITID
  'state-university-of-new-york-at-plattsburgh':   196246,  // merged file uses suny-college-at-plattsburgh
  'university-of-colorado-denveranschutz-medical-cam': 126562, // slug truncated + slash dropped
  'university-of-north-carolina-at-asheville':        199111,  // merged slug omits "at"
  'saint-josephs-university-philadelphia':            215770,  // merged slug is saint-joseph-s-university
  'urshan-university':                                494685,  // renamed from urshan-college
  'emmaus-university':                                153302,  // renamed from emmaus-bible-college
  'east-texas-am-university':                        224554,  // renamed from texas-am-university-commerce
  'fort-hays-state-universitynorthwest-kansas-technic': 155061, // consortium under Fort Hays State UNITID
};

// Build two lookups:
// 1. exact: normalized slug (underscores → hyphens) → numeric unitid
// 2. stripped: slug with ALL hyphens removed → array of {school_id, unitid}
//    Used as fallback when school_brands doc IDs drop hyphens from the original name
const slugToUnitid = {};
const strippedToMatches = {};

mergedSchools.forEach(s => {
  if (s.school_id && s.unitid) {
    const normalized = s.school_id.replace(/_/g, '-');
    slugToUnitid[normalized] = s.unitid;

    const stripped = normalized.replace(/-/g, '');
    if (!strippedToMatches[stripped]) strippedToMatches[stripped] = [];
    strippedToMatches[stripped].push({ school_id: s.school_id, unitid: s.unitid });
  }
});

let matched = 0;
let unmatched = 0;
const unmatchedNames = [];

const output = [];

kitSchools.forEach(school => {
  const normalizedSlug = (school.unitid || '').replace(/_/g, '-');
  let numericUnitid = MANUAL_OVERRIDES[normalizedSlug] || slugToUnitid[normalizedSlug];

  // Fallback 1: compare with all hyphens stripped (catches doc IDs that dropped
  // hyphens from the original school name, e.g. "university-beebe" → "universitybeebe")
  if (!numericUnitid) {
    const stripped = normalizedSlug.replace(/-/g, '');
    const candidates = strippedToMatches[stripped] || [];
    if (candidates.length === 1) {
      numericUnitid = candidates[0].unitid;
    }
  }

  // Fallback 2: prefix match for truncated slugs (Firestore doc IDs can be cut short).
  // Accept only if exactly one merged school's stripped slug starts with this slug's stripped version.
  if (!numericUnitid && normalizedSlug.length >= 40) {
    const strippedPrefix = normalizedSlug.replace(/-/g, '');
    const candidates = mergedSchools.filter(s =>
      s.school_id && s.school_id.replace(/-/g, '').startsWith(strippedPrefix)
    );
    if (candidates.length === 1) {
      numericUnitid = candidates[0].unitid;
    }
  }

  if (!numericUnitid) {
    unmatched++;
    unmatchedNames.push(school.name || school.unitid);
    return; // drop schools that can't be matched unambiguously
  }

  matched++;
  const record = { unitid: numericUnitid };
  if (school.name)               record.name = school.name;
  if (school.primary_color_hex)  record.primary_color_hex = school.primary_color_hex;
  if (school.secondary_color_hex) record.secondary_color_hex = school.secondary_color_hex;
  if (school.text_color_override) record.text_color_override = school.text_color_override;
  if (school.slogan)             record.slogan = school.slogan;
  if (school.secondary_phrase)   record.secondary_phrase = school.secondary_phrase;
  if (school.mascot)             record.mascot = school.mascot;
  if (school.checklist_url)      record.checklist_url = school.checklist_url;

  output.push(record);
});

output.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

fs.writeFileSync(kitPath, JSON.stringify(output, null, 2));

console.log(`Matched:   ${matched}`);
console.log(`Unmatched: ${unmatched}`);
if (unmatchedNames.length) {
  console.log('Unmatched schools (dropped):');
  unmatchedNames.forEach(n => console.log('  -', n));
}
console.log(`\nWrote ${output.length} records to ${kitPath}`);
