/* Trăng và sao băng (the moon and shooting stars), told by the shared act _acts/lovestory.js. Three chapters, each ending at a stop:
     1 · 0–6.8 s     magic hour: the sky unfolds behind the card and a grassy hill swells up out of it; she leads him up
                     the hill by the hand while a huge moon rises behind the far hills; at the top she points at it, they
                     lie down side by side in the grass to watch, the first stars come out and a note with the card's
                     first words (note1) comes up
     2 · 6.8–13 s    a great comet crosses the sky; they sit up to watch it; its tail parts into a cyan strand and a pink
                     one that curl round into a heart, and the card's photo lights up inside it with its caption
     3 · 13–19 s     the heart drifts aside and a meteor shower falls, some meteors bursting into tiny hearts; they scoot
                     close, hold hands and make a wish; a last bright meteor flashes and a banner with the last words
                     (note2) rises
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2;
  const rand = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(1508);   // the hill's own seed: the same grass every time
  const H = .3;                                                     // the sweethearts' height, in card widths
  const SPOT = { boy: -.074, girl: .074, z: .09 };                  // where their feet are when they lie down side by side
  const HILL = { x: 0, z: -.17, top: .085, rx: .47, front: .44, back: .32 };   // a soft mound, highest behind their heads
  const TREE = { x: -.35, z: -.19 }, LANTERN = { x: .29, z: -.07 };
  const MOON = { x: .3, y: .45 };                                   // where the moon rises to (it starts behind the far hills)
  const HEART = { x: 0, y: .44, z: -.13, s: .0165 };                // the comet's heart: its origin and the size of one heart unit
  const ASIDE = { x: -.35, y: .31, z: -.02, k: .5 };                // where the heart and photo drift in the last chapter: low on the left
  const SKY = { width: 1.1, height: .75, curve: .18, z: -.3 };      // the painted sky at the back edge
  const DUSK = { hemi: new THREE.Color('#d9c2ff'), ground: new THREE.Color('#4a3a66'), sun: new THREE.Color('#ffc9a3') };
  const NIGHT = { hemi: new THREE.Color('#9fb0ff'), ground: new THREE.Color('#2c2a52'), sun: new THREE.Color('#c9d6ff') };
  let boy, girl, hill, grass, blooms, tree, lantern, sky, veil, ridge, moon, rim;
  let comet, cometHead, strands, heart, note, banner, photo, flash, last, stars, sparks, hearts, meteors, motes;
  const pops = [];                                                  // meteors that burst into hearts: [g, x, y, z]
  const zPage = x => SKY.z + SKY.curve * (x / (SKY.width / 2)) ** 2;   // how far forward the sky's page has curved at x
  const MOON_AT = new THREE.Vector3(), vH = new THREE.Vector3();
  const BANG = new THREE.Vector3(0, .63, -.04);                     // where the last meteor bursts, just behind the banner

  /* points of the models on the stage; reaches: an arm aimed at a point (the moon) from its shoulder, in the character's own space */
  const mStage = new THREE.Matrix4(), SHOULDER = new THREE.Vector3(), vTo = new THREE.Vector3(), qInv = new THREE.Quaternion();
  const onStage = (o, out) => out.setFromMatrixPosition(o.matrixWorld).applyMatrix4(mStage);
  const toward = (m, side, target) => {
    const b = m.node(`upperarm.${side}`); b.updateWorldMatrix(true, false);
    SHOULDER.setFromMatrixPosition(b.matrixWorld).applyMatrix4(mStage);
    vTo.copy(target).sub(SHOULDER).applyQuaternion(qInv.copy(m.root.quaternion).invert());
    return [vTo.x, vTo.y, vTo.z];
  };

  /* the hill: how high it is at (x, z); 0 off its edge. Its rim wobbles so it looks like a real mound, not a dish */
  const rimAt = a => 1 + .07 * Math.sin(3 * a + 1.3) + .05 * Math.sin(5 * a + .4) + .03 * Math.sin(8 * a + 2.2);
  function hillAt(x, z) {
    const dx = (x - HILL.x) / HILL.rx, dz = (z - HILL.z) / (z > HILL.z ? HILL.front : HILL.back);
    const r = Math.hypot(dx, dz) / rimAt(Math.atan2(dz, dx));
    return r >= 1 ? 0 : HILL.top * (1 - r * r) * (1 - r * r);
  }
  const slopeAt = (x, z) => Math.atan2(hillAt(x, z - .1) - hillAt(x, z + .1), .2);   // how far the ground tips up towards the back

  /* the pose a character holds at story time g: which clip, where, which way it looks */
  const BOY = [                                                      // [from g, clip, options]
    [0, 'Idle'], [.1, 'Walking_A'], [2.95, 'Idle', { fade: .25 }], [4.15, 'Lie_Down', { once: true, speed: 1.55, fade: .25 }],
    [6.05, 'Lie_Idle', { fade: .4 }], [8, 'Sit_Floor_Idle', { fade: .8 }]
  ];
  const GIRL = [
    [0, 'Idle'], [.15, 'Walking_A'], [2.85, 'Idle', { fade: .25 }], [3.95, 'Lie_Down', { once: true, speed: 1.55, fade: .25 }],
    [5.85, 'Lie_Idle', { fade: .4 }], [7.75, 'Sit_Floor_Idle', { fade: .8 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  /** a walk from a to b between g0 and g1 at an even pace, easing in and out over its first and last .35 s: [where it is,
      Walking_A's speed for that pace (.1 card widths a second at speed 1), so the feet do not slide] */
  function stride(g, g0, g1, a, b) {
    const r = .35, v = (b - a) / (g1 - g0 - 2 * r + 2 * r / 3), e = v * r / 3;   // an eased end covers a third of what the pace would
    const x = tween(g, [[g0, a], [g0 + r, a + e, 'in'], [g1 - r, b - e, 'linear'], [g1, b, 'out']]);
    const ramp = Math.min(1, seg(g, g0, g0 + r), 1 - seg(g, g1 - r, g1)) ** 2;
    return [x, Math.max(.3, Math.abs(v) * ramp / .1)];
  }

  /* ── the cast's colours: a night-blue cape for him, a rose dress for her (each a swatch of the model's palette) ── */
  function recolor(m, fills) {
    let mat = null; m.scene.traverse(o => { if (!mat && o.isMesh && o.material && o.material.map) mat = o.material; });
    const img = mat && mat.map && mat.map.image; if (!img || !img.width) return;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d'), w = img.width / 8, h = img.height / 4;
    c.drawImage(img, 0, 0);
    for (const [col, row, cols, stops] of fills) {                  // a new top-to-bottom shading in the swatch's place
      const gr = c.createLinearGradient(0, row * h, 0, (row + 1) * h);
      stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s));
      c.fillStyle = gr; c.fillRect(col * w, row * h, cols * w, h);
    }
    const old = mat.map, t = kit.keep(new THREE.CanvasTexture(cv));
    t.colorSpace = old.colorSpace; t.flipY = old.flipY; t.wrapS = old.wrapS; t.wrapT = old.wrapT; t.magFilter = old.magFilter; t.minFilter = old.minFilter;
    mat.map = t; mat.needsUpdate = true; old.dispose();             // one material for all of a model's parts
  }

  /* ── the hill: a mound of grass with a soil rim, tufts that sway, a few wildflowers ── */
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .9, ...o }));
  function makeHill() {
    const R = 26, S = 72, pos = [], col = [], idx = [], c = new THREE.Color();
    for (let i = 0; i <= R; i++) for (let j = 0; j < S; j++) {
      const a = j / S * TAU, k = i / R, rr = k * rimAt(a);
      let x = HILL.x + Math.cos(a) * rr * HILL.rx, z = HILL.z + Math.sin(a) * rr * (Math.sin(a) > 0 ? HILL.front : HILL.back);
      const cut = z < -.296;                                       // its back is cut by the sky: a wall of soil down to the card
      z = Math.max(z, -.296);
      const y = cut ? 0 : hillAt(x, z) + (i === R ? 0 : .0015);
      pos.push(x, y, z);
      const n = .5 + .5 * Math.sin(x * 23 + z * 17) * Math.sin(x * 9 - z * 31);   // patches of lighter and darker grass
      c.set(k > .94 || cut ? '#6b5136' : '#5f9a52').lerp(new THREE.Color('#9cc768'), (1 - k) * .55 * n).lerp(new THREE.Color('#3e6e3f'), k * k * .5);
      col.push(c.r, c.g, c.b);
    }
    for (let i = 0; i < R; i++) for (let j = 0; j < S; j++) {
      const a = i * S + j, b = i * S + (j + 1) % S, d = (i + 1) * S + j, e = (i + 1) * S + (j + 1) % S;
      idx.push(a, b, d, b, e, d);
    }
    const geo = kit.keep(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true, roughness: 1 }));
    m.receiveShadow = true; m.castShadow = false;
    return m;
  }
  /** a tuft of five blades, dark at the root and light at the tips; its origin at the root */
  function tuftGeometry() {
    const pos = [], col = [], dark = new THREE.Color('#2f5a34'), light = new THREE.Color('#b6d77a'), c = new THREE.Color();
    for (let b = 0; b < 5; b++) {
      const a = b / 5 * TAU + rand() * .8, lean = .25 + rand() * .35, h = .65 + rand() * .45, w = .09;
      const ox = Math.cos(a) * .05, oz = Math.sin(a) * .05, tx = Math.cos(a) * lean, tz = Math.sin(a) * lean;
      const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
      const v = [[ox - px, 0, oz - pz, 0], [ox + px, 0, oz + pz, 0], [ox + tx * .45 - px * .6, h * .55, oz + tz * .45 - pz * .6, .55],
        [ox + tx * .45 + px * .6, h * .55, oz + tz * .45 + pz * .6, .55], [ox + tx, h, oz + tz, 1]];
      for (const t of [[0, 1, 2], [1, 3, 2], [2, 3, 4]]) for (const i of t) {
        pos.push(v[i][0], v[i][1], v[i][2]); c.copy(dark).lerp(light, v[i][3]); col.push(c.r, c.g, c.b);
      }
    }
    const geo = kit.keep(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  }
  const BED = (x, z) => Math.abs(x) < .15 && z > -.25 && z < .14;   // where the two of them lie: short grass only
  function makeGrass() {
    const spots = [];
    for (let n = 0; spots.length < 420 && n < 20000; n++) {
      const x = (rand() - .5) * 1, z = -.3 + rand() * .6, h = hillAt(x, z);
      if (h < .004 || spots.some(s => Math.abs(s.x - x) < .018 && Math.abs(s.z - z) < .018)) continue;
      const bed = BED(x, z);
      spots.push({ x, z, y: h - .002, s: (bed ? .012 : .022 + rand() * .016) * (z > .15 ? .8 : 1), turn: rand() * TAU, ph: rand() * TAU,
        at: .25 + Math.hypot(x - HILL.x, z - HILL.z) * 1.4 + rand() * .15, tint: new THREE.Color().setHSL(.24 + rand() * .06, .45 + rand() * .2, .42 + rand() * .2) });
    }
    const m = new THREE.InstancedMesh(tuftGeometry(), mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide, roughness: .8 }), spots.length);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true;
    spots.forEach((s, i) => m.setColorAt(i, s.tint)); m.instanceColor.needsUpdate = true;
    return { mesh: m, spots };
  }
  /** wildflowers: a stem and a little daisy head with a golden eye, instanced */
  function makeBlooms() {
    const spots = [], tints = ['#ffffff', '#fff3a6', '#ffc2d6', '#b9b2ff', '#ffffff', '#ffd27a'];
    for (let n = 0; spots.length < 34 && n < 9000; n++) {
      const x = (rand() - .5) * .92, z = -.28 + rand() * .55, h = hillAt(x, z);
      if (h < .01 || BED(x, z) || Math.hypot(x - LANTERN.x, z - LANTERN.z) < .06 || Math.hypot(x - TREE.x, z - TREE.z) < .07) continue;
      if (spots.some(s => Math.hypot(s.x - x, s.z - z) < .05)) continue;
      spots.push({ x, z, y: h - .002, h: .022 + rand() * .02, color: new THREE.Color(tints[spots.length % tints.length]), ph: rand() * TAU, turn: rand() * TAU,
        at: .5 + Math.hypot(x - HILL.x, z - HILL.z) * 1.4 + rand() * .2 });
    }
    const daisy = new THREE.Shape(), P = 8;
    for (let i = 0; i <= P; i++) {
      const a = i / P * TAU, b = (i + .5) / P * TAU;
      if (!i) daisy.moveTo(Math.cos(a) * .3, Math.sin(a) * .3);
      daisy.quadraticCurveTo(Math.cos(a + .1) * 1.2, Math.sin(a + .1) * 1.2, Math.cos(b) * .3, Math.sin(b) * .3);
    }
    const stem = new THREE.InstancedMesh(kit.keep(new THREE.CylinderGeometry(.0012, .0016, 1, 4).translate(0, .5, 0)), mat('#4f8a4a'), spots.length);
    const head = new THREE.InstancedMesh(kit.keep(new THREE.ShapeGeometry(daisy).rotateX(-Math.PI / 2)), mat('#ffffff', { side: THREE.DoubleSide, roughness: .6,
      emissive: '#ffffff', emissiveIntensity: .08 }), spots.length);
    const eye = new THREE.InstancedMesh(kit.keep(new THREE.SphereGeometry(.35, 8, 6).scale(1, .6, 1)), mat('#ffc83d'), spots.length);
    for (const m of [stem, head, eye]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; }
    spots.forEach((s, i) => head.setColorAt(i, s.color)); head.instanceColor.needsUpdate = true;
    return { spots, stem, head, eye };
  }
  const mI = new THREE.Matrix4(), qI = new THREE.Quaternion(), qJ = new THREE.Quaternion(), eI = new THREE.Euler(), vI = new THREE.Vector3(), vS = new THREE.Vector3(), vT = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  /** the wind: a slow sway with a gust running across the hill from the left */
  const windAt = (x, z, T, ph) => .16 * Math.sin(T * 1.7 + ph + x * 4) + .22 * Math.max(0, Math.sin(T * .55 - x * 2.2 - z)) ** 3;
  function poseGrass(g, T) {
    const { mesh, spots } = grass;
    spots.forEach((s, i) => {
      const k = ease.back(seg(g, s.at, s.at + .45));
      if (k <= 0) { mesh.setMatrixAt(i, ZERO); return; }
      const w = windAt(s.x, s.z, T, s.ph);
      qI.setFromEuler(eI.set(.3 * w, s.turn, -w, 'YXZ'));
      mesh.setMatrixAt(i, mI.compose(vI.set(s.x, s.y, s.z), qI, vS.set(s.s * k, s.s * k * (.9 + .25 * Math.sin(s.ph)), s.s * k)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    const f = blooms;
    f.spots.forEach((s, i) => {
      const k = ease.back(seg(g, s.at, s.at + .4)), open = ease.elastic(seg(g, s.at + .2, s.at + .9));
      if (k <= 0) { f.stem.setMatrixAt(i, ZERO); f.head.setMatrixAt(i, ZERO); f.eye.setMatrixAt(i, ZERO); return; }
      const w = windAt(s.x, s.z, T, s.ph) * .7;
      qI.setFromEuler(eI.set(.25 * w, 0, -w));
      vI.set(s.x, s.y, s.z);
      f.stem.setMatrixAt(i, mI.compose(vI, qI, vS.set(1, s.h * k, 1)));
      vT.set(0, s.h * k, 0).applyQuaternion(qI).add(vI);
      qJ.copy(qI).multiply(new THREE.Quaternion().setFromEuler(eI.set(.5, s.turn, 0)));   // faces tipped up to the phone
      const z = Math.max(1e-5, .0085 * open);
      f.head.setMatrixAt(i, mI.compose(vT, qJ, vS.setScalar(z))); f.eye.setMatrixAt(i, mI.compose(vT, qJ, vS.setScalar(z)));
    });
    for (const m of [f.stem, f.head, f.eye]) m.instanceMatrix.needsUpdate = true;
  }

  /* ── a lone tree at the back of the hill: a bent trunk and a crown of soft blobs ── */
  function makeTree() {
    const t = new THREE.Group(), bark = mat('#5a3f33', { roughness: .95 });
    const trunkG = kit.keep(new THREE.CylinderGeometry(.011, .021, .27, 9, 8)), p = trunkG.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = (p.getY(i) + .135) / .27; p.setX(i, p.getX(i) + .045 * k * k); }   // it leans out over the hill
    trunkG.translate(0, .135, 0); trunkG.computeVertexNormals();
    const trunk = new THREE.Mesh(trunkG, bark); trunk.castShadow = true; t.add(trunk);
    const branchG = kit.keep(new THREE.CylinderGeometry(.005, .009, .12, 7).translate(0, .06, 0));
    for (const [x, y, rz] of [[.03, .2, -1], [.012, .17, .85]]) { const b = new THREE.Mesh(branchG, bark); b.position.set(x, y, 0); b.rotation.z = rz; b.castShadow = true; t.add(b); }
    const crown = new THREE.Group(); crown.position.set(.045, .3, 0); t.add(crown);
    const leaf = [mat('#2f6a43', { flatShading: true }), mat('#3f8250', { flatShading: true }), mat('#58a05c', { flatShading: true })];
    for (const [x, y, z, r, m] of [[0, 0, 0, .085, 1], [-.075, -.03, .01, .062, 0], [.08, -.035, -.01, .066, 0], [.03, .06, -.02, .06, 2],
      [-.035, .045, .03, .052, 2], [.055, .01, .055, .05, 1], [-.06, -.04, -.05, .055, 0], [.12, -.06, .02, .04, 2]]) {
      const b = new THREE.Mesh(kit.keep(new THREE.IcosahedronGeometry(r, 1)), leaf[m]); b.position.set(x, y, z); b.castShadow = true; crown.add(b);
    }
    t.userData.crown = crown;
    return t;
  }

  /* ── a little stone lantern beside them: it lights up as night falls ── */
  function makeLantern() {
    const l = new THREE.Group(), stone = mat('#a39d92', { roughness: 1, flatShading: true }), moss = mat('#7f9a63', { roughness: 1, flatShading: true });
    const part = (geo, m, y) => { const o = new THREE.Mesh(kit.keep(geo), m); o.position.y = y; o.castShadow = true; o.receiveShadow = true; l.add(o); return o; };
    part(new THREE.CylinderGeometry(.026, .03, .01, 6), moss, .005);
    part(new THREE.CylinderGeometry(.009, .011, .05, 8), stone, .035);
    part(new THREE.CylinderGeometry(.024, .019, .009, 6), stone, .064);
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
    const c = cv.getContext('2d'); c.fillStyle = '#8f897f'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#fff1c4'; c.fillRect(16, 14, 32, 36);
    c.fillStyle = '#8f897f'; c.fillRect(30, 14, 4, 36);
    const tex = kit.keep(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace;
    const box = part(new THREE.BoxGeometry(.03, .026, .03), mat('#ffffff', { map: tex, emissive: '#ffb45c', emissiveMap: tex, emissiveIntensity: 0 }), .082);
    part(new THREE.ConeGeometry(.036, .022, 6), stone, .106).rotation.y = Math.PI / 6;
    part(new THREE.SphereGeometry(.0065, 8, 6), stone, .121);
    const glow = kit.glow({ color: 0xffc070, size: .1, opacity: 0, depthTest: false }); glow.position.y = .082; l.add(glow);
    const light = new THREE.PointLight(0xffa860, 0, .55, 1.6); light.position.set(0, .085, .03); l.add(light);
    return Object.assign(l, { box, glow, light });
  }

  /* ── the sky: magic hour painted on a pop-up page, a night that falls over it, far hills in front with a town ── */
  function paintSky(c, w, h) {
    const gr = c.createLinearGradient(0, 0, 0, h);
    [[0, '#0f1446'], [.2, '#232a72'], [.4, '#4b3f95'], [.54, '#8a539f'], [.66, '#d46f91'], [.77, '#ff9a6c'], [.86, '#ffc480'], [.93, '#ffe0a6'], [1, '#ffe9bd']]
      .forEach(([k, s]) => gr.addColorStop(k, s));
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const sun = c.createRadialGradient(w * .3, h * .95, 0, w * .3, h * .95, w * .45);   // where the sun has just gone down
    sun.addColorStop(0, 'rgba(255,214,150,.75)'); sun.addColorStop(1, 'rgba(255,170,120,0)');
    c.fillStyle = sun; c.fillRect(0, 0, w, h);
    const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(88);
    for (let i = 0; i < 7; i++) {                                     // long thin clouds lit pink from below
      const y = h * (.48 + i * .055 + r() * .03), x0 = r() * w * .8, len = w * (.25 + r() * .35);
      for (let k = 0; k < 14; k++) {
        const x = x0 + k / 14 * len, ry = 3 + r() * 4, rx = 22 + r() * 30;
        c.fillStyle = `rgba(${i < 3 ? '120,88,170' : '214,120,150'},${.28 + r() * .2})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
        c.fillStyle = `rgba(255,${i < 3 ? 170 : 196},${i < 3 ? 190 : 150},${.3 + r() * .25})`; c.beginPath(); c.ellipse(x + 4, y + ry * .7, rx * .8, ry * .45, 0, 0, TAU); c.fill();
      }
    }
    for (let i = 0; i < 160; i++) {                                   // faint stars, thicker towards the top
      const y = Math.pow(r(), 1.6) * h * .5, x = r() * w, a = (1 - y / (h * .5)) * (.35 + r() * .6);
      c.fillStyle = `rgba(255,248,230,${a})`; c.beginPath(); c.arc(x, y, .7 + r() * 1.5, 0, TAU); c.fill();
    }
  }
  function paintNight(c, w, h) {
    const gr = c.createLinearGradient(0, 0, 0, h);
    [[0, 'rgba(6,8,34,.92)'], [.35, 'rgba(10,14,52,.85)'], [.62, 'rgba(22,22,78,.78)'], [.82, 'rgba(48,34,96,.55)'], [.93, 'rgba(90,50,110,.35)'], [1, 'rgba(60,40,90,.4)']]
      .forEach(([k, s]) => gr.addColorStop(k, s));
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  }
  function paintHills(c, w, h) {
    const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(21);
    const ridge = (base, amp, seed, fill, rim) => {                   // a range of hills from a few soft waves
      const ys = [];
      for (let x = 0; x <= w; x += 8) ys.push([x, h * base - amp * h * (.55 * Math.sin(x / w * 5.3 + seed) + .3 * Math.sin(x / w * 11.7 + seed * 2) + .15 * Math.sin(x / w * 23 + seed * 3))]);
      c.beginPath(); c.moveTo(0, h); ys.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(w, h); c.closePath(); c.fillStyle = fill; c.fill();
      if (rim) { c.beginPath(); ys.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo'](x, y + 1.5)); c.strokeStyle = rim; c.lineWidth = 3; c.stroke(); }
      return ys;
    };
    ridge(.83, .05, .7, '#7d6cb4', 'rgba(255,190,170,.55)');
    const mid = ridge(.88, .045, 2.1, '#4d4290', 'rgba(255,170,160,.35)');
    for (const [cx, n] of [[.64, 26], [.18, 9], [.86, 7]]) {          // a little town in the valley, its windows lit
      for (let i = 0; i < n; i++) {
        const x = w * cx + (r() - .5) * w * .13, y = mid[Math.min(mid.length - 1, Math.round(x / 8))][1] + 6 + r() * 16;
        c.fillStyle = 'rgba(255,200,120,.22)'; c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fill();
        c.fillStyle = r() < .8 ? '#ffd889' : '#fff3d0'; c.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
    const near = ridge(.93, .035, 4.2, '#2c275f', null);
    for (let i = 0; i < 46; i++) {                                    // trees along the near ridge
      const x = r() * w, y = near[Math.min(near.length - 1, Math.round(x / 8))][1] + 2, s = 5 + r() * 9;
      c.fillStyle = '#231f50'; c.beginPath(); c.moveTo(x - s * .5, y); c.lineTo(x, y - s * 1.6); c.lineTo(x + s * .5, y); c.closePath(); c.fill();
    }
    c.fillStyle = '#2a3d36'; c.fillRect(0, h * .965, w, h * .035);    // the hill's own green where it meets the sky
  }

  /* ── a glowing ribbon along a path: a comet's tail, a strand of the heart. It shows up to its head (0..1 along it),
        white-hot at the head and fading along a tail `len` long; `base` is how much stays lit behind the tail ── */
  function ribbon(pts, o = {}) {
    const n = pts.length, P = new Float32Array(n * 6), N = new Float32Array(n * 6), U = new Float32Array(n * 2), Sd = new Float32Array(n * 2), idx = [];
    const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const d = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      d.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      const nx = -d.y, ny = d.x, nl = Math.hypot(nx, ny) || 1;
      for (const k of [0, 1]) { const j = i * 2 + k; P.set([pts[i].x, pts[i].y, pts[i].z], j * 3); N.set([nx / nl, ny / nl, 0], j * 3); U[j] = L[i] / L[n - 1]; Sd[j] = k ? 1 : -1; }
      if (i) idx.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
    }
    const geo = kit.keep(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('aN', new THREE.BufferAttribute(N, 3));
    geo.setAttribute('aU', new THREE.BufferAttribute(U, 1)); geo.setAttribute('aS', new THREE.BufferAttribute(Sd, 1)); geo.setIndex(idx);
    const u = { uHead: { value: 0 }, uLen: { value: o.len ?? .3 }, uW0: { value: o.w0 ?? .006 }, uW1: { value: o.w1 ?? .03 }, uBase: { value: 0 }, uGlow: { value: 1 },
      uAlpha: { value: 1 }, uA: { value: new THREE.Color(o.a ?? '#5fe3ff') }, uB: { value: new THREE.Color(o.b ?? '#ff7ab8') }, uT: { value: 0 } };
    const m = kit.keep(new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute vec3 aN; attribute float aU, aS; uniform float uHead, uLen, uW0, uW1; varying float vD, vS, vU;
        void main() { float d = uHead - aU, k = clamp(d / uLen, 0., 1.); vD = d; vS = aS; vU = aU;
          vec3 p = position + aN * aS * mix(uW0, uW1, sqrt(k));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform float uLen, uBase, uGlow, uAlpha, uT; uniform vec3 uA, uB; varying float vD, vS, vU;
        void main() { if (vD < 0.) discard;
          float k = vD / uLen, tail = uGlow * exp(-3.2 * k) * step(k, 1.), across = 1. - vS * vS, core = pow(across, 5.);
          float shimmer = .85 + .15 * sin(vU * 60. - uT * 5.);
          vec3 col = mix(uA, uB, clamp(k, 0., 1.)); col = mix(col, vec3(1.), core * tail * .75);
          float a = (tail + uBase * shimmer) * across * uAlpha;
          gl_FragColor = vec4(col, clamp(a, 0., 1.)); }`
    }));
    const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; mesh.renderOrder = 2;
    const at = (k, out) => { const f = clamp(k) * (n - 1), i = Math.min(n - 2, Math.floor(f)); return out.lerpVectors(pts[i], pts[i + 1], f - i); };
    return { mesh, u, at };
  }
  /** the classic heart curve, from its top notch round one side to its tip: side 1 right, -1 left */
  const heartCurve = side => new THREE.CatmullRomCurve3(Array.from({ length: 41 }, (_, i) => {
    const t = i / 40 * Math.PI, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return new THREE.Vector3(side * x * HEART.s, y * HEART.s, 0);
  }));

  /** a piece of the sky's page from x0 to x1 (all of its height), dz in front of it: it curves with the page, so what is
      painted on it never cuts through the sky */
  function pagePatch(x0, x1, dz, draw, px = 256) {
    const w = x1 - x0, tex = kit.canvasTexture(px, Math.round(px * SKY.height / w), draw);
    const geo = kit.keep(new THREE.PlaneGeometry(w, SKY.height, 12, 1)), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + x0 + w / 2;
      pos.setXYZ(i, x, pos.getY(i) + SKY.height / 2, SKY.curve * (x / (SKY.width / 2)) ** 2);
    }
    const m = new THREE.Mesh(geo, kit.keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })));
    m.position.z = SKY.z + dz;
    return m;
  }

  /* the drawings: the moon */
  function paintMoon(c, W, Hh) {
    const px = W, m = px / 2, R = px * .27;
    c.save(); c.translate(0, (1 - MOON.y / SKY.height) * Hh - m);   // drawn where it ends up; it rises by sliding up to here
    const halo = c.createRadialGradient(m, m, R * .9, m, m, px * .5);
    halo.addColorStop(0, 'rgba(255,236,200,.55)'); halo.addColorStop(.4, 'rgba(255,226,190,.18)'); halo.addColorStop(1, 'rgba(255,220,190,0)');
    c.fillStyle = halo; c.fillRect(0, 0, px, px);
    const gr = c.createRadialGradient(m - R * .35, m - R * .35, R * .05, m, m, R);
    gr.addColorStop(0, '#fffdf6'); gr.addColorStop(.7, '#fbedd2'); gr.addColorStop(1, '#efd5a8');
    c.fillStyle = gr; c.beginPath(); c.arc(m, m, R, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.arc(m, m, R, 0, TAU); c.clip();
    for (const [x, y, r, a] of [[-.3, -.2, .34, .22], [.15, -.32, .22, .16], [.28, .15, .3, .2], [-.08, .32, .2, .15], [-.42, .25, .14, .12], [.05, .02, .12, .1]]) {
      const s = c.createRadialGradient(m + x * R, m + y * R, 0, m + x * R, m + y * R, r * R);   // the seas: soft grey patches
      s.addColorStop(0, `rgba(184,156,128,${a})`); s.addColorStop(.7, `rgba(184,156,128,${a * .7})`); s.addColorStop(1, 'rgba(184,156,128,0)');
      c.fillStyle = s; c.fillRect(0, 0, px, px);
    }
    for (const [x, y, rr] of [[.45, -.4, .07], [-.55, -.05, .05], [.18, .58, .055]]) {   // three small craters
      c.strokeStyle = 'rgba(160,130,104,.3)'; c.lineWidth = px * .006; c.beginPath(); c.arc(m + x * R, m + y * R, rr * R, 0, TAU); c.stroke();
    }
    const shade = c.createRadialGradient(m - R * .3, m - R * .3, R * .6, m, m, R * 1.05);   // a little roundness at the rim
    shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(150,110,80,.25)');
    c.fillStyle = shade; c.fillRect(0, 0, px, px);
    c.restore();
  }

  return {
    seconds: [6.8, 6.2, 6.0],

    build() {
      /* the two of them: he keeps his cape (night blue now), she leaves her hat off (a rose dress) */
      boy = kit.model('boy').fit({ height: H }); girl = kit.model('girl').fit({ height: H * .97 });
      recolor(boy, [[0, 1, 1, ['#7d8ff0', '#3a46a8', '#1b1f5c']]]);
      recolor(girl, [[0, 1, 2, ['#ffd0dd', '#f387a9', '#c2456f', '#7a2347']]]);
      for (const m of [boy, girl]) m.root.rotation.order = 'YXZ';     // a turn, then a tip with the ground under them
      stage.add(boy.root, girl.root);

      /* the sky, the night that falls over it, the far hills; the moon rises between them */
      sky = kit.backdrop(paintSky, SKY);
      veil = kit.backdrop(paintNight, { ...SKY, z: SKY.z + .004, px: 256 }); veil.material.opacity = 0;
      ridge = kit.backdrop(paintHills, { ...SKY, z: SKY.z + .016 });
      ridge.material.alphaTest = .5;                                  // its clear sky lets the moon through
      stage.add(sky, veil, ridge);
      moon = pagePatch(MOON.x - .25, MOON.x + .25, .009, paintMoon, 512);   // it rises by sliding its picture up the patch
      moon.material.map.wrapT = THREE.ClampToEdgeWrapping;
      [sky, veil, moon, ridge].forEach((p, i) => { p.renderOrder = i - 4; });   // painted back to front: the far hills hide the low moon
      stage.add(moon);
      rim = new THREE.DirectionalLight(0xffb27a, 0); rim.position.set(-.7, .45, -1); rim.target.position.set(0, .05, 0); stage.add(rim, rim.target);

      /* the hill, its grass and flowers, the tree, the lantern */
      hill = makeHill(); stage.add(hill);
      grass = makeGrass(); stage.add(grass.mesh);
      blooms = makeBlooms(); stage.add(blooms.stem, blooms.head, blooms.eye);
      tree = makeTree(); tree.position.set(TREE.x, hillAt(TREE.x, TREE.z) - .004, TREE.z); stage.add(tree);
      lantern = makeLantern(); lantern.position.set(LANTERN.x, hillAt(LANTERN.x, LANTERN.z) - .003, LANTERN.z); lantern.rotation.y = -.4; stage.add(lantern);

      /* the comet: its path down to the heart's notch, then two strands round the heart */
      const notch = new THREE.Vector3(HEART.x, HEART.y + 5 * HEART.s, HEART.z);
      const path = new THREE.CatmullRomCurve3([new THREE.Vector3(-.5, .67, -.13), new THREE.Vector3(-.36, .66, -.13), new THREE.Vector3(-.2, .63, -.13),
        new THREE.Vector3(-.07, .58, -.13), notch]).getSpacedPoints(160);   // all of it in front of the page, which curves forward at its ends
      comet = ribbon(path, { len: .55, w0: .006, w1: .05, a: '#7ff0ff', b: '#ff86c4' });
      cometHead = kit.glow({ color: 0xcff8ff, size: .12, opacity: 0 });
      strands = [-1, 1].map(side => {
        const pts = heartCurve(side).getSpacedPoints(120).map(p => p.add(new THREE.Vector3(HEART.x, HEART.y, HEART.z)));
        const r = ribbon(pts, side < 0 ? { len: .35, w0: .007, w1: .011, a: '#8ff3ff', b: '#3fc9ff' } : { len: .35, w0: .007, w1: .011, a: '#ffc2e0', b: '#ff5fa8' });
        r.headGlow = kit.glow({ color: side < 0 ? 0xa8f4ff : 0xffb8dc, size: .07, opacity: 0 });
        return r;
      });
      heart = new THREE.Group(); stage.add(heart);                     // the heart and the photo in it move together
      heart.add(...strands.map(s => s.mesh), ...strands.map(s => s.headGlow));
      stage.add(comet.mesh, cometHead);

      /* the card's words and photo */
      note = kit.sign({ text: words('note1', 'Cùng em ngắm trăng lên'), width: .38, paper: '#fffaf0', ink: '#352a6e', accent: '#9d8cff', glow: .6 });
      banner = kit.sign({ text: words('note2', 'Ước gì mình mãi bên nhau!'), style: 'banner', width: .6, accent: '#ec5f8c', glow: .55 });
      photo = kit.polaroid({ width: .22, caption: words('caption', 'Điều ước của anh là em'), glow: .6, halo: true, haloColor: 0xbfeaff });
      photo.root.position.set(0, -photo.height / 2, .012); heart.add(photo.root);
      flash = kit.glow({ color: 0xfff6dc, size: .5, opacity: 0, depthTest: false });
      last = ribbon(new THREE.CatmullRomCurve3([new THREE.Vector3(-.52, .71, -.12), new THREE.Vector3(-.3, .69, -.1), BANG]).getSpacedPoints(60),
        { len: .7, w0: .01, w1: .05, a: '#fff6d6', b: '#ffb3dd' });
      stage.add(note.root, banner.root, flash, last.mesh);

      /* particles */
      stars = kit.particles({ max: 130, additive: true });
      sparks = kit.particles({ max: 320, additive: true });
      meteors = kit.particles({ max: 220, additive: true });
      hearts = kit.particles({ max: 180 });
      motes = kit.particles({ max: 40, additive: true });
      stage.add(stars.root, sparks.root, meteors.root, hearts.root, motes.root);
    },

    reset() {
      [stars, sparks, meteors, hearts, motes].forEach(p => p.clear());
      pops.length = 0;
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();

      /* light: magic hour, then night; the sunset's warm light from behind fades and the moon's takes over */
      const night = ease.smooth(seg(g, 4, 14.5));
      kit.lights.hemi.color.copy(DUSK.hemi).lerp(NIGHT.hemi, night); kit.lights.hemi.groundColor.copy(DUSK.ground).lerp(NIGHT.ground, night);
      kit.lights.hemi.intensity = lerp(1, .72, night); kit.lights.sun.color.copy(DUSK.sun).lerp(NIGHT.sun, night); kit.lights.sun.intensity = lerp(1.15, .78, night);
      rim.intensity = 1.3 * (1 - night) * ease.smooth(seg(g, 0, .8));
      veil.material.opacity = .92 * night;

      /* chapter 1: the sky stands up like a pop-up page and the hill swells out of the card */
      const fold = ease.inOut(seg(g, 0, .75)), wob = g > .75 ? Math.exp(-6 * (g - .75)) * Math.sin(13 * (g - .75)) : 0;
      for (const p of [sky, veil, moon, ridge]) p.rotation.x = -Math.PI / 2 * (1 - fold) + .05 * wob;
      const swell = ease.back(seg(g, .15, .95)), spread = lerp(.3, 1, ease.out(seg(g, .05, .7)));
      hill.scale.set(spread, Math.max(.001, swell), spread); hill.visible = g > .05;
      poseGrass(g, T);
      const grow = ease.elastic(seg(g, .55, 1.4));
      tree.scale.set(Math.max(.001, grow), Math.max(.001, ease.back(seg(g, .5, 1.1))), Math.max(.001, grow));
      tree.position.y = hillAt(TREE.x, TREE.z) * swell - .004;
      tree.userData.crown.rotation.z = .025 * Math.sin(T * .9) + .02 * Math.max(0, Math.sin(T * .55 + .8)) ** 3;
      lantern.scale.setScalar(Math.max(.001, ease.back(seg(g, .8, 1.15))));
      lantern.position.y = hillAt(LANTERN.x, LANTERN.z) * swell - .003;
      const lit = ease.out(seg(g, 2.2, 2.8)), flick = 1 + .07 * Math.sin(T * 13) * Math.sin(T * 7.7);
      lantern.box.material.emissiveIntensity = 1.5 * lit * flick; lantern.glow.material.opacity = .5 * lit * flick; lantern.light.intensity = .3 * lit * flick;
      if (g > .85 && kit.once('lantern')) sparks.burst(10, () => ({ x: LANTERN.x, y: .1, z: LANTERN.z, vx: (rng() - .5) * .2, vy: .1 + rng() * .15, vz: (rng() - .5) * .1,
        gravity: -.25, drag: 2, color: '#fff1c4', size: .016, life: .7, shape: 'sparkle', spin: 3 }));
      if (dt && g > 2.5 && rng() < dt * 1.2) motes.emit({ x: LANTERN.x + (rng() - .5) * .03, y: .12, z: LANTERN.z, vy: .03, sway: .02, color: '#ffd38a',
        size: .008 + rng() * .006, life: 2.2, shape: 'glow', twinkle: 6 });

      /* the moon comes up behind the far hills, golden low down and paler as it climbs; the stars come out */
      const rise = ease.out(seg(g, 1, 5.6)), moonY = lerp(-.1, MOON.y, rise);
      moon.material.map.offset.y = (MOON.y - moonY) / SKY.height - .003 * Math.sin(T * .6);
      moon.material.color.setRGB(1, lerp(.78, 1, rise), lerp(.55, .95, rise));
      MOON_AT.set(MOON.x, moonY, zPage(MOON.x) + .01);
      for (let i = 0; i < 12; i++) if (g > 2.3 + i * .28 && kit.once(`stars${i}`)) stars.burst(i < 4 ? 6 : 9, () => {
        let x, y; do { x = (rng() - .5) * 1.1; y = .36 + rng() * .38; } while (Math.hypot(x - MOON.x, y - MOON.y) < .17);
        return { x, y, z: zPage(x) + .02 + rng() * .05, color: ['#ffffff', '#fff2c4', '#cfe0ff', '#ffd6ec'][(rng() * 4) | 0],
          size: .01 + rng() * .016, life: 1e6, shape: rng() < .3 ? 'star' : rng() < .5 ? 'sparkle' : 'glow', twinkle: 1.5 + rng() * 3.5, rot: rng() * 6.28 };
      });

      /* the sweethearts: she leads him up the hill by the hand; at the top she points at the moon; they lie down to watch it */
      const [gx, gPace] = stride(g, .15, 2.85, -.38, SPOT.girl), [bx, bPace] = stride(g, .1, 2.95, -.52, SPOT.boy);   // about 2 and 1.9
      const gz = lerp(SPOT.z - .05, SPOT.z, ease.inOut(seg(g, 2.6, 3.2))), bz = lerp(SPOT.z + .05, SPOT.z, ease.inOut(seg(g, 2.7, 3.35)));
      const gYaw = tween(g, [[2.8, Math.PI / 2], [3.15, .55], [3.8, .55], [4.05, .06]]), bYaw = tween(g, [[2.9, Math.PI / 2], [3.3, .3], [3.85, .3], [4.15, -.06]]);
      const gDown = ease.inOut(seg(g, 4.55, 5.6)), bDown = ease.inOut(seg(g, 4.75, 5.8));   // lying: tipped back with the ground
      const gUp = ease.inOut(seg(g, 7.75, 8.55)), bUp = ease.inOut(seg(g, 8, 8.8));        // and sitting up again
      const close = ease.inOut(seg(g, 13.4, 14));                     // scooting in, close
      const place = (m, x, z, yaw, down, up, side) => {
        m.root.position.set(x - side * .015 * close, hillAt(x, z) * swell + .006 * down * (1 - up), z);
        m.root.rotation.set(slopeAt(x, z) * down * (1 - up), yaw, 0);
      };
      place(girl, gx, gz, gYaw, gDown, gUp, 1);
      place(boy, bx, bz, bYaw, bDown, bUp, -1);
      const gc = clipAt(GIRL, g), bc = clipAt(BOY, g), walk = 'Walking_A';
      girl.play(gc[1], gc[1] === walk ? { speed: gPace } : gc[2]); boy.play(bc[1], bc[1] === walk ? { speed: bPace } : bc[2]);
      girl.root.updateMatrixWorld(true); boy.root.updateMatrixWorld(true);

      /* hand in hand up the hill: her right reaches back to him, his left forward to her; she looks back at him */
      const hand = seg(g, .25, .6) * (1 - seg(g, 2.75, 3));
      if (hand) {
        girl.aim('upperarm.r', [-.45, -.55, -.7], hand); girl.aim('lowerarm.r', [-.4, -.35, -.85], hand);
        boy.aim('upperarm.l', [.45, -.55, .7], hand); boy.aim('lowerarm.l', [.4, -.35, .85], hand);
        girl.bend('head', 0, -.55 * bump(g, .6, 1, 1.9, 2.4), .1 * Math.sin(g * 6));
      }
      /* "look!": her free arm out straight at the moon (a chibi arm only shows past the head held out to the side), a
         little shake in it; he follows her finger */
      const point = bump(g, 3.05, 3.3, 3.75, 4);
      if (point) {
        const d = toward(girl, 'l', MOON_AT), out = [d[0] * 1.6, d[1] * .55, d[2] * .5], wig = .14 * Math.sin(T * 8) * seg(g, 3.3, 3.45);
        girl.aim('upperarm.l', out, point); girl.aim('lowerarm.l', [out[0], out[1] + .1 + wig, out[2]], point);
        girl.bend('head', -.3 * point, .35 * point, 0);
        boy.bend('head', -.3 * point, .45 * point, 0);
      }

      /* lying: heads turned to each other, his left and her right find each other in the grass */
      const settle = ease.smooth(seg(g, 5.9, 6.5)) * (1 - ease.smooth(seg(g, 7.6, 7.9)));
      if (settle) {
        girl.bend('head', 0, -.5 * settle, 0); boy.bend('head', 0, .25 * settle, 0);
        girl.aim('upperarm.r', [-.7, -.15, .35], settle); girl.aim('lowerarm.r', [-.8, -.05, .45], settle);
        boy.aim('upperarm.l', [.7, -.15, .35], settle); boy.aim('lowerarm.l', [.8, -.05, .45], settle);
      }

      /* chapter 1's stop: the first note */
      const n1 = ease.back(seg(g, 6, 6.65)) * (1 - ease.in(seg(g, 6.85, 7.3)));
      note.root.scale.setScalar(Math.max(.001, n1));
      note.root.position.set(-.06, .52 + .12 * seg(g, 6.85, 7.3) + .008 * Math.sin(T * 1.6), .05);
      note.root.rotation.set(-.12, .05, .04 * Math.sin(T * .9));

      /* chapter 2: the comet. A glint, then it sweeps down the sky to the heart's notch, where its tail runs on into two strands */
      const run = tween(g, [[7.05, 0], [7.6, .12, 'in'], [8.95, .9, 'linear'], [9.45, 1, 'out']]);   // a steady glide, slowing into the notch
      comet.u.uHead.value = g < 9.45 ? run : 1 + comet.u.uLen.value * ease.inOut(seg(g, 9.45, 10.5));
      comet.u.uAlpha.value = ease.smooth(seg(g, 7.05, 7.35)); comet.u.uT.value = T;
      comet.mesh.visible = g > 7.05 && g < 10.6;
      const headAt = comet.at(run, vH);
      cometHead.position.copy(headAt); cometHead.scale.setScalar(.12 + .04 * Math.sin(T * 9));
      cometHead.material.opacity = ease.smooth(seg(g, 6.95, 7.2)) * (1 - ease.smooth(seg(g, 9.4, 9.6))) * (1 + .15 * Math.sin(T * 17));
      if (g > 6.95 && g < 7.15 && kit.once('glint')) sparks.burst(12, i => ({ x: -.5, y: .67, z: -.12, vx: Math.cos(i / 12 * TAU) * .12, vy: Math.sin(i / 12 * TAU) * .12,
        drag: 3, color: '#dffaff', size: .016, life: .6, shape: i % 2 ? 'sparkle' : 'glow' }));
      if (g > 7.1 && g < 9.45 && dt) sparks.emit({ x: headAt.x + (rng() - .5) * .01, y: headAt.y, z: headAt.z, vx: (rng() - .5) * .03, vy: -.02,
        color: rng() < .5 ? '#bff6ff' : '#ffc7e3', size: .012 + rng() * .01, life: .9, shape: rng() < .5 ? 'sparkle' : 'star', spin: 3 });
      if (g > 9.42 && kit.once('split')) sparks.burst(22, i => ({ x: HEART.x, y: HEART.y + 5 * HEART.s, z: HEART.z + .01, vx: Math.cos(i / 22 * TAU) * .2,
        vy: Math.sin(i / 22 * TAU) * .2, drag: 2.5, color: i % 2 ? '#bff6ff' : '#ffc7e3', size: .018, life: .7, shape: i % 3 ? 'glow' : 'sparkle' }));
      const trace = ease.inOut(seg(g, 9.45, 10.7)), framed = ease.smooth(seg(g, 9.6, 11));
      strands.forEach((s, i) => {
        s.u.uHead.value = trace; s.u.uT.value = T;
        s.u.uBase.value = .55 * framed * (1 + .12 * Math.sin(T * 2.4 + i * 3));
        s.u.uGlow.value = 1 - .7 * ease.smooth(seg(g, 10.7, 11.4));
        s.mesh.visible = g > 9.44;
        s.at(trace, s.headGlow.position);
        s.headGlow.material.opacity = seg(g, 9.45, 9.6) * (1 - ease.smooth(seg(g, 10.65, 11)));
      });
      if (g > 10.7 && kit.once('tip')) {                              // the strands meet at the heart's tip
        sparks.burst(30, i => ({ x: HEART.x, y: HEART.y - 17 * HEART.s, z: HEART.z + .02, vx: Math.cos(i / 30 * TAU) * (.15 + rng() * .1),
          vy: Math.sin(i / 30 * TAU) * (.15 + rng() * .1), drag: 2, color: ['#bff6ff', '#ffc7e3', '#fff6d0'][i % 3], size: .02, life: .9, shape: i % 2 ? 'glow' : 'sparkle' }));
        hearts.burst(10, () => ({ x: HEART.x, y: HEART.y - 15 * HEART.s, z: HEART.z + .02, vx: (rng() - .5) * .2, vy: .1 + rng() * .15, gravity: -.1, drag: .8,
          color: ['#ff8fbf', '#9fe8ff', '#ffd1e4'][(rng() * 3) | 0], size: .018 + rng() * .012, life: 2, shape: 'heart', spin: (rng() - .5) * 3 }));
      }

      /* the photo lights up in the heart; in the last chapter the two drift aside together */
      const p = ease.back(seg(g, 10.8, 11.6)), aside = ease.inOut(seg(g, 13, 13.9));
      photo.root.scale.setScalar(Math.max(.001, p));
      photo.root.position.set(HEART.x, HEART.y - photo.height / 2 + .005, HEART.z + .012);
      photo.root.rotation.set(-.04, .05 * Math.sin(T * .8), .03 * Math.sin(T * .6));
      photo.halo.material.opacity = .6 * p * (1 + .08 * Math.sin(T * 3));
      heart.position.set(lerp(0, ASIDE.x - HEART.x * ASIDE.k, aside), lerp(0, ASIDE.y - HEART.y * ASIDE.k, aside) + .006 * Math.sin(T * 1.2) * seg(g, 10.8, 11.4),
        lerp(0, ASIDE.z - HEART.z * ASIDE.k, aside));
      heart.scale.setScalar(lerp(1, ASIDE.k, aside));
      if (held && g < 13.1 && dt && rng() < dt * 5) {                   // while it waits: sparkles run round the heart
        const at = strands[(rng() * 2) | 0].at(rng(), vI);
        sparks.emit({ x: at.x, y: at.y, z: at.z - .004, vy: .01, color: '#ffffff', size: .014, life: .8, shape: 'sparkle', spin: 3 });   // behind the photo's plane
      }

      /* sitting up to watch: heads follow the comet down the sky, then she rests her head on his shoulder */
      const watch = ease.smooth(seg(g, 7.6, 8.2)) * (1 - ease.smooth(seg(g, 11.6, 12.2)));
      if (watch) {
        const look = clamp((headAt.x + .1) / .5, -1, 1);
        for (const m of [boy, girl]) m.bend('head', -.32 * watch, .18 * look * watch, 0);
      }
      const lean = ease.smooth(seg(g, 11.7, 12.4)) * (1 - ease.smooth(seg(g, 13, 13.4)));
      if (lean) { girl.bend('head', .05, .1, .32, lean); girl.bend('chest', 0, 0, .08, lean); boy.bend('head', -.05, -.1, -.14, lean); }

      /* chapter 3: the meteor shower; some burst into tiny hearts */
      const shower = g < 13.3 ? 0 : g < 16.6 ? 3 + 9 * seg(g, 13.3, 14.8) : held ? 2.5 : 4;
      if (dt && shower && rng() < dt * shower) {
        const x = -.52 + rng() * .75, y = .6 + rng() * .14, z = -.11 + rng() * .02, sp = .6 + rng() * .4;   // in front of the curved page
        const vx = .72 * sp, vy = -.5 * sp, size = .1 + rng() * .08, lead = size * .42 / Math.hypot(.72, .5);
        const life = Math.min(.5 + rng() * .4, (.46 - x) / vx);           // gone before it leaves the sky
        const tint = ['#d8f6ff', '#ffe3f1', '#fff1c4', '#bfe9ff'][(rng() * 4) | 0];
        meteors.emit({ x, y, z, vx, vy, color: tint, size, life, shape: 'drop', rot: .96 });
        meteors.emit({ x: x + .72 * lead, y: y - .5 * lead, z: z + .002, vx, vy, color: '#ffffff', size: .024 + rng() * .012, life, shape: 'sparkle', spin: 6 });
        for (let k = 1; k <= 3; k++) meteors.emit({ x: x - .72 * lead * k * .6, y: y + .5 * lead * k * .6, z, vx: vx * .9, vy: vy * .9, color: tint, size: .014,
          life: life * .8, shape: k % 2 ? 'glow' : 'star', spin: 3 });
        if (rng() < .35) pops.push([g + life * .85, x + vx * life * .85 + .72 * lead, y + vy * life * .85 - .5 * lead, z]);
      }
      for (let i = pops.length - 1; i >= 0; i--) if (g >= pops[i][0]) {
        const [, x, y, z] = pops[i]; pops.splice(i, 1);
        hearts.burst(5, () => ({ x, y, z: z + .02, vx: (rng() - .5) * .14, vy: (rng() - .3) * .12, gravity: -.06, drag: 1.2, color: ['#ff6f9f', '#ff9fc6', '#7fdcff'][(rng() * 3) | 0],
          size: .02 + rng() * .012, life: 1.4, shape: 'heart', spin: (rng() - .5) * 4 }));
      }

      /* they scoot close, hold hands, then wish with their hands together and their eyes on the sky */
      const hands = ease.smooth(seg(g, 13.8, 14.3)) * (1 - ease.smooth(seg(g, 14.8, 15.1))) + ease.smooth(seg(g, 17.5, 18));
      if (hands) {
        girl.aim('upperarm.r', [-.55, -.8, .25], hands); girl.aim('lowerarm.r', [-.75, -.5, .4], hands);
        boy.aim('upperarm.l', [.55, -.8, .25], hands); boy.aim('lowerarm.l', [.75, -.5, .4], hands);
      }
      const wish = ease.smooth(seg(g, 14.9, 15.4)) * (1 - ease.smooth(seg(g, 17.1, 17.5)));
      if (wish) for (const m of [boy, girl]) {
        m.aim('upperarm.r', [-.25, -.4, .88], wish); m.aim('lowerarm.r', [.55, .7, .45], wish);
        m.aim('upperarm.l', [.25, -.4, .88], wish); m.aim('lowerarm.l', [-.55, .7, .45], wish);
        m.bend('head', -.45 * wish, 0, .05 * Math.sin(T * 1.5) * wish);
      }
      if (wish > .9 && g < 17.1 && dt && rng() < dt * 5) {              // their wish rises: little lights float up from their hands
        const m = rng() < .5 ? boy : girl;
        onStage(m.node('handslot.r'), vI).add(onStage(m.node('handslot.l'), vT)).multiplyScalar(.5);
        sparks.emit({ x: vI.x, y: vI.y + .01, z: vI.z + .01, vx: (rng() - .5) * .02, vy: .07 + rng() * .04, sway: .02, color: rng() < .5 ? '#fff1b8' : '#ffd1e8',
          size: .012 + rng() * .008, life: 2.2, shape: rng() < .4 ? 'star' : 'sparkle', spin: 2, twinkle: 7 });
      }
      const together = ease.smooth(seg(g, 17.5, 18.1));                 // the end: heads together
      if (together) { girl.bend('head', 0, .12, .3 + .02 * Math.sin(T * 1.2), together); boy.bend('head', 0, -.12, -.16, together); }

      /* the last bright meteor: a long golden streak, a flash where it ends, and the banner with the last words out of it */
      const dash = tween(g, [[16.5, 0], [16.75, .35, 'in'], [17, 1, 'linear']]);
      last.u.uHead.value = g < 17 ? dash : 1 + last.u.uLen.value * ease.out(seg(g, 17, 17.35)); last.u.uT.value = T;
      last.mesh.visible = g > 16.5 && g < 17.4;
      if (g > 16.5 && g < 17 && dt) { const at = last.at(dash, vI); sparks.emit({ x: at.x, y: at.y, z: at.z, vx: (rng() - .5) * .05, vy: -.03, color: '#fff1c4', size: .02, life: .6, shape: 'sparkle', spin: 4 }); }
      const bang = ease.out(seg(g, 17, 17.15)) * (1 - ease.smooth(seg(g, 17.15, 17.8)));
      flash.position.copy(BANG); flash.material.opacity = .9 * bang; flash.scale.setScalar(.25 + .45 * bang);
      kit.lights.hemi.intensity += .6 * bang;
      if (g > 17.02 && kit.once('bang')) {
        sparks.burst(36, i => ({ x: BANG.x, y: BANG.y, z: BANG.z + .01, vx: Math.cos(i / 36 * TAU) * (.25 + rng() * .15), vy: Math.sin(i / 36 * TAU) * (.25 + rng() * .15), gravity: -.08,
          drag: 1.6, color: ['#fff6d0', '#bff6ff', '#ffc7e3'][i % 3], size: .02, life: 1.2, shape: i % 3 ? 'glow' : 'star', spin: 3 }));
        hearts.burst(26, () => ({ x: 0, y: .3, z: .02, vx: (rng() - .5) * .4, vy: .15 + rng() * .25, vz: (rng() - .5) * .2, gravity: -.18, drag: .9,
          color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#9fe8ff'][(rng() * 4) | 0], size: .022 + rng() * .02, life: 2.4, shape: 'heart', spin: (rng() - .5) * 4 }));
      }
      const b = ease.elastic(seg(g, 17.15, 18.15));
      banner.root.scale.setScalar(Math.max(.001, b));
      banner.root.position.set(0, .63 + .006 * Math.sin(T * 1.5), .06);
      banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      if (held && g > 18.5 && dt && rng() < dt * 1.2) hearts.emit({ x: (rng() - .5) * .2, y: .28, z: .03, vy: .06, sway: .03, color: '#ff8fab', size: .018, life: 2.4, shape: 'heart' });

      [stars, sparks, meteors, hearts, motes].forEach(x => x.update(dt, T));
    }
  };
};
