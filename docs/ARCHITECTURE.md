# Kiến trúc hệ thống

## 1. Bối cảnh chạy

Ứng dụng hỗ trợ hai bối cảnh:

- **Local/serverless Node.js:** `server.js` phục vụ HTML, tạo cầu nối tương thích `google.script.run` và định tuyến yêu cầu đến Supabase hoặc JSON fallback.
- **Google Apps Script cũ:** `code-appscript/code.gs` cung cấp các hàm server cho cùng giao diện. Đây là nhánh tương thích, không phải nguồn logic chính của bản localhost hiện tại.

Backend được chọn lúc khởi động. `supabase-backend.js` chỉ bật khi đủ URL, publishable key và service-role key; nếu thiếu, `local-backend.js` được dùng.

## 2. Các lớp

| Lớp | Tệp | Trách nhiệm |
|---|---|---|
| UI | `code-appscript/index.html` | React components, CSS, bảng, popup, điều hướng, gọi API |
| Gateway | `server.js` | HTTP, static HTML, auth-session bridge, định tuyến `/api/run/:method` |
| Backend chính | `supabase-backend.js` | Auth, mapping camelCase/snake_case, REST/RPC/Storage, KPI |
| Backend dự phòng | `local-backend.js` | Cùng hợp đồng phương thức trên JSON, phục vụ đối chứng/local offline |
| Database | `supabase/migrations/*.sql` | Schema, constraints, views, RPC, trigger, RLS, seed vai trò |
| Migration/tooling | `scripts/` | Nhập dữ liệu, kiểm tra tham chiếu, đối chiếu KPI |
| Serverless adapter | `api/index.js` | Xuất handler Node cho nền tảng triển khai |

## 3. Luồng yêu cầu

1. Component gọi wrapper `callServer(method, ...args)` trong HTML.
2. Wrapper gọi `google.script.run[method](...args)`.
3. Bridge local gửi `POST /api/run/:method`, đính kèm access token nếu có.
4. Gateway gọi `supabaseBackend.run` khi được cấu hình, nếu không gọi `localBackend.run`.
5. Backend kiểm tra người dùng/RLS, ánh xạ dữ liệu và trả envelope `{ success, data, message }`.

Không gọi Supabase trực tiếp từ component cho dữ liệu quản trị. Điều này tránh lộ service-role key và giữ một điểm kiểm soát hợp đồng.

## 4. Ranh giới module nghiệp vụ

- Dashboard và thông báo: dữ liệu tổng hợp, không sở hữu bản ghi.
- Properties: bất động sản, ảnh, tài liệu, tiện ích, chi phí, chủ sở hữu, vị trí.
- Leads: khách hàng tiềm năng, chào giá, phân công.
- Follow-ups và Appointments: hoạt động chăm sóc và lịch xem.
- Deals: giao dịch, thanh toán, hoa hồng.
- Tenancies: hợp đồng thuê, thu tiền, gia hạn, bảo trì, hoàn cọc.
- Identity/RBAC: auth users, profiles, roles, permissions, settings.
- Audit: activity logs và soft-delete/trash.

Các module trao đổi qua ID, không sao chép toàn bộ thực thể. Snapshot tên/số điện thoại chỉ dùng nơi schema đã chủ ý lưu lịch sử.

## 5. Rủi ro và thứ tự cải tiến

### Rủi ro hiện tại

1. `index.html` rất lớn, CSS và component cùng tệp nên dễ va chạm selector và sinh hồi quy giao diện.
2. Ba hiện thực logic (Supabase, JSON, Apps Script) có thể lệch nhau.
3. Dispatcher dựa trên tên chuỗi, chưa có schema validate request/response.
4. Kiểm thử chủ yếu kiểm tra dữ liệu/KPI; chưa có unit test và browser test ổn định.
5. Một số dữ liệu nguồn cũ dùng đơn vị/nhãn tiếng Anh; cần chuẩn hóa ở biên nhập liệu thay vì sửa công thức hiển thị rải rác.

### Lộ trình đề xuất

1. **Khóa nền:** tài liệu nghiệp vụ, health check, contract inventory, log lỗi có mã.
2. **Tách lớp dùng chung:** formatter tiền/ngày, status dictionary, modal/table primitives, API client.
3. **Tách theo lát dọc:** Properties trước, rồi Leads/Appointments, Deals/Tenancies; mỗi lát giữ nguyên tên method.
4. **Thêm test:** unit cho công thức, contract test hai backend, browser smoke test theo vai trò.
5. **Build hiện đại:** chỉ sau khi các test khóa hành vi; chuyển JSX/CSS sang `src/` với Vite hoặc tương đương.
6. **Giảm fallback:** khi Supabase ổn định và snapshot/backup có quy trình, đóng băng JSON backend thành fixture kiểm thử.

Không nên đổi framework, tách toàn bộ HTML và thay database contract trong cùng một đợt.
