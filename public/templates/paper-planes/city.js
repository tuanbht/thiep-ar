/* Máy bay giấy: the windy street, built in code for story.js (template.json "story" loads city.js, paper.js, then
   story.js). A pop-up page of far office towers at the back, two blocks facing the phone across the road (his office
   block on the left, her block on the right with her window, her door and a café), the alley between them where lost
   paper planes pile up, the road with its zebra crossing, a lamp, a post box and a crossing light. Everything is drawn
   twice: in pencil greys on cream paper, and again in the warm colours that seep in at the end; warm(k, at) fades each
   warm copy in as a wave spreads from where the two of them meet.
     NM_PLANES.city(kit, layout) → { herRoom (its lamp: herRoom.m), door, curtains, signal.set(walk), lamp, warm(k, at, T) } */
(window.NM_PLANES = window.NM_PLANES || {}).city = (kit, L) => {
  const { THREE, stage, clamp, lerp, ease, seg } = kit;
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .85, ...o }));
  const mesh = (geo, m, parent, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(kit.keep(geo), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent && parent.add(o); return o;
  };
  const GREY = { ink: '#2c3038', pen: '#555b64', pencil: '#8a9098', soft: '#b7bbbf', faint: '#d3d4d2', paper: '#f4f0e6', wall: '#e2dfd8',
    wall2: '#d2cfc8', glass: '#7d838c', road: '#a9aaa9', walk: '#dcd9d1' };
  const WARM = { ink: '#4b3029', pen: '#7a4c3c', pencil: '#b07a62', soft: '#e0b496', faint: '#f3d9c0', paper: '#fff1de', wall: '#f6d7b4',
    wall2: '#e9a989', glass: '#ffcf7a', road: '#c99a86', walk: '#f7dcc0' };

  /* ── pencil: wobbly lines, boxes and hatching, all from a seeded random so a repaint draws the same ── */
  function line(c, r, x0, y0, x1, y1, wob = 1.2) {
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 22));
    c.beginPath(); c.moveTo(x0 + (r() - .5) * wob, y0 + (r() - .5) * wob);
    for (let i = 1; i <= n; i++) c.lineTo(lerp(x0, x1, i / n) + (r() - .5) * wob, lerp(y0, y1, i / n) + (r() - .5) * wob);
    c.stroke();
  }
  const frame = (c, r, x, y, w, h, wob) => { line(c, r, x, y, x + w, y, wob); line(c, r, x + w, y, x + w, y + h, wob); line(c, r, x + w, y + h, x, y + h, wob); line(c, r, x, y + h, x, y, wob); };
  function hatch(c, r, x, y, w, h, gap = 7, ang = 1, alpha = .3) {   // diagonal strokes clipped to a box: pencil shade
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.globalAlpha *= alpha;
    const d = Math.hypot(w, h), ca = Math.cos(ang), sa = Math.sin(ang), cx = x + w / 2, cy = y + h / 2;
    for (let s = -d / 2; s < d / 2; s += gap * (.7 + r() * .6)) line(c, r, cx + s * sa - ca * d / 2, cy - s * ca - sa * d / 2, cx + s * sa + ca * d / 2, cy - s * ca + sa * d / 2, 1.4);
    c.restore();
  }
  /** a window: a frame, panes, and inside it blinds, a plant, a lamp or a curtain; lit, the panes glow */
  function pane(c, r, x, y, w, h, P, warm, kind = (r() * 5) | 0) {
    c.fillStyle = warm ? (r() < .75 ? P.glass : '#f2a77e') : (r() < .5 ? P.glass : '#999ea6'); c.fillRect(x, y, w, h);
    if (!warm) hatch(c, r, x, y, w, h, 5, .8, .45);
    c.strokeStyle = P.ink; c.lineWidth = Math.max(1.5, w * .06);
    if (kind === 0) for (let k = 1; k < 6; k++) line(c, r, x, y + h * k / 6, x + w, y + h * k / 6, .8);   // blinds
    if (kind === 1) {                                                // a plant on the sill
      c.fillStyle = warm ? '#7aa860' : P.pen; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(x + w * (.3 + r() * .4), y + h * (.55 + r() * .2), w * .12, h * .08, r() * 3, 0, TAU); c.fill(); }
      c.fillStyle = warm ? '#c8653f' : P.ink; c.fillRect(x + w * .38, y + h * .78, w * .24, h * .16);
    }
    if (kind === 2) { c.fillStyle = warm ? '#fff3c4' : P.paper; c.beginPath(); c.moveTo(x + w * .3, y + h * .55); c.lineTo(x + w * .7, y + h * .55); c.lineTo(x + w * .6, y + h * .35); c.lineTo(x + w * .4, y + h * .35); c.fill(); }   // a desk lamp's shade
    if (kind === 3) { c.fillStyle = warm ? '#fbe3c8' : P.faint; c.fillRect(x, y, w * .3, h); c.fillRect(x + w * .7, y, w * .3, h); }   // curtains
    c.lineWidth = Math.max(2, w * .08); frame(c, r, x, y, w, h, 1.2);
    line(c, r, x + w / 2, y, x + w / 2, y + h, 1); c.lineWidth = Math.max(2, w * .1); line(c, r, x - w * .08, y + h + 2, x + w * 1.08, y + h + 2, 1);   // the sill
  }

  /* ── the page at the back: sky, wind and far office towers (stage x -.55..55, y 0..H) ── */
  const PAGE = { width: 1.1, height: .95, curve: .06, z: -.3 };
  function towers(c, W, H, warm) {
    const P = warm ? WARM : GREY, r = seeded(31), X = x => (x / PAGE.width + .5) * W, Y = y => H - y / PAGE.height * H;
    const sky = c.createLinearGradient(0, 0, 0, H);
    (warm ? [[0, '#f7b98f'], [.35, '#ffd6a6'], [.62, '#ffe8c4'], [1, '#ffc9a2']] : [[0, '#e3e2de'], [.5, '#efede7'], [1, '#f6f3ec']]).forEach(([k, col]) => sky.addColorStop(k, col));
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    if (warm) {                                                      // the low sun between the towers
      const s = c.createRadialGradient(X(.22), Y(.62), 0, X(.22), Y(.62), W * .3);
      s.addColorStop(0, 'rgba(255,250,224,1)'); s.addColorStop(.18, 'rgba(255,226,160,.85)'); s.addColorStop(1, 'rgba(255,190,150,0)'); c.fillStyle = s; c.fillRect(0, 0, W, H);
    }
    c.strokeStyle = P.pencil; c.lineWidth = 2;                       // clouds: pencil outlines, shaded underneath
    for (let i = 0; i < 6; i++) {
      const cx = r() * W, cy = H * (.06 + r() * .2), s = 40 + r() * 50;
      c.fillStyle = warm ? (i % 2 ? '#fff4e2' : '#ffe1c8') : (i % 2 ? '#f7f6f2' : '#ecebe7');
      for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(cx + (k - 2) * s * .45, cy + (k % 2 ? -s * .16 : 0), s * .42, s * .28, 0, 0, TAU); c.fill(); c.stroke(); }
      hatch(c, r, cx - s * 1.1, cy + s * .05, s * 2.2, s * .26, 5, .5, warm ? .15 : .3);
    }
    c.strokeStyle = P.pen; c.lineWidth = 1.6;                        // wind: long curls drawn in a breath
    for (let i = 0; i < 7; i++) {
      const x0 = r() * W * .8, y0 = H * (.05 + r() * .3), len = 120 + r() * 160, rr = 10 + r() * 12;
      c.setLineDash([10, 7]); c.beginPath(); c.moveTo(x0, y0);
      c.bezierCurveTo(x0 + len * .4, y0 - 14, x0 + len * .7, y0 + 10, x0 + len, y0); c.stroke();
      c.beginPath(); c.arc(x0 + len, y0 - rr, rr, Math.PI / 2, Math.PI * 2.1, true); c.stroke(); c.setLineDash([]);
    }
    for (let i = 0; i < 9; i++) {                                    // birds far off
      const x = r() * W, y = H * (.08 + r() * .25), s = 5 + r() * 5; c.beginPath();
      c.moveTo(x - s, y - s * .4); c.quadraticCurveTo(x - s * .4, y - s * .6, x, y); c.quadraticCurveTo(x + s * .4, y - s * .6, x + s, y - s * .4); c.stroke();
    }
    for (const [far, n, h0, h1, tone] of [[1, 14, .52, .86, warm ? '#f2c8a6' : '#d6d6d3'], [0, 11, .6, .8, warm ? '#e8a986' : '#c3c4c4']]) {
      let x = -.56;
      for (let i = 0; i < n && x < .56; i++) {                      // a row of towers, each its own width and height
        const w = (far ? .06 : .08) + r() * .07, h = h0 + r() * (h1 - h0), x0 = X(x), x1 = X(x + w), y0 = Y(h);
        c.fillStyle = tone; c.fillRect(x0, y0, x1 - x0, H - y0);
        hatch(c, r, x1 - (x1 - x0) * .28, y0, (x1 - x0) * .28, H - y0, 6, 1.1, warm ? .18 : .35);   // the shaded side
        c.strokeStyle = P.pen; c.lineWidth = far ? 1.4 : 2; frame(c, r, x0, y0, x1 - x0, H - y0, 1.5);
        const cols = 2 + ((r() * 3) | 0), rows = Math.floor((H - y0) / (12 + r() * 6)), cw = (x1 - x0) / (cols * 1.6 + .6);
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {   // windows, a few lit at the end
          const lit = warm && r() < .45;
          c.fillStyle = lit ? '#ffd27a' : warm ? '#b9735c' : (r() < .3 ? '#7f858d' : '#a1a5aa');
          c.fillRect(x0 + cw * (.6 + col * 1.6), y0 + 8 + row * (H - y0 - 10) / rows, cw, (H - y0) / rows * .5);
        }
        if (r() < .4) {                                              // a water tank or an aerial on the roof
          c.strokeStyle = P.ink; c.lineWidth = 1.6;
          if (r() < .5) { const tx = x0 + (x1 - x0) * (.2 + r() * .4), tw = 14 + r() * 8; c.fillStyle = tone; c.fillRect(tx, y0 - tw * 1.1, tw, tw * .8); frame(c, r, tx, y0 - tw * 1.1, tw, tw * .8, 1);
            line(c, r, tx + 2, y0 - tw * .3, tx + 2, y0, 1); line(c, r, tx + tw - 2, y0 - tw * .3, tx + tw - 2, y0, 1); }
          else { const ax = x0 + (x1 - x0) * r(); line(c, r, ax, y0, ax, y0 - 26 - r() * 20, 1); line(c, r, ax - 7, y0 - 18, ax + 7, y0 - 18, 1); }
        }
        x += w + .005 + r() * .02;
      }
    }
  }

  /* ── the two blocks across the road: a painted front (holes where her window and door open), plain sides and roof,
        a cornice, ledges, a water tank; the warm copy of the front sits a hair in front of it and fades in ── */
  const holes = [];                                                  // her window and door: cut out of both fronts
  function blockFront(o, warm) {
    return (c, W, H) => {
      const P = warm ? WARM : GREY, r = seeded(o.seed), X = x => (x - o.x0) / (o.x1 - o.x0) * W, Y = y => H - y / o.h * H;
      c.fillStyle = warm ? o.warmWall : P.wall; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(80,70,60,${.02 + r() * .04})`; c.fillRect(r() * W, r() * H, 6 + r() * 30, 3 + r() * 8); }   // stains
      c.strokeStyle = P.pencil; c.lineWidth = 1.2;
      for (let y = 6; y < H; y += 9 + r() * 4) for (let x = (y % 2) * 14; x < W; x += 26 + r() * 10) { c.globalAlpha = .25; line(c, r, x, y, x + 18, y, .6); }   // brick courses
      c.globalAlpha = 1;
      hatch(c, r, 0, 0, W, H, 9, .95, warm ? .07 : .14);
      o.paint(c, r, X, Y, P, warm, W, H);
      c.strokeStyle = P.ink; c.lineWidth = 4; frame(c, r, 2, 2, W - 4, H - 4, 1.5);
      for (const h of holes) if (h.block === o) { c.clearRect(X(h.x0), Y(h.y1), X(h.x1) - X(h.x0), Y(h.y0) - Y(h.y1)); }   // her window, her door
    };
  }
  function block(o) {
    const g = new THREE.Group(), w = o.x1 - o.x0, d = o.d, z = L.FRONT;
    const side = mat(GREY.wall2), top = mat('#c9c6bf'), open = kit.keep(new THREE.MeshBasicMaterial({ visible: false }));
    /* the body has no front of its own: the painted front is the wall, so her window and door look into the rooms behind */
    g.add(mesh(new THREE.BoxGeometry(w, o.h, d - .002), [side, side, top, side, open, side], null, (o.x0 + o.x1) / 2, o.h / 2, z - d / 2 - .001));
    const px = 512, pyx = Math.round(px * o.h / w);
    const fronts = [false, true].map(warm => {
      const tex = kit.canvasTexture(px, pyx, blockFront(o, warm));
      const m = mat('#ffffff', { map: tex, alphaTest: .5, transparent: warm, opacity: warm ? 0 : 1, depthWrite: !warm, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .18 });
      const f = mesh(new THREE.PlaneGeometry(w, o.h), m, g, (o.x0 + o.x1) / 2, o.h / 2, z + (warm ? .0012 : .0004));
      f.castShadow = false; if (warm) f.renderOrder = 1;
      return m;
    });
    const trim = mat('#bdbab3');                                     // a cornice, a ledge per floor: the front is not flat
    g.add(mesh(new THREE.BoxGeometry(w + .016, .018, .03), trim, null, (o.x0 + o.x1) / 2, o.h + .006, z - .008));
    for (const y of o.ledges) g.add(mesh(new THREE.BoxGeometry(w, .008, .016), trim, null, (o.x0 + o.x1) / 2, y, z + .004));
    const tank = new THREE.Group(); tank.position.set(o.tank, o.h + .015, z - d * .55); g.add(tank);   // the water tank on the roof
    const wood = mat('#9a958c');
    tank.add(mesh(new THREE.CylinderGeometry(.028, .028, .05, 16), wood, null, 0, .045, 0), mesh(new THREE.ConeGeometry(.032, .022, 16), mat('#77736d'), null, 0, .081, 0));
    for (const [x, zz] of [[-.02, -.02], [.02, -.02], [-.02, .02], [.02, .02]]) tank.add(mesh(new THREE.CylinderGeometry(.002, .002, .03, 4), wood, null, x, .01, zz));
    stage.add(g);
    return { g, fronts, tints: [[side, GREY.wall2, o.warmSide], [top, '#c9c6bf', '#d9a184'], [trim, '#bdbab3', '#f0c9a4'], [wood, '#9a958c', '#b8775a']] };
  }

  /* his office block, on the left: shop windows below, office floors above */
  const A = { ...L.A, d: .085, seed: 11, warmWall: '#f2cfa8', warmSide: '#d79a78', tank: -.32, ledges: [.17, .3, .43],
    paint(c, r, X, Y, P, warm) {
      c.strokeStyle = P.ink;
      for (const [y0, y1] of [[.19, .28], [.32, .41], [.45, .53]]) for (let x = this.x0 + .03; x < this.x1 - .05; x += .068) pane(c, r, X(x), Y(y1), X(x + .045) - X(x), Y(y0) - Y(y1), P, warm);
      c.fillStyle = warm ? '#ffe2a8' : '#8f949b'; c.fillRect(X(-.33), Y(.15), X(-.17) - X(-.33), Y(0) - Y(.15));   // the glass doors
      hatch(c, r, X(-.33), Y(.15), X(-.17) - X(-.33), Y(0) - Y(.15), 6, .7, warm ? .1 : .5);
      c.lineWidth = 4; frame(c, r, X(-.33), Y(.15), X(-.17) - X(-.33), Y(0) - Y(.15), 1.2); line(c, r, X(-.25), Y(.15), X(-.25), Y(0), 1);
      c.fillStyle = P.ink; c.font = `800 ${Math.round(X(-.3) - X(-.33))}px "Be Vietnam Pro", "Segoe UI", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('VĂN PHÒNG', X(-.25), Y(.163));
      for (const x of [-.47, -.12]) pane(c, r, X(x), Y(.13), X(x + .07) - X(x), Y(.03) - Y(.13), P, warm, 0);   // shop windows
    } };
  /* her block, on the right: her door and the café below, her window above */
  const B = { ...L.B, d: .085, seed: 23, warmWall: '#f7dcc0', warmSide: '#e3a283', tank: .38, ledges: [.37],   // the ledge over her door
    paint(c, r, X, Y, P, warm) {
      const { WIN, DOOR } = L;
      c.strokeStyle = P.ink;
      for (const x of [.08, .43]) pane(c, r, X(x - .035), Y(.6), X(x + .035) - X(x - .035), Y(.45) - Y(.6), P, warm, x < .2 ? 3 : 1);
      c.lineWidth = 5; frame(c, r, X(WIN.x0) - 6, Y(WIN.y1) - 6, X(WIN.x1) - X(WIN.x0) + 12, Y(WIN.y0) - Y(WIN.y1) + 12, 1.5);   // her window's frame
      c.fillStyle = warm ? '#e9a989' : P.soft; c.fillRect(X(DOOR.x0) - 8, Y(DOOR.h) - 14, X(DOOR.x1) - X(DOOR.x0) + 16, 12);   // the door's lintel
      c.fillStyle = P.ink; c.font = `800 ${Math.round((Y(0) - Y(.04)))}px "Be Vietnam Pro", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('12', X(DOOR.x1) + 22, Y(.22));
      const cx0 = .22, cx1 = .47;                                     // the café: a big window and its name
      c.fillStyle = warm ? '#ffd88e' : '#9aa0a7'; c.fillRect(X(cx0), Y(.2), X(cx1) - X(cx0), Y(.03) - Y(.2));
      hatch(c, r, X(cx0), Y(.2), X(cx1) - X(cx0), Y(.03) - Y(.2), 6, .6, warm ? .08 : .45);
      c.lineWidth = 4; frame(c, r, X(cx0), Y(.2), X(cx1) - X(cx0), Y(.03) - Y(.2), 1.2);
      for (let k = 0; k < 3; k++) { c.fillStyle = P.ink; c.beginPath(); c.arc(X(cx0 + .04 + k * .085), Y(.06), 5, 0, TAU); c.fill(); }   // tables inside
      c.fillStyle = P.ink; c.font = `700 ${Math.round(Y(0) - Y(.034))}px "Dancing Script", cursive`; c.fillText('Cà phê Gió', X((cx0 + cx1) / 2), Y(.255));
    } };
  holes.push({ block: B, x0: L.WIN.x0, x1: L.WIN.x1, y0: L.WIN.y0, y1: L.WIN.y1 }, { block: B, x0: L.DOOR.x0, x1: L.DOOR.x1, y0: 0, y1: L.DOOR.h });

  /* her room behind the window (seen through it), with a lamp that comes on; the hall behind her door */
  function room(x0, x1, y0, y1, z0, z1, wall) {
    const m = mat(wall, { side: THREE.BackSide, emissive: 0xffffff, emissiveIntensity: 0 });
    const r = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m, stage, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    r.castShadow = false; return { mesh: r, m };
  }

  /* the street on the card: far pavement, road, zebra crossing, near pavement; the alley's floor dark */
  const FLOOR = { w: 1, d: .625 };                                  // the card itself, edge to edge
  function street(c, W, H, warm) {
    const P = warm ? WARM : GREY, r = seeded(5), X = x => (x / FLOOR.w + .5) * W, Z = z => (z / FLOOR.d + .5) * H;
    const [r0, r1] = L.ROAD, [k0, k1] = L.CROSS;
    c.fillStyle = P.walk; c.fillRect(0, 0, W, H);
    c.strokeStyle = P.pencil; c.lineWidth = 1.5;                       // paving slabs on both pavements
    for (const [z0, z1] of [[-.33, r0], [r1, .33]]) {
      for (let z = z0; z < z1; z += .034) { line(c, r, 0, Z(z), W, Z(z), 1); for (let x = -.53 + ((z * 97) % .05); x < .53; x += .05) line(c, r, X(x), Z(z), X(x), Z(Math.min(z1, z + .034)), 1); }
      hatch(c, r, 0, Z(z0), W, Z(z1) - Z(z0), 11, .5, warm ? .06 : .12);
    }
    c.fillStyle = P.road; c.fillRect(0, Z(r0), W, Z(r1) - Z(r0));   // the road, grainy
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(40,40,40,${.05 + r() * .1})`; c.fillRect(r() * W, Z(r0) + r() * (Z(r1) - Z(r0)), 2, 2); }
    hatch(c, r, 0, Z(r0), W, Z(r1) - Z(r0), 8, .3, warm ? .1 : .2);
    c.fillStyle = warm ? '#fff6e8' : '#f6f4ee';                      // the centre line, the zebra crossing
    for (let x = -.52; x < .53; x += .07) if (x < k0 - .06 || x > k1 + .02) c.fillRect(X(x), Z((r0 + r1) / 2) - 3, X(.035) - X(0), 6);
    for (let x = k0; x < k1; x += .032) { c.fillRect(X(x), Z(r0 + .01), X(.018) - X(0), Z(r1 - .01) - Z(r0 + .01)); c.strokeStyle = P.pen; c.lineWidth = 1.2; frame(c, r, X(x), Z(r0 + .01), X(.018) - X(0), Z(r1 - .01) - Z(r0 + .01), 1); }
    c.strokeStyle = P.ink; c.lineWidth = 3;                           // the curbs
    for (const z of [r0, r1]) line(c, r, 0, Z(z), W, Z(z), 1.5);
    c.fillStyle = warm ? '#5b3c33' : '#3c3f45'; c.fillRect(X(L.A.x1), 0, X(L.B.x0) - X(L.A.x1), Z(L.FRONT));   // the alley's floor
    c.fillStyle = P.pen; c.beginPath(); c.ellipse(X(.36), Z(.2), 16, 10, 0, 0, TAU); c.fill();   // a drain cover
    c.strokeStyle = P.walk; c.lineWidth = 1.5; for (let k = -2; k <= 2; k++) line(c, r, X(.36) - 12, Z(.2) + k * 3.5, X(.36) + 12, Z(.2) + k * 3.5, .5);
  }
  function makeStreet() {
    const px = 1024, geo = new THREE.PlaneGeometry(FLOOR.w, FLOOR.d);
    const grey = new THREE.Mesh(kit.keep(geo), kit.keep(new THREE.MeshBasicMaterial({ map: kit.canvasTexture(px, Math.round(px * FLOOR.d / FLOOR.w), (c, w, h) => street(c, w, h, false)), toneMapped: false })));
    grey.rotation.x = -Math.PI / 2; grey.position.y = .0008; grey.receiveShadow = true; stage.add(grey);
    const spot = kit.canvasTexture(256, 256, (c, w) => {               // the warm wave's edge, soft
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, '#fff'); g.addColorStop(.7, '#fff'); g.addColorStop(1, '#000');
      c.fillStyle = '#000'; c.fillRect(0, 0, w, w); c.fillStyle = g; c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, TAU); c.fill();
    });
    spot.wrapS = spot.wrapT = THREE.ClampToEdgeWrapping;
    const warmM = kit.keep(new THREE.MeshBasicMaterial({ map: kit.canvasTexture(px, Math.round(px * FLOOR.d / FLOOR.w), (c, w, h) => street(c, w, h, true)),
      alphaMap: spot, transparent: true, depthWrite: false, toneMapped: false }));
    const warm = new THREE.Mesh(kit.keep(geo), warmM); warm.rotation.x = -Math.PI / 2; warm.position.y = .0011; warm.renderOrder = 1; stage.add(warm);
    return { grey, warm, spot };
  }

  /* street things: a lamp post with the street's name, a post box, the crossing light */
  const iron = mat('#43474e', { roughness: .5, metalness: .3 });
  function makeLamp([x, z]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); stage.add(g);
    g.add(mesh(new THREE.CylinderGeometry(.005, .008, .4, 10), iron, null, 0, .2, 0), mesh(new THREE.CylinderGeometry(.014, .017, .02, 12), iron, null, 0, .01, 0));
    const arm = new THREE.CatmullRomCurve3([[0, .38, 0], [.01, .41, 0], [.04, .415, 0], [.06, .4, 0]].map(p => new THREE.Vector3(...p)));
    g.add(mesh(new THREE.TubeGeometry(arm, 12, .003, 6), iron));
    const glass = mat('#e9e6df', { emissive: 0xffc46b, emissiveIntensity: 0, roughness: .3 });
    g.add(mesh(new THREE.CylinderGeometry(.012, .008, .026, 6), glass, null, .06, .384, 0), mesh(new THREE.ConeGeometry(.017, .014, 6), iron, null, .06, .403, 0));
    const glow = kit.glow({ color: 0xffc879, size: .14, opacity: 0 }); glow.position.set(.06, .38, 0); g.add(glow);
    const sign = kit.canvasTexture(256, 64, (c, W, H) => {
      c.fillStyle = '#f4f0e6'; c.fillRect(0, 0, W, H); c.strokeStyle = '#2c3038'; c.lineWidth = 6; c.strokeRect(5, 5, W - 10, H - 10);
      c.fillStyle = '#2c3038'; kit.fitText(c, 'PHỐ GIÓ', { x: 16, y: 6, w: W - 32, h: H - 12 }, { maxLines: 1, font: '"Be Vietnam Pro", sans-serif', weight: 800, max: 40 });
    });
    const blade = mesh(new THREE.BoxGeometry(.09, .024, .003), [iron, iron, iron, iron, mat('#ffffff', { map: sign }), mat('#ffffff', { map: sign })], g, .0, .3, .006);
    blade.castShadow = false;
    return { g, glass, glow };
  }
  function makePostBox([x, z]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(1.35); stage.add(g);   // as high as a grown-up's waist
    const paint = mat('#5f646c', { roughness: .5 }), dark = mat('#2c3038');
    g.add(mesh(new THREE.BoxGeometry(.05, .085, .04), paint, null, 0, .0425 + .02, 0), mesh(new THREE.CylinderGeometry(.025, .025, .04, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), paint, null, 0, .105, 0));
    g.add(mesh(new THREE.BoxGeometry(.03, .004, .002), dark, null, 0, .09, .021));
    for (const sx of [-.018, .018]) g.add(mesh(new THREE.BoxGeometry(.006, .02, .006), dark, null, sx, .01, 0));
    return { g, paint, top: .13 * 1.35 };
  }
  function makeSignal([x, z]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); stage.add(g);
    g.add(mesh(new THREE.CylinderGeometry(.004, .006, .42, 8), iron, null, 0, .21, 0));   // the light above a grown-up's head
    const face = (walk, on) => kit.canvasTexture(64, 96, (c, W, H) => {   // the little man standing, or walking
      c.fillStyle = '#1d2026'; c.fillRect(0, 0, W, H);
      c.fillStyle = on ? '#fbfaf5' : '#3d424b'; c.strokeStyle = c.fillStyle; c.lineWidth = 7; c.lineCap = 'round';
      c.beginPath(); c.arc(32, 22, 8, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(32, 32); c.lineTo(32, 58); c.stroke();
      if (walk) { c.beginPath(); c.moveTo(32, 58); c.lineTo(20, 82); c.moveTo(32, 58); c.lineTo(44, 80); c.moveTo(32, 38); c.lineTo(18, 52); c.moveTo(32, 38); c.lineTo(46, 50); c.stroke(); }
      else { c.beginPath(); c.moveTo(28, 58); c.lineTo(28, 84); c.moveTo(36, 58); c.lineTo(36, 84); c.moveTo(26, 36); c.lineTo(24, 58); c.moveTo(38, 36); c.lineTo(40, 58); c.stroke(); }
    });
    const stand = face(false, true), walk = face(true, true);
    const shade = mat('#ffffff', { map: stand, emissive: 0xffffff, emissiveMap: stand, emissiveIntensity: .7 });
    mesh(new THREE.BoxGeometry(.03, .045, .02), [iron, iron, iron, iron, shade, iron], g, 0, .4, .006);
    return { g, set(go) { const t = go ? walk : stand; if (shade.map !== t) { shade.map = shade.emissiveMap = t; shade.needsUpdate = true; } } };
  }

  /* ── build ── */
  const page = kit.backdrop((c, w, h) => towers(c, w, h, false), { ...PAGE, order: -4 });
  const pageWarm = kit.backdrop((c, w, h) => towers(c, w, h, true), { ...PAGE, z: PAGE.z + .002, order: -3 });
  pageWarm.material.opacity = 0; stage.add(page, pageWarm);
  const blocks = [block(A), block(B)];
  const alleyBack = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(L.B.x0 - L.A.x1 + .01, .5)), kit.keep(new THREE.MeshBasicMaterial({ toneMapped: false,
    map: kit.canvasTexture(128, 512, (c, W, H) => {                    // deep in the alley: dark, a pipe, a ladder, a far light
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6d7179'); g.addColorStop(.6, '#3f434a'); g.addColorStop(1, '#25282d');
      c.fillStyle = g; c.fillRect(0, 0, W, H); const r = seeded(3);
      c.strokeStyle = '#1b1d21'; c.lineWidth = 5; line(c, r, 20, 0, 20, H, 1); c.lineWidth = 3;
      for (let y = 30; y < H * .7; y += 26) line(c, r, 88, y, 116, y, 1);
      line(c, r, 88, 20, 88, H * .72, 1); line(c, r, 116, 20, 116, H * .72, 1);
      const l = c.createRadialGradient(64, H * .55, 0, 64, H * .55, 60); l.addColorStop(0, 'rgba(230,230,220,.55)'); l.addColorStop(1, 'rgba(230,230,220,0)'); c.fillStyle = l; c.fillRect(0, 0, W, H);
    }) })));
  alleyBack.position.set((L.A.x1 + L.B.x0) / 2, .25, L.FRONT - .085); stage.add(alleyBack);
  const herRoom = room(L.WIN.x0 - .01, L.WIN.x1 + .07, L.WIN.floor, Math.max(L.WIN.floor + .32, L.WIN.y1 + .04), L.FRONT - .106, L.FRONT - .001, '#c7c5bf');
  room(L.DOOR.x0 - .005, L.DOOR.x1 + .005, 0, L.DOOR.h + .01, L.FRONT - .07, L.FRONT - .001, '#55595f');   // the dark hall behind her door
  const leafM = mat('#6c7078'), door = new THREE.Group(); door.position.set(L.DOOR.x0, 0, L.FRONT + .002); stage.add(door);   // hinged on its left
  mesh(new THREE.BoxGeometry(L.DOOR.x1 - L.DOOR.x0, L.DOOR.h, .006), leafM, door, (L.DOOR.x1 - L.DOOR.x0) / 2, L.DOOR.h / 2, .003);
  mesh(new THREE.SphereGeometry(.004, 8, 6), mat('#d8d4c8', { metalness: .6, roughness: .3 }), door, (L.DOOR.x1 - L.DOOR.x0) * .82, L.DOOR.h * .48, .008);
  const curtains = [-1, 1].map(s => {                                // her curtains, drawn aside when she comes to the window
    const m = mesh(new THREE.PlaneGeometry(.04, L.WIN.y1 - L.WIN.y0), mat('#e8e5de', { side: THREE.DoubleSide }), stage, 0, (L.WIN.y0 + L.WIN.y1) / 2, L.FRONT - .006);
    m.castShadow = false; m.userData.side = s; return m;
  });
  const flowerBox = new THREE.Group(); flowerBox.position.set((L.WIN.x0 + L.WIN.x1) / 2, L.WIN.y0 - .012, L.FRONT + .012); stage.add(flowerBox);
  const boxM = mat('#7c7a76'), blooms = mat('#e9e7e2', { emissive: 0xffffff, emissiveIntensity: .05 }), leaves = mat('#8c9088');
  flowerBox.add(mesh(new THREE.BoxGeometry(L.WIN.x1 - L.WIN.x0 + .02, .016, .022), boxM));
  for (let i = 0; i < 9; i++) flowerBox.add(mesh(new THREE.SphereGeometry(.0065 + (i % 3) * .001, 8, 6), i % 2 ? blooms : leaves, null, -.07 + i * .0175, .012 + (i % 2) * .004, (i % 3 - 1) * .005));
  const awning = mesh(new THREE.PlaneGeometry(.27, .07), mat('#ffffff', { side: THREE.DoubleSide, map: kit.canvasTexture(256, 64, (c, W, H) => {
    for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#f1eee8' : '#6d727a'; c.fillRect(i * W / 9, 0, W / 9 + 1, H); }
    c.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc((i + .5) * W / 9, H + 4, W / 18, 0, TAU); c.fill(); }
  }), transparent: true, alphaTest: .4 }), stage, .345, .245, L.FRONT + .03);
  awning.rotation.x = -.75;
  const street$ = makeStreet();
  const lamp = makeLamp(L.LAMP), post = makePostBox(L.POST), signal = makeSignal(L.SIGNAL);
  const tints = [...blocks.flatMap(b => b.tints), [iron, '#43474e', '#5a3a30'], [post.paint, '#5f646c', '#c4553f'], [leafM, '#6c7078', '#8a4f3a'],
    [boxM, '#7c7a76', '#a2603f'], [blooms, '#e9e7e2', '#ff9a8a'], [leaves, '#8c9088', '#6f9a58']];
  tints.forEach(t => { t[1] = new THREE.Color(t[1]); t[2] = new THREE.Color(t[2]); });

  /* ── the warm wave: k how far the colour has come in (0..1), from (x, z); the lamp lights as it passes ── */
  const reach = (x, z, at, k) => clamp(k * 1.25 - Math.hypot(x - at[0], z - at[1]) * 1.1);   // 0 until the wave gets there
  function warm(k, at, T = 0) {
    const s = Math.max(.001, k * 2.6);                                 // the warm floor: a soft disc growing from where they stand
    street$.spot.repeat.set(FLOOR.w / s, FLOOR.d / s);
    street$.spot.offset.set(.5 - (at[0] / FLOOR.w + .5) * FLOOR.w / s, .5 - (.5 - at[1] / FLOOR.d) * FLOOR.d / s);
    street$.warm.visible = k > 0;
    blocks.forEach((b, i) => { b.fronts[1].opacity = ease.smooth(reach(i ? .26 : -.3, L.FRONT, at, k)); });   // each block as the wave reaches it
    for (const [m, a, b] of tints) m.color.copy(a).lerp(b, ease.smooth(reach(0, 0, at, k * .9)));
    pageWarm.material.opacity = ease.smooth(seg(k, .45, .95));
    const lit = ease.smooth(seg(k, .35, .7)), flicker = 1 + .05 * Math.sin(T * 13) * Math.sin(T * 7.3);
    lamp.glass.emissiveIntensity = 1.6 * lit; lamp.glow.material.opacity = .8 * lit * flicker;
  }
  warm(0, [0, 0]);
  return { herRoom, door, curtains, signal, lamp, warm };
};
