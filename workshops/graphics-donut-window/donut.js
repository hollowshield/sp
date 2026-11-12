/*
  donut.js — live, in-browser versions of the workshop's C++ demos.

  <div class="ascii-donut"></div>        DonutTerminal.cpp, with sliders for every constant
  <div class="projection-demo"></div>    projection.cpp, steps 1–5
  <div class="pixel-donut" data-logo="../../assets/img/acm-logo-512.png"></div>
                                         DonutWindow.cpp: torus, sphere, or any image
*/
(function () {
  'use strict';

  var TWO_PI = Math.PI * 2;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (k) { if (k) n.appendChild(k); });
    return n;
  }

  // Runs fn(dt) about every `ms` while the element is on screen.
  function animate(node, ms, fn) {
    var visible = false, last = 0, acc = 0;
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: '80px' }).observe(node);
    function tick(now) {
      var dt = last ? Math.min(now - last, 100) : ms;
      last = now;
      acc += dt;
      if (visible && acc >= ms) { fn(acc / 1000); acc = 0; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function slider(label, min, max, step, value, fmt) {
    var id = 'k' + Math.random().toString(36).slice(2, 8);
    var input = el('input', { type: 'range', id: id, min: min, max: max, step: step, value: value });
    var out = el('output', { for: id });
    var row = el('div', { class: 'knob' }, [el('label', { for: id, text: label }), input, out]);
    function show() { out.textContent = fmt ? fmt(+input.value) : input.value; }
    input.addEventListener('input', show);
    show();
    return { row: row, input: input, get: function () { return +input.value; }, set: function (v) { input.value = v; show(); } };
  }

  function button(text, cls) { return el('button', { type: 'button', class: 'btn ' + (cls || ''), text: text }); }

  /* ------------------------------------------------------------------
     1. The terminal donut, with knobs
     ------------------------------------------------------------------ */
  function AsciiDonut(root) {
    var COLS = 64, ROWS = 26;
    var RAMP = '.,-~:;=!*#$@';

    var screen = el('pre', { class: 'ascii-screen', 'aria-label': 'A spinning donut drawn with text characters' });
    var k = {
      R1: slider('R\u2081 tube radius', 0.2, 2, 0.05, 1),
      R2: slider('R\u2082 distance to tube', 0, 3, 0.05, 2),
      K2: slider('K\u2082 distance from you', 2, 12, 0.1, 5),
      th: slider('\u03B8 step', 0.02, 0.6, 0.01, 0.07),
      ph: slider('\u03C6 step', 0.01, 0.4, 0.01, 0.02),
      dA: slider('A per frame', 0, 0.15, 0.005, 0.04),
      dB: slider('B per frame', 0, 0.15, 0.005, 0.02)
    };
    var k1Out = el('p', { class: 'knob-note' });
    var pause = button(reduceMotion ? 'Play' : 'Pause');
    var reset = button('Reset knobs');
    var paused = reduceMotion;

    var knobs = el('div', { class: 'knobs' });
    Object.keys(k).forEach(function (key) { knobs.appendChild(k[key].row); });
    knobs.appendChild(k1Out);
    knobs.appendChild(el('div', { class: 'knob-buttons' }, [pause, reset]));

    root.appendChild(el('div', { class: 'ascii-stage' }, [screen]));
    root.appendChild(knobs);

    var defaults = { R1: 1, R2: 2, K2: 5, th: 0.07, ph: 0.02, dA: 0.04, dB: 0.02 };
    reset.addEventListener('click', function () { Object.keys(defaults).forEach(function (n) { k[n].set(defaults[n]); }); draw(); });
    pause.addEventListener('click', function () { paused = !paused; pause.textContent = paused ? 'Play' : 'Pause'; });
    Object.keys(k).forEach(function (n) { k[n].input.addEventListener('input', function () { if (paused) draw(); }); });

    // Character cells are taller than wide. Measure the real ratio so the donut stays round.
    function cellAspect() {
      var cs = getComputedStyle(screen);
      var ctx = document.createElement('canvas').getContext('2d');
      ctx.font = cs.fontSize + ' ' + cs.fontFamily;
      var w = ctx.measureText('M').width || 7;
      var h = parseFloat(cs.lineHeight) || w * 1.8;
      return h / w;
    }

    var A = 1, B = 1;
    var output = new Array(COLS * ROWS), zbuf = new Float32Array(COLS * ROWS);

    function draw() {
      var R1 = k.R1.get(), R2 = k.R2.get(), K2 = k.K2.get();
      var K1y = ROWS * K2 * 3 / (8 * (R1 + R2));
      var K1x = K1y * cellAspect();
      k1Out.textContent = 'K\u2081 = rows \u00D7 K\u2082 \u00D7 3 / (8(R\u2081 + R\u2082)) = ' + K1y.toFixed(2) + '  (computed for you)';

      var cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
      output.fill(' ');
      zbuf.fill(0);
      var thStep = k.th.get(), phStep = k.ph.get();

      for (var th = 0; th < TWO_PI; th += thStep) {
        var ct = Math.cos(th), st = Math.sin(th);
        for (var ph = 0; ph < TWO_PI; ph += phStep) {
          var cp = Math.cos(ph), sp = Math.sin(ph);
          var cx = R2 + R1 * ct, cy = R1 * st;
          var x = cx * (cB * cp + sA * sB * sp) - cy * cA * sB;
          var y = cx * (sB * cp - sA * cB * sp) + cy * cA * cB;
          var z = K2 + cA * cx * sp + cy * sA;
          if (z <= 0.05) continue;                    // behind the eye
          var ooz = 1 / z;
          var xp = Math.floor(COLS / 2 + K1x * ooz * x);
          var yp = Math.floor(ROWS / 2 - K1y * ooz * y);
          var L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);
          if (L > 0 && xp >= 0 && xp < COLS && yp >= 0 && yp < ROWS) {
            var o = xp + COLS * yp;
            if (ooz > zbuf[o]) {
              zbuf[o] = ooz;
              output[o] = RAMP[Math.min(11, Math.floor(L * 8))];
            }
          }
        }
      }
      var lines = [];
      for (var j = 0; j < ROWS; j++) lines.push(output.slice(j * COLS, (j + 1) * COLS).join(''));
      screen.textContent = lines.join('\n');
    }

    draw();
    animate(root, 33, function () {
      if (paused) return;
      A += k.dA.get();
      B += k.dB.get();
      draw();
    });
  }

  /* ------------------------------------------------------------------
     2. Projection, one step at a time (projection.cpp)
     ------------------------------------------------------------------ */
  function ProjectionDemo(root) {
    var canvas = el('canvas', { 'aria-label': 'Projection demo' });
    var caption = el('p', { class: 'proj-caption', 'aria-live': 'polite' });
    var numbers = el('p', { class: 'proj-numbers' });
    var steps = el('div', { class: 'step-buttons', role: 'group', 'aria-label': 'Step' });
    var labels = ['One point', 'Three points', 'A 2D triangle', 'A 3D triangle', 'Only x and y'];
    var stepBtns = labels.map(function (t, i) {
      var b = button((i + 1) + '. ' + t, 'btn-quiet');
      b.addEventListener('click', function () { setStep(i + 1); });
      steps.appendChild(b);
      return b;
    });
    var k1 = slider('K\u2081 zoom', 200, 1400, 10, 600);
    var pause = button(reduceMotion ? 'Play' : 'Pause');

    root.appendChild(steps);
    root.appendChild(el('div', { class: 'proj-stage' }, [canvas]));
    root.appendChild(el('div', { class: 'proj-controls' }, [k1.row, pause]));
    root.appendChild(caption);
    root.appendChild(numbers);

    var captions = [
      'One point: a position in pixels, nothing more.',
      'Three points. These sit exactly where step 4 starts: K\u2081 \u00D7 y / z = 600 \u00D7 1 / 3 = 200 pixels from the center.',
      'Fill between them and you have a triangle. Still flat.',
      'The same triangle now lives in 3D and spins. Blue divides each corner by its own z; the gray outline pretends every corner is at the center\u2019s depth (no perspective).',
      'Strip it back: three points and an outline. Every frame we only compute three new (x, y) positions. The \u201C3D\u201D is your brain.'
    ];
    var stage = 1, angle = 0, paused = reduceMotion;
    pause.addEventListener('click', function () { paused = !paused; pause.textContent = paused ? 'Play' : 'Pause'; });

    function setStep(s) {
      stage = s;
      stepBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i + 1 === s)); });
      caption.textContent = captions[s - 1];
      draw();
    }

    var tri = [[0, 1, 0], [-0.87, -0.5, 0], [0.87, -0.5, 0]];
    var center = [0, 0, 3];
    function rotY(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
    function rotX(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
    function toWorld(p) { var q = rotX(rotY(p, angle), 0.6 * angle); return [q[0] + center[0], q[1] + center[1], q[2] + center[2]]; }

    function draw() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      var ctx = canvas.getContext('2d');
      // Same coordinates as the C++ demo: 1 unit = 1 pixel, (0, 0) bottom-left, y up.
      // The canvas is drawn smaller than the original 900x700 window, so scale to fit.
      var s = Math.min(w / 900, h / 700) * dpr;
      ctx.setTransform(s, 0, 0, -s, (canvas.width - 900 * s) / 2, canvas.height - (canvas.height - 700 * s) / 2);
      var W = 900, H = 700, cx = W / 2, cy = H / 2, K1 = k1.get();
      ctx.fillStyle = '#0A1C2E';
      ctx.fillRect(-2000, -2000, 5000, 5000);

      function point(p, size, color) { ctx.fillStyle = color; ctx.fillRect(p[0] - size / 2, p[1] - size / 2, size, size); }
      function poly(ps, fill, stroke, width, dash) {
        ctx.beginPath(); ctx.moveTo(ps[0][0], ps[0][1]);
        for (var i = 1; i < ps.length; i++) ctx.lineTo(ps[i][0], ps[i][1]);
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.setLineDash(dash || []); ctx.lineWidth = width || 2; ctx.strokeStyle = stroke; ctx.stroke(); ctx.setLineDash([]); }
      }
      function line(a, b, color) {
        ctx.beginPath(); ctx.setLineDash([8, 8]); ctx.lineWidth = 1.5; ctx.strokeStyle = color;
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
      }
      function project(p) { return [cx + K1 * p[0] / p[2], cy + K1 * p[1] / p[2]]; }

      var light = '#2EA8F0', fill = '#0369A6', grey = '#4D5C6B', pts;
      if (stage === 1) {
        point([cx, cy], 20, light);
      } else if (stage === 2 || stage === 3) {
        pts = [[cx, cy + 200], [cx - 174, cy - 100], [cx + 174, cy - 100]];
        if (stage === 3) poly(pts, fill);
        pts.forEach(function (p) { point(p, 16, light); });
      } else if (stage === 4) {
        var world = tri.map(toWorld);
        var proj = world.map(project);
        var flat = world.map(function (p) { return [cx + K1 * p[0] / center[2], cy + K1 * p[1] / center[2]]; });
        poly(flat, null, grey, 2);
        poly(proj, fill);
        proj.forEach(function (p) { point(p, 12, light); });
      } else {
        pts = tri.map(toWorld).map(project);
        pts.forEach(function (p) { line(p, [p[0], 0], grey); line(p, [0, p[1]], grey); });
        pts.forEach(function (p) { point([p[0], 6], 10, light); point([6, p[1]], 10, light); });
        poly(pts, null, light, 2);
        pts.forEach(function (p) { point(p, 14, light); });
      }

      if (stage === 5) {
        numbers.textContent = ['A', 'B', 'C'].map(function (n, i) {
          return n + '(' + Math.round(pts[i][0]) + ', ' + Math.round(pts[i][1]) + ')';
        }).join('   ');
      } else {
        numbers.textContent = 'K\u2081 = ' + Math.round(K1);
      }
    }

    k1.input.addEventListener('input', draw);
    new ResizeObserver(draw).observe(canvas);
    setStep(1);
    animate(root, 16, function (dt) {
      if (!paused && stage >= 4) { angle += dt; draw(); }
    });
  }

  /* ------------------------------------------------------------------
     3. The donut in a window: point clouds into a pixel buffer (DonutWindow.cpp)
     ------------------------------------------------------------------ */
  function PixelDonut(root) {
    var BW = 400, BH = 300;
    var canvas = el('canvas', { width: BW, height: BH, 'aria-label': 'A shaded donut spinning in a window' });
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(BW, BH);
    var zbuf = new Float32Array(BW * BH);

    var bTorus = button('T  Donut'), bSphere = button('S  Sphere'), bLogo = button('ACM logo');
    var bPause = button(reduceMotion ? 'Play' : 'Pause');
    var file = el('input', { type: 'file', accept: 'image/*', class: 'visually-hidden', id: 'pick-' + Math.random().toString(36).slice(2, 7) });
    var pick = el('label', { class: 'btn', for: file.id, text: 'Use your own image' });
    var hint = el('p', { class: 'pixel-hint', text: 'Or drop a PNG or JPG onto the window.' });
    var status = el('p', { class: 'pixel-status', 'aria-live': 'polite' });

    root.appendChild(el('div', { class: 'pixel-window' }, [
      el('div', { class: 'pixel-titlebar' }, [el('span', { text: 'Spinning donut' }), el('i'), el('i'), el('i')]),
      canvas
    ]));
    root.appendChild(el('div', { class: 'pixel-controls' }, [bTorus, bSphere, bLogo, pick, file, bPause]));
    root.appendChild(hint);
    root.appendChild(status);

    // A model: interleaved [px, py, pz, nx, ny, nz, r, g, b] per point.
    function makeTorus(R1, R2, nT, nP) {
      var a = new Float32Array(nT * nP * 9), o = 0;
      for (var i = 0; i < nT; i++) {
        var th = TWO_PI * i / nT, ct = Math.cos(th), st = Math.sin(th);
        for (var j = 0; j < nP; j++) {
          var ph = TWO_PI * j / nP, cp = Math.cos(ph), sp = Math.sin(ph), r = R2 + R1 * ct;
          a[o++] = r * cp; a[o++] = R1 * st; a[o++] = -r * sp;
          a[o++] = ct * cp; a[o++] = st; a[o++] = -ct * sp;
          a[o++] = 0.18; a[o++] = 0.66; a[o++] = 0.94;
        }
      }
      return { pts: a, twoSided: false };
    }
    function makeSphere(R, nLat, nLon) {
      var a = new Float32Array(nLat * nLon * 9), o = 0;
      for (var i = 0; i < nLat; i++) {
        var th = Math.PI * (i + 0.5) / nLat;
        for (var j = 0; j < nLon; j++) {
          var ph = TWO_PI * j / nLon;
          var nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.sin(ph);
          a[o++] = nx * R; a[o++] = ny * R; a[o++] = nz * R;
          a[o++] = nx; a[o++] = ny; a[o++] = nz;
          a[o++] = 0.18; a[o++] = 0.66; a[o++] = 0.94;
        }
      }
      return { pts: a, twoSided: false };
    }
    function makeImageCard(image, height) {
      var aspect = image.width / image.height, ns = 300;
      var nu = aspect >= 1 ? ns : Math.round(ns * aspect), nv = aspect >= 1 ? Math.round(ns / aspect) : ns;
      var c = document.createElement('canvas');
      c.width = nu; c.height = nv;
      var cx = c.getContext('2d');
      cx.drawImage(image, 0, 0, nu, nv);
      var data = cx.getImageData(0, 0, nu, nv).data;
      // Opaque pixels only. Images without transparency: treat near-white as background.
      var hasAlpha = false;
      for (var t = 3; t < data.length; t += 4) if (data[t] < 250) { hasAlpha = true; break; }
      var list = [];
      for (var j = 0; j < nv; j++) for (var i = 0; i < nu; i++) {
        var q = 4 * (j * nu + i), r = data[q], g = data[q + 1], b = data[q + 2], al = data[q + 3];
        if (al < 128) continue;
        if (!hasAlpha && r > 240 && g > 240 && b > 240) continue;
        var u = (i + 0.5) / nu, v = (j + 0.5) / nv;
        list.push((u - 0.5) * height * aspect, (0.5 - v) * height, 0, 0, 0, 1, r / 255, g / 255, b / 255);
      }
      return list.length ? { pts: new Float32Array(list), twoSided: true } : null;
    }

    var torus = null, sphere = null, model = null;
    function useTorus() { torus = torus || makeTorus(1, 2, 200, 700); model = torus; status.textContent = 'Donut: ' + (torus.pts.length / 9).toLocaleString() + ' surface points'; }
    function useSphere() { sphere = sphere || makeSphere(2.5, 280, 600); model = sphere; status.textContent = 'Sphere: ' + (sphere.pts.length / 9).toLocaleString() + ' surface points'; }
    function useImage(src, name) {
      var im = new Image();
      im.onload = function () {
        var m = makeImageCard(im, 5.5);
        if (m) { model = m; status.textContent = name + ': ' + (m.pts.length / 9).toLocaleString() + ' points, one per opaque pixel'; }
        else status.textContent = 'That image is fully transparent, so there is nothing to spin.';
      };
      im.onerror = function () { status.textContent = 'Could not load that image. Try a PNG or JPG.'; };
      im.src = src;
    }

    var A = 1, B = 1, paused = reduceMotion;
    var light = [0, 1 / Math.SQRT2, -1 / Math.SQRT2];

    function render() {
      var px = img.data;
      for (var i = 0; i < BW * BH; i++) { px[4 * i] = 10; px[4 * i + 1] = 27; px[4 * i + 2] = 46; px[4 * i + 3] = 255; }
      zbuf.fill(0);
      if (!model) return;
      var K2 = 8, K1 = BH * K2 * 3 / (8 * 3);
      var cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
      var p = model.pts, two = model.twoSided;
      for (var o = 0; o < p.length; o += 9) {
        // rotate around x by A, then around y by B (position and normal)
        var y1 = p[o + 1] * cA - p[o + 2] * sA, z1 = p[o + 1] * sA + p[o + 2] * cA;
        var x = p[o] * cB + z1 * sB, z = -p[o] * sB + z1 * cB;
        var ny1 = p[o + 4] * cA - p[o + 5] * sA, nz1 = p[o + 4] * sA + p[o + 5] * cA;
        var nz = -p[o + 3] * sB + nz1 * cB;
        var ooz = 1 / (z + K2);
        var xp = (BW / 2 + K1 * ooz * x) | 0;
        var yp = (BH / 2 - K1 * ooz * y1) | 0;   // canvas rows go down, like the terminal
        var L = ny1 * light[1] + nz * light[2];
        L = two ? Math.abs(L) : Math.max(L, 0);
        var shade = 0.2 + 0.8 * L;
        var r = Math.min(255, 255 * p[o + 6] * shade), g = Math.min(255, 255 * p[o + 7] * shade), b = Math.min(255, 255 * p[o + 8] * shade);
        for (var dy = 0; dy < 2; dy++) for (var dx = 0; dx < 2; dx++) {
          var X = xp + dx, Y = yp + dy;
          if (X < 0 || X >= BW || Y < 0 || Y >= BH) continue;
          var q = X + BW * Y;
          if (ooz <= zbuf[q]) continue;
          zbuf[q] = ooz;
          px[4 * q] = r; px[4 * q + 1] = g; px[4 * q + 2] = b;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    bTorus.addEventListener('click', function () { useTorus(); render(); });
    bSphere.addEventListener('click', function () { useSphere(); render(); });
    bLogo.addEventListener('click', function () { useImage(root.dataset.logo, 'ACM logo'); });
    bPause.addEventListener('click', function () { paused = !paused; bPause.textContent = paused ? 'Play' : 'Pause'; });
    file.addEventListener('change', function () {
      if (file.files[0]) useImage(URL.createObjectURL(file.files[0]), file.files[0].name);
    });
    canvas.addEventListener('dragover', function (e) { e.preventDefault(); root.classList.add('is-dropping'); });
    canvas.addEventListener('dragleave', function () { root.classList.remove('is-dropping'); });
    canvas.addEventListener('drop', function (e) {
      e.preventDefault();
      root.classList.remove('is-dropping');
      var f = e.dataTransfer.files[0];
      if (f && f.type.indexOf('image') === 0) useImage(URL.createObjectURL(f), f.name);
    });
    root.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 't' || e.key === 'T') { useTorus(); render(); }
      if (e.key === 's' || e.key === 'S') { useSphere(); render(); }
    });

    useTorus();
    render();
    animate(root, 16, function (dt) {
      if (paused) return;
      A += 0.7 * dt; B += 1.2 * dt;
      render();
    });
  }

  function init() {
    document.querySelectorAll('.ascii-donut').forEach(AsciiDonut);
    document.querySelectorAll('.projection-demo').forEach(ProjectionDemo);
    document.querySelectorAll('.pixel-donut').forEach(PixelDonut);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
