/* Mũi thuyền lộng gió (into the wind at the bow), told by the shared act _acts/lovestory.js; the sea, the sky and the little
   ship are built by scenery.js, the two of them, the gulls, the dolphins and the word carriers by crew.js (both loaded
   first). Three chapters of about ten seconds, each ending at a stop:
     1 · 0–10 s      the sky folds up and the ship rises out of a golden sea; she stands at the bow rail looking out while
                     he steers; a gull lands on the wheel, he salutes it and leaves it the helm; he tiptoes up behind her,
                     unknots the red kerchief at his collar and ties it over her eyes; she jumps and laughs, he steps to her
                     side and whispers, she nods; a gust spins the tag on the mast round to show the card's first words (note1)
     2 · 10–20 s     the wind takes the tag away; blindfolded, she lets him lead her to the bow and lift her onto the step
                     there; she holds the rail, pulls the kerchief off and spreads her arms wide into the wind, the kerchief
                     streaming from her hand, his hands at her waist; dolphins leap alongside; a page of the ship's log with
                     the card's photo blows in and is pegged to the mast (caption)
     3 · 20–30.2 s   she lets the kerchief fly off towards the sunset, steps down and turns to him; they hold hands and kiss
                     as the sun slips into the sea; the sky turns rose and violet, the first stars come out, the lantern on
                     the mast lights, and two gulls fly in a banner with the last words (note2)
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can play on its own; the
   sea, the rocking, the flags and the wings go by T, the act's own time. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2;
  const PAGE = { width: 1.1, height: .82, curve: .1, z: -.3 };       // the painted sky, standing at the card's back edge
  const HORIZON = .2;                                                // where the far sea meets the sky on it
  const SUN = { x: -.15, r: .09, y0: .36, set: .1 };                  // a big low sun; by the end it is under the sea
  const SHIP = { x: .03, z: 0, yaw: -.7, deck: .05, mid: -.02, bow: .31, stern: -.25, beam: .145, railEnd: -.15, mastZ: 0, mastH: .67,
    lanternY: .39, wheelZ: -.075, staff: .45, cabin: { z0: -.245, z1: -.18, w: .08, h: .085 }, step: { z: .225, w: .085, d: .05, h: .03 } };
  const D = SHIP.deck, STEP = D + SHIP.step.h;
  const S = window.NM_SHIP.scenery(kit, { PAGE, HORIZON, SUN, SHIP });
  const C = window.NM_SHIP.crew(kit, S);
  const { V3 } = S;
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  const GOLDEN = { hemi: new THREE.Color('#ffe3c8'), ground: new THREE.Color('#8a6a80'), sun: new THREE.Color('#ffd2a0') };
  const DUSK = { hemi: new THREE.Color('#b7a6ec'), ground: new THREE.Color('#5a4378'), sun: new THREE.Color('#ff9fb0') };
  let page, ship, sea, boy, girl, hair, kerchief, helm, flock, dolphins, tag, log, banner, wind, lamp, glow, stars, hearts, sparks, spray, splash, all;

  /* ── who does what, from story time g: [from g, clip, options] ── */
  const BOY = [
    [0, 'Idle'], [4.25, 'Walking_A', { speed: 1.45, fade: .25 }], [6.3, 'Idle', { fade: .2 }], [7.5, 'Walking_A', { speed: 1.5, fade: .15 }],
    [8.05, 'Idle', { fade: .2 }]
  ];
  const GIRL = [
    [0, 'Idle'], [11, 'Walking_A', { speed: .7, fade: .2 }], [11.5, 'Idle', { fade: .15 }], [11.55, 'Jump_Full_Short', { once: true, fade: .12 }],
    [12.7, 'Idle', { fade: .3 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  /* where each of them stands on the deck (the ship's own frame, +z the bow): [from g, x, z, turn, ease into it] */
  const KISS = 2.27, FACE = -.87;                                    // facing each other across the ship, side on to you
  const BOY_WAY = [
    [0, 0, -.128, 0], [4.25, 0, -.128, 0], [4.55, .025, -.1, .45, 'in'], [5.25, .058, -.02, .15, 'linear'], [5.8, .03, .06, -.2, 'linear'],
    [6.3, -.047, .101, .4, 'out'], [7.4, -.047, .101, .4], [7.55, -.03, .1, 1.3], [8, .07, .1, 1.3, 'linear'], [8.2, .082, .1, .65],
    [10.9, .082, .1, .65], [11.5, .04, .125, .3], [12.4, .014, .104, .5], [20.9, .014, .104, .5], [21.7, .056, .1, FACE]
  ];
  const GIRL_WAY = [
    [0, -.02, .165, .1], [1, -.02, .165, .1], [2, -.02, .165, .4], [10.3, -.02, .165, .4], [10.95, -.02, .165, 0], [11.5, -.005, .19, 0, 'linear'], [11.85, -.005, .19, 0], [12.3, 0, .225, .25, 'out'],
    [13.6, 0, .225, .25], [14.4, 0, .225, .5], [20.9, 0, .225, .5], [21.4, -.04, .18, 1.2, 'out'], [21.9, -.04, .18, KISS]
  ];
  const keysOf = way => [1, 2, 3].map(i => way.map(k => [k[0], k[i], k[4] || 'smooth']));
  const BOY_KEYS = keysOf(BOY_WAY), GIRL_KEYS = keysOf(GIRL_WAY);
  const wayAt = (keys, g) => keys.map(k => tween(g, k));
  /** how high she is: on the deck, hopping up onto the step, standing on it, hopping down */
  const lift = g => (g < 11.85 ? 0 : g < 12.3 ? lerp(0, STEP - D, ease.out(seg(g, 11.85, 12.3))) + .025 * Math.sin(Math.PI * seg(g, 11.85, 12.3))
    : g < 20.9 ? STEP - D : g < 21.4 ? lerp(STEP - D, 0, ease.in(seg(g, 20.9, 21.4))) + .018 * Math.sin(Math.PI * seg(g, 20.9, 21.4)) : .009 * ease.smooth(seg(g, 23, 23.6)));   // on tiptoe for the kiss

  /* ── the dolphins' leaps, on the water on the ship's near side: [start g, end g, from [x, z], to [x, z], height] ── */
  const LEAPS = [[0, 15, 16.3, [.44, -.02], [.27, .2], .13], [1, 15.65, 16.85, [.49, -.1], [.34, .1], .1], [0, 17.2, 18.4, [.42, -.06], [.27, .15], .12],
    [1, 22.4, 23.6, [-.12, -.2], [-.3, -.03], .1]];
  /* the line of bunting in the ship's frame (scenery.js hangs it from the masthead to the stern staff) */
  const MAST_FRONT = V3(-Math.sin(SHIP.yaw) * .013, D + .62, SHIP.mastZ + Math.cos(SHIP.yaw) * .013);   // tied to the side of the mast that faces you
  const LOG_ASIDE = .82;                                             // where the page goes at dusk: down the bunting towards the stern
  const STAR_KEYS = Array.from({ length: 24 }, (_, i) => `star${i}`);
  const STARS = (r => STAR_KEYS.map((_, i) => { const x = (r() - .5) * 1.02; return { x, y: .4 + r() * .38, z: .02 + .02 * r(), color: ['#ffffff', '#fff2c4', '#cfe0ff'][i % 3],
    size: .012 + r() * .014, life: 1e6, shape: i % 3 ? 'glow' : 'star', twinkle: 1.5 + r() * 3 }; }))((s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(4242));

  /* ── arms and hands: reaching for a point in the world ── */
  const vS = new THREE.Vector3(), vT = new THREE.Vector3(), qW = new THREE.Quaternion(), D3 = [0, 0, 0], U3 = [0, 0, 0];
  function reach(m, side, target, k, droop = .25) {
    if (k <= 0) return;
    const b = m.node(`upperarm.${side}`); b.updateWorldMatrix(true, false); vS.setFromMatrixPosition(b.matrixWorld);
    m.root.getWorldQuaternion(qW).invert(); vT.subVectors(target, vS).applyQuaternion(qW);
    D3[0] = vT.x; D3[1] = vT.y; D3[2] = vT.z; U3[0] = vT.x; U3[1] = vT.y - droop * Math.hypot(vT.x, vT.z); U3[2] = vT.z;
    m.aim(`upperarm.${side}`, U3, k); m.aim(`lowerarm.${side}`, D3, k);
  }
  /** a point in a bone's own space (model units), in the world */
  const on = (m, bone, x, y, z, out) => { const b = m.node(bone); b.updateWorldMatrix(true, false); return b.localToWorld(out.set(x, y, z)); };
  /** a point of the ship (its own frame), in the world */
  const aboard = (x, y, z, out) => ship.root.localToWorld(out.set(x, y, z));
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(), vD = new THREE.Vector3(), vE = new THREE.Vector3();
  const STREAM = V3(-.2, .55, -.8).normalize().applyAxisAngle(V3(0, 1, 0), SHIP.yaw);   // the kerchief in her hand flies up and aft (the stage's frame)
  const AWAY = V3(-.35, .5, -.8);                                     // and when she lets it go, up towards the setting sun
  const release = V3();                                              // where her hand was when she let it go
  let asideAt;                                                       // the page's place at dusk, on the bunting
  const toStage = v => stage.worldToLocal(v);

  /* the gull that takes the helm: in from over the stern, down onto the wheel */
  const HELM_SEAT = V3(0, D + .12 + .046 + .036, SHIP.wheelZ);       // on the wheel's top, its feet on the rim
  const HELM_PATH = new THREE.CatmullRomCurve3([V3(.42, .64, -.5), V3(.22, .48, -.3), V3(.06, .32, -.14), HELM_SEAT]);

  return {
    seconds: [10, 10, 10.2],

    build() {
      /* the two of them: him shaved, dark-haired, in a striped sailor's shirt with a red kerchief; her in a coral dress */
      boy = kit.model('boy').fit({ height: .3 }); girl = kit.model('girl').fit({ height: .28 });
      page = S.makePage(); stage.add(page.root);
      sea = S.makeSea(); ship = S.makeShip();
      ship.root.add(boy.root, girl.root);
      hair = C.dressBoy(boy); C.dressGirl(girl);
      kerchief = C.makeKerchief(); boy.node('chest')?.add(kerchief.neck); girl.node('head')?.add(kerchief.band); stage.add(kerchief.ribbon);

      /* the lantern's light, the gulls, the dolphins */
      lamp = new THREE.PointLight(0xffb45a, 0, .7, 2); lamp.position.set(0, -.025, 0); ship.lantern.root.add(lamp);
      glow = kit.glow({ color: 0xffc46a, size: .12, opacity: 0 }); glow.position.set(0, -.025, 0); ship.lantern.root.add(glow);
      helm = C.makeGull(.07); ship.root.add(helm.root);
      flock = [0, 1, 2].map(i => { const gl = C.makeGull(.036 - i * .004); stage.add(gl.root); return gl; });
      dolphins = [C.makeDolphin(.11), C.makeDolphin(.095)]; dolphins.forEach(d => stage.add(d.root));
      wind = S.makeWind([[[-.45, .32, .3], [-.3, .34, .15], [-.12, .36, -.02], [.05, .38, -.18], [.12, .42, -.22], [.1, .45, -.17]],
        [[-.5, .2, .2], [-.32, .21, .05], [-.15, .22, -.1], [0, .24, -.25]], [[-.3, .45, .32], [-.15, .47, .17], [0, .5, .02], [.15, .52, -.12], [.25, .56, -.14], [.24, .58, -.1]],
        [[-.2, .1, .4], [0, .11, .25], [.2, .12, .08], [.38, .14, -.08]], [[-.42, .26, .38], [-.26, .28, .24], [-.1, .3, .1], [.06, .3, -.04], [.14, .33, -.06], [.12, .36, -.02]],
        [[-.4, .55, .1], [-.2, .56, -.05], [0, .58, -.2], [.1, .6, -.28]]]);

      /* the card's words and photo */
      tag = C.makeTag(words('note1', 'Nhắm mắt lại, tin anh nhé')); ship.root.add(tag.root);
      asideAt = ship.bunting.at(LOG_ASIDE);
      log = C.makeLogPage(words('caption', 'Gió biển và em')); ship.root.add(log.root);
      banner = C.makeBanner(words('note2', 'Cùng anh đi đến cuối chân trời')); stage.add(banner.root);
      for (const x of [tag.root, log.root, banner.root]) x.traverse(o => { o.castShadow = false; });

      /* particles */
      spray = kit.particles({ max: 160 }); splash = kit.particles({ max: 120 });
      hearts = kit.particles({ max: 120 }); sparks = kit.particles({ max: 260, additive: true }); stars = kit.particles({ max: 40, additive: true });
      all = [spray, splash, hearts, sparks, stars];
      all.forEach(p => stage.add(p.root));
    },

    reset() {
      for (const p of all) p.clear();
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false);
      const night = ease.inOut(seg(g, 23.2, 26.4)), sunset = seg(g, 20, 23.6);

      /* light: gold through the first two chapters, rose as the sun goes, violet at dusk; the lantern after */
      const L = kit.lights, warm = ease.inOut(sunset);
      L.hemi.color.copy(GOLDEN.hemi).lerp(DUSK.hemi, night); L.hemi.groundColor.copy(GOLDEN.ground).lerp(DUSK.ground, night);
      L.hemi.intensity = lerp(1.15, .9, night); L.sun.color.copy(GOLDEN.sun).lerp(DUSK.sun, Math.max(night, .5 * warm)); L.sun.intensity = lerp(1.55, .78, night);
      L.sun.position.set(-.55, lerp(1.2, .8, warm), .8);

      /* the page folds up, the ship rises out of the sea; it rocks on the swell (by T) */
      const fold = ease.inOut(seg(g, 0, .45)), wob = g > .45 ? Math.exp(-6 * (g - .45)) * Math.sin(14 * (g - .45)) : 0;
      page.root.rotation.x = Math.PI / 2 * (1 - fold) - .1 * wob;
      const rise = ease.back(seg(g, .45, 1.15)), sw = clamp(g - .45);   // out of the sea once it has flowed in and the sky is up
      ship.base.visible = g > .44; ship.base.position.y = lerp(-.11, 0, rise) + .0025 * Math.sin(T * 1.25 + .6) * sw;
      ship.root.rotation.set(.016 * Math.sin(T * 1.25) * sw, 0, .01 * Math.sin(T * .85 + 1) * sw);
      ship.flat.visible = g > .65;
      if (g > .62 && g < 1 && kit.once('rise')) splash.burst(40, i => { const a = i / 40 * TAU; aboard(Math.cos(a) * .17, 0, Math.sin(a) * .3, vA); toStage(vA);
        return { x: vA.x, y: S.WATER + .006, z: vA.z, vx: Math.cos(a) * .12, vy: .3 + rng() * .25, vz: Math.sin(a) * .12, gravity: -1.5, drag: .5, color: i % 3 ? '#e8fbff' : '#ffffff',
          size: .014 + rng() * .01, life: .9, shape: i % 4 ? 'glow' : 'drop', floor: S.WATER + .006 }; });

      /* the sun sinks into the sea, the sky turns rose and violet */
      const sy = lerp(SUN.y0, SUN.set, ease.inOut(sunset));
      page.sun.position.y = sy; page.sunGlow.position.y = sy;
      page.sun.material.color.setRGB(1, lerp(1, .74, warm), lerp(1, .58, warm));
      page.sunGlow.material.opacity = lerp(.75, .35, night) * (1 + .04 * Math.sin(T * 2)) * fold * fold;
      page.sunGlow.material.color.setRGB(1, lerp(.82, .6, warm), lerp(.55, .5, warm));
      page.dusk.material.opacity = night;
      page.sea.material.color.setRGB(lerp(1, .62, night), lerp(1, .55, night), lerp(1, .78, night));
      S.poseSea(T, ease.smooth(seg(g, 0, .3)), night);
      sea.material.color.setRGB(lerp(1, .6, night), lerp(1, .58, night), lerp(1, .8, night));
      S.poseFoam(ship.foam, T, ease.smooth(seg(g, .65, 1.15)));
      if (g > 23.3 && g < 23.8 && kit.once('last-light')) { const x = SUN.x, z = S.pageZ(x) + .015;
        sparks.burst(18, () => ({ x: x + (rng() - .5) * .14, y: HORIZON + .004, z, vx: (rng() - .5) * .1, vy: .02 + rng() * .05, drag: 1.5, color: rng() < .5 ? '#fff1b8' : '#ffd27a',
          size: .014 + rng() * .01, life: 1.1, shape: 'sparkle', spin: 3 })); }

      /* the wind: streaks past the ship, the flags, the bunting; it blows hardest while she flies */
      const blow = clamp(.5 + .5 * seg(g, 13.6, 15) - .55 * seg(g, 19.8, 21) + .9 * bump(g, 8.5, 8.7, 9.2, 9.8) + .6 * bump(g, 10, 10.1, 10.6, 11), 0, 1.4);
      S.poseWind(wind, T, g < .8 ? 0 : clamp(blow), 2.4);
      S.ripple(ship.flag, T, .6 + .5 * blow);
      ship.bunting.flags.forEach((f, i) => { f.rotation.x = -(.45 + .3 * blow) - .2 * Math.sin(T * (8 + 4 * blow) + i * 1.3); f.rotation.z = .1 * Math.sin(T * 6 + i); });

      /* the two of them: where they stand, which way they look, which clip */
      const [bx, bz, br] = wayAt(BOY_KEYS, g), [gx, gz, gr] = wayAt(GIRL_KEYS, g);
      boy.root.position.set(bx, D, bz); boy.root.rotation.y = br;
      const startle = .014 * Math.sin(Math.PI * seg(g, 7.02, 7.28));
      girl.root.position.set(gx, D + lift(g) + startle, gz); girl.root.rotation.y = gr;
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g);
      boy.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);
      ship.root.updateWorldMatrix(true, true);

      /* bodies first, so the reaches below start from where the shoulders end up */
      const sneak = bump(g, 4.2, 4.5, 6.2, 6.5), lean1 = bump(g, .9, 1.4, 6.6, 7.2), laugh1 = bump(g, 7.1, 7.3, 8.1, 8.4);
      const whisper = bump(g, 8, 8.3, 9.4, 9.8), nod = bump(g, 8.55, 8.65, 9.35, 9.5), sway = .025 * Math.sin(T * 1.3);
      if (sneak) { boy.bend('spine', .14 * sneak, 0, 0); boy.bend('chest', .1 * sneak, 0, 0); }
      if (lean1) { girl.bend('chest', .12 * lean1, 0, 0); girl.bend('head', -.08 * lean1, .3 * Math.sin(g * .9) * lean1, 0); }
      const spray1 = bump(g, 2.25, 2.35, 2.75, 3.1);                    // a wave breaks on the bow: she leans back and laughs
      if (spray1) { girl.bend('chest', -.16 * spray1, 0, 0); girl.bend('head', -.15 * spray1, 0, .1 * Math.sin(g * 30) * spray1); }
      if (laugh1) { girl.bend('chest', -.06 * laugh1 + .03 * Math.sin(g * 32) * laugh1, 0, 0); girl.bend('head', -.12 * laugh1, -.2 * laugh1, -.1 * laugh1); }
      if (whisper) { boy.bend('chest', .06 * whisper, 0, 0); boy.bend('head', .08 * whisper, -.2 * whisper, .24 * whisper); }
      if (nod) girl.bend('head', .16 * Math.abs(Math.sin((g - 8.55) * 7)) * nod, 0, 0);
      if (g > 6.6 && g < 11) { boy.bend('spine', 0, 0, sway * .5); girl.bend('spine', 0, 0, sway * .5); }

      /* chapter 1: he steers, then hands the wheel to the gull and salutes it */
      const helmK = 1 - ease.smooth(seg(g, 3.45, 3.7));
      ship.wheel.spin.rotation.z = (.35 * Math.sin(g * .9) + .1 * Math.sin(T * .7)) * (g < 3.6 ? 1 : .4);
      if (helmK > 0) {
        for (const [side, a] of [['r', 2.5], ['l', .64]]) {
          const ang = a + ship.wheel.spin.rotation.z; aboard(Math.cos(ang) * .036, D + .12 + Math.sin(ang) * .036, SHIP.wheelZ - .006, vA);
          reach(boy, side, vA, helmK, .3);
        }
        boy.bend('head', -.05, .25 * Math.sin(g * .7), 0);
      }
      const salute = bump(g, 3.6, 3.8, 4.05, 4.25);
      if (salute) { boy.aim('upperarm.r', [-.75, .45, .45], salute); boy.aim('lowerarm.r', [.65, .55, .2], salute); boy.bend('head', -.15 * salute, 0, 0); }
      if (sneak) {                                                      // tiptoe: hands up in front, shoulders hunched
        boy.aim('upperarm.l', [.35, -.4, .85], sneak); boy.aim('lowerarm.l', [-.1, .75, .65], sneak);
        boy.aim('upperarm.r', [-.35, -.4, .85], sneak); boy.aim('lowerarm.r', [.1, .75, .65], sneak);
        boy.bend('head', .12 * sneak, -.3 * sneak, 0);
      }

      /* she leans on the rail, a hand shading her eyes as she looks out */
      if (lean1 && g < 7) {
        reach(girl, 'r', aboard(-.105, D + .072, .2, vA), lean1, .2);
        girl.aim('upperarm.l', [.45, .55, .7], lean1 * (1 - spray1)); girl.aim('lowerarm.l', [-.75, .5, .45], lean1 * (1 - spray1));
      }

      /* he unknots his kerchief and ties it over her eyes from behind; she jumps, her hands fly up to it; he steps to her side */
      const untie = bump(g, 6.25, 6.4, 6.55, 6.7), tie = bump(g, 6.55, 6.75, 7.1, 7.35);
      if (untie) { reach(boy, 'r', on(boy, 'chest', -.12, .32, .55, vA), untie, .1); reach(boy, 'l', on(boy, 'chest', .12, .32, .55, vB), untie, .1); }
      if (tie) { reach(boy, 'r', on(girl, 'head', -.32, .4, -.5, vA), tie, .15); reach(boy, 'l', on(girl, 'head', .32, .4, -.5, vB), tie, .15); boy.bend('head', .12 * tie, 0, 0); }
      const touchL = bump(g, 7.05, 7.25, 10.25, 10.5), touchR = bump(g, 7.05, 7.25, 10.9, 11.3);
      if (touchL) reach(girl, 'l', on(girl, 'head', .55, .36, .25, vA), touchL, .1);
      if (touchR) reach(girl, 'r', on(girl, 'head', -.55, .36, .25, vA), touchR, .1);
      const shoulder = bump(g, 8.1, 8.4, 10.3, 10.6);                 // at her side: his hand on her shoulder
      if (shoulder) reach(boy, 'r', on(girl, 'upperarm.l', 0, 0, 0, vA), shoulder, .3);
      if (g > 7.4 && g < 9 && kit.once('giggle')) { on(girl, 'head', 0, .9, 0, vA); toStage(vA);
        hearts.burst(8, () => ({ x: vA.x, y: vA.y, z: vA.z, vx: (rng() - .5) * .14, vy: .1 + rng() * .08, gravity: -.06, drag: .7,
          color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .02 + rng() * .012, life: 1.8, shape: 'heart', spin: (rng() - .5) * 3 })); }
      if (g > 8.3 && g < 9.2 && kit.once('whisper')) { on(boy, 'head', -.4, .3, .4, vA); toStage(vA);
        hearts.burst(3, i => ({ x: vA.x, y: vA.y, z: vA.z, vx: -.03 + i * .03, vy: .08, drag: .5, color: '#ff8fab', size: .016, life: 1.4, shape: 'heart' })); }

      /* chapter 2: he takes her hand and leads her to the bow, eyes shut under her own hand; up onto the step */
      const lead = bump(g, 10.3, 10.6, 11.4, 11.7), pull = bump(g, 13.65, 13.85, 13.95, 14.15);
      if (lead) {
        on(boy, 'upperarm.r', 0, 0, 0, vA); on(girl, 'upperarm.l', 0, 0, 0, vB); vC.addVectors(vA, vB).multiplyScalar(.5);
        aboard(0, D + .1, 0, vD); vC.y = vD.y + .002;
        reach(boy, 'r', vC, lead, .3); reach(girl, 'l', vC, lead, .3);
      }
      if (pull) reach(girl, 'r', on(girl, 'head', -.15, .4, .7, vA), pull, .1);
      const waist = bump(g, 11.35, 11.6, 20.3, 20.7);                  // his hands at her waist: lifting her, then holding her
      if (waist) { reach(boy, 'l', on(girl, 'hips', .3, .25, .05, vA), waist, .35); reach(boy, 'r', on(girl, 'hips', -.3, .25, .05, vB), waist, .35); }
      if (g > 12.2 && g < 12.6 && kit.once('step-up')) { aboard(0, STEP, SHIP.step.z, vA); toStage(vA);
        sparks.burst(10, () => ({ x: vA.x, y: vA.y + .01, z: vA.z, vx: (rng() - .5) * .2, vy: .05 + rng() * .1, vz: (rng() - .5) * .2, drag: 2, color: '#fff1b8', size: .016, life: .7, shape: 'sparkle', spin: 4 })); }

      /* she holds the rail, opens her eyes, and spreads her arms into the wind */
      const rail = bump(g, 12.6, 12.9, 13.65, 14.3), wings = ease.inOut(seg(g, 14, 15.2)) * (1 - ease.inOut(seg(g, 20.05, 20.9)));
      if (rail) { reach(girl, 'r', aboard(-.07, D + .074, .262, vA), rail * (1 - pull), .1); reach(girl, 'l', aboard(.07, D + .074, .262, vB), rail, .1); }
      if (wings) {
        const flap = .07 * Math.sin(T * 2.2);
        girl.aim('upperarm.l', [1, .14 + flap, .12], wings); girl.aim('lowerarm.l', [1, .22 + flap * 1.4, .16], wings);
        girl.aim('upperarm.r', [-1, .14 - flap, .12], wings); girl.aim('lowerarm.r', [-1, .22 - flap * 1.4, .16], wings);
      }
      const look = ease.inOut(seg(g, 13.7, 14.6)) * (1 - ease.inOut(seg(g, 20, 20.8)));
      if (look) girl.bend('head', -.22 * look, 0, 0);
      const laugh2 = bump(g, 15.6, 15.9, 16.6, 17);
      if (laugh2) { girl.bend('head', -.18 * laugh2, 0, .06 * Math.sin(g * 28) * laugh2); girl.bend('chest', -.05 * laugh2, 0, 0); }
      const cheek = bump(g, 14.6, 15.2, 20.2, 20.7);
      if (cheek) { boy.bend('spine', .06 * cheek, 0, 0); boy.bend('chest', .1 * cheek, 0, 0); boy.bend('head', -.06 * cheek, -.25 * cheek, .22 * cheek); }
      if (wings > .5 && dt && rng() < dt * 10) {                         // the wind full of light round her
        on(girl, 'chest', (rng() - .5) * 2.4, .2 + rng() * .5, .4, vA); toStage(vA);
        sparks.emit({ x: vA.x, y: vA.y, z: vA.z, vx: .1 * Math.sin(-SHIP.yaw), vy: .02, vz: -.12, drag: .4, color: rng() < .6 ? '#fff1b8' : '#ffd1dc', size: .012 + rng() * .008, life: 1, shape: 'sparkle', spin: 3 });
      }

      /* chapter 3: she steps down and turns to him; they hold hands; they kiss as the sun goes */
      const hands = bump(g, 21.6, 21.95, 23.05, 23.4), kiss = ease.inOut(seg(g, 23, 23.7));
      if (hands) {
        on(boy, 'hips', 0, .3, 0, vA); on(girl, 'hips', 0, .3, 0, vB); vC.addVectors(vA, vB).multiplyScalar(.5);
        vD.subVectors(vB, vA).cross(vE.set(0, 1, 0)).normalize().multiplyScalar(.012);
        reach(boy, 'r', vE.copy(vC).add(vD), hands, .3); reach(girl, 'l', vE.copy(vC).add(vD), hands, .3);
        reach(boy, 'l', vE.copy(vC).sub(vD), hands, .3); reach(girl, 'r', vE.copy(vC).sub(vD), hands, .3);
        girl.bend('head', -.1 * hands, 0, 0); boy.bend('head', .06 * hands, 0, 0);
      }
      if (kiss) {                                                      // heads level: she on tiptoe, her face up to his
        girl.bend('chest', .06 * kiss, 0, 0); girl.bend('head', -.06 * kiss, 0, 0);
        boy.bend('chest', .07 * kiss, 0, 0); boy.bend('head', .05 * kiss, 0, 0);
        reach(girl, 'l', on(boy, 'upperarm.r', 0, 0, 0, vA), kiss, .15); reach(girl, 'r', on(boy, 'upperarm.l', 0, 0, 0, vB), kiss, .15);
        reach(boy, 'l', on(girl, 'hips', .35, .3, -.1, vA), kiss, .25); reach(boy, 'r', on(girl, 'hips', -.35, .3, -.1, vB), kiss, .25);
        girl.bend('lowerleg.r', .9 * ease.smooth(seg(g, 23.5, 24)), 0, 0);   // one foot up, behind her
        if (g > 23.6) { boy.bend('spine', 0, 0, sway * .3); girl.bend('spine', 0, 0, sway * .3); }
      }
      if (g > 23.65 && g < 24.2 && kit.once('kiss')) { on(girl, 'head', .5, .6, .5, vA); toStage(vA);
        hearts.burst(16, () => ({ x: vA.x, y: vA.y, z: vA.z, vx: (rng() - .5) * .2, vy: .12 + rng() * .12, vz: (rng() - .5) * .06, gravity: -.06, drag: .6,
          color: ['#ff4f7b', '#ff8fab', '#ffc2d1', '#e8436d'][(rng() * 4) | 0], size: .022 + rng() * .016, life: 2.4, shape: 'heart', spin: (rng() - .5) * 3 })); }
      if (held && g > 29 && dt && rng() < dt * 1.4) { on(girl, 'head', .5, .7, .4, vA); toStage(vA);
        hearts.emit({ x: vA.x, y: vA.y, z: vA.z, vy: .05, sway: .03, color: '#ff8fab', size: .018, life: 2.4, shape: 'heart' }); }

      /* the kerchief: at his collar, then round her eyes (its tails flutter), then flying from her hand, then off to the sunset */
      kerchief.neck.visible = g < 6.6;
      kerchief.band.visible = g >= 6.8 && g < 13.95;
      kerchief.wrap.scale.set(Math.max(.001, ease.out(seg(g, 6.8, 7.1))), 1, Math.max(.001, ease.out(seg(g, 6.8, 7.1))));
      kerchief.tails.forEach((t, i) => t.rotation.set(-.35 - .25 * blow - .2 * Math.sin(T * 9 + i * 2), 0, (i ? .45 : -.45) + .1 * Math.sin(T * 7 + i)));
      kerchief.ribbon.visible = g >= 13.95 && g < 22.6;
      if (kerchief.ribbon.visible) {
        if (g < 20.1) { on(girl, 'handslot.r', 0, 0, 0, vA); toStage(vA); release.copy(vA); }
        const away = ease.out(seg(g, 20.1, 22.4));
        vA.copy(release).addScaledVector(AWAY, .55 * away); vA.x += .03 * Math.sin(g * 4) * away;
        kerchief.set(vA, away ? vB.copy(STREAM).lerp(vC.set(.3, -.2, .9), .5 * Math.sin(g * 3) * away).normalize() : STREAM, clamp(blow), T, ease.out(seg(g, 13.95, 14.4)));
        kerchief.ribbon.material.opacity = 1 - seg(g, 21.8, 22.5); kerchief.ribbon.material.transparent = away > 0;
      }
      hair.tufts.forEach((t, i) => { t.rotation.z = (i ? .5 : .2) + .12 * Math.sin(T * 9 + i * 2) * (.5 + blow); });

      /* the gull that takes the helm: it lands on the wheel, nods to his salute, and keeps watch */
      const hk = seg(g, 2.4, 3.35);
      if (g < 2.4) helm.root.visible = false;
      else {
        helm.root.visible = true;
        if (hk < 1) {
          const u = ease.out(hk); HELM_PATH.getPointAt(u, vA); HELM_PATH.getTangentAt(Math.min(.999, u), vB);
          helm.root.position.copy(vA); helm.root.rotation.set(-Math.asin(clamp(vB.y, -1, 1)) * .5, Math.atan2(vB.x, vB.z), .2 * Math.sin(hk * 6));
        } else { helm.root.position.copy(HELM_SEAT); helm.root.position.y += .002 * Math.abs(Math.sin(T * 2)); helm.root.rotation.set(0, Math.PI * bump(g, 3.4, 3.65, 4.5, 4.85), 0); }   // turns to him for the salute
        const settle = ease.smooth(seg(g, 3.2, 3.55)), shuffle = bump(g, 9.9, 10, 10.3, 10.5) + bump(g, 24.4, 24.5, 24.8, 25);
        helm.pose({ flap: hk < .85 ? .9 : lerp(.9, .4, seg(hk, .85, 1)) * (1 - settle) + .6 * shuffle, ph: T * 16, fold: settle * (1 - .7 * shuffle), legsDown: seg(g, 3, 3.3),
          look: hk < 1 ? 0 : .5 * Math.sin(T * .8) * (1 - bump(g, 3.6, 3.7, 4.3, 4.4)), nod: .3 * Math.abs(Math.sin((g - 3.9) * 9)) * bump(g, 3.85, 3.95, 4.35, 4.5) });
      }
      /* a few more gulls far back, gliding over the sea; home at dusk */
      flock.forEach((gl, i) => {
        const k = ((T * .05 + i * .37) % 1), x = lerp(-.62, .62, i % 2 ? 1 - k : k), y = .58 + i * .06 + .02 * Math.sin(T * 1.1 + i), z = S.pageZ(x) + .03 + i * .015;
        gl.root.position.set(x, y, z); gl.root.rotation.set(0, i % 2 ? -Math.PI / 2 : Math.PI / 2, .15 * Math.sin(T * .9 + i));
        gl.root.visible = g > .9 && night < .98; gl.root.scale.setScalar(Math.max(.001, (1 - night) * clamp(g - .9)));
        gl.pose({ flap: .5 + .5 * Math.max(0, Math.sin(T * .7 + i * 2)), ph: T * 14 + i });
      });

      /* the dolphins leap alongside, a splash where each comes out and goes back in */
      LEAPS.forEach(([who, a, b, from, to, h], n) => {
        const t = (g - a) / (b - a), d = dolphins[who];
        if (g > a - .05 && g < b + .05) d.leap(t, from, to, h, T);
        else if (!LEAPS.some(([w2, a2, b2]) => w2 === who && g > a2 - .05 && g < b2 + .05)) d.root.visible = false;
        for (const [k, at] of [[`out${n}`, from], [`in${n}`, to]]) {
          const tt = k[0] === 'o' ? a + .02 : b - .06;
          if (g > tt && g < tt + .4 && kit.once(k)) splash.burst(16, () => ({ x: at[0] + (rng() - .5) * .03, y: S.WATER + .006, z: at[1] + (rng() - .5) * .03, vx: (rng() - .5) * .16,
            vy: .22 + rng() * .2, vz: (rng() - .5) * .16, gravity: -1.3, drag: .5, color: rng() < .7 ? '#ffffff' : '#bfefff', size: .012 + rng() * .01, life: .8, shape: rng() < .7 ? 'glow' : 'drop', floor: S.WATER + .006 }));
        }
      });

      /* spray where the bow dips into the swell (by T) */
      if (dt && g > 1 && rng() < dt * 26 * Math.max(0, -Math.cos(T * 1.25)) ** 4 * (.6 + .6 * clamp(blow))) {
        for (const s of [-1, 1]) {
          aboard(s * .012, .012, SHIP.bow - .01, vA); toStage(vA); aboard(s * .3, .25, -.15, vB); aboard(0, 0, 0, vC); vB.sub(vC);
          spray.emit({ x: vA.x, y: vA.y, z: vA.z, vx: vB.x * (.6 + rng() * .5), vy: .18 + rng() * .2, vz: vB.z * (.6 + rng() * .5), gravity: -1.1, drag: .6,
            color: rng() < .7 ? '#ffffff' : '#c8f2ff', size: .01 + rng() * .01, life: .7, shape: rng() < .6 ? 'glow' : 'drop', floor: S.WATER + .006 });
        }
      }

      /* the tag on the bunting: its back to you, fluttering, until a gust spins it round; at the next tap the wind takes it */
      tag.root.position.copy(MAST_FRONT);
      const spin = ease.elastic(seg(g, 8.6, 9.7)), gone = ease.in(seg(g, 10, 11));
      tag.root.rotation.set(0, -SHIP.yaw, .04 * Math.sin(T * 1.6) * (1 - gone));
      tag.card.rotation.set(.12 * Math.sin(T * 2.3) * (1 - spin * .6), lerp(Math.PI + .35 + .25 * Math.sin(T * 5), 2 * TAU, spin) + 6 * gone, .1 * Math.sin(T * 3) * (1 - spin));   // its back to you, then a turn and a half
      tag.root.position.x += -.5 * gone; tag.root.position.y += .3 * gone + .05 * Math.sin(gone * 9); tag.root.position.z += -.25 * gone;
      tag.root.scale.setScalar(Math.max(.001, (1 - gone) * ease.back(seg(g, .6, 1.1))));
      if (g > 9 && g < 9.6 && kit.once('tag')) { aboard(MAST_FRONT.x, MAST_FRONT.y - .1, MAST_FRONT.z, vA); toStage(vA);
        sparks.burst(16, () => ({ x: vA.x + (rng() - .5) * .3, y: vA.y + (rng() - .5) * .15, z: vA.z + .02, vx: (rng() - .5) * .1, vy: (rng() - .3) * .1, drag: 2,
          color: ['#fff1b8', '#ffd1dc', '#ffffff'][(rng() * 3) | 0], size: .018, life: .9, shape: 'sparkle', spin: 4 })); }

      /* the page of the log blows in over the bow, tumbling, and is pegged to the bunting; aside, smaller, at dusk */
      const fly = seg(g, 17, 18.9), aside = ease.inOut(seg(g, 20.3, 21.4));
      const peg = vE.copy(asideAt).lerp(MAST_FRONT, 1 - aside);
      if (fly < 1) {
        const k = ease.inOut(fly); aboard(peg.x, peg.y, peg.z, vB); vA.set(-.75, .62, .55);   // from the front, off the card on the left
        toStage(vB); vC.lerpVectors(vA, vB, k); vC.y += .12 * Math.sin(Math.PI * k);
        stage.localToWorld(vC); ship.root.worldToLocal(vC); log.root.position.copy(vC);
        log.root.rotation.set(1.2 * (1 - k) * Math.sin(g * 5), -SHIP.yaw + 4 * TAU * (1 - k) / 2, .8 * (1 - k) * Math.sin(g * 7));
      } else { log.root.position.copy(peg); log.root.rotation.set(.05 * Math.sin(T * 1.7), -SHIP.yaw + .06 * Math.sin(T * 1.1), .04 * Math.sin(T * 1.3)); }
      log.root.visible = g > 17;
      log.root.scale.setScalar(Math.max(.001, lerp(.5, 1, ease.out(fly)) * lerp(1, .58, aside)));
      log.peg.scale.setScalar(1 + .5 * bump(g, 18.85, 18.95, 19.05, 19.3));
      log.photo.halo.material.opacity = .55 * ease.out(seg(g, 19, 19.7)) * (1 - .5 * aside) * (1 + .08 * Math.sin(T * 3));
      if (g > 18.9 && g < 19.4 && kit.once('pegged')) { aboard(peg.x, peg.y - .12, peg.z, vA); toStage(vA);
        sparks.burst(22, i => { const a = i / 22 * TAU; return { x: vA.x + Math.cos(a) * .15, y: vA.y + Math.sin(a) * .17, z: vA.z + .02, vx: Math.cos(a) * .05, vy: Math.sin(a) * .05,
          drag: 1.5, color: i % 2 ? '#fff1b8' : '#ffd1dc', size: .018, life: 1, shape: 'sparkle', spin: 3 }; }); }

      /* the lantern lights at dusk, the cabin's round windows glow */
      const lit = g < 25 ? 0 : g < 25.5 ? (Math.sin((g - 25) * 40) > 0 ? .6 : .15) * seg(g, 25, 25.5) : ease.smooth(seg(g, 25.5, 25.9));
      const flicker = 1 + .06 * Math.sin(T * 13) + .04 * Math.sin(T * 7.3);
      lamp.intensity = 1.6 * lit * flicker; glow.material.opacity = .9 * lit * flicker;
      ship.lantern.glass.material.emissiveIntensity = 1.4 * lit; ship.lantern.flame.material.color.setRGB(lerp(.35, 1, lit), lerp(.29, .85, lit), lerp(.23, .45, lit));
      ship.cabin.glow.emissiveIntensity = 1.1 * ease.smooth(seg(g, 25.4, 26.2)) * flicker;
      ship.lantern.root.rotation.set(.12 * Math.sin(T * 1.25 + .4), 0, .08 * Math.sin(T * .85 + 1.4));

      /* the first stars, one after another */
      STAR_KEYS.forEach((key, i) => { if (night > .2 + i * .028 && kit.once(key)) stars.emit({ ...STARS[i], z: S.pageZ(STARS[i].x) + STARS[i].z }); });

      /* two gulls fly in the banner with the last words and hold it up over the ship */
      const bIn = ease.inOut(seg(g, 26, 27.6)), open = ease.out(seg(g, 27.3, 28.3));
      banner.root.visible = g > 26;
      banner.root.position.set(lerp(.75, .02, bIn), lerp(.95, .76, bIn) + .008 * Math.sin(T * 1.6), lerp(-.25, .07, bIn));   // in front of the masthead
      banner.root.rotation.set(-.08, 0, .03 * Math.sin(T * 1.1) * open);
      banner.wave(T, open);
      banner.gulls.forEach((gl, i) => gl.pose({ flap: 1, ph: T * 15 + i * 1.7 }));
      if (g > 28 && g < 28.5 && kit.once('banner')) sparks.burst(26, i => ({ x: lerp(-.3, .32, i / 25), y: .76 + (rng() - .5) * .14, z: .08, vx: (rng() - .5) * .06, vy: (rng() - .3) * .06,
        drag: 1.5, color: i % 2 ? '#fff1c4' : '#ffd1dc', size: .016, life: 1.2, shape: 'sparkle', spin: 3 }));

      for (const p of all) p.update(dt, T);
    }
  };
};
