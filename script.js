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
    maxDroplets: 240,
    spawnPerFrame: 7,
    gravity: 0.24,
    drag: 0.98,
    splashPower: 5.4,
    baseHue: 214,
    hueSpread: 34,
    hueShiftSpeed: 0.023,
  };

  const droplets = [];
  const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false,
  };
  let hueTicker = 0;

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

  function createDroplet(originX, originY, burst = false) {
    const angle = Math.random() * Math.PI * 2;
    const spread = burst ? (1.5 + Math.random() * 1.2) : (0.4 + Math.random() * 0.7);
    const speed = config.splashPower * spread;
    const depth = Math.random();
    const radius = (burst ? 4 : 7) + Math.random() * 15;

    return {
      x: originX + (Math.random() - 0.5) * 12,
      y: originY + (Math.random() - 0.5) * 12,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
      vy: Math.sin(angle) * speed - Math.random() * 2,
      depth,
      radius,
      life: 0,
      ttl: 50 + Math.random() * 55,
      hueOffset: (Math.random() - 0.5) * config.hueSpread,
      mesh: null,
    };
  }

  function emitSplash(originX, originY, amount = config.spawnPerFrame, burst = false) {
    for (let i = 0; i < amount; i += 1) {
      if (droplets.length >= config.maxDroplets) {
        const recycled = droplets.shift();
        if (recycled?.mesh?.parent) {
          recycled.mesh.parent.remove(recycled.mesh);
        }
      }
      droplets.push(createDroplet(originX, originY, burst));
    }
  }

  function getDropletHue(droplet) {
    return config.baseHue + Math.sin(hueTicker + droplet.life * 0.07) * config.hueSpread + droplet.hueOffset;
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

    for (const droplet of droplets) {
      const geometry = new window.THREE.CircleGeometry(droplet.radius, 16);
      const color = new window.THREE.Color().setHSL(
        getDropletHue(droplet) / 360,
        0.72,
        0.66
      );

      const material = new window.THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.05,
        transparent: true,
        opacity: 0.92,
      });

      const mesh = new window.THREE.Mesh(geometry, material);
      mesh.position.set(
        droplet.x - window.innerWidth / 2,
        window.innerHeight / 2 - droplet.y,
        -65 + droplet.depth * 210
      );

      droplet.mesh = mesh;
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

  function drawSplash(droplet) {
    const localCtx = get2dContext();
    if (!localCtx) {
      return;
    }

    const x = droplet.x;
    const y = droplet.y;
    const r = droplet.radius;
    const lifeProgress = clamp(droplet.life / droplet.ttl, 0, 1);
    const alpha = (1 - lifeProgress) * 0.84;
    const hue = getDropletHue(droplet);

    const body = localCtx.createRadialGradient(
      x - r * 0.24,
      y - r * 0.32,
      r * 0.1,
      x,
      y,
      r * 1.2
    );
    body.addColorStop(0, `hsla(${hue}, 86%, 75%, ${alpha})`);
    body.addColorStop(0.5, `hsla(${hue}, 80%, 60%, ${alpha * 0.9})`);
    body.addColorStop(1, `hsla(${hue}, 74%, 44%, 0)`);

    localCtx.beginPath();
    localCtx.arc(x, y, r * (1 + lifeProgress * 0.5), 0, Math.PI * 2);
    localCtx.fillStyle = body;
    localCtx.fill();
  }

  emitSplash(window.innerWidth / 2, window.innerHeight / 2, 36, true);
  let three = initThreeRenderer();

  function animate(time = 0) {
    hueTicker += config.hueShiftSpeed;

    if (mouse.active) {
      emitSplash(mouse.x, mouse.y);
    }

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
          const geometry = new window.THREE.CircleGeometry(droplet.radius, 16);
          const material = new window.THREE.MeshStandardMaterial({
            roughness: 0.55,
            metalness: 0.05,
            transparent: true,
            opacity: 0.92,
          });
          droplet.mesh = new window.THREE.Mesh(geometry, material);
          scene.add(droplet.mesh);
        }

        const lifeProgress = clamp(droplet.life / droplet.ttl, 0, 1);
        droplet.mesh.position.x = droplet.x - window.innerWidth / 2;
        droplet.mesh.position.y = window.innerHeight / 2 - droplet.y;
        droplet.mesh.position.z = -65 + droplet.depth * 210;
        droplet.mesh.scale.setScalar(1 + lifeProgress * 0.6);
        droplet.mesh.material.color.setHSL(getDropletHue(droplet) / 360, 0.75, 0.62);
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

  window.addEventListener('mousemove', (event) => {
    const moved = Math.hypot(event.clientX - mouse.x, event.clientY - mouse.y);
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.active = true;
    if (moved > 12) {
      emitSplash(mouse.x, mouse.y, 10, true);
    }
  });

  window.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  window.addEventListener('touchmove', (event) => {
    if (event.touches.length > 0) {
      mouse.x = event.touches[0].clientX;
      mouse.y = event.touches[0].clientY;
      mouse.active = true;
      emitSplash(mouse.x, mouse.y, 8, true);
    }
  });

  window.addEventListener('touchend', () => {
    mouse.active = false;
  });

  resizeCanvas();
  animate();
}
