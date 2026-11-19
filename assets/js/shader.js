/*
  shader.js — a tiny Shadertoy-compatible renderer.

  Every shader on a page is drawn by ONE hidden WebGL2 context, and the
  result is copied into that shader's visible <canvas>. Browsers only allow
  a handful of live WebGL contexts per page, so this keeps lessons with many
  demos working.

  Shaders use the Shadertoy entry point and inputs:
    void mainImage(out vec4 fragColor, in vec2 fragCoord)
    iResolution, iTime, iTimeDelta, iFrame, iMouse, iDate
*/
(function () {
  'use strict';

  var VERT = '#version 300 es\nin vec2 a;\nvoid main() { gl_Position = vec4(a, 0.0, 1.0); }';

  // "#line 1" makes compiler errors use the student's own line numbers.
  var PRELUDE = [
    '#version 300 es',
    'precision highp float;',
    'precision highp int;',
    'uniform vec3 iResolution;',
    'uniform float iTime;',
    'uniform float iTimeDelta;',
    'uniform int iFrame;',
    'uniform vec4 iMouse;',
    'uniform vec4 iDate;',
    'out vec4 st_FragColor;',
    ''
  ].join('\n');
  // Lessons can add their own inputs (SP-4 adds the hand). They go before
  // "#line 1" so error line numbers still match the student's code.
  function prelude(extra) { return PRELUDE + (extra ? extra + '\n' : '') + '#line 1\n'; }

  var EPILOGUE = '\nvoid main() {\n  vec4 c = vec4(0.0, 0.0, 0.0, 1.0);\n  mainImage(c, gl_FragCoord.xy);\n  st_FragColor = vec4(c.rgb, 1.0);\n}\n';

  var glCanvas = document.createElement('canvas');
  glCanvas.width = 2; glCanvas.height = 2;
  var gl = glCanvas.getContext('webgl2', {
    antialias: false, alpha: false, depth: false,
    preserveDrawingBuffer: true, powerPreference: 'low-power'
  });
  var supported = !!gl;
  var vertexShader = null;

  if (supported) {
    vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, VERT);
    gl.compileShader(vertexShader);
    // One triangle big enough to cover the whole screen.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }

  function parseErrors(log, userLines) {
    var out = [];
    log.split('\n').forEach(function (raw) {
      var line = raw.replace(/\u0000/g, '').trim();
      if (!line) return;
      var m = line.match(/^(?:ERROR|WARNING):\s*\d+:(\d+):\s*(.*)$/);
      if (!m) { out.push({ line: 0, message: line }); return; }
      var n = +m[1];
      if (n > userLines) {
        out.push({ line: 0, message: 'Your code needs a function named mainImage(out vec4 fragColor, in vec2 fragCoord).' });
      } else {
        out.push({ line: n, message: m[2].replace(/^'([^']*)' : /, '$1: ') });
      }
    });
    // drop exact duplicates
    return out.filter(function (e, i) {
      return out.findIndex(function (o) { return o.line === e.line && o.message === e.message; }) === i;
    });
  }

  function compile(source, extraPrelude) {
    if (!supported) {
      return { errors: [{ line: 0, message: 'This browser does not support WebGL2, so shaders cannot run here. Try a recent Chrome, Edge, Firefox or Safari.' }] };
    }
    var userLines = source.split('\n').length;
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, prelude(extraPrelude) + source + EPILOGUE);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      var errs = parseErrors(gl.getShaderInfoLog(fs) || '', userLines);
      gl.deleteShader(fs);
      return { errors: errs.length ? errs : [{ line: 0, message: 'The shader did not compile.' }] };
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, vertexShader);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'a');
    gl.linkProgram(prog);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      var msg = gl.getProgramInfoLog(prog) || 'The shader did not link.';
      gl.deleteProgram(prog);
      return { errors: [{ line: 0, message: msg }] };
    }
    function u(name) { return gl.getUniformLocation(prog, name); }
    return {
      program: {
        prog: prog, res: u('iResolution'), time: u('iTime'), delta: u('iTimeDelta'),
        frame: u('iFrame'), mouse: u('iMouse'), date: u('iDate')
      }
    };
  }

  // Replace "#define NAME value" in a source string (used for BLAND / ANSWER toggles).
  function setDefine(source, name, value) {
    var re = new RegExp('#define\\s+' + name + '\\s+[^\\s/]+');
    return source.replace(re, '#define ' + name + ' ' + value);
  }

  var views = new Set();
  var byCanvas = new WeakMap();
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var visibility = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = byCanvas.get(e.target);
      if (!v) return;
      v.visible = e.isIntersecting;
      if (v.visible) v.dirty = true;
    });
  }, { rootMargin: '120px' });

  var resize = new ResizeObserver(function (entries) {
    entries.forEach(function (e) {
      var v = byCanvas.get(e.target);
      if (v) v.dirty = true;
    });
  });

  function ShaderView(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.program = null;
    this.time = opts.startTime || 0;
    this.frame = 0;
    this.playing = !reduceMotion && opts.autoplay !== false;
    this.visible = false;
    this.dirty = true;
    this.mouse = [0, 0, 0, 0];
    this.onState = opts.onState || null;
    this.prelude = opts.prelude || '';        // extra uniform declarations
    this.uniforms = opts.uniforms || null;    // function (gl, program, view) that sets them
    byCanvas.set(canvas, this);
    views.add(this);
    visibility.observe(canvas);
    resize.observe(canvas);
    if (opts.interactive !== false) this._bindMouse();
  }

  // Returns [] on success, or a list of {line, message}. On failure the
  // previous working shader keeps running, so the preview never goes blank.
  ShaderView.prototype.setSource = function (source) {
    var r = compile(source, this.prelude);
    if (r.errors) return r.errors;
    if (this.program) gl.deleteProgram(this.program.prog);
    this.program = r.program;
    this.dirty = true;
    return [];
  };
  ShaderView.prototype.play = function () { this.playing = true; this._emit(); };
  ShaderView.prototype.pause = function () { this.playing = false; this._emit(); };
  ShaderView.prototype.toggle = function () { if (this.playing) this.pause(); else this.play(); };
  ShaderView.prototype.restart = function () { this.time = 0; this.frame = 0; this.dirty = true; };
  ShaderView.prototype._emit = function () { if (this.onState) this.onState(this); };

  ShaderView.prototype._bindMouse = function () {
    var self = this, c = this.canvas, down = false;
    function pos(e) {
      var r = c.getBoundingClientRect();
      var s = c.width / Math.max(r.width, 1);
      return [(e.clientX - r.left) * s, (r.bottom - e.clientY) * s];
    }
    c.addEventListener('pointerdown', function (e) {
      down = true;
      c.setPointerCapture(e.pointerId);
      var p = pos(e);
      self.mouse = [p[0], p[1], p[0], p[1]];
      self.dirty = true;
    });
    c.addEventListener('pointermove', function (e) {
      if (!down) return;
      var p = pos(e);
      self.mouse[0] = p[0]; self.mouse[1] = p[1];
      self.dirty = true;
    });
    function up() {
      if (!down) return;
      down = false;
      self.mouse[2] = -Math.abs(self.mouse[2]);
      self.mouse[3] = -Math.abs(self.mouse[3]);
      self.dirty = true;
    }
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
  };

  ShaderView.prototype.render = function (dt) {
    var c = this.canvas, p = this.program;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.round(c.clientWidth * dpr));
    var h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    if (glCanvas.width < w) glCanvas.width = w;   // only ever grows
    if (glCanvas.height < h) glCanvas.height = h;

    gl.viewport(0, 0, w, h);
    gl.useProgram(p.prog);
    gl.uniform3f(p.res, w, h, 1);
    gl.uniform1f(p.time, this.time);
    gl.uniform1f(p.delta, dt);
    gl.uniform1i(p.frame, this.frame);
    gl.uniform4fv(p.mouse, this.mouse);
    var d = new Date();
    gl.uniform4f(p.date, d.getFullYear(), d.getMonth(), d.getDate(),
      d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000);
    if (this.uniforms) this.uniforms(gl, p.prog, this);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // WebGL draws from the bottom-left corner of the hidden canvas.
    this.ctx.drawImage(glCanvas, 0, glCanvas.height - h, w, h, 0, 0, w, h);
    this.frame++;
    this.dirty = false;
  };

  var last = performance.now();
  function tick(now) {
    var dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    views.forEach(function (v) {
      if (!v.visible || !v.program) return;
      if (v.playing) v.time += dt;
      if (v.playing || v.dirty) v.render(dt);
    });
    requestAnimationFrame(tick);
  }
  if (supported) requestAnimationFrame(tick);

  window.Shaders = {
    supported: supported,
    reduceMotion: reduceMotion,
    compile: compile,
    setDefine: setDefine,
    ShaderView: ShaderView
  };
})();
