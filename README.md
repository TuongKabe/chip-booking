# Tarot Booking Web App (Google Apps Script)

## 1) Kien truc
- Frontend booking: `Index.html` + `Styles.html` + `ClientScript.html`
- Frontend admin: `Admin.html` + `AdminScript.html`
- Backend: `Backend.gs`, `Mailer.gs`, `Utilities.gs`, `Config.gs`, `Admin.gs`
- Manifest: `appsscript.json`
- Database (Google Sheets): `Dich_Vu`, `Khung_Gio`, `Don_Booking`

## 2) Mapping yeu cau
- Chon combo (8 combo No.18-No.25): `getServices()` + `seedDefaultServices()`
- Hien thi slot trong: `getAvailableSlots()`
- Tao booking Pending + timeout 30p: `createPendingBooking()`
- Upload bill len Drive + validate mime/size/trang thai: `uploadBillImage()`
- Xac nhan/huy/doi lich thu cong: `updateBookingStatus()`
- Tu dong xa slot qua han: `processPendingTimeouts()` + trigger 15 phut
- Gui email pending/xac nhan/huy/doi lich: `sendPendingEmail_()`, `sendStatusChangedEmail_()`
- Bao mat admin bang PIN + session token: `setAdminPin()`, `adminLogin()`, `requireAdminSession_()`

## 3) Cai dat nhanh
1. Tao Google Spreadsheet moi.
2. Mo Extensions > Apps Script, copy toan bo file trong thu muc nay vao project.
3. Chinh `Config.gs`:
   - `DRIVE_FOLDER_ID`
   - thong tin `BANK`
   - neu can: `UPLOAD.MAX_BILL_SIZE_MB`, `UPLOAD.ALLOWED_BILL_MIME_TYPES`
4. Chay ham `setAdminPin('YOUR_SECURE_PIN')` mot lan (bat buoc truoc khi dung admin dashboard).
5. Chay ham `setupWorkbook()` mot lan.
6. Chay ham `seedDefaultServices()` mot lan.
7. Dien du lieu `Khung_Gio` theo cot:
   - `Ngay` (`yyyy-MM-dd`)
   - `Gio bat dau` (`HH:mm`)
   - `Gio ket thuc` (`HH:mm`)
   - `Trang thai` = `Trong`
8. Chay ham `installTriggers()` de tao job timeout.
9. Deploy > New deployment > Web app:
   - Execute as: Me
   - Who has access: Anyone with link

## 4) Admin Dashboard web
- Trang booking: `WEB_APP_URL`
- Trang admin: `WEB_APP_URL?page=admin`
- Quy trinh:
  - Dang nhap bang PIN admin
  - He thong cap session token tam thoi
  - Moi API admin deu yeu cau token hop le
- Chuc nang:
  - Tai lai snapshot booking/slot
  - Confirm / Cancel booking
  - Reschedule booking sang slot `Trong`
  - Block / Unblock slot khan cap
- Quy tac block:
  - Slot `Da Book` khong block truc tiep (can xu ly booking truoc)

## 5) Luu y van hanh
- Status slot: `Trong`, `Da Book`, `Block khan cap`
- Status booking: `Pending`, `Confirmed`, `Cancelled`, `Rescheduled`
- Upload bill chi nhan file image hop le theo config va trong gioi han dung luong.
- Upload bill chi duoc phep khi booking dang `Pending` va chua qua han thanh toan.
