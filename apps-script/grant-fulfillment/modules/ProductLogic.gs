// ============================================
// REBUILD PRODUCT LOGIC
// Reads each PL_* source tab by header name and writes to Product_Logic.
// Run from: Fulfillment Tools → Rebuild Product Logic
// ============================================

function rebuildProductLogic() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const ui  = SpreadsheetApp.getUi();

  const SOURCE_TABS = [
    'Bedding', 'Pillows', 'Towels', 'Accessories', 'Universal Products', 'Personal_Care'
  ];

  const plSheet = ss.getSheetByName('Product_Logic');
  if (!plSheet) {
    ui.alert('Error', 'Product_Logic tab not found.', ui.ButtonSet.OK);
    return;
  }

  const plLastCol = plSheet.getLastColumn();
  const plHeaders = plSheet.getRange(1, 1, 1, plLastCol).getValues()[0].map(h => h.toString().trim());
  const numPlCols = plHeaders.length;

  const allRows = [];
  const skipped = [];
  let productIdCounter = 1;

  for (const tabName of SOURCE_TABS) {
    const src = ss.getSheetByName(tabName);
    if (!src) { skipped.push(tabName); continue; }

    let dataRange;
    try {
      dataRange = src.getDataRange();
    } catch (e) {
      Logger.log(`Could not read ${tabName}: ${e.message}`);
      skipped.push(tabName + ' (read error)');
      continue;
    }

    if (dataRange.getNumRows() < 2 || dataRange.getNumColumns() < 1) continue;

    const data       = dataRange.getValues();
    const srcHeaders = data[0].map(h => h.toString().trim());
    const srcIdx     = {};
    srcHeaders.forEach((h, i) => { if (h) srcIdx[h] = i; });

    for (let r = 1; r < data.length; r++) {
      const row         = data[r];
      const productType = (srcIdx['PRODUCT TYPE'] !== undefined) ? row[srcIdx['PRODUCT TYPE']] : '';
      if (!productType || productType.toString().trim() === '') continue;

      const ulkIdx   = srcIdx['Unique Lookup Key'];
      const ulkValue = (ulkIdx !== undefined && row[ulkIdx] !== undefined)
        ? row[ulkIdx].toString().trim().replace(/\|+$/, '') : '';
      const productNameVal = (srcIdx['PRODUCT'] !== undefined && row[srcIdx['PRODUCT']] !== undefined)
        ? row[srcIdx['PRODUCT']].toString().trim() : '';
      const derivedId = ulkValue || (productType && productNameVal
        ? productType.toString().trim() + '|' + productNameVal
        : String(productIdCounter));

      const newRow = plHeaders.map(header => {
        if (!header) return '';
        if (header === 'Product ID') return derivedId;
        const i = srcIdx[header];
        return (i !== undefined && row[i] !== undefined) ? row[i] : '';
      });

      allRows.push(newRow);
      productIdCounter++;
    }
  }

  if (allRows.length === 0) {
    ui.alert('Nothing to write', 'No valid product rows found. Product_Logic was not changed.', ui.ButtonSet.OK);
    return;
  }

  const sortCol = plHeaders.indexOf('PRODUCT TYPE');
  allRows.sort((a, b) => (a[sortCol] || '').toString().toLowerCase().localeCompare((b[sortCol] || '').toString().toLowerCase()));

  const existingRows = plSheet.getLastRow();
  if (existingRows > 1) plSheet.getRange(2, 1, existingRows - 1, numPlCols).clearContent();

  plSheet.getRange(2, 1, allRows.length, numPlCols).setValues(allRows);

  let msg = `Product_Logic rebuilt with ${allRows.length} product rows from ${SOURCE_TABS.length - skipped.length} tab(s).`;
  if (skipped.length > 0) msg += `\n\nTab(s) not found and skipped:\n• ${skipped.join('\n• ')}`;
  ui.alert('Done', msg, ui.ButtonSet.OK);
  Logger.log(msg);
}
