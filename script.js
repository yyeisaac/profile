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
    maxDroplets: 220,
    gravity: 0.21,
    drag: 0.983,
    splashPower: 6.2,
    burstMin: 28,
    burstRange: 16,
    emissionFrames: 6,
    maxSpawnPerFrame: 12,
  };

  const droplets = [];
  const splashQueue = [];

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

  function createDropletSlot() {
    return {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      depth: 0,
      radius: 0,
      life: 0,
      ttl: 0,
      hue: 0,
      saturation: 0,
      lightness: 0,
      mesh: null,
    };
  }

  function ensureDropletCapacity() {
    while (droplets.length < config.maxDroplets) {
      droplets.push(createDropletSlot());
    }
  }

  function getFreeDroplet() {
    for (let i = 0; i < droplets.length; i += 1) {
      if (!droplets[i].active) {
        return droplets[i];
      }
    }
    return null;
  }

  function activateDroplet(droplet, originX, originY, paintColor) {
    const angle = Math.random() * Math.PI * 2;
    const spread = 0.45 + Math.random() * 1.9;
    const speed = config.splashPower * spread;

    droplet.active = true;
    droplet.x = originX + (Math.random() - 0.5) * 14;
    droplet.y = originY + (Math.random() - 0.5) * 14;
    droplet.vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 1.2;
    droplet.vy = Math.sin(angle) * speed - Math.random() * 2.2;
    droplet.depth = Math.random();
    droplet.radius = 4 + Math.random() * 12;
    droplet.life = 0;
    droplet.ttl = 52 + Math.random() * 58;
    droplet.hue = paintColor.hue + (Math.random() - 0.5) * 7;
    droplet.saturation = clamp(paintColor.saturation + (Math.random() - 0.5) * 12, 42, 92);
    droplet.lightness = clamp(paintColor.lightness + (Math.random() - 0.5) * 10, 35, 72);
  }

  function queueSplash(originX, originY) {
    splashQueue.push({
      x: originX,
      y: originY,
      color: randomPaintColor(),
      remaining: config.burstMin + Math.floor(Math.random() * config.burstRange),
      framesLeft: config.emissionFrames,
    });
  }

  function spawnQueuedDroplets() {
    let spawned = 0;

    for (let i = splashQueue.length - 1; i >= 0; i -= 1) {
      if (spawned >= config.maxSpawnPerFrame) {
        break;
      }

      const splash = splashQueue[i];
      const frameBudget = Math.ceil(splash.remaining / Math.max(splash.framesLeft, 1));
      const toSpawn = Math.min(frameBudget, config.maxSpawnPerFrame - spawned);

      for (let n = 0; n < toSpawn; n += 1) {
        const slot = getFreeDroplet();
        if (!slot) {
          return;
        }
        activateDroplet(slot, splash.x, splash.y, splash.color);
        splash.remaining -= 1;
        spawned += 1;
      }

      splash.framesLeft -= 1;
      if (splash.remaining <= 0 || splash.framesLeft <= 0) {
        splashQueue.splice(i, 1);
      }
    }
  }

  function updateDroplet(droplet) {
    droplet.life += 1;
    droplet.vy += config.gravity;
    droplet.vx *= config.drag;
    droplet.vy *= config.drag;
    droplet.x += droplet.vx;
    droplet.y += droplet.vy;

    if (droplet.y > window.innerHeight + droplet.radius * 2 || droplet.life >= droplet.ttl) {
      droplet.active = false;
      if (droplet.mesh) {
        droplet.mesh.visible = false;
      }
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

    const sharedGeometry = new window.THREE.CircleGeometry(1, 12);
    const baseMaterial = new window.THREE.MeshStandardMaterial({
      roughness: 0.58,
      metalness: 0.03,
      transparent: true,
      opacity: 0.9,
      side: window.THREE.DoubleSide,
    });

    return { renderer, scene, camera, sharedGeometry, baseMaterial };
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

  function disposeThreeRenderer(threeRef) {
    if (!threeRef) {
      return;
    }

    for (const droplet of droplets) {
      if (droplet.mesh?.parent) {
        droplet.mesh.parent.remove(droplet.mesh);
      }
      if (droplet.mesh?.material) {
        droplet.mesh.material.dispose();
      }
      droplet.mesh = null;
    }

    threeRef.baseMaterial.dispose();
    threeRef.sharedGeometry.dispose();
    threeRef.renderer.dispose();
  }

  ensureDropletCapacity();
  let three = initThreeRenderer();

  function animate() {
    spawnQueuedDroplets();

    for (const droplet of droplets) {
      if (!droplet.active) {
        continue;
      }
      updateDroplet(droplet);
    }

    if (three) {
      const { renderer, scene, camera, sharedGeometry, baseMaterial } = three;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      for (const droplet of droplets) {
        if (!droplet.active) {
          continue;
        }

        if (!droplet.mesh) {
          const material = baseMaterial.clone();
          droplet.mesh = new window.THREE.Mesh(sharedGeometry, material);
          scene.add(droplet.mesh);
        }

        const lifeProgress = clamp(droplet.life / droplet.ttl, 0, 1);
        droplet.mesh.visible = true;
        droplet.mesh.position.set(
          droplet.x - window.innerWidth / 2,
          window.innerHeight / 2 - droplet.y,
          -65 + droplet.depth * 210
        );
        droplet.mesh.scale.setScalar(droplet.radius * (1 + lifeProgress * 0.58));
        droplet.mesh.material.color.setHSL(
          ((droplet.hue % 360) + 360) / 360,
          clamp(droplet.saturation / 100, 0, 1),
          clamp(droplet.lightness / 100, 0, 1)
        );
        droplet.mesh.material.opacity = (1 - lifeProgress) * 0.9;
      }

      renderer.render(scene, camera);
    } else {
      const localCtx = get2dContext();
      if (!localCtx) {
        requestAnimationFrame(animate);
        return;
      }

      localCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const droplet of droplets) {
        if (droplet.active) {
          drawSplash(droplet);
        }
      }
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    disposeThreeRenderer(three);
    three = initThreeRenderer();
    if (three) {
      three.renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
  });

  window.addEventListener('click', (event) => {
    queueSplash(event.clientX, event.clientY);
    triggerNameFlare();
  });

  window.addEventListener('touchstart', (event) => {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      queueSplash(touch.clientX, touch.clientY);
      triggerNameFlare();
    }
  }, { passive: true });

  resizeCanvas();
  animate();
}
