function sendPendingEmail_(bookingObj) {
  if (!bookingObj || !bookingObj['Email']) return;

  var subject = '[Tarot Booking] Da tao don cho ' + bookingObj['Ma Booking'];
  var body = [
    'Xin chao ' + bookingObj['Ten Querent'] + ',',
    '',
    'He thong da giu cho tam thoi cho ban.',
    'Ma booking: ' + bookingObj['Ma Booking'],
    'Combo: ' + bookingObj['Ten Combo'],
    'Khung gio: ' + bookingObj['Ngay book'] + ' ' + bookingObj['Gio bat dau'] + ' - ' + bookingObj['Gio ket thuc'],
    'Han thanh toan: ' + bookingObj['Han thanh toan'],
    '',
    'Vui long thanh toan va tai bien lai trong thoi gian quy dinh.',
    '',
    'Meo Tien Tri lap lanh co hoa'
  ].join('\n');

  GmailApp.sendEmail(bookingObj['Email'], subject, body);
}

function sendStatusChangedEmail_(bookingObj, oldStatus, note) {
  if (!bookingObj || !bookingObj['Email']) return;

  var subject = '[Tarot Booking] Cap nhat don ' + bookingObj['Ma Booking'] + ': ' + bookingObj['Trang thai'];
  var body = [
    'Xin chao ' + bookingObj['Ten Querent'] + ',',
    '',
    'Don cua ban da duoc cap nhat trang thai.',
    'Ma booking: ' + bookingObj['Ma Booking'],
    'Trang thai cu: ' + oldStatus,
    'Trang thai moi: ' + bookingObj['Trang thai'],
    'Khung gio: ' + bookingObj['Ngay book'] + ' ' + bookingObj['Gio bat dau'] + ' - ' + bookingObj['Gio ket thuc'],
    note ? ('Ghi chu: ' + note) : '',
    '',
    'Neu can ho tro, vui long lien he qua Zalo/SDT cua Reader.',
    '',
    'Meo Tien Tri lap lanh co hoa'
  ].filter(function(line) {
    return line !== '';
  }).join('\n');

  GmailApp.sendEmail(bookingObj['Email'], subject, body);
}
