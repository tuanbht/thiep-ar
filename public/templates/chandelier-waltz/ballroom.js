/* Điệu valse đêm hội: the ballroom, built in code for story.js (template.json "story" loads this file first). A floor of
   polished marble tiles that flip in from the middle, a painted wall that folds up (tall arched windows on a moonlit
   night, wine drapes, gold mouldings; a moonlit copy painted over it fades in at the end), two columns twined with roses,
   two gilded urns of roses, a chandelier of gold rings, candles and crystals, moonbeams, and a faint mirror image of the dancers
   in the floor. The story places and times them; flames flicker by T, the act's own time.
     NM_WALTZ.scenery(kit, layout) → the builders; layout: { FLOOR, WALL, CHAN, COLUMNS, URNS } */
(window.NM_WALTZ = window.NM_WALTZ || {}).scenery = (kit, { FLOOR, WALL, CHAN, COLUMNS, URNS }) => {
  const { THREE, stage, ease, seg, clamp, lerp } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const geo = g => kit.keep(g);
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .6, ...o }));
  const GOLD = () => mat(0xe2b04e, { metalness: .85, roughness: .26, envMap: kit.env, envMapIntensity: 1.3, emissive: 0x3d2600, emissiveIntensity: .25 });
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo(g), m); o.position.set(x, y, z); o.castShadow = true; return o; };
  const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), V3(1, 1, 1));
  /** many small fixed shapes as one geometry, so they are drawn at once: parts are [geometry, matrix] */
  function merge(parts) {
    const pos = [], nor = [], uv = [];
    for (const [g, m] of parts) {
      const n = g.index ? g.toNonIndexed() : g; n.applyMatrix4(m);
      const p = n.attributes.position.array, q = n.attributes.normal.array, t = n.attributes.uv.array;
      for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(q[i]); }
      for (let i = 0; i < t.length; i++) uv.push(t[i]);
      if (n !== g) n.dispose(); g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return geo(out);
  }
  /** a box whose top is one material and every other face another: two draws instead of six */
  function slab(w, h, d) {
    const g = new THREE.BoxGeometry(w, h, d), idx = Array.from(g.index.array);
    g.setIndex([...idx.slice(12, 18), ...idx.slice(0, 12), ...idx.slice(18)]); g.clearGroups(); g.addGroup(0, 6, 0); g.addGroup(6, 30, 1);
    return geo(g);
  }

  /* ── the floor: 8 by 5 marble tiles, ivory and wine, gold seams and a star in a ring at the middle ── */
  const NX = 8, NZ = 5, TILE = 1 / NX, DEPTH = kit.card.depth;
  function paintFloor(c, w, h) {
    const r = seeded(7), tw = w / NX, th = h / NZ;
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const dark = (i + j) % 2, x = i * tw, y = j * th;
      const g = c.createLinearGradient(x, y, x + tw, y + th);
      g.addColorStop(0, dark ? '#6b2846' : '#f6ecdb'); g.addColorStop(1, dark ? '#4a1530' : '#e8d8bd');
      c.fillStyle = g; c.fillRect(x, y, tw, th);
      for (let k = 0; k < 5; k++) {                                     // veins, a few per tile, each its own way
        c.strokeStyle = dark ? `rgba(255,214,228,${.12 + .14 * r()})` : `rgba(120,96,80,${.1 + .14 * r()})`; c.lineWidth = .8 + r() * 1.6;
        c.beginPath(); let vx = x + r() * tw, vy = y + r() * th; c.moveTo(vx, vy);
        for (let s = 0; s < 6; s++) { vx += (r() - .3) * tw * .3; vy += (r() - .5) * th * .3; c.lineTo(vx, vy); }
        c.stroke();
      }
      const sh = c.createRadialGradient(x + tw * .3, y + th * .3, 0, x + tw * .3, y + th * .3, tw * .8);   // a polished shine
      sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sh; c.fillRect(x, y, tw, th);
    }
    c.strokeStyle = '#c99a3e'; c.lineWidth = 4;                           // gold seams
    for (let i = 1; i < NX; i++) { c.beginPath(); c.moveTo(i * tw, 0); c.lineTo(i * tw, h); c.stroke(); }
    for (let j = 1; j < NZ; j++) { c.beginPath(); c.moveTo(0, j * th); c.lineTo(w, j * th); c.stroke(); }
    c.strokeStyle = '#d8ab4c'; c.lineWidth = 10; c.strokeRect(14, 14, w - 28, h - 28);
    c.strokeStyle = '#7a4a1a'; c.lineWidth = 2; c.strokeRect(8, 8, w - 16, h - 16); c.strokeRect(21, 21, w - 42, h - 42);
    const cx = w / 2, cy = h / 2, rr = th * .95;                         // the medallion under the chandelier
    c.fillStyle = 'rgba(252,240,222,.94)'; c.beginPath(); c.arc(cx, cy, rr, 0, TAU); c.fill();
    c.strokeStyle = '#c99a3e'; c.lineWidth = 9; c.stroke();
    c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, rr * .86, 0, TAU); c.stroke();
    for (let k = 0; k < 16; k++) {                                      // a sixteen-point star, gold and rose
      const a = k / 16 * TAU, long = k % 2 ? .55 : .8;
      c.fillStyle = k % 2 ? '#e88aa6' : '#d9a640'; c.strokeStyle = '#7a4a1a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(a - .17) * rr * .22, cy + Math.sin(a - .17) * rr * .22);
      c.lineTo(cx + Math.cos(a) * rr * long, cy + Math.sin(a) * rr * long);
      c.lineTo(cx + Math.cos(a + .17) * rr * .22, cy + Math.sin(a + .17) * rr * .22); c.closePath(); c.fill(); c.stroke();
    }
    c.fillStyle = '#8a1f3d'; c.beginPath(); c.arc(cx, cy, rr * .12, 0, TAU); c.fill();
    for (let k = 0; k < 40; k++) { const a = k / 40 * TAU; c.fillStyle = k % 2 ? '#d9a640' : '#e88aa6'; c.beginPath(); c.arc(cx + Math.cos(a) * rr * .93, cy + Math.sin(a) * rr * .93, 4, 0, TAU); c.fill(); }
  }
  /** { tiles: [{ m, at }], whole, done, shine }: each tile flips in at its own time, from the middle out; once all are down
      one slab with the same picture takes their place */
  function makeFloor() {
    const map = kit.canvasTexture(1024, 640, paintFloor);
    const top = mat(0xffffff, { map, roughness: .16, metalness: .1, envMap: kit.env, envMapIntensity: .9 });
    const side = mat(0x3d1428, { roughness: .4 });
    const tiles = [];
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const g = slab(TILE, FLOOR, DEPTH / NZ), uv = g.attributes.uv;
      for (let k = 8; k < 12; k++) uv.setXY(k, (i + uv.getX(k)) / NX, 1 - (j + 1 - uv.getY(k)) / NZ);   // the top face: its piece of the picture
      const m = new THREE.Mesh(g, [top, side]);
      const x = -.5 + (i + .5) * TILE, z = -DEPTH / 2 + (j + .5) * DEPTH / NZ;
      m.position.set(x, FLOOR / 2, z); m.receiveShadow = true; stage.add(m);
      tiles.push({ m, x, z, at: .55 + Math.hypot(x, z * 1.3) * 1.5 });
    }
    const shine = new THREE.Mesh(geo(new THREE.PlaneGeometry(.7, .5).rotateX(-R)), kit.keep(new THREE.MeshBasicMaterial({ map: kit.canvasTexture(256, 256, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,220,150,1)'); g.addColorStop(.35, 'rgba(255,190,110,.45)'); g.addColorStop(1, 'rgba(255,180,100,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    }), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));   // the chandelier's glow on the polish
    shine.position.set(CHAN.x, FLOOR + .0008, CHAN.z + .04); stage.add(shine);
    const whole = new THREE.Mesh(slab(1, FLOOR, DEPTH), [top, side]); whole.position.y = FLOOR / 2; whole.receiveShadow = true; stage.add(whole);
    return { tiles, whole, done: Math.max(...tiles.map(t => t.at)) + .5, shine };
  }
  function poseFloor(f, g) {
    const down = g >= f.done; f.whole.visible = down;
    for (const t of f.tiles) {
      const k = ease.out(seg(g, t.at, t.at + .5));
      t.m.visible = k > 0 && !down; t.m.rotation.x = (1 - k) * Math.PI * (t.z > 0 ? -1 : 1);
      t.m.position.y = FLOOR / 2 + .05 * Math.sin(Math.PI * k);
      t.m.scale.setScalar(Math.max(.001, .35 + .65 * k));
    }
  }

  /* ── the wall: three tall arched windows on the night, drapes, pilasters, sconces, a gilt cornice, rose garlands ── */
  const PX = 1024 / WALL.width, WX = x => (x + WALL.width / 2) * PX, WY = (y, h) => h - y * PX;
  const WINDOWS = [[0, .26, .1, .5], [-.33, .19, .12, .44], [.33, .19, .12, .44]];   // [middle x, width, sill, where the arch starts]
  function archPath(c, x0, x1, yb, ya, h) {                            // a window's outline: straight sides, a round top
    const r = (x1 - x0) / 2;
    c.beginPath(); c.moveTo(x0, yb); c.lineTo(x0, ya); c.arc(x0 + r, ya, r, Math.PI, 0); c.lineTo(x1, yb); c.closePath();
  }
  function paintGlass(c, h, r, moonlit) {
    for (const [mx, ww, sill, top] of WINDOWS) {
      const x0 = WX(mx - ww / 2), x1 = WX(mx + ww / 2), yb = WY(sill, h), ya = WY(top, h), rad = (x1 - x0) / 2;
      c.save(); archPath(c, x0, x1, yb, ya, h); c.clip();
      const sky = c.createLinearGradient(0, ya - rad, 0, yb);
      sky.addColorStop(0, moonlit ? '#1c2a6e' : '#121a4a'); sky.addColorStop(.6, moonlit ? '#3e57a8' : '#2a3a7c'); sky.addColorStop(1, moonlit ? '#7f93d6' : '#4a5c9c');
      c.fillStyle = sky; c.fillRect(x0, ya - rad, x1 - x0, yb - ya + rad);
      for (let i = 0; i < 26; i++) {                                    // stars
        c.fillStyle = `rgba(255,248,226,${.5 + .5 * r()})`; const sx = x0 + r() * (x1 - x0), sy = ya - rad + r() * (yb - ya + rad) * .7, s = .8 + r() * 1.8;
        c.beginPath(); c.arc(sx, sy, s, 0, TAU); c.fill();
      }
      if (mx > 0) {                                                      // the moon in the right-hand window (the chandelier hangs before the middle one)
        const my = WY(top - .02, h), g = c.createRadialGradient(x0 + rad, my, 0, x0 + rad, my, rad * 1.1);
        g.addColorStop(0, moonlit ? 'rgba(255,250,230,.9)' : 'rgba(255,246,220,.6)'); g.addColorStop(1, 'rgba(255,246,220,0)');
        c.fillStyle = g; c.fillRect(x0, my - rad * 1.2, x1 - x0, rad * 2.4);
        c.fillStyle = '#fff6dc'; c.beginPath(); c.arc(x0 + rad, my, rad * .32, 0, TAU); c.fill();
        c.fillStyle = 'rgba(214,200,170,.5)'; for (const [dx, dy, s] of [[-.1, -.08, .07], [.12, .05, .09], [-.04, .12, .05]]) { c.beginPath(); c.arc(x0 + rad + dx * rad, my + dy * rad, s * rad, 0, TAU); c.fill(); }
      } else if (mx < 0) {                                               // far towers of the castle, lit windows
        c.fillStyle = moonlit ? '#2a3570' : '#1a2152';
        const base = yb - (yb - ya) * .28, sgn = Math.sign(mx);
        c.beginPath(); c.moveTo(x0, yb); c.lineTo(x0, base + 20);
        for (const [fx, fw, fh] of [[.12, .16, .5], [.4, .12, .75], [.62, .2, .4], [.84, .1, .6]]) {
          const tx = sgn > 0 ? x0 + fx * (x1 - x0) : x1 - fx * (x1 - x0) - fw * (x1 - x0), tw = fw * (x1 - x0), ty = base - fh * (yb - ya) * .5;
          c.lineTo(tx, base); c.lineTo(tx, ty); c.lineTo(tx + tw / 2, ty - tw * .9); c.lineTo(tx + tw, ty); c.lineTo(tx + tw, base);
        }
        c.lineTo(x1, base + 20); c.lineTo(x1, yb); c.closePath(); c.fill();
        c.fillStyle = '#ffd88a'; for (let i = 0; i < 7; i++) c.fillRect(x0 + (.15 + .7 * r()) * (x1 - x0), base - r() * (yb - ya) * .3, 3, 5);
      }
      c.restore();
      c.strokeStyle = '#efe0b8'; c.lineWidth = 5;                       // mullions and the fan in the arch
      c.beginPath(); c.moveTo(x0 + rad, ya - rad); c.lineTo(x0 + rad, yb);
      for (let k = 1; k < 4; k++) { const y = ya + (yb - ya) * k / 4; c.moveTo(x0, y); c.lineTo(x1, y); }
      for (const a of [-.75, -.4, .4, .75]) { c.moveTo(x0 + rad, ya); c.lineTo(x0 + rad + Math.sin(a) * rad, ya - Math.cos(a) * rad); }
      c.moveTo(x0, ya); c.lineTo(x1, ya); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 9;          // a sheen across the panes
      c.beginPath(); c.moveTo(x0 + (x1 - x0) * .15, yb - 10); c.lineTo(x1 - (x1 - x0) * .1, ya - rad * .6); c.stroke();
    }
  }
  function drape(c, x, top, bottom, dir, wdt, h, r, moonlit) {          // a curtain hung at x, gathered by a gold rope
    const tie = top + (bottom - top) * .55, out = dir * wdt;
    const g = c.createLinearGradient(x, 0, x + out * 1.6, 0);
    g.addColorStop(0, moonlit ? '#3a1834' : '#8a1f3d'); g.addColorStop(.5, moonlit ? '#2a0f28' : '#6a1530'); g.addColorStop(1, moonlit ? '#1c0a1c' : '#4d0e24');
    c.fillStyle = g; c.strokeStyle = '#2b0a17'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - dir * 6, top); c.lineTo(x + out * 1.5, top);
    c.quadraticCurveTo(x + out * 1.1, tie, x + out * .5, tie);
    c.quadraticCurveTo(x + out * 1.4, tie + (bottom - tie) * .5, x + out * 1.7, bottom); c.lineTo(x - dir * 6, bottom); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = moonlit ? 'rgba(160,120,190,.35)' : 'rgba(255,170,190,.4)'; c.lineWidth = 3;   // folds
    for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + out * .35 * k, top + 4); c.quadraticCurveTo(x + out * (.2 + .25 * k), tie, x + out * .45, tie); c.stroke();
      c.beginPath(); c.moveTo(x + out * .5, tie + 4); c.quadraticCurveTo(x + out * (.5 + .3 * k), tie + (bottom - tie) * .5, x + out * (.4 + .4 * k), bottom - 2); c.stroke(); }
    c.fillStyle = '#e8b64e'; c.strokeStyle = '#6b4512'; c.lineWidth = 2;  // the rope and its tassel
    c.beginPath(); c.ellipse(x + out * .5, tie, 9, 6, 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x + out * .5 - 6, tie + 6); c.lineTo(x + out * .5 + 6, tie + 6); c.lineTo(x + out * .5 + 9, tie + 34); c.lineTo(x + out * .5 - 9, tie + 34); c.closePath(); c.fill(); c.stroke();
  }
  function paintWall(c, w, h, moonlit) {
    const r = seeded(moonlit ? 77 : 33);
    c.fillStyle = '#f2e1c2'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(196,150,90,.13)';                                 // damask
    for (let y = 16; y < h; y += 34) for (let x = (y / 34 % 2) * 17; x < w; x += 34) { c.beginPath(); c.ellipse(x, y, 4, 7, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(x, y - 9, 2.5, 0, TAU); c.fill(); }
    const cove = c.createLinearGradient(0, 0, 0, WY(.7, h));               // the ceiling's cove, warm
    cove.addColorStop(0, '#e4c78f'); cove.addColorStop(1, '#f7e8c8'); c.fillStyle = cove; c.fillRect(0, 0, w, WY(.7, h));
    for (let i = 0; i < 9; i++) {                                        // painted clouds up in the cove
      c.fillStyle = 'rgba(255,250,238,.55)'; const x = r() * w, y = WY(.73 + r() * .05, h);
      for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * 16, y + (k % 2) * 4, 12 + r() * 8, 0, TAU); c.fill(); }
    }
    const cy0 = WY(.7, h), cy1 = WY(.655, h);                             // the gilt cornice: a band, dentils, beads
    const gb = c.createLinearGradient(0, cy0, 0, cy1); gb.addColorStop(0, '#f6d987'); gb.addColorStop(.5, '#d6a647'); gb.addColorStop(1, '#9c6f22');
    c.fillStyle = gb; c.fillRect(0, cy0, w, cy1 - cy0);
    c.fillStyle = '#7a5418'; for (let x = 4; x < w; x += 14) c.fillRect(x, cy1 - 12, 7, 9);
    c.fillStyle = '#fff1c4'; for (let x = 9; x < w; x += 14) { c.beginPath(); c.arc(x, cy0 + 8, 2.6, 0, TAU); c.fill(); }
    c.strokeStyle = '#5e3f10'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, cy0); c.lineTo(w, cy0); c.moveTo(0, cy1); c.lineTo(w, cy1); c.stroke();
    for (const px of [-.53, -.165, .165, .53]) {                         // pilasters with gold capitals and a sconce each
      const x = WX(px), pw = 34;
      c.fillStyle = '#f8ecd4'; c.fillRect(x - pw / 2, WY(.655, h), pw, WY(.09, h) - WY(.655, h));
      c.strokeStyle = 'rgba(160,120,70,.45)'; c.lineWidth = 2; for (const dx of [-10, -3, 4, 11]) { c.beginPath(); c.moveTo(x + dx, WY(.6, h)); c.lineTo(x + dx, WY(.13, h)); c.stroke(); }
      c.fillStyle = '#d9a845'; c.strokeStyle = '#6b4512'; c.lineWidth = 2;
      c.fillRect(x - pw / 2 - 6, WY(.655, h), pw + 12, 14); c.strokeRect(x - pw / 2 - 6, WY(.655, h), pw + 12, 14);
      for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * 13, WY(.655, h) + 20, 7, 0, TAU); c.fill(); c.stroke(); }
      const sy = WY(.36, h);                                             // a sconce: a bracket, two candles, their glow
      c.beginPath(); c.moveTo(x - 20, sy); c.quadraticCurveTo(x, sy + 22, x + 20, sy); c.lineWidth = 5; c.strokeStyle = '#c99a3e'; c.stroke();
      for (const s of [-1, 1]) {
        c.fillStyle = '#fff6e6'; c.fillRect(x + s * 20 - 3, sy - 22, 6, 20);
        const fl = c.createRadialGradient(x + s * 20, sy - 28, 0, x + s * 20, sy - 28, 26); fl.addColorStop(0, 'rgba(255,214,130,.95)'); fl.addColorStop(1, 'rgba(255,190,90,0)');
        c.fillStyle = fl; c.fillRect(x + s * 20 - 26, sy - 54, 52, 52);
        c.fillStyle = '#ffcf5a'; c.beginPath(); c.ellipse(x + s * 20, sy - 28, 3, 7, 0, 0, TAU); c.fill();
      }
    }
    paintGlass(c, h, r, moonlit);
    for (const [mx, ww, sill, top] of WINDOWS) {                         // frames, sills, drapes, a swag above each window
      const x0 = WX(mx - ww / 2), x1 = WX(mx + ww / 2), yb = WY(sill, h), ya = WY(top, h), rad = (x1 - x0) / 2;
      c.strokeStyle = '#d6a647'; c.lineWidth = 11; archPath(c, x0, x1, yb, ya, h); c.stroke();
      c.strokeStyle = '#6b4512'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#e9d3a6'; c.fillRect(x0 - 14, yb, x1 - x0 + 28, 12); c.strokeRect(x0 - 14, yb, x1 - x0 + 28, 12);
      const dt = ya - rad - 16, db = WY(.08, h), dw = (x1 - x0) * .2;
      drape(c, x0 - 4, dt, db, -1, dw, h, r, moonlit); drape(c, x1 + 4, dt, db, 1, dw, h, r, moonlit);
      c.fillStyle = moonlit ? '#3a1834' : '#8a1f3d'; c.strokeStyle = '#2b0a17'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x0 - 30, dt - 10); c.lineTo(x1 + 30, dt - 10);
      for (let k = 3; k >= 0; k--) { const a = x0 - 30 + (x1 - x0 + 60) * (k + 1) / 4, b = x0 - 30 + (x1 - x0 + 60) * k / 4; c.quadraticCurveTo((a + b) / 2, dt + 34, b, dt - 6); }
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#e8b64e'; for (let k = 0; k <= 4; k++) { const x = x0 - 30 + (x1 - x0 + 60) * k / 4; c.beginPath(); c.arc(x, dt - 4, 6, 0, TAU); c.fill(); c.stroke(); }
    }
    for (let k = 0; k < 4; k++) {                                        // rose garlands under the cornice, between the windows
      const a = WX([-.53, -.165, .165, .53][k]), b = k < 3 ? WX([-.165, .165, .53][k]) : null; if (b === null) break;
      const y0 = WY(.645, h);
      for (let i = 0; i <= 14; i++) {
        const t = i / 14, x = lerp(a, b, t), y = y0 + 24 * Math.sin(Math.PI * t);
        c.fillStyle = '#5f8f4e'; c.beginPath(); c.ellipse(x + 6, y + 4, 7, 3.5, .6, 0, TAU); c.fill();
        c.fillStyle = i % 3 ? '#f08aa8' : '#c94370'; c.beginPath(); c.arc(x, y, 6.5, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(120,20,50,.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 3, 0, 5); c.stroke();
      }
    }
    const dado = WY(.09, h);                                              // the dado: panels framed in gold, a wine skirting
    c.fillStyle = '#ead6b2'; c.fillRect(0, dado, w, h - dado);
    c.strokeStyle = '#c99a3e'; c.lineWidth = 3; for (let x = 10; x < w - 60; x += 86) c.strokeRect(x, dado + 10, 70, h - dado - 34);
    c.fillStyle = '#5a1530'; c.fillRect(0, h - 16, w, 16);
    c.fillStyle = '#d6a647'; c.fillRect(0, dado - 4, w, 6);
    if (moonlit) {                                                       // moonlight: everything blue and dim but the windows
      c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = '#3d4890'; c.fillRect(0, 0, w, h); c.restore();
      paintGlass(c, h, seeded(33), true);
      for (const [mx, ww, sill] of WINDOWS) {                            // the moonlight spilling down the wall under each window
        const x = WX(mx), g = c.createLinearGradient(0, WY(sill, h), 0, h); g.addColorStop(0, 'rgba(170,190,255,.32)'); g.addColorStop(1, 'rgba(170,190,255,0)');
        c.fillStyle = g; c.fillRect(x - ww * PX * .6, WY(sill, h), ww * PX * 1.2, h - WY(sill, h));
      }
    }
  }
  /** the wall on a hinge at its foot: { root (fold it up), day, night (fade it in) } */
  function makeWall() {
    const o = { width: WALL.width, height: WALL.height, curve: WALL.curve, z: 0 };
    const root = new THREE.Group(); root.position.z = WALL.z;
    const day = kit.backdrop((c, w, h) => paintWall(c, w, h, false), { ...o, order: -4 });
    const night = kit.backdrop((c, w, h) => paintWall(c, w, h, true), { ...o, order: -3 }); night.position.z = .002; night.material.opacity = 0;
    const back = new THREE.Mesh(day.geometry, mat(0xead8b4, { roughness: 1, side: THREE.BackSide })); back.position.z = -.002;
    root.add(back, day, night); stage.add(root);
    return { root, day, night };
  }
  const wallZ = x => WALL.z + WALL.curve * (x / (WALL.width / 2)) ** 2;   // where the wall stands at x

  /* ── a column of veined marble, fluted, gilt at top and foot, a rose garland twined up it ── */
  function makeColumn(seed) {
    const root = new THREE.Group(), r = seeded(seed), H = WALL.height - .02;
    const flutes = kit.canvasTexture(256, 512, (c, w, h) => {
      c.fillStyle = '#f7eedd'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) { const x = (i + .5) * w / 12, g = c.createLinearGradient(x - 10, 0, x + 10, 0); g.addColorStop(0, 'rgba(150,120,90,.05)'); g.addColorStop(.5, 'rgba(120,90,60,.3)'); g.addColorStop(1, 'rgba(150,120,90,.05)'); c.fillStyle = g; c.fillRect(x - 10, 0, 20, h); }
      for (let i = 0; i < 9; i++) { c.strokeStyle = `rgba(150,130,120,${.15 + .2 * r()})`; c.lineWidth = 1 + r() * 1.5; c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (r() - .5) * 40; y += 20 + r() * 40; c.lineTo(x, y); } c.stroke(); }
    });
    const marble = mat(0xffffff, { map: flutes, roughness: .3, envMap: kit.env, envMapIntensity: .6 }), gold = GOLD();
    root.add(new THREE.Mesh(merge([[new THREE.CylinderGeometry(.024, .028, H - .08, 24), M(0, .04 + (H - .08) / 2, 0)], [new THREE.BoxGeometry(.075, .022, .075), M(0, .011, 0)]]), marble),
      new THREE.Mesh(merge([[new THREE.CylinderGeometry(.032, .036, .018, 24), M(0, .031, 0)], [new THREE.CylinderGeometry(.034, .025, .03, 24), M(0, H - .025, 0)],
        [new THREE.BoxGeometry(.078, .014, .078), M(0, H - .003, 0)], ...[-1, 1].map(s => [new THREE.TorusGeometry(.009, .004, 6, 12), M(s * .03, H - .02, .025, 0, R)])]), gold));
    root.children.forEach(o => { o.castShadow = true; });
    const N = 22, roses = new THREE.InstancedMesh(geo(new THREE.IcosahedronGeometry(.011, 1)), mat(0xf27fa3, { roughness: .55, emissive: 0x5a0f2a, emissiveIntensity: .2 }), N);
    const leaves = new THREE.InstancedMesh(geo(new THREE.SphereGeometry(.009, 6, 4).scale(1.4, .35, .7)), mat(0x5e9a4c, { roughness: .7 }), N * 2);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), list = [];
    for (let i = 0; i < N; i++) {                                         // a helix up the shaft
      const t = i / (N - 1), a = t * TAU * 2.2 + seed, y = .07 + t * (H - .16), x = Math.cos(a) * .03, z = Math.sin(a) * .03;
      list.push({ x, y, z, a, at: t });
      m4.compose(V3(x, y, z), q.setFromEuler(e.set(r(), r(), r())), V3(1, 1, 1).multiplyScalar(.8 + .4 * r())); roses.setMatrixAt(i, m4);
      for (const s of [-1, 1]) { m4.compose(V3(x + Math.cos(a + s * .5) * .008, y - .004, z + Math.sin(a + s * .5) * .008), q.setFromEuler(e.set(0, -a + s, .4 * s)), V3(1, 1, 1)); leaves.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), m4); }
    }
    roses.castShadow = leaves.castShadow = true; root.add(roses, leaves);
    stage.add(root);
    return { root, roses, leaves, list, H };
  }
  function makeColumns() { return COLUMNS.map(([x, z], i) => { const c = makeColumn(11 + i * 7); c.root.position.set(x, FLOOR, z); return c; }); }
  /** rise: how far up it has grown (0..1, the shaft stretches with a spring); bloom: how many roses are out */
  const m4c = new THREE.Matrix4(), vP = new THREE.Vector3(), qC = new THREE.Quaternion(), vS = new THREE.Vector3();
  function poseColumn(c, rise, bloom) {
    c.root.scale.set(Math.max(.001, lerp(.5, 1, Math.min(1, rise * 2))), Math.max(.001, rise), Math.max(.001, lerp(.5, 1, Math.min(1, rise * 2))));
    c.list.forEach((p, i) => {
      const k = ease.back(clamp((bloom - p.at) * 6));
      c.roses.getMatrixAt(i, m4c); m4c.decompose(vP, qC, vS); vS.setScalar(Math.max(.001, k * (.8 + .4 * ((i * 37) % 10) / 10))); m4c.compose(vP, qC, vS); c.roses.setMatrixAt(i, m4c);
    });
    c.roses.instanceMatrix.needsUpdate = true; c.leaves.visible = bloom > .05;
  }

  /* ── candle flames: bright drops (one instanced mesh for all of them) with a glow each, lit and put out ── */
  const flameGeo = geo(new THREE.SphereGeometry(.0042, 8, 6).scale(1, 2.1, 1).translate(0, .006, 0)), qI = new THREE.Quaternion();
  /** lit (0..1): how far the flame is up; boost (1 and more): a flare */
  function poseCandle(cd, lit, T, i, boost = 1) {
    const f = 1 + .12 * Math.sin(T * 17 + i * 1.7) * Math.sin(T * 7.1 + i), s0 = cd.glow.userData.s ?? (cd.glow.userData.s = cd.glow.scale.x);
    cd.flames.setMatrixAt(cd.i, m4c.compose(cd.p, qI, vS.setScalar(lit > .01 ? Math.max(.001, ease.back(Math.min(1, lit)) * f * boost) : .0001)));
    cd.flames.instanceMatrix.needsUpdate = true;
    cd.glow.visible = lit > .01; cd.glow.material.opacity = Math.min(1, .9 * lit * f); cd.glow.scale.setScalar(s0 * boost);
  }

  /* ── two gilded urns at the front corners, each with a round bush of roses that blooms ── */
  function makeUrns() {
    return URNS.map(([x, z], k) => {
      const root = new THREE.Group(), gold = GOLD(), r = seeded(61 + k); root.position.set(x, FLOOR, z);
      const pts = [[0, 0], [.022, 0], [.024, .006], [.012, .016], [.011, .03], [.016, .04], [.034, .062], [.036, .072], [.03, .074]].map(([a, b]) => new THREE.Vector2(a, b));
      root.add(mesh(new THREE.LatheGeometry(pts, 20), gold));
      root.add(mesh(new THREE.SphereGeometry(.034, 14, 10), mat(0x4f8f45, { roughness: .8 }), 0, .1, 0));   // the bush under the roses
      const N = 26, roses = new THREE.InstancedMesh(geo(new THREE.IcosahedronGeometry(.0095, 1)), mat(0xf27fa3, { roughness: .55, emissive: 0x5a0f2a, emissiveIntensity: .2 }), N);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), list = [];
      for (let i = 0; i < N; i++) {                                        // roses over the top of the bush
        const a = r() * TAU, el = r() * 1.2, p = V3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)).multiplyScalar(.036).add(V3(0, .1, 0));
        list.push({ p, at: r() }); m4.compose(p, q.setFromEuler(e.set(r(), r(), r())), V3(1, 1, 1)); roses.setMatrixAt(i, m4);
      }
      roses.material.color.set(k ? '#ff9fbf' : '#f27fa3'); roses.castShadow = true; root.add(roses);
      stage.add(root);
      return { root, roses, list };
    });
  }
  /** grow: the urn pops up (0..1); bloom: how many of its roses are out */
  function poseUrn(u, grow, bloom) {
    u.root.scale.setScalar(Math.max(.001, ease.back(grow)));
    u.list.forEach((p, i) => { m4c.compose(p.p, qC.identity(), vS.setScalar(Math.max(.001, ease.back(clamp((bloom - p.at) * 5))))); u.roses.setMatrixAt(i, m4c); });
    u.roses.instanceMatrix.needsUpdate = true;
  }

  /* ── the chandelier: a crown, two rings of candles on curling arms, crystal drops, bead swags, a chain up out of sight ── */
  function makeChandelier() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const gold = GOLD(), crystal = kit.keep(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .1, roughness: .04, envMap: kit.env, envMapIntensity: 2.6,
      transparent: true, opacity: .85, emissive: 0xfff0d0, emissiveIntensity: 0 }));
    const wax = mat(0xfff8ec, { roughness: .5, emissive: 0xffe4b0, emissiveIntensity: .12 });
    const R1 = .1, R2 = .064, R3 = .036, Gp = [], Xp = [], Wp = [], tips = [];   // gold, crystal and wax parts (each drawn as one), the wicks
    for (const [r, y, tube] of [[R1, 0, .0055], [R1 * .93, -.008, .0028], [R2, .055, .0045], [R3, .11, .004]]) Gp.push([new THREE.TorusGeometry(r, tube, 8, 64), M(0, y, 0, R)]);
    Gp.push([new THREE.CylinderGeometry(.0055, .0055, .19, 10), M(0, .07, 0)], [new THREE.SphereGeometry(.03, 20, 12, 0, TAU, R, R).scale(1, .7, 1), M(0, -.004, 0)],
      [new THREE.SphereGeometry(.011, 14, 10), M(0, .03, 0)], [new THREE.SphereGeometry(.009, 14, 10), M(0, .085, 0)], [new THREE.SphereGeometry(.008, 12, 8), M(0, -.03, 0)]);
    Xp.push([new THREE.OctahedronGeometry(.011).scale(1, 1.9, 1), M(0, -.055, 0)]);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; Gp.push([new THREE.ConeGeometry(.005, .022, 6), M(Math.cos(a) * R3, .122, Math.sin(a) * R3)]); }   // the crown
    const arms = (n, r, y0, y1, drop0) => {                              // S-curved arms from the stem out to a ring
      for (let i = 0; i < n; i++) {
        const a = (i + .5) / n * TAU, c = Math.cos(a), s = Math.sin(a);
        const curve = new THREE.CatmullRomCurve3([V3(c * .006, y0, s * .006), V3(c * r * .35, y0 - drop0, s * r * .35), V3(c * r * .75, y1 - .012, s * r * .75), V3(c * r, y1, s * r)]);
        Gp.push([new THREE.TubeGeometry(curve, 16, .0024, 6), M()]);
      }
    };
    arms(8, R1, .03, 0, .03); arms(6, R2, .085, .055, .02);
    const ringOf = (n, r, y, len, off) => { for (let i = 0; i < n; i++) { const a = (i + off) / n * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;   // a cup and a candle
      Gp.push([new THREE.CylinderGeometry(.008, .005, .005, 10), M(x, y + .003, z)]); Wp.push([new THREE.CylinderGeometry(.0045, .005, len, 8), M(x, y + .005 + len / 2, z)]);
      tips.push(V3(x, y + .005 + len, z)); } };
    ringOf(8, R1, 0, .026, .5); ringOf(6, R2, .055, .022, 0);
    for (let i = 0; i < 16; i++) {                                        // crystals hanging under the ring
      const a = (i + .25) / 16 * TAU; Xp.push([new THREE.OctahedronGeometry(.0055).scale(1, 1.8, 1), M(Math.cos(a) * R1 * .97, -.018 - (i % 2) * .008, Math.sin(a) * R1 * .97)]);
    }
    body.add(new THREE.Mesh(merge(Gp), gold), new THREE.Mesh(merge(Xp), crystal), new THREE.Mesh(merge(Wp), wax));
    const flames = new THREE.InstancedMesh(flameGeo, kit.keep(new THREE.MeshBasicMaterial({ color: 0xffd47a, toneMapped: false })), tips.length);
    flames.frustumCulled = false; body.add(flames);
    const candles = tips.map((p, i) => { const glow = kit.glow({ color: 0xffb04a, size: .055, opacity: 0 }); glow.position.copy(p).y += .008; body.add(glow); return { flames, i, p, glow }; });
    const beads = new THREE.InstancedMesh(geo(new THREE.IcosahedronGeometry(.0026, 0)), crystal, 8 * 9), m4 = new THREE.Matrix4();
    for (let k = 0; k < 8; k++) for (let i = 0; i < 9; i++) {             // bead swags between the arms
      const t = (i + 1) / 10, a = ((k + .5) + t) / 8 * TAU, r = R1 * .98;
      m4.makeTranslation(Math.cos(a) * r, -.004 - .022 * Math.sin(Math.PI * t), Math.sin(a) * r); beads.setMatrixAt(k * 9 + i, m4);
    }
    body.add(beads);
    const link = geo(new THREE.TorusGeometry(.0065, .0016, 5, 10)), q = new THREE.Quaternion(), e = new THREE.Euler();
    [1, .7, .4, .15].forEach((opacity, k) => {                          // the chain, fading as it goes up into a ceiling too high to see
      const m = opacity < 1 ? kit.keep(gold.clone()) : gold; if (opacity < 1) { m.transparent = true; m.opacity = opacity; m.depthWrite = false; }
      const links = new THREE.InstancedMesh(link, m, 8);
      for (let i = 0; i < 8; i++) { const n = k * 8 + i; m4.compose(V3(0, .17 + n * .0115, 0), q.setFromEuler(e.set(0, n % 2 ? R : 0, R)), V3(1, 1.3, 1)); links.setMatrixAt(i, m4); }
      root.add(links);
    });
    const halo = kit.glow({ color: 0xffcf86, size: .5, opacity: 0 }); halo.position.y = .02; body.add(halo);
    const light = new THREE.PointLight(0xffc77a, 0, 1.9, 1.3); light.position.y = -.01; body.add(light);
    root.traverse(o => { o.castShadow = false; });                     // its shadow would fall off the card's front edge at night
    root.position.set(CHAN.x, CHAN.top, CHAN.z); stage.add(root);
    return { root, body, candles, crystal, halo, light };
  }

  /* ── moonbeams: three shafts of light falling from the windows across the floor, and the pool where they land ── */
  function makeBeams() {
    const shaft = kit.canvasTexture(64, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(210,225,255,.9)'); g.addColorStop(.7, 'rgba(190,210,255,.35)'); g.addColorStop(1, 'rgba(190,210,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      const s = c.createLinearGradient(0, 0, w, 0); s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(.25, 'rgba(0,0,0,0)'); s.addColorStop(.75, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)');
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = s; c.fillRect(0, 0, w, h);
    });
    const beams = WINDOWS.map(([mx, ww, sill, top]) => {
      const zTop = wallZ(mx) + .01, yTop = (sill + top) / 2 + .06, xEnd = mx * .55, zEnd = .1, yEnd = FLOOR + .002;
      const g = new THREE.BufferGeometry(), half = ww * .45, spread = ww * .8;
      g.setAttribute('position', new THREE.Float32BufferAttribute([mx - half, yTop, zTop, mx + half, yTop, zTop, xEnd - spread, yEnd, zEnd, xEnd + spread, yEnd, zEnd], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2)); g.setIndex([0, 2, 1, 1, 2, 3]);
      const m = new THREE.Mesh(geo(g), kit.keep(new THREE.MeshBasicMaterial({ map: shaft, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })));
      m.renderOrder = 4; stage.add(m); return m;
    });
    const pool = new THREE.Mesh(geo(new THREE.PlaneGeometry(.52, .3).rotateX(-R)), kit.keep(new THREE.MeshBasicMaterial({ map: kit.canvasTexture(256, 256, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(200,215,255,.9)'); g.addColorStop(1, 'rgba(200,215,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w);
    }), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
    pool.position.set(0, FLOOR + .001, .06); pool.renderOrder = 3; stage.add(pool);
    return { beams, pool };
  }

  /* ── the floor's mirror: a faint upside-down twin of each model under the polish. Each twin is drawn where the floor
        is (its depth taken at the floor, so what stands on the floor still hides it) and fades the deeper it goes ── */
  const MIRROR = { uToStage: { value: new THREE.Matrix4() }, uFromStage: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3(0, 1, 1) },
    uFloor: { value: FLOOR }, uHalf: { value: new THREE.Vector2(.5, DEPTH / 2) }, uAlpha: { value: .3 }, uFade: { value: .16 } };
  const vCam = new THREE.Vector3();
  function mirrorMaterial(src) {
    const m = kit.keep(new THREE.MeshBasicMaterial({ map: src.map || null, color: src.color ? src.color.clone().multiplyScalar(.8) : 0xffffff, transparent: true, depthWrite: false,
      side: src.side ?? THREE.FrontSide }));
    m.onBeforeCompile = s => {
      Object.assign(s.uniforms, MIRROR);
      s.vertexShader = 'uniform mat4 uToStage, uFromStage; uniform vec3 uCam; uniform float uFloor; varying vec3 vMirror;\n' + s.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vMirror = ( uToStage * modelMatrix * vec4( transformed, 1.0 ) ).xyz;
        vec3 mq = uCam + ( vMirror - uCam ) * ( ( uCam.y - uFloor - 0.0004 ) / max( 1e-4, uCam.y - vMirror.y ) );
        vec4 mc = projectionMatrix * viewMatrix * ( uFromStage * vec4( mq, 1.0 ) );
        gl_Position.z = mc.z / mc.w * gl_Position.w;`);
      s.fragmentShader = 'uniform vec3 uCam; uniform float uFloor, uAlpha, uFade; uniform vec2 uHalf; varying vec3 vMirror;\n' + s.fragmentShader
        .replace('void main() {', `void main() {
          if ( vMirror.y > uFloor ) discard;
          vec3 mq = uCam + ( vMirror - uCam ) * ( ( uCam.y - uFloor ) / max( 1e-4, uCam.y - vMirror.y ) );
          if ( abs( mq.x ) > uHalf.x - 0.01 || abs( mq.z ) > uHalf.y - 0.01 ) discard;`)
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= uAlpha * ( 1.0 - smoothstep( 0.0, uFade, uFloor - vMirror.y ) );');
    };
    m.customProgramCacheKey = () => 'waltz-mirror';
    return m;
  }
  const S_FLIP = new THREE.Matrix4().makeScale(1, -1, 1).premultiply(new THREE.Matrix4().makeTranslation(0, 2 * FLOOR, 0)), mInv = new THREE.Matrix4();
  /** a twin for every mesh of model m (and what is held or worn on it); sync() after the story has posed everything */
  function mirror(m) {
    const twins = [];
    m.scene.traverse(o => {
      if (!o.isMesh || o.userData.noMirror) return;
      const mats = Array.isArray(o.material) ? o.material.map(mirrorMaterial) : mirrorMaterial(o.material);
      let t;
      if (o.isSkinnedMesh) { t = new THREE.SkinnedMesh(o.geometry, mats); t.bind(o.skeleton, o.bindMatrix); t.bindMode = THREE.DetachedBindMode; }
      else t = new THREE.Mesh(o.geometry, mats);
      t.matrixAutoUpdate = false; t.frustumCulled = false; t.renderOrder = 1; t.userData.noMirror = true;
      t.onBeforeRender = (renderer, scene, camera) => {
        MIRROR.uFromStage.value.copy(stage.matrixWorld); MIRROR.uToStage.value.copy(stage.matrixWorld).invert();
        MIRROR.uCam.value.copy(vCam.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(MIRROR.uToStage.value));
      };
      stage.add(t); twins.push({ o, t });
    });
    return {
      twins,
      sync() {
        stage.updateMatrixWorld(true); mInv.copy(stage.matrixWorld).invert();
        for (const { o, t } of twins) { t.visible = MIRROR.uAlpha.value > .002 && isShown(o); t.matrix.copy(S_FLIP).multiply(mInv).multiply(o.isSkinnedMesh ? o.bindMatrix : o.matrixWorld); }
      }
    };
  }
  const isShown = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };

  return { seeded, V3, mat, geo, mesh, GOLD, wallZ, makeFloor, poseFloor, makeWall, makeColumns, poseColumn, makeUrns, poseUrn, makeChandelier, poseCandle, makeBeams, mirror, MIRROR };
};
