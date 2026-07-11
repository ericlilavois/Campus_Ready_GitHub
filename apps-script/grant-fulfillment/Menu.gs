// ============================================
// MENU
// ============================================

function onOpen() {
  SpreadsheetApp.getUi()
  .createMenu('Fulfillment Tools')
  .addItem('📧 1 — Send Kit Form Emails',    'sendKitFormEmails')
  .addSeparator()
  .addItem('📋 2 — Send Rejection Emails',   'sendRejectionEmails')
  .addSeparator()
  .addItem('🛒 3 — Generate Shopping List',  'generateShoppingList')
  .addSeparator()
  .addItem('🎓 4 — Send Testimonial Invites','sendTestimonialInvites')
  .addSeparator()
  .addItem('🗂 5 — Preview Archive Cohort',  'previewArchiveCohort')
  .addItem('🗂 5 — Archive Cohort',          'archiveCohort')
  .addSeparator()
  .addItem('⚙️ Admin — Rebuild Product Logic','rebuildProductLogic')
  .addItem('⚙️ Admin — Install Triggers',    'installTriggers')
  .addSeparator()
  .addItem('📬 Test — Kit Confirmation Email', 'testKitConfirmationEmail')
  .addSeparator()
  .addItem('📬 Test — Orientation Email',       'testOrientationEmail')
  .addItem('🎉 Send Orientation Emails',        'sendOrientationEmails')
  .addSeparator()
  .addItem('📬 Test — Orientation Reminder',    'testOrientationReminderEmail')
  .addItem('📧 Send Orientation Reminder',      'sendOrientationReminderEmails')
  .addSeparator()
  .addItem('📬 Test — Non-Attendee Travel Email','testNonAttendeeTravelEmails')
  .addItem('✈️ Send Non-Attendee Travel Emails', 'sendNonAttendeeTravelEmails')
  .addSeparator()
  .addItem('📬 Test — Non-Attendee No-Travel Email',  'testNonAttendeeNoTravelEmails')
  .addItem('🚗 Send Non-Attendee No-Travel Emails',   'sendNonAttendeeNoTravelEmails')
  .addToUi();
}
