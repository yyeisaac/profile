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
  let ctx = null;

  const config = {
    particleCount: 24,
    maxSpeed: 7.8,
    centerPull: 0.0082,
    clumpPull: 0.0205,
    damping: 0.92,
    repelRadius: 370,
    repelStrength: 1.2,
    separationStrength: 0.06,
    separationPadding: -22,
  };

  const particles = [];
  const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false,
  };

  let center = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    radius: 124,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getNameBounds() {
    const rect = nameEl.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      radius: Math.max(rect.width * 0.44, 108),
    };
  }

  function resizeCanvas() {
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

    center = getNameBounds();
  }

  function createParticle() {
    const angle = Math.random() * Math.PI * 2;
    const spread = Math.sqrt(Math.random()) * 0.34;
    const depth = Math.random();
    const radius = 42 + depth * 40;

    return {
      x: center.x + Math.cos(angle) * center.radius * spread,
      y: center.y + Math.sin(angle) * center.radius * spread,
      vx: (Math.random() - 0.5) * 1.0,
      vy: (Math.random() - 0.5) * 1.0,
      depth,
      radius,
      hue: 216 + Math.random() * 8,
      saturation: 20 + Math.random() * 12,
      lightness: 62 + Math.random() * 14,
      mesh: null,
      wobbleOffset: Math.random() * Math.PI * 2,
    };
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < config.particleCount; i += 1) {
      particles.push(createParticle());
    }
  }

  function applySeparation() {
    if (config.separationStrength <= 0) {
      return;
    }

    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 0.0001;
        const minDistance = a.radius + b.radius + config.separationPadding;

        if (distance < minDistance) {
          const overlap = minDistance - distance;
          const nx = dx / distance;
          const ny = dy / distance;
          const push = overlap * config.separationStrength;

          a.vx -= nx * push;
          a.vy -= ny * push;
          b.vx += nx * push;
          b.vy += ny * push;

          const correction = overlap * 0.5;
          a.x -= nx * correction;
          a.y -= ny * correction;
          b.x += nx * correction;
          b.y += ny * correction;
        }
      }
    }
  }

  function updateParticle(particle) {
    const dxCenter = center.x - particle.x;
    const dyCenter = center.y - particle.y;

    particle.vx += dxCenter * config.centerPull;
    particle.vy += dyCenter * config.centerPull;

    const distanceToCenter = Math.hypot(dxCenter, dyCenter) || 1;
    const normalized = clamp(distanceToCenter / center.radius, 0.45, 2.4);
    particle.vx += (dxCenter / distanceToCenter) * config.clumpPull * normalized;
    particle.vy += (dyCenter / distanceToCenter) * config.clumpPull * normalized;

    if (mouse.active) {
      const mdx = particle.x - mouse.x;
      const mdy = particle.y - mouse.y;
      const distance = Math.hypot(mdx, mdy);

      if (distance < config.repelRadius) {
        const falloff = 1 - distance / config.repelRadius;
        const force = config.repelStrength * falloff * falloff;
        const safeDistance = Math.max(distance, 0.0001);
        particle.vx += (mdx / safeDistance) * force * 18;
        particle.vy += (mdy / safeDistance) * force * 18;
      }
    }

    particle.vx *= config.damping;
    particle.vy *= config.damping;
    particle.vx = clamp(particle.vx, -config.maxSpeed, config.maxSpeed);
    particle.vy = clamp(particle.vy, -config.maxSpeed, config.maxSpeed);

    particle.x += particle.vx;
    particle.y += particle.vy;
  }

  function initThreeRenderer() {
    if (!window.THREE) {
      return null;
    }

    const renderer = new window.THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new window.THREE.Scene();
    const camera = new window.THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 1, 2600);
    camera.position.z = 880;

    const ambient = new window.THREE.AmbientLight(0xc1d2ff, 0.65);
    const key = new window.THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(-0.8, -1, 1.8);
    const fill = new window.THREE.PointLight(0x8fb4ff, 1.2, 2600);
    fill.position.set(230, -160, 780);

    scene.add(ambient, key, fill);

    for (const particle of particles) {
      const geometry = new window.THREE.SphereGeometry(particle.radius * 0.92, 36, 28);
      const color = new window.THREE.Color().setHSL(
        particle.hue / 360,
        clamp((particle.saturation + 8) / 100, 0, 1),
        clamp((particle.lightness + 6) / 100, 0, 1)
      );

      const material = new window.THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.2,
        metalness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.16,
        reflectivity: 0.52,
      });

      const mesh = new window.THREE.Mesh(geometry, material);
      mesh.position.set(
        particle.x - window.innerWidth / 2,
        window.innerHeight / 2 - particle.y,
        -95 + particle.depth * 225
      );

      particle.mesh = mesh;
      scene.add(mesh);
    }

    return { renderer, scene, camera };
  }

  function get2dContext() {
    if (ctx) {
      return ctx;
    }

    ctx = canvas.getContext('2d');
    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    return ctx;
  }

  function drawSphere(particle) {
    const localCtx = get2dContext();
    if (!localCtx) {
      return;
    }

    const x = particle.x;
    const y = particle.y;
    const r = particle.radius;
    const depthScale = 0.76 + particle.depth * 0.62;

    const body = localCtx.createRadialGradient(
      x - r * 0.24,
      y - r * 0.32,
      r * 0.1,
      x,
      y,
      r * 1.2
    );
    body.addColorStop(0, `hsla(${particle.hue}, ${particle.saturation + 10}%, ${particle.lightness + 14}%, 1)`);
    body.addColorStop(0.38, `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, 1)`);
    body.addColorStop(0.75, `hsla(${particle.hue}, ${particle.saturation - 6}%, ${particle.lightness - 16}%, 1)`);
    body.addColorStop(1, `hsla(${particle.hue}, ${particle.saturation - 8}%, ${particle.lightness - 30}%, 1)`);

    const contactShadow = localCtx.createRadialGradient(
      x + r * 0.3,
      y + r * 0.48,
      r * 0.1,
      x + r * 0.36,
      y + r * 0.62,
      r * 1.15
    );
    contactShadow.addColorStop(0, `rgba(0, 0, 0, ${0.32 + particle.depth * 0.2})`);
    contactShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    localCtx.beginPath();
    localCtx.arc(x, y, r * depthScale, 0, Math.PI * 2);
    localCtx.fillStyle = body;
    localCtx.fill();

    localCtx.beginPath();
    localCtx.arc(x + r * 0.14, y + r * 0.34, r * 0.96 * depthScale, 0, Math.PI * 2);
    localCtx.fillStyle = contactShadow;
    localCtx.fill();

    const spec = localCtx.createRadialGradient(
      x - r * 0.44,
      y - r * 0.52,
      r * 0.03,
      x - r * 0.24,
      y - r * 0.34,
      r * 0.65
    );
    spec.addColorStop(0, 'rgba(255,255,255,0.99)');
    spec.addColorStop(0.27, 'rgba(238,245,255,0.86)');
    spec.addColorStop(1, 'rgba(228,237,255,0)');

    localCtx.beginPath();
    localCtx.arc(x - r * 0.2, y - r * 0.24, r * 0.58 * depthScale, 0, Math.PI * 2);
    localCtx.fillStyle = spec;
    localCtx.fill();
  }

  initParticles();
  let three = initThreeRenderer();

  function animate(time = 0) {
    center = getNameBounds();

    for (const particle of particles) {
      updateParticle(particle);
    }

    applySeparation();

    if (three) {
      const { renderer, scene, camera } = three;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      for (const particle of particles) {
        if (!particle.mesh) {
          continue;
        }

        particle.mesh.position.x = particle.x - window.innerWidth / 2;
        particle.mesh.position.y = window.innerHeight / 2 - particle.y;
        particle.mesh.position.z = -95 + particle.depth * 225 + Math.sin(time * 0.001 + particle.wobbleOffset) * 14;
        particle.mesh.rotation.y += particle.vx * 0.00085;
        particle.mesh.rotation.x += particle.vy * 0.00085;
      }

      particles.sort((a, b) => a.depth - b.depth || a.y - b.y);
      renderer.render(scene, camera);
    } else {
      const localCtx = get2dContext();
      if (!localCtx) {
        requestAnimationFrame(animate);
        return;
      }

      localCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles.sort((a, b) => a.depth - b.depth || a.y - b.y);
      for (const particle of particles) {
        drawSphere(particle);
      }
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
    three = initThreeRenderer();
    if (three) {
      three.renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
  });

  window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.active = true;
  });

  window.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  window.addEventListener('touchmove', (event) => {
    if (event.touches.length > 0) {
      mouse.x = event.touches[0].clientX;
      mouse.y = event.touches[0].clientY;
      mouse.active = true;
    }
  });

  window.addEventListener('touchend', () => {
    mouse.active = false;
  });

  resizeCanvas();
  animate();
}
