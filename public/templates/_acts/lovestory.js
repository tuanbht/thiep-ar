/* Love story: the shared act of the 3D love cards ("kind": "3d", "scene": "../_acts/lovestory.js", "story": "story.js").
   About eighteen seconds told in chapters. Each chapter ends at a stop where the act holds (its idle motion goes on) until
   a tap plays the next, so there is time to read the card's words or look at its photo; after the last stop a tap opens
   the letter. The player calls NM_SCENE({anchor, card, tpl, THREE, onStop, dir}) and gets {play, pause, resume, turn,
   ready, modelError, dispose, pick, sound}. The card lies flat: the act stands up out of it (local +y is the card's +z) and faces the
   card's bottom edge (local +z), where a phone usually looks from. One unit is the card's width.

   template.json: "chapters": [0, 1, …] (one per stop), "story": the template's own script, or a list of scripts loaded in
   order whose last one registers the story (helpers first: ["scenery.js", "story.js"]), "models": { name: "models/x.glb" }
   (the same file under two names gives two independent copies: loaded once, the second a clone sharing its geometry and
   textures), "credits": [{ model, author, license, url }], "sound": { music, soft (a second loop), volume (the music's, .5),
   effects: { name: "sound/x.mp3" } } (MP3, CC0 only).

   The story registers itself, loaded once by URL:
     (window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => ({
       seconds: [6, 5.5, 6],   each chapter's length, one per template.json chapter; its stop comes at the end
       build(),                once the models, fonts and photo are in: put things on kit.stage
       reset(),                before chapter 0 plays (again): put everything back
       pose(f)                 every frame, f = { chapter, t, g, T, dt, held }: t seconds into the chapter (it keeps growing
                               while the act waits at the stop), g the story's own clock (the chapters end to end, holding
                               still at a stop), T seconds since the act began (idle motion), held: waiting at the stop
     })
   The couple most cards share is templates/_models (boy.glb, girl.glb; docs/models/README.md). A model may carry, in its
   glTF scene's extras, "aliases" (KayKit's bone names to its own, so node('upperarm.r'), aim and bend work on it) and
   "pace" (per clip, how much to slow it so a speed written for KayKit's stride below moves its feet as far).
   Feet that do not slide: KayKit's Walking_A covers about .1 card widths a second at speed 1 for a .3-tall character
   (Walking_C about .07, Running_A about .6, Running_Strafe_Right about .47), so speed = distance / seconds / .1 for an
   even pace (/ .6 for Running_A); an eased
   walk (ease.inOut peaks at three times its average) wants the pace of its even middle, set every frame. A drop particle
   moving (vx, vy) on screen points along rot = Math.atan2(vx, -vy). A headless browser renders slowly and dt is clamped
   to .05 s, so there the story runs slower than the wall clock.
   kit: THREE, stage, card ({ width, depth }), clamp, lerp, seg, ease, rng, tween(t, keys), hop(t, every, height),
     words(slot, fallback), model(name), sign(opts), polaroid(opts: the card's photos, see below), photo(opts: the photos on a
     frame, a screen, a print or a film frame), photoCount(), particles(opts: shapes heart, petal, glow, sparkle,
     drop, star, leaf, note), glow(opts), picture(draw, opts), canvasTexture(w, h, draw), backdrop(draw, opts),
     lights ({ hemi, sun }: dim them for a night), heartPath(ctx, x, y, size), once(key), keep(x), onTap(object, fn): a tap on
     the object (or anything in it) calls fn instead of playing on; an invisible stand-in that should still take taps has
     userData.proxy = true. A tap on a photo (polaroid or photo surface) shows it big. sfx(name, { volume, rate }) plays an
     effect, music(name) changes the loop ('music' or 'soft'); both are silent until the player enables sound inside a tap
     (iOS lets audio start only there), and the shop's preview never does.
     model(name).play(clip, { once, fade, speed, key }): called every frame; a new key plays the same clip again.
     Every draw callback (sign, polaroid, picture, canvasTexture, backdrop) runs again when the handwriting face arrives:
     make its random choices outside it, or the picture changes when it repaints. fitText(ctx, text, { x, y, w, h },
     { maxLines, max, font, weight }) writes words as big as they fit, lines evened out; HAND is the handwriting font.
     model.hold(prop, slot) sets only its size: set its position and turn in the hand yourself; stage.attach(prop) puts a
     held prop back on the stage where it is, at its stage size. A packed model's vertices are interleaved (positions,
     normals and skin data in one buffer): to bend a mesh, read and write through getX/setXYZ, never .array[i * 3]. */
window.NM_SCENE = ({ anchor, card, tpl, THREE, onStop, dir }) => {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = {
    linear: t => t, out: t => 1 - Math.pow(1 - t, 3), in: t => t * t * t,
    inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), smooth: t => t * t * (3 - 2 * t),
    back: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
    elastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1)
  };
  const rng = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(23);
  /** keys [[time, value, ease?], …] (ease shapes the way into that key; inOut by default): the value at t */
  const tween = (t, keys) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i];
      if (t <= t1) { const [t0, v0] = keys[i - 1]; return lerp(v0, v1, (ease[e] || ease.inOut)((t - t0) / (t1 - t0 || 1))); }
    }
    return keys[keys.length - 1][1];
  };
  const hop = (t, every, height) => height * Math.abs(Math.sin(Math.PI * t / every));
  const disposables = [];
  const keep = x => { disposables.push(x); return x; };
  const base = new URL(`${dir || '.'}/`, location.href);
  const errors = [];

  /* ── the stage: lights, a shadow on the card, a soft studio to reflect ── */
  const root = new THREE.Group();
  root.rotation.x = tpl.standing === false ? 0 : Math.PI / 2;
  const spin = new THREE.Group(); root.add(spin);                    // a finger turns this: the whole act, 360 degrees
  const stage = new THREE.Group(); spin.add(stage);
  const hemi = new THREE.HemisphereLight(0xfff6f0, 0xc9a9c4, 1.1); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(.45, 1.4, .95); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.near = .1; sun.shadow.camera.far = 4; sun.shadow.bias = -.0005;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -.8; sun.shadow.camera.right = sun.shadow.camera.top = .8;
  root.add(sun, sun.target); sun.target.position.set(0, .1, 0);
  const catcher = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.2, .8)), keep(new THREE.ShadowMaterial({ opacity: .3, depthWrite: false })));   // decals on the card stay visible
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = .002; catcher.receiveShadow = true; spin.add(catcher);

  const envCanvas = document.createElement('canvas'); envCanvas.width = 256; envCanvas.height = 128;
  (c => {                                                           // a warm room with two soft windows: gold and gems catch it
    const g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#fffaf4'); g.addColorStop(.45, '#f6d9e2'); g.addColorStop(.55, '#d9b8c8'); g.addColorStop(1, '#5e4a5c');
    c.fillStyle = g; c.fillRect(0, 0, 256, 128);
    for (const [x, y, r] of [[60, 34, 26], [190, 40, 20]]) {
      const s = c.createRadialGradient(x, y, 0, x, y, r); s.addColorStop(0, 'rgba(255,255,255,1)'); s.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = s; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  })(envCanvas.getContext('2d'));
  const env = keep(new THREE.CanvasTexture(envCanvas));
  env.mapping = THREE.EquirectangularReflectionMapping; env.colorSpace = THREE.SRGBColorSpace;

  /* ── the handwriting face (Dancing Script, OFL), Vietnamese included ── */
  const HAND = '"Dancing Script", "Segoe Script", "Brush Script MT", cursive';
  const painters = new Set();
  const fontsReady = (window.NM_HAND_FONTS = window.NM_HAND_FONTS || (async () => {   // once per page, however many cards play
    try {
      const at = new URL('fonts/', new URL(tpl.scene || '../_acts/lovestory.js', base)).href;       // _acts/fonts, next to this act
      const faces = [['latin', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
        ['latin-ext', 'U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'],
        ['vietnamese', 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB']]
        .map(([n, range]) => new FontFace('Dancing Script', `url(${at}dancing-script-${n}-700-normal.woff2) format("woff2")`, { weight: '700', unicodeRange: range }));
      faces.forEach(f => document.fonts.add(f));
      await Promise.race([Promise.all(faces.map(f => f.load())), new Promise(r => setTimeout(r, 4000))]);
    } catch (e) { /* no FontFace API: the fallback hand stays */ }
  })());
  fontsReady.then(() => painters.forEach(p => p()));

  /* ── words: the card's own for a slot, else the template's ── */
  const words = (slot, fallback = '') => String((card.slots && card.slots[slot]) || fallback || '').trim();

  /** the lines that fit `maxW` at this font, or null when a word alone is too wide */
  function wrap(c, text, maxW) {
    const out = []; let line = '';
    for (const w of text.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${w}` : w;
      if (c.measureText(next).width <= maxW) { line = next; continue; }
      if (!line || c.measureText(w).width > maxW) return null;
      out.push(line); line = w;
    }
    if (line) out.push(line);
    return out;
  }
  /** writes `text` as big as it fits in the box (x, y, w, h), centred, up to maxLines lines */
  function fitText(c, text, box, o = {}) {
    const maxLines = o.maxLines ?? 4, family = o.font ?? HAND, weight = o.weight ?? 700;
    let size = o.max ?? Math.min(box.h * .62, 150), lines = null;
    for (; size > 18; size -= 4) {
      c.font = `${weight} ${size}px ${family}`;
      lines = wrap(c, text, box.w);
      if (lines && lines.length <= maxLines && lines.length * size * 1.22 <= box.h) break;
      lines = null;
    }
    if (!lines) { c.font = `${weight} 18px ${family}`; lines = [text.slice(0, 60)]; }
    else if (lines.length > 1) {                                       // even the lines out: "Nhà là nơi / có em", not "Nhà là nơi có / em"
      let w = box.w;
      for (let tw = box.w - 8; tw > box.w * .4; tw -= 8) { const l = wrap(c, text, tw); if (!l || l.length !== lines.length) break; w = tw; }
      lines = wrap(c, text, w);
    }
    const lh = size * 1.22, top = box.y + (box.h - lh * lines.length) / 2 + lh * .5;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((l, i) => c.fillText(l, box.x + box.w / 2, top + i * lh));
  }
  const rounded = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  const heartPath = (c, cx, cy, s) => {                              // a heart s wide, its middle at (cx, cy)
    c.beginPath(); c.moveTo(cx, cy + s * .42);
    c.bezierCurveTo(cx - s * .62, cy, cx - s * .5, cy - s * .55, cx, cy - s * .25);
    c.bezierCurveTo(cx + s * .5, cy - s * .55, cx + s * .62, cy, cx, cy + s * .42); c.closePath();
  };

  /* ── a sign with words: style note (paper and washi tape), banner (a ribbon), heart (heart-shaped paper), tag;
        opts: text, width, aspect, paper, ink, accent, maxLines, glow (how much it lights itself: .25; more at night) ── */
  function sign(o = {}) {
    const style = o.style ?? 'note', aspect = o.aspect ?? (style === 'banner' ? .3 : style === 'heart' ? .9 : .62);
    const W = 1024, H = Math.round(W * aspect), width = o.width ?? .42, height = width * aspect;
    const paper = o.paper ?? '#fffaf3', ink = o.ink ?? '#7b2343', accent = o.accent ?? '#ff6f91';
    const front = document.createElement('canvas'), back = document.createElement('canvas');
    front.width = back.width = W; front.height = back.height = H;
    const tf = keep(new THREE.CanvasTexture(front)), tb = keep(new THREE.CanvasTexture(back));
    [tf, tb].forEach(t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; });
    let text = String(o.text ?? '');
    const shape = (c, fill) => {
      c.clearRect(0, 0, W, H); c.save();
      c.shadowColor = 'rgba(60,20,40,.28)'; c.shadowBlur = 18; c.shadowOffsetY = 6; c.fillStyle = fill;
      if (style === 'banner') {
        const n = H * .32; c.beginPath(); c.moveTo(14, 14); c.lineTo(W - 14, 14); c.lineTo(W - 14 - n, H / 2); c.lineTo(W - 14, H - 14);
        c.lineTo(14, H - 14); c.lineTo(14 + n, H / 2); c.closePath(); c.fill();
      } else if (style === 'heart') { heartPath(c, W / 2, H * .52, W * .96); c.fill(); }
      else { rounded(c, 18, 18, W - 36, H - 36, style === 'tag' ? 26 : 40); c.fill(); }
      c.restore();
    };
    function paint() {
      const c = front.getContext('2d'), b = back.getContext('2d');
      shape(b, paper);
      if (style === 'banner') {
        shape(c, accent);
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.setLineDash([16, 12]); c.lineWidth = 5; c.strokeRect(H * .38, 34, W - H * .76, H - 68); c.setLineDash([]);
        c.fillStyle = paper; fitText(c, text, { x: H * .42, y: 30, w: W - H * .84, h: H - 60 }, { maxLines: 2 });
      } else if (style === 'heart') {
        shape(c, paper);
        c.save(); heartPath(c, W / 2, H * .52, W * .9); c.strokeStyle = accent; c.lineWidth = 8; c.setLineDash([22, 16]); c.stroke(); c.restore();
        c.fillStyle = ink; fitText(c, text, { x: W * .2, y: H * .2, w: W * .6, h: H * .42 }, { maxLines: 3 });
      } else {
        shape(c, paper);
        c.strokeStyle = 'rgba(123,35,67,.12)'; c.lineWidth = 3;                // faint ruled lines
        for (let y = H * .3; y < H - 50; y += H * .16) { c.beginPath(); c.moveTo(70, y); c.lineTo(W - 70, y); c.stroke(); }
        if (style === 'tag') { c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.arc(70, H / 2, 18, 0, 7); c.fill(); }
        else {                                                         // a strip of washi tape holding it up
          c.save(); c.translate(W / 2, 30); c.rotate(-.04); c.globalAlpha = .82; c.fillStyle = accent; c.fillRect(-120, -26, 240, 52);
          c.globalAlpha = .35; c.fillStyle = '#fff'; for (let x = -110; x < 120; x += 36) c.fillRect(x, -26, 14, 52); c.restore();
        }
        c.fillStyle = accent;                                          // two small hearts in the corners
        heartPath(c, W - 80, H - 70, 56); c.fill(); heartPath(c, 78, H - 76, 34); c.fill();
        c.fillStyle = ink; fitText(c, text, { x: 90, y: 64, w: W - 180, h: H - 150 }, { maxLines: o.maxLines ?? 4 });
      }
      tf.needsUpdate = tb.needsUpdate = true;
    }
    painters.add(paint); paint();
    const geo = keep(new THREE.PlaneGeometry(width, height));
    const faceOn = keep(new THREE.MeshStandardMaterial({ map: tf, roughness: .9, transparent: true, alphaTest: .05,
      emissive: 0xffffff, emissiveMap: tf, emissiveIntensity: o.glow ?? .25 }));                   // readable however dim the scene
    const faceOff = keep(new THREE.MeshStandardMaterial({ map: tb, roughness: .95, transparent: true, alphaTest: .05, side: THREE.BackSide }));
    const root = new THREE.Group();
    [faceOn, faceOff].forEach(m => { const p = new THREE.Mesh(geo, m); p.castShadow = true; root.add(p); });
    return { root, width, height, set(t) { text = String(t ?? ''); paint(); } };
  }

  /* ── the card's photos, in polaroids (a heart doodle when there are none). They are shuffled each play; a card's first
     polaroid starts on the first, its second on the second (polaroid({ photo: i }) picks one). A polaroid in view
     shows them in turn, fading from one to the next, so every photo is seen, while the act plays and while it waits. ── */
  const shuffle = list => { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
  const photoUrls = Array.isArray(card.photos) && card.photos.length ? card.photos : card.photo ? [card.photo] : [];
  const PHOTO_PX = 640;                                                // a photo is kept this big at most: ten full-size ones fill a phone
  const small = img => {
    const k = Math.min(1, PHOTO_PX / Math.max(img.width, img.height));
    if (k === 1) return img;
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  };
  let photoImgs = [], heroImg = null;                                 // heroImg: the buyer's first photo, kept apart from the shuffle
  const urlOf = new WeakMap();                                         // a photo's picture -> its link, to show it big when tapped
  const taps = new Map();                                              // what a tap can find: object -> { photo() } or { fn() }
  const polaroids = new Set();
  const loads = shuffle(photoUrls).map(url => new Promise(res => {      // each one after the others as it comes in, so none moves
    const img = new Image(), late = setTimeout(() => res(false), 20000);
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      clearTimeout(late); const pic = small(img); urlOf.set(pic, url); if (url === photoUrls[0]) heroImg = pic;
      photoImgs = [...photoImgs, pic]; polaroids.forEach(p => p.repaint()); res(true);
    };
    img.onerror = () => { clearTimeout(late); res(false); };
    img.src = url;
  }));
  /** the act may start once the first photo is in (or none can come, or 8 s went by): the others come in while it plays */
  const photoReady = Promise.race([new Promise(res => {
    let left = loads.length;
    if (!left) res();
    loads.forEach(p => p.then(ok => { if (ok || --left === 0) res(); }));
  }), new Promise(r => setTimeout(r, 8000))]);
  const PHOTO_TURN = 2.8, PHOTO_FADE = .6;                             // seconds a photo shows at a stop, and its fade to the next
  /** a polaroid in view: it and everything it hangs from visible, and not shrunk to nothing */
  const inView = obj => { for (let o = obj; o; o = o.parent) if (!o.visible) return false; return obj.matrixWorld.getMaxScaleOnAxis() > 1e-3; };
  function polaroid(o = {}) {
    const width = o.width ?? .24, cv = document.createElement('canvas'); cv.width = 512; cv.height = 620;
    const tex = keep(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const start = o.photo ?? polaroids.size;
    let shown = start, mix = 0, seenSince = null, from = start;        // the photo it shows, and how far into the next
    const drawPhoto = (c, img, x, y, s, alpha) => {
      const k = Math.max(s / img.width, s / img.height), w = img.width * k, h = img.height * k;
      c.save(); c.globalAlpha = alpha; c.beginPath(); c.rect(x, y, s, s); c.clip(); c.drawImage(img, x + (s - w) / 2, y + (s - h) / 2, w, h); c.restore();
    };
    function paint() {
      const c = cv.getContext('2d'), x = 30, y = 30, s = 452, n = photoImgs.length;
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 620);
      if (n) {
        drawPhoto(c, photoImgs[shown % n], x, y, s, 1);
        if (mix > 0) drawPhoto(c, photoImgs[(shown + 1) % n], x, y, s, mix);
      } else {
        c.fillStyle = o.empty ?? '#fde4ea'; c.fillRect(x, y, s, s); c.fillStyle = '#f39ab4'; heartPath(c, 256, 262, 240); c.fill();
      }
      if (o.caption) { c.fillStyle = '#3a2540'; fitText(c, o.caption, { x: 40, y: 490, w: 432, h: 116 }, { maxLines: 1, max: o.captionMax ?? 72 }); }
      else {
        c.strokeStyle = '#2b2440'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath();
        c.moveTo(440, 586); c.bezierCurveTo(400, 556, 410, 520, 438, 532); c.bezierCurveTo(462, 515, 478, 552, 440, 586); c.stroke();
      }
      tex.needsUpdate = true;
    }
    painters.add(paint); paint(); photoReady.then(paint);
    const white = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, emissive: 0xffffff, emissiveIntensity: (o.glow ?? .25) * .6 }));
    const box = new THREE.Mesh(keep(new THREE.BoxGeometry(width, width * 620 / 512, .004)),
      [white, white, white, white, keep(new THREE.MeshStandardMaterial({ map: tex, roughness: .7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: o.glow ?? .25 })), white]);
    box.castShadow = true; box.position.y = width * 620 / 512 / 2;
    taps.set(box, { photo: () => { const n = photoImgs.length; return n ? urlOf.get(photoImgs[(shown + (mix >= .5 ? 1 : 0)) % n]) : null; } });
    const root = new THREE.Group(); root.add(box);
    let halo = null;                                                   // { halo: true }: a flat glow just behind the photo (set its opacity)
    if (o.halo) {
      halo = new THREE.Mesh(keep(new THREE.PlaneGeometry(width * 2.1, width * 2.1)), keep(new THREE.MeshBasicMaterial({ map: glowCell(),
        color: o.haloColor ?? 0xffd9a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
      halo.position.set(0, width * 620 / 512 / 2, -.012); halo.renderOrder = 3; root.add(halo);
    }
    polaroids.add({
      /** in view: the photos in turn, from the one it showed when it came into view */
      turn(T) {
        if (photoImgs.length < 2 || !inView(root)) {
          seenSince = null;
          if (mix > 0) { if (mix >= .5) shown += 1; mix = 0; paint(); }   // left in the middle of a fade: settle on one photo
          return;
        }
        if (seenSince === null) { seenSince = T; from = shown; }
        const k = (T - seenSince) / PHOTO_TURN, step = Math.floor(k), into = (k - step) * PHOTO_TURN;
        const m = into > PHOTO_TURN - PHOTO_FADE ? (into - PHOTO_TURN + PHOTO_FADE) / PHOTO_FADE : 0;
        if (from + step !== shown || Math.abs(m - mix) > .02 || (m === 0 && mix !== 0)) { shown = from + step; mix = m; paint(); }
      },
      rewind() { shown = from = start; mix = 0; seenSince = null; paint(); },
      repaint: paint
    });
    return { root, width, height: width * 620 / 512, halo };
  }

  /** a photo cut to fill a box (cover), centred across and a little high, where faces usually are */
  const coverPhoto = (c, img, x, y, w, h, alpha = 1) => {
    const k = Math.max(w / img.width, h / img.height), dw = img.width * k, dh = img.height * k;
    c.save(); c.globalAlpha = alpha; c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.drawImage(img, x + (w - dw) / 2, y + (h - dh) * .35, dw, dh); c.restore();
  };
  /** The card's photos on any surface, turning like a polaroid's: a frame on a wall, a screen, a magnet print, a film frame.
      opts: width (.12, the whole thing), aspect (the picture's height / width, 1), frame ('wood' | 'white' | 'screen' | 'film'
      | 'none'), border (the frame's width as a share of the picture's, .09), color (the frame's), slot and of (surface slot
      of `of`: it starts that far into the photos, so a set of surfaces spreads over all of them; without them it starts on
      photo `slot`), hero (true: always the buyer's first photo), turn (seconds a photo shows, 2.8), glow (.3; screens .9),
      depth (.006). Returns { root, width, height, face }: root's middle is the picture's middle, its face looks along +z. */
  function photo(o = {}) {
    const style = o.frame ?? 'wood', aspect = o.aspect ?? 1, border = style === 'none' ? 0 : o.border ?? (style === 'film' ? .16 : .09);
    const PW = 480, PH = Math.round(PW * aspect), B = Math.round(PW * border), CW = PW + 2 * B, CH = PH + 2 * B;
    const width = o.width ?? .12, height = width * CH / CW, turnS = o.turn ?? PHOTO_TURN, fadeS = Math.min(PHOTO_FADE, turnS * .3);
    const frameColor = o.color ?? { wood: '#d9a877', white: '#ffffff', screen: '#1d1a22', film: '#17141c', none: '#ffffff' }[style] ?? '#d9a877';
    const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
    const tex = keep(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    let step = 0, mix = 0, seenSince = null, from = 0;
    const startOf = n => (o.of ? Math.floor((o.slot ?? 0) * n / Math.max(1, o.of)) : (o.slot ?? 0));
    const at = k => { const n = photoImgs.length; return n ? photoImgs[(((startOf(n) + k) % n) + n) % n] : null; };
    function frame(c) {
      c.fillStyle = frameColor; c.fillRect(0, 0, CW, CH);
      if (style === 'wood') {                                          // a bevel: light on the top and left, shade on the others
        c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(0, 0, CW, B * .35); c.fillRect(0, 0, B * .35, CH);
        c.fillStyle = 'rgba(80,40,20,.22)'; c.fillRect(0, CH - B * .35, CW, B * .35); c.fillRect(CW - B * .35, 0, B * .35, CH);
        c.strokeStyle = 'rgba(80,40,20,.35)'; c.lineWidth = 3; c.strokeRect(B - 2, B - 2, PW + 4, PH + 4);
      } else if (style === 'screen') {
        c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(0, 0, CW, B * .5);
      } else if (style === 'film') {                                   // sprocket holes along the top and the bottom
        c.fillStyle = '#fdf6ee'; const hw = B * .42, hh = B * .5, gap = PW / 6;
        for (let x = B * .5; x < CW - hw; x += gap) for (const y of [B * .25, CH - B * .75]) { rounded(c, x, y, hw, hh, 4); c.fill(); }
      }
    }
    function paint() {
      const c = cv.getContext('2d'); frame(c);
      const img = o.hero ? (heroImg || at(0)) : at(step);
      if (img) {
        coverPhoto(c, img, B, B, PW, PH);
        if (!o.hero && mix > 0) { const next = at(step + 1); if (next) coverPhoto(c, next, B, B, PW, PH, mix); }
      } else {                                                         // no photo yet: a soft heart
        c.fillStyle = o.empty ?? '#fde4ea'; c.fillRect(B, B, PW, PH); c.fillStyle = '#f39ab4';
        heartPath(c, B + PW / 2, B + PH * .54, Math.min(PW, PH) * .5); c.fill();
      }
      if (style === 'screen') {                                        // the glass catches a little light
        const gl = c.createLinearGradient(B, B, B + PW, B + PH); gl.addColorStop(0, 'rgba(255,255,255,.16)'); gl.addColorStop(.4, 'rgba(255,255,255,0)');
        c.fillStyle = gl; c.fillRect(B, B, PW, PH);
      }
      tex.needsUpdate = true;
    }
    painters.add(paint); paint(); photoReady.then(paint);
    const glow = o.glow ?? (style === 'screen' ? .9 : .3);
    const side = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(frameColor), roughness: .7 }));
    const faceMat = keep(new THREE.MeshStandardMaterial({ map: tex, roughness: style === 'screen' ? .25 : .7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: glow }));
    const face = new THREE.Mesh(keep(new THREE.BoxGeometry(width, height, o.depth ?? .006)), [side, side, side, side, faceMat, side]);
    face.castShadow = true;
    taps.set(face, { photo: () => { const img = o.hero ? (heroImg || at(0)) : at(step + (mix >= .5 ? 1 : 0)); return img ? urlOf.get(img) : null; } });
    const root = new THREE.Group(); root.add(face);
    polaroids.add({
      turn(T) {
        if (o.hero || photoImgs.length < 2 || !inView(root)) {
          seenSince = null;
          if (mix > 0) { if (mix >= .5) step += 1; mix = 0; paint(); }
          return;
        }
        if (seenSince === null) { seenSince = T; from = step; }
        const k = (T - seenSince) / turnS, n = Math.floor(k), into = (k - n) * turnS;
        const m = into > turnS - fadeS ? (into - turnS + fadeS) / fadeS : 0;
        if (from + n !== step || Math.abs(m - mix) > .02 || (m === 0 && mix !== 0)) { step = from + n; mix = m; paint(); }
      },
      rewind() { step = from = 0; mix = 0; seenSince = null; paint(); },
      repaint: paint
    });
    return { root, width, height, face, material: faceMat };
  }

  /* ── particles: hearts, petals, glows and sparkles, as points that face the phone ── */
  const atlas = document.createElement('canvas'); atlas.width = 1024; atlas.height = 128;
  (c => {
    c.fillStyle = '#fff'; heartPath(c, 64, 66, 112); c.fill();                                    // 0 heart
    c.save(); c.translate(192, 64); c.rotate(.6); const pg = c.createLinearGradient(0, -50, 0, 50);
    pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#e8d8dc'); c.fillStyle = pg;              // 1 petal
    c.beginPath(); c.moveTo(0, -52); c.bezierCurveTo(40, -30, 34, 34, 0, 52); c.bezierCurveTo(-34, 34, -40, -30, 0, -52); c.fill(); c.restore();
    const gg = c.createRadialGradient(320, 64, 0, 320, 64, 62);                                    // 2 glow
    gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(.25, 'rgba(255,255,255,.75)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gg; c.fillRect(256, 0, 128, 128);
    const sg = c.createRadialGradient(448, 64, 0, 448, 64, 30); sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = sg; c.fillRect(384, 0, 128, 128); c.fillStyle = '#fff';                          // 3 sparkle: a glow and four points
    c.beginPath(); c.moveTo(448, 6); c.quadraticCurveTo(452, 60, 506, 64); c.quadraticCurveTo(452, 68, 448, 122);
    c.quadraticCurveTo(444, 68, 390, 64); c.quadraticCurveTo(444, 60, 448, 6); c.fill();
    const dg = c.createLinearGradient(0, 4, 0, 124);                                               // 4 drop: a falling streak of rain
    dg.addColorStop(0, 'rgba(255,255,255,0)'); dg.addColorStop(.7, 'rgba(255,255,255,.75)'); dg.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = dg; c.beginPath(); c.moveTo(574, 6); c.lineTo(578, 6); c.quadraticCurveTo(586, 110, 576, 122); c.quadraticCurveTo(566, 110, 574, 6); c.fill();
    c.fillStyle = '#fff'; c.beginPath();                                                           // 5 star: five points
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 24 : 58, a = -Math.PI / 2 + i * Math.PI / 5; c[i ? 'lineTo' : 'moveTo'](704 + Math.cos(a) * r, 66 + Math.sin(a) * r); }
    c.fill();
    c.beginPath(); c.moveTo(832, 8); c.bezierCurveTo(892, 34, 878, 98, 832, 122); c.bezierCurveTo(786, 98, 772, 34, 832, 8); c.fill();   // 6 leaf
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 4; c.beginPath(); c.moveTo(832, 14); c.lineTo(832, 116); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(944, 98, 22, 16, -.4, 0, 7); c.fill(); c.fillRect(960, 20, 8, 80);   // 7 note: ♪
    c.beginPath(); c.moveTo(960, 20); c.quadraticCurveTo(1000, 30, 1004, 64); c.quadraticCurveTo(990, 44, 968, 44); c.fill();
  })(atlas.getContext('2d'));
  const atlasTex = keep(new THREE.CanvasTexture(atlas));
  const SHAPES = { heart: 0, petal: 1, glow: 2, sparkle: 3, drop: 4, star: 5, leaf: 6, note: 7 };
  const glowCell = () => { const t = keep(atlasTex.clone()); t.repeat.set(1 / 8, 1); t.offset.set(2 / 8, 0); t.needsUpdate = true; return t; };
  function particles(o = {}) {
    const n = o.max ?? 200, g = keep(new THREE.BufferGeometry());
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), alpha = new Float32Array(n), size = new Float32Array(n),
      rot = new Float32Array(n), shp = new Float32Array(n);
    const P = Array.from({ length: n }, () => ({ age: 0, life: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, s: 0, grow: 0, spin: 0, sway: 0, ph: 0, floor: -9, tw: 0 }));
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aRot', new THREE.BufferAttribute(rot, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aShape', new THREE.BufferAttribute(shp, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = keep(new THREE.ShaderMaterial({
      uniforms: { uAtlas: { value: atlasTex }, uHalfH: { value: 400 } },
      vertexShader: `attribute vec3 aColor; attribute float aAlpha, aSize, aRot, aShape; uniform float uHalfH;
        varying vec3 vColor; varying float vAlpha, vRot, vShape;
        void main() { vColor = aColor; vAlpha = aAlpha; vRot = aRot; vShape = aShape;
          vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = aAlpha <= 0.0 ? 0.0 : aSize * projectionMatrix[1][1] * uHalfH / max(0.001, -mv.z); }`,
      fragmentShader: `uniform sampler2D uAtlas; varying vec3 vColor; varying float vAlpha, vRot, vShape;
        void main() { vec2 p = gl_PointCoord - 0.5; float c = cos(vRot), s = sin(vRot);
          p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
          if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) discard;
          vec4 t = texture2D(uAtlas, vec2((vShape + p.x) / 8.0, 1.0 - p.y));
          float a = t.a * vAlpha; if (a < 0.01) discard;
          gl_FragColor = vec4(vColor * t.rgb, a); }`,
      transparent: true, depthWrite: false, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending
    }));
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 5;
    const v2 = new THREE.Vector2();
    pts.onBeforeRender = renderer => { renderer.getDrawingBufferSize(v2); mat.uniforms.uHalfH.value = v2.y / 2; };
    let next = 0;
    const color = new THREE.Color();
    const api = {
      root: pts,
      /** one particle: at (x, y, z) in the system's space, moving (vx, vy, vz) */
      emit(p) {
        const i = next; next = (next + 1) % n; const q = P[i];
        Object.assign(q, { age: 0, life: p.life ?? 2, vx: p.vx ?? 0, vy: p.vy ?? 0, vz: p.vz ?? 0, g: p.gravity ?? 0, drag: p.drag ?? 0,
          s: p.size ?? .03, grow: p.grow ?? 0, spin: p.spin ?? 0, sway: p.sway ?? 0, ph: rng() * 6.28, floor: p.floor ?? -9, tw: p.twinkle ?? 0 });
        pos[i * 3] = p.x ?? 0; pos[i * 3 + 1] = p.y ?? 0; pos[i * 3 + 2] = p.z ?? 0;
        color.set(p.color ?? '#ffffff'); col[i * 3] = color.r; col[i * 3 + 1] = color.g; col[i * 3 + 2] = color.b;
        rot[i] = p.rot ?? (rng() - .5) * .8; shp[i] = SHAPES[p.shape] ?? 0; alpha[i] = 0; size[i] = 0;
      },
      /** count particles from make(i) → emit options */
      burst(count, make) { for (let i = 0; i < count; i++) api.emit(make(i)); },
      update(dt, T = 0) {
        for (let i = 0; i < n; i++) {
          const q = P[i]; if (q.life <= 0) continue;
          q.age += dt; if (q.age >= q.life) { q.life = 0; alpha[i] = 0; continue; }
          q.vy += q.g * dt; const d = Math.max(0, 1 - q.drag * dt); q.vx *= d; q.vy *= d; q.vz *= d;
          pos[i * 3] += (q.vx + q.sway * Math.sin(T * 2.6 + q.ph)) * dt; pos[i * 3 + 1] += q.vy * dt; pos[i * 3 + 2] += q.vz * dt;
          if (pos[i * 3 + 1] < q.floor) { pos[i * 3 + 1] = q.floor; q.vx = q.vy = q.vz = q.sway = q.g = q.spin = 0; }
          const k = q.age / q.life;
          alpha[i] = Math.min(1, q.age / .12) * (1 - ease.smooth(seg(k, .72, 1))) * (q.tw ? .55 + .45 * Math.sin(T * q.tw + q.ph * 3) : 1);
          size[i] = q.s * (1 + q.grow * k) * ease.back(Math.min(1, q.age / .25));
          rot[i] += q.spin * dt;
        }
        for (const a of ['position', 'aColor', 'aAlpha', 'aSize', 'aRot', 'aShape']) g.attributes[a].needsUpdate = true;
      },
      clear() { P.forEach(q => { q.life = 0; }); alpha.fill(0); g.attributes.aAlpha.needsUpdate = true; }
    };
    return api;
  }
  /** a soft light that always faces the phone: lanterns, a ring's shine */
  function glow(o = {}) {
    const tex = glowCell();
    const m = keep(new THREE.SpriteMaterial({ map: tex, color: o.color ?? 0xffe2a8, transparent: true, depthWrite: false,
      depthTest: o.depthTest ?? true, blending: THREE.AdditiveBlending, opacity: o.opacity ?? 1 }));   // depthTest false: not cut by the card
    const s = new THREE.Sprite(m); s.scale.setScalar(o.size ?? .2); s.renderOrder = 6;
    return s;
  }

  /** a flat drawing that always faces the phone (a moon, a speech bubble): draw(context, size) paints a size x size square */
  function picture(draw, o = {}) {
    const px = o.px ?? 256, cv = document.createElement('canvas'); cv.width = cv.height = px;
    const tex = keep(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace;
    const paint = () => { const c = cv.getContext('2d'); c.clearRect(0, 0, px, px); draw(c, px); tex.needsUpdate = true; };
    painters.add(paint); paint();
    const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: o.opacity ?? 1 })));
    s.scale.setScalar(o.size ?? .1); s.renderOrder = 4;
    return s;
  }

  /** a canvas the story paints (words included): draw(context, w, h) runs now and again when the handwriting face arrives */
  function canvasTexture(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const tex = keep(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const paint = () => { const c = cv.getContext('2d'); c.clearRect(0, 0, w, h); draw(c, w, h); tex.needsUpdate = true; };
    painters.add(paint); paint();
    return tex;
  }
  /** a painted backdrop standing at the card's back edge, curved like a pop-up page (a sky, a sea, a skyline); unlit, so
      it shows its colours whatever the lights. draw(context, w, h) paints it; opts: width (1.1), height (.75), curve (.18:
      how far its ends come forward), z (-.3), px (canvas width, 1024), alphaTest (0: give a layer with clear sky .5 so
      what is behind shows through), order (render order, -1: stack layers with -4, -3, …). It writes depth: keep things
      in front of it, z > page.userData.zAt(x) */
  function backdrop(draw, o = {}) {
    const width = o.width ?? 1.1, height = o.height ?? .75, curve = o.curve ?? .18, px = o.px ?? 1024;
    const tex = canvasTexture(px, Math.round(px * height / width), draw);
    const geo = keep(new THREE.PlaneGeometry(width, height, 32, 1)), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const k = pos.getX(i) / (width / 2); pos.setZ(i, curve * k * k); pos.setY(i, pos.getY(i) + height / 2); }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: true,
      alphaTest: o.alphaTest ?? 0, toneMapped: false })));              // a painted sky keeps the colours it was painted in
    mesh.position.z = o.z ?? -.3; mesh.renderOrder = o.order ?? -1;
    mesh.userData.zAt = x => (o.z ?? -.3) + curve * (x / (width / 2)) ** 2;   // where the page stands at x: its ends come forward
    return mesh;
  }

  /* ── models: the template's glTF binaries, each with its own animation mixer ── */
  const loader = new THREE.GLTFLoader();
  const gltfs = {};
  const mixers = new Set();
  const files = new Map();                                            // one load per file, however many names share it
  const modelsReady = Promise.all(Object.entries(tpl.models || {}).map(([name, file]) => {
    const url = new URL(file, base).href;
    const first = !files.has(url);
    if (first) files.set(url, loader.loadAsync(url));
    return files.get(url).then(g => {
      const copy = !first && THREE.SkeletonUtils ? { scene: THREE.SkeletonUtils.clone(g.scene), animations: g.animations } : null;
      gltfs[name] = copy || (first ? g : null);
      if (!gltfs[name]) return loader.loadAsync(url).then(again => { gltfs[name] = again; });   // no SkeletonUtils: a second load
    }).catch(e => { errors.push(`${file}: ${e && e.message ? e.message : 'did not load'}`); });
  }));
  function dress(o) {
    o.traverse(x => {
      if (!x.isMesh) return;
      x.castShadow = true; if (x.isSkinnedMesh) x.frustumCulled = false;
      for (const m of Array.isArray(x.material) ? x.material : [x.material]) {
        if (m && m.isMeshStandardMaterial && !m.envMap) { m.envMap = env; m.envMapIntensity = m.envMapIntensity ?? 1; m.needsUpdate = true; }
      }
    });
  }
  const qBend = new THREE.Quaternion(), eBend = new THREE.Euler(), mRel = new THREE.Matrix4(), vPos = new THREE.Vector3(), qRel = new THREE.Quaternion(), vScale = new THREE.Vector3();
  const qBone = new THREE.Quaternion(), qRoot = new THREE.Quaternion(), qParent = new THREE.Quaternion(), qTurn = new THREE.Quaternion(), qNone = new THREE.Quaternion();
  const vNow = new THREE.Vector3(), vWant = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const touched = new Map();                                          // bone -> its turn before the story's aim/bend this frame
  const touch = b => { if (!touched.has(b)) touched.set(b, b.quaternion.clone()); };
  const untouch = () => { touched.forEach((q, b) => b.quaternion.copy(q)); touched.clear(); };   // a bone no clip moves would drift
  /** one model by its template.json name: { root, scene, clips, play(clip, {once, fade, speed, restart}), stop(), node(name),
      fit({height|width}), hold(object, slot), aim(bone, [x, y, z], k), bend(bone, x, y, z, k) } */
  function model(name) {
    const g = gltfs[name], root = new THREE.Group(); root.name = name;
    const none = { root, scene: null, clips: [], play: () => null, stop() {}, node: () => null, hold: () => null, aim() {}, bend() {}, fit() { return none; } };
    if (!g) return none;
    if (g.used) { errors.push(`model "${name}" asked for twice: list the file under two names for two copies`); return none; }
    g.used = true;
    const inner = g.scene; root.add(inner); dress(inner);
    const mixer = g.animations.length ? new THREE.AnimationMixer(inner) : null;
    if (mixer) mixers.add(mixer);
    let current = null, currentKey;
    /** a part by its name in the file: the loader drops the dots ("upperarm.r" is upperarmr), so either works; else by
        the name the model says it goes by (its "aliases": KayKit's names for its own bones) */
    const aliases = inner.userData.aliases || {}, paces = inner.userData.pace || {};
    const part = q => inner.getObjectByName(q) || inner.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(q))
      || (typeof q === 'string' && (aliases[q] || aliases[q.toLowerCase()]) ? inner.getObjectByName(aliases[q] || aliases[q.toLowerCase()]) : null) || null;
    const paced = (clip, speed = 1) => speed * (paces[clip.name] ?? 1);   // a KayKit pace, on this model's stride
    const find = q => typeof q === 'number' ? g.animations[q]
      : g.animations.find(c => c.name === q) || g.animations.find(c => c.name.toLowerCase().includes(String(q).toLowerCase()));
    const api = {
      root, scene: inner, clips: g.animations.map(c => c.name),
      play(q, o = {}) {
        const clip = mixer && find(q); if (!clip) return null;
        const a = mixer.clipAction(clip);
        if (current === a && a.isScheduled() && !o.restart && (o.key === undefined || o.key === currentKey)) {   // a played-once clip stays on its last frame
          if (!a.paused) a.setEffectiveTimeScale(paced(clip, o.speed)); return a;
        }
        const prev = current; current = a; currentKey = o.key;            // a new key plays the same clip again from its start
        a.reset(); a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = !!o.once;
        a.setEffectiveTimeScale(paced(clip, o.speed)); a.setEffectiveWeight(1); a.play();
        if (prev && prev !== a) prev.crossFadeTo(a, o.fade ?? .35, false);
        return a;
      },
      stop() { if (mixer) mixer.stopAllAction(); current = null; },
      node: part,
      /** puts `object` in a hand (KayKit: handslot.r, handslot.l) at the size it has on the stage, also when it moves from
          one hand to another; null when the slot is missing */
      hold(object, slot = 'handslot.r') {
        const b = part(slot); if (!b) return null;
        const size = object.userData.stageScale || (object.userData.stageScale = object.scale.clone());
        root.updateMatrixWorld(true);
        mRel.copy(root.matrixWorld).invert().multiply(b.matrixWorld).decompose(vPos, qRel, vScale);
        b.add(object); object.scale.copy(size).divideScalar(vScale.x || 1);
        return object;
      },
      /** after the animation: points a bone (the way it runs to its child, its +y) at [x, y, z] in the character's own
          space (+y up, +z where it faces, +x its left hand's side), k (0..1) of the way. Aim a parent before its child:
          upper arm, then lower arm; and bend the back before aiming the arms (a bend after an aim swings the aimed arm). A wave: aim('upperarm.r', [-.45, .85, .2]); aim('lowerarm.r', [-.15 + .3 * sin, 1, .2]). */
      aim(bone, dir, k = 1) {
        const b = typeof bone === 'string' ? part(bone) : bone; if (!b || !k || !b.parent) return;
        touch(b); b.updateWorldMatrix(true, false);
        b.getWorldQuaternion(qBone); root.getWorldQuaternion(qRoot); b.parent.getWorldQuaternion(qParent);
        vNow.copy(UP).applyQuaternion(qBone).normalize();
        vWant.set(dir[0], dir[1], dir[2]).normalize().applyQuaternion(qRoot);
        qTurn.setFromUnitVectors(vNow, vWant); if (k < 1) qTurn.slerp(qNone, 1 - k);   // k of the way (slerpQuaternions would overwrite qTurn first)
        b.quaternion.copy(qParent.invert().multiply(qTurn.multiply(qBone)));
        b.updateMatrixWorld(true);
      },
      /** after the animation: turns a bone a little more about its own axes (radians), k (0..1) of the way; for gestures
          the clips do not have (a wave, a hug, a lean). Call it every frame you want it: the animation resets the bone. */
      bend(bone, x, y, z, k = 1) {
        const b = typeof bone === 'string' ? part(bone) : bone; if (!b || !k) return;
        touch(b); eBend.set(x * k, y * k, z * k); qBend.setFromEuler(eBend); b.quaternion.multiply(qBend);
      },
      /** scales the model to { height } (or width, depth) in card widths, feet on the card and centred; { without: ['Mage_Hat'] }
          leaves parts out of the measure, so a tall hat does not shrink the one wearing it */
      fit(o = {}) {
        inner.position.set(0, 0, 0); inner.scale.setScalar(1); root.updateMatrixWorld(true);
        // fit now measures in the model's own space, vertex by vertex (skinning and morphs included): a box along the world's
        // axes grew with the card's tilt when the act was built, so the same model came out a different size each time
        const skip = new Set((o.without || []).map(part).filter(Boolean)), inv = root.matrixWorld.clone().invert();
        const box = new THREE.Box3(), toRoot = new THREE.Matrix4(), v = new THREE.Vector3();
        const walk = x => {
          if (skip.has(x)) return;
          if (x.isMesh && x.geometry?.attributes.position) {
            toRoot.multiplyMatrices(inv, x.matrixWorld);
            for (let i = 0, n = x.geometry.attributes.position.count; i < n; i++) box.expandByPoint(x.getVertexPosition(i, v).applyMatrix4(toRoot));
          }
          x.children.forEach(walk);
        };
        walk(inner);
        if (box.isEmpty()) return api;
        const size = box.getSize(new THREE.Vector3());
        const k = o.height ? o.height / (size.y || 1) : o.width ? o.width / (size.x || 1) : o.depth ? o.depth / (size.z || 1) : 1;
        inner.scale.setScalar(k);
        inner.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
        return api;
      }
    };
    return api;
  }

  /* ── sound: nothing is fetched or played until the player enables it from a tap ── */
  const SOUND = tpl.sound && typeof tpl.sound === 'object' ? tpl.sound : null;
  const soundFiles = SOUND ? Object.entries({ music: SOUND.music, soft: SOUND.soft, ...(SOUND.effects || {}) }).filter(([, f]) => typeof f === 'string') : [];
  let actx = null, master = null, musicBus = null, muted = false, wantMusic = null, musicName = null, musicNow = null;
  const buffers = {};
  function startMusic(name) {
    if (!actx || !buffers[name] || musicName === name) return;
    const src = actx.createBufferSource(), g = actx.createGain();
    src.buffer = buffers[name]; src.loop = true; g.gain.value = 0; src.connect(g); g.connect(musicBus); src.start();
    g.gain.setTargetAtTime(1, actx.currentTime, .35);
    if (musicNow) { musicNow.gain.gain.setTargetAtTime(0, actx.currentTime, .3); musicNow.src.stop(actx.currentTime + 1.5); }
    musicNow = { src, gain: g }; musicName = name;
  }
  const sound = {
    has: soundFiles.length > 0,
    /** from inside a tap: makes the audio context (or wakes it) and fetches the sounds the first time */
    enable() {
      if (!soundFiles.length || disposed) return;
      try {
        if (!actx) {
          const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
          actx = new AC(); master = actx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(actx.destination);
          musicBus = actx.createGain(); musicBus.gain.value = SOUND.volume ?? .5; musicBus.connect(master);
          for (const [name, file] of soundFiles)
            fetch(new URL(file, base).href).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${file}: ${r.status}`))))
              .then(b => actx.decodeAudioData(b)).then(buf => { buffers[name] = buf; if (name === wantMusic) startMusic(name); })
              .catch(e => console.warn('[lovestory] a sound did not load', e));
        }
        if (actx.state === 'suspended') actx.resume();
        const blip = actx.createBufferSource(); blip.buffer = actx.createBuffer(1, 1, 22050); blip.connect(actx.destination); blip.start();   // older iOS
      } catch (e) { console.warn('[lovestory] no sound', e); }
    },
    mute(on) { muted = !!on; if (master) master.gain.setTargetAtTime(muted ? 0 : 1, actx.currentTime, .04); }
  };
  function sfx(name, o = {}) {
    if (!actx || !buffers[name] || state.paused || actx.state !== 'running') return;
    const src = actx.createBufferSource(), g = actx.createGain();
    src.buffer = buffers[name]; src.playbackRate.value = o.rate ?? 1; g.gain.value = o.volume ?? 1;
    src.connect(g); g.connect(master); src.start();
  }
  function music(name) { wantMusic = name; startMusic(name); }

  /* ── the story ── */
  const fired = new Set();
  const kit = {
    THREE, stage, card: { width: 1, depth: tpl.aspect || .625 }, clamp, lerp, seg, ease, rng, tween, hop, keep, words,
    model, sign, polaroid, photo, photoCount: () => photoImgs.length, particles, glow, picture, canvasTexture, backdrop, env,
    lights: { hemi, sun }, heartPath, fitText, HAND,
    /** true the first time it is asked after the story (re)starts */
    once: key => (fired.has(key) ? false : (fired.add(key), true)),
    onTap: (object, fn) => { taps.set(object, { fn }); return object; },
    sfx, music
  };
  let story = null, seconds = [], starts = [];
  const reg = window.NM_STORIES = window.NM_STORIES || {};
  const storyFiles = [].concat(tpl.story || 'story.js');               // helpers first; the last file registers the story
  const storyUrl = new URL(storyFiles[storyFiles.length - 1], base).href;
  const loaded = window.NM_STORY_FILES = window.NM_STORY_FILES || new Set();
  const loadScript = file => new Promise(res => {
    const url = new URL(file, base).href;
    if (loaded.has(url)) return res();
    const s = document.createElement('script'); s.src = url;
    s.onload = () => { loaded.add(url); res(); }; s.onerror = () => { errors.push(`${file} could not be loaded`); res(); };
    document.head.appendChild(s);
  });
  const storyReady = reg[storyUrl] ? Promise.resolve() : storyFiles.reduce((p, f) => p.then(() => loadScript(f)), Promise.resolve());
  const ready = Promise.all([storyReady, modelsReady, photoReady]).then(async () => {
    await Promise.race([fontsReady, new Promise(r => setTimeout(r, 1500))]);
    try {
      const make = reg[storyUrl]; if (!make) throw new Error(`${tpl.story || 'story.js'} did not register a story`);
      story = make(kit);
      seconds = (tpl.chapters || [0]).map((_, i) => story.seconds[i] ?? 5);
      starts = seconds.map((_, i) => seconds.slice(0, i).reduce((a, b) => a + b, 0));
      story.build();
      story.reset?.();
    } catch (e) { errors.push(e && e.message ? e.message : String(e)); story = null; }
  });
  anchor.object3D.add(root);

  /* ── the clock: a chapter plays to its stop, then holds until the next play ── */
  const state = { chapter: -1, t: 0, T: 0, paused: true, stopped: true };
  let raf = 0, disposed = false, last = performance.now();
  function tick(now) {
    const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now;   // a frame stamped before play() would step back
    if (!state.paused && story) { state.t += dt; state.T += dt; }   // the clock waits for the story (models on a slow phone)
    if (story) {
      const ch = Math.max(0, state.chapter), t = state.chapter < 0 ? 0 : state.t;
      const f = { chapter: ch, t, g: starts[ch] + Math.min(t, seconds[ch]), T: state.T, dt: state.paused ? 0 : dt, held: t >= seconds[ch] };
      untouch();                                                       // last frame's gestures off, then the clips on
      mixers.forEach(m => m.update(state.paused ? 0 : dt));
      try { story.pose(f); } catch (e) { errors.push(e && e.message ? e.message : String(e)); story = null; console.error('[lovestory]', e); }
      polaroids.forEach(p => p.turn(f.T));
      window.__storyClock = f.g;                                        // for tests: where the story is (scripts/shoot-card.mjs)
      if (!state.stopped && !state.paused && state.chapter >= 0 && state.t >= seconds[state.chapter]) { state.stopped = true; onStop(state.chapter); }
    }
    if (!disposed) raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    play(i) {
      if (i === 0) {
        music('music');                                                // the theme from the top (silent until sound is on)
        fired.clear(); mixers.forEach(m => m.stopAllAction());
        photoImgs = shuffle(photoImgs); polaroids.forEach(p => p.rewind());   // a new order of photos each play
        try { story?.reset?.(); } catch (e) { errors.push(String(e)); }
      }
      state.chapter = i; state.t = 0; state.stopped = false; state.paused = false; last = performance.now();
      if (!story && i >= 0) ready.then(() => { if (!story && !disposed && state.chapter === i && !state.stopped) { state.stopped = true; onStop(i); } });
    },
    pause() { state.paused = true; if (actx && actx.state === 'running') actx.suspend(); },
    resume() { state.paused = false; last = performance.now(); if (actx && actx.state === 'suspended') actx.resume(); },
    sound,
    turn(rad) { spin.rotation.y += rad; },
    /** what a tap along this ray finds: { photo: link } for a photo (the player shows it big), { handled: true } when the
        story took it, null for nothing (the tap plays on). The nearest thing hit decides: a wall in front hides a frame. */
    pick(raycaster) {
      if (!story) return null;
      for (const h of raycaster.intersectObject(root, true)) {
        const o = h.object, m = o.material;
        if (!o.isMesh || !(o.userData.proxy ? inView(o.parent) : inView(o))) continue;
        if (m && !Array.isArray(m) && (m.isShadowMaterial || m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < .5))) continue;
        for (let x = o; x && x !== root; x = x.parent) {
          const t = taps.get(x);
          if (!t) continue;
          if (t.photo) { const src = t.photo(); if (src) sfx('shutter', { volume: .5 }); return src ? { photo: src } : null; }
          try { t.fn(); } catch (e) { errors.push(e && e.message ? e.message : String(e)); }
          return { handled: true };
        }
        return null;
      }
      return null;
    },
    repaint: () => painters.forEach(p => p()),
    ready,
    modelError: () => (errors.length ? errors.join('; ') : null),
    dispose() {
      disposed = true; cancelAnimationFrame(raf); anchor.object3D.remove(root);
      try { musicNow?.src.stop(); actx?.close(); } catch (e) { /* already closed */ }
      mixers.forEach(m => m.stopAllAction()); painters.clear();
      root.traverse(o => {                                           // the models' own geometry, materials and textures too
        if (o.geometry) o.geometry.dispose();
        for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
          for (const v of Object.values(m)) if (v && v.isTexture && v !== env) v.dispose();
          m.dispose();
        }
        if (o.isLight && o.dispose) o.dispose();
      });
      disposables.forEach(x => x.dispose && x.dispose());
    }
  };
};
