/* Sinh nhật nàng, told by the shared act _acts/lovestory.js on the rooftop of set.js. Four chapters, each ending at a stop
   (the next tap plays on; after the last, the letter):
     1 ·  0–6.5   Hẹn trên sân thượng: dusk. The hut's door opens and she walks out onto the rooftop, past the sign at the
                  stairs (the card's words, slot stairs, a polaroid taped on top); she looks around while the string lights
                  come on bulb by bulb, the three polaroids hanging on them lighting up with their bulbs, night falls and the
                  city's windows light up
     2 ·  6.5–13  Bóng bay kỷ niệm: six clear balloons rise from behind the parapet, a photo in each; she looks up at them
                  with a hand to her mouth, claps, and spins round in a little dance
     3 ·  13–20   Điều ước: a cake appears on the table and its candles light one by one; she clasps her hands to wish (the
                  wish card, slot wish), leans in and blows: puff, the flames go out in sparkles. One candle lights again
                  ("Ơ?!"), so she blows harder
     4 ·  20–27   Tuổi mới rực rỡ: small fireworks over the city, three polaroids come down on the string lights, the
                  banner (slot banner) rises with the first photo in a heart frame above it; she cheers and blows a kiss
   A tap on her: a hop and hearts. A tap on a photo shows it big (the act does that). Sound (template.json "sound", the
   shared templates/_sounds): the party Happy Birthday, the music box for the wish, and an effect for each moment. Everything
   is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, lerp, rng, words } = kit;
  const H = .32, STRIDE = .1 * H / .3;                               // her height (1.70 m) in card widths; Walking_A at speed 1, a second
  const START = [0, 6.5, 13, 20], SECONDS = [6.5, 6.5, 7, 7];
  const DUSK = { hemi: new THREE.Color('#ffe2d8'), ground: new THREE.Color('#c48aa8'), sun: new THREE.Color('#ffc9a2') };
  const NIGHT = { hemi: new THREE.Color('#b4a7e8'), ground: new THREE.Color('#3b2a52'), sun: new THREE.Color('#cbbfff') };
  const TAU = Math.PI * 2, TRICK = 2;                                // the candle that lights again
  const SHOW = [20.3, 20.9, 21.5, 22.2, 22.9, 23.6, 24.3, 25, 25.8, 26.5];   // the fireworks of chapter 4: when each bursts
  const BANG = [[2, .95], [5, 1.05], [8, 1]];                        // the bursts heard, and the rate: the sound's burst comes 1.2 s in
  let set, her, wish, banner, oops, hearts, sparks, smoke, puffs, confetti, fireworks;
  let poked = -9, now = 0;

  /* ── where she goes ── */
  const DOORWAY = [-.425, -.158], MID = [0, .05], WISH = [.0935, .0177], FRONT = [-.02, .075];
  const FACE_CAKE = Math.atan2(.176 - WISH[0], .091 - WISH[1]), FACE_US = .06;
  /** a path through points, measured: where s along it is, and which way it runs there */
  function path(pts) {
    const P = pts.map(p => new THREE.Vector2(p[0], p[1])), L = [0];
    for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
    return {
      length: L[L.length - 1],
      at(s) {
        let i = 1; while (i < P.length - 1 && L[i] < s) i++;
        const a = P[i - 1], b = P[i], k = Math.min(1, Math.max(0, (s - L[i - 1]) / (L[i] - L[i - 1] || 1)));
        return [lerp(a.x, b.x, k), lerp(a.y, b.y, k), Math.atan2(b.x - a.x, b.y - a.y)];
      }
    };
  }
  const bezier = (a, c, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; });
  const OUT = path(bezier(DOORWAY, [-.41, .04], MID)), TO_CAKE = path([MID, WISH]), TO_FRONT = path([WISH, FRONT]);
  /** a walk along a path between g0 and g1 at an even pace, easing in and out over its first and last .35 s: where she
      is, which way she goes, and Walking_A's speed for that pace (so the feet do not slide) */
  function walk(g, g0, g1, p) {
    const r = .35, v = p.length / (g1 - g0 - 2 * r + 2 * r / 3), e = v * r / 3;   // an eased end covers a third of what the pace would
    const s = tween(g, [[g0, 0], [g0 + r, e, 'in'], [g1 - r, p.length - e, 'linear'], [g1, p.length, 'out']]);
    const [x, z, heading] = p.at(s), ramp = Math.min(1, seg(g, g0, g0 + r), 1 - seg(g, g1 - r, g1)) ** 2;
    return { x, z, heading, speed: Math.max(.3, v * ramp / STRIDE) };
  }
  const turnTo = (a, b, k) => a + (((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI) * k;
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  /* [from g, clip, options]: a chapter's last clip runs on through its stop, so the next starts a moment after it */
  const CLIPS = [
    [0, 'Idle'], [.6, 'Walking_A'], [3.3, 'Idle', { fade: .3 }], [3.6, 'Look_Around', { fade: .4 }],
    [6.55, 'Idle', { fade: .4 }], [8.75, 'Clap', { fade: .3 }], [10.9, 'Dance_B', { fade: .35 }],
    [13.05, 'Walking_A', { fade: .3 }], [14.3, 'Idle', { fade: .3 }], [19.25, 'Clap', { fade: .35 }],
    [20.05, 'Walking_A', { fade: .3 }], [21.1, 'Idle', { fade: .3 }], [25.3, 'Dance_B', { fade: .4 }]
  ];

  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  /** her mouth, in the stage's space (a frame late: the bones' world places are from the last render) */
  function mouth(out) {
    const h = her.node('head'); if (!h) return out.set(her.root.position.x, H * .9, her.root.position.z);
    h.getWorldPosition(out); stage.worldToLocal(out);
    const a = her.root.rotation.y; return out.add(vC.set(Math.sin(a) * .024, .014, Math.cos(a) * .024));
  }
  const flameAt = (i, out) => out.copy(set.cake.flames[i].at).add(set.cake.root.position);
  /** how lit candle i is at g: lit one by one, out at the first blow; the trick one lights again and goes at the second */
  function flame(i, g) {
    let k = ease.out(seg(g, 14 + i * .2, 14.15 + i * .2)) * (1 - seg(g, 17.42 + i * .035, 17.5 + i * .035));
    if (i === TRICK) k = Math.max(k, ease.out(seg(g, 18.05, 18.2)) * (1 - seg(g, 18.72, 18.8)));
    return k;
  }

  return {
    seconds: SECONDS,

    build() {
      set = window.NM_BDAY_HER_SET(kit);
      her = kit.model('her').fit({ height: H }); stage.add(her.root);
      const hit = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.05, .05, H, 8)), kit.keep(new THREE.MeshBasicMaterial()));
      hit.visible = false; hit.userData.proxy = true; hit.position.y = H / 2; her.root.add(hit);   // an easy target for a finger
      kit.onTap(hit, () => { poked = now; });

      wish = kit.sign({ text: words('wish', 'Ước đi em, anh lo phần còn lại!'), style: 'tag', width: .245, accent: '#f39ab6', glow: .8 });
      banner = kit.sign({ text: words('banner', 'Chúc em tuổi mới rực rỡ'), style: 'banner', width: .42, accent: '#e8436d', glow: .55 });
      stage.add(wish.root, banner.root);
      oops = kit.picture((c, px) => {                                  // "Ơ?!": the candle that would not go out
        c.fillStyle = '#ffffff'; c.strokeStyle = '#6b2a45'; c.lineWidth = px * .03;
        c.beginPath(); c.roundRect ? c.roundRect(px * .08, px * .1, px * .84, px * .58, px * .2) : c.rect(px * .08, px * .1, px * .84, px * .58); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(px * .36, px * .66); c.lineTo(px * .3, px * .88); c.lineTo(px * .5, px * .66); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#ffffff'; c.fillRect(px * .34, px * .62, px * .18, px * .06);
        c.fillStyle = '#e8436d'; kit.fitText(c, 'Ơ?!', { x: px * .14, y: px * .16, w: px * .72, h: px * .46 }, { maxLines: 1, max: px * .34 });
      }, { size: .1, px: 256 });
      stage.add(oops);

      hearts = kit.particles({ max: 180 });
      sparks = kit.particles({ max: 420, additive: true });
      smoke = kit.particles({ max: 80 });
      puffs = kit.particles({ max: 80, additive: true });
      confetti = kit.particles({ max: 160 });
      fireworks = kit.particles({ max: 700, additive: true });
      stage.add(hearts.root, sparks.root, smoke.root, puffs.root, confetti.root, fireworks.root);
    },

    reset() {
      [hearts, sparks, smoke, puffs, confetti, fireworks, set.sky.stars].forEach(p => p.clear());
      her.stop();
      set.door.open(0);
      set.balloons.forEach(b => { b.root.visible = false; b.string.visible = false; });
      set.polaroids.forEach(p => { p.hang.visible = false; });
      set.hero.root.visible = false;
      poked = -9;
    },

    pose({ chapter, g, T, dt, held }) {
      now = T;
      const ch = chapterOf(g);

      kit.music(chapter === 2 ? 'soft' : 'music');                   // the music box for the wish, the party tune round it

      /* ── dusk into night: the sky, the city's windows, the moon and stars; the string lights bulb by bulb ── */
      const night = ease.smooth(seg(g, .8, 6.2)), L = kit.lights;
      L.hemi.color.copy(DUSK.hemi).lerp(NIGHT.hemi, night); L.hemi.groundColor.copy(DUSK.ground).lerp(NIGHT.ground, night);
      L.sun.color.copy(DUSK.sun).lerp(NIGHT.sun, night);
      L.hemi.intensity = lerp(1.05, .62, night); L.sun.intensity = lerp(1.35, .5, night);
      set.sky.night.material.opacity = night;
      set.sky.windows.material.opacity = ease.smooth(seg(g, 1.6, 5.8)) * (.88 + .12 * Math.sin(T * .7));
      set.sky.moon.material.opacity = ease.smooth(seg(g, 3.2, 6.2));
      set.sky.moon.position.y = .86 + .05 * ease.out(seg(g, 2, 6.5)) + .004 * Math.sin(T * .6);
      for (let k = 0; k < 10; k++) if (g > 2.8 + k * .32 && kit.once(`stars${k}`)) set.sky.stars.burst(8, i => ({ x: (rng() - .5) * .98, y: .5 + rng() * .56, z: -.244,
        color: ['#ffffff', '#fff2c4', '#cfe0ff'][i % 3], size: .007 + rng() * .012, life: 1e6, shape: i % 4 ? 'glow' : 'sparkle', twinkle: 1.5 + rng() * 3.5 }));
      let litSum = 0;
      const chase = ch === 3 ? seg(g, 20.6, 22.6) : 0;                  // at the end a wave of light runs down the chain
      set.bulbs.forEach((b, i) => {
        const k = ease.out(seg(g, 3.3 + i * .11, 3.42 + i * .11)); litSum += k;
        const wave = chase > 0 && chase < 1 ? Math.max(0, 1 - Math.abs(chase * (set.bulbs.length + 4) - i - 2) / 2.5) : 0;
        b.set(k * (.82 + .18 * Math.sin(T * 3 + i * 1.3)) + .8 * wave);
        if (k > 0 && kit.once(`bulb${i}`)) {
          kit.sfx('ting', { volume: .28, rate: .95 + i * .025 });
          sparks.burst(4, () => ({ x: b.at.x, y: b.at.y, z: b.at.z + .004, vx: (rng() - .5) * .12, vy: rng() * .1, drag: 2, color: '#fff3c4', size: .012, life: .45, shape: 'sparkle', spin: 3 }));
        }
      });
      set.strung.forEach((p, i) => {                                   // the polaroids on the string: each lit by its bulb, with a ting
        const at = 3.3 + p.bulb * .11, k = ease.out(seg(g, at, at + .35)), since = Math.max(0, g - at);
        p.photo.material.emissiveIntensity = .14 + .36 * k; p.halo.material.opacity = .42 * k * (1 + .12 * Math.sin(T * 3 + i));
        p.swing.rotation.z = .05 * Math.sin(T * 1.5 + i * 2.1) + (g > at ? .22 * Math.exp(-3 * since) * Math.sin(9 * since) : 0);
        if (k > 0 && kit.once(`strung${i}`)) {
          kit.sfx('ting', { volume: .4, rate: 1.5 + i * .1 });
          p.hang.getWorldPosition(vA); stage.worldToLocal(vA);
          sparks.burst(8, () => ({ x: vA.x, y: vA.y - .04, z: vA.z + .01, vx: (rng() - .5) * .16, vy: (rng() - .5) * .16, drag: 1.5, color: '#fff1b8', size: .012, life: .7, shape: 'sparkle', spin: 3 }));
        }
      });
      const fairy = litSum / set.bulbs.length;
      set.fairy[0].intensity = .7 * fairy; set.fairy[1].intensity = .6 * fairy;
      set.lampGlow.material.opacity = .8 * (1 + .05 * Math.sin(T * 9) * Math.sin(T * 5.3));
      set.sign.glow.material.opacity = .5 * ease.smooth(seg(g, .2, .8)) * (1 - seg(g, 6.6, 7.2)) * (.8 + .2 * Math.sin(T * 2.4));
      set.door.open(ease.inOut(seg(g, .35, .85)) * (1 - ease.inOut(seg(g, 3.4, 4.1))));
      if (g > .38 && kit.once('door')) kit.sfx('door', { volume: .5 });

      rise(g, T, dt);
      moves(g, T, dt);
      wishing(g, T, dt, held && chapter === 2);
      finale(g, T, dt, held && chapter === 3);

      /* a tap on her: a hop and hearts */
      const pk = T - poked;
      if (pk < 1.3) {
        her.root.position.y = set.FLOOR + .03 * Math.max(0, Math.sin(Math.PI * Math.min(1, pk / .42)));
        if (kit.once(`poke${poked.toFixed(3)}`)) kit.sfx('sparkle', { volume: .4 });
        if (kit.once(`poke-hearts${poked.toFixed(3)}`)) hearts.burst(18, () => ({ x: her.root.position.x, y: H + .02, z: her.root.position.z, vx: (rng() - .5) * .3, vy: .18 + rng() * .2,
          vz: (rng() - .5) * .1, gravity: -.15, drag: .8, color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#ffd27a'][(rng() * 4) | 0], size: .02 + rng() * .016, life: 2, shape: 'heart', spin: (rng() - .5) * 3 }));
      }
      [hearts, sparks, smoke, puffs, confetti, fireworks, set.sky.stars].forEach(p => p.update(dt, T));
    }
  };

  /* ── chapter 2: the balloons rise from behind the parapet, the inner ones first, and bob on their strings ── */
  function rise(g, T, dt) {
    set.balloons.forEach((b, i) => {
      const t0 = 6.75 + [.44, .22, 0, .08, .3, .52][i], k = ease.out(seg(g, t0, t0 + 1.8)), up = Math.min(1, k * 1.4);
      b.root.visible = b.string.visible = g > t0;
      if (!b.root.visible) return;
      const h = b.home;                                                // up first, clear of the parapet and the hut, then across
      b.root.position.set(lerp(b.from, h.x, ease.inOut(seg(k, .65, 1))) + .005 * Math.sin(T * .9 + i * 2) * up, lerp(set.FLOOR + .04, h.y, k) + .008 * Math.sin(T * 1.3 + i * 1.7) * up,
        lerp(-.24, h.z, ease.inOut(seg(k, .35, 1))));
      b.root.scale.setScalar(lerp(.55, 1, ease.out(seg(k, 0, .6))));
      b.root.rotation.z = .07 * Math.sin(T * .8 + i) * up;
      set.stringOf(b); set.faceCamera(b.photo.root);
      if (k > .28 && kit.once(`balloon${i}`)) kit.sfx('pop', { volume: .35, rate: 1.05 + i * .07 });
      if (k > .05 && k < .9 && dt && rng() < dt * 10) sparks.emit({ x: b.root.position.x + (rng() - .5) * .08, y: b.root.position.y - .06, z: b.root.position.z + .02,
        vy: -.04, color: ['#fff3c4', '#ffd1dc'][i % 2], size: .012, life: .7, shape: 'sparkle', spin: 3 });
    });
    if (g > 6.8 && kit.once('balloons-sound')) kit.sfx('sparkle', { volume: .5 });
    if (g > 8.4 && kit.once('balloons-up')) hearts.burst(14, () => ({ x: (rng() - .5) * .5, y: .45, z: -.12, vx: (rng() - .5) * .2, vy: .1 + rng() * .1, gravity: -.06, drag: .5,
      color: ['#ff8fab', '#ffd1dc', '#ffd27a'][(rng() * 3) | 0], size: .018 + rng() * .012, life: 2.4, shape: 'heart', spin: (rng() - .5) * 2 }));
  }

  /* ── where she is and what she does ── */
  function moves(g, T, dt) {
    let x, z, heading, speed = null;
    if (g < 6.55) {                                                  // out of the door, along a curve to the middle
      const w = walk(g, .6, 3.3, OUT);
      x = w.x; z = w.z; heading = turnTo(g < .6 ? 0 : w.heading, FACE_US, ease.inOut(seg(g, 3.2, 3.7))); speed = w.speed;
    } else if (g < 13.05) {                                          // the balloons: she looks up, claps, spins
      [x, z] = MID;
      heading = FACE_US + .35 * Math.sin(Math.PI * seg(g, 6.9, 8.7)) * Math.sin(TAU * seg(g, 6.9, 8.7) * .5 + .4) + TAU * ease.inOut(seg(g, 11.05, 12.2));
    } else if (g < 20.05) {                                          // to the cake
      const w = walk(g, 13.05, 14.3, TO_CAKE);
      x = w.x; z = w.z; heading = turnTo(turnTo(FACE_US, w.heading, ease.inOut(seg(g, 13.05, 13.4))), FACE_CAKE, ease.inOut(seg(g, 14.1, 14.6))); speed = w.speed;
    } else {                                                         // to the front for the finale
      const w = walk(g, 20.05, 21.1, TO_FRONT);
      x = w.x; z = w.z; heading = turnTo(turnTo(FACE_CAKE, w.heading, ease.inOut(seg(g, 20.05, 20.35))), FACE_US, ease.inOut(seg(g, 20.9, 21.35))); speed = w.speed;
    }
    her.root.position.set(x, set.FLOOR, z); her.root.rotation.y = heading;
    her.root.visible = g > .42;                                      // behind the closed door until it opens
    if (g > 11.05 && g < 13 && kit.once('spin')) kit.sfx('horn', { volume: .5 });
    const c = clipAt(CLIPS, g);
    her.play(c[1], c[1] === 'Walking_A' && speed ? { ...c[2], speed } : c[2]);

    /* gestures: bend the back first, then aim the arms */
    const up = Math.sin(Math.PI * seg(g, 6.85, 8.75));                // chapter 2: up at the balloons, a hand to her mouth (for me?!)
    if (up) { her.bend('chest', -.06 * up, 0, 0); her.bend('head', -.42 * up, .3 * Math.sin(TAU * seg(g, 6.85, 8.75) * .5 + .4) * up, 0); }
    const wow = seg(g, 7.05, 7.35) * (1 - seg(g, 8.25, 8.6));
    if (wow) { her.aim('upperarm.r', [-.12, -.25, .9], wow); her.aim('lowerarm.r', [.28, .93, .22], wow); }
    const clasp = ease.smooth(seg(g, 15.15, 15.5)) * (1 - ease.smooth(seg(g, 16.95, 17.15)));
    const blow1 = ease.inOut(seg(g, 17, 17.3)) * (1 - ease.inOut(seg(g, 17.75, 18))), blow2 = ease.inOut(seg(g, 18.35, 18.6)) * (1 - ease.inOut(seg(g, 18.95, 19.25)));
    const lean = .85 * blow1 + blow2;
    if (lean) { her.bend('spine', .28 * lean, 0, 0); her.bend('Spine02', .2 * lean, 0, 0); her.bend('head', -.12 * lean, 0, 0); }
    if (clasp) {                                                     // the wish: head bowed, hands together under the chin
      her.bend('chest', .06 * clasp, 0, 0); her.bend('head', .32 * clasp, 0, .05 * Math.sin(T * 1.6) * clasp);
      her.aim('upperarm.r', [-.25, -.5, .83], clasp); her.aim('lowerarm.r', [.68, .5, .52], clasp);
      her.aim('upperarm.l', [.25, -.5, .83], clasp); her.aim('lowerarm.l', [-.68, .5, .52], clasp);
    }
    const behind = Math.max(blow1, blow2);                           // blowing: hands behind her back, out of the cake
    if (behind) {
      her.aim('upperarm.r', [-.28, -.86, -.42], behind); her.aim('lowerarm.r', [.72, -.25, -.65], behind);
      her.aim('upperarm.l', [.28, -.86, -.42], behind); her.aim('lowerarm.l', [-.72, -.25, -.65], behind);
    }
    const cheer = ease.smooth(seg(g, 21.25, 21.55)) * (1 - ease.smooth(seg(g, 23.2, 23.6)));   // chapter 4: both arms up, hands waving
    if (cheer) {
      const wave = .14 * Math.sin(T * 8);
      her.aim('upperarm.r', [-.5, .84, .14], cheer); her.aim('lowerarm.r', [-.28 + wave, 1, .12], cheer);
      her.aim('upperarm.l', [.5, .84, .14], cheer); her.aim('lowerarm.l', [.28 + wave, 1, .12], cheer);
    }
    const kiss = seg(g, 23.9, 24.2) * (1 - seg(g, 24.75, 25.15)), toss = ease.out(seg(g, 24.4, 24.7));   // and a kiss blown to the phone
    if (kiss) {
      her.aim('upperarm.r', [lerp(-.1, -.3, toss), lerp(-.55, .25, toss), lerp(.83, .92, toss)], kiss);
      her.aim('lowerarm.r', [lerp(.4, -.12, toss), lerp(.88, .35, toss), lerp(.25, .93, toss)], kiss);
    }
    if (g > 24.45 && kit.once('kiss')) {
      kit.sfx('pop', { volume: .4, rate: 1.5 });
      const p = her.node('handslot.r'); if (p) p.getWorldPosition(vA); else vA.set(0, H * .8, 0); stage.worldToLocal(vA);
      hearts.burst(16, () => ({ x: vA.x, y: vA.y, z: vA.z, vx: (rng() - .5) * .16, vy: .06 + rng() * .1, vz: .25 + rng() * .2, gravity: -.04, drag: .6,
        color: ['#ff4f7b', '#ff8fab', '#ffd1dc'][(rng() * 3) | 0], size: .02 + rng() * .02, life: 2.2, shape: 'heart', spin: (rng() - .5) * 3 }));
    }
    if (g > 9.2 && g < 10.6 && dt && rng() < dt * 6) hearts.emit({ x: x + (rng() - .5) * .1, y: H * .8, z: z + .03, vy: .1, sway: .03, color: '#ff8fab', size: .016, life: 1.6, shape: 'heart' });
  }

  /* ── chapter 3: the cake, the wish, the candles ── */
  function wishing(g, T, dt, held) {
    const C = set.cake, pop = ease.back(seg(g, 13.3, 13.75));
    C.root.visible = g > 13.3; C.root.scale.setScalar(Math.max(.001, pop));
    if (g > 13.4 && kit.once('cake-sound')) kit.sfx('sparkle', { volume: .5 });
    if (g > 13.4 && kit.once('cake')) sparks.burst(22, () => ({ x: C.root.position.x + (rng() - .5) * .1, y: C.root.position.y + .03 + rng() * .05, z: C.root.position.z + (rng() - .5) * .1,
      vx: (rng() - .5) * .2, vy: .1 + rng() * .15, drag: 1.5, color: ['#fff3c4', '#ffd1dc', '#ffffff'][(rng() * 3) | 0], size: .016, life: .9, shape: rng() < .5 ? 'sparkle' : 'star', spin: 3 }));
    let lit = 0;
    C.flames.forEach((f, i) => {
      const k = flame(i, g); lit += k; f.set(k, T);
      if (k > .2 && kit.once(`light-sound${i}${g > 18 ? 'again' : ''}`)) kit.sfx(g > 18 ? 'boing' : 'ting', g > 18 ? { volume: .45 } : { volume: .3, rate: 1.2 + i * .08 });
      if (k > .2 && kit.once(`light${i}${g > 18 ? 'again' : ''}`)) sparks.burst(6, () => ({ ...flameAt(i, vA), vx: (rng() - .5) * .1, vy: .06 + rng() * .08, drag: 2, color: '#ffe7a3', size: .01, life: .5, shape: 'sparkle', spin: 4 }));
    });
    C.light.intensity = .5 * lit * (1 + .08 * Math.sin(T * 17));

    /* the wish card, above the table */
    const w = ease.back(seg(g, 14.9, 15.4)) * (1 - ease.in(seg(g, 20.05, 20.4)));
    wish.root.visible = w > .002; wish.root.scale.setScalar(Math.max(.001, w));
    wish.root.position.set(.05, .52 + .006 * Math.sin(T * 1.5), .08); wish.root.rotation.set(-.18, -.04, .03 * Math.sin(T * 1.1));
    if (g > 15.3 && g < 17 && dt && rng() < dt * 5) {                  // little lights rise from her hands while she wishes
      mouth(vA);
      sparks.emit({ x: vA.x + (rng() - .5) * .03, y: vA.y - .05, z: vA.z, vy: .07, sway: .02, color: ['#fff3c4', '#ffd1dc'][(rng() * 2) | 0], size: .012, life: 1.4, shape: 'sparkle', spin: 2 });
    }

    /* the blows: a puff from her mouth to the flames; each flame out in a wisp of smoke and sparkles */
    const blowing = (g > 17.28 && g < 17.5) || (g > 18.55 && g < 18.78);
    if (g > 17.28 && g < 20 && kit.once('blow1')) kit.sfx('blow', { volume: .6 });
    if (g > 18.55 && g < 20 && kit.once('blow2')) kit.sfx('blow', { volume: .7, rate: .9 });
    if (blowing && dt) {
      mouth(vA); flameAt(TRICK, vB); const hard = g > 18 ? 1.4 : 1;
      for (let i = 0; i < 3; i++) puffs.emit({ x: vA.x + (rng() - .5) * .008, y: vA.y, z: vA.z + (rng() - .5) * .008, vx: (vB.x - vA.x) / .3 + (rng() - .5) * .05, vy: (vB.y - vA.y) / .3 + (rng() - .5) * .03,
        vz: (vB.z - vA.z) / .3 + (rng() - .5) * .05, drag: .5, color: '#e6f4ff', size: (.005 + rng() * .006) * hard, grow: 1.4, life: .38, shape: 'glow' });
    }
    C.flames.forEach((f, i) => {
      const goes = i === TRICK && g > 18.5 ? 18.72 : 17.42 + i * .035;
      if (g > goes && kit.once(`out${i}${goes > 18 ? 'again' : ''}`)) {
        if (i === 0 || goes > 18) kit.sfx('sparkle', { volume: .45 });
        flameAt(i, vA);
        smoke.burst(5, () => ({ x: vA.x, y: vA.y + .005, z: vA.z, vx: (rng() - .5) * .02, vy: .04 + rng() * .03, sway: .012, color: rng() < .5 ? '#cfc8d6' : '#a89fb2', size: .01, grow: 2.2, life: 1.4, shape: 'glow' }));
        sparks.burst(goes > 18 ? 26 : 7, () => ({ x: vA.x, y: vA.y, z: vA.z, vx: (rng() - .5) * .3, vy: .05 + rng() * .2, vz: (rng() - .5) * .3, drag: 1.6, gravity: -.1,
          color: ['#ffe7a3', '#fff6dc', '#ffc2d4'][(rng() * 3) | 0], size: .012 + rng() * .008, life: .9, shape: rng() < .6 ? 'sparkle' : 'star', spin: 4 }));
      }
    });
    if (g > 18.75 && kit.once('confetti')) {
      kit.sfx('horn', { volume: .55 });
      flameAt(TRICK, vA);
      confetti.burst(46, () => ({ x: vA.x, y: vA.y + .02, z: vA.z, vx: (rng() - .5) * .45, vy: .3 + rng() * .3, vz: (rng() - .5) * .35, gravity: -.6, drag: 1.1,
        color: ['#ff6f91', '#ffd27a', '#8fd0bd', '#c5a3ff', '#ffffff'][(rng() * 5) | 0], size: .012 + rng() * .01, life: 2.2, shape: rng() < .5 ? 'petal' : 'star', spin: (rng() - .5) * 8, floor: set.FLOOR + .004 }));
      hearts.burst(14, () => ({ x: her.root.position.x, y: H + .02, z: her.root.position.z, vx: (rng() - .5) * .25, vy: .15 + rng() * .15, gravity: -.12, drag: .7,
        color: ['#ff4f7b', '#ff8fab', '#ffd1dc'][(rng() * 3) | 0], size: .02 + rng() * .014, life: 2.2, shape: 'heart', spin: (rng() - .5) * 3 }));
    }
    const o = seg(g, 18.08, 18.25) * (1 - seg(g, 18.8, 19));         // "Ơ?!"
    oops.visible = o > .001; oops.scale.setScalar(Math.max(.001, .1 * ease.back(o)));
    oops.position.set(her.root.position.x + .05, H + .05 + .01 * o, her.root.position.z);
    if (held && dt && rng() < dt * 1.5) hearts.emit({ x: (rng() - .5) * .3 + .05, y: .3, z: .05, vy: .07, sway: .03, color: '#ff8fab', size: .018, life: 2.4, shape: 'heart' });
  }

  /* ── chapter 4: fireworks, the polaroids, the banner, the heart with the first photo ── */
  function finale(g, T, dt, held) {
    const shell = key => {
      if (!kit.once(key)) return;
      const cx = (rng() - .5) * .72, cy = .84 + rng() * .17, cols = [['#ffd166', '#fff1b8'], ['#ff8fab', '#ffd1dc'], ['#9be7ff', '#ffffff'], ['#c5a3ff', '#ffd1dc'], ['#b8ff9a', '#ffe08a']][(rng() * 5) | 0];
      fireworks.burst(26, i => { const a = i / 26 * TAU + rng() * .2, s = .09 + rng() * .05; return { x: cx, y: cy, z: -.24, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        gravity: -.1, drag: 1.5, color: cols[i % 3 ? 0 : 1], size: .015 + rng() * .007, life: 1.1 + rng() * .4, shape: i % 4 ? 'glow' : 'sparkle', twinkle: i % 2 ? 10 : 0 }; });
      for (let k = 1; k < 6; k++) fireworks.emit({ x: cx + (rng() - .5) * .004, y: cy - k * .03, z: -.24, vy: -.01, color: cols[1], size: .008, life: .25 + k * .05, shape: 'glow' });   // the rocket's trail
    };
    if (chapterOf(g) === 3) {
      SHOW.forEach((at, i) => { if (g > at) shell(`fw${i}`); });
      for (const [i, rate] of BANG) if (g > SHOW[i] - 1.2 / rate && kit.once(`bang${i}`)) kit.sfx('firework', { volume: .6, rate });
      if (held && dt) shell(`fw-held${Math.floor(T / .85)}`);
    }
    set.polaroids.forEach((p, i) => {
      const t0 = 20.8 + i * .4, k = seg(g, t0, t0 + .45), since = Math.max(0, g - t0);
      p.hang.visible = g > t0;
      p.swing.scale.setScalar(Math.max(.001, ease.back(k)));
      p.swing.rotation.z = .35 * Math.exp(-2.5 * since) * Math.sin(8 * since) + .03 * Math.sin(T * 1.5 + i * 2);
      p.halo.material.opacity = .5 * ease.out(seg(g, t0 + .2, t0 + .8)) * (1 + .12 * Math.sin(T * 3 + i));
      if (g > t0 + .2 && kit.once(`polaroid${i}`)) {
        kit.sfx('pop', { volume: .35, rate: 1.2 + i * .1 });
        p.hang.getWorldPosition(vA); stage.worldToLocal(vA);
        sparks.burst(10, () => ({ x: vA.x, y: vA.y - .05, z: vA.z + .01, vx: (rng() - .5) * .2, vy: (rng() - .5) * .2, drag: 1.4, color: '#fff1b8', size: .014, life: .8, shape: 'sparkle', spin: 3 }));
      }
    });
    const bn = ease.elastic(seg(g, 22.4, 23.4));
    if (g > 22.45 && kit.once('banner')) kit.sfx('applause', { volume: .6 });
    banner.root.visible = bn > .001; banner.root.scale.setScalar(Math.max(.001, bn));
    banner.root.position.set(0, lerp(.34, .5, ease.out(seg(g, 22.4, 23.2))) + .005 * Math.sin(T * 1.4), -.02); banner.root.rotation.set(-.12, 0, .02 * Math.sin(T * 1.1));
    const h = ease.back(seg(g, 22.9, 23.8)), hero = set.hero;
    hero.root.visible = h > .001; hero.root.scale.setScalar(Math.max(.001, h));
    hero.root.position.y = .72 + .007 * Math.sin(T * 1.2); set.faceCamera(hero.root);
    hero.halo.material.opacity = .6 * h * (1 + .1 * Math.sin(T * 2.5));
    hero.pearls.emissiveIntensity = .3 + .9 * h * (.65 + .35 * Math.sin(T * 4));
    if (g > 23.2 && kit.once('hero-sound')) kit.sfx('sparkle', { volume: .55 });
    if (g > 23.2 && kit.once('hero')) sparks.burst(30, () => { const a = rng() * TAU; return { x: Math.cos(a) * .15, y: .72 + Math.sin(a) * .14, z: -.06, vx: Math.cos(a) * .15, vy: Math.sin(a) * .15, drag: 1.5,
      color: ['#fff1b8', '#ffd1dc', '#ffffff'][(rng() * 3) | 0], size: .016, life: 1, shape: rng() < .5 ? 'sparkle' : 'star', spin: 3 }; });
    if (h > .9 && dt && rng() < dt * 5) { const a = rng() * TAU; sparks.emit({ x: Math.cos(a) * .15, y: .72 + Math.sin(a) * .14, z: -.05, vy: .02, color: '#fff1b8', size: .013, life: .9, shape: 'sparkle', spin: 3 }); }
  }

  function chapterOf(g) { return g < START[1] ? 0 : g < START[2] ? 1 : g < START[3] ? 2 : 3; }
};
