# Phân hệ khách hàng và chăm sóc

## Phạm vi

Lead, phân công, pipeline, hồ sơ 360, chào giá, chăm sóc và chuyển đổi lead.

## Bảng chính

`leads`, `lead_offers`, `follow_ups`; liên kết tới `profiles`, `properties`, `appointments`, `deals`.

## UI và API chính

- UI: `LeadsView`, `LeadKanban`, `LeadModal`, `AssignLeadModal`, `Lead360Modal`, `FollowUpsView`.
- API đã có: CRUD lead, `assignLead`, CRUD follow-up, user reassignment.
- API còn thiếu: `addOffer`, `updateOffer`, `convertLeadToProperty`.

## Bất biến

- Trạng thái lưu trữ dùng enum tiếng Anh chuẩn; nhãn Việt chỉ ở UI.
- Agent chỉ xem lead được phân công; Manager/Admin xem theo phạm vi policy.
- Phân công phải dùng `profiles.id`, không lưu username làm khóa quan hệ.
- Lead 360 tổng hợp dữ liệu theo ID; không tạo bản sao thực thể.
- Chuyển đổi phải có idempotency để không sinh trùng property/deal.

## Vấn đề cần xử lý

1. Popup 360 đang gánh nhiều tab và logic cross-module.
2. Di chuyển Kanban có thể phát request liên tiếp; cần optimistic update có rollback.
3. Chào giá và chuyển lead thành property chưa có Supabase handler.
4. KPI “số ngày đang mở” cần cùng một định nghĩa timezone/status ở backend và UI.
5. Phân công hàng loạt cần log người cũ, người mới và số bản ghi theo từng bảng.

## Hướng cải thiện

- Tách `lead-summary`, `lead-timeline`, `lead-activity`, `lead-offers`.
- Viết state machine hợp lệ cho chuyển trạng thái thay vì select tự do.
- Dùng transaction/RPC cho chuyển đổi lead.
- Thêm kiểm tra trùng theo số điện thoại/email đã chuẩn hóa.

## Kiểm thử tối thiểu

- Agent không thấy lead ngoài phạm vi.
- Phân công cập nhật đồng bộ danh sách, Kanban, follow-up và dashboard.
- Lead Won/Lost ảnh hưởng đúng funnel.
- Follow-up overdue dùng giờ Việt Nam.
- Double-click mở đúng hồ sơ, không kích hoạt nút thao tác trong dòng.

