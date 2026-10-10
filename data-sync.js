// ==========================================
// DATA SYNC LOGIC (SINGLE TRIP EXPORT/IMPORT)
// ==========================================

// Chuyến đi đã đọc từ file, đang chờ người dùng xác nhận
let pendingImportTrip = null;

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

// --- 2. KIỂM TRA TRÙNG DỮ LIỆU ---
const getTripTitle = (t) => t.name || t.title || t.tripName || t.destination || '';

// Tên trường đang chứa tên chuyến đi (theo cùng thứ tự ưu tiên với getTripTitle)
const getTitleKey = (t) => ['name', 'title', 'tripName', 'destination'].find(k => t[k]);

// (THÊM) Tạo tên không trùng: "Tên" -> "Tên (1)" -> "Tên (2)"...
const getUniqueTitle = (title) => {
    const existing = new Set(
        (state.trips || []).map(t => getTripTitle(t).trim().toLowerCase())
    );
    if (!existing.has(title.trim().toLowerCase())) return title; // Không trùng, giữ nguyên

    // Bỏ hậu tố " (số)" cũ để không bị thành "Tên (1) (1)"
    const base = title.trim().replace(/\s*\(\d+\)$/, '');
    let n = 1;
    while (existing.has(`${base} (${n})`.toLowerCase())) n++;
    return `${base} (${n})`;
};

// Dấu vân tay nội dung: chỉ so ngày + hoạt động, bỏ qua id của ngày (vì import luôn cấp id mới)
const getDaysFingerprint = (trip) => JSON.stringify(
    (trip.days || []).map(d => ({ date: d.date, activities: d.activities || [] }))
);

const formatISODate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
};

const getTripRangeText = (trip) => {
    if (!trip.days || trip.days.length === 0) return '';
    const start = formatISODate(trip.days[0].date);
    const end = formatISODate(trip.days[trip.days.length - 1].date);
    return start === end ? start : `${start} → ${end}`;
};

// Trả về { exact: [...], similar: [...] } các chuyến đi đang có bị trùng với chuyến đi sắp nhập
const findDuplicateTrips = (importedTrip) => {
    const result = { exact: [], similar: [] };
    if (typeof state === 'undefined' || !Array.isArray(state.trips)) return result;

    const normTitle = getTripTitle(importedTrip).trim().toLowerCase();
    const importedDays = importedTrip.days || [];
    const importedStart = importedDays.length ? importedDays[0].date : null;
    const importedEnd = importedDays.length ? importedDays[importedDays.length - 1].date : null;
    const importedFingerprint = getDaysFingerprint(importedTrip);

    state.trips.forEach(existing => {
        const sameTitle = getTripTitle(existing).trim().toLowerCase() === normTitle;
        const exDays = existing.days || [];
        const sameRange = importedStart !== null && exDays.length > 0
            && exDays[0].date === importedStart
            && exDays[exDays.length - 1].date === importedEnd;

        if (sameTitle && getDaysFingerprint(existing) === importedFingerprint) {
            result.exact.push(existing);
        } else if (sameTitle || sameRange) {
            result.similar.push({ trip: existing, sameTitle, sameRange });
        }
    });
    return result;
};

// --- 3. MODAL XÁC NHẬN ---
window.showImportConfirm = (trip, tripTitle) => {
    const modal = document.getElementById('import-confirm-modal');
    const card = document.getElementById('import-confirm-card');
    const dupBox = document.getElementById('import-confirm-dup');
    const btnText = document.getElementById('import-confirm-btn-text');

    const totalDays = trip.days.length;
    const totalActivities = trip.days.reduce(
        (sum, d) => sum + (Array.isArray(d.activities) ? d.activities.length : 0), 0
    );

    // Dùng textContent để tên chuyến đi không bị hiểu thành HTML
    document.getElementById('import-confirm-title').textContent = `"${tripTitle}"`;
    document.getElementById('import-confirm-info').textContent = `${totalDays} ngày · ${totalActivities} hoạt động`;

    // Kiểm tra trùng
    const dup = findDuplicateTrips(trip);
    const lines = [];
    dup.exact.forEach(t => {
        lines.push(`• "${getTripTitle(t)}" (${getTripRangeText(t)}): giống hoàn toàn`);
    });
    dup.similar.forEach(({ trip: t, sameTitle, sameRange }) => {
        const reason = (sameTitle && sameRange) ? 'cùng tên, cùng ngày, nội dung khác'
                     : sameTitle ? 'cùng tên'
                     : 'cùng khoảng ngày';
        lines.push(`• "${getTripTitle(t)}" (${getTripRangeText(t)}): ${reason}`);
    });

    // (THÊM) Báo trước tên mới nếu bị đổi hậu tố
    const finalTitle = getUniqueTitle(tripTitle);
    if (finalTitle !== tripTitle) {
        lines.push(`\n→ Sẽ được lưu với tên "${finalTitle}"`);
    }

    if (lines.length > 0) {
        document.getElementById('import-confirm-dup-title').textContent = dup.exact.length > 0
            ? 'Chuyến đi này đã có trong danh sách'
            : 'Có chuyến đi tương tự trong danh sách';
        document.getElementById('import-confirm-dup-list').textContent = lines.join('\n');
        dupBox.classList.remove('hidden');
        btnText.textContent = 'Vẫn nhập';
    } else {
        dupBox.classList.add('hidden');
        btnText.textContent = 'Nhập chuyến đi';
    }

    modal.classList.remove('opacity-0', 'pointer-events-none');
    requestAnimationFrame(() => {
        card.classList.remove('scale-90', 'opacity-0');
    });
};

const hideImportConfirm = () => {
    const modal = document.getElementById('import-confirm-modal');
    const card = document.getElementById('import-confirm-card');
    card.classList.add('scale-90', 'opacity-0');
    modal.classList.add('opacity-0', 'pointer-events-none');
};

window.cancelImport = () => {
    pendingImportTrip = null;
    hideImportConfirm();
};

// --- 4. MODAL THÔNG BÁO NHẬP THÀNH CÔNG ---
window.showImportSuccess = (tripTitle) => {
    const modal = document.getElementById('import-success-modal');
    const card = document.getElementById('import-success-card');

    document.getElementById('import-success-msg').textContent = `Chuyến đi "${tripTitle}" đã được thêm vào danh sách của bạn.`;

    modal.classList.remove('opacity-0', 'pointer-events-none');
    requestAnimationFrame(() => {
        card.classList.remove('scale-90', 'opacity-0');
    });
};

window.reloadAfterImport = () => {
    window.location.reload();
};

// --- 5. XÁC NHẬN NHẬP: đổi tên nếu trùng, cấp ID mới, đẩy vào state và lưu ---
window.confirmImport = () => {
    const importedTrip = pendingImportTrip;
    if (!importedTrip) return;

    try {
        // (THÊM) Đổi tên có hậu tố (1), (2)... nếu trùng tên với chuyến đi đang có
        const originalTitle = getTripTitle(importedTrip);
        const tripTitle = getUniqueTitle(originalTitle);
        if (tripTitle !== originalTitle) {
            importedTrip[getTitleKey(importedTrip)] = tripTitle;
        }

        // Cấp lại ID mới để tránh trùng lặp
        const newTripId = 'trip_' + Date.now();
        importedTrip.id = newTripId;
        
        importedTrip.days.forEach((day, index) => {
            day.id = `day_${Date.now()}_${index}`;
        });

        // Đẩy dữ liệu vào state và Lưu
        if (typeof state !== 'undefined' && Array.isArray(state.trips)) {
            state.trips.push(importedTrip);
            
            // Gọi hàm lưu dữ liệu của bạn (nếu có)
            if (typeof saveData === 'function') {
                saveData();
            } else {
                localStorage.setItem('wanderlog_trips', JSON.stringify(state.trips));
            }
            
            pendingImportTrip = null;
            hideImportConfirm();
            showImportSuccess(tripTitle);
        } else {
            throw new Error("Biến state.trips chưa được khởi tạo!");
        }
    } catch (error) {
        console.error("Chi tiết Lỗi Import:", error);
        pendingImportTrip = null;
        hideImportConfirm();
        alert("❌ Không thể nạp file: " + error.message);
    }
};

// --- 6. NHẬP FILE: đọc + kiểm tra, rồi hiện modal xác nhận ---
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

            // 3. Giữ lại chờ xác nhận, chưa ghi vào state
            pendingImportTrip = importedTrip;
            showImportConfirm(importedTrip, tripTitle);
            
        } catch (error) {
            console.error("Chi tiết Lỗi Import:", error);
            alert("❌ Không thể nạp file: " + error.message);
        }
    };
    reader.readAsText(file);
};