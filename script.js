const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
const nameEl = document.getElementById('name');

const config = {
  particleCount: 120,
  maxSpeed: 2.2,
  centerPull: 0.008,
  clumpPull: 0.015,
  damping: 0.94,
  repelRadius: 150,
  repelStrength: 0.42,
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
  radiusX: 220,
  radiusY: 110,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getNameBounds() {
  const rect = nameEl.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    radiusX: Math.max(rect.width * 0.62, 120),
    radiusY: Math.max(rect.height * 2.2, 80),
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
  const spread = 0.18 + Math.random() * 0.82;
  const radius = 7 + Math.random() * 12;

  return {
    x: center.x + Math.cos(angle) * center.radiusX * spread,
    y: center.y + Math.sin(angle) * center.radiusY * spread,
    vx: (Math.random() - 0.5) * 1.6,
    vy: (Math.random() - 0.5) * 1.6,
    radius,
    hue: 205 + Math.random() * 25,
    saturation: 55 + Math.random() * 20,
    lightness: 45 + Math.random() * 16,
  };
}

function initParticles() {
  particles.length = 0;
  for (let i = 0; i < config.particleCount; i += 1) {
    particles.push(createParticle());
  }
}

function updateParticle(particle) {
  const dxCenter = center.x - particle.x;
  const dyCenter = center.y - particle.y;

  particle.vx += dxCenter * config.centerPull;
  particle.vy += dyCenter * config.centerPull;

  const nx = dxCenter / Math.max(center.radiusX, 1);
  const ny = dyCenter / Math.max(center.radiusY, 1);
  particle.vx += nx * config.clumpPull;
  particle.vy += ny * config.clumpPull;

  if (mouse.active) {
    const mdx = particle.x - mouse.x;
    const mdy = particle.y - mouse.y;
    const distance = Math.hypot(mdx, mdy);

    if (distance < config.repelRadius) {
      const falloff = 1 - distance / config.repelRadius;
      const force = config.repelStrength * falloff * falloff;
      const safeDistance = Math.max(distance, 0.0001);
      particle.vx += (mdx / safeDistance) * force * 7.5;
      particle.vy += (mdy / safeDistance) * force * 7.5;
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

  const rim = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.25);
  rim.addColorStop(0, `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness + 20}%, 0.95)`);
  rim.addColorStop(0.55, `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, 0.98)`);
  rim.addColorStop(1, `hsla(${particle.hue}, ${particle.saturation - 12}%, ${particle.lightness - 28}%, 1)`);

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rim;
  ctx.fill();

  const highlight = ctx.createRadialGradient(
    x - r * 0.35,
    y - r * 0.45,
    r * 0.08,
    x - r * 0.3,
    y - r * 0.4,
    r * 0.62
  );
  highlight.addColorStop(0, 'rgba(255,255,255,0.96)');
  highlight.addColorStop(0.35, 'rgba(230,244,255,0.75)');
  highlight.addColorStop(1, 'rgba(210,235,255,0)');

  ctx.beginPath();
  ctx.arc(x - r * 0.22, y - r * 0.22, r * 0.63, 0, Math.PI * 2);
  ctx.fillStyle = highlight;
  ctx.fill();

  const cast = ctx.createRadialGradient(x + r * 0.22, y + r * 0.4, r * 0.2, x + r * 0.28, y + r * 0.52, r * 0.95);
  cast.addColorStop(0, 'rgba(0,0,0,0.22)');
  cast.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.beginPath();
  ctx.arc(x + r * 0.16, y + r * 0.3, r * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = cast;
  ctx.fill();
}

function animate() {
  center = getNameBounds();
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  particles.sort((a, b) => a.radius - b.radius);
  for (const particle of particles) {
    updateParticle(particle);
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
