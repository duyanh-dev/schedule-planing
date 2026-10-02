// --- BULK ADD LOGIC ---
let bulkFormCounter = 0;

// Mở Modal và tự động thêm 1 form trống đầu tiên
const openBulkModal = () => {
    document.getElementById('bulk-forms-container').innerHTML = '';
    bulkFormCounter = 0;
    addBulkFormItem(); 
    document.getElementById('bulk-add-modal').classList.add('active');
};

const closeBulkModal = () => {
    document.getElementById('bulk-add-modal').classList.remove('active');
};

const removeBulkFormItem = (id) => {
    const el = document.getElementById(`bulk-item-${id}`);
    if(el) el.remove();
};

// Hàm sinh ra 1 thẻ Form chi tiết
const addBulkFormItem = () => {
    const id = bulkFormCounter++;
    const container = document.getElementById('bulk-forms-container');
    
    // Gợi ý giờ
    const d = new Date();
    const start = `${String(d.getHours()).padStart(2, '0')}:00`;
    const end = `${String(d.getHours() + 1).padStart(2, '0')}:00`;

    // Lấy tiền tệ tự động từ Trip
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const cur = trip && trip.destCur ? trip.destCur : 'VND';

    const html = `
        <div id="bulk-item-${id}" class="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 relative group animate-fade-in">
            <!-- Nút xóa thẻ góc trên phải -->
            <button onclick="removeBulkFormItem(${id})" class="absolute -top-3 -right-3 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors border border-red-200 shadow-sm z-10"><i class="fa-solid fa-xmark"></i></button>
            
            <div class="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <div class="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-black">${id + 1}</div>
                <h4 class="font-black text-slate-800 text-sm uppercase">Hoạt động</h4>
            </div>
            
            <div class="space-y-4">
                <!-- Tên & Giờ -->
                <div class="flex flex-col sm:flex-row gap-3">
                    <div class="flex-[2] space-y-1.5">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-wider">Tên HĐ <span class="text-red-500">*</span></label>
                        <input type="text" id="bulk-details-${id}" placeholder="VD: Ăn trưa..." required class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none font-bold text-slate-800 text-sm">
                    </div>
                    <div class="flex-1 space-y-1.5">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-wider">Từ giờ</label>
                        <input type="time" id="bulk-start-${id}" value="${start}" required class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-slate-800 text-center">
                    </div>
                    <div class="flex-1 space-y-1.5">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-wider">Đến giờ</label>
                        <input type="time" id="bulk-end-${id}" value="${end}" required class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-slate-800 text-center">
                    </div>
                </div>
                
                <!-- Lộ trình có Icon Bản đồ -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1.5">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-wider">Từ điểm</label>
                        <div class="relative">
                            <input type="text" id="bulk-from-${id}" placeholder="Xuất phát..." class="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800 text-sm">
                            <button type="button" onclick="openMapPicker('bulk-from-${id}')" class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-blue-500 hover:bg-blue-100 rounded-lg"><i class="fa-solid fa-location-crosshairs"></i></button>
                        </div>
                    </div>
                    <div class="space-y-1.5">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-wider">Đến điểm</label>
                        <div class="relative">
                            <input type="text" id="bulk-to-${id}" placeholder="Đích đến..." class="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800 text-sm">
                            <button type="button" onclick="openMapPicker('bulk-to-${id}')" class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-blue-500 hover:bg-blue-100 rounded-lg"><i class="fa-solid fa-location-crosshairs"></i></button>
                        </div>
                    </div>
                </div>
                
                <!-- Icon, Loại & Xe -->
                <div class="flex gap-2">
                    <select id="bulk-icon-${id}" class="w-14 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-center"><option value="fa-location-crosshairs">📍</option><option value="fa-plane">✈️</option><option value="fa-car">🚗</option><option value="fa-train">🚆</option><option value="fa-utensils">🍽️</option><option value="fa-camera">📸</option><option value="fa-bag-shopping">🛍️️</option><option value="fa-bed">🛏</option></select>
                    <select id="bulk-type-${id}" class="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 text-sm"><option value="Tham quan">Tham quan</option><option value="Di chuyển">Di chuyển</option><option value="Ăn uống">Ăn uống</option><option value="Mua sắm">Mua sắm</option><option value="Khách sạn">Khách sạn</option><option value="Khác">Khác</option></select>
                    <select id="bulk-transport-${id}" class="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 text-sm"><option value="">Xe: Không</option><option value="Đi bộ">🚶 Đi bộ</option><option value="Taxi / Grab">🚗 Taxi</option><option value="Tàu hỏa / MRT">🚆 Tàu</option><option value="Máy bay">✈️ Bay</option></select>
                </div>

                <!-- Chi tiết & Lưu ý -->
                <div class="space-y-3 border-t border-slate-100 pt-3">
                    <div class="space-y-1.5">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-wider">Chi tiết / Hướng dẫn</label>
                        <textarea id="bulk-desc-${id}" rows="2" placeholder="Ghi chú thêm..." class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-800 text-sm resize-none"></textarea>
                    </div>
                    <div class="space-y-1.5">
                        <label class="text-[11px] font-black text-amber-500 uppercase tracking-wider"><i class="fa-solid fa-star mr-1"></i> Lưu ý / Đánh giá</label>
                        <textarea id="bulk-note-${id}" rows="2" placeholder="Lưu ý quan trọng..." class="w-full p-3 bg-amber-50/50 border border-amber-200 rounded-xl outline-none font-medium text-amber-900 text-sm resize-none"></textarea>
                    </div>
                </div>

                <!-- Ngân sách -->
                <div class="flex gap-2">
                    <div class="flex-1 space-y-1.5">
                        <label class="text-[11px] font-black text-emerald-500 uppercase tracking-wider">Ngân sách (Tùy chọn)</label>
                        <input type="number" id="bulk-budget-${id}" class="w-full p-3 bg-slate-50 border border-emerald-200 focus:bg-white rounded-xl outline-none font-black text-slate-800 text-sm" placeholder="Số tiền...">
                    </div>
                    <div class="w-24 space-y-1.5">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-wider">Tiền tệ</label>
                        <select id="bulk-cur-${id}" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-slate-800 text-sm">
                            <option value="${cur}">${cur}</option>
                            ${cur !== 'VND' ? `<option value="VND">VND</option>` : ''}
                            <option value="USD">USD</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
};

// Hàm xử lý lưu tất cả form đang hiện trên UI
const submitBulkAdd = () => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.date === state.activeDayDate);
    
    let addedCount = 0;

    for(let id = 0; id < bulkFormCounter; id++) {
        const detailsEl = document.getElementById(`bulk-details-${id}`);
        if(!detailsEl) continue; // Form đã bị user bấm xóa thẻ
        
        const details = detailsEl.value.trim();
        if(!details) continue;

        const newAct = {
            id: 'ba_' + Math.random().toString(36).substr(2, 9),
            start: document.getElementById(`bulk-start-${id}`).value,
            end: document.getElementById(`bulk-end-${id}`).value,
            details: details,
            from: document.getElementById(`bulk-from-${id}`).value,
            to: document.getElementById(`bulk-to-${id}`).value,
            icon: document.getElementById(`bulk-icon-${id}`).value,
            type: document.getElementById(`bulk-type-${id}`).value,
            transport: document.getElementById(`bulk-transport-${id}`).value,
            desc: document.getElementById(`bulk-desc-${id}`).value,
            note: document.getElementById(`bulk-note-${id}`).value, // Đã bổ sung lưu ý
            budgetAmt: document.getElementById(`bulk-budget-${id}`).value,
            budgetCur: document.getElementById(`bulk-cur-${id}`).value,
            isCompleted: false
        };
        day.activities.push(newAct);
        addedCount++;
    }

    if(addedCount > 0) {
        day.activities.sort((a, b) => a.start.localeCompare(b.start));
        saveData();
        renderApp();
        closeBulkModal();
    } else {
        alert("Bạn chưa nhập tên hoạt động nào cả!");
    }
};