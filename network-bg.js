/**
 * network-bg.js
 * Spread-out node network using Three.js.
 * Nodes fill the whole screen; no sphere / ball shape.
 * Performance: DPR capped at 1, pre-allocated dynamic buffers, ~60 nodes.
 */
(function () {
  'use strict';

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function start() {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js')
      .then(buildScene)
      .catch(function (e) { console.warn('[network-bg] failed to load Three.js', e); });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start)
    : start();

  /* ─────────────────────────────────────────────────────────────── */
  function buildScene() {
    var THREE = window.THREE;

    /* Canvas */
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100%', height: '100%',
      zIndex: '-1', pointerEvents: 'none', display: 'block',
    });
    document.body.prepend(canvas);

    /* Renderer — DPR capped at 1 for performance */
    var W = window.innerWidth, H = window.innerHeight;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(1);           /* intentionally 1 — big perf win */
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0); /* transparent — CSS bg shows through */

    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, W / H, 1, 3000);
    camera.position.set(0, 0, 420);

    /* Glow sprite */
    function makeSprite() {
      var sz = 64, c = document.createElement('canvas');
      c.width = c.height = sz;
      var x = c.getContext('2d');
      var g = x.createRadialGradient(sz/2, sz/2, 0, sz/2, sz/2, sz/2);
      g.addColorStop(0,    'rgba(255,255,255,1)');
      g.addColorStop(0.2,  'rgba(255,255,255,0.8)');
      g.addColorStop(0.5,  'rgba(255,255,255,0.25)');
      g.addColorStop(1,    'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, sz, sz);
      return new THREE.CanvasTexture(c);
    }
    var sprite = makeSprite();

    /* Colours */
    var CYAN = new THREE.Color(0x00e5ff);
    var BLUE = new THREE.Color(0x0066ff);
    var MAGA = new THREE.Color(0xff00bb);

    /* ── Nodes spread across the whole screen ─────────────────────
       At camera z=420 and FOV=60 the visible plane at z=0 spans
       ~840 × 490 world-units. Spread nodes a bit wider so the
       network fills the screen edge-to-edge.                       */
    var N    = 60;
    var SX   = 900;  /* spread half-width  */
    var SY   = 520;  /* spread half-height */
    var SZ   = 80;   /* shallow depth      */
    var CONNECT = 170; /* connection distance */

    var nodes = [];
    for (var i = 0; i < N; i++) {
      var hub   = i < 8;
      var col   = (i < 3)                    ? MAGA
                : hub                         ? CYAN
                : (Math.random() < 0.25)      ? CYAN : BLUE;
      nodes.push({
        x:     (Math.random() - 0.5) * SX,
        y:     (Math.random() - 0.5) * SY,
        z:     (Math.random() - 0.5) * SZ,
        vx:    (Math.random() - 0.5) * 0.22 * (hub ? 0.5 : 1),
        vy:    (Math.random() - 0.5) * 0.22 * (hub ? 0.5 : 1),
        r:     hub ? 9 + Math.random() * 7 : 3 + Math.random() * 4,
        col:   col,
        hub:   hub,
        phase: Math.random() * Math.PI * 2,
      });
    }

    /* ── Pre-allocated dynamic buffers ────────────────────────────*/
    var MAX_SEGS = N * (N - 1) / 2;  /* worst-case line count */

    var linePosArr = new Float32Array(MAX_SEGS * 6);
    var lineColArr = new Float32Array(MAX_SEGS * 6);
    var lineGeo    = new THREE.BufferGeometry();
    var linePosAttr = new THREE.BufferAttribute(linePosArr, 3);
    var lineColAttr = new THREE.BufferAttribute(lineColArr, 3);
    linePosAttr.setUsage(THREE.DynamicDrawUsage);
    lineColAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute('position', linePosAttr);
    lineGeo.setAttribute('color',    lineColAttr);
    lineGeo.setDrawRange(0, 0);

    var lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent:  true,
      opacity:      0.35,
      blending:     THREE.AdditiveBlending,
      depthWrite:   false,
    });
    var linesMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(linesMesh);

    /* Point nodes */
    var ptPosArr = new Float32Array(N * 3);
    var ptColArr = new Float32Array(N * 3);
    var ptSizArr = new Float32Array(N);
    for (var i = 0; i < N; i++) {
      ptPosArr[i*3]   = nodes[i].x;
      ptPosArr[i*3+1] = nodes[i].y;
      ptPosArr[i*3+2] = nodes[i].z;
      ptColArr[i*3]   = nodes[i].col.r;
      ptColArr[i*3+1] = nodes[i].col.g;
      ptColArr[i*3+2] = nodes[i].col.b;
      ptSizArr[i]     = nodes[i].r;
    }
    var ptGeo     = new THREE.BufferGeometry();
    var ptPosAttr = new THREE.BufferAttribute(ptPosArr, 3);
    var ptColAttr = new THREE.BufferAttribute(ptColArr, 3);
    ptPosAttr.setUsage(THREE.DynamicDrawUsage);
    ptGeo.setAttribute('position', ptPosAttr);
    ptGeo.setAttribute('color',    ptColAttr);
    ptGeo.setAttribute('size',     new THREE.BufferAttribute(ptSizArr, 1));

    var ptMat = new THREE.PointsMaterial({
      vertexColors:    true,
      size:            8,
      map:             sprite,
      blending:        THREE.AdditiveBlending,
      depthWrite:      false,
      transparent:     true,
      sizeAttenuation: true,
      opacity:         0.85,
    });
    var ptsMesh = new THREE.Points(ptGeo, ptMat);
    scene.add(ptsMesh);

    /* ── Mouse parallax ────────────────────────────────────────── */
    var mx = 0, my = 0, tmx = 0, tmy = 0;
    window.addEventListener('mousemove', function (e) {
      tmx = (e.clientX / window.innerWidth  - 0.5) * 2;
      tmy = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    /* ── Resize ─────────────────────────────────────────────────── */
    window.addEventListener('resize', function () {
      W = window.innerWidth; H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    });

    /* ── Animation loop ─────────────────────────────────────────── */
    function animate(t) {
      requestAnimationFrame(animate);

      /* Smooth mouse */
      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;

      /* Move nodes + update point buffer */
      for (var i = 0; i < N; i++) {
        var n = nodes[i];
        n.x += n.vx;  n.y += n.vy;
        /* soft wrap */
        if (n.x >  SX) n.x = -SX;  if (n.x < -SX) n.x = SX;
        if (n.y >  SY) n.y = -SY;  if (n.y < -SY) n.y = SY;
        ptPosArr[i*3]   = n.x;
        ptPosArr[i*3+1] = n.y;
        ptPosArr[i*3+2] = n.z;
      }
      ptPosAttr.needsUpdate = true;

      /* Rebuild line segments */
      var seg = 0;
      for (var i = 0; i < N; i++) {
        for (var j = i + 1; j < N; j++) {
          var dx = nodes[j].x - nodes[i].x;
          var dy = nodes[j].y - nodes[i].y;
          var d  = Math.sqrt(dx*dx + dy*dy);
          if (d < CONNECT) {
            var b  = seg * 6;
            var t2 = 1 - d / CONNECT;   /* 1 = close, 0 = far */
            linePosArr[b]   = nodes[i].x; linePosArr[b+1] = nodes[i].y; linePosArr[b+2] = nodes[i].z;
            linePosArr[b+3] = nodes[j].x; linePosArr[b+4] = nodes[j].y; linePosArr[b+5] = nodes[j].z;
            /* colour: lerp from node-i colour toward node-j colour */
            var ci = nodes[i].col, cj = nodes[j].col;
            lineColArr[b]   = ci.r; lineColArr[b+1] = ci.g; lineColArr[b+2] = ci.b;
            lineColArr[b+3] = cj.r; lineColArr[b+4] = cj.g; lineColArr[b+5] = cj.b;
            seg++;
          }
        }
      }
      lineGeo.setDrawRange(0, seg * 2);
      linePosAttr.needsUpdate = true;
      lineColAttr.needsUpdate = true;

      /* Camera parallax — gentle drift with mouse */
      camera.position.x += (mx * 30 - camera.position.x) * 0.05;
      camera.position.y += (-my * 20 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
  }
})();
