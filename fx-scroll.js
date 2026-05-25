/* ============================================================
 *  fx-scroll.js  ·  滚动驱动的电影感动画模块
 *  - 单一 RAF 循环 + scroll 事件 throttle
 *  - 不依赖任何外部库
 *  - 所有 DOM 查询均带 null 检查
 *  主题色: 紫 #b18cff · 青 #6ee7ff · 粉 #ff7eb6
 * ============================================================ */
(function () {
  'use strict';

  // ----------------- 工具函数 -----------------
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp  = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) {     // smoothstep
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----------------- 状态 -----------------
  var state = {
    scrollY: 0,
    vh: window.innerHeight || 800,
    vw: window.innerWidth  || 1280,
    docH: 1,
    ticking: false,
    lastSectionIdx: -1
  };

  // ----------------- 元素采集 -----------------
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var hero          = $('#home');
  var heroContent   = hero ? $('.hero-content', hero) : null;
  var heroBgText    = hero ? $('.hero-bg-text', hero) : null;
  var auroraBlobs   = $$('.aurora-blob');
  var sectionNums   = $$('.section-num');
  var sectionHeads  = $$('section .section-header');
  var workCards     = $$('.work-card');
  var sections      = ['#home', '#about', '#skills', '#works', '#contact']
                        .map(function (id) { return document.querySelector(id); })
                        .filter(Boolean);

  // 视差速度配置 (aurora blobs 各 blob 不同速度)
  var blobSpeeds = [0.18, -0.12, 0.26, -0.20];

  // ----------------- 1) 注入 进度环 + 章节闪光 -----------------
  var ring, ringBar, ringPctText;
  var flash;

  function injectUI() {
    // 进度环
    if (!document.querySelector('.fx-scroll-ring')) {
      ring = document.createElement('div');
      ring.className = 'fx-scroll-ring';
      ring.setAttribute('aria-label', '滚动进度 · 点击回顶');
      ring.innerHTML =
        '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
          '<defs>' +
            '<linearGradient id="fxRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%"  stop-color="#6ee7ff"/>' +
              '<stop offset="50%" stop-color="#b18cff"/>' +
              '<stop offset="100%" stop-color="#ff7eb6"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<circle class="fx-ring-track" cx="32" cy="32" r="28"/>' +
          '<circle class="fx-ring-bar"   cx="32" cy="32" r="28"/>' +
        '</svg>' +
        '<div class="fx-ring-center"><b>0</b><i>%</i></div>';
      document.body.appendChild(ring);

      ringBar     = ring.querySelector('.fx-ring-bar');
      ringPctText = ring.querySelector('.fx-ring-center b');

      ring.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else {
      ring        = document.querySelector('.fx-scroll-ring');
      ringBar     = ring && ring.querySelector('.fx-ring-bar');
      ringPctText = ring && ring.querySelector('.fx-ring-center b');
    }

    // 章节闪光
    if (!document.querySelector('.fx-section-flash')) {
      flash = document.createElement('div');
      flash.className = 'fx-section-flash';
      document.body.appendChild(flash);
    } else {
      flash = document.querySelector('.fx-section-flash');
    }
  }

  // ----------------- 2) work-card 初始姿态 + IO 触发 -----------------
  function setupWorkCards() {
    if (!workCards.length || prefersReduced) return;
    workCards.forEach(function (card, i) {
      card.classList.add('fx-card-init');
      card.style.transitionDelay = (i * 0.1) + 's';
    });

    if (!('IntersectionObserver' in window)) {
      // 退化：直接展示
      workCards.forEach(function (c) {
        c.classList.remove('fx-card-init');
        c.classList.add('fx-card-in');
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.remove('fx-card-init');
          e.target.classList.add('fx-card-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    workCards.forEach(function (c) { io.observe(c); });
  }

  // ----------------- 3) 度量 -----------------
  function measure() {
    state.vh = window.innerHeight || 800;
    state.vw = window.innerWidth  || 1280;
    state.docH = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    ) - state.vh;
    if (state.docH < 1) state.docH = 1;
  }

  // ----------------- 4) 章节切换闪光 -----------------
  function currentSectionIndex() {
    var midY = state.scrollY + state.vh * 0.45;
    var idx = 0;
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      var top = s.offsetTop;
      if (midY >= top) idx = i;
    }
    return idx;
  }

  function triggerFlash() {
    if (!flash || prefersReduced) return;
    flash.classList.remove('is-on');
    // 触发重排以重启动画
    void flash.offsetWidth;
    flash.classList.add('is-on');
    // 200ms 主体 + 余韵
    setTimeout(function () {
      if (flash) flash.classList.remove('is-on');
    }, 560);
  }

  // ----------------- 5) 主更新循环 -----------------
  function update() {
    state.ticking = false;

    var y    = state.scrollY;
    var vh   = state.vh;
    var prog = clamp(y / state.docH, 0, 1);    // 全页面进度 0~1

    // ---- (1) Hero 缩放渐隐 ----
    if (heroContent) {
      var heroProg = clamp(y / vh, 0, 1);
      var s = 1 + heroProg * 0.10;             // 1 -> 1.1
      var o = 1 - heroProg * 1.0;              // 1 -> 0
      var ty = heroProg * -40;                 // 略向上推
      heroContent.style.transform = 'translate3d(0,' + ty.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
      heroContent.style.opacity   = o.toFixed(3);
    }

    // 背景文字 UNIVERSE 反向移动（视差），且略放大
    if (heroBgText) {
      var bgShift = y * 0.35;                  // 比滚动慢，且反向 -> 用正值随滚动下移，相对滚动是更慢=视觉上反向
      var bgScale = 1 + clamp(y / vh, 0, 1) * 0.04;
      heroBgText.style.transform =
        'translate3d(0,' + bgShift.toFixed(2) + 'px,0) scale(' + bgScale.toFixed(4) + ')';
      heroBgText.style.opacity = (1 - clamp(y / (vh * 1.4), 0, 0.8)).toFixed(3);
    }

    // ---- (2) 多层视差: aurora blobs ----
    for (var i = 0; i < auroraBlobs.length; i++) {
      var spd = blobSpeeds[i] || ((i + 1) * 0.08);
      var ty2 = -y * spd;
      auroraBlobs[i].style.transform = 'translate3d(0,' + ty2.toFixed(2) + 'px,0)';
    }

    // ---- (3) section-num 反向轻微移动 ----
    for (var n = 0; n < sectionNums.length; n++) {
      var el = sectionNums[n];
      var sec = el.closest && el.closest('section');
      if (!sec) continue;
      var r = sec.getBoundingClientRect();
      // 当 section 中点穿越视口时，根据其位置得到 -1 ~ +1
      var rel = ((r.top + r.height / 2) - vh / 2) / vh;
      rel = clamp(rel, -1, 1);
      el.style.setProperty('--fx-num-shift', (rel * 18).toFixed(2));  // -18 ~ +18
    }

    // ---- (4) section-header 钉住 + 收缩 ----
    for (var h = 0; h < sectionHeads.length; h++) {
      var head = sectionHeads[h];
      var sect = head.parentElement;
      if (!sect) continue;
      var sr = sect.getBoundingClientRect();
      // section 顶部从 0 滑到 -sect.height: 进度 0->1
      var headProg = 0;
      if (sr.top <= 0 && sr.bottom > vh * 0.3) {
        // 处于"钉住"区间
        headProg = clamp(-sr.top / Math.max(sr.height - vh * 0.4, 1), 0, 1);
        if (!head.classList.contains('is-pinned')) head.classList.add('is-pinned');
      } else {
        if (head.classList.contains('is-pinned')) head.classList.remove('is-pinned');
      }
      head.style.setProperty('--fx-pin-progress', headProg.toFixed(3));
    }

    // ---- (5) 滚动进度环 ----
    if (ringBar) {
      var C = 2 * Math.PI * 28;                // 176.something
      ringBar.style.strokeDashoffset = (C * (1 - prog)).toFixed(2);
    }
    if (ringPctText) {
      ringPctText.textContent = Math.round(prog * 100);
    }
    if (ring) {
      if (y > 80) ring.classList.add('is-visible');
      else        ring.classList.remove('is-visible');
    }

    // ---- (6) 章节切换闪光 ----
    var idx = currentSectionIndex();
    if (idx !== state.lastSectionIdx) {
      if (state.lastSectionIdx !== -1) triggerFlash();
      state.lastSectionIdx = idx;
    }
  }

  // ----------------- RAF 循环 + scroll throttle -----------------
  function requestTick() {
    if (!state.ticking) {
      state.ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  function onScroll() {
    state.scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    requestTick();
  }

  function onResize() {
    measure();
    requestTick();
  }

  // ----------------- 启动 -----------------
  function init() {
    injectUI();
    measure();
    setupWorkCards();
    state.scrollY = window.pageYOffset || 0;
    state.lastSectionIdx = currentSectionIndex();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('load', function () {
      measure();
      requestTick();
    });

    // 首帧
    requestTick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露调试句柄 (可选)
  window.__fxScroll = { update: update, state: state };
})();
