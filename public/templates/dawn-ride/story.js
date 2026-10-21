/* Đạp xe đón bình minh (riding out to meet the sunrise), told by the shared act _acts/lovestory.js; the world is built by
   scenery.js, the bicycle and the small props by bike.js, their clothes, reaches and paper by cast.js (all loaded first).
   Four chapters of about ten seconds, each ending at a stop:
     1 · 0–10 s    deep blue before dawn: he rides in on an old blue bicycle and rings the bell under her window; her
                   window lights, the door opens and she comes out in her hood and scarf, hops onto the back rack
                   sideways; the note tucked in the basket flutters up into her hands and opens: the first words (note1)
     2 · 10–20 s   the street folds away and a terraced hill pops up out of the card; they set off up the winding road,
                   he stands on the pedals and slows to a wobble, she hops off and pushes, laughing, while the stars fade
                   and the sky pales; at the bend she hops back on and the road sign flips round to the second words (note2)
     3 · 20–30 s   round the bend and up the last ramp to the top; the city rises below in the morning mist, the sun
                   comes up and gold floods everything; they turn round for a photo, the flash pops and the print flies up
                   into the card's photo with its caption
     4 · 30–40 s   he kneels with a ring box and opens it; she covers her mouth, two birds bring the last words (note3)
                   on a banner, she cheers, he stands and they hug and spin among petals in the sunrise
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own;
   twinkling, flapping and idle sway go by T. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;
  const S = window.NM_DAWN.scenery(kit), C = window.NM_DAWN.cast(kit), P = window.NM_DAWN.props(kit);
  const { LAYOUT, ground } = S;
  const HB = .3, HG = .29, SB = HB / .3, SG = HG / .3;               // their heights; the sitting clip's numbers are for .3
  const SIT = { up: .0624, back: .0545, seat: .047 };                 // sitting: the hips this high over the root and this far behind it; the seat
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  const keysOf = (way, n) => Array.from({ length: n }, (_, i) => way.map(k => [k[0], k[i + 1], k[n + 1] || 'smooth']));
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const LIGHT = {                                                    // hemisphere sky, its ground, the key light; for night, first light, sunrise
    night: [new THREE.Color('#6f7fd0'), new THREE.Color('#1d2147'), new THREE.Color('#a9b8ff'), .55, .55],
    dawn: [new THREE.Color('#d9b4d8'), new THREE.Color('#6b5078'), new THREE.Color('#ffc0c8'), .85, .9],
    sun: [new THREE.Color('#ffe2c0'), new THREE.Color('#b48c7c'), new THREE.Color('#ffd49a'), 1.15, 1.55]
  };

  /* ── the bicycle's way: [from g, x, z, heading, ease into it] (heading R: towards your right) ── */
  const UT = { x: .37, z: .065, r: .085 };                            // the U-turn at the bend
  const SPIN = { x: -.005, z: -.135 };                                // the middle of their hug at the top
  const turnAt = a => [UT.x - UT.r * Math.cos(a), UT.z + UT.r * Math.sin(a)];
  const BIKE_WAY = [
    [0, -.68, .15, R], [.8, -.68, .15, R], [2.55, -.215, .15, R, 'linear'], [3, -.16, .15, R, 'out'],   // rides in, brakes under her window
    [10.2, -.16, .15, R], [11.6, -.08, .15, R, 'in'], [12.8, .08, .15, R, 'linear'],  // sets off along the street to ramp A
    [14.6, .175, .15, R, 'out'], [15.3, .178, .15, R],                                // the climb: slower and slower, a stall
    [17.4, .37, .15, R, 'inOut'], [20.1, .37, .15, R],                                // pushed up onto the bend: stop 2
    ...[1, 2, 3, 4].map(i => { const a = R + i * R / 2, [x, z] = turnAt(a); return [20.1 + i * .25, x, z, a, i === 1 ? 'in' : 'linear']; }),   // round the bend
    [21.4, .29, -.02, 3 * R, 'linear'], [22.7, -.17, -.02, 3 * R, 'linear'], [23.3, -.25, -.02, 3 * R, 'out'], [40, -.25, -.02, 3 * R]   // up ramp B to the top
  ];
  const BIKE_KEYS = keysOf(BIKE_WAY, 3), bikeAt = g => BIKE_KEYS.map(k => tween(g, k));
  /** when his feet turn the pedals, and in what gear (wheel turns to a crank turn) */
  const PEDAL = [[0, 1, 1.25], [2.3, 0], [10.25, 1, 1.15], [12.7, 1, .7], [14.6, 0], [15.35, 1, .7], [17.1, 0], [20.15, 1, 1.05], [22.9, 0]];
  /* ── who does what: [from g, mode] ── */
  const BOY_MODE = [[0, 'ride'], [3, 'foot'], [10.25, 'ride'], [13.1, 'stand'], [17.3, 'foot'], [20.15, 'ride'], [23.1, 'foot'], [23.8, 'off']];
  const GIRL_MODE = [[0, 'in'], [5.3, 'walk'], [7.55, 'sit'], [14.65, 'walk'], [15.35, 'push'], [17.3, 'walk'], [18.25, 'sit'], [23.45, 'walk']];
  const BOY_CLIPS = [
    [0, 'Sit_Chair_Pose'], [13.1, 'Idle', { fade: .25 }], [17.3, 'Sit_Chair_Pose', { fade: .25 }], [23.8, 'Idle', { fade: .2 }],
    [24.3, 'Walking_A', { speed: 2.1, fade: .2 }], [26, 'Idle', { fade: .25 }], [27.1, 'Walking_A', { speed: 1.2, fade: .15 }], [27.75, 'Idle', { fade: .2 }],
    [30.3, 'Walking_A', { speed: .7, fade: .2 }], [30.75, 'Idle', { fade: .2 }], [36.1, 'Jump_Full_Short', { once: true, fade: .1, speed: 1.3 }],
    [36.9, 'Idle', { fade: .25 }]
  ];
  const GIRL_CLIPS = [
    [0, 'Idle'], [5.3, 'Walking_A', { speed: 1.6, fade: .2 }], [7.35, 'Idle', { fade: .15 }], [7.55, 'Sit_Chair_Down', { once: true, fade: .15 }],
    [8.35, 'Sit_Chair_Idle', { fade: .3 }], [14.65, 'Sit_Chair_StandUp', { once: true, fade: .15 }], [15.3, 'Walking_A', { speed: .85, fade: .2 }],
    [17.3, 'Walking_A', { speed: 1.1, fade: .2 }], [17.95, 'Idle', { fade: .15 }], [18.25, 'Sit_Chair_Down', { once: true, fade: .15 }],
    [19.05, 'Sit_Chair_Idle', { fade: .3 }], [23.45, 'Sit_Chair_StandUp', { once: true, fade: .15 }], [24.2, 'Walking_A', { speed: 1.2, fade: .2 }],
    [26, 'Idle', { fade: .25 }], [27.1, 'Walking_A', { speed: 1.2, fade: .15 }], [27.75, 'Idle', { fade: .2 }],
    [34.7, 'Cheer', { once: true, fade: .15 }], [36.4, 'Idle', { fade: .3 }]
  ];
  /* on foot: [from g, x, z, facing, ease] (what the stage holds when nobody rides) */
  const BOY_WAY = [[23.8, -.27, .048, 3 * R + .4], [24.3, -.25, .05, R], [24.95, -.1, .04, R - .5, 'linear'], [26, -.075, -.2, Math.PI, 'linear'], [27.05, -.075, -.2, Math.PI],
    [27.3, -.075, -.2, .3], [27.75, -.07, -.14, 0, 'linear'], [30.3, -.07, -.14, 0], [30.75, -.06, -.135, R - .25], [40, -.06, -.135, R - .25]];
  const GIRL_WAY = [[0, -.37, -.085, 0], [5.3, -.37, -.085, 0], [6, -.37, .03, 0, 'linear'], [6.75, -.36, .14, .5, 'linear'], [7.35, -.264, .205, 0],   // out of the door and round the back wheel
    [8.2, -.264, .205, 0], [14.65, .071, .203, 0, 'linear'], [15.3, -.025, .15, R],                                                                        // (on the rack, pushing: placed by the bike)
    [17.3, .17, .15, R], [17.95, .266, .205, 0, 'smooth'], [18.9, .266, .205, 0], [23.45, -.146, -.073, Math.PI, 'linear'], [24.2, -.13, -.085, Math.PI - .4],
    [26, .045, -.2, Math.PI, 'linear'], [27.05, .045, -.2, Math.PI], [27.3, .045, -.2, -.3], [27.75, .045, -.14, 0, 'linear'], [30.75, .045, -.14, 0],
    [31.2, .05, -.135, -R + .35], [40, .05, -.135, -R + .35]];
  const BOY_KEYS = keysOf(BOY_WAY, 3), GIRL_KEYS = keysOf(GIRL_WAY, 3);
  const wayAt = (keys, g) => keys.map(k => tween(g, k));

  let boy, girl, bike, scarf, page, house, street, hill, sign, signTex, note, folded, photo, banner, camera, box, birds = [];
  let stars, hearts, sparks, petals, dust, notes, drops, starBase = null, distTable = [];
  const rings = [];

  /** the distance ridden and the crank's turn at g, sampled once from the way and the pedalling */
  function measure() {
    const step = .01; let d = 0, cr = 0, prev = bikeAt(0);
    for (let g = 0; g <= 40.0001; g += step) {
      const p = bikeAt(g), dd = Math.hypot(p[0] - prev[0], p[1] - prev[1]), pd = clipAt(PEDAL, g);
      d += dd; if (pd[1]) cr += dd / ((pd[2] || 1) * bike.R); distTable.push([d, cr]); prev = p;
    }
  }
  const rolled = g => { const f = clamp(g / .01, 0, distTable.length - 1), i = Math.floor(f), j = Math.min(i + 1, distTable.length - 1), k = f - i;
    return [lerp(distTable[i][0], distTable[j][0], k), lerp(distTable[i][1], distTable[j][1], k)]; };

  /* ── scratch ── */
  const mBike = new THREE.Matrix4(), mStage = new THREE.Matrix4(), qBike = new THREE.Quaternion(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion();
  const vA = V3(), vB = V3(), vC = V3(), vD = V3(), vE = V3(), vPole = V3(), UP = V3(0, 1, 0);
  const onBike = (local, out) => out.copy(local).applyMatrix4(mBike);  // a point in the bike frame's own space, on the stage
  const dirOn = (x, y, z, out) => out.set(x, y, z).applyQuaternion(qBike);
  const faceQ = (yaw, out) => out.setFromAxisAngle(UP, yaw);

  return {
    seconds: [10, 10, 10, 10],

    build() {
      /* the two of them */
      boy = kit.model('boy').fit({ height: HB }); girl = kit.model('girl').fit({ height: HG });
      stage.add(boy.root, girl.root);
      C.dressBoy(boy); C.dressGirl(girl, '#c8443f', '#b06676');   // a red scarf, a dusty rose hood
      scarf = P.scarf('#c8443f', '#f6ead2'); girl.node('chest')?.add(scarf.root);
      scarf.root.position.set(0, .02, .04); scarf.root.scale.setScalar(.8);    // its ends hang from the cowl's front edge

      /* the world */
      page = S.buildPage(); stage.add(page.root);
      house = S.buildHouse(); stage.add(house.root);
      street = S.buildStreet();
      hill = S.buildHill();
      bike = window.NM_DAWN.bike(kit); stage.add(bike.root);
      birds = [S.bird(.07), S.bird(.07), S.bird(.04), S.bird(.055), S.bird(.05)];        // two carry the banner, three fly up at sunrise
      measure();

      /* the note in the basket, the camera, the ring box */
      folded = P.folded(); stage.add(folded);
      camera = P.camera(); stage.add(camera.root);
      box = P.ringBox(); stage.add(box.root);

      /* the card's words and photo */
      note = C.notePage(words('note1', 'Dậy đi em, mình đi đón bình minh')); stage.add(note.root);
      signTex = C.plankTexture(words('note2', 'Dốc cao mấy cũng có em cùng đẩy'));
      sign = S.buildSign(signTex, C.plankTexture(''), .42, .19); sign.root.position.set(.27, LAYOUT.T2, -.115); stage.add(sign.root);
      photo = kit.polaroid({ width: .29, caption: words('caption', 'Bình minh đầu tiên của mình'), glow: .5, halo: true, haloColor: 0xffe0a8 });
      banner = kit.sign({ text: words('note3', 'Lấy anh nhé, em yêu?'), style: 'banner', width: .62, accent: '#e2475f', paper: '#fffaf0', glow: .55 });
      for (const p of [photo, banner]) { p.root.traverse(o => { o.castShadow = false; }); stage.add(p.root); }
      note.root.traverse(o => { o.castShadow = false; });
      for (let i = 0; i < 2; i++) {                                    // the bell's rings of sound
        const ring = kit.picture((c, px) => { c.strokeStyle = '#fff3c4'; c.lineWidth = px * .05; c.beginPath(); c.arc(px / 2, px / 2, px * .4, 0, TAU); c.stroke(); }, { size: .05 });
        ring.material.opacity = 0; stage.add(ring); rings.push(ring);
      }

      /* particles */
      [stars, hearts, sparks, petals, dust, notes, drops] = [{ max: 70, additive: true }, { max: 160 }, { max: 360, additive: true }, { max: 220 },
        { max: 90 }, { max: 30 }, { max: 40 }].map(o => kit.particles(o));
      [stars, hearts, sparks, petals, dust, notes, drops].forEach(p => stage.add(p.root));
    },

    reset() {
      [stars, hearts, sparks, petals, dust, notes, drops].forEach(p => p.clear()); starBase = null;
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      C.frame(); stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();
      const dawn = ease.inOut(seg(g, 10.5, 17.5)), sunUp = ease.inOut(seg(g, 24.6, 27.6));

      /* ── light and sky: night, the first light, sunrise ── */
      const L = kit.lights, mix = (i, out) => out.copy(LIGHT.night[i]).lerp(LIGHT.dawn[i], dawn).lerp(LIGHT.sun[i], sunUp);
      mix(0, L.hemi.color); mix(1, L.hemi.groundColor); mix(2, L.sun.color);
      L.hemi.intensity = lerp(lerp(LIGHT.night[3], LIGHT.dawn[3], dawn), LIGHT.sun[3], sunUp);
      L.sun.intensity = lerp(lerp(LIGHT.night[4], LIGHT.dawn[4], dawn), LIGHT.sun[4], sunUp);
      L.sun.position.set(lerp(lerp(-.6, .5, dawn), .25, sunUp), lerp(lerp(1.3, .9, dawn), 1.05, sunUp), lerp(lerp(.6, -.3, dawn), -.75, sunUp));
      const fold = ease.out(seg(g, 0, .7)), wob = g > .7 ? Math.exp(-6 * (g - .7)) * Math.sin(14 * (g - .7)) : 0;
      page.root.rotation.x = -R * (1 - fold) + .08 * wob;              // the page folds up from behind the card
      page.skies[1].material.opacity = dawn; page.skies[2].material.opacity = sunUp;
      page.skies[0].visible = dawn < 1; page.skies[1].visible = dawn > 0 && sunUp < 1; page.skies[2].visible = sunUp > 0;   // layers nobody sees cost a phone
      const sy = lerp(.2, .45, ease.out(seg(g, 24.8, 28.2)));
      page.sun.position.y = sy; page.rays.position.y = sy; page.glow.position.y = sy;
      page.rays.rotation.z = T * .05; page.rays.material.opacity = .55 * ease.smooth(seg(g, 25.4, 27.6)) * (1 + .06 * Math.sin(T * 1.7));
      page.glow.material.opacity = .9 * ease.smooth(seg(g, 24.9, 26.8));
      page.sun.visible = g > 24.5; page.rays.visible = g > 25.4; page.glow.visible = g > 24.9;
      page.hills.material.color.setRGB(lerp(lerp(.2, .48, dawn), .78, sunUp), lerp(lerp(.24, .44, dawn), .72, sunUp), lerp(lerp(.45, .7, dawn), .9, sunUp));
      const cityUp = ease.back(seg(g, 23, 24.2));
      for (const m of [page.city, page.lights]) { m.scale.y = Math.max(.001, cityUp); m.visible = g > 23; }
      page.city.material.color.setRGB(lerp(.78, 1, sunUp), lerp(.8, .93, sunUp), lerp(.95, .86, sunUp));
      page.lights.material.opacity = .8 * ease.smooth(seg(g, 23.4, 24.4)) * (1 - ease.smooth(seg(g, 25.6, 27.4)));
      page.mist.forEach((m, i) => { m.material.opacity = .6 * ease.smooth(seg(g, 23.2, 24.6)) * (1 - .35 * sunUp); m.visible = g > 23.2; m.material.map.offset.x = T * .006 * (i + 1) * (i % 2 ? -1 : 1); });
      page.lights.visible = g > 23.4 && g < 27.4;
      const streetDown = ease.in(seg(g, 10.05, 10.6));
      page.street.scale.y = Math.max(.001, 1 - streetDown); page.street.visible = streetDown < 1;
      page.street.material.color.setScalar(lerp(1, 1.4, dawn));
      if (g > .3 && kit.once('stars')) {
        stars.burst(60, i => { const x = (rng() - .5) * 1.06; return { x, y: .5 + rng() * .5, z: S.pageZ(x) + .02, color: ['#ffffff', '#fff2c4', '#cfe0ff'][i % 3],
          size: .008 + rng() * .014, life: 1e6, shape: i % 4 ? 'glow' : 'star', twinkle: 1.5 + rng() * 3.5 }; });
        starBase = Float32Array.from(stars.root.geometry.attributes.aColor.array);
      }
      if (starBase) {                                                // additive: darker is fainter, so the stars fade by their colour
        const k = (1 - ease.smooth(seg(g, 12, 17))) * fold, a = stars.root.geometry.attributes.aColor.array;
        for (let i = 0; i < a.length; i++) a[i] = starBase[i] * k;
        stars.root.visible = k > 0;
      }

      /* ── her house and the street lamp: the house folds down when they set off; the lamp goes out at first light ── */
      const houseUp = ease.back(seg(g, .15, .7)) * (1 - ease.in(seg(g, 10, 10.55)));
      house.root.scale.set(1, Math.max(.001, houseUp), 1); house.root.visible = houseUp > .002;
      const lit = ease.out(seg(g, 4.3, 4.6)) * (1 + .03 * Math.sin(T * 9));
      house.face.emissiveIntensity = .55 * lit; house.pane.material.opacity = .5 * lit;
      const open = ease.inOut(seg(g, 5.15, 5.6));
      house.hinge.rotation.y = -1.25 * open;
      house.spill.material.opacity = .75 * open * (1 - seg(g, 9.4, 10)); house.porch.material.opacity = .7 * open;
      const lampUp = ease.back(seg(g, .1, .45)) * (1 - ease.in(seg(g, 16, 16.5)));   // out at first light, then folded away
      street.lamp.scale.setScalar(Math.max(.001, lampUp)); street.lamp.visible = lampUp > .002;
      const lampOn = ease.out(seg(g, .35, .6)) * (1 - ease.inOut(seg(g, 15.4, 15.9))) * (g > 15.4 && g < 15.9 ? .5 + .5 * Math.sign(Math.sin(g * 60)) : 1);
      const fl = 1 + .05 * Math.sin(T * 13) * Math.sin(T * 7.3);
      street.glass.material.emissiveIntensity = 1.6 * lampOn; street.glow.material.opacity = .85 * lampOn * fl; street.light.intensity = 1.3 * lampOn * fl;
      street.pool.material.opacity = .6 * lampOn;

      /* ── the hill pops up out of the card, step by step ── */
      const up = { t1: ease.back(seg(g, 10.3, 10.9)), t2: ease.back(seg(g, 10.55, 11.15)), a: ease.back(seg(g, 10.6, 11.1)), b: ease.back(seg(g, 10.8, 11.3)) };
      S.rise({ t1: Math.min(1, up.t1), t2: Math.min(1, up.t2), a: Math.min(1, up.a), b: Math.min(1, up.b) });
      [[hill.t1, up.t1], [hill.t2, up.t2], [hill.rampA, up.a], [hill.rampB, up.b]].forEach(([m, k]) => { m.scale.y = Math.max(.001, k); m.visible = k > .002; });
      const deco = ease.back(seg(g, 11, 11.6));
      hill.top.scale.setScalar(Math.max(.001, deco)); hill.top.position.y = LAYOUT.T2 * Math.min(1, up.t2); hill.top.visible = deco > .002;
      [...hill.trees, ...hill.bushes].forEach((t, i) => { const k = ease.back(seg(g, 11.1 + i * .06, 11.5 + i * .06)); t.scale.setScalar(Math.max(.001, k)); t.visible = k > .002;
        t.rotation.z = .03 * Math.sin(T * 1.3 + i); });
      if (g > 10.35 && kit.once('dust1')) puff(-.1, .01, .05, 14, .25);
      if (g > 10.6 && kit.once('dust2')) puff(.1, .06, -.12, 14, .3);
      /* the road sign at the bend: small by the road on the way up; it springs up and flips round to the words, then folds away */
      const signUp = ease.back(seg(g, 11.25, 11.7)) * lerp(.42, 1, ease.elastic(seg(g, 18.4, 19.2))) * (1 - ease.in(seg(g, 20.3, 20.75))), flip = ease.inOut(seg(g, 18.55, 19.25));
      sign.root.scale.set(Math.max(.001, signUp), Math.max(.001, signUp), Math.max(.001, signUp)); sign.root.visible = signUp > .002;
      sign.root.rotation.y = Math.PI * (1 - flip) + .04 * Math.sin(T * .8) * flip;
      if (g > 19.2 && kit.once('sign')) for (let i = 0; i < 18; i++) sparks.emit({ x: .27 + (rng() - .5) * .42, y: LAYOUT.T2 + .36 + rng() * .2, z: -.1, vy: .05,
        color: ['#fff1b8', '#ffd1dc'][i % 2], size: .02, life: .9, shape: 'sparkle', spin: 3 });

      /* ── the bicycle on the road ── */
      const [bx, bz, bpsi] = bikeAt(g), fx = Math.sin(bpsi), fz = Math.cos(bpsi);
      const yr = ground(bx - fx * .08, bz - fz * .08), yf = ground(bx + fx * .08, bz + fz * .08);
      const [dist, crank] = rolled(g), bm = clipAt(BOY_MODE, g)[1], speed = clamp((dist - rolled(g - .05)[0]) / .05 / .2);
      const wobble = (bm === 'stand' ? .06 * Math.sin(crank) : 0) + .015 * Math.sin(dist * 40) * speed;
      const leanFoot = bump(g, 2.85, 3.15, 10.1, 10.35) * .1 + bump(g, 17.25, 17.5, 20, 20.25) * .1 - bump(g, 23, 23.3, 24.05, 24.3) * .1 - ease.smooth(seg(g, 24.05, 24.4)) * .13;
      bike.root.position.set(bx, (yr + yf) / 2, bz); bike.root.rotation.set(0, bpsi, 0);
      bike.root.visible = boy.root.visible = g > .75;
      const turning = bump(g, 20.1, 20.25, 21, 21.2);
      bike.frame.rotation.set(-Math.atan2(yf - yr, .16), 0, leanFoot + wobble - .12 * turning);
      const bells = bump(g, 3.3, 3.36, 3.45, 3.5) + bump(g, 3.8, 3.86, 3.95, 4);
      bike.set({ dist, crank, steer: .35 * turning + .12 * Math.sin(crank) * (bm === 'stand' ? 1 : 0), bell: bells, stand: ease.smooth(seg(g, 24.05, 24.4)),
        lamp: ease.out(seg(g, .8, 1.1)) * (1 - ease.smooth(seg(g, 14, 15))) });
      bike.frame.updateWorldMatrix(true, false); mBike.copy(mStage).multiply(bike.frame.matrixWorld);
      qBike.setFromRotationMatrix(mBike);
      if (g > 3.3 && kit.once('ring1')) ring(0);
      if (g > 3.8 && kit.once('ring2')) ring(1);
      rings.forEach((r, i) => { const k = seg(g, i ? 3.8 : 3.3, i ? 4.6 : 4.1); r.material.opacity = .9 * (1 - k) * (k > 0 ? 1 : 0); r.scale.setScalar(.03 + .12 * k);
        onBike(vA.set(-.022, .108, .03), r.position).y += .02 * k; });

      /* ── him: on the bike (sitting or standing on the pedals, a foot down) or on foot ── */
      const bc = clipAt(BOY_CLIPS, g); boy.play(bc[1], bc[2]);
      rideBoy(g, T, bm, crank);

      /* ── her: indoors, walking, on the rack, pushing ── */
      const gc = clipAt(GIRL_CLIPS, g); girl.play(gc[1], gc[2]);
      placeGirl(g, T);

      /* ── chapter 1: the note flutters out of the basket into her hands and opens ── */
      poseNote(g, T);
      if (g > 8.95 && kit.once('note-hearts')) love(-.2, .32, .2, 12);

      /* ── chapter 2: sweat and laughter ── */
      if (g > 13.4 && g < 15.2 && dt && rng() < dt * 9) { at(boy, 'head', vA); drops.emit({ x: vA.x + (rng() - .5) * .04, y: vA.y + .06, z: vA.z + .02, vx: (rng() - .5) * .2, vy: .2 + rng() * .1,
        gravity: -1.2, color: '#bfe6ff', size: .02, life: .6, shape: 'drop', rot: (rng() - .5) * 2 }); }
      if (g > 15.5 && g < 17.2 && dt && rng() < dt * 2.5) { at(girl, 'head', vA); notes.emit({ x: vA.x, y: vA.y + .05, z: vA.z + .02, vx: (rng() - .5) * .05, vy: .1, sway: .03,
        color: ['#ff8fab', '#ffd166'][(rng() * 2) | 0], size: .03, life: 1.4, shape: 'note' }); }
      if (g > 19.3 && kit.once('laugh')) love(.3, .36, .17, 10);

      /* ── chapter 3: the sunrise, the photo ── */
      birds.forEach((b, i) => {
        const off = i * 1.3;
        if (i < 2) { b.s.position.set(...carryBird(g, T, i)); b.s.material.opacity = clamp((g - 32.6) * 4); b.flap(T, off, i ? -1 : 1); return; }
        const k = seg(g, 25.4 + i * .3, 31 + i * .3), dir = i % 2 ? -1 : 1;   // out of the trees by the rail, up and away over the city
        b.s.position.set(lerp(-.3 + i * .15, .9 * dir, ease.in(k)) + .04 * Math.sin(T * 1.5 + off), LAYOUT.T2 + .1 + i * .05 + .35 * ease.out(k) + .02 * Math.sin(T * 2 + off), -.22 - (i % 3) * .02);
        b.s.material.opacity = clamp(k * 10) * (1 - clamp((k - .85) / .15)); b.flap(T, off, dir);
      });
      poseCamera(g, T, dt);

      /* ── chapter 4: the ring, the banner, petals ── */
      poseRing(g, T, dt);
      const bn = ease.elastic(seg(g, 33.4, 34.4));
      banner.root.scale.setScalar(Math.max(.001, bn));
      banner.root.position.set(lerp(-.8, 0, ease.out(seg(g, 32.6, 33.6))), lerp(.95, .74, ease.out(seg(g, 32.6, 33.6))) + .008 * Math.sin(T * 1.6), -.06);
      banner.root.rotation.set(-.08, 0, .025 * Math.sin(T * 1.1));
      banner.root.visible = g > 32.6;
      if (g > 34.85 && kit.once('yes')) {
        petals.burst(70, i => ({ x: .01 + (rng() - .5) * .1, y: .35, z: -.18, vx: (rng() - .5) * .7, vy: .2 + rng() * .4, vz: (rng() - .5) * .3, gravity: -.25, drag: .9,
          color: ['#ffd1dc', '#ffffff', '#ffb3c6', '#ffe8a3'][i % 4], size: .022 + rng() * .014, life: 3.2, shape: 'petal', spin: (rng() - .5) * 5, sway: .05 }));
        love(.03, .4, -.18, 24);
        sparks.burst(40, () => ({ x: .01, y: .35, z: -.18, vx: (rng() - .5) * .6, vy: (rng() - .3) * .6, vz: (rng() - .5) * .3, drag: 1.6, color: ['#fff1b8', '#ffd1dc', '#ffffff'][(rng() * 3) | 0],
          size: .02, life: 1.1, shape: 'sparkle', spin: 4 }));
      }
      if (g > 37.2 && g < 38.6 && dt && rng() < dt * 30) { const a = rng() * TAU; petals.emit({ x: SPIN.x + Math.cos(a) * .12, y: LAYOUT.T2 + .05 + rng() * .2, z: SPIN.z + Math.sin(a) * .08,
        vx: -Math.sin(a) * .25, vy: .12, vz: Math.cos(a) * .18, gravity: -.15, drag: .6, color: ['#ffd1dc', '#ffffff', '#ffb3c6', '#ffe8a3'][(rng() * 4) | 0], size: .02, life: 2.4, shape: 'petal', spin: 4 }); }
      if (g > 35 && dt && rng() < dt * (held ? 5 : 9)) petals.emit({ x: (rng() - .5) * .9, y: .85, z: -.25 + rng() * .4, vx: .03, vy: -.06, sway: .05, color: ['#ffd1dc', '#ffffff', '#ffb3c6'][(rng() * 3) | 0],
        size: .018 + rng() * .01, life: 7, shape: 'petal', spin: (rng() - .5) * 3, floor: -1 });
      if (g > 35 && dt) settle(petals);
      if (held && dt && g > 39 && rng() < dt * 1.2) hearts.emit({ x: (rng() - .5) * .12, y: .42, z: -.18, vy: .07, sway: .03, color: '#ff8fab', size: .02, life: 2.4, shape: 'heart' });

      [stars, hearts, sparks, petals, dust, notes, drops].forEach(p => p.update(dt, T));
    }
  };

  /* ════ the pieces of pose() ════ */

  function at(m, bone, out) { return C.at(m, bone, out); }
  /** petals come to rest on the hill, whichever step they fall on (a system's floor is one height for all) */
  function settle(p) {
    const pos = p.root.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) { const h = ground(pos[i], pos[i + 2]) + .003; if (pos[i + 1] < h && pos[i + 1] > h - .03) pos[i + 1] = h; }
  }
  function puff(x, y, z, n, r) {
    dust.burst(n, i => { const a = i / n * TAU; return { x: x + Math.cos(a) * r, y, z: z + Math.sin(a) * r * .5, vx: Math.cos(a) * .15, vy: .04, vz: Math.sin(a) * .08, drag: 2.6,
      color: '#fff3e0', size: .03, grow: 1.2, life: .7, shape: 'glow' }; });
  }
  function love(x, y, z, n) {
    hearts.burst(n, () => ({ x: x + (rng() - .5) * .06, y, z, vx: (rng() - .5) * .25, vy: .14 + rng() * .18, vz: (rng() - .5) * .1, gravity: -.12, drag: .7,
      color: ['#ff4f7b', '#ff8fab', '#ffc2d1', '#e8436d'][(rng() * 4) | 0], size: .022 + rng() * .016, life: 2.2, shape: 'heart', spin: (rng() - .5) * 3 }));
  }
  function ring(i) {
    onBike(vA.set(-.022, .11, .03), vB);
    notes.burst(3, k => ({ x: vB.x, y: vB.y + .01, z: vB.z + .01, vx: (k - 1) * .06, vy: .14, sway: .02, color: ['#fff1b8', '#ffd166', '#ffffff'][k], size: .028, life: 1.2, shape: 'note' }));
    sparks.burst(6, () => ({ x: vB.x, y: vB.y, z: vB.z + .01, vx: (rng() - .5) * .2, vy: rng() * .2, drag: 2, color: '#fff3c4', size: .014, life: .5, shape: 'sparkle', spin: 4 }));
  }

  /** him: placed by mode, the legs and arms reaching for the pedals, the grips or the ground */
  function rideBoy(g, T, mode, crank) {
    const stand = ease.smooth(seg(g, 13.1, 13.45)) * (1 - ease.smooth(seg(g, 17.25, 17.55)));
    const foot = Math.max(bump(g, 2.95, 3.25, 10.05, 10.3), bump(g, 17.3, 17.6, 19.95, 20.2), bump(g, 23, 23.3, 23.7, 23.8));
    const off = mode === 'off';
    if (!off) {
      /* on the bike: the root from the saddle (sitting, or the hips up and forward standing on the pedals) */
      vA.set(0, lerp(bike.SADDLE.y - SIT.seat * SB, bike.SADDLE.y + .016 - SIT.up * SB, stand), lerp(bike.SADDLE.z + SIT.back * SB, bike.SADDLE.z + .022, stand));
      onBike(vA, boy.root.position); boy.root.quaternion.copy(qBike);
      const pitch = bike.frame.rotation.x, effort = stand * (.8 + .2 * Math.sin(crank * 2));
      boy.bend('hips', -pitch * .9, 0, 0);                             // the body stays upright on a slope; it leans into the effort
      boy.bend('spine', .14 + .22 * effort, 0, .07 * Math.sin(crank) * stand); boy.bend('chest', .1 + .12 * effort, 0, 0);
      /* feet: on the pedals, or one down on the ground (his right in front of you; on the way back up, his left) */
      const down = g > 22 ? 'l' : 'r';
      for (const [i, side] of [[0, 'r'], [1, 'l']]) {
        bike.pedal(i, vB); vB.y += .021; vB.z -= .012; onBike(vB, vC);
        if (side === down && foot > 0) {
          onBike(vD.set(side === 'r' ? -.05 : .05, 0, -.008), vE); vE.y = ground(vE.x, vE.z) + .021 * SB;
          vC.lerp(vE, foot);
        }
        dirOn(0, .45, 1, vPole); C.ik(boy, `upperleg.${side}`, `lowerleg.${side}`, `foot.${side}`, vC, vPole);
      }
      /* hands on the grips, unless he rings, waves, wipes his brow */
      const wave = bump(g, 4.45, 4.7, 5.3, 5.6), wipe = bump(g, 18.6, 18.85, 19.25, 19.5);
      for (const [i, side] of [[0, 'l'], [1, 'r']]) {
        bike.grip(i, vB); onBike(vB, vC);
        dirOn(side === 'l' ? 1 : -1, -.6, -.5, vPole); C.ik(boy, `upperarm.${side}`, `lowerarm.${side}`, `handslot.${side}`, vC, vPole, 1 - (side === 'r' ? Math.max(wave, wipe) : 0));
      }
      if (wave) { boy.aim('upperarm.r', [-.45, .85, .1], wave); boy.aim('lowerarm.r', [-.1 + .45 * Math.sin(T * 9), 1, .1], wave); }
      if (wipe) { boy.aim('upperarm.r', [-.6, .7, .3], wipe); boy.aim('lowerarm.r', [.7, .3 + .2 * Math.sin(T * 7), .4], wipe); }
      /* where he looks: up at her window, back at her, at the road */
      const look = bump(g, 3.25, 3.5, 5.6, 5.9), back = Math.max(bump(g, 7.6, 7.9, 10.1, 10.35), bump(g, 18.3, 18.6, 20.15, 20.4)), laugh = bump(g, 19, 19.2, 19.75, 19.95);
      if (look) boy.bend('head', -.42 * look, .55 * look, 0);
      if (back) boy.bend('head', -.05 * back, -.9 * back, 0);
      if (laugh) boy.bend('head', -.12 * laugh + .05 * Math.sin(T * 14) * laugh, 0, 0);
      return;
    }
    /* on foot at the top: walk to the rail, the sunrise, the photo, the kneel, the hug */
    const [x, z, f] = wayAt(BOY_KEYS, g), dis = ease.smooth(seg(g, 23.8, 24.25));
    boy.root.position.set(x, ground(x, z), z); boy.root.quaternion.copy(faceQ(f, qA));
    if (dis < 1) {                                                   // stepping off the saddle onto the ground beside it
      onBike(vA.set(0, bike.SADDLE.y - SIT.seat * SB, bike.SADDLE.z + SIT.back * SB), vB);
      boy.root.position.lerpVectors(vB, boy.root.position, dis); boy.root.position.y += .015 * Math.sin(Math.PI * dis);
      boy.root.quaternion.slerpQuaternions(qBike, qA, dis);
    }
    spin(boy, g);
    poseTop(g, T);
  }

  /** her: indoors (hidden), on foot, on the rack (sitting sideways, facing you), pushing from behind */
  function placeGirl(g, T) {
    const mode = clipAt(GIRL_MODE, g)[1];
    girl.root.visible = g > 5.32;
    const [wx, wz, wf] = wayAt(GIRL_KEYS, g);
    /* her place sitting on the rack, and how far into sitting she is (the hop up onto it, the hop down off it) */
    vA.set(-SIT.back * SG, bike.RACK.y - SIT.seat * SG, bike.RACK.z); onBike(vA, vB);
    qA.copy(qBike).multiply(faceQ(-R, qB));
    const on = Math.min(ease.smooth(seg(g, 7.55, 8.1)) * (1 - ease.smooth(seg(g, 14.65, 15.05))) + ease.smooth(seg(g, 18.25, 18.8)), 1) * (1 - ease.smooth(seg(g, 23.45, 23.9)));
    const hop = Math.sin(Math.PI * seg(g, 7.55, 8.1)) + Math.sin(Math.PI * seg(g, 14.65, 15.05)) + Math.sin(Math.PI * seg(g, 18.25, 18.8)) + Math.sin(Math.PI * seg(g, 23.45, 23.9));
    if (mode === 'push') {                                            // behind the bike, walking with it, hands on the rack
      onBike(vC.set(0, 0, -.2), vD); vD.y = ground(vD.x, vD.z);
      girl.root.position.copy(vD); girl.root.quaternion.copy(faceQ(bikeAt(g)[2], qB));
      girl.bend('spine', .28, 0, 0); girl.bend('chest', .12, 0, 0);
      for (const side of ['l', 'r']) {
        onBike(vC.set(side === 'l' ? .012 : -.012, bike.RACK.y - .004, bike.RACK.z - .03), vE);
        dirOn(side === 'l' ? 1 : -1, -.8, 0, vPole); C.ik(girl, `upperarm.${side}`, `lowerarm.${side}`, `handslot.${side}`, vE, vPole);
      }
      const giggle = .06 * Math.sin(T * 13) * bump(g, 15.6, 15.9, 16.9, 17.2);
      girl.bend('head', -.15 + giggle, 0, 0);
      return;
    }
    vC.set(wx, ground(wx, wz), wz); qB.copy(faceQ(wf, qB));
    girl.root.position.copy(vC).lerp(vB, on); girl.root.position.y += .03 * hop;
    girl.root.quaternion.copy(qB).slerp(qA, on);
    spin(girl, g);
    if (on > .5) {
      /* on the rack: her left arm round his waist, her feet swinging */
      at(boy, 'spine', vD); dirOn(-1, -.4, -.2, vPole); vD.y -= .004;
      const hold = on * (1 - Math.max(bump(g, 8.7, 8.95, 9.5, 9.8), bump(g, 19, 19.2, 19.75, 19.95)));
      C.ik(girl, 'upperarm.l', 'lowerarm.l', 'handslot.l', vD, vPole, hold);
      for (const [side, ph] of [['l', 0], ['r', 1.7]]) girl.bend(`lowerleg.${side}`, .25 * Math.sin(T * 2.4 + ph), 0, 0);
    }
    /* scarf: hands at her neck as she comes out, snugging it; its ends swing as she moves */
    const wrap = bump(g, 5.7, 5.9, 6.25, 6.45);
    if (wrap) for (const s of ['l', 'r']) { girl.aim(`upperarm.${s}`, [s === 'l' ? .3 : -.3, .2, .9], wrap); girl.aim(`lowerarm.${s}`, [s === 'l' ? -.6 : .6, .7, .3], wrap); }
    scarf.ends.forEach((e, i) => { e.rotation.x = .12 + .08 * Math.sin(T * 2.6 + i * 1.3); e.rotation.z = .06 * Math.sin(T * 2 + i); });
    /* catching the note, reading it */
    const reach = bump(g, 8.7, 8.95, 9.5, 9.8);
    if (reach) for (const s of ['l', 'r']) { girl.aim(`upperarm.${s}`, [s === 'l' ? .25 : -.25, .35, .9], reach); girl.aim(`lowerarm.${s}`, [s === 'l' ? -.2 : .2, .6, .8], reach); }
    const laugh = Math.max(bump(g, 19, 19.2, 19.75, 19.95), bump(g, 9.75, 9.9, 10.3, 10.6) * .4);
    if (laugh) girl.bend('head', -.1 * laugh + .06 * Math.sin(T * 13) * laugh, 0, .12 * laugh);
    const rest = Math.max(bump(g, 9.75, 10, 10.15, 10.4), bump(g, 19.75, 20, 20.15, 20.4));   // at a stop: her head tipped towards him
    if (rest) girl.bend('head', .04 * Math.sin(T * 1.3) * rest, 0, .22 * rest);
    if (g > 23.45) poseTopGirl(g, T);
  }

  /** the note: in the basket, a hop out, a fluttering loop over his head into her hands; it opens into the page of words */
  function poseNote(g, T) {
    onBike(vA.set(0, .1, .098), vB);                                  // in the basket
    const fly = seg(g, 8.4, 9.05), caught = g >= 9.05;
    at(girl, 'handslot.l', vC); at(girl, 'handslot.r', vD); vC.add(vD).multiplyScalar(.5);
    if (g < 8.4) folded.position.copy(vB);
    else if (!caught) {
      const k = ease.inOut(fly);
      folded.position.lerpVectors(vB, vC, k); folded.position.y += .14 * Math.sin(Math.PI * k) + .02 * Math.sin(k * 12);
    } else folded.position.copy(vC);
    folded.rotation.set(fly * 9 + (caught ? 0 : 0), fly * 5, Math.sin(fly * 8) * .6);
    if (caught) folded.rotation.set(-.3, 0, 0);
    const opened = ease.out(seg(g, 9.2, 9.75)), away = ease.in(seg(g, 10, 10.4));
    folded.visible = g < 9.25;
    folded.scale.setScalar(bike.root.visible ? 1 : .001);
    note.root.visible = g > 9.2 && away < 1;
    const s = Math.max(.001, lerp(.08, 1, opened) * (1 - away));
    note.root.scale.setScalar(s);
    note.root.position.set(lerp(vC.x, -.1, opened), lerp(vC.y, .52, opened) + .008 * Math.sin(T * 1.6), lerp(vC.z, .12, opened));
    note.root.rotation.set(-.14, lerp(.4, 0, opened), .03 * Math.sin(T * .9));
    if (g > 9.3 && kit.once('note-open')) sparks.burst(16, () => ({ x: -.1 + (rng() - .5) * .3, y: .52 + (rng() - .5) * .2, z: .13, vy: .04, color: '#fff1b8', size: .02, life: .9, shape: 'sparkle', spin: 3 }));
  }

  /** at the top, after he gets off: kickstand, the rail, his arm round her, the turn for the photo, the kneel, the hug */
  function poseTop(g, T) {
    const atRail = bump(g, 25.6, 26, 27.1, 27.4), arm = bump(g, 26.1, 26.6, 27, 27.3);
    if (atRail) boy.bend('head', -.2 * atRail, 0, 0);
    if (arm) { boy.aim('upperarm.r', [-.6, .15, -.55], arm); boy.aim('lowerarm.r', [-.95, 0, .25], arm); }   // round her back (she is on his right)
    const selfie = bump(g, 27.6, 27.9, 30.15, 30.5);
    if (selfie) boy.bend('head', 0, 0, -.18 * selfie);
    /* the kneel: his right knee on the ground towards you, his left foot planted ahead, the box held out in both hands */
    const kneel = bump(g, 30.9, 31.7, 36.05, 36.3);
    if (kneel > 0) {
      boy.root.position.y -= .036 * kneel * SB;
      const f = boy.root.rotation.y, fwd = vA.set(Math.sin(f), 0, Math.cos(f)), right = vB.set(-Math.cos(f), 0, Math.sin(f));   // his right: towards you
      at(boy, 'upperleg.l', vC); vD.copy(vC).addScaledVector(fwd, .034).addScaledVector(right, -.008); vD.y = ground(vD.x, vD.z) + .021 * SB;
      vE.copy(fwd).multiplyScalar(1).add(UP); C.ik(boy, 'upperleg.l', 'lowerleg.l', 'foot.l', vD, vE, kneel);
      at(boy, 'upperleg.r', vC); vD.copy(vC).addScaledVector(fwd, -.03).addScaledVector(right, .006); vD.y = ground(vD.x, vD.z) + .012 * SB;
      vE.copy(fwd); C.ik(boy, 'upperleg.r', 'lowerleg.r', 'foot.r', vD, vE, kneel);
      boy.bend('spine', -.05 * kneel, 0, 0); boy.bend('head', -.18 * kneel, 0, 0);
    }
    const offer = bump(g, 31.6, 32, 35.9, 36.2);
    if (offer) for (const s of ['l', 'r']) { boy.aim(`upperarm.${s}`, [s === 'l' ? .12 : -.12, -.15, 1], offer); boy.aim(`lowerarm.${s}`, [s === 'l' ? -.15 : .15, .25, 1], offer); }
    const hug = bump(g, 36.9, 37.3, 40.5, 41), kiss = ease.smooth(seg(g, 38.7, 39.3));
    if (hug) { hugArms(boy, hug); boy.bend('chest', (.12 + .07 * kiss) * hug, 0, 0); boy.bend('head', (.1 + .06 * kiss) * hug, 0, .04 * Math.sin(T * 1.2) * kiss); }
  }
  /** the two of them swing once round between them while they hug */
  function spin(m, g) {
    const a = TAU * ease.inOut(seg(g, 37.2, 38.6)); if (!a || a >= TAU) return;
    const p = m.root.position, dx = p.x - SPIN.x, dz = p.z - SPIN.z, c = Math.cos(a), s = Math.sin(a);
    p.x = SPIN.x + dx * c + dz * s; p.z = SPIN.z - dx * s + dz * c; p.y = ground(p.x, p.z) + .012 * Math.sin(a / 2) * (m === girl ? 1 : 0);   // her feet leave the ground a little
    m.root.quaternion.premultiply(qB.setFromAxisAngle(UP, a));
  }
  function poseTopGirl(g, T) {
    const lean = bump(g, 25.9, 26.4, 27, 27.3), selfie = bump(g, 27.6, 27.9, 30.15, 30.5);
    if (lean) girl.bend('head', 0, 0, .3 * lean);
    if (selfie) girl.bend('head', 0, 0, -.16 * selfie);
    const gasp = bump(g, 32.5, 32.9, 34.4, 34.7);                     // both hands to her mouth
    if (gasp) { for (const s of ['l', 'r']) { girl.aim(`upperarm.${s}`, [s === 'l' ? .35 : -.35, .1, .9], gasp); girl.aim(`lowerarm.${s}`, [s === 'l' ? -.75 : .75, .55, .3], gasp); }
      girl.bend('head', -.15 * gasp, 0, 0); girl.bend('spine', -.08 * gasp, 0, 0); }
    const nod = bump(g, 34.2, 34.35, 34.6, 34.75);
    if (nod) girl.bend('head', .25 * nod * Math.sin((g - 34.2) * 30), 0, 0);
    const hug = bump(g, 36.9, 37.3, 40.5, 41), kiss = ease.smooth(seg(g, 38.7, 39.3));
    if (hug) { hugArms(girl, hug); girl.bend('chest', (.12 + .07 * kiss) * hug, 0, 0); girl.bend('head', (.14 + .06 * kiss) * hug, 0, -.04 * Math.sin(T * 1.2) * kiss); }
  }
  function hugArms(m, k) {
    m.aim('upperarm.r', [-.42, .05, .9], k); m.aim('lowerarm.r', [.8, .1, .6], k);
    m.aim('upperarm.l', [.42, .05, .9], k); m.aim('lowerarm.l', [-.8, .1, .6], k);
  }

  /** her camera: out of her pocket, held up in front of the two of them, a flash, the print flies up into the photo */
  function poseCamera(g, T, dt) {
    const hold = bump(g, 27.7, 28, 28.7, 29.1);
    camera.root.visible = hold > .01;
    if (hold) {
      girl.aim('upperarm.r', [-.25, .45, .85], hold); girl.aim('lowerarm.r', [-.05, .55, .85], hold);
      at(girl, 'handslot.r', vA); camera.root.position.copy(vA); camera.root.quaternion.copy(girl.root.quaternion).multiply(faceQ(Math.PI, qB));
      camera.root.scale.setScalar(Math.max(.001, ease.back(seg(g, 27.7, 28))));
    }
    const flash = bump(g, 28.15, 28.2, 28.3, 28.55);
    camera.flash.material.emissiveIntensity = 4 * flash;
    if (g > 28.2 && kit.once('flash')) { at(girl, 'handslot.r', vA); sparks.burst(26, () => ({ x: vA.x, y: vA.y, z: vA.z, vx: (rng() - .5) * .5, vy: (rng() - .5) * .5, vz: rng() * .3, drag: 2,
      color: '#ffffff', size: .03, life: .5, shape: 'sparkle', spin: 4 })); }
    /* the photo: out of the camera, up beside them; in the last chapter, aside */
    const out = ease.out(seg(g, 28.3, 29.3)), aside = ease.inOut(seg(g, 30, 30.7));
    at(girl, 'handslot.r', vA);
    photo.root.visible = g > 28.3;
    const ps = Math.max(.001, lerp(.1, 1, out) * lerp(1, .5, aside));
    photo.root.scale.setScalar(ps);
    photo.root.position.set(lerp(lerp(vA.x, .295, out), .39, aside), lerp(lerp(vA.y, .37, out), .44, aside) + .006 * Math.sin(T * 1.3), lerp(lerp(vA.z, -.05, out), -.12, aside));
    photo.root.rotation.set(-.08, lerp(-.5, -.12, out) + .04 * Math.sin(T * .8), lerp(.6, 0, out) + .03 * Math.sin(T * .6));
    photo.halo.material.opacity = .6 * ease.out(seg(g, 28.9, 29.4)) * (1 - .4 * aside) * (1 + .08 * Math.sin(T * 3));
    if (g > 28.6 && g < 29.6 && dt && rng() < dt * 14) {
      const a = rng() * TAU, s = photo.root.scale.y;
      sparks.emit({ x: photo.root.position.x + Math.cos(a) * .14 * s, y: photo.root.position.y + .13 * s + Math.sin(a) * .15 * s, z: photo.root.position.z + .01, color: '#fff1b8', size: .018, life: .9, shape: 'sparkle', spin: 3 });
    }
  }

  /** the ring box: out of his pocket into both hands, the lid opens, the ring shines */
  function poseRing(g, T, dt) {
    const show = bump(g, 31.6, 32, 36, 36.3);
    box.root.visible = show > .01;
    if (!show) return;
    at(boy, 'handslot.l', vA); at(boy, 'handslot.r', vB); vA.add(vB).multiplyScalar(.5);
    box.root.position.copy(vA); box.root.position.y += .004;
    box.root.quaternion.copy(boy.root.quaternion);
    box.root.scale.setScalar(Math.max(.001, ease.back(seg(g, 31.6, 32))) * 1.2);
    box.lid.rotation.x = -1.9 * ease.out(seg(g, 32.2, 32.6));
    box.ring.rotation.y = T * 1.5;
    if (g > 32.4 && kit.once('ring-shine')) sparks.burst(20, () => ({ x: vA.x, y: vA.y + .02, z: vA.z, vx: (rng() - .5) * .3, vy: .1 + rng() * .3, vz: (rng() - .5) * .2, drag: 2,
      color: ['#ffffff', '#cfefff', '#fff1b8'][(rng() * 3) | 0], size: .02, life: .9, shape: 'sparkle', spin: 4 }));
    if (g > 32.5 && dt && rng() < dt * 6) sparks.emit({ x: vA.x + (rng() - .5) * .02, y: vA.y + .02, z: vA.z + .01, vy: .03, color: '#e9f8ff', size: .016, life: .6, shape: 'sparkle', spin: 3 });
  }

  /** the two birds that bring the banner: in from either side, then holding its ends */
  function carryBird(g, T, i) {
    const s = i ? 1 : -1, k = ease.out(seg(g, 32.6, 33.6));
    const hx = banner.root.position.x + s * .33 * Math.max(.3, banner.root.scale.x), hy = banner.root.position.y + .07;
    return [lerp(s * .8, hx, k) + .006 * Math.sin(T * 5 + i), lerp(.95, hy, k) + .01 * Math.sin(T * 4 + i * 2), -.05];
  }
};
