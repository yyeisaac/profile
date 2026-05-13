/**
 * network-bg.js
 * 3-D neural-network sphere built with Three.js.
 * Loaded from CDN; falls back gracefully if unavailable.
 */
(function () {
  'use strict';

  /* ── Dynamic CDN loader ─────────────────────────────────────────── */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function start() {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js')
      .then(buildScene)
      .catch(function (e) { console.warn('[network-bg] Three.js failed to load', e); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  /* ── Build the Three.js scene ───────────────────────────────────── */
  function buildScene() {
    var THREE = window.THREE;

    /* canvas */
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100%', height: '100%',
      zIndex: '-1', pointerEvents: 'none', display: 'block',
    });
    document.body.prepend(canvas);

    /* renderer — transparent so the CSS background colour shows through */
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    var scene  = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.set(0, 0, 420);

    /* ── Glow sprite (radial gradient on a small canvas) ───────────── */
    function makeGlowSprite() {
      var sz  = 128;
      var c   = document.createElement('canvas');
      c.width = c.height = sz;
      var x   = c.getContext('2d');
      var g   = x.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
      g.addColorStop(0,    'rgba(255,255,255,1)');
      g.addColorStop(0.15, 'rgba(255,255,255,0.85)');
      g.addColorStop(0.4,  'rgba(255,255,255,0.35)');
      g.addColorStop(1,    'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, sz, sz);
      return new THREE.CanvasTexture(c);
    }
    var glowSprite = makeGlowSprite();

    /* ── Colour palette ────────────────────────────────────────────── */
    var CYAN = new THREE.Color(0x00e5ff);
    var BLUE = new THREE.Color(0x0077ff);
    var MAGA = new THREE.Color(0xff00bb);
    var WHT  = new THREE.Color(0xffffff);

    /* ── Generate node positions in a 3-D sphere volume ───────────── */
    var N      = 140;
    var RADIUS = 190;
    var pts    = [];  // THREE.Vector3 array

    for (var i = 0; i < N; i++) {
      var u     = Math.random();
      var v     = Math.random();
      var theta = 2 * Math.PI * u;
      var phi   = Math.acos(2 * v - 1);
      var r     = RADIUS * Math.cbrt(Math.random());   // uniform volume
      pts.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ));
    }

    /* ── Pre-compute edges (all pairs within threshold) ────────────── */
    var CONNECT = 70;  // world-units
    var lineVerts  = [];
    var lineColors = [];

    for (var i = 0; i < N; i++) {
      for (var j = i + 1; j < N; j++) {
        var d = pts[i].distanceTo(pts[j]);
        if (d < CONNECT) {
          var t = 1 - d / CONNECT;           // 0=far, 1=close
          lineVerts.push(pts[i].x, pts[i].y, pts[i].z);
          lineVerts.push(pts[j].x, pts[j].y, pts[j].z);
          /* colour: cyan → blue, brighter when close */
          var ca = new THREE.Color().lerpColors(BLUE, CYAN, t);
          var cb = new THREE.Color().lerpColors(CYAN, BLUE, t);
          lineColors.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b);
        }
      }
    }

    var lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVerts,  3));
    lineGeo.setAttribute('color',    new THREE.Float32BufferAttribute(lineColors, 3));

    var lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent:  true,
      opacity:      0.55,
      blending:     THREE.AdditiveBlending,
      depthWrite:   false,
    });

    var lines = new THREE.LineSegments(lineGeo, lineMat);

    /* ── Point nodes ───────────────────────────────────────────────── */
    var pPos   = new Float32Array(N * 3);
    var pCol   = new Float32Array(N * 3);
    var pSize  = new Float32Array(N);

    for (var i = 0; i < N; i++) {
      pPos[i * 3]     = pts[i].x;
      pPos[i * 3 + 1] = pts[i].y;
      pPos[i * 3 + 2] = pts[i].z;

      var isHub  = i < 14;
      var isMaga = isHub && Math.random() < 0.25;
      var col    = isMaga ? MAGA : isHub ? CYAN : (Math.random() < 0.12 ? CYAN : BLUE);
      pCol[i * 3]     = col.r;
      pCol[i * 3 + 1] = col.g;
      pCol[i * 3 + 2] = col.b;
      pSize[i]  = isHub ? 12 + Math.random() * 10 : 3 + Math.random() * 5;
    }

    var ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPos,  3));
    ptGeo.setAttribute('color',    new THREE.Float32BufferAttribute(pCol,  3));
    ptGeo.setAttribute('size',     new THREE.Float32BufferAttribute(pSize, 1));

    var ptMat = new THREE.PointsMaterial({
      vertexColors:     true,
      size:             10,
      map:              glowSprite,
      blending:         THREE.AdditiveBlending,
      depthWrite:       false,
      transparent:      true,
      sizeAttenuation:  true,
    });

    var points = new THREE.Points(ptGeo, ptMat);

    /* ── Second layer: distant background stars ────────────────────── */
    var STARS = 300;
    var sPOS  = new Float32Array(STARS * 3);
    var sCOL  = new Float32Array(STARS * 3);
    var sSZ   = new Float32Array(STARS);

    for (var i = 0; i < STARS; i++) {
      /* scatter far beyond the main sphere */
      var angle1 = Math.random() * Math.PI * 2;
      var angle2 = Math.random() * Math.PI * 2;
      var dist   = 250 + Math.random() * 600;
      sPOS[i * 3]     = dist * Math.sin(angle1) * Math.cos(angle2);
      sPOS[i * 3 + 1] = dist * Math.sin(angle1) * Math.sin(angle2);
      sPOS[i * 3 + 2] = dist * Math.cos(angle1);
      var sc = new THREE.Color().lerpColors(BLUE, WHT, Math.random() * 0.4);
      sCOL[i * 3]     = sc.r; sCOL[i * 3 + 1] = sc.g; sCOL[i * 3 + 2] = sc.b;
      sSZ[i] = 1 + Math.random() * 2;
    }

    var starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPOS, 3));
    starGeo.setAttribute('color',    new THREE.Float32BufferAttribute(sCOL, 3));
    starGeo.setAttribute('size',     new THREE.Float32BufferAttribute(sSZ,  1));

    var starMat = new THREE.PointsMaterial({
      vertexColors:    true,
      size:            3,
      map:             glowSprite,
      blending:        THREE.AdditiveBlending,
      depthWrite:      false,
      transparent:     true,
      sizeAttenuation: true,
      opacity:         0.55,
    });

    var stars = new THREE.Points(starGeo, starMat);

    /* ── Assemble scene ────────────────────────────────────────────── */
    var group = new THREE.Group();
    group.add(lines, points);
    scene.add(group, stars);   /* stars rotate independently (slower) */

    /* ── Mouse parallax ────────────────────────────────────────────── */
    var mx = 0, my = 0, tmx = 0, tmy = 0;
    window.addEventListener('mousemove', function (e) {
      tmx = (e.clientX / window.innerWidth  - 0.5) * 2;
      tmy = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    /* ── Resize ────────────────────────────────────────────────────── */
    window.addEventListener('resize', function () {
      var W = window.innerWidth, H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    });

    /* ── Animation loop ────────────────────────────────────────────── */
    function animate(t) {
      requestAnimationFrame(animate);

      /* smooth mouse */
      mx += (tmx - mx) * 0.035;
      my += (tmy - my) * 0.035;

      /* rotate main group (x and y axes for a dynamic tumble) */
      group.rotation.y = t * 0.00014;
      group.rotation.x = t * 0.000055;

      /* stars rotate slower — adds depth parallax */
      stars.rotation.y = t * 0.000035;
      stars.rotation.x = t * 0.000015;

      /* camera drifts with mouse */
      camera.position.x += (mx * 35 - camera.position.x) * 0.04;
      camera.position.y += (-my * 35 - camera.position.y) * 0.04;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }

    requestAnimationFrame(animate);
  }
})();
