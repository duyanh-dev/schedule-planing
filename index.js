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
    list.innerHTML = state.trips.map(trip => {
        const isActive = state.activeTripId === trip.id;
        return `
            <div class="flex items-center gap-2 mb-3">
                <button onclick="switchTrip('${trip.id}')" class="tg-item ${isActive ? 'is-active' : ''} flex-1 min-w-0">
                    <span class="tg-cover"><img src="${trip.coverUrl}" alt=""></span>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-sm truncate ${isActive ? 'text-blue-700' : 'text-slate-800'}">${trip.title}</h4>
                        <p class="text-[11px] font-medium mt-0.5 ${isActive ? 'text-blue-600/70' : 'text-slate-500'}">${trip.days.length} ngày</p>
                    </div>
                </button>
                <!-- Nút phụ Sửa / Xóa: viên kính nổi -->
                <div class="flex flex-col gap-1.5 pr-1">
                    <button onclick="editTripFromList('${trip.id}')" class="tg-act edit" title="Sửa"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    <button onclick="deleteTripFromList('${trip.id}')" class="tg-act del" title="Xóa"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </div>
            </div>
        `;
    }).join('');
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
/* ==========================================================
   HIỆU ỨNG "TỜ GIẤY UỐN GÓC" cho Timeline
   - Duplicate: tờ giấy được dán xuống từ góc dưới-phải (góc cong dần phẳng ra), CHỈ 1 LẦN
   - Delete   : tờ giấy được bóc ra từ góc dưới-phải (chạy NGƯỢC lại hoàn toàn với dán)
   Thay thế 2 khối TL_DELETE_FX và TL_DUP_FX cũ. renderTimeline giữ nguyên
   (vẫn gọi TL_DELETE_FX.snapshot/play và TL_DUP_FX.bind/play như trước).
   ========================================================== */

/* ===== Helper dùng chung: vẽ góc giấy cong bằng clip-path + 1 "mặt sau tờ giấy" =====
   Đường gập là x + y = d. Phần x + y > d bị nhấc lên và lật qua đường gập
   (điểm (x,y) -> (d - y, d - x)), tạo thành mặt sau tờ giấy.
   q = 1: giấy phẳng hoàn toàn.  q = 0: giấy đang bị cong nhiều nhất (và mờ hẳn). */
/* ==========================================================
   TỜ GIẤY UỐN GÓC (bản tối ưu) + XÓA CARD CUỐI "HÚT VÀO TÂM"
   Thay thế: TL_PAPER và TL_DELETE_FX cũ.
   GIỮ NGUYÊN: TL_DUP_FX, TL_FX, renderTimeline (chỉ sửa nhánh ngày trống, xem cuối file).
   ========================================================== */
 
/* ===== Helper dùng chung: góc giấy cong bằng clip-path + "mặt sau tờ giấy" =====
   Đường gập là x + y = d. Phần x + y > d bị nhấc lên, lật qua nếp gập
   (x,y) -> (d - y, d - x). q = 1: giấy phẳng.  q = 0: cong nhiều nhất (mờ hẳn). */
/* ==========================================================
   TỜ GIẤY UỐN GÓC (bản tối ưu) + XÓA CARD CUỐI "HÚT VÀO TÂM"
   Thay thế: TL_PAPER và TL_DELETE_FX cũ.
   GIỮ NGUYÊN: TL_DUP_FX, TL_FX, renderTimeline (chỉ sửa nhánh ngày trống, xem cuối file).
   ========================================================== */

/* ===== Helper dùng chung: góc giấy cong bằng clip-path + "mặt sau tờ giấy" =====
   Đường gập là x + y = d. Phần x + y > d bị nhấc lên, lật qua nếp gập
   (x,y) -> (d - y, d - x). q = 1: giấy phẳng.  q = 0: cong nhiều nhất (mờ hẳn). */
const TL_PAPER = {
    LITE_BACKDROP: true, // tắt backdrop-filter của card trong lúc chạy (mượt hơn nhiều trên mobile/Safari)
    _styled: false,
    ensureStyle() {
        if (this._styled) return;
        this._styled = true;
        const s = document.createElement('style');
        s.textContent = '.tl-paper-run,.tl-paper-run *{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}';
        document.head.appendChild(s);
    },

    clip(poly, d, sign) { // Sutherland–Hodgman
        const out = [];
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i], b = poly[(i + 1) % poly.length];
            const fa = sign * (a.x + a.y - d), fb = sign * (b.x + b.y - d);
            if (fa <= 0) out.push(a);
            if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) {
                const t = fa / (fa - fb);
                out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
            }
        }
        return out;
    },
    roundedRect(w, h, r, n = 8) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        if (!r) return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
        const pts = [];
        const arc = (cx, cy, a0) => {
            for (let k = 0; k <= n; k++) {
                const a = a0 + (Math.PI / 2) * k / n;
                pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
            }
        };
        arc(w - r, r, -Math.PI / 2); arc(w - r, h - r, 0); arc(r, h - r, Math.PI / 2); arc(r, r, Math.PI);
        return pts;
    },
    css(pts, dx, dy) {
        if (pts.length < 3) return 'polygon(0px 0px,0px 0px,0px 0px)';
        return 'polygon(' + pts.map(p => (p.x + dx).toFixed(1) + 'px ' + (p.y + dy).toFixed(1) + 'px').join(',') + ')';
    },

    /* reverse=false: dán (q 0->1, power3.out) | reverse=true: bóc (q 1->0, power3.in)
       Khác bản cũ:
       1) Đo kích thước lại đúng lúc tween BẮT ĐẦU (sau delay). Bản cũ đo trước delay 600ms của Duplicate,
          trong lúc hộp thoại còn đóng/thanh cuộn đổi => nếp gập + mặt sau tờ giấy lệch so với card.
       2) Huỷ lần chạy cũ trên cùng card (trước đây prevTransition bị ghi đè thành 'none' => card mất transition).
       3) Mặt sau + bóng dịch translateY cùng card => không hở khe ở nếp gập.
       4) Item bị gỡ khỏi DOM (đổi tab/ngày giữa chừng) => tự dừng, không chạy ma.
       5) Tắt backdrop-filter lồng nhau trong lúc chạy (nguyên nhân giật chính khi clip-path đổi mỗi frame). */
    run(item, card, { reverse = false, duration = 0.8, delay = 0, onDone } = {}) {
        if (card._tlPaper) card._tlPaper.cancel();

        const prevTransition = card.style.transition, prevWill = card.style.willChange;
        card.style.transition = 'none';
        card.style.willChange = 'clip-path, opacity, transform';
        if (this.LITE_BACKDROP) { this.ensureStyle(); card.classList.add('tl-paper-run'); }

        const shade = document.createElement('div');
        shade.style.cssText = 'position:absolute;pointer-events:none;z-index:20;display:none;will-change:clip-path,opacity,transform';
        const flap = document.createElement('div');
        flap.style.cssText = 'position:absolute;pointer-events:none;z-index:25;display:none;will-change:clip-path,opacity,transform';
        item.appendChild(shade);
        item.appendChild(flap);

        let w = 0, h = 0, M = 0, rect = [], dMin = 0, dMax = 0, band = 0.012;
        const pc = v => (v * 100).toFixed(2) + '%';
        const st = { q: reverse ? 1 : 0 };

        const measure = () => {
            card.style.transform = ''; // đo khi chưa bị dịch
            const ir = item.getBoundingClientRect(), cr = card.getBoundingClientRect();
            w = card.offsetWidth; h = card.offsetHeight;
            const ox = cr.left - ir.left, oy = cr.top - ir.top;
            M = Math.ceil(Math.max(w, h) * 0.5);
            // Mặt sau tờ giấy chỉ lấn sang TRÁI/TRÊN card (điểm lật x' = d - y < x <= w), không bao giờ vượt
            // mép phải/dưới => hộp chỉ cần w + M, h + M. Bản cũ w + 2M làm hộp tràn ra ngoài màn hình bên phải:
            // clip-path KHÔNG thu nhỏ vùng cuộn, nên iOS Safari thấy trang rộng ra và tự "thu nhỏ vừa khít".
            const W = w + M, H = h + M;
            rect = this.roundedRect(w, h, parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0);
            dMin = 0.5 * (w + h); dMax = w + h + 2;
            band = Math.max(0.012, 28 / (W + H));
            shade.style.left = ox + 'px'; shade.style.top = oy + 'px';
            shade.style.width = w + 'px'; shade.style.height = h + 'px';
            flap.style.left = (ox - M) + 'px'; flap.style.top = (oy - M) + 'px';
            flap.style.width = W + 'px'; flap.style.height = H + 'px';
        };

        const apply = q => {
            if (q >= 0.999) {
                card.style.clipPath = ''; card.style.opacity = ''; card.style.transform = '';
                flap.style.display = 'none'; shade.style.display = 'none';
                return;
            }
            const d = dMin + (dMax - dMin) * q;
            const visible = this.clip(rect, d, 1);
            const gap = this.clip(rect, d, -1);
            const lifted = gap.map(p => ({ x: d - p.y, y: d - p.x }));
            const op = Math.min(1, q / 0.2);
            const tr = 'translateY(' + (-(1 - q) * 4).toFixed(2) + 'px)';

            card.style.clipPath = this.css(visible, 0, 0);
            card.style.opacity = op;
            card.style.transform = tr;

            const f2 = d / (w + h);
            shade.style.background = 'linear-gradient(135deg,transparent ' + pc(Math.max(0, f2 - 0.005)) +
                ',rgba(15,23,42,.15) ' + pc(f2) + ',rgba(15,23,42,0) ' + pc(Math.min(1, f2 + 0.08)) + ')';
            shade.style.clipPath = this.css(gap, 0, 0);
            shade.style.opacity = op;
            shade.style.transform = tr;
            shade.style.display = gap.length >= 3 ? 'block' : 'none';

            const f = (d + 2 * M) / (w + h + 2 * M);
            flap.style.background = 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 ' + pc(Math.max(0, f - band * 5)) +
                ',#e2e8f0 ' + pc(Math.max(0, f - band * 2.2)) + ',#b6c2d1 ' + pc(Math.max(0, f - band * 0.6)) +
                ',#8d9bb0 ' + pc(f) + ')';
            flap.style.clipPath = this.css(lifted, M, M);
            flap.style.opacity = op;
            flap.style.transform = tr;
            flap.style.display = lifted.length >= 3 ? 'block' : 'none';
        };

        let done = false, tween = null, raf = 0;
        const handle = { cancel: () => finish() };
        const finish = () => {
            if (done) return; done = true;
            cancelAnimationFrame(raf);
            if (tween && tween.kill) tween.kill();
            flap.remove(); shade.remove();
            card.style.willChange = prevWill;
            if (card._tlPaper === handle) card._tlPaper = null;
            if (!reverse) { // dán xong: trả card về nguyên trạng
                card.style.clipPath = ''; card.style.opacity = ''; card.style.transform = '';
                card.classList.remove('tl-paper-run');
                requestAnimationFrame(() => { card.style.transition = prevTransition; });
            }
            if (onDone) onDone();
        };
        card._tlPaper = handle;

        measure();
        apply(st.q);

        if (typeof gsap !== 'undefined') {
            tween = gsap.to(st, {
                q: reverse ? 0 : 1, duration, delay,
                ease: reverse ? 'power3.in' : 'power3.out',
                onStart: () => { if (!item.isConnected) return finish(); measure(); apply(st.q); },
                onUpdate: () => { if (!item.isConnected) return finish(); apply(st.q); },
                onComplete: finish
            });
        } else {
            const t0 = performance.now() + delay * 1000;
            let started = false;
            const frame = now => {
                if (done) return;
                if (!item.isConnected) return finish();
                if (now >= t0) {
                    if (!started) { started = true; measure(); }
                    const t = Math.min(1, (now - t0) / (duration * 1000));
                    apply(reverse ? 1 - t * t * t : 1 - Math.pow(1 - t, 3));
                    if (t >= 1) return finish();
                }
                raf = requestAnimationFrame(frame);
            };
            raf = requestAnimationFrame(frame);
        }
        return handle;
    }
};

/* ===== XÓA CARD =====
   - Còn >= 1 card sau khi xóa : tờ giấy bị bóc ra (như cũ) + khép khoảng trống.
   - Xóa card CUỐI (ngày trống) : playLast() -> card bị "hút" thành hạt vào tâm khung "Chưa có lịch trình",
     khung nổi lên, icon bật + sóng + tia sáng. Không dùng bóc giấy. Chỉ dùng transform/opacity => mượt. */
const TL_DELETE_FX = {
    snapshot(container, key) {
        const cr = container.getBoundingClientRect();
        return {
            same: container.dataset.tlKey === key,
            // bỏ qua "bóng ma" đang chạy dở để xóa liên tiếp không bị animate đôi
            items: Array.from(container.querySelectorAll('.tl-item[data-act-id]:not([data-tl-ghost])')).map(el => {
                const r = el.getBoundingClientRect();
                return {
                    id: el.dataset.actId, el, h: el.offsetHeight, w: el.offsetWidth,
                    top: r.top - cr.top - container.clientTop,
                    left: r.left - cr.left - container.clientLeft
                };
            })
        };
    },

    play(container, snap, key) {
        container.dataset.tlKey = key;
        if (!snap || !snap.same || !snap.items.length) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const alive = new Set(Array.from(container.querySelectorAll('.tl-item[data-act-id]')).map(e => e.dataset.actId));
        snap.items.forEach((it, i) => {
            if (alive.has(it.id) || !it.h) return;
            const ghost = it.el;
            ghost.dataset.tlGhost = '1';
            ghost.style.pointerEvents = 'none';
            ghost.style.height = it.h + 'px';
            let ref = null;
            for (let j = i + 1; j < snap.items.length; j++) {
                const n = container.querySelector('.tl-item[data-act-id="' + snap.items[j].id + '"]:not([data-tl-ghost])');
                if (n) { ref = n; break; }
            }
            if (!ref) ref = container.querySelector('.tl-extra');
            container.insertBefore(ghost, ref);

            const card = ghost.querySelector('.tl-card');
            const node = ghost.querySelector('.tl-node');
            const ease = 'cubic-bezier(.4,0,.2,1)';

            if (card) TL_PAPER.run(ghost, card, { reverse: true, duration: 0.8 });

            if (node) {
                node.animate([
                    { transform: 'scale(1)', opacity: 1 },
                    { transform: 'scale(1.15)', opacity: 1, offset: .2 },
                    { transform: 'scale(0)', opacity: 0 }
                ], { duration: 500, delay: 250, easing: ease, fill: 'forwards' });
            }

            this.collapse(container, ghost, it, snap, i, alive);
        });
    },

    /* ===== Xóa card cuối: ngày chuyển sang khung "Chưa có lịch trình" ===== */
    playLast(container, snap, key) {
        container.dataset.tlKey = key;
        const empty = container.querySelector('.tl-empty');
        if (!empty || !snap || !snap.same) return;
        const gone = snap.items.filter(it => it.h);
        if (!gone.length || typeof Element.prototype.animate !== 'function') return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        TL_PAPER.ensureStyle();

        // 1) Dựng lại card cũ thành "bóng ma" đè đúng vị trí cũ (position:absolute => không làm khung trống bị đẩy)
        const prevPos = container.style.position;
        if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
        gone.forEach(it => {
            const g = it.el;
            g.dataset.tlGhost = '1';
            Object.assign(g.style, {
                position: 'absolute', margin: '0', pointerEvents: 'none', zIndex: '30',
                left: it.left + 'px', top: it.top + 'px', width: it.w + 'px', height: it.h + 'px'
            });
            container.appendChild(g);
        });

        // 2) Đo MỘT lần trước khi chạy bất kỳ animation nào
        const icon = empty.querySelector('.tl-empty-icon');
        const ir = icon.getBoundingClientRect();
        const ix = ir.left + ir.width / 2, iy = ir.top + ir.height / 2;
        const T = 760, STAG = 70;
        const arrive = Math.round(T * 0.62) + (gone.length - 1) * STAG; // lúc card chạm tâm icon
        const jobs = [];

        gone.forEach((it, i) => {
            const g = it.el, d = i * STAG;
            const card = g.querySelector('.tl-card');

            // phần phụ (giờ, node, đường kẻ, thanh nút) mờ dần
            g.querySelectorAll('.tl-time,.tl-node,.tl-line,.tl-body > :not(.tl-card)').forEach(el => {
                const end = el.classList.contains('tl-node') ? { opacity: 0, transform: 'scale(0)' }
                    : el.classList.contains('tl-line') ? { opacity: 0 }
                    : { opacity: 0, transform: 'translateY(8px)' };
                const start = el.classList.contains('tl-node') ? { opacity: 1, transform: 'scale(1)' }
                    : el.classList.contains('tl-line') ? { opacity: 1 }
                    : { opacity: 1, transform: 'none' };
                jobs.push(el.animate([start, end], {
                    duration: 320, delay: d + 60, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'
                }).finished);
            });

            if (card) {
                const cr = card.getBoundingClientRect();
                const dx = ix - (cr.left + cr.width / 2), dy = iy - (cr.top + cr.height / 2);
                card.style.transition = 'none';
                card.style.willChange = 'transform, opacity';
                card.classList.add('tl-paper-run'); // bỏ backdrop-filter cho nhẹ
                // phồng nhẹ (lấy đà) -> cong vòng, thu nhỏ -> bị hút vào tâm icon
                jobs.push(card.animate([
                    { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
                    { transform: 'translate(0,-8px) scale(1.03) rotate(0deg)', opacity: 1, offset: .16 },
                    { transform: 'translate(' + (dx * .55).toFixed(1) + 'px,' + (dy * .55 - 28).toFixed(1) + 'px) scale(.42) rotate(-9deg)', opacity: .9, offset: .6 },
                    { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(.04) rotate(-24deg)', opacity: 0, offset: 1 }
                ], { duration: T, delay: d, easing: 'cubic-bezier(.6,.02,.3,1)', fill: 'forwards' }).finished);
            }
        });

        // 3) Khung "Chưa có lịch trình" nổi lên khi card đang bị hút vào
        empty.animate([
            { opacity: 0, transform: 'translateY(18px) scale(.94)' },
            { opacity: 1, transform: 'none' }
        ], { duration: 640, delay: Math.max(0, arrive - 340), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });

        // 4) Icon bật lên đúng lúc card chạm tâm
        icon.animate([
            { transform: 'scale(.4) rotate(-20deg)', opacity: 0 },
            { transform: 'scale(1.22) rotate(6deg)', opacity: 1, offset: .55 },
            { transform: 'scale(1) rotate(0deg)', opacity: 1 }
        ], { duration: 650, delay: arrive - 80, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });

        // 5) Hai vòng sóng lan ra
        [0, 170].forEach(extra => {
            const ring = document.createElement('span');
            ring.style.cssText = 'position:absolute;inset:0;border-radius:9999px;border:2px solid rgba(59,130,246,.5);pointer-events:none;opacity:0';
            icon.appendChild(ring);
            const a = ring.animate([
                { transform: 'scale(1)', opacity: 0 },
                { transform: 'scale(1.3)', opacity: .7, offset: .12 },
                { transform: 'scale(2.6)', opacity: 0 }
            ], { duration: 800, delay: arrive + extra, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'backwards' });
            a.finished.then(() => ring.remove(), () => ring.remove());
        });

        // 6) Hạt sáng bắn tỏa ra (card "tan" thành hạt)
        const COLORS = ['#60a5fa', '#93c5fd', '#38bdf8', '#a5b4fc', '#cbd5e1'];
        const N = 12;
        for (let k = 0; k < N; k++) {
            const ang = (k / N) * Math.PI * 2 + Math.random() * 0.4;
            const rad = 44 + Math.random() * 40;
            const dot = document.createElement('span');
            dot.style.cssText = 'position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;' +
                'border-radius:9999px;pointer-events:none;opacity:0;background:' + COLORS[k % COLORS.length];
            icon.appendChild(dot);
            const tx = (Math.cos(ang) * rad).toFixed(1), ty = (Math.sin(ang) * rad).toFixed(1);
            const a = dot.animate([
                { transform: 'translate(0,0) scale(.6)', opacity: 0 },
                { transform: 'translate(' + (tx * .15) + 'px,' + (ty * .15) + 'px) scale(1)', opacity: 1, offset: .12 },
                { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(0)', opacity: 0 }
            ], { duration: 600 + Math.random() * 250, delay: arrive, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
            a.finished.then(() => dot.remove(), () => dot.remove());
        }

        // 7) Chữ + nút xuất hiện lần lượt
        empty.querySelectorAll('.tl-empty-stagger').forEach((el, k) => {
            el.animate([
                { opacity: 0, transform: 'translateY(10px)' },
                { opacity: 1, transform: 'none' }
            ], { duration: 520, delay: arrive + 60 + k * 90, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
        });

        // 8) Khung trống nằm ngoài màn hình (do trang ngắn lại) -> cuộn nhẹ tới
        const er = empty.getBoundingClientRect();
        if (er.top < 0 || er.bottom > window.innerHeight) {
            setTimeout(() => { if (empty.isConnected) empty.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120);
        }

        // 9) Dọn dẹp
        Promise.allSettled(jobs).then(() => {
            gone.forEach(it => it.el.remove());
            container.style.position = prevPos;
        });
    },

    scrollParent(el) {
        for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
            const o = getComputedStyle(p).overflowY;
            if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
        }
        return null;
    },

    /* Khép khoảng trống + tự cuộn cùng một tiến độ p (giữ nguyên logic cũ).
       Sửa: nếu ghost bị gỡ khỏi DOM giữa chừng (đổi tab/ngày) thì dừng NGAY, không kéo cuộn trang mới. */
    collapse(container, ghost, it, snap, i, alive) {
        const mb = parseFloat(getComputedStyle(ghost).marginBottom) || 0;
        const full = it.h + mb;

        if (typeof gsap === 'undefined') {
            const c = ghost.animate([
                { height: it.h + 'px', marginBottom: mb + 'px', opacity: 1 },
                { height: '0px', marginBottom: '0px', opacity: 0 }
            ], { duration: 450, delay: 650, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
            c.onfinish = () => ghost.remove();
            return;
        }

        const sp = this.scrollParent(ghost);
        const getTop = () => sp ? sp.scrollTop : (window.pageYOffset || document.documentElement.scrollTop || 0);
        const setTop = v => sp ? sp.scrollTo({ top: v, behavior: 'instant' }) : window.scrollTo({ top: v, left: 0, behavior: 'instant' });
        const vh = sp ? sp.clientHeight : window.innerHeight;
        const viewTop = sp ? sp.getBoundingClientRect().top : 0;
        const docH = sp ? sp.scrollHeight : document.documentElement.scrollHeight;
        const s0 = getTop();
        const maxAfter = Math.max(0, docH - full - vh);

        const sel = id => container.querySelector('.tl-item[data-act-id="' + id + '"]:not([data-tl-ghost])');
        let target = null, targetBelow = false;
        for (let j = i - 1; j >= 0 && !target; j--) if (alive.has(snap.items[j].id)) target = sel(snap.items[j].id);
        for (let j = i + 1; j < snap.items.length && !target; j++) if (alive.has(snap.items[j].id)) { target = sel(snap.items[j].id); targetBelow = true; }

        let final = Math.min(s0, maxAfter);
        if (target) {
            const r = target.getBoundingClientRect();
            const absTop = s0 + (r.top - viewTop) - (targetBelow ? full : 0);
            const hgt = r.height, pad = 16;
            const topAfter = absTop - final;
            const fits = topAfter >= pad && (hgt > vh - 2 * pad ? topAfter < vh - 2 * pad : topAfter + hgt <= vh - pad);
            if (!fits) {
                const want = hgt < vh - 2 * pad ? absTop - (vh - hgt) / 2 : absTop - pad;
                final = Math.max(0, Math.min(want, maxAfter));
            }
        }

        let userMoved = false;
        const stop = () => { userMoved = true; };
        const evs = ['wheel', 'touchstart', 'keydown', 'mousedown'];
        evs.forEach(e => window.addEventListener(e, stop, { passive: true }));
        const cleanup = () => evs.forEach(e => window.removeEventListener(e, stop));

        const st = { p: 0 };
        const tw = gsap.to(st, {
            p: 1, duration: 0.55, delay: 0.65, ease: 'power2.inOut',
            onUpdate: () => {
                if (!ghost.isConnected) { tw.kill(); cleanup(); return; } // render lại/đổi tab giữa chừng
                const p = st.p;
                ghost.style.height = (it.h * (1 - p)) + 'px';
                ghost.style.marginBottom = (mb * (1 - p)) + 'px';
                ghost.style.opacity = String(1 - p);
                if (!userMoved && Math.abs(final - s0) > 0.5) setTop(s0 + (final - s0) * p);
            },
            onComplete: () => { cleanup(); ghost.remove(); }
        });
    }
};

/* ===== KHUNG "CHƯA CÓ LỊCH TRÌNH" (có class để animate) ===== */
const tlEmptyHtml = (dateStr) => `
    <div class="tl-empty text-center py-12 md:py-16 px-4 md:ml-16 relative z-10 bg-white/50 backdrop-blur-2xl border border-white/80 shadow-[0_10px_40px_rgba(0,0,0,0.03)] rounded-[2rem] mb-10">
        <div class="tl-empty-icon relative w-20 h-20 rounded-full bg-white/80 backdrop-blur-md border border-white flex items-center justify-center text-slate-300 mx-auto mb-4 text-4xl shadow-[0_8px_20px_rgba(0,0,0,0.04)]"><i class="fa-solid fa-mug-hot"></i></div>
        <h3 class="tl-empty-stagger text-xl font-black text-slate-700">Chưa có lịch trình</h3>
        <p class="tl-empty-stagger text-slate-500 text-[13px] md:text-sm mt-2 font-medium">Bấm <strong class="text-blue-600">+ Thêm</strong> để lên kế hoạch cho ngày này.</p>

        <div class="tl-empty-stagger mt-6 flex justify-center" data-html2canvas-ignore>
            <button onclick="confirmDeleteDay('${dateStr}')" class="h-[3.25rem] px-6 bg-red-100/80 backdrop-blur-xl hover:bg-red-200/80 text-red-900 rounded-[1.25rem] font-bold text-[13px] transition-all shadow-[0_4px_12px_rgba(244,63,94,0.06),inset_0_2px_4px_rgba(255,255,255,0.8)] active:scale-95 flex items-center justify-center gap-2.5 border border-rose-200/70 touch-manipulation group">
                <div class="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center border border-rose-200 shadow-[0_2px_5px_rgba(0,0,0,0.06)] group-hover:scale-110 transition-transform flex-shrink-0">
                    <i class="fa-solid fa-trash-can text-rose-600 text-[13px]"></i>
                </div>
                <span class="drop-shadow-sm pr-1">Xóa ngày này</span>
            </button>
        </div>
    </div>`;

/* ===== HIỆU ỨNG NHÂN BẢN (Duplicate): cuộn tới card mới + tờ giấy được dán xuống =====
   Chỉ kích hoạt khi người dùng bấm nút Duplicate, không đụng tới logic duplicateActivity.
   Animation chỉ chạy MỘT lần. */
const TL_DUP_FX = {
    armedAt: 0,
    knownIds: null,
    WINDOW: 120000, // thời gian tối đa (ms) chờ người dùng xác nhận trước khi hủy cờ
    collectIds() {
        const ids = new Set();
        try {
            if (typeof state !== 'undefined' && state && Array.isArray(state.trips)) {
                state.trips.forEach(t => (t.days || []).forEach(d => (d.activities || []).forEach(a => ids.add(String(a.id)))));
            }
        } catch (e) { /* bỏ qua, sẽ dùng snapshot dự phòng */ }
        return ids;
    },
    bind(container) {
        if (container._tlDupBound) return;
        container._tlDupBound = true;
        // Capture phase: chạy trước onclick của nút nên cờ + danh sách ID cũ luôn được ghi nhận kịp lúc
        container.addEventListener('click', e => {
            if (e.target.closest && e.target.closest('button[title="Duplicate"]')) {
                this.armedAt = Date.now();
                this.knownIds = this.collectIds();
            }
        }, true);
    },
    play(container, snap) {
        if (!this.armedAt) return;
        if (Date.now() - this.armedAt > this.WINDOW) { this.armedAt = 0; this.knownIds = null; return; }

        let known = this.knownIds && this.knownIds.size ? this.knownIds : null;
        if (!known) {
            if (!snap || !snap.same) return;
            known = new Set(snap.items.map(i => i.id));
        }

        const fresh = Array.from(container.querySelectorAll('.tl-item[data-act-id]')).filter(e => !known.has(String(e.dataset.actId)));
        if (!fresh.length) return; // chưa có card mới (đang chờ xác nhận) -> giữ cờ, chờ lần render sau
        this.armedAt = 0;
        this.knownIds = null;

        const item = fresh[0];
        const card = item.querySelector('.tl-card');
        const node = item.querySelector('.tl-node');
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Cuộn mượt tới card mới (chờ hộp thoại đóng xong rồi mới cuộn)
        setTimeout(() => {
            if (!item.isConnected) return;
            item.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        }, reduce ? 0 : 250);
        if (reduce || !card) return;

        const delay = 600; // chờ hộp thoại đóng + màn hình cuộn tới nơi rồi mới dán
        const ease = 'cubic-bezier(.2,.8,.2,1)';

        // 1) Tờ giấy được dán xuống: góc cong dần phẳng ra (1 lần duy nhất)
        TL_PAPER.run(item, card, { reverse: false, duration: 0.9, delay: delay / 1000 });

        // 2) Node tròn nảy lên cùng lúc
        if (node) {
            node.animate([
                { transform: 'scale(0)', opacity: 0 },
                { transform: 'scale(1.2)', opacity: 1, offset: .65 },
                { transform: 'scale(1)', opacity: 1 }
            ], { duration: 650, delay: delay + 100, easing: ease, fill: 'backwards' });
        }
    }
};

/* ===== ĐỊNH DẠNG GIỜ: từ 24h trở lên đổi thành "+N ngày" (chỉ hiển thị, không đổi dữ liệu) ===== */
const tlFmtTime = (t, block) => {
    const m = /^\s*(\d+)\s*:\s*(\d{1,2})\s*$/.exec(t == null ? '' : String(t));
    if (!m) return t == null ? '' : t;
    const h = parseInt(m[1], 10), min = m[2].padStart(2, '0');
    if (h < 24) return t;
    const days = Math.floor(h / 24);
    const hh = String(h % 24).padStart(2, '0');
    const badge = '<span class="' + (block ? 'block ' : 'ml-1 ') + 'text-[9px] font-black text-blue-500 uppercase tracking-wider">+' + days + ' ngày</span>';
    return hh + ':' + min + badge;
};

/* ===== Đổi cách hiển thị thời gian trong nhãn trạng thái =====
   >= 60 phút  -> hiện theo giờ (vd: 90 phút -> 1 giờ 30 phút)
   >= 24 giờ   -> hiện theo ngày (vd: 30 giờ -> 1 ngày 6 giờ)
   Chỉ sửa chữ hiển thị, không đụng logic tính trạng thái hay màu sắc. */
const formatStatusLabel = (label) => {
    if (typeof label !== 'string') return label;
    const chain = /(?:\d+\s*(?:ngày|giờ|tiếng|phút|min|h|m|p|d)(?![\p{L}])\s*(?:,|và)?\s*)+/iu;
    const m = label.match(chain);
    if (!m) return label;

    let total = 0;
    const token = /(\d+)\s*(ngày|giờ|tiếng|phút|min|h|m|p|d)(?![\p{L}])/giu;
    let t;
    while ((t = token.exec(m[0])) !== null) {
        const n = parseInt(t[1], 10);
        const u = t[2].toLowerCase();
        if (u === 'ngày' || u === 'd') total += n * 1440;
        else if (u === 'giờ' || u === 'tiếng' || u === 'h') total += n * 60;
        else total += n;
    }

    const days = Math.floor(total / 1440);
    const hours = Math.floor((total % 1440) / 60);
    const mins = total % 60;
    const parts = [];
    if (days > 0) {
        parts.push(days + ' ngày');
        if (hours > 0) parts.push(hours + ' giờ');
    } else if (hours > 0) {
        parts.push(hours + ' giờ');
        if (mins > 0) parts.push(mins + ' phút');
    } else {
        parts.push(mins + ' phút');
    }
    const trailing = /\s$/.test(m[0]) ? ' ' : '';
    return label.replace(m[0], parts.join(' ') + trailing);
};

// ===== PHƯƠNG TIỆN CHẠY THEO SCROLL TRÊN ĐƯỜNG LINE TIMELINE =====
// rot: góc xoay icon để "đầu xe" hướng xuống dưới. Nếu thấy icon bị ngược, đổi rot (±90, 180) ở đây.
const TL_VEHICLES = {
    air:   { icon: 'fa-plane-up',       rot: 180 },
    bus:   { icon: 'fa-bus-simple',     rot: 0   },
    train: { icon: 'fa-train-subway',   rot: 0   },
    ship:  { icon: 'fa-ship',           rot: 90  },
    bike:  { icon: 'fa-motorcycle',     rot: 90  },
    walk:  { icon: 'fa-person-walking', rot: 0   },
    car:   { icon: 'fa-car-side',       rot: 90  }
};

const tlVehicleFor = (act, next) => {
    const pick = (txt) => {
        const s = String(txt || '').toLowerCase();
        if (!s.trim()) return null;
        if (/máy bay|flight|plane|airline|\bbay\b/.test(s)) return 'air';
        if (/thuyền|phà|ferry|boat|cano|tàu thủy|du thuyền/.test(s)) return 'ship';
        if (/tàu|train|metro|subway|mrt|bts/.test(s)) return 'train';
        if (/bus|buýt|buyt|xe khách/.test(s)) return 'bus';
        if (/xe máy|motor|scooter|moto/.test(s)) return 'bike';
        if (/đi bộ|walk/.test(s)) return 'walk';
        if (/grab|taxi|ô tô|oto|car|xe hơi|xe/.test(s)) return 'car';
        return null;
    };
    const key = pick(act && act.transport) || pick(next && next.transport) || 'car';
    return { key, ...TL_VEHICLES[key] };
};

const TL_TRAIL_MASK = '-webkit-mask-image:linear-gradient(to top,#000,transparent);mask-image:linear-gradient(to top,#000,transparent);';

const TL_VEHICLE_FX = (() => {
    const Y0 = -14, Y1 = 26;        // tâm node trên / tâm node dưới, tính theo đầu/cuối line
    const READ = 0.55;              // xe ghim ở 55% chiều cao màn hình

    // ===== TINH CHỈNH =====
    const USE_STICKY = true;        // false: ép dùng chế độ JS (để so sánh)
    const PIN_PX = null;            // số px cố định tính từ đỉnh khung cuộn (null = READ × chiều cao màn hình lúc khởi tạo)
    const OMEGA    = 22;            // chế độ JS (dự phòng): độ cứng lò xo
    const OMEGA_FX = 36;            // độ nhạy hiệu ứng mờ/nhỏ/vệt (lớn = ít trễ, nhỏ = êm hơn)
    const EDGE_ZONE        = 46;    // px: khoảng cách tới node bắt đầu mờ/nhỏ
    const EDGE_MIN_SCALE   = 0.35;  // kích thước tại node (1 = không nhỏ đi)
    const EDGE_MIN_OPACITY = 0;     // độ mờ tại node (1 = không mờ)
    const EDGE_ALWAYS      = true;  // true: mờ/nhỏ cả khi tắt animation; false: chỉ khi data-animation-on="true"

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animOn = () => document.documentElement.getAttribute('data-animation-on') === 'true';
    const snapPx = (v) => { const d = window.devicePixelRatio || 1; return Math.round(v * d) / d; };
    const r2 = (v) => Math.round(v * 100) / 100;
    // overflow:clip cắt nội dung nhưng KHÔNG tạo khung cuộn → không phá sticky (overflow:hidden thì phá)
    const CLIP_OK = !!(window.CSS && CSS.supports && CSS.supports('overflow', 'clip'));

    let items = [], bound = false, raf = 0, last = 0;
    let vh = window.innerHeight || document.documentElement.clientHeight;
    let vw = window.innerWidth;
    let ro = null, roEl = null, settleT = 0;
    let lastCTop = null, moveAt = 0;

    // Điểm ghim tính bằng PX cố định (không dùng %): thanh công cụ Safari co/giãn khi cuộn ngược sẽ không làm xe nhích
    const calcPin = () => PIN_PX !== null ? PIN_PX : Math.round(READ * (window.innerHeight || document.documentElement.clientHeight || 700));
    let pin = calcPin();

    // 0 = chưa kiểm tra, 1 = sticky chạy tốt, -1 = sticky không dùng được → chế độ JS
    let stickyState = USE_STICKY ? 0 : -1;
    let readCal = null;             // toạ độ Y thật của xe khi đang ghim (đo từ DOM)
    let readEst = pin;
    let calAt = 0;

    const setMode = () => {
        document.documentElement.setAttribute('data-tl-veh', stickyState > 0 ? 'sticky' : stickyState === 0 ? 'checking' : 'js');
    };

    // offsetTop không bị ảnh hưởng bởi transform của animation vào → vị trí đo luôn đúng
    const docTop = (el) => { let y = 0; while (el) { y += el.offsetTop || 0; el = el.offsetParent; } return y; };

    const findScroller = (c) => {
        let a = c.parentElement;
        while (a && a !== document.body && a !== document.documentElement) {
            const oy = getComputedStyle(a).overflowY;
            if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && a.scrollHeight > a.clientHeight + 1) return a;
            a = a.parentElement;
        }
        return null;
    };
    const estimateReadY = (c) => {
        const sc = findScroller(c);
        return (sc ? sc.getBoundingClientRect().top : 0) + pin;
    };

    const posCss = () => stickyState >= 0 ? 'position:-webkit-sticky;position:sticky;' : 'position:relative;';
    const topCss = (px) => stickyState >= 0 ? 'top:' + px + 'px;' : 'top:0;';

    // Dựng 2 "đường ray" cho mỗi line, cả xe lẫn vệt tô đều do compositor ghim (JS không đụng vào vị trí):
    //  • .tl-frail  : đúng bằng hộp line, cắt phần thừa. Bên trong là neo sticky cao 0px, thanh tô kéo từ neo LÊN TRÊN
    //                 → ngọn vệt tô luôn trùng tâm xe, bị cắt ở đầu/cuối line
    //  • .tl-vrail  : kéo dài từ (đầu line + Y0 - 14) tới (cuối line + Y1 + 14): tâm xe chạy đúng từ Y0 tới h + Y1
    const adopt = (it) => {
        const frail = document.createElement('div');
        frail.className = 'tl-frail';
        frail.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;' +
            (CLIP_OK ? 'overflow:clip;' : '-webkit-clip-path:inset(0);clip-path:inset(0);');
        const anchor = document.createElement('div');
        anchor.className = 'tl-fanchor';
        anchor.style.cssText = posCss() + topCss(pin) + 'left:auto;width:100%;height:0;pointer-events:none;';
        frail.appendChild(anchor);
        if (it.fill) {
            anchor.appendChild(it.fill);
            it.fill.style.cssText = 'position:absolute;left:0;right:0;bottom:0;top:auto;height:1px;visibility:hidden;';
        }
        it.line.insertBefore(frail, it.line.firstChild);   // nằm dưới xe

        const rail = document.createElement('div');
        rail.className = 'tl-vrail';
        rail.style.cssText = 'position:absolute;left:50%;top:' + (Y0 - 14) + 'px;bottom:-' + (Y1 + 14) +
            'px;width:28px;margin-left:-14px;pointer-events:none;';
        rail.appendChild(it.veh);
        it.line.appendChild(rail);
        it.veh.style.cssText = posCss() + topCss(pin - 14) +
            'left:auto;margin:0;width:28px;height:28px;pointer-events:none;';
        it.anchor = anchor;
    };

    const applyPin = () => {
        if (stickyState < 0) return;
        items.forEach(i => {
            if (i.veh) i.veh.style.top = (pin - 14) + 'px';
            if (i.anchor) i.anchor.style.top = pin + 'px';
        });
    };

    // Promote layer GPU sẵn cho phần tử con (phần tử sticky thì KHÔNG bị ghi gì mỗi frame)
    const prime = (it) => {
        [it.bead, ...it.trails].forEach(el => { if (el) el.style.willChange = 'transform'; });
        if (it.head) it.head.style.willChange = 'transform, opacity';
    };

    // Đo vị trí các line (khi render / resize / animation vào xong / font load xong), không đo mỗi frame
    const measure = () => {
        const c = document.getElementById('timeline-container');
        if (!c) { items = []; return; }
        if (readCal === null) readEst = estimateReadY(c);
        const cBase = docTop(c);
        const prev = new Map(items.map(i => [i.line, i]));
        items = [...c.querySelectorAll('.tl-line')].map(line => {
            let it = prev.get(line);
            const isNew = !it;
            if (isNew) {
                it = {
                    line,
                    veh: line.querySelector('.tl-vehicle'),
                    fill: line.querySelector('.tl-fill'),
                    head: line.querySelector('.tl-vhead'),
                    bead: line.querySelector('.tl-vbead'),
                    trails: [...line.querySelectorAll('.tl-vt')],
                    anchor: null,
                    x: null, v: 0,                       // tiến trình đã làm mượt (px dọc line) + vận tốc → chỉ dùng cho hiệu ứng
                    speed: 0, headDeg: 0, dir: 1, pend: 1, streak: 0,
                    clean: false, jump: false, chk: null, fv: 0, fh: -1,
                    w: {}, top: 0, h: 0, span: 1
                };
                if (it.veh) { prime(it); adopt(it); }
            }
            const top = docTop(line) - cBase;
            const h = line.offsetHeight;
            // Hình học đổi (animation vào / font load) → nhảy thẳng tới vị trí mới, KHÔNG trượt chậm
            if (!isNew && (Math.abs(top - it.top) > 0.5 || Math.abs(h - it.h) > 0.5)) it.jump = true;
            it.top = top;
            it.h = h;
            it.span = Math.max(1, h + Y1 - Y0);
            if (it.fill && it.fh !== h) { it.fh = h; it.fill.style.height = (h + 1) + 'px'; }
            return it;
        }).filter(i => i.veh && i.h > 0);
    };

    // chỉ ghi khi giá trị đổi
    const put = (it, key, el, val) => { if (el && it.w[key] !== val) { it.w[key] = val; el.style.transform = val; } };
    const putOp = (it, el, val) => { if (el && it.w.o !== val) { it.w.o = val; el.style.opacity = val; } };

    const resetFx = (it) => {
        put(it, 'bead', it.bead, '');
        it.trails.forEach((t, i) => put(it, 't' + i, t, 'scaleY(0)'));
    };

    const stickyFailed = () => {
        stickyState = -1; readCal = null; setMode();
        items.forEach(i => {
            i.w.veh = null; i.w.an = null; i.chk = null;
            if (i.veh) { i.veh.style.position = 'relative'; i.veh.style.top = '0px'; }
            if (i.anchor) { i.anchor.style.position = 'relative'; i.anchor.style.top = '0px'; }
        });
    };

    const tick = (now) => {
        raf = 0;
        const dtMs = last ? clamp(now - last, 1, 50) : 16.7;
        const dt = dtMs / 1000;
        last = now;
        let active = false;

        const c = document.getElementById('timeline-container');
        if (!c) { last = 0; return; }
        const cTop = c.getBoundingClientRect().top;     // một lần đọc layout mỗi frame
        // phát hiện đang cuộn bằng chính vị trí (không phụ thuộc tần suất sự kiện scroll, nhất là iOS quán tính)
        if (lastCTop === null || Math.abs(cTop - lastCTop) > 0.01) moveAt = now;
        lastCTop = cTop;
        const moving = now - moveAt < 140;
        if (moving) active = true;

        const fancy = animOn();
        const ry = readCal !== null ? readCal : readEst;
        const w0 = stickyState >= 0 ? OMEGA_FX : OMEGA;

        for (const it of items) {
            if (reduce) { put(it, 'veh', it.veh, 'scale(0)'); continue; }

            const lineTop = cTop + it.top;
            const off = lineTop + it.h < -150 || lineTop > vh + 150;
            const tx = clamp(ry - (lineTop + Y0), 0, it.span);          // tiến trình thật (px dọc line)

            if (it.x === null || it.jump) {
                it.x = tx; it.v = 0; it.speed = 0; it.jump = false; it.chk = null;
            }
            if (off) { it.x = tx; it.v = 0; it.speed = 0; continue; }     // ngoài màn hình: không tính, không vẽ

            // ===== KIỂM TRA STICKY CÓ THỰC SỰ GHIM XE KHÔNG + hiệu chỉnh vị trí ghim =====
            if (stickyState >= 0 && moving && it.span > 120) {
                const m = Math.min(80, it.span * 0.3);
                const inside = tx > m && tx < it.span - m;
                if (stickyState === 0) {
                    if (!inside) it.chk = null;
                    else {
                        const r = it.veh.getBoundingClientRect();
                        const cy = r.top + r.height / 2;
                        if (!it.chk) it.chk = { top: lineTop, cy };
                        else if (Math.abs(lineTop - it.chk.top) > 24) {
                            // line đã trôi > 24px: nếu xe đứng yên trên màn hình → sticky OK
                            if (Math.abs(cy - it.chk.cy) < Math.abs(lineTop - it.chk.top) * 0.4) {
                                stickyState = 1; readCal = cy; calAt = now; setMode();
                            } else stickyFailed();
                        }
                    }
                } else if (inside && now - calAt > 250) {
                    const r = it.veh.getBoundingClientRect();
                    readCal = r.top + r.height / 2; calAt = now;
                }
            }

            // ===== LÒ XO GIẢM CHẤN TỚI HẠN (đơn điệu: không vọt qua, không bị kéo ngược) — chỉ làm mượt HIỆU ỨNG =====
            const d0 = it.x - tx;
            const w = w0 * (1 + Math.abs(d0) / 320);
            const e = Math.exp(-w * dt);
            const c2 = it.v + w * d0;
            const d1 = (d0 + c2 * dt) * e;
            it.v = (it.v - w * c2 * dt) * e;
            it.x = clamp(tx + d1, 0, it.span);

            const settled = !moving && Math.abs(it.x - tx) < 0.25 && Math.abs(it.v) < 8;
            if (settled) { it.x = tx; it.v = 0; }
            else active = true;

            // ===== CHẾ ĐỘ JS (chỉ khi sticky không dùng được): tự đặt xe + neo vệt tô =====
            if (stickyState < 0) {
                const ty = settled ? snapPx(it.x) : r2(it.x);
                put(it, 'veh', it.veh, `translate3d(0,${ty}px,0)`);
                put(it, 'an', it.anchor, `translate3d(0,${r2(clamp(Y0 + it.x, 0, it.h))}px,0)`);
            }

            // ===== GẦN NODE: nhỏ lại + mờ đi · RỜI NODE: lớn lên + rõ dần (áp lên .tl-vhead, KHÔNG đụng phần tử sticky) =====
            let sc = 1, op = 1;
            if (EDGE_ALWAYS || fancy) {
                const z = Math.min(EDGE_ZONE, it.span * 0.35);
                const f0 = clamp(Math.min(it.x, it.span - it.x) / z, 0, 1);
                const f = f0 * f0 * (3 - 2 * f0);                          // smoothstep
                sc = EDGE_MIN_SCALE + (1 - EDGE_MIN_SCALE) * f;
                op = EDGE_MIN_OPACITY + (1 - EDGE_MIN_OPACITY) * f;
            }
            const hs = `scale(${sc.toFixed(3)})`;
            putOp(it, it.head, op.toFixed(3));

            // vệt tô theo sau: chỉ hiện khi bật animation (đổi visibility, không đụng vị trí)
            const fv = fancy ? 1 : 0;
            if (it.fv !== fv) { it.fv = fv; if (it.fill) it.fill.style.visibility = fv ? 'visible' : 'hidden'; }

            // ===== TẮT ANIMATION: chỉ trượt =====
            if (!fancy) {
                if (!it.clean) { resetFx(it); it.clean = true; it.speed = 0; it.headDeg = 0; }
                put(it, 'head', it.head, hs);
                continue;
            }
            it.clean = false;

            // ===== BẬT ANIMATION: quay đầu theo chiều scroll + giọt kính co giãn + vệt khói =====
            const av = Math.abs(it.v);
            const raw = av < 24 ? 0 : clamp(av / 1600, 0, 1);
            it.speed += (raw - it.speed) * (1 - Math.exp(-dtMs / 150));
            if (it.speed < 0.015) it.speed = 0;
            const q = Math.round(it.speed * 100) / 100;

            if (av > 72) {                                                 // đổi chiều phải ổn định 3 frame
                const dd = it.v > 0 ? 1 : -1;
                if (dd === it.pend) it.streak++; else { it.pend = dd; it.streak = 1; }
                if (it.streak >= 3) it.dir = dd;
            }
            const goal = it.dir > 0 ? 0 : 180;
            it.headDeg += (goal - it.headDeg) * (1 - Math.exp(-dtMs / 80));
            if (Math.abs(goal - it.headDeg) < 0.5) it.headDeg = goal;

            if (q > 0 || it.headDeg !== goal) active = true;

            const air = it.veh.dataset.v === 'air';
            const sway = Math.sin((it.x / it.span) * 16) * (air ? 0.8 : 1.6) * q * q;   // lắc rất nhẹ, êm đầu/cuối
            put(it, 'head', it.head, `rotate(${(it.headDeg + sway).toFixed(1)}deg) ${hs}`);
            put(it, 'bead', it.bead, q ? `scale(${(1 - 0.12 * q).toFixed(3)},${(1 + 0.35 * q).toFixed(3)})` : '');
            const tq = q.toFixed(2);
            it.trails.forEach((t, i) => put(it, 't' + i, t, `scaleY(${tq})`));
        }

        if (active) raf = requestAnimationFrame(tick);
        else last = 0;
    };

    const request = () => { if (!raf) raf = requestAnimationFrame(tick); };

    // Chạy 1 frame đồng bộ mà KHÔNG để lại vòng rAF thứ hai
    const flush = () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        tick(performance.now());
        last = 0;
    };

    // Đo lại + vẽ lại (gom nhiều sự kiện vào 1 lần)
    const remeasure = () => { measure(); request(); };
    const settle = () => { clearTimeout(settleT); settleT = setTimeout(remeasure, 60); };

    // iOS: thanh địa chỉ co/giãn làm innerHeight đổi vài chục px → chỉ coi là resize thật khi đổi chiều ngang hoặc lệch > 160px
    const onResize = () => {
        if (window.innerWidth !== vw || Math.abs(window.innerHeight - vh) > 160) {
            vw = window.innerWidth; vh = window.innerHeight;
            pin = calcPin();
            applyPin();
            readCal = null;
            if (stickyState > 0) stickyState = 0;      // kiểm tra + hiệu chỉnh lại sau khi đổi kích thước
            items.forEach(i => { i.chk = null; });
            measure();
        }
        request();
    };

    return {
        mode() { return stickyState > 0 ? 'sticky' : stickyState === 0 ? 'checking' : 'js'; },
        refresh() {
            const c = document.getElementById('timeline-container');

            if (!bound) {
                bound = true;
                setMode();
                window.addEventListener('scroll', request, { passive: true, capture: true });
                window.addEventListener('resize', onResize, { passive: true });
                window.addEventListener('orientationchange', () => setTimeout(onResize, 300), { passive: true });
                new MutationObserver(request).observe(document.documentElement, {
                    attributes: true, attributeFilter: ['data-animation-on']
                });
                // icon font load xong có thể làm đổi chiều cao → đo lại
                if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure).catch(() => {});
            }

            // gắn listener cho container hiện tại (an toàn nếu container bị thay)
            if (c && c !== roEl) {
                roEl = c;
                if (ro) ro.disconnect();
                if (window.ResizeObserver) { ro = new ResizeObserver(remeasure); ro.observe(c); }
                c.addEventListener('animationend', settle, true);
                c.addEventListener('transitionend', (e) => {
                    if (e.target && e.target.classList && e.target.classList.contains('tl-item')) settle();
                }, true);
            }

            // Đo + dựng ray + đặt hiệu ứng NGAY trong lần đầu (đồng bộ)
            lastCTop = null;
            measure();
            flush();

            // Đo lại sau khi layout ổn định; nếu lệch thì snap thẳng chứ không glide
            requestAnimationFrame(() => requestAnimationFrame(remeasure));
            clearTimeout(settleT);
            settleT = setTimeout(remeasure, 600);   // lưới an toàn cuối
        }
    };
})();

const renderTimeline = () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip.days.find(d => d.date === state.activeDayDate);
            const container = document.getElementById('timeline-container');
            const tlKey = trip.id + '|' + state.activeDayDate;
            const tlSnap = TL_DELETE_FX.snapshot(container, tlKey);
            
            // 1. TRƯỜNG HỢP NGÀY TRỐNG (THÊM NÚT XÓA NGÀY)
            if (!day || day.activities.length === 0) {
    container.innerHTML = tlEmptyHtml(state.activeDayDate);
    TL_DELETE_FX.playLast(container, tlSnap, tlKey);
    return;
}

            let html = '';
            let dailyTotalVND = 0; 
            const rates = typeof exchangeRates !== 'undefined' ? exchangeRates : { VND: 1, THB: 720, JPY: 170, KRW: 18.5, USD: 25000, EUR: 27500 };

            day.activities.forEach((act, index) => {
                const rawStatus = getActivityStatus(act, day.date);
                const status = rawStatus && typeof rawStatus === 'object' ? { ...rawStatus, label: formatStatusLabel(rawStatus.label) } : rawStatus;
                const isDone = act.isCompleted;
                // Badge trạng thái: bỏ mọi animation (animate-pulse, animate-bounce, ...)
                const statusColor = String(status.color || '').replace(/(^|\s)animate-\S+/g, ' ').trim();

                if(act.budgetAmt && !isNaN(act.budgetAmt)) {
                    dailyTotalVND += parseFloat(act.budgetAmt) * (rates[act.budgetCur] || 1);
                }

                const iconClass = act.icon && act.icon.startsWith('fa-') ? act.icon : 'fa-location-crosshairs';
                const veh = tlVehicleFor(act, day.activities[index + 1]);
                const vTrails = (veh.key === 'air' ? ['left-[28%]', 'left-[68%]'] : ['left-[48%]'])
    .map(pos => `<span class="tl-vt absolute bottom-1/2 ${pos} w-[2px] rounded-full bg-slate-400/45 origin-bottom" style="height:${veh.key === 'air' ? 36 : 20}px;transform:scaleY(0);${TL_TRAIL_MASK}"></span>`).join('');
                const vShadow = veh.key === 'air'
                    ? `<span class="tl-vshadow absolute left-1/2 top-1/2 -ml-2.5 -mt-1 w-5 h-2.5 rounded-full bg-slate-900/25 blur-[3px]"></span>` : '';
                // ===== LỘ TRÌNH: khối kính nổi, không viền, không bóng =====
                let routeHtml = '';
                if (act.from && act.to) {
                    routeHtml = `
                    <div class="bg-slate-200/45 backdrop-blur-2xl rounded-[1.5rem] p-2 flex flex-col gap-2">
                        <div class="flex items-stretch gap-1.5">
                            <div class="flex-1 min-w-0 bg-gradient-to-br from-white to-white/70 backdrop-blur-2xl rounded-[1.1rem] p-3">
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Từ</div>
                                <div class="text-[13px] font-semibold text-slate-700 break-words leading-relaxed">${act.from}</div>
                            </div>
                            <div class="flex items-center flex-shrink-0 text-slate-400"><i class="fa-solid fa-arrow-right-long text-xs"></i></div>
                            <div class="flex-1 min-w-0 bg-gradient-to-br from-white to-white/70 backdrop-blur-2xl rounded-[1.1rem] p-3">
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Đến</div>
                                <div class="text-[13px] font-semibold text-slate-700 break-words leading-relaxed">${act.to}</div>
                            </div>
                        </div>
                        <button onclick="openGoogleMaps('${(act.from || '').replace(/'/g, "\\'")}', '${(act.to || '').replace(/'/g, "\\'")}')" class="w-full h-10 bg-blue-600/90 backdrop-blur-2xl hover:bg-blue-600 text-white rounded-[1rem] font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 px-3 touch-manipulation group">
                            <div class="w-6 h-6 flex-shrink-0 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <i class="fa-solid fa-map-location-dot text-white text-[10px]"></i>
                            </div>
                            <span class="truncate">Chỉ đường Google Maps</span>
                        </button>
                    </div>`;
                } else if (act.to || act.from) {
                    routeHtml = `<div class="bg-gradient-to-br from-white/95 to-white/65 backdrop-blur-2xl p-3.5 rounded-[1.25rem] text-[13px] font-semibold text-slate-700 break-words leading-relaxed"><i class="fa-solid fa-location-dot text-slate-400 mr-1.5"></i>${act.to || act.from}</div>`;
                }

                // ===== CÁC KHỐI NỘI DUNG: mỗi phần nổi khối riêng (liquid glass) =====
                const descHtml = act.desc ? `
                    <div class="bg-gradient-to-br from-white/95 to-white/65 backdrop-blur-2xl rounded-[1.25rem] p-3.5">
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="w-6 h-6 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-400 flex-shrink-0"><i class="fa-regular fa-comment-dots text-[11px]"></i></span>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi tiết</span>
                        </div>
                        <p class="text-[13px] text-slate-700 font-medium leading-relaxed break-words">${act.desc}</p>
                    </div>` : '';

                const guideHtml = act.guide ? `
                    <div class="bg-gradient-to-br from-blue-100/70 to-sky-50/40 backdrop-blur-2xl rounded-[1.25rem] p-3.5">
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="w-6 h-6 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-blue-500 flex-shrink-0"><i class="fa-solid fa-route text-[11px]"></i></span>
                            <span class="text-[10px] font-black text-blue-400 uppercase tracking-widest">Hướng dẫn</span>
                        </div>
                        <p class="text-[13px] text-blue-700 font-semibold leading-relaxed break-words">${act.guide}</p>
                    </div>` : '';

                const noteHtml = act.note ? `
                    <div class="bg-gradient-to-br from-amber-100/75 to-yellow-50/40 backdrop-blur-2xl rounded-[1.25rem] p-3.5">
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="w-6 h-6 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-amber-500 flex-shrink-0"><i class="fa-solid fa-star text-[11px]"></i></span>
                            <span class="text-[10px] font-black text-amber-500/80 uppercase tracking-widest">Lưu ý</span>
                        </div>
                        <p class="text-[13px] font-semibold text-amber-900 leading-relaxed break-words">${act.note}</p>
                    </div>` : '';

                // ===== GIÁ TIỀN: một dòng riêng, không bao giờ rớt dòng =====
                const budgetHtml = act.budgetAmt
                    ? `<div class="flex items-center">
                            <span class="inline-flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 text-[12px] font-extrabold text-emerald-900 bg-gradient-to-br from-emerald-100/85 to-emerald-50/50 backdrop-blur-xl px-3.5 py-1.5 rounded-full"><i class="fa-solid fa-sack-dollar text-emerald-600 text-[11px]"></i>${new Intl.NumberFormat('vi-VN').format(act.budgetAmt)} ${act.budgetCur}</span>
                       </div>`
                    : `<div class="text-[11px] text-slate-400 font-medium italic px-1">Không có chi phí</div>`;

                html += `
                    <div data-act-id="${act.id}" class="tl-item relative flex gap-3 md:gap-5 group mb-8 transition-opacity duration-300 ${isDone ? 'opacity-60 grayscale-[30%]' : 'opacity-100'}">
                        
                        <!-- Cột thời gian Desktop -->
                        <div class="tl-time w-16 flex-shrink-0 pt-4 text-right z-10 hidden md:block">
                            <div class="text-lg font-black ${isDone ? 'text-slate-400' : 'text-slate-800'} tracking-tight">${tlFmtTime(act.start, true)}</div>
                            <div class="text-[13px] text-slate-400 font-bold">${tlFmtTime(act.end, true)}</div>
                        </div>

                        <!-- Timeline Line & Node -->
                        <div class="relative flex flex-col items-center z-10 pt-1 px-1 md:px-0">
                            <div class="tl-node w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${isDone ? 'bg-white/60 backdrop-blur-md border border-white/80 text-slate-400' : 'bg-gradient-to-br from-blue-50 to-white border border-white text-blue-600'} z-10 relative ring-4 ring-slate-50/50">
                                <i class="fa-solid ${iconClass} ${isDone ? '' : 'scale-110'}"></i>
                            </div>
                           ${index < day.activities.length - 1 ? `
<div class="tl-line absolute top-10 bottom-[-32px] left-1/2 w-[2px] bg-slate-200/60 -translate-x-1/2 z-0 rounded-full">
    <div class="tl-fill absolute inset-0 rounded-full bg-slate-400/40 origin-top" style="transform:scaleY(0)"></div>
    <div class="tl-vehicle absolute left-1/2 top-0 -ml-3.5 -mt-3.5 w-7 h-7 pointer-events-none will-change-transform" data-v="${veh.key}" style="transform:translate3d(0,-14px,0);-webkit-backface-visibility:hidden;backface-visibility:hidden">
        <div class="tl-vhead relative w-7 h-7 will-change-transform">
            ${vTrails}
            <span class="tl-vbead absolute inset-0 rounded-full bg-white/75 flex items-center justify-center text-slate-600 will-change-transform">
                <i class="fa-solid ${veh.icon} text-[12px]" style="transform:rotate(${veh.rot}deg)"></i>
            </span>
        </div>
    </div>
</div>` : ''}
                        </div>

                        <!-- NỘI DUNG CỘT PHẢI -->
                        <div class="tl-body flex-1 min-w-0 pr-1 md:pr-0 pb-1">
                            
                            <!-- Thời gian hiển thị ở Mobile -->
                            <div class="md:hidden flex items-center gap-2 mb-2">
                                <span class="text-[15px] font-black text-slate-800 tracking-tight">${tlFmtTime(act.start)} - ${tlFmtTime(act.end)}</span>
                                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusColor}" style="animation:none;">${status.label}</span>
                            </div>

                            <!-- THẺ CHÍNH: kính lỏng, không viền, không bóng -->
                            <div class="tl-card bg-gradient-to-br from-slate-100 to-slate-100/70 backdrop-blur-3xl rounded-[1.75rem] shadow-[0_10px_32px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.04)] hover:shadow-[0_14px_40px_rgba(15,23,42,0.10),0_3px_8px_rgba(15,23,42,0.05)] flex flex-col p-2.5 md:p-3 gap-2.5 transition-all">
                                
                                <!-- Header: trạng thái, tiêu đề, nhãn, nút hoàn thành -->
                                <div class="px-2 pt-2 pb-1 flex justify-between items-start gap-3">
                                    <div class="flex-1 min-w-0">
                                        <div class="hidden md:flex items-center gap-2 mb-1.5">
                                            <span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md ${statusColor}" style="animation:none;">
                                                ${status.label}
                                            </span>
                                        </div>
                                        <h3 class="text-[17px] md:text-lg font-black leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-800'} break-words">${act.details}</h3>
                                        
                                        <div class="mt-2.5 flex flex-wrap items-center gap-2">
                                            <span class="text-[10px] font-extrabold text-slate-700 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-wider">
                                                ${act.type}
                                            </span>
                                            ${act.transport ? `
                                            <span class="text-[10px] font-extrabold text-blue-700 bg-blue-100/70 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                <i class="fa-solid fa-car-side text-blue-500 text-[9px]"></i>${act.transport}
                                            </span>` : ''}
                                        </div>
                                    </div>
                                    <button data-tl-check="${act.id}" data-done="${isDone ? '1' : '0'}" onclick="toggleComplete('${act.id}')" class="text-3xl flex-shrink-0 transition-transform active:scale-90 ${isDone ? 'text-blue-500 hover:text-slate-400' : 'text-slate-300 hover:text-blue-400'}"><i class="fa-solid ${isDone ? 'fa-circle-check' : 'fa-circle'}"></i></button>
                                </div>

                                ${descHtml}
                                ${guideHtml}
                                ${noteHtml}
                                ${routeHtml}

                                <!-- Chi phí (một dòng riêng, không bị nút đè) -->
                                <div class="px-1 pb-1">
                                    ${budgetHtml}
                                </div>
                            </div>

                            <!-- THANH NÚT: tách ra ngoài thẻ, góc dưới bên phải, nhỏ gọn -->
                            <div class="flex justify-end items-center gap-1.5 mt-2 pr-1.5">
                                <button onclick="duplicateActivity('${act.id}')" title="Duplicate" class="px-2.5 h-7 rounded-full bg-white/45 backdrop-blur-xl hover:bg-emerald-100/70 text-slate-400 hover:text-emerald-600 transition-all active:scale-95 flex items-center justify-center touch-manipulation">
                                    <span class="text-[8px] md:text-[9px] font-black uppercase tracking-widest">Duplicate</span>
                                </button>
                                <button onclick="editActivity('${act.id}')" title="Sửa" class="w-7 h-7 rounded-full bg-white/45 backdrop-blur-xl hover:bg-blue-100/70 text-slate-400 hover:text-blue-600 transition-all active:scale-95 flex items-center justify-center touch-manipulation"><i class="fa-solid fa-pen text-[10px]"></i></button>
                                <button onclick="deleteActivity('${act.id}')" title="Xóa" class="w-7 h-7 rounded-full bg-white/45 backdrop-blur-xl hover:bg-red-100/70 text-slate-400 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center touch-manipulation"><i class="fa-solid fa-trash text-[10px]"></i></button>
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
      <p class="tp-stamp__ver">TripPlanner 1.4.1</p>
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
            TL_DUP_FX.bind(container);
            TL_FX.enter(container, trip.id + '|' + state.activeDayDate);
            TL_DELETE_FX.play(container, tlSnap, tlKey);
            TL_DUP_FX.play(container, tlSnap);
            TL_VEHICLE_FX.refresh();
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

        // ===== MODAL XÁC NHẬN DÙNG CHUNG (Liquid Glass, không shadow, không border) =====
// Dùng được cho mọi chỗ đang dùng confirm(): deleteActivity, confirmDeleteDay, ...
const showConfirmModal = ({
    title = 'Xác nhận',
    message = '',
    highlight = '',            // tên mục đang xóa (hiện trong khối kính nhỏ)
    confirmText = 'Xóa',
    cancelText = 'Hủy',
    onConfirm = () => {}
} = {}) => {
    // Chỉ cho phép 1 modal tại một thời điểm
    const old = document.getElementById('glass-confirm-root');
    if (old) old.remove();

    const root = document.createElement('div');
    root.id = 'glass-confirm-root';
    root.setAttribute('data-html2canvas-ignore', '');
    root.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/20 backdrop-blur-md opacity-0 transition-opacity duration-300';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');

    root.innerHTML = `
        <div data-gc-panel class="w-full max-w-[22rem] bg-white/75 backdrop-blur-3xl rounded-[2rem] p-6 text-center scale-90 opacity-0 transition-all duration-300 ease-out">
            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center text-rose-500 mx-auto mb-4 text-2xl">
                <i class="fa-solid fa-trash-can"></i>
            </div>
            <h3 data-gc-title class="text-lg font-black text-slate-800 leading-snug"></h3>
            <p data-gc-message class="text-[13px] font-medium text-slate-500 leading-relaxed mt-1.5"></p>
            <div data-gc-highlight class="hidden mt-4 bg-gradient-to-br from-white to-white/60 backdrop-blur-xl rounded-[1.25rem] px-4 py-3 text-[13px] font-bold text-slate-700 break-words"></div>
            <div class="flex gap-2.5 mt-6">
                <button type="button" data-gc-cancel class="flex-1 h-12 rounded-[1.1rem] bg-slate-200/60 hover:bg-slate-200/90 backdrop-blur-xl text-slate-600 font-bold text-[13px] transition-all active:scale-95 touch-manipulation"></button>
                <button type="button" data-gc-ok class="flex-1 h-12 rounded-[1.1rem] bg-rose-500/90 hover:bg-rose-500 backdrop-blur-xl text-white font-bold text-[13px] transition-all active:scale-95 touch-manipulation"></button>
            </div>
        </div>
    `;

    // Nội dung động gán bằng textContent để tránh chèn HTML
    root.querySelector('[data-gc-title]').textContent = title;
    root.querySelector('[data-gc-message]').textContent = message;
    root.querySelector('[data-gc-cancel]').textContent = cancelText;
    root.querySelector('[data-gc-ok]').textContent = confirmText;
    if (highlight) {
        const h = root.querySelector('[data-gc-highlight]');
        h.textContent = highlight;
        h.classList.remove('hidden');
    }

    const panel = root.querySelector('[data-gc-panel]');
    let closed = false;

    const onKey = (e) => { if (e.key === 'Escape') close(); };

    const close = (cb) => {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKey);
        root.classList.add('opacity-0');
        panel.classList.add('scale-90', 'opacity-0');
        panel.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => {
            root.remove();
            if (typeof cb === 'function') cb();
        }, 220);
    };

    root.querySelector('[data-gc-cancel]').addEventListener('click', () => close());
    root.querySelector('[data-gc-ok]').addEventListener('click', () => close(onConfirm));
    // Bấm ra vùng nền để hủy
    root.addEventListener('click', (e) => { if (e.target === root) close(); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(root);

    // Animation mở
    requestAnimationFrame(() => {
        root.classList.remove('opacity-0');
        panel.classList.remove('scale-90', 'opacity-0');
        panel.classList.add('scale-100', 'opacity-100');
    });
};

// ===== deleteActivity: logic giữ nguyên, chỉ thay confirm() bằng modal =====
const deleteActivity = (actId) => {
    const trip0 = state.trips.find(t => t.id === state.activeTripId);
    const day0 = trip0 && trip0.days.find(d => d.date === state.activeDayDate);
    const target = day0 && day0.activities.find(a => a.id === actId);

    showConfirmModal({
        title: 'Xóa hoạt động này?',
        message: 'Hoạt động sẽ bị xóa khỏi lịch trình và không thể hoàn tác.',
        highlight: target ? target.details : '',
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        onConfirm: () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip.days.find(d => d.date === state.activeDayDate);
            day.activities = day.activities.filter(a => a.id !== actId);

            saveData();
            renderApp();
        }
    });
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

        // --- GLOBAL TIMELINE MODAL (Liquid Glass v12 - card nổi khối, check xong thì xẹp xuống) ---
        let gtObserver = null;
        let gtTodayObserver = null;

        // Trạng thái nút "Hôm nay" (giữ lại giữa các lần vẽ lại)
        let gtDrop = { hidden: true, above: false };
        let gtDropReady = false;

        // Chỏm nhọn nhỏ (24x6px) dán ở giữa cạnh trên / cạnh dưới của nút
        const GT_NUB_UP   = "path('M0 6 C6 6 8.5 3.2 12 0.4 C15.5 3.2 18 6 24 6 Z')";
        const GT_NUB_DOWN = "path('M0 0 C6 0 8.5 2.8 12 5.6 C15.5 2.8 18 0 24 0 Z')";

        // Đổ bóng nổi khối kiểu liquid glass (nhẹ, không gradient, không border)
        const GT_SHADOW_LIGHT =
            '0 1px 2px rgba(15,23,42,0.08), ' +
            '0 6px 12px -6px rgba(15,23,42,0.16), ' +
            'inset 0 2px 4px -1px rgba(255,255,255,0.9), ' +
            'inset 0 -3px 6px -2px rgba(15,23,42,0.08)';
        const GT_SHADOW_BTN =
            '0 1px 2px rgba(15,23,42,0.06), ' +
            '0 3px 6px -2px rgba(37,99,235,0.2), ' +
            'inset 0 2px 3px -1px rgba(255,255,255,0.8)';

        // Trạng thái XẸP (đã check xong): cùng số lớp bóng với trạng thái nổi để chuyển mượt
        // Bóng ngoài tắt hết, chỉ còn bóng lõm rất nhẹ ở mép trên => cảm giác thẻ bị ấn xuống
        const GT_SHADOW_LIGHT_FLAT =
            '0 0 0 0 rgba(15,23,42,0), ' +
            '0 0 0 0 rgba(15,23,42,0), ' +
            'inset 0 1px 3px -1px rgba(15,23,42,0.14), ' +
            'inset 0 0 0 0 rgba(255,255,255,0)';
        const GT_SHADOW_BTN_FLAT =
            '0 0 0 0 rgba(15,23,42,0), ' +
            '0 0 0 0 rgba(37,99,235,0), ' +
            'inset 0 1px 2px -1px rgba(37,99,235,0.18)';

        // Bóng cho header ngày và nút "Hôm nay"
        const GT_SHADOW_PILL_BLUE =
            '0 1px 2px rgba(15,23,42,0.06), ' +
            '0 4px 8px -3px rgba(37,99,235,0.3), ' +
            'inset 0 2px 3px -1px rgba(255,255,255,0.6), ' +
            'inset 0 -2px 4px -2px rgba(30,64,175,0.2)';
        const GT_SHADOW_PILL_INDIGO =
            '0 1px 2px rgba(15,23,42,0.06), ' +
            '0 4px 8px -3px rgba(79,70,229,0.28), ' +
            'inset 0 2px 3px -1px rgba(255,255,255,0.7), ' +
            'inset 0 -2px 4px -2px rgba(55,48,163,0.15)';
        const GT_SHADOW_TODAYBTN =
            '0 1px 2px rgba(15,23,42,0.06), ' +
            '0 4px 8px -3px rgba(37,99,235,0.3), ' +
            'inset 0 2px 3px -1px rgba(255,255,255,0.7), ' +
            'inset 0 -2px 4px -2px rgba(30,64,175,0.18)';

        // Hiệu ứng nổi <-> xẹp
        const GT_PRESS_TRANSITION = 'box-shadow 300ms ease, transform 300ms ease';
        const GT_PRESS_SCALE = 'scale(0.985)';

        // Chọn bóng theo loại phần tử (panel / btn) và trạng thái hoàn thành
        const gtShadow = (kind, done) => {
            if (kind === 'btn') return done ? GT_SHADOW_BTN_FLAT : GT_SHADOW_BTN;
            return done ? GT_SHADOW_LIGHT_FLAT : GT_SHADOW_LIGHT;
        };

        // Chế độ animation: full = bật | has=false = không có gsap
        // Đọc từ html[data-animation-on] (Settings). Thiếu thuộc tính thì coi như bật.
        const gtAnimMode = () => {
            const has = !!window.gsap;
            let full = has;
            try {
                if (document.documentElement.getAttribute('data-animation-on') === 'false') full = false;
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) full = false;
            } catch (e) {}
            return { has, full };
        };

        // Áp trạng thái nổi / xẹp lên các mảnh kính và nút trong một card
        const gtApplyDone = (card, done) => {
            const animated = gtAnimMode().full;
            card.querySelectorAll('[data-gt-press]').forEach(el => {
                el.style.transition = animated ? GT_PRESS_TRANSITION : 'none';
                el.style.boxShadow = gtShadow(el.dataset.gtPress, done);
                el.style.transform = done ? GT_PRESS_SCALE : 'scale(1)';
            });
        };

        // Tìm khung cuộn thật sự chứa nội dung modal
        const gtScrollParent = (el) => {
            let p = el;
            while (p) {
                const oy = getComputedStyle(p).overflowY;
                if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
                p = p.parentElement;
            }
            return null;
        };

        // Áp trạng thái (ẩn/hiện + chỏm nhọn lên/xuống) lên nút "Hôm nay"
        const gtApplyDrop = (btn) => {
            const above = gtDrop.above;
            const nub = btn.querySelector('[data-gt-nub]');
            if (nub) {
                const clip = above ? GT_NUB_UP : GT_NUB_DOWN;
                nub.style.clipPath = clip;
                nub.style.webkitClipPath = clip;
                nub.style.top = above ? '-6px' : 'auto';
                nub.style.bottom = above ? 'auto' : '-6px';
            }
            btn.style.pointerEvents = gtDrop.hidden ? 'none' : 'auto';
            btn.classList.toggle('opacity-0', gtDrop.hidden);
            btn.classList.toggle('translate-y-2', gtDrop.hidden && gtAnimMode().full);
        };

        // Tính lại: đang xem ngày hôm nay thì ẩn; ngày hôm nay ở trên -> chỏm nhọn lên, ở dưới -> chỏm nhọn xuống
        const gtRefreshDrop = () => {
            const content = document.getElementById('global-timeline-content');
            if (!content) return;
            const day = content.querySelector('[data-gt-today]');
            const btn = content.querySelector('[data-gt-today-btn]');
            if (!day || !btn) return;
            const sc = gtScrollParent(content) || gtModal;
            const sr = sc.getBoundingClientRect();
            const dr = day.getBoundingClientRect();
            const visible = dr.bottom > sr.top && dr.top < sr.bottom;
            gtDrop.hidden = visible;
            if (!visible) gtDrop.above = dr.top < sr.top;
            gtApplyDrop(btn);
        };

        // Cuộn tới ngày hiện tại trong modal Toàn cảnh
        const gtScrollToToday = (smooth = true) => {
            const content = document.getElementById('global-timeline-content');
            if (!content) return;
            const el = content.querySelector('[data-gt-today]');
            if (el) {
                el.scrollIntoView({ behavior: (smooth && gtAnimMode().full) ? 'smooth' : 'auto', block: 'start' });
            } else {
                const sp = gtScrollParent(content);
                if (sp) sp.scrollTop = 0;
            }
        };

        // Mở modal: tự cuộn tới ngày hiện tại (nếu chuyến đi có hôm nay)
        const openGlobalTimeline = () => {
            renderGlobalTimeline();
            gtModal.classList.add('active');
            requestAnimationFrame(() => requestAnimationFrame(() => gtScrollToToday(false)));
        };

        // Đóng modal Toàn cảnh (ưu tiên hàm đóng có sẵn của bạn)
        const closeGlobalTimelineSafe = () => {
            if (typeof closeGlobalTimeline === 'function') closeGlobalTimeline();
            else if (typeof gtModal !== 'undefined') gtModal.classList.remove('active');
        };

        // Nhảy từ modal Toàn cảnh sang đúng hoạt động ở timeline chính
        const goToActivityFromGlobal = (actId, dayDate) => {
            closeGlobalTimelineSafe();

            if (state.activeDayDate !== dayDate) {
                state.activeDayDate = dayDate;
                if (typeof renderDays === 'function') renderDays(); // <-- đổi đúng tên hàm vẽ thanh chọn ngày của bạn
            }
            renderTimeline();

            let tries = 0;
            const seek = () => {
                const checkBtn = document.querySelector(`#timeline-container [data-tl-check="${actId}"]`);
                const item = checkBtn ? checkBtn.closest('.tl-item') : null;
                if (!item) { if (tries++ < 20) setTimeout(seek, 50); return; }

                const m = gtAnimMode();
                item.scrollIntoView({ behavior: m.full ? 'smooth' : 'auto', block: 'center' });

                // Chỉ MỘT hiệu ứng đơn giản: viền xanh sáng lên rồi mờ dần (không lặp, không phóng to)
                const card = item.querySelector('.tl-card');
                if (card && m.has) {
                    gsap.fromTo(card,
                        { boxShadow: '0 0 0 4px rgba(0,113,227,0.5)' },
                        { boxShadow: '0 0 0 0px rgba(0,113,227,0)', duration: 0.8, ease: 'power1.out', clearProps: 'boxShadow' });
                }
            };
            setTimeout(seek, 350);
        };

        // Cập nhật TẠI CHỖ đúng hoạt động vừa tick (không vẽ lại cả modal => không nháy, không giật)
        const gtPatchActivity = (actId, dayDate) => {
            const content = document.getElementById('global-timeline-content');
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip && trip.days.find(d => d.date === dayDate);
            const act = day && day.activities.find(a => String(a.id) === String(actId));
            const card = content && [...content.querySelectorAll('[data-gt-card-id]')].find(c => c.dataset.gtCardId === String(actId));
            if (!act || !card) return false;

            const done = !!act.isCompleted;

            // Mờ nhẹ cả thẻ khi đã hoàn thành
            card.classList.add('transition-opacity', 'duration-300');
            card.classList.toggle('opacity-70', done);

            // Xong thì xẹp xuống, bỏ check thì nổi lên lại
            gtApplyDone(card, done);

            // Tên hoạt động: gạch ngang + xám khi xong
            const title = card.querySelector('[data-gt-title]');
            if (title) {
                title.classList.toggle('line-through', done);
                title.classList.toggle('text-slate-400', done);
                title.classList.toggle('text-slate-800', !done);
            }

            // Nút tick
            const btn = card.querySelector('[data-gt-check]');
            if (btn) {
                btn.classList.toggle('text-blue-500', done);
                btn.classList.toggle('text-slate-300', !done);
                btn.classList.toggle('hover:text-blue-400', !done);
                const ic = btn.querySelector('i');
                if (ic) { ic.classList.toggle('fa-circle-check', done); ic.classList.toggle('fa-circle', !done); }
            }

            // Chip trạng thái XONG / SẮP / TRỄ
            const chip = card.querySelector('[data-gt-chip]');
            if (chip) {
                const st = getActivityStatus(act, day.date);
                const cc = (st.color || '').split(' ')[0];
                if (window.gsap) { gsap.killTweensOf(chip); gsap.set(chip, { clearProps: 'opacity' }); }
                if (chip.dataset.cc) chip.classList.remove(chip.dataset.cc);
                if (cc) chip.classList.add(cc);
                chip.dataset.cc = cc;
                chip.dataset.st = st.type;
                chip.textContent = st.type === 'done' ? 'XONG' : (st.type === 'future' ? 'SẮP' : 'TRỄ');
            }
            return true;
        };

        // Tick hoàn thành ngay trong modal Toàn cảnh (dùng lại toggleComplete có sẵn)
        const toggleCompleteFromGlobal = (actId, dayDate) => {
            const prevDay = state.activeDayDate;
            // toggleComplete có thể chỉ xét ngày đang chọn -> tạm đặt đúng ngày rồi trả lại
            state.activeDayDate = dayDate;
            try { toggleComplete(actId); }
            catch (e) { console.error(e); }
            finally { state.activeDayDate = prevDay; }

            // Nếu vừa tạm đổi ngày thì đồng bộ lại timeline chính về ngày đang chọn
            if (prevDay !== dayDate) { try { renderTimeline(); } catch (e) {} }

            // Chỉ vá đúng hoạt động đó; nếu không vá được mới vẽ lại tại chỗ
            if (!gtPatchActivity(actId, dayDate)) renderGlobalTimeline({ silent: true });

            // Hiệu ứng bật nhẹ, ngắn cho nút vừa tick (chỉ khi bật animation)
            if (gtAnimMode().full) {
                const content = document.getElementById('global-timeline-content');
                const nb = [...content.querySelectorAll('[data-gt-check]')].find(b => b.dataset.gtCheck === String(actId));
                const ic = nb && nb.querySelector('i');
                if (ic) gsap.fromTo(ic, { scale: 0.7 }, { scale: 1, duration: 0.25, ease: 'power2.out', clearProps: 'transform' });
            }
        };

        const renderGlobalTimeline = (opts = {}) => {
            // Vẽ khi modal đang mở = vẽ tại chỗ (giữ vị trí cuộn, không chạy lại animation vào)
            const isOpen = typeof gtModal !== 'undefined' && gtModal.classList.contains('active');
            const silent = !!opts.silent || isOpen;
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const content = document.getElementById('global-timeline-content');

            // Giữ vị trí cuộn khi vẽ lại tại chỗ
            const scroller = silent ? gtScrollParent(content) : null;
            const keepTop = scroller ? scroller.scrollTop : 0;

            // Dọn animation / observer của lần render trước
            if (gtObserver) { gtObserver.disconnect(); gtObserver = null; }
            if (gtTodayObserver) { gtTodayObserver.disconnect(); gtTodayObserver = null; }
            if (window.gsap) gsap.killTweensOf(content.querySelectorAll('*'));

            // Vẽ lại tại chỗ: giữ nguyên chính node nút "Hôm nay" (không tạo lại => không nháy)
            const oldWrap = silent ? content.querySelector('[data-gt-today-wrap]') : null;
            if (oldWrap) oldWrap.remove();

            const m = gtAnimMode();
            const animOn = m.full;                         // animation đầy đủ (dùng cho transition nút "Hôm nay")
            const intro = m.has && !silent;                // có hiệu ứng vào ở lần mở đầu
            const hide = '';
            const fmtMoney = (n) => new Intl.NumberFormat('vi-VN').format(n);

            // Mở modal mới: nút "Hôm nay" bắt đầu ở trạng thái ẩn, chỉ cập nhật sau khi đã cuộn tới hôm nay
            if (!silent) {
                gtDrop = { hidden: true, above: false };
                gtDropReady = false;
                requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
                    gtDropReady = true;
                    gtRefreshDrop();
                })));
            }

            // Ngày hôm nay (định dạng YYYY-MM-DD theo giờ máy)
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let hasToday = false;

            let html = '<div class="h-2 md:h-3 w-full flex-shrink-0"></div>';

            trip.days.forEach((day, idx) => {
                const isToday = String(day.date).slice(0, 10) === todayStr;
                if (isToday) hasToday = true;

                // Header ngày: mỏng, tinh tế. Hôm nay = kính xanh dương / ngày thường = kính indigo nhạt
                const pillHtml = isToday ? `
                    <div data-gt-pill data-gt-today-pill ${hide} style="box-shadow:${GT_SHADOW_PILL_BLUE}" class="relative inline-flex items-center gap-2 max-w-full h-8 pl-1 pr-1.5 rounded-full bg-blue-500/75 backdrop-blur-2xl backdrop-saturate-200 pointer-events-auto">
                        <span class="absolute left-3 top-[2px] w-9 h-[4px] rounded-full bg-white/45 blur-[1.5px] pointer-events-none"></span>
                        <span class="relative w-6 h-6 flex-shrink-0 rounded-full bg-white/85 flex items-center justify-center text-blue-600">
                            <i class="fa-solid fa-calendar-day text-[11px]"></i>
                        </span>
                        <span class="relative font-extrabold text-white text-[13px] tracking-wide whitespace-nowrap">Ngày ${idx + 1}</span>
                        <span class="relative text-white/80 font-semibold text-[11.5px] whitespace-nowrap">${formatDisplayDate(day.date)}</span>
                        <span class="relative flex-shrink-0 bg-white/85 text-blue-600 text-[9.5px] font-black uppercase tracking-wider px-2 py-[5px] rounded-full leading-none">Hôm nay</span>
                    </div>` : `
                    <div data-gt-pill ${hide} style="box-shadow:${GT_SHADOW_PILL_INDIGO}" class="relative inline-flex items-center gap-2 h-8 pl-1 pr-3.5 rounded-full bg-indigo-500/[0.24] backdrop-blur-2xl backdrop-saturate-200 pointer-events-auto">
                        <span class="absolute left-3 top-[2px] w-9 h-[4px] rounded-full bg-white/60 blur-[1.5px] pointer-events-none"></span>
                        <span class="relative w-6 h-6 flex-shrink-0 rounded-full bg-white/80 flex items-center justify-center text-indigo-600">
                            <i class="fa-solid fa-calendar-day text-[11px]"></i>
                        </span>
                        <span class="relative font-extrabold text-indigo-950 text-[13px] tracking-wide whitespace-nowrap">Ngày ${idx + 1}</span>
                        <span class="relative w-[3px] h-[3px] rounded-full bg-indigo-600/50"></span>
                        <span class="relative text-indigo-800 font-semibold text-[11.5px] whitespace-nowrap">${formatDisplayDate(day.date)}</span>
                    </div>`;

                // Tông kính của hai mảnh
                // Ngày hôm nay: ngả xanh dương nhạt (chữ giờ đậm như ngày thường)
                // Ngày thường: xám đậm hơn một chút để nổi trên nền trắng
                const leftBg = isToday ? 'bg-blue-500/[0.16]' : 'bg-slate-500/[0.18]';
                const rightBg = isToday ? 'bg-blue-500/[0.09]' : 'bg-slate-500/[0.13]';
                const timeCls = 'text-slate-800';

                html += `
                <div data-gt-day="${day.date}" ${isToday ? 'data-gt-today' : ''} class="mb-6 md:mb-8 relative group">

                    <!-- Header ngày: liquid glass, căn trái -->
                    <div class="sticky top-2 md:top-3 z-30 flex justify-start mb-4 md:mb-5 md:px-2 pointer-events-none">
                        ${pillHtml}
                    </div>

                    <div class="space-y-3.5 relative z-10 md:px-2">
                `;

                if (day.activities.length === 0) {
                    html += `
                    <div data-gt-card>
                        <p data-gt-panel ${hide} style="box-shadow:${GT_SHADOW_LIGHT}" class="text-[13px] text-slate-500 italic font-medium p-5 ${rightBg} backdrop-blur-md rounded-[1.5rem] text-center">Chưa có hoạt động nào được lên lịch.</p>
                    </div>`;
                } else {
                    day.activities.forEach(act => {
                        const status = getActivityStatus(act, day.date);
                        const colorCls = (status.color || '').split(' ')[0];

                        // Trạng thái nổi / xẹp ban đầu theo việc đã hoàn thành hay chưa
                        const doneNow = !!act.isCompleted;
                        const pressStyle = (kind) =>
                            `box-shadow:${gtShadow(kind, doneNow)};transform:${doneNow ? GT_PRESS_SCALE : 'scale(1)'};transition:${animOn ? GT_PRESS_TRANSITION : 'none'}`;

                        // Lộ trình
                        let routeTxt = '';
                        if (act.from && act.to) routeTxt = `${act.from} ➔ ${act.to}`;
                        else if (act.to || act.from) routeTxt = act.to || act.from;

                        // Ngân sách: hàng riêng, không bao giờ làm rớt dòng các phần khác
                        let budgetHtml = '';
                        if (act.budgetAmt) {
                            budgetHtml = `
                            <div class="mt-2.5 flex min-w-0">
                                <div data-gt-money title="${fmtMoney(act.budgetAmt)} ${act.budgetCur}" class="max-w-full min-w-0 inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700">
                                    <i data-gt-coin class="fa-solid fa-sack-dollar inline-block flex-shrink-0 text-[12px]"></i>
                                    <span class="min-w-0 truncate text-[12px] font-black tabular-nums leading-none">${fmtMoney(act.budgetAmt)}</span>
                                    <span class="flex-shrink-0 text-[10px] font-extrabold opacity-70 leading-none">${act.budgetCur}</span>
                                </div>
                            </div>`;
                        }

                        // Tags (Loại và Phương tiện)
                        let extraTagsHtml = '';
                        if (act.type) {
                            extraTagsHtml += `<span class="text-[10px] font-bold text-slate-600 bg-slate-500/10 px-2 py-1.5 rounded-lg">${act.type}</span>`;
                        }
                        if (act.transport) {
                            extraTagsHtml += `<span class="text-[10px] font-bold text-slate-600 bg-slate-500/10 px-2 py-1.5 rounded-lg"><i class="fa-solid fa-car-side mr-1"></i>${act.transport}</span>`;
                        }

                        html += `
                        <!-- Hoạt động: 2 mảnh kính tách rời, nổi khối (trái: giờ / phải: nội dung). Đã XONG thì xẹp xuống + mờ nhẹ -->
                        <div data-gt-card data-gt-card-id="${act.id}" class="flex items-stretch gap-2.5 touch-manipulation transition-opacity duration-300 ${act.isCompleted ? 'opacity-70' : ''}">

                            <!-- Mảnh kính TRÁI -->
                            <div data-gt-panel data-gt-press="panel" ${hide} style="${pressStyle('panel')}" class="flex-shrink-0 w-[3.9rem] md:w-[4.75rem] flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-[1.4rem] backdrop-blur-md ${leftBg}">
                                <div class="text-[13px] md:text-[15px] font-black ${timeCls} leading-none">${act.start}</div>
                                <div data-gt-chip data-st="${status.type}" data-cc="${colorCls}" class="text-[8px] md:text-[9px] font-black uppercase ${colorCls} bg-white/70 px-1.5 py-1 rounded-md tracking-wider">${status.type === 'done' ? 'XONG' : (status.type === 'future' ? 'SẮP' : 'TRỄ')}</div>
                            </div>

                            <!-- Mảnh kính PHẢI -->
                            <div data-gt-panel data-gt-press="panel" ${hide} style="${pressStyle('panel')}" class="flex-1 min-w-0 p-3.5 md:p-4 rounded-[1.4rem] backdrop-blur-md ${rightBg}">

                                <!-- Tên hoạt động + nút tick hoàn thành -->
                                <div class="flex items-start justify-between gap-2">
                                    <div data-gt-title class="flex-1 min-w-0 text-[14px] md:text-base font-bold break-words leading-snug ${act.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}">${act.details}</div>
                                    <button type="button" data-gt-check="${act.id}" onclick="toggleCompleteFromGlobal('${act.id}', '${day.date}')" aria-label="Đánh dấu hoàn thành" class="flex-shrink-0 -mt-0.5 text-2xl leading-none transition-transform active:scale-90 touch-manipulation ${act.isCompleted ? 'text-blue-500' : 'text-slate-300 hover:text-blue-400'}"><i class="fa-solid ${act.isCompleted ? 'fa-circle-check' : 'fa-circle'} inline-block"></i></button>
                                </div>

                                ${routeTxt ? `
                                <div class="text-[11px] md:text-xs font-semibold text-blue-600 mt-2 break-words bg-blue-500/10 inline-block px-2.5 py-1.5 rounded-lg max-w-full">
                                    <i class="fa-solid fa-location-arrow mr-1.5 opacity-80"></i>${routeTxt}
                                </div>` : ''}

                                ${budgetHtml}

                                ${extraTagsHtml ? `<div class="mt-2 flex flex-wrap items-center gap-1.5">${extraTagsHtml}</div>` : ''}

                                <!-- Nút xem hoạt động này (nhảy sang timeline chính) -->
                                <div class="mt-3 flex justify-end">
                                    <button type="button" data-gt-press="btn" onclick="goToActivityFromGlobal('${act.id}', '${day.date}')" style="${pressStyle('btn')}" class="h-8 pl-1.5 pr-3.5 rounded-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 text-[11px] font-black tracking-wide active:scale-95 flex items-center gap-2 touch-manipulation">
                                        <span class="w-5 h-5 flex-shrink-0 rounded-full bg-white/70 flex items-center justify-center"><i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i></span>
                                        <span class="truncate">Xem hoạt động này</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        `;
                    });
                }
                html += `</div></div>`;
            });

            // Chừa chỗ cuối danh sách + nút "Hôm nay" ở góc dưới bên phải (chỉ có khi chuyến đi có ngày hôm nay)
            html += `<div class="h-16 w-full flex-shrink-0"></div>`;
            if (hasToday) {
                html += `
                <div data-gt-today-wrap class="sticky bottom-3 z-40 h-0 pointer-events-none">
                    <div class="absolute bottom-0 right-2 md:right-4 pointer-events-none">
                        <!-- Nút viên thuốc gọn: blur chỉ áp lên phần thân bo tròn; chỏm nhọn là phần tử riêng -->
                        <button type="button" data-gt-today-btn onclick="gtScrollToToday(true)" aria-label="Đến ngày hôm nay" style="box-shadow:${GT_SHADOW_TODAYBTN}" class="relative ${animOn ? 'transition-all duration-500 ease-out' : 'transition-opacity duration-150'} h-[34px] px-4 rounded-full flex items-center justify-center text-blue-950 text-[12px] font-black tracking-wide whitespace-nowrap bg-blue-400/40 backdrop-blur-2xl backdrop-saturate-200 active:scale-95 touch-manipulation">
                            <span data-gt-nub class="absolute left-1/2 -ml-3 w-6 h-[6px] bg-blue-400/40 pointer-events-none"></span>
                            <span class="absolute left-3 top-[3px] w-[30px] h-[6px] rounded-full bg-white/60 blur-[2px] pointer-events-none"></span>
                            <span class="relative">Hôm nay</span>
                        </button>
                    </div>
                </div>`;
            }

            content.innerHTML = html;

            // Trả lại đúng node nút cũ (nếu vẽ lại tại chỗ)
            if (oldWrap) {
                const nw = content.querySelector('[data-gt-today-wrap]');
                if (nw) nw.replaceWith(oldWrap);
            }
            if (scroller) scroller.scrollTop = keepTop;

            // Áp trạng thái đã lưu cho nút
            const todayBtn = content.querySelector('[data-gt-today-btn]');
            if (todayBtn) gtApplyDrop(todayBtn);

            // Theo dõi ngày hôm nay vào/ra khỏi khung nhìn để đổi hướng chỏm nhọn
            try {
                const todayDay = content.querySelector('[data-gt-today]');
                if (todayDay && todayBtn) {
                    gtTodayObserver = new IntersectionObserver(() => { if (gtDropReady) gtRefreshDrop(); }, { threshold: 0 });
                    gtTodayObserver.observe(todayDay);
                }
            } catch (err) {}

            // ====== ANIMATION (nhẹ: mỗi thẻ chỉ trượt + mờ 1 lần, không lặp) ======
            try {
                if (!m.has) return;

                // Vẽ lại tại chỗ thì không chạy lại animation vào
                if (!intro) return;

                const playCards = (cards) => {
                    const panels = [];
                    cards.forEach(c => c.querySelectorAll('[data-gt-panel]').forEach(p => panels.push(p)));
                    // Gom thành 2 tween cho cả lô thẻ (thay vì 5-8 tween / thẻ)
                    gsap.fromTo(cards, { y: 16 }, { y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.03, clearProps: 'transform' });
                    gsap.fromTo(panels, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'opacity' });
                };

                gtObserver = new IntersectionObserver((entries) => {
                    const cards = [];
                    entries.forEach(en => {
                        if (!en.isIntersecting) return;
                        gtObserver.unobserve(en.target);
                        if (en.target.hasAttribute('data-gt-pill')) {
                            gsap.fromTo(en.target, { opacity: 0, x: -12 },
                                { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out', clearProps: 'opacity,transform' });
                        } else {
                            cards.push(en.target);
                        }
                    });
                    if (cards.length) playCards(cards);
                }, { threshold: 0.12 });

                content.querySelectorAll('[data-gt-pill],[data-gt-card]').forEach(el => gtObserver.observe(el));
            } catch (err) {
                // Nếu animation lỗi: hiện nội dung bình thường
                content.querySelectorAll('[data-gt-pill],[data-gt-panel]').forEach(el => { el.style.opacity = 1; });
            }
        };
        const gtModal = document.getElementById('global-timeline-modal');
        const closeGlobalTimeline = () => gtModal.classList.remove('active');


        

        // --- CHẶN CUỘN LAN RA NỀN KHI MODAL TOÀN CẢNH ĐANG MỞ ---
        // Safari iOS không tôn trọng overscroll-behavior hoàn toàn, nên chặn thêm bằng JS.
        // Phải đặt SAU dòng khai báo gtModal ở trên.
        /* =====================================================================
   1) Hàm dùng chung: chặn cuộn lọt ra nền cho bất kỳ modal nào
      modal   = lớp overlay phủ toàn màn hình (có class 'active' khi mở)
      content = vùng DUY NHẤT được phép cuộn bên trong modal
   ===================================================================== */


   (function () {
    var area  = document.getElementById('bulk-scroll-area');
    var box   = document.getElementById('bulk-forms-container');
    var empty = document.getElementById('bulk-empty');
    if (!area || !box || !empty) return;

    var timer = null;
    function sync() {
        clearTimeout(timer);
        if (box.children.length > 0) {
            empty.classList.remove('is-show');
            area.classList.remove('is-empty');
        } else {
            timer = setTimeout(function () {
                if (box.children.length === 0) {
                    empty.classList.add('is-show');
                    area.classList.add('is-empty');
                }
            }, 120);
        }
    }
    new MutationObserver(sync).observe(box, { childList: true });
})();


function trapModalScroll(modal, content) {
    if (!modal || !content) return;

    const isActive = () => modal.classList.contains('active');

    // delta > 0: định cuộn xuống, delta < 0: định cuộn lên
    // Trả về true nếu cú cuộn này sẽ "tràn" ra ngoài nội dung modal
    const wouldChain = (delta) => {
        const max = content.scrollHeight - content.clientHeight;
        if (max <= 0) return true;                                  // nội dung không đủ dài để cuộn
        if (delta < 0 && content.scrollTop <= 0) return true;      // đang ở đỉnh mà còn kéo lên
        if (delta > 0 && content.scrollTop >= max - 1) return true; // đang ở đáy mà còn kéo xuống
        return false;
    };

    // Chuột / touchpad
    modal.addEventListener('wheel', (e) => {
        if (!isActive()) return;
        if (!content.contains(e.target) || wouldChain(e.deltaY)) e.preventDefault();
    }, { passive: false });

    // Cảm ứng (iPhone / Android)
    let lastY = 0;
    modal.addEventListener('touchstart', (e) => {
        if (e.touches.length) lastY = e.touches[0].clientY;
    }, { passive: true });

    modal.addEventListener('touchmove', (e) => {
        if (!isActive() || !e.touches.length) return;
        const y = e.touches[0].clientY;
        const delta = lastY - y;     // ngón tay vuốt lên => delta > 0 => cuộn xuống
        lastY = y;
        if (!content.contains(e.target) || wouldChain(delta)) {
            if (e.cancelable) e.preventDefault();
        }
    }, { passive: false });
}

/* =====================================================================
   2) Modal Toàn cảnh: giữ nguyên phần đổi style cũ, chỉ thay đoạn
      chặn cuộn bằng một dòng gọi hàm dùng chung
   ===================================================================== */
(() => {
    const content = document.getElementById('global-timeline-content');
    if (!gtModal || !content) return;

    // Nền modal: trắng blur dịu dàng, không viền
    const mc = gtModal.querySelector('.modal-content');
    if (mc) {
        mc.classList.remove('bg-slate-200', 'bg-white', 'md:ring-1', 'md:ring-slate-200');
        mc.classList.add('bg-white/70', 'backdrop-blur-2xl', 'backdrop-saturate-150');
        // Thanh header: trắng mờ nhẹ, hòa với nền
        const hdr = mc.querySelector(':scope > div:first-child > div');
        if (hdr) {
            hdr.classList.remove('bg-white/50', 'bg-slate-100');
            hdr.classList.add('bg-white/60', 'backdrop-blur-xl');
        }
    }

    trapModalScroll(gtModal, content);
})();

/* =====================================================================
   3) Modal Hoạt động: dùng lại đúng hàm trên
   ===================================================================== */
trapModalScroll(
    document.getElementById('activity-modal'),
    document.getElementById('activity-form')
);

trapModalScroll(
    document.getElementById('bulk-add-modal'),
    document.getElementById('bulk-scroll-area')
);

   trapModalScroll(
       document.getElementById('trip-modal'),
       document.getElementById('trip-scroll-area')
   );

   trapModalScroll(
    document.getElementById('checklist-modal'),
    document.getElementById('checklist-container')
);

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

        newAct.id = 'act_' + Date.now() + Math.random().toString(36).substr(2, 9);
        newAct.isCompleted = false;

        if (changeTime) {
            const newStart = document.getElementById('dup-new-start').value;
            const newEnd = document.getElementById('dup-new-end').value;
            if (newStart) newAct.start = newStart;
            if (newEnd) newAct.end = newEnd;
        }

        day.activities.push(newAct);
        day.activities.sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')));

        // Lưu NGAY sau khi đổi state, trước khi render
        try { saveData(); } catch (e) { console.error('saveData lỗi, dữ liệu KHÔNG được lưu!', e); }

        renderTimeline();
        closeDupModal();
    }
};

