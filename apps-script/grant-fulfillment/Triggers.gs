// ============================================
// TRIGGERS
// Run installTriggers() once after pasting into a new project.
// ============================================

function installTriggers() {
  const managed = ['onGrantRecipientsEdit', 'sendKitFormDailyDigest'];
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (managed.indexOf(trigger.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('onGrantRecipientsEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  ScriptApp.newTrigger('sendKitFormDailyDigest')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .inTimezone('America/Los_Angeles')
    .create();
}

function onGrantRecipientsEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    if (sheet.getName() !== 'Grant_Recipients') return;

    const range = e.range;
    const row   = range.getRow();
    const col   = range.getColumn();
    if (col !== 6 && col !== 8) return;

    const newValue         = range.getValue();
    const housingStatus    = sheet.getRange(row, 6).getValue();
    const acceptanceStatus = sheet.getRange(row, 8).getValue();

    if (newValue === 'Approved' && housingStatus === 'Approved' && acceptanceStatus === 'Approved') {
      sheet.getRange(row, 12).setValue('');
      Logger.log(`Cleared rejection email timestamp for row ${row} — both documents approved`);
    }
  } catch (error) {
    Logger.log('Error in onGrantRecipientsEdit: ' + error);
  }
}
