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


        // --- MAP PICKER LOGIC (LEAFLET + NOMINATIM) ---
        let pickerMap = null;
        let pickerMarker = null;

        // --- CÁC HÀM XỬ LÝ BẢN ĐỒ MỚI ---
        let mapSearchResults = [];

        // Hàm xử lý đặt ghim và hiển thị Popup tên
        const placeMarkerAndPopup = (lat, lng, name) => {
            if (pickerMarker) pickerMap.removeLayer(pickerMarker);
            pickerMarker = L.marker([lat, lng]).addTo(pickerMap);
            
            // Hiển thị Popup có chứa Tên địa điểm
            pickerMarker.bindPopup(`<div class="font-sans font-bold text-sm text-blue-700">${name}</div>`).openPopup();
            
            state.currentPickedAddress = name;
            document.getElementById('map-selected-address').innerText = name;
            document.getElementById('btn-confirm-map').disabled = false;
        };

        // Hàm khi người dùng chạm vào bản đồ (Dùng Photon API)
        const handleMapClick = async (lat, lng) => {
            const loading = document.getElementById('map-loading');
            loading.classList.remove('hidden');
            loading.classList.add('flex');
            
            try {
                // Reverse Geocoding bằng Photon API
                const res = await fetch(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`);
                const data = await res.json();
                
                let placeName = '';
                if (data && data.features && data.features.length > 0) {
                    const props = data.features[0].properties;
                    // Lấy tên, nếu không có tên thì lấy tên đường, không có nữa thì lấy thành phố
                    placeName = props.name || props.street || props.city || props.state || `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                } else {
                    placeName = `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                }
                
                placeMarkerAndPopup(lat, lng, placeName);
            } catch (err) {
                placeMarkerAndPopup(lat, lng, `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            } finally {
                loading.classList.add('hidden');
                loading.classList.remove('flex');
            }
        };

        // Hàm tìm kiếm từ thanh Search (Dùng Photon API)
        const searchMapLocation = async (query = null) => {
            const keyword = query || document.getElementById('map-search-input').value;
            if (!keyword) return;

            const resultsContainer = document.getElementById('search-results');
            const loading = document.getElementById('map-loading');
            loading.classList.remove('hidden'); loading.classList.add('flex');
            
            try {
                // Ưu tiên tìm quanh vị trí đang xem
                const center = pickerMap.getCenter();
                const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(keyword)}&limit=5&lat=${center.lat}&lon=${center.lng}`);
                const data = await res.json();
                
                if (data && data.features && data.features.length > 0) {
                    mapSearchResults = data.features;
                    resultsContainer.innerHTML = data.features.map((item, index) => {
                        const props = item.properties;
                        const title = props.name || props.street || "Địa điểm";
                        // Nối các thông tin phụ lại cho rõ ràng
                        const subtitle = [props.street, props.district, props.city, props.country].filter(Boolean).join(', ');
                        
                        return `
                        <div onclick="selectSearchResult(${index})" class="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors">
                            <div class="font-bold text-sm text-slate-800">${title}</div>
                            <div class="text-[11px] text-slate-500 truncate mt-0.5">${subtitle}</div>
                        </div>
                    `}).join('');
                    resultsContainer.classList.remove('hidden');
                } else {
                    resultsContainer.innerHTML = '<div class="p-4 text-sm text-slate-500 text-center font-bold">Không tìm thấy địa điểm</div>';
                    resultsContainer.classList.remove('hidden');
                }
            } catch (err) {
                console.error(err);
                resultsContainer.innerHTML = '<div class="p-4 text-sm text-red-500 text-center font-bold">Lỗi kết nối. Vui lòng thử lại.</div>';
                resultsContainer.classList.remove('hidden');
            } finally {
                loading.classList.add('hidden'); loading.classList.remove('flex');
            }
        };

        // --- HÀM MỞ GOOGLE MAPS ---
        const openGoogleMaps = (from, to) => {
            let url = 'https://www.google.com/maps/dir/?api=1';
            if (from && to) {
                url += `&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;
            } else if (to) {
                url += `&destination=${encodeURIComponent(to)}`;
            } else if (from) {
                url += `&destination=${encodeURIComponent(from)}`;
            }
            if(from || to) {
                window.open(url, '_blank');
            }
        };

        // Hàm khi bấm vào 1 kết quả tìm kiếm (Bóc tách dữ liệu từ Photon GeoJSON)
        const selectSearchResult = (index) => {
            const item = mapSearchResults[index];
            // Photon trả về tọa độ dạng [lon, lat]
            const lng = item.geometry.coordinates[0];
            const lat = item.geometry.coordinates[1];
            
            const props = item.properties;
            const name = props.name || props.street || "Địa điểm đã chọn";

            pickerMap.setView([lat, lng], 16);
            placeMarkerAndPopup(lat, lng, name);

            document.getElementById('search-results').classList.add('hidden');
            document.getElementById('map-search-input').value = name;
        };

        // Hàm cho các nút Gợi ý nhanh (Chips)
        const quickSearch = (keyword) => {
            document.getElementById('map-search-input').value = keyword;
            searchMapLocation(keyword);
        };

        // Hàm lấy vị trí hiện tại (GPS thiết bị)
        const getUserLocation = () => {
            const loading = document.getElementById('map-loading');
            loading.classList.remove('hidden'); loading.classList.add('flex');

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    pickerMap.setView([lat, lng], 16);
                    await handleMapClick(lat, lng);
                }, () => {
                    alert("Không thể lấy GPS. Vui lòng kiểm tra quyền Vị trí của trình duyệt.");
                    loading.classList.add('hidden'); loading.classList.remove('flex');
                });
            } else {
                alert("Trình duyệt của bạn không hỗ trợ định vị GPS.");
                loading.classList.add('hidden'); loading.classList.remove('flex');
            }
        };

        // --- CẬP NHẬT HÀM MỞ BẢN ĐỒ ---
        const openMapPicker = (targetInputId) => {
            state.mapPickerTargetInput = targetInputId;
            state.currentPickedAddress = '';
            document.getElementById('map-selected-address').innerText = 'Chạm vào bản đồ hoặc tìm kiếm...';
            document.getElementById('btn-confirm-map').disabled = true;
            document.getElementById('map-search-input').value = '';
            document.getElementById('search-results').classList.add('hidden');
            
            const modal = document.getElementById('map-picker-modal');
            modal.classList.add('active'); 

            setTimeout(() => {
                if (!pickerMap) {
                    // Cài đặt vị trí khởi tạo quanh khu vực Mỹ Tho
                    pickerMap = L.map('picker-map').setView([10.35, 106.36], 13); 
                    
                    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                        attribution: '© Google Maps', maxZoom: 20
                    }).addTo(pickerMap);

                    pickerMap.on('click', (e) => handleMapClick(e.latlng.lat, e.latlng.lng));
                }
                pickerMap.invalidateSize(); 
            }, 350); 
        };

        const closeMapPicker = () => {
            document.getElementById('map-picker-modal').classList.remove('active');
        };

        const confirmMapSelection = () => {
            if (state.currentPickedAddress && state.mapPickerTargetInput) {
                document.getElementById(state.mapPickerTargetInput).value = state.currentPickedAddress;
            }
            closeMapPicker();
        };


        // --- STREAMING_CHUNK: RENDERING ENGINE ---
        // Master render function
        const renderApp = () => {
            renderSidebar();
            renderHeader();
            renderDaysTabs();
            renderTimeline();
            updateClockAndBanner();
        };

        const renderSidebar = () => {
            const list = document.getElementById('trips-list');
            list.innerHTML = state.trips.map(trip => `
                <button onclick="switchTrip('${trip.id}')" class="w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-center gap-3 border ${state.activeTripId === trip.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-100 hover:border-slate-200'}">
                    <img src="${trip.coverUrl}" class="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-sm">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-sm truncate ${state.activeTripId === trip.id ? 'text-blue-700' : 'text-slate-800'}">${trip.title}</h4>
                        <p class="text-xs text-slate-500 font-medium mt-1">${trip.days.length} ngày</p>
                    </div>
                </button>
            `).join('');
        };

        const renderHeader = () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            document.getElementById('trip-cover-img').src = trip.coverUrl;
            document.getElementById('trip-title-display').innerText = trip.title;
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
            
            container.innerHTML = trip.days.map((day, idx) => {
                const isActive = state.activeDayDate === day.date;
                const isRealToday = day.date === getRelativeDateStr(0);

                return `
                    <button onclick="switchDay('${day.date}')" class="flex-shrink-0 h-16 px-5 md:px-6 rounded-2xl transition-all border-2 text-left relative group flex flex-col justify-center ${isActive ? 'border-blue-500 bg-blue-50/60 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300'}">
                        ${isRealToday ? `<div class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm z-10">NAY</div>` : ''}
                        <div class="text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'} mb-1">Ngày ${idx + 1}</div>
                        <div class="font-bold text-sm ${isActive ? 'text-slate-900' : 'text-slate-600'}">${formatDisplayDate(day.date)}</div>
                    </button>
                `;
            }).join('');
        };

        const renderTimeline = () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip.days.find(d => d.date === state.activeDayDate);
            const container = document.getElementById('timeline-container');
            
            if (!day || day.activities.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-16 px-4 md:pl-20 relative z-10">
                        <div class="w-20 h-20 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 mx-auto mb-4 text-4xl shadow-sm"><i class="fa-solid fa-mug-hot"></i></div>
                        <h3 class="text-xl font-black text-slate-700">Chưa có lịch trình</h3>
                        <p class="text-slate-500 text-sm mt-2 font-medium">Bấm Thêm HĐ để lên kế hoạch cho ngày này.</p>
                    </div>`;
                return;
            }

            let html = '';
day.activities.forEach((act, index) => {
                    const status = getActivityStatus(act, day.date);
                const isDone = act.isCompleted;

                // Visual From -> To format
                // --- Cập nhật UI khối Lịch Trình Từ->Đến ---
                let routeHtml = '';
                if (act.from && act.to) {
                    routeHtml = `
                    <div class="mt-3 bg-blue-50/50 rounded-xl border border-blue-100/50 p-2.5 flex items-center justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Từ</div>
                            <div class="text-xs font-bold text-slate-700 truncate" title="${act.from}">${act.from}</div>
                        </div>
                        <i class="fa-solid fa-arrow-right-long text-blue-300 flex-shrink-0"></i>
                        <div class="flex-1 min-w-0 text-right">
                            <div class="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Đến</div>
                            <div class="text-xs font-bold text-slate-900 truncate" title="${act.to}">${act.to}</div>
                        </div>
                    </div>`;
                } else if (act.to || act.from) {
                    const loc = act.to || act.from;
                    routeHtml = `<div class="mt-3 bg-slate-50 rounded-xl border border-slate-100 p-2.5 text-xs font-bold text-slate-700 truncate"><i class="fa-solid fa-location-dot text-slate-400 mr-1.5"></i>${loc}</div>`;
                }

                // Nút Google Maps
                let actionHtml = '';
                if (act.from || act.to) {
                    actionHtml = `<button onclick="openGoogleMaps('${(act.from || '').replace(/'/g, "\\'")}', '${(act.to || '').replace(/'/g, "\\'")}')" class="mt-2 w-full py-2.5 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs transition-colors border border-blue-100 flex items-center justify-center gap-1.5 shadow-sm active:scale-95"><i class="fa-solid fa-diamond-turn-right text-sm"></i> Chuyển sang Google Maps</button>`;
                }

                const iconClass = act.icon && act.icon.startsWith('fa-') ? act.icon : 'fa-location-dot';

                html += `
                    <div class="relative flex gap-3 md:gap-5 group mb-6 transition-opacity duration-300 ${isDone ? 'opacity-60' : 'opacity-100'}">
                        
                        <!-- Desktop Time Column (Ẩn trên Mobile) -->
                        <div class="w-16 flex-shrink-0 pt-4 text-right z-10 hidden md:block">
                            <div class="text-lg font-black ${isDone ? 'text-slate-400' : 'text-slate-800'} tracking-tight">${act.start}</div>
                            <div class="text-[13px] text-slate-400 font-bold">${act.end}</div>
                        </div>

                        <!-- Timeline Node/Icon (Đã sửa Line thẳng tắp) -->
                        <div class="relative flex flex-col items-center z-10 pt-1 px-1 md:px-0">
                            <div class="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-4 border-white shadow-sm bg-blue-50 text-blue-500 z-10 relative">
                                <i class="fa-solid ${iconClass}"></i>
                            </div>
                            <!-- Đường kẻ dọc tự động căn giữa Icon -->
                            ${index < day.activities.length - 1 ? `<div class="absolute top-10 bottom-[-32px] left-1/2 w-[2px] bg-slate-200 -translate-x-1/2 z-0 rounded-full"></div>` : ''}
                        </div>

                        <!-- Main Card -->
                        <div class="flex-1 min-w-0 pr-1 md:pr-0">
                            <div class="bg-white rounded-[20px] p-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 transition-all hover:border-blue-300 relative overflow-hidden flex flex-col">
                                
                                <!-- Hàng 1: Thời gian (Mobile) & Trạng thái -->
                                <div class="flex justify-between items-center mb-3">
                                    <div class="md:hidden flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                        <span class="text-[11px] font-black text-slate-700"><i class="fa-regular fa-clock text-slate-400 mr-1"></i>${act.start}</span>
                                        <span class="text-slate-300 text-[9px]"><i class="fa-solid fa-arrow-right"></i></span>
                                        <span class="text-[11px] font-bold text-slate-500">${act.end}</span>
                                    </div>
                                    <div class="hidden md:block">
                                        <h3 class="text-[10px] font-black text-blue-500 uppercase tracking-wider">${act.type}</h3>
                                    </div>
                                    <span class="inline-flex items-center px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${status.color}">
                                        ${status.type === 'late' || status.type === 'overdue' ? '<i class="fa-solid fa-triangle-exclamation mr-1"></i>' : ''}
                                        ${status.label}
                                    </span>
                                </div>

                                <!-- Hàng 2: Nội dung chính -->
                                <div class="flex items-start gap-3">
                                    <!-- Nút Checkbox bọc vừa vặn -->
                                    <button onclick="toggleComplete('${act.id}')" class="flex-shrink-0 mt-0.5 text-2xl transition-all ${isDone ? 'text-blue-500' : 'text-slate-200 hover:text-blue-400'}">
                                        <i class="fa-solid ${isDone ? 'fa-square-check' : 'fa-square'}"></i>
                                    </button>
                                    
                                    <div class="flex-1 min-w-0">
                                        <p class="text-[15px] md:text-lg font-black leading-snug mb-1.5 ${isDone ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'} break-words">${act.details}</p>
                                        
                                        <!-- Sub-tags (Mobile) -->
                                        <div class="flex flex-wrap items-center gap-1.5">
                                            <span class="md:hidden inline-flex items-center text-[9px] font-bold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wide">${act.type}</span>
                                            ${act.transport ? `
                                            <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide">
                                                <i class="fa-solid fa-car-side mr-1 text-slate-400"></i>${act.transport}
                                            </span>` : ''}
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Hàng 3: Location / Map Button -->
                                ${routeHtml}
                                ${actionHtml}

                                <!-- Hàng 4: Thanh công cụ Edit/Delete -->
                                <div class="mt-3 pt-3 border-t border-slate-100 flex justify-end gap-3 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onclick="editActivity('${act.id}')" class="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1"><i class="fa-solid fa-pen"></i> Sửa</button>
                                    <button onclick="deleteActivity('${act.id}')" class="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"><i class="fa-solid fa-trash"></i> Xóa</button>
                                </div>

                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        };


        // --- STREAMING_CHUNK: REAL-TIME & SIMULATION LOGIC ---
        const updateClockAndBanner = () => {
            const now = getCurrentTime();
            
            // Update Clock display
            document.getElementById('clock-display').innerHTML = `
                <i class="fa-solid fa-clock text-xl ${state.isSimulating ? 'text-amber-500' : 'text-blue-500'}"></i> 
                <span>${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
            `;

            // Update Banner
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const banner = document.getElementById('next-activity-banner');
            const textEl = document.getElementById('next-activity-text');

            let upcoming = [];
            trip.days.forEach(day => {
                day.activities.forEach(act => {
                    if (!act.isCompleted) {
                        const startObj = new Date(`${day.date}T${act.start}:00`);
                        if(state.isSimulating) {
                            startObj.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                        }
                        const diffMins = Math.floor((startObj - now) / 60000);
                        if (diffMins > 0) {
                            upcoming.push({ ...act, dayDate: day.date, diff: diffMins });
                        }
                    }
                });
            });

            upcoming.sort((a, b) => a.diff - b.diff);

            if (upcoming.length > 0) {
                const next = upcoming[0];
                const hrs = Math.floor(next.diff / 60);
                const mins = next.diff % 60;
                let timeStr = hrs > 0 ? `${hrs}h ${mins}p` : `${mins} phút`;
                
                textEl.innerHTML = `Tiếp theo: <span class="text-blue-300">${next.details}</span> sau ${timeStr}`;
                banner.classList.remove('opacity-0', '-translate-y-[150%]', 'pointer-events-none');
            } else {
                banner.classList.add('opacity-0', '-translate-y-[150%]', 'pointer-events-none');
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


        // --- STREAMING_CHUNK: INTERACTION & FORMS LOGIC ---
        const switchTrip = (id) => {
            state.activeTripId = id;
            const trip = state.trips.find(t => t.id === id);
            if(trip.days.length > 0) state.activeDayDate = trip.days[0].date;
            if(window.innerWidth < 768) toggleSidebar();
            renderApp();
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

        const openActivityModal = () => {
            state.editingActivityId = null;
            document.getElementById('activity-form').reset();
            document.getElementById('act-id').value = '';
            
            // Default 1 hour from now
            const d = new Date();
            document.getElementById('act-start').value = `${String(d.getHours()).padStart(2, '0')}:00`;
            document.getElementById('act-end').value = `${String(d.getHours() + 1).padStart(2, '0')}:00`;
            
            handleTransportChange(); 
            document.getElementById('act-modal-title').innerHTML = '<i class="fa-solid fa-plus text-blue-500 bg-blue-50 p-2 rounded-lg"></i> Thêm Hoạt Động';
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
            
            // Transport Logic Fix: check if it matches standard options, else set 'other'
            const select = document.getElementById('act-transport-select');
            const input = document.getElementById('act-transport-input');
            const standardOptions = Array.from(select.options).map(o => o.value);
            
            if (!act.transport) {
                select.value = "";
                input.classList.add('hidden');
            } else if (standardOptions.includes(act.transport)) {
                select.value = act.transport;
                input.classList.add('hidden');
            } else {
                select.value = "other";
                input.value = act.transport;
                input.classList.remove('hidden');
            }
            
            document.getElementById('act-modal-title').innerHTML = '<i class="fa-solid fa-pen text-blue-500 bg-blue-50 p-2 rounded-lg"></i> Sửa Hoạt Động';
            document.getElementById('activity-modal').classList.add('active');
        };

        const closeActivityModal = () => document.getElementById('activity-modal').classList.remove('active');

        const submitActivityForm = (e) => {
            e.preventDefault(); // Prevent page reload
            const details = document.getElementById('act-details').value;
            const start = document.getElementById('act-start').value;
            const end = document.getElementById('act-end').value;

            if(!details || !start || !end) return;

            const selectVal = document.getElementById('act-transport-select').value;
            const transportVal = selectVal === 'other' ? document.getElementById('act-transport-input').value : selectVal;

            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip.days.find(d => d.date === state.activeDayDate);
            
            const newAct = {
                id: document.getElementById('act-id').value || Math.random().toString(36).substr(2, 9),
                start: start, end: end, details: details,
                from: document.getElementById('act-from').value,
                to: document.getElementById('act-to').value,
                icon: document.getElementById('act-icon').value,
                type: document.getElementById('act-type').value,
                transport: transportVal,
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
            // Sort by start time
            day.activities.sort((a, b) => a.start.localeCompare(b.start));

            saveData(); // <--- THÊM DÒNG NÀY VÀO ĐÂY
            
            closeActivityModal();
            renderApp();
        };

        // --- GLOBAL TIMELINE MODAL ---
        const renderGlobalTimeline = () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const content = document.getElementById('global-timeline-content');
            let html = '';

            trip.days.forEach((day, idx) => {
                html += `
                <div class="mb-8 relative">
                    <!-- Đã sửa sticky: bg-white và z-20 -->
                    <div class="sticky top-0 bg-slate-50/95 backdrop-blur-md py-3 z-20 border-b border-slate-200 mb-4 flex items-baseline gap-2">
                        <span class="font-black text-slate-900 text-lg">Ngày ${idx + 1}</span>
                        <span class="text-slate-500 font-bold text-sm">${formatDisplayDate(day.date)}</span>
                    </div>
                    <div class="space-y-3 relative z-10">
                `;
                
                if(day.activities.length === 0) {
                    html += `<p class="text-sm text-slate-400 italic font-medium p-4 bg-white rounded-xl border border-slate-100">Chưa có hoạt động.</p>`;
                } else {
                    day.activities.forEach(act => {
                        const status = getActivityStatus(act, day.date);
                        let routeTxt = '';
                        if(act.from && act.to) routeTxt = `${act.from} ➔ ${act.to}`;
                        else if(act.to || act.from) routeTxt = act.to || act.from;

                        html += `
                        <div class="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div class="flex-shrink-0 text-center w-14 pt-1">
                                <div class="text-[14px] font-black text-slate-800">${act.start}</div>
                                <div class="text-[10px] font-bold text-slate-400 uppercase mt-1 ${status.color.split(' ')[0]} px-1 py-0.5 rounded">${status.type === 'done' ? 'Xong' : (status.type==='future'? 'Sắp' : 'Trễ')}</div>
                            </div>
                            <div class="flex-1 min-w-0 border-l-2 border-slate-100 pl-4">
                                <div class="text-base font-bold text-slate-900 truncate ${act.isCompleted ? 'line-through text-slate-400' : ''}">${act.details}</div>
                                ${routeTxt ? `<div class="text-xs font-semibold text-blue-500 mt-1.5 truncate"><i class="fa-solid fa-location-arrow mr-1"></i>${routeTxt}</div>` : ''}
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
        const openTripModal = () => {
            document.getElementById('trip-title').value = '';
            document.getElementById('trip-start-date').value = getRelativeDateStr(0);
            document.getElementById('trip-days-count').value = 2;
            tripModal.classList.add('active');
        };
        const closeTripModal = () => tripModal.classList.remove('active');

        const submitTripForm = () => {
            const title = document.getElementById('trip-title').value;
            const startDateStr = document.getElementById('trip-start-date').value;
            const daysCount = parseInt(document.getElementById('trip-days-count').value);
            
            if(!title || !startDateStr) return alert("Điền đủ thông tin");

            const newDays = [];
            const startD = new Date(startDateStr);
            for(let i=0; i<daysCount; i++) {
                const d = new Date(startD);
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
                days: newDays
            };
            state.trips.push(newTrip);
            saveData(); // <--- THÊM DÒNG NÀY VÀO ĐÂY
            closeTripModal();
            switchTrip(newTrip.id);
        };

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
