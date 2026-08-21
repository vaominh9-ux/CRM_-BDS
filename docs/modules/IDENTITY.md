# Phân hệ danh tính, phân quyền và cài đặt

## Phạm vi

Supabase Auth, `profiles`, role/permission, quản lý người dùng, tài khoản cá nhân, theme và nhận diện công ty.

## API chính

`authenticateUser`, `refreshAuthSession`, `getAllUsers`, `addUser`, `updateUser`, `deleteUser`, `updateMyAccount`, `reassignAgentWork`, `bulkImportUsers`, `get/toggleRbac`, user settings và agency branding.

## Bất biến bảo mật

- Danh tính Supabase lấy từ JWT; không tin username do client gửi.
- Service-role chỉ ở server/env; không trả về HTML hoặc log.
- Admin matrix bị khóa; ẩn nút ở UI không thay thế RLS.
- Không xóa user khi còn công việc chưa chuyển giao.
- Thương hiệu công ty nằm trong `app_settings.setting_value.branding`; avatar cá nhân nằm trong `profiles.profile_image`.
- API lưu branding phải merge cấu hình, không ghi đè locale/currency/commission.

## Vấn đề cần xử lý

1. Cần test lifecycle user giữa `auth.users` và `profiles` khi một bước thất bại.
2. `setAppConfig` tổng quát có nguy cơ ghi đè nhánh cấu hình nếu payload không đầy đủ.
3. Tải avatar/logo cần giới hạn MIME, dung lượng và policy bucket.
4. Import user cần báo lỗi theo dòng và idempotency.
5. Quyền trang V/A/E/D cần contract test bằng tài khoản thật của từng role.

## Hướng cải thiện

- Tách API cấu hình theo mục: branding, money defaults, AI, theme default.
- Dùng RPC/Edge Function cho thao tác Auth + profile cần tính nguyên tử.
- Thêm bảng/job theo dõi import và chuyển giao công việc.
- Thêm test Admin/Manager/Agent cho từng page key.

## Kiểm thử tối thiểu

- Tạo, khóa, cập nhật, chuyển giao và xóa user.
- Agent không nâng quyền qua request thủ công.
- Lưu branding không làm mất cấu hình tài chính.
- Đăng xuất/xóa session và refresh token đúng.
- Logo/tên từ Supabase hiển thị đồng nhất ở login, portal, sidebar và tài liệu.

