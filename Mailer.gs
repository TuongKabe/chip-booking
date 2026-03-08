function sendPendingEmail_(bookingObj) {
  if (!bookingObj || !bookingObj['Email']) return;

  var subject = '[Mèo Tiên Tri] Xác nhận đặt lịch - ' + bookingObj['Ma Booking'];

  var html = [
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;color:#23201a;">',
      '<div style="background:linear-gradient(135deg,#136f63,#1a9c8b);padding:24px;border-radius:12px 12px 0 0;text-align:center;">',
        '<h1 style="color:#fff;margin:0;font-size:22px;">🔮 Mèo Tiên Tri lấp lánh cỏ hoa</h1>',
        '<p style="color:#d4f5f0;margin:6px 0 0;font-size:13px;">Xác nhận đặt lịch xem bài</p>',
      '</div>',
      '<div style="background:#fffef8;border:1px solid #d8d1bf;border-top:none;padding:24px;border-radius:0 0 12px 12px;">',
        '<p style="font-size:15px;">Xin chào <strong>' + bookingObj['Ten Querent'] + '</strong>,</p>',
        '<p>Hệ thống đã giữ chỗ tạm thời cho bạn. Vui lòng thanh toán trong thời gian quy định.</p>',
        '<table style="width:100%;border-collapse:collapse;margin:16px 0;">',
          '<tr><td style="padding:8px 12px;background:#f3efe2;font-weight:600;width:140px;border:1px solid #d8d1bf;">Mã booking</td>',
              '<td style="padding:8px 12px;border:1px solid #d8d1bf;">' + bookingObj['Ma Booking'] + '</td></tr>',
          '<tr><td style="padding:8px 12px;background:#f3efe2;font-weight:600;border:1px solid #d8d1bf;">Combo</td>',
              '<td style="padding:8px 12px;border:1px solid #d8d1bf;">' + bookingObj['Ten Combo'] + '</td></tr>',
          '<tr><td style="padding:8px 12px;background:#f3efe2;font-weight:600;border:1px solid #d8d1bf;">Khung giờ</td>',
              '<td style="padding:8px 12px;border:1px solid #d8d1bf;">' + bookingObj['Ngay book'] + ' | ' + bookingObj['Gio bat dau'] + ' - ' + bookingObj['Gio ket thuc'] + '</td></tr>',
          '<tr><td style="padding:8px 12px;background:#f3efe2;font-weight:600;border:1px solid #d8d1bf;">Hạn thanh toán</td>',
              '<td style="padding:8px 12px;border:1px solid #d8d1bf;color:#c0392b;font-weight:600;">' + bookingObj['Han thanh toan'] + '</td></tr>',
        '</table>',
        '<div style="background:#eaf7f4;border-left:4px solid #136f63;padding:12px 16px;border-radius:4px;margin:16px 0;">',
          '<strong>📌 Lưu ý:</strong> Nội dung chuyển khoản bắt buộc ghi: <strong>' + bookingObj['Ma Booking'] + '</strong>',
        '</div>',
        '<p style="color:#6a6659;font-size:13px;">Nếu cần hỗ trợ, vui lòng liên hệ qua Zalo/SĐT hoặc inbox Instagram/Facebook của Chip nhé!</p>',
      '</div>',
    '</div>'
  ].join('');

  GmailApp.sendEmail(bookingObj['Email'], subject, '', { htmlBody: html });
}

function sendStatusChangedEmail_(bookingObj, oldStatus, note) {
  if (!bookingObj || !bookingObj['Email']) return;

  var newStatus = bookingObj['Trang thai'];
  var subject = '[Mèo Tiên Tri] Cập nhật đơn ' + bookingObj['Ma Booking'] + ' → ' + newStatus;

  var statusColor = '#136f63';
  var statusIcon = '📋';
  if (newStatus === 'Confirmed') { statusColor = '#28a745'; statusIcon = '✅'; }
  else if (newStatus === 'Cancelled') { statusColor = '#c0392b'; statusIcon = '❌'; }
  else if (newStatus === 'Rescheduled') { statusColor = '#e67e22'; statusIcon = '📅'; }

  var noteHtml = note
    ? '<div style="background:#fff3cd;border-left:4px solid #e67e22;padding:12px 16px;border-radius:4px;margin:16px 0;"><strong>Ghi chú:</strong> ' + note + '</div>'
    : '';

  var html = [
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;color:#23201a;">',
      '<div style="background:linear-gradient(135deg,#136f63,#1a9c8b);padding:24px;border-radius:12px 12px 0 0;text-align:center;">',
        '<h1 style="color:#fff;margin:0;font-size:22px;">🔮 Mèo Tiên Tri lấp lánh cỏ hoa</h1>',
        '<p style="color:#d4f5f0;margin:6px 0 0;font-size:13px;">Cập nhật trạng thái đơn</p>',
      '</div>',
      '<div style="background:#fffef8;border:1px solid #d8d1bf;border-top:none;padding:24px;border-radius:0 0 12px 12px;">',
        '<p style="font-size:15px;">Xin chào <strong>' + bookingObj['Ten Querent'] + '</strong>,</p>',
        '<p>Đơn của bạn đã được cập nhật trạng thái:</p>',
        '<div style="text-align:center;margin:20px 0;">',
          '<span style="display:inline-block;padding:6px 16px;background:#f3efe2;border-radius:20px;font-size:14px;color:#6a6659;">' + oldStatus + '</span>',
          '<span style="display:inline-block;margin:0 8px;font-size:18px;">→</span>',
          '<span style="display:inline-block;padding:6px 16px;background:' + statusColor + ';color:#fff;border-radius:20px;font-size:14px;font-weight:600;">' + statusIcon + ' ' + newStatus + '</span>',
        '</div>',
        '<table style="width:100%;border-collapse:collapse;margin:16px 0;">',
          '<tr><td style="padding:8px 12px;background:#f3efe2;font-weight:600;width:140px;border:1px solid #d8d1bf;">Mã booking</td>',
              '<td style="padding:8px 12px;border:1px solid #d8d1bf;">' + bookingObj['Ma Booking'] + '</td></tr>',
          '<tr><td style="padding:8px 12px;background:#f3efe2;font-weight:600;border:1px solid #d8d1bf;">Khung giờ</td>',
              '<td style="padding:8px 12px;border:1px solid #d8d1bf;">' + bookingObj['Ngay book'] + ' | ' + bookingObj['Gio bat dau'] + ' - ' + bookingObj['Gio ket thuc'] + '</td></tr>',
        '</table>',
        noteHtml,
        '<p style="color:#6a6659;font-size:13px;">Nếu cần hỗ trợ, vui lòng liên hệ qua Zalo/SĐT hoặc inbox Instagram/Facebook của Chip nhé!</p>',
      '</div>',
    '</div>'
  ].join('');

  GmailApp.sendEmail(bookingObj['Email'], subject, '', { htmlBody: html });
}
