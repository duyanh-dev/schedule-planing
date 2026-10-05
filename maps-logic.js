// ==========================================
        // MAP PICKER LOGIC (MAPBOX GL JS)
        // ==========================================
        
        // ĐIỀN TOKEN CỦA BẠN VÀO ĐÂY (Lấy miễn phí tại account.mapbox.com)
        mapboxgl.accessToken = 'pk.eyJ1Ijoia3dlaXRlaSIsImEiOiJjbXV2N2JvdmgwMThiMnlxMmowMXR3eDV5In0.rNVMC-UhJOxVf58JDThU_A';

        let pickerMap = null;
        let pickerMarker = null;
        let mapSearchResults = [];

        // --- 1. HÀM ĐẶT GHIM & HIỂN THỊ POPUP ---
        const placeMarkerAndPopup = (lat, lng, name) => {
            // Xóa ghim cũ nếu có
            if (pickerMarker) pickerMarker.remove();
            
            // Custom DOM marker kiểu Apple
            const el = document.createElement('div');
            el.innerHTML = `
                <div class="bg-blue-600 text-white p-2 rounded-full shadow-2xl flex items-center justify-center w-8 h-8 ring-4 ring-blue-500/20 animate-bounce">
                    <i class="fa-solid fa-location-dot text-sm"></i>
                </div>
            `;
            
            // Tạo Popup
            const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
                .setHTML(`<div class="font-sans font-bold text-sm text-blue-700">${name}</div>`);

            // Đặt ghim mới
            pickerMarker = new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .setPopup(popup)
                .addTo(pickerMap);
            
            pickerMarker.togglePopup(); // Tự động mở Popup
            
            // Cập nhật State và UI
            state.currentPickedAddress = name;
            document.getElementById('map-selected-address').innerText = name;
            document.getElementById('btn-confirm-map').disabled = false;
        };

        // --- 2. HÀM KHI CHẠM VÀO BẢN ĐỒ (REVERSE GEOCODING) ---
        const handleMapClick = async (lat, lng) => {
            const loading = document.getElementById('map-loading');
            loading.classList.remove('hidden');
            loading.classList.add('flex');
            
            try {
                // Dùng Mapbox Geocoding API thay cho Photon
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=vi`;
                const res = await fetch(url);
                const data = await res.json();
                
                let placeName = `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                
                if (data && data.features && data.features.length > 0) {
                    placeName = data.features[0].place_name; // Lấy chuỗi địa chỉ chi tiết nhất
                }
                
                placeMarkerAndPopup(lat, lng, placeName);
                pickerMap.flyTo({ center: [lng, lat], zoom: 16, essential: true }); // Mượt mà zoom vào điểm chạm
            } catch (err) {
                console.error(err);
                placeMarkerAndPopup(lat, lng, `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            } finally {
                loading.classList.add('hidden');
                loading.classList.remove('flex');
            }
        };

        // --- 3. HÀM TÌM KIẾM TỪ KHÓA (FORWARD GEOCODING) ---
        const searchMapLocation = async (query = null) => {
            const keyword = query || document.getElementById('map-search-input').value;
            if (!keyword) return;

            const resultsContainer = document.getElementById('search-results');
            const loading = document.getElementById('map-loading');
            loading.classList.remove('hidden'); loading.classList.add('flex');
            
            try {
                const center = pickerMap.getCenter();
                // Tìm kiếm ưu tiên quanh khu vực đang xem (proximity)
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(keyword)}.json?access_token=${mapboxgl.accessToken}&language=vi&limit=5&proximity=${center.lng},${center.lat}`;
                
                const res = await fetch(url);
                const data = await res.json();
                
                if (data && data.features && data.features.length > 0) {
                    mapSearchResults = data.features;
                    resultsContainer.innerHTML = data.features.map((item, index) => {
                        const title = item.text || "Địa điểm";
                        const subtitle = item.place_name || "";
                        
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

        // --- 5. CHỌN KẾT QUẢ TÌM KIẾM ---
        const selectSearchResult = (index) => {
            const item = mapSearchResults[index];
            // Mapbox trả về tọa độ dạng [lng, lat]
            const lng = item.center[0];
            const lat = item.center[1];
            const name = item.place_name || "Địa điểm đã chọn";

            // Hiệu ứng bay mượt mà đến địa điểm
            pickerMap.flyTo({ center: [lng, lat], zoom: 16 });
            placeMarkerAndPopup(lat, lng, name);

            document.getElementById('search-results').classList.add('hidden');
            document.getElementById('map-search-input').value = name;
        };

        // --- 6. GỢI Ý NHANH (CHIPS) ---
        const quickSearch = (keyword) => {
            document.getElementById('map-search-input').value = keyword;
            searchMapLocation(keyword);
        };

        // --- 7. VỊ TRÍ HIỆN TẠI (GPS) ---
        const getUserLocation = () => {
            const loading = document.getElementById('map-loading');
            loading.classList.remove('hidden'); loading.classList.add('flex');

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    pickerMap.flyTo({ center: [lng, lat], zoom: 16 });
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

        // --- 8. KHỞI TẠO & ĐÓNG/MỞ MODAL ---
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
                    // Khởi tạo Mapbox (Center quanh khu vực Mỹ Tho / HCM mặc định: [lng, lat])
                    pickerMap = new mapboxgl.Map({
                        container: 'picker-map',
                        style: 'mapbox://styles/mapbox/streets-v12', // Style có đầy đủ tên đường
                        center: [106.36, 10.35], 
                        zoom: 13,
                        pitch: 45 // Tạo độ nghiêng 3D
                    });
                    
                    // Thêm thanh công cụ Zoom
                    pickerMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

                    // Lắng nghe sự kiện click
                    pickerMap.on('click', (e) => handleMapClick(e.lngLat.lat, e.lngLat.lng));
                }
                
                // Thay thế invalidateSize() của Leaflet bằng resize() của Mapbox
                pickerMap.resize(); 
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

        // ==========================================
        // EXPOSE CÁC HÀM RA WINDOW ĐỂ HTML NHÌN THẤY
        // (Sửa triệt để lỗi ReferenceError is not defined)
        // ==========================================
        window.openMapPicker = openMapPicker;
        window.closeMapPicker = closeMapPicker;
        window.searchMapLocation = searchMapLocation;
        window.selectSearchResult = selectSearchResult;
        window.quickSearch = quickSearch;
        window.getUserLocation = getUserLocation;
        window.confirmMapSelection = confirmMapSelection;