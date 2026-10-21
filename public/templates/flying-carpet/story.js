/* Thảm bay đêm trăng (a carpet ride under the moon), told by the shared act _acts/lovestory.js; the city is built by
   scenery.js and the rug and word carriers by props.js, both loaded first. Four chapters of ten seconds, each
   ending at a stop:
     1 · 0–10 s    the night city pops up out of the card as dusk turns to night; she comes out onto her balcony, leans on
                   the railing and gazes at the big moon; a rug rises rippling from the street with a young man sitting on
                   it; he stands, bows (the rug bows too) and offers his hand, a scroll unrolls with his question (note1);
                   she steps back and looks back at her door, then steps up and takes his hand
     2 · 10–20 s   she hops onto the rug and they sit; it spins up off the balcony and swoops round over the rooftops; she
                   clutches his arm, then lets go and opens her arms to the wind as clouds drift by; the rug settles and
                   the stars write the second words (note2) on a night cloud
     3 · 20–30 s   the rug glides past the huge moon, the two of them dark against it, doves flying alongside; she leans on
                   his shoulder, then reaches out and touches a cloud, which puffs away; the light comes back and two doves
                   bring the card's photo in on ribbons, with its caption
     4 · 30–40 s   the doves carry the photo aside; lanterns light up along the rooftops, sky lanterns rise, fireworks
                   bloom over the city; they turn to each other and kiss, a heart of fireworks opens, the rug curls up a
                   corner shyly, and three sky lanterns lift a woven banner with the last words (note3)
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own;
   the ripples, the flapping, the fireworks at the last stop and the twinkling go by T, the act's own time. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;
  const PAGE = { width: 1.12, height: 1.0, curve: .08, z: -.3 };      // the painted sky at the back
  const MOON = { x: .12, y: .5, r: .16 };                            // the moon on it
  const HOUSE = { x0: -.5, x1: -.2, z0: -.2, z1: .01, h: .16, top: .45, dz: -.1 };   // her house: the ground floor; the upper storey to dz, up to top
  const BAL = { y: .172, x0: -.47, x1: -.2, z0: -.1, z1: .2, gap: [.05, .195], rail: .165 };   // her balcony's floor; the opening in its railing (z); the railing's height: a grown-up's waist (.55 of his)
  const S = window.NM_CARPET.scenery(kit, { PAGE, MOON, HOUSE, BAL }), P = window.NM_CARPET.props(kit);
  const DOCK = [-.015, BAL.y + .004, .13];                              // the rug by the opening, its front to her (yaw -R)
  const SEAT = { boy: [-.075, .02], girl: [.075, .02] };              // where they sit on the rug, in its own space: she on his left
  /** how far ahead of him she sits: at the balcony the rug's front faces it, so you see them one behind the other; a little
      ahead, she is not in his lap. She moves up beside him as the rug spins up off the balcony */
  const ahead = g => .07 * (1 - ease.inOut(seg(g, 12.5, 13.3)));
  const LEAN = [-.268, -.02], GATE = [-.25, .124];                  // where she leans on the railing (her toes short of it); the opening
  const HOVER = [[0, .24, .07, 0], [.04, .23, .12, .35], [0, .2, .08, 0]];   // where the rug waits at stops 2, 3 and 4: x, y, z, yaw
  const PHOTO3 = [.34, .3, .1], PHOTO4 = [.43, .245, -.05];           // the photo (its foot) at stop 3, and aside at stop 4
  const DUSK = { hemi: new THREE.Color('#f3d6ff'), ground: new THREE.Color('#6f4f7a'), sun: new THREE.Color('#ffd2b0') };
  const NIGHT = { hemi: new THREE.Color('#a9b8ff'), ground: new THREE.Color('#3a3260'), sun: new THREE.Color('#cfdaff') };
  const FEST = { hemi: new THREE.Color('#d6c4ff'), ground: new THREE.Color('#5c3a64'), sun: new THREE.Color('#ffe2c8') };
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  const H = .3;                                                      // his height; hers is H * .945 (1.70 m to his 1.80)
  let boy, girl, rug, page, house, square, roofs, strings = [], lanterns = [], lifters = [], clouds = [], doves = [], cords = [];
  let scroll, cloudNote, banner, photo, rim, flash, sparks, hearts, stars, mist, fire, shine = [];

  /* ── who does what, from story time g: [from g, clip, options] ── */
  const BOY = [
    [0, 'Sit_Floor_Idle'], [5.6, 'Sit_Floor_StandUp', { once: true, fade: .2 }], [6.7, 'Idle', { fade: .25 }],
    [7.1, 'Walking_A', { speed: 1.5, fade: .2 }], [7.8, 'Idle', { fade: .2 }],
    [10.0, 'Walking_Backwards', { speed: 1.8, fade: .2 }], [10.6, 'Idle', { fade: .2 }],
    [11.4, 'Sit_Floor_Down', { once: true, fade: .2 }], [12.4, 'Sit_Floor_Idle', { fade: .3 }]
  ];
  const GIRL = [
    [0, 'Idle'], [.95, 'Walking_A', { speed: 1.1, fade: .25 }], [2.05, 'Idle', { fade: .3 }],
    [5.2, 'Walking_A', { speed: 2, fade: .25 }], [6.1, 'Idle', { fade: .25 }],
    [7.85, 'Walking_Backwards', { speed: .7, fade: .2 }], [8.25, 'Idle', { fade: .2 }],
    [8.85, 'Walking_A', { speed: .7, fade: .2 }], [9.2, 'Idle', { fade: .2 }],
    [10.25, 'Jump_Full_Short', { once: true, fade: .12 }], [11.15, 'Idle', { fade: .2 }],
    [11.45, 'Sit_Floor_Down', { once: true, fade: .2 }], [12.45, 'Sit_Floor_Idle', { fade: .3 }]
  ];
  /* her way on the balcony until she hops on: [g, x, z, facing, ease into it] (out of her door, to the railing, along it
     to the opening, her hand clear of its post) */
  const GIRL_WAY = [[0, -.37, -.01, .35], [.95, -.37, -.01, .35], [1.25, -.355, -.01, 1.1], [2.0, LEAN[0] - .02, LEAN[1], R], [2.2, ...LEAN, 1.6],
    [5.15, ...LEAN, 1.6], [5.4, LEAN[0] - .012, LEAN[1] + .015, .4], [5.72, LEAN[0] - .008, .065, .42, 'in'], [6.0, GATE[0], GATE[1] - .008, .45, 'out'],
    [6.3, ...GATE, R - .45],                                         // half to you at the opening
    [7.85, ...GATE, R - .45], [8.25, GATE[0] - .026, GATE[1], R - .45], [8.85, GATE[0] - .026, GATE[1], R - .45], [9.2, ...GATE, R - .45]];
  const wayKeys = [1, 2, 3].map(i => GIRL_WAY.map(k => [k[0], k[i], k[4] || 'smooth']));

  /* ── the rug's flight: paths, and its pose (place, heading, pitch into a climb, bank into a turn) along them ── */
  const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal', .5);
  const RISE = curve([[.14, .02, .25], [.09, .07, .2], [.03, .13, .13], DOCK]);
  const LOOP = curve([[.06, .27, .1], [.22, .29, .14], [.32, .33, .02], [.2, .38, -.1], [.02, .4, -.11], [-.03, .34, -.01], [0, .26, .14], [.1, .23, .16]]);
  const PASS = curve([[0, .24, .07], [.17, .3, .09], [.32, .37, .04], [.38, .43, -.04], [.33, .46, -.1], [.2, .47, -.11], [.08, .45, -.1], [-.03, .44, -.09]]);   // up, round, and past the moon
  const DOWN3 = curve([[-.03, .44, -.09], [-.04, .41, .02], [-.02, .31, .11], [.04, .23, .12]]);
  /** u (0..1) along a path at g from a speed profile [[g, speed], …]: the area under it so far, over the whole (no jolts) */
  const glide = keys => {
    const area = g => { let a = 0; for (let i = 1; i < keys.length; i++) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; if (g <= t0) break;
      const t = Math.min(g, t1); a += (v0 + v0 + (v1 - v0) * (t - t0) / (t1 - t0)) / 2 * (t - t0); } return a; };
    const all = area(keys[keys.length - 1][0]); return g => area(g) / all;
  };
  const LOOP_U = glide([[13.3, 0], [13.75, 1], [16.8, 1], [17.4, 0]]), PASS_U = glide([[20, 0], [20.45, 1], [21.3, 1], [22, .34], [24.7, .34], [25.2, 0]]);
  const unwrap = (a, near) => near + Math.atan2(Math.sin(a - near), Math.cos(a - near));
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(), eQ = new THREE.Euler(0, 0, 0, 'YXZ');
  const fly = { p: new THREE.Vector3(), yaw: 0, pitch: 0, roll: 0, wind: 0 };
  function along(path, u) {
    const a = clamp(u, 0, .999);
    path.getPointAt(a, fly.p); path.getTangentAt(a, vA); path.getTangentAt(Math.min(1, a + .03), vB);
    fly.yaw = Math.atan2(vA.x, vA.z); fly.pitch = -Math.asin(clamp(vA.y, -1, 1)) * .6;
    fly.roll = clamp(-wrap(Math.atan2(vB.x, vB.z) - fly.yaw) * 2.4, -.45, .45);
    return fly;
  }
  const at = (p, yaw = 0, pitch = 0, roll = 0, wind = 0) => { fly.p.set(p[0], p[1], p[2]); Object.assign(fly, { yaw, pitch, roll, wind }); return fly; };
  const LOOP_END = along(LOOP, 1).yaw;
  /** where the rug is at g (bobbing by T while it waits) */
  function rugAt(g, T) {
    let f;
    if (g < 5.4) { const u = ease.out(seg(g, 3.3, 5.4)); f = along(RISE, u); f.yaw = lerp(-1.05, -R, ease.inOut(seg(g, 4.3, 5.4))); f.pitch = -.1 * Math.sin(Math.PI * u); f.roll = .06 * Math.sin(T * 2); f.wind = .6 * (1 - seg(g, 4.6, 5.4)); }
    else if (g < 12.3) f = at(DOCK, -R);
    else if (g < 13.3) {                                             // up off the balcony, spinning round to face the city
      const k = ease.inOut(seg(g, 12.3, 13.3)); vC.set(...DOCK).lerp(vA.set(.06, .27, .1), k);
      f = at([vC.x, vC.y + .02 * Math.sin(Math.PI * k), vC.z], lerp(-R, R, k), -.12 * Math.sin(Math.PI * k), 0, .5 * Math.sin(Math.PI * k));
    } else if (g < 17.4) { f = along(LOOP, LOOP_U(g)); f.wind = 1 - .6 * seg(g, 16.9, 17.4); }
    else if (g < 20) {                                              // it slows, turns to you and waits
      const k = ease.inOut(seg(g, 17.4, 18.4)), end = LOOP.getPointAt(1, vC);
      f = at([lerp(end.x, HOVER[0][0], k), lerp(end.y, HOVER[0][1], k), lerp(end.z, HOVER[0][2], k)], lerp(LOOP_END, 0, k), 0, .2 * (1 - k) * Math.sin(Math.PI * k), .4 * (1 - k));
    } else if (g < 25.2) {                                           // round to the right and back, then slowly past the moon
      const u = PASS_U(g); f = along(PASS, u);
      f.yaw = lerp(0, unwrap(f.yaw, lerp(R, 3 * R, u)), ease.inOut(seg(g, 20, 20.7))); f.pitch *= .6; f.roll *= lerp(1, .3, seg(g, 21.4, 22)); f.wind = .55 + .3 * bump(g, 20.3, 20.7, 21.2, 21.8);
    } else if (g < 30) { const k = ease.inOut(seg(g, 25.2, 26.8)); f = along(DOWN3, k); f.yaw = lerp(3 * R, unwrap(HOVER[1][3], 3 * R + .8), k); f.roll *= .4 * (1 - k); f.pitch *= 1 - k; f.wind = .5 * (1 - k); }
    else {                                                           // over to the middle, facing you
      const k = ease.inOut(seg(g, 30, 31.6)), a = HOVER[1], b = HOVER[2];
      f = at([lerp(a[0], b[0], k), lerp(a[1], b[1], k) + .03 * Math.sin(Math.PI * k), lerp(a[2], b[2], k)], lerp(unwrap(a[3], 3 * R + .8), unwrap(b[3], 3 * R + .8 - .35), k), 0, -.08 * Math.sin(Math.PI * k), .3 * Math.sin(Math.PI * k));
    }
    const wait = bump(g, 5, 5.4, 12.3, 12.6) + bump(g, 17.9, 18.4, 20, 20.4) + bump(g, 26.3, 26.8, 30, 30.4) + ease.smooth(seg(g, 31.2, 31.6));   // bobbing while it waits
    if (wait) { fly.p.y += .005 * Math.sin(T * 2.1) * wait; fly.roll += .025 * Math.sin(T * 1.7) * wait; fly.pitch += .02 * Math.sin(T * 1.3 + 1) * wait; }
    return f;
  }

  /* ── helpers: a point in stage space; aiming an arm at a point on the stage (the riders sit on the rug, so world turns count) ── */
  const mStage = new THREE.Matrix4(), qW = new THREE.Quaternion(), vS = new THREE.Vector3(), vT = new THREE.Vector3(), vH = new THREE.Vector3(), vH2 = new THREE.Vector3();
  const onStage = (o, out) => { o.updateWorldMatrix(true, false); return out.setFromMatrixPosition(o.matrixWorld).applyMatrix4(mStage); };
  function reach(m, side, target, k, bendElbow = 0) {
    if (k <= 0) return;
    const b = m.node(`upperarm.${side}`); onStage(b, vS);
    stage.getWorldQuaternion(qW); vT.copy(target).sub(vS).applyQuaternion(qW);   // the stage's direction, in the world
    m.root.getWorldQuaternion(qW); vT.applyQuaternion(qW.invert()).normalize();     // and in the character's own space
    m.aim(`upperarm.${side}`, [vT.x, vT.y - bendElbow, vT.z], k); m.aim(`lowerarm.${side}`, [vT.x, vT.y + bendElbow, vT.z], k);
  }
  const clasp = (m, k) => { if (k <= 0) return; m.aim('upperarm.r', [-.25, -.45, .85], k); m.aim('lowerarm.r', [.7, .45, .55], k); m.aim('upperarm.l', [.25, -.45, .85], k); m.aim('lowerarm.l', [-.7, .45, .55], k); };
  /** an arm that puts the hand on a point on the stage: two bones, the elbow bending towards `pole` (own space, given for
      the right arm; the left mirrors it); out of reach, the arm points straight at it */
  const SPAN = new Map(), vN = new THREE.Vector3(), vQ = new THREE.Vector3(), vE = new THREE.Vector3(), vL = new THREE.Vector3();
  function handOn(m, side, target, k, pole) {
    if (k <= 0) return;
    const up = m.node(`upperarm.${side}`), key = m.root.name + side;
    if (!SPAN.has(key)) SPAN.set(key, [onStage(up, vN).distanceTo(onStage(m.node(`lowerarm.${side}`), vQ)), vQ.distanceTo(onStage(m.node(`handslot.${side}`), vE))]);
    const [a, b] = SPAN.get(key);
    onStage(up, vS); stage.getWorldQuaternion(qW); vL.copy(target).sub(vS).applyQuaternion(qW);
    m.root.getWorldQuaternion(qW); vL.applyQuaternion(qW.invert());   // the way to it, in the character's own space
    const dist = vL.length() || 1, A = Math.acos(clamp((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1));
    vN.copy(vL).divideScalar(dist);
    vQ.set(side === 'r' ? pole[0] : -pole[0], pole[1], pole[2]).addScaledVector(vN, -vQ.dot(vN)).normalize();
    vE.copy(vN).multiplyScalar(Math.cos(A)).addScaledVector(vQ, Math.sin(A));     // the upper arm, to the elbow
    vL.addScaledVector(vE, -a);                                                    // the forearm, from the elbow to the point
    m.aim(`upperarm.${side}`, vE.toArray(), k); m.aim(`lowerarm.${side}`, vL.toArray(), k);
  }
  const toRug = (x, y, z, out) => out.set(x, y, z).applyQuaternion(rug.root.quaternion).add(rug.root.position);
  /* bursts */
  const fizz = (x, y, z, n, s = .3, cols = ['#fff1b8', '#ffd1dc', '#ffffff', '#c9d6ff']) => sparks.burst(n, () => ({ x, y, z, vx: (rng() - .5) * s, vy: rng() * s, vz: (rng() - .5) * s * .6,
    drag: 2.4, color: cols[(rng() * cols.length) | 0], size: .018, life: .9, shape: rng() < .6 ? 'sparkle' : 'glow', spin: 4 }));
  const love = (x, y, z, n, s = .2) => hearts.burst(n, () => ({ x, y, z, vx: (rng() - .5) * s, vy: .1 + rng() * s, vz: (rng() - .5) * s * .4, gravity: -.12,
    drag: .8, color: ['#ff4f7b', '#ff8fab', '#ffc2d1', '#e8436d'][(rng() * 4) | 0], size: .02 + rng() * .016, life: 2.2, shape: 'heart', spin: (rng() - .5) * 3 }));
  const FW_COLS = ['#ffd166', '#ff8fab', '#9be7ff', '#c5a3ff', '#ffb36b', '#ffffff'];
  function boom(x, y, z, col, n = 30, s = .12) {
    fire.burst(n, i => { const a = i / n * TAU + rng() * .15, v = s * (.85 + rng() * .3); return { x, y, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, gravity: -.09, drag: 1.25,
      color: rng() < .2 ? '#ffffff' : col, size: .017, life: 1.5, shape: i % 3 ? 'glow' : 'sparkle', twinkle: i % 4 ? 0 : 9 }; });
    flash.position.set(x, y, z + .2); flash.color.set(col === '#ffffff' ? '#ffe9b8' : col); flash.userData.at = flash.userData.clock;
  }
  const fwRand = S.seeded(77);
  const FIREWORKS = Array.from({ length: 13 }, (_, i) => ({ t: 31 + i * .66, x: (fwRand() - .5) * .84, y: .6 + fwRand() * .24, col: FW_COLS[i % FW_COLS.length] }));
  const skyRand = S.seeded(91);

  return {
    seconds: [10, 10, 10, 10],

    build() {
      /* the two of them (the shared couple, templates/_models) and the rug they ride */
      boy = kit.model('boy').fit({ height: H }); girl = kit.model('girl').fit({ height: H * .945 });
      for (const m of [boy, girl]) m.scene?.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(x => { if (x && !shine.includes(x)) shine.push(x); }); });
      rug = P.rug({ L: .36, W: .3 }); stage.add(rug.root, girl.root); rug.root.add(boy.root);

      /* the city: the sky page with its moon, her house and balcony, rooftops, strings of lanterns */
      page = S.pages(); stage.add(page.dusk, page.night, page.back, page.glow);
      house = S.house(); square = S.plaza(); stage.add(house.root, square.root);
      roofs = S.rooftops(); roofs.forEach(([o]) => stage.add(o));
      for (const [a, b, n, sag, cols, lit] of [
        [[-.045, .09, -.17], [.065, .125, -.13], 4, .03, ['#ffcf7a', '#ff9f8a', '#ffe6a6'], 30.5],
        [[.215, .125, -.13], [.26, .175, -.165], 2, .018, ['#ff9f8a', '#ffcf7a'], 31.1],
        [[.34, .175, -.165], [.443, .145, -.168], 3, .024, ['#ffe6a6', '#ff9f8a', '#ffcf7a'], 31.5],
        [[BAL.x0 + .015, BAL.y - .03, BAL.z1 - .016], [BAL.x1 - .015, BAL.y - .03, BAL.z1 - .016], 6, .02, ['#ffcf7a', '#ff9f8a'], 0]]) {
        const s = S.lanternString(a, b, n, sag, cols); stage.add(s.root); s.lamps.forEach((l, i) => strings.push({ ...l, at: lit ? lit + i * .12 : .9 + i * .05 }));
      }
      [...house.lamps, ...square.lamps].forEach(l => strings.push({ ...l, at: .9 }));
      [-.45, -.03, .375, -.31, .03, -.12, .395, -.38, -.24].forEach((x, i) => {   // sky lanterns rising from between the rooftops at the end
        const l = S.skyLantern(.8 + skyRand() * .5); stage.add(l.root);
        lanterns.push({ ...l, x, z: -.2 + skyRand() * .04, speed: .045 + skyRand() * .03, ph: skyRand(), at: 30.6 + i * .28 });
      });
      for (let i = 0; i < 3; i++) { const l = S.skyLantern(1.5); stage.add(l.root); lifters.push(l); }   // the three that lift the banner
      clouds = [[11, .2], [12, .16], [13, .15], [14, .1]].map(([s, w]) => { const c = S.cloud(s, w); stage.add(c.root); return c; });
      doves = [0, 1, 2].map(() => { const d = S.dove(); stage.add(d.root); return d; });
      cords = [0, 1].map(() => {                                     // the ribbons the doves carry the photo by
        const g = kit.keep(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        const l = new THREE.Line(g, kit.keep(new THREE.LineBasicMaterial({ color: 0xfff1d6 }))); l.frustumCulled = false; stage.add(l); return l;
      });

      /* the card's words and photo */
      scroll = P.scroll(words('note1', 'Em có tin vào phép màu không?'));
      cloudNote = P.cloudNote(words('note2', 'Nắm tay anh, đừng sợ nhé'));
      banner = P.banner(words('note3', 'Thế giới của anh là em'));
      photo = kit.polaroid({ width: .24, caption: words('caption', 'Bay cùng nhau qua đêm trăng'), glow: .5, halo: true, haloColor: 0xffe2b0, captionMax: 64 });
      stage.add(scroll.root, cloudNote.root, banner.root, photo.root);

      /* light: a moon behind them to go dark against, fireworks that light them in colour */
      rim = new THREE.DirectionalLight(0xfff0d0, 0); rim.position.set(.05, .5, -1.6); rim.target.position.set(0, .45, 0); stage.add(rim, rim.target);   // from straight behind: only their backs
      flash = new THREE.PointLight(0xffd166, 0, 1.6, 1.4); flash.userData = { at: -9, clock: 0 }; stage.add(flash);

      /* particles */
      [sparks, hearts, stars, mist, fire] = [{ max: 420, additive: true }, { max: 160 }, { max: 70, additive: true }, { max: 90 }, { max: 700, additive: true }].map(o => kit.particles(o));
      stage.add(sparks.root, hearts.root, stars.root, mist.root, fire.root);
    },

    reset() {
      [sparks, hearts, stars, mist, fire].forEach(p => p.clear());
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();
      flash.userData.clock = T;

      /* ── light: dusk to night; dark against the moon in chapter 3; festive at the end ── */
      const night = ease.smooth(seg(g, .8, 3.6)), fest = ease.smooth(seg(g, 30.5, 32.5)), sil = bump(g, 21.4, 22.1, 24.9, 25.6);
      const L = kit.lights;
      L.hemi.color.copy(DUSK.hemi).lerp(NIGHT.hemi, night).lerp(FEST.hemi, fest); L.hemi.groundColor.copy(DUSK.ground).lerp(NIGHT.ground, night).lerp(FEST.ground, fest);
      L.sun.color.copy(DUSK.sun).lerp(NIGHT.sun, night).lerp(FEST.sun, fest);
      L.hemi.intensity = lerp(1.05, .78, night) * (1 - .9 * sil); L.sun.intensity = lerp(1.25, .9, night) * (1 - .95 * sil);
      rim.intensity = 1.8 * sil; house.light.intensity = .55 * (1 - .8 * sil);
      shine.forEach(m => { m.envMapIntensity = 1 - .92 * sil; });       // the act's soft studio would light them up: dark against the moon
      flash.intensity = .75 * fest * Math.exp(-5 * Math.max(0, T - flash.userData.at));
      page.night.material.opacity = night;
      const fold = ease.out(seg(g, 0, .75)), wob = g > .75 ? Math.exp(-6 * (g - .75)) * Math.sin(14 * (g - .75)) : 0;
      [page.dusk, page.night, page.back].forEach(p => { p.rotation.x = -R * (1 - fold) + .08 * wob; });   // lying flat behind the card, it folds up
      page.glow.material.opacity = fold * (.16 * night + .3 * sil) * (1 + .05 * Math.sin(T * 1.3));
      page.glow.scale.setScalar(MOON.r * 3.2 * (1 + .15 * sil));
      if (g > .5 && kit.once('stars')) stars.burst(60, i => { const x = (rng() - .5) * 1.04; return { x, y: .5 + rng() * .48, z: page.zAt(x) + .012,
        color: ['#ffffff', '#fff2c4', '#cfe0ff'][i % 3], size: .007 + rng() * .011, life: 1e6, shape: i % 4 ? 'glow' : 'star', twinkle: 1.5 + rng() * 3.5 }; });

      /* ── the city pops up out of the card ── */
      const pop = (o, at) => { const k = ease.back(seg(g, at, at + .4)), sq = g > at + .4 ? .06 * Math.exp(-8 * (g - at - .4)) * Math.sin(20 * (g - at - .4)) : 0;
        o.scale.set(Math.max(.001, k * (1 + sq)), Math.max(.001, k * (1 - sq)), Math.max(.001, k * (1 + sq))); o.visible = g > at; };
      pop(house.root, .25); roofs.forEach(([o, when]) => pop(o, when));
      strings.forEach((s, i) => {                                    // the lanterns: hers glow from the start, the city's light up at the end
        const k = ease.out(seg(g, s.at, s.at + .3)), f = 1 + .08 * Math.sin(T * 9 + i * 2.1);
        s.glass.emissiveIntensity = .25 + 1.9 * k * f; s.glow.material.opacity = .85 * k * f;
        if (s.at > 20 && g > s.at && g < s.at + .5 && kit.once(`lamp${i}`)) { s.root.updateWorldMatrix(true, false); onStage(s.root, vH); fizz(vH.x, vH.y, vH.z, 5, .12); }
      });

      /* ── the rug ── */
      const f = rugAt(g, T);
      rug.root.position.copy(f.p); rug.root.quaternion.setFromEuler(eQ.set(f.pitch, f.yaw, f.roll, 'YXZ'));
      const appear = ease.back(seg(g, 3.3, 3.75));
      rug.root.scale.setScalar(Math.max(.001, appear)); rug.root.visible = g > 3.3;
      const bow = bump(g, 6.75, 6.95, 7.0, 7.35), shy = ease.out(seg(g, 35.0, 36.2)), sag = Math.sin(Math.PI * seg(g, 10.88, 11.35)) * .9;
      const wave = bump(g, 8.3, 8.45, 8.75, 8.95) + .5 * bump(g, 3.5, 3.7, 4.6, 5.0);
      rug.update({ T, wind: f.wind, bow, sag, wave, curl: shy * (.82 + .08 * Math.sin(T * 4.2)), side: 1 });
      if (g > 3.32 && g < 4 && kit.once('rug')) fizz(f.p.x, f.p.y + .02, f.p.z, 24, .35, ['#ffd166', '#fff1b8', '#ff8fab']);
      if (dt && f.wind > .2 && rug.root.visible) {                    // sparkles off its back edge as it flies
        toRug(0, 0, -rug.L / 2, vH); for (let i = 0; i < 2; i++) sparks.emit({ x: vH.x + (rng() - .5) * .08, y: vH.y + (rng() - .5) * .02, z: vH.z + (rng() - .5) * .08, vy: -.02, drag: 1,
          color: ['#fff1b8', '#ffd1dc', '#ffd166', '#ffffff'][(rng() * 4) | 0], size: (.01 + rng() * .012) * (.6 + f.wind * .4), life: .6 + rng() * .4, shape: rng() < .5 ? 'sparkle' : 'glow', spin: 3 });
      }
      if (dt && g > 12.3 && g < 13.3) for (let i = 0; i < 3; i++) {   // a whirl of sparkles as it spins up
        const a = g * 11 + i * TAU / 3; sparks.emit({ x: f.p.x + Math.cos(a) * .2, y: f.p.y - .02 + rng() * .06, z: f.p.z + Math.sin(a) * .2, vx: -Math.sin(a) * .1, vy: .05, vz: Math.cos(a) * .1,
          drag: 1.2, color: ['#fff1b8', '#ffd166', '#ffd1dc'][i], size: .02, life: .8, shape: i ? 'sparkle' : 'glow', spin: 4 });
      }

      /* ── him: on the rug from the start; he stands, bows, steps up to her, steps back and sits by her ── */
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g);
      boy.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);
      boy.root.visible = g > 3.3;
      const bz = tween(g, [[7.1, -.02], [7.8, .085, 'linear'], [10.0, .085], [10.6, SEAT.boy[1], 'smooth']]), bx = tween(g, [[10.0, 0], [10.6, SEAT.boy[0], 'smooth']]);
      const turnIn = ease.inOut(seg(g, 32, 33)), kissX = lerp(1, .42, turnIn), toYou = .6 * bump(g, 7.6, 8.0, 10.0, 10.4);   // half to you while he offers his hand
      boy.root.position.set(bx * kissX, rug.heightAt(bx, bz), bz); boy.root.rotation.set(0, toYou, 0);

      /* ── her: on the balcony, then a hop onto the rug; seated on it from then on ── */
      if (g < 10.9) {
        if (girl.root.parent !== stage) stage.add(girl.root);
        let x = tween(g, wayKeys[0]), z = tween(g, wayKeys[1]), y = BAL.y, yaw = tween(g, wayKeys[2]);
        if (g > 10.5) {                                              // the hop: from the opening up and over to her place on the rug
          const u = ease.inOut(seg(g, 10.5, 10.9)), to = toRug(SEAT.girl[0], rug.heightAt(SEAT.girl[0], SEAT.girl[1] + ahead(g)), SEAT.girl[1] + ahead(g), vH);   // in the air with the jump's own lift-off
          x = lerp(GATE[0], to.x, u); z = lerp(GATE[1], to.z, u * u); y = lerp(BAL.y, to.y, u) + .06 * Math.sin(Math.PI * u); yaw = lerp(yaw, R, u);   // out through the middle of the opening, clear of its posts
        }
        girl.root.position.set(x, y, z); girl.root.rotation.set(0, yaw, 0);
      } else {
        if (girl.root.parent !== rug.root) rug.root.add(girl.root);
        girl.root.position.set(SEAT.girl[0] * kissX, rug.heightAt(SEAT.girl[0], SEAT.girl[1] + ahead(g)), SEAT.girl[1] + ahead(g));
        girl.root.rotation.set(0, lerp(Math.PI, 0, ease.inOut(seg(g, 11.05, 11.45))), 0);
      }
      const show = ease.back(seg(g, .55, .9)); girl.root.scale.setScalar(Math.max(.001, show)); girl.root.visible = g > .55;
      if (g > .6 && g < 1.4 && kit.once('her')) fizz(-.37, BAL.y + .15, -.01, 14, .25);
      if (g > 10.9 && g < 11.5 && kit.once('land')) { toRug(SEAT.girl[0], 0, SEAT.girl[1] + ahead(g), vH); fizz(vH.x, vH.y + .01, vH.z, 16, .3); }

      /* ── chapter 1's gestures ── */
      const lean = bump(g, 2.1, 2.5, 4.55, 4.9);                      // leaning on the railing (it comes to her waist), her hands together on its rail, gazing up at the moon, a sigh
      if (lean) {
        const sigh = Math.sin(Math.PI * seg(g, 3.2, 4.2));
        girl.bend('Spine02', .22 - .06 * sigh, 0, 0, lean); girl.bend('spine', .14, 0, 0, lean);   // over the rail from the waist: bent before the arms reach
        girl.bend('head', -.75 + .05 * Math.sin(g * 2.2), .28, .08 * Math.sin(g * 1.3), lean);
        for (const [side, dz] of [['r', .008], ['l', -.008]])        // over the top onto the rail, and off it the same way
          handOn(girl, side, vH.set(BAL.x1 - .005, BAL.y + BAL.rail + .006 + .08 * (1 - lean), girl.root.position.z + dz), lean, [-.7, -.6, -.2]);
      }
      const notice = bump(g, 4.55, 4.8, 5.2, 5.5);                     // she sees the rug rising: a start, a look
      if (notice) { girl.bend('head', .1, -.6, 0, notice); girl.bend('spine', -.12 * Math.sin(Math.PI * seg(g, 4.75, 5.15)), 0, 0, notice); }
      if (g > 4.75 && g < 5.15) girl.root.position.y += .012 * Math.sin(Math.PI * seg(g, 4.75, 5.15));
      const delight = bump(g, 6.15, 6.45, 7.75, 8.0);                  // hands together, watching him bow
      if (delight) { clasp(girl, delight); girl.bend('head', .05, 0, .2 * Math.sin(T * 2.2), delight); }
      const unsure = bump(g, 7.85, 8.05, 8.75, 8.95);                  // a step back, hands to her chest, a look back at her door
      if (unsure) { clasp(girl, unsure); girl.bend('chest', -.08, 0, 0, unsure); girl.bend('head', .1, .7 * bump(g, 8.2, 8.4, 8.6, 8.8), 0, unsure); }
      const standBow = bump(g, 6.72, 6.9, 7.05, 7.3);                  // his bow, a hand on his heart
      if (standBow) { boy.bend('spine', .32, 0, 0, standBow); boy.bend('chest', .2, 0, 0, standBow); boy.aim('upperarm.r', [-.25, -.4, .85], standBow); boy.aim('lowerarm.r', [.75, .35, .5], standBow); }
      const offer = bump(g, 7.75, 8.0, 10.2, 10.5), nod = bump(g, 8.35, 8.5, 8.75, 8.9);
      toRug(-.02, .2, .19, vT);                                       // where their hands meet, over the opening
      const meet = vH2.set(lerp(vT.x, BAL.x1 + .015, .6), BAL.y + .2, GATE[1] + .035);
      if (g < 11) meet.lerp(onStage(girl.node('upperarm.r'), vT), ease.inOut(seg(g, 10.2, 10.85)) * .5);   // her hand comes with her as she hops
      if (offer) { reach(boy, 'l', meet, offer, .12); boy.bend('head', .08, 0, -.2 * nod, offer); }
      const take = bump(g, 9.15, 9.5, 10.85, 11.0);
      if (take) reach(girl, 'r', meet, take, .1);
      if (g > 9.5 && g < 10.6 && kit.once('touch')) { fizz(meet.x, meet.y, meet.z, 22, .35, ['#ffd166', '#fff1b8', '#ffd1dc']); love(meet.x, meet.y + .03, meet.z, 8, .15); }

      /* ── seated on the rug: she holds his arm, then opens her arms to the wind; they lean together; they kiss ── */
      const seated = g > 12.2;
      const grip = bump(g, 12.4, 12.8, 15.2, 15.5) * (1 - turnIn);      // she clutches his arm, her head on his shoulder
      if (grip) { reach(girl, 'r', onStage(boy.node('upperarm.l'), vH), grip, .25); reach(girl, 'l', vH.add({ x: 0, y: -.02, z: .02 }), grip * .9, .1); girl.bend('head', .1, -.25, .3, grip); girl.bend('spine', 0, 0, .12, grip); }
      const wide = bump(g, 15.7, 16.1, 17.5, 17.9);                    // arms open to the wind
      if (wide) { girl.aim('upperarm.l', [.75, .62, .2], wide); girl.aim('lowerarm.l', [.8, .6, .1], wide); girl.aim('upperarm.r', [-.3, .92, .25], wide); girl.aim('lowerarm.r', [-.25, .96, .1], wide); girl.bend('head', -.3, 0, .1 * Math.sin(T * 3), wide); }
      if (g > 15.3 && g < 15.75) girl.bend('head', -.1, .5 * Math.sin((g - 15.3) * 14), 0, bump(g, 15.25, 15.35, 15.6, 15.75));   // a peek round
      const hold = seated && g < 32 ? bump(g, 12.6, 13, 24.6, 25) + bump(g, 25.6, 26, 31.6, 32) : 0;   // his hands on the rug's edge
      const around = bump(g, 22.2, 22.7, 23.6, 24.0) + bump(g, 26.9, 27.4, 31.8, 32.2);   // his arm round her (she leans on his shoulder)
      if (hold) { boy.aim('upperarm.r', [-.55, -.75, .3], hold); boy.aim('lowerarm.r', [-.35, -.9, .3], hold); boy.aim('upperarm.l', [.55, -.75, .3], hold * (1 - around)); boy.aim('lowerarm.l', [.35, -.9, .3], hold * (1 - around)); }
      const laugh = bump(g, 15.9, 16.2, 17.5, 17.8);
      if (laugh) { boy.bend('head', -.12 + .06 * Math.sin(T * 14), .45, 0, laugh); boy.bend('chest', -.06, 0, 0, laugh); }
      const upAtWords = bump(g, 18.7, 19, 20, 20.3);                   // they look up at the words being written
      if (upAtWords) { boy.bend('head', -.35, -.1, 0, upAtWords); girl.bend('head', -.35, .1, 0, upAtWords); clasp(girl, upAtWords); }
      if (around) { girl.bend('head', 0, -.2, .32, around); girl.bend('spine', 0, 0, .14, around); boy.bend('head', 0, .15, -.12, around);
        boy.aim('upperarm.l', [.6, .1, -.25], around); boy.aim('lowerarm.l', [.3, .2, .9], around); }
      const touch = bump(g, 23.75, 24.3, 24.55, 25.0);                 // she reaches out to the cloud
      if (touch) { const c = clouds[3].root; reach(girl, 'l', onStage(c, vT), touch, 0); girl.bend('chest', .1, 0, -.12, touch); }
      const look3 = bump(g, 26.4, 26.8, 30, 30.3);                     // at the photo coming down
      if (look3) { girl.bend('head', -.1, .5, 0, look3); boy.bend('head', -.05, .5, 0, look3); }
      /* the end: the floor clip leans them back on their hands; they sit up side by side, the knee nearest the other one
         drawn up and the far hand on the far knee, and lean together to kiss, heads tipped together, faces still to you.
         The backs bend before the arms reach: a bend afterwards would swing the arms out of place */
      const up = ease.smooth(seg(g, 32, 33)), kiss = ease.smooth(seg(g, 33.3, 34.0));
      if (up) for (const [m, s] of [[boy, 1], [girl, -1]]) {        // s: 1 when the other one is on its left
        const near = s > 0 ? 'l' : 'r', far = s > 0 ? 'r' : 'l';
        m.bend('spine', .25 * up, 0, -s * .14 * kiss); m.bend('chest', .2 * up, s * .3 * turnIn, -s * .1 * kiss);   // turned to each other from the chest up
        m.bend('head', -.12 * kiss, s * .7 * kiss, -s * .05 * kiss);   // two profiles meeting, to you
        m.aim(`upperleg.${near}`, [0, .5, .85], up); m.aim(`lowerleg.${near}`, [0, -.75, .55], up);
        m.aim(`upperarm.${far}`, [-s * .2, -.8, .35], up); m.aim(`lowerarm.${far}`, [s * .1, -.2, .95], up);
      }
      const hands = bump(g, 32.3, 32.8, 40, 41);                        // they take each other's hands, then kiss
      if (hands) { toRug(0, .12, SEAT.boy[1] + .06, vT); reach(boy, 'l', vT, hands, .15); reach(girl, 'r', vT, hands, .15); }
      if (g > 34.0 && g < 34.8 && kit.once('kiss')) { toRug(0, .27, SEAT.boy[1] + .05, vH); love(vH.x, vH.y, vH.z, 26, .4); }

      /* ── stop 1: the scroll with his question ── */
      const sOpen = ease.out(seg(g, 7.95, 8.65)) * (1 - ease.in(seg(g, 10.0, 10.35))), sIn = ease.back(seg(g, 7.75, 8.0)), sOut = ease.in(seg(g, 10.3, 10.7));
      scroll.root.visible = g > 7.75 && g < 10.7;
      scroll.set(Math.max(.02, sOpen));
      scroll.root.scale.setScalar(Math.max(.001, sIn * (1 - sOut)));
      scroll.root.position.set(-.17, .73 + .2 * sOut + .006 * Math.sin(T * 1.6), .13);
      scroll.root.rotation.set(-.1, 0, .025 * Math.sin(T * .9));
      if (g > 7.8 && g < 8.5 && kit.once('scroll')) fizz(-.17, .73, .14, 18, .3, ['#ffd166', '#fff1b8']);

      /* ── stop 2: a night cloud drifts in and the stars write on it ── */
      const cIn = ease.out(seg(g, 18.1, 18.9)), cOut = ease.inOut(seg(g, 20, 20.8)), writing = seg(g, 18.9, 19.85);
      cloudNote.root.visible = g > 18.1 && g < 20.8;
      cloudNote.root.position.set(lerp(.66, 0, cIn) - .5 * cOut, .62 + .006 * Math.sin(T * 1.4) + .25 * cOut, -.005);   // just behind their heads
      cloudNote.root.rotation.set(-.08, 0, .015 * Math.sin(T * .8));
      cloudNote.body.material.opacity = 1 - cOut; cloudNote.ink.opacity = 1 - cOut;
      cloudNote.write(writing);
      if (dt && writing > 0 && writing < 1) {                         // the pen of starlight
        const x = cloudNote.root.position.x - cloudNote.W / 2 + writing * cloudNote.W;
        sparks.emit({ x, y: cloudNote.root.position.y + (rng() - .5) * .07, z: .015, vx: (rng() - .5) * .05, vy: .03, drag: 1.5, color: rng() < .5 ? '#fff4c2' : '#ffd166', size: .022, life: .7, shape: 'sparkle', spin: 4 });
      }

      /* ── clouds drifting by; the one she touches puffs away ── */
      const drift = (c, x, y, z, k, vis) => { c.root.position.set(x, y + .006 * Math.sin(T * .9 + k * 3), z); c.m.opacity = vis; c.root.visible = vis > .01; c.root.scale.setScalar(1); };
      drift(clouds[0], lerp(-.66, .66, seg(g, 11.4, 21)), .71, -.2, 0, bump(g, 11.4, 12.4, 20, 21));        // high over the loop
      drift(clouds[1], lerp(.68, -.66, seg(g, 12.8, 19.6)), .63, .2, 1, bump(g, 12.8, 13.8, 18.6, 19.6));
      drift(clouds[2], lerp(.62, -.5, seg(g, 19.2, 29.5)), .8, -.12, 2, bump(g, 19.2, 20.4, 28.5, 29.5));
      const p24 = PASS.getPointAt(PASS_U(24.35), vC), ct = [p24.x - .14, p24.y + .15, p24.z + .1], cA = ease.out(seg(g, 22.6, 24.35)), puff = ease.out(seg(g, 24.35, 24.95));
      drift(clouds[3], lerp(-.42, ct[0], cA), lerp(.66, ct[1], cA), lerp(.12, ct[2], cA), 3, (1 - puff) ** 2 * ease.smooth(seg(g, 22.6, 23.1)));   // it waits ahead of her
      clouds[3].root.scale.setScalar(1 + .3 * puff);                    // the mist carries the burst; the cloud itself just thins away
      if (g > 24.35 && g < 25 && kit.once('puff')) {
        mist.burst(20, () => ({ x: ct[0] + (rng() - .5) * .08, y: ct[1] + (rng() - .5) * .04, z: ct[2], vx: (rng() - .5) * .25, vy: (rng() - .3) * .15, vz: (rng() - .5) * .12,
          drag: 2.2, color: rng() < .5 ? '#c9cdf6' : '#a9aee6', size: .022 + rng() * .022, grow: 1.2, life: .9, shape: 'glow' }));
        fizz(ct[0], ct[1], ct[2], 14, .3);
      }

      /* ── doves: alongside past the moon; two bring the photo in on ribbons, then carry it aside ── */
      const flap = (d, k, rate = 15) => { const a = .25 + .9 * Math.sin(T * rate + k) * (Math.sin(T * 1.3 + k) > -.5 ? 1 : .15); d.wings[0].rotation.z = -a; d.wings[1].rotation.z = a; };
      const fp3 = PHOTO3, fp4 = PHOTO4, carry = ease.inOut(seg(g, 26.1, 28.0)), aside = ease.inOut(seg(g, 30.2, 31.8));
      const ps = lerp(1, .6, aside), pw = photo.width * ps, ph = photo.height * ps;
      const pX = lerp(lerp(.82, fp3[0], carry), fp4[0], aside), pY = lerp(lerp(.5, fp3[1], carry), fp4[1], aside) + .06 * Math.sin(Math.PI * aside) + .06 * Math.sin(Math.PI * carry), pZ = lerp(lerp(.05, fp3[2], carry), fp4[2], aside);
      doves.forEach((d, i) => {
        const side = i ? 1 : -1, alongside = bump(g, 21.0, 22.0, 25.2, 25.9);
        const ox = [.04, -.17, .16][i], oy = [.31, .28, .29][i], oz = [.12, .1, -.1][i];   // above their heads
        let x = f.p.x + ox + .015 * Math.sin(T * 2 + i), y = f.p.y + oy + .012 * Math.sin(T * 2.6 + i * 2), z = f.p.z + oz;
        const enter = 1 - ease.out(seg(g, 21.0, 22.0)); x -= .7 * enter; y += .2 * enter;
        let vis = g > 21.0 && g < 25.9, yaw = R;
        if (i < 2 && g >= 25.2) {                                     // up and away, then down with the photo
          const up = ease.in(seg(g, 25.2, 26.0));
          x = lerp(x, .8 + side * .12, up); y = lerp(y, .75, up); z = lerp(z, .05, up);
          if (g >= 26.0) { x = pX + side * pw / 2 * .92; y = pY + ph + .045 + .01 * Math.sin(T * 2.4 + i); z = pZ; }
          vis = true; yaw = g < 26 ? R : lerp(-.2 * side, R * .3, aside * (1 - seg(g, 31.6, 32))) + .15 * Math.sin(T * 1.1 + i);
        } else if (i === 2 && g >= 25.2) { const out = ease.in(seg(g, 25.2, 26.2)); x = lerp(x, .7, out); y = lerp(y, .9, out); vis = g < 26.2; }
        d.root.visible = vis && alongside + (i < 2 ? seg(g, 25.2, 25.3) : 0) > 0;
        d.root.position.set(x, y, z); d.root.rotation.set(-.1, yaw, .1 * Math.sin(T * 1.7 + i));
        d.root.scale.setScalar(1.25); flap(d, i * 2.1, g >= 26 && i < 2 ? 12 : 15);
      });
      photo.root.visible = g > 26.0;
      photo.root.position.set(pX, pY, pZ); photo.root.scale.setScalar(Math.max(.001, ps));
      photo.root.rotation.set(-.06, .1 * Math.sin(T * .8) * (1 - aside), .04 * Math.sin(T * 1.1));
      photo.halo.material.opacity = .4 * ease.smooth(seg(g, 27.6, 28.4)) * (1 - .6 * aside) * (1 + .08 * Math.sin(T * 3));
      cords.forEach((l, i) => {
        const side = i ? 1 : -1, d = doves[i].root, a = l.geometry.attributes.position;
        a.setXYZ(0, d.position.x, d.position.y - .006, d.position.z); a.setXYZ(1, pX + side * pw * .42, pY + ph, pZ); a.needsUpdate = true;
        l.visible = photo.root.visible;
      });
      if (g > 28.0 && g < 28.8 && kit.once('photo')) fizz(fp3[0], fp3[1] + .15, fp3[2] + .02, 20, .4);

      /* ── chapter 4: sky lanterns, fireworks, a heart of fireworks, the banner lifted by three lanterns ── */
      lanterns.forEach((l, i) => {
        const k = ease.smooth(seg(g, l.at, l.at + .6)), h = ((T * l.speed + l.ph) % .8);
        l.root.visible = k > .01; l.root.position.set(l.x + .012 * Math.sin(T * .9 + i), .16 + h + .05 * (1 - k), l.z);
        const fade = Math.min(1, h / .1) * (1 - ease.smooth(clamp((h - .62) / .18))) * k;
        l.root.scale.setScalar(Math.max(.001, fade)); l.glow.material.opacity = .75 * fade * (1 + .1 * Math.sin(T * 7 + i));
      });
      if (dt) for (const w of FIREWORKS) {                            // each climbs, then bursts
        if (g > w.t && g < w.t + .45) fire.emit({ x: w.x, y: lerp(.2, w.y, seg(g, w.t, w.t + .45)), z: page.zAt(w.x) + .035, color: '#ffe2a8', size: .012, life: .35, shape: 'glow' });
        if (g > w.t + .45 && g < w.t + 1 && kit.once(`fw${w.t}`)) boom(w.x, w.y, page.zAt(w.x) + .035, w.col);
      }
      if (held && g > 39 && dt && kit.once(`fwh${Math.floor(T / .8)}`)) { const x = (rng() - .5) * .84; boom(x, .62 + rng() * .22, page.zAt(x) + .035, FW_COLS[(rng() * 6) | 0], 26); }
      if (g > 34.2 && g < 35 && kit.once('heartfw')) {                           // a heart of fireworks opens over them
        const n = 46; fire.burst(n, i => { const t = i / n * TAU, hx = 16 * Math.sin(t) ** 3 / 16, hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
          return { x: 0, y: .76, z: page.zAt(0) + .04, vx: hx * .13 * 2.2, vy: hy * .13 * 2.2, drag: 2.2, gravity: -.02, color: i % 5 ? '#ff6f91' : '#ffd1dc', size: .02, life: 2.6, shape: i % 2 ? 'glow' : 'heart', twinkle: i % 3 ? 0 : 7 }; });
        flash.position.set(0, .7, .1); flash.color.set('#ff6f91'); flash.userData.at = T;
      }
      const lift = ease.inOut(seg(g, 36.0, 38.6)), unroll = ease.out(seg(g, 36.9, 38.5)), bob = .008 * Math.sin(T * 1.5) * ease.smooth(seg(g, 38, 38.6));
      lifters.forEach((l, i) => {
        const x = [-.24, 0, .24][i];
        l.root.visible = g > 35.8; l.root.position.set(x * lerp(.4, 1, lift), lerp(.22, .76, lift) + bob + .006 * Math.sin(T * 2 + i) + (i === 1 ? .02 : 0), lerp(-.21, -.03, lift));
        l.root.scale.setScalar(Math.max(.001, ease.back(seg(g, 35.8, 36.2)))); l.glow.material.opacity = .8;
      });
      banner.root.visible = g > 36.2;
      banner.root.position.set(0, lerp(.22, .695, lift) + bob, lerp(-.21, -.02, lift)); banner.root.rotation.set(-.06, 0, .015 * Math.sin(T * 1.2));
      banner.root.scale.setScalar(Math.max(.001, lerp(.4, 1, lift))); banner.set(Math.max(.02, unroll));
      if (held && g > 39 && dt && rng() < dt * 1.2) { toRug(0, .24, .05, vH); hearts.emit({ x: vH.x + (rng() - .5) * .2, y: vH.y, z: vH.z, vy: .05, sway: .03, color: '#ff8fab', size: .018, life: 1.6, shape: 'heart' }); }   // below the banner

      [sparks, hearts, stars, mist, fire].forEach(x => x.update(dt, T));
    }
  };
};
