# Hướng Dẫn Đẩy Code Lên GitHub & Tự Động Cập Nhật Vercel

Tài liệu này hướng dẫn chi tiết quy trình quản lý mã nguồn và cách đẩy code từ máy tính lên kho chứa GitHub để Vercel tự động cập nhật website trực tuyến.

---

## 📌 1. Thông Tin Kho Chứa & Triển Khai

| Mục | Thông tin chi tiết |
|---|---|
| **Kho GitHub** | [https://github.com/vaominh9-ux/CRM_-BDS](https://github.com/vaominh9-ux/CRM_-BDS) |
| **Giao thức kết nối** | `SSH` (`git@github.com:vaominh9-ux/CRM_-BDS.git`) |
| **Nhánh chính** | `main` |
| **Trang web Vercel** | [https://crm-bds-aueg446.vercel.app](https://crm-bds-aueg446.vercel.app) |

---

## 🚀 2. Quy Trình Đẩy Code Chuẩn (Sau Mỗi Lần Sửa Code)

Mỗi khi bạn hoặc AI chỉnh sửa bất kỳ tệp nào trong dự án, chỉ cần mở **PowerShell / Terminal** tại thư mục dự án:
```powershell
cd "c:\Users\ASUS\Desktop\APP CRM BDS"
```

Và thực hiện 3 bước sau:

### Bước 1: Thêm toàn bộ các tệp đã sửa
```bash
git add .
```

### Bước 2: Tạo bản ghi chú cập nhật (Commit)
```bash
git commit -m "Mô tả nội dung bạn vừa thay đổi"
```
*(Ví dụ: `git commit -m "Cap nhat giao dien va du lieu moi"`)*

### Bước 3: Đẩy lên GitHub
```bash
git push origin main
```

---

## ⚡ 3. Lệnh Gom 1 Dòng Cực Nhanh (Copy & Paste)

Nếu bạn muốn làm tất cả các bước trên chỉ bằng **1 lần gõ phím**:

```powershell
git add . ; git commit -m "Cap nhat he thong CRM BDS" ; git push origin main
```

---

## 🔄 4. Cơ Chế Tự Động Triển Khai Của Vercel (CI/CD)

- Ngay khi lệnh `git push` hoàn thành, GitHub sẽ gửi tín hiệu tự động sang **Vercel**.
- Vercel sẽ tự động build và làm mới website tại **[https://crm-bds-aueg446.vercel.app](https://crm-bds-aueg446.vercel.app)** trong vòng **15 - 30 giây**.
- **Lưu ý**: Nếu vào web chưa thấy thay đổi, hãy nhấn **`Ctrl + F5`** trên trình duyệt để xóa bộ nhớ đệm (Cache).

---

## 🛠️ 5. Xử Lý Các Trường Hợp Thường Gặp

### A. Kiểm tra trạng thái các file đang sửa:
```bash
git status
```

### B. Kiểm tra lịch sử các lần đẩy code:
```bash
git log --oneline -n 5
```

### C. Nếu muốn hủy các thay đổi chưa lưu về lại bản mới nhất từ Git:
```bash
git restore .
```
