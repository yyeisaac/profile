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
    maxDroplets: 320,
    gravity: 0.22,
    drag: 0.982,
    splashPower: 6.6,
    baseBurstAmount: 46,
  };

  const droplets = [];

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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
  }

  const paintPalettes = [
    { hue: 210, saturation: 74, lightness: 58 },
    { hue: 194, saturation: 80, lightness: 57 },
    { hue: 262, saturation: 64, lightness: 58 },
    { hue: 318, saturation: 67, lightness: 59 },
    { hue: 12, saturation: 76, lightness: 55 },
    { hue: 34, saturation: 78, lightness: 56 },
    { hue: 84, saturation: 66, lightness: 53 },
    { hue: 146, saturation: 64, lightness: 50 },
  ];

  function randomPaintColor() {
    const base = paintPalettes[Math.floor(Math.random() * paintPalettes.length)];
    return {
      hue: (base.hue + (Math.random() - 0.5) * 18 + 360) % 360,
      saturation: clamp(base.saturation + (Math.random() - 0.5) * 18, 48, 90),
      lightness: clamp(base.lightness + (Math.random() - 0.5) * 16, 40, 70),
    };
  }

  function createDroplet(originX, originY, paintColor) {
    const angle = Math.random() * Math.PI * 2;
    const spread = 0.45 + Math.random() * 1.9;
    const speed = config.splashPower * spread;
    const depth = Math.random();

    return {
      x: originX + (Math.random() - 0.5) * 14,
      y: originY + (Math.random() - 0.5) * 14,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.4,
      vy: Math.sin(angle) * speed - Math.random() * 2.4,
      depth,
      radius: 4 + Math.random() * 14,
      life: 0,
      ttl: 58 + Math.random() * 64,
      hue: paintColor.hue + (Math.random() - 0.5) * 7,
      saturation: clamp(paintColor.saturation + (Math.random() - 0.5) * 12, 42, 92),
      lightness: clamp(paintColor.lightness + (Math.random() - 0.5) * 10, 35, 72),
      mesh: null,
    };
  }

  function emitSplash(originX, originY) {
    const paintColor = randomPaintColor();
    const amount = config.baseBurstAmount + Math.floor(Math.random() * 20);

    for (let i = 0; i < amount; i += 1) {
      if (droplets.length >= config.maxDroplets) {
        const recycled = droplets.shift();
        if (recycled?.mesh?.parent) {
          recycled.mesh.parent.remove(recycled.mesh);
        }
      }
      droplets.push(createDroplet(originX, originY, paintColor));
    }
  }

  function updateDroplet(droplet) {
    droplet.life += 1;
    droplet.vy += config.gravity;
    droplet.vx *= config.drag;
    droplet.vy *= config.drag;
    droplet.x += droplet.vx;
    droplet.y += droplet.vy;

    if (droplet.y > window.innerHeight + droplet.radius * 2) {
      droplet.life = droplet.ttl;
    }
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

  function drawSplash(droplet) {
    const localCtx = get2dContext();
    if (!localCtx) {
      return;
    }

    const lifeProgress = clamp(droplet.life / droplet.ttl, 0, 1);
    const alpha = (1 - lifeProgress) * 0.88;

    const body = localCtx.createRadialGradient(
      droplet.x - droplet.radius * 0.2,
      droplet.y - droplet.radius * 0.28,
      droplet.radius * 0.08,
      droplet.x,
      droplet.y,
      droplet.radius * 1.26
    );
    body.addColorStop(0, `hsla(${droplet.hue}, ${droplet.saturation}%, ${droplet.lightness + 12}%, ${alpha})`);
    body.addColorStop(0.54, `hsla(${droplet.hue}, ${droplet.saturation}%, ${droplet.lightness}%, ${alpha * 0.92})`);
    body.addColorStop(1, `hsla(${droplet.hue}, ${droplet.saturation - 8}%, ${droplet.lightness - 20}%, 0)`);

    localCtx.beginPath();
    localCtx.arc(droplet.x, droplet.y, droplet.radius * (1 + lifeProgress * 0.5), 0, Math.PI * 2);
    localCtx.fillStyle = body;
    localCtx.fill();
  }

  function triggerNameFlare() {
    nameEl.classList.remove('name-flare');
    window.requestAnimationFrame(() => {
      nameEl.classList.add('name-flare');
    });
  }

  let three = initThreeRenderer();

  function animate() {
    for (let i = droplets.length - 1; i >= 0; i -= 1) {
      const droplet = droplets[i];
      updateDroplet(droplet);
      if (droplet.life >= droplet.ttl) {
        if (droplet.mesh?.parent) {
          droplet.mesh.parent.remove(droplet.mesh);
        }
        droplets.splice(i, 1);
      }
    }

    if (three) {
      const { renderer, scene, camera } = three;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      for (const droplet of droplets) {
        if (!droplet.mesh) {
          const geometry = new window.THREE.CircleGeometry(droplet.radius, 20);
          const material = new window.THREE.MeshStandardMaterial({
            roughness: 0.58,
            metalness: 0.03,
            transparent: true,
            opacity: 0.92,
            side: window.THREE.DoubleSide,
          });
          droplet.mesh = new window.THREE.Mesh(geometry, material);
          scene.add(droplet.mesh);
        }

        const lifeProgress = clamp(droplet.life / droplet.ttl, 0, 1);
        droplet.mesh.position.x = droplet.x - window.innerWidth / 2;
        droplet.mesh.position.y = window.innerHeight / 2 - droplet.y;
        droplet.mesh.position.z = -65 + droplet.depth * 210;
        droplet.mesh.scale.setScalar(1 + lifeProgress * 0.58);
        droplet.mesh.material.color.setHSL(
          ((droplet.hue % 360) + 360) / 360,
          clamp(droplet.saturation / 100, 0, 1),
          clamp(droplet.lightness / 100, 0, 1)
        );
        droplet.mesh.material.opacity = (1 - lifeProgress) * 0.9;
      }

      droplets.sort((a, b) => a.depth - b.depth || a.y - b.y);
      renderer.render(scene, camera);
    } else {
      const localCtx = get2dContext();
      if (!localCtx) {
        requestAnimationFrame(animate);
        return;
      }

      localCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      droplets.sort((a, b) => a.depth - b.depth || a.y - b.y);
      for (const droplet of droplets) {
        drawSplash(droplet);
      }
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    three = initThreeRenderer();
    if (three) {
      three.renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
  });

  window.addEventListener('click', (event) => {
    emitSplash(event.clientX, event.clientY);
    triggerNameFlare();
  });

  window.addEventListener('touchstart', (event) => {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      emitSplash(touch.clientX, touch.clientY);
      triggerNameFlare();
    }
  }, { passive: true });

  resizeCanvas();
  animate();
}
