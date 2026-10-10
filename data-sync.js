// ==========================================
// DATA SYNC LOGIC (SINGLE TRIP EXPORT/IMPORT)
// ==========================================

// --- 1. XUẤT 1 CHUYẾN ĐI ĐANG MỞ RA FILE ---
window.exportSingleTrip = () => {
    // Tìm chuyến đi đang được mở dựa vào activeTripId
    const currentTrip = state.trips.find(t => t.id === state.activeTripId);
    
    if (!currentTrip) {
        alert("Không tìm thấy dữ liệu chuyến đi này!");
        return;
    }

    // Tự động tìm tên chuyến đi (hỗ trợ name, title, tripName) hoặc dùng tên mặc định
    const rawName = currentTrip.name || currentTrip.title || currentTrip.tripName || "Chuyen_di";
    
    // Đóng gói riêng Object của chuyến đi này
    const blob = new Blob([JSON.stringify(currentTrip)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    
    // Lọc ký tự đặc biệt để tạo tên file an toàn
    const safeName = rawName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10); 
    a.download = `Trip_${safeName}_${dateStr}.json`; 
    
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// --- 2. MODAL THÔNG BÁO NHẬP THÀNH CÔNG (THÊM) ---
window.showImportSuccess = (tripTitle) => {
    const modal = document.getElementById('import-success-modal');
    const card = document.getElementById('import-success-card');

    // Dùng textContent để tên chuyến đi không bị hiểu thành HTML
    document.getElementById('import-success-msg').textContent = `Chuyến đi "${tripTitle}" đã được thêm vào danh sách của bạn.`;

    modal.classList.remove('opacity-0', 'pointer-events-none');
    // Đợi 1 frame để transition chạy mượt
    requestAnimationFrame(() => {
        card.classList.remove('scale-90', 'opacity-0');
    });
};

window.reloadAfterImport = () => {
    window.location.reload();
};

// --- 3. NHẬP FILE VÀO DANH SÁCH CHUYẾN ĐI (DASHBOARD) ---
window.importSingleTrip = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = ''; // Reset input để có thể chọn lại đúng file đó

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedTrip = JSON.parse(e.target.result); 
            
            // 🔎 DEBUG: In dữ liệu ra console để theo dõi
            console.log("Dữ liệu đọc được từ file:", importedTrip);
            
            // 1. Tự động tìm thuộc tính Tên chuyến đi (bất kể bạn đặt tên biến là gì)
            const tripTitle = importedTrip.name || importedTrip.title || importedTrip.tripName || importedTrip.destination;

            // 2. Validate nới lỏng: Chỉ cần có Tên và có mảng Ngày (days)
            if (!tripTitle) {
                throw new Error("File bị thiếu Tên chuyến đi (name/title).");
            }
            if (!importedTrip.days || !Array.isArray(importedTrip.days)) {
                // Nếu file bị thiếu mảng days, tự động cấp cho nó 1 mảng rỗng thay vì báo lỗi
                console.warn("Mảng days không tồn tại, tự động tạo mới.");
                importedTrip.days = [];
            }

            // 3. Cấp lại ID mới để tránh trùng lặp
            const newTripId = 'trip_' + Date.now();
            importedTrip.id = newTripId;
            
            importedTrip.days.forEach((day, index) => {
                day.id = `day_${Date.now()}_${index}`;
            });

            // 4. Đẩy dữ liệu vào state và Lưu
            if (typeof state !== 'undefined' && Array.isArray(state.trips)) {
                state.trips.push(importedTrip);
                
                // Gọi hàm lưu dữ liệu của bạn (nếu có)
                if (typeof saveData === 'function') {
                    saveData();
                } else {
                    localStorage.setItem('wanderlog_trips', JSON.stringify(state.trips));
                }
                
                // SỬA: thay alert + reload mặc định bằng modal liquid glass
                showImportSuccess(tripTitle);
            } else {
                throw new Error("Biến state.trips chưa được khởi tạo!");
            }
            
        } catch (error) {
            console.error("Chi tiết Lỗi Import:", error);
            alert("❌ Không thể nạp file: " + error.message);
        }
    };
    reader.readAsText(file);
};