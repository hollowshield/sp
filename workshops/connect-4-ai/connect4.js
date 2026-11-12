/*
  connect4.js — interactive pieces for the Connect 4 lesson.

  <div class="circle-grid"></div>     DrawFilledCircle, pixel by pixel
  <div class="c4-pvp"></div>          two-player game + the board[6][7] array, live
  <div class="c4-bits"></div>         the same game as a 49-bit bitboard
  <div class="c4-ai"></div>           play a (simplified) search AI and watch it count positions
  <div class="c4-chart"></div>        positions by board width, log scale
*/
(function () {
  'use strict';

  var ROWS = 6, COLS = 7;
  var EMPTY = 0, RED = 1, YELLOW = 2;

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (k) { if (k) n.appendChild(k); });
    return n;
  }
  function button(text, cls) { return el('button', { type: 'button', class: 'btn ' + (cls || ''), text: text }); }
  function name(p) { return p === RED ? 'Red' : 'Yellow'; }

  /* ---------- the game, exactly like WindowManager.cpp ---------- */

  function Game() { this.reset(); }
  Game.prototype.reset = function () {
    this.board = [];
    for (var r = 0; r < ROWS; r++) { this.board.push([0, 0, 0, 0, 0, 0, 0]); }
    this.current = RED;
    this.moves = 0;
    this.over = false;
    this.winner = 0;
    this.last = null;
    this.history = [];
  };
  // Gravity: scan from the bottom row up for the first empty cell.
  Game.prototype.makeMove = function (col) {
    if (col < 0 || col >= COLS) return -1;
    for (var r = ROWS - 1; r >= 0; r--) {
      if (this.board[r][col] === EMPTY) {
        this.board[r][col] = this.current;
        this.moves++;
        this.last = [r, col];
        this.history.push(col);
        return r;
      }
    }
    return -1;   // column is full
  };
  Game.prototype.checkWin = function () {
    var b = this.board, p = this.current;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if (b[r][c] !== p) continue;
      if (c + 3 < COLS && b[r][c + 1] === p && b[r][c + 2] === p && b[r][c + 3] === p) return [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]];
      if (r + 3 < ROWS && b[r + 1][c] === p && b[r + 2][c] === p && b[r + 3][c] === p) return [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]];
      if (r + 3 < ROWS && c + 3 < COLS && b[r + 1][c + 1] === p && b[r + 2][c + 2] === p && b[r + 3][c + 3] === p) return [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]];
      if (r - 3 >= 0 && c + 3 < COLS && b[r - 1][c + 1] === p && b[r - 2][c + 2] === p && b[r - 3][c + 3] === p) return [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]];
    }
    return null;
  };
  // applyMove: place, check win, check draw, then switch players (in that order).
  Game.prototype.applyMove = function (col) {
    if (this.over || this.makeMove(col) < 0) return false;
    var line = this.checkWin();
    if (line) { this.over = true; this.winner = this.current; this.line = line; }
    else if (this.moves === ROWS * COLS) { this.over = true; this.winner = 0; }
    else this.current = this.current === RED ? YELLOW : RED;
    return true;
  };
  Game.prototype.canPlay = function (col) { return this.board[0][col] === EMPTY; };

  /* ---------- a board you can click ---------- */

  function BoardView(game, onPlay) {
    var self = this;
    this.game = game;
    this.enabled = true;
    this.root = el('div', { class: 'c4-board', role: 'group', 'aria-label': 'Connect 4 board' });
    this.cols = [];
    for (var c = 0; c < COLS; c++) {
      (function (col) {
        var b = el('button', { type: 'button', class: 'c4-col', 'aria-label': 'Drop a piece in column ' + (col + 1) });
        for (var r = 0; r < ROWS; r++) b.appendChild(el('span', { class: 'c4-cell' }));
        b.addEventListener('click', function () { if (self.enabled) onPlay(col); });
        self.cols.push(b);
        self.root.appendChild(b);
      })(c);
    }
  }
  BoardView.prototype.render = function (overlay) {
    var g = this.game, win = {};
    if (g.line) g.line.forEach(function (rc) { win[rc[0] + ',' + rc[1]] = true; });
    for (var c = 0; c < COLS; c++) {
      var cells = this.cols[c].children;
      this.cols[c].disabled = !this.enabled || g.over || !g.canPlay(c);
      for (var r = 0; r < ROWS; r++) {
        var v = g.board[r][c], cell = cells[r];
        cell.className = 'c4-cell' + (v === RED ? ' is-red' : v === YELLOW ? ' is-yellow' : '') +
          (win[r + ',' + c] ? ' is-win' : '') + (g.last && g.last[0] === r && g.last[1] === c ? ' is-last' : '');
        cell.textContent = overlay ? overlay(r, c) : '';
      }
    }
  };

  function statusText(g, who) {
    if (g.over) return g.winner ? (who ? who(g.winner) : name(g.winner) + ' wins!') : 'Draw: the board is full.';
    return name(g.current) + ' to move.';
  }

  /* ---------- 1. DrawFilledCircle ---------- */

  function CircleGrid(root) {
    var canvas = el('canvas', { width: 320, height: 320, 'aria-label': 'A pixel grid showing which pixels are inside the circle' });
    var rIn = el('input', { type: 'range', min: 2, max: 8, step: 0.5, value: 7, id: 'circle-r' });
    var info = el('p', { class: 'circle-info', 'aria-live': 'polite' });
    root.appendChild(canvas);
    root.appendChild(el('div', { class: 'knob' }, [el('label', { for: 'circle-r', text: 'radius' }), rIn, el('output', { for: 'circle-r' })]));
    root.appendChild(info);

    function draw() {
      var radius = +rIn.value, N = 16, cell = 320 / N;
      root.querySelector('output').textContent = radius;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#E8EDF2'; ctx.fillRect(0, 0, 320, 320);
      var cx = N / 2, cy = N / 2, drawn = 0, checked = 0;
      // The same loops as the C++: w and h walk a 2r x 2r box, dx/dy measure from the center.
      for (var w = 0; w < radius * 2; w++) for (var h = 0; h < radius * 2; h++) {
        var dx = radius - w, dy = radius - h;
        var px = Math.floor(cx + dx - 0.5), py = Math.floor(cy + dy - 0.5);
        checked++;
        var inside = dx * dx + dy * dy <= radius * radius;
        if (inside) drawn++;
        ctx.fillStyle = inside ? '#E74C3C' : '#C3CDD8';
        ctx.fillRect(px * cell + 1, py * cell + 1, cell - 2, cell - 2);
      }
      ctx.strokeStyle = '#0B1A2C'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx * cell, cy * cell, radius * cell, 0, Math.PI * 2); ctx.stroke();
      info.textContent = 'Checked ' + checked + ' pixels in the box, drew ' + drawn + ' of them (dx\u00B2 + dy\u00B2 \u2264 r\u00B2).';
    }
    rIn.addEventListener('input', draw);
    draw();
  }

  /* ---------- 2. Player vs. player, with the array ---------- */

  function Pvp(root) {
    var g = new Game();
    var status = el('p', { class: 'c4-status', 'aria-live': 'polite' });
    var arr = el('pre', { class: 'code c4-array', 'aria-label': 'The board array in memory' });
    var reset = button('R  Restart');
    var view = new BoardView(g, function (col) { g.applyMove(col); update(); });
    root.appendChild(el('div', { class: 'c4-split' }, [
      el('div', null, [view.root, el('div', { class: 'c4-bar' }, [status, reset])]),
      el('div', null, [el('p', { class: 'c4-label', text: 'What the program stores' }), arr])
    ]));
    reset.addEventListener('click', function () { g.reset(); update(); });

    function update() {
      view.render();
      status.textContent = statusText(g);
      var lines = ['int board[6][7] = {   // 0 empty, 1 red, 2 yellow'];
      for (var r = 0; r < ROWS; r++) {
        lines.push('    { ' + g.board[r].join(', ') + ' },   // row ' + r + (r === 0 ? ' (top)' : r === ROWS - 1 ? ' (bottom)' : ''));
      }
      lines.push('};');
      arr.textContent = lines.join('\n');
    }
    update();
  }

  /* ---------- 3. Bitboards ---------- */

  function Bits(root) {
    var g = new Game();
    var H1 = 7n;
    var current = 0n, mask = 0n;
    function bottomMask(col) { return 1n << (BigInt(col) * H1); }
    function columnMask(col) { return ((1n << 6n) - 1n) << (BigInt(col) * H1); }
    function colBits(x, col) { return Number((x >> (BigInt(col) * H1)) & 127n).toString(2).padStart(7, '0'); }

    var showNums = el('input', { type: 'checkbox', id: 'bit-nums', checked: '' });
    var status = el('p', { class: 'c4-status', 'aria-live': 'polite' });
    var reset = button('Restart');
    var out = el('pre', { class: 'code c4-bitout', 'aria-live': 'polite' });
    var view = new BoardView(g, play);
    root.appendChild(el('div', { class: 'c4-split' }, [
      el('div', null, [
        view.root,
        el('div', { class: 'c4-bar' }, [status, el('label', { class: 'check' }, [showNums, document.createTextNode(' Show bit numbers')]), reset])
      ]),
      el('div', null, [el('p', { class: 'c4-label', text: 'Inside c4::Position' }), out])
    ]));

    var lastExplain = 'Click a column. Each drop shows the gravity-by-addition trick for that column.';

    function play(col) {
      if (g.over || !g.canPlay(col)) return;
      var before = colBits(mask, col);
      var move = (mask + bottomMask(col)) & columnMask(col);
      lastExplain = [
        'Dropping in column ' + (col + 1) + ' (bits ' + col * 7 + '\u2013' + (col * 7 + 6) + ', top bit is the spare):',
        '  mask column        ' + before,
        '+ bottomMask(col)    ' + '0000001',
        '= sum                ' + colBits(mask + bottomMask(col), col) + '   carry stops at the first empty cell',
        '& columnMask(col)    ' + '0111111',
        '= the new stone      ' + colBits(move, col)
      ].join('\n');
      current ^= mask;     // "my stones" become "your stones"
      mask |= move;
      g.applyMove(col);
      update();
    }
    reset.addEventListener('click', function () { g.reset(); current = 0n; mask = 0n; lastExplain = 'Click a column.'; update(); });
    showNums.addEventListener('change', update);

    function bin49(x) {
      var s = [];
      for (var c = COLS - 1; c >= 0; c--) s.push(colBits(x, c));
      return s.join(' ');
    }
    function update() {
      view.render(showNums.checked ? function (r, c) { return String(c * 7 + (ROWS - 1 - r)); } : null);
      status.textContent = statusText(g);
      out.textContent = [
        '// one 7-bit group per column, column 7 on the left',
        'mask    = ' + bin49(mask) + '   every stone',
        'current = ' + bin49(current) + '   ' + name(g.current) + '\u2019s stones (player to move)',
        'key     = current + mask = ' + (current + mask).toString(),
        '',
        lastExplain
      ].join('\n');
    }
    update();
  }

  /* ---------- 4. Play the search AI (in a Web Worker so the page never freezes) ---------- */

  var WORKER_SRC = [
    "var W = 7, H = 6, nodes = 0, prune = true, order = [3, 2, 4, 1, 5, 0, 6];",
    "var windows = [];",
    "(function () {",
    "  var dirs = [[0, 1], [1, 0], [1, 1], [-1, 1]];",
    "  for (var r = 0; r < H; r++) for (var c = 0; c < W; c++) dirs.forEach(function (d) {",
    "    var er = r + 3 * d[0], ec = c + 3 * d[1];",
    "    if (er < 0 || er >= H || ec >= W) return;",
    "    windows.push([0, 1, 2, 3].map(function (i) { return (r + i * d[0]) * W + c + i * d[1]; }));",
    "  });",
    "})();",
    "function run(b, r, c, dr, dc, p) { var n = 0; r += dr; c += dc; while (r >= 0 && r < H && c >= 0 && c < W && b[r * W + c] === p) { n++; r += dr; c += dc; } return n; }",
    "function wins(b, r, c, p) {",
    "  return 1 + run(b, r, c, 0, 1, p) + run(b, r, c, 0, -1, p) >= 4 || 1 + run(b, r, c, 1, 0, p) + run(b, r, c, -1, 0, p) >= 4 ||",
    "         1 + run(b, r, c, 1, 1, p) + run(b, r, c, -1, -1, p) >= 4 || 1 + run(b, r, c, 1, -1, p) + run(b, r, c, -1, 1, p) >= 4;",
    "}",
    "// Guess how good a position is for p when we stop searching: open lines of 2 and 3, plus the center column.",
    "function evaluate(b, p) {",
    "  var o = 3 - p, s = 0;",
    "  for (var i = 0; i < windows.length; i++) {",
    "    var w = windows[i], mine = 0, theirs = 0;",
    "    for (var j = 0; j < 4; j++) { var v = b[w[j]]; if (v === p) mine++; else if (v === o) theirs++; }",
    "    if (theirs === 0) s += mine === 3 ? 5 : mine === 2 ? 2 : 0;",
    "    else if (mine === 0) s -= theirs === 3 ? 5 : theirs === 2 ? 2 : 0;",
    "  }",
    "  for (var r = 0; r < H; r++) { var v2 = b[r * W + 3]; if (v2 === p) s += 3; else if (v2 === o) s -= 3; }",
    "  return s;",
    "}",
    "// Negamax: my score is minus your score. Wins score 1000 minus the move number, so faster wins are worth more.",
    "function negamax(b, h, p, depth, alpha, beta, moves) {",
    "  nodes++;",
    "  if (moves === W * H) return 0;",
    "  if (depth === 0) return evaluate(b, p);",
    "  var best = -100000;",
    "  for (var k = 0; k < W; k++) {",
    "    var c = order[k];",
    "    if (h[c] >= H) continue;",
    "    var r = H - 1 - h[c];",
    "    b[r * W + c] = p; h[c]++;",
    "    var score = wins(b, r, c, p) ? 1000 - (moves + 1) : -negamax(b, h, 3 - p, depth - 1, -beta, -alpha, moves + 1);",
    "    b[r * W + c] = 0; h[c]--;",
    "    if (score > best) best = score;",
    "    if (score > alpha) alpha = score;",
    "    if (prune && alpha >= beta) break;   // the opponent would never allow this line",
    "  }",
    "  return best;",
    "}",
    "onmessage = function (e) {",
    "  var m = e.data, b = Int8Array.from(m.board), h = Int8Array.from(m.heights);",
    "  prune = m.prune; order = m.center ? [3, 2, 4, 1, 5, 0, 6] : [0, 1, 2, 3, 4, 5, 6]; nodes = 0;",
    "  var t0 = performance.now(), best = -1, bestScore = -100000, alpha = -100000, beta = 100000;",
    "  for (var k = 0; k < W; k++) {",
    "    var c = order[k];",
    "    if (h[c] >= H) continue;",
    "    var r = H - 1 - h[c];",
    "    b[r * W + c] = m.player; h[c]++;",
    "    var score = wins(b, r, c, m.player) ? 1000 - (m.moves + 1) : -negamax(b, h, 3 - m.player, m.depth - 1, -beta, -alpha, m.moves + 1);",
    "    b[r * W + c] = 0; h[c]--;",
    "    if (best < 0 || score > bestScore) { best = c; bestScore = score; }",
    "    if (score > alpha) alpha = score;",
    "  }",
    "  postMessage({ col: best, score: bestScore, nodes: nodes, ms: performance.now() - t0 });",
    "};"
  ].join('\n');

  function Ai(root) {
    var g = new Game();
    var human = RED, ai = YELLOW;
    var worker = null, thinking = false;

    var depth = el('input', { type: 'range', min: 1, max: 9, step: 1, value: 6, id: 'ai-depth' });
    var depthOut = el('output', { for: 'ai-depth' });
    var prune = el('input', { type: 'checkbox', id: 'ai-prune', checked: '' });
    var center = el('input', { type: 'checkbox', id: 'ai-center', checked: '' });
    var aiFirst = el('input', { type: 'checkbox', id: 'ai-first' });
    var status = el('p', { class: 'c4-status', 'aria-live': 'polite' });
    var reset = button('New game');
    var stop = button('Stop thinking');
    stop.hidden = true;
    var log = el('tbody');
    var view = new BoardView(g, function (col) {
      if (thinking || g.over || g.current !== human) return;
      g.applyMove(col);
      update();
      maybeAiTurn();
    });

    root.appendChild(el('div', { class: 'c4-split' }, [
      el('div', null, [view.root, el('div', { class: 'c4-bar' }, [status, stop, reset])]),
      el('div', { class: 'ai-panel' }, [
        el('p', { class: 'c4-label', text: 'AI settings' }),
        el('div', { class: 'knob' }, [el('label', { for: 'ai-depth', text: 'Look ahead (moves)' }), depth, depthOut]),
        el('label', { class: 'check' }, [prune, document.createTextNode(' Alpha-beta pruning')]),
        el('label', { class: 'check' }, [center, document.createTextNode(' Search the center first')]),
        el('label', { class: 'check' }, [aiFirst, document.createTextNode(' AI moves first (it plays red)')]),
        el('div', { class: 'table-wrap' }, [el('table', { class: 'ai-log' }, [
          el('thead', null, [el('tr', null, ['Move', 'Look ahead', 'Settings', 'Positions', 'Time'].map(function (t) { return el('th', { text: t }); }))]),
          log
        ])])
      ])
    ]));

    function showDepth() { depthOut.textContent = depth.value; }
    depth.addEventListener('input', showDepth);
    showDepth();

    function newGame() {
      if (worker) { worker.terminate(); worker = null; }
      thinking = false;
      g.reset();
      human = aiFirst.checked ? YELLOW : RED;
      ai = aiFirst.checked ? RED : YELLOW;
      log.innerHTML = '';
      update();
      maybeAiTurn();
    }
    reset.addEventListener('click', newGame);
    aiFirst.addEventListener('change', newGame);
    stop.addEventListener('click', function () {
      if (worker) { worker.terminate(); worker = null; }
      thinking = false;
      status.textContent = 'Stopped. Lower the look-ahead or turn pruning back on, then press New game.';
      stop.hidden = true;
      view.enabled = true;
      view.render();
    });

    function update() {
      view.enabled = !thinking;
      view.render();
      stop.hidden = !thinking;
      if (thinking) status.textContent = 'AI thinking\u2026';
      else status.textContent = statusText(g, function (w) { return w === ai ? 'The AI wins. Press New game to try again.' : 'You win!'; })
        .replace(name(human) + ' to move.', 'Your turn (' + name(human).toLowerCase() + ').');
    }

    function maybeAiTurn() {
      if (g.over || g.current !== ai) return;
      thinking = true;
      update();
      var blob = new Blob([WORKER_SRC], { type: 'text/javascript' });
      worker = new Worker(URL.createObjectURL(blob));
      var flat = [], heights = [];
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) flat.push(g.board[r][c]);
      for (var c2 = 0; c2 < COLS; c2++) { var n = 0; for (var r2 = 0; r2 < ROWS; r2++) if (g.board[r2][c2]) n++; heights.push(n); }
      var settings = { d: +depth.value, p: prune.checked, c: center.checked };
      worker.onmessage = function (e) {
        worker.terminate(); worker = null;
        thinking = false;
        var m = e.data;
        var row = el('tr', null, [
          el('td', { text: String(g.moves + 1) }),
          el('td', { text: String(settings.d) }),
          el('td', { text: (settings.p ? 'pruning' : 'no pruning') + (settings.c ? ', center first' : '') }),
          el('td', { text: m.nodes.toLocaleString() }),
          el('td', { text: m.ms < 10 ? m.ms.toFixed(1) + ' ms' : Math.round(m.ms).toLocaleString() + ' ms' })
        ]);
        log.insertBefore(row, log.firstChild);
        g.applyMove(m.col);
        update();
      };
      worker.postMessage({ board: flat, heights: heights, player: ai, depth: settings.d, prune: settings.p, center: settings.c, moves: g.moves });
    }

    newGame();
  }

  /* ---------- 5. Positions by width ---------- */

  function Chart(root) {
    var data = [[1, 7], [2, 1571], [3, 235781], [4, 15835683], [5, 1044334437], [6, 69173028785], [7, 4531985219092]];
    var max = Math.log10(data[data.length - 1][1]);
    var list = el('ol', { class: 'c4-bars', 'aria-label': 'Possible positions on a 6-row board, by width' });
    data.forEach(function (d) {
      var pct = Math.max(2, Math.log10(d[1]) / max * 100);
      var bar = el('span', { class: 'bar' });
      bar.style.width = pct + '%';
      list.appendChild(el('li', null, [
        el('span', { class: 'bar-label', text: d[0] + ' wide' }),
        el('span', { class: 'bar-track' }, [bar]),
        el('span', { class: 'bar-value', text: d[1].toLocaleString() })
      ]));
    });
    root.appendChild(list);
    root.appendChild(el('p', { class: 'chart-note', text: 'Bar length is on a log scale: every step to the right is about 65 times more positions.' }));
  }

  function init() {
    document.querySelectorAll('.circle-grid').forEach(CircleGrid);
    document.querySelectorAll('.c4-pvp').forEach(Pvp);
    document.querySelectorAll('.c4-bits').forEach(Bits);
    document.querySelectorAll('.c4-ai').forEach(Ai);
    document.querySelectorAll('.c4-chart').forEach(Chart);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
