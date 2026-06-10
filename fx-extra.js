/* ============================================================
 * fx-extra.js · 星河 v3 — 新增内容的交互与动画
 *   1) [data-reveal] 滚动揭示（带 --i 错峰）
 *   2) 时间线进度填充
 *   3) 流星生成器
 *   4) Now 区：实时时钟 / 滚动状态 / 单曲计时
 *   5) FAQ 手风琴
 * 自包含 IIFE，无外部依赖，全部带 null 检查。
 * ============================================================ */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------
     1) 滚动揭示
     ---------------------------------------------------------- */
  function setupReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;
    if (!('IntersectionObserver' in window) || reduced) {
      items.forEach(function (el) { el.classList.add('is-revealed'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------
     2) 时间线进度填充
     ---------------------------------------------------------- */
  function setupTimeline() {
    var tl   = $('#timeline');
    var fill = $('#tlFill');
    if (!tl || !fill) return;

    var ticking = false;
    function update() {
      ticking = false;
      var r = tl.getBoundingClientRect();
      var vh = window.innerHeight || 800;
      // 当时间线顶部到达视口 62% 处开始，底部到达 45% 处结束
      var start = vh * 0.62;
      var end   = vh * 0.45;
      var total = r.height - (start - end);
      var prog  = total > 0 ? (start - r.top) / total : 0;
      fill.style.height = (clamp(prog, 0, 1) * 100).toFixed(2) + '%';
    }
    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ----------------------------------------------------------
     3) 流星生成器
     ---------------------------------------------------------- */
  function setupMeteors() {
    var field = $('#meteorField');
    if (!field || reduced) return;

    function spawn() {
      if (document.hidden) { schedule(); return; }
      var m = document.createElement('span');
      m.className = 'meteor';
      // 从屏幕上方偏右区域出发，向左下坠落
      var startX = 40 + Math.random() * 60;          // 40% ~ 100% 宽度
      var startY = -5 + Math.random() * 35;           // 顶部附近
      var travel = 320 + Math.random() * 360;         // 行程
      var ang    = 30 + Math.random() * 20;           // 倾角
      m.style.left = startX + 'vw';
      m.style.top  = startY + 'vh';
      m.style.setProperty('--mx', (-travel) + 'px');
      m.style.setProperty('--my', (travel * 0.7) + 'px');
      m.style.setProperty('--ang', ang + 'deg');
      m.style.setProperty('--dur', (1.1 + Math.random() * 1.1).toFixed(2) + 's');
      field.appendChild(m);
      // 触发动画
      void m.offsetWidth;
      m.classList.add('run');
      m.addEventListener('animationend', function () { m.remove(); });
      schedule();
    }
    function schedule() {
      var delay = 2600 + Math.random() * 4200;
      // [DAYPART] 时段系数：夜晚流星更密（×0.5）、白天更稀（×1.6），每次调度时读取
      var part = document.documentElement.dataset.daypart;
      if (part === 'night')    delay *= 0.5;
      else if (part === 'day') delay *= 1.6;
      setTimeout(spawn, delay);
    }
    // 起步先来一颗，再排队
    setTimeout(spawn, 1800);
  }

  /* ----------------------------------------------------------
     4) Now 区交互
     ---------------------------------------------------------- */
  function setupNow() {
    // 4.1 实时时钟
    var clock = $('#nowClock');
    if (clock) {
      (function tick() {
        var d = new Date();
        var p = function (n) { return String(n).padStart(2, '0'); };
        clock.textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
        setTimeout(tick, 1000);
      })();
    }

    // 4.2 滚动状态文案
    var status = $('#nowStatus');
    if (status) {
      var lines = [
        '正在把一段噪声函数调成星云的样子…',
        '正在给一个按钮加上恰到好处的回弹…',
        '正在删掉昨晚写的、自以为聪明的代码…',
        '正在为一处 1px 的错位纠结很久…',
        '正在让这页背景的星河流动得更慢一点…',
        '正在泡今天的第三杯茶 ☕'
      ];
      var li = 0;
      status.style.transition = 'opacity .5s ease';
      setInterval(function () {
        if (document.hidden) return;
        status.style.opacity = '0';
        setTimeout(function () {
          li = (li + 1) % lines.length;
          status.textContent = lines[li];
          status.style.opacity = '1';
        }, 500);
      }, 4200);
    }

    // 4.3 单曲循环计时
    var track = $('#nowTrack');
    if (track) {
      var sec = 134;             // 从 02:14 起
      var total = 372;           // 06:12 一首
      setInterval(function () {
        if (document.hidden) return;
        sec = (sec + 1) % total;
        var mm = String(Math.floor(sec / 60)).padStart(2, '0');
        var ss = String(sec % 60).padStart(2, '0');
        track.textContent = mm + ':' + ss + ' · 循环单曲';
      }, 1000);
    }
  }

  /* ----------------------------------------------------------
     5) FAQ 手风琴
     ---------------------------------------------------------- */
  function setupFaq() {
    var items = $$('.faq-item');
    if (!items.length) return;

    // 同步所有问题按钮的 aria-expanded（open class 挂在 .faq-item 上）
    function syncAria() {
      items.forEach(function (it) {
        var btn = $('.faq-q', it);
        if (btn) btn.setAttribute('aria-expanded', it.classList.contains('open') ? 'true' : 'false');
      });
    }

    items.forEach(function (item, idx) {
      var q = $('.faq-q', item);
      if (!q) return;
      // 无障碍：给答案区唯一 id，按钮用 aria-controls 指向它
      var a = $('.faq-a', item);
      if (a) {
        a.id = 'faq-a-' + (idx + 1);
        q.setAttribute('aria-controls', a.id);
      }
      q.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');
        items.forEach(function (it) { it.classList.remove('open'); });
        if (!isOpen) item.classList.add('open');
        syncAria();
      });
    });
    // 默认展开第一条
    items[0].classList.add('open');
    syncAria();
  }

  /* ----------------------------------------------------------
     启动
     ---------------------------------------------------------- */
  function init() {
    setupReveal();
    setupTimeline();
    setupMeteors();
    setupNow();
    setupFaq();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
