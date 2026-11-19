/*
  workshops.js — the list of workshops on the home page.

  To add a workshop:
    1. Copy workshops/_template/ to workshops/<your-folder>/ and fill it in.
    2. Add an entry below. "status" is "ready" for a full lesson, or
       "outline" while the content is still being moved over.
*/
window.WORKSHOPS = [
  {
    series: 'Graphics programming',
    blurb: 'From math on a terminal to real-time pixels.',
    items: [
      {
        code: 'SP-1',
        title: 'How to donut',
        href: 'workshops/graphics-donut-window/',
        summary: 'How donut.c turns a little trigonometry into a spinning 3D donut made of text, then moving the same math into a real window with GLFW and OpenGL.',
        meta: ['C++', 'GLFW and OpenGL', 'Live demos in your browser', '30 min'],
        status: 'ready'
      },
      {
        code: 'SP-3',
        title: 'Shaders? Never heard of them',
        href: 'workshops/sp-3-shaders/',
        summary: 'What shaders are, how the GPU turns triangles into pixels, and how to draw your own face with nothing but equations.',
        meta: ['GLSL', 'Runs in your browser', '60 min'],
        status: 'ready'
      }
    ]
  },
  {
    series: 'Game AI',
    blurb: 'Programs that play games better than you do.',
    items: [
      {
        code: 'SP-2',
        title: 'Impossible Connect 4',
        href: 'workshops/connect-4-ai/',
        summary: 'Building a Connect 4 AI that never loses: an SDL3 game loop, then negamax, alpha-beta pruning, bitboards and a transposition table.',
        meta: ['C++', 'SDL3', 'Play the AI in your browser', '60 min'],
        status: 'ready'
      }
    ]
  },
  {
    series: 'Computer vision',
    blurb: 'Teaching a computer to understand a camera.',
    items: [
      {
        code: 'SP-4',
        title: 'Make a computer see your hand',
        href: 'workshops/sp-4-hand-tracking/',
        summary: 'Track your hand with your webcam, right in the browser, then write simple rules that turn a thumbs up, a peace sign or a fist into sounds. Then invent gestures of your own.',
        meta: ['JavaScript', 'MediaPipe', 'Runs in your browser', '60 min'],
        status: 'ready'
      }
    ]
  }
];

(function () {
  'use strict';
  var root = document.getElementById('catalog');
  if (!root) return;
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  window.WORKSHOPS.forEach(function (group) {
    var sec = el('section', 'series');
    var head = el('div', 'series-head');
    var h = el('h2', null, group.series);
    head.appendChild(h);
    if (group.blurb) head.appendChild(el('p', null, group.blurb));
    sec.appendChild(head);
    var list = el('ul', 'workshop-list');
    group.items.forEach(function (w) {
      var li = el('li', 'workshop');
      li.appendChild(el('span', 'workshop-code', w.code));
      var h3 = el('h3');
      var a = el('a', null, w.title);
      a.href = w.href;
      h3.appendChild(a);
      li.appendChild(h3);
      var st = el('span', 'status' + (w.status === 'ready' ? ' is-ready' : ''),
        w.status === 'ready' ? 'Full lesson' : 'Outline, lesson coming');
      li.appendChild(st);
      li.appendChild(el('p', 'summary', w.summary));
      var meta = el('p', 'meta');
      (w.meta || []).forEach(function (m) { meta.appendChild(el('span', null, m)); });
      li.appendChild(meta);
      list.appendChild(li);
    });
    sec.appendChild(list);
    root.appendChild(sec);
  });
})();
