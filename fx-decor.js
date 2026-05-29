/*!
 * fx-decor.js — Decorative SVG/Canvas animation elements
 *
 *   Adds purely-decorative DOM into <body>:
 *     1. 浮动行星系统  (左下角 SVG orrery)
 *     2. 章节波纹分隔线 (在每个 <section> 前注入 SVG wave)
 *     3. 顶部声波频谱条 (导航下方居中)
 *     4. 四角十字坐标标记 (实时跟随鼠标)
 *     5. 中央指南针 (默认隐藏 / API 触发)
 *
 *   API:
 *     window.FXDecor.init()           // 自动启动 (DOMContentLoaded 时)
 *     window.FXDecor.showCompass()    // 显示罗盘
 *     window.FXDecor.hideCompass()    // 隐藏罗盘
 *     window.FXDecor.toggleCompass()  // 切换
 *     window.FXDecor.destroy()        // 销毁
 *
 *   主题色: 紫 #b18cff / 青 #6ee7ff / 粉 #ff7eb6 / 金 #ffd56e
 *   z-index: 51 (wave) / 54 (corner) / 55 (orrery) / 56 (spectrum) / 58 (compass)
 *   不修改 index.html / styles.css / script.js
 */
(function (global) {
  'use strict';

  // ---- 颜色 ----
  const C = {
    purple: '#b18cff',
    cyan:   '#6ee7ff',
    pink:   '#ff7eb6',
    gold:   '#ffd56e',
    bg:     '#08080f'
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const state = {
    ready: false,
    nodes: {
      orrery: null,
      spectrum: null,
      corners: [],
      waves: [],
      compass: null
    },
    spec: {
      bars: [],
      phases: [],
      raf: 0,
      t0: 0
    },
    coords: {
      x: 0,
      y: 0
    }
  };

  // ============================================================
  // 通用工具
  // ============================================================
  function el(tag, attrs, parent) {
    const node = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
      else node.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function svgEl(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) {
      node.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function ensureStylesheet() {
    if (document.querySelector('link[href$="fx-decor.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'fx-decor.css';
    document.head.appendChild(link);
  }

  // ============================================================
  // 1. 浮动行星系统 (Orrery)
  // ============================================================
  //
  //  viewBox 200x200, 中心 (100,100)
  //  - 中心恒星 (脉冲 + 光晕)
  //  - 3 颗椭圆轨道行星, 不同速度/半径/相位
  //  - 行星 P1 上挂一个小卫星
  //  - hover 整体加速
  //
  function buildOrrery() {
    const wrap = el('div', { class: 'fxd-orrery', 'aria-hidden': 'true' }, document.body);
    const svg = svgEl('svg', {
      viewBox: '0 0 200 200',
      xmlns: SVG_NS
    }, wrap);

    // ---- defs: 渐变 ----
    const defs = svgEl('defs', null, svg);
    // 恒星径向渐变
    const starGrad = svgEl('radialGradient', { id: 'fxdStarGrad', cx: '50%', cy: '50%', r: '50%' }, defs);
    svgEl('stop', { offset: '0%',   'stop-color': '#fff7d6', 'stop-opacity': '1' }, starGrad);
    svgEl('stop', { offset: '55%',  'stop-color': C.gold,    'stop-opacity': '0.95' }, starGrad);
    svgEl('stop', { offset: '100%', 'stop-color': C.gold,    'stop-opacity': '0' }, starGrad);

    // 光晕渐变
    const haloGrad = svgEl('radialGradient', { id: 'fxdHaloGrad', cx: '50%', cy: '50%', r: '50%' }, defs);
    svgEl('stop', { offset: '0%',   'stop-color': C.gold, 'stop-opacity': '0.45' }, haloGrad);
    svgEl('stop', { offset: '50%',  'stop-color': C.pink, 'stop-opacity': '0.18' }, haloGrad);
    svgEl('stop', { offset: '100%', 'stop-color': C.purple, 'stop-opacity': '0' }, haloGrad);

    // 行星渐变 - 紫
    const p1Grad = svgEl('radialGradient', { id: 'fxdP1Grad', cx: '35%', cy: '35%', r: '70%' }, defs);
    svgEl('stop', { offset: '0%',   'stop-color': '#e2d4ff' }, p1Grad);
    svgEl('stop', { offset: '60%',  'stop-color': C.purple  }, p1Grad);
    svgEl('stop', { offset: '100%', 'stop-color': '#4a2f8a' }, p1Grad);

    // 行星渐变 - 青
    const p2Grad = svgEl('radialGradient', { id: 'fxdP2Grad', cx: '35%', cy: '35%', r: '70%' }, defs);
    svgEl('stop', { offset: '0%',   'stop-color': '#d6f8ff' }, p2Grad);
    svgEl('stop', { offset: '60%',  'stop-color': C.cyan    }, p2Grad);
    svgEl('stop', { offset: '100%', 'stop-color': '#1e5e6f' }, p2Grad);

    // 行星渐变 - 粉
    const p3Grad = svgEl('radialGradient', { id: 'fxdP3Grad', cx: '35%', cy: '35%', r: '70%' }, defs);
    svgEl('stop', { offset: '0%',   'stop-color': '#ffd9e6' }, p3Grad);
    svgEl('stop', { offset: '60%',  'stop-color': C.pink    }, p3Grad);
    svgEl('stop', { offset: '100%', 'stop-color': '#7a2e4f' }, p3Grad);

    // ---- 背景十字坐标 / 装饰刻度 ----
    const decoG = svgEl('g', { stroke: 'rgba(177,140,255,0.15)', 'stroke-width': '0.4' }, svg);
    // 外圆框
    svgEl('circle', { cx: 100, cy: 100, r: 96, fill: 'none' }, decoG);
    // 内细环
    svgEl('circle', { cx: 100, cy: 100, r: 14, fill: 'none', stroke: 'rgba(255,213,110,0.25)' }, decoG);
    // 十字
    svgEl('line', { x1: 100, y1: 8, x2: 100, y2: 28 }, decoG);
    svgEl('line', { x1: 100, y1: 172, x2: 100, y2: 192 }, decoG);
    svgEl('line', { x1: 8, y1: 100, x2: 28, y2: 100 }, decoG);
    svgEl('line', { x1: 172, y1: 100, x2: 192, y2: 100 }, decoG);

    // ---- 轨道椭圆 (椭圆 rx≠ry, 旋转给点倾斜感) ----
    // O1: rx=38, ry=28, rot=-15  (内圈, 快)
    // O2: rx=62, ry=46, rot=18   (中圈)
    // O3: rx=88, ry=64, rot=-8   (外圈, 慢)
    const orbitDefs = [
      { rx: 38, ry: 28, rot: -15, dur: 7,  pStart: 0,   planet: 'p1', pr: 4.0,  grad: 'fxdP1Grad', moon: true },
      { rx: 62, ry: 46, rot:  18, dur: 13, pStart: 120, planet: 'p2', pr: 3.2,  grad: 'fxdP2Grad', moon: false },
      { rx: 88, ry: 64, rot:  -8, dur: 22, pStart: 230, planet: 'p3', pr: 5.0,  grad: 'fxdP3Grad', moon: false }
    ];

    // 画轨道线 (单独一层, 不旋转)
    const orbitLayer = svgEl('g', null, svg);
    orbitDefs.forEach(function (o) {
      svgEl('ellipse', {
        cx: 100, cy: 100, rx: o.rx, ry: o.ry,
        transform: 'rotate(' + o.rot + ' 100 100)',
        class: 'fxd-orbit'
      }, orbitLayer);
    });

    // ---- 光晕 + 恒星 ----
    svgEl('circle', {
      cx: 100, cy: 100, r: 24,
      fill: 'url(#fxdHaloGrad)',
      class: 'fxd-star-halo'
    }, svg);

    svgEl('circle', {
      cx: 100, cy: 100, r: 8,
      fill: 'url(#fxdStarGrad)',
      class: 'fxd-star'
    }, svg);

    // 恒星上的小亮核
    svgEl('circle', {
      cx: 100, cy: 100, r: 2.2,
      fill: '#fffce0'
    }, svg);

    // ---- 行星 (每条轨道一个 group, 通过 rotate 公转, 内部小 group 平移到椭圆边缘) ----
    orbitDefs.forEach(function (o, idx) {
      // 公转 group: 围绕中心 100,100 旋转, 加上轨道倾斜
      const orbitG = svgEl('g', {
        class: 'fxd-orbit-group',
        transform: 'rotate(' + o.rot + ' 100 100)',
        style: 'animation-duration:' + o.dur + 's; transform-origin: 100px 100px;'
      }, svg);
      // 初始相位
      orbitG.style.animationDelay = (-(o.pStart / 360) * o.dur) + 's';
      // hover 加速时使用的目标速度由 CSS 变量控制
      orbitG.style.setProperty('--fxd-fast-dur', (o.dur / 4).toFixed(2) + 's');

      // 行星本体 (平移到轨道边缘, 椭圆 rx 方向)
      const planetWrap = svgEl('g', {
        transform: 'translate(' + (100 + o.rx) + ' 100)'
      }, orbitG);

      // 反向修正使行星自身不被轨道倾斜旋转 (可选)
      const counterRot = svgEl('g', {
        transform: 'rotate(' + (-o.rot) + ')',
        class: 'fxd-planet-spin'
      }, planetWrap);

      // 行星阴影 (下半月牙)
      svgEl('circle', {
        cx: 0, cy: 0, r: o.pr,
        fill: 'url(#' + o.grad + ')'
      }, counterRot);

      // 行星高光小点
      svgEl('circle', {
        cx: -o.pr * 0.35, cy: -o.pr * 0.35, r: o.pr * 0.25,
        fill: '#ffffff', opacity: '0.6'
      }, counterRot);

      // 卫星 (只在 p1 上)
      if (o.moon) {
        const moonG = svgEl('g', {
          class: 'fxd-moon-group'
        }, planetWrap);
        // 卫星轨道虚线 (小圈)
        svgEl('circle', {
          cx: 0, cy: 0, r: 7,
          fill: 'none',
          stroke: 'rgba(110,231,255,0.35)',
          'stroke-width': 0.4,
          'stroke-dasharray': '1 1.5'
        }, planetWrap);
        // 卫星本体
        svgEl('circle', {
          cx: 7, cy: 0, r: 1.3,
          fill: C.cyan,
          filter: 'drop-shadow(0 0 2px ' + C.cyan + ')'
        }, moonG);
      }
    });

    // ---- 背景小星点 (装饰) ----
    const starsBg = [
      [22, 30, 0.6],  [170, 25, 0.5], [180, 60, 0.7],
      [20, 160, 0.5], [30, 90, 0.4],  [165, 165, 0.6],
      [55, 178, 0.5], [148, 38, 0.4]
    ];
    starsBg.forEach(function (s) {
      svgEl('circle', {
        cx: s[0], cy: s[1], r: s[2],
        fill: '#ffffff', opacity: '0.55'
      }, svg);
    });

    state.nodes.orrery = wrap;
    return wrap;
  }

  // ============================================================
  // 2. 章节波纹分隔线
  // ============================================================
  //
  //  在每个 <main> 内的 <section> 之前插入一条 SVG 波浪。
  //  首个 (#home) 不插入, 避免顶部加 line。
  //
  function buildWaves() {
    const sections = document.querySelectorAll('main section');
    sections.forEach(function (sec, idx) {
      if (idx === 0) return; // skip hero
      const wave = makeWave(idx);
      sec.parentNode.insertBefore(wave, sec);
      state.nodes.waves.push(wave);
    });
  }

  function makeWave(idx) {
    const wrap = el('div', { class: 'fxd-wave', 'aria-hidden': 'true' });
    const svg = svgEl('svg', {
      viewBox: '0 0 1200 60',
      preserveAspectRatio: 'none',
      xmlns: SVG_NS
    }, wrap);

    // 渐变 stroke
    const gradId = 'fxdWaveGrad' + idx;
    const defs = svgEl('defs', null, svg);
    const grad = svgEl('linearGradient', { id: gradId, x1: '0%', y1: '0%', x2: '100%', y2: '0%' }, defs);
    svgEl('stop', { offset: '0%',   'stop-color': C.purple, 'stop-opacity': '0' }, grad);
    svgEl('stop', { offset: '15%',  'stop-color': C.purple, 'stop-opacity': '1' }, grad);
    svgEl('stop', { offset: '50%',  'stop-color': C.cyan,   'stop-opacity': '1' }, grad);
    svgEl('stop', { offset: '85%',  'stop-color': C.pink,   'stop-opacity': '0.85' }, grad);
    svgEl('stop', { offset: '100%', 'stop-color': C.pink,   'stop-opacity': '0' }, grad);

    // 主波 path (柔和 sine)
    const mainD = wavePath(1200, 60, 30, 8, 2.2, 0);
    svgEl('path', {
      class: 'fxd-wave-path a',
      d: mainD,
      stroke: 'url(#' + gradId + ')'
    }, svg);

    // 副波 (相位/振幅不同)
    const subD = wavePath(1200, 60, 32, 5, 3.4, 0.6);
    svgEl('path', {
      class: 'fxd-wave-path b',
      d: subD,
      stroke: C.cyan
    }, svg);

    // 第三道极淡 (短破折)
    const ghostD = wavePath(1200, 60, 28, 11, 1.6, 1.4);
    svgEl('path', {
      class: 'fxd-wave-path c',
      d: ghostD,
      stroke: C.purple
    }, svg);

    // 两端的光点
    svgEl('circle', {
      cx: 60, cy: 30, r: 2.4,
      class: 'fxd-wave-dot'
    }, svg);
    svgEl('circle', {
      cx: 1140, cy: 30, r: 2.4,
      class: 'fxd-wave-dot right'
    }, svg);

    // 装饰中心标号
    const txt = svgEl('text', {
      x: 600, y: 14,
      fill: 'rgba(177,140,255,0.55)',
      'font-family': 'Space Mono, monospace',
      'font-size': '8',
      'text-anchor': 'middle',
      'letter-spacing': '2'
    }, svg);
    var waveLabels = ['ABOUT', 'JOURNEY', 'SKILLS', 'WORKS', 'NOW', 'QUOTE', 'CONTACT'];
    txt.textContent = '§ ' + String(idx).padStart(2, '0') + ' · ' + waveLabels[Math.min(idx - 1, waveLabels.length - 1)];

    return wrap;
  }

  // 生成波形 path d 字符串 (yMid, amp, freq, phase)
  function wavePath(w, h, yMid, amp, freq, phase) {
    const steps = 80;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const y = yMid + Math.sin((i / steps) * Math.PI * 2 * freq + phase) * amp;
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    }
    return d.trim();
  }

  // 滚动入场观察器
  function watchWaves() {
    if (!('IntersectionObserver' in window)) {
      state.nodes.waves.forEach(function (w) { w.classList.add('is-in'); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    state.nodes.waves.forEach(function (w) { io.observe(w); });
  }

  // ============================================================
  // 3. 顶部声波频谱条
  // ============================================================
  function buildSpectrum() {
    const wrap = el('div', { class: 'fxd-spectrum', 'aria-hidden': 'true' }, document.body);
    const N = 10;
    state.spec.bars = [];
    state.spec.phases = [];
    for (let i = 0; i < N; i++) {
      const bar = el('span', { class: 'fxd-spec-bar' }, wrap);
      state.spec.bars.push(bar);
      state.spec.phases.push(Math.random() * Math.PI * 2);
    }
    state.nodes.spectrum = wrap;
    state.spec.t0 = performance.now();
    tickSpectrum();
  }

  function tickSpectrum() {
    const t = (performance.now() - state.spec.t0) * 0.001;
    const N = state.spec.bars.length;
    for (let i = 0; i < N; i++) {
      const ph = state.spec.phases[i];
      // 混合两个频率给丰富感
      const v = 0.5
              + 0.35 * Math.sin(t * (1.8 + i * 0.13) + ph)
              + 0.20 * Math.sin(t * (3.6 + i * 0.07) + ph * 1.7);
      const h = Math.max(0.12, Math.min(1, v));
      state.spec.bars[i].style.transform = 'scaleY(' + h.toFixed(3) + ')';
      // 同时让靠中心的条更亮一些
      const mid = (N - 1) / 2;
      const dist = Math.abs(i - mid) / mid;
      state.spec.bars[i].style.opacity = (0.55 + 0.45 * (1 - dist)).toFixed(2);
    }
    state.spec.raf = requestAnimationFrame(tickSpectrum);
  }

  // ============================================================
  // 4. 四角十字坐标
  // ============================================================
  function buildCorners() {
    const corners = ['tl', 'tr', 'bl', 'br'];
    corners.forEach(function (pos) {
      const wrap = el('div', { class: 'fxd-corner ' + pos, 'aria-hidden': 'true' }, document.body);
      const svg = svgEl('svg', {
        viewBox: '0 0 16 16',
        xmlns: SVG_NS
      }, wrap);
      // 十字
      svgEl('line', { x1: 8, y1: 1, x2: 8, y2: 15, class: 'fxd-cross-line' }, svg);
      svgEl('line', { x1: 1, y1: 8, x2: 15, y2: 8, class: 'fxd-cross-line' }, svg);
      // 旋转小环
      svgEl('circle', { cx: 8, cy: 8, r: 5, class: 'fxd-cross-ring' }, svg);
      svgEl('circle', { cx: 8, cy: 8, r: 1, fill: '#ffd56e' }, svg);

      // 坐标读出
      const coord = el('span', { class: 'fxd-coord' }, wrap);
      coord.textContent = '[0000, 0000]';

      state.nodes.corners.push({ wrap: wrap, coord: coord, pos: pos });
    });

    // 鼠标移动: 实时更新坐标 (相对各角)
    window.addEventListener('mousemove', onCornerMouse, { passive: true });
    window.addEventListener('touchmove', onCornerTouch, { passive: true });
    // 初始一次
    updateCornerCoords(window.innerWidth / 2, window.innerHeight / 2);
  }

  function onCornerMouse(e) {
    updateCornerCoords(e.clientX, e.clientY);
  }
  function onCornerTouch(e) {
    if (!e.touches || !e.touches[0]) return;
    updateCornerCoords(e.touches[0].clientX, e.touches[0].clientY);
  }

  function updateCornerCoords(x, y) {
    state.coords.x = x;
    state.coords.y = y;
    const w = window.innerWidth;
    const h = window.innerHeight;
    state.nodes.corners.forEach(function (cn) {
      let cx, cy;
      switch (cn.pos) {
        case 'tl': cx = x;     cy = y;     break;
        case 'tr': cx = w - x; cy = y;     break;
        case 'bl': cx = x;     cy = h - y; break;
        case 'br': cx = w - x; cy = h - y; break;
      }
      cn.coord.textContent = '[' + pad4(cx) + ', ' + pad4(cy) + ']';
    });
  }

  function pad4(n) {
    n = Math.round(Math.max(0, Math.min(9999, n)));
    return String(n).padStart(4, '0');
  }

  // ============================================================
  // 5. 中央指南针 (默认隐藏)
  // ============================================================
  function buildCompass() {
    const wrap = el('div', { class: 'fxd-compass', 'aria-hidden': 'true' }, document.body);
    const svg = svgEl('svg', {
      viewBox: '0 0 240 240',
      xmlns: SVG_NS
    }, wrap);

    // 外圈
    svgEl('circle', { cx: 120, cy: 120, r: 110, class: 'fxd-compass-ring' }, svg);
    // 内圈 (虚线旋转)
    svgEl('circle', { cx: 120, cy: 120, r: 88, class: 'fxd-compass-inner' }, svg);
    // 第二外圈
    svgEl('circle', { cx: 120, cy: 120, r: 102, class: 'fxd-compass-ring', 'stroke-opacity': '0.3' }, svg);

    // 刻度 — 每 6 度一根, 主刻度 (N/E/S/W) 加大
    const ticks = svgEl('g', null, svg);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const r1 = 110, r2 = i % 15 === 0 ? 96 : (i % 5 === 0 ? 100 : 104);
      const x1 = 120 + Math.cos(a) * r1;
      const y1 = 120 + Math.sin(a) * r1;
      const x2 = 120 + Math.cos(a) * r2;
      const y2 = 120 + Math.sin(a) * r2;
      svgEl('line', {
        x1: x1.toFixed(1), y1: y1.toFixed(1),
        x2: x2.toFixed(1), y2: y2.toFixed(1),
        class: 'fxd-compass-tick' + (i % 15 === 0 ? ' major' : '')
      }, ticks);
    }

    // N / E / S / W 字母
    const letters = [
      { ch: 'N', a: -Math.PI / 2 },
      { ch: 'E', a: 0 },
      { ch: 'S', a: Math.PI / 2 },
      { ch: 'W', a: Math.PI }
    ];
    letters.forEach(function (L) {
      const r = 78;
      const x = 120 + Math.cos(L.a) * r;
      const y = 120 + Math.sin(L.a) * r;
      const t = svgEl('text', {
        x: x.toFixed(1), y: y.toFixed(1),
        class: 'fxd-compass-letter'
      }, svg);
      t.textContent = L.ch;
    });

    // 指针 (双向)
    const needle = svgEl('g', { class: 'fxd-compass-needle' }, svg);
    // 红尖向北
    svgEl('polygon', {
      points: '120,40 116,120 124,120',
      fill: C.pink
    }, needle);
    // 灰尖向南
    svgEl('polygon', {
      points: '120,200 116,120 124,120',
      fill: 'rgba(177,140,255,0.6)'
    }, needle);
    // 中心钉
    svgEl('circle', { cx: 120, cy: 120, r: 4, class: 'fxd-compass-center' }, needle);

    // 顶部小标签
    const top = svgEl('text', {
      x: 120, y: 18, class: 'fxd-compass-label'
    }, svg);
    top.textContent = 'TRUE NORTH';
    const bot = svgEl('text', {
      x: 120, y: 230, class: 'fxd-compass-label'
    }, svg);
    bot.textContent = '— XINGHE //COMPASS —';

    state.nodes.compass = wrap;
  }

  function showCompass() {
    if (state.nodes.compass) state.nodes.compass.classList.add('is-visible');
  }
  function hideCompass() {
    if (state.nodes.compass) state.nodes.compass.classList.remove('is-visible');
  }
  function toggleCompass() {
    if (!state.nodes.compass) return;
    state.nodes.compass.classList.toggle('is-visible');
  }

  // ============================================================
  // 初始化 / 销毁
  // ============================================================
  function init() {
    if (state.ready) return;
    ensureStylesheet();

    buildOrrery();
    buildWaves();
    buildSpectrum();
    buildCorners();
    buildCompass();
    watchWaves();

    // 兼容: 若主站还没添加 is-loaded, 我们 fallback 自己加 (这样入场动画不会卡)
    setTimeout(function () {
      if (!document.body.classList.contains('is-loaded')) {
        document.body.classList.add('fxd-self-loaded');
        // 用 CSS 选择器兼容 fallback
        const css = document.createElement('style');
        css.textContent = '.fxd-self-loaded .fxd-orrery, .fxd-self-loaded .fxd-corner, .fxd-self-loaded .fxd-spectrum { opacity: 1; transform: none; }';
        css.textContent += '.fxd-self-loaded .fxd-orrery { transform: translateY(0) scale(1); }';
        css.textContent += '.fxd-self-loaded .fxd-spectrum { opacity: 0.78; }';
        document.head.appendChild(css);
      }
    }, 2400);

    // 页面隐藏暂停 spectrum
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        cancelAnimationFrame(state.spec.raf);
      } else if (state.ready) {
        state.spec.t0 = performance.now();
        tickSpectrum();
      }
    });

    // 键盘快捷键: Shift+C 切换罗盘
    document.addEventListener('keydown', function (e) {
      if (e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        toggleCompass();
      }
    });

    state.ready = true;
  }

  function destroy() {
    cancelAnimationFrame(state.spec.raf);
    window.removeEventListener('mousemove', onCornerMouse);
    window.removeEventListener('touchmove', onCornerTouch);
    Object.values(state.nodes).forEach(function (n) {
      if (!n) return;
      if (Array.isArray(n)) n.forEach(function (x) { (x.wrap || x).remove && (x.wrap || x).remove(); });
      else if (n.remove) n.remove();
    });
    state.ready = false;
    state.nodes = { orrery: null, spectrum: null, corners: [], waves: [], compass: null };
    state.spec = { bars: [], phases: [], raf: 0, t0: 0 };
  }

  // ============================================================
  // 公共 API
  // ============================================================
  global.FXDecor = {
    init: init,
    destroy: destroy,
    showCompass: showCompass,
    hideCompass: hideCompass,
    toggleCompass: toggleCompass
  };

  // 自动启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
