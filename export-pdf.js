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
        // HÀM TRUNG GIAO DỰNG CHO MOBILE (Đóng menu + Gọi PDF)
        // ==========================================
        function handleMobilePDF(action) {
            // 1. Đóng menu nổi ngay lập tức để tránh kẹt sự kiện
            toggleFab();
            
            // 2. Chạy hàm xuất PDF sau 150ms để hiệu ứng đóng menu mượt mà trước
            setTimeout(() => {
                exportFullPDF(action);
            }, 150);
        }

        // ==========================================
        // LOGIC XUẤT PDF CHUẨN BLOB (Tương thích tuyệt đối iPhone/Android/PC)
        // ==========================================
        function exportFullPDF(action = 'download') {
            const element = document.getElementById('main-scroll'); 
            if (!element) {
                alert("Không tìm thấy khung nội dung lịch trình!");
                return;
            }

            // Đổi text thông báo đang xử lý (nếu có trên PC)
            const btnPC = document.getElementById('btn-pdf-pc');
            const originalPCText = btnPC ? btnPC.innerHTML : '';
            if(window.innerWidth > 768 && btnPC) {
                btnPC.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xuất...';
            }

            // Đưa trang về đỉnh
            window.scrollTo({ top: 0, behavior: 'instant' });
            element.scrollTop = 0;

            const opt = {
                margin:       0,
                filename:     'Lich-Trinh-TripPlanner.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true,
                    windowWidth: element.scrollWidth || document.body.scrollWidth,
                    scrollY: 0,
                    scrollX: 0
                }, 
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Sử dụng cơ chế tạo Blob (Tệp ảo an toàn cho Mobile)
            html2pdf().set(opt).from(element).outputPdf('blob').then(function(pdfBlob) {
                const blobUrl = URL.createObjectURL(pdfBlob);
                
                const a = document.createElement('a');
                a.href = blobUrl;
                
                if (action === 'preview') {
                    // Xem trước: Mở tab mới chứa PDF
                    a.target = '_blank';
                } else {
                    // Tải về: Ép trình duyệt tải tệp xuống
                    a.download = 'Lich-Trinh-TripPlanner.pdf';
                }
                
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // Khôi phục nút trên PC
                if(window.innerWidth > 768 && btnPC) {
                    btnPC.innerHTML = originalPCText;
                }
            }).catch(err => {
                console.error("Lỗi tạo PDF:", err);
                alert("Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại!");
                if(window.innerWidth > 768 && btnPC) {
                    btnPC.innerHTML = originalPCText;
                }
            });
        }