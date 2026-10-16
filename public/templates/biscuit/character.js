/* Biscuit: a chubby corgi pup in a red bandana. Its trick: chasing its own tail, two turns on the spot, then a dizzy wobble.
   The act around it (pop, hello, lap, dance, trick, cheer, letter) is templates/_acts/showtime.js; this file only
   builds the character and poses its parts. Units: about 0.7 tall with the ears and 1 long, head at the +z end, paws on
   y = 0; the act scales it to template.json "height". */
(window.NM_CHARACTERS = window.NM_CHARACTERS || {})[document.currentScript.src] = (THREE, kit) => {
  const { ball, capsule, cone, eye, pivot, at, rot, scl, wave, ease, seg } = kit;
  const ORANGE = 0xe8862c, CREAM = 0xfff3dc, PINK = 0xffa3b8, TONGUE = 0xff7393, RED = 0xe63946, MOUTH = 0x5b2334, INK = 0x2b2440;

  const group = new THREE.Group();
  // body: the whole dog. place() turns it about any line across the card, so it can sit, sit up and bow with its paws down.
  const body = pivot(); group.add(body);
  // the front half (chest, front legs, head) and the back half (rump, back legs, tail) hinge in the middle: the dog
  // stretches and bunches as it gallops, curls after its tail and wiggles its rump.
  const front = pivot(0, .27, .02), rear = pivot(0, .27, -.02); body.add(front, rear);
  // the loaf: two capsules along z with the same section, so the halves join without a seam however they turn
  const loafGeo = new THREE.CapsuleGeometry(.18, .14, 10, 28);       // finer than kit.capsule: the toon bands run smooth on it
  const loaf = z => {
    const m = new THREE.Mesh(loafGeo, kit.toon(ORANGE)); kit.outline(m);
    return scl(rot(at(m, 0, .01, z), Math.PI / 2, 0, 0), 1, 1, .8);
  };
  front.add(loaf(.04), at(ball(.165, CREAM, .9, .78, 1.55), 0, -.03, .05));   // shoulders; the fluffy chest, on under the belly
  rear.add(loaf(-.08));
  // the rump from behind: two cream lobes leaning in at the bottom make a heart, with the tail nub in its notch
  const lobe = s => rot(at(ball(.112, CREAM, 1, 1.15, .85), s * .068, -.025, -.275), 0, 0, -s * .32);
  rear.add(lobe(-1), lobe(1));
  const tail = rot(pivot(0, .1, -.335), -.5, 0, 0); rear.add(tail);
  tail.add(at(ball(.045, ORANGE, 1, 1, 1.2, .012), 0, .012, -.025));
  // the bandana: a red triangle on the chest, under the chin
  const scarf = scl(rot(at(cone(.1, .13, RED, .012, 3), 0, .03, .3), Math.PI - .35, 0, 0), 1, 1, .5); front.add(scarf);

  // legs, hinged where they meet the body: a positive x turn swings the paw back, a negative one reaches forward
  const legF = s => { const p = pivot(s * .1, -.07, .17); p.add(at(scl(capsule(.052, .085, CREAM), 1, 1, 1.1), 0, -.1055, 0)); front.add(p); return p; };
  const legB = s => {
    const p = pivot(s * .12, -.06, -.18);
    p.add(ball(.105, ORANGE, .72, 1, 1.15), at(capsule(.046, .08, CREAM), 0, -.124, .02)); rear.add(p); return p;
  };
  const legFL = legF(-1), legFR = legF(1), legBL = legB(-1), legBR = legB(1);

  // the head: big for a pup, with a cream muzzle, a black nose, an open happy mouth and huge ears
  const head = pivot(0, .09, .24); front.add(head);
  head.add(at(ball(.155, ORANGE, 1.05, .95, .95), 0, .06, .08), at(ball(.08, CREAM, 1.3, .85, 1), 0, .015, .2));
  head.add(at(ball(.03, INK, 1.35, .9, .9, 0), 0, .047, .275));
  const mouth = at(pivot(), 0, -.028, .248); head.add(mouth);
  mouth.add(ball(.042, MOUTH, 1.1, .8, .45, 0));
  const tongue = rot(pivot(0, -.012, .012), .35, 0, 0); mouth.add(tongue);
  tongue.add(at(ball(.028, TONGUE, .95, .42, 1.25, 0), 0, -.006, .016));
  mouth.scale.y = .6;                                                // rest: a happy half-open pant
  const eyeL = rot(at(eye(.043, .056), -.072, .095, .205), 0, -.5, 0), eyeR = rot(at(eye(.043, .056), .072, .095, .205), 0, .5, 0);
  head.add(eyeL, eyeR);
  // ears, hinged at their base: a negative x turn lays them back, z turns them out (earL is on the -x side)
  const ear = s => {
    const p = rot(pivot(s * .09, .17, .06), 0, 0, -s * .28);
    p.add(scl(at(cone(.082, .2, ORANGE, .014), 0, .09, 0), 1, 1, .6), scl(at(cone(.054, .13, PINK, 0), 0, .075, .026), 1, 1, .45));
    head.add(p); return p;
  };
  const earL = ear(-1), earR = ear(1);
  group.add(body);

  const parts = { body, front, rear, head, mouth, tongue, tail, earL, earR, legFL, legFR, legBL, legBR };
  /** Turns the whole dog by a about the x axis through (0, py, pz) (negative: nose up), then moves it up by dy and on by dz. */
  const place = (a, py = 0, pz = 0, dy = 0, dz = 0) => {
    const c = Math.cos(a), s = Math.sin(a);
    body.rotation.x = a; body.position.set(0, py - py * c + pz * s + dy, pz - py * s - pz * c + dz);
  };
  const sitPretty = u => place(-1.0 * u, .13, -.32, -.1 * u, .13 * u);   // up on its haunches, about the bottom of its rump
  const sit = u => { place(-.25 * u, 0, .19); legBL.rotation.x = legBR.rotation.x = -.85 * u; };   // rump down, back legs forward
  const blink = T => { const b = (T + 1.6) % 3.3; eyeL.scale.y = eyeR.scale.y = b < .11 || (b > .24 && b < .33) ? .15 : 1; };
  const twitch = T => {                                              // now and then one ear flicks
    const a = T % 2.9, b = (T + 1.3) % 3.7;
    if (a < .22) earL.rotation.z += .35 * Math.sin(Math.PI * a / .22);
    if (b < .22) earR.rotation.z -= .35 * Math.sin(Math.PI * b / .22);
  };
  const pant = (T, open = .6) => { mouth.scale.y = open + .1 * Math.max(0, wave(T, 2.4)); };

  return {
    group, parts, lean: 0, sparkle: '#ffc94a', confetti: ['#e63946', '#ffd23f', '#5bc0eb', '#ffffff', '#4fbf6a', '#ffd23f'],
    pose: {
      idle({ T }) {                                                  // breathes, pants, tilts its head, wags the nub
        const b = wave(T, .8);
        body.scale.set(1 + .008 * b, 1 + .014 * b, 1);
        head.rotation.z = .1 * wave(T, .3); head.rotation.x = .04 * wave(T, .8, 1);
        tail.rotation.y = .55 * wave(T, 2.6);
        pant(T); twitch(T); blink(T);
      },
      pop({ t, T }) {                                                // a bounce out of the card, then a "woof"
        const hop = Math.sin(Math.PI * seg(t, .38, .68)), woof = Math.sin(Math.PI * seg(t, .72, 1.12));
        place(-.16 * woof, 0, -.2, .07 * hop);
        legFL.rotation.x = legFR.rotation.x = -.5 * hop + .12 * woof; legBL.rotation.x = legBR.rotation.x = .5 * hop;
        head.rotation.x = -.5 * woof; earL.rotation.x = earR.rotation.x = .25 * woof;
        mouth.scale.y = .6 + .9 * woof; tongue.rotation.x = .35 - .3 * woof;
        tail.rotation.y = .7 * Math.sin(T * 24); blink(T);
      },
      hello({ t, T }) {                                              // sits up pretty and waves a front paw
        const u = ease.inOut(seg(t, 0, .35)), w = ease.out(seg(t, .3, .45));
        sitPretty(u);
        head.rotation.x = .85 * u; head.rotation.z = .16 * u * Math.sin(t * 5);
        legBL.rotation.x = legBR.rotation.x = .3 * u;
        legFL.rotation.x = -.55 * u; legFL.rotation.z = .15 * u;
        legFR.rotation.x = -.55 * u - 1.25 * w; legFR.rotation.z = -.15 * u - w * (.45 + .4 * Math.sin((t - .3) * 15));
        tail.rotation.y = .7 * Math.sin(T * 20); pant(T, .85); twitch(T); blink(T);
      },
      run({ phase, T }) {                                            // zoomies: a bounding gallop, ears back, tongue out
        const a = phase * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
        // a dog stays level ("lean": 0 below), rocking front to back with the stride
        place(.07 * c, 0, 0, .04 * Math.max(0, s));
        legFL.rotation.x = -.9 * s; legFR.rotation.x = -.9 * Math.sin(a - .45);
        legBL.rotation.x = .9 * s; legBR.rotation.x = .9 * Math.sin(a - .45);
        front.position.z += .03 * s; rear.position.z -= .03 * s;     // stretched out, then bunched up
        front.rotation.x = .1 * Math.max(0, -s) - .05 * Math.max(0, s); rear.rotation.x = -.1 * Math.max(0, -s);
        earL.rotation.x = earR.rotation.x = -.8 + .2 * Math.sin(2 * a); earL.rotation.z += .12; earR.rotation.z -= .12;
        head.rotation.x = .1 - .1 * c;
        mouth.scale.y = 1; tongue.scale.set(1, 1, 1.6); tongue.rotation.set(.55 + .2 * Math.sin(2 * a), .35, 0);
        tail.rotation.y = .5 * Math.sin(2 * a); blink(T);
      },
      dance({ t, T }) {                                              // a play bow and a butt wiggle on the beat
        const beat = t * 2.2, sb = Math.sin(beat * Math.PI), bob = Math.abs(sb);
        place(.24, 0, -.2);                                          // chest down over its front paws, rump up
        legFL.rotation.x = -1.25 - .35 * Math.max(0, sb); legFR.rotation.x = -1.25 - .35 * Math.max(0, -sb);
        rear.rotation.y = .42 * sb; rear.rotation.z = -.2 * sb; rear.position.x = .03 * sb;
        legBL.rotation.z = legBR.rotation.z = .2 * sb; legBL.rotation.x = legBR.rotation.x = -.24;
        head.rotation.x = -.5 + .14 * bob; head.rotation.z = .18 * Math.sin(beat * Math.PI + .6); head.rotation.y = -.12 * sb;
        earL.rotation.z += .2 * bob; earR.rotation.z -= .2 * bob;
        tail.rotation.y = .9 * Math.sin(T * 32); tail.rotation.x = -.5 + .3 * Math.sin(T * 21);
        mouth.scale.y = .95; tongue.scale.z = 1.3; blink(T);
      },
      trick({ k, T }) {                                              // curls round after its tail, then goes dizzy
        const env = ease.smooth(seg(k, 0, .12)) * (1 - ease.smooth(seg(k, .74, .86))), step = Math.sin(T * 22) * env;
        front.rotation.y = .7 * env; rear.rotation.y = -.7 * env; head.rotation.y = .55 * env; head.rotation.x = .15 * env;
        legFL.rotation.x = .5 * step; legFR.rotation.x = -.5 * step; legBL.rotation.x = -.5 * step; legBR.rotation.x = .5 * step;
        earL.rotation.z += .5 * env; earR.rotation.z -= .5 * env;
        tail.rotation.y = .8 * Math.sin(T * 30) * (1 - .5 * env);
        mouth.scale.y = .6 + .45 * env; tongue.scale.z = 1 + .5 * env;
        const d = seg(k, .8, 1), w = Math.sin(d * Math.PI * 4) * (1 - .6 * d);
        if (d > 0) {                                                 // the room keeps turning for a moment
          head.rotation.z = .35 * w; head.rotation.y = -.15 * w; front.rotation.y = .12 * w;
          eyeL.scale.y = eyeR.scale.y = .55; mouth.scale.y = .8; tongue.rotation.y = .5;
        } else blink(T);
      },
      cheer({ t, T }) {                                              // bounces with all four paws and howls for joy
        let air = 0;
        for (const [a, b] of [[.15, .75], [.95, 1.55]]) air = Math.max(air, Math.sin(Math.PI * seg(t, a, b)) * (t > a && t < b ? 1 : 0));
        const h = ease.out(seg(t, .05, .35));
        place(-.12 * h, 0, -.2);
        legFL.rotation.x = legFR.rotation.x = -.45 * air; legBL.rotation.x = legBR.rotation.x = .45 * air;
        head.rotation.x = -.8 * h; mouth.scale.y = .6 + .8 * h + .08 * h * Math.sin(T * 40);
        earL.rotation.x = earR.rotation.x = -.25 * h - .2 * air;
        eyeL.scale.y = eyeR.scale.y = 1 - .55 * h;                    // eyes squeezed happy while it howls
        tail.rotation.y = .9 * Math.sin(T * 34);
      },
      present({ t, T }) {                                            // sits and points its nose at the letter, wagging hard
        // the letter rises at -x and the act already turns the dog a little towards it; the nose does the rest
        const u = ease.inOut(seg(t, 0, .5));
        sit(u);
        front.rotation.y = -.1 * u; head.rotation.y = -.55 * u; head.rotation.x = -.3 * u; head.rotation.z = -.12 * u;
        tail.rotation.y = .85 * Math.sin(T * 26); pant(T, .8); twitch(T); blink(T);
      }
    },
    trick: {
      seconds: 2,
      move(k) {                                                      // two turns round a point at its side, a dizzy wobble
        const spin = ease.inOut(seg(k, .1, .8)), yaw = 4 * Math.PI * spin, r = .035, d = seg(k, .8, 1);
        return {
          x: r * (1 - Math.cos(yaw)), z: r * Math.sin(yaw), yaw,
          roll: .1 * Math.sin(d * Math.PI * 3) * (1 - d),
          sy: k < .1 ? 1 - .1 * Math.sin(Math.PI * seg(k, 0, .1)) : 1, sx: k < .1 ? 1 + .06 * Math.sin(Math.PI * seg(k, 0, .1)) : 1
        };
      }
    }
  };
};
