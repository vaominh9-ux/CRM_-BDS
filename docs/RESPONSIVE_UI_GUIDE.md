# Hướng dẫn tối ưu giao diện điện thoại và máy tính độc lập

## 1. Trả lời ngắn gọn về cấu trúc hiện tại

Hệ thống **không có hai file HTML riêng** cho điện thoại và máy tính. Cả hai thiết bị dùng chung:

- `code-appscript/index.html`.
- Cùng React components và cùng dữ liệu.
- CSS media query thay đổi bố cục theo chiều rộng.
- Một số thành phần riêng theo thiết bị, ví dụ sidebar desktop và bottom navigation mobile.

Đây là hướng tiếp cận đúng cho CRM này. Tách thành hai HTML độc lập sẽ làm nhân đôi logic, dễ lệch quyền, API, popup và số liệu. Mục tiêu là dùng chung logic nhưng cô lập lớp trình bày và hành vi responsive.

## 2. Vấn đề responsive hiện tại

Các breakpoint đang rải rác trong monolith: `460`, `480`, `520`, `560`, `576`, `640`, `720`, `768`, `820`, `900`, `992`, `1120`, `1200`, `1250` px.

Hệ quả:

- Một thiết bị có thể đồng thời trúng nhiều media query khó dự đoán.
- Cùng một component bị override ở nhiều nơi.
- Sửa base selector để chữa mobile có thể làm desktop thay đổi.
- CSS được thêm theo thời gian nhưng chưa rõ selector nào thuộc mobile/desktop.
- Kiểm thử thường chỉ nhìn một kích thước nên bỏ sót vùng trung gian như tablet.

## 3. Tư duy kiến trúc cần áp dụng

Tách ba lớp rõ ràng:

```text
Logic nghiệp vụ dùng chung
  └── Component/DOM ngữ nghĩa dùng chung
        ├── Layout desktop
        ├── Layout tablet
        └── Layout mobile
```

- Dữ liệu, API, permission, formatter và mutation phải dùng chung.
- DOM dùng chung khi nội dung và thứ tự thao tác giống nhau.
- CSS chịu trách nhiệm thay đổi grid, kích thước, overflow và vị trí.
- Chỉ tạo component riêng cho thiết bị khi mô hình tương tác thực sự khác, ví dụ sidebar và bottom navigation.
- Không nhân đôi toàn bộ view chỉ để đổi bố cục.

## 4. Hợp đồng breakpoint chuẩn

Trong giai đoạn chuyển đổi, chuẩn hóa về năm vùng:

| Tên | Khoảng | Thiết bị điển hình | Mục tiêu |
|---|---:|---|---|
| `xs` | dưới 480 px | Điện thoại nhỏ | Một cột, thao tác chạm |
| `sm` | 480–767 px | Điện thoại lớn | Một cột rộng, bảng cuộn |
| `md` | 768–991 px | Tablet | Hai cột khi phù hợp |
| `lg` | 992–1199 px | Laptop nhỏ | Sidebar và nội dung desktop |
| `xl` | từ 1200 px | Desktop lớn | Dashboard nhiều cột |

Giá trị canonical:

```css
/* xs: < 480px */
@media (max-width: 479.98px) {}

/* mobile: < 768px */
@media (max-width: 767.98px) {}

/* tablet only */
@media (min-width: 768px) and (max-width: 991.98px) {}

/* desktop */
@media (min-width: 992px) {}

/* large desktop */
@media (min-width: 1200px) {}
```

CSS custom properties không dùng trực tiếp trong media query. Các giá trị breakpoint phải được ghi ở một file/quy ước duy nhất và có test, không tự thêm con số mới nếu chưa có lý do được ghi lại.

## 5. Chiến lược với CSS hiện tại

Mã hiện tại chủ yếu theo kiểu desktop-first và dùng `max-width`. Không đảo toàn bộ sang mobile-first trong một lần vì dễ tạo hồi quy.

Thực hiện theo hai giai đoạn:

### Giai đoạn chuyển tiếp

- Giữ base desktop hiện có.
- Mọi sửa riêng mobile phải nằm trong `@media (max-width: 767.98px)`.
- Mọi sửa riêng tablet phải nằm trong media query chỉ tablet.
- Mọi sửa desktop để chống ảnh hưởng từ mobile phải nằm trong `@media (min-width: 992px)`.
- Gom và thay dần các breakpoint gần nhau về breakpoint chuẩn.

### Giai đoạn sau khi tách module

- Component mới có thể viết mobile-first.
- Base là màn hình nhỏ, sau đó mở rộng bằng `min-width`.
- Không trộn mobile-first và desktop-first trong cùng một component.

## 6. Cấu trúc CSS đề xuất

```text
ui-src/styles/
  00-tokens.css
  10-base.css
  20-layout.css
  30-components.css
  40-tables.css
  50-modals.css
  responsive/
    mobile.css
    tablet.css
    desktop.css
  modules/
    dashboard.css
    properties.css
    crm.css
    appointments.css
    finance.css
```

Trong mỗi file module, selector phải có root rõ:

```css
.properties-page .property-table { ... }
.leads-page .lead-pipeline { ... }
.appointments-page .calendar-grid { ... }
```

Không dùng selector chung như `.card div`, `.modal span`, `table th:last-child` nếu chỉ muốn sửa một phân hệ.

## 7. Quy tắc cô lập thay đổi theo thiết bị

### Khi chỉ sửa điện thoại

1. Không sửa base selector nếu desktop hiện đúng.
2. Thêm override trong media query mobile chuẩn.
3. Prefix bằng root component/phân hệ.
4. Kiểm tra breakpoint ngay dưới và ngay trên 768 px.
5. Chụp lại desktop trước khi kết thúc.

Ví dụ đúng:

```css
@media (max-width: 767.98px) {
  .properties-page .filter-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
```

Ví dụ dễ làm hỏng desktop:

```css
.filter-grid {
  grid-template-columns: 1fr !important;
}
```

### Khi chỉ sửa desktop

```css
@media (min-width: 992px) {
  .properties-page .filter-grid {
    grid-template-columns: 1.1fr repeat(4, minmax(150px, 1fr));
  }
}
```

Không dựa vào `navigator.userAgent`. Thiết bị được xác định theo không gian hiển thị và khả năng tương tác, không theo tên trình duyệt.

## 8. DOM dùng chung và component riêng

### Nên dùng chung DOM khi

- Chỉ đổi số cột.
- Đổi padding/font/gap.
- Cho phép cuộn ngang.
- Ẩn nhãn phụ nhưng vẫn giữ thông tin truy cập được.
- Đổi vị trí bằng grid/flex `order` mà không thay luồng nghiệp vụ.

### Có thể dùng component riêng khi

- Desktop dùng sidebar, mobile dùng bottom navigation.
- Desktop dùng bảng nhiều cột, mobile cần thẻ tóm tắt có thao tác khác rõ rệt.
- Desktop dùng drag-and-drop, mobile cần menu “Chuyển trạng thái”.

Khi có hai component trình bày, chúng phải nhận cùng props và gọi cùng handler:

```jsx
<DesktopPropertyTable rows={rows} onOpen={openProperty} onEdit={editProperty} />
<MobilePropertyCards rows={rows} onOpen={openProperty} onEdit={editProperty} />
```

Không để mỗi component tự fetch hoặc tự tính KPI.

## 9. Một hook viewport duy nhất

Chỉ dùng JavaScript khi hành vi thực sự khác, không dùng để thay CSS layout đơn giản.

Nếu cần, tạo một hook tập trung:

```jsx
function useMediaQuery(query) {
  const [matches, setMatches] = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  React.useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}
```

Quy tắc:

- Không tạo listener `resize` trong từng component.
- Phải cleanup listener.
- Không lưu “isMobile” vào database/localStorage.
- Server render/fallback không được phụ thuộc trực tiếp vào `window`.

## 10. Sidebar và điều hướng mobile

Hiện tại hệ thống có:

- `.sidebar` cho desktop.
- `.sidebar.show-mobile` dạng overlay cho mobile.
- `.bottom-nav` cho mobile.

Hợp đồng mong muốn:

| Vùng | Sidebar | Bottom nav | Nội dung |
|---|---|---|---|
| `<768` | Ẩn, chỉ hiện khi mở menu | Hiện | Có padding đáy |
| `768–991` | Overlay hoặc compact theo quyết định thống nhất | Có thể hiện | Không bị che |
| `>=992` | Hiện cố định/collapsed | Ẩn | Có margin theo sidebar |

Không để cả sidebar fixed và bottom nav cùng chiếm layout desktop. Overlay mobile phải có backdrop, đóng khi click ngoài/Escape và không làm scroll body phía sau.

## 11. Dashboard và grid KPI

Quy tắc đề xuất:

```css
.kpi-grid { grid-template-columns: 1fr; }

@media (min-width: 768px) {
  .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 1200px) {
  .kpi-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
```

- Dùng `minmax(0, 1fr)` để text không đẩy vỡ grid.
- Số tiền dùng `font-variant-numeric: tabular-nums`.
- Cho phép giá trị dài co font trong giới hạn; không dùng font quá nhỏ để ép vừa.
- Chart phải quan sát kích thước container, không lấy width cố định từ desktop.

## 12. Bảng dữ liệu

Không cố ép tất cả cột vào màn hình điện thoại.

Ba chiến lược theo thứ tự ưu tiên:

1. Container cuộn ngang có dấu hiệu thị giác rõ.
2. Giữ cột quan trọng, ẩn cột phụ và đưa vào quick view.
3. Dùng mobile card view nếu bảng quá phức tạp.

Mẫu cuộn an toàn:

```css
.data-table-scroll {
  width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  -webkit-overflow-scrolling: touch;
}

.data-table-scroll table {
  min-width: 920px;
}
```

Quy tắc:

- Không giảm font xuống mức khó đọc chỉ để tránh scroll.
- Cột thao tác không được che cột dữ liệu.
- Nút tối thiểu 40–44 px vùng chạm trên mobile.
- Search và length selector không lặp lại.
- Footer phân trang phải xuống dòng có kiểm soát.

## 13. Pipeline trạng thái

Pipeline dài nên cuộn ngang trên mobile:

- Mỗi stage có `flex-shrink: 0`.
- Stage đang chọn phải có tương phản rõ.
- Không cắt chữ bằng cách giảm font quá mức.
- Có thể dùng `scroll-snap-type: x proximity`.
- Khi chọn stage, chỉ filter dữ liệu; không sinh bản sao state riêng cho mobile.

Desktop vẫn dùng toàn chiều ngang nếu đủ chỗ. CSS mobile phải nằm trong media query và không thay `flex` desktop.

## 14. Form và bộ lọc

Desktop:

- Nhiều cột, label nằm trên control.
- Các control cùng hàng có chiều cao đồng nhất.

Mobile:

- Một cột.
- Field quan trọng trước, tùy chọn nâng cao có thể thu gọn.
- Input tối thiểu 16 px để iOS không tự zoom.
- Không đặt hai nút nhỏ sát nhau.
- Footer modal có nút chính full-width hoặc hai nút cân đối.

Không thay đổi thứ tự field trong payload giữa mobile và desktop.

## 15. Modal và popup

Desktop:

- `width` theo size semantic, ví dụ small/medium/large.
- `max-height` theo viewport, body cuộn nội bộ.

Mobile:

```css
@media (max-width: 767.98px) {
  .app-modal {
    width: calc(100vw - 20px);
    max-width: none;
    max-height: calc(100dvh - 20px);
    border-radius: 14px;
  }

  .app-modal__body {
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}
```

- Ưu tiên `dvh` để tránh thanh địa chỉ mobile làm sai chiều cao.
- Header/footer không được biến mất khi body cuộn.
- Backdrop và logic đóng dùng chung cho mọi kích thước.
- Không tạo modal mobile riêng nếu chỉ khác width/grid.

## 16. Typography và vùng chạm

- Body mobile không dưới 14 px; input không dưới 16 px.
- Text phụ không dưới 12 px nếu vẫn là thông tin cần đọc.
- Vùng chạm khuyến nghị tối thiểu 44 × 44 px.
- Khoảng cách giữa hai thao tác nguy hiểm ít nhất 8 px.
- Không chỉ dùng màu để biểu thị trạng thái; cần nhãn/icon.
- Hỗ trợ `prefers-reduced-motion`.

## 17. Hình ảnh và hiệu năng

- Dùng `object-fit: cover` cho thumbnail, `contain` cho logo.
- Có `width`/`height` hoặc `aspect-ratio` để tránh layout shift.
- Dùng ảnh kích thước phù hợp; không tải ảnh gốc rất lớn cho thumbnail.
- Lazy-load ảnh ngoài viewport khi có thể.
- Không nhúng base64 lớn lặp lại trong nhiều component.
- Test mạng chậm và thiết bị CPU yếu, không chỉ desktop mạnh.

## 18. Ma trận kiểm thử bắt buộc

### Kích thước viewport

| Nhóm | Kích thước kiểm tra |
|---|---|
| Điện thoại nhỏ | 360 × 800 |
| Điện thoại phổ biến | 390 × 844 |
| Điện thoại ngang | 844 × 390 |
| Tablet dọc | 768 × 1024 |
| Tablet ngang/laptop nhỏ | 1024 × 768 |
| Desktop | 1366 × 768 |
| Desktop lớn | 1920 × 1080 |

### Màn hình cần kiểm tra

- Login và public portal.
- Dashboard.
- Properties: pipeline, filter, table, popup, form dài.
- Leads: list, Kanban, profile 360.
- Appointments: list và calendar.
- Deals/Tenancies: bảng tiền và modal.
- Users/RBAC/Settings.

### Trạng thái dữ liệu

- Không có dữ liệu.
- Dữ liệu ngắn.
- Tên/địa chỉ rất dài.
- Số tiền lớn.
- Nhiều tag/nút thao tác.
- Loading, error và permission denied.

## 19. Quy trình sửa chỉ mobile

1. Xác định root component và breakpoint.
2. Chụp baseline mobile và desktop.
3. Chỉ sửa selector trong media query mobile.
4. Kiểm tra 360, 390, 767, 768, 992 và 1366 px.
5. Kiểm tra click/touch, scroll và bàn phím ảo.
6. Chạy health check.
7. So sánh desktop trước/sau.
8. Commit riêng, không kèm redesign desktop.

## 20. Quy trình sửa chỉ desktop

1. Không sửa media query mobile nếu không cần.
2. Dùng `@media (min-width: 992px)` cho hành vi chỉ desktop.
3. Kiểm tra 991/992 px để tránh bước nhảy lỗi.
4. Kiểm tra sidebar expanded/collapsed.
5. Chụp lại mobile để chứng minh không hồi quy.

## 21. Anti-pattern cần tránh

- Hai file HTML gần giống nhau cho mobile/desktop.
- Hai API call riêng theo thiết bị.
- Hai formatter hoặc hai bộ trạng thái.
- CSS global + `!important` để chữa nhanh.
- Kiểm tra `window.innerWidth` trực tiếp trong render ở nhiều component.
- Dùng user-agent để chọn layout.
- Ẩn thông tin quan trọng trên mobile mà không có quick view.
- Đổi DOM order làm hỏng keyboard/screen reader.
- Chỉ test một điện thoại và một desktop.

## 22. Tổ chức commit và review

Ví dụ commit tốt:

```text
style(properties): isolate mobile filter layout below 768px
style(tables): standardize responsive overflow without desktop changes
test(ui): add viewport regression coverage for property modal
```

Pull request hoặc bản bàn giao phải ghi:

- Thiết bị/breakpoint được thay đổi.
- Selector/component bị ảnh hưởng.
- Ảnh trước/sau tại mobile.
- Bằng chứng desktop không đổi.
- Các màn hình và role đã kiểm tra.

## 23. Thứ tự áp dụng vào dự án

1. Chuẩn hóa breakpoint và tạo file responsive riêng.
2. Cô lập app shell/sidebar/bottom nav.
3. Chuẩn hóa modal và form grid.
4. Chuẩn hóa DataTable/table footer.
5. Dashboard grid và chart.
6. Properties.
7. Leads/Appointments.
8. Finance.
9. Settings/RBAC/Reports.

Mỗi bước phải độc lập, chạy được và không thay đổi dữ liệu hoặc API.

## 24. Definition of Done

Responsive được coi là chuẩn hóa khi:

- Mobile và desktop vẫn dùng chung logic/API.
- Breakpoint mới chỉ thuộc bộ canonical.
- Mỗi selector responsive có root component rõ.
- Không còn override rải rác cho cùng một component.
- Có regression test tại ít nhất 360, 768, 992 và 1366 px.
- Sidebar/bottom nav không chồng nội dung.
- Bảng, popup, form và pipeline sử dụng được bằng touch.
- Thay đổi mobile không tạo pixel/layout diff ngoài vùng breakpoint trên desktop.
- Tài liệu module được cập nhật khi hành vi responsive thay đổi.

