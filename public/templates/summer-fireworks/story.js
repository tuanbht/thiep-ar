/* Pháo hoa mùa hạ (summer fireworks), told by the shared act _acts/lovestory.js; the festival by the river (sky page, banks,
   river, bridge, stalls, lanterns, bamboo, goldfish, the fan and the wish strips) is built by scenery.js and the fireworks
   by fireworks.js, both loaded first. Four chapters of about ten seconds, each ending at a stop:
     1 · 0–10 s    dusk on the festival lane: the paper lanterns light one by one as the two of them walk in hand in hand;
                   he buys a pink cotton candy and gives it to her, she takes a bite, looks away at the lanterns and he
                   steals a big bite; she swats him with her paper fan, they laugh, and the fan floats up and grows into
                   a big fan with the card's first words (note1)
     2 · 10–20 s   they cross the arched bridge to the wish bamboo as night falls; he hands her a paper strip, they write
                   their wishes (he tries to peek, she hides hers) and tie them on; the first stars come out and her strip
                   rises to the top of the bamboo, big, with the second words (note2)
     3 · 20–30 s   a rocket whistles up and the first firework blooms over the river and in it; she startles, he takes
                   her hand and they hurry onto the bridge; chrysanthemums, a willow, a ring; she flinches at a loud one
                   and leans on him; a golden burst gathers into a frame and becomes the card's photo with its caption
     4 · 30–40 s   a heart-shaped firework; he turns to her and confesses with a little bow; she covers her mouth, nods
                   and hugs him; the finale fills the sky and a banner with the last words (note3) unrolls behind a spark
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own;
   the water, lanterns, strips, fish and the small fireworks while a stop holds go by T, the act's own time. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, lerp, rng, words } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;
  const PAGE = { width: 1.1, height: .78, curve: .08, z: -.3 }, HORIZON = .2, BANK = .014;   // the banks' top: where they stand
  const RIVER = { x0: -.1, x1: .14 }, BRIDGE = { x: .02, half: .21, rise: .065, z: -.045, width: .12 };
  const S = window.NM_SUMMER.scenery(kit, { PAGE, HORIZON, BANK, RIVER, BRIDGE });
  const { deckY, seeded } = S;
  const rand = seeded(2207);                                         // the festival's own seed: the same stars every time
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  const DUSK = { hemi: new THREE.Color('#ffe2d6'), ground: new THREE.Color('#a88496'), sun: new THREE.Color('#ffc7a0') };
  const NIGHT = { hemi: new THREE.Color('#8390dc'), ground: new THREE.Color('#2a2440'), sun: new THREE.Color('#a9b6ff') };
  const NIGHT_GROUND = new THREE.Color('#6d6f92'), WHITE = new THREE.Color('#ffffff');

  /* ── the fireworks: [launch time, x, burst height, kind, colours, radius, …]; none is in the air when a stop comes ── */
  const PHOTO_AT = [.02, .42, -.15], PHOTO_W = .25, PHOTO_ASIDE = [.39, .74, -.12];   // aside: in front of the fireworks
  const SHOW = [
    { at: 20.25, x: -.04, y: .84, kind: 'chrysanthemum', colors: ['#ffd77a', '#fff4d6'], r: .27, rise: .95, x0: -.06 },
    { at: 22.1, x: .24, y: .78, kind: 'peony', colors: ['#ff5d6c', '#ffb3c1'], r: .2 },
    { at: 22.7, x: -.24, y: .9, kind: 'willow', colors: ['#ffc75a'], r: .26, rise: 1 },
    { at: 23.7, x: .06, y: .74, kind: 'ring', colors: ['#78e0ff'], r: .19, tilt: .55 },
    { at: 24.25, x: .3, y: .92, kind: 'glitter', colors: ['#fff1b8'], r: .18 },
    { at: 24.6, x: -.3, y: .76, kind: 'chrysanthemum', colors: ['#b88cff', '#ffffff'], r: .22 },
    { at: 25.3, x: .2, y: .86, kind: 'chrysanthemum', colors: ['#8dff9a', '#ffe08a'], r: .24 },
    { at: 26.1, x: PHOTO_AT[0], y: PHOTO_AT[1] + PHOTO_W * .6, z: PHOTO_AT[2] - .01, kind: 'frame', colors: ['#ffd77a'], r: .2, rise: .8, x0: .02, y0: .1 },
    { at: 30.4, x: .03, y: .86, kind: 'heart', colors: ['#ff4f86'], r: .23, rise: .9, x0: .03, life: 3 },
    ...[[35, -.26, .82, 'chrysanthemum', ['#ffd77a', '#ff6b6b'], 2], [35.25, .26, .88, 'peony', ['#78e0ff', '#ffffff'], 1.6], [35.5, 0, .95, 'willow', ['#ffc75a'], 2.4],
      [35.75, -.36, .7, 'ring', ['#ff8fe0'], 1.7], [36, .36, .72, 'glitter', ['#fff1b8'], 1.6], [36.25, -.12, .9, 'peony', ['#b88cff', '#ff8fab'], 1.6],
      [36.5, .16, .8, 'chrysanthemum', ['#8dff9a', '#ffffff'], 1.9], [36.7, -.3, .95, 'heart', ['#ff6b9a'], 2], [36.9, .3, .95, 'chrysanthemum', ['#ffb36b', '#fff4d6'], 1.8]]
      .map(([at, x, y, kind, colors, life]) => ({ at, x, y, kind, colors, life, r: kind === 'heart' ? .13 : .2, rise: .75 }))
  ];

  /* ── the two of them: their summer robes are the palette texture's swatches recoloured (her flowers painted on it) ── */
  const cell = (cx, cy) => ({ cx, cy });
  /** moves the UV islands of `mesh` in swatch `from` onto swatch `to`; `above` keeps to triangles higher than that (model units) */
  function remap(mesh, from, to, above = -Infinity) {
    const uv = mesh?.geometry?.attributes.uv, pos = mesh?.geometry?.attributes.position; if (!uv) return;
    const idx = mesh.geometry.index, n = idx ? idx.count : uv.count, move = new Set();
    for (let i = 0; i < n; i += 3) {                                   // which corners first, then move them
      const v = [0, 1, 2].map(k => (idx ? idx.getX(i + k) : i + k));
      const u0 = (uv.getX(v[0]) + uv.getX(v[1]) + uv.getX(v[2])) / 3, v0 = (uv.getY(v[0]) + uv.getY(v[1]) + uv.getY(v[2])) / 3;
      if (Math.floor(u0 * 8) !== from.cx || Math.floor(v0 * 4) !== from.cy) continue;
      if ((pos.getY(v[0]) + pos.getY(v[1]) + pos.getY(v[2])) / 3 > above) v.forEach(j => move.add(j));
    }
    move.forEach(j => uv.setXY(j, uv.getX(j) + (to.cx - from.cx) / 8, uv.getY(j) + (to.cy - from.cy) / 4));
    uv.needsUpdate = true;
  }
  /** the palette with swatches recoloured, each keeping its own shading; then `after` paints on it */
  function repaint(m, partName, colours, after) {
    const material = m.node(partName)?.material, img = material?.map?.image;
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
        const k = (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / (mean || 1);
        p[i] = Math.min(255, r * k); p[i + 1] = Math.min(255, g * k); p[i + 2] = Math.min(255, b * k);
      }
      c.putImageData(d, cx * w, cy * h);
    }
    if (after) after(c, w, h);
    const old = material.map, t = kit.keep(new THREE.CanvasTexture(cv));
    t.colorSpace = old.colorSpace; t.flipY = old.flipY; t.wrapS = old.wrapS; t.wrapT = old.wrapT;
    t.magFilter = old.magFilter; t.minFilter = old.minFilter; t.anisotropy = 4;
    material.map = t; material.needsUpdate = true; old.dispose();
  }
  function dressBoy() {                                              // a dark indigo pinstriped robe, a pale sash, black hair, bare hands
    for (const arm of ['Barbarian_ArmLeft', 'Barbarian_ArmRight']) {
      remap(boy.node(arm), cell(7, 2), cell(0, 0));                   // the gloves: bare hands
      for (const c of [cell(6, 0), cell(3, 0), cell(2, 1)]) remap(boy.node(arm), c, cell(1, 1));   // bracers and cuffs: sleeve
    }
    remap(boy.node('Barbarian_Body'), cell(6, 0), cell(0, 1), .78);   // the strap across his chest: robe
    repaint(boy, 'Barbarian_Body', { '1,0': '#29232b', '0,1': '#2e3672', '1,1': '#2e3672', '7,0': '#242a5c', '7,1': '#2e3672', '6,0': '#d9cfb6', '2,1': '#242a5c',
      '3,2': '#2a2228', '3,0': '#cbbf9f' }, (c, w, h) => {
      c.save(); c.globalAlpha = .35; c.strokeStyle = '#9fb0ea'; c.lineWidth = 2;                // fine pinstripes on the robe and sleeves
      for (const cx of [0, 1]) for (let x = cx * w + 4; x < (cx + 1) * w; x += 9) { c.beginPath(); c.moveTo(x, h); c.lineTo(x, 2 * h); c.stroke(); }
      c.restore();
    });
    const head = boy.node('head'); if (head) head.add(makeHair(boy.node('Barbarian_Head').material));
  }
  function dressGirl() {                                             // a pale robe with flowers, a red sash and bow, black hair
    repaint(girl, 'Mage_Body', { '1,0': '#1d1b26', '0,1': '#fbf4e8', '7,1': '#fbf4e8', '5,0': '#d6283b', '3,0': '#e8425a', '4,0': '#f08aa0', '2,2': '#ffd25a',
      '1,1': '#d6283b', '3,2': '#9a5b3a' }, (c, w, h) => {
      const r = seeded(5);                                             // little five-petal flowers, multiplied so they keep the shading
      c.save(); c.beginPath(); c.rect(0, h, w, h); c.clip();
      for (let i = 0; i < 24; i++) {
        const x = r() * w, y = h + r() * h, s = 15 * (.75 + .5 * r()), a0 = r() * TAU;
        c.globalCompositeOperation = 'multiply'; c.fillStyle = ['#f48fb1', '#ef6a6a', '#8fb1e8', '#f6a5c0'][i % 4];
        for (let k = 0; k < 5; k++) { const a = a0 + k * TAU / 5; c.beginPath(); c.ellipse(x + Math.cos(a) * s * .55, y + Math.sin(a) * s * .55, s * .5, s * .32, a, 0, TAU); c.fill(); }
        c.globalCompositeOperation = 'source-over'; c.fillStyle = '#ffd84a'; c.beginPath(); c.arc(x, y, s * .22, 0, TAU); c.fill();
        if (r() < .6) { c.globalCompositeOperation = 'multiply'; c.fillStyle = '#9ccc8a'; c.beginPath(); c.ellipse(x + Math.cos(a0) * s * 1.2, y + Math.sin(a0) * s * 1.2, s * .45, s * .18, a0, 0, TAU); c.fill(); }
      }
      c.restore();
    });
  }
  /** black hair for the bare-headed Barbarian: a rounded-box cap over the skull (head bone units) with a jagged fringe,
      shaded from the beard's own swatch so the two match */
  function makeHair(material) {
    const NU = 48, NV = 14, pos = [], uvs = [], idx = [], half = [.565, .49, .5], at = [0, .47, -.01], p = 3.2;
    for (let i = 0; i <= NU; i++) {
      const u = i / NU * TAU, front = Math.max(0, Math.sin(u)), side = Math.abs(Math.cos(u)), back = Math.max(0, -Math.sin(u));
      const vmax = .8 * front + 1.35 * side * (1 - back) + 1.85 * back + .14 * Math.abs(Math.sin(u * 7)) * front;   // how far down from the crown
      for (let j = 0; j <= NV; j++) {
        const v = j / NV * vmax, d = [Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)];
        const r = 1 / Math.pow(Math.abs(d[0]) ** p + Math.abs(d[1]) ** p + Math.abs(d[2]) ** p, 1 / p);
        pos.push(at[0] + d[0] * r * half[0], at[1] + d[1] * r * half[1], at[2] + d[2] * r * half[2]);
        uvs.push(1.35 / 8, (.04 + .8 * Math.min(1, v / 1.9)) / 4);      // lighter on top, as the palette shades it
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setIndex(idx);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.computeVertexNormals();
    const m = new THREE.Mesh(kit.keep(g), material); m.castShadow = true;
    return m;
  }

  /* ── the pose a character holds at story time g: which clip ── */
  const BOY = [                                                      // [from g, clip, options]
    [0, 'Idle'], [.3, 'Walking_A', { speed: 1.35, fade: .25 }], [2.8, 'Walking_A', { speed: 2.3, fade: .1 }], [3.35, 'Idle', { fade: .2 }],
    [3.45, 'Interact', { once: true, fade: .15 }], [4.75, 'Walking_A', { speed: 2.4, fade: .2 }], [5.4, 'Idle', { fade: .2 }],
    [8.35, 'Hit_A', { once: true, fade: .1 }], [9.05, 'Idle', { fade: .3 }],
    [10.6, 'Walking_A', { speed: 2.2, fade: .25 }], [14.05, 'Idle', { fade: .2 }], 
    [21.2, 'Hit_A', { once: true, fade: .1 }], [21.85, 'Running_B', { speed: .75, fade: .15 }], [23.25, 'Idle', { fade: .2 }],
    [32.3, 'Walking_Backwards', { speed: 1.4, fade: .15 }], [32.65, 'Idle', { fade: .2 }], [34.65, 'Walking_A', { speed: 1.8, fade: .15 }], [35, 'Idle', { fade: .2 }]
  ];
  const GIRL = [
    [0, 'Idle'], [.3, 'Walking_A', { speed: 1.35, fade: .25 }], [2.8, 'Idle', { fade: .25 }], [7.75, 'Hit_B', { once: true, speed: 1.3, fade: .1 }], [8.3, 'Idle', { fade: .2 }],
    [10.75, 'Walking_A', { speed: 2.25, fade: .25 }], [14.8, 'Idle', { fade: .2 }],
    [21.15, 'Hit_B', { once: true, fade: .1 }], [22.25, 'Running_B', { speed: .75, fade: .15 }], [23.42, 'Idle', { fade: .2 }],
    [24.35, 'Hit_A', { once: true, fade: .1 }], [25.05, 'Idle', { fade: .3 }], [28.1, 'Cheer', { once: true, fade: .2 }], [29.8, 'Idle', { fade: .4 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };

  /* where each of them is: [from g, x, z, facing, ease into it (smooth by default)]; facing 0 looks at you, R to the right */
  const unwrap = way => { let p = way[0][3]; return way.map(k => { let a = k[3]; while (a - p > Math.PI) a -= TAU; while (p - a > Math.PI) a += TAU; p = a; return [k[0], k[1], k[2], a, k[4]]; }); };
  const STAND = { boy: [-.045, BRIDGE.z], girl: [.095, BRIDGE.z] };     // on the top of the bridge
  const BOY_WAY = unwrap([
    [0, -.62, .03, R], [.3, -.62, .03, R], [.55, -.608, .03, R, 'in'], [2.55, -.338, .03, R, 'linear'], [2.8, -.3, .03, R, 'out'],
    [2.95, -.3, .03, -2.6], [3.35, -.258, -.1, -2.55], [4.75, -.258, -.1, -2.55], [4.95, -.258, -.1, -.3], [5.4, -.29, .035, -.25], [5.6, -.29, .035, -R],
    [6.9, -.29, .035, -R], [7.15, -.3, .035, -1.75], [7.7, -.3, .035, -1.75], [7.9, -.29, .035, -1.4], [9.2, -.29, .035, -1.4], [9.7, -.29, .035, -.6],
    [10.45, -.29, .035, -.6], [10.6, -.29, .035, 2.5], [11.1, -.235, -.045, R, 'linear'], [13.4, .275, -.045, R, 'linear'], [13.6, .285, .0, -.2],
    [14.05, .2, .11, -.45, 'out'], [14.35, .2, .11, 1.17], [16.9, .2, .11, 1.17], [17.25, .2, .11, 2.9], [18, .2, .11, 2.9], [18.4, .2, .11, .9],
    [21.7, .2, .11, .9], [21.85, .2, .11, 2.8], [22.25, .255, -.045, 2.8, 'linear'], [22.4, .24, -.045, -R], [23.25, STAND.boy[0], STAND.boy[1], -R, 'linear'], [23.6, STAND.boy[0], STAND.boy[1], Math.PI - .35],
    [31.6, STAND.boy[0], STAND.boy[1], Math.PI - .35], [32.1, STAND.boy[0], STAND.boy[1], R], [32.3, STAND.boy[0], STAND.boy[1], R],
    [32.65, STAND.boy[0] - .065, STAND.boy[1], R], [34.6, STAND.boy[0] - .065, STAND.boy[1], R], [35, STAND.boy[0] + .02, STAND.boy[1], R]
  ]);
  const GIRL_WAY = unwrap([
    [0, -.77, .07, R], [.3, -.77, .07, R], [.55, -.758, .07, R, 'in'], [2.55, -.488, .07, R, 'linear'], [2.8, -.45, .07, R, 'out'],
    [3.2, -.45, .07, 2.2], [4.9, -.45, .07, 2.2], [5.3, -.45, .07, 1.6], [6.95, -.45, .07, 1.6], [7.3, -.45, .07, .7], [7.75, -.45, .07, .9],
    [8, -.45, .07, 1.5], [9.2, -.45, .07, 1.5], [9.7, -.45, .07, .6],
    [10.6, -.45, .07, .6], [10.75, -.45, .07, 2.1], [11.6, -.27, -.035, 2.05, 'linear'], [11.85, -.245, -.045, R], [14.25, .275, -.045, R, 'linear'],
    [14.45, .305, -.005, .9], [14.8, .345, .085, .3, 'out'], [15, .345, .085, -1.17], [16.6, .345, .085, -1.17], [16.95, .345, .085, 2.92],
    [17.95, .345, .085, 2.92], [18.3, .345, .085, -.9],
    [22.25, .345, .085, -.9], [22.45, .32, .03, -2.4], [22.83, .285, -.045, -R, 'linear'], [23.42, STAND.girl[0], STAND.girl[1], -R, 'linear'], [23.75, STAND.girl[0], STAND.girl[1], Math.PI + .35],
    [31.7, STAND.girl[0], STAND.girl[1], Math.PI + .35], [32.2, STAND.girl[0], STAND.girl[1], -R], [34.5, STAND.girl[0], STAND.girl[1], -R],
    [35, STAND.girl[0] - .02, STAND.girl[1], -R]
  ]);
  const keysOf = way => [1, 2, 3].map(i => way.map(k => [k[0], k[i], k[4] || 'smooth']));
  const BOY_KEYS = keysOf(BOY_WAY), GIRL_KEYS = keysOf(GIRL_WAY);
  const wayAt = (keys, g) => keys.map(k => tween(g, k));

  /* the first stars of the night, one after another as the sky darkens */
  const STARS = Array.from({ length: 30 }, (_, i) => { const x = (rand() - .5) * 1.04; return { x, y: .4 + rand() * .36, z: S.pageZ(x) + .015 + .02 * rand(),
    color: ['#ffffff', '#fff2c4', '#cfe0ff'][i % 3], size: .01 + rand() * .012, life: 1e6, shape: i % 3 ? 'glow' : 'star', twinkle: 1.5 + rand() * 3 }; });
  const STAR_KEYS = STARS.map((_, i) => `star${i}`);

  /* ── where things are in someone's hands ── */
  const mStage = new THREE.Matrix4(), qInv = new THREE.Quaternion(), vShoulder = new THREE.Vector3(), vTmp = new THREE.Vector3(), vTmp2 = new THREE.Vector3();
  const vMeet = new THREE.Vector3(), vHand = new THREE.Vector3(), vHandL = new THREE.Vector3(), vHandG = new THREE.Vector3(), vHandGL = new THREE.Vector3();
  /** a bone's place on the stage */
  const at = (m, bone, out) => { const b = m.node(bone); b.updateWorldMatrix(true, false); return out.setFromMatrixPosition(b.matrixWorld).applyMatrix4(mStage); };
  const D = [0, 0, 0], U = [0, 0, 0];                                 // directions handed to aim(), filled in place
  const toward = (m, side, target) => { at(m, `upperarm.${side}`, vShoulder); vShoulder.subVectors(target, vShoulder).applyQuaternion(qInv.copy(m.root.quaternion).invert()); return vShoulder.toArray(D); };
  /** an arm reaching for a point: the upper arm a little below the line, the forearm along it */
  function reach(m, side, target, k) {
    if (k <= 0) return;
    const d = toward(m, side, target); U[0] = d[0]; U[1] = d[1] - .25 * Math.hypot(d[0], d[2]); U[2] = d[2];
    m.aim(`upperarm.${side}`, U, k); m.aim(`lowerarm.${side}`, d, k);
  }
  /** an arm in the character's own space: [upper arm, forearm] for the right arm (the left mirrors x) */
  const arm = (m, side, [ua, fa], k) => { if (k <= 0) return; const s = side === 'l' ? -1 : 1; m.aim(`upperarm.${side}`, [ua[0] * s, ua[1], ua[2]], k); m.aim(`lowerarm.${side}`, [fa[0] * s, fa[1], fa[2]], k); };
  const ARM = {
    up: [[-.3, .9, .3], [-.2, 1, .2]],                                 // a hand up high: pointing at the sky
    chest: [[-.15, -.4, .9], [.55, .35, .75]],                         // a hand in front of the chest: holding a strip, a candy
    mouth: [[-.2, -.1, .95], [.5, .75, .5]],                           // a hand to the mouth
    head: [[-.5, .8, .2], [.6, .55, -.55]]                             // a hand to the back of the head: sheepish
  };

  let boy, girl, page, ground, river, bridge, stalls, stand, bamboo, fish, lanterns = [], warm = [], fw, fwLight;
  let candy, fan, myStrip, herStrip, bigStrip, photo, banner, bubble, hearts, fluff, sparks, stars, particles;

  return {
    seconds: [10, 10, 10, 10],

    build() {
      /* the two of them */
      boy = kit.model('boy').fit({ height: .3 }); girl = kit.model('girl').fit({ height: .29 });
      stage.add(boy.root, girl.root);
      dressBoy(); dressGirl();

      /* the festival: the sky page, the banks and the river, the bridge, the stalls and what is on them */
      page = S.makePage(); stage.add(page.root);
      ground = S.makeGround(); river = S.makeRiver(); bridge = S.makeBridge();
      stalls = [
        S.makeStall({ x: -.385, z: -.2, w: .17, d: .1, stripes: ['#ff7fae', '#fff4f8'], sign: 'Kẹo bông', ink: '#d6336c' }),
        S.makeStall({ x: -.2, z: -.205, w: .15, d: .1, stripes: ['#e8434b', '#fff6ec'], sign: 'Đồ nướng', ink: '#b3262e' }),
        S.makeStall({ x: .36, z: -.205, w: .17, d: .1, stripes: ['#4a8fe0', '#f2f8ff'], sign: 'Vớt cá vàng', ink: '#1f5fae' })
      ];
      stand = S.makeCandyStand(stalls[0]);
      const food = {}; for (const [n, w] of [['ham', .02], ['pot', .03], ['bowls', .026], ['buns', .05]]) food[n] = kit.model(n).fit({ width: w });
      S.makeGrill(stalls[1], food);
      fish = S.makeGoldfish(stalls[2].x, stalls[2].top, stalls[2].front - .045);
      bamboo = S.makeBamboo(.465, -.01);

      /* the lanterns, in the order they light: along the lane, the bridge's posts, over the goldfish */
      lanterns = S.makeString([-.49, .48, -.13], [-.125, .46, -.13], 7, .04, ['red', 'white']);
      for (const p of bridge.posts) { const l = S.makeLantern('white', .04); l.root.position.set(p.position.x, BANK + .15, p.position.z); stage.add(l.root); lanterns.push(l); }
      lanterns.push(...S.makeString([.2, .47, -.14], [.49, .48, -.14], 6, .035, ['white', 'red']));
      lanterns.forEach((l, i) => { l.at = .7 + i * .2; l.ph = i * 1.3; });
      warm = [[-.31, .36, .02], [.33, .36, -.04]].map(([x, y, z]) => { const p = new THREE.PointLight(0xffaa66, 0, .8, 1.6); p.position.set(x, y, z); stage.add(p); return p; });

      /* the fireworks and the light they throw */
      fw = window.NM_SUMMER.fireworks(kit, { RIVER, Z: -.22, SHOW }); stage.add(fw.root);
      fwLight = new THREE.PointLight(0xffffff, 0, 1.6, 1.2); stage.add(fwLight);
      fw.frameTo = (st, P) => {                                        // the frame shell's stars gather onto the photo's edge
        const hw = PHOTO_W / 2 + .012, hh = PHOTO_W * 620 / 512 / 2 + .012, d = st.d, t = Math.min(hw / (Math.abs(d[0]) || 1e-6), hh / (Math.abs(d[1]) || 1e-6));
        return [PHOTO_AT[0] + d[0] * t, PHOTO_AT[1] + PHOTO_W * 620 / 512 / 2 + d[1] * t, PHOTO_AT[2] + .005];
      };

      /* what they hold, and the card's words */
      candy = S.makeCandy('#ff9cc8', 1); stage.add(candy.root);
      fan = S.makeFan(words('note1', 'Mùa hè này có em là đủ ngọt')); stage.add(fan.root);
      myStrip = S.makeStrip('#8fd0ff', '', false); herStrip = S.makeStrip('#ff9cc0', '', false);
      bigStrip = S.makeStrip('#ff9cc0', words('note2', 'Điều ước của em là gì thế?'), true);
      photo = kit.polaroid({ width: PHOTO_W, caption: words('caption', 'Đêm pháo hoa của hai ta'), glow: .55, halo: true, haloColor: 0xffd28a });
      banner = kit.sign({ text: words('note3', 'Anh thích em nhiều lắm!'), style: 'banner', width: .62, accent: '#e8436d', paper: '#fffaf0', glow: .6 });
      bubble = kit.picture((c, px) => {                               // what he says when he bows: a heart in a speech bubble
        c.fillStyle = '#fffaf3'; c.strokeStyle = '#7b2343'; c.lineWidth = px * .035;
        c.beginPath(); c.ellipse(px / 2, px * .44, px * .42, px * .34, 0, 0, TAU); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(px * .3, px * .7); c.lineTo(px * .22, px * .92); c.lineTo(px * .44, px * .75); c.fill();
        c.fillStyle = '#ff4f7b'; kit.heartPath(c, px / 2, px * .46, px * .38); c.fill();
      }, { size: .09 });
      for (const p of [myStrip, herStrip, bigStrip]) stage.add(p.root);
      stage.add(photo.root, banner.root, bubble);
      for (const p of [photo, banner]) p.root.traverse(o => { o.castShadow = false; });

      /* particles */
      hearts = kit.particles({ max: 160 });
      fluff = kit.particles({ max: 80 });
      sparks = kit.particles({ max: 260, additive: true });
      stars = kit.particles({ max: 40, additive: true });
      particles = [hearts, fluff, sparks, stars];
      stage.add(hearts.root, fluff.root, sparks.root, stars.root);
    },

    reset() {
      for (const x of particles) x.clear();
      boy.stop(); girl.stop(); fw.reset();
    },

    pose({ chapter, g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();
      const night = lerp(.08, .45, ease.inOut(seg(g, 0, 10))) + .55 * ease.inOut(seg(g, 10, 18));
      const L = kit.lights, flash = fw.flash;

      /* the fireworks first: their flash lights everything else */
      const idle = chapter >= 2 ? (chapter === 2 ? seg(g, 28.3, 28.6) : seg(g, 38.4, 38.7)) : 0;
      fw.pose(g, T, idle);
      const fl = Math.min(1, (flash.r + flash.g + flash.b) / 2.2);
      fwLight.position.copy(fw.at); fwLight.color.copy(flash).multiplyScalar(1 / Math.max(.01, Math.max(flash.r, flash.g, flash.b))); fwLight.intensity = 1.1 * fl;

      /* light: dusk to night; the lanterns warm the lane, the bursts tint everything for a moment */
      L.hemi.color.copy(DUSK.hemi).lerp(NIGHT.hemi, night).lerp(fwLight.color, .25 * fl); L.hemi.groundColor.copy(DUSK.ground).lerp(NIGHT.ground, night);
      L.hemi.intensity = lerp(1.05, .42, night) + .2 * fl; L.sun.color.copy(DUSK.sun).lerp(NIGHT.sun, night); L.sun.intensity = lerp(1.25, .5, night);
      page.night.material.opacity = ease.smooth(seg(night, .3, 1));
      for (const m of ground.tint) m.color.copy(WHITE).lerp(NIGHT_GROUND, night);
      river.uniforms.uTime.value = T; river.uniforms.uNight.value = night; river.uniforms.uFlash.value.copy(flash).multiplyScalar(.2);

      /* the lanterns light one by one, each with a little swing and a pop */
      let litL = 0, litR = 0;
      lanterns.forEach((l, i) => {
        const k = ease.out(seg(g, l.at, l.at + .3)), pop = Math.sin(Math.PI * seg(g, l.at, l.at + .35));
        l.light(k * (1 + .05 * Math.sin(T * 7 + l.ph) * Math.sin(T * 3.1 + l.ph)));
        l.root.scale.setScalar(1 + .25 * pop); l.root.rotation.z = .06 * Math.sin(T * 1.3 + l.ph) + .1 * pop;
        if (i < 7) litL += k; else litR += k;
      });
      warm[0].intensity = .9 * litL / 7; warm[1].intensity = .9 * litR / 8;
      river.uniforms.uWarm.value = .5 * litR / 8;
      if (g > .7 && dt) for (const l of lanterns) if (g < l.at + .2 && g > l.at && kit.once(`pop${l.at}`)) {
        const p = l.root.position; sparks.burst(5, () => ({ x: p.x, y: p.y, z: p.z + .01, vx: (rng() - .5) * .12, vy: (rng() - .2) * .12, drag: 2, color: '#ffe2a8', size: .014, life: .5, shape: 'sparkle', spin: 3 }));
      }
      fish.pose(T); bamboo.pose(T, .6 * bump(g, 18.2, 18.5, 19, 19.6));
      stand.spin.root.rotation.y = T * 6;

      /* the sweethearts: where they are, which way they look, which clip; on the bridge they climb its arch */
      const [bx, bz, br] = wayAt(BOY_KEYS, g), [gx, gz, gr] = wayAt(GIRL_KEYS, g);
      const onDeck = (x, z) => (Math.abs(z - BRIDGE.z) < BRIDGE.width / 2 + .01 ? deckY(x) : BANK);
      boy.root.position.set(bx, onDeck(bx, bz), bz); boy.root.rotation.y = br;
      girl.root.position.set(gx, onDeck(gx, gz), gz); girl.root.rotation.y = gr;
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g);
      boy.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);

      /* bodies first (chests and heads), so the reaches below start from where the shoulders end up */
      const steal = bump(g, 7.1, 7.35, 7.55, 7.85), bow = bump(g, 32.7, 33.05, 33.7, 34.1);
      if (steal) { boy.bend('spine', .15 * steal, 0, 0); boy.bend('chest', .32 * steal, 0, 0); }
      if (bow) { boy.bend('spine', .12 * bow, 0, 0); boy.bend('chest', .32 * bow, 0, 0); boy.bend('head', .22 * bow, 0, 0); }

      /* ── chapter 1: in by the hand, the cotton candy, the fan ── */
      const hands1 = bump(g, .3, .5, 2.75, 2.95);
      if (hands1) { at(boy, 'upperarm.r', vMeet).add(at(girl, 'upperarm.l', vTmp)).multiplyScalar(.5); vMeet.y -= .045; reach(boy, 'r', vMeet, hands1); reach(girl, 'l', vMeet, hands1); }
      const wonder = bump(g, 1, 1.4, 2.2, 2.6);                       // the lanterns lighting overhead: they look up at them
      if (wonder) { boy.bend('head', -.35 * wonder, .2 * Math.sin(g * 3), 0); girl.bend('head', -.4 * wonder, -.25 * Math.sin(g * 2.5), 0); }
      const offer = bump(g, 5.3, 5.55, 5.95, 6.2), take = bump(g, 5.6, 5.85, 6.05, 6.3);
      if (offer) arm(boy, 'r', [[-.15, -.15, 1], [.05, .2, 1]], offer);
      if (take) reach(girl, 'r', at(boy, 'handslot.r', vHand), take);
      const bite = bump(g, 6.15, 6.4, 6.6, 6.85), away = bump(g, 6.9, 7.15, 7.65, 7.9);
      if (bite) { arm(girl, 'r', ARM.mouth, bite); girl.bend('head', .25 * bite * Math.max(0, Math.sin((g - 6.15) * 9)), 0, 0); }
      if (away) { arm(girl, 'r', ARM.chest, away); girl.bend('head', -.35 * away, .55 * away, 0); }   // the candy at her chest, her eyes on the lanterns
      if (steal) boy.bend('head', .2 * steal, -.2 * steal, 0);
      const sheepish = bump(g, 7.85, 8.05, 8.3, 8.45), chew = bump(g, 7.6, 7.7, 8.2, 8.4);
      if (sheepish) arm(boy, 'r', ARM.head, sheepish);
      if (chew) boy.bend('head', .08 * Math.sin(g * 30) * chew, 0, 0);
      const mine = bump(g, 7.85, 8, 9.6, 9.9);                       // "mine!": the candy whisked to her far hand, held away from him
      if (mine) arm(girl, 'l', [[.35, -.55, -.45], [.45, .3, -.2]], mine);
      const swat = bump(g, 8.15, 8.3, 8.45, 8.6), laugh = bump(g, 8.7, 8.9, 9.3, 9.5);
      if (swat) arm(girl, 'r', [[-.15, .15 + .45 * Math.sin((g - 8.15) * 9), .95], [-.1, .45, .9]], swat);
      else arm(girl, 'r', ARM.chest, bump(g, 8, 8.15, 8.6, 9.1) * .7);
      if (laugh) { for (const m of [boy, girl]) m.bend('chest', -.06 + .05 * Math.sin(g * 28), 0, 0, laugh); }
      const fanUp = ease.inOut(seg(g, 9, 9.8)), fanDown = ease.inOut(seg(g, 10, 10.6)), tucked = ease.smooth(seg(g, 10.6, 10.9));
      const lookUp = bump(g, 9.1, 9.5, 10.1, 10.4);
      if (lookUp) { boy.bend('head', -.3 * lookUp, 0, 0); girl.bend('head', -.3 * lookUp, 0, 0); }

      /* ── chapter 2: across the bridge by the hand; the wish strips ── */
      const hands2 = bump(g, 10.65, 10.95, 13.55, 13.8);
      if (hands2) { at(boy, 'upperarm.l', vMeet).add(at(girl, 'upperarm.r', vTmp)).multiplyScalar(.5); vMeet.y -= .04; reach(boy, 'l', vMeet, hands2); reach(girl, 'r', vMeet, hands2); }
      const point = bump(g, 14.85, 15.05, 15.3, 15.5);
      if (point) { arm(girl, 'r', ARM.up, point); girl.bend('head', -.35 * point, 0, 0); }
      const give = bump(g, 15.25, 15.45, 15.65, 15.85), hold = bump(g, 15.6, 15.8, 16.45, 16.65), holdHim = bump(g, 15.45, 15.65, 16.5, 16.7);
      if (give) { arm(boy, 'r', [[-.15, -.15, 1], [.05, .2, 1]], give); }
      if (hold) { arm(girl, 'l', ARM.chest, hold); arm(girl, 'r', [[-.2, -.35, .9], [.4 + .15 * Math.sin(T * 14), .3, .85]], hold); }
      if (holdHim) { arm(boy, 'l', ARM.chest, holdHim); arm(boy, 'r', [[-.2, -.35, .9], [.4 + .15 * Math.sin(T * 13 + 1), .3, .85]], holdHim); }
      const peek = bump(g, 15.85, 16.05, 16.3, 16.5), hide = bump(g, 15.95, 16.1, 16.35, 16.55);
      if (peek) boy.bend('head', .2 * peek, .5 * peek, 0);
      if (hide) girl.bend('head', .25 * hide, 0, 0);
      const tie = bump(g, 16.95, 17.2, 17.65, 17.9), tieHim = bump(g, 17.2, 17.45, 17.85, 18.05);
      const tipHer = bamboo.tips[0], tipHim = bamboo.tips[1];
      if (tie) reach(girl, 'r', tipHer, tie);
      if (tieHim) reach(boy, 'r', tipHim, tieHim);
      const shy = bump(g, 17.9, 18.2, 19.6, 19.9);
      if (shy) { girl.bend('head', .2 * shy, 0, .2 * shy * Math.sin(T * 2)); boy.bend('head', -.25 * shy, 0, 0); girl.bend('head', -.3 * bump(g, 18.4, 18.8, 19.6, 19.9), 0, 0); }

      /* every gesture is in: now where their hands are, for what they hold */
      at(boy, 'handslot.r', vHand); at(boy, 'handslot.l', vHandL); at(girl, 'handslot.r', vHandG); at(girl, 'handslot.l', vHandGL);

      /* the cotton candy: on the stand, into his hand, into hers, bitten twice, finished on the way to the bridge */
      const cs = stand.candies[0].root;
      if (g < 4.1) { candy.root.visible = false; cs.visible = true; }
      else {
        cs.visible = false; candy.root.visible = g < 11;
        const toHim = ease.smooth(seg(g, 4.1, 4.3)), toHer = ease.smooth(seg(g, 5.85, 6.05)), away2 = ease.smooth(seg(g, 7.85, 8));
        cs.getWorldPosition(vTmp).applyMatrix4(mStage);
        vTmp2.copy(vTmp).lerp(vHand, toHim).lerp(vHandG, toHer).lerp(vHandGL, away2);
        candy.root.position.copy(vTmp2).add(vTmp.set(0, -.012, 0));
        candy.root.rotation.set(0, 0, toHer ? -.3 * (1 - away) + .4 * away : .25);
        const left = 1 - .1 * seg(g, 6.4, 6.5) - .3 * seg(g, 7.4, 7.5) - .6 * ease.in(seg(g, 10.45, 10.75));
        candy.cloud.scale.setScalar(.024 * Math.max(.001, left));
        if (g > 10.75) candy.root.scale.setScalar(Math.max(.001, 1 - seg(g, 10.75, 10.95)));
        else candy.root.scale.setScalar(1);
      }
      for (const [t0, key, n] of [[4.1, 'grab', 6], [6.4, 'bite1', 8], [7.4, 'bite2', 16], [10.7, 'bite3', 10]]) if (g > t0 && g < t0 + .4 && kit.once(key)) {
        const p = candy.cloud.getWorldPosition(vTmp).applyMatrix4(mStage);
        fluff.burst(n, () => ({ x: p.x, y: p.y, z: p.z, vx: (rng() - .5) * .25, vy: .05 + rng() * .2, vz: (rng() - .5) * .2, gravity: -.25, drag: 1.2,
          color: ['#ffb3d6', '#ff9cc8', '#ffd6ea'][(rng() * 3) | 0], size: .012 + rng() * .01, life: .9, shape: 'glow', spin: 2 }));
        if (key === 'bite1' || key === 'bite2') hearts.burst(key === 'bite1' ? 4 : 7, () => ({ x: p.x, y: p.y + .06, z: p.z, vx: (rng() - .5) * .15, vy: .12 + rng() * .1,
          gravity: -.08, drag: .6, color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .018 + rng() * .01, life: 1.6, shape: 'heart', spin: (rng() - .5) * 3 }));
      }

      /* her paper fan: out of her sash for the swat, up into the air with the first words, back into her sash */
      const fanOut = ease.smooth(seg(g, 7.95, 8.15));
      fan.root.visible = g > 7.95 && tucked < 1;
      if (fan.root.visible) {
        const big = fanUp * (1 - fanDown), s = lerp(.15, .86, big) * (fanOut * (1 - tucked));
        vTmp.copy(g < 10 ? vHandG : vHandGL).lerp(vTmp2.set(-.31, .31 + .006 * Math.sin(T * 1.4), -.02), big);   // her near hand; back into the far one
        fan.root.position.copy(vTmp); fan.root.scale.setScalar(Math.max(.001, s));
        fan.root.rotation.set(lerp(.5, -.1, big), lerp(gr - R * .6, 0, big) + .03 * Math.sin(T * .9) * big, lerp(.6 + .5 * swat, .03 * Math.sin(T * 1.1), big));
      }
      if (g > 9.05 && g < 9.6 && kit.once('fan')) sparks.burst(16, () => ({ x: vHandG.x, y: vHandG.y + .05, z: vHandG.z, vx: (rng() - .5) * .3, vy: .1 + rng() * .3, drag: 1.5,
        color: ['#fff1b8', '#ffd1dc', '#ffffff'][(rng() * 3) | 0], size: .016 + rng() * .01, life: 1, shape: 'sparkle', spin: 4 }));

      /* the strips: from his sleeve into their hands, written on, tied to the branch tips; hers rises up big */
      const shown = g > 15.25 && g < 20.6;
      myStrip.root.visible = herStrip.root.visible = shown;
      if (shown) {
        const handed = ease.smooth(seg(g, 15.55, 15.75)), tiedHer = ease.smooth(seg(g, 17.35, 17.55)), tiedHim = ease.smooth(seg(g, 17.6, 17.8));
        herStrip.root.position.copy(vHand).lerp(g < 16.9 ? vHandGL : vHandG, handed).lerp(tipHer, tiedHer);
        myStrip.root.position.copy(vHand).lerp(vHandL, handed).lerp(tipHim, tiedHim);
        herStrip.root.rotation.set(.15 * Math.sin(T * 1.7) * tiedHer, (gr + .6) * (1 - tiedHer), Math.PI * (1 - tiedHer) + .2 * Math.sin(T * 1.3) * tiedHer);   // held up, then hanging
        myStrip.root.rotation.set(.15 * Math.sin(T * 1.5 + 1) * tiedHim, (br - .6) * (1 - tiedHim), Math.PI * (1 - tiedHim) + .2 * Math.sin(T * 1.2 + 2) * tiedHim);
        const rise = ease.inOut(seg(g, 18.3, 19.3)), back = ease.inOut(seg(g, 20, 20.5));
        herStrip.root.scale.setScalar(rise > 0 && back < 1 ? .001 : 1);
        bigStrip.root.visible = rise > 0 && back < 1;
        const up = rise * (1 - back), hook = bamboo.hook;
        bigStrip.root.position.set(lerp(tipHer.x, hook.x, up), lerp(tipHer.y, hook.y, up) + .004 * Math.sin(T * 1.3) * up, lerp(tipHer.z, hook.z + .03, up));
        bigStrip.root.scale.setScalar(Math.max(.001, lerp(.08, 1, ease.out(up))));
        bigStrip.root.rotation.set(.04 * Math.sin(T * 1.1), .12 * Math.sin(T * .7), .05 * Math.sin(T * 1.3));
        if (g > 15.25 && g < 15.6 && kit.once('strips')) sparks.burst(12, () => ({ x: vHand.x, y: vHand.y + .02, z: vHand.z, vx: (rng() - .5) * .2, vy: .05 + rng() * .2, drag: 2,
          color: ['#fff1b8', '#bfe6ff', '#ffd1dc'][(rng() * 3) | 0], size: .014, life: .8, shape: 'sparkle', spin: 4 }));
        if (hold && dt && rng() < dt * 12) sparks.emit({ x: vHandG.x, y: vHandG.y, z: vHandG.z + .01, vy: .03, color: '#ffe7a3', size: .01, life: .5, shape: 'sparkle', spin: 3 });
        if (g > 18.3 && g < 19.4 && dt && rng() < dt * 20) sparks.emit({ x: bigStrip.root.position.x + (rng() - .5) * .1 * up, y: bigStrip.root.position.y - .2 * up * rng(), z: bigStrip.root.position.z + .02,
          color: rng() < .5 ? '#fff1b8' : '#ffd1dc', size: .016, life: .9, shape: 'sparkle', spin: 3 });
      } else bigStrip.root.visible = false;

      /* the stars come out */
      STARS.forEach((st, i) => { if (g > 16.2 + i * .1 && kit.once(STAR_KEYS[i])) stars.emit(st); });

      /* ── chapter 3: the first firework; onto the bridge by the hand; she flinches and leans on him ── */
      const startle = bump(g, 21.15, 21.25, 21.6, 21.8);
      if (startle) girl.bend('head', -.2 * startle, 0, 0);
      const skyward = bump(g, 20.3, 20.6, 21, 21.3);                  // the whistle: both look up
      if (skyward) { boy.bend('head', -.4 * skyward, 0, 0); girl.bend('head', -.4 * skyward, 0, 0); }
      const hands3 = bump(g, 21.6, 21.85, 31.8, 32.1);
      if (hands3) { at(boy, 'upperarm.l', vMeet).add(at(girl, 'upperarm.r', vTmp)).multiplyScalar(.5); vMeet.y -= .045; reach(boy, g < 23.3 ? 'l' : 'r', vMeet, hands3); reach(girl, g < 23.3 ? 'r' : 'l', vMeet, hands3); }
      const watch = bump(g, 23.4, 23.8, 31.5, 31.9), lean = bump(g, 24.8, 25.3, 31.4, 31.8);
      if (watch) { boy.bend('head', -.3 * watch, 0, 0); girl.bend('head', -.32 * watch, 0, 0); }
      if (lean) { girl.bend('chest', 0, 0, .12 * lean); girl.bend('head', 0, 0, .3 * lean); boy.bend('head', 0, 0, -.12 * lean); }

      /* the photo: the golden frame shell's stars gather round it, it glows in the sky; at the last chapter it moves aside */
      const pIn = ease.out(seg(g, 27.35, 27.95)), aside = ease.inOut(seg(g, 30, 30.8));
      photo.root.visible = g > 27.3;
      photo.root.scale.setScalar(Math.max(.001, pIn * lerp(1, .42, aside)));
      photo.root.position.set(lerp(PHOTO_AT[0], PHOTO_ASIDE[0], aside), lerp(PHOTO_AT[1], PHOTO_ASIDE[1], aside) + .006 * Math.sin(T * 1.3), lerp(PHOTO_AT[2], PHOTO_ASIDE[2], aside));
      photo.root.rotation.set(-.06, .08 * Math.sin(T * .7), .04 * Math.sin(T * .6));
      photo.halo.material.opacity = .65 * pIn * (1 - .5 * aside) * (1 + .08 * Math.sin(T * 3));
      if (g > 27.3 && g < 27.7 && kit.once('photo')) sparks.burst(26, i => ({ x: PHOTO_AT[0] + (rng() - .5) * PHOTO_W, y: PHOTO_AT[1] + rng() * PHOTO_W * 1.2, z: PHOTO_AT[2] + .02,
        vx: (rng() - .5) * .1, vy: (rng() - .3) * .1, drag: 1.5, color: ['#fff1b8', '#ffd77a', '#ffffff'][i % 3], size: .02, life: 1.2, shape: 'sparkle', spin: 3 }));

      /* ── chapter 4: the heart; he turns to her, bows, she nods, the hug; the finale and the banner ── */
      const heartUp = bump(g, 31.3, 31.6, 32, 32.3);
      if (heartUp) { boy.bend('head', -.35 * heartUp, 0, 0); girl.bend('head', -.35 * heartUp, 0, 0); arm(girl, 'r', ARM.chest, heartUp); arm(girl, 'l', ARM.chest, heartUp); }
      bubble.visible = g > 33 && g < 34.4;
      bubble.position.set(STAND.boy[0] - .02, .44 + .02 * seg(g, 33, 34.4), BRIDGE.z + .03);
      bubble.scale.setScalar(Math.max(.001, .09 * ease.back(seg(g, 33, 33.3)) * (1 - ease.in(seg(g, 34.1, 34.4)))));
      const cover = bump(g, 33.5, 33.75, 34.2, 34.45), nod = bump(g, 34.1, 34.2, 34.75, 34.9);
      if (cover) { arm(girl, 'r', ARM.mouth, cover); arm(girl, 'l', ARM.mouth, cover); }
      if (nod) girl.bend('head', .3 * nod * Math.max(0, Math.sin((g - 34.1) * 11)), 0, 0);
      const hug = ease.smooth(seg(g, 34.9, 35.4)) * (1 - .3 * bump(g, 35.4, 35.6, 36, 36.3));
      if (hug) for (const m of [boy, girl]) {
        m.aim('upperarm.r', [-.42, .05, .9], hug); m.aim('lowerarm.r', [.8, .1, .6], hug);
        m.aim('upperarm.l', [.42, .05, .9], hug); m.aim('lowerarm.l', [-.8, .1, .6], hug);
      }
      if (g > 35.1 && g < 35.5 && kit.once('hug')) hearts.burst(26, () => ({ x: (STAND.boy[0] + STAND.girl[0]) / 2, y: .38, z: BRIDGE.z, vx: (rng() - .5) * .45, vy: .15 + rng() * .25, vz: (rng() - .5) * .2,
        gravity: -.18, drag: .9, color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .022 + rng() * .02, life: 2.4, shape: 'heart', spin: (rng() - .5) * 4 }));
      /* the banner unrolls from its left end behind a sparkler */
      const unroll = ease.inOut(seg(g, 37.6, 38.8)), bw = banner.width;
      banner.root.visible = g > 37.55;
      banner.root.scale.set(Math.max(.001, unroll), 1, 1);
      banner.root.position.set(.02 - bw / 2 * (1 - unroll), .64 + .006 * Math.sin(T * 1.5), .04);
      banner.root.rotation.set(-.1, 0, .015 * Math.sin(T * 1.1));
      banner.root.traverse(o => { if (o.material && o.material.map) { o.material.map.repeat.x = Math.max(.001, unroll); if (o.material.emissiveMap) o.material.emissiveMap.repeat.x = Math.max(.001, unroll); } });
      if (unroll > 0 && unroll < 1 && dt) for (let i = 0; i < 3; i++) sparks.emit({ x: .02 - bw / 2 + bw * unroll, y: .64 + (rng() - .5) * banner.height, z: .06, vx: (rng() - .3) * .25, vy: (rng() - .3) * .25,
        gravity: -.4, drag: 1.2, color: ['#fff1b8', '#ffd77a', '#ffffff'][i], size: .016, life: .6, shape: 'sparkle', spin: 4 });
      if (held && chapter === 3 && dt && rng() < dt * 1.4) hearts.emit({ x: (STAND.boy[0] + STAND.girl[0]) / 2 + (rng() - .5) * .1, y: .36, z: BRIDGE.z, vy: .06, sway: .03, color: '#ff8fab', size: .02, life: 2.4, shape: 'heart' });

      for (const x of particles) x.update(dt, T);
    }
  };
};
