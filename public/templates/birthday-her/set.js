/* Sinh nhật nàng: the rooftop, built for story.js (template.json "story": ["set.js", "story.js"]). A city rooftop from dusk
   into night: a deck of wooden tiles with a parapet at the back and, beyond it, a painted city (a dusk sky, a night sky
   that fades in over it, the towers, and their windows that light up); at the back left the stairwell's little hut with
   its door, and beside it the sign at the stairs with a polaroid taped on top; string lights from the hut to three
   poles, three polaroids hanging on them from the start and three more that come down at the end; a big framed photo
   leaning on the parapet; potted plants, a gift, a little round table and, for the wish, a cake with five candles; six
   clear balloons tied behind the parapet, each with a photo inside that turns to face the phone; a heart frame for the
   first photo; a moon and stars. window.NM_BDAY_HER_SET(kit) builds it all and returns what the story moves. Units:
   card widths, +y up, the act faces +z (the card's bottom edge). Photos: 14 surfaces spread over the photos (slot of 14)
   and the heart with the first one. */
window.NM_BDAY_HER_SET = kit => {
  const { THREE, stage, keep } = kit;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const FLOOR = .006;                                                   // the deck's top
  const HUT = { x0: -.5, x1: -.35, z0: -.244, z1: -.12, h: .38 }, DOOR = { x0: -.466, x1: -.384, h: .325 }, RECESS = .065;
  const WALL = { z: -.168, t: .028, h: .12 };                           // the parapet: its middle line, thickness, height
  const CAP = FLOOR + WALL.h + .014;                                    // the top of its cap
  const TABLE = { x: .17, z: .085, top: .128, r: .072 };
  const BALLOON_R = .078, PLACES = 14;
  const UP = new THREE.Vector3(0, 1, 0);

  /* ── materials and shapes ── */
  const mats = new Map();
  const mat = (color, o = {}) => {
    const key = `${color}|${o.r ?? .8}|${o.m ?? 0}|${o.e ?? ''}|${o.ei ?? 1}`;
    if (!mats.has(key)) {
      const m = keep(new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .8, metalness: o.m ?? 0, ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}) }));
      if (o.m) { m.envMap = kit.env; m.envMapIntensity = .9; }
      mats.set(key, m);
    }
    return mats.get(key);
  };
  const own = (color, o = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .6, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0 }));
  const painted = (t, o = {}) => keep(new THREE.MeshStandardMaterial({ map: t, roughness: o.r ?? .85, ...(o.glow ? { emissive: 0xffffff, emissiveMap: t, emissiveIntensity: o.glow } : {}) }));
  const mesh = (geo, m, at = [0, 0, 0], shadow = true) => {
    const x = new THREE.Mesh(geo, m); x.position.set(...at); x.castShadow = shadow; x.receiveShadow = true; return x;
  };
  const box = (w, h, d, m, at) => mesh(keep(new THREE.BoxGeometry(w, h, d)), m, at);
  const cyl = (rt, rb, h, m, at, seg = 16) => mesh(keep(new THREE.CylinderGeometry(rt, rb, h, seg)), m, at);
  const ball = (r, m, at, seg = 12) => mesh(keep(new THREE.SphereGeometry(r, seg, Math.max(6, seg * .75 | 0))), m, at);
  const tex = (w, h, draw, o = {}) => {
    const t = kit.canvasTexture(w, h, draw);
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.repeat); }
    return t;
  };
  /** decoration a finger should go through (to the photo behind it, or to play on) */
  const noHit = o => { o.traverse(x => { x.raycast = () => {}; }); return o; };
  const rounded = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };

  /* ── the city behind: a dusk sky, a night sky over it, the towers, their lit windows (each a page of its own) ── */
  const SKY = { width: 1.3, height: 1.2, curve: .09, z: -.302 }, SW = 1024, SH = Math.round(1024 * SKY.height / SKY.width), PXU = SW / SKY.width;   // the city's page: px a card width
  const rs = seeded(1606);
  const FAR = [], NEAR = [];
  for (let x = SW * .05; x < SW * .95;) { const w = 40 + rs() * 54; FAR.push({ x, w, h: PXU * (.21 + rs() * .19), mast: rs() < .3 }); x += w * (.75 + rs() * .35); }
  for (let x = SW * .04; x < SW * .94;) {                          // the towers stop short of the page's ends, which fade
    const w = 46 + rs() * 68, tall = rs() < .2, h = PXU * (tall ? .37 + rs() * .1 : .13 + rs() * .2), win = [];
    for (let y = SH - h + 14; y < SH - 10; y += 17) for (let wx = x + 8; wx < x + w - 12; wx += 14)
      win.push([wx, y, rs() < .58, ['#ffd98a', '#ffe9bd', '#ffd98a', '#ffb7c9', '#c6ecff'][(rs() * 5) | 0]]);
    NEAR.push({ x, w, h, tall, crown: rs(), win }); x += w + 4 + rs() * 22;
  }
  const CLOUDS = Array.from({ length: 8 }, () => ({ x: rs(), y: .3 + rs() * .32, w: .1 + rs() * .2, h: .012 + rs() * .014 }));   // on the sky's page, in parts of it
  const DOTS = Array.from({ length: 110 }, () => [rs(), .2 + rs() * .5, .5 + rs() * 1.2, .4 + rs() * .6]);
  /** a sky page fades out at its top and its two ends, into the page (or the camera's picture) round it */
  function fade(c, w, h) {
    c.save(); c.globalCompositeOperation = 'destination-in';
    const v = c.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(.24, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = v; c.fillRect(0, 0, w, h);
    const u = c.createLinearGradient(0, 0, w, 0); u.addColorStop(0, 'rgba(0,0,0,0)'); u.addColorStop(.15, 'rgba(0,0,0,1)'); u.addColorStop(.85, 'rgba(0,0,0,1)'); u.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = u; c.fillRect(0, 0, w, h); c.restore();
  }
  const NEON = NEAR.find(t => t.tall && t.x > SW * .55) || NEAR[NEAR.length - 3];   // a pink neon heart on one tower
  function dusk(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a3074'); g.addColorStop(.42, '#8f5597'); g.addColorStop(.62, '#e0819a'); g.addColorStop(.8, '#ffb08f'); g.addColorStop(1, '#ffdcaa');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const s = c.createRadialGradient(w * .66, h * .84, 0, w * .66, h * .84, w * .26);
    s.addColorStop(0, 'rgba(255,246,216,.95)'); s.addColorStop(.1, 'rgba(255,228,184,.85)'); s.addColorStop(1, 'rgba(255,196,160,0)');
    c.fillStyle = s; c.fillRect(0, 0, w, h);
    for (const k of CLOUDS) {
      c.fillStyle = k.y < .45 ? 'rgba(236,170,214,.5)' : 'rgba(255,196,196,.55)';
      c.beginPath(); c.ellipse(k.x * w, k.y * h, k.w * w / 2, k.h * h / 2, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(k.x * w + k.w * w * .18, k.y * h - k.h * h * .45, k.w * w * .24, k.h * h * .5, 0, 0, 7); c.fill();
    }
    fade(c, w, h);
  }
  function night(c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0c0b28'); g.addColorStop(.45, '#211b55'); g.addColorStop(.75, '#46296b'); g.addColorStop(1, '#8a466f');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (const [x, y, r, a] of DOTS) { c.fillStyle = `rgba(255,248,226,${a})`; c.beginPath(); c.arc(x * w, y * h, r, 0, 7); c.fill(); }
    fade(c, w, h);
  }
  function city(c, w, h) {
    c.clearRect(0, 0, w, h);
    for (const t of FAR) {
      c.fillStyle = '#5d4a84'; c.fillRect(t.x, h - t.h, t.w, t.h);
      if (t.mast) c.fillRect(t.x + t.w * .5 - 2, h - t.h - 26, 4, 26);
    }
    for (const t of NEAR) {
      c.fillStyle = '#2f2449'; c.fillRect(t.x, h - t.h, t.w, t.h);
      if (t.tall && t.crown < .5) { c.beginPath(); c.moveTo(t.x + 6, h - t.h); c.lineTo(t.x + t.w / 2, h - t.h - 46); c.lineTo(t.x + t.w - 6, h - t.h); c.fill(); }
      else if (t.tall) { c.fillRect(t.x + 10, h - t.h - 18, t.w - 20, 18); c.fillRect(t.x + t.w / 2 - 2, h - t.h - 52, 4, 36); }
      else if (t.crown < .4) { c.fillRect(t.x + t.w * .2, h - t.h - 12, t.w * .22, 12); c.beginPath(); c.arc(t.x + t.w * .31, h - t.h - 12, t.w * .11, Math.PI, 0); c.fill(); }   // a water tank
      c.fillStyle = '#3f3263';
      for (const [x, y] of t.win) c.fillRect(x, y, 7, 9);
    }
  }
  function windows(c, w, h) {
    c.clearRect(0, 0, w, h);
    for (const t of NEAR) for (const [x, y, lit, col] of t.win) if (lit) { c.fillStyle = col; c.fillRect(x, y, 7, 9); }
    for (const t of FAR) for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,224,160,.7)'; c.fillRect(t.x + 6 + ((i * 37) % Math.max(8, t.w - 14)), h - t.h + 16 + ((i * 53) % Math.max(10, t.h - 30)), 5, 6); }
    const hx = NEON.x + NEON.w / 2, hy = h - NEON.h + 40;
    c.save(); c.shadowColor = '#ff6f9f'; c.shadowBlur = 18; c.strokeStyle = '#ff9fc0'; c.lineWidth = 5;
    kit.heartPath(c, hx, hy, Math.min(46, NEON.w * .7)); c.stroke(); c.restore();
  }
  const skyDusk = kit.backdrop(dusk, { ...SKY, px: 512, order: -5 });
  const skyNight = kit.backdrop(night, { ...SKY, px: 512, z: SKY.z + .002, order: -4 }); skyNight.material.opacity = 0;
  const skyline = kit.backdrop(city, { ...SKY, px: SW, z: SKY.z + .004, order: -3, alphaTest: .5 });
  const lit = kit.backdrop(windows, { ...SKY, px: SW, z: SKY.z + .006, order: -2 }); lit.material.opacity = 0;
  [skyDusk, skyNight, skyline, lit].forEach(b => { noHit(b); stage.add(b); });
  const moon = kit.picture((c, px) => {
    c.fillStyle = '#fff0bf'; c.beginPath(); c.arc(px / 2, px / 2, px * .2, 0, 7); c.fill();
    c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(px * .59, px * .44, px * .18, 0, 7); c.fill();
    c.globalCompositeOperation = 'destination-over';                    // its glow behind it, not cut away with the dark side
    const g = c.createRadialGradient(px * .45, px * .53, px * .08, px / 2, px / 2, px * .5);
    g.addColorStop(0, 'rgba(255,240,200,.42)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(0, 0, px, px);
  }, { size: .16, opacity: 0 });
  moon.position.set(.43, .9, -.24); stage.add(moon);

  /* ── the deck, a rug under the table ── */
  const DECK = ['#c99a6b', '#bf8f60', '#d2a577', '#c4935f'];
  const deckTex = tex(1024, 512, (c, w, h) => {
    const n = 16, s = w / n;
    for (let j = 0; j * s < h; j++) for (let i = 0; i < n; i++) {
      const x = i * s, y = j * s;
      c.fillStyle = DECK[(i * 7 + j * 3) % 4]; c.fillRect(x, y, s, s);
      c.strokeStyle = 'rgba(96,56,34,.32)'; c.lineWidth = 2;
      for (let k = 1; k < 4; k++) {                                     // four planks a tile, the next tile across
        c.beginPath();
        if ((i + j) % 2) { c.moveTo(x, y + k * s / 4); c.lineTo(x + s, y + k * s / 4); } else { c.moveTo(x + k * s / 4, y); c.lineTo(x + k * s / 4, y + s); }
        c.stroke();
      }
      c.strokeStyle = 'rgba(70,38,24,.5)'; c.lineWidth = 3; c.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
    }
  });
  const FZ0 = WALL.z - WALL.t / 2, FZ1 = .3;
  const deckEdge = mat('#8a5a3c', { r: .8 });
  const floor = box(.98, FLOOR, FZ1 - FZ0, [deckEdge, deckEdge, keep(new THREE.MeshStandardMaterial({ map: deckTex, roughness: .82 })), deckEdge, deckEdge, deckEdge], [0, FLOOR / 2, (FZ0 + FZ1) / 2]);
  floor.castShadow = false; stage.add(floor);
  const rug = mesh(keep(new THREE.CircleGeometry(.125, 40)), keep(new THREE.MeshStandardMaterial({ roughness: 1, map: tex(256, 256, (c, w) => {
    for (let i = 7; i > 0; i--) { c.fillStyle = ['#f6c9d6', '#fff4e6', '#ee9cb4'][i % 3]; c.beginPath(); c.arc(w / 2, w / 2, w / 2 * i / 7, 0, 7); c.fill(); }
  }) })), [TABLE.x - .01, FLOOR + .0008, TABLE.z], false);
  rug.rotation.x = -Math.PI / 2; stage.add(rug);

  /* ── the parapet at the back (and its return on the right), painted with a row of breeze blocks ── */
  const stucco = (n) => tex(512, 128, (c, w, h) => {
    c.fillStyle = '#f4d9ca'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) {
      c.fillStyle = '#ecc6b6'; c.fillRect(x + 6, 16, 52, 52);
      c.strokeStyle = '#d9a594'; c.lineWidth = 3; c.strokeRect(x + 6, 16, 52, 52);
      c.fillStyle = '#f8e6dc'; for (const [dx, dy] of [[0, -13], [13, 0], [0, 13], [-13, 0]]) { c.beginPath(); c.arc(x + 32 + dx, 42 + dy, 9, 0, 7); c.fill(); }
      c.fillStyle = '#d9a594'; c.beginPath(); c.arc(x + 32, 42, 5, 0, 7); c.fill();
    }
    c.fillStyle = '#e2b6a4'; c.fillRect(0, h - 24, w, 24);
  }, { repeat: [n, 1] });
  const wallBack = keep(new THREE.MeshStandardMaterial({ map: stucco(8), roughness: .9 })), wallSide = keep(new THREE.MeshStandardMaterial({ map: stucco(2), roughness: .9 }));
  const capMat = mat('#fff4ec', { r: .7 });
  const WX0 = HUT.x1, WX1 = .5, back = new THREE.Group(); stage.add(back);
  back.add(box(WX1 - WX0, WALL.h, WALL.t, wallBack, [(WX0 + WX1) / 2, FLOOR + WALL.h / 2, WALL.z]));
  back.add(box(WX1 - WX0 + .006, .014, WALL.t + .014, capMat, [(WX0 + WX1) / 2, FLOOR + WALL.h + .007, WALL.z]));
  const RZ0 = WALL.z + WALL.t / 2, RZ1 = .0;
  back.add(box(WALL.t, WALL.h, RZ1 - RZ0, wallSide, [WX1 - WALL.t / 2, FLOOR + WALL.h / 2, (RZ0 + RZ1) / 2]));
  back.add(box(WALL.t + .014, .014, RZ1 - RZ0 + .007, capMat, [WX1 - WALL.t / 2, FLOOR + WALL.h + .007, (RZ0 + RZ1) / 2]));

  /* ── the stairwell's hut, its doorway open in front (the stairs going down inside), the door hinged on the left ── */
  const hutTex = tex(256, 512, (c, w, h) => {
    c.fillStyle = '#f7e2d4'; c.fillRect(0, 0, w, h);
    const r = seeded(77); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(160,110,90,${.04 + r() * .06})`; c.fillRect(r() * w, r() * h, 2, 2); }
    c.fillStyle = '#e8c3b0'; c.fillRect(0, h - 40, w, 40);
  });
  const hutMat = painted(hutTex, { r: .92 }), trim = mat('#fff4ec', { r: .7 });
  const HX = (HUT.x0 + HUT.x1) / 2, ZIN = HUT.z1 - RECESS, hut = new THREE.Group(); stage.add(hut);
  hut.add(box(HUT.x1 - HUT.x0, HUT.h, ZIN - HUT.z0, hutMat, [HX, FLOOR + HUT.h / 2, (HUT.z0 + ZIN) / 2]));
  hut.add(box(DOOR.x0 - HUT.x0, HUT.h, RECESS, hutMat, [(HUT.x0 + DOOR.x0) / 2, FLOOR + HUT.h / 2, ZIN + RECESS / 2]));
  hut.add(box(HUT.x1 - DOOR.x1, HUT.h, RECESS, hutMat, [(DOOR.x1 + HUT.x1) / 2, FLOOR + HUT.h / 2, ZIN + RECESS / 2]));
  hut.add(box(DOOR.x1 - DOOR.x0, HUT.h - DOOR.h, RECESS, hutMat, [(DOOR.x0 + DOOR.x1) / 2, FLOOR + (DOOR.h + HUT.h) / 2, ZIN + RECESS / 2]));
  hut.add(box(HUT.x1 - HUT.x0 + .02, .016, HUT.z1 - HUT.z0 + .02, trim, [HX, FLOOR + HUT.h + .008, (HUT.z0 + HUT.z1) / 2]));
  const stairs = tex(128, 512, (c, w, h) => {                            // the stairwell inside: dark steps going down, a warm light below
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2b2033'); g.addColorStop(.7, '#4a3346'); g.addColorStop(1, '#8a5a52');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { const y = h * .45 + i * h * .06; c.fillStyle = `rgba(255,200,150,${.08 + i * .03})`; c.fillRect(0, y, w, 5); }
  });
  const well = mesh(keep(new THREE.PlaneGeometry(DOOR.x1 - DOOR.x0, DOOR.h)), keep(new THREE.MeshBasicMaterial({ map: stairs })), [(DOOR.x0 + DOOR.x1) / 2, FLOOR + DOOR.h / 2, ZIN + .001], false);
  hut.add(well);
  for (const [w, h, x, y] of [[.008, DOOR.h + .008, DOOR.x0 - .002, DOOR.h / 2], [.008, DOOR.h + .008, DOOR.x1 + .002, DOOR.h / 2], [DOOR.x1 - DOOR.x0 + .012, .008, (DOOR.x0 + DOOR.x1) / 2, DOOR.h + .002]])
    hut.add(box(w, h, .006, trim, [x, FLOOR + y, HUT.z1 + .002]));
  const doorTex = tex(128, 512, (c, w, h) => {
    c.fillStyle = '#5aa39b'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#7fc2b8'; c.lineWidth = 7; c.strokeRect(16, 22, w - 32, h * .4); c.strokeRect(16, h * .5, w - 32, h * .44);
    c.fillStyle = '#ff8fab'; kit.heartPath(c, w / 2, h * .25, 44); c.fill();
  });
  const doorEdge = mat('#4b8c85', { r: .6 });
  const hinge = new THREE.Group(); hinge.position.set(DOOR.x0 + .002, FLOOR, HUT.z1 - .005); hut.add(hinge);
  const dw = DOOR.x1 - DOOR.x0 - .004;
  hinge.add(box(dw, DOOR.h - .004, .008, [doorEdge, doorEdge, doorEdge, doorEdge, painted(doorTex, { r: .6 }), painted(doorTex, { r: .6 })], [dw / 2, (DOOR.h - .004) / 2, 0]));
  hinge.add(ball(.0045, mat('#f2c14e', { r: .3, m: .6 }), [dw - .012, DOOR.h * .48, .007], 10));
  const door = { open: k => { hinge.rotation.y = -1.72 * k; } };
  const awning = box(DOOR.x1 - DOOR.x0 + .03, .005, .04, mat('#e8768f', { r: .7 }), [(DOOR.x0 + DOOR.x1) / 2, FLOOR + DOOR.h + .022, HUT.z1 + .018]);
  awning.rotation.x = .3; hut.add(awning);
  const lamp = new THREE.Group(); lamp.position.set((DOOR.x0 + DOOR.x1) / 2, FLOOR + DOOR.h + .042, HUT.z1 + .008); hut.add(lamp);
  lamp.add(cyl(.009, .012, .016, mat('#3b2a4a', { r: .4, m: .4 }), [0, .008, 0], 12), ball(.008, own('#fff1c9', { e: 0xffc46b, ei: 1.6 }), [0, -.002, .002], 10));
  const lampGlow = kit.glow({ color: 0xffc879, size: .09, opacity: .8 }); lampGlow.position.set(0, 0, .006); lamp.add(lampGlow);
  const bunting = new THREE.Group(); hut.add(bunting);                    // little flags along the hut's top
  const flagGeo = keep(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.009, 0, 0), new THREE.Vector3(.009, 0, 0), new THREE.Vector3(0, -.022, 0)]));
  flagGeo.computeVertexNormals();
  ['#ff8fab', '#ffd27a', '#8fd0bd', '#c5a3ff', '#ff8fab', '#ffd27a', '#8fd0bd'].forEach((cl, i) => {
    const x = HUT.x0 + .012 + i * (HUT.x1 - HUT.x0 - .024) / 6, f = mesh(flagGeo, keep(new THREE.MeshStandardMaterial({ color: cl, side: THREE.DoubleSide, roughness: .8 })), [x, FLOOR + HUT.h - .004 - .008 * Math.sin(Math.PI * i / 6), HUT.z1 + .004], false);
    bunting.add(f);
  });
  const waterTank = new THREE.Group(); waterTank.position.set(HX - .01, FLOOR + HUT.h + .016, (HUT.z0 + HUT.z1) / 2 - .01); hut.add(waterTank);
  const steel = mat('#d9dde6', { r: .25, m: .8 });
  const drum = cyl(.026, .026, .11, steel, [0, .034, 0], 20); drum.rotation.z = Math.PI / 2; waterTank.add(drum);
  for (const x of [-.035, .035]) waterTank.add(box(.006, .01, .04, mat('#8a8f9c', { r: .5, m: .5 }), [x, .005, 0]));

  /* ── the sign at the stairs, on a post beside the hut, with a photo clipped on ── */
  const SIGN = { x: -.22, z: -.09, y: .235, w: .32, h: .165 };
  const signText = kit.words('stairs', 'Lên sân thượng nhé, có bất ngờ cho em!');
  const signTex = tex(1024, 528, (c, w, h) => {
    c.fillStyle = '#7b4a35'; rounded(c, 0, 0, w, h, 36); c.fill();
    c.fillStyle = '#fff4e4'; rounded(c, 18, 18, w - 36, h - 36, 26); c.fill();
    c.strokeStyle = '#f39ab6'; c.lineWidth = 8; c.setLineDash([22, 14]); rounded(c, 40, 40, w - 80, h - 80, 20); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#e8436d'; c.lineWidth = 14; c.lineCap = 'round'; c.lineJoin = 'round';   // an arrow: up the stairs, this way
    c.beginPath(); c.moveTo(96, h - 110); c.quadraticCurveTo(88, h * .45, 118, 140); c.stroke();
    c.beginPath(); c.moveTo(80, 182); c.lineTo(118, 136); c.lineTo(160, 176); c.stroke();
    c.fillStyle = '#e8436d'; kit.heartPath(c, w - 82, h - 78, 52); c.fill();
    c.fillStyle = '#6b2a45'; kit.fitText(c, signText, { x: 168, y: 56, w: w - 300, h: h - 112 }, { maxLines: 3, max: 140 });
  });
  const sign = new THREE.Group(); sign.position.set(SIGN.x, FLOOR, SIGN.z); stage.add(sign);
  const woodDark = mat('#7b4a35', { r: .7 });
  sign.add(box(.012, SIGN.y, .012, woodDark, [0, SIGN.y / 2, -.006]));
  const board = new THREE.Group(); board.position.y = SIGN.y; board.rotation.x = -.24; sign.add(board);
  board.add(box(SIGN.w, SIGN.h, .006, [woodDark, woodDark, woodDark, woodDark, painted(signTex, { r: .8, glow: .3 }), woodDark], [0, 0, 0]));
  const white = mat('#ffffff', { r: .7 });
  const pinned = new THREE.Group(); pinned.position.set(-.03, SIGN.h / 2 - .015, .006); pinned.rotation.set(.2, 0, .05); board.add(pinned);   // standing up, over the words
  const signPhoto = kit.photo({ frame: 'white', width: .15, aspect: 1, border: .07, slot: 0, of: PLACES, glow: .45 });
  signPhoto.root.position.y = .03 + signPhoto.height / 2; pinned.add(signPhoto.root);
  pinned.add(box(signPhoto.width, .03, .006, white, [0, .015, 0]));      // the polaroid's wide bottom
  for (const [x, a, cl] of [[-.062, .55, '#ff8fab'], [.062, -.5, '#8fd0bd']]) {   // taped to the board at both corners
    const t = box(.036, .012, .002, mat(cl, { r: .8 }), [x, .012, .005]); t.rotation.z = a; t.castShadow = false; pinned.add(t);
  }
  const signGlow = kit.glow({ color: 0xffe2b0, size: .4, opacity: 0 }); signGlow.position.set(0, 0, -.02); board.add(signGlow);

  /* ── plants, a gift, the table with a rose ── */
  const leaf = ['#6fbf73', '#5aa766', '#86cf8a'];
  function plant(x, z, kind, s = 1) {
    const g = new THREE.Group(); g.position.set(x, FLOOR, z); g.scale.setScalar(s); stage.add(g);
    if (kind === 'planter') {
      g.add(mesh(keep(new THREE.BoxGeometry(.05, .036, .13)), mat('#b8794f', { r: .8 }), [0, .018, 0]));
      for (let i = 0; i < 6; i++) g.add(ball(.017, mat(leaf[i % 3], { r: .9 }), [(i % 2 - .5) * .016, .04, -.05 + i * .02], 10));
      for (let i = 0; i < 9; i++) g.add(ball(.0065, mat(['#ff8fab', '#fff4f6', '#ffd27a'][i % 3], { r: .6 }), [((i * 5) % 3 - 1) * .014, .055 + (i % 2) * .006, -.055 + i * .013], 8));
      return g;
    }
    g.add(cyl(.026, .019, .05, mat('#d9825f', { r: .8 }), [0, .025, 0], 18), cyl(.028, .028, .008, mat('#c56f4f', { r: .8 }), [0, .049, 0], 18));
    if (kind === 'tall') {
      g.add(cyl(.0035, .005, .12, mat('#7b5a3c'), [0, .1, 0], 6));
      [[0, .17, 0, .042], [.03, .14, .012, .03], [-.03, .145, -.01, .032], [.008, .205, -.004, .028], [-.016, .118, .02, .024]]
        .forEach(([px, py, pz, r], i) => g.add(ball(r, mat(leaf[i % 3], { r: .9 }), [px, py, pz], 12)));
    } else {
      [[0, .072, 0, .03], [.022, .064, .01, .022], [-.022, .066, -.006, .023], [.004, .092, .002, .02], [-.008, .062, .022, .018]]
        .forEach(([px, py, pz, r], i) => g.add(ball(r, mat(leaf[i % 3], { r: .9 }), [px, py, pz], 12)));
      if (kind === 'bloom') for (let i = 0; i < 7; i++) { const a = i * 2.4; g.add(ball(.007, mat(['#ff8fab', '#fff4f6'][i % 2], { r: .6 }), [Math.cos(a) * .022, .08 + (i % 3) * .008, Math.sin(a) * .022 + .006], 8)); }
    }
    return g;
  }
  plant(.43, -.04, 'shrub'); plant(-.405, .11, 'tall', 1.05); plant(.448, .17, 'planter'); plant(-.31, -.092, 'bloom', .8);
  const gift = new THREE.Group(); gift.position.set(.31, FLOOR, .2); gift.rotation.y = -.4; stage.add(gift);
  gift.add(box(.042, .036, .042, mat('#e8768f', { r: .6 }), [0, .018, 0]), box(.044, .037, .008, mat('#fff4e6', { r: .5 }), [0, .0185, 0]), box(.008, .037, .044, mat('#fff4e6', { r: .5 }), [0, .0185, 0]));
  for (const s of [-1, 1]) { const loop = mesh(keep(new THREE.TorusGeometry(.007, .0022, 6, 14)), mat('#fff4e6', { r: .5 }), [s * .007, .041, 0]); loop.rotation.y = Math.PI / 2; loop.rotation.x = s * .5; gift.add(loop); }

  const table = new THREE.Group(); table.position.set(TABLE.x, FLOOR, TABLE.z); stage.add(table);
  const brass = mat('#e8c39a', { r: .35, m: .55 });
  table.add(cyl(TABLE.r, TABLE.r, .006, mat('#fffaf6', { r: .4 }), [0, TABLE.top - .003, 0], 36), cyl(.0045, .006, TABLE.top - .008, brass, [0, (TABLE.top - .008) / 2 + .004, 0], 10),
    cyl(.032, .036, .006, brass, [0, .003, 0], 24));
  const rim = mesh(keep(new THREE.TorusGeometry(TABLE.r, .0028, 6, 48)), brass, [0, TABLE.top - .002, 0], false); rim.rotation.x = Math.PI / 2; table.add(rim);

  /* ── the cake: two tiers, berries, five striped candles whose flames light (set(i, k)) and go out ── */
  const cake = new THREE.Group(); cake.position.set(TABLE.x + .006, FLOOR + TABLE.top, TABLE.z + .006); stage.add(cake);
  const frosting = tex(512, 64, (c, w, h) => {
    c.fillStyle = '#f39ab6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff4f6'; for (let x = 8; x < w; x += 22) { c.beginPath(); c.arc(x, 9, 7, 0, 7); c.fill(); c.beginPath(); c.arc(x + 11, h - 8, 6, 0, 7); c.fill(); }
    c.fillStyle = '#ffd27a'; for (let x = 14; x < w; x += 44) { c.beginPath(); c.arc(x, h / 2, 3.5, 0, 7); c.fill(); }
  });
  const drips = tex(512, 64, (c, w, h) => {
    c.fillStyle = '#fff6ec'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ee7fa0'; c.fillRect(0, 0, w, 12);
    const r = seeded(9); for (let x = 4; x < w; x += 16 + r() * 10) { const d = 14 + r() * 26; c.fillRect(x, 0, 9, d); c.beginPath(); c.arc(x + 4.5, d, 4.5, 0, 7); c.fill(); }
  });
  const cream = mat('#fff6ec', { r: .6, e: '#fff6ec', ei: .2 });
  cake.add(cyl(.054, .05, .004, mat('#ffffff', { r: .3, e: '#ffffff', ei: .15 }), [0, .002, 0], 32));
  const tier1 = mesh(keep(new THREE.CylinderGeometry(.042, .042, .03, 32)), [painted(frosting, { r: .7, glow: .32 }), mat('#f7b3c7', { r: .6, e: '#f7b3c7', ei: .3 }), cream], [0, .004 + .015, 0]); cake.add(tier1);
  const tier2 = mesh(keep(new THREE.CylinderGeometry(.028, .028, .022, 28)), [painted(drips, { r: .6, glow: .32 }), mat('#ee7fa0', { r: .55, e: '#ee7fa0', ei: .3 }), cream], [0, .034 + .011, 0]); cake.add(tier2);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + .2, berry = ball(.0058, mat('#e5484d', { r: .4 }), [Math.cos(a) * .036, .036, Math.sin(a) * .036], 10); berry.castShadow = false; cake.add(berry); }
  const stripes = tex(32, 128, (c, w, h) => { c.fillStyle = '#fffaf2'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8436d'; c.lineWidth = 7; for (let y = -w; y < h + w; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 16); c.stroke(); } });
  const candleMat = painted(stripes, { r: .5 }), TOP = .056;
  const flames = Array.from({ length: 5 }, (_, i) => {
    const a = i / 5 * Math.PI * 2 + .3, x = Math.cos(a) * .016, z = Math.sin(a) * .016;
    cake.add(cyl(.0024, .0024, .022, candleMat, [x, TOP + .011, z], 10), cyl(.0006, .0006, .004, mat('#2b2033'), [x, TOP + .024, z], 4));
    const f = new THREE.Group(); f.position.set(x, TOP + .029, z); cake.add(f);
    const core = own('#ffe9a8', { e: 0xffa23c, ei: 2.2 });
    const body = ball(.0034, core, [0, 0, 0], 10); body.scale.set(1, 1.9, 1); body.castShadow = false; f.add(body);
    const glow = kit.glow({ color: 0xffb35c, size: .036, opacity: 0 }); f.add(glow);
    return { root: f, body, glow, at: new THREE.Vector3(x, TOP + .029, z), set(k, T = 0) {
      const fl = 1 + .12 * Math.sin(T * 23 + i * 2) + .06 * Math.sin(T * 41 + i);
      f.visible = k > .01; body.scale.set(k, 1.9 * k * fl, k); glow.material.opacity = .75 * k; f.rotation.z = .08 * Math.sin(T * 7 + i) * k;
    } };
  });
  const candleLight = new THREE.PointLight(0xffb066, 0, .7, 1.6); candleLight.position.set(0, TOP + .06, 0); cake.add(candleLight);

  /* ── a big photo in a wooden frame, leaning on the parapet at the back right (clear of her, the table and the cake) ── */
  const framed = kit.photo({ frame: 'wood', width: .17, aspect: 1.18, slot: 7, of: PLACES, glow: .45 }), LEAN = .18;
  framed.root.position.set(.32, FLOOR + framed.height / 2 * Math.cos(LEAN), WALL.z + WALL.t / 2 + .036 - framed.height / 2 * Math.sin(LEAN));
  framed.root.rotation.set(-LEAN, -.14, 0); stage.add(framed.root);

  /* ── poles and string lights: a chain from the front-left pole over the hut, along the back, down the right ── */
  const iron = mat('#3b2a4a', { r: .45, m: .4 });
  const POLES = { FL: [-.45, .2, .4], BR: [.44, -.13, .425], FR: [.45, .2, .38] };
  for (const [x, z, h] of Object.values(POLES)) {
    stage.add(cyl(.016, .02, .008, iron, [x, FLOOR + .004, z], 14), cyl(.0042, .005, h, iron, [x, FLOOR + h / 2, z], 8), ball(.007, iron, [x, FLOOR + h + .004, z], 10));
  }
  const top = k => new THREE.Vector3(POLES[k][0], FLOOR + POLES[k][2], POLES[k][1]);
  const corner = x => new THREE.Vector3(x, FLOOR + HUT.h + .02, HUT.z1 + .004);
  const SPANS = [[top('FL'), corner(HUT.x0 + .004), .03, 4], [corner(HUT.x0 + .004), corner(HUT.x1 - .004), .012, 2], [corner(HUT.x1 - .004), top('BR'), .062, 10], [top('BR'), top('FR'), .03, 5]];
  const BACK = 6;                                                       // the back span's first bulb, among all of them
  const sag = (a, b, s) => t => new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -s * 4 * t * (1 - t), 0));
  const wireMat = mat('#2b2033', { r: .6 });
  const bulbs = [], spans = SPANS.map(([a, b, s, n]) => {
    const at = sag(a, b, s);
    stage.add(noHit(mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => at(i / 12))), 36, .0011, 4)), wireMat, [0, 0, 0], false)));
    for (let i = 0; i < n; i++) {
      const p = at((i + .5) / n).add(new THREE.Vector3(0, -.007, 0)), pink = bulbs.length % 3 === 2;
      const m = own(pink ? '#ffd6e2' : '#fff1c9', { e: pink ? 0xff6f9a : 0xffb84d, ei: 0 });
      const b = ball(.0058, m, [p.x, p.y, p.z], 10); b.castShadow = false; stage.add(b);
      const socket = cyl(.0028, .0028, .006, wireMat, [p.x, p.y + .007, p.z], 6); socket.castShadow = false; stage.add(socket);
      const g = kit.glow({ color: pink ? 0xff9fbe : 0xffcf7a, size: .052, opacity: 0 }); g.position.copy(p); stage.add(g);
      bulbs.push({ at: p, set(k) { m.emissiveIntensity = 2.4 * k; g.material.opacity = .85 * k; } });
    }
    return at;
  });
  const fairy = [new THREE.PointLight(0xffc98a, 0, 1, 1.6), new THREE.PointLight(0xffc0d0, 0, 1, 1.6)];
  fairy[0].position.set(-.12, .3, -.04); fairy[1].position.set(.32, .32, .03); stage.add(...fairy);

  /* ── polaroids on pegs along the back span, between its bulbs: three from the start, each lit by the bulb after it,
        and three that come down between them at the end ── */
  const hanger = (t, slot) => {
    const hang = new THREE.Group(); hang.position.copy(spans[2](t)).add(new THREE.Vector3(0, -.002, .004)); stage.add(hang);
    hang.add(box(.006, .016, .006, mat('#e8c08a', { r: .6 }), [0, -.005, .003]));
    const swing = new THREE.Group(); swing.position.y = -.011; hang.add(swing);
    const ph = kit.photo({ frame: 'white', width: .068, aspect: 1, border: .07, slot, of: PLACES, glow: .3 });
    ph.root.position.y = -ph.height / 2; swing.add(ph.root);
    swing.add(box(ph.width, .016, .006, white, [0, -ph.height - .008, 0]));   // the polaroid's wide bottom
    const halo = kit.glow({ color: 0xffe2a8, size: .15, opacity: 0 }); halo.position.set(0, -ph.height / 2, -.012); swing.add(halo);
    return { hang, swing, photo: ph, halo, bulb: BACK + Math.round(t * 10) };
  };
  const strung = [[.3, 3], [.5, 12], [.7, 10]].map(([t, slot]) => hanger(t, slot));
  const polaroids = [[.4, 9], [.6, 5], [.8, 2]].map(([t, slot]) => { const p = hanger(t, slot); p.hang.visible = false; return p; });

  /* ── six clear balloons, each with a photo inside that turns to face the phone, in an arch over her ── */
  const bubble = tint => keep(new THREE.ShaderMaterial({
    uniforms: { uTint: { value: new THREE.Color(tint) } },
    vertexShader: `varying vec3 vN, vV;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uTint; varying vec3 vN, vV;
      void main() { vec3 n = normalize(vN), v = normalize(vV); float rim = pow(1.0 - abs(dot(n, v)), 2.3);
        float spec = pow(max(dot(n, normalize(vec3(-.45, .55, .7))), 0.0), 60.0) + .35 * pow(max(dot(n, normalize(vec3(.5, -.3, .8))), 0.0), 30.0);
        gl_FragColor = vec4(mix(uTint, vec3(1.0), clamp(rim * .55 + spec, 0.0, 1.0)), .05 + .7 * rim + .85 * spec); }`,
    transparent: true, depthWrite: false
  }));
  const SPOTS = [[-.3, .56, -.205], [-.42, .685, -.2], [-.24, .765, -.21], [.24, .765, -.21], [.37, .65, -.2], [.44, .5, -.205]];   // the left ones clear of the sign's polaroid
  const FROM = [-.24, -.27, -.17, .17, .3, .4];                         // where each rises from, behind the parapet
  const TINTS = ['#ffd9e6', '#fff0d6', '#e9ddff', '#ffd9e6', '#dff2ff', '#fff0d6'];
  const TIES = [new THREE.Vector3(-.235, CAP, WALL.z - .004), new THREE.Vector3(-.352, FLOOR + HUT.h + .017, -.2), new THREE.Vector3(.235, CAP, WALL.z - .004)];
  const sphere = keep(new THREE.SphereGeometry(BALLOON_R, 36, 26)), knotGeo = keep(new THREE.ConeGeometry(.007, .012, 10));
  const unitString = keep(new THREE.CylinderGeometry(.0011, .0011, 1, 5, 1, true)); unitString.translate(0, .5, 0);
  const stringMat = mat('#fff7ee', { r: .6 });
  const balloons = SPOTS.map((home, i) => {
    const root = new THREE.Group(); root.visible = false; stage.add(root);
    const photo = kit.photo({ frame: 'white', width: .1, aspect: 1, border: .06, slot: [1, 8, 4, 11, 6, 13][i], of: PLACES, glow: .5 });   // neighbours differ, however few photos
    root.add(photo.root);
    const shell = noHit(new THREE.Mesh(sphere, bubble(TINTS[i]))); shell.renderOrder = 3; root.add(shell);
    const knot = noHit(mesh(knotGeo, keep(new THREE.MeshStandardMaterial({ color: TINTS[i], roughness: .3, transparent: true, opacity: .75 })), [0, -BALLOON_R - .004, 0], false));
    knot.rotation.x = Math.PI; root.add(knot);
    const string = noHit(new THREE.Mesh(unitString, stringMat)); string.visible = false; stage.add(string);
    return { root, photo, string, home: new THREE.Vector3(...home), from: FROM[i], tie: TIES[i === 1 ? 1 : i < 3 ? 0 : 2] };
  });
  for (const t of TIES) {                                               // a bow where each bunch is tied
    const bow = new THREE.Group(); bow.position.copy(t).add(new THREE.Vector3(0, .004, .006)); stage.add(bow);
    for (const s of [-1, 1]) { const l = mesh(keep(new THREE.TorusGeometry(.008, .0024, 6, 14)), mat('#ff8fab', { r: .5 }), [s * .008, 0, 0], false); l.rotation.set(0, 0, s * .5); bow.add(l); }
    const knot = ball(.004, mat('#e8436d', { r: .5 }), [0, 0, 0], 8); knot.castShadow = false; bow.add(knot);
  }
  const vA = new THREE.Vector3(), vB = new THREE.Vector3();
  /** the string from a balloon's knot down to where its bunch is tied */
  function stringOf(b) {
    vA.copy(b.root.position).add(vB.set(0, -BALLOON_R - .01, 0));
    vB.subVectors(vA, b.tie); const L = vB.length();
    b.string.position.copy(b.tie); b.string.quaternion.setFromUnitVectors(UP, vB.normalize()); b.string.scale.set(1, L, 1);
  }

  /* ── the heart frame with the first photo, pearls round it, a glow behind ── */
  const HERO_W = .26, heroRoot = new THREE.Group(); heroRoot.position.set(0, .72, -.08); heroRoot.visible = false; stage.add(heroRoot);
  const hero = kit.photo({ hero: true, frame: 'none', width: HERO_W, aspect: 1, glow: .62 });
  hero.material.alphaMap = kit.canvasTexture(256, 256, (c, w) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, w); c.fillStyle = '#fff'; kit.heartPath(c, w / 2, w * .53, w * .98); c.fill(); });
  hero.material.alphaTest = .5; hero.material.needsUpdate = true;
  hero.face.material.forEach((m, i) => { if (i !== 4) m.visible = false; });   // only the picture, cut to a heart
  heroRoot.add(hero.root);
  const heartShape = (s, oy, sh = new THREE.Shape()) => {
    sh.moveTo(0, oy - .42 * s); sh.bezierCurveTo(-.62 * s, oy, -.5 * s, oy + .55 * s, 0, oy + .25 * s); sh.bezierCurveTo(.5 * s, oy + .55 * s, .62 * s, oy, 0, oy - .42 * s);
    return sh;
  };
  const HS = .98 * HERO_W, HY = -.03 * HERO_W, ring = heartShape(HS * 1.15, HY); ring.holes.push(heartShape(HS * .97, HY, new THREE.Path()));
  const rose = keep(new THREE.MeshStandardMaterial({ color: '#f4a6bb', roughness: .28, metalness: .55, emissive: '#e8436d', emissiveIntensity: .25 }));
  rose.envMap = kit.env; rose.envMapIntensity = 1.2;
  heroRoot.add(noHit(mesh(keep(new THREE.ExtrudeGeometry(ring, { depth: .008, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 2, curveSegments: 28 })), rose, [0, 0, -.002], false)));
  const pearlMat = own('#fffaf2', { r: .25, e: 0xfff1d0, ei: .3 }), mid = heartShape(HS * 1.06, HY).getSpacedPoints(26);
  mid.slice(0, -1).forEach(p => { const pearl = noHit(ball(.0052, pearlMat, [p.x, p.y, .013], 8)); pearl.castShadow = false; heroRoot.add(pearl); });
  const heroHalo = kit.glow({ color: 0xffc2d4, size: .52, opacity: 0 }); heroHalo.position.z = -.03; heroRoot.add(heroHalo);

  /* ── the stars, for the night ── */
  const stars = kit.particles({ max: 90, additive: true }); stage.add(stars.root);

  /* ── which way the phone is: the act's photos inside balloons turn to it ── */
  let camera = null;
  const probe = new THREE.Mesh(keep(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3))),
    keep(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false })));
  probe.frustumCulled = false; probe.raycast = () => {}; probe.onBeforeRender = (r, s, cam) => { camera = cam; }; stage.add(probe);
  const camAt = new THREE.Vector3();
  const faceCamera = o => { if (!camera) return; camera.getWorldPosition(camAt); o.lookAt(camAt); };

  return {
    FLOOR,
    sky: { night: skyNight, windows: lit, moon, stars },
    door, lampGlow, sign: { root: sign, glow: signGlow },
    bulbs, fairy, cake: { root: cake, flames, light: candleLight },
    balloons, stringOf, strung, polaroids, hero: { root: heroRoot, halo: heroHalo, pearls: pearlMat },
    faceCamera
  };
};
