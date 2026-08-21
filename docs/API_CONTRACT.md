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
- Hoàn tất lịch xem và lưu phản hồi/mức độ quan tâm.
- Giao dịch, ghi thanh toán, đánh dấu trả hoa hồng.
- Hợp đồng thuê: thu tiền theo tháng, gia hạn, kết thúc/hoàn cọc và bảo trì.
- Chủ sở hữu, khu vực, tiện ích.
- Cài đặt cá nhân, cấu hình ứng dụng, RBAC.

## Khoảng trống cần xử lý

Kết quả audit ngày 2026-08-22: UI có 65 method literal, Supabase đã triển khai 52 và còn 13 method. Các khoảng trống hiện tại:

- Hồ sơ/tài liệu bất động sản, chi phí, chống trùng và email bộ hồ sơ.
- Chào giá lead và chuyển lead thành nguồn hàng.
- Khôi phục bản ghi từ thùng rác.
- AI và tạo/xuất hợp đồng.

Danh sách method và hướng xử lý chi tiết nằm trong `docs/modules/PENDING_CAPABILITIES.md`.

Không được giả định một nút xuất hiện trên UI nghĩa là đã được Supabase hỗ trợ. Chạy `npm run audit:contract` để có danh sách literal method hiện tại. Các lời gọi động như `gsRun(backendFn, ...)` phải review thủ công.

## Quy tắc mở rộng

1. Thêm method ở Supabase trước và cưỡng chế quyền từ JWT/RLS.
2. Giữ mapper output tương thích với frontend và JSON fallback.
3. Nếu method chưa hỗ trợ, UI phải vô hiệu hóa có giải thích; không để người dùng nhập xong mới báo lỗi chung.
4. Thêm contract test cho success, permission denied, validation và not-found.
5. Cập nhật tài liệu này khi một nhóm method được hoàn tất.
