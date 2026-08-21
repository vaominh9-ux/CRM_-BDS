# NTH CRM Bất động sản

CRM quản lý bất động sản, khách hàng tiềm năng, chăm sóc, lịch hẹn, giao dịch, hợp đồng thuê, báo cáo và phân quyền. Ứng dụng hiện dùng giao diện React chạy trực tiếp trong một tệp HTML, Node.js làm gateway và Supabase/PostgreSQL làm nguồn dữ liệu chính.

## Chạy trên máy local

Yêu cầu Node.js 20 trở lên. Sao chép `.env.supabase.example` thành `.env.supabase.local`, điền các biến cần thiết rồi chạy:

```powershell
npm install
npm start
```

Mở `http://localhost:3000`. Khi cấu hình Supabase chưa đầy đủ, server tự dùng `data/local-crm-data.json` qua backend dự phòng.

## Kiến trúc nhanh

```text
Trình duyệt / code-appscript/index.html
        | google.script.run bridge
        v
server.js -> POST /api/run/:method
        |-- supabase-backend.js -> Supabase REST/Auth/Storage/RLS
        `-- local-backend.js    -> data/local-crm-data.json (fallback)
```

`code-appscript/code.gs` là backend Google Apps Script cũ/tham chiếu, không phải đường chạy mặc định của localhost.

## Kiểm tra dự án

```powershell
npm run check
npm run audit:data
npm run verify:business
```

- `check`: cấu trúc, cú pháp, JSON, migration và an toàn tệp môi trường.
- `audit:data`: quan hệ tham chiếu và công thức trên dữ liệu nguồn JSON.
- `audit:contract`: đối chiếu các API cố định UI đang gọi với dispatcher Supabase.
- `verify:business`: so sánh KPI giữa fallback và Supabase; cần thông tin đăng nhập migration.

## Tài liệu dành cho phát triển

- [Kiến trúc](docs/ARCHITECTURE.md)
- [Hợp đồng API và mức độ chuyển đổi](docs/API_CONTRACT.md)
- [Mô hình dữ liệu](docs/DATA_MODEL.md)
- [Quy tắc nghiệp vụ](docs/BUSINESS_RULES.md)
- [Quy trình phát triển](docs/DEVELOPMENT.md)
- [Quyết định tách module từng bước](docs/adr/0001-incremental-modularization.md)
- [Hướng dẫn cho agent](AGENTS.md)
- [Trạng thái migration Supabase](SUPABASE_MIGRATION.md)

## Đánh giá hiện trạng

Nền tảng dữ liệu có điểm mạnh là PostgreSQL, RLS, soft-delete, ràng buộc duy nhất và một số công thức tiền được khóa ở database. Rủi ro lớn nhất là giao diện nguyên khối, hai backend phải duy trì tương thích, API theo chuỗi tên phương thức chưa có schema hợp đồng và kiểm thử tự động còn thiên về migration. Lộ trình trong tài liệu kiến trúc ưu tiên khóa nghiệp vụ và hợp đồng trước, sau đó mới tách module.
