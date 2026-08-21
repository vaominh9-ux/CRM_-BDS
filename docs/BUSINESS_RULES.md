# Quy tắc nghiệp vụ bất biến

Tài liệu này mô tả hành vi phải giữ đồng nhất giữa database, Supabase backend, JSON fallback và giao diện.

## Tiền tệ và thời gian

- Giá trị lưu trữ chuẩn là **VNĐ nguyên** (`bigint` trong PostgreSQL). Không lưu chuỗi `triệu`/`tỷ` vào cột tiền.
- Chỉ formatter giao diện mới rút gọn thành triệu/tỷ. Phép tính luôn dùng số VNĐ đầy đủ.
- Locale hiển thị: `vi-VN`. Múi giờ nghiệp vụ: `Asia/Ho_Chi_Minh`.
- Ngày “hôm nay” và KPI theo tháng phải được suy ra theo múi giờ Việt Nam, không theo UTC của máy chủ.

## Giao dịch

- `commission_amount_vnd = round(deal_amount_vnd * commission_pct / 100)`.
- `agent_share_amount_vnd = round(commission_amount_vnd * agent_share_pct / 100)`.
- `paid_vnd = tổng deal_payments.amount_vnd`.
- `balance_vnd = max(deal_amount_vnd - paid_vnd, 0)`.
- Database chặn thanh toán vượt số dư và khóa bản ghi khi ghi thanh toán qua RPC `record_deal_payment`.
- Chỉ các giao dịch `Token` hoặc `Agreement` đóng góp vào KPI “Số tiền còn lại”.
- Một bất động sản chỉ có một giao dịch đang mở (`Token`/`Agreement`) tại một thời điểm.
- Doanh số và hoa hồng tháng chỉ tính giao dịch `Completed` có `closed_at` trong tháng Việt Nam đang chọn.

## Hợp đồng thuê

- Một bất động sản chỉ có một tenancy `Active`.
- Mỗi tenancy chỉ có một khoản thu cho một `rent_month`; điều chỉnh phải có quy trình riêng, không chèn trùng.
- `collected_vnd` là tổng tiền thuê đã ghi nhận.
- Số tháng đến hạn tính từ ngày bắt đầu đến hiện tại, cộng tháng hiện tại khi đã đến `rent_due_day`.
- `expected_vnd = monthly_rent_vnd * số tháng đến hạn` đối với tenancy đang hoạt động.
- `arrears_vnd = max(expected_vnd - collected_vnd, 0)`.
- Hợp đồng đã kết thúc không tiếp tục phát sinh kỳ vọng tiền thuê.
- `refund_vnd = deposit_vnd - deductions_vnd`; các khoản không được âm.

## Trạng thái chuẩn

| Thực thể | Giá trị lưu trữ |
|---|---|
| Property | `Draft`, `Available`, `Reserved`, `Sold`, `Rented`, `Withdrawn` |
| Listing type | `Sale`, `Rent` |
| Lead | `New`, `Contacted`, `Qualified`, `Viewing Scheduled`, `Negotiating`, `Won`, `Lost` |
| Lead interest | `Buy`, `Rent`, `Sell`, `Rent Out` |
| Follow-up | `Pending`, `Completed`, `Cancelled` |
| Appointment | `Scheduled`, `Confirmed`, `Completed`, `Cancelled`, `No Show` |
| Deal | `Token`, `Agreement`, `Completed`, `Cancelled` |
| Tenancy | `Active`, `Ended` |

Nhãn tiếng Việt chỉ là bản dịch hiển thị; không đổi giá trị lưu trữ nếu chưa có migration và mapping tương thích.

## Lịch hẹn

- Lịch sắp tới chỉ gồm `Scheduled`/`Confirmed` có `scheduled_at >= thời điểm hiện tại`.
- Lịch hôm nay dùng ngày theo múi giờ Việt Nam.
- Không tự tạo ID client trùng ID database. Khi thêm mới, để database sinh ID và dùng bản ghi trả về.

## Phân quyền và phạm vi dữ liệu

- Admin có toàn quyền và ma trận quyền của Admin bị khóa.
- Manager xem dữ liệu toàn đơn vị theo RLS/quyền trang.
- Agent chỉ xem/sửa bản ghi được phân công, trừ dữ liệu công khai/lookup được policy cho phép.
- Giao diện ẩn nút chỉ là UX; database RLS và backend vẫn phải cưỡng chế quyền.
- Xóa nghiệp vụ là soft-delete (`deleted_at`) trừ dữ liệu cấu hình có quy trình riêng.

## KPI dashboard

Mọi thay đổi KPI phải cập nhật đồng thời `supabase-backend.js`, fallback tương ứng và `scripts/verify-business-logic.mjs`. Không tính từ mảng chưa lọc `deleted_at`; không trộn dữ liệu của agent khác vào phạm vi Agent.
