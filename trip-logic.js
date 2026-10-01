// --- TRIP LOGIC & CURRENCY CONVERTER ---
let fpInstance = null; 
let selectedDatesRange = [];

// Data Vùng & Tiền tệ
const regionData = {
    "Trong nước": [
        { name: "Việt Nam", cur: "VND" }
    ],
    "Đông Nam Á": [
        { name: "Thái Lan", cur: "THB" },
        { name: "Singapore", cur: "SGD" },
        { name: "Malaysia", cur: "MYR" },
        { name: "Indonesia", cur: "IDR" }
    ],
    "Đông Á": [
        { name: "Nhật Bản", cur: "JPY" },
        { name: "Hàn Quốc", cur: "KRW" },
        { name: "Đài Loan", cur: "TWD" },
        { name: "Trung Quốc", cur: "CNY" }
    ],
    "Quốc tế khác": [
        { name: "Châu Âu", cur: "EUR" },
        { name: "Mỹ", cur: "USD" },
        { name: "Úc", cur: "AUD" }
    ]
};

// Tỷ giá tham khảo (Base: VND)
const exchangeRates = {
    VND: 1, THB: 720, SGD: 18500, MYR: 5300, IDR: 1.6,
    JPY: 170, KRW: 18.5, TWD: 800, CNY: 3500, EUR: 27500,
    USD: 25000, AUD: 16500
};

// --- KHỞI TẠO DROPDOWNS ---
const initDropdowns = () => {
    const regionSelect = document.getElementById('trip-region');
    const curSelect = document.getElementById('trip-currency-to');
    
    // Gen Regions
    regionSelect.innerHTML = Object.keys(regionData).map(r => `<option value="${r}">${r}</option>`).join('');
    
    // Gen Currencies
    curSelect.innerHTML = Object.keys(exchangeRates).map(c => `<option value="${c}">${c}</option>`).join('');
    
    renderCountryList();
};

const renderCountryList = () => {
    const region = document.getElementById('trip-region').value;
    const countrySelect = document.getElementById('trip-country');
    
    countrySelect.innerHTML = regionData[region].map(c => `<option value="${c.name}" data-cur="${c.cur}">${c.name}</option>`).join('');
    autoSetCurrency();
};

const autoSetCurrency = () => {
    const countrySelect = document.getElementById('trip-country');
    const selectedOption = countrySelect.options[countrySelect.selectedIndex];
    if(selectedOption) {
        document.getElementById('trip-currency-to').value = selectedOption.getAttribute('data-cur');
        calculateExchange();
    }
};

const calculateExchange = () => {
    const amount = parseFloat(document.getElementById('trip-budget-amount').value);
    const convertedEl = document.getElementById('trip-budget-converted');
    const toCur = document.getElementById('trip-currency-to').value;
    
    if (isNaN(amount) || amount <= 0) {
        convertedEl.innerText = `0 ${toCur}`;
        return;
    }

    const convertedAmount = amount / exchangeRates[toCur];
    convertedEl.innerText = '~ ' + new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(convertedAmount) + ' ' + toCur;
};

// --- INIT LỊCH & MỞ MODAL ---
const initTripModal = () => {
    fpInstance = flatpickr("#trip-date-range", {
        mode: "range", dateFormat: "Y-m-d", locale: "vn",
        onChange: function(selectedDates) {
            selectedDatesRange = selectedDates;
            const previewEl = document.getElementById('trip-days-preview');
            if (selectedDates.length === 2) {
                const diffDays = Math.ceil(Math.abs(selectedDates[1] - selectedDates[0]) / (1000 * 60 * 60 * 24)) + 1;
                previewEl.innerHTML = `Tạo <span class="bg-white text-blue-700 px-1.5 py-0.5 rounded shadow-sm">${diffDays} NGÀY</span> lịch trình.`;
            } else {
                previewEl.innerText = "Hệ thống sẽ tự động tạo các ngày lịch trình.";
            }
        }
    });
};

const openTripModal = (isEdit = false) => {
    if(!fpInstance) { initTripModal(); initDropdowns(); }
    
    if(isEdit && editingTripId) {
        const trip = state.trips.find(t => t.id === editingTripId);
        document.getElementById('trip-modal-title').innerHTML = '<i class="fa-solid fa-pen text-blue-500 mr-2 bg-blue-50 p-2 rounded-lg"></i> Sửa chuyến đi';
        document.getElementById('trip-btn-text').innerText = 'Cập nhật chuyến đi';
        document.getElementById('trip-title').value = trip.title;
        
        // Extract budget value (if exists, format: "5,000,000 VND")
        if (trip.budget) {
            document.getElementById('trip-budget-amount').value = trip.budget.replace(/[^0-9]/g, '');
        } else {
            document.getElementById('trip-budget-amount').value = '';
        }

        if(trip.days.length > 0) {
            const startStr = trip.days[0].date;
            const endStr = trip.days[trip.days.length-1].date;
            fpInstance.setDate([startStr, endStr]);
            selectedDatesRange = [new Date(startStr), new Date(endStr)];
            document.getElementById('trip-days-preview').innerHTML = `Ghi đè <span class="bg-white text-blue-700 px-1.5 py-0.5 rounded shadow-sm">${trip.days.length} NGÀY</span> lịch trình cũ.`;
        }
    } else {
        editingTripId = null;
        document.getElementById('trip-modal-title').innerHTML = '<i class="fa-solid fa-plane-up text-blue-500 mr-2 bg-blue-50 p-2 rounded-lg"></i> Chuyến đi mới';
        document.getElementById('trip-btn-text').innerText = 'Tạo chuyến đi';
        document.getElementById('trip-title').value = '';
        document.getElementById('trip-budget-amount').value = '';
        document.getElementById('trip-region').value = "Đông Nam Á";
        renderCountryList(); // Auto reset to THB
        fpInstance.clear();
        selectedDatesRange = [];
    }

    calculateExchange();
    document.getElementById('trip-modal').classList.add('active');
};

const closeTripModal = () => {
    document.getElementById('trip-modal').classList.remove('active');
    editingTripId = null;
};

// --- XỬ LÝ LƯU (THÊM / SỬA) ---
const submitTripFormNew = () => {
    const title = document.getElementById('trip-title').value;
    const budgetAmt = document.getElementById('trip-budget-amount').value;
    
    if(!title || selectedDatesRange.length < 2) {
        alert("Vui lòng điền tên chuyến đi và khoảng thời gian đầy đủ!");
        return;
    }

    const startDate = selectedDatesRange[0];
    const daysCount = Math.ceil(Math.abs(selectedDatesRange[1] - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const budgetStr = budgetAmt ? `${new Intl.NumberFormat('vi-VN').format(budgetAmt)} VND` : null;

    const destCur = document.getElementById('trip-currency-to').value; // Lấy mã tiền (VD: THB)

    if (editingTripId) {
        // CẬP NHẬT
        const trip = state.trips.find(t => t.id === editingTripId);
        trip.title = title;
        trip.budget = budgetStr;
        trip.destCur = destCur;
        
        // Cập nhật lại ngày (Giữ lại hoạt động của các ngày trùng khớp)
        const oldDays = [...trip.days];
        trip.days = [];
        for(let i = 0; i < daysCount; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            
            // Tìm ngày cũ tương ứng (hoặc theo index, hoặc theo dateStr. Ở đây dùng Index cho an toàn nếu đổi cả lịch)
            const oldDay = oldDays[i]; 
            trip.days.push({
                date: dateStr,
                activities: oldDay ? oldDay.activities : []
            });
        }
        state.activeDayDate = trip.days[0].date;
    } else {
        // TẠO MỚI
        const newDays = [];
        for(let i = 0; i < daysCount; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            newDays.push({
                date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
                activities: []
            });
        }
        const newTrip = {
            id: 'trip_' + Math.random().toString(36).substr(2, 9),
            title: title,
            coverUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
            budget: budgetStr,
            destCur: destCur, // <--- THÊM DÒNG NÀY VÀO CHỖ TẠO MỚI
            days: newDays
        };
        
        state.trips.push(newTrip);
        state.activeTripId = newTrip.id;
        state.activeDayDate = newTrip.days[0].date;
    }
    
    saveData(); 
    closeTripModal();
    renderApp();
};