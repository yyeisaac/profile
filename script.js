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
    sampleGap: 5,
    baseSize: 1.6,
    scatterRadius: 190,
    repelRadius: 110,
    repelForce: 0.55,
    pullForce: 0.032,
    friction: 0.9,
  };

  const particles = [];
  const pointer = {
    x: 0,
    y: 0,
    active: false,
    overName: false,
  };

  function fitCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

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
    return {
      x: targetX,
      y: targetY,
      tx: targetX,
      ty: targetY,
      vx: 0,
      vy: 0,
      size: config.baseSize + Math.random() * 0.85,
      alpha: 0.55 + Math.random() * 0.45,
      hueShift: Math.random() * 22,
      seed: Math.random() * Math.PI * 2,
    };
  }

  function buildTextParticles() {
    if (!textCtx) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    textCtx.clearRect(0, 0, width, height);

    const computed = window.getComputedStyle(nameEl);
    const text = nameEl.textContent || 'ISAAC YEO';
    const fontSize = parseFloat(computed.fontSize);
    const fontWeight = computed.fontWeight || '700';
    const fontFamily = computed.fontFamily || 'Sora, sans-serif';

    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';
    textCtx.fillStyle = '#fff';
    textCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    textCtx.fillText(text.toUpperCase(), width / 2, height / 2);

    const image = textCtx.getImageData(0, 0, width, height).data;
    const nextParticles = [];

    for (let y = 0; y < height; y += config.sampleGap) {
      for (let x = 0; x < width; x += config.sampleGap) {
        const alpha = image[(y * width + x) * 4 + 3];
        if (alpha > 140) {
          nextParticles.push(createParticle(x, y));
        }
      }
    }

    particles.length = 0;
    particles.push(...nextParticles);
  }

  function shatterText() {
    for (const particle of particles) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * config.scatterRadius;
      particle.vx += Math.cos(angle) * (distance * 0.045 + 0.8);
      particle.vy += Math.sin(angle) * (distance * 0.045 + 0.8);
    }
  }

  function updateParticle(particle, time) {
    const dx = particle.tx - particle.x;
    const dy = particle.ty - particle.y;

    particle.vx += dx * config.pullForce;
    particle.vy += dy * config.pullForce;

    if (pointer.active) {
      const mdx = particle.x - pointer.x;
      const mdy = particle.y - pointer.y;
      const distance = Math.hypot(mdx, mdy) || 0.001;
      if (distance < config.repelRadius) {
        const force = (1 - distance / config.repelRadius) * config.repelForce;
        particle.vx += (mdx / distance) * force * 2.8;
        particle.vy += (mdy / distance) * force * 2.8;
      }
    }

    particle.vx *= config.friction;
    particle.vy *= config.friction;
    particle.x += particle.vx;
    particle.y += particle.vy;

    const pulse = 0.85 + Math.sin(time * 0.002 + particle.seed) * 0.15;
    const radius = particle.size * pulse;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${204 + particle.hueShift}, 95%, 80%, ${particle.alpha})`;
    ctx.fill();
  }

  function animate(time = 0) {
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const particle of particles) {
      updateParticle(particle, time);
    }

    requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }

  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseleave', () => {
    pointer.active = false;
  });
  window.addEventListener('touchmove', (event) => {
    if (event.touches.length > 0) {
      pointer.x = event.touches[0].clientX;
      pointer.y = event.touches[0].clientY;
      pointer.active = true;
    }
  }, { passive: true });
  window.addEventListener('touchend', () => {
    pointer.active = false;
  });

  nameEl.addEventListener('mouseenter', () => {
    if (!pointer.overName) {
      shatterText();
      pointer.overName = true;
    }
  });

  nameEl.addEventListener('mouseleave', () => {
    pointer.overName = false;
  });

  window.addEventListener('resize', () => {
    fitCanvas();
    buildTextParticles();
  });

  fitCanvas();
  buildTextParticles();
  animate();
}
