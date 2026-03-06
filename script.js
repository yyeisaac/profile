const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const nameEl = document.getElementById('name');

const config = {
  particleCount: 24,
  maxSpeed: 2.7,
  centerPull: 0.0065,
  clumpPull: 0.013,
  damping: 0.935,
  repelRadius: 240,
  repelStrength: 0.78,
  separationStrength: 0.2,
  separationPadding: 4,
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
    radius: Math.max(rect.width * 0.82, 180),
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
  const radius = 28 + depth * 30;

  return {
    x: center.x + Math.cos(angle) * center.radius * spread,
    y: center.y + Math.sin(angle) * center.radius * spread,
    vx: (Math.random() - 0.5) * 1.1,
    vy: (Math.random() - 0.5) * 1.1,
    depth,
    radius,
    hue: 216 + Math.random() * 8,
    saturation: 20 + Math.random() * 12,
    lightness: 62 + Math.random() * 14,
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
  const normalized = clamp(distanceToCenter / center.radius, 0.45, 1.9);
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
      particle.vx += (mdx / safeDistance) * force * 12;
      particle.vy += (mdy / safeDistance) * force * 12;
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
  const depthScale = 0.76 + particle.depth * 0.62;

  const body = ctx.createRadialGradient(
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

  const contactShadow = ctx.createRadialGradient(
    x + r * 0.3,
    y + r * 0.48,
    r * 0.1,
    x + r * 0.36,
    y + r * 0.62,
    r * 1.15
  );
  contactShadow.addColorStop(0, `rgba(0, 0, 0, ${0.32 + particle.depth * 0.2})`);
  contactShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.beginPath();
  ctx.arc(x, y, r * depthScale, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + r * 0.14, y + r * 0.34, r * 0.96 * depthScale, 0, Math.PI * 2);
  ctx.fillStyle = contactShadow;
  ctx.fill();

  const spec = ctx.createRadialGradient(
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

  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.24, r * 0.58 * depthScale, 0, Math.PI * 2);
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
