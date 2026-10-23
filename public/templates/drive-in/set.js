/* Suất Chiếu Đặc Biệt: the drive-in lot, built for story.js (template.json "story": ["props.js", "set.js", "car.js",
   "screen.js", "story.js"]). A gravel lot at night under a plum sky: the big screen stands behind the card's far edge
   (screen.js); four street lights, two on each side, with string lights between them and across the front; at the
   front left the gate sign (SUẤT CHIẾU ĐẶC BIỆT, the film's title on its letter board, a photo beside it); along the left
   edge the photo booth and, behind it, the popcorn stand with its menu board (a photo on it) and the cotton candy; at the
   front right the projector on its podium, its beam over the car to the screen, dust drifting in it. Two puddles for the
   rain (screen.js gives them the screen's picture), the rain itself.
   window.NM_DRIVEIN_SET(kit, props) builds it and returns what the story moves. Units: card widths, +y up, the act faces
   +z (the card's bottom edge). */
/* Playfair Display (OFL) for the screen's titles and the signs, from fonts/ beside this file, once per page */
(here => {
  window.NM_DRIVEIN_FONTS = window.NM_DRIVEIN_FONTS || (async () => {
    try {
      const at = new URL('fonts/', here).href;
      const faces = [['latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
        ['latin-ext', 'U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'],
        ['vietnamese', 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB']]
        .map(([n, range]) => new FontFace('Playfair Display', `url(${at}playfair-display-${n}-900-normal.woff2) format("woff2")`, { weight: '900', unicodeRange: range }));
      faces.forEach(f => document.fonts.add(f));
      await Promise.race([Promise.all(faces.map(f => f.load())), new Promise(r => setTimeout(r, 5000))]);
    } catch (e) { /* no FontFace API: the serif fallback stays */ }
  })();
})(document.currentScript && document.currentScript.src);
window.NM_DRIVEIN_SET = (kit, props) => {
  const { THREE, stage, keep, rng } = kit;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const SERIF = '"Playfair Display", "Times New Roman", "Noto Serif", Georgia, serif';
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const FLOOR = .002;
  const SCREEN = { y0: .17, z: -.38, w: 1.25, h: 1.25 * 9 / 16 };       // the picture's bottom, its plane, its size
  const POLES = [[-.63, -.43], [-.56, .2], [.62, -.4], [.56, -.02]];     // the street lights: back and front, left and right
  const GATE = { x: .405, z: -.2, yaw: -.62 };                           // the gate sign at the back right
  const BOOTH = { x: -.4, z: -.02, yaw: .3 };                            // the photo booth on the left, its door to the phone
  const STAND = { x: -.565, z: -.31, yaw: 1 };
  const PODIUM = { x: .385, z: .215, h: .15 };
  const PUDDLES = [{ x: -.215, z: .06, w: .21, d: .1, a: .12 }, { x: .255, z: .09, w: .18, d: .09, a: -.2 }];
  const GOLD = '#ffc56b', RED = '#e0475c', PLUM = '#1d1328';

  /* ── materials and shapes ── */
  const mats = new Map();
  const mat = (color, o = {}) => {
    const key = `${color}|${o.r ?? .8}|${o.m ?? 0}|${o.e ?? ''}|${o.ei ?? 1}|${o.side ?? 0}`;
    if (!mats.has(key)) mats.set(key, keep(new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .8, metalness: o.m ?? 0, side: o.side ?? THREE.FrontSide,
      ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}) })));
    return mats.get(key);
  };
  const painted = (t, o = {}) => keep(new THREE.MeshStandardMaterial({ map: t, roughness: o.r ?? .8, transparent: !!o.cut, alphaTest: o.cut ? .5 : 0,
    side: o.side ?? THREE.FrontSide, ...(o.glow ? { emissive: 0xffffff, emissiveMap: t, emissiveIntensity: o.glow } : {}) }));
  const mesh = (geo, m, at = [0, 0, 0], shadow = true) => {
    const x = new THREE.Mesh(keep(geo), m); x.position.set(...at); x.castShadow = shadow; x.receiveShadow = true; return x;
  };
  const box = (w, h, d, m, at) => mesh(new THREE.BoxGeometry(w, h, d), m, at);
  const cyl = (rt, rb, h, m, at, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, at);
  /** a canvas texture (kit.canvasTexture), painted again when the screen's serif arrives */
  const tex = (w, h, draw) => {
    const t = kit.canvasTexture(w, h, draw);
    (window.NM_DRIVEIN_FONTS || Promise.resolve()).then(() => { const c = t.image.getContext('2d'); c.clearRect(0, 0, w, h); draw(c, w, h); t.needsUpdate = true; });
    return t;
  };
  const noHit = o => { o.traverse(x => { x.raycast = () => {}; }); return o; };
  const rounded = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  const iron = mat('#2f3340', { r: .5, m: .5 }), wood = mat('#8a5a3c', { r: .75 }), woodDark = mat('#5e3b2a', { r: .8 });

  /* ── a night to reflect: plum all round, warm lights along the horizon (car paint, wet gravel, the couple) ── */
  const envCanvas = document.createElement('canvas'); envCanvas.width = 256; envCanvas.height = 128;
  (c => {
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#2a1d40'); g.addColorStop(.45, '#5b3f72'); g.addColorStop(.52, '#7a5578'); g.addColorStop(.6, '#2b2238'); g.addColorStop(1, '#140e1c');
    c.fillStyle = g; c.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 9; i++) {                                     // the lot's lights and the screen's glow round the horizon
      const x = 14 + i * 28, s = c.createRadialGradient(x, 60, 0, x, 60, i % 3 ? 9 : 22);
      s.addColorStop(0, i % 3 ? 'rgba(255,214,150,.95)' : 'rgba(255,246,232,.9)'); s.addColorStop(1, 'rgba(255,214,150,0)');
      c.fillStyle = s; c.fillRect(x - 24, 36, 48, 48);
    }
  })(envCanvas.getContext('2d'));
  const env = keep(new THREE.CanvasTexture(envCanvas));
  env.mapping = THREE.EquirectangularReflectionMapping; env.colorSpace = THREE.SRGBColorSpace;
  /** puts the night in everything under o that reflects */
  const night = (o, k = 1) => o.traverse(x => {
    if (!x.isMesh) return;
    for (const m of Array.isArray(x.material) ? x.material : [x.material]) if (m && m.isMeshStandardMaterial) { m.envMap = env; m.envMapIntensity = (m.metalness > .5 ? 1.2 : .55) * k; m.needsUpdate = true; }
  });

  /* ── the sky: plum, stars, a crescent moon, a far hill with the town's lights ── */
  const sky = kit.backdrop((c, w, h) => {
    const r = seeded(1960);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#120b1c'); g.addColorStop(.5, PLUM); g.addColorStop(.8, '#3a2550'); g.addColorStop(.92, '#5a3a66'); g.addColorStop(1, '#2b2238');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {                                    // stars, a few of them bright
      const x = r() * w, y = r() * h * .8, s = r() < .08 ? 2.4 : .7 + r() * 1.1;
      c.fillStyle = `rgba(255,246,230,${.35 + r() * .6})`; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill();
      if (s > 2) { c.strokeStyle = 'rgba(255,240,220,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x + 7, y); c.moveTo(x, y - 7); c.lineTo(x, y + 7); c.stroke(); }
    }
    for (let i = 0; i < 5; i++) {                                      // thin clouds
      const x = r() * w, y = h * (.1 + r() * .5), cw = w * (.15 + r() * .2);
      const cg = c.createRadialGradient(x, y, 0, x, y, cw); cg.addColorStop(0, 'rgba(120,90,150,.22)'); cg.addColorStop(1, 'rgba(120,90,150,0)');
      c.save(); c.translate(x, y); c.scale(1, .22); c.translate(-x, -y); c.fillStyle = cg; c.fillRect(x - cw, y - cw, cw * 2, cw * 2); c.restore();
    }
    const mx = w * .86, my = h * .13, mr = w * .035;                     // the crescent moon, top right
    const mg = c.createRadialGradient(mx, my, mr * .6, mx, my, mr * 4); mg.addColorStop(0, 'rgba(255,240,210,.35)'); mg.addColorStop(1, 'rgba(255,240,210,0)');
    c.fillStyle = mg; c.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    c.fillStyle = '#fff3d6'; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
    c.fillStyle = '#1a1126'; c.beginPath(); c.arc(mx + mr * .45, my - mr * .25, mr * .92, 0, 7); c.fill();
    c.fillStyle = '#1e1530'; c.beginPath(); c.moveTo(0, h);              // the far hill and the town's windows
    for (let x = 0; x <= w; x += 16) c.lineTo(x, h * (.9 - .04 * Math.sin(x / w * 7) - .03 * Math.sin(x / w * 19 + 1)));
    c.lineTo(w, h); c.closePath(); c.fill();
    for (let i = 0; i < 70; i++) { const x = r() * w; c.fillStyle = r() < .7 ? 'rgba(255,205,120,.85)' : 'rgba(255,150,170,.8)'; c.fillRect(x, h * (.93 + r() * .05), 2.5, 2.5); }
  }, { width: 1.8, height: 1.3, curve: .24, z: -.52 });
  stage.add(sky);
  const flashMat = keep(new THREE.MeshBasicMaterial({ color: '#d8d2ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const skyFlash = noHit(mesh(new THREE.PlaneGeometry(1.8, 1.3), flashMat, [0, .65, -.49], false)); skyFlash.name = 'skyFlash'; skyFlash.renderOrder = 0; stage.add(skyFlash);

  /* ── the gravel lot: dark plum gravel, the bays painted on it, tyre tracks; it can be wet ── */
  const GW = 1.3, GD = .87, GZ = -.06;                                // the lot runs z -.495 … .375
  const groundTex = tex(1024, 686, (c, w, h) => {
    const r = seeded(77), px = w / GW, X = x => (x + GW / 2) * px, Z = z => (z - (GZ - GD / 2)) * px;
    c.fillStyle = '#2b2238'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {                                   // gravel
      const v = r(); c.fillStyle = v < .5 ? 'rgba(90,76,110,.55)' : v < .8 ? 'rgba(20,14,30,.6)' : v < .95 ? 'rgba(140,118,150,.45)' : 'rgba(190,150,120,.4)';
      const s = 1 + r() * 2.6; c.fillRect(r() * w, r() * h, s, s * (.6 + r() * .6));
    }
    const lot = c.createRadialGradient(X(0), Z(-.2), 20, X(0), Z(-.2), w * .6);   // lighter in front of the screen
    lot.addColorStop(0, 'rgba(120,100,140,.25)'); lot.addColorStop(1, 'rgba(0,0,0,.25)'); c.fillStyle = lot; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(241,230,214,.55)'; c.lineWidth = 7; c.lineCap = 'round';   // the bays, angled a little towards the screen
    for (const x of [-.5, -.22, .18, .46]) { c.beginPath(); c.moveTo(X(x), Z(-.24)); c.lineTo(X(x * 1.06), Z(.3)); c.stroke(); }
    c.setLineDash([22, 16]); c.lineWidth = 5; c.beginPath(); c.moveTo(X(-.6), Z(-.3)); c.lineTo(X(.6), Z(-.3)); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(255,197,107,.5)'; c.font = `900 ${Math.round(px * .06)}px ${SANS}`; c.textAlign = 'center';
    for (const [x, t] of [[-.36, 'P'], [.32, 'P']]) c.fillText(t, X(x), Z(.26));
    c.strokeStyle = 'rgba(15,10,22,.5)'; c.lineWidth = px * .028;      // tyre tracks into the middle bay
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(X(-.03 + s * .1), h); c.bezierCurveTo(X(-.03 + s * .1), Z(.3), X(-.02 + s * .1), Z(.2), X(-.02 + s * .1), Z(.0)); c.stroke(); }
    const rim = c.createLinearGradient(0, 0, 0, h); rim.addColorStop(0, 'rgba(10,6,16,.6)'); rim.addColorStop(.12, 'rgba(10,6,16,0)'); rim.addColorStop(.92, 'rgba(10,6,16,0)'); rim.addColorStop(1, 'rgba(10,6,16,.55)');
    c.fillStyle = rim; c.fillRect(0, 0, w, h);
  });
  const groundMat = keep(new THREE.MeshStandardMaterial({ map: groundTex, roughness: .95, metalness: 0, color: '#ffffff' }));
  const groundShape = new THREE.Shape(); (s => {
    const x0 = -GW / 2, x1 = GW / 2, z0 = -GD / 2, z1 = GD / 2, rr = .06;
    s.moveTo(x0 + rr, z0); s.lineTo(x1 - rr, z0); s.quadraticCurveTo(x1, z0, x1, z0 + rr); s.lineTo(x1, z1 - rr); s.quadraticCurveTo(x1, z1, x1 - rr, z1);
    s.lineTo(x0 + rr, z1); s.quadraticCurveTo(x0, z1, x0, z1 - rr); s.lineTo(x0, z0 + rr); s.quadraticCurveTo(x0, z0, x0 + rr, z0);
  })(groundShape);
  const groundGeo = keep(new THREE.ShapeGeometry(groundShape, 6)), guv = groundGeo.attributes.uv, gpos = groundGeo.attributes.position;
  for (let i = 0; i < guv.count; i++) guv.setXY(i, gpos.getX(i) / GW + .5, gpos.getY(i) / GD + .5);
  const ground = new THREE.Mesh(groundGeo, groundMat); ground.rotation.x = -Math.PI / 2; ground.position.set(0, FLOOR, GZ); ground.receiveShadow = true;
  stage.add(ground);
  /** how wet the gravel is, 0..1: darker and glossy */
  const wet = k => { groundMat.roughness = .95 - .62 * k; groundMat.metalness = .12 * k; groundMat.color.setScalar(1 - .32 * k); groundMat.envMapIntensity = .3 + .9 * k; };
  groundMat.envMap = env; wet(0);

  /* ── glow points: every bulb's halo in one draw (positions fixed, brightness and colour set each frame) ── */
  function glowPoints(list) {
    const n = list.length, g = keep(new THREE.BufferGeometry());
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
    list.forEach((p, i) => { pos.set([p.at.x, p.at.y, p.at.z], i * 3); size[i] = p.size; });
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const m = keep(new THREE.ShaderMaterial({
      uniforms: { uHalfH: { value: 400 } },
      vertexShader: `attribute vec3 aColor; attribute float aSize; uniform float uHalfH; varying vec3 vColor;
        void main() { vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * projectionMatrix[1][1] * uHalfH / max(0.001, -mv.z); }`,
      fragmentShader: `varying vec3 vColor;
        void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.2); gl_FragColor = vec4(vColor * a, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 6; pts.raycast = () => {};
    const v2 = new THREE.Vector2(), c = new THREE.Color();
    pts.onBeforeRender = r => { r.getDrawingBufferSize(v2); m.uniforms.uHalfH.value = v2.y / 2; };
    stage.add(pts);
    return { set(i, color, k) { c.set(color).multiplyScalar(k); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }, done() { g.attributes.aColor.needsUpdate = true; } };
  }
  const bulbs = [];                                                   // every bulb on the lot: { local, parent, color, group, r }
  const bulb = (parent, at, r, color, group) => { bulbs.push({ local: at.clone(), parent, color, group, r, size: r * 9 }); };

  /* ── the street lights, the string lights between them ── */
  const poles = POLES.map(([x, z], i) => {
    const p = props.streetLight(i); p.root.position.set(x, FLOOR, z); p.root.rotation.y = i % 2 === 0 ? 0 : x < 0 ? Math.PI / 2 : -Math.PI / 2;   // the back lamps to the front, the front ones over the lot
    stage.add(p.root); night(p.root);
    const lamp = p.point('lamp') || new THREE.Vector3(x - Math.sign(x) * .06, .48, z);
    const glass = p.part('lamp'), mats = [];
    if (glass) glass.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); keep(o.material); mats.push(o.material); } });
    return { prop: p, lamp, top: new THREE.Vector3(x, .455, z), mats };
  });
  /** each lamp's level 0..1 (its panel and its glow; the bulbs' halos are bulbsAt's 'lamp' group) */
  const lampsAt = levels => poles.forEach((p, i) => p.mats.forEach(m => { if (m.emissive) { m.emissive.set('#ffc56b'); m.emissiveIntensity = 2.2 * levels[i]; } }));
  const sideLights = [0, 2].map(i => {                               // one warm light per side, between its two lamps
    const l = new THREE.PointLight(0xffc56b, 0, 1.1, 1.6); l.position.copy(poles[i].lamp).lerp(poles[i + 1].lamp, i ? .75 : .5).add(new THREE.Vector3(0, -.02, 0)); stage.add(l); return l;
  });
  const strings = [[0, 1, 8], [2, 3, 6], [1, 3, 15]].map(([a, b, n], si) => {
    const low = si === 2 ? new THREE.Vector3(0, -.12, 0) : new THREE.Vector3();   // the front one hangs low: under the picture
    const A = poles[a].top.clone().add(low), B = poles[b].top.clone().add(low), sag = si === 2 ? .035 : .045;
    const at = t => new THREE.Vector3().lerpVectors(A, B, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0));
    stage.add(noHit(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 17 }, (_, i) => at(i / 16))), 48, .0012, 4), mat('#1d1726', { r: .7 }), [0, 0, 0], false)));
    for (let i = 0; i < n; i++) bulb(stage, at((i + .5) / n).add(new THREE.Vector3(0, -.007, 0)), .0058, GOLD, 'string');
    return { at };
  });

  /* ── the gate sign: a marquee on two posts, its bulbs, the film's title on the letter board, a photo beside it ── */
  const gate = new THREE.Group(); gate.position.set(GATE.x, FLOOR, GATE.z); gate.rotation.y = GATE.yaw; stage.add(gate);
  const BW = .26, BH = .15, BY = .1;                                  // the board's size and how high it starts
  for (const s of [-1, 1]) gate.add(box(.012, BY + .02, .012, iron, [s * BW * .38, (BY + .02) / 2, -.006]));
  gate.add(box(BW + .02, BH + .018, .016, mat('#8e1f33', { r: .5 }), [0, BY + BH / 2, -.006]));
  const title = kit.words('title', 'Chuyện Hai Đứa Mình');
  const gateTex = tex(1024, 592, (c, w, h) => {
    c.fillStyle = RED; rounded(c, 0, 0, w, h, 30); c.fill();
    c.strokeStyle = '#ffdca0'; c.lineWidth = 10; rounded(c, 22, 22, w - 44, h - 44, 22); c.stroke();
    c.fillStyle = '#fff4e2'; c.font = `900 96px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    kit.fitText(c, 'SUẤT CHIẾU ĐẶC BIỆT', { x: 70, y: 50, w: w - 140, h: 150 }, { maxLines: 1, max: 104, font: SERIF, weight: 900 });
    c.fillStyle = '#fbf3e4'; rounded(c, 70, 228, w - 140, 250, 18); c.fill();     // the letter board
    c.strokeStyle = 'rgba(40,20,30,.18)'; c.lineWidth = 3; for (let y = 268; y < 478; y += 40) { c.beginPath(); c.moveTo(80, y); c.lineTo(w - 80, y); c.stroke(); }
    c.fillStyle = '#1d1328'; kit.fitText(c, title.toLocaleUpperCase('vi'), { x: 96, y: 240, w: w - 192, h: 226 }, { maxLines: 2, max: 96, font: SANS, weight: 900 });
    c.fillStyle = '#ffdca0'; c.font = `800 34px ${SANS}`; c.fillText('★ ĐÊM NAY · CHỈ HAI NGƯỜI ★', w / 2, 528);
  });
  gate.add(mesh(new THREE.PlaneGeometry(BW, BH), painted(gateTex, { r: .55, glow: .55 }), [0, BY + BH / 2, .0025], false));
  const gatePhoto = kit.photo({ frame: 'white', width: .12, aspect: .78, slot: 1, of: 6, glow: .55, border: .05 });
  gatePhoto.root.position.set(BW / 2 + .055, BY + BH / 2 + .01, .006); gatePhoto.root.rotation.z = -.04; gate.add(gatePhoto.root);
  gate.add(box(.004, .07, .004, iron, [BW / 2 + .055, BY + .03, -.004]));
  for (let i = 0; i < 22; i++) {                                     // bulbs round the board
    const t = i / 22, per = 2 * (BW + BH), d = t * per;
    const at = d < BW ? new THREE.Vector3(-BW / 2 + d, BY + BH + .006, .008) : d < BW + BH ? new THREE.Vector3(BW / 2 + .006, BY + BH - (d - BW), .008)
      : d < 2 * BW + BH ? new THREE.Vector3(BW / 2 - (d - BW - BH), BY - .006, .008) : new THREE.Vector3(-BW / 2 - .006, BY + (d - 2 * BW - BH), .008);
    bulb(gate, at, .0042, '#ffe0a0', 'gate');
  }

  /* ── the popcorn stand: a striped kiosk, the menu board with a photo, the popcorn machine, the cotton candy ── */
  const stand = new THREE.Group(); stand.position.set(STAND.x, FLOOR, STAND.z); stand.rotation.y = STAND.yaw; stand.name = 'stand'; stage.add(stand);
  const SW = .25, SD = .1;
  const stripes = tex(256, 128, (c, w, h) => { for (let x = 0; x < w; x += 32) { c.fillStyle = (x / 32) % 2 ? '#fff4e2' : RED; c.fillRect(x, 0, 32, h); } c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, h - 10, w, 10); });
  stripes.wrapS = THREE.RepeatWrapping; stripes.repeat.set(2, 1);
  stand.add(box(SW, .1, SD, [mat('#c33a4f'), mat('#c33a4f'), mat('#fff4e2', { r: .6 }), mat('#c33a4f'), painted(stripes, { r: .7 }), mat('#c33a4f')], [0, .05, 0]));
  stand.add(box(SW + .02, .008, SD + .02, wood, [0, .104, 0]));     // the counter top
  stand.add(box(SW, .2, .012, mat('#3a2a3e', { r: .8 }), [0, .2, -SD / 2 + .006]));   // the back wall
  for (const s of [-1, 1]) stand.add(box(.01, .22, .01, wood, [s * (SW / 2 - .005), .21, SD / 2 - .005]));
  const awning = mesh(new THREE.BoxGeometry(SW + .05, .006, SD + .06), painted(stripes, { r: .7, side: THREE.DoubleSide }), [0, .325, .012]); awning.rotation.x = .28; stand.add(awning);
  const menuText = tex(512, 512, (c, w, h) => {
    c.fillStyle = '#211726'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffc56b'; c.lineWidth = 8; rounded(c, 12, 12, w - 24, h - 24, 18); c.stroke();
    c.fillStyle = '#ffc56b'; c.font = `900 66px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('THỰC ĐƠN', w / 2, 74);
    c.font = `800 38px ${SANS}`; c.textAlign = 'left';
    [['Bắp rang bơ', '25K', '#fff4e2'], ['Kẹo bông', '15K', '#ffb3d1'], ['Nước ngọt', '12K', '#9fc3e8'], ['Xúc xích', '20K', '#fff4e2'], ['Combo đôi', '♥', '#ff6f91']].forEach(([n, p, col], i) => {
      c.fillStyle = col; c.fillText(n, 38, 160 + i * 72); c.textAlign = 'right'; c.fillText(p, w - 38, 160 + i * 72); c.textAlign = 'left';
      c.fillStyle = 'rgba(255,197,107,.35)'; for (let x = 270; x < w - 110; x += 16) c.fillRect(x, 168 + i * 72, 6, 4);
    });
  });
  stand.add(mesh(new THREE.PlaneGeometry(.1, .1), painted(menuText, { r: .6, glow: .7 }), [-.065, .215, -SD / 2 + .0135], false));
  const menuPhoto = kit.photo({ frame: 'white', width: .11, aspect: .82, slot: 3, of: 6, glow: .6, border: .06 });
  menuPhoto.root.position.set(.062, .222, -SD / 2 + .016); menuPhoto.root.rotation.z = .03; stand.add(menuPhoto.root);
  const signTex = tex(512, 160, (c, w, h) => {
    c.fillStyle = '#fff4e2'; rounded(c, 4, 4, w - 8, h - 8, 30); c.fill(); c.strokeStyle = RED; c.lineWidth = 10; rounded(c, 16, 16, w - 32, h - 32, 22); c.stroke();
    c.fillStyle = RED; kit.fitText(c, 'BẮP RANG BƠ', { x: 30, y: 20, w: w - 60, h: h - 40 }, { maxLines: 1, max: 90, font: SERIF, weight: 900 });
  });
  stand.add(mesh(new THREE.PlaneGeometry(.17, .053), painted(signTex, { r: .6, glow: .5 }), [0, .37, .02], false));
  const machine = new THREE.Group(); machine.position.set(-.07, .108, .012); stand.add(machine);   // the popcorn machine: glass, kernels, a red top
  machine.add(box(.055, .006, .045, mat(RED, { r: .5 }), [0, .003, 0]), box(.055, .008, .045, mat(RED, { r: .5 }), [0, .07, 0]));
  machine.add(mesh(new THREE.BoxGeometry(.052, .062, .042), keep(new THREE.MeshStandardMaterial({ color: '#fff4dc', roughness: .1, transparent: true, opacity: .25, depthWrite: false })), [0, .037, 0], false));
  const kernels = tex(128, 128, c => { const r = seeded(9); c.fillStyle = '#f7d77a'; c.fillRect(0, 0, 128, 128); for (let i = 0; i < 160; i++) { c.fillStyle = r() < .5 ? '#fff6dc' : '#ffe9a8'; c.beginPath(); c.arc(r() * 128, r() * 128, 4 + r() * 5, 0, 7); c.fill(); } });
  machine.add(box(.048, .03, .038, painted(kernels, { r: .9, glow: .25 }), [0, .02, 0]));
  const candy = props.cottonCandy(); candy.root.position.set(.07, .108, .03); candy.root.rotation.y = -.4; stand.add(candy.root);
  stand.add(cyl(.012, .014, .02, wood, [.07, .118, .03], 10));
  for (let i = 0; i < 9; i++) bulb(stand, new THREE.Vector3(-SW / 2 + .015 + i * (SW - .03) / 8, .304, SD / 2 + .045), .0045, '#fff0c8', 'stand');
  const standLight = new THREE.PointLight(0xffd59a, 0, .45, 1.6); standLight.position.set(0, .26, .08); stand.add(standLight);
  night(stand);

  /* ── the photo booth: the red booth, a curtain behind the seat, the camera and its flash over the doorway, the slot ── */
  const boothProp = props.phoneBooth();
  const booth = new THREE.Group(); booth.position.set(BOOTH.x, FLOOR, BOOTH.z); booth.rotation.y = BOOTH.yaw; booth.name = 'booth'; stage.add(booth);
  booth.add(boothProp.root); night(boothProp.root);
  const BS = boothProp.size, BH2 = BS[1];                              // card widths
  const curtainTex = tex(256, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, i % 2 ? '#7a1430' : '#b8264a');
    c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd27a'; c.fillRect(0, h - 14, w, 14);
  });
  const curtainGeo = keep(new THREE.PlaneGeometry(BS[0] * .8, BH2 * .66, 8, 1));
  const curtain = new THREE.Mesh(curtainGeo, painted(curtainTex, { r: .9, side: THREE.DoubleSide })); curtain.position.set(0, BH2 * .4, -BS[2] * .36); booth.add(curtain);
  const cBase = Float32Array.from(curtainGeo.attributes.position.array);
  const flashBox = new THREE.Group(); flashBox.position.set(0, BH2 * .8, BS[2] * .36); booth.add(flashBox);
  flashBox.add(box(.05, .022, .018, mat('#2b2834', { r: .4, m: .3 }), [0, 0, 0]), box(.024, .012, .004, mat('#ffffff', { e: '#ffffff', ei: .2 }), [0, .0, -.011]));
  const flashMesh = flashBox.children[1];
  const flashLight = new THREE.PointLight(0xffffff, 0, .6, 1.4); flashLight.position.set(0, -.02, -.03); flashBox.add(flashLight);
  const boothLamp = []; const lampPart = boothProp.part('lamp'); if (lampPart) lampPart.traverse(o => { if (o.isMesh && o.material.emissive) boothLamp.push(o.material); });
  const flashGlow = kit.glow({ color: 0xffffff, size: .2, opacity: 0 }); flashGlow.position.set(0, 0, .01); flashBox.add(flashGlow);
  const slot = new THREE.Group(); slot.position.set(BS[0] / 2 + .004, BH2 * .5, .02); booth.add(slot);   // the print slot on its side
  slot.add(box(.006, .012, .05, mat('#2b2834', { r: .4 }), [0, 0, 0]));
  const boothSign = tex(512, 128, (c, w, h) => { c.fillStyle = RED; c.fillRect(0, 0, w, h); c.fillStyle = '#fff4e2'; kit.fitText(c, 'CHỤP ẢNH · 4 KIỂU', { x: 20, y: 10, w: w - 40, h: h - 20 }, { maxLines: 1, max: 80, font: SANS, weight: 900 }); });
  booth.add(mesh(new THREE.PlaneGeometry(BS[0] * .82, BS[0] * .2), painted(boothSign, { r: .5, glow: .6 }), [0, BH2 * .94, BS[2] / 2 + .004], false));
  for (let i = 0; i < 6; i++) bulb(booth, new THREE.Vector3(-BS[0] * .42 + i * BS[0] * .168, BH2 * 1.005, BS[2] / 2 + .006), .004, '#ffe7b0', 'booth');
  /* the strip it prints: four square photos on white, side by side (held up, it reads like a strip of film) */
  const STRIP = { w: .44, h: .118, f: .1 };
  const strip = new THREE.Group(); strip.name = 'strip'; strip.visible = false; stage.add(strip);
  strip.add(mesh(new THREE.BoxGeometry(STRIP.w, STRIP.h, .002), mat('#fffaf2', { r: .6, e: '#fffaf2', ei: .3 }), [0, 0, 0], false));
  const stripPhotos = [0, 1, 2, 3].map(i => {
    const ph = kit.photo({ frame: 'none', width: STRIP.f, aspect: 1, slot: i, of: 4, glow: .65, depth: .002 });
    ph.root.position.set(-STRIP.w / 2 + .008 + STRIP.f / 2 + i * (STRIP.f + .008), .004, .0022); strip.add(ph.root); return ph;
  });
  const stripTag = tex(512, 48, (c, w, h) => { c.fillStyle = '#e0475c'; c.font = `900 30px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♥ BUỒNG CHỤP ẢNH · ĐÊM NAY ♥', w / 2, h / 2); });
  strip.add(mesh(new THREE.PlaneGeometry(.2, .0095), painted(stripTag, { cut: true, glow: .4 }), [0, -STRIP.h / 2 + .0062, .0012], false));

  /* ── the projector on its podium at the front right, the beam to the screen, dust in it ── */
  const podium = new THREE.Group(); podium.position.set(PODIUM.x, FLOOR, PODIUM.z); podium.name = 'podium'; stage.add(podium);
  for (const x of [-1, 1]) for (const z of [-1, 1]) podium.add(box(.01, PODIUM.h, .01, woodDark, [x * .045, PODIUM.h / 2, z * .045]));
  podium.add(box(.12, .012, .12, wood, [0, PODIUM.h, 0]), box(.105, .008, .105, woodDark, [0, PODIUM.h * .35, 0]));
  for (const x of [-1, 1]) podium.add(box(.004, .14, .11, woodDark, [x * .045, PODIUM.h * .55, 0]));
  const crates = [[-.07, .028, .07, '#a87a52'], [.06, .022, .085, '#8a5a3c']];   // film cans and crates round its feet
  for (const [x, h, z, col] of crates) podium.add(box(.045, h * 2, .04, mat(col, { r: .8 }), [x, h, z]));
  podium.add(cyl(.022, .022, .008, mat('#b8bcc6', { r: .3, m: .8 }), [.075, .051, .072], 18), cyl(.022, .022, .008, mat('#b8bcc6', { r: .3, m: .8 }), [.075, .059, .072], 18));
  const proj = props.projector(); podium.add(proj.root); proj.root.position.set(0, PODIUM.h + .006, 0); night(proj.root);
  const screenMid = new THREE.Vector3(0, SCREEN.y0 + SCREEN.h / 2, SCREEN.z);
  podium.updateMatrixWorld(true);
  proj.root.rotation.y = Math.atan2(screenMid.x - PODIUM.x, screenMid.z - PODIUM.z);
  const lensLocal = proj.point('lens') || new THREE.Vector3(0, .03, .06);
  const reels = ['reel_front', 'reel_back'].map(n => proj.part(n)).filter(Boolean);
  const lensMats = []; const lensPart = proj.part('lens'); if (lensPart) lensPart.traverse(o => { if (o.isMesh && o.material.emissive) lensMats.push(o.material); });
  const lens = lensLocal.clone().add(podium.position);               // on the stage

  /* the beam: a pyramid from the lens to the picture's corners, brighter near the lens, its edges soft; additive */
  const beamMat = keep(new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 }, uColor: { value: new THREE.Color(GOLD).lerp(new THREE.Color('#fff4e0'), .6) }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uK, uT; uniform vec3 uColor; varying vec2 vUv;
      void main() { float along = vUv.y, edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
        float fall = pow(1.0 - along, 1.4) * smoothstep(1.0, 0.82, along) + 0.04;
        float shimmer = 0.85 + 0.15 * sin(vUv.x * 40.0 + uT * 3.0) * sin(along * 23.0 - uT * 1.7);
        float a = uK * fall * (0.25 + 0.75 * edge) * shimmer; gl_FragColor = vec4(uColor * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  }));
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => new THREE.Vector3(sx * SCREEN.w * .49, SCREEN.y0 + SCREEN.h * (sy > 0 ? .985 : .015), SCREEN.z + .004));
  const beamGeo = keep(new THREE.BufferGeometry()), bp = [], buv = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4];
    bp.push(lens.x, lens.y, lens.z, a.x, a.y, a.z, b.x, b.y, b.z); buv.push(.5, 0, 0, 1, 1, 1);
  }
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); beamGeo.setAttribute('uv', new THREE.Float32BufferAttribute(buv, 2));
  const beam = noHit(new THREE.Mesh(beamGeo, beamMat)); beam.renderOrder = 7; beam.frustumCulled = false; stage.add(beam);
  const lensGlow = kit.glow({ color: 0xfff1d0, size: .09, opacity: 0 }); lensGlow.position.copy(lens); stage.add(lensGlow);
  const dust = kit.particles({ max: 140, additive: true }); stage.add(dust.root);
  const vD = new THREE.Vector3();
  /** the beam's strength k (0 off … 1, more for a flash), T the act's time: dust drifts in it while it is on */
  function beamAt(k, T, dt) {
    beamMat.uniforms.uK.value = .2 * k; beamMat.uniforms.uT.value = T; beam.visible = k > .002;
    lensGlow.material.opacity = Math.min(1, .9 * k);
    reels.forEach(r => { r.rotation.x -= dt * 4 * Math.min(1, k); }); lensMats.forEach(m => { m.emissiveIntensity = 2.5 * k; });
    if (k > .05 && dt && rng() < dt * 45 * Math.min(1, k)) {
      const t = .08 + rng() * .8, c = corners[(rng() * 4) | 0];
      vD.copy(lens).lerp(screenMid, t).lerp(c, t * (rng() * .8));
      dust.emit({ x: vD.x, y: vD.y, z: vD.z, vx: (rng() - .5) * .012, vy: (rng() - .3) * .01, vz: (rng() - .5) * .012, sway: .004, color: '#fff3d6', size: .004 + rng() * .005, life: 2.5 + rng() * 2, shape: 'glow', twinkle: 3 });
    }
    dust.update(dt, T);
  }

  /* ── the puddles: soft shapes on the gravel; screen.js puts the screen's picture (and their shape) in them ── */
  const puddles = PUDDLES.map(p => {
    const m = noHit(new THREE.Mesh(keep(new THREE.PlaneGeometry(p.w, p.d)), keep(new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0, depthWrite: false }))));
    m.rotation.set(-Math.PI / 2, 0, p.a); m.position.set(p.x, FLOOR + .0015, p.z); m.renderOrder = 1; m.visible = false; stage.add(m);
    return m;
  });

  /* ── rain: streaks over the lot, splashes on the gravel ── */
  const rain = kit.particles({ max: 420, additive: true }), splash = kit.particles({ max: 160, additive: true });
  stage.add(rain.root, splash.root);
  function rainAt(k, T, dt) {
    if (k > .01 && dt) {
      const n = Math.floor(dt * 560 * k + rng());
      for (let i = 0; i < n; i++) {
        const x = (rng() - .5) * 1.4, z = -.48 + rng() * .86, y = .45 + rng() * .6;
        rain.emit({ x, y, z, vx: -.1, vy: -2.4, rot: Math.atan2(-.1, 2.4), color: rng() < .35 ? '#e8f0ff' : '#9fb8e8', size: .06 + rng() * .05, life: (y - FLOOR) / 2.4, shape: 'drop' });
      }
      const m = Math.floor(dt * 110 * k + rng());
      for (let i = 0; i < m; i++) splash.emit({ x: (rng() - .5) * 1.2, y: FLOOR + .004, z: -.45 + rng() * .8, vy: .04, color: '#c9d8ff', size: .009, grow: 1.8, life: .22, shape: 'glow' });
    }
    rain.update(dt, T); splash.update(dt, T);
  }

  /* the bulbs: their places on the stage now; one instanced draw for the glass, one for the halos */
  stage.updateMatrixWorld(true);
  const vB = new THREE.Vector3(), mB = new THREE.Matrix4(), cB = new THREE.Color();
  bulbs.forEach(b => { b.at = stage.worldToLocal(b.parent.localToWorld(vB.copy(b.local))).clone(); });
  const glass = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(1, 10, 8)), keep(new THREE.MeshBasicMaterial({ color: '#ffffff' })), bulbs.length);
  bulbs.forEach((b, i) => { glass.setMatrixAt(i, mB.makeScale(b.r, b.r, b.r).setPosition(b.at)); glass.setColorAt(i, cB.set('#6a5a5a')); });
  glass.raycast = () => {}; stage.add(glass);
  const halos = glowPoints(bulbs);
  /** lights by group: level(group, index) is a bulb's brightness 0..1 (a function, for chases and twinkles) */
  function bulbsAt(level) {
    bulbs.forEach((b, i) => {
      const k = Math.max(0, level(b.group, i));
      glass.setColorAt(i, cB.set('#5a4a52').lerp(cB2.set(b.color).lerp(WHITE, .45), Math.min(1, k))); halos.set(i, b.color, .75 * Math.min(1.4, k));
    });
    glass.instanceColor.needsUpdate = true; halos.done();
  }
  const cB2 = new THREE.Color(), WHITE = new THREE.Color('#ffffff');

  /* ── what a curtain does: sway (k), a breath of wind ── */
  const cPos = curtainGeo.attributes.position;
  function curtainAt(k, T) {
    for (let i = 0; i < cPos.count; i++) {
      const x = cBase[i * 3], y = cBase[i * 3 + 1], bottom = .5 - y / (BH2 * .66);
      cPos.setZ(i, .006 * Math.sin(x * 160 + T * 2) + k * .02 * bottom * Math.sin(T * 9 + x * 40));
    }
    cPos.needsUpdate = true;
  }

  return {
    FLOOR, SCREEN, BOOTH, GATE, STAND, PODIUM, env, night, sky, skyFlash, ground, wet, lens, screenMid,
    poles, sideLights, strings, bulbsAt, gate, gatePhoto, stand, menuPhoto, standLight, machine, candy,
    booth, boothProp, boothSize: BS, curtainAt, strip, STRIP, stripPhotos, paint: tex, flash: { box: flashBox, mesh: flashMesh, light: flashLight, glow: flashGlow }, slot,
    podium, projector: proj, beamAt, puddles, PUDDLES, rainAt, rain, lampsAt, boothLamp
  };
};
