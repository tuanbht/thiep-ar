/* Sinh nhật Bé, told by the shared act _acts/lovestory.js on the party of set.js. Four chapters, each ending at a stop
   (the next tap plays on; after the last, the letter):
     1 ·  0–6.5    Tiệc bắt đầu!: Bé runs in, does a happy jump (confetti) while the bunting pops up flag by flag with its
                   four photo pennants, and waves; a party hat drops out of the sky onto his head (boing!)
     2 ·  6.5–13.5 Chuyến tàu kỷ niệm: "Tu tu!" right behind him (his hat jumps), and the toy train puffs off round the rug
                   and round him, a photo standing in each of its four wagons, turned to the phone, and the card's words
                   (train) on the engine's sign; he cheers, then dances
     3 · 13.5–20.5 Mở quà: he picks up the present on the step; its lid pops and a jack-in-the-box springs out with a photo
                   for a face; he jumps and drops it, and it bounces; two presents on the pile open by themselves and let
                   out balloons that carry photos up; he claps
     4 · 20.5–27.5 Bánh kem & điều ước: the cake's box flies off, the number candle (the card's age) lights with a
                   sparkler's fizz that dies down to a flame; he goes round
                   behind the table, takes a breath and blows; the flame goes out in a puff, the confetti cannons pop, the
                   banner rises with his name (banner + name) and the first photo shines in a star; he cheers and dances
   The train runs on from chapter 2 to the end (its photos keep coming round) while he stays inside its loop; it waits,
   out from behind him, while he makes his wish. A tap on him: a hop, a party horn and confetti; a tap on the engine:
   "Tu tu!"; a tap on a photo shows it big (the act does that). Sound: the shared birthday set (templates/_sounds), the
   party Happy Birthday from the top (the kit starts it), and effects behind kit.once: horn, pop, toot, boing, whoosh,
   sparkler (the number candle fizzes like one when it lights), blow, sparkle, applause.
   Everything is a function of the story's clock g, except the train, which keeps running while the act waits at a stop. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, ease, seg, lerp, rng, words } = kit;
  const H = .26;                                                      // Bé: 1.30 m, in card widths
  const RUN = .56, WALK = .085;                                       // how far his feet carry him a second at speed 1 (his pace applied)
  const START = [0, 6.5, 13.5, 20.5], SECONDS = [6.5, 7, 7, 7];
  const TAU = Math.PI * 2;
  const K = [0, .075], B = [0, -.183];                                // where he plays in chapters 1–2, and where he blows the candle
  const RUN_IN = [[-.5, .175], [-.13, .16], [K[0], K[1]]];             // in over the front of the rails, clear of the blocks
  const PARK = .14, CRUISE = .28, SLOW = .21;                          // the engine's place along the line at the start (between the tent and the cake); its speeds
  const CANDY = ['#ff6f91', '#ffd27a', '#7fd6b8', '#7cc4f0', '#b49ad8', '#ff9f6b', '#ffffff'];
  /* the hat on his head, in the Head bone's own frame (its units; measured on the model): the crown's middle and the head's up */
  const HAT_AT = new THREE.Vector3(.24, 16.6, -15.2), HAT_UP = new THREE.Vector3(.048, .629, -.776).normalize(), HAT_FWD = new THREE.Vector3(.043, .775, .631).normalize();
  const HAT_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), HAT_UP).premultiply(new THREE.Quaternion().setFromAxisAngle(HAT_FWD, -.22));
  let set, kid, bones = {}, hat, hatBase = null, confetti, sparks, steam, bubbles;
  let trainS = PARK, trainV = 0, lastG = 0, poked = -9, tooted = -9, passed = -9, now = 0;   // passed: when the engine came past the front
  let grabOff = null, lastBox = null;                                  // the present against his fist when he picks it up; where he let go
  /* chapter 3's beats (seconds into it): the pick-up (PickUp about 1.9x, as on the couple), both hands on the present, the jack */
  const PICK_T = 1.42, PICK_SPEED = 1.9, GRAB = PICK_T + 1.02 / PICK_SPEED, HOLD0 = PICK_T + 1.3 / PICK_SPEED, HOLD1 = HOLD0 + .4, POP = 3.2, LAND = 3.65;
  const BLOW = 2.55, OUT = 2.98, POPS = 3.2;                            // chapter 4: he blows, the flame goes out, the cannons pop

  const clipAt = (list, t) => { let c = list[0]; for (const x of list) if (t >= x[0]) c = x; return c; };
  const act = c => { for (const n of [].concat(c[1])) if (kid.play(n, c[2] || {})) return; };
  const turnTo = (a, b, k) => a + ((((b - a + Math.PI) % TAU) + TAU) % TAU - Math.PI) * k;
  const face = (fx, fz, tx, tz) => Math.atan2(tx - fx, tz - fz);
  const place = (x, z, yaw) => { kid.root.position.set(x, set.BASE, z); kid.root.rotation.y = yaw; };
  const V = () => new THREE.Vector3();
  const onStage = (obj, at = null) => { obj.updateWorldMatrix(true, false); const v = at ? obj.localToWorld(at.clone()) : V().setFromMatrixPosition(obj.matrixWorld); return stage.worldToLocal(v); };
  const own = obj => { obj.updateWorldMatrix(true, false); return kid.root.worldToLocal(V().setFromMatrixPosition(obj.matrixWorld)); };
  /** a point along a polyline, s from 0 to 1 of its length: { x, z, yaw } */
  function along(pts, s) {
    const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), total = lens.reduce((a, b) => a + b, 0);
    let d = Math.max(0, Math.min(1, s)) * total, i = 0;
    while (i < lens.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
    const a = pts[i], b = pts[i + 1], k = lens[i] ? d / lens[i] : 0;
    return { x: lerp(a[0], b[0], k), z: lerp(a[1], b[1], k), yaw: face(a[0], a[1], b[0], b[1]), total };
  }
  /** an even walk from t0 to t1 with soft ends: how far along (0..1) and the speed its middle needs */
  const stroll = (t, t0, t1, ends = .25) => {
    const T = t1 - t0, e = Math.min(ends, T / 3), v = 1 / (T - e);   // eased ends cover half what the pace would
    const u = t - t0;
    if (u <= 0) return { k: 0, v: 0 };
    if (u >= T) return { k: 1, v: 0 };
    if (u < e) return { k: v * u * u / (2 * e), v: v * u / e };
    if (u > T - e) { const w = T - u; return { k: 1 - v * w * w / (2 * e), v: v * w / e }; }
    return { k: v * (u - e / 2), v };
  };

  /** puts his hand slot at `to` (his own space: +x his left, +y up, +z ahead), the elbow towards `pole`; k of the way */
  function reach(side, to, pole, k = 1) {
    const arm = bones[`arm${side}`], fore = bones[`fore${side}`], hand = bones[`hand${side}`];
    if (!arm || !fore || !hand || k <= 0) return;
    const S = own(arm), E0 = own(fore), Hs = own(hand), a = S.distanceTo(E0), b = E0.distanceTo(Hs);
    const T = new THREE.Vector3(...to), d = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, S.distanceTo(T)));
    const dir = T.clone().sub(S).normalize(), cosA = (a * a + d * d - b * b) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    const P = new THREE.Vector3(...pole); P.sub(dir.clone().multiplyScalar(P.dot(dir))).normalize();
    const E = S.clone().addScaledVector(dir, a * cosA).addScaledVector(P, a * sinA);
    kid.aim(arm, E.clone().sub(S).toArray(), k);
    kid.aim(fore, T.clone().sub(own(fore)).toArray(), k);
  }

  function bubbleAt(b, k, p, size = .1) {
    b.visible = k > .001; if (!b.visible) return;
    b.scale.setScalar(Math.max(.001, size * ease.back(Math.min(1, k))));
    b.position.set(p.x, p.y + .01 * k, p.z);
  }
  const burst = (n, at, o = {}) => confetti.burst(n, () => ({
    x: at.x + (rng() - .5) * (o.wide ?? .04), y: at.y, z: at.z + (rng() - .5) * (o.wide ?? .04),
    vx: (o.vx ?? 0) + (rng() - .5) * (o.spread ?? .5), vy: (o.vy ?? .45) + rng() * .3, vz: (o.vz ?? 0) + (rng() - .5) * (o.spread ?? .5) * .6,
    gravity: -.85, drag: 1.3, sway: .03, spin: (rng() - .5) * 9, color: CANDY[(rng() * CANDY.length) | 0], size: .012 + rng() * .009,
    life: 2.8, shape: rng() < .7 ? 'petal' : 'star', floor: set.BASE + .002
  }));
  const twinkle = (n, at, r = .04, col = '#fff1b8') => sparks.burst(n, () => ({
    x: at.x + (rng() - .5) * r, y: at.y + (rng() - .5) * r, z: at.z + (rng() - .5) * r, vx: (rng() - .5) * .25, vy: (rng() - .5) * .25 + .05, vz: (rng() - .5) * .1,
    drag: 1.4, color: col, size: .014 + rng() * .008, life: .9, shape: rng() < .5 ? 'sparkle' : 'star', spin: 3
  }));

  /* ── the train: its speed by the story's clock, its place by adding that up, so it runs on while the act waits ── */
  /** the speed it heads for: parked in chapter 1, round and round after; during the wish it waits, out from behind him */
  function trainTarget(g) {
    if (g < 7) return 0;
    if (g < START[3]) return g < START[2] ? CRUISE : SLOW;
    const e = set.engine.position, behind = e.z < set.TRACK.cz - .05 && Math.abs(e.x - B[0]) < .24;
    return g - START[3] < POPS + .4 && !behind ? 0 : SLOW;
  }
  function runTrain(g, T, dt) {
    if (g < lastG - 1e-6) { trainS = PARK; trainV = 0; }               // played again from the top
    if (dt) { trainV += (trainTarget(g) - trainV) * Math.min(1, dt * 2.4); trainS += trainV * dt; }
    lastG = g;
    set.placeTrain(trainS);
    set.wagons.forEach(w => set.faceCamera(w.turner));
    set.faceCamera(set.signTurner);
    const v = trainV, chimney = onStage(set.engine, set.chimneyTop);
    if (dt && rng() < dt * (2 + 10 * v / CRUISE)) {                    // steam: puffs that drift back as it goes
      const h = set.along(trainS);
      steam.emit({ x: chimney.x, y: chimney.y + .004, z: chimney.z, vx: -h.dx * v * .35 + (rng() - .5) * .02, vy: .07 + rng() * .04, vz: -h.dz * v * .35,
        sway: .015, color: rng() < .5 ? '#ffffff' : '#f3eef8', size: .011 + rng() * .007, grow: 1.8, life: 1.15, shape: 'glow' });
    }
    return chimney;
  }

  return {
    seconds: SECONDS,

    build() {
      set = window.NM_KID_SET(kit);
      kid = kit.model('kid').fit({ height: H });
      stage.add(kid.root);
      for (const [k, n] of Object.entries({ armR: 'upperarm.r', foreR: 'lowerarm.r', handR: 'handslot.r', armL: 'upperarm.l', foreL: 'lowerarm.l', handL: 'handslot.l',
        head: 'head', chest: 'chest', spine: 'spine', low: 'Spine02', mouth: 'headfront' })) bones[k] = kid.node(n);
      const hit = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.05, .05, H, 8)), kit.keep(new THREE.MeshBasicMaterial()));
      hit.visible = false; hit.userData.proxy = true; hit.position.y = H / 2; kid.root.add(hit);   // an easy target for a finger
      kit.onTap(hit, () => { poked = now; });
      const eHit = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(.07, .1, .12)), kit.keep(new THREE.MeshBasicMaterial()));
      eHit.visible = false; eHit.userData.proxy = true; eHit.position.y = .05; set.engine.add(eHit);
      kit.onTap(eHit, () => { tooted = now; });
      hat = set.partyHat(); stage.add(hat);
      bubbles = { toot: set.bubble('Tu tu!', { ink: '#e5484d' }), boing: set.bubble('BOING!', { ink: '#7b2343', tail: .62 }), wow: set.bubble('Oa!', { ink: '#d9577a' }),
        blow: set.bubble('Phùuu…', { ink: '#5e4a72', tail: .62 }), yay: set.bubble('Yeee!', { ink: '#e5484d' }) };
      Object.values(bubbles).forEach(b => stage.add(b));
      confetti = kit.particles({ max: 420 });
      sparks = kit.particles({ max: 240, additive: true });
      steam = kit.particles({ max: 180 });
      stage.add(confetti.root, sparks.root, steam.root);
    },

    reset() {
      [confetti, sparks, steam].forEach(p => p.clear());
      kid.stop();
      if (hat.parent !== stage) stage.add(hat);
      hat.scale.set(1, 1, 1); hat.visible = false; hatBase = null;
      trainS = PARK; trainV = 0; lastG = 0; grabOff = lastBox = null; passed = -9;
      set.placeTrain(trainS);
    },

    pose({ g, T, dt, held }) {
      now = T;
      const ch = g < START[1] ? 0 : g < START[2] ? 1 : g < START[3] ? 2 : 3, t = g - START[ch];
      Object.values(bubbles).forEach(b => { b.visible = false; });
      const chimney = runTrain(g, T, dt);

      if (ch === 0) partyStarts(t, T);
      else if (ch === 1) trainRide(t, T);
      else if (ch === 2) presents(t, T);
      else cakeTime(t, T, dt);
      buntingPose(g, T);
      hatPose(g, T);
      jackPose(g, T);
      liftsPose(g, T);
      cakePose(g, T, dt);

      /* the engine's "Tu tu!": as it sets off, the first time it comes past the front, and when it is tapped */
      const e = set.engine.position;
      if (ch === 1 && e.z > set.TRACK.cz + .2 && Math.abs(e.x) < .06 && kit.once('toot-front')) passed = T;
      const toot = at => seg(T, at, at + .15) * (1 - seg(T, at + .9, at + 1.1));
      const tootK = Math.max(ch === 1 ? seg(t, .25, .4) * (1 - seg(t, 1.3, 1.5)) : 0, toot(passed), toot(tooted));
      bubbleAt(bubbles.toot, tootK, chimney.clone().add(new THREE.Vector3(0, .22, 0)), .09);   // above the engine's sign
      if (tootK > .5 && kit.once(`toot${ch}|${passed.toFixed(2)}|${tooted.toFixed(2)}`)) {
        kit.sfx('toot', { volume: toot(tooted) > .5 ? .55 : toot(passed) > .5 ? .4 : .65 });
        steam.burst(8, () => ({ x: chimney.x, y: chimney.y + .01, z: chimney.z, vx: (rng() - .5) * .08, vy: .12 + rng() * .06, vz: (rng() - .5) * .08, color: '#ffffff', size: .016, grow: 2, life: 1.2, shape: 'glow' }));
      }

      /* a tap on him: a hop, his arms up, confetti */
      const pk = T - poked;
      if (pk < 1.3) {
        const hop = .03 * Math.max(0, Math.sin(Math.PI * Math.min(1, pk / .4))), arms = Math.sin(Math.PI * Math.min(1, pk / 1.3));
        kid.root.position.y = set.BASE + hop;
        if (!holding(g)) { reach('R', [-.07, .23, .03], [-1, 0, -.3], arms); reach('L', [.07, .23, .03], [1, 0, -.3], arms); }
        if (kit.once(`poke${poked.toFixed(3)}`)) { kit.sfx('horn', { volume: .5 }); burst(26, onStage(bones.head).add(new THREE.Vector3(0, .06, 0)), { vy: .5 }); }
      }
      void held;
      [confetti, sparks, steam].forEach(p => p.update(dt, T));
    }
  };

  /* ── chapter 1: he runs in, jumps for joy, waves; the bunting pops up; a hat drops onto his head ── */
  function partyStarts(t, T) {
    const run = stroll(t, 0, 1.3, .2), p = along(RUN_IN, run.k);
    const heading = turnTo(along(RUN_IN, run.k - .12).yaw, along(RUN_IN, Math.min(.999, run.k + .12)).yaw, .5);   // round the bend, not snapping
    const yaw = t < 1.3 ? heading : turnTo(along(RUN_IN, .999).yaw, 0, ease.inOut(seg(t, 1.3, 1.6)));
    place(p.x, p.z, yaw);
    const clips = [[0, 'Running_A', { speed: Math.max(.2, run.v * p.total / RUN) }], [1.3, 'Jump_Full_Short', { once: true, fade: .2 }], [3.25, 'Wave', { fade: .3 }]];
    act(clipAt(clips, t));
    if (t > 1.85 && kit.once('jump-confetti')) { kit.sfx('horn', { volume: .6 }); burst(70, new THREE.Vector3(K[0], .4, K[1] - .05), { vy: .25, spread: .9, wide: .2 }); }
    const look = seg(t, 3.45, 3.75) * (1 - seg(t, 4.1, 4.45));     // he looks up at the hat coming down
    if (look) kid.bend(bones.head, -.42, 0, 0, look);
    void T;
  }

  /* ── chapter 2: the train sets off round him; he cheers and dances ── */
  function trainRide(t, T) {
    place(K[0], K[1], 0);
    const clips = [[0, 'Wave'], [.3, 'Idle', { fade: .2 }], [1.1, 'Cheer', { once: true, fade: .25 }], [3.6, 'Dance_A', { fade: .3 }], [5.6, 'Dance_B', { fade: .4 }]];
    act(clipAt(clips, t));
    const flinch = Math.sin(Math.PI * seg(t, .32, .62));               // "Tu tu!" right behind him: he jumps
    if (flinch) { kid.bend(bones.chest, -.12, 0, 0, flinch); kid.bend(bones.head, -.2, 0, 0, flinch); kid.root.position.y = set.BASE + .012 * flinch; }
    if (t > .32 && kit.once('flinch-stars')) twinkle(8, onStage(bones.head).add(new THREE.Vector3(0, .06, 0)), .06);
    void T;
  }

  /* ── chapter 3: the presents ── */
  function holding(g) { return g >= START[2] + GRAB && g < START[2] + POP + .1; }
  function presents(t, T) {
    const P = set.PICK, back = [P.x - Math.sin(P.yaw) * .06, P.z - Math.cos(P.yaw) * .06], path = [[K[0], K[1]], back, [P.x, P.z]];
    const w = stroll(t, .3, 1.38, .22), p = along(path, w.k), heading = turnTo(along(path, w.k - .1).yaw, along(path, Math.min(.999, w.k + .1)).yaw, .5);
    const yaw = t < .3 ? turnTo(0, along(path, .05).yaw, seg(t, 0, .3)) : t < HOLD0 + .2 ? heading : turnTo(P.yaw, .12, ease.inOut(seg(t, HOLD0 + .2, HOLD1 + .45)));
    place(p.x, p.z, yaw);
    const clips = [[0, 'Idle'], [.3, 'Walking_A', { speed: Math.max(.15, w.v * p.total / WALK), fade: .15 }], [1.38, 'Idle', { fade: .12 }], [PICK_T, 'PickUp', { once: true, speed: PICK_SPEED, fade: .12 }],
      [PICK_T + 2.5 / PICK_SPEED, 'Idle', { fade: .3 }], [4.05, 'Clap', { fade: .3 }]];
    act(clipAt(clips, t));
    /* the startle when the jack springs out: he leans back, his arms fly up, the present drops */
    const jump = Math.sin(Math.PI * seg(t, POP, POP + .55)), relax = 1 - seg(t, POP + .35, POP + .8);
    if (jump) { kid.bend(bones.spine, -.18, 0, 0, jump); kid.bend(bones.chest, -.16, 0, 0, jump); kid.bend(bones.head, -.25, 0, 0, jump); kid.root.position.y = set.BASE + .018 * Math.sin(Math.PI * seg(t, POP, POP + .3)); }
    const both = ease.smooth(seg(t, HOLD0, HOLD1)) * (t < POP ? 1 : 0), up = t >= POP ? ease.out(seg(t, POP, POP + .12)) * relax : 0;
    if (both) { reach('R', [-.029, .148, .072], [-1, -.8, -.2], both); reach('L', [.029, .148, .072], [1, -.8, -.2], both); }
    if (up) { reach('R', [-.08, .215, .045], [-1, -.3, -.2], up); reach('L', [.08, .215, .045], [1, -.3, -.2], up); }
    if (t > POP && kit.once('boing')) { kit.sfx('pop', { volume: .5 }); kit.sfx('boing', { volume: .7 }); }
    if (t > 4.1 && kit.once('clap')) kit.sfx('applause', { volume: .35 });
    bubbleAt(bubbles.boing, seg(t, POP + .02, POP + .2) * (1 - seg(t, POP + 1.1, POP + 1.3)), onStage(set.jackHead).add(new THREE.Vector3(.05, .2, 0)), .09);
    void T;
  }

  /* ── chapter 4: the cake, the wish ── */
  function cakeTime(t, T, dt) {
    const P = set.PICK, path = [[P.x, P.z], [.1, -.15], [B[0], B[1]]], w = stroll(t, .45, 1.85, .22), p = along(path, w.k);
    const a = along(path, w.k - .07), b = along(path, Math.min(1, w.k + .07)), heading = Math.abs(b.x - a.x) + Math.abs(b.z - a.z) > 1e-5 ? face(a.x, a.z, b.x, b.z) : p.yaw;   // round the corner, not snapping
    const yaw = t < .45 ? turnTo(.12, heading, ease.inOut(seg(t, .05, .45))) : t < 1.85 ? heading : turnTo(along(path, .97).yaw, 0, ease.inOut(seg(t, 1.85, 2.15)));
    place(p.x, p.z, yaw);
    const clips = [[0, 'Idle'], [.45, 'Walking_A', { speed: Math.max(.15, w.v * p.total / WALK), fade: .15 }], [1.85, 'Idle', { fade: .15 }], [3.55, 'Cheer', { once: true, fade: .25 }], [6.05, 'Dance_B', { fade: .4 }]];
    act(clipAt(clips, t));
    /* a breath in, then he leans in and blows: the back bends first, then the arms go back */
    const breath = Math.sin(Math.PI * seg(t, 2.05, 2.55)), lean = ease.inOut(seg(t, BLOW - .05, BLOW + .25)) * (1 - ease.inOut(seg(t, 3.2, 3.55)));
    if (breath) { kid.bend(bones.chest, -.14, 0, 0, breath); kid.bend(bones.head, -.12, 0, 0, breath); }
    if (lean) {
      kid.bend(bones.low, .3, 0, 0, lean); kid.bend(bones.spine, .24, 0, 0, lean); kid.bend(bones.chest, .18, 0, 0, lean); kid.bend(bones.head, .1, 0, 0, lean);
      reach('R', [-.055, .1, -.045], [-1, 0, .3], lean); reach('L', [.055, .1, -.045], [1, 0, .3], lean);
    }
    bubbleAt(bubbles.wow, seg(t, .3, .45) * (1 - seg(t, 1.2, 1.4)), onStage(bones.head).add(new THREE.Vector3(.05, .07, 0)), .08);
    bubbleAt(bubbles.blow, seg(t, BLOW + .1, BLOW + .25) * (1 - seg(t, OUT + .3, OUT + .5)), onStage(bones.head).add(new THREE.Vector3(-.075, .05, .02)), .085);
    bubbleAt(bubbles.yay, seg(t, 3.65, 3.8) * (1 - seg(t, 5, 5.2)), onStage(bones.head).add(new THREE.Vector3(.07, .08, 0)), .085);
    if (t > BLOW && t < OUT + .05 && dt) {                              // his breath, across to the flame
      const m = onStage(bones.mouth), f = set.flames[0] ? onStage(set.flames[0].root) : m;
      for (let i = 0; i < 2; i++) steam.emit({ x: m.x + (rng() - .5) * .01, y: m.y - .006, z: m.z + .01, vx: (f.x - m.x) * 2.4 + (rng() - .5) * .03, vy: (f.y - m.y) * 2.4,
        vz: (f.z - m.z) * 2.4, color: '#ffffff', size: .007 + rng() * .005, grow: 1.6, life: .45, shape: 'glow' });
    }
    if (t > BLOW && kit.once('blow')) kit.sfx('blow', { volume: .7 });
    if (t > POPS && kit.once('cannons')) {
      kit.sfx('pop', { volume: .7 }); kit.sfx('horn', { volume: .6 });
      set.cannons.forEach(c => {
        const mouth = onStage(c.tilt, new THREE.Vector3(0, .055, 0));     // up and in, so it showers the party
        burst(90, mouth, { vx: -c.s * .5, vy: 1, vz: -.3, spread: .35, wide: .01 });
      });
    }
    if (t > 3.7 && t < 7 + 99 && dt && rng() < dt * (t > 7 ? 5 : 10))  // confetti keeps drifting down at the end
      confetti.emit({ x: (rng() - .5) * .9, y: .7 + rng() * .1, z: (rng() - .5) * .5, vy: -.06, sway: .05, color: CANDY[(rng() * 7) | 0], size: .012 + rng() * .008,
        life: 4, shape: rng() < .7 ? 'petal' : 'star', spin: (rng() - .5) * 5, floor: set.BASE + .002 });
    /* the cannons kick; the banner rises; the first photo flips in on its star */
    set.cannons.forEach(c => { const k = seg(t, POPS, POPS + .4); c.tube.scale.set(1 + .25 * Math.sin(Math.PI * k), 1 - .2 * Math.sin(Math.PI * k), 1 + .25 * Math.sin(Math.PI * k)); });
    if (t > POPS + .35 && kit.once('applause')) kit.sfx('applause', { volume: .6 });
    if (t > 4.1 && kit.once('star')) { kit.sfx('sparkle', { volume: .6 }); twinkle(28, set.star.root.position, .32, '#ffe9a8'); }
  }

  /* ── what stays put between chapters: the bunting, the hat, the presents, the balloons, the cake ── */
  function buntingPose(g, T) {
    const n = set.bunting.length;
    set.bunting.forEach((b, i) => {
      const t0 = 1.6 + i * 1.75 / n, k = ease.back(seg(g, t0, t0 + .32)), sway = .06 * Math.sin(T * 1.7 + i * .9);
      b.obj.scale.setScalar(Math.max(.001, k)); b.obj.visible = k > .001;
      b.obj.rotation.x = (1 - seg(g, t0 + .3, t0 + 1.2)) * .5 * Math.sin((g - t0) * 14) * (g > t0 ? 1 : 0) + sway * (b.kind === 'photo' ? .4 : 1);
      if (g > t0 && kit.once(`flag${i}`)) kit.sfx('pop', { volume: .3, rate: .85 + (i % 5) * .1 });
    });
  }
  function hatPose(g, T) {
    const head = bones.head; if (!head) return;
    const fall = seg(g, 3.45, 4.1), landed = g >= 4.1;
    if (!landed) {
      if (hat.parent !== stage) { stage.add(hat); hat.scale.set(1, 1, 1); hatBase = null; }
      hat.visible = g > 3.45;
      if (!hat.visible) return;
      head.updateWorldMatrix(true, false);
      const at = stage.worldToLocal(head.localToWorld(HAT_AT.clone())), q = head.getWorldQuaternion(new THREE.Quaternion()).multiply(HAT_Q);
      hat.position.copy(at).add(new THREE.Vector3(0, .5 * (1 - ease.in(fall)), 0));
      hat.quaternion.copy(stage.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
      hat.rotateY((1 - fall) * 9);
      return;
    }
    if (hat.parent !== head) { kid.hold(hat, 'head'); hat.position.copy(HAT_AT); hat.quaternion.copy(HAT_Q); hatBase = hat.scale.clone(); hat.visible = true; }
    if (kit.once('hat-on')) { kit.sfx('boing', { volume: .6 }); twinkle(12, onStage(hat), .07); }
    /* a squash when it lands; in chapter 2 the toot makes it jump off his head and drop back */
    const sq = Math.exp(-7 * (g - 4.1)) * Math.sin((g - 4.1) * 26) * (g < 6 ? 1 : 0), jump = g > 6.5 + .4 && g < 6.5 + 1.05 ? Math.sin(Math.PI * seg(g, 6.5 + .4, 6.5 + 1.05)) : 0;
    const sq2 = g > 7.55 && g < 8.3 ? Math.exp(-7 * (g - 7.55)) * Math.sin((g - 7.55) * 26) : 0, s = sq + sq2;
    hat.scale.set(hatBase.x * (1 + .18 * s), hatBase.y * (1 - .22 * s), hatBase.z * (1 + .18 * s));
    hat.position.copy(HAT_AT).addScaledVector(HAT_UP, 34 * jump);
    hat.quaternion.copy(HAT_Q); hat.rotateY(jump * TAU);
    void T;
  }
  function jackPose(g, T) {
    const t3 = g - START[2], P = set.PICK, J = set.jackBox, step = set.step.root;
    const popK = g < START[2] + POP ? 0 : g - START[2] - POP;           // seconds since it sprang out
    set.jack.visible = popK > 0;
    set.jackHinge.rotation.x = -2.1 * ease.out(Math.min(1, popK / .16));
    const kick = (k0, a) => (popK > k0 ? a * Math.exp(-4 * (popK - k0)) * Math.sin((popK - k0) * 17) : 0);   // the spring wobbles after a jolt
    const stretch = Math.min(1, popK / .12) * (1 + kick(0, .35) + kick(LAND - POP, .3));
    set.spring.scale.y = Math.max(.05, stretch); set.jackHead.position.y = .06 * Math.max(.05, stretch);
    set.jackHead.rotation.z = .15 * Math.sin(popK * 9) * Math.exp(-1.5 * popK) + .05 * Math.sin(T * 2.2);
    if (popK > 0) set.faceCamera(set.jack);
    const onStep = () => { J.position.set(step.position.x, set.BASE + .018, step.position.z); J.rotation.set(0, P.yaw, 0); };
    if (g < START[2] + GRAB) { onStep(); grabOff = null; return; }
    const ground = [P.x + Math.sin(.12) * .105, P.z + Math.cos(.12) * .105];
    if (g >= START[2] + LAND || g >= START[3]) {                         // on the floor in front of him, the jack bobbing
      const b = g < START[2] + LAND + .45 ? Math.abs(Math.sin(Math.PI * seg(g, START[2] + LAND, START[2] + LAND + .3))) * .014 * (1 - seg(g, START[2] + LAND + .3, START[2] + LAND + .45)) : 0;
      J.position.set(ground[0], set.BASE + b, ground[1]); J.rotation.set(0, .12 + .5, 0);
      if (kit.once('jack-land')) { kit.sfx('boing', { volume: .4, rate: 1.2 }); twinkle(10, J.position.clone().add(new THREE.Vector3(0, .02, 0)), .05); }
      return;
    }
    const hr = onStage(bones.handR), hl = onStage(bones.handL);
    if (!grabOff) { onStep(); grabOff = J.position.clone().sub(hr); }
    const one = hr.clone().add(grabOff), two = hr.clone().add(hl).multiplyScalar(.5).add(new THREE.Vector3(0, -set.JACK / 2, 0));
    const k = ease.smooth(seg(t3, HOLD0, HOLD1)), held = one.lerp(two, k);
    held.y = Math.max(held.y, set.BASE + .018);                         // it rests on the step until the hand lifts it
    if (t3 < POP + .06) { J.position.copy(held); J.rotation.set(0, kid.root.rotation.y, 0); lastBox = held.clone(); return; }
    const f = seg(t3, POP + .06, LAND), from = lastBox || held;          // dropped: up a little, then down to the floor in front of him
    J.position.set(lerp(from.x, ground[0], f), lerp(from.y, set.BASE, f) + .06 * Math.sin(Math.PI * f), lerp(from.z, ground[1], f));
    J.rotation.set(.6 * Math.sin(Math.PI * f), .12 + .5 * f, 0);
  }
  function liftsPose(g, T) {
    const finals = [[.3, .7, -.125], [.43, .55, -.035]];
    set.lifts.forEach((L, i) => {
      const t0 = START[2] + 3.8 + i * .55, k = ease.out(seg(g, t0, t0 + 1.7)), lid = L.from.lid;
      lid.visible = g < t0 + .5; L.root.visible = g > t0;
      const lidK = seg(g, t0 - .05, t0 + .5);
      lid.position.y = L.from.h - .009 + .09 * Math.sin(Math.PI * lidK * .9); lid.rotation.set(-2.2 * lidK, lidK * 2, 0); lid.scale.setScalar(Math.max(.001, 1 - ease.in(lidK)));
      if (g > t0 && kit.once(`lift${i}`)) { kit.sfx('pop', { volume: .6 }); twinkle(14, L.from.root.position.clone().add(new THREE.Vector3(0, L.from.h + .02, 0)), .06); }
      if (!L.root.visible) return;
      const from = L.from.root.position, [fx, fy, fz] = finals[i];
      L.root.position.set(lerp(from.x, fx, k) + .012 * Math.sin(T * 1.1 + i * 2) * k, lerp(from.y + L.from.h + .04, fy, k) + .008 * Math.sin(T * 1.6 + i), lerp(from.z, fz, k));
      L.root.scale.setScalar(Math.max(.001, lerp(.25, 1, ease.back(seg(g, t0, t0 + .5)))));
      L.root.rotation.z = .08 * Math.sin(T * 1.3 + i * 1.7);
      set.faceCamera(L.turner);
    });
  }
  function cakePose(g, T, dt) {
    const t4 = g - START[3];
    const off = seg(t4, .15, 1);                                        // the cake's box flies off
    set.cover.visible = off < 1;
    set.cover.position.y = set.table.top + .25 * ease.out(off); set.cover.rotation.y = TAU * ease.out(off); set.cover.scale.setScalar(Math.max(.001, 1 - ease.in(seg(t4, .5, 1))));
    if (t4 > .2 && kit.once('cover-off')) { kit.sfx('whoosh', { volume: .6 }); twinkle(20, new THREE.Vector3(set.table.x, set.CAKE_TOP + .02, set.table.z), .1); }
    const lit = seg(t4, .95, 1.2) * (1 - seg(t4, OUT, OUT + .14));
    if (t4 > .95 && kit.once('sparkler')) kit.sfx('sparkler', { volume: .45, rate: 1.25 });   // 2.5 s of crackle, quickened to end as he blows
    set.flames.forEach((f, i) => {
      const flick = 1 + .12 * Math.sin(T * 23 + i * 2) + .08 * Math.sin(T * 37 + i);
      f.root.visible = lit > .01; f.root.scale.set(lit * (1 - .05 * Math.sin(T * 31)), lit * flick, lit);
      f.root.rotation.z = .12 * Math.sin(T * 7 + i);
      f.root.rotation.x = t4 > BLOW && t4 < OUT + .1 ? .7 * seg(t4, BLOW, BLOW + .2) : 0;   // his breath bends it away from him
      f.glow.material.opacity = .55 * lit;
      if (t4 > .95 && kit.once(`light${i}`)) twinkle(10, onStage(f.root), .03, '#ffd27a');
      const fizz = t4 > 1 && t4 < BLOW ? 1 - seg(t4, 1.7, BLOW - .05) : 0;   // a sparkler on top at first, dying down as he leans in
      if (fizz && dt) {
        const p = onStage(f.root);
        for (let k = 0, n = Math.floor(dt * 70 * fizz + rng()); k < n; k++) sparks.emit({ x: p.x, y: p.y + .004, z: p.z, vx: (rng() - .5) * .18, vy: .22 + rng() * .14,
          vz: (rng() - .5) * .18, gravity: -1.5, drag: .4, color: ['#fff6d8', '#ffe9a8', '#ffd27a', '#ffffff'][(rng() * 4) | 0], size: .007 + rng() * .005,
          life: .45 + rng() * .3, shape: rng() < .75 ? 'sparkle' : 'star', spin: 6, floor: set.CAKE_TOP });
      }
      if (t4 > OUT && t4 < OUT + 1.3 && dt && rng() < dt * 14) {     // a thread of smoke once it is out
        const p = onStage(f.root);
        steam.emit({ x: p.x, y: p.y, z: p.z, vx: (rng() - .5) * .01, vy: .05, sway: .01, color: '#cfc8d6', size: .006, grow: 2.6, life: 1.3, shape: 'glow' });
      }
    });
    const star = set.star, sk = ease.back(seg(t4, 3.9, 4.6));
    star.root.visible = sk > .001; star.root.scale.setScalar(Math.max(.001, sk * (1 + .025 * Math.sin(T * 3))));
    star.root.position.set(0, .575 + .008 * Math.sin(T * 1.3), -.15); star.root.rotation.set(0, (1 - ease.out(seg(t4, 3.9, 4.7))) * Math.PI, .06 * Math.sin(T * .9));
    star.glow.material.opacity = .6 * seg(t4, 4.2, 4.8) * (1 + .1 * Math.sin(T * 2.5));
    const bn = ease.elastic(seg(t4, 3.4, 4.3));
    set.banner.root.visible = bn > .001; set.banner.root.scale.setScalar(Math.max(.001, bn));
    set.banner.root.position.set(0, lerp(.74, .82, ease.out(seg(t4, 3.4, 4))) + .005 * Math.sin(T * 1.4), -.2); set.banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
  }
};
