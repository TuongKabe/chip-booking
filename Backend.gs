function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? String(e.parameter.page).toLowerCase() : 'booking';
  var templateName = page === 'admin' ? 'Admin' : 'Index';
  var title = page === 'admin' ? 'Tarot Booking Admin - MÃ¨o TiÃªn Tri' : 'Tarot Booking - MÃ¨o TiÃªn Tri';

  return HtmlService.createTemplateFromFile(templateName)
    .evaluate()
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateSheet_(ss, CONFIG.SHEETS.SERVICES, HEADERS.SERVICES);
  getOrCreateSheet_(ss, CONFIG.SHEETS.SLOTS, HEADERS.SLOTS);
  getOrCreateSheet_(ss, CONFIG.SHEETS.BOOKINGS, HEADERS.BOOKINGS);
  SpreadsheetApp.flush();
}

function seedDefaultServices() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet_(ss, CONFIG.SHEETS.SERVICES, HEADERS.SERVICES);
  if (sheet.getLastRow() > 1) return;

  var sample = [
    ['No.18', 'Su nghiep', 'Combo No.18', 399000, 16, '- Cau hoi 1\n- Cau hoi 2'],
    ['No.19', 'Su nghiep', 'Combo No.19', 499000, 20, '- Cau hoi 1\n- Cau hoi 2'],
    ['No.20', 'Su nghiep', 'Combo No.20', 599000, 24, '- Cau hoi 1\n- Cau hoi 2'],
    ['No.21', 'Su nghiep', 'Combo No.21', 699000, 28, '- Cau hoi 1\n- Cau hoi 2'],
    ['No.22', 'Ban than', 'Combo No.22', 399000, 16, '- Cau hoi 1\n- Cau hoi 2'],
    ['No.23', 'Ban than', 'Combo No.23', 499000, 20, '- Cau hoi 1\n- Cau hoi 2'],
    ['No.24', 'Ban than', 'Combo No.24', 599000, 24, '- Cau hoi 1\n- Cau hoi 2'],
    ['No.25', 'Ban than', 'Combo No.25', 699000, 28, '- Cau hoi 1\n- Cau hoi 2']
  ];
  sheet.getRange(2, 1, sample.length, sample[0].length).setValues(sample);
}

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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SLOTS);
  if (!sheet) return [];

  var now = new Date();
  return getRowsAsObjects_(sheet)
    .map(function(r) {
      var dateStr = normalizeDate_(r['Ngay']);
      var startStr = normalizeTime_(r['Gio bat dau']);
      var endStr = normalizeTime_(r['Gio ket thuc']);
      return {
        date: dateStr,
        start: startStr,
        end: endStr,
        status: r['Trang thai'],
        slotKey: slotKey_(dateStr, startStr, endStr),
        startsAt: parseDateTime_(dateStr, startStr)
      };
    })
    .filter(function(slot) {
      return slot.status === CONFIG.STATUS.SLOT_EMPTY && slot.startsAt > now;
    })
    .sort(function(a, b) {
      return a.startsAt - b.startsAt;
    })
    .map(function(slot) {
      delete slot.startsAt;
      return slot;
    });
}

function createPendingBooking(payload) {
  requireField_(payload.fullName, 'fullName');
  requireField_(payload.phone, 'phone');
  requireField_(payload.email, 'email');
  requireField_(payload.comboId, 'comboId');
  requireField_(payload.slotKey, 'slotKey');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var slotSheet = ss.getSheetByName(CONFIG.SHEETS.SLOTS);
    var bookingSheet = ss.getSheetByName(CONFIG.SHEETS.BOOKINGS);
    var serviceSheet = ss.getSheetByName(CONFIG.SHEETS.SERVICES);

    if (!slotSheet || !bookingSheet || !serviceSheet) {
      throw new Error('Workbook chÆ°a Ä‘Æ°á»£c khá»Ÿi táº¡o. Cháº¡y setupWorkbook() trÆ°á»›c.');
    }

    var service = getRowsAsObjects_(serviceSheet).find(function(s) {
      return String(s['ID Combo']) === String(payload.comboId);
    });
    if (!service) throw new Error('Combo khÃ´ng há»£p lá»‡.');

    var slotRows = getRowsAsObjects_(slotSheet);
    var targetSlot = slotRows.find(function(s) {
      var key = slotKey_(normalizeDate_(s['Ngay']), normalizeTime_(s['Gio bat dau']), normalizeTime_(s['Gio ket thuc']));
      return key === payload.slotKey;
    });
    if (!targetSlot) throw new Error('Khung giá» khÃ´ng tÃ¬m tháº¥y.');
    if (targetSlot['Trang thai'] !== CONFIG.STATUS.SLOT_EMPTY) {
      throw new Error('Khung giá» nÃ y khÃ´ng cÃ²n trá»‘ng.');
    }

    var bookingCode = bookingCode_();
    var now = new Date();
    var paymentDeadline = new Date(now.getTime() + CONFIG.PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

    slotSheet.getRange(targetSlot._rowIndex, 4).setValue(CONFIG.STATUS.SLOT_BOOKED);

    var bookingObj = {
      'Ma Booking': bookingCode,
      'Ten Querent': payload.fullName,
      'Zalo/SDT': payload.phone,
      'Email': payload.email,
      'DOB': payload.dob || '',
      'Combo ID': service['ID Combo'],
      'Ten Combo': service['Ten Combo'],
      'Ngay book': normalizeDate_(targetSlot['Ngay']),
      'Gio bat dau': normalizeTime_(targetSlot['Gio bat dau']),
      'Gio ket thuc': normalizeTime_(targetSlot['Gio ket thuc']),
      'Trang thai': CONFIG.STATUS.BOOKING_PENDING,
      'Link anh Bill': '',
      'Mo ta van de': payload.issueSummary || '',
      'Han thanh toan': paymentDeadline,
      'Created at': nowIso_(),
      'Updated at': nowIso_()
    };

    bookingSheet.appendRow(mapRowFromHeaders_(HEADERS.BOOKINGS, bookingObj));

    sendPendingEmail_(bookingObj);

    return {
      success: true,
      bookingCode: bookingCode,
      paymentDeadlineIso: paymentDeadline.toISOString(),
      slot: {
        date: bookingObj['Ngay book'],
        start: bookingObj['Gio bat dau'],
        end: bookingObj['Gio ket thuc']
      },
      comboName: bookingObj['Ten Combo']
    };
  } finally {
    lock.releaseLock();
  }
}

function uploadBillImage(payload) {
  requireField_(payload.bookingCode, 'bookingCode');
  requireField_(payload.fileName, 'fileName');
  requireField_(payload.mimeType, 'mimeType');
  requireField_(payload.base64, 'base64');

  var mimeType = String(payload.mimeType).toLowerCase().trim();
  var uploadCfg = CONFIG.UPLOAD || {};
  var allowed = uploadCfg.ALLOWED_BILL_MIME_TYPES || ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (allowed.indexOf(mimeType) === -1) {
    throw new Error('Äá»‹nh dáº¡ng áº£nh khÃ´ng há»£p lá»‡. Chá»‰ há»— trá»£: ' + allowed.join(', '));
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

    if (booking['Trang thai'] !== CONFIG.STATUS.BOOKING_PENDING) {
      throw new Error('Chá»‰ cho phÃ©p upload bill khi booking Ä‘ang Pending.');
    }

    var deadline = booking['Han thanh toan'];
    var deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
    if (deadlineDate instanceof Date && !isNaN(deadlineDate.getTime()) && deadlineDate < new Date()) {
      throw new Error('ÄÃ£ quÃ¡ háº¡n thanh toÃ¡n, khÃ´ng thá»ƒ upload bill cho booking nÃ y.');
    }

    var bytes;
    try {
      bytes = Utilities.base64Decode(payload.base64);
    } catch (err) {
      throw new Error('Dá»¯ liá»‡u áº£nh khÃ´ng há»£p lá»‡.');
    }

    var maxMb = Number(uploadCfg.MAX_BILL_SIZE_MB || 8);
    var maxBytes = maxMb * 1024 * 1024;
    if (!bytes || bytes.length === 0) {
      throw new Error('File áº£nh trá»‘ng.');
    }
    if (bytes.length > maxBytes) {
      throw new Error('File quÃ¡ lá»›n. Giá»›i háº¡n ' + CONFIG.UPLOAD.MAX_BILL_SIZE_MB + 'MB.');
    }

    var safeName = String(payload.fileName || 'bill').replace(/[^a-zA-Z0-9._-]/g, '_');
    if (safeName.length > 120) {
      safeName = safeName.slice(-120);
    }
    var finalName = booking['Ma Booking'] + '_' + new Date().getTime() + '_' + safeName;
    var blob = Utilities.newBlob(bytes, mimeType, finalName);

    var folder;
    if (CONFIG.DRIVE_FOLDER_ID && CONFIG.DRIVE_FOLDER_ID !== 'REPLACE_WITH_DRIVE_FOLDER_ID') {
      folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    } else {
      folder = DriveApp.getRootFolder();
    }

    var file = folder.createFile(blob);
    var fileUrl = file.getUrl();

    bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Link anh Bill') + 1).setValue(fileUrl);
    bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Updated at') + 1).setValue(nowIso_());

    return {
      success: true,
      fileUrl: fileUrl
    };
  } finally {
    lock.releaseLock();
  }
}

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
    throw new Error('Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var bookingSheet = ss.getSheetByName(CONFIG.SHEETS.BOOKINGS);
    var slotSheet = ss.getSheetByName(CONFIG.SHEETS.SLOTS);

    var bookingRows = getRowsAsObjects_(bookingSheet);
    var booking = bookingRows.find(function(b) {
      return String(b['Ma Booking']) === String(payload.bookingCode);
    });
    if (!booking) throw new Error('KhÃ´ng tÃ¬m tháº¥y booking.');

    var oldStatus = booking['Trang thai'];
    var oldSlotKey = slotKey_(
      normalizeDate_(booking['Ngay book']),
      normalizeTime_(booking['Gio bat dau']),
      normalizeTime_(booking['Gio ket thuc'])
    );

    if (payload.newStatus === CONFIG.STATUS.BOOKING_CANCELLED) {
      setSlotStatusByKey_(slotSheet, oldSlotKey, CONFIG.STATUS.SLOT_EMPTY);
    }

    if (payload.newStatus === CONFIG.STATUS.BOOKING_RESCHEDULED) {
      requireField_(payload.newSlotKey, 'newSlotKey');
      setSlotStatusByKey_(slotSheet, oldSlotKey, CONFIG.STATUS.SLOT_EMPTY);
      var target = setSlotStatusByKey_(slotSheet, payload.newSlotKey, CONFIG.STATUS.SLOT_BOOKED, true);
      bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Ngay book') + 1).setValue(target.date);
      bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Gio bat dau') + 1).setValue(target.start);
      bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Gio ket thuc') + 1).setValue(target.end);
    }

    bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Trang thai') + 1).setValue(payload.newStatus);
    bookingSheet.getRange(booking._rowIndex, HEADERS.BOOKINGS.indexOf('Updated at') + 1).setValue(nowIso_());

    var reloaded = getRowsAsObjects_(bookingSheet).find(function(b) {
      return String(b['Ma Booking']) === String(payload.bookingCode);
    });

    if (oldStatus !== payload.newStatus) {
      sendStatusChangedEmail_(reloaded, oldStatus, payload.note || '');
    }

    return {
      success: true
    };
  } finally {
    lock.releaseLock();
  }
}

function setSlotStatusByKey_(slotSheet, key, newStatus, enforceEmptyBeforeBook) {
  var rows = getRowsAsObjects_(slotSheet);
  var row = rows.find(function(s) {
    return slotKey_(normalizeDate_(s['Ngay']), normalizeTime_(s['Gio bat dau']), normalizeTime_(s['Gio ket thuc'])) === key;
  });

  if (!row) throw new Error('Slot key not found: ' + key);
  if (enforceEmptyBeforeBook && row['Trang thai'] !== CONFIG.STATUS.SLOT_EMPTY) {
    throw new Error('Slot khÃ´ng há»£p lá»‡.');
  }

  slotSheet.getRange(row._rowIndex, 4).setValue(newStatus);
  return {
    date: normalizeDate_(row['Ngay']),
    start: normalizeTime_(row['Gio bat dau']),
    end: normalizeTime_(row['Gio ket thuc'])
  };
}

function processPendingTimeouts() {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var bookingSheet = ss.getSheetByName(CONFIG.SHEETS.BOOKINGS);
    var slotSheet = ss.getSheetByName(CONFIG.SHEETS.SLOTS);
    if (!bookingSheet || !slotSheet) return;

    var now = new Date();
    var rows = getRowsAsObjects_(bookingSheet);

    rows.forEach(function(booking) {
      if (booking['Trang thai'] !== CONFIG.STATUS.BOOKING_PENDING) return;

      var deadline = booking['Han thanh toan'];
      var deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
      if (!(deadlineDate instanceof Date) || isNaN(deadlineDate.getTime())) return;
      if (deadlineDate > now) return;

      var oldSlotKey = slotKey_(
        normalizeDate_(booking['Ngay book']),
        normalizeTime_(booking['Gio bat dau']),
        normalizeTime_(booking['Gio ket thuc'])
      );

      try {
        setSlotStatusByKey_(slotSheet, oldSlotKey, CONFIG.STATUS.SLOT_EMPTY);
      } catch (slotErr) {
        Logger.log('Warning: could not release slot ' + oldSlotKey + ' - ' + slotErr.message);
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
    throw new Error('Admin PIN chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh. Cháº¡y setAdminPin("your-pin") trong Apps Script editor.');
  }
}

function setAdminPin(pin) {
  requireField_(pin, 'pin');
  var clean = String(pin).trim();
  if (clean.length < 6) {
    throw new Error('PIN pháº£i tá»‘i thiá»ƒu 6 kÃ½ tá»±.');
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
    throw new Error('PhiÃªn admin háº¿t háº¡n hoáº·c khÃ´ng há»£p lá»‡. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.');
  }
}
function getAdminSnapshot(payload) {
  requireAdminSession_(payload && payload.adminToken);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var bookingSheet = ss.getSheetByName(CONFIG.SHEETS.BOOKINGS);
  var slotSheet = ss.getSheetByName(CONFIG.SHEETS.SLOTS);

  var bookings = bookingSheet ? getRowsAsObjects_(bookingSheet).map(function(b) {
    var date = normalizeDate_(b['Ngay book']);
    var start = normalizeTime_(b['Gio bat dau']);
    var end = normalizeTime_(b['Gio ket thuc']);
    return {
      bookingCode: b['Ma Booking'],
      fullName: b['Ten Querent'],
      phone: b['Zalo/SDT'],
      email: b['Email'],
      comboName: b['Ten Combo'],
      status: b['Trang thai'],
      billUrl: b['Link anh Bill'],
      issueSummary: b['Mo ta van de'],
      paymentDeadline: b['Han thanh toan'],
      date: date,
      start: start,
      end: end,
      slotKey: slotKey_(date, start, end)
    };
  }) : [];

  var slots = slotSheet ? getRowsAsObjects_(slotSheet).map(function(s) {
    var date = normalizeDate_(s['Ngay']);
    var start = normalizeTime_(s['Gio bat dau']);
    var end = normalizeTime_(s['Gio ket thuc']);
    return {
      date: date,
      start: start,
      end: end,
      status: s['Trang thai'],
      slotKey: slotKey_(date, start, end)
    };
  }) : [];

  slots.sort(function(a, b) {
    return parseDateTime_(a.date, a.start) - parseDateTime_(b.date, b.start);
  });

  bookings.sort(function(a, b) {
    return String(b.bookingCode || '').localeCompare(String(a.bookingCode || ''));
  });

  return {
    bookings: bookings,
    slots: slots,
    status: CONFIG.STATUS
  };
}

function adminSetSlotStatus(payload) {
  requireAdminSession_(payload && payload.adminToken);
  requireField_(payload.slotKey, 'slotKey');
  requireField_(payload.newStatus, 'newStatus');

  if ([CONFIG.STATUS.SLOT_EMPTY, CONFIG.STATUS.SLOT_BLOCKED].indexOf(payload.newStatus) === -1) {
    throw new Error('Admin chá»‰ cÃ³ thá»ƒ chuyá»ƒn slot giá»¯a Trá»‘ng vÃ  Block kháº©n cáº¥p.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var slotSheet = ss.getSheetByName(CONFIG.SHEETS.SLOTS);
    if (!slotSheet) throw new Error('Slot sheet not found.');

    var rows = getRowsAsObjects_(slotSheet);
    var row = rows.find(function(s) {
      return slotKey_(normalizeDate_(s['Ngay']), normalizeTime_(s['Gio bat dau']), normalizeTime_(s['Gio ket thuc'])) === payload.slotKey;
    });
    if (!row) throw new Error('Slot not found.');

    if (row['Trang thai'] === CONFIG.STATUS.SLOT_BOOKED && payload.newStatus === CONFIG.STATUS.SLOT_BLOCKED) {
      throw new Error('KhÃ´ng thá»ƒ block slot Ä‘ang Äa Book. HÃ£y xá»­ lÃ½ booking trÆ°á»›c.');
    }

    slotSheet.getRange(row._rowIndex, 4).setValue(payload.newStatus);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}
function installTriggers() {
  var all = ScriptApp.getProjectTriggers();
  all.forEach(function(t) {
    if (t.getHandlerFunction() === 'processPendingTimeouts') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('processPendingTimeouts')
    .timeBased()
    .everyMinutes(CONFIG.TIME_DRIVEN_MINUTES)
    .create();
}












