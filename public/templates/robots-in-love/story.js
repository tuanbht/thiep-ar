/* Robot biết yêu (robots in love), told by the shared act _acts/lovestory.js. Three chapters, each ending at a stop:
     1 · 0–6.4 s     he walks in and waves at the phone; she beams in beside the card and hops over; his face goes
                     surprised, a "!" turns into a pixel heart, he gives a shy thumbs-up and the heart opens into a note
                     with the card's first words (note1)
     2 · 6.4–12.8 s  he squints, gathers sparks into a glowing LED heart and holds it out; she nods yes; he jumps for joy
                     and the heart floats up and projects the card's photo as a hologram, with its caption
     3 · 12.8–19.2 s the photo is saved into the heart, which rises into a disco light; they dance under sweeping coloured
                     lights and falling heart confetti, then hold hands as a banner with the last words (note2) rises
   RobotExpressive (CC0) twice: "bot" keeps his colours, "botgirl" is recoloured here and given a bow. Its parts are rigid
   meshes on bones (UpperArm.R, LowerArm.R, Middle1.R, Head…), it faces +z, and every clip keys the face's morph targets,
   so the faces are set after the clips, every frame. Everything is a function of g, the story's clock (it holds still at
   a stop), so any chapter can be played on its own; while held, periodic things go by T. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, lerp, rng, words } = kit;
  const H = 0.3, Z = 0.09;                                           // their height; they stand on the print's charging pad
  const PI = Math.PI, TAU = PI * 2;
  const HOVER = new THREE.Vector3(0, .37, Z - .03), DISCO = new THREE.Vector3(0, .83, -.14);
  const PINK = ['#ff4f8b', '#ff8fb5', '#ffd1e0'], PARTY = ['#ff4f8b', '#ffd23f', '#4fdcff', '#a98bff', '#ff8fb5'];
  let bot, girl, faces, blush, note, banner, photo, halo, scan, beam, led, ledGlow, ledLight, flash, alert, pixHeart, tunes;
  let spots, sparks, hearts, confetti, disco = 0;
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();
  const DAY_SKY = new THREE.Color('#fff6f0'), PARTY_SKY = new THREE.Color(.78, .74, 1);

  /* the clip each robot plays from story time g: [from g, clip, options] */
  const BOT = [
    [0, 'Idle'], [.1, 'Walking', { speed: 1.25 }], [2.5, 'Idle', { fade: .25 }], [2.7, 'Wave', { fade: .2 }], [4.25, 'Idle', { fade: .35 }],
    [4.75, 'ThumbsUp', { once: true, fade: .25 }], [6.3, 'Idle', { fade: .45 }],
    [9.35, 'Jump', { once: true, fade: .12 }], [10.1, 'Idle', { fade: .3 }],
    [13.7, 'Dance', { fade: .3 }], [17.1, 'Idle', { fade: .45 }]
  ];
  const GIRL = [
    [0, 'Idle'], [3.1, 'Jump', { speed: 1.15, fade: .12 }], [4.34, 'Idle', { fade: .2 }],
    [8.5, 'Yes', { once: true, fade: .25 }], [10.2, 'Idle', { fade: .4 }],
    [13.75, 'Dance', { fade: .3 }], [17.1, 'Idle', { fade: .45 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  /** eases in and out over the first and last fifth, steady between, so the walk's feet don't skate */
  const walk = (t, a, b, r = .2) => {
    const u = seg(t, a, b), s = 1 / (1 - r);
    return u < r ? s * u * u / (2 * r) : u > 1 - r ? 1 - s * (1 - u) * (1 - u) / (2 * r) : s * (u - r / 2);
  };
  const beat = T => Math.pow(Math.max(0, Math.sin(T * 7.4)), 6);    // a heartbeat's thump, about 1.2 a second

  /** the robot's real extent in its own space, vertex by vertex (a world box turned back into it would be too big) */
  function extent(m) {
    m.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(m.root.matrixWorld).invert(), into = new THREE.Matrix4(), box = new THREE.Box3(), v = new THREE.Vector3();
    m.scene.traverse(o => {
      if (!o.isMesh) return;
      into.multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0, n = o.geometry.attributes.position.count; i < n; i++) box.expandByPoint(o.getVertexPosition(i, v).applyMatrix4(into));
    });
    return box;
  }
  /* fit() turns a world box back into the model's space, too big whenever the card is tilted (as in the preview), and the
     robot comes out small and floating: size it by its real shape instead, boots on the floor */
  function stand(m) {
    m.fit({ height: H });
    let b = extent(m);
    m.scene.scale.multiplyScalar(H / (b.max.y - b.min.y));
    b = extent(m);
    m.scene.position.x -= (b.min.x + b.max.x) / 2; m.scene.position.y -= b.min.y; m.scene.position.z -= (b.min.z + b.max.z) / 2;
    return m;
  }
  /** the face: the head's three parts (grey, main, black) share the morph targets */
  function faceOf(m) {
    const parts = []; m.scene.traverse(o => { if (o.morphTargetDictionary) parts.push(o); });
    return (angry, surprised, sad) => parts.forEach(p => {
      const d = p.morphTargetDictionary, w = p.morphTargetInfluences;
      w[d.Angry] = angry; w[d.Surprised] = surprised; w[d.Sad] = sad;
    });
  }
  /** where a part of a robot is on the stage, this frame */
  const at = (m, part, out) => { const b = m.node(part); b.updateWorldMatrix(true, false); out.setFromMatrixPosition(b.matrixWorld); stage.updateWorldMatrix(true, false); return stage.worldToLocal(out); };

  /* her colours: the shared yellow becomes rose, the grey pearl */
  function recolour(m) {
    const swap = new Map();
    m.scene.traverse(o => {
      if (!o.isMesh) return;
      const one = x => {
        if (!swap.has(x)) {
          const c = x.name === 'Main' ? x.clone() : x.name === 'Grey' ? x.clone() : x;
          if (x.name === 'Main') c.color.set('#f47aa9'); else if (x.name === 'Grey') c.color.set('#fbe9f1');
          if (c !== x) kit.keep(x);
          swap.set(x, c);
        }
        return swap.get(x);
      };
      o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
    });
  }
  /* a polka-dot bow for her head: two puffy loops, two tails and a knot (sizes in card widths) */
  function bow() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c = cv.getContext('2d'); c.fillStyle = '#e8336d'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#ffe3ee';
    for (const [x, y] of [[10, 12], [42, 8], [26, 30], [56, 34], [8, 46], [40, 54]]) { c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fill(); }
    const dots = kit.keep(new THREE.CanvasTexture(cv)); dots.colorSpace = THREE.SRGBColorSpace;
    const silk = kit.keep(new THREE.MeshStandardMaterial({ map: dots, roughness: .45, metalness: .05 }));
    const knotSilk = kit.keep(new THREE.MeshStandardMaterial({ color: '#d42a60', roughness: .4 }));
    const puff = kit.keep(new THREE.SphereGeometry(.02, 18, 12)), tail = kit.keep(new THREE.BoxGeometry(.011, .026, .004));
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(puff, silk); l.position.set(s * .02, .003, 0); l.scale.set(1, .64, .45); l.rotation.z = s * .32; g.add(l);
      const t = new THREE.Mesh(tail, silk); t.position.set(s * .009, -.017, .002); t.rotation.z = s * .38; g.add(t);
    }
    const knot = new THREE.Mesh(kit.keep(new THREE.SphereGeometry(.009, 14, 10)), knotSilk); knot.position.z = .004; knot.scale.set(1, .9, .8); g.add(knot);
    g.traverse(o => { o.castShadow = true; });
    return g;
  }
  /* rosy cheeks by a robot's eyes, faded in and out by their opacity */
  function cheeks(m) {
    const mat = kit.keep(new THREE.MeshBasicMaterial({ color: '#ff3b78', transparent: true, opacity: 0, depthWrite: false }));
    const disc = kit.keep(new THREE.CircleGeometry(.0033, 20));                 // head-bone units (about .022 on the card)
    const g = new THREE.Group();
    for (const s of [-1, 1]) { const d = new THREE.Mesh(disc, mat); d.position.set(s * .0074, .0006, .0113); d.rotation.set(.25, s * .5, 0); d.scale.y = .7; g.add(d); }
    m.node('Head').add(g);
    return mat;
  }

  /* the LED heart: an extruded heart whose faces are a grid of glowing dots */
  function ledHeart() {
    const s = new THREE.Shape();                                     // the act's heartPath, y up
    s.moveTo(0, -.42); s.bezierCurveTo(-.62, 0, -.5, .55, 0, .25); s.bezierCurveTo(.5, .55, .62, 0, 0, -.42);
    const geo = kit.keep(new THREE.ExtrudeGeometry(s, { depth: .16, bevelEnabled: true, bevelThickness: .07, bevelSize: .06, bevelSegments: 3, curveSegments: 28 }));
    geo.center(); geo.scale(.075, .075, .075);
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d'); c.fillStyle = '#4a0822'; c.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {        // a tiling grid of LEDs
      const gr = c.createRadialGradient(x * 16 + 8, y * 16 + 8, 0, x * 16 + 8, y * 16 + 8, 7);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(.45, '#ffc2d6'); gr.addColorStop(1, 'rgba(255,90,140,0)');
      c.fillStyle = gr; c.fillRect(x * 16, y * 16, 16, 16);
    }
    const dots = kit.keep(new THREE.CanvasTexture(cv)); dots.wrapS = dots.wrapT = THREE.RepeatWrapping; dots.repeat.set(.85, .85); dots.colorSpace = THREE.SRGBColorSpace;
    const face = kit.keep(new THREE.MeshStandardMaterial({ color: '#ff3f7f', emissive: '#ff4f8b', emissiveMap: dots, emissiveIntensity: 1.6, roughness: .3, metalness: .1 }));
    const rim = kit.keep(new THREE.MeshStandardMaterial({ color: '#ff8fb5', emissive: '#ff2f6f', emissiveIntensity: .9, roughness: .35 }));
    const mesh = new THREE.Mesh(geo, [face, rim]); mesh.castShadow = true;
    const g = new THREE.Group(); g.add(mesh); g.userData.face = face;
    return g;
  }

  /* pictures that face the phone: a "!" in a speech bubble, a pixel heart */
  const NAVY = '#24305e';
  function pixels(rows, colours) {
    return (c, px) => {
      const n = Math.max(rows.length, rows[0].length), s = px / (n + 1), ox = (px - rows[0].length * s) / 2, oy = (px - rows.length * s) / 2;
      rows.forEach((row, y) => [...row].forEach((ch, x) => { if (colours[ch]) { c.fillStyle = colours[ch]; c.fillRect(ox + x * s, oy + y * s, s + .6, s + .6); } }));
    };
  }
  const HEART = ['..ooo.ooo..', '.orrrorrro.', 'orwwrrrrrro', 'orwrrrrrrro', 'orrrrrrrrpo', '.orrrrrrpo.', '..orrrrpo..', '...orrpo...', '....opo....', '.....o.....'];
  const BANG = ['.ooooooooo.', 'owwwwwwwwwo', 'owwwwrwwwwo', 'owwwwrwwwwo', 'owwwwrwwwwo', 'owwwwrwwwwo', 'owwwwwwwwwo', 'owwwwrwwwwo', 'owwwwwwwwwo', '.oooo.oooo.', '.....o.o...', '......o....'];

  /** two quavers on a beam, inked so they read on any background */
  const quavers = col => (c, px) => {
    c.lineCap = c.lineJoin = 'round';
    for (const [w, ink] of [[.15, NAVY], [.08, col]]) {
      c.strokeStyle = ink; c.lineWidth = px * w; c.beginPath();
      c.moveTo(px * .36, px * .7); c.lineTo(px * .36, px * .22); c.lineTo(px * .76, px * .14); c.lineTo(px * .76, px * .62); c.stroke();
    }
    c.fillStyle = col; c.strokeStyle = NAVY; c.lineWidth = px * .05;
    for (const [x, y] of [[.25, .72], [.65, .64]]) { c.beginPath(); c.ellipse(px * x, px * y, px * .14, px * .1, -.45, 0, TAU); c.fill(); c.stroke(); }
  };

  /* soft gradients for the lights: down a beam, round a spot on the floor */
  function gradient(w, h, paint) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; paint(cv.getContext('2d')); const t = kit.keep(new THREE.CanvasTexture(cv)); t.colorSpace = THREE.SRGBColorSpace; return t; }
  const fade = (top, bottom) => gradient(4, 128, c => { const g = c.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, `rgba(255,255,255,${top})`); g.addColorStop(1, `rgba(255,255,255,${bottom})`); c.fillStyle = g; c.fillRect(0, 0, 4, 128); });

  return {
    seconds: [6.4, 6.4, 6.4],

    build() {
      /* the two robots */
      bot = stand(kit.model('bot')); girl = stand(kit.model('botgirl'));
      recolour(girl);
      stage.add(bot.root, girl.root);
      faces = { bot: faceOf(bot), girl: faceOf(girl) };
      const b = bow(); girl.hold(b, 'Head'); b.position.set(.0058, .0146, .0005); b.rotation.set(-.55, .15, -.38);   // head-bone units
      blush = { bot: cheeks(bot), girl: cheeks(girl) };

      /* the card's words and photo; the photo is a hologram: a cyan frame, a halo, a scan line, a projector's beam */
      note = kit.sign({ text: words('note1', 'Hệ thống báo: anh đã phải lòng em'), width: .4, paper: '#f7fdff', ink: NAVY, accent: '#ff6f9f', glow: .5 });
      banner = kit.sign({ text: words('note2', 'Yêu em 100%!'), style: 'banner', width: .58, accent: '#ff4f8b', glow: .5 });
      photo = kit.polaroid({ width: .22, caption: words('caption', 'Dữ liệu quý nhất của anh'), glow: .6 });
      photo.root.traverse(o => { for (const m of o.isMesh ? [].concat(o.material) : []) { if (m.map) m.emissive.set('#d8fbff'); else { m.color.set('#e2fcff'); m.emissive.set('#8cf2ff'); m.emissiveIntensity = .55; } } });
      halo = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(.46, .5)), kit.keep(new THREE.MeshBasicMaterial({ map: gradient(128, 128, c => {
        const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, 128, 128); }), color: '#5fe8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
      halo.position.set(0, photo.height / 2, -.012); photo.root.add(halo);   // a flat glow just behind it: a sprite this big would cut through it
      scan = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(photo.width * 1.06, .005)),
        kit.keep(new THREE.MeshBasicMaterial({ color: '#27dcff', transparent: true, opacity: 0, depthWrite: false })));
      scan.position.z = .004; scan.renderOrder = 7; photo.root.add(scan);
      const frustum = kit.keep(new THREE.CylinderGeometry(.156, .012, 1, 4, 1, true)); frustum.rotateY(PI / 4); frustum.translate(0, .5, 0);
      beam = new THREE.Mesh(frustum, kit.keep(new THREE.MeshBasicMaterial({ map: fade(.15, .7), color: '#62ecff', transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
      beam.renderOrder = 5;
      stage.add(note.root, banner.root, photo.root, beam);

      /* the LED heart, its glow and the light it throws on them */
      led = ledHeart(); ledGlow = kit.glow({ color: 0xff5c93, size: .2, opacity: 0 }); ledLight = new THREE.PointLight(0xff4f8b, 0, .7, 1.6);
      flash = kit.glow({ color: 0xffffff, size: .3, opacity: 0 }); flash.material.depthTest = false;
      stage.add(led, ledGlow, ledLight, flash);
      alert = kit.picture(pixels(BANG, { o: NAVY, w: '#ffffff', r: '#ff4f8b' }), { size: .09 });
      pixHeart = kit.picture(pixels(HEART, { o: NAVY, r: '#ff4f8b', p: '#d92f69', w: '#ffd1e0' }), { size: .09 });
      tunes = ['#ff8fb5', '#4fdcff', '#ffd23f'].map(col => kit.picture(quavers(col), { size: .075, px: 128 }));
      stage.add(alert, pixHeart, ...tunes);

      /* the disco: coloured pools sweeping the card, a beam to each from the heart above, two coloured lights */
      const pool = gradient(128, 128, c => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(.55, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
      const disc = kit.keep(new THREE.CircleGeometry(1, 40)), cone = kit.keep(new THREE.ConeGeometry(1, 1, 24, 1, true)); cone.translate(0, -.5, 0);
      const beamFade = fade(.6, 0);
      spots = ['#ff4fa3', '#36d7ff', '#ffd23f', '#9b6bff'].map((col, i) => {
        const floor = new THREE.Mesh(disc, kit.keep(new THREE.MeshBasicMaterial({ map: pool, color: col, transparent: true, opacity: 0, depthWrite: false })));
        floor.rotation.x = -PI / 2; floor.renderOrder = 1;
        const ray = new THREE.Mesh(cone, kit.keep(new THREE.MeshBasicMaterial({ map: beamFade, color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
        ray.renderOrder = 3;
        stage.add(floor, ray);
        return { floor, ray, col, r: .1 + (i % 2) * .025, ph: i * 1.7 };
      });
      spots.slice(0, 2).forEach(s => { s.light = new THREE.PointLight(s.col, 0, .9, 1.4); stage.add(s.light); });

      /* particles */
      sparks = kit.particles({ max: 320, additive: true });
      hearts = kit.particles({ max: 140 });
      confetti = kit.particles({ max: 260 });
      stage.add(sparks.root, hearts.root, confetti.root);
    },

    reset() {
      [sparks, hearts, confetti].forEach(p => p.clear());
      bot.stop(); girl.stop(); disco = 0;
    },

    pose({ g, T, dt, held }) {
      /* light: daylight, then a party for the dance */
      const party = ease.inOut(seg(g, 13.4, 14.2));
      kit.lights.hemi.intensity = lerp(1.1, .58, party); kit.lights.sun.intensity = lerp(1.5, .72, party);
      kit.lights.hemi.color.copy(DAY_SKY).lerp(PARTY_SKY, party);

      /* where they stand and which way they look (+z is the phone, rotation.y = PI / 2 looks to +x) */
      const apart = ease.inOut(seg(g, 13.3, 13.75)), close = ease.inOut(seg(g, 17.1, 17.6));
      const hopU = Math.max(0, (g - 3.1) / .617), hopN = Math.min(2, Math.floor(hopU)), hopF = hopN >= 2 ? 0 : seg(hopU - hopN, .22, .64);
      const hopP = hopN + ease.inOut(hopF);                                   // two hops, each in the clip's own airborne part
      bot.root.position.set(lerp(-.62, -.13, walk(g, .1, 2.5)) - .035 * apart + .057 * close, 0, Z);
      girl.root.position.set(lerp(.56, .13, hopP / 2) + .035 * apart - .057 * close, .05 * Math.sin(PI * hopF), Z);
      const beamIn = ease.back(seg(g, 2.85, 3.1));                            // she beams in beside the card, then hops on
      girl.root.visible = beamIn > 0; girl.root.scale.set(Math.max(.001, lerp(.3, 1, beamIn)), Math.max(.001, beamIn), Math.max(.001, lerp(.3, 1, beamIn)));
      if (g > 2.85 && kit.once('beam-in')) sparks.burst(22, i => { const a = i / 22 * TAU; return { x: .56 + Math.cos(a) * .07, y: .02 + (i % 4) * .07, z: Z + Math.sin(a) * .05,
        vy: .12, drag: 1.5, color: i % 2 ? '#7ff0ff' : '#ffffff', size: .014 + (i % 3) * .005, life: .8, shape: i % 3 ? 'glow' : 'sparkle', spin: 4 }; });
      const dance = g > 13.75 && g < 17.1 ? kit.hop(g - 13.75, .4167, .012) : 0;   // a bounce on the music's beat
      bot.root.position.y += dance; girl.root.position.y += dance;
      bot.root.rotation.y = tween(g, [[0, PI / 2], [2.45, PI / 2], [2.85, .2], [4.32, .2], [4.6, .95], [4.85, .95], [5.15, .42],
        [6.45, .42], [6.9, 1], [13.3, 1], [13.7, .25], [17.1, .25], [17.5, 1]]);
      girl.root.rotation.y = tween(g, [[0, -PI / 2], [4.4, -PI / 2], [4.8, -.85], [6.45, -.85], [6.9, -1], [13.3, -1], [13.7, -.25],
        [17.1, -.25], [17.5, -1]]) - TAU * ease.inOut(seg(g, 14.6, 15.4));   // she twirls while they dance
      const bc = clipAt(BOT, g), gc = clipAt(GIRL, g);
      bot.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);

      /* gestures the clips do not have */
      const look = seg(g, 4.22, 4.32) * (1 - seg(g, 4.55, 4.85));            // his head turns to her before his body does
      if (look) bot.bend('Head', 0, .7, 0, look);
      const shyB = seg(g, 5, 5.5) * (1 - seg(g, 6.4, 6.8));
      if (shyB) { bot.bend('Head', .12, 0, .2 + .04 * Math.sin(T * 2.1), shyB); bot.bend('Neck', .06, 0, 0, shyB); }
      const shyG = seg(g, 4.75, 5.2) * (1 - seg(g, 6.45, 6.8));             // she clasps her hands and tips her head
      if (shyG) {
        girl.aim('UpperArm.R', [-.25, -.6, .7], shyG); girl.aim('LowerArm.R', [.75, .15, .65], shyG);
        girl.aim('UpperArm.L', [.25, -.6, .7], shyG); girl.aim('LowerArm.L', [-.75, .15, .65], shyG);
        girl.bend('Head', .1, 0, -.22 + .05 * Math.sin(T * 1.8), shyG);
      }
      const cup = seg(g, 6.95, 7.3) * (1 - seg(g, 7.65, 7.8)), offer = seg(g, 7.65, 7.95) * (1 - seg(g, 9.25, 9.4));
      if (cup) {                                                              // cupped hands, gathering the sparks
        bot.aim('UpperArm.R', [-.15, -.55, .8], cup); bot.aim('LowerArm.R', [.6, .25, .75], cup);
        bot.aim('UpperArm.L', [.15, -.55, .8], cup); bot.aim('LowerArm.L', [-.6, .25, .75], cup);
        bot.bend('Neck', .1, 0, 0, cup);
      }
      if (offer) {                                                            // holding the heart out to her
        bot.aim('UpperArm.R', [-.1, -.5, 1], offer); bot.aim('LowerArm.R', [.25, .05, 1], offer);
        bot.aim('UpperArm.L', [.1, -.5, 1], offer); bot.aim('LowerArm.L', [-.25, .05, 1], offer);
        bot.bend('Neck', .08, 0, 0, offer); bot.bend('Head', .06, 0, 0, offer);
      }
      const gasp = seg(g, 7.85, 8.1) * (1 - seg(g, 8.45, 8.6));
      if (gasp) { girl.bend('Neck', -.16, 0, 0, gasp); girl.bend('Head', -.08, 0, 0, gasp); }
      const up = seg(g, 10.9, 11.5) * (1 - seg(g, 12.85, 13.2));            // both look up at the hologram
      if (up) for (const m of [bot, girl]) { m.bend('Neck', -.12, 0, 0, up); m.bend('Head', -.28, 0, .06 * Math.sin(T * 1.3 + (m === bot ? 0 : 2)), up); }
      const spin = ease.inOut(seg(g, 15.6, 16.3));                            // a robot can turn its head right round
      if (spin > 0 && spin < 1) bot.bend('Head', 0, TAU * spin, 0);
      const hands = ease.smooth(seg(g, 17.35, 17.8));
      if (hands) {
        bot.aim('UpperArm.L', [.45, -.75, .5], hands); bot.aim('LowerArm.L', [.55, -.45, .7], hands);
        girl.aim('UpperArm.R', [-.45, -.75, .5], hands); girl.aim('LowerArm.R', [-.55, -.45, .7], hands);
        const tip = ease.smooth(seg(g, 17.8, 18.5)) * (1 + .15 * Math.sin(T * 1.6));
        bot.bend('Head', .06, 0, -.16, tip); girl.bend('Head', .06, 0, .18, tip);
      }

      /* faces: [angry (a focused squint), surprised, sad (hopeful)], and their cheeks */
      const focus = tween(g, [[6.95, 0], [7.15, 1], [7.62, 1], [7.72, 0]]);   // he squints to build the heart
      const bs = tween(g, [[4.25, .45], [4.42, .95, 'out'], [4.9, .9], [5.5, .5], [7.68, .45], [7.8, .75, 'out'], [8.2, .35],
        [9.05, .95, 'out'], [10.2, .6], [11, .45], [16.35, .45], [16.5, .95, 'out'], [17, .5]]);
      const bsad = tween(g, [[7.85, .4], [8.15, .65], [8.9, .65], [9.1, .4]]);
      faces.bot(.65 * focus, bs * (1 - focus), bsad * (1 - focus));
      const gs = tween(g, [[4.35, .45], [4.5, .7], [5, .5], [7.85, .45], [8.05, .95, 'out'], [8.5, .9], [9, .55], [16.4, .5], [16.6, .85], [17.1, .5]]);
      faces.girl(0, gs, .42);
      blush.bot.opacity = .85 * tween(g, [[5, 0], [5.4, 1], [6.6, 1], [7, .25], [7.9, .25], [8.3, 1], [10, .6], [17.4, .6], [17.9, 1]]);
      blush.girl.opacity = .85 * tween(g, [[0, .55], [4.6, .55], [4.9, 1], [6.6, .6], [7.9, .6], [8.1, 1]]);

      /* chapter 1: dust where she lands, "!", a pixel heart, a glint on his thumb, then the first note opens out of the heart */
      for (const n of [0, 1]) if (g > 3.1 + .617 * (n + .64) && kit.once(`land${n}`)) {
        const x = lerp(.56, .13, (n + 1) / 2);
        hearts.burst(9, i => ({ x: x + (i - 4) * .006, y: .008, z: Z + (rng() - .5) * .04, vx: (i - 4) * .05, vy: .02 + rng() * .03, drag: 3,
          color: '#d8cde6', size: .022 + rng() * .014, grow: .8, life: .7, shape: 'glow' }));
      }
      const head = at(bot, 'Head', v1);
      const bang = ease.back(seg(g, 4.3, 4.5)) * (1 - seg(g, 4.75, 4.85));
      alert.scale.setScalar(Math.max(.001, .09 * bang)); alert.visible = bang > 0;
      alert.position.set(head.x, .375 + .01 * Math.sin(T * 9), Z);
      const ph = ease.back(seg(g, 4.75, 5)) * (1 - seg(g, 5.85, 6.05)), fly = ease.inOut(seg(g, 5.4, 6));
      pixHeart.scale.setScalar(Math.max(.001, .09 * ph * (1 + .18 * beat(T * 1.6))));
      pixHeart.position.set(lerp(head.x, 0, fly), lerp(.375, .5, fly), Z); pixHeart.visible = ph > 0;
      if (g > 4.8 && kit.once('love')) hearts.burst(10, () => ({ x: head.x, y: .37, z: Z, vx: (rng() - .5) * .2, vy: .12 + rng() * .1, gravity: -.1, drag: .6,
        color: PINK[(rng() * 3) | 0], size: .016 + rng() * .012, life: 1.6, shape: 'heart', spin: (rng() - .5) * 3 }));
      if (g > 5.4 && kit.once('thumb')) { const p = at(bot, 'Middle1.R', v2);
        sparks.burst(6, i => ({ x: p.x, y: p.y + .03, z: p.z, vx: Math.cos(i) * .12, vy: Math.sin(i) * .12, drag: 3, color: i ? '#fff3b0' : '#ffffff',
          size: i ? .012 : .04, life: i ? .5 : .7, shape: i ? 'glow' : 'sparkle', spin: 3 })); }
      const n = ease.back(seg(g, 5.75, 6.25)) * (1 - ease.in(seg(g, 6.4, 6.85)));
      note.root.scale.setScalar(Math.max(.001, n)); note.root.visible = n > .002;
      note.root.position.set(0, .5 + .1 * seg(g, 6.4, 6.85) + .007 * Math.sin(T * 1.5), .03);
      note.root.rotation.set(-.1, 0, .035 * Math.sin(T * .9));
      if (held && g < 6.5 && dt && rng() < dt * 1.3) hearts.emit({ x: (rng() - .5) * .14, y: .3, z: Z, vy: .07, sway: .03, color: PINK[(rng() * 3) | 0], size: .016, life: 2.2, shape: 'heart' });

      /* chapter 2: sparks gather into the LED heart; he holds it out; it floats up and projects the photo */
      const hands2 = at(bot, 'Middle1.L', v1).add(at(bot, 'Middle1.R', v2)).multiplyScalar(.5);
      if (g > 6.95 && g < 7.65 && dt) for (let i = 0; i < 3; i++) {     // sparks drawn in from all round
        const a = rng() * TAU, e = (rng() - .3) * 1.4, r = .13 + rng() * .07, life = .42 + rng() * .1;
        const x = Math.cos(a) * Math.cos(e) * r, y = Math.sin(e) * r, z = Math.sin(a) * Math.cos(e) * r;
        sparks.emit({ x: hands2.x + x, y: hands2.y + .03 + y, z: hands2.z + z, vx: -x / life, vy: -y / life, vz: -z / life, life,
          color: ['#ff8fb5', '#ffffff', '#7ff0ff'][i], size: .012 + rng() * .01, shape: i ? 'glow' : 'sparkle' });
      }
      const pop = ease.back(seg(g, 7.62, 7.82)), rise = ease.inOut(seg(g, 9.55, 10.45)), save = ease.in(seg(g, 12.85, 13.35));
      const lift = ease.inOut(seg(g, 13.35, 14.2));
      if (g < 9.55) led.position.copy(hands2).add(v2.set(0, .045, 0));
      else led.position.copy(hands2).add(v2.set(0, .045, 0)).lerp(HOVER, rise);
      led.position.lerp(DISCO, lift); led.position.y += .006 * Math.sin(T * 2.2) * rise;
      const pulse = 1 + .12 * beat(T) + .25 * Math.sin(PI * seg(g, 13.3, 13.5));   // a beat; a gulp as the photo goes in
      led.scale.setScalar(Math.max(.001, pop * pulse * lerp(1, 1.6, lift)));
      led.visible = g > 7.6;
      led.rotation.set(0, (g < 9.55 ? .45 : lerp(.45, TAU, rise)) + TAU * ease.inOut(seg(g, 13.35, 14.2)) + lerp(.12, .5, lift) * Math.sin(T * 1.7),
        .05 * Math.sin(T * 1.3));
      led.userData.face.emissiveIntensity = 1.3 + 1.2 * beat(T) + 2.5 * Math.sin(PI * seg(g, 13.3, 13.55));
      ledGlow.position.copy(led.position); ledGlow.material.opacity = (g > 7.6 ? lerp(.45, .75, rise) : 0) * pop * (.8 + .3 * beat(T));
      ledGlow.scale.setScalar(lerp(.13, .2, rise) * led.scale.x + .02);
      ledLight.position.copy(led.position); ledLight.intensity = led.visible ? lerp(.8, .35, rise) * (1 + .6 * beat(T)) * pop : 0;
      const fl = Math.max(seg(g, 7.62, 7.68) * (1 - seg(g, 7.7, 8)), seg(g, 13.3, 13.36) * (1 - seg(g, 13.4, 13.75)));
      flash.position.copy(led.position); flash.material.opacity = .85 * fl; flash.scale.setScalar(.08 + .16 * fl);
      if (g > 7.62 && kit.once('pop')) sparks.burst(28, i => { const a = i / 28 * TAU, s = .25 + rng() * .1; return { x: led.position.x, y: led.position.y, z: led.position.z,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 3, color: i % 2 ? '#ff8fb5' : '#ffffff', size: .016, life: .7, shape: i % 3 ? 'glow' : 'sparkle' }; });
      if (g > 9 && kit.once('yes')) hearts.burst(14, () => { const p = at(girl, 'Head', v2); return { x: p.x, y: .34, z: Z, vx: (rng() - .5) * .25, vy: .15 + rng() * .12,
        gravity: -.12, drag: .6, color: PINK[(rng() * 3) | 0], size: .018 + rng() * .014, life: 2, shape: 'heart', spin: (rng() - .5) * 3 }; });
      if (g > 9.55 && g < 10.45 && dt) sparks.emit({ x: led.position.x, y: led.position.y - .02, z: led.position.z, vx: (rng() - .5) * .04, vy: -.05,
        color: '#ff8fb5', size: .014, life: .6, shape: 'glow' });

      const show = seg(g, 10.5, 11) * (1 - save);                             // the hologram, flickering in
      const glitch = g > 10.5 && g < 11 ? (Math.sin(g * 211) > .3 ? .35 : 1) : 1;
      const sy = tween(g, [[10.5, 0], [10.62, .35], [10.7, .12], [10.84, .85], [10.92, .6], [11.02, 1]]);
      photo.root.visible = show > 0;
      photo.root.scale.set(Math.max(.001, (1 - save) * (1 + .06 * Math.sin(g * 97) * (1 - seg(g, 10.5, 11)))), Math.max(.001, sy * (1 - save) * glitch), 1);
      photo.root.position.set(.006 * Math.sin(g * 131) * (1 - seg(g, 10.5, 11)), .465 + .006 * Math.sin(T * 1.3), Z - .05).lerp(led.position, save);
      photo.root.rotation.set(-.06, .08 * Math.sin(T * .7), .03 * Math.sin(T * .5));
      halo.material.opacity = .6 * show * (1 + .1 * Math.sin(T * 3));
      const sweep = g < 12.8 ? seg(g, 10.6, 11.3) : ((T * .45) % 1);           // one sweep as it comes in; then now and then
      scan.position.y = photo.height * (1 - sweep); scan.material.opacity = .85 * show * Math.sin(PI * sweep);
      const projecting = ease.out(seg(g, 10.38, 10.62)) * (1 - ease.in(seg(g, 12.85, 13.2)));
      beam.visible = projecting > 0; beam.position.copy(led.position).add(v2.set(0, .02, 0));
      beam.scale.set(1, Math.max(.001, (photo.root.position.y - beam.position.y) * projecting), .22);
      beam.material.opacity = .55 * projecting * (.85 + .15 * Math.sin(T * 23));
      if (show > .5 && save === 0 && dt && rng() < dt * (held ? 4 : 8)) {   // scan sparkles round the frame
        const e = rng(), side = rng() < .5 ? -1 : 1, onX = rng() < .5;
        sparks.emit({ x: onX ? (e - .5) * .23 : side * .115, y: .465 + (onX ? (side > 0 ? photo.height : 0) : e * photo.height), z: Z - .045,
          vy: .02, color: rng() < .6 ? '#aaf7ff' : '#ffffff', size: .014 + rng() * .01, life: .9, shape: 'sparkle', spin: 3 });
      }
      if (save > 0 && save < 1 && dt) for (let i = 0; i < 2; i++) {          // the photo streams into the heart: saved
        const p = photo.root.position;
        sparks.emit({ x: p.x + (rng() - .5) * .2 * (1 - save), y: p.y + rng() * .25 * (1 - save), z: p.z, vx: (led.position.x - p.x) * 2, vy: (led.position.y - p.y - .1) * 2,
          color: '#9ff6ff', size: .014, life: .4, shape: 'glow' });
      }

      /* chapter 3: the disco heart, coloured pools and beams, confetti, and the banner */
      disco += dt * (held ? .5 : 1);
      const lights = ease.inOut(seg(g, 13.8, 14.5));
      spots.forEach((s, i) => {
        const t = disco * (.55 + i * .08) + s.ph;
        const x = .3 * Math.sin(t + i), z = Z + .05 + .15 * Math.sin(t * 1.37 + i * 2.1);
        s.floor.position.set(x, .004, z); s.floor.scale.setScalar(s.r * (1 + .1 * Math.sin(t * 3)));
        s.floor.material.opacity = .55 * lights; s.floor.visible = lights > 0;
        v2.set(x, 0, z).sub(led.position);
        s.ray.position.copy(led.position); s.ray.quaternion.setFromUnitVectors(v1.set(0, -1, 0), v3.copy(v2).normalize());
        s.ray.scale.set(s.r * .8, v2.length(), s.r * .8); s.ray.material.opacity = .14 * lights; s.ray.visible = lights > 0;
        if (s.light) { s.light.position.set(x, .45, z); s.light.intensity = .6 * lights; }
      });
      if (g > 14.2 && dt && rng() < dt * (held ? 6 : 22)) {                   // behind the banner's column, or in front at the sides
        const x = (rng() - .5) * .9, front = Math.abs(x) > .34;
        confetti.emit({ x, y: .95, z: front ? -.15 + rng() * .45 : -.2 + rng() * .18, vy: -.06, gravity: -.1, drag: .7,
          sway: .05, color: PARTY[(rng() * 5) | 0], size: .016 + rng() * .014, life: 4.5, shape: 'heart', spin: (rng() - .5) * 4, floor: .004 });
      }
      if (g > 14 && dt && rng() < dt * 5) { const a = rng() * TAU;
        sparks.emit({ x: led.position.x + Math.cos(a) * .07, y: led.position.y + Math.sin(a) * .07, z: led.position.z, vx: Math.cos(a) * .05, vy: Math.sin(a) * .05,
          color: PARTY[(rng() * 5) | 0], size: .016, life: .9, shape: 'sparkle', spin: 4 }); }
      if (g > 17.55 && kit.once('finale')) hearts.burst(30, () => ({ x: DISCO.x, y: DISCO.y, z: DISCO.z, vx: (rng() - .5) * .7, vy: (rng() - .2) * .35, vz: -rng() * .08,
        gravity: -.2, drag: .9, color: PINK[(rng() * 3) | 0], size: .022 + rng() * .02, life: 2.6, shape: 'heart', spin: (rng() - .5) * 4 }));
      const music = seg(g, 13.8, 14.2) * (1 - seg(g, 16.8, 17.2));
      tunes.forEach((q, i) => {
        const u = (T * .55 + i / 3) % 1, side = i % 2 ? 1 : -1;
        q.visible = music > 0; q.material.opacity = music * Math.sin(PI * u);
        q.position.set(side * (.3 + .04 * Math.sin(T * 2 + i)) + (i === 2 ? .12 : 0), .24 + .26 * u, Z - .02);
        q.material.rotation = .25 * Math.sin(T * 3 + i);
      });
      const bn = ease.elastic(seg(g, 17.35, 18.35)), br = ease.out(seg(g, 17.3, 18));
      banner.root.scale.setScalar(Math.max(.001, bn)); banner.root.visible = bn > .002;
      banner.root.position.set(0, lerp(.36, .6, br) + .006 * Math.sin(T * 1.5), .04);
      banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      if (g > 18.2 && dt && rng() < dt * 1.5) hearts.emit({ x: (rng() - .5) * .08, y: .3, z: Z, vy: .07, sway: .03, color: PINK[(rng() * 3) | 0], size: .016, life: 2.2, shape: 'heart' });

      [sparks, hearts, confetti].forEach(p => p.update(dt, T));
    }
  };
};
