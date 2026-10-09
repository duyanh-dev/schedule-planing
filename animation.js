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