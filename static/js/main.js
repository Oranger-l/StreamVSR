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
    const NAMES = { sol_refiner: 'SoL-Refiner', flashvsr_plus_base: 'FlashVSR Base', dove: 'DOVE', seedvr2_3b: 'SeedVR2-3B', open_h3_regen: 'Open-H3-Regen', lr: 'Input (×4 nearest)' };
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
      $('#faces-gt').src = `static/img/faces/f${frame}_hr.jpg`;
      $('#faces-llab').textContent = NAMES[method];
      $('#faces-left').classList.toggle('pixel', method === 'lr');
      const [x, y, w, h] = BOX[frame], bx = $('#faces-box');
      Object.assign(bx.style, { left: x + '%', top: y + '%', width: w + '%', height: h + '%' });
      const L = LPIPS[frame], m = $('#faces-metric');
      m.innerHTML = (method in L)
        ? `Crop LPIPS against the ground truth: ${NAMES[method]} <b>${L[method].toFixed(3)}</b> · StreamVSR <b class="good">${L.ours.toFixed(3)}</b>`
        : `Crop LPIPS of StreamVSR against the ground truth: <b class="good">${L.ours.toFixed(3)}</b>`;
    };
    chipGroup(faces, 'method', (v) => { method = v; render(); });
    chipGroup(faces, 'frame', (v) => { frame = v; render(); });
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

  /* ---------- zoom windows: magnify boxed regions of a video ---------- */
  // data-zoom="x,y,w,h" is in pixels of the first video loaded; boxes are kept as fractions so a
  // source swap to a different resolution (aperture card) keeps the same region.
  $$('[data-zoomwrap]').forEach((wrap) => {
    const v = $('video', wrap), vid = $('.vid', wrap);
    const zs = $$('canvas[data-zoom]', wrap).map((c) => {
      const box = document.createElement('div');
      box.className = 'zbox ' + (c.parentElement.classList.contains('near') ? 'near' : 'far');
      vid.appendChild(box);
      return { c, ctx: c.getContext('2d'), px: c.dataset.zoom.split(',').map(Number), f: null, box };
    });
    const init = () => {
      const W = v.videoWidth, H = v.videoHeight; if (!W) return false;
      zs.forEach((z) => { if (!z.f) z.f = [z.px[0] / W, z.px[1] / H, z.px[2] / W, z.px[3] / H]; });
      return true;
    };
    const place = () => {
      if (!init()) return;
      zs.forEach(({ f, box }) => Object.assign(box.style, { left: f[0] * 100 + '%', top: f[1] * 100 + '%', width: f[2] * 100 + '%', height: f[3] * 100 + '%' }));
    };
    const draw = () => {
      if (v.readyState < 2 || !init()) return;
      const W = v.videoWidth, H = v.videoHeight;
      zs.forEach(({ c, ctx, f }) => {
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(v, f[0] * W, f[1] * H, f[2] * W, f[3] * H, 0, 0, c.width, c.height);
      });
    };
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      const loop = () => { draw(); v.requestVideoFrameCallback(loop); };
      v.requestVideoFrameCallback(loop);
    } else {
      const tick = () => { draw(); if (!v.paused) requestAnimationFrame(tick); };
      v.addEventListener('play', tick);
    }
    ['loadeddata', 'seeked', 'timeupdate'].forEach((e) => v.addEventListener(e, draw));
    v.addEventListener('loadedmetadata', place);
    if (v.readyState >= 1) place();
    if (v.readyState >= 2) draw(); // the video may have loaded before this script ran
    // drag the nearest box to move its zoom window
    let drag = null;
    const at = (e) => { const b = vid.getBoundingClientRect(); return [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height]; };
    const move = (e) => {
      if (!drag) return;
      const [x, y] = at(e), f = drag.f;
      f[0] = Math.max(0, Math.min(1 - f[2], x - f[2] / 2)); f[1] = Math.max(0, Math.min(1 - f[3], y - f[3] / 2));
      place(); draw();
    };
    vid.addEventListener('pointerdown', (e) => {
      if (!init()) return;
      const [x, y] = at(e);
      drag = zs.reduce((b, z) => {
        const d = Math.hypot(x - z.f[0] - z.f[2] / 2, y - z.f[1] - z.f[3] / 2);
        return !b || d < b.d ? { z, d } : b;
      }, null).z;
      vid.setPointerCapture(e.pointerId); move(e);
    });
    vid.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel'].forEach((n) => vid.addEventListener(n, () => { drag = null; }));
  });

  /* ---------- paired-video viewers (4K super-resolution, world-model replay) ----------
     Two synced videos under one slider, plus two zoom windows on the same region. cfg: { p, scenes, zoom, zoomLabel,
     srcs(scene, left) -> {left, right, poster}, labels(scene, left) -> {left, right, zl, note}, left } where `p` prefixes
     the element ids. Zoom z shows z device pixels per output pixel of the right video. */
  const pairViewer = (cfg) => {
    const root = $('#' + cfg.p); if (!root || !cfg.scenes || !cfg.scenes.length) return;
    const el = (n) => $(`#${cfg.p}${n}`);
    const lv = el('lr'), rv = el('sr'), cmp = el('cmp'), boxEl = el('box');
    const zl = el('zl'), zr = el('zr'), cl = zl.getContext('2d'), cr = zr.getContext('2d');
    let scene = null, left = cfg.left, zoom = cfg.zoom, paused = false, visible = false, c = [0.5, 0.5]; // box centre, fraction of frame
    const size = () => (rv.videoWidth ? [rv.videoWidth, rv.videoHeight] : scene.out);
    const geom = () => { // box size in output pixels so that the right window shows output pixels at `zoom` x device pixels
      const dpr = window.devicePixelRatio || 1, cw = Math.round(zr.clientWidth * dpr), ch = Math.round(zr.clientHeight * dpr);
      if (zr.width !== cw || zr.height !== ch) { zr.width = zl.width = cw; zr.height = zl.height = ch; }
      const [W, H] = size(), k = Math.min(1, W / (cw / zoom), H / (ch / zoom)), w = (cw / zoom) * k, h = (ch / zoom) * k;
      c[0] = Math.min(1 - w / W / 2, Math.max(w / W / 2, c[0])); c[1] = Math.min(1 - h / H / 2, Math.max(h / H / 2, c[1]));
      return { W, H, w, h, x: c[0] * W - w / 2, y: c[1] * H - h / 2 };
    };
    const place = () => {
      if (!scene || !zr.clientWidth) return;
      const g = geom();
      Object.assign(boxEl.style, { left: (g.x / g.W) * 100 + '%', top: (g.y / g.H) * 100 + '%', width: (g.w / g.W) * 100 + '%', height: (g.h / g.H) * 100 + '%' });
    };
    const draw = () => {
      if (!scene || rv.readyState < 2 || lv.readyState < 2 || !rv.videoWidth || !lv.videoWidth) return;
      const g = geom(), k = lv.videoWidth / g.W;
      cr.imageSmoothingEnabled = zoom !== 1; cr.imageSmoothingQuality = 'high';
      cr.drawImage(rv, g.x, g.y, g.w, g.h, 0, 0, zr.width, zr.height);
      if (Math.abs(lv.currentTime - rv.currentTime) > 0.08) return; // keep the windows on the same frame
      cl.imageSmoothingEnabled = true; cl.imageSmoothingQuality = 'high';
      cl.drawImage(lv, g.x * k, g.y * k, g.w * k, g.h * k, 0, 0, zl.width, zl.height);
    };
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      const loop = () => { draw(); rv.requestVideoFrameCallback(loop); }; rv.requestVideoFrameCallback(loop);
    } else { const tick = () => { draw(); if (!rv.paused) requestAnimationFrame(tick); }; rv.addEventListener('play', tick); }
    ['loadeddata', 'seeked'].forEach((e) => { rv.addEventListener(e, () => { place(); draw(); }); lv.addEventListener(e, draw); });
    const sync = () => { if (Math.abs(lv.currentTime - rv.currentTime) > 0.05) lv.currentTime = rv.currentTime; };
    rv.addEventListener('canplay', () => { el('load').hidden = true; });
    rv.addEventListener('timeupdate', sync); rv.addEventListener('seeked', sync);
    lv.addEventListener('loadeddata', () => { lv.currentTime = rv.currentTime; if (!rv.paused) lv.play().catch(() => {}); });
    const play = () => { if (!visible || paused) return; lv.currentTime = rv.currentTime; rv.play().catch(() => {}); lv.play().catch(() => {}); };
    const text = () => {
      const t = cfg.labels(scene, left);
      el('llab').textContent = t.left; el('rlab').textContent = t.right; el('note').textContent = t.note; el('zll').textContent = t.zl;
      el('zlab').textContent = cfg.zoomLabel(zoom);
    };
    const setScene = (id) => {
      scene = cfg.scenes.find((x) => x.id === id); c = scene.box.slice();
      const f = cfg.srcs(scene, left);
      rv.poster = f.poster; el('load').hidden = false;
      rv.src = f.right; lv.src = f.left;
      text(); place(); play();
    };
    const setLeft = (v) => { left = v; const f = cfg.srcs(scene, left); lv.src = f.left; text(); };
    const chips = $(`[data-group="${cfg.p}clip"]`, root);
    cfg.scenes.forEach((x, i) => { const b = document.createElement('button'); b.className = 'chip' + (i ? '' : ' on'); b.dataset.v = x.id; b.textContent = x.title; chips.appendChild(b); });
    chipGroup(root, cfg.p + 'clip', setScene);
    chipGroup(root, cfg.p + 'left', setLeft);
    chipGroup(root, cfg.p + 'zoom', (v) => { zoom = +v; text(); place(); draw(); });
    const pz = el('pause');
    pz.addEventListener('click', () => {
      paused = !paused; pz.textContent = paused ? '▶ Play' : '❚❚ Pause';
      if (paused) { rv.pause(); lv.pause(); lv.currentTime = rv.currentTime; } else play();
    });
    // dragging the box moves the zoom region (and must not move the slider)
    let drag = null;
    boxEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); e.preventDefault(); boxEl.setPointerCapture(e.pointerId);
      const r = cmp.getBoundingClientRect(); drag = { x: e.clientX, y: e.clientY, c: c.slice(), w: r.width, h: r.height };
    });
    boxEl.addEventListener('pointermove', (e) => {
      e.stopPropagation(); if (!drag) return;
      c = [drag.c[0] + (e.clientX - drag.x) / drag.w, drag.c[1] + (e.clientY - drag.y) / drag.h]; place(); draw();
    });
    ['pointerup', 'pointercancel'].forEach((n) => boxEl.addEventListener(n, (e) => { e.stopPropagation(); drag = null; }));
    new ResizeObserver(() => { place(); draw(); }).observe(zr); // the windows follow the video's height
    inView(root, (vis) => {
      visible = vis;
      if (vis) { if (!scene) setScene(cfg.scenes[0].id); else play(); } else { rv.pause(); lv.pause(); }
    }, { rootMargin: '100px' });
  };

  pairViewer({
    p: 'k4', scenes: window.K4, zoom: 1, left: 'lr',
    zoomLabel: (z) => (z === 1 ? 'StreamVSR · 1:1 pixels' : 'StreamVSR · 2× pixels'),
    srcs: (x) => ({ left: `static/video/sr4k/${x.id}_lr.mp4`, right: `static/video/sr4k/${x.id}_sr.mp4`, poster: `static/video/sr4k/${x.id}.jpg` }),
    labels: (x) => ({
      left: `Input ${x.in[0]}×${x.in[1]}`, right: `StreamVSR ${x.out[0]}×${x.out[1]}`, zl: 'Input · enlarged',
      note: `${x.title} · ${x.source}. The generator's frames (${x.in[0]}×${x.in[1]}) go in as they are; StreamVSR outputs ${x.out[0]}×${x.out[1]}. Drag the orange box to choose the zoom region.`,
    }),
  });

  pairViewer({
    p: 'wm', scenes: window.WM, zoom: 2, left: 'bic',
    zoomLabel: (z) => `StreamVSR · ${z}×`,
    srcs: (x, l) => ({ left: `static/video/wm/${x.id}_${l}.mp4`, right: `static/video/wm/${x.id}_ours.mp4`, poster: `static/video/wm/${x.id}.jpg` }),
    labels: (x, l) => {
      const n = l === 'bic' ? 'Bicubic ×4' : 'Generated frame (reference)';
      return { left: n, right: 'StreamVSR ×4', zl: n, note: `${x.title} · ${x.source}. Input ${x.out[0] / 4}×${x.out[1] / 4} (the generated frame reduced 4×), output ${x.out[0]}×${x.out[1]}, the generator's own size. Drag the orange box to choose the zoom region.` };
    },
  });

  /* ---------- 3D viewer: one video per scene holding [left | right | depth] side by side ---------- */
  const s3 = $('#s3');
  if (s3 && window.S3D) {
    const canvas = $('#s3c'), stage = $('.s3stage', s3), video = document.createElement('video');
    Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'auto' });
    video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
    const HINT = {
      wiggle: 'No glasses needed: the view switches between the left and right eye several times a second. Freeze the motion to study one frame.',
      anaglyph: 'Put on red/cyan glasses (red over the left eye).',
      cross: 'Cross-eye viewing: the right-eye image is on the left. Cross your eyes until the two pictures fuse into a third one in the middle.',
      sbs: 'Parallel side by side: left eye left, right eye right. Use it for parallel free viewing, or full screen on a VR headset or 3D display.',
      depth: 'The depth StreamVSR renders from (bright = near), normalized once per clip so it stays on one scale across streaming blocks.',
    };
    const MODES = { wiggle: 0, anaglyph: 1, cross: 2, sbs: 3, depth: 4 };
    let mode = 'wiggle', scene = null, lastT = -1, lastEye = -1, raf = 0, visible = false, frozen = false;
    const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: false });
    if (!gl) { stage.classList.add('nogl'); $('#s3hint').textContent = 'This browser has no WebGL; the 3D viewer needs it.'; }
    const prog = gl && (() => {
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }'));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, `precision mediump float; varying vec2 uv; uniform sampler2D t; uniform int mode; uniform float conv, m, eye, px;
        vec3 S(float k, vec2 q){ q.x = clamp(q.x, px, 1. - px); return texture2D(t, vec2((q.x + k) / 3., q.y)).rgb; }
        vec3 L(vec2 q){ return S(0., q); }
        vec3 R(vec2 q){ return S(1., vec2(q.x - conv, q.y)); }
        vec3 turbo(float x){ x = clamp(x, 0., 1.); vec4 v = vec4(1., x, x * x, x * x * x); vec2 w = v.zw * v.z;
          return vec3(dot(v, vec4(.13572138, 4.6153926, -42.66032258, 132.13108234)) + dot(w, vec2(-152.94239396, 59.28637943)),
                      dot(v, vec4(.09140261, 2.19418839, 4.84296658, -14.18503333)) + dot(w, vec2(4.27729857, 2.82956604)),
                      dot(v, vec4(.1066733, 12.64194608, -60.58204836, 110.36276771)) + dot(w, vec2(-89.90310912, 27.34824973))); }
        void main(){ vec3 c;
          if (mode == 2 || mode == 3) { bool lh = uv.x < .5; vec2 r = vec2(m + fract(uv.x * 2.) * (1. - 2. * m), uv.y);
            if (mode == 2) c = lh ? R(r) : L(r); else c = lh ? L(r) : R(r);
          } else { vec2 r = vec2(m + uv.x * (1. - 2. * m), uv.y);
            if (mode == 0) c = eye < .5 ? L(r) : R(r);
            else if (mode == 1) { vec3 a = L(r), b = R(r); c = vec3(a.r, b.g, b.b); }
            else c = turbo(S(2., r).r);
          }
          gl_FragColor = vec4(c, 1.); }`));
      gl.linkProgram(p); gl.useProgram(p);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
      const u = {}; ['mode', 'conv', 'm', 'eye', 'px'].forEach((k) => (u[k] = gl.getUniformLocation(p, k)));
      return u;
    })();
    const size = () => {
      if (!scene) return;
      const [pw, ph] = scene.panel, two = mode === 'cross' || mode === 'sbs', w = Math.round(pw * (1 - 2 * scene.m));
      canvas.width = two ? 2 * w : w; canvas.height = ph;
      stage.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
      lastEye = -1;
    };
    const draw = (eye) => {
      gl.uniform1i(prog.mode, MODES[mode]); gl.uniform1f(prog.conv, scene.conv); gl.uniform1f(prog.m, scene.m);
      gl.uniform1f(prog.eye, eye); gl.uniform1f(prog.px, 0.6 / scene.panel[0]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const loop = (now) => {
      raf = 0; if (!visible || !gl || !scene) return;
      let dirty = false;
      if (video.readyState >= 2 && video.currentTime !== lastT) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video); lastT = video.currentTime; dirty = true;
        stage.classList.add('ready');
      }
      const eye = Math.floor(now / 140) % 2;
      if (eye !== lastEye) { lastEye = eye; dirty = true; }
      if (dirty && lastT >= 0) draw(eye);
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && visible) raf = requestAnimationFrame(loop); };
    const setScene = (id) => {
      scene = window.S3D.find((s) => s.id === id);
      lastT = -1; stage.classList.remove('ready');
      stage.style.backgroundImage = `url(static/video/stereo3d/${id}.jpg?v=2)`;
      $('#s3lab').textContent = `${scene.title} · ${scene.source}`;
      video.src = `static/video/stereo3d/${id}.mp4?v=2`;
      if (visible && !frozen) video.play().catch(() => {});
      size();
    };
    const chips = $('[data-group="s3clip"]', s3);
    window.S3D.forEach((s, i) => {
      const b = document.createElement('button'); b.className = 'chip' + (i ? '' : ' on'); b.dataset.v = s.id; b.textContent = s.title; chips.appendChild(b);
    });
    chipGroup(s3, 's3clip', setScene);
    chipGroup(s3, 's3mode', (v) => { mode = v; $('#s3hint').textContent = HINT[v]; size(); });
    $('#s3hint').textContent = HINT[mode];
    const fz = $('#s3pause');
    fz.addEventListener('click', () => {
      frozen = !frozen; fz.textContent = frozen ? '▶ Resume motion' : '❚❚ Freeze motion';
      if (frozen) video.pause(); else video.play().catch(() => {});
    });
    inView(s3, (vis) => {
      visible = vis;
      if (vis) { if (!scene) setScene(window.S3D[0].id); if (!frozen) video.play().catch(() => {}); start(); }
      else video.pause();
    }, { rootMargin: '150px' });
  }

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

  /* ---------- bar charts ----------
     Each [data-heat] is one race: its bars share a single clock, so in "race" mode a bar stops when the clock reaches
     its value and the hatched "time saved" area keeps growing behind the faster bar. "grow" just grows all bars.
     Every part (race, headline number, tile) starts on its own when it scrolls into view; Replay restarts them all. */
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeIO = (x) => (x < .5 ? 2 * x * x : 1 - (2 - 2 * x) ** 2 / 2);
  const easeOut = (x) => 1 - (1 - x) ** 3;
  $$('[data-bars]').forEach((box) => {
    const card = box.closest('[data-chart]') || box, race = box.dataset.bars === 'race';
    const lo = +box.dataset.min, hi = +box.dataset.max, pct = (v) => Math.max(0, ((v - lo) / (hi - lo)) * 100);
    const fillsAll = [];

    const heatUnit = (el) => {
      const fills = $$('.fill', el).map((f) => {
        const text = f.textContent.trim(), m = text.match(/^([\d.]+)(.*)$/);
        f.innerHTML = '<span class="val"></span>';
        return { f, val: f.firstChild, text, v: +f.dataset.v, dec: (m[1].split('.')[1] || '').length, unit: m[2], ghost: $('.ghost', f.parentNode), need: 0 };
      });
      fillsAll.push(...fills);
      const max = Math.max(...fills.map((o) => o.v)), delta = $('.delta', el);
      return { el, dur: race ? 1900 : 1100, set: (x) => {
        const k = race ? easeIO(x) : easeOut(x), t = race ? max * k : 0;
        fills.forEach((o) => {
          const cur = race ? Math.min(t, o.v) : lo + (o.v - lo) * k, end = cur >= o.v;
          o.f.style.width = pct(cur) + '%';
          o.val.style.opacity = pct(cur) > 0 && pct(cur) >= o.need ? 1 : 0; // hide a number until its bar has room for it
          o.val.textContent = end ? o.text : cur.toFixed(o.dec) + o.unit;
          if (o.ghost) o.ghost.style.width = pct(Math.max(cur, t)) + '%';
          o.f.classList.toggle('done', end && x > 0);
        });
        if (delta) delta.classList.toggle('pop', x >= 1);
      } };
    };
    const countUnit = (el) => {
      const cs = $$('[data-count]', el).map((c) => ({ c, text: c.textContent, v: +c.textContent, dec: (c.textContent.split('.')[1] || '').length }));
      return { el, dur: 1500, set: (x) => cs.forEach((o) => { o.c.textContent = x >= 1 ? o.text : (o.v * easeOut(x)).toFixed(o.dec); }) };
    };
    const units = [...$$('.kpi', card).map(countUnit), ...$$('[data-heat]', box).map(heatUnit), ...$$('.fps > div', card).map(countUnit)];

    /* numbers sit inside a bar when its final width has room for them, otherwise just right of it */
    const place = () => fillsAll.forEach((o) => {
      const shown = o.val.textContent; o.val.textContent = o.text; o.f.classList.remove('out');
      o.need = ((o.val.offsetWidth + 20) / (o.f.parentNode.clientWidth || 1)) * 100;
      const out = pct(o.v) < o.need; o.f.classList.toggle('out', out); if (out) o.need = 0;
      o.val.textContent = shown;
    });
    const show = (u) => { u.run = (u.run || 0) + 1; u.el.classList.add('pop'); u.set(1); };
    const hide = (u) => { // back to the start, without animating the fade-out
      u.run = (u.run || 0) + 1; u.el.style.transition = 'none'; u.el.classList.remove('pop'); u.set(0);
      void u.el.offsetWidth; u.el.style.transition = '';
    };
    const play = (u, delay) => {
      hide(u);
      const id = u.run, t0 = performance.now();
      const tick = (now) => {
        if (id !== u.run) return;
        const t = now - t0 - delay;
        if (t >= 0) u.el.classList.add('pop');
        const x = Math.min(1, Math.max(0, (t - 120) / u.dur));
        u.set(x);
        if (x < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    place();
    addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    const rb = $('[data-replay]', card);
    if (calm) { units.forEach(show); if (rb) rb.hidden = true; return; }
    card.classList.add('armed');
    units.forEach(hide);
    const io = new IntersectionObserver((es) => es.filter((e) => e.isIntersecting).forEach((e, n) => {
      io.unobserve(e.target); play(units.find((u) => u.el === e.target), n * 160);
    }), { threshold: .3, rootMargin: '0px 0px -8% 0px' });
    units.forEach((u) => io.observe(u.el));
    if (rb) rb.addEventListener('click', () => units.forEach((u, n) => { io.unobserve(u.el); play(u, n * 160); }));
  });

  /* ---------- copy BibTeX ---------- */
  const cb = $('#copy-bib');
  if (cb) cb.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#bib').textContent); cb.textContent = 'Copied ✓'; }
    catch { cb.textContent = 'Select & copy'; }
    setTimeout(() => (cb.textContent = 'Copy'), 1600);
  });
})();
