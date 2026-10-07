// ==========================================
// FILE: day-manager.js (Đã fix lỗi Not Defined)
// QUẢN LÝ CHẾ ĐỘ CHỈNH SỬA NGÀY (JIGGLE MODE)
// ==========================================

window.isDayEditMode = false;
let dayPressTimer = null;

// Gắn trực tiếp vào window để HTML có thể gọi được
window.startDayPress = (date) => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (window.isDayEditMode || !trip || trip.days.length <= 1) return;

    dayPressTimer = setTimeout(() => {
        window.isDayEditMode = true;
        renderDaysTabs(); // Render lại để bật hiệu ứng rung lắc
        
        document.addEventListener('click', handleOutsideClickToExitEditMode);
        document.addEventListener('touchstart', handleOutsideClickToExitEditMode);
    }, 500); 
};

window.endDayPress = () => {
    if (dayPressTimer) {
        clearTimeout(dayPressTimer);
        dayPressTimer = null;
    }
};

const handleOutsideClickToExitEditMode = (e) => {
    const tabsContainer = document.getElementById('days-tabs');
    if (tabsContainer && !tabsContainer.contains(e.target)) {
        window.isDayEditMode = false;
        renderDaysTabs();
        document.removeEventListener('click', handleOutsideClickToExitEditMode);
        document.removeEventListener('touchstart', handleOutsideClickToExitEditMode);
    }
};

window.confirmDeleteDay = (dateToDelete) => {
    // Nếu event tồn tại (gọi từ HTML), chặn nổi bọt
    if (typeof event !== 'undefined') {
        event.stopPropagation();
    }
    
    if(!confirm('Bạn có chắc muốn xóa ngày này? Toàn bộ hoạt động trong ngày sẽ bị xóa vĩnh viễn.')) return;

    const trip = state.trips.find(t => t.id === state.activeTripId);
    
    // 1. Lọc bỏ ngày bị xóa
    trip.days = trip.days.filter(d => d.date !== dateToDelete);
    
    // 2. Cập nhật lại ngày Start / End của chuyến đi
    if (trip.days.length > 0) {
        const dates = trip.days.map(d => new Date(d.date));
        trip.startDate = new Date(Math.min(...dates)).toISOString().slice(0, 10);
        trip.endDate = new Date(Math.max(...dates)).toISOString().slice(0, 10);
        
        // 3. Đổi active tab nếu ngày đang chọn bị xóa
        if (state.activeDayDate === dateToDelete) {
            state.activeDayDate = trip.days[0].date;
        }
    }

    // 4. Lưu và render lại
    if(typeof saveState === 'function') saveState();
    
    renderDaysTabs();
    if(typeof renderTimeline === 'function') renderTimeline();
};