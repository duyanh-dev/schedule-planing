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
        // ==========================================
        // LOGIC XUẤT FULL UI RA PDF (Hỗ trợ Download & Preview)
        // ==========================================
        function exportFullPDF(action = 'download') {
            const element = document.getElementById('main-scroll'); 
            
            // Xử lý đổi text nút bấm đang tải
            const btnPC = document.getElementById('btn-pdf-pc');
            const originalPCText = btnPC ? btnPC.innerHTML : '';
            if(window.innerWidth > 768 && btnPC) {
                btnPC.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xuất...';
            }

            // Đưa thanh cuộn về đỉnh để tránh lỗi trắng đầu trang
            window.scrollTo({ top: 0, behavior: 'instant' });
            if(element) element.scrollTop = 0;

            const opt = {
                margin:       0,
                filename:     'Lich-Trinh-TripPlanner.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true,
                    windowWidth: element ? element.scrollWidth : document.body.scrollWidth,
                    scrollY: 0,
                    scrollX: 0
                }, 
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Tiến hành tạo file PDF bằng html2pdf
            const worker = html2pdf().set(opt).from(element);

            if (action === 'preview') {
                // --- TÙY CHỌN 1: XEM TRƯỚC (Mở tab mới dạng PDF) ---
                worker.outputPdf('datauristring').then(function(pdfDataUri) {
                    const win = window.open();
                    win.document.write('<iframe src="' + pdfDataUri + '" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>');
                    
                    if(window.innerWidth > 768 && btnPC) btnPC.innerHTML = originalPCText;
                });
            } else {
                // --- TÙY CHỌN 2: TẢI VỀ NGAY (Download) ---
                worker.save().then(() => {
                    if(window.innerWidth > 768 && btnPC) {
                        btnPC.innerHTML = originalPCText;
                    }
                }).catch(err => {
                    console.error("Lỗi tải PDF:", err);
                    if(window.innerWidth > 768 && btnPC) btnPC.innerHTML = originalPCText;
                });
            }
        }