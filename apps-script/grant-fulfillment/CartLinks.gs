// ============================================
// GENERATE CART LINKS
// ============================================
//
// Reads per-student choice-item rows from Shopping_List, checks Grant_Recipients
// for Ship Hold, and writes one Amazon bulk add-to-cart URL per student to
// the Cart_Links tab.
//
// Choice items only — Shopping_List also contains universal items, which go
// through the separate Amazon Business multi-address process. Only the types
// below produce cart links.

const CHOICE_PRODUCT_TYPES = new Set([
  'Sheet Set', 'Comforter', 'Duvet Cover',
  'Pillow',
  'Towel Set',
  'Shaving Cream', 'Razor Handle', 'Razor Refills', 'Body Wash',
  'Shampoo', 'Conditioner', 'Shampoo & Conditioner Set', 'Deodorant', 'Antiperspirant',
  'Toiletry Bag', 'Slides'
]);

function generateCartLinks() {
  Logger.log('=== STARTING CART LINK GENERATION ===');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // ── Shopping_List ─────────────────────────────────────────────────────────
  const slSheet = ss.getSheetByName('Shopping_List');
  if (!slSheet || slSheet.getLastRow() < 2) {
    ui.alert('Shopping_List is empty or missing. Run Generate Shopping List first.');
    return;
  }
  const slHeaderMap = getHeaderMap(slSheet);
  const slData      = slSheet.getRange(2, 1, slSheet.getLastRow() - 1, slSheet.getLastColumn()).getValues();

  // ── Grant_Recipients — header-name addressing ─────────────────────────────
  const grSheet = ss.getSheetByName('Grant_Recipients');
  if (!grSheet || grSheet.getLastRow() < 2) {
    ui.alert('Error: Grant_Recipients sheet not found or empty.');
    return;
  }
  const grHeaderMap = getHeaderMap(grSheet);
  const grData      = grSheet.getRange(2, 1, grSheet.getLastRow() - 1, grSheet.getLastColumn()).getValues();

  const shipHoldCol = grHeaderMap['Ship Hold'];
  const grEmailCol  = grHeaderMap['Email Address'];

  if (grEmailCol === undefined) {
    ui.alert('Error: "Email Address" column not found in Grant_Recipients. Check the header row.');
    return;
  }

  const shipHoldEmails = new Set();
  if (shipHoldCol !== undefined) {
    for (const row of grData) {
      const email = row[grEmailCol];
      if (email && String(row[shipHoldCol]).trim().toLowerCase() === 'yes') {
        shipHoldEmails.add(email.toString().toLowerCase().trim());
      }
    }
    Logger.log(`Ship Hold students: ${shipHoldEmails.size}`);
  } else {
    Logger.log('Note: "Ship Hold" column not found in Grant_Recipients — no students excluded on hold.');
  }

  // ── Group choice rows by student email ────────────────────────────────────
  const emailCol       = slHeaderMap['Student Email'];
  const nameCol        = slHeaderMap['Student Name'];
  const skuCol         = slHeaderMap['SKU'];
  const qtyCol         = slHeaderMap['Quantity'];
  const totalCostCol   = slHeaderMap['Total Cost'];
  const productTypeCol = slHeaderMap['Product Type'];

  if ([emailCol, nameCol, skuCol, qtyCol, totalCostCol, productTypeCol].some(c => c === undefined)) {
    ui.alert('Error: Expected Shopping_List column not found. Check the header row.');
    return;
  }

  const studentMap = {};

  for (const row of slData) {
    const email       = row[emailCol];
    const productType = String(row[productTypeCol]).trim();
    if (!email || !CHOICE_PRODUCT_TYPES.has(productType)) continue;

    const emailKey = email.toString().toLowerCase().trim();
    if (shipHoldEmails.has(emailKey)) continue;

    const sku      = String(row[skuCol]).trim();
    const qty      = parseInt(row[qtyCol]) || 1;
    const rowCost = parseFloat(String(row[totalCostCol]).replace(/[$,]/g, '')) || 0;

    if (!sku) continue;

    if (!studentMap[emailKey]) {
      studentMap[emailKey] = { name: String(row[nameCol]).trim(), email: String(email).trim(), items: [] };
    }
    studentMap[emailKey].items.push({ sku, qty, rowCost });
  }

  const emailKeys = Object.keys(studentMap);
  if (emailKeys.length === 0) {
    ui.alert(
      'No students found',
      'Shopping_List has no choice-item rows, or all students are on Ship Hold.',
      ui.ButtonSet.OK
    );
    return;
  }

  // ── Build URLs and collect warnings ───────────────────────────────────────
  const warnings   = [];
  const outputRows = [];

  for (const emailKey of emailKeys) {
    const { name, email, items } = studentMap[emailKey];

    if (items.length >= 45) {
      warnings.push(`${name}: ${items.length} choice items (cap is 50)`);
      Logger.log(`WARNING: ${name} (${email}) has ${items.length} choice items — approaching 50-item limit`);
    }

    const cartUrl  = buildAmazonCartUrl_(items);
    const total    = items.reduce((sum, item) => sum + item.rowCost, 0);

    outputRows.push([name, email, items.length, total, cartUrl]);
    Logger.log(`Built cart for ${name}: ${items.length} items, $${total.toFixed(2)}`);
  }

  // ── Gateway confirm ───────────────────────────────────────────────────────
  let gatewayMessage = `Ready to write cart links:\n\n✓  ${outputRows.length} student(s)`;
  if (shipHoldEmails.size > 0) {
    gatewayMessage += `\n⚠️  ${shipHoldEmails.size} student(s) excluded — Ship Hold`;
  }
  if (warnings.length > 0) {
    gatewayMessage += '\n\n⚠️  Item count warnings:\n' + warnings.map(w => `   • ${w}`).join('\n');
  }
  gatewayMessage += '\n\nCart_Links tab will be cleared and rewritten.\nClick OK to proceed, or Cancel to stop.';

  const confirm = ui.alert('Generate Cart Links', gatewayMessage, ui.ButtonSet.OK_CANCEL);
  if (confirm !== ui.Button.OK) {
    ui.alert('Cancelled', 'No changes made.', ui.ButtonSet.OK);
    return;
  }

  // ── Write Cart_Links tab ──────────────────────────────────────────────────
  const cartSheet = ss.getSheetByName('Cart_Links') || ss.insertSheet('Cart_Links');
  cartSheet.clearContents();

  const headers = ['Student Name', 'Student Email', 'Item Count', 'Total Cost', 'Cart URL'];
  cartSheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');

  if (outputRows.length > 0) {
    cartSheet.getRange(2, 1, outputRows.length, outputRows[0].length).setValues(outputRows);
  }

  Logger.log(`=== CART LINKS WRITTEN: ${outputRows.length} students ===`);
  ui.alert('Done', `Cart links written for ${outputRows.length} student(s).`, ui.ButtonSet.OK);
}

// ── URL builder ───────────────────────────────────────────────────────────────

function buildAmazonCartUrl_(items) {
  const params = items.map((item, i) =>
    `ASIN.${i + 1}=${encodeURIComponent(item.sku)}&Quantity.${i + 1}=${item.qty}`
  ).join('&');
  return `https://www.amazon.com/gp/aws/cart/add.html?${params}`;
}

// ── Test function ─────────────────────────────────────────────────────────────
// Run from the Script Editor against a single student before the full-cohort run.
// Results appear in View → Logs.

function testCartLinkGeneration() {
  const TEST_EMAIL = 'gabriellemonteiro938@gmail.com';

  Logger.log('=== CART LINK TEST ===');
  Logger.log(`Testing against: ${TEST_EMAIL}`);

  const ss             = SpreadsheetApp.getActiveSpreadsheet();
  const slSheet        = ss.getSheetByName('Shopping_List');
  if (!slSheet || slSheet.getLastRow() < 2) {
    Logger.log('ERROR: Shopping_List is empty or missing.');
    return;
  }

  const slHeaderMap    = getHeaderMap(slSheet);
  const slData         = slSheet.getRange(2, 1, slSheet.getLastRow() - 1, slSheet.getLastColumn()).getValues();

  const emailCol       = slHeaderMap['Student Email'];
  const nameCol        = slHeaderMap['Student Name'];
  const skuCol         = slHeaderMap['SKU'];
  const qtyCol         = slHeaderMap['Quantity'];
  const totalCostCol   = slHeaderMap['Total Cost'];
  const productTypeCol = slHeaderMap['Product Type'];

  const items = [];
  let studentName = '';
  let totalCost   = 0;

  for (const row of slData) {
    const email       = String(row[emailCol]).toLowerCase().trim();
    const productType = String(row[productTypeCol]).trim();
    if (email !== TEST_EMAIL.toLowerCase().trim()) continue;
    if (!CHOICE_PRODUCT_TYPES.has(productType)) {
      Logger.log(`  SKIP (universal): ${productType}`);
      continue;
    }
    if (!studentName) studentName = String(row[nameCol]).trim();
    const sku  = String(row[skuCol]).trim();
    const qty  = parseInt(row[qtyCol]) || 1;
    const cost = parseFloat(String(row[totalCostCol]).replace(/[$,]/g, '')) || 0;
    items.push({ sku, qty, rowCost: cost });
    totalCost += cost;
    Logger.log(`  ${productType}: ${sku} × ${qty} = $${cost.toFixed(2)}`);
  }

  Logger.log(`\nStudent: ${studentName}`);
  Logger.log(`Choice items: ${items.length}`);
  Logger.log(`Total cost: $${totalCost.toFixed(2)}`);

  if (items.length === 0) {
    Logger.log('No choice items found — check that Shopping_List has been generated for this student.');
    return;
  }

  const url = buildAmazonCartUrl_(items);
  Logger.log(`\nCart URL (${url.length} chars):`);
  Logger.log(url);
  Logger.log('=== TEST COMPLETE ===');
}
