/* Ngàn đèn trời (a thousand lanterns), told by the shared act _acts/lovestory.js; the old riverside town, the river, the
   boat and the lanterns are built by scenery.js, loaded first. Four chapters of about ten seconds, each ending at a stop:
     1 · 0–10 s    dusk turns to night over the old town and its lanterns light one by one; he rows the boat out along the
                   river with smooth strokes (the oars dip, rings spread, drops fall) while she trails her hand in the water;
                   flower lanterns drift past; he ships the oars, a big lotus lantern drifts to the front, opens its petals
                   and a wish card with the first words (note1) rises out of its heart
     2 · 10–20 s   the first sky lanterns rise over the town; she stands carefully, the boat rocks, he stands and steadies
                   her by both hands; side by side, he picks up a folded lantern, they open it together, he strikes a match
                   and lights it; it fills with light and floats over their heads on two cords, the second words (note2)
                   glowing on its side
     3 · 20–30 s   they let it go together and she cheers; hundreds of lanterns rise over the town and the river doubles
                   them; his arm goes round her, she leans her head on his shoulder; a red lantern floats up with the card's
                   photo hanging under it, its caption below
     4 · 30–40 s   the photo drifts aside; the lanterns gather into a heart high above; they turn to each other, he takes both
                   her hands, a kiss, the river shimmers; two lanterns come down with a long red paper banner: the last
                   words (note3)
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own;
   swaying, twinkling and lapping go by T, the act's own time. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words, fitText, HAND } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;
  const W = .024;                                                    // the river's surface: a sheet of water raised over the card
  const PAGE = { width: 1.12, height: 1.12, curve: .03, z: -.31 };
  const QUAY = { z: -.228, top: .07, stepX: -.36 };                  // the quay's face, its top, where its steps go down
  /* the boat's own frame (bow +z, keel at 0): its waterline and floor (the floor sits below the water: the river leaves
     a hole there), his bench (top, where his hips are), her cushion, the oar posts, the oars either side of a post */
  const BOAT = { len: .44, beam: .085, depth: .062, water: .03, floor: .014, seatTop: .026, seat: .07, stern: -.15, lock: .05,
    oarIn: .06, oarOut: .165, holeL: .205, holeB: .074 };
  const S = window.NM_LANTERN.scenery(kit, { W, PAGE, QUAY, BOAT });
  const rand = S.seeded(1408);                                       // the card's own seed: the same lanterns every time
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  const RED = { glow: '#ffb48a', paper: '#f0503e', top: '#c4202e', band: 'rgba(255,214,120,.95)', rib: 'rgba(120,20,20,.3)', accent: '#ffd27a' };   // red paper lanterns
  const DUSK = { hemi: new THREE.Color('#ffd2c4'), ground: new THREE.Color('#6a4a6a'), sun: new THREE.Color('#ffc09a') };
  const NIGHT = { hemi: new THREE.Color('#a9b0ee'), ground: new THREE.Color('#4a3050'), sun: new THREE.Color('#c0c8ff') };
  let boy, girl, cape, shawl, page, quay, river, rings, boat, pads, packet, match, wish, ours, cords, photoLamp, photo, strings, banner, bannerLamps, ties;
  let sky, drift = [], hero, sparks, hearts, drops, flies, particles;

  /* ── who does what, from story time g: [from g, clip, options] ── */
  const BOY = [
    [0, 'Sit_Chair_Idle'], [12.15, 'Sit_Chair_StandUp', { once: true, fade: .15 }], [12.95, 'Idle', { fade: .25 }], [13.05, 'Walking_A', { speed: .8, fade: .2 }],
    [13.5, 'Idle', { fade: .2 }], [14.3, 'PickUp', { once: true, fade: .2 }], [15.55, 'Idle', { fade: .3 }]
  ];
  const GIRL = [
    [0, 'Sit_Floor_Idle'], [11.2, 'Sit_Floor_StandUp', { once: true, fade: .15 }], [12.3, 'Idle', { fade: .2 }],
    [20.85, 'Cheer', { once: true, fade: .2 }], [22.45, 'Idle', { fade: .4 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  /* where they are in the boat (its frame): [from g, z along it, facing, ease into it]; FRONT faces the phone */
  const FRONT = -R;
  const BOY_WAY = [[0, BOAT.seat - .0545, Math.PI], [13.05, BOAT.seat - .0545, Math.PI], [13.5, -.012, Math.PI, 'out'], [13.6, -.012, Math.PI],
    [14.2, -.012, FRONT], [30.6, -.012, FRONT], [31.4, -.012, Math.PI]];
  const GIRL_WAY = [[0, BOAT.stern - .0143, 0], [13.6, BOAT.stern - .0143, 0], [14.2, -.13, FRONT], [30.6, -.13, FRONT], [31.4, -.13, 0]];
  const keysOf = way => [1, 2].map(i => way.map(k => [k[0], k[i], k[3] || 'smooth']));
  const BOY_KEYS = keysOf(BOY_WAY), GIRL_KEYS = keysOf(GIRL_WAY);

  /* ── the row out: four strokes, the boat surging on each, then a glide to the middle of the river ── */
  const STROKE = { from: 2.2, period: 1.3, n: 4, drive: .42 };
  const ROW_END = STROKE.from + STROKE.period * (STROKE.n - 1 + STROKE.drive);   // the last stroke's finish
  const PATH = { a: new THREE.Vector2(-.235, .035), c: new THREE.Vector2(-.08, .02), b: new THREE.Vector2(.07, 0) };   // along the river: both seen side on
  const progress = [];                                               // how far along the path, every 1/100 s of chapter 1
  {
    let u = 0;
    const speed = g => {
      if (g < STROKE.from) return 0;
      const s = ((g - STROKE.from) / STROKE.period) % 1, v = .35 + 1.1 * (s < STROKE.drive ? Math.sin(Math.PI * s / STROKE.drive) : 0);
      return g < ROW_END ? v : .9 * Math.exp(-2.2 * (g - ROW_END));
    };
    for (let i = 0; i <= 1000; i++) { progress.push(u); u += speed(i / 100) / 100; }
    for (let i = 0; i <= 1000; i++) progress[i] /= u;
  }
  const along = g => { const i = clamp(g * 100, 0, 1000), a = Math.floor(i); return lerp(progress[a], progress[Math.min(1000, a + 1)], i - a); };
  const vP = new THREE.Vector2();
  const pathAt = u => vP.set(0, 0).addScaledVector(PATH.a, (1 - u) ** 2).addScaledVector(PATH.c, 2 * u * (1 - u)).addScaledVector(PATH.b, u * u);
  const pathYaw = u => Math.atan2((1 - u) * (PATH.c.x - PATH.a.x) + u * (PATH.b.x - PATH.c.x), (1 - u) * (PATH.c.y - PATH.a.y) + u * (PATH.b.y - PATH.c.y));
  /** the oars at g: sweep (0 at a stroke's finish, 1 at its catch), dip (the blades in the water), ship (laid along the boat) */
  function oarsAt(g) {
    const F = STROKE.from;
    if (g < F - .9) return { sweep: 0, dip: 0, ship: 1 };
    if (g < F) return { sweep: ease.inOut(seg(g, F - .9, F - .1)), dip: ease.in(seg(g, F - .15, F)), ship: 1 - ease.inOut(seg(g, F - .9, F - .3)) };
    if (g >= ROW_END) { const t = g - ROW_END; return { sweep: 0, dip: 1 - ease.out(seg(t, 0, .15)), ship: ease.inOut(seg(t, .25, 1.1)) }; }
    const n = (g - F) / STROKE.period, s = n - Math.floor(n), d = STROKE.drive;
    if (s < d) return { sweep: 1 - ease.inOut(s / d), dip: 1, ship: 0 };
    const r = (s - d) / (1 - d);
    return { sweep: ease.inOut(seg(r, .1, .95)), dip: 1 - ease.out(seg(r, 0, .12)) + ease.in(seg(r, .9, 1)), ship: 0 };
  }

  /* ── the cast's clothes: the palette's swatches recoloured, some parts moved onto other swatches ── */
  const cell = (cx, cy) => ({ cx, cy });
  /** moves the UV islands of `mesh` in swatch `from` onto swatch `to`; keep(x, y, z) (its own units) picks the triangles */
  function remap(mesh, from, to, keep = () => true) {
    const uv = mesh?.geometry?.attributes.uv, pos = mesh?.geometry?.attributes.position; if (!uv) return;
    const idx = mesh.geometry.index, n = idx ? idx.count : uv.count, move = new Set();
    for (let i = 0; i < n; i += 3) {                                   // which corners first, then move them
      const v = [0, 1, 2].map(k => (idx ? idx.getX(i + k) : i + k)), mid = f => (f(v[0]) + f(v[1]) + f(v[2])) / 3;
      if (Math.floor(mid(j => uv.getX(j)) * 8) !== from.cx || Math.floor(mid(j => uv.getY(j)) * 4) !== from.cy) continue;
      if (keep(mid(j => pos.getX(j)), mid(j => pos.getY(j)), mid(j => pos.getZ(j)))) v.forEach(j => move.add(j));
    }
    move.forEach(j => uv.setXY(j, uv.getX(j) + (to.cx - from.cx) / 8, uv.getY(j) + (to.cy - from.cy) / 4));
    uv.needsUpdate = true;
  }
  /** the palette with swatches recoloured, each keeping a little of its own shading */
  function repaint(m, part, colours) {
    const material = m.node(part)?.material, img = material?.map?.image;
    if (!img || !img.width) return;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0);
    const w = img.width / 8, h = img.height / 4;
    for (const [key, hex] of Object.entries(colours)) {
      const [cx, cy] = key.split(',').map(Number), d = c.getImageData(cx * w, cy * h, w, h), p = d.data;
      let mean = 0; for (let i = 0; i < p.length; i += 4) mean += p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11;
      mean /= p.length / 4;
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      for (let i = 0; i < p.length; i += 4) {
        const k = .55 + .45 * (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / (mean || 1);
        p[i] = Math.min(255, r * k); p[i + 1] = Math.min(255, g * k); p[i + 2] = Math.min(255, b * k);
      }
      c.putImageData(d, cx * w, cy * h);
    }
    const old = material.map, t = kit.keep(new THREE.CanvasTexture(cv));
    t.colorSpace = old.colorSpace; t.flipY = old.flipY; t.wrapS = old.wrapS; t.wrapT = old.wrapT;
    t.magFilter = old.magFilter; t.minFilter = old.minFilter; t.anisotropy = 4;
    material.map = t; material.needsUpdate = true; old.dispose();
  }
  function dress() {
    /* him: black hair, a deep indigo tunic with gold piping, a red sash, dark trousers, bare hands, a cream cape */
    for (const arm of ['Knight_ArmLeft', 'Knight_ArmRight']) remap(boy.node(arm), cell(3, 0), cell(0, 0), x => Math.abs(x) > .76);
    for (const leg of ['Knight_LegLeft', 'Knight_LegRight']) remap(boy.node(leg), cell(3, 0), cell(5, 1));
    repaint(boy, 'Knight_Body', { '1,0': '#2a2630', '3,0': '#2c3a8c', '4,0': '#2c3a8c', '1,1': '#2c3a8c', '7,0': '#e0b85a', '2,1': '#f0cf70',
      '6,0': '#c0303e', '7,1': '#2a2f5a', '0,1': '#f3e8d0', '5,1': '#4a3026' });
    /* her: black hair, a rose-red dress, her cape worn short as a golden shawl over the scarf, bare arms */
    for (const arm of ['Rogue_ArmLeft', 'Rogue_ArmRight']) remap(girl.node(arm), cell(5, 2), cell(0, 0));
    repaint(girl, 'Rogue_Body', { '1,0': '#2a2228', '0,1': '#d23a55', '7,1': '#a8243f', '1,1': '#f0c050', '6,0': '#7a1f30', '3,0': '#f5d070',
      '5,0': '#f0c050', '3,2': '#6a2a2a' });
    cape = boy.node('Knight_Cape'); shawl = girl.node('Rogue_Cape');
    if (shawl) shawl.scale.set(1.08, .42, 1.15);
  }

  /* ── the words: a wish card out of the lotus, his lantern's front, a red paper banner ── */
  function wishCard(text) {
    const w = .4, h = w * .6, tex = kit.canvasTexture(1024, 614, (c, W, H) => {
      const r = S.seeded(9), edge = [];
      for (let i = 0; i < 64; i++) {                                   // rice paper, its edge torn soft
        const t = i / 64 * 4, side = Math.floor(t), k = t - side, j = 4 * (r() - .5);
        edge.push(side === 0 ? [24 + k * (W - 48), 24 + j] : side === 1 ? [W - 24 + j, 24 + k * (H - 48)] : side === 2 ? [W - 24 - k * (W - 48), H - 24 + j] : [24 + j, H - 24 - k * (H - 48)]);
      }
      c.save(); c.shadowColor = 'rgba(60,20,30,.35)'; c.shadowBlur = 20; c.shadowOffsetY = 6; c.fillStyle = '#fff6e4';
      c.beginPath(); edge.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); c.restore();
      for (let i = 0; i < 260; i++) {                                  // its fibres
        const x = 30 + r() * (W - 60), y = 30 + r() * (H - 60);
        c.strokeStyle = `rgba(190,150,110,${.08 + r() * .1})`; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * 30, y + (r() - .5) * 10); c.stroke();
      }
      c.save(); c.globalAlpha = .2; c.translate(W - 112, H - 70);       // a lotus printed faint in a corner
      for (let i = 0; i < 7; i++) { c.save(); c.rotate(-1.2 + i * .4); c.fillStyle = '#f2558a'; c.beginPath(); c.ellipse(0, -46, 18, 46, 0, 0, TAU); c.fill(); c.restore(); }
      c.restore();
      c.strokeStyle = '#c8362f'; c.lineWidth = 6; c.beginPath(); c.moveTo(W / 2 - 60, 6); c.quadraticCurveTo(W / 2, 70, W / 2 + 60, 6); c.stroke();   // its red cord
      c.fillStyle = '#c8362f'; c.beginPath(); c.arc(W / 2, 44, 12, 0, TAU); c.fill();
      c.fillRect(64, H - 98, 60, 60); c.fillStyle = '#fff6e4';             // a red seal: ước (a wish)
      c.font = `700 36px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ước', 94, H - 70);
      c.fillStyle = '#5a1420'; fitText(c, text, { x: 70, y: 76, w: W - 140, h: H - 176 }, { maxLines: 3, max: 120 });
    });
    const root = new THREE.Group(), geo = kit.keep(new THREE.PlaneGeometry(w, h));
    const face = new THREE.Mesh(geo, kit.keep(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .05, roughness: .9,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .72 })));
    root.add(face, new THREE.Mesh(geo, S.mat('#fff2dc', { side: THREE.BackSide, roughness: 1 })));
    const thread = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.0018, .0018, 1, 6)), kit.keep(new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: .8, toneMapped: false })));
    stage.add(root, thread);
    return { root, w, h, thread };
  }
  function lanternFront(text) {                                      // his lantern's front panel: the words in red ink on glowing paper
    return kit.canvasTexture(512, 640, (c, w, h) => {
      S.lanternPaper(c, w, h, { glow: '#fffbea', paper: '#ffeec0', top: '#ffc878' });
      c.fillStyle = '#d0432f'; kit.heartPath(c, w / 2, 84, 50); c.fill();
      c.fillStyle = '#7a1520'; fitText(c, text, { x: 40, y: 124, w: w - 80, h: h - 196 }, { maxLines: 4, max: 104 });
    });
  }
  function makeBanner(text) {
    const w = .6, h = w * .26, tex = kit.canvasTexture(1024, 266, (c, W, H) => {
      c.save(); c.shadowColor = 'rgba(40,10,10,.35)'; c.shadowBlur = 14; c.shadowOffsetY = 5; c.fillStyle = '#c51f2e'; c.fillRect(14, 10, W - 28, H - 24); c.restore();
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); c.fillStyle = g; c.fillRect(14, 10, W - 28, H - 24);
      c.strokeStyle = '#f2c55a'; c.lineWidth = 6; c.strokeRect(30, 24, W - 60, H - 52); c.lineWidth = 2; c.strokeRect(42, 34, W - 84, H - 72);
      c.fillStyle = '#f2c55a';
      for (const x of [74, W - 74]) {                                  // a gold lotus at each end
        for (let i = 0; i < 5; i++) { c.save(); c.translate(x, H / 2 + 14); c.rotate(-1 + i * .5); c.beginPath(); c.ellipse(0, -24, 9, 24, 0, 0, TAU); c.fill(); c.restore(); }
      }
      c.fillStyle = '#fff3da'; fitText(c, text, { x: 116, y: 30, w: W - 232, h: H - 66 }, { maxLines: 2, max: 96 });
    });
    const root = new THREE.Group(), geo = kit.keep(new THREE.PlaneGeometry(w, h));
    root.add(new THREE.Mesh(geo, kit.keep(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .05, roughness: .9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .5 }))),
      new THREE.Mesh(geo, S.mat('#a8192a', { side: THREE.BackSide })));
    for (const s of [-1, 1]) for (const dx of [-.012, 0, .012]) {     // gold tassels under its ends
      root.add(S.mesh(new THREE.CylinderGeometry(.0016, .003, .03, 5), S.mat('#f2c55a', { emissive: 0xf2c55a, emissiveIntensity: .2 }), s * (w / 2 - .05) + dx, -h / 2 - .014, 0));
    }
    root.traverse(o => { o.castShadow = false; });
    return { root, w, h };
  }
  /** a thin cord, stretched from a to b (stage points) every frame */
  const cord = () => { const m = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.0011, .0011, 1, 4)), S.mat('#f6e6c8', { roughness: .8 })); m.castShadow = false; stage.add(m); return m; };
  const vC = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  function stretch(m, a, b) { vC.subVectors(b, a); const l = vC.length(); m.position.copy(a).addScaledVector(vC, .5); m.quaternion.setFromUnitVectors(UP, vC.normalize()); m.scale.set(1, Math.max(1e-4, l), 1); }

  /* ── the sky lanterns: the first few out of the town, hundreds later, some gathering into a heart ── */
  const N = 170, FIRST = 8, HEARTS = 64, EXTRA = 5;                  // EXTRA: reflections only, for the story's own lanterns
  const HEART = { x: .03, y: .855, z: -.2, k: .0112 };
  const LAMPS = Array.from({ length: N }, (_, i) => {
    /* from behind the town's roofs (some come into sight already over them), or (one in four) off the river's far sides,
       never round the boat; the heart's own go up first, so that in the last chapter the rest are high and leaving */
    const first = i < FIRST, heart = i >= FIRST && i < FIRST + HEARTS ? i - FIRST : -1, river = !first && rand() < .25;
    const side = rand() < .5 ? -1 : 1, x = river ? side * (.32 + rand() * .16) : (rand() - .5) * (first ? .85 : 1.02);
    const z = first ? -.29 + rand() * .03 : river ? -.2 + rand() * .07 : -.3 + rand() * .07;
    return { at: first ? 10.3 + i * .32 + rand() * .2 : heart >= 0 ? 21.5 + rand() * 4.2 : 22.2 + rand() * 5.4, x, z,
      y0: river ? W + .012 : .17 + Math.pow(rand(), 2) * .22, vy: first ? .03 + rand() * .012 : .05 + rand() * .045, vx: (rand() - .5) * .012,
      size: (first ? .03 : .027) + rand() * .012 + (z + .3) * .05, ph: rand() * TAU, color: rand() < .8 ? '#ffffff' : rand() < .5 ? '#ffd0c0' : '#ffe6a8',
      heart, join: rand() * .9 };
  });
  const heartSlot = (j, out) => {
    const t = j / HEARTS * TAU;
    return out.set(HEART.x + 16 * Math.sin(t) ** 3 * HEART.k, HEART.y + (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * HEART.k, HEART.z);
  };
  const climb = (l, t) => l.vy * (t < .7 ? t * t / 1.4 : t - .35);   // a lantern lit and let go: slow at first
  const vL = new THREE.Vector3(), vH = new THREE.Vector3();
  /** a lantern's place at g (its climb; for the heart's, from where it was on the way into its place) */
  function lampAt(l, g, T, out) {
    const t = Math.max(0, g - l.at), away = l.heart < 0 && g > 30 ? .05 * (g - 30) ** 2 : 0;   // the rest leave the sky to the heart
    out.set(l.x + l.vx * t + .006 * Math.sin(T * .9 + l.ph), l.y0 + climb(l, t) + away, l.z);
    if (l.heart >= 0 && g > 30.2) {
      const t0 = Math.max(0, 30.2 - l.at), k = ease.inOut(seg(g, 30.2 + l.join, 32.6 + l.join));
      vH.set(l.x + l.vx * t0 + .006 * Math.sin(T * .9 + l.ph), l.y0 + climb(l, t0), l.z);
      heartSlot(l.heart, out).y += .004 * Math.sin(T * 1.6 + l.ph); out.lerpVectors(vH, out, k);
    }
    return out;
  }

  /* ── reaching: an arm pointed at a stage point, wherever the one reaching stands (they ride in the boat) ── */
  const mStage = new THREE.Matrix4(), qW = new THREE.Quaternion(), vS = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3(), vE = new THREE.Vector3();
  const vHand = new THREE.Vector3(), vHand2 = new THREE.Vector3(), vMid = new THREE.Vector3(), vMid2 = new THREE.Vector3(), vRing = new THREE.Vector3();
  const at = (m, bone, out) => { const b = m.node(bone); b.updateWorldMatrix(true, false); return out.setFromMatrixPosition(b.matrixWorld).applyMatrix4(mStage); };
  const D = [0, 0, 0], U = [0, 0, 0];
  /** the way from a shoulder to a stage point, in that character's own space */
  function toward(m, side, target) {
    const b = m.node(`upperarm.${side}`); b.updateWorldMatrix(true, false);
    vS.copy(target).applyMatrix4(stage.matrixWorld).sub(vA.setFromMatrixPosition(b.matrixWorld));
    return vS.applyQuaternion(m.root.getWorldQuaternion(qW).invert()).toArray(D);
  }
  function reach(m, side, target, k, drop = .25) {
    if (k <= 0) return;
    const d = toward(m, side, target); U[0] = d[0]; U[1] = d[1] - drop * Math.hypot(d[0], d[2]); U[2] = d[2];
    m.aim(`upperarm.${side}`, U, k); m.aim(`lowerarm.${side}`, d, k);
  }
  /* bursts: sparkles flying out of a point; drops thrown up off the water */
  const FLAME = ['#ffd27a', '#fff1b8', '#ff9a5a'];
  const fizz = (x, y, z, n, s = .2, colors = ['#fff1b8', '#ffd1dc', '#ffffff']) => sparks.burst(n, () => ({ x, y, z, vx: (rng() - .5) * s, vy: .05 + rng() * s,
    vz: (rng() - .5) * s, drag: 2, color: colors[(rng() * colors.length) | 0], size: .014, life: .8, shape: rng() < .6 ? 'sparkle' : 'glow', spin: 4 }));
  const splash = (x, y, z, n, s = .1) => drops.burst(n, () => ({ x, y, z, vx: (rng() - .5) * s, vy: .06 + rng() * s, vz: (rng() - .5) * s, gravity: -1.2, drag: .5,
    color: '#d8ecff', size: .007, life: .55, shape: 'drop', floor: W }));
  /** a point in the boat's own frame, on the stage */
  const inBoat = (x, y, z, out) => boat.ride.localToWorld(out.set(x, y, z)).applyMatrix4(mStage);
  /** both hands of each held between them, at chest height */
  function holdHands(k) {
    at(boy, 'upperarm.l', vA); at(girl, 'upperarm.r', vB); vMid.lerpVectors(vA, vB, .5); vMid.y -= .055;
    at(boy, 'upperarm.r', vA); at(girl, 'upperarm.l', vB); vMid2.lerpVectors(vA, vB, .5); vMid2.y -= .055;
    reach(boy, 'l', vMid, k); reach(girl, 'r', vMid, k); reach(boy, 'r', vMid2, k); reach(girl, 'l', vMid2, k);
  }

  return {
    seconds: [10, 10, 10, 10],

    build() {
      boy = kit.model('boy').fit({ height: .3 }); girl = kit.model('girl').fit({ height: .29 });
      dress();

      /* the town, the river, the boat with the two of them in it */
      page = S.makePage(); quay = S.makeQuay(); river = S.makeRiver(); rings = S.makeRings(56); pads = S.makeLotusPads();
      boat = S.makeBoat(); stage.add(boat.root); boat.ride.add(boy.root, girl.root);
      packet = new THREE.Group();                                       // the folded lantern on the floor, and his match
      packet.add(S.mesh(new THREE.BoxGeometry(.05, .008, .036), S.mat('#fff1d4', { roughness: .9 })), S.mesh(new THREE.BoxGeometry(.052, .0085, .006), S.mat('#d0432f'), 0, 0, .008));
      match = new THREE.Group(); match.add(S.mesh(new THREE.CylinderGeometry(.0013, .0013, .026, 4), S.mat('#e8d0a0'), 0, .013, 0));
      match.userData.flame = kit.glow({ color: 0xffb050, size: .06, opacity: 0, depthTest: false }); match.userData.flame.position.y = .028; match.add(match.userData.flame);
      stage.add(packet, match);

      /* flower lanterns adrift on the current, and the big one that brings the first words */
      for (let i = 0; i < 5; i++) {
        const l = S.makeLotus({ size: .042 + rand() * .01, tip: ['#ff5a8a', '#ff7a5a', '#f2558a', '#ffb84a', '#ff6f91'][i], still: true });
        stage.add(l.root); drift.push({ l, x0: -.6 + i * .27, z: [.12, -.205, .245, .12, -.205][i], v: .02 + rand() * .008, ph: rand() * TAU });
      }
      hero = S.makeLotus({ size: .075, open: .2 }); stage.add(hero.root);
      wish = wishCard(words('note1', 'Đêm nay, sông cũng lung linh vì có em'));

      /* their lantern (the second words on its front), the photo's lantern, the banner's two */
      ours = S.makeBigLantern({ width: .24, height: .29, light: true, front: lanternFront(words('note2', 'Mình cùng thả một điều ước nhé')) });
      stage.add(ours.root); cords = [cord(), cord()];
      photoLamp = S.makeBigLantern({ width: .12, height: .14, ...RED }); stage.add(photoLamp.root);
      photo = kit.polaroid({ width: .24, caption: words('caption', 'Đêm hội đèn của hai ta'), glow: .55, halo: true, haloColor: 0xffd9a0 });
      photo.root.traverse(o => { o.castShadow = false; }); stage.add(photo.root); strings = [cord(), cord()];
      bannerLamps = [0, 1].map(() => { const l = S.makeBigLantern({ width: .1, height: .12, ...RED }); stage.add(l.root); return l; });
      banner = makeBanner(words('note3', 'Em là điều ước của anh')); stage.add(banner.root); ties = [cord(), cord()];

      sky = S.makeSkyLanterns(N + EXTRA);
      sparks = kit.particles({ max: 320, additive: true }); hearts = kit.particles({ max: 140 }); drops = kit.particles({ max: 160 }); flies = kit.particles({ max: 60, additive: true });
      particles = [sparks, hearts, drops, flies];
      particles.forEach(p => stage.add(p.root));
    },

    reset() {
      particles.forEach(p => p.clear()); rings.clear();
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();
      const night = ease.smooth(seg(g, .8, 5.5));

      /* ── light and sky: dusk to night, the moon up, the festival's far lanterns; the town's lanterns light one by one ── */
      const L = kit.lights;
      L.hemi.color.copy(DUSK.hemi).lerp(NIGHT.hemi, night); L.hemi.groundColor.copy(DUSK.ground).lerp(NIGHT.ground, night);
      L.hemi.intensity = lerp(1.05, .72, night); L.sun.color.copy(DUSK.sun).lerp(NIGHT.sun, night); L.sun.intensity = lerp(1.3, .62, night);
      const fold = ease.inOut(seg(g, 0, .7)), wob = g > .7 ? Math.exp(-6 * (g - .7)) * Math.sin(14 * (g - .7)) : 0;
      page.root.rotation.x = R * (1 - fold) - .08 * wob;              // the page lies on the card, then stands up
      const fest = ease.smooth(seg(g, 22.5, 28));
      page.night.material.opacity = night; page.fest.material.opacity = fest;
      page.dusk.visible = night < 1; page.night.visible = night > 0; page.fest.visible = fest > 0;   // no layer drawn that cannot be seen
      page.moon.position.set(.3, lerp(.48, .8, ease.out(seg(g, .8, 7))) + .003 * Math.sin(T * .5), S.pageZ(.3) + .03);
      page.moon.material.opacity = night * fold;
      quay.root.scale.set(1, Math.max(.001, ease.back(seg(g, .15, .75))), 1);
      S.poseQuay(quay, g, T);
      const shim = ease.smooth(seg(g, 33.4, 35));
      river.u.uT.value = T; river.u.uNight.value = night; river.u.uGlit.value.set(.3, .75 * night); river.u.uShim.value = shim;
      pads.root.scale.setScalar(Math.max(.001, ease.back(seg(g, .5, 1.1))));
      pads.flowers.forEach((f, i) => { f.bob.rotation.z = .05 * Math.sin(T * 1.2 + i); });

      /* ── the boat: rowed along its path to the middle of the river, then adrift there; it rocks when she stands ── */
      const u = along(Math.min(g, 10)), p = pathAt(u);
      const yaw = lerp(pathYaw(u), R, ease.inOut(seg(u, .55, 1))) + .03 * Math.sin(T * .35) * seg(g, 8, 10);
      const rock = (g > 11.9 ? .075 * Math.exp(-1.6 * (g - 11.9)) * Math.sin(8.5 * (g - 11.9)) : 0) + (g > 12.5 ? .035 * Math.exp(-2.2 * (g - 12.5)) * Math.sin(9.5 * (g - 12.5) + 1) : 0);
      const pop = ease.back(seg(g, .45, .85));
      boat.root.position.set(p.x, W - BOAT.water + .0014 * Math.sin(T * 1.7) - .04 * (1 - pop), p.y); boat.root.rotation.y = yaw;
      boat.root.scale.setScalar(Math.max(.001, pop));
      boat.ride.rotation.z = .016 * Math.sin(T * 1.3) + rock; boat.ride.rotation.x = .01 * Math.sin(T * 1.1 + 1);
      river.u.uBoat.value.set(p.x, p.y, Math.cos(yaw), Math.sin(yaw)); river.u.uHull.value.set(BOAT.holeL * pop, BOAT.holeB * pop);   // the hole grows with the boat
      const bowOn = ease.out(seg(g, 2, 3)), fl = 1 + .06 * Math.sin(T * 11) * Math.sin(T * 6.3);
      boat.lamp.m.emissiveIntensity = 1.6 * bowOn * fl; boat.lamp.glow.material.opacity = .85 * bowOn * fl; boat.lamp.light.intensity = 1.1 * bowOn * fl * night;
      boat.lamp.hang.rotation.x = .1 * Math.sin(T * 1.6); boat.lamp.hang.rotation.z = .06 * Math.sin(T * 1.2) - boat.ride.rotation.z;

      /* ── the two of them in the boat: clips, places, turns ── */
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g);
      boy.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);
      const [bz, by] = BOY_KEYS.map(k => tween(g, k)), [gz, gy] = GIRL_KEYS.map(k => tween(g, k));
      const bUp = ease.inOut(seg(g, 12.35, 12.85));                     // standing up: from the bench's height down to the floor
      boy.root.position.set(0, lerp(BOAT.seatTop - .046, BOAT.floor, bUp), bz); boy.root.rotation.y = by;
      girl.root.position.set(0, BOAT.floor + .004 * bump(g, 32.8, 33.4, 37, 38), gz); girl.root.rotation.y = gy;
      if (cape) cape.scale.set(1, lerp(.6, 1, bUp), lerp(.8, 1, bUp));

      /* ── the oars: the sweep and the dip of a stroke; laid along the gunwales before and after ── */
      const o = oarsAt(Math.min(g, 10));
      boat.oars.forEach(oar => {
        const s = oar.side, a = lerp(.35, 1.22, o.sweep), pitch = lerp(.19, .3, o.dip);   // a: the grip's swing towards the stern
        oar.pivot.rotation.set(0, lerp(Math.atan2(s * Math.cos(a), Math.sin(a)), s * .12, o.ship), 0); oar.o.rotation.x = lerp(pitch, -.05, o.ship);
      });
      boat.root.updateMatrixWorld(true);

      /* ── bodies first (spines and chests), so the arms reach from where the shoulders end up ── */
      const rowing = g < 10 ? 1 - o.ship : 0, catchK = o.sweep;
      if (rowing) { boy.bend('spine', lerp(-.12, .14, catchK) * rowing, 0, 0); boy.bend('chest', lerp(-.08, .2, catchK) * rowing, 0, 0); boy.bend('head', lerp(.12, -.18, catchK) * rowing, 0, 0); }
      const trail = bump(g, 3.3, 3.9, 6.3, 6.8);                       // she leans out over the side, a hand in the water
      if (trail) { girl.bend('spine', .05 * trail, 0, -.42 * trail); girl.bend('chest', .15 * trail, 0, -.4 * trail); girl.bend('head', .3 * trail, -.4 * trail, .25 * trail); }
      const wobble = bump(g, 12.1, 12.35, 13.4, 13.8);                 // standing in a rocking boat
      if (wobble) { girl.bend('spine', 0, 0, -1.6 * rock * wobble); girl.bend('chest', -.1 * wobble, 0, 0); }
      const lean = ease.smooth(seg(g, 24, 25)) * (1 - ease.smooth(seg(g, 30.2, 30.7)));   // her head on his shoulder
      if (lean) { girl.bend('spine', 0, 0, .1 * lean); girl.bend('head', .05 * lean, .1 * lean, .32 * lean); boy.bend('head', 0, 0, -.1 * lean); }
      const sway = .025 * Math.sin(T * 1.3) * seg(g, 25, 26) * (1 - seg(g, 30, 30.5));
      if (sway) { boy.bend('spine', 0, 0, sway); girl.bend('spine', 0, 0, sway); }
      const kiss = ease.smooth(seg(g, 32.9, 33.6));
      if (kiss) for (const m of [boy, girl]) { m.bend('chest', .17 * kiss, 0, 0); m.bend('head', .12 * kiss, 0, 0); }

      /* ── chapter 1: the row out ── */
      if (rowing > .01) [[boy, 'l', 0], [boy, 'r', 1]].forEach(([m, side, i]) => {   // his hands on the grips (his left on the near oar)
        const oar = boat.oars[i]; oar.o.updateMatrixWorld(true);
        reach(m, side, vE.set(0, 0, -BOAT.oarIn + .008).applyMatrix4(oar.o.matrixWorld).applyMatrix4(mStage), Math.min(1, rowing * 1.5), .15);
      });
      if (g > STROKE.from - .2 && g < ROW_END + .4) {                  // rings where the blades go in, drops off them on the way back
        const n = (g - STROKE.from) / STROKE.period, k = Math.floor(n + .02);
        boat.oars.forEach(oar => {
          oar.o.updateMatrixWorld(true); vE.set(0, 0, BOAT.oarOut - .018).applyMatrix4(oar.o.matrixWorld).applyMatrix4(mStage);
          if (n > -.05 && k < STROKE.n && kit.once(`dip${k}${oar.side}`)) {
            rings.emit(vE.x, vE.z, .012, .07, 1.3, .55);
            splash(vE.x, W + .004, vE.z, 6, .08);
          }
          if (o.dip < .5 && dt && rng() < dt * 14) drops.emit({ x: vE.x, y: vE.y - .004, z: vE.z, vy: -.02, gravity: -1.2, color: '#cfe6ff', size: .005, life: .4, shape: 'drop', floor: W });
          if (o.dip > .8 && dt && rng() < dt * 6) rings.emit(vE.x, vE.z, .008, .03, .8, .3);
        });
      }
      if (g > 2.4 && g < 9 && dt && rng() < dt * 5) { inBoat(0, BOAT.water, -BOAT.len / 2 + .01, vE); rings.emit(vE.x, vE.z, .02, .05, 1.6, .22 * (1 - seg(g, 7.5, 9))); }   // the wake
      if (trail) {                                                      // her fingers in the water: a little trail of rings
        inBoat(-(S.halfBeam(BOAT.stern / (BOAT.len / 2)) + .012), BOAT.water + .004, BOAT.stern - .01, vE);
        reach(girl, 'r', vE, trail, .05);
        if (trail > .6 && dt && rng() < dt * 7) rings.emit(vE.x, vE.z, .006, .035, 1, .45);
        if (trail > .6 && dt && rng() < dt * 4) sparks.emit({ x: vE.x, y: W + .004, z: vE.z, vy: .03, color: '#cfe8ff', size: .008, life: .5, shape: 'sparkle', spin: 3 });
      }
      if (g > 6.6 && g < 7 && kit.once('shake')) { at(girl, 'handslot.r', vE); splash(vE.x, vE.y, vE.z, 10, .12); }   // she shakes the drops off
      const lookAround = bump(g, 1, 1.4, 2.6, 3.1);                    // the town lighting up: she looks round at it
      if (lookAround) girl.bend('head', -.15 * lookAround, .5 * Math.sin(g * 1.6) * lookAround, 0);
      const point = bump(g, 7.5, 7.8, 8.6, 9);                          // the big lotus coming: she points it out
      if (point) { girl.aim('upperarm.r', [-.85, .25, .45], point); girl.aim('lowerarm.r', [-.9, .35, .3], point); }
      const lookLotus = ease.smooth(seg(g, 7.7, 8.3)) * (1 - ease.smooth(seg(g, 10.2, 10.6)));
      if (lookLotus) { boy.bend('head', .1 * lookLotus, .55 * lookLotus, 0); girl.bend('head', .12 * lookLotus, -.5 * lookLotus, 0); }
      const rest = ease.smooth(seg(g, ROW_END + .9, ROW_END + 1.4)) * (1 - ease.smooth(seg(g, 12, 12.2)));   // oars in: hands on his knees
      if (rest) for (const s of ['l', 'r']) { boy.aim(`upperarm.${s}`, [s === 'l' ? .2 : -.2, -.8, .5], rest); boy.aim(`lowerarm.${s}`, [s === 'l' ? .1 : -.1, -.3, 1], rest); }

      /* flower lanterns adrift, the big one to the front: it opens and the wish card rises out of its heart */
      const hx = lerp(lerp(.62, .03, ease.out(seg(g, 4.5, 8.6))), -.3, ease.inOut(seg(g, 10.3, 14))), hz = lerp(.24, .165, ease.out(seg(g, 4.5, 8.6)));
      drift.forEach((d, i) => {
        const x = ((d.x0 + .62 - d.v * g) % 1.24 + 1.24) % 1.24 - .62;
        const show = clamp((.56 - Math.abs(x)) / .08) * (d.z < 0 ? clamp((x + .25) / .05) : 1) * clamp((Math.hypot(x - hx, d.z - hz) - .06) / .04);
        d.l.root.position.set(x, W, d.z); d.l.root.scale.setScalar(Math.max(.001, show * ease.back(seg(g, .9 + i * .1, 1.3 + i * .1))));
        d.l.bob.position.y = .0015 * Math.sin(T * 2 + d.ph); d.l.bob.rotation.set(.04 * Math.sin(T * 1.4 + d.ph), T * .1 + d.ph, .04 * Math.sin(T * 1.7 + d.ph));
        if (show > .5 && dt && rng() < dt * .7) rings.emit(x, d.z, .03, .04, 1.4, .18);
      });
      hero.root.position.set(hx, W, hz); hero.root.scale.setScalar(Math.max(.001, seg(g, 4.5, 4.9) * (1 - ease.in(seg(g, 13.2, 14)))));
      hero.bob.position.y = .0015 * Math.sin(T * 2); hero.bob.rotation.set(.03 * Math.sin(T * 1.3), .2 * Math.sin(T * .3), .03 * Math.sin(T * 1.6));
      const bloom = ease.elastic(seg(g, 8.4, 9.3)) * (1 - .55 * ease.inOut(seg(g, 10.2, 10.9)));
      hero.open(lerp(.2, 1, bloom)); hero.glow.material.opacity = .6 + .5 * bloom; hero.glow.scale.setScalar(.075 * 3.2 * (1 + .4 * bloom));
      if (g > 8.5 && kit.once('bloom')) fizz(hx, W + .03, hz, 26, .25);
      const rise = ease.out(seg(g, 8.9, 9.8)), unfold = ease.back(seg(g, 9.3, 9.85)), away = ease.inOut(seg(g, 10, 10.7));
      wish.root.position.set(lerp(hx, .03, rise), lerp(W + .03, .49, rise) + .006 * Math.sin(T * 1.5) - .25 * away, lerp(hz, .14, rise));
      wish.root.scale.set(Math.max(.001, lerp(.12, 1, unfold) * rise * (1 - away)), Math.max(.001, lerp(.08, 1, rise) * (1 - away)), 1);
      wish.root.rotation.set(-.1, .05 * Math.sin(T * .7), .03 * Math.sin(T * .9));
      wish.thread.visible = rise > .05 && away < .9;
      vA.set(hx, W + .03, hz); vB.set(wish.root.position.x, wish.root.position.y - wish.h / 2 * wish.root.scale.y, wish.root.position.z);
      stretch(wish.thread, vA, vB); wish.thread.material.opacity = .7 * rise * (1 - away) * (.8 + .2 * Math.sin(T * 4));
      if (g > 9.8 && g < 10 && kit.once('wish')) sparks.burst(18, () => ({ x: .03 + (rng() - .5) * .4, y: .49 + (rng() - .5) * .22, z: .15, vy: .04, color: '#fff1b8', size: .014, life: .9, shape: 'sparkle', spin: 3 }));

      /* ── chapter 2: the first lanterns; she stands, wobbles, he steadies her by both hands ── */
      const look = ease.smooth(seg(g, 10.4, 10.9)) * (1 - ease.smooth(seg(g, 11.4, 11.8)));
      if (look) { boy.bend('head', -.35 * look, 0, 0); girl.bend('head', -.4 * look, 0, 0); }
      const pointUp = bump(g, 10.6, 10.9, 11.2, 11.45);
      if (pointUp) { girl.aim('upperarm.r', [-.3, .9, .3], pointUp); girl.aim('lowerarm.r', [-.2, 1, .2], pointUp); }
      const balance = bump(g, 12.25, 12.5, 12.75, 13.05);              // arms out for balance, then into his hands
      if (balance) for (const s of ['l', 'r']) { girl.aim(`upperarm.${s}`, [s === 'l' ? .95 : -.95, .2, .1], balance); girl.aim(`lowerarm.${s}`, [s === 'l' ? .9 : -.9, .4, .1], balance); }
      holdHands(bump(g, 12.75, 13.15, 13.7, 14.1));
      const watchHim = bump(g, 14.3, 14.6, 15.1, 15.4);
      if (watchHim) girl.bend('head', .25 * watchHim, .3 * watchHim, 0);

      /* the folded lantern: on the floor, up in his hand, opened between them, lit, then up over their heads on two cords */
      at(boy, 'upperarm.r', vA); at(girl, 'upperarm.l', vB); vRing.lerpVectors(vA, vB, .5).add({ x: 0, y: -.075, z: .035 });   // where they hold it
      const gotIt = g > 14.85, open = ease.inOut(seg(g, 15.3, 16)), inflate = ease.inOut(seg(g, 17.45, 18.4)), lift = ease.inOut(seg(g, 16.95, 18.2));
      const letGo = g > 20.55, flyT = Math.max(0, g - 20.55);
      if (!gotIt) inBoat(-.05, BOAT.floor + .005, -.012, packet.position); else at(boy, 'handslot.r', packet.position);
      packet.visible = g > .5 && g < 15.4; packet.scale.setScalar(Math.max(.001, pop * (1 - seg(g, 15.25, 15.4))));
      packet.rotation.set(0, gotIt ? 0 : yaw, gotIt ? .3 : 0);
      const ringX = lerp(vRing.x, vRing.x + .01, lift), ringY = lerp(vRing.y, .372, lift), ringZ = lerp(vRing.z, vRing.z - .03, lift);
      ours.root.visible = g > 15.25 && g < 27;
      if (!letGo) ours.root.position.set(ringX, ringY + .006 * Math.sin(T * 1.9) * lift, ringZ);
      else ours.root.position.set(vRing.x + .01 + .1 * ease.in(seg(flyT, 0, 6)) + .01 * Math.sin(T * .8), .372 + .02 * flyT + .045 * flyT * flyT, vRing.z - .03 - .2 * ease.inOut(seg(flyT, 0, 5)));
      const sc = lerp(.32, 1, inflate) * (letGo ? lerp(1, .45, ease.inOut(seg(flyT, 0, 4.5))) : 1);   // smaller as it flies off over the town
      const tall = lerp(.22, 1, open) * lerp(.85, 1, inflate) * (1 + .03 * Math.sin(T * 2.3) * inflate);   // limp until the hot air fills it
      ours.root.scale.set(Math.max(.001, sc * lerp(.3, 1, open)), Math.max(.001, sc * tall), Math.max(.001, sc * lerp(.3, 1, open)));
      ours.root.rotation.set(0, .05 * Math.sin(T * .6), (letGo ? .07 : .025 * lift) * Math.sin(T * 1.4));
      const lit = ease.out(seg(g, 16.85, 17.9));
      ours.glow(lit * (1 - .3 * seg(flyT, 3, 7)), T);
      if (g > 16.85 && kit.once('lit')) fizz(ours.root.position.x, ours.root.position.y + .01, ours.root.position.z, 20, .15, FLAME);
      if (open > 0 && open < 1 && dt && rng() < dt * 10) {
        sparks.emit({ x: ours.root.position.x + (rng() - .5) * .08, y: ours.root.position.y + rng() * .08, z: ours.root.position.z + .03, color: '#fff1b8', size: .01, life: .6, shape: 'sparkle', spin: 3 });
      }
      /* their hands: on its sides while it opens (his comes away for the match), then up on the cords; let go */
      const half = ours.width / 2 * ours.root.scale.x, cordsUp = ease.smooth(seg(g, 17.3, 18.3));
      const herHold = bump(g, 15, 15.35, 20.45, 20.7), hisHold = bump(g, 15, 15.35, 15.9, 16.05) + bump(g, 17.2, 17.6, 20.45, 20.7);
      vA.set(ours.root.position.x - half, ours.root.position.y + .01, ours.root.position.z);    // her side of the ring, his side
      vB.set(ours.root.position.x + half, ours.root.position.y + .01, ours.root.position.z);
      if (cordsUp) { vA.lerp(vE.set(vA.x - .05, .23, vA.z + .01), cordsUp); vB.lerp(vE.set(vB.x + .05, .23, vB.z + .01), cordsUp); }   // on the cords: hands up by their heads
      reach(girl, 'l', vA, herHold, .1); reach(boy, 'r', vB, hisHold, .1);
      const strike = bump(g, 15.95, 16.05, 16.2, 16.32), carry = bump(g, 16.25, 16.55, 16.9, 17.25);   // the match: struck, carried under the lantern
      if (strike) { boy.aim('upperarm.r', [-.3, -.2, .9], strike); boy.aim('lowerarm.r', [-.2 + .5 * Math.sin(g * 60), .4, 1], strike); }
      if (carry) reach(boy, 'r', vE.set(ours.root.position.x + .006, ours.root.position.y - .016, ours.root.position.z + .03), carry, .05);
      at(boy, 'handslot.r', vHand); match.position.copy(vHand); match.visible = g > 15.92 && g < 17.25;
      match.userData.flame.material.opacity = g > 16.02 ? .95 * (1 - seg(g, 16.95, 17.15)) * (1 + .15 * Math.sin(T * 30)) : 0;
      if (g > 16.02 && kit.once('strike')) fizz(vHand.x, vHand.y + .02, vHand.z, 12, .2, FLAME);
      cords.forEach((c, i) => {                                          // the cords: from the ring's sides to their hands, slack once let go
        const hand = i ? at(girl, 'handslot.l', vHand2) : at(boy, 'handslot.r', vHand2), side = i ? -1 : 1;
        vE.set(ours.root.position.x + side * half * .9, ours.root.position.y + .002, ours.root.position.z);
        if (letGo) hand.set(vE.x + side * .02, vE.y - .09, vE.z);
        stretch(c, vE, hand); c.visible = lift > .15 && g < 27;
      });
      const watchIt = bump(g, 15.2, 15.6, 17.6, 18);                   // eyes on the lantern in their hands, then up to it
      if (watchIt) { boy.bend('head', .3 * watchIt, -.25 * watchIt, 0); girl.bend('head', .3 * watchIt, .25 * watchIt, 0); }
      const upLook = bump(g, 17.8, 18.6, 30.3, 30.9);
      if (upLook) { boy.bend('head', -.32 * upLook, -.12 * upLook, 0); girl.bend('head', -.32 * upLook, .12 * upLook, 0); }

      /* ── chapter 3: hundreds of lanterns; his arm round her; the photo floats up under a red lantern ── */
      const hug = bump(g, 23, 24, 30.3, 30.8);
      if (hug) { boy.aim('upperarm.r', [-.8, .3, -.45], hug); boy.aim('lowerarm.r', [-.95, .1, .25], hug); }
      const pRise = ease.inOut(seg(g, 25.4, 29.2)), aside = ease.inOut(seg(g, 30, 31.2));
      const lx = lerp(lerp(.36, .03, pRise), .405, aside), ly = lerp(lerp(.16, .72, pRise), .47, aside) + .007 * Math.sin(T * 1.3), lz = lerp(lerp(.2, .08, pRise), .03, aside);
      const ps = g < 25.4 ? .001 : lerp(.25, 1, ease.out(seg(g, 25.4, 28.2))) * lerp(1, .52, aside);
      photoLamp.root.position.set(lx, ly, lz); photoLamp.root.scale.setScalar(Math.max(.001, lerp(.4, 1, pRise) * lerp(1, .8, aside)));
      photoLamp.root.rotation.z = .05 * Math.sin(T * 1.2); photoLamp.glow(seg(g, 25.4, 25.9), T); photoLamp.root.visible = g > 25.3;
      const drop = .02 + photo.height * ps;
      const unrollP = ease.back(seg(g, 27.3, 28.1));                   // it comes up rolled, and unrolls in the middle
      photo.root.position.set(lx, ly - drop, lz + .004); photo.root.visible = g > 25.3;
      photo.root.scale.set(Math.max(.001, ps * lerp(.1, 1, unrollP)), Math.max(.001, ps), Math.max(.001, ps));
      photo.root.rotation.set(-.06, .06 * Math.sin(T * .7), .5 * photoLamp.root.rotation.z);
      photo.halo.material.opacity = .6 * ease.out(seg(g, 27.5, 28.6)) * (1 - .5 * aside) * (1 + .08 * Math.sin(T * 3));
      strings.forEach((s, i) => { const k = i ? 1 : -1; vA.set(lx + k * .03 * ps, ly, lz); vB.set(lx + k * .09 * ps, ly - .02, lz + .004); stretch(s, vA, vB); s.visible = g > 25.4; });
      if (g > 28 && g < 30 && dt && rng() < dt * 5) {                    // sparkles round the photo
        const a = rng() * TAU;
        sparks.emit({ x: lx + Math.cos(a) * .14 * ps, y: ly - drop + photo.height * ps * .5 + Math.sin(a) * .16 * ps, z: lz + .01, color: '#fff1b8', size: .014, life: .9, shape: 'sparkle', spin: 3 });
      }

      /* ── chapter 4: their hands, the kiss; the banner comes down between two lanterns ── */
      holdHands(bump(g, 31.5, 32.2, 39.5, 41));
      if (g > 33.5 && kit.once('kiss')) hearts.burst(26, () => ({ x: p.x - .07, y: .3, z: 0, vx: (rng() - .5) * .4, vy: .12 + rng() * .25, vz: (rng() - .5) * .2, gravity: -.15, drag: .9,
        color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .022 + rng() * .02, life: 2.4, shape: 'heart', spin: (rng() - .5) * 4 }));
      if (shim && dt && rng() < dt * 22) {                               // the river shimmers
        sparks.emit({ x: (rng() - .5) * .95, y: W + .003, z: QUAY.z + .02 + rng() * .5, vy: .01, color: rng() < .5 ? '#fff1c4' : '#ffd0a0', size: .008 + rng() * .008, life: .5 + rng() * .4, shape: 'sparkle', spin: 2 });
      }
      const down = ease.out(seg(g, 35.2, 37)), unroll = ease.elastic(seg(g, 36.3, 37.5));
      bannerLamps.forEach((l, i) => {
        l.root.position.set(.035 + (i ? .33 : -.33), lerp(1.2, .735, down) + .006 * Math.sin(T * 1.4 + i), .06);
        l.root.rotation.z = .04 * Math.sin(T * 1.1 + i * 2); l.glow(seg(g, 35, 35.4), T); l.root.visible = g > 35;
      });
      banner.root.position.set(.035, lerp(1.08, .615, down) + .005 * Math.sin(T * 1.4), .065); banner.root.scale.set(Math.max(.001, lerp(.04, 1, unroll)), Math.max(.001, seg(g, 35.2, 35.5)), 1);
      banner.root.rotation.set(-.08, 0, .015 * Math.sin(T * 1.1)); banner.root.visible = g > 35.2;
      ties.forEach((c, i) => {
        const s = i ? 1 : -1; vA.set(bannerLamps[i].root.position.x, bannerLamps[i].root.position.y + .002, .06);
        vB.set(.035 + s * banner.w / 2 * banner.root.scale.x * .92, banner.root.position.y + banner.h / 2 * banner.root.scale.y - .01, .065);
        stretch(c, vA, vB); c.visible = g > 35.3;
      });
      if (held && dt && g > 39 && rng() < dt * 1.3) hearts.emit({ x: p.x - .07 + (rng() - .5) * .1, y: .3, z: 0, vy: .06, sway: .03, color: '#ff8fab', size: .02, life: 2.4, shape: 'heart' });

      /* ── the sky lanterns, their glows and reflections; the story's own lanterns' reflections ── */
      LAMPS.forEach((l, i) => {
        const pos = lampAt(l, g, T, vL), fade = g > l.at ? clamp((g - l.at) / .6) * clamp((1.1 - pos.y) / .12) : 0;
        sky.set(i, pos.x, pos.y, pos.z, l.size * Math.max(.001, clamp((g - l.at) / .5)), .06 * Math.sin(T * 1.1 + l.ph), fade, l.color);
      });
      [ours, photoLamp, ...bannerLamps].forEach((l, j) => sky.set(N + j, l.root.position.x, l.root.position.y, l.root.position.z, .05, 0, l.root.visible ? clamp(l.inner.material.opacity * 1.5) : 0, '#ffd27a', false));
      inBoat(0, .2, BOAT.len / 2 - .03, vE); sky.set(N + 4, vE.x, vE.y, vE.z, .04, 0, bowOn * night, '#ff7a5a', false);
      sky.commit();

      /* fireflies by the quay and the lotus pads */
      if (night > .5 && dt && rng() < dt * 3) {
        const left = rng() < .5;
        flies.emit({ x: left ? -.45 + rng() * .15 : .3 + rng() * .18, y: W + .02 + rng() * .12, z: left ? .1 + rng() * .18 : .15 + rng() * .14, vx: (rng() - .5) * .02, vy: .01, sway: .03,
          color: rng() < .5 ? '#e6ff8a' : '#ffe48a', size: .012 + rng() * .008, life: 3 + rng() * 2, shape: 'glow', twinkle: 6 });
      }

      rings.update(dt, 1);
      particles.forEach(x => x.update(dt, T));
    }
  };
};
