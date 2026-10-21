/* Mũi thuyền lộng gió: the sea, the sky and the little ship, built in code for story.js (template.json "story" loads this
   file first, then crew.js). The sky page (golden hour, a dusk painted over it that fades in, a big low sun that sinks
   behind the far sea), the sea on the card (swells rolling past, foam at the bow and along the hull), the ship (hull,
   deck, rail, a step at the bow, a mast with its flag, a lantern and a line of bunting to the stern, a cabin with a
   wheel, a lifebuoy, an anchor, a coil of rope) and the wind's streaks. The story places and times them; the sea, the
   flags and the streaks go by T, the act's own time.
     NM_SHIP.scenery(kit, layout) → the builders; layout: { PAGE, HORIZON, SUN, SHIP } */
(window.NM_SHIP = window.NM_SHIP || {}).scenery = (kit, { PAGE, HORIZON, SUN, SHIP }) => {
  const { THREE, stage, clamp, lerp } = kit;
  const TAU = Math.PI * 2;
  const PX = 1024 / PAGE.width;                                      // the page's canvas: pixels per card width
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .7, ...o }));
  const geo = g => kit.keep(g);
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo(g), m); o.position.set(x, y, z); o.castShadow = true; return o; };
  const D = SHIP.deck;
  /** the deck's half width at z along the ship (its own frame: +z the bow): a pointed bow, a rounded stern */
  const halfWidth = z => (z >= SHIP.mid
    ? SHIP.beam * Math.pow(Math.max(0, 1 - ((z - SHIP.mid) / (SHIP.bow - SHIP.mid)) ** 2), .55)
    : SHIP.beam * Math.sqrt(Math.max(0, 1 - ((z - SHIP.mid) / (SHIP.mid - SHIP.stern + .06)) ** 4)));

  /* ── the sky page: golden hour, a dusk painted over it that fades in, the sun, and the far sea in front ── */
  const GOLD = [[0, '#7d93d6'], [.3, '#e6a3c0'], [.55, '#ffb98f'], [.78, '#ffd27c'], [.93, '#ffe7a8'], [1, '#fff4cf']];
  const DUSK = [[0, '#17184a'], [.3, '#33296e'], [.58, '#7a3f8f'], [.8, '#d0618f'], [.93, '#f48877'], [1, '#ffb27e']];
  const pageX = x => (x + PAGE.width / 2) * PX, pageY = (y, h) => h - y * PX;
  const pageZ = x => PAGE.z + PAGE.curve * (x / (PAGE.width / 2)) ** 2;   // where the page stands at x: its ends come forward
  /** a long cloud low over the sea: a soft body, a gilded belly */
  function streak(c, x, y, w, h, body, rim) {
    c.fillStyle = body;
    for (const [dx, dy, k] of [[0, 0, 1], [-.32, -.45, .55], [.28, -.3, .6], [.55, .1, .35]]) { c.beginPath(); c.ellipse(x + dx * w, y + dy * h, w * k, h * (.8 + .3 * k), 0, 0, TAU); c.fill(); }
    c.strokeStyle = rim; c.lineWidth = h * .38; c.lineCap = 'round';
    c.beginPath(); c.ellipse(x, y + h * .25, w * .95, h * .7, 0, .2, Math.PI - .2); c.stroke();
  }
  /** a heap of cloud, its top in shadow, lit from the sun below */
  function heap(c, x, y, s, body, lit, r) {
    const puffs = Array.from({ length: 9 }, (_, i) => [x + (i - 4) * s * .22 + (r() - .5) * s * .1, y - Math.sin(Math.PI * (i + .5) / 9) * s * .38 - r() * s * .1, s * (.16 + .1 * r())]);
    c.fillStyle = body; for (const [px, py, pr] of puffs) { c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill(); }
    c.fillRect(x - s, y - s * .12, s * 2, s * .14);
    c.fillStyle = lit; for (const [px, py, pr] of puffs) { c.beginPath(); c.arc(px, py + pr * .45, pr * .62, 0, Math.PI); c.fill(); }
    c.fillRect(x - s * .96, y - s * .02, s * 1.92, s * .05);
  }
  function paintSky(c, W, Hc, dusk) {
    const r = seeded(dusk ? 41 : 29), hz = pageY(HORIZON, Hc), sx = pageX(SUN.x), sy = pageY(SUN.y0, Hc);
    const g = c.createLinearGradient(0, 0, 0, hz);
    for (const [k, col] of dusk ? DUSK : GOLD) g.addColorStop(k, col);
    c.fillStyle = g; c.fillRect(0, 0, W, hz + 2);
    const glow = c.createRadialGradient(sx, dusk ? hz : sy, 0, sx, dusk ? hz : sy, dusk ? 360 : 470);
    glow.addColorStop(0, dusk ? 'rgba(255,150,110,.65)' : 'rgba(255,248,214,.95)'); glow.addColorStop(.32, dusk ? 'rgba(236,100,130,.3)' : 'rgba(255,214,130,.45)');
    glow.addColorStop(1, 'rgba(255,190,150,0)'); c.fillStyle = glow; c.fillRect(0, 0, W, hz + 2);
    if (dusk) for (let i = 0; i < 90; i++) {                          // faint stars; the bright ones twinkle in front of it
      c.fillStyle = `rgba(255,246,228,${.25 + .55 * r()})`; c.beginPath(); c.arc(r() * W, r() * hz * .62, .7 + r() * 1.4, 0, TAU); c.fill();
    }
    const body = dusk ? '#4b3a7a' : '#f3a0a8', rim = dusk ? '#ff8f8a' : '#fff1b0';
    for (const [x, y, w, h] of [[-.42, .26, 150, 8], [.3, .245, 190, 9], [-.02, .3, 110, 6], [.4, .36, 120, 7], [-.3, .4, 90, 6], [.1, .47, 140, 7]])
      streak(c, pageX(x), pageY(y, Hc), w, h, body, rim);
    heap(c, pageX(.36), pageY(.6, Hc), 120, dusk ? '#40336f' : '#f6b7b9', dusk ? '#b65a86' : '#ffe0a0', r);
    heap(c, pageX(-.38), pageY(.66, Hc), 86, dusk ? '#3a3068' : '#f3adb8', dusk ? '#a5527f' : '#ffd79a', r);
    for (let i = 0; i < 5; i++) {                                     // far gulls, little inked ticks
      const x = pageX(-.45 + r() * .9), y = pageY(.42 + r() * .3, Hc), s = 5 + r() * 5;
      c.strokeStyle = dusk ? 'rgba(40,30,70,.6)' : 'rgba(120,70,80,.55)'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(x - s, y - s * .3); c.quadraticCurveTo(x - s * .4, y - s * .7, x, y); c.quadraticCurveTo(x + s * .4, y - s * .7, x + s, y - s * .3); c.stroke();
    }
    c.fillStyle = dusk ? '#2c2b63' : '#5d74b0'; c.fillRect(0, hz, W, Hc - hz);
  }
  function paintFarSea(c, W, Hc) {                                     // only below the horizon: the rest is cut away
    const r = seeded(7), hz = pageY(HORIZON, Hc), sx = pageX(SUN.x);
    const g = c.createLinearGradient(0, hz, 0, Hc);
    g.addColorStop(0, '#f6c79a'); g.addColorStop(.12, '#c99aa8'); g.addColorStop(.45, '#5f85b3'); g.addColorStop(1, '#2f6f9f');
    c.fillStyle = g; c.fillRect(0, hz, W, Hc - hz);
    for (let i = 0; i < 520; i++) {                                    // ripples: fine near the horizon, broad in front
      const k = Math.pow(r(), 1.5), y = hz + 3 + k * (Hc - hz - 5), len = 5 + (8 + 46 * k) * r(), x = r() * W;
      c.strokeStyle = `rgba(255,${(214 + 36 * r()) | 0},220,${.1 + .2 * r()})`; c.lineWidth = .8 + k * 2.2;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke();
    }
    for (let i = 0; i < 320; i++) {                                    // the sun's path: golden dashes, wider towards you
      const k = r(), y = hz + 2 + k * (Hc - hz - 4), spread = 10 + 90 * k, x = sx + (r() + r() + r() - 1.5) * spread, len = 6 + (6 + 36 * k) * r();
      c.globalAlpha = .5 + .5 * r(); c.strokeStyle = ['#fff4c2', '#ffd27a', '#ffb36b', '#ffe9a6'][(r() * 4) | 0]; c.lineWidth = 1 + k * 2.6;
      c.beginPath(); c.moveTo(x - len / 2, y); c.lineTo(x + len / 2, y); c.stroke();
    }
    c.globalAlpha = 1;
    for (const [x, s] of [[.33, 1], [-.36, .7]]) {                     // two far sails on the horizon
      const bx = pageX(x), by = hz + 2;
      c.fillStyle = '#4a4f86'; c.beginPath(); c.moveTo(bx - 9 * s, by - 2); c.lineTo(bx + 9 * s, by - 2); c.lineTo(bx + 6 * s, by + 2); c.lineTo(bx - 6 * s, by + 2); c.fill();
      c.fillStyle = '#fff3dc'; c.beginPath(); c.moveTo(bx, by - 3); c.lineTo(bx, by - 22 * s); c.lineTo(bx + 11 * s, by - 4); c.fill();
    }
    const line = c.createLinearGradient(sx - 280, 0, sx + 280, 0);
    line.addColorStop(0, 'rgba(255,236,190,0)'); line.addColorStop(.5, 'rgba(255,242,205,.95)'); line.addColorStop(1, 'rgba(255,236,190,0)');
    c.fillStyle = line; c.fillRect(sx - 280, hz, 560, 3);
  }
  /** the page, hinged at its foot so it can fold up: { root, dusk, sea, sun, sunGlow } */
  function makePage() {
    const o = { width: PAGE.width, height: PAGE.height, curve: PAGE.curve, z: 0 };
    const root = new THREE.Group(); root.position.z = PAGE.z;
    const sky = kit.backdrop((c, w, h) => paintSky(c, w, h, false), { ...o, order: -4 });
    const dusk = kit.backdrop((c, w, h) => paintSky(c, w, h, true), { ...o, order: -3 }); dusk.position.z = .002; dusk.material.opacity = 0;
    const sea = kit.backdrop(paintFarSea, { ...o, order: -2, alphaTest: .5 }); sea.position.z = .008;   // cut away above the horizon: the sun sets behind it
    const back = new THREE.Mesh(sky.geometry, mat(0xf3e6cf, { roughness: 1, side: THREE.BackSide })); back.position.z = -.002;   // the page's paper back
    const disc = kit.canvasTexture(256, 256, (c, w) => {
      const s = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      s.addColorStop(0, '#fffbe6'); s.addColorStop(.5, '#ffe68f'); s.addColorStop(.8, '#ffc158'); s.addColorStop(.95, '#ffa046'); s.addColorStop(1, 'rgba(255,160,70,0)');
      c.fillStyle = s; c.fillRect(0, 0, w, w);
    });
    const sunGeo = new THREE.PlaneGeometry(SUN.r * 2, SUN.r * 2, 12, 1), sp = sunGeo.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setZ(i, pageZ(SUN.x + sp.getX(i)) - PAGE.z + .005);   // bent like the page: between the sky and the far sea
    const sun = new THREE.Mesh(geo(sunGeo), kit.keep(new THREE.MeshBasicMaterial({ map: disc, transparent: true, toneMapped: false })));
    sun.position.set(SUN.x, SUN.y0, 0);
    const sunGlow = kit.glow({ color: 0xffd08a, size: .6, opacity: .75 }); sunGlow.position.set(SUN.x, SUN.y0, pageZ(SUN.x) - PAGE.z + .004);
    root.add(back, sky, dusk, sun, sunGlow, sea);
    return { root, dusk, sea, sun, sunGlow };
  }

  /* ── the sea on the card: swells rolling past the ship, a glittering path under the sun, ripples drifting by ── */
  const NX = 72, NZ = 46, CARD_D = kit.card.depth, WATER = .0088, FOAM = .0152;   // the sea's rest level (above the card's shadow), foam over its crests
  const FAR = new THREE.Color('#5d86b4'), NEAR = new THREE.Color('#2a6f9c'), TEAL = new THREE.Color('#3f9fb2'), GLIT = new THREE.Color('#ffd27e');
  let water, flow = V3();
  function makeSea() {
    const g = new THREE.PlaneGeometry(1, CARD_D, NX, NZ).rotateX(-Math.PI / 2);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    const ripples = kit.canvasTexture(512, 512, (c, w, h) => {
      const r = seeded(13);
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 700; i++) {                                 // short bright and dark dashes across the flow
        const x = r() * w, y = r() * h, len = 8 + 30 * r(), k = r();
        c.strokeStyle = k < .55 ? `rgba(255,255,255,${.5 + .5 * r()})` : `rgba(30,60,90,${.12 + .15 * r()})`; c.lineWidth = 1.5 + 2.5 * r(); c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - len / 2, y); c.quadraticCurveTo(x, y - 3, x + len / 2, y); c.stroke();
        if (x + len > w) { c.beginPath(); c.moveTo(x - len / 2 - w, y); c.quadraticCurveTo(x - w, y - 3, x + len / 2 - w, y); c.stroke(); }
      }
    });
    ripples.wrapS = ripples.wrapT = THREE.RepeatWrapping; ripples.repeat.set(2.4, 1.5);
    water = new THREE.Mesh(geo(g), kit.keep(new THREE.MeshStandardMaterial({ vertexColors: true, map: ripples, roughness: .78, metalness: 0,
      envMap: kit.env, envMapIntensity: .12, transparent: true })));
    water.receiveShadow = true; water.renderOrder = 1; stage.add(water);
    flow.set(-Math.sin(SHIP.yaw), 0, -Math.cos(SHIP.yaw));            // the water runs past the ship, bow to stern
    return water;
  }
  const cW = new THREE.Color();
  /** the swells (by T), the sun's path; `on` (0..1) brings the sea in at the start; night dims the glitter */
  function poseSea(T, on, night) {
    const p = water.geometry.attributes.position, col = water.geometry.attributes.color;
    const fx = flow.x, fz = flow.z, calm = on * on;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), along = -(x * fx + z * fz), across = x * fz - z * fx;
      const y = WATER + calm * (.0028 * Math.sin(26 * along + 2.4 * T + 1.3 * Math.sin(9 * across + .7 * T)) + .0014 * Math.sin(41 * along - 17 * across + 3.6 * T)
        + .0008 * Math.sin(29 * along + 23 * across - 2.9 * T) + .0006 * Math.sin(83 * across + 5 * along + 1.7 * T));   // its troughs stay above the card
      p.setY(i, y);
      const k = (z + CARD_D / 2) / CARD_D;                             // 0 far, 1 near
      cW.copy(FAR).lerp(NEAR, k).lerp(TEAL, clamp((y - WATER - .002) * 120) * .5);
      const path = Math.exp(-(((x - SUN.x * (1 - .35 * k)) / (.04 + .1 * k)) ** 2)) * (.55 + .45 * Math.sin(T * 3.3 + z * 70 + x * 40)) * (1 - .55 * night);
      cW.lerp(GLIT, .62 * path * (1 - .4 * k));
      col.setXYZ(i, cW.r, cW.g, cW.b);
    }
    p.needsUpdate = col.needsUpdate = true; water.geometry.computeVertexNormals();
    water.material.map.offset.set(-T * .055 * fx * 2.4, T * .055 * fz * 1.5);
    water.material.opacity = on;
  }

  /* ── foam: a lace that runs along ribbons at the waterline (the bow wave, the hull's skirt, a short wake) ── */
  const lace = kit.canvasTexture(256, 64, (c, w, h) => {
    const r = seeded(9);
    for (let i = 0; i < 1100; i++) {
      const v = Math.pow(r(), .6), y = (1 - v) * h * .95, a = (.2 + .8 * v) * (r() < .8 ? 1 : .4);
      c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.arc(r() * w, y, 1 + 3.2 * r() * v, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,.95)'; c.fillRect(0, h * .02, w, h * .1);
  });
  lace.wrapS = THREE.RepeatWrapping;
  /** a ribbon of foam along points (x, z) in the ship's frame, `width` out to the side `side` (+1: left of the way) */
  function ribbon(pts, width, side, repeat) {
    const n = pts.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
    let len = 0;
    pts.forEach(([x, z, w0 = 1], i) => {
      const [nx, nz] = pts[Math.min(n - 1, i + 1)], [px, pz] = pts[Math.max(0, i - 1)], dx = nx - px, dz = nz - pz, l = Math.hypot(dx, dz) || 1;
      if (i) len += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);
      const ox = -dz / l * side * width * w0, oz = dx / l * side * width * w0;
      pos.set([x, FOAM + .0004, z, x + ox, FOAM, z + oz], i * 6); uv.set([len * repeat, 0, len * repeat, 1], i * 4);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const g = new THREE.BufferGeometry(); g.setIndex(idx);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo(g);
  }
  /** the foam round the ship, at the water's level (it does not rock with the hull): { root, mats } */
  function makeFoam() {
    const root = new THREE.Group(), mats = [];
    const add = (pts, width, side, repeat, opacity) => {
      const t = kit.keep(lace.clone()); t.needsUpdate = true;
      const m = kit.keep(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity, side: THREE.DoubleSide }));
      const o = new THREE.Mesh(ribbon(pts, width, side, repeat), m); o.renderOrder = 2; root.add(o); mats.push(m);
    };
    for (const s of [1, -1]) {
      const hull = []; for (let z = SHIP.bow - .004; z >= SHIP.stern; z -= .02) hull.push([s * (halfWidth(z) * .93 + .003), z]);
      add(hull, .016, s, 9, .9);                                       // the skirt along the hull
      const bow = []; for (let k = 0; k <= 12; k++) { const t = k / 12; bow.push([s * (.004 + t * .2), SHIP.bow - .01 - t * .34, 1 + 1.6 * t]); }
      add(bow, .014, s, 7, .95);                                       // the bow wave, spreading
      const wake = []; for (let k = 0; k <= 6; k++) { const t = k / 6; wake.push([s * (halfWidth(SHIP.stern) * .8 + t * .03), SHIP.stern - t * .05, 1 + t]); }
      add(wake, .012, -s, 8, .8);
    }
    return { root, mats };
  }
  function poseFoam(foam, T, on) {
    foam.mats.forEach((m, i) => { m.map.offset.x = T * (i % 3 === 1 ? .9 : .6); m.opacity = on * (i % 3 === 2 ? .7 : .9) * (.85 + .15 * Math.sin(T * 3 + i)); });
  }

  /* ── the ship: hull, deck, rail and caprail, the bow step, a mast with flag, lantern and bunting, the cabin and wheel ── */
  /** the outline at deck level: from the bow along the left side (+x) to the stern, across, and back up the right */
  function outline(n = 26) {
    const left = [];
    for (let i = 0; i <= n; i++) { const z = lerp(SHIP.bow, SHIP.stern, i / n); left.push([halfWidth(z), z]); }
    left[0][0] = 0;
    const right = left.slice(1).reverse().map(([x, z]) => [-x, z]);
    return [...left, [0, SHIP.stern - .004], ...right];
  }
  function paintHull(c, W, H, sideU) {
    c.fillStyle = '#fbf5e8'; c.fillRect(0, 0, W, H);                  // cream topsides
    c.fillStyle = '#c4383c'; c.fillRect(0, H * .56, W, H * .44);        // the red bottom, its top just above the water
    c.fillStyle = '#fffaf0'; c.fillRect(0, H * .52, W, H * .05);        // a white boot stripe
    c.fillStyle = '#1f7f8c'; c.fillRect(0, 0, W, H * .16);              // a teal sheer stripe under the caprail
    c.fillStyle = '#e9b949'; c.fillRect(0, H * .16, W, H * .035);       // and a gold line
    for (const [u0, u1, dir] of sideU) {                               // each side: portholes, the name by the bow, a heart
      for (const k of [.36, .5, .64]) {
        const x = lerp(u0, u1, k) * W, y = H * .38, rr = H * .11;
        c.fillStyle = '#d9a441'; c.beginPath(); c.arc(x, y, rr * 1.35, 0, TAU); c.fill();
        c.fillStyle = '#21406b'; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(x - rr * .35, y - rr * .35, rr * .3, 0, TAU); c.fill();
      }
      const nx = lerp(u0, u1, dir > 0 ? .17 : .83) * W;
      c.fillStyle = '#1f4e79'; c.font = `700 ${H * .3}px ${kit.HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('Lộng Gió', nx, H * .4);
      c.fillStyle = '#e8436d'; kit.heartPath(c, nx + dir * H * .62, H * .38, H * .2); c.fill();
    }
  }
  function makeHull(root) {
    const pts = outline(), n = pts.length, bottom = -.016, top = D + .006;
    const lens = [0]; for (let i = 1; i < n; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = lens[n - 1] + Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][1] - pts[n - 1][1]);
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const [x, z] = pts[i % n], u = (i < n ? lens[i] : total) / total, bowK = clamp((z - .1) / (SHIP.bow - .1));
      pos.push(x * .8, bottom, z - .045 * bowK - .01, x, top, z); uv.push(u, 0, u, 1);   // the stem rakes back below the water
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry(); g.setIndex(idx);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const sternU = lens[n / 2 | 0] / total;
    const paint = kit.canvasTexture(2048, 128, (c, w, h) => paintHull(c, w, h, [[0, sternU, 1], [sternU + .03, 1, -1]]));
    const hull = new THREE.Mesh(geo(g), mat(0xffffff, { map: paint, roughness: .45, side: THREE.DoubleSide }));
    hull.castShadow = true; root.add(hull);
    const shape = new THREE.Shape(); pts.forEach(([x, z], i) => shape[i ? 'lineTo' : 'moveTo'](x * .985, -z));
    const planks = kit.canvasTexture(256, 512, (c, w, h) => {
      const r = seeded(21);
      for (let x = 0, i = 0; x < w; x += 32, i++) {                    // planks along the ship, their butts staggered
        c.fillStyle = ['#d9a066', '#cf955c', '#e0aa70', '#c98d55'][i % 4]; c.fillRect(x, 0, 32, h);
        for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(120,70,30,${.06 + .08 * r()})`; c.fillRect(x + r() * 30, r() * h, 1, 8 + r() * 30); }
        c.fillStyle = '#6b4226'; c.fillRect(x, 0, 2, h);
        for (let y = (i * 97) % 160; y < h; y += 160) { c.fillRect(x, y, 32, 2); c.fillStyle = '#3d2615'; c.fillRect(x + 6, y + 6, 2.5, 2.5); c.fillRect(x + 24, y + 6, 2.5, 2.5); c.fillStyle = '#6b4226'; }
      }
    });
    planks.wrapS = planks.wrapT = THREE.RepeatWrapping; planks.repeat.set(5, 2.5); planks.rotation = Math.PI / 2;
    const deck = new THREE.Mesh(geo(new THREE.ShapeGeometry(shape, 24).rotateX(-Math.PI / 2)), mat(0xffffff, { map: planks, roughness: .8 }));
    deck.position.y = D; deck.receiveShadow = true; root.add(deck);
    const cap = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V3(x, top, z)), true, 'catmullrom', .2);
    root.add(mesh(new THREE.TubeGeometry(cap, 120, .0042, 6, true), mat('#a8683a', { roughness: .5 })));
  }
  /** the rail round the fore part: white posts, a top rail and a middle one meeting at the bow */
  function makeRail(root) {
    const white = mat('#fbfbf6', { roughness: .35, metalness: .2 }), H = SHIP.rail ?? .072, side = [];   // the story raises it to the grown-ups' waists
    for (let z = SHIP.railEnd; z < SHIP.bow - .05; z += .042) side.push([halfWidth(z) - .006, z]);
    const posts = [...side.map(([x, z]) => [-x, z]), [0, SHIP.bow - .018], ...side.slice().reverse()];   // right side forward, the tip, left side aft
    const post = geo(new THREE.CylinderGeometry(.0028, .0032, H, 6));
    for (const [x, z] of posts) { const p = new THREE.Mesh(post, white); p.position.set(x, D + H / 2, z); p.castShadow = true; root.add(p); }
    for (const y of [H, H * .5]) {
      const curve = new THREE.CatmullRomCurve3(posts.map(([x, z]) => V3(x, D + y, z)), false, 'catmullrom', .3);
      root.add(mesh(new THREE.TubeGeometry(curve, 90, y === H ? .0036 : .0026, 6), white));
    }
  }
  /** a little lantern: brass frame, amber glass, a flame that lights; hangs from its top */
  function makeLantern() {
    const g = new THREE.Group(), brass = mat('#c9933a', { roughness: .35, metalness: .7, envMap: kit.env });
    g.add(mesh(new THREE.TorusGeometry(.0045, .0011, 6, 12), brass, 0, -.002, 0));
    g.add(mesh(new THREE.ConeGeometry(.012, .009, 6), brass, 0, -.009, 0));
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + TAU / 8; g.add(mesh(new THREE.CylinderGeometry(.0009, .0009, .022, 4), brass, Math.cos(a) * .0085, -.025, Math.sin(a) * .0085)); }
    g.add(mesh(new THREE.CylinderGeometry(.0105, .009, .004, 6), brass, 0, -.038, 0));
    const glass = new THREE.Mesh(geo(new THREE.CylinderGeometry(.0082, .0082, .02, 6)), kit.keep(new THREE.MeshStandardMaterial({ color: 0xffd9a0,
      transparent: true, opacity: .45, roughness: .1, emissive: 0xffb04a, emissiveIntensity: 0 })));
    glass.position.y = -.025; g.add(glass);
    const flame = new THREE.Mesh(geo(new THREE.SphereGeometry(.0042, 10, 8).scale(1, 1.5, 1)), kit.keep(new THREE.MeshBasicMaterial({ color: 0x5a4a3a })));
    flame.position.y = -.026; g.add(flame);
    return { root: g, glass, flame };
  }
  /** the flag at the masthead: a swallowtail with a heart, its points rippling back in the wind */
  function makeFlag() {
    const tex = kit.canvasTexture(256, 160, (c, w, h) => {
      c.fillStyle = '#e8434f'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w * .78, h / 2); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill();
      c.fillStyle = '#fff6e6'; kit.heartPath(c, w * .34, h * .52, h * .6); c.fill();
      c.fillStyle = '#ffd34d'; c.fillRect(0, 0, w * .06, h);
    });
    const g = new THREE.PlaneGeometry(.09, .055, 10, 3).translate(.045, 0, 0);
    const flag = new THREE.Mesh(geo(g), mat(0xffffff, { map: tex, side: THREE.DoubleSide, alphaTest: .5, roughness: .8 }));
    flag.castShadow = true; flag.userData.base = Float32Array.from(g.attributes.position.array);
    return flag;
  }
  /** a cloth's waves by T: points further from its hoist move more; `amp` how hard the wind blows */
  function ripple(cloth, T, amp, ph = 0) {
    const p = cloth.geometry.attributes.position, b = cloth.userData.base, len = cloth.userData.len || .09;
    for (let i = 0; i < p.count; i++) {
      const x = b[i * 3], s = x / len;
      p.setZ(i, b[i * 3 + 2] + amp * s * (.012 * Math.sin(T * 11 + ph - s * 5) + .004 * Math.sin(T * 17 + ph - s * 9 + b[i * 3 + 1] * 40)));
    }
    p.needsUpdate = true; cloth.geometry.computeVertexNormals();
  }
  /** the ship's wheel: a rim, eight spokes that end in handles, a hub, on a post from the deck (its hub `high` over it) */
  function makeWheel(high) {
    const g = new THREE.Group(), wood = mat('#a5622f', { roughness: .55 }), dark = mat('#6b3b1c', { roughness: .6 }), brass = mat('#d9a441', { roughness: .3, metalness: .7 });
    const spin = new THREE.Group(); g.add(spin);
    spin.add(mesh(new THREE.TorusGeometry(.036, .0035, 6, 28), wood));
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8, s = mesh(new THREE.CylinderGeometry(.0018, .0018, .088, 5), wood); s.rotation.z = a; spin.add(s);
      const k = mesh(new THREE.SphereGeometry(.0035, 6, 5), dark, Math.cos(a + Math.PI / 2) * .046, Math.sin(a + Math.PI / 2) * .046, 0); spin.add(k);
    }
    spin.add(mesh(new THREE.CylinderGeometry(.008, .008, .012, 10).rotateX(Math.PI / 2), brass));
    const post = mesh(new THREE.CylinderGeometry(.006, .009, high, 8), dark, 0, -high / 2, -.008); g.add(post);
    return { root: g, spin };
  }
  /** a lifebuoy: red and white quarters, a grab line round it */
  function makeBuoy() {
    const tex = kit.canvasTexture(256, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff8ee' : '#e23b3b'; c.fillRect(i * w / 8, 0, w / 8 + 1, h); } });
    const g = new THREE.Group();
    g.add(mesh(new THREE.TorusGeometry(.024, .0075, 10, 32), mat(0xffffff, { map: tex, roughness: .5 })));
    g.add(mesh(new THREE.TorusGeometry(.0315, .0009, 4, 40), mat('#efe2c4', { roughness: .9 })));
    return g;
  }
  /** a small anchor hanging on the bow's side */
  function makeAnchor() {
    const g = new THREE.Group(), iron = mat('#33363d', { roughness: .4, metalness: .6 });
    g.add(mesh(new THREE.CylinderGeometry(.0018, .0018, .036, 6), iron, 0, -.018, 0));
    g.add(mesh(new THREE.CylinderGeometry(.0014, .0014, .022, 6).rotateZ(Math.PI / 2), iron, 0, -.006, 0));
    g.add(mesh(new THREE.TorusGeometry(.004, .0013, 5, 10), iron, 0, .002, 0));
    const arms = mesh(new THREE.TorusGeometry(.014, .0019, 5, 14, Math.PI), iron, 0, -.022, 0); arms.rotation.z = Math.PI; g.add(arms);
    for (const s of [-1, 1]) { const f = mesh(new THREE.ConeGeometry(.0034, .007, 4), iron, s * .014, -.02, 0); f.rotation.z = s * .5; g.add(f); }
    return g;
  }
  /** the cabin at the stern: cream walls, a teal roof, round windows that light at dusk, a door to the deck */
  function makeCabin(root) {
    const C = SHIP.cabin, w = C.w * 2, d = C.z1 - C.z0, h = C.h, g = new THREE.Group(); g.position.set(0, D, (C.z0 + C.z1) / 2); root.add(g);
    const walls = mesh(new THREE.BoxGeometry(w, h, d), mat('#fbf3e3', { roughness: .6 }), 0, h / 2, 0); walls.receiveShadow = true; g.add(walls);
    const roof = mesh(new THREE.BoxGeometry(w + .016, .012, d + .016), mat('#1f8a8f', { roughness: .5 }), 0, h + .006, 0); g.add(roof);
    g.add(mesh(new THREE.BoxGeometry(w + .02, .004, d + .02), mat('#a8683a'), 0, h + .0005, 0));
    const dh = C.door ?? .062, door = mesh(new THREE.BoxGeometry(.034, dh, .004), mat('#2b6f8f', { roughness: .5 }), .02, dh / 2, d / 2 + .002); g.add(door);
    g.add(mesh(new THREE.SphereGeometry(.003, 6, 5), mat('#e9b949', { metalness: .7, roughness: .3 }), .03, dh * .48, d / 2 + .005));
    const glow = kit.keep(new THREE.MeshStandardMaterial({ color: 0x2a4a7a, roughness: .15, emissive: 0xffc067, emissiveIntensity: 0 }));
    const brass = mat('#d9a441', { metalness: .7, roughness: .3 }), windows = [];
    for (const [x, z, ry] of [[w / 2 + .002, -d * .22, Math.PI / 2], [w / 2 + .002, d * .22, Math.PI / 2], [-w / 2 - .002, 0, -Math.PI / 2], [-.022, d / 2 + .002, 0]]) {
      const pane = new THREE.Mesh(geo(new THREE.CircleGeometry(.0095, 16)), glow); pane.position.set(x, h * .58, z); pane.rotation.y = ry; g.add(pane);
      const ring = mesh(new THREE.TorusGeometry(.0105, .0022, 6, 18), brass, x, h * .58, z); ring.rotation.y = ry; g.add(ring);
      windows.push(pane);
    }
    const staff = mesh(new THREE.CylinderGeometry(.0022, .0026, SHIP.staff, 6), mat('#a8683a'), 0, h + SHIP.staff / 2, -d / 2 + .01); g.add(staff);
    return { root: g, glow, top: V3(0, D + h + SHIP.staff, C.z0 + .01) };
  }
  /** a coil of rope lying on the deck */
  function makeCoil() {
    const pts = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * TAU * 3.2, r = .007 + .0045 * a / TAU; pts.push(V3(Math.cos(a) * r, .0025 + .0006 * Math.sin(a * 3), Math.sin(a) * r)); }
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, .0024, 5), mat('#e3cc98', { roughness: .95 }));
  }
  /** a line of bunting from the masthead to the stern staff: little flags of every colour that flutter (by T) */
  function makeBunting(from, to) {
    const g = new THREE.Group(), flags = [], cols = ['#e8434f', '#ffd34d', '#2aa198', '#fff6e6', '#ff8a5c', '#5b8def'];
    const at = t => V3().lerpVectors(from, to, t).add(V3(0, -.05 * Math.sin(Math.PI * t), 0));   // it sags a little
    const pts = Array.from({ length: 17 }, (_, i) => at(i / 16));
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .0009, 4), mat('#f1e4c4', { roughness: .9 })));
    const tri = new THREE.BufferGeometry().setFromPoints([V3(-.012, 0, 0), V3(.012, 0, 0), V3(0, -.03, 0)]); tri.computeVertexNormals(); geo(tri);
    for (let i = 1; i < 10; i++) {
      const f = new THREE.Mesh(tri, mat(cols[i % cols.length], { side: THREE.DoubleSide, roughness: .8 })); f.position.copy(at(i / 10)); f.castShadow = true; g.add(f); flags.push(f);
    }
    return { root: g, flags, at };
  }
  /** the whole ship: { root (it rocks), flat (at the water: the foam), mast top, lantern, flag, bunting, wheel, cabin, step } */
  function makeShip() {
    const flat = new THREE.Group(), root = new THREE.Group(), base = new THREE.Group();
    base.position.set(SHIP.x, 0, SHIP.z); base.rotation.y = SHIP.yaw; flat.position.copy(base.position); flat.rotation.y = SHIP.yaw;
    base.add(root); stage.add(base, flat);
    makeHull(root); makeRail(root);
    const St = SHIP.step, step = new THREE.Group(); step.position.set(0, D, St.z); root.add(step);
    step.add(mesh(new THREE.BoxGeometry(St.w, St.h - .004, St.d), mat('#8a5434', { roughness: .7 }), 0, (St.h - .004) / 2, 0));
    step.add(mesh(new THREE.BoxGeometry(St.w + .006, .005, St.d + .006), mat('#c98d55', { roughness: .6 }), 0, St.h - .0025, 0));
    const top = D + SHIP.mastH, mast = new THREE.Group(); mast.position.set(0, 0, SHIP.mastZ); root.add(mast);
    mast.add(mesh(new THREE.CylinderGeometry(.0048, .0078, SHIP.mastH, 10), mat('#b77a45', { roughness: .45 }), 0, D + SHIP.mastH / 2, 0));
    mast.add(mesh(new THREE.SphereGeometry(.0085, 10, 8), mat('#e9b949', { metalness: .7, roughness: .3 }), 0, top + .006, 0));
    for (const y of [D + .12, D + .26]) mast.add(mesh(new THREE.TorusGeometry(.0085, .0016, 5, 14).rotateX(Math.PI / 2), mat('#d9a441', { metalness: .6, roughness: .35 }), 0, y, 0));
    const flag = makeFlag(); flag.position.set(0, top - .03, 0); flag.rotation.y = Math.PI / 2; mast.add(flag);   // its hoist on the mast, streaming aft
    const arm = mesh(new THREE.BoxGeometry(.003, .003, .03), mat('#6b3b1c'), 0, SHIP.lanternY, .016); mast.add(arm);
    const lantern = makeLantern(); lantern.root.position.set(0, SHIP.lanternY - .002, .03); mast.add(lantern.root);
    const cabin = makeCabin(root);
    const wheel = makeWheel(SHIP.wheelH ?? .12); wheel.root.position.set(0, D + (SHIP.wheelH ?? .12), SHIP.wheelZ); root.add(wheel.root);
    const buoy = makeBuoy(); buoy.position.set(halfWidth(.07) + .004, D + .035, .07); buoy.rotation.y = Math.PI / 2 + .12; root.add(buoy);
    const anchor = makeAnchor(); anchor.position.set(halfWidth(.2) + .002, D - .006, .2); anchor.rotation.y = Math.PI / 2 - .5; root.add(anchor);
    const coil = makeCoil(); coil.position.set(-.07, D, -.03); root.add(coil);
    const bunting = makeBunting(V3(0, top - .006, SHIP.mastZ), cabin.top); root.add(bunting.root);
    const foam = makeFoam(); flat.add(foam.root);
    return { base, root, flat, foam, mast, flag, lantern, cabin, wheel, bunting, step, buoy, top };
  }

  /* ── the wind: thin streaks that run past the ship and curl, each on its own loop (by T) ── */
  function makeWind(paths) {
    const streak = kit.canvasTexture(256, 8, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.56, 'rgba(255,255,255,0)');
      g.addColorStop(.68, 'rgba(255,255,255,.75)'); g.addColorStop(.72, 'rgba(255,255,255,1)'); g.addColorStop(.75, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    return paths.map(pts => {
      const t = kit.keep(streak.clone()); t.needsUpdate = true; t.wrapS = THREE.ClampToEdgeWrapping;
      const m = kit.keep(new THREE.MeshBasicMaterial({ map: t, color: 0xfff4dc, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending }));
      const o = new THREE.Mesh(geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p))), 64, .0026, 4)), m);
      o.renderOrder = 6; o.frustumCulled = false; stage.add(o);
      return { o, m, t };
    });
  }
  /** each streak sweeps along its path once every `every` s; `strength` (0..1) how many blow */
  function poseWind(wind, T, strength, every = 2.6) {
    wind.forEach((w, i) => {
      const k = ((T + i * every / wind.length * 1.7) % every) / every, on = i / wind.length < strength;
      w.t.offset.x = .75 - k * 1.5;                                    // the bright head runs from the start of the path to its end
      w.m.opacity = on ? .85 * Math.sin(Math.PI * clamp(k * 1.25)) : 0;
    });
  }

  return { seeded, V3, mat, geo, mesh, halfWidth, pageZ, WATER, makePage, makeSea, poseSea, poseFoam, makeShip, ripple, makeWind, poseWind };
};
