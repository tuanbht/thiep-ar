/* Sinh nhật Mẹ, told by the shared act _acts/lovestory.js in the kitchen of set.js. Three chapters, each ending at a stop
   (the next tap plays on; after the last, the letter):
     1 ·  0–7      Ca trực về khuya: the door opens on the night and Mẹ comes home from her shift, tired; she sets her bag
                   down on a chair, stretches her back ("Haizz…") and turns to the fridge: the children's note (the card's
                   words, a photo clipped to it) comes off the door to be read
     2 ·  7–13.5   Bếp sáng đèn: the note goes back, the lights come on warm ("BẤT NGỜ!!"), a garland of five photos unrolls
                   across the window, two prints pop onto the fridge and the carnations in the vase bloom; she covers her
                   mouth, then looks round, delighted
     3 · 13.5–20.5 Bánh kem của mẹ: she hurries to the table as a cake glides in from the phone's side; a ribbon with the
                   card's line unrolls along the table's edge and the candles light one by one; she claps and cheers, hearts
                   rise, the big photo on the table turns round to show the hero (the first photo) and two balloons lift
                   the banner (the card's thanks) from behind the wall
   Mẹ is kit.model('mom') (template.json "models"), fitted to H = .30 (1.68 m). A tap on her: a hop and hearts; a tap on
   the cake blows the candles out and they light again; a tap on a photo shows it big (the act does that). Sound (the
   shared birthday sounds, template.json "sound"): the music box ('soft') while she comes home, the party tune ('music')
   from the lights on, an effect for each moment.
   Everything is a function of g, the story's clock. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, tween, ease, seg, lerp, rng } = kit;
  const H = .30;
  const STRIDE = .1 * H / .3;                                         // KayKit's stride at this height: card widths a second at speed 1
  const SECONDS = [7, 6.5, 7];                                       // the chapters start at 0, 7 and 13.5 on g
  /* where she stands: outside the door, a step in, beside the chair (the bag), at the table's end (the cake) */
  const OUT = [-.385, -.29], IN = [-.37, -.058], SPOT = [-.125, -.078], MID = [-.118, -.005], CAKE_SIDE = [-.066, .045];
  const READ = { x: .27, y: .43, z: 0 };                              // where the note floats to be read: above the photo on the table
  const NIGHT = { hemi: new THREE.Color('#a3acdf'), ground: new THREE.Color('#3a3150'), sun: new THREE.Color('#c3cbff') };
  const WARM = { hemi: new THREE.Color('#ffe9d2'), ground: new THREE.Color('#a8817a'), sun: new THREE.Color('#ffdcb3') };
  const HEARTS = ['#ff4f7b', '#ff8fab', '#ffd1dc', '#ffd27a'];
  const CONFETTI = ['#ff6f91', '#ffd166', '#7cc4ff', '#9ccc65', '#ce93d8', '#ffffff'];
  let set, mom, b, hit, bubbles, hearts, sparks, confetti, smoke;
  let poked = -9, blown = -9, now = 0;                                // the last taps on her and on the cake (act time)
  const v3 = new THREE.Vector3(), seatSpot = new THREE.Vector3();

  /** the bones a gesture needs, under KayKit's names or Mixamo's */
  const BONES = {
    armR: ['upperarm.r', 'RightArm'], foreR: ['lowerarm.r', 'RightForeArm'], armL: ['upperarm.l', 'LeftArm'], foreL: ['lowerarm.l', 'LeftForeArm'],
    head: ['head', 'Head'], chest: ['chest', 'Spine'], spine: ['spine', 'Spine01'], handL: ['handslot.l', 'LeftHand']
  };
  const rig = m => Object.fromEntries(Object.entries(BONES).map(([k, names]) => [k, names.map(n => m.node(n)).find(Boolean) || null]));
  /** plays the first of `names` the model has */
  const act = (m, names, o) => { for (const n of [].concat(names)) if (m.play(n, o)) return; };
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  const walkSpeed = (from, to, s) => Math.hypot(to[0] - from[0], to[1] - from[1]) / s / STRIDE;

  /* who does what, from story time g: [from g, clip, options] */
  const CLIPS = [
    [0, 'Idle'], [1, 'Walking_A', { speed: walkSpeed(OUT, IN, 1.3) }], [2.3, 'Walking_A', { speed: walkSpeed(IN, SPOT, 1.4) }],
    [3.7, 'Idle', { fade: .3 }],
    [10, 'Look_Around', { fade: .45 }],
    [13.5, 'Walking_A', { speed: walkSpeed(SPOT, MID, .45), fade: .25 }], [14.4, 'Idle', { fade: .25 }],
    [15.1, ['Clap', 'Cheer'], { fade: .25 }], [17.1, 'Cheer', { once: true, fade: .2 }], [19.6, 'Idle', { fade: .45 }]
  ];
  /* where she is and which way she faces, from g */
  const PATH_X = [[0, OUT[0]], [1, OUT[0]], [2.3, IN[0], 'linear'], [3.7, SPOT[0], 'linear'], [13.5, SPOT[0]], [13.95, MID[0], 'linear'], [14.4, CAKE_SIDE[0], 'linear']];
  const PATH_Z = [[0, OUT[1]], [1, OUT[1]], [2.3, IN[1], 'linear'], [3.7, SPOT[1], 'linear'], [13.5, SPOT[1]], [13.95, MID[1], 'linear'], [14.4, CAKE_SIDE[1], 'linear']];
  const HEADING = [[0, 0], [2.18, 0], [2.45, 1.64], [3.55, 1.64], [3.95, 0], [6.05, 0], [6.6, .78], [7, .78], [7.6, .12], [13.5, .12], [13.62, .1], [13.95, .8], [14.3, .8], [14.65, .55]];

  /** a speech bubble: k (0..1) how far in, at (x, y, z) in the room, size card widths across */
  function bubbleAt(s, k, x, y, z, size) {
    s.visible = k > .001; s.scale.setScalar(Math.max(.001, size * ease.back(k))); s.position.set(x, y + .01 * k, z);
  }
  const inRoom = (o, out) => set.room.worldToLocal(o.getWorldPosition(out));

  return {
    seconds: SECONDS,

    build() {
      set = window.NM_MOM_KITCHEN(kit);
      mom = kit.model('mom').fit({ height: H });
      b = rig(mom); set.room.add(mom.root);
      hit = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.045, .045, H, 8)), kit.keep(new THREE.MeshBasicMaterial()));
      hit.visible = false; hit.userData.proxy = true; hit.position.y = H / 2; mom.root.add(hit);   // an easy target for a finger
      kit.onTap(hit, () => { poked = now; });
      kit.onTap(set.cake, () => { if (now - blown > 2.2) blown = now; });
      bubbles = {
        tired: set.bubble('Haizz… mỏi lưng quá!', { tail: .7 }),
        surprise: set.bubble('BẤT NGỜ!!', { burst: true }),
        oh: set.bubble('Ơ… trời ơi!', { tail: .72 }),
        love: set.bubble('Thương tụi con quá!', { tail: .7 })
      };
      hearts = kit.particles({ max: 180 });
      sparks = kit.particles({ max: 240, additive: true });
      confetti = kit.particles({ max: 200 });
      smoke = kit.particles({ max: 40 });
      set.room.add(hearts.root, sparks.root, confetti.root, smoke.root);   // in the room's space, as she is
    },

    reset() {
      [hearts, sparks, confetti, smoke].forEach(p => p.clear());
      mom.stop(); poked = blown = -9;
    },

    pose({ chapter, g, T, dt, held }) {
      now = T;
      kit.music(g < 7.6 ? 'soft' : 'music');

      /* the light: night until the kitchen lights up, warm from then on */
      const L = ease.smooth(seg(g, 7.6, 8.1)), K = kit.lights;
      K.hemi.color.copy(NIGHT.hemi).lerp(WARM.hemi, L); K.hemi.groundColor.copy(NIGHT.ground).lerp(WARM.ground, L);
      K.sun.color.copy(NIGHT.sun).lerp(WARM.sun, L);
      K.hemi.intensity = lerp(.78, .92, L); K.sun.intensity = lerp(.62, 1.12, L);
      set.lamps.forEach((s, i) => s.set(ease.out(seg(g, 7.6 + i * .12, 7.9 + i * .12)) * (1 + .03 * Math.sin(T * 7 + i))));
      set.moonGlow.material.opacity = .55 - .2 * L + .05 * Math.sin(T * 1.3);

      /* the door: it opens on the night, and shuts behind her */
      set.door.open(ease.out(seg(g, .35, 1)) * (1 - ease.inOut(seg(g, 2.35, 2.95))));
      if (g > .35 && kit.once('door')) kit.sfx('door', { volume: .7 });
      if (g > 2.8 && kit.once('door-shut')) kit.sfx('door', { volume: .35, rate: 1.25 });

      /* Mẹ: where, which way, which clip */
      const x = tween(g, PATH_X), z = tween(g, PATH_Z), hop = T - poked < .5 ? .03 * Math.sin(Math.PI * (T - poked) / .5) : 0;
      mom.root.position.set(x, set.F + hop, z); mom.root.rotation.y = tween(g, HEADING);
      mom.root.visible = g > .45;
      const c = clipAt(CLIPS, g); act(mom, c[1], c[2]);
      gestures(g, T);

      /* the bag: in her hand, then on the chair */
      bag(g);

      /* the note on the fridge: it comes off to be read, and goes back when the lights come on */
      const N = set.NOTE_HOME, call = Math.sin(Math.PI * seg(g, 6.05, 6.35));
      const fly = ease.out(seg(g, 6.3, 6.95)) * (1 - ease.inOut(seg(g, 7, 7.55)));
      const bob = fly * .004 * Math.sin(T * 2.1);
      set.note.position.set(lerp(N.x, READ.x, fly), lerp(N.y, READ.y, fly) + .04 * Math.sin(Math.PI * fly) * (g < 7 ? 1 : 0) + bob, lerp(N.z, READ.z, fly));
      set.note.scale.setScalar(lerp(N.s, 1, fly) * (1 + .12 * call));
      set.note.rotation.set(0, -.24 * fly, lerp(N.rz, .03, fly) + .02 * fly * Math.sin(T * 1.6));
      if (g > 6.3 && kit.once('note')) {
        kit.sfx('sparkle', { volume: .5 });
        sparks.burst(14, () => ({ x: N.x, y: N.y, z: N.z + .02, vx: (rng() - .5) * .25, vy: (rng() - .3) * .25, vz: .08, drag: 1.2, color: '#fff1b8', size: .016, life: .8, shape: 'sparkle', spin: 3 }));
      }

      /* the surprise: confetti and the shout as the lights come on */
      if (g > 7.65 && kit.once('lights')) {
        kit.sfx('pop', { volume: .7 }); kit.sfx('applause', { volume: .7 });
        for (const s of [-1, 1]) confetti.burst(45, () => ({ x: s * .42, y: .5, z: .05, vx: -s * (.15 + rng() * .35), vy: .1 + rng() * .3, vz: (rng() - .3) * .2,
          gravity: -.55, drag: .9, sway: .05, color: CONFETTI[(rng() * CONFETTI.length) | 0], size: .012 + rng() * .01, life: 2.6, shape: rng() < .5 ? 'petal' : 'star', spin: (rng() - .5) * 8, floor: set.F + .002 }));
      }
      bubbleAt(bubbles.surprise, ease.out(seg(g, 7.65, 7.95)) * (1 - seg(g, 8.9, 9.2)), .02, .52, .05, .22);

      /* the garland unrolls across the window, a photo at a time, its bulbs coming on */
      const roll = ease.inOut(seg(g, 7.9, 9.2));
      set.garlandSet.unroll(roll);
      set.garland.forEach((p, i) => {
        const at = 7.9 + 1.3 * p.t, k = ease.back(seg(g, at, at + .32));
        p.hang.scale.setScalar(Math.max(.001, k)); p.hang.visible = k > .002;
        p.hang.rotation.z = p.tilt * k + .03 * Math.sin(T * 1.5 + i * 1.7) * k;
        if (g > at && kit.once(`garland${i}`)) kit.sfx('ting', { volume: .45, rate: 1 + i * .06 });
      });
      set.bulbs.forEach((bl, i) => bl.set(roll >= bl.t - .001 ? (.8 + .2 * Math.sin(T * 3 + i * 1.3)) * L : 0));

      /* two prints pop onto the fridge */
      set.prints.forEach((p, i) => {
        const at = 9.2 + i * .3, k = ease.back(seg(g, at, at + .3));
        p.hang.scale.setScalar(Math.max(.001, k)); p.hang.visible = k > .002;
        if (g > at && kit.once(`print${i}`)) {
          kit.sfx('pop', { volume: .55, rate: 1.1 + i * .1 });
          inRoom(p.root, v3);
          sparks.burst(10, () => ({ x: v3.x, y: v3.y, z: v3.z + .01, vx: (rng() - .5) * .2, vy: (rng() - .5) * .2, vz: .05, drag: 1.2, color: '#fff1b8', size: .014, life: .7, shape: 'sparkle', spin: 3 }));
        }
      });

      /* the carnations open */
      set.flowers.forEach((f, i) => {
        const at = 9.6 + i * .12, k = ease.back(seg(g, at, at + .5));
        f.bloom.scale.setScalar(Math.max(.001, k)); f.bloom.visible = k > .002;
        f.bud.scale.setScalar(Math.max(.001, 1 - ease.out(seg(g, at, at + .25)))); f.bud.visible = g < at + .25;
        if (g > at + .1 && kit.once(`bloom${i}`)) {
          if (i === 0) kit.sfx('sparkle', { volume: .5 });
          inRoom(f.head, v3);
          sparks.burst(5, () => ({ x: v3.x, y: v3.y, z: v3.z, vx: (rng() - .5) * .12, vy: .04 + rng() * .1, vz: (rng() - .5) * .08, drag: 1.5, color: '#ffd1dc', size: .012, life: .7, shape: 'sparkle' }));
        }
      });
      if (chapter === 1 && g > 10.2 && dt && rng() < dt * 1.4) {   // hearts drift up from her while she looks round, at the stop too
        hearts.emit({ x: mom.root.position.x + (rng() - .5) * .06, y: set.F + H * .9, z: mom.root.position.z + .02, vy: .05, sway: .02,
          color: HEARTS[(rng() * 3) | 0], size: .017, life: 2.6, shape: 'heart' });
      }

      /* the cake glides in from the phone's side and lands on the table */
      cake(g, T, dt, held);

      /* the big photo on the table turns round: the hero (the buyer's first photo) */
      const turn = ease.inOut(seg(g, 15.9, 16.5));
      set.flip.rotation.y = Math.PI * turn;
      set.display.scale.setScalar(1 + .06 * Math.sin(Math.PI * turn) + .1 * ease.out(seg(g, 16.3, 16.8)));   // and grows a little: the hero
      set.heroGlow.material.opacity = .35 * seg(g, 16.3, 16.8) * (1 + .1 * Math.sin(T * 3));
      if (g > 16.35 && kit.once('hero')) {
        kit.sfx('sparkle', { volume: .55 });
        inRoom(set.hero.root, v3);
        sparks.burst(16, () => ({ x: v3.x, y: v3.y, z: v3.z + .02, vx: (rng() - .5) * .3, vy: (rng() - .3) * .3, vz: .05, drag: 1.2, color: '#fff1b8', size: .016, life: .9, shape: 'sparkle', spin: 3 }));
      }

      /* the balloons lift the banner from behind the wall */
      const up = ease.out(seg(g, 16.8, 18.3));
      set.lift.visible = up > .001;
      set.lift.position.set(0, lerp(.1, .6, up) + .008 * Math.sin(T * 1.2) * up, -.3);
      set.lift.rotation.set(-.08, 0, .025 * Math.sin(T * 1.1) * up);
      set.balloons.forEach((bl, i) => { bl.position.y = .2 + .01 * Math.sin(T * 1.7 + i * 2); bl.rotation.z = .08 * Math.sin(T * 1.3 + i); });
      if (g > 16.9 && kit.once('lift')) kit.sfx('sparkle', { volume: .45, rate: .85 });

      /* her cheer: hearts, confetti, and what she says */
      if (g > 17.35 && kit.once('cheer')) {
        kit.sfx('applause', { volume: .8 });
        hearts.burst(24, () => ({ x: mom.root.position.x + .02, y: set.F + H, z: mom.root.position.z + .02, vx: (rng() - .3) * .3, vy: .16 + rng() * .2, vz: (rng() - .5) * .1,
          gravity: -.12, drag: .8, color: HEARTS[(rng() * 4) | 0], size: .018 + rng() * .016, life: 2.4, shape: 'heart', spin: (rng() - .5) * 3 }));
        confetti.burst(60, () => ({ x: (rng() - .5) * .5, y: .62, z: (rng() - .5) * .2, vx: (rng() - .5) * .2, vy: rng() * .1, gravity: -.4, drag: .8, sway: .06,
          color: CONFETTI[(rng() * CONFETTI.length) | 0], size: .012 + rng() * .01, life: 3, shape: rng() < .5 ? 'petal' : 'star', spin: (rng() - .5) * 8, floor: set.F + .002 }));
      }
      if (g > 17.4 && dt && rng() < dt * (held ? 2.2 : 3.5)) {             // and the hearts keep rising
        hearts.emit({ x: (rng() - .5) * .5, y: set.F + .2 + rng() * .1, z: .02 + rng() * .15, vy: .06 + rng() * .03, sway: .025,
          color: HEARTS[(rng() * 4) | 0], size: .016 + rng() * .01, life: 3.2, shape: 'heart' });
      }

      /* the bubbles: tired, surprised, moved */
      const p = mom.root.position;
      bubbleAt(bubbles.tired, seg(g, 4.95, 5.2) * (1 - seg(g, 6.05, 6.3)), p.x - .12, set.F + H + .03, p.z + .03, .17);
      bubbleAt(bubbles.oh, seg(g, 8.4, 8.65) * (1 - seg(g, 9.75, 10)), p.x - .14, set.F + H * .82, p.z + .06, .165);
      bubbleAt(bubbles.love, seg(g, 17.5, 17.75) * (1 - seg(g, 19.1, 19.4)), p.x - .11, set.F + H * .75, p.z + .1, .17);

      /* a tap on her: a hop and hearts */
      if (T - poked < .1 && kit.once(`poke${poked.toFixed(3)}`)) {
        kit.sfx('sparkle', { volume: .5 });
        hearts.burst(14, () => ({ x: p.x, y: set.F + H, z: p.z + .02, vx: (rng() - .5) * .25, vy: .15 + rng() * .15, vz: (rng() - .5) * .08, gravity: -.12, drag: .7,
          color: HEARTS[(rng() * 4) | 0], size: .018 + rng() * .012, life: 2, shape: 'heart', spin: (rng() - .5) * 3 }));
      }

      [hearts, sparks, confetti, smoke].forEach(x => x.update(dt, T));
    }
  };

  /* ── her gestures on top of the clips: tired, the bag, the stretch, the note, the surprise ── */
  function gestures(g, T) {
    /* tired: head down, shoulders a little round, until the stretch */
    const tired = g < 7 ? 1 - ease.inOut(seg(g, 4.82, 5.15)) : 0;
    if (tired) { mom.bend(b.chest, .1, 0, 0, tired); mom.bend(b.head, .22, 0, 0, tired); }
    /* the bag onto the chair: the left arm out and down, a lean towards it */
    const kb = ease.inOut(seg(g, 3.8, 4.22)) * (1 - ease.inOut(seg(g, 4.4, 4.8)));
    if (kb) mom.bend(b.chest, 0, 0, -.1, kb);
    /* the stretch: the back arched, arms up, hands together over her head */
    const ks = ease.inOut(seg(g, 4.85, 5.3)) * (1 - ease.inOut(seg(g, 5.8, 6.15)));
    if (ks) { mom.bend(b.spine, -.12, 0, 0, ks); mom.bend(b.chest, -.18, 0, 0, ks); mom.bend(b.head, -.3, 0, 0, ks); }
    if (g > 5.35 && g < 7 && kit.once('crack')) {                       // a comic crack in the back
      kit.sfx('pop', { volume: .4, rate: 1.6 });
      v3.set(mom.root.position.x, set.F + H * .62, mom.root.position.z - .03);
      sparks.burst(6, () => ({ x: v3.x, y: v3.y, z: v3.z, vx: (rng() - .5) * .2, vy: (rng() - .2) * .2, drag: 2, color: '#fff6c8', size: .014, life: .5, shape: 'star', spin: 4 }));
    }
    /* the note: she looks at it, her head turned a little more than her body */
    const look = g < 7 ? ease.inOut(seg(g, 6.05, 6.6)) : 1 - ease.inOut(seg(g, 7, 7.5));
    if (look) mom.bend(b.head, -.05, .35, 0, look);
    /* the surprise: a start, then both hands to her mouth */
    const start = Math.sin(Math.PI * seg(g, 7.65, 8.05));
    if (start) { mom.bend(b.spine, -.12, 0, 0, start); mom.bend(b.chest, -.08, 0, 0, start); }
    const cover = ease.inOut(seg(g, 7.95, 8.35)) * (1 - ease.inOut(seg(g, 9.7, 10.1)));
    if (cover) mom.bend(b.head, -.08, 0, 0, cover);
    /* the arms: aimed after every bend */
    if (kb && b.armL) { mom.aim(b.armL, [.7, -.71, .03], kb); mom.aim(b.foreL, [.69, -.72, .04], kb); }   // 45 degrees out: her hand .152 up, the bag on the cushion
    if (ks && b.armL && b.armR) {
      mom.aim(b.armL, [.3, 1, -.05], ks); mom.aim(b.foreL, [-.5, 1, .05], ks);
      mom.aim(b.armR, [-.3, 1, -.05], ks); mom.aim(b.foreR, [.5, 1, .05], ks);
    }
    const cheer = ease.inOut(seg(g, 17.25, 17.6)) * (1 - ease.inOut(seg(g, 18.55, 18.95)));
    if (cheer && b.armL && b.armR) {
      const w = .06 * Math.sin(T * 9);
      mom.aim(b.armL, [.42, .82, .22], cheer); mom.aim(b.foreL, [.2 + w, 1, .12], cheer);
      mom.aim(b.armR, [-.42, .82, .22], cheer); mom.aim(b.foreR, [-.2 - w, 1, .12], cheer);
    }
    if (cover && b.armL && b.armR) {
      mom.aim(b.armR, [-.1, -.5, .85], cover); mom.aim(b.foreR, [.35, .9, .2], cover);
      mom.aim(b.armL, [.1, -.5, .85], cover); mom.aim(b.foreL, [-.35, .9, .2], cover);
    }
  }

  /* ── the bag: it hangs from her left hand, upright, and she sets it on the chair's cushion ── */
  function bag(g) {
    const bagG = set.bag, hand = b.handL;
    seatSpot.set(SPOT[0] + .088, set.SEAT_TOP + set.BAG.h + set.BAG.handle, SPOT[1] - .002);   // where her hand is with the arm 45 degrees out
    bagG.visible = g > .45;
    if (g >= 4.25 || !hand) {                                          // on the chair, a little slumped
      const settle = seg(g, 4.25, 4.45);
      bagG.position.copy(seatSpot); bagG.position.y -= .002 * Math.sin(Math.PI * settle);
      bagG.rotation.set(0, 0, .06 * ease.out(settle));
      return;
    }
    inRoom(hand, v3);
    const onto = ease.inOut(seg(g, 4.0, 4.25));                         // the last of the way: onto the spot
    bagG.position.copy(v3).lerp(seatSpot, onto);
    bagG.rotation.set(0, mom.root.rotation.y * (1 - onto), 0);
  }

  /* ── the cake: it glides in, lands, the ribbon unrolls, the candles light and twinkle; a tap blows them out ── */
  function cake(g, T, dt, held) {
    const C = set.cake, X = set.CAKE.x, Z = set.CAKE.z;
    const glide = ease.out(seg(g, 13.8, 15)), land = Math.sin(Math.PI * seg(g, 15, 15.3));
    C.visible = g > 13.8;
    C.position.set(X, set.TOP + .035 * Math.sin(Math.PI * glide) * (1 - glide * .3), lerp(.32, Z, glide));
    const grow = lerp(.45, 1, ease.out(seg(g, 13.8, 14.4)));
    C.scale.set(grow, grow * (1 - .08 * land), grow);
    if (g > 13.8 && g < 15 && dt && rng() < dt * 40) {                  // a trail of sparkles behind it
      sparks.emit({ x: C.position.x + (rng() - .5) * .06, y: C.position.y + .02 + rng() * .03, z: C.position.z + .03, vy: .02, drag: .5,
        color: rng() < .5 ? '#ffe3a3' : '#ffb3c7', size: .014, life: .7, shape: 'sparkle', spin: 3 });
    }
    if (g > 13.85 && kit.once('cake')) kit.sfx('sparkle', { volume: .55 });
    if (g > 15 && kit.once('cake-land')) { kit.sfx('pop', { volume: .6, rate: .8 }); kit.sfx('horn', { volume: .8 }); }   // ta-da
    const unroll = ease.out(seg(g, 15.05, 15.5));                          // the ribbon with the card's line, down the table's edge
    set.cakeLine.scale.set(1, Math.max(.001, unroll), 1); set.cakeLine.visible = unroll > .002;
    if (g > 15.05 && kit.once('ribbon')) kit.sfx('sparkle', { volume: .45, rate: 1.2 });
    const out = T - blown < 1.4 ? 1 : 0;                                 // blown out for a moment by a tap
    if (T - blown < .05 && kit.once(`blow${blown.toFixed(3)}`)) {
      kit.sfx('blow', { volume: .8 });
      smoke.burst(10, i => ({ x: C.position.x + (i / 9 - .5) * .035, y: C.position.y + .065, z: C.position.z + .005, vy: .05 + rng() * .03, sway: .01,
        color: '#c9c1cc', size: .02, grow: 2, life: 1.6, shape: 'glow' }));
    }
    if (T - blown > 1.4 && T - blown < 1.5 && kit.once(`relight${blown.toFixed(3)}`)) kit.sfx('ting', { volume: .5, rate: 1.3 });
    let lit = 0;
    set.candles.forEach(({ flame, glow }, i) => {
      const at = 15.25 + i * .12, k = ease.back(seg(g, at, at + .25)) * (1 - out), f = 1 + .12 * Math.sin(T * 19 + i * 3) * Math.sin(T * 7.3 + i);
      flame.visible = k > .01; flame.scale.set(k, 1.7 * k * f, k); glow.material.opacity = .75 * k * f; lit += k / 5;
      if (g > at && kit.once(`candle${i}`)) kit.sfx('ting', { volume: .4, rate: 1.2 + i * .08 });
    });
    set.cakeLight.intensity = .18 * lit * (1 + .08 * Math.sin(T * 13));   // more washes the cake out
    if (lit > .5 && dt && rng() < dt * (held ? 5 : 8)) {                 // the candles twinkle
      sparks.emit({ x: C.position.x + (rng() - .5) * .05, y: C.position.y + .07 + rng() * .02, z: C.position.z + .01, vy: .04 + rng() * .03, sway: .01,
        color: rng() < .5 ? '#fff1b8' : '#ffd27a', size: .01 + rng() * .006, life: .9, shape: 'sparkle', spin: 3 });
    }
  }
};
