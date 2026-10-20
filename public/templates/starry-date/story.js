/* Hẹn hò dưới sao (a starry date), told by the shared act _acts/lovestory.js. Three chapters, each ending at a stop:
     1 · 0–6.5 s     night falls; he walks in from the left, she from the right; he waves, she cheers; a heart pops and
                     a note with the card's first words (note1) comes up
     2 · 6.5–12.6 s  a picnic blanket unrolls, they sit down side by side, a shooting star crosses, fireflies come out and
                     the card's photo rises in a glow with its caption
     3 · 12.6–18.8 s they stand, face each other, hug and kiss; hearts burst and a banner with the last words (note2)
                     rises among fireworks
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const H = 0.3;                                                     // the sweethearts' height, in card widths
  const NIGHT = { hemi: new THREE.Color('#b9c4ff'), ground: new THREE.Color('#3b2f5c'), sun: new THREE.Color('#c9d2ff') };
  const DAY = { hemi: new THREE.Color('#fff6f0'), ground: new THREE.Color('#c9a9c4'), sun: new THREE.Color('#ffffff') };
  let boy, girl, note, banner, photo, moon, lamp, lampLight, lampGlow, blanket, heartPic, stars, hearts, sparks, flies;

  /* the pose a character holds at story time g: which clip, where, which way it looks */
  const BOY = [                                                      // [from g, clip, options]
    [0, 'Idle'], [.35, 'Walking_A', { speed: 1.6 }], [3, 'Idle'], [7, 'Walking_A'], [7.55, 'Sit_Floor_Down', { once: true, fade: .2 }],
    [8.6, 'Sit_Floor_Idle', { fade: .3 }], [12.85, 'Sit_Floor_StandUp', { once: true, fade: .2 }], [13.9, 'Idle'], [14.05, 'Walking_A'], [14.6, 'Idle']
  ];
  const GIRL = [
    [0, 'Idle'], [.65, 'Walking_A', { speed: 1.6 }], [3.2, 'Idle'], [3.5, 'Cheer', { once: true }], [5.1, 'Idle'], [7.05, 'Walking_A'],
    [7.6, 'Sit_Floor_Down', { once: true, fade: .2 }], [8.65, 'Sit_Floor_Idle', { fade: .3 }], [12.95, 'Sit_Floor_StandUp', { once: true, fade: .2 }],
    [14, 'Idle'], [14.1, 'Walking_A'], [14.65, 'Idle']
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };

  function gingham(c, px) {                                          // the picnic blanket: red and white checks with a hem
    c.fillStyle = '#fff6f2'; c.fillRect(0, 0, px, px);
    const n = 8, w = px / n;
    c.fillStyle = 'rgba(214,52,84,.55)';
    for (let i = 0; i < n; i += 2) { c.fillRect(i * w, 0, w, px); c.fillRect(0, i * w, px, w); }
    c.strokeStyle = '#b8243f'; c.lineWidth = px * .025; c.strokeRect(px * .02, px * .02, px * .96, px * .96);
  }

  return {
    seconds: [6.5, 6.1, 6.2],

    build() {
      /* the two of them */
      boy = kit.model('boy').fit({ height: H }); girl = kit.model('girl').fit({ height: H });
      stage.add(boy.root, girl.root);

      /* the night: a crescent moon, stars, a street lamp that lights up */
      moon = kit.picture((c, px) => {
        const g = c.createRadialGradient(px / 2, px / 2, px * .18, px / 2, px / 2, px * .5);
        g.addColorStop(0, 'rgba(255,240,190,.55)'); g.addColorStop(1, 'rgba(255,240,190,0)'); c.fillStyle = g; c.fillRect(0, 0, px, px);
        c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(px / 2, px / 2, px * .22, 0, 7); c.fill();
        c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(px * .6, px * .43, px * .2, 0, 7); c.fill();
      }, { size: .2 });
      moon.position.set(-.36, .7, -.26); stage.add(moon);

      lamp = new THREE.Group(); lamp.position.set(.38, 0, -.17); stage.add(lamp);
      const iron = kit.keep(new THREE.MeshStandardMaterial({ color: 0x2d3b4f, roughness: .5, metalness: .4 }));
      const pole = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.007, .01, .34, 10)), iron); pole.position.y = .17; pole.castShadow = true;
      const foot = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.022, .028, .02, 12)), iron); foot.position.y = .01;
      const cap = new THREE.Mesh(kit.keep(new THREE.ConeGeometry(.032, .025, 4)), iron); cap.position.y = .378; cap.rotation.y = Math.PI / 4;
      const glass = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(.034, .04, .034)),
        kit.keep(new THREE.MeshStandardMaterial({ color: 0xfff2c2, emissive: 0xffc46b, emissiveIntensity: 0, roughness: .3 })));
      glass.position.y = .346;
      lamp.add(pole, foot, cap, glass); lamp.userData.glass = glass;
      lampGlow = kit.glow({ color: 0xffc879, size: .26, opacity: 0 }); lampGlow.position.y = .346; lamp.add(lampGlow);
      lampLight = new THREE.PointLight(0xffb86b, 0, 1.4, 1.6); lampLight.position.y = .33; lamp.add(lampLight);

      /* the picnic blanket, rolled up at its back edge until it unrolls */
      blanket = new THREE.Group(); blanket.position.set(0, .002, -.11); stage.add(blanket);
      const cloth = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(.42, .004, .26)),
        kit.keep(new THREE.MeshStandardMaterial({ map: kit.keep(new THREE.CanvasTexture((() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; gingham(cv.getContext('2d'), 256); return cv; })())), roughness: .95 })));
      cloth.material.map.colorSpace = THREE.SRGBColorSpace; cloth.position.z = .13; cloth.receiveShadow = true; blanket.add(cloth);

      /* the card's words and photo */
      note = kit.sign({ text: words('note1', 'Ngày đầu gặp nhau, tim anh lỡ một nhịp'), width: .38, accent: '#ff7aa2', glow: .5 });
      banner = kit.sign({ text: words('note2', 'Thương em nhiều lắm!'), style: 'banner', width: .58, accent: '#e8436d', glow: .45 });
      photo = kit.polaroid({ width: .22, caption: words('caption', 'Mình của những ngày đầu'), glow: .55, halo: true });
      heartPic = kit.picture((c, px) => { c.fillStyle = '#ff4f7b'; kit.heartPath(c, px / 2, px * .52, px * .86); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(px * .34, px * .36, px * .08, px * .05, -.6, 0, 7); c.fill(); }, { size: .1 });
      stage.add(note.root, banner.root, photo.root, heartPic);

      /* particles */
      stars = kit.particles({ max: 90, additive: true });
      hearts = kit.particles({ max: 160 });
      sparks = kit.particles({ max: 260, additive: true });
      flies = kit.particles({ max: 60, additive: true });
      stage.add(stars.root, hearts.root, sparks.root, flies.root);
    },

    reset() {
      [stars, hearts, sparks, flies].forEach(p => p.clear());
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      const night = ease.smooth(seg(g, 0, 1.4));

      /* light: dusk to night, the lamp warms the two of them */
      kit.lights.hemi.color.copy(DAY.hemi).lerp(NIGHT.hemi, night); kit.lights.hemi.groundColor.copy(DAY.ground).lerp(NIGHT.ground, night);
      kit.lights.hemi.intensity = lerp(1.1, .62, night); kit.lights.sun.color.copy(DAY.sun).lerp(NIGHT.sun, night); kit.lights.sun.intensity = lerp(1.5, .75, night);
      const on = ease.out(seg(g, .5, 1.2)), flicker = 1 + .06 * Math.sin(T * 13) * Math.sin(T * 7.3);
      lampGlow.material.opacity = .85 * on * flicker; lampLight.intensity = 1.4 * on * flicker;
      lamp.userData.glass.material.emissiveIntensity = 1.6 * on;
      moon.material.opacity = night; moon.position.y = .62 + .08 * ease.out(seg(g, 0, 2)) + .004 * Math.sin(T * .7);

      if (g > .15 && kit.once('stars')) stars.burst(70, i => ({ x: (rng() - .5) * 1.25, y: .42 + rng() * .5, z: -.32 + rng() * .18,
        color: ['#ffffff', '#fff2c4', '#cfe0ff'][i % 3], size: .008 + rng() * .016, life: 1e6, shape: i % 5 ? 'glow' : 'sparkle', twinkle: 1.5 + rng() * 3.5 }));

      /* the sweethearts: where they are and which way they look */
      const walkIn = ease.inOut(seg(g, .35, 3)), walkIn2 = ease.inOut(seg(g, .65, 3.2));
      const sitTurn = ease.inOut(seg(g, 7, 7.6)), standTurn = ease.inOut(seg(g, 14.05, 14.6));
      const close = ease.inOut(seg(g, 14.05, 14.6));
      boy.root.position.set(lerp(lerp(-.52, -.1, walkIn), -.064, close), 0, lerp(0, .035, sitTurn) * (1 - standTurn));   // .42 in 2.65 s: walk speed 1.6
      girl.root.position.set(lerp(lerp(.52, .1, walkIn2), .064, close), 0, lerp(0, .035, sitTurn) * (1 - standTurn));
      const faceIn = Math.PI / 2, faceFront = .28;
      boy.root.rotation.y = lerp(lerp(faceIn, faceFront, sitTurn), faceIn, standTurn);
      girl.root.rotation.y = -lerp(lerp(faceIn, faceFront, sitTurn), faceIn, standTurn);
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g);
      boy.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);

      /* gestures the clips do not have */
      const wave = seg(g, 3, 3.35) * (1 - seg(g, 4.4, 4.8));
      if (wave) { boy.aim('upperarm.r', [-.4, .85, .3], wave); boy.aim('lowerarm.r', [-.05 + .45 * Math.sin(T * 9), 1, .3], wave); }   // the arm nearer the phone
      const lean = seg(g, 9, 9.8) * (1 - seg(g, 12.6, 12.9));            // sitting: she rests her head towards him
      if (lean) { girl.bend('head', 0, 0, -.32, lean); boy.bend('head', 0, 0, .18, lean); }
      const hug = ease.smooth(seg(g, 14.6, 15.3));
      if (hug) for (const m of [boy, girl]) {
        m.aim('upperarm.r', [-.42, .05, .9], hug); m.aim('lowerarm.r', [.8, .1, .6], hug);
        m.aim('upperarm.l', [.42, .05, .9], hug); m.aim('lowerarm.l', [-.8, .1, .6], hug);
      }
      const kiss = ease.smooth(seg(g, 15.3, 16)) * (1 - .6 * seg(g, 17.6, 18.4));
      if (kiss) for (const m of [boy, girl]) { m.bend('chest', .2, 0, 0, kiss); m.bend('head', .14, 0, 0, kiss); }

      /* chapter 1: a heart, then the first note */
      if (g > 4.3 && kit.once('meet')) hearts.burst(16, () => ({ x: (rng() - .5) * .06, y: .3, z: 0, vx: (rng() - .5) * .22, vy: .18 + rng() * .14,
        vz: (rng() - .5) * .08, gravity: -.12, drag: .6, color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .03 + rng() * .02, life: 2.2, shape: 'heart', spin: (rng() - .5) * 3 }));
      const n = ease.back(seg(g, 4.9, 5.7)) * (1 - ease.in(seg(g, 6.5, 7.1)));
      note.root.scale.setScalar(Math.max(.001, n));
      note.root.position.set(0, .48 + .12 * seg(g, 6.5, 7.1) + .008 * Math.sin(T * 1.6), .02);
      note.root.rotation.set(-.12, 0, .04 * Math.sin(T * .9));

      /* chapter 2: the blanket, a shooting star, fireflies, the photo */
      blanket.scale.set(1, 1, Math.max(.001, ease.out(seg(g, 6.6, 7.4)))); blanket.visible = g > 6.6;   // rolled up, it would show as a line
      if (g > 8.7 && g < 9.5 && dt) {
        const k = seg(g, 8.7, 9.5), x = lerp(-.55, .25, k), y = lerp(.86, .6, k);
        sparks.emit({ x, y, z: -.26, color: '#fffbe6', size: .03, life: .55, shape: 'sparkle', spin: 4 });
        sparks.emit({ x: x - .01, y: y + .004, z: -.26, color: '#ffe7a3', size: .018, life: .7, shape: 'glow' });
      }
      if (g > 6.9 && dt && rng() < dt * 3.5) flies.emit({ x: (rng() - .5) * .9, y: .04 + rng() * .3, z: (rng() - .5) * .5, vx: (rng() - .5) * .03, vy: .015,
        sway: .04, color: rng() < .5 ? '#e6ff8a' : '#ffe48a', size: .016 + rng() * .01, life: 4 + rng() * 3, shape: 'glow', twinkle: 6 });
      const p = ease.back(seg(g, 9.6, 10.6)), up = ease.inOut(seg(g, 12.6, 13.5));
      photo.root.scale.setScalar(Math.max(.001, p * lerp(1, .5, up)));                 // at the end it moves aside, a keepsake in the sky
      photo.root.position.set(lerp(0, .37, up), lerp(.18, .33, ease.out(seg(g, 9.6, 10.6))) + .13 * up + .006 * Math.sin(T * 1.3), lerp(-.06, -.24, up));   // over the lamp, clear of the banner
      photo.root.rotation.set(-.08, .1 * Math.sin(T * .8), .05 * Math.sin(T * .6));
      photo.halo.material.opacity = .7 * p * (1 - .6 * up) * (1 + .08 * Math.sin(T * 3));
      if (g > 10 && g < 12.6 && dt && rng() < dt * 6) {
        const a = rng() * 6.28;
        sparks.emit({ x: photo.root.position.x + Math.cos(a) * .13, y: photo.root.position.y + .1 + Math.sin(a) * .13, z: photo.root.position.z,
          color: '#fff1b8', size: .02, life: 1, shape: 'sparkle', spin: 3 });
      }

      /* chapter 3: the kiss, the banner, fireworks */
      const h = ease.back(seg(g, 15.8, 16.5));
      heartPic.scale.setScalar(Math.max(.001, .1 * h * (1 + .08 * Math.sin(T * 6))));
      heartPic.position.set(0, .37 + .05 * seg(g, 15.8, 17.5), .02);
      if (g > 15.8 && kit.once('kiss')) hearts.burst(30, () => ({ x: 0, y: .34, z: .02, vx: (rng() - .5) * .5, vy: .15 + rng() * .3, vz: (rng() - .5) * .3,
        gravity: -.2, drag: .9, color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .025 + rng() * .025, life: 2.6, shape: 'heart', spin: (rng() - .5) * 4 }));
      const b = ease.elastic(seg(g, 16.4, 17.4));
      banner.root.scale.setScalar(Math.max(.001, b));
      banner.root.position.set(0, .6 + .006 * Math.sin(T * 1.5), .05);
      banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      if (g > 16.6 && dt) {                                          // while held the story's clock stands still: go by the act's
        if (kit.once(held ? `firework-held${Math.floor(T / .8)}` : `firework${Math.floor((g - 16.6) / .55)}`)) {
          const cx = (rng() - .5) * .9, cy = .55 + rng() * .28, col = ['#ffd166', '#ff8fab', '#9be7ff', '#c5a3ff'][(rng() * 4) | 0];
          sparks.burst(26, i => { const a = i / 26 * 6.28, s = .12 + rng() * .06; return { x: cx, y: cy, z: -.18, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            gravity: -.16, drag: 1.4, color: col, size: .02, life: 1.3, shape: i % 3 ? 'glow' : 'sparkle' }; });
        }
      }
      if (held && dt && rng() < dt * 1.2) hearts.emit({ x: (rng() - .5) * .3, y: .32, z: 0, vy: .08, sway: .03, color: '#ff8fab', size: .02, life: 2.4, shape: 'heart' });

      [stars, hearts, sparks, flies].forEach(x => x.update(dt, T));
    }
  };
};
