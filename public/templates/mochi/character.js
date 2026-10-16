/* Mochi: a round strawberry rice cake with a sprout on top. Its trick: a somersault roll across the card.
   The act around it (pop, hello, lap, dance, trick, cheer, letter) is templates/_acts/showtime.js; this file only
   builds the character and poses its parts. Units: about 1 tall; the act scales it to template.json "height". */
(window.NM_CHARACTERS = window.NM_CHARACTERS || {})[document.currentScript.src] = (THREE, kit) => {
  const { ball, eye, blush, smile, pivot, at, rot, wave, ease, seg, clamp, lerp } = kit;
  const PINK = 0xffb3c8, PINK2 = 0xff8fb0, LEAF = 0x5cc98a, INK = 0x2b2440;

  const group = new THREE.Group();
  const feetL = at(ball(.13, PINK2, 1.1, .6, 1.3), -.2, .07, .05), feetR = at(ball(.13, PINK2, 1.1, .6, 1.3), .2, .07, .05);
  const footL = pivot(-.2, .1, 0), footR = pivot(.2, .1, 0);
  footL.add(at(feetL, 0, -.03, .05)); footR.add(at(feetR, 0, -.03, .05)); feetL.position.x = feetR.position.x = 0;
  const body = pivot(0, .08, 0);                                     // the cake: bobs, squashes and wiggles over its feet
  const cake = at(ball(.5, PINK, 1.06, .86, .96, .022), 0, .43, 0); body.add(cake);
  const face = pivot(0, .45, .44); body.add(face);
  const eyeL = at(eye(.075, .1), -.15, .03, 0), eyeR = at(eye(.075, .1), .15, .03, 0);
  face.add(eyeL, eyeR, at(blush(.07), -.27, -.06, -.04), at(blush(.07), .27, -.06, -.04), at(smile(.045, INK), 0, -.08, .02));
  rot(eyeL, 0, -.25, 0); rot(eyeR, 0, .25, 0);
  // nub arms, hinged at the side of the cake and hanging down and out. Viewed from the front, armL is on the left (-x):
  // a negative z turn swings it out and up, a positive one in; armR is the mirror (positive z raises it).
  const armL = pivot(-.47, .46, .06), armR = pivot(.47, .46, .06);
  armL.add(rot(at(ball(.09, PINK2, 1, 1.4, 1), -.08, -.11, 0), 0, 0, -.5)); armR.add(rot(at(ball(.09, PINK2, 1, 1.4, 1), .08, -.11, 0), 0, 0, .5));
  body.add(armL, armR);
  const sprout = pivot(0, .86, -.02); body.add(sprout);
  const stem = at(kit.cyl(.018, .022, .12, LEAF, .01, 10), 0, .05, 0);
  const leafL = rot(at(ball(.1, LEAF, 1.4, .3, .8, .012), -.1, .12, 0), 0, 0, .5), leafR = rot(at(ball(.1, LEAF, 1.4, .3, .8, .012), .1, .13, 0), 0, 0, -.45);
  sprout.add(stem, leafL, leafR);
  group.add(footL, footR, body);

  const parts = { body, armL, armR, footL, footR, sprout, face };
  const blink = T => { const s = (T % 3.1) < .12 ? .15 : 1; eyeL.scale.y = eyeR.scale.y = s; };

  return {
    group, parts, sparkle: '#ffd6e8', confetti: ['#ff8fb0', '#ffd166', '#5cc98a', '#ffffff', '#b388ff', '#ffb3c8'],
    pose: {
      idle({ T }) {
        body.scale.set(1 + .02 * wave(T, 1.4), 1 - .025 * wave(T, 1.4), 1 + .02 * wave(T, 1.4));
        sprout.rotation.z = .12 * wave(T, .9); armL.rotation.z = -.15 - .05 * wave(T, 1.4); armR.rotation.z = .15 + .05 * wave(T, 1.4);
        blink(T);
      },
      pop({ t, T }) {                                                // out of the card, then "ta-da"
        const up = ease.back(seg(t, .55, .9));
        armL.rotation.z = lerp(-.2, -2.3, up); armR.rotation.z = lerp(.2, 2.3, up);
        sprout.rotation.z = .5 * Math.sin(t * 18) * (1 - seg(t, 0, .8)); blink(T);
      },
      hello({ t, T }) {                                              // waves with the right nub, leans in
        armR.rotation.z = 2.2 - .45 * Math.sin(t * 14); armL.rotation.z = -.25;
        body.rotation.z = -.08; body.rotation.x = .06; face.rotation.y = -.08; sprout.rotation.z = .2 * wave(T, 2); blink(T);
      },
      run({ phase, T }) {                                            // little feet paddle, the cake bobs and leans
        const a = phase * Math.PI * 2;
        footL.rotation.x = .9 * Math.sin(a); footR.rotation.x = -.9 * Math.sin(a);
        footL.position.y = .1 + .05 * Math.max(0, -Math.sin(a)); footR.position.y = .1 + .05 * Math.max(0, Math.sin(a));
        body.position.y = .08 + .05 * Math.abs(Math.sin(a)); body.rotation.x = .12;
        armL.rotation.x = -.7 * Math.sin(a); armR.rotation.x = .7 * Math.sin(a); armL.rotation.z = -.5; armR.rotation.z = .5;
        sprout.rotation.x = -.5; sprout.rotation.z = .2 * Math.sin(a); blink(T);
      },
      dance({ t, T }) {                                              // a squishy wiggle on the beat, nubs up in turn
        const beat = t * 2.2, b = Math.abs(Math.sin(beat * Math.PI));
        body.rotation.z = .22 * Math.sin(beat * Math.PI); body.scale.set(1 + .08 * (1 - b), 1 - .1 * (1 - b), 1 + .08 * (1 - b));
        body.position.y = .08 + .06 * b;
        armL.rotation.z = Math.sin(beat * Math.PI) > 0 ? -2.4 : -.3; armR.rotation.z = Math.sin(beat * Math.PI) > 0 ? .3 : 2.4;
        footL.rotation.x = .4 * Math.max(0, Math.sin(beat * Math.PI)); footR.rotation.x = .4 * Math.max(0, -Math.sin(beat * Math.PI));
        sprout.rotation.y = t * 9; face.rotation.y = .15 * Math.sin(beat * Math.PI * .5); blink(T);
      },
      trick({ k }) {                                                 // tucks in for the roll
        const tuck = Math.sin(Math.PI * clamp(k * 1.1));
        armL.rotation.z = lerp(-.2, .4, tuck); armR.rotation.z = lerp(.2, -.4, tuck);
        footL.position.y = footR.position.y = .1 + .12 * tuck; face.scale.setScalar(1 + .08 * tuck); sprout.rotation.x = -.6 * tuck;
      },
      cheer({ t, T }) {                                              // both nubs up, shaking with joy
        armL.rotation.z = -2.5 - .25 * Math.sin(t * 20); armR.rotation.z = 2.5 + .25 * Math.sin(t * 20 + 1);
        sprout.rotation.y = t * 14; face.scale.setScalar(1.05); blink(T);
      },
      present({ t, T }) {                                            // both nubs towards the letter on its left
        const u = ease.inOut(clamp(t / .6));
        armL.rotation.z = lerp(-.2, -1.3, u); armL.rotation.y = .5 * u; armR.rotation.z = lerp(.2, .8, u);
        face.rotation.y = -.25 * u; body.rotation.z = .08 * u; sprout.rotation.z = .1 * wave(T, 1); blink(T);
      }
    },
    trick: {
      seconds: 1.8,
      move(k) {                                                      // hop forward, a full forward roll in the air, land, squash
        const air = seg(k, .15, .8), u = ease.inOut(air);
        const y = .18 * Math.sin(Math.PI * air), land = seg(k, .8, .95);
        return {
          z: lerp(0, .08, u) - .08 * ease.inOut(seg(k, .9, 1)), y,
          pitch: -Math.PI * 2 * u,
          sy: k < .15 ? 1 - .2 * Math.sin(Math.PI * seg(k, 0, .15)) : land > 0 && land < 1 ? 1 - .2 * Math.sin(Math.PI * land) : 1,
          sx: k < .15 ? 1 + .12 * Math.sin(Math.PI * seg(k, 0, .15)) : land > 0 && land < 1 ? 1 + .12 * Math.sin(Math.PI * land) : 1
        };
      }
    }
  };
};
