/* Sinh nhật Bố: the living room, built for story.js (template.json "story": ["set.js", "story.js"]). An evening living
   room: a honey wood floor with a rug; a tall blush wall along the back (wallpaper over a wainscot) with the front door
   at the left (a dim hall behind it), the light switch beside it and the children's big sticky note above it, a sofa,
   three family photos hung high over it; at the right a wall unit: the TV on a low cabinet, a bookshelf above it with a
   line of four photo pennants that unrolls across it; a coffee table with Bố's mug, a coat stand by the door, a floor
   lamp at the front; for the party fairy lights along the top of the wall, a disco ball that comes down and throws
   spots of colour, a three-tier cake with candles, a big trophy with the first photo on its cup.
   window.NM_BDAY_DAD_SET(kit) builds it all and returns what the story moves. Units: card widths, +y up, the act faces +z
   (the card's bottom edge). Photos: 10 surfaces spread over the photos (slot of 10) and the trophy with the first one. */
window.NM_BDAY_DAD_SET = kit => {
  const { THREE, stage, keep } = kit;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const FLOOR = .006;                                                   // the floor's top
  const WALL = { x0: -.52, x1: .52, z: -.29, t: .02, h: .95 }, WZ = WALL.z + WALL.t / 2;   // WZ: the wall's face
  const DOOR = { x0: -.5, x1: -.37, h: .375 }, HALL = .13;              // the doorway, and how deep the hall behind it is
  const SWITCH = { x: -.335, y: .225 };
  const NOTE = { x: -.255, y: .4, w: .19, h: .158 };
  const SOFA = { x: -.06, w: .24, d: .15 };
  const TABLE = { x: -.06, z: .12, w: .18, d: .095, top: .075 };
  const UNIT = { x0: .07, x1: .52, d: .085, cab: .075, shelf: [.425, .53], top: .64 };   // the TV's cabinet and the bookshelf over it
  const LAMP = { x: .42, z: .12 };
  const COAT = { x: -.46, z: -.065 };
  const TROPHY = { x: .295, z: -.1 };                                 // in front of the TV: it takes the screen's place
  const PLACES = 10;
  const UP = new THREE.Vector3(0, 1, 0);

  /* ── materials and shapes ── */
  const mats = new Map();
  const mat = (color, o = {}) => {
    const key = `${color}|${o.r ?? .8}|${o.m ?? 0}|${o.e ?? ''}|${o.ei ?? 1}|${o.side ?? 0}`;
    if (!mats.has(key)) {
      const m = keep(new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .8, metalness: o.m ?? 0, side: o.side ?? THREE.FrontSide,
        ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}) }));
      if (o.m) { m.envMap = kit.env; m.envMapIntensity = .9; }
      mats.set(key, m);
    }
    return mats.get(key);
  };
  const own = (color, o = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .6, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0 }));
  const painted = (t, o = {}) => keep(new THREE.MeshStandardMaterial({ map: t, roughness: o.r ?? .85, transparent: !!o.cut, alphaTest: o.cut ? .5 : 0,
    ...(o.glow ? { emissive: 0xffffff, emissiveMap: t, emissiveIntensity: o.glow } : {}) }));
  const mesh = (geo, m, at = [0, 0, 0], shadow = true) => {
    const x = new THREE.Mesh(geo, m); x.position.set(...at); x.castShadow = shadow; x.receiveShadow = true; return x;
  };
  const box = (w, h, d, m, at) => mesh(keep(new THREE.BoxGeometry(w, h, d)), m, at);
  const cyl = (rt, rb, h, m, at, seg = 16) => mesh(keep(new THREE.CylinderGeometry(rt, rb, h, seg)), m, at);
  const ball = (r, m, at, seg = 12) => mesh(keep(new THREE.SphereGeometry(r, seg, Math.max(6, seg * .75 | 0))), m, at);
  const tex = (w, h, draw) => kit.canvasTexture(w, h, draw);
  /** a box with soft, rounded edges, like an upholstered cushion */
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
  /** decoration a finger should go through (to the photo behind it, or to play on) */
  const noHit = o => { o.traverse(x => { x.raycast = () => {}; }); return o; };
  const rounded = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  /** a soft round spot of light (disco spots, the lamp's pool) */
  const spotTex = tex(64, 64, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, w);
  });
  const brass = mat('#e8c37a', { r: .3, m: .7 }), oak = mat('#a8703e', { r: .6 }), iron = mat('#3b2a3a', { r: .45, m: .5 });

  /* ── the floor: honey planks, a rug in the middle ── */
  const floorTex = tex(1024, 512, (c, w, h) => {
    const r = seeded(318), row = h / 12;
    for (let j = 0; j < 12; j++) {
      for (let x = -((j * 137) % 260); x < w;) {
        const len = 180 + r() * 220;
        c.fillStyle = ['#d9a76c', '#cf9a5e', '#e2b47c', '#d4a066'][(j + Math.floor(x / 97)) & 3]; c.fillRect(x, j * row, len, row);
        c.strokeStyle = 'rgba(110,64,30,.18)'; c.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) { const y = j * row + 6 + r() * (row - 12); c.beginPath(); c.moveTo(x + 8, y); c.bezierCurveTo(x + len * .3, y + 3, x + len * .6, y - 3, x + len - 8, y); c.stroke(); }
        c.fillStyle = 'rgba(90,50,24,.45)'; c.fillRect(x, j * row, 2, row);
        x += len;
      }
      c.fillStyle = 'rgba(90,50,24,.4)'; c.fillRect(0, j * row, w, 2);
    }
  });
  const FZ0 = WZ, FZ1 = .3, FX = .52;
  const floorEdge = mat('#8a5a3c', { r: .8 });
  const floor = box(FX * 2, FLOOR, FZ1 - FZ0, [floorEdge, floorEdge, keep(new THREE.MeshStandardMaterial({ map: floorTex, roughness: .7 })), floorEdge, floorEdge, floorEdge], [0, FLOOR / 2, (FZ0 + FZ1) / 2]);
  floor.castShadow = false; stage.add(floor);
  const rugTex = tex(512, 320, (c, w, h) => {
    c.fillStyle = '#e88aa0'; rounded(c, 0, 0, w, h, 26); c.fill();
    c.fillStyle = '#fff1e6'; rounded(c, 18, 18, w - 36, h - 36, 18); c.fill();
    c.fillStyle = '#f6c3cf'; rounded(c, 34, 34, w - 68, h - 68, 14); c.fill();
    c.strokeStyle = '#e88aa0'; c.lineWidth = 6; c.setLineDash([18, 10]); rounded(c, 50, 50, w - 100, h - 100, 10); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      const x = 96 + i * 64, y = 96 + j * 64; c.fillStyle = (i + j) % 2 ? '#fff1e6' : '#f2d27e';
      c.beginPath(); c.moveTo(x, y - 16); c.lineTo(x + 16, y); c.lineTo(x, y + 16); c.lineTo(x - 16, y); c.closePath(); c.fill();
    }
    c.fillStyle = '#fff1e6'; for (let x = 10; x < w; x += 16) { c.fillRect(x, 0, 5, 8); c.fillRect(x, h - 8, 5, 8); }
  });
  const rug = mesh(keep(new THREE.PlaneGeometry(.46, .28)), keep(new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1, transparent: true, alphaTest: .5 })), [-.07, FLOOR + .0008, .04], false);
  rug.rotation.x = -Math.PI / 2; stage.add(rug);

  /* ── the back wall: blush wallpaper over a wainscot, the doorway cut through it ── */
  const WW = WALL.x1 - WALL.x0, WPX = 1536, WPY = Math.round(WPX * WALL.h / WW), PXU = WPX / WW;
  const wx = x => (x - WALL.x0) * PXU, wy = y => (WALL.h - y) * PXU;   // the wall's canvas: x, y on it
  const wallTex = tex(WPX, WPY, (c, w, h) => {
    const rail = wy(.17), base = wy(.03);
    c.fillStyle = '#f7d3d9'; c.fillRect(0, 0, w, rail);
    c.fillStyle = 'rgba(255,255,255,.55)';                               // little hearts and dots in rows
    for (let y = 40, row = 0; y < rail - 16; y += 48, row++) for (let x = (row % 2) * 32 + 18; x < w; x += 64) {
      if (row % 2) kit.heartPath(c, x, y, 16); else { c.beginPath(); c.arc(x, y, 3.8, 0, 7); } c.fill();
    }
    c.fillStyle = '#e9aab8'; c.fillRect(0, rail, w, base - rail);            // the wainscot, its panels
    c.strokeStyle = 'rgba(150,60,90,.28)'; c.lineWidth = 4;
    for (let x = 14; x < w - 60; x += 96) c.strokeRect(x, rail + 16, 80, base - rail - 30);
    c.fillStyle = '#fff4ea'; c.fillRect(0, rail - 7, w, 12);                 // the chair rail
    c.fillStyle = '#fbefe6'; c.fillRect(0, base, w, h - base);               // the skirting board
    c.fillStyle = 'rgba(150,90,80,.3)'; c.fillRect(0, base, w, 3);
    c.fillStyle = '#fff4ea'; c.fillRect(0, 0, w, 20); c.fillStyle = 'rgba(150,90,80,.25)'; c.fillRect(0, 20, w, 3);   // the crown moulding
    c.clearRect(wx(DOOR.x0), wy(DOOR.h), wx(DOOR.x1) - wx(DOOR.x0), wy(0) - wy(DOOR.h) + 2);   // the doorway
  });
  const wallMat = keep(new THREE.MeshStandardMaterial({ map: wallTex, roughness: .92, transparent: true, alphaTest: .5 }));
  const wall = mesh(keep(new THREE.PlaneGeometry(WW, WALL.h)), wallMat, [(WALL.x0 + WALL.x1) / 2, WALL.h / 2, WZ + .0005], false);
  stage.add(wall);
  const plaster = mat('#e8cfc6', { r: .95 }), trim = mat('#fff4ea', { r: .6 });
  for (const [x0, x1, y0, y1] of [[WALL.x0, DOOR.x0, 0, WALL.h], [DOOR.x1, WALL.x1, 0, WALL.h], [DOOR.x0, DOOR.x1, DOOR.h, WALL.h]]) {
    const b = box(x1 - x0, y1 - y0, WALL.t, plaster, [(x0 + x1) / 2, (y0 + y1) / 2, WALL.z - .0005]); b.castShadow = false; stage.add(b);
  }
  stage.add(box(WW + .01, .016, WALL.t + .014, trim, [(WALL.x0 + WALL.x1) / 2, WALL.h + .008, WALL.z]));   // its top

  /* ── the doorway: its casing, the hall behind (dim, a warm lamp at the end), the door hinged on the left ── */
  const DX = (DOOR.x0 + DOOR.x1) / 2, DW = DOOR.x1 - DOOR.x0;
  for (const [w, h, x, y] of [[.012, DOOR.h + .012, DOOR.x0 - .006, DOOR.h / 2], [.012, DOOR.h + .012, DOOR.x1 + .006, DOOR.h / 2], [DW + .036, .014, DX, DOOR.h + .007]])
    stage.add(box(w, h, .008, trim, [x, y, WZ + .004]));
  const hallTex = tex(256, 512, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a2a35'); g.addColorStop(.6, '#5a3c44'); g.addColorStop(1, '#2c2028');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const s = c.createRadialGradient(w * .5, h * .3, 0, w * .5, h * .3, w * .55); s.addColorStop(0, 'rgba(255,200,140,.55)'); s.addColorStop(1, 'rgba(255,200,140,0)');
    c.fillStyle = s; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7a5560'; c.fillRect(w * .32, h * .38, w * .36, h * .26); c.fillStyle = '#c99aa4'; c.fillRect(w * .36, h * .41, w * .28, h * .2);   // a picture in the hall
    c.fillStyle = '#4a3238'; c.fillRect(0, h * .86, w, h * .14);
  });
  const inside = color => mat(color, { r: 1, side: THREE.BackSide });
  const hall = mesh(keep(new THREE.BoxGeometry(DW + .01, DOOR.h + .01, HALL)), [inside('#4a3540'), inside('#4a3540'), inside('#3a2a33'), inside('#5a4038'),
    keep(new THREE.MeshBasicMaterial({ visible: false })), keep(new THREE.MeshBasicMaterial({ map: hallTex, side: THREE.BackSide }))], [DX, (DOOR.h + .01) / 2, WALL.z - WALL.t / 2 - HALL / 2 + .001], false);
  stage.add(hall);
  const hinge = new THREE.Group(); hinge.position.set(DOOR.x0 + .002, FLOOR, WZ - .006); stage.add(hinge);
  const doorTex = tex(128, 384, (c, w, h) => {
    c.fillStyle = '#fbf3ea'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e2c9b8'; c.lineWidth = 6;
    for (const [y, hh] of [[24, h * .3], [h * .4, h * .53]]) for (const x of [16, w / 2 + 6]) c.strokeRect(x, y, w / 2 - 22, hh);
    c.fillStyle = '#f39ab6'; kit.heartPath(c, w / 2, h * .2, 26); c.fill();
  });
  const doorEdge = mat('#eaddcf', { r: .6 }), dw = DW - .004;
  hinge.add(box(dw, DOOR.h - .004, .01, [doorEdge, doorEdge, doorEdge, doorEdge, painted(doorTex, { r: .6 }), painted(doorTex, { r: .6 })], [dw / 2, (DOOR.h - .004) / 2, 0]));
  for (const s of [1, -1]) hinge.add(ball(.0055, brass, [dw - .014, DOOR.h * .47, s * .008], 10));
  const door = { open: k => { hinge.rotation.y = -1.78 * k; } };
  const hallLight = new THREE.PointLight(0xffc28a, .3, .5, 1.6); hallLight.position.set(DX, .3, WALL.z - HALL * .6); stage.add(hallLight);

  /* ── the light switch, and the children's sticky note above it ── */
  stage.add(box(.026, .038, .004, mat('#ffffff', { r: .4 }), [SWITCH.x, SWITCH.y, WZ + .002]));
  const rocker = new THREE.Group(); rocker.position.set(SWITCH.x, SWITCH.y, WZ + .0045); stage.add(rocker);
  rocker.add(box(.012, .02, .004, mat('#f4efe8', { r: .35 }), [0, 0, 0]));
  const led = ball(.0016, own('#ff9a3c', { e: 0xff8a2a, ei: 1.4 }), [0, -.006, .0025], 8); rocker.add(led);
  const toggle = { set(on) { rocker.rotation.x = on ? -.32 : .32; } }; toggle.set(false);
  const noteText = kit.words('note', 'Bố bật đèn lên nhé!');
  const noteTex = tex(640, 532, (c, w, h) => {
    c.save(); c.shadowColor = 'rgba(80,40,20,.35)'; c.shadowBlur = 16; c.shadowOffsetY = 8;
    c.fillStyle = '#ffe36e'; c.beginPath(); c.moveTo(22, 22); c.lineTo(w - 22, 22); c.lineTo(w - 22, h - 78); c.lineTo(w - 78, h - 22); c.lineTo(22, h - 22); c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#f2c64a'; c.beginPath(); c.moveTo(w - 22, h - 78); c.lineTo(w - 78, h - 78); c.lineTo(w - 78, h - 22); c.closePath(); c.fill();   // the curled corner
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(22, 22, w - 44, 26);
    c.save(); c.translate(w / 2, 28); c.rotate(-.05); c.globalAlpha = .85; c.fillStyle = '#ff8fab'; c.fillRect(-100, -24, 200, 48);   // washi tape
    c.globalAlpha = .4; c.fillStyle = '#fff'; for (let x = -90; x < 100; x += 30) c.fillRect(x, -24, 12, 48); c.restore();
    c.strokeStyle = '#e8436d'; c.lineWidth = 12; c.lineCap = 'round'; c.lineJoin = 'round';   // an arrow down to the switch
    c.beginPath(); c.moveTo(118, h - 120); c.quadraticCurveTo(70, h - 80, 66, h - 30); c.stroke();
    c.beginPath(); c.moveTo(40, h - 64); c.lineTo(66, h - 26); c.lineTo(96, h - 60); c.stroke();
    c.fillStyle = '#e8436d'; kit.heartPath(c, w - 120, h - 118, 50); c.fill();
    c.fillStyle = '#5a2a1a'; kit.fitText(c, noteText, { x: 60, y: 64, w: w - 120, h: h - 210 }, { maxLines: 3, max: 120 });
    c.fillStyle = '#9e4a2a'; c.font = `700 40px ${kit.HAND}`; c.textAlign = 'center'; c.fillText('♥ tụi con', w / 2 + 40, h - 92);
  });
  const noteMat = painted(noteTex, { r: .9, glow: .55, cut: true });
  const note = mesh(keep(new THREE.PlaneGeometry(NOTE.w, NOTE.h)), noteMat, [NOTE.x, NOTE.y, WZ + .003], false);
  note.rotation.z = .035; stage.add(note);

  /* ── the coat stand by the door: Bố's hat, a scarf, an umbrella ── */
  const coat = new THREE.Group(); coat.position.set(COAT.x, FLOOR, COAT.z); stage.add(coat);
  const walnut = mat('#7a4a2e', { r: .55 });
  coat.add(cyl(.026, .03, .008, walnut, [0, .004, 0], 18), cyl(.0035, .0045, .32, walnut, [0, .168, 0], 10), ball(.007, walnut, [0, .33, 0], 10));
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + .4, hook = cyl(.0018, .0018, .03, walnut, [Math.cos(a) * .012, .31, Math.sin(a) * .012], 6);
    hook.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9); coat.add(hook);
  }
  const hat = new THREE.Group(); hat.position.set(0, .336, 0); hat.rotation.z = .12; coat.add(hat);
  hat.add(cyl(.026, .026, .003, mat('#5a4a6a', { r: .7 }), [0, 0, 0], 22), cyl(.015, .017, .02, mat('#5a4a6a', { r: .7 }), [0, .011, 0], 18), cyl(.0172, .0172, .005, mat('#e8436d', { r: .6 }), [0, .005, 0], 18));
  const scarfTex = tex(64, 256, (c, w, h) => {                        // a knitted scarf: stripes, a fringe at the end
    for (let y = 0; y < h; y += 32) { c.fillStyle = (y / 32) % 2 ? '#fff4ea' : '#e8436d'; c.fillRect(0, y, w, 32); }
    c.fillStyle = '#e8436d'; for (let x = 2; x < w; x += 8) c.fillRect(x, h - 18, 4, 18);
  });
  const scarfMat = keep(new THREE.MeshStandardMaterial({ map: scarfTex, roughness: 1, side: THREE.DoubleSide }));
  for (const [x, len, tilt] of [[-.006, .15, .1], [.007, .11, -.14]]) {   // two ends hanging from the hook, a little apart
    const end = mesh(keep(new THREE.PlaneGeometry(.02, len, 1, 6)), scarfMat, [x, .312 - len / 2, .014]);
    end.rotation.set(-.12, x > 0 ? -.5 : .4, tilt); coat.add(end);
  }
  const umbrella = new THREE.Group(); umbrella.position.set(.024, 0, .012); umbrella.rotation.set(.05, 0, -.14); coat.add(umbrella);
  umbrella.add(cyl(.0012, .0012, .2, mat('#2b2440'), [0, .1, 0], 6), cyl(.009, .002, .15, mat('#3d6ea8', { r: .7 }), [0, .12, 0], 10));
  umbrella.add(mesh(keep(new THREE.TorusGeometry(.008, .0018, 6, 12, Math.PI)), walnut, [.008, .2, 0]));

  /* ── the sofa against the wall, its cushions and two pillows ── */
  const velvet = mat('#d4637f', { r: .85 }), velvet2 = mat('#e57d96', { r: .88 });
  const sofa = new THREE.Group(); sofa.position.set(SOFA.x, FLOOR, WZ + SOFA.d / 2 + .004); stage.add(sofa);
  sofa.add(mesh(soft(SOFA.w, .046, SOFA.d, .012), velvet, [0, .036, 0]));
  sofa.add(mesh(soft(SOFA.w, .1, .034, .014), velvet, [0, .1, -SOFA.d / 2 + .017]));
  for (const s of [-1, 1]) sofa.add(mesh(soft(.032, .068, SOFA.d, .012), velvet, [s * (SOFA.w / 2 - .016), .072, 0]));
  for (const s of [-1, 1]) sofa.add(mesh(soft(SOFA.w / 2 - .036, .022, SOFA.d - .034, .009), velvet2, [s * (SOFA.w / 4 - .009), .07, .014]));   // seat top .081
  for (const s of [-1, 1]) sofa.add(mesh(soft(SOFA.w / 2 - .04, .066, .026, .012), velvet2, [s * (SOFA.w / 4 - .01), .118, -SOFA.d / 2 + .046]));
  for (const x of [-1, 1]) for (const z of [-1, 1]) sofa.add(cyl(.005, .004, .013, oak, [x * (SOFA.w / 2 - .02), .0065, z * (SOFA.d / 2 - .02)], 8));
  const p1 = mesh(soft(.05, .05, .016, .007), mat('#ffd36e', { r: .9 }), [-SOFA.w / 2 + .06, .108, -SOFA.d / 2 + .066]); p1.rotation.set(-.25, .2, .12); sofa.add(p1);
  const heartTex = tex(64, 64, (c, w) => { c.fillStyle = '#e8436d'; kit.heartPath(c, w / 2, w * .54, w * .9); c.fill(); });
  p1.add(mesh(keep(new THREE.PlaneGeometry(.026, .026)), keep(new THREE.MeshStandardMaterial({ map: heartTex, transparent: true, alphaTest: .5, roughness: .9 })), [0, 0, .0085], false));
  const p2 = mesh(soft(.046, .046, .016, .007), mat('#8fd0bd', { r: .9 }), [SOFA.w / 2 - .06, .106, -SOFA.d / 2 + .066]); p2.rotation.set(-.25, -.2, -.1); sofa.add(p2);

  /* ── three family photos hung high on the wall, each on a nail so it can swing ── */
  const frames = [
    { at: [-.285, .665], w: .135, aspect: 1.22, frame: 'wood', slot: 0 },
    { at: [-.115, .685], w: .17, aspect: .8, frame: 'white', slot: 3, color: '#fffaf3' },
    { at: [.035, .655], w: .12, aspect: 1.18, frame: 'wood', slot: 5, color: '#c98f5c' }
  ].map(f => {
    const ph = kit.photo({ frame: f.frame, width: f.w, aspect: f.aspect, slot: f.slot, of: PLACES, glow: .3, color: f.color, border: .07 });
    const nail = new THREE.Group(); nail.position.set(f.at[0], f.at[1] + ph.height / 2 + .022, WZ + .006); stage.add(nail);
    nail.add(ball(.0032, brass, [0, 0, 0], 8));
    const swing = new THREE.Group(); nail.add(swing);
    ph.root.position.set(0, -ph.height / 2 - .022, 0); swing.add(ph.root);
    const wire = keep(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-ph.width * .35, -.022, -.002), new THREE.Vector3(0, 0, -.002), new THREE.Vector3(ph.width * .35, -.022, -.002)]));
    swing.add(new THREE.Line(wire, keep(new THREE.LineBasicMaterial({ color: '#6a4a3a' }))));
    return { nail, swing, photo: ph };
  });

  /* ── the floor lamp at the front: the only light when he comes home ── */
  const lamp = new THREE.Group(); lamp.position.set(LAMP.x, FLOOR, LAMP.z); stage.add(lamp);
  lamp.add(cyl(.024, .028, .007, iron, [0, .0035, 0], 20), cyl(.0028, .0028, .3, iron, [0, .155, 0], 8));
  const shadeMat = own('#fff2dc', { r: .8, e: 0xffc070, ei: 1.1 }); shadeMat.side = THREE.DoubleSide;
  lamp.add(mesh(keep(new THREE.CylinderGeometry(.026, .04, .05, 24, 1, true)), shadeMat, [0, .32, 0]));
  const trimRing = mesh(keep(new THREE.TorusGeometry(.04, .0018, 6, 28)), mat('#e8436d', { r: .6 }), [0, .296, 0]); trimRing.rotation.x = Math.PI / 2; lamp.add(trimRing);
  const lampGlow = kit.glow({ color: 0xffc879, size: .26, opacity: .8 }); lampGlow.position.set(0, .3, .01); lamp.add(lampGlow);
  const lampLight = new THREE.PointLight(0xffb36a, 1.2, .95, 1.5); lampLight.position.set(-.02, .28, -.01); lamp.add(lampLight);
  const pool = mesh(keep(new THREE.CircleGeometry(.22, 32)), keep(new THREE.MeshBasicMaterial({ map: spotTex, color: 0xffb46a, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending })), [LAMP.x - .06, FLOOR + .0015, LAMP.z - .04], false);
  pool.rotation.x = -Math.PI / 2; noHit(pool); stage.add(pool);

  /* ── the wall unit at the right: a low cabinet with the TV on it, a bookshelf over the TV ── */
  const UW = UNIT.x1 - UNIT.x0, UX = (UNIT.x0 + UNIT.x1) / 2, UZ = WZ + UNIT.d / 2 + .002;
  const unit = new THREE.Group(); unit.position.set(UX, FLOOR, UZ); stage.add(unit);
  const cream = mat('#f4e3d0', { r: .6 }), teak = mat('#9a6238', { r: .6 }), teakIn = mat('#7a4a2a', { r: .7 });
  unit.add(mesh(soft(UW, UNIT.cab, UNIT.d, .006), cream, [0, .01 + UNIT.cab / 2 - .005, 0]));
  for (const s of [-1, 0, 1]) {                                         // three drawers, brass pulls
    unit.add(box(UW / 3 - .014, UNIT.cab - .022, .003, mat('#ead2bb', { r: .6 }), [s * UW / 3, .01 + UNIT.cab / 2 - .005, UNIT.d / 2 + .001]));
    unit.add(box(.03, .005, .006, brass, [s * UW / 3, .01 + UNIT.cab / 2, UNIT.d / 2 + .004]));
  }
  for (const x of [-1, 1]) for (const z of [-1, 1]) unit.add(cyl(.004, .003, .01, oak, [x * (UW / 2 - .02), .005, z * (UNIT.d / 2 - .015)], 8));
  const CAB_TOP = .01 + UNIT.cab - .005;
  /* the bookshelf over the TV: its back, sides, two shelves and a top, books, a plant, two photos, a little cup */
  const SD = .07, SZ = -UNIT.d / 2 + SD / 2;
  const shelf = new THREE.Group(); unit.add(shelf);
  shelf.add(box(UW, UNIT.top - UNIT.shelf[0], .006, teakIn, [0, (UNIT.top + UNIT.shelf[0]) / 2, -UNIT.d / 2 + .003]));
  for (const s of [-1, 1]) shelf.add(box(.012, UNIT.top - UNIT.shelf[0] + .012, SD, teak, [s * (UW / 2 - .006), (UNIT.top + UNIT.shelf[0]) / 2, SZ]));
  for (const y of [...UNIT.shelf, UNIT.top]) shelf.add(box(UW, .012, SD, teak, [0, y, SZ]));
  const rb = seeded(77), BOOKS = ['#e8436d', '#f2a03d', '#5aa39b', '#3d6ea8', '#f6c9d6', '#7a5aa0', '#ffd36e', '#c94f4f', '#8fd0bd', '#fff4ea'];
  const bookRow = (y0, from, to, lean = false) => {
    for (let x = from; x < to;) {
      const w = .009 + rb() * .008, h = .06 + rb() * .03, b = box(w, h, .05, mat(BOOKS[(rb() * BOOKS.length) | 0], { r: .7 }), [x + w / 2, y0 + h / 2, SZ + .004]);
      b.castShadow = false; shelf.add(b); x += w + .001;
    }
    if (lean) { const b = box(.01, .08, .05, mat(BOOKS[2], { r: .7 }), [to + .02, y0 + .036, SZ + .004]); b.rotation.z = -.4; shelf.add(b); }
  };
  const S0 = UNIT.shelf[0] + .006, S1 = UNIT.shelf[1] + .006;
  bookRow(S0, -UW / 2 + .014, -.11, true); bookRow(S0, .06, UW / 2 - .014);
  bookRow(S1, -UW / 2 + .014, -.05); bookRow(S1, .1, UW / 2 - .014);
  const pot = new THREE.Group(); pot.position.set(-.075, S0, SZ + .006); shelf.add(pot);
  pot.add(cyl(.016, .012, .026, mat('#e88aa0', { r: .7 }), [0, .013, 0], 14));
  [[0, .04, 0, .018], [.012, .033, .006, .013], [-.011, .035, -.004, .014], [.002, .056, .002, .012]].forEach(([x, y, z, r]) => pot.add(ball(r, mat('#6fbf73', { r: .9 }), [x, y, z], 10)));
  const cup = new THREE.Group(); cup.position.set(.04, S1, SZ + .01); shelf.add(cup);   // a little cup: the big one is coming
  cup.add(cyl(.012, .015, .006, mat('#5a3a2a'), [0, .003, 0], 12), cyl(.0025, .0025, .016, brass, [0, .014, 0], 8), mesh(keep(new THREE.CylinderGeometry(.012, .005, .018, 14, 1, true)), mat('#e8c37a', { r: .3, m: .7, side: THREE.DoubleSide }), [0, .031, 0]));
  [[.01, S0, 7], [-.015, S1, 8]].forEach(([x, y, slot], i) => {
    const ph = kit.photo({ frame: i ? 'wood' : 'white', width: .078, aspect: i ? 1.12 : .86, slot, of: PLACES, glow: .35, color: i ? '#e2b98c' : undefined });
    ph.root.position.set(x, y + ph.height / 2 + .001, SZ + .012); ph.root.rotation.x = -.06; shelf.add(ph.root);
  });
  /* the TV on the cabinet, facing the room; off until the surprise */
  const screen = kit.photo({ frame: 'screen', width: .4, aspect: .5625, border: .022, slot: 2, of: PLACES, turn: 1.15, glow: .95 });
  const CAP_H = .062;                                                   // the caption bar under the picture
  const tv = new THREE.Group(); tv.position.set(0, CAB_TOP + .016 + .006 + CAP_H + screen.height / 2, .002); unit.add(tv);
  tv.add(mesh(soft(screen.width + .016, screen.height + CAP_H + .016, .014, .004), mat('#1d1a22', { r: .35 }), [0, -CAP_H / 2, -.006]));
  screen.root.position.z = .002; tv.add(screen.root);
  unit.add(box(.07, .004, .036, mat('#2b2630', { r: .4 }), [0, CAB_TOP + .002, .002]), box(.014, .018, .008, mat('#2b2630', { r: .4 }), [0, CAB_TOP + .012, -.002]));
  const tvOff = mesh(keep(new THREE.PlaneGeometry(screen.width - .01, screen.height - .01)), keep(new THREE.MeshStandardMaterial({ color: '#16141b', roughness: .18, metalness: .3, transparent: true, opacity: 1 })), [0, 0, .0062], false);
  tvOff.material.envMap = kit.env; tvOff.material.envMapIntensity = .6; tv.add(tvOff);
  const flashTex = tex(256, 64, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const tvFlash = noHit(mesh(keep(new THREE.PlaneGeometry(screen.width - .01, screen.height - .01)), keep(new THREE.MeshBasicMaterial({ map: flashTex, color: 0xdfe8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })), [0, 0, .0066], false));
  tv.add(tvFlash);
  const captionText = kit.words('tv', 'Bố là siêu anh hùng của tụi con');
  const captionTex = tex(1024, 156, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#e8436d'); g.addColorStop(1, '#ff8a5c');
    c.fillStyle = g; rounded(c, 4, 6, w - 8, h - 12, 18); c.fill();
    c.fillStyle = '#ffd36e'; rounded(c, 16, 20, 132, h - 40, 12); c.fill();
    c.fillStyle = '#7a1f3d'; c.font = `900 38px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TIN', 82, h / 2 - 18); c.fillText('NÓNG', 82, h / 2 + 18);
    c.fillStyle = '#ffffff'; kit.fitText(c, captionText, { x: 160, y: 10, w: w - 176, h: h - 20 }, { maxLines: 2, max: 76, font: SANS, weight: 800 });
  });
  const caption = mesh(keep(new THREE.PlaneGeometry(screen.width + .01, CAP_H - .004)), keep(new THREE.MeshStandardMaterial({ map: captionTex, roughness: .5, transparent: true, emissive: 0xffffff, emissiveMap: captionTex, emissiveIntensity: .85 })),
    [0, -screen.height / 2 - CAP_H / 2 - .001, .0015], false);
  caption.visible = false; tv.add(caption);
  const liveTex = tex(256, 80, (c, w, h) => {
    c.fillStyle = '#e5484d'; rounded(c, 2, 2, w - 4, h - 4, 14); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(34, h / 2, 12, 0, 7); c.fill();
    c.font = `900 40px ${SANS}`; c.textBaseline = 'middle'; c.fillText('TRỰC TIẾP', 58, h / 2 + 2);
  });
  const live = noHit(mesh(keep(new THREE.PlaneGeometry(.07, .022)), keep(new THREE.MeshBasicMaterial({ map: liveTex, transparent: true, toneMapped: false })), [-screen.width / 2 + .05, screen.height / 2 - .026, .0068], false));
  live.visible = false; tv.add(live);
  const tvLight = new THREE.PointLight(0xc4d8ff, 0, .8, 1.6); tvLight.position.set(0, 0, .1); tv.add(tvLight);
  const remote = box(.03, .006, .011, mat('#3a3341', { r: .5 }), [-UW / 2 + .05, CAB_TOP + .003, .02]); remote.rotation.y = .3; unit.add(remote);

  /* the pennants: a string across the bookshelf's top; each pennant hangs from it with a photo on, folded up until it unrolls */
  const PN = 4, sag = .026;
  const strAt = t => new THREE.Vector3(UNIT.x0 + .014 + (UW - .028) * t, FLOOR + UNIT.top + .008 - sag * 4 * t * (1 - t), WZ + SD + .016);
  const pennantTex = ['#ff8fab', '#ffd36e', '#8fd0bd', '#c5a3ff'].map(col => tex(256, 320, (c, w, h) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(6, 6); c.lineTo(w - 6, 6); c.lineTo(w - 6, h * .74); c.lineTo(w / 2, h - 6); c.lineTo(6, h * .74); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 6; c.setLineDash([12, 9]);
    c.beginPath(); c.moveTo(18, 18); c.lineTo(w - 18, 18); c.lineTo(w - 18, h * .72); c.lineTo(w / 2, h - 24); c.lineTo(18, h * .72); c.closePath(); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#ffffff'; kit.heartPath(c, w / 2, h * .86, 30); c.fill();
  }));
  const PW = .104, PH = PW * 1.25;
  const pennantGeo = keep(new THREE.PlaneGeometry(PW, PH)); pennantGeo.translate(0, -PH / 2, 0);
  const pennants = Array.from({ length: PN }, (_, i) => {
    const hang = new THREE.Group(); hang.position.copy(strAt((i + .5) / PN)).add(new THREE.Vector3(0, -.002, 0)); stage.add(hang);
    const flap = new THREE.Group(); hang.add(flap);
    flap.add(mesh(pennantGeo, keep(new THREE.MeshStandardMaterial({ map: pennantTex[i], roughness: .9, transparent: true, alphaTest: .5, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: pennantTex[i], emissiveIntensity: .2 })), [0, 0, 0], true));
    const ph = kit.photo({ frame: 'white', width: .088, aspect: 1, border: .05, slot: [1, 4, 6, 9][i], of: PLACES, glow: .4 });
    ph.root.position.set(0, -.011 - ph.height / 2, .003); flap.add(ph.root);
    hang.visible = false;
    return { hang, flap, photo: ph };
  });
  const pennantString = noHit(mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => strAt(i / 12))), 36, .0013, 4)), mat('#fff7ee', { r: .6 }), [0, 0, 0], false));
  pennantString.visible = false; stage.add(pennantString);
  const pins = [0, 1].map(s => { const p = ball(.0045, mat('#e8436d', { r: .5 }), strAt(s).toArray(), 8); p.visible = false; stage.add(p); return p; });

  /* ── the coffee table on the rug: Bố's mug; the cake comes here ── */
  const table = new THREE.Group(); table.position.set(TABLE.x, FLOOR, TABLE.z); stage.add(table);
  table.add(mesh(soft(TABLE.w, .01, TABLE.d, .004), mat('#c98f5c', { r: .5 }), [0, TABLE.top - .005, 0]));
  for (const x of [-1, 1]) for (const z of [-1, 1]) table.add(cyl(.0045, .0035, TABLE.top - .01, oak, [x * (TABLE.w / 2 - .014), (TABLE.top - .01) / 2, z * (TABLE.d / 2 - .012)], 8));
  table.add(box(TABLE.w - .03, .005, TABLE.d - .028, mat('#b37a48', { r: .6 }), [0, .022, 0]));
  ['#ff8fab', '#5aa39b', '#ffd36e'].forEach((col, i) => { const m = box(.05, .003, .036, mat(col, { r: .8 }), [-.03 + i * .03, .026 + i * .003, (i - 1) * .006]); m.rotation.y = (i - 1) * .25; table.add(m); });
  const mugTex = tex(256, 96, (c, w, h) => {
    c.fillStyle = '#fffaf3'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8436d'; c.font = `900 56px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BỐ', w * .3, h / 2 + 3);
    kit.heartPath(c, w * .52, h / 2, 30); c.fill(); c.fillStyle = '#ffd36e'; c.fillRect(0, h - 10, w, 10);
  });
  const mug = new THREE.Group(); mug.position.set(TABLE.w / 2 - .028, TABLE.top, -.018); mug.rotation.y = -.5; table.add(mug);
  mug.add(mesh(keep(new THREE.CylinderGeometry(.0095, .0095, .022, 18, 1, true)), painted(mugTex, { r: .4 }), [0, .011, 0]), cyl(.0095, .0095, .002, mat('#fffaf3', { r: .4 }), [0, .001, 0], 18),
    cyl(.0088, .0088, .001, mat('#6b3a1e', { r: .3 }), [0, .019, 0], 18), mesh(keep(new THREE.TorusGeometry(.006, .0016, 6, 12)), mat('#fffaf3', { r: .4 }), [.0105, .011, 0]));

  /* ── the briefcase: brown leather, a handle, brass clasps; its grip point at its origin, the case hanging below ── */
  const CASE = { w: .074, h: .046, d: .016, grip: .016 };            // grip: the handle's top (in the fist) over the case
  const briefcase = new THREE.Group();
  const leather = mat('#7a4428', { r: .55 }), leatherDark = mat('#5a301c', { r: .6 });
  briefcase.add(mesh(soft(CASE.w, CASE.h, CASE.d, .004), leather, [0, -CASE.grip - CASE.h / 2, 0]));
  briefcase.add(box(CASE.w + .001, .004, CASE.d + .001, leatherDark, [0, -CASE.grip - CASE.h * .22, 0]));
  for (const s of [-1, 1]) briefcase.add(box(.008, .007, CASE.d + .002, brass, [s * .02, -CASE.grip - .006, 0]));
  briefcase.add(mesh(keep(new THREE.TorusGeometry(CASE.grip - .002, .0024, 6, 14, Math.PI)), leatherDark, [0, -CASE.grip + .002, 0]));
  stage.add(briefcase);

  /* ── fairy lights along the top of the wall, for the party ── */
  const fairy = [];
  const fairyAt = t => new THREE.Vector3(WALL.x0 + .03 + (WW - .06) * t, WALL.h - .03 - .028 * Math.abs(Math.sin(t * Math.PI * 6)), WZ + .008);
  stage.add(noHit(mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 57 }, (_, i) => fairyAt(i / 56))), 160, .001, 4)), mat('#2b2440', { r: .6 }), [0, 0, 0], false)));
  for (let i = 0; i < 22; i++) {
    const p = fairyAt((i + .5) / 22).add(new THREE.Vector3(0, -.006, .002)), col = ['#ffd36e', '#ff8fab', '#8fd0bd', '#c5a3ff'][i % 4];
    const m = own('#fff6e0', { e: col, ei: 0 });
    const b = ball(.0055, m, p.toArray(), 10); b.castShadow = false; stage.add(b);
    const g = kit.glow({ color: col, size: .05, opacity: 0 }); g.position.copy(p); stage.add(g);
    fairy.push({ set(k) { m.emissiveIntensity = 2 * k; g.material.opacity = .9 * k; } });
  }

  /* ── the disco ball: down from the ceiling on its cord, spots of colour that run over the wall and the floor ── */
  const disco = new THREE.Group(); stage.add(disco);
  const DISCO_R = .044;
  const discoTiles = tex(512, 256, c => {                               // a mirror ball: small squares of light and dark
    const r = seeded(5);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 32; i++) {
      const v = 150 + r() * 105 | 0; c.fillStyle = r() < .12 ? ['#ffd1dc', '#c9f0ff', '#fff1b8'][(r() * 3) | 0] : `rgb(${v},${v},${v + 8})`;
      c.fillRect(i * 16 + 1, j * 16 + 1, 14, 14);
    }
  });
  const discoMat = keep(new THREE.MeshStandardMaterial({ map: discoTiles, roughness: .15, metalness: .9, emissive: 0xffffff, emissiveMap: discoTiles, emissiveIntensity: .35 }));
  discoMat.envMap = kit.env; discoMat.envMapIntensity = 1.4;
  const discoBall = mesh(keep(new THREE.SphereGeometry(DISCO_R, 24, 16)), discoMat, [0, 0, 0]); disco.add(discoBall);
  disco.add(cyl(.006, .006, .008, mat('#c9ced8', { r: .3, m: .8 }), [0, DISCO_R + .003, 0], 10), cyl(.0011, .0011, 1.2, mat('#c9ced8', { r: .4, m: .6 }), [0, DISCO_R + .6, 0], 4));
  const discoGlow = kit.glow({ color: 0xfff4fa, size: .13, opacity: 0 }); disco.add(discoGlow);
  disco.visible = false;
  const discoSpot = tex(64, 64, (c, w) => {                             // a spot from a mirror tile: bright, with a crisp edge
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.62, 'rgba(255,255,255,.95)'); g.addColorStop(.8, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, w);
  });
  const spotMat = col => keep(new THREE.MeshBasicMaterial({ map: discoSpot, color: col, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 }));
  const spotGeo = keep(new THREE.CircleGeometry(.5, 16));
  const rs = seeded(2024), SPOT_COLS = ['#ff5f9e', '#ffc94a', '#4fd8ff', '#a77bff', '#5dff9c'];
  const spots = Array.from({ length: 64 }, (_, i) => {
    const y = -.9 + rs() * 1.3, a = rs() * Math.PI * 2, r = Math.sqrt(1 - y * y);    // a direction from the ball, mostly down and round
    const m = noHit(new THREE.Mesh(spotGeo, spotMat(SPOT_COLS[i % SPOT_COLS.length]))); m.renderOrder = 4; m.visible = false; stage.add(m);
    return { dir: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), size: .02 + rs() * .016, mesh: m };
  });
  const vRay = new THREE.Vector3(), vHit = new THREE.Vector3();
  /** the ball at `at` (shown or not), turned `spin`, its spots at strength k: each where its ray meets the wall or the floor */
  function discoAt(at, spin, k, shown) {
    disco.visible = shown; disco.position.copy(at); discoBall.rotation.y = spin;
    discoGlow.material.opacity = .55 * k;
    for (const s of spots) {
      vRay.copy(s.dir).applyAxisAngle(UP, spin);
      let hit = false, onWall = false;
      if (vRay.z < -.05) {
        const t = (WZ + .0015 - at.z) / vRay.z; vHit.copy(at).addScaledVector(vRay, t);
        if (vHit.y > FLOOR && vHit.y < WALL.h && vHit.x > WALL.x0 && vHit.x < WALL.x1) hit = onWall = true;
      }
      if (!hit && vRay.y < -.05) {
        const t = (FLOOR + .0015 - at.y) / vRay.y; vHit.copy(at).addScaledVector(vRay, t);
        if (Math.abs(vHit.x) < FX && vHit.z > WZ && vHit.z < FZ1) hit = true;
      }
      s.mesh.visible = hit && k > .01;
      if (!s.mesh.visible) continue;
      s.mesh.position.copy(vHit);
      s.mesh.rotation.set(onWall ? 0 : -Math.PI / 2, 0, 0);
      const d = vHit.distanceTo(at), stretch = onWall ? 1 : 1 / Math.max(.35, Math.abs(vRay.y));
      s.mesh.scale.set(s.size * d * 2.2, s.size * d * 2.2 * stretch, 1);
      s.mesh.material.opacity = (onWall ? 1 : .8) * k;
    }
  }
  const discoLights = [new THREE.PointLight(0xff6fa8, 0, 1.2, 1.4), new THREE.PointLight(0x6fe0ff, 0, 1.2, 1.4)];
  discoLights.forEach(l => stage.add(l));

  /* ── the cake: three tiers on a stand, candles whose flames light (set(k)) and go out ── */
  const cake = new THREE.Group(); cake.position.set(TABLE.x - .012, FLOOR + TABLE.top, TABLE.z + .002); stage.add(cake);
  const frosting = (base, dot) => tex(512, 64, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff6ec'; for (let x = 8; x < w; x += 22) { c.beginPath(); c.arc(x, 8, 7, 0, 7); c.fill(); c.beginPath(); c.arc(x + 11, h - 7, 6, 0, 7); c.fill(); }
    c.fillStyle = dot; for (let x = 14; x < w; x += 44) { c.beginPath(); c.arc(x, h / 2, 4, 0, 7); c.fill(); }
  });
  const icing = mat('#fff6ec', { r: .6, e: '#fff6ec', ei: .15 }), china = mat('#ffffff', { r: .25, m: .2 });
  cake.add(cyl(.05, .05, .004, china, [0, .018, 0], 32), cyl(.006, .012, .016, china, [0, .008, 0], 16), cyl(.022, .024, .002, china, [0, .001, 0], 20));
  const TIERS = [[.044, .032, '#f39ab6', '#ffd36e'], [.033, .028, '#fff6ec', '#e8436d'], [.022, .024, '#8fd0bd', '#fff6ec']];
  let ty = .02;
  for (const [r, h, base, dot] of TIERS) {
    cake.add(mesh(keep(new THREE.CylinderGeometry(r, r, h, 32)), [painted(frosting(base, dot), { r: .7, glow: .25 }), mat(base, { r: .6, e: base, ei: .25 }), icing], [0, ty + h / 2, 0]));
    ty += h;
  }
  const CAKE_TOP = ty;
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, b = ball(.0055, mat('#e5484d', { r: .4 }), [Math.cos(a) * .038, .054, Math.sin(a) * .038], 10); b.castShadow = false; cake.add(b); }
  const topperTex = tex(256, 96, (c, w, h) => { c.fillStyle = '#ffd36e'; c.font = `900 72px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = '#7a1f3d'; c.lineWidth = 10; c.strokeText('BỐ', w / 2, h / 2 + 4); c.fillText('BỐ', w / 2, h / 2 + 4); });
  cake.add(mesh(keep(new THREE.PlaneGeometry(.04, .015)), keep(new THREE.MeshStandardMaterial({ map: topperTex, transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .4, metalness: .3 })), [0, CAKE_TOP + .02, -.008], false),
    cyl(.0008, .0008, .014, mat('#ffd36e'), [-.012, CAKE_TOP + .006, -.008], 4), cyl(.0008, .0008, .014, mat('#ffd36e'), [.012, CAKE_TOP + .006, -.008], 4));
  const stripes = tex(32, 128, (c, w, h) => { c.fillStyle = '#fffaf2'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3d6ea8'; c.lineWidth = 7; for (let y = -w; y < h + w; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 16); c.stroke(); } });
  const candleMat = painted(stripes, { r: .5 });
  const flames = Array.from({ length: 5 }, (_, i) => {
    const a = i / 5 * Math.PI * 2 + .6, x = Math.cos(a) * .014, z = Math.sin(a) * .014 + .002;
    cake.add(cyl(.0022, .0022, .02, candleMat, [x, CAKE_TOP + .01, z], 10), cyl(.0005, .0005, .004, mat('#2b2033'), [x, CAKE_TOP + .022, z], 4));
    const f = new THREE.Group(); f.position.set(x, CAKE_TOP + .027, z); cake.add(f);
    const body = ball(.0032, own('#ffe9a8', { e: 0xffa23c, ei: 2.2 }), [0, 0, 0], 10); body.scale.set(1, 1.9, 1); body.castShadow = false; f.add(body);
    const glow = kit.glow({ color: 0xffb35c, size: .034, opacity: 0 }); f.add(glow);
    return { at: new THREE.Vector3(x, CAKE_TOP + .027, z), set(k, T = 0) {
      const fl = 1 + .12 * Math.sin(T * 23 + i * 2) + .06 * Math.sin(T * 41 + i);
      f.visible = k > .01; body.scale.set(k, 1.9 * k * fl, k); glow.material.opacity = .75 * k; f.rotation.z = .08 * Math.sin(T * 7 + i) * k;
    } };
  });
  const candleLight = new THREE.PointLight(0xffb066, 0, .6, 1.6); candleLight.position.set(0, CAKE_TOP + .06, 0); cake.add(candleLight);
  cake.visible = false;

  /* ── the trophy: a gold cup with the first photo on it, on a plinth with a plate ── */
  const trophy = new THREE.Group(); trophy.position.set(TROPHY.x, FLOOR, TROPHY.z); trophy.visible = false; stage.add(trophy);
  const goldOf = side => { const m = keep(new THREE.MeshStandardMaterial({ color: '#f4c24a', roughness: .22, metalness: .85, emissive: '#7a4a00', emissiveIntensity: .25, side })); m.envMap = kit.env; m.envMapIntensity = 1.5; return m; };
  const gold = goldOf(THREE.FrontSide);
  const plinthMat = mat('#4a2a3a', { r: .45 });
  const PLINTH = { w: .22, h: .074, d: .1 };
  trophy.add(mesh(soft(PLINTH.w, PLINTH.h, PLINTH.d, .006), plinthMat, [0, PLINTH.h / 2, 0]), mesh(soft(PLINTH.w - .03, .014, PLINTH.d - .02, .004), plinthMat, [0, PLINTH.h + .007, 0]));
  const plateText = kit.words('plate', 'Bố tuyệt nhất');
  const plateTex = tex(768, 192, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#fff1b8'); g.addColorStop(.5, '#f4c24a'); g.addColorStop(1, '#d99a2a');
    c.fillStyle = g; rounded(c, 4, 4, w - 8, h - 8, 22); c.fill(); c.strokeStyle = '#8a5a10'; c.lineWidth = 6; rounded(c, 18, 18, w - 36, h - 36, 14); c.stroke();
    c.fillStyle = '#5a2a10'; kit.fitText(c, plateText, { x: 40, y: 22, w: w - 80, h: h - 44 }, { maxLines: 1, max: 120, font: SANS, weight: 900 });
  });
  const plate = mesh(keep(new THREE.PlaneGeometry(PLINTH.w - .016, (PLINTH.w - .016) / 4)), keep(new THREE.MeshStandardMaterial({ map: plateTex, roughness: .3, metalness: .5, emissive: 0xffffff, emissiveMap: plateTex, emissiveIntensity: .45 })), [0, PLINTH.h / 2, PLINTH.d / 2 + .0015], false);
  plate.material.envMap = kit.env; trophy.add(plate);
  const STEM_Y = PLINTH.h + .014;
  trophy.add(mesh(keep(new THREE.CylinderGeometry(.026, .04, .016, 28)), gold, [0, STEM_Y + .008, 0]), mesh(keep(new THREE.CylinderGeometry(.009, .014, .04, 18)), gold, [0, STEM_Y + .036, 0]),
    mesh(keep(new THREE.SphereGeometry(.016, 18, 12)), gold, [0, STEM_Y + .05, 0]));
  const CUP_Y = STEM_Y + .058, CUP_R = .142, CUP_H = .2;
  const cupPts = [[.012, 0], [.06, .012], [.1, .035], [.126, .07], [.138, .118], [CUP_R, .165], [CUP_R + .009, CUP_H], [CUP_R + .002, CUP_H + .005], [CUP_R - .007, CUP_H - .002]].map(([x, y]) => new THREE.Vector2(x, y));
  const cupGeo = keep(new THREE.LatheGeometry(cupPts, 40)); cupGeo.scale(1, 1, .5);   // a flattened cup, so its photo face is wide
  trophy.add(mesh(cupGeo, goldOf(THREE.DoubleSide), [0, CUP_Y, 0]));
  for (const s of [-1, 1]) {
    const h = mesh(keep(new THREE.TorusGeometry(.058, .009, 10, 24, Math.PI * 1.1)), gold, [s * (CUP_R + .012), CUP_Y + .118, 0]);
    h.rotation.z = s > 0 ? -Math.PI * .55 : Math.PI * 1.45; trophy.add(h);
  }
  const HERO_W = .24, HERO_Y = CUP_Y + .118;
  const hero = kit.photo({ hero: true, frame: 'none', width: HERO_W, aspect: 1, glow: .6 });
  hero.material.alphaMap = kit.canvasTexture(256, 256, (c, w) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, w); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, w / 2, w * .49, 0, 7); c.fill(); });
  hero.material.alphaTest = .5; hero.material.needsUpdate = true;
  hero.face.material.forEach((m, i) => { if (i !== 4) m.visible = false; });
  hero.root.position.set(0, HERO_Y, CUP_R * .5 + .014); trophy.add(hero.root);
  trophy.add(noHit(mesh(keep(new THREE.TorusGeometry(HERO_W / 2 + .004, .007, 10, 48)), gold, [0, HERO_Y, CUP_R * .5 + .014])));
  const starMat = own('#fff6d0', { r: .3, e: 0xffe08a, ei: .6 });
  const starShape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? .008 : .019, a = Math.PI / 2 + i * Math.PI / 5; starShape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  trophy.add(noHit(mesh(keep(new THREE.ExtrudeGeometry(starShape, { depth: .004, bevelEnabled: true, bevelThickness: .0015, bevelSize: .0015, bevelSegments: 1 })), starMat, [0, CUP_Y + CUP_H + .028, 0])));
  const trophyHalo = kit.glow({ color: 0xffe08a, size: .62, opacity: 0 }); trophyHalo.position.set(0, HERO_Y, -.03); trophy.add(trophyHalo);

  /* ── which way the phone is: the trophy turns its photo to it ── */
  let camera = null;
  const probe = new THREE.Mesh(keep(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3))),
    keep(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false })));
  probe.frustumCulled = false; probe.raycast = () => {}; probe.onBeforeRender = (r, s, cam) => { camera = cam; }; stage.add(probe);
  const camAt = new THREE.Vector3();
  /** the yaw that turns something at (x, z) on the stage to the phone (0: facing +z) */
  const yawToPhone = (x, z, fallback = 0) => {
    if (!camera) return fallback;
    camera.getWorldPosition(camAt); stage.worldToLocal(camAt);
    return Math.atan2(camAt.x - x, camAt.z - z);
  };

  return {
    FLOOR, WZ, SWITCH, TABLE, TROPHY, CASE, DOOR,
    door, toggle, led, hallLight,
    lamp: { light: lampLight, glow: lampGlow, pool }, fairy,
    frames, pennants, pennantString, pins,
    tv: { off: tvOff, flash: tvFlash, caption, live, light: tvLight },
    briefcase, disco: { at: discoAt, lights: discoLights }, cake: { root: cake, flames, light: candleLight },
    trophy: { root: trophy, halo: trophyHalo, star: starMat },
    yawToPhone
  };
};
