/*!
 * fx-nebula.js — WebGL Fluid Nebula Background
 * 自动启动；如需手动控制：window.FXNebula.init() / .stop()
 * 在 <script src="script.js"></script> 之前 (或之后) 引入即可。
 */
(function (global) {
  'use strict';

  const VERT = [
    'attribute vec2 a_pos;',
    'void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }'
  ].join('\n');

  // Fragment: fbm 噪声 + 流动 warp + 三色主题渐变 + 鼠标偏移
  const FRAG = [
    'precision highp float;',
    'uniform vec2  u_res;',
    'uniform float u_time;',
    'uniform vec2  u_mouse;',
    // 主题色
    'const vec3 C1 = vec3(0.694, 0.549, 1.000);', // #b18cff 紫
    'const vec3 C2 = vec3(0.431, 0.906, 1.000);', // #6ee7ff 青
    'const vec3 C3 = vec3(1.000, 0.494, 0.714);', // #ff7eb6 粉
    'const vec3 BG = vec3(0.031, 0.031, 0.059);', // #08080f 深底

    // hash & 2d value noise
    'float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  float a = hash(i);',
    '  float b = hash(i+vec2(1.0,0.0));',
    '  float c = hash(i+vec2(0.0,1.0));',
    '  float d = hash(i+vec2(1.0,1.0));',
    '  vec2 u = f*f*(3.0-2.0*f);',
    '  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;',
    '}',

    // fbm — 限制 5 octaves (≤6 要求)
    'float fbm(vec2 p){',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);',
    '  for(int i=0;i<5;i++){',
    '    v += a*noise(p);',
    '    p = rot*p*2.02;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',

    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy - 0.5*u_res) / min(u_res.x, u_res.y);',
    '  float t = u_time * 0.06;',

    // 鼠标轻微影响中心
    '  vec2 m = (u_mouse - 0.5*u_res) / min(u_res.x, u_res.y);',
    '  uv -= m * 0.15;',

    // 流动 warp: 用 fbm 域扭曲坐标 (domain warping)
    '  vec2 q = vec2( fbm(uv + vec2(0.0, t)), fbm(uv + vec2(5.2, -t)) );',
    '  vec2 r = vec2( fbm(uv + 2.5*q + vec2(1.7+t, 9.2)), fbm(uv + 2.5*q + vec2(8.3, 2.8-t)) );',
    '  float n = fbm(uv + 3.0*r);',

    // 三色随时间在 n 值上流动
    '  float k1 = smoothstep(0.15, 0.65, n + 0.10*sin(t*1.3));',
    '  float k2 = smoothstep(0.30, 0.85, length(r) + 0.15*cos(t*1.7));',
    '  vec3 col = mix(C1, C2, k1);',
    '  col = mix(col, C3, k2*0.7);',

    // 体积感: 用 n 强度叠加亮度
    '  float glow = pow(n, 1.6) * 1.4;',
    '  col *= glow;',

    // 鼠标处的暖核心
    '  float md = exp(-3.0 * dot(uv*1.2, uv*1.2));',
    '  col += mix(C3, C1, 0.5+0.5*sin(t*2.0)) * md * 0.35;',

    // 与深底混合 + 边缘渐隐
    '  float vig = smoothstep(1.3, 0.2, length(uv));',
    '  col = mix(BG, col, clamp(glow*1.1, 0.0, 1.0)) * vig;',

    // 颗粒感(很轻微) 避免色带
    '  col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.015;',

    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  let state = {
    canvas: null,
    gl: null,
    program: null,
    running: false,
    raf: 0,
    start: 0,
    mouse: [0, 0],
    locs: {},
    dpr: 1
  };

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('[FXNebula] shader error:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function createCanvas() {
    const c = document.createElement('canvas');
    c.id = 'fxNebulaCanvas';
    Object.assign(c.style, {
      position: 'fixed',
      inset: '0',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '0',
      pointerEvents: 'none',
      mixBlendMode: 'screen',
      opacity: '0.55'
    });
    document.body.appendChild(c);
    return c;
  }

  function resize() {
    if (!state.canvas || !state.gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // 限制 DPR 保性能
    state.dpr = dpr;
    const w = Math.floor(window.innerWidth * dpr);
    const h = Math.floor(window.innerHeight * dpr);
    if (state.canvas.width !== w || state.canvas.height !== h) {
      state.canvas.width = w;
      state.canvas.height = h;
    }
    state.gl.viewport(0, 0, w, h);
  }

  function onMouseMove(e) {
    state.mouse[0] = e.clientX * state.dpr;
    state.mouse[1] = (window.innerHeight - e.clientY) * state.dpr; // 翻转 Y
  }

  function onTouchMove(e) {
    if (!e.touches || !e.touches[0]) return;
    state.mouse[0] = e.touches[0].clientX * state.dpr;
    state.mouse[1] = (window.innerHeight - e.touches[0].clientY) * state.dpr;
  }

  function frame(now) {
    if (!state.running) return;
    const gl = state.gl;
    const t = (now - state.start) * 0.001;

    gl.useProgram(state.program);
    gl.uniform1f(state.locs.u_time, t);
    gl.uniform2f(state.locs.u_res, state.canvas.width, state.canvas.height);
    gl.uniform2f(state.locs.u_mouse, state.mouse[0], state.mouse[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    state.raf = requestAnimationFrame(frame);
  }

  function init() {
    if (state.running) return true;

    const canvas = createCanvas();
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, alpha: true })
            || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('[FXNebula] WebGL 不可用，已退出');
      canvas.remove();
      return false;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.remove(); return false; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'a_pos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[FXNebula] program link error:', gl.getProgramInfoLog(prog));
      canvas.remove();
      return false;
    }

    // 全屏覆盖三角形 (两个三角形组成的矩形)
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    state.canvas = canvas;
    state.gl = gl;
    state.program = prog;
    state.locs = {
      u_time:  gl.getUniformLocation(prog, 'u_time'),
      u_res:   gl.getUniformLocation(prog, 'u_res'),
      u_mouse: gl.getUniformLocation(prog, 'u_mouse')
    };
    state.start = performance.now();
    state.mouse = [window.innerWidth * 0.5, window.innerHeight * 0.5];
    state.running = true;

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // 页面隐藏时暂停, 节能
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        cancelAnimationFrame(state.raf);
      } else if (state.running) {
        state.raf = requestAnimationFrame(frame);
      }
    });

    state.raf = requestAnimationFrame(function (t) { state.start = t; frame(t); });
    return true;
  }

  function stop() {
    state.running = false;
    cancelAnimationFrame(state.raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onTouchMove);
    if (state.canvas) state.canvas.remove();
    state = { canvas: null, gl: null, program: null, running: false, raf: 0, start: 0, mouse: [0, 0], locs: {}, dpr: 1 };
  }

  global.FXNebula = { init: init, stop: stop };

  // 自动启动 — DOM 就绪后挂载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
