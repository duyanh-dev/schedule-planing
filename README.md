# ✈️ TripPlanner - Ứng dụng Quản lý Lịch trình Du lịch

![Version](https://img.shields.io/badge/version-1.0.0_Beta-blue.svg)
![Platform](https://img.shields.io/badge/platform-Web_%7C_iOS_%7C_Android-lightgrey.svg)
![Tech Stack](https://img.shields.io/badge/tech-HTML5_%7C_TailwindCSS_%7C_VanillaJS-orange.svg)

**TripPlanner** là một ứng dụng nền web (Web App) quản lý lịch trình du lịch hiện đại, được thiết kế với triết lý "Mobile-First" và phong cách giao diện tối giản. Ứng dụng giúp người dùng lập kế hoạch chi tiết cho các chuyến đi, quản lý từng hoạt động theo dòng thời gian (timeline), và quy đổi ngân sách ngoại tệ một cách trực quan.

## ✨ Điểm nổi bật & Tính năng chính

### 🎨 Giao diện Hiện đại (Modern UI/UX)
*   **Thiết kế Glassmorphism:** Sử dụng hiệu ứng kính mờ (backdrop-blur) tinh tế cho các thanh menu, footer, và các modal, mang lại cảm giác sang trọng giống hệt các ứng dụng Native (như iOS).
*   **Thẻ hoạt động trực quan (Timeline):** Lịch trình được trình bày dưới dạng dòng thời gian, kết hợp icon sinh động phân loại theo từng mục đích (di chuyển, ăn uống, tham quan, khách sạn...).
*   **Tùy biến ảnh bìa:** Tự động lấy ảnh bìa sống động cho từng chuyến đi, có lớp phủ gradient (cover-gradient) giúp chữ luôn nổi bật.

### 📱 Tối ưu hóa tuyệt đối cho Thiết bị di động (Đặc biệt là iPhone/Safari)
*   **Native Scroll & Tràn viền (Safe Area):** Xóa bỏ giới hạn khung hình, hỗ trợ thanh địa chỉ Safari tự động thu nhỏ khi vuốt, mang lại không gian hiển thị 100% tràn viền (viewport-fit=cover).
*   **Chống kẹt UI (Anti-Rubber-Banding):** Đồng bộ màu `theme-color` với nền web, loại bỏ các dải màu thừa khi người dùng lướt quá tay ở đỉnh/đáy trang.
*   **Responsive Forms:** Các form nhập liệu (nhập ngày, giờ) được ép kích thước chuẩn (`min-w-0`), xếp chồng thông minh giúp không bao giờ bị lẹm viền hay trào khung trên màn hình nhỏ.

### 💻 Trải nghiệm Đa nền tảng mượt mà
*   **Sidebar thông minh:** Trên PC/iPad, thanh danh sách chuyến đi (Sidebar) được ghim cố định bên trái, nội dung tự động lùi sang phải gọn gàng. Trên Mobile, thanh Menu tự động ẩn và gọi ra thông qua nút bấm.
*   **Kéo thả cuộn Tab (Drag-to-Scroll):** Hỗ trợ tính năng nhấn giữ chuột để kéo lướt danh sách ngày trên máy tính, mượt mà như thao tác vuốt trên điện thoại cảm ứng.

### ⚡ Chức năng Cốt lõi Mạnh mẽ
*   **Tạo hoạt động thông minh:** Hỗ trợ form thêm hoạt động đơn lẻ và **Form tạo hàng loạt (Bulk Add)** giúp tiết kiệm thời gian lên lịch trình.
*   **Banner "Sắp diễn ra":** Tính năng theo dõi thời gian thực. Banner bám dính lơ lửng thông báo hoạt động sắp diễn ra tiếp theo dựa trên giờ hệ thống.
*   **Tích hợp Flatpickr:** Bộ lịch chọn ngày (Date Picker) siêu mượt, được khóa cứng dạng tĩnh (static) để chống đơ lag trên điện thoại.
*   **Quy đổi tiền tệ:** Tích hợp tính năng chuyển đổi ngân sách dự kiến ra nhiều loại ngoại tệ (THB, SGD, JPY, USD, EUR...) cực kỳ tiện lợi cho các chuyến xuất ngoại.

## 🛠️ Công nghệ sử dụng
*   **Giao diện (UI/Styling):** HTML5, [Tailwind CSS](https://tailwindcss.com/) (sử dụng qua CDN cho tốc độ phát triển nhanh).
*   **Logic (Scripting):** Vanilla JavaScript (ES6+), không phụ thuộc framework nặng, giúp ứng dụng load tức thì.
*   **Thư viện bổ trợ:** 
    *   [FontAwesome](https://fontawesome.com/) (Vector Icons).
    *   [Flatpickr](https://flatpickr.js.org/) (Xử lý UI chọn ngày tháng).

## 🚀 Cài đặt & Sử dụng
Dự án được xây dựng thuần túy bằng frontend, không yêu cầu cài đặt môi trường phức tạp:
1. Clone hoặc tải mã nguồn về máy tính.
2. Mở file `index.html` bằng bất kỳ trình duyệt web nào (Chrome, Safari, Edge...).
3. *Khuyến nghị:* Sử dụng extension **Live Server** trên VS Code để trải nghiệm tốt nhất trong quá trình chỉnh sửa mã nguồn.

## 🤝 Hỗ trợ & Phản hồi
Nếu bạn gặp bất kỳ vấn đề nào hoặc có ý tưởng đóng góp cho dự án, vui lòng liên hệ:
*   **Bản quyền:** © 2026 Developed by duyanh.dev. All rights reserved.
*   **Email:** [Nhấn vào đây để gửi email hỗ trợ](mailto:emailcuaban@gmail.com?subject=Góp%20ý%20cho%20ứng%20dụng%20TripPlanner)

---
*Made with ❤️ by duyanh-dev*
