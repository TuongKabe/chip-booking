function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Tarot Booking')
    .addItem('1) Khởi tạo workbook', 'setupWorkbook')
    .addItem('2) Seed 8 combo mặc định', 'seedDefaultServices')
    .addItem('3) Cài trigger timeout', 'installTriggers')
    .addItem('4) Cấu hình PIN Admin', 'configureAdminPin')
    .addSeparator()
    .addItem('Mở hướng dẫn sử dụng', 'showSetupGuide')
    .addToUi();
}

function configureAdminPin() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('Cấu hình PIN Admin', 'Nhập PIN admin mới (tối thiểu 6 ký tự):', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;

  var pin = (response.getResponseText() || '').trim();
  if (pin.length < 6) {
    ui.alert('PIN phải tối thiểu 6 ký tự.');
    return;
  }

  setAdminPin(pin);
  ui.alert('Đã cập nhật PIN admin thành công.');
}

function showSetupGuide() {
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial;padding:16px;line-height:1.6">' +
      '<h2>Tarot Booking Setup (Calendar Edition)</h2>' +
      '<ol>' +
        '<li>Chạy <b>Khởi tạo workbook</b> để tạo 2 sheets (Dich_Vu, Don_Booking).</li>' +
        '<li>Chạy <b>Seed 8 combo mặc định</b> và chỉnh giá/nội dung.</li>' +
        '<li>Chạy <b>Cấu hình PIN Admin</b> để bảo mật dashboard.</li>' +
        '<li><b>Tạo Google Calendar riêng</b> cho Tarot Booking → copy Calendar ID vào Config.gs.</li>' +
        '<li>Trên Calendar, tạo event "<b>Nhận khách</b>" cho các khung giờ muốn nhận.</li>' +
        '<li>Cấu hình DRIVE_FOLDER_ID và BANK trong Config.gs.</li>' +
        '<li>Chạy <b>Cài trigger timeout</b>.</li>' +
        '<li>Deploy Web App với access: Anyone with link.</li>' +
      '</ol>' +
      '<p style="color:#136f63;font-weight:bold">📌 Lưu ý: Event trên Calendar phải có tiêu đề chính xác "Nhận khách" thì mới hiện slot cho khách.</p>' +
    '</div>'
  ).setWidth(580).setHeight(420);

  SpreadsheetApp.getUi().showModalDialog(html, 'Tarot Booking Guide');
}
