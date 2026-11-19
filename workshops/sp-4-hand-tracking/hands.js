/*
  hands.js — live hand tracking for the SP-4 lesson.

  One camera and one hand-tracking model are shared by every piece on the page.
  Each piece just listens for new frames.

  <div class="hand-view"></div>
      Camera (or demo hand) with the 21 landmarks drawn on top.

  <div class="hand-inspector"></div>
      Pick a landmark by number and watch its x, y and z change live.

  <div class="hand-lab" id="lab-x" data-src="code-id" data-title="gestures.js"></div>
      Code editor + live view. The student's detect(hand) runs every frame,
      onGesture(name) runs when the gesture changes. data-editor="false" hides the editor.

  <button data-hand-load="code-id" data-into="lab-x">Load into the editor</button>

  Coordinates given to students are already mirrored to match what they see:
  x goes 0 (left) to 1 (right), y goes 0 (top) to 1 (bottom), z is depth
  relative to the wrist (more negative = closer to the camera).
*/
(function () {
  'use strict';

  var MP_VERSION = '1.2.3';
  // window.HANDS_CONFIG can point these somewhere else (for example, files you host yourself).
  var CONFIG = window.HANDS_CONFIG || {};
  var MP_BASE = CONFIG.mpBase || 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + MP_VERSION;
  var MODEL_URL = CONFIG.modelUrl || 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Which landmarks are joined by bones, for drawing.
  var BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];
  var NAMES = ['Wrist',
    'Thumb base', 'Thumb knuckle', 'Thumb middle joint', 'Thumb tip',
    'Index knuckle', 'Index middle joint', 'Index top joint', 'Index tip',
    'Middle knuckle', 'Middle middle joint', 'Middle top joint', 'Middle tip',
    'Ring knuckle', 'Ring middle joint', 'Ring top joint', 'Ring tip',
    'Pinky knuckle', 'Pinky middle joint', 'Pinky top joint', 'Pinky tip'];
  var FINGER_COLOR = function (i) {
    if (i === 0) return '#EEF3F8';
    if (i <= 4) return '#F59E2B';
    if (i <= 8) return '#5FB8E8';
    if (i <= 12) return '#7BE0B0';
    if (i <= 16) return '#C4A5FF';
    return '#FF8FA3';
  };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (k) { if (k) n.appendChild(k); });
    return n;
  }
  function button(text, cls) { return el('button', { type: 'button', class: 'btn ' + (cls || ''), text: text }); }

  /* ================================================================
     The demo hand: a fake hand built from angles, for anyone without
     a webcam. It produces the same 21 points the real model does.
     ================================================================ */

  // curl: 0 = straight, 1 = fully bent. thumb: 'out', 'tucked', 'up', or 'pinch'.
  var POSES = {
    'open':      { curl: [0, 0, 0, 0], thumb: 'out' },
    'fist':      { curl: [1, 1, 1, 1], thumb: 'tucked' },
    'thumbs up': { curl: [1, 1, 1, 1], thumb: 'up' },
    'thumbs down': { curl: [1, 1, 1, 1], thumb: 'down' },
    'peace':     { curl: [0, 0, 1, 1], thumb: 'tucked' },
    'point':     { curl: [0, 1, 1, 1], thumb: 'tucked' },
    'pinch':     { curl: [0.45, 0.15, 0.2, 0.25], thumb: 'pinch' },
    'rock':      { curl: [0, 1, 1, 0], thumb: 'tucked' },
    'wave':      { curl: [0, 0, 0, 0], thumb: 'out', wave: true }
  };
  var POSE_ORDER = ['open', 'fist', 'thumbs up', 'thumbs down', 'peace', 'point', 'pinch', 'rock', 'wave'];

  function buildHand(pose, t, offset) {
    var P = [];
    var wob = reduceMotion ? 0 : 1;
    var sway = 0.012 * Math.sin(t * 0.9) * wob;
    if (pose.wave) sway += 0.13 * Math.sin(t * 7);   // big side-to-side motion
    var ox = offset[0] + sway, oy = offset[1] + 0.006 * Math.sin(t * 1.3) * wob;
    function at(x, y, z) { return { x: x + ox, y: y + oy, z: z || 0 }; }

    P[0] = at(0.5, 0.82, 0);
    var bases = [[0.44, 0.55], [0.5, 0.53], [0.56, 0.55], [0.61, 0.59]];
    var lens = [[0.11, 0.065, 0.05], [0.12, 0.07, 0.055], [0.11, 0.065, 0.05], [0.085, 0.05, 0.04]];
    var spread = [-0.14, 0, 0.11, 0.24];
    var bend = [1.5, 1.6, 1.2];
    for (var f = 0; f < 4; f++) {
      var c = pose.curl[f];
      var jitter = 0.03 * Math.sin(t * 1.7 + f) * wob;
      var p = at(bases[f][0], bases[f][1], 0);
      var idx = 5 + f * 4;
      P[idx] = p;
      var phi = 0;
      for (var s = 0; s < 3; s++) {
        phi += bend[s] * c + (s === 0 ? jitter : 0);
        var sp = spread[f];
        var dx = Math.sin(sp) * Math.cos(phi), dy = -Math.cos(sp) * Math.cos(phi), dz = -Math.sin(phi);
        p = { x: p.x + dx * lens[f][s], y: p.y + dy * lens[f][s], z: p.z + dz * lens[f][s] };
        P[idx + 1 + s] = p;
      }
    }

    // Thumb: base, then three segments whose angle (in the picture) changes at each joint.
    P[1] = pose.thumb === 'down' ? at(0.42, 0.66, -0.01) : at(0.42, 0.74, -0.01);
    var tl = [0.07, 0.06, 0.05], ang;
    if (pose.thumb === 'out') ang = [-125, -125, -125];
    else if (pose.thumb === 'down') ang = [95, 92, 90];
    else if (pose.thumb === 'up') ang = [-95, -92, -90];
    else ang = [-120, -50, 20];                       // tucked across the palm
    var q = P[1];
    for (var k = 0; k < 3; k++) {
      var a = ang[k] * Math.PI / 180;
      q = { x: q.x + Math.cos(a) * tl[k], y: q.y + Math.sin(a) * tl[k], z: q.z - 0.01 };
      P[2 + k] = q;
    }
    if (pose.thumb === 'pinch') {                      // bend the thumb until its tip meets the index tip
      var tip = P[8], base = P[1];
      var mid = { x: base.x - 0.05, y: (base.y + tip.y) / 2, z: -0.02 };
      P[2] = { x: (base.x + mid.x) / 2, y: (base.y + mid.y) / 2, z: -0.015 };
      P[3] = mid;
      P[4] = { x: tip.x - 0.008, y: tip.y + 0.01, z: tip.z };
    }
    // Real model: z is measured from the wrist.
    var wz = P[0].z;
    return P.map(function (pt) { return { x: pt.x, y: pt.y, z: pt.z - wz }; });
  }

  function lerpHand(a, b, u) {
    return a.map(function (p, i) {
      return { x: p.x + (b[i].x - p.x) * u, y: p.y + (b[i].y - p.y) * u, z: p.z + (b[i].z - p.z) * u };
    });
  }

  /* ================================================================
     Sounds (made with the Web Audio API, so there are no sound files)
     ================================================================ */

  var audio = null;
  function ctx() {
    if (!audio) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  function tone(freq, start, dur, type, vol) {
    var a = ctx(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, a.currentTime + start);
    g.gain.setValueAtTime(0.0001, a.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, a.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
    o.connect(g); g.connect(a.destination);
    o.start(a.currentTime + start); o.stop(a.currentTime + start + dur + 0.05);
  }
  function noise(dur, vol) {
    var a = ctx(); if (!a) return;
    var buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var s = a.createBufferSource(), g = a.createGain();
    s.buffer = buf; g.gain.value = vol || 0.3;
    s.connect(g); g.connect(a.destination); s.start();
  }
  var SOUNDS = {
    ding:   function () { tone(1318, 0, 0.6, 'sine', 0.3); tone(1975, 0, 0.4, 'sine', 0.08); },
    pop:    function () { tone(520, 0, 0.09, 'triangle', 0.35); tone(780, 0.03, 0.08, 'triangle', 0.2); },
    drum:   function () {
      var a = ctx(); if (!a) return;
      var o = a.createOscillator(), g = a.createGain();
      o.frequency.setValueAtTime(160, a.currentTime); o.frequency.exponentialRampToValueAtTime(45, a.currentTime + 0.25);
      g.gain.setValueAtTime(0.8, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.3);
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + 0.32);
    },
    clap:   function () { noise(0.12, 0.35); },
    chord:  function () { [523, 659, 784].forEach(function (f, i) { tone(f, i * 0.07, 0.7, 'triangle', 0.15); }); },
    beep:   function () { tone(880, 0, 0.15, 'square', 0.08); },
    whoosh: function () { noise(0.4, 0.15); },
    sad:    function () { tone(392, 0, 0.25, 'sawtooth', 0.08); tone(330, 0.25, 0.45, 'sawtooth', 0.08); }
  };

  /* ================================================================
     The engine: one source of hands for the whole page
     ================================================================ */

  var Engine = {
    source: 'none',           // 'none' | 'loading' | 'camera' | 'demo'
    hands: [],
    video: null,
    pose: 'open',
    demoOffset: [0, 0],
    listeners: new Set(),
    bars: new Set(),
    message: 'Turn on your camera, or use the demo hand.',
    landmarker: null,
    stream: null
  };

  var demoFrom = null, demoTo = null, demoBlend = 1, demoT = 0;

  Engine.setStatus = function (msg) {
    Engine.message = msg;
    Engine.bars.forEach(function (b) { b.update(); });
  };

  Engine.useDemo = function (pose) {
    Engine.stopCamera();
    if (pose) Engine.setPose(pose);
    Engine.source = 'demo';
    Engine.setStatus('Demo hand. Pick a pose and drag the picture to move the hand, or turn on your camera to use your own.');
  };

  Engine.setPose = function (pose) {
    if (!POSES[pose]) return;
    demoFrom = demoTo ? lerpHand(demoFrom || demoTo, demoTo, demoBlend) : null;
    Engine.pose = pose;
    demoTo = buildHand(POSES[pose], demoT, Engine.demoOffset);
    demoBlend = demoFrom ? 0 : 1;
    Engine.bars.forEach(function (b) { b.update(); });
  };

  Engine.stopCamera = function () {
    if (Engine.stream) Engine.stream.getTracks().forEach(function (t) { t.stop(); });
    Engine.stream = null;
    if (Engine.video) Engine.video.srcObject = null;
    if (Engine.source === 'camera' || Engine.source === 'loading') Engine.source = 'none';
  };

  Engine.startCamera = function () {
    ctx();   // a click is the moment browsers allow sound to start
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      Engine.setStatus('This browser cannot open a camera here. Use the demo hand instead.');
      return;
    }
    Engine.source = 'loading';
    Engine.setStatus('Asking for your camera…');
    var video = Engine.video;
    if (!video) {
      video = Engine.video = el('video', { playsinline: '', muted: '', 'aria-hidden': 'true', class: 'hand-source-video' });
      document.body.appendChild(video);   // keep it in the page: some browsers stop updating videos that aren't
    }
    video.muted = true;
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
      .then(function (stream) {
        Engine.stream = stream;
        video.srcObject = stream;
        return video.play();
      })
      .then(function () {
        if (Engine.landmarker) return Engine.landmarker;
        Engine.setStatus('Downloading the hand tracker (about 20 MB the first time, then your browser keeps it)…');
        return import(MP_BASE + '/vision_bundle.mjs').then(function (mp) {
          return mp.FilesetResolver.forVisionTasks(MP_BASE + '/wasm').then(function (files) {
            function make(delegate) {
              return mp.HandLandmarker.createFromOptions(files, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: delegate },
                runningMode: 'VIDEO',
                numHands: 2
              });
            }
            return make('GPU').catch(function () { return make('CPU'); });
          });
        }).then(function (lm) { Engine.landmarker = lm; return lm; });
      })
      .then(function () {
        if (!Engine.stream) return;   // stopped while loading
        Engine.source = 'camera';
        Engine.setStatus('Camera on. Hold up a hand. Everything runs on your computer; no video leaves this page.');
      })
      .catch(function (err) {
        Engine.stopCamera();
        var name = err && err.name;
        if (name === 'NotAllowedError') Engine.setStatus('Camera permission was blocked. Allow it in your browser’s address bar, or use the demo hand.');
        else if (name === 'NotFoundError') Engine.setStatus('No camera found. Use the demo hand instead.');
        else Engine.setStatus('Could not start hand tracking (' + (err && err.message || err) + '). Use the demo hand instead.');
      });
  };

  var lastVideoTime = -1, lastTick = 0, lastStamp = 0, trackErrors = 0;
  function tick(now) {
    requestAnimationFrame(tick);   // schedule the next frame first, so nothing below can stop the loop
    try { step(now); } catch (err) {
      if (window.console) console.error('Hand tracking frame failed:', err);
    }
  }
  function step(now) {
    var dt = lastTick ? Math.min((now - lastTick) / 1000, 0.1) : 0;
    lastTick = now;
    var changed = false;

    if (Engine.source === 'camera' && Engine.landmarker && Engine.video.readyState >= 2 && Engine.video.videoWidth > 0) {
      if (Engine.video.currentTime !== lastVideoTime) {
        lastVideoTime = Engine.video.currentTime;
        // The tracker needs every timestamp to be strictly larger than the last one.
        var stamp = Math.max(Math.round(now), lastStamp + 1);
        lastStamp = stamp;
        var r;
        try {
          r = Engine.landmarker.detectForVideo(Engine.video, stamp);
          if (trackErrors) { trackErrors = 0; Engine.setStatus('Camera on. Hold up a hand. Everything runs on your computer; no video leaves this page.'); }
        } catch (err) {
          trackErrors++;
          if (trackErrors === 1 || trackErrors % 60 === 0) {
            if (window.console) console.error('Hand tracker error:', err);
            Engine.setStatus('The hand tracker hit an error and is retrying: ' + (err && err.message || err));
          }
          r = { landmarks: [] };
        }
        var sides = r.handedness || r.handednesses || [];
        Engine.hands = (r.landmarks || []).map(function (pts, i) {
          return {
            // mirror x so it matches the mirrored picture students see
            points: pts.map(function (p) { return { x: 1 - p.x, y: p.y, z: p.z }; }),
            side: sides[i] && sides[i][0] ? sides[i][0].categoryName : '',
            score: sides[i] && sides[i][0] ? sides[i][0].score : 0
          };
        });
        changed = true;
      }
    } else if (Engine.source === 'demo') {
      demoT += dt;
      if (!demoTo) Engine.setPose(Engine.pose);
      demoBlend = Math.min(1, demoBlend + dt / 0.35);
      var target = buildHand(POSES[Engine.pose], demoT, Engine.demoOffset);
      demoTo = target;
      var pts = demoFrom && demoBlend < 1 ? lerpHand(demoFrom, target, demoBlend * demoBlend * (3 - 2 * demoBlend)) : target;
      if (demoBlend >= 1) demoFrom = null;
      Engine.hands = [{ points: pts, side: 'Right', score: 1 }];
      changed = true;
    } else if (Engine.hands.length) {
      Engine.hands = [];
      changed = true;
    }

    if (changed || Engine.source === 'camera') {
      Engine.listeners.forEach(function (fn) {
        try { fn(Engine.hands); } catch (err) { if (window.console) console.error('Hand view failed:', err); }
      });
    }
  }
  requestAnimationFrame(tick);

  /* ================================================================
     Source bar: camera / demo hand / poses
     ================================================================ */

  function SourceBar() {
    var root = el('div', { class: 'source-bar' });
    var cam = button('Turn on camera', 'btn-run');
    var demo = button('Use demo hand');
    var stop = button('Stop camera');
    var msg = el('p', { class: 'source-msg', 'aria-live': 'polite' });
    var poses = el('div', { class: 'pose-buttons', role: 'group', 'aria-label': 'Demo hand pose' });
    var poseBtns = {};
    POSE_ORDER.forEach(function (p) {
      var b = button(p, 'btn-quiet');
      b.addEventListener('click', function () { Engine.setPose(p); });
      poseBtns[p] = b;
      poses.appendChild(b);
    });
    cam.addEventListener('click', Engine.startCamera);
    demo.addEventListener('click', function () { ctx(); Engine.useDemo(); });
    stop.addEventListener('click', function () { Engine.stopCamera(); Engine.setStatus('Camera off.'); });
    root.appendChild(el('div', { class: 'source-buttons' }, [cam, stop, demo]));
    root.appendChild(msg);
    root.appendChild(poses);
    var bar = {
      root: root,
      update: function () {
        var s = Engine.source;
        cam.hidden = s === 'camera' || s === 'loading';
        stop.hidden = !(s === 'camera' || s === 'loading');
        demo.hidden = s === 'demo';
        poses.hidden = s !== 'demo';
        msg.textContent = Engine.message;
        Object.keys(poseBtns).forEach(function (p) { poseBtns[p].setAttribute('aria-pressed', String(p === Engine.pose)); });
      }
    };
    Engine.bars.add(bar);
    bar.update();
    return bar;
  }

  /* ================================================================
     A view: the picture with the skeleton drawn on top
     ================================================================ */

  function View(opts) {
    opts = opts || {};
    var canvas = el('canvas', { width: 640, height: 480, class: 'hand-canvas', 'aria-label': opts.alt || 'Camera view with the tracked hand drawn on top' });
    var c = canvas.getContext('2d');
    var self = { canvas: canvas, numbers: !!opts.numbers, highlight: -1, visible: false, label: '', labelSub: '' };
    new IntersectionObserver(function (es) {
      self.visible = es[0].isIntersecting;
      if (self.visible) self.draw(Engine.hands);   // paint right away, even before any hand shows up
    }, { rootMargin: '100px' }).observe(canvas);

    // Demo hand: drag on the picture to move it around.
    var dragging = false;
    function moveTo(e) {
      var r = canvas.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      Engine.demoOffset = [Math.max(-0.4, Math.min(0.4, x - 0.5)), Math.max(-0.3, Math.min(0.15, y - 0.62))];
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (Engine.source !== 'demo') return;
      dragging = true; canvas.setPointerCapture(e.pointerId); moveTo(e);
    });
    canvas.addEventListener('pointermove', function (e) { if (dragging) moveTo(e); });
    canvas.addEventListener('pointerup', function () { dragging = false; });
    canvas.addEventListener('pointercancel', function () { dragging = false; });

    self.draw = function (hands) {
      if (!self.visible) return;
      var W = canvas.width, H = canvas.height;
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (Engine.source === 'camera' && Engine.video && Engine.video.readyState >= 2) {
        c.save(); c.translate(W, 0); c.scale(-1, 1);          // mirror, like a selfie camera
        c.drawImage(Engine.video, 0, 0, W, H);
        c.restore();
        c.fillStyle = 'rgba(11, 26, 44, 0.25)'; c.fillRect(0, 0, W, H);
      } else {
        c.fillStyle = '#0B1A2C'; c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(95, 184, 232, 0.08)'; c.lineWidth = 1;
        for (var gx = 0; gx <= 10; gx++) { c.beginPath(); c.moveTo(gx * W / 10, 0); c.lineTo(gx * W / 10, H); c.stroke(); }
        for (var gy = 0; gy <= 10; gy++) { c.beginPath(); c.moveTo(0, gy * H / 10); c.lineTo(W, gy * H / 10); c.stroke(); }
        if (Engine.source !== 'demo') {
          c.fillStyle = '#A9B8C9'; c.font = '600 20px system-ui, sans-serif'; c.textAlign = 'center';
          c.fillText(Engine.source === 'loading' ? 'Starting…' : 'Turn on your camera or use the demo hand', W / 2, H / 2);
        }
      }
      hands.forEach(function (h) {
        var P = h.points.map(function (p) { return [p.x * W, p.y * H]; });
        c.lineWidth = 4; c.lineCap = 'round';
        BONES.forEach(function (b) {
          c.strokeStyle = 'rgba(238, 243, 248, 0.75)';
          c.beginPath(); c.moveTo(P[b[0]][0], P[b[0]][1]); c.lineTo(P[b[1]][0], P[b[1]][1]); c.stroke();
        });
        P.forEach(function (p, i) {
          var hi = i === self.highlight;
          c.fillStyle = FINGER_COLOR(i);
          c.beginPath(); c.arc(p[0], p[1], hi ? 11 : 6, 0, Math.PI * 2); c.fill();
          if (hi) { c.strokeStyle = '#FFFFFF'; c.lineWidth = 3; c.stroke(); }
          if (self.numbers) {
            c.font = '700 15px ui-monospace, monospace'; c.textAlign = 'left';
            c.lineWidth = 4; c.strokeStyle = '#0B1A2C'; c.strokeText(String(i), p[0] + 9, p[1] - 7);
            c.fillStyle = '#FFFFFF'; c.fillText(String(i), p[0] + 9, p[1] - 7);
          }
        });
      });
      if (self.label) {
        c.font = '700 34px system-ui, sans-serif'; c.textAlign = 'center';
        var tw = c.measureText(self.label).width;
        c.fillStyle = 'rgba(11, 26, 44, 0.8)';
        c.fillRect(W / 2 - tw / 2 - 18, 18, tw + 36, 52);
        c.fillStyle = '#F59E2B'; c.fillText(self.label, W / 2, 56);
      }
    };
    Engine.listeners.add(function (hands) { self.draw(hands); });
    return self;
  }

  /* ================================================================
     Hand view and inspector
     ================================================================ */

  function HandView(root) {
    var bar = SourceBar();
    var view = View({ numbers: root.dataset.numbers === 'true' });
    root.appendChild(el('figure', { class: 'hand-figure' }, [view.canvas]));
    root.appendChild(bar.root);
  }

  function Inspector(root) {
    var bar = SourceBar();
    var view = View({ numbers: true, alt: 'Camera view with all 21 landmarks numbered' });
    view.highlight = 8;
    var picker = el('div', { class: 'landmark-picker', role: 'group', 'aria-label': 'Choose a landmark' });
    var btns = [];
    for (var i = 0; i < 21; i++) {
      (function (n) {
        var b = button(String(n), 'btn-quiet');
        b.style.setProperty('--dot', FINGER_COLOR(n));
        b.addEventListener('click', function () { view.highlight = n; show(); });
        btns.push(b);
        picker.appendChild(b);
      })(i);
    }
    var name = el('p', { class: 'lm-name' });
    var readout = el('dl', { class: 'lm-readout' });
    var xs = el('dd'), ys = el('dd'), zs = el('dd'), side = el('dd');
    [['x', xs], ['y', ys], ['z', zs], ['hand', side]].forEach(function (r) { readout.appendChild(el('dt', { text: r[0] })); readout.appendChild(r[1]); });
    var code = el('p', { class: 'lm-code' });

    root.appendChild(el('div', { class: 'inspector-grid' }, [
      el('figure', { class: 'hand-figure' }, [view.canvas]),
      el('div', { class: 'inspector-panel' }, [el('p', { class: 'c4-label', text: 'Pick a landmark' }), picker, name, code, readout])
    ]));
    root.appendChild(bar.root);

    var last = [];
    function show() {
      var n = view.highlight;
      btns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === n)); });
      name.textContent = n + ': ' + NAMES[n];
      code.textContent = 'hand.points[' + n + ']';
      var h = last[0];
      if (!h) { xs.textContent = ys.textContent = zs.textContent = '–'; side.textContent = 'no hand seen'; return; }
      var p = h.points[n];
      xs.textContent = p.x.toFixed(3); ys.textContent = p.y.toFixed(3); zs.textContent = p.z.toFixed(3);
      side.textContent = h.side || '?';
    }
    var t = 0;
    Engine.listeners.add(function (hands) { last = hands; if (++t % 3 === 0) show(); });
    show();
  }

  /* ================================================================
     The gesture lab: student code runs on every frame
     ================================================================ */

  function distance(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  var labs = {};

  function Lab(root) {
    var showEditor = root.dataset.editor !== 'false';
    var src = (window.SHADERS && window.SHADERS[root.dataset.src]) || '';
    var original = src;
    var bar = SourceBar();
    var view = View({ numbers: root.dataset.numbers === 'true' });
    var soundOn = root.dataset.sound !== 'off';

    var out = el('p', { class: 'gesture-out', 'aria-live': 'polite' });
    var log = el('ol', { class: 'gesture-log', 'aria-label': 'What onGesture saw' });
    var printOut = el('pre', { class: 'print-out' });
    var status = el('div', { class: 'lab-status', role: 'status', 'aria-live': 'polite' });
    var sound = el('input', { type: 'checkbox' });
    sound.checked = soundOn;
    var soundLabel = el('label', { class: 'check' }, [sound, document.createTextNode(' Sounds')]);

    var textarea, gutterInner;
    if (showEditor) {
      textarea = el('textarea', {
        spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off',
        'aria-label': 'Gesture code. Press Escape, then Tab, to move focus out of the editor.'
      });
      var gutter = el('pre', { class: 'gutter', 'aria-hidden': 'true' });
      gutterInner = el('span'); gutter.appendChild(gutterInner);
      var runBtn = button('Run', 'btn-run'); runBtn.title = 'Run (Ctrl + Enter)';
      var resetBtn = button('Reset'); resetBtn.title = 'Go back to the starting code';
      var copyBtn = button('Copy');
      var body = el('div', { class: 'lab-body' }, [gutter, textarea]);
      if (root.dataset.height) body.style.height = root.dataset.height;
      root.appendChild(el('div', { class: 'lab hand-lab-grid' }, [
        el('div', { class: 'lab-editor' }, [
          el('div', { class: 'lab-head' }, [el('span', { class: 'lab-title', text: root.dataset.title || 'gestures.js' }), el('div', { class: 'lab-actions' }, [runBtn, resetBtn, copyBtn])]),
          body, status
        ]),
        el('div', { class: 'lab-preview hand-preview' }, [
          view.canvas,
          el('div', { class: 'hand-output' }, [el('div', { class: 'out-row' }, [el('span', { class: 'out-label', text: 'detect() returns' }), out, soundLabel]), log, printOut])
        ])
      ]));
      root.appendChild(bar.root);

      runBtn.addEventListener('click', function () { compile(textarea.value); });
      resetBtn.addEventListener('click', function () { setCode(original); });
      copyBtn.addEventListener('click', function () {
        if (navigator.clipboard) navigator.clipboard.writeText(textarea.value).then(function () {
          copyBtn.textContent = 'Copied'; setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1200);
        });
      });
      var timer = null, escaped = false;
      textarea.addEventListener('input', function () { gutterFor({}); clearTimeout(timer); timer = setTimeout(function () { compile(textarea.value); }, 600); });
      textarea.addEventListener('scroll', function () { gutterInner.style.transform = 'translateY(' + (-textarea.scrollTop) + 'px)'; });
      textarea.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); compile(textarea.value); return; }
        if (e.key === 'Escape') { escaped = true; return; }
        if (e.key === 'Tab' && !escaped && !e.shiftKey) { e.preventDefault(); insert('  '); return; }
        if (e.key === 'Enter' && !e.shiftKey) {
          var v = textarea.value, s = textarea.selectionStart, ls = v.lastIndexOf('\n', s - 1) + 1;
          var ind = v.slice(ls, s).match(/^\s*/)[0];
          if (/\{\s*$/.test(v.slice(ls, s))) ind += '  ';
          e.preventDefault(); insert('\n' + ind);
        }
        escaped = false;
      });
    } else {
      root.appendChild(el('div', { class: 'hand-demo-grid' }, [
        el('figure', { class: 'hand-figure' }, [view.canvas]),
        el('div', { class: 'hand-output' }, [el('div', { class: 'out-row' }, [el('span', { class: 'out-label', text: 'Gesture' }), out, soundLabel]), log])
      ]));
      root.appendChild(bar.root);
    }
    function insert(t) {
      if (!document.execCommand('insertText', false, t)) {
        textarea.setRangeText(t, textarea.selectionStart, textarea.selectionEnd, 'end');
        textarea.dispatchEvent(new Event('input'));
      }
    }
    function gutterFor(errLines) {
      if (!gutterInner) return;
      var n = textarea.value.split('\n').length, html = '';
      for (var i = 1; i <= n; i++) html += errLines[i] ? '<span class="err">' + i + '</span>\n' : i + '\n';
      gutterInner.innerHTML = html;
    }

    var fns = null, runtimeError = null, errorAt = 0, okStatus = true;
    var shown = '', candidate = '', streak = 0, prints = [];

    function showError(prefix, err) {
      status.className = 'lab-status has-errors';
      status.innerHTML = '';
      var line = 0, m = String(err && err.stack || '').match(/<anonymous>:(\d+):\d+/);
      if (m) line = +m[1] - 2;           // new Function adds two lines at the top
      var msg = (err && err.message) || String(err);
      status.appendChild(el('p', { text: prefix }));
      status.appendChild(el('ul', null, [el('li', null, [line > 0 ? el('b', { text: 'Line ' + line + ': ' }) : null, document.createTextNode(msg)])]));
      var e = {}; if (line > 0) e[line] = true; gutterFor(e);
    }

    function compile(code) {
      try {
        var make = new Function('distance', 'play', 'say', 'print',
          code + '\n;return { detect: typeof detect === "function" ? detect : null, onGesture: typeof onGesture === "function" ? onGesture : null };');
        var r = make(distance, function (name) {
          if (!sound.checked) return;
          var s = SOUNDS[name];
          if (s) s(); else print('No sound called "' + name + '". Try: ' + Object.keys(SOUNDS).join(', '));
        }, function (text) {
          if (!sound.checked || !window.speechSynthesis) return;
          speechSynthesis.cancel();
          speechSynthesis.speak(new SpeechSynthesisUtterance(String(text)));
        }, print);
        if (!r.detect) throw new Error('Your code needs a function named detect(hand).');
        fns = r; runtimeError = null;
        shown = ''; candidate = ''; streak = 0;
        okStatus = true;
        if (showEditor) {
          status.className = 'lab-status ok';
          status.innerHTML = 'Running on every frame. Edits apply as you type, or press <kbd>Ctrl</kbd> + <kbd>Enter</kbd>.';
          gutterFor({});
        }
      } catch (err) {
        if (showEditor) showError('Fix this to run your code (the last working version is still running):', err);
      }
    }
    function print() {
      var line = Array.prototype.map.call(arguments, function (a) {
        return typeof a === 'number' ? (Math.round(a * 1000) / 1000).toString() : typeof a === 'object' ? JSON.stringify(a) : String(a);
      }).join(' ');
      prints.push(line); if (prints.length > 6) prints.shift();
      printOut.textContent = prints.join('\n');
    }
    function setCode(code) { textarea.value = code; compile(code); }

    var STABLE = 4;   // frames a gesture must hold before it counts (stops flicker)
    var frame = 0;
    Engine.listeners.add(function (hands) {
      if (!view.visible || !fns) return;
      // After a crash, try again about once a second, so a one-off problem doesn't stop the activity.
      if (runtimeError) {
        if (performance.now() - errorAt < 1000) return;
        runtimeError = null;
      }
      frame++;
      var result = '';
      try {
        if (hands.length) {
          var r = fns.detect(hands[0]);
          result = r === undefined || r === null || r === false ? '' : String(r);
        }
      } catch (err) {
        runtimeError = err; errorAt = performance.now(); okStatus = false;
        if (showEditor) showError('Your code crashed while running (it retries every second):', err);
        return;
      }
      if (!okStatus && showEditor) {         // it ran cleanly again: clear the old error
        okStatus = true;
        status.className = 'lab-status ok';
        status.innerHTML = 'Running on every frame. Edits apply as you type, or press <kbd>Ctrl</kbd> + <kbd>Enter</kbd>.';
        gutterFor({});
      }
      if (result === candidate) streak++; else { candidate = result; streak = 1; }
      if (streak === STABLE && candidate !== shown) {
        shown = candidate;
        out.textContent = shown || '–';
        view.label = shown;
        if (shown && fns.onGesture) {
          try { fns.onGesture(shown); } catch (err) {
            runtimeError = err; errorAt = performance.now(); okStatus = false;
            if (showEditor) showError('onGesture crashed (it retries every second):', err);
          }
        }
        if (shown) {
          var li = el('li', { text: shown });
          log.insertBefore(li, log.firstChild);
          while (log.children.length > 5) log.removeChild(log.lastChild);
        }
      }
    });

    out.textContent = '–';
    if (showEditor) { textarea.value = src; gutterFor({}); }
    compile(src);
    var api = { setCode: function (c) { if (showEditor) setCode(c); }, root: root, textarea: textarea };
    if (root.id) labs[root.id] = api;
  }


  /* ================================================================
     A static, numbered map of the 21 landmarks (no camera needed)
     ================================================================ */

  function LandmarkMap(root) {
    var raw = buildHand(POSES.open, 0, [0, 0]);
    var xs = raw.map(function (p) { return p.x; }), ys = raw.map(function (p) { return p.y; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var sc = Math.min(240 / (maxX - minX), 260 / (maxY - minY));
    var P = raw.map(function (p) { return [160 + (p.x - (minX + maxX) / 2) * sc, 20 + (p.y - minY) * sc]; });
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 320 300');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'An open hand with its 21 landmarks numbered: 0 is the wrist, 4 the thumb tip, 8 the index tip, 12 the middle tip, 16 the ring tip and 20 the pinky tip.');
    function add(tag, attrs, text) {
      var n = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (text !== undefined) n.textContent = text;
      svg.appendChild(n);
      return n;
    }
    BONES.forEach(function (b) {
      add('line', { x1: P[b[0]][0], y1: P[b[0]][1], x2: P[b[1]][0], y2: P[b[1]][1], stroke: 'currentColor', 'stroke-opacity': '0.35', 'stroke-width': 3, 'stroke-linecap': 'round' });
    });
    P.forEach(function (p, i) {
      add('circle', { cx: p[0], cy: p[1], r: [0, 4, 8, 12, 16, 20].indexOf(i) >= 0 ? 7 : 5, fill: FINGER_COLOR(i), stroke: '#0B1A2C', 'stroke-width': 1.5 });
      var left = i >= 1 && i <= 4;
      add('text', { x: p[0] + (left ? -10 : 10), y: p[1] + 4, 'font-size': 12, 'font-weight': 700, 'font-family': 'ui-monospace, monospace', fill: 'currentColor', 'text-anchor': left ? 'end' : 'start' }, String(i));
    });
    var legend = el('ul', { class: 'lm-legend' });
    [['0', 'Wrist', 0], ['1–4', 'Thumb', 1], ['5–8', 'Index', 5], ['9–12', 'Middle', 9], ['13–16', 'Ring', 13], ['17–20', 'Pinky', 17]].forEach(function (r) {
      var dot = el('i'); dot.style.background = FINGER_COLOR(r[2]);
      legend.appendChild(el('li', null, [dot, el('b', { text: r[0] }), document.createTextNode(' ' + r[1])]));
    });
    root.appendChild(svg);
    root.appendChild(el('div', null, [legend, el('p', { class: 'lm-note', text: 'Each finger counts up from the knuckle to the tip, so the fingertips are 4, 8, 12, 16 and 20.' })]));
  }

  /* ================================================================ */

  function init() {
    document.querySelectorAll('.landmark-map').forEach(LandmarkMap);
    document.querySelectorAll('.hand-view').forEach(HandView);
    document.querySelectorAll('.hand-inspector').forEach(Inspector);
    document.querySelectorAll('.hand-lab').forEach(Lab);
    document.querySelectorAll('[data-hand-load]').forEach(function (b) {
      b.addEventListener('click', function () {
        var lab = labs[b.dataset.into];
        if (!lab) return;
        lab.setCode(window.SHADERS[b.dataset.handLoad]);
        lab.root.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        lab.textarea.focus({ preventScroll: true });
      });
    });
  }

  window.Hands = { Engine: Engine, POSES: POSES, buildHand: buildHand, distance: distance, SOUNDS: SOUNDS, NAMES: NAMES, labs: labs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
