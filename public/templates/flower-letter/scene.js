/* Thư hoa (a letter with flowers): a 3D act for the player (template kind "3d").
   Chapter 0: a pink envelope stands up on the card, its heart seal beats, the flap swings open, carnations grow and bloom
   out of it, butterflies come, and a note slides up with the card's words (slots.board). Chapter 1: a polaroid of the
   card's photo pops up beside the bouquet and hearts rise. The next tap opens the letter.
   The player calls NM_SCENE({anchor, card, tpl, THREE, onStop, dir}) and gets {play, pause, resume, turn, ready, clips,
   clip, modelError, dispose}. The card lies flat: the act stands up out of it (local +y is the card's +z) and faces the
   card's bottom edge (local +z), where a phone usually looks from. Everything is built here: nothing to download but the
   handwriting font (fonts/) and the card's own photo. */
window.NM_SCENE = ({ anchor, card, tpl, THREE, onStop, dir }) => {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = {
    out: t => 1 - Math.pow(1 - t, 3), inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2)
  };
  const rng = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(20);
  const owned = [];
  const keep = x => { owned.push(x); return x; };
  const words = String((card.slots && card.slots.board) || tpl.boardDefault || 'For you').trim();

  /* ── materials: soft toon shading, so it reads like an illustration ── */
  const ramp = new Uint8Array([150, 210, 255]);
  const gradient = keep(new THREE.DataTexture(ramp, ramp.length, 1, THREE.RedFormat));
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
  const mats = new Map();
  const toon = (color, extra) => {
    const k = `${color}:${JSON.stringify(extra || {})}`;
    if (!mats.has(k)) mats.set(k, keep(new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradient }, extra || {}))));
    return mats.get(k);
  };
  const mesh = (geo, mat) => { const m = new THREE.Mesh(keep(geo), mat); m.castShadow = true; return m; };
  const at = (o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); return o; };
  const C = { env: 0xf8c3c3, envDeep: 0xf2aaaa, liner: 0xfde4e0, seal: 0xeb5e62, paper: 0xfffaf2, ink: '#d4603f',
    pinkA: 0xf28aa3, pinkB: 0xf6a9bb, pinkC: 0xe8607f, stem: 0x5aa863, leaf: 0x6dbb6a, white: 0xffffff };

  /* ── the stage ── */
  const root = new THREE.Group();
  root.rotation.x = tpl.standing === false ? 0 : Math.PI / 2;
  const spin = new THREE.Group(); root.add(spin);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8b8c8, 1.15); root.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.45); key.position.set(.4, 1.2, 1); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = .1; key.shadow.camera.far = 4;
  key.shadow.camera.left = key.shadow.camera.bottom = -.7; key.shadow.camera.right = key.shadow.camera.top = .7; key.shadow.bias = -.0005;
  root.add(key, key.target); key.target.position.set(0, .15, 0);
  const catcher = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.1, .7)), keep(new THREE.ShadowMaterial({ opacity: .28 })));
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = .002; catcher.receiveShadow = true; spin.add(catcher);
  anchor.object3D.add(root);

  /* ── the envelope, standing up, its front to the phone ── */
  const W = .42, H = .27, D = .012;
  const envelope = at(new THREE.Group(), 0, .004, .03); spin.add(envelope);
  envelope.add(at(mesh(new THREE.BoxGeometry(W, H, D), toon(C.env)), 0, H / 2, -D / 2));
  envelope.add(at(mesh(new THREE.PlaneGeometry(W * .96, H * .96), toon(C.liner)), 0, H / 2, .0015));
  const pocketShape = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(W / 2, H * .66),
    new THREE.Vector2(0, H * .3), new THREE.Vector2(-W / 2, H * .66)]);
  const pocket = at(mesh(new THREE.ExtrudeGeometry(pocketShape, { depth: .004, bevelEnabled: false }), toon(C.envDeep)), 0, 0, .03);
  envelope.add(pocket);
  const sideShape = s => new THREE.Shape([new THREE.Vector2(s * W / 2, 0), new THREE.Vector2(s * W / 2, H * .95), new THREE.Vector2(s * W * .08, H * .45)]);
  [-1, 1].forEach(s => envelope.add(at(mesh(new THREE.ExtrudeGeometry(sideShape(s), { depth: .003, bevelEnabled: false }), toon(C.env)), 0, 0, .027)));
  const flap = at(new THREE.Group(), 0, H, .036); envelope.add(flap);
  const flapShape = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, -H * .55)]);
  flap.add(mesh(new THREE.ExtrudeGeometry(flapShape, { depth: .004, bevelEnabled: false }), toon(0xf6b6b8)));
  const heartShape = (s = 1) => {
    const h = new THREE.Shape(); h.moveTo(0, -.9 * s);
    h.bezierCurveTo(-1.2 * s, -.1 * s, -.9 * s, .9 * s, 0, .45 * s); h.bezierCurveTo(.9 * s, .9 * s, 1.2 * s, -.1 * s, 0, -.9 * s);
    return h;
  };
  const seal = at(mesh(new THREE.ExtrudeGeometry(heartShape(.022), { depth: .006, bevelEnabled: true, bevelSize: .003, bevelThickness: .003, bevelSegments: 2 }), toon(C.seal)), 0, -H * .5, .004);
  flap.add(seal);

  /* ── the note, inside the envelope until it slides up ── */
  const noteCanvas = document.createElement('canvas'); noteCanvas.width = 1024; noteCanvas.height = 640;
  const noteTex = keep(new THREE.CanvasTexture(noteCanvas)); noteTex.colorSpace = THREE.SRGBColorSpace; noteTex.anisotropy = 4;
  const HAND = '"Dancing Script", "Segoe Script", cursive';
  function paintNote() {
    const c = noteCanvas.getContext('2d'), w = 1024, h = 640;
    c.fillStyle = '#fffaf2'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(232,150,150,.35)'; c.lineWidth = 6; c.strokeRect(26, 26, w - 52, h - 52);
    c.fillStyle = 'rgba(235,110,120,.85)';
    for (const [x, y] of [[70, 70], [w - 70, 70], [70, h - 70], [w - 70, h - 70]]) { c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); }
    const lines = []; let size = 132;                       // as big as three lines allow
    for (let k = 0; k < 16; k++) {
      c.font = `700 ${size}px ${HAND}`; lines.length = 0; let line = '', ok = true;
      for (const wd of words.split(/\s+/)) {
        const t = line ? `${line} ${wd}` : wd;
        if (c.measureText(t).width <= w - 170) line = t; else { if (!line || lines.length === 2) { ok = false; break; } lines.push(line); line = wd; }
      }
      if (ok && c.measureText(line).width <= w - 170) { lines.push(line); break; }
      size *= .9;
    }
    c.fillStyle = C.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
    const lh = size * 1.15, y0 = h / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((ln, i) => c.fillText(ln, w / 2, y0 + i * lh));
    noteTex.needsUpdate = true;
  }
  paintNote();
  try {                                                      // the handwriting face, from this template's own fonts/
    const base = new URL(`${dir || '.'}/fonts/`, location.href).href;
    const faces = [['latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
      ['latin-ext', 'U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'],
      ['vietnamese', 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB']]
      .map(([n, range]) => new FontFace('Dancing Script', `url(${base}dancing-script-${n}-700-normal.woff2) format("woff2")`, { weight: '700', unicodeRange: range }));
    faces.forEach(f => document.fonts.add(f));
    Promise.all(faces.map(f => f.load())).then(paintNote, () => {});
  } catch (e) { /* no FontFace API: the fallback hand stays */ }
  const note = at(new THREE.Group(), 0, .1, .012); envelope.add(note);
  const paper = mesh(new THREE.BoxGeometry(.31, .194, .003), [toon(C.paper), toon(C.paper), toon(C.paper), toon(C.paper), keep(new THREE.MeshBasicMaterial({ map: noteTex })), toon(C.paper)]);
  note.add(paper);

  /* ── the bouquet: three carnations, leaves and baby's breath, growing out of the envelope ── */
  function ruffle(r, color, cup, seed) {                      // one ruffled layer of petals: a disc with a frilled, serrated edge
    const g = new THREE.CircleGeometry(r, 72, 0, Math.PI * 2), p = g.attributes.position, col = [];
    const a0 = seed * 7.1, base = new THREE.Color(color), tip = base.clone().lerp(new THREE.Color(0xffffff), .3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), d = Math.hypot(x, y) / r, th = Math.atan2(y, x);
      const edge = 1 + .09 * Math.sin(th * 23 + a0) + .05 * Math.sin(th * 41 + a0 * 2);
      p.setXYZ(i, x * edge, y * edge, cup * d * d + .012 * Math.sin(th * 9 + a0) * d * d);
      const c = base.clone().lerp(tip, d * .9); col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = mesh(g, toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2;
    return m;
  }
  function carnation(color, s) {
    const head = new THREE.Group(), layers = [];
    [[.075, .028], [.064, .034], [.05, .04], [.034, .03], [.02, .016]].forEach(([r, cup], i) => {
      const l = ruffle(r * s, color, cup * s, i + s * 10); l.position.y = i * .009 * s; l.rotation.z = i * 1.3; head.add(l); layers.push(l);
    });
    head.add(at(mesh(new THREE.ConeGeometry(.024 * s, .05 * s, 12), toon(C.stem)), 0, -.022 * s, 0)).children.slice(-1)[0].rotation.x = Math.PI;
    return { head, layers };
  }
  const bouquet = at(new THREE.Group(), 0, .05, -.01); envelope.add(bouquet);
  const FLOWERS = [[-.12, .4, -.02, C.pinkA, 1, .5], [.015, .47, -.04, C.pinkB, 1.12, -.05], [.13, .39, -.015, C.pinkC, .95, -.55]];
  const flowers = FLOWERS.map(([x, y, z, color, s, lean]) => {
    const { head, layers } = carnation(color, s);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x * .15, 0, 0), new THREE.Vector3(x * .55, y * .5, z * .5), new THREE.Vector3(x, y - .03, z)]);
    const stem = mesh(new THREE.TubeGeometry(curve, 20, .0045, 6, false), toon(C.stem)); bouquet.add(stem);
    const holder = at(new THREE.Group(), x, y - .02, z); holder.rotation.set(.35, 0, lean * .6); holder.add(head); bouquet.add(holder);
    return { stem, holder, head, layers, s, phase: rng() * 6 };
  });
  const leaves = [[-.07, .2, .6], [.08, .22, -.7], [-.02, .26, .15], [.1, .3, -.25]].map(([x, y, tilt], i) => {
    const l = at(mesh(new THREE.SphereGeometry(.05, 14, 10), toon(C.leaf)), x, y, .005 * i); l.scale.set(.32, 1.2, .1); l.rotation.z = tilt; bouquet.add(l); return l;
  });
  const sprigs = [[-.2, .33], [.21, .34], [-.06, .43], [.1, .45]].map(([x, y]) => {
    const g = at(new THREE.Group(), 0, 0, -.025); bouquet.add(g);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(x * .5, y * .55, 0), new THREE.Vector3(x, y, 0)]);
    g.add(mesh(new THREE.TubeGeometry(curve, 10, .002, 4, false), toon(C.stem)));
    for (let i = 0; i < 9; i++) g.add(at(mesh(new THREE.SphereGeometry(.007 + rng() * .004, 6, 5), toon(C.white)), x + (rng() - .5) * .07, y + (rng() - .3) * .05, (rng() - .5) * .03));
    return g;
  });

  /* ── butterflies ── */
  function wing(top, color) {
    const s = new THREE.Shape(), k = top ? 1 : -.75;
    s.moveTo(0, 0); s.bezierCurveTo(.02, .05 * k, .07, .07 * k, .075, .03 * k); s.bezierCurveTo(.08, 0, .04, -.005 * k, 0, 0);
    const g = new THREE.ShapeGeometry(s, 10), p = g.attributes.position, col = [], a = new THREE.Color(color), b = new THREE.Color(0xffffff);
    for (let i = 0; i < p.count; i++) { const d = clamp(Math.hypot(p.getX(i), p.getY(i)) / .08); const c = a.clone().lerp(b, d * .7); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return mesh(g, toon(0xffffff, { vertexColors: true, side: THREE.DoubleSide }));
  }
  const butterflies = [[0xf48fb1, .26, .5, 0], [0xffc1d6, .2, .56, 2.1], [0xf8a5c2, .3, .44, 4.2]].map(([color, r, y, ph]) => {
    const b = new THREE.Group(), L = new THREE.Group(), R = new THREE.Group();
    L.add(wing(true, color), wing(false, color)); R.add(wing(true, color), wing(false, color)); R.scale.x = -1;
    b.add(L, R, mesh(new THREE.CapsuleGeometry(.004, .03, 4, 8), toon(0x6d4c5c)));
    b.children[2].rotation.x = Math.PI / 2; b.scale.setScalar(.001); spin.add(b);
    return { b, L, R, r, y, ph };
  });

  /* ── the polaroid: the card's photos, in a white frame with a small heart. They are shuffled each play; while the act
     waits at the photo's stop they show in turn, fading from one to the next. ── */
  const polCanvas = document.createElement('canvas'); polCanvas.width = 512; polCanvas.height = 620;
  const polTex = keep(new THREE.CanvasTexture(polCanvas)); polTex.colorSpace = THREE.SRGBColorSpace; polTex.anisotropy = 4;
  const shuffle = list => { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
  const TURN = 2.8, FADE = .6;                                          // seconds a photo shows at the stop, and its fade to the next
  let photos = [], shown = 0, mix = 0, heldSince = null, from = 0;
  const drawPhoto = (c, img, x, y, s, alpha) => {
    const k = Math.max(s / img.width, s / img.height), w = img.width * k, h = img.height * k;
    c.save(); c.globalAlpha = alpha; c.beginPath(); c.rect(x, y, s, s); c.clip(); c.drawImage(img, x + (s - w) / 2, y + (s - h) / 2, w, h); c.restore();
  };
  function paintPolaroid() {
    const c = polCanvas.getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 620);
    const x = 30, y = 30, s = 452, n = photos.length;
    if (n) {
      drawPhoto(c, photos[shown % n], x, y, s, 1);
      if (mix > 0) drawPhoto(c, photos[(shown + 1) % n], x, y, s, mix);
    } else {
      c.fillStyle = '#fde4e0'; c.fillRect(x, y, s, s); c.fillStyle = '#f2aaaa'; c.font = '700 200px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♥', 256, 256);
    }
    c.strokeStyle = '#2b2440'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath();       // a heart doodled in pen
    c.moveTo(440, 586); c.bezierCurveTo(400, 556, 410, 520, 438, 532); c.bezierCurveTo(462, 515, 478, 552, 440, 586); c.stroke();
    polTex.needsUpdate = true;
  }
  paintPolaroid();
  const photoUrls = Array.isArray(card.photos) && card.photos.length ? card.photos : card.photo ? [card.photo] : [];
  const small = img => {                                                // a photo is kept 640 px at most: ten full-size ones fill a phone
    const k = Math.min(1, 640 / Math.max(img.width, img.height));
    if (k === 1) return img;
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  };
  const loads = shuffle(photoUrls).map(url => new Promise(res => {      // each one after the others as it comes in, so none moves
    const img = new Image(), late = setTimeout(() => res(false), 20000);
    img.crossOrigin = 'anonymous';
    img.onload = () => { clearTimeout(late); photos = [...photos, small(img)]; paintPolaroid(); res(true); };
    img.onerror = () => { clearTimeout(late); res(false); };
    img.src = url;
  }));
  /** the act may start once the first photo is in (or none can come, or 8 s went by): the others come in while it plays */
  const photoReady = Promise.race([new Promise(res => {
    let left = loads.length;
    if (!left) res();
    loads.forEach(p => p.then(ok => { if (ok || --left === 0) res(); }));
  }), new Promise(r => setTimeout(r, 8000))]);
  /** at the photo's stop: the photos in turn, from the one shown when the act stopped there */
  function turnPhotos(held, T) {
    if (photos.length < 2 || !held) {
      heldSince = null;
      if (mix > 0) { if (mix >= .5) shown += 1; mix = 0; paintPolaroid(); }   // left in the middle of a fade: settle on one photo
      return;
    }
    if (heldSince === null) { heldSince = T; from = shown; }
    const k = (T - heldSince) / TURN, step = Math.floor(k), into = (k - step) * TURN;
    const m = into > TURN - FADE ? (into - TURN + FADE) / FADE : 0;
    if (from + step !== shown || Math.abs(m - mix) > .02 || (m === 0 && mix !== 0)) { shown = from + step; mix = m; paintPolaroid(); }
  }
  const polaroid = at(new THREE.Group(), .3, 0, .13); polaroid.scale.setScalar(.001); spin.add(polaroid);
  const polCard = at(mesh(new THREE.BoxGeometry(.2, .242, .004), [toon(C.white), toon(C.white), toon(C.white), toon(C.white), keep(new THREE.MeshBasicMaterial({ map: polTex })), toon(C.white)]), 0, .133, 0);
  polaroid.add(polCard);

  /* ── particles: petals drifting down, hearts rising ── */
  function sprite(draw) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = '#fff'; draw(c); return keep(new THREE.CanvasTexture(cv)); }
  const TEX = {
    petal: sprite(c => { c.beginPath(); c.ellipse(32, 32, 14, 24, .5, 0, 7); c.fill(); }),
    heart: sprite(c => { c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(0, 32, 10, 6, 32, 20); c.bezierCurveTo(54, 6, 64, 32, 32, 54); c.fill(); })
  };
  function particles(n, tex, size) {
    const g = keep(new THREE.BufferGeometry()), pos = new Float32Array(n * 3).fill(-99), col = new Float32Array(n * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, keep(new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, alphaTest: .3, depthWrite: false })));
    pts.frustumCulled = false; spin.add(pts);
    const P = Array.from({ length: n }, () => ({ life: 0, v: new THREE.Vector3(), g: 0, sway: 0 })); let next = 0;
    return {
      emit(x, y, z, vx, vy, vz, color, life, gravity, sway) { const i = next; next = (next + 1) % n; Object.assign(P[i], { life, g: gravity, sway }); P[i].v.set(vx, vy, vz); pos.set([x, y, z], i * 3); const c = new THREE.Color(color); col.set([c.r, c.g, c.b], i * 3); },
      update(dt, T) {
        for (let i = 0; i < n; i++) {
          const p = P[i]; if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { pos[i * 3 + 1] = -99; continue; }
          p.v.y += p.g * dt; pos[i * 3] += (p.v.x + p.sway * Math.sin(T * 3 + i)) * dt; pos[i * 3 + 1] += p.v.y * dt; pos[i * 3 + 2] += p.v.z * dt;
          if (pos[i * 3 + 1] < .003) { pos[i * 3 + 1] = .003; p.v.set(0, 0, 0); p.g = 0; p.sway = 0; }
        }
        g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
      },
      clear() { P.forEach(p => { p.life = 0; }); pos.fill(-99); g.attributes.position.needsUpdate = true; }
    };
  }
  const petals = particles(70, TEX.petal, .028), hearts = particles(30, TEX.heart, .05);

  /* ── the chapters, as poses at a time ── */
  const DUR = [5.4, 3.2];
  function poseOpen(t, T) {                                  // chapter 0 at time t (seconds); T: time since the act began, for idle sway
    const e = ease.back(seg(t, 0, .6)); envelope.scale.setScalar(Math.max(.001, e)); envelope.position.y = .004 + .05 * (1 - ease.out(seg(t, 0, .6)));
    const beat = t < 1 ? 1 + .14 * Math.max(0, Math.sin(t * Math.PI * 3.2)) : 1;
    const open = ease.inOut(seg(t, 1.0, 1.9));
    seal.scale.setScalar(Math.max(.001, beat * (1 - seg(t, 1.0, 1.3))));
    flap.rotation.x = -Math.PI * 1.12 * open;                 // over the top and back, behind the note
    const grow = ease.out(seg(t, 1.5, 2.6));
    bouquet.scale.set(1, Math.max(.001, grow), 1); bouquet.visible = grow > 0;
    flowers.forEach((f, i) => {
      const b = ease.back(seg(t, 1.9 + i * .18, 3.0 + i * .18));
      f.head.scale.setScalar(Math.max(.001, b) / Math.max(.001, grow));      // the head keeps its shape while the stems grow
      f.layers.forEach((l, j) => { l.scale.setScalar(lerp(.35, 1, ease.out(seg(t, 2.0 + i * .18 + j * .06, 3.1 + i * .18 + j * .06)))); });
      f.holder.rotation.y = .12 * Math.sin(T * .9 + f.phase);
    });
    leaves.forEach((l, i) => { l.scale.y = 1.2 * Math.max(.001, ease.out(seg(t, 1.7 + i * .1, 2.7 + i * .1))); });
    sprigs.forEach((s, i) => { s.scale.setScalar(Math.max(.001, ease.out(seg(t, 2.3 + i * .12, 3.2 + i * .12)))); });
    const up = ease.out(seg(t, 2.7, 3.9));
    note.position.set(0, lerp(.1, .37, up) + .006 * Math.sin(T * 1.6) * up, lerp(.012, .045, up)); note.rotation.set(-.32 * up, 0,                        // leaning back, so it reads from above too
       .03 * Math.sin(T * .8) * up);
    butterflies.forEach((b, i) => {
      const k = ease.out(seg(t, 2.9 + i * .3, 4.2 + i * .3)), a = T * (.9 + i * .15) + b.ph, r = b.r * lerp(2.2, 1, k);
      b.b.scale.setScalar(Math.max(.001, .9 * Math.min(1, k * 3)));
      b.b.position.set(r * Math.cos(a), b.y + .04 * Math.sin(T * 2.3 + b.ph) + .2 * (1 - k), -.05 + r * .55 * Math.sin(a));
      b.b.rotation.set(0, Math.atan2(-Math.sin(a), -Math.cos(a) * .55) + Math.PI / 2, .2 * Math.sin(T * 3 + i));
      const flapW = .25 + 1.05 * Math.abs(Math.sin(T * 14 + i)); b.L.rotation.y = flapW; b.R.rotation.y = -flapW;
    });
  }
  function posePhoto(t, T) {                                 // chapter 1: the photo pops up beside the bouquet
    const p = ease.back(seg(t, 0, .9)); polaroid.scale.setScalar(Math.max(.001, p));
    polaroid.position.y = .03 * (1 - ease.out(seg(t, 0, .9))) + .008 * Math.sin(T * 1.4);
    polaroid.rotation.set(-.24, -.3, .1 + .03 * Math.sin(T * .9));
  }

  const state = { chapter: -1, t: 0, T: 0, paused: true, stopped: true, loop: null, fired: {} };
  const once = k => { if (state.fired[k]) return false; state.fired[k] = true; return true; };
  const resetFx = () => { petals.clear(); hearts.clear(); state.fired = {}; };
  let raf = 0, disposed = false, last = performance.now();
  function tick(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!state.paused) { state.t += dt; state.T += dt; }
    const ch = state.loop != null ? state.loop : state.chapter, t = state.loop != null ? state.t % DUR[ch] : state.t;
    if (state.loop != null && t < dt) resetFx();
    if (ch === 0) { poseOpen(t, state.T); polaroid.scale.setScalar(.001); }
    else if (ch === 1) { poseOpen(99, state.T); posePhoto(t, state.T); }
    else poseOpen(0, state.T);
    if (!state.paused) {
      if ((ch === 0 && t > 3) || ch === 1) {
        if (rng() < dt * 4) { const f = flowers[(rng() * 3) | 0], w = f.holder.getWorldPosition(new THREE.Vector3()), l = spin.worldToLocal(w);
          petals.emit(l.x, l.y, l.z, (rng() - .5) * .04, .02, .03, [0xf7a1b5, 0xfbc4cf, 0xee7f98][(rng() * 3) | 0], 6, -.05, .05); }
      }
      if (ch === 1 && t > .5 && t < 2.6 && rng() < dt * 9) hearts.emit(.3 + (rng() - .5) * .12, .26, .13, (rng() - .5) * .04, .12 + rng() * .06, 0, ['#ff6f91', '#f48fb1', '#ffffff'][(rng() * 3) | 0], 2.2, .01, .05);
      petals.update(dt, state.T); hearts.update(dt, state.T);
    }
    if (state.loop == null && !state.stopped && !state.paused && state.t >= DUR[state.chapter]) { state.stopped = true; onStop(state.chapter); }
    turnPhotos(state.loop == null && ch === 1 && state.stopped, state.T);
    if (!disposed) raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    play(i) { if (i === 0) { resetFx(); photos = shuffle(photos); shown = from = 0; mix = 0; heldSince = null; paintPolaroid(); } state.loop = null; state.chapter = i; state.t = 0; state.stopped = false; state.paused = false; last = performance.now(); },
    pause() { state.paused = true; },
    resume() { state.paused = false; last = performance.now(); },
    turn(rad) { spin.rotation.y += rad; },
    repaint: paintNote,
    ready: photoReady,
    clips: () => [{ name: 'open', duration: DUR[0] }, { name: 'photo', duration: DUR[1] }],
    clip(name) { const i = name === 'open' ? 0 : name === 'photo' ? 1 : -1; if (i < 0) return false; resetFx(); state.loop = i; state.t = 0; state.paused = false; state.stopped = true; return true; },
    modelError: () => null,
    dispose() {
      disposed = true; cancelAnimationFrame(raf); anchor.object3D.remove(root);
      root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isLight && o.dispose) o.dispose(); });
      owned.forEach(x => x.dispose && x.dispose());
    }
  };
};
