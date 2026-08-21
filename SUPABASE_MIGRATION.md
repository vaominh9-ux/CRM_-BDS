# Trạng thái Supabase và migration

## Trạng thái hiện tại

Ứng dụng localhost **đã có đường kết nối Supabase**. `server.js` chọn `supabase-backend.js` khi đủ biến môi trường; nếu thiếu mới quay về `local-backend.js` và JSON. Không dùng nội dung lịch sử của tài liệu này để kết luận rằng giao diện luôn chạy JSON.

Schema hiện được tạo bởi:

1. `202608210001_initial_crm_schema.sql`
2. `202608210002_enforce_property_scope.sql`
3. `202608210003_property_images_bucket.sql`

Các migration này có thể đã chạy trên project hiện tại. **Không chạy lại migration dữ liệu hoặc reset database** nếu chưa sao lưu và chưa xác nhận đích đến.

## Cấu hình

Sao chép `.env.supabase.example` thành `.env.supabase.local` và điền trên máy:

```dotenv
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRM_SOURCE_FILE=./data/local-crm-data.json
MIGRATION_DEFAULT_PASSWORD=...
```

Không commit hoặc gửi service-role key/mật khẩu qua chat. Publishable key có thể dùng ở client, service-role key tuyệt đối chỉ ở server.

## Quy trình an toàn

```powershell
npm run check
npm run audit:data
npm run verify:business
```

Nếu cần thay schema, tạo migration mới có timestamp lớn hơn; không sửa các file đã áp dụng. Nếu cần nhập lại dữ liệu, phải có snapshot, kế hoạch xử lý ID/trùng lặp và báo cáo đối chiếu tổng tiền.

## Lưu ý về kiểm chứng

`scripts/verify-supabase-migration.mjs` so sánh snapshot nguồn với Supabase. Supabase có thể đã có bản ghi phát sinh sau migration hoặc dữ liệu nguồn cũ có đơn vị khác, nên chênh lệch phải được phân loại. Không tự động ghi đè dữ liệu chỉ để làm báo cáo “khớp”. Công thức nghiệp vụ chuẩn nằm trong `docs/BUSINESS_RULES.md`.
