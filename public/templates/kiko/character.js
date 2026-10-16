/* Kiko: a chibi magical idol with lilac twin tails, a mint-and-white stage dress and a star wand. Her trick: a pirouette.
   The act around her (pop, hello, lap, dance, trick, cheer, letter) is templates/_acts/showtime.js; this file only builds
   her and poses her parts. Units: about 1 tall, feet on y = 0, facing +z; the act scales her to template.json "height".
   Her face is one painted decal (eight expressions in one atlas, picked by texture offset), so the eyes stay anime-flat
   and cost one mesh. Her twin tails and skirt follow how her head really moves on the card (springs), so they swing,
   stream back on the run and fly out in the twirl without each pose having to animate them. */
(window.NM_CHARACTERS = window.NM_CHARACTERS || {})[document.currentScript.src] = (THREE, kit) => {
  const { ball, capsule, cyl, toon, outline, pivot, at, rot, scl, wave, ease, seg, clamp, lerp } = kit;
  const SKIN = 0xffdccb, HAIR = 0xbb96f0, MINT = 0x7fdcbf, WHITE = 0xfffbf4, PINK = 0xff7fb2, PINK2 = 0xff5f9e,
    SHOE = 0xff79ab, GOLD = 0xffd24d, INK = '#2b2440';
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  /* the hair: strands, darker towards the tips and a glossy "angel ring" near the roots; one texture for the cap and every lock */
  const hv = document.createElement('canvas'); hv.width = 512; hv.height = 256;
  { const h = hv.getContext('2d'), rr = (q => () => (q = (q * 1664525 + 1013904223) >>> 0) / 4294967296)(7), g = h.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#c9a6f7'); g.addColorStop(.55, '#bb96f0'); g.addColorStop(1, '#9a74dc'); h.fillStyle = g; h.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 28; i++) { const x = i * 512 / 28 + rr() * 6; h.strokeStyle = `rgba(96,58,170,${.25 + rr() * .2})`; h.lineWidth = 1.4 + rr() * 1.4; h.beginPath(); h.moveTo(x, 6 + rr() * 30); h.quadraticCurveTo(x + 7, 130, x - 3 + rr() * 6, 256); h.stroke(); }
    h.fillStyle = 'rgba(255,246,255,.6)'; h.beginPath(); h.moveTo(0, 60);
    for (let x = 0; x <= 512; x += 16) h.lineTo(x, 60 + (x / 16 % 2 ? 5 : -2));
    for (let x = 512; x >= 0; x -= 16) h.lineTo(x, 80 + (x / 16 % 2 ? 13 : 0));
    h.fill(); }
  const hairTex = new THREE.CanvasTexture(hv); hairTex.colorSpace = THREE.SRGBColorSpace; hairTex.anisotropy = 4;
  const hairMat = new THREE.MeshToonMaterial({ map: hairTex, gradientMap: toon(HAIR).gradientMap });
  /* the skirt: mint, little white stars, a white hem with a lilac line */
  const kv = document.createElement('canvas'); kv.width = 512; kv.height = 128;
  { const k = kv.getContext('2d'), rr = (q => () => (q = (q * 1664525 + 1013904223) >>> 0) / 4294967296)(23);
    k.fillStyle = '#7fdcbf'; k.fillRect(0, 0, 512, 128); k.fillStyle = '#fffbf4'; k.beginPath(); k.moveTo(0, 128);
    for (let x = 0; x <= 512; x += 16) k.quadraticCurveTo(x - 8, 106, x, 114);
    k.lineTo(512, 128); k.fill(); k.fillStyle = '#b48ef0'; k.fillRect(0, 100, 512, 3);
    k.fillStyle = '#ffffff';
    for (let i = 0; i < 26; i++) { const x = i * 512 / 26 + rr() * 10, y = 30 + rr() * 58, z = 3.5 + rr() * 2.5, a0 = rr() * 2; k.beginPath();
      for (let j = 0; j < 10; j++) { const a = a0 + j * Math.PI / 5, q = j % 2 ? z * .45 : z; k.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)); } k.fill(); } }
  const skirtTex = new THREE.CanvasTexture(kv); skirtTex.colorSpace = THREE.SRGBColorSpace; skirtTex.anisotropy = 4;
  const skirtMat = new THREE.MeshToonMaterial({ map: skirtTex, gradientMap: toon(HAIR).gradientMap, side: THREE.DoubleSide });
  const mesh = (geo, color, line, extra) => { const m = new THREE.Mesh(geo, color.isMaterial ? color : color === HAIR ? hairMat : toon(color, extra)); m.castShadow = true; return line ? outline(m, line) : m; };
  const bead = (r, color, sx = 1, sy = sx, sz = sx, line = .01, w = 18, h = 12) => scl(mesh(new THREE.SphereGeometry(r, w, h), color, line), sx, sy, sz);
  const DOUBLE = { side: THREE.DoubleSide };
  /** A lathe around y from [radius, y] points, centred on its own middle so the inked outline sits evenly round it. */
  const lathe = (pts, color, line, extra, shape) => {
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)).reverse(), 24);   // bottom to top: faces out
    if (shape) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = shape(Math.atan2(x, z), y); p.setXYZ(i, x * f, y, z * f); } g.computeVertexNormals(); }
    return mesh(g, color, line, extra);
  };
  /** A lock of hair: round at the root, pointed at the tip, hanging down from its pivot (y = 0 to -len). */
  const lock = (len, wid, color, flat = .5, line = .009) => {
    const prof = [[0, .02], [.55, -.05], [.9, -.16], [1, -.3], [.92, -.47], [.7, -.65], [.4, -.83], [.12, -.96], [0, -1]];
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * wid, y * len)).reverse(), 12);
    g.translate(0, len / 2, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * .62);   // strands only: the glossy ring is the cap's
    const m = scl(mesh(g, color, line), 1, 1, flat); m.position.y = -len / 2;
    return pivot().add(m);
  };
  const extruded = (shape, depth, color, line) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: depth * .35, bevelSize: depth * .35, bevelSegments: 1, curveSegments: 6 });
    g.center(); return mesh(g, color, line);
  };
  const starShape = (R, r) => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; i ? s.lineTo(q * Math.cos(a), q * Math.sin(a)) : s.moveTo(q * Math.cos(a), q * Math.sin(a)); } return s; };
  const heartShape = z => { const s = new THREE.Shape(); s.moveTo(0, -z); s.bezierCurveTo(-z * 1.1, -z * .25, -z * 1.05, z * .9, 0, z * .42); s.bezierCurveTo(z * 1.05, z * .9, z * 1.1, -z * .25, 0, -z); return s; };

  /* ── the face: eight expressions painted in one atlas (2 x 4 tiles of 512 x 256), drawn in degrees of the head ── */
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
  const c = cv.getContext('2d'), PHI = 56, TH0 = 64, TH1 = 128;                    // the decal spans +-56 deg across, 64..128 deg down
  const ell = (x, y, rx, ry, a0 = 0, a1 = Math.PI * 2) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, a0, a1); };
  const stroke = (col, w, pts) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0], pts[1]); c.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); c.stroke(); };
  function eyeOpen(x, y, side, look) {
    c.fillStyle = '#ffffff'; ell(x, y + .6, 10.4, 13.4); c.fill();
    const ix = x + look, iy = y + 1.4, g = c.createLinearGradient(0, iy - 12, 0, iy + 12);
    g.addColorStop(0, '#2f1a5c'); g.addColorStop(.42, '#7446d6'); g.addColorStop(.78, '#ad84ff'); g.addColorStop(1, '#eadcff');
    c.fillStyle = g; ell(ix, iy, 8.4, 12.2); c.fill(); c.strokeStyle = '#2a1650'; c.lineWidth = .8; c.stroke();
    c.fillStyle = 'rgba(28,12,58,.92)'; ell(ix, iy - 1.8, 3.9, 5.8); c.fill();
    c.fillStyle = 'rgba(255,236,255,.55)'; ell(ix, iy + 7.4, 5.4, 2.8); c.fill();
    c.fillStyle = INK; c.beginPath(); c.moveTo(x - 11.6, y - 5.5); c.quadraticCurveTo(x - 1, y - 18.6, x + 11.6, y - 6.5);   // the lash line, thick in the middle
    c.lineTo(x + side * 14.6, y - 10.4 + (side < 0 ? 4 : 0)); c.quadraticCurveTo(x + 1, y - 15.4, x - 11.6, y - 5.5); c.fill();
    stroke(INK, 1.6, [x + side * 10.6, y - 8, x + side * 14.4, y - 9.2, x + side * 16, y - 12.6]);   // a lash flick at the outer corner
    stroke('rgba(120,72,120,.45)', .55, [x - 8, y - 17.6, x + 1, y - 21.4, x + 9.6, y - 17.2]);      // the soft lid line above
    stroke('rgba(60,40,90,.55)', .6, [x - 5, y + 13.6, x, y + 14.6, x + 5, y + 13.4]);
    c.fillStyle = '#ffffff'; ell(ix - 3, iy - 5.4, 3.2, 4.3); c.fill(); ell(ix + 3.4, iy + 5, 1.6, 1.7); c.fill();
  }
  const eyeShut = (x, y, side) => { stroke(INK, 2, [x - 10, y + 1, x, y + 7.6, x + 10, y + 1]); stroke(INK, 1.3, [x + side * 9.5, y + 1.6, x + side * 12.4, y + 1, x + side * 13.6, y - 1.6]); };
  const eyeJoy = (x, y) => stroke(INK, 2.3, [x - 9.6, y + 5, x, y - 7.4, x + 9.6, y + 5]);
  function mouth(kind) {
    if (kind === 'smile') { stroke('#6b2b45', 1.05, [-3.4, 23.6, 0, 27, 3.4, 23.6]); return; }
    const w = kind === 'joy' ? 5.2 : 4.2, h = kind === 'joy' ? 6 : 4.8;
    c.fillStyle = '#8a2e4c'; ell(0, 22.6, w, h, 0, Math.PI); c.closePath(); c.fill();
    c.fillStyle = '#ff8fae'; ell(0, 22.6 + h * .62, w * .6, h * .3); c.fill();
    c.strokeStyle = '#5a1c33'; c.lineWidth = .6; ell(0, 22.6, w, h, 0, Math.PI); c.closePath(); c.stroke();
  }
  function blush(x, y) {
    const g = c.createRadialGradient(x, y, 0, x, y, 7.5); g.addColorStop(0, 'rgba(255,120,165,.62)'); g.addColorStop(1, 'rgba(255,120,165,0)');
    c.fillStyle = g; ell(x, y, 7.5, 4.6); c.fill();
    for (let i = 0; i < 3; i++) stroke('rgba(255,84,140,.75)', .55, [x - 3.4 + i * 2.6, y - 1.4, x - 4 + i * 2.6, y, x - 4.8 + i * 2.6, y + 1.6]);
  }
  const EX = 23.5, EY = 6.5;
  const FACES = [                                                     // [left eye, right eye, mouth, look]
    ['open', 'open', 'smile', 0], ['shut', 'shut', 'smile', 0], ['open', 'joy', 'open', 0], ['joy', 'joy', 'joy', 0],
    ['open', 'open', 'open', 0], ['shut', 'shut', 'open', 0], ['open', 'open', 'smile', -2.6], ['shut', 'shut', 'smile', 0]];
  FACES.forEach(([l, r, m, look], i) => {
    c.save(); c.translate((i % 2) * 512 + 256, Math.floor(i / 2) * 256 + (90 - TH0) * 256 / (TH1 - TH0)); c.scale(256 / PHI, 256 / (TH1 - TH0));
    blush(-35, 16.5); blush(35, 16.5);
    [[l, -EX, -1], [r, EX, 1]].forEach(([k, x, side]) => { c.save(); c.translate(x, EY); c.scale(1.12, 1.12); k === 'open' ? eyeOpen(0, 0, side, look) : k === 'joy' ? eyeJoy(0, 0) : eyeShut(0, 0, side); c.restore(); });
    mouth(m); c.restore();
  });
  const faceTex = new THREE.CanvasTexture(cv); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.repeat.set(.5, .25); faceTex.anisotropy = 4;
  const faceMat = new THREE.MeshToonMaterial({ map: faceTex, gradientMap: toon(SKIN).gradientMap, transparent: true, depthWrite: false, emissive: 0x222222, emissiveMap: faceTex, polygonOffset: true, polygonOffsetFactor: -2 });
  const FACE = { smile: 0, blink: 1, wink: 2, joy: 3, open: 4, openBlink: 5, look: 6, lookBlink: 7 };
  const blinking = T => (T % 3.3) < .13 || ((T + 1.3) % 7.7) < .12;
  const face = (name, T) => {
    let i = FACE[name];
    if (blinking(T)) i = name === 'open' ? 5 : name === 'look' ? 7 : name === 'smile' ? 1 : i;
    faceTex.offset.set((i % 2) * .5, 1 - (Math.floor(i / 2) + 1) * .25);
  };

  /* ── a sparkle for the wand's twinkles ── */
  const sv = document.createElement('canvas'); sv.width = sv.height = 64;
  { const s = sv.getContext('2d'), g = s.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    s.fillStyle = g; s.fillRect(0, 0, 64, 64); s.fillStyle = '#fff'; s.beginPath(); s.moveTo(32, 2); s.quadraticCurveTo(35, 29, 62, 32); s.quadraticCurveTo(35, 35, 32, 62); s.quadraticCurveTo(29, 35, 2, 32); s.quadraticCurveTo(29, 29, 32, 2); s.fill(); }
  const sparkTex = new THREE.CanvasTexture(sv); sparkTex.colorSpace = THREE.SRGBColorSpace;
  const sparkMats = ['#fff2a8', '#ffb3d9', '#ffffff'].map(color => new THREE.SpriteMaterial({ map: sparkTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));

  /* ── the body ── */
  const group = new THREE.Group(); group.name = 'kiko';
  const base = pivot(); group.add(base);                              // turns her whole, on the spot, about her feet
  const legs = [-1, 1].map(s => {
    const leg = pivot(s * .052, .27, 0);
    leg.add(at(capsule(.033, .17, SKIN, .008), 0, -.115, 0));
    leg.add(at(cyl(.038, .036, .1, WHITE, .007, 18), 0, -.17, 0));
    leg.add(rot(at(bead(.046, SHOE, 1, .62, 1.45, .008), 0, -.242, .016), 0, s * .12, 0));
    base.add(leg); return leg;
  });
  const [legL, legR] = legs;
  const body = pivot(0, .27, 0); base.add(body);                     // the hips: everything above the legs
  const skirt = pivot(0, .16, 0); body.add(skirt);                    // hung from the waist, so a scale flares the hem
  skirt.add(lathe([[0, .03], [.06, .026], [.085, 0], [.105, -.04], [.14, -.1], [.18, -.16], [.2, -.19]], skirtMat, .012, null, (a, y) => 1 + .075 * clamp(-y / .19) * Math.cos(a * 12)));
  skirt.add(lathe([[.13, -.12], [.16, -.165], [.19, -.2], [.196, -.214]], WHITE, .008, DOUBLE, (a, y) => 1 + .06 * Math.cos(a * 18) * clamp((-y - .17) / .04)));
  const chest = pivot(0, .16, 0); body.add(chest);
  chest.add(at(bead(.1, MINT, 1, 1.05, .82, .012, 22, 16), 0, .08, 0));
  [-1, 1].forEach(s => chest.add(rot(at(bead(.04, WHITE, 1.25, .45, .8, .007), s * .036, .155, .052), 0, 0, -s * .35)));
  const bow = pivot(0, .1, .086); chest.add(bow);
  [-1, 1].forEach(s => bow.add(rot(at(bead(.052, PINK, 1, .7, .5, .008), s * .05, .006, 0), 0, 0, s * .4)));
  bow.add(at(bead(.023, PINK2, 1, 1, .8, .007), 0, 0, .012));
  [-1, 1].forEach(s => chest.add(rot(at(bead(.046, PINK, 1, .66, .5, .008), s * .045, .02, -.092), 0, 0, s * .4)));   // the bow at her back
  const heart = pivot(0, .15, .19); heart.add(extruded(heartShape(.03), .014, PINK2, .006)); scl(heart, .001); chest.add(heart);

  // Arms hang from the shoulders (elbow, then hand, straight down at rest). Viewed from the front armL is on the left
  // (-x): a negative z turn swings it out and up; armR is the mirror. Poses mostly place the hands by reach() (two-bone IK).
  const L1 = .08, L2 = .11, DOWN = V(0, -1, 0);
  const arms = [-1, 1].map(s => {
    const arm = pivot(s * .098, .125, 0), elbow = pivot(0, -L1, 0);
    arm.add(at(bead(.05, WHITE, 1, .9, 1, .008), s * .008, -.016, 0));
    elbow.add(at(capsule(.029, .055, SKIN, .006), 0, -.045, 0), at(bead(.033, SKIN, 1, 1, 1, .007), 0, -L2, 0));
    arm.add(elbow); chest.add(arm); rot(arm, 0, 0, s * .38);
    return { arm, elbow, s };
  });
  const [armL, armR] = arms;
  const wand = pivot(0, -L2, 0); armR.elbow.add(wand); rot(wand, 1.2, 0, 0);
  wand.add(at(cyl(.008, .008, .26, WHITE, .005, 10), 0, .11, 0));
  const tip = pivot(0, .26, 0); wand.add(tip);
  tip.add(extruded(starShape(.052, .024), .016, GOLD, .006));
  const twinkles = [[.06, .045, .02], [-.05, .03, .03], [.02, -.06, .02]].map(([x, y, z], i) => { const sp = new THREE.Sprite(sparkMats[i]); at(sp, x, y, z); scl(sp, .001); tip.add(sp); return sp; });

  /* ── the head: skin, the painted face, a cap of hair, chunky bangs, side locks and the twin tails ── */
  const head = pivot(0, .175, 0); chest.add(head);
  const skull = at(ball(.22, SKIN, 1.08, .94, 1, .014), 0, .15, 0); head.add(skull);
  const decal = new THREE.Mesh(new THREE.SphereGeometry(.2235, 24, 14, Math.PI / 2 - PHI * Math.PI / 180, 2 * PHI * Math.PI / 180, TH0 * Math.PI / 180, (TH1 - TH0) * Math.PI / 180), faceMat);
  decal.renderOrder = 1; skull.add(decal);
  decal.geometry.addEventListener('dispose', () => { faceMat.dispose(); faceTex.dispose(); hairMat.dispose(); hairTex.dispose(); skirtMat.dispose(); skirtTex.dispose(); sparkMats.forEach(m => m.dispose()); sparkTex.dispose(); });
  const cap = at(ball(.238, HAIR, 1.07, 1, 1.04, .014), 0, .18, -.045); cap.material = hairMat; head.add(cap);
  [[-.13, .25, .14, .34, .12], [-.055, .29, .17, .14, .14], [.03, .295, .175, -.1, .13], [.105, .265, .155, -.3, .12], [0, .3, .16, .02, .09]].forEach(([x, y, z, rz, len], i) => {
    const b = rot(at(lock(len, .052 + (i === 4 ? -.01 : 0), HAIR, .45, .006), x, y, z), -.42, 0, rz); head.add(b);
  });
  [-1, 1].forEach(s => head.add(rot(at(lock(.26, .064, HAIR, .55, .006), s * .212, .235, .045), -.12, 0, -s * .08)));   // side locks before the ears
  [-1, 1].forEach(s => head.add(rot(at(lock(.17, .055, HAIR, .5, .006), s * .085, .11, -.2), .5, 0, s * .2)));       // two at the nape
  const tails = [-1, 1].map(s => {
    const root = pivot(s * .2, .27, -.07), mid = pivot(0, -.2, 0);
    root.add(lock(.23, .085, HAIR, .78, .008)); mid.add(rot(lock(.2, .068, HAIR, .78, .007), 0, 0, -s * .12));
    root.add(mid); rot(mid, 0, 0, -s * .55);
    const clip = rot(at(extruded(starShape(.045, .021), .014, GOLD, .006), s * .015, .01, .02), 0, s * 1.15, 0); root.add(clip);
    head.add(root); rot(root, .12, 0, s * .7);
    return { root, mid, s, p: V(), v: V(), a: V(), th: [0, 0], vth: [0, 0], th2: [0, 0], vth2: [0, 0] };
  });

  const parts = { base, body, skirt, chest, head, bow, heart, wand, tip, legL, legR, armL: armL.arm, armR: armR.arm, elbowL: armL.elbow, elbowR: armR.elbow };
  tails.forEach((t, i) => { parts[`tail${i}`] = t.root; parts[`tailMid${i}`] = t.mid; });
  twinkles.forEach((t, i) => { parts[`twinkle${i}`] = t; });

  /* ── helpers the poses share ── */
  const _a = V(), _b = V(), _n = V(), _p = V(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4();
  /** Puts a hand at a point in the chest's space (two-bone IK); the elbow bends towards `pole`. */
  function reach(side, x, y, z, px, py, pz) {
    const { arm, elbow } = side < 0 ? armL : armR;
    _a.set(x, y, z).sub(arm.position); const d = clamp(_a.length(), .03, L1 + L2 - .002); _n.copy(_a).normalize();
    const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    _p.set(px, py, pz).addScaledVector(_n, -_n.dot(_p.set(px, py, pz))).normalize();
    _b.copy(_n).multiplyScalar(Math.cos(A)).addScaledVector(_p, Math.sin(A));            // the upper arm
    arm.quaternion.setFromUnitVectors(DOWN, _b);
    _a.set(x, y, z).sub(arm.position).addScaledVector(_b, -L1).normalize().applyQuaternion(_q.copy(arm.quaternion).invert());
    elbow.quaternion.setFromUnitVectors(DOWN, _a);
  }
  /** Points the wand along a direction in the chest's space, its star turned to the front. */
  function aimWand(x, y, z) {
    _b.set(x, y, z).normalize(); _a.set(0, 0, 1).addScaledVector(_b, -_b.z).normalize(); _n.crossVectors(_b, _a);
    _m.makeBasis(_n, _b, _a); _q2.setFromRotationMatrix(_m);
    _q.copy(armR.arm.quaternion).multiply(armR.elbow.quaternion).invert(); wand.quaternion.copy(_q.multiply(_q2));
  }
  const H = (k, a, b) => ease.inOut(seg(k, a, b));
  const lerp3 = (p, q, u) => p.map((v, i) => lerp(v, q[i], u));
  const hands = (L, R, u = 1, L2_ = null, R2_ = null) => {          // [x, y, z, poleX, poleY, poleZ] each, optionally blended to a second pair
    const l = L2_ ? lerp3(L, L2_, u) : L, r = R2_ ? lerp3(R, R2_, u) : R; reach(-1, ...l); reach(1, ...r);
  };
  const REST_L = [-.165, -.055, .02, -.4, 0, -1], REST_R = [.165, -.055, .03, .4, 0, -1];
  const HEART_L = [-.026, .09, .152, -1, -.7, -.3], HEART_R = [.026, .09, .152, 1, -.7, -.3];
  const twinkle = (T, amt) => twinkles.forEach((sp, i) => sp.scale.setScalar(Math.max(.001, amt * .085 * (.55 + .45 * Math.sin(T * 13 + i * 2.1)))));
  const showHeart = (u, T) => heart.scale.setScalar(Math.max(.001, u * (1 + .12 * Math.max(0, Math.sin(T * Math.PI * 4)))));
  const stage = () => { const actor = group.parent && group.parent.parent; return actor && actor.parent ? actor : null; };
  /** Turns her whole so that, whatever heading the act gives her, she ends up `net` radians from facing the phone. */
  const faceNet = net => { const a = stage(); base.rotation.y = net - (a ? a.rotation.y : 0); };

  /* ── secondary motion: the twin tails and the skirt follow her head's real path across the card ── */
  const sec = { T: -1, heading: 0, flare: 0, sway: V() };
  const _s = V(), _hp = V(), _hq = new THREE.Quaternion(), _hqi = new THREE.Quaternion(), _v = V(), _acc = V(), _g = V(), _inv = new THREE.Matrix4(), _hm = new THREE.Matrix4();
  function secondary(T) {
    const actor = stage(); if (!actor) return;
    head.updateWorldMatrix(true, false);
    _hm.multiplyMatrices(_inv.copy(actor.parent.matrixWorld).invert(), head.matrixWorld); _hm.decompose(_hp, _hq, _s); _hqi.copy(_hq).invert();
    const dt = T - sec.T, live = dt > 1e-4 && dt < .1; sec.T = T;
    _g.copy(DOWN).applyQuaternion(_hqi);
    const fwd = _a.set(0, 0, 1).applyQuaternion(_hq), heading = Math.atan2(fwd.x, fwd.z);
    let spinRate = 0;
    if (live) { let d = heading - sec.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); spinRate = d / dt; }
    sec.heading = heading;
    for (const t of tails) {
      _p.copy(t.root.position).applyMatrix4(_hm);
      if (live) { _v.copy(_p).sub(t.p).divideScalar(dt); _acc.copy(_v).sub(t.v).divideScalar(dt).clampLength(0, 9); t.a.lerp(_acc, .45); t.v.copy(_v); }
      else { t.v.set(0, 0, 0); t.a.set(0, 0, 0); }
      t.p.copy(_p);
      const vl = _v.copy(t.v).applyQuaternion(_hqi), al = _acc.copy(t.a).applyQuaternion(_hqi);
      const dx = clamp(-(1.25 * vl.x + .1 * al.x) + .9 * _g.x, -1.2, 1.2), dz = clamp(-(1.25 * vl.z + .1 * al.z) + .9 * _g.z, -1.3, 1.3);
      const lift = clamp(-.07 * al.y, -.35, .45);
      const target = [-dz, dx + t.s * lift];                          // [about x, about z]
      if (live) for (let i = 0; i < 2; i++) {
        t.vth[i] += (110 * (target[i] - t.th[i]) - 9 * t.vth[i]) * dt; t.th[i] += t.vth[i] * dt;
        t.vth2[i] += (70 * (t.th[i] * .55 - t.th2[i]) - 7 * t.vth2[i]) * dt; t.th2[i] += t.vth2[i] * dt;
      }
      t.root.rotation.x += t.th[0]; t.root.rotation.z += t.th[1]; t.mid.rotation.x += t.th2[0]; t.mid.rotation.z += t.th2[1];
    }
    const vb = _v.copy(tails[0].v).add(tails[1].v).multiplyScalar(.5).applyQuaternion(_hqi);
    if (live) { sec.flare += (clamp(spinRate * spinRate * .0042, 0, .42) - sec.flare) * Math.min(1, dt * 9); sec.sway.lerp(_a.set(clamp(vb.z * .3, -.25, .25), 0, clamp(-vb.x * .3, -.25, .25)), Math.min(1, dt * 8)); }
    skirt.scale.x *= 1 + sec.flare; skirt.scale.z *= 1 + sec.flare; skirt.scale.y *= 1 - .45 * sec.flare;
    skirt.rotation.x += sec.sway.x; skirt.rotation.z += sec.sway.z;
  }

  return {
    group, parts, sparkle: '#ffe27a', confetti: ['#bb96f0', '#7fdcbf', '#ff7fb2', '#ffd24d', '#ffffff', '#9a74dc'],
    pose: {
      idle({ T }) {                                                  // sways on the spot, blinks; the tails settle
        faceNet(-.12); const sw = wave(T, .55);
        body.rotation.z = .045 * sw; head.rotation.z = -.07 * sw + .05; chest.rotation.y = .04 * wave(T, .3);
        hands([-.17, -.05 + .01 * sw, .03, -.4, 0, -1], [.15, -.03, .07, .4, 0, -1]); aimWand(.35, .55, .75);
        face('smile', T); secondary(T);
      },
      pop({ t, T }) {                                                // crouched in the card, then "ta-da!" with the wand up
        const up = ease.back(seg(t, .3, .62)), crouch = Math.sin(Math.PI * seg(t, 0, .4));
        body.scale.set(1 + .06 * crouch, 1 - .1 * crouch, 1 + .06 * crouch);
        hands([-.07, .02, .1, -1, -.5, 0], [.07, .02, .1, 1, -.5, 0], up, [-.25, .15, .1, -.5, -1, -.4], [.19, .25, .12, 1, -.4, -.2]);
        aimWand(lerp(.8, .3, up), 1, lerp(.5, .15, up));
        legL.rotation.x = .75 * up; legL.rotation.z = -.1 * up; head.rotation.z = -.14 * up; body.rotation.z = .05 * up;
        twinkle(T, seg(t, .35, .5)); face(t < .3 ? 'blink' : 'open', T); secondary(T);
      },
      hello({ t, T }) {                                              // a wave with the free hand, head tilted, a wink
        const u = H(t, 0, .25);
        hands(REST_L, REST_R, u, [-.29 + .04 * Math.sin(t * 15), .25, .13, -1, -.8, 0], [.14, .0, .12, 1, -.4, -.4]);
        aimWand(.55, 1, .35);
        head.rotation.z = .1 * u; head.rotation.y = -.06 * u; body.rotation.z = -.05 * u; base.position.y = .012 * Math.abs(Math.sin(t * 7.5));
        face(t > .2 ? 'wink' : 'smile', T); secondary(T);
      },
      run({ phase, T }) {                                            // a light skipping run: arms swing, the tails stream back
        const a = phase * Math.PI * 2, s = Math.sin(a);
        legL.rotation.x = -.75 * s; legR.rotation.x = .75 * s; base.position.y = .045 * Math.abs(Math.sin(a));
        hands([-.155, .02 - .02 * s, -.07 * s + .03, -.3, -.2, -1], [.155, .02 + .02 * s, .07 * s + .03, .3, -.2, -1]);
        aimWand(.15, .7, .7); chest.rotation.y = -.12 * s; head.rotation.y = .06 * s; head.rotation.x = .05;
        face('open', T); secondary(T);
      },
      dance({ t, T }) {                                              // step-touch with heart hands, arms waving overhead, a point to the sky
        const beat = t * 2, sw = Math.sin(Math.PI * beat);           // 120 bpm
        const stepX = .06 * Math.sin(Math.PI * (beat - .5)) * (1 - H(t, 1.6, 1.9));
        base.position.x = stepX; base.position.y = .02 * Math.abs(Math.sin(Math.PI * beat)) * (1 - H(t, 2.6, 2.8));
        legL.rotation.z = -.22 * Math.max(0, -sw) * (1 - H(t, 2.5, 2.7)); legR.rotation.z = .22 * Math.max(0, sw) * (1 - H(t, 2.5, 2.7));
        body.rotation.z = -.07 * sw; head.rotation.z = .14 * sw * (1 - H(t, 2.5, 2.7));
        const wv = Math.sin(Math.PI * (t - 1.6) * 2.2), uA = H(t, 1.5, 1.75), uB = H(t, 2.45, 2.7);
        const waveL = [-.2 + .07 * wv, .21, .13, -1, 0, -.4], waveR = [.2 + .07 * wv, .21, .13, 1, 0, -.4];
        if (t < 2.45) hands(HEART_L, HEART_R, uA, waveL, waveR);
        else hands(waveL, waveR, uB, [-.125, .005, .03, -1, .2, -.2], [.2, .27, .1, 1, 0, -.3]);
        aimWand(lerp(lerp(1, .3 + .35 * wv, uA), .25, uB), lerp(.15, 1, uA), lerp(.4, .15, uA));
        chest.rotation.z = .12 * wv * uA * (1 - uB); body.rotation.z += .06 * wv * uA * (1 - uB);
        legL.rotation.x = -.5 * uB; legL.rotation.z -= .12 * uB; head.rotation.x = -.14 * uB; head.rotation.z += -.1 * uB;
        showHeart(1 - uA, T); twinkle(T, uB);
        face(t < 1.6 ? 'joy' : t < 2.5 ? 'open' : 'wink', T); secondary(T);
      },
      trick({ k, T }) {                                              // a pirouette: wand up, a foot to the knee; then a bow to the phone
        const spin = H(k, .1, .2) * (1 - H(k, .74, .84)), fin = H(k, .76, .9);
        const SPIN_L = [-.03, .04, .16, -1, -.3, -.2], SPIN_R = [.19, .26, .1, 1, -.3, -.3];
        hands(REST_L, REST_R, spin, SPIN_L, SPIN_R);
        if (fin > 0) hands(SPIN_L, SPIN_R, fin, [-.21, .1, .08, -.6, -1, -.3], [.18, .1, .13, .6, -1, -.4]);
        aimWand(lerp(.15, .7, fin), lerp(1, .45, fin), lerp(.05, .6, fin));
        legL.rotation.x = -.85 * spin; legL.rotation.z = .3 * spin; legL.position.y = .27 + .03 * spin;
        legR.rotation.x = .4 * fin; legR.rotation.z = .12 * fin;
        head.rotation.x = -.08 * spin; head.rotation.z = -.15 * fin; body.rotation.z = .06 * fin;
        twinkle(T, Math.max(spin * .6, seg(k, .78, .86))); face(fin > .4 ? 'wink' : spin > .5 ? 'joy' : 'open', T); secondary(T);
      },
      cheer({ t, T }) {                                              // both arms up, the wand waving; heels kick up in the hops
        const u = H(t, 0, .2), w = Math.sin(t * 14), actor = stage(), air = actor ? clamp(actor.position.y / .08) : 0;
        hands(REST_L, REST_R, u, [-.2, .23 + .02 * w, .12, -1, -.2, -.4], [.2, .24 - .02 * w, .12, 1, -.2, -.4]);
        aimWand(.3 + .35 * w, 1, .15);
        legL.rotation.x = .7 * air; legR.rotation.x = .5 * air; head.rotation.z = .08 * Math.sin(t * 7);
        twinkle(T, u); face('joy', T); secondary(T);
      },
      present({ t, T }) {                                            // both hands to the letter on her left, then heart hands
        const u = H(t, 0, .45), h = H(t, 1, 1.35);
        faceNet(lerp(-.35 * u, -.12, h));
        if (h <= 0) hands(REST_L, REST_R, u, [-.25, .14, .1, -.4, -1, -.3], [-.06, .13, .17, .6, -1, -.2]);
        else hands([-.25, .14, .1, -.4, -1, -.3], [-.06, .13, .17, .6, -1, -.2], h, HEART_L, HEART_R);
        aimWand(lerp(-.7, 1, h), lerp(.45, .15, h), lerp(.5, .4, h));
        head.rotation.y = -.5 * u * (1 - h); head.rotation.x = -.12 * u * (1 - h); head.rotation.z = .12 * h; body.rotation.z = .04 * u;
        showHeart(h, T); face(h > .5 ? 'joy' : u > .3 ? 'look' : 'smile', T); secondary(T);
      }
    },
    trick: {
      seconds: 2,
      move(k) {                                                      // a little wind-up, two full turns with a lift, a soft landing
        const s = H(k, .1, .76), lift = Math.sin(Math.PI * seg(k, .1, .76));
        const wind = Math.sin(Math.PI * seg(k, 0, .14)), land = Math.sin(Math.PI * seg(k, .74, .88));
        return { yaw: -.35 * H(k, 0, .1) * (1 - s) + 4 * Math.PI * s, y: .03 * lift, sy: 1 - .08 * wind - .1 * land + .04 * lift, sx: 1 + .05 * wind + .06 * land };
      }
    }
  };
};
