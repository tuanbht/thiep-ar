/* Dạo bước trên không (walking on air), told by the shared act _acts/lovestory.js; the town (sky page, lane, houses, the
   flower shop and its sign, the balcony, bunting, lamps, birds, clouds, rings of light, her basket) is built by
   scenery.js, loaded first. Three chapters of about ten seconds, each ending at a stop:
     1 · 0–10 s    the flower town pops up at golden hour; she walks down the cobbled lane with her basket; a gust
                   scatters petals and whirls them into a column, and out of it steps a young man in an olive jacket; she
                   startles, he bows and snaps his fingers, and the flower shop's sign flies up off its bracket with the
                   card's first words (note1); he offers his arm and she takes it
     2 · 10–20 s   he steps up onto the air, a ring of light under his foot, and holds out his hand; she follows and they
                   climb an unseen stair, a ring at every step, as the sun goes down, the far town sinks away and clouds
                   drift in below; at the top she looks down and gasps, then laughs; birds circle them and two doves bring
                   the card's photo on ribbons, with its caption
     3 · 20–30 s   she leads him across the sky as dusk comes and the town lights up; they step down onto a balcony full
                   of flowers, she twirls among petals and sparkles, they hug, and a banner with the last words (note2)
                   rises
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own;
   flags, wings, glows and the birds' circling go by T, the act's own time. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;
  const PAGE = { width: 1.12, height: .92, curve: .08, z: -.3 };    // the sky page at the card's back edge
  const LANE = { z0: -.26, z1: .3125 };                              // the cobbles, from behind the houses to the card's front edge
  const S = window.NM_SKYWALK.scenery(kit, { PAGE, LANE });
  const { BALCONY: BAL, SIGN, ROW } = S;
  const NOTE_AT = new THREE.Vector3(-.12, .69, -.02);               // the sign's ring at the first stop: its board hangs over the two of them
  const ON = BAL.z0 + .047;                                        // how far out on her balcony they stand: clear of its rail and of the wall
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  const HOURS = [                                                    // afternoon, sunset, dusk: the sky's light, the ground's, the sun's
    ['#fff3e6', '#d8b9b4', '#fff0da', 1.1, 1.45], ['#ffd6c4', '#b98aa0', '#ffb486', 1.05, 1.3], ['#c2b6f2', '#6a5888', '#dcc2ff', .85, .9]
  ].map(([h, gr, s, hi, si]) => ({ hemi: new THREE.Color(h), ground: new THREE.Color(gr), sun: new THREE.Color(s), hi, si }));
  const PETALS = ['#ff9fbb', '#ffd1dc', '#ffffff', '#ffb3c6', '#ffe08a'];
  const H = .3;                                                      // his height; hers is H * .945 (1.70 m to his 1.80)
  let boy, girl, basket, page, lane, town = [], bunting, lamps, vane, bulbs = [], houses = [];
  let sign, photo, banner, doves, ribbons, birds, clouds, rings, standing, petals, sparks, hearts, wind, stars;

  /* ── who plays which clip from story time g: [from g, clip, options] ── */
  const GIRL = [
    [0, 'Idle'], [.3, 'Walking_A', { speed: 1.23, fade: .25 }], [3.85, 'Idle', { fade: .35 }], [8.7, 'Walking_A', { speed: 1.2, fade: .2 }],
    [9.3, 'Idle', { fade: .25 }], [12.1, 'Walking_A', { speed: 1.05, fade: .2 }], [15.55, 'Idle', { fade: .3 }],
    [20.45, 'Walking_A', { speed: 1.1, fade: .25 }], [24.95, 'Idle', { fade: .2 }], [27.15, 'Walking_A', { speed: 1.2, fade: .15 }], [27.45, 'Idle', { fade: .2 }]
  ];
  const BOY = [
    [0, 'Idle'], [10.5, 'Walking_A', { speed: 1.3, fade: .2 }], [11.3, 'Idle', { fade: .2 }], [12.6, 'Walking_A', { speed: 1.2, fade: .25 }],
    [15.3, 'Idle', { fade: .3 }], [20.75, 'Walking_A', { fade: .25 }], [24.9, 'Idle', { fade: .25 }], [27.1, 'Walking_A', { speed: 1.1, fade: .15 }],
    [27.45, 'Idle', { fade: .2 }]                                    // Idle at 24.9: his feet together for the hop down onto her balcony
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };

  /* where each of them is: [from g, x, y, z, facing, ease into it]; a walk eases in, keeps its pace, eases out */
  const GIRL_WAY = [
    [0, -.6, 0, .02, 1.42], [.3, -.6, 0, .02, 1.42], [.7, -.586, 0, .024, 1.42, 'in'], [3.6, -.248, 0, .056, 1.42, 'linear'],
    [4.0, -.232, 0, .058, 1.42, 'out'], [4.4, -.232, 0, .058, 1.25], [6.05, -.232, 0, .058, 1.25], [6.25, -.255, 0, .055, 1.3, 'out'],
    [8.7, -.255, 0, .055, 1.3], [9.25, -.19, 0, .062, 1.2], [9.9, -.19, 0, .062, .8], [10.7, -.19, 0, .062, .8], [11.0, -.19, 0, .062, 1.15],
    [12.1, -.19, 0, .062, 1.2], [12.45, -.13, .02, .06, 1.2, 'in'], [12.75, -.095, .05, .058, 1.2],
    [15.1, .16, .43, -.004, 1.25, 'linear'], [15.6, .185, .46, -.012, .35, 'out'], [20.3, .185, .46, -.012, .35], [20.7, .175, .46, -.01, -1.2],
    [22.9, -.07, .44, -.06, -1.2, 'linear'], [23.6, -.13, .33, ON, -1.3, 'linear'],   // behind her rail's line while still above it,
    [24.6, -.215, .17, ON, -1.25, 'linear'], [25.0, -.232, BAL.y, ON, -1.1, 'out'],        // then down her stair inside the balcony
    [25.6, -.232, BAL.y, ON, -.2], [25.8, -.232, BAL.y, ON, -.2], [27.0, -.232, BAL.y, ON, TAU - .2, 'linear'],
    [27.15, -.232, BAL.y, ON, TAU + 1.0], [27.45, -.194, BAL.y, ON, TAU + R - .3]   // a step to him: face to face for the hug, a little to you
  ];
  const BOY_WAY = [
    [0, -.05, 0, .075, -1.15], [8.7, -.05, 0, .075, -1.15], [9.3, -.065, 0, .072, -1.05], [9.9, -.065, 0, .072, -.7], [10.4, -.065, 0, .072, -.7],
    [10.6, -.06, 0, .072, 1.2], [10.75, -.04, .004, .07, 1.2, 'in'], [11.25, .03, .05, .066, 1.2, 'out'], [11.5, .03, .05, .066, -1.0],
    [12.4, .03, .05, .066, -1.0], [12.65, .03, .05, .066, 1.2], [12.75, .045, .065, .064, 1.25, 'in'], [15.0, .31, .46, -.02, 1.25, 'linear'],
    [15.35, .325, .46, -.025, .6, 'out'], [15.8, .325, .46, -.025, -.3], [20.4, .325, .46, -.025, -.3], [20.8, .315, .46, -.02, -1.2],
    [21.0, .3, .46, -.015, -1.2, 'in'], [23.4, .07, .44, -.05, -1.2, 'linear'], [24.2, -.015, .335, ON, -1.3, 'linear'],   // in over the rail's
    [24.9, -.1, .31, ON, -1.25, 'linear'], [25.5, -.105, BAL.y, ON, -1.1, 'in'],         // corner, high, then a hop down after her
    [26.0, -.105, BAL.y, ON, -.7], [27.1, -.105, BAL.y, ON, -.7], [27.45, -.146, BAL.y, ON, -R + .3]
  ];
  const keysOf = way => [1, 2, 3, 4].map(i => way.map(k => [k[0], k[i], k[5] || 'smooth']));
  const GIRL_KEYS = keysOf(GIRL_WAY), BOY_KEYS = keysOf(BOY_WAY);
  /* the photo's ring (its bottom, middle): in from the left with the doves, then up, over and down to the right */
  const PHOTO_KEYS = keysOf([[16.8, -.8, .8, -.06], [19.2, -.25, .42, -.02, 0, 'out'], [20.1, -.25, .42, -.02], [21.3, -.12, .66, -.16],
    [23.6, .27, .7, -.15, 0, 'linear'], [25.2, .3, .38, -.12, 0, 'out']]);

  /* ── bones on the stage, arms that reach ── */
  const mStage = new THREE.Matrix4(), qInv = new THREE.Quaternion(), vS = new THREE.Vector3(), vTo = new THREE.Vector3();
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vM = new THREE.Vector3(), vF = new THREE.Vector3(), vT = new THREE.Vector3();
  const at = (m, bone, out) => { const n = m.node(bone); n.updateWorldMatrix(true, false); return out.setFromMatrixPosition(n.matrixWorld).applyMatrix4(mStage); };
  /** aims an arm (upper, then lower) at a point on the stage, k of the way */
  function reach(m, side, target, k) {
    if (!k) return;
    at(m, `upperarm.${side}`, vS); vTo.copy(target).sub(vS).applyQuaternion(qInv.copy(m.root.quaternion).invert());
    const d = [vTo.x, vTo.y, vTo.z]; m.aim(`upperarm.${side}`, d, k); m.aim(`lowerarm.${side}`, d, k);
  }
  /** hand in hand: both arms to a point between their shoulders, a little below */
  function hands(a, sa, b, sb, k) {
    if (!k) return;
    at(a, `upperarm.${sa}`, vA); at(b, `upperarm.${sb}`, vB); vM.addVectors(vA, vB).multiplyScalar(.5); vM.y -= .05;
    reach(a, sa, vM, k); reach(b, sb, vM, k);
  }
  /* rings under their steps on the air: a foot that stops going down has landed */
  const feet = new Map();
  function steps(m, g, dt, on) {
    if (!dt) return;
    for (const side of ['l', 'r']) {
      const key = `${m.root.name}${side}`, f = feet.get(key) || { h: 1, fall: false }; feet.set(key, f);
      at(m, `foot.${side}`, vF); const h = vF.y - m.root.position.y;
      if (on && f.fall && h > f.h + .0003 && f.h < .03) {
        rings.spawn(vF.x, m.root.position.y, vF.z + .008, g);
        sparks.burst(4, () => ({ x: vF.x, y: m.root.position.y + .004, z: vF.z, vx: (rng() - .5) * .12, vy: .05 + rng() * .06, vz: (rng() - .5) * .08, drag: 2,
          color: rng() < .5 ? '#fff1d6' : '#ffc2d6', size: .014, life: .7, shape: 'sparkle', spin: 3 }));
      }
      f.fall = h < f.h - .0002; f.h = h;
    }
  }

  /** a town piece popping up out of the card with a squash */
  function pop(o, g, at0) {
    const k = ease.back(seg(g, at0, at0 + .4)), t = g - at0 - .4, sq = t > 0 ? .06 * Math.exp(-8 * t) * Math.sin(20 * t) : 0;
    o.scale.set(Math.max(.001, k * (1 + sq)), Math.max(.001, k * (1 - sq)), Math.max(.001, k * (1 + sq))); o.visible = g > at0;
  }
  function light(warm, dusk) {
    const { hemi, sun } = kit.lights, [a, b, c] = HOURS;
    hemi.color.copy(a.hemi).lerp(b.hemi, warm).lerp(c.hemi, dusk); hemi.groundColor.copy(a.ground).lerp(b.ground, warm).lerp(c.ground, dusk);
    sun.color.copy(a.sun).lerp(b.sun, warm).lerp(c.sun, dusk);
    hemi.intensity = lerp(lerp(a.hi, b.hi, warm), c.hi, dusk); sun.intensity = lerp(lerp(a.si, b.si, warm), c.si, dusk);
  }

  /* ── the birds: four small ones on the roofs and the lane, two doves on her balcony rail. The gust sends them up; the
        small ones circle high, then round the two of them in the air, and go to roost at dusk; the doves bring the photo ── */
  const PERCH = [[-.39, .258, -.17], [.075, .35, -.21], [.12, .009, .16], [.2, .009, .11]];   // ridges (the bird's middle sits above them), the lane
  const ROOST = [[.24, .279, -.19], [.435, .229, -.165], [-.42, .258, -.17], [.015, .35, -.21]];
  const DOVE_PERCH = [[-.25, BAL.y + BAL.rail + .002, BAL.z1 - .004], [-.13, BAL.y + BAL.rail + .002, BAL.z1 - .004]];   // on her balcony's rail
  const vP = new THREE.Vector3(), vQ = new THREE.Vector3(), vC = new THREE.Vector3();
  function circle(i, T, cx, cy, cz, rx, rz, out) {
    const a = T * (.9 + i * .07) + i * 1.6;
    return out.set(cx + Math.cos(a) * rx, cy + .03 * Math.sin(a * 2 + i), cz + Math.sin(a) * rz);
  }
  function poseBird(b, x, y, z, fly, T, i) {
    const p = b.root.position, dx = x - p.x, dz = z - p.z, moved = Math.hypot(dx, dz);
    if (moved > 1e-4) b.yaw = Math.atan2(dx, dz);
    p.set(x, y, z); b.root.rotation.set(fly ? clamp(((b.lastY ?? y) - y) * 25, -.5, .5) : .35 * Math.max(0, Math.sin(T * 3.1 + i * 2)), b.yaw ?? 0, 0, 'YXZ');   // nose down as it dives; perched, it pecks
    b.lastY = y;
    S.flapBird(b, fly ? .5 + .5 * Math.sin(T * (20 + i) + i) * (Math.sin(T * .8 + i) > -.3 ? 1 : .15) : 0, 1 - fly);
  }

  return {
    seconds: [10, 10, 10],

    build() {
      /* the two of them (the shared couple, templates/_models) */
      boy = kit.model('boy').fit({ height: H }); girl = kit.model('girl').fit({ height: H * .945 });
      boy.root.name = 'boy'; girl.root.name = 'girl';
      stage.add(boy.root, girl.root);
      basket = S.makeBasket(); basket.scale.setScalar(1.25); stage.add(basket);

      /* the town */
      page = S.makePage(); lane = S.makeLane(); stage.add(page.root, lane);
      houses = ROW.map(o => { const h = S.house(o); stage.add(h.root); town.push([h.root, o.pop]); return h; });
      const balcony = S.makeBalcony(bulbs), shopFront = S.makeShopFront(); houses[1].root.add(balcony); houses[3].root.add(shopFront);
      balcony.position.set(-ROW[1].x, 0, -ROW[1].z); shopFront.position.set(-ROW[3].x, 0, -ROW[3].z);   // they are drawn in stage units
      bunting = S.makeBunting(); stage.add(bunting.root); town.push([bunting.root, 1.05]);
      lamps = [S.lampPost(-.45, .21), S.lampPost(.45, .2)]; lamps.forEach((l, i) => { stage.add(l.root); town.push([l.root, 1.15 + i * .1]); });
      [[-.39, .25, 51], [.38, .255, 53]].forEach(([x, z, seed], i) => { const p = S.planter(x, z, seed); stage.add(p); town.push([p, 1.3 + i * .1]); });
      vane = S.makeVane(); houses[2].root.add(vane.root); vane.root.position.set(0, ROW[2].h + ROW[2].rh, 0);
      clouds = [[.3, .24, .1, 1.4, 14.6], [-.32, .26, .06, 1.2, 15.2], [.05, .2, -.1, 1, 13.4], [.44, .45, -.12, .9, 13.9], [-.46, .5, -.1, .9, 14.3]]
        .map(([x, y, z, s, at0], i) => { const c = S.makeCloud(17 + i * 9, s); c.root.position.set(x, y, z); c.home = [x, y, z]; c.at = at0; stage.add(c.root); return c; });

      /* the birds */
      birds = ['#ffc7a8', '#a9d4f5', '#d6c2f5', '#ffe08a'].map(c => { const b = S.makeBird({ body: c, wing: '#fffaf2', size: .95 }); stage.add(b.root); return b; });
      doves = [0, 1].map(() => { const b = S.makeBird({ body: '#ffffff', wing: '#eee8f8', beak: '#f0a0a0', size: 1.3, glow: .35 }); stage.add(b.root); return b; });
      const silk = kit.keep(new THREE.MeshStandardMaterial({ color: 0xff8fb0, roughness: .5 })), thread = kit.keep(new THREE.CylinderGeometry(.001, .001, 1, 4).translate(0, .5, 0));
      ribbons = [0, 1].map(() => { const r = new THREE.Mesh(thread, silk); stage.add(r); return r; });

      /* the card's words and photo */
      sign = S.makeSign(); sign.setWords(words('note1', 'Đi cùng anh nhé, đừng nhìn xuống')); sign.root.rotation.order = 'YXZ'; stage.add(sign.root);
      photo = kit.polaroid({ width: .22, caption: words('caption', 'Mình bước trên mây'), glow: .55, halo: true, haloColor: 0xffd6e4 });
      banner = kit.sign({ text: words('note2', 'Ở bên em, anh như đang bay'), style: 'banner', width: .6, accent: '#e8648a', paper: '#fff8ee', glow: .55 });
      const garland = [];                                              // flowers at the banner's two ends
      for (const s of [-1, 1]) for (let i = 0; i < 9; i++) garland.push([s * (.29 + (rng() - .5) * .03), (rng() - .5) * .16, .006, .007 + rng() * .004, PETALS[i % 5] === '#ffffff' ? '#ff7fa3' : PETALS[i % 5]]);
      const ends = new THREE.InstancedMesh(kit.keep(new THREE.IcosahedronGeometry(1, 1)), kit.keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, emissive: 0xffffff, emissiveIntensity: .22 })), garland.length);
      const q = new THREE.Matrix4(), col = new THREE.Color(); garland.forEach(([x, y, z, s, c], i) => { ends.setMatrixAt(i, q.makeScale(s, s, s).setPosition(x, y, z)); ends.setColorAt(i, col.set(c)); });
      ends.frustumCulled = false; banner.root.add(ends);
      stage.add(photo.root, banner.root);

      /* rings of light, two that glow under them while they stand on the air, and particles */
      rings = S.makeRings(30); rings.list.forEach(r => stage.add(r.m, r.h));
      standing = [0, 1].map(() => { const r = S.makeRings(1); stage.add(r.list[0].m, r.list[0].h); return r; });
      [petals, sparks, hearts, wind, stars] = [{ max: 360 }, { max: 320, additive: true }, { max: 120 }, { max: 60, additive: true }, { max: 70, additive: true }].map(o => kit.particles(o));
      stage.add(petals.root, sparks.root, hearts.root, wind.root, stars.root);
    },

    reset() {
      [petals, sparks, hearts, wind, stars].forEach(p => p.clear()); rings.clear(); feet.clear();
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();

      /* ── the hour: afternoon; a sunset as they climb; dusk as they cross. The far town sinks while they are up ── */
      const warm = ease.smooth(seg(g, 10.5, 15.5)), dusk = ease.smooth(seg(g, 20.6, 24.6));
      light(warm, dusk);
      page.set(ease.inOut(seg(g, 12.7, 15.6)) * (1 - ease.inOut(seg(g, 23.2, 25.4))), dusk, warm);
      const fold = ease.out(seg(g, 0, .8)), wob = g > .8 ? Math.exp(-6 * (g - .8)) * Math.sin(14 * (g - .8)) : 0;
      page.root.rotation.x = -R * (1 - fold) + .08 * wob;
      lane.scale.z = Math.max(.001, ease.out(seg(g, .05, .6)));
      town.forEach(([o, at0]) => pop(o, g, at0));
      const gust = bump(g, 4.25, 4.55, 5.4, 6.1);
      bunting.pose(T, gust, ease.smooth(seg(g, 22.8, 23.6)));
      houses.forEach(h => { const k = ease.out(seg(g, h.at, h.at + .3)); h.lit[0].emissiveIntensity = .9 * k; h.lit[1].emissiveIntensity = .9 * k; });
      lamps.forEach((l, i) => { const k = ease.out(seg(g, 22.2 + i * .3, 22.6 + i * .3)), f = 1 + .05 * Math.sin(T * 11 + i * 4); l.glass.emissiveIntensity = 1.6 * k * f; l.glow.material.opacity = .85 * k * f; });
      bulbs.forEach(b => { b.emissiveIntensity = 1.4 * ease.out(seg(g, 23, 23.5)) * (1 + .12 * Math.sin(T * 5)); });
      vane.arrow.rotation.y = .5 * Math.sin(T * .35) + 13 * ease.inOut(seg(g, 4.3, 6.4));
      if (g > 22.6 && kit.once('stars')) stars.burst(46, i => { const x = (rng() - .5) * 1.04; return { x, y: .5 + rng() * .4, z: page.zAt(x) + .012,
        color: ['#ffffff', '#fff2c4', '#d8d0ff'][i % 3], size: .007 + rng() * .011, life: 1e6, shape: i % 4 ? 'glow' : 'star', twinkle: 1.5 + rng() * 3.5 }; });

      /* ── where the two of them are ── */
      const [gx, gy, gz, gyaw] = GIRL_KEYS.map(k => tween(g, k)), [bx, by, bz, byaw] = BOY_KEYS.map(k => tween(g, k));
      const aloft = bump(g, 15.55, 15.9, 20.25, 20.6), sway = .004 * Math.sin(T * 1.7) * aloft;   // standing on the air, they rise and fall a little
      const startle = .013 * Math.sin(Math.PI * seg(g, 6.05, 6.3)), land = .007 * Math.sin(Math.PI * seg(g, 25, 25.35)), land2 = .007 * Math.sin(Math.PI * seg(g, 25.5, 25.85));
      girl.root.position.set(gx, gy + startle - land + sway, gz); girl.root.rotation.y = gyaw;
      const appear = seg(g, 5.25, 5.85);
      boy.root.position.set(bx, by - land2 + sway * .8, bz); boy.root.rotation.y = byaw + 3 * Math.PI * (1 - ease.out(seg(g, 5.2, 6.0)));
      boy.root.visible = g > 5.25; boy.root.scale.setScalar(Math.max(.001, ease.back(appear)));
      girl.root.visible = g > .3;
      const gc = clipAt(GIRL, g), bc = clipAt(BOY, g);
      girl.play(gc[1], gc[2]); boy.play(bc[1], bc[2]);

      /* ── chapter 1: the lane, the gust, his bow, the sign, his arm ── */
      const look = bump(g, 1.2, 1.7, 3.2, 3.8);                      // she looks about at the flowers as she walks
      if (look) girl.bend('head', -.08, .45 * Math.sin(g * 1.7), 0, look);
      const shield = bump(g, 4.3, 4.6, 5.5, 5.95);                    // the gust: her face turned from it, a hand up
      if (shield) { girl.bend('head', .12, -.7, -.1, shield); girl.bend('spine', 0, -.25, 0, shield); girl.aim('upperarm.l', [.3, .25, .9], shield); girl.aim('lowerarm.l', [-.35, .9, .45], shield); }
      const fright = bump(g, 5.95, 6.15, 6.9, 7.5);                   // startled: hands to her chest, leaning back
      if (fright) {
        girl.bend('spine', -.16, 0, 0, fright); girl.bend('head', -.18, 0, 0, fright);
        girl.aim('upperarm.l', [.25, -.35, .9], fright); girl.aim('lowerarm.l', [-.65, .65, .4], fright);
        girl.aim('upperarm.r', [-.25, -.35, .9], fright); girl.aim('lowerarm.r', [.65, .65, .4], fright);
      }
      const bow = bump(g, 6.55, 6.95, 7.3, 7.7);                      // he bows low, a hand on his heart, the other swept out
      if (bow) {
        boy.bend('chest', .45, 0, 0, bow); boy.bend('head', .22, 0, 0, bow);
        boy.aim('upperarm.r', [.15, -.55, .8], bow); boy.aim('lowerarm.r', [.95, .25, .2], bow);
        boy.aim('upperarm.l', [.85, -.45, -.25], bow); boy.aim('lowerarm.l', [.85, -.2, -.45], bow);
      }
      const shy = bump(g, 6.9, 7.3, 8.2, 8.6); if (shy) girl.bend('head', .1, 0, -.25, shy);
      const snap = bump(g, 7.6, 7.85, 8.35, 8.75);                    // a snap of his fingers, high: the sign comes away
      if (snap) { boy.aim('upperarm.l', [.35, .85, .25], snap); boy.aim('lowerarm.l', [.05 + .3 * bump(g, 7.88, 7.92, 7.98, 8.08), 1, .3], snap); boy.bend('head', -.22, -.3, 0, snap); }
      const after = bump(g, 7.95, 8.35, 8.8, 9.2); if (after) girl.bend('head', -.35, -.25, 0, after);   // her eyes after it
      const unlink = 1 - ease.smooth(seg(g, 10.2, 10.5));
      const offer = ease.smooth(seg(g, 8.6, 9.0)) * unlink;           // he offers his arm
      if (offer) { boy.aim('upperarm.r', [-.42, -.8, .4], offer); boy.aim('lowerarm.r', [-.3, .05, .95], offer); }
      const take = ease.smooth(seg(g, 9.1, 9.6)) * unlink;            // her hand on his forearm
      if (take) { at(boy, 'lowerarm.r', vA); at(boy, 'hand.r', vB); vA.lerp(vB, .6); reach(girl, 'l', vA, take); }
      const fond = bump(g, 9.55, 9.95, 10.25, 10.6); if (fond) { girl.bend('head', 0, -.2, -.15, fond); boy.bend('head', 0, .2, .12, fond); }

      /* ── chapter 2: up the air ── */
      const clutch = k => {                                           // both hands to her chest, the basket hugged in (it can change hands there)
        girl.aim('upperarm.l', [.2, -.5, .85], k); girl.aim('lowerarm.l', [-.75, .35, .5], k); girl.aim('upperarm.r', [-.2, -.5, .85], k); girl.aim('lowerarm.r', [.75, .35, .5], k);
      };
      const gasp = bump(g, 10.95, 11.25, 11.95, 12.25);               // he stands on nothing: she leans back, hugging her basket
      if (gasp) { girl.bend('spine', -.12, 0, 0, gasp); girl.bend('head', -.12, 0, 0, gasp); clutch(gasp); }
      const invite = bump(g, 11.45, 11.8, 12.2, 12.5);                // he turns back and holds out his hand
      if (invite) {                                                   // his arm out straight to her, at her height: take my hand
        boy.aim('upperarm.l', [.22, -.28, .95], invite); boy.aim('lowerarm.l', [.12, -.18, 1], invite); boy.bend('chest', .2, 0, 0, invite); boy.bend('head', .18, 0, .12, invite);
        const take2 = bump(g, 11.95, 12.2, 12.4, 12.6); if (take2) { at(boy, 'hand.l', vT); reach(girl, 'r', vT, take2); }
      }
      if (g > 11.0 && kit.once('first-step')) sparks.burst(22, i => { const a = i / 22 * TAU; return { x: .03 + Math.cos(a) * .045, y: .055, z: .07 + Math.sin(a) * .03,
        vx: Math.cos(a) * .18, vy: .06 + rng() * .08, vz: Math.sin(a) * .1, drag: 2, color: i % 2 ? '#fff1d6' : '#ffc2d6', size: .02, life: .9, shape: 'sparkle', spin: 3 }; });
      hands(boy, 'l', girl, 'r', bump(g, 12.1, 12.35, 12.55, 12.75));  // she takes it; then up they go
      hands(boy, 'r', girl, 'r', bump(g, 12.6, 12.8, 15.3, 15.6));
      hands(boy, 'r', girl, 'l', bump(g, 16.55, 16.9, 20.25, 20.5));
      const wobble = bump(g, 12.5, 12.75, 13.3, 13.7);                // her first steps: the free arm out for balance, up over her balcony's rail
      if (wobble) { girl.aim('upperarm.l', [.8, .35 + .25 * Math.sin(T * 7), .3], wobble); girl.aim('lowerarm.l', [.9, .3, 0], wobble); girl.bend('spine', 0, 0, .1 * Math.sin(T * 6), wobble); }
      const down = bump(g, 15.8, 16.05, 16.55, 16.85), laugh = bump(g, 16.6, 16.85, 17.45, 17.85);
      if (down) { girl.bend('chest', .22, 0, 0, down); girl.bend('head', .42, 0, 0, down); boy.bend('head', .2, .25, 0, down); clutch(down); }   // looking down, the basket hugged
      if (laugh) { const shake = Math.sin(T * 17); girl.bend('head', -.3, 0, .1, laugh); girl.bend('chest', -.06 + .05 * shake, 0, 0, laugh); boy.bend('head', -.22, .2, 0, laugh); boy.bend('chest', -.04 * shake, 0, 0, laugh); }
      if (g > 16.85 && kit.once('laugh')) { at(girl, 'head', vT); hearts.burst(7, () => ({ x: vT.x - .03, y: vT.y + .06, z: vT.z + .03, vx: (rng() - .6) * .2, vy: .1 + rng() * .1, vz: .04,
        gravity: -.08, drag: .8, color: ['#ff8fab', '#ffc2d1', '#ff4f7b'][(rng() * 3) | 0], size: .016 + rng() * .01, life: 1.6, shape: 'heart', spin: 2 })); }
      const watch = bump(g, 17.7, 18.1, 20.2, 20.5); if (watch) { girl.bend('head', -.05, .35, 0, watch); boy.bend('head', -.05, .45, 0, watch); }   // the doves come in

      /* ── chapter 3: across the sky and down to the balcony ── */
      hands(girl, 'l', boy, 'l', bump(g, 20.5, 20.8, 24.55, 24.85));   // she leads him now
      const back = bump(g, 21.3, 21.6, 22.5, 22.9); if (back) girl.bend('head', 0, .7, 0, back);   // a look back at him
      const spin = bump(g, 25.7, 25.95, 26.9, 27.15);                 // her twirl, arms out; he claps
      if (spin) { girl.aim('upperarm.l', [.95, .2, .1], spin); girl.aim('lowerarm.l', [.95, .35, .1], spin); girl.aim('upperarm.r', [-.95, .2, .1], spin); girl.aim('lowerarm.r', [-.95, .35, .1], spin); girl.bend('head', -.2, 0, 0, spin); }
      const clap = bump(g, 25.95, 26.15, 26.9, 27.1);
      if (clap) { const c = .25 * Math.abs(Math.sin(T * 9)); boy.aim('upperarm.r', [-.2, -.35, .9], clap); boy.aim('lowerarm.r', [.5 - c, .45, .7], clap); boy.aim('upperarm.l', [.2, -.35, .9], clap); boy.aim('lowerarm.l', [-.5 + c, .45, .7], clap); }
      const hug = ease.smooth(seg(g, 27.5, 28.05));
      if (hug) {                                                      // his elbows out round her, his hands at her waist
        boy.aim('upperarm.r', [-.55, -.45, .7], hug); boy.aim('lowerarm.r', [.65, -.05, .75], hug); boy.aim('upperarm.l', [.55, -.45, .7], hug); boy.aim('lowerarm.l', [-.65, -.05, .75], hug);
        girl.aim('upperarm.l', [.42, .3, .9], hug); girl.aim('lowerarm.l', [-.75, .4, .55], hug);   // her basket stays in the other hand
        girl.bend('head', 0, -.3, -.14, hug); boy.bend('head', .1, .3, .1, hug); boy.bend('chest', .12, 0, 0, hug);
      }

      /* rings under their steps on the air, and the two that hold them up at the second stop */
      steps(boy, g, dt, g > 10.6 && g < 25.4); steps(girl, g, dt, g > 12.2 && g < 24.95);
      rings.pose(g, T);
      standing.forEach((r, i) => {
        const m = i ? boy : girl, q = r.list[0]; q.m.visible = q.h.visible = aloft > .01;
        q.m.position.set(m.root.position.x, m.root.position.y + .002, m.root.position.z + .008); q.h.position.copy(q.m.position);
        q.m.material.opacity = aloft * (1 + .1 * Math.sin(T * 3 + i)); q.m.scale.setScalar(.12 * (1 + .04 * Math.sin(T * 2 + i)));
        q.h.material.opacity = .28 * aloft * (1 + .3 * Math.sin(T * 2.4 + i)); q.h.scale.setScalar(.18);
        if (dt && aloft > .5 && rng() < dt * 7) sparks.emit({ x: q.m.position.x + (rng() - .5) * .07, y: q.m.position.y - .005, z: q.m.position.z + (rng() - .5) * .04, vy: -.05 - rng() * .04,
          sway: .01, color: rng() < .5 ? '#ffe6a8' : '#ffc2d6', size: .012 + rng() * .008, life: 1.3, shape: rng() < .5 ? 'sparkle' : 'glow', spin: 2 });
      });

      /* ── her basket, upright in her right hand (in her left on the climb, so her right can hold his: it changes hands
            while she hugs it to her chest); it swings as she walks and flies out as she twirls ── */
      at(girl, 'handslot.r', vA); at(girl, 'handslot.l', vB); basket.position.lerpVectors(vA, vB, seg(g, 11.5, 11.7) * (1 - seg(g, 16.1, 16.3)));
      const walking = gc[1] === 'Walking_A' ? 1 : 0, twirling = g > 25.8 && g < 27 ? 1 : 0;
      basket.rotation.set(.14 * Math.sin(T * 6.3) * walking, girl.root.rotation.y, -.9 * twirling * Math.sin(Math.PI * seg(g, 25.8, 27.0)) + .05 * Math.sin(T * 1.8), 'YXZ');
      basket.visible = girl.root.visible;

      /* ── the shop's sign: on its bracket; at his snap it flies up over them, turning its words to you; then home ── */
      const out = ease.inOut(seg(g, 7.95, 8.85)) * (1 - ease.inOut(seg(g, 10.05, 10.85))), arc = Math.sin(Math.PI * out);
      sign.root.position.set(lerp(SIGN.x, NOTE_AT.x, out), lerp(SIGN.y, NOTE_AT.y, out) + .08 * arc + .007 * Math.sin(T * 1.6) * out, lerp(SIGN.z, NOTE_AT.z, out));
      sign.root.scale.setScalar(Math.max(.001, lerp(.17, 1, ease.out(out)) * (g > .75 ? 1 : 0)));
      sign.root.rotation.set((.08 + 1.2 * gust) * Math.sin(T * (1.8 + gust * 7)) * (1 - out) + .03 * Math.sin(T * 1.3) * out, lerp(R + TAU, 0, ease.out(out)), .025 * Math.sin(T * 1.1) * out);   // a turn and a quarter as it flies
      sign.glow(lerp(.25, .5, out));
      if (g > 7.9 && kit.once('snap')) { at(boy, 'hand.l', vT); for (let i = 0; i < 18; i++) sparks.emit({ x: vT.x, y: vT.y, z: vT.z, vx: (rng() - .5) * .4, vy: (rng() - .3) * .4, vz: (rng() - .5) * .3, drag: 2.5, color: '#fff1b8', size: .02, life: .8, shape: 'sparkle', spin: 4 }); }
      if (g > 7.95 && g < 8.9 && dt) for (let i = 0; i < 3; i++) sparks.emit({ x: sign.root.position.x + (rng() - .5) * .3 * out, y: sign.root.position.y - .14 * out + (rng() - .5) * .2 * out, z: sign.root.position.z + .02,
        vy: .03, drag: 1, color: ['#fff1b8', '#ffd1dc', '#ffffff'][i], size: .016, life: .7, shape: 'sparkle', spin: 3 });
      if (g > 8.85 && kit.once('sign-up')) sparks.burst(30, i => { const a = i / 30 * TAU; return { x: NOTE_AT.x + Math.cos(a) * .22, y: NOTE_AT.y - .145 + Math.sin(a) * .15, z: NOTE_AT.z + .02,
        vx: Math.cos(a) * .12, vy: Math.sin(a) * .12, drag: 2.2, color: i % 2 ? '#fff1b8' : '#ffb3c6', size: .02, life: 1, shape: 'sparkle', spin: 3 }; });

      /* ── the gust: streaks of wind, petals torn off the flower boxes, whirled into a column; out of it, him ── */
      if (dt && gust > .05) for (let i = 0; i < 2; i++) {
        if (rng() < gust) wind.emit({ x: .55, y: .04 + rng() * .32, z: -.1 + rng() * .35, vx: -1.1 - rng() * .4, vy: .05, life: .9, color: '#ffffff', size: .045 + rng() * .03, shape: 'drop', rot: -R });
        if (rng() < gust) petals.emit({ x: .1 + rng() * .4, y: .05 + rng() * .2, z: -.12 + rng() * .1, vx: -.45 - rng() * .3, vy: .1 + rng() * .1, vz: .1 + rng() * .15, drag: .4, gravity: -.08,
          sway: .05, color: PETALS[(rng() * 5) | 0], size: .016 + rng() * .01, life: 1.8, shape: 'petal', spin: (rng() - .5) * 8 });
      }
      const whirl = bump(g, 4.8, 5.1, 5.75, 5.95);
      if (dt && whirl) for (let i = 0; i < 10; i++) {
        const h = rng() * .36, a = T * 9 + i * TAU / 10 + h * 9, rad = (.05 + .07 * (1 - seg(g, 4.8, 5.7))) * (1 - h * .6);
        (i % 4 ? petals : sparks).emit({ x: -.05 + Math.cos(a) * rad, y: h, z: .075 + Math.sin(a) * rad * .7, vx: -Math.sin(a) * .25, vy: .12, vz: Math.cos(a) * .2, drag: 3,
          color: i % 4 ? PETALS[(rng() * 5) | 0] : '#fff1c8', size: .018 + rng() * .008, life: .36, shape: i % 4 ? 'petal' : 'sparkle', spin: 6 });
      }
      if (g > 5.85 && kit.once('appear')) {
        petals.burst(40, () => { const a = rng() * TAU; return { x: -.05, y: .05 + rng() * .25, z: .075, vx: Math.cos(a) * .4, vy: .1 + rng() * .2, vz: Math.sin(a) * .25, drag: 1.4, gravity: -.12,
          sway: .04, color: PETALS[(rng() * 5) | 0], size: .016 + rng() * .01, life: 2.2, shape: 'petal', spin: (rng() - .5) * 6 }; });
        sparks.burst(24, () => ({ x: -.05, y: .15, z: .075, vx: (rng() - .5) * .5, vy: (rng() - .3) * .4, vz: (rng() - .5) * .3, drag: 2, color: '#fff1b8', size: .02, life: .9, shape: 'sparkle', spin: 4 }));
      }
      if (dt && rng() < dt * (g < 10 ? 2.5 : held && g > 29 ? 3 : 0)) petals.emit({ x: (rng() - .5) * .9, y: .45 + rng() * .2, z: -.1 + rng() * .3, vx: -.03, vy: -.05, sway: .05, gravity: -.01,
        color: PETALS[(rng() * 5) | 0], size: .014 + rng() * .006, life: 6, shape: 'petal', spin: (rng() - .5) * 3, floor: g < 10 ? .001 : BAL.y });
      if (g > 9.6 && kit.once('arm')) hearts.burst(10, () => ({ x: -.13, y: .32, z: .07, vx: (rng() - .5) * .2, vy: .12 + rng() * .1, vz: (rng() - .5) * .08, gravity: -.1, drag: .7,
        color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .022 + rng() * .012, life: 2, shape: 'heart', spin: (rng() - .5) * 3 }));

      /* ── the birds ── */
      const mid = vC.set((gx + bx) / 2, (gy + by) / 2 + .42, (gz + bz) / 2 - .07);   // over their heads and a little behind: never across a face
      birds.forEach((b, i) => {
        const off = ease.inOut(seg(g, 4.4 + i * .12, 5.6 + i * .12)), join = ease.inOut(seg(g, 12.8 + i * .2, 14.2 + i * .2)), roost = ease.inOut(seg(g, 22.4 + i * .3, 24 + i * .3));
        circle(i, T, 0, .86, -.2, .38, .1, vP); circle(i, T * 1.3, mid.x, mid.y, mid.z, .22, .13, vQ); vP.lerp(vQ, join).lerp(vT.set(...ROOST[i]), roost);
        vQ.set(...PERCH[i]).lerp(vP, off); b.root.visible = g > .9;
        poseBird(b, vQ.x, vQ.y, vQ.z, off * (1 - ease.smooth(seg(g, 23.7 + i * .3, 24 + i * .3))), T, i);
      });

      /* ── the doves and the photo: they fly off in the gust, and come back with the photo on two ribbons ── */
      const [px, py, pz] = PHOTO_KEYS.map(k => tween(g, k)), shrink = lerp(1, .78, ease.inOut(seg(g, 23.6, 25.2))), seen = g > 16.8 ? 1 : 0;
      const swingZ = .06 * Math.sin(T * 1.4) + .1 * Math.sin(Math.PI * seg(g, 16.8, 19.4)) - .08 * Math.sin(Math.PI * seg(g, 21.3, 25.2));
      photo.root.position.set(px, py + .006 * Math.sin(T * 1.3), pz); photo.root.scale.setScalar(Math.max(.001, shrink * seen * ease.out(seg(g, 16.8, 17.4))));
      photo.root.rotation.set(-.06, .1 * Math.sin(T * .7), swingZ);
      photo.halo.material.opacity = .38 * ease.smooth(seg(g, 18.6, 19.4)) * (1 - .5 * seg(g, 20.1, 21)) * (1 + .08 * Math.sin(T * 3));
      const ph = photo.height * shrink, pw = photo.width * shrink, cz = Math.cos(swingZ), sz = Math.sin(swingZ);
      const settle = Math.max(bump(g, 19.0, 19.5, 20.1, 20.4), ease.smooth(seg(g, 25.1, 25.6)));   // at a stop they turn to you, wings going
      doves.forEach((d, i) => {
        const s = i ? 1 : -1, leave = ease.inOut(seg(g, 4.35 + i * .15, 5.6 + i * .15));
        const cx = px + s * pw * .45 * cz - ph * sz, cy = py + s * pw * .45 * sz + ph * cz;   // the photo's top corner, as it swings
        vP.set(...DOVE_PERCH[i]).lerp(vT.set(-.85 + i * .05, .95, -.12), leave);
        if (seen) vP.set(cx, cy + .055 + .008 * Math.sin(T * 6 + i * 2), pz);
        poseBird(d, vP.x, vP.y, vP.z, seen || (leave > 0 && g < 5.8) ? 1 : 0, T * 1.1, i + 7);
        d.root.rotation.y = lerp(d.yaw ?? 0, -s * .4, settle);
        d.root.visible = g > .45 && (g < 6.2 || seen > 0);
        const r = ribbons[i]; vA.set(vP.x, vP.y - .008, vP.z); vB.set(cx, cy, pz).sub(vA);
        r.position.copy(vA); r.scale.set(1, vB.length(), 1); r.quaternion.setFromUnitVectors(vT.set(0, 1, 0), vB.normalize()); r.visible = seen > 0;
      });

      /* ── clouds drift in below them as they climb, and part as they come down ── */
      clouds.forEach((c, i) => {
        const k = ease.out(seg(g, c.at, c.at + 1.6)) * (1 - ease.inOut(seg(g, 23.4 + i * .2, 25.2 + i * .2)));
        c.root.visible = k > .01; c.root.scale.setScalar(Math.max(.001, lerp(.5, 1, k)));
        c.root.position.set(c.home[0] + .015 * Math.sin(T * .25 + i * 2), c.home[1] + .006 * Math.sin(T * .6 + i), c.home[2]);
        c.m.opacity = k; c.m.emissive.setRGB(1, lerp(.85, .62, dusk), lerp(.89, .95, dusk)); c.m.emissiveIntensity = lerp(.45, .3, dusk);
      });

      /* ── at the balcony: a puff of petals as she lands, the twirl's spiral, the hug's hearts ── */
      if (g > 25.05 && kit.once('land')) petals.burst(22, () => { const a = rng() * TAU; return { x: -.232 + Math.cos(a) * .05, y: BAL.y + .01, z: ON + Math.sin(a) * .03,
        vx: Math.cos(a) * .2, vy: .15 + rng() * .1, vz: Math.sin(a) * .1, drag: 1.5, gravity: -.15, color: PETALS[(rng() * 5) | 0], size: .016, life: 1.6, shape: 'petal', spin: 4, floor: BAL.y }; });
      if (dt && g > 25.8 && g < 27.1) for (let i = 0; i < 3; i++) {
        const a = T * 8 + i * TAU / 3, k = seg(g, 25.8, 27.1);
        (i ? petals : sparks).emit({ x: -.232 + Math.cos(a) * .07, y: BAL.y + .02 + k * .25, z: ON + Math.sin(a) * .05, vx: -Math.sin(a) * .15, vy: .12, vz: Math.cos(a) * .1, drag: 1,
          color: i ? PETALS[(rng() * 5) | 0] : '#fff1b8', size: i ? .016 : .02, life: 1.1, shape: i ? 'petal' : 'sparkle', spin: 4 });
      }
      if (g > 28 && kit.once('hug')) hearts.burst(26, () => ({ x: -.17, y: BAL.y + .3, z: -.06, vx: (rng() - .5) * .45, vy: .14 + rng() * .25, vz: (rng() - .5) * .15, gravity: -.18, drag: .9,
        color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .022 + rng() * .02, life: 2.4, shape: 'heart', spin: (rng() - .5) * 4 }));
      if (held && dt && g > 29 && rng() < dt * 1.2) hearts.emit({ x: -.17 + (rng() - .5) * .16, y: BAL.y + .3, z: -.07, vy: .07, sway: .03, color: '#ff8fab', size: .018, life: 2.2, shape: 'heart' });

      /* ── the last words: a banner with flowers at its ends rises over the balcony ── */
      const bn = ease.elastic(seg(g, 28.3, 29.3));
      banner.root.scale.setScalar(Math.max(.001, bn)); banner.root.position.set(-.17, .585 + .006 * Math.sin(T * 1.5), -.02); banner.root.rotation.set(-.08, 0, .02 * Math.sin(T * 1.1));

      [petals, sparks, hearts, wind, stars].forEach(p => p.update(dt, T));
    }
  };
};
