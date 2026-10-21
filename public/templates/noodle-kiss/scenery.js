/* Chung một sợi mì: the alley and its little trattoria, built in code for story.js (template.json "story" loads this file
   first). The back wall of an alley at night (a painted page: two old houses, the trattoria's arched door, a lantern, a
   window with shutters and geraniums, rooftops and stars), a lit copy of it that comes up with the string lights, the
   doorway cut through both to a warm room behind and a door that swings open, cobbles on the card, the string lights,
   a bistro table under a red-and-white checked cloth, a candle in a bottle, a big plate of spaghetti with meatballs, two
   forks, a chalkboard menu on an easel, a picture frame and the lights the last banner hangs from; and the pair's new
   clothes. The story places and times them; nothing here moves by itself.
     NM_NOODLE.scenery(kit, layout) → the builders; layout: { WALL, DOOR, WIN, TABLE } */
(window.NM_NOODLE = window.NM_NOODLE || {}).scenery = (kit, { WALL, DOOR, WIN, TABLE }) => {
  const { THREE, stage, clamp } = kit;
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const geo = g => kit.keep(g);
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .7, ...o }));
  function mesh(g, m, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(geo(g), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o;
  }
  const texture = (w, h, draw, o = {}) => {
    const t = kit.canvasTexture(w, h, draw);
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.repeat); }
    return t;
  };
  /** where the wall stands at x (its ends come forward), and the turn that lays something flat on it there */
  const wallZ = x => WALL.z + WALL.curve * (x / (WALL.width / 2)) ** 2;
  const wallTurn = x => -Math.atan(2 * WALL.curve * x / (WALL.width / 2) ** 2);
  /** the string lights' wire at x, on the swag from hook a to hook b; the bulbs hang evenly along each swag */
  const swagY = (x, a, b) => { const k = (x - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k - WALL.sag * 4 * k * (1 - k); };
  const BULBS = [];
  for (let i = 0; i < WALL.hooks.length - 1; i++) {
    const a = WALL.hooks[i], b = WALL.hooks[i + 1];
    for (let j = 0; j < WALL.perSwag; j++) { const x = a[0] + (b[0] - a[0]) * (j + .5) / WALL.perSwag; BULBS.push([x, swagY(x, a, b) - .012]); }
  }

  /* ── new clothes: the palette textures' swatches recoloured, some parts moved onto other swatches ── */
  const cell = (cx, cy) => ({ cx, cy });
  /** moves the UV islands of `mesh` in swatch `from` onto swatch `to`; keep(x, y, z) picks triangles by their middle
      (model units), so a strap stays where a belt goes */
  function remap(mesh, from, to, keep = () => true) {
    const g = mesh?.geometry, uv = g?.attributes.uv, pos = g?.attributes.position; if (!uv) return;
    const idx = g.index, n = idx ? idx.count : uv.count, move = new Set(), v = [0, 0, 0];
    for (let i = 0; i < n; i += 3) {                                   // which corners first: moving them as we go would move
      for (let k = 0; k < 3; k++) v[k] = idx ? idx.getX(i + k) : i + k;   // the next triangle's middle out of the swatch
      const u0 = (uv.getX(v[0]) + uv.getX(v[1]) + uv.getX(v[2])) / 3, v0 = (uv.getY(v[0]) + uv.getY(v[1]) + uv.getY(v[2])) / 3;
      if (Math.floor(u0 * 8) !== from.cx || Math.floor(v0 * 4) !== from.cy) continue;
      const mid = k => (pos[k](v[0]) + pos[k](v[1]) + pos[k](v[2])) / 3;
      if (keep(mid('getX'), mid('getY'), mid('getZ'))) v.forEach(j => move.add(j));
    }
    move.forEach(j => uv.setXY(j, uv.getX(j) + (to.cx - from.cx) / 8, uv.getY(j) + (to.cy - from.cy) / 4));
    uv.needsUpdate = true;
  }
  /** a material's palette with swatches recoloured ({ 'cx,cy': '#rrggbb' } on an 8 x 4 grid): each keeps its shading */
  function repaint(material, colours) {
    const img = material?.map?.image; if (!img || !img.width) return;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0);
    const w = img.width / 8, h = img.height / 4, lum = (p, i) => p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11;
    for (const [key, hex] of Object.entries(colours)) {
      const [cx, cy] = key.split(',').map(Number), d = c.getImageData(cx * w, cy * h, w, h), p = d.data;
      let mean = 0; for (let i = 0; i < p.length; i += 4) mean += lum(p, i);
      mean /= p.length / 4;
      const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      for (let i = 0; i < p.length; i += 4) { const k = lum(p, i) / (mean || 1); for (let j = 0; j < 3; j++) p[i + j] = Math.min(255, rgb[j] * k); }
      c.putImageData(d, cx * w, cy * h);
    }
    const old = material.map, t = kit.keep(new THREE.CanvasTexture(cv));
    t.colorSpace = old.colorSpace; t.flipY = old.flipY; t.wrapS = old.wrapS; t.wrapT = old.wrapT;
    t.magFilter = old.magFilter; t.minFilter = old.minFilter; t.anisotropy = 4;
    material.map = t; material.needsUpdate = true; old.dispose();
  }
  /* he: dark hair (his bald scalp moved onto the beard's swatch), a dark beard, a white shirt, a red strap, dark trousers */
  function dressBoy(m) {
    const skin = cell(0, 0), white = cell(2, 1), trousers = cell(7, 1);
    remap(m.node('Barbarian_Head'), skin, cell(1, 0), (x, y, z) => {
      const side = clamp((Math.abs(x) - .28) / .18), back = clamp((.05 - z) / .3), ear = Math.abs(x) > .45 && y < 1.86 && z > -.22 && z < .2;
      return !ear && y > 1.93 - .2 * side - .5 * back;               // the hairline: high over the brow, low at the nape
    });
    for (const arm of ['Barbarian_ArmLeft', 'Barbarian_ArmRight']) {
      remap(m.node(arm), cell(7, 2), skin); remap(m.node(arm), cell(6, 0), white); remap(m.node(arm), cell(3, 0), white);   // bare hands, shirt cuffs
    }
    for (const leg of ['Barbarian_LegLeft', 'Barbarian_LegRight']) { remap(m.node(leg), white, trousers); remap(m.node(leg), cell(6, 0), trousers); }
    remap(m.node('Barbarian_Body'), cell(6, 0), trousers, (x, y) => y < .78);   // the leather belt: trousers; the strap stays
    remap(m.node('Barbarian_Body'), cell(7, 0), white);
    repaint(m.node('Barbarian_Body')?.material, { '1,0': '#4a2a1c', '0,1': '#f3efe6', '1,1': '#ebe6dc', '2,1': '#ffffff', '6,0': '#d02a3a',
      '7,1': '#3b3a48', '3,2': '#4a2d1f', '3,0': '#e6b54a' });
  }
  /* she: chestnut hair, a wine-red dress with a white collar, dark tights, red shoes */
  function dressGirl(m) {
    const skin = cell(0, 0);
    for (const arm of ['Rogue_ArmLeft', 'Rogue_ArmRight']) { remap(m.node(arm), cell(5, 2), skin); remap(m.node(arm), cell(5, 0), cell(1, 1)); }
    for (const leg of ['Rogue_LegLeft', 'Rogue_LegRight']) remap(m.node(leg), skin, cell(7, 1));
    remap(m.node('Rogue_Body'), cell(7, 1), cell(0, 1));                 // her shorts: the dress
    repaint(m.node('Rogue_Body')?.material, { '1,0': '#4f2a1c', '0,1': '#7c1632', '1,1': '#fff1e4', '6,0': '#5a1424', '5,0': '#5a1424',
      '7,1': '#2c2632', '3,2': '#7a1a30', '3,0': '#e9b949' });
  }
  /* the chairs: walnut seats on black iron legs (the kitchen pack's orange and grey) */
  const dressChair = m => m.scene && m.scene.traverse(o => { if (o.isMesh) repaint(o.material, { '6,3': '#8a5634', '3,0': '#34303a' }); });

  /* ── the wall: a painted page at the card's back edge ── */
  const PX = 1024 / WALL.width, WH = Math.round(1024 * WALL.height / WALL.width);
  const X = x => (x + WALL.width / 2) * PX, Y = y => WH - y * PX;     // a stage point on the page's canvas
  const ROOF = .64, SPLIT = .13;                                     // the cornice; where the trattoria meets the pink house
  /** the doorway's outline: straight sides, a round top */
  function doorPath(c, grow = 0) {
    const l = X(DOOR.x - DOOR.w / 2) - grow, rr = X(DOOR.x + DOOR.w / 2) + grow, R = (rr - l) / 2, top = Y(DOOR.h) - grow;
    c.beginPath(); c.moveTo(l, Y(0) + 2); c.lineTo(l, top + R); c.arc((l + rr) / 2, top + R, R, Math.PI, 0); c.lineTo(rr, Y(0) + 2); c.closePath();
  }
  /** a patch where the plaster fell off: bricks */
  function bricks(c, x, y, w, h, r) {
    c.save(); c.beginPath();
    for (let i = 0; i <= 14; i++) { const a = i / 14 * TAU, k = .75 + r() * .35; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * w * k, y + Math.sin(a) * h * k); }
    c.closePath(); c.fillStyle = '#9b5a43'; c.fill(); c.clip();
    for (let row = 0, by = y - h * 1.2; by < y + h * 1.2; by += 15, row++) {
      for (let bx = x - w * 1.3 - (row % 2) * 17; bx < x + w * 1.3; bx += 34) {
        c.fillStyle = ['#b9654a', '#a5533d', '#c4785a', '#9a4b37'][(r() * 4) | 0]; c.fillRect(bx + 1.5, by + 1.5, 31, 12);
      }
    }
    c.restore();
    c.strokeStyle = 'rgba(80,45,35,.6)'; c.lineWidth = 2; c.stroke();
  }
  function paintWall(c, w, h, lit) {
    const r = seeded(77);
    /* the sky over the roofs, stars and a thin moon */
    const sky = c.createLinearGradient(0, 0, 0, Y(ROOF));
    sky.addColorStop(0, '#0c1130'); sky.addColorStop(1, '#2c2d62');
    c.fillStyle = sky; c.fillRect(0, 0, w, Y(ROOF) + 4);
    for (let i = 0; i < 60; i++) {
      c.fillStyle = `rgba(255,${235 + (r() * 20) | 0},${205 + (r() * 50) | 0},${.45 + r() * .55})`;
      c.beginPath(); c.arc(r() * w, r() * (Y(ROOF) - 30), .7 + r() * 1.6, 0, TAU); c.fill();
    }
    c.fillStyle = '#fff1c2'; c.beginPath(); c.arc(X(.36), 36, 19, 0, TAU); c.fill();
    c.fillStyle = '#18204a'; c.beginPath(); c.arc(X(.36) + 9, 30, 17, 0, TAU); c.fill();
    /* two old houses: the ochre trattoria and a pink house, mottled plaster */
    const houses = [[0, X(SPLIT), Y(ROOF), '#eab47c'], [X(SPLIT), w, Y(ROOF + .03), '#e8a08f']];
    for (const [x0, x1, top, base] of houses) {
      c.fillStyle = base; c.fillRect(x0, top, x1 - x0, h - top);
      c.save(); c.beginPath(); c.rect(x0, top, x1 - x0, h - top); c.clip();
      for (let i = 0; i < 46; i++) {                                     // blotches of older paint
        const bx = x0 + r() * (x1 - x0), by = top + r() * (h - top), s = 20 + r() * 70;
        c.fillStyle = r() < .5 ? 'rgba(255,240,215,.16)' : 'rgba(150,85,60,.13)';
        c.beginPath(); c.ellipse(bx, by, s, s * (.5 + r() * .5), r() * 3, 0, TAU); c.fill();
      }
      const damp = c.createLinearGradient(0, h - 120, 0, h);              // damp at the foot of the wall
      damp.addColorStop(0, 'rgba(90,50,40,0)'); damp.addColorStop(1, 'rgba(90,50,40,.35)');
      c.fillStyle = damp; c.fillRect(x0, h - 120, x1 - x0, 120);
      c.restore();
    }
    bricks(c, X(-.47), Y(.5), 42, 30, r); bricks(c, X(-.08), Y(.16), 30, 20, r); bricks(c, X(.47), Y(.2), 36, 26, r); bricks(c, X(.2), Y(.6), 28, 16, r);
    c.strokeStyle = 'rgba(95,55,40,.55)'; c.lineWidth = 1.6;            // hairline cracks
    for (const [x, y, n] of [[-.24, .62, 5], [.05, .3, 4], [.42, .47, 4], [-.5, .2, 3]]) {
      c.beginPath(); let px = X(x), py = Y(y); c.moveTo(px, py);
      for (let i = 0; i < n; i++) { px += (r() - .5) * 26; py += 10 + r() * 16; c.lineTo(px, py); }
      c.stroke();
    }
    /* the cornice and the roof tiles' edge, a chimney on the trattoria */
    for (const [x0, x1, y] of [[0, X(SPLIT), ROOF], [X(SPLIT), w, ROOF + .03]]) {
      c.fillStyle = '#c98d63'; c.fillRect(x0, Y(y) - 2, x1 - x0, 12); c.fillStyle = 'rgba(70,35,30,.5)'; c.fillRect(x0, Y(y) + 10, x1 - x0, 6);
      for (let x = x0 - 10; x < x1 + 10; x += 22) {
        c.fillStyle = ['#b8452f', '#c9573a', '#a93d2b'][(r() * 3) | 0];
        c.beginPath(); c.ellipse(x + 11, Y(y) - 8, 12, 13, 0, Math.PI, 0); c.fill();
        c.strokeStyle = 'rgba(60,20,15,.55)'; c.lineWidth = 2; c.stroke();
      }
    }
    c.fillStyle = '#b27357'; c.fillRect(X(-.4), Y(ROOF + .1), 34, 50); c.fillStyle = '#7b4a3a'; c.fillRect(X(-.4) - 5, Y(ROOF + .1) - 6, 44, 10);
    /* a stone plinth along the foot of the wall */
    for (let x = -6, i = 0; x < w; i++) { const sw = 40 + r() * 46; c.fillStyle = ['#a99a8e', '#9b8c82', '#b5a79b'][i % 3]; c.fillRect(x + 2, Y(.042), sw - 3, Y(0) - Y(.042)); x += sw; }
    c.fillStyle = 'rgba(60,40,35,.35)'; c.fillRect(0, Y(.042) - 3, w, 4);
    /* the drainpipe between the houses */
    c.fillStyle = '#6f7f86'; c.fillRect(X(SPLIT) - 7, Y(ROOF + .02), 14, Y(0) - Y(ROOF + .02));
    for (const y of [.12, .32, .52]) { c.fillStyle = '#4b585e'; c.fillRect(X(SPLIT) - 10, Y(y), 20, 6); }
    /* the doorway: a stone arch round it, a step, the shop's sign and the house number */
    c.save(); doorPath(c, 18); c.fillStyle = '#d8c7b2'; c.fill(); c.restore();
    c.strokeStyle = 'rgba(90,70,60,.6)'; c.lineWidth = 2;
    const dl = X(DOOR.x - DOOR.w / 2), dr = X(DOOR.x + DOOR.w / 2), dR = (dr - dl) / 2, dTop = Y(DOOR.h) + dR, dmx = (dl + dr) / 2;
    for (let i = 0; i <= 8; i++) {                                       // the arch's stones
      const a = Math.PI + i / 8 * Math.PI; c.beginPath(); c.moveTo(dmx + Math.cos(a) * dR, dTop + Math.sin(a) * dR); c.lineTo(dmx + Math.cos(a) * (dR + 18), dTop + Math.sin(a) * (dR + 18)); c.stroke();
    }
    for (let y = dTop; y < Y(0); y += 30) for (const x of [dl - 18, dr]) c.strokeRect(x, y, 18, 30);
    c.fillStyle = '#2f4a36'; c.fillRect(dmx - 70, Y(DOOR.h + .1), 140, 40); c.strokeStyle = '#e8c56a'; c.lineWidth = 3; c.strokeRect(dmx - 64, Y(DOOR.h + .1) + 6, 128, 28);
    c.fillStyle = '#fff3d6'; c.font = '700 26px "Dancing Script", cursive'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Quán Mì Ý', dmx, Y(DOOR.h + .1) + 21);
    c.fillStyle = '#3d5a8c'; c.beginPath(); c.arc(dr + 52, Y(.27), 13, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.font = '700 17px sans-serif'; c.fillText('2', dr + 52, Y(.27) + 1);
    /* the lantern by the door */
    const lx = X(DOOR.x + DOOR.w / 2 + .08), ly = Y(.36);
    c.strokeStyle = '#2a2326'; c.lineWidth = 4; c.beginPath(); c.moveTo(lx - 22, ly - 26); c.lineTo(lx, ly - 26); c.lineTo(lx, ly - 18); c.stroke();
    c.fillStyle = '#2a2326'; c.fillRect(lx - 12, ly - 18, 24, 6); c.fillRect(lx - 10, ly + 14, 20, 5);
    c.fillStyle = lit ? '#ffd27a' : '#55607f'; c.fillRect(lx - 9, ly - 12, 18, 26);
    c.strokeStyle = '#2a2326'; c.lineWidth = 2; c.strokeRect(lx - 9, ly - 12, 18, 26); c.beginPath(); c.moveTo(lx, ly - 12); c.lineTo(lx, ly + 14); c.stroke();
    /* the window: shutters open, a sill, geraniums */
    const wx = X(WIN.x), wy = Y(WIN.y), ww = WIN.w * PX, wh = WIN.h * PX;
    c.fillStyle = '#d9c4ae'; c.fillRect(wx - ww / 2 - 9, wy - wh / 2 - 9, ww + 18, wh + 18);
    const glass = c.createLinearGradient(0, wy - wh / 2, 0, wy + wh / 2);
    if (lit) { glass.addColorStop(0, '#ffe7a6'); glass.addColorStop(1, '#ffb45a'); } else { glass.addColorStop(0, '#3a4677'); glass.addColorStop(1, '#232b52'); }
    c.fillStyle = glass; c.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
    if (lit) {                                                          // a curtain and a little plant inside
      c.fillStyle = 'rgba(200,90,70,.45)'; c.beginPath(); c.moveTo(wx - ww / 2, wy - wh / 2); c.quadraticCurveTo(wx - ww * .1, wy, wx - ww / 2 + 8, wy + wh / 2); c.lineTo(wx - ww / 2, wy + wh / 2); c.fill();
      c.fillStyle = 'rgba(120,70,40,.5)'; c.beginPath(); c.arc(wx + ww * .22, wy + wh * .2, 16, 0, TAU); c.fill();
    }
    c.strokeStyle = '#f4ead9'; c.lineWidth = 6; c.strokeRect(wx - ww / 2, wy - wh / 2, ww, wh);
    c.beginPath(); c.moveTo(wx, wy - wh / 2); c.lineTo(wx, wy + wh / 2); c.moveTo(wx - ww / 2, wy); c.lineTo(wx + ww / 2, wy); c.stroke();
    for (const s of [-1, 1]) {                                           // louvred green shutters
      const sx = wx + s * (ww / 2 + 9) + (s < 0 ? -ww * .48 : 0);
      c.fillStyle = '#3f7a5a'; c.fillRect(sx, wy - wh / 2 - 6, ww * .48, wh + 12);
      c.strokeStyle = '#2b5a40'; c.lineWidth = 2.5; for (let y = wy - wh / 2; y < wy + wh / 2 + 4; y += 9) { c.beginPath(); c.moveTo(sx + 4, y); c.lineTo(sx + ww * .48 - 4, y); c.stroke(); }
    }
    c.fillStyle = '#cdb8a2'; c.fillRect(wx - ww / 2 - 16, wy + wh / 2 + 8, ww + 32, 9);
    c.fillStyle = '#9b5a34'; c.fillRect(wx - ww / 2 - 6, wy + wh / 2 + 17, ww + 12, 26);
    for (let i = 0; i < 26; i++) {                                       // leaves and red flowers over the box
      const fx = wx - ww / 2 + r() * ww, fy = wy + wh / 2 + 6 + r() * 16;
      c.fillStyle = r() < .55 ? ['#3f8a45', '#2f6e38', '#4fa052'][(r() * 3) | 0] : ['#e8303f', '#ff5a5f', '#c81d35'][(r() * 3) | 0];
      c.beginPath(); c.arc(fx, fy, 5 + r() * 6, 0, TAU); c.fill();
    }
    for (let i = 0; i < 4; i++) { c.strokeStyle = '#3f8a45'; c.lineWidth = 3; c.beginPath(); const fx = wx - ww / 2 + 10 + i * ww / 3.2; c.moveTo(fx, wy + wh / 2 + 40); c.quadraticCurveTo(fx + 8, wy + wh / 2 + 70, fx - 4, wy + wh / 2 + 92 + r() * 20); c.stroke(); }
    /* ivy up the left edge, and a potted lemon tree at the pink house's foot */
    for (let i = 0; i < 40; i++) {
      const t = i / 40, fx = 12 + Math.sin(t * 9) * 14 + r() * 22, fy = h - 30 - t * (h - Y(ROOF) - 40);
      c.fillStyle = ['#3f8a45', '#2f6e38', '#5aa95a'][(r() * 3) | 0]; c.beginPath(); c.ellipse(fx, fy, 9, 6, r() * 3, 0, TAU); c.fill();
    }
    c.fillStyle = '#b5603c'; c.beginPath(); c.moveTo(X(.43) - 26, Y(.1)); c.lineTo(X(.43) + 26, Y(.1)); c.lineTo(X(.43) + 19, Y(0)); c.lineTo(X(.43) - 19, Y(0)); c.fill();
    c.fillStyle = '#6b4a2e'; c.fillRect(X(.43) - 3, Y(.2), 6, Y(.1) - Y(.2));
    for (let i = 0; i < 22; i++) { c.fillStyle = r() < .7 ? ['#3f8a45', '#2f6e38'][i % 2] : '#ffd23f'; c.beginPath(); c.arc(X(.43) + (r() - .5) * 64, Y(.24) + (r() - .5) * 52, 6 + r() * 7, 0, TAU); c.fill(); }
    /* the string lights' hooks, and the nail the picture will hang from */
    c.fillStyle = '#2a2326';
    for (const [x, y] of WALL.hooks) { c.beginPath(); c.arc(X(x), Y(y), 4, 0, TAU); c.fill(); }
    c.beginPath(); c.arc(X(WALL.nail[0]), Y(WALL.nail[1]), 3, 0, TAU); c.fill();
    if (lit) {                                                          // warm light: under the bulbs, round the lantern, out of the window
      c.save(); c.globalCompositeOperation = 'lighter';
      const pool = (x, y, rad, a) => { const gr = c.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(255,170,80,${a})`); gr.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
      for (const [x, y] of BULBS) pool(X(x), Y(y) + 10, 70, .16);
      pool(lx, ly, 120, .3); pool(wx, wy + wh * .6, 150, .22); pool(X(TABLE.x), Y(.12), 260, .18);
      c.restore();
    } else {                                                            // moonlight: the wall in cold blue
      c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = '#4f5a96'; c.fillRect(0, Y(ROOF + .05), w, h); c.restore();
    }
    c.save(); c.globalCompositeOperation = 'destination-out'; doorPath(c); c.fill(); c.restore();   // the doorway: a hole through the page
  }
  function makeWall() {
    const o = { width: WALL.width, height: WALL.height, curve: WALL.curve, z: WALL.z, alphaTest: .5 };
    const dark = kit.backdrop((c, w, h) => paintWall(c, w, h, false), { ...o, order: -4 });
    const lit = kit.backdrop((c, w, h) => paintWall(c, w, h, true), { ...o, z: WALL.z + .002, order: -3 }); lit.material.opacity = 0;
    stage.add(dark, lit);
    return { dark, lit };
  }

  /* ── behind the doorway: a warm little room, and the door on its hinges ── */
  function makeDoorway() {
    const g = new THREE.Group(), z0 = wallZ(DOOR.x), depth = .17, w = DOOR.w + .08, h = DOOR.h + .05;
    const room = kit.canvasTexture(256, 256, (c, W, H) => {             // the room's back wall: shelves of bottles, a lamp
      c.fillStyle = '#f2c27f'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#c98b52'; for (const y of [70, 120]) c.fillRect(30, y, 196, 8);
      const r = seeded(9);
      for (const y of [70, 120]) for (let x = 40; x < 216; x += 18 + r() * 8) { c.fillStyle = ['#2f6e48', '#7c1d2c', '#c9a043', '#3a5a8a'][(r() * 4) | 0]; c.fillRect(x, y - 26 - r() * 8, 9, 30); }
      c.fillStyle = '#8a5a34'; c.fillRect(0, 180, W, H - 180);
      const lamp = c.createRadialGradient(128, 30, 0, 128, 30, 90); lamp.addColorStop(0, 'rgba(255,250,220,1)'); lamp.addColorStop(1, 'rgba(255,220,150,0)');
      c.fillStyle = lamp; c.fillRect(0, 0, W, 140);
    });
    const warm = c => kit.keep(new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide }));
    const none = kit.keep(new THREE.MeshBasicMaterial({ visible: false }));
    const back = kit.keep(new THREE.MeshBasicMaterial({ map: room, side: THREE.BackSide }));
    const box = new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, depth)), [warm('#d9a066'), warm('#d9a066'), warm('#7a4a30'), warm('#9a6a44'), none, back]);
    box.position.set(DOOR.x, h / 2 - .001, z0 - depth / 2 - .004); box.rotation.y = wallTurn(DOOR.x);
    g.add(box);
    /* the door: planks under an arch, iron studs and a ring, hinged on its left */
    const R = DOOR.w / 2, shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(DOOR.w, 0); shape.lineTo(DOOR.w, DOOR.h - R); shape.absarc(R, DOOR.h - R, R, 0, Math.PI, false); shape.lineTo(0, 0);
    const planks = kit.canvasTexture(128, 256, (c, W, H) => {
      const r = seeded(4);
      for (let x = 0, i = 0; x < W; x += W / 5, i++) { c.fillStyle = ['#6e3f24', '#7a4628', '#653a21', '#73432a', '#6a3d22'][i]; c.fillRect(x, 0, W / 5, H); }
      c.strokeStyle = 'rgba(30,15,8,.7)'; c.lineWidth = 2; for (let x = W / 5; x < W; x += W / 5) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      c.strokeStyle = 'rgba(40,20,10,.35)'; c.lineWidth = 1; for (let i = 0; i < 30; i++) { const x = r() * W, y = r() * H; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * 4, y + 20 + r() * 30); c.stroke(); }
      c.fillStyle = '#2b2326'; for (const y of [.2, .62]) c.fillRect(0, H * (1 - y) - 5, W, 10);
      c.fillStyle = '#c9a24a'; for (const y of [.2, .62]) for (let x = 10; x < W; x += 27) { c.beginPath(); c.arc(x, H * (1 - y), 3, 0, TAU); c.fill(); }
    });
    planks.wrapS = planks.wrapT = THREE.RepeatWrapping; planks.repeat.set(1 / DOOR.w, 1 / DOOR.h);   // the shape's own units are its UVs
    const leafGeo = new THREE.ExtrudeGeometry(shape, { depth: .01, bevelEnabled: false, curveSegments: 20 });
    leafGeo.translate(0, 0, -.005);
    const leaf = mesh(leafGeo, mat('#ffffff', { map: planks, roughness: .8, emissive: '#ffffff', emissiveMap: planks, emissiveIntensity: .22 }));   // seen even at night
    const ring = mesh(new THREE.TorusGeometry(.009, .0018, 6, 16), mat('#c9a24a', { metalness: .6, roughness: .35 }), DOOR.w * .8, DOOR.h * .45, .008);
    const hinge = new THREE.Group(); hinge.add(leaf, ring);
    hinge.position.set(DOOR.x - DOOR.w / 2, 0, z0 - .006); hinge.rotation.y = wallTurn(DOOR.x);
    g.add(hinge);
    /* light out of the open door, on the cobbles */
    const spill = new THREE.Mesh(geo(new THREE.PlaneGeometry(.34, .3).rotateX(-Math.PI / 2)), kit.keep(new THREE.MeshBasicMaterial({
      map: kit.canvasTexture(128, 128, (c, W) => { const gr = c.createRadialGradient(W / 2, W * .15, 0, W / 2, W * .15, W * .8); gr.addColorStop(0, 'rgba(255,200,120,.9)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, W); }),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
    spill.position.set(DOOR.x, .0016, z0 + .13); g.add(spill);
    stage.add(g);
    return { hinge, room: [back, ...box.material.slice(0, 4)], spill, closed: wallTurn(DOOR.x) };
  }

  /* ── cobbles on the card ── */
  function makeFloor() {
    const map = kit.canvasTexture(1024, 640, (c, w, h) => {
      const r = seeded(12);
      c.fillStyle = '#5a5058'; c.fillRect(0, 0, w, h);
      for (let y = -6, row = 0; y < h; row++) {
        const rh = 19 + r() * 7;
        for (let x = -r() * 30; x < w; ) {
          const sw = 22 + r() * 22, tone = ['#b3aab0', '#a59ca6', '#bdb3aa', '#aa9f9f', '#c4b8ab', '#9f98a3'][(r() * 6) | 0];
          c.fillStyle = tone; c.beginPath(); c.roundRect(x + 2, y + 2, sw - 4, rh - 4, 7); c.fill();
          c.fillStyle = 'rgba(255,248,230,.18)'; c.beginPath(); c.roundRect(x + 4, y + 3.5, sw - 10, (rh - 8) * .45, 5); c.fill();
          c.fillStyle = 'rgba(40,25,35,.16)'; c.beginPath(); c.roundRect(x + 3, y + rh * .62, sw - 6, rh * .3, 4); c.fill();
          x += sw;
        }
        y += rh;
      }
      for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(70,110,60,.35)'; c.beginPath(); c.arc(r() * w, r() * h, 3 + r() * 5, 0, TAU); c.fill(); }   // moss between stones
    });
    const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(1, kit.card.depth).rotateX(-Math.PI / 2)), mat('#ffffff', { map, roughness: .92 }));
    floor.position.y = .0006; floor.receiveShadow = false; stage.add(floor);
    return floor;
  }

  /* ── string lights along the top of the wall: swags between the hooks, bulbs that come on one by one ── */
  function makeLights() {
    const g = new THREE.Group(), wireM = mat('#231c20', { roughness: .6 });
    const H = WALL.hooks, out = .03;                                   // the wire hangs this far in front of the wall
    for (let i = 0; i < H.length - 1; i++) {
      const a = H[i], b = H[i + 1];
      const pts = Array.from({ length: 17 }, (_, j) => { const x = a[0] + (b[0] - a[0]) * j / 16; return V3(x, swagY(x, a, b), wallZ(x) + out); });
      g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, .0016, 5), wireM));
    }
    const cols = ['#ffd27a', '#fff0c8', '#ffb86b', '#ffe3a0'];
    const bulbs = BULBS.map(([x, y], i) => {
      const col = cols[i % 4], z = wallZ(x) + out;
      const b = new THREE.Group(); b.position.set(x, y, z);
      b.add(mesh(new THREE.CylinderGeometry(.0028, .0028, .006, 8), wireM, 0, .009, 0));
      const glass = mesh(new THREE.SphereGeometry(.0075, 12, 10), kit.keep(new THREE.MeshStandardMaterial({ color: '#c9c2b0', emissive: col, emissiveIntensity: 0, roughness: .3 })));
      glass.scale.y = 1.25; glass.castShadow = false; b.add(glass);
      const glowB = kit.glow({ color: new THREE.Color(col).getHex(), size: .07, opacity: 0 }); b.add(glowB);
      g.add(b);
      return { b, glass, glowB };
    });
    stage.add(g);
    return bulbs;
  }

  /* ── the bistro table: an iron pedestal under a red-and-white checked cloth ── */
  function gingham(n) {                                               // n checks across: red stripes crossing on white
    return texture(128, 128, (c, w) => {
      c.fillStyle = '#fff8ef'; c.fillRect(0, 0, w, w);
      c.fillStyle = 'rgba(204,30,50,.56)'; c.fillRect(0, 0, w / 2, w); c.fillRect(0, 0, w, w / 2);
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; for (let i = 2; i < w; i += 4) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, w); c.stroke(); }
    }, { repeat: n });
  }
  function makeTable() {
    const g = new THREE.Group(), T = TABLE, iron = mat('#2a262c', { roughness: .45, metalness: .45 });
    g.add(mesh(new THREE.CylinderGeometry(.005, .007, T.top, 10), iron, 0, T.top / 2, 0));
    g.add(mesh(new THREE.CylinderGeometry(.026, .034, .006, 24), iron, 0, .003, 0));
    for (let i = 0; i < 3; i++) { const f = mesh(new THREE.BoxGeometry(.05, .004, .007), iron, 0, .006, 0); f.rotation.y = i / 3 * Math.PI; g.add(f); }
    const r0 = T.r, fall = .04;
    const top = mesh(new THREE.CircleGeometry(r0, 56).rotateX(-Math.PI / 2), mat('#ffffff', { map: gingham([6, 6]), roughness: .9 }), 0, T.top + .0012, 0);
    const skirtGeo = new THREE.CylinderGeometry(r0, r0 * 1.08, fall, 72, 3, true), p = skirtGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {                                   // folds, deeper towards the hem
      const a = Math.atan2(p.getZ(i), p.getX(i)), k = (fall / 2 - p.getY(i)) / fall, w = 1 + .04 * k * Math.sin(a * 14);
      p.setXYZ(i, p.getX(i) * w, p.getY(i) - k * fall * .14 * (1 + Math.sin(a * 14)), p.getZ(i) * w);
    }
    skirtGeo.computeVertexNormals();
    const skirt = mesh(skirtGeo, mat('#ffffff', { map: gingham([19, 1.3]), roughness: .9, side: THREE.DoubleSide }), 0, T.top - fall / 2 + .001, 0);
    skirt.receiveShadow = false;
    g.add(top, skirt);
    g.position.set(T.x, 0, T.z);
    stage.add(g);
    return g;
  }

  /* ── a candle in an old wine bottle, wax run down its neck; its flame can turn into a heart ── */
  function makeCandle() {
    const g = new THREE.Group();
    const prof = [[0, 0], [.0095, 0], [.0112, .003], [.0116, .022], [.0085, .032], [.0046, .039], [.0042, .05], [.0056, .052], [.0052, .054], [0, .054]];
    const radiusAt = y => { for (let i = 1; i < prof.length; i++) if (prof[i][1] >= y) { const [x0, y0] = prof[i - 1], [x1, y1] = prof[i]; return x0 + (x1 - x0) * ((y - y0) / (y1 - y0 || 1)); } return 0; };
    const glass = mat('#1d5a3a', { roughness: .12, metalness: .25, envMap: kit.env, transparent: true, opacity: .93, side: THREE.DoubleSide });
    g.add(mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 24), glass));
    const r = seeded(3), waxes = ['#f7efe0', '#d7263d', '#f7efe0', '#2f8f4e', '#f2c14e'];
    for (let i = 0; i < 9; i++) {                                         // drips of old candles, every colour, down the neck
      const a = i / 9 * TAU + r() * .4, len = .01 + r() * .026, pts = [];
      for (let j = 0; j <= 6; j++) { const y = .054 - j / 6 * len, rad = radiusAt(Math.max(.004, y)) + .0008; pts.push(V3(Math.cos(a + Math.sin(j) * .05) * rad, y, Math.sin(a) * rad)); }
      g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, .0014 + r() * .001, 6), mat(waxes[i % 5], { roughness: .5 })));
    }
    g.add(mesh(new THREE.CylinderGeometry(.0068, .0062, .004, 16), mat('#f7efe0', { roughness: .5 }), 0, .0545, 0));
    g.add(mesh(new THREE.CylinderGeometry(.004, .0043, .015, 14), mat('#fff7ea', { roughness: .45, emissive: '#ffcf8a', emissiveIntensity: .25 }), 0, .064, 0));
    g.add(mesh(new THREE.CylinderGeometry(.0006, .0006, .004, 5), mat('#2b2020'), 0, .0725, 0));
    const top = .0785;
    const flame = mesh(new THREE.SphereGeometry(.0038, 12, 10), kit.keep(new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffb347', emissiveIntensity: 2.4, roughness: .4 })));
    flame.castShadow = flame.receiveShadow = false; flame.position.y = top;
    const glowF = kit.glow({ color: 0xffb860, size: .045, opacity: 0 }); glowF.position.y = top + .002;
    const light = new THREE.PointLight(0xffa45c, 0, .5, 2); light.position.y = top + .012;
    const heart = kit.picture((c, px) => {                                // the flame as a heart: gold inside, pink round it
      const gr = c.createRadialGradient(px / 2, px * .5, 0, px / 2, px * .5, px * .5); gr.addColorStop(0, 'rgba(255,190,140,.85)'); gr.addColorStop(1, 'rgba(255,120,150,0)');
      c.fillStyle = gr; c.fillRect(0, 0, px, px);
      c.fillStyle = '#ff5d7d'; kit.heartPath(c, px / 2, px * .53, px * .62); c.fill();
      c.fillStyle = '#ffb36b'; kit.heartPath(c, px / 2, px * .55, px * .42); c.fill();
      c.fillStyle = '#fff6c8'; kit.heartPath(c, px / 2, px * .57, px * .22); c.fill();
    }, { size: .05 });
    heart.position.y = top + .01; heart.scale.setScalar(.0001);
    g.add(flame, glowF, light, heart);
    stage.add(g);
    return { root: g, flame, glowF, light, heart, top };
  }

  /* ── one big plate of spaghetti: a nest of noodles, sauce, meatballs, basil ── */
  function makeSpaghetti() {
    const g = new THREE.Group(), r = seeded(21), R = .05;
    const plate = [[0, 0], [.03, 0], [.032, .003], [.046, .0068], [.051, .0086], [.0525, .0082], [.05, .0062], [.034, .0035], [.031, .0022], [0, .0022]];
    g.add(mesh(new THREE.LatheGeometry(plate.map(([x, y]) => new THREE.Vector2(x, y)), 40), mat('#fbf8f2', { roughness: .25, envMap: kit.env, envMapIntensity: .6, side: THREE.DoubleSide })));
    g.add(mesh(new THREE.TorusGeometry(.0485, .0009, 4, 60).rotateX(Math.PI / 2), mat('#c7243a', { roughness: .4 }), 0, .0079, 0));
    const pasta = new THREE.Group(); pasta.position.y = .004; g.add(pasta);
    const noodle = mat('#f1d27e', { roughness: .45, emissive: '#5a3a00', emissiveIntensity: .08 });
    const dome = rr => .021 * Math.sqrt(Math.max(0, 1 - (rr / .036) ** 2));
    for (let i = 0; i < 18; i++) {                                        // each noodle a loose swirl over the dome
      const pts = [], a0 = r() * TAU, turns = .8 + r() * 1.2, r1 = .006 + r() * .012, r2 = .02 + r() * .016, tilt = r() * TAU;
      for (let j = 0; j <= 24; j++) {
        const t = j / 24, a = a0 + t * turns * TAU, rr = r1 + (r2 - r1) * (.5 - .5 * Math.cos(t * Math.PI * 1.6)) + .003 * Math.sin(t * 11 + tilt);
        pts.push(V3(Math.cos(a) * rr, dome(rr) * (.75 + .25 * r()) + .001, Math.sin(a) * rr));
      }
      pasta.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .0017, 5), noodle));
    }
    const sauceGeo = new THREE.SphereGeometry(.017, 18, 10), sp = sauceGeo.attributes.position;
    for (let i = 0; i < sp.count; i++) { const k = 1 + .18 * Math.sin(Math.atan2(sp.getZ(i), sp.getX(i)) * 5 + 1); sp.setXYZ(i, sp.getX(i) * k, sp.getY(i) * .35, sp.getZ(i) * k); }
    sauceGeo.computeVertexNormals();
    pasta.add(mesh(sauceGeo, mat('#c8361f', { roughness: .35 }), 0, .02, 0));
    const ballGeo = new THREE.IcosahedronGeometry(.0078, 2), bp = ballGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) { const k = 1 + (Math.sin(bp.getX(i) * 900) * Math.sin(bp.getY(i) * 800 + 1) * Math.sin(bp.getZ(i) * 700)) * .09; bp.setXYZ(i, bp.getX(i) * k, bp.getY(i) * k, bp.getZ(i) * k); }
    ballGeo.computeVertexNormals();
    const meat = mat('#74371b', { roughness: .8 });
    const balls = [[-.014, -.006], [.013, -.008], [.004, .011]].map(([x, z], i) => {   // one each, and the last one, nearest the phone
      const b = mesh(ballGeo, meat, x, .026 - .002 * Math.hypot(x, z) / .01, z); b.rotation.set(i, i * 2, 0); if (i === 2) b.scale.setScalar(1.3); pasta.add(b); return b;
    });
    const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(.004, .004, 0, .011); leaf.quadraticCurveTo(-.004, .004, 0, 0);
    for (const [x, z, a] of [[0, -.002, .4], [.003, .002, 2.6]]) {
      const l = mesh(new THREE.ShapeGeometry(leaf, 6), mat('#3f9a45', { roughness: .5, side: THREE.DoubleSide }), x, .0285, z);
      l.rotation.set(-Math.PI / 2 + .35, 0, a); pasta.add(l);
    }
    stage.add(g);
    return { root: g, pasta, balls, radius: R, height: .03 };
  }

  /* ── a fork: tines along +y, held at its origin ── */
  function makeFork() {
    const g = new THREE.Group(), steel = mat('#9aa3b0', { metalness: .9, roughness: .28, envMap: kit.env });
    g.add(mesh(new THREE.BoxGeometry(.005, .034, .002), steel, 0, -.012, 0));
    g.add(mesh(new THREE.BoxGeometry(.003, .012, .0017), steel, 0, .011, 0));
    g.add(mesh(new THREE.BoxGeometry(.0085, .005, .0017), steel, 0, .0185, 0));
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(.0013, .014, .0015), steel, -.0033 + i * .0022, .0275, 0));
    stage.add(g);
    return g;
  }
  /* noodles wound round a fork's tines: a little coil that grows as it twirls (fork units: tines along +y) */
  function makeCoil() {
    const pts = Array.from({ length: 40 }, (_, i) => { const t = i / 39, a = t * TAU * 3.4, rr = .0058 + .0016 * Math.sin(t * 9); return V3(Math.cos(a) * rr, .019 + t * .014, Math.sin(a) * rr); });
    const coil = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, .0018, 5), mat('#f1d27e', { roughness: .45, emissive: '#5a3a00', emissiveIntensity: .08 }));
    coil.scale.setScalar(.0001);
    return coil;
  }

  /* ── one noodle between two mouths: a tube rebuilt every frame along the points it is given ── */
  function makeNoodle(n = 40, sides = 6, rad = .003) {
    const ring = sides + 1, count = (n + 1) * ring;
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), idx = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < sides; j++) { const a = i * ring + j, b = a + ring; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = geo(new THREE.BufferGeometry());
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.Mesh(g, mat('#f8de90', { roughness: .4, emissive: '#c08a20', emissiveIntensity: .35 }));   // golden: it must read against the dark
    m.frustumCulled = false; m.castShadow = true; m.visible = false;
    const T = V3(), N = V3(0, 0, 1), B = V3(), P = V3(), Q = V3();
    stage.add(m);
    return {
      mesh: m, n,
      /** pts: n + 1 points along it, on the stage */
      set(pts) {
        N.set(0, 0, 1);
        for (let i = 0; i <= n; i++) {
          P.copy(pts[Math.min(n, i + 1)]).sub(pts[Math.max(0, i - 1)]); T.copy(P).normalize();
          N.addScaledVector(T, -N.dot(T)).normalize(); if (N.lengthSq() < .5) N.set(1, 0, 0).addScaledVector(T, -T.x).normalize();   // carried along: no twist
          B.crossVectors(T, N);
          for (let j = 0; j <= sides; j++) {
            const a = j / sides * TAU, k = (i * ring + j) * 3;
            Q.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
            pos[k] = pts[i].x + Q.x * rad; pos[k + 1] = pts[i].y + Q.y * rad; pos[k + 2] = pts[i].z + Q.z * rad;
            nor[k] = Q.x; nor[k + 1] = Q.y; nor[k + 2] = Q.z;
          }
        }
        g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
      }
    };
  }

  /* ── the chalkboard menu on its easel: "Món hôm nay" on top; the card's first words are chalked in under it ── */
  function makeEasel(text, BW = .3, BH = .26, lift = .19) {
    const g = new THREE.Group(), wood = mat('#a8743f', { roughness: .75 }), dark = mat('#6e4526', { roughness: .8 });
    const legLen = lift + BH + .04;
    /** a leg from a to b (a box along the line), behind the board */
    const leg = (a, b, m, t = .011) => { const d = b.clone().sub(a), l = mesh(new THREE.BoxGeometry(t, d.length(), t * .8), m); l.position.copy(a).addScaledVector(d, .5); l.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); g.add(l); };
    for (const s of [-1, 1]) leg(V3(s * BW * .46, 0, .004), V3(s * BW * .1, legLen, -.012), wood);   // wide at the foot, meeting behind the top
    leg(V3(0, legLen - .03, -.016), V3(0, 0, -.11), dark, .009);                                    // the prop leg behind
    const board = new THREE.Group(); board.position.set(0, lift + BH / 2, .014); board.rotation.x = -.06; g.add(board);
    const PXB = 1024, PYB = Math.round(1024 * BH / BW);
    const slate = kit.canvasTexture(PXB, PYB, (c, w, h) => {
      const r = seeded(15);
      c.fillStyle = '#20302a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(230,240,230,${.025 + r() * .04})`; c.beginPath(); c.ellipse(r() * w, r() * h, 60 + r() * 140, 20 + r() * 50, r() * 3, 0, TAU); c.fill(); }   // old rubbings
      c.fillStyle = '#fbf3df'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 ${h * .105}px ${kit.HAND}`;
      c.fillText('Món hôm nay', w / 2, h * .1);
      c.strokeStyle = '#ffd36b'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(w * .3, h * .175);
      c.bezierCurveTo(w * .44, h * .155, w * .56, h * .2, w * .7, h * .17); c.stroke();
      c.fillStyle = '#ff8fab'; kit.heartPath(c, w * .88, h * .89, 54); c.fill();   // a heart and a plate of noodles in coloured chalk
      c.strokeStyle = '#fbf3df'; c.lineWidth = 4; c.beginPath(); c.ellipse(w * .11, h * .9, 56, 18, 0, 0, TAU); c.stroke();
      c.strokeStyle = '#ffd36b'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(w * .11 + (i - 1.5) * 18, h * .87, 14, Math.PI, 0); c.stroke(); }
      c.fillStyle = '#ff6b6b'; c.beginPath(); c.arc(w * .11, h * .85, 9, 0, TAU); c.fill();
      c.fillStyle = 'rgba(32,48,42,.55)'; for (let i = 0; i < 900; i++) c.fillRect(r() * w, r() * h * .3, 2, 2);   // chalk is grainy
    });
    board.add(mesh(new THREE.PlaneGeometry(BW, BH), kit.keep(new THREE.MeshStandardMaterial({ map: slate, roughness: .95, emissive: 0xffffff, emissiveMap: slate, emissiveIntensity: .35 }))));
    const frameW = .014;
    for (const [w, h, x, y] of [[BW + frameW * 2, frameW, 0, BH / 2 + frameW / 2], [BW + frameW * 2, frameW, 0, -BH / 2 - frameW / 2], [frameW, BH, -BW / 2 - frameW / 2, 0], [frameW, BH, BW / 2 + frameW / 2, 0]]) {
      board.add(mesh(new THREE.BoxGeometry(w, h, .008), wood, x, y, 0));
    }
    const ledge = mesh(new THREE.BoxGeometry(BW * .9, .006, .018), wood, 0, -BH / 2 - frameW - .002, .008); board.add(ledge);
    for (const [x, col] of [[-.06, '#fbf3df'], [-.04, '#ff8fab']]) { const s = mesh(new THREE.CylinderGeometry(.0025, .0025, .016, 6), mat(col), x, -BH / 2 - frameW + .003, .012); s.rotation.z = Math.PI / 2; board.add(s); }
    /* the words: their own transparent canvas, shown from the left as they are chalked in */
    const box = { x: 44, y: PYB * .2, w: PXB - 88, h: PYB * .66 };
    let words = String(text);
    const chalk = kit.canvasTexture(PXB, PYB, c => {
      c.fillStyle = '#fbf6e8'; kit.fitText(c, words, box, { maxLines: 4, max: 140 });   // a long note takes a fourth line, not a smaller hand
      const r = seeded(8); c.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 2600; i++) c.fillRect(box.x + r() * box.w, box.y + r() * box.h, 2, 2);
    });
    const wipeGeo = new THREE.PlaneGeometry(BW, BH); wipeGeo.translate(BW / 2, 0, 0);   // its left edge at its origin: it grows to the right
    const written = new THREE.Mesh(geo(wipeGeo), kit.keep(new THREE.MeshBasicMaterial({ map: chalk, transparent: true, depthWrite: false, toneMapped: false })));
    written.position.set(-BW / 2, 0, .0015); board.add(written);
    stage.add(g);
    return {
      root: g, board, BW, BH,
      /** k of the words shown, from the left; the chalk's tip as a point on the board (board units) */
      write(k) { const s = Math.max(.0001, k); written.scale.x = s; chalk.repeat.x = s; },
      set(t) { words = String(t); }
    };
  }

  /* ── a gilt frame for the card's photo, hung from a nail by a wire (its origin: the nail) ── */
  function makeFrame(photo) {
    const g = new THREE.Group(), w = photo.width + .028, h = photo.height + .028, drop = .014;
    const outer = new THREE.Shape(); outer.moveTo(-w / 2, 0); outer.lineTo(w / 2, 0); outer.lineTo(w / 2, h); outer.lineTo(-w / 2, h); outer.lineTo(-w / 2, 0);
    const hole = new THREE.Path(); hole.moveTo(-w / 2 + .012, .012); hole.lineTo(-w / 2 + .012, h - .012); hole.lineTo(w / 2 - .012, h - .012); hole.lineTo(w / 2 - .012, .012); hole.lineTo(-w / 2 + .012, .012);
    outer.holes.push(hole);
    const gilt = mat('#d6a64a', { metalness: .65, roughness: .3, envMap: kit.env });
    const fr = mesh(new THREE.ExtrudeGeometry(outer, { depth: .008, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 1 }), gilt, 0, -drop - h, -.004);
    const inner = new THREE.Group(); inner.position.set(0, -drop - h + .014, 0); inner.add(photo.root); photo.root.position.set(0, 0, .002);
    const wire = mat('#3a3030', { roughness: .5 });
    for (const s of [-1, 1]) {
      const a = V3(0, 0, 0), b = V3(s * w * .3, -drop - .006, 0), d = b.clone().sub(a);
      const c = mesh(new THREE.CylinderGeometry(.0008, .0008, d.length(), 4), wire); c.position.copy(a).addScaledVector(d, .5);
      c.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); g.add(c);
    }
    g.add(fr, inner, mesh(new THREE.CylinderGeometry(.0024, .0024, .01, 8).rotateX(Math.PI / 2), mat('#2a2326'), 0, 0, -.002));
    return g;
  }

  /* ── the last chapter's string of little lights across the alley (bow: how far its middle comes out from its ends);
        the banner hangs from its middle ── */
  function makeGarland(span = .64, sag = .05, n = 13, bow = 0) {
    const g = new THREE.Group(), pts = [], at = k => V3(-span / 2 + span * k, -sag * 4 * k * (1 - k), bow * 4 * k * (1 - k));
    for (let i = 0; i <= 20; i++) pts.push(at(i / 20));
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .0014, 5), mat('#231c20')));
    const cols = ['#ffd27a', '#ff9fbf', '#fff0c8', '#ff7a8a'];
    const bulbs = Array.from({ length: n }, (_, i) => {
      const k = (i + .5) / n, b = mesh(new THREE.SphereGeometry(.0055, 10, 8), kit.keep(new THREE.MeshStandardMaterial({ color: '#d8d0c0', emissive: cols[i % 4], emissiveIntensity: 0 })));
      b.position.copy(at(k)); b.position.y -= .008; b.castShadow = false;
      const gl = kit.glow({ color: new THREE.Color(cols[i % 4]).getHex(), size: .045, opacity: 0 }); gl.position.copy(b.position);
      g.add(b, gl); return { b, gl };
    });
    stage.add(g);
    return { root: g, bulbs, sag, bow };
  }

  /* ── pink cheeks: two soft glows on a head bone (model units), hidden until the story shows them ── */
  function makeBlush(m, at, size) {
    const tex = kit.canvasTexture(64, 64, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,105,140,.95)'); gr.addColorStop(.55, 'rgba(255,120,150,.5)'); gr.addColorStop(1, 'rgba(255,130,160,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
    const material = kit.keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    const head = m.node('head'); if (!head) return material;
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(geo(new THREE.PlaneGeometry(size, size * .62)), material); p.position.set(s * at[0], at[1], at[2]); p.rotation.y = s * .42; p.renderOrder = 2; head.add(p);
    }
    return material;
  }

  return { V3, seeded, wallZ, wallTurn, mat, mesh, dressBoy, dressGirl, dressChair, makeWall, makeDoorway, makeFloor, makeLights,
    makeTable, makeCandle, makeSpaghetti, makeFork, makeCoil, makeNoodle, makeEasel, makeFrame, makeGarland, makeBlush, BULBS };
};
