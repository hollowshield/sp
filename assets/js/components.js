/*
  components.js — turns plain markup into interactive pieces.

  <div class="lab" id="lab-hello" data-src="hello" data-title="hello.glsl"></div>
      An editor + live preview. data-src names a shader in window.SHADERS
      (or the id of a <script type="x-shader/x-fragment"> tag on the page).

  <div class="compare" data-src="lightsaber" data-define="BLAND"></div>
      Two previews of one shader: "#define BLAND 1" vs "#define BLAND 0".

  <div class="demo" data-src="hero"></div>
      One preview, no editor.

  <pre class="code" data-src="answer-id"></pre>
      Read-only code, filled from a shader source.

  <button data-load="answer-id" data-into="lab-hello">Load into the editor</button>
      Replaces a lab's code.

  <nav class="toc" data-for="main"></nav>
      Builds a table of contents from the h2s in <main>.
*/
(function () {
  'use strict';

  var labs = {};

  function getSource(id) {
    if (window.SHADERS && Object.prototype.hasOwnProperty.call(window.SHADERS, id)) return window.SHADERS[id];
    var tag = document.getElementById(id);
    if (tag) return tag.textContent.replace(/^\n/, '').replace(/\s+$/, '') + '\n';
    console.warn('No shader source named "' + id + '"');
    return '';
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Light-touch highlighting for read-only code: comments and numbers.
  function highlight(code) {
    return code.split('\n').map(function (line) {
      var i = line.indexOf('//');
      var body = i >= 0 ? line.slice(0, i) : line;
      var comment = i >= 0 ? line.slice(i) : '';
      var html = escapeHtml(body)
        .replace(/(^|[^\w.])(\d+\.\d*|\.\d+|\d+)(?![\w])/g, '$1<span class="tok-num">$2</span>')
        .replace(/^(\s*)(#\w+)/, '$1<span class="tok-pre">$2</span>');
      return html + (comment ? '<span class="tok-com">' + escapeHtml(comment) + '</span>' : '');
    }).join('\n');
  }

  function encode(text) {
    var bytes = new TextEncoder().encode(text), bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(str) {
    var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function siteRoot() {
    var s = document.querySelector('script[src*="components.js"]');
    return s ? s.getAttribute('src').replace(/assets\/js\/components\.js.*$/, '') : '';
  }
  function playgroundLink(code) {
    return siteRoot() + 'playground/#code=' + encode(code);
  }

  function copyText(text, button, done) {
    var original = button.textContent;
    function flash(msg) { button.textContent = msg; setTimeout(function () { button.textContent = original; }, 1400); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(done || 'Copied'); }, function () { flash('Copy failed'); });
    } else {
      flash('Copy failed');
    }
  }

  /* ---------------- Lab: editor + live preview ---------------- */

  function Lab(root) {
    var self = this;
    var srcId = root.dataset.src;
    var initial = root.dataset.initial !== undefined ? root.dataset.initial : getSource(srcId);
    this.original = initial;
    this.root = root;
    var isPlayground = root.hasAttribute('data-playground');
    // data-uniforms="name" picks extra shader inputs a lesson registered in window.LAB_INPUTS.
    var inputs = (root.dataset.uniforms && window.LAB_INPUTS && window.LAB_INPUTS[root.dataset.uniforms]) || null;

    var textarea = el('textarea', {
      spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off',
      wrap: 'off', 'aria-label': 'Shader code. Press Escape, then Tab, to move focus out of the editor.'
    });
    var gutter = el('pre', { class: 'gutter', 'aria-hidden': 'true' });
    var gutterInner = el('span');
    gutter.appendChild(gutterInner);
    var status = el('div', { class: 'lab-status', role: 'status', 'aria-live': 'polite' });

    var runBtn = el('button', { type: 'button', class: 'btn btn-run', text: 'Run', title: 'Run (Ctrl + Enter)' });
    var resetBtn = el('button', { type: 'button', class: 'btn', text: 'Reset', title: 'Go back to the starting code' });
    var copyBtn = el('button', { type: 'button', class: 'btn', text: 'Copy' });
    // The playground doesn't have a lesson's extra inputs, so those labs don't link to it.
    var extra = isPlayground
      ? el('button', { type: 'button', class: 'btn', text: 'Copy share link' })
      : inputs ? null
      : el('a', { class: 'btn', href: '#', target: '_blank', rel: 'noopener', text: 'Open in playground' });

    var head = el('div', { class: 'lab-head' }, [
      el('span', { class: 'lab-title', text: root.dataset.title || 'shader.glsl' }),
      el('div', { class: 'lab-actions' }, [runBtn, resetBtn, copyBtn, extra])
    ]);
    var body = el('div', { class: 'lab-body' }, [gutter, textarea]);
    if (root.dataset.height) body.style.height = root.dataset.height;

    var canvas = el('canvas', { 'aria-label': root.dataset.alt || 'Live output of the shader code' });
    var playBtn = el('button', { type: 'button', class: 'btn btn-quiet', text: 'Pause' });
    var restartBtn = el('button', { type: 'button', class: 'btn btn-quiet', text: 'Restart', title: 'Set iTime back to 0' });
    var preview = el('figure', { class: 'lab-preview' }, [
      canvas,
      el('figcaption', null, [playBtn, restartBtn, el('span', { class: 'lab-hint', text: (inputs && inputs.hint) || 'Drag to move iMouse' })])
    ]);

    root.appendChild(el('div', { class: 'lab-editor' }, [head, body, status]));
    root.appendChild(preview);

    this.textarea = textarea;
    this.view = new Shaders.ShaderView(canvas, {
      onState: function (v) { playBtn.textContent = v.playing ? 'Pause' : 'Play'; },
      prelude: inputs ? inputs.prelude : '',
      uniforms: inputs ? inputs.set : null
    });
    playBtn.textContent = this.view.playing ? 'Pause' : 'Play';

    function renderGutter(errorLines) {
      var n = textarea.value.split('\n').length, html = '';
      for (var i = 1; i <= n; i++) {
        html += errorLines[i] ? '<span class="err">' + i + '</span>\n' : i + '\n';
      }
      gutterInner.innerHTML = html;
    }
    this.errorLines = {};

    this.run = function () {
      var errors = self.view.setSource(textarea.value);
      self.errorLines = {};
      status.innerHTML = '';
      if (errors.length) {
        status.className = 'lab-status has-errors';
        var list = el('ul');
        errors.forEach(function (e) {
          if (e.line) self.errorLines[e.line] = true;
          list.appendChild(el('li', null, [
            e.line ? el('b', { text: 'Line ' + e.line + ': ' }) : null,
            document.createTextNode(e.message)
          ]));
        });
        status.appendChild(el('p', { text: self.view.program ? 'Fix this to update the preview (it still shows your last working version):' : 'Fix this to see your shader:' }));
        status.appendChild(list);
      } else {
        status.className = 'lab-status ok';
        status.innerHTML = 'Running. The preview updates as you type, or press <kbd>Ctrl</kbd> + <kbd>Enter</kbd>.';
      }
      renderGutter(self.errorLines);
      if (!isPlayground && extra) extra.href = playgroundLink(textarea.value);
      if (root.onCodeChange) root.onCodeChange(textarea.value);
    };

    this.setCode = function (code) {
      textarea.value = code;
      self.run();
      self.view.restart();
    };

    var timer = null;
    textarea.addEventListener('input', function () {
      renderGutter(self.errorLines);
      clearTimeout(timer);
      timer = setTimeout(self.run, 450);
    });
    textarea.addEventListener('scroll', function () {
      gutterInner.style.transform = 'translateY(' + (-textarea.scrollTop) + 'px)';
    });

    var escaped = false;
    textarea.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.key === 'Enter') {
        e.preventDefault(); clearTimeout(timer); self.run(); return;
      }
      if (e.key === 'Escape') { escaped = true; return; }
      if (e.key === 'Tab' && !escaped && !e.shiftKey) {
        e.preventDefault();
        insertText('    ');
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        // keep the current line's indentation
        var v = textarea.value, start = textarea.selectionStart;
        var lineStart = v.lastIndexOf('\n', start - 1) + 1;
        var indent = v.slice(lineStart, start).match(/^\s*/)[0];
        if (/\{\s*$/.test(v.slice(lineStart, start))) indent += '    ';
        e.preventDefault();
        insertText('\n' + indent);
      }
      escaped = false;
    });
    function insertText(t) {
      // execCommand keeps the browser's undo history working
      if (!document.execCommand('insertText', false, t)) {
        var s = textarea.selectionStart, en = textarea.selectionEnd;
        textarea.setRangeText(t, s, en, 'end');
        textarea.dispatchEvent(new Event('input'));
      }
    }

    runBtn.addEventListener('click', function () { clearTimeout(timer); self.run(); });
    resetBtn.addEventListener('click', function () { self.setCode(self.original); });
    copyBtn.addEventListener('click', function () { copyText(textarea.value, copyBtn); });
    if (isPlayground) {
      extra.addEventListener('click', function () {
        var url = location.origin + location.pathname + '#code=' + encode(textarea.value);
        history.replaceState(null, '', url);
        copyText(url, extra, 'Link copied');
      });
    }
    playBtn.addEventListener('click', function () { self.view.toggle(); });
    restartBtn.addEventListener('click', function () { self.view.restart(); });

    textarea.value = initial;
    this.run();
  }

  /* ---------------- Compare: bland vs unique ---------------- */

  function Compare(root) {
    var src = getSource(root.dataset.src);
    var key = root.dataset.define || 'BLAND';
    function panel(label, value, cls) {
      var canvas = el('canvas', { 'aria-label': label + ' version of the shader' });
      var fig = el('figure', { class: 'compare-panel ' + cls }, [
        canvas, el('figcaption', { text: label })
      ]);
      var view = new Shaders.ShaderView(canvas);
      var errs = view.setSource(Shaders.setDefine(src, key, value));
      if (errs.length) console.error(root.dataset.src, errs);
      return fig;
    }
    root.appendChild(panel('Bland', 1, 'is-bland'));
    root.appendChild(panel('Unique', 0, 'is-unique'));
    if (root.dataset.link !== 'none') {
      root.appendChild(el('p', { class: 'compare-link' }, [
        el('a', { href: playgroundLink(src), target: '_blank', rel: 'noopener', text: 'Open this shader in the playground' }),
        document.createTextNode(' and change BLAND between 0 and 1.')
      ]));
    }
  }

  /* ---------------- Demo: one preview ---------------- */

  function Demo(root) {
    var canvas = el('canvas', { 'aria-label': root.dataset.alt || 'Shader animation' });
    root.appendChild(canvas);
    var view = new Shaders.ShaderView(canvas, { interactive: root.dataset.interactive !== 'false' });
    var errs = view.setSource(getSource(root.dataset.src));
    if (errs.length) console.error(root.dataset.src, errs);
    root.view = view;
  }

  /* ---------------- Table of contents ---------------- */

  function Toc(nav) {
    var main = document.querySelector(nav.dataset.for || 'main');
    var heads = main.querySelectorAll('h2[id]');
    if (!heads.length) return;
    var list = el('ol');
    var links = [];
    heads.forEach(function (h) {
      var a = el('a', { href: '#' + h.id, text: h.dataset.toc || h.textContent });
      links.push(a);
      list.appendChild(el('li', null, [a]));
    });
    nav.appendChild(list);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -75% 0px' });
    heads.forEach(function (h) { spy.observe(h); });
  }

  function init() {
    document.querySelectorAll('.lab').forEach(function (n) {
      var lab = new Lab(n);
      if (n.id) labs[n.id] = lab;
    });
    document.querySelectorAll('.compare').forEach(function (n) { Compare(n); });
    document.querySelectorAll('.demo').forEach(function (n) { Demo(n); });
    document.querySelectorAll('pre.code[data-src]').forEach(function (n) {
      n.innerHTML = '<code>' + highlight(getSource(n.dataset.src).replace(/\s+$/, '')) + '</code>';
    });
    document.querySelectorAll('pre.code:not([data-src]) code').forEach(function (n) {
      n.innerHTML = highlight(n.textContent.replace(/^\n/, '').replace(/\s+$/, ''));
    });
    document.querySelectorAll('[data-load]').forEach(function (b) {
      b.addEventListener('click', function () {
        var lab = labs[b.dataset.into];
        if (!lab) return;
        lab.setCode(getSource(b.dataset.load));
        lab.root.scrollIntoView({ behavior: Shaders.reduceMotion ? 'auto' : 'smooth', block: 'center' });
        lab.textarea.focus({ preventScroll: true });
      });
    });
    document.querySelectorAll('nav.toc').forEach(Toc);
    if (!Shaders.supported) {
      document.body.classList.add('no-webgl');
    }
  }

  window.Components = { getSource: getSource, encode: encode, decode: decode, labs: labs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
