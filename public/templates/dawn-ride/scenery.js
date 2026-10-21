/* Đạp xe đón bình minh: the world, built in code for story.js (template.json "story" loads this file first). A page at
   the back paints the sky three times over (night, the first light, sunrise) with far mountains, the sun and its rays,
   and a sleeping city in mist that rises at the top of the hill; a street of sleeping houses stands in front of it at
   night. On the card: her house front (a window that lights, a door that opens), the cobbled street and its lamp, and a
   terraced hill that pops up out of the card with a road winding up it: ramp A along the front to a bend, ramp B back
   along the next step to the top, where a rail looks out over the city.
     NM_DAWN.scenery(kit) → { LAYOUT, ground(x, z), rise(k), build…(), pose…() }
   ground(x, z) is the height to stand on at (x, z), as far as the hill has risen (rise() sets how far each piece is up). */
(window.NM_DAWN = window.NM_DAWN || {}).scenery = kit => {
  const { THREE, stage, clamp, lerp } = kit;
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .8, ...o }));
  const geo = g => kit.keep(g);
  const mesh = (g, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo(g), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent && parent.add(o); return o; };
  const ramp = (c, x, y, w, h, stops) => { const g = c.createLinearGradient(0, y, 0, y + h); stops.forEach(([k, col]) => g.addColorStop(k, col)); c.fillStyle = g; c.fillRect(x, y, w, h); };

  /* ── where things are ── */
  const PAGE = { width: 1.14, height: 1.02, curve: .1, z: -.3 };
  const T1 = .05, T2 = .105;                                         // the two steps of the hill
  const LAYOUT = {
    PAGE, T1, T2,
    HOUSE: { x: -.25, z: -.13, w: .4, h: .6, d: .08 },               // her house front, its door on the left, her window up on the right
    DOOR: { x: -.37, w: .11, h: .27 }, WINDOW: { x: -.165, y: .45 },
    LAMP: { x: -.455, z: .225 },
    STREET: .1,                                                      // the street is in front of z = .1 once the hill is up
    A: { x0: -.005, x1: .33, z0: .1, z1: .19 },                      // ramp A climbs to the right along the first step's front
    BEND: { x0: .33, z1: .2 },                                       // the first step reaches out to the front there: the bend
    B: { x0: .33, x1: -.125, z0: -.08, z1: .07 },                    // ramp B climbs to the left along the second step's front
    TOP: { z: -.08, xl: -.125, zl: .07 },                            // the second step: behind z = -.08, and a landing out to zl on the left
    RAIL: -.268,
    SUN: { x: .04, r: .062 }, HORIZON: .33
  };
  const { A, B, BEND, TOP } = LAYOUT;
  const up = { t1: 0, t2: 0, a: 0, b: 0 };                           // how far each piece of the hill has risen (0..1)
  const inT1 = (x, z) => z < LAYOUT.STREET || (x > BEND.x0 && z < BEND.z1);
  const inT2 = (x, z) => z < TOP.z || (x < TOP.xl && z < TOP.zl);
  /** the height to stand on at (x, z) */
  function ground(x, z) {
    let h = 0;
    if (inT1(x, z)) h = Math.max(h, T1 * up.t1);
    if (inT2(x, z)) h = Math.max(h, T2 * up.t2);
    if (z >= A.z0 && z <= A.z1 && x > A.x0 && x < A.x1) h = Math.max(h, T1 * clamp((x - A.x0) / (A.x1 - A.x0)) * up.a);
    if (z >= B.z0 && z <= B.z1 && x < B.x0 && x > B.x1) h = Math.max(h, lerp(T1, T2, clamp((B.x0 - x) / (B.x0 - B.x1))) * up.b);
    return h;
  }

  /* ── the page at the back: three skies, far mountains, the sun and its rays, the city in mist, the sleeping street ── */
  const PX = 1024 / PAGE.width;
  const pageX = x => (x + PAGE.width / 2) * PX, pageY = (y, h) => h - y * PX;
  const SKIES = {
    night: [[0, '#070b2b'], [.35, '#121a4c'], [.7, '#24306e'], [.92, '#3d4689'], [1, '#56599a']],
    dawn: [[0, '#1d2463'], [.3, '#4a4796'], [.58, '#a46ea8'], [.8, '#f09aa4'], [.94, '#ffc4a0'], [1, '#ffe0b0']],
    sun: [[0, '#6f9fe0'], [.35, '#a9b8ec'], [.62, '#f6b9b9'], [.82, '#ffd39a'], [.95, '#fff0c4'], [1, '#fff8de']]
  };
  function paintSky(kind) {
    return (c, W, H) => {
      const r = seeded(kind.length * 17 + 3), hz = pageY(LAYOUT.HORIZON - .02, H);
      ramp(c, 0, 0, W, hz, SKIES[kind]); c.fillStyle = SKIES[kind][SKIES[kind].length - 1][1]; c.fillRect(0, hz, W, H - hz);
      const sx = pageX(LAYOUT.SUN.x);
      if (kind !== 'night') {                                        // the glow where the sun comes up
        const g = c.createRadialGradient(sx, hz, 0, sx, hz, W * (kind === 'sun' ? .55 : .42));
        g.addColorStop(0, kind === 'sun' ? 'rgba(255,248,214,1)' : 'rgba(255,214,170,.85)'); g.addColorStop(.35, kind === 'sun' ? 'rgba(255,222,150,.55)' : 'rgba(255,170,150,.35)');
        g.addColorStop(1, 'rgba(255,200,160,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      }
      const stars = kind === 'night' ? 230 : kind === 'dawn' ? 70 : 0;
      for (let i = 0; i < stars; i++) {                               // painted stars; the bright ones twinkle in front of the page
        const y = Math.pow(r(), 1.4) * hz * .9, a = (kind === 'night' ? .35 : .2) + r() * .5 * (1 - y / hz);
        c.fillStyle = `rgba(255,250,235,${a})`; c.beginPath(); c.arc(r() * W, y, .6 + r() * 1.5, 0, TAU); c.fill();
      }
      if (kind === 'night') {                                        // a faint milky band across the stars
        c.save(); c.translate(W * .5, hz * .45); c.rotate(-.35);
        for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(200,210,255,${.025 + r() * .04})`; c.beginPath(); c.ellipse((r() - .5) * W * 1.2, (r() + r() - 1) * 60, 10 + r() * 30, 4 + r() * 10, 0, 0, TAU); c.fill(); }
        c.restore();
      }
      const tint = { night: ['#2a3373', '#3a4386', '#1d255c'], dawn: ['#f4a3b4', '#ffc9b0', '#9c79b9'], sun: ['#fff4e2', '#ffd8c0', '#ffe9b8'] }[kind];
      c.globalAlpha = kind === 'night' ? .55 : .8;
      for (let i = 0; i < 9; i++) {                                  // long soft clouds lit from below
        const cx = r() * W, cy = hz * (.18 + r() * .62), w = W * (.08 + r() * .14), h = hz * (.018 + r() * .02);
        for (let k = 0; k < 4; k++) { c.fillStyle = tint[k % 3]; c.beginPath(); c.ellipse(cx + (r() - .5) * w * .8, cy + (k - 1.5) * h * .5, w * (.3 + r() * .3), h * (.6 + r() * .4), 0, 0, TAU); c.fill(); }
      }
      c.globalAlpha = 1;
    };
  }
  /** far mountains on the horizon (painted pale: the material's colour darkens them at night) */
  function paintMountains(c, W, H) {
    const r = seeded(29), hz = pageY(LAYOUT.HORIZON, H);
    for (const [base, top, col, rough, seed] of [[hz + 4, .1, '#b8b4dc', .5, 1], [hz + 10, .065, '#9d9acb', .8, 2], [hz + 18, .04, '#8682b8', 1, 3]]) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        const k = x / W, ridge = Math.sin(k * 7 + seed) * .5 + Math.sin(k * 17 + seed * 3) * .3 * rough + Math.sin(k * 41 + seed) * .1 * rough;
        c.lineTo(x, base - (top * .5 + top * .5 * ridge) * PX - r() * 1.5);
      }
      c.lineTo(W, H); c.fill();
    }
  }
  /** the city far below in the morning mist: roofs and towers seen from above, a river, a bridge; pale, tinted by light */
  function paintCity(lit) {
    return (c, W, H) => {
      const r = seeded(lit ? 61 : 61), hz = pageY(LAYOUT.HORIZON, H), foot = pageY(.08, H);
      if (!lit) {
        ramp(c, 0, hz + 14, W, foot - hz, [[0, 'rgba(206,214,240,0)'], [.12, 'rgba(206,214,240,.95)'], [1, '#c3c6e6']]);
        c.fillStyle = '#c3c6e6'; c.fillRect(0, foot, W, H - foot);
        c.strokeStyle = '#e9f1ff'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath();   // the river winding out of the mist
        c.moveTo(-20, hz + 60); c.bezierCurveTo(W * .25, hz + 40, W * .35, hz + 110, W * .55, hz + 90); c.bezierCurveTo(W * .75, hz + 70, W * .85, hz + 140, W + 20, hz + 130); c.stroke();
        c.strokeStyle = '#a9b1d9'; c.lineWidth = 3; c.beginPath(); c.moveTo(W * .44, hz + 70); c.lineTo(W * .5, hz + 120); c.stroke();   // a bridge across it
      }
      const rows = 7;
      for (let row = 0; row < rows; row++) {                          // rows of houses, smaller and paler further off
        const k = row / (rows - 1), y = lerp(hz + 22, foot + 30, k), s = lerp(.45, 1.25, k);
        for (let x = -10; x < W + 10;) {
          const w = (14 + r() * 22) * s, h = (10 + r() * 16) * s * (r() < .08 ? 3 : 1), tall = h > 30 * s;
          if (!lit) {
            const shade = lerp(205, 150, k) | 0, tone = r() < .5 ? 0 : 12;
            c.fillStyle = `rgb(${shade - 22 + tone},${shade - 18},${shade + 18})`; c.fillRect(x, y - h, w, h + 6 * s);
            c.fillStyle = `rgb(${shade - 52},${shade - 50},${shade - 6})`;                 // the roof: pitched or flat
            if (tall || r() < .35) c.fillRect(x - 1, y - h - 2 * s, w + 2, 3 * s);
            else { c.beginPath(); c.moveTo(x - 2, y - h); c.lineTo(x + w / 2, y - h - 7 * s); c.lineTo(x + w + 2, y - h); c.fill(); }
            c.fillStyle = 'rgba(80,80,130,.35)'; for (let wy = y - h + 4 * s; wy < y - 2 * s; wy += 6 * s) for (let wx = x + 3 * s; wx < x + w - 3 * s; wx += 5 * s) c.fillRect(wx, wy, 2 * s, 2.4 * s);
          } else if (r() < .3) {                                       // a few windows still lit from the night
            c.fillStyle = `rgba(255,${200 + r() * 40 | 0},120,${.6 + r() * .4})`; c.fillRect(x + w * r() * .7, y - h * (.3 + r() * .5), 2.6 * s, 2.6 * s);
          }
          x += w + (1 + r() * 4) * s;
        }
      }
      if (!lit) for (const [x, h] of [[.3, 90], [.72, 70]]) {          // two towers over the roofs
        const X = W * x, Y = foot - 30;
        c.fillStyle = '#9fa3d0'; c.fillRect(X - 7, Y - h, 14, h); c.fillRect(X - 13, Y - h * .62, 26, 9);
        c.fillStyle = '#8b8fc2'; c.beginPath(); c.moveTo(X - 7, Y - h); c.lineTo(X, Y - h - 22); c.lineTo(X + 7, Y - h); c.fill();
      }
    };
  }
  /** the sleeping street at night: house tops and roofs against the sky, all windows dark, wires across */
  function paintStreet(c, W, H) {
    const r = seeded(43), foot = H;
    let x = -20;
    while (x < W + 20) {
      const w = 90 + r() * 90, h = (130 + r() * 150), col = ['#283166', '#2d3770', '#232b5d', '#303a78'][(r() * 4) | 0];
      c.fillStyle = col; c.fillRect(x, foot - h, w, h);
      c.fillStyle = '#1a2150';
      if (r() < .55) { c.beginPath(); c.moveTo(x - 8, foot - h); c.lineTo(x + w / 2, foot - h - 34 - r() * 20); c.lineTo(x + w + 8, foot - h); c.fill(); }
      else c.fillRect(x - 4, foot - h - 8, w + 8, 10);
      if (r() < .5) { c.fillRect(x + w * .7, foot - h - 50, 14, 40); }                       // a chimney
      if (r() < .4) { c.strokeStyle = '#1a2150'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + w * .25, foot - h - 10); c.lineTo(x + w * .25, foot - h - 60);
        c.moveTo(x + w * .25 - 16, foot - h - 50); c.lineTo(x + w * .25 + 16, foot - h - 50); c.moveTo(x + w * .25 - 10, foot - h - 40); c.lineTo(x + w * .25 + 10, foot - h - 40); c.stroke(); }
      for (let wy = foot - h + 22; wy < foot - 40; wy += 46) for (let wx = x + 14; wx < x + w - 30; wx += 40) {
        c.fillStyle = '#151b45'; c.fillRect(wx, wy, 22, 26); c.strokeStyle = '#3a4486'; c.lineWidth = 2; c.strokeRect(wx, wy, 22, 26);
      }
      x += w + 4;
    }
    c.strokeStyle = 'rgba(16,20,60,.9)'; c.lineWidth = 2;                                 // wires sagging from pole to pole
    for (const [y0, y1, sag] of [[foot - 330, foot - 300, 40], [foot - 318, foot - 288, 34]]) { c.beginPath(); c.moveTo(0, y0); c.quadraticCurveTo(W / 2, (y0 + y1) / 2 + sag, W, y1); c.stroke(); }
  }
  function buildPage() {
    const o = { width: PAGE.width, height: PAGE.height, curve: PAGE.curve, z: 0 };
    const root = new THREE.Group(); root.position.z = PAGE.z;
    const skies = ['night', 'dawn', 'sun'].map((k, i) => kit.backdrop(paintSky(k), { ...o, order: -9 + i }));
    skies.forEach((s, i) => { s.position.z = i * .001; if (i) s.material.opacity = 0; });
    const back = new THREE.Mesh(skies[0].geometry, mat(0xf3e6cf, { roughness: 1, side: THREE.BackSide })); back.position.z = -.002;
    const disc = kit.canvasTexture(256, 256, (c, w) => {
      const s = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      s.addColorStop(0, '#fffdf0'); s.addColorStop(.5, '#ffefa8'); s.addColorStop(.8, '#ffc65e'); s.addColorStop(.96, '#ffae4a'); s.addColorStop(1, 'rgba(255,170,70,0)');
      c.fillStyle = s; c.fillRect(0, 0, w, w);
    });
    const sun = new THREE.Mesh(geo(new THREE.PlaneGeometry(LAYOUT.SUN.r * 2, LAYOUT.SUN.r * 2)), kit.keep(new THREE.MeshBasicMaterial({ map: disc, transparent: true, toneMapped: false, depthWrite: false })));
    sun.renderOrder = -6; sun.position.set(LAYOUT.SUN.x, .2, .004);
    const fan = kit.canvasTexture(512, 512, (c, w) => {               // sunbeams: soft wedges round the middle
      c.translate(w / 2, w / 2);
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU + (i % 3) * .05, wd = i % 2 ? .05 : .09, g = c.createRadialGradient(0, 0, 20, 0, 0, w / 2);
        g.addColorStop(0, 'rgba(255,236,190,.55)'); g.addColorStop(.45, 'rgba(255,214,150,.18)'); g.addColorStop(1, 'rgba(255,210,140,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, w / 2, a - wd, a + wd); c.closePath(); c.fill();
      }
    });
    const rays = new THREE.Mesh(geo(new THREE.PlaneGeometry(.95, .95)), kit.keep(new THREE.MeshBasicMaterial({ map: fan, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false })));
    rays.renderOrder = -5.5; rays.position.set(LAYOUT.SUN.x, .3, .005);
    const glow = kit.glow({ color: 0xffd9a0, size: .5, opacity: 0 }); glow.position.set(LAYOUT.SUN.x, .3, .006); glow.renderOrder = -5.4;
    const hills = kit.backdrop(paintMountains, { ...o, order: -5, alphaTest: .5 }); hills.position.z = .008;
    const city = kit.backdrop(paintCity(false), { ...o, order: -4, alphaTest: .5 }); city.position.z = .012;
    const lights = kit.backdrop(paintCity(true), { ...o, order: -3.9 }); lights.position.z = .013;
    Object.assign(lights.material, { blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
    const street = kit.backdrop(paintStreet, { ...o, height: .62, order: -3, alphaTest: .5 }); street.position.z = .03;
    root.add(back, ...skies, sun, rays, glow, hills, city, lights, street);
    /* mist: soft bands that drift over the city */
    const fog = kit.canvasTexture(512, 64, (c, w, h) => {
      const r = seeded(7);
      for (let i = 0; i < 46; i++) { const x = r() * w, y = h * (.35 + r() * .3), s = 20 + r() * 50, g = c.createRadialGradient(x, y, 0, x, y, s);
        g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x - s, y - s, s * 2, s * 2); }
    });
    fog.wrapS = THREE.RepeatWrapping;
    const mist = [[.2, .07, .03], [.14, .09, .045], [.26, .05, .02]].map(([y, h, dz], i) => {
      const t = kit.keep(fog.clone()); t.wrapS = THREE.RepeatWrapping; t.repeat.set(1.5 + i * .4, 1); t.needsUpdate = true;
      const m = new THREE.Mesh(geo(new THREE.PlaneGeometry(PAGE.width * .98, h)), kit.keep(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, color: 0xf4eeff })));
      m.position.set(0, y, dz); m.renderOrder = -2.5 + i * .1; root.add(m); return m;
    });
    return { root, skies, sun, rays, glow, hills, city, lights, street, mist };
  }

  /* ── her house front: plaster, a door on the left, her window up on the right with curtains and geraniums ── */
  function facade(lit) {
    return (c, W, H) => {
      const r = seeded(5), { HOUSE, DOOR, WINDOW } = LAYOUT;
      const X = x => (x - HOUSE.x + HOUSE.w / 2) / HOUSE.w * W, Y = y => H - y / HOUSE.h * H;
      if (lit) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
      else {
        ramp(c, 0, 0, W, H, [[0, '#f3e3c6'], [1, '#e7cfaa']]);
        for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(140,90,60,${.03 + r() * .05})`; c.beginPath(); c.ellipse(r() * W, r() * H, 6 + r() * 16, 3 + r() * 6, 0, 0, TAU); c.fill(); }
        c.fillStyle = '#c99a72'; c.fillRect(0, Y(.33), W, 8);                             // a band between the floors
        c.fillStyle = '#a07a5c'; c.fillRect(0, H - 22, W, 22);                            // the plinth
        c.strokeStyle = 'rgba(90,60,40,.3)'; c.lineWidth = 2; for (let x = 0; x < W; x += 34) { c.beginPath(); c.moveTo(x, H - 22); c.lineTo(x, H); c.stroke(); }
        c.fillStyle = '#8f9aa6'; c.fillRect(W - 26, 20, 10, H - 40);                       // a drainpipe
        c.fillStyle = '#dfe3e6'; c.fillRect(X(-.29) - 30, Y(.3) - 18, 60, 30);             // an air conditioner under the band
        c.strokeStyle = '#9aa2aa'; c.lineWidth = 2; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(X(-.29) - 26, Y(.3) - 12 + k * 4); c.lineTo(X(-.29) + 26, Y(.3) - 12 + k * 4); c.stroke(); }
      }
      const win = (x, y, w, h, mine) => {                            // a window: frame, panes, curtains, a box of geraniums
        const L = X(x) - w / 2, T = Y(y) - h / 2;
        if (lit) { if (mine) { const g = c.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), w); g.addColorStop(0, '#fff2c8'); g.addColorStop(1, '#ffc46a'); c.fillStyle = g; c.fillRect(L, T, w, h); } return; }
        c.fillStyle = mine ? '#4a3b6a' : '#2f3550'; c.fillRect(L, T, w, h);
        c.fillStyle = mine ? '#f29bb3' : '#8d93b8';                    // curtains drawn
        c.beginPath(); c.moveTo(L, T); c.quadraticCurveTo(L + w * .32, T + h * .5, L + w * .12, T + h); c.lineTo(L, T + h); c.fill();
        c.beginPath(); c.moveTo(L + w, T); c.quadraticCurveTo(L + w * .68, T + h * .5, L + w * .88, T + h); c.lineTo(L + w, T + h); c.fill();
        c.strokeStyle = '#fbf6ee'; c.lineWidth = 7; c.strokeRect(L, T, w, h); c.lineWidth = 4; c.beginPath(); c.moveTo(L + w / 2, T); c.lineTo(L + w / 2, T + h); c.moveTo(L, T + h * .45); c.lineTo(L + w, T + h * .45); c.stroke();
        c.fillStyle = '#7a4b2e'; c.fillRect(L - 8, T + h + 2, w + 16, 14);
        for (let k = 0; k < 9; k++) { c.fillStyle = ['#e8364f', '#ff6f7d', '#f5f0e6'][k % 3]; c.beginPath(); c.arc(L - 4 + r() * (w + 8), T + h + 2 - r() * 6, 5 + r() * 3, 0, TAU); c.fill(); }
        c.fillStyle = '#4f9a52'; for (let k = 0; k < 7; k++) { c.beginPath(); c.ellipse(L + r() * w, T + h + 4, 7, 3.5, r(), 0, TAU); c.fill(); }
      };
      win(WINDOW.x, WINDOW.y, 96, 110, true);
      win(-.34, .46, 76, 100, false);
      win(-.17, .17, 100, 84, false);
      const dw = LAYOUT.DOOR.w / HOUSE.w * W, dh = LAYOUT.DOOR.h / HOUSE.h * H;
      if (lit) { c.fillStyle = '#ffcf80'; c.fillRect(X(DOOR.x) - dw / 2, H - dh - 4, dw, dh - 18); return; }   // the doorway, lit when the door opens
      const dl = X(DOOR.x) - dw / 2, dt = H - dh - 4;
      c.fillStyle = '#5c3a26'; c.fillRect(dl - 10, dt - 10, dw + 20, dh - 4);              // the door frame and the house number over it
      c.fillStyle = '#ffcf80'; c.fillRect(dl, dt, dw, dh - 18);
      c.fillStyle = '#e8d7b8'; c.fillRect(dl + dw / 2 - 26, dt - 40, 52, 22); c.fillStyle = '#7a4b2e'; c.font = '700 16px sans-serif'; c.textAlign = 'center'; c.fillText('12', dl + dw / 2, dt - 23);
    };
  }
  function buildHouse() {
    const { HOUSE, DOOR, WINDOW } = LAYOUT, g = new THREE.Group(); g.position.set(HOUSE.x, 0, HOUSE.z);
    const wall = mat('#ead6b6'), lit = kit.canvasTexture(256, 384, facade(true));
    const face = mat('#ffffff', { map: kit.canvasTexture(512, 768, facade(false)), emissive: 0xffffff, emissiveMap: lit, emissiveIntensity: 0 });
    mesh(new THREE.BoxGeometry(HOUSE.w, HOUSE.h, HOUSE.d), [wall, wall, wall, wall, face, wall], g, 0, HOUSE.h / 2, 0);
    const tiles = kit.canvasTexture(128, 128, (c, W, H) => {
      const r = seeded(13); c.fillStyle = '#b4573f'; c.fillRect(0, 0, W, H);
      for (let y = 0, row = 0; y < H; y += 12, row++) for (let x = (row % 2) * 8 - 8; x < W; x += 16) {
        c.fillStyle = `rgb(${170 + r() * 40 | 0},${74 + r() * 20 | 0},${54 + r() * 16 | 0})`; c.beginPath(); c.arc(x + 8, y + 2, 8, 0, Math.PI); c.fill();
        c.strokeStyle = 'rgba(60,20,10,.3)'; c.lineWidth = 1.2; c.stroke();
      }
    });
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(3, 1);
    const roofM = mat('#ffffff', { map: tiles, roughness: .7 });
    const roof = mesh(new THREE.BoxGeometry(HOUSE.w + .03, .008, HOUSE.d + .05), roofM, g, 0, HOUSE.h + .028, -.004); roof.rotation.x = -.55;
    mesh(new THREE.BoxGeometry(.03, .07, .03), mat('#b9705a'), g, .1, HOUSE.h + .045, -.02);                       // a chimney
    /* the door: hinged on its left, it swings out towards you */
    const hinge = new THREE.Group(); hinge.position.set(DOOR.x - HOUSE.x - DOOR.w / 2, 0, HOUSE.d / 2 + .002); g.add(hinge);
    const doorTex = kit.canvasTexture(64, 128, (c, W, H) => {
      ramp(c, 0, 0, W, H, [[0, '#8a5634'], [1, '#6c3f25']]);
      c.strokeStyle = 'rgba(40,20,10,.5)'; c.lineWidth = 3; c.strokeRect(8, 10, W - 16, H * .38); c.strokeRect(8, H * .5, W - 16, H * .42);
      c.fillStyle = '#ffd36e'; c.beginPath(); c.arc(W - 12, H * .52, 4, 0, TAU); c.fill();
      c.fillStyle = '#ffe9b0'; c.fillRect(16, 18, W - 32, H * .22);
    });
    const door = mesh(new THREE.BoxGeometry(DOOR.w, DOOR.h, .006), mat('#ffffff', { map: doorTex }), hinge, DOOR.w / 2, DOOR.h / 2, 0);
    mesh(new THREE.BoxGeometry(DOOR.w + .03, .01, .03), mat('#9b8a7a'), g, DOOR.x - HOUSE.x, .005, HOUSE.d / 2 + .015);   // the doorstep
    const spill = new THREE.Mesh(geo(new THREE.PlaneGeometry(.16, .16).rotateX(-Math.PI / 2)), kit.keep(new THREE.MeshBasicMaterial({ map: kit.canvasTexture(64, 64, (c, w) => {
      const gr = c.createLinearGradient(0, 0, 0, w); gr.addColorStop(0, 'rgba(255,214,140,.9)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(w * .25, 0); c.lineTo(w * .75, 0); c.lineTo(w, w); c.lineTo(0, w); c.fill();
    }), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
    spill.position.set(DOOR.x - HOUSE.x, .003, HOUSE.d / 2 + .09); spill.renderOrder = 2; g.add(spill);
    const porch = kit.glow({ color: 0xffc879, size: .09, opacity: 0 }); porch.position.set(DOOR.x - HOUSE.x, DOOR.h + .03, HOUSE.d / 2 + .01); g.add(porch);
    const pane = kit.glow({ color: 0xffcf8a, size: .16, opacity: 0 }); pane.position.set(WINDOW.x - HOUSE.x, WINDOW.y, HOUSE.d / 2 + .02); g.add(pane);
    /* by the door: two pots of flowers and the morning's milk */
    const pot = mat('#c8653f'), leaf = mat('#4f9e4f'), bottle = mat('#ffffff', { roughness: .2 }), capM = mat('#3f78b8');
    for (const [x, s] of [[DOOR.x - HOUSE.x - .075, 1.2], [DOOR.x - HOUSE.x + .075, 1]]) {
      mesh(new THREE.CylinderGeometry(.012 * s, .009 * s, .022 * s, 10), pot, g, x, .011 * s, HOUSE.d / 2 + .02);
      mesh(new THREE.SphereGeometry(.018 * s, 10, 8), leaf, g, x, .03 * s, HOUSE.d / 2 + .02);
    }
    for (const dx of [.095, .106]) { mesh(new THREE.CylinderGeometry(.0042, .005, .02, 10), bottle, g, DOOR.x - HOUSE.x + dx, .01, HOUSE.d / 2 + .035); mesh(new THREE.CylinderGeometry(.0035, .0035, .003, 8), capM, g, DOOR.x - HOUSE.x + dx, .0215, HOUSE.d / 2 + .035); }
    return { root: g, face, hinge, spill, porch, pane };
  }

  /* ── the street: cobbles; and its lamp ── */
  function buildStreet() {
    const tex = kit.canvasTexture(1024, 640, (c, W, H) => {
      const r = seeded(3); c.fillStyle = '#6d6f86'; c.fillRect(0, 0, W, H);
      for (let y = 6, row = 0; y < H; y += 21, row++) for (let x = (row % 2) * 13 - 13; x < W; x += 24 + r() * 6) {
        const s = 70 + r() * 50 | 0; c.fillStyle = `rgb(${s + 30},${s + 30},${s + 46})`;
        c.beginPath(); c.roundRect ? c.roundRect(x + 2, y + 2, 20 + r() * 4, 16, 6) : c.rect(x + 2, y + 2, 20, 16); c.fill();
        c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x + 5, y + 4, 10, 3);
      }
    });
    const ground = mesh(new THREE.PlaneGeometry(1, kit.card.depth), mat('#ffffff', { map: tex, roughness: .9 }), stage, 0, .0006, 0);
    ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
    const { LAMP } = LAYOUT, lamp = new THREE.Group(); lamp.position.set(LAMP.x, 0, LAMP.z); stage.add(lamp);
    const iron = mat('#2d3b4f', { roughness: .5, metalness: .4 });
    mesh(new THREE.CylinderGeometry(.006, .009, .33, 10), iron, lamp, 0, .165, 0);
    mesh(new THREE.CylinderGeometry(.018, .024, .02, 12), iron, lamp, 0, .01, 0);
    mesh(new THREE.TorusGeometry(.03, .003, 6, 16, Math.PI / 2), iron, lamp, .03, .33, 0).rotation.z = Math.PI / 2;
    const glass = mesh(new THREE.ConeGeometry(.02, .022, 12, 1, true), mat('#fff2c2', { emissive: 0xffc46b, emissiveIntensity: 0, side: THREE.DoubleSide }), lamp, .06, .345, 0);
    mesh(new THREE.ConeGeometry(.024, .014, 12), iron, lamp, .06, .358, 0);
    const glow = kit.glow({ color: 0xffc879, size: .22, opacity: 0 }); glow.position.set(.06, .33, 0); lamp.add(glow);
    const light = new THREE.PointLight(0xffb86b, 0, .9, 1.6); light.position.set(.06, .3, 0); lamp.add(light);
    const pool = new THREE.Mesh(geo(new THREE.CircleGeometry(.14, 32).rotateX(-Math.PI / 2)), kit.keep(new THREE.MeshBasicMaterial({ map: kit.canvasTexture(64, 64, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,210,140,.75)'); g.addColorStop(1, 'rgba(255,190,110,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w);
    }), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
    pool.position.set(.06, .002, 0); pool.renderOrder = 2; lamp.add(pool);
    return { ground, lamp, glass, glow, light, pool };
  }

  /* ── the hill: two steps of stone wall topped with grass, the ramps, a rail at the top; each piece pops up ── */
  const stones = kit.canvasTexture(512, 128, (c, W, H) => {
    const r = seeded(23); c.fillStyle = '#5b5448'; c.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 26) for (let x = -r() * 30; x < W; x += 30 + r() * 26) {
      const w = 26 + r() * 22, s = 120 + r() * 60 | 0;
      c.fillStyle = `rgb(${s + 22},${s + 10},${s - 14})`; c.beginPath(); c.roundRect ? c.roundRect(x + 2, y + 2, w, 22, 8) : c.rect(x + 2, y + 2, w, 22); c.fill();
      c.fillStyle = 'rgba(255,255,240,.18)'; c.fillRect(x + 6, y + 4, w * .5, 4);
      if (r() < .18) { c.fillStyle = 'rgba(90,140,70,.65)'; c.beginPath(); c.ellipse(x + w * .5, y + 4, w * .4, 6, 0, 0, TAU); c.fill(); }   // moss
    }
    c.fillStyle = '#4c8f45'; for (let x = 0; x < W; x += 3) c.fillRect(x, 0, 3, 5 + 6 * Math.abs(Math.sin(x * .31)) * r());   // grass over the lip
  });
  stones.wrapS = stones.wrapT = THREE.RepeatWrapping;
  const grass = kit.canvasTexture(512, 512, (c, W) => {
    const r = seeded(31); c.fillStyle = '#6eb45a'; c.fillRect(0, 0, W, W);
    for (let i = 0; i < 2600; i++) { c.fillStyle = r() < .5 ? `rgba(40,110,50,${.2 + r() * .3})` : `rgba(190,230,120,${.15 + r() * .3})`; c.fillRect(r() * W, r() * W, 2, 5 + r() * 6); }
    for (let i = 0; i < 160; i++) { c.fillStyle = ['#ffffff', '#ffe066', '#ff8fab', '#c9a7ff'][(r() * 4) | 0]; c.beginPath(); c.arc(r() * W, r() * W, 2 + r() * 2.5, 0, TAU); c.fill(); }
  });
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(3, 3);
  const lane = kit.canvasTexture(256, 64, (c, W, H) => {             // a little concrete lane with worn wheel tracks
    const r = seeded(37); c.fillStyle = '#c9c3b6'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { c.fillStyle = r() < .5 ? 'rgba(90,85,80,.22)' : 'rgba(255,255,250,.3)'; c.fillRect(r() * W, r() * H, 2, 2); }
    c.fillStyle = 'rgba(120,110,100,.22)'; c.fillRect(0, H * .3, W, 6); c.fillRect(0, H * .62, W, 6);
    c.fillStyle = '#e9e3d6'; c.fillRect(0, 0, W, 4); c.fillRect(0, H - 4, W, 4);
  });
  lane.wrapS = THREE.RepeatWrapping;
  /** a step of the hill: its outline in (x, z) seen from above, stood up `h` high */
  function step(outline, h, uScale) {
    const s = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const side = kit.keep(stones.clone()); side.wrapS = side.wrapT = THREE.RepeatWrapping; side.repeat.set(uScale, 1 / h / 1.7); side.needsUpdate = true;
    const top = mat('#ffffff', { map: grass }), wall = mat('#ffffff', { map: side, roughness: .95 });
    const m = new THREE.Mesh(geo(g), [top, wall]); m.castShadow = m.receiveShadow = true;
    return m;
  }
  /** a ramp of lane between two heights along x, `z0`..`z1` deep, with a low wall on its open side */
  function slope(x0, x1, h0, h1, z0, z1, wallZ) {
    const g = new THREE.Group(), len = Math.abs(x1 - x0), rise = h1 - h0, ang = Math.atan2(rise, x1 - x0);
    const t = kit.keep(lane.clone()); t.wrapS = THREE.RepeatWrapping; t.repeat.set(len * 5, 1); t.needsUpdate = true;
    const top = mesh(new THREE.BoxGeometry(Math.hypot(len, rise), .004, z1 - z0), mat('#ffffff', { map: t, roughness: .9 }), g, (x0 + x1) / 2, (h0 + h1) / 2 - .002, (z0 + z1) / 2);
    top.rotation.z = ang;
    const sh = new THREE.Shape([new THREE.Vector2(x0, 0), new THREE.Vector2(x1, 0), new THREE.Vector2(x1, h1 - .003), new THREE.Vector2(x0, h0 - .003)]);
    const side = kit.keep(stones.clone()); side.wrapS = side.wrapT = THREE.RepeatWrapping; side.repeat.set(len * 4, 6); side.needsUpdate = true;
    const body = new THREE.Mesh(geo(new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false })), mat('#ffffff', { map: side, roughness: .95 }));
    body.position.z = z0; body.castShadow = body.receiveShadow = true; g.add(body);
    const cap = mat('#d8cfbe'), n = Math.round(len / .05);
    for (let i = 0; i <= n; i++) {                                    // a low stone parapet on the open side, post by post
      const k = i / n, x = lerp(x0, x1, k), y = lerp(h0, h1, k);
      mesh(new THREE.BoxGeometry(.012, .026, .012), cap, g, x, y + .013, wallZ);
    }
    const rail = mesh(new THREE.BoxGeometry(Math.hypot(len, rise), .006, .008), cap, g, (x0 + x1) / 2, (h0 + h1) / 2 + .027, wallZ); rail.rotation.z = ang;
    return g;
  }
  function buildHill() {
    const t1 = step([[-.5, LAYOUT.STREET], [BEND.x0, LAYOUT.STREET], [BEND.x0, BEND.z1], [.5, BEND.z1], [.5, -.3125], [-.5, -.3125]], T1, 6);
    const t2 = step([[-.5, TOP.zl], [TOP.xl, TOP.zl], [TOP.xl, TOP.z], [.5, TOP.z], [.5, -.3125], [-.5, -.3125]], T2, 6);
    const rampA = slope(A.x0, A.x1, 0, T1, A.z0, A.z1, A.z1 - .006);
    const rampB = slope(B.x0, B.x1, T1, T2, B.z0, B.z1, B.z1 - .006);
    const top = new THREE.Group(); top.position.y = T2;             // things on the top: the rail, a lamp, a tree, a bench
    const wood = mat('#8a5a3a', { roughness: .7 }), white = mat('#f4efe6', { roughness: .6 });
    for (let x = -.46; x <= .461; x += .046) mesh(new THREE.BoxGeometry(.008, .05, .008), white, top, x, .025, LAYOUT.RAIL);
    for (const y of [.03, .048]) mesh(new THREE.BoxGeometry(.93, .006, .006), white, top, 0, y, LAYOUT.RAIL);
    const scope = new THREE.Group(); scope.position.set(.36, 0, -.21); top.add(scope);   // a coin telescope for the view
    mesh(new THREE.CylinderGeometry(.004, .006, .06, 8), mat('#3f78b8', { metalness: .4, roughness: .4 }), scope, 0, .03, 0);
    const head = mesh(new THREE.CylinderGeometry(.008, .011, .03, 12).rotateX(Math.PI / 2), mat('#3f78b8', { metalness: .4, roughness: .4 }), scope, 0, .065, .002);
    head.rotation.x = .25;
    const trees = [];
    for (const [x, y, z, s, col] of [[-.42, T2, -.2, 1.1, '#3f8f4f'], [.44, T2, -.1, .8, '#4f9e4f'], [-.44, T1, .04, .75, '#5aa85a'], [.2, T2, -.27, .6, '#e98fa8']]) {
      const tr = new THREE.Group(); tr.position.set(x, y, z); stage.add(tr);
      mesh(new THREE.CylinderGeometry(.006 * s, .009 * s, .08 * s, 8), wood, tr, 0, .04 * s, 0);
      const crown = mat(col, { roughness: .8, flatShading: true });
      for (const [dx, dy, dz, r] of [[0, .1, 0, .045], [.025, .085, .01, .033], [-.024, .088, -.006, .035], [.004, .125, .004, .03]]) mesh(new THREE.IcosahedronGeometry(r * s, 0), crown, tr, dx * s, dy * s, dz * s);
      trees.push(tr);
    }
    const bushes = [];
    for (const [x, y, z, s] of [[-.3, T1, .07, 1], [.08, T1, .075, .8], [.47, T1, .17, .9], [-.25, T2, -.08, .7], [.4, T2, -.27, .9]]) {
      const b = new THREE.Group(); b.position.set(x, y, z); stage.add(b);
      for (const [dx, dz, r] of [[0, 0, .016], [.014, .004, .012], [-.012, -.003, .013]]) mesh(new THREE.IcosahedronGeometry(r * s, 0), mat('#4c9a4c', { flatShading: true }), b, dx * s, r * s * .8, dz * s);
      for (let i = 0; i < 4; i++) mesh(new THREE.SphereGeometry(.0035, 6, 4), mat(['#ffffff', '#ffd166', '#ff8fab'][i % 3]), b, (i - 1.5) * .009 * s, .022 * s, .01 * s);
      bushes.push(b);
    }
    stage.add(t1, t2, rampA, rampB, top);
    return { t1, t2, rampA, rampB, top, trees, bushes };
  }

  /* ── the road sign at the bend: two posts and a plank, its words painted (the story writes them) ── */
  function buildSign(tex, blank, w, h) {
    const g = new THREE.Group(), wood = mat('#a8743f', { roughness: .8 }), face = t => mat('#ffffff', { map: t, roughness: .85, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .3 });
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(.012, .36, .012), wood, g, s * w * .38, .18, -.004);
    const plank = mesh(new THREE.BoxGeometry(w, h, .008), [wood, wood, wood, wood, face(tex), face(blank)], g, 0, .36 + h / 2 - .02, .004);
    return { root: g, plank };
  }

  /* ── birds: little dark swallows, three wingbeats on one strip; each sprite shows its own ── */
  const birdFrames = (() => {
    const cv = document.createElement('canvas'); cv.width = 384; cv.height = 128;
    const c = cv.getContext('2d'); c.lineJoin = c.lineCap = 'round';
    [-30, 0, 24].forEach((lift, f) => {
      c.save(); c.translate(64 + f * 128, 70); c.fillStyle = '#2a2f4a';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 24, lift - 8, s * 54, lift); c.quadraticCurveTo(s * 30, lift * .4 + 10, 0, 8); c.fill(); }
      c.beginPath(); c.ellipse(0, 4, 12, 8, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-4, 10); c.lineTo(-14, 30); c.lineTo(0, 16); c.lineTo(14, 30); c.lineTo(4, 10); c.fill();   // a forked tail
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(0, 7, 6, 4, 0, 0, TAU); c.fill();
      c.restore();
    });
    const t = kit.keep(new THREE.CanvasTexture(cv)); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  function bird(size = .05) {
    const t = kit.keep(birdFrames.clone()); t.repeat.set(1 / 3, 1); t.needsUpdate = true;
    const s = new THREE.Sprite(kit.keep(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 }))); s.renderOrder = 4;
    s.scale.set(size * 1.5, size * .5, 1); stage.add(s);
    return { s, t, size, flap(T, ph = 0, dir = 1) { t.offset.x = [0, 1, 2, 1][Math.floor((T * 9 + ph) % 4)] / 3; s.scale.set(size * 1.5 * dir, size * .5, 1); } };
  }

  return {
    LAYOUT, ground, seeded, mat, mesh, geo, pageZ: x => PAGE.z + PAGE.curve * (x / (PAGE.width / 2)) ** 2,
    /** how far each piece of the hill is up (0..1): { t1, t2, a, b } */
    rise(k) { Object.assign(up, k); },
    buildPage, buildHouse, buildStreet, buildHill, buildSign, bird
  };
};
