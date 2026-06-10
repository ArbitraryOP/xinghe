/* ============================================================
   星河 · Personal Universe — Interactions v2
   ============================================================ */

/* ----------  小工具  ---------- */
const $  = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, mn, mx) => Math.min(mx, Math.max(mn, v));
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);


/* ============================================================
   1. 开场加载序列
   ============================================================ */
const loader     = $('#loader');
const loaderFill = $('#loaderFill');
const loaderPct  = $('#loaderPct');

let pct = 0;
if (REDUCED) {
  // 减少动态效果：跳过开场加载序列，直接进入主页面
  if (loader) loader.classList.add('gone');
  document.body.classList.add('is-loaded');
  triggerHeroSequence();
} else {
  const loaderInterval = setInterval(() => {
    pct = Math.min(100, pct + Math.random() * 8 + 2);
    loaderFill.style.width = pct + '%';
    loaderPct.textContent = Math.floor(pct);
    if (pct >= 100) {
      clearInterval(loaderInterval);
      setTimeout(closeLoader, 450);
    }
  }, 100);
}

function closeLoader() {
  loader.classList.add('done');
  setTimeout(() => {
    loader.classList.add('gone');
    document.body.classList.add('is-loaded');
    triggerHeroSequence();
  }, 1100);
}


/* ============================================================
   2. 字符 / 词 切分
   ============================================================ */
function splitChars(node) {
  const text = node.textContent;
  node.textContent = '';
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch === ' ' ? ' ' : ch;
    node.appendChild(span);
  }
  // 逐字延时
  const chars = node.querySelectorAll('.char');
  chars.forEach((c, i) => c.style.transitionDelay = (0.04 * i) + 's');
}

function splitWords(node) {
  // 遍历 childNodes，保留 <em> 等子节点
  const out = [];
  const children = Array.from(node.childNodes);
  children.forEach((child, idx) => {
    if (child.nodeType === Node.TEXT_NODE) {
      let text = child.textContent;
      if (idx === 0) text = text.replace(/^\s+/, '');
      if (idx === children.length - 1) text = text.replace(/\s+$/, '');
      for (const ch of text) {
        const wrap  = document.createElement('span');
        const inner = document.createElement('span');
        wrap.className = 'word-wrap';
        inner.className = 'word-inner';
        inner.textContent = ch === ' ' ? ' ' : ch;
        wrap.appendChild(inner);
        out.push(wrap);
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const wrap = document.createElement('span');
      const elWrap = child.cloneNode(false);
      const inner = document.createElement('span');
      wrap.className = 'word-wrap';
      inner.className = 'word-inner';
      inner.innerHTML = child.innerHTML;
      elWrap.innerHTML = '';
      elWrap.appendChild(inner);
      wrap.appendChild(elWrap);
      out.push(wrap);
    }
  });
  node.innerHTML = '';
  out.forEach(o => node.appendChild(o));
  const inners = node.querySelectorAll('.word-inner');
  inners.forEach((c, i) => c.style.transitionDelay = (0.035 * i) + 's');
}

$$('[data-split]').forEach(splitChars);
$$('[data-split-words]').forEach(splitWords);


/* ============================================================
   3. Hero 序列触发
   ============================================================ */
function triggerHeroSequence() {
  // 标题字符入场
  $$('#home [data-split]').forEach(n => n.classList.add('in'));
  // 简单淡入
  $$('.hero .fade-up').forEach(n => n.classList.add('in'));
}


/* ============================================================
   4. 自定义光标（仅精确指针设备启用）
   ============================================================ */
// 鼠标位置全局跟踪（粒子 canvas 的鼠标连线也依赖 mx/my）
let mx = window.innerWidth / 2, my = window.innerHeight / 2;
window.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
});

if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !REDUCED) {
  const dot  = $('#cursorDot');
  const ring = $('#cursorRing');
  const glow = $('#mouseGlow');

  let rx = mx, ry = my;
  let gx = mx, gy = my;

  window.addEventListener('mousemove', e => {
    dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });

  (function cursorLoop() {
    rx = lerp(rx, mx, 0.18);
    ry = lerp(ry, my, 0.18);
    gx = lerp(gx, mx, 0.06);
    gy = lerp(gy, my, 0.06);

    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    glow.style.left = gx + 'px';
    glow.style.top  = gy + 'px';

    requestAnimationFrame(cursorLoop);
  })();

  $$('a, button, .tilt-card, .indi-list li').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });

  $$('input, textarea').forEach(el => {
    el.addEventListener('mouseenter', () => { ring.classList.add('text'); dot.classList.add('text'); });
    el.addEventListener('mouseleave', () => { ring.classList.remove('text'); dot.classList.remove('text'); });
  });
}


/* ============================================================
   5. 粒子 canvas
   ============================================================ */
const canvas = $('#particleCanvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;
function resizeCanvas() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor() { this.reset(true); }
  reset(initial = false) {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.2;
    this.vy = (Math.random() - 0.5) * 0.2;
    this.size  = Math.random() * 1.4 + 0.3;
    this.alpha = Math.random() * 0.7 + 0.2;
    this.tw = Math.random() * Math.PI * 2;
    if (!initial) {
      // 来自边缘
      const side = Math.floor(Math.random() * 4);
      if (side === 0) this.y = -2;
      if (side === 1) this.y = H + 2;
      if (side === 2) this.x = -2;
      if (side === 3) this.x = W + 2;
    }
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.tw += 0.025;
    if (this.x < -10 || this.x > W + 10 || this.y < -10 || this.y > H + 10) this.reset();
  }
  draw() {
    const a = this.alpha * (0.55 + 0.45 * Math.sin(this.tw));
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(244, 244, 255, ${a})`;
    ctx.fill();
  }
}

const particles = [];
const PCOUNT = Math.min(180, Math.floor(W * H / 11000));
for (let i = 0; i < PCOUNT; i++) particles.push(new Particle());

(function tick() {
  ctx.clearRect(0, 0, W, H);

  for (const p of particles) { p.update(); p.draw(); }

  // 邻近连线
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], b = particles[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 14000) {
        const al = (1 - d2 / 14000) * 0.18;
        ctx.strokeStyle = `rgba(177, 140, 255, ${al})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  // 鼠标连线
  for (const p of particles) {
    const dx = p.x - mx, dy = p.y - my;
    const d2 = dx * dx + dy * dy;
    if (d2 < 22000) {
      const al = (1 - d2 / 22000) * 0.55;
      ctx.strokeStyle = `rgba(110, 231, 255, ${al})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(mx, my);
      ctx.stroke();
    }
  }

  if (!REDUCED) requestAnimationFrame(tick);
})();


/* ============================================================
   6. 打字机
   ============================================================ */
const typing = $('#typingText');
const phrases = [
  'Hello, I am Xinghe.',
  'A maker of strange websites.',
  '一个把代码当成诗写的人。',
  'Welcome to my universe.'
];
let tpi = 0, tci = 0, tDeleting = false;

function typeLoop() {
  const full = phrases[tpi];
  if (!tDeleting) {
    typing.textContent = full.slice(0, ++tci);
    if (tci === full.length) {
      tDeleting = true;
      setTimeout(typeLoop, 1800);
      return;
    }
  } else {
    typing.textContent = full.slice(0, --tci);
    if (tci === 0) { tDeleting = false; tpi = (tpi + 1) % phrases.length; }
  }
  setTimeout(typeLoop, tDeleting ? 28 : 65);
}
if (REDUCED) {
  // 减少动态效果：直接显示一句，关闭打字机与光标闪烁
  if (typing) typing.textContent = phrases[0];
  const _caret = $('.caret');
  if (_caret) _caret.style.display = 'none';
} else {
  typeLoop();
}


/* ============================================================
   7. 时钟 + 时段感知
   ============================================================ */
const DAYPART_GREETINGS = {
  dawn:  '黎明巡航 · Dawn Patrol',
  day:   '在线 · 正在创造',
  dusk:  '暮色航行 · Dusk Sail',
  night: '夜航中 · Night Voyage'
};

function setDaypart() {
  const h = new Date().getHours();
  let part = 'night';                       // 20-4 时
  if (h >= 5 && h <= 7)        part = 'dawn';
  else if (h >= 8 && h <= 16)  part = 'day';
  else if (h >= 17 && h <= 19) part = 'dusk';
  document.documentElement.dataset.daypart = part;
  // 时段问候（第一个 span 是 dot-pulse 圆点）
  const heroTag = $('.hero-tag span:last-child');
  if (heroTag && heroTag.textContent !== DAYPART_GREETINGS[part]) {
    heroTag.textContent = DAYPART_GREETINGS[part];
  }
}

const timeEl = $('#navTime');
(function clock() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  timeEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  setDaypart();
  setTimeout(clock, 1000);
})();


/* ============================================================
   8. 滚动出现 + 数字计数 + 进度条
   ============================================================ */
const io = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');

    if (e.target.matches('[data-split]'))       e.target.classList.add('in');
    if (e.target.matches('[data-split-words]')) e.target.classList.add('in');

    if (e.target.dataset.target && e.target.classList.contains('stat-num')) {
      animateNumber(e.target, parseInt(e.target.dataset.target, 10));
    }
    if (e.target.classList.contains('skill-fill')) {
      e.target.style.width = e.target.dataset.width + '%';
    }
    if (e.target.classList.contains('skill-percent')) {
      animateNumber(e.target, parseInt(e.target.dataset.target, 10), '%');
    }
    io.unobserve(e.target);
  }
}, { threshold: 0.15 });

$$('[data-split-words], .stat-num[data-target], .skill-fill, .skill-percent, .fade-up').forEach(el => {
  if (!el.closest('.hero')) io.observe(el);
});

function animateNumber(el, target, suffix = '') {
  let cur = 0;
  const dur = 1400;
  const start = performance.now();
  function step(t) {
    const p = Math.min(1, (t - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    cur = Math.round(target * eased);
    el.textContent = cur + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


/* ============================================================
   9. 3D 倾斜
   ============================================================ */
$$('.tilt-card').forEach(card => {
  let raf = null;
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const rx = ((y / r.height) - 0.5) * -8;
    const ry = ((x / r.width)  - 0.5) *  8;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    });
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});


/* ============================================================
   10. 聚光跟随
   ============================================================ */
$$('.spotlight').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width)  * 100;
    const y = ((e.clientY - r.top)  / r.height) * 100;
    card.style.setProperty('--mx', x + '%');
    card.style.setProperty('--my', y + '%');
  });
});


/* ============================================================
   11. 磁吸按钮
   ============================================================ */
$$('[data-magnetic]').forEach(el => {
  const strength = 0.35;
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width  / 2;
    const y = e.clientY - r.top  - r.height / 2;
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
  });
});


/* ============================================================
   12. 文字打乱效果（hover 时字符滚动后还原）
   ============================================================ */
const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#________ABCDEF0123456789';

class TextScramble {
  constructor(el) {
    this.el = el;
    this.original = el.textContent;
    this.frame = 0;
    this.queue = [];
    this.frameRequest = null;
  }
  setText(newText) {
    const old = this.el.textContent;
    const length = Math.max(old.length, newText.length);
    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = old[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 20);
      const end = start + Math.floor(Math.random() * 20);
      this.queue.push({ from, to, start, end });
    }
    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
  }
  update() {
    let output = '';
    let complete = 0;
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      if (this.frame >= end) {
        complete++;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          this.queue[i].char = char;
        }
        output += `<span class="scramble-dim">${char}</span>`;
      } else {
        output += from;
      }
    }
    this.el.innerHTML = output;
    if (complete < this.queue.length) {
      this.frameRequest = requestAnimationFrame(() => this.update());
      this.frame++;
    }
  }
}

$$('[data-scramble]').forEach(el => {
  const inst = new TextScramble(el);
  const original = el.textContent;
  el.addEventListener('mouseenter', () => inst.setText(original));
});

// 注入 scramble-dim 样式
const style = document.createElement('style');
style.textContent = `.scramble-dim { color: var(--accent); opacity: 0.85; }`;
document.head.appendChild(style);


/* ============================================================
   13. 章节指示器 + 导航联动 + 导航滑动胶囊
   ============================================================ */
const sections = $$('section[id]');
const navLinks = $$('.nav-link');
const indiItems = $$('.indi-list li');
const indiProgress = $('#indiProgress');

// 导航滑动指示器（胶囊），注入为 .nav-links 第一个子元素
const navLinksUl = $('.nav-links');
const navPill = document.createElement('span');
navPill.className = 'nav-pill';
navPill.setAttribute('aria-hidden', 'true');
if (navLinksUl) navLinksUl.insertBefore(navPill, navLinksUl.firstChild);

function positionPill(activeLink) {
  // ≤720px 导航隐藏（offsetParent 为 null）时跳过
  if (!navLinksUl || !activeLink || activeLink.offsetParent === null) return;
  navPill.style.transform = `translateX(${activeLink.offsetLeft}px)`;
  navPill.style.width = activeLink.offsetWidth + 'px';
  navLinksUl.classList.add('has-pill');
}

// 缓存各章节 offsetTop，避免滚动时反复触发布局计算
let sectionTops = [];
function measureSections() {
  sectionTops = sections.map(s => ({ id: s.id, top: s.offsetTop }));
}

let lastActiveId = '';
function syncScroll() {
  const sy = window.scrollY;
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const progress = clamp(sy / docH, 0, 1);
  indiProgress.style.height = (progress * 100) + '%';

  const trigger = sy + window.innerHeight * 0.4;
  let activeId = 'home';
  sectionTops.forEach(s => { if (s.top <= trigger) activeId = s.id; });

  // 仅激活项变化时才更新 classList
  if (activeId !== lastActiveId) {
    lastActiveId = activeId;
    let activeLink = null;
    navLinks.forEach(l => {
      const on = l.getAttribute('href') === '#' + activeId;
      l.classList.toggle('active', on);
      if (on) activeLink = l;
    });
    indiItems.forEach(l => l.classList.toggle('active', l.dataset.target === '#' + activeId));
    positionPill(activeLink);
  }
}

let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    syncScroll();
    scrollTicking = false;
  });
}, { passive: true });

function remeasureAndSync() {
  measureSections();
  syncScroll();
  positionPill($('.nav-link.active'));
  // 跨过 720px 断点时面板与按钮都会隐藏，必须解除滚动锁，否则页面冻结
  if (window.innerWidth > 720 && document.body.classList.contains('nav-open')) closeNavPanel();
}
window.addEventListener('resize', remeasureAndSync);
window.addEventListener('load', remeasureAndSync);
remeasureAndSync();

// 减少动态偏好下不做平滑滚动动画（与 CSS 端 scroll-behavior:auto 一致）
const SCROLL_BEHAVIOR = REDUCED ? 'auto' : 'smooth';

indiItems.forEach(li => {
  li.addEventListener('click', () => {
    const t = $(li.dataset.target);
    if (t) window.scrollTo({ top: t.offsetTop - 80, behavior: SCROLL_BEHAVIOR });
  });
});


/* ============================================================
   14. 平滑锚点滚动
   ============================================================ */
$$('a[href^="#"]').forEach(a => {
  // skip-link 必须走浏览器默认片段导航：preventDefault 会取消把焦点
  // 移入 tabindex="-1" 主内容的唯一机制，使跳转链接对键盘用户失效
  if (a.classList.contains('skip-link')) return;
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length > 1) {
      const t = $(id);
      if (t) {
        e.preventDefault();
        window.scrollTo({ top: t.offsetTop - 80, behavior: SCROLL_BEHAVIOR });
      }
    }
  });
});


/* ============================================================
   15. 视差
   ============================================================ */
const bgText = $('.hero-bg-text');
if (!REDUCED) {
  window.addEventListener('mousemove', e => {
    if (!bgText) return;
    const x = (e.clientX / window.innerWidth  - 0.5) * 30;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    bgText.style.translate = `${x}px ${y}px`;
  });
  // 滚动视差已移交 fx-scroll.js（transform 由其独家负责，避免冲突）
}


/* ============================================================
   16. 表单提交（跳转 GitHub Issue 留言，不伪造发送）
   ============================================================ */
const form = $('#contactForm');
if (form) form.addEventListener('submit', e => {
  e.preventDefault();
  const name  = $('#fName')  ? $('#fName').value  : '';
  const email = $('#fEmail') ? $('#fEmail').value : '';
  let msg     = $('#fMsg')   ? $('#fMsg').value   : '';
  const sign  = '\n\n— ' + name + ' (' + email + ')';
  // GitHub 对 URL 长度约 8KB 上限，超长 body 会得到 414/500 错误页；
  // 按百分号编码后的字节数截断（中文每字约 9 字节）
  let truncated = false;
  while (msg && encodeURIComponent(msg + sign).length > 6000) {
    msg = msg.slice(0, -50);
    truncated = true;
  }
  if (truncated) msg += '\n…（留言过长已截断）';
  window.open(
    'https://github.com/ArbitraryOP/xinghe/issues/new?title=' +
    encodeURIComponent('来信 · ' + name) +
    '&body=' + encodeURIComponent(msg + sign),
    '_blank', 'noopener'
  );
  const formStatus = $('#formStatus');
  if (formStatus) formStatus.textContent = truncated
    ? '留言较长已截断 · 已在新标签页打开 GitHub 留言窗口 ✦'
    : '已在新标签页打开 GitHub 留言窗口 ✦';
});


/* ============================================================
   17. 极光跟随鼠标轻微视差（深度感）
   只写根节点变量 --fx-mx / --fx-my，位移由 styles.css 在
   .aurora-blob 的 translate 属性上统一合成（单一所有权）
   ============================================================ */
if (!REDUCED) {
  let fxMx = 0, fxMy = 0, fxRafPending = false;
  window.addEventListener('mousemove', e => {
    fxMx = e.clientX / window.innerWidth  - 0.5;
    fxMy = e.clientY / window.innerHeight - 0.5;
    if (fxRafPending) return;
    fxRafPending = true;
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--fx-mx', fxMx.toFixed(4));
      document.documentElement.style.setProperty('--fx-my', fxMy.toFixed(4));
      fxRafPending = false;
    });
  });
}


/* ============================================================
   18. 移动端汉堡导航（≤720px）
   ============================================================ */
const navToggle = $('#navToggle');
const navPanel  = $('#navPanel');

function closeNavPanel() {
  document.body.classList.remove('nav-open');
  if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
}

if (navToggle) navToggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  navToggle.setAttribute('aria-expanded', String(open));
});

// 点击面板链接或面板空白处关闭（链接的平滑滚动由 §14 统一处理）
if (navPanel) navPanel.addEventListener('click', e => {
  if (e.target === navPanel || e.target.closest('.nav-panel-link')) closeNavPanel();
});

window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.body.classList.contains('nav-open')) closeNavPanel();
});


/* ============================================================
   19. 页脚版权年份
   ============================================================ */
const footYear = $('#footYear');
if (footYear) footYear.textContent = new Date().getFullYear();
