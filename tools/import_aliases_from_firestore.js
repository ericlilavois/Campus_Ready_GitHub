/**
 * Pulls aliases from Firestore `schools` collection and merges them
 * into crf_schools_kit.json as a `nickname` field (first alias) and
 * an `aliases` array (all aliases).
 *
 * Usage:
 *   node import_aliases_from_firestore.js /path/to/serviceAccountKey.json
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error('Usage: node import_aliases_from_firestore.js /path/to/serviceAccountKey.json');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(serviceAccountPath))),
  projectId:  'campus-ready-checklist'
});

const db = admin.firestore();

const KIT_JSON = path.join(__dirname, 'crf_schools_kit.json');

(async () => {
  console.log('Fetching schools from Firestore...');
  const snapshot = await db.collection('schools').get();
  console.log(`  ${snapshot.size} school documents found`);

  // Build a lookup: normalised name → aliases array
  // Firestore doc ID is a slug like "brown_university" — we'll also index by
  // reconstructed name for matching against the kit JSON's `name` field.
  const aliasMap = {}; // normalisedName → string[]
  let withAliases = 0;

  snapshot.forEach(doc => {
    const data    = doc.data();
    const aliases = Array.isArray(data.aliases) ? data.aliases.filter(a => a && a.trim()) : [];
    if (aliases.length === 0) return;

    // Index by the school name in Firestore (if present) and by slug-derived name
    const fsName = data.name || data.institution_name || '';
    const slugName = doc.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    [fsName, slugName].forEach(n => {
      if (n) aliasMap[n.toLowerCase().trim()] = aliases;
    });
    withAliases++;
  });

  console.log(`  ${withAliases} schools have at least one alias`);

  // Load kit JSON
  const kit = JSON.parse(fs.readFileSync(KIT_JSON, 'utf8'));
  let updated = 0;
  let unmatched = 0;

  kit.forEach(school => {
    const key = (school.name || '').toLowerCase().trim();
    const aliases = aliasMap[key];
    if (aliases && aliases.length > 0) {
      school.nickname = aliases[0];   // first alias = primary nickname
      school.aliases  = aliases;      // full list for future use
      updated++;
    } else {
      unmatched++;
    }
  });

  fs.writeFileSync(KIT_JSON, JSON.stringify(kit, null, 2));
  console.log(`\nDone.`);
  console.log(`  ${updated} schools updated with aliases`);
  console.log(`  ${unmatched} schools had no Firestore alias match`);
  console.log(`  Written to: ${KIT_JSON}`);

  process.exit(0);
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
