/* Bó hoa bất ngờ (a surprise bouquet), told by the shared act _acts/lovestory.js. Three chapters, each ending at a stop:
     1 · 0–6.4 s     she stands reading her spellbook; he tiptoes in from the left with a bouquet hidden behind his back
                     and taps her shoulder; she jumps, the book flies off in a puff, and he holds the bouquet out with a
                     bow; a gift tag with the card's first words (note1) comes up
     2 · 6.4–12.4 s  she takes the bouquet, smells it and cheers; flowers bloom across the card in a wave from her feet,
                     butterflies rise, and the card's photo comes up out of the flowers with its caption
     3 · 12.4–18.8 s they join hands and twirl round the middle while petals swirl up and gather into a heart; they turn
                     to the front hand in hand and a banner with the last words (note2) rises
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2;
  const rand = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(520);   // the garden's own seed: the same flowers every time
  const SHE = { x: .16, z: -.02 }, TAKE = { x: .115, z: -.02 };     // where she reads; where she steps up to take the bouquet
  const HE = { x: -.07, z: -.02 }, TAP = .03;                        // where he stands after a hop back; where he taps her shoulder
  const END = { x: .084, z: .02 };                                    // side by side at the end, he at -x, she at +x
  const DANCE = .078;                                                // the twirl's radius: arm's length
  const PHOTO = { x: .055, z: -.17 };                                // where the photo comes up out of the flowers
  const DAY = { hemi: new THREE.Color('#fff6f0'), ground: new THREE.Color('#c9a9c4'), sun: new THREE.Color('#ffffff') };
  const ROSY = { hemi: new THREE.Color('#ffe4ec'), ground: new THREE.Color('#d9a0b8'), sun: new THREE.Color('#ffe2c8') };
  let boy, girl, hat, bouquet, book, bookHome, note, banner, photo, halo, field, petals, flies, flyFrom, bang, hearts, sparks, drift;

  /* the pose a character holds at story time g: which clip, where, which way it looks */
  const BOY = [                                                      // [from g, clip, options]
    [0, 'Walking_A', { speed: 1.65 }], [3.35, 'Idle', { fade: .3 }], [8.35, 'Cheer', { once: true, fade: .2 }], [10, 'Idle', { fade: .4 }],
    [12.95, 'Running_Strafe_Right', { fade: .3 }], [15.7, 'Idle', { fade: .4 }]
  ];
  const GIRL = [
    [0, 'Idle'], [4.3, 'Hit_B', { once: true, fade: .08 }], [4.95, 'Idle', { fade: .35 }], [6.45, 'Walking_A', { fade: .15 }],
    [6.95, 'Idle', { fade: .25 }], [7.7, 'Cheer', { once: true, fade: .2 }], [9.35, 'Idle', { fade: .4 }],
    [12.95, 'Running_Strafe_Right', { fade: .3 }], [15.7, 'Idle', { fade: .4 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));

  /* arm poses in a character's own space, [upper arm, forearm], for the right arm (the left one mirrors x); some move */
  const ARM = {
    read: [[-.3, -.55, .8], [.4, .45, .8]],                              // holding the open book in front
    page: (g) => { const k = Math.sin(Math.PI * seg(g, 1.5, 2.1)); return [[-.3, -.55, .8], [.4 + .35 * k, .45 + .1 * k, .8 - .35 * k]]; },   // turning a page
    back: [[-.2, -.75, -.6], [.45, -.25, -.85]],                       // hands behind the back
    offer: [[-.12, -.45, .9], [.05, -.05, 1]],
    fright: [[-.55, .45, .5], [-.1, .95, .25]],
    cheek: [[-.45, -.3, .55], [.5, .85, .2]],                          // hands to her cheeks
    reach: [[-.15, -.15, 1], [.05, .05, 1]],
    sniff: [[-.25, -.55, .75], [.55, .75, .35]],
    hug: [[-.3, -.5, .8], [.75, -.05, .65]],                          // a bouquet held close, low
    scratch: [[-.5, .8, .2], [.6, .55, -.55]],                         // a shy hand to the back of the head
    up: [[-.6, .75, -.25], [-.35, .9, -.2]],                            // held up high and back, away from the other one
    out: [[-.8, .45, .3], [-.6, .75, .2]],
    wave: (g, T) => [[-.45, .85, .25], [-.1 + .45 * Math.sin(T * 7), 1, .25]]
  };
  /* each arm's poses through the story: [from g, pose (null: the clip's own), seconds to blend in] */
  const ARMS = {
    boy: {                                                           // the bouquet is in his left hand, the far one
      r: [[0, 'back', 0], [3.72, 'tap', .28], [4.35, 'back', .45], [7.5, 'scratch', .4], [8.25, null, .2], [10.1, 'back', .5], [12.55, 'out', .45], [15.75, null, .4], [16.5, 'wave', .45]],
      l: [[0, 'back', 0], [4.68, 'offer', .5], [7.15, null, .45], [10.1, 'back', .5], [12.55, 'join', .45], [15.75, 'side', .5]]
    },
    girl: {                                                          // the book is in her left hand; she takes the bouquet in her right
      l: [[0, 'read', 0], [4.32, 'fright', .15], [4.9, 'cheek', .3], [7.65, null, .3], [9.05, 'hug', .55], [12.55, 'up', .45]],
      r: [[0, 'page', 0], [4.32, 'fright', .15], [4.9, 'cheek', .3], [6.55, 'reach', .45], [7.25, 'sniff', .4], [7.65, null, .15], [9.05, 'hug', .55], [12.55, 'join', .45], [15.75, 'side', .5]]
    }
  };
  /* reaches: arms that go for a point on the stage (her shoulder, the hand in his); straight, from the shoulder */
  const mStage = new THREE.Matrix4();                                // stage space from world space, this frame
  const MEET = new THREE.Vector3(), SHOULDER = new THREE.Vector3(), vTo = new THREE.Vector3(), qInv = new THREE.Quaternion();
  const toward = (m, side, target) => {
    const b = m.node(`upperarm.${side}`); b.updateWorldMatrix(true, false);
    SHOULDER.setFromMatrixPosition(b.matrixWorld).applyMatrix4(mStage);
    vTo.copy(target).sub(SHOULDER).applyQuaternion(qInv.copy(m.root.quaternion).invert());
    return [vTo.x, vTo.y, vTo.z];
  };
  const holdHand = (g, m, side) => { const d = toward(m, side, MEET); return [d, d]; };
  const REACH = {
    tap: (g, m, side) => { const d = toward(m, side, MEET); return [d, [d[0], d[1] + .5 * Math.max(0, Math.sin((g - 3.82) * 21)) * Math.hypot(d[0], d[2]), d[2]]]; },
    join: holdHand,                                                  // facing each other, to dance
    side: holdHand                                                   // side by side, at the end
  };
  const poseOf = (name, g, T, side, m) => {
    if (REACH[name]) return REACH[name](g, m, side);
    const p = typeof ARM[name] === 'function' ? ARM[name](g, T) : ARM[name];
    return side === 'l' ? p.map(d => [-d[0], d[1], d[2]]) : p;
  };
  function arms(m, keys, g, T) {
    for (const side of ['r', 'l']) {
      const list = keys[side]; let i = 0;
      while (i + 1 < list.length && g >= list[i + 1][0]) i++;
      const [t0, now, blend] = list[i], prev = i > 0 ? list[i - 1][1] : null;
      const k = blend ? ease.inOut(clamp((g - t0) / blend)) : 1;
      let pose = null, w = 1;
      if (now && prev) { const a = poseOf(prev, g, T, side, m), b = poseOf(now, g, T, side, m); pose = a.map((d, j) => d.map((v, n) => lerp(v, b[j][n], k))); }
      else if (now) { pose = poseOf(now, g, T, side, m); w = k; }
      else if (prev) { pose = poseOf(prev, g, T, side, m); w = 1 - k; }
      if (pose && w > 0) { m.aim(`upperarm.${side}`, pose[0], w); m.aim(`lowerarm.${side}`, pose[1], w); }
    }
  }

  /* ── things built here ── */
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .55, ...o }));
  /** a rose head, one unit across: a petal ribbon wound in a spiral, tight in the middle, curling open outside */
  function roseGeometry() {
    const pos = [], idx = [], N = 72;
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = t * 2.75 * TAU, r = .12 + .88 * Math.pow(t, .85);
      const top = .62 - .22 * t + .07 * Math.sin(a * 2.3), lean = 1 + .45 * t * t;
      pos.push(Math.cos(a) * r * .45, -.28 + .1 * t, Math.sin(a) * r * .45, Math.cos(a) * r * lean, top, Math.sin(a) * r * lean);
      if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return kit.keep(geo);
  }
  /** florist's paper: an open cone, its rim folded into soft points */
  function paperCone(r0, r1, h, color, turn) {
    const geo = kit.keep(new THREE.CylinderGeometry(r1, r0, h, 12, 1, true)), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) {
      const j = Math.round((Math.atan2(p.getZ(i), p.getX(i)) / TAU + 1) * 12) % 2, k = j ? .84 : 1.06;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) + (j ? -.008 : .005), p.getZ(i) * k);
    }
    geo.computeVertexNormals(); geo.translate(0, h / 2 - .006, 0);
    const m = new THREE.Mesh(geo, mat(color, { roughness: .85, side: THREE.DoubleSide })); m.rotation.y = turn;
    return m;
  }
  /** the bouquet: seven roses with leaves and baby's breath in two layers of paper, tied with a bow. Its origin is where a
      hand holds it, +y runs up through the flowers, the bow is on its +z side */
  function makeBouquet(roseG) {
    const b = new THREE.Group();
    const stemM = mat('#3f8f3f'), leafM = mat('#4fae55', { side: THREE.DoubleSide }), white = mat('#ffffff', { emissive: 0xffffff, emissiveIntensity: .2 });
    const stemG = kit.keep(new THREE.CylinderGeometry(.0017, .0017, .034, 5));
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(stemG, stemM); s.position.set((i - 2) * .0024, -.02, ((i * 7) % 3 - 1) * .0016); s.rotation.z = (i - 2) * .06; b.add(s); }
    b.add(paperCone(.0062, .036, .064, '#f59ab8', 0), paperCone(.0058, .03, .07, '#fff1f5', TAU / 24));
    const leafG = kit.keep(new THREE.SphereGeometry(1, 8, 5).scale(.0055, .0175, .0013).translate(0, .014, 0));
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Group(); p.rotation.y = i * TAU / 6 + .5; p.position.y = .048;
      const leaf = new THREE.Mesh(leafG, leafM); leaf.position.set(0, 0, .024); leaf.rotation.x = .95; p.add(leaf); b.add(p);
    }
    const tints = ['#d3173d', '#ff6f9a', '#e8264f', '#ffb3c8', '#c9123a', '#ff8fb0', '#ffd0dc'];
    const bulbG = kit.keep(new THREE.SphereGeometry(.42, 10, 8).scale(1, .7, 1).translate(0, -.12, 0));
    tints.forEach((c, i) => {
      const rose = new THREE.Group(), m = mat(c, { side: THREE.DoubleSide, emissive: c, emissiveIntensity: .12, roughness: .5 });
      rose.add(new THREE.Mesh(roseG, m), new THREE.Mesh(bulbG, m));
      const a = (i - 1) * TAU / 6, ring = i ? .018 : 0;
      rose.position.set(Math.sin(a) * ring, i ? .066 : .074, Math.cos(a) * ring);
      rose.rotation.set(0, a, 0); if (i) rose.rotateX(.5);              // the ring leans out
      rose.scale.setScalar(i ? .0115 : .0125); b.add(rose);
    });
    const dotG = kit.keep(new THREE.SphereGeometry(.0026, 6, 5));
    for (let i = 0; i < 14; i++) {
      const a = rand() * TAU, r = .02 + rand() * .012, d = new THREE.Mesh(dotG, white);
      d.position.set(Math.sin(a) * r, .068 + rand() * .012, Math.cos(a) * r); b.add(d);
    }
    const ribbon = mat('#d81b4f', { roughness: .4 });
    const loopG = kit.keep(new THREE.TorusGeometry(.0068, .0023, 6, 14)), tailG = kit.keep(new THREE.BoxGeometry(.0034, .019, .0012));
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(loopG, ribbon); l.position.set(s * .0078, .003, .0074); l.scale.set(1, .62, .55); l.rotation.z = s * .38; b.add(l);
      const tail = new THREE.Mesh(tailG, ribbon); tail.position.set(s * .0042, -.0085, .0079); tail.rotation.z = s * .28; b.add(tail);
    }
    const knot = new THREE.Mesh(kit.keep(new THREE.SphereGeometry(.0042, 10, 8)), ribbon); knot.position.set(0, .002, .0079); b.add(knot);
    b.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return b;
  }

  /* the garden that blooms in chapter 2: flowers as instanced meshes (stems, leaves, three kinds of heads) */
  function makeField(roseG) {
    const spots = [];
    for (let n = 0; spots.length < 118 && n < 9000; n++) {
      const x = (rand() - .5) * .95, z = (rand() - .5) * .57;
      if (((x - .04) / .22) ** 2 + ((z + .01) / .14) ** 2 < 1) continue;   // the couple's floor
      if (Math.hypot(x - PHOTO.x, z - PHOTO.z) < .055) continue;        // where the photo comes up
      if (spots.some(s => Math.hypot(s.x - x, s.z - z) < .039)) continue;
      const kind = rand() < .34 ? 'rose' : rand() < .5 ? 'daisy' : 'tulip';
      const tint = { rose: ['#e01e4a', '#ff6f91', '#ffb3c6', '#ff4f7b'], daisy: ['#ffffff', '#ffe0ec', '#dccbff', '#fff3b0'],
        tulip: ['#ff4f6d', '#ff8fab', '#ffd166', '#ffffff', '#c77dff'] }[kind];
      const h = z > .16 ? .02 + rand() * .016 : z < -.1 ? .045 + rand() * .04 : .03 + rand() * .026;   // short in front, tall at the back
      spots.push({ x, z, kind, h, color: new THREE.Color(tint[(rand() * tint.length) | 0]), at: 7.85 + Math.hypot(x - TAKE.x, z - TAKE.z) * 1.6 + rand() * .12,
        size: .8 + rand() * .45, ph: rand() * TAU, turn: rand() * TAU, leaf: new THREE.Color(['#4caf50', '#3d8b40', '#6cc070'][(rand() * 3) | 0]) });
    }
    const daisy = new THREE.Shape(); const P = 11;
    for (let i = 0; i <= P; i++) {
      const a = i / P * TAU, b = (i + .5) / P * TAU;
      if (!i) daisy.moveTo(Math.cos(a) * .3, Math.sin(a) * .3);
      daisy.quadraticCurveTo(Math.cos(a + .05) * 1.25, Math.sin(a + .05) * 1.25, Math.cos(b) * .3, Math.sin(b) * .3);
      if (i < P) daisy.lineTo(Math.cos(b) * .3, Math.sin(b) * .3);
    }
    const geos = {
      stem: kit.keep(new THREE.CylinderGeometry(.0022, .0028, 1, 5).translate(0, .5, 0)),
      leaf: kit.keep(new THREE.SphereGeometry(1, 8, 4).scale(.32, 1, .1).translate(0, .9, 0)),
      tulip: kit.keep(new THREE.LatheGeometry([[0, 0], [.6, .1], [.92, .45], [.86, .88], [.66, 1.2]].map(([x, y]) => new THREE.Vector2(x, y)), 10)),
      daisy: kit.keep(new THREE.ShapeGeometry(daisy).rotateX(-Math.PI / 2)),
      eye: kit.keep(new THREE.SphereGeometry(.32, 8, 6).scale(1, .55, 1)),
      rose: roseG
    };
    const inst = (geo, count, o = {}) => {
      const m = new THREE.InstancedMesh(geo, mat('#ffffff', { side: THREE.DoubleSide, roughness: .6, ...o }), Math.max(1, count));
      m.frustumCulled = false; m.castShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); stage.add(m); return m;
    };
    const count = k => spots.filter(s => s.kind === k).length;
    const f = { spots, stem: inst(geos.stem, spots.length), leaf: inst(geos.leaf, spots.length * 2),
      tulip: inst(geos.tulip, count('tulip')), daisy: inst(geos.daisy, count('daisy')), eye: inst(geos.eye, count('daisy')), rose: inst(geos.rose, count('rose')) };
    const n = { tulip: 0, daisy: 0, rose: 0 };
    spots.forEach((s, i) => {
      s.slot = n[s.kind]++;
      f[s.kind].setColorAt(s.slot, s.color);
      if (s.kind === 'daisy') f.eye.setColorAt(s.slot, new THREE.Color(rand() < .7 ? '#ffc83d' : '#b5651d'));
      f.stem.setColorAt(i, new THREE.Color('#3f9a46')); f.leaf.setColorAt(i * 2, s.leaf); f.leaf.setColorAt(i * 2 + 1, s.leaf);
    });
    for (const k of ['stem', 'leaf', 'tulip', 'daisy', 'eye', 'rose']) if (f[k].instanceColor) f[k].instanceColor.needsUpdate = true;
    return f;
  }
  const mI = new THREE.Matrix4(), qI = new THREE.Quaternion(), qJ = new THREE.Quaternion(), qK = new THREE.Quaternion(), eI = new THREE.Euler();
  const vI = new THREE.Vector3(), vS = new THREE.Vector3(), vT = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function poseField(g, T) {
    const f = field;
    f.spots.forEach((s, i) => {
      const k = ease.back(seg(g, s.at, s.at + .4)), kh = ease.elastic(seg(g, s.at + .16, s.at + .8));
      if (k <= 0) { f.stem.setMatrixAt(i, ZERO); f.leaf.setMatrixAt(i * 2, ZERO); f.leaf.setMatrixAt(i * 2 + 1, ZERO); f[s.kind].setMatrixAt(s.slot, ZERO); if (s.kind === 'daisy') f.eye.setMatrixAt(s.slot, ZERO); return; }
      eI.set(.05 * Math.sin(T * 1.3 + s.ph * 1.7), 0, .07 * Math.sin(T * 1.6 + s.ph)); qI.setFromEuler(eI);
      vI.set(s.x, 0, s.z);
      f.stem.setMatrixAt(i, mI.compose(vI, qI, vS.set(k, s.h * k, k)));
      for (const side of [0, 1]) {
        qJ.setFromEuler(eI.set(0, s.turn + side * Math.PI, -.85)).premultiply(qI);
        f.leaf.setMatrixAt(i * 2 + side, mI.compose(vI, qJ, vS.setScalar(.017 * k * s.size)));
      }
      vT.set(0, s.h * k, 0).applyQuaternion(qI).add(vI);
      qJ.copy(qI).multiply(qK.setFromEuler(eI.set(s.kind === 'daisy' ? .55 : 0, s.turn, 0)));   // daisies tip their faces to the phone
      const size = { tulip: .0145, daisy: .0175, rose: .0145 }[s.kind] * s.size * kh;
      f[s.kind].setMatrixAt(s.slot, mI.compose(vT, qJ, vS.setScalar(Math.max(1e-5, size))));
      if (s.kind === 'daisy') f.eye.setMatrixAt(s.slot, mI.compose(vT, qJ, vS.setScalar(Math.max(1e-5, size))));
    });
    for (const k of ['stem', 'leaf', 'tulip', 'daisy', 'eye', 'rose']) f[k].instanceMatrix.needsUpdate = true;
  }

  /* chapter 3: petals that lift out of the garden, swirl round the dancers and gather into a heart */
  const HEART = { x: 0, y: .43, z: -.03, w: .115 };
  function makePetals() {
    const geo = kit.keep(new THREE.PlaneGeometry(1, 1.3, 4, 4)), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), w = Math.pow(Math.sin(Math.PI * (y + .65) / 1.3), .7) * (1 - .25 * (y < 0 ? -y : 0));
      p.setXYZ(i, x * 2 * w * .5, y, .35 * (x * w) ** 2 * 4 + .12 * y * y);
    }
    geo.computeVertexNormals();
    const N = 100, mesh = new THREE.InstancedMesh(geo, mat('#ffffff', { side: THREE.DoubleSide, roughness: .7, emissive: 0xffffff, emissiveIntensity: .12 }), N);
    mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const tints = ['#ff4f7b', '#ff8fab', '#ffc2d1', '#ffffff', '#e8436d', '#ffd6e0'];
    const list = [];
    for (let i = 0; i < N; i++) {
      const outline = i < 60, t = outline ? i / 60 * TAU : (i - 60) / (i < 86 ? 26 : 14) * TAU, s = outline ? 1 : i < 86 ? .66 : .32;
      const hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      list.push({ tx: HEART.x + hx / 16 * HEART.w * s, ty: HEART.y + (hy + 2.5) / 16 * HEART.w * s, tz: HEART.z + (rand() - .5) * .01,
        a0: rand() * TAU, r0: .14 + rand() * .2, hi: rand(), d1: i / N * .45, d2: rand() * .25, spin: rand() * TAU, size: .017 + rand() * .005 });
      mesh.setColorAt(i, new THREE.Color(tints[(rand() * tints.length) | 0]));
    }
    mesh.instanceColor.needsUpdate = true;
    stage.add(mesh);
    return { mesh, list };
  }
  const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
  function posePetals(g, T) {
    const { mesh, list } = petals, breathe = 1 + .035 * Math.sin(T * 3.1);
    list.forEach((p, i) => {
      const pop = ease.out(seg(g, 13.1 + p.d1, 13.4 + p.d1));
      if (pop <= 0) { mesh.setMatrixAt(i, ZERO); return; }
      const k1 = ease.inOut(seg(g, 13.1 + p.d1, 15.5 + p.d1)), k2 = ease.inOut(seg(g, 15.55 + p.d2, 16.45 + p.d2));
      const a = p.a0 + 1.6 * Math.PI * k1 + 1.4 * Math.max(0, g - 15.5 - p.d1), r = lerp(p.r0, .2 + .05 * p.hi, k1);
      vA.set(Math.cos(a) * r, lerp(.012, .2 + .2 * p.hi, ease.out(k1)), Math.sin(a) * r * .8 + .01);
      vB.set(HEART.x + (p.tx - HEART.x) * breathe, HEART.y + (p.ty - HEART.y) * breathe, p.tz);
      vA.lerp(vB, k2);
      qA.setFromEuler(eI.set(g * 4 + p.spin, g * 3 + p.spin * 2, g * 2));
      qB.setFromEuler(eI.set(.15 * Math.sin(T * 2 + p.spin), .3 * Math.sin(T * 1.7 + p.spin), p.spin));
      qA.slerp(qB, k2);
      mesh.setMatrixAt(i, mI.compose(vA, qA, vS.setScalar(p.size * pop)));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  /* butterflies: little pictures that flap by squeezing (they always face the phone) */
  function butterfly(c1, c2, c3) {
    return kit.picture((c, px) => {
      c.save(); c.translate(px / 2, px / 2); c.scale(px / 256, px / 256);
      c.lineWidth = 7; c.strokeStyle = '#4a2340'; c.lineJoin = 'round';
      for (const s of [-1, 1]) {
        c.fillStyle = c1; c.beginPath(); c.moveTo(0, -6); c.bezierCurveTo(s * 40, -100, s * 122, -92, s * 114, -30); c.bezierCurveTo(s * 110, 6, s * 50, 8, 0, 4); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = c2; c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(s * 72, 10, s * 96, 66, s * 60, 90); c.bezierCurveTo(s * 30, 106, s * 8, 52, 0, 12); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = c3; c.beginPath(); c.arc(s * 72, -46, 15, 0, 7); c.fill(); c.beginPath(); c.arc(s * 46, 54, 10, 0, 7); c.fill();
      }
      c.fillStyle = '#4a2340'; c.beginPath(); c.ellipse(0, 8, 10, 52, 0, 0, 7); c.fill();
      c.lineWidth = 5; c.beginPath(); c.moveTo(-3, -40); c.quadraticCurveTo(-22, -84, -36, -96); c.moveTo(3, -40); c.quadraticCurveTo(22, -84, 36, -96); c.stroke();
      c.restore();
    }, { px: 128, size: .065 });
  }
  /* each butterfly leaves a flower and loops round its own spot, away from the words and the faces */
  const FLIGHTS = [
    { at: 8.5, home: [-.36, .2, -.04], c: ['#ff8fb1', '#ffc2d6', '#fff2a8'] }, { at: 8.75, home: [.38, .25, -.06], c: ['#7ec8ff', '#c4b5ff', '#ffffff'] },
    { at: 9, home: [-.26, .36, -.2], c: ['#ffd166', '#ff9f5a', '#ffffff'] }, { at: 9.2, home: [.3, .12, .14], c: ['#c4b5ff', '#ff8fb1', '#fff2a8'] },
    { at: 9.4, home: [-.42, .1, .16], c: ['#ffffff', '#ffc2d6', '#ff6f91'] }, { at: 9.65, home: [.24, .42, -.24], c: ['#9be7c4', '#7ec8ff', '#ffffff'] }
  ];

  /* the bouquet's way through the story: [from g, who holds it, which hand, the way its stems point and the way its bow
     faces (both in the holder's own space), seconds to blend in]. It goes where that hand goes and points where it says */
  const HOLD = [
    [0, 'boy', 'handslot.l', [0, .7, -.7], [-1, 0, 0], 0],             // behind his back, the roses peeking up
    [4.75, 'boy', 'handslot.l', [0, .9, .42], [-.6, 0, .8], .4],       // swung round to the front and held out to her
    [7, 'girl', 'handslot.r', [0, .85, .5], [.6, 0, .8], .25],         // hers now
    [7.7, 'girl', 'handslot.r', [-.15, .95, .2], [0, 0, 1], .3],       // up high as she cheers
    [9.05, 'girl', 'handslot.r', [.3, .85, .45], [0, 0, 1], .55],      // hugged, leaning off to one side so her face shows
    [9.75, 'girl', 'handslot.l', [.3, .85, .45], [0, 0, 1], .3],       // into her other hand, to keep the right one for his
    [12.55, 'girl', 'handslot.l', [.3, .9, -.3], [0, 0, 1], .45]       // held up high for the dance
  ];
  const mHand = new THREE.Matrix4(), mBasis = new THREE.Matrix4(), vU = new THREE.Vector3(), vF = new THREE.Vector3(), vR = new THREE.Vector3();
  /** where a hold puts the bouquet, in stage space */
  function holdAt(h, outP, outQ) {
    const m = h[1] === 'boy' ? boy : girl, b = m.node(h[2]); b.updateWorldMatrix(true, false);
    outP.setFromMatrixPosition(b.matrixWorld).applyMatrix4(mStage);
    vU.fromArray(h[3]).normalize(); vF.fromArray(h[4]); vR.crossVectors(vU, vF).normalize(); vF.crossVectors(vR, vU);
    outQ.setFromRotationMatrix(mBasis.makeBasis(vR, vU, vF)).premultiply(m.root.quaternion);
  }
  const hP0 = new THREE.Vector3(), hP1 = new THREE.Vector3(), hQ0 = new THREE.Quaternion(), hQ1 = new THREE.Quaternion();
  const bookFrom = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }, qSpin = new THREE.Quaternion(), vAxis = new THREE.Vector3(.6, .3, .74).normalize();

  return {
    seconds: [6.4, 6, 6.4],

    build() {
      /* the two of them: he keeps his bear hat and cape, she her witch hat (smaller, pushed back so her face shows) */
      boy = kit.model('boy').fit({ height: .29 }); girl = kit.model('girl').fit({ height: .33 });
      stage.add(boy.root, girl.root);
      hat = girl.node('Mage_Hat');
      if (hat) { hat.scale.multiplyScalar(.74); hat.position.y += .1; hat.position.z -= .05; }
      book = girl.node('Spellbook_open');
      if (book) bookHome = { parent: book.parent, p: book.position.clone(), q: book.quaternion.clone(), s: book.scale.clone() };

      const roseG = roseGeometry();
      bouquet = makeBouquet(roseG); bouquet.scale.setScalar(1.35); stage.add(bouquet);   // big enough to read from a phone's length
      field = makeField(roseG);
      petals = makePetals();
      flies = FLIGHTS.map(f => { const s = butterfly(...f.c); stage.add(s); return s; });
      flyFrom = FLIGHTS.map(f => field.spots.filter(s => s.at < f.at - .15)          // each leaves a flower already open, near its spot
        .sort((a, b) => Math.hypot(a.x - f.home[0], a.z - f.home[2]) - Math.hypot(b.x - f.home[0], b.z - f.home[2]))[0]);

      /* the card's words and photo */
      note = kit.sign({ text: words('note1', 'Tặng em một bó hoa, thay cho ngàn lời muốn nói'), style: 'tag', width: .4, accent: '#ff7aa2', glow: .5 });
      banner = kit.sign({ text: words('note2', 'Em là bông hoa đẹp nhất!'), style: 'banner', width: .6, accent: '#e8436d', glow: .45 });
      photo = kit.polaroid({ width: .26, caption: words('caption', 'Nụ cười em là đẹp nhất'), glow: .55, halo: true, haloColor: 0xffd6e2 });
      const ph = photo.height, pw = photo.width;                       // roses on two corners of the photo
      [[-pw / 2 + .012, ph - .01, '#e01e4a', .011], [-pw / 2 + .03, ph + .002, '#ff6f91', .009], [-pw / 2 - .004, ph - .03, '#ffb3c6', .008],
        [pw / 2 - .014, .012, '#ff4f7b', .01], [pw / 2 + .004, .03, '#ffc2d1', .008]].forEach(([x, y, c, s]) => {
        const r = new THREE.Mesh(roseG, mat(c, { side: THREE.DoubleSide, emissive: c, emissiveIntensity: .15 })); r.position.set(x, y, .01); r.rotation.x = 1.25; r.scale.setScalar(s); photo.root.add(r);
      });
      halo = photo.halo;                                                // flat, just behind the photo: a sprite would cut through it
      bang = kit.picture((c, px) => {                                 // a cartoon "!" in a yellow burst, for her start
        c.fillStyle = '#ffe066'; c.strokeStyle = '#4a2340'; c.lineWidth = px * .045; c.lineJoin = 'round'; c.beginPath();
        for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, r = px * (i % 2 ? .3 : .46) * (1 - .08 * (i % 3)); c.lineTo(px / 2 + Math.cos(a) * r, px / 2 + Math.sin(a) * r); }
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#e8436d'; c.beginPath(); c.moveTo(px * .44, px * .24); c.lineTo(px * .56, px * .24); c.lineTo(px * .53, px * .58); c.lineTo(px * .47, px * .58); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.arc(px * .5, px * .7, px * .06, 0, TAU); c.fill(); c.stroke();
      }, { size: .09 });
      stage.add(bang);
      stage.add(note.root, banner.root, photo.root);

      /* particles */
      hearts = kit.particles({ max: 160 });
      sparks = kit.particles({ max: 320, additive: true });
      drift = kit.particles({ max: 120 });
      stage.add(hearts.root, sparks.root, drift.root);
    },

    reset() {
      [hearts, sparks, drift].forEach(p => p.clear());
      boy.stop(); girl.stop();
      if (book && bookHome) { bookHome.parent.add(book); book.position.copy(bookHome.p); book.quaternion.copy(bookHome.q); book.scale.copy(bookHome.s); book.visible = true; }
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();

      /* light: a sunny garden that turns rosy for the dance */
      const rosy = ease.smooth(seg(g, 13, 16));
      kit.lights.hemi.color.copy(DAY.hemi).lerp(ROSY.hemi, rosy); kit.lights.hemi.groundColor.copy(DAY.ground).lerp(ROSY.ground, rosy);
      kit.lights.sun.color.copy(DAY.sun).lerp(ROSY.sun, rosy);

      /* chapters 1–2: he tiptoes in (a little bob on every step), stops behind her, starts when she jumps */
      const walking = 1 - ease.smooth(seg(g, 3.15, 3.4));
      let bx = tween(g, [[0, -.47], [.35, -.455, 'in'], [3.05, TAP - .025, 'linear'], [3.4, TAP, 'out']]) - (TAP - HE.x) * ease.out(seg(g, 4.32, 4.62));
      let bz = HE.z, gx = lerp(SHE.x, TAKE.x, ease.inOut(seg(g, 6.45, 6.95))), gz = SHE.z;
      let bRot = lerp(lerp(Math.PI / 2, 1.42, ease.inOut(seg(g, 4.7, 5.2))), 1.05, ease.inOut(seg(g, 10, 10.6)));
      let gRot = lerp(lerp(.55, -1.42, ease.out(seg(g, 4.32, 4.72))), -1.05, ease.inOut(seg(g, 10, 10.6)));
      let by = .0045 * Math.abs(Math.sin(Math.PI * 2 * g * 1.65 / 1.07)) * walking + .02 * Math.sin(Math.PI * seg(g, 4.32, 4.62)) + .03 * Math.sin(Math.PI * seg(g, 8.45, 8.8));
      let gy = .045 * Math.sin(Math.PI * seg(g, 4.32, 4.7)) + .04 * Math.sin(Math.PI * seg(g, 7.8, 8.15)), stepB = 1, stepG = 1;

      /* chapter 3: they square up, twirl one full turn round the middle, then turn to the front hand in hand */
      if (g > 12.4) {
        const face = ease.inOut(seg(g, 12.5, 13)), R = lerp(Math.hypot(TAKE.x - HE.x, TAKE.z - HE.z) / 2, DANCE, face), phi0 = Math.atan2(-(TAKE.z - HE.z), TAKE.x - HE.x);
        const spin = ease.smooth(seg(g, 13, 15.7)), phi = phi0 + TAU * spin, ux = Math.cos(phi), uz = -Math.sin(phi);
        const cx = lerp((HE.x + TAKE.x) / 2, 0, spin), cz = lerp((HE.z + TAKE.z) / 2, END.z, spin);
        const front = ease.inOut(seg(g, 15.7, 16.3));
        bx = lerp(cx - R * ux, -END.x, front); bz = lerp(cz - R * uz, END.z, front);
        gx = lerp(cx + R * ux, END.x, front); gz = lerp(cz + R * uz, END.z, front);
        bRot = lerp(lerp(1.05, Math.atan2(ux, uz), face), .3, front);
        gRot = lerp(lerp(-1.05, Math.atan2(-ux, -uz), face), -.3, front);
        const hop = .035 * Math.sin(Math.PI * seg(g, 16.25, 16.6));
        by = hop; gy = hop;
        const v = R * TAU * 6 * spin * (1 - spin) / 2.7;               // how fast they go round: the side-steps keep up
        stepB = Math.max(.25, v / .47); stepG = Math.max(.25, v / .43);
      }
      boy.root.position.set(bx, by, bz); boy.root.rotation.y = bRot;
      girl.root.position.set(gx, gy, gz); girl.root.rotation.y = gRot;
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g), strafe = 'Running_Strafe_Right';
      boy.play(bc[1], bc[1] === strafe ? { ...bc[2], speed: stepB } : bc[2]); girl.play(gc[1], gc[1] === strafe ? { ...gc[2], speed: stepG } : gc[2]);

      /* bodies: the sneak's crouch, the lean to tap, a start, the bow; her reading, a sniff, swaying; leaning back to spin */
      const spinning = bump(g, 12.95, 13.3, 15.4, 15.8);
      boy.bend('chest', .22 * walking + .16 * bump(g, 3.7, 3.85, 4.25, 4.4) - .2 * Math.sin(Math.PI * seg(g, 4.3, 4.75)) +
        .2 * bump(g, 4.75, 5.2, 7.1, 7.6) - .08 * spinning, 0, 0);
      boy.bend('head', .08 * bump(g, 3.4, 3.6, 4.3, 4.4), -.6 * bump(g, 1.2, 1.45, 2, 2.3), -.12 * bump(g, 7.5, 7.8, 8.2, 8.4) - .05 * ease.smooth(seg(g, 16.3, 16.8)));
      girl.bend('spine', -.14 * spinning, 0, .08 * Math.sin(T * 2.2) * bump(g, 9.4, 9.8, 12.5, 12.9));
      boy.bend('spine', .05 * Math.sin(T * 2.6) * bump(g, 10.2, 10.6, 12.5, 12.8), 0, .03 * Math.sin(T * 1.4) * bump(g, 5.4, 5.8, 6.5, 6.8));   // rocking on his heels
      girl.bend('head', .15 * (1 - ease.smooth(seg(g, 4.3, 4.42))) + .03 * Math.sin(g * 1.4) * (1 - seg(g, 4, 4.3)) + .2 * bump(g, 7.25, 7.4, 7.6, 7.75),
        0, .18 * Math.sin(T * 2) * bump(g, 4.9, 5.3, 6.6, 6.9));
      if (spinning) { boy.bend('spine', -.14 * spinning, 0, 0); girl.bend('chest', -.08 * spinning, 0, 0); boy.bend('head', -.22 * spinning, 0, 0); girl.bend('head', -.2 * spinning, 0, 0); }
      if (hat) hat.rotation.x = -.3 - .35 * spinning;                     // pushed back by the spin, its brim clears him

      /* arms, by the tables; reaching arms go for MEET: her shoulder for the tap, then the point where their hands join */
      if (g < 6) { girl.node('upperarm.r').updateWorldMatrix(true, false); MEET.setFromMatrixPosition(girl.node('upperarm.r').matrixWorld).applyMatrix4(mStage); }
      else {
        boy.node('upperarm.l').updateWorldMatrix(true, false); girl.node('upperarm.r').updateWorldMatrix(true, false);
        MEET.setFromMatrixPosition(boy.node('upperarm.l').matrixWorld).add(vTo.setFromMatrixPosition(girl.node('upperarm.r').matrixWorld)).multiplyScalar(.5).applyMatrix4(mStage);
        MEET.y -= lerp(.035, .065, ease.inOut(seg(g, 15.75, 16.25)));
      }
      arms(boy, ARMS.boy, g, T); arms(girl, ARMS.girl, g, T);

      /* the bouquet, by its table: from one hold to the next it moves over and turns on the way */
      let h = 0; while (h + 1 < HOLD.length && g >= HOLD[h + 1][0]) h++;
      holdAt(HOLD[h], hP1, hQ1);
      const hk = HOLD[h][5] ? ease.inOut(clamp((g - HOLD[h][0]) / HOLD[h][5])) : 1;
      if (hk < 1 && h > 0) { holdAt(HOLD[h - 1], hP0, hQ0); hP1.lerpVectors(hP0, hP1, hk); hQ1.slerpQuaternions(hQ0, hQ1, hk); }
      bouquet.position.copy(hP1); bouquet.quaternion.copy(hQ1);
      if (g > 5 && g < 5.4 && kit.once('ta-da')) sparks.burst(18, () => ({ x: hP1.x, y: hP1.y + .05, z: hP1.z, vx: (rng() - .5) * .4, vy: .1 + rng() * .3, vz: (rng() - .5) * .3,
        drag: 2, color: ['#fff1b8', '#ffc2d6', '#ffffff'][(rng() * 3) | 0], size: .018 + rng() * .012, life: .8, shape: rng() < .5 ? 'sparkle' : 'glow' }));

      /* the book: in her hands until she jumps, then up and away in a puff */
      if (book) {
        if (g >= 4.33 && kit.once('book')) {
          book.updateWorldMatrix(true, false); mHand.multiplyMatrices(mStage, book.matrixWorld).decompose(bookFrom.p, bookFrom.q, bookFrom.s);
          stage.add(book);
        }
        if (book.parent === stage) {
          const t = g - 4.33, gone = ease.in(seg(g, 4.66, 4.76));
          book.position.set(bookFrom.p.x + .22 * t, bookFrom.p.y + .95 * t - 1.7 * t * t, bookFrom.p.z + .1 * t);
          book.quaternion.copy(bookFrom.q).premultiply(qSpin.setFromAxisAngle(vAxis, 11 * t));
          book.scale.copy(bookFrom.s).multiplyScalar(Math.max(.001, 1 - gone));
          book.visible = g < 4.76;
          if (g > 4.72 && g < 5 && kit.once('poof')) {
            sparks.burst(26, () => ({ x: book.position.x, y: book.position.y, z: book.position.z, vx: (rng() - .5) * .5, vy: (rng() - .3) * .4, vz: (rng() - .5) * .3,
              drag: 2.4, color: ['#d9c8ff', '#fff1b8', '#ffffff', '#ffc2d6'][(rng() * 4) | 0], size: .02 + rng() * .02, life: .9, shape: rng() < .6 ? 'sparkle' : 'glow' }));
            hearts.burst(6, () => ({ x: book.position.x, y: book.position.y, z: book.position.z, vx: (rng() - .5) * .2, vy: .1 + rng() * .15, gravity: -.1, drag: .8,
              color: '#c4a7ff', size: .016 + rng() * .01, life: 1.4, shape: 'heart', spin: (rng() - .5) * 3 }));
          }
        }
      }

      /* chapter 1: a "!" over her as she jumps; little hearts over her, then the gift tag with the first words */
      const startle = ease.back(seg(g, 4.33, 4.5)) * (1 - ease.in(seg(g, 4.9, 5.05)));
      bang.scale.setScalar(Math.max(.001, .09 * startle)); bang.position.set(gx - .02, .39 + gy, gz + .02); bang.material.rotation = -.2 + .1 * Math.sin(g * 30) * startle;
      if (held && dt && g < 6.5 && rng() < dt * .9) hearts.emit({ x: gx + (rng() - .5) * .04, y: .34, z: gz, vy: .05, sway: .02, color: '#ff8fab', size: .018, life: 2, shape: 'heart' });
      if (g > 5.35 && g < 5.8 && kit.once('glad')) hearts.burst(10, () => ({ x: gx + (rng() - .5) * .05, y: .3, z: gz, vx: (rng() - .5) * .14, vy: .12 + rng() * .1, gravity: -.08, drag: .6,
        color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .022 + rng() * .014, life: 2, shape: 'heart', spin: (rng() - .5) * 3 }));
      const n = ease.back(seg(g, 5.3, 6)) * (1 - ease.in(seg(g, 6.4, 6.75)));
      note.root.scale.setScalar(Math.max(.001, n));
      note.root.position.set(.065, .5 + .1 * seg(g, 6.4, 6.75) + .008 * Math.sin(T * 1.6), .03);
      note.root.rotation.set(-.12, 0, .03 * Math.sin(T * .9));

      /* chapter 2: a ring of light runs out from her feet and the garden blooms behind it; butterflies; drifting petals */
      poseField(g, T);
      if (dt) field.spots.forEach((s, i) => {
        if (g > s.at + .16 && g < s.at + .3 && kit.once(`pop${i}`)) sparks.burst(2, () => ({ x: s.x, y: s.h + .01, z: s.z, vx: (rng() - .5) * .1, vy: .08,
          color: '#fff6c8', size: .016, life: .5, shape: 'sparkle', spin: 3 }));
      });
      if (dt && g > 7.85 && g < 8.9) for (let i = 0; i < 4; i++) {
        const a = rng() * TAU, r = (g - 7.85) / 1.6, x = TAKE.x + Math.cos(a) * r, z = TAKE.z + Math.sin(a) * r;
        if (Math.abs(x) < .5 && Math.abs(z) < .31) sparks.emit({ x, y: .004, z, vy: .02, color: rng() < .5 ? '#fff1b0' : '#ffc2d6', size: .022, life: .45, shape: 'glow' });
      }
      flies.forEach((s, i) => {
        const f = FLIGHTS[i], k = ease.out(seg(g, f.at, f.at + 1.3)), src = flyFrom[i], ph = i * 1.7;
        const hx = f.home[0] + .06 * Math.sin(T * .9 + ph), hy = f.home[1] + .03 * Math.sin(T * 1.7 + ph * 2), hz = f.home[2] + .04 * Math.cos(T * .7 + ph);
        s.position.set(lerp(src.x, hx, k), lerp(src.h, hy, k) + .015 * Math.sin(T * 5 + ph) * k, lerp(src.z, hz, k));
        const size = .065 * ease.back(seg(g, f.at, f.at + .4));
        s.scale.set(Math.max(.001, size * (.2 + .8 * Math.abs(Math.cos(T * 11 + ph)))), Math.max(.001, size), 1);
        s.material.rotation = .25 * Math.sin(T * 1.3 + ph);
      });
      if (dt && g > 8.2 && rng() < dt * 3.5) {
        const back = rng() < .7, x = back ? (rng() - .5) * 1 : (rng() < .5 ? -1 : 1) * (.32 + rng() * .16);
        drift.emit({ x, y: .55 + rng() * .2, z: back ? -.3 + rng() * .2 : (rng() - .5) * .5, vx: (rng() - .5) * .02, vy: -.06, sway: .05, floor: .004,
          color: ['#ff8fab', '#ffc2d1', '#ffffff', '#ff4f7b'][(rng() * 4) | 0], size: .02 + rng() * .01, life: 6, shape: 'petal', spin: (rng() - .5) * 2 });
      }

      /* chapter 2: the photo comes up out of the flowers in a glow (and moves aside for the dance) */
      const p = ease.back(seg(g, 9.9, 10.9)), aside = ease.inOut(seg(g, 12.4, 13.1));
      photo.root.scale.setScalar(Math.max(.001, p * lerp(1, .5, aside)));
      photo.root.position.set(lerp(PHOTO.x, -.37, aside), lerp(0, .3, ease.out(seg(g, 9.9, 10.7))) - .18 * aside + .006 * Math.sin(T * 1.3), lerp(PHOTO.z, -.22, aside));
      photo.root.rotation.set(-.06, lerp(0, .35, aside) + .06 * Math.sin(T * .8), .04 * Math.sin(T * .6));
      halo.material.opacity = .5 * p * (1 - .7 * aside) * (1 + .08 * Math.sin(T * 3));
      if (g > 9.95 && g < 10.4 && kit.once('photo')) drift.burst(24, () => ({ x: PHOTO.x + (rng() - .5) * .1, y: .02, z: PHOTO.z, vx: (rng() - .5) * .3, vy: .25 + rng() * .25, vz: (rng() - .3) * .15,
        gravity: -.35, drag: .8, color: ['#ff8fab', '#ffc2d1', '#ffffff', '#ff4f7b', '#ffd166'][(rng() * 5) | 0], size: .02 + rng() * .012, life: 2.4, shape: 'petal', spin: (rng() - .5) * 5 }));

      /* chapter 3: the petal heart, a burst of hearts, the banner with the last words */
      posePetals(g, T);
      if (g > 16.45 && g < 17 && kit.once('heart')) hearts.burst(24, () => ({ x: HEART.x, y: HEART.y, z: HEART.z + .02, vx: (rng() - .5) * .5, vy: (rng() - .3) * .4, vz: (rng() - .5) * .2,
        gravity: -.15, drag: 1, color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .02 + rng() * .02, life: 2.2, shape: 'heart', spin: (rng() - .5) * 4 }));
      const b = ease.elastic(seg(g, 16.5, 17.5));
      banner.root.scale.setScalar(Math.max(.001, b));
      banner.root.position.set(0, .655 + .006 * Math.sin(T * 1.5), .05);
      banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      if (held && dt && g > 18 && rng() < dt * 1.5) hearts.emit({ x: HEART.x + (rng() - .5) * .16, y: HEART.y - .05, z: HEART.z, vy: .06, sway: .03,
        color: '#ff8fab', size: .016, life: 2.2, shape: 'heart' });

      [hearts, sparks, drift].forEach(x => x.update(dt, T));
    }
  };
};
