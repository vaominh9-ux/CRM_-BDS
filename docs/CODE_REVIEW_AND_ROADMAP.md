# Đánh giá cấu trúc mã và lộ trình chuẩn hóa

Ngày đánh giá: 2026-08-22.

## Kết luận nhanh

Hệ thống đã có mô hình dữ liệu, RLS, công thức tài chính và gateway đủ để tiếp tục phát triển. Điểm yếu không nằm ở ý tưởng nghiệp vụ mà ở mức độ tập trung mã: UI là một monolith lớn, backend Supabase chứa nhiều domain trong một tệp, và fallback/App Script có thể lệch hành vi.

| Thành phần | Quy mô hiện tại | Nhận xét |
|---|---:|---|
| `code-appscript/index.html` | ~11.400 dòng / 688 KB | Rủi ro hồi quy CSS, modal và state cao nhất |
| `supabase-backend.js` | ~844 dòng / 74 KB | Đúng hướng nhưng đang trộn auth, mapper, domain và dispatcher |
| `local-backend.js` | ~408 dòng / 35 KB | Hữu ích cho đối chứng, nhưng không nên tiếp tục thành backend sản xuất thứ hai |
| `code-appscript/code.gs` | ~3.200 dòng / 228 KB | Nhánh tương thích cũ; dễ gây nhầm nguồn thực thi |
| API literal UI | 65 method | 52 method Supabase đã có, 13 method còn thiếu |

## Điểm tốt cần giữ

- Supabase là nguồn dữ liệu chính; service-role chỉ chạy phía server.
- API có envelope chung `{ success, data?, message? }`.
- Tiền lưu bằng VNĐ nguyên; enum lưu trữ ổn định và chỉ dịch ở UI.
- Database đã có constraint/RPC cho các ghi tài chính nhạy cảm.
- Có RLS, role/permission, audit log, soft delete và bộ script đối chiếu.
- Tài liệu nền và ADR đã xác định chiến lược tách dần, không viết lại một lần.

## Vấn đề cần điều chỉnh

### P0 — độ chính xác và an toàn dữ liệu

1. Hoàn tất contract test cho thanh toán, công nợ, lịch hẹn và phân quyền Agent.
2. Mọi mutation tiền phải đi qua RPC/transaction; không tính số dư rồi PATCH từ client.
3. Chuẩn hóa lỗi thành mã ổn định, ví dụ `APPOINTMENT_CONFLICT`, `PERMISSION_DENIED`, thay vì chỉ chuỗi tiếng Việt.
4. Thêm idempotency key cho thao tác dễ gửi lặp: đặt lịch, ghi thanh toán, import.
5. Không để `setAppConfig` ghi đè mất nhánh `branding`; cần merge có chủ đích hoặc API chuyên biệt.

### P1 — giảm hồi quy giao diện

1. Tách CSS token, modal, table, badge, formatter và API client trước.
2. Tách theo lát dọc: Properties -> Leads/Appointments -> Deals/Tenancies -> Identity/Reports.
3. Mỗi lát có file `api`, `model`, `components`, `styles`, `tests`; giữ nguyên tên method trong giai đoạn chuyển tiếp.
4. Loại bỏ selector CSS toàn cục trùng lặp; dùng class theo component hoặc CSS module khi có build.
5. Chuẩn hóa vòng đời popup: Escape, click backdrop, focus trap, scroll lock và cleanup listener.

### P1 — hợp đồng backend

1. Tách `supabase-backend.js` thành transport, auth, mapper và service theo domain.
2. Thêm validation đầu vào ở server bằng schema; không dựa vào form HTML.
3. Sinh inventory API tự động từ dispatcher thay vì chỉ quét literal `gsRun`.
4. Dùng cùng fixture để contract-test Supabase mapper và local fallback.
5. Đóng băng `code.gs` ở chế độ legacy; mọi tính năng mới chỉ triển khai Node/Supabase.

### P2 — vận hành và quan sát

1. Log có `requestId`, `actorId`, `method`, `durationMs`, `errorCode`; không log JWT/secret.
2. Thêm health endpoint phân biệt cấu hình Supabase, kết nối DB và storage.
3. Thêm Playwright smoke test cho Admin, Manager, Agent và cổng công khai.
4. Thêm CI bắt buộc: health, contract audit, unit business rules, migration lint.
5. Theo dõi lỗi client/server bằng một công cụ quan sát trước khi mở rộng người dùng thật.

## Cấu trúc đích đề xuất

```text
src/
  app/                 # shell, route, session, theme
  shared/
    api/               # gsRun client, envelope, error mapping
    ui/                # Modal, DataTable, Badge, FormField
    lib/               # money/date/status/validation
  modules/
    properties/
    crm/
    appointments/
    finance/
    identity/
    reporting/
server/
  transport/           # Supabase REST/Storage client
  auth/                # JWT/profile/permission
  modules/              # service + mapper theo domain
  dispatcher/          # registry method -> handler
tests/
  unit/
  contract/
  browser/
```

Không tạo cấu trúc này rỗng hàng loạt. Chỉ tạo thư mục khi tách một lát có test và chạy được.

## Lộ trình thực hiện

### Giai đoạn 1 — khóa hành vi

- Bổ sung test cho công thức và quyền.
- Hoàn tất 13 API còn thiếu hoặc vô hiệu hóa nút tương ứng có giải thích.
- Chuẩn hóa error code và idempotency cho mutation quan trọng.

### Giai đoạn 2 — shared foundation

- Tách formatter, status dictionary, modal, table footer, form control.
- Tách API client và session khỏi component.
- Thêm browser smoke test cho các primitive.

### Giai đoạn 3 — tách module

- Properties trước vì có ảnh, storage, form lớn và popup 360.
- CRM + Appointments tiếp theo vì dùng chung lead và lịch.
- Finance sau khi test RPC tài chính đủ mạnh.
- Identity/Reports cuối cùng.

### Giai đoạn 4 — build và dọn legacy

- Đưa JSX/CSS sang Vite hoặc công cụ tương đương.
- Chuyển `local-backend.js` thành fixture/test adapter.
- Đánh dấu `code.gs` chỉ đọc hoặc loại bỏ sau một chu kỳ xác nhận không còn deploy GAS.

## Tiêu chí hoàn thành một lần tách

- Không đổi contract ngoài dự kiến.
- Health và contract audit không giảm coverage.
- Quy tắc nghiệp vụ có unit test.
- Kiểm tra được Admin và Agent.
- UI desktop/mobile không lệch bảng, popup, tag hoặc thanh cuộn.
- Tài liệu phân hệ và ADR được cập nhật.

