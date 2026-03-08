/**
 * Calendar.gs — Google Calendar helpers for Tarot Booking
 * Đọc/ghi event từ Google Calendar thay vì sheet Khung_Gio
 */

function getBookingCalendar_() {
  var cal = CalendarApp.getCalendarById(CONFIG.CALENDAR.ID);
  if (!cal) {
    throw new Error('Không tìm thấy Calendar. Kiểm tra CALENDAR.ID trong Config.gs và quyền truy cập.');
  }
  return cal;
}

/**
 * Lấy danh sách slot trống từ Calendar.
 * Tìm event có title = CONFIG.CALENDAR.AVAILABLE_TITLE trong X ngày tới.
 */
function getAvailableSlotsFromCalendar_() {
  var cal = getBookingCalendar_();
  var now = new Date();
  var startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var endDate = new Date(startDate.getTime() + CONFIG.CALENDAR.LOOK_AHEAD_DAYS * 24 * 60 * 60 * 1000);

  var events = cal.getEvents(startDate, endDate);
  var availableTitle = CONFIG.CALENDAR.AVAILABLE_TITLE;
  var slots = [];

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    if (ev.getTitle() !== availableTitle) continue;

    var evStart = ev.getStartTime();
    var evEnd = ev.getEndTime();

    // Chỉ hiện slot từ hiện tại trở đi
    if (evEnd <= now) continue;

    slots.push({
      date: normalizeDate_(evStart),
      start: normalizeTime_(evStart),
      end: normalizeTime_(evEnd),
      slotKey: slotKey_(normalizeDate_(evStart), normalizeTime_(evStart), normalizeTime_(evEnd)),
      eventId: ev.getId()
    });
  }

  slots.sort(function(a, b) {
    return parseDateTime_(a.date, a.start) - parseDateTime_(b.date, b.start);
  });

  return slots;
}

/**
 * Tìm event "Nhận khách" theo date + start + end (chính xác)
 */
function findAvailableEvent_(date, start, end) {
  var cal = getBookingCalendar_();
  var dt = parseDateTime_(date, start);
  var dtEnd = parseDateTime_(date, end);

  var events = cal.getEvents(dt, dtEnd);
  for (var i = 0; i < events.length; i++) {
    if (events[i].getTitle() === CONFIG.CALENDAR.AVAILABLE_TITLE &&
        events[i].getStartTime().getTime() === dt.getTime() &&
        events[i].getEndTime().getTime() === dtEnd.getTime()) {
      return events[i];
    }
  }
  return null;
}

/**
 * Xoá event "Nhận khách" khi slot bị book
 */
function removeAvailableEvent_(date, start, end) {
  var ev = findAvailableEvent_(date, start, end);
  if (ev) {
    ev.deleteEvent();
  }
}

/**
 * Tạo lại event "Nhận khách" khi booking bị cancel
 */
function restoreAvailableEvent_(date, start, end) {
  var cal = getBookingCalendar_();
  var dtStart = parseDateTime_(date, start);
  var dtEnd = parseDateTime_(date, end);

  // Kiểm tra đã có event "Nhận khách" chưa (tránh duplicate)
  var existing = findAvailableEvent_(date, start, end);
  if (existing) return;

  cal.createEvent(CONFIG.CALENDAR.AVAILABLE_TITLE, dtStart, dtEnd);
}

/**
 * Tạo event booking trên Calendar (🔮 Tarot - Tên (Mã))
 */
function createBookingEvent_(bookingObj) {
  var cal = getBookingCalendar_();
  var date = bookingObj['Ngay book'];
  var start = bookingObj['Gio bat dau'];
  var end = bookingObj['Gio ket thuc'];

  var dtStart = parseDateTime_(date, start);
  var dtEnd = parseDateTime_(date, end);

  var title = '🔮 Tarot - ' + bookingObj['Ten Querent'] + ' (' + bookingObj['Ma Booking'] + ')';
  var description = [
    'Mã booking: ' + bookingObj['Ma Booking'],
    'Combo: ' + bookingObj['Ten Combo'],
    'SĐT: ' + bookingObj['Zalo/SDT'],
    'Email: ' + bookingObj['Email'],
    bookingObj['Insta/Facebook'] ? 'Social: ' + bookingObj['Insta/Facebook'] : '',
    bookingObj['Mo ta van de'] ? 'Vấn đề: ' + bookingObj['Mo ta van de'] : ''
  ].filter(function(line) { return line !== ''; }).join('\n');

  var event = cal.createEvent(title, dtStart, dtEnd, { description: description });
  return event.getId();
}

/**
 * Xoá event booking khỏi Calendar (khi cancel)
 */
function removeBookingEvent_(eventId) {
  if (!eventId) return;
  try {
    var cal = getBookingCalendar_();
    var event = cal.getEventById(eventId);
    if (event) {
      event.deleteEvent();
    }
  } catch (e) {
    Logger.log('Warning: could not remove booking event ' + eventId + ' - ' + e.message);
  }
}

/**
 * Lấy tất cả event (cả booking lẫn available) cho admin dashboard
 */
function getAllCalendarSlotsForAdmin_() {
  var cal = getBookingCalendar_();
  var now = new Date();
  var startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var endDate = new Date(startDate.getTime() + CONFIG.CALENDAR.LOOK_AHEAD_DAYS * 24 * 60 * 60 * 1000);

  var events = cal.getEvents(startDate, endDate);
  var slots = [];

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    var evStart = ev.getStartTime();
    var evEnd = ev.getEndTime();
    var title = ev.getTitle();
    var isAvailable = (title === CONFIG.CALENDAR.AVAILABLE_TITLE);

    slots.push({
      date: normalizeDate_(evStart),
      start: normalizeTime_(evStart),
      end: normalizeTime_(evEnd),
      title: title,
      status: isAvailable ? 'Trống' : 'Đã book',
      eventId: ev.getId()
    });
  }

  slots.sort(function(a, b) {
    return parseDateTime_(a.date, a.start) - parseDateTime_(b.date, b.start);
  });

  return slots;
}
