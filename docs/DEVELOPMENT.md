# Quy trình phát triển

## Thiết lập

1. Cài Node.js 20+ và dependency bằng `npm install`.
2. Sao chép `.env.supabase.example` thành `.env.supabase.local`.
3. Không gửi hoặc commit service-role key/mật khẩu.
4. Chạy `npm start`, mở `http://localhost:3000`.

## Thêm hoặc sửa một tính năng

1. Xác định module và quy tắc trong `BUSINESS_RULES.md`.
2. Nếu cần schema, tạo migration mới trong `supabase/migrations/`.
3. Thêm handler/mapping trong `supabase-backend.js`.
4. Thêm hành vi tương thích trong `local-backend.js` hoặc ghi rõ tính năng chỉ hỗ trợ Supabase.
5. Giữ chữ ký `method + args` tương thích với cầu nối trong `server.js`.
6. Cập nhật component nhỏ nhất có thể trong `code-appscript/index.html`.
7. Chạy kiểm tra và thử bằng vai trò Admin cùng ít nhất một Agent.

## Quy ước API

- Thành công: `{ success: true, data?: ..., message?: string }`.
- Lỗi nghiệp vụ: `{ success: false, message: string }`; không trả stack trace cho trình duyệt.
- Tên method dùng động từ + thực thể, ví dụ `getAppointments`, `addAppointment`.
- Không truyền username để thay thế xác thực trong đường Supabase; danh tính lấy từ JWT.
- Dữ liệu tiền ở API là số VNĐ, không phải chuỗi đã format.

## Migration và dữ liệu

- Trước migration: chạy `npm run audit:data` và sao lưu database.
- Migration schema phải chạy trước migration dữ liệu.
- Script migration cần idempotent hoặc có cơ chế checkpoint rõ ràng.
- Sau migration: kiểm số lượng, khóa ngoại, ID, tổng tiền và KPI; không chỉ kiểm “request thành công”.
- `verify-supabase-migration.mjs` là công cụ chẩn đoán. Khác biệt do dữ liệu Supabase đã phát sinh mới hoặc do quy đổi dữ liệu cũ phải được phân loại, không tự động overwrite.

## Checklist review

- Không lộ secret/JWT trong mã, log hoặc HTML.
- RLS/policy phù hợp với V/A/E/D và phạm vi Agent.
- Không tạo trùng appointment/open deal/active tenancy.
- Công thức tiền dùng VNĐ nguyên và chạy ở database khi có cạnh tranh ghi.
- Popup, bảng, tag và formatter dùng primitive dùng chung nếu đã có.
- Chuỗi UI mới là tiếng Việt; enum lưu trữ vẫn dùng giá trị chuẩn.
- Cập nhật tài liệu nếu đổi contract, schema hoặc quy tắc.

## Lệnh kiểm tra

```powershell
npm run check
npm run audit:data
npm run audit:contract
npm run verify:business
```

`verify:business` kết nối Supabase và cần `MIGRATION_DEFAULT_PASSWORD`. Không chạy trên production nếu chưa có tài khoản kiểm thử an toàn.
