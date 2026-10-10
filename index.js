        // --- UTILS & DATA GENERATION ---
        // Generate relative dates so dummy data always aligns with "Today" and "Tomorrow" for real-time testing
        const getRelativeDateStr = (offsetDays) => {
            const d = new Date();
            d.setDate(d.getDate() + offsetDays);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const formatDisplayDate = (dateStr) => {
            const d = new Date(dateStr);
            const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            return `${days[d.getDay()]} - ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        };

        // --- GLOBAL STATE ---
        let state = {
            activeTripId: 't1',
            activeDayDate: getRelativeDateStr(0), // Defaults to today
            isSimulating: false,
            simulatedTimeMins: 480, // 08:00 AM default
            editingActivityId: null,
            mapPickerTargetInput: null,
            currentPickedAddress: '',
            trips: [
                {
                    id: 't1',
                    title: 'Bangkok - Thái Lan',
                    coverUrl: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=1200&q=80',
                    days: [
                        {
                            date: getRelativeDateStr(0), // Today
                            activities: [
                                { id: 'a1', start: '07:30', end: '08:30', from: 'Nhà', to: 'Sân bay TSN', details: 'Di chuyển ra sân bay', type: 'Di chuyển', icon: 'fa-car', transport: 'Taxi / Grab', isCompleted: true },
                                { id: 'a2', start: '09:00', end: '11:30', from: 'Sân bay TSN', to: 'Suvarnabhumi BKK', details: 'Bay VN Airlines', type: 'Di chuyển', icon: 'fa-plane', transport: 'Máy bay', isCompleted: false },
                                { id: 'a3', start: '15:20', end: '18:00', from: 'Khách sạn', to: 'Chatuchak Market', details: 'Tham quan - Mua sắm cuối tuần', type: 'Mua sắm', icon: 'fa-bag-shopping', transport: 'Tàu hỏa / MRT', isCompleted: false }
                            ]
                        },
                        {
                            date: getRelativeDateStr(1), // Tomorrow
                            activities: [
                                { id: 'b1', start: '09:00', end: '10:00', from: 'Khách sạn', to: 'Grand Palace', details: 'Di chuyển đến Hoàng Cung', type: 'Di chuyển', icon: 'fa-train', transport: 'Tàu hỏa / MRT', isCompleted: false },
                                { id: 'b2', start: '10:00', end: '12:00', from: 'Grand Palace', to: '', details: 'Tham quan Hoàng Cung & Wat Arun', type: 'Tham quan', icon: 'fa-camera', transport: 'Đi bộ', isCompleted: false }
                            ]
                        }
                    ]
                }
            ]
        };

        // --- CUSTOM IOS TIME PICKER LOGIC ---
        let currentPickerTarget = null;

        const generateWheelOptions = () => {
            let hoursHtml = '';
            for(let i=0; i<24; i++) hoursHtml += `<li class="h-[40px] snap-center flex items-center justify-center cursor-pointer">${String(i).padStart(2,'0')}</li>`;
            
            let minsHtml = '';
            for(let i=0; i<60; i++) minsHtml += `<li class="h-[40px] snap-center flex items-center justify-center cursor-pointer">${String(i).padStart(2,'0')}</li>`;

            document.getElementById('wheel-hours').innerHTML = hoursHtml;
            document.getElementById('wheel-mins').innerHTML = minsHtml;
        };

        const openTimePicker = (inputId) => {
            currentPickerTarget = document.getElementById(inputId);
            let [h, m] = currentPickerTarget.value.split(':');
            h = h ? parseInt(h) : new Date().getHours();
            m = m ? parseInt(m) : 0;

            const modal = document.getElementById('ios-time-picker-modal');
            const modalContent = modal.querySelector('div');
            
            modal.classList.remove('hidden');
            
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modalContent.classList.remove('translate-y-full');
                
                // Cuộn tới giờ hiện tại (mỗi item cao 40px)
                document.getElementById('wheel-hours').scrollTop = h * 40;
                document.getElementById('wheel-mins').scrollTop = m * 40;
            }, 10);
        };

        const closeTimePicker = () => {
            const modal = document.getElementById('ios-time-picker-modal');
            const modalContent = modal.querySelector('div');
            
            modal.classList.add('opacity-0');
            modalContent.classList.add('translate-y-full');
            
            setTimeout(() => modal.classList.add('hidden'), 300);
        };

        const confirmTimePicker = () => {
            const hourEl = document.getElementById('wheel-hours');
            const minEl = document.getElementById('wheel-mins');
            
            // Tính toán vị trí cuộn để ra giờ
            let h = Math.round(hourEl.scrollTop / 40);
            let m = Math.round(minEl.scrollTop / 40);
            
            h = Math.max(0, Math.min(23, h));
            m = Math.max(0, Math.min(59, m));
            
            if (currentPickerTarget) {
                currentPickerTarget.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
            closeTimePicker();
        };

        // Get the current calculating time (Real or Simulated)
        const getCurrentTime = () => {
            if (state.isSimulating) {
                const d = new Date();
                d.setHours(Math.floor(state.simulatedTimeMins / 60));
                d.setMinutes(state.simulatedTimeMins % 60);
                d.setSeconds(0);
                return d;
            }
            return new Date();
        };

        // Calculate Activity Status (Sắp tới, Đang diễn ra, Trễ, Quá hạn)
        const getActivityStatus = (act, dayDate) => {
            if (act.isCompleted) return { label: 'Đã xong', type: 'done', color: 'bg-slate-200 text-slate-500 border-slate-300' };
            
            const now = getCurrentTime();
            // We use the day's date + activity time to make a Date object
            // If the activity is on "Today", the calculation works. If it's a future day, it will correctly show "Còn X giờ/ngày".
            // For simplicity, we just compare times assuming the user is looking at the actual day.
            
            const startObj = new Date(`${dayDate}T${act.start}:00`);
            const endObj = new Date(`${dayDate}T${act.end}:00`);
            
            // To properly handle testing across days, if we are simulating, assume the simulation applies to the *active day* being viewed.
            if(state.isSimulating) {
                startObj.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                endObj.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
            }

            const diffStartMins = Math.floor((startObj - now) / 60000);
            const diffEndMins = Math.floor((endObj - now) / 60000);

            if (diffStartMins > 0) {
                // Future
                const hrs = Math.floor(diffStartMins / 60);
                const mins = diffStartMins % 60;
                let text = hrs > 0 ? `Còn ${hrs}h ${mins}p` : `Còn ${mins} phút`;
                return { label: text, type: 'future', color: 'bg-blue-100 text-blue-700 border-blue-200' };
            } else if (diffStartMins <= 0 && diffEndMins >= 0) {
                // Ongoing or Late
                const lateMins = Math.abs(diffStartMins);
                const text = lateMins > 0 ? `Trễ ${lateMins}p` : `Đang diễn ra`;
                return { label: text, type: 'late', color: 'bg-amber-100 text-amber-700 border-amber-300 font-bold shadow-sm animate-pulse' };
            } else {
                // Overdue
                const overdueMins = Math.abs(diffEndMins);
                const hrs = Math.floor(overdueMins / 60);
                const mins = overdueMins % 60;
                let text = hrs > 0 ? `Quá hạn ${hrs}h ${mins}p` : `Quá hạn ${mins}p`;
                return { label: text, type: 'overdue', color: 'bg-red-100 text-red-600 border-red-300 font-bold' };
            }
        };


        


        // --- STREAMING_CHUNK: RENDERING ENGINE ---
        // Master render function
        const renderApp = () => {
            renderSidebar();
            renderHeader();
            renderDaysTabs();
            renderTimeline();
            updateClockAndBanner();

            setTimeout(() => {
                // scrollToActiveTab();
            }, 50); // Delay 50ms đợi HTML vẽ xong mới cuộn
        };

        const renderSidebar = () => {
            const list = document.getElementById('trips-list');
            list.innerHTML = state.trips.map(trip => `
                <div class="flex items-center gap-1 mb-2">
                    <button onclick="switchTrip('${trip.id}')" class="flex-1 text-left p-3 rounded-2xl transition-all duration-200 flex items-center gap-3 border ${state.activeTripId === trip.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-100'}">
                        <img src="${trip.coverUrl}" class="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm">
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-sm truncate ${state.activeTripId === trip.id ? 'text-blue-700' : 'text-slate-800'}">${trip.title}</h4>
                            <p class="text-[11px] text-slate-500 font-medium mt-0.5">${trip.days.length} ngày</p>
                        </div>
                    </button>
                    <!-- Nút phụ Sửa / Xóa -->
                    <div class="flex flex-col gap-1 pr-1">
                        <button onclick="editTripFromList('${trip.id}')" class="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Sửa"><i class="fa-solid fa-pen text-[10px]"></i></button>
                        <button onclick="deleteTripFromList('${trip.id}')" class="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors" title="Xóa"><i class="fa-solid fa-trash text-[10px]"></i></button>
                    </div>
                </div>
            `).join('');
        };

        const editTripFromList = (id) => {
            editingTripId = id; // editingTripId nằm ở trip-logic.js
            openTripModal(true); 
            if(window.innerWidth < 768) toggleSidebar(); // Đóng menu nếu ở Mobile
        };

        const deleteTripFromList = (id) => {
            if(confirm('🚨 Xóa toàn bộ chuyến đi này?')) {
                state.trips = state.trips.filter(t => t.id !== id);
                if(state.trips.length === 0) {
                    state.trips.push({ id: 't_empty', title: 'Chuyến đi mới', coverUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80', days: [{ date: getRelativeDateStr(0), activities: [] }]});
                }
                if(state.activeTripId === id) switchTrip(state.trips[0].id);
                else renderSidebar();
                saveData();
            }
        };

       const renderHeader = () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            document.getElementById('trip-cover-img').src = trip.coverUrl;
            
            let titleHtml = trip.title;
            if (trip.budget) {
                const amt = parseInt(trip.budget.replace(/[^0-9]/g, '')) || 0;
                let foreignHtml = '';
                
                // Nếu có đổi ngoại tệ, hiển thị thêm ở Header (Căn chỉnh UI Mobile)
                if(trip.destCur && trip.destCur !== 'VND' && typeof exchangeRates !== 'undefined' && exchangeRates[trip.destCur]) {
                    const foreignAmt = amt / exchangeRates[trip.destCur];
                    foreignHtml = `
                        <div class="w-px h-4 bg-white/40 mx-2.5 md:mx-3 rounded-full"></div>
                        <span class="text-[11px] md:text-[13px] font-bold text-emerald-100 tracking-wide drop-shadow-sm">≈ ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(foreignAmt)} ${trip.destCur}</span>
                    `;
                }
                
                // Liquid Glass Budget Pill
                titleHtml += `
                    <br>
                    <div class="mt-3 md:mt-4 inline-flex items-center bg-white/20 backdrop-blur-2xl px-3.5 md:px-4 py-2 md:py-2.5 rounded-[1.25rem] border border-white/50 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
                        <div class="w-7 h-7 md:w-8 md:h-8 rounded-full bg-emerald-500/80 backdrop-blur-md flex items-center justify-center border border-emerald-300/50 shadow-inner mr-2.5 flex-shrink-0">
                            <i class="fa-solid fa-wallet text-white text-xs md:text-sm drop-shadow-md"></i>
                        </div> 
                        <span class="text-[13px] md:text-[15px] font-black text-white tracking-wide drop-shadow-sm">${trip.budget}</span> 
                        ${foreignHtml}
                    </div>
                `;
            }
            document.getElementById('trip-title-display').innerHTML = titleHtml;
        };

        const handleImageUpload = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const trip = state.trips.find(t => t.id === state.activeTripId);
                    trip.coverUrl = event.target.result;
                    saveData(); // <--- THÊM DÒNG NÀY VÀO ĐÂY
                    renderHeader();
                };
                reader.readAsDataURL(file);
            }
        };

        // ==========================================================
// LIQUID GLASS DAY TABS v5  (iOS 26 style)
// - Mỗi ngày là 1 "chip" kính; ngày đã qua mờ hơn; HÔM NAY luôn nổi bật (không viền)
// - Đổi ngày: viên kính trượt như chất lỏng (đầu lao tới trước, đuôi kéo theo rồi nảy). KHÔNG còn vệt sáng quét.
// - SCRUB (v5): chạm vào ngày đang chọn rồi lướt ngang -> viên kính trở thành "màng kính" trong hơn,
//   bám ngón tay mượt bằng lò xo, đứng được GIỮA 2 ngày, giãn nhẹ theo vận tốc.
//   Nhả tay -> hít về ngày gần nhất (có tính quán tính). Chữ ngày nào gần nhất sẽ sáng lên.
// - Gần mép -> thanh ngày TỰ CUỘN liên tục, càng sát/ra ngoài mép càng nhanh (không còn nhảy từng bước).
// - Đổi ngày KHÔNG dựng lại DOM (chỉ cập nhật class + trượt viên kính)
// - data-animation-on="true" -> UI mới | khác "true" -> UI cũ nguyên bản
// ==========================================================

// ---------- CÔNG TẮC ANIMATION ----------
const isDayAnimOn = () => {
    const el = [document.documentElement, document.body].find(e => e && e.hasAttribute('data-animation-on'))
        || document.querySelector('[data-animation-on]');
    return !!el && el.getAttribute('data-animation-on') === 'true';
};

// ---------- CSS (chèn 1 lần, không phụ thuộc cấu hình Tailwind) ----------
const ensureDaysGlassStyle = () => {
    const old = document.getElementById('days-glass-style');
    if (old && old.dataset.v === '5') return;
    if (old) old.remove();

    const s = document.createElement('style');
    s.id = 'days-glass-style';
    s.dataset.v = '5';
    s.textContent = `
        /* ===== Nền xám kính lỏng (lõm xuống để viên kính nổi lên) ===== */
        .day-track {
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 8px;
            flex-shrink: 0;
            border-radius: 9999px;
            background: rgba(148, 163, 184, 0.22);
            -webkit-backdrop-filter: blur(16px) saturate(1.5);
            backdrop-filter: blur(16px) saturate(1.5);
            border: 1px solid rgba(255, 255, 255, 0.55);
            box-shadow: inset 0 2px 5px rgba(15, 23, 42, 0.10), inset 0 -1px 1px rgba(255, 255, 255, 0.7);
        }
        @media (min-width: 768px) { .day-track { gap: 6px; border-radius: 1.75rem; } }

        /* ===== Viên kính nổi khối =====
           Không dùng backdrop-filter / drop-shadow ở phần tử đang chuyển động (rất tốn GPU);
           độ "kính" được dựng bằng nhiều lớp gradient + viền sáng + vệt phản chiếu. */
        .day-thumb {
            position: absolute;
            z-index: 0;
            overflow: hidden;
            pointer-events: none;
            border-radius: 9999px;
            background:
                radial-gradient(120% 90% at 18% 0%, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 55%),
                radial-gradient(90% 70% at 90% 110%, rgba(147, 197, 253, 0.55), rgba(147, 197, 253, 0) 60%),
                linear-gradient(160deg, rgba(96, 165, 250, 0.97), rgba(37, 99, 235, 0.97));
            border: 1px solid rgba(255, 255, 255, 0.7);
            box-shadow:
                inset 0 1px 1px rgba(255, 255, 255, 0.95),
                inset 0 0 0 1px rgba(255, 255, 255, 0.18),
                inset 0 10px 16px rgba(255, 255, 255, 0.12),
                inset 0 -3px 6px rgba(30, 64, 175, 0.35);
            transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease, opacity 0.3s ease;
            will-change: transform;
        }
        @media (min-width: 768px) { .day-thumb { border-radius: 1.25rem; } }
        /* Vệt phản chiếu phía trên */
        .day-thumb::before {
            content: '';
            position: absolute;
            left: 7%; right: 7%; top: 2px;
            height: 42%;
            border-radius: inherit;
            background: linear-gradient(to bottom, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0));
            pointer-events: none;
        }
        /* Viền kính sáng: chỉ hiện khi nhấn / scrub (đổi bằng opacity nên rất nhẹ) */
        .day-thumb::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            pointer-events: none;
            opacity: 0;
            box-shadow:
                inset 0 0 0 1.5px rgba(255, 255, 255, 0.55),
                inset 0 -8px 14px rgba(255, 255, 255, 0.16);
            transition: opacity 0.25s ease;
        }
        .day-thumb.is-pressed { transform: scale(1.07); filter: brightness(1.06) saturate(1.15); }
        .day-thumb.is-pressed::after { opacity: 1; }
        /* Đang scrub: "màng kính" trong hơn. Vị trí/kích thước/transform được JS cập nhật mỗi frame
           (đã làm mượt bằng lò xo) nên KHÔNG để CSS transition xen vào. */
        .day-thumb.is-scrubbing {
            transition: filter 0.3s ease, opacity 0.25s ease;
            opacity: 0.9;
            filter: brightness(1.08) saturate(1.2);
        }
        .day-thumb.is-scrubbing::after { opacity: 1; }

        /* ===== Chip từng ngày ===== */
        .day-tab {
            position: relative;
            z-index: 1;
            border: 1px solid transparent;
            background-color: transparent;
            transition: background-color 0.35s ease, border-color 0.35s ease, opacity 0.35s ease,
                        box-shadow 0.35s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            user-select: none;
        }
        /* Ngày đang chọn: vuốt NGANG thuộc về viên kính (scrub), vuốt DỌC vẫn cuộn trang bình thường */
        .day-tab.is-active { touch-action: pan-y; }
        .day-tab .day-main { color: #475569; transition: color 0.25s ease; }
        .day-tab .day-sub  { color: #94a3b8; transition: color 0.25s ease; }

        .day-tab.day-chip:not(.is-active) {
            background-color: rgba(255, 255, 255, 0.55);
            border-color: rgba(255, 255, 255, 0.7);
            box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.9), inset 0 -1px 1px rgba(15, 23, 42, 0.06);
        }
        .day-tab.day-chip:not(.is-active):hover { background-color: rgba(255, 255, 255, 0.8); }

        .day-tab.day-past:not(.is-active) { opacity: 0.58; }

        .day-tab.day-today:not(.is-active) {
            background-color: rgba(219, 234, 254, 0.92);
            border-color: transparent;
            box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.9), inset 0 -2px 6px rgba(96, 165, 250, 0.30);
        }
        .day-tab.day-today:not(.is-active):hover { background-color: rgba(191, 219, 254, 0.95); }
        .day-tab.day-today:not(.is-active) .day-main { color: #2563eb; }
        .day-tab.day-today:not(.is-active) .day-sub  { color: #3b82f6; }
        .day-tab.day-today::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            pointer-events: none;
            opacity: 0;
            box-shadow: inset 0 -3px 10px rgba(59, 130, 246, 0.55), inset 0 0 14px rgba(147, 197, 253, 0.45);
        }
        .day-tab.day-today:not(.is-active)::after { opacity: 0.5; }
        .day-tab.day-today:not(.is-active):not(.animate-jiggle)::after {
            animation: day-today-breathe 2.8s ease-in-out infinite;
        }
        @keyframes day-today-breathe { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
            .day-tab.day-today:not(.is-active):not(.animate-jiggle)::after { animation: none; }
        }

        .day-tab.is-active .day-main { color: #ffffff; transition-delay: 0.08s; }
        .day-tab.is-active .day-sub  { color: #dbeafe; transition-delay: 0.08s; }

        /* Ngày gần viên kính nhất lúc scrub */
        .day-tab.is-hot {
            opacity: 1 !important;
            background-color: transparent !important;
            border-color: transparent !important;
            box-shadow: none !important;
        }
        .day-tab.is-hot::after { display: none !important; }
        .day-tab.is-hot .day-main { color: #ffffff !important; transition-delay: 0s; }
        .day-tab.is-hot .day-sub  { color: #dbeafe !important; transition-delay: 0s; }

        .day-tab:not(.is-active):active { transform: scale(0.95); }
    `;
    document.head.appendChild(s);
};

// ---------- Màu từng trạng thái ----------
const dayTabLook = (date, active, todayStr) => {
    if (active) return { main: '#ffffff', sub: '#dbeafe', bg: 'rgba(255,255,255,0)', border: 'rgba(255,255,255,0)' };
    if (date === todayStr) return { main: '#2563eb', sub: '#3b82f6', bg: 'rgba(219,234,254,0.92)', border: 'rgba(255,255,255,0)' };
    return { main: '#475569', sub: '#94a3b8', bg: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.7)' };
};

const daysReduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// ==========================================================
// HIỆU ỨNG CHẤT LỎNG KHI ĐỔI NGÀY (bấm / nhả scrub)
// ==========================================================
// Trượt từ vị trí cũ sang mới: đầu lao tới trước, đuôi bắt kịp rồi nảy nhẹ. Không còn vệt sáng.
const playDaysThumbMove = (thumb, from, to) => {
    if (!thumb.animate || daysReduceMotion()) return;
    const x1 = Math.min(from.left, to.left);
    const x2 = Math.max(from.left + from.width, to.left + to.width);
    const far = Math.min(1, Math.abs(to.left - from.left) / 240);
    const dur = 420 + far * 140;

    thumb.animate([
        { left: from.left + 'px', width: from.width + 'px', easing: 'cubic-bezier(0.3, 0, 0.15, 1)' },
        { left: x1 + 'px', width: (x2 - x1) + 'px', offset: 0.38, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' },
        { left: to.left + 'px', width: to.width + 'px' }
    ], { duration: dur });

    // Dẹt nhẹ lúc giãn (không đặt keyframe đầu -> tự nối từ transform hiện tại, không bị giật)
    thumb.animate([
        { transform: `scale(1.02, ${(0.95 - far * 0.03).toFixed(3)})`, offset: 0.38 },
        { transform: 'scale(1, 1)' }
    ], { duration: dur, easing: 'ease-out' });
};

// ==========================================================
// SCRUB: chạm ngày đang chọn rồi lướt ngang -> màng kính tự do
// ==========================================================
const DAYS_SCRUB_DEADZONE = 4;        // px lướt ngang tối thiểu để vào scrub (nhỏ = nhạy)
const DAYS_SCRUB_FOLLOW_TAU = 0.05;   // giây: độ "trễ lò xo" khi viên kính bám ngón tay (nhỏ = bám sát hơn)
const DAYS_SCRUB_EDGE_MIN = 64;       // vùng mép tự cuộn: tối thiểu (px)
const DAYS_SCRUB_EDGE_MAX = 110;      // ... tối đa (px), mặc định ~20% bề rộng thanh
const DAYS_SCRUB_SPEED_MIN = 160;     // px/s khi vừa chạm vùng mép
const DAYS_SCRUB_SPEED_MAX = 1300;    // px/s khi sát / vượt mép
const DAYS_SCRUB_FLICK = 0.12;        // giây quán tính cộng thêm khi nhả tay

let daysScrub = null;
let lastDaysScrubEnd = 0;

const getDayTabButtons = () => Array.from(document.querySelectorAll('#days-track > button'));

// Độ rộng viên kính nội suy giữa 2 tab lân cận theo vị trí tâm (đứng giữa 2 ngày -> rộng trung bình)
const daysThumbWidthAt = (geo, cx) => {
    if (cx <= geo[0].c) return geo[0].w;
    for (let i = 0; i < geo.length - 1; i++) {
        if (cx <= geo[i + 1].c) {
            const t = (cx - geo[i].c) / ((geo[i + 1].c - geo[i].c) || 1);
            return geo[i].w + (geo[i + 1].w - geo[i].w) * t;
        }
    }
    return geo[geo.length - 1].w;
};

const daysNearestTab = (geo, x) => {
    let best = geo[0], d = Infinity;
    for (const g of geo) {
        const dd = Math.abs(g.c - x);
        if (dd < d) { d = dd; best = g; }
    }
    return best;
};

// Hít viên kính về 1 tab (từ vị trí tự do hiện tại)
const settleDaysThumb = (thumb, tab) => {
    const from = {
        left: parseFloat(thumb.style.left) || tab.offsetLeft,
        width: parseFloat(thumb.style.width) || tab.offsetWidth
    };
    const to = { left: tab.offsetLeft, width: tab.offsetWidth };
    thumb.style.left = to.left + 'px';
    thumb.style.width = to.width + 'px';
    playDaysThumbMove(thumb, from, to);
};

const cleanupDaysScrub = (restore) => {
    const s = daysScrub;
    if (!s) return;
    daysScrub = null;
    cancelAnimationFrame(s.raf);
    window.removeEventListener('pointermove', onDaysScrubMove);
    window.removeEventListener('pointerup', onDaysScrubEnd);
    window.removeEventListener('pointercancel', onDaysScrubCancel);

    const c = document.getElementById('days-tabs');
    if (c && s.moved) c.style.scrollBehavior = s.prevScrollBehavior || '';

    const thumb = document.getElementById('days-thumb');
    getDayTabButtons().forEach(b => b.classList.remove('is-hot'));
    const origin = document.getElementById(`tab-${s.originDate}`);
    if (origin) origin.classList.add('is-active');

    if (thumb) {
        thumb.classList.remove('is-pressed', 'is-scrubbing');
        if (s.moved) thumb.style.transform = ''; // CSS tự trả scale về 1 êm ái
        if (restore && s.moved && origin) settleDaysThumb(thumb, origin);
    }
};
const abortDaysScrub = () => cleanupDaysScrub(false);

const setDaysScrubHot = (date) => {
    const s = daysScrub;
    if (!s || date === s.hotDate) return;
    s.hotDate = date;
    getDayTabButtons().forEach(b => b.classList.toggle('is-hot', b.id === `tab-${date}`));
    const origin = document.getElementById(`tab-${s.originDate}`);
    if (origin) origin.classList.toggle('is-active', date === s.originDate);
    if (navigator.vibrate) navigator.vibrate(6);
};

// Ngón tay đang ở vùng mép nào? depth: 0 -> 1 (sát mép), tới 1.3 khi kéo ra ngoài mép
const daysScrubEdge = () => {
    const s = daysScrub;
    const c = document.getElementById('days-tabs');
    if (!s || !c) return { dir: 0, depth: 0 };
    const r = c.getBoundingClientRect();
    const zone = Math.max(DAYS_SCRUB_EDGE_MIN, Math.min(DAYS_SCRUB_EDGE_MAX, r.width * 0.2));
    const max = c.scrollWidth - c.clientWidth;
    if (s.lastX < r.left + zone && c.scrollLeft > 1) {
        return { dir: -1, depth: Math.min(1.3, (r.left + zone - s.lastX) / zone) };
    }
    if (s.lastX > r.right - zone && c.scrollLeft < max - 1) {
        return { dir: 1, depth: Math.min(1.3, (s.lastX - (r.right - zone)) / zone) };
    }
    return { dir: 0, depth: 0 };
};

// Vòng lặp mỗi frame: tự cuộn ở mép + viên kính bám ngón tay bằng lò xo + cập nhật hình dạng
const daysScrubTick = (t) => {
    const s = daysScrub;
    if (!s) return;
    const c = document.getElementById('days-tabs');
    const track = document.getElementById('days-track');
    const thumb = document.getElementById('days-thumb');
    if (!c || !track || !thumb) return;

    const dt = s.lastT ? Math.min(0.05, Math.max(0.001, (t - s.lastT) / 1000)) : 0.016;
    s.lastT = t;

    // 1) Tự cuộn mượt theo thời gian (càng sát mép càng nhanh)
    const { dir, depth } = daysScrubEdge();
    if (dir !== 0) {
        const speed = DAYS_SCRUB_SPEED_MIN + (DAYS_SCRUB_SPEED_MAX - DAYS_SCRUB_SPEED_MIN) * Math.min(1, depth * depth);
        c.scrollLeft += dir * speed * dt;
    }

    // 2) Mục tiêu = vị trí ngón tay trong hệ tọa độ của track (đã tính cả phần đã cuộn),
    //    kéo quá 2 đầu thì có lực cản như dây chun
    const tr = track.getBoundingClientRect();
    const geo = s.geo;
    const first = geo[0].c, last = geo[geo.length - 1].c;
    let tx = s.lastX - tr.left - s.grab;
    if (tx < first) tx = first - 16 * Math.tanh((first - tx) / 70);
    else if (tx > last) tx = last + 16 * Math.tanh((tx - last) / 70);

    // 3) Lò xo mượt (độc lập tốc độ khung hình)
    const k = 1 - Math.exp(-dt / DAYS_SCRUB_FOLLOW_TAU);
    const prev = s.cx;
    s.cx += (tx - s.cx) * k;
    s.v += ((s.cx - prev) / dt - s.v) * 0.25;

    // 4) Hình dạng: rộng theo 2 tab lân cận, giãn + dẹt nhẹ theo vận tốc
    const stretch = Math.min(0.12, Math.abs(s.v) / 9000);
    const w = daysThumbWidthAt(geo, s.cx) * (1 + stretch);
    thumb.style.left = (s.cx - w / 2) + 'px';
    thumb.style.width = w + 'px';
    thumb.style.transform = `scale(1.07, ${(1.07 - stretch * 0.45).toFixed(3)})`;

    // 5) Chữ ngày gần tâm viên kính nhất sáng lên
    setDaysScrubHot(daysNearestTab(geo, s.cx).date);

    s.raf = requestAnimationFrame(daysScrubTick);
};

const onDaysScrubMove = (e) => {
    const s = daysScrub;
    if (!s || e.pointerId !== s.pointerId) return;
    if (window.isDayEditMode) { cleanupDaysScrub(true); return; }
    s.lastX = e.clientX;

    if (!s.moved) {
        const dx = Math.abs(e.clientX - s.startX), dy = Math.abs(e.clientY - s.startY);
        if (dy > 10 && dy > dx) { abortDaysScrub(); return; } // vuốt dọc -> trả lại cho trang cuộn
        if (dx < DAYS_SCRUB_DEADZONE) return;

        // Vào scrub ngay khi vuốt ngang (không cần giữ lâu)
        s.moved = true;
        if (typeof window.endDayPress === 'function') window.endDayPress(); // chắc chắn không phải nhấn giữ để xóa
        const c = document.getElementById('days-tabs');
        const thumb = document.getElementById('days-thumb');
        if (c) { s.prevScrollBehavior = c.style.scrollBehavior; c.style.scrollBehavior = 'auto'; } // tắt scroll-smooth để cuộn từng frame không bị trễ
        if (thumb) {
            thumb.getAnimations().forEach(a => a.cancel());
            thumb.classList.add('is-scrubbing');
        }
        s.raf = requestAnimationFrame(daysScrubTick);
    }
};

const onDaysScrubEnd = (e) => {
    const s = daysScrub;
    if (!s || e.pointerId !== s.pointerId) return;

    // Chỉ chạm, chưa lướt -> để click thường xử lý
    if (!s.moved) { cleanupDaysScrub(false); return; }

    lastDaysScrubEnd = Date.now();
    const thumb = document.getElementById('days-thumb');
    const target = daysNearestTab(s.geo, s.cx + s.v * DAYS_SCRUB_FLICK); // có quán tính: hất nhanh thì đi xa hơn chút
    const commitDate = target.date !== s.originDate ? target.date : null;

    if (commitDate && thumb) {
        // Báo vị trí tự do hiện tại để lần render sau trượt tiếp từ đây (không giật về chỗ cũ)
        window._daysThumb = {
            tripId: state.activeTripId, date: s.originDate,
            left: parseFloat(thumb.style.left) || 0, top: thumb.offsetTop,
            width: parseFloat(thumb.style.width) || thumb.offsetWidth, height: thumb.offsetHeight
        };
        const oldThumb = thumb;
        cleanupDaysScrub(false);
        if (typeof switchDay === 'function') switchDay(commitDate); // đúng logic đổi ngày cũ
        const hotBtn = document.getElementById(`tab-${commitDate}`);
        if (document.getElementById('days-thumb') === oldThumb &&
            (state.activeDayDate !== commitDate || !hotBtn || !hotBtn.classList.contains('is-active'))) {
            renderDaysTabs(); // phòng khi switchDay không tự render lại các tab
        }
    } else {
        cleanupDaysScrub(true); // thả gần ngày gốc -> hít về ngày gốc
    }
};
const onDaysScrubCancel = () => cleanupDaysScrub(true);

// Gắn sự kiện 1 lần (event delegation)
const bindDaysGlassInteractions = (container) => {
    if (container._glassBound) return;
    container._glassBound = true;

    container.addEventListener('pointerdown', (e) => {
        if (!isDayAnimOn()) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const btn = e.target.closest && e.target.closest('button[id^="tab-"]');
        const thumb = document.getElementById('days-thumb');
        const track = document.getElementById('days-track');
        if (!btn || !thumb || !track || window.isDayEditMode) return;
        if (btn.id !== `tab-${state.activeDayDate}`) return;

        abortDaysScrub();
        thumb.classList.add('is-pressed'); // nhấc lên ngay khi chạm

        const geo = getDayTabButtons().map(b => ({
            date: b.id.slice(4),
            w: b.offsetWidth,
            c: b.offsetLeft + b.offsetWidth / 2
        }));
        const origin = geo.find(g => g.date === state.activeDayDate);
        if (!origin) { thumb.classList.remove('is-pressed'); return; }

        const tr = track.getBoundingClientRect();
        daysScrub = {
            pointerId: e.pointerId,
            originDate: state.activeDayDate,
            hotDate: state.activeDayDate,
            geo,
            // Khoảng lệch giữa ngón tay và tâm viên kính lúc chạm -> viên kính không "nhảy" về ngón tay
            grab: (e.clientX - tr.left) - origin.c,
            cx: origin.c, v: 0, lastT: 0,
            startX: e.clientX, startY: e.clientY, lastX: e.clientX,
            moved: false, raf: 0
        };

        window.addEventListener('pointermove', onDaysScrubMove);
        window.addEventListener('pointerup', onDaysScrubEnd);
        window.addEventListener('pointercancel', onDaysScrubCancel);
    });

    // Đang scrub -> chặn cuộn ngang native để ngón tay chỉ điều khiển viên kính
    container.addEventListener('touchmove', (e) => {
        if (daysScrub && daysScrub.moved && e.cancelable) e.preventDefault();
    }, { passive: false });

    // Sau khi scrub xong, nuốt cú click "ma" để không đổi ngày lần nữa
    container.addEventListener('click', (e) => {
        if (Date.now() - lastDaysScrubEnd < 400) { e.stopPropagation(); e.preventDefault(); }
    }, true);
};

// Bật/tắt data-animation-on lúc đang chạy -> render lại ngay
const bindDaysAnimToggle = () => {
    if (window._daysAnimObserver) return;
    window._daysAnimObserver = new MutationObserver(() => {
        if (document.getElementById('days-tabs') && state && state.activeTripId) renderDaysTabs();
    });
    window._daysAnimObserver.observe(document.documentElement, {
        attributes: true, subtree: true, attributeFilter: ['data-animation-on']
    });
};

// ==========================================================
// UI CŨ NGUYÊN BẢN (khi data-animation-on không phải "true")
// ==========================================================
const renderDaysTabsLegacy = (trip, container, todayStr) => {
            // RENDER GIAO DIỆN
            container.innerHTML = trip.days.map((day, idx) => {
                const isActive = state.activeDayDate === day.date;
                const isRealToday = day.date === todayStr;
                const isPast = day.date < todayStr;
                
                // Lấy cờ trạng thái Edit Mode từ window
                const isEditMode = window.isDayEditMode || false;

                const pastClass = (isPast && !isActive) ? 'opacity-40 grayscale-[40%]' : 'opacity-100';
                
                // Hiệu ứng Jiggle nếu đang bật Edit Mode
                const jiggleClass = isEditMode ? 'animate-jiggle' : '';

                // Liquid Glass UI (Không dùng shadow ngoài)
                const activeClass = isActive 
                    ? 'bg-gradient-to-br from-blue-400 to-blue-500 border border-white/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.1)]' 
                    : 'bg-white/50 border border-white/60 hover:bg-white/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]';
                
                const textColor = isActive ? 'text-white' : 'text-slate-600';
                const subtitleColor = isActive ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-500';

                return `
                    <!-- Gắn sự kiện touch/mouse để bắt đầu nhấn giữ (Long-press) -->
                    <button id="tab-${day.date}" 
                        ${isEditMode ? '' : `onclick="switchDay('${day.date}')"`}
                        onmousedown="startDayPress('${day.date}', event)" 
                        onmousemove="moveDayPress(event)"
                        onmouseup="endDayPress()" 
                        onmouseleave="endDayPress()" 
                        ontouchstart="startDayPress('${day.date}', event)" 
                        ontouchmove="moveDayPress(event)"
                        ontouchend="endDayPress()"
                        class="flex-shrink-0 h-8 md:h-16 px-3.5 md:px-6 rounded-full md:rounded-[1.25rem] transition-all relative group flex flex-col justify-center items-center md:items-start ${activeClass} ${pastClass} ${jiggleClass}">
                        
                        <!-- Nếu đang Edit Mode -> Hiện nút X để xóa (Kính lỏng) | Nếu không -> Hiện badge NAY (nếu có) -->
                        ${isEditMode ? `
                            <div onclick="confirmDeleteDay('${day.date}')" class="absolute -top-1.5 -left-1.5 md:-top-2 md:-left-2 w-5 h-5 md:w-6 md:h-6 bg-slate-200/90 backdrop-blur-md border border-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-100 z-20 touch-manipulation cursor-pointer">
                                <i class="fa-solid fa-xmark text-[10px] md:text-xs"></i>
                            </div>
                        ` : (isRealToday ? `
                            <div class="absolute -top-2 -right-1 md:-top-2 md:-right-1.5 bg-red-500/90 backdrop-blur-md text-white text-[7px] md:text-[8px] font-black px-2 py-0.5 rounded-full z-10 shadow-[0_2px_8px_rgba(239,68,68,0.4)] tracking-wider">NAY</div>
                        ` : '')}
                        
                        <div class="hidden md:block text-[10px] font-black uppercase tracking-wider ${subtitleColor} mb-1 drop-shadow-sm pointer-events-none">Ngày ${idx + 1}</div>
                        <div class="font-bold text-[11px] md:text-sm ${textColor} drop-shadow-sm pointer-events-none">${formatDisplayDate(day.date)}</div>
                    </button>
                `; 
            }).join('');
};

// ==========================================================
// UI MỚI: LIQUID GLASS
// ==========================================================

// "Chữ ký" của danh sách tab: nếu không đổi thì KHÔNG cần dựng lại DOM, chỉ cập nhật class + viên kính
const daysTabsSignature = (trip, todayStr) =>
    [state.activeTripId, todayStr, window.isDayEditMode ? 1 : 0, trip.days.map(d => d.date).join(',')].join('|');

// Đường nhanh khi đổi ngày: giữ nguyên DOM, đổi class (CSS tự transition) + trượt viên kính từ vị trí HIỆN TẠI
const patchDaysTabs = (trip, container, todayStr) => {
    const track = document.getElementById('days-track');
    const thumb = document.getElementById('days-thumb');
    if (!track || !thumb || container._daysSig !== daysTabsSignature(trip, todayStr)) return false;

    // Nhãn thay đổi (vd: đổi ngôn ngữ) -> dựng lại đầy đủ
    for (const day of trip.days) {
        const b = document.getElementById(`tab-${day.date}`);
        const main = b && b.querySelector('.day-main');
        if (!main || main.textContent.trim() !== String(formatDisplayDate(day.date)).trim()) return false;
    }
    const activeBtn = document.getElementById(`tab-${state.activeDayDate}`);
    if (!activeBtn) return false;

    trip.days.forEach(day => {
        const b = document.getElementById(`tab-${day.date}`);
        const isActive = state.activeDayDate === day.date;
        b.classList.toggle('is-active', isActive);
        b.classList.toggle('day-past', day.date < todayStr && !isActive);
    });

    const to = { left: activeBtn.offsetLeft, top: activeBtn.offsetTop, width: activeBtn.offsetWidth, height: activeBtn.offsetHeight };
    // Đọc vị trí đang hiển thị (kể cả giữa chừng animation / vị trí tự do lúc scrub)
    const cs = getComputedStyle(thumb);
    const from = { left: parseFloat(cs.left) || 0, width: parseFloat(cs.width) || to.width };
    thumb.getAnimations().forEach(a => a.cancel());
    thumb.style.cssText = `left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px;opacity:1;`;

    if (Math.abs(from.left - to.left) > 1 || Math.abs(from.width - to.width) > 1) {
        playDaysThumbMove(thumb, from, to);
    }
    window._daysThumb = { tripId: state.activeTripId, date: state.activeDayDate, ...to };
    return true;
};

const renderDaysTabsGlass = (trip, container, todayStr) => {
            ensureDaysGlassStyle();
            bindDaysGlassInteractions(container);

            // Đổi ngày thông thường: không dựng lại DOM
            if (patchDaysTabs(trip, container, todayStr)) return;

            // RENDER GIAO DIỆN
            const tabsHTML = trip.days.map((day, idx) => {
                const isActive = state.activeDayDate === day.date;
                const isRealToday = day.date === todayStr;
                const isPast = day.date < todayStr;
                
                // Lấy cờ trạng thái Edit Mode từ window
                const isEditMode = window.isDayEditMode || false;

                // Hiệu ứng Jiggle nếu đang bật Edit Mode
                const jiggleClass = isEditMode ? 'animate-jiggle' : '';

                // Trạng thái hiển thị do CSS đảm nhiệm: is-active / day-today / day-past
                const stateClass = [
                    isActive ? 'is-active' : '',
                    isRealToday ? 'day-today' : '',
                    (isPast && !isActive) ? 'day-past' : ''
                ].join(' ');

                return `
                    <!-- Gắn sự kiện touch/mouse để bắt đầu nhấn giữ (Long-press) -->
                    <button id="tab-${day.date}" 
                        ${isEditMode ? '' : `onclick="switchDay('${day.date}')"`}
                        onmousedown="startDayPress('${day.date}', event)" 
                        onmousemove="moveDayPress(event)"
                        onmouseup="endDayPress()" 
                        onmouseleave="endDayPress()" 
                        ontouchstart="startDayPress('${day.date}', event)" 
                        ontouchmove="moveDayPress(event)"
                        ontouchend="endDayPress()"
                        class="day-tab day-chip flex-shrink-0 h-8 md:h-16 px-3.5 md:px-6 rounded-full md:rounded-[1.25rem] relative group flex flex-col justify-center items-center md:items-start ${stateClass} ${jiggleClass}">
                        
                        <!-- Nếu đang Edit Mode -> Hiện nút X để xóa (Kính lỏng) | Nếu không -> Hiện badge NAY (nếu có) -->
                        ${isEditMode ? `
                            <div onclick="confirmDeleteDay('${day.date}')" class="absolute -top-1.5 -left-1.5 md:-top-2 md:-left-2 w-5 h-5 md:w-6 md:h-6 bg-slate-200 border border-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-100 z-20 touch-manipulation cursor-pointer">
                                <i class="fa-solid fa-xmark text-[10px] md:text-xs"></i>
                            </div>
                        ` : (isRealToday ? `
                            <div class="absolute -top-2 -right-1 md:-top-2 md:-right-1.5 bg-red-500/90 text-white text-[7px] md:text-[8px] font-black px-2 py-0.5 rounded-full z-10 shadow-[0_2px_8px_rgba(239,68,68,0.4)] tracking-wider">NAY</div>
                        ` : '')}
                        
                        <div class="day-sub hidden md:block text-[10px] font-black uppercase tracking-wider mb-1 pointer-events-none">Ngày ${idx + 1}</div>
                        <div class="day-main font-bold text-[11px] md:text-sm pointer-events-none">${formatDisplayDate(day.date)}</div>
                    </button>
                `; 
            }).join('');

            container.innerHTML = `
                <div id="days-track" class="day-track">
                    <div id="days-thumb" class="day-thumb" style="opacity:0"></div>
                    ${tabsHTML}
                </div>
            `;
            container._daysSig = daysTabsSignature(trip, todayStr);

            // ---------- Viên kính: định vị + trượt/co giãn sang ngày mới ----------
            const thumb = document.getElementById('days-thumb');
            const activeBtn = document.getElementById(`tab-${state.activeDayDate}`);
            if (thumb && activeBtn) {
                const to = {
                    left: activeBtn.offsetLeft,
                    top: activeBtn.offsetTop,
                    width: activeBtn.offsetWidth,
                    height: activeBtn.offsetHeight
                };
                thumb.style.cssText = `left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px;opacity:1;`;

                const from = window._daysThumb;
                const sameTrip = !!from && from.tripId === state.activeTripId;
                const moved = sameTrip && (Math.abs(from.left - to.left) > 1 || Math.abs(from.width - to.width) > 1);

                if (moved && thumb.animate && !daysReduceMotion()) {
                    playDaysThumbMove(thumb, from, to);

                    // Chữ + chip đổi trạng thái êm theo viên kính (tab vừa được dựng lại từ đầu)
                    const fade = (btn, a, b, delay) => {
                        if (!btn || !btn.animate) return;
                        const opt = { duration: 300, delay, fill: 'backwards', easing: 'ease-out' };
                        const main = btn.querySelector('.day-main');
                        const sub = btn.querySelector('.day-sub');
                        if (main) main.animate([{ color: a.main }, { color: b.main }], opt);
                        if (sub) sub.animate([{ color: a.sub }, { color: b.sub }], opt);
                        btn.animate([
                            { backgroundColor: a.bg, borderColor: a.border },
                            { backgroundColor: b.bg, borderColor: b.border }
                        ], opt);
                    };
                    const newDate = state.activeDayDate;
                    fade(activeBtn, dayTabLook(newDate, false, todayStr), dayTabLook(newDate, true, todayStr), 90);
                    fade(document.getElementById(`tab-${from.date}`),
                        dayTabLook(from.date, true, todayStr), dayTabLook(from.date, false, todayStr), 0);
                } else if (!sameTrip && thumb.animate && !daysReduceMotion()) {
                    // Lần đầu / đổi chuyến đi / vừa bật animation: viên kính nở ra nhẹ nhàng
                    thumb.animate([
                        { opacity: 0, transform: 'scale(0.8)' },
                        { opacity: 1, transform: 'scale(1)' }
                    ], { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
                }

                window._daysThumb = { tripId: state.activeTripId, date: state.activeDayDate, ...to };
            }
};

// ==========================================================
// HÀM CHÍNH
// ==========================================================
const renderDaysTabs = () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const container = document.getElementById('days-tabs');
            
            const todayStr = typeof getRelativeDateStr === 'function' ? getRelativeDateStr(0) : new Date().toISOString().slice(0, 10);

            // LOGIC ƯU TIÊN NGÀY HIỆN TẠI (Giữ nguyên)
            if (window._lastRenderedTripId !== state.activeTripId) {
                const hasToday = trip.days.find(d => d.date === todayStr);
                let dayForceChanged = false;
                
                if (hasToday && state.activeDayDate !== todayStr) {
                    state.activeDayDate = todayStr;
                    dayForceChanged = true;
                } else if (trip.days.length > 0 && !trip.days.find(d => d.date === state.activeDayDate)) {
                    state.activeDayDate = trip.days[0].date;
                    dayForceChanged = true;
                }
                window._lastRenderedTripId = state.activeTripId;
                if (dayForceChanged && typeof renderTimeline === 'function') setTimeout(() => renderTimeline(), 0);
            }

            // Đang scrub dở mà DOM bị render lại (vd: vào edit mode) -> dọn phiên scrub
            abortDaysScrub();
            bindDaysAnimToggle();

            if (isDayAnimOn()) {
                renderDaysTabsGlass(trip, container, todayStr);
            } else {
                window._daysThumb = null; // lần sau bật lại sẽ nở ra thay vì trượt từ vị trí cũ
                container._daysSig = null; // buộc dựng lại đầy đủ khi bật lại UI mới
                renderDaysTabsLegacy(trip, container, todayStr);
            }

            // LOGIC TỰ ĐỘNG CUỘN (Giữ nguyên)
            setTimeout(() => {
                const activeTab = document.getElementById(`tab-${state.activeDayDate}`);
                if (activeTab && container) {
                    const containerWidth = container.offsetWidth;
                    const scrollLeftPos = activeTab.offsetLeft - (containerWidth * 0.3);
                    container.scrollTo({ left: Math.max(0, scrollLeftPos), behavior: 'smooth' });
                }
            }, 50);
        };

        /* ==========================================================
   YÊU CẦU: thêm GSAP vào <head> (trước script chính)
   <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
   ========================================================== */

/* ==========================================================
   TL_FX — Animation cho Timeline (GSAP, phẳng: không shadow, không gradient)
   - Entrance: chờ preloader (html.fl-lock) gỡ xong mới chạy, chỉ chạy khi đổi trip/ngày
   - Khói xám trắng, cắt gọn theo mép card (không tràn ra ngoài => nhẹ, không lag)
   - Check: máy bay bay vút từ nút sang góc xa, kéo làn khói mỏng tỏa rộng phía sau rồi tan (~1.6s)
   - Bỏ check: máy bay bay chiều ngược lại từ góc xa về nút, cũng kéo khói phía sau
   - Lớp hiệu ứng gắn trong thẻ => scroll mượt, không lệch (không đồng bộ vị trí mỗi frame)
   - html[data-animation-on="false"] (hoặc prefers-reduced-motion) => tắt hết animation, trả về giao diện mặc định
   ========================================================== */
const TL_FX = (function () {
    const html = document.documentElement;
    let lastKey = null;
    let entered = false;
    let waitMO = null;

    const activeFx = new Set();       // các hiệu ứng khói đang chạy (để tắt ngay khi công tắc = false)
    let enterTl = null;               // timeline entrance đang chạy

    // html[data-animation-on="false"] (hoặc "0" / "off") => KHÔNG animation, timeline hiển thị mặc định
    const animOn = () => {
        const v = String(html.dataset.animationOn).toLowerCase();
        return !(v === 'false' || v === '0' || v === 'off');
    };
    const enabled = () =>
        !!window.gsap && animOn() &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ENTRANCE_SEL = '.tl-node, .tl-body, .tl-time, .tl-extra, .tl-line';
    function resetEntrance(container) {                        // gỡ mọi style inline do GSAP gắn vào
        if (!container || !window.gsap) return;
        gsap.set(container.querySelectorAll(ENTRANCE_SEL), { clearProps: 'opacity,visibility,transform,clipPath' });
    }
    function stopAll() {                                        // dừng & dọn sạch ngay lập tức
        if (waitMO) { waitMO.disconnect(); waitMO = null; }
        if (enterTl) { enterTl.kill(); enterTl = null; }
        Array.from(activeFx).forEach(k => k());
        resetEntrance(document.getElementById('timeline-container'));
    }
    // Đổi data-animation-on sang false lúc đang chạy => tắt luôn
    new MutationObserver(() => { if (!animOn()) stopAll(); })
        .observe(html, { attributes: true, attributeFilter: ['data-animation-on'] });

    // Chờ preloader xong (giống cách sidebar đang làm)
    function afterPreloader(cb) {
        if (waitMO) { waitMO.disconnect(); waitMO = null; }
        if (!html.classList.contains('fl-lock')) { cb(); return; }
        waitMO = new MutationObserver(() => {
            if (!html.classList.contains('fl-lock')) {
                waitMO.disconnect(); waitMO = null; cb();
            }
        });
        waitMO.observe(html, { attributes: true, attributeFilter: ['class'] });
    }

    // ---------- ENTRANCE ----------
    function enter(container, key) {
        if (!enabled()) return;
        if (key === lastKey && entered) return;   // render lại cùng ngày (check/sửa/xóa) -> không phát lại
        lastKey = key;
        entered = false;

        const q = (sel) => container.querySelectorAll(sel);
        // Ẩn ngay để không nháy trước khi preloader xong
        gsap.set(q('.tl-node, .tl-body, .tl-time, .tl-extra'), { autoAlpha: 0 });
        gsap.set(q('.tl-line'), { clipPath: 'inset(0 0 100% 0)' });

        afterPreloader(() => {
            if (!enabled()) { entered = true; resetEntrance(container); return; }   // công tắc bị tắt trong lúc chờ preloader
            const nodes = container.querySelectorAll('.tl-node');
            if (!nodes.length && !container.querySelector('.tl-extra')) return;
            entered = true;

            const tl = enterTl = gsap.timeline({
                defaults: { ease: 'power3.out' },
                onComplete: () => {
                    enterTl = null;
                    gsap.set(container.querySelectorAll('.tl-node, .tl-body, .tl-time, .tl-extra, .tl-line'),
                        { clearProps: 'opacity,visibility,transform,clipPath' });
                }
            });
            const step = Math.min(0.09, 0.9 / Math.max(nodes.length, 1));

            container.querySelectorAll('.tl-item').forEach((item, i) => {
                const at = i * step;
                const node = item.querySelector('.tl-node');
                const body = item.querySelector('.tl-body');
                const time = item.querySelector('.tl-time');
                const line = item.querySelector('.tl-line');
                if (node) tl.fromTo(node, { autoAlpha: 0, scale: 0.4 },
                    { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'back.out(1.8)' }, at);
                if (time) tl.fromTo(time, { autoAlpha: 0, x: -8 },
                    { autoAlpha: 1, x: 0, duration: 0.5 }, at + 0.05);
                if (line) tl.to(line, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'power2.inOut' }, at + 0.1);
                if (body) tl.fromTo(body, { autoAlpha: 0, y: 28 },
                    { autoAlpha: 1, y: 0, duration: 0.7 }, at + 0.08);
            });

            const extras = container.querySelectorAll('.tl-extra');
            if (extras.length) {
                tl.fromTo(extras, { autoAlpha: 0, y: 20 },
                    { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.12 }, '>-0.25');
            }
        });
    }

    // ---------- SMOKE (làn khói xám, bao phủ chậm) ----------
    const clamp01 = (x) => Math.min(1, Math.max(0, x));
    const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
    let sprites = null;

    // Sprite khói: nhiều đốm mờ chồng lệch tâm => viền xốp, không giống "quả bóng tròn"
    function getSprites() {
        if (sprites) return sprites;
        sprites = [0, 1, 2].map(() => {
            const S = 192, c = document.createElement('canvas');
            c.width = c.height = S;
            const g = c.getContext('2d');
            for (let i = 0; i < 11; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = Math.random() * S * 0.24;
                const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d;
                const r = S * (0.16 + Math.random() * 0.2);
                const gr = g.createRadialGradient(x, y, 0, x, y, r);
                gr.addColorStop(0, 'rgba(214,216,222,0.36)');
                gr.addColorStop(0.5, 'rgba(214,216,222,0.15)');
                gr.addColorStop(1, 'rgba(214,216,222,0)');
                g.fillStyle = gr;
                g.fillRect(0, 0, S, S);
            }
            return c;
        });
        return sprites;
    }

    // Máy bay bay THẲNG vút qua thẻ, kéo theo làn khói mỏng tỏa rộng phía sau rồi tan nhanh.
    //  - CHECK   : từ nút bay sang góc xa rồi vút ra khỏi thẻ.
    //  - BỎ CHECK: bay chiều ngược lại, từ góc xa về nút rồi vút ra khỏi thẻ.
    // Lớp hiệu ứng được gắn TRỰC TIẾP vào trong thẻ (absolute) => scroll do trình duyệt tự lo,
    // không đồng bộ vị trí bằng JS mỗi frame. Nếu timeline render lại thì tự gắn sang thẻ mới.
    let planePath = null;
    function getPlane() {                                     // thân máy bay phẳng, hướng về +x, không shadow/gradient
        if (planePath) return planePath;
        const top = [[1, 0], [0.3, -0.12], [-0.1, -0.95], [-0.3, -0.95], [-0.22, -0.14],
                     [-0.75, -0.1], [-0.95, -0.36], [-1.05, -0.36], [-1, 0]];
        const pts = top.concat(top.slice(1, -1).reverse().map(([x, y]) => [x, -y]));
        planePath = new Path2D();
        pts.forEach(([x, y], i) => i ? planePath.lineTo(x, y) : planePath.moveTo(x, y));
        planePath.closePath();
        return planePath;
    }

    function ripple(btn) {
        if (!enabled()) return;
        const id = btn.dataset.tlCheck;
        const card0 = btn.closest('.tl-card');
        if (!card0) return;
        const rev = btn.dataset.done === '1';                // đang bỏ tick
        const rnd = (x, y) => x + Math.random() * (y - x);

        const rect = card0.getBoundingClientRect();
        const bb = btn.getBoundingClientRect();
        const W = Math.round(rect.width), H = Math.round(rect.height);
        const sx = bb.left + bb.width / 2 - rect.left;
        const sy = bb.top + bb.height / 2 - rect.top;
        const fx = sx < W / 2 ? W * 0.94 : W * 0.06;         // góc xa nhất so với nút
        const fy = sy < H / 2 ? H * 0.92 : H * 0.08;

        const size0 = Math.max(90, Math.max(W, H) * 0.28);   // cỡ cụm khói
        const spread = Math.min(W, H) * 0.55;                // độ rộng làn khói
        const A = rev ? { x: fx, y: fy } : { x: sx, y: sy };
        const B = rev ? { x: sx, y: sy } : { x: fx, y: fy };
        const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
        const ux = (B.x - A.x) / len, uy = (B.y - A.y) / len, nx = -uy, ny = ux;
        const E = { x: B.x + ux * size0 * 0.9, y: B.y + uy * size0 * 0.9 };   // bay lố ra ngoài thẻ cho "vút"
        const Dx = E.x - A.x, Dy = E.y - A.y;
        const heading = Math.atan2(uy, ux);                  // bay thẳng: hướng cố định
        const pathAt = (p) => ({ x: A.x + Dx * p, y: A.y + Dy * p });
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        const T_FLY = 0.6;                                   // máy bay bay qua thẻ
        const T_D = 0.7;                                     // bắt đầu tan
        const FILM = 0.4;                                    // độ đậm tối đa của lớp sương mờ
        const planeSize = Math.min(Math.max(Math.min(W, H) * 0.1, 20), 32);

        // Lớp hiệu ứng nằm trong thẻ; thẻ đã có overflow-hidden + bo góc nên tự cắt đúng mép
        const host = document.createElement('div');
        Object.assign(host.style, {
            position: 'absolute', inset: '0', borderRadius: 'inherit', overflow: 'hidden',
            pointerEvents: 'none', zIndex: 80
        });
        const film = document.createElement('div');          // sương mờ phẳng (không backdrop-filter => nhẹ)
        Object.assign(film.style, {
            position: 'absolute', inset: 0, opacity: 0, background: 'rgba(226,228,233,0.30)'
        });
        const cv = document.createElement('canvas');
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        Object.assign(cv.style, { position: 'absolute', inset: 0, width: '100%', height: '100%' });
        host.appendChild(film); host.appendChild(cv);
        const ctx = cv.getContext('2d');
        ctx.scale(dpr, dpr);

        let posEl = null;
        const attach = (card) => {
            if (getComputedStyle(card).position === 'static') { card.style.position = 'relative'; posEl = card; }
            card.appendChild(host);
        };
        attach(card0);

        const sp = getSprites();
        const plane = getPlane();
        const parts = [];
        const S = { p: 0, done: 0 };
        let prev = pathAt(0);
        const t0 = performance.now();

        const liveCard = () => {
            const nb = document.querySelector(`[data-tl-check="${CSS.escape(String(id))}"]`);
            const c = nb && nb.closest('.tl-card');
            return (c && c.isConnected) ? c : null;
        };
        const blit = (img, x, y, size, rot, alpha) => {
            ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot);
            ctx.drawImage(img, -size / 2, -size / 2, size, size); ctx.restore();
        };
        // Khói tỏa: tản ngang hai bên đường bay và trôi dạt ra xa dần
        const emit = (x, y, t, core) => {
            const o = core ? rnd(-6, 6) : rnd(-spread, spread);
            const sd = o / spread;
            parts.push({
                x: x + nx * o + ux * rnd(-size0 * 0.25, size0 * 0.25),
                y: y + ny * o + uy * rnd(-size0 * 0.25, size0 * 0.25),
                born: t, ph: rnd(0, 6.28),
                vx: nx * sd * rnd(20, 50) + rnd(-8, 8), vy: ny * sd * rnd(20, 50) - rnd(4, 14),
                s0: size0 * (core ? rnd(0.35, 0.55) : rnd(0.7, 1.2)), grow: rnd(0.4, 0.8),
                rot: rnd(0, 6.28), rs: rnd(-0.5, 0.5), a0: core ? rnd(0.2, 0.32) : rnd(0.2, 0.34),
                dl: rnd(0, 0.2), fd: rnd(0.5, 0.7), rise: rnd(24, 54),
                sp: sp[(Math.random() * 3) | 0]
            });
        };

        function draw() {
            const t = (performance.now() - t0) / 1000;
            if (!host.isConnected) {                          // timeline vừa render lại => gắn sang thẻ mới
                const c = liveCard();
                if (c) attach(c);
            }

            const h = pathAt(S.p);
            if (S.p < 1) {
                const dist = Math.hypot(h.x - prev.x, h.y - prev.y);
                const n = Math.max(0, Math.ceil(dist / (size0 * 0.18)));
                for (let i = 1; i <= n; i++) {
                    const k = i / n, px = prev.x + (h.x - prev.x) * k, py = prev.y + (h.y - prev.y) * k;
                    emit(px, py, t, true);
                    for (let m = 0; m < 3; m++) emit(px, py, t, false);
                }
                prev = h;
            }

            ctx.clearRect(0, 0, W, H);
            for (let i = parts.length - 1; i >= 0; i--) {
                const q = parts[i];
                const age = t - q.born;
                const out = smooth((t - T_D - q.dl) / q.fd);
                if (out >= 1) { parts.splice(i, 1); continue; }
                blit(q.sp,
                     q.x + q.vx * age + Math.sin(t * 1.6 + q.ph) * 6,
                     q.y + q.vy * age - out * q.rise,
                     q.s0 * (1 + q.grow * Math.min(1, age / 0.9) + out * 0.3),
                     q.rot + q.rs * age, q.a0 * smooth(age * 6) * (1 - out));
            }

            if (S.p < 1) {                                    // máy bay (phẳng, xám đậm trung tính)
                ctx.save();
                ctx.globalAlpha = 0.92 * smooth(S.p * 14);
                ctx.translate(h.x, h.y); ctx.rotate(heading);
                ctx.scale(planeSize, planeSize);
                ctx.fillStyle = 'rgb(96,96,102)';
                ctx.fill(plane);
                ctx.restore();
            }
            film.style.opacity = String(smooth(S.p * 1.2) * FILM * (1 - S.done));
        }

        gsap.ticker.add(draw);
        const kill = () => {
            gsap.ticker.remove(draw); host.remove(); activeFx.delete(kill);
            if (kill.tl) kill.tl.kill();
            if (posEl && posEl.isConnected) posEl.style.position = '';
        };
        const tl = gsap.timeline({ onComplete: kill });
        kill.tl = tl; activeFx.add(kill);
        tl.to(S, { p: 1, duration: T_FLY, ease: 'power2.in' }, 0);       // tăng tốc: bay vút
        tl.to(S, { done: 1, duration: 0.9, ease: 'sine.inOut' }, T_D);   // khói tan nhanh
    }

    // Nút check bật nảy sau khi render lại
    function pop(id) {
        if (!enabled()) return;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const nb = document.querySelector(`[data-tl-check="${CSS.escape(String(id))}"]`);
            if (!nb) return;
            gsap.fromTo(nb, { scale: 0.55 },
                { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)', clearProps: 'transform' });
        }));
    }

    // Lắng nghe ở pha capture => chạy TRƯỚC onclick inline, không đụng toggleComplete
    function bind(container) {
        if (container.__tlFxBound) return;
        container.__tlFxBound = true;
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-tl-check]');
            if (!btn) return;
            ripple(btn);
            pop(btn.dataset.tlCheck);
        }, true);
    }

    return { enter, bind };
})();


/* ==========================================================
   renderTimeline — LOGIC GIỮ NGUYÊN 100%
   Chỉ thêm: class hook (tl-*), data-tl-check/data-done, và 2 dòng gọi TL_FX
   ========================================================== */
const renderTimeline = () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip.days.find(d => d.date === state.activeDayDate);
            const container = document.getElementById('timeline-container');
            
            // 1. TRƯỜNG HỢP NGÀY TRỐNG (THÊM NÚT XÓA NGÀY)
            if (!day || day.activities.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12 md:py-16 px-4 md:ml-16 relative z-10 bg-white/50 backdrop-blur-2xl border border-white/80 shadow-[0_10px_40px_rgba(0,0,0,0.03)] rounded-[2rem] mb-10">
                        <div class="w-20 h-20 rounded-full bg-white/80 backdrop-blur-md border border-white flex items-center justify-center text-slate-300 mx-auto mb-4 text-4xl shadow-[0_8px_20px_rgba(0,0,0,0.04)]"><i class="fa-solid fa-mug-hot"></i></div>
                        <h3 class="text-xl font-black text-slate-700">Chưa có lịch trình</h3>
                        <p class="text-slate-500 text-[13px] md:text-sm mt-2 font-medium">Bấm <strong class="text-blue-600">+ Thêm</strong> để lên kế hoạch cho ngày này.</p>
                        
                        <!-- Nút Xóa Ngày (Kính lỏng, xuất hiện khi ngày không có hoạt động) -->
                       <div class="mt-6 flex justify-center" data-html2canvas-ignore>
                            <button onclick="confirmDeleteDay('${day.date}')" class="h-[3.25rem] px-6 bg-red-100/80 backdrop-blur-xl hover:bg-red-200/80 text-red-900 rounded-[1.25rem] font-bold text-[13px] transition-all shadow-[0_4px_12px_rgba(244,63,94,0.06),inset_0_2px_4px_rgba(255,255,255,0.8)] active:scale-95 flex items-center justify-center gap-2.5 border border-rose-200/70 touch-manipulation group">
                                <div class="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center border border-rose-200 shadow-[0_2px_5px_rgba(0,0,0,0.06)] group-hover:scale-110 transition-transform flex-shrink-0">
                                    <i class="fa-solid fa-trash-can text-rose-600 text-[13px]"></i>
                                </div>
                                <span class="drop-shadow-sm pr-1">Xóa ngày này</span>
                            </button>
                        </div>
                    </div>`;
                return;
            }

            let html = '';
            let dailyTotalVND = 0; 
            const rates = typeof exchangeRates !== 'undefined' ? exchangeRates : { VND: 1, THB: 720, JPY: 170, KRW: 18.5, USD: 25000, EUR: 27500 };

            day.activities.forEach((act, index) => {
                const status = getActivityStatus(act, day.date);
                const isDone = act.isCompleted;

                if(act.budgetAmt && !isNaN(act.budgetAmt)) {
                    dailyTotalVND += parseFloat(act.budgetAmt) * (rates[act.budgetCur] || 1);
                }

                const iconClass = act.icon && act.icon.startsWith('fa-') ? act.icon : 'fa-location-crosshairs';

                // Lộ trình hiển thị (UI 2 khối hộp kính đối xứng đã làm ở bước trước)
                let routeHtml = '';
                if (act.from && act.to) {
                    routeHtml = `
                    <div class="bg-white/50 backdrop-blur-xl border border-white/80 rounded-[1.25rem] p-3.5 flex flex-col gap-2.5 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Từ</div>
                                <div class="text-[13px] font-semibold text-slate-700 break-words leading-relaxed">${act.from}</div>
                            </div>
                            <div class="pt-3 text-slate-300 flex-shrink-0"><i class="fa-solid fa-arrow-right-long"></i></div>
                            <div class="flex-1 min-w-0 text-right">
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Đến</div>
                                <div class="text-[13px] font-semibold text-slate-700 break-words leading-relaxed">${act.to}</div>
                            </div>
                        </div>
                        <button onclick="openGoogleMaps('${(act.from || '').replace(/'/g, "\\'")}', '${(act.to || '').replace(/'/g, "\\'")}')" class="w-full h-10 bg-blue-600/90 backdrop-blur-2xl border border-blue-400/60 hover:bg-blue-600 text-white rounded-[1rem] font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95 mt-2 shadow-[0_4px_12px_rgba(37,99,235,0.2),inset_0_1px_3px_rgba(255,255,255,0.35)] flex items-center justify-center gap-2 px-3 touch-manipulation group">
                            <div class="w-6 h-6 flex-shrink-0 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shadow-inner group-hover:scale-110 transition-transform">
                                <i class="fa-solid fa-map-location-dot text-white text-[10px] drop-shadow-sm"></i>
                            </div>
                            <span class="drop-shadow-sm truncate">Chỉ đường Google Maps</span>
                        </button>
                    </div>`;
                } else if (act.to || act.from) {
                    routeHtml = `<div class="bg-white/50 backdrop-blur-md border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-2.5 rounded-xl text-[13px] font-semibold text-slate-700 break-words leading-relaxed"><i class="fa-solid fa-location-dot text-slate-400 mr-1.5"></i>${act.to || act.from}</div>`;
                }

                html += `
                    <div class="tl-item relative flex gap-3 md:gap-5 group mb-8 transition-opacity duration-300 ${isDone ? 'opacity-60 grayscale-[30%]' : 'opacity-100'}">
                        
                        <!-- Cột thời gian Desktop -->
                        <div class="tl-time w-16 flex-shrink-0 pt-4 text-right z-10 hidden md:block">
                            <div class="text-lg font-black ${isDone ? 'text-slate-400' : 'text-slate-800'} tracking-tight">${act.start}</div>
                            <div class="text-[13px] text-slate-400 font-bold">${act.end}</div>
                        </div>

                        <!-- Timeline Line & Node (Nổi khối 3D) -->
                        <div class="relative flex flex-col items-center z-10 pt-1 px-1 md:px-0">
                            <div class="tl-node w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${isDone ? 'bg-white/60 backdrop-blur-md border border-white/80 text-slate-400' : 'bg-gradient-to-br from-blue-50 to-white border border-white text-blue-600'} z-10 relative ring-4 ring-slate-50/50">
                                <i class="fa-solid ${iconClass} ${isDone ? '' : 'scale-110'}"></i>
                            </div>
                            ${index < day.activities.length - 1 ? `<div class="tl-line absolute top-10 bottom-[-32px] left-1/2 w-[2px] bg-slate-200/60 -translate-x-1/2 z-0 rounded-full"></div>` : ''}
                        </div>

                        <!-- TOÀN BỘ NỘI DUNG CỘT PHẢI -->
                        <div class="tl-body flex-1 min-w-0 pr-1 md:pr-0 pb-1">
                            
                            <!-- Thời gian hiển thị nổi bên ngoài ở Mobile -->
                            <div class="md:hidden flex items-center gap-2 mb-2">
                                <span class="text-[15px] font-black text-slate-800 tracking-tight">${act.start} - ${act.end}</span>
                                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${status.color}">${status.label}</span>
                            </div>

                            <div class="tl-card bg-white/60 backdrop-blur-3xl rounded-[1.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/80 flex flex-col overflow-hidden hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all">
                                
                                <div class="p-4 md:p-5 border-b border-white flex justify-between items-start gap-3 bg-white/40">
                                    <div class="flex-1 min-w-0">
                                        <div class="hidden md:flex items-center gap-2 mb-1.5">
                                            <span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)] ${status.color}">
                                                ${status.label}
                                            </span>
                                        </div>
                                        <h3 class="text-[17px] md:text-lg font-black leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-800'} break-words">${act.details}</h3>
                                        
                                        <div class="mt-2.5 flex flex-wrap items-center gap-2">
    <!-- Nhãn Loại hoạt động -->
    <span class="text-[10px] font-extrabold text-slate-700 bg-white/80 backdrop-blur-md border border-white/90 px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,0.9)] drop-shadow-sm">
        ${act.type}
    </span>

    <!-- Nhãn Phương tiện di chuyển (nếu có) -->
    ${act.transport ? `
    <span class="text-[10px] font-extrabold text-blue-700 bg-blue-50/80 backdrop-blur-md border border-blue-100/90 px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_2px_8px_rgba(37,99,235,0.06),inset_0_1px_2px_rgba(255,255,255,0.9)] drop-shadow-sm flex items-center gap-1">
        <i class="fa-solid fa-car-side text-blue-500 text-[9px]"></i>${act.transport}
    </span>` : ''}
</div>
                                    </div>
                                    <button data-tl-check="${act.id}" data-done="${isDone ? '1' : '0'}" onclick="toggleComplete('${act.id}')" class="text-3xl flex-shrink-0 transition-transform active:scale-90 ${isDone ? 'text-blue-500 drop-shadow-md hover:text-slate-400' : 'text-slate-300 hover:text-blue-400'}"><i class="fa-solid ${isDone ? 'fa-circle-check' : 'fa-circle'}"></i></button>
                                </div>

                                ${(act.desc || act.guide) ? `
                                <div class="p-4 md:p-5 bg-slate-50/40 backdrop-blur-md border-b border-white space-y-3">
                                    ${act.desc ? `
                                    <div>
                                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5"><i class="fa-regular fa-comment-dots mr-1"></i>Chi tiết</div>
                                        <p class="text-[13px] text-slate-700 font-medium leading-relaxed">${act.desc}</p>
                                    </div>` : ''}
                                    ${(act.desc && act.guide) ? `<div class="w-full h-px bg-white/60 my-1"></div>` : ''}
                                    ${act.guide ? `
                                    <div>
                                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5"><i class="fa-solid fa-route mr-1"></i>Hướng dẫn</div>
                                        <p class="text-[13px] text-blue-600 font-semibold leading-relaxed">${act.guide}</p>
                                    </div>` : ''}
                                </div>` : ''}

                                ${act.note ? `
                                <div class="p-4 md:p-5 bg-amber-50/40 backdrop-blur-md border-b border-white">
                                    <div class="text-[13px] font-semibold text-amber-900 leading-relaxed"><i class="fa-solid fa-star text-amber-500 mr-1.5"></i>${act.note}</div>
                                </div>` : ''}

                                <!-- VÙNG 4: LỘ TRÌNH, NGÂN SÁCH & TOOLBAR -->
                                <div class="p-4 md:p-5 bg-white/30 flex flex-col gap-3">
                                    ${routeHtml}
                                    <div class="flex items-center justify-between mt-1">
                                        <div>
                                    ${act.budgetAmt ? `<span class="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-900 bg-emerald-100/80 backdrop-blur-md border border-emerald-200/80 px-3 py-1 rounded-full shadow-[0_3px_10px_rgba(16,185,129,0.08),inset_0_1px_2px_rgba(255,255,255,0.8)] drop-shadow-sm"><i class="fa-solid fa-sack-dollar text-emerald-600 text-[10px]"></i>${new Intl.NumberFormat('vi-VN').format(act.budgetAmt)} ${act.budgetCur}</span>` : '<span class="text-[11px] text-slate-400 font-medium italic">Không có chi phí</span>'}
                                </div>
                                        
                                        <!-- CỤM NÚT NHÂN BẢN / SỬA / XÓA (Liquid Glass Pill) -->
                                        <div class="flex gap-1.5 md:gap-2">
                                            <!-- Nút Duplicate (Thanh thoát, Kính lỏng) -->
                                            <button onclick="duplicateActivity('${act.id}')" title="Duplicate" class="px-3 md:px-3.5 h-8 rounded-full bg-white/40 backdrop-blur-md border border-white/80 hover:bg-emerald-50/80 text-slate-500 hover:text-emerald-600 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all active:scale-95 flex items-center justify-center gap-1.5 touch-manipulation">
                                                <span class="text-[8px] md:text-[10px] font-black uppercase tracking-widest drop-shadow-sm">Duplicate</span>
                                            </button>
                                            
                                            <button onclick="editActivity('${act.id}')" title="Sửa" class="w-8 h-8 rounded-full bg-white/40 backdrop-blur-md border border-white/80 hover:bg-blue-50/80 text-slate-500 hover:text-blue-600 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all active:scale-95 flex items-center justify-center touch-manipulation"><i class="fa-solid fa-pen text-xs"></i></button>
                                            
                                            <button onclick="deleteActivity('${act.id}')" title="Xóa" class="w-8 h-8 rounded-full bg-white/40 backdrop-blur-md border border-white/80 hover:bg-red-50/80 text-slate-500 hover:text-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all active:scale-95 flex items-center justify-center touch-manipulation"><i class="fa-solid fa-trash text-xs"></i></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            // BẢNG TỔNG KẾT NGÀY (Giữ nguyên)
            let tripBudgetVND = 0;
            if(trip.budget) {
                const amountStr = trip.budget.replace(/[^0-9]/g, '');
                tripBudgetVND = parseInt(amountStr) || 0;
            }

            let totalTripSpentVND = 0;
            trip.days.forEach(d => {
                d.activities.forEach(a => {
                    if(a.budgetAmt && !isNaN(a.budgetAmt)) {
                        totalTripSpentVND += parseFloat(a.budgetAmt) * (rates[a.budgetCur] || 1);
                    }
                });
            });

            const remainingVND = tripBudgetVND - totalTripSpentVND;
            const destCur = trip.destCur || 'VND';
            const destRate = rates[destCur] || 1;
            
            const dailyTotalForeign = dailyTotalVND / destRate;
            const remainingForeign = remainingVND / destRate;

            let expenseListHtml = '';
            day.activities.filter(a => a.budgetAmt).forEach(a => {
                expenseListHtml += `<div class="flex justify-between items-center py-2.5 md:py-3 border-b border-slate-200/70 last:border-0 group">
    <!-- Tên hoạt động (Màu xám trung tính, tự động thu gọn nếu quá dài) -->
    <span class="text-[12px] md:text-[13px] font-semibold text-slate-500 truncate pr-4 transition-colors group-hover:text-slate-700">
        ${a.details}
    </span>
    
    <!-- Số tiền (Màu Đen xám đậm nhất, font-bold để nhấn mạnh, tuyệt đối không rớt dòng) -->
    <span class="text-[13px] md:text-[14px] font-black text-slate-800 whitespace-nowrap flex-shrink-0">
        ${new Intl.NumberFormat('vi-VN').format(a.budgetAmt)} ${a.budgetCur}
    </span>
</div>`;
            });
            if(expenseListHtml === '') expenseListHtml = '<div class="text-[13px] text-slate-500 italic py-2">Không có chi tiêu nào được ghi nhận.</div>';

            html += `
                <div class="tl-extra ml-0 md:ml-16 mt-6 mb-8 bg-slate-200/85 backdrop-blur-3xl rounded-[2rem] p-4 md:p-6 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_10px_30px_rgba(0,0,0,0.06)] border border-slate-300/80 relative overflow-hidden">
    
    <!-- Icon trang trí (Màu xám chìm) -->
    <div class="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none">
        <i class="fa-solid fa-wallet text-6xl text-slate-700"></i>
    </div>
    
    <!-- Tiêu đề -->
    <h3 class="text-slate-800 font-extrabold text-[12px] md:text-[13px] uppercase tracking-wider mb-4 flex items-center drop-shadow-sm relative z-10">
        <div class="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center mr-2.5 shadow-sm flex-shrink-0 border border-slate-200">
            <i class="fa-solid fa-receipt text-slate-600 text-[11px]"></i>
        </div>
        Tổng kết chi tiêu ngày
    </h3>
    
    <!-- Danh sách chi tiêu (Nếu có) -->
    <div class="space-y-2 mb-5 relative z-10">${expenseListHtml}</div>
    
    <!-- Khung thông tin tổng tiền (Lớp kính Trắng nổi bật, bo tròn sâu) -->
    <div class="bg-white/95 backdrop-blur-2xl rounded-[1.25rem] p-4 border border-white shadow-[0_4px_15px_rgba(0,0,0,0.04)] space-y-3 relative z-10">
        
        <!-- Đã tiêu hôm nay -->
        <div class="flex justify-between items-center gap-2">
            <span class="text-[12px] md:text-[13px] font-bold text-slate-500 flex-shrink-0">
                Đã tiêu hôm nay:
            </span>
            <div class="text-right min-w-0">
                <!-- Chuyển về màu Xám Đen (Slate-800) cực kỳ điềm đạm, sang trọng -->
                <div class="text-[14px] md:text-base font-black text-slate-800 truncate drop-shadow-sm">
                    ${new Intl.NumberFormat('vi-VN').format(dailyTotalVND)} VND
                </div>
                ${destCur !== 'VND' ? `<div class="text-[11px] font-bold text-slate-500/80 truncate mt-0.5">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(dailyTotalForeign)} ${destCur}</div>` : ''}
            </div>
        </div>
        
        <!-- Ngân sách còn lại -->
        ${tripBudgetVND > 0 ? `
        <div class="flex justify-between items-center gap-2 border-t border-slate-100 pt-3 mt-1">
            <span class="text-[12px] md:text-[13px] font-bold text-slate-500 flex-shrink-0">
                Còn lại:
            </span>
            <div class="text-right min-w-0">
                <!-- Màu tín hiệu: Xanh ngọc dịu (Emerald-600) hoặc Đỏ san hô (Rose-500) -->
                <div class="text-[14px] md:text-base font-black truncate drop-shadow-sm ${remainingVND >= 0 ? 'text-emerald-600/90' : 'text-rose-500'}">
                    ${new Intl.NumberFormat('vi-VN').format(remainingVND)} VND
                </div>
                ${destCur !== 'VND' ? `<div class="text-[11px] font-bold truncate mt-0.5 ${remainingVND >= 0 ? 'text-emerald-600/60' : 'text-rose-400/80'}">≈ ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(remainingForeign)}${destCur}</div>` : ''}
            </div>
        </div>
        ` : ''}
        
    </div>
</div>
            `;

            html += `
                <div class="tl-extra ml-0 md:ml-16 mt-4 mb-8 text-center pb-8">
  <div class="tp-stamp" id="tpStamp">
    <div class="tp-stamp__glass" id="tpStampGlass">
      <span class="tp-stamp__bead" aria-hidden="true"><i class="fa-solid fa-feather"></i></span>
      <p class="tp-stamp__ver">TripPlanner 1.3.3</p>
      <span class="tp-stamp__sep" aria-hidden="true"></span>
      <p class="tp-stamp__credit">
        Made with <i class="fa-solid fa-heart"></i> by <strong>duyanh.dev</strong>
      </p>
    </div>
  </div>
</div>
            `;
            container.innerHTML = html;

            // ===== ANIMATION (không đụng logic) =====
            TL_FX.bind(container);
            TL_FX.enter(container, trip.id + '|' + state.activeDayDate);
        };


        // --- 4. HÀM MỞ GOOGLE MAPS (Giữ nguyên) ---
        const openGoogleMaps = (from, to) => {
            let url = 'https://www.google.com/maps/dir/?api=1';
            if (from && to) {
                url += `&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;
            } else if (to) {
                url += `&destination=${encodeURIComponent(to)}`;
            } else if (from) {
                url += `&destination=${encodeURIComponent(from)}`;
            }
            if(from || to) window.open(url, '_blank');
        };

        // --- STREAMING_CHUNK: REAL-TIME & SIMULATION LOGIC ---
        const updateClockAndBanner = () => {
            const now = new Date();
            
            // 1. Cập nhật đồng hồ (Chỉ chạy nếu thẻ này còn tồn tại trên HTML)
            const clockEl = document.getElementById('clock-display');
            if (clockEl) {
                clockEl.innerHTML = `
                    <div class="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Hiện tại</div>
                    <div class="text-3xl font-black text-slate-800 tracking-tighter leading-none">${String(now.getHours()).padStart(2, '0')}<span class="animate-pulse opacity-50">:</span>${String(now.getMinutes()).padStart(2, '0')}</div>
                `;
            }

            // 2. Cập nhật Banner "Hoạt động tiếp theo"
            const banner = document.getElementById('next-activity-banner');
            const bannerText = document.getElementById('next-activity-text');
            
            // Nếu không tìm thấy banner thì thoát hàm ngay lập tức, không báo lỗi
            if (!banner || !bannerText) return; 

            const trip = state.trips.find(t => t.id === state.activeTripId);
            if (!trip) return;
            
            const day = trip.days.find(d => d.date === state.activeDayDate);
            if (!day || !day.activities || day.activities.length === 0) {
                banner.style.transform = 'translate(-50%, -150%)';
                banner.style.opacity = '0';
                return;
            }

            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            // Tìm hoạt động chưa hoàn thành và sắp diễn ra
            const nextAct = day.activities.find(a => !a.isCompleted && a.start >= currentTime);
            
            if (nextAct) {
                bannerText.innerText = `Tiếp theo: ${nextAct.start} - ${nextAct.details}`;
                banner.style.transform = 'translate(-50%, 0)';
                banner.style.opacity = '1';
            } else {
                banner.style.transform = 'translate(-50%, -150%)';
                banner.style.opacity = '0';
            }
        };

        const toggleSimulator = () => {
            const toggle = document.getElementById('sim-toggle');
            const slider = document.getElementById('sim-slider');
            state.isSimulating = toggle.checked;
            slider.disabled = !state.isSimulating;
            
            if(state.isSimulating) {
                // Set slider to actual current time in mins
                const d = new Date();
                state.simulatedTimeMins = d.getHours() * 60 + d.getMinutes();
                slider.value = state.simulatedTimeMins;
            }
            
            renderTimeline();
            updateClockAndBanner();
        };

        const updateSimulatedTime = () => {
            const slider = document.getElementById('sim-slider');
            state.simulatedTimeMins = parseInt(slider.value);
            renderTimeline();
            updateClockAndBanner();
        };

        // Hàm lấy ngày hôm nay theo format YYYY-MM-DD
        const getTodayDateStr = () => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };


        // --- STREAMING_CHUNK: INTERACTION & FORMS LOGIC ---
        const switchTrip = (id) => {
            state.activeTripId = id;
            const trip = state.trips.find(t => t.id === id);
            if (trip && trip.days.length > 0) {
                const todayStr = getTodayDateStr();
                const isTodayInTrip = trip.days.some(d => d.date === todayStr);
                
                // Ưu tiên ngày hôm nay nếu chuyến đi đang diễn ra, ngược lại lấy ngày đầu tiên
                state.activeDayDate = isTodayInTrip ? todayStr : trip.days[0].date;
            }
            if(window.innerWidth < 768) toggleSidebar();
            renderApp();
        };

        let editingTripId = null; // Biến toàn cục lưu trạng thái sửa chuyến đi

        const deleteCurrentTrip = () => {
            if(confirm('🚨 Bạn có chắc chắn muốn xóa TOÀN BỘ chuyến đi này và các lịch trình bên trong không? Hành động này không thể hoàn tác!')) {
                state.trips = state.trips.filter(t => t.id !== state.activeTripId);
                if(state.trips.length > 0) {
                    switchTrip(state.trips[0].id);
                } else {
                    // Nếu xóa hết, tự động tạo lại 1 chuyến mặc định trống
                    state.trips.push({
                        id: 't_empty', title: 'Chuyến đi mới', coverUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
                        days: [{ date: getRelativeDateStr(0), activities: [] }]
                    });
                    switchTrip('t_empty');
                }
                saveData();
            }
        };

        const editCurrentTrip = () => {
            editingTripId = state.activeTripId;
            openTripModal(true); // Truyền true để báo cho trip-logic biết là đang Edit
        };

        const switchDay = (dateStr) => {
            state.activeDayDate = dateStr;
            renderDaysTabs();
            renderTimeline();
        };


        

        const addNewDay = () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            let nextDate = new Date();
            if(trip.days.length > 0) {
                const lastDate = new Date(trip.days[trip.days.length-1].date);
                lastDate.setDate(lastDate.getDate() + 1);
                nextDate = lastDate;
            }
            const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth()+1).padStart(2,'0')}-${String(nextDate.getDate()).padStart(2,'0')}`;
            trip.days.push({ date: dateStr, activities: [] });
            saveData(); // <--- THÊM DÒNG NÀY VÀO ĐÂY
            switchDay(dateStr);
        };

        const toggleComplete = (actId) => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip.days.find(d => d.date === state.activeDayDate);
            const act = day.activities.find(a => a.id === actId);
            if(act) {
                act.isCompleted = !act.isCompleted;

                saveData(); // <--- THÊM DÒNG NÀY VÀO ĐÂY
                renderApp(); // re-render to show updated status
            }
        };

        const deleteActivity = (actId) => {
            if(confirm('Bạn có chắc chắn muốn xóa hoạt động này?')) {
                const trip = state.trips.find(t => t.id === state.activeTripId);
                const day = trip.days.find(d => d.date === state.activeDayDate);
                day.activities = day.activities.filter(a => a.id !== actId);

                saveData(); // <--- THÊM DÒNG NÀY VÀO ĐÂY
                renderApp();
            }
        };

        const toggleSidebar = () => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if(sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('hidden', 'opacity-0');
                setTimeout(() => overlay.classList.add('opacity-100'), 10);
            } else {
                sidebar.classList.add('-translate-x-full');
                overlay.classList.remove('opacity-100');
                overlay.classList.add('opacity-0');
                setTimeout(() => overlay.classList.add('hidden'), 300);
            }
        };

        // --- ACTIVITY MODAL LOGIC ---
        const handleTransportChange = () => {
            const select = document.getElementById('act-transport-select');
            const input = document.getElementById('act-transport-input');
            if (select.value === 'other') {
                input.classList.remove('hidden');
                input.focus();
            } else {
                input.classList.add('hidden');
                input.value = ''; // clear hidden input
            }
        };

        // --- LOGIC XỬ LÝ FORM HOẠT ĐỘNG MỚI ---
        const calculateItemExchange = () => {
            // Đã thêm .replace(/\./g, '') để xóa hết dấu chấm trước khi tính toán
            const rawValue = document.getElementById('act-budget-amount').value.replace(/\./g, '');
            const amt = parseFloat(rawValue);
            
            const cur = document.getElementById('act-budget-cur').value;
            const convertedEl = document.getElementById('act-budget-converted');
            
            if(isNaN(amt) || amt <= 0) {
                convertedEl.innerText = '~ 0 VND'; return;
            }
            
            // Quy đổi ngược về VND
            const rates = typeof exchangeRates !== 'undefined' ? exchangeRates : { VND: 1, THB: 720, JPY: 170, KRW: 18.5, USD: 25000, EUR: 27500 };
            const inVND = amt * (rates[cur] || 1);
            convertedEl.innerText = '~ ' + new Intl.NumberFormat('vi-VN').format(inVND) + ' VND';
        };

       const openActivityModal = () => {
            state.editingActivityId = null;
            document.getElementById('activity-form').reset();
            document.getElementById('act-id').value = '';
            
            const d = new Date();
            document.getElementById('act-start').value = `${String(d.getHours()).padStart(2, '0')}:00`;
            document.getElementById('act-end').value = `${String(d.getHours() + 1).padStart(2, '0')}:00`;
            
            // LẤY TỰ ĐỘNG TIỀN TỆ TỪ TRIP CHÍNH
            const trip = state.trips.find(t => t.id === state.activeTripId);
            if (trip && trip.destCur) {
                document.getElementById('act-budget-cur').value = trip.destCur;
            } else {
                document.getElementById('act-budget-cur').value = 'VND';
            }
            calculateItemExchange();
            
            handleTransportChange(); 
            document.getElementById('act-modal-title').innerHTML = '<i class="fa-solid fa-plus text-blue-500 bg-blue-50 p-2 rounded-lg text-sm"></i> Thêm hoạt động';
            document.getElementById('activity-modal').classList.add('active');
        };

        

        const editActivity = (actId) => {
            state.editingActivityId = actId;
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip.days.find(d => d.date === state.activeDayDate);
            const act = day.activities.find(a => a.id === actId);
            
            document.getElementById('act-id').value = act.id;
            document.getElementById('act-start').value = act.start;
            document.getElementById('act-end').value = act.end;
            document.getElementById('act-details').value = act.details;
            document.getElementById('act-from').value = act.from || '';
            document.getElementById('act-to').value = act.to || '';
            document.getElementById('act-icon').value = act.icon;
            document.getElementById('act-type').value = act.type;
            
            document.getElementById('act-desc').value = act.desc || '';
            document.getElementById('act-guide').value = act.guide || '';
            document.getElementById('act-note').value = act.note || '';
            document.getElementById('act-budget-amount').value = act.budgetAmt || '';
            
            // KẾ THỪA TIỀN TỆ KHI SỬA
            if(act.budgetCur) {
                document.getElementById('act-budget-cur').value = act.budgetCur;
            } else if (trip && trip.destCur) {
                document.getElementById('act-budget-cur').value = trip.destCur;
            }
            calculateItemExchange();

            const select = document.getElementById('act-transport-select');
            const input = document.getElementById('act-transport-input');
            const standardOptions = Array.from(select.options).map(o => o.value);
            
            if (!act.transport) {
                select.value = ""; input.classList.add('hidden');
            } else if (standardOptions.includes(act.transport)) {
                select.value = act.transport; input.classList.add('hidden');
            } else {
                select.value = "other"; input.value = act.transport; input.classList.remove('hidden');
            }
            
            document.getElementById('act-modal-title').innerHTML = '<i class="fa-solid fa-pen text-blue-500 bg-blue-50 p-2 rounded-lg text-sm"></i> Sửa hoạt động';
            document.getElementById('activity-modal').classList.add('active');
        };

        const closeActivityModal = () => document.getElementById('activity-modal').classList.remove('active');

        const submitActivityForm = (e) => {
            e.preventDefault();
            const details = document.getElementById('act-details').value;
            const start = document.getElementById('act-start').value;
            const end = document.getElementById('act-end').value;

            if(!details || !start || !end) return;

            const selectVal = document.getElementById('act-transport-select').value;
            const transportVal = selectVal === 'other' ? document.getElementById('act-transport-input').value : selectVal;

            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip.days.find(d => d.date === state.activeDayDate);
            
            // --- XỬ LÝ LỌC DẤU CHẤM TRƯỚC KHI LƯU ---
            const rawBudget = document.getElementById('act-budget-amount').value;
            const cleanBudget = rawBudget ? rawBudget.replace(/\./g, '') : '';
            
            const newAct = {
                id: document.getElementById('act-id').value || Math.random().toString(36).substr(2, 9),
                start: start, end: end, details: details,
                from: document.getElementById('act-from').value,
                to: document.getElementById('act-to').value,
                icon: document.getElementById('act-icon').value,
                type: document.getElementById('act-type').value,
                transport: transportVal,
                desc: document.getElementById('act-desc').value,
                guide: document.getElementById('act-guide').value,
                note: document.getElementById('act-note').value,
                
                // Lưu số tiền đã được tẩy sạch dấu chấm (Ví dụ: 11000)
                budgetAmt: cleanBudget, 
                budgetCur: document.getElementById('act-budget-cur').value,
                isCompleted: false
            };

            if (state.editingActivityId) {
                const oldAct = day.activities.find(a => a.id === state.editingActivityId);
                newAct.isCompleted = oldAct.isCompleted;
                const index = day.activities.findIndex(a => a.id === state.editingActivityId);
                day.activities[index] = newAct;
            } else {
                day.activities.push(newAct);
            }
            day.activities.sort((a, b) => a.start.localeCompare(b.start));
            
            saveData();
            closeActivityModal();
            renderApp();
        };

        // --- GLOBAL TIMELINE MODAL ---
        const renderGlobalTimeline = () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const content = document.getElementById('global-timeline-content');
            
            // Đệm tàng hình để đẩy viên pill xuống một chút cho đẹp
            let html = '<div class="h-2 md:h-3 w-full flex-shrink-0"></div>';

            trip.days.forEach((day, idx) => {
                html += `
                <div class="mb-6 md:mb-8 relative group">
                    
                    <!-- Sticky Day Header (Apple Dynamic Island / Dark Glass Pill) -->
                    <div class="sticky top-2 md:top-3 z-30 flex justify-center mb-5 md:mb-6 pointer-events-none">
                        <div class="bg-slate-900/85 backdrop-blur-2xl px-5 md:px-6 py-2 md:py-2.5 rounded-full shadow-[0_12px_30px_rgba(15,23,42,0.25)] border border-slate-700/60 flex items-center gap-3 pointer-events-auto transition-transform hover:scale-105">
                            <span class="font-black text-white text-[14px] md:text-[15px] drop-shadow-md tracking-wide">Ngày ${idx + 1}</span>
                            <div class="w-1.5 h-1.5 rounded-full bg-slate-500/80 shadow-inner"></div>
                            <span class="text-slate-300 font-semibold text-[12px] md:text-[13px] tracking-wide">${formatDisplayDate(day.date)}</span>
                        </div>
                    </div>
                    
                    <div class="space-y-3 relative z-10 md:px-2">
                `;
                
                if(day.activities.length === 0) {
                    html += `<p class="text-[13px] text-slate-500 italic font-medium p-5 bg-white/50 backdrop-blur-md rounded-2xl border border-white/80 shadow-sm text-center">Chưa có hoạt động nào được lên lịch.</p>`;
                } else {
                    day.activities.forEach(act => {
                        const status = getActivityStatus(act, day.date);
                        
                        // Lộ trình
                        let routeTxt = '';
                        if(act.from && act.to) routeTxt = `${act.from} ➔ ${act.to}`;
                        else if(act.to || act.from) routeTxt = act.to || act.from;

                        // Ngân sách (Chi tiết)
                        let budgetHtml = '';
                        if(act.budgetAmt) {
                            budgetHtml = `<div class="text-[11px] font-black text-emerald-700 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/60 shadow-[0_2px_8px_rgba(16,185,129,0.1)] px-2.5 py-1 rounded-lg inline-flex items-center"><i class="fa-solid fa-sack-dollar mr-1.5"></i>${new Intl.NumberFormat('vi-VN').format(act.budgetAmt)} ${act.budgetCur}</div>`;
                        }

                        // Tags (Loại và Phương tiện)
                        let extraTagsHtml = '';
                        if(act.type) {
                            extraTagsHtml += `<span class="text-[10px] font-bold text-slate-500 bg-slate-100/80 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-slate-200/50 shadow-sm">${act.type}</span>`;
                        }
                        if(act.transport) {
                            extraTagsHtml += `<span class="text-[10px] font-bold text-slate-500 bg-slate-100/80 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-slate-200/50 shadow-sm"><i class="fa-solid fa-car-side mr-1"></i>${act.transport}</span>`;
                        }

                        html += `
                        <!-- Thẻ Hoạt Động (Kính Lỏng Trắng Nổi) -->
                        <div class="flex items-start gap-3 md:gap-4 p-3.5 md:p-4 rounded-[1.25rem] border border-white/80 bg-white/60 backdrop-blur-xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] transition-all">
                            
                            <!-- Cột giờ (Giữ nguyên gọn gàng cho Mobile) -->
                            <div class="flex-shrink-0 text-center w-11 md:w-14 pt-0.5">
                                <div class="text-[13px] md:text-[15px] font-black text-slate-800 drop-shadow-sm">${act.start}</div>
                                <div class="text-[8px] md:text-[9px] font-black uppercase mt-1.5 ${status.color.split(' ')[0]} bg-white shadow-sm border border-slate-100 px-1 py-1 rounded-md tracking-wider">${status.type === 'done' ? 'XONG' : (status.type==='future'? 'SẮP' : 'TRỄ')}</div>
                            </div>
                            
                            <div class="flex-1 min-w-0 border-l border-white/60 pl-3 md:pl-4 relative">
                                <!-- Line dọc phân cách tinh tế -->
                                <div class="absolute left-[-1px] top-1.5 bottom-1.5 w-[2px] bg-slate-200/50 rounded-full"></div>
                                
                                <!-- Tên Hoạt động (Break-words chống tràn) -->
                                <div class="text-[14px] md:text-base font-bold text-slate-800 break-words drop-shadow-sm leading-snug pr-1 ${act.isCompleted ? 'line-through text-slate-400' : ''}">${act.details}</div>
                                
                                ${routeTxt ? `
                                <div class="text-[11px] md:text-xs font-semibold text-blue-600 mt-2 break-words bg-blue-50/70 backdrop-blur-sm inline-block px-2.5 py-1.5 rounded-lg border border-blue-100/50 shadow-inner max-w-full">
                                    <i class="fa-solid fa-location-arrow mr-1.5 opacity-80"></i>${routeTxt}
                                </div>` : ''}

                                <!-- Hàng chứa Tiền và Tags -->
                                ${(budgetHtml || extraTagsHtml) ? `
                                <div class="mt-2.5 flex flex-wrap items-center gap-2">
                                    ${budgetHtml}${extraTagsHtml}
                                </div>` : ''}
                                
                            </div>
                        </div>
                        `;
                    });
                }
                html += `</div></div>`;
            });
            content.innerHTML = html;
        };
        const gtModal = document.getElementById('global-timeline-modal');
        const openGlobalTimeline = () => { renderGlobalTimeline(); gtModal.classList.add('active'); };
        const closeGlobalTimeline = () => gtModal.classList.remove('active');

        // --- NEW TRIP MODAL ---
        const tripModal = document.getElementById('trip-modal');


        // --- INITIALIZATION ---
        // Run loop to check times continuously if not simulating
        setInterval(() => {
            if(!state.isSimulating) {
                renderTimeline();
                updateClockAndBanner();
            }
        }, 30000); // 30 seconds

        window.onload = () => {
            loadData(); // Khôi phục dữ liệu từ bộ nhớ trước khi render UI
            renderApp();

            // Kích hoạt chức năng kéo thả tab
            initDragToScroll();
        };


        // --- LOCAL STORAGE LOGIC ---
        const saveData = () => {
            // Lưu mảng trips vào Local Storage dưới dạng chuỗi JSON
            localStorage.setItem('wanderlog_trips', JSON.stringify(state.trips));
        };

        const loadData = () => {
            const saved = localStorage.getItem('wanderlog_trips');
            if (saved) {
                try {
                    state.trips = JSON.parse(saved);
                    // Cập nhật lại ID chuyến đi đang active
                    if (state.trips.length > 0) {
                        state.activeTripId = state.trips[0].id;
                        if (state.trips[0].days.length > 0) {
                            state.activeDayDate = state.trips[0].days[0].date;
                        }
                    }
                } catch (e) {
                    console.error("Lỗi đọc dữ liệu:", e);
                }
            }
        };


        // --- CHECKLIST LOGIC ---
        const getTripChecklist = () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            // Tương thích ngược: Nếu chuyến đi chưa có danh sách, tự tạo mặc định
            if (!trip.checklist) {
                trip.checklist = [
                    { id: 'c1', text: 'Hộ chiếu / CCCD / Giấy tờ tùy thân', isDone: false },
                    { id: 'c2', text: 'Quần áo & Đồ dùng cá nhân', isDone: false },
                    { id: 'c3', text: 'Sạc dự phòng & Cáp sạc', isDone: false },
                    { id: 'c4', text: 'Tiền mặt & Thẻ thanh toán', isDone: false },
                    { id: 'c5', text: 'Thuốc men cơ bản', isDone: false }
                ];
                saveData();
            }
            return trip.checklist;
        };

       const renderChecklist = () => {
    const checklist = getTripChecklist();
    const container = document.getElementById('checklist-container');
    const barEl = document.getElementById('checklist-progress-bar');
    const countEl = document.getElementById('checklist-count-text');

    // Tính toán Progress Bar
    const total = checklist.length;
    const done = checklist.filter(c => c.isDone).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    barEl.style.width = `${percent}%`;
    document.getElementById('checklist-progress-text').innerText = `HOÀN THÀNH: ${percent}%`;
    countEl.innerText = `${done}/${total}`;
    const full = total > 0 && percent === 100;
    barEl.classList.toggle('is-full', full);
    countEl.classList.toggle('is-full', full);

    // Trạng thái rỗng
    if (total === 0) {
        container.innerHTML = `
            <div class="cl-empty">
                <i class="fa-solid fa-suitcase-rolling"></i>
                Danh sách trống.<br>Hãy thêm đồ cần chuẩn bị ở trên.
            </div>`;
        return;
    }
    container.querySelector('.cl-empty')?.remove();

    const animOn = document.documentElement.dataset.animationOn === 'true';

    const createNode = (item) => {
        const id = String(item.id);
        const node = document.createElement('div');
        node.className = 'cl-item' + (animOn ? ' is-new' : '');
        node.dataset.id = id;
        node.tabIndex = 0;
        node.setAttribute('role', 'checkbox');
        node.innerHTML = `
            <span class="cl-check"><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg></span>
            <span class="cl-text"></span>
            <button type="button" class="cl-del" aria-label="Xóa"><i class="fa-solid fa-trash-can"></i></button>`;
        node.addEventListener('click', () => toggleChecklist(id));
        node.addEventListener('keydown', e => {
            if (e.target !== node) return;
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleChecklist(id); }
        });
        node.querySelector('.cl-del').addEventListener('click', e => {
            e.stopPropagation();
            deleteChecklist(id);
        });
        node.addEventListener('animationend', e => {
            if (e.target === node) node.classList.remove('is-new');
        });
        return node;
    };

    // Cập nhật tại chỗ (diff theo id) để transition/animation chạy được
    const existing = new Map(
        [...container.querySelectorAll(':scope > .cl-item:not(.is-leaving)')].map(n => [n.dataset.id, n])
    );
    const keep = new Set();
    let cursor = container.firstElementChild;

    checklist.forEach((item, i) => {
        const id = String(item.id);
        keep.add(id);
        const node = existing.get(id) || createNode(item);

        node.classList.toggle('is-done', !!item.isDone);
        node.setAttribute('aria-checked', item.isDone ? 'true' : 'false');
        node.querySelector('.cl-text').textContent = item.text;   // textContent: an toàn, không cần escape
        node.style.setProperty('--i', i);

        while (cursor && cursor.classList.contains('is-leaving')) cursor = cursor.nextElementSibling;
        if (node === cursor) cursor = cursor.nextElementSibling;
        else container.insertBefore(node, cursor);
    });

    // Mục đã bị xóa
    existing.forEach((node, id) => {
        if (keep.has(id)) return;
        if (!animOn) { node.remove(); return; }
        node.classList.add('is-leaving');
        setTimeout(() => node.remove(), 400);
    });
};

// ==========================================
// CONFIRM MODAL (thay cho confirm() mặc định)
// ==========================================
const clConfirm = (() => {
    const root = document.getElementById('cl-confirm');
    const card = root.querySelector('.clc-card');
    const titleEl = document.getElementById('clc-title');
    const msgEl = document.getElementById('clc-msg');
    const chipEl = document.getElementById('clc-chip');
    const okBtn = document.getElementById('clc-ok');
    const cancelBtn = document.getElementById('clc-cancel');
    const iconEl = root.querySelector('.clc-icon i');

    let resolver = null, lastFocus = null;

    const close = (result) => {
        if (!resolver) return;
        const r = resolver; resolver = null;
        root.classList.remove('active');
        if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
        r(result);
    };

    okBtn.addEventListener('click', () => close(true));
    cancelBtn.addEventListener('click', () => close(false));
    root.querySelector('.clc-backdrop').addEventListener('click', () => close(false));

    // Chạy ở capture để Esc chỉ đóng confirm, không đóng luôn modal checklist bên dưới
    window.addEventListener('keydown', e => {
        if (!resolver) return;
        if (e.key === 'Escape') {
            e.preventDefault(); e.stopImmediatePropagation();
            close(false);
        } else if (e.key === 'Tab') {
            // Giữ focus quanh 2 nút
            const order = [cancelBtn, okBtn];
            const i = order.indexOf(document.activeElement);
            e.preventDefault();
            order[(i + (e.shiftKey ? -1 : 1) + order.length) % order.length].focus();
        }
    }, true);

    return ({
        title = 'Xóa mục này?',
        message = 'Mục sẽ bị xóa khỏi hành trang của bạn.',
        detail = '',
        confirmText = 'Xóa',
        cancelText = 'Hủy',
        icon = 'fa-trash-can'
    } = {}) => new Promise(resolve => {
        if (resolver) close(false);             // đang mở cái khác thì hủy cái cũ
        resolver = resolve;
        lastFocus = document.activeElement;

        titleEl.textContent = title;
        msgEl.textContent = message;
        chipEl.textContent = detail;            // textContent: an toàn với ký tự đặc biệt
        okBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;
        iconEl.className = `fa-solid ${icon}`;

        // reflow để animation chạy lại từ đầu mỗi lần mở
        root.classList.remove('active');
        void card.offsetWidth;
        root.classList.add('active');
        cancelBtn.focus({ preventScroll: true });
    });
})();

        const openChecklistModal = () => {
            renderChecklist();
            document.getElementById('checklist-modal').classList.add('active');
        };

        const closeChecklistModal = () => {
            document.getElementById('checklist-modal').classList.remove('active');
        };

        const addChecklistItem = (e) => {
            e.preventDefault();
            const input = document.getElementById('new-checklist-input');
            const text = input.value.trim();
            if (!text) return;

            const trip = state.trips.find(t => t.id === state.activeTripId);
            trip.checklist.push({
                id: 'chk_' + Math.random().toString(36).substr(2, 9),
                text: text,
                isDone: false
            });
            
            input.value = '';
            saveData();
            renderChecklist();
        };

        const toggleChecklist = (id) => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const item = trip.checklist.find(c => c.id === id);
            if (item) {
                item.isDone = !item.isDone;
                saveData();
                renderChecklist();
            }
        };

        const deleteChecklist = async (id) => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;

    const item = (trip.checklist || []).find(c => String(c.id) === String(id));
    if (!item) return;

    const ok = await clConfirm({
        title: 'Xóa mục này?',
        message: 'Mục sẽ bị xóa khỏi danh sách của bạn.',
        detail: item.text,
        confirmText: 'Xóa',
        cancelText: 'Hủy'
    });
    if (!ok) return;

    // Lấy lại trip sau khi await, phòng trường hợp state đổi trong lúc hộp thoại đang mở
    const t = state.trips.find(t => t.id === state.activeTripId);
    if (!t) return;

    t.checklist = t.checklist.filter(c => String(c.id) !== String(id));
    saveData();
    renderChecklist();
};

        // --- CHỨC NĂNG KÉO THẢ ĐỂ CUỘN TABS TRÊN PC ---
        const initDragToScroll = () => {
            const slider = document.getElementById('days-tabs');
            let isDown = false;
            let startX;
            let scrollLeft;

            slider.addEventListener('mousedown', (e) => {
                isDown = true;
                slider.style.scrollBehavior = 'auto'; // Tắt cuộn mượt khi đang kéo tay để phản hồi tức thì
                startX = e.pageX - slider.offsetLeft;
                scrollLeft = slider.scrollLeft;
            });

            slider.addEventListener('mouseleave', () => {
                isDown = false;
                slider.style.scrollBehavior = 'smooth';
            });

            slider.addEventListener('mouseup', () => {
                isDown = false;
                slider.style.scrollBehavior = 'smooth';
            });

            slider.addEventListener('mousemove', (e) => {
                if (!isDown) return; // Nếu không nhấn giữ chuột thì không làm gì cả
                e.preventDefault(); // Ngăn hành vi mặc định (như kéo ảnh/text)
                const x = e.pageX - slider.offsetLeft;
                const walk = (x - startX) * 1.5; // Nhân 1.5 để tốc độ cuộn nhanh hơn tay kéo một chút
                slider.scrollLeft = scrollLeft - walk;
            });
        };

        // ==========================================
        // TỰ ĐỘNG FORMAT TIỀN TỆ & ÉP NHẬP SỐ
        // ==========================================
        document.addEventListener('input', function(e) {
            // Kiểm tra xem ô đang gõ có phải là ô nhập tiền không
            if (e.target.classList.contains('currency-input')) {
                
                // 1. Lọc bỏ toàn bộ các ký tự không phải là số (chữ cái, ký tự đặc biệt...)
                let rawValue = e.target.value.replace(/\D/g, '');
                
                // 2. Nếu xóa hết thì để trống
                if (rawValue === '') {
                    e.target.value = '';
                    return;
                }
                
                // 3. Định dạng lại thành chuẩn Việt Nam (1.000.000) và gán ngược lại vào ô input
                e.target.value = parseInt(rawValue, 10).toLocaleString('vi-VN');
            }
        });


// ==========================================
// TÍNH NĂNG NHÂN BẢN (DUPLICATE) & ĐỔI GIỜ
// ==========================================

window.duplicateActivity = (actId) => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.date === state.activeDayDate);
    const act = day.activities.find(a => a.id === actId);
    
    if (!act) return;

    // Giao diện Action Sheet chuẩn iOS Liquid Glass (Bo cong cực sâu, mờ sương)
    // Giao diện Action Sheet chuẩn iOS Liquid Glass
    const modalHtml = `
        <div id="dup-action-modal" class="fixed inset-0 z-[9999] flex justify-center items-end md:items-center p-0 md:p-4 transition-opacity duration-300 opacity-0">
            <!-- Nền tối mờ -->
            <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onclick="closeDupModal()"></div>
            
            <!-- Action Sheet (Bo cong 40px) -->
            <div class="bg-white/70 backdrop-blur-3xl w-full max-w-sm rounded-t-[2.5rem] md:rounded-[2.5rem] p-5 md:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/80 transform translate-y-full md:translate-y-0 md:scale-95 transition-transform duration-300 relative z-10 flex flex-col gap-3">
                
                <!-- Thanh Handle bar -->
                <div class="w-12 h-1.5 bg-slate-300/50 rounded-full mx-auto mb-1 md:hidden"></div>
                
                <div class="text-center mb-1">
                    <div class="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-[1.25rem] flex items-center justify-center text-xl mx-auto mb-3 border border-emerald-500/20 shadow-inner"><i class="fa-regular fa-copy"></i></div>
                    <h3 class="text-[17px] md:text-lg font-black text-slate-800 drop-shadow-sm">Duplicate Activity</h3>
                    <p class="text-[13px] text-slate-500 font-medium mt-1 line-clamp-1 truncate px-4">"${act.details}"</p>
                </div>
                
                <div class="space-y-2.5 mt-2">
                    <!-- Tùy chọn 1: Giữ nguyên giờ -->
                    <button onclick="executeDuplicate('${actId}', false)" class="w-full py-3.5 bg-white/60 hover:bg-white backdrop-blur-md rounded-2xl font-bold text-slate-700 text-[13px] md:text-sm shadow-sm border border-white transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2">
                        <i class="fa-solid fa-copy text-slate-400"></i> Giữ nguyên giờ (${act.start} - ${act.end})
                    </button>
                    
                    <!-- Tùy chọn 2: Mở khung đổi giờ -->
                    <button onclick="document.getElementById('dup-time-picker').classList.toggle('hidden')" class="w-full py-3.5 bg-blue-600/85 hover:bg-blue-600 backdrop-blur-md rounded-2xl font-bold text-white text-[13px] md:text-sm shadow-[0_8px_25px_rgba(37,99,235,0.3)] border border-blue-400/50 transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-2">
                        <i class="fa-solid fa-clock"></i> Đổi sang giờ khác
                    </button>
                    
                    <!-- Khung Nhập Giờ (Đã fix lỗi tràn UI bằng min-w-0 và gap-1.5) -->
                    <div id="dup-time-picker" class="hidden transition-all bg-white/40 backdrop-blur-md rounded-3xl p-3 md:p-4 border border-white shadow-inner mt-1">
                        <div class="flex items-center justify-between gap-1.5 md:gap-3 mb-3">
                            
                            <!-- Bắt đầu -->
                            <div class="flex-1 min-w-0 flex flex-col gap-1">
                                <label class="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1 drop-shadow-sm">Bắt đầu</label>
                                <input type="time" id="dup-new-start" value="${act.start}" class="w-full p-2.5 bg-white/80 backdrop-blur-sm border border-white shadow-sm rounded-xl outline-none font-black text-slate-800 text-center focus:border-blue-400 transition-all text-base md:text-sm">
                            </div>
                            
                            <!-- Mũi tên -->
                            <div class="mt-4 flex-shrink-0 text-slate-400"><i class="fa-solid fa-arrow-right-long text-[10px] md:text-xs"></i></div>
                            
                            <!-- Kết thúc -->
                            <div class="flex-1 min-w-0 flex flex-col gap-1">
                                <label class="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1 drop-shadow-sm">Kết thúc</label>
                                <input type="time" id="dup-new-end" value="${act.end}" class="w-full p-2.5 bg-white/80 backdrop-blur-sm border border-white shadow-sm rounded-xl outline-none font-black text-slate-800 text-center focus:border-blue-400 transition-all text-base md:text-sm">
                            </div>

                        </div>
                        <button onclick="executeDuplicate('${actId}', true)" class="w-full py-3 bg-emerald-500/90 hover:bg-emerald-500 backdrop-blur-md text-white font-bold rounded-xl shadow-[0_8px_20px_rgba(16,185,129,0.3)] border border-emerald-400/50 transition-all active:scale-95 touch-manipulation">
                            <i class="fa-solid fa-check mr-1.5"></i> Xác nhận đổi giờ
                        </button>
                    </div>
                </div>
                
                <button onclick="closeDupModal()" class="w-full mt-1.5 py-3.5 bg-slate-100/50 hover:bg-slate-200/60 backdrop-blur-sm rounded-2xl font-bold text-slate-500 text-[13px] md:text-sm transition-all active:scale-95 touch-manipulation">
                    Hủy bỏ
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Animation kích hoạt mượt mà
    requestAnimationFrame(() => {
        const modal = document.getElementById('dup-action-modal');
        modal.classList.remove('opacity-0');
        modal.querySelector('.bg-white\\/70').classList.remove('translate-y-full', 'md:scale-95');
    });
};

window.closeDupModal = () => {
    const modal = document.getElementById('dup-action-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('.bg-white\\/70').classList.add('translate-y-full', 'md:scale-95');
        setTimeout(() => modal.remove(), 300); // Đợi animation đóng
    }
};

window.executeDuplicate = (actId, changeTime) => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.date === state.activeDayDate);
    const actIndex = day.activities.findIndex(a => a.id === actId);
    
    if (actIndex > -1) {
        const actToCopy = day.activities[actIndex];
        const newAct = JSON.parse(JSON.stringify(actToCopy)); // Deep Clone
        
        // Cấp phát ID và đánh dấu chưa hoàn thành
        newAct.id = 'act_' + Date.now() + Math.random().toString(36).substr(2, 9);
        newAct.isCompleted = false;
        
        // Nếu chọn Đổi giờ: Lấy dữ liệu từ cả 2 ô Start & End
        if (changeTime) {
            const newStart = document.getElementById('dup-new-start').value;
            const newEnd = document.getElementById('dup-new-end').value;
            if (newStart) newAct.start = newStart;
            if (newEnd) newAct.end = newEnd;
        }
        
        // Thêm vào mảng và Sort lại theo thời gian bắt đầu
        day.activities.push(newAct);
        day.activities.sort((a, b) => a.start.localeCompare(b.start));

        // Lưu và render
        if(typeof saveState === 'function') saveState();
        renderTimeline();
        closeDupModal();
    }
};

