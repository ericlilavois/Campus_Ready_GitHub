// ============================================
// KIT CONFIRMATION EMAIL
// Fires automatically from doPost() after processLatestSubmission() resolves products.
// Run testKitConfirmationEmail() from the menu to preview at any time.
// ============================================

const KIT_EMAIL_CAT_ORDER_ = [
  'Bedding', 'Bath', 'Personal Care', 'Laundry', 'Cleaning', 'Desk', 'Storage'
];

const KIT_EMAIL_TYPE_TO_CAT_ = {
  'Sheet Set':'Bedding', 'Duvet Cover':'Bedding', 'Pillow':'Bedding',
  'Comforter':'Bedding', 'Mattress Protector':'Bedding', 'Pillow Protectors':'Bedding',
  'Towel Set':'Bath', 'Slides':'Bath', 'Shower Caddy':'Bath', 'Toiletry Bag':'Bath',
  'Shampoo':'Personal Care', 'Conditioner':'Personal Care',
  'Shampoo & Conditioner Set':'Personal Care',
  'Body Wash':'Personal Care', 'Deodorant':'Personal Care', 'Antiperspirant':'Personal Care',
  'Shaving Cream':'Personal Care', 'Razor Handle':'Personal Care',
  'Razor Refills':'Personal Care', 'Toothbrush':'Personal Care',
  'Toothpaste':'Personal Care', 'Dental Floss':'Personal Care',
  'Feminine Hygiene':'Personal Care', 'Facial Tissues':'Personal Care',
  'Laundry Pods':'Laundry', 'Dryer Sheets':'Laundry', 'Stain Remover':'Laundry',
  'Laundry Basket':'Laundry',
  'Disinfecting Wipes':'Cleaning', 'Bathroom Cleaner':'Cleaning',
  'All-Purpose Cleaner':'Cleaning', 'Microfiber Cloths':'Cleaning',
  'Trash Bin':'Cleaning', 'Paper Towels':'Cleaning',
  'Desk Lamp':'Desk', 'Desktop Organizer':'Desk', 'Sticky Notes':'Desk',
  'Whiteboard':'Desk', 'Power Strip':'Desk', 'Command Strips':'Desk',
  'Storage Bins':'Storage', 'Under-Bed Storage':'Storage', 'Hangers':'Storage',
  'Pants Hangers':'Storage', 'Closet Organizer':'Storage', 'Drawer Organizer':'Storage'
};

const KIT_EMAIL_IMGS_ = {
  'Sheet Set|White':  'https://m.media-amazon.com/images/I/813EcCwq3+L._AC_SL1500_.jpg',
  'Sheet Set|Gray':   'https://m.media-amazon.com/images/I/71zK7nK9axL._AC_SL1500_.jpg',
  'Sheet Set|Navy':   'https://m.media-amazon.com/images/I/71VQbIPNfjL._AC_SL1500_.jpg',
  'Sheet Set|Cream':  'https://m.media-amazon.com/images/I/71H2utHgjJL._AC_SL1500_.jpg',
  'Sheet Set|Pink':   'https://m.media-amazon.com/images/I/71nfRko+mAL._AC_SL1500_.jpg',
  'Sheet Set|Mint':   'https://m.media-amazon.com/images/I/71WHDDq8f7L._AC_SL1500_.jpg',
  'Duvet Cover|White':'https://m.media-amazon.com/images/I/81qMhSMnQKL._AC_SL1500_.jpg',
  'Duvet Cover|Gray': 'https://m.media-amazon.com/images/I/81t-MlivJEL._AC_SL1500_.jpg',
  'Duvet Cover|Navy': 'https://m.media-amazon.com/images/I/81sAbt2Us3L._AC_SL1500_.jpg',
  'Duvet Cover|Cream':'https://m.media-amazon.com/images/I/81uFBS1kFcL._AC_SL1500_.jpg',
  'Duvet Cover|Pink': 'https://m.media-amazon.com/images/I/81CjlZT5G4L._AC_SL1500_.jpg',
  'Duvet Cover|Mint': 'https://m.media-amazon.com/images/I/81Iol9Pw5NL._AC_SL1500_.jpg',
  'Comforter':         'https://m.media-amazon.com/images/I/61SzkB9DTGL._AC_SL1500_.jpg',
  'Mattress Protector':'https://m.media-amazon.com/images/I/71OrR2UH6cL._AC_SL1500_.jpg',
  'Pillow Protectors': 'https://m.media-amazon.com/images/I/61SrfE5Y+dL._AC_SL1500_.jpg',
  'Pillow|Soft':  'https://m.media-amazon.com/images/I/71329CVoVDL._AC_SL1500_.jpg',
  'Pillow|Medium':'https://m.media-amazon.com/images/I/6145-k9xSPL._AC_SL1500_.jpg',
  'Pillow|Firm':  'https://m.media-amazon.com/images/I/81vowBO1VrL._AC_SL1500_.jpg',
  'Towel Set|White':'https://m.media-amazon.com/images/I/71brbA5eSxL._AC_SL1500_.jpg',
  'Towel Set|Gray': 'https://m.media-amazon.com/images/I/913hqZ9Qb+L._AC_SL1500_.jpg',
  'Towel Set|Navy': 'https://m.media-amazon.com/images/I/91gpuqttYpL._AC_SL1500_.jpg',
  'Towel Set|Cream':'https://m.media-amazon.com/images/I/91kN6m4K0oL._AC_SL1500_.jpg',
  'Towel Set|Pink': 'https://m.media-amazon.com/images/I/91Ml4RHHyPL._AC_SL1500_.jpg',
  'Towel Set|Mint': 'https://m.media-amazon.com/images/I/91fAaFxF72L._AC_SL1500_.jpg',
  'Shower Caddy':  'https://m.media-amazon.com/images/I/71GURerjSaL._AC_SL1500_.jpg',
  'Toiletry Bag':  'https://m.media-amazon.com/images/I/71AADKHbkgL._AC_SL1500_.jpg',
  'Slides|White':'https://m.media-amazon.com/images/I/51Sng4ocDrL._AC_SX695_.jpg',
  'Slides|Gray': 'https://m.media-amazon.com/images/I/71K2qkOFQyL._AC_SX695_.jpg',
  'Slides|Navy': 'https://m.media-amazon.com/images/I/71EWQ9I5s1L._AC_SX695_.jpg',
  'Slides|Cream':'https://m.media-amazon.com/images/I/61i-dRRb1oL._AC_SX695_.jpg',
  'Slides|Pink': 'https://m.media-amazon.com/images/I/61erhf4rQVL._AC_SX695_.jpg',
  'Slides|Mint': 'https://m.media-amazon.com/images/I/71Gl+xLPD5L._AC_SX695_.jpg',
  'Shampoo & Conditioner|Unscented':    'https://m.media-amazon.com/images/I/617J7KJPFhL._SL1500_.jpg',
  'Shampoo & Conditioner|Fresh & Clean':'https://m.media-amazon.com/images/I/71dLuswyJBL._SL1500_.jpg',
  'Shampoo & Conditioner|Soft & Floral':'https://m.media-amazon.com/images/I/71jyiuNOmKL._SL1500_.jpg',
  'Shampoo & Conditioner|Cool & Herbal':'https://m.media-amazon.com/images/I/71CmY7A9E0L._SL1500_.jpg',
  'Shampoo & Conditioner|Wood & Amber': 'https://m.media-amazon.com/images/I/71SeHZcapXL._SL1500_.jpg',
  'Body Wash|Women': 'https://m.media-amazon.com/images/I/51JjHDWgSKL._SL1000_.jpg',
  'Body Wash|Men':   'https://m.media-amazon.com/images/I/51jQQ8yUfQL._SL1500_.jpg',
  'Body Wash|Unisex':'https://m.media-amazon.com/images/I/61FiC6PgWzL._SL1500_.jpg',
  'Deodorant|Women':      'https://m.media-amazon.com/images/I/61CDk0aPrfL._SL1500_.jpg',
  'Deodorant|Men':        'https://m.media-amazon.com/images/I/71-krfs03hL._SL1500_.jpg',
  'Deodorant|Unisex':     'https://m.media-amazon.com/images/I/61XoNO89w7L._SL1500_.jpg',
  'Antiperspirant|Women': 'https://m.media-amazon.com/images/I/61CDk0aPrfL._SL1500_.jpg',
  'Antiperspirant|Men':   'https://m.media-amazon.com/images/I/71-krfs03hL._SL1500_.jpg',
  'Antiperspirant|Unisex':'https://m.media-amazon.com/images/I/61XoNO89w7L._SL1500_.jpg',
  'Shaving Cream|Women': 'https://m.media-amazon.com/images/I/61QjCZz+-dL._SL1500_.jpg',
  'Shaving Cream|Men':   'https://m.media-amazon.com/images/I/61dhc56as4L._SL1500_.jpg',
  'Shaving Cream|Unisex':'https://m.media-amazon.com/images/I/61d-l41z6xL._SL1500_.jpg',
  'Razor Handle|Women':  'https://m.media-amazon.com/images/I/615WLv5hD5L._SL1500_.jpg',
  'Razor Handle|Men':    'https://m.media-amazon.com/images/I/71Q8+TBhTzL._SL1500_.jpg',
  'Razor Handle|Unisex': 'https://m.media-amazon.com/images/I/81RoJEgK5UL._SL1500_.jpg',
  'Toothbrush':    'https://m.media-amazon.com/images/I/71K9jutKeCL._AC_SL1500_.jpg',
  'Dental Floss':  'https://m.media-amazon.com/images/I/710k1gFyLvL._AC_SL1500_.jpg',
  'Laundry Pods':  'https://m.media-amazon.com/images/I/81Yw8gFOqoL._AC_SL1500_.jpg',
  'Dryer Sheets':  'https://m.media-amazon.com/images/I/61GXEDQ6DvL._AC_SL1500_.jpg',
  'Stain Remover': 'https://m.media-amazon.com/images/I/61QHDaGestL._AC_SL1500_.jpg',
  'Disinfecting Wipes':  'https://m.media-amazon.com/images/I/71re5SFRK4L._AC_SL1500_.jpg',
  'Bathroom Cleaner':    'https://m.media-amazon.com/images/I/71iQ1AoegWL._AC_SL1500_.jpg',
  'All-Purpose Cleaner': 'https://m.media-amazon.com/images/I/71KhddMxKUL._AC_SL1500_.jpg',
  'Microfiber Cloths':   'https://m.media-amazon.com/images/I/81w8bOHAQHL._AC_SL1500_.jpg',
  'Trash Bin':           'https://m.media-amazon.com/images/I/41rZFx3ltvL._SL1500_.jpg',
  'Paper Towels':        'https://m.media-amazon.com/images/I/71tXcUdNE+L._AC_SL1500_.jpg',
  'Desk Lamp':           'https://m.media-amazon.com/images/I/51Ap5qHeQGL._AC_SL1500_.jpg',
  'Desktop Organizer':   'https://m.media-amazon.com/images/I/614z7w+EtsL._AC_SL1500_.jpg',
  'Sticky Notes':        'https://m.media-amazon.com/images/I/71jRyBA8hwL._AC_SL1500_.jpg',
  'Whiteboard':          'https://m.media-amazon.com/images/I/610zpxSKvlL._AC_SL1500_.jpg',
  'Power Strip':         'https://m.media-amazon.com/images/I/611IqNw495L._AC_SL1500_.jpg',
  'Command Strips':      'https://m.media-amazon.com/images/I/81TY1nb1vxL._SL1500_.jpg',
  'Storage Bins':        'https://m.media-amazon.com/images/I/515ngqr1KML._AC_SL1200_.jpg',
  'Under-Bed Storage':   'https://m.media-amazon.com/images/I/51TUWJwtR+L._AC_SL1500_.jpg',
  'Hangers':             'https://m.media-amazon.com/images/I/71PDwhyAN-L._AC_SL1500_.jpg',
  'Pants Hangers':       'https://m.media-amazon.com/images/I/61-VcTJfgZL._AC_SL1500_.jpg',
  'Closet Organizer':    'https://m.media-amazon.com/images/I/71d2zg7GAeL._AC_SL1500_.jpg',
  'Drawer Organizer':    'https://m.media-amazon.com/images/I/51ekZ5lDZBL._AC_SL1000_.jpg'
};

const KIT_EMAIL_BRANDS_ = {
  'Sheet Set':'Lane Linen', 'Duvet Cover':'California Design Den',
  'Comforter':'ViscoSoft', 'Mattress Protector':'Amazon Basics', 'Pillow Protectors':'Amazon Basics',
  'Pillow|Soft':'Beckham Hotel Collection', 'Pillow|Medium':'Utopia Bedding', 'Pillow|Firm':'Love Attitude',
  'Towel Set|White':'Lane Linen', 'Towel Set|Gray':'Lane Linen',
  'Towel Set|Pink':'Lane Linen',  'Towel Set|Mint':'Lane Linen',
  'Towel Set|Navy':'Cotton Paradise', 'Towel Set|Cream':'Cotton Paradise',
  'Shower Caddy':'Byune', 'Toiletry Bag':'Maliton', 'Slides':'Bronax',
  'Shampoo & Conditioner|Unscented':'CeraVe',
  'Shampoo & Conditioner|Fresh & Clean':'Native',
  'Shampoo & Conditioner|Soft & Floral':'Native',
  'Shampoo & Conditioner|Cool & Herbal':'Native',
  'Shampoo & Conditioner|Wood & Amber':'Native',
  'Body Wash|Women':'EOS', 'Body Wash|Men':'Method', 'Body Wash|Unisex':'Native',
  'Deodorant|Women':'Native', 'Deodorant|Men':'Dove', 'Deodorant|Unisex':'Vanicream',
  'Antiperspirant|Women':'Vanicream', 'Antiperspirant|Men':'Dove', 'Antiperspirant|Unisex':'Vanicream',
  'Shaving Cream|Women':'Billie', 'Shaving Cream|Men':'VaniCream', 'Shaving Cream|Unisex':'Cremo',
  "Razor Handle|Women":"Billie", "Razor Handle|Men":"Harry's", 'Razor Handle|Unisex':'Dollar Shave Club',
  'Toothbrush':'Curaprox', 'Dental Floss':'Oral-B',
  'Laundry Pods':'Tide', 'Dryer Sheets':'Amazon Basics', 'Stain Remover':'Miss Mouths',
  'Disinfecting Wipes':'Clorox', 'Bathroom Cleaner':'Scrubbing Bubbles',
  'All-Purpose Cleaner':'Lysol', 'Microfiber Cloths':'Aidea',
  'Trash Bin':'iDesign', 'Paper Towels':'Amazon Basics',
  'Desk Lamp':'White Drown', 'Desktop Organizer':'Blue Ginkgo', 'Sticky Notes':'Post-it',
  'Whiteboard':'VUSIGN', 'Power Strip':'Amazon Basics', 'Command Strips':'3M',
  'Storage Bins':'Iris', 'Under-Bed Storage':'Iris', 'Hangers':'Amazon Basics',
  'Pants Hangers':'Amazon Basics', 'Closet Organizer':'Simple Houseware', 'Drawer Organizer':'Amazon Basics'
};

function kitEmailGenderKey_(d) {
  const gm = { 'Male':'Men', 'Men':'Men', 'Female':'Women', 'Women':'Women',
    'Prefer Not to Say (PNS)':'Unisex', 'PNS':'Unisex', 'Unisex':'Unisex' };
  return gm[d.gender_preference] || 'Unisex';
}

function kitEmailImgUrl_(productType, d) {
  const g = kitEmailGenderKey_(d);
  let key;
  switch (productType) {
    case 'Sheet Set':     key = 'Sheet Set|'   + (d.bedding_color || ''); break;
    case 'Duvet Cover':   key = 'Duvet Cover|' + (d.comforter_cover_color || d.bedding_color || ''); break;
    case 'Pillow':        key = 'Pillow|'      + (d.pillow_firmness || ''); break;
    case 'Towel Set':     key = 'Towel Set|'   + (d.towel_color || ''); break;
    case 'Slides':        key = 'Slides|'      + (d.slides_color || ''); break;
    case 'Shampoo': case 'Conditioner': case 'Shampoo & Conditioner Set':
      key = 'Shampoo & Conditioner|' + (d.scent_preference || ''); break;
    case 'Body Wash': case 'Deodorant': case 'Antiperspirant':
    case 'Shaving Cream': case 'Razor Handle':
      key = productType + '|' + g; break;
    default: key = productType;
  }
  return KIT_EMAIL_IMGS_[key] || KIT_EMAIL_IMGS_[productType] || '';
}

function kitEmailChoice_(productType, d) {
  switch (productType) {
    case 'Sheet Set':     return d.bedding_color || '';
    case 'Duvet Cover':   return d.comforter_cover_color || d.bedding_color || '';
    case 'Pillow':        return d.pillow_firmness || '';
    case 'Towel Set':     return d.towel_color || '';
    case 'Slides': {
      const parts = [d.slides_color, d.slides_size].filter(Boolean);
      return parts.join(' · ');
    }
    case 'Shampoo': case 'Conditioner': case 'Shampoo & Conditioner Set':
      return d.scent_preference || '';
    default: return '';
  }
}

function kitEmailBrand_(productType, d) {
  const g = kitEmailGenderKey_(d);
  let key;
  switch (productType) {
    case 'Pillow':    key = 'Pillow|'    + (d.pillow_firmness || ''); break;
    case 'Towel Set': key = 'Towel Set|' + (d.towel_color || ''); break;
    case 'Shampoo': case 'Conditioner': case 'Shampoo & Conditioner Set':
      key = 'Shampoo & Conditioner|' + (d.scent_preference || ''); break;
    case 'Body Wash': case 'Deodorant': case 'Antiperspirant':
    case 'Shaving Cream': case 'Razor Handle':
      key = productType + '|' + g; break;
    default: key = productType;
  }
  return KIT_EMAIL_BRANDS_[key] || KIT_EMAIL_BRANDS_[productType] || '';
}

function buildKitConfirmationHtml_(params) {
  const firstName      = params.firstName;
  const schoolNickname = params.schoolNickname;
  const color          = params.schoolColor || '#469E92';
  const d              = params.formData;
  const products       = params.products;

  var grouped = {};
  KIT_EMAIL_CAT_ORDER_.forEach(function(c) { grouped[c] = []; });
  products.forEach(function(p) {
    var cat = KIT_EMAIL_TYPE_TO_CAT_[p.productType];
    if (cat && grouped[cat]) grouped[cat].push(p);
  });

  var activeCats = KIT_EMAIL_CAT_ORDER_.filter(function(c) {
    return grouped[c] && grouped[c].length > 0;
  });

  var categorySections = '';
  activeCats.forEach(function(catName) {
    var rows = '';
    grouped[catName].forEach(function(p) {
      var imgUrl  = kitEmailImgUrl_(p.productType, d);
      var choice  = kitEmailChoice_(p.productType, d);
      var brand   = kitEmailBrand_(p.productType, d);
      var qty     = p.qty && parseFloat(p.qty) > 1 ? '\xD7' + p.qty : '';
      var choiceDisplay = [choice, qty].filter(Boolean).join(' \xB7 ');
      var imgHtml = imgUrl
        ? '<img src="' + imgUrl + '" width="52" height="52" style="border-radius:8px;border:1px solid #e5e7eb;display:block;object-fit:cover;" alt="">'
        : '<div style="width:52px;height:52px;border-radius:8px;background:#f3f4f6;border:1px solid #e5e7eb;"></div>';

      rows +=
        '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">' +
          '<tr>' +
            '<td width="64" style="vertical-align:middle;padding-right:12px;">' + imgHtml + '</td>' +
            '<td style="vertical-align:middle;">' +
              '<div style="font-size:13px;font-weight:600;color:#111827;line-height:1.3;">' + (p.productName || p.productType) + '</div>' +
              (choiceDisplay ? '<div style="font-size:12px;color:' + color + ';font-weight:500;margin-top:2px;">' + choiceDisplay + '</div>' : '') +
              (brand ? '<div style="font-size:12px;color:#9ca3af;margin-top:1px;">' + brand + '</div>' : '') +
            '</td>' +
            '<td width="24" style="vertical-align:middle;text-align:right;">' +
              '<div style="width:18px;height:18px;border:1.5px solid #d1d5db;border-radius:3px;display:inline-block;"></div>' +
            '</td>' +
          '</tr>' +
        '</table>';
    });

    categorySections +=
      '<tr><td>' +
        '<table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #e5e7eb;">' +
          '<tr><td style="padding:12px 24px;">' +
            '<div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">' + catName + '</div>' +
            rows +
          '</td></tr>' +
        '</table>' +
      '</td></tr>';
  });

  var nameParts  = (d.student_name || '').split(' ');
  var lastName   = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  var addrLines  = [firstName + (lastName ? ' ' + lastName : ''), d.street_address];
  if (d.street_address_2) addrLines.push(d.street_address_2);
  addrLines.push((d.city || '') + ', ' + (d.state || '') + ' ' + (d.zip || ''));
  var shippingHtml = addrLines.filter(Boolean).join('<br>');

  return '<!DOCTYPE html>' +
'<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
'<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">' +
'<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;">' +
'<tr><td align="center" style="padding:20px 12px;">' +
'<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">' +
'<tr><td style="background:' + color + ';padding:32px 24px;text-align:center;">' +
  '<p style="font-size:11px;color:rgba(255,255,255,.7);margin:0 0 6px;text-transform:uppercase;letter-spacing:.1em;font-weight:500;">We\'re building your kit for</p>' +
  '<p style="font-size:38px;font-weight:700;color:#ffffff;margin:0;letter-spacing:-.5px;font-family:Georgia,serif;">' + (schoolNickname || d.college_name || 'your school') + '</p>' +
'</td></tr>' +
'<tr><td style="padding:16px 24px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;line-height:1.65;">' +
  'Hi ' + firstName + ' — your kit is in motion. Check items off below as packages arrive.' +
'</td></tr>' +
'<tr><td style="padding:8px 24px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">' +
  products.length + ' items \xB7 ' + activeCats.length + ' categories' +
'</td></tr>' +
categorySections +
'<tr><td style="padding:16px 24px;border-bottom:1px solid #e5e7eb;">' +
  '<div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Shipping to</div>' +
  '<div style="font-size:13px;color:#374151;line-height:1.7;">' + shippingHtml + '</div>' +
'</td></tr>' +
'<tr><td style="padding:16px 24px 20px;background:#f9fafb;">' +
  '<p style="font-size:12px;color:#6b7280;line-height:1.6;margin:0;">Your kit ships before move-in. We\'ll send tracking as soon as it\'s on the way.</p>' +
  '<p style="font-size:12px;color:#6b7280;line-height:1.6;margin:8px 0 0;">Questions? <a href="mailto:hello@campusready.org" style="color:' + color + ';text-decoration:none;font-weight:500;">hello@campusready.org</a></p>' +
'</td></tr>' +
'</table></td></tr></table></body></html>';
}

function sendKitConfirmationEmail(ss, data) {
  var email = data.email;
  if (!email) return;

  var firstName   = (data.student_name || '').split(' ')[0] || 'there';
  var cohortYear  = data.cohort_year || new Date().getFullYear();
  var schoolColor = data.school_color || '#469E92';
  var schoolNick  = data.school_nickname || data.college_name || '';

  var resolverSheet = ss.getSheetByName('Resolver');
  if (!resolverSheet || resolverSheet.getLastRow() < 2) {
    Logger.log('sendKitConfirmationEmail: Resolver empty, skipping');
    return;
  }

  var rHm      = getHeaderMap(resolverSheet);
  var rows     = resolverSheet.getDataRange().getValues();
  var products = [];

  var KIT_CAT_TYPES_ = {
    'Bedding':1, 'Cleaning':1, 'Desk':1, 'Laundry':1,
    'Storage':1, 'Personal Care':1, 'Move-In Essentials':1
  };
  var KIT_NAME_NORM_ = {
    'Pillow Protectors (Zippered)':        'Pillow Protectors',
    'All-Purpose Cleaner (Spray)':         'All-Purpose Cleaner',
    'Microfiber Cleaning Cloths (White)':  'Microfiber Cloths',
    'Microfiber Cleaning Cloths':          'Microfiber Cloths',
    'Desk Lamp (USB)':                     'Desk Lamp',
    'Stain Stick / Stain Pen':             'Stain Remover',
    'Stain Stick':                         'Stain Remover',
    'Command Strips, Posters':             'Command Strips'
  };

  for (var i = 1; i < rows.length; i++) {
    var rowEmail = (rows[i][rHm['Email']] || '').toString().toLowerCase().trim();
    var rowYear  = rows[i][rHm['cohort_year']];
    var pType    = (rows[i][rHm['Product Type']] || '').toString().trim();
    var pName    = (rows[i][rHm['Product Name']] || '').toString().trim();
    if (rowEmail === email.toLowerCase().trim() && String(rowYear) === String(cohortYear) && pType) {
      var effectiveType = KIT_CAT_TYPES_[pType] ? (KIT_NAME_NORM_[pName] || pName) : pType;
      products.push({ productType: effectiveType, productName: pName, qty: rows[i][rHm['Qty']] || 1 });
    }
  }

  if (products.length === 0) {
    Logger.log('sendKitConfirmationEmail: no Resolver rows for ' + email);
    return;
  }

  var htmlBody = buildKitConfirmationHtml_({
    firstName:      firstName,
    schoolNickname: schoolNick,
    schoolColor:    schoolColor,
    formData:       data,
    products:       products
  });

  GmailApp.sendEmail(email, "We're building your kit, " + firstName, '', {
    htmlBody:  htmlBody,
    name:      'Campus Ready Foundation',
    from:      'hello@campusready.org',
    replyTo:   'hello@campusready.org'
  });
  Logger.log('Kit confirmation email sent to ' + email);
}

function testKitConfirmationEmail() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Student_Selections');
  if (!sheet || sheet.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('No data in Student_Selections. Submit the kit form first.');
    return;
  }

  var hm         = getHeaderMap(sheet);
  var rows       = sheet.getDataRange().getValues();
  var TEST_EMAIL = 'elilavois@gmail.com';
  var formData   = null;

  for (var i = 1; i < rows.length; i++) {
    var rowEmail = (rows[i][hm['Email Address']] || '').toString().toLowerCase().trim();
    if (rowEmail === TEST_EMAIL) {
      formData = {
        student_name:          rows[i][hm['Student Name']]                           || '',
        email:                 TEST_EMAIL,
        street_address:        rows[i][hm['Street Address']]                         || '',
        street_address_2:      rows[i][hm['Street Address 2']]                      || '',
        city:                  rows[i][hm['City']]                                   || '',
        state:                 rows[i][hm['State']]                                  || '',
        zip:                   rows[i][hm['Zip Code']]                               || '',
        shipping_preference:   rows[i][hm['Shipping Preference (home or college)']] || '',
        gender_preference:     rows[i][hm['Gender Preference']]                     || '',
        scent_preference:      rows[i][hm['Scent Preference']]                      || '',
        deodorant_type:        rows[i][hm['Deodorant Type']]                        || '',
        bedding_color:         rows[i][hm['Bedding Color']]                         || '',
        comforter_cover_color: rows[i][hm['Comforter Cover Color']]                 || '',
        pillow_firmness:       rows[i][hm['Pillow Firmness']]                       || '',
        towel_color:           rows[i][hm['Towel Color']]                           || '',
        slides_size:           rows[i][hm['Slides Size']]                           || '',
        slides_color:          rows[i][hm['Slides Color']]                          || '',
        college_name:          rows[i][hm['College Name']]                          || '',
        college_unit_id:       rows[i][hm['College Unit ID']]                       || '',
        cohort_year:           rows[i][hm['cohort_year']] || new Date().getFullYear(),
        school_color:          '#57068C',
        school_nickname:       'NYU'
      };
      break;
    }
  }

  if (!formData) {
    SpreadsheetApp.getUi().alert(TEST_EMAIL + ' not found in Student_Selections.');
    return;
  }

  sendKitConfirmationEmail(ss, formData);
  SpreadsheetApp.getUi().alert('Confirmation email sent to ' + TEST_EMAIL + ' — check your inbox!');
}
