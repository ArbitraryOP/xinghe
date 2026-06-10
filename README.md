# 星河 · Personal Universe

**Live → <https://arbitraryop.github.io/xinghe/>**

一座漂在浏览器里的小宇宙：暗色宇宙美学、玻璃拟态与电影感滚动的纯静态个人主页。

A small universe floating in your browser — a pure-static personal homepage with dark cosmic aesthetics, glassmorphism, and cinematic scrolling.

## 特性 · Features

- **WebGL 星云背景** — 实时噪声星云，随时间缓缓流动 / Real-time WebGL nebula background
- **粒子星座** — Canvas 粒子随鼠标连结成星座 / Interactive particle constellations on canvas
- **自定义光标** — 仅在精确指针设备上启用 / Custom cursor (precise-pointer devices only)
- **滚动电影感** — 视差、揭示动效与滚动驱动的章节叙事 / Cinematic scroll with parallax & reveal animations
- **时段感知配色** — 黎明、白昼、黄昏、深夜各有气氛 / Daypart-aware theming (dawn / day / dusk / night)
- **无障碍支持** — 尊重 `prefers-reduced-motion`，提供跳转链接与屏幕阅读器文案 / Respects `prefers-reduced-motion`, skip link & screen-reader text
- **纯 vanilla 零依赖** — 无框架、无构建步骤 / Pure vanilla JS & CSS, zero dependencies, no build step

## 本地预览 · Local Preview

纯静态站点，无需安装任何依赖 / Pure static site, nothing to install:

```bash
# 任意静态服务器，例如 / Any static server, e.g.
python -m http.server 8000
# 或 / or
npx serve .
```

然后打开 `http://localhost:8000`，或直接用浏览器打开 `index.html`。
Then open `http://localhost:8000`, or simply open `index.html` in a browser.

## 文件结构 · Structure

| 文件 / File | 说明 / Description |
| --- | --- |
| `index.html` | 页面结构 / Page markup |
| `styles.css` | 主样式（CSS 变量驱动）/ Main styles (CSS-variable driven) |
| `script.js` | 核心交互：导航、打字机、表单等 / Core interactions |
| `fx-nebula.js` | WebGL 星云背景 / WebGL nebula background |
| `fx-cursor.js` | 自定义光标 / Custom cursor |
| `fx-scroll.js` + `fx-scroll.css` | 滚动动效 / Scroll effects |
| `fx-decor.js` + `fx-decor.css` | 装饰元素 / Decorative elements |
| `fx-extra.js` + `fx-extra.css` | 流星等附加效果 / Meteors & extra effects |
| `favicon.svg` | 站点图标 / Site icon |
| `favicon.ico` | 图标位图回退（Safari 等）/ Bitmap icon fallback |
| `404.html` | 自包含 404 页 / Self-contained 404 page |

---

© 2026 XINGHE · Made with curiosity
