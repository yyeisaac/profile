const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const nameEl = document.getElementById('name');

const config = {
  particleCount: 34,
  maxSpeed: 1.9,
  centerPull: 0.007,
  clumpPull: 0.014,
  damping: 0.94,
  repelRadius: 190,
  repelStrength: 0.5,
  separationStrength: 0.18,
  separationPadding: 3,
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
  radius: 170,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getNameBounds() {
  const rect = nameEl.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    radius: Math.max(rect.width * 0.78, 170),
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
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  center = getNameBounds();
}

function createParticle() {
  const angle = Math.random() * Math.PI * 2;
  const spread = Math.sqrt(Math.random());
  const depth = Math.random();
  const radius = 20 + depth * 24;

  return {
    x: center.x + Math.cos(angle) * center.radius * spread,
    y: center.y + Math.sin(angle) * center.radius * spread,
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 0.5) * 1.2,
    depth,
    radius,
    hue: 210,
    saturation: 8 + Math.random() * 7,
    lightness: 64 + Math.random() * 16,
  };
}

function initParticles() {
  particles.length = 0;
  for (let i = 0; i < config.particleCount; i += 1) {
    particles.push(createParticle());
  }
}

function applySeparation() {
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
  const normalized = clamp(distanceToCenter / center.radius, 0.5, 1.8);
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
      particle.vx += (mdx / safeDistance) * force * 8;
      particle.vy += (mdy / safeDistance) * force * 8;
    }
  }

  particle.vx *= config.damping;
  particle.vy *= config.damping;
  particle.vx = clamp(particle.vx, -config.maxSpeed, config.maxSpeed);
  particle.vy = clamp(particle.vy, -config.maxSpeed, config.maxSpeed);

  particle.x += particle.vx;
  particle.y += particle.vy;
}

function drawSphere(particle) {
  const x = particle.x;
  const y = particle.y;
  const r = particle.radius;
  const depthScale = 0.75 + particle.depth * 0.6;

  const body = ctx.createRadialGradient(
    x - r * 0.22,
    y - r * 0.28,
    r * 0.12,
    x,
    y,
    r * 1.15
  );
  body.addColorStop(0, `hsla(${particle.hue}, ${particle.saturation + 6}%, ${particle.lightness + 10}%, 1)`);
  body.addColorStop(0.45, `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, 0.99)`);
  body.addColorStop(0.78, `hsla(${particle.hue}, ${particle.saturation - 4}%, ${particle.lightness - 15}%, 1)`);
  body.addColorStop(1, `hsla(${particle.hue}, ${particle.saturation - 6}%, ${particle.lightness - 25}%, 1)`);

  const shadow = ctx.createRadialGradient(x + r * 0.26, y + r * 0.45, r * 0.15, x + r * 0.35, y + r * 0.56, r * 1.08);
  shadow.addColorStop(0, `rgba(0, 0, 0, ${0.3 + particle.depth * 0.15})`);
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.beginPath();
  ctx.arc(x, y, r * depthScale, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + r * 0.14, y + r * 0.3, r * 0.92 * depthScale, 0, Math.PI * 2);
  ctx.fillStyle = shadow;
  ctx.fill();

  const spec = ctx.createRadialGradient(
    x - r * 0.4,
    y - r * 0.46,
    r * 0.04,
    x - r * 0.25,
    y - r * 0.34,
    r * 0.58
  );
  spec.addColorStop(0, 'rgba(255,255,255,0.98)');
  spec.addColorStop(0.32, 'rgba(245,248,252,0.78)');
  spec.addColorStop(1, 'rgba(235,240,248,0)');

  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.55 * depthScale, 0, Math.PI * 2);
  ctx.fillStyle = spec;
  ctx.fill();
}

function animate() {
  center = getNameBounds();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (const particle of particles) {
    updateParticle(particle);
  }

  applySeparation();

  particles.sort((a, b) => a.depth - b.depth || a.y - b.y);
  for (const particle of particles) {
    drawSphere(particle);
  }

  requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
  resizeCanvas();
  initParticles();
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
initParticles();
animate();
