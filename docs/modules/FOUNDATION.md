# Phân hệ nền tảng và UI dùng chung

## Phạm vi

Bao gồm khởi động server, adapter Vercel, cầu nối `google.script.run`, session, shell, sidebar, header, theme, modal, bảng và formatter dùng chung.

## Nguồn mã

- `server.js`: phục vụ HTML và `/api/run/:method`.
- `api/index.js`: adapter serverless Vercel.
- `supabase-backend.js`: backend chính khi đủ biến môi trường.
- `local-backend.js`: fallback JSON.
- `code-appscript/index.html`: React/Babel, CSS và bridge trình duyệt.

## Luồng bắt buộc

`Component -> gsRun -> POST /api/run/:method -> JWT/profile/RLS -> service -> envelope`.

Không gọi service-role hoặc REST quản trị trực tiếp từ component. Public portal chỉ được dùng các method công khai đã lọc trường nhạy cảm.

## Vấn đề hiện tại

- UI, CSS và state nằm trong một tệp; selector toàn cục dễ ảnh hưởng chéo.
- Dispatcher dùng chuỗi và chưa validate schema request/response.
- `google.script.run` compatibility layer làm khó typing và test.
- Overlay, modal, DataTable và popup đã được sửa nhiều lần nhưng chưa thành primitive có test.
- Supabase, JSON và Apps Script là ba hiện thực có nguy cơ lệch.

## Hướng cải thiện

1. Tạo registry API có metadata: auth, permission, validator, handler.
2. Tạo `ApiError { code, message, details?, requestId }` dùng chung.
3. Tách `Modal`, `DataTableShell`, `StatusBadge`, `MoneyText`, `DateText`, `FormField`.
4. Session chỉ lưu access/refresh token cần thiết; refresh tập trung một nơi.
5. Chuẩn hóa loading/error/empty state; không tự viết lại ở từng view.
6. Giữ `APP_LOGO` chỉ là placeholder trung tính; thương hiệu thật luôn đọc từ `app_settings.branding`.

## Kiểm thử tối thiểu

- Không có Supabase env: server chạy fallback có cảnh báo rõ.
- Có Supabase env: không ghi file JSON trên Vercel.
- Token hết hạn: refresh hoặc chuyển về đăng nhập, không lặp request vô hạn.
- Modal đóng bằng nút, Escape và backdrop; không đóng khi click nội dung.
- Sidebar/mobile/table không tràn ở chiều rộng phổ biến.

