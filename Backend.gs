function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? String(e.parameter.page).toLowerCase() : 'booking';
  var templateName = page === 'admin' ? 'Admin' : 'Index';
  var title = page === 'admin' ? 'Tarot Booking Admin - Mèo Tiên Tri' : 'Tarot Booking - Mèo Tiên Tri';

  return HtmlService.createTemplateFromFile(templateName)
    .evaluate()
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ========== SETUP ========== */

function setupWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateSheet_(ss, CONFIG.SHEETS.SERVICES, HEADERS.SERVICES);
  getOrCreateSheet_(ss, CONFIG.SHEETS.BOOKINGS, HEADERS.BOOKINGS);
  SpreadsheetApp.flush();
}

function seedDefaultServices() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet_(ss, CONFIG.SHEETS.SERVICES, HEADERS.SERVICES);
  if (sheet.getLastRow() > 1) return;

  var sample = [
    ['No.18', 'Sự nghiệp', 'Combo No.18', 399000, 16, '- Câu hỏi 1\n- Câu hỏi 2'],
    ['No.19', 'Sự nghiệp', 'Combo No.19', 499000, 20, '- Câu hỏi 1\n- Câu hỏi 2'],
    ['No.20', 'Sự nghiệp', 'Combo No.20', 599000, 24, '- Câu hỏi 1\n- Câu hỏi 2'],
    ['No.21', 'Sự nghiệp', 'Combo No.21', 699000, 28, '- Câu hỏi 1\n- Câu hỏi 2'],
    ['No.22', 'Bản thân', 'Combo No.22', 399000, 16, '- Câu hỏi 1\n- Câu hỏi 2'],
    ['No.23', 'Bản thân', 'Combo No.23', 499000, 20, '- Câu hỏi 1\n- Câu hỏi 2'],
    ['No.24', 'Bản thân', 'Combo No.24', 599000, 24, '- Câu hỏi 1\n- Câu hỏi 2'],
    ['No.25', 'Bản thân', 'Combo No.25', 699000, 28, '- Câu hỏi 1\n- Câu hỏi 2']
  ];
  sheet.getRange(2, 1, sample.length, sample[0].length).setValues(sample);
}

/* ========== PUBLIC API ========== */

function getPublicConfig() {
  var uploadCfg = CONFIG.UPLOAD || {};
  var allowed = uploadCfg.ALLOWED_BILL_MIME_TYPES || ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  var maxMb = Number(uploadCfg.MAX_BILL_SIZE_MB || 8);

  return {
    bank: CONFIG.BANK,
    paymentTimeoutMinutes: CONFIG.PAYMENT_TIMEOUT_MINUTES,
    upload: {
      maxBillSizeMb: maxMb,
      allowedBillMimeTypes: allowed
    }
  };
}

function getServices() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SERVICES);
  if (!sheet) return [];

  return getRowsAsObjects_(sheet).map(function(r) {
    return {
      comboId: r['ID Combo'],
      category: r['Phan loai'],
      name: r['Ten Combo'],
      priceVnd: r['Gia VND'],
      priceUsd: r['Gia USD'],
      details: r['Noi dung chi tiet']
    };
  });
}

function getAvailableSlots() {
  return getAvailableSlotsFromCalendar_();
}

/* ========== BOOKING ========== */

function createPendingBooking(payload) {
  requireField_(payload.fullName, 'fullName');
  requireField_(payload.phone, 'phone');
  requireField_(payload.email, 'email');
  requireField_(payload.socialName, 'socialName');
  requireField_(payload.comboId, 'comboId');
  requireField_(payload.slotKey, 'slotKey');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var bookingSheet = ss.getSheetByName(CONFIG.SHEETS.BOOKINGS);
    var serviceSheet = ss.getSheetByName(CONFIG.SHEETS.SERVICES);

    if (!bookingSheet || !serviceSheet) {
      throw new Error('Workbook chưa được khởi tạo. Chạy setupWorkbook() trước.');
    }

    var service = getRowsAsObjects_(serviceSheet).find(function(s) {
      return String(s['ID Combo']) === String(payload.comboId);
    });
    if (!service) throw new Error('Combo không hợp lệ.');

    // Lấy slot từ Calendar
    var slots = getAvailableSlotsFromCalendar_();
    var targetSlot = slots.find(function(s) {
      return s.slotKey === payload.slotKey;
    });
    if (!targetSlot) throw new Error('Khung giờ không tìm thấy hoặc đã được book.');

    var bookingCode = bookingCode_();
    var now = new Date();
    var paymentDeadline = new Date(now.getTime() + CONFIG.PAYMENT_TIMEOUT_MINUTES * 60000);

    var bookingObj = {
      'Ma Booking': bookingCode,
      'Ten Querent': payload.fullName,
      'Zalo/SDT': payload.phone,
      'Email': payload.email,
      'Insta/Facebook': payload.socialName || '',
      'DOB': payload.dob || '',
      'Combo ID': service['ID Combo'],
      'Ten Combo': service['Ten Combo'],
      'Ngay book': targetSlot.date,
      'Gio bat dau': targetSlot.start,
      'Gio ket thuc': targetSlot.end,
      'Trang thai': CONFIG.STATUS.BOOKING_PENDING,
      'Link anh Bill': '',
      'Mo ta van de': payload.issueSummary || '',
      'Han thanh toan': paymentDeadline,
      'Calendar Event ID': '',
      'Created at': nowIso_(),
      'Updated at': nowIso_()
    };

    // Xoá event "Nhận khách" + tạo event booking trên Calendar
    removeAvailableEvent_(targetSlot.date, targetSlot.start, targetSlot.end);
    var calEventId = createBookingEvent_(bookingObj);
    bookingObj['Calendar Event ID'] = calEventId;

    appendRowFromObject_(bookingSheet, bookingObj, HEADERS.BOOKINGS);
    sendPendingEmail_(bookingObj);

    return {
      bookingCode: bookingCode,
      paymentDeadlineIso: paymentDeadline.toISOString(),
      slot: {
        date: targetSlot.date,
        start: targetSlot.start,
        end: targetSlot.end
      },
      comboName: service['Ten Combo']
    };
  } finally {
    lock.releaseLock();
  }
}

/* ========== BILL UPLOAD ========== */

function uploadBillImage(payload) {
  requireField_(payload.bookingCode, 'bookingCode');
  requireField_(payload.base64, 'base64');
  requireField_(payload.mimeType, 'mimeType');

  var mimeType = String(payload.mimeType).toLowerCase().trim();
  var uploadCfg = CONFIG.UPLOAD || {};
  var allowed = uploadCfg.ALLOWED_BILL_MIME_TYPES || ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (allowed.indexOf(mimeType) === -1) {
    throw new Error('Định dạng ảnh không hợp lệ. Chỉ hỗ trợ: ' + allowed.join(', '));
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var bookingSheet = ss.getSheetByName(CONFIG.SHEETS.BOOKINGS);
    if (!bookingSheet) throw new Error('Booking sheet not found.');

    var rows = getRowsAsObjects_(bookingSheet);
    var booking = rows.find(function(b) {
      return String(b['Ma Booking']) === String(payload.bookingCode);
    });
    if (!booking) throw new Error('Booking not found.');

    var currentStatus = String(booking['Trang thai'] || '').trim().toLowerCase();
    var expectedStatus = String(CONFIG.STATUS.BOOKING_PENDING).trim().toLowerCase();
    if (currentStatus !== expectedStatus) {
      throw new Error('Chỉ cho phép upload bill khi booking đang Pending. Trạng thái hiện tại: ' + booking['Trang thai']);
    }

    var deadline = booking['Han thanh toan'];
    var deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
    if (deadlineDate instanceof Date && !isNaN(deadlineDate.getTime()) && deadlineDate < new Date()) {
      throw new Error('Đã quá hạn thanh toán, không thể upload bill cho booking này.');
    }

    var bytes;
    try {
      bytes = Utilities.base64Decode(payload.base64);
    } catch (err) {
      throw new Error('Dữ liệu ảnh không hợp lệ.');
    }

    var maxMb = Number(uploadCfg.MAX_BILL_SIZE_MB || 8);
    var maxBytes = maxMb * 1024 * 1024;
    if (!bytes || bytes.length === 0) {
      throw new Error('File ảnh trống.');
    }
    if (bytes.length > maxBytes) {
      throw new Error('File quá lớn. Giới hạn ' + CONFIG.UPLOAD.MAX_BILL_SIZE_MB + 'MB.');
    }

    var safeName = String(payload.fileName || 'bill').replace(/[^a-zA-Z0-9._-]/g, '_');
    if (safeName.length > 120) {
      safeName = safeName.slice(-120);
    }

    var blob = Utilities.newBlob(bytes, mimeType, booking['Ma Booking'] + '_' + safeName);

    var folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = file.getUrl();

    bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Link anh Bill') + 1)
      .setValue(fileUrl);
    bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Updated at') + 1)
      .setValue(nowIso_());

    return { fileUrl: fileUrl };
  } finally {
    lock.releaseLock();
  }
}

/* ========== BOOKING STATUS ========== */

function updateBookingStatus(payload) {
  requireAdminSession_(payload && payload.adminToken);
  requireField_(payload.bookingCode, 'bookingCode');
  requireField_(payload.newStatus, 'newStatus');

  var valid = [
    CONFIG.STATUS.BOOKING_PENDING,
    CONFIG.STATUS.BOOKING_CONFIRMED,
    CONFIG.STATUS.BOOKING_CANCELLED,
    CONFIG.STATUS.BOOKING_RESCHEDULED
  ];
  if (valid.indexOf(payload.newStatus) === -1) {
    throw new Error('Trạng thái không hợp lệ.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var bookingSheet = ss.getSheetByName(CONFIG.SHEETS.BOOKINGS);

    var bookingRows = getRowsAsObjects_(bookingSheet);
    var booking = bookingRows.find(function(b) {
      return String(b['Ma Booking']) === String(payload.bookingCode);
    });
    if (!booking) throw new Error('Không tìm thấy booking.');

    var oldStatus = booking['Trang thai'];
    var oldDate = normalizeDate_(booking['Ngay book']);
    var oldStart = normalizeTime_(booking['Gio bat dau']);
    var oldEnd = normalizeTime_(booking['Gio ket thuc']);

    // Cancel → xoá event booking, tạo lại event "Nhận khách"
    if (payload.newStatus === CONFIG.STATUS.BOOKING_CANCELLED) {
      var oldEventId = booking['Calendar Event ID'];
      removeBookingEvent_(oldEventId);
      restoreAvailableEvent_(oldDate, oldStart, oldEnd);
    }

    // Reschedule → swap events
    if (payload.newStatus === CONFIG.STATUS.BOOKING_RESCHEDULED) {
      requireField_(payload.newSlotKey, 'newSlotKey');

      // Restore old slot
      var oldEventId2 = booking['Calendar Event ID'];
      removeBookingEvent_(oldEventId2);
      restoreAvailableEvent_(oldDate, oldStart, oldEnd);

      // Book new slot
      var newSlots = getAvailableSlotsFromCalendar_();
      var newSlot = newSlots.find(function(s) { return s.slotKey === payload.newSlotKey; });
      if (!newSlot) throw new Error('Khung giờ mới không tìm thấy hoặc đã được book.');

      removeAvailableEvent_(newSlot.date, newSlot.start, newSlot.end);

      // Update booking data
      bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Ngay book') + 1).setValue(newSlot.date);
      bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Gio bat dau') + 1).setValue(newSlot.start);
      bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Gio ket thuc') + 1).setValue(newSlot.end);

      // Create new booking event
      booking['Ngay book'] = newSlot.date;
      booking['Gio bat dau'] = newSlot.start;
      booking['Gio ket thuc'] = newSlot.end;
      var newEventId = createBookingEvent_(booking);
      bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Calendar Event ID') + 1).setValue(newEventId);
    }

    bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Trang thai') + 1).setValue(payload.newStatus);
    bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Updated at') + 1).setValue(nowIso_());

    var reloaded = getRowsAsObjects_(bookingSheet).find(function(b) {
      return String(b['Ma Booking']) === String(payload.bookingCode);
    });

    if (oldStatus !== payload.newStatus) {
      sendStatusChangedEmail_(reloaded, oldStatus, payload.note || '');
    }

    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

/* ========== TIMEOUT TRIGGER ========== */

function processPendingTimeouts() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var bookingSheet = ss.getSheetByName(CONFIG.SHEETS.BOOKINGS);
    if (!bookingSheet) return;

    var now = new Date();
    var rows = getRowsAsObjects_(bookingSheet);

    rows.forEach(function(booking) {
      if (booking['Trang thai'] !== CONFIG.STATUS.BOOKING_PENDING) return;

      var deadline = booking['Han thanh toan'];
      var deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
      if (!(deadlineDate instanceof Date) || isNaN(deadlineDate.getTime())) return;
      if (deadlineDate > now) return;

      // Cancel: xoá event booking, tạo lại "Nhận khách"
      var date = normalizeDate_(booking['Ngay book']);
      var start = normalizeTime_(booking['Gio bat dau']);
      var end = normalizeTime_(booking['Gio ket thuc']);

      try {
        removeBookingEvent_(booking['Calendar Event ID']);
        restoreAvailableEvent_(date, start, end);
      } catch (calErr) {
        Logger.log('Warning: calendar error for ' + booking['Ma Booking'] + ' - ' + calErr.message);
      }

      bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Trang thai') + 1)
        .setValue(CONFIG.STATUS.BOOKING_CANCELLED);
      bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Updated at') + 1)
        .setValue(nowIso_());

      booking['Trang thai'] = CONFIG.STATUS.BOOKING_CANCELLED;
      sendStatusChangedEmail_(booking, CONFIG.STATUS.BOOKING_PENDING, 'Booking timed out after payment window.');
    });
  } finally {
    lock.releaseLock();
  }
}

/* ========== ADMIN AUTH ========== */

function hashAdminPin_(pin) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(pin), Utilities.Charset.UTF_8);
  return digest.map(function(byte) {
    var v = (byte < 0) ? byte + 256 : byte;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function getAdminPinHash_() {
  return PropertiesService.getScriptProperties().getProperty(CONFIG.SECURITY.ADMIN_PIN_PROPERTY_KEY);
}

function requireAdminPinConfigured_() {
  var hash = getAdminPinHash_();
  if (!hash) {
    throw new Error('Admin PIN chưa được cấu hình. Chạy setAdminPin("your-pin") trong Apps Script editor.');
  }
}

function setAdminPin(pin) {
  requireField_(pin, 'pin');
  var clean = String(pin).trim();
  if (clean.length < 6) {
    throw new Error('PIN phải tối thiểu 6 ký tự.');
  }
  var hash = hashAdminPin_(clean);
  PropertiesService.getScriptProperties().setProperty(CONFIG.SECURITY.ADMIN_PIN_PROPERTY_KEY, hash);
  return { success: true };
}

function adminLogin(payload) {
  requireField_(payload && payload.pin, 'pin');
  requireAdminPinConfigured_();

  var hash = hashAdminPin_(String(payload.pin).trim());
  if (hash !== getAdminPinHash_()) {
    throw new Error('Sai PIN admin.');
  }

  var token = Utilities.getUuid();
  var cache = CacheService.getScriptCache();
  var ttl = Math.max(60, CONFIG.SECURITY.ADMIN_SESSION_MINUTES * 60);
  cache.put('admin_session_' + token, '1', ttl);

  return {
    success: true,
    token: token,
    expiresInSeconds: ttl
  };
}

function adminLogout(payload) {
  if (!payload || !payload.adminToken) return { success: true };
  CacheService.getScriptCache().remove('admin_session_' + payload.adminToken);
  return { success: true };
}

function requireAdminSession_(token) {
  requireAdminPinConfigured_();
  requireField_(token, 'adminToken');

  var cacheKey = 'admin_session_' + String(token);
  var session = CacheService.getScriptCache().get(cacheKey);
  if (!session) {
    throw new Error('Phiên admin hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
  }
}

/* ========== ADMIN SNAPSHOT ========== */

function getAdminSnapshot(payload) {
  requireAdminSession_(payload && payload.adminToken);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var bookingSheet = ss.getSheetByName(CONFIG.SHEETS.BOOKINGS);

  var bookings = bookingSheet ? getRowsAsObjects_(bookingSheet).map(function(b) {
    var date = normalizeDate_(b['Ngay book']);
    var start = normalizeTime_(b['Gio bat dau']);
    var end = normalizeTime_(b['Gio ket thuc']);
    var deadline = b['Han thanh toan'];
    var deadlineStr = '';
    if (deadline instanceof Date && !isNaN(deadline.getTime())) {
      deadlineStr = deadline.toISOString();
    } else if (deadline) {
      deadlineStr = String(deadline);
    }
    return {
      bookingCode: b['Ma Booking'],
      fullName: b['Ten Querent'],
      phone: b['Zalo/SDT'],
      email: b['Email'],
      comboName: b['Ten Combo'],
      status: b['Trang thai'],
      billUrl: b['Link anh Bill'],
      issueSummary: b['Mo ta van de'],
      socialName: b['Insta/Facebook'] || '',
      paymentDeadline: deadlineStr,
      date: date,
      start: start,
      end: end,
      slotKey: slotKey_(date, start, end)
    };
  }) : [];

  // Slots từ Calendar (bao gồm cả available + booked)
  var slots = getAllCalendarSlotsForAdmin_();

  bookings.sort(function(a, b) {
    return String(b.bookingCode || '').localeCompare(String(a.bookingCode || ''));
  });

  return {
    bookings: bookings,
    slots: slots,
    status: CONFIG.STATUS
  };
}

/* ========== ADMIN SLOT (block = xoá event trên Calendar) ========== */

function adminDeleteSlot(payload) {
  requireAdminSession_(payload && payload.adminToken);
  requireField_(payload.eventId, 'eventId');

  try {
    var cal = getBookingCalendar_();
    var event = cal.getEventById(payload.eventId);
    if (event) {
      event.deleteEvent();
    }
    return { success: true };
  } catch (e) {
    throw new Error('Không thể xoá event: ' + e.message);
  }
}

function adminCreateSlot(payload) {
  requireAdminSession_(payload && payload.adminToken);
  requireField_(payload.date, 'date');
  requireField_(payload.start, 'start');
  requireField_(payload.end, 'end');

  var cal = getBookingCalendar_();
  var dtStart = parseDateTime_(payload.date, payload.start);
  var dtEnd = parseDateTime_(payload.date, payload.end);

  cal.createEvent(CONFIG.CALENDAR.AVAILABLE_TITLE, dtStart, dtEnd);
  return { success: true };
}

/* ========== TRIGGERS ========== */

function installTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'processPendingTimeouts') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('processPendingTimeouts')
    .timeBased()
    .everyMinutes(CONFIG.TIME_DRIVEN_MINUTES)
    .create();
}
