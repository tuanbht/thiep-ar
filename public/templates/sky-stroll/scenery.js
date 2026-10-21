/* Dạo bước trên không: the flower town, built in code for story.js (template.json "story" loads this file first). The sky
   page (an afternoon sky with a far town at its foot, a dusk painted the same way that fades in over it), the cobbled
   lane, a row of pastel houses with flower boxes, the house with the flower balcony, the flower shop and its hanging
   sign, bunting with paper lanterns, lamp posts, planters, a weathervane, birds, clouds, the rings of light their steps leave on
   the air and her flower basket. The story places and times them; flags, wings and flames go by T, the act's own time.
     NM_SKYWALK.scenery(kit, { PAGE, LANE }) → the builders, and what the story places things by (ROW, BALCONY, SIGN) */
(window.NM_SKYWALK = window.NM_SKYWALK || {}).scenery = (kit, { PAGE, LANE }) => {
  const { THREE, lerp, ease, seg } = kit;
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const geo = g => kit.keep(g);
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .8, ...o }));
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo(g), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
  const SANS = '"Be Vietnam Pro", "Segoe UI", Arial, sans-serif';

  /* ── flowers: tiny blooms and leaves, one instanced mesh per heap (a draw call each, however many blooms) ── */
  const BLOOMS = ['#ff7fa3', '#ffd1dc', '#ffffff', '#ffd166', '#ff9a76', '#c9a7ff', '#e64a6f'];
  const LEAF = ['#5fae62', '#4f9a52', '#79c26f'];
  const BLOB = geo(new THREE.IcosahedronGeometry(1, 0));
  /** [x, y, z, size, colour] each, as one mesh */
  function blooms(list) {
    const m = new THREE.InstancedMesh(BLOB, mat('#ffffff', { roughness: .6 }), list.length), q = new THREE.Matrix4(), col = new THREE.Color();
    list.forEach(([x, y, z, s, c], i) => { m.setMatrixAt(i, q.makeScale(s, s * .82, s).setPosition(x, y, z)); m.setColorAt(i, col.set(c)); });
    m.frustumCulled = false;
    return m;
  }
  /** many copies of one small part, one draw call: [x, y, z] each */
  function copies(g0, material, list, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.InstancedMesh(geo(g0), material, list.length), q = new THREE.Matrix4();
    list.forEach(([x, y, z], i) => m.setMatrixAt(i, q.makeScale(sx, sy, sz).setPosition(x, y, z)));
    m.frustumCulled = false;
    return m;
  }
  /** n blooms heaped round (x, y, z), w wide and d deep, leaves tucked under them */
  function heap(out, r, x, y, z, n, w, d, size = .0045, palette = BLOOMS) {
    for (let i = 0; i < Math.ceil(n * .7); i++) out.push([x + (r() - .5) * w * 1.1, y - size * .3, z + (r() - .5) * d, size * (.9 + r() * .4), LEAF[(r() * 3) | 0]]);
    for (let i = 0; i < n; i++) out.push([x + (r() - .5) * w, y + r() * size * 1.4, z + (r() - .5) * d, size * (.75 + r() * .5), palette[(r() * palette.length) | 0]]);
    return out;
  }

  /* ── the sky page: its canvas is taller than the page, and the story scrolls it (lift), so the far town at its foot
        sinks behind the houses as the two of them climb ── */
  const VIEW = .8;                                                   // the share of the canvas the page shows at once
  function paintPage(dusk) {
    return (c, W, H) => {
      const r = seeded(dusk ? 71 : 37), unit = H * VIEW / PAGE.height;   // canvas pixels per card width, up the page
      const py = y => H - y * unit, px = x => (x / PAGE.width + .5) * W;
      let g = c.createLinearGradient(0, 0, 0, py(.2));
      (dusk ? [[0, '#141a46'], [.4, '#2c2f6e'], [.66, '#6a4a92'], [.84, '#d06a8c'], [1, '#ff9e7a']]
        : [[0, '#6f9be0'], [.38, '#a9c3ef'], [.66, '#f6cfd6'], [.86, '#ffd7b3'], [1, '#ffe9c4']]).forEach(([k, col]) => g.addColorStop(k, col));
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      const sx = px(.3), sy = py(dusk ? .28 : .5);                    // the sun, low over the far town; at dusk only its glow
      g = c.createRadialGradient(sx, sy, 0, sx, sy, W * .34);
      g.addColorStop(0, dusk ? 'rgba(255,150,120,.55)' : 'rgba(255,250,225,.95)'); g.addColorStop(.25, dusk ? 'rgba(240,110,130,.25)' : 'rgba(255,224,170,.55)');
      g.addColorStop(1, 'rgba(255,200,170,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (!dusk) { c.fillStyle = '#fff6dc'; c.beginPath(); c.arc(sx, sy, W * .04, 0, TAU); c.fill(); }
      else {
        for (let i = 0; i < 140; i++) { c.fillStyle = `rgba(255,246,226,${.25 + r() * .6})`; c.beginPath(); c.arc(r() * W, r() * py(.55), .7 + r() * 1.6, 0, TAU); c.fill(); }
        c.fillStyle = '#fff1c8'; c.beginPath(); c.arc(px(-.38), py(.84), W * .028, 0, TAU); c.fill();   // a crescent moon
        c.fillStyle = '#2c2f6e'; c.beginPath(); c.arc(px(-.38) + W * .013, py(.84) - W * .008, W * .026, 0, TAU); c.fill();
      }
      for (let i = 0; i < 9; i++) {                                   // fluffy clouds, lit from below
        const cx = r() * W, cy = py(.48 + r() * .62), s = W * (.035 + r() * .04), n = 5 + ((r() * 4) | 0);
        const body = dusk ? '#4a3f7c' : '#fffaf6', belly = dusk ? '#c0608a' : '#ffd0c4', rim = dusk ? '#ff9a8a' : '#ffe9c8';
        for (let k = 0; k < n; k++) {
          const x = cx + (k - n / 2) * s * .8, y = cy - Math.sin(Math.PI * (k + .5) / n) * s * .8, rad = s * (.6 + r() * .5);
          const gg = c.createLinearGradient(0, y - rad, 0, y + rad); gg.addColorStop(0, body); gg.addColorStop(.75, belly); gg.addColorStop(1, rim);
          c.fillStyle = gg; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill();
        }
      }
      for (let i = 0; i < 7; i++) {                                    // birds far off: little ticks
        const x = r() * W, y = py(.55 + r() * .45), s = 5 + r() * 6;
        c.strokeStyle = dusk ? 'rgba(30,24,60,.7)' : 'rgba(90,80,120,.6)'; c.lineWidth = 2; c.beginPath();
        c.moveTo(x - s, y - s * .3); c.quadraticCurveTo(x - s * .4, y - s * .6, x, y); c.quadraticCurveTo(x + s * .4, y - s * .6, x + s, y - s * .3); c.stroke();
      }
      g = c.createLinearGradient(0, py(.46), 0, py(.12));            // hills behind the far town, in haze
      g.addColorStop(0, dusk ? '#4b3f7e' : '#b8c6e6'); g.addColorStop(1, dusk ? '#3a3168' : '#a7b9dd');
      c.fillStyle = g; c.beginPath(); c.moveTo(0, H);
      for (let k = 0; k <= 40; k++) { const t = k / 40; c.lineTo(t * W, py(.36 + .05 * Math.sin(t * 7.3 + 1) + .03 * Math.sin(t * 17))); }
      c.lineTo(W, H); c.fill();
      farTown(c, W, H, px, py, dusk);
    };
  }
  /** the far town: pastel roofs, a clock tower, a spire, a windmill and round trees; at dusk dark, its windows lit */
  function farTown(c, W, H, px, py, dusk) {
    const r = seeded(dusk ? 5 : 5), walls = dusk ? ['#5a4a86', '#4e4280', '#62508e'] : ['#f6dfe6', '#e8eedf', '#fbe9cf', '#e2e4f6', '#f9e3d6'];
    const roofs = dusk ? ['#3a2f66', '#432f62', '#33295c'] : ['#d98aa0', '#86a9d6', '#e6a476', '#8cc0b4', '#b892c8'];
    const base = py(.2);
    for (let x = -10; x < W; ) {                                      // a row of little houses, gables up, some taller
      const w = 26 + r() * 30, h = (26 + r() * 40) * (r() < .12 ? 1.8 : 1), rh = w * (.35 + r() * .25), top = base - h;
      c.fillStyle = walls[(r() * walls.length) | 0]; c.fillRect(x, top, w, base - top + 2);
      c.fillStyle = roofs[(r() * roofs.length) | 0]; c.beginPath(); c.moveTo(x - 3, top + 1); c.lineTo(x + w / 2, top - rh); c.lineTo(x + w + 3, top + 1); c.fill();
      c.fillStyle = dusk ? '#ffd27a' : 'rgba(80,96,140,.55)';
      for (let wy = top + 8; wy < base - 8; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 11) if (!dusk || r() < .7) c.fillRect(wx, wy, 5, 7);
      x += w + r() * 4;
    }
    const tower = (x, h, w, cap) => {                                // a clock tower and a church spire
      c.fillStyle = dusk ? '#4a3d7a' : '#f3e6da'; c.fillRect(x - w / 2, base - h, w, h);
      c.fillStyle = dusk ? '#2e2558' : cap; c.beginPath(); c.moveTo(x - w / 2 - 4, base - h); c.lineTo(x, base - h - w * 1.6); c.lineTo(x + w / 2 + 4, base - h); c.fill();
      c.fillStyle = dusk ? '#ffe3a0' : '#fffaf0'; c.beginPath(); c.arc(x, base - h + w * .55, w * .3, 0, TAU); c.fill();
      c.strokeStyle = dusk ? '#4a3d7a' : '#7a6a88'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, base - h + w * .55); c.lineTo(x, base - h + w * .35); c.moveTo(x, base - h + w * .55); c.lineTo(x + w * .15, base - h + w * .6); c.stroke();
    };
    tower(px(-.2), 120, 30, '#86a9d6'); tower(px(.36), 96, 24, '#d98aa0');
    const mx = px(.47), my = base - 70;                               // a windmill on the hill
    c.fillStyle = dusk ? '#4a3d7a' : '#fdf3e4'; c.beginPath(); c.moveTo(mx - 14, base); c.lineTo(mx - 9, my); c.lineTo(mx + 9, my); c.lineTo(mx + 14, base); c.fill();
    c.strokeStyle = dusk ? '#2e2558' : '#9a7a6a'; c.lineWidth = 4;
    for (let k = 0; k < 4; k++) { const a = .5 + k * TAU / 4; c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + Math.cos(a) * 46, my + Math.sin(a) * 46); c.stroke(); }
    for (let i = 0; i < 16; i++) {                                    // round trees between the houses
      const x = r() * W, s = 9 + r() * 10;
      c.fillStyle = dusk ? '#2f3a5e' : ['#9ccf9a', '#86c08a', '#b2dba6'][i % 3]; c.beginPath(); c.arc(x, base - s * .8, s, 0, TAU); c.fill();
    }
    const g = c.createLinearGradient(0, base - 160, 0, base);        // haze over it all
    g.addColorStop(0, 'rgba(255,240,230,0)'); g.addColorStop(1, dusk ? 'rgba(90,70,140,.35)' : 'rgba(255,236,222,.45)');
    c.fillStyle = g; c.fillRect(0, base - 160, W, 160);
    c.fillStyle = dusk ? '#3d3270' : '#e9d6e2'; c.fillRect(0, base, W, H - base);
    const near = py(.07), nw = dusk ? ['#5d4b8c', '#55468a', '#6a5596'] : ['#f9d9e2', '#dfeadb', '#fde6c8', '#dcdff6', '#f6dccf'];
    for (let x = -14; x < W; ) {                                     // a nearer row at the page's foot, between the houses on the card
      const w = 44 + r() * 40, h = 46 + r() * 50, rh = w * (.4 + r() * .2), top = near - h;
      c.fillStyle = nw[(r() * nw.length) | 0]; c.fillRect(x, top, w, H - top);
      c.fillStyle = roofs[(r() * roofs.length) | 0]; c.beginPath(); c.moveTo(x - 4, top + 1); c.lineTo(x + w / 2, top - rh); c.lineTo(x + w + 4, top + 1); c.fill();
      for (let wy = top + 10; wy < near - 10; wy += 20) for (let wx = x + 8; wx < x + w - 12; wx += 16) {
        c.fillStyle = dusk ? (r() < .75 ? '#ffd27a' : '#2e2558') : 'rgba(80,96,140,.6)'; c.fillRect(wx, wy, 7, 10);
      }
      x += w + 2 + r() * 6;
    }
    c.fillStyle = dusk ? '#2e2558' : '#cdb9c6'; c.fillRect(0, near, W, H - near);
  }
  /** { root (fold it up with rotation.x), zAt(x), set(lift, dusk, warm) } */
  function makePage() {
    const { width, height, curve } = PAGE, ph = Math.round(1024 * height / width / VIEW);
    const g = new THREE.PlaneGeometry(width, height, 32, 1), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const k = pos.getX(i) / (width / 2); pos.setZ(i, curve * k * k); pos.setY(i, pos.getY(i) + height / 2); }
    g.computeVertexNormals(); geo(g);
    const root = new THREE.Group(); root.position.z = PAGE.z;
    const pages = [false, true].map(dusk => {
      const tex = kit.canvasTexture(1024, ph, paintPage(dusk)); tex.repeat.set(1, VIEW);
      const m = new THREE.Mesh(g, kit.keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: dusk ? 0 : 1, side: THREE.DoubleSide, toneMapped: false })));
      m.position.z = dusk ? .002 : 0; m.renderOrder = dusk ? -.5 : -1; root.add(m);
      return m;
    });
    return {
      root, zAt: x => PAGE.z + curve * (x / (width / 2)) ** 2,
      set(lift, dusk, warm) {
        pages.forEach(p => { p.material.map.offset.y = (1 - VIEW) * lift; });
        pages[1].material.opacity = dusk; pages[0].material.color.setRGB(1, lerp(1, .87, warm), lerp(1, .8, warm));
      }
    };
  }

  /* ── the cobbled lane, across the whole card; it unrolls from the houses towards you ── */
  function makeLane() {
    const { z0, z1 } = LANE, d = z1 - z0, root = new THREE.Group(); root.position.z = z0;
    const tex = kit.canvasTexture(1024, Math.round(1024 * d), (c, W, H) => {
      const r = seeded(19), fz = z => (z - z0) / d * H;
      c.fillStyle = '#b9aeb4'; c.fillRect(0, 0, W, H);
      const stones = ['#e9e0dc', '#ddd3d4', '#e6dccd', '#d6d0dc', '#ecdcd8', '#d9cfc4'];
      for (let y = fz(-.14), row = 0; y < H + 20; row++) {           // cobbles, rows across, each its own size and shade
        const h = 15 + r() * 6;
        for (let x = -r() * 20; x < W; ) {
          const w = 17 + r() * 14;
          c.fillStyle = stones[(r() * stones.length) | 0]; c.beginPath(); c.roundRect(x + 2, y + 2, w - 4, h - 4, 6); c.fill();
          c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.roundRect(x + 4, y + 3, w - 10, (h - 4) * .35, 4); c.fill();
          x += w;
        }
        y += h;
      }
      c.fillStyle = '#efe6dc'; c.fillRect(0, 0, W, fz(-.14));       // the pavement along the houses, flagstones and a kerb
      c.strokeStyle = 'rgba(150,130,130,.5)'; c.lineWidth = 2;
      for (let x = 0; x < W; x += 34 + r() * 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, fz(-.14)); c.stroke(); }
      c.fillStyle = '#cdbfc0'; c.fillRect(0, fz(-.14) - 5, W, 7);
      for (let i = 0; i < 70; i++) {                                 // fallen petals
        c.fillStyle = ['#ff9fbb', '#ffd1dc', '#ffffff', '#ffd98a'][i % 4]; c.save(); c.translate(r() * W, r() * H); c.rotate(r() * TAU);
        c.beginPath(); c.ellipse(0, 0, 4, 2.4, 0, 0, TAU); c.fill(); c.restore();
      }
    });
    const m = mesh(new THREE.PlaneGeometry(1, d), mat('#ffffff', { map: tex, roughness: .95 }), 0, .001, d / 2);
    m.rotation.x = -Math.PI / 2; m.castShadow = false; root.add(m);
    return root;
  }

  /* ── houses ── */
  /** roof tiles: rows of scallops in shades of its colour */
  function tiles(color) {
    return (c, W, H) => {
      const base = new THREE.Color(color), r = seeded(color.charCodeAt(2) * 7 + color.charCodeAt(4));
      c.fillStyle = color; c.fillRect(0, 0, W, H);
      for (let y = 0, row = 0; y < H; y += 12, row++) for (let x = (row % 2) * 8 - 8; x < W; x += 16) {
        c.fillStyle = `#${base.clone().multiplyScalar(.84 + r() * .28).getHexString()}`; c.beginPath(); c.arc(x + 8, y + 2, 8, 0, Math.PI); c.fill();
        c.strokeStyle = 'rgba(70,30,40,.25)'; c.lineWidth = 1.2; c.stroke();
      }
    };
  }
  /** a house front, painted: plaster, windows with shutters and curtains, a door, a shop window with its name; lit: only
      the panes, for their glow at dusk. o.windows: [x, y, w, h, kind] as fractions of the face (kind 'arch' or 'round') */
  function facade(o, lit) {
    return (c, W, H) => {
      const r = seeded(o.seed);
      c.fillStyle = lit ? '#000000' : o.wall; c.fillRect(0, 0, W, H);
      if (!lit) {
        for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(120,70,60,${.02 + r() * .04})`; c.beginPath(); c.ellipse(r() * W, r() * H, 4 + r() * 12, 2 + r() * 6, 0, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(80,40,50,.14)'; c.fillRect(0, H * .94, W, H * .06);
        c.fillStyle = o.trim; c.fillRect(0, 0, W, H * .035);
        if (o.floor) c.fillRect(0, H * (1 - o.floor) - 3, W, 6);
        c.fillStyle = 'rgba(255,255,255,.4)';
        for (const x of [0, W * .955]) for (let y = H * .06; y < H * .9; y += H * .11) c.fillRect(x, y, W * .045, H * .065);   // corner stones
      }
      for (const [x, y, w, h, kind] of o.windows) {
        const X = x * W, Y = y * H, ww = w * W, hh = h * H, top = Y - hh / 2;
        const pane = () => {
          c.beginPath();
          if (kind === 'round') c.arc(X, Y, ww / 2, 0, TAU);
          else if (kind === 'arch') { c.moveTo(X - ww / 2, Y + hh / 2); c.lineTo(X - ww / 2, top + ww / 2); c.arc(X, top + ww / 2, ww / 2, Math.PI, 0); c.lineTo(X + ww / 2, Y + hh / 2); c.closePath(); }
          else c.rect(X - ww / 2, top, ww, hh);
        };
        if (lit) { if (r() < .85) { c.fillStyle = '#ffcf7a'; pane(); c.fill(); } continue; }
        if (kind !== 'round') {                                      // shutters, slatted
          c.fillStyle = o.shutter;
          for (const sx of [X - ww / 2 - ww * .44, X + ww / 2 + ww * .06]) {
            c.fillRect(sx, top, ww * .38, hh); c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1.5;
            for (let k = 1; k < 6; k++) { c.beginPath(); c.moveTo(sx + 2, top + hh * k / 6); c.lineTo(sx + ww * .38 - 2, top + hh * k / 6); c.stroke(); }
          }
        }
        c.fillStyle = '#4d5f8f'; pane(); c.fill();
        c.save(); pane(); c.clip();
        c.fillStyle = 'rgba(255,238,244,.85)';                      // curtains tied back, a gleam on the glass
        c.beginPath(); c.moveTo(X - ww / 2, top); c.lineTo(X - ww * .12, top); c.lineTo(X - ww / 2, Y + hh * .3); c.fill();
        c.beginPath(); c.moveTo(X + ww / 2, top); c.lineTo(X + ww * .12, top); c.lineTo(X + ww / 2, Y + hh * .3); c.fill();
        c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.moveTo(X - ww * .3, Y + hh / 2); c.lineTo(X + ww * .1, top); c.lineTo(X + ww * .3, top); c.lineTo(X - ww * .1, Y + hh / 2); c.fill();
        c.restore();
        c.strokeStyle = '#fffaf2'; c.lineWidth = Math.max(2.5, ww * .1); pane(); c.stroke();
        c.lineWidth = Math.max(1.5, ww * .06); c.beginPath(); c.moveTo(X, top + (kind === 'arch' ? ww * .2 : 0)); c.lineTo(X, Y + hh / 2);
        if (kind !== 'round') { c.moveTo(X - ww / 2, Y + hh * .05); c.lineTo(X + ww / 2, Y + hh * .05); }
        c.stroke();
        c.fillStyle = o.trim; c.fillRect(X - ww * .62, Y + hh / 2, ww * 1.24, Math.max(4, hh * .08));   // the sill
      }
      if (o.door) {
        const [x, w, h] = o.door, X = x * W, ww = w * W, hh = h * H, top = H - hh;
        const arch = () => { c.beginPath(); c.moveTo(X - ww / 2, H); c.lineTo(X - ww / 2, top + ww / 2); c.arc(X, top + ww / 2, ww / 2, Math.PI, 0); c.lineTo(X + ww / 2, H); c.closePath(); };
        if (lit) { c.fillStyle = '#ffcf7a'; c.beginPath(); c.arc(X, top + ww / 2, ww * .32, Math.PI, 0); c.fill(); }
        else {
          c.fillStyle = o.doorColor || o.shutter; arch(); c.fill();
          c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 2;
          for (const k of [-.22, .22]) c.strokeRect(X + k * ww - ww * .14, top + hh * .4, ww * .28, hh * .42);
          c.fillStyle = '#ffe3a0'; c.beginPath(); c.arc(X, top + ww / 2, ww * .32, Math.PI, 0); c.fill();   // the fanlight
          c.fillStyle = '#e8b84a'; c.beginPath(); c.arc(X + ww * .3, top + hh * .62, Math.max(2.5, ww * .05), 0, TAU); c.fill();
          c.strokeStyle = o.trim; c.lineWidth = Math.max(3, ww * .08); arch(); c.stroke();
        }
      }
      if (o.shop) {                                                  // the flower shop: its name, and flowers in the window
        const [x, w, h] = o.shop, X = x * W, ww = w * W, hh = h * H, top = H - hh;
        if (lit) { c.fillStyle = '#ffd98c'; c.fillRect(X - ww / 2, top, ww, hh * .82); }
        else {
          c.fillStyle = '#3f6f5c'; c.fillRect(X - ww / 2 - 6, top - 30, ww + 12, hh + 30);
          c.fillStyle = '#fff6e0'; c.font = `700 ${Math.round(W * .085)}px ${kit.HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText('Tiệm hoa', X, top - 14);
          c.fillStyle = '#5e7fa6'; c.fillRect(X - ww / 2, top, ww, hh * .82);
          for (let i = 0; i < 46; i++) {                             // pots and bunches behind the glass
            c.fillStyle = ['#ff7fa3', '#fff', '#ffd166', '#ff9a76', '#c9a7ff', '#5fae62', '#5fae62'][i % 7];
            c.beginPath(); c.arc(X - ww / 2 + 8 + r() * (ww - 16), top + hh * (.3 + r() * .5), 4 + r() * 6, 0, TAU); c.fill();
          }
          c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(X - ww * .3, top + hh * .82); c.lineTo(X - ww * .05, top); c.lineTo(X + ww * .1, top); c.lineTo(X - ww * .15, top + hh * .82); c.fill();
          c.strokeStyle = '#fffaf2'; c.lineWidth = 6; c.strokeRect(X - ww / 2, top, ww, hh * .82);
        }
      }
    };
  }
  /** a house with its gable to the lane: the painted front, tiled slopes, a round window up in the gable, flower boxes
      under some windows. Its lit panes (and the gable's window) glow from o.lightAt */
  function house(o) {
    const g = new THREE.Group(); g.position.set(o.x, 0, o.z);
    const wall = mat(o.wall), th = Math.round(256 * o.h / o.w);
    const face = mat('#ffffff', { map: kit.canvasTexture(256, th, facade(o, false)), emissive: 0xffffff, emissiveMap: kit.canvasTexture(128, Math.round(th / 2), facade(o, true)), emissiveIntensity: 0 });
    g.add(mesh(new THREE.BoxGeometry(o.w, o.h, o.d), [wall, wall, wall, wall, face, wall], 0, o.h / 2, 0));
    const ov = .012, half = o.w / 2 + ov, slope = Math.hypot(half, o.rh), a = Math.atan2(o.rh, half);
    const roof = mat('#ffffff', { map: kit.canvasTexture(128, 128, tiles(o.roof)), roughness: .7 });
    for (const s of [-1, 1]) { const slab = mesh(new THREE.BoxGeometry(slope + .006, .008, o.d + ov * 2), roof, s * half / 2, o.h + o.rh / 2 + .003, 0); slab.rotation.z = -s * a; g.add(slab); }
    g.add(mesh(new THREE.ExtrudeGeometry(new THREE.Shape([V2(-o.w / 2, 0), V2(o.w / 2, 0), V2(0, o.rh * .96)]), { depth: o.d, bevelEnabled: false }), wall, 0, o.h, -o.d / 2));
    g.add(mesh(new THREE.CylinderGeometry(.0045, .0045, o.d + ov * 2, 6).rotateX(Math.PI / 2), mat(o.roof, { roughness: .6 }), 0, o.h + o.rh + .004, 0));
    const round = mat('#4d5f8f', { emissive: 0xffcf7a, emissiveIntensity: 0, roughness: .4 });
    g.add(mesh(new THREE.CircleGeometry(o.rh * .2, 18), round, 0, o.h + o.rh * .36, o.d / 2 + .0008), mesh(new THREE.TorusGeometry(o.rh * .2, .0022, 6, 20), mat(o.trim), 0, o.h + o.rh * .36, o.d / 2 + .001));
    if (o.chimney) g.add(mesh(new THREE.BoxGeometry(.018, .05, .018), mat('#c98a76'), o.w * .24, o.h + o.rh * .75, -o.d * .2));
    const r = seeded(o.seed + 11), flowers = [], box = mat(o.box || '#9b6a4c', { roughness: .85 });
    for (const i of o.boxes || []) {                                 // a flower box under the window, heaped with blooms
      const [x, y, w, h] = o.windows[i], bx = (x - .5) * o.w, by = o.h * (1 - y - h / 2) - .006, bw = w * o.w * 1.25;
      g.add(mesh(new THREE.BoxGeometry(bw, .011, .014), box, bx, by, o.d / 2 + .007));
      heap(flowers, r, bx, by + .009, o.d / 2 + .008, 9, bw * .9, .012, .0042);
      for (let k = 0; k < 3; k++) flowers.push([bx + (r() - .5) * bw, by - .008 - r() * .006, o.d / 2 + .015, .0035, LEAF[k % 3]]);   // trailing ivy
    }
    if (flowers.length) g.add(blooms(flowers));
    return { root: g, lit: [face, round], at: o.lightAt };
  }

  /* the row along the back, left to right: B is the house with the flower balcony, D the flower shop */
  const ROW = [
    { x: -.405, z: -.17, w: .15, d: .1, h: .17, rh: .07, seed: 3, wall: '#ffd6df', roof: '#6f9fd8', trim: '#fffaf2', shutter: '#7fbfb0', floor: .5,
      windows: [[.3, .3, .17, .2], [.72, .3, .17, .2], [.72, .74, .17, .22]], door: [.3, .2, .42], boxes: [0, 1], lightAt: 22.6, pop: .3 },
    { x: -.175, z: -.2, w: .27, d: .11, h: .23, rh: .08, seed: 4, wall: '#fff0d9', roof: '#e8707f', trim: '#fffaf2', shutter: '#8fb3e8', floor: .5,
      windows: [[.18, .3, .12, .22, 'arch'], [.82, .3, .12, .22, 'arch'], [.5, .3, .2, .36, 'arch'], [.16, .73, .12, .2], [.84, .73, .12, .2]],
      door: [.5, .15, .44], doorColor: '#e8707f', boxes: [3, 4], lightAt: 23.1, pop: .45 },
    { x: .045, z: -.21, w: .13, d: .1, h: .27, rh: .07, seed: 5, wall: '#e4dbff', roof: '#5fb8a8', trim: '#fffaf2', shutter: '#f29bb0', floor: .64,
      windows: [[.5, .18, .3, .16, 'arch'], [.5, .5, .3, .16], [.2, .8, .17, .14], [.8, .8, .17, .14]], door: [.5, .22, .3], doorColor: '#7fbfb0', boxes: [1], chimney: true, lightAt: 22.9, pop: .6 },
    { x: .24, z: -.19, w: .21, d: .11, h: .2, rh: .07, seed: 6, wall: '#fff0b3', roof: '#c9789e', trim: '#fffaf2', shutter: '#7fbfb0', floor: .45,
      windows: [[.27, .28, .16, .24], [.73, .28, .16, .24]], door: [.84, .14, .42], doorColor: '#3f6f5c', shop: [.4, .58, .4], boxes: [0, 1], lightAt: 22.4, pop: .75 },
    { x: .435, z: -.165, w: .13, d: .1, h: .16, rh: .06, seed: 7, wall: '#d2efe2', roof: '#e9855a', trim: '#fffaf2', shutter: '#f0b860', floor: .5,
      windows: [[.5, .3, .22, .22], [.3, .74, .17, .2]], door: [.72, .2, .42], boxes: [0], chimney: true, lightAt: 23.4, pop: .9 }
  ];
  const HOME = ROW[1], SHOP = ROW[3];
  const BALCONY = { x0: HOME.x - .125, x1: HOME.x + .125, y: HOME.h * HOME.floor + .004, z0: HOME.z + HOME.d / 2, z1: HOME.z + HOME.d / 2 + .105 };
  /** the house with the balcony: on the upper floor a stone balcony on brackets, its iron railing lined with pots of
      flowers, and a string of little bulbs that light at dusk */
  function makeBalcony(bulbs) {
    const g = new THREE.Group(), { x0, x1, y, z0, z1 } = BALCONY, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2;
    const stone = mat('#f6ebe0', { roughness: .9 }), iron = mat('#3f6f5c', { roughness: .45, metalness: .3 });
    g.add(mesh(new THREE.BoxGeometry(w, .008, d), stone, cx, y - .004, z0 + d / 2));
    for (const k of [-.4, 0, .4]) { const br = mesh(new THREE.BoxGeometry(.012, .022, .03), stone, cx + k * w, y - .019, z0 + .015); br.rotation.x = .5; g.add(br); }
    const rail = .05, posts = [];
    for (let i = 0; i <= 13; i++) posts.push([x0 + .006 + (w - .012) * i / 13, y + rail / 2, z1 - .004]);
    for (const zz of [z0 + .02, z0 + .05, z0 + .08]) for (const xx of [x0 + .004, x1 - .004]) posts.push([xx, y + rail / 2, zz]);
    g.add(copies(new THREE.CylinderGeometry(.0013, .0013, rail, 5), iron, posts));
    g.add(mesh(new THREE.BoxGeometry(w, .004, .005), iron, cx, y + rail, z1 - .004));
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(.005, .004, d), iron, cx + s * (w / 2 - .004), y + rail, z0 + d / 2));
    const r = seeded(41), flowers = [], pot = mat('#d0754e', { roughness: .8 });
    for (const [px, pz, s] of [[x0 + .018, z1 - .016, 1.2], [x0 + .05, z1 - .014, .9], [x1 - .02, z1 - .016, 1.25], [x1 - .055, z1 - .013, .9], [x0 + .016, z0 + .02, 1.1], [x1 - .016, z0 + .025, 1.1]]) {
      g.add(mesh(new THREE.CylinderGeometry(.009 * s, .007 * s, .016 * s, 10), pot, px, y + .008 * s, pz));
      heap(flowers, r, px, y + .02 * s, pz, 8, .02 * s, .016 * s, .0045 * s);
    }
    for (let i = 0; i < 12; i++) flowers.push([x0 + r() * w, y - .006 - r() * .02, z1 + .002, .004 + r() * .002, i % 3 ? LEAF[i % 3] : BLOOMS[i % 7]]);   // ivy over the edge
    heap(flowers, r, cx, y + rail + .004, z1 - .004, 26, w * .95, .008, .004);   // a garland along the rail
    g.add(blooms(flowers));
    const cord = mat('#4a3a3a'), pts = [];                           // the string of bulbs, under the eaves
    for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector3(lerp(x0 - .01, x1 + .01, t), HOME.h - .012 - .018 * Math.sin(Math.PI * t), HOME.z + HOME.d / 2 + .012)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    g.add(mesh(new THREE.TubeGeometry(curve, 30, .0007, 4), cord));
    const glass = mat('#fff3d0', { emissive: 0xffc46b, emissiveIntensity: 0 });
    g.add(copies(new THREE.SphereGeometry(.0032, 8, 6), glass, Array.from({ length: 9 }, (_, i) => curve.getPoint((i + 1) / 10).add({ x: 0, y: -.004, z: 0 }).toArray())));
    bulbs.push(glass);
    return g;
  }
  /** the flower shop: a striped awning over its window, buckets of flowers on the pavement and, on an iron bracket at its
      corner, its hanging sign (the story takes the sign down and gives it the card's words) */
  const SIGN = { x: SHOP.x - SHOP.w / 2 + .012, y: .172, z: SHOP.z + SHOP.d / 2 + .05 };
  function makeShopFront() {
    const g = new THREE.Group(), front = SHOP.z + SHOP.d / 2;
    const stripes = kit.canvasTexture(256, 64, (c, W, H) => {
      for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#fffaf2' : '#f2789a'; c.fillRect(i * W / 12, 0, W / 12 + 1, H); }
      c.globalCompositeOperation = 'destination-out';                 // a scalloped hem
      for (let i = 0; i < 12; i++) { c.beginPath(); c.arc((i + .5) * W / 12, H + 6, W / 24, 0, TAU); c.fill(); }
    });
    const awning = mesh(new THREE.PlaneGeometry(SHOP.w * .66, .04), mat('#ffffff', { map: stripes, transparent: true, alphaTest: .5, side: THREE.DoubleSide, roughness: .7 }),
      SHOP.x + SHOP.w * (.4 - .5), .1, front + .015);
    awning.rotation.x = -.75; g.add(awning);                          // its top edge at the wall, its hem out over the window
    const r = seeded(43), flowers = [], tin = mat('#b8c4cc', { roughness: .4, metalness: .5 });
    for (const [x, s] of [[-.065, 1], [-.035, .85], [-.002, 1.1], [.03, .9]]) {
      const bx = SHOP.x + x, bz = front + .022;
      g.add(mesh(new THREE.CylinderGeometry(.009 * s, .007 * s, .02 * s, 12), tin, bx, .01 * s, bz));
      heap(flowers, r, bx, .026 * s, bz, 10, .02 * s, .016 * s, .0048 * s);
    }
    g.add(blooms(flowers));
    const iron = mat('#2f3f3a', { roughness: .45, metalness: .4 });   // the sign's bracket, sticking out from the corner
    g.add(mesh(new THREE.BoxGeometry(.004, .004, .065), iron, SIGN.x, SIGN.y + .012, front + .032));
    const curl = mesh(new THREE.TorusGeometry(.012, .0018, 6, 18, Math.PI * 1.5), iron, SIGN.x, SIGN.y, front + .014); curl.rotation.y = Math.PI / 2; g.add(curl);
    return g;
  }
  /** the shop's sign: a wooden board in a carved frame, the shop's name painted on both faces; its +z face can carry the
      card's words instead (setWords). Its origin is the ring it hangs from */
  function makeSign() {
    const W = .4, H = .25, root = new THREE.Group();
    const wood = mat('#8a5a3c', { roughness: .7 });
    let words = '';
    const shopFace = c => {                                          // the shop's own face: its name, a bouquet
      const w = c.canvas.width, h = c.canvas.height;
      c.fillStyle = '#3f6f5c'; c.beginPath(); c.roundRect(10, 10, w - 20, h - 20, 40); c.fill();
      c.strokeStyle = '#f6d58a'; c.lineWidth = 10; c.beginPath(); c.roundRect(34, 34, w - 68, h - 68, 26); c.stroke();
      c.fillStyle = '#fff3d6'; kit.fitText(c, 'Tiệm hoa', { x: 90, y: 70, w: w - 180, h: h * .5 }, { maxLines: 1, max: 170 });
      c.fillStyle = '#f6d58a'; c.font = `800 44px ${SANS}`; c.textAlign = 'center'; c.fillText('HOA TƯƠI MỖI NGÀY', w / 2, h * .76);
    };
    const wordsFace = c => {                                         // the card's words, on cream paper in a frame of roses
      const w = c.canvas.width, h = c.canvas.height, r = seeded(61);
      c.fillStyle = '#6b4329'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 44); c.fill();
      c.fillStyle = '#fff8ec'; c.beginPath(); c.roundRect(30, 30, w - 60, h - 60, 30); c.fill();
      c.strokeStyle = 'rgba(232,100,138,.5)'; c.lineWidth = 5; c.setLineDash([18, 12]); c.beginPath(); c.roundRect(52, 52, w - 104, h - 104, 20); c.stroke(); c.setLineDash([]);
      for (const [x, y, s] of [[70, 70, 1], [w - 70, 70, .9], [70, h - 70, .85], [w - 70, h - 70, 1.05], [w / 2, 44, .6], [w / 2, h - 44, .6]]) {
        for (let k = 0; k < 3; k++) { c.fillStyle = '#5fae62'; c.beginPath(); c.ellipse(x + Math.cos(k * 2.1) * 26 * s, y + Math.sin(k * 2.1) * 26 * s, 16 * s, 8 * s, k * 2.1, 0, TAU); c.fill(); }
        c.fillStyle = ['#ff7fa3', '#e64a6f', '#ffb3c6'][(r() * 3) | 0]; c.beginPath(); c.arc(x, y, 20 * s, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(140,20,60,.45)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 11 * s, .5, 5.2); c.stroke();
      }
      c.fillStyle = '#5a2a3c'; kit.fitText(c, words, { x: 80, y: 64, w: w - 160, h: h - 128 }, { maxLines: 3, max: 128 });   // short words in two lines, long ones in three
    };
    const faces = [[shopFace, 0], [c => (words ? wordsFace(c) : shopFace(c)), 1]].map(([paint, k]) => {
      const tex = kit.canvasTexture(1024, 640, c => paint(c));
      const m = new THREE.Mesh(geo(new THREE.PlaneGeometry(W, H)), kit.keep(new THREE.MeshStandardMaterial({ map: tex, roughness: .8, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .3 })));
      m.position.set(0, -.02 - H / 2, k ? .006 : -.006); m.rotation.y = k ? 0 : Math.PI; m.castShadow = true; root.add(m);
      return { m, tex, paint };
    });
    root.add(mesh(new THREE.BoxGeometry(W + .012, H + .012, .009), wood, 0, -.02 - H / 2, 0));
    for (const s of [-1, 1]) root.add(mesh(new THREE.CylinderGeometry(.0018, .0018, .022, 5), wood, s * W * .36, -.009, 0));   // its chains
    root.add(mesh(new THREE.BoxGeometry(W * .82, .005, .005), mat('#2f3f3a', { metalness: .4, roughness: .45 }), 0, 0, 0));
    return {
      root, W, H,
      /** the words on its front face; repainted at once (and again when the handwriting arrives) */
      setWords(text) {
        words = String(text || '');
        const f = faces[1], c = f.tex.image.getContext('2d'); c.clearRect(0, 0, 1024, 640); f.paint(c); f.tex.needsUpdate = true;
      },
      glow(k) { faces.forEach(f => { f.m.material.emissiveIntensity = k; }); }
    };
  }

  /* bunting from gable to gable along the row, triangles that flap (harder in a gust), paper lanterns at the dips */
  function makeBunting() {
    const g = new THREE.Group(), cord = mat('#f4efe6', { roughness: .9 }), flags = [], lanterns = [];
    const peaks = ROW.map(h => new THREE.Vector3(h.x, h.h + h.rh - .01, h.z + h.d / 2 + .02));
    peaks.unshift(new THREE.Vector3(-.5, .16, -.12)); peaks.push(new THREE.Vector3(.5, .16, -.11));
    const tri = geo(new THREE.ShapeGeometry(new THREE.Shape([V2(-.5, 0), V2(0, -1.15), V2(.5, 0)])));
    const cols = ['#e8648a', '#ffd166', '#6fc3df', '#ffffff', '#9bd88a', '#c9a7ff', '#ff9a76'];
    const paper = mat('#ffe1b0', { emissive: 0xffa94d, emissiveIntensity: 0, roughness: .6 });
    for (let s = 0; s < peaks.length - 1; s++) {
      const a = peaks[s], b = peaks[s + 1], sag = .03 + .01 * (s % 2);
      const at = t => new THREE.Vector3().lerpVectors(a, b, t).add({ x: 0, y: -sag * Math.sin(Math.PI * t), z: .012 * Math.sin(Math.PI * t) });
      g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 11 }, (_, i) => at(i / 10))), 20, .0007, 4), cord));
      const n = Math.max(3, Math.round(a.distanceTo(b) / .024));
      for (let i = 1; i < n; i++) flags.push({ p: at(i / n), c: cols[(s * 3 + i) % cols.length] });
      if (s > 0 && s < peaks.length - 2) {                           // a paper lantern where it dips
        const p = at(.5), lan = new THREE.Group(); lan.position.set(p.x, p.y - .002, p.z);
        lan.add(mesh(new THREE.SphereGeometry(.009, 12, 10).scale(1, 1.15, 1), paper, 0, -.012, 0), mesh(new THREE.CylinderGeometry(.004, .004, .004, 8), mat('#c9504a'), 0, -.002, 0));
        const glow = kit.glow({ color: 0xffb35c, size: .07, opacity: 0 }); glow.position.y = -.012; lan.add(glow);
        g.add(lan); lanterns.push({ lan, glow });
      }
    }
    const pennants = new THREE.InstancedMesh(tri, mat('#ffffff', { side: THREE.DoubleSide, roughness: .85 }), flags.length), col = new THREE.Color();
    flags.forEach((f, i) => pennants.setColorAt(i, col.set(f.c))); pennants.frustumCulled = false; g.add(pennants);
    const q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(.017, .017, .017), m4 = new THREE.Matrix4();
    return {
      root: g,
      pose(T, gust, dusk) {
        flags.forEach((f, i) => {                                    // each swings from its own point on the cord
          e.set((.22 + gust * .9) * Math.sin(T * (3 + gust * 9) + i * .8) - gust * .5, .2 * Math.sin(T * 2.3 + i), 0);
          pennants.setMatrixAt(i, m4.compose(f.p, q.setFromEuler(e), one));
        });
        pennants.instanceMatrix.needsUpdate = true;
        paper.emissiveIntensity = 1.3 * dusk;
        lanterns.forEach((l, i) => { l.lan.rotation.z = (.08 + gust * .4) * Math.sin(T * (2 + gust * 6) + i); l.glow.material.opacity = .9 * dusk * (1 + .08 * Math.sin(T * 9 + i * 3)); });
      }
    };
  }

  /* a lamp post: a curled iron post and a lantern that lights at dusk */
  function lampPost(x, z) {
    const g = new THREE.Group(), iron = mat('#2f3f3a', { roughness: .45, metalness: .35 });
    const glass = mat('#fff2cf', { emissive: 0xffb050, emissiveIntensity: 0, roughness: .3 }), glow = kit.glow({ color: 0xffc070, size: .12, opacity: 0 });
    g.add(mesh(new THREE.CylinderGeometry(.0035, .005, .19, 8), iron, 0, .095, 0), mesh(new THREE.CylinderGeometry(.01, .013, .012, 10), iron, 0, .006, 0),
      mesh(new THREE.BoxGeometry(.016, .022, .016), glass, 0, .2, 0), mesh(new THREE.ConeGeometry(.015, .014, 4).rotateY(Math.PI / 4), iron, 0, .218, 0),
      mesh(new THREE.TorusGeometry(.008, .0014, 5, 14, Math.PI * 1.4), iron, .009, .17, 0));
    g.position.set(x, 0, z); glow.position.y = .2; g.add(glow);
    return { root: g, glass, glow };
  }

  /* a round stone planter heaped with flowers, for the lane's front corners */
  function planter(x, z, seed) {
    const g = new THREE.Group(), stone = mat('#efe3d6', { roughness: .9 }), r = seeded(seed), flowers = [];
    g.add(mesh(new THREE.CylinderGeometry(.034, .026, .036, 18), stone, 0, .018, 0), mesh(new THREE.TorusGeometry(.034, .004, 6, 20).rotateX(Math.PI / 2), stone, 0, .036, 0));
    heap(flowers, r, 0, .042, 0, 26, .058, .058, .0062);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + r(); flowers.push([Math.cos(a) * .036, .03 - r() * .02, Math.sin(a) * .036, .005, LEAF[i % 3]]); }   // trailing over the rim
    g.add(blooms(flowers)); g.position.set(x, 0, z);
    return g;
  }

  /* the weathervane on the tall house: an arrow with a heart for its tail, which spins in the gust */
  function makeVane() {
    const h = ROW[2], g = new THREE.Group(), iron = mat('#2f3f3a', { roughness: .4, metalness: .5 }), gold = mat('#e8b84a', { roughness: .35, metalness: .6 });
    g.position.set(h.x, h.h + h.rh, h.z);
    g.add(mesh(new THREE.CylinderGeometry(.0016, .0016, .065, 6), iron, 0, .032, 0));
    for (const a of [0, Math.PI / 2]) { const bar = mesh(new THREE.BoxGeometry(.034, .0016, .0016), iron, 0, .036, 0); bar.rotation.y = a; g.add(bar); }
    const arrow = new THREE.Group(); arrow.position.y = .055; g.add(arrow);
    arrow.add(mesh(new THREE.BoxGeometry(.046, .0024, .0024), gold), mesh(new THREE.ConeGeometry(.005, .012, 4).rotateZ(-Math.PI / 2), gold, .027, 0, 0));
    const heart = new THREE.Shape(); heart.moveTo(0, -.006); heart.bezierCurveTo(-.012, .002, -.007, .011, 0, .0045); heart.bezierCurveTo(.007, .011, .012, .002, 0, -.006);
    const tail = mesh(new THREE.ExtrudeGeometry(heart, { depth: .0016, bevelEnabled: false }), mat('#e8648a', { roughness: .4 }), -.024, 0, -.0008);
    tail.rotation.z = Math.PI / 2; arrow.add(tail);
    return { root: g, arrow };
  }

  /* ── birds: a round body, a head, a beak, a fanned tail and two wings on pins that flap; +z is the way it faces ── */
  function makeBird(o = {}) {
    const lit = o.glow ? { emissive: 0xffffff, emissiveIntensity: o.glow } : {};   // a glow keeps a white bird white at dusk
    const g = new THREE.Group(), s = o.size ?? 1, body = mat(o.body ?? '#ffffff', { roughness: .6, ...lit }), wingM = mat(o.wing ?? '#e8e4f0', { roughness: .6, side: THREE.DoubleSide, ...lit });
    const inner = new THREE.Group(); inner.scale.setScalar(s); g.add(inner);
    inner.add(mesh(new THREE.SphereGeometry(1, 12, 10).scale(.0085, .0078, .014), body), mesh(new THREE.SphereGeometry(.0068, 10, 8), body, 0, .006, .011),
      mesh(new THREE.ConeGeometry(.0022, .007, 6).rotateX(Math.PI / 2), mat(o.beak ?? '#f2a33a'), 0, .0055, .019));
    const tail = mesh(new THREE.ShapeGeometry(new THREE.Shape([V2(-.006, 0), V2(.006, 0), V2(.009, -.014), V2(0, -.011), V2(-.009, -.014)])), wingM, 0, .002, -.012);
    tail.rotation.x = -Math.PI / 2 + .25; inner.add(tail);
    const wingShape = new THREE.Shape([V2(0, -.004), V2(.012, -.0055), V2(.024, -.002), V2(.027, .002), V2(.014, .005), V2(0, .005)]);
    const wings = [-1, 1].map(sx => {
      const pin = new THREE.Group(); pin.position.set(sx * .006, .004, .002); inner.add(pin);
      const w = mesh(new THREE.ShapeGeometry(wingShape), wingM); w.rotation.x = -Math.PI / 2; w.scale.x = sx; pin.add(w);
      return pin;
    });
    g.traverse(o => { o.castShadow = false; });
    return { root: g, wings };
  }
  /** flap 0..1 up and down; fold: the wings tucked in (perched) */
  function flapBird(b, flap, fold = 0) {
    const a = lerp(-.15 + flap * .95, -1.35, fold);
    b.wings[0].rotation.z = -a; b.wings[1].rotation.z = a;
    b.wings[0].rotation.y = -fold * .9; b.wings[1].rotation.y = fold * .9;
  }

  /* ── clouds: soft heaps of puffs, flat underneath, tinted by the sky's hour ── */
  function makeCloud(seed, s = 1) {
    const g = new THREE.Group(), r = seeded(seed);
    const m = kit.keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffd9e4, emissiveIntensity: .45, transparent: true, opacity: 1 }));
    const puffs = [[0, .2, 0, 1], [-.85, 0, .1, .78], [.9, .02, -.05, .82], [-.38, .45, -.05, .72], [.42, .42, .08, .7], [-1.45, -.15, 0, .5], [1.5, -.12, .05, .52], [0, -.1, .45, .7]];
    const heapM = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(1, 12, 9)), m, puffs.length), q = new THREE.Matrix4();
    puffs.forEach(([x, y, z, k], i) => heapM.setMatrixAt(i, q.makeScale(k * .03 * s, k * .026 * s * (y < 0 ? .7 : 1), k * .03 * s * (.8 + r() * .3)).setPosition(x * .028 * s, y * .028 * s, z * .028 * s)));
    heapM.frustumCulled = false; g.add(heapM);
    return { root: g, m };
  }

  /* ── rings of light where a foot lands on the air: a pool, each born at a story time; it flashes, then glows out ── */
  function makeRings(n = 30) {
    const tex = kit.canvasTexture(256, 256, (c, W) => {
      const m = W / 2, g = c.createRadialGradient(m, m, 0, m, m, m);
      [[0, 'rgba(255,240,220,.18)'], [.5, 'rgba(255,214,226,.3)'], [.66, 'rgba(255,190,215,.85)'], [.74, 'rgba(255,255,255,1)'], [.8, 'rgba(255,236,190,.9)'], [.9, 'rgba(255,190,150,.3)'], [1, 'rgba(255,180,150,0)']]
        .forEach(([k, col]) => g.addColorStop(k, col));
      c.fillStyle = g; c.fillRect(0, 0, W, W);
    });
    const plane = geo(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), halo = geo(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    const list = Array.from({ length: n }, () => {
      const m = new THREE.Mesh(plane, kit.keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
      const h = new THREE.Mesh(halo, kit.keep(new THREE.MeshBasicMaterial({ map: tex, color: 0xff9fc0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })));
      m.renderOrder = 4; h.renderOrder = 3; m.visible = h.visible = false;
      return { m, h, at: -99, size: .07, life: 3 };
    });
    let next = 0;
    return {
      list,
      /** a ring at (x, y, z), born at story time `at` */
      spawn(x, y, z, at, size = .07, life = 3) {
        const q = list[next]; next = (next + 1) % n;
        q.m.position.set(x, y + .002, z); q.h.position.set(x, y + .001, z); q.at = at; q.size = size; q.life = life;
      },
      /** g the story's time; T the act's, for a shimmer */
      pose(g, T) {
        for (const q of list) {
          const age = g - q.at, on = age >= 0 && age < q.life; q.m.visible = q.h.visible = on; if (!on) continue;
          const k = age / q.life, flash = Math.exp(-age * 5);
          q.m.material.opacity = (.75 + .6 * flash) * (1 - ease.smooth(seg(k, .45, 1))) * (1 + .06 * Math.sin(T * 12 + q.at * 7));
          q.m.scale.setScalar(q.size * (lerp(.55, 1, ease.out(seg(age, 0, .3))) + .25 * k));
          q.h.material.opacity = .55 * flash; q.h.scale.setScalar(q.size * (1 + 1.6 * ease.out(seg(age, 0, .6))));
        }
      },
      clear() { list.forEach(q => { q.at = -99; q.m.visible = q.h.visible = false; }); }
    };
  }

  /* ── her flower basket: woven wicker, a handle, heaped with blooms; its origin is the top of the handle ── */
  function makeBasket() {
    const g = new THREE.Group(), inner = new THREE.Group(); inner.position.y = -.034; g.add(inner);
    const weave = kit.canvasTexture(128, 64, (c, W, H) => {
      c.fillStyle = '#c8955c'; c.fillRect(0, 0, W, H);
      for (let y = 0, row = 0; y < H; y += 8, row++) for (let x = (row % 2) * 8; x < W; x += 16) {
        c.fillStyle = '#dcae74'; c.beginPath(); c.ellipse(x + 4, y + 4, 6, 3, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(110,70,30,.5)'; c.lineWidth = 1; c.stroke();
      }
    });
    const prof = [[0, 0], [.012, 0], [.0155, .003], [.019, .018], [.0205, .021], [.019, .022]].map(([x, y]) => V2(x, y));
    inner.add(mesh(new THREE.LatheGeometry(prof, 18), mat('#ffffff', { map: weave, roughness: .9, side: THREE.DoubleSide })));
    const handle = mesh(new THREE.TorusGeometry(.017, .0017, 6, 20, Math.PI), mat('#b07d4a', { roughness: .8 }), 0, .02, 0); inner.add(handle);
    const r = seeded(29), flowers = [];
    heap(flowers, r, 0, .024, 0, 14, .03, .024, .0055, ['#ff7fa3', '#ffffff', '#ffd166', '#e64a6f', '#ffb3c6']);
    inner.add(blooms(flowers));
    return g;
  }

  return { ROW, BALCONY, SIGN, makePage, makeLane, house, makeBalcony, makeShopFront, makeSign,
    makeBunting, lampPost, planter, makeVane, makeBird, flapBird, makeCloud, makeRings, makeBasket };
};
