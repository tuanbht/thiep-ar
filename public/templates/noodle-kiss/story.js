/* Chung một sợi mì (one noodle for two), told by the shared act _acts/lovestory.js; the alley, its trattoria, the table
   and everything on it are built by scenery.js, loaded first. Three chapters of about ten seconds, each ending at a stop:
     1 · 0–10 s      night in a little alley: the string lights come on bulb by bulb, the trattoria's door swings open and
                     she steps out, he after her; music drifts from a window; he pulls her chair out, she sits and he
                     pushes it in, then goes round behind the table to his own; a plate of spaghetti drops onto the table
                     with a bounce and a curl of steam, and the card's first words (note1) are chalked onto the menu board
     2 · 10–20 s     they twirl their forks and eat; then both slurp one long noodle from its two ends, it shortens and
                     pulls them together into a surprise kiss; they freeze, blush, giggle and look away; a camera flash,
                     and the card's photo hangs on the wall in a gilt frame with its caption (caption)
     3 · 20–30 s     he nudges the last meatball across the plate to her with his fork; she smiles; the candle's flame
                     grows into a little heart; they hop their chairs round the table to sit close and hold hands, hearts
                     rise; the photo moves onto the menu board and a ribbon with the last words (note2) unrolls under a
                     string of little lights strung across the alley
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own;
   the twinkling, the music, the steam and the rising hearts go by T, the act's own time. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2;
  /* the alley: the wall at the card's back edge, its door and window; the table; the menu board */
  const WALL = { width: 1.1, height: .8, curve: .07, z: -.3, sag: .03, perSwag: 4, hooks: [[-.53, .655], [-.21, .675], [.13, .68], [.53, .69]], nail: [-.08, .632] };
  const DOOR = { x: -.37, w: .19, h: .345 }, WIN = { x: .27, y: .54, w: .14, h: .13 };
  const TABLE = { x: -.08, z: -.03, r: .09, top: .118 };
  const EASEL = { x: .32, z: .1, turn: -.32 };
  const S = window.NM_NOODLE.scenery(kit, { WALL, DOOR, WIN, TABLE });
  const { V3 } = S;
  /* the seats: hips GAP from the table's middle, turned TURN towards the phone; a chair pulled out goes OUT back and
     swivels SWIVEL (hers towards the front, where she steps in; his towards the back, where he comes from) */
  const GAP = .14, TURN = .25, OUT = .045, SWIVEL = -.65, SCOOT = .85;   // SCOOT: in the end they hop their chairs round to sit closer
  const seatAt = (side, turn, o = {}) => { o.a = -side * (Math.PI / 2 - turn); o.x = TABLE.x + side * GAP * Math.cos(turn); o.z = TABLE.z - GAP * Math.sin(turn); return o; };
  const HER = seatAt(-1, TURN), HIS = seatAt(1, TURN), SH = {}, SB = {};
  const scoot = g => ease.inOut(seg(g, 25, 25.7));
  const hopY = g => .008 * Math.abs(Math.sin(TAU * seg(g, 25, 25.7)));   // two little hops on the way
  const NIGHT = { hemi: new THREE.Color('#5b66a6'), ground: new THREE.Color('#1c1a33'), sun: new THREE.Color('#8090d0') };
  const LIT = { hemi: new THREE.Color('#ffd6ae'), ground: new THREE.Color('#4a3040'), sun: new THREE.Color('#ffc896') };
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  let K = .137, BACK = .054;                                         // his scale; how far in front of the hips a seated one's feet are
  const herSit = V3(), hisSit = V3(), cg = { x: 0, z: 0, a: 0 }, cb = { x: 0, z: 0, a: 0 }, c0 = { x: 0, z: 0, a: 0 };
  let boy, girl, chairs, wall, door, bulbs, candle, plate, forks, coils, noodle, easel, photo, frame, garland, banner;
  let blushG, blushB, mouths, winGlow, lantern, flash, sparks, notes, steam, hearts, drops, particles;

  /* ── who does what: [from g, clip, options]; a walk's speed is set from the ground it covers ── */
  const GIRL = [
    [0, 'Idle'], [.75, 'Walking_A', { fade: .25 }], [2.3, 'Idle', { fade: .2 }], [3.3, 'Walking_A', { fade: .15 }],
    [3.85, 'Idle', { fade: .15 }], [3.95, 'Sit_Chair_Down', { once: true, fade: .2 }], [4.75, 'Sit_Chair_Idle', { fade: .3 }]
  ];
  const BOY = [
    [0, 'Idle'], [1.1, 'Walking_A', { fade: .25 }], [2.3, 'Idle', { fade: .2 }], [2.6, 'Interact', { once: true, fade: .2 }],
    [3.9, 'Idle', { fade: .3 }], [4.6, 'Interact', { once: true, fade: .2, key: 'push' }], [5.3, 'Walking_A', { fade: .2 }],
    [7.1, 'Idle', { fade: .15 }], [7.35, 'Sit_Chair_Down', { once: true, fade: .2 }], [8.15, 'Sit_Chair_Idle', { fade: .3 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  /** a walk: keys [[g, x, z, ease?], …], at an even pace between keys unless an ease says otherwise */
  const walk = (g, keys) => [tween(g, keys.map(k => [k[0], k[1], k[3] || 'linear'])), tween(g, keys.map(k => [k[0], k[2], k[3] || 'linear']))];

  /* ── the chairs: where each stands and which way it faces; a seated one rides on it ── */
  function chairPose(s, out, out2, o) {                                // out: pulled back (0..1); out2: swivelled (0..1)
    o.a = s.a + SWIVEL * out2;
    o.x = s.x - Math.sin(s.a) * OUT * out; o.z = s.z - Math.cos(s.a) * OUT * out;
    return o;
  }
  const herOut = g => ease.inOut(seg(g, 2.85, 3.3)) - ease.inOut(seg(g, 4.75, 5.25));
  const hisOut = g => ease.inOut(seg(g, 6.1, 6.6)) - ease.inOut(seg(g, 8.1, 8.6));
  /** the spot in front of a chair's seat, facing where it faces */
  const sitSpot = (c, out) => out.set(c.x + Math.sin(c.a) * BACK, 0, c.z + Math.cos(c.a) * BACK);

  /* ── where things are: bones and marks on the stage, and a two-bone reach for the arms ── */
  const mStage = new THREE.Matrix4(), qInv = new THREE.Quaternion(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion();
  const vS = V3(), vE = V3(), vD = V3(), vP = V3(), vT = V3(), vH = V3(), vH2 = V3(), vM = V3(), vM2 = V3(), vTmp = V3(), vTip = V3();
  const UP = V3(0, 1, 0), AIM = [0, 0, 0];
  const onStage = (o, out) => { o.updateWorldMatrix(true, false); return out.setFromMatrixPosition(o.matrixWorld).applyMatrix4(mStage); };
  const at = (m, bone, out) => onStage(m.node(bone), out);
  /** an arm reaching for a point on the stage: the elbow found from the two bones' lengths, bent down and out */
  function reach(m, side, target, k) {
    if (k <= 0) return;
    const s = m.scene.scale.x, a = .24 * s, b = .43 * s, out = side === 'l' ? 1 : -1;
    at(m, `upperarm.${side}`, vS);
    vD.subVectors(target, vS); const L = clamp(vD.length(), .3 * (a + b), .995 * (a + b)); vD.normalize();
    const cosA = clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    vP.set(out * .5, -1, -.2).applyQuaternion(m.root.quaternion); vP.addScaledVector(vD, -vP.dot(vD)).normalize();
    vE.copy(vS).addScaledVector(vD, a * cosA).addScaledVector(vP, a * sinA);
    qInv.copy(m.root.quaternion).invert();
    m.aim(`upperarm.${side}`, vT.subVectors(vE, vS).applyQuaternion(qInv).toArray(AIM), k);
    m.aim(`lowerarm.${side}`, vT.copy(vS).addScaledVector(vD, L).sub(vE).applyQuaternion(qInv).toArray(AIM), k);
  }
  /* a pose leaning in over the table: [spine, chest, head] forward, a turn towards the other, a tilt of the head */
  const SLURP = { lean: [.16, .12, -.28], yaw: .04, roll: 0 }, KISS = { lean: [.62, .46, -.95], yaw: .12, roll: .18 };   // chins up: the noodle shows
  function lean(m, s, k, p) {                                          // s: +1 she (turns right towards him), -1 he
    if (!k) return;
    m.bend('spine', p.lean[0] * k, s * p.yaw * .5 * k, 0); m.bend('chest', p.lean[1] * k, s * p.yaw * k, 0);
    m.bend('head', p.lean[2] * k, s * p.yaw * .35 * k, s * p.roll * k);
  }
  const mixPose = (k, o = { lean: [0, 0, 0] }) => {                    // SLURP to KISS
    for (let i = 0; i < 3; i++) o.lean[i] = lerp(SLURP.lean[i], KISS.lean[i], k);
    o.yaw = lerp(SLURP.yaw, KISS.yaw, k); o.roll = lerp(SLURP.roll, KISS.roll, k); return o;
  };
  const POSE = mixPose(0);

  /* ── the forks: lying by the plate, or in a hand pointing at something ── */
  const REST = [V3(TABLE.x - .07, TABLE.top + .0035, TABLE.z - .004), V3(TABLE.x + .07, TABLE.top + .0035, TABLE.z - .004)];
  const qRest = [0, 1].map(i => new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, (i ? -1 : 1) * .25, 0, 'YXZ')));
  /** fork i at the hand, its tines towards `to` (on the stage), turned `spin` about its own length; k: from the table to the hand */
  function forkAt(i, hand, to, spin, k) {
    const f = forks[i];
    if (k <= 0) { f.position.copy(REST[i]); f.quaternion.copy(qRest[i]); return; }
    vD.subVectors(to, hand).normalize();
    qA.setFromUnitVectors(UP, vD).multiply(qB.setFromAxisAngle(UP, spin));
    f.position.copy(REST[i]).lerp(hand, k); f.quaternion.copy(qRest[i]).slerp(qA, k);
  }

  /* ── the plate's pasta: points on its top, in the stage's own space ── */
  const PLATE = V3(TABLE.x, TABLE.top + .002, TABLE.z - .014);
  const pastaAt = (dx, dz, out, up = 0) => out.set(PLATE.x + dx, PLATE.y + .028 + up, PLATE.z + dz);

  /* ── the noodle between their mouths: its points along a sag that takes up the noodle still to slurp ── */
  const NP = Array.from({ length: 41 }, () => V3());
  function hangNoodle(a, b, extra, wob, T) {
    const d = a.distanceTo(b), h = Math.sqrt(1.5 * d * Math.max(0, extra));   // a curve this deep is `extra` longer than the gap
    vM.addVectors(a, b).multiplyScalar(.5); vM.y -= h;
    vM2.subVectors(b, a).cross(UP).normalize();                         // across the noodle: it wobbles as it is pulled
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, u = 1 - t, p = NP[i];
      p.set(0, 0, 0).addScaledVector(a, u * u).addScaledVector(vM, 2 * t * u).addScaledVector(b, t * t);
      p.addScaledVector(vM2, wob * Math.sin(t * Math.PI) * Math.sin(T * 40 + t * 9));
    }
    noodle.set(NP);
  }

  /* ── where each of them is at story time g: [x, z, facing] ── */
  const PG = [0, 0, 0], PB = [0, 0, 0], P1 = [0, 0, 0], P2 = [0, 0, 0], CW = { x: 0, z: 0, a: 0 }, vW = V3();
  const behind = (c, d) => [c.x - Math.sin(c.a) * d, c.z - Math.cos(c.a) * d];
  const back = g => lerp(.1, .17, ease.inOut(seg(g, 3.9, 4.5)));     // how far behind her chair he stands: a step back as she sits
  /** she: out of the door first, round to the front of her chair, in, a turn, sits; then rides her chair in */
  function herAt(g, o) {
    if (g < 4.05) {
      [o[0], o[1]] = walk(g, [[.75, -.4, -.36], [.95, -.4, -.33, 'in'], [1.6, -.41, -.15], [2.3, -.35, .07, 'out'], [3.3, -.35, .07], [3.85, herSit.x, herSit.z, 'inOut']]);
      const into = Math.atan2(herSit.x + .35, herSit.z - .07);
      o[2] = tween(g, [[0, 0], [1.6, 0], [2.1, .55], [2.3, 1.1], [3.3, 1.1], [3.4, into], [3.8, into], [4.05, HER.a + SWIVEL]]);
    } else { chairPose(seatAt(-1, lerp(TURN, SCOOT, scoot(g)), SH), herOut(g), herOut(g), CW); sitSpot(CW, vW); o[0] = vW.x; o[1] = vW.z; o[2] = CW.a; }
    return o;
  }
  /** he: out after her, behind her chair to pull it, pushes it in, round the back of the table to his own */
  function hisAt(g, o) {
    if (g < 2.3) {
      const [ex, ez] = behind(chairPose(HER, 0, 0, CW), back(g));
      [o[0], o[1]] = walk(g, [[1.1, -.36, -.4], [1.3, -.36, -.37, 'in'], [1.9, -.35, -.2], [2.3, ex, ez, 'out']]);
      o[2] = tween(g, [[0, 0], [1.9, 0], [2.3, HER.a]]);
    } else if (g < 5.3) { chairPose(HER, herOut(g), herOut(g), CW); [o[0], o[1]] = behind(CW, back(g)); o[2] = CW.a; }
    else if (g < 7.35) {
      const [ex, ez] = behind(chairPose(HER, 0, 0, CW), back(g));
      [o[0], o[1]] = walk(g, [[5.3, ex, ez], [5.5, ex - .012, ez - .045, 'in'], [5.85, -.25, -.225], [6.55, -.05, -.222], [7.1, hisSit.x, hisSit.z, 'out']]);
      o[2] = tween(g, [[5.3, HER.a], [5.55, 2.5], [5.85, 2.45], [6.05, 1.72], [6.5, 1.72], [6.75, .7], [7.1, .7], [7.35, HIS.a + SWIVEL]]);
    } else { chairPose(seatAt(1, lerp(TURN, SCOOT, scoot(g)), SB), hisOut(g), hisOut(g), CW); sitSpot(CW, vW); o[0] = vW.x; o[1] = vW.z; o[2] = CW.a; }
    return o;
  }
  /** Walking_A's speed for the ground really covered (.1 card widths a second at speed 1 for one .3 tall) */
  const pace = (at, g, h) => { const a = at(g, P1), b = at(g - .05, P2); return clamp(Math.hypot(a[0] - b[0], a[1] - b[1]) / .05 / (.1 * h / .3), .7, 3.4); };

  return {
    seconds: [10, 10, 10],

    build() {
      /* the two of them, new clothes; their chairs take his scale (the KayKit packs share one) */
      boy = kit.model('boy').fit({ height: .3 }); K = boy.scene.scale.x; BACK = .397 * K;
      sitSpot(chairPose(HER, 1, 1, c0), herSit); sitSpot(chairPose(HIS, 1, 1, c0), hisSit);   // where each stands to sit: chair out
      girl = kit.model('girl').fit({ height: .288 });
      stage.add(boy.root, girl.root);
      S.dressBoy(boy); S.dressGirl(girl);
      mouths = [girl, boy].map(m => { const o = new THREE.Object3D(); o.position.set(0, .2, .5); m.node('head')?.add(o); return o; });
      blushG = S.makeBlush(girl, [.21, .11, .52], .18); blushB = S.makeBlush(boy, [.29, .27, .5], .2);
      const chairModel = kit.model('chair'); chairModel.scene.scale.setScalar(K); S.dressChair(chairModel);
      chairs = [chairModel.root, chairModel.root.clone(true)]; chairs.forEach(c => stage.add(c));

      /* the alley */
      wall = S.makeWall(); door = S.makeDoorway(); S.makeFloor(); bulbs = S.makeLights();
      winGlow = kit.glow({ color: 0xffc070, size: .22, opacity: 0 }); winGlow.position.set(WIN.x, WIN.y, S.wallZ(WIN.x) + .02);
      lantern = kit.glow({ color: 0xffc879, size: .12, opacity: 0 }); lantern.position.set(DOOR.x + DOOR.w / 2 + .08, .36, S.wallZ(DOOR.x + .17) + .02);
      stage.add(winGlow, lantern);

      /* the table: the cloth, the candle, the plate (dropped in later), two forks */
      S.makeTable();
      candle = S.makeCandle(); candle.root.position.set(TABLE.x, TABLE.top + .001, TABLE.z + .077);   // at the front edge: clear of heads and hands
      plate = S.makeSpaghetti();
      forks = [S.makeFork(), S.makeFork()];
      coils = forks.map(f => { const c = S.makeCoil(); f.add(c); return c; });
      noodle = S.makeNoodle();

      /* the card's words and photo: a chalkboard menu, a gilt frame on the wall, a ribbon under little lights */
      easel = S.makeEasel(words('note1', 'Tối nay mình ăn mì Ý nhé, anh mời!'), .34, .28, .19);
      easel.root.position.set(EASEL.x, 0, EASEL.z); easel.root.rotation.y = EASEL.turn;
      photo = kit.polaroid({ width: .27, caption: words('caption', 'Nụ hôn vị cà chua'), glow: .5, halo: true, haloColor: 0xffd9a0 });
      frame = S.makeFrame(photo); stage.add(frame);
      garland = S.makeGarland(1.04, .08, 17, .3);                    // from wall to wall, its middle out over the alley
      banner = kit.sign({ text: words('note2', 'Phần ngon nhất luôn dành cho em'), style: 'banner', width: .56, accent: '#b8213c', paper: '#fff6e6', glow: .6 });
      garland.root.add(banner.root); banner.root.position.set(0, -garland.sag - banner.height / 2, garland.bow + .004);
      for (const p of [photo, banner]) p.root.traverse(o => { o.castShadow = false; });

      /* a flash for the photo, and the particles */
      flash = kit.glow({ color: 0xffffff, size: 3.2, opacity: 0, depthTest: false }); flash.position.set(0, .3, .25); stage.add(flash);
      sparks = kit.particles({ max: 320, additive: true });
      notes = kit.particles({ max: 60 });
      steam = kit.particles({ max: 80, additive: true });
      hearts = kit.particles({ max: 160 });
      drops = kit.particles({ max: 60 });
      particles = [sparks, notes, steam, hearts, drops];
      particles.forEach(p => stage.add(p.root));
    },

    reset() {
      for (const p of particles) p.clear();
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();
      const lit = ease.smooth(seg(g, .1, 2.4));

      /* light: a cold night until the string lights warm the alley */
      const L = kit.lights;
      L.hemi.color.copy(NIGHT.hemi).lerp(LIT.hemi, lit); L.hemi.groundColor.copy(NIGHT.ground).lerp(LIT.ground, lit);
      L.sun.color.copy(NIGHT.sun).lerp(LIT.sun, lit);
      const flashK = g > 16.7 ? Math.exp(-(g - 16.7) * 9) : 0;
      L.hemi.intensity = lerp(.55, .92, lit) + 2.2 * flashK; L.sun.intensity = lerp(.35, .78, lit);
      flash.material.opacity = .85 * flashK;
      wall.lit.material.opacity = lit; wall.lit.visible = lit > 0;
      bulbs.forEach(({ b, glass, glowB }, i) => {                        // one by one from the left, each with a pop
        const at0 = .1 + i * .13, on = ease.back(seg(g, at0, at0 + .2)), tw = .85 + .15 * Math.sin(T * 2.2 + i * 1.9);
        glass.material.emissiveIntensity = 2.2 * clamp(on) * tw; glowB.material.opacity = .8 * clamp(on) * tw;
        b.scale.setScalar(1 + .5 * Math.sin(Math.PI * seg(g, at0, at0 + .25)));
        if (g > at0 && g < at0 + .3 && kit.once(`bulb${i}`)) sparks.burst(6, () => ({ x: b.position.x, y: b.position.y, z: b.position.z + .01, vx: (rng() - .5) * .15,
          vy: (rng() - .3) * .15, vz: .03, drag: 2.5, color: '#ffe3a0', size: .012, life: .5, shape: 'sparkle', spin: 4 }));
      });
      lantern.material.opacity = .7 * ease.out(seg(g, .4, .8)) * (1 + .06 * Math.sin(T * 11) * Math.sin(T * 4.3));
      const win = ease.out(seg(g, 1.8, 2.4));
      winGlow.material.opacity = .55 * win * (1 + .05 * Math.sin(T * 3));
      if (win > .5 && dt && rng() < dt * 1.6) {                           // music drifting out of the window
        notes.emit({ x: WIN.x + (rng() - .5) * .08, y: WIN.y + .02, z: S.wallZ(WIN.x) + .03, vx: -.02 - rng() * .03, vy: .045 + rng() * .02, sway: .025,
          color: ['#ffd36b', '#ffffff', '#ff9fbf', '#ffe9b0'][(rng() * 4) | 0], size: .028 + rng() * .014, life: 3.2, shape: 'note', spin: (rng() - .5) * 1.5 });
      }

      /* the door swings out, light spills onto the cobbles, it swings shut behind them */
      const open = ease.back(seg(g, .6, 1.05)) * (1 - ease.inOut(seg(g, 4.9, 5.4)));
      door.hinge.rotation.y = door.closed - 1.75 * open;
      door.spill.material.opacity = .6 * open;
      const glowIn = .35 + .65 * open; door.room.forEach(m => m.color.setRGB(glowIn, glowIn, glowIn));

      /* the chairs: hers out and back in under her, his out to meet him and in again */
      const round = lerp(TURN, SCOOT, scoot(g)), hy = hopY(g);
      chairPose(seatAt(-1, round, SH), herOut(g), herOut(g), cg); chairPose(seatAt(1, round, SB), hisOut(g), hisOut(g), cb);
      chairs[0].position.set(cg.x, hy, cg.z); chairs[0].rotation.y = cg.a;
      chairs[1].position.set(cb.x, hy, cb.z); chairs[1].rotation.y = cb.a;

      /* where they are and which way they look; a walk's steps keep pace with the ground it covers */
      const [gx, gz, ga] = herAt(g, PG), [bx, bz, ba] = hisAt(g, PB);
      girl.root.position.set(gx, hy, gz); girl.root.rotation.y = ga;
      boy.root.position.set(bx, hy, bz); boy.root.rotation.y = ba;
      const freeze = g > 14.9 && g < 15.4;                               // the kiss: both stock-still
      for (const [m, list, at, h] of [[girl, GIRL, herAt, .288], [boy, BOY, hisAt, .3]]) {
        const c = clipAt(list, g);
        if (c[1] === 'Walking_A') m.play(c[1], { ...c[2], speed: pace(at, g, h) });
        else m.play(c[1], freeze ? { ...c[2], speed: 0 } : c[2]);
      }

      /* chapter 1: out of the door hand in hand, a look up at the lights, a look at each other */
      const hand = bump(g, 1.35, 1.55, 2.05, 2.3);
      if (hand) {                                                        // she leads: her right hand back to his left
        at(girl, 'upperarm.r', vH); at(boy, 'upperarm.l', vH2); vM.addVectors(vH, vH2).multiplyScalar(.5); vM.y -= .05;
        reach(girl, 'r', vM, hand); reach(boy, 'l', vM, hand);
      }
      const wonder = bump(g, 2.25, 2.5, 2.8, 3.05);
      if (wonder) { girl.bend('head', -.38 * wonder, .2 * Math.sin(g * 4), 0); boy.bend('head', -.32 * wonder, -.15 * Math.sin(g * 3), 0); }
      const watch = bump(g, 5.4, 5.7, 7.2, 7.6);                         // seated, she watches him go round, swaying to the music
      if (watch) girl.bend('head', 0, -.5 * Math.sin(Math.PI * seg(g, 5.4, 7.6)) * watch, .1 * Math.sin(T * 3.1) * watch);
      const meet = bump(g, 8.2, 8.45, 8.7, 8.9);                        // both seated: a look at each other
      if (meet) { girl.bend('head', .02, .3 * meet, -.08 * meet); boy.bend('head', .02, -.3 * meet, .08 * meet); }

      /* chapter 1: the candle lights; the plate drops in, bounces, steams; they lean in to smell it */
      const lightUp = ease.back(seg(g, 7.7, 8)), fl = 1 + .1 * Math.sin(T * 17) * Math.sin(T * 7.3);
      const big = ease.inOut(seg(g, 23.7, 24.6)), heartK = ease.back(seg(g, 24.2, 24.9));
      candle.flame.scale.set(lightUp * (1 + .8 * big), 1.9 * lightUp * fl * (1 + .8 * big), lightUp * (1 + .8 * big));
      candle.flame.visible = g > 7.7 && heartK < .6;                    // the flame grows, then the heart takes its place
      candle.glowF.material.opacity = .55 * lightUp * fl * (1 + .5 * big + .3 * heartK);
      candle.light.intensity = (.06 + .05 * big + .05 * heartK) * lightUp * fl;
      candle.heart.scale.setScalar(Math.max(.0001, .05 * heartK * (1 + .06 * Math.sin(T * 5))));
      candle.heart.position.y = candle.top + .01 + .006 * heartK;
      if (g > 7.7 && g < 8.2 && kit.once('wick')) sparks.burst(12, () => ({ x: candle.root.position.x, y: candle.root.position.y + candle.top, z: candle.root.position.z, vx: (rng() - .5) * .12,
        vy: .05 + rng() * .1, vz: (rng() - .5) * .12, drag: 2, color: '#ffd38a', size: .012, life: .6, shape: 'sparkle' }));
      const drop = seg(g, 8.35, 8.65), bounce = g > 8.65 ? Math.exp(-(g - 8.65) * 7) * Math.sin((g - 8.65) * 26) : 0;
      plate.root.visible = g > 8.35;
      plate.root.position.set(PLATE.x, PLATE.y + .45 * (1 - drop * drop) + .012 * Math.abs(bounce), PLATE.z);
      plate.root.scale.set(1 + .14 * Math.max(0, -bounce), 1 - .2 * Math.max(0, -bounce) + .1 * (1 - drop) * (drop > 0), 1 + .14 * Math.max(0, -bounce));
      if (g > 8.65 && g < 9 && kit.once('plate')) sparks.burst(14, () => ({ x: PLATE.x + (rng() - .5) * .08, y: PLATE.y + .01, z: PLATE.z + (rng() - .5) * .06, vx: (rng() - .5) * .2,
        vy: .08 + rng() * .1, drag: 2, color: '#fff1c4', size: .013, life: .6, shape: 'sparkle', spin: 4 }));
      const hot = seg(g, 8.7, 9) * (1 - .6 * seg(g, 20, 22));
      if (hot && dt && rng() < dt * 5 * hot) steam.emit({ x: PLATE.x + (rng() - .5) * .04, y: PLATE.y + .035, z: PLATE.z + (rng() - .5) * .03, vy: .035 + rng() * .02,
        vx: (rng() - .5) * .01, sway: .015, color: '#3e3a38', size: .016 + rng() * .01, grow: 1.3, life: 1.8, shape: 'glow' });
      const sniff = bump(g, 8.8, 9.05, 9.45, 9.75);
      for (const [m, s] of [[girl, 1], [boy, -1]]) {
        if (sniff) { m.bend('chest', .2 * sniff, s * .1 * sniff, 0); m.bend('head', .1 * sniff + .05 * Math.sin(T * 9) * sniff, 0, s * .1 * sniff); }
      }
      if (g > 9.3 && g < 9.7 && kit.once('yum')) hearts.burst(6, i => ({ x: PLATE.x + (i - 2.5) * .02, y: .25, z: PLATE.z, vy: .1, vx: (i - 2.5) * .02, drag: .6,
        color: ['#ff8fab', '#ffd166'][i % 2], size: .018, life: 1.4, shape: i % 2 ? 'star' : 'heart', spin: (rng() - .5) * 3 }));

      /* chapter 1: the menu board; the card's first words chalked in as if by an unseen hand */
      const write = seg(g, 8.95, 9.85);
      easel.write(write);
      if (write > 0 && write < 1 && dt) {
        vTmp.set(-easel.BW / 2 + easel.BW * write, .04 * Math.sin(write * 40), .004); easel.board.localToWorld(vTmp); vTmp.applyMatrix4(mStage);
        sparks.emit({ x: vTmp.x, y: vTmp.y, z: vTmp.z, vx: (rng() - .5) * .03, vy: -.02, color: '#fff8e8', size: .012, life: .5, shape: 'glow' });
      }

      /* chapter 2: the forks up, a twirl, a bite; forks down again */
      const take = ease.inOut(seg(g, 10.25, 10.6)) * (1 - ease.inOut(seg(g, 12.6, 12.95)));
      const twirl = seg(g, 10.6, 11.8), lift = ease.inOut(seg(g, 11.75, 12.2)) * (1 - ease.inOut(seg(g, 12.4, 12.7)));
      const grab = bump(g, 10.1, 10.3, 10.45, 10.6) + bump(g, 12.65, 12.8, 12.95, 13.1);
      for (const [m, i, side, s] of [[girl, 0, 'r', 1], [boy, 1, 'l', -1]]) {
        const pasta = pastaAt(-s * .017, -.006, vTip);
        onStage(mouths[i], vM);
        if (grab) reach(m, side, vTmp.copy(REST[i]).setY(REST[i].y + .02), grab);
        if (take) {
          const circle = twirl > 0 && twirl < 1 ? .004 : 0, a = T * 14;
          vH.copy(pasta).add(vTmp.set(-s * .014 + circle * Math.cos(a), .032, -.006 + circle * Math.sin(a)));     // over the pasta, a little circle
          vH.lerp(vTmp.copy(vM).add(vH2.set(-s * .03, -.012, .012)), lift);                                        // up to the mouth
          reach(m, side, vH, take);
          at(m, `handslot.${side}`, vH);
          const tip = vTmp.copy(pasta).lerp(vM, lift);
          forkAt(i, vH, tip, twirl * TAU * 3, take);
          if (lift > .5) m.bend('head', .05 * Math.sin(T * 18) * seg(g, 12.15, 12.3) * (1 - seg(g, 12.55, 12.7)), 0, 0);
        } else forkAt(i, vH, vTip, 0, 0);
        coils[i].scale.setScalar(Math.max(.0001, ease.out(twirl) * (1 - ease.in(seg(g, 12.1, 12.35)))));
        plate.balls[i].scale.setScalar(Math.max(.0001, 1 - ease.in(seg(g, 11.4, 11.7))));                     // a meatball each goes with the twirl
        if (g > 12.2 && g < 12.5 && kit.once(`bite${i}`)) { vTmp.copy(vM); hearts.burst(4, () => ({ x: vTmp.x, y: vTmp.y + .05, z: vTmp.z + .01, vx: (rng() - .5) * .08, vy: .09,
          drag: .7, color: '#ffd166', size: .015, life: 1, shape: 'star', spin: 3 })); }
      }
      const yum = bump(g, 12.25, 12.4, 12.65, 12.85);                     // a happy wriggle
      if (yum) for (const m of [girl, boy]) m.bend('spine', 0, 0, .08 * Math.sin(T * 22) * yum);

      /* chapter 2: down to the plate together; one noodle, slurped from both ends, pulls them into a kiss */
      const down = ease.inOut(seg(g, 12.95, 13.35)), up = ease.back(seg(g, 15.4, 15.85));
      const pulls = [[13.4, 13.75], [13.95, 14.3], [14.5, 14.9]];
      let k = 0, pulling = 0;
      pulls.forEach(([a, b]) => { const p = seg(g, a, b); k += ease.out(p) / 3; if (p > 0 && p < 1) pulling = Math.sin(Math.PI * p); });
      const bend = down * (1 - up);
      mixPose(k, POSE);
      lean(girl, 1, bend, POSE); lean(boy, -1, bend, POSE);
      const strand = g > 13.25 && g < 14.92;
      noodle.mesh.visible = strand;
      if (strand) {
        onStage(mouths[0], vM.set(0, 0, 0)); const a = vTmp.copy(vM); onStage(mouths[1], vH2);
        hangNoodle(a, vH2, .05 * (1 - k), .003 * pulling, T);
        if (pulling && dt && rng() < dt * 22) drops.emit({ x: lerp(a.x, vH2.x, .3 + rng() * .4), y: Math.min(a.y, vH2.y) - .01, z: lerp(a.z, vH2.z, .5),
          vx: (rng() - .5) * .15, vy: .08 + rng() * .08, vz: .04, gravity: -.7, drag: .3, color: '#d2361f', size: .007 + rng() * .005, life: .6, shape: 'glow', floor: TABLE.top + .004 });
      }
      if (g > 14.9 && g < 15.2 && kit.once('kiss')) {                               // the kiss: a pink flash and hearts
        onStage(mouths[0], vM); onStage(mouths[1], vH2); vM.add(vH2).multiplyScalar(.5);
        sparks.burst(30, i => ({ x: vM.x, y: vM.y, z: vM.z + .02, vx: Math.cos(i / 30 * TAU) * (.12 + rng() * .08), vy: Math.sin(i / 30 * TAU) * (.12 + rng() * .08),
          drag: 2.2, color: i % 2 ? '#ffd1dc' : '#fff1b8', size: .02, life: .8, shape: i % 3 ? 'glow' : 'sparkle' }));
        hearts.burst(22, () => ({ x: vM.x, y: vM.y + .02, z: vM.z + .02, vx: (rng() - .5) * .35, vy: .15 + rng() * .25, vz: (rng() - .5) * .15, gravity: -.2, drag: .9,
          color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .022 + rng() * .02, life: 2.4, shape: 'heart', spin: (rng() - .5) * 4 }));
      }
      if (g > 15 && g < 15.3 && kit.once('wow')) for (const m of [girl, boy]) {      // surprise! a star over each head
        at(m, 'head', vTmp); sparks.burst(5, i => ({ x: vTmp.x, y: vTmp.y + .13, z: vTmp.z, vx: (i - 2) * .06, vy: .12, drag: 3, color: '#fff1b8', size: .022, life: .7, shape: 'star', spin: 5 }));
      }

      /* chapter 2: back upright, pink cheeks, a giggle, a shy look away (her hand to her mouth, his to the back of his head) */
      const pink = ease.smooth(seg(g, 15.5, 15.9)) * (1 - .55 * ease.smooth(seg(g, 20.2, 21)));
      blushG.opacity = blushB.opacity = .85 * pink * (1 + .12 * Math.sin(T * 4));
      const giggle = bump(g, 15.7, 15.85, 16.4, 16.7), away = bump(g, 15.95, 16.3, 18.2, 18.7), peek = bump(g, 18.3, 18.6, 19.2, 19.6);
      for (const [m, s] of [[girl, 1], [boy, -1]]) {
        if (giggle) { m.bend('chest', .06 * Math.sin(T * 26) * giggle, 0, 0); m.bend('head', .1 * giggle, 0, s * .12 * giggle); }
        if (away) m.bend('head', .14 * away, -s * .75 * away, s * .1 * away);
        if (peek) m.bend('head', 0, s * .45 * peek, 0);
      }
      const shy = bump(g, 16, 16.35, 18.3, 18.7);
      if (shy) {
        onStage(mouths[0], vM); vM.y -= .006; vTmp.set(.02, 0, -.01).applyQuaternion(girl.root.quaternion); reach(girl, 'l', vM.add(vTmp), shy);
        at(boy, 'head', vH); vTmp.set(-.03, .06, -.05).applyQuaternion(boy.root.quaternion); reach(boy, 'r', vH.add(vTmp), shy);
      }

      /* chapter 2: the photo in its gilt frame, hung on the wall after the flash; chapter 3 carries it onto the menu board */
      const show = ease.back(seg(g, 16.75, 17.25)), toBoard = ease.inOut(seg(g, 26.4, 27.6));
      const swing = g > 16.75 ? .38 * Math.exp(-(g - 16.75) * 2.6) * Math.sin((g - 16.75) * 8.5) : 0;
      const nail = WALL.nail, nz = S.wallZ(nail[0]) + .016;
      frame.visible = g > 16.75;
      vTmp.set(nail[0], nail[1], nz);
      vH.set(EASEL.x, .19 + .02, EASEL.z + .04);                         // on the board's ledge, leaning on it
      const hop = Math.sin(Math.PI * toBoard) * .12, small = .68;           // on the board: its bottom on the ledge
      frame.position.set(lerp(vTmp.x, vH.x, toBoard), lerp(vTmp.y, vH.y + (photo.height + .042) * small, toBoard) + hop, lerp(vTmp.z, vH.z, toBoard));
      frame.scale.setScalar(Math.max(.001, show * lerp(1, small, toBoard)));
      frame.rotation.set(lerp(0, -.06, toBoard), lerp(S.wallTurn(nail[0]), EASEL.turn, toBoard), swing + .02 * Math.sin(T * 1.2) * seg(g, 17.5, 18) - .3 * Math.sin(Math.PI * toBoard));
      photo.halo.material.opacity = .45 * ease.out(seg(g, 17, 17.6)) * (1 + .08 * Math.sin(T * 3));
      if (g > 16.8 && g < 17.6 && dt && rng() < dt * 16) {
        const a = rng() * TAU; vTmp.set(nail[0] + Math.cos(a) * .17, nail[1] - .2 + Math.sin(a) * .2, nz + .02);
        sparks.emit({ x: vTmp.x, y: vTmp.y, z: vTmp.z, color: '#fff1b8', size: .02, life: .8, shape: 'sparkle', spin: 3 });
      }

      /* chapter 3: he nudges the last meatball across the plate to her */
      const last = plate.balls[2], fork2 = ease.inOut(seg(g, 20.9, 21.25)) * (1 - ease.inOut(seg(g, 22.95, 23.3)));
      const roll = ease.inOut(seg(g, 21.4, 22.75));
      const bx0 = .004, bz0 = .011, bx1 = -.03, bz1 = .006;
      const mx = lerp(bx0, bx1, roll), mz = lerp(bz0, bz1, roll) + .008 * Math.sin(Math.PI * roll);
      last.position.set(mx, .0245 - .003 * Math.sin(Math.PI * roll), mz); last.rotation.z = 2 + roll * .034 / .0078;
      const ideaLook = bump(g, 20.3, 20.6, 20.9, 21.2);
      if (ideaLook) boy.bend('head', .12, .35 * ideaLook, 0);
      if (fork2) {
        vTip.set(PLATE.x + mx + .011, PLATE.y + .028, PLATE.z + mz + .002);
        reach(boy, 'l', vH.copy(vTip).add(vTmp.set(.022, .026, .01)), fork2);
        at(boy, 'handslot.l', vH); forkAt(1, vH, vTip, 0, fork2);
        boy.bend('head', .2 * fork2, .1 * fork2, 0);
      } else if (g > 20) forkAt(1, vH, vTip, 0, 0);
      if (roll > 0 && roll < 1 && dt && rng() < dt * 30) sparks.emit({ x: PLATE.x + mx, y: PLATE.y + .036, z: PLATE.z + mz, vx: (rng() - .5) * .03, vy: .05, color: rng() < .5 ? '#ffe3a0' : '#ffb3c7', size: .014, life: .7, shape: 'sparkle', spin: 3 });
      if (g > 22.75 && g < 23 && kit.once('arrived')) hearts.burst(5, () => ({ x: PLATE.x + bx1, y: PLATE.y + .045, z: PLATE.z + bz1, vx: (rng() - .5) * .06, vy: .1 + rng() * .04, drag: .8, color: '#ff4f7b', size: .02, life: 1.4, shape: 'heart', spin: (rng() - .5) * 3 }));
      const smile = bump(g, 22.8, 23.1, 23.9, 24.2), glance = bump(g, 22.2, 22.5, 22.8, 23);
      if (glance) girl.bend('head', .2 * glance, -.1, 0);
      if (smile) {
        girl.bend('head', -.08 * smile, 0, .22 * smile); girl.bend('chest', .05 * Math.abs(Math.sin(T * 10)) * smile, 0, 0);
        at(girl, 'chest', vM); vTmp.set(0, .03, .05).applyQuaternion(girl.root.quaternion); vM.add(vTmp);
        reach(girl, 'r', vM, smile); reach(girl, 'l', vH2.copy(vM).add(vTmp.set(0, 0, -.01)), smile);
      }
      if (g > 23.2 && g < 23.5 && kit.once('smile')) { at(girl, 'head', vTmp); hearts.burst(7, () => ({ x: vTmp.x, y: vTmp.y + .12, z: vTmp.z, vx: (rng() - .5) * .1, vy: .1 + rng() * .05,
        drag: .6, color: ['#ff4f7b', '#ff8fab'][(rng() * 2) | 0], size: .022, life: 1.8, shape: 'heart', spin: (rng() - .5) * 3 })); }

      /* chapter 3: the flame becomes a heart; both look at it */
      const lookFlame = bump(g, 23.8, 24.1, 24.9, 25.2);
      if (lookFlame) { girl.bend('head', .25 * lookFlame, .3 * lookFlame, 0); boy.bend('head', .25 * lookFlame, -.45 * lookFlame, 0); }
      if (g > 24.2 && g < 25.2 && dt && rng() < dt * 25) {
        vTmp.copy(candle.root.position); vTmp.y += candle.top + .01;
        sparks.emit({ x: vTmp.x + (rng() - .5) * .03, y: vTmp.y, z: vTmp.z + .01, vx: (rng() - .5) * .05, vy: .06 + rng() * .05, drag: 1, color: rng() < .5 ? '#ffb3c7' : '#ffe3a0',
          size: .012, life: .9, shape: 'sparkle', spin: 3 });
      }

      /* chapter 3: they hop their chairs round to sit closer, hold hands between them, hearts rising */
      const hold = ease.inOut(seg(g, 25.55, 26.1));
      if (hold) {
        at(girl, 'upperarm.l', vH); at(boy, 'upperarm.r', vH2); vM.addVectors(vH, vH2).multiplyScalar(.5); vM.y -= .012; vM.z += .03;   // above the table's edge
        vM.y += .003 * Math.sin(T * 1.6);
        reach(girl, 'l', vTmp.copy(vM).add(vH2.set(-.006, 0, 0)), hold); reach(boy, 'r', vTmp.copy(vM).add(vH2.set(.006, 0, 0)), hold);
        for (const [m, s] of [[girl, 1], [boy, -1]]) m.bend('head', -.06 * hold, s * .42 * hold, s * .16 * hold * (1 + .2 * Math.sin(T * 1.3)));
      }
      const joined = vTip.set(TABLE.x, .17, TABLE.z - GAP * Math.sin(SCOOT) + .03);   // where the hands meet
      if (g > 26 && g < 26.3 && kit.once('hands')) sparks.burst(18, i => ({ x: joined.x, y: joined.y, z: joined.z + .01, vx: Math.cos(i / 18 * TAU) * .1, vy: Math.sin(i / 18 * TAU) * .1 + .03,
        drag: 2.4, color: i % 2 ? '#ffd1dc' : '#fff1b8', size: .016, life: .8, shape: 'sparkle' }));
      if (g > 26.1 && dt && rng() < dt * (held ? 2 : 4)) hearts.emit({ x: joined.x + (rng() - .5) * .06, y: joined.y + .02, z: joined.z + .01, vx: (rng() - .5) * .03, vy: .07 + rng() * .03,
        sway: .03, color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .016 + rng() * .012, life: 2.6, shape: 'heart', spin: (rng() - .5) * 2 });

      /* chapter 3: little lights across the alley come down, light up, and the ribbon with the last words unrolls */
      const come = ease.back(seg(g, 27.1, 27.8));
      garland.root.position.set(0, .78 + .4 * (1 - come), S.wallZ(.52) + .01); garland.root.visible = g > 27.1;
      garland.root.rotation.z = .03 * Math.sin(T * 1.1) * come;
      garland.bulbs.forEach(({ b, gl }, i) => {
        const on = clamp(ease.back(seg(g, 27.6 + i * .06, 27.8 + i * .06))) * (.85 + .15 * Math.sin(T * 2.6 + i * 2));
        b.material.emissiveIntensity = 2 * on; gl.material.opacity = .75 * on;
      });
      const unroll = ease.elastic(seg(g, 28, 28.9));
      banner.root.scale.set(Math.max(.001, lerp(.6, 1, unroll)), Math.max(.001, unroll), 1);
      banner.root.position.y = -garland.sag - banner.height / 2 * unroll;
      banner.root.rotation.x = -.08 + .03 * Math.sin(T * 1.4);
      if (g > 28.2 && g < 28.5 && kit.once('ribbon')) sparks.burst(24, () => ({ x: (rng() - .5) * .5, y: .62, z: .1, vx: (rng() - .5) * .1, vy: (rng() - .2) * .12,
        drag: 1.5, color: ['#fff1b8', '#ffd1dc'][(rng() * 2) | 0], size: .016, life: 1, shape: 'sparkle', spin: 3 }));

      for (const p of particles) p.update(dt, T);
    }
  };
};
