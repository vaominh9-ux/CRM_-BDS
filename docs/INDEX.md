# Bản đồ tài liệu dự án

Đây là điểm bắt đầu cho người phát triển và agent mới. Đọc theo thứ tự dưới đây trước khi sửa mã.

## Tài liệu nền

1. [`../AGENTS.md`](../AGENTS.md): nguyên tắc bắt buộc và nguồn sự thật.
2. [`ARCHITECTURE.md`](ARCHITECTURE.md): bối cảnh chạy, các lớp và luồng request.
3. [`BUSINESS_RULES.md`](BUSINESS_RULES.md): công thức tiền, trạng thái và phân quyền bất biến.
4. [`DATA_MODEL.md`](DATA_MODEL.md): quan hệ bảng và quy ước dữ liệu.
5. [`API_CONTRACT.md`](API_CONTRACT.md): hợp đồng `gsRun` và mức độ chuyển đổi Supabase.
6. [`DEVELOPMENT.md`](DEVELOPMENT.md): quy trình phát triển, migration và kiểm tra.
7. [`CODE_REVIEW_AND_ROADMAP.md`](CODE_REVIEW_AND_ROADMAP.md): đánh giá hiện trạng và lộ trình ưu tiên.
8. [`HTML_MODULARIZATION_GUIDE.md`](HTML_MODULARIZATION_GUIDE.md): hướng dẫn chi tiết tách monolith `index.html` an toàn.
9. [`RESPONSIVE_UI_GUIDE.md`](RESPONSIVE_UI_GUIDE.md): nguyên tắc tối ưu mobile/desktop độc lập trên cùng giao diện.

## Ghi chú theo phân hệ

| Phân hệ | Tài liệu | Mã chính |
|---|---|---|
| Nền tảng, gateway, UI dùng chung | [`modules/FOUNDATION.md`](modules/FOUNDATION.md) | `server.js`, `api/index.js`, phần shell trong `index.html` |
| Bất động sản, chủ sở hữu, khu vực, tiện ích | [`modules/PROPERTIES.md`](modules/PROPERTIES.md) | `PropertiesView`, `OwnersView`, `LocationsView`, `AmenitiesView` |
| Khách hàng tiềm năng và chăm sóc | [`modules/CRM.md`](modules/CRM.md) | `LeadsView`, `Lead360Modal`, `FollowUpsView` |
| Lịch hẹn | [`modules/APPOINTMENTS.md`](modules/APPOINTMENTS.md) | `AppointmentsView`, `CalendarGrid`, dashboard |
| Giao dịch và hợp đồng thuê | [`modules/FINANCE.md`](modules/FINANCE.md) | `DealsView`, `TenanciesView`, RPC tài chính |
| Người dùng, xác thực, phân quyền, cài đặt | [`modules/IDENTITY.md`](modules/IDENTITY.md) | `UsersView`, `PermissionsMatrixView`, `SettingsView` |
| Dashboard, báo cáo, nhật ký | [`modules/REPORTING_AUDIT.md`](modules/REPORTING_AUDIT.md) | `DashboardView`, `ReportsView`, `LogsView` |
| Tài liệu, AI và tính năng chưa hoàn tất | [`modules/PENDING_CAPABILITIES.md`](modules/PENDING_CAPABILITIES.md) | 13 method còn thiếu trong Supabase |

## Quy tắc cập nhật tài liệu

- Đổi công thức hoặc trạng thái: cập nhật `BUSINESS_RULES.md` và tài liệu phân hệ trong cùng commit.
- Đổi schema: tạo migration mới, cập nhật `DATA_MODEL.md` và phân hệ liên quan.
- Thêm/xóa API: cập nhật `API_CONTRACT.md`, chạy `npm run audit:contract`.
- Tách component khỏi monolith: cập nhật `ARCHITECTURE.md`, ADR và đường dẫn mã trong tài liệu phân hệ.
- Mỗi tài liệu phân hệ phải luôn có: nguồn dữ liệu, API, bất biến, rủi ro, kiểm thử tối thiểu.
