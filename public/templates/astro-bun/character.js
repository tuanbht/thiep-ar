/* Astro Bun: a chubby bunny astronaut in a white suit with orange trim, a glass bubble helmet its long ears poke out of,
   and a little orange jetpack with a blinking antenna. Its trick: a jetpack backflip. The act around it (pop, hello, lap,
   dance, trick, cheer, letter) is templates/_acts/showtime.js; this file only builds the character and poses its parts.
   Units: about 1.2 tall with the ears up; the act scales it to template.json "height". */
(window.NM_CHARACTERS = window.NM_CHARACTERS || {})[document.currentScript.src] = (THREE, kit) => {
  const { ball, cyl, cone, box, torus, eye, blush, pivot, at, rot, scl, wave, ease, seg, clamp, lerp } = kit;
  const SUIT = 0xf1f3ff, FUR = 0xffffff, ORANGE = 0xff6a10, TEAL = 0x16b3ac, YELLOW = 0xffd23f, PINK = 0xffa9c4,
    NOSE = 0xff6f91, GREY = 0x5d6382, INK = 0x2b2440;

  // lighter shapes for the small parts (the kit's are made for big, round ones)
  const lo = (geo, color, line) => { const m = new THREE.Mesh(geo, kit.toon(color)); return line ? kit.outline(m, line) : m; };
  const dot = (r, color, sx = 1, sy = sx, sz = sx, line = 0, seg = 16) => scl(lo(new THREE.SphereGeometry(r, seg, seg * .75), color, line), sx, sy, sz);
  const pill = (r, len, color, line) => lo(new THREE.CapsuleGeometry(r, len, 5, 16), color, line);
  const ring = (r, tube, color, arc = Math.PI * 2, seg = 20) => lo(new THREE.TorusGeometry(r, tube, 6, seg, arc), color, 0);

  const group = new THREE.Group();
  const hop = pivot(0, 0, 0);                                        // the whole bunny: lifted off the card for bounds and floats
  // stubby legs, hinged at the hip inside the suit: a negative x turn swings the boot forward
  const legL = pivot(-.105, .15, 0), legR = pivot(.105, .15, 0);
  legL.add(at(dot(.1, ORANGE, 1, .72, 1.3, .016, 20), 0, -.077, .03)); legR.add(at(dot(.1, ORANGE, 1, .72, 1.3, .016, 20), 0, -.077, .03));
  const body = pivot(0, .12, 0);                                     // the suit: bobs, squashes and leans over the boots
  body.add(at(ball(.245, SUIT, 1.04, .98, .94, .02), 0, .17, 0));
  body.add(rot(at(box(.15, .095, .03, ORANGE, 0), 0, .2, .214), -.18, 0, 0));
  body.add(at(dot(.022, TEAL, 1, 1, .6, 0, 12), -.035, .205, .236), at(dot(.022, YELLOW, 1, 1, .6, 0, 12), .035, .205, .236));
  body.add(rot(at(torus(.2, .042, ORANGE), 0, .33, 0), Math.PI / 2, 0, 0));
  // arms hinged at the shoulders, hanging down and out. Viewed from the front, armL is on the left (-x): a negative z turn
  // swings it out and up, a positive one in; armR is the mirror (positive z raises it). A negative x turn swings a hanging arm
  // forward; once z has raised it, a positive x turn tips it forward.
  const arm = s => {
    const a = rot(pivot(s * .222, .29, 0), 0, 0, s * .3);
    a.add(at(pill(.056, .16, SUIT, .016), 0, -.135, 0), rot(at(ring(.057, .022, ORANGE), 0, -.2, 0), Math.PI / 2, 0, 0));
    return a;
  };
  const armL = arm(-1), armR = arm(1);
  // the jetpack: two tanks, two nozzles with a flame each (lit only in the air), an antenna with a blinking light
  const pack = pivot(0, .2, -.225);
  const flame = s => {
    const f = scl(pivot(s * .072, -.185, -.06), .001);
    f.add(rot(at(cone(.05, .2, YELLOW, 0, 12), 0, -.095, 0), Math.PI, 0, 0));
    f.children[0].material = kit.toon(YELLOW, { emissive: ORANGE, emissiveIntensity: .9 });
    return f;
  };
  const flameL = flame(-1), flameR = flame(1);
  const bulbMat = kit.toon(0xff3b5c, { emissive: 0xff2048, emissiveIntensity: 0 });
  const bulb = at(new THREE.Mesh(new THREE.SphereGeometry(.024, 14, 10), bulbMat), .072, .29, -.075);
  for (const s of [-1, 1]) pack.add(at(pill(.068, .14, ORANGE, .016), s * .072, 0, -.06), at(cyl(.028, .046, .05, GREY, 0, 16), s * .072, -.16, -.06));
  pack.add(flameL, flameR, at(cyl(.007, .007, .14, GREY, 0, 6), .072, .208, -.075), bulb);
  body.add(armL, armR, pack, at(dot(.06, FUR, 1, 1, 1, .014), 0, -.03, -.17));   // and a pom-pom tail
  // the head in its bubble helmet: big shiny eyes, a pink nose, a little "w" mouth, blush
  const head = pivot(0, .35, 0); body.add(head);
  head.add(at(ball(.2, FUR, 1.08, .95, 1, .02), 0, .18, 0));
  const face = pivot(0, .18, 0); head.add(face);
  const eyeL = rot(at(eye(.058, .074), -.085, .015, .17), 0, -.3, 0), eyeR = rot(at(eye(.058, .074), .085, .015, .17), 0, .3, 0);
  const mouth = s => rot(at(ring(.02, .0065, INK, Math.PI * .9, 12), s * .019, -.068, .186), 0, 0, Math.PI + Math.PI * .05);
  face.add(eyeL, eyeR, at(dot(.024, NOSE, 1.3, .9, .8, 0, 12), 0, -.04, .19), mouth(-1), mouth(1),
    at(blush(.038), -.125, -.05, .15), at(blush(.038), .125, -.05, .15));
  const glass = new THREE.Mesh(new THREE.SphereGeometry(.27, 32, 24), kit.toon(0xd2ecff, { transparent: true, opacity: .26, depthWrite: false }));
  const glint = new THREE.Mesh(new THREE.TorusGeometry(.2, .011, 6, 20, 1.05), kit.toon(0xffffff, { transparent: true, opacity: .8, depthWrite: false }));
  head.add(at(glass, 0, .175, .01), rot(at(glint, 0, .175, .01 + .186), 0, 0, 1.75));
  // long ears out through the top of the helmet: a base and a floppy tip each (cartoon logic); the tips swing on springs
  const ear = s => {
    const e = rot(pivot(s * .07, .33, -.01), 0, 0, -s * .2), tip = pivot(0, .2, 0);
    e.add(scl(at(pill(.054, .12, FUR, .014), 0, .113, 0), 1, 1, .6), at(dot(.1, PINK, .33, .95, .14), 0, .12, .028), tip);
    tip.add(scl(at(pill(.051, .11, FUR, .014), 0, .1, 0), 1, 1, .6));
    return [e, tip];
  };
  const [earL, tipL] = ear(-1), [earR, tipR] = ear(1);
  rot(tipL, -.25, 0, .1); rot(tipR, .3, 0, -1.2);                  // one ear up, one flopped over: that is the look
  head.add(earL, earR);
  hop.add(legL, legR, body); group.add(hop);

  const parts = { hop, body, legL, legR, armL, armR, head, face, earL, earR, tipL, tipR, pack, flameL, flameR };

  /* ── the ears' springs: each ear and each tip chases where its pose points it, in the frame of the stage (above the
     actor the act moves), so bounds, hops and the flip fling them about; the tips are the floppier. Gravity pulls a little. ── */
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q = new THREE.Quaternion();
  const springs = [[earL, .2, 260, 12], [earR, .2, 260, 12], [tipL, .21, 120, 5], [tipR, .21, 120, 5]]
    .map(([o, len, k, c]) => ({ o, len, k, c, p: new THREE.Vector3(), v: new THREE.Vector3(), live: false }));
  let lastT = -1;
  const stage = () => { let s = group; for (let i = 0; i < 3 && s.parent; i++) s = s.parent; return s; };
  function flop(T) {
    const dt = T - lastT, ref = stage(); lastT = T;
    for (const s of springs) {
      s.o.updateWorldMatrix(true, false);
      const base = ref.worldToLocal(s.o.getWorldPosition(v1)), goal = ref.worldToLocal(s.o.localToWorld(v2.set(0, s.len, 0)));
      if (!s.live || dt < 0 || dt > .1) { s.p.copy(goal); s.v.set(0, 0, 0); s.live = true; continue; }
      const n = Math.ceil(dt * 120), h = dt / Math.max(1, n), L = base.distanceTo(goal);
      for (let i = 0; i < n; i++) {
        v3.subVectors(goal, s.p).multiplyScalar(s.k).addScaledVector(s.v, -s.c); v3.y -= 1.2 * L;
        s.v.addScaledVector(v3, h); s.p.addScaledVector(s.v, h);
      }
      v3.subVectors(s.p, base); s.p.copy(base).addScaledVector(v3, L / (v3.length() || 1));
      const want = s.o.parent.worldToLocal(ref.localToWorld(v3.copy(s.p))).sub(s.o.position).normalize();
      s.o.quaternion.premultiply(q.setFromUnitVectors(v1.set(0, 1, 0).applyQuaternion(s.o.quaternion), want));
    }
  }
  /** What every pose ends with: blinking eyes, the antenna light, the ears on their springs. */
  const life = T => {
    const s = (T % 3.3) < .12 ? .12 : 1; eyeL.scale.y = eyeR.scale.y = s;
    bulbMat.emissiveIntensity = (T % 1.1) < .45 ? 1.6 : 0;
    flop(T);
  };
  const flames = (a, T) => {                                         // 0: out, 1: full; each flickers on its own
    const w = Math.max(.001, a * .9);
    flameL.scale.set(w, Math.max(.001, a * (1 + .18 * Math.sin(T * 47) + .1 * Math.sin(T * 83))), w);
    flameR.scale.set(w, Math.max(.001, a * (1 + .18 * Math.sin(T * 51 + 2) + .1 * Math.sin(T * 79))), w);
  };
  const DOWN = new THREE.Vector3(0, -1, 0);
  const aim = (a, x, y, z, w = 1) => {                               // turn an arm so its hand points along (x, y, z)
    q.setFromUnitVectors(DOWN, v1.set(x, y, z).normalize()); a.quaternion.slerp(q, w);
  };
  const ears = (up, T, sway = 0) => {                                // up 1: both ears straight up (perked); 0: the rest look
    earL.rotation.z = lerp(.2, .06, up) + sway * wave(T, .7); earR.rotation.z = lerp(-.2, -.06, up) + sway * wave(T, .8, 1);
    tipL.rotation.set(lerp(-.25, 0, up), 0, lerp(.1, 0, up)); tipR.rotation.set(lerp(.3, 0, up), 0, lerp(-1.2, 0, up));
  };
  const trickMove = k => {                                           // up on the jetpack, one backflip about its middle, float down
    const rise = ease.out(seg(k, .1, .42)), fall = ease.inOut(seg(k, .58, .92)), lift = .25 * (rise - fall);
    const p = -Math.PI * 2 * ease.inOut(seg(k, .3, .72)), c = .14;  // c: its middle, in card widths above its feet
    const crouch = Math.sin(Math.PI * seg(k, 0, .12)), land = Math.sin(Math.PI * seg(k, .91, 1));
    return { y: lift + c - c * Math.cos(p), z: -c * Math.sin(p), pitch: p, sy: 1 - .16 * crouch - .14 * land, sx: 1 + .1 * crouch + .09 * land };
  };

  return {
    group, parts, lean: .55, sparkle: '#fff1b8',                     // lean: moon bounds tip forward less than a run confetti: ['#ff8a1f', '#16b3ac', '#ffffff', '#9b7bff', '#ffd23f', '#ff6f91'],
    pose: {
      idle({ T }) {                                                  // floats a hair above the card, ears swaying
        hop.position.y = .012 + .012 * wave(T, .55);
        body.rotation.z = .03 * wave(T, .4); head.rotation.z = -.04 * wave(T, .4, .6);
        armL.rotation.z = -.42 - .06 * wave(T, .55); armR.rotation.z = .42 + .06 * wave(T, .55, .5);
        ears(0, T, .07); life(T);
      },
      pop({ t, T }) {                                                // hovers down on the jetpack, lands, "ta-da!" with a salute
        const down = ease.inOut(seg(t, .05, .55)), touch = Math.sin(Math.PI * seg(t, .5, .68)), s = ease.back(seg(t, .62, .86));
        hop.position.y = .24 * (1 - down) + .012 * Math.sin(t * 15) * (1 - down);
        flames(.75 * (1 - seg(t, .4, .55)), T);
        legL.rotation.x = legR.rotation.x = .3 * (1 - down);
        body.scale.set(1 + .08 * touch, 1 - .12 * touch, 1 + .08 * touch);
        armL.rotation.z = lerp(-.3, -2.05, s); armL.rotation.x = lerp(0, .2, s);
        armR.rotation.set(lerp(0, .6, s), 0, lerp(.3, 2.65, s));
        head.rotation.z = -.12 * s; ears(seg(t, .55, .8), T); life(T);
      },
      hello({ t, T }) {                                              // a big wave with the right arm, ears perked
        const up = ease.out(clamp(t / .25));
        armR.rotation.set(.2 * up, 0, lerp(.3, 2.75, up) + .32 * Math.sin(t * 12) * up);
        armL.rotation.z = -.5; body.rotation.z = -.06 * up; head.rotation.z = .12 * up; head.rotation.x = .05;
        hop.position.y = .03 * Math.abs(Math.sin(t * 5.2));
        ears(up, T); life(T);
      },
      run({ k, T }) {                                                // big, slow moon bounds: seven of them, long in the air
        const n = 7, b = k * n, i = Math.min(n - 1, Math.floor(b)), u = b - i, lead = i % 2 ? 1 : -1;
        const air = seg(u, .1, .9), h = 4 * air * (1 - air), contact = Math.max(0, 1 - Math.min(u, 1 - u) / .12);
        hop.position.y = .22 * h;
        body.scale.set(1 + .07 * contact, 1 - .11 * contact, 1 + .07 * contact); body.rotation.x = .05 + .05 * h; body.rotation.z = .05 * lead * h;
        const stride = Math.sin(Math.PI * air);
        legL.rotation.x = -lead * .75 * stride; legR.rotation.x = lead * .75 * stride;
        armL.rotation.set(lead * .9 * stride, 0, -.45 - .55 * h); armR.rotation.set(-lead * .9 * stride, 0, .45 + .55 * h);
        head.rotation.x = -.08 * h; ears(0, T); life(T);
      },
      dance({ t, T }) {                                              // the moon bounce: slow floaty hops, wavy space arms, a slow turn
        const beat = t / .8, b = Math.abs(Math.sin(Math.PI * beat)), a = Math.PI * 2 * t / 1.6;
        hop.position.y = .09 * b; hop.rotation.y = Math.PI * 2 * ease.inOut(seg(t, 1.5, 3.05));
        body.rotation.z = -.13 * Math.sin(a + .3); head.rotation.z = .1 * Math.sin(a + .9);
        armL.rotation.set(-.45 * Math.sin(a + 1.6), 0, -1.6 - .75 * Math.sin(a));        // a ripple through both arms: left up, right down
        armR.rotation.set(-.45 * Math.sin(a + 1.6), 0, 1.6 - .75 * Math.sin(a + .5));
        legL.rotation.z = -.3 * Math.max(0, Math.sin(Math.PI * beat)); legR.rotation.z = .3 * Math.max(0, -Math.sin(Math.PI * beat));
        legL.rotation.x = -.25 * b; legR.rotation.x = -.25 * b;
        ears(0, T, .1); life(T);
      },
      trick({ k, T }) {                                              // jetpack on, rocket pose, tucked through the flip, arms out to land
        flames(Math.max(ease.out(seg(k, .06, .14)) * (1 - seg(k, .5, .6)), .55 * Math.sin(Math.PI * seg(k, .78, .9))), T);
        const tuck = Math.sin(Math.PI * seg(k, .28, .76)), open = Math.sin(Math.PI * seg(k, .7, 1)), rocket = Math.sin(Math.PI * seg(k, .08, .36));
        armL.rotation.set(lerp(.35 * rocket, -1.1, tuck), 0, lerp(-.35, -.15, tuck) - 1.5 * open);
        armR.rotation.set(lerp(.35 * rocket, -1.1, tuck), 0, lerp(.35, .15, tuck) + 1.5 * open);
        legL.rotation.x = legR.rotation.x = -.9 * tuck + .25 * rocket; body.rotation.x = .18 * tuck;
        head.rotation.x = .12 * tuck; ears(0, T); life(T);
      },
      cheer({ t, T }) {                                              // both arms up and shaking, ears straight up
        const up = ease.back(clamp(t / .3));
        armL.rotation.set(.1, 0, lerp(-.3, -2.5, up) - .2 * Math.sin(t * 19)); armR.rotation.set(.1, 0, lerp(.3, 2.5, up) + .2 * Math.sin(t * 19 + 1));
        legL.rotation.z = -.15 * Math.abs(Math.sin(t * 4)); legR.rotation.z = .15 * Math.abs(Math.sin(t * 4));
        face.scale.set(1.04, 1.04, 1.04);
        ears(1, T); life(T); eyeL.scale.y *= .7; eyeR.scale.y *= .7;      // squeezed happy eyes
      },
      present({ t, T }) {                                            // turns to the letter on its left and points both arms at it
        const u = ease.inOut(clamp(t / .6)), actor = group.parent && group.parent.parent;
        body.rotation.y = (-.5 - (actor ? actor.rotation.y : 0)) * u;    // whatever way the act turned it, it faces the letter
        aim(armL, -.75, .35, .6, u); aim(armR, -.1, .3, .95, u);           // both arms held out to it
        head.rotation.set(-.14 * u, -.22 * u, .08 * u); hop.position.y = .01 + .01 * wave(T, .55);
        ears(.4 * u, T, .05); life(T);
      }
    },
    trick: { seconds: 2.2, move: trickMove }
  };
};
