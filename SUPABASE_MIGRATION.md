# Kế hoạch chuyển CRM sang Supabase

## Trạng thái hiện tại

- Giao diện localhost vẫn dùng backend JSON hiện tại và chưa bị thay đổi.
- Schema PostgreSQL ban đầu nằm trong `supabase/migrations/`.
- RLS đã được thiết kế cho Admin, Manager và Agent.
- Thanh toán giao dịch được khóa theo giao dịch và chặn thu vượt.
- Công thức hoa hồng được tạo trực tiếp trong PostgreSQL.
- Công cụ kiểm kê dữ liệu nguồn: `scripts/audit-supabase-readiness.mjs`.
- Công cụ nhập dữ liệu: `scripts/migrate-to-supabase.mjs`.
- Công cụ đối chiếu sau nhập: `scripts/verify-supabase-migration.mjs`.

## Kết quả đối chiếu nguồn ngày 21/08/2026

| Chỉ số | Giá trị chuẩn |
|---|---:|
| Tổng giá trị giao dịch | 21.556.080.000 đ |
| Đã thu | 13.360.690.000 đ |
| Còn lại | 8.195.390.000 đ |
| Tổng hoa hồng | 291.870.000 đ |
| Phần hoa hồng nhân viên | 116.748.000 đ |
| Tiền thuê đã thu | 305.500.000 đ |
| Công nợ thuê tại ngày đối chiếu | 23.970.000 đ |

Một lịch sử gia hạn của hợp đồng `#3` còn dùng PKR trong hai trường tiền thuê cũ/mới. Công cụ nhập chuyển hai giá trị này theo hệ số nguồn `94` và ghi rõ vào báo cáo migration.

## Thông tin cần có trước khi chạy trên Supabase

1. URL dự án Supabase.
2. Service role key, chỉ dùng cục bộ cho lần nhập dữ liệu và không đưa vào frontend.
3. Mật khẩu tạm tối thiểu 12 ký tự cho tài khoản staging.
4. Một dự án Supabase staging trống; không chạy lần đầu trên production.

Sao chép `.env.supabase.example` thành `.env.supabase.local` rồi điền các giá trị trên.

## Trình tự chạy

```powershell
node scripts/audit-supabase-readiness.mjs
supabase db push
node --env-file=.env.supabase.local scripts/migrate-to-supabase.mjs
node --env-file=.env.supabase.local scripts/verify-supabase-migration.mjs
```

Chỉ bắt đầu kết nối giao diện sau khi báo cáo `verify` không còn sai lệch.

