/* Bữa tối nến hồng (a candlelit dinner for two), told by the shared act _acts/lovestory.js. Three chapters, each ending at a stop:
     1 · 0–7.3 s      dusk; rose petals drift down and a little round table for two drops in piece by piece; he walks in
                      leading her by the hand; he pulls out her chair while she flicks a magic spark at each of
                      the three pink candles; she sits and scoots in, he goes round to his own seat and they look at each
                      other; a menu card with the card's first words (note1) comes up
     2 · 7.3–12.5 s   two mugs drop from the sky into their hands; they lean in and clink with a spark, take a sip; the
                      card's photo comes sliding along the string lights on a clothes peg and swings to rest, its
                      caption under it
     3 · 12.5–18.1 s  the plates vanish and a heart-shaped cake rises out of the table, its candles light; they stand up
                      with their mugs and cheer; heart-shaped fireworks, a banner with the last words (note2) rises, the
                      mugs vanish in a sparkle and they step in side by side behind the cake, an arm round each other,
                      cheek to cheek
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const H = 0.32, HER = H * .945;                  // their heights, in card widths (her 1.70 m to his 1.80 m)
  const K = H / 2.315;                             // one KayKit unit in card widths: the props' scale (that pack's people stood 2.315 tall)
  const MID = { x: 0, z: .09 };                    // the table's middle
  const SPREAD = .66;                              // each seat turns this far from the phone, towards the other one
  const OUT = .045;                                // how far a chair is pulled out from the table
  const DAY = { hemi: new THREE.Color('#fff6f0'), ground: new THREE.Color('#c9a9c4'), sun: new THREE.Color('#ffffff') };
  const DUSK = { hemi: new THREE.Color('#ffd9c9'), ground: new THREE.Color('#5b3a57'), sun: new THREE.Color('#ffd0ad') };
  const C = { wine: '#7a1f35', pink: '#f59ab8', cream: '#fff7ee', gold: '#e2b04f', leaf: '#4f9a52', rose: '#d6234f' };
  /* the tabletop's height and radius; where the chair clips sit them: the seat's top (.098 H / .4 for him, .102 H / .4 for
     her: the chairs are made that high) and the hips .066 H / .4 behind the feet (each stands that far in front of the seat) */
  const TOP = .86 * K, RT = 1.5 * .74 * K, SEAT = (.098 * H + .102 * HER) / .8, BACK = .066 * H / .4, BACK_HER = .066 * HER / .4;
  const MUG = .5 * K;                              // a mug's scale: a size for grown-up hands
  let boy, girl, chairs, plates, candles, vase, mugs, mouths, bulbs, lanterns, petals, cake, cakeFlames;
  let menu, photo, peg, halo, banner, sparks, hearts, motes, fireworks;
  const drops = [];                                // [object, its place, from g, from how high]
  const chairAt = [];                              // the chairs' places: they slide out and in
  const v3 = new THREE.Vector3(), w3 = new THREE.Vector3(), mid3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), e3 = new THREE.Euler(), m4 = new THREE.Matrix4();

  /* the seats: f is the way a seat faces (to the table, turned to the phone); a chair's middle is where the seated hips go */
  const seat = side => {
    const f = { x: -side * Math.sin(SPREAD), z: Math.cos(SPREAD) }, r = RT + .085 * K + BACK;
    return { f, x: MID.x - f.x * r, z: MID.z - f.z * r, turn: -side * SPREAD };
  };
  let LEFT, RIGHT;                                 // her seat (side -1) and his (side 1)

  /* who does what, from story time g: [from g, clip, options] */
  const BOY = [
    [0, 'Idle'], [.1, 'Walking_A'], [2.15, 'Idle', { fade: .2 }], [2.25, 'Interact', { once: true }],
    [3.05, 'Walking_A'], [3.8, 'Idle', { fade: .15 }], [4.02, 'Walking_A'], [5.55, 'Idle', { fade: .2 }],
    [5.85, 'Sit_Chair_Down', { once: true, fade: .2 }],
    [6.65, 'Sit_Chair_Idle', { fade: .3 }], [14.2, 'Sit_Chair_StandUp', { once: true, fade: .2 }], [15, 'Idle', { fade: .2 }],
    [15.05, 'Cheer', { once: true }], [16.7, 'Walking_A', { fade: .3 }], [17.25, 'Idle', { fade: .3 }]
  ];
  const GIRL = [
    [0, 'Idle'], [.1, 'Walking_A'], [2.05, 'Idle', { fade: .25 }], [3.1, 'Walking_A'],
    [3.75, 'Idle', { fade: .15 }], [3.9, 'Sit_Chair_Down', { once: true, fade: .2 }], [4.7, 'Sit_Chair_Idle', { fade: .3 }],
    [14.25, 'Sit_Chair_StandUp', { once: true, fade: .2 }], [15.05, 'Idle', { fade: .2 }], [15.1, 'Cheer', { once: true }],
    [16.7, 'Walking_A', { fade: .3 }], [17.25, 'Idle', { fade: .3 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };

  /** a walk: keys [[g, x, z, ease?], …]; between keys it goes at an even pace unless an ease says otherwise */
  const walk = (g, keys) => [tween(g, keys.map(k => [k[0], k[1], k[3] || 'linear'])), tween(g, keys.map(k => [k[0], k[2], k[3] || 'linear']))];

  /** a thing dropped in at g0 from h up: [height above its place, its squash (1: none), shown yet] */
  function landing(g, g0, h) {
    const t = g - g0;
    if (t <= 0) return [h, 1, false];
    if (t < .3) { const k = t / .3; return [h * (1 - k * k), 1 + .14 * k, true]; }                         // falls, stretching
    const b = t - .3, hop = b < .24 ? 4 * h * .12 * (b / .24) * (1 - b / .24) : 0;                         // one small bounce
    return [hop, 1 - .2 * Math.exp(-b * 12) * Math.cos(b * 28), true];                                      // squashes, wobbles back
  }

  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .75, ...o }));
  function mesh(g, m, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(kit.keep(g), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o;
  }
  const glowing = (color, glow) => kit.keep(new THREE.MeshStandardMaterial({ color, emissive: glow, emissiveIntensity: 0, roughness: .4 }));

  /* ── the props built here: a tablecloth, candles, a rose, string lights, a heart cake ── */
  function tablecloth() {
    const g = new THREE.Group(), r0 = RT * 1.04, fall = .26 * K;
    const cloth = mat(C.cream, { roughness: .92, side: THREE.DoubleSide, emissive: '#fff1e6', emissiveIntensity: .12 });
    const top = mesh(new THREE.CircleGeometry(r0, 56), cloth, 0, TOP + .0012, 0); top.rotation.x = -Math.PI / 2;
    const skirtGeo = new THREE.CylinderGeometry(r0, r0 * 1.07, fall, 72, 3, true), p = skirtGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {                                    // folds, deeper towards the hem
      const a = Math.atan2(p.getZ(i), p.getX(i)), k = (fall / 2 - p.getY(i)) / fall, w = 1 + .035 * k * Math.sin(a * 13);
      p.setXYZ(i, p.getX(i) * w, p.getY(i) - k * fall * .16 * (1 + Math.sin(a * 13)), p.getZ(i) * w);
    }
    skirtGeo.computeVertexNormals();
    const skirt = mesh(skirtGeo, cloth, 0, TOP - fall / 2 + .001, 0); skirt.receiveShadow = false;
    const runner = mesh(new THREE.TorusGeometry(r0 * .985, .0022, 6, 72), mat(C.pink, { roughness: .6 }), 0, TOP + .0015, 0);
    runner.rotation.x = Math.PI / 2;                                       // a pink hem round the top
    g.add(top, skirt, runner);
    return g;
  }
  function candle(h, i) {                                                  // a pink candle in a brass cup; its flame lights the faces
    const g = new THREE.Group(), r = .075 * K, base = .07 * K;
    g.add(mesh(new THREE.CylinderGeometry(r * 1.7, r * 2, base, 20), mat(C.gold, { metalness: .65, roughness: .3 }), 0, base / 2, 0));
    g.add(mesh(new THREE.CylinderGeometry(r, r, h, 18), mat(['#f7a6c1', '#f490b2', '#fbb9cf'][i % 3], { roughness: .55, emissive: '#ff8fb0', emissiveIntensity: .22 }),
      0, base + h / 2, 0));
    g.add(mesh(new THREE.CylinderGeometry(r * .12, r * .12, .05 * K, 6), mat('#3a2a2a'), 0, base + h + .025 * K, 0));
    const flame = mesh(new THREE.SphereGeometry(r * .7, 14, 10), glowing('#fff3c4', '#ffb347'));
    flame.material.emissiveIntensity = 2.2; flame.castShadow = flame.receiveShadow = false; flame.position.y = base + h + .11 * K;
    const glowS = kit.glow({ color: 0xffc070, size: .06, opacity: 0 }); glowS.position.copy(flame.position);
    const light = new THREE.PointLight(0xffa45c, 0, .6, 2); light.position.copy(flame.position); light.position.y += .02;
    g.add(flame, glowS, light);
    return Object.assign(g, { flame, glowS, light });
  }
  function roseVase() {
    const g = new THREE.Group(), s = K * .9;
    const pts = [[0, 0], [.1, 0], [.13, .05], [.12, .17], [.06, .26], [.045, .31], [.07, .36]].map(([x, y]) => new THREE.Vector2(x * s, y * s));
    g.add(mesh(new THREE.LatheGeometry(pts, 24), mat('#eef3ff', { roughness: .15, metalness: .1 })));
    const stem = new THREE.CatmullRomCurve3([[0, .26], [.02, .45], [-.01, .62], [.01, .74]].map(([x, y]) => new THREE.Vector3(x * s, y * s, 0)));
    g.add(mesh(new THREE.TubeGeometry(stem, 12, .014 * s, 6), mat(C.leaf)));
    const leafM = mat('#5fb05f');
    for (const [y, a] of [[.48, .9], [.6, -1]]) {
      const l = mesh(new THREE.SphereGeometry(.06 * s, 10, 6), leafM, Math.sign(a) * .05 * s, y * s, 0); l.scale.set(1.6, .35, .8); l.rotation.z = a; g.add(l);
    }
    const red = mat(C.rose, { roughness: .5 }), bloom = new THREE.Group(); bloom.position.y = .77 * s; g.add(bloom);
    bloom.add(mesh(new THREE.SphereGeometry(.07 * s, 14, 10), red, 0, .02 * s, 0));
    for (let i = 0; i < 5; i++) {                                         // outer petals cupped round the bud
      const a = i / 5 * Math.PI * 2, p = mesh(new THREE.SphereGeometry(.07 * s, 10, 8, 0, Math.PI), red, Math.cos(a) * .05 * s, 0, Math.sin(a) * .05 * s);
      p.rotation.set(-.5, -a + Math.PI / 2, 0); p.scale.set(1, 1.1, .5); bloom.add(p);
    }
    return g;
  }
  /* the wire of string lights over the back of the card, between two posts: its height at x */
  const WIRE = { x: .46, z: -.27, top: .72, sag: .075 };
  const wireY = x => WIRE.top - WIRE.sag * (1 - (x / WIRE.x) ** 2);
  function stringLights() {
    const g = new THREE.Group(), iron = mat('#3b2c34', { roughness: .5, metalness: .3 });
    for (const s of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(s * WIRE.x, 0, WIRE.z);
      p.add(mesh(new THREE.CylinderGeometry(.005, .008, WIRE.top + .02, 8), iron, 0, (WIRE.top + .02) / 2, 0));
      p.add(mesh(new THREE.CylinderGeometry(.016, .02, .012, 12), iron, 0, .006, 0));
      p.add(mesh(new THREE.SphereGeometry(.01, 10, 8), mat(C.gold, { metalness: .6, roughness: .3 }), 0, WIRE.top + .025, 0));
      g.add(p);
    }
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => { const x = -WIRE.x + i / 12 * WIRE.x * 2; return new THREE.Vector3(x, wireY(x), WIRE.z); }));
    g.add(mesh(new THREE.TubeGeometry(curve, 48, .0022, 5), mat('#2b2026')));
    const cols = ['#ffd27a', '#ff9fbf', '#fff1d0', '#ffb36b'];
    bulbs = Array.from({ length: 13 }, (_, i) => {
      const x = -WIRE.x + (i + .5) / 13 * WIRE.x * 2, col = cols[i % 4];
      const b = mesh(new THREE.SphereGeometry(.0075, 10, 8), glowing(col, col), x, wireY(x) - .013, WIRE.z); b.castShadow = false;
      const glowB = kit.glow({ color: new THREE.Color(col).getHex(), size: .055, opacity: 0 }); glowB.position.copy(b.position);
      g.add(b, glowB);
      return { b, glowB };
    });
    return g;
  }
  /* rose petals that drift down at the start and stay: a path to the table, a few round it */
  function petalRain() {
    const n = 42, shape = new THREE.Shape();
    shape.moveTo(0, -.009); shape.bezierCurveTo(.008, -.006, .007, .006, 0, .009); shape.bezierCurveTo(-.007, .006, -.008, -.006, 0, -.009);
    const m = new THREE.InstancedMesh(kit.keep(new THREE.ShapeGeometry(shape, 6)), mat('#ffffff', { roughness: .6, side: THREE.DoubleSide }), n);
    const col = new THREE.Color();
    m.userData.p = Array.from({ length: n }, (_, i) => {
      const onPath = i < 26, t = rng();
      const x = onPath ? lerp(-.56, -.2, t) + (rng() - .5) * .03 : (rng() - .5) * .8, z = onPath ? -.08 + (rng() - .5) * .13 + .04 * Math.sin(t * 7) : .16 + rng() * .13;
      m.setColorAt(i, col.set(['#d6234f', '#f06292', '#f8a5c2', '#c2185b'][i % 4]));
      return { x, z, at: .05 + rng() * 1.1, turn: rng() * 6.28, spin: (rng() - .5) * 9, sway: rng() * 6.28, s: .8 + rng() * .5 };
    });
    m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false;
    return m;
  }
  function lantern() {                                                     // a little floor lantern with a candle glow inside
    const g = new THREE.Group(), iron = mat('#3b2c34', { roughness: .45, metalness: .4 }), w = .03, h = .045;
    g.add(mesh(new THREE.BoxGeometry(w + .008, .006, w + .008), iron, 0, .003, 0));
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.BoxGeometry(.003, h, .003), iron, x * w / 2, h / 2 + .006, z * w / 2));
    g.add(mesh(new THREE.ConeGeometry(w * .85, .022, 4), iron, 0, h + .017, 0)); g.children[g.children.length - 1].rotation.y = Math.PI / 4;
    g.add(mesh(new THREE.TorusGeometry(.006, .0015, 6, 12), iron, 0, h + .033, 0));
    const glass = mesh(new THREE.BoxGeometry(w - .002, h - .004, w - .002), kit.keep(new THREE.MeshStandardMaterial({ color: '#fff2cf', emissive: '#ffb04f',
      emissiveIntensity: 0, transparent: true, opacity: .55, roughness: .2 })), 0, h / 2 + .006, 0);
    glass.castShadow = false;
    const glowL = kit.glow({ color: 0xffc070, size: .14, opacity: 0 }); glowL.position.y = h / 2 + .006;
    g.add(glass, glowL);
    return Object.assign(g, { glass, glowL });
  }
  function heartShape(w) {                                                 // a heart w wide, its tip towards -y
    const s = new THREE.Shape(), k = w / 2;
    s.moveTo(0, -.92 * k);
    s.bezierCurveTo(-.2 * k, -.7 * k, -k, -.35 * k, -k, .16 * k);
    s.bezierCurveTo(-k, .7 * k, -.42 * k, .9 * k, 0, .48 * k);
    s.bezierCurveTo(.42 * k, .9 * k, k, .7 * k, k, .16 * k);
    s.bezierCurveTo(k, -.35 * k, .2 * k, -.7 * k, 0, -.92 * k);
    return s;
  }
  function heartCake() {
    const g = new THREE.Group(), w = .9 * K, hSponge = .28 * K, hIcing = .07 * K, lift = .015 * K;
    const lay = (shape, depth, m, y) => {                                  // an extruded heart lying flat, its tip to the phone
      const e = mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * .12, bevelSize: w * .025, bevelSegments: 3, curveSegments: 24 }), m);
      e.rotation.x = -Math.PI / 2; e.position.y = y; return e;
    };
    g.add(lay(heartShape(w), hSponge, mat('#f6b3c6', { roughness: .8 }), lift));
    g.add(lay(heartShape(w * 1.04), hIcing, mat('#fff4f7', { roughness: .45 }), lift + hSponge));
    const top = lift + hSponge + hIcing + .02 * K, cream = mat('#ffffff', { roughness: .4 });
    heartShape(w * .94).getSpacedPoints(24).slice(0, -1).forEach(p => g.add(mesh(new THREE.SphereGeometry(.042 * K, 10, 8), cream, p.x, top, -p.y)));
    const berry = mat('#e0284f', { roughness: .4 }), calyx = mat(C.leaf);
    for (const [x, z] of [[-.2, -.1], [.22, -.08], [0, .24]]) {
      const b = mesh(new THREE.ConeGeometry(.055 * K, .11 * K, 10), berry, x * K, top + .05 * K, z * K); b.rotation.x = Math.PI; g.add(b);
      g.add(mesh(new THREE.CylinderGeometry(.045 * K, .02 * K, .02 * K, 8), calyx, x * K, top + .11 * K, z * K));
    }
    cakeFlames = [[-.17, .06], [0, -.08], [.17, .06]].map(([x, z], i) => {
      const c = new THREE.Group(); c.position.set(x * K, top - .02 * K, z * K);
      c.add(mesh(new THREE.CylinderGeometry(.022 * K, .022 * K, .26 * K, 10), mat(['#ffffff', '#ffd1df', '#ffffff'][i], { roughness: .5 }), 0, .13 * K, 0));
      const fl = mesh(new THREE.SphereGeometry(.03 * K, 10, 8), glowing('#fff3c4', '#ffb347'), 0, .31 * K, 0);
      fl.material.emissiveIntensity = 2.2; fl.castShadow = fl.receiveShadow = false;
      const gl = kit.glow({ color: 0xffc070, size: .045, opacity: 0 }); gl.position.copy(fl.position);
      c.add(fl, gl); g.add(c);
      return { fl, gl };
    });
    return g;
  }
  /* the menu card's frame: a wine-red card with a gold rule, behind the note */
  function menuFrame(w, h) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w);
    const c = cv.getContext('2d'), W = cv.width, Hh = cv.height;
    c.fillStyle = C.wine; c.beginPath(); c.roundRect(4, 4, W - 8, Hh - 8, 26); c.fill();
    c.strokeStyle = C.gold; c.lineWidth = 5; c.beginPath(); c.roundRect(14, 14, W - 28, Hh - 28, 20); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.roundRect(22, 22, W - 44, Hh - 44, 16); c.stroke();
    c.fillStyle = C.gold;
    for (const [x, y] of [[30, 30], [W - 30, 30], [30, Hh - 30], [W - 30, Hh - 30]]) { c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); }
    const tex = kit.keep(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(w, h)), kit.keep(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .05,
      roughness: .8, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .35 })));
    m.castShadow = true;
    return m;
  }

  /* a heart-shaped burst of sparks: the heart curve, pushed outwards */
  function heartBurst(cx, cy, cz, col, size = 1) {
    fireworks.burst(34, i => {
      const t = i / 34 * Math.PI * 2, hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      return { x: cx, y: cy, z: cz, vx: hx * .0105 * size, vy: hy * .0105 * size, gravity: -.05, drag: 1.5, color: col, size: .022,
        life: 1.5, shape: i % 4 ? 'glow' : 'sparkle' };
    });
  }
  /** a point of a model (a hand's mug) in the stage's own space */
  const onStage = (o, out) => stage.worldToLocal(o.getWorldPosition(out));

  /* where they go: her wait while her chair comes out, his step aside, the curve round his chair's corner, and where they
     end, side by side behind the cake */
  const WAIT = [-.26, -.02], GAP = [-.06, -.24], BEND = [.06, -.12], END = [.032, -.092];
  /* the chairs: hers is pulled out for her and she scoots in; his waits pulled out and slides in under him; both slide
     back when they stand */
  const standBack = g => OUT * ease.inOut(seg(g, 14.2, 14.75));
  const outL = g => OUT * (ease.inOut(seg(g, 2.65, 3)) - ease.inOut(seg(g, 4.7, 5))) + standBack(g);
  const outR = g => OUT * (1 - ease.inOut(seg(g, 6.55, 6.85))) + standBack(g);
  /** where one stands to sit on a seat: `back` in front of its middle, its chair `out` from the table */
  const sitOf = (s, back, out) => [s.x + s.f.x * (back - out), s.z + s.f.z * (back - out)];
  const behindHer = g => [LEFT.x - LEFT.f.x * (.1 + outL(g)), LEFT.z - LEFT.f.z * (.1 + outL(g))];   // to pull her chair out
  const close = g => ease.smooth(seg(g, 16.7, 17.25));                // the end: they step in side by side
  /** she: in beside him, her hand in his; waits clear of the chair (so it is seen coming out), steps in, sits, scoots in */
  function herAt(g, o) {
    const [sx, sz] = sitOf(LEFT, BACK_HER, outL(g));
    if (g < 3.9) [o[0], o[1]] = walk(g, [[.1, -.62, -.085], [1.6, -.32, -.085], [2.05, ...WAIT], [3.1, ...WAIT], [3.8, sx, sz]]);
    else { const k = close(g); o[0] = lerp(sx, -END[0], k); o[1] = lerp(sz, END[1], k); }
    return o;
  }
  /** he: leads her in, goes behind her chair and pulls it out, steps aside while she comes in, on round to his own seat */
  function hisAt(g, o) {
    const [fx, fz] = behindHer(g), [sx, sz] = sitOf(RIGHT, BACK, outR(g));
    if (g < 2.15) [o[0], o[1]] = walk(g, [[.1, -.6, -.155], [2.15, fx, fz]]);
    else if (g < 3.05) [o[0], o[1]] = [fx, fz];
    else if (g < 4.05) [o[0], o[1]] = walk(g, [[3.05, fx, fz], [3.85, ...GAP, 'smooth']]);
    else if (g < 5.6) {                                                // along a curve at an even pace, eased only at its ends
      const u = tween(g, [[4.05, 0], [4.35, .1, 'in'], [5.3, .9, 'linear'], [5.6, 1, 'out']]), a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
      o[0] = a * GAP[0] + b * BEND[0] + c * sx; o[1] = a * GAP[1] + b * BEND[1] + c * sz;
    } else { const k = close(g); o[0] = lerp(sx, END[0], k); o[1] = lerp(sz, END[1], k); }
    return o;
  }
  const PG = [0, 0], PB = [0, 0], P1 = [0, 0], P2 = [0, 0];
  /** Walking_A's speed for the ground really covered (KayKit's stride: .1 card widths a second at speed 1 for one .3 tall) */
  const pace = (at, g, h) => { const a = at(g, P1), b = at(g - .05, P2); return clamp(Math.hypot(a[0] - b[0], a[1] - b[1]) / .05 / (.1 * h / .3), .7, 3.4); };

  /* the arms, in the models' own units (metres): shoulder to elbow, elbow to the middle of the fist; the arm round the
     other at the end (aim directions, its own space: his over her shoulders, hers round his waist) */
  const ARMS = { boy: [.265, .328], girl: [.23, .308] }, HUG = { l: [[.83, -.4, -.4], [.58, -.8, .1]], r: [[-.88, .23, -.41], [-.3, -.19, .93]] };
  const vS = new THREE.Vector3(), vE = new THREE.Vector3(), vD = new THREE.Vector3(), vP = new THREE.Vector3(), vT = new THREE.Vector3();
  const qInv = new THREE.Quaternion(), AIM = [0, 0, 0];
  /** an arm reaching for a point on the stage: the elbow found from the two bones' lengths, bent down and out */
  function reach(m, side, target, k) {
    if (k <= 0) return;
    const s = m.scene.scale.x, [ua, fa] = m === boy ? ARMS.boy : ARMS.girl, a = ua * s, b = fa * s, out = side === 'l' ? 1 : -1;
    onStage(m.node(`upperarm.${side}`), vS);
    vD.subVectors(target, vS); const L = clamp(vD.length(), .3 * (a + b), .995 * (a + b)); vD.normalize();
    const cosA = clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    vP.set(out * .5, -1, -.2).applyQuaternion(m.root.quaternion); vP.addScaledVector(vD, -vP.dot(vD)).normalize();
    vE.copy(vS).addScaledVector(vD, a * cosA).addScaledVector(vP, a * sinA);
    qInv.copy(m.root.quaternion).invert();
    m.aim(`upperarm.${side}`, vT.subVectors(vE, vS).applyQuaternion(qInv).toArray(AIM), k);
    m.aim(`lowerarm.${side}`, vT.copy(vS).addScaledVector(vD, L).sub(vE).applyQuaternion(qInv).toArray(AIM), k);
  }
  /* a mug held by its handle, set from the hand each frame: upright on the stage, its cup past the knuckles (the way the
     fingers point, level); while it sips (0..1) the cup turns in between the hand and `mouth` and tips its top to the lips */
  const qStage = new THREE.Quaternion(), qYaw = new THREE.Quaternion(), qTip = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  const vF = new THREE.Vector3(), vA = new THREE.Vector3();
  function holdMug(mug, m, side, sip, mouth) {
    const slot = m.node(`handslot.${side}`);
    onStage(slot, mug.position);
    stage.getWorldQuaternion(qStage).invert();
    vF.set(side === 'r' ? 1 : -1, 0, 0).transformDirection(slot.matrixWorld).applyQuaternion(qStage).setY(0);   // the fingers' way
    if (vF.lengthSq() < 1e-6) vF.set(Math.sin(m.root.rotation.y), 0, Math.cos(m.root.rotation.y));
    if (sip) {                                                         // turned the shorter way round towards the lips
      onStage(mouth, vA).sub(mug.position);
      const a = Math.atan2(vF.x, vF.z), d = ((Math.atan2(vA.x, vA.z) - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      vF.set(Math.sin(a + d * sip), 0, Math.cos(a + d * sip));
    }
    vF.normalize();
    mug.position.addScaledVector(vF, .301 * MUG); mug.position.y -= .016 * MUG;
    qYaw.setFromAxisAngle(UP, Math.atan2(vF.z, -vF.x));                // its handle back towards the fist
    mug.quaternion.copy(qYaw);
    if (sip) {
      onStage(mouth, vA).sub(mug.position).setY(0).cross(UP).negate();
      if (vA.lengthSq() > 1e-10) mug.quaternion.premultiply(qTip.setFromAxisAngle(vA.normalize(), .7 * sip));
    }
  }

  return {
    seconds: [7.3, 5.2, 5.6],

    build() {
      /* the two of them */
      boy = kit.model('boy').fit({ height: H }); girl = kit.model('girl').fit({ height: HER });
      stage.add(boy.root, girl.root);
      LEFT = seat(-1); RIGHT = seat(1);

      /* the table, its cloth and its settings */
      const table = new THREE.Group(); stage.add(table);
      const tm = kit.model('table'); tm.scene.scale.set(.74 * K, .86 * K, .74 * K); table.add(tm.root, tablecloth());
      drops.push([table, new THREE.Vector3(MID.x, 0, MID.z), .05, .55]);

      const chairModel = kit.model('chair');
      chairModel.scene.scale.set(K, SEAT / .5, K);                          // its seat (.5 up) at the height the sitting clips sit at
      chairs = [chairModel.root, chairModel.root.clone(true)];
      chairs.forEach((c, i) => { stage.add(c); c.rotation.y = [LEFT, RIGHT][i].turn; chairAt[i] = new THREE.Vector3(); drops.push([c, chairAt[i], .3 + i * .14, .4]); });

      const plateModel = kit.model('plate'), foodModel = kit.model('food');
      plateModel.scene.scale.setScalar(.5 * K); foodModel.scene.scale.setScalar(.42 * K);
      const gold = mat(C.gold, { metalness: .7, roughness: .3 });
      plateModel.scene.traverse(o => { if (o.isMesh) o.material = gold; });  // a gold charger under each plate
      plates = [LEFT, RIGHT].map((s, i) => {
        const g = new THREE.Group(), r = .62 * K;
        const charger = i ? plateModel.root.clone(true) : plateModel.root, food = i ? foodModel.root.clone(true) : foodModel.root;
        food.position.y = .022 * K; food.rotation.y = s.turn + (i ? -.6 : .6);
        g.add(charger, food); stage.add(g);
        drops.push([g, new THREE.Vector3(MID.x - s.f.x * r, TOP + .002, MID.z - s.f.z * r), .62 + i * .12, .3]);
        return g;
      });

      candles = [[-.19, -.84, .3], [0, -.98, .42], [.19, -.84, .34]].map(([x, z, h], i) => {
        const c = candle(h * K, i); stage.add(c);
        drops.push([c, new THREE.Vector3(MID.x + x * K, TOP + .002, MID.z + z * K), .85 + i * .1, .25]);
        return c;
      });
      vase = roseVase(); stage.add(vase);
      drops.push([vase, new THREE.Vector3(MID.x - .42 * K, TOP + .002, MID.z + .55 * K), 1.15, .25]);

      /* the mugs ride in their inner hands (hers left, his right; holdMug), unseen until they drop in; their lips, for a sip */
      const mugModel = kit.model('mug'); mugModel.scene.scale.setScalar(MUG);
      mugs = [mugModel.root, mugModel.root.clone(true)]; stage.add(...mugs);
      mouths = [[girl, [0, 6.7, 11.2]], [boy, [0, 2, 9]]].map(([m, p]) => { const o = new THREE.Object3D(); o.position.set(...p); m.node('head')?.add(o); return o; });

      stage.add(stringLights());
      lanterns = [[-.39, .2], [.4, .17]].map(([x, z]) => { const l = lantern(); l.position.set(x, 0, z); l.rotation.y = x * .8; stage.add(l); return l; });
      petals = petalRain(); stage.add(petals);
      cake = heartCake(); stage.add(cake);

      /* the card's words and photo */
      menu = kit.sign({ text: words('note1', 'Cảm ơn em vì mọi bữa tối có em'), width: .34, paper: '#fffaf0', ink: C.wine, accent: C.gold, glow: .5 });
      const frame = menuFrame(.364, .34 * .62 + .024); frame.position.z = -.003; menu.root.add(frame);
      const ribbon = kit.sign({ text: 'Thực đơn', style: 'banner', width: .19, accent: C.wine, paper: '#ffe7a6', glow: .5 });
      ribbon.root.position.set(0, .34 * .62 / 2 - .004, .004); menu.root.add(ribbon.root);
      banner = kit.sign({ text: words('note2', 'Mãi bên nhau em nhé!'), style: 'banner', width: .56, accent: '#c2244f', glow: .45 });
      photo = kit.polaroid({ width: .25, caption: words('caption', 'Bữa tối đầu tiên của mình'), glow: .55 });
      peg = new THREE.Group(); peg.add(photo.root); photo.root.position.y = -photo.height + .006;   // hangs from its clothes peg
      const wood = mat('#c99b6d', { roughness: .7 });
      peg.add(mesh(new THREE.BoxGeometry(.011, .032, .007), wood, -.0033, -.004, .006), mesh(new THREE.BoxGeometry(.011, .032, .007), wood, .0033, -.004, .006));
      halo = kit.glow({ color: 0xffd9a0, size: .4, opacity: 0 });
      stage.add(menu.root, banner.root, peg, halo);

      /* particles */
      sparks = kit.particles({ max: 260, additive: true });
      hearts = kit.particles({ max: 140 });
      motes = kit.particles({ max: 60, additive: true });
      fireworks = kit.particles({ max: 320, additive: true });
      stage.add(sparks.root, hearts.root, motes.root, fireworks.root);
    },

    reset() {
      [sparks, hearts, motes, fireworks].forEach(p => p.clear());
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      const dusk = ease.smooth(seg(g, .2, 1.8));

      /* light: day to a warm dusk while the set comes in; then the candles and the string lights do the rest */
      kit.lights.hemi.color.copy(DAY.hemi).lerp(DUSK.hemi, dusk); kit.lights.hemi.groundColor.copy(DAY.ground).lerp(DUSK.ground, dusk);
      kit.lights.hemi.intensity = lerp(1.1, .8, dusk); kit.lights.sun.color.copy(DAY.sun).lerp(DUSK.sun, dusk); kit.lights.sun.intensity = lerp(1.5, .95, dusk);

      /* the chairs slide out and in (outL, outR) */
      const oL = outL(g), oR = outR(g);
      chairAt[0].set(LEFT.x - LEFT.f.x * oL, 0, LEFT.z - LEFT.f.z * oL); chairAt[1].set(RIGHT.x - RIGHT.f.x * oR, 0, RIGHT.z - RIGHT.f.z * oR);

      /* the set drops in, piece by piece, each with a squash and a hop */
      for (const [o, at, g0, h] of drops) {
        const [y, sq, shown] = landing(g, g0, h);
        o.visible = shown; o.position.set(at.x, at.y + y, at.z); o.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      }
      bulbs.forEach(({ b, glowB }, i) => {                               // the string lights come on in a wave, then twinkle
        const on = ease.out(seg(g, 1 + i * .06, 1.3 + i * .06)), tw = .8 + .2 * Math.sin(T * 2.3 + i * 1.7);
        b.material.emissiveIntensity = 1.8 * on * tw; glowB.material.opacity = .75 * on * tw;
      });
      lanterns.forEach((l, i) => {
        const on = ease.out(seg(g, 1.2 + i * .25, 1.6 + i * .25)), f = 1 + .08 * Math.sin(T * 13 + i * 4) * Math.sin(T * 5.1 + i);
        l.glass.material.emissiveIntensity = 1.4 * on * f; l.glowL.material.opacity = .7 * on * f;
      });
      if (g < 1.9 || !petals.userData.still) {                           // petals: each drifts down on its own, then lies still
        petals.userData.p.forEach((p, i) => {
          const k = seg(g, p.at, p.at + .9);
          v3.set(p.x + .03 * Math.sin(p.sway + k * 7) * (1 - k), .42 * (1 - ease.out(k)) + .0012 + i * .00002, p.z);
          q4.setFromEuler(e3.set(-Math.PI / 2 + 1.1 * Math.sin(p.sway + k * 9) * (1 - k), 0, p.turn + p.spin * k));
          petals.setMatrixAt(i, m4.compose(v3, q4, w3.setScalar(k > 0 ? p.s : 1e-4)));
        });
        petals.instanceMatrix.needsUpdate = true; petals.userData.still = g >= 1.9;
      }
      const flick = ease.smooth(seg(g, 2.05, 2.25)) * (1 - ease.smooth(seg(g, 2.95, 3.2)));
      if (flick) {                                                       // her hand up, a little flick for each spark, while he sees to her chair
        const pulse = Math.max(0, ...[2.25, 2.5, 2.75].map(t => 1 - Math.abs(g - t) / .12));
        girl.aim('upperarm.r', [-.3, .5, .8], flick); girl.aim('lowerarm.r', [-.15, .75 - .5 * pulse, .65 + .3 * pulse], flick);
      }
      candles.forEach((c, i) => {                                        // they light one by one, each by a spark from her hand
        const at = 2.5 + i * .25, k = ease.back(seg(g, at, at + .3)), fl = 1 + .1 * Math.sin(T * 17 + i * 2) * Math.sin(T * 7.3 + i);
        const u = seg(g, at - .25, at);
        if (u > 0 && u < 1 && dt) {                                       // the spark's flight: from her hand to the wick
          onStage(girl.node('handslot.r'), v3); w3.set(c.position.x, c.position.y + c.flame.position.y, c.position.z);
          const e = ease.inOut(u), arc = Math.sin(Math.PI * e);         // it swoops out over the front of the table, clear of his face
          const x = lerp(v3.x, w3.x, e), z = lerp(v3.z, w3.z, e) + .12 * arc, y = lerp(v3.y, w3.y, e) - .03 * arc;
          for (let j = 0; j < 3; j++) sparks.emit({ x: x + (rng() - .5) * .008, y: y + (rng() - .5) * .008, z, vy: .01, drag: 2, color: j ? '#ffe7a3' : '#ffb3d1',
            size: j ? .016 : .03, life: .4, shape: j ? 'sparkle' : 'glow', spin: 4 });
        }
        c.flame.visible = g > at; c.flame.scale.set(k, 1.9 * k * fl, k); c.flame.position.x = .0005 * Math.sin(T * 11 + i);
        c.glowS.material.opacity = .8 * k * fl; c.light.intensity = .03 * k * fl;
        if (g > at && kit.once(`light${i}`)) sparks.burst(10, () => ({ x: c.position.x, y: c.position.y + c.flame.position.y, z: c.position.z,
          vx: (rng() - .5) * .12, vy: .05 + rng() * .1, vz: (rng() - .5) * .12, drag: 2, color: '#ffd38a', size: .012, life: .6, shape: 'sparkle' }));
      });
      if (held && g < 12.6 && dt && rng() < dt * 2.5) {                  // while it waits: warm motes rise from the candles
        const c = candles[(rng() * 3) | 0];
        motes.emit({ x: c.position.x + (rng() - .5) * .03, y: c.position.y + c.flame.position.y + .02, z: c.position.z, vy: .03 + rng() * .02, sway: .02,
          color: rng() < .5 ? '#ffd38a' : '#ffb3c7', size: .009 + rng() * .006, life: 2.5, shape: 'glow', twinkle: 5 });
      }

      /* the end: after the cheer they step in side by side (close), an arm round each other, heads together */
      const finale = ease.inOut(seg(g, 17.05, 17.55));

      /* where they are (herAt, hisAt) and which way they look; a walk's steps keep pace with the ground it covers */
      const [gx, gz] = herAt(g, PG), [bx, bz] = hisAt(g, PB);
      girl.root.position.set(gx, .004 * Math.sin(Math.PI * seg(g, 4.7, 5)), gz);   // a hop as she scoots in
      const herSit = sitOf(LEFT, BACK_HER, oL), stepIn = Math.atan2(herSit[0] - WAIT[0], herSit[1] - WAIT[1]);
      girl.root.rotation.y = tween(g, [[0, Math.PI / 2], [3.1, Math.PI / 2], [3.3, stepIn], [3.6, stepIn], [3.88, LEFT.turn], [16.7, LEFT.turn], [17.25, .3]]);
      boy.root.position.set(bx, g > 5.85 ? .004 * Math.sin(Math.PI * seg(g, 6.55, 6.85)) : 0, bz);
      const behind = behindHer(g), hisSit = sitOf(RIGHT, BACK, oR);
      const toGap = Math.atan2(GAP[0] - behind[0], GAP[1] - behind[1]);
      const curveIn = Math.atan2(BEND[0] - GAP[0], BEND[1] - GAP[1]), curveOut = Math.atan2(hisSit[0] - BEND[0], hisSit[1] - BEND[1]);
      boy.root.rotation.y = tween(g, [[0, Math.PI / 2], [1.6, Math.PI / 2], [2.15, LEFT.turn], [3.05, LEFT.turn], [3.3, toGap], [3.75, toGap],
        [4.1, curveIn], [5.35, curveOut, 'linear'], [5.8, RIGHT.turn], [16.7, RIGHT.turn], [17.25, -.3]]);
      for (const [m, list, at, h] of [[girl, GIRL, herAt, HER], [boy, BOY, hisAt, H]]) {
        const c = clipAt(list, g); m.play(c[1], c[1] === 'Walking_A' ? { ...c[2], speed: pace(at, g, h) } : c[2]);
      }

      /* he leads her in by the hand, a step ahead: his right hand and her left meet between them */
      const hand = seg(g, .3, .6) * (1 - seg(g, 1.5, 1.8));
      if (hand) {
        onStage(boy.node('upperarm.r'), v3).add(onStage(girl.node('upperarm.l'), w3)).multiplyScalar(.5); v3.y -= .055;
        reach(boy, 'r', v3, hand); reach(girl, 'l', v3, hand);
      }

      /* chapter 1: the menu card */
      const n = ease.back(seg(g, 6.6, 7.2)) * (1 - ease.in(seg(g, 7.3, 7.6)));
      menu.root.scale.setScalar(Math.max(.001, n));
      menu.root.position.set(0, .55 + .1 * seg(g, 7.3, 7.6) + .007 * Math.sin(T * 1.6), .06);
      menu.root.rotation.set(-.1, 1.7 * (1 - ease.out(seg(g, 6.6, 7.15))), .035 * Math.sin(T * .9));   // it flips open as it comes

      /* chapter 2: the mugs drop into their inner hands; they clink and sip; then they look up at the photo */
      const catchUp = ease.smooth(seg(g, 7.35, 7.7)) * (1 - ease.smooth(seg(g, 7.95, 8.25)));
      const toast = ease.inOut(seg(g, 8.05, 8.5)) * (1 - ease.inOut(seg(g, 8.85, 9.15)));
      const sip = ease.inOut(seg(g, 9.1, 9.45)) * (1 - ease.inOut(seg(g, 9.85, 10.2)));
      const rest = seg(g, 7.35, 7.5) * (1 - seg(g, 14.1, 14.3));
      const look = ease.inOut(seg(g, 10.2, 10.8)) * (1 - ease.inOut(seg(g, 12.6, 13)));
      const eyes = ease.inOut(seg(g, 6.75, 7.15)) * (1 - ease.inOut(seg(g, 7.3, 7.5)));
      const lean = ease.inOut(seg(g, 11.2, 11.9)) * (1 - ease.inOut(seg(g, 12.6, 13)));
      for (const [m, s, mug, side, mouth] of [[girl, 1, mugs[0], 'l', mouths[0]], [boy, -1, mugs[1], 'r', mouths[1]]]) {   // s: the side the other one is on (+1 her left, -1 his right)
        const up = `upperarm.${side}`, low = `lowerarm.${side}`;
        if (rest) { m.aim(up, [s * .25, -.65, .7], rest); m.aim(low, [s * .05, .65, .8], rest); }             // the mug held up in front
        if (catchUp) { m.aim(up, [s * .3, .1, .95], catchUp); m.aim(low, [s * .1, .8, .6], catchUp); }       // a hand up to catch
        if (toast) {                                                       // the mug held out to the other's: arm forward, body leaning in
          m.aim(up, [s * .45, .3, .85], toast); m.aim(low, [s * .4, .5, .75], toast); m.bend('chest', .1, s * .1, -s * .14, toast);
        }
        if (finale) { m.aim(up, HUG[side][0], finale); m.aim(low, HUG[side][1], finale); m.bend('chest', 0, 0, -s * .25, finale); }   // an arm round the other
        if (sip) {                                                         // the hand up in front of the face, the cup at the lips
          const a = m.root.rotation.y;
          reach(m, side, onStage(mouth, v3).add(w3.set(.03 * Math.sin(a), -.02, .03 * Math.cos(a))), sip); m.bend('head', .08, 0, 0, sip);
        }
        if (eyes) m.bend('head', .04, s * .38, -s * .06 * (1 + .4 * Math.sin(T * 1.2)), eyes);          // seated at last: a look at each other
        if (look) m.bend('head', -.28 * look, s * .3 * look, -s * .1 * lean, 1);        // up at the photo; then heads lean together
        if (finale) m.bend('head', s < 0 ? .05 : 0, s * .25, -s * (.42 + .03 * Math.sin(T * 1.3)), finale);
        const fall = 1 - seg(g, 7.5 + (s < 0) * .12, 7.85 + (s < 0) * .12);           // falls in from above, then rides the hand
        const gone = seg(g, 16.45 + (s < 0) * .08, 16.7 + (s < 0) * .08);             // before they step in, it vanishes in a sparkle
        mug.visible = g > 7.5 + (s < 0) * .12 && gone < 1;
        holdMug(mug, m, side, sip, mouth);
        mug.position.y += .3 * fall * fall;
        mug.scale.setScalar(Math.max(.001, 1 - ease.in(gone)));
        if (gone > 0 && kit.once(`mug-gone${side}`)) sparks.burst(12, () => ({ x: mug.position.x, y: mug.position.y + .02, z: mug.position.z, vx: (rng() - .5) * .15,
          vy: .05 + rng() * .1, vz: (rng() - .5) * .1, drag: 2, color: '#ffe3a3', size: .014, life: .6, shape: 'sparkle' }));
      }
      if (g > 7.85 && kit.once('caught')) for (const mug of mugs) {           // a splash of foam as each lands
        onStage(mug, v3); sparks.burst(8, () => ({ x: v3.x, y: v3.y + .02, z: v3.z, vx: (rng() - .5) * .12, vy: .06 + rng() * .1, vz: (rng() - .5) * .1,
          gravity: -.4, drag: 1, color: '#fffaf0', size: .012, life: .5, shape: 'glow' }));
      }
      if (g > 8.5 && kit.once('clink')) {                                   // clink: a spark where the mugs meet
        mid3.copy(onStage(mugs[0], v3)).add(onStage(mugs[1], w3)).multiplyScalar(.5);
        sparks.burst(22, i => ({ x: mid3.x, y: mid3.y + .02, z: mid3.z + .01, vx: Math.cos(i / 22 * 6.28) * (.1 + rng() * .1), vy: Math.sin(i / 22 * 6.28) * (.1 + rng() * .1),
          drag: 2.4, color: i % 2 ? '#fff1b8' : '#ffd166', size: .016, life: .7, shape: i % 3 ? 'glow' : 'sparkle' }));
        hearts.burst(8, () => ({ x: mid3.x, y: mid3.y + .03, z: mid3.z, vx: (rng() - .5) * .1, vy: .1 + rng() * .08, gravity: -.06, drag: .8,
          color: ['#ff4f7b', '#ff8fab'][(rng() * 2) | 0], size: .022 + rng() * .01, life: 1.8, shape: 'heart', spin: (rng() - .5) * 3 }));
      }
      if (g > 17.45 && kit.once('cheek')) hearts.burst(14, () => ({ x: (rng() - .5) * .04, y: .36, z: -.06, vx: (rng() - .5) * .25, vy: .12 + rng() * .15,
        vz: (rng() - .5) * .08, gravity: -.15, drag: .9, color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .024 + rng() * .02,
        life: 2.2, shape: 'heart', spin: (rng() - .5) * 4 }));

      /* chapter 2: the photo, on a peg, slides along the string lights and swings to rest; later it moves aside */
      const slide = ease.out(seg(g, 9.6, 10.6)), aside = ease.inOut(seg(g, 12.6, 13.6));
      const px = lerp(lerp(.5, 0, slide), -.4, aside);
      const swing = g < 10.6 ? .22 * Math.sin(Math.PI * seg(g, 9.6, 10.6)) : -.2 * Math.exp(-(g - 10.6) * 2.6) * Math.sin((g - 10.6) * 7.5);
      peg.visible = g > 9.6; peg.position.set(px, wireY(px) + .004, WIRE.z + .008); peg.scale.setScalar(1 - .22 * aside);
      peg.rotation.z = swing + .025 * Math.sin(T * 1.4) * seg(g, 11.2, 12) - .25 * Math.sin(Math.PI * aside);
      halo.material.opacity = .5 * seg(g, 10.3, 11.1) * (1 - .7 * aside) * (1 + .08 * Math.sin(T * 3));
      halo.position.set(px, wireY(px) - photo.height * .55 * peg.scale.x, WIRE.z - .01);

      /* chapter 3: the plates go, the cake rises out of the table, the banner, fireworks */
      plates.forEach((p, i) => {
        const k = seg(g, 12.6 + i * .1, 12.95 + i * .1);
        if (k > 0) { p.scale.multiplyScalar(Math.max(.001, 1 - ease.in(k))); p.position.y += .05 * Math.sin(Math.PI * k); }
        if (k >= 1) p.visible = false;
        if (k > 0 && kit.once(`plate${i}`)) sparks.burst(12, () => ({ x: p.position.x, y: p.position.y + .02, z: p.position.z, vx: (rng() - .5) * .15,
          vy: .05 + rng() * .1, vz: (rng() - .5) * .1, drag: 2, color: '#ffe3a3', size: .014, life: .6, shape: 'sparkle' }));
      });
      const rise = ease.back(seg(g, 12.9, 13.9));
      cake.visible = g > 12.9; cake.position.set(MID.x, TOP - (1 - rise) * .75 * K, MID.z + .02 * K);
      if (g > 12.9 && g < 13.9 && dt && rng() < dt * 30) {                   // sparkles spiral up round it as it comes
        const a = g * 14 + rng(), r = .075;
        sparks.emit({ x: MID.x + Math.cos(a) * r, y: TOP + .01 + rng() * .05, z: MID.z + Math.sin(a) * r * .8, vy: .08 + rng() * .05, drag: .5,
          color: rng() < .5 ? '#ffe3a3' : '#ffb3c7', size: .014, life: .8, shape: 'sparkle', spin: 3 });
      }
      cakeFlames.forEach(({ fl, gl }, i) => {
        const k = ease.back(seg(g, 13.8 + i * .15, 14.05 + i * .15)), f = 1 + .1 * Math.sin(T * 19 + i * 3);
        fl.visible = k > 0; fl.scale.set(k, 1.8 * k * f, k); gl.material.opacity = .7 * k * f;
      });
      const b = ease.elastic(seg(g, 15.4, 16.4));
      banner.root.scale.setScalar(Math.max(.001, b));
      banner.root.position.set(0, .62 + .006 * Math.sin(T * 1.5), .05);
      banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      if (g > 15.2 && dt && kit.once(held ? `fw-held${Math.floor(T / .9)}` : `fw${Math.floor((g - 15.2) / .5)}`)) {
        heartBurst((rng() - .5) * .8, .55 + rng() * .25, -.22, ['#ff6f91', '#ffd166', '#ff9ec4', '#ffc2d1'][(rng() * 4) | 0], .8 + rng() * .4);
      }
      if (held && g > 17 && dt && rng() < dt * 1.5) hearts.emit({ x: (rng() - .5) * .12, y: .3, z: -.08, vy: .07, sway: .03, color: '#ff8fab', size: .02, life: 2.4, shape: 'heart' });

      [sparks, hearts, motes, fireworks].forEach(x => x.update(dt, T));
    }
  };
};
