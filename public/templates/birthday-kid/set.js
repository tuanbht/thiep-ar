/* Sinh nhật Bé: the party, built for story.js (template.json "story": ["set.js", "story.js"]).
   A playroom corner for a child's birthday: a wooden floor with a soft oval rug, a toy railway round the rug's edge with a
   wooden engine and four open wagons (a photo standing in each, turned to the phone), a painted wall at the back (candy
   stripes, a rainbow, two windows onto a sunny garden), bunting between two candy poles with four photo pennants, a play
   tent with balloons, letter blocks spelling BÉ YÊU, a beach ball, the little party table with the cake hidden under its
   box, the pile of presents (two of them open by themselves) with the jack-in-the-box on a step in front of it, two
   confetti cannons at the front corners, the star that holds the first photo and the banner.
   window.NM_KID_SET(kit) builds it all and returns what the story moves. Units: card widths, +y up, the act faces +z (the
   card's bottom edge); the floor's top is BASE. */
window.NM_KID_SET = kit => {
  const { THREE, stage, keep } = kit;
  const TAU = Math.PI * 2, BASE = .01;
  const TRACK = { cz: -.035, rx: .415, rz: .24 };                    // the railway's centre line: an ellipse round the party
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const CANDY = ['#ff6f91', '#ffd27a', '#7fd6b8', '#7cc4f0', '#b49ad8', '#ff9f6b'];
  const rounded = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  const starPath = (c, x, y, R, r = R * .5) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); };

  /* ── materials and shapes ── */
  const mats = new Map();
  const mat = (color, o = {}) => {
    const key = `${color}|${o.r ?? .7}|${o.m ?? 0}|${o.e ?? ''}|${o.ei ?? ''}|${o.side ?? ''}`;
    if (!mats.has(key)) {
      const m = keep(new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .7, metalness: o.m ?? 0, ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}), ...(o.side ? { side: o.side } : {}) }));
      if (o.m) { m.envMap = kit.env; m.envMapIntensity = .9; }
      mats.set(key, m);
    }
    return mats.get(key);
  };
  const texMat = (t, o = {}) => keep(new THREE.MeshStandardMaterial({ map: t, roughness: o.r ?? .75, ...(o.glow ? { emissive: 0xffffff, emissiveMap: t, emissiveIntensity: o.glow } : {}),
    ...(o.side ? { side: o.side } : {}), ...(o.cut ? { transparent: true, alphaTest: o.cut } : {}) }));
  const softGeo = new Map();
  /** a box with soft, rounded edges, like a wooden toy */
  function soft(w, h, d, r = Math.min(w, h, d) * .22) {
    const key = [w, h, d, r].map(v => v.toFixed(4)).join();
    if (!softGeo.has(key)) {
      const rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4), iw = w - 2 * rr, ih = h - 2 * rr, k = Math.min(iw, ih) * .15;
      const s = new THREE.Shape(), x0 = -iw / 2, y0 = -ih / 2;
      s.moveTo(x0 + k, y0); s.lineTo(x0 + iw - k, y0); s.quadraticCurveTo(x0 + iw, y0, x0 + iw, y0 + k); s.lineTo(x0 + iw, y0 + ih - k);
      s.quadraticCurveTo(x0 + iw, y0 + ih, x0 + iw - k, y0 + ih); s.lineTo(x0 + k, y0 + ih); s.quadraticCurveTo(x0, y0 + ih, x0, y0 + ih - k);
      s.lineTo(x0, y0 + k); s.quadraticCurveTo(x0, y0, x0 + k, y0);
      const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-4, d - 2 * rr), bevelEnabled: true, bevelThickness: rr, bevelSize: rr, bevelSegments: 3, curveSegments: 4 });
      g.center(); softGeo.set(key, keep(g));
    }
    return softGeo.get(key);
  }
  const mesh = (geo, m, at = [0, 0, 0], shadow = true) => {
    const x = new THREE.Mesh(geo, m); x.position.set(...at); x.castShadow = shadow; x.receiveShadow = true; return x;
  };
  const box = (w, h, d, m, at) => mesh(keep(new THREE.BoxGeometry(w, h, d)), m, at);
  const cyl = (rt, rb, h, m, at, seg = 16) => mesh(keep(new THREE.CylinderGeometry(rt, rb, h, seg)), m, at);
  const ball = (r, m, at, seg = 14) => mesh(keep(new THREE.SphereGeometry(r, seg, Math.max(8, seg * .75 | 0))), m, at, r >= .007);   // a bead casts no shadow worth drawing
  const tex = (w, h, draw, o = {}) => {
    const t = kit.canvasTexture(w, h, draw);
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.repeat); }
    return t;
  };
  /** a stick from a to b (stage points) */
  function stick(a, b, r, m) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), x = cyl(r, r, A.distanceTo(B), m, [0, 0, 0], 8); x.castShadow = r >= .002;
    x.position.copy(A).add(B).multiplyScalar(.5); x.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return x;
  }
  /** a bow of ribbon: two loops and a knot, w across */
  function bow(w, color) {
    const g = new THREE.Group(), m = mat(color, { r: .5 });
    for (const s of [-1, 1]) {
      const loop = mesh(keep(new THREE.TorusGeometry(w * .22, w * .07, 6, 14)), m, [s * w * .2, w * .1, 0]);
      loop.rotation.set(0, Math.PI / 2, s * .5); loop.scale.set(1, .7, 1); g.add(loop);
    }
    g.add(ball(w * .1, m, [0, w * .04, 0], 8));
    return g;
  }

  /* ── the floor and the rug ── */
  const planks = tex(512, 512, (c, w, h) => {
    c.fillStyle = '#f5dfc6'; c.fillRect(0, 0, w, h);
    for (let y = 0, i = 0; y < h; y += 32, i++) {
      c.fillStyle = i % 2 ? '#f0d4b6' : '#f7e4ce'; c.fillRect(0, y, w, 30);
      c.fillStyle = 'rgba(150,100,60,.25)'; c.fillRect(0, y + 30, w, 2); c.fillRect((i * 173) % 420 + 30, y, 2, 30); c.fillRect((i * 97 + 260) % 500, y, 2, 30);
    }
  }, { repeat: [2, 1.25] });
  const edge = mat('#f2a7bd', { r: .6 });
  stage.add(box(1, BASE, .625, [edge, edge, texMat(planks, { r: .8 }), edge, edge, edge], [0, BASE / 2, 0]));
  const rugTex = tex(512, 512, (c, w) => {                           // a round soft rug: scallops, a dotted band, polka dots
    const R = w / 2;
    c.fillStyle = '#f39ab6'; for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; c.beginPath(); c.arc(R + Math.cos(a) * R * .93, R + Math.sin(a) * R * .93, R * .075, 0, TAU); c.fill(); }
    c.beginPath(); c.arc(R, R, R * .93, 0, TAU); c.fill();
    c.fillStyle = '#fff4e6'; c.beginPath(); c.arc(R, R, R * .84, 0, TAU); c.fill();
    c.fillStyle = '#ffd27a'; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; c.beginPath(); c.arc(R + Math.cos(a) * R * .79, R + Math.sin(a) * R * .79, 5, 0, TAU); c.fill(); }
    c.fillStyle = '#fbd3df'; c.beginPath(); c.arc(R, R, R * .73, 0, TAU); c.fill();
    for (let i = 0; i < 70; i++) { const a = i * 2.4, d = Math.sqrt((i + .5) / 70) * R * .68; c.fillStyle = CANDY[i % CANDY.length]; c.globalAlpha = .55; c.beginPath(); c.arc(R + Math.cos(a) * d, R + Math.sin(a) * d, 7, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
  });
  const rug = mesh(keep(new THREE.CircleGeometry(1, 72)), texMat(rugTex, { r: 1, cut: .5 }), [0, BASE + .0008, TRACK.cz + .005], false);
  rug.rotation.x = -Math.PI / 2; rug.scale.set(.475, .268, 1); stage.add(rug);

  /* ── the railway: an ellipse measured by its length, so a train runs it at an even pace ── */
  const N = 1024, cum = new Float64Array(N + 1);
  const ell = th => [-TRACK.rx * Math.sin(th), TRACK.cz - TRACK.rz * Math.cos(th)];   // th 0: the back's middle; it goes left first
  for (let i = 1; i <= N; i++) { const a = ell((i - 1) / N * TAU), b = ell(i / N * TAU); cum[i] = cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]); }
  const L = cum[N];
  /** the point s along the line, and the way it runs there */
  function along(s) {
    s = ((s % L) + L) % L;
    let lo = 0, hi = N;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    const th = (lo + (s - cum[lo]) / (cum[hi] - cum[lo])) / N * TAU, [x, z] = ell(th);
    const dx = -TRACK.rx * Math.cos(th), dz = TRACK.rz * Math.sin(th), k = Math.hypot(dx, dz);
    return { x, z, dx: dx / k, dz: dz / k };
  }
  const nTies = 96, ties = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(.046, .004, .011)), mat('#ffffff', { r: .75 }), nTies);
  const o3 = new THREE.Object3D(), tieColors = ['#e9c9a3', '#d9b086', '#efd5b4'].map(c => new THREE.Color(c));
  for (let i = 0; i < nTies; i++) {
    const p = along(i / nTies * L); o3.position.set(p.x, BASE + .003, p.z); o3.rotation.set(0, Math.atan2(p.dx, p.dz), 0); o3.updateMatrix();
    ties.setMatrixAt(i, o3.matrix); ties.setColorAt(i, tieColors[i % 3]);
  }
  ties.receiveShadow = true; ties.castShadow = true; stage.add(ties);
  for (const side of [-1, 1]) {
    const pts = Array.from({ length: 220 }, (_, i) => { const p = along(i / 220 * L); return new THREE.Vector3(p.x + p.dz * side * .012, BASE + .0065, p.z - p.dx * side * .012); });
    stage.add(mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 260, .0019, 5, true)), mat('#c9c3d6', { r: .35, m: .6 }), [0, 0, 0], false));
  }

  /* ── the wall at the back: candy stripes, a rainbow, two windows onto a sunny garden ── */
  const wall = kit.backdrop((c, w, h) => {
    for (let x = 0, i = 0; x < w; x += 28, i++) { c.fillStyle = i % 2 ? '#fde3ec' : '#fbd2df'; c.fillRect(x, 0, 28, h); }
    c.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 90; i++) { const x = (i * 211) % w, y = (i * 97) % (h * .74); starPath(c, x, y, 6, 2.6); c.fill(); }
    const cx = w * .5, cy = h * .66, bands = ['#ff9fb2', '#ffc58f', '#ffe48f', '#b8e6b0', '#a9d4f5', '#cdb6ee'];   // the rainbow
    bands.forEach((col, i) => { c.strokeStyle = col; c.lineWidth = w * .028; c.beginPath(); c.arc(cx, cy, w * (.29 - i * .027), Math.PI, TAU); c.stroke(); });
    const cloud = (x, y, s) => { c.fillStyle = '#ffffff'; for (const [dx, dy, r] of [[-1, .1, .55], [0, -.25, .7], [1, .05, .6], [.45, .25, .5], [-.5, .3, .5]]) { c.beginPath(); c.arc(x + dx * s * .6, y + dy * s * .6, r * s * .6, 0, TAU); c.fill(); } };
    cloud(cx - w * .21, cy - 6, w * .05); cloud(cx + w * .21, cy - 6, w * .05);
    for (const [wx, sun] of [[w * .12, true], [w * .88, false]]) {                 // windows: an arched frame on a garden
      const ww = w * .15, wh = h * .4, wy = h * .3;
      c.save(); c.beginPath(); c.moveTo(wx - ww / 2, wy + wh); c.lineTo(wx - ww / 2, wy + ww / 2); c.arc(wx, wy + ww / 2, ww / 2, Math.PI, TAU); c.lineTo(wx + ww / 2, wy + wh); c.closePath(); c.clip();
      const sky = c.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#8fd0f5'); sky.addColorStop(1, '#d9f1ff'); c.fillStyle = sky; c.fillRect(wx - ww, wy - 10, ww * 2, wh + 20);
      if (sun) { c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(wx + ww * .18, wy + ww * .45, ww * .16, 0, TAU); c.fill(); }
      cloud(wx - ww * .15, wy + wh * .35, ww * .22);
      c.fillStyle = '#9fdc8f'; c.beginPath(); c.ellipse(wx - ww * .2, wy + wh, ww * .7, wh * .28, 0, 0, TAU); c.fill();
      c.fillStyle = '#7cc47a'; c.beginPath(); c.ellipse(wx + ww * .35, wy + wh * 1.02, ww * .6, wh * .22, 0, 0, TAU); c.fill();
      c.fillStyle = '#8b5e3c'; c.fillRect(wx + (sun ? -ww * .25 : ww * .2), wy + wh * .55, 6, wh * .3);
      c.fillStyle = '#5fb36a'; c.beginPath(); c.arc(wx + (sun ? -ww * .25 : ww * .2) + 3, wy + wh * .52, ww * .16, 0, TAU); c.fill();
      c.restore();
      c.strokeStyle = '#ffffff'; c.lineWidth = 9; c.beginPath(); c.moveTo(wx - ww / 2, wy + wh); c.lineTo(wx - ww / 2, wy + ww / 2); c.arc(wx, wy + ww / 2, ww / 2, Math.PI, TAU); c.lineTo(wx + ww / 2, wy + wh); c.closePath(); c.stroke();
      c.lineWidth = 6; c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx, wy + wh); c.moveTo(wx - ww / 2, wy + wh * .58); c.lineTo(wx + ww / 2, wy + wh * .58); c.stroke();
      c.fillStyle = '#ffffff'; rounded(c, wx - ww * .62, wy + wh - 4, ww * 1.24, 14, 5); c.fill();
    }
    c.fillStyle = '#fff4e6'; c.fillRect(0, h * .8, w, h * .2);                     // the wainscot, its rail and panels
    c.fillStyle = '#f2c7a6'; c.fillRect(0, h * .8 - 7, w, 9);
    c.strokeStyle = 'rgba(217,87,122,.35)'; c.lineWidth = 3; for (let x = 18; x < w - 40; x += 74) { rounded(c, x, h * .83, 58, h * .13, 8); c.stroke(); }
    c.fillStyle = '#f39ab6'; c.fillRect(0, h - 10, w, 10);
  }, { width: 1.1, height: .62, curve: .07, z: -.31 });
  stage.add(wall);

  /* ── bunting between two candy poles: flags that pop up one by one, and four photo pennants ── */
  const candyStripes = tex(64, 64, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff6f91';
    for (let k = -2; k < 4; k++) { c.beginPath(); c.moveTo(0, k * 32); c.lineTo(w, k * 32 + 32); c.lineTo(w, k * 32 + 48); c.lineTo(0, k * 32 + 16); c.fill(); }
  }, { repeat: [1, 9] });
  const POLE = { x: .44, z: -.245, top: .49 };   // high enough for the engine's sign to pass under the pennants
  for (const s of [-1, 1]) {
    stage.add(cyl(.0055, .0055, POLE.top - BASE, texMat(candyStripes, { r: .4 }), [s * POLE.x, BASE + (POLE.top - BASE) / 2, POLE.z], 12));
    stage.add(cyl(.02, .024, .008, mat('#7cc4f0', { r: .5 }), [s * POLE.x, BASE + .004, POLE.z], 18), ball(.011, mat('#ffd27a', { r: .3, m: .4 }), [s * POLE.x, POLE.top + .006, POLE.z]));
  }
  const SAG = .085;
  const stringAt = x => { const t = (x + POLE.x) / (2 * POLE.x); return POLE.top - .006 - SAG * 4 * t * (1 - t); };
  stage.add(mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 21 }, (_, i) => { const x = -POLE.x + i / 20 * 2 * POLE.x; return new THREE.Vector3(x, stringAt(x), POLE.z); })), 60, .0014, 4)), mat('#3b2a4a', { r: .6 }), [0, 0, 0], false));
  const flagGeo = (() => {                                            // a pennant hanging from its top edge: u/v cover the triangle
    const g = new THREE.BufferGeometry(), w = .042, h = .05;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, 0, 0, w / 2, 0, 0, 0, -h, 0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, .5, 0], 2));
    return keep(g);
  })();
  const flagMats = CANDY.map((col, i) => texMat(tex(128, 128, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.85)';
    if (i % 3 === 0) { starPath(c, w / 2, h * .3, 18, 8); c.fill(); }
    else if (i % 3 === 1) for (const [x, y] of [[.36, .14], [.64, .14], [.5, .38]]) { c.beginPath(); c.arc(w * x, h * y, 8, 0, TAU); c.fill(); }
    else { kit.heartPath(c, w / 2, h * .28, 34); c.fill(); }
    c.strokeStyle = 'rgba(59,42,74,.5)'; c.lineWidth = 5; c.beginPath(); c.moveTo(2, 2); c.lineTo(w - 2, 2); c.lineTo(w / 2, h - 2); c.closePath(); c.stroke();
  }), { r: .85, side: THREE.DoubleSide }));
  const PENNANTS = [-.3, -.105, .105, .3], PENNANT_W = .1;
  const pennants = PENNANTS.map((x, i) => {
    const ph = kit.photo({ frame: 'white', width: PENNANT_W, aspect: 1, slot: [1, 4, 7, 10][i], of: 11, glow: .4 });
    const hang = new THREE.Group(); hang.position.set(x, stringAt(x), POLE.z + .004); stage.add(hang);
    const swing = new THREE.Group(); hang.add(swing);
    ph.root.position.y = -ph.height / 2 - .003; swing.add(ph.root);
    for (const px of [-.03, .03]) swing.add(box(.006, .014, .006, mat('#e2b98c', { r: .6 }), [px, -.004, .004]));
    return { hang, swing, photo: ph, x };
  });
  const flags = [];
  const gaps = [[-POLE.x + .018, PENNANTS[0] - PENNANT_W / 2 - .004], ...PENNANTS.slice(0, -1).map((x, i) => [x + PENNANT_W / 2 + .004, PENNANTS[i + 1] - PENNANT_W / 2 - .004]),
    [PENNANTS[3] + PENNANT_W / 2 + .004, POLE.x - .018]];
  for (const [a, b] of gaps) {
    const n = Math.max(1, Math.floor((b - a) / .047)), step = (b - a) / n;
    for (let k = 0; k < n; k++) {
      const x = a + step * (k + .5), f = new THREE.Mesh(flagGeo, flagMats[flags.length % flagMats.length]);
      f.castShadow = true; f.position.set(x, stringAt(x), POLE.z); f.rotation.z = Math.atan2(stringAt(x + .01) - stringAt(x - .01), .02);
      stage.add(f); flags.push({ mesh: f, x });
    }
  }
  /* the flags and pennants together, left to right: they pop up in this order */
  const bunting = [...flags.map(f => ({ kind: 'flag', x: f.x, obj: f.mesh })), ...pennants.map(p => ({ kind: 'photo', x: p.x, obj: p.swing, photo: p }))].sort((a, b) => a.x - b.x);

  /* ── the play tent, its balloons; the letter blocks and a ball ── */
  const TENT = { x: -.255, z: -.085, r: .062, h: .19 };
  const tent = new THREE.Group(); tent.position.set(TENT.x, BASE, TENT.z); stage.add(tent);
  const canvasStripes = tex(256, 128, (c, w, h) => {
    for (let x = 0, i = 0; x < w; x += 32, i++) { c.fillStyle = i % 2 ? '#fff4e6' : '#f7a8bf'; c.fillRect(x, 0, 32, h); }
    c.fillStyle = '#ffd27a'; c.fillRect(0, h * .62, w, 10);
    c.fillStyle = 'rgba(255,255,255,.8)'; for (let x = 16; x < w; x += 64) { starPath(c, x, h * .35, 7, 3); c.fill(); }
  });
  const gap = .95, door = .55;                                        // the door looks towards the middle and the phone
  const cloth = mesh(keep(new THREE.ConeGeometry(TENT.r, TENT.h, 18, 1, true, door + gap / 2, TAU - gap)), texMat(canvasStripes, { r: .9, side: THREE.DoubleSide }), [0, TENT.h / 2, 0]);
  tent.add(cloth);
  tent.add(mesh(keep(new THREE.CircleGeometry(TENT.r * .96, 24)), mat('#b49ad8', { r: 1 }), [0, .0012, 0], false));
  tent.children[1].rotation.x = -Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const a = door + gap / 2 + i / 4 * (TAU - gap), base = [Math.sin(a) * TENT.r, 0, Math.cos(a) * TENT.r], top = [-base[0] * .3, TENT.h * 1.28, -base[2] * .3];
    tent.add(stick(base, top, .0022, mat('#c98f5c', { r: .6 })));
  }
  const flap = mesh(keep(new THREE.ConeGeometry(TENT.r * 1.01, TENT.h * .7, 6, 1, true, door - gap / 2 + .1, .32)), mat('#d9577a', { r: .9, side: THREE.DoubleSide }), [0, TENT.h * .35, 0]);
  tent.add(flap);
  tent.add(stick([0, TENT.h * 1.05, 0], [0, TENT.h * 1.42, 0], .0016, mat('#3b2a4a')));
  const pennantTop = new THREE.Mesh(flagGeo, flagMats[1]); pennantTop.position.set(.0005, TENT.h * 1.42, 0); pennantTop.rotation.z = Math.PI / 2; pennantTop.scale.setScalar(.6); tent.add(pennantTop);
  const balloonGeo = keep(new THREE.SphereGeometry(.026, 18, 14));
  const balloonMat = col => keep(new THREE.MeshPhysicalMaterial({ color: col, roughness: .25, clearcoat: .8, clearcoatRoughness: .2, sheen: .4 }));
  /** a balloon on a string: { root (the balloon's middle), knot } */
  function balloon(col, s = 1) {
    const root = new THREE.Group(), b = new THREE.Mesh(balloonGeo, balloonMat(col)); b.scale.set(s, s * 1.16, s); b.castShadow = true; root.add(b);
    root.add(mesh(keep(new THREE.ConeGeometry(.005 * s, .007 * s, 8)), balloonMat(col), [0, -.031 * s, 0]));
    return root;
  }
  const tentTop = new THREE.Vector3(TENT.x, BASE + TENT.h * 1.2, TENT.z);
  [['#ff6f91', -.31, .35, -.11], ['#7cc4f0', -.22, .385, -.12], ['#ffd27a', -.27, .32, -.04]].forEach(([col, x, y, z]) => {
    const b = balloon(col, .95); b.position.set(x, y, z); stage.add(b);
    stage.add(stick([x, y - .033, z], tentTop.toArray(), .0007, mat('#ffffff', { r: .5 })));
  });
  const letters = [['Y', '#ff6f91', -.272, 0, .083], ['Ê', '#7fd6b8', -.242, 0, .09], ['U', '#b49ad8', -.212, 0, .097], ['B', '#7cc4f0', -.257, 1, .087], ['É', '#ffd27a', -.227, 1, .094]];
  letters.forEach(([ch, col, x, row, z]) => {
    const m = texMat(tex(128, 128, (c, w, h) => {
      c.fillStyle = col; rounded(c, 0, 0, w, h, 18); c.fill(); c.strokeStyle = '#fff4e6'; c.lineWidth = 6; c.setLineDash([10, 8]); rounded(c, 12, 12, w - 24, h - 24, 12); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#ffffff'; c.font = `900 78px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, w / 2, h * .56);
    }), { r: .55 });
    const b = box(.028, .028, .028, [m, m, m, m, m, m], [x, BASE + .014 + row * .028, z]); b.rotation.y = .32; stage.add(b);
  });
  const beach = ball(.02, texMat(tex(256, 128, (c, w, h) => { CANDY.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * w / 6, 0, w / 6 + 1, h); }); c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10); }), { r: .35 }), [.275, BASE + .02, .083], 24);
  beach.rotation.set(.5, .3, .2); stage.add(beach);

  /* ── the party table, the cake under its box ── */
  const TABLE = { x: 0, z: -.065, r: .064, top: BASE + .1 };
  const table = new THREE.Group(); table.position.set(TABLE.x, 0, TABLE.z); stage.add(table);
  table.add(cyl(TABLE.r, TABLE.r, .008, mat('#fff4e6', { r: .6 }), [0, TABLE.top - .004, 0], 36));
  const skirt = mesh(keep(new THREE.CylinderGeometry(TABLE.r + .002, TABLE.r + .006, .032, 40, 1, true)), texMat(tex(512, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.fillStyle = '#ff9fbc'; c.fillRect(0, 0, w, h * .7);
    for (let x = 0; x < w; x += 32) { c.beginPath(); c.arc(x + 16, h * .7, 16, 0, Math.PI); c.fill(); }
    c.fillStyle = '#ffffff'; for (let x = 8; x < w; x += 32) { c.beginPath(); c.arc(x + ((x / 32) % 2) * 8, h * .32, 4, 0, TAU); c.fill(); }
  }), { r: .9, side: THREE.DoubleSide, cut: .5 }), [0, TABLE.top - .02, 0]);
  table.add(skirt);
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; table.add(cyl(.004, .0035, TABLE.top - .01 - BASE, mat('#7fd6b8', { r: .5 }), [Math.sin(a) * TABLE.r * .7, BASE + (TABLE.top - .01 - BASE) / 2, Math.cos(a) * TABLE.r * .7], 8)); }
  for (const [x, z, col] of [[-.049, .027, '#7cc4f0'], [.05, .023, '#ffd27a']]) {             // two paper cups with straws
    table.add(cyl(.0065, .005, .014, mat(col, { r: .5 }), [x, TABLE.top + .007, z], 12));
    table.add(stick([x + .002, TABLE.top + .01, z], [x + .006, TABLE.top + .026, z - .002], .0009, mat('#ff6f91')));
  }
  const cake = new THREE.Group(); cake.position.y = TABLE.top; table.add(cake);
  cake.add(cyl(.043, .041, .004, mat('#ffffff', { r: .3 }), [0, .002, 0], 32));
  const tierTex = (col, drip) => tex(512, 128, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h);
    c.fillStyle = drip; c.fillRect(0, 0, w, h * .18);
    for (let x = 0, i = 0; x < w; x += 22, i++) { const d = h * (.22 + ((i * 7) % 5) * .07); rounded(c, x + 3, 0, 14, d, 7); c.fill(); }
    for (let i = 0; i < 40; i++) { c.fillStyle = CANDY[i % 6]; c.fillRect((i * 131) % w, h * .55 + ((i * 53) % 40), 9, 4); }
  });
  const tier1 = mesh(keep(new THREE.CylinderGeometry(.036, .036, .028, 40)), [texMat(tierTex('#ffb3c8', '#ffffff'), { r: .55 }), mat('#ffffff', { r: .5 }), mat('#ffffff', { r: .5 })], [0, .018, 0]);
  const tier2 = mesh(keep(new THREE.CylinderGeometry(.025, .025, .022, 36)), [texMat(tierTex('#cdb6ee', '#fff4e6'), { r: .55 }), mat('#fff4e6', { r: .5 }), mat('#fff4e6', { r: .5 })], [0, .043, 0]);
  cake.add(tier1, tier2);
  for (const [r, y] of [[.036, .032], [.025, .054]]) cake.add(mesh(keep(new THREE.TorusGeometry(r, .0028, 6, 40)), mat('#ffffff', { r: .4 }), [0, y, 0]));
  cake.children.slice(-2).forEach(t => { t.rotation.x = Math.PI / 2; });
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .2; cake.add(ball(.0042, mat('#e5484d', { r: .25 }), [Math.sin(a) * .03, .0355, Math.cos(a) * .03], 10)); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; cake.add(ball(.0036, mat('#e5484d', { r: .25 }), [Math.sin(a) * .02, .0575, Math.cos(a) * .02], 10)); }
  const CAKE_TOP = TABLE.top + .054;                                  // where the candle stands, on the stage
  /* the number candle: chunky round digits like real ones, the age the buyer gave; other words go on a little candle board */
  const ellipse = (cx, cy, rx, ry, n = 18) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return [cx + rx * Math.sin(a), cy + ry * Math.cos(a)]; });
  const DIGITS = {
    0: [{ closed: 1, pts: ellipse(.3, .5, .25, .45) }],
    1: [{ pts: [[.1, .74], [.33, .97], [.33, .03]] }],
    2: [{ smooth: 1, pts: [[.05, .74], [.13, .92], [.31, .98], [.48, .91], [.55, .74], [.48, .55], [.3, .34], [.06, .03]] }, { pts: [[.06, .03], [.56, .03]] }],
    3: [{ smooth: 1, pts: [[.06, .85], [.22, .97], [.42, .96], [.54, .83], [.51, .65], [.3, .54]] }, { smooth: 1, pts: [[.3, .54], [.52, .44], [.56, .24], [.45, .06], [.26, .02], [.06, .13]] }],
    4: [{ pts: [[.45, .03], [.45, .97], [.04, .32], [.58, .32]] }],
    5: [{ pts: [[.54, .97], [.13, .97], [.08, .57]] }, { smooth: 1, pts: [[.08, .57], [.29, .63], [.49, .55], [.56, .33], [.49, .1], [.29, .02], [.06, .11]] }],
    6: [{ smooth: 1, pts: [[.5, .92], [.32, .98], [.15, .88], [.05, .6], [.06, .27], [.19, .05], [.38, .02], [.53, .15], [.55, .36], [.43, .51], [.24, .52], [.08, .39]] }],
    7: [{ pts: [[.04, .97], [.57, .97], [.21, .03]] }],
    8: [{ closed: 1, pts: ellipse(.3, .76, .19, .2) }, { closed: 1, pts: ellipse(.3, .29, .25, .26) }],
    9: [{ smooth: 1, pts: [[.1, .08], [.26, .02], [.45, .09], [.55, .4], [.54, .73], [.42, .95], [.23, .98], [.07, .84], [.06, .63], [.19, .49], [.39, .5], [.53, .63]] }]
  };
  const candle = new THREE.Group(); candle.position.set(TABLE.x, CAKE_TOP, TABLE.z); stage.add(candle);
  const flames = [];
  const drop = (r, h) => keep(new THREE.LatheGeometry(Array.from({ length: 13 }, (_, i) => {   // a teardrop: round below, a point on top
    const a = i / 12; return new THREE.Vector2(r * Math.sin(Math.PI * Math.min(1, a * 1.6)) * (1 - a * .55), -r + a * (h + r));
  }), 14));
  const flameGeo = drop(.0042, .011), coreGeo = drop(.0022, .005);
  const flameMat = keep(new THREE.MeshBasicMaterial({ color: 0xffb03a, transparent: true, opacity: .95, toneMapped: false }));
  const coreMat = keep(new THREE.MeshBasicMaterial({ color: 0xfff6cf, toneMapped: false }));
  function wick(x, y) {
    candle.add(cyl(.0007, .0007, .006, mat('#3b2a4a'), [x, y + .003, 0], 6));
    const f = new THREE.Group(); f.position.set(x, y + .0105, 0); candle.add(f);
    const outer = new THREE.Mesh(flameGeo, flameMat); f.add(outer);
    const core = new THREE.Mesh(coreGeo, coreMat); core.position.y = -.0015; f.add(core);
    const glow = kit.glow({ color: 0xffb347, size: .036, opacity: .6 }); f.add(glow);
    flames.push({ root: f, glow, x, y: y + .0105 });
  }
  function digitCandle(text) {
    const H = .034, R = H * .11, m = mat('#6ec2f2', { r: .35, e: '#2f7fb8', ei: .25 });
    const W = .6 * H, gapX = H * .18, total = text.length * W + (text.length - 1) * gapX;
    [...text].forEach((ch, i) => {
      const ox = -total / 2 + i * (W + gapX), P = ([x, y]) => new THREE.Vector3(ox + x * H, R + y * H, 0);
      let top = null;
      for (const st of DIGITS[ch]) {
        const pts = st.pts.map(P);
        pts.forEach(p => { if (!top || p.y > top.y + 1e-4) top = p.clone(); else if (Math.abs(p.y - top.y) < 1e-4) top.x = (top.x + p.x) / 2; });
        if (st.closed || st.smooth) {
          const curve = new THREE.CatmullRomCurve3(pts, !!st.closed, 'centripetal');
          candle.add(mesh(keep(new THREE.TubeGeometry(curve, 48, R, 10, !!st.closed)), m));
          if (!st.closed) [pts[0], pts[pts.length - 1]].forEach(p => candle.add(ball(R, m, p.toArray(), 10)));
        } else {
          pts.forEach((p, k) => { candle.add(ball(R, m, p.toArray(), 10)); if (k) candle.add(stick(pts[k - 1].toArray(), p.toArray(), R, m)); });
        }
      }
      wick(top.x, top.y + R);
    });
  }
  function boardCandle(text) {                                         // words that are not an age: a little candle board
    const m = texMat(tex(256, 160, (c, w, h) => {
      c.fillStyle = '#6ec2f2'; rounded(c, 0, 0, w, h, 30); c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.setLineDash([16, 10]); rounded(c, 12, 12, w - 24, h - 24, 22); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#ffffff'; kit.fitText(c, text, { x: 20, y: 18, w: w - 40, h: h - 36 }, { maxLines: 2, max: 92, font: SANS, weight: 900 });
    }), { r: .4, glow: .25, cut: .5 });
    candle.add(box(.046, .029, .008, [m, m, m, m, m, m], [0, .0175, 0]), cyl(.0016, .0016, .004, mat('#ffffff'), [0, .002, 0], 6));
    wick(0, .032);
  }
  const ageText = kit.words('age', '6').slice(0, 4);
  if (/^\d{1,2}$/.test(ageText)) digitCandle(ageText); else boardCandle(ageText || '?');
  const cover = new THREE.Group(); cover.position.set(TABLE.x, TABLE.top, TABLE.z); stage.add(cover);   // the cake's round box
  const wrapCake = tex(512, 256, (c, w, h) => {
    c.fillStyle = '#ff8fab'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff';
    for (let y = 16, i = 0; y < h; y += 40, i++) for (let x = (i % 2) * 20 + 10; x < w; x += 40) { kit.heartPath(c, x, y, 18); c.fill(); }
    c.fillStyle = '#ffd27a'; for (const u of [0, .25, .5, .75]) c.fillRect(u * w - 12, 0, 24, h); c.fillRect(w - 12, 0, 12, h);
  });
  const wrapTop = tex(256, 256, (c, w, h) => { c.fillStyle = '#ff8fab'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd27a'; c.fillRect(w / 2 - 14, 0, 28, h); c.fillRect(0, h / 2 - 14, w, 28); });
  const wtm = texMat(wrapTop, { r: .6 });
  cover.add(mesh(keep(new THREE.CylinderGeometry(.044, .044, .11, 40)), [texMat(wrapCake, { r: .6 }), wtm, wtm], [0, .057, 0]));
  cover.add(mesh(keep(new THREE.CylinderGeometry(.0465, .0465, .014, 40)), [mat('#ffd27a', { r: .5 }), wtm, wtm], [0, .106, 0]));
  const coverBow = bow(.05, '#ffd27a'); coverBow.position.y = .114; cover.add(coverBow);

  /* ── the presents: a big one with a smaller one on it, one beside, one behind; the two that open let out a balloon ── */
  const giftTex = (col, band, kind) => {
    const draw = top => (c, w, h) => {
      c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.85)';
      if (kind === 'dots') for (let y = 14, i = 0; y < h; y += 30, i++) for (let x = (i % 2) * 15 + 8; x < w; x += 30) { c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); }
      else if (kind === 'stars') for (let y = 20, i = 0; y < h; y += 44, i++) for (let x = (i % 2) * 22 + 14; x < w; x += 44) { starPath(c, x, y, 9, 4); c.fill(); }
      else for (let x = -h; x < w; x += 34) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 14, h); c.lineTo(x + 14 + h, 0); c.lineTo(x + h, 0); c.fill(); }
      c.fillStyle = band; c.fillRect(w / 2 - 14, 0, 28, h); if (top) c.fillRect(0, h / 2 - 14, w, 28);
    };
    const side = texMat(tex(256, 256, draw(false)), { r: .55 }), topm = texMat(tex(256, 256, draw(true)), { r: .55 });
    return [side, side, topm, side, side, side];
  };
  /** a present: { root (its bottom's middle), lid (pops), w, h } */
  function present(w, h, d, col, band, kind, at, yaw = 0) {
    const root = new THREE.Group(); root.position.set(...at); root.rotation.y = yaw; stage.add(root);
    const m = giftTex(col, band, kind);
    root.add(box(w, h - .008, d, m, [0, (h - .008) / 2, 0]));
    const lid = new THREE.Group(); lid.position.y = h - .009; root.add(lid);
    lid.add(box(w + .004, .009, d + .004, m, [0, .0045, 0]));
    const b = bow(Math.min(w, d) * .62, band); b.position.y = .009; lid.add(b);
    return { root, lid, w, h, d };
  }
  const pile = {
    big: present(.086, .058, .07, '#ff8fab', '#ffd27a', 'dots', [.262, BASE, -.108], -.15),
    top: present(.05, .046, .05, '#b49ad8', '#ffffff', 'stars', [.258, BASE + .058, -.108], .25),
    side: present(.05, .044, .05, '#7fd6b8', '#ff6f91', 'stripes', [.33, BASE, -.034], .5),
    back: present(.04, .036, .04, '#ffd27a', '#7cc4f0', 'dots', [.19, BASE, -.17], -.3)
  };

  /* ── the jack-in-the-box, on a low step in front of the pile, where the kid's hand comes down to it ── */
  const PICK = { x: .108, z: -.012, yaw: Math.PI / 2 - .4 };           // where he stands to pick it up, and which way he looks
  const fwd = [Math.sin(PICK.yaw), Math.cos(PICK.yaw)], right = [-Math.cos(PICK.yaw), Math.sin(PICK.yaw)];
  const hand = [PICK.x + fwd[0] * .027 + right[0] * .015, PICK.z + fwd[1] * .027 + right[1] * .015];   // PickUp's right fist, at its lowest
  const STEP_H = .018, JACK = .042;
  const jackAt = [hand[0] + fwd[0] * .024 + right[0] * .006, hand[1] + fwd[1] * .024 + right[1] * .006];   // the fist on its near face, the boots clear
  const step = present(.047, STEP_H, .047, '#ffd27a', '#ff6f91', 'dots', [jackAt[0], BASE, jackAt[1]], PICK.yaw);   // just under the box: his boots stay clear
  step.lid.children[1].visible = false;                                // a flat box: no bow
  const jackBox = new THREE.Group(); stage.add(jackBox);                // the box's bottom middle; the story moves it
  const jm = giftTex('#7cc4f0', '#ffd27a', 'stars');
  jackBox.add(box(JACK, JACK, JACK, jm, [0, JACK / 2, 0]));
  const jackHinge = new THREE.Group(); jackHinge.position.set(0, JACK, -JACK / 2); jackBox.add(jackHinge);   // the lid opens backwards
  jackHinge.add(box(JACK + .004, .006, JACK + .004, jm, [0, .003, JACK / 2]));
  const jackBow = bow(.026, '#ffd27a'); jackBow.position.set(0, .006, JACK / 2); jackHinge.add(jackBow);
  const jack = new THREE.Group(); jack.position.y = JACK - .004; jackBox.add(jack);    // the spring and the face, out of the top
  const helix = new THREE.CatmullRomCurve3(Array.from({ length: 73 }, (_, i) => { const a = i / 72 * 6 * TAU; return new THREE.Vector3(Math.cos(a) * .008, i / 72 * .06, Math.sin(a) * .008); }));
  const spring = mesh(keep(new THREE.TubeGeometry(helix, 220, .0017, 5)), mat('#ffd27a', { r: .3, m: .5 }));
  jack.add(spring);
  const jackHead = new THREE.Group(); jack.add(jackHead);
  const headArt = new THREE.Group(); headArt.scale.setScalar(2.1); jackHead.add(headArt);   // a big round face: the photo is the point
  const jackSrc = kit.photo({ frame: 'none', aspect: 1, width: .044, slot: 2, of: 11, glow: .3 });
  jackSrc.face.visible = false; jackSrc.face.userData.proxy = true; jackSrc.root.position.y = .026; headArt.add(jackSrc.root);   // the tap target
  const faceDisc = mesh(keep(new THREE.CircleGeometry(.022, 40)), jackSrc.material, [0, .026, .0012]);
  headArt.add(faceDisc, mesh(keep(new THREE.TorusGeometry(.0225, .0028, 8, 40)), mat('#ffd27a', { r: .3, m: .5 }), [0, .026, .001]));
  headArt.add(mesh(keep(new THREE.CircleGeometry(.023, 32)), mat('#ffffff', { r: .6 }), [0, .026, -.0012]).rotateY(Math.PI));
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; headArt.add(ball(.0055, mat(i % 2 ? '#ffffff' : '#ff6f91', { r: .6 }), [Math.cos(a) * .014, .004 + Math.sin(a) * .002, Math.sin(a) * .01], 8)); }   // the ruff
  [[-1, '#d9577a'], [0, '#ffd27a'], [1, '#7fd6b8']].forEach(([s, col]) => {                       // the jester's hat with bells
    const pt = mesh(keep(new THREE.ConeGeometry(.008, .026, 12)), mat(col, { r: .6 }), [s * .013, .056 - Math.abs(s) * .004, -.002]); pt.rotation.z = -s * .75; headArt.add(pt);
    headArt.add(ball(.0035, mat('#ffd27a', { r: .3, m: .6 }), [s * .024, .066 - Math.abs(s) * .012 + (s ? 0 : .005), -.002], 8));
  });
  headArt.add(mesh(keep(new THREE.CylinderGeometry(.021, .021, .006, 24, 1, true)), mat('#d9577a', { r: .7, side: THREE.DoubleSide }), [0, .046, -.002]));

  /* the two balloons that come out of the presents, each carrying a photo on its string */
  const lifts = [['#ff6f91', pile.top, 8], ['#7cc4f0', pile.side, 5]].map(([col, from, slot]) => {
    const root = new THREE.Group(); stage.add(root);
    const b = balloon(col, 1.55); root.add(b);
    const turner = new THREE.Group(); root.add(turner);
    const ph = kit.photo({ frame: 'white', width: .13, aspect: 1, slot, of: 11, glow: .4 });
    ph.root.position.y = -.165; turner.add(ph.root);
    turner.add(stick([0, -.05, 0], [0, -.165 + ph.height / 2, .001], .0008, mat('#ffffff', { r: .5 })));
    turner.add(box(.01, .012, .004, mat('#ffd27a'), [0, -.165 + ph.height / 2, .003]));
    return { root, turner, photo: ph, from };
  });

  /* ── the train: a wooden engine and four open wagons, a photo standing in each ── */
  const wheelGeo = keep(new THREE.CylinderGeometry(1, 1, 1, 18));
  function wheels(car, list, r, z, col) {
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(wheelGeo, mat(col, { r: .5 })); w.scale.set(r, .006, r); w.rotation.z = Math.PI / 2; w.position.set(s * .027, r, z); w.castShadow = true;
      const hub = ball(r * .38, mat('#fff4e6', { r: .4 }), [s * .0305, r, z], 8);
      car.add(w, hub); list.push({ mesh: w, r });
    }
  }
  const signText = kit.words('train', 'Tàu sinh nhật của Bé');
  const signTex = tex(768, 192, (c, w, h) => {
    c.fillStyle = '#c98f5c'; rounded(c, 0, 0, w, h, 34); c.fill();
    c.fillStyle = '#fff8ec'; rounded(c, 14, 14, w - 28, h - 28, 26); c.fill();
    c.strokeStyle = '#ff6f91'; c.lineWidth = 5; c.setLineDash([16, 11]); rounded(c, 26, 26, w - 52, h - 52, 18); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#ffd27a'; for (const [x, y] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]) { starPath(c, x, y, 13, 6); c.fill(); }
    c.fillStyle = '#7b2343'; kit.fitText(c, signText, { x: 62, y: 30, w: w - 124, h: h - 60 }, { maxLines: 2, max: 84, font: SANS, weight: 800 });
  });
  const engine = new THREE.Group(), engineWheels = [];
  engine.add(box(.05, .012, .1, mat('#5e4a72', { r: .5 }), [0, .02, 0]));
  wheels(engine, engineWheels, .014, -.026, '#e5484d'); wheels(engine, engineWheels, .0105, .03, '#e5484d');
  const boiler = cyl(.019, .019, .054, mat('#e5484d', { r: .45 }), [0, .045, .021], 22); boiler.rotation.x = Math.PI / 2; engine.add(boiler);
  for (const z of [.004, .036]) { const band = mesh(keep(new THREE.TorusGeometry(.0192, .0018, 6, 22)), mat('#ffd27a', { r: .3, m: .5 }), [0, .045, z]); engine.add(band); }
  const face = cyl(.0195, .0195, .004, mat('#ffd27a', { r: .3, m: .5 }), [0, .045, .049], 22); face.rotation.x = Math.PI / 2; engine.add(face);
  const lamp = ball(.0055, mat('#fff4e6', { r: .3, e: '#ffe9b0', ei: .8 }), [0, .052, .052], 10); engine.add(lamp);
  const rim = mesh(keep(new THREE.TorusGeometry(.012, .002, 6, 18)), mat('#ffd27a', { r: .3, m: .5 }), [0, .087, .037]); rim.rotation.x = Math.PI / 2;
  engine.add(cyl(.012, .0085, .026, mat('#3b2a4a', { r: .5 }), [0, .074, .037], 16), rim);
  engine.add(ball(.009, mat('#ffd27a', { r: .3, m: .5 }), [0, .063, .01], 12));
  engine.add(mesh(soft(.05, .05, .042, .006), mat('#7cc4f0', { r: .5 }), [0, .051, -.027]));
  for (const s of [-1, 1]) engine.add(box(.002, .016, .02, mat('#3b2a4a', { r: .3 }), [s * .025, .06, -.027]));
  engine.add(box(.03, .016, .002, mat('#3b2a4a', { r: .3 }), [0, .06, -.005]));
  engine.add(mesh(soft(.06, .008, .052, .003), mat('#ff6f91', { r: .5 }), [0, .08, -.027]));
  const catcher = mesh(keep(new THREE.ConeGeometry(.026, .018, 4, 1)), mat('#ffd27a', { r: .4, m: .3 }), [0, .014, .055]); catcher.rotation.set(Math.PI / 2, Math.PI / 4, 0); catcher.scale.set(1, 1, .45); engine.add(catcher);
  const signPole = stick([0, .084, -.027], [0, .2, -.027], .0016, mat('#3b2a4a'));   // high enough to clear the photos behind it
  engine.add(signPole);
  const signTurner = new THREE.Group(); signTurner.position.set(0, .2225, -.027); engine.add(signTurner);
  const signMat = texMat(signTex, { r: .7, glow: .3, cut: .5 }), signEdge = mat('#c98f5c', { r: .6 });
  signTurner.add(box(.18, .045, .005, [signEdge, signEdge, signEdge, signEdge, signMat, signMat], [0, 0, 0]));   // just above the photos, just under the pennants
  const chimneyTop = new THREE.Vector3(0, .09, .037);
  const wagonCols = ['#ffd27a', '#7fd6b8', '#b49ad8', '#ff9f6b'], WL = .122;   // a wagon's length: room for a big photo
  const wagons = wagonCols.map((col, i) => {
    const car = new THREE.Group(), list = [];
    car.add(box(.046, .01, WL - .006, mat('#5e4a72', { r: .5 }), [0, .018, 0]));
    wheels(car, list, .0105, -.04, '#e5484d'); wheels(car, list, .0105, .04, '#e5484d');
    const m = mat(col, { r: .55 });
    car.add(box(.052, .005, WL, m, [0, .025, 0]));
    for (const s of [-1, 1]) car.add(box(.004, .02, WL, m, [s * .024, .037, 0]), box(.052, .02, .004, m, [0, .037, s * (WL / 2 - .002)]));
    for (const s of [-1, 1]) car.add(box(.006, .004, WL + .004, mat('#ffffff', { r: .5 }), [s * .024, .048, 0]));
    car.add(cyl(.0022, .0022, .036, mat('#3b2a4a'), [0, .045, 0], 8));
    const turner = new THREE.Group(); turner.position.y = .062; car.add(turner);
    const ph = kit.photo({ frame: 'white', width: .13, aspect: 1, slot: [0, 3, 6, 9][i], of: 11, glow: .4 });
    ph.root.position.y = ph.height / 2; turner.add(ph.root);
    car.add(box(.012, .004, .012, mat('#3b2a4a'), [0, .018, -(WL / 2 + .004)]));
    return { root: car, wheels: list, turner, photo: ph };
  });
  const cars = [{ root: engine, wheels: engineWheels, len: .1 }, ...wagons.map(w => ({ ...w, len: WL }))];
  cars.forEach(c => stage.add(c.root));
  const CAR_GAP = .014;
  /** puts the train with its engine's middle at s along the line; a car follows the line on its two axles */
  function placeTrain(s) {
    let at = s;
    cars.forEach((c, i) => {
      if (i) at -= cars[i - 1].len / 2 + CAR_GAP + c.len / 2;
      const f = along(at + c.len * .3), b = along(at - c.len * .3);
      c.root.position.set((f.x + b.x) / 2, BASE + .004, (f.z + b.z) / 2);
      c.root.rotation.y = Math.atan2(f.x - b.x, f.z - b.z);
      c.wheels.forEach(w => { w.mesh.rotation.x = at / w.r; });
    });
  }

  /* ── two confetti cannons at the front corners, aimed up and in ── */
  const cannons = [-1, 1].map(s => {
    const root = new THREE.Group(); root.position.set(s * .43, BASE, .245); root.rotation.y = s * -.5; stage.add(root);
    root.add(cyl(.02, .024, .01, mat('#7fd6b8', { r: .5 }), [0, .005, 0], 18));
    const tilt = new THREE.Group(); tilt.position.y = .01; tilt.rotation.z = s * .5; root.add(tilt);
    const tube = mesh(keep(new THREE.CylinderGeometry(.015, .011, .05, 18)), texMat(tex(128, 64, (c, w, h) => {
      for (let x = 0, i = 0; x < w; x += 16, i++) { c.fillStyle = CANDY[i % 6]; c.fillRect(x, 0, 16, h); }
    }), { r: .5 }), [0, .025, 0]);
    tilt.add(tube, mesh(keep(new THREE.TorusGeometry(.015, .0025, 6, 18)), mat('#ffd27a', { r: .3, m: .5 }), [0, .05, 0]));
    tilt.children.slice(-1)[0].rotation.x = Math.PI / 2;
    return { root, tilt, tube, s };
  });

  /* ── the star that holds the first photo, and the banner ── */
  const starShape = (R, r, cx = 0, cy = 0) => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; s[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * q, cy + Math.sin(a) * q); } s.closePath(); return s; };
  const heroSrc = kit.photo({ frame: 'none', aspect: 1, width: .26, hero: true, glow: .55 });
  const starG = new THREE.Group(); stage.add(starG);
  const starInner = (() => { const g = new THREE.ShapeGeometry(starShape(.5, .29, .5, .5)); g.translate(-.5, -.5, 0); return keep(g); })();   // its u/v cover the photo
  const starPhoto = new THREE.Mesh(starInner, heroSrc.material); starPhoto.scale.setScalar(.32); starG.add(starPhoto);
  const ring = new THREE.Shape(); ring.copy(starShape(.176, .104)); ring.holes.push(new THREE.Path(starShape(.16, .0928).getPoints().reverse()));
  const starFrame = mesh(keep(new THREE.ExtrudeGeometry(ring, { depth: .006, bevelEnabled: true, bevelThickness: .002, bevelSize: .0015, bevelSegments: 2 })), mat('#ffd27a', { r: .3, m: .55 }), [0, 0, -.002]);
  const starBack = mesh(keep(new THREE.ShapeGeometry(starShape(.182, .108))), mat('#ff6f91', { r: .6, side: THREE.DoubleSide }), [0, 0, -.004]);   // pink as it flips in
  starBack.rotation.y = 0; starG.add(starBack, starFrame);
  heroSrc.face.visible = false; heroSrc.face.userData.proxy = true; heroSrc.root.scale.setScalar(.85); starG.add(heroSrc.root);   // the tap target
  const starGlow = kit.glow({ color: 0xffd9a0, size: .7, opacity: 0 }); starGlow.position.z = -.02; starG.add(starGlow);
  const name = kit.words('name', 'Bé Na'), wish = kit.words('banner', 'Chúc mừng sinh nhật');
  const bannerText = !name || wish.toLowerCase().includes(name.toLowerCase()) ? wish : `${wish.replace(/[\s!.?,…]+$/, '')} ${name}!`;
  const banner = kit.sign({ text: bannerText, style: 'banner', width: .36, accent: '#e8436d', glow: .5 });
  stage.add(banner.root);

  /* ── the camera, wherever it is: photos on the train and the balloons turn to it ── */
  const camAt = new THREE.Vector3(0, .6, 1.4), camWorld = new THREE.Vector3();
  let camKnown = false;
  const camProbe = new THREE.Mesh(keep(new THREE.PlaneGeometry(.001, .001)), keep(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })));
  camProbe.frustumCulled = false; camProbe.position.y = .2; stage.add(camProbe);
  camProbe.onBeforeRender = (renderer, scene, camera) => { camWorld.setFromMatrixPosition(camera.matrixWorld); camKnown = true; };
  const vA = new THREE.Vector3();
  /** turns obj (a child of something that only turns about y) to look at the camera, about y only */
  function faceCamera(obj) {
    if (camKnown) { stage.updateWorldMatrix(true, false); camAt.copy(camWorld); stage.worldToLocal(camAt); }
    obj.parent.updateWorldMatrix(true, false);
    const p = stage.worldToLocal(obj.parent.localToWorld(vA.copy(obj.position)));
    let up = 0; for (let o = obj.parent; o && o !== stage; o = o.parent) up += o.rotation.y;
    obj.rotation.y = Math.atan2(camAt.x - p.x, camAt.z - p.z) - up;
  }

  /** a speech bubble that faces the phone */
  function bubble(text, o = {}) {
    return kit.picture((c, px) => {
      c.fillStyle = '#ffffff'; c.strokeStyle = '#3b2a4a'; c.lineWidth = px * .03;
      rounded(c, px * .06, px * .1, px * .88, px * .58, px * .2); c.fill(); c.stroke();
      const t = o.tail ?? .3;
      c.beginPath(); c.moveTo(px * t, px * .66); c.lineTo(px * (t - .04), px * .86); c.lineTo(px * (t + .14), px * .66); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(px * (t - .02), px * .62, px * .18, px * .06);
      c.fillStyle = o.ink ?? '#d9577a'; kit.fitText(c, text, { x: px * .12, y: px * .16, w: px * .76, h: px * .46 }, { maxLines: 1, max: px * .3 });
    }, { size: o.size ?? .1, px: 256 });
  }

  /** the party hat he wears: a striped cone with a pompom, its base's middle at 0 */
  function partyHat() {
    const g = new THREE.Group();
    const t = tex(256, 128, (c, w, h) => {
      c.fillStyle = '#ff6f91'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffd27a'; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(0, h * (k * .25 - .1)); c.lineTo(w, h * (k * .25 + .15)); c.lineTo(w, h * (k * .25 + .27)); c.lineTo(0, h * (k * .25 + .02)); c.fill(); }
      c.fillStyle = '#ffffff'; for (let i = 0; i < 18; i++) { c.beginPath(); c.arc((i * 61) % w, (i * 37) % h, 5, 0, TAU); c.fill(); }
    });
    g.add(mesh(keep(new THREE.ConeGeometry(.019, .05, 28, 1, true)), texMat(t, { r: .6, side: THREE.DoubleSide }), [0, .025, 0]));
    g.add(mesh(keep(new THREE.TorusGeometry(.0185, .0022, 6, 28)), mat('#ffd27a', { r: .4 }), [0, .001, 0]));
    g.children[1].rotation.x = Math.PI / 2;
    g.add(mesh(keep(new THREE.IcosahedronGeometry(.0068, 1)), mat('#fff4e6', { r: 1 }), [0, .051, 0]));
    return g;
  }
  return {
    BASE, TRACK, L, along, placeTrain, cars, engine, chimneyTop, signTurner, wagons, wall,
    bunting, pennants, POLE, tent, table: { ...TABLE, root: table }, cake, cover, candle, flames, CAKE_TOP,
    pile, step, jackBox, jackHinge, jack, spring, jackHead, JACK, PICK, lifts,
    cannons, star: { root: starG, glow: starGlow, frame: starFrame }, banner, faceCamera, bubble, partyHat
  };
};
