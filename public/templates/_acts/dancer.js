/* Party Monkey: a 3D scene for the player (template kind "3d").
   The player calls NM_SCENE({anchor, card, tpl, THREE, onStop}) once and gets back {play(i), pause(), resume()}.
   Chapter 0: the monkey dances in confetti, then raises a board with the card's words.
   Chapter 1: a mystery box drops in, opens, and the letter floats out, the buyer's photos rising above it in a polaroid
   (photos.js) that shows them in turn. A tap after that opens the letter.
   Built from primitives, so there is no model to download. The card is assumed to lie flat: the monkey
   stands up out of it (local +y becomes the card's +z). */
window.NM_SCENE = ({ anchor, card, tpl, THREE, onStop, dir }) => {
  const C = { fur: 0x8a5a3c, dark: 0x5e3b25, skin: 0xf1c9a5, cream: 0xfbf5e8, red: 0xd63a2f, teal: 0x1f8a8a, gold: 0xf2c14e, pink: 0xff6f91, wood: 0x8b5a2b, ink: 0x2b2440 };
  const mat = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .85, metalness: 0 }, extra || {}));
  const sphere = (r, color, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), mat(color)); m.scale.set(sx, sy, sz); return m; };
  const at = (obj, x, y, z) => { obj.position.set(x, y, z); return obj; };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = { out: t => 1 - Math.pow(1 - t, 3), inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    back: t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
    bounce: t => t < 1 / 2.75 ? 7.5625 * t * t : t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + .75 : t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + .9375 : 7.5625 * (t -= 2.625 / 2.75) * t + .984375 };
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rng = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(7);

  /* ── the words on the board, drawn once ── */
  const FONT = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';
  const boardCanvas = document.createElement('canvas'); boardCanvas.width = 512; boardCanvas.height = 320;
  function paintBoard() {
    const c = boardCanvas.getContext('2d'), W = 512, H = 320;
    c.fillStyle = '#8b5a2b'; c.fillRect(0, 0, W, H); c.fillStyle = '#fbf5e8'; c.fillRect(18, 18, W - 36, H - 36);
    c.strokeStyle = 'rgba(43,36,64,.18)'; c.lineWidth = 2; for (let y = 70; y < H - 30; y += 44) { c.beginPath(); c.moveTo(44, y); c.lineTo(W - 44, y); c.stroke(); }
    const text = String((card.slots && card.slots.board) || tpl.boardDefault || 'Congratulations!').trim().toUpperCase();
    const words = text.split(/\s+/); let size = 118, lines = null;
    for (let k = 0; k < 14 && !lines; k++) {
      c.font = `800 ${size}px ${FONT}`; const out = []; let line = '', ok = true;
      for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width <= W - 90) line = t; else { if (!line || out.length === 2) { ok = false; break; } out.push(line); line = w; } }
      if (ok && c.measureText(line).width <= W - 90) { out.push(line); lines = out; } else size *= .88;
    }
    lines = lines || [text]; c.fillStyle = '#2b2440'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const lh = size * 1.02, y0 = H / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((ln, i) => c.fillText(ln, W / 2, y0 + i * lh, W - 80));
    if (boardTex) boardTex.needsUpdate = true;
  }
  let boardTex = null;
  paintBoard(); boardTex = new THREE.CanvasTexture(boardCanvas); boardTex.colorSpace = THREE.SRGBColorSpace;
  try { document.fonts.load(`800 40px ${FONT}`).then(paintBoard); } catch (e) {}
  const hatCanvas = document.createElement('canvas'); hatCanvas.width = 128; hatCanvas.height = 128;
  { const c = hatCanvas.getContext('2d'); c.fillStyle = '#1f8a8a'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#f2c14e'; for (let i = -4; i < 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 16, 0); c.lineTo(i * 32 - 16, 128); c.lineTo(i * 32 - 32, 128); c.fill(); } }
  const hatTex = new THREE.CanvasTexture(hatCanvas); hatTex.colorSpace = THREE.SRGBColorSpace; hatTex.wrapS = THREE.RepeatWrapping; hatTex.repeat.x = 3;
  const giftCanvas = document.createElement('canvas'); giftCanvas.width = 128; giftCanvas.height = 128;
  { const c = giftCanvas.getContext('2d'); c.fillStyle = '#ff6f91'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#fbf5e8'; c.fillRect(52, 0, 24, 128); c.fillRect(0, 52, 128, 24); }
  const giftTex = new THREE.CanvasTexture(giftCanvas); giftTex.colorSpace = THREE.SRGBColorSpace;

  /* ── the monkey ── */
  const root = new THREE.Group(); root.rotation.x = tpl.standing === false ? 0 : Math.PI / 2; root.position.set(0, -0.06, 0); root.scale.setScalar(tpl.scale || .85);   // stand up out of the card
  const spin = new THREE.Group(); root.add(spin);     // a finger turns this: the whole act, 360 degrees
  const body = new THREE.Group(); spin.add(body);
  // light it like a three.js example: sky/ground light, a key light with a soft shadow, and a shadow catcher on the card
  // physical light units (the player and the Studio both use them): the old legacy-light values times pi
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa0b0, 1.1 * Math.PI); root.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.7 * Math.PI); key.position.set(.6, 1.4, .9); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = .1; key.shadow.camera.far = 4;
  key.shadow.camera.left = key.shadow.camera.bottom = -.8; key.shadow.camera.right = key.shadow.camera.top = .8; key.shadow.bias = -.0005; key.shadow.radius = 3;
  root.add(key, key.target); key.target.position.set(0, .2, 0);
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .9), new THREE.ShadowMaterial({ opacity: .38 })); catcher.rotation.x = -Math.PI / 2; catcher.position.y = .002; catcher.receiveShadow = true; root.add(catcher);
  const legL = at(new THREE.Mesh(new THREE.CylinderGeometry(.034, .04, .12, 14), mat(C.fur)), -.055, .06, 0), legR = legL.clone(); legR.position.x = .055; body.add(legL, legR);
  body.add(at(sphere(.045, C.dark, 1.1, .5, 1.3), -.055, .015, .025), at(sphere(.045, C.dark, 1.1, .5, 1.3), .055, .015, .025));
  const torso = new THREE.Group(); torso.position.y = .13; body.add(torso);
  torso.add(at(sphere(.13, C.fur, 1, 1.15, .92), 0, .13, 0), at(sphere(.09, C.skin, 1, 1.15, .55), 0, .11, .075));
  const shoulder = (x) => { const g = new THREE.Group(); g.position.set(x, .2, 0); const arm = at(new THREE.Mesh(new THREE.CylinderGeometry(.028, .026, .2, 12), mat(C.fur)), 0, -.1, 0); g.add(arm, at(sphere(.04, C.skin), 0, -.21, 0)); torso.add(g); return g; };
  const armL = shoulder(-.125), armR = shoulder(.125);
  const head = new THREE.Group(); head.position.y = .38; torso.add(head);
  head.add(sphere(.12, C.fur), at(sphere(.095, C.skin, 1, .85, .55), 0, -.01, .065));
  [-1, 1].forEach(s => { head.add(at(sphere(.028, 0xffffff), s * .045, .03, .1), at(sphere(.013, C.ink), s * .045, .03, .125), at(sphere(.045, C.fur), s * .13, .02, 0), at(sphere(.024, C.skin, 1, 1, .5), s * .135, .02, .03)); });
  head.add(at(sphere(.022, C.dark, 1.6, .6, .6), 0, -.045, .115), at(sphere(.016, C.dark, 1, .7, 1), 0, .0, .13));
  const hat = new THREE.Mesh(new THREE.ConeGeometry(.065, .15, 24), new THREE.MeshStandardMaterial({ map: hatTex, roughness: .7 })); hat.position.set(0, .17, -.01); hat.rotation.z = -.15; head.add(hat);
  head.add(at(sphere(.022, C.gold), -.01, .25, -.01));
  const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .1, -.1), new THREE.Vector3(0, .02, -.2), new THREE.Vector3(.05, .1, -.27), new THREE.Vector3(.1, .24, -.25)]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 24, .017, 8, false), mat(C.fur)); torso.add(tail);
  // the board, held in the right hand: appears when the dance ends
  const board = new THREE.Group(); board.position.set(0, -.21, 0); board.scale.setScalar(.001); armR.add(board);
  board.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .2, 10), mat(C.wood)), 0, .09, 0));
  const panel = new THREE.Mesh(new THREE.BoxGeometry(.36, .225, .012), [mat(C.wood), mat(C.wood), mat(C.wood), mat(C.wood), new THREE.MeshStandardMaterial({ map: boardTex, roughness: .9 }), mat(C.wood)]);
  panel.position.set(0, .27, 0); board.add(panel);
  // the mystery box and the letter inside it
  const gift = new THREE.Group(); gift.position.set(-.3, .6, .04); gift.visible = false; spin.add(gift);
  gift.add(at(new THREE.Mesh(new THREE.BoxGeometry(.18, .14, .18), new THREE.MeshStandardMaterial({ map: giftTex, roughness: .8 })), 0, .07, 0));
  const lid = new THREE.Group(); lid.position.set(0, .14, -.095); gift.add(lid);
  lid.add(at(new THREE.Mesh(new THREE.BoxGeometry(.2, .035, .2), new THREE.MeshStandardMaterial({ map: giftTex, roughness: .8 })), 0, .018, .095));
  lid.add(at(sphere(.03, C.gold, 1, .7, 1), 0, .05, .095));
  const letter = new THREE.Group(); letter.position.set(0, .05, 0); letter.visible = false; gift.add(letter);
  letter.add(new THREE.Mesh(new THREE.BoxGeometry(.15, .1, .01), mat(C.cream)), at(sphere(.016, C.red), 0, -.005, .007));

  /** templates/_acts/photos.js, the buyer's photos in polaroids, loaded from beside this act (null if it cannot be) */
  const photosKit = () => new Promise(res => {
    if (window.NM_PHOTOS) return res(window.NM_PHOTOS);
    const s = document.createElement('script');
    s.src = new URL('photos.js', new URL(tpl.scene || '../_acts/dancer.js', new URL(`${dir || '.'}/`, location.href))).href;
    s.onload = () => res(window.NM_PHOTOS || null); s.onerror = () => res(null);
    document.head.appendChild(s);
  });
  const hasPhotos = (Array.isArray(card.photos) && card.photos.length > 0) || !!card.photo;
  /* the photos: a polaroid that rises out of the box above the letter; none without photos */
  let photos = null, photo = null;
  if (hasPhotos) photosKit().then(make => {
    if (!make || disposed) return;
    photos = make({ THREE, card });
    photo = photos.polaroid({ width: .2 });
    photo.root.visible = false; photo.root.position.set(0, .05, -.03); gift.add(photo.root);
  });
  // confetti and sparkles
  const makePoints = (n, size) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: 1, sizeAttenuation: true })); p.frustumCulled = false; return p; };
  const palette = [C.gold, C.pink, C.teal, C.red, 0xffffff].map(h => new THREE.Color(h));
  const confetti = makePoints(160, .022), cf = confetti.geometry.attributes, cfv = [];
  for (let i = 0; i < 160; i++) { cf.position.setXYZ(i, (rng() - .5) * 1.1, rng() * .8, (rng() - .5) * .7); const col = palette[(rng() * 5) | 0]; cf.color.setXYZ(i, col.r, col.g, col.b); cfv.push(.12 + rng() * .18); }
  confetti.visible = false; root.add(confetti);
  body.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const sparks = makePoints(70, .03), sp = sparks.geometry.attributes, spv = [];
  for (let i = 0; i < 70; i++) { const a = rng() * Math.PI * 2, u = rng() * Math.PI / 2; spv.push([Math.cos(a) * Math.cos(u), Math.sin(u) + .3, Math.sin(a) * Math.cos(u)].map(v => v * (.4 + rng() * .5))); const col = palette[(rng() * 5) | 0]; sp.color.setXYZ(i, col.r, col.g, col.b); }
  sparks.visible = false; spin.add(sparks);
  anchor.object3D.add(root);

  /* ── a modelled monkey, if the template brings one (template.json "model": "model.glb") ──
     The clips named in template.json replace the procedural dance; the board, box and letter stay as they are.
       "clips": {"dance": "Dance", "raise": "Raise", "idle": "Idle"}   names of the animation clips in the file
       "modelHeight": 0.5    how tall it should stand, in card widths        "handBone": "mixamorigRightHand"  (optional) where the board goes */
  let model = null, mixer = null, clips = {}, active = null, modelReady = false, allClips = [], markReady, loadError = null;
  const ready = new Promise(r => { markReady = r; });     // settles once the model (if any) stands on the card
  function playClip(name, loop) {
    const c = clips[name]; if (!c || !mixer) return;
    const a = mixer.clipAction(c); a.reset(); a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = true; a.enabled = true;
    if (active && active !== a) { a.crossFadeFrom(active, .35, true); } a.play(); active = a;
  }
  if (tpl.model && THREE.GLTFLoader) new THREE.GLTFLoader().load(`${dir || '.'}/${tpl.model}`, g => {
    model = g.scene; model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    body.visible = false; spin.add(model); model.visible = false;
    mixer = new THREE.AnimationMixer(model); allClips = g.animations || []; allClips.forEach(c => { clips[c.name] = c; });
    const want = tpl.clips || {}; Object.entries(want).forEach(([k, v]) => { if (clips[v]) clips[k] = clips[v]; });
    // a rigged model's bounds can only be measured once its skeleton has been posed: wait two frames, then fit
    requestAnimationFrame(() => requestAnimationFrame(() => {
      // measure it detached, in its own frame: the anchor above it is rotated and scaled by the tracker, and may be hidden
      spin.remove(model); model.updateMatrixWorld(true); model.traverse(o => { if (o.isSkinnedMesh) o.skeleton.update(); });   // updateMatrixWorld also refreshes each skinned mesh's bind inverse
      const box = new THREE.Box3().setFromObject(model, true), size = box.getSize(new THREE.Vector3()), k = (tpl.modelHeight || .5) / (size.y || 1);
      const c = box.getCenter(new THREE.Vector3()); spin.add(model);
      model.scale.multiplyScalar(k); model.position.set(-c.x * k, -box.min.y * k, -c.z * k); model.visible = true;
      const hand = tpl.handBone && model.getObjectByName(tpl.handBone);
      if (hand) { hand.add(board); board.position.set(0, 0, 0); board.scale.setScalar(.001); }
      else { spin.add(board); board.position.set(.3, 0, .06); board.rotation.set(0, -.35, 0); }     // a signpost beside it instead
      modelReady = true; if (chapter === 0) playClip('dance', true); markReady();
    }));
  }, undefined, e => { console.warn('model did not load', e); loadError = String((e && e.message) || e); markReady(); });
  else markReady();

  /* ── the two chapters, as functions of time ── */
  const DUR = [5.6, 3.6];
  let chapter = -1, t = 0, paused = true, idle = 0, stopped = true, last = performance.now();
  const sin = (f, ph = 0) => Math.sin(2 * Math.PI * f * t + ph);
  function pose0() {                           // dance, then raise the board
    if (model) {                               // the model dances by its clips; the board comes up on cue
      if (!modelReady) return;
      if (t < 4.4 && (!active || active.getClip() !== clips.dance)) playClip('dance', true);
      if (t >= 4.4 && clips.raise && active && active.getClip() !== clips.raise) playClip('raise', false);
      const hold = seg(t, 4.3, 5.3), ws = new THREE.Vector3(); board.parent.getWorldScale(ws);
      const inv = board.parent === spin ? 1 : (root.scale.x || 1) / (ws.x || 1);
      board.scale.setScalar(Math.max(.001, ease.back(hold)) * inv);
      confetti.visible = t < 5.4; confetti.material.opacity = 1 - seg(t, 4.6, 5.4);
      if (confetti.visible) for (let i = 0; i < 160; i++) { let y = cf.position.getY(i) - cfv[i] * dt; if (y < 0) y += .8; cf.position.setY(i, y); }
      cf.position.needsUpdate = true; gift.visible = false; letter.visible = false; sparks.visible = false; lid.rotation.x = 0; return;
    }
    const d = 1 - seg(t, 4.4, 5.2), hold = seg(t, 4.3, 5.3);             // d: how much dance is left; hold: the board coming up
    body.position.y = .035 * Math.abs(sin(1.9)) * d; body.rotation.z = .12 * sin(.95) * d;
    head.rotation.x = .15 * sin(1.9, 1) * d; head.rotation.z = .2 * sin(.95) * d; head.rotation.y = 0;
    armL.rotation.z = lerp(.25, 2.6 + .5 * sin(1.9), d); armL.rotation.x = .3 * sin(1.9) * d;
    armR.rotation.z = lerp(-2.35, -2.6 - .5 * sin(1.9, Math.PI), d); armR.rotation.x = -.3 * sin(1.9) * d;
    legL.position.y = .06 + .03 * Math.max(0, sin(1.9)) * d; legR.position.y = .06 + .03 * Math.max(0, sin(1.9, Math.PI)) * d;
    tail.rotation.y = .5 * sin(1.5) * d;
    board.scale.setScalar(Math.max(.001, ease.back(hold)));
    board.rotation.z = -armR.rotation.z + .08 * Math.sin(idle * 1.3) * hold;
    confetti.visible = t < 5.4; confetti.material.opacity = 1 - seg(t, 4.6, 5.4);
    if (confetti.visible) for (let i = 0; i < 160; i++) { let y = cf.position.getY(i) - cfv[i] * dt; if (y < 0) y += .8; cf.position.setY(i, y); cf.position.setX(i, cf.position.getX(i) + Math.sin(t * 3 + i) * .0015); }
    cf.position.needsUpdate = true;
    gift.visible = false; letter.visible = false; sparks.visible = false; lid.rotation.x = 0;
  }
  function pose1() {                           // the mystery box drops in, opens, and the letter floats out
    if (model && t < .05 && clips.idle && active && active.getClip() !== clips.idle) playClip('idle', true);
    const drop = ease.bounce(seg(t, 0, 1.0)), open = ease.inOut(seg(t, 1.1, 2.0)), up = ease.out(seg(t, 1.8, 3.2));
    gift.visible = true; gift.position.y = lerp(.6, 0, drop); gift.scale.set(1 + .08 * Math.sin(Math.PI * seg(t, .95, 1.25)), 1 - .12 * Math.sin(Math.PI * seg(t, .95, 1.25)), 1);
    head.rotation.y = -.55 * ease.inOut(seg(t, 0, .8)); head.rotation.x = .25 * ease.inOut(seg(t, .3, 1));
    armL.rotation.z = lerp(.25, -.9, ease.inOut(seg(t, 1.2, 2.0))); armL.rotation.x = -.6 * ease.inOut(seg(t, 1.2, 2.0));
    lid.rotation.x = -2.2 * open;
    sparks.visible = t > 1.15 && t < 2.6; const sk = seg(t, 1.15, 2.6);
    if (sparks.visible) { for (let i = 0; i < 70; i++) sp.position.setXYZ(i, gift.position.x + spv[i][0] * sk, .14 + spv[i][1] * sk - .4 * sk * sk, gift.position.z + spv[i][2] * sk); sp.position.needsUpdate = true; sparks.material.opacity = 1 - sk; }
    letter.visible = t > 1.8; letter.position.y = lerp(.05, .4, up) + .012 * Math.sin(idle * 2.1) * up; letter.rotation.y = .3 * Math.sin(idle * .9) * up; letter.rotation.x = -.25 * up;
    if (!model) board.rotation.z = -armR.rotation.z + .08 * Math.sin(idle * 1.3);
    if (photo) {                               // the photos rise out of the box just after the letter, and stay above it
      const rise = ease.out(seg(t, 2.0, 3.4));
      photo.root.visible = t > 2.0; photo.root.position.y = lerp(.05, .5, rise); photo.root.scale.setScalar(Math.max(.001, rise));
      photo.root.rotation.y = -.2 * Math.sin(idle * .7) * rise;
    }
  }
  function tick(now) {
    dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!paused) { t += dt; idle += dt; }
    if (chapter === 0) pose0(); else if (chapter === 1) pose1();
    if (mixer && !paused) mixer.update(dt);
    if (photos) photos.tick(idle);
    torso.scale.y = 1 + .015 * Math.sin(idle * 2.4);                      // breathing, always
    if (!paused && !stopped && t >= DUR[chapter]) { stopped = true; onStop(chapter); }
    if (!disposed) raf = requestAnimationFrame(tick);
  }
  let dt = 0, disposed = false, raf = requestAnimationFrame(tick);

  return {
    play(i) { chapter = i; t = 0; stopped = false; paused = false; if (i === 0) { gift.visible = false; letter.visible = false; if (photos) photos.shuffle(); } },
    pause() { paused = true; },
    turn(rad) { spin.rotation.y += rad; },
    resume() { paused = false; last = performance.now(); },
    repaint: paintBoard,
    /* for tools that look at a template without a camera (the Studio): */
    ready,                                     // a promise: the model has loaded and been fitted (or there is none)
    clips: () => allClips.map(c => ({ name: c.name, duration: c.duration })),
    modelError: () => loadError,
    clip(name) { if (!clips[name]) return false; chapter = -1; paused = false; stopped = true; playClip(name, true); return true; },   // loop one clip, outside the chapters
    dispose() {                                // stop the clock and free the GPU memory; the anchor is left empty
      disposed = true; cancelAnimationFrame(raf); if (mixer) mixer.stopAllAction(); anchor.object3D.remove(root);
      root.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        [].concat(o.material || []).forEach(m => { Object.values(m).forEach(v => { if (v && v.isTexture) v.dispose(); }); m.dispose(); });
        if (o.isSkinnedMesh) o.skeleton.dispose();               // its bone texture
        if (o.isLight && o.dispose) o.dispose();                 // the key light's shadow map
      });
      [boardTex, hatTex, giftTex].forEach(t => t.dispose());
    }
  };
};
