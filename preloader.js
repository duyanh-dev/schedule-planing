(() => {
  const root = document.getElementById('fl');
  if (!root) return;

  const html   = document.documentElement;
  const g      = window.gsap;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait   = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Điều kiện "đã sẵn sàng" ---------- */
  const MAX = 2600;   // chờ tải tối đa (ms), chậm hơn thì vẫn cất cánh
  const pageLoaded = new Promise((r) => {
    if (document.readyState === 'complete') r();
    else window.addEventListener('load', r, { once: true });
  });
  const ready   = Promise.race([pageLoaded, wait(MAX)]);
  const fontsOk = Promise.race([
    document.fonts ? document.fonts.load('700 64px Inter').catch(() => {}) : Promise.resolve(),
    wait(800)
  ]);

  const reveal = () => {
    root.classList.add('is-leaving');
    html.classList.remove('fl-lock');
    window.dispatchEvent(new Event('fl:reveal'));    // bắt đầu animation hero ở đây
  };
  const finish = () => {
    root.remove();
    html.classList.remove('fl-lock');
    window.dispatchEvent(new Event('fl:done'));
    if (window.AOS && typeof AOS.refresh === 'function') AOS.refresh();
  };

  /* Không có GSAP hoặc người dùng giảm chuyển động: chỉ mờ dần */
  if (!g || reduce) {
    ready.then(() => {
      reveal();
      root.style.transition = 'opacity .35s ease';
      root.style.opacity = '0';
      setTimeout(finish, 380);
    });
    return;
  }

  /* ---------- Phần tử ---------- */
  const $      = (s) => root.querySelector(s);
  const word   = $('#flWord');
  const by     = $('#flBy');
  const byTxt  = $('#flByTxt');
  const board  = $('#flBoard');
  const panel  = $('#flPanel');
  const sky    = $('#flSky');
  const plane  = $('#flPlane');
  const shadow = $('#flShadow');
  const ring   = $('#flRing');
  const lines  = root.querySelectorAll('.fl-by-line');

  /* tách chữ */
  const split = (el, cls) => {
    el.innerHTML = [...el.dataset.split]
      .map((c) => `<span class="${cls}" aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`)
      .join('');
    return [...el.children];
  };
  const chars   = split(word, 'fl-ch');
  const byChars = split(byTxt, 'fl-bc');
  byChars.slice(3).forEach((c) => c.classList.add('is-dev'));   // "duyanh.dev" đậm hơn

  /* dựng các cuộn ký tự của bảng chuyến bay */
  const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const counts = [];
  root.querySelectorAll('.fl-code').forEach((code) => {
    code.innerHTML = [...code.dataset.to].map((ch) => {
      const n = 11 + counts.length * 3;
      let items = '', prev = '';
      for (let k = 0; k < n; k++) {
        let c;
        do { c = POOL[Math.floor(Math.random() * 26)]; } while (c === prev);
        items += `<i>${c}</i>`;
        prev = c;
      }
      counts.push(n);
      return `<span class="fl-cell"><span class="fl-strip">${items}<i>${ch}</i></span></span>`;
    }).join('');
  });
  const stripEls = [...root.querySelectorAll('.fl-strip')];

  /* ---------- Chạy sau khi font sẵn sàng (để đo vị trí chữ chuẩn) ---------- */
  fontsOk.then(() => {
    const H0   = window.innerHeight;
    const fs   = parseFloat(getComputedStyle(word).fontSize);
    const lift = chars.map((el) => H0 - el.getBoundingClientRect().top + 40);
    const spots = chars.map((el) => {
      const r = el.getBoundingClientRect();
      return { el, x: r.left + r.width / 2, y: r.top + r.height / 2, hit: false };
    });

    g.set(chars, { transformOrigin: '50% 100%' });
    g.set([plane, shadow], { xPercent: -50, yPercent: -50 });

    /* ===== Mở đầu: chữ bay từ đáy lên, bảng cuộn, chữ ký hiện ===== */
    const intro = g.timeline();

    intro
      .fromTo(board,
        { opacity: 0, y: 14, scale: .94 },
        { opacity: 1, y: 0, scale: 1, duration: .8, ease: 'power3.out' }, .1)

      .fromTo(chars,
        { y: (i) => lift[i], scaleY: 1.45, rotation: () => g.utils.random(-9, 9), opacity: 1 },
        { y: 0, scaleY: 1, rotation: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: .045 }, 0)

      .fromTo(stripEls,
        { yPercent: 0 },
        { yPercent: (i) => -100 * counts[i] / (counts[i] + 1), duration: 1.15, ease: 'expo.out', stagger: .055 }, .25)

      .fromTo(lines,
        { scaleX: 0 },
        { scaleX: 1, duration: .9, ease: 'expo.out' }, .55)

      .fromTo(byChars,
        { y: 12, opacity: 0, filter: 'blur(6px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: .8, ease: 'power3.out', stagger: .035, clearProps: 'filter' }, .55);

    /* chờ đủ thời gian xem mở đầu VÀ trang đã sẵn sàng thì cất cánh */
    const gate = new Promise((r) => g.delayedCall(.9, r));
    Promise.all([gate, ready]).then(takeoff);

    /* ===== Cất cánh ===== */
    function takeoff() {
      const W = window.innerWidth, H = window.innerHeight;
      const P0 = { x: -.10 * W, y: .80 * H };
      const P1 = { x:  .34 * W, y: .98 * H };
      const P2 = { x:  .62 * W, y: .22 * H };
      const P3 = { x: 1.12 * W, y: -.18 * H };
      const d = `M${P0.x},${P0.y} C${P1.x},${P1.y} ${P2.x},${P2.y} ${P3.x},${P3.y}`;

      sky.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const trails = [...sky.querySelectorAll('.fl-trail')].map((el) => {
        const len = +el.dataset.len;
        el.setAttribute('d', d);
        el.style.strokeDasharray = `${len} 4`;
        el.style.strokeDashoffset = len;
        return { el, len };
      });
      const ref   = trails[0].el;
      const total = ref.getTotalLength();

      const mk = (el) => ({
        x: g.quickSetter(el, 'x', 'px'),
        y: g.quickSetter(el, 'y', 'px'),
        r: g.quickSetter(el, 'rotation', 'deg'),
        s: g.quickSetter(el, 'scale')
      });
      const pl = mk(plane);
      const sh = mk(shadow);
      g.set([plane, shadow], { opacity: 1 });

      const prog = { u: 0 };
      let ringFired = false;

      const drawTrail = () => trails.forEach((t) => { t.el.style.strokeDashoffset = t.len - prog.u; });

      const step = () => {
        const L = prog.u * total;
        const p = ref.getPointAtLength(L);
        const a = ref.getPointAtLength(Math.max(0, L - 3));
        const b = ref.getPointAtLength(Math.min(total, L + 3));
        const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        const sc  = .6 + .5 * prog.u;                   // to dần: bay về phía người xem

        pl.x(p.x); pl.y(p.y); pl.r(ang); pl.s(sc);
        sh.x(p.x + 22 * sc); sh.y(p.y + 34 * sc); sh.r(ang); sh.s(sc * .92);
        drawTrail();

        /* chữ nảy lên khi máy bay lướt qua */
        for (const s of spots) {
          if (!s.hit && Math.hypot(p.x - s.x, p.y - s.y) < fs * .95) {
            s.hit = true;
            g.to(s.el, { y: -fs * .13, duration: .16, ease: 'power2.out', yoyo: true, repeat: 1 });
          }
        }

        /* vòng sóng lan ra ở giữa màn hình */
        if (!ringFired && prog.u > .47) {
          ringFired = true;
          g.set(ring, { x: p.x, y: p.y });
          g.fromTo(ring, { scale: .15, opacity: .7 }, { scale: 4.2, opacity: 0, duration: 1.2, ease: 'expo.out' });
        }
      };

      const fly = g.timeline({ onComplete: finish });

      fly
        /* máy bay vút: tăng tốc dần */
        .to(prog, { u: 1, duration: .95, ease: 'power2.in', onUpdate: step }, 0)
        /* vệt khói thu lại sau khi máy bay đi khuất */
        .fromTo(prog, { u: 1 }, { u: 1.4, duration: .45, ease: 'power2.out', immediateRender: false, onUpdate: drawTrail }, .95)

        /* chữ + chữ ký + bảng bay lên và tan */
        .to(chars, { y: -30, opacity: 0, duration: .45, ease: 'power2.in', stagger: .018, overwrite: 'auto' }, .72)
        .to([by, board], { y: -16, opacity: 0, duration: .4, ease: 'power2.in', overwrite: 'auto' }, .72)

        /* tấm màn kéo lên, lộ trang */
        .call(reveal, null, .84)
        .to(panel, { y: () => -(window.innerHeight * 1.2), duration: 1, ease: 'power4.inOut' }, .84);
    }
  });
})();

// ==========================================
// SIDEBAR: CHỈ CHẠY ANIMATION ĐÚNG LÚC
// - PC: 1 lần sau khi preloader xong
// - Mobile: mỗi lần mở sidebar
// ==========================================
(function () {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    const html = document.documentElement;
    let timer;

    function run(ms) {
        clearTimeout(timer);
        sb.classList.remove('sb-run');
        void sb.offsetWidth;                 // reset để animation chạy lại từ đầu
        sb.classList.add('sb-run');
        timer = setTimeout(() => sb.classList.remove('sb-run'), ms);
    }

    // PC: chờ preloader gỡ fl-lock rồi mới chạy
    const intro = () => { if (window.innerWidth >= 768) run(2600); };
    if (html.classList.contains('fl-lock')) {
        const mo = new MutationObserver(() => {
            if (!html.classList.contains('fl-lock')) { mo.disconnect(); intro(); }
        });
        mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    } else {
        intro();
    }

    // Mobile: chạy mỗi lần sidebar chuyển từ đóng sang mở (kể cả khi vuốt)
    let wasOpen = !sb.classList.contains('-translate-x-full');
    new MutationObserver(() => {
        const open = !sb.classList.contains('-translate-x-full');
        if (open && !wasOpen && window.innerWidth < 768) run(1800);
        wasOpen = open;
    }).observe(sb, { attributes: true, attributeFilter: ['class'] });
})();