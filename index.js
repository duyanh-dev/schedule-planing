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
                        onmousedown="startDayPress('${day.date}')" 
                        onmouseup="endDayPress()" 
                        onmouseleave="endDayPress()" 
                        ontouchstart="startDayPress('${day.date}')" 
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
                        <p class="text-slate-500 text-[13px] md:text-sm mt-2 font-medium">Bấm <strong class="text-blue-600">Thêm HĐ</strong> để lên kế hoạch cho ngày này.</p>
                        
                        <!-- Nút Xóa Ngày (Kính lỏng, xuất hiện khi ngày không có hoạt động) -->
                        <div class="mt-6 flex justify-center">
                            <button onclick="confirmDeleteDay('${day.date}')" class="px-5 py-2.5 bg-red-50/60 backdrop-blur-md border border-red-200/60 hover:bg-red-100 hover:border-red-300 text-red-500 rounded-xl text-[13px] font-bold transition-all shadow-[0_2px_10px_rgba(239,68,68,0.05)] active:scale-95 flex items-center gap-2 touch-manipulation">
                                <i class="fa-solid fa-trash-can"></i> Xóa ngày này
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
                        <button onclick="openGoogleMaps('${(act.from || '').replace(/'/g, "\\'")}', '${(act.to || '').replace(/'/g, "\\'")}')" class="w-full py-2.5 bg-blue-600/85 backdrop-blur-2xl border border-blue-400/70 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 mt-2 shadow-[inset_0_2px_5px_rgba(255,255,255,0.4),inset_0_-3px_5px_rgba(0,0,0,0.15)]">
    <i class="fa-solid fa-map-location-dot mr-1.5 text-blue-200 drop-shadow-sm"></i> Chỉ đường Google Maps
</button>
                    </div>`;
                } else if (act.to || act.from) {
                    routeHtml = `<div class="bg-white/50 backdrop-blur-md border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-2.5 rounded-xl text-[13px] font-semibold text-slate-700 break-words leading-relaxed"><i class="fa-solid fa-location-dot text-slate-400 mr-1.5"></i>${act.to || act.from}</div>`;
                }

                html += `
                    <div class="relative flex gap-3 md:gap-5 group mb-8 transition-opacity duration-300 ${isDone ? 'opacity-60 grayscale-[30%]' : 'opacity-100'}">
                        
                        <!-- Cột thời gian Desktop -->
                        <div class="w-16 flex-shrink-0 pt-4 text-right z-10 hidden md:block">
                            <div class="text-lg font-black ${isDone ? 'text-slate-400' : 'text-slate-800'} tracking-tight">${act.start}</div>
                            <div class="text-[13px] text-slate-400 font-bold">${act.end}</div>
                        </div>

                        <!-- Timeline Line & Node (Nổi khối 3D) -->
                        <div class="relative flex flex-col items-center z-10 pt-1 px-1 md:px-0">
                            <div class="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${isDone ? 'bg-white/60 backdrop-blur-md border border-white/80 text-slate-400' : 'bg-gradient-to-br from-blue-50 to-white border border-white text-blue-600'} z-10 relative ring-4 ring-slate-50/50">
                                <i class="fa-solid ${iconClass} ${isDone ? '' : 'scale-110'}"></i>
                            </div>
                            ${index < day.activities.length - 1 ? `<div class="absolute top-10 bottom-[-32px] left-1/2 w-[2px] bg-slate-200/60 -translate-x-1/2 z-0 rounded-full"></div>` : ''}
                        </div>

                        <!-- TOÀN BỘ NỘI DUNG CỘT PHẢI -->
                        <div class="flex-1 min-w-0 pr-1 md:pr-0 pb-1">
                            
                            <!-- Thời gian hiển thị nổi bên ngoài ở Mobile -->
                            <div class="md:hidden flex items-center gap-2 mb-2">
                                <span class="text-[15px] font-black text-slate-800 tracking-tight">${act.start} - ${act.end}</span>
                                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${status.color}">${status.label}</span>
                            </div>

                            <div class="bg-white/60 backdrop-blur-3xl rounded-[1.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/80 flex flex-col overflow-hidden hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all">
                                
                                <div class="p-4 md:p-5 border-b border-white flex justify-between items-start gap-3 bg-white/40">
                                    <div class="flex-1 min-w-0">
                                        <div class="hidden md:flex items-center gap-2 mb-1.5">
                                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${status.color}">${status.label}</span>
                                        </div>
                                        <h3 class="text-[17px] md:text-lg font-black leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-800'} break-words">${act.details}</h3>
                                        
                                        <div class="mt-2.5 flex flex-wrap items-center gap-1.5">
                                            <span class="text-[9px] font-black text-slate-500 bg-slate-100/80 backdrop-blur-sm border border-slate-200/50 px-2 py-1 rounded uppercase shadow-sm">${act.type}</span>
                                            ${act.transport ? `<span class="text-[9px] font-black text-slate-500 bg-slate-100/80 backdrop-blur-sm border border-slate-200/50 px-2 py-1 rounded uppercase shadow-sm"><i class="fa-solid fa-car-side mr-1"></i>${act.transport}</span>` : ''}
                                        </div>
                                    </div>
                                    <button onclick="toggleComplete('${act.id}')" class="text-3xl flex-shrink-0 transition-transform active:scale-90 ${isDone ? 'text-blue-500 drop-shadow-md hover:text-slate-400' : 'text-slate-300 hover:text-blue-400'}"><i class="fa-solid ${isDone ? 'fa-circle-check' : 'fa-circle'}"></i></button>
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
                                            ${act.budgetAmt ? `<span class="text-[11px] font-black text-emerald-700 bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/60 shadow-[0_2px_8px_rgba(16,185,129,0.1)] px-2.5 py-1.5 rounded-lg"><i class="fa-solid fa-sack-dollar mr-1"></i>${new Intl.NumberFormat('vi-VN').format(act.budgetAmt)}${act.budgetCur}</span>` : '<span class="text-[11px] text-slate-400 font-medium italic">Không có chi phí</span>'}
                                        </div>
                                        
                                        <!-- CỤM NÚT NHÂN BẢN / SỬA / XÓA (Tối ưu Mobile gap) -->
                                        <div class="flex gap-2 md:gap-3">
                                            <button onclick="duplicateActivity('${act.id}')" title="Nhân bản" class="w-8 h-8 rounded-full bg-white/60 border border-white hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 shadow-sm transition-all active:scale-95 flex items-center justify-center touch-manipulation"><i class="fa-regular fa-copy text-xs"></i></button>
                                            <button onclick="editActivity('${act.id}')" title="Sửa" class="w-8 h-8 rounded-full bg-white/60 border border-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 shadow-sm transition-all active:scale-95 flex items-center justify-center touch-manipulation"><i class="fa-solid fa-pen text-xs"></i></button>
                                            <button onclick="deleteActivity('${act.id}')" title="Xóa" class="w-8 h-8 rounded-full bg-white/60 border border-white hover:bg-red-50 text-slate-500 hover:text-red-500 shadow-sm transition-all active:scale-95 flex items-center justify-center touch-manipulation"><i class="fa-solid fa-trash text-xs"></i></button>
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
                expenseListHtml += `<div class="flex justify-between items-center py-2.5 border-b border-slate-700/50 last:border-0">
                    <span class="text-[13px] font-medium text-slate-300 truncate pr-4">${a.details}</span>
                    <span class="text-[13px] font-bold text-white whitespace-nowrap">${new Intl.NumberFormat('vi-VN').format(a.budgetAmt)} ${a.budgetCur}</span>
                </div>`;
            });
            if(expenseListHtml === '') expenseListHtml = '<div class="text-[13px] text-slate-500 italic py-2">Không có chi tiêu nào được ghi nhận.</div>';

            html += `
                <div class="ml-0 md:ml-16 mt-8 mb-10 bg-slate-900/85 backdrop-blur-3xl rounded-[2rem] p-5 md:p-7 shadow-[0_20px_50px_rgba(15,23,42,0.25)] relative overflow-hidden border border-slate-700/50">
                    <div class="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><i class="fa-solid fa-wallet text-6xl text-white"></i></div>
                    <h3 class="text-emerald-400 font-black text-[11px] uppercase tracking-widest mb-5 flex items-center drop-shadow-md"><i class="fa-solid fa-receipt mr-2"></i> Tổng kết chi tiêu ngày</h3>
                    <div class="space-y-1 mb-6 relative z-10">${expenseListHtml}</div>
                    <div class="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-4 md:p-5 border border-slate-700/50 space-y-4 shadow-inner">
                        <div class="flex justify-between items-start gap-3">
                            <span class="text-[12px] md:text-[13px] font-semibold text-slate-400 whitespace-nowrap flex-shrink-0 pt-1">Đã tiêu hôm nay:</span>
                            <div class="text-right min-w-0">
                                <div class="text-base md:text-lg font-black text-emerald-400 drop-shadow-sm whitespace-nowrap">~ ${new Intl.NumberFormat('vi-VN').format(dailyTotalVND)} VND</div>
                                ${destCur !== 'VND' ? `<div class="text-xs font-bold text-emerald-400/60 mt-0.5 whitespace-nowrap">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(dailyTotalForeign)}${destCur}</div>` : ''}
                            </div>
                        </div>
                        ${tripBudgetVND > 0 ? `
                        <div class="flex justify-between items-start gap-3 border-t border-slate-700/50 pt-4 mt-2">
                            <span class="text-[12px] md:text-[13px] font-semibold text-slate-400 whitespace-nowrap flex-shrink-0 pt-1">Ngân sách còn lại:</span>
                            <div class="text-right min-w-0">
                                <div class="text-base md:text-lg font-black drop-shadow-sm whitespace-nowrap ${remainingVND >= 0 ? 'text-white' : 'text-red-400'}">${new Intl.NumberFormat('vi-VN').format(remainingVND)} VND</div>${destCur !== 'VND' ? `<div class="text-xs font-bold mt-0.5 whitespace-nowrap ${remainingVND >= 0 ? 'text-emerald-300/80' : 'text-red-400/60'}">≈ ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(remainingForeign)} ${destCur}</div>` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;

            html += `
                <div class="ml-0 md:ml-16 mt-4 mb-8 text-center pb-8 opacity-70">
                    <div class="inline-flex items-center gap-2 text-slate-300">
                        <span class="h-px w-8 bg-slate-300/50"></span><i class="fa-solid fa-feather text-[10px]"></i><span class="h-px w-8 bg-slate-300/50"></span>
                    </div>
                    <p class="text-[10px] font-bold text-slate-400 mt-2.5 uppercase tracking-widest">TripPlanner v1.2.0</p>
                    <p class="text-[10px] font-medium text-slate-500 mt-1.5 flex items-center justify-center gap-1.5">
                        Made with <i class="fa-solid fa-heart text-red-400/70"></i> by <strong class="text-slate-600">duyanh.dev</strong>
                    </p>
                </div>
            `;
            container.innerHTML = html;
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
            
            // Tính toán Progress Bar
            const total = checklist.length;
            const done = checklist.filter(c => c.isDone).length;
            const percent = total === 0 ? 0 : Math.round((done / total) * 100);
            
            document.getElementById('checklist-progress-bar').style.width = `${percent}%`;
            document.getElementById('checklist-progress-text').innerText = `HOÀN THÀNH: ${percent}%`;
            document.getElementById('checklist-count-text').innerText = `${done}/${total}`;

            if (total === 0) {
                container.innerHTML = `<div class="text-center py-10 text-slate-500 text-[13px] font-medium italic bg-white/50 backdrop-blur-md rounded-2xl border border-white/80 shadow-sm mt-2">Danh sách trống. Hãy thêm đồ cần chuẩn bị ở trên.</div>`;
                return;
            }

            // In danh sách ra UI (Liquid Glass Card Style)
            container.innerHTML = checklist.map(item => `
                <div class="flex items-center justify-between p-3.5 md:p-4 bg-white/60 backdrop-blur-xl rounded-[1.25rem] border border-white/80 shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] hover:bg-white/80 transition-all group ${item.isDone ? 'opacity-60 bg-slate-50/50 grayscale-[20%]' : ''}">
                    
                    <div class="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer touch-manipulation" onclick="toggleChecklist('${item.id}')">
                        <!-- Icon Checkbox (Làm to rõ ràng hơn ở Mobile) -->
                        <div class="text-[22px] ${item.isDone ? 'text-emerald-500 drop-shadow-md' : 'text-slate-300 drop-shadow-sm'} transition-colors flex-shrink-0">
                            <i class="fa-solid ${item.isDone ? 'fa-circle-check' : 'fa-circle'}"></i>
                        </div>
                        <span class="text-[15px] md:text-sm font-bold truncate ${item.isDone ? 'line-through text-slate-400' : 'text-slate-800 drop-shadow-sm'}">${item.text}</span>
                    </div>
                    
                    <!-- Nút Xóa (Bọc trong kính tròn) -->
                    <button onclick="deleteChecklist('${item.id}')" class="w-8 h-8 rounded-full bg-white/60 hover:bg-red-50 flex items-center justify-center text-slate-400 border border-white hover:border-red-200 hover:text-red-500 transition-all opacity-100 md:opacity-0 group-hover:opacity-100 flex-shrink-0 shadow-sm touch-manipulation active:scale-95">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                </div>
            `).join('');
        };

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

        const deleteChecklist = (id) => {
            if (confirm("Xóa mục này khỏi danh sách?")) {
                const trip = state.trips.find(t => t.id === state.activeTripId);
                trip.checklist = trip.checklist.filter(c => c.id !== id);
                saveData();
                renderChecklist();
            }
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
// NHÂN BẢN HOẠT ĐỘNG (DUPLICATE)
// ==========================================
window.duplicateActivity = (actId) => {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    
    const day = trip.days.find(d => d.date === state.activeDayDate);
    if (!day) return;
    
    const actIndex = day.activities.findIndex(a => a.id === actId);
    if (actIndex > -1) {
        const actToCopy = day.activities[actIndex];
        
        // Tạo một bản sao chép (Deep copy) và cấp phát ID mới
        const newAct = JSON.parse(JSON.stringify(actToCopy)); 
        newAct.id = 'act_' + Date.now() + Math.random().toString(36).substr(2, 9);
        newAct.isCompleted = false; // Reset trạng thái chưa hoàn thành cho bản sao
        
        // Chèn bản sao ngay phía dưới bản gốc
        day.activities.splice(actIndex + 1, 0, newAct);
        
        // Lưu và Cập nhật lại UI
        if(typeof saveState === 'function') saveState();
        renderTimeline();
    }
};