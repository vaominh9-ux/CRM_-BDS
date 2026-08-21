# Các khả năng chưa hoàn tất trên Supabase

Kết quả `npm run audit:contract` ngày 2026-08-22: UI có 65 method literal, Supabase đã triển khai 52, còn 13 method.

## Danh sách hiện tại

| Nhóm | Method | Hướng xử lý |
|---|---|---|
| Chào giá | `addOffer`, `updateOffer` | CRUD `lead_offers`, permission và audit |
| Chi phí BĐS | `addPropertyExpense` | Validate VNĐ, property scope, soft delete nếu cần |
| Tài liệu BĐS | `uploadPropertyDoc`, `removePropertyDoc` | Storage bucket riêng, MIME/size/RLS |
| Chống trùng | `getPropertyDuplicates` | Chuẩn hóa ref/address/phone, trả điểm tương đồng |
| Chuyển đổi lead | `convertLeadToProperty` | RPC transaction + idempotency |
| Bộ hồ sơ | `emailPropertyPack` | Job/email provider; không chạy đồng bộ lâu trong request |
| Hợp đồng | `buildAgreement`, `agreementPdf` | Template versioned, snapshot dữ liệu, PDF server-side |
| AI | `aiChat`, `setAiConfig` | Secret server-side, quota, audit và redaction |
| Thùng rác | `restoreRecord` | Whitelist bảng, permission, kiểm tra xung đột trước restore |

## Quy tắc trong thời gian chưa triển khai

- Nút chưa hỗ trợ phải disabled với giải thích trước khi người dùng nhập dữ liệu.
- Không fallback ghi JSON trên production khi Supabase method chưa có.
- Không dùng service-role để bỏ qua RLS chỉ nhằm làm nút hoạt động.
- Mỗi method mới cần success, validation, permission denied, not found và retry/idempotency test.
- Sau khi hoàn tất, cập nhật file này và `API_CONTRACT.md`, rồi chạy lại audit.

## Thứ tự đề xuất

1. `restoreRecord` và tài liệu/chi phí property vì UI quản trị đang phụ thuộc.
2. Chào giá và chuyển đổi lead.
3. Hợp đồng/PDF/email.
4. AI sau khi có chính sách dữ liệu, quota và secret.

