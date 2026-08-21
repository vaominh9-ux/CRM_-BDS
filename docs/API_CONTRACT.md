# Hợp đồng API và mức độ chuyển đổi

## Hợp đồng chung

Giao diện gọi `gsRun(method, ...args)`. Trên localhost, bridge chuyển thành:

```http
POST /api/run/{method}
Authorization: Bearer <access-token>
Content-Type: application/json

{ "args": [] }
```

Response giữ một envelope duy nhất:

```json
{ "success": true, "data": {}, "message": "..." }
```

Lỗi nghiệp vụ trả `success: false`; lỗi HTTP/không mong đợi phải được gateway chuyển thành thông báo an toàn. Không truyền service-role key xuống trình duyệt.

## Phạm vi Supabase hiện tại

Đã có đọc dữ liệu chính cho dashboard, thông báo, bất động sản, lead, chăm sóc, lịch hẹn, giao dịch, hợp đồng thuê, chủ sở hữu, khu vực, tiện ích, người dùng, nhật ký, lookup, cấu hình và RBAC.

Đã có mutation Supabase chính cho:

- Bất động sản và tải ảnh.
- Lead và phân công.
- Chăm sóc, lịch hẹn.
- Giao dịch, ghi thanh toán, đánh dấu trả hoa hồng.
- Chủ sở hữu, khu vực, tiện ích.
- Cài đặt cá nhân, cấu hình ứng dụng, RBAC.

## Khoảng trống cần xử lý

Một số lời gọi đang tồn tại trong UI nhưng dispatcher Supabase chưa có hoặc mới trả thông báo “đang được chuyển sang Supabase”, nổi bật:

- Nghiệp vụ tenancy: thu tiền, gia hạn, kết thúc, bảo trì.
- Hồ sơ/tài liệu bất động sản, chi phí, PDF/email.
- Chào giá lead, hoàn tất lịch, chuyển lead thành nguồn hàng.
- Quản lý user, chuyển giao công việc, trash/restore.
- AI, tạo hợp đồng và một số import hàng loạt.

Không được giả định một nút xuất hiện trên UI nghĩa là đã được Supabase hỗ trợ. Chạy `npm run audit:contract` để có danh sách literal method hiện tại. Các lời gọi động như `gsRun(backendFn, ...)` phải review thủ công.

## Quy tắc mở rộng

1. Thêm method ở Supabase trước và cưỡng chế quyền từ JWT/RLS.
2. Giữ mapper output tương thích với frontend và JSON fallback.
3. Nếu method chưa hỗ trợ, UI phải vô hiệu hóa có giải thích; không để người dùng nhập xong mới báo lỗi chung.
4. Thêm contract test cho success, permission denied, validation và not-found.
5. Cập nhật tài liệu này khi một nhóm method được hoàn tất.
