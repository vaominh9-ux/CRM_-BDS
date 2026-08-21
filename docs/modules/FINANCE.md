# Phân hệ tài chính

## Phạm vi

Giao dịch mua bán/cho thuê, thanh toán, hoa hồng, hợp đồng thuê, thu tiền thuê, gia hạn, bảo trì và hoàn cọc.

## Bảng và nguồn tính

`deals`, `deal_payments`, `tenancies`, `rent_payments`, `tenancy_renewals`, `maintenance_items`, `deposit_refunds`; view/RPC trong migration là nguồn tính chính.

## UI và API chính

- UI: `DealsView`, `DealModal`, `DealPaymentModal`, `TenanciesView`, `Tenancy360Modal`, các modal thu/gia hạn/kết thúc.
- API chính đã có: CRUD deal, `addDealPayment`, `markAgentPaid`, `collectRent`, `renewTenancy`, `endTenancy`, maintenance.
- Tài liệu hợp đồng còn thiếu: `buildAgreement`, `agreementPdf`.

## Bất biến

Toàn bộ công thức nằm trong `BUSINESS_RULES.md`. Các điểm quan trọng:

- Tiền là `bigint` VNĐ nguyên.
- Thanh toán deal dùng RPC khóa bản ghi và chặn vượt số dư.
- Một property chỉ có một deal mở và một tenancy active.
- Một tenancy chỉ có một khoản thu cho mỗi `rent_month`.
- KPI tháng dùng `closed_at` và timezone Việt Nam.
- Không PATCH trực tiếp số đã thu, số dư, hoa hồng hoặc công nợ từ UI.

## Rủi ro

1. Đây là phân hệ có hậu quả sai số cao nhất; không tách trước khi có test công thức.
2. Cạnh tranh ghi có thể gây thanh toán vượt nếu bỏ qua RPC.
3. Formatter “triệu/tỷ” không được dùng làm đầu vào tính toán.
4. Hủy/khôi phục giao dịch cần quy tắc đảo bút toán, không chỉ đổi status.
5. PDF hợp đồng chưa hoàn tất backend Supabase.

## Hướng cải thiện

- Tạo service tài chính chỉ gọi RPC; mapper đọc view đã tính.
- Thêm idempotency/reference duy nhất cho payment.
- Viết unit test bảng trường hợp biên và contract test song song với SQL.
- Tách tài liệu hợp đồng khỏi logic kế toán; template có version.

## Kiểm thử tối thiểu

- Thanh toán một phần/đủ/vượt số dư.
- Hai request thanh toán đồng thời.
- Hoa hồng và phần nhân viên làm tròn đúng.
- Công nợ thuê trước/sau ngày đến hạn và khi kết thúc hợp đồng.
- Agent chỉ thấy tài chính trong phạm vi được phép.

