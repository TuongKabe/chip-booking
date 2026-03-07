var CONFIG = {
  SHEETS: {
    SERVICES: 'Dich_Vu',
    SLOTS: 'Khung_Gio',
    BOOKINGS: 'Don_Booking'
  },
  STATUS: {
    SLOT_EMPTY: 'Trong',
    SLOT_BOOKED: 'Da Book',
    SLOT_BLOCKED: 'Block khan cap',
    BOOKING_PENDING: 'Pending',
    BOOKING_CONFIRMED: 'Confirmed',
    BOOKING_CANCELLED: 'Cancelled',
    BOOKING_RESCHEDULED: 'Rescheduled'
  },
  PAYMENT_TIMEOUT_MINUTES: 30,
  TIME_DRIVEN_MINUTES: 15,
  DRIVE_FOLDER_ID: 'REPLACE_WITH_DRIVE_FOLDER_ID',
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
  SLOTS: [
    'Ngay',
    'Gio bat dau',
    'Gio ket thuc',
    'Trang thai'
  ],
  BOOKINGS: [
    'Ma Booking',
    'Ten Querent',
    'Zalo/SDT',
    'Email',
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
    'Created at',
    'Updated at'
  ]
};
