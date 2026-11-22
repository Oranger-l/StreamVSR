/* StreamVSR project page interactions (no dependencies). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const inView = (el, cb, opts = { rootMargin: '200px' }) => {
    const io = new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting, e.target)), opts);
    io.observe(el); return io;
  };

  /* ---------- hero mosaic ---------- */
  const mosaic = $('#mosaic');
  if (mosaic && window.HERO) {
    const ids = window.HERO;
    for (let r = 0; r < 3; r++) {
      const row = document.createElement('div'); row.className = 'row';
      const part = ids.slice(r * 8, r * 8 + 8);
      [...part, ...part].forEach((id) => {
        const im = new Image(); im.src = `static/img/hero/${id}.jpg`; im.alt = ''; im.decoding = 'async';
        row.appendChild(im);
      });
      mosaic.appendChild(row);
    }
  }

  /* ---------- nav: solid after hero, active section ---------- */
  const nav = $('#topnav'), hero = $('.hero');
  const onScroll = () => nav.classList.toggle('solid', window.scrollY > hero.offsetHeight - 80);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const links = $$('.topnav .links a');
  const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const spy = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      const act = links.find((a) => a.classList.contains('active'));
      if (act) act.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));

  /* ---------- reveal on scroll ---------- */
  $$('.reveal').forEach((el) => {
    const io = inView(el, (vis) => { if (vis) { el.classList.add('in'); io.disconnect(); } }, { rootMargin: '0px 0px -8% 0px' });
  });

  /* ---------- comparison sliders (images and synced videos) ---------- */
  $$('[data-cmp]').forEach((box) => {
    const top = $('.top', box), bar = $('.bar', box), knob = $('.knob', box);
    const set = (p) => {
      p = Math.max(0, Math.min(100, p));
      top.style.clipPath = `inset(0 0 0 ${p}%)`; bar.style.left = p + '%'; knob.style.left = p + '%';
    };
    const fromEvent = (e) => {
      const r = box.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      set((x / r.width) * 100); box.classList.add('touched');
    };
    let drag = false;
    box.addEventListener('pointerdown', (e) => { drag = true; box.setPointerCapture(e.pointerId); fromEvent(e); });
    box.addEventListener('pointermove', (e) => { if (drag || e.pointerType === 'mouse') fromEvent(e); });
    box.addEventListener('pointerup', () => { drag = false; });
    box.addEventListener('pointerleave', () => { drag = false; });
    set(50);

    if (box.hasAttribute('data-video')) {
      const [a, b] = $$('video', box);
      const sync = () => { if (Math.abs(a.currentTime - b.currentTime) > 0.06) b.currentTime = a.currentTime; };
      a.addEventListener('timeupdate', sync);
      a.addEventListener('seeked', sync);
      inView(box, (vis) => {
        if (vis) { b.currentTime = a.currentTime; a.play().catch(() => {}); b.play().catch(() => {}); }
        else { a.pause(); b.pause(); }
      }, { rootMargin: '0px' });
    }
  });

  /* ---------- chip groups ---------- */
  const chipGroup = (root, name, onChange) => {
    const g = $(`[data-group="${name}"]`, root);
    if (!g) return () => null;
    g.addEventListener('click', (e) => {
      const c = e.target.closest('.chip'); if (!c) return;
      $$('.chip', g).forEach((x) => x.classList.toggle('on', x === c)); onChange(c.dataset.v);
    });
    return () => $('.chip.on', g).dataset.v;
  };

  /* ---------- faces: StreamVSR vs. a chosen baseline ---------- */
  const faces = $('#faces');
  if (faces) {
    const NAMES = { sol_refiner: 'SoL-Refiner', flashvsr_plus_base: 'FlashVSR Base', dove: 'DOVE', seedvr2_3b: 'SeedVR2-3B', open_h3_regen: 'Open-H3-Regen', lr: 'Input (×4 nearest)', hr: 'HR reference' };
    const LPIPS = {
      14: { flashvsr_plus_base: .194, dove: .194, seedvr2_3b: .189, sol_refiner: .317, open_h3_regen: .339, ours: .123 },
      20: { flashvsr_plus_base: .142, dove: .123, seedvr2_3b: .152, sol_refiner: .286, open_h3_regen: .357, ours: .099 },
      30: { flashvsr_plus_base: .151, dove: .165, seedvr2_3b: .188, sol_refiner: .360, open_h3_regen: .344, ours: .125 },
    };
    const BOX = { 14: [69.17, 43.7, 30.83, 30.74], 20: [54.58, 43.7, 32.92, 32.59], 30: [31.67, 22.22, 30.21, 30.37] };
    let method = 'sol_refiner', frame = '14';
    const render = () => {
      $('#faces-left').src = `static/img/faces/f${frame}_${method}.jpg`;
      $('#faces-right').src = `static/img/faces/f${frame}_streamvsr.jpg`;
      $('#faces-ctx').src = `static/img/faces/f${frame}_context.jpg`;
      $('#faces-llab').textContent = NAMES[method];
      $('#faces-left').classList.toggle('pixel', method === 'lr');
      const [x, y, w, h] = BOX[frame], bx = $('#faces-box');
      Object.assign(bx.style, { left: x + '%', top: y + '%', width: w + '%', height: h + '%' });
      const L = LPIPS[frame], m = $('#faces-metric');
      m.innerHTML = (method in L)
        ? `Crop LPIPS: ${NAMES[method]} <b>${L[method].toFixed(3)}</b> · StreamVSR <b class="good">${L.ours.toFixed(3)}</b>`
        : `Crop LPIPS of StreamVSR on this frame: <b class="good">${L.ours.toFixed(3)}</b>`;
    };
    chipGroup(faces, 'method', (v) => { method = v; render(); });
    chipGroup(faces, 'frame', (v) => { frame = v; render(); });
    render();
  }

  /* ---------- world-model replay ---------- */
  const wm = $('#wm');
  if (wm) {
    const SRC = { H1: 'HelixWorld', H2: 'HelixWorld', H3: 'HelixWorld', S1: 'SANA-WM', L1: 'LingBot-World 2.0', L1b: 'LingBot-World 2.0', L2: 'LingBot-World 2.0' };
    let cs = 'H2', left = 'bic';
    const render = () => {
      $('#wm-left').src = `static/img/wm/${cs}_${left}.jpg`;
      $('#wm-right').src = `static/img/wm/${cs}_ours.jpg`;
      $('#wm-llab').textContent = left === 'bic' ? 'Bicubic ×4' : 'Generated frame (reference)';
      $('#wm-src').textContent = `Source: ${SRC[cs]} · input is the 4× area-downsampled frame`;
    };
    chipGroup(wm, 'case', (v) => { cs = v; render(); });
    chipGroup(wm, 'left', (v) => { left = v; render(); });
    render();
  }

  /* ---------- refocus scrubbers ---------- */
  $$('[data-scrub]').forEach((card) => {
    const v = $('video', card), r = $('input[type=range]', card), btn = $('[data-play]', card);
    let raf = 0, sweeping = false;
    const seek = () => { if (v.duration) v.currentTime = (r.value / 1000) * (v.duration - 0.05); };
    r.addEventListener('input', () => { sweeping = false; v.pause(); btn.textContent = '▶ Sweep'; cancelAnimationFrame(raf); raf = requestAnimationFrame(seek); });
    v.addEventListener('timeupdate', () => { if (sweeping && v.duration) r.value = (v.currentTime / v.duration) * 1000; });
    v.addEventListener('ended', () => { sweeping = false; btn.textContent = '▶ Sweep'; });
    btn.addEventListener('click', () => {
      if (sweeping) { v.pause(); sweeping = false; btn.textContent = '▶ Sweep'; return; }
      if (v.currentTime >= v.duration - 0.06) v.currentTime = 0;
      sweeping = true; btn.textContent = '❚❚ Pause'; v.play().catch(() => {});
    });
    v.addEventListener('loadedmetadata', seek);
  });

  /* ---------- aperture toggle ---------- */
  const ap = $('#aperture');
  if (ap) {
    const vid = $('#ap-video');
    const FILE = { lr: 'elephant_lr.mp4', a065: 'elephant_refocus_a065.mp4', a100: 'elephant_refocus_a100.mp4' };
    chipGroup(ap, 'ap', (v) => {
      const t = vid.currentTime; vid.src = `static/video/feature/${FILE[v]}`;
      vid.addEventListener('loadedmetadata', () => { vid.currentTime = t; vid.play().catch(() => {}); }, { once: true });
    });
    inView(ap, (vis) => (vis ? vid.play().catch(() => {}) : vid.pause()), { rootMargin: '0px' });
  }

  /* ---------- lazy autoplay videos ---------- */
  $$('video[data-lazy]').forEach((v) => {
    inView(v, (vis) => {
      if (vis) { if (!v.src) v.src = v.dataset.lazy; v.play().catch(() => {}); } else if (v.src) v.pause();
    }, { rootMargin: '100px' });
  });

  /* ---------- gallery ---------- */
  const gal = $('#gal'), modal = $('#modal');
  if (gal && window.GALLERY) {
    const cards = window.GALLERY.map(([id, title, src, url]) => {
      const c = document.createElement('div'); c.className = 'card gcard'; c.dataset.family = src;
      c.innerHTML = `<div class="media"><img src="static/img/gallery/${id}.jpg" alt="${title}" loading="lazy"><video muted loop playsinline preload="none"></video></div>
        <div class="meta"><div class="t">${title}</div><div class="s">${src}</div></div>`;
      const v = $('video', c);
      const start = () => { if (!v.src) v.src = `static/video/gallery/${id}.mp4`; v.play().then(() => v.classList.add('ready')).catch(() => {}); };
      const stop = () => { v.pause(); };
      // play while visible; hover keeps desktop light by also requiring the card to be near the viewport
      inView(c, (vis) => (vis ? start() : stop()), { rootMargin: '0px', threshold: 0.35 });
      c.addEventListener('click', () => {
        const mv = $('#modal-video'); mv.src = `static/video/gallery/${id}.mp4`;
        $('#modal-cap').innerHTML = `<span><b>${title}</b> · <a href="${url}" target="_blank" rel="noopener">${src}</a></span>`;
        modal.showModal(); mv.play().catch(() => {});
      });
      gal.appendChild(c); return c;
    });
    chipGroup(document, 'family', (v) => cards.forEach((c) => c.classList.toggle('hide', v !== 'all' && c.dataset.family !== v)));
    const close = () => { $('#modal-video').pause(); modal.close(); };
    $('#modal-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.addEventListener('close', () => $('#modal-video').pause());
  }

  /* ---------- bar charts ---------- */
  $$('[data-bars]').forEach((box) => {
    const lo = +box.dataset.min, hi = +box.dataset.max;
    inView(box, (vis) => {
      if (!vis) return;
      $$('.fill', box).forEach((f) => { f.style.width = Math.max(8, ((+f.dataset.v - lo) / (hi - lo)) * 100) + '%'; });
    }, { rootMargin: '0px 0px -10% 0px' });
  });

  /* ---------- copy BibTeX ---------- */
  const cb = $('#copy-bib');
  if (cb) cb.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#bib').textContent); cb.textContent = 'Copied ✓'; }
    catch { cb.textContent = 'Select & copy'; }
    setTimeout(() => (cb.textContent = 'Copy'), 1600);
  });
})();
