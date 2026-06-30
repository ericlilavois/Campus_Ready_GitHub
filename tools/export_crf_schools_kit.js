/**
 * export_crf_schools_kit.js
 *
 * Exports school_brands from DormShopper Firestore into crf_schools_kit.json
 * for the Campus Ready Kit form. Run with Eric's LilaVine credentials:
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/lilavine-service-account.json \
 *   node tools/export_crf_schools_kit.js
 *
 * Output: tools/crf_schools_kit.json  (commit this file to the repo root after review)
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'campus-ready-checklist';

initializeApp({
  credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? require(path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS))
    : (() => { throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to service account JSON path'); })()
  ),
  projectId: PROJECT_ID
});

const db = getFirestore();

async function run() {
  console.log('Fetching school_brands...');
  const brandsSnap = await db.collection('school_brands').get();

  console.log('Fetching schools (for checklist_url)...');
  const schoolsSnap = await db.collection('schools').get();

  // Build checklist lookup keyed by slug
  const checklistBySlug = {};
  schoolsSnap.forEach(doc => {
    const d = doc.data();
    if (d.checklist_url) checklistBySlug[doc.id] = d.checklist_url;
  });
  console.log(`Found checklist URLs for ${Object.keys(checklistBySlug).length} schools`);

  const schools = [];

  brandsSnap.forEach(doc => {
    const d = doc.data();

    const record = {
      unitid: doc.id
    };

    if (d.name)                  record.name = d.name;
    if (d.primary_color_hex)     record.primary_color_hex = d.primary_color_hex;
    if (d.secondary_color_hex)   record.secondary_color_hex = d.secondary_color_hex;
    if (d.text_color_override)   record.text_color_override = d.text_color_override;
    if (d.primary_slogan)        record.slogan = d.primary_slogan;
    if (d.secondary_phrases)     record.secondary_phrase = d.secondary_phrases;
    if (d.team_nickname)         record.mascot = d.team_nickname;
    if (d.unitid)                record.unitid = d.unitid.toString();

    // Pull checklist_url from schools collection (same slug as doc ID)
    const checklist = checklistBySlug[doc.id];
    if (checklist)               record.checklist_url = checklist;

    schools.push(record);
  });

  schools.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const withChecklist = schools.filter(s => s.checklist_url).length;
  const outPath = path.join(__dirname, 'crf_schools_kit.json');
  fs.writeFileSync(outPath, JSON.stringify(schools, null, 2));
  console.log(`Wrote ${schools.length} schools to ${outPath} (${withChecklist} with checklist URLs)`);
  console.log('Next: run merge_crf_schools_kit.js, then copy to Campus_Ready_Grant_Fulfillment and commit.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
