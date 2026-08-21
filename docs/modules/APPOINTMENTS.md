# Phân hệ lịch hẹn

## Phạm vi

Đặt lịch xem, danh sách, lịch tháng, lịch sắp tới, xác nhận, hoàn thành, phản hồi và không đến.

## Bảng và UI

- Bảng: `appointments`, liên kết `leads`, `properties`, `profiles`.
- UI: `AppointmentsView`, `CalendarGrid`, `FeedbackModal`, các tab lịch trong popup 360 và dashboard.

## Bất biến

- ID do database sinh; client không tự tái sử dụng ID cũ.
- Lịch sắp tới chỉ gồm `Scheduled`/`Confirmed` và `scheduled_at >= now`.
- “Hôm nay” tính theo `Asia/Ho_Chi_Minh`.
- Hoàn thành lịch có thể ghi `interest_level` và `feedback`, không tự tạo deal nếu người dùng chưa xác nhận.
- Xóa là soft delete; bản ghi đã xóa không xuất hiện ở lịch hoặc KPI.

## Vấn đề cần xử lý

1. List và calendar từng có nguy cơ dùng hai bộ filter khác nhau.
2. Cần constraint/idempotency rõ cho thao tác gửi lặp.
3. Chưa có kiểm tra xung đột lịch theo agent và khoảng thời gian.
4. Dashboard, list và calendar phải dùng cùng query/mapping trạng thái.
5. Cần quy tắc khi đổi timezone hoặc lịch kéo dài qua ngày.

## Hướng cải thiện

- Tạo một selector/query chuẩn rồi biến đổi cho list, calendar, dashboard.
- Thêm RPC `create_appointment` với idempotency key và kiểm tra xung đột.
- Chuẩn hóa khoảng lọc: hôm nay, tuần này, tháng này, tất cả.
- Tách calendar renderer khỏi mutation logic.

## Kiểm thử tối thiểu

- Thêm một lịch chỉ sinh một bản ghi dù người dùng bấm hai lần.
- Cùng dữ liệu xuất hiện nhất quán ở list và calendar.
- Lịch tương lai xuất hiện dashboard; lịch quá khứ/đã hủy không xuất hiện.
- Agent không sửa lịch của người khác.
- Mốc 00:00/23:59 theo giờ Việt Nam hoạt động đúng.

