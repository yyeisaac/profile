/**
 * network-bg.js — Cyberpunk network background
 *
 * Features:
 *  • Subtle grid overlay
 *  • Floating nodes (hub + regular) with intense neon glows
 *  • Proximity edges with per-connection gradient colouring
 *  • Filled triangle detection (geometric pattern fill)
 *  • Data packets that shoot along active edges
 *  • Expanding pulse rings from hub nodes
 *  • Slow horizontal scan beam
 *  • HUD corner brackets + status labels
 *  • Vignette for depth
 *  • Mouse-repulsion on nearby nodes
 */
(function () {
  'use strict';

  /* ── Canvas ─────────────────────────────────────────────────────── */
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed', top: '0', left: '0',
    width: '100%', height: '100%',
    zIndex: '-1', pointerEvents: 'none', display: 'block',
  });
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  /* ── Colour palette ─────────────────────────────────────────────── */
  const CYAN = [0, 229, 255];
  const BLUE = [0, 110, 255];
  const MAGA = [255, 0, 187];

  /* ── Config ─────────────────────────────────────────────────────── */
  const CFG = {
    nodeCount:    80,
    hubCount:     10,
    maxDist:      160,
    speed:        0.28,
    mouseR:       140,
    mouseF:       0.022,
    maxPackets:   14,
    gridSize:     55,
    gridAlpha:    0.05,
    scanSpeed:    0.000072, // fraction of height per ms
    ringInterval: 1900,     // ms between ring spawns
    ringMaxR:     90,
  };

  let W = 0, H = 0;
  let nodes = [], packets = [], rings = [];
  let scanY  = 0;
  let lastRingTime = 0;
  const mouse = { x: -9999, y: -9999 };

  /* ── Resize ─────────────────────────────────────────────────────── */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ── Node factory ───────────────────────────────────────────────── */
  function mkNode(i) {
    const hub   = i < CFG.hubCount;
    const color = hub
      ? (Math.random() < 0.25 ? MAGA : CYAN)
      : (Math.random() < 0.08 ? CYAN : BLUE);
    return {
      x:     Math.random() * W,
      y:     Math.random() * H,
      vx:    (Math.random() - 0.5) * CFG.speed * (hub ? 0.45 : 1),
      vy:    (Math.random() - 0.5) * CFG.speed * (hub ? 0.45 : 1),
      r:     hub ? 3.5 + Math.random() * 2.5 : 1 + Math.random() * 1.8,
      alpha: hub ? 0.92 : 0.4 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      color, hub,
    };
  }

  function init() {
    nodes       = Array.from({ length: CFG.nodeCount }, (_, i) => mkNode(i));
    packets     = [];
    rings       = [];
    scanY       = H * 0.15;
    lastRingTime = 0;
  }

  /* ── Edges + adjacency (built each frame) ───────────────────────── */
  function buildEdges() {
    const edges = [];
    const adj   = Array.from({ length: nodes.length }, () => new Set());
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(nodes[j].x - nodes[i].x, nodes[j].y - nodes[i].y);
        if (d < CFG.maxDist) {
          edges.push([i, j, d]);
          adj[i].add(j);
          adj[j].add(i);
        }
      }
    }
    return { edges, adj };
  }

  /* ── Grid ───────────────────────────────────────────────────────── */
  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = `rgba(0,200,255,${CFG.gridAlpha})`;
    ctx.lineWidth   = 0.4;
    ctx.beginPath();
    for (let x = 0; x <= W; x += CFG.gridSize) { ctx.moveTo(x, 0);  ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += CFG.gridSize) { ctx.moveTo(0, y);  ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.restore();
  }

  /* ── Scan beam ──────────────────────────────────────────────────── */
  function drawScan() {
    const g = ctx.createLinearGradient(0, scanY - 110, 0, scanY + 50);
    g.addColorStop(0,    'rgba(0,229,255,0)');
    g.addColorStop(0.65, 'rgba(0,229,255,0.03)');
    g.addColorStop(0.92, 'rgba(0,229,255,0.08)');
    g.addColorStop(1,    'rgba(0,229,255,0.02)');
    ctx.fillStyle = g;
    ctx.fillRect(0, scanY - 110, W, 160);
    /* hard leading line */
    ctx.fillStyle = 'rgba(0,229,255,0.18)';
    ctx.fillRect(0, scanY, W, 1);
  }

  /* ── Vignette ───────────────────────────────────────────────────── */
  function drawVignette() {
    const g = ctx.createRadialGradient(
      W / 2, H / 2, H * 0.15,
      W / 2, H / 2, Math.hypot(W, H) * 0.62
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,18,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* ── HUD corners ────────────────────────────────────────────────── */
  function drawHUD() {
    const S = 32, M = 14;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,229,255,0.65)';
    ctx.lineWidth   = 1.5;
    /* brackets */
    ctx.beginPath();
    ctx.moveTo(M, M + S);   ctx.lineTo(M, M);       ctx.lineTo(M + S, M);       /* TL */
    ctx.moveTo(W-M-S, M);   ctx.lineTo(W-M, M);     ctx.lineTo(W-M, M + S);     /* TR */
    ctx.moveTo(M, H-M-S);   ctx.lineTo(M, H-M);     ctx.lineTo(M + S, H-M);     /* BL */
    ctx.moveTo(W-M-S, H-M); ctx.lineTo(W-M, H-M);   ctx.lineTo(W-M, H-M-S);     /* BR */
    ctx.stroke();
    /* labels */
    ctx.fillStyle = 'rgba(0,229,255,0.45)';
    ctx.font      = '10px "Share Tech Mono", "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SYS::NETWORK ACTIVE', M + S + 8, M + 9);
    ctx.textAlign = 'right';
    ctx.fillText(`NODES:${CFG.nodeCount}  EDGES:--`, W - M - S - 8, M + 9);
    ctx.fillText('SIGNAL:OK', W - M - S - 8, H - M - 4);
    ctx.textAlign = 'left';
    ctx.fillText('v2.4.1', M + S + 8, H - M - 4);
    ctx.restore();
  }

  /* ── Pulse rings ────────────────────────────────────────────────── */
  function spawnRing(node) {
    rings.push({
      x: node.x, y: node.y,
      r: node.r + 2, maxR: CFG.ringMaxR,
      alpha: 0.8, color: node.color,
    });
  }

  function tickRings(dt) {
    for (const r of rings) { r.r += 0.048 * dt; r.alpha -= 0.00048 * dt; }
    rings = rings.filter(r => r.alpha > 0 && r.r < r.maxR);
  }

  function drawRings() {
    for (const r of rings) {
      const [rc, gc, bc] = r.color;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rc},${gc},${bc},${r.alpha.toFixed(3)})`;
      ctx.lineWidth   = 1.2;
      ctx.stroke();
    }
  }

  /* ── Data packets ───────────────────────────────────────────────── */
  function spawnPacket(i, j) {
    if (packets.length >= CFG.maxPackets) return;
    packets.push({
      i, j, t: 0,
      speed: 0.005 + Math.random() * 0.007,
      color: Math.random() < 0.22 ? MAGA : CYAN,
    });
  }

  function tickPackets() {
    for (const p of packets) p.t += p.speed;
    packets = packets.filter(p => p.t < 1);
  }

  function drawPackets() {
    for (const p of packets) {
      const a = nodes[p.i], b = nodes[p.j];
      const x = a.x + (b.x - a.x) * p.t;
      const y = a.y + (b.y - a.y) * p.t;
      const [rc, gc, bc] = p.color;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
      g.addColorStop(0,   `rgba(${rc},${gc},${bc},1)`);
      g.addColorStop(0.35,`rgba(${rc},${gc},${bc},0.55)`);
      g.addColorStop(1,   `rgba(${rc},${gc},${bc},0)`);
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  /* ── Main animation loop ────────────────────────────────────────── */
  let lastT  = 0;
  let edgeCount = 0; // track for HUD label

  function frame(t) {
    const dt = Math.min(t - lastT, 50);
    lastT = t;

    ctx.clearRect(0, 0, W, H);

    /* grid */
    drawGrid();

    /* scan */
    scanY += CFG.scanSpeed * dt * H;
    if (scanY > H + 130) scanY = -130;
    drawScan();

    /* update nodes */
    for (const n of nodes) {
      const mx = n.x - mouse.x, my = n.y - mouse.y;
      const md = Math.hypot(mx, my);
      if (md > 0 && md < CFG.mouseR) {
        const f = (1 - md / CFG.mouseR) * CFG.mouseF;
        n.vx += (mx / md) * f;
        n.vy += (my / md) * f;
      }
      const spd = Math.hypot(n.vx, n.vy);
      const cap = CFG.speed * (n.hub ? 0.6 : 1.45);
      if (spd > cap) { n.vx = (n.vx / spd) * cap; n.vy = (n.vy / spd) * cap; }
      n.x += n.vx; n.y += n.vy;
      if (n.x < -25) n.x = W + 25; else if (n.x > W + 25) n.x = -25;
      if (n.y < -25) n.y = H + 25; else if (n.y > H + 25) n.y = -25;
    }

    /* build topology */
    const { edges, adj } = buildEdges();
    edgeCount = edges.length;

    /* periodic ring burst from random hub */
    if (t - lastRingTime > CFG.ringInterval) {
      const hubs = nodes.filter(n => n.hub);
      if (hubs.length) spawnRing(hubs[Math.floor(Math.random() * hubs.length)]);
      lastRingTime = t;
    }

    /* filled triangles (geometric pattern) */
    for (const [i, j] of edges) {
      for (const k of adj[i]) {
        if (k > j && adj[j].has(k)) {
          const ni = nodes[i], nj = nodes[j], nk = nodes[k];
          ctx.beginPath();
          ctx.moveTo(ni.x, ni.y); ctx.lineTo(nj.x, nj.y); ctx.lineTo(nk.x, nk.y);
          ctx.closePath();
          ctx.fillStyle = 'rgba(0,180,255,0.024)';
          ctx.fill();
        }
      }
    }

    /* edges */
    for (const [i, j, dist] of edges) {
      const a = nodes[i], b = nodes[j];
      const alpha = (1 - dist / CFG.maxDist) * 0.65;
      const [ar, ag, ab_] = a.color, [br, bg, bb_] = b.color;
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, `rgba(${ar},${ag},${ab_},${alpha.toFixed(3)})`);
      g.addColorStop(1, `rgba(${br},${bg},${bb_},${alpha.toFixed(3)})`);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = g; ctx.lineWidth = 0.85; ctx.stroke();

      /* randomly spawn data packet */
      if (Math.random() < 0.0012) spawnPacket(i, j);
    }

    /* rings */
    tickRings(dt); drawRings();

    /* packets */
    tickPackets(); drawPackets();

    /* nodes */
    for (const n of nodes) {
      const pulse = 1 + Math.sin(t * 0.001 + n.phase) * (n.hub ? 0.4 : 0.15);
      const r = n.r * pulse;
      const [rc, gc, bc] = n.color;

      if (n.hub) {
        /* large soft halo */
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 10);
        g.addColorStop(0,    `rgba(${rc},${gc},${bc},${n.alpha})`);
        g.addColorStop(0.22, `rgba(${rc},${gc},${bc},${(n.alpha * 0.28).toFixed(3)})`);
        g.addColorStop(0.55, `rgba(${rc},${gc},${bc},0.05)`);
        g.addColorStop(1,    `rgba(${rc},${gc},${bc},0)`);
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 10, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        /* orbit ring */
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rc},${gc},${bc},${(n.alpha * 0.32).toFixed(3)})`;
        ctx.lineWidth = 0.9; ctx.stroke();
      } else {
        /* small node glow */
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4.5);
        g.addColorStop(0, `rgba(${rc},${gc},${bc},${(n.alpha * 0.6).toFixed(3)})`);
        g.addColorStop(1, `rgba(${rc},${gc},${bc},0)`);
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 4.5, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      }

      /* core dot */
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rc},${gc},${bc},${n.alpha})`;
      ctx.fill();
    }

    /* vignette on top */
    drawVignette();

    /* HUD on very top */
    drawHUD();

    requestAnimationFrame(frame);
  }

  /* ── Boot ───────────────────────────────────────────────────────── */
  resize();
  init();
  requestAnimationFrame(t => { lastT = t; requestAnimationFrame(frame); });

  window.addEventListener('resize',     () => { resize(); init(); });
  window.addEventListener('mousemove',  e  => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
})();
