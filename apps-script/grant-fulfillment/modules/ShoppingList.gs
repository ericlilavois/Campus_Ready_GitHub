// ============================================
// SHOPPING LIST GENERATOR
// ============================================

const OUTPUT_TAB_NAME = 'Shopping_List';
const LOG_TAB_NAME    = 'Errors';

function generateShoppingList() {
  Logger.log('=== STARTING SHOPPING LIST GENERATION ===');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const resolverData     = loadSheetData(ss, 'Resolver');
  const productLogicData = loadSheetData(ss, 'Product_Logic');
  const studentData      = loadSheetData(ss, 'Student_Selections');

  // Load Grant_Recipients for approval verification
  const grantRecipientsSheet = ss.getSheetByName('Grant_Recipients');
  if (!grantRecipientsSheet) {
    SpreadsheetApp.getUi().alert('Error: Grant_Recipients sheet not found.');
    return;
  }

  const grantRecipientsData = grantRecipientsSheet.getDataRange().getValues();
  const approvalMap = {};
  for (let i = 1; i < grantRecipientsData.length; i++) {
    const email           = grantRecipientsData[i][2];
    const housingStatus   = grantRecipientsData[i][5];
    const acceptanceStatus = grantRecipientsData[i][7];
    if (email) {
      approvalMap[email.toString().toLowerCase()] = {
        housing:    housingStatus,
        acceptance: acceptanceStatus,
        approved:   housingStatus === 'Approved' && acceptanceStatus === 'Approved'
      };
    }
  }
  Logger.log(`Loaded approval status for ${Object.keys(approvalMap).length} students`);

  const skippedStudents = { notFound: [], housingNotApproved: [], acceptanceNotApproved: [], bothNotApproved: [] };

  const resolverHeaderMap   = getHeaderMap(ss.getSheetByName('Resolver'));
  const currentYear = Math.max(...resolverData.map(row => {
    const year = parseInt(row[resolverHeaderMap['cohort_year']]);
    return isNaN(year) ? 0 : year;
  }));

  const filteredResolverData = [];
  const resolverRowNumbers   = [];

  resolverData.forEach((row, i) => {
    const dataType      = row[resolverHeaderMap['data_type']];
    const cohortYear    = parseInt(row[resolverHeaderMap['cohort_year']]);
    const generatedFlag = row[resolverHeaderMap['shopping_list_generated']];
    if (dataType === 'Live' && cohortYear === currentYear && generatedFlag !== true) {
      filteredResolverData.push(row);
      resolverRowNumbers.push(i + 2);
    }
  });

  if (resolverData.length === 0) {
    SpreadsheetApp.getUi().alert('No data found in Resolver tab. Please run the resolver first.');
    return;
  }

  if (filteredResolverData.length === 0) {
    SpreadsheetApp.getUi().alert(
      'Nothing to Process',
      'No unprocessed Resolver rows found for cohort year ' + currentYear + '.\n\n' +
      'To re-run: clear the "shopping_list_generated" column in the Resolver tab, then try again.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const productMap = buildProductMap(productLogicData);
  const studentMap = buildStudentMap(studentData);

  const outputRows = [];
  const errors     = [];
  let rowNum = 2;

  for (const row of filteredResolverData) {
    const studentName  = row[2];
    const studentEmail = row[1];

    const approval = approvalMap[studentEmail.toLowerCase()];
    if (!approval) {
      Logger.log(`⚠️ ${studentName} (${studentEmail}) not found in Grant_Recipients — SKIPPED`);
      skippedStudents.notFound.push(studentName);
      rowNum++;
      continue;
    }

    if (!approval.approved) {
      const housingApproved    = approval.housing === 'Approved';
      const acceptanceApproved = approval.acceptance === 'Approved';
      if (!housingApproved && !acceptanceApproved) skippedStudents.bothNotApproved.push(studentName);
      else if (!housingApproved)                   skippedStudents.housingNotApproved.push(studentName);
      else                                         skippedStudents.acceptanceNotApproved.push(studentName);
      Logger.log(`⚠️ ${studentName} docs not approved — SKIPPED`);
      rowNum++;
      continue;
    }

    const productId = row[10];
    if (!studentName || !productId) { rowNum++; continue; }

    const student = studentMap[studentName];
    const product = productMap[productId];

    if (!student) { errors.push([rowNum, studentName, productId, 'Student not found in Student Selections']); rowNum++; continue; }
    if (!product) { errors.push([rowNum, studentName, productId, 'Product not found in Product_Logic']);      rowNum++; continue; }

    const prefs        = buildConditionalPreferences(product.ProductType, student);
    const productLookup = buildProductLookupKey(product.ProductType, student, product);

    const qty = parseFloat(product.Qty) || 1;
    let unitPrice = 0;
    if (product.Price) {
      unitPrice = parseFloat(product.Price.toString().replace(/[$,]/g, '')) || 0;
    }
    const totalCost = qty * unitPrice;

    outputRows.push([
      studentName, studentEmail,
      student.Street1, student.Street2, student.City, student.State, student.Zip, student.ShippingPref,
      productLookup,
      product.ProductType, product.Brand || '', product.ProductName,
      product.SKU || productId, product.Retailer, product.URL,
      qty, unitPrice, totalCost,
      prefs.gender, prefs.scent, prefs.deodorantType, prefs.style,
      prefs.beddingColor, prefs.pillowFirmness, prefs.towelColor, prefs.slidesSize, prefs.slidesColor,
      row[resolverHeaderMap['data_type']], row[resolverHeaderMap['cohort_year']]
    ]);

    rowNum++;
  }

  const includedStudents = new Set(outputRows.map(r => r[1]));
  const skippedEmailSets = new Set([
    ...skippedStudents.notFound, ...skippedStudents.housingNotApproved,
    ...skippedStudents.acceptanceNotApproved, ...skippedStudents.bothNotApproved
  ]);
  const uniqueIncluded = includedStudents.size;
  const uniqueSkipped  = skippedEmailSets.size;
  const totalRows      = outputRows.length;

  if (uniqueIncluded === 0) {
    SpreadsheetApp.getUi().alert(
      'Nothing to Write',
      'No students with fully approved documents were found.\n\n' +
      (uniqueSkipped > 0 ? `${uniqueSkipped} student(s) skipped (documents not approved).` : ''),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  let gatewayMessage = `Ready to write shopping list:\n\n✓  ${uniqueIncluded} student(s) included — ${totalRows} product rows\n`;
  if (uniqueSkipped > 0) {
    gatewayMessage += `⚠️  ${uniqueSkipped} student(s) skipped (documents not approved):\n`;
    if (skippedStudents.notFound.length > 0)
      gatewayMessage += `     • Not found in Grant_Recipients: ${skippedStudents.notFound.join(', ')}\n`;
    if (skippedStudents.bothNotApproved.length > 0)
      gatewayMessage += `     • Both docs not approved: ${skippedStudents.bothNotApproved.join(', ')}\n`;
    if (skippedStudents.housingNotApproved.length > 0)
      gatewayMessage += `     • Housing not approved: ${skippedStudents.housingNotApproved.join(', ')}\n`;
    if (skippedStudents.acceptanceNotApproved.length > 0)
      gatewayMessage += `     • Acceptance not approved: ${skippedStudents.acceptanceNotApproved.join(', ')}\n`;
  }
  gatewayMessage += '\nClick OK to write to Shopping_List, or Cancel to stop.';

  const gatewayResponse = SpreadsheetApp.getUi().alert(
    'Generate Shopping List', gatewayMessage, SpreadsheetApp.getUi().ButtonSet.OK_CANCEL
  );
  if (gatewayResponse !== SpreadsheetApp.getUi().Button.OK) {
    SpreadsheetApp.getUi().alert('Cancelled', 'Shopping list was not written.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const outputSheet = ss.getSheetByName(OUTPUT_TAB_NAME) || ss.insertSheet(OUTPUT_TAB_NAME);
  if (outputSheet.getLastRow() < 1) {
    const headers = [
      'Student Name', 'Student Email', 'Street Address', 'Street Address 2',
      'City', 'State', 'Zip Code', 'Shipping Pref', 'Product Selection',
      'Product Type', 'Brand', 'Product Name', 'SKU', 'Retailer', 'URL',
      'Quantity', 'Unit Price', 'Total Cost',
      'Gender', 'Scent', 'Deodorant Type', 'Style',
      'Bedding Color', 'Pillow Firmness', 'Towel Color', 'Slides Size', 'Slides Color'
    ];
    outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    outputSheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
  }

  if (outputRows.length > 0) {
    outputSheet.getRange(2, 1, outputRows.length, outputRows[0].length).setValues(outputRows);
    Logger.log(`Wrote ${outputRows.length} rows to Shopping_List`);
  }

  const resolverSheet       = ss.getSheetByName('Resolver');
  const generatedColIndex   = resolverHeaderMap['shopping_list_generated'];
  resolverRowNumbers.forEach(actualRowNum => {
    resolverSheet.getRange(actualRowNum, generatedColIndex + 1).setValue(true);
  });
  Logger.log(`✅ Marked ${resolverRowNumbers.length} Resolver rows as generated`);

  if (errors.length > 0) {
    const logSheet = ss.getSheetByName(LOG_TAB_NAME) || ss.insertSheet(LOG_TAB_NAME);
    if (logSheet.getLastRow() < 1) logSheet.getRange(1, 1, 1, 4).setValues([['Row', 'Student', 'SKU', 'Error']]);
    logSheet.getRange(logSheet.getLastRow() + 1, 1, errors.length, errors[0].length).setValues(errors);
  }

  Logger.log('=== SHOPPING LIST GENERATION COMPLETE ===');
  if (errors.length > 0) {
    SpreadsheetApp.getUi().alert(
      'Shopping List Written — with Errors',
      `${outputRows.length} rows written.\n${errors.length} row(s) could not be matched — see '${LOG_TAB_NAME}' tab.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

function buildProductLookupKey(productType, student, product) {
  const parts = [];
  const genderMap = {
    'Male': "Men's", 'Female': "Women's",
    'Prefer Not to Say (PNS)': 'Unisex', 'PNS': 'Unisex'
  };

  if (student.Gender && ['Razor Handle', 'Razor Refills', 'Slides', 'Deodorant', 'Antiperspirant'].includes(productType)) {
    const genderPrefix = genderMap[student.Gender] || student.Gender;
    parts.push(genderPrefix !== 'Unisex' ? genderPrefix : 'Unisex');
  }

  if (productType === 'Sheet Set') {
    if (student.Color) parts.push(student.Color);
  } else if (productType === 'Duvet Cover') {
    const duvetColor = student.ComforterCoverColor || student.Color;
    if (duvetColor) parts.push(duvetColor);
  } else if (productType === 'Pillow') {
    if (student.Firmness) parts.push(student.Firmness);
  } else if (productType === 'Towel Set') {
    if (student.TowelColor) parts.push(student.TowelColor);
  } else if (productType === 'Slides') {
    if (student.SlidesSize)  parts.push(student.SlidesSize);
    if (student.SlidesColor) parts.push(student.SlidesColor);
  } else if (['Deodorant', 'Antiperspirant'].includes(productType)) {
    if (student.Scent) parts.push(student.Scent);
  } else if (['Laundry Basket', 'Shower Caddy', 'Storage Bins', 'Hangers', 'Desk Organizer'].includes(productType)) {
    if (student.Style) parts.push(student.Style);
  } else if (productType === 'Toiletry Bag') {
    if (product && product.Color) parts.push(product.Color);
  }

  parts.push(productType);
  return parts.join(' ');
}

function buildConditionalPreferences(productType, student) {
  const prefs = {
    gender: '', scent: '', deodorantType: '', style: '',
    beddingColor: '', pillowFirmness: '', towelColor: '', slidesSize: '', slidesColor: ''
  };

  if (['Razor Handle', 'Razor Refills', 'Slides', 'Deodorant', 'Antiperspirant'].includes(productType))
    prefs.gender = student.Gender || '';
  if (['Deodorant', 'Antiperspirant', 'Body Wash', 'Shampoo', 'Conditioner', 'Shampoo & Conditioner Set', 'Lotion'].includes(productType))
    prefs.scent = student.Scent || '';
  if (['Deodorant', 'Antiperspirant'].includes(productType))
    prefs.deodorantType = student.DeodorantType || '';
  if (['Laundry Basket', 'Shower Caddy', 'Storage Bins', 'Hangers', 'Desk Organizer', 'Toiletry Bag'].includes(productType))
    prefs.style = student.Style || '';
  if (productType === 'Sheet Set')
    prefs.beddingColor = student.Color || '';
  if (productType === 'Duvet Cover')
    prefs.beddingColor = student.ComforterCoverColor || student.Color || '';
  if (productType === 'Pillow')
    prefs.pillowFirmness = student.Firmness || '';
  if (productType === 'Towel Set')
    prefs.towelColor = student.TowelColor || '';
  if (productType === 'Slides') {
    prefs.slidesSize  = student.SlidesSize  || '';
    prefs.slidesColor = student.SlidesColor || '';
  }

  return prefs;
}

function buildProductMap(data) {
  const sheet     = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Product_Logic');
  const headerMap = getHeaderMap(sheet);
  const map       = {};

  data.forEach(row => {
    const productId = row[headerMap['Product ID']];
    if (productId) {
      map[productId] = {
        ProductType: row[headerMap['PRODUCT TYPE']],
        Brand:       row[headerMap['PRIMARY BRAND']],
        ProductName: row[headerMap['PRODUCT']],
        SKU:         row[headerMap['PRIMARY SKU']],
        Price:       row[headerMap['PRIMARY PRICE']],
        Qty:         row[headerMap['QTY PER STUDENT']],
        Retailer:    row[headerMap['PRIMARY RETAILER']],
        URL:         row[headerMap['PRIMARY URL']],
        Gender:      row[headerMap['GENDER']],
        Scent:       row[headerMap['SCENT']],
        ChoiceField: row[headerMap['CHOICE FIELD']],
        Color:       row[headerMap['COLOR']]
      };
    }
  });

  return map;
}

function buildStudentMap(data) {
  const sheet     = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Student_Selections');
  const headerMap = getHeaderMap(sheet);
  const map       = {};

  data.forEach(row => {
    const name = row[headerMap['Student Name']];
    if (name) {
      map[name] = {
        Email:               row[headerMap['Email Address']],
        Street1:             row[headerMap['Street Address']],
        Street2:             row[headerMap['Street Address 2']] || '',
        City:                row[headerMap['City']],
        State:               row[headerMap['State']],
        Zip:                 row[headerMap['Zip Code']],
        ShippingPref:        row[headerMap['Shipping Preference (home or college)']] || row[headerMap['Shipping Preference']] || '',
        Gender:              row[headerMap['Gender Preference']],
        Scent:               row[headerMap['Scent Preference']],
        DeodorantType:       row[headerMap['Deodorant Type']],
        Style:               row[headerMap['Style Preference']],
        Color:               row[headerMap['Bedding Color']],
        Firmness:            row[headerMap['Pillow Firmness']],
        TowelColor:          row[headerMap['Towel Color']],
        SlidesSize:          row[headerMap['Slides Size']],
        ComforterCoverColor: row[headerMap['Comforter Cover Color']] || '',
        SlidesColor:         row[headerMap['Slides Color']] || '',
        CollegeName:         row[headerMap['College Name']] || '',
        CollegeUnitId:       row[headerMap['College Unit ID']] || ''
      };
    }
  });

  return map;
}
