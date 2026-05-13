/**
 * network-bg.js
 * Animated constellation / node-network background.
 * Self-inserts a fixed <canvas> behind all page content.
 */
(function () {
  'use strict';

  /* ── Canvas setup ─────────────────────────────────────────────── */
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position:      'fixed',
    top:           '0',
    left:          '0',
    width:         '100%',
    height:        '100%',
    zIndex:        '-1',
    pointerEvents: 'none',
    display:       'block',
  });
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  /* ── Config ───────────────────────────────────────────────────── */
  const CFG = {
    count:       90,   // total nodes
    glowCount:   8,    // large bokeh-style nodes
    maxDist:     155,  // max distance for a line connection
    speed:       0.22, // base drift speed
    mouseRadius: 130,  // pixels of mouse influence
    mouseForce:  0.018,// how strongly nodes flee the cursor
  };

  let W = 0, H = 0;
  let nodes = [];
  const mouse = { x: -9999, y: -9999 };

  /* ── Viewport resize ──────────────────────────────────────────── */
  function resize() {
    const dpr  = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── Node factory ─────────────────────────────────────────────── */
  function mkNode(i) {
    const glow = i < CFG.glowCount;
    return {
      x:     Math.random() * W,
      y:     Math.random() * H,
      vx:    (Math.random() - 0.5) * CFG.speed * (glow ? 0.55 : 1),
      vy:    (Math.random() - 0.5) * CFG.speed * (glow ? 0.55 : 1),
      r:     glow ? 2.5 + Math.random() * 3   : 0.8 + Math.random() * 1.8,
      alpha: glow ? 0.65 + Math.random() * 0.35 : 0.3 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      glow,
    };
  }

  function init() {
    nodes = Array.from({ length: CFG.count }, (_, i) => mkNode(i));
  }

  /* ── Per-frame render ─────────────────────────────────────────── */
  function frame(t) {
    ctx.clearRect(0, 0, W, H);

    /* — Update positions — */
    for (const n of nodes) {
      /* Mouse repulsion */
      const mx  = n.x - mouse.x;
      const my  = n.y - mouse.y;
      const md  = Math.hypot(mx, my);
      if (md > 0 && md < CFG.mouseRadius) {
        const f = (1 - md / CFG.mouseRadius) * CFG.mouseForce;
        n.vx += (mx / md) * f;
        n.vy += (my / md) * f;
      }

      /* Speed cap */
      const spd = Math.hypot(n.vx, n.vy);
      const cap = CFG.speed * (n.glow ? 0.8 : 1.5);
      if (spd > cap) { n.vx = (n.vx / spd) * cap; n.vy = (n.vy / spd) * cap; }

      n.x += n.vx;
      n.y += n.vy;

      /* Wrap edges (soft teleport) */
      if (n.x < -25) n.x = W + 25;
      if (n.x > W + 25) n.x = -25;
      if (n.y < -25) n.y = H + 25;
      if (n.y > H + 25) n.y = -25;
    }

    /* — Draw connections — */
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx   = b.x - a.x;
        const dy   = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < CFG.maxDist) {
          const alpha = (1 - dist / CFG.maxDist) * 0.32;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(120,185,255,${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.55;
          ctx.stroke();
        }
      }
    }

    /* — Draw nodes — */
    for (const n of nodes) {
      const pulse = 1 + Math.sin(t * 0.0009 + n.phase) * (n.glow ? 0.38 : 0.14);
      const r     = n.r * pulse;

      if (n.glow) {
        /* Soft bokeh halo */
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 9);
        grad.addColorStop(0,    `rgba(165,220,255,${(n.alpha * 0.95).toFixed(3)})`);
        grad.addColorStop(0.22, `rgba(100,175,255,${(n.alpha * 0.4).toFixed(3)})`);
        grad.addColorStop(0.6,  `rgba(60,130,255,${(n.alpha * 0.1).toFixed(3)})`);
        grad.addColorStop(1,     'rgba(40,100,220,0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 9, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      /* Core dot */
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(195,228,255,${n.alpha.toFixed(3)})`;
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }

  /* ── Boot ─────────────────────────────────────────────────────── */
  resize();
  init();
  requestAnimationFrame(frame);

  window.addEventListener('resize',    resize);
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
})();
