// ==========================================
        // LOGIC MENU NỔI (FAB) CHO MOBILE
        // ==========================================
        let isFabOpen = false;
        function toggleFab() {
            isFabOpen = !isFabOpen;
            const menu = document.getElementById('fab-menu');
            const icon = document.getElementById('fab-icon');
            const mainBtn = document.getElementById('fab-main-btn');

            if (isFabOpen) {
                // Mở Menu
                menu.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
                icon.classList.add('rotate-180'); // Xoay mũi tên chúc xuống
                mainBtn.classList.replace('bg-blue-600', 'bg-slate-800'); // Đổi màu nút thành đen
                mainBtn.classList.replace('shadow-blue-500/50', 'shadow-slate-900/50');
            } else {
                // Đóng Menu
                menu.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
                icon.classList.remove('rotate-180'); // Xoay mũi tên lên
                mainBtn.classList.replace('bg-slate-800', 'bg-blue-600');
                mainBtn.classList.replace('shadow-slate-900/50', 'shadow-blue-500/50');
            }
        }
// ==========================================
        // LOGIC XUẤT FULL UI RA PDF (Phiên bản an toàn, giữ nguyên layout)
        // ==========================================
        function exportFullPDF() {
            // Lấy trực tiếp phần tử cuộn chứa lịch trình
            const element = document.getElementById('main-scroll'); 
            
            // Xử lý nút đang tải
            const btnPC = document.getElementById('btn-pdf-pc');
            const btnMobile = document.getElementById('btn-pdf-mobile').querySelector('span');
            const originalPCText = btnPC ? btnPC.innerHTML : '';
            const originalMobileText = btnMobile ? btnMobile.innerText : '';
            
            if(window.innerWidth > 768 && btnPC) {
                btnPC.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xuất...';
            } else if(btnMobile) {
                btnMobile.innerText = 'Đang xuất...';
            }

            // Đảm bảo cuộn lên đầu trang trước khi chụp để không bị khoảng trắng
            window.scrollTo({ top: 0, behavior: 'instant' });
            if(element) element.scrollTop = 0;

            // Cấu hình PDF tối ưu
            const opt = {
                margin:       0,
                filename:     'Lich-Trinh-TripPlanner.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true,
                    // Giúp chụp chuẩn xác chiều rộng thực tế của khung nhìn hiện tại
                    windowWidth: element ? element.scrollWidth : document.body.scrollWidth,
                    scrollY: 0,
                    scrollX: 0
                }, 
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Tiến hành xuất
            html2pdf().set(opt).from(element).save().then(() => {
                // Khôi phục nút bấm
                if(window.innerWidth > 768 && btnPC) {
                    btnPC.innerHTML = originalPCText;
                } else if(btnMobile) {
                    btnMobile.innerText = originalMobileText;
                }
            }).catch(err => {
                console.error("Lỗi xuất PDF:", err);
                alert("Có lỗi xảy ra khi xuất PDF, vui lòng thử lại!");
                if(window.innerWidth > 768 && btnPC) btnPC.innerHTML = originalPCText;
                if(btnMobile) btnMobile.innerText = originalMobileText;
            });
        }