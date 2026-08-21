# Hướng dẫn làm việc cho agent

Tệp này là chỉ dẫn gốc cho mọi agent sửa mã trong repository. Đọc `README.md` và các tài liệu trong `docs/` trước khi thay đổi hành vi nghiệp vụ.

## Nguyên tắc bắt buộc

1. Supabase là nguồn dữ liệu chính khi đủ ba biến `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. JSON chỉ là dữ liệu gốc, phương án local dự phòng và đối chứng migration.
2. Không sửa trực tiếp dữ liệu sản xuất, không chạy lại migration dữ liệu, `supabase db reset`, hoặc thay khóa bí mật nếu người dùng chưa yêu cầu rõ ràng.
3. Không commit `.env.supabase.local`, service-role key, mật khẩu migration hoặc JWT. Service-role key chỉ được dùng phía máy chủ.
4. Giữ hợp đồng gọi hiện tại: giao diện gọi `google.script.run.<method>(...args)`; localhost chuyển tiếp qua `POST /api/run/:method`; backend trả `{ success, data?, message? }`.
5. Công thức tiền, trạng thái và phân quyền trong `docs/BUSINESS_RULES.md` là bất biến. Nếu thay đổi, cập nhật migration, backend, giao diện, kiểm thử và tài liệu trong cùng thay đổi.
6. Tạo migration mới, không sửa migration đã áp dụng. Tên migration dùng thời gian tăng dần: `YYYYMMDDHHMM_mo_ta.sql`.
7. Bảo toàn các thay đổi đang có của người dùng. Không reset/checkout các tệp không thuộc phạm vi công việc.

## Bản đồ nguồn sự thật

| Phạm vi | Nguồn chính | Vai trò phụ |
|---|---|---|
| Schema, ràng buộc, RLS, công thức SQL | `supabase/migrations/` | `docs/DATA_MODEL.md` diễn giải |
| API localhost/Supabase | `supabase-backend.js` | `local-backend.js` là fallback/đối chứng |
| HTTP và cầu nối Apps Script | `server.js` | `api/index.js` bọc để triển khai serverless |
| Giao diện hiện tại | `code-appscript/index.html` | Chưa có bước build; React/Babel chạy trong trình duyệt |
| Backend Apps Script cũ | `code-appscript/code.gs` | Tham chiếu/triển khai GAS; không phải backend localhost mặc định |
| Dữ liệu gốc | `data/local-crm-data.json` | Không coi là dữ liệu sản xuất khi Supabase đã bật |
| Quy tắc nghiệp vụ | `docs/BUSINESS_RULES.md` | Script kiểm tra trong `scripts/` |

## Quy trình sửa mã

1. Xác định backend thực thi và bảng liên quan; đừng chỉ sửa `code.gs` nếu lỗi xảy ra ở localhost.
2. Tìm tất cả lời gọi tên phương thức trước khi đổi chữ ký API.
3. Với thay đổi dữ liệu: migration mới -> mapper trong `supabase-backend.js` -> fallback trong `local-backend.js` nếu cần -> UI -> kiểm thử.
4. Chạy `node scripts/project-health.mjs` và kiểm tra chuyên biệt phù hợp.
5. Với thay đổi UI, mở localhost và kiểm tra ít nhất màn hình bị sửa, một vai trò bị giới hạn và kích thước cửa sổ nhỏ.

## Giới hạn kiến trúc hiện tại

`code-appscript/index.html` là monolith lớn. Không tiếp tục thêm CSS/tiện ích trùng lặp nếu có thể tái sử dụng. Khi tách module, làm theo ADR trong `docs/adr/0001-incremental-modularization.md`: giữ hành vi, tách từng lát nhỏ, có bước kiểm chứng sau mỗi lát. Không đổi framework đồng thời với sửa nghiệp vụ.

## Lệnh kiểm tra

```powershell
node scripts/project-health.mjs
node scripts/audit-supabase-readiness.mjs
node scripts/audit-api-contract.mjs
node --env-file-if-exists=.env.supabase.local scripts/verify-business-logic.mjs
```

Lệnh cuối cần tài khoản migration hợp lệ và truy cập Supabase. Không coi việc script so sánh migration thất bại là lý do tự động ghi đè dữ liệu; phải phân loại khác biệt trước.
