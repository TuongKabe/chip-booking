function nowIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
}

function bookingCode_() {
  var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  var rand = Math.floor(Math.random() * 900 + 100);
  return 'BKG-' + ts + '-' + rand;
}

function slotKey_(dateStr, startStr, endStr) {
  return [dateStr, startStr, endStr].join('|');
}

function parseDateTime_(dateStr, timeStr) {
  return new Date(dateStr + 'T' + timeStr + ':00');
}

function getOrCreateSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (currentHeaders.join('|') !== headers.join('|')) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  sheet.setFrozenRows(1);
  return sheet;
}

function getRowsAsObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0];
  return values.slice(1).map(function(row, i) {
    var obj = { _rowIndex: i + 2 };
    headers.forEach(function(h, idx) {
      obj[h] = row[idx];
    });
    return obj;
  });
}

function mapRowFromHeaders_(headers, obj) {
  return headers.map(function(h) {
    return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : '';
  });
}

function requireField_(val, fieldName) {
  if (val === null || val === undefined || String(val).trim() === '') {
    throw new Error('Missing required field: ' + fieldName);
  }
}

function normalizeDate_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value || '').trim();
}

function normalizeTime_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(value || '').trim();
}
