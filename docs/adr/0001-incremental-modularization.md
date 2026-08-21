# ADR 0001: Tách module từng bước

- Trạng thái: Chấp nhận
- Ngày: 2026-08-21

## Bối cảnh

Giao diện đang nằm trong một tệp HTML lớn, đồng thời phải tương thích cầu nối Apps Script. Việc thay framework hoặc tách toàn bộ một lần có nguy cơ làm hỏng nhiều popup, bảng và luồng nghiệp vụ vốn đã được chỉnh trực tiếp.

## Quyết định

Giữ runtime hiện tại trong ngắn hạn và tách dần theo lát dọc. Thứ tự ưu tiên: tiện ích dùng chung -> Properties -> Leads/Appointments -> Deals/Tenancies -> phần còn lại. Trong mỗi lát, giữ nguyên tên method và response envelope, thêm kiểm thử trước khi di chuyển.

Các module mới phải tách rõ `api`, `model/mapper`, `components`, `styles` và `tests`. Không thêm một framework trạng thái hoặc UI library thứ hai nếu chưa có ADR riêng.

Quy trình thực thi, cấu trúc trung gian và tiêu chí kiểm chứng nằm trong `docs/HTML_MODULARIZATION_GUIDE.md`.

## Hệ quả

- Tiến độ tách chậm hơn nhưng giảm hồi quy.
- Một thời gian sẽ tồn tại mã mới và monolith song song.
- Cần contract test để bảo đảm Supabase và fallback trả cùng hình dạng dữ liệu.
- Khi đủ module và test, có thể đưa mã sang toolchain build hiện đại mà không đổi nghiệp vụ.
