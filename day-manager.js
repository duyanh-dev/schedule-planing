// ==========================================
// FILE: day-manager.js
// QUẢN LÝ CHẾ ĐỘ CHỈNH SỬA NGÀY (JIGGLE MODE)
// ==========================================

window.isDayEditMode = false;
let dayPressTimer = null;
let pressStartX = 0;
let pressStartY = 0;

window.startDayPress = (date, e) => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (window.isDayEditMode || !trip || trip.days.length <= 1) return;

    // Lưu lại tọa độ lúc vừa chạm ngón tay/chuột vào
    if (e) {
        if (e.touches && e.touches.length > 0) {
            pressStartX = e.touches[0].clientX;
            pressStartY = e.touches[0].clientY;
        } else {
            pressStartX = e.clientX;
            pressStartY = e.clientY;
        }
    }

    dayPressTimer = setTimeout(() => {
        window.isDayEditMode = true;
        renderDaysTabs(); // Bật hiệu ứng rung lắc
        
        document.addEventListener('click', handleOutsideClickToExitEditMode);
        document.addEventListener('touchstart', handleOutsideClickToExitEditMode);
    }, 500); 
};

// Hàm mới: Hủy "Nhấn giữ" nếu người dùng đang vuốt/cuộn màn hình
window.moveDayPress = (e) => {
    if (!dayPressTimer) return;
    
    let currentX = 0, currentY = 0;
    if (e && e.touches && e.touches.length > 0) {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    } else if (e) {
        currentX = e.clientX;
        currentY = e.clientY;
    }

    // Nếu ngón tay trượt đi quá 10px (đang scroll) -> Hủy bộ đếm
    if (Math.abs(currentX - pressStartX) > 10 || Math.abs(currentY - pressStartY) > 10) {
        window.endDayPress();
    }
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
    if (typeof event !== 'undefined') event.stopPropagation();
    
    if(!confirm('Bạn có chắc muốn xóa ngày này? Toàn bộ hoạt động trong ngày sẽ bị xóa vĩnh viễn.')) return;

    const trip = state.trips.find(t => t.id === state.activeTripId);
    
    // Lọc bỏ ngày bị xóa
    trip.days = trip.days.filter(d => d.date !== dateToDelete);
    
    // Cập nhật lại ngày Start / End
    if (trip.days.length > 0) {
        const dates = trip.days.map(d => new Date(d.date));
        trip.startDate = new Date(Math.min(...dates)).toISOString().slice(0, 10);
        trip.endDate = new Date(Math.max(...dates)).toISOString().slice(0, 10);
        
        // Đổi active tab nếu ngày đang chọn bị xóa
        if (state.activeDayDate === dateToDelete) {
            state.activeDayDate = trip.days[0].date;
        }
    }

    if(typeof saveState === 'function') saveState();
    
    // TẮT CHẾ ĐỘ RUNG SAU KHI XÓA
    window.isDayEditMode = false;
    
    // Cập nhật ĐỒNG LOẠT toàn bộ UI để sửa lỗi "chưa update Trip"
    renderDaysTabs();
    if(typeof renderTimeline === 'function') renderTimeline();
    if(typeof renderSidebar === 'function') renderSidebar(); // Tên hàm render menu trái của bạn
    if(typeof renderHeader === 'function') renderHeader();   // Tên hàm render Header ảnh bìa
};