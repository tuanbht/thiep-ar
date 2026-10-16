/* Pip: a round penguin chick in a striped party hat. Its trick: a belly slide across the card, a spin on its tummy and a
   slide back. The act around it (pop, hello, lap, dance, trick, cheer, letter) is templates/_acts/showtime.js; this file
   only builds the character and poses its parts. Units: about 1.5 tall with the hat; the act scales it to template.json
   "height". */
(window.NM_CHARACTERS = window.NM_CHARACTERS || {})[document.currentScript.src] = (THREE, kit) => {
  const { ball, eye, blush, pivot, at, rot, scl, wave, ease, seg, clamp, lerp } = kit;
  const NAVY = 0x2b3d86, SNOW = 0xf7faff, BEAK = 0xff9a2e, BEAK2 = 0xf07f1a, MOUTH = 0x7a1f3d, FLIP = 0x3a52ad, BRIM = 0xffffff;
  const HEIGHT = .3;                                                 // template.json "height": the slide is measured in card widths

  /* the hat's stripes: pink and white bands wound round the cone, with ice-blue dots */
  const hatCanvas = document.createElement('canvas'); hatCanvas.width = hatCanvas.height = 128;
  { const c = hatCanvas.getContext('2d');
    c.fillStyle = '#ff5c8a'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#fff6fa';
    for (let i = -2; i < 6; i++) { c.beginPath(); c.moveTo(i * 32, 128); c.lineTo(i * 32 + 14, 128); c.lineTo(i * 32 + 14 + 64, 0); c.lineTo(i * 32 + 64, 0); c.fill(); }
    c.fillStyle = '#6fd0ff'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(i * 32 + 23, 92, 5, 0, 7); c.fill(); c.beginPath(); c.arc(i * 32 + 7, 40, 4, 0, 7); c.fill(); } }
  const hatTex = new THREE.CanvasTexture(hatCanvas); hatTex.colorSpace = THREE.SRGBColorSpace;
  const hatMat = kit.toon(0xffffff, { map: hatTex }); hatMat.addEventListener('dispose', () => hatTex.dispose());

  const group = new THREE.Group();
  const all = pivot(0, 0, 0); group.add(all);                        // the whole chick: the shuffle slides and twirls it
  // flat orange paddle feet, hinged at the ankle and turned out a little
  const footL = pivot(-.15, .05, -.02), footR = pivot(.15, .05, -.02);
  footL.add(rot(at(ball(.1, BEAK, 1.1, .38, 1.5, .012), -.01, -.018, .11), 0, -.22, 0));
  footR.add(rot(at(ball(.1, BEAK, 1.1, .38, 1.5, .012), .01, -.018, .11), 0, .22, 0));
  const body = pivot(0, .05, 0);                                     // tummy, flippers and head: rocks and bobs over the feet
  const torso = at(ball(.38, NAVY, 1, .9, .92, .02), 0, .35, 0);
  const belly = at(ball(.3, SNOW, 1, 1.02, .85, .014), 0, .32, .14);  // pokes out of the front: the white tummy patch
  const tail = rot(at(ball(.09, NAVY, 1.3, .45, 1.2, .014), 0, .2, -.31), .7, 0, 0);   // a stubby tail that wags
  body.add(torso, belly, tail);
  // flippers, hinged at the side of the tummy and hanging down and a little out. Viewed from the front, flipL is on the
  // left (-x): a negative z turn swings it out and up, a positive one in; flipR is the mirror (positive z raises it).
  // A negative x turn swings a flipper forward, a positive one back; a y turn (applied last) swings it round the body.
  const flipL = pivot(-.33, .45, 0), flipR = pivot(.33, .45, 0);
  flipL.rotation.order = flipR.rotation.order = 'YXZ';
  flipL.add(rot(at(ball(.17, FLIP, .3, 1, .62, .016), -.04, -.14, 0), 0, 0, -.28));
  flipR.add(rot(at(ball(.17, FLIP, .3, 1, .62, .016), .04, -.14, 0), 0, 0, .28));
  body.add(flipL, flipR);
  // the head: a navy hood with a white face, hinged at the neck
  const head = pivot(0, .58, 0); body.add(head);
  const skull = at(ball(.33, NAVY, 1.06, .97, 1, .022), 0, .23, 0);
  const mask = at(ball(.25, SNOW, 1.08, .88, .7, .014), 0, .17, .19);
  head.add(skull, mask);
  const eyeL = rot(at(eye(.068, .088), -.12, .23, .325), -.08, -.32, 0), eyeR = rot(at(eye(.068, .088), .12, .23, .325), -.08, .32, 0);
  head.add(eyeL, eyeR, rot(at(blush(.055), -.2, .13, .3), 0, -.55, 0), rot(at(blush(.055), .2, .13, .3), 0, .55, 0));
  const beak = pivot(0, .15, .35); head.add(beak);                   // a small wide beak; its lower half drops open on a dark mouth
  beak.add(scl(rot(at(kit.cone(.064, .12, BEAK, .01, 20), 0, .012, .05), Math.PI / 2, 0, 0), 1.3, 1, .6));
  beak.add(at(ball(.034, MOUTH, 1.4, .7, .9, 0), 0, -.004, .03));
  const jaw = pivot(0, -.008, .012); beak.add(jaw);
  jaw.add(scl(rot(at(kit.cone(.048, .085, BEAK2, 0, 16), 0, -.008, .034), Math.PI / 2, 0, 0), 1.25, 1, .5));
  // the party hat, tipped to one side, with a fluffy brim and a pompom
  const hat = rot(pivot(.07, .5, -.01), 0, 0, -.32); head.add(hat);
  const cone = at(kit.cone(.14, .32, 0xffffff, .012, 24), 0, .16, 0); cone.material = hatMat; hat.add(cone);
  hat.add(rot(at(kit.torus(.135, .03, BRIM), 0, .012, 0), Math.PI / 2, 0, 0), at(ball(.06, BRIM, 1, 1, 1, .012), 0, .33, 0));
  // a tuft of fluff on the other side of the hat
  const tuft = rot(pivot(-.13, .5, .05), 0, 0, .35); head.add(tuft);
  tuft.add(rot(at(ball(.045, NAVY, .55, 1.5, .55, .012), -.025, .05, 0), 0, 0, .45), rot(at(ball(.05, NAVY, .55, 1.6, .55, .012), .015, .06, 0), 0, 0, -.2));
  all.add(footL, footR, body);

  const parts = { all, body, head, flipL, flipR, footL, footR, hat, tuft, tail, jaw, eyeL, eyeR };
  const blink = T => { const s = (T % 3.3) < .12 ? .12 : 1; eyeL.scale.y = eyeR.scale.y = s; };
  const twitch = (T, every, len = .28) => { const u = (T % every) / len; return u < 1 ? Math.sin(Math.PI * u) : 0; };

  /* the belly slide: how high the actor must sit for the tummy to rest on the card at a pitch, and how far forward of
     the feet the tummy is (card widths). Measured on the ellipsoids that touch the ground when it lies down. */
  const box = new THREE.Box3().setFromObject(group), S = HEIGHT / (box.max.y - box.min.y), up0 = -box.min.y;
  const LOW = [[.40, 0, .38 * .9, .38 * .92], [.37, .14, .306, .255], [.80, .19, .22, .175], [.86, 0, .32, .33]];   // [y, z, semi y, semi z]
  const lift = p => S * Math.max(0, ...LOW.map(([y, z, ay, az]) => Math.hypot(ay * Math.cos(p), az * Math.sin(p)) - (y + up0) * Math.cos(p) + z * Math.sin(p)));
  const reach = p => S * ((.37 + up0) * Math.sin(p) + .14 * Math.cos(p));
  const P = 1.32, FAR = .17, HOME = reach(0);

  return {
    group, parts, sparkle: '#bfeaff', confetti: ['#3fa9f5', '#ff7aa8', '#ff9a2e', '#8fdcff', '#ffffff', '#ffd6e5'],
    pose: {
      idle({ T }) {                                                  // after the show: half turned to the letter, swaying,
        const nudge = twitch(T, 3.1, .5);                            // and now and then a flipper points at it: go on, tap it
        all.rotation.y = -.1; body.rotation.z = .05 * wave(T, .55); head.rotation.z = -.06 * wave(T, .55, .8); head.rotation.y = -.15;
        body.scale.y = 1 + .015 * wave(T, 1.1);
        flipL.rotation.z = -.1 - .06 * wave(T, .55) - 1.3 * nudge; flipL.rotation.y = .7 * nudge;
        flipR.rotation.z = .12 + .3 * twitch(T - 1.5, 3.1);
        hat.rotation.z = -.32 + .06 * wave(T, .55, 1.6); tail.rotation.y = .3 * wave(T, .55, .4); blink(T);
      },
      pop({ t, T }) {                                                // out of the card, then "ta-da!"
        const up = ease.back(seg(t, .5, .85)), settle = 1 - seg(t, 0, 1.1);
        flipL.rotation.z = lerp(-.1, -2.2, up); flipR.rotation.z = lerp(.1, 2.2, up);
        flipL.rotation.x = flipR.rotation.x = -.25 * up;
        head.rotation.x = -.12 * up; jaw.rotation.x = .55 * up;
        hat.rotation.z = -.32 + .45 * Math.sin(t * 16) * settle; tuft.rotation.z = .35 + .4 * Math.sin(t * 20) * settle; blink(T);
      },
      hello({ t, T }) {                                              // waves the right flipper, tilts its head
        flipR.rotation.z = 2.22 - .25 * Math.sin(t * 13); flipR.rotation.x = -.2; flipL.rotation.z = -.22;
        head.rotation.z = .17; head.rotation.x = .04; body.rotation.z = -.05;
        jaw.rotation.x = .3 + .1 * Math.sin(t * 13); hat.rotation.z = -.32 + .08 * Math.sin(t * 13 - 1); blink(T);
      },
      run({ phase, T }) {                                            // a fast waddle: rocks foot to foot, flippers out
        const a = phase * Math.PI * 2, s = Math.sin(a);
        body.rotation.z = .2 * s; body.rotation.x = .08; head.rotation.z = -.12 * s;
        footL.position.y = .05 + .06 * Math.max(0, -s); footR.position.y = .05 + .06 * Math.max(0, s);
        footL.rotation.x = -.5 * s; footR.rotation.x = .5 * s;
        flipL.rotation.z = -.95 + .18 * s - .12 * Math.sin(T * 26); flipR.rotation.z = .95 + .18 * s + .12 * Math.sin(T * 26 + 1);
        hat.rotation.z = -.32 + .18 * Math.sin(a - 1); tuft.rotation.z = .35 + .25 * Math.sin(a - 1.5);
        jaw.rotation.x = .25; tail.rotation.y = .45 * s; blink(T);
      },
      dance({ t, T }) {                                              // the penguin shuffle: side steps, flaps, head bobs
        const beat = t * 2.2, side = Math.sin(Math.PI * beat), b = Math.sin(Math.PI * (beat % 1)), left = Math.floor(beat) % 2 === 0;
        all.position.x = .07 * side; all.rotation.y = 2 * Math.PI * ease.inOut(seg(beat, 5.6, 6.8));   // and a twirl to finish
        body.rotation.z = -.14 * side; body.position.y = .05 + .035 * b;
        (left ? footL : footR).position.y = .05 + .06 * b; (left ? footL : footR).rotation.x = -.45 * b;
        flipL.rotation.z = -.3 - .85 * Math.abs(Math.sin(2 * Math.PI * beat)); flipR.rotation.z = .3 + .85 * Math.abs(Math.sin(2 * Math.PI * beat + .4));
        head.position.z = .04 * Math.sin(2 * Math.PI * beat); head.rotation.x = .1 * Math.sin(2 * Math.PI * beat); head.rotation.z = .12 * side;
        hat.rotation.z = -.32 - .3 * Math.sin(Math.PI * beat - .7); hat.rotation.x = .12 * Math.sin(2 * Math.PI * beat - .5);
        tuft.rotation.z = .35 + .3 * Math.sin(Math.PI * beat - 1.2); jaw.rotation.x = .35 * b; tail.rotation.y = .6 * Math.sin(2 * Math.PI * beat); blink(T);
      },
      trick({ k, t, T }) {                                           // flippers out, head up, feet kicking: a toboggan
        const crouch = Math.sin(Math.PI * seg(k, 0, .12)), lie = ease.smooth(seg(k, .08, .2)) * (1 - ease.smooth(seg(k, .76, .86)));
        const flap = Math.abs(Math.sin(Math.PI * 5 * seg(k, .8, 1))) * seg(k, .8, .84);
        const paddle = .25 * Math.sin(T * 14);                       // flippers out to the sides, pushing off the ice
        flipL.rotation.x = flipR.rotation.x = .7 * crouch + .2 * lie;
        flipL.rotation.z = -.25 * crouch - (1.05 + paddle) * lie - 1.3 * flap; flipR.rotation.z = .25 * crouch + (1.05 + paddle) * lie + 1.3 * flap;
        head.rotation.x = -.8 * lie + .1 * crouch; jaw.rotation.x = .5 * lie + .4 * flap;
        footL.rotation.x = lie * (-.7 + .45 * Math.sin(T * 24)); footR.rotation.x = lie * (-.7 + .45 * Math.sin(T * 24 + Math.PI));
        hat.rotation.x = -.45 * lie; hat.rotation.z = -.32 + .1 * Math.sin(t * 19) * lie; tuft.rotation.x = -.6 * lie; blink(T);
      },
      cheer({ t, T }) {                                              // flapping both flippers high, beak wide open
        flipL.rotation.z = -2.35 - .3 * Math.sin(t * 20); flipR.rotation.z = 2.35 + .3 * Math.sin(t * 20 + .6);
        flipL.rotation.x = flipR.rotation.x = -.15;
        head.rotation.x = -.14; jaw.rotation.x = .75 + .1 * Math.sin(t * 9);
        hat.rotation.z = -.32 + .22 * Math.sin(t * 9); tuft.rotation.z = .35 + .3 * Math.sin(t * 11); blink(T);
      },
      present({ t, T }) {                                            // turns to the letter (at -x, the phone's left): "ta-da, for you!"
        // the act turns it .35 towards the letter; `all` adds a little more
        const u = ease.inOut(clamp(t / .6)), bob = .1 * Math.sin(T * 5) * u;
        all.rotation.y = -.1 * u; body.rotation.z = .12 * u; head.rotation.y = -.3 * u; head.rotation.x = -.15 * u; head.rotation.z = .1 * u;
        flipL.rotation.z = lerp(-.1, -1.75, u) - bob; flipL.rotation.y = .5 * u;   // pointing at the letter
        flipR.rotation.z = lerp(.1, 2.3, u) + bob; flipR.rotation.y = -.3 * u;     // and the other one up high
        jaw.rotation.x = .3 * u; hat.rotation.z = -.32 + .06 * wave(T, 1.2); blink(T);
      }
    },
    trick: {
      seconds: 2.2,
      move(k) {                                                      // crouch, dive, slide out, spin on the tummy, slide back, pop up
        let p = 0, yaw = 0, bz = HOME, y = 0, roll = 0, sx = 1, sy = 1;
        if (k < .08) { const u = Math.sin(Math.PI * seg(k, 0, .08)); p = -.12 * seg(k, 0, .08); sy = 1 - .16 * u; sx = 1 + .1 * u; }
        else if (k < .22) { const u = ease.inOut(seg(k, .08, .22)); p = lerp(-.12, P, u); bz = lerp(HOME, HOME + .1, u); y = lift(p) + .05 * Math.sin(Math.PI * u); }
        else if (k < .44) { const u = ease.out(seg(k, .22, .44)); p = P; bz = lerp(HOME + .1, FAR, u); roll = .07 * Math.sin(u * 9); }
        else if (k < .56) { const u = ease.inOut(seg(k, .44, .56)); p = P; bz = FAR + .01 * Math.sin(Math.PI * u); yaw = Math.PI * u; }
        else if (k < .76) { const u = ease.inOut(seg(k, .56, .76)); p = P; yaw = Math.PI; bz = lerp(FAR, .04, u); roll = .07 * Math.sin(u * 9); }
        else if (k < .92) { const u = seg(k, .76, .92), e = ease.out(u); p = lerp(P, 0, e); yaw = Math.PI * (1 + ease.inOut(u)); bz = lerp(.04, HOME, e); y = lift(p) + .06 * Math.sin(Math.PI * u); }
        else { const u = Math.sin(Math.PI * seg(k, .92, 1)); yaw = 2 * Math.PI; sy = 1 - .15 * u; sx = 1 + .1 * u; }
        if (k >= .22 && k < .76) y = lift(p) + .004 * Math.sin(k * 60);
        const r = reach(p);                                          // the tummy is at bz: the feet are behind it
        return { x: -Math.sin(yaw) * r, z: bz - Math.cos(yaw) * r, y, yaw, pitch: p, roll, sx, sy };
      }
    }
  };
};
