# Hướng dẫn chi tiết tách `code-appscript/index.html`

Tài liệu này là kế hoạch thực thi để giảm monolith giao diện mà không thay đổi hành vi, giao diện, hợp đồng API hoặc logic nghiệp vụ. Đây là hướng dẫn bắt buộc cho mọi agent làm công việc tách UI.

Quy tắc breakpoint, cô lập thay đổi theo thiết bị và ma trận kiểm thử responsive nằm trong `docs/RESPONSIVE_UI_GUIDE.md`.

## 1. Mục tiêu và phạm vi

Hiện trạng ngày 2026-08-22:

- `code-appscript/index.html`: khoảng 11.400 dòng, gần 700 KB.
- CSS bắt đầu trong thẻ `<style>` và chiếm phần lớn nửa đầu tệp.
- JSX chạy bằng React 18 UMD và Babel Standalone trong trình duyệt.
- jQuery DataTables, Chart.js, SweetAlert2 và các thư viện xuất file được tải từ CDN.
- Giao diện gọi API qua `google.script.run`; Node bridge chuyển thành `/api/run/:method`.
- Tệp còn chứa token template Apps Script như `<?!= defaultThemeVars ?>`.

Mục tiêu đầu tiên không phải là đổi framework. Mục tiêu là tạo ranh giới module rõ, có kiểm thử và vẫn sinh ra một `index.html` tương thích với Node/Vercel và nhánh Apps Script cũ.

## 2. Nguyên tắc không được vi phạm

1. Không tách module đồng thời với thay đổi logic nghiệp vụ.
2. Không đổi tên method `gsRun`, hình dạng args hoặc response envelope trong commit chỉ tách mã.
3. Không đổi enum lưu trữ, công thức tiền, timezone hoặc phạm vi role.
4. Không chuyển sang Vite/TypeScript cùng lúc với lần tách đầu tiên.
5. Không copy CSS/component sang file mới rồi để bản cũ cùng tồn tại.
6. Không sửa file được sinh tự động bằng tay sau khi cơ chế build trung gian được bật.
7. Mỗi đợt chỉ tách một lát nhỏ và phải có kiểm chứng trước khi chuyển sang lát tiếp theo.
8. Mọi thay đổi phải chạy được ở localhost và Vercel; Apps Script chỉ được đánh dấu tương thích khi đã kiểm riêng.

## 3. Chiến lược chuyển tiếp được chọn

Trong giai đoạn đầu, dùng **bộ ghép tệp tĩnh** thay vì ES module trực tiếp:

```text
ui-src/
  shell/
    document-head.html
    document-body.html
  styles/
    00-tokens.css
    10-base.css
    20-layout.css
    30-components.css
    40-tables.css
    50-modals.css
    60-responsive.css
    90-legacy-overrides.css
  scripts/
    00-bootstrap.js
    10-bridge.js
    20-api.jsx
    30-shared.jsx
    modules/
      dashboard.jsx
      properties.jsx
      crm.jsx
      appointments.jsx
      finance.jsx
      identity.jsx
      reporting.jsx
      portal.jsx
    90-app.jsx
    99-mount.jsx
scripts/
  build-ui.mjs
code-appscript/
  index.html              # đầu ra được sinh
```

`build-ui.mjs` ghép file theo thứ tự cố định và tạo lại `code-appscript/index.html`. Cách này giữ React UMD/Babel hiện tại, không cần import/export ngay và vẫn bảo toàn token Apps Script.

Khi các module đã tách và có test, mới tạo ADR riêng để chuyển sang Vite/ES modules.

## 4. Vì sao không đưa ngay nhiều thẻ `<script src>`

- Apps Script template và Node/Vercel hiện cùng dùng một HTML.
- Babel Standalone với JSX ngoài file làm tăng phụ thuộc vào cơ chế tải runtime.
- Thứ tự khai báo global hiện rất quan trọng.
- Một số môi trường deploy không phục vụ static path giống nhau.

Bộ ghép tĩnh cho phép chia nguồn để bảo trì nhưng đầu ra runtime vẫn giống hiện tại. Đây là bước trung gian, không phải kiến trúc cuối.

## 5. Giai đoạn 0 — khóa đường chuẩn

Trước lần di chuyển mã đầu tiên:

### 5.1 Chụp baseline

Ghi lại ít nhất các màn hình:

- Cổng công khai và đăng nhập.
- Dashboard Admin.
- Danh sách và popup Bất động sản.
- Danh sách và hồ sơ 360 khách hàng.
- Lịch hẹn ở chế độ danh sách và lịch.
- Giao dịch và hợp đồng thuê.
- Quản lý người dùng và phân quyền.
- Giao diện mobile hoặc chiều rộng nhỏ.

### 5.2 Khóa số liệu

Chạy:

```powershell
npm run check
npm run audit:data
npm run audit:contract
npm run verify:business
```

`verify:business` chỉ chạy khi có tài khoản kiểm thử Supabase an toàn. Lưu kết quả count/KPI làm baseline, không tự ghi lại production.

### 5.3 Khóa hành vi trình duyệt

Smoke test tối thiểu:

- Đăng nhập/đăng xuất.
- Mở/đóng popup bằng nút, Escape và click backdrop.
- Filter, sort, search, phân trang, đổi số dòng.
- Double-click mở quick view nhưng click nút thao tác không mở nhầm.
- Tạo/sửa một bản ghi thử trong môi trường kiểm thử.
- Kiểm tra quyền Agent không thấy nút/dữ liệu ngoài phạm vi.

Không bắt đầu tách nếu baseline đang lỗi không xác định.

## 6. Giai đoạn 1 — tạo bộ ghép nhưng chưa tách nội dung

Mục đích: chứng minh đầu ra mới giống byte hoặc tương đương chức năng với tệp hiện tại.

1. Tạo `ui-src/shell`, `ui-src/styles`, `ui-src/scripts`.
2. Tạo `scripts/build-ui.mjs` với danh sách file theo thứ tự tường minh; không dựa vào thứ tự filesystem.
3. Bảo toàn nguyên văn các token `<?!= ... ?>`.
4. Build ra file tạm và so sánh với `code-appscript/index.html`.
5. Chỉ khi output ổn định mới cho `npm run build:ui` ghi file đích.
6. Thêm `npm run check:ui-build` để build vào thư mục tạm và báo lỗi nếu output khác file đã commit.

Yêu cầu đối với builder:

- Dùng UTF-8 không BOM.
- Kết thúc file và line ending nhất quán.
- Không minify trong giai đoạn chuyển đổi.
- Ghi chú rõ file nguồn nào được ghép vào vị trí nào.
- Thất bại nếu thiếu một partial hoặc có hai partial trùng thứ tự.

## 7. Giai đoạn 2 — tách CSS trước

CSS nên được tách trước JSX vì ít phụ thuộc vào closure JavaScript, nhưng phải giữ đúng thứ tự cascade.

### 7.1 Thứ tự file

1. `00-tokens.css`: biến màu, font, radius, spacing, z-index.
2. `10-base.css`: reset, body, button/input/select/textarea.
3. `20-layout.css`: app shell, sidebar, header, grid.
4. `30-components.css`: card, button, badge, tabs, pipeline, loading.
5. `40-tables.css`: DataTables, toolbar, footer, action column.
6. `50-modals.css`: backdrop, dialog, form grid, scrollbars.
7. `60-responsive.css`: media queries và mobile navigation.
8. `90-legacy-overrides.css`: override tạm thời, phải có comment nguồn và kế hoạch xóa.

### 7.2 Quy tắc tách CSS

- Di chuyển nguyên block, chưa đổi selector hoặc giá trị.
- Không gộp các selector “trông giống nhau” trong commit di chuyển.
- Không dùng `!important` mới để che hồi quy.
- Không đổi thứ tự media query.
- Ghi chú selector chỉ áp dụng cho DataTables hoặc SweetAlert.
- Mỗi lần tách tối đa một nhóm CSS, rồi chụp so sánh màn hình.

### 7.3 Điều kiện hoàn thành

- Không có `<style>` lớn trong shell; builder ghép các partial vào đúng vị trí.
- Không xuất hiện horizontal overflow mới.
- Chiều cao header bảng, tag, nút thao tác và modal không đổi.
- Theme sáng/tối và bảng màu cá nhân vẫn hoạt động.

## 8. Giai đoạn 3 — tách JavaScript dùng chung

Tách theo thứ tự phụ thuộc, chưa chuyển sang import/export.

### 8.1 Bootstrap và bridge

`00-bootstrap.js`:

- Hằng số toàn cục an toàn.
- Theme trước paint.
- Adapter CDN cần thiết.

`10-bridge.js`:

- `google.script.run` compatibility bridge.
- Đính access token.
- Refresh session.
- Chuẩn hóa lỗi HTTP.

Không để component tự gọi `fetch('/api/run/...')`.

### 8.2 API và dữ liệu dùng chung

`20-api.jsx`:

- `gsRun`.
- SWR/cache wrapper.
- mutation overlay.
- error mapping.
- public/authenticated call boundary.

`30-shared.jsx`:

- Formatter tiền/ngày/đơn vị.
- Status dictionary và nhãn tiếng Việt.
- Permission helpers.
- `Modal`, `BrandLogo`, `Pipeline`, `ChartCanvas`.
- Searchable dropdown/multiselect.
- DataTable lifecycle helpers.

### 8.3 Quy tắc

- Một helper chỉ có một định nghĩa.
- Component dùng chung không biết domain cụ thể.
- Formatter không thực hiện phép tính nghiệp vụ.
- Permission helper chỉ hỗ trợ UX; backend/RLS vẫn cưỡng chế.
- DataTable phải destroy/cleanup trước khi component unmount hoặc dữ liệu thay đổi.

## 9. Giai đoạn 4 — tách từng lát nghiệp vụ

Mỗi module gồm view, modal, mapper UI và style đặc thù. Không tách nhiều module trong cùng một commit.

### 9.1 Thứ tự bắt buộc

1. Dashboard read-only và các card dùng chung nhỏ.
2. Properties + Owners + Locations + Amenities.
3. Leads + Follow-ups.
4. Appointments.
5. Deals + Tenancies sau khi test tài chính đầy đủ.
6. Users + Settings + RBAC.
7. Reports + Logs + Trash + About.
8. Public portal và App shell cuối cùng.

Properties là lát nghiệp vụ đầu tiên lớn vì nó kiểm chứng form, lookup, upload, popup, table và quyền trong một module.

### 9.2 Mẫu checklist cho một module

Trước khi tách:

- Liệt kê component và helper phụ thuộc.
- Liệt kê method `gsRun` được gọi.
- Liệt kê bảng, enum và quyền.
- Chụp màn hình baseline.

Trong khi tách:

- Di chuyển nguyên function trước.
- Không đổi prop name/state shape.
- Không đổi HTML class hoặc selector DataTable.
- Không đổi thứ tự hook.
- Không thêm API mới.

Sau khi tách:

- Search xác nhận function cũ không còn bản sao.
- Chạy health và contract audit.
- Kiểm tra CRUD/filter/modal/permission.
- So sánh số liệu và giao diện.
- Cập nhật `docs/modules/<MODULE>.md`.

## 10. Bản đồ component hiện tại

### Shared/UI

`ProcessingOverlay`, `Pipeline`, `ChartCanvas`, `SearchableDropdown`, `SearchableMultiSelect`, `BrandLogo`, `Sidebar`, `BottomNavigation`, `SmallBox`, `InfoBox`, `LteCard`, skeleton và loading bar.

### Dashboard

`DashboardView`, `NotificationBell`, `GlobalSearch`, `StatusDonut`, `LeadsTrend`, `FunnelChart`, `TopAgents`.

### Identity/settings

`UsersView`, `UserModal`, `ReassignWorkModal`, `AccountView`, `SettingsView`, `AgencyBrandingCard`, `PermissionsMatrixView`.

### Properties/catalog

`PropertiesView`, `PropertyModal`, `PropertyDetailModal`, `OwnersView`, `OwnerModal`, `Owner360Modal`, `LocationsView`, `LocationModal`, `AmenitiesView`, `AmenityModal`.

### CRM/appointments

`LeadsView`, `LeadKanban`, `LeadModal`, `AssignLeadModal`, `Lead360Modal`, `FollowUpsView`, `FollowUpModal`, `AppointmentsView`, `CalendarGrid`, `FeedbackModal`.

### Finance/documents

`DealsView`, `DealModal`, `DealPaymentModal`, `TenanciesView`, `Tenancy360Modal`, `CollectRentModal`, `RenewTenancyModal`, `EndTenancyModal`, `AgreementsView`, các modal tài liệu.

### Portal/app shell

`LoginPage`, `PublicPortal`, `PortalDetail`, `MainContent`, `Dashboard`, `App`.

## 11. Quản lý state trong giai đoạn chuyển tiếp

- Giữ state cục bộ trong modal/form nếu chỉ một màn hình sử dụng.
- Dữ liệu server tiếp tục dùng SWR/cache wrapper hiện có.
- Session/theme/permissions ở App shell.
- Không đưa toàn bộ dữ liệu vào Context hoặc thêm Redux trong giai đoạn tách.
- Khi mutation thành công, invalidation phải dùng key được định nghĩa tập trung.
- Optimistic update chỉ dùng khi có rollback và test lỗi.

## 12. Chuẩn hóa modal

Primitive modal đích phải hỗ trợ:

- `title`, `size`, `onClose`, `closeOnBackdrop`, `closeOnEscape`.
- Click nội dung không nổi bọt làm đóng modal.
- Focus ban đầu và trả focus về phần tử đã mở.
- Khóa scroll body và cleanup khi unmount.
- Một z-index scale dùng chung cho dropdown, modal, SweetAlert và processing overlay.
- Vùng body cuộn với scrollbar gọn; header/footer cố định nếu form dài.

Không thay toàn bộ modal trong một commit. Chuyển từng modal và kiểm thử.

## 13. Chuẩn hóa DataTables

- Mỗi bảng có một wrapper sở hữu khởi tạo/destroy.
- Search nghiệp vụ phía trên và search DataTables không được lặp; chọn một nguồn.
- Length selector và pagination dùng footer chuẩn.
- Header cell có chiều cao/padding thống nhất.
- Cột thao tác dùng width/min-width cố định và event `stopPropagation`.
- Khi data/filter thay đổi, không tạo instance DataTable thứ hai.
- Với dữ liệu lớn, chuyển phân trang/filter sang server thay vì render toàn bộ.

## 14. Kiểm thử theo vai trò

Mỗi lát đã tách phải thử:

| Vai trò | Kiểm tra |
|---|---|
| Admin | CRUD, settings, user, RBAC và dữ liệu toàn hệ thống |
| Manager | Dữ liệu toàn đơn vị nhưng không có quyền Admin đặc biệt |
| Agent | Chỉ dữ liệu được phân công, không thấy mutation bị cấm |
| Public | Không cần JWT, không lộ trường riêng tư |

Ẩn nút đúng chưa đủ; gửi request thủ công với role bị cấm phải bị backend/RLS từ chối.

## 15. Quy tắc commit

Một commit tách mã tốt nên có dạng:

```text
refactor(ui): extract shared modal styles without behavior changes
refactor(properties): move property views into generated UI partial
test(appointments): lock list/calendar parity before extraction
```

Không trộn trong cùng commit:

- Refactor + đổi công thức.
- Refactor + đổi schema.
- Refactor + dịch hàng loạt.
- Refactor + thiết kế lại giao diện.

Nếu cần sửa lỗi phát hiện trong lúc tách, ghi lại và xử lý ở commit riêng sau khi baseline được khôi phục.

## 16. Tiêu chí dừng và hoàn tác

Dừng đợt tách nếu xảy ra một trong các điều sau:

- KPI/tiền khác baseline không có giải thích.
- Agent nhìn thấy dữ liệu ngoài phạm vi.
- Contract audit giảm số method đã triển khai.
- Popup/table bị lỗi ở module không thuộc phạm vi.
- Output builder không xác định hoặc phụ thuộc thứ tự filesystem.
- Vercel khác localhost.

Hoàn tác chỉ commit/lát đang làm; không reset các thay đổi khác của người dùng. Ghi nguyên nhân vào issue hoặc note phân hệ trước khi thử phương án mới.

## 17. Khi nào được chuyển sang Vite/TypeScript

Chỉ tạo ADR chuyển build khi đạt tất cả điều kiện:

- Shared primitives và ít nhất ba module đã tách khỏi monolith nguồn.
- Có browser smoke test cho Admin và Agent.
- Contract API có validator hoặc type rõ.
- Không còn phụ thuộc ngầm vào thứ tự function trong một script lớn.
- Builder trung gian chạy ổn định trên CI.
- Có phương án cho token Apps Script hoặc quyết định chính thức đóng nhánh GAS.

Khi đó chuyển module sang ES imports từng phần, không viết lại nghiệp vụ.

## 18. Kế hoạch sprint đề xuất

### Sprint 1 — baseline và builder

- Chụp baseline. Kiểm tra cấu trúc tự động ban đầu đã có tại `npm run check:ui-baseline`.
- Builder trung gian đã có: `npm run build:ui` và `npm run check:ui-build`.
- Chưa thay đổi layout hoặc logic.

### Sprint 2 — CSS foundation

- Tách tokens/base/layout/components.
- Kiểm tra desktop/mobile và theme.

### Sprint 3 — shared JavaScript

- Tách bridge/API/formatter/status/modal/table helpers.
- Thêm unit test formatter và modal smoke test.

### Sprint 4 — Properties

- Tách danh sách, form, detail popup, owner/location/amenity.
- Khóa upload ảnh, permission và public redaction.

### Sprint 5 — CRM và lịch

- Tách leads/follow-ups/appointments.
- Khóa parity list/calendar/dashboard và timezone.

### Sprint 6 — tài chính

- Chỉ bắt đầu sau khi test RPC/financial baseline đầy đủ.
- Tách deal/tenancy mà không chuyển công thức sang UI.

## 19. Definition of Done toàn bộ chương trình

- `code-appscript/index.html` là output sinh tự động, không phải nguồn chỉnh tay.
- Mỗi module có nguồn, test và tài liệu riêng.
- CSS không còn override không rõ chủ sở hữu.
- API client, formatter, modal, table và status dictionary chỉ có một bản.
- CI kiểm tra build output, contract, business rules và browser smoke.
- Local và Vercel hiển thị/hành xử giống nhau.
- Việc chuyển framework sau này không yêu cầu viết lại logic nghiệp vụ.
