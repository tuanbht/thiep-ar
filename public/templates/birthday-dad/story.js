/* Sinh nhật Bố, told by the shared act _acts/lovestory.js in the living room of set.js. Four chapters, each ending at a
   stop (the next tap plays on; after the last, the letter):
     1 ·  0–7     Bố về nhà: the room is dark but for the floor lamp. The door opens and Bố comes in from work, tired, his
                  briefcase in his hand; he sets it down by the sofa ("Haizz…"), sees the children's sticky note over the
                  light switch (slot note) and reaches for the switch: the stop holds his hand on it, so the tap that plays
                  on is the one that switches the light on
     2 ·  7–14    Bất ngờ!: click. The lights pop on, confetti bursts, a line of four photo pennants unrolls across the
                  bookshelf and the TV switches on to the photos, turning every second, under the caption (slot tv). He
                  jumps back with his hands up ("Ôi trời!"), laughs and claps, and comes to the middle of the rug, clapping
     3 ·  14–21   Điệu nhảy của Bố: a disco ball comes down (he looks up at it) and throws spots of colour round the room;
                  he does his proud dad dance ("Bố vẫn còn phong độ!") while the three family photos swing to the beat
     4 ·  21–28   Bánh kem & lời chúc: a three-tier cake appears on the coffee table; he leans in and blows the candles
                  out; a big trophy rises with the first photo on its cup (slot plate on its plinth) and the banner (slot
                  banner) rises over the room; he cheers
   A tap on Bố: he flexes ("Bố vẫn khỏe!"). A tap on a photo shows it big (the act does that). Sound (template.json
   "sound", the shared templates/_sounds): the music box while the room is dark, the party tune from the surprise on, and
   an effect for each moment. Everything follows g, the story's clock (it holds still at a stop). */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, lerp, clamp, rng } = kit;
  const H = .32, STRIDE = .1 * H / .3;                               // Bố's height (1.80 m) in card widths; Walking_A at speed 1, a second
  const SECONDS = [7, 7, 7, 7];                                       // the chapters start at g 0, 7, 14 and 21
  const TAU = Math.PI * 2;
  const DIM = { hemi: new THREE.Color('#7f86c9'), ground: new THREE.Color('#2a2238'), sun: new THREE.Color('#aab4ff') };   // evening blue round the lamp
  const LIT = { hemi: new THREE.Color('#fff4ec'), ground: new THREE.Color('#d9a9b4'), sun: new THREE.Color('#fff2e2') };
  const PARTY = { hemi: new THREE.Color('#d9c4ff'), ground: new THREE.Color('#6a3a5a'), sun: new THREE.Color('#ffd0e8') };
  let set, dad, mouth, bubbles, banner, hearts, sparks, smoke, puffs, confetti, notes;
  let poked = -9, now = 0, interact = null, soles = [];

  /* ── where he goes ── */
  let HALL, DROP, REACH, JUMP, DANCE, FACE_WALL, FACE_ROOM;
  /** a path through points, measured: where s along it is, and which way it runs there */
  function path(pts) {
    const P = pts.map(p => new THREE.Vector2(p[0], p[1])), L = [0];
    for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
    return {
      length: L[L.length - 1],
      at(s) {
        let i = 1; while (i < P.length - 1 && L[i] < s) i++;
        const a = P[i - 1], b = P[i], k = clamp((s - L[i - 1]) / (L[i] - L[i - 1] || 1));
        return [lerp(a.x, b.x, k), lerp(a.y, b.y, k), Math.atan2(b.x - a.x, b.y - a.y)];
      }
    };
  }
  const bezier = (a, c, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; });
  let IN, TO_DANCE;
  /** a walk along a path between g0 and g1 at an even pace, easing in and out over its first and last .35 s: where he is,
      which way he goes, and Walking_A's speed for that pace (so the feet do not slide) */
  function walk(g, g0, g1, p) {
    const r = .35, v = p.length / (g1 - g0 - 2 * r + 2 * r / 3), e = v * r / 3;
    const s = tween(g, [[g0, 0], [g0 + r, e, 'in'], [g1 - r, p.length - e, 'linear'], [g1, p.length, 'out']]);
    const [x, z, heading] = p.at(s), ramp = Math.min(1, seg(g, g0, g0 + r), 1 - seg(g, g1 - r, g1)) ** 2;
    return { x, z, heading, speed: Math.max(.3, v * ramp / STRIDE) };
  }
  const turnTo = (a, b, k) => a + (((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI) * k;
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  /** how much the room swings to the beat: from the dance's start until the cake */
  const beatOf = g => ease.smooth(seg(g, 15.25, 15.6)) * (1 - ease.smooth(seg(g, 21, 21.4)));
  /* [from g, clip, options]: a chapter's last clip runs on through its stop */
  const CLIPS = [
    [0, 'Idle'], [.75, 'Walking_A'], [3.3, 'PickUp', { once: true, speed: 1.9, fade: .25 }], [4.62, 'Idle', { fade: .35 }],
    [5.55, 'Walking_A', { fade: .25 }], [6.05, 'Interact', { once: true, fade: .3 }],
    [7.05, 'Idle', { fade: .25 }], [8.7, 'Clap', { fade: .3 }], [9.75, 'Walking_A', { fade: .3 }], [12.66, 'Clap', { fade: .18 }],
    [14.05, 'Idle', { fade: .4 }], [15.3, 'Dance_A', { fade: .35 }], [17.3, 'Dance_B', { fade: .45 }],
    [21.05, 'Idle', { fade: .5 }]
  ];
  const DROP_AT = 3.3 + 1.2 / 1.9;                                  // PickUp's hand is lowest 1.2 s into the clip
  const PRESS = .74;                                                 // Interact's hand is furthest out .74 s in: held there

  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(), qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qS = new THREE.Quaternion();
  const eA = new THREE.Euler();
  const onStage = (o, out) => stage.worldToLocal(o.getWorldPosition(out));
  /** where his mouth is on the stage */
  const mouthAt = out => (mouth ? onStage(mouth, out) : out.set(dad.root.position.x, H * .85, dad.root.position.z));
  const flameAt = (i, out) => out.copy(set.cake.flames[i].at).add(set.cake.root.position);

  /** the briefcase in his right fist, upright, turned with him, its handle in the fist; it stops at the floor */
  function carry(heading) {
    const slot = dad.node('handslot.r'); if (!slot || set.briefcase.parent !== slot) return;
    dad.root.updateMatrixWorld(true);
    onStage(slot, vA);
    vA.y = Math.max(vA.y + .002, set.FLOOR + set.CASE.grip + set.CASE.h);
    eA.set(0, heading + Math.PI / 2, 0); qA.setFromEuler(eA);       // its long side along the way he faces
    stage.localToWorld(vB.copy(vA)); slot.worldToLocal(vB); set.briefcase.position.copy(vB);
    stage.getWorldQuaternion(qS); slot.getWorldQuaternion(qB);
    set.briefcase.quaternion.copy(qB.invert().multiply(qS).multiply(qA));
  }
  /** no shoe below the floor: a blend out of a step can tip a toe down through it, so lift him by what went under */
  function keepFeetUp() {
    dad.root.updateMatrixWorld(true);
    let low = Infinity;
    for (const [o, i] of soles) { o.getVertexPosition(i, vC); vC.applyMatrix4(o.matrixWorld); stage.worldToLocal(vC); if (vC.y < low) low = vC.y; }
    if (low < set.FLOOR - .0004) dad.root.position.y += set.FLOOR - .0004 - low;
  }
  /** the case set down where it is, standing on the floor */
  function putDown() {
    stage.attach(set.briefcase);
    set.briefcase.position.y = set.FLOOR + set.CASE.grip + set.CASE.h;
    eA.setFromQuaternion(set.briefcase.quaternion, 'YXZ'); set.briefcase.rotation.set(0, eA.y, 0);
  }

  /** a speech bubble, always facing the phone */
  function bubble(text, o = {}) {
    const pic = kit.picture((c, px) => {
      const w = px * .94, h = px * (o.tall ?? .46), x = (px - w) / 2, y = px * .12;
      c.fillStyle = '#ffffff'; c.strokeStyle = '#7a2a45'; c.lineWidth = px * .018;
      c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, h * .32) : c.rect(x, y, w, h); c.fill(); c.stroke();
      const tx = px * (o.tail ?? .3);
      c.beginPath(); c.moveTo(tx - px * .05, y + h - px * .01); c.lineTo(tx - px * .07, y + h + px * .13); c.lineTo(tx + px * .08, y + h - px * .01); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(tx - px * .045, y + h - px * .03, px * .115, px * .04);
      c.fillStyle = o.ink ?? '#e8436d'; kit.fitText(c, text, { x: x + px * .05, y: y + px * .02, w: w - px * .1, h: h - px * .04 }, { maxLines: 2, max: px * .16 });
    }, { size: o.size ?? .16, px: 512 });
    pic.visible = false; stage.add(pic);
    return pic;
  }
  /** a bubble over his head between g0 and g1 (popping in and out) */
  function showBubble(b, g, g0, g1, T, o = {}) {
    const k = ease.back(seg(g, g0, g0 + .3)) * (1 - ease.in(seg(g, g1 - .25, g1)));
    b.visible = k > .002;
    if (!b.visible) return;
    const head = dad.node('head');
    if (head) onStage(head, vC); else vC.set(dad.root.position.x, H, dad.root.position.z);
    b.position.set(vC.x + (o.dx ?? .07), vC.y + (o.dy ?? .085) + .004 * Math.sin(T * 2.2), vC.z + .02);
    b.scale.setScalar(Math.max(.001, (o.size ?? .16) * k));
    if (kit.once(`bubble-${g0}`)) kit.sfx('pop', { volume: .3, rate: 1.4 });
  }

  return {
    seconds: SECONDS,

    build() {
      set = window.NM_BDAY_DAD_SET(kit);
      const W = set.WZ, S = set.SWITCH;
      HALL = [(set.DOOR.x0 + set.DOOR.x1) / 2 + .005, W - .06];
      DROP = [S.x + .076, W + .113];                                    // where he sets the case down, facing the sofa
      REACH = [S.x + .01, W + .122];                                   // his fingertips on the switch, facing the wall
      JUMP = [S.x + .005, W + .21];                                    // where the fright lands him: straight back, clear of the case
      DANCE = [set.TABLE.x, set.TABLE.z - .135];
      FACE_WALL = Math.PI; FACE_ROOM = .42;
      const IN0 = [HALL[0], W + .04];                                  // straight through the doorway, then round to the sofa
      IN = path([HALL, ...bezier(IN0, [HALL[0] + .01, W + .14], DROP)]);
      TO_DANCE = path(bezier(JUMP, [JUMP[0] + .12, JUMP[1] + .07], DANCE));

      dad = kit.model('dad').fit({ height: H }); stage.add(dad.root);
      dad.root.updateMatrixWorld(true);                                 // the undersides of his shoes, in the pose he was fitted in
      const all = [];
      dad.scene.traverse(o => {
        if (!o.isSkinnedMesh) return;
        for (let i = 0, n = o.geometry.attributes.position.count; i < n; i++) { o.getVertexPosition(i, vA).applyMatrix4(o.matrixWorld); dad.root.worldToLocal(vA); all.push([o, i, vA.y]); }
      });
      const lowest = all.reduce((m, a) => Math.min(m, a[2]), Infinity);
      soles = all.filter(a => a[2] < lowest + .0018).map(([o, i]) => [o, i]);
      const head = dad.node('head');
      if (head) { mouth = new THREE.Object3D(); mouth.position.set(0, 2.2, 9.6); head.add(mouth); }   // the head bone's own space is in centimetres
      const hit = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.055, .055, H, 8)), kit.keep(new THREE.MeshBasicMaterial()));
      hit.visible = false; hit.userData.proxy = true; hit.position.y = H / 2; dad.root.add(hit);   // an easy target for a finger
      kit.onTap(hit, () => { poked = now; });

      bubbles = {
        sigh: bubble('Haizz… mệt quá!', { tail: .16 }), huh: bubble('Ủa?', { size: .1, tail: .16 }),
        wow: bubble('Ôi trời!', { size: .15, tail: .16 }), haha: bubble('Ha ha ha!', { size: .15, tail: .16 }),
        groove: bubble('Bố vẫn còn phong độ!', { size: .2, tail: .26 }), thanks: bubble('Bố thương các con!', { size: .2, tail: .26 }),
        strong: bubble('Bố vẫn khỏe!', { size: .15, tail: .3 })
      };
      banner = kit.sign({ text: kit.words('banner', 'Chúc mừng sinh nhật Bố'), style: 'banner', width: .52, accent: '#e8436d', glow: .6 });
      banner.root.visible = false; stage.add(banner.root);

      hearts = kit.particles({ max: 160 });
      sparks = kit.particles({ max: 420, additive: true });
      smoke = kit.particles({ max: 80 });
      puffs = kit.particles({ max: 80, additive: true });
      confetti = kit.particles({ max: 320 });
      notes = kit.particles({ max: 80 });
      stage.add(hearts.root, sparks.root, smoke.root, puffs.root, confetti.root, notes.root);
    },

    reset() {
      [hearts, sparks, smoke, puffs, confetti, notes].forEach(p => p.clear());
      dad.stop(); interact = null;
      set.door.open(0);
      dad.hold(set.briefcase, 'handslot.r');
      set.pennants.forEach(p => { p.hang.visible = false; });
      set.trophy.root.visible = false; set.cake.root.visible = false; banner.root.visible = false;
      poked = -9;
    },

    pose({ chapter, g, T, dt, held }) {
      now = T;
      const on = chapter >= 1;                                       // the first stop holds at g 7 in the dark: the tap is the click
      kit.music(on ? 'music' : 'soft');                              // the music box in the dark, the party from the surprise on

      lights(g, T, on);
      moves(g, T, dt, held && chapter === 0);
      surprise(g, T, dt, on);
      party(g, T, dt);
      cake(g, T, dt, held && chapter === 3);
      finale(g, T, dt, held && chapter === 3);

      /* a tap on him: he flexes */
      const pk = T - poked;
      if (pk < 1.6) {
        const k = Math.sin(Math.PI * clamp(pk / 1.6)) ** .5;
        dad.bend('chest', -.08 * k, 0, 0);
        dad.aim('upperarm.r', [-.95, .25, .15], k); dad.aim('lowerarm.r', [-.15, 1, .3], k);
        dad.aim('upperarm.l', [.95, .25, .15], k); dad.aim('lowerarm.l', [.15, 1, .3], k);
        if (kit.once(`poke${poked.toFixed(3)}`)) {
          kit.sfx('sparkle', { volume: .4 });
          onStage(dad.node('head') || dad.root, vA);
          sparks.burst(16, () => ({ x: vA.x, y: vA.y, z: vA.z, vx: (rng() - .5) * .3, vy: rng() * .2, vz: (rng() - .5) * .1, drag: 1.6, color: ['#ffd36e', '#fff1b8', '#ff8fab'][(rng() * 3) | 0], size: .016, life: .8, shape: rng() < .5 ? 'star' : 'sparkle', spin: 3 }));
        }
      }
      showBubble(bubbles.strong, T, poked + .1, poked + 1.6, T);
      [hearts, sparks, smoke, puffs, confetti, notes].forEach(p => p.update(dt, T));
    }
  };

  /* ── the room's light: the lamp alone in the dark, everything on at the surprise, the party lights for the dance ── */
  function lights(g, T, switched) {
    const on = switched ? ease.out(seg(g, 7.02, 7.16)) * (g < 7.3 ? .75 + .25 * Math.sin(g * 90) ** 2 : 1) : 0;
    const dance = ease.smooth(seg(g, 14.5, 15.4)) * (1 - ease.smooth(seg(g, 21, 21.6)));
    const L = kit.lights;
    L.hemi.color.copy(DIM.hemi).lerp(LIT.hemi, on).lerp(PARTY.hemi, dance);
    L.hemi.groundColor.copy(DIM.ground).lerp(LIT.ground, on).lerp(PARTY.ground, dance);
    L.sun.color.copy(DIM.sun).lerp(LIT.sun, on).lerp(PARTY.sun, dance);
    L.hemi.intensity = lerp(.16, 1.05, on) - .72 * dance; L.sun.intensity = lerp(.05, 1.35, on) - 1.18 * dance;
    const flick = 1 + .04 * Math.sin(T * 9) * Math.sin(T * 5.3);
    set.lamp.light.intensity = lerp(1.1, .45, on) * flick; set.lamp.glow.material.opacity = lerp(.85, .5, on) * flick;
    set.lamp.pool.material.opacity = lerp(.42, .1, on);
    set.hallLight.intensity = .3 * (1 - on);
    set.fairy.forEach((b, i) => b.set(ease.out(seg(g, 7.1 + i * .035, 7.2 + i * .035)) * (.8 + .2 * Math.sin(T * 3 + i * 1.3))));
    set.toggle.set(switched); set.led.material.emissiveIntensity = switched ? 0 : 1.4;
    set.frames.forEach(f => { f.photo.material.emissiveIntensity = lerp(.42, .3, on); });
  }

  /* ── where he is and what he does ── */
  function moves(g, T, dt, waiting) {
    let x, z, heading, speed = null;
    if (g < 3.3) {                                                   // out of the hall, slowly, to the sofa
      const w = walk(g, .75, 3.3, IN);
      x = w.x; z = w.z; heading = g < .75 ? 0 : turnTo(w.heading, Math.PI / 2, ease.inOut(seg(g, 3, 3.3))); speed = w.speed;
    } else if (g < 5.55) {                                           // the case down; a sigh; the note
      [x, z] = DROP; heading = Math.PI / 2 + .25 * ease.inOut(seg(g, 5.1, 5.45));
    } else if (g < 7) {                                              // a step to the switch, the hand up to it
      const k = ease.inOut(seg(g, 5.55, 6.15));
      x = lerp(DROP[0], REACH[0], k); z = lerp(DROP[1], REACH[1], k); heading = turnTo(Math.PI / 2 + .25, FACE_WALL, k); speed = 1.1;   // one step
    } else if (g < 9.75) {                                           // the fright: back off the wall and round to the room
      const k = ease.out(seg(g, 7, 7.5));
      x = lerp(REACH[0], JUMP[0], k); z = lerp(REACH[1], JUMP[1], k); heading = turnTo(FACE_WALL, FACE_ROOM, ease.inOut(seg(g, 7.02, 7.55)));
    } else if (g < 12.6) {                                           // to the middle of the rug, clapping there through the stop
      const w = walk(g, 9.75, 12.6, TO_DANCE);
      x = w.x; z = w.z; heading = turnTo(turnTo(FACE_ROOM, w.heading, ease.inOut(seg(g, 9.75, 10.1))), 0, ease.inOut(seg(g, 12.2, 12.75))); speed = w.speed;
    } else {
      [x, z] = DANCE; heading = 0;
    }
    const hop = g > 7 && g < 7.5 ? .022 * Math.sin(Math.PI * seg(g, 7, 7.45)) : 0;
    dad.root.position.set(x, set.FLOOR + hop, z); dad.root.rotation.y = heading;
    keepFeetUp();
    dad.root.visible = g > .5;                                       // behind the closed door until it opens
    set.door.open(ease.inOut(seg(g, .45, 1.05)) * (1 - ease.inOut(seg(g, 2.9, 3.8))));   // it swings shut behind him
    const c = clipAt(CLIPS, g);
    const a = dad.play(c[1], c[1] === 'Walking_A' && speed ? { ...c[2], speed } : c[2]);
    if (c[1] === 'Interact') {                                       // the hand stays on the switch through the stop
      interact = a;
      if (a && !a.paused && a.time >= PRESS) { a.time = PRESS; a.paused = true; }
    }

    /* the case: in his hand until it touches the floor by the sofa */
    if (g < DROP_AT) { if (set.briefcase.parent === stage) dad.hold(set.briefcase, 'handslot.r'); carry(heading); }
    else if (set.briefcase.parent !== stage) { carry(heading); putDown(); }

    /* gestures: bend the back first, then aim the arms */
    const tired = g < 3.4 ? 1 - seg(g, 3.1, 3.4) : 0;               // shoulders down, head low
    if (tired) { dad.bend('chest', .12 * tired, 0, 0); dad.bend('head', .26 * tired, 0, .04 * Math.sin(T * 1.7) * tired); }
    const sigh = ease.smooth(seg(g, 4.55, 4.85)) * (1 - ease.smooth(seg(g, 5.3, 5.6)));   // a hand on his back: straightening up
    if (sigh) {
      dad.bend('chest', -.16 * sigh, 0, 0); dad.bend('head', -.12 * sigh, 0, 0);
      dad.aim('upperarm.r', [-.42, -.72, -.5], sigh); dad.aim('lowerarm.r', [.8, .2, -.55], sigh);
    }
    const look = ease.inOut(seg(g, 5.05, 5.35)) * (1 - ease.inOut(seg(g, 5.6, 6)));   // up at the note
    if (look) dad.bend('head', -.22 * look, .55 * look, 0);
    const fright = ease.out(seg(g, 7.02, 7.22)) * (1 - ease.inOut(seg(g, 8.35, 8.75)));   // hands up!
    if (fright) {
      const shake = .05 * Math.sin(T * 34);
      dad.bend('chest', -.14 * fright, 0, 0); dad.bend('head', -.1 * fright, 0, 0);
      dad.aim('upperarm.r', [-.46, .8 + shake, .32], fright); dad.aim('lowerarm.r', [-.1, 1, .25], fright);
      dad.aim('upperarm.l', [.46, .8 - shake, .32], fright); dad.aim('lowerarm.l', [.1, 1, .25], fright);
    }
    const laugh = ease.smooth(seg(g, 8.4, 8.7)) * (1 - ease.smooth(seg(g, 9.5, 9.85)));   // head back, shoulders bouncing
    if (laugh) { dad.bend('chest', (-.08 + .05 * Math.sin(T * 22)) * laugh, 0, 0); dad.bend('head', -.3 * laugh, 0, 0); }
    const up = ease.inOut(seg(g, 14.15, 14.55)) * (1 - ease.inOut(seg(g, 15.05, 15.4)));   // up at the disco ball coming down
    if (up) dad.bend('head', -.38 * up, 0, 0);
    if (((g > 8.7 && g < 9.7) || (g > 12.6 && g < 14.2)) && dt && rng() < dt * 5) hearts.emit({ x: x + (rng() - .5) * .08, y: H * .8, z: z + .03, vy: .1, sway: .03, color: ['#ff8fab', '#ffd36e'][(rng() * 2) | 0], size: .016, life: 1.5, shape: 'heart' });

    showBubble(bubbles.sigh, g, 4.55, 5.25, T, { dx: .2, dy: .03 });      // to his right: the note over his left stays clear
    showBubble(bubbles.huh, g, 5.3, 6.05, T, { dx: .15, dy: .05 });
    showBubble(bubbles.wow, g, 7.15, 8.45, T, { dx: .16, dy: 0 });
    showBubble(bubbles.haha, g, 8.5, 9.8, T, { dx: .16, dy: 0 });
    showBubble(bubbles.groove, g, 17.5, 20.6, T, { dx: .12, dy: .14 });   // over the TV's top edge, not its picture
    if (g > DROP_AT && kit.once('case-down')) kit.sfx('pop', { volume: .35, rate: .5 });
    if (g > .5 && kit.once('door')) kit.sfx('door', { volume: .55 });
    if (waiting && interact && !interact.paused) { interact.time = PRESS; interact.paused = true; }
  }

  /* ── chapter 2: click, lights, confetti, the pennants, the TV ── */
  function surprise(g, T, dt, switched) {
    if (switched && kit.once('click')) {
      kit.sfx('ting', { volume: .5, rate: 1.6 });
      vA.set(set.SWITCH.x, set.SWITCH.y, set.WZ + .01);
      sparks.burst(14, () => ({ x: vA.x, y: vA.y, z: vA.z, vx: (rng() - .5) * .25, vy: (rng() - .3) * .25, vz: rng() * .1, drag: 2, color: '#fff3c4', size: .014, life: .5, shape: 'sparkle', spin: 4 }));
    }
    if (g > 7.06 && kit.once('surprise')) {
      kit.sfx('horn', { volume: .6 }); kit.sfx('pop', { volume: .5 });
      for (const [cx, dir] of [[-.5, 1], [.55, -1]]) confetti.burst(70, () => ({ x: cx, y: .5, z: .05, vx: dir * (.25 + rng() * .5), vy: .1 + rng() * .45, vz: (rng() - .3) * .3, gravity: -.55, drag: 1, sway: .03,
        color: ['#ff6f91', '#ffd27a', '#8fd0bd', '#c5a3ff', '#ffffff', '#6fc3ff'][(rng() * 6) | 0], size: .012 + rng() * .01, life: 3.2, shape: rng() < .5 ? 'petal' : 'star', spin: (rng() - .5) * 9, floor: set.FLOOR + .003 }));
      confetti.burst(60, () => ({ x: (rng() - .5) * .8, y: .75 + rng() * .1, z: -.1 + rng() * .3, vx: (rng() - .5) * .1, vy: -.05, gravity: -.25, drag: 1.2, sway: .05,
        color: ['#ff6f91', '#ffd27a', '#8fd0bd', '#c5a3ff', '#ffffff'][(rng() * 5) | 0], size: .012 + rng() * .008, life: 3.6, shape: 'petal', spin: (rng() - .5) * 6, floor: set.FLOOR + .003 }));
    }
    if (g > 7.2 && kit.once('surprise-sparkle')) kit.sfx('sparkle', { volume: .5 });

    /* the pennants: the string, then one by one they drop open */
    set.pennantString.visible = set.pins[0].visible = set.pins[1].visible = g > 7.35;
    set.pennants.forEach((p, i) => {
      const t0 = 7.45 + i * .38, k = seg(g, t0, t0 + .6);
      p.hang.visible = g > t0;
      p.flap.rotation.x = -1.5 * (1 - ease.elastic(k));
      p.flap.rotation.z = .03 * Math.sin(T * 1.6 + i * 1.7) + .06 * beatOf(g) * Math.sin(TAU * T / 1.07 + i);
      p.flap.scale.setScalar(Math.max(.001, ease.out(Math.min(1, k * 3))));
      if (g > t0 + .1 && kit.once(`pennant${i}`)) {
        kit.sfx('pop', { volume: .3, rate: 1.1 + i * .12 });
        p.hang.getWorldPosition(vA); stage.worldToLocal(vA);
        sparks.burst(8, () => ({ x: vA.x, y: vA.y - .05, z: vA.z + .01, vx: (rng() - .5) * .16, vy: (rng() - .5) * .16, drag: 1.5, color: '#fff1b8', size: .013, life: .7, shape: 'sparkle', spin: 3 }));
      }
    });

    /* the TV: a flash across the glass, then the photos, the caption and the TRỰC TIẾP sign */
    const tv = set.tv, fl = seg(g, 7.9, 8.25);
    tv.flash.material.opacity = g > 7.9 && g < 8.3 ? Math.sin(Math.PI * fl) : 0;
    tv.flash.scale.y = Math.max(.02, Math.sin(Math.PI * fl) ** 2);
    tv.off.material.opacity = 1 - ease.smooth(seg(g, 8.05, 8.4));
    tv.off.visible = tv.off.material.opacity > .01;
    const cap = ease.back(seg(g, 8.35, 8.7));
    tv.caption.visible = cap > .002; tv.caption.scale.set(1, Math.max(.001, cap), 1);
    tv.live.visible = g > 8.5 && (g > 9.2 || Math.sin(g * 25) > 0);
    tv.light.intensity = .7 * (1 - tv.off.material.opacity) * (1 + .1 * Math.sin(T * 6));
    if (g > 7.92 && kit.once('tv-on')) kit.sfx('ting', { volume: .35, rate: .7 });
  }

  /* ── chapter 3: the disco ball, the spots, the swinging photos ── */
  function party(g, T, dt) {
    const down = ease.out(seg(g, 14, 15.4)) * (1 - ease.inOut(seg(g, 21, 21.7)));
    const k = ease.smooth(seg(g, 14.9, 15.5)) * (1 - ease.smooth(seg(g, 21, 21.4)));
    vA.set(DANCE[0], lerp(1.3, .6, down), -.03);
    set.disco.at(vA, T * 1.1, k, down > .001);
    set.disco.lights.forEach((l, i) => {
      const a = T * 1.6 + i * Math.PI;
      l.position.set(DANCE[0] + Math.cos(a) * .32, .3, .08 + Math.sin(a) * .12); l.intensity = .8 * k;   // round the room, clear of the wall
    });
    if (g > 14.05 && kit.once('disco')) kit.sfx('ting', { volume: .45, rate: .8 });
    if (g > 15.1 && kit.once('disco-on')) kit.sfx('sparkle', { volume: .55 });
    const beat = beatOf(g);                                          // to the party tune's beat (112 a minute: two a swing), on through the stop
    set.frames.forEach((f, i) => { f.swing.rotation.z = beat * .16 * Math.sin(TAU * T / 1.07 + (i % 2) * Math.PI); });
    if (beat && dt && rng() < dt * 4) {
      const x = dad.root.position.x, z = dad.root.position.z;
      notes.emit({ x: x + (rng() - .5) * .2, y: .2 + rng() * .1, z: z + .02, vy: .07, sway: .04, color: ['#ff8fab', '#ffd36e', '#8fd0bd', '#c5a3ff'][(rng() * 4) | 0], size: .022, life: 1.8, shape: 'note' });
    }
  }

  /* ── chapter 4: the cake and the candles ── */
  function cake(g, T, dt, held) {
    const C = set.cake, pop = ease.back(seg(g, 21.15, 21.6));
    C.root.visible = g > 21.15; C.root.scale.setScalar(Math.max(.001, pop));
    if (g > 21.2 && kit.once('cake')) {
      kit.sfx('sparkle', { volume: .5 });
      sparks.burst(24, () => ({ x: C.root.position.x + (rng() - .5) * .12, y: C.root.position.y + .05 + rng() * .08, z: C.root.position.z + (rng() - .5) * .1,
        vx: (rng() - .5) * .2, vy: .1 + rng() * .15, drag: 1.5, color: ['#fff3c4', '#ffd1dc', '#ffffff'][(rng() * 3) | 0], size: .016, life: .9, shape: rng() < .5 ? 'sparkle' : 'star', spin: 3 }));
    }
    let lit = 0;
    C.flames.forEach((f, i) => {
      const on = ease.out(seg(g, 21.6 + i * .1, 21.72 + i * .1)), out = seg(g, 22.62 + i * .04, 22.7 + i * .04), k = on * (1 - out);
      lit += k; f.set(k, T);
      if (on > .2 && kit.once(`light${i}`)) kit.sfx('ting', { volume: .25, rate: 1.2 + i * .08 });
      if (out > 0 && kit.once(`out${i}`)) {
        flameAt(i, vA);
        smoke.burst(5, () => ({ x: vA.x, y: vA.y + .005, z: vA.z, vx: (rng() - .5) * .02, vy: .04 + rng() * .03, sway: .012, color: rng() < .5 ? '#cfc8d6' : '#a89fb2', size: .01, grow: 2.2, life: 1.4, shape: 'glow' }));
        sparks.burst(8, () => ({ x: vA.x, y: vA.y, z: vA.z, vx: (rng() - .5) * .3, vy: .05 + rng() * .2, vz: (rng() - .5) * .3, drag: 1.6, gravity: -.1,
          color: ['#ffe7a3', '#fff6dc', '#ffc2d4'][(rng() * 3) | 0], size: .012 + rng() * .008, life: .9, shape: rng() < .6 ? 'sparkle' : 'star', spin: 4 }));
      }
    });
    C.light.intensity = .5 * lit * (1 + .08 * Math.sin(T * 17));

    /* he leans in over the cake and blows: a puff from his mouth to the flames */
    const lean = ease.inOut(seg(g, 21.95, 22.4)) * (1 - ease.inOut(seg(g, 22.95, 23.4)));
    if (lean) {
      dad.bend('spine', .34 * lean, 0, 0); dad.bend('Spine02', .26 * lean, 0, 0); dad.bend('head', -.18 * lean, 0, 0);
      dad.aim('upperarm.r', [-.28, -.86, -.42], lean); dad.aim('lowerarm.r', [.72, -.25, -.65], lean);
      dad.aim('upperarm.l', [.28, -.86, -.42], lean); dad.aim('lowerarm.l', [-.72, -.25, -.65], lean);
    }
    if (g > 22.45 && g < 23 && kit.once('blow')) kit.sfx('blow', { volume: .7 });
    if (g > 22.48 && g < 22.75 && dt) {
      mouthAt(vA); flameAt(2, vB);
      for (let i = 0; i < 3; i++) puffs.emit({ x: vA.x + (rng() - .5) * .006, y: vA.y, z: vA.z + (rng() - .5) * .006, vx: (vB.x - vA.x) / .28 + (rng() - .5) * .05, vy: (vB.y - vA.y) / .28 + (rng() - .5) * .03,
        vz: (vB.z - vA.z) / .28 + (rng() - .5) * .05, drag: .5, color: '#e6f4ff', size: .006 + rng() * .006, grow: 1.4, life: .36, shape: 'glow' });
    }
    if (g > 22.85 && kit.once('applause')) {
      kit.sfx('applause', { volume: .6 });
      confetti.burst(80, () => ({ x: C.root.position.x + (rng() - .5) * .1, y: .25, z: C.root.position.z, vx: (rng() - .5) * .6, vy: .3 + rng() * .4, vz: (rng() - .5) * .4, gravity: -.6, drag: 1.1,
        color: ['#ff6f91', '#ffd27a', '#8fd0bd', '#c5a3ff', '#ffffff'][(rng() * 5) | 0], size: .012 + rng() * .01, life: 2.6, shape: rng() < .5 ? 'petal' : 'star', spin: (rng() - .5) * 8, floor: set.FLOOR + .003 }));
    }
    if (held && dt && rng() < dt * 1.5) hearts.emit({ x: (rng() - .5) * .5 - .05, y: .3, z: .05, vy: .07, sway: .03, color: '#ff8fab', size: .018, life: 2.4, shape: 'heart' });
  }

  /* ── chapter 4: the trophy, the banner, his cheer ── */
  function finale(g, T, dt, held) {
    const tr = set.trophy, k = ease.back(seg(g, 23.2, 24));
    tr.root.visible = g > 23.2; tr.root.scale.setScalar(Math.max(.001, k));
    tr.root.position.y = set.FLOOR + .03 * Math.sin(Math.PI * seg(g, 23.2, 24));
    const face = clamp(set.yawToPhone(set.TROPHY.x, set.TROPHY.z, -.2), -.38, .38);   // turned to the phone, but not back into the TV
    tr.root.rotation.y = turnTo(1.4, face, ease.out(seg(g, 23.2, 24)));
    tr.halo.material.opacity = .6 * ease.out(seg(g, 23.6, 24.4)) * (1 + .12 * Math.sin(T * 2.6));
    tr.star.emissiveIntensity = .6 + .8 * (.5 + .5 * Math.sin(T * 4));
    if (g > 23.25 && kit.once('trophy')) {
      kit.sfx('sparkle', { volume: .6 }); kit.sfx('pop', { volume: .4, rate: .8 });
      sparks.burst(36, () => { const a = rng() * TAU; return { x: set.TROPHY.x + Math.cos(a) * .12, y: .2 + Math.sin(a) * .12, z: set.TROPHY.z + .04, vx: Math.cos(a) * .2, vy: Math.sin(a) * .2, drag: 1.5,
        color: ['#fff1b8', '#ffd36e', '#ffffff'][(rng() * 3) | 0], size: .018, life: 1, shape: rng() < .5 ? 'sparkle' : 'star', spin: 3 }; });
    }
    if (k > .9 && dt && rng() < dt * 4) { const a = rng() * TAU; sparks.emit({ x: set.TROPHY.x + Math.cos(a) * .11, y: .2 + Math.sin(a) * .1, z: set.TROPHY.z + .06, vy: .02, color: '#fff1b8', size: .013, life: .9, shape: 'sparkle', spin: 3 }); }

    const bn = ease.elastic(seg(g, 24, 25));
    if (g > 24.02 && kit.once('banner')) kit.sfx('horn', { volume: .5 });
    banner.root.visible = bn > .001; banner.root.scale.setScalar(Math.max(.001, bn));
    banner.root.position.set(-.1, lerp(.6, .835, ease.out(seg(g, 24, 24.8))) + .005 * Math.sin(T * 1.4), -.2); banner.root.rotation.set(-.06, 0, .02 * Math.sin(T * 1.1));

    const cheer = ease.smooth(seg(g, 24.55, 24.85));                 // both arms up, hands waving, through the stop
    if (cheer) {
      const wave = .14 * Math.sin(T * 8);
      dad.aim('upperarm.r', [-.5, .84, .14], cheer); dad.aim('lowerarm.r', [-.28 + wave, 1, .12], cheer);
      dad.aim('upperarm.l', [.5, .84, .14], cheer); dad.aim('lowerarm.l', [.28 + wave, 1, .12], cheer);
    }
    showBubble(bubbles.thanks, g, 25.2, 1e9, T, { dx: .1, dy: .1 });
  }
};
