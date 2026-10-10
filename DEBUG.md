 <!-- ========== DEBUG MÀU THANH SAFARI (xóa khi xong) ========== -->
<button id="dbg-btn" data-html2canvas-ignore
  style="position:fixed;left:10px;top:45%;z-index:99999;width:44px;height:44px;border-radius:50%;border:2px solid #fff;background:#111;color:#fff;font-size:20px;box-shadow:0 4px 14px rgba(0,0,0,.4)">🎨</button>

<div id="dbg-panel" data-html2canvas-ignore
  style="display:none;position:fixed;left:8px;right:8px;top:12%;bottom:12%;z-index:99999;background:#fff;color:#111;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.45);font:12px/1.4 -apple-system,sans-serif;overflow:hidden;flex-direction:column">
  <div style="display:flex;gap:6px;padding:8px;border-bottom:1px solid #ddd">
    <button id="dbg-scan" style="flex:1;padding:8px;border-radius:8px;border:0;background:#2563eb;color:#fff;font-weight:700">Quét lại</button>
    <button id="dbg-copy" style="flex:1;padding:8px;border-radius:8px;border:0;background:#059669;color:#fff;font-weight:700">Copy</button>
    <button id="dbg-close" style="padding:8px 12px;border-radius:8px;border:0;background:#e5e7eb;font-weight:700">✕</button>
  </div>
  <div id="dbg-out" style="flex:1;overflow:auto;padding:8px;-webkit-overflow-scrolling:touch"></div>
</div>

<script>
(function () {
  const $ = id => document.getElementById(id);
  const isDbg = el => el.closest && el.closest('#dbg-btn,#dbg-panel');
  const esc = s => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

  const parse = s => {
    const m = (s || '').match(/[\d.]+/g) || [0,0,0,0];
    return [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]];
  };
  const hex = s => {
    const [r,g,b,a] = parse(s);
    const h = n => Math.round(n).toString(16).padStart(2,'0');
    return `#${h(r)}${h(g)}${h(b)}` + (a < 1 ? ` (a=${a.toFixed(2)})` : '');
  };
  const swatch = c =>
    `<span style="display:inline-block;width:14px;height:14px;border:1px solid #888;border-radius:3px;vertical-align:-2px;background:${c};
     background-image:linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,#fff 25%,#fff 75%,#ccc 75%);background-size:6px 6px;background-position:0 0,3px 3px;position:relative"></span>
     <span style="display:inline-block;width:14px;height:14px;margin-left:-14px;border-radius:3px;vertical-align:-2px;background:${c}"></span>`;

  const name = el => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (el.classList.length) s += '.' + [...el.classList].slice(0,2).join('.');
    return s;
  };

  const effBg = el => {
    while (el) {
      const c = getComputedStyle(el).backgroundColor;
      if (parse(c)[3] > 0) return { c, el };
      el = el.parentElement;
    }
    return null;
  };

  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);

  function scan() {
    const vw = innerWidth, vh = innerHeight;
    const vv = window.visualViewport;
    const cs = getComputedStyle(probe);
    const lines = [];
    const log = (h) => lines.push(h);

    log(`<b>📐 Viewport</b><br>innerHeight: ${vh} | visualViewport: ${vv ? vv.height.toFixed(1) : 'n/a'} | clientHeight: ${document.documentElement.clientHeight}<br>safe-area top: ${cs.paddingTop} | bottom: ${cs.paddingBottom}`);

    const h = getComputedStyle(document.documentElement).backgroundColor;
    const b = getComputedStyle(document.body).backgroundColor;
    log(`<b>🎨 Nền trang</b><br>html: ${swatch(h)} ${hex(h)}<br>body: ${swatch(b)} ${hex(b)}`);

    const tc = [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content + (m.media ? ` [${m.media}]` : ''));
    log(`<b>🏷 theme-color</b>: ${tc.length ? esc(tc.join(' | ')) : '(không có)'}`);

    const at = (y) => {
      const els = document.elementsFromPoint(vw / 2, y).filter(e => !isDbg(e));
      return els.slice(0, 3).map(e => {
        const eb = effBg(e);
        return `${esc(name(e))} → ${eb ? swatch(eb.c) + ' ' + hex(eb.c) + ' (từ ' + esc(name(eb.el)) + ')' : 'trong suốt'}`;
      }).join('<br>&nbsp;&nbsp;');
    };
    log(`<b>⬆️ Pixel sát mép TRÊN (y=1)</b><br>&nbsp;&nbsp;${at(1)}`);
    log(`<b>⬇️ Pixel sát mép DƯỚI (y=${vh - 2})</b><br>&nbsp;&nbsp;${at(vh - 2)}`);

    const cands = [...document.querySelectorAll('body *')].filter(el => {
      if (isDbg(el)) return false;
      const p = getComputedStyle(el).position;
      return p === 'fixed' || p === 'sticky';
    });

    log(`<b>📌 Phần tử fixed/sticky (${cands.length})</b>`);
    cands.forEach((el, i) => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      const top = r.top <= 8, bot = r.bottom >= vh - 8;
      const wide = r.width >= vw * 0.8;
      const hidden = s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0;
      const bd = s.backdropFilter || s.webkitBackdropFilter || 'none';
      const flag = (top || bot) && wide
        ? (hidden ? '🟡' : '🔴') : '⚪';
      el.dataset.dbgId = i;
      log(`<div style="border:1px solid #ddd;border-radius:8px;padding:6px;margin:4px 0;${(top||bot)&&wide&&!hidden?'background:#fee2e2':''}">
        ${flag} <b>${esc(name(el))}</b><br>
        ${top ? '⬆️chạm mép trên ' : ''}${bot ? '⬇️chạm mép dưới ' : ''}${wide ? 'rộng ' + Math.round(r.width/vw*100) + '%' : 'hẹp'}<br>
        top:${r.top.toFixed(0)} bottom:${r.bottom.toFixed(0)} h:${r.height.toFixed(0)}<br>
        display:${s.display} vis:${s.visibility} opacity:${s.opacity} z:${s.zIndex}<br>
        bg: ${swatch(s.backgroundColor)} ${hex(s.backgroundColor)}<br>
        backdrop: ${esc(bd)}<br>
        <button data-hide="${i}" style="margin-top:4px;padding:5px 10px;border-radius:6px;border:0;background:#111;color:#fff">Ẩn thử</button>
      </div>`);
    });
    log(`<small>🔴 = chạm mép + rộng + đang hiển thị (nghi phạm chính)<br>🟡 = chạm mép nhưng đang ẩn<br>Ẩn thử → vuốt/cuộn nhẹ 1px → nhìn màu thanh có đổi không.</small>`);

    $('dbg-out').innerHTML = lines.map(l => `<div style="margin-bottom:10px">${l}</div>`).join('');

    $('dbg-out').querySelectorAll('[data-hide]').forEach(btn => {
      btn.onclick = () => {
        const el = document.querySelector(`[data-dbg-id="${btn.dataset.hide}"]`);
        if (!el) return;
        const off = el.dataset.dbgHidden === '1';
        if (off) {
          el.style.removeProperty('display');
          el.dataset.dbgHidden = '0';
          btn.textContent = 'Ẩn thử';
        } else {
          el.style.setProperty('display', 'none', 'important');
          el.dataset.dbgHidden = '1';
          btn.textContent = 'Đang ẩn – bấm để hiện';
        }
        window.scrollBy(0, 1); setTimeout(() => window.scrollBy(0, -1), 60);
      };
    });
  }

  $('dbg-btn').onclick = () => { $('dbg-panel').style.display = 'flex'; scan(); };
  $('dbg-scan').onclick = scan;
  $('dbg-close').onclick = () => { $('dbg-panel').style.display = 'none'; };
  $('dbg-copy').onclick = () => {
    const t = $('dbg-out').innerText;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject())
      .then(() => alert('Đã copy'), () => alert('Không copy được'));
  };
})();
</script>