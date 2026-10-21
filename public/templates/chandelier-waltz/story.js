/* Điệu valse đêm hội (a waltz at the ball), told by the shared act _acts/lovestory.js; the ballroom is built by ballroom.js,
   her ball gown by wardrobe.js and what the stops show by keepsakes.js, all loaded first. Four chapters, each
   ending at a stop:
     1 · 0–10.2 s     the ballroom builds itself round him: marble tiles flip in, the wall folds up, columns grow and bloom
                      with roses, a chandelier comes down and its candles light one by one, warming the room; she comes in,
                      he bows, she curtsies, and he offers an invitation that flies up and turns over: "Thư mời" and the
                      card's first words (note1)
     2 · 10.2–20.6 s  she takes the card to her heart; he offers his hand and they waltz round the floor in three-four time
                      (down on one, rising on two and three), her gown swirling, gold sparkles left on the floor behind
                      them; the sparkles rise and write the card's second words (note2) in gold above them
     3 · 20.6–30.8 s  the words fall as glitter; she twirls twice under his raised hand, he dips her, the chandelier flares,
                      rose petals rain, and the petals swirl into a gold frame holding the card's photo and its caption
     4 · 30.8–40.8 s  the candles go out and the chandelier rises into the dark; moonlight through the windows; a slow
                      dance, he kisses her hand, they stand close, and a banner with the last words (note3) rises
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own;
   flames, twinkles and the gentle sway at a stop go by T, the act's own time. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;                          // R: facing +x, towards her
  const FLOOR = .005;                                                // the top of the marble floor
  const H = .3, HER = H * .945;                                      // their heights (her 1.70 m to his 1.80)
  const WALL = { width: 1.1, height: .8, curve: .12, z: -.3 };       // the painted wall at the card's back edge
  const CHAN = { x: 0, z: -.07, top: 1.4, rest: .7, high: 1.5 };   // the chandelier: out of sight, lowered, raised away at night
  const COLUMNS = [[-.43, -.2], [.43, -.2]], URNS = [[-.41, .21], [.41, .21]];   // columns at the back, urns of roses at the front
  const CARD_AT = [0, .47, .07], WORDS_AT = [0, .47, .06];           // the invitation and the gold words at their stops
  const FRAME_AT = [.27, .48, .04], FRAME_ASIDE = [.41, .65, -.1];   // the framed photo at its stop, and kept up aside
  const S = window.NM_WALTZ.scenery(kit, { FLOOR, WALL, CHAN, COLUMNS, URNS });
  const W = window.NM_WALTZ.wardrobe(kit), K = window.NM_WALTZ.keepsakes(kit);
  const rand = K.seeded(523);                                        // the card's own seed: the same sparkles every time
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  const LIGHT = Object.fromEntries(Object.entries({                   // before the candles, lit, and moonlight
    dark: ['#7f86c0', '#30243f', '#aab4ff', .55, .45], warm: ['#ffe9cc', '#8c5b5e', '#ffe0b0', 1.05, 1.25], moon: ['#9fb0ff', '#262246', '#c4d0ff', .62, .8]
  }).map(([k, [h, gr, s, hi, si]]) => [k, { hemi: new THREE.Color(h), ground: new THREE.Color(gr), sun: new THREE.Color(s), hi, si }]));
  let boy, girl, princess, floor, wall, columns, urns, chan, beams, twins;
  let card, gold, frame, framed, photo, banner, trail, swirl, heartPic, sparks, hearts, petals, notes, smoke, particles, TR, tinted = 0;

  /* ── the waltz: round the floor on an oval while the two of them turn, two turns in all, five bars of three ── */
  const WZ = { g0: 12.6, g1: 19.8, bar: 1.44, O: [0, -.06], RX: .17, RZ: .1, d: .095, o: .025, turns: 2 };   // d: his toes clear of her hem
  const along = u => lerp(u, ease.smooth(u), .5);                    // a gentle start and finish
  const wz = { cx: 0, cz: 0, th: R, rise: 0, beat: 0, nb: 0, ph: 0 };
  /** the couple's middle, his facing, the rise (down on one, up on two and three) and the beat, at story time g */
  function waltz(g) {
    const u = seg(g, WZ.g0, WZ.g1), e = along(u), a = e * TAU, t = Math.max(0, g - WZ.g0), bar = t / WZ.bar;
    wz.cx = WZ.O[0] + WZ.RX * Math.sin(a); wz.cz = WZ.O[1] + WZ.RZ * Math.cos(a); wz.th = R - WZ.turns * TAU * e;
    wz.ph = bar % 1; wz.beat = (bar * 3) % 1; wz.nb = Math.floor(bar * 3);
    wz.rise = u > 0 && u < 1 ? .007 * ease.smooth(seg(wz.ph, .12, .45)) * (1 - ease.smooth(seg(wz.ph, .8, 1))) : 0;
    return wz;
  }
  const pathAt = (u, out) => { const a = along(u) * TAU; out[0] = WZ.O[0] + WZ.RX * Math.sin(a); out[1] = WZ.O[1] + WZ.RZ * Math.cos(a); return out; };
  /** him and her about a middle, him facing th: d apart, each a little to the other's right (o), as in a ballroom hold */
  function placePair(cx, cz, th, d, o, B, G) {
    const ux = Math.sin(th), uz = Math.cos(th), rx = -Math.cos(th), rz = Math.sin(th);
    B[0] = cx - ux * d / 2 - rx * o / 2; B[1] = cz - uz * d / 2 - rz * o / 2; B[2] = th;
    G[0] = cx + ux * d / 2 + rx * o / 2; G[1] = cz + uz * d / 2 + rz * o / 2; G[2] = th + Math.PI;
  }

  /* where each of them is when not waltzing: [from g, x, z, facing, ease into it] */
  const BOY_WAY = [
    [0, -.08, .04, 0], [1.3, -.08, .04, 0], [1.8, -.08, .04, .75], [2.4, -.08, .04, -.6], [2.9, -.08, .04, 0], [5.9, -.08, .04, 0], [6.5, -.08, .04, R * .85],
    [11.3, -.08, .04, R * .85], [12.1, -.0475, .0275, R],
    [20.6, -.0475, .0275, R], [21.2, -.055, .02, R], [24, -.055, .02, R], [24.6, -.045, .02, R], [26.7, -.045, .02, R],
    [27.5, -.084, .056, R * .25], [30.8, -.084, .056, R * .25], [31.8, -.05, .025, R], [34, -.05, .025, R], [34.4, -.065, .02, R],
    [36.3, -.065, .02, R], [37.2, -.045, .04, R * .15]
  ];
  const GIRL_WAY = [   // (side by side, she stands .085 from him: her gown's hem is .06 round her)
    [0, .58, .06, -R], [5.6, .58, .06, -R], [7.8, .2, .05, -R, 'linear'], [8.2, .2, .05, -R * .9], [11.7, .2, .05, -R * .9], [12.5, .0475, .0525, -R],
    [20.6, .0475, .0525, -R], [21.2, .045, .05, -R], [24, .045, .05, -R], [24.6, .045, .045, -R], [26.7, .045, .045, -R],
    [27.5, -.006, .024, R * .25], [30.8, -.006, .024, R * .25], [31.8, .05, .055, -R], [34, .05, .055, -R], [34.4, .065, .06, -R],
    [36.3, .065, .06, -R], [37.2, .04, .05, -R * .15]
  ];
  const keysOf = way => [1, 2, 3].map(i => way.map(k => [k[0], k[i], k[4] || 'smooth']));
  const BOY_KEYS = keysOf(BOY_WAY), GIRL_KEYS = keysOf(GIRL_WAY);
  const B = [0, 0, 0], G = [0, 0, 0], SB = [0, 0, 0], SG = [0, 0, 0], P2 = [0, 0];
  function stride(g, g0, g1, a, b) {                                  // her walk in: an even pace between eased ends
    const r = .35, v = (b - a) / (g1 - g0 - 2 * r + 2 * r / 3), e = v * r / 3;
    const x = tween(g, [[g0, a], [g0 + r, a + e, 'in'], [g1 - r, b - e, 'linear'], [g1, b, 'out']]);
    return [x, Math.max(.3, Math.abs(v) * Math.min(1, seg(g, g0, g0 + r), 1 - seg(g, g1 - r, g1)) ** 2 / .1)];
  }

  /* ── where things are in someone's hands, and arms that reach for a point on the stage ── */
  const mStage = new THREE.Matrix4(), qInv = new THREE.Quaternion(), vS = new THREE.Vector3(), vT = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
  const vC = new THREE.Vector3(), vD = new THREE.Vector3(), vK = new THREE.Vector3();   // vK: where he kisses her hand
  const at = (m, bone, out) => { const b = m.node(bone); b.updateWorldMatrix(true, false); return out.setFromMatrixPosition(b.matrixWorld).applyMatrix4(mStage); };
  const D = [0, 0, 0], U = [0, 0, 0];
  const toward = (m, side, target) => { at(m, `upperarm.${side}`, vS); vS.subVectors(target, vS).applyQuaternion(qInv.copy(m.root.quaternion).invert()); return vS.toArray(D); };
  /** an arm reaching for a point: in reach, the elbow bends (out, and down by `drop`: up when it is less than 0; or towards
      `pole`, a way in the character's own space) so the hand lands on it; out of reach, the arm points at it, the upper arm
      a little below the line */
  const LEN = new Map(), vI = new THREE.Vector3(), vN = new THREE.Vector3(), vQ = new THREE.Vector3(), vE = new THREE.Vector3(), vL = new THREE.Vector3();
  function reach(m, side, target, k, drop = .25, pole = null) {
    if (k <= 0) return;
    const key = m.root.name + side;
    if (!LEN.has(key)) { at(m, `lowerarm.${side}`, vL); LEN.set(key, [at(m, `upperarm.${side}`, vI).distanceTo(vL), vL.distanceTo(at(m, `handslot.${side}`, vI))]); }
    const [a, b] = LEN.get(key), d = toward(m, side, target), dist = vI.fromArray(d).length();
    if (dist >= (a + b) * .999) {
      const s = drop * Math.min(1, (dist - a - b) / (.3 * (a + b)));
      U[0] = d[0]; U[1] = d[1] - s * Math.hypot(d[0], d[2]); U[2] = d[2];
      m.aim(`upperarm.${side}`, U, k); m.aim(`lowerarm.${side}`, d, k); return;
    }
    const A = Math.acos(Math.min(1, Math.max(-1, (a * a + dist * dist - b * b) / (2 * a * dist))));
    vN.copy(vI).normalize(); if (pole) vQ.fromArray(pole); else vQ.set(side === 'r' ? -1 : 1, -.3 - 2.5 * drop, -.3);
    vQ.addScaledVector(vN, -vQ.dot(vN)).normalize();
    vE.copy(vN).multiplyScalar(Math.cos(A)).addScaledVector(vQ, Math.sin(A));          // the upper arm, to the elbow
    vI.addScaledVector(vE, -a);                                                        // the forearm, from the elbow to the point
    m.aim(`upperarm.${side}`, vE.toArray(U), k); m.aim(`lowerarm.${side}`, vI.toArray(D), k);
  }

  /* ── gestures the clips do not have (directions in the character's own space: +x its left, +y up, +z ahead) ── */
  const arms = (m, k, l1, l2, r1, r2) => { if (k <= 0) return; if (l1) { m.aim('upperarm.l', l1, k); m.aim('lowerarm.l', l2, k); } if (r1) { m.aim('upperarm.r', r1, k); m.aim('lowerarm.r', r2, k); } };
  function bow(m, k) {                                                // a gallant bow: right hand on his heart, left arm swept back
    if (k <= 0) return;
    m.bend('spine', .2 * k, 0, 0); m.bend('chest', .22 * k, 0, 0); m.bend('head', .2 * k, 0, 0);
    arms(m, k, [.65, -.6, -.45], [.5, -.7, -.5], [-.2, -.85, .45], [.95, .25, .05]);
  }
  function curtsy(m, k) {                                             // head bowed, her skirt held out at both sides
    if (k <= 0) return;
    m.bend('spine', .1 * k, 0, 0); m.bend('chest', .06 * k, 0, 0); m.bend('head', .3 * k, 0, 0);
    arms(m, k, [.6, -.75, .25], [.75, -.55, .35], [-.6, -.75, .25], [-.75, -.55, .35]);
  }
  const clasp = (m, k) => arms(m, k, [.15, -.6, .8], [-.75, .1, .65], [-.15, -.6, .8], [.75, .1, .65]);   // hands together, shy
  const toHeart = (m, k) => arms(m, k, [.2, -.4, .9], [-.85, .35, .35], [-.2, -.4, .9], [.85, .35, .35]);
  const behindBack = (m, k) => arms(m, k, [.35, -.75, -.5], [-.55, -.2, -.8]);
  const lapels = (m, k, T) => arms(m, k, [.25, -.5, .8], [-.6, .6 + .12 * Math.sin(T * 9), .5], [-.25, -.5, .8], [.6, .6 - .12 * Math.sin(T * 9), .5]);
  const offer = (m, side, k) => (side === 'l' ? arms(m, k, [.2, -.25, 1], [-.05, .15, 1]) : arms(m, k, null, null, [-.2, -.25, 1], [.05, .15, 1]));
  const steps = (m, k, beat, nb, lift = 1) => {                       // a step on every beat, one leg then the other
    if (k <= 0) return;
    const side = nb % 2 ? 'l' : 'r', sw = Math.sin(Math.PI * beat) * k * lift;
    m.bend(`upperleg.${side}`, -.45 * sw, 0, 0); m.bend(`lowerleg.${side}`, .7 * sw, 0, 0);
  };
  /** her legs straight down under the gown: a stride, or the wide hems of her trousers, would come out through it */
  const underGown = m => { for (const [s, x] of [['l', .05], ['r', -.05]]) { m.aim(`upperleg.${s}`, [x, -1, .02]); m.aim(`lowerleg.${s}`, [x * .4, -1, -.02]); } };

  return {
    seconds: [10.2, 10.4, 10.2, 10],

    build() {
      /* the couple, her in a rose ball gown */
      boy = kit.model('boy').fit({ height: H }); girl = kit.model('girl').fit({ height: HER });
      stage.add(boy.root, girl.root);
      princess = W.dressPrincess(girl);

      /* the ballroom */
      floor = S.makeFloor(); wall = S.makeWall(); columns = S.makeColumns(); urns = S.makeUrns(); chan = S.makeChandelier(); beams = S.makeBeams();
      twins = [S.mirror(boy), S.mirror(girl)];

      /* the card's words and photo: an invitation, words of gold light, a framed photo, a banner */
      card = K.makeInvitation(words('note1', 'Trân trọng mời em một điệu nhảy'));
      gold = K.makeWords(words('note2', 'Một, hai, ba… mình xoay cùng nhau nhé'));
      photo = kit.polaroid({ width: .26, caption: words('caption', 'Đêm vũ hội của mình'), glow: .5, halo: true, haloColor: 0xffd48a });
      frame = K.makeFrame(photo.width);
      framed = new THREE.Group(); photo.root.position.y = -photo.height / 2; frame.mesh.position.set(0, -frame.offset, .004);
      framed.add(photo.root, frame.mesh);
      banner = kit.sign({ text: words('note3', 'Nhảy cùng anh trọn đời nhé'), style: 'banner', width: .62, accent: '#8a1f3d', paper: '#fff4dc', glow: .6 });
      heartPic = kit.picture((c, px) => { c.fillStyle = '#ff4f7b'; kit.heartPath(c, px / 2, px * .52, px * .86); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(px * .34, px * .36, px * .08, px * .05, -.6, 0, 7); c.fill(); }, { size: .07 });
      stage.add(card.root, framed, banner.root, gold.mesh, heartPic);
      [card.root, framed, banner.root].forEach(o => o.traverse(x => { x.castShadow = false; }));

      /* particles: the trail that becomes the gold words, the petals that become the frame, and loose ones */
      trail = K.makeFlock(360); swirl = K.makeFlock(110);
      TR = Array.from({ length: trail.n }, () => [rand(), rand(), rand()]);   // each trail sparkle's own place and twinkle
      sparks = kit.particles({ max: 320, additive: true }); hearts = kit.particles({ max: 160 }); petals = kit.particles({ max: 360 });
      notes = kit.particles({ max: 40 }); smoke = kit.particles({ max: 60 });
      particles = [sparks, hearts, petals, notes, smoke];
      stage.add(trail.root, swirl.root, ...particles.map(p => p.root));
    },

    reset() {
      for (const p of particles) p.clear();
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();

      /* ── the room: tiles, the wall, columns, urns of roses, the chandelier; dim, then candlelit, then moonlit ── */
      S.poseFloor(floor, g);
      const fold = ease.inOut(seg(g, .05, .8)), wob = g > .8 ? Math.exp(-6 * (g - .8)) * Math.sin(14 * (g - .8)) : 0;
      wall.root.rotation.x = R * (1 - fold) - .08 * wob;
      columns.forEach((c, i) => S.poseColumn(c, ease.elastic(seg(g, 1.3 + i * .2, 2.4 + i * .2)), seg(g, 2 + i * .2, 3.4 + i * .2)));
      const warm = ease.smooth(seg(g, 4.6, 6.6)), moon = ease.inOut(seg(g, 31.2, 34.2));
      const flare = bump(g, 25.1, 25.4, 26.4, 27.6), after = seg(g, 25.4, 26) * (1 - seg(g, 31.2, 32.4));
      const out = i => 1 - seg(g, 31.2 + i * .09, 31.5 + i * .09);       // the candles go out one by one
      urns.forEach((u, i) => S.poseUrn(u, seg(g, 2.2 + i * .15, 2.7 + i * .15), seg(g, 2.6 + i * .15, 3.8 + i * .15)));
      const down = ease.out(seg(g, 2.6, 5)), up = ease.inOut(seg(g, 32.6, 35.4)), landed = Math.max(0, g - 5);
      chan.root.position.y = lerp(lerp(CHAN.top, CHAN.rest, down), CHAN.high, up) + .012 * Math.sin(landed * 5) * Math.exp(-2 * landed);
      chan.root.rotation.z = .03 * Math.sin(landed * 3.1) * Math.exp(-1.2 * landed) + .006 * Math.sin(T * .7);
      chan.body.rotation.y = .05 * g;
      chan.candles.forEach((cd, i) => S.poseCandle(cd, seg(g, 4.6 + i * .14, 4.9 + i * .14) * out(13 - i), T, i, 1 + .8 * flare + .15 * after));
      const lit = warm * (1 - seg(g, 31.2, 32.6));
      chan.light.intensity = lit * (2 + 2.6 * flare + .4 * after); chan.halo.material.opacity = lit * (.32 + .35 * flare);
      chan.crystal.emissiveIntensity = lit * (.15 + .9 * flare); floor.shine.material.opacity = lit * (.4 + .4 * flare);
      chan.halo.visible = chan.halo.material.opacity > .002; floor.shine.visible = floor.shine.material.opacity > .002;   // nothing drawn that cannot be seen
      if (g > 25.1 && g < 25.6 && kit.once('flare')) { vA.set(CHAN.x, chan.root.position.y, CHAN.z);
        sparks.burst(40, i => { const a = i / 40 * TAU; return { x: vA.x, y: vA.y, z: vA.z, vx: Math.cos(a) * .35, vy: Math.sin(a) * .25, vz: (rng() - .5) * .2, drag: 1.6,
          color: ['#fff1b8', '#ffd27a', '#ffffff'][i % 3], size: .022, life: 1.3, shape: i % 2 ? 'sparkle' : 'glow', spin: 3 }; }); }
      const L = kit.lights, dark = LIGHT.dark, lw = LIGHT.warm, lm = LIGHT.moon;
      L.hemi.color.copy(dark.hemi).lerp(lw.hemi, warm).lerp(lm.hemi, moon); L.hemi.groundColor.copy(dark.ground).lerp(lw.ground, warm).lerp(lm.ground, moon);
      L.sun.color.copy(dark.sun).lerp(lw.sun, warm).lerp(lm.sun, moon);
      L.hemi.intensity = lerp(lerp(dark.hi, lw.hi, warm), lm.hi, moon) * (1 + .2 * flare); L.sun.intensity = lerp(lerp(dark.si, lw.si, warm), lm.si, moon);
      L.sun.position.set(lerp(.45, .12, moon), lerp(1.4, 1.6, moon), lerp(.95, -.2, moon));   // at night from the windows, high, so the shadows stay on the floor
      wall.night.material.opacity = Math.max(.72 * (1 - warm) * seg(g, .3, .9), moon);
      wall.night.visible = wall.night.material.opacity > .002; wall.day.visible = wall.night.material.opacity < .998;
      beams.beams.forEach((b, i) => { b.material.opacity = .5 * moon * (i ? .7 : 1) * (1 + .06 * Math.sin(T * .8 + i)); b.visible = moon > .002; });
      beams.pool.material.opacity = .55 * moon; beams.pool.visible = moon > .002;
      S.MIRROR.uAlpha.value = .27 * seg(g, 1.6, 2.6) * (1 - .35 * moon);
      if (moon > .3 && dt && rng() < dt * 9) { const w = [0, -.33, .33][(rng() * 3) | 0], k = rng();   // dust motes in the moonbeams
        sparks.emit({ x: lerp(w, w * .55, k) + (rng() - .5) * .1, y: lerp(.45, .03, k), z: lerp(-.25, .08, k), vy: -.004, sway: .01, color: '#dfe6ff', size: .008 + rng() * .006, life: 2.5, shape: 'glow', twinkle: 3 }); }

      /* ── where they are, which way they look, which clip ── */
      B[0] = tween(g, BOY_KEYS[0]); B[1] = tween(g, BOY_KEYS[1]); B[2] = tween(g, BOY_KEYS[2]);
      G[0] = tween(g, GIRL_KEYS[0]); G[1] = tween(g, GIRL_KEYS[1]); G[2] = tween(g, GIRL_KEYS[2]);
      let walkIn = null;
      if (g > 5.6 && g < 7.8) { walkIn = stride(g, 5.6, 7.8, .58, .2); G[0] = walkIn[0]; }
      const dancing = g > WZ.g0 && g < WZ.g1, w = waltz(g);
      if (dancing) placePair(w.cx, w.cz, w.th, WZ.d, WZ.o, B, G);
      const slow = bump(g, 31.6, 32, 33.7, 34.1), rock = .4 * Math.sin((g - 31.8) * 2.6) * slow;
      if (slow > 0) {                                                 // the slow dance: close, rocking a little each way
        placePair(0, .04, R + rock, lerp(.1, .095, slow), .03, SB, SG);
        for (let i = 0; i < 3; i++) { B[i] = lerp(B[i], SB[i], slow); G[i] = lerp(G[i], SG[i], slow); }
      }
      const twirl = ease.inOut(seg(g, 21.8, 24)), dipping = bump(g, 24.6, 25.2, 26.4, 27.1);
      G[2] -= 2 * TAU * twirl;
      boy.root.position.set(B[0], FLOOR + (dancing ? w.rise : 0), B[1]); boy.root.rotation.y = B[2];
      const curt = bump(g, 8.7, 9.05, 9.35, 9.75), sink = .01 * curt + .006 * dipping;   // she sinks in her curtsy and in the dip
      girl.root.position.set(G[0] + .008 * dipping, FLOOR + (dancing ? w.rise : 0) - sink, G[1]); girl.root.rotation.y = G[2];
      girl.root.visible = g > 5.5;
      boy.play('Idle');
      if (walkIn) girl.play('Walking_A', { speed: walkIn[1] }); else girl.play('Idle', { fade: .3 });

      /* ── bodies first (spines, chests, heads, legs), so every reach below starts from where the shoulders end up ── */
      const bowing = bump(g, 7.9, 8.25, 8.6, 9), kissing = bump(g, 34.5, 34.95, 35.6, 36.1);
      bow(boy, bowing);
      curtsy(girl, curt);
      if (dipping) { girl.bend('spine', -.38 * dipping, 0, 0); girl.bend('chest', -.34 * dipping, 0, 0); girl.bend('head', -.35 * dipping, 0, 0);
        boy.bend('spine', .22 * dipping, 0, 0); boy.bend('chest', .28 * dipping, 0, 0); boy.bend('head', .22 * dipping, 0, 0); }
      if (kissing) { boy.bend('spine', .42 * kissing, 0, 0); boy.bend('chest', .5 * kissing, 0, 0); boy.bend('head', .3 * kissing, 0, 0); }
      const look = (m, x, y, k) => { if (k > 0) m.bend('head', x * k, y * k, 0); };
      look(boy, .28, .2 * Math.sin(g * 2.4), bump(g, .2, .5, 1.1, 1.4));            // the floor appearing at his feet
      look(boy, -.25, .3 * Math.sin((g - 1.4) * 2.6), bump(g, 1.4, 1.7, 2.6, 2.9)); // the columns growing, one side then the other
      look(boy, -.38, 0, bump(g, 2.7, 3.1, 5.2, 5.6));                               // the chandelier coming down
      look(girl, -.2, -.25 * Math.sin(g * 1.7), bump(g, 6, 6.4, 7.4, 7.8));          // she looks round the room as she comes in
      look(girl, .12, 0, bump(g, 9.7, 10, 11.6, 12));                                // shy, at the stop
      look(girl, -.3, 0, bump(g, 9.75, 10.05, 10.4, 10.6)); look(boy, -.25, 0, bump(g, 9.7, 10, 10.4, 10.6));   // up at the card
      const hold = bump(g, 12.1, 12.6, 26.9, 27.3), endUp = bump(g, 19.85, 20.2, 20.8, 21.2);
      if (hold) for (const m of [boy, girl]) { m.bend('spine', -.05 * hold, 0, .05 * Math.sin(w.ph * TAU) * (dancing ? 1 : 0)); m.bend('head', -.08 * hold, .3 * hold * (1 - endUp), 0); }
      look(boy, -.3, 0, endUp); look(girl, -.32, 0, endUp);                          // up at the gold words
      if (dancing) { const k = Math.min(seg(g, WZ.g0, WZ.g0 + .3), 1 - seg(g, WZ.g1 - .3, WZ.g1)); steps(boy, k, w.beat, w.nb); }
      look(boy, -.15, .25 * Math.sin((g - 21.8) * 3), bump(g, 21.8, 22.1, 23.7, 24));   // watching her twirl
      look(girl, -.25, 0, bump(g, 22, 22.3, 23.6, 24));
      const admire = bump(g, 28, 28.5, 30.9, 31.5); look(boy, -.22, .15, admire); look(girl, -.22, -.1, admire);   // up at the photo
      if (slow > 0) {                                                 // the slow dance: his hands at her waist, hers on his shoulders
        const lx = Math.cos(G[2]), lz = -Math.sin(G[2]);              // her left, on the stage
        at(girl, 'spine', vT); reach(boy, 'r', vC.set(vT.x + lx * .022, vT.y, vT.z + lz * .022), slow, .3);
        reach(boy, 'l', vC.set(vT.x - lx * .022, vT.y, vT.z - lz * .022), slow, .3);
        at(boy, 'upperarm.l', vT); vT.y += .008; reach(girl, 'r', vT, slow, .2);
        at(boy, 'upperarm.r', vT); vT.y += .008; reach(girl, 'l', vT, slow, .2);
        look(boy, .05, -.45, slow); look(girl, .05, -.45, slow);
      }
      const close = ease.smooth(seg(g, 36.6, 37.4)), sway = held ? .03 * Math.sin(T * 1.3) : 0;
      if (close) {                                                    // her head on his shoulder (he is at her right, she at his left)
        girl.bend('spine', 0, 0, .06 * close + sway); girl.bend('head', 0, 0, .28 * close); boy.bend('head', 0, 0, -.12 * close); boy.bend('spine', 0, 0, sway);
      }
      const step3 = (m, a, b) => steps(m, bump(g, a, a + .1, b - .1, b), (g - a) * 3.2 % 1, Math.floor((g - a) * 3.2), .7);   // small steps to a new place
      step3(boy, 11.3, 12.1); step3(boy, 20.6, 21.2); step3(boy, 24, 24.6); step3(boy, 27, 27.6); step3(boy, 30.9, 31.8); step3(boy, 36.3, 37.2);
      underGown(girl);                                                // she glides: under the gown her steps do not show

      /* ── chapter 1: he waits, straightens his coat, bows; she curtsies; the invitation flies up and turns over ── */
      lapels(boy, bump(g, 5.05, 5.3, 5.75, 5.95), T);
      behindBack(boy, bump(g, 6.4, 6.8, 7.8, 8.05) + bump(g, 9.95, 10.15, 11.15, 11.4));
      const draw = bump(g, 9.2, 9.4, 9.55, 9.75), present = bump(g, 9.55, 9.75, 9.95, 10.15);
      arms(boy, draw, null, null, [-.2, -.45, .85], [.85, .3, .4]);       // a hand into his coat
      offer(boy, 'r', present);
      clasp(girl, bump(g, 9.7, 10, 10.3, 10.5));
      if (g > 9.15 && g < 9.6 && kit.once('bowed')) hearts.burst(10, () => ({ x: .04 + (rng() - .5) * .06, y: .3, z: .06, vx: (rng() - .5) * .15, vy: .14 + rng() * .1,
        gravity: -.1, drag: .6, color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .022 + rng() * .014, life: 2, shape: 'heart', spin: (rng() - .5) * 3 }));
      toHeart(girl, bump(g, 10.8, 11.05, 11.5, 11.8));
      arms(girl, bump(g, 10.45, 10.65, 10.85, 11.05), [.2, -.3, .95], [-.3, .1, 1], [-.2, -.3, .95], [.3, .1, 1]);   // both hands out for the card
      at(boy, 'handslot.r', vA); at(girl, 'handslot.l', vB).add(at(girl, 'handslot.r', vC)).multiplyScalar(.5);
      const fly = ease.inOut(seg(g, 9.55, 10.15)), toHer = ease.inOut(seg(g, 10.3, 10.95)), gone = ease.in(seg(g, 11.35, 11.6));
      vD.set(...CARD_AT).lerp(vB, toHer); vC.copy(vA).lerp(vD, fly);
      card.root.position.set(vC.x, vC.y + .008 * Math.sin(T * 1.6) * (1 - toHer), vC.z);
      card.root.scale.setScalar(Math.max(.001, lerp(.12, 1, fly) * lerp(1, .16, toHer) * (1 - gone)));
      card.root.rotation.set(-.1 * (1 - toHer), Math.PI * (1 - ease.inOut(seg(g, 9.65, 10.1))) + Math.PI * ease.inOut(seg(g, 10.3, 10.7)), .04 * Math.sin(T * .9) * (1 - toHer));
      card.root.visible = g > 9.5 && g < 11.6;
      if (g > 10 && g < 10.3 && kit.once('card')) sparks.burst(24, () => ({ x: CARD_AT[0] + (rng() - .5) * .36, y: CARD_AT[1] + (rng() - .5) * .22, z: CARD_AT[2] + .01, vx: (rng() - .5) * .1,
        vy: (rng() - .3) * .1, drag: 1.5, color: ['#fff1b8', '#ffd27a', '#ffffff'][(rng() * 3) | 0], size: .016 + rng() * .01, life: 1, shape: 'sparkle', spin: 3 }));
      if (g > 9.75 && g < 10.2 && dt && rng() < dt * 30) sparks.emit({ x: vC.x + (rng() - .5) * .3 * fly, y: vC.y + (rng() - .5) * .2 * fly, z: vC.z, vy: .03, color: '#ffe7a3', size: .014, life: .7, shape: 'sparkle', spin: 4 });

      /* ── chapter 2: the card to her heart; his hand offered, taken; the waltz; the trail rises into gold words ── */
      if (g > 11.35 && g < 11.7 && kit.once('kept')) { sparks.burst(18, () => ({ x: vB.x, y: vB.y, z: vB.z + .02, vx: (rng() - .5) * .2, vy: .05 + rng() * .15, drag: 1.5,
        color: ['#fff1b8', '#ffd1dc'][(rng() * 2) | 0], size: .016, life: .9, shape: 'sparkle', spin: 4 }));
        hearts.burst(8, () => ({ x: vB.x, y: vB.y + .06, z: vB.z + .02, vx: (rng() - .5) * .12, vy: .12 + rng() * .1, gravity: -.08, drag: .6, color: '#ff8fab', size: .02, life: 1.6, shape: 'heart' })); }
      offer(boy, 'l', bump(g, 11.4, 11.8, 12.1, 12.4));
      const raise = ease.inOut(seg(g, 21.2, 21.8)) * (1 - ease.inOut(seg(g, 24, 24.4)));   // her twirl: his right hand and her left up over her head
      if (hold > 0) {                                                 // the hold: joined hands out on his left, his right at her back, hers on his shoulder
        at(boy, 'upperarm.l', vA); at(girl, 'upperarm.r', vB);
        vT.addVectors(vA, vB).multiplyScalar(.5).add(vC.set(Math.cos(B[2]), 0, -Math.sin(B[2])).multiplyScalar(.05)); vT.y += .03;
        reach(boy, 'l', vT, hold * (1 - .8 * raise), .1); reach(girl, 'r', vT, hold * (1 - raise), .1);
        at(girl, 'upperarm.l', vT); vT.y -= .03;
        if (raise > 0) {                                              // the joined hands just over her head, a little towards him
          at(girl, 'head', vC); at(boy, 'head', vD); vC.addScaledVector(vD.sub(vC).setY(0).normalize(), .025); vC.y += .045; vT.lerp(vC, raise);
        }
        reach(boy, 'r', vT, hold, lerp(.2, -.35, raise));
        at(boy, 'upperarm.r', vD); vD.y += .01; vD.lerp(vT, raise);
        reach(girl, 'l', vD, hold * (1 - dipping), lerp(-.1, -.35, raise));
      }
      if (dipping) arms(girl, dipping, [.55, .75, -.35], [.35, .92, -.2]);   // her free arm swept up and back in the dip

      /* the gown: it swirls with the turn, flares in the twirl, sways as she walks */
      const spinRate = dancing ? WZ.turns * TAU / (WZ.g1 - WZ.g0) : 0, twirlRate = 2 * TAU / 2.2 * Math.sin(Math.PI * seg(g, 21.8, 24)) * 1.5;
      const walkSway = walkIn ? Math.sin((g - 5.6) * walkIn[1] * Math.PI / .55) : 0;
      princess.pose({ flare: (dancing ? .28 + .12 * Math.sin(w.ph * TAU) : 0) + .9 * Math.sin(Math.PI * seg(g, 21.8, 24)) + .15 * slow,
        twist: -.22 * (spinRate + twirlRate) + .06 * walkSway, sway: .25 * walkSway + (dancing ? .2 * Math.sin(w.ph * TAU) : 0) + .1 * Math.sin(T * 1.2) * (held ? 1 : 0),
        drop: sink / girl.scene.scale.x }, T);

      /* the trail: sparkles left on the floor where they danced, that lift and write the gold words */
      const pts = gold.points(trail.n), wordsIn = ease.smooth(seg(g, 20, 20.5)), burst = seg(g, 20.6, 21.6);
      gold.mesh.position.set(...WORDS_AT); gold.mesh.material.opacity = wordsIn * (1 - ease.smooth(seg(g, 20.6, 21))) * (1 + .04 * Math.sin(T * 3));
      gold.mesh.visible = gold.mesh.material.opacity > .002; trail.root.visible = g > WZ.g0 && g < 21.6; swirl.root.visible = g > 27 && g < 29.2;
      if (g > WZ.g0 && g < 21.6) {
        for (let i = 0; i < trail.n; i++) {
          const u = i / trail.n, pass = WZ.g0 + (WZ.g1 - WZ.g0) * u, t0 = 18.5 + .6 * u, k = ease.inOut(seg(g, t0, t0 + 1.25)), [r1, r2, r3] = TR[i];
          pathAt(u, P2); const sx = P2[0] + (r1 - .5) * .12, sz = P2[1] + (r2 - .5) * .1;
          const tx = WORDS_AT[0] + pts[i][0], ty = WORDS_AT[1] + pts[i][1], tz = WORDS_AT[2] + .004;
          const a = r3 * TAU + k * 5, cx = lerp(sx, tx, .5) + Math.cos(a) * .12 * Math.sin(Math.PI * k), cz = lerp(sz, tz, .5) + Math.sin(a) * .08 * Math.sin(Math.PI * k);
          let x = lerp(lerp(sx, cx, k), lerp(cx, tx, k), k), y = lerp(FLOOR + .004, ty, ease.inOut(k)) + .06 * Math.sin(Math.PI * k), z = lerp(lerp(sz, cz, k), lerp(cz, tz, k), k);
          const fall = ease.in(burst), bx = (pts[i][0]) * 1.2 * burst, by = -.35 * fall * fall;
          x += bx; y += by + .05 * burst * r1;
          const tw = .65 + .35 * Math.sin(T * (4 + 3 * r1) + r2 * 9), shown = seg(g, pass, pass + .25) * (1 - seg(g, 21.1, 21.6));
          trail.set(i, x, y, z, (k > .99 ? .011 : .016) * (1 + .3 * r3), 0, shown * tw * (k > 0 && k < 1 ? 1 : .85), r1 * 3, tinted < 2 && (i % 3 ? '#ffd27a' : '#fff4d0'));
        }
        tinted++;                                                     // their colours set once
      } else trail.hide();
      trail.done();
      if (dancing && dt && rng() < dt * 1.6) notes.emit({ x: w.cx + (rng() - .5) * .2, y: .32, z: w.cz, vy: .07, sway: .03, color: rng() < .5 ? '#ffd27a' : '#ff9fbf', size: .03, life: 2.2, shape: 'note', spin: (rng() - .5) * 1.5 });

      /* ── chapter 3: the twirl, the dip, the chandelier flares, petals rain and swirl into the framed photo ── */
      if (twirl > 0 && twirl < 1 && dt && rng() < dt * 40) { const a = rng() * TAU; at(girl, 'hips', vA);
        sparks.emit({ x: vA.x + Math.cos(a) * .09, y: .02 + rng() * .1, z: vA.z + Math.sin(a) * .09, vx: -Math.sin(a) * .15, vy: .15 + rng() * .1, vz: Math.cos(a) * .15, drag: 1.2,
          color: ['#fff1b8', '#ffd1dc', '#ffffff'][(rng() * 3) | 0], size: .016, life: .9, shape: 'sparkle', spin: 4 }); }
      if (g > 25.2 && g < 25.6 && kit.once('dip')) hearts.burst(14, () => ({ x: .01 + (rng() - .5) * .08, y: .3, z: .04, vx: (rng() - .5) * .25, vy: .15 + rng() * .15,
        gravity: -.12, drag: .7, color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .022 + rng() * .016, life: 2.2, shape: 'heart', spin: (rng() - .5) * 4 }));
      const rain = g > 25.3 ? (g < 28.4 ? 46 : g < 30.8 ? 7 : g > 37.4 ? 9 : 3) : 0;
      const many = dt * rain, count = Math.floor(many) + (rng() < many % 1 ? 1 : 0);
      for (let n = 0; n < count; n++) petals.emit({ x: (rng() - .5) * .95, y: .78 + rng() * .08, z: (rng() - .5) * .5,
        vx: (rng() - .5) * .03, vy: -.09 - rng() * .05, gravity: -.01, drag: .2, sway: .05, color: ['#ff8fab', '#f25c86', '#ffd1dc', '#c9184a', '#ffffff'][(rng() * 5) | 0],
        size: .02 + rng() * .012, life: 9, shape: 'petal', spin: (rng() - .5) * 4, floor: FLOOR + .002 });
      const frameIn = ease.back(seg(g, 28.3, 29.1)), aside = ease.inOut(seg(g, 30.9, 32.1));
      if (g > 27 && g < 29.2) {                                       // the swirl of petals that becomes the frame
        for (let i = 0; i < swirl.n; i++) {
          const r1 = (i * 0.618) % 1, r2 = (i * 0.414) % 1, d0 = 27 + r1 * .7, k = ease.in(seg(g, d0, 28.6)), a = r2 * TAU + (g - 27) * 6;
          const rr = lerp(.32, .02, k), x = FRAME_AT[0] + Math.cos(a) * rr * .9, y = FRAME_AT[1] + Math.sin(a) * rr + (1 - seg(g, d0, d0 + .5)) * .3, z = FRAME_AT[2] + .04 * Math.sin(a * 2);
          swirl.set(i, x, y, z, .036 * (1 - .4 * k), 1, seg(g, d0, d0 + .3) * (1 - seg(g, 28.5, 28.9)), a + r1 * 6, ['#ff8fab', '#f25c86', '#ffd1dc', '#c9184a'][i % 4]);
        }
      } else swirl.hide();
      swirl.done();
      framed.visible = g > 28.3;
      framed.position.set(lerp(FRAME_AT[0], FRAME_ASIDE[0], aside), lerp(FRAME_AT[1], FRAME_ASIDE[1], aside) + .006 * Math.sin(T * 1.3), lerp(FRAME_AT[2], FRAME_ASIDE[2], aside));
      framed.scale.setScalar(Math.max(.001, frameIn * lerp(1, .5, aside)));
      framed.rotation.set(-.06, lerp(-.12, -.15, aside), .03 * Math.sin(T * .8));
      photo.halo.material.opacity = .65 * seg(g, 28.6, 29.2) * (1 - .5 * aside) * (1 + .08 * Math.sin(T * 3));
      if (g > 28.4 && g < 28.8 && kit.once('frame')) sparks.burst(30, i => { const a = i / 30 * TAU; return { x: FRAME_AT[0], y: FRAME_AT[1], z: FRAME_AT[2] + .02, vx: Math.cos(a) * .3, vy: Math.sin(a) * .3,
        drag: 2, color: ['#fff1b8', '#ffd27a', '#ffd1dc'][i % 3], size: .02, life: 1, shape: 'sparkle', spin: 3 }; });
      const armInArm = bump(g, 27.3, 27.6, 30.9, 31.4);                 // arm in arm, looking at the photo: her hand on his offered arm
      if (armInArm > 0) {
        arms(boy, armInArm, [.12, -.9, .25], [-.15, -.1, 1]);
        at(boy, 'lowerarm.l', vT).lerp(at(boy, 'handslot.l', vC), .45); vT.y += .006; reach(girl, 'r', vT, armInArm, .3);
      }

      /* ── chapter 4: night; the slow dance; the kiss on her hand; close; the banner ── */
      if (dt) chan.candles.forEach((cd, i) => {                       // a wisp of smoke from each candle as it goes out
        const t0 = 31.2 + (13 - i) * .09; if (g > t0 + .2 && g < t0 + .5 && kit.once(`smoke${i}`)) { chan.body.localToWorld(vA.copy(cd.p)).applyMatrix4(mStage);
          smoke.emit({ x: vA.x, y: vA.y + .01, z: vA.z, vy: .05, sway: .01, color: '#cfc8d8', size: .03, grow: 1.5, life: 1.6, shape: 'glow' }); } });
      const offerHand = bump(g, 34.1, 34.5, 35.9, 36.3);
      if (g > 34 && g < 37) { at(girl, 'chest', vA); at(boy, 'chest', vB); vK.lerpVectors(vB, vA, .4); vK.y += .005; }   // where his lips come down to
      if (offerHand > 0) { reach(girl, 'r', vK, offerHand, -.05); reach(boy, 'l', vK, offerHand * (1 - .3 * kissing), .25); }   // she gives him her hand; he kisses it
      const shy = bump(g, 35.2, 35.5, 36.6, 37); arms(girl, shy, [.3, -.3, .9], [-.35, .9, .25]); if (shy) girl.bend('head', .08 * shy, 0, .2 * shy);
      if (g > 35.05 && g < 35.4 && kit.once('kiss')) hearts.burst(12, () => ({ x: vK.x, y: vK.y + .03, z: vK.z, vx: (rng() - .5) * .2, vy: .12 + rng() * .15, gravity: -.1, drag: .7,
        color: ['#ff4f7b', '#ff8fab', '#ffd1dc'][(rng() * 3) | 0], size: .02 + rng() * .014, life: 2, shape: 'heart', spin: (rng() - .5) * 3 }));
      const hp = ease.back(seg(g, 35.05, 35.5)) * (1 - ease.in(seg(g, 36.4, 36.9)));
      heartPic.visible = hp > .01; heartPic.scale.setScalar(Math.max(.001, .07 * hp * (1 + .1 * Math.sin(T * 6))));
      heartPic.position.set(vK.x, vK.y + .05 + .05 * seg(g, 35.05, 36.9), vK.z + .02);
      if (close > 0) {                                                // his arm round her shoulders, his hand on the far one; hers on his chest
        at(girl, 'upperarm.l', vT); vT.x -= Math.sin(G[2]) * .012; vT.z -= Math.cos(G[2]) * .012; vT.y += .004; reach(boy, 'l', vT, close, 0, [.3, .2, -1]);
        at(boy, 'neck', vT); vT.x += Math.sin(B[2]) * .024 + Math.cos(B[2]) * .012; vT.z += Math.cos(B[2]) * .024 - Math.sin(B[2]) * .012; vT.y -= .055;
        reach(girl, 'r', vT, close, .3);
      }
      const b = ease.elastic(seg(g, 37.4, 38.4));
      banner.root.visible = b > .002; banner.root.scale.setScalar(Math.max(.001, b)); banner.root.position.set(0, .6 + .006 * Math.sin(T * 1.5), .06); banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      if (g > 37.9 && g < 38.3 && kit.once('love')) hearts.burst(20, () => ({ x: (rng() - .5) * .3, y: .5, z: .06, vx: (rng() - .5) * .3, vy: .1 + rng() * .15, gravity: -.1, drag: .7,
        color: ['#ff4f7b', '#ff8fab', '#ffc2d1', '#e8436d'][(rng() * 4) | 0], size: .02 + rng() * .016, life: 2.4, shape: 'heart', spin: (rng() - .5) * 3 }));
      if (held && g > 38 && dt && rng() < dt * 1.4) hearts.emit({ x: (rng() - .5) * .2, y: .3, z: .05, vy: .07, sway: .03, color: '#ff8fab', size: .018, life: 2.4, shape: 'heart' });

      for (const p of particles) p.update(dt, T);
      twins.forEach(t => t.sync());
    }
  };
};
