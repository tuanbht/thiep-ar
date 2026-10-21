/* Showtime: a 15-second act for a 3D template ("kind": "3d", "scene": "../_acts/showtime.js", "character": "character.js").
   A small character pops out of the card, says hello, runs a lap round the card, dances, does its own trick, cheers while
   the card's words come up on a board, and hands over the letter. One stop (chapters [0]): the next tap opens the letter.
   The buyer's photos come up with the board, in a polaroid on a post across from it, and show in turn (photos.js).
   The player calls NM_SCENE({anchor, card, tpl, THREE, onStop, dir}) and gets {play, pause, resume, turn, ready, clips,
   clip, modelError, dispose}. The card lies flat: the act stands up out of it (local +y is the card's +z) and faces the
   card's bottom edge (local +z), where a phone usually looks from.

   The character lives in the template's own file, loaded once by URL:
     (window.NM_CHARACTERS = window.NM_CHARACTERS || {})[document.currentScript.src] = (THREE, kit) => ({
       group,              feet on y = 0, facing +z, any size: the act scales it to template.json "height" card widths
       parts,              { name: Object3D } everything a pose moves; their rest pose is put back before every frame
       pose: { idle, pop, hello, run, dance, trick, cheer, present },   each (ctx) => void, ctx = { t, k, T, phase, speed }
                           t: seconds into the act, k: 0..1 through it, T: seconds since the show began,
                           phase: 0..1 through a stride (run), speed: card widths a second (run),
                           yaw: the act's own turn of the whole character (radians; + is towards +x), actor: that group
       trick: { seconds, move(k, { height }) => ({ x, y, z, yaw, pitch, roll, sx, sy }) },   the trick's own path (card
                           widths, radians), all optional; height is the character's height in card widths
       lean: 1,            how far the act tips it forward while it runs (0 for four legs: it stays level)
       stride: .55,        one stride of its run in heights (a dust puff where each foot lands); bounding gaits want more
       sparkle: '#ffd166', confetti: ['#…', …]                          its colours for the effects (optional)
     })
   kit (makeKit below) has toon materials with outlines, shapes, eyes, a smile, a rig and easing helpers. */
window.NM_SCENE = ({ anchor, card, tpl, THREE, onStop, dir }) => {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = {
    out: t => 1 - Math.pow(1 - t, 3), inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
    elastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1),
    smooth: t => t * t * (3 - 2 * t)
  };
  const rng = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(11);
  const disposables = [];
  const keep = x => { disposables.push(x); return x; };

  /* ── the kit characters are built with ── */
  function makeKit() {
    const ramp = new Uint8Array([90, 170, 255]);
    const gradient = keep(new THREE.DataTexture(ramp, ramp.length, 1, THREE.RedFormat));
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
    const mats = new Map(), ink = keep(new THREE.MeshBasicMaterial({ color: 0x2b2440, side: THREE.BackSide }));
    const toon = (color, extra) => {
      const key = `${color}:${JSON.stringify(extra || {})}`;
      if (!mats.has(key)) mats.set(key, keep(new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradient }, extra || {}))));
      return mats.get(key);
    };
    const outline = (mesh, w = .018) => {           // an inked edge: the same shape, a little bigger, drawn inside out
      mesh.geometry.computeBoundingSphere();
      const { radius, center } = mesh.geometry.boundingSphere, s = 1 + w / (radius || 1), o = new THREE.Mesh(mesh.geometry, ink);
      o.scale.setScalar(s); o.position.copy(center).multiplyScalar(1 - s);   // grown about the shape's own centre, even when that is off the origin
      o.castShadow = false; o.userData.outline = true; mesh.add(o);
      return mesh;
    };
    const shape = (geo, color, line = .018, extra) => {
      const m = new THREE.Mesh(keep(geo), toon(color, extra)); m.castShadow = true;
      return line ? outline(m, line) : m;
    };
    const at = (o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); return o; };
    const rot = (o, x = 0, y = 0, z = 0) => { o.rotation.set(x, y, z); return o; };
    const scl = (o, x = 1, y = x, z = x) => { o.scale.set(x, y, z); return o; };
    return {
      THREE, toon, outline, at, rot, scl, ease, clamp, lerp, seg,
      group: (...kids) => { const g = new THREE.Group(); kids.forEach(k => g.add(k)); return g; },
      pivot: (x = 0, y = 0, z = 0) => at(new THREE.Group(), x, y, z),
      ball: (r, color, sx = 1, sy = 1, sz = 1, line) => scl(shape(new THREE.SphereGeometry(r, 28, 20), color, line), sx, sy, sz),
      capsule: (r, len, color, line) => shape(new THREE.CapsuleGeometry(r, len, 8, 20), color, line),
      cyl: (rt, rb, h, color, line, seg = 24) => shape(new THREE.CylinderGeometry(rt, rb, h, seg), color, line),
      cone: (r, h, color, line, seg = 24) => shape(new THREE.ConeGeometry(r, h, seg), color, line),
      torus: (r, tube, color, arc = Math.PI * 2, line = 0) => shape(new THREE.TorusGeometry(r, tube, 10, 32, arc), color, line),
      box: (w, h, d, color, line) => shape(new THREE.BoxGeometry(w, h, d), color, line),
      /** A shiny cartoon eye: a dark oval with two highlights. */
      eye: (w, h, color = 0x2b2440) => {
        const g = new THREE.Group();
        g.add(scl(new THREE.Mesh(keep(new THREE.SphereGeometry(1, 24, 18)), toon(color)), w, h, w * .45));
        g.add(at(scl(new THREE.Mesh(keep(new THREE.SphereGeometry(1, 12, 10)), toon(0xffffff, { toneMapped: false })), w * .36, h * .3, w * .2), -w * .3, h * .38, w * .36));
        g.add(at(scl(new THREE.Mesh(keep(new THREE.SphereGeometry(1, 10, 8)), toon(0xffffff, { toneMapped: false })), w * .16, h * .14, w * .1), w * .28, -h * .3, w * .4));
        return g;
      },
      blush: (r, color = 0xff7aa2) => scl(new THREE.Mesh(keep(new THREE.SphereGeometry(r, 16, 12)), keep(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .55, depthWrite: false }))), 1, .55, .25),
      /** A smile: an arc of tube, open side up. */
      smile: (w, color = 0x2b2440, open = .9) => {
        const m = new THREE.Mesh(keep(new THREE.TorusGeometry(w, w * .16, 8, 20, Math.PI * open)), toon(color));
        m.rotation.z = Math.PI + (Math.PI - Math.PI * open) / 2; return m;
      },
      /** Rest transforms of the parts a pose moves, put back every frame so poses never leak into each other. */
      rig(parts) {
        const rest = Object.entries(parts).map(([n, o]) => [o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]);
        return {
          reset() { for (const [o, p, q, s] of rest) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(s); } },
          capture() { return rest.map(([o]) => [o.position.clone(), o.quaternion.clone(), o.scale.clone()]); },
          blend(snap, w) {
            rest.forEach(([o], i) => {
              const [p, q, s] = snap[i];
              o.position.lerpVectors(p, o.position, w); o.quaternion.slerpQuaternions(q, o.quaternion, w); o.scale.lerpVectors(s, o.scale, w);
            });
          }
        };
      },
      wave: (T, hz, ph = 0) => Math.sin(2 * Math.PI * hz * T + ph)
    };
  }
  const kit = makeKit();

  /* ── the stage: lights, a shadow on the card, the board and the letter ── */
  const root = new THREE.Group();
  root.rotation.x = tpl.standing === false ? 0 : Math.PI / 2;
  const spin = new THREE.Group(); root.add(spin);                    // a finger turns this: the whole act, 360 degrees
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb7a9c9, 1.15); root.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.45); key.position.set(.5, 1.3, .9); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = .1; key.shadow.camera.far = 4;
  key.shadow.camera.left = key.shadow.camera.bottom = -.7; key.shadow.camera.right = key.shadow.camera.top = .7; key.shadow.bias = -.0005;
  root.add(key, key.target); key.target.position.set(0, .1, 0);
  const catcher = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.1, .7)), keep(new THREE.ShadowMaterial({ opacity: .32 })));
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = .002; catcher.receiveShadow = true; spin.add(catcher);

  const FONT = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';
  const boardCanvas = document.createElement('canvas'); boardCanvas.width = 512; boardCanvas.height = 320;
  const boardTex = keep(new THREE.CanvasTexture(boardCanvas)); boardTex.colorSpace = THREE.SRGBColorSpace;
  function paintBoard() {                                            // the card's words, as big as three lines allow
    const c = boardCanvas.getContext('2d'), W = 512, H = 320, accent = tpl.boardColor || '#ff6f91';
    c.fillStyle = accent; c.fillRect(0, 0, W, H); c.fillStyle = '#fffaf0'; c.fillRect(16, 16, W - 32, H - 32);
    c.fillStyle = accent; for (let x = 30; x < W - 20; x += 36) { c.beginPath(); c.arc(x, 30, 5, 0, 7); c.fill(); c.beginPath(); c.arc(x + 18, H - 30, 5, 0, 7); c.fill(); }
    const text = String((card.slots && card.slots.board) || tpl.boardDefault || 'Congratulations!').trim().toUpperCase();
    const words = text.split(/\s+/); let size = 110, lines = null;
    for (let k = 0; k < 14 && !lines; k++) {
      c.font = `800 ${size}px ${FONT}`; const out = []; let line = '', ok = true;
      for (const w of words) { const t = line ? `${line} ${w}` : w; if (c.measureText(t).width <= W - 90) line = t; else { if (!line || out.length === 2) { ok = false; break; } out.push(line); line = w; } }
      if (ok && c.measureText(line).width <= W - 90) { out.push(line); lines = out; } else size *= .88;
    }
    lines = lines || [text]; c.fillStyle = '#2b2440'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const lh = size * 1.02, y0 = H / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((ln, i) => c.fillText(ln, W / 2, y0 + i * lh, W - 80));
    boardTex.needsUpdate = true;
  }
  paintBoard();
  try { document.fonts.load(`800 40px ${FONT}`).then(paintBoard); } catch (e) { /* no font loading API: the fallback face stays */ }
  const board = kit.pivot(.3, 0, -.06); board.rotation.y = -.35; board.scale.setScalar(.001); spin.add(board);
  board.add(kit.at(kit.cyl(.009, .009, .26, 0x8b5a2b, .006), 0, .13, 0));
  const panel = new THREE.Mesh(keep(new THREE.BoxGeometry(.3, .19, .012)), [kit.toon(0xfffaf0), kit.toon(0xfffaf0), kit.toon(0xfffaf0), kit.toon(0xfffaf0), keep(new THREE.MeshBasicMaterial({ map: boardTex })), kit.toon(0xfffaf0)]);
  panel.position.y = .33; panel.castShadow = true; kit.outline(panel, .008); board.add(panel);

  /** templates/_acts/photos.js, the buyer's photos in polaroids, loaded from beside this act (null if it cannot be) */
  const photosKit = () => new Promise(res => {
    if (window.NM_PHOTOS) return res(window.NM_PHOTOS);
    const s = document.createElement('script');
    s.src = new URL('photos.js', new URL(tpl.scene || '../_acts/showtime.js', new URL(`${dir || '.'}/`, location.href))).href;
    s.onload = () => res(window.NM_PHOTOS || null); s.onerror = () => res(null);
    document.head.appendChild(s);
  });
  const hasPhotos = (Array.isArray(card.photos) && card.photos.length > 0) || !!card.photo;
  /* the photos: a polaroid on a post at the back left, across from the board and up with it; none without photos */
  let photos = null;
  const photoPost = kit.pivot(-.36, 0, -.16); photoPost.rotation.y = .45; photoPost.scale.setScalar(.001); spin.add(photoPost);
  if (hasPhotos) photosKit().then(make => {
    if (!make || disposed) return;
    photos = make({ THREE, card });
    const p = photos.polaroid({ width: .24 });
    p.root.position.set(0, .2, .012); photoPost.add(p.root);
    photoPost.add(kit.at(kit.cyl(.009, .009, .26, 0x8b5a2b, .006), 0, .13, 0));
  });

  const sealCanvas = document.createElement('canvas'); sealCanvas.width = sealCanvas.height = 128;
  { const c = sealCanvas.getContext('2d'); c.fillStyle = '#c8372d'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill();
    c.fillStyle = '#ffe3d6'; c.font = `800 ${String(card.seal || '').length > 2 ? 40 : 54}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(card.seal || '♥').slice(0, 3), 64, 68); }
  const sealTex = keep(new THREE.CanvasTexture(sealCanvas)); sealTex.colorSpace = THREE.SRGBColorSpace;
  const letter = kit.pivot(-.22, 0, .1); letter.visible = false; spin.add(letter);
  const env = kit.group(kit.box(.17, .11, .008, 0xfff3dc, .006)); env.position.y = 0; letter.add(env);
  const flap = new THREE.Mesh(keep(new THREE.ConeGeometry(.12, .07, 3)), kit.toon(0xf3e2bf)); flap.rotation.z = Math.PI; flap.scale.z = .05; flap.position.set(0, .02, .005); env.add(flap);
  env.add(kit.at(new THREE.Mesh(keep(new THREE.CircleGeometry(.024, 24)), keep(new THREE.MeshBasicMaterial({ map: sealTex }))), 0, -.005, .006));
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
  { const c = glowCanvas.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }
  const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(new THREE.CanvasTexture(glowCanvas)), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  glow.scale.setScalar(.34); letter.add(glow);

  /* ── effects: sprite particles (stars, hearts, notes, confetti), dust puffs, confetti cannons ── */
  function spriteTexture(draw) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    c.fillStyle = '#fff'; draw(c); const t = keep(new THREE.CanvasTexture(cv)); return t;
  }
  const TEX = {
    star: spriteTexture(c => { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 30, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(32 + r * Math.cos(a), 32 + r * Math.sin(a)); } c.fill(); }),
    heart: spriteTexture(c => { c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(0, 32, 10, 6, 32, 20); c.bezierCurveTo(54, 6, 64, 32, 32, 54); c.fill(); }),
    note: spriteTexture(c => { c.beginPath(); c.ellipse(22, 46, 12, 9, -.4, 0, 7); c.fill(); c.fillRect(31, 10, 5, 38); c.beginPath(); c.moveTo(36, 10); c.quadraticCurveTo(54, 18, 48, 34); c.quadraticCurveTo(48, 22, 36, 20); c.fill(); }),
    bit: spriteTexture(c => c.fillRect(14, 22, 36, 20)),
    dot: spriteTexture(c => { c.beginPath(); c.arc(32, 32, 26, 0, 7); c.fill(); })
  };
  function particles(n, tex, size, additive) {
    const g = keep(new THREE.BufferGeometry()), pos = new Float32Array(n * 3).fill(-99), col = new Float32Array(n * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = keep(new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, alphaTest: .25, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; spin.add(pts);
    const P = Array.from({ length: n }, () => ({ life: 0, max: 1, v: new THREE.Vector3(), c: new THREE.Color(), g: 0, drag: 0, flutter: 0 }));
    let next = 0;
    return {
      emit(x, y, z, vx, vy, vz, color, life, gravity = -.9, drag = .6, flutter = 0) {
        const i = next; next = (next + 1) % n; const p = P[i];
        p.life = p.max = life; p.v.set(vx, vy, vz); p.c.set(color); p.g = gravity; p.drag = drag; p.flutter = flutter; pos.set([x, y, z], i * 3);
      },
      update(dt, T) {
        for (let i = 0; i < n; i++) {
          const p = P[i]; if (p.life <= 0) continue;
          p.life -= dt; if (p.life <= 0) { pos[i * 3 + 1] = -99; continue; }
          p.v.y += p.g * dt; p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt));
          pos[i * 3] += (p.v.x + p.flutter * Math.sin(T * 7 + i)) * dt; pos[i * 3 + 1] += p.v.y * dt; pos[i * 3 + 2] += p.v.z * dt;
          if (pos[i * 3 + 1] < .003 && p.g < 0) { pos[i * 3 + 1] = .003; p.v.set(0, 0, 0); }   // confetti settles on the card
          const f = additive ? Math.min(1, p.life / p.max * 1.6) : 1; col.set([p.c.r * f, p.c.g * f, p.c.b * f], i * 3);
        }
        g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
      },
      clear() { P.forEach(p => { p.life = 0; }); pos.fill(-99); g.attributes.position.needsUpdate = true; }
    };
  }
  const FX = { stars: particles(140, TEX.star, .05, true), hearts: particles(40, TEX.heart, .075, false), notes: particles(30, TEX.note, .08, false),
    confetti: particles(260, TEX.bit, .03, false), dots: particles(160, TEX.dot, .02, true) };
  const puffs = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(keep(new THREE.SphereGeometry(.02, 10, 8)), keep(new THREE.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: .8, gradientMap: kit.toon(0).gradientMap }))); m.visible = false; spin.add(m); return { m, life: 0 }; });
  let puffNext = 0;
  const puff = (x, z) => { const p = puffs[puffNext]; puffNext = (puffNext + 1) % puffs.length; p.life = .5; p.m.visible = true; p.m.position.set(x, .015, z); p.m.scale.setScalar(.6); };
  const cannons = [-1, 1].map(s => { const c = kit.pivot(s * .4, 0, -.2); c.rotation.set(-.35, 0, -s * .5); c.scale.setScalar(.001); c.add(kit.at(kit.cone(.028, .07, 0xffd166, .006, 16), 0, .035, 0)); c.add(kit.at(kit.cyl(.03, .03, .012, 0xff6f91, .004, 16), 0, .002, 0)); spin.add(c); return c; });

  /* ── the actor: the engine moves this group, the character's poses move its parts ── */
  const actor = new THREE.Group(); spin.add(actor);
  const squash = new THREE.Group(); actor.add(squash);
  anchor.object3D.add(root);

  let ch = null, rig = null, loadError = null, markReady;
  const ready = new Promise(r => { markReady = r; });
  const reg = window.NM_CHARACTERS = window.NM_CHARACTERS || {};
  const charUrl = new URL(tpl.character || 'character.js', new URL(`${dir || '.'}/`, location.href)).href;
  const fromRegistry = () => {
    const make = reg[charUrl]; if (!make) throw new Error(`${charUrl} did not register a character`);
    ch = make(THREE, kit); rig = kit.rig(ch.parts || {});
    const box = new THREE.Box3().setFromObject(ch.group), h = box.max.y - box.min.y || 1;
    ch.group.scale.multiplyScalar((tpl.height || .36) / h); ch.group.position.y = -box.min.y * (tpl.height || .36) / h;
    ch.group.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; });
    squash.add(ch.group); markReady();
  };
  if (reg[charUrl]) { try { fromRegistry(); } catch (e) { loadError = e.message; markReady(); } }
  else {
    const s = document.createElement('script'); s.src = charUrl;
    s.onload = () => { try { fromRegistry(); } catch (e) { loadError = e.message; markReady(); } };
    s.onerror = () => { loadError = `${tpl.character || 'character.js'} could not be loaded`; markReady(); };
    document.head.appendChild(s);
  }

  /* ── the fifteen seconds ── */
  const ACTS = () => [['pop', 1.2], ['hello', 1.2], ['run', 3.6], ['dance', 3.2], ['trick', (ch && ch.trick && ch.trick.seconds) || 1.8], ['cheer', 2.2], ['present', 1.8]];
  const RX = .33, RZ = .19;                                          // the lap: an ellipse inside the card
  const lap = k => {                                                 // out to the right edge, round the card, back to the middle
    if (k < .12) { const u = ease.inOut(k / .12); return [RX * u, 0]; }
    if (k > .88) { const u = ease.inOut((k - .88) / .12); return [RX * (1 - u), 0]; }
    const a = 2 * Math.PI * (k - .12) / .76; return [RX * Math.cos(a), -RZ * Math.sin(a)];
  };
  const show = { T: 0, act: -1, actStart: 0, stopped: true, paused: true, loop: null, yaw: 0, dist: 0, prev: [0, 0], snap: null, fired: {} };
  const once = name => { if (show.fired[name]) return false; show.fired[name] = true; return true; };
  const sparkleColor = () => new THREE.Color((ch && ch.sparkle) || '#ffd166');
  const confettiColors = () => (ch && ch.confetti) || ['#ff6f91', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ffffff'];
  const burst = (x, y, z, n, speed, tex = 'stars', color) => {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, u = rng() * Math.PI - Math.PI / 2, s = speed * (.5 + rng() * .5);
      FX[tex].emit(x, y, z, Math.cos(a) * Math.cos(u) * s, Math.abs(Math.sin(u)) * s + speed * .3, Math.sin(a) * Math.cos(u) * s, color || sparkleColor(), .7 + rng() * .5, -.6, 1.2);
    }
  };
  const firework = (x, y, z) => {
    const c = confettiColors()[(rng() * 5) | 0];
    for (let i = 0; i < 46; i++) { const a = rng() * Math.PI * 2, b = Math.acos(2 * rng() - 1), s = .32 + rng() * .08;
      FX.dots.emit(x, y, z, Math.sin(b) * Math.cos(a) * s, Math.cos(b) * s, Math.sin(b) * Math.sin(a) * s, c, 1 + rng() * .4, -.25, 1.4); }
  };
  const cannonFire = s => {
    const cols = confettiColors();
    for (let i = 0; i < 110; i++) FX.confetti.emit(s * .4, .06, -.2, -s * (.15 + rng() * .45), .9 + rng() * .7, .1 + rng() * .35, cols[(rng() * cols.length) | 0], 3 + rng(), -1.1, 1.6, .25);
  };

  function stagePose(name, t, k, dt) {                              // where the actor is, which way it faces, how it jumps
    let x = 0, y = 0, z = 0, yaw = 0, pitch = 0, roll = 0, sx = 1, sy = 1, run = null;
    if (name === 'pop') {
      const s = ease.elastic(clamp(t / .75)); actor.scale.setScalar(Math.max(.001, s));
      if (t < .04 && once('pop')) burst(0, .08, 0, 34, .55);
    } else actor.scale.setScalar(1);
    if (name === 'run') {
      const [px, pz] = lap(k), [qx, qz] = show.prev, vx = (px - qx) / Math.max(dt, 1e-3), vz = (pz - qz) / Math.max(dt, 1e-3), sp = Math.hypot(vx, vz);
      x = px; z = pz; show.dist += Math.hypot(px - qx, pz - qz);
      if (sp > .05) { const want = Math.atan2(vx, vz); let d = want - show.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); show.yaw += d * Math.min(1, dt * 14); roll = clamp(-d * 1.2, -.35, .35); }
      yaw = show.yaw; pitch = clamp(sp * .5, 0, .22) * (ch.lean ?? 1);   // a runner leans in; a four-legged one sets "lean": 0
      const stride = (tpl.height || .36) * (ch.stride || .55), phase = (show.dist / stride) % 1;
      if (Math.floor(show.dist / stride * 2) !== Math.floor((show.dist - Math.hypot(px - qx, pz - qz)) / stride * 2)) puff(x, z);
      run = { phase, speed: sp };
    }
    show.prev = name === 'run' ? [x, z] : [0, 0];
    if (name === 'trick' && ch.trick && ch.trick.move) {
      const m = ch.trick.move(k, { height: tpl.height || .36 }) || {}; x = m.x || 0; y = m.y || 0; z = m.z || 0; yaw = m.yaw || 0; pitch = m.pitch || 0; roll = m.roll || 0; sx = m.sx || 1; sy = m.sy || 1;
    }
    if (name === 'cheer') {                                           // two hops for joy
      for (const [a, b] of [[.15, .75], [.95, 1.55]]) {
        if (t > a - .12 && t < a) { const u = seg(t, a - .12, a); sy = 1 - .16 * Math.sin(Math.PI * u); sx = 1 + .1 * Math.sin(Math.PI * u); }
        if (t >= a && t <= b) { const u = seg(t, a, b); y = .12 * Math.sin(Math.PI * u); sy = 1 + .08 * Math.sin(Math.PI * u); sx = 1 - .05 * Math.sin(Math.PI * u); }
        if (t > b && t < b + .1) { const u = seg(t, b, b + .1); sy = 1 - .14 * Math.sin(Math.PI * u); sx = 1 + .1 * Math.sin(Math.PI * u); }
      }
    }
    if (name === 'present') yaw = -.35 * ease.inOut(clamp(t / .5)); // a half turn towards the letter, which rises on its left (-x)
    if (name !== 'run' && name !== 'trick') {                        // face the phone again, smoothly
      let d = yaw - show.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); show.yaw += d * Math.min(1, dt * 7); yaw = show.yaw;
    } else if (name === 'trick') show.yaw = yaw;
    actor.position.set(x, y, z); actor.rotation.set(pitch, yaw, roll, 'YXZ'); squash.scale.set(sx, sy, sx);
    return run;
  }

  function effects(name, t, k, T) {
    if (name === 'dance' && Math.floor(T * 3) !== Math.floor((T - 1 / 60) * 3)) FX.notes.emit((rng() - .5) * .3, .3 + rng() * .1, (rng() - .5) * .1, (rng() - .5) * .05, .16, 0, confettiColors()[(rng() * 4) | 0], 1.4, 0, .2, .15);
    if (name === 'cheer') {
      const s = ease.back(clamp(t / .35)); cannons.forEach(c => c.scale.setScalar(Math.max(.001, s)));
      if (t > .35 && once('cannons')) { cannonFire(-1); cannonFire(1); }
      if (t > .6 && once('fw1')) firework(-.18, .62, -.12);
      if (t > 1.1 && once('fw2')) firework(.2, .7, -.18);
      if (t > 1.6 && once('fw3')) firework(0, .78, -.22);
      board.scale.setScalar(Math.max(.001, ease.back(seg(t, .25, .75))));
    }
    if (name === 'present') {
      letter.visible = true; const u = ease.out(seg(t, 0, 1.2));
      letter.position.y = lerp(.02, .3, u); letter.rotation.set(-.2 * u, .35 * Math.sin(T * 1.3) * u, .08 * Math.sin(T * 2.1));
      glow.material.opacity = .6 + .3 * Math.sin(T * 4);
      if (t > .5 && once('hearts')) for (let i = 0; i < 10; i++) FX.hearts.emit(-.22 + (rng() - .5) * .12, .25, .1 + (rng() - .5) * .06, (rng() - .5) * .1, .18 + rng() * .1, 0, '#ff6f91', 1.6, .02, .3, .12);
    }
  }

  const reset = () => {
    show.T = 0; show.act = -1; show.dist = 0; show.prev = [0, 0]; show.yaw = 0; show.fired = {}; show.snap = null;
    board.scale.setScalar(.001); cannons.forEach(c => c.scale.setScalar(.001)); letter.visible = false; letter.position.y = .02;
    Object.values(FX).forEach(f => f.clear());
  };

  let raf = 0, disposed = false, last = performance.now();
  function tick(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (ch && !show.paused) show.T += dt;
    if (ch) {
      const acts = ACTS(), total = acts.reduce((s, a) => s + a[1], 0);
      let name, t, k, ai = 0;
      if (show.loop) {                                               // the Studio looks at one act on its own, over and over
        const a = acts.find(x => x[0] === show.loop) || acts[0]; name = a[0]; t = show.T % a[1]; k = t / a[1]; ai = acts.indexOf(a);
        if (t < dt) { reset(); show.T = t; if (name === 'present' || name === 'cheer') board.scale.setScalar(name === 'present' ? 1 : .001); }
      } else if (show.T >= total) {
        name = 'idle'; t = show.T - total; k = 0; ai = acts.length;
        if (!show.stopped) { show.stopped = true; onStop(0); }
      } else {
        let acc = 0; for (ai = 0; ai < acts.length; ai++) { if (show.T < acc + acts[ai][1]) break; acc += acts[ai][1]; }
        name = acts[ai][0]; t = show.T - acc; k = t / acts[ai][1];
      }
      if (ai !== show.act) { show.snap = show.act >= 0 ? rig.capture() : null; show.act = ai; show.actStart = show.T; }
      rig.reset();
      const run = stagePose(name === 'idle' ? 'present' : name, name === 'idle' ? 2 : t, k, show.paused ? 0 : dt);
      const ctx = { t, k, T: show.T, phase: run ? run.phase : 0, speed: run ? run.speed : 0, yaw: actor.rotation.y, actor };
      const pose = (ch.pose && ch.pose[name === 'trick' && !ch.pose.trick ? 'dance' : name]) || (ch.pose && ch.pose.idle);
      if (pose) pose(ctx);
      if (show.snap) { const w = ease.smooth(clamp((show.T - show.actStart) / .22)); rig.blend(show.snap, w); if (w >= 1) show.snap = null; }
      if (!show.paused) effects(name === 'idle' ? 'present' : name, name === 'idle' ? 1.8 + t : t, k, show.T);
      photoPost.scale.copy(board.scale);                             // the photos come up with the board
      if (photos) photos.tick(show.T);
      if (!show.paused) Object.values(FX).forEach(f => f.update(dt, show.T));
      puffs.forEach(p => { if (p.life <= 0) return; p.life -= dt; const u = 1 - p.life / .5; p.m.scale.setScalar(.6 + u * 1.4); p.m.material.opacity = .8 * (1 - u); if (p.life <= 0) p.m.visible = false; });
    }
    if (!disposed) raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    play(i) { if (i !== 0) return; reset(); if (photos) photos.shuffle(); show.loop = null; show.stopped = false; show.paused = false; last = performance.now(); },
    pause() { show.paused = true; },
    resume() { show.paused = false; last = performance.now(); },
    turn(rad) { spin.rotation.y += rad; },
    repaint: paintBoard,
    ready,
    clips: () => ACTS().map(([name, duration]) => ({ name, duration })),
    clip(name) {
      if (!ACTS().some(a => a[0] === name)) return false;
      reset(); show.loop = name; show.stopped = true; show.paused = false;
      if (name === 'present') board.scale.setScalar(1);             // the board is already up when the letter comes
      return true;
    },
    modelError: () => loadError,
    dispose() {
      disposed = true; cancelAnimationFrame(raf); anchor.object3D.remove(root);
      root.traverse(o => {                                           // the character's own materials and textures too, not just the kit's
        if (o.geometry) o.geometry.dispose();
        [].concat(o.material || []).forEach(m => { Object.values(m).forEach(v => { if (v && v.isTexture) v.dispose(); }); m.dispose(); });
        if (o.isSkinnedMesh) o.skeleton.dispose();
        if (o.isLight && o.dispose) o.dispose();
      });
      disposables.forEach(d => d.dispose && d.dispose());
    }
  };
};
