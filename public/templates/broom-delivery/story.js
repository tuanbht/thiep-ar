/* Thư tình bay qua phố biển (a love letter flies over the sea town), told by the shared act _acts/lovestory.js. Three
   chapters, each ending at a stop:
     1 · 0–6.2 s     a harbour town pops up out of the card at golden hour; by the night post office a young witch hops
                     onto her broom with a letter, rises in a swirl of sparkles and banks round over the rooftops while a
                     boy waves from his roof terrace; an airmail label with the card's first words (note1) comes up
     2 · 6.2–12.4 s  she swoops low past you, lands on his terrace and steps off; she hands him the letter, he opens it,
                     the heart seal pops and the card's photo rises out of the envelope with its caption
     3 · 12.4–19 s   the photo is pegged on his washing line; they hop onto the broom one after the other and draw a heart
                     of sparkles in the dusk sky while the lighthouse sweeps; they hover over the town, his arms round
                     her, and a banner with the last words (note2) rises
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words, fitText } = kit;   // fitText: words as big as they fit, on my canvases
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const ROOF = .12;                                                  // his terrace: the flat roof of his house
  const TER = { x: .265, z: -.035, w: .3, d: .19 };
  const PO = { x: -.33, z: -.085 }, START = { x: -.27, z: .1 };     // the night post office; where she sets out from
  const HIM = { x: .37, z: -.025 };                                  // where he waits on his terrace
  const LIGHT = { x: .43, z: -.19 };                                 // the lighthouse, on its rocks
  const HEART = { x: 0, y: .666, z: -.235, w: .5 };                    // the heart they draw in the dusk sky: its tip .4 up, clear of the roofs
  const SKY = { width: 1.12, height: 1.1, curve: .12 };              // the painted page at the back
  const LINE = { x0: .22, x1: .41, y: ROOF + .14, z: -.1 };          // his washing line
  const DAY = { hemi: new THREE.Color('#ffe9cf'), ground: new THREE.Color('#c79a8c'), sun: new THREE.Color('#ffdcb4') };
  const DUSK = { hemi: new THREE.Color('#b9b5ff'), ground: new THREE.Color('#4d3b68'), sun: new THREE.Color('#d2bcff') };
  let girl, boy, hat, capes = [], ribbons = [], broom, env, label, photo, banner;
  let skyDay, skyDusk, town = [], beam, lamp, lampGlow, lamps = [], windows = [], gulls = [], washing = [], flags = [];
  let sparks, trail, hearts, dust, stars, lineGroup;

  /* ── who does what, from story time g: [from g, clip, options] ── */
  const GIRL = [
    [0, 'Idle'], [1.2, 'Jump_Full_Short', { once: true, fade: .15 }], [1.55, 'Sit_Chair_Idle', { fade: .18 }],
    [7.4, 'Sit_Chair_StandUp', { once: true, fade: .15 }], [8.15, 'Idle', { fade: .25 }], [8.5, 'Use_Item', { once: true, fade: .2 }],
    [10.1, 'Idle', { fade: .35 }], [12.95, 'Jump_Full_Short', { once: true, fade: .15 }], [13.3, 'Sit_Chair_Idle', { fade: .18 }]
  ];
  const BOY = [
    [0, 'Idle'], [4.4, 'Cheer', { once: true, fade: .2 }], [6.05, 'Idle', { fade: .3 }], [8.25, 'Walking_A', { speed: .7, fade: .2 }],
    [8.65, 'Idle', { fade: .2 }], [8.85, 'Interact', { once: true, fade: .2 }], [10.1, 'Idle', { fade: .35 }],
    [13.45, 'Walking_A', { speed: 1.2, fade: .2 }], [13.85, 'Jump_Full_Short', { once: true, fade: .15 }], [14.2, 'Sit_Chair_Idle', { fade: .18 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  /* bursts: a ring of dust where something lands, sparkles flying up from a point, little hearts */
  const puff = (x, y, z, n, r, size) => dust.burst(n, i => { const a = i / n * TAU; return { x: x + Math.cos(a) * r, y, z: z + Math.sin(a) * r * .75,
    vx: Math.cos(a) * .16, vy: .03, vz: Math.sin(a) * .1, drag: 2.8, color: '#fff3e0', size, grow: 1.1, life: .65, shape: 'glow' }; });
  const fizz = (x, y, z, n, s = .3) => sparks.burst(n, () => ({ x, y, z, vx: (rng() - .5) * s, vy: rng() * s, vz: (rng() - .5) * s * .6, drag: 2.4,
    color: ['#fff1b8', '#ffd1dc', '#ffffff', '#b8f0e8'][(rng() * 4) | 0], size: .018, life: .8, shape: rng() < .6 ? 'sparkle' : 'glow', spin: 4 }));
  const love = (x, y, z, n, s = .2, zs = .5) => hearts.burst(n, () => ({ x, y, z, vx: (rng() - .5) * s, vy: .1 + rng() * s, vz: (rng() - .5) * s * zs, gravity: -.12,
    drag: .8, color: ['#ff4f7b', '#ff8fab', '#ffc2d1', '#e8436d'][(rng() * 4) | 0], size: .02 + rng() * .016, life: 2.1, shape: 'heart', spin: (rng() - .5) * 3 }));

  /* ── small makers ── */
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .8, ...o }));
  const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(kit.keep(geo), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
  /* ── the sky over the sea, painted at golden hour and again at dusk (that one fades in over the first) ── */
  function paintSky(dusk) {
    return (c, W, H) => {
      const r = seeded(dusk ? 91 : 47), hz = Math.round(H * (1 - .3 / SKY.height)), sx = W * .63;   // the horizon .3 above the card
      let g = c.createLinearGradient(0, 0, 0, hz);
      (dusk ? [[0, '#1d235c'], [.42, '#4c4590'], [.74, '#c46d9b'], [.92, '#ff9c7a'], [1, '#ffc48c']]
        : [[0, '#84a0e6'], [.36, '#e8a9c6'], [.68, '#ffc39c'], [.88, '#ffdc9e'], [1, '#fff1bc']]).forEach(([k, col]) => g.addColorStop(k, col));
      c.fillStyle = g; c.fillRect(0, 0, W, hz + 2);
      g = c.createRadialGradient(sx, hz, 0, sx, hz, W * (dusk ? .34 : .3));
      g.addColorStop(0, dusk ? 'rgba(255,170,130,.8)' : 'rgba(255,250,220,1)'); g.addColorStop(1, 'rgba(255,214,170,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, hz);
      if (dusk) for (let i = 0; i < 110; i++) { c.fillStyle = `rgba(255,246,226,${.35 + r() * .65})`; c.beginPath(); c.arc(r() * W, r() * hz * .58, .7 + r() * 1.7, 0, TAU); c.fill(); }
      else { c.fillStyle = '#fff7dc'; c.beginPath(); c.arc(sx, hz - W * .02, W * .052, 0, TAU); c.fill(); }   // the first stars, or the low sun
      const tint = dusk ? ['#e48cad', '#ffae8d', '#8e78c4'] : ['#fff3e6', '#ffd0c6', '#ffe1b6'];
      c.globalAlpha = dusk ? .7 : .8;
      for (let i = 0; i < 8; i++) {                                // long soft clouds, lit from below
        const cx = r() * W, cy = hz * (.16 + r() * .6), w = W * (.1 + r() * .16), h = hz * (.022 + r() * .022);
        for (let k = 0; k < 4; k++) { c.fillStyle = tint[k % 3]; c.beginPath(); c.ellipse(cx + (r() - .5) * w * .8, cy + (k - 1.5) * h * .5, w * (.3 + r() * .3), h * (.6 + r() * .4), 0, 0, TAU); c.fill(); }
      }
      c.globalAlpha = 1;
      for (const [x0, x1, top, col] of [[-.05, .3, .055, dusk ? '#3d3463' : '#9a8fc4'], [.74, 1.05, .04, dusk ? '#463a6e' : '#a99bc8'], [.18, .42, .025, dusk ? '#544479' : '#b8a8d0']]) {
        c.fillStyle = col; c.beginPath(); c.moveTo(x0 * W, hz + 1);    // islands far out on the horizon
        for (let k = 0; k <= 12; k++) { const t = k / 12; c.lineTo(lerp(x0, x1, t) * W, hz - top * H * Math.sin(Math.PI * t) * (.75 + .25 * Math.sin(t * 9 + x0 * 7))); }
        c.lineTo(x1 * W, hz + 1); c.fill();
      }
      g = c.createLinearGradient(0, hz, 0, H);                      // the sea, the sun's path of glitter on it
      (dusk ? [[0, '#c27a9e'], [.25, '#5d4f92'], [1, '#262a62']] : [[0, '#ffd6a8'], [.22, '#8ab3d9'], [.6, '#4f86bd'], [1, '#2f5f98']]).forEach(([k, col]) => g.addColorStop(k, col));
      c.fillStyle = g; c.fillRect(0, hz, W, H - hz);
      for (let i = 0; i < 260; i++) {
        const y = hz + 3 + Math.pow(r(), 1.6) * (H - hz - 6), k = (y - hz) / (H - hz), x = sx + (r() - .5) * 2 * W * (.03 + .22 * k) * (r() < .7 ? .5 : 1);
        c.fillStyle = dusk ? `rgba(255,190,200,${.25 + r() * .4})` : `rgba(255,246,206,${.45 + r() * .5})`; c.fillRect(x, y, 3 + r() * 14 * (1 - k * .5), 1.5 + k * 1.5);
      }
      c.strokeStyle = dusk ? 'rgba(200,190,255,.18)' : 'rgba(255,255,255,.28)'; c.lineWidth = 1.4;
      for (let i = 0; i < 40; i++) { const x = r() * W, y = hz + 8 + r() * (H - hz - 10), w = 8 + r() * 26; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + w / 2, y - 3, x + w, y); c.stroke(); }
      for (const [x, s] of [[.16, 1], [.86, .8], [.47, .6]]) {      // sailboats far out
        const bx = x * W, by = hz + 6, k = s * W / 1024;
        c.fillStyle = dusk ? '#2b2850' : '#5b4a6e'; c.beginPath(); c.moveTo(bx - 13 * k, by); c.lineTo(bx + 13 * k, by); c.lineTo(bx + 9 * k, by + 5 * k); c.lineTo(bx - 9 * k, by + 5 * k); c.fill();
        c.fillStyle = dusk ? '#d9c7ef' : '#fff8ec'; c.beginPath(); c.moveTo(bx, by - 30 * k); c.lineTo(bx + 11 * k, by - 2 * k); c.lineTo(bx, by - 2 * k);
        c.moveTo(bx - 1.5 * k, by - 24 * k); c.lineTo(bx - 10 * k, by - 2 * k); c.lineTo(bx - 1.5 * k, by - 2 * k); c.fill();
      }
    };
  }

  /* ── the town ── */
  /** a house front, painted: plaster, windows with shutters and flower boxes, a door; lit, only the panes, in lamp light
      (for its glow at dusk). Positions are fractions of the face */
  function facade(o, lit) {
    return (c, W, H) => {
      const r = seeded(o.seed);
      c.fillStyle = lit ? '#000000' : o.wall; c.fillRect(0, 0, W, H);
      if (!lit) {
        for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(120,80,60,${.03 + r() * .05})`; c.beginPath(); c.ellipse(r() * W, r() * H, 4 + r() * 10, 2 + r() * 5, 0, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(70,40,30,.18)'; c.fillRect(0, H - H * .05, W, H * .05);   // a darker plinth
      }
      for (const [x, y, w, h] of o.windows) {
        const X = x * W, Y = y * H, ww = w * W, hh = h * H;
        if (lit) { c.fillStyle = '#ffce7c'; c.fillRect(X - ww / 2, Y - hh / 2, ww, hh); continue; }
        c.fillStyle = o.shutter; c.fillRect(X - ww / 2 - ww * .42, Y - hh / 2, ww * .38, hh); c.fillRect(X + ww / 2 + ww * .04, Y - hh / 2, ww * .38, hh);
        c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 1.5;
        for (const sx of [X - ww / 2 - ww * .42, X + ww / 2 + ww * .04]) for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(sx + 2, Y - hh / 2 + hh * k / 5); c.lineTo(sx + ww * .38 - 2, Y - hh / 2 + hh * k / 5); c.stroke(); }
        c.fillStyle = '#3d4f78'; c.fillRect(X - ww / 2, Y - hh / 2, ww, hh);
        c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.moveTo(X - ww / 2, Y + hh * .1); c.lineTo(X - ww * .1, Y - hh / 2); c.lineTo(X + ww * .12, Y - hh / 2); c.lineTo(X - ww / 2, Y + hh * .35); c.fill();
        c.strokeStyle = '#fffaf0'; c.lineWidth = Math.max(2, ww * .1); c.strokeRect(X - ww / 2, Y - hh / 2, ww, hh);
        c.beginPath(); c.moveTo(X, Y - hh / 2); c.lineTo(X, Y + hh / 2); c.moveTo(X - ww / 2, Y); c.lineTo(X + ww / 2, Y); c.lineWidth = Math.max(1.5, ww * .06); c.stroke();
        if (o.flowers) {                                             // a window box with flowers
          c.fillStyle = '#8a5a3c'; c.fillRect(X - ww * .62, Y + hh / 2, ww * 1.24, hh * .16);
          for (let k = 0; k < 6; k++) { c.fillStyle = ['#ff6f91', '#ffd166', '#ffffff', '#e64a6f'][(r() * 4) | 0]; c.beginPath(); c.arc(X - ww * .5 + r() * ww, Y + hh / 2 - 1, 2.5 + r() * 3, 0, TAU); c.fill(); }
          c.fillStyle = '#4f9a52'; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(X - ww * .5 + r() * ww, Y + hh / 2 + 2, 4, 2, r(), 0, TAU); c.fill(); }
        }
      }
      if (o.door) {
        const [x, w, h] = o.door, X = x * W, ww = w * W, hh = h * H;
        if (lit) { c.fillStyle = '#4a3010'; c.fillRect(X - ww * .3, H - hh * .95, ww * .6, hh * .15); return; }
        c.fillStyle = o.doorColor || '#3a6fb0'; c.beginPath(); c.moveTo(X - ww / 2, H); c.lineTo(X - ww / 2, H - hh + ww / 2); c.arc(X, H - hh + ww / 2, ww / 2, Math.PI, 0); c.lineTo(X + ww / 2, H); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(X, H - hh + ww * .3); c.lineTo(X, H); c.stroke();
        c.fillStyle = '#ffd36e'; c.beginPath(); c.arc(X + ww * .3, H - hh * .45, Math.max(2, ww * .06), 0, TAU); c.fill();
      }
    };
  }
  /** tiles on a roof: rows of scallops in shades of its colour */
  function tiles(color) {
    return (c, W, H) => {
      const base = new THREE.Color(color), r = seeded(color.length * 31 + color.charCodeAt(1));
      c.fillStyle = color; c.fillRect(0, 0, W, H);
      for (let y = 0, row = 0; y < H; y += 12, row++) for (let x = (row % 2) * 8 - 8; x < W; x += 16) {
        const k = .82 + r() * .3; c.fillStyle = `#${base.clone().multiplyScalar(k).getHexString()}`;
        c.beginPath(); c.arc(x + 8, y + 2, 8, 0, Math.PI); c.fill();
        c.strokeStyle = 'rgba(60,20,10,.25)'; c.lineWidth = 1.2; c.beginPath(); c.arc(x + 8, y + 2, 8, 0, Math.PI); c.stroke();
      }
    };
  }
  /** a house with a gabled roof (its gable to the front): a painted front, tiled slopes, a chimney if it wants one */
  function house(o) {
    const g = new THREE.Group(); g.position.set(o.x, 0, o.z); g.rotation.y = o.turn || 0;
    const wall = mat(o.wall), lit = kit.canvasTexture(128, Math.round(128 * o.h / o.w), facade(o, true));
    const face = mat('#ffffff', { map: kit.canvasTexture(256, Math.round(256 * o.h / o.w), facade(o, false)), emissive: 0xffffff, emissiveMap: lit, emissiveIntensity: 0 });
    g.add(mesh(new THREE.BoxGeometry(o.w, o.h, o.d), [wall, wall, wall, wall, face, wall], 0, o.h / 2, 0));
    const ov = .012, half = o.w / 2 + ov, slope = Math.hypot(half, o.rh), a = Math.atan2(o.rh, half);
    const tileTex = kit.canvasTexture(128, 128, tiles(o.roof)), roofM = mat('#ffffff', { map: tileTex, roughness: .7 });
    for (const s of [-1, 1]) {
      const slab = mesh(new THREE.BoxGeometry(slope + .006, .007, o.d + ov * 2), roofM, s * half / 2, o.h + o.rh / 2 + .003, 0);
      slab.rotation.z = -s * a; g.add(slab);
    }
    const gable = new THREE.Shape([new THREE.Vector2(-o.w / 2, 0), new THREE.Vector2(o.w / 2, 0), new THREE.Vector2(0, o.rh * .96)]);
    g.add(mesh(new THREE.ExtrudeGeometry(gable, { depth: o.d, bevelEnabled: false }), wall, 0, o.h, -o.d / 2));
    const round = mesh(new THREE.CircleGeometry(o.rh * .2, 16), mat('#3d4f78', { emissive: 0xffce7c, emissiveIntensity: 0 }), 0, o.h + o.rh * .36, o.d / 2 + .0008);
    g.add(round); round.castShadow = false;
    g.add(mesh(new THREE.CylinderGeometry(.004, .004, o.d + ov * 2, 6).rotateX(Math.PI / 2), mat(o.roof, { roughness: .6 }), 0, o.h + o.rh + .004, 0));
    if (o.chimney) g.add(mesh(new THREE.BoxGeometry(.016, .045, .016), mat('#b9705a'), o.w * .22, o.h + o.rh * .7, -o.d * .2));
    windows.push({ m: face, extra: round.material, at: o.lightAt });
    return g;
  }

  /* his house: flat roofed, its roof a terrace with a low wall, tiles, pots of flowers and a washing line */
  function terraceHouse() {
    const g = new THREE.Group(); g.position.set(TER.x, 0, TER.z);
    const { w, d } = TER, wall = mat('#fff4e2'), trim = mat('#3f78b8', { roughness: .6 });
    const o = { seed: 5, wall: '#fff4e2', shutter: '#3f9ea0', windows: [[.18, .45, .11, .4], [.78, .45, .11, .4], [.6, .45, .09, .4]], door: [.38, .14, .72], doorColor: '#3f78b8', flowers: true };
    const face = mat('#ffffff', { map: kit.canvasTexture(320, 128, facade(o, false)), emissive: 0xffffff, emissiveMap: kit.canvasTexture(160, 64, facade(o, true)), emissiveIntensity: 0 });
    const floor = mat('#ffffff', { map: kit.canvasTexture(256, 160, (c, W, H) => {   // terracotta tiles, each its own shade, pale grout
      const r = seeded(9); c.fillStyle = '#fff0e0'; c.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 20) for (let x = 0; x < W; x += 20) { c.fillStyle = `rgb(${226 - r() * 30},${172 - r() * 30},${136 - r() * 24})`; c.fillRect(x + 1, y + 1, 18, 18); }
    }) });
    g.add(mesh(new THREE.BoxGeometry(w, ROOF, d), [wall, wall, floor, wall, face, wall], 0, ROOF / 2, 0));
    windows.push({ m: face, at: 14.6 });
    const t = .008, ph = .022;                                       // the low wall round the terrace, a blue cap on it
    for (const [x, z, ww, dd] of [[0, -d / 2 + t / 2, w, t], [0, d / 2 - t / 2, w, t], [-w / 2 + t / 2, 0, t, d], [w / 2 - t / 2, 0, t, d]])
      g.add(mesh(new THREE.BoxGeometry(ww, ph, dd), wall, x, ROOF + ph / 2, z), mesh(new THREE.BoxGeometry(ww + .004, .005, dd + .004), trim, x, ROOF + ph + .0025, z));
    g.add(mesh(new THREE.BoxGeometry(w + .01, .008, d + .01), trim, 0, ROOF - .0065, 0));   // a blue band under the roof's edge (below the floor: no flicker)
    const pot = mat('#c8653f', { roughness: .7 }), leaf = mat('#4f9e4f'), bloom = mat('#ff5d8f', { emissive: 0xff5d8f, emissiveIntensity: .1 });
    for (const [x, z, s] of [[-w / 2 + .02, d / 2 - .02, 1], [w / 2 - .022, d / 2 - .02, .85], [-w / 2 + .02, -d / 2 + .02, 1.1]]) {   // pots of bougainvillea
      g.add(mesh(new THREE.CylinderGeometry(.011 * s, .008 * s, .02 * s, 10), pot, x, ROOF + .01 * s, z), mesh(new THREE.SphereGeometry(.017 * s, 10, 8).scale(1, .85, 1), leaf, x, ROOF + .03 * s, z));
      for (let k = 0; k < 5; k++) { const a = k * 1.3 + x * 40; g.add(mesh(new THREE.SphereGeometry(.0055 * s, 6, 5), bloom, x + Math.cos(a) * .012 * s, ROOF + .036 * s + (k % 2) * .006, z + Math.sin(a) * .012 * s)); }
    }
    return g;
  }

  /* the night post office: a little shop with a blue roof, a signboard on top and a red post box by its door */
  function postOffice() {
    const g = house({ x: PO.x, z: PO.z, w: .17, d: .13, h: .14, rh: .06, seed: 3, wall: '#fff0c8', roof: '#3f6fbf', shutter: '#e0574f',
      windows: [[.2, .42, .16, .3], [.8, .42, .16, .3]], door: [.5, .2, .62], doorColor: '#e0574f', lightAt: 13.9 });
    const wood = mat('#6b4a33', { roughness: .7 }), sign = kit.canvasTexture(512, 128, (c, W, H) => {   // its name, an envelope and a heart; it lights at dusk
      c.fillStyle = '#23305e'; c.beginPath(); c.roundRect(4, 4, W - 8, H - 8, 18); c.fill();
      c.strokeStyle = '#ffd36e'; c.lineWidth = 6; c.beginPath(); c.roundRect(14, 14, W - 28, H - 28, 12); c.stroke();
      c.fillStyle = '#fff3d6'; fitText(c, 'Bưu cục Đêm', { x: 70, y: 10, w: W - 140, h: H - 20 }, { max: 70, maxLines: 1 });
      c.fillStyle = '#ffd36e'; c.fillRect(24, H / 2 - 14, 40, 28); c.strokeStyle = '#23305e'; c.lineWidth = 3; c.beginPath(); c.moveTo(24, H / 2 - 14); c.lineTo(44, H / 2 + 2); c.lineTo(64, H / 2 - 14); c.stroke();
      c.fillStyle = '#ff6f91'; kit.heartPath(c, W - 44, H / 2 + 2, 40); c.fill();
    });
    const plate = mat('#ffffff', { map: sign, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: .15 }), board = new THREE.Group();
    board.add(mesh(new THREE.BoxGeometry(.15, .038, .005), [wood, wood, wood, wood, plate, wood], 0, .012, .01), ...[-1, 1].map(s => mesh(new THREE.CylinderGeometry(.002, .002, .05, 6), wood, s * .06, -.02, .01)));
    board.position.y = .215; g.add(board); lamps.push({ sign: plate, at: 13.7 });
    const red = mat('#d8343f', { roughness: .45 }), box = new THREE.Group(); box.position.set(.105, 0, .1); g.add(box);   // the post box
    box.add(mesh(new THREE.CylinderGeometry(.016, .017, .05, 16), red, 0, .025, 0), mesh(new THREE.SphereGeometry(.016, 16, 8, 0, TAU, 0, Math.PI / 2), red, 0, .05, 0),
      mesh(new THREE.BoxGeometry(.016, .003, .004), mat('#2b1a1a'), 0, .042, .0155), mesh(new THREE.CylinderGeometry(.019, .019, .006, 16), mat('#7a1d24'), 0, .003, 0));
    return g;
  }

  /* the lighthouse: red and white bands on a rocky foot, a lantern that lights at the start and a beam that sweeps */
  function makeLighthouse() {
    const g = new THREE.Group(); g.position.set(LIGHT.x, 0, LIGHT.z);
    const rock = mat('#8d8279', { roughness: .95, flatShading: true });
    [[0, 0, .034], [.026, -.02, .02], [-.028, .012, .022], [.012, .03, .018], [-.014, -.03, .02]].forEach(([x, z, s]) => {
      const m = mesh(new THREE.DodecahedronGeometry(s, 0).scale(1, .6, 1), rock, x, s * .45, z); m.rotation.set(x * 30, z * 50, 0); g.add(m); });
    const bands = kit.canvasTexture(64, 256, (c, W, H) => {
      for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#fdf6ec' : '#d93b3b'; c.fillRect(0, i * H / 6, W, H / 6 + 1); }
      c.fillStyle = '#2a3150'; c.fillRect(W * .44, H * .9, W * .12, H * .1); c.fillRect(W * .46, H * .45, W * .08, H * .06);
    });
    g.add(mesh(new THREE.CylinderGeometry(.022, .032, .28, 24), mat('#ffffff', { map: bands, roughness: .6 }), 0, .02 + .14, 0));
    const dark = mat('#2a3150', { roughness: .5 }), red = mat('#d93b3b', { roughness: .5 });
    lamp = mesh(new THREE.CylinderGeometry(.017, .017, .032, 14), mat('#fff1c4', { emissive: 0xffc861, emissiveIntensity: 0, roughness: .2 }), 0, .326, 0); lamp.castShadow = false;
    g.add(mesh(new THREE.CylinderGeometry(.036, .03, .008, 24), dark, 0, .304, 0), mesh(new THREE.TorusGeometry(.034, .0016, 6, 28).rotateX(Math.PI / 2), dark, 0, .322, 0), lamp,
      mesh(new THREE.ConeGeometry(.026, .032, 18), red, 0, .358, 0), mesh(new THREE.SphereGeometry(.005, 8, 6), dark, 0, .377, 0));
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; g.add(mesh(new THREE.CylinderGeometry(.0012, .0012, .018, 4), dark, Math.cos(a) * .034, .313, Math.sin(a) * .034)); }
    lampGlow = kit.glow({ color: 0xffe2a0, size: .14, opacity: 0 }); lampGlow.position.y = .326; g.add(lampGlow);
    const fade = kit.canvasTexture(16, 128, (c, W, H) => {            // the beam: bright at the lamp, gone at its far end
      const gr = c.createLinearGradient(0, 0, 0, H); [[0, .95], [.3, .45], [1, 0]].forEach(([k, a]) => gr.addColorStop(k, `rgba(255,238,195,${a})`)); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    });
    beam = new THREE.Group(); beam.position.y = .326; g.add(beam);
    const cone = new THREE.CylinderGeometry(.004, .06, .34, 20, 1, true).translate(0, -.17, 0).rotateZ(Math.PI / 2);   // its tip at the lamp, along +x
    for (const s of [0, Math.PI]) {                                   // two beams, back to back
      const m = new THREE.Mesh(kit.keep(cone), kit.keep(new THREE.MeshBasicMaterial({ map: fade, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, color: 0xffe9b8 })));
      m.rotation.set(0, s, -.08); m.renderOrder = 4; beam.add(m);
    }
    return g;
  }

  /* lamp posts on the square, lit at dusk */
  function lampPost(x, z, at) {
    const g = new THREE.Group(), iron = mat('#2f4a3c', { roughness: .5, metalness: .3 }), glow = kit.glow({ color: 0xffc070, size: .1, opacity: 0 });
    const glass = mesh(new THREE.BoxGeometry(.014, .02, .014), mat('#fff2cf', { emissive: 0xffb050, emissiveIntensity: 0, roughness: .3 }), 0, .158, 0);
    g.add(mesh(new THREE.CylinderGeometry(.0035, .005, .15, 8), iron, 0, .075, 0), mesh(new THREE.CylinderGeometry(.009, .011, .008, 10), iron, 0, .004, 0),
      glass, mesh(new THREE.ConeGeometry(.013, .012, 4).rotateY(Math.PI / 4), iron, 0, .174, 0), glow);
    g.position.set(x, 0, z); glow.position.y = .158; lamps.push({ glass: glass.material, glow, at });
    return g;
  }

  /* washing on his line, and bunting from the post office across the square: each piece sways from its own pin */
  function hangOn(parent, pts, color, x, y, z, w) {
    const pin = new THREE.Group(), m = mesh(new THREE.ShapeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(...p)))), mat(color, { side: THREE.DoubleSide, roughness: .9 }));
    m.scale.setScalar(w); pin.position.set(x, y, z); pin.add(m); parent.add(pin);
    return pin;
  }
  const SHIRT = [[-.5, 0], [-.85, -.18], [-.68, -.42], [-.45, -.32], [-.42, -1], [.42, -1], [.45, -.32], [.68, -.42], [.85, -.18], [.5, 0], [.18, 0], [0, -.14], [-.18, 0]];
  const DRESS = [[-.3, 0], [-.36, -.35], [-.62, -1.1], [.62, -1.1], [.36, -.35], [.3, 0], [.12, 0], [0, -.1], [-.12, 0]];
  const TOWEL = [[-.5, 0], [-.5, -1.2], [.5, -1.2], [.5, 0]], PENNANT = [[-.5, 0], [0, -1.1], [.5, 0]];
  function lines() {
    const g = lineGroup = new THREE.Group(), cord = mat('#f4efe6', { roughness: .9 }), pole = mat('#6b4a33', { roughness: .7 });
    for (const x of [LINE.x0, LINE.x1]) g.add(mesh(new THREE.CylinderGeometry(.002, .0025, LINE.y - ROOF + .01, 6), pole, x, (LINE.y + ROOF) / 2, LINE.z));
    g.add(mesh(new THREE.CylinderGeometry(.0009, .0009, LINE.x1 - LINE.x0, 4).rotateZ(Math.PI / 2), cord, (LINE.x0 + LINE.x1) / 2, LINE.y, LINE.z));
    [[SHIRT, '#6fc3df', LINE.x0 + .02, .034], [TOWEL, '#ffd166', LINE.x0 + .046, .022], [DRESS, '#ff8fab', LINE.x1 - .02, .034]]   // a gap for the photo
      .forEach(([pts, col, x, w]) => washing.push(hangOn(g, pts, col, x, LINE.y, LINE.z + .002, w)));
    const from = new THREE.Vector3(PO.x + .07, .215, PO.z + .02), to = new THREE.Vector3(LINE.x0, LINE.y + .004, LINE.z), n = 15;   // bunting
    const at = t => new THREE.Vector3().lerpVectors(from, to, t).add({ x: 0, y: -.05 * Math.sin(Math.PI * t), z: 0 });
    const pts = Array.from({ length: 21 }, (_, i) => at(i / 20));
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .0008, 4), cord));
    for (let i = 1; i < n; i++) flags.push(hangOn(g, PENNANT, ['#e8436d', '#ffd166', '#4fb3c8', '#ffffff', '#7bc47f'][i % 5], ...at(i / n).toArray(), .022));
    return g;
  }

  /* gulls: a white body, grey wings that flap and glide */
  function makeGull() {
    const g = new THREE.Group(), white = mat('#ffffff', { roughness: .6 }), grey = mat('#a7b2c2', { roughness: .6 });
    g.add(mesh(new THREE.SphereGeometry(1, 10, 8).scale(.008, .007, .019), white), mesh(new THREE.SphereGeometry(.0062, 8, 6), white, 0, .004, .015),
      mesh(new THREE.ConeGeometry(.002, .008, 6).rotateX(Math.PI / 2), mat('#f2a33a'), 0, .003, .024));
    const wings = [-1, 1].map(s => {                                  // each on a pin at the body's side, to flap
      const w = new THREE.Group(); w.position.set(s * .006, .003, 0); g.add(w);
      w.add(mesh(new THREE.BoxGeometry(.024, .0015, .011), white, s * .012, 0, 0), mesh(new THREE.BoxGeometry(.018, .0015, .008), grey, s * .03, 0, -.002)); return w;
    });
    return { root: g, wings };
  }
  const FLOCK = [{ c: [-.47, .4, -.08], r: .06, w: 1.3, ph: 0 }, { c: [.4, .5, -.14], r: .06, w: -1.1, ph: 2 }, { c: [-.3, .86, -.16], r: .1, w: .7, ph: 4 }];   // all in front of the page

  /* ── the broom: a wooden handle, a straw brush bound in red cord. Its origin is where she sits; +z is its tip ── */
  function makeBroom() {
    const b = new THREE.Group(), wood = mat('#8b5a33', { roughness: .55 }), cord = mat('#d6453d', { roughness: .5 });
    b.add(mesh(new THREE.CylinderGeometry(.0042, .005, .25, 8).rotateX(Math.PI / 2).translate(0, 0, -.015), wood, 0, 0, 0));
    b.add(mesh(new THREE.SphereGeometry(.006, 10, 8), wood, 0, .0015, .112));
    const straw = kit.canvasTexture(64, 64, (c, W, H) => {
      c.fillStyle = '#e9c068'; c.fillRect(0, 0, W, H); const r = seeded(4);
      for (let i = 0; i < 40; i++) { c.strokeStyle = r() < .5 ? 'rgba(150,95,30,.45)' : 'rgba(255,240,180,.6)'; c.lineWidth = 1 + r(); c.beginPath(); const x = r() * W; c.moveTo(x, 0); c.lineTo(x + (r() - .5) * 6, H); c.stroke(); }
    });
    const prof = [[.0, .0], [.009, .002], [.012, .016], [.019, .045], [.025, .072], [.027, .086], [.021, .091], [.0, .092]].map(([x, y]) => new THREE.Vector2(x, y));
    b.add(mesh(new THREE.LatheGeometry(prof, 16).rotateX(-Math.PI / 2), mat('#ffffff', { map: straw, roughness: .9 }), 0, 0, -.138));
    for (const z of [-.141, -.15]) b.add(mesh(new THREE.TorusGeometry(.0105, .0022, 6, 16), cord, 0, 0, z));
    return b;
  }

  /* ── the letter: an airmail envelope, its flap shut with a red heart seal ── */
  const EW = .078, EH = .052;
  function airmailEdge(c, W, H, k) {                                // red and blue stripes all round, slanting
    c.save(); c.beginPath(); c.rect(0, 0, W, H); c.rect(k, k, W - 2 * k, H - 2 * k); c.clip('evenodd');
    for (let x = -H, i = 0; x < W + H; x += k * 1.4, i++) {
      c.fillStyle = ['#d8343f', '#fffaf0', '#2f5fa8', '#fffaf0'][i % 4]; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + k * 1.4, 0); c.lineTo(x + k * 1.4 - H, H); c.lineTo(x - H, H); c.fill();
    }
    c.restore();
  }
  function makeEnvelope() {
    const root = new THREE.Group(), paper = mat('#fff6e6', { roughness: .85 });
    const front = kit.canvasTexture(256, 172, (c, W, H) => {
      c.fillStyle = '#fff6e6'; c.fillRect(0, 0, W, H); airmailEdge(c, W, H, 12);
      c.fillStyle = '#ffffff'; c.fillRect(W - 66, 22, 42, 50); c.strokeStyle = '#2f5fa8'; c.lineWidth = 2; c.strokeRect(W - 62, 26, 34, 42);
      c.fillStyle = '#ff6f91'; kit.heartPath(c, W - 45, 48, 22); c.fill();
      c.strokeStyle = 'rgba(216,52,63,.75)'; c.lineWidth = 2; c.beginPath(); c.arc(W - 78, 52, 18, 0, TAU); c.stroke();
      for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(W - 140, 40 + k * 9); c.quadraticCurveTo(W - 120, 34 + k * 9, W - 98, 40 + k * 9); c.stroke(); }
      c.fillStyle = '#23305e'; fitText(c, 'Gửi người thương', { x: 30, y: 82, w: W - 70, h: 50 }, { max: 34, maxLines: 1 });
      c.strokeStyle = 'rgba(35,48,94,.4)'; c.lineWidth = 2; for (const y of [124, 142]) { c.beginPath(); c.moveTo(46, y); c.lineTo(W - 46, y); c.stroke(); }
    });
    const back = kit.canvasTexture(256, 172, (c, W, H) => {
      c.fillStyle = '#fff2de'; c.fillRect(0, 0, W, H); airmailEdge(c, W, H, 12);
      c.strokeStyle = 'rgba(150,110,70,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(12, H - 12); c.lineTo(W / 2, H * .45); c.lineTo(W - 12, H - 12); c.stroke();
    });
    root.add(mesh(new THREE.BoxGeometry(EW, EH, .0024), [paper, paper, paper, paper, mat('#ffffff', { map: front }), mat('#ffffff', { map: back })]));
    const hinge = new THREE.Group(), heart = new THREE.Shape(); hinge.position.set(0, EH / 2, -.0013); root.add(hinge);   // the flap folds on its top edge
    const flap = mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-EW / 2, 0), new THREE.Vector2(EW / 2, 0), new THREE.Vector2(0, -EH * .64)])), mat('#ffefd6', { side: THREE.DoubleSide, roughness: .85 }));
    heart.moveTo(0, -.006); heart.bezierCurveTo(-.012, .002, -.007, .011, 0, .0045); heart.bezierCurveTo(.007, .011, .012, .002, 0, -.006);
    const seal = mesh(new THREE.ExtrudeGeometry(heart, { depth: .002, bevelEnabled: true, bevelThickness: .0008, bevelSize: .0008, bevelSegments: 2 }),
      mat('#d42a4a', { roughness: .35, emissive: 0xd42a4a, emissiveIntensity: .15 }), 0, -EH * .58, -.0005);
    flap.rotation.y = seal.rotation.y = Math.PI; seal.scale.setScalar(1.15); hinge.add(flap, seal);   // both face out, on the back
    return { root, hinge, seal };
  }

  /* ── the first words, on an airmail label: striped edge, the post office's name, a stamp and a postmark ── */
  function makeLabel(text) {
    const W = .4, H = W * .64, cv = [1024, 655];
    const tex = kit.canvasTexture(cv[0], cv[1], (c, w, h) => {
      c.save(); c.shadowColor = 'rgba(40,30,60,.3)'; c.shadowBlur = 18; c.shadowOffsetY = 6; c.fillStyle = '#fffaf0';
      c.beginPath(); c.roundRect(14, 14, w - 28, h - 28, 26); c.fill(); c.restore();
      c.save(); c.beginPath(); c.roundRect(14, 14, w - 28, h - 28, 26); c.clip(); airmailEdge(c, w, h, 46); c.restore();
      c.fillStyle = '#23305e'; c.font = '800 34px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText('BƯU CỤC ĐÊM', 92, 108);
      c.fillStyle = '#d8343f'; c.beginPath(); c.roundRect(90, 136, 210, 52, 26); c.fill();
      c.fillStyle = '#ffffff'; c.font = '800 28px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif'; c.textAlign = 'center'; c.fillText('HỎA TỐC', 195, 163);
      c.save(); c.translate(w - 180, 140); c.rotate(.06);              // the stamp: a little broom and a heart
      c.fillStyle = '#ffffff'; c.fillRect(-62, -70, 124, 140);
      c.fillStyle = '#fffaf0'; for (let i = 0; i <= 8; i++) for (const [x, y] of [[-62 + i * 15.5, -70], [-62 + i * 15.5, 70], [-62, -70 + i * 17.5], [62, -70 + i * 17.5]]) { c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); }
      c.fillStyle = '#7fc8d8'; c.fillRect(-50, -58, 100, 116);
      c.fillStyle = '#ffd36e'; c.beginPath(); c.arc(22, -24, 16, 0, TAU); c.fill();
      c.strokeStyle = '#6b4a33'; c.lineWidth = 6; c.beginPath(); c.moveTo(-36, 34); c.lineTo(26, 4); c.stroke();
      c.fillStyle = '#e9c068'; c.beginPath(); c.moveTo(-36, 34); c.lineTo(-48, 22); c.lineTo(-52, 46); c.fill();
      c.fillStyle = '#e8436d'; kit.heartPath(c, 0, 40, 22); c.fill();
      c.fillStyle = '#23305e'; c.font = '800 18px "Be Vietnam Pro", Arial, sans-serif'; c.textAlign = 'center'; c.fillText('520đ', 28, 52);
      c.restore();
      c.strokeStyle = 'rgba(35,48,94,.25)'; c.lineWidth = 3; for (const y of [h - 250, h - 170, h - 90]) { c.beginPath(); c.moveTo(96, y); c.lineTo(w - 96, y); c.stroke(); }
      c.fillStyle = '#23305e'; fitText(c, text, { x: 96, y: 206, w: w - 192, h: h - 268 }, { maxLines: 3, max: 112 });
    });
    const root = new THREE.Group(), geo = kit.keep(new THREE.PlaneGeometry(W, H));
    const face = new THREE.Mesh(geo, kit.keep(new THREE.MeshStandardMaterial({ map: tex, roughness: .9, transparent: true, alphaTest: .05, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .42 })));
    const backM = kit.keep(new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: .95, side: THREE.BackSide }));
    face.castShadow = true; root.add(face, new THREE.Mesh(geo, backM));
    const mark = kit.picture((c, px) => {                            // the postmark it gets stamped with
      c.strokeStyle = 'rgba(200,40,60,.85)'; c.fillStyle = 'rgba(200,40,60,.85)'; c.lineWidth = px * .03;
      c.beginPath(); c.arc(px / 2, px / 2, px * .42, 0, TAU); c.stroke(); c.beginPath(); c.arc(px / 2, px / 2, px * .3, 0, TAU); c.stroke();
      c.font = `800 ${px * .085}px "Be Vietnam Pro", Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const say = 'BƯU CỤC ĐÊM · PHỐ BIỂN · ';
      for (let i = 0; i < say.length; i++) { c.save(); c.translate(px / 2, px / 2); c.rotate(i / say.length * TAU); c.fillText(say[i], 0, -px * .36); c.restore(); }
      c.font = `700 ${px * .13}px "Dancing Script", cursive`; c.fillText('thương', px / 2, px / 2);
    }, { size: .13 });
    return { root, W, H, mark };
  }

  /* ── recolouring: each character's look is one small texture of flat swatches (8 across, 4 down); paint some over
        in new colours, keeping their light and shade ── */
  function recolor(m, swatches) {
    let mt = null; m.scene.traverse(o => { if (!mt && o.isMesh && o.material && o.material.map) mt = o.material; });
    const img = mt && mt.map && mt.map.image; if (!img || !img.width) return;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d'), cw = img.width / 8, ch = img.height / 4; c.drawImage(img, 0, 0);
    for (const [row, col, color, lift = 0] of swatches) {             // its hue and colour; a little screen to lift a dark one
      c.save(); c.globalCompositeOperation = 'color'; c.fillStyle = color; c.fillRect(col * cw, row * ch, cw, ch);
      if (lift) { c.globalCompositeOperation = 'screen'; c.globalAlpha = lift; c.fillRect(col * cw, row * ch, cw, ch); } c.restore();
    }
    const old = mt.map, t = kit.keep(new THREE.CanvasTexture(cv));
    t.flipY = old.flipY; t.colorSpace = old.colorSpace; t.wrapS = old.wrapS; t.wrapT = old.wrapT; t.magFilter = old.magFilter; t.minFilter = old.minFilter;
    mt.map = t; mt.needsUpdate = true; old.dispose();
  }

  /* ── capes and ribbons that stream back in the wind of the flight and ripple ── */
  function cloth(node) {                                             // (the packed models keep their vertices interleaved)
    if (!node || !node.geometry) return null;
    const geo = node.geometry, p = geo.attributes.position, base = new Float32Array(p.count * 3);
    let top = -Infinity, bottom = Infinity;
    for (let i = 0; i < p.count; i++) { base[i * 3] = p.getX(i); base[i * 3 + 1] = p.getY(i); base[i * 3 + 2] = p.getZ(i); top = Math.max(top, base[i * 3 + 1]); bottom = Math.min(bottom, base[i * 3 + 1]); }
    return { node, geo, base, top, len: top - bottom || 1, rx: node.rotation.x };
  }
  /** lift: how far (radians) it streams back; amp: how much it ripples. The ripple runs down it, its hem curls back */
  function flutter(cl, lift, T, amp, ph = 0) {
    if (!cl) return;
    cl.node.rotation.x = cl.rx + lift;
    const p = cl.geo.attributes.position, b = cl.base;
    for (let i = 0; i < p.count; i++) {
      const s = (cl.top - b[i * 3 + 1]) / cl.len;                   // 0 where it hangs from, 1 at its hem
      p.setZ(i, b[i * 3 + 2] - cl.len * s * s * (amp * .07 * Math.sin(T * 11 + ph - s * 4) + lift * .12));
    }
    p.needsUpdate = true; cl.geo.computeVertexNormals();
  }
  function makeRibbon(parent, x, y, z, color, len) {                // a ribbon's tail on her hat, on a pin at the band
    const m = mesh(new THREE.PlaneGeometry(.12, len, 1, 6).translate(0, -len / 2, 0), mat(color, { side: THREE.DoubleSide, roughness: .5 })), pin = new THREE.Group();
    pin.position.set(x, y, z); pin.add(m); parent.add(pin);
    return { ...cloth(m), node: pin, rx: 0 };
  }

  /* ── flight: the broom's seat along a path, pointing where it goes and banking into its turns ── */
  const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal', .5);
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), eQ = new THREE.Euler(0, 0, 0, 'YXZ');
  const fly = { p: new THREE.Vector3(), yaw: 0, pitch: 0, roll: 0, speed: 0 };
  /** the pose at u along a path (the tangent there and a little ahead give its heading and its turn) */
  function along(path, u, speed) {
    const a = clamp(u, 0, .999);
    path.getPointAt(a, fly.p); path.getTangentAt(a, vA); path.getTangentAt(Math.min(1, a + .02), vB);
    fly.yaw = Math.atan2(vA.x, vA.z); fly.pitch = -Math.asin(clamp(vA.y, -1, 1)) * .55;
    fly.roll = clamp(-wrap(Math.atan2(vB.x, vB.z) - fly.yaw) * 2.2, -.4, .4); fly.speed = speed;
    return fly;
  }
  let PATH1, PATH2, PATH3, PATH4, heartLen = [];
  const HK = HEART.w / 32, TRAIL = ['#ff7aa8', '#ff9b7a', '#ffd36e'];   // the trail's colours, a third of the way each
  const heartAt = (t, out) => out.set(HEART.x + 16 * Math.sin(t) ** 3 * HK,
    HEART.y + (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * HK, HEART.z);
  /** the heart's own parameter at u (0..1) of the way round by length: from its tip up the left, over both lobes, down the right */
  function heartT(u) {
    const n = heartLen.length - 1, want = clamp(u) * heartLen[n];
    let i = 0; while (i < n && heartLen[i + 1] < want) i++;
    return Math.PI + (i + (want - heartLen[i]) / ((heartLen[i + 1] - heartLen[i]) || 1)) / n * TAU;
  }
  /** the broom on the heart at u: upright, side on over the lobes, turned a little to their left on the way up and down so he
      shows past her; the end of its brush on the curve (the sparkles come from there). Its tip never points away from you,
      so they fly in front of their trail and of the page. The curve leaves and meets its tip straight up */
  const HEART_YAW = -.4, HEART_IN = new THREE.Euler(), HEART_OUT = new THREE.Euler();   // their turn on the straight up and down; how they go in and out
  function heartBroom(u, out, q) {
    heartAt(heartT(Math.min(1, u + .005)), vH2).sub(heartAt(heartT(Math.max(0, u - .005)), vH)).normalize();
    const yaw = Math.atan2(vH2.x, .45) + HEART_YAW * (1 - Math.abs(vH2.x));
    q.setFromEuler(eQ.set(clamp(-vH2.y * .5, -.38, .38), yaw, .1 * Math.sin(u * 14) * Math.sin(Math.PI * u), 'YXZ'));
    return out.set(0, 0, .23).applyQuaternion(q).add(heartAt(heartT(u), vH));
  }

  /* a rider on the broom: the root sits this far from the broom's origin, in the broom's own space */
  const RIDE = { girl: new THREE.Vector3(0, -.042, .036), boy: new THREE.Vector3(0, -.043, .036 - .096) };
  const vR = new THREE.Vector3();
  function ride(m, who) { m.root.position.copy(vR.copy(RIDE[who]).applyQuaternion(broom.quaternion)).add(broom.position); m.root.quaternion.copy(broom.quaternion); }
  function setBroom(x, y, z, yaw, pitch = 0, roll = 0) {
    broom.position.set(x, y, z); broom.quaternion.setFromEuler(eQ.set(pitch, yaw, roll, 'YXZ'));
  }
  /** the broom's origin when a rider stands at (x, z) facing yaw, sitting on it */
  const seatUnder = (x, y, z, yaw) => [x - RIDE.girl.z * Math.sin(yaw), y - RIDE.girl.y, z - RIDE.girl.z * Math.cos(yaw)];

  /* arms: holding the handle; reaching to a point on the stage */
  const mStage = new THREE.Matrix4(), vS = new THREE.Vector3(), vTo = new THREE.Vector3(), qInv = new THREE.Quaternion();
  function grip(m, k, lean = 0) {
    if (!k) return;
    m.aim('upperarm.r', [-.16, -.62 + lean, .77], k); m.aim('lowerarm.r', [.12, -.42 + lean, .9], k);
    m.aim('upperarm.l', [.16, -.62 + lean, .77], k); m.aim('lowerarm.l', [-.12, -.42 + lean, .9], k);
  }
  function reach(m, side, target, k) {
    if (!k) return;
    const b = m.node(`upperarm.${side}`); b.updateWorldMatrix(true, false);
    vS.setFromMatrixPosition(b.matrixWorld).applyMatrix4(mStage);
    vTo.copy(target).sub(vS).applyQuaternion(qInv.copy(m.root.quaternion).invert());
    const d = [vTo.x, vTo.y, vTo.z]; m.aim(`upperarm.${side}`, d, k); m.aim(`lowerarm.${side}`, d, k);
  }
  const hand = (m, slot, out) => { const n = m.node(slot); n.updateWorldMatrix(true, false); return out.setFromMatrixPosition(n.matrixWorld).applyMatrix4(mStage); };

  const vH = new THREE.Vector3(), vH2 = new THREE.Vector3(), vE = new THREE.Vector3(), vX = new THREE.Vector3();
  let trailU = 0;

  return {
    seconds: [6.2, 6.2, 6.6],

    build() {
      /* the two of them: she in sea green with a coral cape and a smaller hat; he without his helmet, in sailor blue
         with a mustard cape */
      girl = kit.model('girl').fit({ height: .28, without: ['Mage_Hat'] }); boy = kit.model('boy').fit({ height: .29 });
      stage.add(girl.root, boy.root);
      recolor(girl, [[1, 1, '#1f8f86'], [1, 0, '#27a39b', .12], [1, 2, '#ff7a5c', .1], [0, 5, '#ffc94d', .2]]);
      recolor(boy, [[0, 3, '#3b6fb6'], [0, 7, '#f4f1ea', .5], [1, 2, '#3b6fb6'], [1, 0, '#f2b233', .15]]);
      hat = girl.node('Mage_Hat');
      if (hat) { hat.scale.multiplyScalar(.7); hat.position.y += .1; hat.position.z -= .09; hat.rotation.x = -.3; }
      capes = [cloth(girl.node('Mage_Cape')), cloth(boy.node('Knight_Cape'))];
      if (hat) ribbons = [makeRibbon(hat, -.16, .22, -.6, '#ffc94d', .7), makeRibbon(hat, .12, .2, -.62, '#ff7a5c', .62)];

      /* the sky and the sea, standing up at the back like a pop-up page */
      skyDay = kit.backdrop(paintSky(false), SKY); skyDusk = kit.backdrop(paintSky(true), { ...SKY, z: -.298, order: -.5 });
      skyDusk.material.opacity = 0;                                  // it writes depth: everything flies in front of it (skyDay.userData.zAt)
      stage.add(skyDay, skyDusk);

      /* the town */
      town = [
        [postOffice(), .1],
        [house({ x: -.455, z: -.165, w: .075, d: .08, h: .12, rh: .045, seed: 11, wall: '#d9efe0', roof: '#2a9d8f', shutter: '#f0a35e', windows: [[.5, .45, .3, .3]], door: null, lightAt: 15 }), .25],
        [house({ x: -.17, z: -.175, w: .1, d: .1, h: .19, rh: .06, seed: 12, wall: '#f8d9c9', roof: '#d9643a', shutter: '#4f9a8f', windows: [[.3, .3, .2, .16], [.72, .3, .2, .16], [.3, .66, .2, .16]], door: [.72, .26, .3], doorColor: '#4f6fa0', flowers: true, chimney: true, lightAt: 14.3 }), .35],
        [house({ x: -.045, z: -.2, w: .11, d: .085, h: .14, rh: .05, seed: 13, wall: '#d4e8f2', roof: '#f0b43c', shutter: '#e0574f', windows: [[.28, .38, .2, .22], [.72, .38, .2, .22]], door: [.5, .2, .3], doorColor: '#c8553d', flowers: true, lightAt: 14.9 }), .45],
        [house({ x: .085, z: -.18, w: .09, d: .1, h: .22, rh: .055, seed: 14, wall: '#fff8ee', roof: '#e2566d', shutter: '#3f78b8', windows: [[.5, .24, .26, .14], [.5, .52, .26, .14]], door: [.5, .24, .26], doorColor: '#3f78b8', chimney: true, lightAt: 14.6 }), .55],
        [terraceHouse(), .68],
        [lampPost(-.44, .19, 13.8), .9], [lampPost(.45, .13, 14), .95]
      ];
      town.push([makeLighthouse(), .8]);
      town.forEach(([o]) => stage.add(o));
      stage.add(lines());
      gulls = FLOCK.map(() => { const gl = makeGull(); stage.add(gl.root); return gl; });

      /* the broom and the letter */
      broom = makeBroom(); stage.add(broom);
      env = makeEnvelope(); stage.add(env.root);

      /* the card's words and photo */
      label = makeLabel(words('note1', 'Thư hỏa tốc: gửi người anh thương'));
      stage.add(label.root, label.mark);
      photo = kit.polaroid({ width: .2, caption: words('caption', 'Người nhận: em'), glow: .5, halo: true, haloColor: 0xffe2b0 });
      const peg = mat('#c99b6d', { roughness: .7 });
      for (const s of [-1, 1]) photo.root.add(mesh(new THREE.BoxGeometry(.012, .03, .008), peg, s * .07, photo.height + .004, .004));
      photo.root.children.slice(-2).forEach(p => { p.visible = false; });
      banner = kit.sign({ text: words('note2', 'Bay đến đâu cũng muốn về bên em!'), style: 'banner', width: .62, accent: '#e4505a', glow: .55 });
      stage.add(photo.root, banner.root);

      /* the paths she flies */
      const spiral = [];
      for (let i = 0; i <= 8; i++) { const a = i / 8 * TAU, r = .07 + .03 * i / 8; spiral.push([-.306 + r * Math.sin(a), .042 + .2 * Math.pow(i / 8, 1.3), .1 - r + r * Math.cos(a)]); }
      PATH1 = curve([...spiral, [-.2, .3, .09], [-.1, .36, -.04], [.03, .39, -.13], [.15, .36, -.08], [.13, .31, .03], [0, .265, .07]]);
      PATH2 = curve([[0, .265, .07], [.07, .2, .13], [.04, .1, .2], [-.07, .07, .17], [-.1, .08, .08], [-.02, .11, .03], [.06, .145, .012], [.114, .162, .01]]);
      heartLen = [0]; const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), qq = new THREE.Quaternion(); heartAt(Math.PI, p0);
      for (let i = 1; i <= 240; i++) { heartAt(Math.PI + i / 240 * TAU, p1); heartLen.push(heartLen[i - 1] + p1.distanceTo(p0)); p0.copy(p1); }
      const into = heartBroom(0, new THREE.Vector3(), qq).toArray(); HEART_IN.setFromQuaternion(qq, 'YXZ');   // both by the tip, which the curve leaves straight up
      const outOf = heartBroom(1, new THREE.Vector3(), qq).toArray(); HEART_OUT.setFromQuaternion(qq, 'YXZ');
      PATH3 = curve([[.226, .162, .07], [.16, .26, .05], [.05, .34, .0], [into[0], into[1] - .1, into[2]], into]);
      PATH4 = curve([outOf, [0, .26, .02], [0, .2, .045]]);

      /* particles */
      [sparks, trail, hearts, dust, stars] = [{ max: 420, additive: true }, { max: 320, additive: true }, { max: 160 }, { max: 60 }, { max: 60, additive: true }].map(o => kit.particles(o));
      stage.add(sparks.root, trail.root, hearts.root, dust.root, stars.root);
    },

    reset() {
      [sparks, trail, hearts, dust, stars].forEach(p => p.clear()); trailU = 0;
      girl.stop(); boy.stop();
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();

      /* light and sky: golden hour, a pinker sunset while she delivers, dusk for the ride */
      const dusk = ease.smooth(seg(g, 11.4, 15.2));
      kit.lights.hemi.color.copy(DAY.hemi).lerp(DUSK.hemi, dusk); kit.lights.hemi.groundColor.copy(DAY.ground).lerp(DUSK.ground, dusk);
      kit.lights.hemi.intensity = lerp(1.1, .72, dusk); kit.lights.sun.color.copy(DAY.sun).lerp(DUSK.sun, dusk); kit.lights.sun.intensity = lerp(1.45, .85, dusk);
      skyDusk.material.opacity = dusk;
      const fold = ease.out(seg(g, 0, .75)), wob = g > .75 ? Math.exp(-6 * (g - .75)) * Math.sin(14 * (g - .75)) : 0;
      skyDay.rotation.x = skyDusk.rotation.x = -Math.PI / 2 * (1 - fold) + .1 * wob;  // lying flat behind the card, it folds up
      if (g > 13 && kit.once('stars')) stars.burst(40, i => { const x = (rng() - .5) * 1.04; return { x, y: .48 + rng() * .55, z: skyDay.userData.zAt(x) + .01,
        color: ['#ffffff', '#fff2c4', '#cfe0ff'][i % 3], size: .007 + rng() * .012, life: 1e6, shape: i % 4 ? 'glow' : 'star', twinkle: 1.5 + rng() * 3.5 }; });

      /* the town pops up out of the card, house by house */
      town.forEach(([o, at]) => {
        const k = ease.back(seg(g, at, at + .4)), sq = g > at + .4 ? .06 * Math.exp(-8 * (g - at - .4)) * Math.sin(20 * (g - at - .4)) : 0;
        o.scale.set(Math.max(.001, k * (1 + sq)), Math.max(.001, k * (1 - sq)), Math.max(.001, k * (1 + sq))); o.visible = g > at;
        if (g > at + .05 && kit.once(`pop${at}`)) puff(o.position.x, .01, o.position.z, 8, .05, .025);
      });
      const on = ease.out(seg(g, 1.3, 1.6)), sweep = T * 1.6, flash = Math.pow(Math.abs(Math.sin(sweep)), 30);   // it flashes as a beam sweeps past the phone
      lamp.material.emissiveIntensity = 1.8 * on; beam.rotation.y = sweep;
      beam.children.forEach((b, i) => {                              // strong over the town and the sea, gone off the page's edge
        const a = sweep + i * Math.PI, dz = -Math.sin(a);           // where it points: along the town, not into the page or at you
        b.material.opacity = on * lerp(.15, .6, dusk) * ease.smooth(clamp((.2 - Math.cos(a)) / .7)) * (1 - .75 * ease.smooth(clamp(dz / .8))) * (1 - .85 * ease.smooth(clamp(-dz / .6)));
      });
      lampGlow.material.opacity = on * (.7 + 1.2 * flash) * lerp(.7, 1, dusk); lampGlow.scale.setScalar(.14 * (1 + .6 * flash));
      lamps.forEach(l => {                                           // the lamp posts and the post office's sign light up at dusk
        const k = ease.out(seg(g, l.at, l.at + .3)), f = 1 + .05 * Math.sin(T * 12 + l.at * 9);
        if (l.glass) { l.glass.emissiveIntensity = 1.6 * k * f; l.glow.material.opacity = .8 * k * f; } else l.sign.emissiveIntensity = .15 + .9 * k;
      });
      windows.forEach(w => { const k = ease.out(seg(g, w.at, w.at + .25)); w.m.emissiveIntensity = .9 * k; if (w.extra) w.extra.emissiveIntensity = .9 * k; });
      gulls.forEach((gl, i) => {                                     // gulls circle, flapping and now and then gliding
        const f = FLOCK[i], a = T * f.w * .5 + f.ph, k = ease.out(seg(g, .9 + i * .2, 1.6 + i * .2)), w = Math.sign(f.w), flap = Math.sin(T * 9 + i) * (Math.sin(T * .9 + i * 2) > -.2 ? .7 : .1);
        gl.root.position.set(f.c[0] + Math.cos(a) * f.r, f.c[1] + .02 * Math.sin(a * 2) - .3 * (1 - k), f.c[2] + Math.sin(a) * f.r * .6);
        gl.root.rotation.set(0, Math.atan2(-Math.sin(a) * w, Math.cos(a) * .6 * w), -.35 * w); gl.root.scale.setScalar(Math.max(.001, k));
        gl.wings[0].rotation.z = -.15 - flap * .7; gl.wings[1].rotation.z = .15 + flap * .7;
      });
      washing.forEach((p, i) => { p.rotation.x = .12 * Math.sin(T * 2.2 + i * 1.7) + .06 * Math.sin(T * 5.1 + i); p.scale.setScalar(Math.max(.001, ease.back(seg(g, 1 + i * .08, 1.3 + i * .08)))); });
      flags.forEach((p, i) => { p.rotation.x = .25 * Math.sin(T * 3 + i * .8); p.rotation.y = .2 * Math.sin(T * 2.3 + i); p.scale.setScalar(Math.max(.001, ease.back(seg(g, .9 + i * .04, 1.15 + i * .04)))); });
      lineGroup.visible = g > .9;

      /* ── her: by the post office, onto the broom, up in a swirl, round over the rooftops, down to his terrace ── */
      const gc = clipAt(GIRL, g), bc = clipAt(BOY, g);
      girl.play(gc[1], gc[2]); boy.play(bc[1], bc[2]);
      let speed = 0, onBroom = true, gYaw = 0;
      if (g < 1.9) {                                                 // the broom waits beside her; she hops on
        gYaw = lerp(.35, Math.PI / 2, ease.inOut(seg(g, .95, 1.25)));
        girl.root.position.set(START.x, Math.sin(Math.PI * seg(g, 1.3, 1.62)) * .035, START.z); girl.root.quaternion.setFromEuler(eQ.set(0, gYaw, 0, 'YXZ'));
        const slide = ease.inOut(seg(g, 1.32, 1.56)), dip = .008 * Math.sin(Math.PI * seg(g, 1.58, 1.85)), seat = seatUnder(START.x, 0, START.z, Math.PI / 2);   // it slides under her mid-hop
        setBroom(seat[0], seat[1] + .02 * (1 - slide) + .006 * Math.sin(T * 3) * (1 - slide) - dip, seat[2] + .08 * (1 - slide), Math.PI / 2, 0, .05 * Math.sin(T * 2.4) * (1 - slide));
        onBroom = g > 1.56; if (onBroom) ride(girl, 'girl');
        broom.visible = g > .45; broom.scale.setScalar(Math.max(.001, ease.back(seg(g, .45, .8))));
        if (g > .5 && kit.once('broom')) fizz(broom.position.x, broom.position.y, broom.position.z, 14);
      } else if (g < 5.2) {                                          // up in a swirl, then round over the rooftops
        const u = tween(g, [[1.9, 0], [2.3, .06, 'in'], [4.75, .94, 'linear'], [5.2, 1, 'out']]);
        const f = along(PATH1, u, .45); setBroom(f.p.x, f.p.y, f.p.z, f.yaw, f.pitch, f.roll); speed = 1 - seg(g, 4.75, 5.2);
        const k = ease.inOut(seg(g, 4.75, 5.35));                    // at the end she brakes and swings round to face him
        if (k) setBroom(f.p.x, f.p.y, f.p.z, lerp(f.yaw, 1.15, k), lerp(f.pitch, -.25, Math.sin(Math.PI * k)), f.roll * (1 - k));
        ride(girl, 'girl');
      } else if (g < 6.2) {                                          // the first stop: she hovers, waving the letter
        const k = ease.inOut(seg(g, 4.75, 5.35)), f = along(PATH1, 1, 0);
        setBroom(f.p.x, f.p.y + .008 * Math.sin(T * 2.2), f.p.z, lerp(f.yaw, 1.15, k), .04 * Math.sin(T * 1.6), .05 * Math.sin(T * 1.3));
        ride(girl, 'girl');
      } else if (g < 7.42) {                                         // a swoop low past you and up onto his terrace
        const u = tween(g, [[6.2, 0], [6.5, .1, 'in'], [7.1, .9, 'linear'], [7.42, 1, 'out']]);
        const f = along(PATH2, u, 1); setBroom(f.p.x, f.p.y, f.p.z, f.yaw, f.pitch * .7, f.roll * 1.2); speed = 1;
        if (g > 7.1) { const k = ease.out(seg(g, 7.1, 7.42)); setBroom(f.p.x, f.p.y, f.p.z, lerp(f.yaw, Math.PI / 2, k), lerp(f.pitch, -.2, Math.sin(Math.PI * k)), f.roll * (1 - k)); speed = 1 - k; }
        ride(girl, 'girl');
      } else if (g < 12.9) {                                         // on the terrace: steps off, hands him the letter
        onBroom = false;
        gYaw = tween(g, [[7.4, Math.PI / 2], [8.15, Math.PI / 2], [8.45, 1.2], [12.4, 1.2], [12.85, -Math.PI / 2]]);
        girl.root.position.set(lerp(.15, .19, ease.inOut(seg(g, 7.75, 8.15))), ROOF + .004 * Math.sin(Math.PI * seg(g, 10.55, 10.8)), .01); girl.root.quaternion.setFromEuler(eQ.set(0, gYaw, 0, 'YXZ'));
        const park = ease.inOut(seg(g, 7.9, 8.6)), seat = seatUnder(.15, ROOF, .01, Math.PI / 2), front = ease.inOut(seg(g, 12.4, 12.9));   // then round in front of them
        const bx = lerp(seat[0] - .13 * park, .226, front), by = seat[1] - .01 * park + .006 * Math.sin(T * 2.6) * park + .03 * Math.sin(Math.PI * front), bz = lerp(.01 + .03 * park, .12, front);
        setBroom(bx, by, bz, lerp(Math.PI / 2, 1.5 * Math.PI, front), 0, .06 * Math.sin(T * 2.1) * park);
      } else {                                                       // the ride: she hops on, then he does
        const hopOn = ease.inOut(seg(g, 13.05, 13.3)), sag = .012 * Math.sin(Math.PI * seg(g, 14.15, 14.45)) + .006 * Math.sin(Math.PI * seg(g, 13.3, 13.5));
        const base = [.226, ROOF + .042, lerp(.12, .07, hopOn)];
        if (g < 14.75) {
          setBroom(base[0], base[1] + .02 * (1 - hopOn) - sag + .004 * Math.sin(T * 2.6), base[2], -Math.PI / 2, 0, .03 * Math.sin(T * 2) * (1 - hopOn));
          if (g < 13.3) { onBroom = false; girl.root.position.set(.19, ROOF + .035 * Math.sin(Math.PI * seg(g, 13.0, 13.32)), lerp(.01, .07, hopOn)); girl.root.quaternion.setFromEuler(eQ.set(0, -Math.PI / 2, 0, 'YXZ')); }
          else ride(girl, 'girl');
        } else if (g < 15.35) {                                      // up off the terrace, swinging round to you, to the heart's tip
          const f = along(PATH3, ease.inOut(seg(g, 14.75, 15.35)), 1), k = ease.inOut(seg(g, 14.75, 15.3));
          setBroom(f.p.x, f.p.y, f.p.z, lerp(-Math.PI / 2, HEART_IN.y, k), lerp(0, HEART_IN.x, k), lerp(f.roll, HEART_IN.z, k)); speed = 1; ride(girl, 'girl');
        } else if (g < 17.7) {                                       // the heart, drawn in sparkles from the end of the broom
          const u = ease.inOut(seg(g, 15.35, 17.7));
          heartBroom(u, broom.position, broom.quaternion); speed = 1; ride(girl, 'girl');
          for (; trailU < u; trailU += .004) {                       // the trail, laid exactly along the heart
            heartAt(heartT(trailU), vE);
            trail.emit({ x: vE.x + (rng() - .5) * .006, y: vE.y + (rng() - .5) * .006, z: vE.z, color: rng() < .25 ? '#fff4f8' : TRAIL[Math.min(2, (trailU * 3) | 0)],
              size: .02 + rng() * .014, life: 1e6, shape: rng() < .2 ? 'heart' : rng() < .6 ? 'sparkle' : 'glow', twinkle: 3 + rng() * 4, spin: (rng() - .5) * 2 });
          }
        } else {                                                     // out of the heart, down to hover over the town
          const f = along(PATH4, tween(g, [[17.7, 0], [18.25, .85, 'out'], [18.6, 1, 'out']]), 1), k = ease.inOut(seg(g, 18.1, 18.6));
          setBroom(f.p.x, f.p.y + .008 * Math.sin(T * 2.2) * k, f.p.z, lerp(HEART_OUT.y, -1.15, k), lerp(HEART_OUT.x * (1 - ease.out(seg(g, 17.7, 18.1))), .04 * Math.sin(T * 1.6), k), .04 * Math.sin(T * 1.3) * k);
          speed = 1 - k; ride(girl, 'girl');
        }
      }
      if (g < 15.3 && trailU > 0) { trail.clear(); trailU = 0; }    // played again from before the heart: draw it afresh

      /* ── him: on his terrace, then on the broom behind her ── */
      if (g < 13.85) {
        let x = HIM.x, z = HIM.z, yaw = lerp(-.55, -1.05, ease.inOut(seg(g, 2.2, 2.8)));
        if (g > 8.25) { const k = ease.inOut(seg(g, 8.25, 8.65)); x = lerp(x, .355, k); z = lerp(z, .0, k); yaw = lerp(yaw, -1.3, k); }
        if (g > 12.4) yaw = lerp(-1.3, -.6, ease.inOut(seg(g, 12.4, 12.9)));
        if (g > 13.45) { const k = ease.inOut(seg(g, 13.45, 13.85)); x = lerp(.355, .3, k); yaw = lerp(-.6, -Math.PI / 2, k); }
        const rise = ease.back(seg(g, .68, 1.08)), jump = .045 * Math.sin(Math.PI * seg(g, 4.75, 5.25));   // he rides his house up as it pops out of the card
        boy.root.position.set(x, ROOF * Math.max(0, rise) + jump, z); boy.root.quaternion.setFromEuler(eQ.set(0, yaw, 0, 'YXZ'));
        boy.root.visible = g > .68;
      } else if (g < 14.2) {
        const k = ease.inOut(seg(g, 13.9, 14.15));
        boy.root.position.set(.3, ROOF + .04 * Math.sin(Math.PI * seg(g, 13.85, 14.2)), lerp(0, .07, k)); boy.root.quaternion.setFromEuler(eQ.set(0, -Math.PI / 2, 0, 'YXZ'));
      } else ride(boy, 'boy');
      girl.root.visible = g > .1;
      if (g < .45) girl.root.scale.setScalar(Math.max(.001, ease.back(seg(g, .1, .45)))); else girl.root.scale.setScalar(1);

      /* ── gestures ── */
      const flying = onBroom ? 1 : 0; if (onBroom && g < 7.42 || g > 13.3) grip(girl, 1, speed * .15);
      const wave1 = bump(g, 5.3, 5.6, 6.2, 6.45);                    // the first stop: the letter held up high
      if (wave1) { girl.aim('upperarm.r', [-.35, .9, .25], wave1); girl.aim('lowerarm.r', [-.1 + .35 * Math.sin(T * 6), 1, .2], wave1); }
      if (onBroom) girl.bend('chest', speed * .25, 0, 0);          // leaning into the flight
      if (g < 1.2) girl.bend('head', -.15 * bump(g, .5, .7, .95, 1.15), .3 * bump(g, .3, .5, .9, 1.1), 0);
      const seeHim = bump(g, 5.1, 5.4, 6.2, 6.4); if (seeHim) girl.bend('head', 0, -.3, .1 * Math.sin(T * 2), seeHim);
      // him: a wave as she flies over, a cheer, then a slow wave at the stop
      const wave = bump(g, 2.9, 3.2, 4.3, 4.45) + bump(g, 5.95, 6.15, 6.2, 6.4) * .8;
      if (wave) { boy.aim('upperarm.r', [-.4, .85, .3], wave); boy.aim('lowerarm.r', [-.05 + .45 * Math.sin(T * 8), 1, .3], wave); }
      const waiting = 1 - ease.smooth(seg(g, 2.3, 2.7));              // waiting for the post: hands behind his back, rocking, looking out
      if (waiting) {
        boy.aim('upperarm.r', [-.2, -.75, -.6], waiting); boy.aim('lowerarm.r', [.45, -.25, -.85], waiting);
        boy.aim('upperarm.l', [.2, -.75, -.6], waiting); boy.aim('lowerarm.l', [-.45, -.25, -.85], waiting);
        boy.bend('spine', .06 * Math.sin(g * 5.2), 0, 0, waiting); boy.bend('head', -.08, .45 * Math.sin(g * 2.1 + .6), 0, waiting);
      }

      /* the letter: in her right hand, then his left; he opens it and the photo comes out. His arms first: they carry it */
      const openUp = bump(g, 9.45, 9.85, 12.6, 13);                  // held up before him to open
      if (g > 9.0 && g < 9.75) { hand(girl, 'handslot.r', vH); reach(boy, 'l', vH, bump(g, 9.0, 9.25, 9.45, 9.75)); }
      if (openUp) {
        boy.aim('upperarm.l', [.18, -.4, .9], openUp); boy.aim('lowerarm.l', [-.25, .2, 1], openUp);
        boy.aim('upperarm.r', [-.18, -.4, .9], openUp); boy.aim('lowerarm.r', [.25, .2 + .5 * bump(g, 10.05, 10.15, 10.25, 10.4), 1], openUp);
        boy.bend('head', .18 - .38 * ease.inOut(seg(g, 10.7, 11.2)), 0, 0, openUp);
      }
      if (g < 9.45) { hand(girl, 'handslot.r', vE); if (g > 9.25) vE.lerp(hand(boy, 'handslot.l', vH), ease.inOut(seg(g, 9.25, 9.45))); }   // from her hand to his
      else { hand(boy, 'handslot.l', vH); hand(boy, 'handslot.r', vH2); vE.lerpVectors(vH, vH2.lerp(vH, .5).add({ x: 0, y: .01, z: .01 }), openUp); }
      env.root.position.copy(vE);
      vX.set(0, 0, 1).applyQuaternion(g < 9.45 ? girl.root.quaternion : boy.root.quaternion);
      const faceYaw = lerp(Math.atan2(vX.x, vX.z) * .35, Math.PI, openUp);     // towards you; the flap side to you to open it
      env.root.quaternion.setFromEuler(eQ.set(-.15, faceYaw, .1 * Math.sin(T * 3) * wave1, 'YXZ'));
      env.root.visible = g > .1 && g < 13.1;
      env.root.scale.setScalar(Math.max(.001, (g < .45 ? ease.back(seg(g, .1, .45)) : 1) * (1 - ease.in(seg(g, 12.8, 13.1)))));
      const flapOpen = ease.back(seg(g, 10.15, 10.45));
      env.hinge.rotation.x = -2.6 * flapOpen;
      env.seal.visible = g < 10.2;
      if (g > 10.18 && kit.once('seal')) { love(vE.x, vE.y + .02, vE.z + .01, 12); fizz(vE.x, vE.y + .01, vE.z + .01, 18, .35); }
      const clasp = bump(g, 10.5, 10.8, 12.5, 12.75);                 // she clasps her hands, delighted
      if (clasp) { girl.aim('upperarm.r', [-.25, -.45, .85], clasp); girl.aim('lowerarm.r', [.7, .45, .55], clasp); girl.aim('upperarm.l', [.25, -.45, .85], clasp); girl.aim('lowerarm.l', [-.7, .45, .55], clasp); girl.bend('head', -.3, 0, .12 * Math.sin(T * 2.2), clasp); }

      /* the photo: out of the envelope and up between them; in the last chapter onto the washing line */
      const out = ease.out(seg(g, 10.4, 11.3)), toLine = ease.inOut(seg(g, 12.45, 13.25));
      const up = [lerp(vE.x, .272, out), lerp(vE.y, .45, out), lerp(vE.z, -.01, out)];
      const onLine = [.322, LINE.y - photo.height * .42 + .002, LINE.z + .006];
      photo.root.position.set(lerp(up[0], onLine[0], toLine), lerp(up[1], onLine[1], toLine) + .075 * Math.sin(Math.PI * toLine) + .006 * Math.sin(T * 1.3) * (1 - toLine), lerp(up[2], onLine[2], toLine));
      photo.root.scale.setScalar(Math.max(.001, lerp(.25, 1, out) * lerp(1, .42, toLine) * (g > 10.4 ? 1 : 0)));
      photo.root.rotation.set(-.06 * (1 - toLine), .08 * Math.sin(T * .8) * (1 - toLine), .04 * Math.sin(T * .6) * (1 - toLine) + .05 * Math.sin(T * 1.7) * toLine);
      photo.halo.material.opacity = .55 * out * (1 - toLine) * (1 + .08 * Math.sin(T * 3));
      photo.root.children.slice(-2).forEach(p => { p.visible = toLine > .95; });
      if (g > 10.45 && g < 12.4 && dt && rng() < dt * 6) {
        const a = rng() * TAU;
        sparks.emit({ x: photo.root.position.x + Math.cos(a) * .13, y: photo.root.position.y + .13 + Math.sin(a) * .15, z: photo.root.position.z, color: '#fff1b8', size: .018, life: 1, shape: 'sparkle', spin: 3 });
      }
      if (g > 10.42 && kit.once('photo')) fizz(vE.x, vE.y + .03, vE.z, 24, .45);

      /* chapter 1's stop: the airmail label, then the postmark */
      const n = ease.back(seg(g, 5.35, 5.95)) * (1 - ease.in(seg(g, 6.2, 6.55)));
      label.root.scale.setScalar(Math.max(.001, n));
      label.root.position.set(-.24, .56 + .1 * seg(g, 6.2, 6.55) + .008 * Math.sin(T * 1.6), .0);
      label.root.rotation.set(-.1, .12, .03 * Math.sin(T * .9));
      const thump = seg(g, 5.95, 6.1);
      label.mark.material.opacity = thump * (1 - seg(g, 6.2, 6.4)); label.mark.scale.setScalar(Math.max(.001, .1 * lerp(1.8, 1, ease.out(thump)) * n));
      label.mark.position.set(-.24 + .12, .56 + .065 + .1 * seg(g, 6.2, 6.55) + .008 * Math.sin(T * 1.6), .012);
      if (g > 6.08 && kit.once('postmark')) fizz(label.mark.position.x, label.mark.position.y, .02, 10, .25);
      if (g > 5.4 && kit.once('wave1')) love(broom.position.x, broom.position.y + .22, broom.position.z, 8, .15);

      /* sparkles off the broom while it flies; a swirl as she lifts off; a puff where she lands */
      if (dt && speed > .05 && broom.visible) {
        broom.updateWorldMatrix(true, false); vH.set(0, 0, -.23).applyMatrix4(broom.matrixWorld).applyMatrix4(mStage);
        for (let i = 0; i < 2; i++) sparks.emit({ x: vH.x + (rng() - .5) * .02, y: vH.y + (rng() - .5) * .02, z: vH.z + (rng() - .5) * .02, vy: -.02, drag: 1,
          color: ['#fff1b8', '#ffd1dc', '#b8f0e8', '#ffffff'][(rng() * 4) | 0], size: (.012 + rng() * .012) * (.5 + speed * .5), life: .5 + rng() * .4, shape: rng() < .5 ? 'sparkle' : 'glow', spin: 3 });
      }
      if (dt && g > 1.9 && g < 3.1) for (let i = 0; i < 3; i++) {
        const a = g * 9 + i * TAU / 3, y = broom.position.y - .03 + rng() * .08;
        sparks.emit({ x: -.306 + Math.cos(a) * .11, y, z: .03 + Math.sin(a) * .11, vx: -Math.sin(a) * .1, vy: .06, vz: Math.cos(a) * .1, drag: 1.2,
          color: ['#fff1b8', '#b8f0e8', '#ffd1dc'][i], size: .02, life: .9, shape: i ? 'sparkle' : 'glow', spin: 4 });
      }
      if (g > 1.95 && kit.once('lift')) puff(-.306, .01, .1, 16, .04, .03);
      if (g > 7.4 && kit.once('land')) puff(.15, ROOF + .01, .01, 14, .04, .026);

      /* the end: his arms round her, her head back against his; hearts, the banner */
      const hug = ease.smooth(seg(g, 14.35, 14.75));
      if (hug) {
        boy.aim('upperarm.r', [-.3, -.25, .9], hug); boy.aim('lowerarm.r', [.85, -.05, .5], hug);
        boy.aim('upperarm.l', [.3, -.25, .9], hug); boy.aim('lowerarm.l', [-.85, -.05, .5], hug);
        boy.bend('head', .12, 0, 0, hug); boy.bend('chest', .15, 0, 0, hug);
      }
      const pat = bump(g, 13.45, 13.6, 13.95, 14.1);                 // a pat on the seat behind her: hop on!
      if (pat) { girl.aim('upperarm.l', [.45, -.55, -.7], pat); girl.aim('lowerarm.l', [.3, -.6 - .3 * Math.abs(Math.sin(T * 14)), -.75], pat); girl.bend('head', 0, .5, 0, pat); }
      const together = ease.smooth(seg(g, 18.2, 18.6));
      if (together) { girl.bend('head', 0, .42, -.06, together); boy.bend('spine', 0, .1, -.24, together); boy.bend('head', 0, .38, -.1, together); }   // both towards you, his chin past her shoulder
      if (g > 18.4 && kit.once('end')) love(broom.position.x, broom.position.y + .25, broom.position.z - .04, 24, .45, .12);   // behind the banner: its words stay clear
      const b = ease.elastic(seg(g, 18.25, 19.1));
      banner.root.scale.setScalar(Math.max(.001, b));
      banner.root.position.set(0, .68 + .006 * Math.sin(T * 1.5), .06);
      banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      if (held && dt && g > 18.8 && rng() < dt * 1.5) hearts.emit({ x: broom.position.x + (rng() - .5) * .2, y: broom.position.y + .25, z: broom.position.z - .04, vy: .07, sway: .03, color: '#ff8fab', size: .018, life: 2.4, shape: 'heart' });

      /* capes and ribbons in the wind */
      const wind = flying * speed, pair = ease.inOut(seg(g, 13.95, 14.35));   // with him behind her, her cape folds up to a capelet
      if (capes[0]) capes[0].node.scale.y = lerp(1, .42, pair);
      flutter(capes[0], lerp(.12 + wind * .9, .05, pair), T, .25 + wind * .9, 0);
      flutter(capes[1], g > 14.3 ? .15 + wind * .85 : 0, T, g > 14.3 ? .25 + wind * .9 : .12, 1.5);
      ribbons.forEach((r, i) => flutter(r, .25 + wind * 1.1, T, .45 + wind, i * 2));

      [sparks, trail, hearts, dust, stars].forEach(x => x.update(dt, T));
    }
  };
};
