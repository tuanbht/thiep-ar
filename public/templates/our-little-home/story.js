/* Tổ ấm nhỏ (our little home), told by the shared act _acts/lovestory.js. Three chapters, each ending at a stop:
     1 · 0–6.7 s     the room builds itself on the card: a wall folds up like a pop-up page, the rug unrolls, the couch
                     drops with a bounce, the lamp, the plant and the table pop in; she walks in, he follows with a
                     moving box, sets it down, and they cheer; a note with the card's first words (note1) comes up
     2 · 6.7–12.7 s  dusk: they back up onto the couch and sit, she points at the lamp and it glows warm, the box
                     shakes, pops open and the card's photo rises out of it with its caption (caption)
     3 · 12.7–19 s   they stand and dance: hands held, a twirl, a cheer; the photo goes up on the wall, fairy lights
                     come on, hearts float up and a banner with the last words (note2) rises
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, lerp, rng, words } = kit;
  const H = .27, HER = H * .945;                                     // their heights, in card widths (1.80 m and 1.70 m): the couch's seat is a chair's
  const STRIDE = { boy: .1 * H / .3, girl: .1 * HER / .3 };         // a walk's stride a second at speed 1 (the models' pace makes KayKit's theirs)
  const R = Math.PI / 2;                                             // facing +x, the way they walk in
  const WALL_Z = -.297;                                              // the wall's face, at the card's back edge
  const SEAT = { boy: [-.078, -.11], girl: [.078, -.11] };           // where they stand to sit: the hips settle onto the cushion, the knees past its edge
  const BOX_AT = [-.262, .11];                                       // where the moving box ends up, in front of him (where his hands set it)
  const CARRY = [.6, .08];                                           // how far out his upper arms and forearms go to hold the box by its sides
  const LAMP_AT = [.236, -.205], PHOTO_UP = [0, .36, -.2], PHOTO_WALL = [0, .2, WALL_Z + .006];
  const DAY = { hemi: new THREE.Color('#fff6f0'), ground: new THREE.Color('#c9a9c4'), sun: new THREE.Color('#ffffff') };
  const EVE = { hemi: new THREE.Color('#c4c0ff'), ground: new THREE.Color('#4f3f63'), sun: new THREE.Color('#9fb0ff') };
  let boy, girl, couch, rug, lamp, table, plant, books, frame;
  let wall, rugRoll, rugRoot, windowNight, bulbs, lampLight, lampGlow, shadeGlow, floorGlow, box;
  let note, banner, photo, halo, pin, tunes, hearts, sparks, dust;

  /* the pose a character holds at story time g: which clip, where, which way it looks */
  const BOY = [                                                      // [from g, clip, options]
    [0, 'Idle'], [1.1, 'Walking_A'], [2.95, 'Idle', { fade: .2 }], [3.05, 'PickUp', { once: true, fade: .2 }],
    [4.35, 'Idle', { fade: .2 }], [4.45, 'Walking_A'], [5.15, 'Idle', { fade: .2 }], [5.25, 'Cheer', { once: true, fade: .2 }],
    [6.65, 'Idle', { fade: .3 }], [6.95, 'Walking_Backwards'], [7.6, 'Sit_Chair_Down', { once: true, fade: .2 }],
    [8.4, 'Sit_Chair_Idle', { fade: .3 }], [12.85, 'Sit_Chair_StandUp', { once: true, fade: .2 }], [13.65, 'Idle', { fade: .2 }],
    [13.7, 'Walking_A'], [14.2, 'Idle', { fade: .25 }], [16.2, 'Cheer', { once: true, fade: .2 }], [17.85, 'Idle', { fade: .3 }]
  ];
  const GIRL = [
    [0, 'Idle'], [.1, 'Walking_A'], [2.9, 'Idle', { fade: .25 }], [5.2, 'Cheer', { once: true, fade: .2 }],
    [6.7, 'Idle', { fade: .3 }], [7, 'Walking_Backwards'], [7.65, 'Sit_Chair_Down', { once: true, fade: .2 }],
    [8.45, 'Sit_Chair_Idle', { fade: .3 }], [12.95, 'Sit_Chair_StandUp', { once: true, fade: .2 }], [13.75, 'Idle', { fade: .2 }],
    [13.8, 'Walking_A'], [14.25, 'Idle', { fade: .25 }], [16.25, 'Cheer', { once: true, fade: .2 }], [17.9, 'Idle', { fade: .3 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  const shoulder = (m, side) => stage.worldToLocal(m.node(`upperarm.${side}`).getWorldPosition(new THREE.Vector3()));
  /** one arm straight from its shoulder towards a point on the stage, k of the way */
  function reach(m, side, at, k) {
    const sh = shoulder(m, side), th = m.root.rotation.y;
    const dx = at.x - sh.x, dz = at.z - sh.z, d = [dx * Math.cos(th) - dz * Math.sin(th), at.y - sh.y, dx * Math.sin(th) + dz * Math.cos(th)];
    m.aim(`upperarm.${side}`, d, k); m.aim(`lowerarm.${side}`, d, k);
  }

  /* where each of them is: [from g, x, z, facing, ease into it (smooth by default)] */
  const BOY_WAY = [
    [0, -.62, .03, R], [1.1, -.62, .03, R], [2.95, -.262, .03, R], [3.15, -.262, .03, 0], [4.3, -.262, .03, 0], [4.5, -.262, .03, R],
    [5.15, -.085, .02, R], [5.35, -.085, .02, .15], [6.95, -.085, .02, .15], [7.6, ...SEAT.boy, 0], [13.65, ...SEAT.boy, 0],
    [14.2, -.066, 0, .95], [15.2, -.066, 0, .95], [15.45, -.058, 0, .95], [16, -.058, 0, .95], [16.25, -.075, .01, .12]
  ];
  const GIRL_WAY = [
    [0, -.6, .13, R], [.1, -.6, .13, R], [2.9, .075, .035, R], [3.25, .075, .035, -.55], [4.95, .075, .035, -.55],
    [5.2, .075, .035, -.15], [7, .075, .035, -.15], [7.65, ...SEAT.girl, 0], [13.75, ...SEAT.girl, 0],
    [14.25, .066, 0, -.95], [15.2, .066, 0, -.95], [15.45, .032, 0, -.95], [16, .032, 0, -.95], [16.25, .075, .01, -.12]
  ];
  const wayAt = (way, g) => [1, 2, 3].map(i => tween(g, way.map(k => [k[0], k[i], k[4] || 'smooth'])));
  /** a walk's speed that keeps its feet: how fast its way moves just now, over the stride (the eased ways speed up and slow down) */
  const pace = (way, g, stride) => { const [x1, z1] = wayAt(way, g + .03), [x0, z0] = wayAt(way, g - .03); return Math.max(.4, Math.hypot(x1 - x0, z1 - z0) / .06 / stride); };

  /* ── the room's paintings: wallpaper, the sky in the window, the box's side ── */
  const canvas = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); return cv; };
  const texture = cv => { const t = kit.keep(new THREE.CanvasTexture(cv)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const WIN = { x: -.265, y: .265, w: .15, h: .17 };                // the window on the wall, in card widths
  function wallpaper(c, W, H) {                                      // blush paper with hearts and sprigs over a sage dado
    const px = W / .9, dado = H * .3;
    c.fillStyle = '#f9cfc0'; c.fillRect(0, 0, W, H);
    const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(7);
    for (let row = 0, y = 16; y < H - dado; row++, y += 34) {                // each row shifted, each motif a little turned
      for (let x = (row % 2) * 30 + 10; x < W; x += 60) {
        c.save(); c.translate(x + r() * 6, y + r() * 4); c.rotate((r() - .5) * .6);
        if ((row + Math.round(x / 60)) % 3 === 0) { c.fillStyle = '#ee8299'; kit.heartPath(c, 0, 0, 14); c.fill(); }
        else { c.strokeStyle = '#7fae7a'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, 7); c.quadraticCurveTo(2, 0, 0, -7); c.stroke();
          c.fillStyle = '#7fae7a'; c.beginPath(); c.ellipse(-4, -1, 4.5, 2.2, -.6, 0, 7); c.fill(); c.beginPath(); c.ellipse(4, -4, 4.5, 2.2, .6, 0, 7); c.fill(); }
        c.restore();
      }
    }
    c.fillStyle = '#86b39a'; c.fillRect(0, H - dado, W, dado);                // the dado, its panels and the rail
    c.strokeStyle = 'rgba(40,80,55,.35)'; c.lineWidth = 3;
    for (let x = 14; x < W - 40; x += 92) c.strokeRect(x, H - dado + 22, 78, dado - 40);
    c.fillStyle = '#fbf3ea'; c.fillRect(0, H - dado - 9, W, 12); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, H - dado + 3, W, 3);
    c.fillStyle = '#fbf3ea'; c.fillRect(0, H - 14, W, 14);
    const wx = (WIN.x + .45) * px, wy = H - WIN.y * px, ww = WIN.w * px, wh = WIN.h * px;   // pink curtains round the window
    for (const side of [-1, 1]) {
      const x0 = wx + side * (ww / 2 + 2);
      c.fillStyle = '#e46f8c'; c.beginPath(); c.moveTo(x0, wy - wh / 2 - 16);
      c.lineTo(x0 + side * 34, wy - wh / 2 - 16); c.quadraticCurveTo(x0 + side * 18, wy, x0 + side * 30, wy + wh / 2 + 22);
      c.lineTo(x0 - side * 6, wy + wh / 2 + 22); c.quadraticCurveTo(x0 + side * 2, wy, x0, wy - wh / 2 - 16); c.fill();
      c.strokeStyle = 'rgba(140,40,70,.45)'; c.lineWidth = 2.5;
      for (let k = 1; k < 3; k++) { c.beginPath(); c.moveTo(x0 + side * 11 * k, wy - wh / 2 - 12); c.quadraticCurveTo(x0 + side * (6 + 5 * k), wy, x0 + side * 10 * k, wy + wh / 2 + 18); c.stroke(); }
    }
    c.fillStyle = '#b8506c'; c.fillRect(wx - ww / 2 - 46, wy - wh / 2 - 22, ww + 92, 9);
  }
  function sky(night) {
    return canvas(128, 144, (c, W, H) => {
      const g = c.createLinearGradient(0, 0, 0, H);
      if (night) { g.addColorStop(0, '#141b46'); g.addColorStop(1, '#43407e'); } else { g.addColorStop(0, '#8fd0f2'); g.addColorStop(1, '#e4f5ff'); }
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (night) {
        c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(82, 40, 17, 0, 7); c.fill();
        c.fillStyle = '#141b46'; c.beginPath(); c.arc(91, 34, 15, 0, 7); c.fill();
        c.fillStyle = '#fff6d8'; for (const [x, y, s] of [[20, 24, 2.4], [46, 62, 1.6], [30, 96, 2], [100, 92, 1.4], [62, 18, 1.5], [112, 120, 1.8]]) { c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); }
      } else {
        c.fillStyle = 'rgba(255,255,255,.95)';
        for (const [x, y, s] of [[40, 52, 15], [58, 46, 19], [78, 54, 14], [94, 96, 10], [108, 92, 13]]) { c.beginPath(); c.arc(x, y, s, 0, 7); c.fill(); }
      }
      c.fillStyle = night ? '#232250' : '#9bc98f'; c.beginPath(); c.moveTo(0, H); c.lineTo(0, H - 22);   // a hill and a roof far away
      c.quadraticCurveTo(50, H - 46, 128, H - 26); c.lineTo(128, H); c.fill();
      c.fillStyle = night ? '#2c2a5c' : '#d9826b'; c.beginPath(); c.moveTo(70, H - 30); c.lineTo(86, H - 44); c.lineTo(102, H - 30); c.fill();
      if (night) { c.fillStyle = '#ffd77a'; c.fillRect(82, H - 30, 7, 7); }
    });
  }
  function boxSide(c, W, H) {                                         // the moving box's front: tape, a heart sticker, marker words
    c.fillStyle = '#dcab6c'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(120,80,40,.18)'; for (let y = 6; y < H; y += 9) c.fillRect(0, y, W, 2);
    c.fillStyle = 'rgba(232,214,170,.9)'; c.fillRect(W / 2 - 18, 0, 36, H * .3);
    c.save(); c.translate(W * .72, H * .52); c.rotate(.18);
    c.fillStyle = '#fff'; kit.heartPath(c, 0, 4, 82); c.fill(); c.fillStyle = '#f0567a'; kit.heartPath(c, 0, 4, 66); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-12, -6, 7, 4, -.6, 0, 7); c.fill(); c.restore();
    c.fillStyle = '#3b2a20'; c.font = `700 ${H * .2}px "Dancing Script", cursive`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Nhà mình', W * .33, H * .55);
    c.strokeStyle = '#3b2a20'; c.lineWidth = 3; c.lineCap = 'round';
    for (const x of [W * .12, W * .2]) { c.beginPath(); c.moveTo(x, H * .9); c.lineTo(x, H * .74); c.moveTo(x - 6, H * .8); c.lineTo(x, H * .74); c.lineTo(x + 6, H * .8); c.stroke(); }
  }

  /** a furniture model at its size on the stage, catching shadows */
  function furnish(name, o) {
    const m = kit.model(name).fit(o);
    m.scene?.traverse(x => { if (x.isMesh) x.receiveShadow = true; });
    return m;
  }

  /* the moving box: cardboard, its flaps taped shut, a heart sticker on the front */
  function makeBox() {
    const W = .09, H = .066, D = .07, root = new THREE.Group();
    const card = kit.keep(new THREE.MeshStandardMaterial({ color: 0xdcab6c, roughness: .95 }));
    const dark = kit.keep(new THREE.MeshStandardMaterial({ color: 0x8a6038, roughness: 1, emissive: 0xffb050, emissiveIntensity: 0 }));
    const front = kit.keep(new THREE.MeshStandardMaterial({ map: texture(canvas(256, 188, boxSide)), roughness: .95 }));
    const body = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(W, H, D)), [card, card, dark, card, front, card]);
    body.position.y = H / 2; body.castShadow = body.receiveShadow = true; root.add(body);
    const tape = kit.keep(new THREE.MeshStandardMaterial({ color: 0xeadbb2, roughness: .6 }));
    const flapGeo = kit.keep(new THREE.BoxGeometry(W, .002, D / 2)), tapeGeo = kit.keep(new THREE.BoxGeometry(W * .4, .0024, .009));
    const flap = kit.keep(new THREE.MeshStandardMaterial({ color: 0xdcab6c, roughness: .95, emissive: 0xffb050, emissiveIntensity: 0 }));
    const fl = [1, -1].map(side => {                                 // the two long flaps, hinged at the front and back edges
      const hinge = new THREE.Group(); hinge.position.set(0, H + .001, side * D / 2);
      const f = new THREE.Mesh(flapGeo, flap); f.position.z = -side * D / 4; f.castShadow = true; hinge.add(f);
      const t = new THREE.Mesh(tapeGeo, tape); t.position.set(0, .0003, -side * (D / 2 - .0045)); hinge.add(t);
      root.add(hinge); return hinge;
    });
    const shine = kit.glow({ color: 0xffd28a, size: .2, opacity: 0 }); shine.position.y = H + .01; root.add(shine);   // light from inside
    return { root, flaps: fl, inside: dark, flap, shine };
  }

  /* fairy lights along the top of the wall: they come on in the last chapter */
  function makeBulbs(parent) {
    const pts = [[-.43, .405], [-.29, .37], [-.15, .405], [0, .368], [.15, .405], [.29, .37], [.43, .405]].map(([x, y]) => new THREE.Vector3(x, y, .012));
    const curve = new THREE.CatmullRomCurve3(pts);
    const wire = new THREE.Mesh(kit.keep(new THREE.TubeGeometry(curve, 80, .0016, 5)), kit.keep(new THREE.MeshStandardMaterial({ color: 0x3d5a3a, roughness: .8 })));
    parent.add(wire);
    const cols = ['#ffd27a', '#ff9fb6', '#fff1c9', '#9fe3c9', '#ffd27a', '#ffb3c7', '#fff1c9', '#ffc46b', '#a8d8ff', '#ffd27a', '#ff9fb6', '#fff1c9', '#9fe3c9'];
    const geo = kit.keep(new THREE.SphereGeometry(.0075, 10, 8));
    return cols.map((col, i) => {
      const p = curve.getPointAt((i + .5) / cols.length);
      const mat = kit.keep(new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0, roughness: .35 }));
      const b = new THREE.Mesh(geo, mat); b.position.copy(p).add({ x: 0, y: -.009, z: 0 });
      const glow = kit.glow({ color: col, size: .07, opacity: 0 }); b.add(glow);
      parent.add(b); return { mat, glow };
    });
  }

  return {
    seconds: [6.7, 6, 6.3],

    build() {
      /* the two of them */
      boy = kit.model('boy').fit({ height: H }); girl = kit.model('girl').fit({ height: HER });
      stage.add(boy.root, girl.root);

      /* the wall: one painted panel that folds up out of the card like a pop-up page, a window with curtains */
      wall = new THREE.Group(); wall.position.z = WALL_Z; stage.add(wall);
      const paper = texture(canvas(1024, 500, wallpaper));
      const kraft = kit.keep(new THREE.MeshStandardMaterial({ color: 0xd9c3a0, roughness: 1 }));
      const trim = kit.keep(new THREE.MeshStandardMaterial({ color: 0xfbf3ea, roughness: .7 }));
      const panel = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(.9, .44, .016)),
        [trim, trim, trim, trim, kit.keep(new THREE.MeshStandardMaterial({ map: paper, roughness: .9 })), kraft]);
      panel.position.set(0, .22, -.008); panel.castShadow = panel.receiveShadow = true; wall.add(panel);
      const cap = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(.92, .014, .03)), trim); cap.position.set(0, .447, -.006); cap.castShadow = true; wall.add(cap);
      const day = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(WIN.w, WIN.h)), kit.keep(new THREE.MeshBasicMaterial({ map: texture(sky(false)) })));
      day.position.set(WIN.x, WIN.y, .001); wall.add(day);
      windowNight = new THREE.Mesh(day.geometry, kit.keep(new THREE.MeshBasicMaterial({ map: texture(sky(true)), transparent: true, opacity: 0 })));
      windowNight.position.set(WIN.x, WIN.y, .0015); wall.add(windowNight);
      for (const [x, y, w, h] of [[0, WIN.h / 2, WIN.w + .016, .012], [0, -WIN.h / 2, WIN.w + .03, .014], [-WIN.w / 2, 0, .01, WIN.h], [WIN.w / 2, 0, .01, WIN.h], [0, 0, .006, WIN.h], [0, 0, WIN.w, .006]]) {
        const bar = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(w, h, .012)), trim);
        bar.position.set(WIN.x + x, WIN.y + y, .006); bar.castShadow = true; wall.add(bar);
      }
      bulbs = makeBulbs(wall);

      /* the furniture, KayKit Furniture Bits */
      rugRoot = new THREE.Group(); rugRoot.position.set(0, 0, -.215); stage.add(rugRoot);   // its back edge: it unrolls towards you
      rug = furnish('rug', { width: .62 }); rug.scene.scale.y *= .3; rug.root.position.z = .207; rugRoot.add(rug.root);
      rugRoll = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(1, 1, .56, 18)), kit.keep(new THREE.MeshStandardMaterial({ color: 0xe1ae4a, roughness: .9 })));
      rugRoll.rotation.z = Math.PI / 2; rugRoll.castShadow = true; stage.add(rugRoll);
      couch = furnish('couch', { height: .159 }); couch.scene.scale.z *= .77; couch.scene.position.z *= .77;   // shallower: its back clear of the wall, they sit at its front
      couch.root.position.set(0, 0, -.212); stage.add(couch.root);
      lamp = furnish('lamp', { height: .3 }); lamp.root.position.set(LAMP_AT[0], 0, LAMP_AT[1]); stage.add(lamp.root);
      plant = furnish('plant', { height: .1 }); plant.root.position.set(-.37, 0, -.215); stage.add(plant.root);
      table = furnish('table', { width: .2 }); table.root.position.set(.31, 0, .145); stage.add(table.root);
      books = furnish('books', { height: .036 }); books.root.position.set(.27, .042, .132); books.root.rotation.y = -.25; stage.add(books.root);
      frame = furnish('frame', { height: .046 }); frame.root.position.set(.345, .042, .15); frame.root.rotation.y = -.35; stage.add(frame.root);

      /* the lamp's warm light: the shade lit from inside, a glow, a pool on the floor and a real light */
      shadeGlow = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.032, .06, .088, 24, 1, true)),
        kit.keep(new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0, depthWrite: false })));
      shadeGlow.position.set(LAMP_AT[0], .257, LAMP_AT[1]); stage.add(shadeGlow);
      lampGlow = kit.glow({ color: 0xffc070, size: .24, opacity: 0 }); lampGlow.position.set(LAMP_AT[0], .25, LAMP_AT[1] + .01); stage.add(lampGlow);
      const pool = canvas(128, 128, (c, W) => { const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
        g.addColorStop(0, 'rgba(255,200,120,.9)'); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W); });
      floorGlow = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(.5, .4)), kit.keep(new THREE.MeshBasicMaterial({ map: texture(pool), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
      floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.set(LAMP_AT[0] - .05, .008, LAMP_AT[1] + .1); stage.add(floorGlow);
      lampLight = new THREE.PointLight(0xffb36b, 0, 1.2, 1.1); lampLight.position.set(LAMP_AT[0], .235, LAMP_AT[1] + .02); stage.add(lampLight);

      /* the moving box */
      box = makeBox(); stage.add(box.root);

      /* the card's words and photo */
      note = kit.sign({ text: words('note1', 'Nhà là nơi có em'), width: .42, aspect: .45, accent: '#f28aa5', glow: .35 });
      banner = kit.sign({ text: words('note2', 'Mình về chung một nhà nhé!'), style: 'banner', width: .6, accent: '#e65a7c', glow: .45 });
      photo = kit.polaroid({ width: .25, caption: words('caption', 'Tổ ấm của hai đứa mình'), glow: .45, halo: true, haloColor: 0xffdcae });
      halo = photo.halo;                                                // flat, just behind the photo: a sprite would cut through it
      pin = kit.picture((c, px) => { c.fillStyle = '#e8436d'; kit.heartPath(c, px / 2, px * .52, px * .8); c.fill();
        c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(px * .36, px * .38, px * .08, px * .05, -.6, 0, 7); c.fill(); }, { size: .028 });
      stage.add(note.root, banner.root, photo.root, pin);
      tunes = [0, 1, 2, 3].map(i => {                                // music notes while they dance
        const s = kit.picture((c, px) => { c.fillStyle = ['#e8436d', '#7a6cf0', '#f39a3d', '#3aa58a'][i]; c.font = `700 ${px * .8}px serif`;
          c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(i % 2 ? '♫' : '♪', px / 2, px / 2); }, { size: .05 });
        stage.add(s); return s;
      });

      /* particles */
      hearts = kit.particles({ max: 160 });
      sparks = kit.particles({ max: 240, additive: true });
      dust = kit.particles({ max: 90 });
      stage.add(hearts.root, sparks.root, dust.root);
    },

    reset() {
      [hearts, sparks, dust].forEach(p => p.clear());
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      const pop = (t0, len = .35) => Math.max(.001, ease.back(seg(g, t0, t0 + len)));
      const burst = (key, at, x, y, z, n = 12, cols = ['#fff3c4', '#ffd1dc', '#ffffff']) => {
        if (g > at && kit.once(key)) sparks.burst(n, i => { const a = i / n * 6.28 + rng(); return { x, y, z, vx: Math.cos(a) * .22, vy: .1 + rng() * .18,
          vz: Math.sin(a) * .12, gravity: -.3, drag: 2.2, color: cols[i % cols.length], size: .016 + rng() * .012, life: .8, shape: i % 2 ? 'sparkle' : 'glow', spin: 3 }; });
      };

      /* light: day, then dusk falls in the second chapter and the lamp takes over */
      const dusk = ease.smooth(seg(g, 7, 8.9));
      kit.lights.hemi.color.copy(DAY.hemi).lerp(EVE.hemi, dusk); kit.lights.hemi.groundColor.copy(DAY.ground).lerp(EVE.ground, dusk);
      kit.lights.hemi.intensity = lerp(1.1, .6, dusk); kit.lights.sun.color.copy(DAY.sun).lerp(EVE.sun, dusk); kit.lights.sun.intensity = lerp(1.5, .55, dusk);
      windowNight.material.opacity = dusk;

      /* chapter 1: the room builds itself */
      const fold = ease.inOut(seg(g, .05, .75)), wob = g > .75 ? Math.exp(-6 * (g - .75)) * Math.sin(14 * (g - .75)) : 0;
      wall.rotation.x = R * (1 - fold) - .12 * wob;                          // lying flat towards you, it folds up and wobbles
      if (g > .78 && kit.once('wall')) sparks.burst(16, i => ({ x: -.42 + i * .056, y: .45, z: WALL_Z + .01, vx: (rng() - .5) * .06, vy: .08 + rng() * .1,
        gravity: -.2, drag: 1.5, color: ['#fff3c4', '#ffd1dc'][i % 2], size: .018, life: .8, shape: i % 2 ? 'sparkle' : 'glow', spin: 3 }));
      const unroll = ease.out(seg(g, .6, 1.25));
      rugRoot.scale.z = Math.max(.001, unroll); rugRoot.visible = g > .6;
      const rr = lerp(.022, .004, unroll);
      rugRoll.scale.set(rr, 1, rr); rugRoll.position.set(0, rr, -.215 + .414 * unroll); rugRoll.rotation.x = -unroll * 9;
      rugRoll.visible = g > .55 && unroll < .99;
      const fall = ease.in(seg(g, .9, 1.25)), landed = Math.max(0, g - 1.25), sq = g > 1.25 ? Math.exp(-7 * landed) * Math.cos(15 * landed) : 0;
      const plop = g > 8.05 ? .3 * Math.exp(-8 * (g - 8.05)) * Math.cos(18 * (g - 8.05)) : 0;   // a softer one when they sit
      couch.root.position.y = .5 * (1 - fall); couch.root.visible = g > .9;
      couch.root.scale.set(1 + .1 * (sq + plop), g < 1.25 ? 1 + .1 * fall : 1 - .2 * (sq + plop), 1 + .1 * (sq + plop));
      if (g > 1.25 && kit.once('thump')) dust.burst(22, i => { const a = i / 22 * 6.28; return { x: Math.cos(a) * .2, y: .01, z: -.212 + Math.sin(a) * .09,
        vx: Math.cos(a) * .14, vy: .03 + rng() * .05, vz: Math.sin(a) * .08, drag: 2.5, color: '#efe3d0', size: .03 + rng() * .025, grow: 1.2, life: .9, shape: 'glow' }; });
      lamp.root.scale.setScalar(pop(1.5)); burst('lamp', 1.55, LAMP_AT[0], .25, LAMP_AT[1]);
      plant.root.scale.setScalar(pop(1.75)); burst('plant', 1.8, -.37, .1, -.215);
      table.root.scale.setScalar(pop(2)); burst('table', 2.05, .31, .06, .145);
      books.root.scale.setScalar(pop(2.25, .3)); frame.root.scale.setScalar(pop(2.4, .3)); burst('books', 2.45, .31, .1, .14, 8);

      /* the sweethearts: where they are and which way they look */
      const [bx, bz, br] = wayAt(BOY_WAY, g), [gx, gz, gr] = wayAt(GIRL_WAY, g);
      const twirl = ease.inOut(seg(g, 15.25, 15.95));
      const sway = seg(g, 14.25, 14.5) * (1 - seg(g, 15.05, 15.25));          // the hand-held sway before the twirl
      const beat = Math.sin((g - 14.25) * Math.PI * 4);
      boy.root.position.set(bx + .006 * beat * sway, kit.hop(g - 14.25, .5, .01) * sway, bz);
      girl.root.position.set(gx + .006 * beat * sway, kit.hop(g - 14.25, .5, .01) * sway, gz);
      const rock = .06 * Math.sin(T * 2.2) * ease.smooth(seg(g, 18.2, 18.8));   // at the last stop they sway together
      boy.root.rotation.y = br + .12 * beat * sway + rock; girl.root.rotation.y = gr - .12 * beat * sway + twirl * Math.PI * 2 + rock;
      boy.root.visible = g > 1.09; girl.root.visible = g > .09;
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g), walk = /^Walking/;
      boy.play(bc[1], walk.test(bc[1]) ? { ...bc[2], speed: pace(BOY_WAY, g, STRIDE.boy) } : bc[2]);
      girl.play(gc[1], walk.test(gc[1]) ? { ...gc[2], speed: pace(GIRL_WAY, g, STRIDE.girl) } : gc[2]);

      /* he carries the box by its sides, then lowers it to the floor with PickUp's bend */
      const carry = g < 4.35 ? 1 : 1 - ease.smooth(seg(g, 4.35, 4.6));      // the hands stay on it until he straightens up
      if (carry > 0) {
        const down = ease.smooth(seg(g, 3.2, 3.9));                            // the arms go from carrying the box to lowering it
        for (const [s, side] of [[-1, 'r'], [1, 'l']]) {
          boy.aim(`upperarm.${side}`, [s * CARRY[0], lerp(-.62, -.45, down), lerp(.66, .9, down)], carry);
          boy.aim(`lowerarm.${side}`, [s * CARRY[1], lerp(-.05, -.85, down), lerp(1, .45, down)], carry);
        }
      }
      const hr = boy.node('handslot.r'), hl = boy.node('handslot.l');
      if (g < 4.05 && hr && hl) {
        const a = hr.getWorldPosition(new THREE.Vector3()), b = hl.getWorldPosition(new THREE.Vector3());
        const mid = stage.worldToLocal(a.add(b).multiplyScalar(.5));
        const set = ease.inOut(seg(g, 3.4, 4));                               // the last bit: onto its spot on the floor
        box.root.position.set(lerp(mid.x, BOX_AT[0], set), Math.max(0, lerp(mid.y - .033, 0, set)), lerp(mid.z, BOX_AT[1], set));
        box.root.rotation.y = lerp(br, 0, set);
      } else { box.root.position.set(BOX_AT[0], 0, BOX_AT[1]); box.root.rotation.y = 0; }
      box.root.visible = g > 1.09;

      const tip = ease.smooth(seg(g, 6.35, 6.7)) * (1 - ease.smooth(seg(g, 6.8, 7)));     // at the stop: heads tipped together
      if (tip) { boy.bend('head', 0, 0, .12, tip); girl.bend('head', 0, 0, -.16, tip); }
      /* she looks round the new room while he sets the box down */
      const look = seg(g, 3.3, 3.6) * (1 - seg(g, 4.7, 5));
      if (look) girl.bend('head', -.12, .45 * Math.sin((g - 3.3) * 2.6), 0, look);

      /* chapter 1's stop: a cheer, hearts, the first note */
      if (g > 5.6 && kit.once('cheer1')) hearts.burst(18, () => ({ x: (rng() - .5) * .08, y: .32, z: .03, vx: (rng() - .5) * .25, vy: .18 + rng() * .14,
        vz: (rng() - .5) * .08, gravity: -.12, drag: .6, color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .028 + rng() * .02, life: 2.2, shape: 'heart', spin: (rng() - .5) * 3 }));
      const n = ease.back(seg(g, 5.7, 6.35)) * (1 - ease.in(seg(g, 6.75, 7.2)));
      note.root.scale.setScalar(Math.max(.001, n));
      note.root.position.set(-.02, .54 + .1 * seg(g, 6.75, 7.2) + .008 * Math.sin(T * 1.6), .03);
      note.root.rotation.set(-.12, 0, .035 * Math.sin(T * .9));

      /* chapter 2: sitting close; she points at the lamp, a trail of sparkles flies over and it comes on */
      const lean = ease.smooth(seg(g, 9.6, 10.2)) * (1 - ease.smooth(seg(g, 12.75, 13)));
      if (lean) { girl.bend('head', 0, 0, -.3, lean); girl.bend('chest', 0, 0, -.08, lean); boy.bend('head', 0, 0, .16, lean); }
      const gaze = ease.smooth(seg(g, 10.9, 11.3)) * (1 - ease.smooth(seg(g, 11.9, 12.3)));    // up at the photo as it settles
      if (gaze) { boy.bend('head', -.2, 0, 0, gaze); girl.bend('head', -.2, 0, 0, gaze); }
      const point = ease.smooth(seg(g, 8.7, 8.95)) * (1 - ease.smooth(seg(g, 9.4, 9.7))), flick = Math.sin(Math.PI * seg(g, 8.95, 9.1));
      if (point) {
        girl.bend('head', 0, -.35, .1, point);
        girl.aim('upperarm.l', [.75, .55, -.2], point); girl.aim('lowerarm.l', [.7, .7 + .4 * flick, -.2], point);
      }
      const finger = girl.node('handslot.l');
      if (g > 8.95 && g < 9.25 && dt && finger) {
        const from = stage.worldToLocal(finger.getWorldPosition(new THREE.Vector3())), k = seg(g, 8.95, 9.2);
        sparks.emit({ x: lerp(from.x, LAMP_AT[0], k), y: lerp(from.y, .25, k) + .03 * Math.sin(Math.PI * k), z: lerp(from.z, LAMP_AT[1], k),
          color: rng() < .5 ? '#fff1b8' : '#ffd1dc', size: .02, life: .6, shape: 'sparkle', spin: 4 });
      }
      const on = g < 9.2 ? 0 : (g < 9.45 ? (Math.sin((g - 9.2) * 60) > 0 ? 1 : .25) : 1), flicker = 1 + .04 * Math.sin(T * 11) * Math.sin(T * 6.3);
      lampGlow.material.opacity = .8 * on * flicker; lampLight.intensity = .45 * on * flicker;
      shadeGlow.material.opacity = .55 * on; floorGlow.material.opacity = .45 * on;
      burst('click', 9.2, LAMP_AT[0], .24, LAMP_AT[1] + .02, 10, ['#ffe2a8', '#fff6dc']);

      /* the box opens and the photo rises out of it, then floats up over the two of them */
      const shake = seg(g, 9.4, 9.5) * (1 - seg(g, 9.75, 9.8));              // something in it wants out
      if (g >= 3.7) { box.root.rotation.z = .07 * Math.sin(g * 70) * shake; box.root.position.y = .006 * Math.abs(Math.sin(g * 35)) * shake; }
      const open = ease.elastic(seg(g, 9.8, 10.4));
      box.flaps[0].rotation.x = 2.3 * open; box.flaps[1].rotation.x = -2.3 * open;
      const glowIn = ease.out(seg(g, 9.8, 10.1)) * (1 - .6 * ease.smooth(seg(g, 11, 12)));
      box.inside.emissiveIntensity = .8 * glowIn; box.flap.emissiveIntensity = .3 * glowIn; box.shine.material.opacity = .9 * glowIn * (1 + .1 * Math.sin(T * 5));
      if (g > 9.85 && kit.once('box')) sparks.burst(20, () => ({ x: BOX_AT[0] + (rng() - .5) * .05, y: .07, z: BOX_AT[1], vx: (rng() - .5) * .1, vy: .25 + rng() * .2,
        vz: (rng() - .5) * .06, gravity: -.25, drag: 1.4, color: ['#fff1b8', '#ffd1dc', '#ffffff'][(rng() * 3) | 0], size: .02, life: 1.1, shape: 'sparkle', spin: 4 }));
      const rise = ease.out(seg(g, 10, 10.5)), fly = ease.inOut(seg(g, 10.45, 11.3)), toWall = ease.inOut(seg(g, 13.05, 13.95));
      const p0 = [BOX_AT[0], .02 + .12 * rise, BOX_AT[1]], c1 = [-.24, .58, -.02];
      const along = i => lerp(lerp(p0[i], c1[i], fly), lerp(c1[i], PHOTO_UP[i], fly), fly);     // a curve over to its spot
      const up = [0, 1, 2].map(along), atWall = [0, 1, 2].map(i => lerp(up[i], PHOTO_WALL[i], toWall));
      photo.root.position.set(atWall[0], atWall[1] + .006 * Math.sin(T * 1.3) * (1 - toWall), atWall[2]);
      photo.root.scale.setScalar(Math.max(.001, (g < 10 ? 0 : lerp(.12, 1, ease.inOut(seg(g, 10, 11.1)))) * lerp(1, .52, toWall)));
      photo.root.rotation.set(lerp(-.08, 0, toWall), (1 - rise) * 3 + (1 - toWall) * .08 * Math.sin(T * .8), lerp(.04 * Math.sin(T * .6), -.05, toWall));
      halo.material.opacity = .5 * ease.out(seg(g, 10.6, 11.3)) * (1 - toWall) * (1 + .08 * Math.sin(T * 3));
      pin.scale.setScalar(Math.max(.001, .028 * ease.back(seg(g, 13.9, 14.2))));
      pin.position.set(PHOTO_WALL[0], PHOTO_WALL[1] + .25 * .52 * 620 / 512 - .006, PHOTO_WALL[2] + .008);
      if (g > 10.5 && g < 13.1 && dt && rng() < dt * 6) {
        const a = rng() * 6.28, s = photo.root.scale.x;
        sparks.emit({ x: photo.root.position.x + Math.cos(a) * .16 * s, y: photo.root.position.y + .151 * s + Math.sin(a) * .17 * s, z: photo.root.position.z + .01,
          color: '#fff1b8', size: .018, life: 1, shape: 'sparkle', spin: 3 });
      }

      /* chapter 3: they dance; hands held, a twirl, a cheer */
      const hold2 = seg(g, 14.15, 14.45) * (1 - seg(g, 15.15, 15.3));        // both hands, facing each other: each pair meets halfway, a little low
      if (hold2) for (const [a, b] of [['r', 'l'], ['l', 'r']]) {
        const meet = shoulder(boy, a).add(shoulder(girl, b)).multiplyScalar(.5); meet.y -= .05;
        reach(boy, a, meet, hold2); reach(girl, b, meet, hold2);
      }
      const lift = seg(g, 15.15, 15.35) * (1 - seg(g, 15.9, 16.1));           // his left hand up in her right, over her head: she turns under it
      if (lift) {
        const top = new THREE.Vector3(lerp(bx, gx, .58), HER + .02, lerp(bz, gz, .58));
        reach(girl, 'r', top, lift); reach(boy, 'l', top, lift);
      }
      if (g > 15.25 && g < 16 && dt) for (let i = 0; i < 2; i++) {
        const a = T * 9 + i * Math.PI;
        sparks.emit({ x: gx + Math.cos(a) * .06, y: .05 + rng() * .2, z: gz + Math.sin(a) * .06, color: ['#fff1b8', '#ffd1dc'][i], size: .016, life: .7, shape: 'sparkle', spin: 4 });
      }
      const hold1 = ease.smooth(seg(g, 17.85, 18.3));                         // side by side at the end, his left in her right
      if (hold1) {
        boy.aim('upperarm.l', [.55, -.85, .1], hold1); boy.aim('lowerarm.l', [.75, -.6, .15], hold1);
        girl.aim('upperarm.r', [-.55, -.85, .1], hold1); girl.aim('lowerarm.r', [-.75, -.6, .15], hold1);
      }
      tunes.forEach((s, i) => {
        const k = seg(g, 14.2 + i * .35, 15.7 + i * .35);
        s.material.opacity = Math.sin(Math.PI * k);
        s.position.set((i % 2 ? .1 : -.1) + .03 * Math.sin(k * 7 + i), .3 + .22 * k, -.02);
        s.scale.setScalar(k > 0 && k < 1 ? .05 : .001);
      });
      bulbs.forEach((b, i) => {
        const lit = ease.out(seg(g, 16.3 + i * .05, 16.45 + i * .05)), tw = .8 + .2 * Math.sin(T * 3 + i * 1.7);
        b.mat.emissiveIntensity = 2.2 * lit * tw; b.glow.material.opacity = .85 * lit * tw;
      });
      if (g > 16.7 && kit.once('cheer3')) hearts.burst(30, () => ({ x: (rng() - .5) * .1, y: .3, z: .02, vx: (rng() - .5) * .45, vy: .16 + rng() * .3, vz: (rng() - .5) * .25,
        gravity: -.2, drag: .9, color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .025 + rng() * .025, life: 2.6, shape: 'heart', spin: (rng() - .5) * 4 }));
      const unfurl = ease.elastic(seg(g, 16.9, 17.9));
      banner.root.scale.setScalar(Math.max(.001, unfurl));
      banner.root.position.set(0, .72 + .006 * Math.sin(T * 1.5), .05);
      banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      if (held && g > 18 && dt && rng() < dt * 1.4) hearts.emit({ x: (rng() - .5) * .3, y: .3, z: 0, vy: .08, sway: .03, color: '#ff8fab', size: .02, life: 2.4, shape: 'heart' });

      [hearts, sparks, dust].forEach(x => x.update(dt, T));
    }
  };
};
