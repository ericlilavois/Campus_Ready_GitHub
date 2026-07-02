// ============================================
// DOCUMENT UPLOAD & STUDENT STATUS LOOKUP
// Called via doPost() from the kit form.
// ============================================

function checkStudentStatusById(applicationId) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Grant_Recipients');
  if (!sheet) return { status: 'error', message: 'Grant_Recipients sheet not found' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString().trim() === applicationId.toString().trim()) {
      return {
        status:           'found',
        applicationId:    data[i][0],
        studentName:      data[i][1],
        email:            data[i][2],
        cohortYear:       data[i][3],
        housingStatus:    data[i][5]  || 'Pending',
        acceptanceStatus: data[i][7]  || 'Pending',
        collegeName:      data[i][19] || '',
        collegeUnitId:    data[i][20] ? data[i][20].toString() : ''
      };
    }
  }
  return { status: 'not_found' };
}

function checkStudentStatus(email) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Grant_Recipients');

  if (!sheet) return { status: 'error', message: 'Grant_Recipients sheet not found' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] && data[i][2].toString().toLowerCase() === email.toLowerCase()) {
      return {
        status:           'found',
        applicationId:    data[i][0],
        studentName:      data[i][1],
        email:            data[i][2],
        cohortYear:       data[i][3],
        housingStatus:    data[i][5]  || 'Pending',
        acceptanceStatus: data[i][7]  || 'Pending',
        collegeName:      data[i][19] || '',
        collegeUnitId:    data[i][20] ? data[i][20].toString() : ''
      };
    }
  }
  return { status: 'not_found' };
}

function uploadDocuments(email, applicationId, housingFile, acceptanceFile) {
  try {
    Logger.log('=== UPLOAD DOCUMENTS CALLED ===');
    Logger.log('Email: ' + email);
    Logger.log('Application ID: ' + applicationId);

    if (!email || !applicationId) {
      return { status: 'error', message: 'Missing required parameters: email or applicationId' };
    }
    if (!housingFile)             return { status: 'error', message: 'Housing file is missing' };
    if (!housingFile.name)        return { status: 'error', message: 'Housing file name is missing' };
    if (!housingFile.data)        return { status: 'error', message: 'Housing file data is missing' };
    if (typeof housingFile.data !== 'string') return { status: 'error', message: 'Housing file data is not in correct format' };
    if (housingFile.data.length === 0)        return { status: 'error', message: 'Housing file data is empty' };

    if (!acceptanceFile)              return { status: 'error', message: 'Acceptance file is missing' };
    if (!acceptanceFile.name)         return { status: 'error', message: 'Acceptance file name is missing' };
    if (!acceptanceFile.data)         return { status: 'error', message: 'Acceptance file data is missing' };
    if (typeof acceptanceFile.data !== 'string') return { status: 'error', message: 'Acceptance file data is not in correct format' };
    if (acceptanceFile.data.length === 0)        return { status: 'error', message: 'Acceptance file data is empty' };

    Logger.log('Validation passed. Housing: ' + housingFile.name + ', Acceptance: ' + acceptanceFile.name);

    const DRIVE_FOLDER_ID = '1ccJ8lg40PTgMFIXdNoXyHU12ySgSnurf';
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    const housingBlob = Utilities.newBlob(
      Utilities.base64Decode(housingFile.data),
      getMimeType(housingFile.name),
      applicationId + '_Housing.' + housingFile.name.split('.').pop().toLowerCase()
    );
    const acceptanceBlob = Utilities.newBlob(
      Utilities.base64Decode(acceptanceFile.data),
      getMimeType(acceptanceFile.name),
      applicationId + '_Acceptance.' + acceptanceFile.name.split('.').pop().toLowerCase()
    );

    const housingDriveFile    = folder.createFile(housingBlob);
    const acceptanceDriveFile = folder.createFile(acceptanceBlob);

    try {
      housingDriveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      acceptanceDriveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingError) {
      Logger.log('Warning: Could not set sharing: ' + sharingError.message);
    }

    const housingUrl    = housingDriveFile.getUrl();
    const acceptanceUrl = acceptanceDriveFile.getUrl();

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Grant_Recipients');
    const data  = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][2] && data[i][2].toString().toLowerCase() === email.toLowerCase()) {
        sheet.getRange(i + 1, 6).setValue('Uploaded');
        sheet.getRange(i + 1, 7).setValue(housingUrl);
        sheet.getRange(i + 1, 8).setValue('Uploaded');
        sheet.getRange(i + 1, 9).setValue(acceptanceUrl);
        sheet.getRange(i + 1, 12).setValue('');
        Logger.log('Spreadsheet updated for row ' + (i + 1));
        break;
      }
    }

    Logger.log('=== UPLOAD COMPLETE ===');
    return { status: 'success', housingUrl: housingUrl, acceptanceUrl: acceptanceUrl };

  } catch (error) {
    Logger.log('=== UPLOAD ERROR ===');
    Logger.log(error.toString());
    return { status: 'error', message: 'Upload failed: ' + error.message };
  }
}

function getMimeType(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    'pdf':  'application/pdf',
    'jpg':  'image/jpeg',
    'jpeg': 'image/jpeg',
    'png':  'image/png'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}
