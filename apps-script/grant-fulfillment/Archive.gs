// ============================================
// ARCHIVE COHORT
// Moves current-year rows from active tabs to _Archive tabs
// and clears the active tabs.
// ============================================

function previewArchiveCohort() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const selectionsSheet = ss.getSheetByName('Student_Selections');
  if (!selectionsSheet || selectionsSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('No data found in Student Selections to archive.');
    return;
  }

  const selectionsData     = selectionsSheet.getDataRange().getValues();
  const selectionsMap      = getHeaderMap(selectionsSheet);
  const cohortYearIndex    = selectionsMap['cohort_year'];
  const validYears         = selectionsData.slice(1).map(row => parseInt(row[cohortYearIndex])).filter(y => !isNaN(y));
  const currentYear        = Math.max(...validYears);

  if (currentYear === 0) {
    SpreadsheetApp.getUi().alert('Error: Could not determine current cohort year. Archive cancelled.');
    return;
  }

  let selectionsCount = 0;
  let resolverCount   = 0;
  let shoppingCount   = 0;

  selectionsData.slice(1).forEach(row => {
    if (parseInt(row[cohortYearIndex]) === currentYear) selectionsCount++;
  });

  const resolverSheet = ss.getSheetByName('Resolver');
  if (resolverSheet && resolverSheet.getLastRow() > 1) {
    const resolverData  = resolverSheet.getDataRange().getValues();
    const resolverMap   = getHeaderMap(resolverSheet);
    const resolverYearIndex = resolverMap['cohort_year'];
    resolverData.slice(1).forEach(row => {
      if (parseInt(row[resolverYearIndex]) === currentYear) resolverCount++;
    });
  }

  const shoppingSheet = ss.getSheetByName('Shopping_List');
  if (shoppingSheet && shoppingSheet.getLastRow() > 1) {
    const shoppingData  = shoppingSheet.getDataRange().getValues();
    const shoppingMap   = getHeaderMap(shoppingSheet);
    const shoppingYearIndex = shoppingMap['cohort_year'];
    shoppingData.slice(1).forEach(row => {
      if (parseInt(row[shoppingYearIndex]) === currentYear) shoppingCount++;
    });
  }

  SpreadsheetApp.getUi().alert(
    'Archive Preview',
    `The following rows from cohort ${currentYear} would be archived:\n\n` +
    `• Student Selections: ${selectionsCount} rows\n` +
    `• Resolver: ${resolverCount} rows\n` +
    `• Shopping_List: ${shoppingCount} rows\n\n` +
    `Total: ${selectionsCount + resolverCount + shoppingCount} rows\n\n` +
    `These would be moved to the respective Archive tabs and the active tabs would be cleared.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function archiveCohort() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const selectionsSheet = ss.getSheetByName('Student_Selections');
  if (!selectionsSheet || selectionsSheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('No data found in Student Selections to archive.');
    return;
  }

  const selectionsData   = selectionsSheet.getDataRange().getValues();
  const selectionsMap    = getHeaderMap(selectionsSheet);
  const cohortYearIndex  = selectionsMap['cohort_year'];
  const currentYear      = Math.max(...selectionsData.slice(1).map(row => parseInt(row[cohortYearIndex])));
  const studentsToArchive = selectionsData.slice(1).filter(row => parseInt(row[cohortYearIndex]) === currentYear).length;

  const ui       = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Archive Confirmation',
    `You are about to archive ${studentsToArchive} students from cohort ${currentYear}.\n\n` +
    `This will move all matching rows from Student_Selections, Resolver, and Shopping_List to their respective archive tabs.\n\nProceed?`,
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) { ui.alert('Archive cancelled.'); return; }

  let selectionsArchivedCount = 0;
  let resolverArchivedCount   = 0;
  let shoppingArchivedCount   = 0;

  // 1. Student Selections
  const selectionsArchiveSheet = ss.getSheetByName('Student_Selections_Archive') || ss.insertSheet('Student_Selections_Archive');
  if (selectionsArchiveSheet.getLastRow() === 0) {
    const headers = selectionsSheet.getRange(1, 1, 1, selectionsSheet.getLastColumn()).getValues()[0];
    selectionsArchiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  const selectionsRowsToArchive = [];
  selectionsData.slice(1).forEach(row => {
    if (parseInt(row[cohortYearIndex]) === currentYear) {
      selectionsRowsToArchive.push(row);
      selectionsArchivedCount++;
    }
  });
  if (selectionsRowsToArchive.length > 0) {
    const startRow = selectionsArchiveSheet.getLastRow() + 1;
    selectionsArchiveSheet.getRange(startRow, 1, selectionsRowsToArchive.length, selectionsRowsToArchive[0].length).setValues(selectionsRowsToArchive);
  }

  // 2. Resolver
  const resolverSheet = ss.getSheetByName('Resolver');
  if (resolverSheet && resolverSheet.getLastRow() > 1) {
    const resolverArchiveSheet = ss.getSheetByName('Resolver_Archive') || ss.insertSheet('Resolver_Archive');
    if (resolverArchiveSheet.getLastRow() === 0) {
      const headers = resolverSheet.getRange(1, 1, 1, resolverSheet.getLastColumn()).getValues()[0];
      resolverArchiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    const resolverData    = resolverSheet.getDataRange().getValues();
    const resolverMap     = getHeaderMap(resolverSheet);
    const resolverYearIdx = resolverMap['cohort_year'];
    const resolverRowsToArchive = [];
    resolverData.slice(1).forEach(row => {
      if (parseInt(row[resolverYearIdx]) === currentYear) { resolverRowsToArchive.push(row); resolverArchivedCount++; }
    });
    if (resolverRowsToArchive.length > 0) {
      const startRow = resolverArchiveSheet.getLastRow() + 1;
      resolverArchiveSheet.getRange(startRow, 1, resolverRowsToArchive.length, resolverRowsToArchive[0].length).setValues(resolverRowsToArchive);
    }
  }

  // 3. Shopping List
  const shoppingSheet = ss.getSheetByName('Shopping_List');
  if (shoppingSheet && shoppingSheet.getLastRow() > 1) {
    const shoppingArchiveSheet = ss.getSheetByName('Shopping_List_Archive') || ss.insertSheet('Shopping_List_Archive');
    if (shoppingArchiveSheet.getLastRow() === 0) {
      const headers = shoppingSheet.getRange(1, 1, 1, shoppingSheet.getLastColumn()).getValues()[0];
      shoppingArchiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    const shoppingData    = shoppingSheet.getDataRange().getValues();
    const shoppingMap     = getHeaderMap(shoppingSheet);
    const shoppingYearIdx = shoppingMap['cohort_year'];
    const shoppingRowsToArchive = [];
    shoppingData.slice(1).forEach(row => {
      if (parseInt(row[shoppingYearIdx]) === currentYear) { shoppingRowsToArchive.push(row); shoppingArchivedCount++; }
    });
    if (shoppingRowsToArchive.length > 0) {
      const startRow = shoppingArchiveSheet.getLastRow() + 1;
      shoppingArchiveSheet.getRange(startRow, 1, shoppingRowsToArchive.length, shoppingRowsToArchive[0].length).setValues(shoppingRowsToArchive);
    }
  }

  // 4. Clear active tabs
  if (selectionsSheet.getLastRow() > 1)  selectionsSheet.deleteRows(2, selectionsSheet.getLastRow() - 1);
  if (resolverSheet && resolverSheet.getLastRow() > 1) resolverSheet.deleteRows(2, resolverSheet.getLastRow() - 1);
  if (shoppingSheet && shoppingSheet.getLastRow() > 1) shoppingSheet.deleteRows(2, shoppingSheet.getLastRow() - 1);

  ui.alert(
    'Archive Complete',
    `Successfully archived cohort ${currentYear}.\n\n` +
    `• Student Selections: ${selectionsArchivedCount} rows\n` +
    `• Resolver: ${resolverArchivedCount} rows\n` +
    `• Shopping_List: ${shoppingArchivedCount} rows\n\n` +
    `Active tabs have been cleared and are ready for the next cohort.`,
    ui.ButtonSet.OK
  );
}
