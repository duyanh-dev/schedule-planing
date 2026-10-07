// ==========================================
        // MAP PICKER LOGIC (MAPBOX GL JS + 3 TRIPLE SEARCH ENGINE)
        // ==========================================
        
        // 3 MÃ API KEY CỦA BẠN
        const API_KEYS = {
            goong: "Vi4JcmuvyIZzDMeUmlVIfGjXCL7TiVSkkvwYzEBS",
            longdo: "c09a102940e530988efd5c43af1c5237",
            mapbox: "pk.eyJ1Ijoia3dlaXRlaSIsImEiOiJjbXV2N2JvdmgwMThiMnlxMmowMXR3eDV5In0.rNVMC-UhJOxVf58JDThU_A"
        };
        
        mapboxgl.accessToken = API_KEYS.mapbox;

        let pickerMap = null;
        let pickerMarker = null;
        let mapSearchResults = [];
        let currentMapRegion = "vn"; // Mặc định là Việt Nam

       // preventFly = true sẽ giúp bản đồ không bị giật nhảy khi hệ thống tự động đổi vùng
        const setMapRegion = (region, preventFly = false) => {
            currentMapRegion = region;

            const btns = ["vn", "th", "intl"];
            btns.forEach((r) => {
                const btn = document.getElementById(`btn-region-${r}`);
                if (!btn) return;
                if (r === region) {
                    btn.className = "px-3 py-1 bg-blue-600 text-white text-[10px] md:text-[11px] font-bold rounded-full shadow-md border border-blue-500/50 transition-all active:scale-95";
                } else {
                    btn.className = "px-3 py-1 bg-white/80 backdrop-blur-md text-slate-600 hover:bg-white text-[10px] md:text-[11px] font-bold rounded-full shadow-sm border border-white/60 transition-all active:scale-95";
                }
            });

            if (pickerMap && !preventFly) {
                if (region === "vn") pickerMap.flyTo({ center: [106.660172, 10.762622], zoom: 12, essential: true });
                else if (region === "th") pickerMap.flyTo({ center: [100.5018, 13.7563], zoom: 12, essential: true });
            }
            
            // Nếu người dùng tự bấm thì mới xóa ô search, máy tự nhảy thì giữ nguyên
            if (!preventFly) {
                document.getElementById("map-search-input").value = "";
                document.getElementById("search-results").classList.add("hidden");
            }
        };

        // --- HÀM PHỤ LÕI: GỌI API THEO VÙNG CHỈ ĐỊNH ---
        // --- HÀM PHỤ LÕI: GỌI API THEO VÙNG CHỈ ĐỊNH (Ép 100% Tiếng Anh cho Longdo) ---
        const executeSearchAPI = async (keyword, region) => {
            let url = "";
            if (region === "vn") {
                url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${API_KEYS.goong}&input=${encodeURIComponent(keyword)}&limit=6`;
            } else if (region === "th") {
                // ĐỔI SANG SUGGEST API (Giống hệt cách SDK Longdo làm để lấy Tiếng Anh)
                url = `https://search.longdo.com/mapsearch/json/suggest?keyword=${encodeURIComponent(keyword)}&key=${API_KEYS.longdo}`;
            } else {
                const center = pickerMap.getCenter();
                url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(keyword)}.json?access_token=${API_KEYS.mapbox}&language=vi&limit=6&proximity=${center.lng},${center.lat}`;
            }

            const res = await fetch(url, { headers: { "Accept-Language": "en-US,en;q=0.9" } });
            const data = await res.json();
            
            let formattedData = [];
            if (region === "vn" && data.predictions) {
                formattedData = data.predictions.map((p) => ({
                    source: "goong", id: p.place_id, 
                    title: p.structured_formatting.main_text, subtitle: p.structured_formatting.secondary_text || p.description
                }));
            } else if (region === "th" && data.data) {
                // Parse kết quả của Suggest API (w = word, d = description)
                formattedData = data.data.slice(0, 6).map((p) => ({
                    source: "longdo_suggest", // Đánh dấu là data suggest (chưa có tọa độ)
                    title: p.w || "Thailand Location", 
                    subtitle: p.d || ""
                }));
            } else if (region === "intl" && data.features) {
                formattedData = data.features.map((p) => ({
                    source: "mapbox", lat: p.center[1], lng: p.center[0], 
                    title: p.text, subtitle: p.place_name.replace(p.text + ", ", "")
                }));
            }
            return formattedData;
        };

        // --- 1. HÀM ĐẶT GHIM & HIỂN THỊ POPUP ---
        const placeMarkerAndPopup = (lat, lng, name) => {
            if (pickerMarker) pickerMarker.remove();
            
            const el = document.createElement('div');
            el.innerHTML = `
                <div class="bg-blue-600 text-white p-2 rounded-full shadow-2xl flex items-center justify-center w-8 h-8 ring-4 ring-blue-500/20 animate-bounce">
                    <i class="fa-solid fa-location-dot text-sm"></i>
                </div>
            `;
            
            const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
                .setHTML(`<div class="font-sans font-bold text-sm text-blue-700">${name}</div>`);

            pickerMarker = new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .setPopup(popup)
                .addTo(pickerMap);
            
            pickerMarker.togglePopup();
            
            if (typeof state !== 'undefined') state.currentPickedAddress = name;
            document.getElementById('map-selected-address').innerText = name;
            document.getElementById('btn-confirm-map').disabled = false;
        };

        // --- 2. HÀM KHI CHẠM VÀO BẢN ĐỒ (REVERSE GEOCODING) ---
        const handleMapClick = async (lat, lng) => {
            const loading = document.getElementById('map-loading');
            loading.classList.remove('hidden'); loading.classList.add('flex');
            
            try {
                let placeName = `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                
                // Ở Việt Nam dùng Goong để dịch tọa độ ra tên đường (cực chuẩn), còn lại dùng Mapbox
                if (currentMapRegion === "vn") {
                    const res = await fetch(`https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${API_KEYS.goong}`);
                    const data = await res.json();
                    if (data.results && data.results.length > 0) placeName = data.results[0].name || data.results[0].formatted_address;
                } else {
                    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&language=vi`;
                    const res = await fetch(url);
                    const data = await res.json();
                    if (data && data.features && data.features.length > 0) placeName = data.features[0].place_name;
                }
                
                placeMarkerAndPopup(lat, lng, placeName);
                pickerMap.flyTo({ center: [lng, lat], zoom: 16, essential: true }); 
            } catch (err) {
                console.error(err);
                placeMarkerAndPopup(lat, lng, `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            } finally {
                loading.classList.add('hidden'); loading.classList.remove('flex');
            }
        };

        // --- 3. HÀM TÌM KIẾM TỪ KHÓA (CÀN QUÉT THÔNG MINH AUTO-FALLBACK) ---
        const searchMapLocation = async (query = null) => {
            const keyword = query || document.getElementById('map-search-input').value.trim();
            if (!keyword) return;

            const resultsContainer = document.getElementById('search-results');
            const loading = document.getElementById('map-loading');
            const loadingText = loading.querySelector('span');
            
            loadingText.innerText = "Đang tìm kiếm...";
            loading.classList.remove('hidden'); loading.classList.add('flex');
            mapSearchResults = [];
            
            try {
                // BƯỚC 1: Tìm ở khu vực đang được chọn hiện tại
                let results = await executeSearchAPI(keyword, currentMapRegion);
                let foundRegion = currentMapRegion;
                let autoSwitched = false;

                // BƯỚC 2: Nếu không có kết quả, TỰ ĐỘNG CÀN QUÉT các vùng còn lại
                if (results.length === 0) {
                    loadingText.innerText = "Đang mở rộng tìm kiếm..."; // Thông báo cho người dùng
                    
                    const otherRegions = ["vn", "th", "intl"].filter(r => r !== currentMapRegion);
                    
                    for (let region of otherRegions) {
                        const fallbackResults = await executeSearchAPI(keyword, region);
                        if (fallbackResults.length > 0) {
                            results = fallbackResults;
                            foundRegion = region;
                            autoSwitched = true;
                            // Đổi màu UI sang vùng vừa tìm thấy (không bay bản đồ)
                            setMapRegion(region, true); 
                            break;
                        }
                    }
                }

                mapSearchResults = results;
                
                // BƯỚC 3: Hiển thị kết quả ra màn hình
                if (results.length > 0) {
                    let htmlContent = results.map((item, index) => {
                        return `
                        <div onclick="selectSearchResult(${index})" class="p-2.5 md:p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-2.5">
                            <div class="w-7 h-7 rounded-full bg-slate-200/80 flex items-center justify-center flex-shrink-0 text-slate-500"><i class="fa-solid fa-location-dot text-[10px]"></i></div>
                            <div class="flex-1 min-w-0">
                                <div class="font-bold text-xs md:text-sm text-slate-800 truncate">${item.title}</div>
                                <div class="text-[10px] md:text-[11px] text-slate-500 truncate mt-0.5">${item.subtitle}</div>
                            </div>
                        </div>
                    `}).join('');

                    // Thêm Banner báo hiệu hệ thống vừa tự động nhảy vùng
                    if (autoSwitched) {
                        const regionNames = { vn: "Việt Nam", th: "Thái Lan", intl: "Quốc tế" };
                        htmlContent = `
                            <div class="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] md:text-xs font-bold text-center border-b border-blue-100 flex items-center justify-center gap-1.5">
                                <i class="fa-solid fa-wand-magic-sparkles"></i>
                                Tự động chuyển vùng sang ${regionNames[foundRegion]}
                            </div>
                        ` + htmlContent;
                    }

                    resultsContainer.innerHTML = htmlContent;
                    resultsContainer.classList.remove('hidden');
                } else {
                    resultsContainer.innerHTML = '<div class="p-4 text-xs md:text-sm text-slate-500 text-center font-bold">Không tìm thấy địa điểm này trên hệ thống</div>';
                    resultsContainer.classList.remove('hidden');
                }
            } catch (err) {
                console.error(err);
                resultsContainer.innerHTML = '<div class="p-4 text-xs md:text-sm text-red-500 text-center font-bold">Lỗi kết nối. Vui lòng thử lại.</div>';
                resultsContainer.classList.remove('hidden');
            } finally {
                loading.classList.add('hidden'); loading.classList.remove('flex');
            }
        };

        // --- 4. HÀM MỞ GOOGLE MAPS ---
        const openGoogleMaps = (from, to) => {
            let url = 'https://www.google.com/maps/dir/?api=1';
            if (from && to) url += `&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;
            else if (to) url += `&destination=${encodeURIComponent(to)}`;
            else if (from) url += `&destination=${encodeURIComponent(from)}`;
            if(from || to) window.open(url, '_blank');
        };

        // --- 5. CHỌN KẾT QUẢ TÌM KIẾM ---
        // --- 5. CHỌN KẾT QUẢ TÌM KIẾM (Xử lý 2 bước cho Goong và Longdo) ---
        const selectSearchResult = async (index) => {
            const item = mapSearchResults[index];
            document.getElementById('search-results').classList.add('hidden');
            document.getElementById('map-search-input').value = item.title;

            const loading = document.getElementById('map-loading');
            
            // Trường hợp 1: Goong (Phải gọi API để đổi ID lấy GPS)
            if (item.source === "goong") {
                loading.querySelector('span').innerText = "Đang lấy tọa độ...";
                loading.classList.remove('hidden'); loading.classList.add('flex');
                try {
                    const res = await fetch(`https://rsapi.goong.io/Place/Detail?place_id=${item.id}&api_key=${API_KEYS.goong}`);
                    const data = await res.json();
                    if (data.result && data.result.geometry) {
                        const lat = data.result.geometry.location.lat;
                        const lng = data.result.geometry.location.lng;
                        pickerMap.flyTo({ center: [lng, lat], zoom: 16, essential: true });
                        placeMarkerAndPopup(lat, lng, item.title);
                    }
                } catch(e) { console.error(e); } 
                finally { loading.classList.add('hidden'); loading.classList.remove('flex'); }
            } 
            // Trường hợp 2: Longdo Suggest (Phải gọi API Search để lấy GPS)
            else if (item.source === "longdo_suggest") {
                loading.querySelector('span').innerText = "Đang định vị...";
                loading.classList.remove('hidden'); loading.classList.add('flex');
                try {
                    const res = await fetch(`https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent(item.title)}&key=${API_KEYS.longdo}&limit=1&lang=en`);
                    const data = await res.json();
                    if (data.data && data.data.length > 0) {
                        const lat = parseFloat(data.data[0].lat);
                        const lng = parseFloat(data.data[0].lon);
                        pickerMap.flyTo({ center: [lng, lat], zoom: 16, essential: true });
                        placeMarkerAndPopup(lat, lng, item.title);
                    } else {
                        alert("Không thể định vị chính xác địa điểm này trên bản đồ.");
                    }
                } catch(e) { console.error(e); } 
                finally { loading.classList.add('hidden'); loading.classList.remove('flex'); }
            } 
            // Trường hợp 3: Mapbox (Đã có sẵn GPS trong data)
            else {
                pickerMap.flyTo({ center: [item.lng, item.lat], zoom: 16, essential: true });
                placeMarkerAndPopup(item.lat, item.lng, item.title);
            }
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
                    
                    pickerMap.flyTo({ center: [lng, lat], zoom: 16, essential: true });
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
            if (typeof state !== 'undefined') {
                state.mapPickerTargetInput = targetInputId;
                state.currentPickedAddress = '';
            }
            
            document.getElementById('map-selected-address').innerText = 'Chạm vào bản đồ hoặc tìm kiếm...';
            document.getElementById('btn-confirm-map').disabled = true;
            document.getElementById('map-search-input').value = '';
            document.getElementById('search-results').classList.add('hidden');
            
            const modal = document.getElementById('map-picker-modal');
            modal.classList.add('active'); 

            setTimeout(() => {
                if (!pickerMap) {
                    pickerMap = new mapboxgl.Map({
                        container: 'picker-map',
                        style: 'mapbox://styles/mapbox/streets-v12', 
                        center: [106.36, 10.35], 
                        zoom: 13,
                        pitch: 45 
                    });
                    
                    pickerMap.addControl(new mapboxgl.NavigationControl(), 'top-right');
                    pickerMap.on('click', (e) => handleMapClick(e.lngLat.lat, e.lngLat.lng));
                }
                
                pickerMap.resize(); 
            }, 350); 
        };

        const closeMapPicker = () => {
            document.getElementById('map-picker-modal').classList.remove('active');
        };

        const confirmMapSelection = () => {
            if (typeof state !== 'undefined' && state.currentPickedAddress && state.mapPickerTargetInput) {
                const inputEl = document.getElementById(state.mapPickerTargetInput);
                if(inputEl) {
                    inputEl.value = state.currentPickedAddress;
                    inputEl.dispatchEvent(new Event("input"));
                }
            }
            closeMapPicker();
        };

        // ==========================================
        // EXPOSE CÁC HÀM RA WINDOW 
        // ==========================================
        window.setMapRegion = setMapRegion;
        window.searchMapLocation = searchMapLocation;
        window.openMapPicker = openMapPicker;
        window.closeMapPicker = closeMapPicker;
        window.searchMapLocation = searchMapLocation;
        window.selectSearchResult = selectSearchResult;
        window.quickSearch = quickSearch;
        window.getUserLocation = getUserLocation;
        window.confirmMapSelection = confirmMapSelection;

        