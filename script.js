const canvas = document.getElementById('particle-canvas');
const nameEl = document.getElementById('name');
const menuToggle = document.getElementById('menu-toggle');
const siteMenu = document.getElementById('site-menu');

if (menuToggle && siteMenu) {
  menuToggle.addEventListener('click', () => {
    const open = siteMenu.classList.toggle('open');
    menuToggle.classList.toggle('active', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    if (!siteMenu.contains(event.target) && !menuToggle.contains(event.target)) {
      siteMenu.classList.remove('open');
      menuToggle.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

if (canvas && nameEl) {
  const ctx = canvas.getContext('2d');
  const textCanvas = document.createElement('canvas');
  const textCtx = textCanvas.getContext('2d', { willReadFrequently: true });

  const config = {
    sampleGap: 4,
    baseSize: 1.55,
    swirlDuration: 2600,
    swirlPull: 0.068,
    orbitStrength: 0.03,
    damping: 0.9,
    settleDistance: 0.65,
    settleVelocity: 0.22,
  };

  const particles = [];
  let introStart = null;
  let viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    cx: window.innerWidth / 2,
    cy: window.innerHeight / 2,
  };

  function fitCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    viewport = {
      width,
      height,
      cx: width / 2,
      cy: height / 2,
    };

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    textCanvas.width = width;
    textCanvas.height = height;
  }

  function createParticle(targetX, targetY) {
    const angle = Math.random() * Math.PI * 2;
    const ring = 110 + Math.random() * Math.min(viewport.width, viewport.height) * 0.46;

    return {
      x: viewport.cx + Math.cos(angle) * ring,
      y: viewport.cy + Math.sin(angle) * ring,
      tx: targetX,
      ty: targetY,
      vx: -Math.sin(angle) * (1.5 + Math.random() * 1.4),
      vy: Math.cos(angle) * (1.5 + Math.random() * 1.4),
      size: config.baseSize + Math.random() * 1.35,
      alpha: 0.45 + Math.random() * 0.45,
      hue: 185 + Math.random() * 120,
      glowHue: 260 + Math.random() * 90,
      twinkle: Math.random() * Math.PI * 2,
    };
  }

  function buildTextParticles() {
    if (!textCtx) {
      return;
    }

    textCtx.clearRect(0, 0, viewport.width, viewport.height);

    const computed = window.getComputedStyle(nameEl);
    const text = (nameEl.textContent || 'ISAAC YEO').toUpperCase();

    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';
    textCtx.fillStyle = '#fff';
    textCtx.font = `${computed.fontWeight || '700'} ${parseFloat(computed.fontSize)}px ${computed.fontFamily || 'Sora, sans-serif'}`;
    textCtx.fillText(text, viewport.cx, viewport.cy);

    const image = textCtx.getImageData(0, 0, viewport.width, viewport.height).data;
    particles.length = 0;

    for (let y = 0; y < viewport.height; y += config.sampleGap) {
      for (let x = 0; x < viewport.width; x += config.sampleGap) {
        const alpha = image[(y * viewport.width + x) * 4 + 3];
        if (alpha > 140) {
          particles.push(createParticle(x, y));
        }
      }
    }

    introStart = null;
  }

  function updateParticle(particle, introPhase, time) {
    const dx = particle.tx - particle.x;
    const dy = particle.ty - particle.y;

    if (introPhase > 0) {
      const cx = particle.x - viewport.cx;
      const cy = particle.y - viewport.cy;
      const distanceFromCenter = Math.hypot(cx, cy) || 1;
      const swirlForce = config.orbitStrength * introPhase;

      particle.vx += (-cy / distanceFromCenter) * swirlForce * 3;
      particle.vy += (cx / distanceFromCenter) * swirlForce * 3;
    }

    particle.vx += dx * config.swirlPull;
    particle.vy += dy * config.swirlPull;

    particle.vx *= config.damping;
    particle.vy *= config.damping;

    particle.x += particle.vx;
    particle.y += particle.vy;

    const speed = Math.hypot(particle.vx, particle.vy);
    if (Math.abs(dx) < config.settleDistance
      && Math.abs(dy) < config.settleDistance
      && speed < config.settleVelocity) {
      particle.x = particle.tx;
      particle.y = particle.ty;
      particle.vx = 0;
      particle.vy = 0;
    }

    const pulse = 0.8 + Math.sin(time * 0.002 + particle.twinkle) * 0.2;
    const radius = particle.size * pulse;

    const glow = ctx.createRadialGradient(
      particle.x,
      particle.y,
      radius * 0.15,
      particle.x,
      particle.y,
      radius * 3.8
    );

    glow.addColorStop(0, `hsla(${particle.hue}, 100%, 74%, ${Math.min(1, particle.alpha + 0.18)})`);
    glow.addColorStop(0.35, `hsla(${particle.glowHue}, 92%, 62%, ${particle.alpha * 0.6})`);
    glow.addColorStop(1, 'rgba(120,160,255,0)');

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius * 1.05, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius * 0.58, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${particle.hue + 10}, 100%, 85%, ${Math.min(1, particle.alpha + 0.25)})`;
    ctx.fill();
  }

  function animate(time = 0) {
    if (!ctx) {
      return;
    }

    if (!introStart) {
      introStart = time;
    }

    const introElapsed = time - introStart;
    const introPhase = Math.max(0, 1 - introElapsed / config.swirlDuration);

    ctx.clearRect(0, 0, viewport.width, viewport.height);

    for (const particle of particles) {
      updateParticle(particle, introPhase, time);
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    fitCanvas();
    buildTextParticles();
  });

  fitCanvas();
  buildTextParticles();
  animate();
}
