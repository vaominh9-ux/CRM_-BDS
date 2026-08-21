# Mô hình dữ liệu

Schema chính nằm trong `supabase/migrations/`. Tài liệu này là bản đồ định hướng, không thay thế SQL.

## Quan hệ chính

```text
auth.users 1--1 profiles N--1 roles 1--N role_permissions
locations 1--N locations
owners 1--N properties N--N amenities
properties 1--N property_images/property_documents/property_expenses
leads N--1 properties (tùy chọn)
leads 1--N lead_offers/follow_ups/appointments/deals
properties 1--N appointments/deals/tenancies
deals 1--N deal_payments
tenancies 1--N rent_payments/tenancy_renewals/maintenance_items
tenancies 1--0..1 deposit_refunds
profiles 1--N activity_logs
```

## Nhóm bảng

| Nhóm | Bảng |
|---|---|
| Danh tính | `roles`, `role_permissions`, `profiles`, `app_settings` |
| Danh mục | `locations`, `amenities`, `owners` |
| Bất động sản | `properties`, `property_amenities`, `property_images`, `property_documents`, `property_expenses` |
| CRM | `leads`, `lead_offers`, `follow_ups`, `appointments` |
| Tài chính | `deals`, `deal_payments`, `tenancies`, `rent_payments`, `tenancy_renewals`, `maintenance_items`, `deposit_refunds` |
| Kiểm toán | `activity_logs` |

## Quy ước

- PostgreSQL dùng `snake_case`; API giao diện dùng `camelCase`. Mapping tập trung trong `supabase-backend.js`.
- ID quan hệ là số, riêng `profiles.id` là UUID trùng `auth.users.id`.
- `created_at`, `updated_at`, `created_by`, `updated_by` dùng cho truy vết.
- Các bảng nghiệp vụ chính dùng `deleted_at` để xóa mềm.
- Trường `*_snapshot` lưu ảnh chụp dữ liệu tại thời điểm giao dịch, không tự động đồng bộ ngược.
- Các view/RPC tính tài chính là nguồn chính cho số đã thu, số dư và công nợ.

## Thay đổi schema

Không sửa migration đã chạy. Tạo migration mới, thêm index/constraint/policy tương ứng, rồi cập nhật mapper và tài liệu. Với cột bắt buộc mới, triển khai theo ba bước: thêm nullable/default -> backfill và kiểm tra -> siết `not null`.
