/* Cùng nhau xây nhà (building our house together), told by the shared act _acts/lovestory.js. Three chapters, each ending at a stop:
     1 · 0–6.4 s     a sky folds up behind the card; he walks in with a rolled blueprint, she with an armful of bricks; he
                     tosses the roll onto the card and it unrolls, the plan glows and the foundation rises out of it; he
                     takes the hammer from his belt, she tosses a brick at a time and each strike snaps a course of bricks
                     round the house; they cheer and a blueprint with the card's first words (note1) unrolls
     2 · 6.4–12.6 s  three more strikes: the walls finish, the gables fold up, the roof goes on tile by tile and the chimney
                     drops in; she takes the roller from the paint tray and paints the door; the window frames snap in; the
                     round attic window swings open and the card's photo flies out with its caption (caption)
     3 · 12.6–19 s   dusk: the photo moves aside, a mailbox springs up, flowers pop out of the window boxes, the lights come
                     on, the door opens and heart-shaped smoke puffs from the chimney; they cheer in the doorway, an arm round
                     each other, and a banner with the last words (note2) rises
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const H = .27, HER = H * .945;                                     // their heights, in card widths (1.80 m and 1.70 m): the door is a grown-up's
  const STRIDE = { boy: .1 * H / .3, girl: .1 * HER / .3 };         // a walk's stride a second at speed 1 (the models' pace makes KayKit's theirs)
  const R = Math.PI / 2;                                             // facing +x
  const HAND = '"Dancing Script", "Segoe Script", "Brush Script MT", cursive';

  /* the house, in card widths: brick walls on a slab, a gable at the front and the back, a tiled roof */
  const SLAB = .024, WX = .19, WB = -.27, WF = -.06, WT = .018;      // the walls' outer faces (x ±WX, z WB at the back, WF in front)
  const C = .042, ROWS = 8, TOP = SLAB + C * ROWS, BL = .07;         // eight courses of chunky bricks: the walls' top at .36
  const DOOR = .05, WIN = [.09, .16], WIN_ROWS = [3, 6];             // the door (|x| < .05, six courses), the windows (|x| .09–.16)
  const RIDGE = TOP + .155, EAVE = { x: .215, y: TOP - .005, back: -.29, front: -.04 };
  const PITCH = Math.atan((RIDGE - EAVE.y) / EAVE.x);
  const CHIMNEY = [.105, -.205], ROUND = { y: TOP + .062, r: .034 }; // the chimney on the right slope; the attic window in the gable
  const SHEET = { x: .17, z0: -.25, z1: -.08 };                      // the blueprint on the ground, under the house
  const SLAB_FRONT = .02;                                            // the slab's front edge: it runs .305 back from here
  const TRAY = [.249, .129], BENCH = .057;                           // the paint tray, up on a plank and bricks in front of her, the roller's grip towards her
  const CARRY = [.193, .062];                                        // her armful's lowest brick, in her own space (up, forward)

  /* when things happen, in story seconds */
  const RELEASE = 2.24, THROW = RELEASE - .33 / .8;                  // the roll leaves his hand a third of a second into Throw (at .8): its hand at the top
  const STRIKES = [3.83, 4.53, 5.23, 7.08, 7.78, 8.48];              // his hammer lands on the front-left corner
  const STRUCK = [1, 2, 3, 4, 6, 6];                                 // the course each strike lands on (the roof's strike too: his reach)
  const TOSS = STRIKES.slice(0, 3).map(s => s - .38);                // she tosses a brick; it lands as he strikes
  const COURSE_AT = [3.6, 3.83, 4.53, 5.23, 7.08, 7.2, 7.78, 7.9];   // each course starts snapping round the house
  const WAVE = .32;                                                  // s per card width round the walls, from the front-left corner
  const ROOF_AT = STRIKES[5], GRAB = 7.45, PAINT = [9.05, 10.25];    // she takes the roller at GRAB (PickUp at its lowest), paints in PAINT
  const DUSK = 12.7, LIGHTS = 14, DOOR_OPEN = 14.3;

  /* the pose a character holds at story time g: [from g, clip, options]; a walk's speed is the way it covers over its stride */
  const BOY = [
    [0, 'Idle'], [.05, 'Walking_A', { speed: .221 / STRIDE.boy }], [1.45, 'Idle', { fade: .15 }], [THROW, 'Throw', { once: true, speed: .8, fade: .12 }],
    [2.85, 'Walking_A', { speed: .129 / STRIDE.boy, fade: .2 }], [3.2, 'Idle', { fade: .2 }], [5.5, 'Cheer', { once: true, speed: 1.4, fade: .2 }],
    [6.3, 'Idle', { fade: .3 }], [9.15, 'Walking_A', { speed: .182 / STRIDE.boy }], [9.85, 'Idle', { fade: .25 }],
    [14.55, 'Walking_A', { speed: .178 / STRIDE.boy }], [15.4, 'Idle', { fade: .2 }],
    [15.85, 'Cheer', { once: true, speed: 1.3, fade: .2 }], [17.1, 'Idle', { fade: .35 }]
  ];
  const GIRL = [
    [0, 'Idle'], [.3, 'Walking_A', { speed: .208 / STRIDE.girl }], [1.6, 'Idle', { fade: .2 }], [5.45, 'Cheer', { once: true, speed: 1.4, fade: .2 }],
    [6.3, 'Idle', { fade: .3 }], [6.6, 'PickUp', { once: true, fade: .2 }], [7.85, 'Idle', { fade: .2 }], [7.95, 'Walking_A', { speed: .272 / STRIDE.girl }],
    [8.9, 'Idle', { fade: .2 }], [10.3, 'Walking_Backwards', { speed: .3 / STRIDE.girl }], [10.85, 'Idle', { fade: .25 }],
    [14.55, 'Walking_A', { speed: .178 / STRIDE.girl }], [15.4, 'Idle', { fade: .2 }], [15.85, 'Cheer', { once: true, speed: 1.3, fade: .2 }], [17.1, 'Idle', { fade: .35 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };

  /* where each of them is: [from g, x, z, facing, ease into it (smooth by default; linear while walking, so feet keep pace)] */
  const BOY_WAY = [
    [0, -.6, -.05, R], [.05, -.6, -.05, R], [1.45, -.29, -.05, R, 'linear'], [1.62, -.29, -.05, 1.75], [2.85, -.29, -.05, 1.75],
    [3.2, -.245, -.05, 1.7, 'linear'], [5.4, -.245, -.05, 1.7], [5.6, -.245, -.05, .75], [6.4, -.245, -.05, .75], [6.6, -.245, -.05, 1.7],
    [9.0, -.245, -.05, 1.7], [9.15, -.245, -.05, .45], [9.85, -.19, .065, .45, 'linear'], [10.1, -.19, .065, .35], [14.4, -.19, .065, .35],
    [14.55, -.19, .065, 2], [15.4, -.053, 0, 2, 'linear'], [15.7, -.053, 0, .15], [19, -.053, 0, .15]
  ];
  const GIRL_WAY = [
    [0, .6, .06, -R], [.3, .6, .06, -R], [1.6, .33, .06, -R, 'linear'], [1.9, .33, .06, -1], [5.4, .33, .06, -1], [5.55, .33, .06, -.6],
    [7.85, .33, .06, -.6], [7.95, .33, .06, -1.89], [8.9, .085, -.022, -1.89, 'linear'], [9.05, .085, -.022, -R], [10.25, .05, -.022, -R, 'linear'],
    [10.3, .05, -.022, -R], [10.85, .19, .065, -R, 'linear'], [11.1, .19, .065, -.35], [14.4, .19, .065, -.35], [14.55, .19, .065, -2],
    [15.4, .053, 0, -2, 'linear'], [15.7, .053, 0, -.15], [19, .053, 0, -.15]
  ];
  const wayAt = (way, g) => [1, 2, 3].map(i => tween(g, way.map(k => [k[0], k[i], k[4] || 'smooth'])));
  /** how high someone standing at x, z is: on the slab once it has risen (its front is the porch at the door), else the card */
  const ground = (x, z, g) => (g < 3.47 ? 0 : SLAB * Math.min(clamp((EAVE.x - Math.abs(x)) / .01), clamp((SLAB_FRONT - z) / .01), clamp((z - SLAB_FRONT + .305) / .01)));

  const DAY = { hemi: new THREE.Color('#fff6f0'), ground: new THREE.Color('#c9a9c4'), sun: new THREE.Color('#ffffff') };
  const GOLD = { hemi: new THREE.Color('#fff0dc'), ground: new THREE.Color('#c9a59a'), sun: new THREE.Color('#ffe2b8') };
  const EVE = { hemi: new THREE.Color('#d4b8ff'), ground: new THREE.Color('#4f3a5e'), sun: new THREE.Color('#ffb48a') };
  const PAL = { brick: ['#f2a98f', '#ea9a80', '#f6b8a0', '#e48e76', '#f9c3ab', '#ef9f86'], mortar: '#fbefe2', roof: ['#e35d4f', '#d95045', '#ea6f5c', '#cf4a40', '#f07a62'],
    trim: '#fffaf2', door: '#4fbfa8', wood: '#c98b55', hat: '#ffc229', mail: '#49a6e9', blue: '#2f6fbe', cream: '#f7ecd8' };

  let boy, girl, hat, hammer, roll, roller, sheet, slab, bricksMesh, mortarMesh, tilesMesh, decks, gables, ridge, chimney;
  let door, windows, roundWin, mailbox, carry, barrowBricks, tray, interior, lamp, glows, backdrops, bushes;
  let titleSign, photo, banner, sparks, chips, dust, hearts, smoke, drops;
  const bricks = [], mortar = [], tiles = [];
  let lastG = -1;                                                    // the walls and roof are placed again only when g moves
  const v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), m4 = new THREE.Matrix4();
  const LET_GO = { p: new THREE.Vector3(), q: new THREE.Quaternion() }, LAID = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0, 'YXZ'));   // the roll as it leaves his hand; lying along z
  const UP = new THREE.Vector3(0, 1, 0), HIDE = new THREE.Matrix4().makeScale(0, 0, 0), WARM = new THREE.Color('#ffd08a'), DARK = new THREE.Color('#3d2a2a');

  /* ── little helpers ── */
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .8, ...o }));
  const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(kit.keep(geo), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
  const canvas = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); return cv; };
  function texture(cv, repeat) {
    const t = kit.keep(new THREE.CanvasTexture(cv)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  /** a point of a model (a hand, a hammer's head) in the stage's own space */
  const onStage = (o, out) => stage.worldToLocal(o.getWorldPosition(out));
  /** a heart w wide lying in x/y, its tip at -y */
  function heartShape(w) {
    const s = new THREE.Shape(), k = w / 2;
    s.moveTo(0, -.92 * k); s.bezierCurveTo(-.2 * k, -.7 * k, -k, -.35 * k, -k, .16 * k); s.bezierCurveTo(-k, .7 * k, -.42 * k, .9 * k, 0, .48 * k);
    s.bezierCurveTo(.42 * k, .9 * k, k, .7 * k, k, .16 * k); s.bezierCurveTo(k, -.35 * k, .2 * k, -.7 * k, 0, -.92 * k);
    return s;
  }

  /* the words on the blueprint: as big as they fit in the box (the act's own way, for a canvas of ours) */
  function wrapWords(c, text, maxW) {
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
  function fitWords(c, text, box, maxLines, max) {
    let size = max, lines = null;
    for (; size > 18; size -= 4) {
      c.font = `700 ${size}px ${HAND}`; lines = wrapWords(c, text, box.w);
      if (lines && lines.length <= maxLines && lines.length * size * 1.18 <= box.h) break;
      lines = null;
    }
    if (!lines) { c.font = `700 18px ${HAND}`; lines = [text.slice(0, 60)]; }
    else if (lines.length > 1) {                                     // even the lines out
      let w = box.w;
      for (let tw = box.w - 8; tw > box.w * .4; tw -= 8) { const l = wrapWords(c, text, tw); if (!l || l.length !== lines.length) break; w = tw; }
      lines = wrapWords(c, text, w);
    }
    const lh = size * 1.18, top = box.y + (box.h - lh * lines.length) / 2 + lh / 2;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((l, i) => c.fillText(l, box.x + box.w / 2, top + i * lh));
  }

  /* ── paintings: the plan on the ground, the blueprint sign, the sky, boards, a raw door ── */
  function blueprintPaper(c, w, h) {                                 // blue paper with a fine grid and a bolder one
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#3479cc'); g.addColorStop(1, '#1f529e'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (const [step, alpha] of [[w / 32, .1], [w / 8, .16]]) {
      c.strokeStyle = `rgba(255,255,255,${alpha})`; c.lineWidth = 1; c.beginPath();
      for (let x = step; x < w; x += step) { c.moveTo(x + .5, 0); c.lineTo(x + .5, h); }
      for (let y = step; y < h; y += step) { c.moveTo(0, y + .5); c.lineTo(w, y + .5); }
      c.stroke();
    }
  }
  const ln = (c, ...p) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); };   // a line through x, y pairs
  function plan(c, w, h) {                                           // the floor plan, seen from above: its top is the back of the house
    blueprintPaper(c, w, h);
    const X = x => w / 2 + x / WX * (w / 2 - 44), Z = z => h / 2 + (z - (WB + WF) / 2) / ((WF - WB) / 2) * (h / 2 - 40), dw = X(DOOR) - X(-DOOR);   // drawn inside the margin
    c.strokeStyle = '#ffffff'; c.lineCap = 'square'; c.lineWidth = 9;
    ln(c, X(-WX), Z(WF), X(-WX), Z(WB), X(WX), Z(WB), X(WX), Z(WF));
    for (const [a, b] of [[-WX, -WIN[1]], [-WIN[0], -DOOR], [DOOR, WIN[0]], [WIN[1], WX]]) ln(c, X(a), Z(WF), X(b), Z(WF));
    c.lineWidth = 2.5;                                               // the windows: two thin lines; the door's swing
    for (const s of [-1, 1]) for (const d of [-4, 4]) ln(c, X(s * WIN[0]), Z(WF) + d, X(s * WIN[1]), Z(WF) + d);
    c.setLineDash([7, 6]); c.beginPath(); c.arc(X(-DOOR), Z(WF), dw, -Math.PI / 2, 0); c.stroke(); c.setLineDash([]); ln(c, X(-DOOR), Z(WF), X(-DOOR), Z(WF) - dw);
    c.lineWidth = 3; c.strokeRect(X(-.15), Z(-.25), X(-.07) - X(-.15), Z(-.17) - Z(-.25)); c.strokeRect(X(.06), Z(-.24), X(.16) - X(.06), Z(-.2) - Z(-.24));   // a bed, a sofa
    c.fillStyle = '#ff9db8'; kit.heartPath(c, X(0), Z(-.16), 42); c.fill(); c.stroke();
    c.lineWidth = 2; c.font = '600 15px sans-serif'; c.fillStyle = '#ffffff'; c.textAlign = 'center';   // the measures
    ln(c, X(-WX), h - 14, X(WX), h - 14); ln(c, X(-WX), h - 22, X(-WX), h - 6); ln(c, X(WX), h - 22, X(WX), h - 6); ln(c, 18, Z(WB), 18, Z(WF));
    c.fillText('3800', w / 2, h - 20); c.save(); c.translate(30, h / 2); c.rotate(-Math.PI / 2); c.fillText('2100', 0, 0); c.restore();
  }
  function titleSheet(c, w, h, text) {                               // the blueprint with the card's first words in its title block
    c.save(); c.beginPath(); c.roundRect ? c.roundRect(6, 6, w - 12, h - 12, 18) : c.rect(6, 6, w - 12, h - 12); c.clip(); blueprintPaper(c, w, h); c.restore();
    c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.strokeRect(26, 26, w - 52, h - 52); c.lineWidth = 2; c.strokeRect(38, 38, w - 76, h - 76);
    const ox = 64, base = h - 112, wW = 200, wH = 150, apex = 92, top = base - wH, mid = ox + wW / 2;   // the house, front on, with its measures
    c.lineWidth = 4; c.lineJoin = 'round'; c.strokeRect(ox, top, wW, wH); ln(c, ox - 16, top + 4, mid, top - apex, ox + wW + 16, top + 4);
    c.strokeRect(ox + wW * .7, top - apex * .82, 20, 42); c.beginPath(); c.arc(mid, top - 34, 19, 0, 7); c.stroke();   // the chimney, the round window
    c.fillStyle = '#ff9db8'; kit.heartPath(c, mid, top - 33, 19); c.fill(); c.strokeRect(mid - 21, base - 94, 42, 94);
    for (const x of [ox + 18, ox + wW - 58]) { c.strokeRect(x, base - 116, 40, 56); ln(c, x + 20, base - 116, x + 20, base - 60); ln(c, x, base - 88, x + 40, base - 88); }
    ln(c, ox - 30, base, ox + wW + 30, base);
    c.lineWidth = 2; c.font = '600 22px sans-serif'; c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    ln(c, ox, base + 30, ox + wW, base + 30); ln(c, ox, base + 20, ox, base + 40); ln(c, ox + wW, base + 20, ox + wW, base + 40); ln(c, ox + wW + 40, base, ox + wW + 40, top - apex);
    c.fillText('3 800', mid, base + 52); c.save(); c.translate(ox + wW + 58, base - (wH + apex) / 2); c.rotate(-Math.PI / 2); c.fillText('4 200', 0, 0); c.restore();
    const bx = 352, bw = w - bx - 60;                               // the title block: the words, a row of little boxes and a stamp
    c.lineWidth = 3; c.strokeRect(bx, 64, bw, h - 128); ln(c, bx, h - 152, bx + bw, h - 152); ln(c, bx + bw * .36, h - 152, bx + bw * .36, h - 64);
    c.font = '700 19px sans-serif'; c.fillText('BẢN VẼ SỐ 01', bx + bw * .18, h - 122); c.fillText('TỈ LỆ 1 : 1', bx + bw * .18, h - 92);
    c.save(); c.translate(bx + bw * .68, h - 108); c.rotate(-.08); c.strokeStyle = c.fillStyle = '#ffb3c7'; c.lineWidth = 4; c.strokeRect(-120, -26, 240, 52);
    c.font = '800 25px sans-serif'; c.fillText('ĐÃ DUYỆT', -18, 1); kit.heartPath(c, 88, 2, 30); c.fill(); c.restore();
    c.fillStyle = '#ffffff'; fitWords(c, text, { x: bx + 22, y: 76, w: bw - 44, h: h - 240 }, 3, 108);
  }
  function sky(c, w, h, dusk) {                                      // a morning sky, or dusk: clouds, the sun, hills and a far village
    const r = seeded(dusk ? 5 : 3), g = c.createLinearGradient(0, 0, 0, h);
    (dusk ? [[0, '#2c2a68'], [.42, '#7d5aa6'], [.72, '#ef8f9f'], [1, '#ffc98e']] : [[0, '#6fbdf0'], [.62, '#bfe6ff'], [1, '#f2fbff']]).forEach(([k, col]) => g.addColorStop(k, col));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (dusk) for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,248,220,${.4 + r() * .6})`; c.beginPath(); c.arc(r() * w, r() * h * .45, .8 + r() * 1.8, 0, 7); c.fill(); }
    const sx = dusk ? w * .78 : w * .16, sy = dusk ? h * .66 : h * .2, sr = dusk ? 70 : 54, halo = c.createRadialGradient(sx, sy, sr * .6, sx, sy, sr * 2.6);   // the sun
    halo.addColorStop(0, dusk ? 'rgba(255,190,120,.7)' : 'rgba(255,245,190,.8)'); halo.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = halo; c.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6); c.fillStyle = dusk ? '#ffb070' : '#ffe27a'; c.beginPath(); c.arc(sx, sy, sr, 0, 7); c.fill();
    c.strokeStyle = '#ffd95a'; c.lineWidth = 7; c.lineCap = 'round';  // rays by day; two birds
    if (!dusk) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ln(c, sx + Math.cos(a) * (sr + 14), sy + Math.sin(a) * (sr + 14), sx + Math.cos(a) * (sr + 34), sy + Math.sin(a) * (sr + 34)); }
    c.strokeStyle = '#3b5f86'; c.lineWidth = 3;
    if (!dusk) for (const [x, y] of [[.3, .3], [.34, .26]]) ln(c, x * w - 10, y * h, x * w - 5, y * h - 5, x * w, y * h, x * w + 5, y * h - 5, x * w + 10, y * h);
    c.fillStyle = dusk ? 'rgba(255,196,214,.85)' : 'rgba(255,255,255,.95)';   // clouds: overlapping puffs on a flat base
    for (const [x, y, s] of [[.38, .16, 42], [.62, .09, 30], [.86, .22, 38], [.1, .42, 28], [.52, .34, 24]]) {
      for (const [dx, dy, rr] of [[-.9, .1, .5], [-.35, -.25, .7], [.3, -.15, .62], [.85, .12, .45], [0, .2, .55]]) { c.beginPath(); c.arc(x * w + dx * s, y * h + dy * s, rr * s, 0, 7); c.fill(); }
      c.fillRect(x * w - .9 * s, y * h + .1 * s, 1.8 * s, .44 * s);
    }
    const hill = (y0, amp, col, f) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w; x += 16) c.lineTo(x, y0 - amp * Math.sin(x / w * Math.PI * f + y0) - amp * .4 * Math.sin(x / w * 13 + f));
      c.lineTo(w, h); c.fill();
    };
    hill(h * .74, 26, dusk ? '#6b5a8f' : '#9fd39a', 2.2);
    for (let i = 0; i < 9; i++) {                                    // a far village on the hill: little houses, warm windows at dusk
      const x = w * (.08 + i * .105 + r() * .03), y = h * .76 + r() * 8, s = 10 + r() * 6;
      c.fillStyle = dusk ? '#4d3f6e' : ['#fff4e6', '#ffe0d2', '#fdf0c8'][i % 3]; c.fillRect(x - s, y - s, s * 2, s * 1.6);
      c.fillStyle = dusk ? '#3a2f57' : ['#e86a5a', '#d9534a', '#5f8fcf'][i % 3]; c.beginPath(); c.moveTo(x - s * 1.25, y - s); c.lineTo(x, y - s * 2); c.lineTo(x + s * 1.25, y - s); c.fill();
      if (dusk) { c.fillStyle = '#ffd27a'; c.fillRect(x - 3, y - s * .5, 6, 6); }
    }
    hill(h * .84, 22, dusk ? '#4e4472' : '#7cc47c', 3.1);
    for (let i = 0; i < 14; i++) {                                   // round trees
      const x = w * (i / 13) + (r() - .5) * 30, y = h * .86 + r() * 10, s = 12 + r() * 10;
      c.fillStyle = dusk ? '#3d355d' : ['#5cae63', '#4f9f5a', '#6fbf6b'][i % 3]; c.beginPath(); c.arc(x, y - s, s, 0, 7); c.fill();
    }
    c.fillStyle = dusk ? '#3a3157' : '#63b16a'; c.fillRect(0, h * .9, w, h * .1);
  }
  function boards(c, w, h) {                                         // cream weatherboards: one board a tile
    c.fillStyle = PAL.cream; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(160,120,80,.12)'; for (let i = 0; i < 5; i++) c.fillRect(0, 8 + i * 11, w, 1.5);
    c.fillStyle = '#d6bf9c'; c.fillRect(0, h - 5, w, 5); c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, 3);
  }
  function rawWood(c, w, h) {                                        // the door before it is painted: plain planks
    const r = seeded(9); c.fillStyle = '#ddb07c'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(140,90,45,.25)'; c.lineWidth = 1.5;
    for (let x = 0; x < w; x += w / 4) {
      c.fillStyle = 'rgba(120,70,30,.5)'; c.fillRect(x, 0, 2, h);
      for (let i = 0; i < 3; i++) { const gx = x + 6 + r() * (w / 4 - 12); c.beginPath(); c.moveTo(gx, 0); c.bezierCurveTo(gx + 4, h * .3, gx - 4, h * .6, gx + 2, h); c.stroke(); }
    }
  }

  /* ── the walls: every brick of every course, in one instanced mesh, each snapping in on its own ── */
  function layWalls() {
    const side = (WF - WT) - (WB + WT);
    const walls = [                                                  // start, way along, length, how far round from the front-left corner
      { p: [-WX, WF - WT / 2], d: [1, 0], len: 2 * WX, round: 0, turn: 0, front: true },
      { p: [WX - WT / 2, WF - WT], d: [0, -1], len: side, round: 2 * WX, turn: R },
      { p: [WX, WB + WT / 2], d: [-1, 0], len: 2 * WX, round: 2 * WX + side, turn: 0 },
      { p: [-WX + WT / 2, WB + WT], d: [0, 1], len: side, round: 4 * WX + side, turn: R }
    ];
    const cut = (runs, a, b) => runs.flatMap(([p, q]) => (b <= p || a >= q ? [[p, q]] : [[p, a], [b, q]].filter(([u, v]) => v - u > .004)));
    for (let k = 0; k < ROWS; k++) for (const wl of walls) {
      let runs = [[0, wl.len]];
      if (wl.front && k < 6) runs = cut(runs, WX - DOOR, WX + DOOR);
      if (wl.front && k >= WIN_ROWS[0] && k < WIN_ROWS[1]) runs = cut(cut(runs, WX - WIN[1], WX - WIN[0]), WX + WIN[0], WX + WIN[1]);
      const y = SLAB + C * (k + .5), off = (k % 2) * BL / 2;
      const at = u => [wl.p[0] + wl.d[0] * u, wl.p[1] + wl.d[1] * u];
      for (const [a, b] of runs) {
        const [mx, mz] = at((a + b) / 2);
        mortar.push({ x: mx, y, z: mz, len: b - a, turn: wl.turn, at: COURSE_AT[k] + (wl.round + a) * WAVE });
        const cuts = [a];                                            // a running bond: every other course half a brick along
        for (let u = off - BL; u < b; u += BL) if (u > a + .014 && u < b - .014) cuts.push(u);
        cuts.push(b);
        for (let i = 0; i < cuts.length - 1; i++) {
          const u = (cuts[i] + cuts[i + 1]) / 2, [x, z] = at(u);
          bricks.push({ x, y, z, len: cuts[i + 1] - cuts[i], turn: wl.turn, k, at: COURSE_AT[k] + (wl.round + u) * WAVE });
        }
      }
    }
  }
  /** each brick at story time g: hidden, falling into place stretched, or squashing as it lands */
  function placeBricks(g) {
    bricks.forEach((b, i) => {
      const t = seg(g, b.at, b.at + .24);
      if (t <= 0) { bricksMesh.setMatrixAt(i, HIDE); return; }
      const fall = Math.min(1, t / .4), land = Math.max(0, (t - .4) / .6);
      const sq = t < .4 ? -.12 : .3 * Math.exp(-5 * land) * Math.cos(10 * land), sy = 1 - sq;
      v3.set(b.x, b.y + .06 * (1 - fall * fall) - (C - .004) * (1 - sy) / 2, b.z); q4.setFromAxisAngle(UP, b.turn);
      bricksMesh.setMatrixAt(i, m4.compose(v3, q4, s3.set((b.len - .004) * (1 + sq * .5), (C - .004) * sy, WT * (1 + sq * .4))));
    });
    mortar.forEach((m, i) => {
      const t = ease.out(seg(g, m.at, m.at + .15));
      if (t <= 0) { mortarMesh.setMatrixAt(i, HIDE); return; }
      v3.set(m.x, m.y, m.z); q4.setFromAxisAngle(UP, m.turn);
      mortarMesh.setMatrixAt(i, m4.compose(v3, q4, s3.set(m.len, C * t, WT - .006)));
    });
    bricksMesh.instanceMatrix.needsUpdate = mortarMesh.instanceMatrix.needsUpdate = true;
  }

  /* ── the roof: two decks, then tiles in rows from the eaves up, front to back ── */
  const slopeBasis = s => {                                          // up the slope, out of it, along it (right-handed)
    const u = new THREE.Vector3(-s * Math.cos(PITCH), Math.sin(PITCH), 0), n = new THREE.Vector3(s * Math.sin(PITCH), Math.cos(PITCH), 0);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, n, new THREE.Vector3(0, 0, -s)));
  };
  const LSLOPE = Math.hypot(EAVE.x, RIDGE - EAVE.y), DEPTH = EAVE.front - EAVE.back;
  function layRoof() {
    const rows = 6, cols = 5, step = (LSLOPE - .012) / rows, tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -.1);
    for (const s of [-1, 1]) {
      const q = slopeBasis(s).multiply(tilt), n = new THREE.Vector3(s * Math.sin(PITCH), Math.cos(PITCH), 0);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const u = (r + .55) * step;
        tiles.push({ x: s * EAVE.x - s * Math.cos(PITCH) * u + n.x * .012, y: EAVE.y + Math.sin(PITCH) * u + n.y * .012,
          z: EAVE.back + (c + .5) * DEPTH / cols, q, n, at: ROOF_AT + .42 + r * .15 + (cols - 1 - c) * .035, w: DEPTH / cols - .005, l: step + .012 });
      }
    }
  }
  function placeTiles(g) {
    tiles.forEach((t, i) => {
      const k = seg(g, t.at, t.at + .22);
      if (k <= 0) { tilesMesh.setMatrixAt(i, HIDE); return; }
      const drop = .05 * (1 - ease.out(Math.min(1, k / .5))), sq = k < .5 ? 0 : .25 * Math.exp(-6 * (k - .5)) * Math.cos(14 * (k - .5));
      v3.set(t.x + t.n.x * drop, t.y + t.n.y * drop + .02 * (1 - ease.out(Math.min(1, k / .5))), t.z);
      tilesMesh.setMatrixAt(i, m4.compose(v3, t.q, s3.set(t.l * (1 + sq * .4), .008 * (1 - sq), t.w * (1 + sq * .4))));
    });
    tilesMesh.instanceMatrix.needsUpdate = true;
  }

  /* ── the props built here ── */
  const turn = (o, x = 0, y = 0, z = 0) => { o.rotation.set(x, y, z); return o; };
  function makeHat() {                                               // a yellow hard hat, a pink heart sticker on its front
    const g = new THREE.Group(), yellow = mat(PAL.hat, { roughness: .35, envMap: kit.env, envMapIntensity: .6 });
    g.add(mesh(new THREE.SphereGeometry(.064, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), yellow), mesh(new THREE.CylinderGeometry(.07, .072, .006, 28), yellow, 0, 0, .008),
      turn(mesh(new THREE.TorusGeometry(.064, .0075, 6, 22, Math.PI), yellow), 0, R), turn(mesh(new THREE.ShapeGeometry(heartShape(.026), 8), mat('#ff6f9a', { roughness: .5 }), 0, .03, .066), -.62));
    g.children[0].scale.set(1, .8, 1.08); g.children[1].scale.set(1, 1, 1.12); g.children[2].scale.set(1.08, .8, 1);   // the dome, the brim, the ridge
    return g;
  }
  function makeHammer() {                                            // its grip at the origin, the handle up its +y, the head at the top
    const g = new THREE.Group(), steel = mat('#8f9aa6', { metalness: .7, roughness: .3, envMap: kit.env });
    const face = turn(mesh(new THREE.CylinderGeometry(.0102, .0102, .01, 12), steel, -.021, .068, 0), 0, 0, R);
    g.add(mesh(new THREE.CylinderGeometry(.0052, .006, .078, 8), mat(PAL.wood, { roughness: .6 }), 0, .027, 0), mesh(new THREE.BoxGeometry(.046, .017, .017), steel, .005, .068, 0), face);
    return Object.assign(g, { head: face });
  }
  function makeRoll() {                                              // the rolled blueprint: white paper outside, blue at its ends, its axis along y
    const g = new THREE.Group(), tube = mesh(new THREE.CylinderGeometry(1, 1, SHEET.z1 - SHEET.z0, 16), mat('#eef4ff', { roughness: .8 })), ends = mat(PAL.blue, { roughness: .8 });
    for (const s of [-1, 1]) tube.add(turn(mesh(new THREE.CircleGeometry(1, 16), ends, 0, s * (SHEET.z1 - SHEET.z0) / 2 + s * .0005, 0), -s * R));
    g.add(tube); g.userData.tube = tube;
    return g;
  }
  function makeRoller() {                                            // a paint roller: the grip at the origin, the roller up its +y
    const g = new THREE.Group(), wire = mat('#b8c0c8', { metalness: .6, roughness: .35, envMap: kit.env });
    const pad = turn(mesh(new THREE.CylinderGeometry(.0105, .0105, .036, 14), mat(PAL.door, { roughness: 1 }), .02, .049, 0), 0, 0, R);
    g.add(mesh(new THREE.CylinderGeometry(.0045, .005, .03, 8), mat('#e85d7a', { roughness: .5 }), 0, .005, 0), mesh(new THREE.CylinderGeometry(.0016, .0016, .03, 6), wire, 0, .034, 0),
      turn(mesh(new THREE.CylinderGeometry(.0016, .0016, .02, 6), wire, .009, .049, 0), 0, 0, R), pad);
    g.userData.pad = pad;
    return g;
  }
  function makeTray() {                                              // a paint tray the roller lies in, up on a plank across two piers of bricks; a tin of paint beside
    const g = new THREE.Group(), tin = mat('#dfe5ea', { metalness: .5, roughness: .35, envMap: kit.env }), paint = mat(PAL.door, { roughness: .4 }), b = BENCH;
    g.add(mesh(new THREE.BoxGeometry(.05, .01, .068), tin, 0, b + .005, 0), turn(mesh(new THREE.PlaneGeometry(.042, .03), paint, 0, b + .0105, .014), -R));
    g.add(mesh(new THREE.CylinderGeometry(.018, .018, .034, 18), tin, .06, .017, -.035), mesh(new THREE.CylinderGeometry(.0185, .0185, .014, 18), paint, .06, .016, -.035),
      mesh(new THREE.CylinderGeometry(.0175, .0175, .002, 18), paint, .06, .0345, -.035));
    g.add(mesh(new THREE.BoxGeometry(.07, .006, .08), mat(PAL.wood, { roughness: .7 }), 0, b - .003, 0));
    for (const x of [-.022, .022]) for (let j = 0; j < 3; j++) g.add(turn(mesh(new THREE.BoxGeometry(.046, .017, .024), mat(PAL.brick[(j + (x > 0 ? 3 : 0)) % 6], { roughness: .9 }), x, .0085 + j * .017, 0), 0, R));
    return g;
  }
  function makeBarrow() {                                            // a wheelbarrow, its wheel towards +z
    const g = new THREE.Group(), paint = mat('#ef6b3c', { roughness: .45, side: THREE.DoubleSide }), wood = mat(PAL.wood, { roughness: .6 });
    const tub = turn(mesh(new THREE.CylinderGeometry(.062, .042, .036, 4, 1, true), paint, 0, .058, .005), 0, Math.PI / 4); tub.scale.set(1, 1, .78);
    g.add(tub, mesh(new THREE.BoxGeometry(.058, .004, .045), paint, 0, .041, .005), turn(mesh(new THREE.TorusGeometry(.019, .0075, 8, 18), mat('#34302f', { roughness: .9 }), 0, .027, .066), 0, R),
      turn(mesh(new THREE.CylinderGeometry(.006, .006, .02, 8), mat('#c5ccd3', { metalness: .5 }), 0, .027, .066), 0, 0, R));
    for (const s of [-1, 1]) g.add(turn(mesh(new THREE.BoxGeometry(.006, .006, .13), wood, s * .028, .046, -.03), -.18), mesh(new THREE.BoxGeometry(.005, .03, .005), wood, s * .024, .017, -.03),
      turn(mesh(new THREE.CylinderGeometry(.0055, .0055, .018, 8), mat('#3a3330'), s * .028, .058, -.095), R - .18));   // handles, legs, grips
    return g;
  }
  const makeBrick = (len, hgt, dep, i) => mesh(new THREE.BoxGeometry(len, hgt, dep), mat(PAL.brick[i % PAL.brick.length], { roughness: .9 }));
  function makeDoor() {                                              // a white frame, the door on its hinge (left), its paint, a heart window
    const g = new THREE.Group(), trim = mat(PAL.trim, { roughness: .5 }), post = kit.keep(new THREE.BoxGeometry(.012, .262, .014));
    g.add(mesh(post, trim, -DOOR - .006, SLAB + .131, WF + .003), mesh(post, trim, DOOR + .006, SLAB + .131, WF + .003), mesh(new THREE.BoxGeometry(.13, .016, .016), trim, 0, SLAB + .26, WF + .004),
      mesh(new THREE.BoxGeometry(.13, .008, .03), mat('#cfc5b6', { roughness: .9 }), 0, SLAB + .004, WF + .01));   // the threshold
    const hinge = new THREE.Group(); hinge.position.set(-.049, SLAB + .002, WF - .01); g.add(hinge);
    const paint = mesh(new THREE.BoxGeometry(.098, .249, .0016).translate(-.049, 0, 0), mat(PAL.door, { roughness: .45 }), .098, .1245, .0054); paint.castShadow = false;
    const pane = mesh(new THREE.ShapeGeometry(heartShape(.04), 10), kit.keep(new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffbf5e', emissiveIntensity: 0, roughness: .3 })), .049, .19, .0066);
    const knob = mesh(new THREE.SphereGeometry(.0055, 10, 8), mat('#e8b84a', { metalness: .8, roughness: .3, envMap: kit.env }), .086, .115, .009);
    hinge.add(mesh(new THREE.BoxGeometry(.098, .249, .009), mat('#ffffff', { map: texture(canvas(128, 256, rawWood)), roughness: .8 }), .049, .1245, 0), paint, pane, knob);
    return Object.assign(g, { hinge, paint, pane, knob });
  }
  let FLOWER;                                                         // the window boxes' flowers share their shapes and paints
  function flowerParts() {
    const p = new THREE.Shape(), n = 5, R0 = .0032, R1 = .0115;     // five round petals
    for (let i = 0; i <= n * 8; i++) { const a = i / (n * 8) * Math.PI * 2, k = R0 + (R1 - R0) * Math.abs(Math.sin(a * n / 2)); i ? p.lineTo(Math.cos(a) * k, Math.sin(a) * k) : p.moveTo(Math.cos(a) * k, Math.sin(a) * k); }
    return { stem: kit.keep(new THREE.CylinderGeometry(.0018, .0018, .026, 5)), leaf: kit.keep(new THREE.SphereGeometry(.008, 8, 6)),
      bloom: kit.keep(new THREE.ExtrudeGeometry(p, { depth: .002, bevelEnabled: true, bevelThickness: .001, bevelSize: .001, bevelSegments: 1 })),
      eye: kit.keep(new THREE.SphereGeometry(.0042, 8, 6)), green: mat('#4f9a52'), middle: mat('#ffb000', { roughness: .5 }),
      petals: ['#ff6f9a', '#ffd23f', '#ffffff', '#ff8a5c'].map(c => mat(c, { roughness: .6 })) };
  }
  function makeWindow(s) {                                           // the glass, its white frame, a sill and a window box with flowers
    const x = s * (WIN[0] + WIN[1]) / 2, w = WIN[1] - WIN[0], y = SLAB + C * (WIN_ROWS[0] + WIN_ROWS[1]) / 2, h = C * (WIN_ROWS[1] - WIN_ROWS[0]);
    const glass = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(w, h)), kit.keep(new THREE.MeshStandardMaterial({ color: '#cfe9ff', emissive: '#ffc766',
      emissiveIntensity: 0, roughness: .15, metalness: .1, envMap: kit.env })));
    glass.position.set(x, y, WF - WT / 2);
    const frame = new THREE.Group(), trim = mat(PAL.trim, { roughness: .5 }); frame.position.set(x, y, WF + .002);
    for (const [fx, fy, fw, fh, fd] of [[0, h / 2, w + .014, .009, .012], [0, -h / 2, w + .014, .009, .012], [-w / 2, 0, .009, h, .012], [w / 2, 0, .009, h, .012],
      [0, 0, .005, h, .008], [0, .012, w, .005, .008]]) frame.add(mesh(new THREE.BoxGeometry(fw, fh, fd), trim, fx, fy, fd === .008 ? -.006 : 0));
    const sill = mesh(new THREE.BoxGeometry(w + .02, .008, .024), trim, x, SLAB + C * WIN_ROWS[0] - .003, WF + .008);
    const box = new THREE.Group(); box.position.set(x, SLAB + C * WIN_ROWS[0] - .024, WF + .02);
    box.add(mesh(new THREE.BoxGeometry(w + .014, .026, .026), mat('#3d9479', { roughness: .7 })), mesh(new THREE.BoxGeometry(w + .006, .004, .02), mat('#6b4a33'), 0, .012, 0));
    const flowers = [-.026, -.009, .009, .026].map((fx, i) => {      // each pops out of the soil on its own
      const f = new THREE.Group(); f.position.set(fx, .013, (i % 2 ? .003 : -.003)); box.add(f);
      const stem = new THREE.Mesh(FLOWER.stem, FLOWER.green); stem.position.y = .013;
      const leaf = new THREE.Mesh(FLOWER.leaf, FLOWER.green); leaf.position.set((i % 2 ? -1 : 1) * .006, .011, 0); leaf.scale.set(1.4, .4, .8);
      const bloom = new THREE.Mesh(FLOWER.bloom, FLOWER.petals[(i + (s > 0 ? 1 : 0)) % 4]); bloom.position.y = .029; bloom.rotation.set(-.35, 0, i);
      const eye = new THREE.Mesh(FLOWER.eye, FLOWER.middle); eye.position.set(0, .029, .004);
      [stem, leaf, bloom, eye].forEach(m => { m.castShadow = true; f.add(m); });
      return f;
    });
    const glow = kit.glow({ color: 0xffc370, size: .16, opacity: 0 }); glow.position.set(x, y, WF + .01);
    return { glass, frame, sill, box, flowers, glow, x };
  }
  function makeRoundWindow() {                                       // the attic's porthole: a white ring, the glass on a hinge at its left
    const g = new THREE.Group(), trim = mat(PAL.trim, { roughness: .5 }), hinge = new THREE.Group(); g.position.set(0, ROUND.y, WF); hinge.position.set(-ROUND.r + .004, 0, .006);
    const glass = mesh(new THREE.CircleGeometry(ROUND.r - .004, 28), kit.keep(new THREE.MeshStandardMaterial({ color: '#cfe9ff', emissive: '#ffa94d',
      emissiveIntensity: 0, roughness: .15, envMap: kit.env, side: THREE.DoubleSide })), ROUND.r - .004, 0, 0);
    hinge.add(glass, mesh(new THREE.TorusGeometry(ROUND.r - .005, .003, 6, 28), trim, ROUND.r - .004, 0, .001));
    const glow = kit.glow({ color: 0xffb860, size: .15, opacity: 0 }); glow.position.z = .004;
    g.add(mesh(new THREE.TorusGeometry(ROUND.r, .0065, 8, 32), trim, 0, 0, .003), hinge, glow);
    return Object.assign(g, { hinge, glass, glow });
  }
  function makeGable(front) {                                        // a cream gable that folds up from lying flat on the walls
    const s = new THREE.Shape(); s.moveTo(-WX, 0); s.lineTo(WX, 0); s.lineTo(0, RIDGE - TOP - .013); s.closePath();
    if (front) { const hole = new THREE.Path(); hole.absarc(0, ROUND.y - TOP, ROUND.r, 0, Math.PI * 2, true); s.holes.push(hole); }
    const g = new THREE.Group(); g.position.set(0, TOP, front ? WF - WT / 2 : WB + WT / 2);
    g.add(mesh(new THREE.ExtrudeGeometry(s, { depth: WT, bevelEnabled: false, curveSegments: 32 }), mat('#ffffff', { map: texture(canvas(64, 64, boards), [10, 1 / .024]), roughness: .8 }), 0, 0, -WT / 2));
    return g;
  }
  function makeChimney() {                                           // brick, four mortar lines, a dark cap
    const g = new THREE.Group(), h = .13, mortarM = mat(PAL.mortar), line = kit.keep(new THREE.BoxGeometry(.0446, .003, .0446));
    g.add(mesh(new THREE.BoxGeometry(.044, h, .044), mat(PAL.brick[3], { roughness: .9 }), 0, -h / 2, 0), mesh(new THREE.BoxGeometry(.056, .012, .056), mat('#8a5a4a', { roughness: .8 }), 0, .004, 0));
    for (let i = 1; i < 5; i++) g.add(mesh(line, mortarM, 0, -h + i * h / 5, 0));
    g.position.set(CHIMNEY[0], RIDGE + .025, CHIMNEY[1]);
    return g;
  }
  function makeMailbox() {                                           // a blue mailbox with a white heart, a red flag and a letter inside
    const g = new THREE.Group(), blue = mat(PAL.mail, { roughness: .45 }), red = mat('#e23b3b'), box = new THREE.Group(), flag = new THREE.Group(), letter = new THREE.Group();
    box.position.y = .118; flag.position.set(-.018, 0, .022); letter.position.set(.03, .004, 0);
    g.add(mesh(new THREE.BoxGeometry(.012, .1, .012), mat(PAL.wood, { roughness: .7 }), 0, .05, 0), box);
    box.add(mesh(new THREE.BoxGeometry(.066, .026, .04), blue), turn(mesh(new THREE.CylinderGeometry(.02, .02, .066, 18, 1, false, 0, Math.PI), blue, 0, .013, 0), 0, 0, R),   // a rounded top
      mesh(new THREE.ShapeGeometry(heartShape(.026), 10), mat('#ffffff', { roughness: .5 }), 0, .004, .0205), flag, letter);
    flag.add(mesh(new THREE.BoxGeometry(.003, .034, .003), red, 0, .017, 0), mesh(new THREE.BoxGeometry(.016, .011, .003), red, .008, .028, 0));
    letter.add(mesh(new THREE.BoxGeometry(.004, .02, .028), mat('#fffaf0', { roughness: .6 })), turn(mesh(new THREE.ShapeGeometry(heartShape(.012), 8), mat('#ff4f7b'), .0025, 0, 0), 0, R));
    return Object.assign(g, { box, flag, letter });
  }
  function makeTitleSign() {                                         // the blueprint with the first words: it unrolls downwards from a roll
    const w = .44, h = w * .625, g = new THREE.Group(), geo = kit.keep(new THREE.PlaneGeometry(w, h).translate(0, -h / 2, 0));
    const tex = kit.canvasTexture(1024, 640, (c, cw, ch) => titleSheet(c, cw, ch, words('note1', 'Từng viên gạch, mình cùng nhau xây')));
    const front = new THREE.Mesh(geo, kit.keep(new THREE.MeshStandardMaterial({ map: tex, roughness: .9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .32 })));
    const backM = new THREE.Mesh(geo, kit.keep(new THREE.MeshStandardMaterial({ color: '#2a63ad', roughness: .95, side: THREE.BackSide })));
    const r = turn(mesh(new THREE.CylinderGeometry(1, 1, w + .01, 16), mat('#2a63ad', { roughness: .7 })), 0, 0, R);
    front.castShadow = true; g.add(front, backM, r, turn(mesh(new THREE.CylinderGeometry(.007, .007, w + .02, 12), mat(PAL.wood, { roughness: .6 })), 0, 0, R));   // and the rod it hangs from
    return Object.assign(g, { sheet: front, back: backM, roll: r, h });
  }

  /** a prop into a hand or onto the stage, placed there (pos in card widths, turned by rot) */
  function put(obj, m, slot, pos, rot) {
    if (m) {
      const b = m.node(slot); if (obj.parent !== b) m.hold(obj, slot);
      const k = obj.userData.stageScale.x / obj.scale.x;             // one of the bone's own units, in card widths
      obj.position.set(pos[0] / k, pos[1] / k, pos[2] / k);
    }
    else { if (obj.parent !== stage) { stage.add(obj); if (obj.userData.stageScale) obj.scale.copy(obj.userData.stageScale); } obj.position.set(pos[0], pos[1], pos[2]); }
    obj.rotation.set(rot[0], rot[1], rot[2]);
  }
  /* arms by hand: [upper arm, forearm] directions in a character's own space, as aim takes them */
  const READY = [[-.3, -.6, .75], [-.12, .35, 1]], RAISED = [[-.3, .85, .3], [-.05, .65, -.75]];   // the hammer in front; up behind his head
  const mix = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  const toOwn = (d, th) => [d.x * Math.cos(th) - d.z * Math.sin(th), d.y, d.x * Math.sin(th) + d.z * Math.cos(th)];   // stage to the character's own space
  const vS = new THREE.Vector3(), vE = new THREE.Vector3(), vH = new THREE.Vector3(), vX = new THREE.Vector3(), vU = new THREE.Vector3(), vW = new THREE.Vector3(), vD = new THREE.Vector3();
  /** his hammering at story time g (the couple has no chop clip): between strikes the hammer is ready in front; each
      strike swings it up behind his head, then down so its head lands on the front-left corner, at the course that snaps
      on (a bend for the low ones). Call it once the hammer is in his hand */
  function hammering(g, br) {
    const on = seg(g, 3.15, 3.45) * (1 - seg(g, 8.7, 8.95));
    if (!on) return;
    let i = STRIKES.findIndex(s => g < s + .28); if (i < 0) i = STRIKES.length - 1;
    const s = STRIKES[i], up = ease.out(seg(g, s - .4, s - .16)), down = ease.in(seg(g, s - .16, s)), back = ease.inOut(seg(g, s + .08, s + .28));
    const lean = clamp((.2 - SLAB - C * STRUCK[i]) / .12) * .75 * Math.min(down, 1 - back);
    if (lean) { boy.bend('spine', lean * .5, 0, 0); boy.bend('chest', lean, 0, 0); }
    let hit = READY;
    if (down > 0 && back < 1) hit = reachWith(boy, 'r', hammer.head, vD.set(-WX + .004, SLAB + C * (STRUCK[i] + .5), WF + .004), br, true);
    const pose = [0, 1].map(j => mix(mix(mix(READY[j], RAISED[j], up), hit[j], down), READY[j], back));
    boy.aim('upperarm.r', pose[0], on); boy.aim('lowerarm.r', pose[1], on);
  }
  /** the arm that puts `tip` (a hand, or a point of what it holds) on T: the elbow where the two lengths meet (above
      the line), then the forearm turned until the tip is there. [upper arm, forearm] in the model's own space, for aim.
      The arm is put back as it was unless `keep` (a tool off the forearm's line lands only with the turn found here) */
  const qU = new THREE.Quaternion(), qL = new THREE.Quaternion();
  function reachWith(m, side, tip, T, th, keep) {
    const up = `upperarm.${side}`, low = `lowerarm.${side}`;
    qU.copy(m.node(up).quaternion); qL.copy(m.node(low).quaternion);
    onStage(m.node(up), vS); onStage(m.node(low), vE); onStage(tip, vH);
    const L1 = vS.distanceTo(vE), L2 = vE.distanceTo(vH), d = Math.min(vS.distanceTo(T), L1 + L2 - 1e-4);
    vU.subVectors(T, vS).normalize(); vW.set(0, 1, 0).addScaledVector(vU, -vU.y).normalize();
    const ca = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
    vE.copy(vS).addScaledVector(vU, L1 * ca).addScaledVector(vW, L1 * Math.sqrt(1 - ca * ca));
    const upper = toOwn(vX.subVectors(vE, vS), th); m.aim(up, upper);
    let lower = null; vX.copy(T);
    for (let n = 0; n < 3; n++) {
      onStage(m.node(low), vE); lower = toOwn(vU.subVectors(vX, vE), th); m.aim(low, lower);
      onStage(tip, vH); vX.add(vU.subVectors(T, vH));
    }
    if (!keep) { m.node(up).quaternion.copy(qU); m.node(low).quaternion.copy(qL); m.node(up).updateMatrixWorld(true); }
    return [upper, lower];
  }

  return {
    seconds: [6.4, 6.2, 6.4],

    build() {
      /* the two of them, the builder in a hard hat */
      boy = kit.model('boy').fit({ height: H }); girl = kit.model('girl').fit({ height: HER });
      stage.add(boy.root, girl.root);
      hat = makeHat(); hat.scale.setScalar(.25); stage.add(hat);       // on the crown of his head, level, then riding on it
      stage.updateMatrixWorld(true); onStage(boy.node('head_end'), v3);
      hat.position.set(v3.x, v3.y - .009, v3.z - .001); hat.rotation.set(-.08, 0, 0); boy.node('head').attach(hat);
      hammer = makeHammer(); hammer.scale.setScalar(.65); stage.add(hammer);   // a grown-up's hand: a hammer of a real size
      roll = makeRoll(); roll.rotation.order = 'YXZ'; stage.add(roll);
      roller = makeRoller(); roller.rotation.order = 'YXZ'; stage.add(roller);

      /* the sky: a day and a dusk painted on two pop-up pages at the back edge; dusk fades in over the day */
      backdrops = [false, true].map((dusk, i) => {
        const b = kit.backdrop((c, w, h) => sky(c, w, h, dusk), { width: 1.12, height: .78, curve: .08, z: -.315 + i * .002 });
        stage.add(b); return b;
      });
      const bush = kit.model('bush').fit({ height: .1 });                // KayKit City Builder Bits: three of them round the garden
      bushes = [[-.33, -.21, .1, .4], [.32, -.23, .085, -.6], [-.45, .0, .07, 1.2]].map(([x, z, hgt, turn], i) => {
        const b = i ? bush.root.clone(true) : bush.root; b.position.set(x, 0, z); b.rotation.y = turn; b.userData.h = hgt; stage.add(b); return b;
      });

      /* the ground: the blueprint (unrolls from his roll), the slab that rises out of it */
      const planTex = texture(canvas(512, 256, plan));
      sheet = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(2 * SHEET.x, SHEET.z1 - SHEET.z0).translate(SHEET.x, 0, 0)),
        kit.keep(new THREE.MeshStandardMaterial({ map: planTex, roughness: .9, emissive: 0xffffff, emissiveMap: planTex, emissiveIntensity: .15 })));
      sheet.rotation.x = -R; sheet.position.set(-SHEET.x, .003, (SHEET.z0 + SHEET.z1) / 2); sheet.receiveShadow = true; stage.add(sheet);
      slab = mesh(new THREE.BoxGeometry(2 * EAVE.x, SLAB, .305).translate(0, SLAB / 2, 0), mat('#dcd3c6', { roughness: .95 }), 0, 0, SLAB_FRONT - .305 / 2); stage.add(slab);

      /* the house */
      layWalls(); layRoof();
      const unit = kit.keep(new THREE.BoxGeometry(1, 1, 1));
      bricksMesh = new THREE.InstancedMesh(unit, mat('#ffffff', { roughness: .85 }), bricks.length);
      const col = new THREE.Color();
      bricks.forEach((b, i) => bricksMesh.setColorAt(i, col.set(PAL.brick[Math.floor(rng() * PAL.brick.length)])));
      mortarMesh = new THREE.InstancedMesh(unit, mat(PAL.mortar, { roughness: .95 }), mortar.length);
      tilesMesh = new THREE.InstancedMesh(unit, mat('#ffffff', { roughness: .6 }), tiles.length);
      tiles.forEach((t, i) => tilesMesh.setColorAt(i, col.set(PAL.roof[Math.floor(rng() * PAL.roof.length)])));
      for (const m of [bricksMesh, mortarMesh, tilesMesh]) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; stage.add(m); }
      decks = [-1, 1].map(s => {
        const d = mesh(new THREE.BoxGeometry(LSLOPE + .004, .01, DEPTH), mat('#9a6b4f', { roughness: .9 }));
        d.quaternion.copy(slopeBasis(s)); d.userData.at = new THREE.Vector3(s * EAVE.x / 2, (RIDGE + EAVE.y) / 2, (EAVE.front + EAVE.back) / 2)
          .addScaledVector(new THREE.Vector3(s * Math.sin(PITCH), Math.cos(PITCH), 0), -.005);
        stage.add(d); return d;
      });
      gables = [true, false].map(f => { const gb = makeGable(f); stage.add(gb); return gb; });
      ridge = mesh(new THREE.CylinderGeometry(.012, .012, DEPTH + .01, 12), mat('#b9453c', { roughness: .6 }), 0, RIDGE + .003, (EAVE.front + EAVE.back) / 2);
      ridge.rotation.x = R; stage.add(ridge);
      chimney = makeChimney(); stage.add(chimney);
      door = makeDoor(); stage.add(door);
      FLOWER = flowerParts();
      windows = [-1, 1].map(s => { const w = makeWindow(s); stage.add(w.glass, w.frame, w.sill, w.box, w.glow); return w; });
      roundWin = makeRoundWindow(); stage.add(roundWin);
      interior = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(.36, 1).translate(0, .5, 0)), kit.keep(new THREE.MeshBasicMaterial({ color: '#3d2a2a' })));
      interior.position.set(0, SLAB, WB + WT + .002); interior.scale.y = ROWS * C - .004; stage.add(interior);   // the inside of the back wall, seen through the door and windows
      lamp = new THREE.PointLight(0xffb560, 0, .7, 1.4); lamp.position.set(0, .2, -.16); stage.add(lamp);
      glows = { door: kit.glow({ color: 0xffbf6a, size: .3, opacity: 0 }), porch: null };
      glows.door.position.set(0, SLAB + .12, WF + .01); stage.add(glows.door);
      const pool = canvas(128, 128, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,200,120,.95)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); });
      glows.porch = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(.26, .16)), kit.keep(new THREE.MeshBasicMaterial({ map: texture(pool), transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false })));
      glows.porch.rotation.x = -R; glows.porch.position.set(0, SLAB + .002, .0); stage.add(glows.porch);

      /* the yard: the wheelbarrow of bricks, the paint tray, the mailbox; her armful of bricks */
      const barrow = makeBarrow(); barrow.position.set(.39, 0, .17); barrow.rotation.y = -2.2; stage.add(barrow);
      barrowBricks = [[-.012, .052, -.004], [.012, .052, .012], [-.01, .066, .014], [.012, .066, -.006]].map((p, i) => {
        const b = makeBrick(.04, .016, .02, i); b.position.set(...p); b.rotation.y = .3 * i; barrow.add(b); b.userData.home = p; return b;
      });
      carry = { barrow };
      tray = makeTray(); tray.position.set(TRAY[0], 0, TRAY[1]); tray.rotation.y = -1.05; stage.add(tray);
      carry.stack = [0, 1, 2].map(i => { const b = makeBrick(.046, .017, .024, i + 2); stage.add(b); return b; });
      mailbox = makeMailbox(); mailbox.position.set(-.37, 0, .14); mailbox.rotation.y = .45; stage.add(mailbox);

      /* the card's words and photo */
      titleSign = makeTitleSign(); stage.add(titleSign);
      photo = kit.polaroid({ width: .24, caption: words('caption', 'Nhà của hai đứa mình'), glow: .5, halo: true, haloColor: 0xffd9a0 });
      banner = kit.sign({ text: words('note2', 'Về chung một nhà nhé em!'), style: 'banner', width: .62, accent: '#e8566f', glow: .5 });
      stage.add(photo.root, banner.root);

      /* particles */
      sparks = kit.particles({ max: 320, additive: true });
      chips = kit.particles({ max: 140 });
      dust = kit.particles({ max: 120 });
      hearts = kit.particles({ max: 160 });
      smoke = kit.particles({ max: 70 });
      drops = kit.particles({ max: 60 });
      stage.add(sparks.root, chips.root, dust.root, hearts.root, smoke.root, drops.root);
    },

    reset() {
      [sparks, chips, dust, hearts, smoke, drops].forEach(p => p.clear());
      boy.stop(); girl.stop(); lastG = -1;
    },

    pose({ g, T, dt, held }) {
      const pop = (t0, len = .3) => Math.max(.001, ease.back(seg(g, t0, t0 + len)));
      const burst = (key, at, x, y, z, n = 12, cols = ['#fff3c4', '#ffd1dc', '#ffffff']) => {
        if (g > at && kit.once(key)) sparks.burst(n, i => { const a = i / n * 6.28 + rng(); return { x, y, z, vx: Math.cos(a) * .2, vy: .1 + rng() * .16,
          vz: Math.sin(a) * .1, gravity: -.3, drag: 2.2, color: cols[i % cols.length], size: .016 + rng() * .012, life: .8, shape: i % 2 ? 'sparkle' : 'glow', spin: 3 }; });
      };
      const puff = (key, at, x, y, z, n = 14, r = .08) => {          // dust kicked up round something landing
        if (g > at && kit.once(key)) dust.burst(n, i => { const a = i / n * 6.28; return { x: x + Math.cos(a) * r, y, z: z + Math.sin(a) * r * .6, vx: Math.cos(a) * .12,
          vy: .03 + rng() * .04, vz: Math.sin(a) * .07, drag: 2.5, color: '#efe3d0', size: .026 + rng() * .02, grow: 1.2, life: .9, shape: 'glow' }; });
      };
      const heartsAt = (n, x, y, z, s = 1) => hearts.burst(n, () => ({ x: x + (rng() - .5) * .05 * s, y, z, vx: (rng() - .5) * .25 * s, vy: .12 + rng() * .18 * s,
        vz: (rng() - .5) * .12 * s, gravity: -.15, drag: .8, color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .022 + rng() * .018, life: 2.2,
        shape: 'heart', spin: (rng() - .5) * 4 }));
      const arc = (o, a, b, k, apex) => o.position.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k) + apex * 4 * k * (1 - k), lerp(a[2], b[2], k));
      const local = (x, z, th, lx, ly, lz) => [x + lx * Math.cos(th) + lz * Math.sin(th), ly, z - lx * Math.sin(th) + lz * Math.cos(th)];   // a character's own x, y, z on the stage

      /* light: morning, a golden afternoon, then dusk and the house's own lights */
      const gold = ease.smooth(seg(g, 6.6, 9.5)), dusk = ease.smooth(seg(g, DUSK, DUSK + 1.8)), on = g < LIGHTS ? 0 : g < LIGHTS + .25 ? (Math.sin((g - LIGHTS) * 70) > 0 ? 1 : .3) : 1;
      const L = kit.lights;
      L.hemi.color.copy(DAY.hemi).lerp(GOLD.hemi, gold).lerp(EVE.hemi, dusk); L.hemi.groundColor.copy(DAY.ground).lerp(GOLD.ground, gold).lerp(EVE.ground, dusk);
      L.hemi.intensity = lerp(1.1, .62, dusk); L.sun.color.copy(DAY.sun).lerp(GOLD.sun, gold).lerp(EVE.sun, dusk); L.sun.intensity = lerp(1.5, .7, dusk);
      const fold = ease.inOut(seg(g, 0, .6)), wob = g > .6 ? Math.exp(-6 * (g - .6)) * Math.sin(14 * (g - .6)) : 0;
      backdrops.forEach(b => { b.rotation.x = -R * (1 - fold) - .1 * wob; });     // the sky folds up like a pop-up page
      backdrops[1].material.opacity = dusk; backdrops[1].visible = dusk > 0;
      bushes.forEach((b, i) => b.scale.setScalar(b.userData.h / .1 * pop(.45 + i * .12, .35)));

      /* the two of them: where they are, which way they look, which clip */
      const [bx, bz, br] = wayAt(BOY_WAY, g), [gx, gz, gr] = wayAt(GIRL_WAY, g);
      const rock = .05 * Math.sin(T * 2) * ease.smooth(seg(g, 17.7, 18.4));   // at the last stop they sway together
      boy.root.position.set(bx, ground(bx, bz, g), bz); boy.root.rotation.y = br + rock;
      girl.root.position.set(gx, ground(gx, gz, g), gz); girl.root.rotation.y = gr + rock;
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g);
      boy.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);

      /* chapter 1: he carries the roll in, throws it; it lands at the plan's left edge and unrolls to the right */
      const roam = seg(g, 0, .25) * (1 - seg(g, 1.45, 1.62));         // the roll held up in front while he walks, let go into the throw
      if (roam) { boy.aim('upperarm.r', [-.2, -.7, .5], roam); boy.aim('lowerarm.r', [-.1, .1, 1], roam); }
      const LAND = 2.6, UNROLL = [2.72, 3.17], mid = (SHEET.z0 + SHEET.z1) / 2, unroll = ease.out(seg(g, UNROLL[0], UNROLL[1]));
      const rr = lerp(.011, .006, unroll);
      roll.userData.tube.scale.set(rr, 1, rr); roll.visible = g < 3.45;
      if (g < RELEASE) {                                             // in his fist by one end, like a baton
        put(roll, boy, 'handslot.r', [0, .07, 0], [0, 0, 0]); roll.userData.tube.rotation.y = 0;
      } else if (g < LAND) {                                         // over in an arc from where it left his hand, turning to lie along the plan's left edge
        if (kit.once('release')) { stage.updateWorldMatrix(true, false); roll.updateWorldMatrix(true, false); m4.copy(stage.matrixWorld).invert().multiply(roll.matrixWorld).decompose(LET_GO.p, LET_GO.q, s3); }
        const k = seg(g, RELEASE, LAND), { p } = LET_GO, ex = -SHEET.x + .011;
        put(roll, null, null, [lerp(p.x, ex, k), lerp(p.y, .011, k) + .1 * 4 * k * (1 - k), lerp(p.z, mid, k)], [0, 0, 0]);
        roll.quaternion.slerpQuaternions(LET_GO.q, LAID, ease.out(k));
        roll.userData.tube.rotation.y = k * 9;
      } else {
        const bounce = .014 * Math.sin(Math.PI * seg(g, LAND, UNROLL[0])), x = -SHEET.x + .011 + (2 * SHEET.x - .022) * unroll;
        put(roll, null, null, [x, rr + bounce, mid], [R, 0, 0]); roll.userData.tube.rotation.y = -(x + SHEET.x) / rr * .9;
      }
      puff('roll', LAND, -SHEET.x + .011, .006, mid, 8, .03);
      sheet.visible = g > UNROLL[0] && g < 3.6; sheet.scale.x = Math.max(.001, unroll);
      const shine = Math.sin(Math.PI * seg(g, 3.05, 3.5));            // the plan's lines light up, then the slab rises out of it
      sheet.material.emissiveIntensity = .15 + .9 * shine;
      if (shine > .2 && dt && rng() < dt * 40) {
        const w2 = 2 * WX, d2 = WF - WB, u = rng() * 2 * (w2 + d2);   // a point on the walls' outline
        const p = u < w2 ? [-WX + u, WF] : u < w2 + d2 ? [WX, WF - (u - w2)] : u < 2 * w2 + d2 ? [WX - (u - w2 - d2), WB] : [-WX, WB + (u - 2 * w2 - d2)];
        sparks.emit({ x: p[0], y: .01, z: p[1], vy: .12 + rng() * .1, drag: 1, color: rng() < .5 ? '#bfe3ff' : '#ffffff', size: .016, life: .7, shape: 'sparkle', spin: 3 });
      }
      const rise = tween(g, [[3.25, 0], [3.47, 1.18, 'out'], [3.6, .93], [3.72, 1]]);
      slab.visible = g > 3.25; slab.scale.set(1 + .03 * Math.sin(Math.PI * seg(g, 3.47, 3.72)), Math.max(.001, rise), 1);
      puff('slab', 3.47, 0, .01, -.13, 22, .22);

      /* the hammer: on his belt, in his hand from 3.05 to 9.1; a reach to the hip to take it and to put it back */
      const reach = Math.sin(Math.PI * seg(g, 2.9, 3.2)) + Math.sin(Math.PI * seg(g, 8.95, 9.25));
      if (reach > 0) { boy.aim('upperarm.r', [-.45, -.85, -.1], reach); boy.aim('lowerarm.r', [-.05, -.85, .4], reach); }
      if (g >= 3.05 && g < 9.1) put(hammer, boy, 'handslot.r', [0, -.003, 0], [0, 0, -.8]);   // the head beyond the fist
      else {                                                         // hanging at his right hip, head up
        onStage(boy.node('hips'), v3); const p = local(v3.x, v3.z, br, -.032, 0, .006);
        put(hammer, null, null, [p[0], v3.y - .045, p[2]], [0, br, .1]);
      }
      hammering(g, br);

      /* the walls, brick by brick; at each strike chips fly off the hammer */
      if (g !== lastG) { placeBricks(g); placeTiles(g); lastG = g; }
      STRIKES.forEach((s, i) => {
        if (g > s && kit.once(`strike${i}`)) {
          onStage(hammer.head, v3);
          chips.burst(12, j => ({ x: v3.x, y: v3.y, z: v3.z, vx: .05 - rng() * .3, vy: .12 + rng() * .2, vz: (rng() - .5) * .2, gravity: -.9, drag: .6,
            color: j % 3 ? PAL.brick[j % 6] : PAL.mortar, size: .012 + rng() * .01, life: .9, shape: j % 2 ? 'leaf' : 'petal', spin: (rng() - .5) * 14, floor: .004 }));
          sparks.burst(9, j => { const a = j / 9 * 6.28; return { x: v3.x, y: v3.y, z: v3.z + .01, vx: Math.cos(a) * .16, vy: Math.sin(a) * .16, drag: 3,
            color: j % 2 ? '#fff1a8' : '#ffffff', size: .02, life: .45, shape: j % 3 ? 'star' : 'sparkle', spin: 5 }; });
        }
      });

      /* her armful: three bricks at her chest; at each toss the top one flies over to the corner he strikes */
      const carryK = seg(g, .3, .45) * (1 - ease.smooth(seg(g, TOSS[2] + .12, TOSS[2] + .42)));
      if (carryK) {
        const flick = Math.max(0, ...TOSS.map(t => Math.sin(Math.PI * seg(g, t - .06, t + .2))));
        for (const [s, up, low] of [[-1, 'upperarm.r', 'lowerarm.r'], [1, 'upperarm.l', 'lowerarm.l']]) {
          girl.aim(up, [s * .16, lerp(-.8, -.45, flick), lerp(.55, .85, flick)], carryK); girl.aim(low, [-s * .3, lerp(.15, .6, flick), 1], carryK);
        }
      }
      carry.stack.forEach((b, i) => {
        const j = 2 - i, t0 = TOSS[j], t1 = STRIKES[j], k = seg(g, t0, t1), course = j + 1;
        const home = local(gx, gz, gr, 0, CARRY[0] + i * .018 + kit.hop(g - .3, .55, .004) * seg(g, .3, .4) * (1 - seg(g, 1.5, 1.6)), CARRY[1]);
        if (g < t0) { b.visible = g > .05; b.position.set(...home); b.rotation.set(0, gr, 0); b.scale.setScalar(1); return; }
        b.visible = k < 1;
        arc(b, local(.33, .06, -1, 0, CARRY[0] + i * .018, CARRY[1]), [-WX + .03, SLAB + C * (course + .5), WF - WT / 2 + .006], k, .14);
        b.rotation.set(k * 6.28, lerp(-1, 0, k), 0); b.scale.setScalar(lerp(1, 1.4, k));
      });
      /* the wheelbarrow's bricks fly to the same corner for the upper courses */
      carry.barrow.updateMatrix();
      barrowBricks.forEach((b, i) => {
        const course = 4 + i, t1 = COURSE_AT[course], t0 = t1 - .42, k = seg(g, t0, t1);
        if (g < t0) { if (b.parent !== carry.barrow) carry.barrow.add(b); b.visible = true; b.position.set(...b.userData.home); b.rotation.set(0, .3 * i, 0); b.scale.setScalar(1); return; }
        if (b.parent !== stage) stage.add(b);
        b.visible = k < 1;
        v3.set(...b.userData.home).applyMatrix4(carry.barrow.matrix);
        arc(b, v3.toArray(), [-WX + .03, SLAB + C * (course + .5), WF - WT / 2 + .006], k, .16); b.rotation.set(k * 6.28, 0, k * 3); b.scale.setScalar(lerp(1, 1.5, k));
      });

      /* the sign of chapter 1: a blueprint unrolls from a rod over the house */
      const signIn = pop(5.45, .25) * (1 - ease.in(seg(g, 6.85, 7.05))), down = ease.out(seg(g, 5.6, 6.2)) * (1 - ease.inOut(seg(g, 6.45, 6.85)));
      titleSign.visible = g > 5.45 && g < 7.05; titleSign.scale.setScalar(Math.max(.001, signIn));
      titleSign.sheet.scale.y = titleSign.back.scale.y = Math.max(.001, down);
      const sr = lerp(.017, .007, down); titleSign.roll.scale.set(sr, 1, sr); titleSign.roll.position.y = -titleSign.h * down;
      titleSign.position.set(0, .665 + .006 * Math.sin(T * 1.4), .03); titleSign.rotation.set(-.1, 0, .02 * Math.sin(T * .9));
      burst('sign', 5.5, 0, .66, .04, 14); burst('signOut', 6.95, 0, .63, .04, 12);

      /* chapter 2: the gables fold up, the decks drop on, the tiles, the ridge, the chimney */
      gables.forEach((gb, i) => {
        const f = ease.elastic(seg(g, ROOF_AT + i * .08, ROOF_AT + .5 + i * .08));
        gb.visible = g > ROOF_AT + i * .08; gb.rotation.x = (i ? R : -R) * (1 - f);
      });
      decks.forEach((d, i) => {
        const t = seg(g, ROOF_AT + .2 + i * .06, ROOF_AT + .4 + i * .06);
        d.visible = t > 0; d.position.copy(d.userData.at); d.position.y += .1 * (1 - ease.in(t));
      });
      const rk = pop(ROOF_AT + 1.5, .3); ridge.visible = g > ROOF_AT + 1.5; ridge.scale.set(1, rk, 1);
      const cl = seg(g, ROOF_AT + 1.62, ROOF_AT + 1.86), csq = g > ROOF_AT + 1.86 ? .3 * Math.exp(-7 * (g - ROOF_AT - 1.86)) * Math.cos(16 * (g - ROOF_AT - 1.86)) : 0;
      chimney.visible = g > ROOF_AT + 1.62; chimney.position.y = RIDGE + .025 + .25 * (1 - ease.in(cl)); chimney.scale.set(1 + csq * .4, 1 - csq, 1 + csq * .4);
      puff('chimney', ROOF_AT + 1.86, CHIMNEY[0], RIDGE - .02, CHIMNEY[1], 12, .04);
      burst('ridge', ROOF_AT + 1.55, 0, RIDGE + .02, -.165, 10);

      /* the door goes in raw; she paints it with the roller, then a heart window and a knob; at dusk it swings open */
      const doorIn = pop(8.0, .3); door.visible = g > 8.0; door.scale.set(1, doorIn, 1);
      const painted = seg(g, PAINT[0] + .12, PAINT[1] - .08);
      door.paint.visible = painted > 0; door.paint.scale.x = Math.max(.001, ease.inOut(painted));
      door.pane.scale.setScalar(pop(10.25, .3)); door.knob.scale.setScalar(pop(10.33, .25));
      door.hinge.rotation.y = 1.65 * ease.out(seg(g, DOOR_OPEN, DOOR_OPEN + .55)) - .1 * Math.sin(Math.PI * seg(g, DOOR_OPEN + .4, DOOR_OPEN + .8));
      burst('heartPane', 10.27, .0, SLAB + .19, WF + .01, 10);

      /* the roller: in the tray until she takes it, then in her right hand; in her left before the cheer at the end */
      if (g < GRAB) put(roller, null, null, [TRAY[0] + .033, BENCH + .014, TRAY[1] - .02], [R, -1.05, 0]);
      else if (g < 15.6) put(roller, girl, 'handslot.r', [0, -.004, 0], [0, 0, 0]);
      else put(roller, girl, 'handslot.l', [0, -.004, 0], [0, 0, 0]);
      const grab = seg(g, GRAB - .45, GRAB - .1) * (1 - seg(g, GRAB + .1, GRAB + .4));   // her hand to the roller's grip on the tray
      if (grab) { const [u, l] = reachWith(girl, 'r', girl.node('handslot.r'), vD.set(TRAY[0] + .033, BENCH + .014, TRAY[1] - .02), gr); girl.aim('upperarm.r', u, grab); girl.aim('lowerarm.r', l, grab); }
      const walkRoller = seg(g, GRAB + .5, GRAB + .8) * (1 - seg(g, PAINT[0] - .1, PAINT[0] + .05));
      if (walkRoller) { girl.aim('upperarm.r', [-.25, -.55, .6], walkRoller); girl.aim('lowerarm.r', [-.1, .35, 1], walkRoller); }
      const paintK = seg(g, PAINT[0] - .1, PAINT[0] + .1) * (1 - seg(g, PAINT[1] - .05, PAINT[1] + .15));
      if (paintK) {                                                  // three strokes up and down the door, the roller on it, right to left
        const s = .5 - .5 * Math.cos(seg(g, PAINT[0], PAINT[1]) * Math.PI * 2 * 3);
        const [u, l] = reachWith(girl, 'r', roller.userData.pad, vD.set(lerp(.035, -.035, seg(g, PAINT[0], PAINT[1])), lerp(SLAB + .05, SLAB + .21, s), WF - .009), gr, true);
        girl.aim('upperarm.r', u, paintK); girl.aim('lowerarm.r', l, paintK);
        girl.bend('head', .08, -.3, 0, paintK);
        const pad = roller.userData.pad;
        if (dt && g > PAINT[0] && g < PAINT[1] && rng() < dt * 14) {
          onStage(pad, v3);
          drops.emit({ x: v3.x, y: v3.y, z: v3.z + .006, vx: (rng() - .5) * .05, vy: .02, gravity: -.5, color: PAL.door, size: .008 + rng() * .006, life: .7,
            shape: 'glow', floor: SLAB + .002 });
        }
      }

      /* the window frames, sills and boxes snap in; the flowers pop out at dusk */
      windows.forEach((w, i) => {
        const f = pop(10.05 + i * .15, .28), b = pop(10.3 + i * .12, .3);
        w.frame.visible = w.sill.visible = w.glass.visible = g > 10.05 + i * .15; w.frame.scale.setScalar(f); w.sill.scale.set(f, 1, 1);
        w.box.visible = g > 10.3 + i * .12; w.box.scale.setScalar(b);
        burst(`frame${i}`, 10.1 + i * .15, w.x, SLAB + C * 4.5, WF + .02, 8);
        w.flowers.forEach((f2, j) => {
          const at = 13.2 + (i * 4 + j) * .09; f2.scale.setScalar(pop(at, .3)); f2.visible = g > at;
          if (g > at && kit.once(`flower${i}${j}`)) {
            onStage(f2, v3);
            sparks.burst(6, n => ({ x: v3.x, y: v3.y + .02, z: v3.z + .01, vx: (rng() - .5) * .12, vy: .06 + rng() * .08, drag: 2, color: n % 2 ? '#ffd1dc' : '#fff3b0',
              size: .014, life: .6, shape: n % 2 ? 'petal' : 'sparkle', spin: 4 }));
          }
        });
        w.glass.material.emissiveIntensity = 1.3 * on; w.glow.material.opacity = .55 * on * (1 + .05 * Math.sin(T * 3 + i));
      });

      /* the house's lights: the windows, the attic, the inside and the doorway */
      door.pane.material.emissiveIntensity = 1.4 * on;
      interior.material.color.copy(DARK).lerp(WARM, on);
      interior.visible = g > ROOF_AT + .4;                            // once the roof is on, the inside is in shade (and later lit)
      lamp.intensity = .9 * on;
      const open = seg(g, DOOR_OPEN, DOOR_OPEN + .5);
      glows.door.material.opacity = .6 * open * on; glows.porch.material.opacity = .55 * open * on;
      burst('doorOpen', DOOR_OPEN + .25, 0, SLAB + .12, WF + .03, 16, ['#ffe2a8', '#fff6dc']);

      /* the attic window swings open and the photo flies out of it; at dusk it moves aside */
      roundWin.visible = g > ROOF_AT + .1; roundWin.scale.setScalar(pop(ROOF_AT + .45, .3));
      roundWin.hinge.rotation.y = -2.1 * ease.out(seg(g, 10.6, 10.95)) * (1 - ease.inOut(seg(g, 11.7, 12.1)));   // it shuts again behind the photo
      roundWin.glass.material.emissiveIntensity = .55 * on; roundWin.glow.material.opacity = .35 * Math.max(Math.sin(Math.PI * seg(g, 10.6, 11.6)), on);
      const fly = ease.out(seg(g, 10.75, 11.7)), aside = ease.inOut(seg(g, 12.6, 13.4)), ph = photo.height;
      const sc = (g < 10.75 ? 0 : lerp(.08, 1, fly)) * lerp(1, .55, aside);
      const up = [0, lerp(ROUND.y - ph * .08 / 2, .37, fly) + .1 * Math.sin(Math.PI * fly), lerp(WF + .01, .03, fly)], side = [-.375, .3, -.04];
      photo.root.visible = g > 10.75; photo.root.scale.setScalar(Math.max(.001, sc));
      photo.root.position.set(lerp(up[0], side[0], aside), lerp(up[1], side[1], aside) + .006 * Math.sin(T * 1.3), lerp(up[2], side[2], aside));
      photo.root.rotation.set(-.08, (1 - fly) * Math.PI * 2 + .08 * Math.sin(T * .8) + .25 * aside, .04 * Math.sin(T * .6) + .06 * aside);
      photo.halo.material.opacity = .45 * ease.out(seg(g, 11.2, 11.8)) * (1 - .5 * aside) * (1 + .08 * Math.sin(T * 3));
      if (g > 10.8 && g < 12.6 && dt && rng() < dt * 7) {
        const a = rng() * 6.28, s = photo.root.scale.x;
        sparks.emit({ x: photo.root.position.x + Math.cos(a) * .15 * s, y: photo.root.position.y + ph * s / 2 + Math.sin(a) * .17 * s, z: photo.root.position.z + .01,
          color: '#fff1b8', size: .018, life: 1, shape: 'sparkle', spin: 3 });
      }

      /* the mailbox springs up; at the end its flag flips up and a letter with a heart peeks out */
      mailbox.visible = g > 12.9; mailbox.scale.set(1, Math.max(.001, ease.elastic(seg(g, 12.9, 13.6))), 1);
      mailbox.flag.rotation.z = -R * (1 - ease.back(seg(g, 17.4, 17.7)));
      const peek = ease.back(seg(g, 17.55, 17.9)); mailbox.letter.position.set(.03 + .022 * peek, .004 + .012 * peek, 0); mailbox.letter.rotation.z = -.4 * peek;
      if (g > 17.6 && kit.once('mail')) { onStage(mailbox.letter, v3); heartsAt(10, v3.x, v3.y + .02, v3.z, .5); }

      /* heart-shaped smoke from the chimney, once the lights are on (by the act's clock while it waits) */
      if (g > DOOR_OPEN + .3 && dt && kit.once(held ? `smoke-held${Math.floor(T / .5)}` : `smoke${Math.floor((g - DOOR_OPEN) / .42)}`)) {
        smoke.emit({ x: CHIMNEY[0] + (rng() - .5) * .01, y: RIDGE + .045, z: CHIMNEY[1], vx: .012 + rng() * .01, vy: .075, sway: .015, drag: .2,
          color: ['#fff4f6', '#ffe1ea', '#ffd0dc'][(rng() * 3) | 0], size: .03, grow: 1.7, life: 2.3, shape: 'heart', spin: (rng() - .5) * 1.2 });
      }

      /* gestures: heads that follow what happens, the reach for the photo, the cheer, the arm round each other */
      const look = (a, b, c, d) => seg(g, a, b) * (1 - seg(g, c, d));
      for (const [k, m, x, y] of [                                   // [how much, who, nod, turn]: she watches the bricks fly, both look up at the
        [look(TOSS[0] - .1, TOSS[0] + .1, STRIKES[2] + .2, STRIKES[2] + .5), girl, -.06, -.35],   // sign, he at the roof going on, both at the photo
        [look(5.9, 6.3, 6.4, 6.6), boy, -.22, -.2], [look(5.9, 6.3, 6.4, 6.6), girl, -.22, .2],   // and at the flowers popping out
        [look(9.2, 9.5, 10.2, 10.5), boy, -.3, -.15 + .2 * Math.sin((g - 9.2) * 2)],
        [look(11.2, 11.7, 12.6, 12.9), boy, -.32, -.25], [look(11.2, 11.7, 12.6, 12.9), girl, -.32, .25],
        [look(13.1, 13.4, 14.1, 14.4), boy, -.12, -.5], [look(13.1, 13.4, 14.1, 14.4), girl, -.12, .5]]) if (k) m.bend('head', x, y, 0, k);
      const cheek = look(11.2, 11.7, 12.6, 12.9);                     // a hand to her cheek, looking up at the photo
      if (cheek) {                                                   // her left cheek: aside and a little back from her face's front, the fist just off it
        const f = onStage(girl.node('headfront'), new THREE.Vector3()), th = girl.root.rotation.y;
        f.x += Math.cos(th) * .021 - Math.sin(th) * .008; f.z += -Math.sin(th) * .021 - Math.cos(th) * .008;
        const [u, l] = reachWith(girl, 'l', girl.node('handslot.l'), f, th); girl.aim('upperarm.l', u, cheek); girl.aim('lowerarm.l', l, cheek);
      }
      const finale = ease.inOut(seg(g, 17.1, 17.6));
      if (finale) for (const [m, s, other] of [[boy, 1, girl], [girl, -1, boy]]) {   // s: the side the other one is on (+1 his left, -1 her right)
        const side = s > 0 ? 'l' : 'r', small = onStage(other.node('hips'), new THREE.Vector3()).add({ x: -s * .006, y: .025, z: -.03 });   // a hand on the small of the other's back
        const [u, l] = reachWith(m, side, m.node(`handslot.${side}`), small, m.root.rotation.y);
        m.aim(`upperarm.${side}`, u, finale); m.aim(`lowerarm.${side}`, l, finale); m.bend('chest', 0, 0, -s * .08, finale);
        m.bend('head', 0, s * .2, -s * (.18 + .03 * Math.sin(T * 1.3)), finale);
      }
      if (g > 5.95 && kit.once('cheer1')) { heartsAt(10, -.29, .32, 0, .8); heartsAt(10, .33, .32, 0, .8); }
      if (g > 16.3 && kit.once('cheer3')) heartsAt(28, 0, .32, .03, 1.8);

      /* chapter 3's banner */
      const b = ease.elastic(seg(g, 17.0, 18.0));
      banner.root.visible = g > 17; banner.root.scale.setScalar(Math.max(.001, b));
      banner.root.position.set(0, .73 + .006 * Math.sin(T * 1.5), .05); banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      if (held && g > 18 && dt && rng() < dt * 1.4) hearts.emit({ x: (rng() - .5) * .3, y: .3, z: 0, vy: .08, sway: .03, color: '#ff8fab', size: .02, life: 2.4, shape: 'heart' });

      [sparks, chips, dust, hearts, smoke, drops].forEach(x => x.update(dt, T));
    }
  };
};
