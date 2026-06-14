// ============================================
// SHARED HELPER FUNCTIONS
// Used by multiple modules — must be loaded in every project.
// ============================================

function loadSheetData(ss, tabName) {
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) throw new Error(`Sheet '${tabName}' not found`);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log(`Warning: Sheet '${tabName}' has no data rows`);
    return [];
  }
  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
}

function getHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map     = {};
  headers.forEach((header, index) => { map[header.trim()] = index; });
  return map;
}

function deleteStudentFromResolver(ss, email) {
  const resolverSheet = ss.getSheetByName('Resolver');
  if (!resolverSheet || resolverSheet.getLastRow() < 2) return;

  const data         = resolverSheet.getDataRange().getValues();
  const rowsToDelete = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().toLowerCase() === email.toLowerCase()) {
      rowsToDelete.push(i + 1);
    }
  }
  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    resolverSheet.deleteRow(rowsToDelete[i]);
  }
  Logger.log(`Cleared ${rowsToDelete.length} Resolver rows for ${email}`);
}
