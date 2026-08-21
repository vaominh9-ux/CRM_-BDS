# Phân hệ bất động sản và danh mục

## Phạm vi

Bất động sản, ảnh, tài liệu, chi phí, chủ sở hữu, khu vực hành chính và tiện ích.

## Bảng chính

`properties`, `property_images`, `property_documents`, `property_expenses`, `property_amenities`, `owners`, `locations`, `amenities`.

## UI và API chính

- UI: `PropertiesView`, `PropertyModal`, `PropertyDetailModal`, `OwnersView`, `LocationsView`, `AmenitiesView`.
- API đã có: `get/add/update/deleteProperty`, `uploadPropertyImage`, CRUD owner/location/amenity, `getPublicPortal`.
- API còn thiếu: `addPropertyExpense`, `uploadPropertyDoc`, `removePropertyDoc`, `getPropertyDuplicates`, `emailPropertyPack`.

## Bất biến

- Giá là số VNĐ nguyên; `listing_type` và `status` dùng enum chuẩn.
- Ảnh/tài liệu lưu path hoặc URL storage, không lưu base64 dài trong bảng nghiệp vụ.
- Xóa property/owner/location là soft delete khi còn cần truy vết.
- Public portal không trả tên/điện thoại chủ sở hữu, agent nội bộ hoặc tài liệu riêng.
- Cây địa chỉ tham chiếu bằng `parent_id`; không ghép chuỗi địa chỉ để thay khóa ngoại.

## Vấn đề cần xử lý

1. Form property đang quá lớn và trộn upload, lookup, mapping, validation.
2. Dữ liệu cũ còn tên/đơn vị tiếng Anh; cần chuẩn hóa tại importer/mapping.
3. URL ảnh phải được chuẩn hóa giữa public bucket và signed URL.
4. Chưa có transaction hoàn chỉnh khi lưu property cùng ảnh/tiện ích.
5. Tài liệu, chi phí, chống trùng và gửi bộ hồ sơ chưa hoàn tất Supabase.

## Hướng tách

- `property.api`: contract và mapper.
- `property.schema`: validation form/import.
- `property-form`: thông tin cơ bản, địa chỉ, chủ sở hữu, tiện ích, media.
- `property-list`: filter, table, pipeline, quick view.
- `property-storage`: upload/delete/reorder và policy bucket.

## Kiểm thử tối thiểu

- Tạo/sửa property giữ đúng VNĐ, diện tích, địa chỉ và agent.
- Ảnh chính duy nhất, thứ tự ảnh ổn định, ảnh lỗi có placeholder.
- Agent không đọc/sửa property ngoài phạm vi.
- Public portal không rò trường riêng tư.
- Thay trạng thái cập nhật đúng KPI dashboard.

