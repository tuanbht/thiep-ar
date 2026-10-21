/* Thảm bay đêm trăng: the city, built in code for story.js (template.json "story" loads this file first). The sky page at
   the back (a dusk, and a night painted over it that fades in: a big moon low over a skyline of domes and towers with lit
   windows and strings of lanterns), her house with its balcony (a carved railing with an opening on the city side between
   two lantern posts, an arched doorway, a dome), rooftops on the card (domes, a tower with a ring balcony, a flat roof with
   a little pavilion), strings of lanterns between them, sky lanterns, clouds and doves. The story places and times them.
     NM_CARPET.scenery(kit, layout) → the builders; layout: { PAGE, MOON, HOUSE, BAL } */
(window.NM_CARPET = window.NM_CARPET || {}).scenery = (kit, { PAGE, MOON, HOUSE, BAL }) => {
  const { THREE, lerp } = kit;
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .8, ...o }));
  const geo = g => kit.keep(g);
  const mesh = (g, m, x = 0, y = 0, z = 0) => {                       // the smallest parts cast no shadow: fewer draws on a phone
    const o = new THREE.Mesh(geo(g), m); o.position.set(x, y, z); g.computeBoundingSphere(); o.castShadow = g.boundingSphere.radius > .012; o.receiveShadow = true; return o;
  };
  /** many small boxes of one size in a single draw (crenellations, a parapet): at [[x, y, z], …] */
  const boxes = (list, w, h, d, m) => {
    const im = new THREE.InstancedMesh(geo(new THREE.BoxGeometry(w, h, d)), m, list.length), mt = new THREE.Matrix4();
    list.forEach(([x, y, z], i) => im.setMatrixAt(i, mt.makeTranslation(x, y, z))); im.computeBoundingSphere?.(); im.castShadow = im.receiveShadow = true; return im;
  };
  const C = { gold: '#e8b84a', gold2: '#c98f2a', blue: '#6b8fd8', blue2: '#4c6fb8', cream: '#fff1d6', plum: '#6d2457' };
  const PX = 1024 / PAGE.width;                                      // the page's canvas: pixels per card width
  const px = x => (x + PAGE.width / 2) * PX, py = (y, h) => h - y * PX;
  const onion = (c, cx, by, w, h) => {                               // an onion dome's outline, its foot (w wide) at by
    c.beginPath(); c.moveTo(cx - w / 2, by); c.bezierCurveTo(cx - w * .72, by - h * .48, cx - w * .1, by - h * .72, cx, by - h);
    c.bezierCurveTo(cx + w * .1, by - h * .72, cx + w * .72, by - h * .48, cx + w / 2, by); c.closePath();
  };
  const arch = (c, x, y, w, h) => {                                  // a pointed arch's opening: (x, y) the middle of its sill
    c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h + w * .55);
    c.quadraticCurveTo(x - w / 2, y - h + w * .1, x, y - h); c.quadraticCurveTo(x + w / 2, y - h + w * .1, x + w / 2, y - h + w * .55); c.lineTo(x + w / 2, y); c.closePath();
  };

  /* ── the sky page: dusk, or night; a big moon, wisps, and the far city in two rows ── */
  function skyline(c, W, H, r, o) {                                  // o: { base, lo, hi, fill, pane, lit, chance, strings }
    const tops = [];
    for (let x = -12; x < W + 12;) {
      const w = (o.w0 + r() * o.w1) * PX, h = (o.lo + r() * (o.hi - o.lo)) * PX, kind = r(), gy = py(o.base, H), cx = x + w / 2;
      c.fillStyle = o.fill; c.fillRect(x, gy - h, w, h + 4);
      if (kind < .22) { onion(c, cx, gy - h + 1, w * .78, w * .95); c.fill(); c.fillRect(cx - 1, gy - h - w * .95 - 8, 2, 10); }
      else if (kind < .42) { c.beginPath(); c.ellipse(cx, gy - h + 1, w * .4, w * .34, 0, Math.PI, 0); c.fill(); c.fillRect(cx - 1, gy - h - w * .34 - 7, 2, 8); }
      else if (kind < .62) for (let k = 2; k < w - 4; k += 9) c.fillRect(x + k, gy - h - 6, 5, 7);   // a parapet
      else if (kind < .74) {                                         // a slender tower with a ring balcony and a cupola
        const tw = w * .26, th = h * .9; c.fillRect(cx - tw / 2, gy - h - th, tw, th); c.fillRect(cx - tw * .9, gy - h - th * .55, tw * 1.8, 4);
        onion(c, cx, gy - h - th + 1, tw * 1.3, tw * 1.6); c.fill();
      } else { c.beginPath(); c.moveTo(x + 2, gy - h); c.lineTo(cx, gy - h - w * .22); c.lineTo(x + w - 2, gy - h); c.fill(); }
      for (let wy = gy - h + 12; wy < gy - 10; wy += 22) for (let wx = x + 7; wx < x + w - 9; wx += 15) {
        if (r() < .45) continue;
        c.fillStyle = r() < o.chance ? o.lit : o.pane; arch(c, wx + 3, wy + 9, 6, 11); c.fill();
      }
      tops.push([cx, gy - h]); x += w + (r() < .3 ? r() * 10 : -r() * 7);
    }
    if (o.strings) for (let i = 0; i + 1 < tops.length; i += 2) {   // strings of lanterns from roof to roof
      const [ax, ay] = tops[i], [bx, by] = tops[i + 1]; if (bx - ax > 110) continue;
      c.strokeStyle = 'rgba(40,30,60,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 16, bx, by); c.stroke();
      for (let k = 1; k < 6; k++) { const t = k / 6, lx = lerp(ax, bx, t), ly = lerp(ay, by, t) + 16 * 2 * t * (1 - t) * 2 * .5 + 2;
        c.fillStyle = ['#ffd27a', '#ff9f8a', '#ffe6a6'][k % 3]; c.beginPath(); c.arc(lx, ly, 2.4, 0, TAU); c.fill(); }
    }
  }
  function paintSky(night) {
    return (c, W, H) => {
      const r = seeded(night ? 71 : 43);
      let g = c.createLinearGradient(0, 0, 0, H);
      (night ? [[0, '#0b1036'], [.35, '#1b2662'], [.62, '#2f408a'], [.8, '#4a5aa4'], [.92, '#7b6fae'], [1, '#d99a70']]
        : [[0, '#28337a'], [.3, '#4958a8'], [.55, '#8784c8'], [.75, '#d29ab6'], [.9, '#f5b78e'], [1, '#ffd69a']]).forEach(([k, col]) => g.addColorStop(k, col));
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (let i = 0; i < (night ? 190 : 45); i++) {
        c.fillStyle = `rgba(255,248,226,${(night ? .35 : .12) + r() * .55})`; c.beginPath(); c.arc(r() * W, Math.pow(r(), 1.4) * H * .72, .6 + r() * 1.7, 0, TAU); c.fill();
      }
      if (night) for (let i = 0; i < 16; i++) {                       // a few bright four-pointed stars
        const x = r() * W, y = r() * H * .5, s = 4 + r() * 6; c.fillStyle = 'rgba(255,250,232,.9)';
        c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill();
      }
      const mx = px(MOON.x), my = py(MOON.y, H), mr = MOON.r * PX;    // the moon: its halo, the disc, its soft grey seas
      g = c.createRadialGradient(mx, my, mr * .9, mx, my, mr * 2.7); g.addColorStop(0, night ? 'rgba(255,236,190,.42)' : 'rgba(255,240,215,.22)'); g.addColorStop(1, 'rgba(255,236,190,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      g = c.createRadialGradient(mx - mr * .3, my - mr * .3, mr * .1, mx, my, mr);
      g.addColorStop(0, '#fffdf2'); g.addColorStop(.7, night ? '#fbedc4' : '#f4e6d4'); g.addColorStop(1, night ? '#efd496' : '#e6d2bf');
      c.fillStyle = g; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.clip();
      for (const [dx, dy, s] of [[-.32, -.18, .27], [.26, .12, .22], [-.04, .38, .17], [.4, -.34, .12], [-.44, .3, .1], [.1, -.45, .09]]) {
        c.fillStyle = 'rgba(200,174,124,.26)'; c.beginPath(); c.ellipse(mx + dx * mr, my + dy * mr, s * mr, s * mr * .8, .4, 0, TAU); c.fill();
      }
      c.restore();
      for (let i = 0; i < 6; i++) {                                  // long wisps of cloud, lit from the moon's side
        const cx = (i === 1 ? px(MOON.x) - 30 : r() * W), cy = i === 1 ? my + mr * .45 : H * (.12 + r() * .42), w = 70 + r() * 120, h = 5 + r() * 6;
        c.fillStyle = night ? 'rgba(112,118,190,.55)' : 'rgba(255,214,222,.55)'; c.beginPath(); c.ellipse(cx, cy, w, h, 0, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(cx - w * .3, cy - h * .6, w * .45, h * .8, 0, 0, TAU); c.fill();
        c.strokeStyle = night ? 'rgba(255,236,190,.35)' : 'rgba(255,246,220,.6)'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, cy, w * .92, h * .8, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      }
      skyline(c, W, H, r, { base: 0, lo: .12, hi: .3, w0: .05, w1: .07, fill: night ? '#4b5a9c' : '#8c8cc6', pane: night ? '#3d4a86' : '#7a7ab6', lit: night ? '#ffd98a' : '#ffe9b8', chance: night ? .55 : .2 });
      skyline(c, W, H, r, { base: 0, lo: .04, hi: .17, w0: .06, w1: .09, fill: night ? '#28336c' : '#5b5f9f', pane: night ? '#212b5c' : '#4f538c', lit: night ? '#ffcf70' : '#ffe1a0', chance: night ? .7 : .3, strings: true });
      g = c.createLinearGradient(0, H - 70, 0, H); g.addColorStop(0, 'rgba(255,190,120,0)'); g.addColorStop(1, night ? 'rgba(255,184,110,.35)' : 'rgba(255,214,160,.3)');
      c.fillStyle = g; c.fillRect(0, H - 70, W, 70);                 // the city's own glow at the foot of the page
    };
  }
  function pages() {
    const o = { width: PAGE.width, height: PAGE.height, curve: PAGE.curve, z: PAGE.z };
    const dusk = kit.backdrop(paintSky(false), { ...o, order: -4 }), night = kit.backdrop(paintSky(true), { ...o, z: PAGE.z + .002, order: -3 });
    night.material.opacity = 0;
    const back = new THREE.Mesh(dusk.geometry, mat('#e9dcc4', { roughness: 1, side: THREE.BackSide })); back.position.z = PAGE.z - .002;
    const glow = kit.glow({ color: 0xfff0c8, size: MOON.r * 5, opacity: 0 }); glow.position.set(MOON.x, MOON.y, dusk.userData.zAt(MOON.x) + .02);
    const fold = new THREE.Group(); fold.position.z = 0; fold.add(dusk, night, back);   // the page lies flat until it folds up
    return { fold, dusk, night, back, glow, zAt: dusk.userData.zAt };
  }

  /* ── facades: plaster, arched windows (lit ones glow at night: `lit` paints only them, for the emissive map) ── */
  function facade(o, lit) {
    return (c, W, H) => {
      const r = seeded(o.seed);
      c.fillStyle = lit ? '#000000' : o.wall; c.fillRect(0, 0, W, H);
      if (!lit) {
        for (let i = 0; i < 50; i++) { c.fillStyle = `rgba(110,80,60,${.03 + r() * .05})`; c.beginPath(); c.ellipse(r() * W, r() * H, 3 + r() * 9, 2 + r() * 4, 0, 0, TAU); c.fill(); }
        if (o.band) { const bh = Math.max(8, H * .07); c.fillStyle = C.blue2; c.fillRect(0, 4, W, bh);   // a band of blue tiles under the roof
          c.fillStyle = C.cream; for (let x = 0; x < W; x += bh) { c.beginPath(); c.moveTo(x, 4 + bh / 2); c.lineTo(x + bh / 2, 4); c.lineTo(x + bh, 4 + bh / 2); c.lineTo(x + bh / 2, 4 + bh); c.fill(); } }
        c.fillStyle = 'rgba(70,40,30,.16)'; c.fillRect(0, H * .95, W, H * .05);
      }
      for (const [x, y, w, h, on] of o.windows || []) {
        const X = x * W, Y = y * H, ww = w * W, hh = h * H;
        if (lit) { if (on) { c.fillStyle = '#ffc874'; arch(c, X, Y + hh / 2, ww, hh); c.fill(); } continue; }
        c.fillStyle = 'rgba(255,248,236,.9)'; arch(c, X, Y + hh / 2 + 3, ww + 8, hh + 6); c.fill();   // a pale stone frame
        const pane = c.createLinearGradient(0, Y - hh / 2, 0, Y + hh / 2);
        if (on) { pane.addColorStop(0, '#ffe4a6'); pane.addColorStop(1, '#f2a24e'); } else { pane.addColorStop(0, '#3a4a86'); pane.addColorStop(1, '#232c5c'); }
        c.fillStyle = pane; arch(c, X, Y + hh / 2, ww, hh); c.fill();
        c.strokeStyle = 'rgba(60,40,40,.55)'; c.lineWidth = Math.max(1.5, ww * .08); c.beginPath(); c.moveTo(X, Y - hh * .3); c.lineTo(X, Y + hh / 2); c.stroke();
        c.fillStyle = C.gold2; c.fillRect(X - ww * .62, Y + hh / 2, ww * 1.24, Math.max(3, hh * .1));   // a sill
      }
      if (o.door) {
        const [x, w, h] = o.door, X = x * W, ww = w * W, hh = h * H;
        if (lit) { c.fillStyle = '#5a3008'; c.fillRect(X - ww * .2, H - hh - 14, ww * .4, 10); return; }
        c.fillStyle = 'rgba(255,248,236,.9)'; arch(c, X, H, ww + 10, hh + 5); c.fill();
        c.fillStyle = o.doorColor || '#8a4a2c'; arch(c, X, H, ww, hh); c.fill();
        c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(X, H - hh * .8); c.lineTo(X, H); c.stroke();
        c.fillStyle = C.gold; c.beginPath(); c.arc(X + ww * .22, H - hh * .4, Math.max(2, ww * .05), 0, TAU); c.fill();
      }
    };
  }
  /** her doorway: a tall pointed arch, lamplight inside, plum curtains tied back, a hanging lamp */
  function doorway(lit) {
    return (c, W, H) => {
      const r = seeded(8);
      c.fillStyle = lit ? '#000000' : '#f3dcc0'; c.fillRect(0, 0, W, H);
      if (!lit) {
        for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(120,80,60,${.03 + r() * .05})`; c.beginPath(); c.ellipse(r() * W, r() * H, 3 + r() * 9, 2 + r() * 4, 0, 0, TAU); c.fill(); }
        c.fillStyle = C.blue2; c.fillRect(0, 6, W, 16); c.fillStyle = C.cream; for (let x = 0; x < W; x += 16) { c.beginPath(); c.arc(x + 8, 14, 5, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(255,248,236,.95)'; arch(c, W / 2, H, W * .5, H * .8); c.fill();
        for (const s of [-1, 1]) { c.fillStyle = 'rgba(255,248,236,.9)'; arch(c, W / 2 + s * W * .36, H * .52, W * .1, H * .22); c.fill(); c.fillStyle = '#ffc874'; arch(c, W / 2 + s * W * .36, H * .5, W * .07, H * .18); c.fill(); }
      }
      const g = c.createLinearGradient(0, H * .25, 0, H);
      g.addColorStop(0, lit ? '#ffb15a' : '#ffdf9e'); g.addColorStop(1, lit ? '#a05a20' : '#e58a45');
      c.fillStyle = g; arch(c, W / 2, H, W * .42, H * .74); c.fill();
      if (lit) { for (const s of [-1, 1]) { c.fillStyle = '#ffc874'; arch(c, W / 2 + s * W * .36, H * .5, W * .07, H * .18); c.fill(); } return; }
      for (const s of [-1, 1]) {                                     // the curtains, tied back
        c.fillStyle = C.plum; c.beginPath(); c.moveTo(W / 2 + s * W * .21, H * .3); c.quadraticCurveTo(W / 2 + s * W * .05, H * .55, W / 2 + s * W * .16, H * .66);
        c.lineTo(W / 2 + s * W * .21, H); c.lineTo(W / 2 + s * W * .21, H * .3); c.fill();
        c.fillStyle = C.gold; c.fillRect(W / 2 + s * W * .17 - 4, H * .64, 8, 6);
      }
      c.strokeStyle = '#5a3a20'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2, H * .3); c.lineTo(W / 2, H * .42); c.stroke();
      c.fillStyle = C.gold; c.beginPath(); c.moveTo(W / 2 - 9, H * .42); c.lineTo(W / 2 + 9, H * .42); c.lineTo(W / 2 + 5, H * .5); c.lineTo(W / 2 - 5, H * .5); c.fill();
    };
  }
  const tilesTex = kit.canvasTexture(256, 128, (c, W, H) => {          // dome tiles: soft blue scales, gold ribs
    c.fillStyle = C.blue; c.fillRect(0, 0, W, H);
    for (let y = 0, row = 0; y < H; y += 10, row++) for (let x = (row % 2) * 8 - 8; x < W; x += 16) {
      c.fillStyle = row % 3 ? '#5f84cf' : '#7d9ee0'; c.beginPath(); c.arc(x + 8, y + 2, 8, 0, Math.PI); c.fill();
      c.strokeStyle = 'rgba(20,30,80,.25)'; c.lineWidth = 1; c.stroke();
    }
    c.fillStyle = C.gold; for (let x = 0; x < W; x += 32) c.fillRect(x, 0, 3, H);
  });
  tilesTex.wrapS = THREE.RepeatWrapping;
  /** a dome (round, or onion) of blue tiles or gold, with a gilded finial: its foot at the origin */
  function dome(r, o = {}) {
    const g = new THREE.Group(), prof = o.onion
      ? [[1, 0], [1.1, .2], [1.12, .42], [.95, .72], [.6, 1], [.26, 1.25], [.06, 1.44], [0, 1.5]]
      : Array.from({ length: 9 }, (_, i) => { const a = i / 8 * Math.PI / 2; return [Math.cos(a), Math.sin(a) * (o.tall || 1)]; });
    const m = o.gold ? mat(C.gold, { roughness: .35, metalness: .55, emissive: 0x5a3a08, emissiveIntensity: .25 }) : mat('#ffffff', { map: tilesTex, roughness: .5 });
    g.add(mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x * r, y * r)), 20), m));
    const top = (o.onion ? 1.5 : (o.tall || 1)) * r, gild = mat(C.gold, { roughness: .3, metalness: .6, emissive: 0x5a3a08, emissiveIntensity: .3 });
    g.add(mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.04, r * .12, 20), gild, 0, r * .06, 0), mesh(new THREE.SphereGeometry(r * .1, 10, 8), gild, 0, top + r * .08, 0),
      mesh(new THREE.ConeGeometry(r * .05, r * .32, 8), gild, 0, top + r * .3, 0));
    return g;
  }
  /** a building on the card: a box with painted fronts (to the phone, and its side to the middle), its roof on top */
  function block(o) {
    const g = new THREE.Group(); g.position.set(o.x, 0, o.z);
    const face = (f, w) => mat('#ffffff', { map: kit.canvasTexture(256, Math.round(256 * o.h / w), facade(f, false)), emissive: 0xffffff,
      emissiveMap: kit.canvasTexture(128, Math.round(128 * o.h / w), facade(f, true)), emissiveIntensity: .95 });
    const wall = mat(o.wall), front = face(o, o.w), side = o.side ? face({ ...o, ...o.side, door: null }, o.d) : wall;
    const sides = o.x > 0 ? [wall, side] : [side, wall];             // the side the phone sees: towards the middle
    g.add(mesh(new THREE.BoxGeometry(o.w, o.h, o.d), [sides[0], sides[1], mat(o.roof || '#e6d2b0'), wall, front, wall], 0, o.h / 2, 0));
    if (o.parapet) { const at = []; for (let x = -o.w / 2 + .008; x < o.w / 2; x += .022) for (const z of [-o.d / 2 + .005, o.d / 2 - .005]) at.push([x, o.h + .007, z]); g.add(boxes(at, .012, .014, .008, wall)); }
    if (o.dome) { const d = dome(o.dome.r, o.dome); d.position.set(o.dome.x || 0, o.h, o.dome.z || 0); g.add(d); }
    return g;
  }
  function rooftops() {
    const list = [];
    list.push([block({ x: -.1, z: -.215, w: .11, d: .09, h: .085, seed: 21, wall: '#f3d9c4', band: true, windows: [[.3, .45, .14, .36, 1], [.72, .45, .14, .36, 0]],
      dome: { r: .034, x: .015 } }), .5]);
    list.push([block({ x: .07, z: -.19, w: .15, d: .12, h: .12, seed: 22, wall: '#f1e3c8', band: true, windows: [[.22, .42, .12, .3, 1], [.5, .42, .12, .3, 0], [.78, .42, .12, .3, 1]],
      door: [.5, .16, .3], doorColor: '#3f5fa8', side: { seed: 23, windows: [[.5, .45, .2, .34, 1]] }, dome: { r: .055 } }), .62]);
    const tower = new THREE.Group(); tower.position.set(.25, 0, -.205);   // a slender tower with a ring balcony and a gold cupola
    const tw = mat('#ffffff', { map: kit.canvasTexture(256, 512, facade({ seed: 24, wall: '#d4e0f4', windows: [[.25, .3, .1, .1, 1], [.75, .5, .1, .1, 0], [.5, .7, .1, .1, 1], [.25, .85, .1, .08, 1]] }, false)),
      emissive: 0xffffff, emissiveMap: kit.canvasTexture(128, 256, facade({ seed: 24, windows: [[.25, .3, .1, .1, 1], [.5, .7, .1, .1, 1], [.25, .85, .1, .08, 1]] }, true)), emissiveIntensity: .95 });
    tower.add(mesh(new THREE.CylinderGeometry(.034, .04, .16, 18), tw, 0, .08, 0), mesh(new THREE.CylinderGeometry(.056, .05, .008, 20), mat('#efe2c8'), 0, .162, 0),
      mesh(new THREE.TorusGeometry(.054, .0025, 6, 28).rotateX(Math.PI / 2), mat(C.gold, { metalness: .5, roughness: .4 }), 0, .178, 0),
      mesh(new THREE.CylinderGeometry(.024, .028, .05, 16), mat('#d4e0f4'), 0, .19, 0));
    const cup = dome(.03, { onion: true, gold: true }); cup.position.y = .215; tower.add(cup);
    list.push([tower, .74]);
    const flat = block({ x: .405, z: -.165, w: .17, d: .13, h: .1, seed: 25, wall: '#d9e4f5', parapet: true, windows: [[.2, .45, .1, .34, 1], [.45, .45, .1, .34, 1], [.7, .45, .1, .34, 0]],
      door: [.88, .1, .4], doorColor: '#7a3f6a', side: { seed: 26, windows: [[.35, .45, .16, .34, 0], [.7, .45, .16, .34, 1]] } });
    const kiosk = new THREE.Group(); kiosk.position.set(.035, .1, -.025); flat.add(kiosk);   // a little pavilion on the flat roof
    for (const [x, z] of [[-.022, -.022], [.022, -.022], [-.022, .022], [.022, .022]]) kiosk.add(mesh(new THREE.CylinderGeometry(.0025, .0025, .045, 6), mat('#fff1d6'), x, .0225, z));
    kiosk.add(mesh(new THREE.BoxGeometry(.056, .006, .056), mat('#efe2c8'), 0, .048, 0)); const kd = dome(.026); kd.position.y = .051; kiosk.add(kd);
    list.push([flat, .86]);
    return list;
  }

  /* ── her house: the ground floor, an arcade under the balcony, the balcony with its carved railing, the upper storey
        with her doorway, a dome. The railing has an opening on the city side (z between BAL.gap) ── */
  const RH = .062;                                                   // the railing's height
  const carved = kit.canvasTexture(256, 64, (c, W, H) => {             // a stone screen: pointed arches pierced through, a diamond in each
    c.fillStyle = '#f2e3c6'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#d9c29a'; c.fillRect(0, 0, W, 6); c.fillRect(0, H - 7, W, 7);
    c.globalCompositeOperation = 'destination-out';
    for (let x = 16; x < W; x += 32) { arch(c, x, H - 10, 22, H - 20); c.fill(); }
    c.globalCompositeOperation = 'source-over'; c.fillStyle = '#f2e3c6';
    for (let x = 16; x < W; x += 32) { c.beginPath(); c.moveTo(x, H * .38); c.lineTo(x + 5, H * .56); c.lineTo(x, H * .74); c.lineTo(x - 5, H * .56); c.fill(); }
  });
  carved.wrapS = THREE.RepeatWrapping;
  function railing(len) {                                            // a run of carved screen with a rail on top, along its own x
    const g = new THREE.Group(), pg = geo(new THREE.PlaneGeometry(len, RH - .008)), uv = pg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / .09);
    const screen = new THREE.Mesh(pg, mat('#ffffff', { map: carved, alphaTest: .5, side: THREE.DoubleSide, roughness: .85 })); screen.position.y = (RH - .008) / 2; screen.castShadow = true;
    g.add(screen, mesh(new THREE.BoxGeometry(len + .008, .008, .012), mat('#e9d6b2', { roughness: .7 }), 0, RH - .004, 0));
    return g;
  }
  function lantern(color = '#ffcf7a', size = 1) {                    // a little hanging lantern that glows: { root, glass, glow }
    const g = new THREE.Group(), glass = mat(color, { emissive: new THREE.Color(color), emissiveIntensity: .25, roughness: .4 });
    g.add(mesh(new THREE.SphereGeometry(.0065 * size, 10, 8).scale(1, 1.3, 1), glass));
    const glow = kit.glow({ color: new THREE.Color(color).getHex(), size: .045 * size, opacity: 0 }); g.add(glow);
    return { root: g, glass, glow };
  }
  function house() {
    const { x0, x1, z0, z1, h, top, dz } = HOUSE, g = new THREE.Group(), lamps = [];
    const o = { seed: 3, wall: '#f6e2c8', band: true, windows: [[.2, .5, .1, .34, 1], [.45, .5, .1, .34, 0], [.85, .5, .1, .34, 1]], door: [.66, .12, .62], doorColor: '#7a3f2a' };
    const sideO = { seed: 4, wall: '#f6e2c8', band: true, windows: [[.3, .5, .14, .34, 1], [.72, .5, .14, .34, 0]] };
    const tex = (f, w, hh) => mat('#ffffff', { map: kit.canvasTexture(256, Math.round(256 * hh / w), facade(f, false)), emissive: 0xffffff, emissiveMap: kit.canvasTexture(128, Math.round(128 * hh / w), facade(f, true)), emissiveIntensity: .95 });
    const wall = mat('#f6e2c8');
    g.add(mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), [tex(sideO, z1 - z0, h), wall, wall, wall, tex(o, x1 - x0, h), wall], (x0 + x1) / 2, h / 2, (z0 + z1) / 2));
    const floorTex = kit.canvasTexture(256, 192, (c, W, H) => {        // the balcony's floor: blue and cream tiles in a star pattern
      c.fillStyle = '#f2e6cf'; c.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) {
        c.fillStyle = (x + y) % 64 ? '#7d9ee0' : '#e8b84a'; c.beginPath(); c.moveTo(x + 16, y + 3); c.lineTo(x + 29, y + 16); c.lineTo(x + 16, y + 29); c.lineTo(x + 3, y + 16); c.fill();
        c.strokeStyle = 'rgba(120,90,60,.35)'; c.lineWidth = 1.5; c.strokeRect(x, y, 32, 32);
      }
    });
    const stone = mat('#ead9bb', { roughness: .85 });
    g.add(mesh(new THREE.BoxGeometry(BAL.x1 - BAL.x0, .012, BAL.z1 - BAL.z0), [stone, stone, mat('#ffffff', { map: floorTex, roughness: .7 }), stone, stone, stone], (BAL.x0 + BAL.x1) / 2, BAL.y - .006, (BAL.z0 + BAL.z1) / 2));
    for (const x of [BAL.x0 + .014, BAL.x1 - .014]) g.add(mesh(new THREE.CylinderGeometry(.0065, .008, BAL.y - .012, 10), stone, x, (BAL.y - .012) / 2, BAL.z1 - .016));   // the arcade's columns
    for (const x of [-.43, -.335, -.24]) g.add(mesh(new THREE.BoxGeometry(.014, .022, .026), stone, x, BAL.y - .023, z1 + .013));   // corbels
    const ux1 = x1 - .04, uh = top - BAL.y, upper = mat('#ffffff', { map: kit.canvasTexture(320, Math.round(320 * uh / (ux1 - x0)), doorway(false)), emissive: 0xffffff,
      emissiveMap: kit.canvasTexture(160, Math.round(160 * uh / (ux1 - x0)), doorway(true)), emissiveIntensity: .95 });
    g.add(mesh(new THREE.BoxGeometry(ux1 - x0, uh, dz - z0), [tex({ ...sideO, seed: 5, windows: [[.5, .45, .3, .26, 1]] }, dz - z0, uh), wall, wall, wall, upper, wall], (x0 + ux1) / 2, BAL.y + uh / 2, (z0 + dz) / 2));
    const crest = []; for (let x = x0 + .006; x < ux1; x += .02) crest.push([x, top + .006, dz - .005]);
    g.add(boxes(crest, .012, .012, .008, wall));                     // a crenellated top
    const d = dome(.048, { onion: true }); d.position.set((x0 + ux1) / 2 + .01, top, (z0 + dz) / 2); g.add(d);
    const front = railing(BAL.x1 - BAL.x0 - .01); front.position.set((BAL.x0 + BAL.x1) / 2, BAL.y, BAL.z1 - .005); g.add(front);   // the railing, the opening at the city side
    const runs = [[BAL.z0 + .004, BAL.gap[0]], [BAL.gap[1], BAL.z1 - .01]];
    for (const [a, b] of runs) if (b - a > .01) { const r = railing(b - a); r.rotation.y = Math.PI / 2; r.position.set(BAL.x1 - .005, BAL.y, (a + b) / 2); g.add(r); }
    const post = mat('#e9d6b2', { roughness: .7 });
    for (const [x, z, tall] of [[BAL.x0 + .006, BAL.z1 - .005, 0], [BAL.x1 - .005, BAL.z1 - .005, 0], [BAL.x1 - .005, BAL.gap[0], 1], [BAL.x1 - .005, BAL.gap[1], 1]]) {
      const ph = tall ? .1 : RH + .012; g.add(mesh(new THREE.BoxGeometry(.012, ph, .012), post, x, BAL.y + ph / 2, z));
      if (tall) { const l = lantern('#ffcf7a', 1.4); l.root.position.set(x, BAL.y + ph + .012, z); g.add(l.root); lamps.push(l); }   // the opening's two lantern posts
      else g.add(mesh(new THREE.SphereGeometry(.008, 10, 8), mat(C.gold, { metalness: .5, roughness: .4 }), x, BAL.y + ph + .006, z));
    }
    const doorGlow = kit.glow({ color: 0xffb066, size: .2, opacity: .55 }); doorGlow.position.set((x0 + ux1) / 2, BAL.y + uh * .38, dz + .01); g.add(doorGlow);
    const light = new THREE.PointLight(0xffb36b, .55, .9, 1.6); light.position.set(-.3, BAL.y + .16, -.06); g.add(light);
    return { root: g, lamps, doorGlow, light };
  }

  /* ── strings of lanterns, sagging from one point to another: { root, lamps } (each lamp lights up at its own time) ── */
  function lanternString(a, b, n, sag, colors) {
    const g = new THREE.Group(), A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), lamps = [];
    const at = t => new THREE.Vector3().lerpVectors(A, B, t).add({ x: 0, y: -sag * 4 * t * (1 - t), z: 0 });
    g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => at(i / 12))), 24, .0008, 4), mat('#3a2c3a')));
    for (let i = 1; i <= n; i++) { const l = lantern(colors[i % colors.length]); l.root.position.copy(at(i / (n + 1))).add({ x: 0, y: -.009, z: 0 }); g.add(l.root); lamps.push(l); }
    return { root: g, lamps };
  }

  /* ── the square under her balcony, on the card: stone setts, a tiled border, a star of blue and gold in the middle;
        lamp posts at its front corners ── */
  function plaza() {
    const g = new THREE.Group(), lamps = [];
    const tex = kit.canvasTexture(1024, 640, (c, W, H) => {
      const r = seeded(61);
      c.fillStyle = '#e6d7bd'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 1300; i++) {                               // setts, each its own size and shade
        const x = r() * W, y = r() * H, w = 14 + r() * 16, h = 9 + r() * 9;
        c.fillStyle = ['#efe3cc', '#e2d1b2', '#d9c6a6', '#ecdcc0', '#d3bf9e'][(r() * 5) | 0];
        c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, y - h / 2, w, h, 4) : c.rect(x - w / 2, y - h / 2, w, h); c.fill();
        c.strokeStyle = 'rgba(120,90,60,.35)'; c.lineWidth = 1.2; c.stroke();
      }
      const bh = 34;                                                  // a border of blue and cream tiles along the front
      c.fillStyle = '#3f5fa8'; c.fillRect(0, H - bh, W, bh);
      for (let x = 0; x < W; x += bh) { c.fillStyle = (x / bh) % 2 ? '#f2e6cf' : '#e8b84a'; c.beginPath(); c.moveTo(x + bh / 2, H - bh + 4); c.lineTo(x + bh - 4, H - bh / 2); c.lineTo(x + bh / 2, H - 4); c.lineTo(x + 4, H - bh / 2); c.fill(); }
      c.fillStyle = '#c98f2a'; c.fillRect(0, H - bh - 5, W, 5);
      const cx = W * .56, cy = H * .72;                              // the star in the middle of the square
      for (const [rr, col] of [[150, '#3f5fa8'], [128, '#f2e6cf'], [104, '#6b8fd8'], [70, '#e8b84a'], [40, '#f2e6cf']]) {
        c.fillStyle = col; c.beginPath();
        for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, k = i % 2 ? .72 : 1; c.lineTo(cx + Math.cos(a) * rr * k, cy + Math.sin(a) * rr * k * .98); }
        c.closePath(); c.fill(); c.strokeStyle = 'rgba(40,30,60,.35)'; c.lineWidth = 2; c.stroke();
      }
      c.fillStyle = '#e8436d'; kit.heartPath(c, cx, cy + 2, 38); c.fill();
      const fade = c.createLinearGradient(0, 0, 0, H * .45); fade.addColorStop(0, 'rgba(40,40,80,.35)'); fade.addColorStop(1, 'rgba(40,40,80,0)');
      c.fillStyle = fade; c.fillRect(0, 0, W, H * .45);              // darker towards the back, under the houses
    });
    const floor = new THREE.Mesh(geo(new THREE.PlaneGeometry(1, .625).rotateX(-Math.PI / 2)), mat('#ffffff', { map: tex, roughness: .95 }));
    floor.position.y = .0008; g.add(floor);
    const iron = mat('#2f2a4a', { roughness: .5, metalness: .3 });
    for (const x of [-.455, .455]) {
      const post = new THREE.Group(); post.position.set(x, 0, .27); g.add(post);
      post.add(mesh(new THREE.CylinderGeometry(.0035, .005, .14, 8), iron, 0, .07, 0), mesh(new THREE.CylinderGeometry(.01, .012, .008, 10), iron, 0, .004, 0),
        mesh(new THREE.ConeGeometry(.012, .014, 6), iron, 0, .168, 0));
      const l = lantern('#ffcf7a', 1.6); l.root.position.y = .15; post.add(l.root); lamps.push(l);
    }
    return { root: g, lamps };
  }

  /* ── a sky lantern: a paper shade lit from inside, rising ── */
  function skyLantern(s = 1) {
    const g = new THREE.Group(), paper = mat('#ffb45c', { emissive: 0xff9a3a, emissiveIntensity: 1.1, roughness: .85, side: THREE.DoubleSide });
    const shade = mesh(new THREE.LatheGeometry([[.012, 0], [.0145, .016], [.017, .032], [0, .033]].map(([x, y]) => new THREE.Vector2(x * s, y * s)), 12), paper);   // open below, closed on top
    shade.castShadow = false; g.add(shade);
    const glow = kit.glow({ color: 0xffa64a, size: .1 * s, opacity: .75 }); glow.position.y = .014 * s; g.add(glow);
    return { root: g, paper, glow };
  }

  /* ── a cloud: soft lumps, moonlit, that can fade ── */
  function cloud(seed, w = .16) {
    const r = seeded(seed), g = new THREE.Group(), m = kit.keep(new THREE.MeshStandardMaterial({ color: 0xdfe2ff, emissive: 0x6268b4, emissiveIntensity: .5, roughness: 1, transparent: true }));
    const n = 6;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1) * 2 - 1, rad = w * (.15 + .1 * (1 - Math.abs(k)) + r() * .04);
      const s = new THREE.Mesh(geo(new THREE.SphereGeometry(rad, 14, 10)), m); s.scale.set(1, .78, .8);
      s.position.set(k * w * .42 + (r() - .5) * .01, (1 - k * k) * w * .1 + r() * .01, (r() - .5) * w * .12); g.add(s);
    }
    return { root: g, m };
  }

  /* ── a dove: a white body, a gold beak, wings on pins that flap ── */
  function dove() {
    const g = new THREE.Group(), white = mat('#fbf8f2', { roughness: .6, emissive: 0x8088c0, emissiveIntensity: .2 }), tip = mat('#cfd0e6', { roughness: .6 });
    g.add(mesh(new THREE.SphereGeometry(1, 12, 8).scale(.0095, .009, .019), white), mesh(new THREE.SphereGeometry(.0075, 10, 8), white, 0, .0075, .014),
      mesh(new THREE.ConeGeometry(.0022, .007, 6).rotateX(Math.PI / 2), mat('#f0a23a'), 0, .006, .0235),
      mesh(new THREE.SphereGeometry(.0013, 6, 4), mat('#1d1d2a'), .0045, .009, .0185), mesh(new THREE.SphereGeometry(.0013, 6, 4), mat('#1d1d2a'), -.0045, .009, .0185));
    const tail = mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-.009, -.02), new THREE.Vector2(.009, -.02)])), mat('#f2f0f6', { side: THREE.DoubleSide }), 0, .002, -.014);
    tail.rotation.x = Math.PI / 2 - .2; g.add(tail);
    const wingShape = new THREE.Shape([new THREE.Vector2(0, .006), new THREE.Vector2(.012, .009), new THREE.Vector2(.026, .004), new THREE.Vector2(.032, -.004), new THREE.Vector2(.018, -.008), new THREE.Vector2(0, -.006)]);
    const wings = [-1, 1].map(s => {
      const pin = new THREE.Group(); pin.position.set(s * .007, .004, .002); g.add(pin);
      const w = mesh(new THREE.ShapeGeometry(wingShape), white); w.rotation.x = -Math.PI / 2; w.scale.x = s; pin.add(w);
      const t = mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(.022, .006), new THREE.Vector2(.032, -.004), new THREE.Vector2(.02, -.007)])), tip); t.rotation.x = -Math.PI / 2; t.scale.x = s; t.position.y = .0005; pin.add(t);
      return pin;
    });
    g.traverse(x => { if (x.material) x.material.side = THREE.DoubleSide; });
    return { root: g, wings };
  }

  return { pages, house, plaza, rooftops, lanternString, skyLantern, cloud, dove, seeded };
};
