/* Mưa hoa anh đào (cherry blossom rain), told by the shared act _acts/lovestory.js. Three chapters, each ending at a stop:
     1 · 0–6.4 s     a spring sky folds up behind a little railway crossing and petals start to fall; she walks up on the
                     far side, he on the near side, and they see each other across the tracks; the lamps blink, the
                     barriers come down between them, she waves shyly and he waves back; a note with the card's first
                     words (note1) comes up
     2 · 6.4–12.4 s  the arrow lights and a little train rushes through between them in a gust of petals; in its wake the
                     petals whirl up, and the card's photo flutters down out of the whirl and floats over the tracks with
                     its caption
     3 · 12.4–18.7 s the lamps go dark and the barriers lift: they are both still there; they run to each other, meet in
                     the middle of the crossing and he swings her round in a hug; petals rise round them and gather into
                     a heart, and a banner with the last words (note2) rises
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rand = seeded(318);                                          // the scenery's own seed: the same trees and petals every time

  /* the layout, in card widths: the tracks run along x; she waits on the far side (-z), he on the near side, a little apart
     in x so neither hides the other from the phone */
  const H = .3, HER = H * .945;                                      // their heights (her 1.70 m to his 1.80)
  const TZ = -.03, RAIL_Z = [TZ - .035, TZ + .035], RAIL_TOP = .022, DECK = .021, LANE = .115;
  const SHE = { x: .03, z: -.2 }, HE = { x: -.1, z: .17 };
  const FACE_HE = Math.atan2(SHE.x - HE.x, SHE.z - HE.z), FACE_SHE = FACE_HE - Math.PI;   // across the tracks, at each other
  const HUG = .023, AXIS = [Math.sin(FACE_HE), Math.cos(FACE_HE)];  // half the space between them in the hug (chest to chest); him to her
  const BAR = .118;                                                  // the barrier arm's pivot: an adult's waist
  const MEET = { he: { x: -HUG * AXIS[0], z: TZ - HUG * AXIS[1] }, she: { x: HUG * AXIS[0], z: TZ + HUG * AXIS[1] } };
  const SPIN = -R - FACE_HE;                                         // he swings her round two thirds of a turn: she ends on the left
  const SIGNALS = [{ x: -.165, z: -.152 }, { x: .165, z: .097 }];    // far, near: crossbuck, two red lamps, the arrow, a bell
  const GATES = [{ x: .165, z: -.13, dir: -1 }, { x: -.165, z: .084, dir: 1 }];   // barrier arms reach across the lane (dir: which way)
  const TREES = [{ x: -.385, z: -.25, h: .5, seed: 3, pop: .45 }, { x: .405, z: -.258, h: .45, seed: 8, pop: 1.2 }];   // the right one once she has passed it
  const PHOTO = { x: 0, y: .4, z: -.1 }, ASIDE = { x: -.355, y: .13, z: -.125, s: .6 };
  const HEART = { x: 0, y: .455, z: TZ, w: .085 };
  const TRAIN = { at: 7.45, speed: 1.6, len: .22, gap: .014 };       // its nose reaches the card's left edge at `at`
  const trainX = g => -.5 + TRAIN.speed * (g - TRAIN.at);            // where its nose is
  const TAIL = 3 * TRAIN.len + 2 * TRAIN.gap;
  const PINKS = ['#ffc2d6', '#ffb0c9', '#ffd9e5', '#ff9fbe', '#ffe8ef', '#fff6f8'];
  const SPRING = { hemi: new THREE.Color('#fff4f7'), ground: new THREE.Color('#dcbccb'), sun: new THREE.Color('#fff3e3') };
  const GOLDEN = { hemi: new THREE.Color('#ffe6ea'), ground: new THREE.Color('#e5b9c4'), sun: new THREE.Color('#ffd7b8') };
  let boy, girl, sky, note, banner, photo, halo, petalGeo, petalMat, storm, train, signals, gates, trees, fall, sparks, bits;
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  /** how high the ground is under a foot on the lane: a sheet of tarmac, and the crossing's deck at rail height */
  const ground = z => Math.max(.002, DECK * clamp((z - (TZ - .12)) / .035) * clamp((TZ + .12 - z) / .035));

  /* the clip each of them plays from story time g: [from g, clip, options] */
  const HE_CLIPS = [[0, 'Idle'], [.35, 'Walking_A', { speed: 1.75 }], [2.75, 'Idle', { fade: .25 }], [13.42, 'Running_A', { speed: .8, fade: .12 }],
    [13.86, 'Idle', { fade: .2 }]];
  const SHE_CLIPS = [[0, 'Idle'], [.1, 'Walking_A', { speed: 2.1 }], [2.6, 'Idle', { fade: .25 }], [13.38, 'Running_A', { speed: .6, fade: .12 }],
    [13.86, 'Idle', { fade: .2 }]];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };

  /* where they stand: [from g, x, z, facing, how they get there]; walk: steady steps with a start and a stop, run: no stop */
  const HE_WAY = [[0, -.46, HE.z, R], [.35, -.46, HE.z, R], [2.75, HE.x, HE.z, R, 'walk'], [3.15, HE.x, HE.z, FACE_HE],
    [13.42, HE.x, HE.z, FACE_HE], [13.86, MEET.he.x, MEET.he.z, FACE_HE, 'run']];
  const SHE_WAY = [[0, .46, SHE.z, -R], [.1, .46, SHE.z, -R], [2.6, SHE.x, SHE.z, -R, 'walk'], [3, SHE.x, SHE.z, FACE_SHE],
    [13.38, SHE.x, SHE.z, FACE_SHE], [13.86, MEET.she.x, MEET.she.z, FACE_SHE, 'run']];
  const STEPS = {
    walk: t => { const a = .14, v = 1 / (1 - a); return t < a ? v * t * t / (2 * a) : t < 1 - a ? v * (t - a / 2) : 1 - v * (1 - t) ** 2 / (2 * a); },
    run: t => { const a = .3, v = 1 / (1 - a / 2); return t < a ? v * t * t / (2 * a) : v * (t - a / 2); }
  };
  function wayAt(way, g) {
    let i = 0; while (i + 1 < way.length && g >= way[i + 1][0]) i++;
    const a = way[i], b = way[i + 1]; if (!b) return [a[1], a[2], a[3]];
    const k = (STEPS[b[4]] || ease.smooth)(clamp((g - a[0]) / (b[0] - a[0])));
    return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)];
  }

  /* arm poses in a character's own space, [upper arm, forearm], for the right arm (the left one mirrors x); some move.
     The hug is worked out each frame (hugArm) */
  const ARM = {
    chest: [[-.28, -.88, .38], [.72, .43, .55]],                        // a hand on the heart, the other on top of it
    shy: T => [[-.3, .15, .95], [-.05 + .22 * Math.sin(T * 10), .95, .35]],   // a small wave by her cheek
    wave: T => [[-.9, .42, .12], [-.4 + .45 * Math.sin(T * 9), .9, .12]],    // out to the side, so it shows past his head from behind
    point: [[-.25, .75, .6], [-.12, .85, .55]],                        // up at the photo
    scratch: [[-.33, .56, -.76], [.65, .5, .57]],                       // a shy hand to the back of the head
    shield: [[-.5, .45, .55], [.4, .8, .35]],                           // a forearm up against the wind
    clasp: [[-.25, -.6, .75], [.72, .25, .6]],                          // hands together, delighted
    joy: [[-.45, .9, .1], [-.15, 1, .05]]
  };
  /* the hug: her hands meet behind his neck, his rest on her back. Worked out each frame, so they hold on through the
     swing, the lift and the turn towards you: a reach for two bones, the elbows out and down */
  const hS = new THREE.Vector3(), hE = new THREE.Vector3(), hP = new THREE.Vector3(), hT = new THREE.Vector3(), hU = new THREE.Vector3(), hQ = new THREE.Vector3(), hW = new THREE.Quaternion();
  function hugArm(m, side) {
    const her = m === girl, other = her ? boy : girl, s = side === 'r' ? 1 : -1;
    other.root.getWorldQuaternion(hW);
    other.node(her ? 'neck' : 'spine').getWorldPosition(hT)
      .add(hU.set(0, 0, -1).applyQuaternion(hW).multiplyScalar(her ? .012 : .021))       // behind it
      .add(hU.set(s, 0, 0).applyQuaternion(hW).multiplyScalar(her ? .013 : .016));      // on the side this hand comes round
    m.root.worldToLocal(hT);
    m.root.worldToLocal(m.node(`upperarm.${side}`).getWorldPosition(hS));
    m.root.worldToLocal(m.node(`lowerarm.${side}`).getWorldPosition(hE));
    m.root.worldToLocal(m.node(`handslot.${side}`).getWorldPosition(hP));
    const a = hS.distanceTo(hE), b = hE.distanceTo(hP), d = clamp(hS.distanceTo(hT), Math.abs(a - b) + 1e-4, a + b - 1e-4);
    hU.copy(hT).sub(hS).normalize();
    hQ.set(-s, her ? -.6 : -.3, her ? 0 : -.2); hQ.sub(hP.copy(hU).multiplyScalar(hQ.dot(hU))).normalize();   // the elbow's way, square to the reach
    const cosA = (a * a + d * d - b * b) / (2 * a * d);
    hE.copy(hS).addScaledVector(hU, a * cosA).addScaledVector(hQ, a * Math.sqrt(Math.max(0, 1 - cosA * cosA)));
    return [hE.clone().sub(hS).toArray(), hT.clone().sub(hE).toArray()];
  }
  /* each arm through the story: [from g, pose (null: the clip's own), seconds to blend in] */
  const ARMS = {
    he: { r: [[0, null, 0], [4.55, 'scratch', .3], [5.25, 'wave', .25], [6.05, null, .35], [7.42, 'shield', .18], [8.6, null, .45], [9.45, 'point', .4],
      [10.7, null, .5], [12.95, 'joy', .2], [13.36, null, .12], [13.72, 'hug', .22]],
    l: [[0, null, 0], [12.95, 'joy', .2], [13.36, null, .12], [13.72, 'hug', .22]] },
    she: { r: [[0, null, 0], [3.2, 'chest', .25], [4.45, 'shy', .35], [6.7, 'chest', .4], [7.4, 'shield', .18], [8.6, null, .4], [9.5, 'clasp', .4],
      [12.9, 'joy', .2], [13.32, null, .12], [13.72, 'hug', .22]],
    l: [[0, null, 0], [3.2, 'chest', .25], [7.4, 'chest', .3], [8.6, null, .4], [9.5, 'clasp', .4], [12.9, 'joy', .2], [13.32, null, .12], [13.72, 'hug', .22]] }
  };
  const armPose = (name, T, side, m) => {
    if (name === 'hug') return hugArm(m, side);
    const p = typeof ARM[name] === 'function' ? ARM[name](T) : ARM[name]; return side === 'l' ? p.map(d => [-d[0], d[1], d[2]]) : p;
  };
  function arms(m, keys, g, T) {
    for (const side of ['r', 'l']) {
      const list = keys[side]; let i = 0;
      while (i + 1 < list.length && g >= list[i + 1][0]) i++;
      const [t0, now, blend] = list[i], prev = i > 0 ? list[i - 1][1] : null, k = blend ? ease.inOut(clamp((g - t0) / blend)) : 1;
      let pose = null, w = 1;
      if (now && prev) { const a = armPose(prev, T, side, m), b = armPose(now, T, side, m); pose = a.map((d, j) => d.map((v, n) => lerp(v, b[j][n], k))); }
      else if (now) { pose = armPose(now, T, side, m); w = k; }
      else if (prev) { pose = armPose(prev, T, side, m); w = 1 - k; }
      if (pose && w > 0) { m.aim(`upperarm.${side}`, pose[0], w); m.aim(`lowerarm.${side}`, pose[1], w); }
    }
  }

  /* where their eyes go: [from g, what they look at] (null: where the clip looks) */
  const LOOKS = {
    he: [[0, null], [2.2, 'her'], [6.75, 'left'], [7.45, 'train'], [8.75, 'photo'], [11.3, 'her'], [13.4, null]],
    she: [[0, null], [2.45, 'him'], [6.8, 'left'], [7.45, 'train'], [8.85, 'photo'], [11.4, 'him'], [13.35, null]]
  };
  const vHead = new THREE.Vector3(), vOther = new THREE.Vector3();
  const headAt = (m, v) => { m.node('head').getWorldPosition(v); return stage.worldToLocal(v); };
  function target(name, g) {
    if (!name) return null;
    if (name === 'her' || name === 'him') { const p = headAt(name === 'her' ? girl : boy, vOther); return [p.x, p.y, p.z]; }
    if (name === 'left') return [-.65, .14, TZ];
    if (name === 'train') return [Math.min(.8, trainX(g) - .3), .12, TZ];
    return [photo.root.position.x, photo.root.position.y + .13 * photo.root.scale.x, photo.root.position.z];
  }
  /** turns a head (and a little of the chest) to the point it looks at now, blending from the last one */
  function look(m, list, g) {
    let i = 0; while (i + 1 < list.length && g >= list[i + 1][0]) i++;
    const now = target(list[i][1], g), prev = i > 0 ? target(list[i - 1][1], g) : null, k = ease.smooth(clamp((g - list[i][0]) / .35));
    const at = now && prev ? now.map((v, n) => lerp(prev[n], v, k)) : now || prev, w = now && prev ? 1 : now ? k : 1 - k;
    if (!at || w <= 0) return;
    const h = headAt(m, vHead), dx = at[0] - h.x, dy = at[1] - h.y, dz = at[2] - h.z, th = m.root.rotation.y;
    const ox = dx * Math.cos(th) - dz * Math.sin(th), oz = dx * Math.sin(th) + dz * Math.cos(th);   // in its own space
    const yaw = clamp(Math.atan2(ox, oz), -1.15, 1.15), pitch = clamp(-Math.atan2(dy, Math.hypot(ox, oz)), -.55, .4);
    m.bend('chest', 0, yaw * .3, 0, w); m.bend('head', pitch * .8, yaw * .7, 0, w);
  }

  /* ── things built here ── */
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .6, ...o }));
  const shaded = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };
  const boxM = (w, h, d, m) => shaded(new THREE.Mesh(kit.keep(new THREE.BoxGeometry(w, h, d)), m));
  const cylM = (r0, r1, h, m, n = 12) => shaded(new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(r0, r1, h, n)), m));
  const painted = (w, h, draw, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ map: kit.canvasTexture(w, h, draw), roughness: .8, ...o }));
  const stripes = (a, b, n) => (c, W, H) => {
    c.fillStyle = a; c.fillRect(0, 0, W, H); c.fillStyle = b;
    for (let i = -1; i <= n; i++) { const x = i * W / n, s = W / n / 2; c.beginPath(); c.moveTo(x, H); c.lineTo(x + s, H); c.lineTo(x + s + H, 0); c.lineTo(x + H, 0); c.fill(); }
  };
  function flower(c, x, y, s, fill, eye = '#fff3b0') {               // a five-petal blossom, each petal notched at its tip
    c.save(); c.translate(x, y); c.fillStyle = fill;
    for (let i = 0; i < 5; i++) {
      c.rotate(TAU / 5); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-s * .55, -s * .35, -s * .5, -s * .95, -s * .14, -s); c.lineTo(0, -s * .82);
      c.lineTo(s * .14, -s); c.bezierCurveTo(s * .5, -s * .95, s * .55, -s * .35, 0, 0); c.fill();
    }
    c.fillStyle = eye; c.beginPath(); c.arc(0, 0, s * .2, 0, TAU); c.fill(); c.restore();
  }

  /* ── the spring sky behind it all: a painted pop-up page with a cloudy top edge; its lower part, behind the two of them,
        is a green bank so they stand out ── */
  function paintSky(c, W, H) {
    const r = seeded(77), edge = new Path2D();
    edge.moveTo(0, H); edge.lineTo(0, 118);
    for (let x = 0; x < W;) { const w = 70 + r() * 80, top = 34 + r() * 42; edge.quadraticCurveTo(x + w / 2, top, Math.min(W, x + w), 96 + r() * 34); x += w; }
    edge.lineTo(W, H); edge.closePath();
    c.save(); c.clip(edge);
    const sky = c.createLinearGradient(0, 0, 0, H * .62);
    sky.addColorStop(0, '#a9d4ff'); sky.addColorStop(.55, '#dcecff'); sky.addColorStop(1, '#ffe6ef');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    const sun = c.createRadialGradient(W * .78, H * .26, 0, W * .78, H * .26, W * .28);
    sun.addColorStop(0, 'rgba(255,250,228,.95)'); sun.addColorStop(1, 'rgba(255,250,228,0)'); c.fillStyle = sun; c.fillRect(0, 0, W, H);
    for (const [cx, cy, k] of [[170, 185, 1], [520, 150, .8], [870, 215, .9], [360, 285, .55], [700, 300, .5]]) {          // soft clouds
      c.fillStyle = 'rgba(255,255,255,.92)';
      for (const [dx, dy, rr] of [[-60, 10, 34], [-22, -12, 44], [24, -4, 40], [64, 12, 30], [0, 18, 38]]) { c.beginPath(); c.arc(cx + dx * k, cy + dy * k, rr * k, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,214,228,.5)'; c.fillRect(cx - 90 * k, cy + 22 * k, 180 * k, 10 * k);
    }
    c.lineWidth = 2.5; c.strokeStyle = 'rgba(80,70,110,.6)';                                       // a few birds
    for (const [bx, by, k] of [[300, 120, 1], [330, 140, .8], [700, 110, .9]]) { c.beginPath(); c.moveTo(bx - 9 * k, by - 4 * k); c.quadraticCurveTo(bx - 4 * k, by - 8 * k, bx, by); c.quadraticCurveTo(bx + 4 * k, by - 8 * k, bx + 9 * k, by - 4 * k); c.stroke(); }
    c.fillStyle = '#cdc6ec'; c.beginPath(); c.moveTo(0, H * .56);                                       // far hills, blue with distance
    c.bezierCurveTo(W * .2, H * .44, W * .4, H * .52, W * .55, H * .49); c.bezierCurveTo(W * .7, H * .45, W * .85, H * .5, W, H * .46); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    const hill = (x0, x1, top, n) => {                                                              // a hill of blossom
      c.fillStyle = '#b5dca9'; c.beginPath(); c.moveTo(x0, H * .66); c.bezierCurveTo(x0 + (x1 - x0) * .2, top, x0 + (x1 - x0) * .8, top, x1, H * .66); c.closePath(); c.fill();
      for (let i = 0; i < n; i++) {
        const t = r(), x = x0 + (x1 - x0) * (.08 + .84 * t), y = H * .66 - (H * .66 - top) * .75 * Math.sin(Math.PI * (.08 + .84 * t)) * (.25 + .75 * r());
        c.fillStyle = PINKS[(r() * 5) | 0]; c.beginPath(); c.arc(x, y, 6 + r() * 11, 0, TAU); c.fill();
      }
    };
    hill(-30, W * .46, H * .44, 170); hill(W * .66, W + 30, H * .48, 110);
    let x = W * .3;                                                                                 // the little town's roofs, between the hills
    while (x < W * .78) {
      const w = 38 + r() * 34, h = 26 + r() * 22, y0 = H * .64 - h, roof = ['#7d8fb8', '#d98a72', '#8fa79a', '#9d86b5', '#c97b8e'][(r() * 5) | 0];
      c.fillStyle = ['#fff8f0', '#f4ece6', '#fff1e8'][(r() * 3) | 0]; c.fillRect(x, y0, w, h + 20);
      c.fillStyle = roof; c.beginPath(); c.moveTo(x - 7, y0 + 4); c.lineTo(x + w / 2, y0 - 18 - r() * 8); c.lineTo(x + w + 7, y0 + 4); c.closePath(); c.fill();
      c.fillStyle = 'rgba(120,140,190,.6)'; for (let k = 0; k < Math.floor(w / 22); k++) c.fillRect(x + 7 + k * 20, y0 + 10, 10, 10);
      x += w + 5 + r() * 12;
    }
    c.strokeStyle = '#6d6680'; c.lineWidth = 4;                                                       // poles and wires
    for (const px of [W * .27, W * .74]) { c.beginPath(); c.moveTo(px, H * .66); c.lineTo(px, H * .36); c.stroke(); c.fillStyle = '#6d6680'; c.fillRect(px - 18, H * .38, 36, 4); }
    c.lineWidth = 1.6; c.strokeStyle = 'rgba(80,72,96,.5)';
    for (const dy of [0, 10]) { c.beginPath(); c.moveTo(-10, H * .34 + dy); c.quadraticCurveTo(W * .15, H * .41 + dy, W * .27, H * .385 + dy); c.quadraticCurveTo(W * .5, H * .44 + dy, W * .74, H * .385 + dy); c.quadraticCurveTo(W * .87, H * .42 + dy, W + 10, H * .37 + dy); c.stroke(); }
    c.fillStyle = '#5f9c63'; c.beginPath(); c.moveTo(0, H);                                          // the hedge along the line, bumpy on top
    c.lineTo(0, H * .64); for (let hx = 0; hx <= W; hx += 34) c.quadraticCurveTo(hx + 17, H * .6 - r() * 14, hx + 34, H * .64);
    c.lineTo(W, H); c.fill();
    c.fillStyle = 'rgba(40,90,50,.35)'; for (let i = 0; i < 120; i++) { c.beginPath(); c.arc(r() * W, H * .66 + r() * H * .08, 3 + r() * 5, 0, TAU); c.fill(); }
    const bank = c.createLinearGradient(0, H * .74, 0, H);                                              // and the bank under it
    bank.addColorStop(0, '#7dba78'); bank.addColorStop(1, '#6aa967'); c.fillStyle = bank; c.fillRect(0, H * .74, W, H * .26);
    for (let i = 0; i < 160; i++) {                                                                 // clover, little flowers and fallen petals
      const fx = r() * W, fy = H * .76 + r() * H * .23;
      if (r() < .3) { c.fillStyle = 'rgba(40,100,55,.5)'; c.beginPath(); c.arc(fx, fy, 4, 0, TAU); c.fill(); }
      else { c.fillStyle = r() < .25 ? '#ffffff' : PINKS[(r() * 4) | 0]; c.beginPath(); c.ellipse(fx, fy, 4.5, 2.8, r() * 3, 0, TAU); c.fill(); }
    }
    for (let i = 0; i < 70; i++) {                                                                  // petals in the air
      c.save(); c.translate(r() * W, 120 + r() * H * .45); c.rotate(r() * TAU); c.fillStyle = PINKS[(r() * 4) | 0];
      c.beginPath(); c.ellipse(0, 0, 6, 3.6, 0, 0, TAU); c.fill(); c.restore();
    }
    c.restore();
    c.lineWidth = 7; c.strokeStyle = '#ffffff'; c.stroke(edge);                                       // the paper's cut edge
  }

  /* ── the crossing: ballast, sleepers, rails, the lane and its deck ── */
  function paintGravel(c, W, H) {
    const r = seeded(51); c.fillStyle = '#a69e9b'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { c.fillStyle = ['#8c8480', '#bdb5ae', '#d3ccc4', '#7a7371', '#b3a79f'][(r() * 5) | 0]; c.beginPath(); c.ellipse(r() * W, r() * H, 1.6 + r() * 3, 1.2 + r() * 2.4, r() * 3, 0, TAU); c.fill(); }
  }
  function paintLane(c, W, H) {                                     // soft tarmac, edge lines, a stop line before each barrier, petals
    const r = seeded(91), at = z => (z + .3125) / .625 * H;
    c.fillStyle = '#bab3bd'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 1400; i++) { c.fillStyle = r() < .5 ? 'rgba(90,80,100,.2)' : 'rgba(255,255,255,.25)'; c.fillRect(r() * W, r() * H, 1.5, 1.5); }
    c.fillStyle = '#fbf8f2'; c.fillRect(W * .05, 0, W * .04, H); c.fillRect(W * .91, 0, W * .04, H);
    c.fillRect(W * .12, at(-.17) - 3, W * .76, 6); c.fillRect(W * .12, at(.122) - 3, W * .76, 6);
    for (let i = 0; i < 40; i++) { c.save(); c.translate(r() * W, r() * H); c.rotate(r() * TAU); c.fillStyle = PINKS[(r() * 5) | 0]; c.beginPath(); c.ellipse(0, 0, 3.4, 2, 0, 0, TAU); c.fill(); c.restore(); }
  }
  function paintDeck(c, W, H) {                                     // the crossing's rubber panels, the rails' grooves through them
    c.fillStyle = '#6c6873'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(30,28,36,.45)'; c.lineWidth = 2;
    for (let x = 0; x <= W; x += W / 5) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.07)'; for (let y = 4; y < H; y += 7) c.fillRect(0, y, W, 2);
    for (const z of RAIL_Z) { const y = (z - (TZ - .085)) / .17 * H; c.fillStyle = '#34313a'; c.fillRect(0, y - 4, W, 8); c.fillStyle = '#d9dde4'; c.fillRect(0, y - 1.5, W, 3); }
    c.fillStyle = '#f2c230'; c.fillRect(0, 0, W, 4); c.fillRect(0, H - 4, W, 4);
  }
  function makeTrack() {
    const ballast = boxM(1, .008, .17, painted(1024, 174, paintGravel, { roughness: 1 })); ballast.position.set(0, .004, TZ); stage.add(ballast);
    const xs = []; for (let x = -.477; x < .48; x += .0455) if (Math.abs(x) > .135) xs.push(x);
    const sleepers = new THREE.InstancedMesh(kit.keep(new THREE.BoxGeometry(.022, .006, .13)), mat('#ffffff', { roughness: .9 }), xs.length);
    xs.forEach((x, i) => { sleepers.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, .011, TZ)); sleepers.setColorAt(i, new THREE.Color(['#7d5c4a', '#86624f', '#735344'][i % 3])); });
    shaded(sleepers); stage.add(sleepers);
    const steel = mat('#8d929b', { roughness: .35, metalness: .6 }), shine = mat('#e1e5ec', { roughness: .2, metalness: .7 });
    for (const z of RAIL_Z) {
      const rail = boxM(1, .008, .006, steel); rail.position.set(0, .018, z); stage.add(rail);
      const head = boxM(1, .0015, .0064, shine); head.position.set(0, RAIL_TOP - .0006, z); stage.add(head);
    }
    const lane = shaded(new THREE.Mesh(kit.keep(new THREE.BoxGeometry(LANE * 2, .002, .625)), painted(128, 348, paintLane, { roughness: .95 })), false);
    lane.position.set(0, .001, 0); stage.add(lane);
    const deck = boxM(LANE * 2, DECK, .17, painted(256, 190, paintDeck, { roughness: .9 })); deck.position.set(0, DECK / 2, TZ); stage.add(deck);
    const ramp = new THREE.Shape(); ramp.moveTo(0, 0); ramp.lineTo(.035, DECK); ramp.lineTo(.035, 0); ramp.closePath();
    const rampGeo = kit.keep(new THREE.ExtrudeGeometry(ramp, { depth: LANE * 2, bevelEnabled: false })).rotateY(-R).translate(LANE, 0, 0);
    const rampMat = mat('#8b8590', { roughness: .95 });
    for (const s of [-1, 1]) {                                       // ramps up to the deck on both sides
      const m = shaded(new THREE.Mesh(rampGeo, rampMat), false); m.position.z = TZ + s * .12; if (s > 0) m.rotation.y = Math.PI; stage.add(m);
    }
  }

  /* a crossing signal: a striped post, the crossbuck, two red lamps lit on both faces, the arrow box and a bell */
  function makeSignal(s, arrowTex) {
    const g = new THREE.Group(); g.position.set(s.x, 0, s.z); stage.add(g);
    const white = mat('#f3f1ee', { roughness: .45 }), black = mat('#2b2a31', { roughness: .45 });
    const base = boxM(.034, .016, .034, mat('#cdc7bf', { roughness: .95 })); base.position.y = .008; g.add(base);
    const pole = cylM(.0062, .0062, .4, white); pole.position.y = .2; g.add(pole);
    const sleeve = cylM(.0082, .0082, .1, painted(128, 64, stripes('#f6c51c', '#25232b', 5), { roughness: .5 }), 14); sleeve.position.y = .066; g.add(sleeve);
    const crossMat = painted(256, 48, (c, W, H) => { stripes('#f6c51c', '#25232b', 7)(c, W, H); c.strokeStyle = '#25232b'; c.lineWidth = 8; c.strokeRect(0, 0, W, H); }, { roughness: .5 });
    for (const a of [.6, -.6]) { const b = boxM(.122, .021, .005, crossMat); b.position.set(0, .372, .009); b.rotation.z = a; g.add(b); }
    const bar = boxM(.106, .011, .011, black); bar.position.y = .29; g.add(bar);
    const hood = kit.keep(new THREE.CylinderGeometry(.0145, .0145, .012, 14, 1, true, R, Math.PI)).rotateX(R);
    const lamps = [-1, 1].map(side => {
      const head = new THREE.Group(); head.position.set(side * .043, .29, 0); g.add(head);
      const disc = cylM(.021, .021, .007, black, 20); disc.rotation.x = R; head.add(disc);
      const lens = kit.keep(new THREE.MeshStandardMaterial({ color: '#6e1414', emissive: '#ff2a1a', emissiveIntensity: .1, roughness: .3 }));
      for (const f of [1, -1]) {
        const l = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.0128, .0128, .003, 18)), lens); l.rotation.x = R; l.position.z = f * .0045; head.add(l);
        const h = new THREE.Mesh(hood, black); h.position.z = f * .011; head.add(h);
      }
      const glow = kit.glow({ color: 0xff3a2c, size: .08, opacity: 0 }); glow.position.set(side * .043, .29, .016); g.add(glow);
      return { lens, glow };
    });
    const arrowMat = kit.keep(new THREE.MeshStandardMaterial({ map: arrowTex, emissive: '#ffffff', emissiveMap: arrowTex, emissiveIntensity: 0, roughness: .4 }));
    const arrow = boxM(.05, .02, .01, [black, black, black, black, arrowMat, arrowMat]); arrow.position.y = .26; g.add(arrow);
    const bell = shaded(new THREE.Mesh(kit.keep(new THREE.SphereGeometry(.013, 14, 8, 0, TAU, 0, R)), black)); bell.position.y = .4; g.add(bell);
    return { root: g, lamps, arrowMat };
  }
  function paintArrow(c, W, H) {                                    // the arrow box: which way the train is coming
    c.fillStyle = '#1b1a20'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(W * .2, H * .38); c.lineTo(W * .58, H * .38); c.lineTo(W * .58, H * .18); c.lineTo(W * .84, H * .5);
    c.lineTo(W * .58, H * .82); c.lineTo(W * .58, H * .62); c.lineTo(W * .2, H * .62); c.closePath(); c.fill();
  }

  /* a barrier: a yellow box with an arm striped yellow and black that swings down across the lane */
  function makeGate(s) {
    const g = new THREE.Group(); g.position.set(s.x, 0, s.z); stage.add(g);
    const yellow = mat('#f4c021', { roughness: .45 }), black = mat('#2b2a31', { roughness: .45 });
    const housing = boxM(.036, BAR + .012, .034, yellow); housing.position.y = (BAR + .012) / 2; g.add(housing);
    const band = boxM(.0372, .012, .0352, black); band.position.y = BAR - .014; g.add(band);
    const top = boxM(.04, .006, .038, black); top.position.y = BAR + .015; g.add(top);
    const pivot = new THREE.Group(); pivot.position.set(s.dir * .02, BAR, .0); g.add(pivot);
    const arm = boxM(.27, .009, .007, painted(512, 24, stripes('#f6c51c', '#25232b', 14), { roughness: .5 })); arm.position.x = s.dir * .135; pivot.add(arm);
    const lamp = mat('#e8332f', { emissive: '#ff3020', emissiveIntensity: .3 });
    const tip = boxM(.012, .011, .0085, lamp); tip.position.x = s.dir * .266; pivot.add(tip);
    const weight = boxM(.026, .018, .014, black); weight.position.x = -s.dir * .016; pivot.add(weight);
    return { root: g, pivot, dir: s.dir, lamp };
  }

  /* a cherry tree: a leaning trunk, branches, a crown of pink puffs dotted with blossoms that sways (petals fall from it) */
  let blossomTex = null;
  function paintBlossoms(c, W, H) {                                 // a puff close up: little five-petal flowers packed on pink
    const r = seeded(5); c.fillStyle = '#f7a8c4'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 300; i++) flower(c, r() * W, r() * H, 4 + r() * 6, ['#ffffff', '#ffe6ee', '#ffcadb', '#ff9dbf'][(r() * 4) | 0], r() < .5 ? '#e0568a' : '#fff0a0');
  }
  function makeTree(t) {
    const g = new THREE.Group(); g.position.set(t.x, 0, t.z); stage.add(g);
    const r = seeded(t.seed * 97 + 11), bark = mat('#6e4b3e', { roughness: .9 }), UP = new THREE.Vector3(0, 1, 0);
    const limb = (a, b, r0, r1) => {
      const m = cylM(r1, r0, a.distanceTo(b), bark, 8); m.position.copy(a).add(b).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize()); g.add(m);
    };
    const lean = t.x < 0 ? 1 : -1, mid = new THREE.Vector3(lean * .02, t.h * .32, .005), top = new THREE.Vector3(lean * .045, t.h * .6, 0);
    limb(new THREE.Vector3(0, 0, 0), mid, .024, .017); limb(mid, top, .017, .012);
    const crown = new THREE.Group(); crown.position.copy(top); g.add(crown);
    const tips = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + r() * .6, tip = new THREE.Vector3(Math.cos(a) * (.08 + r() * .05), .05 + r() * .07, Math.sin(a) * .035);
      limb(top, top.clone().add(tip), .009, .004); tips.push(tip);
    }
    const puff = kit.keep(new THREE.IcosahedronGeometry(1, 2)), bud = kit.keep(new THREE.IcosahedronGeometry(1, 0));
    const tints = ['#ff9cc0', '#ffb3cf', '#ffc8da', '#ffdbe7', '#ffffff'];   // deeper inside, paler where the light falls
    const P = 40, puffs = [], spots = [], mI = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion();
    const cloud = shaded(new THREE.InstancedMesh(puff, mat('#ffffff', { map: blossomTex, roughness: .85, emissive: '#ffc2d6', emissiveIntensity: .1 }), P));
    for (let i = 0; i < P; i++) {                                  // one draw for the whole crown
      const tip = tips[i % tips.length], k = .024 + r() * .028;
      const p = tip.clone().add(new THREE.Vector3((r() - .5) * .13, (r() - .3) * .09, (r() - .5) * .06)), size = new THREE.Vector3(k, k * .88, k * .8);
      const out = clamp((p.y - .02) / .12 + (r() - .5) * .5);
      cloud.setMatrixAt(i, mI.compose(p, q, size)); cloud.setColorAt(i, new THREE.Color(tints[Math.min(4, Math.floor(out * 5))]));
      puffs.push({ position: p, scale: size }); spots.push(p.clone().add(top).add(g.position));
    }
    cloud.instanceColor.needsUpdate = true; crown.add(cloud);
    const N = 80, flowers = new THREE.InstancedMesh(bud, mat('#ffffff', { roughness: .7, emissive: '#ffffff', emissiveIntensity: .2 }), N);
    for (let i = 0; i < N; i++) {                                  // single blossoms on the puffs' outsides: white, deep pink, a few gold
      const pf = puffs[(r() * puffs.length) | 0]; v.set(r() - .5, r() * .9 - .2, r() - .2).normalize();
      const at = pf.position.clone().add(v.multiply(pf.scale).multiplyScalar(.96));
      flowers.setMatrixAt(i, mI.compose(at, q, new THREE.Vector3(1, .7, 1).multiplyScalar(.006 + r() * .004)));
      flowers.setColorAt(i, new THREE.Color(r() < .55 ? '#ffffff' : r() < .8 ? '#ff7fa8' : '#fff1a8'));
    }
    flowers.instanceColor.needsUpdate = true; crown.add(flowers);
    g.scale.setScalar(.001);
    const front = spots.filter(p => p.z > sky.userData.zAt(p.x) + .015);   // petals fall from the puffs in front of the sky page
    return { root: g, crown, spots: front.length ? front : spots, seed: t.seed };
  }

  /* ── the little train: three cars, cream over rose, lit windows and someone at a few of them. It is drawn only over the
        card: past the card's left and right edges a fragment is thrown away, so the train slides in and out at the edges ── */
  const toStage = { value: new THREE.Matrix4() };
  function clipped(m) {
    m.onBeforeCompile = sh => {
      sh.uniforms.uToStage = toStage;
      sh.vertexShader = `uniform mat4 uToStage;\nvarying float vStageX;\n${sh.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\n  vStageX = (uToStage * modelMatrix * vec4(transformed, 1.0)).x;')}`;
      sh.fragmentShader = `varying float vStageX;\n${sh.fragmentShader.replace('void main() {', 'void main() {\n  if (abs(vStageX) > .5) discard;')}`;
    };
    return kit.keep(m);
  }
  const PASSENGERS = [[0, .3, '#7a5a6a'], [2, .62, '#5a6a8a'], [2, .3, '#9a6a5a'], [4, .45, '#6a5a7a']];   // [window, where, colour]
  const CREAM = '#fff5e6', ROSE = '#ee7ea2', DEEP = '#d4587f';
  function paintSide(c, W, H, lit) {                                // a car's side: cream over rose, three windows, two doors
    const rr = (x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
    c.fillStyle = lit ? '#000' : CREAM; c.fillRect(0, 0, W, H);
    if (!lit) {
      c.fillStyle = ROSE; c.fillRect(0, H * .58, W, H * .42); c.fillStyle = DEEP; c.fillRect(0, H * .9, W, H * .1);
      c.fillStyle = '#ffffff'; c.fillRect(0, H * .555, W, H * .025);
    }
    const spans = [[.03, .22, 'w'], [.255, .375, 'd'], [.41, .59, 'w'], [.625, .745, 'd'], [.78, .97, 'w']];
    spans.forEach(([a, b, kind], i) => {
      const x = a * W, w = (b - a) * W;
      if (kind === 'd') {                                            // a door, split down the middle, a window in each half
        if (!lit) { c.strokeStyle = 'rgba(80,60,80,.45)'; c.lineWidth = 3; rr(x, H * .08, w, H * .82, 6); c.stroke(); c.beginPath(); c.moveTo(x + w / 2, H * .08); c.lineTo(x + w / 2, H * .9); c.stroke(); }
        for (const k of [0, 1]) {
          if (!lit) { c.fillStyle = '#3a4560'; rr(x + 3 + k * w / 2, H * .12, w / 2 - 6, H * .34, 6); c.fill(); }
          c.fillStyle = lit ? '#a8843f' : '#ffe6a8'; rr(x + 6 + k * w / 2, H * .14, w / 2 - 12, H * .3, 4); c.fill();
        }
        return;
      }
      if (!lit) { c.fillStyle = '#3a4560'; rr(x - 5, H * .09 - 5, w + 10, H * .4 + 10, 16); c.fill(); }
      const gl = c.createLinearGradient(0, H * .09, 0, H * .49); gl.addColorStop(0, '#fff6d2'); gl.addColorStop(1, '#ffcd80');
      c.fillStyle = gl; rr(x, H * .09, w, H * .4, 12); c.fill();
      for (const [win, at, col] of PASSENGERS) if (win === i) {   // someone sitting by the window
        c.fillStyle = lit ? '#000' : col; c.beginPath(); c.arc(x + w * at, H * .3, H * .075, 0, TAU); c.fill();
        rr(x + w * at - H * .1, H * .37, H * .2, H * .14, 12); c.fill();
      }
      if (!lit) { c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(x + w * .1, H * .12); c.lineTo(x + w * .32, H * .12); c.lineTo(x + w * .1, H * .36); c.fill(); }
    });
    if (!lit) { flower(c, W * .5, H * .74, H * .08, '#ffffff', '#ffd2e0'); flower(c, W * .9, H * .74, H * .05, '#ffffff', '#ffd2e0'); flower(c, W * .1, H * .74, H * .05, '#ffffff', '#ffd2e0'); }
  }
  function paintFace(c, W, H, lit, tail) {                          // a cab's face: the destination board, a windscreen, two lamps
    c.clearRect(0, 0, W, H);
    c.beginPath(); c.roundRect(0, 0, W, H, [8, 8, 34, 34]); c.fillStyle = lit ? '#000' : CREAM; c.fill();
    if (!lit) {
      c.save(); c.clip();
      c.fillStyle = ROSE; c.fillRect(0, H * .58, W, H * .42); c.fillStyle = DEEP; c.fillRect(0, H * .9, W, H * .1); c.fillStyle = '#ffffff'; c.fillRect(0, H * .555, W, H * .025);
      c.restore();
      c.fillStyle = '#3a4560'; c.beginPath(); c.roundRect(W * .07, H * .155, W * .86, H * .37, 20); c.fill();
      const gw = c.createLinearGradient(0, H * .17, 0, H * .51); gw.addColorStop(0, '#24345a'); gw.addColorStop(1, '#55779f');
      c.fillStyle = gw; c.beginPath(); c.roundRect(W * .1, H * .175, W * .8, H * .33, 16); c.fill();
      c.fillStyle = 'rgba(255,255,255,.42)'; c.beginPath(); c.moveTo(W * .2, H * .19); c.lineTo(W * .42, H * .19); c.lineTo(W * .24, H * .49); c.lineTo(W * .14, H * .49); c.fill();
    }
    c.fillStyle = '#1d1b26'; c.beginPath(); c.roundRect(W * .14, H * .03, W * .72, H * .1, 8); c.fill();
    c.fillStyle = '#ffb347'; c.font = `700 ${Math.round(H * .068)}px "Be Vietnam Pro", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Ga Gặp Lại', W / 2, H * .082);
    for (const s of [-1, 1]) {
      if (!lit) { c.fillStyle = '#e9e6ee'; c.beginPath(); c.arc(W / 2 + s * W * .3, H * .72, W * .095, 0, TAU); c.fill(); }
      c.fillStyle = tail ? '#ff4040' : '#fffbea'; c.beginPath(); c.arc(W / 2 + s * W * .3, H * .72, W * .068, 0, TAU); c.fill();
    }
    if (!lit) flower(c, W / 2, H * .72, W * .08, '#ffffff', '#ffd2e0');
  }
  function makeTrain() {
    const root = new THREE.Group(); root.position.z = TZ; stage.add(root);
    const L = TRAIN.len, W = .118, Y0 = .036, Y1 = .192, Y2 = .217, BT = .008, BS = .005, hw = W / 2;
    const depth = clipped(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
    const body = clipped(new THREE.MeshStandardMaterial({ color: CREAM, roughness: .45, metalness: .05 }));
    const dark = clipped(new THREE.MeshStandardMaterial({ color: '#4a4652', roughness: .55, metalness: .35 }));
    const grey = clipped(new THREE.MeshStandardMaterial({ color: '#d7d4db', roughness: .5, metalness: .2 }));
    const tex = (w, h, draw) => kit.canvasTexture(w, h, draw);
    const side = clipped(new THREE.MeshStandardMaterial({ map: tex(512, 392, (c, w, h) => paintSide(c, w, h, false)), emissive: '#ffffff',
      emissiveMap: tex(512, 392, (c, w, h) => paintSide(c, w, h, true)), emissiveIntensity: .85, roughness: .45 }));
    const face = tail => clipped(new THREE.MeshStandardMaterial({ map: tex(256, 336, (c, w, h) => paintFace(c, w, h, false, tail)), emissive: '#ffffff',
      emissiveMap: tex(256, 336, (c, w, h) => paintFace(c, w, h, true, tail)), emissiveIntensity: 1, roughness: .35, alphaTest: .5 }));
    const shape = new THREE.Shape(), r = .012;                        // the cross-section: straight sides, a rounded roof
    shape.moveTo(-hw + r, Y0); shape.lineTo(hw - r, Y0); shape.quadraticCurveTo(hw, Y0, hw, Y0 + r); shape.lineTo(hw, Y1);
    shape.bezierCurveTo(hw, Y2 - .004, hw * .45, Y2, 0, Y2); shape.bezierCurveTo(-hw * .45, Y2, -hw, Y2 - .004, -hw, Y1);
    shape.lineTo(-hw, Y0 + r); shape.quadraticCurveTo(-hw, Y0, -hw + r, Y0);
    const shell = kit.keep(new THREE.ExtrudeGeometry(shape, { depth: L - 2 * BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelSegments: 3, curveSegments: 8 }));
    shell.translate(0, 0, -(L - 2 * BT) / 2).rotateY(R);
    const geo = {
      side: kit.keep(new THREE.PlaneGeometry(L - .024, Y1 - Y0 - .006)), face: kit.keep(new THREE.PlaneGeometry(W - .004, Y1 - Y0 - .006)),
      wheel: kit.keep(new THREE.CylinderGeometry(.0125, .0125, .006, 14)).rotateX(R), bogie: kit.keep(new THREE.BoxGeometry(.05, .014, .084)),
      under: kit.keep(new THREE.BoxGeometry(.08, .01, .07)), cooler: kit.keep(new THREE.BoxGeometry(.08, .013, .052)), gang: kit.keep(new THREE.BoxGeometry(.02, .13, .088))
    };
    const part = (g, m, parent, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; o.customDepthMaterial = depth; parent.add(o); return o; };
    const wheels = [];
    for (let i = 0; i < 3; i++) {
      const car = new THREE.Group(); car.position.x = -L / 2 - i * (L + TRAIN.gap); root.add(car);
      part(shell, body, car, 0, 0, 0);
      for (const s of [1, -1]) part(geo.side, side, car, 0, (Y0 + Y1) / 2, s * (hw + BS + .0007)).rotation.y = s > 0 ? 0 : Math.PI;
      if (i !== 1) part(geo.face, face(i === 2), car, (i ? -1 : 1) * (L / 2 + .0007), (Y0 + Y1) / 2, 0).rotation.y = i ? -R : R;
      part(geo.cooler, grey, car, 0, Y2 + .004, 0); part(geo.under, dark, car, 0, .031, 0);
      for (const bx of [-.07, .07]) {
        part(geo.bogie, dark, car, bx, .03, 0);
        for (const wx of [-.02, .02]) for (const wz of RAIL_Z) wheels.push(part(geo.wheel, dark, car, bx + wx, RAIL_TOP + .0125, wz - TZ));
      }
      if (i < 2) part(geo.gang, dark, car, -L / 2 - TRAIN.gap / 2, .11, 0);
    }
    return { root, wheels };
  }

  /* ── petals: one cupped petal shape, notched at its tip, for the whirl, the heart and the ones lying on the card ── */
  function makePetal() {
    const s = new THREE.Shape();
    s.moveTo(0, -.5); s.bezierCurveTo(.3, -.34, .5, .08, .36, .38); s.quadraticCurveTo(.24, .52, .08, .44); s.lineTo(0, .34);
    s.lineTo(-.08, .44); s.quadraticCurveTo(-.24, .52, -.36, .38); s.bezierCurveTo(-.5, .08, -.3, -.34, 0, -.5);
    const geo = new THREE.ShapeGeometry(s, 5), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, .32 * x * x + .1 * (y + .5) ** 2); }
    geo.computeVertexNormals();
    petalGeo = kit.keep(geo);
    petalMat = mat('#ffffff', { side: THREE.DoubleSide, roughness: .65, emissive: '#ff9fbe', emissiveIntensity: .14 });
  }
  function makeCarpet() {                                           // petals fallen on the card, thicker under the trees
    const N = 190, mesh = new THREE.InstancedMesh(petalGeo, petalMat, N), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0, n = 0; n < N && i < 5000; i++) {
      const t = TREES[i % 2], near = rand() < .4;
      const x = near ? t.x + (rand() - .5) * .3 : (rand() - .5) * .97, z = near ? t.z + .04 + (rand() - .5) * .14 : (rand() - .5) * .6;
      if (Math.abs(z - TZ) < .088 && Math.abs(x) > LANE) continue;   // not on the rails
      const y = Math.abs(x) < LANE ? ground(z) + .0012 : Math.abs(z - TZ) < .09 ? .0092 : .0012;
      e.set(-R + (rand() - .5) * .3, 0, rand() * TAU); q.setFromEuler(e);
      mesh.setMatrixAt(n, m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3().setScalar(.011 + rand() * .006)));
      mesh.setColorAt(n++, new THREE.Color(PINKS[(rand() * PINKS.length) | 0]));
    }
    mesh.instanceColor.needsUpdate = true; mesh.receiveShadow = true; stage.add(mesh);
  }
  /* the petals that whirl up behind the train, and rise round the two of them to make a heart (the first 130 of them) */
  function makeStorm() {
    const N = 170, bright = mat('#ffffff', { side: THREE.DoubleSide, roughness: .6, emissive: '#ff8fb4', emissiveIntensity: .32 });
    const mesh = new THREE.InstancedMesh(petalGeo, bright, N); mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const tints = ['#ff6f9a', '#ff8fb4', '#ffa6c4', '#ff7aa6', '#ffbcd2', '#ffe0ea'], list = [];
    for (let i = 0; i < N; i++) {
      const ring = i < 70 ? 1 : i < 106 ? .62 : .28, t = i < 70 ? i / 70 * TAU : i < 106 ? (i - 70) / 36 * TAU : (i - 106) / 24 * TAU;
      const hx = 16 * Math.sin(t) ** 3, hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      list.push({ heart: i < 130, tx: HEART.x + hx / 16 * HEART.w * ring, ty: HEART.y + (hy + 2.5) / 16 * HEART.w * ring, tz: HEART.z + (rand() - .5) * .012,
        a0: rand() * TAU, r0: .05 + rand() * .11, h: rand(), d: rand(), spin: rand() * TAU, size: .02 + rand() * .01 });
      mesh.setColorAt(i, new THREE.Color(tints[(rand() * tints.length) | 0]));
    }
    mesh.instanceColor.needsUpdate = true; stage.add(mesh);
    return { mesh, list };
  }
  const mI = new THREE.Matrix4(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), eI = new THREE.Euler();
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vS = new THREE.Vector3();
  function poseStorm(g, T) {
    const { mesh, list } = storm, whirl = g > 8 && g < 10.9, heart = g > 14.9;
    mesh.visible = whirl || heart; if (!mesh.visible) return;
    const breathe = 1 + .04 * Math.sin(T * 3.2);
    list.forEach((p, i) => {
      let s;
      if (whirl) {                                                   // swept in behind the last car, round and up, then let go
        const k = seg(g, 8.02 + p.d * .4, 9.85 + p.d * .7);
        if (k <= 0 || k >= 1) { mesh.setMatrixAt(i, ZERO); return; }
        const a = p.a0 + 11 * k + 5 * k * k, r = p.r0 * (.5 + 1.1 * k), go = ease.in(seg(k, .72, 1)), come = 1 - ease.out(seg(k, 0, .28));
        vA.set(.02 + .05 * k + Math.cos(a) * r * (1 + 1.4 * go) - .38 * come, .02 + (.24 + .6 * p.h) * ease.out(k) - .1 * go, TZ + Math.sin(a) * r * .75 * (1 + go));
        qA.setFromEuler(eI.set(g * 5 + p.spin, g * 4 + p.spin * 2, g * 3));
        s = p.size * ease.out(seg(k, 0, .1)) * (1 - go);
      } else {                                                       // round the two of them, up, and into the heart
        if (!p.heart) { mesh.setMatrixAt(i, ZERO); return; }
        const k1 = seg(g, 14.95 + p.d * .4, 16.3 + p.d * .4), k2 = ease.inOut(seg(g, 16.05 + p.d * .45, 16.85 + p.d * .45));
        if (k1 <= 0) { mesh.setMatrixAt(i, ZERO); return; }
        const a = p.a0 + 6 * k1 + 1.4 * Math.max(0, g - 16.3 - p.d * .4), r = lerp(.21 + .06 * p.h, .12 + .05 * p.h, k1);
        vA.set(Math.cos(a) * r, lerp(.015, .14 + .3 * p.h, ease.out(k1)), TZ + Math.sin(a) * r * .8);
        vB.set(HEART.x + (p.tx - HEART.x) * breathe, HEART.y + (p.ty - HEART.y) * breathe, p.tz); vA.lerp(vB, k2);
        qA.setFromEuler(eI.set(g * 4 + p.spin, g * 3 + p.spin * 2, g * 2));
        qB.setFromEuler(eI.set(.15 * Math.sin(T * 2 + p.spin), .3 * Math.sin(T * 1.7 + p.spin), p.spin)); qA.slerp(qB, k2);
        s = p.size * .9 * ease.out(seg(k1, 0, .15));
      }
      mesh.setMatrixAt(i, mI.compose(vA, qA, vS.setScalar(Math.max(1e-5, s))));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  /* ── what moves ── */
  function poseScenery(g, T) {
    const fold = ease.inOut(seg(g, .05, .8)), wob = g > .8 ? Math.exp(-6 * (g - .8)) * Math.sin(14 * (g - .8)) : 0;
    sky.rotation.x = -R * (1 - fold) + .1 * wob;                      // the sky folds up from behind the card like a pop-up page
    const gust = bump(g, 7.3, 7.6, 8.4, 9.2);
    trees.forEach((t, i) => {
      t.root.scale.setScalar(Math.max(.001, ease.back(seg(g, TREES[i].pop, TREES[i].pop + .5))));
      t.crown.rotation.set(.02 * Math.sin(T * 1.1 + i), 0, .025 * Math.sin(T * 1.3 + t.seed) - .09 * gust * (1 + .3 * Math.sin(T * 9 + i)));
    });
    const blinking = seg(g, 3.6, 3.7) * (1 - seg(g, 12.42, 12.55)), s = Math.sin(TAU * T * .9);   // the lamps take turns
    signals.forEach(sg => sg.lamps.forEach((l, j) => {
      const on = blinking * ease.smooth(clamp((j ? -s : s) * 3 + .5));
      l.lens.emissiveIntensity = .1 + 2.8 * on; l.glow.material.opacity = .95 * on;
    }));
    const arrow = seg(g, 6.5, 6.6) * (1 - seg(g, 12.4, 12.5)) * (.75 + .25 * Math.sin(T * 7));
    signals.forEach(sg => { sg.arrowMat.emissiveIntensity = 1.6 * arrow; });
    const down = ease.in(seg(g, 3.75, 4.4)), bounce = g > 4.4 ? .1 * Math.exp(-7 * (g - 4.4)) * Math.abs(Math.sin(13 * (g - 4.4))) : 0;
    const up = ease.back(seg(g, 12.62, 13.2));
    gates.forEach((gt, i) => { gt.lamp.emissiveIntensity = .3 + 1.6 * blinking * ease.smooth(clamp((i ? -s : s) * 3 + .5)); });
    gates.forEach((gt, i) => { gt.pivot.rotation.z = gt.dir * R * clamp(1 - (down - bounce) * (1 - up), -.06, 1.06) + .006 * Math.sin(T * 3 + i) * down * (1 - up); });
  }
  function poseTrain(g) {
    const x = trainX(g);
    train.root.visible = x > -.5 && x - TAIL < .5;
    if (!train.root.visible) return;
    train.root.position.set(x, .0015 * Math.abs(Math.sin(g * 47)), TZ); train.root.rotation.x = .008 * Math.sin(g * 31);
    const turn = -(x + .5) / .0125;                                  // the wheels roll as far as the train goes
    train.wheels.forEach(w => { w.rotation.z = turn; });
  }
  function poseCouple(g, T) {
    let [bx, bz, br] = wayAt(HE_WAY, g), [gx, gz, gr] = wayAt(SHE_WAY, g), gy = 0;
    if (g > 13.86) {                                                // he swings her round the middle of the crossing; then they sway
      const phi = FACE_HE + SPIN * ease.smooth(seg(g, 13.86, 15.1)) + .05 * Math.sin(T * 2) * ease.smooth(seg(g, 17.6, 18.4));
      const ux = Math.sin(phi), uz = Math.cos(phi);
      bx = -HUG * ux; bz = TZ - HUG * uz; gx = HUG * ux; gz = TZ + HUG * uz; br = phi; gr = phi + Math.PI;
      gy = .028 * Math.sin(Math.PI * seg(g, 13.9, 14.95));            // off her feet for a moment
    }
    const by = .016 * Math.sin(Math.PI * seg(g, 3.3, 3.55)) + .03 * Math.sin(Math.PI * seg(g, 13.02, 13.32));   // a start; a hop for joy
    gy += .03 * Math.sin(Math.PI * seg(g, 12.98, 13.28));
    const open = ease.smooth(seg(g, 14.95, 15.6));                     // the hug opens a little towards the phone, so both faces show
    boy.root.position.set(bx, ground(bz) + by, bz); girl.root.position.set(gx, ground(gz) + gy, gz);
    boy.root.rotation.y = br + .3 * open; girl.root.rotation.y = gr - .42 * open;
    const bc = clipAt(HE_CLIPS, g), gc = clipAt(SHE_CLIPS, g);
    boy.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);
    const hold = ease.inOut(clamp((g - 13.72) / .22));               // in the hug he leans in a little, so his hands reach her back
    if (hold) { boy.bend('Spine02', .08, 0, 0, hold); boy.bend('spine', .08, 0, 0, hold); }
    arms(boy, ARMS.he, g, T); arms(girl, ARMS.she, g, T);
    const wind = bump(g, 7.38, 7.55, 8.35, 8.8);                     // leaning back from the train's wind
    if (wind) for (const m of [boy, girl]) { m.bend('spine', -.1, 0, 0, wind); m.bend('chest', -.08, 0, 0, wind); m.bend('head', -.06, 0, 0, wind); }   // (the rig's "chest" is only the top of its back)
    const shy = bump(g, 3.2, 3.5, 6.6, 7) * (1 + .25 * Math.sin(T * 1.7));
    if (shy) girl.bend('head', .08, 0, .2, shy);
    look(boy, LOOKS.he, g); look(girl, LOOKS.she, g);
    const lean = ease.smooth(seg(g, 14.95, 15.6));                    // in the hug: heads together, her foot up behind her
    if (lean) {
      girl.bend('head', .05, 0, .2, lean); boy.bend('head', .05, 0, -.14, lean);
      girl.aim('upperleg.r', [0, -1, -.14], lean); girl.aim('lowerleg.r', [0, .5 + .12 * Math.sin(T * 2.4), -.86], lean);   // the shin up behind her: flat, it reads as a kneel
    }
  }
  function poseWords(g, T) {
    const n = ease.back(seg(g, 5.15, 5.85)) * (1 - ease.in(seg(g, 6.45, 6.95)));
    note.root.scale.setScalar(Math.max(.001, n));
    note.root.position.set(0, .54 + .1 * seg(g, 6.45, 6.95) + .008 * Math.sin(T * 1.6), .03);
    note.root.rotation.set(-.12, 0, .035 * Math.sin(T * .9));
    /* the photo: out of the whirl's top, fluttering down like a petal, then floating; aside at the end */
    const fall = seg(g, 8.85, 10.45), flutter = (1 - fall) * Math.sin(fall * 3 * Math.PI), aside = ease.inOut(seg(g, 12.5, 13.15));
    const grow = g < 8.85 ? 0 : lerp(.3, 1, ease.out(seg(g, 8.85, 9.9)));
    photo.root.scale.setScalar(Math.max(.001, grow * lerp(1, ASIDE.s, aside)));
    photo.root.position.set(lerp(PHOTO.x + .07 * flutter, ASIDE.x, aside), lerp(lerp(.8, PHOTO.y, ease.out(fall)) + .007 * Math.sin(T * 1.3), ASIDE.y, aside),
      lerp(PHOTO.z, ASIDE.z, aside));
    photo.root.rotation.set(-.08, lerp(.4 * flutter + .08 * Math.sin(T * .8), .25, aside), lerp(.3 * flutter + .04 * Math.sin(T * .6), .06, aside));
    halo.material.opacity = .5 * ease.out(seg(g, 10.1, 10.8)) * (1 - .5 * aside) * (1 + .08 * Math.sin(T * 3));
    const b = ease.elastic(seg(g, 16.6, 17.6));
    banner.root.scale.setScalar(Math.max(.001, b));
    banner.root.position.set(0, .65 + .006 * Math.sin(T * 1.5), .05);
    banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
  }

  /* ── particles: petals drifting down all the time, gusts, sparkles, hearts and the bell's notes ── */
  function emitPetal(x, y, z, o = {}) {
    fall.emit({ x, y, z, vx: o.vx ?? .02 + rng() * .03, vy: o.vy ?? -.05 - rng() * .03, vz: o.vz ?? (rng() - .5) * .02, drag: o.drag ?? 0, sway: o.sway ?? .02 + rng() * .025,
      spin: (rng() - .5) * (o.spin ?? 5), color: PINKS[(rng() * PINKS.length) | 0], size: .013 + rng() * .007, life: o.life ?? 6 + rng() * 3, shape: 'petal', floor: .004 });
  }
  function effects(g, T, dt, held) {
    if (!dt) return;
    if (kit.once('air')) for (let i = 0; i < 40; i++) emitPetal((rng() - .5) * .95, .08 + rng() * .62, -.27 + rng() * .52, { life: 3 + rng() * 6 });   // already falling
    const rate = 6 + 4 * bump(g, 16.6, 17, 17.8, 18.4);
    if (rng() < dt * rate) {                                         // from a tree's crown, or from the sky
      const t = trees[(rng() * 2) | 0];
      if (rng() < .55 && t.root.scale.x > .9) { const p = t.spots[(rng() * t.spots.length) | 0]; emitPetal(p.x, p.y, p.z); }
      else emitPetal((rng() - .5) * 1, .62 + rng() * .1, -.25 + rng() * .5);
    }
    if (g > 3.3 && kit.once('notice')) {                             // they see each other: a sparkle at each head, a heart between
      for (const m of [boy, girl]) { const h = headAt(m, vHead); sparks.burst(9, i => { const a = i / 9 * TAU; return { x: h.x + Math.cos(a) * .05, y: h.y + .06 + Math.sin(a) * .04, z: h.z,
        vx: Math.cos(a) * .08, vy: Math.sin(a) * .08, drag: 2, color: i % 2 ? '#fff1b8' : '#ffd1e0', size: .016, life: .7, shape: i % 2 ? 'sparkle' : 'glow', spin: 3 }; }); }
      bits.burst(3, i => ({ x: (i - 1) * .035, y: .36, z: TZ, vx: (i - 1) * .02, vy: .07 + i * .015, sway: .02, color: ['#ff6f91', '#ff8fab', '#ff4f7b'][i], size: .03 - i * .005, life: 2, shape: 'heart' }));
    }
    const blinking = g > 3.65 && g < 12.45;
    if (blinking && kit.once(`ding${Math.floor(T * 1.8)}`)) {     // the bell rings with the lamps
      const s = SIGNALS[Math.floor(T * 1.8) % 2];
      bits.emit({ x: s.x + (rng() - .5) * .02, y: .42, z: s.z, vx: (rng() - .5) * .04, vy: .09, sway: .02, color: rng() < .5 ? '#d23c55' : '#7a5ab8', size: .026, life: 1.3, shape: 'note', rot: (rng() - .5) * .5 });
    }
    if (g > 7.15 && g < 7.45) for (const z of RAIL_Z) {           // the rails sing before the train comes
      sparks.emit({ x: lerp(-.5, .5, seg(g, 7.15, 7.45)), y: RAIL_TOP + .004, z, color: '#fff6d8', size: .014, life: .35, shape: 'sparkle', spin: 4 });
    }
    if (g > 7.25 && kit.once('gust')) for (let i = 0; i < 36; i++) emitPetal(-.55 + rng() * .1, .05 + rng() * .35, -.25 + rng() * .5,
      { vx: .45 + rng() * .35, vy: -.02 + rng() * .08, drag: .6, sway: .04, spin: 8, life: 2.5 + rng() });
    if (train.root.visible) for (let i = 0; i < 4; i++) {           // petals thrown up in its wake, and a veil of them along its far side
      const tail = trainX(g) - TAIL, along = Math.max(-.5, tail) + rng() * (Math.min(.5, trainX(g)) - Math.max(-.5, tail));
      if (tail > -.55 && tail < .5) emitPetal(tail - rng() * .03, .03 + rng() * .17, TZ + (rng() < .5 ? -1 : 1) * (.05 + rng() * .04),
        { vx: .5 + rng() * .6, vy: .03 + rng() * .14, vz: (rng() - .5) * .25, drag: 1.4, sway: .03, spin: 9, life: 1.8 + rng() * .6 });
      emitPetal(along, .06 + rng() * .26, TZ - .075 - rng() * .07, { vx: .35 + rng() * .5, vy: .02 + rng() * .08, vz: -.03, drag: 1.2, sway: .03, spin: 8, life: 1.4 + rng() * .6 });
    }
    if (g > 10.4 && g < 12.4 && rng() < dt * 5) {                   // sparkles round the photo
      const a = rng() * TAU, p = photo.root.position, s = photo.root.scale.x;
      sparks.emit({ x: p.x + Math.cos(a) * .14 * s, y: p.y + .135 * s + Math.sin(a) * .16 * s, z: p.z + .01, color: '#fff1b8', size: .018, life: 1, shape: 'sparkle', spin: 3 });
    }
    if (g > 15.4 && kit.once('hug')) bits.burst(22, () => ({ x: (rng() - .5) * .06, y: .3, z: TZ, vx: (rng() - .5) * .4, vy: .14 + rng() * .25, vz: (rng() - .5) * .2,
      gravity: -.2, drag: .9, color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .022 + rng() * .02, life: 2.4, shape: 'heart', spin: (rng() - .5) * 4 }));
    if (g > 17 && kit.once('shower')) for (const t of trees) for (let i = 0; i < 22; i++) {   // the trees shake a shower over them
      const p = t.spots[(rng() * t.spots.length) | 0]; emitPetal(p.x, p.y, p.z, { vx: -Math.sign(t.root.position.x) * (.1 + rng() * .15), vy: .02 + rng() * .05, drag: .5, life: 5 + rng() * 2 });
    }
    if (held && g > 18 && rng() < dt * 1.2) bits.emit({ x: (rng() - .5) * .2, y: .3, z: TZ, vy: .08, sway: .03, color: '#ff8fab', size: .02, life: 2.4, shape: 'heart' });
  }

  return {
    seconds: [6.4, 6, 6.3],

    build() {
      /* the two of them: the shared couple, in their own clothes */
      boy = kit.model('boy').fit({ height: H }); girl = kit.model('girl').fit({ height: HER });
      stage.add(boy.root, girl.root);

      sky = kit.backdrop(paintSky, { width: 1.04, height: .72, curve: .08, z: -.31, alphaTest: .5 }); stage.add(sky);   // clear above its clouds
      makeTrack();
      const arrowTex = kit.canvasTexture(128, 52, paintArrow);
      signals = SIGNALS.map(s => makeSignal(s, arrowTex));
      gates = GATES.map(makeGate);
      blossomTex = kit.canvasTexture(256, 128, paintBlossoms); blossomTex.wrapS = THREE.RepeatWrapping;
      trees = TREES.map(makeTree);
      makePetal(); makeCarpet(); storm = makeStorm();
      train = makeTrain();

      /* the card's words and photo */
      note = kit.sign({ text: words('note1', 'Mùa hoa năm ấy, anh gặp em'), width: .4, aspect: .5, accent: '#f07aa0', ink: '#6a2547', glow: .4 });
      banner = kit.sign({ text: words('note2', 'Lần này, anh sẽ không để lỡ em!'), style: 'banner', width: .62, accent: '#e8557f', glow: .45 });
      photo = kit.polaroid({ width: .22, caption: words('caption', 'Mùa anh đào của mình'), glow: .5, halo: true, haloColor: 0xffd6e4 });
      halo = photo.halo;                                              // flat, just behind the photo: a sprite would cut through it
      stage.add(note.root, banner.root, photo.root);

      fall = kit.particles({ max: 320 });
      sparks = kit.particles({ max: 160, additive: true });
      bits = kit.particles({ max: 120 });
      stage.add(fall.root, sparks.root, bits.root);
    },

    reset() {
      [fall, sparks, bits].forEach(p => p.clear());
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); toStage.value.copy(stage.matrixWorld).invert();
      const warm = ease.smooth(seg(g, 14.5, 17));                     // spring daylight, golden by the hug
      kit.lights.hemi.color.copy(SPRING.hemi).lerp(GOLDEN.hemi, warm); kit.lights.hemi.groundColor.copy(SPRING.ground).lerp(GOLDEN.ground, warm);
      kit.lights.hemi.intensity = 1.15; kit.lights.sun.color.copy(SPRING.sun).lerp(GOLDEN.sun, warm); kit.lights.sun.intensity = 1.5;
      poseScenery(g, T);
      poseTrain(g);
      poseCouple(g, T);
      poseWords(g, T);
      poseStorm(g, T);
      effects(g, T, dt, held);
      [fall, sparks, bits].forEach(p => p.update(dt, T));
    }
  };
};
