/* Sinh nhật Mẹ: the kitchen, built for story.js (template.json "story": ["set.js", "story.js"]).
   A dollhouse kitchen at night on a base of gạch bông tiles. The back wall holds, from the left: the front door (a dark
   porch behind it, a clock over it), the counter with a lamp under a window with a crescent moon, and the fridge with the
   children's note; the garland of big photos unrolls across the whole wall. Two short walls, cut away towards the front,
   close the room. In it: a long dining table with a big photo standing on it (the photos in turn, then the hero), two
   chairs and a vase of carnations in bud, and for the end a cake that glides in from the phone's side, a ribbon with the
   card's line along the table's edge and a banner that two balloons lift from behind the wall.
   window.NM_MOM_KITCHEN(kit) builds it all in `room` (set a little forward of the stage's middle) and returns what the
   story moves; the story puts her and everything that flies in the room too. Units: card widths, +y up, the act faces +z
   (the card's bottom edge). Mẹ is H = .30 tall (1.65 m), so a metre is M = H / 1.65 and the furniture is her size:
   the counter .9 m, the table .75 m, the chairs' seats .45 m, the door 1.9 m. */
window.NM_MOM_KITCHEN = kit => {
  const { THREE, stage, keep } = kit;
  const H = .30, M = H / 1.65;                                      // her height, and a metre
  const room = new THREE.Group(); room.position.z = .045; stage.add(room);   // the kitchen, moved to sit in the card's middle
  const F = .018;                                                   // the floor's top: the base is a dollhouse's
  const B = -.245, WH = .42, WT = .014, WX = .47;                   // the back wall: inner face, height, thickness, half width
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const C = {
    wall: '#f6e6cf', wainscot: '#e7c7a6', trim: '#fff4e4', woodLight: '#e0b07c', woodDark: '#8a5a3a', mint: '#a6dccb', mint2: '#7cc4ad',
    rose: '#f29bb5', magenta: '#d6336c', terracotta: '#c8553d', mustard: '#e9b949', red: '#e5484d', gold: '#e6b34f', leaf: '#5fa45f'
  };

  /* ── materials and shapes ── */
  const mats = new Map();
  const mat = (color, o = {}) => {
    const key = `${color}|${o.r ?? .8}|${o.m ?? 0}|${o.e ?? ''}|${o.ei ?? ''}`;
    if (!mats.has(key)) {
      const m = keep(new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .8, metalness: o.m ?? 0,
        ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}) }));
      if (o.m) { m.envMap = kit.env; m.envMapIntensity = .8; }
      mats.set(key, m);
    }
    return mats.get(key);
  };
  /** a material of its own, for what the story lights or fades */
  const own = (color, o = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .6, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0 }));
  /** a box with soft, rounded edges, like a clay toy */
  const softGeo = new Map();
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
  const ball = (r, m, at, seg = 12) => mesh(keep(new THREE.SphereGeometry(r, seg, Math.max(6, seg * .75 | 0))), m, at);
  const lathe = (pts, m, at, seg = 24) => mesh(keep(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)), m, at);
  const tex = (w, h, draw, o = {}) => {
    const t = kit.canvasTexture(w, h, draw);
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.repeat); }
    return t;
  };
  /** a flat picture on a plane: its own lit material, so it can glow a little in the dark */
  const panel = (w, h, t, at, o = {}) => mesh(keep(new THREE.PlaneGeometry(w, h)), keep(new THREE.MeshStandardMaterial({ map: t, roughness: o.r ?? .85,
    transparent: !!o.alpha, alphaTest: o.alpha ? .5 : 0, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: o.glow ?? .1 })), at, o.shadow ?? false);
  const rounded = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  const heartAt = (c, x, y, s) => { kit.heartPath(c, x, y, s); c.fill(); };

  /* ── the base and its gạch bông floor ── */
  const base = mesh(soft(.96, F, .56, .005), mat(C.woodDark, { r: .7 }), [0, F / 2, 0]);
  room.add(base);
  const floorTex = tex(256, 256, (c, w) => {                           // one cement tile; four of them meeting make the flower
    c.fillStyle = '#f6ead6'; c.fillRect(0, 0, w, w);
    c.fillStyle = '#9cc9bd'; for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w]]) { c.beginPath(); c.arc(x, y, w * .2, 0, 7); c.fill(); }
    c.fillStyle = '#f6ead6'; for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w]]) { c.beginPath(); c.arc(x, y, w * .12, 0, 7); c.fill(); }
    c.fillStyle = '#efc56f'; for (const [x, y] of [[0, 0], [w, 0], [0, w], [w, w]]) { c.beginPath(); c.arc(x, y, w * .055, 0, 7); c.fill(); }
    c.save(); c.translate(w / 2, w / 2);
    for (let i = 0; i < 4; i++) {                                      // four petals and four leaves between them
      c.rotate(Math.PI / 2); c.fillStyle = '#e39a82'; c.beginPath(); c.ellipse(0, -w * .15, w * .065, w * .13, 0, 0, 7); c.fill();
      c.save(); c.rotate(Math.PI / 4); c.fillStyle = '#9cc9bd'; c.beginPath(); c.ellipse(0, -w * .19, w * .03, w * .08, 0, 0, 7); c.fill(); c.restore();
    }
    c.fillStyle = '#efc56f'; c.beginPath(); c.arc(0, 0, w * .05, 0, 7); c.fill(); c.restore();
    c.strokeStyle = 'rgba(150,110,80,.3)'; c.lineWidth = 3; c.strokeRect(0, 0, w, w);
  }, { repeat: [13, 7.5] });
  const floor = mesh(keep(new THREE.PlaneGeometry(.94, .54)), keep(new THREE.MeshStandardMaterial({ map: floorTex, roughness: .75,
    emissive: 0xffffff, emissiveMap: floorTex, emissiveIntensity: .1 })), [0, F + .0004, .005], false);
  floor.rotation.x = -Math.PI / 2; room.add(floor);

  /* ── the walls: the back one with a door and a window cut out of its paper, two short ones cut away to the front ── */
  const DOOR = { x0: -.455, x1: -.315, h: 1.9 * M }, WIN = { x0: -.29, x1: .005, y0: .2, y1: .38 };
  const COUNTER = { x0: -.30, x1: .02, h: .88 * M, d: .58 * M };
  const WPX = 1024, WPY = Math.round(WPX * WH / (2 * WX));
  const wx = x => (x + WX) / (2 * WX) * WPX, wy = y => (WH - y) / WH * WPY;   // a wall point (x across, y up from the floor) on its canvas
  const sprig = (c, x, y, s) => {                                      // the wallpaper's little motif: a sprig with two leaves and a bud
    c.strokeStyle = 'rgba(122,160,110,.55)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + s); c.quadraticCurveTo(x - s * .3, y, x, y - s); c.stroke();
    c.fillStyle = 'rgba(122,160,110,.5)'; c.beginPath(); c.ellipse(x - s * .35, y + s * .1, s * .3, s * .14, -.6, 0, 7); c.fill();
    c.beginPath(); c.ellipse(x + s * .3, y - s * .25, s * .28, s * .13, .6, 0, 7); c.fill();
    c.fillStyle = 'rgba(232,120,150,.6)'; c.beginPath(); c.arc(x, y - s, s * .22, 0, 7); c.fill();
  };
  function wallpaper(c, w, h, o = {}) {
    c.fillStyle = C.wall; c.fillRect(0, 0, w, h);
    for (let y = 18, j = 0; y < h; y += 40, j++) for (let x = (j % 2) * 26 + 14; x < w; x += 52) sprig(c, x, y, 7);
    if (o.wainscot !== false) {                                        // a warm wainscot under a rail
      const top = h - o.wainscot * h / WH;
      c.fillStyle = C.wainscot; c.fillRect(0, top, w, h - top);
      c.strokeStyle = 'rgba(140,90,60,.28)'; c.lineWidth = 3;
      for (let x = 10; x < w - 30; x += 64) c.strokeRect(x + 6, top + 12, 48, h - top - 24);
      c.fillStyle = C.trim; c.fillRect(0, top - 6, w, 9);
    }
  }
  const backTex = tex(WPX, WPY, (c, w, h) => {
    wallpaper(c, w, h, { wainscot: .11 });
    c.fillStyle = '#fbfbf7'; c.fillRect(wx(COUNTER.x0), wy(.215), wx(COUNTER.x1) - wx(COUNTER.x0), wy(COUNTER.h) - wy(.215));   // the backsplash
    c.strokeStyle = '#b9dccf'; c.lineWidth = 2;
    for (let y = wy(.215); y < wy(COUNTER.h); y += 11) { c.beginPath(); c.moveTo(wx(COUNTER.x0), y); c.lineTo(wx(COUNTER.x1), y); c.stroke(); }
    for (let x = wx(COUNTER.x0), i = 0; x < wx(COUNTER.x1); x += 22, i++) for (let y = wy(.215), j = 0; y < wy(COUNTER.h) - 2; y += 11, j++) {
      const xx = x + (j % 2) * 11; c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, Math.min(y + 11, wy(COUNTER.h))); c.stroke();
    }
    c.clearRect(wx(DOOR.x0), wy(DOOR.h), wx(DOOR.x1) - wx(DOOR.x0), wy(0) - wy(DOOR.h));   // the openings
    c.clearRect(wx(WIN.x0), wy(WIN.y1), wx(WIN.x1) - wx(WIN.x0), wy(WIN.y0) - wy(WIN.y1));
  });
  const outTex = tex(512, Math.round(512 * WH / (2 * WX)), (c, w, h) => {
    c.fillStyle = '#e9d3b8'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(140,90,60,.18)'; c.lineWidth = 2; for (let y = 12; y < h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    const ox = x => (x + WX) / (2 * WX) * w, oy = y => (WH - y) / WH * h;
    c.clearRect(w - ox(DOOR.x1), oy(DOOR.h), ox(DOOR.x1) - ox(DOOR.x0), oy(0) - oy(DOOR.h));   // seen from behind: mirrored
    c.clearRect(w - ox(WIN.x1), oy(WIN.y1), ox(WIN.x1) - ox(WIN.x0), oy(WIN.y0) - oy(WIN.y1));
  });
  const wallMat = keep(new THREE.MeshStandardMaterial({ map: backTex, roughness: .92, alphaTest: .5, emissive: 0xffffff, emissiveMap: backTex, emissiveIntensity: .14 }));
  const backIn = mesh(keep(new THREE.PlaneGeometry(2 * WX, WH)), wallMat, [0, F + WH / 2, B]);
  const backOut = mesh(keep(new THREE.PlaneGeometry(2 * WX, WH)), keep(new THREE.MeshStandardMaterial({ map: outTex, roughness: .95, alphaTest: .5 })), [0, F + WH / 2, B - WT]);
  backOut.rotation.y = Math.PI; room.add(backIn, backOut);
  const trim = mat(C.trim, { r: .6 });
  room.add(box(2 * WX + .004, .01, WT + .006, trim, [0, F + WH + .005, B - WT / 2]));   // the wall's top
  for (const s of [-1, 1]) room.add(box(.006, WH, WT, trim, [s * (WX + .003), F + WH / 2, B - WT / 2]));
  room.add(box(2 * WX, .016, .006, mat(C.woodLight, { r: .6 }), [0, F + .008, B + .003]));   // the skirting board

  const sideTex = tex(256, 256, (c, w, h) => wallpaper(c, w, h, { wainscot: false }), { repeat: [5, 5] });
  const SIDE = .2;
  for (const s of [-1, 1]) {                                           // a short wall each side, its top sloping down to the front
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(SIDE, 0); sh.lineTo(SIDE, .17); sh.quadraticCurveTo(SIDE * .55, .2, 0, WH); sh.lineTo(0, 0);
    const g = keep(new THREE.ExtrudeGeometry(sh, { depth: WT, bevelEnabled: false, curveSegments: 10 }));
    const m = keep(new THREE.MeshStandardMaterial({ map: sideTex, roughness: .92, emissive: 0xffffff, emissiveMap: sideTex, emissiveIntensity: .14 }));
    const w = mesh(g, [m, trim], [s < 0 ? -WX + WT : WX, F, B - WT]);   // the shape's x runs to the front, its extrusion to -x
    w.rotation.y = -Math.PI / 2; room.add(w);
    const sk = box(.006, .016, SIDE, mat(C.woodLight, { r: .6 }), [s * (WX - WT - .003), F + .008, B - WT + SIDE / 2]); room.add(sk);
  }

  /* ── the front door, and the dark porch behind it ── */
  const porch = new THREE.Group(); room.add(porch);
  const nightTex = tex(256, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#141b3d'); g.addColorStop(.7, '#2a2a5a'); g.addColorStop(1, '#3b3166');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff4cf'; for (let i = 0; i < 30; i++) c.fillRect((i * 97) % w, (i * 61) % (h * .6), 2 + (i % 3), 2 + (i % 3));
    c.fillStyle = '#1b1636'; c.fillRect(0, h * .78, w, h * .22);                   // a hedge in the dark
    for (let x = 0; x < w; x += 22) { c.beginPath(); c.arc(x + 11, h * .78, 16, Math.PI, 0); c.fill(); }
  });
  const PZ0 = B - WT, PZ1 = -.335, PX0 = DOOR.x0 - .012, PX1 = DOOR.x1 + .012;
  porch.add(mesh(keep(new THREE.PlaneGeometry(PX1 - PX0, .38)), keep(new THREE.MeshBasicMaterial({ map: nightTex, toneMapped: false })),
    [(PX0 + PX1) / 2, F + .19, PZ1], false));
  const porchDark = mat('#1d1a33', { r: 1 });
  porch.add(box(PX1 - PX0, .006, PZ0 - PZ1, mat('#4b4258', { r: .9 }), [(PX0 + PX1) / 2, F - .003, (PZ0 + PZ1) / 2]));
  for (const x of [PX0, PX1]) porch.add(box(.004, .38, PZ0 - PZ1, porchDark, [x, F + .19, (PZ0 + PZ1) / 2]));
  porch.add(box(PX1 - PX0, .004, PZ0 - PZ1, porchDark, [(PX0 + PX1) / 2, F + .38, (PZ0 + PZ1) / 2]));
  const porchLamp = kit.glow({ color: 0xffcf8a, size: .07, opacity: .55 }); porchLamp.position.set(DOOR.x1 - .01, F + .3, PZ1 + .01); porch.add(porchLamp);
  const casing = mat(C.trim, { r: .55 });
  const doorMid = (DOOR.x0 + DOOR.x1) / 2, doorW = DOOR.x1 - DOOR.x0;
  room.add(box(.014, DOOR.h + .014, WT + .008, casing, [DOOR.x0 - .007, F + (DOOR.h + .014) / 2, B - WT / 2]),
    box(.014, DOOR.h + .014, WT + .008, casing, [DOOR.x1 + .007, F + (DOOR.h + .014) / 2, B - WT / 2]),
    box(doorW + .028, .016, WT + .008, casing, [doorMid, F + DOOR.h + .008, B - WT / 2]));
  const doorTex = tex(160, 400, (c, w, h) => {
    c.fillStyle = '#8fcfc0'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#5ea996'; c.lineWidth = 7;
    rounded(c, 22, 150, w - 44, 100, 10); c.stroke(); rounded(c, 22, 268, w - 44, 112, 10); c.stroke();
    c.fillStyle = '#2a3566'; rounded(c, 30, 26, w - 60, 100, 40); c.fill();               // a little window: the night outside
    c.fillStyle = '#fff4cf'; for (const [x, y] of [[50, 50], [92, 70], [110, 44], [70, 98]]) c.fillRect(x, y, 3, 3);
    c.strokeStyle = '#f6efe2'; c.lineWidth = 6; rounded(c, 30, 26, w - 60, 100, 40); c.stroke();
    c.beginPath(); c.moveTo(w / 2, 26); c.lineTo(w / 2, 126); c.stroke();
  });
  const doorFace = keep(new THREE.MeshStandardMaterial({ map: doorTex, roughness: .6, emissive: 0xffffff, emissiveMap: doorTex, emissiveIntensity: .12 }));
  const doorSide = mat('#7fbfae', { r: .6 });
  const doorHinge = new THREE.Group(); doorHinge.position.set(DOOR.x0, F, B - WT / 2); room.add(doorHinge);
  const doorSlab = box(doorW - .004, DOOR.h - .004, .01, [doorSide, doorSide, doorSide, doorSide, doorFace, doorFace], [doorW / 2, (DOOR.h - .004) / 2, 0]);
  const knob = ball(.0055, mat(C.gold, { r: .3, m: .7 }), [doorW - .018, .17, .009]);
  const knobBack = ball(.0055, mat(C.gold, { r: .3, m: .7 }), [doorW - .018, .17, -.009]);
  doorHinge.add(doorSlab, knob, knobBack);
  const doormat = mesh(keep(new THREE.PlaneGeometry(.12, .055)), keep(new THREE.MeshStandardMaterial({ roughness: 1, map: tex(240, 110, (c, w, h) => {
    c.fillStyle = '#c97b5c'; rounded(c, 0, 0, w, h, 18); c.fill();
    c.strokeStyle = '#f3d9b8'; c.lineWidth = 5; rounded(c, 10, 10, w - 20, h - 20, 12); c.stroke();
    c.fillStyle = '#f3d9b8'; heartAt(c, w / 2, h / 2 + 2, 34);
  }) })), [doorMid + .005, F + .001, B + .045], false);
  doormat.rotation.x = -Math.PI / 2; room.add(doormat);
  const door = { open: k => { doorHinge.rotation.y = -1.52 * k; } };

  /* ── the window: a night sky with a crescent moon over the rooftops, curtains, a plant on the sill ── */
  const winMid = (WIN.x0 + WIN.x1) / 2, winW = WIN.x1 - WIN.x0, winH = WIN.y1 - WIN.y0;
  const skyTex = tex(600, Math.round(600 * winH / winW), (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#16204a'); g.addColorStop(.55, '#33306a'); g.addColorStop(1, '#5e4783');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { c.fillStyle = i % 4 ? '#fff6d8' : '#cfd8ff'; const s = 1.5 + (i % 3); c.fillRect((i * 137) % w, (i * 71) % (h * .8), s, s); }
    const mx = w * .13, my = h * .7, mr = h * .1;                        // the crescent, low over the roofs, under the garland
    const glow = c.createRadialGradient(mx, my, mr * .5, mx, my, mr * 3); glow.addColorStop(0, 'rgba(255,236,180,.45)'); glow.addColorStop(1, 'rgba(255,236,180,0)');
    c.fillStyle = glow; c.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
    c.fillStyle = '#ffeeb8'; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
    c.fillStyle = '#33306a'; c.beginPath(); c.arc(mx + mr * .45, my - mr * .25, mr * .9, 0, 7); c.fill();
    const roofs = [[0, .86, 70], [62, .8, 58], [114, .9, 50], [158, .78, 72], [226, .84, 54], [274, .76, 64], [334, .88, 56], [384, .82, 70], [448, .9, 46], [488, .79, 66], [548, .86, 60]];
    for (const [x, top, rw] of roofs) {                                  // tube houses with lit windows
      c.fillStyle = '#231d45'; c.fillRect(x, h * top, rw, h);
      c.beginPath(); c.moveTo(x - 3, h * top); c.lineTo(x + rw / 2, h * top - 12); c.lineTo(x + rw + 3, h * top); c.fill();
      for (let y = h * top + 8; y < h - 6; y += 14) for (let xx = x + 8; xx < x + rw - 10; xx += 16)
        if (((xx * 7 + y * 3) | 0) % 5 < 2) { c.fillStyle = ((xx + y) | 0) % 3 ? '#ffd27a' : '#ffb3c6'; c.fillRect(xx, y, 7, 8); }
    }
  });
  const sky = mesh(keep(new THREE.PlaneGeometry(winW, winH)), keep(new THREE.MeshBasicMaterial({ map: skyTex, toneMapped: false })), [winMid, F + (WIN.y0 + WIN.y1) / 2, B - WT - .006], false);
  room.add(sky);
  const moonGlow = kit.glow({ color: 0xffe6a8, size: .07, opacity: .5 }); moonGlow.position.set(WIN.x0 + winW * .13, F + WIN.y0 + winH * (1 - .7), B - WT - .002); room.add(moonGlow);
  const frameM = mat('#fff7ea', { r: .5 });
  room.add(box(winW + .024, .012, WT + .01, frameM, [winMid, F + WIN.y1 + .006, B - WT / 2]),
    box(.012, winH + .012, WT + .01, frameM, [WIN.x0 - .006, F + (WIN.y0 + WIN.y1) / 2, B - WT / 2]),
    box(.012, winH + .012, WT + .01, frameM, [WIN.x1 + .006, F + (WIN.y0 + WIN.y1) / 2, B - WT / 2]),
    box(.006, winH, .006, frameM, [winMid, F + (WIN.y0 + WIN.y1) / 2, B - WT / 2]),
    box(winW, .005, .006, frameM, [winMid, F + WIN.y0 + winH * .46, B - WT / 2]));
  room.add(box(winW + .03, .008, .03, frameM, [winMid, F + WIN.y0 - .004, B + .008]));   // the sill
  const curtain = mat('#f7b8c9', { r: .95 });
  for (const s of [-1, 1]) {                                           // café curtains tied back at the sides
    const cx = s < 0 ? WIN.x0 + .012 : WIN.x1 - .012;
    room.add(mesh(soft(.028, .175, .008, .004), curtain, [cx, F + WIN.y1 - .085, B + .008]));
    room.add(box(.03, .006, .012, mat(C.magenta, { r: .6 }), [cx, F + WIN.y0 + .07, B + .012]));
  }
  const herbs = new THREE.Group(); herbs.position.set(WIN.x1 - .045, F + WIN.y0, B + .012); room.add(herbs);
  herbs.add(cyl(.009, .007, .014, mat(C.terracotta, { r: .7 }), [0, .007, 0], 12));
  for (const [x, y, z, r] of [[0, .02, 0, .009], [.006, .026, .002, .007], [-.006, .025, -.001, .007]]) herbs.add(ball(r, mat(C.leaf, { r: .9 }), [x, y, z], 8));

  /* ── the counter: cupboards, a sink under the window, the kettle, the rice cooker and a lamp ── */
  const cMid = (COUNTER.x0 + COUNTER.x1) / 2, cW = COUNTER.x1 - COUNTER.x0, cFront = B + COUNTER.d;
  room.add(mesh(soft(cW, COUNTER.h - .008, COUNTER.d, .006), mat('#a8cbb7', { r: .7 }), [cMid, F + (COUNTER.h - .008) / 2, B + COUNTER.d / 2]));
  const cupTex = tex(640, 300, (c, w, h) => {
    c.fillStyle = '#b5d6c2'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#7fae95'; c.lineWidth = 6;
    const n = 4, dw = (w - 30) / n;
    for (let i = 0; i < n; i++) { rounded(c, 15 + i * dw + 6, 18, dw - 12, h - 36, 10); c.stroke(); }
    c.fillStyle = C.gold; for (let i = 0; i < n; i++) { const hx = 15 + i * dw + (i % 2 ? 22 : dw - 22); rounded(c, hx - 4, h * .3, 8, 40, 4); c.fill(); }
  });
  room.add(panel(cW - .014, COUNTER.h - .024, cupTex, [cMid, F + (COUNTER.h - .008) / 2, cFront + .0006], { glow: .08 }));
  room.add(box(cW + .01, .008, COUNTER.d + .008, mat('#f4ead8', { r: .35 }), [cMid, F + COUNTER.h - .004, B + COUNTER.d / 2 + .002]));
  const top = F + COUNTER.h;
  const sinkX = winMid;
  room.add(box(.07, .0015, .045, mat('#9aa3ad', { r: .3, m: .6 }), [sinkX, top + .0008, B + .05]));
  const faucet = new THREE.Group(); faucet.position.set(sinkX, top, B + .018); room.add(faucet);
  faucet.add(cyl(.003, .004, .03, mat('#c9ced6', { r: .25, m: .8 }), [0, .015, 0], 10));
  const spout = mesh(keep(new THREE.TorusGeometry(.012, .0025, 6, 16, Math.PI)), mat('#c9ced6', { r: .25, m: .8 }), [0, .03, .012]);
  spout.rotation.y = Math.PI / 2; faucet.add(spout);
  const cooker = new THREE.Group(); cooker.position.set(-.046, top, B + .05); room.add(cooker);   // the rice cooker
  cooker.add(lathe([[0, 0], [.022, 0], [.025, .006], [.025, .022], [.022, .026], [0, .026]], mat('#fffaf2', { r: .35 }), [0, 0, 0]));
  cooker.add(lathe([[0, .026], [.022, .026], [.02, .032], [.012, .036], [0, .037]], mat(C.rose, { r: .4 }), [0, 0, 0]));
  cooker.add(box(.012, .004, .004, mat('#7c6f78', { r: .5 }), [0, .038, 0]), box(.008, .006, .002, mat('#ff6f6f', { r: .4, e: '#ff4040', ei: .6 }), [0, .012, .025]));
  const kettle = new THREE.Group(); kettle.position.set(-.086, top, B + .035); room.add(kettle);
  kettle.add(lathe([[0, 0], [.012, 0], [.014, .012], [.01, .022], [.004, .025], [0, .026]], mat(C.red, { r: .35 }), [0, 0, 0]));
  const kh = mesh(keep(new THREE.TorusGeometry(.008, .0015, 6, 12, Math.PI)), mat('#3b2a4a', { r: .5 }), [0, .025, 0]); kettle.add(kh);
  const kspout = cyl(.002, .003, .014, mat(C.red, { r: .35 }), [.014, .014, 0], 8); kspout.rotation.z = -.9; kettle.add(kspout);
  const board = box(.04, .004, .028, mat(C.woodLight, { r: .6 }), [COUNTER.x0 + .085, top + .002, B + .065]); board.rotation.y = .2; room.add(board);
  const lamp = new THREE.Group(); lamp.position.set(-.002, top, B + .04); room.add(lamp);   // it comes on with the kitchen
  lamp.add(cyl(.011, .013, .006, mat(C.gold, { r: .35, m: .6 }), [0, .003, 0], 16), cyl(.0022, .0022, .045, mat(C.gold, { r: .35, m: .6 }), [0, .027, 0], 8));
  const lampShade = own('#fff3dc', { r: .7, e: 0xffc878, ei: 0 });
  lamp.add(mesh(keep(new THREE.CylinderGeometry(.012, .021, .026, 18, 1, true)), lampShade, [0, .058, 0]));
  const lampGlow = kit.glow({ color: 0xffc06a, size: .07, opacity: 0 }); lampGlow.position.set(0, .052, .006); lamp.add(lampGlow);
  const lampLight = new THREE.PointLight(0xffc27a, 0, .6, 1.6); lampLight.position.set(0, .05, .03); lamp.add(lampLight);
  const lamps = [{ set(k) { lampShade.emissiveIntensity = 1.4 * k; lampGlow.material.opacity = .5 * k; lampLight.intensity = .45 * k; } }];
  [[.0, '#ff8a3d'], [.012, '#ffb347'], [.006, '#9ccc65']].forEach(([dx, cl], i) => room.add(ball(.0055, mat(cl, { r: .5 }), [COUNTER.x0 + .078 + dx, top + .009, B + .062 + (i - 1) * .006], 10)));

  /* ── the fridge, a magnet, and the children's note (the card's words, a photo clipped to it) ── */
  const FR = { x: .355, w: .13, h: 1.76 * M, d: .12 };
  const fridge = new THREE.Group(); fridge.position.set(FR.x, F, B + FR.d / 2); room.add(fridge);
  const fridgeM = mat(C.mint, { r: .35 });
  fridge.add(mesh(soft(FR.w, FR.h, FR.d, .014), fridgeM, [0, FR.h / 2, 0]));
  fridge.add(box(FR.w - .006, .003, .002, mat(C.mint2, { r: .4 }), [0, .215, FR.d / 2 + .0005]));
  const chrome = mat('#e9eef2', { r: .2, m: .8 });
  fridge.add(mesh(soft(.007, .05, .008, .003), chrome, [-FR.w / 2 + .014, .265, FR.d / 2 + .005]), mesh(soft(.007, .07, .008, .003), chrome, [-FR.w / 2 + .014, .165, FR.d / 2 + .005]));
  const FRONT = FR.d / 2 + .002;                                          // where a magnet's paper lies on the door
  const redMagnet = cyl(.006, .006, .004, mat(C.red, { r: .4 }), [.045, .305, FRONT + .002], 12); redMagnet.rotation.x = Math.PI / 2; fridge.add(redMagnet);
  const noteSign = kit.sign({ text: kit.words('note', 'Mẹ nghỉ ngơi đi, để tụi con lo!'), style: 'note', width: .26, accent: '#ff7aa2', ink: '#7b2343', glow: .45 });
  const notePhoto = kit.photo({ frame: 'white', width: .11, aspect: 1.1, slot: 8, of: 9, glow: .4 });
  const note = new THREE.Group(); note.add(noteSign.root, notePhoto.root);
  notePhoto.root.position.set(.165, -.01, .004); notePhoto.root.rotation.z = -.12;
  const clip = box(.007, .026, .004, mat('#c9ced6', { r: .25, m: .8 }), [.15, .05, .008]); clip.rotation.z = -.12; note.add(clip);
  room.add(note);
  const NOTE_HOME = { x: FR.x - .014, y: F + .27, z: B + FR.d + .004, s: .36, rz: -.04 };
  const prints = [                                                        // on the door's right half: the photo on the table never hides them
    kit.photo({ frame: 'white', width: .093, aspect: 1.1, slot: 2, of: 9, glow: .35, border: .07 }),
    kit.photo({ frame: 'white', width: .093, aspect: .88, slot: 6, of: 9, glow: .35, border: .07 })
  ];
  const printHome = [[.008, .162, .05], [.016, .068, -.06]];
  prints.forEach((p, i) => {
    const [x, y, rz] = printHome[i];
    const g = new THREE.Group(); g.position.set(x, y, FRONT + .003 + i * .0015); g.rotation.z = rz; fridge.add(g); g.add(p.root);
    const m = cyl(.008, .008, .006, mat(['#ff6f91', '#ffd27a'][i], { r: .4 }), [0, p.height / 2 - .006, .005], 14); m.rotation.x = Math.PI / 2; g.add(m);
    p.hang = g;
  });

  /* the clock over the door: a quarter to midnight */
  const clock = new THREE.Group(); clock.position.set(doorMid, F + .39, B + .004); room.add(clock);
  const clockFace = tex(256, 256, (c, w) => {
    c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, 7); c.fill();
    c.fillStyle = '#5b4a5e'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.arc(w / 2 + Math.sin(a) * w * .38, w / 2 - Math.cos(a) * w * .38, i % 3 ? 5 : 9, 0, 7); c.fill(); }
    c.strokeStyle = '#3b2a4a'; c.lineCap = 'round';
    c.lineWidth = 12; c.beginPath(); c.moveTo(w / 2, w / 2); c.lineTo(w / 2 + Math.sin(-.13) * w * .22, w / 2 - Math.cos(-.13) * w * .22); c.stroke();
    c.lineWidth = 8; c.beginPath(); c.moveTo(w / 2, w / 2); c.lineTo(w / 2 - w * .32, w / 2); c.stroke();
    c.fillStyle = C.red; c.beginPath(); c.arc(w / 2, w / 2, 10, 0, 7); c.fill();
  });
  const clockBody = cyl(.024, .024, .008, [mat(C.woodLight, { r: .5 }), keep(new THREE.MeshStandardMaterial({ map: clockFace, roughness: .6, emissive: 0xffffff, emissiveMap: clockFace, emissiveIntensity: .15 })), mat(C.woodLight, { r: .5 })], [0, 0, .004], 32);
  clockBody.rotation.x = Math.PI / 2; clockBody.rotation.y = Math.PI / 2; clock.add(clockBody);

  /* ── the garland of photos across the back wall, from the door to the fridge: a string that unrolls, pegs, big photos
        and little bulbs ── */
  const GA = { x0: -.3, x1: .275, y: F + .405, sag: .045, z: B + .016 };
  const gAt = t => new THREE.Vector3(GA.x0 + (GA.x1 - GA.x0) * t, GA.y - GA.sag * 4 * t * (1 - t), GA.z + .006 * Math.sin(Math.PI * t));
  const curve = new THREE.CatmullRomCurve3(Array.from({ length: 17 }, (_, i) => gAt(i / 16)));
  const SEGS = 80;
  const stringGeo = keep(new THREE.TubeGeometry(curve, SEGS, .0016, 5));
  const string = mesh(stringGeo, mat('#7a5a44', { r: .7 }), [0, 0, 0], false); room.add(string);
  for (const t of [0, 1]) room.add(ball(.003, mat(C.gold, { r: .3, m: .7 }), gAt(t).toArray(), 8));
  const garland = [0, 3, 5, 7, 1].map((slot, i) => {                   // neighbours start on different photos
    const t = .1 + i * .2, p = gAt(t);
    const ph = kit.photo({ frame: 'white', width: .105, aspect: 1.1, slot, of: 9, glow: .35, border: .06 });
    const hang = new THREE.Group(); hang.position.copy(p); room.add(hang);
    ph.root.position.y = -ph.height / 2 - .003; hang.add(ph.root);
    hang.add(box(.007, .02, .006, mat(C.woodLight, { r: .6 }), [0, -.003, .004]));
    return { t, hang, photo: ph, tilt: (i % 2 ? -1 : 1) * .05 };
  });
  const bulbs = [0, .2, .4, .6, .8, 1].map(t => {
    const p = gAt(t), m = own('#fff1c9', { e: 0xffc15a, ei: 0 });
    const b = ball(.005, m, [p.x, p.y - .006, p.z + .002], 10); b.castShadow = false; room.add(b);
    const g = kit.glow({ color: 0xffcf7a, size: .055, opacity: 0 }); g.position.set(p.x, p.y - .005, p.z + .004); room.add(g);
    return { t, mesh: b, set(k) { b.visible = k > .01; m.emissiveIntensity = 2.2 * k; g.material.opacity = .9 * k; } };
  });
  const garlandSet = {
    /** k: how far the string has unrolled, 0..1 */
    unroll(k) { stringGeo.setDrawRange(0, Math.round(SEGS * Math.max(0, Math.min(1, k))) * 5 * 6); string.visible = k > .002; }
  };

  /* ── the dining table, two chairs, the vase of carnations ── */
  const TB = { x: .15, z: .02, w: .34, d: .12, h: .75 * M };
  const table = new THREE.Group(); table.position.set(TB.x, F, TB.z); room.add(table);
  const tableWood = mat('#d9a06a', { r: .55 });
  table.add(mesh(soft(TB.w, .01, TB.d, .004), tableWood, [0, TB.h - .005, 0]));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) table.add(cyl(.0045, .0035, TB.h - .01, tableWood, [sx * (TB.w / 2 - .014), (TB.h - .01) / 2, sz * (TB.d / 2 - .014)], 10));
  table.add(box(TB.w - .03, .012, .004, tableWood, [0, TB.h - .016, TB.d / 2 - .014]), box(TB.w - .03, .012, .004, tableWood, [0, TB.h - .016, -TB.d / 2 + .014]));
  const runner = mesh(keep(new THREE.PlaneGeometry(TB.w * .96, .05)), keep(new THREE.MeshStandardMaterial({ roughness: .95, map: tex(400, 100, (c, w, h) => {
    c.fillStyle = '#fbe3ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#f3a7bd';
    for (let x = 0; x < w; x += 25) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 12.5, 10); c.lineTo(x + 25, 0); c.fill(); c.beginPath(); c.moveTo(x, h); c.lineTo(x + 12.5, h - 10); c.lineTo(x + 25, h); c.fill(); }
    c.fillStyle = 'rgba(214,51,108,.35)'; for (let x = 30; x < w; x += 60) heartAt(c, x, h / 2, 16);
  }) })), [0, TB.h + .0006, 0], false);
  runner.rotation.x = -Math.PI / 2; table.add(runner);
  const TOP = F + TB.h;                                                 // the table's top
  const SEAT = .45 * M;                                                 // a chair's seat
  function chair(color) {
    const g = new THREE.Group(), w = .066, d = .064, wd = mat(C.woodLight, { r: .55 });
    g.add(mesh(soft(w, .008, d, .003), wd, [0, SEAT - .004, 0]));
    g.add(mesh(soft(w - .008, .007, d - .008, .003), mat(color, { r: .9 }), [0, SEAT + .003, .001]));   // the cushion: its top at SEAT + .0065
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(.0028, .0024, SEAT - .008, wd, [sx * (w / 2 - .006), (SEAT - .008) / 2, sz * (d / 2 - .006)], 8));
    for (const sx of [-1, 1]) g.add(cyl(.0028, .0028, .09, wd, [sx * (w / 2 - .006), SEAT + .045, -d / 2 + .005], 8));
    g.add(mesh(soft(w - .004, .03, .006, .003), wd, [0, SEAT + .075, -d / 2 + .005]), mesh(soft(w - .012, .008, .004, .002), wd, [0, SEAT + .04, -d / 2 + .005]));
    return g;
  }
  const chairs = [chair(C.rose), chair('#9fd1e8')];
  chairs[0].position.set(-.046, F, -.079);                               // pulled out at the table's back left, facing the phone
  chairs[1].position.set(.2, F, TB.z - TB.d / 2 - .043);                // tucked in behind the table
  chairs.forEach(c => room.add(c));
  const SEAT_TOP = F + SEAT + .0065;

  const vase = new THREE.Group(); vase.position.set(TB.x - TB.w / 2 + .022, TOP, TB.z - .045); room.add(vase);   // at the table's left end
  const vaseTex = tex(256, 128, (c, w, h) => {                            // Bát Tràng blue on white
    c.fillStyle = '#f7f9fb'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#2f5aa8'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, h * .2); c.lineTo(w, h * .2); c.moveTo(0, h * .8); c.lineTo(w, h * .8); c.stroke();
    c.lineWidth = 3; for (let x = 0; x < w; x += 32) { c.beginPath(); c.arc(x + 16, h / 2, 10, 0, 7); c.stroke(); c.beginPath(); c.moveTo(x + 16, h / 2 - 10); c.lineTo(x + 16, h / 2 + 10); c.stroke(); }
  });
  vase.add(lathe([[0, 0], [.011, 0], [.014, .008], [.015, .02], [.011, .032], [.007, .038], [.009, .043], [0, .043]],
    keep(new THREE.MeshStandardMaterial({ map: vaseTex, roughness: .3 })), [0, 0, 0]));
  const petalMats = new Map();
  const blossom = (r, color) => {                                       // a carnation: two frilled cups and a heart
    if (!petalMats.has(color)) petalMats.set(color, keep(new THREE.MeshStandardMaterial({ color, roughness: .8, side: THREE.DoubleSide })));
    const g = new THREE.Group(), m = petalMats.get(color);
    for (const [rr, h, y] of [[r, r * .9, 0], [r * .7, r * .8, r * .25]]) {
      const geo = new THREE.CylinderGeometry(rr, rr * .35, h, 18, 1, true), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + .18 * Math.sin(a * 9); p.setXYZ(i, p.getX(i) * k, p.getY(i) + .0012 * Math.sin(a * 13), p.getZ(i) * k); }
      geo.computeVertexNormals(); g.add(mesh(keep(geo), m, [0, y, 0], false));
    }
    g.add(ball(r * .45, m, [0, r * .35, 0], 8));
    return g;
  };
  const flowers = [[0, .07, 0, '#e8436d'], [.014, .06, .006, '#f7a1bd'], [-.013, .062, .004, '#ffffff'], [.006, .052, -.012, '#f06292'], [-.008, .05, -.011, '#ffc1d3'], [.0, .048, .014, '#e8436d']]
    .map(([x, y, z, color], i) => {
      const tip = new THREE.Vector3(x, y, z);
      const stemCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, .03, 0), new THREE.Vector3(x * .3, .045, z * .3), tip);
      vase.add(mesh(keep(new THREE.TubeGeometry(stemCurve, 8, .0011, 4)), mat(C.leaf, { r: .8 }), [0, 0, 0], false));
      if (i % 2 === 0) { const lf = ball(.006, mat('#6fb36f', { r: .8 }), [x * .5 + .004, .046, z * .5], 8); lf.scale.set(1.6, .35, .7); lf.rotation.z = i % 4 ? .7 : -.7; vase.add(lf); }
      const head = new THREE.Group(); head.position.copy(tip); vase.add(head);   // it looks the way its stem grows
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x * .7, y - .045, z * .7).normalize());
      const bud = ball(.0045, mat('#7cb36a', { r: .7 }), [0, .002, 0], 8); bud.scale.set(1, 1.5, 1); head.add(bud);
      const bloom = blossom(.0085, color); head.add(bloom);
      return { head, bud, bloom };
    });

  /* a braided oval rug in front of the table, soft colours */
  const rug = mesh(keep(new THREE.CircleGeometry(.1, 40)), keep(new THREE.MeshStandardMaterial({ roughness: 1, map: tex(256, 256, (c, w) => {
    for (let i = 8; i > 0; i--) { c.fillStyle = ['#f3e2c8', '#ead2b4', '#f6e7d4', '#e8cbb8', '#efdcc2', '#dfe7d4', '#f6e7d4', '#ecd7bd'][i - 1]; c.beginPath(); c.arc(w / 2, w / 2, w / 2 * i / 8, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(150,110,80,.18)'; c.lineWidth = 2; for (let r = 7; r < w / 2; r += 5) { c.beginPath(); c.arc(w / 2, w / 2, r, 0, 7); c.stroke(); }
  }) })), [TB.x - .02, F + .0012, TB.z + .14], false);
  rug.rotation.x = -Math.PI / 2; rug.scale.set(1.45, 1, 1); room.add(rug);

  /* ── the cake: two tiers on a stand and candles; it lands at CAKE, near the table's left end ── */
  const CAKE = { x: .045, z: TB.z + .014 };
  const cake = new THREE.Group(); room.add(cake);
  const CK = { r1: .04, h1: .03, r2: .027, h2: .022, stand: .012 };
  cake.add(lathe([[0, 0], [.022, 0], [.022, .002], [.007, .004], [.006, .009], [.042, .01], [.044, CK.stand], [0, CK.stand]], mat('#ffffff', { r: .25 }), [0, 0, 0], 32));
  const sponge1 = mat('#f6b3c6', { r: .75 }), sponge2 = mat('#fff3e6', { r: .7 }), cream = mat('#ffffff', { r: .45 });
  cake.add(cyl(CK.r1, CK.r1, CK.h1, sponge1, [0, CK.stand + CK.h1 / 2, 0], 40));
  cake.add(cyl(CK.r2, CK.r2, CK.h2, sponge2, [0, CK.stand + CK.h1 + CK.h2 / 2, 0], 36));
  const drip = (r, y, m, n) => {                                         // a ring of icing with drips down the side
    cake.add(mesh(keep(new THREE.TorusGeometry(r, .0035, 6, 40)), m, [0, y, 0]).rotateX(Math.PI / 2));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, l = .006 + (i * 7 % 5) * .002; const d = cyl(.0028, .0024, l, m, [Math.cos(a) * r, y - l / 2, Math.sin(a) * r], 6); cake.add(d); }
  };
  drip(CK.r1, CK.stand + CK.h1, mat('#fff7fb', { r: .4 }), 22);
  drip(CK.r2, CK.stand + CK.h1 + CK.h2, mat('#f48fb1', { r: .4 }), 16);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; cake.add(ball(.0042, cream, [Math.cos(a) * (CK.r1 - .004), CK.stand + CK.h1 + .002, Math.sin(a) * (CK.r1 - .004)], 8)); }
  const berry = mat('#e0284f', { r: .4 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3; const b = mesh(keep(new THREE.ConeGeometry(.0042, .008, 8)), berry, [Math.cos(a) * (CK.r1 - .008), CK.stand + CK.h1 + .007, Math.sin(a) * (CK.r1 - .008)]); b.rotation.x = Math.PI; cake.add(b); }
  const CTOP = CK.stand + CK.h1 + CK.h2;
  const candleCols = ['#7cc4ff', '#ffd27a', '#f48fb1', '#9ccc65', '#ce93d8'];
  const candles = candleCols.map((cl, i) => {
    const a = -Math.PI / 2 + (i - 2) * .55, r = .016;                    // in an arc on the front of the top tier
    const g = new THREE.Group(); g.position.set(Math.cos(a) * r, CTOP, -Math.sin(a) * r * .7 + .004); cake.add(g);
    g.add(cyl(.0022, .0022, .02, mat(cl, { r: .5 }), [0, .01, 0], 8));
    g.add(cyl(.0004, .0004, .004, mat('#3a2a2a'), [0, .022, 0], 4));
    const flame = mesh(keep(new THREE.SphereGeometry(.0028, 10, 8)), own('#fff3c4', { e: 0xffb347, ei: 2.4 }), [0, .0265, 0], false);
    const fg = kit.glow({ color: 0xffc070, size: .03, opacity: 0 }); fg.position.set(0, .027, 0);
    g.add(flame, fg);
    return { flame, glow: fg };
  });
  const cakeLight = new THREE.PointLight(0xffb36b, 0, .35, 1.8); cakeLight.position.set(0, CTOP + .015, .07); cake.add(cakeLight);

  /* the card's line for the cake on a ribbon along the table's front edge: it hangs below the cake, so it hides nothing */
  const RW = .3, RH = .062;
  const ribbonTex = tex(1024, Math.round(1024 * RH / RW), (c, w, h) => {
    c.fillStyle = '#fff8ef'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, h - 26);
    for (let x = w; x > 0; x -= 32) c.quadraticCurveTo(x - 16, h + 4, x - 32, h - 26);            // a scalloped hem
    c.closePath(); c.fill();
    c.fillStyle = '#d6336c'; c.fillRect(0, 0, w, 16);
    c.strokeStyle = 'rgba(214,51,108,.55)'; c.lineWidth = 4; c.setLineDash([14, 10]); c.beginPath(); c.moveTo(14, 30); c.lineTo(w - 14, 30); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#e8436d'; heartAt(c, 44, h * .5, 42); heartAt(c, w - 44, h * .5, 42);
    c.fillStyle = '#7a1238'; kit.fitText(c, kit.words('cake', 'Sinh nhật vui vẻ, mẹ yêu!'), { x: 84, y: 34, w: w - 168, h: h - 72 }, { maxLines: 2, font: SANS, weight: 800 });   // a bold face: script blurs at this size
  });
  const cakeLine = new THREE.Group(); cakeLine.position.set(TB.x, TOP - .004, TB.z + TB.d / 2 + .004); room.add(cakeLine);   // its top edge: it unrolls down
  const ribbon = mesh(keep(new THREE.PlaneGeometry(RW, RH)), keep(new THREE.MeshStandardMaterial({ map: ribbonTex, color: '#ece4e0', roughness: .9, transparent: true, alphaTest: .4,
    emissive: 0xffffff, emissiveMap: ribbonTex, emissiveIntensity: .2 })), [0, -RH / 2, 0], false);
  cakeLine.add(ribbon);

  /* ── the big photo standing on the table: the photos in turn, until it turns round to show the hero (the first) ── */
  const display = new THREE.Group(); display.position.set(.19, TOP, TB.z - .025); display.rotation.y = -.15; room.add(display);   // turned to face the phone
  const standWood = mat(C.woodDark, { r: .6 });
  display.add(mesh(soft(.07, .012, .036, .004), standWood, [0, .006, 0]));
  const flip = new THREE.Group(); flip.position.y = .012; display.add(flip);
  const family = kit.photo({ frame: 'wood', width: .16, aspect: 1.1, slot: 4, of: 9, glow: .45, border: .07, color: '#d9a066' });
  const hero = kit.photo({ hero: true, frame: 'wood', width: .16, aspect: 1.1, glow: .55, border: .07, color: '#d9a066' });
  family.root.position.set(0, family.height / 2, .0035); hero.root.position.set(0, hero.height / 2, -.0035); hero.root.rotation.y = Math.PI;
  flip.add(family.root, hero.root);
  const heroGlow = kit.glow({ color: 0xffd9a0, size: .26, opacity: 0 }); heroGlow.position.set(0, .012 + hero.height / 2, -.03); display.add(heroGlow);

  /* ── the banner the balloons lift from behind the wall ── */
  const lift = new THREE.Group(); room.add(lift);
  const banner = kit.sign({ text: kit.words('banner', 'Cảm ơn mẹ vì tất cả'), style: 'banner', width: .6, accent: '#e0457b', glow: .55 });
  lift.add(banner.root);
  const balloons = [[-.31, '#ff6f91'], [.31, '#ffd166']].map(([x, cl]) => {
    const g = new THREE.Group(); g.position.set(x, .2, -.01); lift.add(g);
    const bl = ball(.045, keep(new THREE.MeshStandardMaterial({ color: cl, roughness: .25, metalness: .1, emissive: cl, emissiveIntensity: .15 })), [0, 0, 0], 20);
    bl.scale.set(.92, 1.08, .92); g.add(bl);
    g.add(cyl(.004, .006, .008, mat(cl, { r: .4 }), [0, -.05, 0], 8));
    const str = cyl(.0006, .0006, .11, mat('#ffffff', { r: .6 }), [x > 0 ? -.012 : .012, -.105, 0], 4); str.rotation.z = x > 0 ? -.12 : .12; g.add(str);
    return g;
  });

  /* ── the bag she brings home ── */
  const bag = new THREE.Group(); room.add(bag);
  const bagM = mat('#e8b23a', { r: .75 });
  const BAG = { w: .05, h: .048, d: .018, handle: .016 };              // its handles' top is the group's origin (in her fist)
  bag.add(mesh(soft(BAG.d, BAG.h, BAG.w, .005), bagM, [0, -BAG.handle - BAG.h / 2, 0]));   // broad faces to the sides, as a tote is carried
  for (const x of [-1, 1]) {
    const hnd = mesh(keep(new THREE.TorusGeometry(.0135, .0017, 6, 16, Math.PI)), mat('#c98b6b', { r: .5 }), [x * .005, -BAG.handle, 0]);
    hnd.rotation.y = Math.PI / 2; bag.add(hnd);
  }
  const patch = panel(.022, .022, tex(96, 96, (c, w) => { c.fillStyle = C.magenta; heartAt(c, w / 2, w / 2 + 4, 80); }), [0, 0, 0], { alpha: true, glow: .2 });
  patch.position.set(BAG.d / 2 + .0008, -BAG.handle - BAG.h * .45, 0); patch.rotation.y = Math.PI / 2; bag.add(patch);
  const patch2 = patch.clone(); patch2.position.x = -BAG.d / 2 - .0008; patch2.rotation.y = -Math.PI / 2; bag.add(patch2);

  /* ── a speech bubble that faces the phone ── */
  function bubble(text, o = {}) {
    const s = kit.picture((c, px) => {
      const tail = o.tail ?? .3;
      c.fillStyle = o.paper ?? '#ffffff'; c.strokeStyle = o.line ?? '#3b2a4a'; c.lineWidth = px * .025;
      if (o.burst) {                                                      // a shout: a starburst
        c.beginPath(); for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, r = (i % 2 ? .36 : .47) * px; c[i ? 'lineTo' : 'moveTo'](px / 2 + Math.cos(a) * r, px / 2 + Math.sin(a) * r * .72); }
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = o.ink ?? C.red; kit.fitText(c, text, { x: px * .2, y: px * .3, w: px * .6, h: px * .4 }, { maxLines: 2, max: px * .2, font: SANS, weight: 900 });
        return;
      }
      rounded(c, px * .05, px * .14, px * .9, px * .52, px * .18); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(px * tail, px * .64); c.lineTo(px * (tail - .05), px * .84); c.lineTo(px * (tail + .13), px * .64); c.closePath(); c.fill(); c.stroke();
      c.fillRect(px * (tail - .01), px * .6, px * .15, px * .06);
      c.fillStyle = o.ink ?? '#b0306a'; kit.fitText(c, text, { x: px * .1, y: px * .18, w: px * .8, h: px * .44 }, { maxLines: o.lines ?? 2, max: px * .2 });
    }, { px: 320 });
    s.visible = false; room.add(s);                                     // the story sizes and places it
    return s;
  }

  return {
    room, F, TOP, SEAT_TOP, TB, CAKE, door, lamps, moonGlow, garland, garlandSet, bulbs, note, NOTE_HOME, prints, flowers,
    cake, candles, cakeLight, cakeLine, display, flip, hero, heroGlow, lift, balloons, bag, BAG, bubble
  };
};
