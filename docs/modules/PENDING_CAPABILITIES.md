# Các khả năng trên Supabase (Đã hoàn tất 100%)

Kết quả `npm run audit:contract` ngày 2026-08-23: UI có 68 method literal, Supabase đã triển khai đầy đủ 68/68 method (missing: 0).

## Tình trạng triển khai

| Nhóm | Method | Trạng thái | Hướng xử lý đã triển khai |
|---|---|---|---|
| Chào giá | `addOffer`, `updateOffer` | ✅ Hoàn tất | CRUD `lead_offers`, auto-reject open offers on accept, permission & audit |
| Chi phí BĐS | `addPropertyExpense` | ✅ Hoàn tất | Validate VNĐ, permission check, lưu bảng `property_expenses` |
| Tài liệu BĐS | `uploadPropertyDoc`, `removePropertyDoc` | ✅ Hoàn tất | Lưu Supabase Storage bucket, metadata vào `property_documents` |
| Chống trùng | `getPropertyDuplicates` | ✅ Hoàn tất | Chuẩn hóa SĐT chủ nhà, địa chỉ, tiêu đề, tính điểm trùng lặp |
| Chuyển đổi lead | `convertLeadToProperty` | ✅ Hoàn tất | Kiểm tra nhu cầu Bán/Cho thuê, tìm/tạo chủ nhà và trả về prefill |
| Bộ hồ sơ | `emailPropertyPack` | ✅ Hoàn tất | Tiếp nhận và xếp hàng gửi gói tài liệu bất động sản |
| Hợp đồng | `buildAgreement`, `agreementPdf`, `saveContractTemplate`, `getContractTemplates`, `resetContractTemplates` | ✅ Hoàn tất | Template engine, snapshot dữ liệu và xuất PDF |
| AI | `aiChat`, `setAiConfig` | ✅ Hoàn tất | Cấu hình trong `app_settings` và endpoint xử lý |
| Thùng rác | `restoreRecord` | ✅ Hoàn tất | Whitelist bảng, permission, kiểm tra xung đột trước restore |

