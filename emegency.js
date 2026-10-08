/* ===== TripPlanner – Modal thông tin khẩn cấp (Liquid Glass V2.1) =====
   - Cập nhật: Nút Gọi đồng nhất 1 màu (Slate-900), sang trọng, tối giản.
   - Độc lập hoàn toàn, không đụng logic cũ.
   - Mở bằng: [data-emergency-open] hoặc window.openEmergency('TH').       */
(function () {
  'use strict';

  /* Các khu vực */
  var REGIONS = {
    'AS': 'Châu Á',
    'EU': 'Châu Âu',
    'AM': 'Châu Mỹ',
    'OC': 'Châu Úc',
    'ME': 'Trung Đông'
  };

  /* Loại số: [icon, màu] */
  var T = {
    g: ['fa-phone-volume', '#ef4444'],          // khẩn cấp chung
    p: ['fa-shield-halved', '#3b82f6'],         // cảnh sát
    m: ['fa-truck-medical', '#ec4899'],         // cấp cứu y tế
    f: ['fa-fire-flame-curved', '#f97316'],     // cứu hỏa
    s: ['fa-life-ring', '#06b6d4'],             // cứu nạn / biển
    t: ['fa-headset', '#10b981'],               // hỗ trợ du khách
    o: ['fa-car-burst', '#64748b']              // khác
  };

  /* DATA: [mã, cờ, tên, khu_vực, [[loại, nhãn, số], ...], ghi chú] */
  var DATA = [
    ['VN', '🇻🇳', 'Việt Nam', 'AS', [['p', 'Công an', '113'], ['f', 'Cứu hỏa – Cứu nạn', '114'], ['m', 'Cấp cứu y tế', '115'], ['g', 'Tìm kiếm cứu nạn', '112']]],
    ['TH', '🇹🇭', 'Thái Lan', 'AS', [['p', 'Cảnh sát', '191'], ['m', 'Cấp cứu y tế', '1669'], ['f', 'Cứu hỏa', '199'], ['t', 'Cảnh sát du lịch', '1155'], ['t', 'Tổng đài TAT', '1672']], 'Cảnh sát du lịch (1155) có nhân viên nói tiếng Anh.'],
    ['KH', '🇰🇭', 'Campuchia', 'AS', [['p', 'Cảnh sát', '117'], ['f', 'Cứu hỏa', '118'], ['m', 'Cấp cứu y tế', '119']]],
    ['LA', '🇱🇦', 'Lào', 'AS', [['p', 'Cảnh sát', '191'], ['f', 'Cứu hỏa', '190'], ['m', 'Cấp cứu y tế', '195']]],
    ['MY', '🇲🇾', 'Malaysia', 'AS', [['g', 'Khẩn cấp chung', '999'], ['f', 'Cứu hỏa', '994'], ['g', 'Từ di động', '112']]],
    ['SG', '🇸🇬', 'Singapore', 'AS', [['p', 'Cảnh sát', '999'], ['m', 'Cấp cứu & Cứu hỏa', '995']]],
    ['ID', '🇮🇩', 'Indonesia', 'AS', [['p', 'Cảnh sát', '110'], ['m', 'Cấp cứu y tế', '118'], ['f', 'Cứu hỏa', '113'], ['s', 'Cứu nạn (SAR)', '115']]],
    ['PH', '🇵🇭', 'Philippines', 'AS', [['g', 'Khẩn cấp toàn quốc', '911']]],
    ['JP', '🇯🇵', 'Nhật Bản', 'AS', [['p', 'Cảnh sát', '110'], ['m', 'Cấp cứu & Cứu hỏa', '119'], ['s', 'Cảnh sát biển', '118'], ['t', 'Visitor Hotline', '+81 50 3816 2787']], 'Nói “Kyūkyū” (cấp cứu) hoặc “Kaji” (cháy).'],
    ['KR', '🇰🇷', 'Hàn Quốc', 'AS', [['p', 'Cảnh sát', '112'], ['m', 'Cấp cứu & Cứu hỏa', '119'], ['t', 'Travel Helpline', '1330']]],
    ['CN', '🇨🇳', 'Trung Quốc', 'AS', [['p', 'Cảnh sát', '110'], ['f', 'Cứu hỏa', '119'], ['m', 'Cấp cứu y tế', '120'], ['o', 'Tai nạn giao thông', '122']]],
    ['TW', '🇹🇼', 'Đài Loan', 'AS', [['p', 'Cảnh sát', '110'], ['m', 'Cấp cứu & Cứu hỏa', '119'], ['t', 'Du lịch (24/7)', '0800-011-765']]],
    ['HK', '🇭🇰', 'Hồng Kông', 'AS', [['g', 'Cảnh sát / Cứu hỏa', '999']]],
    ['IN', '🇮🇳', 'Ấn Độ', 'AS', [['g', 'Khẩn cấp', '112'], ['p', 'Cảnh sát', '100'], ['f', 'Cứu hỏa', '101'], ['m', 'Cấp cứu y tế', '102'], ['t', 'Đường dây du lịch', '1363']]],
    ['AE', '🇦🇪', 'UAE', 'ME', [['p', 'Cảnh sát', '999'], ['m', 'Cấp cứu y tế', '998'], ['f', 'Cứu hỏa', '997']]],
    ['TR', '🇹🇷', 'Thổ Nhĩ Kỳ', 'ME', [['g', 'Khẩn cấp chung', '112']]],
    ['GB', '🇬🇧', 'Anh Quốc', 'EU', [['g', 'Khẩn cấp', '999'], ['g', 'Khẩn cấp (EU)', '112']]],
    ['FR', '🇫🇷', 'Pháp', 'EU', [['g', 'Khẩn cấp châu Âu', '112'], ['p', 'Cảnh sát', '17'], ['m', 'Cấp cứu (SAMU)', '15'], ['f', 'Cứu hỏa', '18']]],
    ['DE', '🇩🇪', 'Đức', 'EU', [['p', 'Cảnh sát', '110'], ['m', 'Cấp cứu & Cứu hỏa', '112']]],
    ['IT', '🇮🇹', 'Ý', 'EU', [['g', 'Khẩn cấp châu Âu', '112'], ['p', 'Cảnh sát', '113'], ['m', 'Cấp cứu y tế', '118'], ['f', 'Cứu hỏa', '115']]],
    ['ES', '🇪🇸', 'Tây Ban Nha', 'EU', [['g', 'Khẩn cấp', '112']]],
    ['CH', '🇨🇭', 'Thụy Sĩ', 'EU', [['g', 'Khẩn cấp châu Âu', '112'], ['p', 'Cảnh sát', '117'], ['f', 'Cứu hỏa', '118'], ['m', 'Cấp cứu y tế', '144']]],
    ['US', '🇺🇸', 'Hoa Kỳ', 'AM', [['g', 'Khẩn cấp toàn quốc', '911']]],
    ['CA', '🇨🇦', 'Canada', 'AM', [['g', 'Khẩn cấp toàn quốc', '911']]],
    ['AU', '🇦🇺', 'Úc', 'OC', [['g', 'Khẩn cấp chung', '000'], ['g', 'Từ di động', '112']]],
    ['NZ', '🇳🇿', 'New Zealand', 'OC', [['g', 'Khẩn cấp toàn quốc', '111']]]
  ];

  var CONSULAR = '+84 981 84 84 84'; 
  var KEY = 'tp-emergency-last';

  /* ---------- CSS ---------- */
  var css = `
  .em-ov { position: fixed; inset: 0; z-index: 9500; display: flex; align-items: flex-end; justify-content: center; padding: 0; background: rgba(15,23,42,.4); -webkit-backdrop-filter: blur(16px) saturate(1.3); backdrop-filter: blur(16px) saturate(1.3); opacity: 0; pointer-events: none; transition: opacity .35s ease; }
  .em-ov.is-open { opacity: 1; pointer-events: auto; }
  .em-panel { position: relative; width: 100%; max-height: 92dvh; display: flex; flex-direction: column; overflow: hidden; border-radius: 2rem 2rem 0 0; border: 1px solid rgba(255,255,255,.75); background: linear-gradient(150deg, rgba(255,255,255,.75), rgba(255,255,255,.4)); box-shadow: 0 30px 80px rgba(15,23,42,.3), inset 0 2px 6px rgba(255,255,255,.9); transform: translateY(40px) scale(.98); transition: transform .55s cubic-bezier(.32,.72,0,1); }
  .em-ov.is-open .em-panel { transform: none; }
  
  /* Background blurs */
  .em-panel::before, .em-panel::after { content: ""; position: absolute; border-radius: 50%; pointer-events: none; filter: blur(40px); z-index: 0; }
  .em-panel::before { width: 260px; height: 260px; top: -90px; right: -70px; background: radial-gradient(circle, rgba(244,63,94,.3), transparent 70%); }
  .em-panel::after { width: 280px; height: 280px; bottom: -110px; left: -80px; background: radial-gradient(circle, rgba(59,130,246,.25), transparent 70%); }
  .em-panel > * { position: relative; z-index: 1; }
  
  /* Header */
  .em-head { display: flex; align-items: center; gap: .75rem; padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,.6); background: rgba(255,255,255,.4); }
  .em-sos { width: 2.75rem; height: 2.75rem; flex-shrink: 0; border-radius: .9rem; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.1rem; background: linear-gradient(145deg, #fb7185, #e11d48); border: 1px solid rgba(255,255,255,.6);}
  .em-ttl { flex: 1; } .em-ttl h2 { margin: 0; font-size: 1.1rem; font-weight: 900; color: #0f172a; } .em-ttl p { margin: 0; font-size: .7rem; font-weight: 600; color: #64748b; }
  .em-x { width: 2.2rem; height: 2.2rem; border-radius: 50%; border: 1px solid rgba(255,255,255,.9); background: rgba(255,255,255,.7); color: #64748b; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform .2s; }
  .em-x:active { transform: scale(.9); }
  
  /* Body & Dropdowns (Liquid Glass style) */
  .em-body { flex: 1; overflow-y: auto; padding: 1.25rem; scrollbar-width: none; }
  .em-body::-webkit-scrollbar { display: none; }
  .em-pick { display: flex; gap: .75rem; margin-bottom: 1.25rem; }
  .em-sel-box { flex: 1; position: relative; background: rgba(255,255,255,.5); border: 1.5px solid rgba(255,255,255,.8); border-radius: 1.25rem; padding: .5rem .75rem; box-shadow: inset 0 2px 5px rgba(255,255,255,1), 0 4px 10px rgba(0,0,0,.03); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
  .em-sel-box label { display: block; font-size: .6rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: .2rem; }
  .em-sel-box select { width: 100%; appearance: none; -webkit-appearance: none; border: 0; background: transparent; font: 800 .95rem Inter, sans-serif; color: #0f172a; outline: none; padding-right: 1.2rem; }
  .em-sel-box i { position: absolute; right: .8rem; bottom: .7rem; font-size: .8rem; color: #64748b; pointer-events: none; }
  
  /* Grid & Card Container */
  .em-grid { display: flex; flex-direction: column; gap: .75rem; }
  .em-card { --c: #ef4444; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .85rem 1rem; border-radius: 1.25rem; border: 1px solid rgba(255,255,255,.9); background: linear-gradient(145deg, rgba(255,255,255,.8), rgba(255,255,255,.5)); box-shadow: 0 8px 22px rgba(15,23,42,.04), inset 0 2px 5px rgba(255,255,255,1); }
  .em-card::after { content: ""; position: absolute; width: 80px; height: 80px; left: -20px; top: -20px; border-radius: 50%; background: radial-gradient(circle, var(--c), transparent 70%); opacity: .15; pointer-events: none; }
  
  /* Thông tin bên trái */
  .em-info { display: flex; align-items: center; gap: .85rem; flex: 1; min-width: 0; }
  .em-ic { width: 2.2rem; height: 2.2rem; border-radius: .75rem; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1rem; background: var(--c); border: 1.5px solid rgba(255,255,255,.6); }
  .em-text { flex: 1; min-width: 0; }
  .em-lb { font-size: .7rem; font-weight: 700; color: #64748b; margin-bottom: .1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .em-no { font-size: 1.3rem; font-weight: 900; color: #0f172a; line-height: 1; }
  
  /* Nút Gọi Liquid Glass đồng nhất 1 màu Slate-900 */
  .em-btn-call { flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: .35rem; padding: .6rem 1.1rem; border-radius: 99px; background: linear-gradient(135deg, rgba(255,255,255,.9), rgba(255,255,255,.4)); border: 1.5px solid rgba(255,255,255,1); box-shadow: 0 4px 15px rgba(0,0,0,.05), inset 0 2px 4px rgba(255,255,255,1); font-size: .75rem; font-weight: 800; color: #0f172a; cursor: pointer; transition: all .2s; }
  .em-btn-call:active { transform: scale(.92); }
  .em-btn-call:hover { background: rgba(255,255,255,1); box-shadow: 0 4px 15px rgba(0,0,0,.1), inset 0 2px 4px rgba(255,255,255,1); }
  
  /* Extra Info */
  .em-note, .em-consular { margin-top: .8rem; border-radius: 1.25rem; padding: .85rem 1rem; font-size: .75rem; font-weight: 600; line-height: 1.5; border: 1px solid rgba(255,255,255,.9); box-shadow: inset 0 2px 5px rgba(255,255,255,.6); }
  .em-note { background: rgba(251,191,36,.25); color: #92400e; }
  .em-consular { display: flex; align-items: center; gap: .75rem; text-decoration: none; color: #9f1239; background: linear-gradient(145deg, rgba(244,63,94,.15), rgba(244,63,94,.05)); }
  .em-consular b { display: block; font-size: 1rem; font-weight: 900; color: #be123c; margin-top: .1rem; }
  .em-foot { padding: .85rem 1.25rem calc(.85rem + env(safe-area-inset-bottom,0px)); border-top: 1px solid rgba(255,255,255,.6); background: rgba(255,255,255,.4); font-size: .65rem; font-weight: 600; color: #64748b; line-height: 1.45; text-align: center; }
  
  /* ---------- Confirm Modal (Layer 2) ---------- */
  .em-cf-ov { position: absolute; inset: 0; z-index: 9600; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.2); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); opacity: 0; pointer-events: none; transition: opacity .25s ease; border-radius: 2rem 2rem 0 0; }
  .em-cf-ov.is-show { opacity: 1; pointer-events: auto; }
  .em-cf-box { width: 85%; max-width: 300px; background: rgba(255,255,255,.85); border: 1px solid rgba(255,255,255,1); border-radius: 1.5rem; padding: 1.5rem; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,.1), inset 0 2px 5px rgba(255,255,255,1); transform: scale(.95); transition: transform .3s cubic-bezier(.34,1.56,.64,1); }
  .em-cf-ov.is-show .em-cf-box { transform: scale(1); }
  .em-cf-ic { width: 3rem; height: 3rem; margin: 0 auto 1rem; border-radius: 50%; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: 0 8px 16px rgba(15,23,42,.2), inset 0 2px 4px rgba(255,255,255,.3); border: 2px solid #fff; }
  .em-cf-box h3 { margin: 0 0 .5rem; font-size: 1.1rem; font-weight: 900; color: #0f172a; }
  .em-cf-box p { margin: 0 0 1.25rem; font-size: .8rem; color: #64748b; font-weight: 600; line-height: 1.4; }
  .em-cf-box b { color: #0f172a; }
  .em-cf-box .big-no { display: block; font-size: 1.5rem; font-weight: 900; color: #0f172a; margin-top: .25rem; letter-spacing: -0.02em; }
  .em-cf-btns { display: flex; gap: .75rem; }
  .em-cf-btn { flex: 1; padding: .75rem; border-radius: 1rem; font-size: .85rem; font-weight: 800; cursor: pointer; border: 1.5px solid transparent; transition: transform .2s; }
  .em-cf-btn:active { transform: scale(.95); }
  .em-cf-cancel { background: rgba(226,232,240,.6); color: #475569; border-color: rgba(255,255,255,.8); }
  .em-cf-call { background: #0f172a; color: #fff; box-shadow: 0 6px 15px rgba(15,23,42,.3); }

  @media(min-width: 768px){ .em-ov { align-items: center; padding: 1.5rem; } .em-panel { max-width: 28rem; max-height: 86vh; border-radius: 2rem; } .em-cf-ov { border-radius: 2rem; } }
  `;

  var st = document.createElement('style');
  st.id = 'em-style';
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- Modal HTML ---------- */
  var ov = document.createElement('div');
  ov.className = 'em-ov';
  ov.innerHTML = `
    <div class="em-panel">
      <div class="em-head">
        <div class="em-sos"><i class="fa-solid fa-truck-medical"></i></div>
        <div class="em-ttl"><h2>Thông tin khẩn cấp</h2><p>Tra cứu nhanh các số điện thoại</p></div>
        <button type="button" class="em-x"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="em-body">
        <div class="em-pick">
          <div class="em-sel-box">
            <label>Khu vực</label>
            <select id="em-reg"></select><i class="fa-solid fa-chevron-down"></i>
          </div>
          <div class="em-sel-box">
            <label>Quốc gia</label>
            <select id="em-cou"></select><i class="fa-solid fa-chevron-down"></i>
          </div>
        </div>
        <div class="em-grid"></div>
        <div class="em-extra"></div>
      </div>
      <div class="em-foot">Dữ liệu tham khảo cập nhật 10/2026. Ở nhiều nước, bấm 112 từ di động vẫn kết nối được tổng đài khẩn cấp.</div>
      
      <!-- Lớp Confirm Đè lên -->
      <div class="em-cf-ov" id="em-cf">
        <div class="em-cf-box">
          <div class="em-cf-ic"><i class="fa-solid fa-phone-volume"></i></div>
          <h3>Thực hiện cuộc gọi?</h3>
          <p>Bạn sắp gọi cho bộ phận <b><span id="em-cf-lb"></span></b><span class="big-no" id="em-cf-no"></span></p>
          <div class="em-cf-btns">
            <button class="em-cf-btn em-cf-cancel" id="btn-cf-cancel">Hủy</button>
            <button class="em-cf-btn em-cf-call" id="btn-cf-call">Gọi ngay</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(ov);

  /* ---------- Logic Elements ---------- */
  var regSel = ov.querySelector('#em-reg');
  var couSel = ov.querySelector('#em-cou');
  var grid = ov.querySelector('.em-grid');
  var extra = ov.querySelector('.em-extra');
  
  var cfOv = ov.querySelector('#em-cf');
  var cfLb = ov.querySelector('#em-cf-lb');
  var cfNo = ov.querySelector('#em-cf-no');
  var btnCancel = ov.querySelector('#btn-cf-cancel');
  var btnCall = ov.querySelector('#btn-cf-call');
  
  var pendingCallNumber = '';

  /* Khởi tạo danh sách Khu vực */
  function initRegions() {
    regSel.innerHTML = Object.keys(REGIONS).map(function(k) {
      return '<option value="' + k + '">' + REGIONS[k] + '</option>';
    }).join('');
  }

  /* Cập nhật danh sách Quốc gia dựa trên Khu vực */
  function updateCountries(regionCode) {
    var filtered = DATA.filter(function(d) { return d[3] === regionCode; });
    couSel.innerHTML = filtered.map(function(d) {
      return '<option value="' + d[0] + '">' + d[1] + ' ' + d[2] + '</option>';
    }).join('');
  }

  function tel(n) { return 'tel:' + n.replace(/[^\d+]/g, ''); }

  /* Render thông tin quốc gia */
  function render(code) {
    var d = DATA.filter(function (x) { return x[0] === code; })[0] || DATA[0];
    
    // Sync Selects
    regSel.value = d[3];
    updateCountries(d[3]);
    couSel.value = d[0];

    // Render Cards (Chỉ là thẻ chứa, nút gọi tách rời)
    grid.innerHTML = d[4].map(function (r) {
      var t = T[r[0]] || T.o;
      return `
        <div class="em-card" style="--c:${t[1]}">
          <div class="em-info">
            <div class="em-ic"><i class="fa-solid ${t[0]}"></i></div>
            <div class="em-text">
              <div class="em-lb">${r[1]}</div>
              <div class="em-no">${r[2]}</div>
            </div>
          </div>
          <button class="em-btn-call" data-label="${r[1]}" data-number="${r[2]}">
            <i class="fa-solid fa-phone"></i> Gọi
          </button>
        </div>`;
    }).join('');

    // Render Extra (Ghi chú & Lãnh sự)
    var h = '';
    if (d[5]) h += '<div class="em-note"><i class="fa-solid fa-circle-info"></i> ' + d[5] + '</div>';
    if (d[0] !== 'VN') {
      h += `
        <a class="em-consular" href="${tel(CONSULAR)}">
          <i class="fa-solid fa-flag" style="font-size:1.2rem"></i>
          <span>Bảo hộ công dân Việt Nam (24/7)<b>${CONSULAR}</b></span>
        </a>`;
    }
    extra.innerHTML = h;

    // Gắn sự kiện cho các nút gọi Liquid Glass
    var callBtns = grid.querySelectorAll('.em-btn-call');
    callBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var lbl = this.getAttribute('data-label');
        var num = this.getAttribute('data-number');
        showConfirm(lbl, num);
      });
    });

    try { localStorage.setItem(KEY, d[0]); } catch (e) {}
  }

  /* Logic Modal Confirm */
  function showConfirm(label, number) {
    cfLb.textContent = label;
    cfNo.textContent = number;
    pendingCallNumber = number;
    cfOv.classList.add('is-show');
  }
  function hideConfirm() {
    cfOv.classList.remove('is-show');
    pendingCallNumber = '';
  }
  btnCancel.addEventListener('click', hideConfirm);
  btnCall.addEventListener('click', function() {
    if (pendingCallNumber) {
      window.location.href = tel(pendingCallNumber);
    }
    hideConfirm();
  });

  /* Main Modal Open/Close */
  function open(code) {
    if (!regSel.options.length) initRegions();
    var c = code;
    if (!c) { try { c = localStorage.getItem(KEY); } catch (e) {} }
    render((c || 'VN').toUpperCase());
    ov.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
  }
  function close() {
    ov.classList.remove('is-open');
    hideConfirm(); // Ẩn luôn confirm nếu đang mở
    document.documentElement.style.overflow = '';
  }

  /* Events Dropdown */
  regSel.addEventListener('change', function () {
    updateCountries(this.value);
    render(couSel.value); // Tự động load quốc gia đầu tiên của khu vực đó
  });
  couSel.addEventListener('change', function () {
    render(this.value);
  });

  /* Events Close */
  ov.querySelector('.em-x').addEventListener('click', close);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('is-open')) close(); });
  
  /* Trigger Button */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-emergency-open]');
    if (b) { e.preventDefault(); open(b.getAttribute('data-emergency-open') || ''); }
  });

  window.openEmergency = open;
  window.closeEmergency = close;
})();