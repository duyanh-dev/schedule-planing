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
        // LOGIC XUẤT FULL UI RA PDF (CHUẨN NATIVE & CHỐNG LỆCH LAYOUT)
        // ==========================================
        function exportFullPDF() {
            const element = document.getElementById('main-scroll'); 
            
            // Xử lý nút UI
            const btnPC = document.getElementById('btn-pdf-pc');
            const btnMobile = document.getElementById('btn-pdf-mobile') ? document.getElementById('btn-pdf-mobile').querySelector('span') : null;
            const originalPCText = btnPC ? btnPC.innerHTML : '';
            const originalMobileText = btnMobile ? btnMobile.innerText : '';
            
            if(window.innerWidth > 768 && btnPC) {
                btnPC.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xuất...';
            } else if(btnMobile) {
                btnMobile.innerText = 'Đang xuất...';
            }

            // Khôi phục thanh cuộn về 0 để không bị lệch/trắng trang
            window.scrollTo({ top: 0, behavior: 'instant' });
            if(element) element.scrollTop = 0;

            const isMobile = window.innerWidth <= 768;

            // Cấu hình PDF
            const opt = {
                margin:       0,
                filename:     'Lich-Trinh-TripPlanner.pdf',
                image:        { type: 'jpeg', quality: 1 }, // Tăng chất lượng ảnh lên tối đa
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true,
                    scrollY: 0,
                    scrollX: 0,
                    // KHÓA CHIỀU RỘNG: 
                    // - SP: Khóa đúng bằng chiều rộng điện thoại để giữ nguyên UI Mobile
                    // - PC: Khóa bằng chiều rộng thực của thẻ chứa để không bị lệch lề
                    windowWidth: isMobile ? window.innerWidth : element.clientWidth,
                }, 
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Tiến hành xuất ra file thô (Blob)
            html2pdf().set(opt).from(element).outputPdf('blob').then(async (pdfBlob) => {
                const fileName = 'Lich-Trinh-TripPlanner.pdf';
                const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
                
                // Nhận diện thiết bị iOS
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

                // NẾU LÀ IOS VÀ HỖ TRỢ NATIVE SHARE
                if (isIOS && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        // Gọi menu Share gốc của iPhone (Lưu vào tệp, Zalo, AirDrop...)
                        await navigator.share({
                            files: [file],
                            title: 'Lịch Trình Chuyến Đi',
                            text: 'Gửi bạn lịch trình chuyến đi từ TripPlanner'
                        });
                    } catch (err) {
                        console.log("Người dùng hủy hoặc lỗi Share:", err);
                        fallbackDownload(pdfBlob, fileName);
                    }
                } else {
                    // Nếu là Android / PC, ép tải xuống bình thường
                    fallbackDownload(pdfBlob, fileName);
                }

                restoreButtons();
            }).catch(err => {
                console.error("Lỗi xuất PDF:", err);
                alert("Có lỗi xảy ra khi xuất PDF, vui lòng thử lại!");
                restoreButtons();
            });

            // Hàm tải xuống truyền thống
            function fallbackDownload(blob, name) {
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(blobUrl);
                }, 200);
            }

            // Hàm phục hồi nút bấm
            function restoreButtons() {
                if(window.innerWidth > 768 && btnPC) btnPC.innerHTML = originalPCText;
                if(btnMobile) btnMobile.innerText = originalMobileText;
            }
        }