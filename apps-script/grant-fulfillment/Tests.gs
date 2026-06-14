// ============================================
// TEST FUNCTIONS
// Run from the Script Editor. Results appear in View → Logs.
// ============================================

function testCheckStudentStatus() {
  const testEmail = 'elilavois@gmail.com';
  const result = checkStudentStatus(testEmail);
  Logger.log('=== EMAIL VALIDATION TEST ===');
  Logger.log('Testing email: ' + testEmail);
  Logger.log(JSON.stringify(result, null, 2));
}

function testDoPostRouting() {
  const mockRequest = {
    postData: {
      contents: JSON.stringify({ action: 'checkStudentStatus', email: 'elilavois@gmail.com' })
    }
  };
  const result = doPost(mockRequest);
  Logger.log('=== DOPOST ROUTING TEST ===');
  Logger.log(result.getContent());
}

function testUploadDocuments() {
  const testEmail         = 'elilavois@gmail.com';
  const testApplicationId = 'CR_1758657496058_8l0scy';
  const tinyPngBase64     = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const housingFile    = { name: 'test_housing.png',    data: tinyPngBase64 };
  const acceptanceFile = { name: 'test_acceptance.png', data: tinyPngBase64 };

  Logger.log('=== TESTING UPLOAD DOCUMENTS ===');
  const result = uploadDocuments(testEmail, testApplicationId, housingFile, acceptanceFile);
  Logger.log(JSON.stringify(result, null, 2));

  Logger.log('=== TESTING DOPOST ROUTING ===');
  const mockRequest = {
    postData: {
      contents: JSON.stringify({
        action: 'uploadDocuments',
        email: testEmail,
        applicationId: testApplicationId,
        housingFile,
        acceptanceFile
      })
    }
  };
  const doPostResult = doPost(mockRequest);
  Logger.log(doPostResult.getContent());
}

function testUploadWithMissingData() {
  const testEmail         = 'elilavois@gmail.com';
  const testApplicationId = 'CR_1758657496058_8l0scy';

  Logger.log('Test 1: Null housing file');
  Logger.log(JSON.stringify(uploadDocuments(testEmail, testApplicationId, null, { name: 'test.png', data: 'abc' })));

  Logger.log('Test 2: Missing data property');
  Logger.log(JSON.stringify(uploadDocuments(testEmail, testApplicationId, { name: 'test.png' }, { name: 'test.png', data: 'abc' })));

  Logger.log('Test 3: Empty data string');
  Logger.log(JSON.stringify(uploadDocuments(testEmail, testApplicationId, { name: 'test.png', data: '' }, { name: 'test.png', data: 'abc' })));
}
