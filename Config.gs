var CONFIG = {
  SHEETS: {
    SERVICES: 'Dich_Vu',
    BOOKINGS: 'Don_Booking'
  },
  CALENDAR: {
    ID: 'd7babe3f7bececb215d7d56f59376312cff10e40a99a82ce7ece241bac0aa0cb@group.calendar.google.com',
    AVAILABLE_TITLE: 'Nhận khách',
    LOOK_AHEAD_DAYS: 30
  },
  STATUS: {
    BOOKING_PENDING: 'Pending',
    BOOKING_CONFIRMED: 'Confirmed',
    BOOKING_CANCELLED: 'Cancelled',
    BOOKING_RESCHEDULED: 'Rescheduled'
  },
  PAYMENT_TIMEOUT_MINUTES: 30,
  TIME_DRIVEN_MINUTES: 15,
  DRIVE_FOLDER_ID: '1E7-qWFH1LcBKaPKK_qkD-DBlwIkQ6zCC',
  SECURITY: {
    ADMIN_PIN_PROPERTY_KEY: 'ADMIN_PIN_HASH',
    ADMIN_SESSION_MINUTES: 480
  },
  UPLOAD: {
    MAX_BILL_SIZE_MB: 8,
    ALLOWED_BILL_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  },
  BANK: {
    accountName: 'MEO TIEN TRI LAP LANH CO HOA',
    accountNumber: '0000000000',
    bankName: 'Vietcombank',
    qrImageUrl: 'https://placehold.co/360x360?text=Bank+QR'
  }
};

var HEADERS = {
  SERVICES: [
    'ID Combo',
    'Phan loai',
    'Ten Combo',
    'Gia VND',
    'Gia USD',
    'Noi dung chi tiet'
  ],
  BOOKINGS: [
    'Ma Booking',
    'Ten Querent',
    'Zalo/SDT',
    'Email',
    'Insta/Facebook',
    'DOB',
    'Combo ID',
    'Ten Combo',
    'Ngay book',
    'Gio bat dau',
    'Gio ket thuc',
    'Trang thai',
    'Link anh Bill',
    'Mo ta van de',
    'Han thanh toan',
    'Calendar Event ID',
    'Created at',
    'Updated at'
  ]
};
