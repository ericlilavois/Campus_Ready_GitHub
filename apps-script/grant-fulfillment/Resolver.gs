// ============================================
// RESOLVER — matches student selections to products
// ============================================

const Resolver_Logic          = 'Resolver';
const LOGIC_SHEET_NAME        = 'Product_Logic';
const FORM_RESPONSE_SHEET_NAME = 'Student_Selections';

const FORM_HEADERS = {
  'TIMESTAMP':      'Date Submitted',
  'STUDENT_NAME':   'Student Name',
  'EMAIL':          'Email Address',
  'GENDER':         'Gender Preference',
  'SCENT':          'Scent Preference',
  'DEODORANT_TYPE': 'Deodorant Type',
  'BEDDING_COLOR':  'Bedding Color',
  'PILLOW_FIRMNESS':'Pillow Firmness',
  'TOWEL_COLOR':    'Towel Color',
  'STYLE':          'Style Preference',
  'SLIDES_SIZE':    'Slides Size',
  'SHIPPING_PREF':  'Shipping Preference',
  'STREET':         'Street Address',
  'CITY':           'City',
  'STATE':          'State',
  'ZIP':            'Zip Code'
};

const LOGIC_HEADERS = {
  'GENDER_CRIT':  'GENDER',
  'SCENT_CRIT':   'SCENT',
  'COLOR_CRIT':   'COLOR',
  'CHOICE_FIELD': 'CHOICE FIELD',
  'PRODUCT_TYPE': 'PRODUCT TYPE',
  'RETAILER':     'PRIMARY RETAILER',
  'SKU':          'PRIMARY SKU',
  'PRODUCT_NAME': 'PRODUCT',
  'URL':          'PRIMARY URL',
  'PRICE':        'PRIMARY PRICE',
  'QTY':          'QTY PER STUDENT',
  'EMAIL_OUT':    'Student Email',
  'NAME_OUT':     'Student Name',
  'PRODUCT_ID':   'Product ID'
};

function processLatestSubmission(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('=== PROCESSING LATEST SUBMISSION ===');

  let logicData;
  try {
    logicData = loadLogicTable(ss);
    Logger.log(`✅ Loaded ${logicData.length} products from Product_Logic`);
  } catch (error) {
    Logger.log('❌ CRITICAL ERROR: Failed to load Product_Logic');
    Logger.log(error.message);
    throw error;
  }

  const selectionsSheet = ss.getSheetByName('Student_Selections');
  if (!selectionsSheet) throw new Error('Student Selections sheet not found');

  const lastRow = selectionsSheet.getLastRow();
  if (lastRow < 2) throw new Error('No data in Student Selections sheet');

  const headers       = selectionsSheet.getRange(1, 1, 1, selectionsSheet.getLastColumn()).getValues()[0];
  const latestRowData = selectionsSheet.getRange(lastRow, 1, 1, selectionsSheet.getLastColumn()).getValues()[0];

  const headerMap = {};
  headers.forEach((h, i) => headerMap[h] = i);

  const studentChoices = {
    Timestamp:          latestRowData[headerMap['Timestamp']] || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
    StudentName:        latestRowData[headerMap['Student Name']] || '',
    Email:              latestRowData[headerMap['Email Address']] || '',
    Gender:             (latestRowData[headerMap['Gender Preference']] || '').toString().trim(),
    Scent:              latestRowData[headerMap['Scent Preference']] || '',
    DeodorantType:      latestRowData[headerMap['Deodorant Type']] || '',
    BeddingColor:       latestRowData[headerMap['Bedding Color']] || '',
    PillowFirmness:     latestRowData[headerMap['Pillow Firmness']] || '',
    TowelColor:         latestRowData[headerMap['Towel Color']] || '',
    Style:              latestRowData[headerMap['Style Preference']] || '',
    SlidesSize:         latestRowData[headerMap['Slides Size']] || '',
    ShippingPref:       latestRowData[headerMap['Shipping Preference (home or college)']] || '',
    Street:             latestRowData[headerMap['Street Address']] || '',
    City:               latestRowData[headerMap['City']] || '',
    State:              latestRowData[headerMap['State']] || '',
    Zip:                latestRowData[headerMap['Zip Code']] || '',
    DataType:           latestRowData[headerMap['data_type']] || 'Live',
    CohortYear:         latestRowData[headerMap['cohort_year']] || new Date().getFullYear(),
    ComforterCoverColor:latestRowData[headerMap['Comforter Cover Color']] || '',
    SlidesColor:        latestRowData[headerMap['Slides Color']] || '',
    CollegeName:        latestRowData[headerMap['College Name']] || '',
    CollegeUnitId:      latestRowData[headerMap['College Unit ID']] || ''
  };

  Logger.log(`Processing submission for: ${studentChoices.StudentName}`);
  const resolvedProducts = applyResolverLogic(studentChoices, logicData);
  writeResolvedProducts(ss, resolvedProducts);
  validateResolverCoverage(ss, studentChoices, resolvedProducts, logicData);
  Logger.log(`✅ Processed ${resolvedProducts.length} product matches for ${studentChoices.StudentName}`);
}

function loadLogicTable(ss) {
  const logicSheet = ss.getSheetByName(LOGIC_SHEET_NAME);
  if (!logicSheet) throw new Error(`Sheet '${LOGIC_SHEET_NAME}' not found.`);

  const lastRow = logicSheet.getLastRow();
  if (lastRow < 2) throw new Error(`Sheet '${LOGIC_SHEET_NAME}' has no data rows.`);

  const dataValues = logicSheet.getRange(2, 1, lastRow - 1, logicSheet.getLastColumn()).getValues();
  const headers    = logicSheet.getRange(1, 1, 1, logicSheet.getLastColumn()).getValues()[0];

  const headerMap = {};
  headers.forEach((h, i) => headerMap[h] = i);

  const requiredHeaders = ['PRODUCT TYPE', 'Product ID', 'GENDER', 'SCENT', 'CHOICE FIELD'];
  requiredHeaders.forEach(h => {
    if (!(h in headerMap)) throw new Error(`Missing required column in Product_Logic: '${h}'`);
  });

  const logicMap = [];
  for (let i = 0; i < dataValues.length; i++) {
    const row     = dataValues[i];
    const product = {};
    Object.keys(LOGIC_HEADERS).forEach(key => {
      const colName  = LOGIC_HEADERS[key];
      product[key]   = row[headerMap[colName]] || '';
    });
    if (product.PRODUCT_ID) logicMap.push(product);
  }
  return logicMap;
}

function applyResolverLogic(studentChoices, logicData) {
  Logger.log('\n=== APPLYING RESOLVER LOGIC ===');
  Logger.log(`Student: ${studentChoices.StudentName}`);

  const outputRows = [];
  const genderMap  = {
    'Male': 'Men', 'Female': 'Women',
    'Prefer Not to Say (PNS)': 'Unisex', 'PNS': 'Unisex'
  };
  const normalizedGender = genderMap[studentChoices.Gender] || studentChoices.Gender;

  for (const product of logicData) {
    let isMatch = true;
    const productType = product.PRODUCT_TYPE;

    if (product.GENDER_CRIT && product.GENDER_CRIT !== 'All') {
      if (product.GENDER_CRIT !== normalizedGender) isMatch = false;
    }

    if (isMatch && product.SCENT_CRIT && product.SCENT_CRIT !== 'All') {
      const isPnsPersonalCare = ['Shaving Cream', 'Deodorant', 'Antiperspirant'].includes(productType) && normalizedGender === 'Unisex';
      if (!isPnsPersonalCare) {
        if (product.SCENT_CRIT !== studentChoices.Scent) isMatch = false;
      } else {
        Logger.log(`Bypassing SCENT MATCH for PNS Personal Care: ${product.PRODUCT_NAME}`);
      }
    }

    const trimmedChoiceField = (product.CHOICE_FIELD || '').toString().trim();
    if (isMatch && trimmedChoiceField && trimmedChoiceField.toLowerCase() !== 'all') {
      const choiceValue = getChoiceValueForProduct(product.PRODUCT_TYPE, studentChoices);
      if (choiceValue === '') {
        Logger.log(`No student choice field for ${product.PRODUCT_TYPE}, skipping check`);
      } else {
        if (trimmedChoiceField.toLowerCase() !== (choiceValue || '').toString().trim().toLowerCase()) {
          isMatch = false;
        }
      }
    }

    const trimmedColorCrit = (product.COLOR_CRIT || '').toString().trim();
    if (isMatch && trimmedColorCrit && trimmedColorCrit.toLowerCase() !== 'all') {
      const colorValue = getColorValueForProduct(product.PRODUCT_TYPE, studentChoices);
      if (colorValue === '') {
        Logger.log(`No student color field for ${product.PRODUCT_TYPE}, skipping color check`);
      } else {
        if (trimmedColorCrit.toLowerCase() !== colorValue.toString().trim().toLowerCase()) isMatch = false;
      }
    }

    if (isMatch) {
      const outputRow = [
        Utilities.formatDate(new Date(String(studentChoices.Timestamp)), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
        studentChoices.Email,
        studentChoices.StudentName,
        product.PRODUCT_TYPE,
        product.RETAILER,
        product.SKU,
        product.PRODUCT_NAME,
        product.URL,
        product.PRICE,
        product.QTY,
        product.PRODUCT_ID,
        studentChoices.DataType,
        studentChoices.CohortYear,
        false
      ];
      outputRows.push(outputRow);
      Logger.log(`✅ MATCH: ${product.PRODUCT_NAME} (${product.PRODUCT_ID})`);
    }
  }

  outputRows.push(Array(14).fill(''));
  Logger.log(`Total matches for ${studentChoices.StudentName}: ${outputRows.length - 1}`);
  return outputRows;
}

function getChoiceValueForProduct(productType, studentChoices) {
  switch (productType) {
    case 'Sheet Set':     return studentChoices.BeddingColor;
    case 'Duvet Cover':   return studentChoices.ComforterCoverColor || studentChoices.BeddingColor;
    case 'Pillow':        return studentChoices.PillowFirmness;
    case 'Shampoo':
    case 'Conditioner':
    case 'Shampoo & Conditioner Set': return studentChoices.Scent;
    case 'Towel Set':     return studentChoices.TowelColor;
    case 'Slides':        return studentChoices.SlidesSize;
    case 'Deodorant':
    case 'Antiperspirant': return studentChoices.DeodorantType;
    case 'Shaving Cream': return '';
    case 'Laundry Basket':
    case 'Shower Caddy':
    case 'Storage Bins':
    case 'Hangers':
    case 'Desk Organizer':
    case 'Toiletry Bag':  return studentChoices.Style;
    default:              return '';
  }
}

function getColorValueForProduct(productType, studentChoices) {
  switch (productType) {
    case 'Slides': return studentChoices.SlidesColor || '';
    default:       return '';
  }
}

function validateResolverCoverage(ss, studentChoices, resolvedProducts, logicData) {
  const genderMap = {
    'Male': 'Men', 'Female': 'Women',
    'Prefer Not to Say (PNS)': 'Unisex', 'PNS': 'Unisex'
  };
  const normalizedGender = genderMap[studentChoices.Gender] || studentChoices.Gender;
  const studentScent     = studentChoices.Scent;

  // These product types bypass scent matching for PNS students (mirrors applyResolverLogic)
  const PNS_BYPASS = new Set(['Shaving Cream', 'Deodorant', 'Antiperspirant']);

  // Build a map of which scents the catalog covers for each product type + this gender
  const typeInfo = {};
  for (const product of logicData) {
    const genderCrit = product.GENDER_CRIT;
    if (genderCrit && genderCrit !== 'All' && genderCrit !== normalizedGender) continue;

    const type = product.PRODUCT_TYPE;
    if (!typeInfo[type]) typeInfo[type] = { scentsAvailable: new Set(), hasCatchAll: false };

    const scentCrit = product.SCENT_CRIT;
    if (!scentCrit || scentCrit === 'All') {
      typeInfo[type].hasCatchAll = true;
    } else {
      typeInfo[type].scentsAvailable.add(scentCrit);
    }
  }

  // Find product types where the catalog has scent entries for this gender but none for
  // this student's scent — those items were silently dropped
  const gaps = [];
  for (const [type, info] of Object.entries(typeInfo)) {
    if (info.hasCatchAll)                                         continue;
    if (info.scentsAvailable.size === 0)                          continue;
    if (info.scentsAvailable.has(studentScent))                   continue;
    if (normalizedGender === 'Unisex' && PNS_BYPASS.has(type))   continue;
    gaps.push({ type, available: [...info.scentsAvailable].sort().join(', ') });
  }

  if (gaps.length === 0) return;

  // Log to Errors tab
  const errorsSheet = ss.getSheetByName('Errors') || ss.insertSheet('Errors');
  if (errorsSheet.getLastRow() < 1) {
    errorsSheet.getRange(1, 1, 1, 6).setValues([
      ['Timestamp', 'Student Name', 'Email', 'Product Type', 'Issue', 'Details']
    ]);
    errorsSheet.getRange(1, 1, 1, 6)
      .setFontWeight('bold').setBackground('#ea4335').setFontColor('#ffffff');
  }
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  errorsSheet.getRange(errorsSheet.getLastRow() + 1, 1, gaps.length, 6).setValues(
    gaps.map(g => [
      ts,
      studentChoices.StudentName,
      studentChoices.Email,
      g.type,
      'No catalog entry for Gender + Scent + Product Type — item omitted from resolver output',
      `Gender: ${normalizedGender} | Student scent: ${studentScent} | Catalog has: ${g.available}`
    ])
  );

  Logger.log(`⚠️ Resolver coverage gaps for ${studentChoices.StudentName}: ${gaps.length} item(s) dropped`);
  gaps.forEach(g => Logger.log(`   Missing: ${g.type} — no "${studentScent}" entry for ${normalizedGender}`));

  SpreadsheetApp.getUi().alert(
    `⚠️ Coverage warning — ${studentChoices.StudentName}`,
    `${gaps.length} product type(s) were dropped because the catalog has no entry for ` +
    `${normalizedGender} + ${studentScent}:\n\n` +
    gaps.map(g => `• ${g.type}`).join('\n') +
    `\n\nLogged to the Errors tab. Fix the catalog and re-run the resolver before generating the Shopping List.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function writeResolvedProducts(ss, resolvedProducts) {
  const resolverSheet = ss.getSheetByName(Resolver_Logic) || ss.insertSheet(Resolver_Logic);

  if (resolverSheet.getLastRow() === 0) {
    const headers = [
      'Timestamp', 'Email', 'Student Name', 'Product Type',
      'Retailer', 'SKU', 'Product Name', 'URL', 'Price', 'Qty',
      'Product ID', 'data_type', 'cohort_year', 'shopping_list_generated'
    ];
    resolverSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    resolverSheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    resolverSheet.setFrozenRows(1);
  }

  if (resolvedProducts.length > 0) {
    const startRow = resolverSheet.getLastRow() + 1;
    resolverSheet.getRange(startRow, 1, resolvedProducts.length, resolvedProducts[0].length)
      .setValues(resolvedProducts);
    Logger.log(`✅ Wrote ${resolvedProducts.length} rows to Resolver sheet`);
  }
}
