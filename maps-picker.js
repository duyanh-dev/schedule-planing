// ==========================================
        // MAP PICKER LOGIC (LEAFLET + GOOGLE TILES + PHOTON API)
        // Giải pháp: Siêu nhẹ, Chi tiết như Google, 100% Free
        // ==========================================
        
        let pickerMap = null;
        let pickerMarker = null;
        let mapSearchResults = [];
        let selectedLocationData = { name: "", lat: null, lng: null };

        // 1. Mở Modal Bản đồ (Hiệu ứng Liquid Glass)
        const openMapPicker = (targetInputId = 'activity-location-input') => {
            state.mapPickerTargetInput = targetInputId;
            selectedLocationData = { name: "", lat: null, lng: null };
            
            document.getElementById('map-selected-address').innerText = 'Chạm vào bản đồ hoặc tìm kiếm...';
            document.getElementById('btn-confirm-map').disabled = true;
            document.getElementById('map-search-input').value = '';
            document.getElementById('search-results').classList.add('hidden');
            
            const modal = document.getElementById('map-picker-modal');
            modal.classList.remove('opacity-0', 'pointer-events-none');
            modal.querySelector('.modal-content').classList.remove('translate-y-10');

            setTimeout(() => {
                initPickerMap();
            }, 300); 
        };

        const closeMapPicker = () => {
            const modal = document.getElementById('map-picker-modal');
            modal.classList.add('opacity-0', 'pointer-events-none');
            modal.querySelector('.modal-content').classList.add('translate-y-10');
        };

        // 2. Khởi tạo Bản đồ Leaflet với Lõi Google Maps
        const initPickerMap = () => {
            if (!pickerMap) {
                // Khởi tạo map, tắt nút Zoom mặc định cho đỡ vướng UI
                pickerMap = L.map('picker-map', { zoomControl: false }).setView([10.762622, 106.660172], 14); 
                
                // Link lấy ảnh bản đồ trực tiếp từ Google (Siêu nét, siêu nhẹ)
                L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                    attribution: '© Google Maps',
                    maxZoom: 20
                }).addTo(pickerMap);

                // Lắng nghe sự kiện click
                pickerMap.on('click', (e) => handleMapClick(e.latlng.lat, e.latlng.lng));
            }
            pickerMap.invalidateSize(); 
        };

        // 3. Hàm Đặt Ghim nổi (Custom Marker hợp với Apple UI)
        const placeMarkerAndPopup = (lat, lng, name) => {
            if (pickerMarker) pickerMap.removeLayer(pickerMarker);
            
            // Icon ghim tùy chỉnh (Vòng tròn xanh đang nảy lên)
            const customIcon = L.divIcon({
                className: 'custom-leaflet-icon',
                html: `<div class="bg-blue-600 text-white p-2 rounded-full shadow-2xl flex items-center justify-center w-8 h-8 ring-4 ring-blue-500/30 animate-bounce relative -top-4 -left-4">
                            <i class="fa-solid fa-location-dot text-sm"></i>
                       </div>`,
                iconSize: [0, 0] // Tâm chính xác tại điểm chấm
            });

            pickerMarker = L.marker([lat, lng], { icon: customIcon }).addTo(pickerMap);
            
            // Cập nhật thẻ Dynamic Island bên dưới
            selectedLocationData = { name: name, lat: lat, lng: lng };
            document.getElementById('map-selected-address').innerText = name;
            document.getElementById('btn-confirm-map').disabled = false;
        };

        // 4. Click lấy địa chỉ (Dùng Photon API - Free)
        const handleMapClick = async (lat, lng) => {
            showLoading(true, "Đang định vị...");
            try {
                const res = await fetch(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`);
                const data = await res.json();
                
                let placeName = `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                if (data && data.features && data.features.length > 0) {
                    const props = data.features[0].properties;
                    placeName = props.name || props.street || [props.district, props.city].filter(Boolean).join(', ') || placeName;
                }
                
                placeMarkerAndPopup(lat, lng, placeName);
                pickerMap.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
            } catch (err) {
                placeMarkerAndPopup(lat, lng, `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            } finally {
                showLoading(false);
            }
        };

        // 5. Tìm kiếm từ khóa (Photon API)
        const searchMapLocation = async (query = null) => {
            const keyword = query || document.getElementById('map-search-input').value.trim();
            if (!keyword) return;

            const resultsContainer = document.getElementById('search-results');
            showLoading(true, "Đang tìm kiếm...");
            
            try {
                const center = pickerMap.getCenter();
                const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(keyword)}&limit=6&lat=${center.lat}&lon=${center.lng}`);
                const data = await res.json();
                
                if (data && data.features && data.features.length > 0) {
                    mapSearchResults = data.features;
                    resultsContainer.innerHTML = data.features.map((item, index) => {
                        const props = item.properties;
                        const title = props.name || props.street || "Địa điểm";
                        const subtitle = [props.street, props.district, props.city, props.state].filter(Boolean).join(', ');
                        
                        return `
                        <div onclick="selectSearchResult(${index})" class="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400"><i class="fa-solid fa-location-dot"></i></div>
                            <div class="flex-1 min-w-0">
                                <div class="font-bold text-sm text-slate-800 truncate">${title}</div>
                                <div class="text-[11px] text-slate-500 truncate mt-0.5">${subtitle}</div>
                            </div>
                        </div>
                    `}).join('');
                    resultsContainer.classList.remove('hidden');
                } else {
                    resultsContainer.innerHTML = '<div class="p-4 text-sm text-slate-500 text-center font-bold">Không tìm thấy địa điểm</div>';
                    resultsContainer.classList.remove('hidden');
                }
            } catch (err) {
                resultsContainer.innerHTML = '<div class="p-4 text-sm text-red-500 text-center font-bold">Lỗi kết nối. Vui lòng thử lại.</div>';
                resultsContainer.classList.remove('hidden');
            } finally {
                showLoading(false);
            }
        };

        // 6. Chọn kết quả
        const selectSearchResult = (index) => {
            const item = mapSearchResults[index];
            const lng = item.geometry.coordinates[0]; // Photon trả về [lng, lat]
            const lat = item.geometry.coordinates[1];
            
            const props = item.properties;
            const name = props.name || props.street || "Địa điểm đã chọn";

            pickerMap.flyTo([lat, lng], 16, { animate: true, duration: 1 });
            placeMarkerAndPopup(lat, lng, name);

            document.getElementById('search-results').classList.add('hidden');
            document.getElementById('map-search-input').value = name;
        };

        // 7. Gợi ý nhanh
        const quickSearch = (keyword) => {
            document.getElementById('map-search-input').value = keyword;
            searchMapLocation(keyword);
        };

        // 8. Định vị GPS
        const getUserLocation = () => {
            if ("geolocation" in navigator) {
                showLoading(true, "Đang định vị GPS...");
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    pickerMap.flyTo([lat, lng], 16, { animate: true });
                    await handleMapClick(lat, lng);
                }, () => {
                    alert("Không thể lấy GPS. Vui lòng bật vị trí trên trình duyệt.");
                    showLoading(false);
                });
            } else {
                alert("Trình duyệt không hỗ trợ GPS.");
            }
        };

        // 9. Quản lý trạng thái Loading
        const showLoading = (show, text = "Đang xử lý...") => {
            const loader = document.getElementById('map-loading');
            if (show) {
                loader.querySelector('span').innerText = text;
                loader.classList.remove('hidden');
                loader.classList.add('flex');
            } else {
                loader.classList.add('hidden');
                loader.classList.remove('flex');
            }
        };

        // 10. Xác nhận chọn điểm lưu vào Form
        const confirmMapSelection = () => {
            if (selectedLocationData.name && state.mapPickerTargetInput) {
                const inputEl = document.getElementById(state.mapPickerTargetInput);
                if (inputEl) {
                    inputEl.value = selectedLocationData.name;
                    // Trigger input event nếu có form lắng nghe thay đổi
                    inputEl.dispatchEvent(new Event('input')); 
                }
            }
            closeMapPicker();
        };