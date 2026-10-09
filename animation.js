// ==========================================
// VUỐT MỞ / ĐÓNG SIDEBAR (MOBILE)
// ==========================================
(function () {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    const EDGE = 20;                  // vùng mép trái để bắt đầu vuốt mở (px)
    const isMobile = () => window.innerWidth < 768;
    const isOpen = () => !sb.classList.contains('-translate-x-full');
    let startX = 0, startY = 0, dx = 0, dragging = false, locked = null, width = 0;

    document.addEventListener('touchstart', e => {
        if (!isMobile() || e.touches.length !== 1) return;
        const t = e.touches[0];
        if (!isOpen() && t.clientX > EDGE) return;   // đóng: chỉ bắt đầu từ mép trái
        startX = t.clientX; startY = t.clientY; dx = 0;
        width = sb.offsetWidth; locked = null; dragging = true;
    }, { passive: true });

    document.addEventListener('touchmove', e => {
        if (!dragging) return;
        const t = e.touches[0];
        const mx = t.clientX - startX, my = t.clientY - startY;
        if (locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
            locked = Math.abs(mx) > Math.abs(my) * 1.2 ? 'x' : 'y';
            if (locked === 'x') { sb.style.transition = 'none'; sb.classList.add('sb-dragging'); }
        }
        if (locked !== 'x') return;
        dx = mx;
        const base = isOpen() ? 0 : -width;
        const x = Math.max(-width, Math.min(0, base + dx));
        sb.style.transform = `translateX(${x}px)`;
    }, { passive: true });

    function end() {
        if (!dragging) return;
        dragging = false;
        sb.classList.remove('sb-dragging');
        if (locked !== 'x') return;
        const open = isOpen();
        const shouldToggle = open ? dx < -width * 0.3 : dx > width * 0.3;
        sb.getBoundingClientRect();        // chốt vị trí hiện tại
        sb.style.transition = '';          // bật lại transition của CSS
        sb.style.transform = '';           // CSS tự trượt tiếp từ vị trí ngón tay
        if (shouldToggle) toggleSidebar();
    }
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
})();

// ==========================================
// CHECKLIST MODAL: KÉO XUỐNG ĐỂ ĐÓNG + INTRO ANIMATION
// ==========================================
(function () {
    const modal = document.getElementById('checklist-modal');
    const sheet = document.getElementById('cl-sheet');
    const list = document.getElementById('checklist-container');
    const backdrop = modal && modal.querySelector('.cl-backdrop');
    if (!modal || !sheet || !backdrop) return;

    const isMobile = () => window.innerWidth < 768;
    const isOpen = () => modal.classList.contains('active');

    // Mỗi lần mở: bật class cl-intro trong 1 giây để các hàng chạy animation, sau đó tắt
    // (render lại danh sách khi tick/thêm/xóa sẽ không chạy lại hiệu ứng)
    let introTimer, wasOpen = isOpen();
    new MutationObserver(() => {
        const open = isOpen();
        if (open && !wasOpen) {
            clearTimeout(introTimer);
            modal.classList.add('cl-intro');
            introTimer = setTimeout(() => modal.classList.remove('cl-intro'), 1400); // cũ: 1100
        }
        wasOpen = open;
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });

    // Kéo sheet xuống
    let startY = 0, lastY = 0, lastT = 0, vel = 0, dy = 0, mode = null, tracking = false;

    sheet.addEventListener('touchstart', e => {
        if (!isMobile() || !isOpen() || e.touches.length !== 1) return;
        if (e.target.closest('input')) return;
        startY = lastY = e.touches[0].clientY;
        lastT = e.timeStamp; vel = 0; dy = 0; mode = null; tracking = true;
    }, { passive: true });

    sheet.addEventListener('touchmove', e => {
        if (!tracking) return;
        const y = e.touches[0].clientY;
        const d = y - startY;

        if (mode === null) {
            if (Math.abs(d) < 6) return;
            const inList = list.contains(e.target);
            // Chỉ kéo sheet khi vuốt xuống, và nếu đang ở trong danh sách thì phải đang ở đỉnh
            mode = (d > 0 && (!inList || list.scrollTop <= 0)) ? 'drag' : 'scroll';
            if (mode === 'drag') {
                sheet.style.transition = 'none';
                backdrop.style.transition = 'none';
            }
        }
        if (mode !== 'drag') return;

        e.preventDefault();
        dy = d > 0 ? d : d / 6;                         // kéo ngược lên: lực cản như dây chun
        vel = (y - lastY) / Math.max(1, e.timeStamp - lastT);
        lastY = y; lastT = e.timeStamp;

        sheet.style.translate = `0 ${dy}px`;
        backdrop.style.opacity = String(1 - Math.min(Math.max(dy, 0) / sheet.offsetHeight, 1) * 0.8);
    }, { passive: false });

    function end() {
        if (!tracking) return;
        tracking = false;
        if (mode !== 'drag') { mode = null; return; }
        mode = null;

        const shouldClose = dy > 120 || vel > 0.6;
        sheet.getBoundingClientRect();                  // chốt vị trí hiện tại
        sheet.style.transition = '';
        backdrop.style.transition = '';
        sheet.style.translate = '';                     // CSS tự trượt tiếp từ vị trí ngón tay
        backdrop.style.opacity = '';
        if (shouldClose) closeChecklistModal();
    }
    sheet.addEventListener('touchend', end, { passive: true });
    sheet.addEventListener('touchcancel', end, { passive: true });

    // Phím Esc để đóng (PC)
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) closeChecklistModal(); });
})();