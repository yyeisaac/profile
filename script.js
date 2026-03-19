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
    baseSampleGap: 4,
    maxParticles: 900,
    baseSize: 1.55,
    swirlOnlyDuration: 700,
    convergeDuration: 780,
    orbitStrength: 0.136,
    damping: 0.9,
    maxDpr: 1.5,
    spriteSize: 40,
  };

  const particles = [];
  let introStart = null;
  let convergeStarted = false;
  let sampleGap = config.baseSampleGap;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    cx: window.innerWidth / 2,
    cy: window.innerHeight / 2,
  };

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, config.maxDpr);
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


  function updateSampleGap() {
    const area = viewport.width * viewport.height;
    if (area > 1500000) {
      sampleGap = 7;
    } else if (area > 900000) {
      sampleGap = 6;
    } else if (area > 500000) {
      sampleGap = 5;
    } else {
      sampleGap = config.baseSampleGap;
    }
  }

  function createParticleSprite(hue, glowHue, alpha) {
    const sprite = document.createElement('canvas');
    const spriteSize = config.spriteSize;
    const spriteCtx = sprite.getContext('2d');

    if (!spriteCtx) {
      return null;
    }

    sprite.width = spriteSize;
    sprite.height = spriteSize;

    const glow = spriteCtx.createRadialGradient(
      spriteSize / 2,
      spriteSize / 2,
      1,
      spriteSize / 2,
      spriteSize / 2,
      spriteSize / 2
    );

    glow.addColorStop(0, `hsla(${hue}, 100%, 74%, ${Math.min(1, alpha + 0.18)})`);
    glow.addColorStop(0.35, `hsla(${glowHue}, 92%, 62%, ${alpha * 0.6})`);
    glow.addColorStop(1, 'rgba(120,160,255,0)');

    spriteCtx.fillStyle = glow;
    spriteCtx.beginPath();
    spriteCtx.arc(spriteSize / 2, spriteSize / 2, spriteSize / 2, 0, Math.PI * 2);
    spriteCtx.fill();

    spriteCtx.beginPath();
    spriteCtx.arc(spriteSize / 2, spriteSize / 2, spriteSize * 0.16, 0, Math.PI * 2);
    spriteCtx.fillStyle = `hsla(${hue + 10}, 100%, 85%, ${Math.min(1, alpha + 0.25)})`;
    spriteCtx.fill();

    return sprite;
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
      sx: 0,
      sy: 0,
      sprite: null,
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
    const targetPoints = [];

    for (let y = 0; y < viewport.height; y += sampleGap) {
      for (let x = 0; x < viewport.width; x += sampleGap) {
        const alpha = image[(y * viewport.width + x) * 4 + 3];
        if (alpha > 140) {
          targetPoints.push({ x, y });
        }
      }
    }

    particles.length = 0;

    if (targetPoints.length > config.maxParticles) {
      const stride = Math.ceil(targetPoints.length / config.maxParticles);
      for (let i = 0; i < targetPoints.length; i += stride) {
        const point = targetPoints[i];
        const particle = createParticle(point.x, point.y);
        particle.sprite = createParticleSprite(particle.hue, particle.glowHue, particle.alpha);
        particles.push(particle);
      }
    } else {
      for (const point of targetPoints) {
        const particle = createParticle(point.x, point.y);
        particle.sprite = createParticleSprite(particle.hue, particle.glowHue, particle.alpha);
        particles.push(particle);
      }
    }

    introStart = null;
    convergeStarted = false;
  }

  function updateParticle(particle, converging, convergeProgress, time) {
    if (!particle.sprite) {
      return;
    }
    if (!converging) {
      const cx = particle.x - viewport.cx;
      const cy = particle.y - viewport.cy;
      const distanceFromCenter = Math.hypot(cx, cy) || 1;

        // swirl (tangential)
        particle.vx += (-cy / distanceFromCenter) * config.orbitStrength * 3;
        particle.vy += (cx / distanceFromCenter) * config.orbitStrength * 3;

        // inward pull (radial)
        particle.vx += (-cx / distanceFromCenter) * config.orbitStrength * 1.2;
        particle.vy += (-cy / distanceFromCenter) * config.orbitStrength * 1.2;

      particle.vx *= config.damping;
      particle.vy *= config.damping;

      particle.x += particle.vx;
      particle.y += particle.vy;
    } else {
      const eased = 1 - ((1 - convergeProgress) ** 3);
      particle.x = particle.sx + (particle.tx - particle.sx) * eased;
      particle.y = particle.sy + (particle.ty - particle.sy) * eased;
    }

    const pulse = converging ? 1 : 0.9 + Math.sin(time * 0.0018 + particle.twinkle) * 0.1;
    const radius = particle.size * pulse;
    const spriteSize = radius * 7;

    ctx.drawImage(particle.sprite, particle.x - spriteSize / 2, particle.y - spriteSize / 2, spriteSize, spriteSize);
  }

  function animate(time = 0, keepAnimating = true) {
    if (!ctx) {
      return;
    }

    if (introStart === null) {
      introStart = time;
    }

    const introElapsed = time - introStart;
    const converging = introElapsed >= config.swirlOnlyDuration;

    if (converging && !convergeStarted) {
      convergeStarted = true;
      for (const particle of particles) {
        particle.sx = particle.x;
        particle.sy = particle.y;
      }
    }

    const convergeElapsed = Math.max(0, introElapsed - config.swirlOnlyDuration);
    const convergeProgress = Math.min(1, convergeElapsed / config.convergeDuration);

    ctx.clearRect(0, 0, viewport.width, viewport.height);

    for (const particle of particles) {
      updateParticle(particle, converging, convergeProgress, time);
    }

    if (keepAnimating) {
      requestAnimationFrame(animate);
    }
  }

  let resizeFrame = null;

  window.addEventListener('resize', () => {
    if (resizeFrame) {
      window.cancelAnimationFrame(resizeFrame);
    }

    resizeFrame = window.requestAnimationFrame(() => {
      fitCanvas();
      updateSampleGap();
      buildTextParticles();
    });
  });

  fitCanvas();
  updateSampleGap();
  buildTextParticles();

  if (prefersReducedMotion.matches) {
    for (const particle of particles) {
      particle.x = particle.tx;
      particle.y = particle.ty;
    }
    animate(config.swirlOnlyDuration + config.convergeDuration, false);
  } else {
    animate();
  }
}
