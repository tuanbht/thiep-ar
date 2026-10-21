/* Ngàn đèn trời: the old riverside town at night, built in code for story.js (template.json "story" loads this file first).
   The sky page (dusk, a night painted over it, then a festival sky full of far lanterns), the moon, the stone quay with
   its lantern-lit shophouses, the river (a hole where the boat floats, so its floor sits below the water), ripples, the
   rowing boat and its oars, flower lanterns (hoa đăng), the sky lanterns with their reflections, lotus pads. The story
   places and times them; anything that sways or twinkles goes by T, the act's own time.
     NM_LANTERN.scenery(kit, layout) → the builders; layout: { W, PAGE, QUAY, BOAT } */
(window.NM_LANTERN = window.NM_LANTERN || {}).scenery = (kit, { W, PAGE, QUAY, BOAT }) => {
  const { THREE, stage, lerp, clamp } = kit;
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .75, ...o }));
  const geo = g => kit.keep(g);
  /** a mesh that takes shadows but casts none: only the two of them cast (onto the boat), so the shadow pass stays small */
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo(g), m); o.position.set(x, y, z); o.receiveShadow = true; return o; };
  /** several meshes made one (their places baked in, relative to `base`): one thing to draw instead of many */
  function merge(meshes, base) {
    base.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(base.matrixWorld).invert(), m4 = new THREE.Matrix4(), pos = [], nor = [], uv = [], idx = [];
    let off = 0;
    for (const m of meshes) {
      const g = m.geometry.clone().applyMatrix4(m4.multiplyMatrices(inv, m.matrixWorld)), p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(t ? t.getX(i) : 0, t ? t.getY(i) : 0); }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off);
      off += p.count; g.dispose(); m.removeFromParent();
    }
    const out = new THREE.BufferGeometry(); out.setIndex(idx);
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return geo(out);
  }
  /** a texture of my own (not a colour one: the water's shader reads its numbers as they are) */
  const rawTexture = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); return kit.keep(new THREE.CanvasTexture(cv)); };
  /** additive light that leaves the canvas's alpha as it is: the player draws over a see-through canvas (the camera's
      picture, the page behind), where a faded additive quad that still added alpha would show as a black smudge */
  const light = m => Object.assign(m, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
  const LANTERN_COLORS = ['#ff4b3e', '#ffb33b', '#ff7aa8', '#ffd94a', '#ff8a3d', '#5fd0c0', '#e8433f', '#8fd16a', '#5aa8ff'];

  /* ── the sky page: dusk, the night painted over it, the festival's far lanterns over that ── */
  const PX = 1024 / PAGE.width;
  const pageX = x => (x + PAGE.width / 2) * PX, pageY = (y, h) => h - y * PX;
  const pageZ = x => PAGE.z + PAGE.curve * (x / (PAGE.width / 2)) ** 2;
  const DUSK = [[0, '#2a3a78'], [.35, '#6a5aa0'], [.62, '#c77aa0'], [.8, '#f3a07c'], [1, '#ffd29a']];
  const NIGHT = [[0, '#070b26'], [.4, '#141c4e'], [.72, '#2c2a66'], [.9, '#5a3a72'], [1, '#8a4a6a']];
  /** the far bank: roofs of an old town, a pagoda's curled eaves, trees; lit windows and strings of lanterns at night */
  function farTown(c, W, H, night, r) {
    const base = pageY(.13, H);
    c.fillStyle = night ? '#1a1838' : '#4b3f6e';
    c.beginPath(); c.moveTo(0, base);
    for (let x = 0; x <= W; x += 18) c.lineTo(x, pageY(.27 + .03 * Math.sin(x * .011) + .02 * Math.sin(x * .031 + 1), H) - r() * 10);   // trees on the far hills
    c.lineTo(W, base); c.fill();
    const roofs = [];
    for (let x = -20; x < W; x += 50 + r() * 50) roofs.push([x, 46 + r() * 50, pageY(.2 + r() * .07, H)]);
    for (const [x, w, top] of roofs) {
      c.fillStyle = night ? '#272449' : '#5f4f80'; c.fillRect(x, top, w, base - top);
      c.fillStyle = night ? '#3a2a3a' : '#7a4a52';                      // a tiled roof, its eaves turned up
      c.beginPath(); c.moveTo(x - 8, top + 4); c.quadraticCurveTo(x + w / 2, top - 22, x + w + 8, top + 4); c.lineTo(x + w + 12, top - 4); c.lineTo(x + w - 4, top + 8); c.lineTo(x + 4, top + 8); c.lineTo(x - 12, top - 4); c.fill();
      for (let k = 0; k < 3; k++) if (r() < .7) {
        const wx = x + 6 + r() * (w - 18), wy = top + 14 + r() * (base - top - 26);
        c.fillStyle = night ? `rgba(255,${190 + (r() * 50) | 0},110,${.75 + r() * .25})` : 'rgba(255,214,150,.35)'; c.fillRect(wx, wy, 9, 11);
      }
    }
    const px = pageX(-.28), py = pageY(.2, H);                          // a pagoda over the roofs, three tiers
    for (let i = 0; i < 3; i++) {
      const w = 92 - i * 24, y = py - i * 36;
      c.fillStyle = night ? '#2c2850' : '#665585'; c.fillRect(px - w * .32, y - 30, w * .64, 30);
      c.fillStyle = night ? '#3d2c40' : '#84505a';
      c.beginPath(); c.moveTo(px - w / 2 - 10, y - 26); c.quadraticCurveTo(px, y - 46, px + w / 2 + 10, y - 26); c.lineTo(px + w / 2 + 16, y - 36); c.lineTo(px + w / 2, y - 20); c.lineTo(px - w / 2, y - 20); c.lineTo(px - w / 2 - 16, y - 36); c.fill();
      if (night) { c.fillStyle = '#ffcf7a'; c.fillRect(px - 5, y - 22, 10, 12); }
    }
    if (night) for (let s = 0; s < 4; s++) {                            // strings of little lanterns across the far town
      const y0 = pageY(.17 + s * .03, H), x0 = r() * W * .4, x1 = x0 + W * (.3 + r() * .4);
      c.strokeStyle = 'rgba(40,20,30,.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, y0 + 18, x1, y0); c.stroke();
      for (let t = 0; t <= 1; t += .05) {
        const x = lerp(x0, x1, t), y = y0 + 18 * 2 * t * (1 - t) * 2 * .5 + 3, col = LANTERN_COLORS[(r() * LANTERN_COLORS.length) | 0];
        const g = c.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,180,90,0)');
        c.fillStyle = g; c.fillRect(x - 9, y - 9, 18, 18); c.fillStyle = col; c.beginPath(); c.ellipse(x, y, 3, 4, 0, 0, TAU); c.fill();
      }
    }
  }
  function paintSky(c, W, H, night) {
    const r = seeded(night ? 52 : 29), hz = pageY(.12, H);
    const g = c.createLinearGradient(0, 0, 0, hz);
    for (const [k, col] of night ? NIGHT : DUSK) g.addColorStop(k, col);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const glow = c.createRadialGradient(W * .5, hz, 0, W * .5, hz, W * .55);   // the town's own glow on the low sky
    glow.addColorStop(0, night ? 'rgba(255,150,100,.38)' : 'rgba(255,220,170,.5)'); glow.addColorStop(1, 'rgba(255,160,120,0)');
    c.fillStyle = glow; c.fillRect(0, 0, W, H);
    if (night) for (let i = 0; i < 160; i++) {                           // stars; brighter ones twinkle in front of it
      c.fillStyle = `rgba(255,248,230,${.25 + .55 * r()})`; c.beginPath(); c.arc(r() * W, r() * hz * .7, .6 + r() * 1.4, 0, TAU); c.fill();
    }
    c.globalAlpha = night ? .5 : .75;                                   // long thin clouds
    for (let i = 0; i < 7; i++) {
      const cx = r() * W, cy = hz * (.2 + r() * .55), w = W * (.08 + r() * .14), h = 5 + r() * 6;
      c.fillStyle = night ? '#2e3270' : ['#f4b7b4', '#e59ab8', '#ffd0a8'][i % 3]; c.beginPath(); c.ellipse(cx, cy, w, h, 0, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
    farTown(c, W, H, night, r);
  }
  /** hundreds of far lanterns rising over the town, each a warm dot in its own glow */
  function paintFestival(c, W, H) {
    const r = seeded(77);
    for (let i = 0; i < 420; i++) {
      const y = pageY(.24 + Math.pow(r(), .8) * .86, H), x = r() * W, s = 1.5 + r() * 3.2 * (1 - (H - y) / H * .5);
      const g = c.createRadialGradient(x, y, 0, x, y, s * 4); g.addColorStop(0, 'rgba(255,190,100,.55)'); g.addColorStop(1, 'rgba(255,150,80,0)');
      c.fillStyle = g; c.fillRect(x - s * 4, y - s * 4, s * 8, s * 8);
      c.fillStyle = r() < .85 ? '#ffd27a' : '#ff9b6b'; c.beginPath(); c.ellipse(x, y, s * .8, s, 0, 0, TAU); c.fill();
    }
  }
  /** the page and the moon: { root, dusk, night, fest, moon } */
  function makePage() {
    const o = { width: PAGE.width, height: PAGE.height, curve: PAGE.curve, z: 0 };
    const root = new THREE.Group(); root.position.z = PAGE.z;
    const dusk = kit.backdrop((c, w, h) => paintSky(c, w, h, false), { ...o, order: -4 });
    const night = kit.backdrop((c, w, h) => paintSky(c, w, h, true), { ...o, order: -3 }); night.position.z = .002; night.material.opacity = 0;
    const fest = kit.backdrop(paintFestival, { ...o, order: -2 }); fest.position.z = .004; fest.material.opacity = 0; fest.material.depthWrite = false;
    const back = new THREE.Mesh(dusk.geometry, mat(0x2a2440, { roughness: 1, side: THREE.BackSide })); back.position.z = -.002;
    const moon = kit.picture((c, px) => {                              // a full moon, its glow and its grey seas
      const g = c.createRadialGradient(px / 2, px / 2, px * .16, px / 2, px / 2, px * .5);
      g.addColorStop(0, 'rgba(255,244,210,.55)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(0, 0, px, px);
      c.fillStyle = '#fff3cf'; c.beginPath(); c.arc(px / 2, px / 2, px * .2, 0, TAU); c.fill();
      c.fillStyle = 'rgba(214,196,160,.55)';
      for (const [x, y, s] of [[.46, .44, .05], [.55, .53, .035], [.43, .56, .028], [.56, .42, .022]]) { c.beginPath(); c.arc(px * x, px * y, px * s, 0, TAU); c.fill(); }
    }, { size: .22 });
    root.add(back, dusk, night, fest);
    stage.add(root, moon);
    return { root, dusk, night, fest, moon };
  }

  /* ── the quay: stone along the back, steps down to the water, shophouses with lanterns under their eaves ── */
  const stones = (c, w, h, top) => {                                   // stone blocks, each its own shade, moss low down
    const r = seeded(top ? 13 : 7);
    c.fillStyle = '#8c8173'; c.fillRect(0, 0, w, h);
    for (let y = 0, row = 0; y < h; y += 22, row++) for (let x = -(row % 2) * 24; x < w; x += 48) {
      const k = 120 + r() * 50; c.fillStyle = `rgb(${k + 18},${k + 8},${k - 6})`; c.fillRect(x + 2, y + 2, 44, 18);
      if (!top && y > h * .6 && r() < .5) { c.fillStyle = `rgba(70,${110 + r() * 40},70,.45)`; c.fillRect(x + 2, y + 12 + r() * 6, 44 * r(), 6); }
    }
  };
  /** a shophouse front, painted (lit: only what glows at night: windows, the shop's open front, the sign) */
  function facade(o, lit) {
    return (c, w, h) => {
      const r = seeded(o.seed), floor = h * .54;
      c.fillStyle = lit ? '#000' : o.wall; c.fillRect(0, 0, w, h);
      if (!lit) {
        for (let i = 0; i < 50; i++) { c.fillStyle = `rgba(120,80,30,${.04 + r() * .07})`; c.beginPath(); c.ellipse(r() * w, r() * h, 4 + r() * 14, 3 + r() * 9, 0, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(80,50,20,.25)'; c.fillRect(0, h - 8, w, 8);
        c.fillStyle = '#6a3a22'; c.fillRect(0, floor - 6, w, 8);                       // the beam between the floors
      }
      const shop = [w * .1, floor + 10, w * .8, h - floor - 18];                      // the shop front: wooden doors, a lattice
      if (lit) { c.fillStyle = '#ffb35a'; c.fillRect(...shop); }
      else {
        c.fillStyle = '#5a2e1c'; c.fillRect(...shop);
        c.fillStyle = '#ffcf8a'; c.fillRect(shop[0] + 8, shop[1] + 8, shop[2] - 16, shop[3] * .5);
        c.strokeStyle = '#4a2416'; c.lineWidth = 3;
        for (let x = shop[0] + 8; x < shop[0] + shop[2] - 8; x += 12) { c.beginPath(); c.moveTo(x, shop[1] + 8); c.lineTo(x, shop[1] + 8 + shop[3] * .5); c.stroke(); }
        for (let k = 0; k < 4; k++) { c.fillStyle = '#6e3a24'; c.fillRect(shop[0] + 4 + k * shop[2] / 4, shop[1] + shop[3] * .58, shop[2] / 4 - 8, shop[3] * .38); }
      }
      for (const [x, ww] of o.windows) {                               // the upper floor's windows, shutters open
        const X = x * w, Y = h * .14, hh = h * .26;
        if (lit) { c.fillStyle = '#ffc06a'; c.fillRect(X - ww * w / 2, Y, ww * w, hh); continue; }
        c.fillStyle = o.shutter; c.fillRect(X - ww * w / 2 - ww * w * .45, Y, ww * w * .42, hh); c.fillRect(X + ww * w / 2 + ww * w * .03, Y, ww * w * .42, hh);
        c.fillStyle = '#ffd896'; c.fillRect(X - ww * w / 2, Y, ww * w, hh);
        c.strokeStyle = '#5a2e1c'; c.lineWidth = 3; c.strokeRect(X - ww * w / 2, Y, ww * w, hh);
        c.beginPath(); c.moveTo(X, Y); c.lineTo(X, Y + hh); c.stroke();
      }
      if (o.sign) {                                                    // a signboard over the shop
        const sw = w * .56, sx = (w - sw) / 2, sy = floor - 46;
        if (lit) { c.fillStyle = '#7a4a10'; c.fillRect(sx, sy, sw, 34); return; }
        c.fillStyle = '#2b1a14'; c.fillRect(sx, sy, sw, 34); c.strokeStyle = '#d9a441'; c.lineWidth = 3; c.strokeRect(sx + 3, sy + 3, sw - 6, 28);
        c.fillStyle = '#f2c86a'; kit.fitText(c, o.sign, { x: sx + 8, y: sy + 2, w: sw - 16, h: 30 }, { max: 26, maxLines: 1, font: '"Be Vietnam Pro", Arial, sans-serif', weight: 800 });
      }
    };
  }
  /** tiles: rows of round tiles, each its own shade */
  function tiles(color) {
    return (c, w, h) => {
      const base = new THREE.Color(color), r = seeded(color.charCodeAt(2) * 7);
      c.fillStyle = color; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 10) {
        const k = .8 + r() * .3; c.fillStyle = `#${base.clone().multiplyScalar(k).getHexString()}`; c.fillRect(x, 0, 7, h);
        c.fillStyle = 'rgba(40,15,10,.35)'; c.fillRect(x + 7, 0, 3, h);
        for (let y = 0; y < h; y += 14) { c.fillStyle = 'rgba(255,230,200,.18)'; c.fillRect(x, y, 7, 2); }
      }
    };
  }
  /** a silk lantern: an oval of colour with a dark cap and foot and a tassel; it glows (set .m.emissiveIntensity) */
  function silkLantern(color, s) {
    const g = new THREE.Group(), m = mat(color, { emissive: color, emissiveIntensity: 0, roughness: .5 }), wood = mat('#3b2016');
    g.add(mesh(new THREE.SphereGeometry(s * .5, 14, 10).scale(1, 1.25, 1), m, 0, -s * .7, 0));
    const bits = [mesh(new THREE.CylinderGeometry(s * .22, s * .26, s * .14, 10), wood, 0, -s * .05, 0), mesh(new THREE.CylinderGeometry(s * .26, s * .2, s * .12, 10), wood, 0, -s * 1.33, 0),
      mesh(new THREE.CylinderGeometry(s * .03, s * .05, s * .45, 5), wood, 0, -s * 1.6, 0), mesh(new THREE.CylinderGeometry(s * .012, s * .012, s * .1, 4), wood, 0, 0, 0)];
    g.add(...bits); g.add(mesh(merge(bits, g), wood));               // its cap, foot, tassel and hook: one wooden piece
    return { root: g, m };
  }
  const swaying = [];                                                  // the town's lanterns: { pin, glow, m, at, ph, color, x, z, y }
  function shophouse(o) {
    const g = new THREE.Group(); g.position.set(o.x, QUAY.top, o.z);
    const wall = mat(o.wall), H = o.h, D = o.d;
    const lit = kit.canvasTexture(128, Math.round(128 * H / o.w), facade(o, true));
    const face = mat('#ffffff', { map: kit.canvasTexture(256, Math.round(256 * H / o.w), facade(o, false)), emissive: 0xffffff, emissiveMap: lit, emissiveIntensity: 0 });
    g.add(mesh(new THREE.BoxGeometry(o.w, H, D), wall, 0, H / 2, 0), mesh(new THREE.PlaneGeometry(o.w, H), face, 0, H / 2, D / 2 + .0005));   // its painted front on a plain box
    const tileM = mat('#ffffff', { map: kit.canvasTexture(128, 64, tiles(o.roof)), roughness: .8 });
    const roof = mesh(new THREE.BoxGeometry(o.w + .02, .006, D * .62), tileM, 0, H + .018, D * .2); roof.rotation.x = .55; g.add(roof);   // the front slope
    const rear = mesh(new THREE.BoxGeometry(o.w + .02, .006, D * .62), tileM, 0, H + .018, -D * .2); rear.rotation.x = -.55; g.add(rear);
    g.add(mesh(new THREE.BoxGeometry(o.w + .024, .008, .008), mat('#5a2a20'), 0, H + .035, 0));          // the ridge
    const awning = mesh(new THREE.BoxGeometry(o.w + .006, .005, .028), tileM, 0, H * .53, D / 2 + .012); awning.rotation.x = .38; g.add(awning);   // a little tiled canopy over the shop
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(.0025, .0025, H * .5, 6), mat('#4a2416'), s * (o.w / 2 - .006), H * .25, D / 2 + .022));   // its posts
    o.lanterns.forEach(([x, y, color, s], i) => {                       // lanterns hanging under the eaves
      const pin = new THREE.Group(); pin.position.set(x * o.w / 2, y, D / 2 + .028); g.add(pin);
      const l = silkLantern(color, s); pin.add(l.root);
      const glow = kit.glow({ color, size: s * 3.4, opacity: 0 }); glow.position.set(0, -s * .7, 0); pin.add(glow);
      swaying.push({ pin, glow, m: l.m, at: o.at + i * .22, ph: o.seed + i * 1.7, color, s, x: o.x + x * o.w / 2, z: o.z + D / 2 + .028, y: QUAY.top + y - s * .7 });
    });
    return { root: g, face, at: o.at };
  }
  const HOUSES = [
    { x: -.4, z: -.276, w: .19, h: .13, d: .05, seed: 3, wall: '#f2c14e', roof: '#8a4a32', shutter: '#3f8a6a', windows: [[.28, .2], [.72, .2]], sign: 'Tiệm Lụa', at: 1.1,
      lanterns: [[-.75, .075, '#ff4b3e', .02], [-.25, .07, '#ffd94a', .018], [.25, .075, '#ff7aa8', .02], [.75, .07, '#5fd0c0', .018]] },
    { x: -.19, z: -.282, w: .2, h: .16, d: .045, seed: 4, wall: '#f6d58a', roof: '#7a3e2c', shutter: '#3f6fa0', windows: [[.25, .18], [.5, .18], [.75, .18]], sign: 'Đèn Lồng', at: 1.5,
      lanterns: [[-.7, .09, '#ffb33b', .022], [-.2, .085, '#e8433f', .02], [.3, .09, '#8fd16a', .02], [.8, .085, '#ff7aa8', .018]] },
    { x: .04, z: -.286, w: .22, h: .14, d: .045, seed: 5, wall: '#eeb24a', roof: '#86442e', shutter: '#4f9a7a', windows: [[.3, .22], [.7, .22]], sign: 'Trà Quán', at: 1.9,
      lanterns: [[-.75, .08, '#ffd94a', .02], [-.3, .08, '#ff4b3e', .022], [.15, .08, '#5aa8ff', .018], [.6, .08, '#ff8a3d', .021]] },
    { x: .27, z: -.282, w: .2, h: .15, d: .045, seed: 6, wall: '#f4cf72', roof: '#7e402c', shutter: '#b8433a', windows: [[.3, .2], [.7, .2]], sign: 'Phố Hội', at: 2.3,
      lanterns: [[-.65, .085, '#e8433f', .021], [-.15, .085, '#ffb33b', .02], [.4, .085, '#ff7aa8', .02], [.85, .08, '#ffd94a', .018]] },
    { x: .44, z: -.27, w: .12, h: .12, d: .04, seed: 7, wall: '#f0bb50', roof: '#8a4a32', shutter: '#3f8a6a', windows: [[.5, .3]], at: 2.6,
      lanterns: [[-.5, .07, '#5fd0c0', .018], [.4, .07, '#ff4b3e', .02]] }
  ];
  /** { root, houses, lanterns: swaying, step } */
  function makeQuay() {
    const root = new THREE.Group(); stage.add(root);
    const back = -.3125, d = QUAY.z - back;
    const front = kit.canvasTexture(512, 64, (c, w, h) => stones(c, w, h, false)), top = kit.canvasTexture(512, 64, (c, w, h) => stones(c, w, h, true));
    const sm = mat('#ffffff', { map: front, roughness: .95 }), tm = mat('#ffffff', { map: top, roughness: .95 });
    root.add(mesh(new THREE.BoxGeometry(1, QUAY.top, d), sm, 0, QUAY.top / 2, back + d / 2), mesh(new THREE.PlaneGeometry(1, d).rotateX(-Math.PI / 2), tm, 0, QUAY.top + .0005, back + d / 2));
    const step = new THREE.Group(); step.position.set(QUAY.stepX, 0, QUAY.z); root.add(step);   // steps down to the water
    for (let i = 0; i < 3; i++) {
      const h = QUAY.top - (i + 1) * (QUAY.top - W) / 3.2, dz = .02 * (i + 1);
      step.add(mesh(new THREE.BoxGeometry(.12, h, .02), sm, 0, h / 2, dz - .01));
    }
    const post = mat('#4a3020', { roughness: .8 });
    for (const x of [-.24, .13, .36]) root.add(mesh(new THREE.CylinderGeometry(.007, .008, .022, 8), post, x, QUAY.top + .011, QUAY.z - .008));   // mooring posts
    const houses = HOUSES.map(o => { const h = shophouse(o); root.add(h.root); return h; });
    const pot = mat('#b5562f'), leaf = mat('#3f8a4a');
    for (const [x, z, s] of [[-.3, -.24, 1], [.15, -.245, .8], [.38, -.243, .9]]) {   // pots of plants on the quay
      root.add(mesh(new THREE.CylinderGeometry(.009 * s, .007 * s, .016 * s, 8), pot, x, QUAY.top + .008 * s, z), mesh(new THREE.SphereGeometry(.014 * s, 8, 6), leaf, x, QUAY.top + .022 * s, z));
    }
    return { root, houses, lanterns: swaying, step };
  }
  /** the quay's lanterns: lit one after another from `on`, swaying by T */
  function poseQuay(q, g, T, wind = 1) {
    for (const l of q.lanterns) {
      const k = kit.ease.out(clamp((g - l.at) / .35)), f = 1 + .06 * Math.sin(T * 9 + l.ph) * Math.sin(T * 5.3 + l.ph);
      l.m.emissiveIntensity = 1.5 * k * f; l.glow.material.opacity = .75 * k * f;
      l.pin.rotation.z = .1 * wind * Math.sin(T * 1.3 + l.ph); l.pin.rotation.x = .07 * wind * Math.sin(T * 1.1 + l.ph * 2);
    }
    for (const h of q.houses) h.face.emissiveIntensity = .95 * kit.ease.out(clamp((g - h.at - .3) / .5));
  }

  /* ── the river: dark water, the town's reflections wobbling on it, the moon's path; a hole where the boat floats ── */
  function paintReflections(c, w, h) {                                  // u along x, v from the quay (top) to the card's front edge
    const zOf = z => (z - QUAY.z) / (.3125 - QUAY.z) * h;
    for (const l of swaying) {
      const x = (l.x + .5) * w, z0 = zOf(l.z) + 4, len = h * (.35 + .25 * Math.sin(l.ph * 3) ** 2);
      const g = c.createLinearGradient(0, z0, 0, z0 + len);
      const col = new THREE.Color(l.color), rgb = `${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0}`;
      g.addColorStop(0, `rgba(${rgb},.9)`); g.addColorStop(.4, `rgba(${rgb},.45)`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.fillRect(x - 7, z0, 14, len);
      c.fillStyle = `rgba(${rgb},.35)`; c.fillRect(x - 14, z0, 28, len * .25);
    }
    for (const hs of HOUSES) {                                         // the warm shop fronts, a broad soft glow
      const x = (hs.x + .5) * w, z0 = zOf(QUAY.z), g = c.createLinearGradient(0, z0, 0, z0 + h * .3);
      g.addColorStop(0, 'rgba(255,170,90,.42)'); g.addColorStop(1, 'rgba(255,150,80,0)');
      c.fillStyle = g; c.fillRect(x - hs.w * w * .38, z0, hs.w * w * .76, h * .3);
    }
  }
  /** { mesh, u: uniforms } ; pose: u.uT, u.uNight, u.uBoat (x, z, cos, sin of the boat's turn), u.uGlit (the moon's path), u.uShim */
  function makeRiver() {
    const zs = QUAY.z, ze = .3125, g = new THREE.PlaneGeometry(1, ze - zs, 100, 54);
    g.rotateX(-Math.PI / 2); g.translate(0, W, (zs + ze) / 2);
    const refl = rawTexture(512, 256, paintReflections);
    const u = { uRefl: { value: refl }, uT: { value: 0 }, uNight: { value: 0 }, uBoat: { value: new THREE.Vector4(9, 9, 1, 0) }, uGlit: { value: new THREE.Vector2(.3, 0) },
      uShim: { value: 0 }, uHull: { value: new THREE.Vector2(BOAT.holeL, BOAT.holeB) } };
    const m = kit.keep(new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: `uniform float uT; varying vec3 vP; varying vec2 vUv;
        void main() { vUv = uv; vec3 p = position;
          p.y += .0012 * sin(p.x * 31. + uT * 1.3) * sin(p.z * 23. - uT * .9) + .0008 * sin(p.z * 70. + p.x * 12. - uT * 2.1);
          vP = p; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform sampler2D uRefl; uniform float uT, uNight, uShim; uniform vec4 uBoat; uniform vec2 uGlit, uHull; varying vec3 vP; varying vec2 vUv;
        void main() {
          vec2 d = vP.xz - uBoat.xy, q = vec2(d.x * uBoat.z - d.y * uBoat.w, d.x * uBoat.w + d.y * uBoat.z);   // in the boat's frame: q.y towards its bow
          float t = q.y / uHull.x, b = uHull.y * (t < 0. ? 1. - .3 * pow(abs(t), 2.2) : 1. - pow(max(t, 0.), 1.9));
          if (abs(t) < 1. && abs(q.x) < b) discard;
          float far = smoothstep(.3, ${QUAY.z.toFixed(3)}, vP.z);
          vec3 col = mix(mix(vec3(.2, .26, .44), vec3(.42, .34, .5), far), mix(vec3(.03, .07, .13), vec3(.07, .08, .17), far), uNight);
          float rip = .5 + .5 * sin(vP.z * 260. + 2.2 * sin(vP.x * 34. + uT * .7) - uT * 1.7);
          col += vec3(.035, .05, .08) * rip * (1. - .3 * uNight);
          vec2 ru = vUv + vec2(.006 * sin(vUv.y * 70. + uT * 2.) + .003 * sin(vUv.y * 190. - uT * 3.1), 0.);
          vec4 r = texture2D(uRefl, vec2(ru.x, 1. - ru.y));
          float broken = .55 + .25 * sin(vUv.y * 410. + 4. * sin(vUv.x * 57. + uT * .9) + uT * 2.6) + .2 * sin(vUv.y * 173. - 3. * sin(vUv.x * 23. - uT * .7) + uT * 1.7);
          col += r.rgb * r.a * broken * uNight * (.55 + .45 * uShim);
          float path = exp(-pow((vP.x - uGlit.x) / (.03 + .06 * (vP.z + .25)), 2.)) * uGlit.y;   // the moon's path: glitter, wider towards you
          float sp = pow(.5 + .5 * sin(vP.z * 400. + sin(vP.x * 90.) * 3. + uT * 4.), 8.);
          col += vec3(1., .93, .75) * path * (.12 + .5 * sp);
          vec2 cell = floor(vP.xz * 240.); float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);   // twinkles here and there
          col += vec3(1., .88, .62) * uShim * step(.88, h) * pow(max(0., sin(uT * 2.6 + h * 40.)), 10.) * .9;
          gl_FragColor = vec4(col, 1.);
        }`
    }));
    const water = new THREE.Mesh(geo(g), m); water.frustumCulled = false; water.receiveShadow = false; stage.add(water);
    return { mesh: water, u };
  }

  /* ── ripples: rings spreading on the water (an oar's dip, a hand in the water, a lantern set down) ── */
  function makeRings(max = 48) {
    const tex = kit.canvasTexture(128, 128, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, w * .3, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.75, 'rgba(255,255,255,.9)'); g.addColorStop(.86, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    const im = new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), kit.keep(light(new THREE.MeshBasicMaterial({ map: tex, transparent: true,
      depthWrite: false, toneMapped: false }))), max);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    im.frustumCulled = false; im.renderOrder = 2; kit.keep(im); stage.add(im);
    const R = Array.from({ length: max }, () => ({ x: 0, z: 0, s: 0, grow: 0, life: 0, age: 0, a: 0 }));
    let next = 0;
    const m4 = new THREE.Matrix4(), c = new THREE.Color(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    return {
      emit(x, z, s = .02, grow = .08, life = 1.2, a = .5) { Object.assign(R[next], { x, z, s, grow, life, age: 0, a }); next = (next + 1) % max; },
      clear() { R.forEach(r => { r.life = 0; }); },
      update(dt, tint = 1) {
        R.forEach((r, i) => {
          r.age += dt; const k = r.life ? r.age / r.life : 1, on = r.life && k < 1;
          const s = on ? r.s + r.grow * Math.sqrt(k) : 0;
          m4.compose(v.set(r.x, W + .0012, r.z), q, sc.set(s || 1e-4, 1, s * .9 || 1e-4)); im.setMatrixAt(i, m4);
          const a = on ? r.a * (1 - k) * (1 - k) * tint : 0; im.setColorAt(i, c.setRGB(.75 * a, .85 * a, a));
        });
        im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      }
    };
  }

  /* ── the boat: a painted hull (blue below a red band, an eye on each side of its bow, as boats here wear them), wooden
        inside, a floor below the waterline, two low benches, oars on posts, a bamboo pole with a lantern at the bow.
        Its own frame: the bow towards +z, the keel at y 0, the waterline at BOAT.water ── */
  const halfBeam = t => BOAT.beam * (t < 0 ? 1 - .3 * Math.abs(t) ** 2.2 : 1 - t ** 1.9);     // t: -1 at the stern, 1 at the bow
  const sheer = t => BOAT.depth + .016 * t * t * (t > 0 ? 1.4 : .7);
  const keelY = t => .012 * t ** 4;
  function hullGeometry(inset = 0) {
    const NZ = 30, NJ = 9, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NZ; i++) {
      const t = -1 + 2 * i / NZ, z = t * BOAT.len / 2, b = Math.max(0, halfBeam(t) - inset), k0 = keelY(t) + inset, top = sheer(t);
      for (let j = -NJ; j <= NJ; j++) {
        const th = Math.abs(j) / NJ * Math.PI / 2, x = Math.sign(j) * b * Math.pow(Math.sin(th), .55), y = k0 + (top - k0) * (1 - Math.cos(th));
        pos.push(x, y, z); uv.push((j + NJ) / (2 * NJ), i / NZ);
      }
    }
    const row = 2 * NJ + 1;
    for (let i = 0; i < NZ; i++) for (let j = 0; j < row - 1; j++) { const a = i * row + j, b = a + 1, c = a + row, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setIndex(idx);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return geo(g);
  }
  /** the hull's inner half-width at height y (boat frame) at t: where the floor meets its side */
  function widthAt(t, y) {
    const b = halfBeam(t), k0 = keelY(t), top = sheer(t), c = clamp(1 - (y - k0) / (top - k0), 0, 1);
    return b * Math.pow(Math.sin(Math.acos(c)), .55);
  }
  function makeBoat() {
    const root = new THREE.Group(), ride = new THREE.Group(); root.add(ride);   // ride: what rocks with the boat (the two of them go in it)
    const paint = kit.canvasTexture(256, 256, (c, w, h) => {           // outside: u round the hull (keel in the middle), v along it (bow at the bottom)
      c.fillStyle = '#1f4f7a'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 18) { c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(x, 0, 2, h); }
      for (const s of [0, 1]) {                                        // a red band and a cream line under each gunwale
        const x0 = s ? w - 34 : 0; c.fillStyle = '#c8362f'; c.fillRect(x0, 0, 34, h); c.fillStyle = '#f3e3c0'; c.fillRect(s ? w - 40 : 34, 0, 6, h);
      }
      for (const s of [0, 1]) {                                        // the eyes near the bow
        const x = s ? w - 62 : 62, y = h * .86;
        c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(x, y, 16, 10, 0, 0, TAU); c.fill();
        c.fillStyle = '#c8362f'; c.beginPath(); c.ellipse(x, y, 16, 10, 0, 0, TAU); c.lineWidth = 3; c.strokeStyle = '#c8362f'; c.stroke();
        c.fillStyle = '#111'; c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill();
      }
    });
    const wood = kit.canvasTexture(256, 256, (c, w, h) => {            // inside: planks along the hull
      const r = seeded(21); c.fillStyle = '#9a6a42'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 21) { c.fillStyle = `rgb(${150 + r() * 30},${100 + r() * 20},${62 + r() * 15})`; c.fillRect(x, 0, 19, h); c.fillStyle = 'rgba(60,30,15,.5)'; c.fillRect(x + 19, 0, 2, h); }
      for (let i = 0; i < 80; i++) { c.strokeStyle = 'rgba(90,50,25,.25)'; c.lineWidth = 1; c.beginPath(); const x = r() * w, y = r() * h; c.moveTo(x, y); c.lineTo(x + (r() - .5) * 4, y + 20 + r() * 30); c.stroke(); }
    });
    const hull = hullGeometry();
    ride.add(mesh(hull, mat('#ffffff', { map: paint, roughness: .55, side: THREE.FrontSide })));
    ride.add(mesh(hull, mat('#ffffff', { map: wood, roughness: .8, side: THREE.BackSide })));
    const tb = halfBeam(-1), tk = keelY(-1), tt = sheer(-1), transom = new THREE.Shape();   // the flat stern: the hull's last section, closed along its top
    for (let j = -9; j <= 9; j++) {
      const th = Math.abs(j) / 9 * Math.PI / 2, x = Math.sign(j) * tb * Math.pow(Math.sin(th), .55), y = tk + (tt - tk) * (1 - Math.cos(th));
      if (j === -9) transom.moveTo(x, y); else transom.lineTo(x, y);
    }
    const back = mesh(new THREE.ShapeGeometry(transom), mat('#7a4a2a', { side: THREE.DoubleSide })); back.position.z = -BOAT.len / 2; ride.add(back);
    const rail = mat('#7a2a22', { roughness: .5 });                    // the gunwales: a rounded rail along each side
    for (const s of [-1, 1]) {
      const pts = []; for (let i = 0; i <= 24; i++) { const t = -1 + 2 * i / 24; pts.push(new THREE.Vector3(s * halfBeam(t), sheer(t) + .002, t * BOAT.len / 2)); }
      ride.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .0038, 6), rail));
    }
    const floor = new THREE.Shape(), FN = 20;                          // the floor boards, at BOAT.floor
    const fz = t => t * BOAT.len / 2;
    for (let i = 0; i <= FN; i++) { const t = -.97 + 1.9 * i / FN; const p = [widthAt(t, BOAT.floor) - .003, fz(t)]; if (!i) floor.moveTo(p[0], p[1]); else floor.lineTo(p[0], p[1]); }
    for (let i = FN; i >= 0; i--) { const t = -.97 + 1.9 * i / FN; floor.lineTo(-(widthAt(t, BOAT.floor) - .003), fz(t)); }
    const boards = kit.canvasTexture(128, 256, (c, w, h) => { const r = seeded(5); for (let x = 0; x < w; x += 16) { c.fillStyle = `rgb(${172 + r() * 25},${124 + r() * 18},${80 + r() * 12})`; c.fillRect(x, 0, 15, h); c.fillStyle = '#5a3418'; c.fillRect(x + 15, 0, 1, h); } });
    boards.wrapS = boards.wrapT = THREE.RepeatWrapping;
    const fg = new THREE.ShapeGeometry(floor); fg.rotateX(Math.PI / 2);
    const fl = mesh(fg, mat('#ffffff', { map: boards, roughness: .9, side: THREE.DoubleSide }), 0, BOAT.floor, 0); fl.castShadow = false; ride.add(fl);
    { const p = fg.attributes.position, uvs = fg.attributes.uv; for (let i = 0; i < p.count; i++) uvs.setXY(i, p.getX(i) * 6 + .5, p.getZ(i) * 2.4); uvs.needsUpdate = true; }
    const bench = mat('#a0683c', { roughness: .7 });                    // the benches: his across the middle, one at the stern; her cushion before it
    for (const [z, d, y] of [[BOAT.seat, .035, BOAT.thwart], [BOAT.stern + .01, .03, BOAT.seatTop]]) {
      const t = z / (BOAT.len / 2);
      ride.add(mesh(new THREE.BoxGeometry(widthAt(t, y) * 2 - .004, .006, d), bench, 0, y - .003, z));
    }
    const cushion = mesh(new THREE.BoxGeometry(.07, .008, .06), mat('#c8362f', { roughness: .9 }), 0, BOAT.floor + .004, BOAT.cushion); ride.add(cushion);
    for (const s of [-1, 1]) ride.add(mesh(new THREE.SphereGeometry(.006, 8, 6), mat('#f2c14e'), s * .03, BOAT.floor + .008, BOAT.cushion + .028));   // its tassels
    const posts = [-1, 1].map(s => {                                   // the oar posts on the gunwales
      const t = BOAT.lock / (BOAT.len / 2), x = s * halfBeam(t), y = sheer(t);
      ride.add(mesh(new THREE.CylinderGeometry(.003, .0035, .014, 6), rail, x, y + .007, BOAT.lock));
      return new THREE.Vector3(x, y + .013, BOAT.lock);
    });
    const oarWood = mat('#c9955a', { roughness: .6 }), blade = mat('#d8a868', { roughness: .6 });
    const oars = [-1, 1].map(s => {                                    // each oar: its origin at its post, it points along its +z to the blade
      const pivot = new THREE.Group(); pivot.position.copy(posts[s < 0 ? 0 : 1]); ride.add(pivot);
      const o = new THREE.Group(); pivot.add(o);
      o.add(mesh(new THREE.CylinderGeometry(.0028, .0028, BOAT.oarIn + BOAT.oarOut, 6).rotateX(Math.PI / 2), oarWood, 0, 0, (BOAT.oarOut - BOAT.oarIn) / 2));
      o.add(mesh(new THREE.BoxGeometry(.016, .0025, .045), blade, 0, 0, BOAT.oarOut - .018));
      o.add(mesh(new THREE.CylinderGeometry(.0042, .0042, .016, 6).rotateX(Math.PI / 2), mat('#5a3418'), 0, 0, -BOAT.oarIn + .008));   // the grip
      return { pivot, o, side: s };
    });
    const pole = new THREE.Group(); pole.position.set(0, BOAT.floor, BOAT.len / 2 - .045); pole.rotation.x = .38; ride.add(pole);   // a bamboo pole leaning over the bow
    const bamboo = mat('#b9a24a', { roughness: .6 });
    pole.add(mesh(new THREE.CylinderGeometry(.0028, .0032, .19, 6), bamboo, 0, .095, 0));
    for (let i = 1; i < 5; i++) pole.add(mesh(new THREE.CylinderGeometry(.0036, .0036, .004, 6), bamboo, 0, i * .04, 0));
    const hang = new THREE.Group(); hang.position.y = .19; pole.add(hang);
    const bowLamp = silkLantern('#ff4b3e', .028); bowLamp.root.rotation.x = -.38; hang.add(bowLamp.root);
    const bowGlow = kit.glow({ color: 0xff8a5a, size: .11, opacity: 0 }); bowGlow.position.set(0, -.02, .007); hang.add(bowGlow);
    const light = new THREE.PointLight(0xff9a5a, 0, .6, 1.4); light.position.set(0, -.02, 0); hang.add(light);
    return { root, ride, oars, posts, lamp: { m: bowLamp.m, glow: bowGlow, light, hang } };
  }

  /* ── a flower lantern: a lotus of paper petals round a candle, afloat; open(k) spreads its petals ── */
  function makeLotus(o = {}) {
    const s = o.size ?? .05, root = new THREE.Group(), bob = new THREE.Group(); root.add(bob);
    const petalTex = kit.canvasTexture(64, 128, (c, w, h) => {
      const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, o.base ?? '#fff3f6'); g.addColorStop(.6, o.mid ?? '#ffb3c8'); g.addColorStop(1, o.tip ?? '#ff5a8a');
      c.fillStyle = g; c.beginPath(); c.moveTo(w / 2, 0); c.bezierCurveTo(w * 1.05, h * .35, w * .95, h * .8, w / 2, h); c.bezierCurveTo(w * .05, h * .8, -w * .05, h * .35, w / 2, 0); c.fill();
      c.strokeStyle = 'rgba(200,60,100,.35)'; c.lineWidth = 2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(w / 2, h); c.quadraticCurveTo(w / 2 + i * 6, h * .5, w / 2 + i * 8, h * .12); c.stroke(); }
    });
    const pm = mat('#ffffff', { map: petalTex, transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .7, emissive: 0xffc0d0, emissiveMap: petalTex, emissiveIntensity: .15 });
    const pg = new THREE.PlaneGeometry(s * .42, s * .62, 1, 4); pg.translate(0, s * .31, 0);
    { const p = pg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / (s * .62); p.setZ(i, s * .1 * y * y); } pg.computeVertexNormals(); }
    const petals = [];
    for (const [n, tilt, shut, r0, sc] of [[8, 1.05, -.2, .2, 1], [6, .45, -.38, .1, .82]]) for (let i = 0; i < n; i++) {
      const arm = new THREE.Group(); arm.rotation.y = i / n * TAU + (sc < 1 ? .4 : 0); arm.position.y = s * .06; bob.add(arm);
      const p = new THREE.Mesh(geo(pg), pm); p.position.z = s * r0; p.scale.setScalar(sc); arm.add(p); petals.push({ p, open: tilt, shut });
      p.rotation.x = lerp(shut, tilt, o.open ?? 1);
    }
    if (o.still) {                                                     // one that never opens or closes: its petals as one mesh
      const merged = new THREE.Mesh(merge(petals.map(q => q.p), bob), pm); bob.add(merged); petals.length = 0;
    }
    bob.add(mesh(new THREE.CylinderGeometry(s * .32, s * .4, s * .1, 10), mat('#7fbf6a', { roughness: .8 }), 0, s * .03, 0));   // a leaf raft under it
    const candle = mesh(new THREE.CylinderGeometry(s * .07, s * .07, s * .2, 8), mat('#fff6e0', { emissive: 0xffe0a0, emissiveIntensity: .4 }), 0, s * .16, 0);
    const flame = mesh(new THREE.ConeGeometry(s * .05, s * .14, 8), kit.keep(new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false })), 0, s * .33, 0);
    flame.castShadow = false; bob.add(candle, flame);
    const glow = kit.glow({ color: 0xffb060, size: s * 3.2, opacity: .8 }); glow.position.y = s * .3; bob.add(glow);
    const api = {
      root, bob, flame, glow, petals, size: s,
      /** k: 0 a closed bud, 1 open */
      open(k) { petals.forEach(({ p, open, shut }) => { p.rotation.x = lerp(shut, open, k); }); }
    };
    api.open(o.open ?? 1);
    return api;
  }

  /* ── the sky lanterns: paper bodies with a flame's glow inside, many at once (one draw for all), a soft glow round each
        and their reflections on the river ── */
  function makeSkyLanterns(n) {
    const prof = [[.0, .0], [.42, .0], [.46, .1], [.52, .55], [.56, .9], [.5, 1.06], [.3, 1.16], [0, 1.19]].map(([x, y]) => new THREE.Vector2(x, y));
    const body = new THREE.LatheGeometry(prof, 12);
    const tex = kit.canvasTexture(128, 128, (c, w, h) => {
      const g = c.createLinearGradient(0, h, 0, 0); g.addColorStop(0, '#fff6c8'); g.addColorStop(.35, '#ffd27a'); g.addColorStop(1, '#ff9a4a');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(160,60,20,.35)'; for (let x = 0; x < w; x += w / 6) c.fillRect(x, 0, 3, h);
      c.fillStyle = 'rgba(120,40,10,.55)'; c.fillRect(0, h - 6, w, 6);
    });
    const im = new THREE.InstancedMesh(geo(body), kit.keep(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })), n);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); im.frustumCulled = false; kit.keep(im);
    const hg = new THREE.BufferGeometry(), hp = new Float32Array(n * 3), ha = new Float32Array(n), hs = new Float32Array(n), hc = new Float32Array(n * 3);
    hg.setAttribute('position', new THREE.BufferAttribute(hp, 3).setUsage(THREE.DynamicDrawUsage));
    hg.setAttribute('aAlpha', new THREE.BufferAttribute(ha, 1).setUsage(THREE.DynamicDrawUsage));
    hg.setAttribute('aSize', new THREE.BufferAttribute(hs, 1).setUsage(THREE.DynamicDrawUsage));
    hg.setAttribute('aColor', new THREE.BufferAttribute(hc, 3).setUsage(THREE.DynamicDrawUsage));
    const hm = kit.keep(new THREE.ShaderMaterial({                     // the glow round each lantern, a point that faces the phone
      uniforms: { uHalfH: { value: 400 } },
      vertexShader: `attribute float aAlpha, aSize; attribute vec3 aColor; uniform float uHalfH; varying float vA; varying vec3 vC;
        void main() { vA = aAlpha; vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = aAlpha <= 0. ? 0. : aSize * projectionMatrix[1][1] * uHalfH / max(.001, -mv.z); }`,
      fragmentShader: `varying float vA; varying vec3 vC;
        void main() { float d = length(gl_PointCoord - .5) * 2.; float a = vA * (pow(max(0., 1. - d), 2.2) * .9 + .25 * max(0., 1. - d * 3.)); if (a < .004) discard; gl_FragColor = vec4(vC * a, a); }`,
      transparent: true, depthWrite: false
    }));
    light(hm);
    const halo = new THREE.Points(geo(hg), hm); halo.frustumCulled = false; halo.renderOrder = 6;
    const v2 = new THREE.Vector2(); halo.onBeforeRender = r => { r.getDrawingBufferSize(v2); hm.uniforms.uHalfH.value = v2.y / 2; };
    const streak = kit.canvasTexture(32, 128, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.25, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, TAU); c.fill();
    });
    const refl = new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), kit.keep(light(new THREE.MeshBasicMaterial({ map: streak, transparent: true,
      depthWrite: false, toneMapped: false }))), n);
    refl.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); refl.frustumCulled = false; refl.renderOrder = 2; kit.keep(refl);
    stage.add(im, halo, refl);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
    const WARM = new THREE.Color('#ffb060');
    m4.makeScale(1e-5, 1e-5, 1e-5); for (let i = 0; i < n; i++) { im.setMatrixAt(i, m4); refl.setMatrixAt(i, m4); }   // none shows until the story sets it
    return {
      im, halo, refl,
      /** lantern i at (x, y, z), `s` tall, tipped by `tip`; its glow and reflection by `light` (0 hides it) */
      set(i, x, y, z, s, tip, glow, color, body = true) {              // body false: only its reflection (a big lantern of the story's)
        const show = glow > .001 && body;
        m4.compose(v.set(x, y, z), q.setFromEuler(e.set(tip * .6, 0, tip)), sc.setScalar(show ? s : 1e-5)); im.setMatrixAt(i, m4);
        im.setColorAt(i, c.set(color).multiplyScalar(show ? .55 + .45 * glow : 0));
        hp[i * 3] = x; hp[i * 3 + 1] = y + s * .5; hp[i * 3 + 2] = z; ha[i] = show ? .55 * glow : 0; hs[i] = s * 3.2; c.toArray(hc, i * 3);
        const len = s * (1.8 + 2.2 * clamp(y - .2)), rz = Math.min(z + .55 * (y - W), .31 - len / 2), on = Math.abs(x) < .49 - s * .3 && rz > QUAY.z + .01;   // only on the water
        const fade = on ? clamp((y - W - .02) / .1) * glow : 0;
        m4.compose(v.set(x, W + .0014, rz), q.identity(), on ? sc.set(s * .55, 1, len) : sc.setScalar(1e-5)); refl.setMatrixAt(i, m4);
        refl.setColorAt(i, c.set(color).multiply(WARM).multiplyScalar(.3 * fade));   // a warm, faint double on the dark water
      },
      commit() {
        im.instanceMatrix.needsUpdate = im.instanceColor.needsUpdate = refl.instanceMatrix.needsUpdate = refl.instanceColor.needsUpdate = true;
        for (const a of ['position', 'aAlpha', 'aSize', 'aColor']) hg.attributes[a].needsUpdate = true;
      }
    };
  }

  /* ── a big sky lantern of my own: four paper panels (the front one painted by the story), wider at the top, a wire ring
        and a burner under it; glow(k) lights it from inside ── */
  /** lantern paper: bright low down where the flame is, deeper up top, bamboo ribs, a band and an emblem */
  function lanternPaper(c, w, h, o) {
    const g = c.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, o.glow ?? '#fff6d8'); g.addColorStop(.45, o.paper ?? '#ffe0a0'); g.addColorStop(1, o.top ?? '#ffb060');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = o.rib ?? 'rgba(170,80,30,.28)'; c.lineWidth = 3;
    for (let i = 1; i < 5; i++) { const x = w * i / 5; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + (i - 2.5) * 6, h / 2, x, h); c.stroke(); }
    c.fillStyle = o.band ?? 'rgba(200,60,40,.85)'; c.fillRect(0, 0, w, h * .05); c.fillRect(0, h * .95, w, h * .05);
  }
  /* ── a big sky lantern of the story's own: four paper panels (the front one painted by the story), wider at the top,
        a peaked lid, a wire ring and a burner under it; glow(k) lights it from inside ── */
  function makeBigLantern(o) {
    const w = o.width, h = o.height, top = w * 1.12, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const side = kit.canvasTexture(256, 320, (c, W, H) => {
      lanternPaper(c, W, H, o);
      c.fillStyle = o.accent ?? '#e8433f'; kit.heartPath(c, W / 2, H * .52, W * .34); c.fill();
    });
    const front = o.front ?? side;
    const panel = tex => mat('#ffffff', { map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0, roughness: .9, side: THREE.DoubleSide });
    const mats = [panel(front), panel(side), panel(side), panel(side)];
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((a, i) => {        // the front (+z) first, then round: each panel leans out as the lantern widens
      const g = new THREE.PlaneGeometry(1, 1), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const y = p.getY(k) + .5, hw = lerp(w, top, y); p.setXYZ(k, p.getX(k) * hw, y * h, hw / 2); }
      g.rotateY(a); g.computeVertexNormals();
      const m = new THREE.Mesh(geo(g), mats[i]); m.castShadow = false; body.add(m);
    });
    const lid = new THREE.Mesh(geo(new THREE.ConeGeometry(top * .72, h * .16, 4, 1, true).rotateY(Math.PI / 4)), panel(side)); lid.position.y = h + h * .08; lid.castShadow = false; body.add(lid);
    const ring = mesh(new THREE.TorusGeometry(w * .48, .0016, 5, 24).rotateX(Math.PI / 2), mat('#3a2a20'), 0, .002, 0); body.add(ring);
    const burner = mesh(new THREE.CylinderGeometry(w * .1, w * .1, .006, 10), mat('#f6e6c0', { emissive: 0xffc070, emissiveIntensity: 0 }), 0, .004, 0); body.add(burner);
    for (const a of [0, Math.PI / 2]) { const wire = mesh(new THREE.CylinderGeometry(.0009, .0009, w * .96, 4).rotateZ(Math.PI / 2), mat('#3a2a20'), 0, .003, 0); wire.rotation.y = a; body.add(wire); }
    const flame = mesh(new THREE.ConeGeometry(w * .06, w * .2, 8), kit.keep(new THREE.MeshBasicMaterial({ color: 0xffd070, toneMapped: false, transparent: true })), 0, .014, 0);
    flame.castShadow = false; body.add(flame);
    const inner = kit.glow({ color: 0xffb860, size: w * 2.6, opacity: 0 }); inner.position.y = h * .45; body.add(inner);
    /* its light (o.light) stays on the stage and only dims: a light coming and going with its lantern would change the
       scene's count of lights, and every lit material would be rebuilt then, a stall on a phone */
    const light = o.light ? new THREE.PointLight(0xffb070, 0, .7, 1.4) : null, at = new THREE.Vector3();
    if (light) stage.add(light);
    return {
      root, body, mats, flame, inner, light, burner, width: w, height: h,
      glow(k, T = 0) {
        const f = 1 + .05 * Math.sin(T * 11) * Math.sin(T * 7.1);
        mats.forEach(m => { m.emissiveIntensity = .08 + 1.05 * k * f; }); lid.material.emissiveIntensity = .08 + .9 * k * f;
        inner.material.opacity = .85 * k * f; burner.material.emissiveIntensity = 2 * k;
        if (light) { light.intensity = root.visible ? 1.6 * k * f : 0; root.updateMatrixWorld(); light.position.copy(stage.worldToLocal(body.localToWorld(at.set(0, h * .3, 0)))); }
        flame.scale.set(Math.max(.001, k), Math.max(.001, k * f), Math.max(.001, k)); flame.material.opacity = k;
      }
    };
  }

  /* ── lotus pads and flowers in the front corners, and reeds ── */
  function makeLotusPads() {
    const root = new THREE.Group(), r = seeded(41), pads = [];
    const padTex = kit.canvasTexture(128, 128, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, '#7cc06a'); g.addColorStop(1, '#3f8a4a');
      c.fillStyle = g; c.beginPath(); c.moveTo(w / 2, w / 2); c.arc(w / 2, w / 2, w / 2 - 2, .25, TAU - .05); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(220,255,200,.4)'; c.lineWidth = 2; for (let i = 0; i < 9; i++) { const a = .3 + i * .7; c.beginPath(); c.moveTo(w / 2, w / 2); c.lineTo(w / 2 + Math.cos(a) * w * .45, w / 2 + Math.sin(a) * w * .45); c.stroke(); }
    });
    const pm = mat('#ffffff', { map: padTex, transparent: true, alphaTest: .4, roughness: .6, side: THREE.DoubleSide });
    for (const [cx, cz, n] of [[-.43, .26, 6], [.44, .25, 5], [-.47, -.12, 3]]) for (let i = 0; i < n; i++) {
      const x = cx + (r() - .5) * .1, z = cz + (r() - .5) * .08, s = .03 + r() * .025;
      if (Math.abs(x) > .49 || z > .305) continue;
      const p = new THREE.Mesh(geo(new THREE.PlaneGeometry(s, s).rotateX(-Math.PI / 2)), pm); p.position.set(x, W + .0015 + i * .0002, z); p.rotation.y = r() * TAU; root.add(p); pads.push(p);
    }
    root.add(new THREE.Mesh(merge(pads, root), pm));
    const flowers = [[-.41, .245, .035], [.43, .27, .03], [-.47, .19, .026]].map(([x, z, s]) => {
      const f = makeLotus({ size: s, base: '#fff7fa', mid: '#ffc4d6', tip: '#f2558a', still: true }); f.flame.visible = false; f.glow.visible = false;
      f.root.position.set(x, W, z); root.add(f.root); return f;
    });
    const reed = mat('#4f7a3a', { roughness: .8 }), reeds = [];
    for (let i = 0; i < 14; i++) {                                     // reeds at the left front corner and by the steps
      const x = (i < 8 ? -.46 : .47) + (r() - .5) * .05, z = (i < 8 ? .14 : .12) + (r() - .5) * .08, h = .05 + r() * .06;
      const m = mesh(new THREE.CylinderGeometry(.0012, .002, h, 4), reed, x, W + h / 2, z); m.rotation.z = (r() - .5) * .3; root.add(m); reeds.push(m);
    }
    root.add(new THREE.Mesh(merge(reeds, root), reed));
    stage.add(root);
    return { root, pads, flowers };
  }

  return { seeded, mat, geo, mesh, pageZ, lanternPaper, halfBeam, makePage, makeQuay, poseQuay, makeRiver, makeRings, makeBoat, makeLotus,
    makeSkyLanterns, makeBigLantern, makeLotusPads };
};
