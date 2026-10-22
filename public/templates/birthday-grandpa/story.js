/* Sinh nhật Ông, told by the shared act _acts/lovestory.js in the courtyard of set.js. Three chapters, each ending at a
   stop (the next tap plays on; after the last, the letter):
     1 ·  0–6.5   Buổi chiều của ông: he rocks in his chair with a cup of tea, reading Báo Nhà Mình (its front page, turned
                  to us, has one of the card's photos under the card's headline); the bulbul hops and sings, he looks up at
                  it and sips his tea, turns the paper round, sees himself ("Ơ… ông đây mà!") and holds it out to us
     2 · 6.5–13   Album kỷ niệm: the paper goes down on his lap, folded; the album on the table stands up on its easel and
                  opens, its pages turning (two photos a spread, over the card's line); he leans forward and points; four
                  framed photos appear on the bonsai's branches and sway ("Nhớ hồi đó quá!"); he sits back and chuckles
     3 · 13–20.5  Bánh mừng thọ: he sets his cup on the armrest and stands; the album gives way to a tray of peach buns and a
                  little cake with candles; he claps, leans in and blows the candles out; confetti, two balloons carry the
                  banner open with the card's wish, the gift box opens and the first photo springs up in a wooden frame,
                  red lanterns rise, he waves ("Cảm ơn các con, các cháu!")
   A tap on Ông makes him chuckle; a tap on the cage makes the bulbul sing; a tap on a photo shows it big (the act does
   that). Everything follows g, the story's clock, but the idle motion (T) and what goes on while a stop waits (t). */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, ease, seg, lerp, clamp, rng, hop } = kit;
  const START = [0, 6.5, 13], SECONDS = [6.5, 6.5, 7.5];
  const OLD = .32 * .972;                                             // Ông's height: 1.75 m to the shared boy's 1.80 at .32
  const ARM = [.251, .304];                                           // his upper arm, and his forearm to the middle of the fist (metres)
  const TAU = Math.PI * 2;
  /** who does what, from g: [from g, clip, options] */
  const CLIPS = [[0, 'Sit_Chair_Idle'], [13.35, 'Sit_Chair_StandUp', { once: true, fade: .25 }], [14.85, 'Idle', { fade: .3 }],
    [15.05, 'Clap', { speed: .9, fade: .25 }], [16.6, 'Idle', { fade: .3 }], [18.25, 'Wave', { fade: .35 }]];
  /** the paper in his left hand: the fist's place in his own space from his chest (x his left, y up, z ahead), the paper's
      turn from his facing, its top tipped back (pitch) and its size (s: [across, up]; up halved is folded) */
  const HOLD = {
    read: { at: [.012, -.01, .072], yaw: 0, pitch: -.32, s: [1, 1] },
    lap: { at: [.034, -.064, .074], yaw: 0, pitch: -.55, s: [1, .5] },
    look: { at: [.02, -.062, .078], yaw: Math.PI, pitch: -.8, s: [.8, .8] },
    show: { at: [.105, .03, .078], yaw: TAU - .3, pitch: -.42, s: [1.3, 1.3] },
    down: { at: [.03, -.07, .075], yaw: TAU, pitch: -1.45, s: [1, .5] }
  };
  const PAPER = [[0, 'read'], [1.5, 'read'], [1.95, 'lap'], [3.75, 'lap'], [4.2, 'look'], [4.95, 'look'], [5.55, 'show'], [6.5, 'show'], [7.05, 'down']];
  /* where the lanterns go up from, round the edges of the courtyard */
  const LAUNCH = [[-.42, .45, -.16], [.4, .44, -.2], [-.31, .46, -.06], [.27, .43, -.1], [-.46, .44, .02], [.45, .43, -.05], [-.2, .5, -.22]];
  let set, ong, cup, paper, mouth, notes, steam, sparks, smoke, confetti, puffs, bubbles, birdY = 0;
  let poked = -9, chirped = -9, now = 0, albumSeen = null, lastSteam = 0, lastNote = 0;
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), vS = new THREE.Vector3(), vE = new THREE.Vector3(),
    vD = new THREE.Vector3(), vP = new THREE.Vector3(), vT = new THREE.Vector3(), vF = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
  const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), qC = new THREE.Quaternion(), qI = new THREE.Quaternion(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qT = new THREE.Quaternion();
  const e1 = new THREE.Euler(0, 0, 0, 'YXZ'), AIM = [0, 0, 0], UP = new THREE.Vector3(0, 1, 0);

  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  const onStage = (o, out) => stage.worldToLocal(o.getWorldPosition(out));
  /** a point in an object's own space, on the stage */
  const local = (o, x, y, z, out) => stage.worldToLocal(o.localToWorld(out.set(x, y, z)));
  /** his turn on the stage (the chair's, while he sits in it) */
  const charQuat = out => { stage.getWorldQuaternion(q1); ong.root.getWorldQuaternion(out); return out.premultiply(q1.invert()); };
  /** a point in his own space from `base` (x his left, y up, z ahead), on the stage */
  const inHis = (base, x, y, z, out) => out.set(x, y, z).applyQuaternion(charQuat(q2)).add(base);
  /** an object's turn on the stage */
  const turnOf = (o, out) => { stage.getWorldQuaternion(q1); o.getWorldQuaternion(out); return out.premultiply(q1.invert()); };

  /** an arm reaching for a point on the stage: the elbow found from the two bones' lengths, bent down and out */
  function reach(side, target, k, pole = [.5, -1, -.2]) {
    if (k <= 0) return;
    const s = ong.scene.scale.x, a = ARM[0] * s, b = ARM[1] * s, out = side === 'l' ? 1 : -1;
    onStage(ong.node(`upperarm.${side}`), vS);
    vD.subVectors(target, vS); const L = clamp(vD.length(), .3 * (a + b), .995 * (a + b)); vD.normalize();
    const cosA = clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    charQuat(qC);
    vP.set(out * pole[0], pole[1], pole[2]).applyQuaternion(qC); vP.addScaledVector(vD, -vP.dot(vD)).normalize();
    vE.copy(vS).addScaledVector(vD, a * cosA).addScaledVector(vP, a * sinA);
    qI.copy(qC).invert();
    ong.aim(`upperarm.${side}`, vT.subVectors(vE, vS).applyQuaternion(qI).toArray(AIM), k);
    ong.aim(`lowerarm.${side}`, vT.copy(vS).addScaledVector(vD, L).sub(vE).applyQuaternion(qI).toArray(AIM), k);
  }
  /** he sits in the rocking chair: his feet SETTLE ahead of where his hips go, rocking with it */
  function seatHim() {
    const body = set.chair.body; body.updateWorldMatrix(true, false);   // this frame's rock, not the last
    ong.root.position.copy(local(body, 0, 0, set.SETTLE, v1));
    ong.root.quaternion.copy(turnOf(body, qA));
  }
  /** the cup in his right hand, upright, its middle in the fist; tipped to his lips while he sips (0..1) */
  function holdCup(sip) {
    const slot = ong.node('handslot.r');
    onStage(slot, cup.position);
    stage.getWorldQuaternion(q1).invert();
    vF.set(1, 0, 0).transformDirection(slot.matrixWorld).applyQuaternion(q1).setY(0);   // the way the fingers point, level
    if (vF.lengthSq() < 1e-8) vF.set(0, 0, 1);
    cup.position.addScaledVector(vF.normalize(), .0035); cup.position.y -= .0045;
    cup.quaternion.identity();
    if (sip) {
      onStage(mouth, v2).sub(cup.position).setY(0).cross(UP).negate();
      if (v2.lengthSq() > 1e-10) cup.quaternion.setFromAxisAngle(v2.normalize(), 1.05 * sip);
    }
  }
  /** the hold of the paper at g, between two of HOLD */
  function paperHold(g) {
    let i = 0; while (i < PAPER.length - 1 && g >= PAPER[i + 1][0]) i++;
    const [g0, a] = PAPER[i], [g1, b] = PAPER[Math.min(i + 1, PAPER.length - 1)], A = HOLD[a], B = HOLD[b];
    const k = a === b || g1 === g0 ? 0 : ease.inOut(seg(g, g0, g1));
    return { at: A.at.map((x, j) => lerp(x, B.at[j], k)), yaw: lerp(A.yaw, B.yaw, k), pitch: lerp(A.pitch, B.pitch, k), s: A.s.map((x, j) => lerp(x, B.s[j], k)) };
  }
  /** the paper held at its bottom edge by his left fist: its place (vA) and turn (qA) */
  function paperInHand(h) {
    onStage(ong.node('handslot.l'), vA);
    charQuat(qC); e1.set(h.pitch, h.yaw, 0); qA.copy(qC).multiply(qT.setFromEuler(e1));
    vA.addScaledVector(v1.set(0, 1, 0).applyQuaternion(qA), -.007);
  }
  /** the paper folded on his lap (vB, qB): its fold near his knees, its front page up */
  function paperOnLap() {
    inHis(onStage(ong.node('hips'), v1), 0, .021, .078, vB);
    charQuat(qC); e1.set(-Math.PI / 2 + .1, 0, 0); qB.copy(qC).multiply(qT.setFromEuler(e1));
  }
  function bubbleAt(b, k, p) {
    b.scale.setScalar(Math.max(.001, .145 * ease.back(k)));
    b.position.copy(p); b.position.y += .012 * k;
    b.visible = k > .001;
  }
  const overHead = out => { onStage(ong.node('head'), out); out.y += .112; out.z += .012; return out; };
  const burst = (p, n, colors, o = {}) => sparks.burst(n, () => ({ x: p.x + (rng() - .5) * (o.spread ?? .02), y: p.y + (rng() - .5) * (o.spread ?? .02), z: p.z,
    vx: (rng() - .5) * .22, vy: .04 + rng() * .16, vz: (rng() - .5) * .08, drag: 1.6, color: colors[(rng() * colors.length) | 0], size: o.size ?? .016, life: o.life ?? .8, shape: rng() < .5 ? 'sparkle' : 'star', spin: 3 }));

  return {
    seconds: SECONDS,

    build() {
      set = window.NM_GRANDPA_SET(kit);
      ong = kit.model('grandpa').fit({ height: OLD });
      stage.add(ong.root);
      mouth = new THREE.Object3D(); mouth.position.set(.07, 14.64, 3.49); ong.node('head')?.add(mouth);   // the head bone's own space is in centimetres
      const hit = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.055, .055, OLD, 8)), kit.keep(new THREE.MeshBasicMaterial()));
      hit.visible = false; hit.userData.proxy = true; hit.position.y = OLD / 2; ong.root.add(hit);   // an easy target for a finger
      kit.onTap(hit, () => { poked = now; });
      const perch = new THREE.Mesh(kit.keep(new THREE.SphereGeometry(.055, 8, 6)), kit.keep(new THREE.MeshBasicMaterial()));
      perch.visible = false; perch.userData.proxy = true; perch.position.y = -.09; set.bird.cage.add(perch);
      kit.onTap(perch, () => { chirped = now; });
      cup = set.cup; paper = set.newspaper.root; birdY = set.bird.root.position.y;
      bubbles = { me: set.bubble('Ơ… ông đây mà!'), then: set.bubble('Nhớ hồi đó quá!', { tail: .62 }), thanks: set.bubble('Cảm ơn các con, các cháu!', { tail: .62 }) };
      Object.values(bubbles).forEach(b => stage.add(b));
      notes = kit.particles({ max: 90 }); steam = kit.particles({ max: 60 }); sparks = kit.particles({ max: 240, additive: true });
      smoke = kit.particles({ max: 70 }); confetti = kit.particles({ max: 200 }); puffs = kit.particles({ max: 60 });
      stage.add(notes.root, steam.root, sparks.root, smoke.root, confetti.root, puffs.root);
      const L = kit.lights;                                             // a golden late afternoon, the sun low on the right
      L.hemi.color.set('#ffe9c8'); L.hemi.groundColor.set('#a8714a'); L.hemi.intensity = 1.05;
      L.sun.color.set('#ffd08a'); L.sun.intensity = 1.75; L.sun.position.set(.8, .95, .95);
    },

    reset() {
      [notes, steam, sparks, smoke, confetti, puffs].forEach(p => p.clear());
      ong.stop(); albumSeen = null; poked = chirped = -9;
    },

    pose({ chapter, t, g, T, dt, held }) {
      now = T;
      const t3 = chapter === 2 ? t : g - START[2];                     // the last chapter's own time, still growing while its stop waits

      kit.music(g >= 13.7 ? 'music' : 'soft');                          // the music box through the afternoon, the party once the cake is out

      /* the chair rocks; less while he leans to the album; still before he stands */
      const lean = ease.inOut(seg(g, 7.8, 8.6)) * (1 - ease.inOut(seg(g, 10.8, 11.5)));
      const pk = T - poked, chuckle = pk < 1.4 ? Math.sin(Math.PI * pk / 1.4) : 0;
      set.chair.rock((.06 * (1 - .65 * lean) + .03 * chuckle) * (1 - seg(g, 13, 13.3)) * Math.sin(T * 2.3));

      /* Ông: the chair carries him while he sits; he stands up where he sat */
      seatHim();
      const c = clipAt(CLIPS, g); ong.play(c[1], c[2]);

      /* his back and head first (a bend after an aim would swing the aimed arm) */
      const read = 1 - ease.inOut(seg(g, 1.5, 1.95));
      const look = ease.inOut(seg(g, 1.95, 2.3)) * (1 - ease.inOut(seg(g, 2.55, 2.85)));
      const sip = ease.inOut(seg(g, 2.75, 3.15)) * (1 - ease.inOut(seg(g, 3.45, 3.8)));
      const peer = ease.inOut(seg(g, 4.15, 4.45)) * (1 - ease.inOut(seg(g, 4.95, 5.3)));
      const proud = ease.inOut(seg(g, 5.5, 5.9)) * (1 - ease.inOut(seg(g, 6.5, 6.9)));
      const blow = ease.inOut(seg(g, 16.65, 16.95)) * (1 - ease.inOut(seg(g, 17.45, 17.8)));
      if (read) ong.bend('head', .14 * read, 0, 0);
      if (look) ong.bend('head', -.22 * look, -.62 * look, 0);
      if (sip) ong.bend('head', -.12 * sip, 0, 0);
      if (peer) { ong.bend('chest', .1 * peer, 0, 0); ong.bend('head', .28 * peer, 0, 0); }
      if (proud) ong.bend('head', (.05 + .07 * Math.sin(T * 3.2)) * proud, .12 * proud, 0);
      if (lean) { ong.bend('spine', .07 * lean, 0, 0); ong.bend('chest', .15 * lean, 0, 0); ong.bend('head', -.1 * lean, 0, 0); }
      const laugh = Math.min(1, (g > 11.2 && g < 13 ? ease.inOut(seg(g, 11.2, 11.5)) * (1 - seg(g, 12.7, 13)) : 0) + chuckle);
      if (laugh) ong.bend('chest', .07 * laugh * Math.abs(Math.sin(T * 13)), 0, 0);
      if (blow) { ong.bend('spine', .18 * blow, 0, 0); ong.bend('chest', .3 * blow, 0, 0); ong.bend('head', .16 * blow, 0, 0); }

      /* the paper: in his left hand through the first chapter, folded on his lap after, left on the seat when he gets up */
      const chest = onStage(ong.node('chest'), v3);
      const inHand = g < 7.3 ? 1 - seg(g, 7.05, 7.3) : 0;
      if (inHand) { const h = paperHold(g); reach('l', inHis(chest, ...h.at, vT), inHand); }
      const held1 = paperHold(g), size = g < 7.1 ? held1.s : [1, .5];
      if (g < 6.95) { paperInHand(held1); paper.position.copy(vA); paper.quaternion.copy(qA); }
      else {
        paperOnLap();
        if (g < 7.1) { paperInHand(paperHold(g)); const k = ease.inOut(seg(g, 6.95, 7.1)); paper.position.copy(vA).lerp(vB, k); paper.quaternion.copy(qA).slerp(qB, k); }
        else { paper.position.copy(vB); paper.quaternion.copy(qB); }
        if (g > 13.45) {                                                // he gets up: it stays on the seat
          const k = ease.inOut(seg(g, 13.45, 13.95));
          local(set.chair.body, 0, set.SEAT + .0025, .036, vA); e1.set(-Math.PI / 2, 0, 0); qA.copy(turnOf(set.chair.body, q2)).multiply(q1.setFromEuler(e1));
          paper.position.lerp(vA, k); paper.quaternion.slerp(qA, k);
        }
      }
      paper.scale.set(size[0], size[1], 1);
      set.newspaper.photo.root.visible = size[1] / size[0] > .7;                // folded, its photo is inside
      if (g > 5.6 && g < 6.5 && kit.once('show-sound')) kit.sfx('ting', { volume: .45 });
      if (g > 5.6 && g < 6.5 && kit.once('show')) burst(v1.copy(paper.position).add(v2.set(0, .09, 0)), 16, ['#fff1b8', '#ffd27a', '#ffffff'], { spread: .09 });

      /* the cup: in his right hand (a sip in the first chapter), then down on the armrest before he stands */
      const toArm = ease.inOut(seg(g, 13.0, 13.3)) * (1 - ease.inOut(seg(g, 13.3, 13.6)));
      if (sip) reach('r', inHis(onStage(mouth, v1), 0, -.014, .02, vT), sip);
      if (toArm) reach('r', local(set.chair.body, -.058, set.SEAT + .062, .022, vT), toArm);
      if (g < 13.3) holdCup(sip);
      else { local(set.chair.body, -.058, set.SEAT + .048, .022, cup.position); cup.quaternion.copy(turnOf(set.chair.body, qA)); }
      if (dt && T - lastSteam > .14 && sip < .2) {
        lastSteam = T; cup.updateWorldMatrix(true, false); local(cup, 0, .011, 0, v1);
        steam.emit({ x: v1.x + (rng() - .5) * .004, y: v1.y, z: v1.z, vx: (rng() - .5) * .006, vy: .028 + rng() * .012, sway: .008, color: '#fffaf2', size: .007 + rng() * .004, grow: 1.8, life: 1.3, shape: 'glow' });
      }

      /* he points at the album with his left hand */
      const point = ease.inOut(seg(g, 8.5, 8.85)) * (1 - ease.inOut(seg(g, 10.7, 11.1)));
      if (point) reach('l', local(set.album.root, -set.album.PW * .45, set.album.PH * .6, .012, vT).add(v1.set(0, .004 * Math.sin(T * 8), 0)), point, [.6, -.8, -.35]);
      if (point > .9 && dt && T % .55 < dt) burst(local(set.album.root, -set.album.PW * .5, set.album.PH * .62, .01, v1), 4, ['#fff1b8', '#ffd27a'], { size: .014, life: .6, spread: .04 });   // "this one!"

      /* the bulbul: hops on its perch, turns its head, sings */
      const B = set.bird;
      const singing = (g > 1.15 && g < 2.45) || (g > 3.95 && g < 4.5) || (g > 8.4 && g < 9.3) || (g > 17.5 && g < 18.6) || T - chirped < 1.6 || (held && (T % 5.3) < 1.2);
      const first = g > .4 && g < 1.2, hopping = first || (g > 7 && g < 7.8) || (T % 3.7) < .9;
      B.root.position.y = birdY + (first ? hop(g - .4, .4, .009) : hopping ? hop(T, .36, .007) : 0);
      for (const at of [.42, .82]) if (g > at && g < at + .3 && kit.once(`hop${at}`)) kit.sfx('ting', { volume: .3, rate: 1.7 + at * .3 });
      B.root.position.x = .008 * Math.sin(T * .7);
      B.root.rotation.y = .5 * Math.sin(T * .45) + 1.1 * look;
      B.head.rotation.x = singing ? -.45 : -.08 * Math.sin(T * 2.1);
      B.head.rotation.y = singing ? .15 * Math.sin(T * 5) : .45 * Math.sin(T * 1.3);
      B.jaw.rotation.x = singing ? .55 * Math.abs(Math.sin(T * 22)) : 0;
      if (singing && dt && T - lastNote > .17) {
        lastNote = T; onStage(B.tip, v1);
        notes.emit({ x: v1.x, y: v1.y + .004, z: v1.z, vx: (rng() - .5) * .07, vy: .06 + rng() * .05, vz: .02 + rng() * .02, sway: .02,
          color: ['#ffd166', '#ffffff', '#ff9fb2', '#9be7c4'][(rng() * 4) | 0], size: .024 + rng() * .01, life: 1.8, shape: 'note', spin: (rng() - .5) * 2 });
      }

      /* four little frames appear on the bonsai's branches, and sway */
      set.ornaments.forEach((o, i) => {
        const at = 8.5 + i * .35, k = ease.back(seg(g, at, at + .45));
        o.hang.visible = k > .001; o.hang.scale.setScalar(Math.max(.001, k));
        o.hang.rotation.z = .1 * Math.sin(T * 1.6 + i * 1.7) + .25 * Math.sin(Math.PI * seg(g, at + .3, at + 1.1)) * (i % 2 ? 1 : -1);
        o.hang.rotation.x = .05 * Math.sin(T * 1.2 + i);
        if (g > at + .1 && kit.once(`ornament-sound${i}`)) kit.sfx('ting', { volume: .32, rate: 1 + i * .1 });
        if (g > at + .1 && kit.once(`ornament${i}`)) burst(local(o.hang, 0, -.04, .01, v1), 10, ['#fff1b8', '#ffd27a', '#ffffff']);
      });

      /* the album: stands up on its easel, opens; its pages turn as its photos do; closes and goes */
      const A = set.album, rise = ease.inOut(seg(g, 6.85, 7.5)), open = ease.inOut(seg(g, 7.45, 7.95)) * (1 - ease.inOut(seg(g, 13.0, 13.3)));
      const away = 1 - ease.in(seg(g, 13.35, 13.6));
      A.root.position.set(lerp(.025, .095, rise), set.TABLE_H + lerp(.006, .003, rise) + .035 * Math.sin(Math.PI * rise), lerp(.06, .03, rise));
      A.root.rotation.set(lerp(-Math.PI / 2, -.36, rise), lerp(0, -.12, rise), 0);
      A.root.scale.setScalar(Math.max(.001, lerp(.8, 1, rise) * away)); A.root.visible = away > .002;   // it lies smaller, closed
      A.easel.rotation.x = .72 * rise; A.easel.visible = rise > .05; A.ledge.visible = rise > .5;
      A.hinge.rotation.y = Math.PI * (1 - open);
      if (g > 7.5 && kit.once('album-open-sound')) kit.sfx('sparkle', { volume: .45 });
      if (g > 7.5 && kit.once('album-open')) burst(local(A.root, 0, A.PH * .6, .01, v1), 14, ['#fff1b8', '#ffd27a', '#ffffff'], { spread: .06 });
      if (g > 13.4 && kit.once('album-away')) burst(local(A.root, 0, A.PH * .5, .01, v1), 14, ['#fff1b8', '#ffd27a', '#ffffff'], { spread: .05 });
      const shown = open > .92 && A.root.visible;
      A.photos.forEach(p => { p.root.visible = shown; });
      if (!shown) albumSeen = null; else if (albumSeen === null) albumSeen = T;   // the act turns the photos from the moment they show
      let flip = 0;
      if (shown && kit.photoCount() > 1) { const into = (T - albumSeen) % A.FLIP; flip = seg(into, A.FLIP - .55, A.FLIP - .03); }
      A.leaf.visible = flip > 0 && flip < 1; A.leaf.rotation.y = -Math.PI * ease.inOut(flip);

      /* the cake and the buns: on the table, the candles lit; blown out */
      const P = set.party, ck = ease.back(seg(g, 13.7, 14.2)), bk = ease.back(seg(g, 13.85, 14.35));
      P.cake.visible = ck > .001; P.cake.scale.setScalar(Math.max(.001, ck));
      P.buns.visible = bk > .001; P.buns.scale.setScalar(Math.max(.001, bk));
      if (g > 13.75 && kit.once('party-sound')) kit.sfx('pop', { volume: .5 });
      if (g > 13.75 && kit.once('party')) { burst(local(P.cake, 0, .03, 0, v1), 14, ['#fff1b8', '#ffd27a', '#ffb3c6']); burst(local(P.buns, 0, .02, 0, v1), 14, ['#fff1b8', '#ffd27a', '#ffb3c6']); }
      const out = seg(g, 17.0, 17.3), gust = seg(g, 16.95, 17.25);
      P.flames.forEach((f, i) => {
        const fl = 1 + .12 * Math.sin(T * 17 + i * 2) * Math.sin(T * 7.3 + i), k = (1 - out) * Math.min(1, ck);
        f.flame.visible = k > .01; f.flame.scale.set(k * (1 + .5 * gust), 1.8 * k * fl * (1 - .4 * gust), k);
        f.flame.position.x = f.base.x + .002 * gust * Math.sin(T * 30); f.halo.material.opacity = .85 * k * fl;
        if (g > 17.25 && g < 18.8 && dt && rng() < dt * 5) {
          local(P.cake, f.base.x, f.base.y, f.base.z, v1);
          smoke.emit({ x: v1.x, y: v1.y, z: v1.z, vx: (rng() - .5) * .01, vy: .035 + rng() * .02, sway: .012, color: rng() < .5 ? '#a49a9e' : '#d2cbcf', size: .008, grow: 2.6, life: 1.8, shape: 'glow' });
        }
      });
      if (g > 16.95 && kit.once('blow')) kit.sfx('blow', { volume: .6 });
      if (g > 17.3 && kit.once('applause')) kit.sfx('applause', { volume: .6 });
      if (g > 17.5 && kit.once('lanterns')) kit.sfx('sparkle', { volume: .5 });
      if (g > 16.95 && g < 17.35 && dt) for (let k = 0; k < 2; k++) {     // his breath, across to the candles
        onStage(mouth, v1); local(P.cake, 0, .05, 0, v2).sub(v1).normalize();
        puffs.emit({ x: v1.x, y: v1.y, z: v1.z, vx: v2.x * .4 + (rng() - .5) * .04, vy: v2.y * .4, vz: v2.z * .4 + (rng() - .5) * .04, drag: .6, color: '#ffffff', size: .007, grow: 2.2, life: .55, shape: 'glow' });
      }
      if (g > 17.3 && kit.once('confetti')) {
        local(P.cake, 0, .06, .03, v1);                                // up and out towards us, not through him
        confetti.burst(56, () => ({ x: v1.x + (rng() - .5) * .04, y: v1.y, z: v1.z + rng() * .03, vx: (rng() - .5) * .5, vy: .45 + rng() * .4, vz: .06 + rng() * .26, gravity: -.7, drag: 1.1,
          color: ['#e0312f', '#f2b632', '#ff8fab', '#5aa04c', '#ffffff', '#2f56a8'][(rng() * 6) | 0], size: .012 + rng() * .008, life: 3.2, shape: rng() < .7 ? 'petal' : 'star', spin: (rng() - .5) * 8, floor: set.FLOOR + .002 }));
      }

      /* the banner: two balloons pop up and the right one carries it open */
      const Bn = set.banner, appear = ease.back(seg(g, 18.15, 18.45)), unroll = ease.inOut(seg(g, 18.35, 19.3));
      Bn.root.visible = appear > .001; Bn.root.scale.setScalar(Math.max(.001, appear)); Bn.unroll(unroll);
      Bn.root.position.set(0, .54 + .006 * Math.sin(T * 1.3), -.02); Bn.root.rotation.set(-.08, 0, .015 * Math.sin(T * 1.1));

      /* the gift box: the lid flies open and the first photo flies out in its frame, up over the banner */
      const G = set.gift, Hr = set.hero, lidK = ease.out(seg(g, 17.45, 17.7)), fly = seg(g, 17.55, 18.45), k = ease.inOut(fly);
      G.lid.rotation.x = -1.95 * lidK;
      Hr.root.visible = fly > 0;
      if (fly > 0) {
        local(G.root, 0, .05, 0, v1); v2.set(.02, .74, -.12);              // out of the box; its place in the sky
        Hr.root.position.copy(v1).lerp(v2, k); Hr.root.position.y += .12 * Math.sin(Math.PI * k) + .007 * Math.sin(T * 1.5) * k;
        Hr.root.scale.setScalar(Math.max(.001, lerp(.2, 1, ease.out(fly))));
        Hr.root.rotation.set(-.2 * k, (1 - k) * set.GIFT.turn, (1 - k) * .5 * Math.sin(fly * 9) + .02 * Math.sin(T * 1.1) * k);
        if (fly < 1 && dt && rng() < dt * 30) sparks.emit({ x: Hr.root.position.x + (rng() - .5) * .06, y: Hr.root.position.y - .05 * k, z: Hr.root.position.z, vy: -.03,
          color: ['#fff1b8', '#ffd27a', '#ffffff'][(rng() * 3) | 0], size: .016, life: .6, shape: rng() < .5 ? 'sparkle' : 'star', spin: 4 });
      }
      if (g > 17.45 && kit.once('gift-sound')) kit.sfx('pop', { volume: .55, rate: .9 });
      if (g > 17.45 && kit.once('gift')) {
        local(G.root, 0, .07, 0, v1);
        confetti.burst(40, () => ({ x: v1.x, y: v1.y, z: v1.z, vx: (rng() - .5) * .35, vy: .35 + rng() * .3, vz: (rng() - .5) * .25, gravity: -.7, drag: 1.1,
          color: ['#e0312f', '#f2b632', '#ff8fab', '#ffffff'][(rng() * 4) | 0], size: .012 + rng() * .006, life: 2.8, shape: rng() < .6 ? 'petal' : 'star', spin: (rng() - .5) * 8, floor: set.FLOOR + .002 }));
        burst(v1, 18, ['#fff1b8', '#ffd27a', '#ffffff'], { spread: .06 });
      }
      if (g > 18.45 && kit.once('hero-landed')) burst(v1.copy(Hr.root.position), 26, ['#fff1b8', '#ffd27a', '#ffffff', '#ffb3c6'], { spread: .2, size: .02, life: 1 });

      /* red lanterns rise round the courtyard, on and on while the last stop waits */
      set.lanterns.forEach((l, i) => {
        const age = t3 - (4.5 + i * .42), life = 6.2, a = age < 0 ? -1 : age % (life + .6), show = a >= 0 && a < life;
        l.root.visible = show;
        if (!show) return;
        const [x, y, z] = LAUNCH[i];
        l.root.position.set(x + .014 * Math.sin(a * 1.4 + i), y + .075 * a, z - .01 * a);
        l.root.scale.setScalar(Math.max(.001, ease.back(Math.min(1, a / .4)) * (1 - ease.in(seg(a, life - .7, life)))));
        l.root.rotation.z = .1 * Math.sin(a * 1.7 + i); l.halo.material.opacity = .6 + .15 * Math.sin(T * 6 + i);
      });

      /* what he says */
      bubbleAt(bubbles.me, seg(g, 4.4, 4.7) * (1 - seg(g, 5.3, 5.55)), overHead(v1));
      bubbleAt(bubbles.then, seg(g, 9.9, 10.2) * (1 - seg(g, 11.1, 11.35)), overHead(v1));
      bubbleAt(bubbles.thanks, seg(g, 19.0, 19.3), overHead(v1));

      /* a tap on him: a chuckle and a twinkle; on the cage: a song */
      if (chuckle && kit.once(`poke-sound${poked.toFixed(3)}`)) kit.sfx('pop', { volume: .4, rate: 1.3 });
      if (chuckle && kit.once(`poke${poked.toFixed(3)}`)) burst(overHead(v1), 14, ['#fff1b8', '#ffd27a', '#ffffff'], { spread: .05 });
      if (T - chirped < .1 && kit.once(`chirp${chirped.toFixed(3)}`)) { kit.sfx('ting', { volume: .35, rate: 2 }); onStage(B.tip, v1); notes.burst(6, () => ({ x: v1.x, y: v1.y, z: v1.z, vx: (rng() - .5) * .15, vy: .08 + rng() * .08, sway: .02, color: '#ffd166', size: .02, life: 1.5, shape: 'note' })); }

      /* bougainvillea petals drift down from the pergola now and then */
      if (dt && rng() < dt * .9) confetti.emit({ x: -.46 + rng() * .2, y: .43, z: -.2 + rng() * .3, vy: -.03, sway: .03, color: ['#d61f7f', '#e8409a'][(rng() * 2) | 0],
        size: .009, life: 6, shape: 'petal', spin: 1.5, floor: set.FLOOR + .002 });

      [notes, steam, sparks, smoke, confetti, puffs].forEach(p => p.update(dt, T));
    }
  };
};
