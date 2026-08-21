# Phân hệ dashboard, báo cáo và nhật ký

## Phạm vi

KPI dashboard, funnel, lịch sắp tới, báo cáo theo kỳ, thông báo và activity log.

## Nguồn mã và dữ liệu

- UI: `DashboardView`, `ReportsView`, `NotificationBell`, `LogsView`.
- Backend: `getDashboardStats`, `getNotifications`, `getLogs` và query/view tài chính.
- Đối chiếu: `scripts/verify-business-logic.mjs`.

## Bất biến

- KPI chỉ tính bản ghi chưa soft-delete và đúng phạm vi role.
- Khoảng ngày dùng timezone Việt Nam và biên đầu/cuối rõ ràng.
- Doanh số/hoa hồng chỉ tính deal `Completed` theo `closed_at`.
- Số tiền còn lại chỉ tính deal mở `Token`/`Agreement`.
- Dashboard là dữ liệu dẫn xuất; không tự sở hữu hoặc ghi ngược bản ghi nghiệp vụ.
- Audit log không chứa password, token, service key hoặc payload nhạy cảm.

## Vấn đề cần xử lý

1. Một số KPI đang tổng hợp trong JavaScript; nên chuyển query/RPC có test khi dữ liệu lớn.
2. Báo cáo và dashboard có thể dùng filter ngày khác nhau.
3. Activity log hiện giới hạn 500 dòng, chưa có phân trang server.
4. Chưa có correlation/request ID giữa lỗi client, server và audit.
5. Export PDF/CSV cần snapshot filter và timezone trong metadata.

## Hướng cải thiện

- Tạo `ReportPeriod { from, to, timezone }` dùng chung.
- Dùng view/materialized view hoặc RPC cho KPI nặng; có index theo status/date/agent.
- Phân trang server cho log và báo cáo.
- Cache KPI ngắn hạn theo role/filter nhưng invalidation phải rõ.
- So sánh kết quả SQL, backend và fixture trong test.

## Kiểm thử tối thiểu

- Các kỳ tháng này/tháng trước/quý/năm/toàn thời gian.
- Biên cuối tháng, năm nhuận và UTC lệch ngày Việt Nam.
- Admin và Agent nhận KPI đúng phạm vi.
- Lịch sắp tới khớp phân hệ lịch hẹn.
- Tổng deal/paid/balance/commission khớp script đối chiếu.

