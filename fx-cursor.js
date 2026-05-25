/* =========================================================
 * fx-cursor.js  —  Enhanced cursor visual module
 *   - Comet-tail particle trail (canvas, screen blend)
 *   - Click ripple expansion
 *   - Velocity → "liquid" elongated ring class hint
 * Self-contained IIFE, no dependencies.
 * ========================================================= */
(function () {
  'use strict';

  // Respect reduced motion / touch-only devices
  const prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchOnly = window.matchMedia &&
    window.matchMedia('(hover: none)').matches;
  if (prefersReduced || isTouchOnly) return;

  // ---------- Theme palette ----------
  const COLORS = [
    { r: 177, g: 140, b: 255 }, // #b18cff purple
    { r: 110, g: 231, b: 255 }, // #6ee7ff cyan
    { r: 255, g: 126, b: 182 }  // #ff7eb6 pink
  ];

  // ---------- Canvas ----------
  const canvas = document.createElement('canvas');
  canvas.id = 'fxCursorCanvas';
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '9998',
    mixBlendMode: 'screen'
  });
  // Insert as early as possible
  const mount = () => {
    if (!canvas.isConnected) document.body.appendChild(canvas);
  };
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });

  const ctx = canvas.getContext('2d');
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // ---------- State ----------
  const MAX_PARTICLES = 200;
  const particles = [];
  const ripples = [];

  let mouseX = W / 2, mouseY = H / 2;
  let lastX = mouseX, lastY = mouseY;
  let lastT = performance.now();
  let velocity = 0;       // px / ms
  let smoothVel = 0;      // low-pass filtered velocity
  let inside = false;

  // Velocity threshold to flag "liquid" state on the ring.
  const FAST_THRESHOLD = 1.6; // px per ms
  let ringFastFlag = false;
  const ringEl = document.getElementById('cursorRing');

  // ---------- Helpers ----------
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pickColor()  { return COLORS[(Math.random() * COLORS.length) | 0]; }

  function spawnParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      const c = pickColor();
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(0.05, 0.6);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.3,
        vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.3,
        life: 0,
        ttl: rand(550, 1100),
        size: rand(2.2, 5.5),
        r: c.r, g: c.g, b: c.b
      });
    }
  }

  function spawnRipple(x, y) {
    const c = pickColor();
    ripples.push({
      x, y,
      life: 0,
      ttl: 600,
      maxR: rand(70, 110),
      r: c.r, g: c.g, b: c.b
    });
  }

  // ---------- Events ----------
  window.addEventListener('mousemove', (e) => {
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dist = Math.hypot(dx, dy);
    velocity = dist / dt;
    smoothVel = smoothVel * 0.75 + velocity * 0.25;

    mouseX = e.clientX;
    mouseY = e.clientY;
    inside = true;

    // Spawn 1-3 particles per move, scaled lightly by speed
    const count = 1 + ((velocity * 0.8) | 0);
    spawnParticles(mouseX, mouseY, Math.min(3, Math.max(1, count)));

    // Toggle fast/liquid class on existing ring
    if (ringEl) {
      const want = smoothVel > FAST_THRESHOLD;
      if (want !== ringFastFlag) {
        ringFastFlag = want;
        ringEl.classList.toggle('fast', want);
      }
    }

    lastX = mouseX; lastY = mouseY; lastT = now;
  }, { passive: true });

  window.addEventListener('mouseleave', () => { inside = false; });
  window.addEventListener('mouseenter', () => { inside = true; });

  window.addEventListener('mousedown', (e) => {
    spawnRipple(e.clientX, e.clientY);
    spawnParticles(e.clientX, e.clientY, 8); // burst on click
  }, { passive: true });

  // ---------- Loop ----------
  let prev = performance.now();
  function tick(now) {
    const dt = Math.min(40, now - prev);
    prev = now;

    // Fading trail instead of full clear → ghost tail
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    // Update + draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.ttl) { particles.splice(i, 1); continue; }
      // physics
      p.vy += 0.0009 * dt;        // gentle gravity
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const t = p.life / p.ttl;
      const alpha = (1 - t) * 0.9;
      const radius = p.size * (1 - t * 0.7);

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3);
      grad.addColorStop(0,   `rgba(${p.r},${p.g},${p.b},${alpha})`);
      grad.addColorStop(0.4, `rgba(${p.r},${p.g},${p.b},${alpha * 0.35})`);
      grad.addColorStop(1,   `rgba(${p.r},${p.g},${p.b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update + draw ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.life += dt;
      if (rp.life >= rp.ttl) { ripples.splice(i, 1); continue; }
      const t = rp.life / rp.ttl;
      const eased = 1 - Math.pow(1 - t, 3);
      const radius = eased * rp.maxR;
      const alpha = (1 - t) * 0.7;
      ctx.strokeStyle = `rgba(${rp.r},${rp.g},${rp.b},${alpha})`;
      ctx.lineWidth = 2 * (1 - t) + 0.4;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      // inner soft glow
      ctx.strokeStyle = `rgba(${rp.r},${rp.g},${rp.b},${alpha * 0.35})`;
      ctx.lineWidth = 6 * (1 - t);
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, radius * 0.92, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Decay velocity flag when idle
    if (performance.now() - lastT > 80) {
      smoothVel *= 0.85;
      if (ringFastFlag && smoothVel < FAST_THRESHOLD * 0.5 && ringEl) {
        ringFastFlag = false;
        ringEl.classList.remove('fast');
      }
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
