/* Hai Đứa Mình — The Series, told by the shared act _acts/lovestory.js on the set of set.js. Six episodes, each opened by
   the clapperboard and ending at a stop (the next tap plays on; after the last, the letter):
     1 ·  0–7     Lần đầu gặp nhau (living room): she heads for the door with a coffee, he bursts in, the coffee flies; "Ối!",
                  they laugh, the VỖ TAY box lights up
     2 ·  7–14    Vào bếp (the stage turns to the kitchen): he fries an egg, smoke, the alarm blinks, "Khét!!"; she fans the
                  smoke with a towel, they laugh, a new print pops onto the fridge
     3 · 14–21    Đêm xem phim (back to the living room, lights down): side by side on the sofa, backs to us, the TV showing
                  their photos; she rests her head on his shoulder, popcorn hops, hearts float up
     4 · 21–27.5  Tranh cái remote: both reach, the remote flies, he catches it, bows and hands it over; a kiss on the cheek
     5 · 27.5–34.5 Lời tỏ tình (the window nook, night): the string lights come on bulb by bulb with four photos; he goes
                  down on one knee with the card's words (confess) on a heart, she covers her mouth, he stands and they hug
     6 · 34.5–42  Hậu trường: "CẮT!", the studio lights up, the stage turns all the way round, they step to the front, hold
                  hands, bow and cheer, then dance; the film wheel rises with every photo and the first one in the middle;
                  "Còn tiếp…"
   Two copies of the couple (boy/girl and boy2/girl2, one file each): when the stage turns, the next room arrives with its
   pair already in place, like actors set on a revolving stage. A tap on either of them makes the pair cheer, with hearts
   and the VỖ TAY box (any time); a tap on a photo shows it big (the act does that). Sound (template.json "sound"): the
   theme, a soft loop for the confession, and an effect for each gag. Everything is a function of g, the story's clock. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, lerp, rng, words } = kit;
  const H = .29, HER = H * .945;                                     // their heights, in card widths (her 1.70 m to his 1.80)
  /* how far a walk carries them each second at speed 1, in KayKit's stride (.1 card widths a second for a .3-tall
     character): the shared models carry a pace for each walk and run that turns it into their own */
  const STRIDE = { boy: .1 * H / .3, girl: .1 * HER / .3 };
  const SIT_BACK = .066 * H / .4;                                    // a chair clip settles the hips this far behind where they stood
  const START = [0, 7, 14, 21, 27.5, 34.5], SECONDS = [7, 7, 7, 6.5, 7, 7.5];
  const TITLES = ['Lần đầu gặp nhau', 'Vào bếp', 'Đêm xem phim', 'Tranh cái remote', 'Lời tỏ tình', 'Hậu trường'];
  const TAU = Math.PI * 2, KITCHEN = -TAU / 3, NOOK = TAU / 3;
  const DAY = { hemi: new THREE.Color('#fff6f0'), ground: new THREE.Color('#c9a9c4'), sun: new THREE.Color('#fff1dd') };
  const NIGHT = { hemi: new THREE.Color('#b9a9e6'), ground: new THREE.Color('#3b2a4a'), sun: new THREE.Color('#cbbcff') };
  const STUDIO = { hemi: new THREE.Color('#fffaf6'), ground: new THREE.Color('#d8bfd0'), sun: new THREE.Color('#ffffff') };
  let set, A, B, cup, towel, sign, banner, bubbles, hearts, sparks, smoke, drops, pops;
  let poked = -9, pokedPair = null, now = 0;                         // the last tap on the couple (act time) and which pair

  /** the bones a gesture needs, under KayKit's names or Mixamo's */
  const BONES = {
    armR: ['upperarm.r', 'RightArm'], foreR: ['lowerarm.r', 'RightForeArm'], armL: ['upperarm.l', 'LeftArm'], foreL: ['lowerarm.l', 'LeftForeArm'],
    head: ['head', 'Head'], chest: ['chest', 'Spine'], spine: ['spine', 'Spine01'], handR: ['handslot.r'], handL: ['handslot.l']
  };
  function rig(m) {
    const b = {};
    for (const [k, names] of Object.entries(BONES)) b[k] = names.map(n => m.node(n)).find(Boolean) || null;
    return b;
  }
  /** plays the first of `names` the model has */
  const act = (m, names, o) => { for (const n of [].concat(names)) if (m.play(n, o)) return; };
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  const face = (fx, fz, tx, tz) => Math.atan2(tx - fx, tz - fz);
  /** an angle eased from a to b by the shorter way round */
  const turnTo = (a, b, k) => a + (((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI) * k;

  /** one of the couple in a room: where it stands (in the room's own space) and which way it looks */
  function place(c, room, x, z, look) {
    const p = set.inRoom(room, x, z);
    c.m.root.position.set(p.x, set.BASE, p.z); c.m.root.rotation.y = p.ry + look;
  }
  /** where a thing on the turntable is in the act's own space, for what does not turn with it (bubbles) */
  const onStage = (x, y, z) => new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), set.turntable.rotation.y).add(set.turntable.position);

  function bubbleAt(b, k, p, y = H + .07) {
    b.scale.setScalar(Math.max(.001, .1 * ease.back(k)));
    b.position.set(p.x, y + .01 * k, p.z);
    b.visible = k > .001;
  }

  return {
    seconds: SECONDS,

    build() {
      set = window.NM_SITCOM_SET(kit);
      const pair = (b, g) => {
        const boy = { m: kit.model(b).fit({ height: H }), stride: STRIDE.boy }, girl = { m: kit.model(g).fit({ height: HER }), stride: STRIDE.girl };
        const p = { boy, girl };
        for (const c of [boy, girl]) {
          c.b = rig(c.m); set.turntable.add(c.m.root);
          const hit = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.05, .05, H, 8)), kit.keep(new THREE.MeshBasicMaterial()));
          hit.visible = false; hit.userData.proxy = true; hit.position.y = H / 2; c.m.root.add(hit);   // an easy target for a finger
          kit.onTap(hit, () => { poked = now; pokedPair = p; });
        }
        return p;
      };
      A = pair('boy', 'girl'); B = pair('boy2', 'girl2');

      /* the props they handle */
      cup = new THREE.Group();
      cup.add(new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.009, .0075, .017, 14)), kit.keep(new THREE.MeshStandardMaterial({ color: '#fffaf3', roughness: .4 }))));
      cup.add(new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.0092, .0092, .005, 14)), kit.keep(new THREE.MeshStandardMaterial({ color: '#f39ab6', roughness: .5 }))));
      cup.children[1].position.y = .002;
      towel = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(.045, .004, .03)), kit.keep(new THREE.MeshStandardMaterial({ color: '#ff9fbc', roughness: .95 })));
      sign = kit.sign({ text: words('confess', 'Làm nữ chính của đời anh nhé?'), style: 'heart', width: .16, accent: '#e8436d', glow: .6 });
      B.boy.m.root.add(sign.root);
      banner = kit.sign({ text: words('ending', 'Còn tiếp… mãi mãi'), style: 'banner', width: .5, accent: '#d9577a', glow: .5 });
      stage.add(banner.root);
      bubbles = { oops: set.bubble('Ối!'), burnt: set.bubble('Khét!!', { tail: .62 }), mine: set.bubble('Của em!', { tail: .62 }), cut: set.bubble('CẮT!', { ink: '#e5484d', tail: .7 }) };
      Object.values(bubbles).forEach(b => stage.add(b));

      hearts = kit.particles({ max: 160 });
      sparks = kit.particles({ max: 260, additive: true });
      smoke = kit.particles({ max: 90 });
      drops = kit.particles({ max: 60 });
      pops = kit.particles({ max: 60 });
      set.turntable.add(smoke.root, drops.root, pops.root); stage.add(hearts.root, sparks.root);
    },

    reset() {
      [hearts, sparks, smoke, drops, pops].forEach(p => p.clear());
      for (const c of [A.boy, A.girl, B.boy, B.girl]) c.m.stop();
      A.girl.m.hold(cup, 'handslot.r');                              // a hand slot's +y runs out of the thumb, +x to the fingertips:
      if (cup.parent) { cup.position.set(0, 0, 0); cup.rotation.set(0, 0, Math.PI / 2); }   // the cup stands up when the arm hangs
      B.girl.m.hold(towel, 'handslot.r');
      if (towel.parent) { towel.position.set(.022, 0, 0); towel.rotation.set(0, 0, 0); }    // the towel hangs from the fist
      set.living.table.add(set.living.remote); set.living.remote.position.set(-.012, .048, .008); set.living.remote.rotation.set(0, .4, 0);
      set.nook.bulbs.forEach(b => b.set(0));
    },

    pose({ g, T, dt, held }) {
      now = T;
      const ch = g < START[1] ? 0 : g < START[2] ? 1 : g < START[3] ? 2 : g < START[4] ? 3 : g < START[5] ? 4 : 5, t = g - START[ch];

      /* the stage turns: kitchen, back, the nook, then all the way round */
      set.turntable.rotation.y = tween(g, [[0, 0], [7, 0], [8.4, KITCHEN], [14, KITCHEN], [15.4, 0], [27.5, 0], [28.9, NOOK], [34.5, NOOK], [36.6, TAU]]);

      /* light: day, night from the movie on, the studio's own at the end */
      const night = seg(g, 14.6, 15.8) * (1 - seg(g, 34.7, 35.9)), finale = ease.smooth(seg(g, 34.7, 35.9));
      const L = kit.lights;
      L.hemi.color.copy(DAY.hemi).lerp(NIGHT.hemi, night).lerp(STUDIO.hemi, finale);
      L.hemi.groundColor.copy(DAY.ground).lerp(NIGHT.ground, night).lerp(STUDIO.ground, finale);
      L.sun.color.copy(DAY.sun).lerp(NIGHT.sun, night).lerp(STUDIO.sun, finale);
      L.hemi.intensity = lerp(lerp(1.1, .66, night), 1.15, finale); L.sun.intensity = lerp(lerp(1.5, .5, night), 1.6, finale);
      const lamp = night * (1 + .04 * Math.sin(T * 9) * Math.sin(T * 5.3));
      set.living.lamp.light.intensity = .9 * lamp; set.living.lamp.glow.material.opacity = .8 * lamp; set.living.lamp.shade.emissiveIntensity = 1.2 * lamp;
      set.living.tv.material.emissiveIntensity = lerp(.55, 1.25, night); set.living.tvLight.intensity = .9 * night;
      const onAir = g > .95 && g < 34.7 ? 1 : 0;
      set.studio.onAir.set(onAir); set.studio.tally.emissiveIntensity = 2.5 * onAir;
      const spots = lerp(lerp(.55, .18, night), 1, finale);
      set.studio.spots.forEach((s, i) => s.set(spots * (finale ? .85 + .15 * Math.sin(T * 2 + i) : 1)));

      /* the VỖ TAY box: after each joke, and on and on at the end */
      const clap = [[4.9, 6.4], [12.2, 13.6], [26, 27.3]].some(([a, b]) => g > a && g < b) || g > 37.6 || T - poked < 1.2;
      for (const a of [4.9, 12.2, 26, 37.6]) if (g > a && g < a + .5 && kit.once(`applause${a}`)) kit.sfx('applause', { volume: .8 });
      kit.music(g >= 27.5 && g < 34.5 ? 'soft' : 'music');
      set.studio.applause.set(clap ? .65 + .35 * (Math.sin(T * 14) > 0 ? 1 : 0) : 0);

      /* the clapperboard: up, clap, away */
      const up = ease.back(seg(t, .02, .45)) * (1 - ease.in(seg(t, ch === 5 ? 2 : 1.5, ch === 5 ? 2.4 : 1.9)));
      set.clapper.root.scale.setScalar(Math.max(.001, up)); set.clapper.root.visible = up > .002;
      set.clapper.root.position.y = -.03 * (1 - up);
      set.clapper.root.rotation.x = -.18;
      set.clapper.stick.rotation.z = .55 * (1 - ease.in(seg(t, .78, .9)));
      if (kit.once(`slate${ch}`)) set.clapper.set({
        show: words('show', 'Hai Đứa Mình'),
        episode: ch === 5 ? 'HẬU TRƯỜNG' : `TẬP ${ch + 1}`,
        title: ch === 5 ? `Diễn viên chính: ${words('stars', 'Anh & Em')}` : words(`ep${ch + 1}`, TITLES[ch])
      });
      set.clapper.hero.root.visible = ch === 0; set.clapper.photo.root.visible = ch !== 0;   // the first episode opens on the first photo
      if (t > .9 && kit.once(`clap${ch}`)) kit.sfx('clap');
      if (t > .9 && kit.once(`clap-sparks${ch}`)) sparks.burst(10, () => ({ x: (rng() - .5) * .14, y: .17, z: .26, vx: (rng() - .5) * .3, vy: .2 + rng() * .2,
        gravity: -.5, drag: 1.2, color: '#fff6d8', size: .014, life: .6, shape: 'sparkle' }));

      /* what shows only in its own episode: the props in hand, the speech bubbles (an episode shows its own) */
      cup.visible = g < 7; towel.visible = g >= 7 && g < 12.6; sign.root.visible = false;
      Object.values(bubbles).forEach(b => { b.visible = false; });

      /* the couple: one pair in the living room, one in the kitchen and the nook */
      /* (a pair comes on only once its room starts turning in, not while the stop before still holds: g sits at the stop) */
      A.boy.m.root.visible = A.girl.m.root.visible = g < 8.4 || (g > 14.01 && g < 28.9) || g > 34.51;
      B.boy.m.root.visible = B.girl.m.root.visible = (g > 7.01 && g < 15.4) || (g > 27.51 && g < 36.6);
      if (ch === 0 || (g >= 34.5 && ch === 5) || (g < 7)) livingFirst(g, T);
      if (g >= 7 && g < 14) kitchen(g - 7, T, dt);
      if (g >= 14 && g < 27.5) sofa(g, T, dt, held);
      if (g >= 27.5 && g < 34.5) nook(g - 27.5, T);
      if (g >= 34.5) finaleAct(g - 34.5, T, dt);

      /* a tap on the couple: they hop and cheer, hearts fly */
      const pk = T - poked;
      if (pokedPair && pk < 1.4) {
        const hop = .035 * Math.max(0, Math.sin(Math.PI * Math.min(1, pk / .42))), arms = Math.sin(Math.PI * Math.min(1, pk / 1.4));
        for (const c of [pokedPair.boy, pokedPair.girl]) {
          c.m.root.position.y = set.BASE + hop;
          if (c.b.armR) { c.m.aim(c.b.armR, [-.35, .85, .15], arms); c.m.aim(c.b.foreR, [-.1, 1, .1], arms); }
          if (c.b.armL) { c.m.aim(c.b.armL, [.35, .85, .15], arms); c.m.aim(c.b.foreL, [.1, 1, .1], arms); }
        }
        if (kit.once(`poke${poked.toFixed(3)}`)) {
          kit.sfx('applause', { volume: .6 }); kit.sfx('sparkle', { volume: .5 });
          const a = pokedPair.boy.m.root.position, b = pokedPair.girl.m.root.position, p = onStage((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
          hearts.burst(18, () => ({ x: p.x, y: H + .02, z: p.z, vx: (rng() - .5) * .3, vy: .18 + rng() * .2, vz: (rng() - .5) * .1, gravity: -.15, drag: .8,
            color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#ffd27a'][(rng() * 4) | 0], size: .02 + rng() * .016, life: 2, shape: 'heart', spin: (rng() - .5) * 3 }));
        }
      }

      /* the film wheel: every photo going round, the first one in the middle */
      const rise = ch === 5 ? ease.out(seg(t, 1.2, 3)) : 0, W = set.wheel;
      W.root.visible = rise > .001;
      W.root.position.y = .62 + .006 * Math.sin(T * 1.2);
      W.reel.forEach((f, i) => {
        const a = i / W.reel.length * TAU + T * .25, k = ease.out(seg(t, 1.2 + i * .08, 2.6 + i * .08));
        const rim = onStage(Math.sin(i / W.reel.length * TAU) * set.R, .03, Math.cos(i / W.reel.length * TAU) * set.R);
        const to = new THREE.Vector3(Math.sin(a) * .2, Math.cos(a) * .2, 0).add(W.root.position);
        f.root.position.copy(rim.lerp(to, k)).sub(W.root.position);
        f.root.scale.setScalar(Math.max(.001, lerp(.3, 1, k)));
        f.root.rotation.set(0, 0, 0);
      });
      W.ring.scale.setScalar(Math.max(.001, ease.out(seg(t, 2.2, 3))));
      const h = ease.back(seg(t, 2.6, 3.4));
      W.hero.root.scale.setScalar(Math.max(.001, h)); W.heroGlow.material.opacity = .65 * h * (1 + .08 * Math.sin(T * 3));

      /* the banner: "Còn tiếp…" */
      const bn = ease.elastic(seg(t, 4.2, 5.2)) * (ch === 5 ? 1 : 0);
      banner.root.scale.setScalar(Math.max(.001, bn)); banner.root.visible = bn > .001;
      banner.root.position.set(0, .4 + .006 * Math.sin(T * 1.4), .12); banner.root.rotation.set(-.12, 0, .02 * Math.sin(T * 1.1));
      if (ch === 5 && t > 3.6 && dt && rng() < dt * (held ? 5 : 9)) sparks.emit({ x: (rng() - .5) * .9, y: .75 + rng() * .15, z: (rng() - .5) * .3,
        vy: -.06, sway: .05, color: ['#ffd27a', '#ff9fbc', '#bfe6d8', '#ffffff'][(rng() * 4) | 0], size: .014 + rng() * .01, life: 3.5, shape: rng() < .5 ? 'star' : 'sparkle', spin: 2 });
      if (ch === 5 && t > 3.4 && kit.once('bow-hearts-sound')) kit.sfx('sparkle', { volume: .6 });
      if (ch === 5 && t > 3.4 && kit.once('bow-hearts')) hearts.burst(24, () => ({ x: (rng() - .5) * .2, y: .3, z: .3, vx: (rng() - .5) * .4, vy: .2 + rng() * .25,
        vz: (rng() - .5) * .1, gravity: -.2, drag: .9, color: ['#ff4f7b', '#ff8fab', '#ffd1dc'][(rng() * 3) | 0], size: .022 + rng() * .02, life: 2.4, shape: 'heart', spin: (rng() - .5) * 3 }));

      [hearts, sparks, smoke, drops, pops].forEach(p => p.update(dt, T));
    }
  };

  /* ── episode 1: the door (and where the pair stands for the finale, before it walks out) ── */
  function livingFirst(g, T) {
    if (g >= 34.5) return;                                          // the finale places them itself
    const { boy, girl } = A;
    const DOOR = [-.208, .19], IN = [-.165, .245], SHE0 = [.06, .275], SHE1 = [-.085, .262];   // they bump a step in from the door
    set.living.door.open(ease.out(seg(g, 1.9, 2.3)) * (1 - ease.inOut(seg(g, 3.2, 3.8))));
    const walk = ease.inOut(seg(g, .9, 2.6)), step = ease.out(seg(g, 2.1, 2.7));
    const sx = lerp(SHE0[0], SHE1[0], walk), sz = lerp(SHE0[1], SHE1[1], walk);
    const bx = lerp(DOOR[0], IN[0], step), bz = lerp(DOOR[1], IN[1], step);
    const cheat = ease.inOut(seg(g, 3.8, 4.4));                      // they turn a little towards us to laugh
    place(girl, 'living', sx, sz, turnTo(face(sx, sz, bx, bz), -.9, cheat));
    place(boy, 'living', bx, bz, turnTo(lerp(.52, face(bx, bz, sx, sz), seg(g, 2.6, 3)), .7, cheat));
    boy.m.root.visible = A.girl.m.root.visible && g > 1.95;
    const gc = clipAt([[0, 'Idle'], [.9, 'Walking_A', { speed: .086 / girl.stride }], [2.6, 'Idle'], [3.8, ['Clap', 'Cheer']], [5.4, 'Idle']], g);
    const bc = clipAt([[0, 'Idle'], [2.1, 'Walking_A', { speed: .116 / boy.stride }], [2.7, 'Idle']], g);
    act(girl.m, gc[1], gc[2]); act(boy.m, bc[1], bc[2]);
    const flinch = Math.sin(Math.PI * seg(g, 2.7, 3.1));            // the bump
    if (flinch) { boy.m.bend(boy.b.spine, -.25, 0, 0, flinch); girl.m.bend(girl.b.spine, -.3, 0, 0, flinch); }
    const look = seg(g, 2.9, 3.2) * (1 - seg(g, 3.6, 3.9));         // he looks down at his shirt
    if (look) boy.m.bend(boy.b.head, .45, 0, 0, look);
    const scratch = seg(g, 4.3, 4.6) * (1 - seg(g, 5.3, 5.6));       // and scratches his head
    if (scratch && boy.b.armR) { boy.m.aim(boy.b.armR, [-.3, .6, .35], scratch); boy.m.aim(boy.b.foreR, [.3, .7, -.3], scratch); }
    if (g > 1.9 && kit.once('door')) kit.sfx('door', { volume: .7 });
    if (g > 2.72 && kit.once('coffee')) {
      kit.sfx('splash');
      const p = set.inRoom('living', lerp(sx, bx, .5), lerp(sz, bz, .5));
      drops.burst(22, () => ({ x: p.x, y: set.BASE + H * .62, z: p.z, vx: (rng() - .5) * .25, vy: .15 + rng() * .25, vz: (rng() - .5) * .25,
        gravity: -1.4, drag: .3, color: rng() < .7 ? '#7a4a2a' : '#c08a5c', size: .01 + rng() * .008, life: .9, shape: 'drop', floor: set.BASE + .002 }));
    }
    const o = seg(g, 2.8, 3.05) * (1 - seg(g, 4.1, 4.4));
    bubbleAt(bubbles.oops, o, onStage(girl.m.root.position.x, 0, girl.m.root.position.z));
    if (g > 4.2 && kit.once('meet-hearts')) {
      kit.sfx('sparkle', { volume: .5 });
      const p = onStage(lerp(girl.m.root.position.x, boy.m.root.position.x, .5), 0, lerp(girl.m.root.position.z, boy.m.root.position.z, .5));
      hearts.burst(14, () => ({ x: p.x, y: H + .02, z: p.z, vx: (rng() - .5) * .2, vy: .16 + rng() * .14, vz: (rng() - .5) * .08, gravity: -.12, drag: .6,
        color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .024 + rng() * .016, life: 2.2, shape: 'heart', spin: (rng() - .5) * 3 }));
    }
  }

  /* ── episode 2: the kitchen ── */
  function kitchen(t, T, dt) {
    const { boy, girl } = B, STOVE = [-.116, .2], SHE0 = [.15, .31], SHE1 = [0, .215];
    const turn = ease.inOut(seg(t, 4.6, 5.2));
    place(boy, 'kitchen', STOVE[0], STOVE[1], turnTo(Math.PI + Math.PI / 6, face(STOVE[0], STOVE[1], SHE1[0], SHE1[1]) - .5, turn));
    const walk = ease.inOut(seg(t, 2.8, 3.8)), sx = lerp(SHE0[0], SHE1[0], walk), sz = lerp(SHE0[1], SHE1[1], walk);
    const toFridge = ease.inOut(seg(t, 5.7, 6.1));
    place(girl, 'kitchen', sx, sz, turnTo(face(sx, sz, STOVE[0], STOVE[1]) + .35, face(sx, sz, .054, .116), toFridge));
    girl.m.root.visible = B.boy.m.root.visible && t > 2.75 || t < 0;
    const bc = clipAt([[0, ['Use_Item', 'Interact']], [4.6, 'Idle'], [5.2, 'Cheer', { once: true }], [6.4, 'Idle']], t);
    const gc = clipAt([[0, 'Idle'], [2.8, 'Walking_A', { speed: .178 / girl.stride }], [3.8, 'Idle'], [5.2, ['Clap', 'Cheer']], [5.8, 'Idle']], t);
    act(boy.m, bc[1], bc[2]); act(girl.m, gc[1], gc[2]);
    const fan = seg(t, 3.85, 4.1) * (1 - seg(t, 4.9, 5.15));          // she fans the smoke away with the towel
    if (fan && girl.b.armR) { girl.m.aim(girl.b.armR, [-.5, .7, .45], fan); girl.m.aim(girl.b.foreR, [-.2 + .6 * Math.sin(T * 13), .8, .4], fan); }
    const cough = Math.max(0, Math.sin(T * 16)) * seg(t, 4.7, 4.9) * (1 - seg(t, 5.3, 5.5));
    if (cough) boy.m.bend(boy.b.chest, .3, 0, 0, cough);
    const reach = seg(t, 5.8, 6.1) * (1 - seg(t, 6.6, 6.9));          // the new print, onto the fridge
    if (reach && girl.b.armR) { girl.m.aim(girl.b.armR, [-.2, .45, .9], reach); girl.m.aim(girl.b.foreR, [-.1, .35, 1], reach); }
    if (t > 5.6) towel.visible = false;
    set.kitchen.prints[1].root.scale.setScalar(Math.max(.001, t < 6 ? 0 : ease.back(seg(t, 6, 6.4))));
    if (t > 6.05 && kit.once('print')) {
      kit.sfx('sparkle', { volume: .5 });
      const p = set.inRoom('kitchen', .054, .118);
      sparks.burst(12, () => ({ ...pt(onStage(p.x, 0, p.z)), y: .14, vx: (rng() - .5) * .2, vy: (rng() - .5) * .2, vz: .05, drag: 1, color: '#fff1b8', size: .016, life: .8, shape: 'sparkle', spin: 3 }));
    }
    /* the egg, the smoke, the alarm */
    if (t > .3 && kit.once('sizzle')) kit.sfx('sizzle', { volume: .6 });
    if (t > 1.6 && kit.once('flip')) kit.sfx('boing', { volume: .45, rate: 1.4 });
    if (t > 2.6 && kit.once('alarm1')) kit.sfx('alarm', { volume: .55 });
    if (t > 4.1 && kit.once('alarm2')) kit.sfx('alarm', { volume: .5 });
    const flip = seg(t, 1.6, 2.2);
    set.kitchen.egg.position.y = .008 + .05 * Math.sin(Math.PI * flip); set.kitchen.egg.rotation.x = TAU * .5 * ease.inOut(flip);
    if (t > 2 && t < 5 && dt && rng() < dt * 22) {
      const p = set.inRoom('kitchen', -.138, .135);                    // over the pan
      smoke.emit({ x: p.x + (rng() - .5) * .02, y: set.BASE + .11, z: p.z + (rng() - .5) * .02, vx: (rng() - .5) * .02, vy: .07 + rng() * .04, sway: .02,
        color: rng() < .5 ? '#9a8f9c' : '#c9c1cc', size: .03 + rng() * .02, grow: 2.4, life: 2.2, shape: 'glow' });
    }
    const alarm = t > 2.6 && t < 5.2 ? (Math.sin(T * 18) > 0 ? 1 : 0) : 0;
    set.kitchen.alarm.led.emissiveIntensity = 3 * alarm; set.kitchen.alarm.glow.material.opacity = .9 * alarm;
    const b = seg(t, 3, 3.25) * (1 - seg(t, 4.4, 4.7));
    bubbleAt(bubbles.burnt, b, onStage(boy.m.root.position.x, 0, boy.m.root.position.z));
  }

  /* ── episodes 3 and 4: the sofa, the TV, the remote ── */
  function sofa(g, T, dt, held) {
    const { boy, girl } = A, t3 = g - 14, t4 = g - 21;
    const SEAT = [[.042, .2325], [.124, .2795]], FWD = [.5, -.866], LOOK = 5 * Math.PI / 6;
    const stand = g >= 21 ? ease.inOut(seg(t4, 3, 4)) : 0, eachOther = ease.inOut(seg(t4, 3.9, 4.4));
    void stand;
    for (const [i, c] of [[0, boy], [1, girl]]) {
      const [x, z] = SEAT[i], k = SIT_BACK;
      const other = SEAT[1 - i], toOther = face(x, z, other[0], other[1]) + (i ? .35 : -.35);
      place(c, 'living', x + FWD[0] * k, z + FWD[1] * k, turnTo(LOOK, toOther, eachOther));
    }
    const clips = [[0, 'Idle'], [1.6, 'Sit_Chair_Down', { once: true, fade: .2 }], [2.6, 'Sit_Chair_Idle', { fade: .3 }], [10, 'Sit_Chair_StandUp', { once: true, fade: .2 }], [11, 'Idle']];
    const c3 = clipAt(clips, g - 14);
    act(boy.m, c3[1], c3[2]); act(girl.m, c3[1], c3[2]);
    const lean = g < 21 ? seg(t3, 3.4, 4.2) : 1 - seg(t4, .6, 1);    // her head on his shoulder
    if (lean) { girl.m.bend(girl.b.head, 0, 0, .32, lean); girl.m.bend(girl.b.chest, 0, 0, .12, lean); boy.m.bend(boy.b.head, 0, 0, -.14, lean); }
    if (g >= 14 && g < 21 && t3 > 2.6 && dt && rng() < dt * 3) {      // popcorn hops in the bowl
      const p = set.inRoom('living', .131, .174);                       // the bowl on the table
      if (rng() < .4) kit.sfx('pop', { volume: .3, rate: .9 + rng() * .3 });
      pops.emit({ x: p.x + (rng() - .5) * .02, y: set.BASE + .06, z: p.z + (rng() - .5) * .02, vx: (rng() - .5) * .08, vy: .2 + rng() * .1, vz: (rng() - .5) * .08,
        gravity: -1.2, color: '#fff8e7', size: .009, life: .7, shape: 'glow', floor: set.BASE + .045 });
    }
    if (g > 18.5 && (g < 21 || held) && dt && rng() < dt * 1.6) {
      const p = onStage(lerp(boy.m.root.position.x, girl.m.root.position.x, .5), 0, lerp(boy.m.root.position.z, girl.m.root.position.z, .5));
      hearts.emit({ x: p.x, y: .22, z: p.z, vy: .05, sway: .02, color: '#ff8fab', size: .018, life: 2.6, shape: 'heart' });
    }
    if (g < 21) return;
    /* the remote: both reach, it flies, he catches it, bows and hands it over; a kiss on the cheek */
    const reach = seg(t4, 1, 1.4) * (1 - seg(t4, 1.8, 2.1));
    if (reach) for (const c of [boy, girl]) if (c.b.armR) { c.m.aim(c.b.armR, [0, .1, 1], reach); c.m.aim(c.b.foreR, [0, -.2, 1], reach); }
    const R = set.living.remote, fly = seg(t4, 1.8, 3);
    if (t4 < 1.8) { if (R.parent !== set.living.table) { set.living.table.add(R); R.position.set(-.012, .048, .008); R.rotation.set(0, .4, 0); } }
    else if (t4 < 3) {
      if (R.parent !== set.turntable) set.turntable.add(R);
      const a = set.inRoom('living', .131, .174), b = boy.m.root.position;
      R.position.set(lerp(a.x, b.x, fly), set.BASE + .05 + .3 * Math.sin(Math.PI * fly) + (H * .55 - .05) * fly, lerp(a.z, b.z, fly));
      R.rotation.set(T * 9, T * 6, 0);
      if (dt && rng() < dt * 40) {                                    // a trail, so the eye follows it
        const p = onStage(R.position.x, 0, R.position.z);
        sparks.emit({ x: p.x, y: R.position.y, z: p.z, vy: -.02, color: '#fff1b8', size: .012, life: .45, shape: 'sparkle', spin: 4 });
      }
    } else if (t4 < 4.8) {
      if (kit.once('catch')) boy.m.hold(R, 'handslot.r');
      if (R.parent && R.parent !== set.turntable) { R.position.set(0, 0, 0); R.rotation.set(0, 0, Math.PI / 2); }   // along the grip
    } else if (kit.once('handover')) { girl.m.hold(R, 'handslot.r'); R.position.set(0, 0, 0); R.rotation.set(0, 0, Math.PI / 2); }
    if (t4 > 1.85 && kit.once('remote-pop')) {
      kit.sfx('boing', { volume: .7 });
      const at = set.inRoom('living', .131, .174), p = onStage(at.x, 0, at.z);
      sparks.burst(8, () => ({ x: p.x, y: .1, z: p.z, vx: (rng() - .5) * .3, vy: .2, drag: 1, color: '#fff1b8', size: .015, life: .6, shape: 'sparkle' }));
    }
    const m = seg(t4, 1.6, 1.85) * (1 - seg(t4, 2.8, 3.1));
    bubbleAt(bubbles.mine, m, onStage(girl.m.root.position.x, 0, girl.m.root.position.z), H + .02);
    const bow = Math.sin(Math.PI * seg(t4, 4, 4.8));                 // he bows and holds it out
    if (bow) { boy.m.bend(boy.b.chest, .5, 0, 0, bow); if (boy.b.armR) boy.m.aim(boy.b.armR, [-.1, .1, 1], bow); }
    const kiss = Math.sin(Math.PI * seg(t4, 4.9, 5.8));
    if (kiss) { girl.m.bend(girl.b.chest, .25, 0, 0, kiss); girl.m.bend(girl.b.head, .1, .35, 0, kiss); }
    if (t4 > 5.3 && kit.once('kiss')) {
      kit.sfx('sparkle', { volume: .5 });
      const p = onStage(lerp(boy.m.root.position.x, girl.m.root.position.x, .5), 0, lerp(boy.m.root.position.z, girl.m.root.position.z, .5));
      hearts.burst(18, () => ({ x: p.x, y: H, z: p.z, vx: (rng() - .5) * .25, vy: .15 + rng() * .2, vz: (rng() - .5) * .1, gravity: -.15, drag: .8,
        color: ['#ff4f7b', '#ff8fab', '#ffd1dc'][(rng() * 3) | 0], size: .02 + rng() * .015, life: 2.2, shape: 'heart', spin: (rng() - .5) * 3 }));
    }
  }

  /* ── episode 5: the nook. He goes down on one knee with the card's words on a heart, she covers her mouth, then the hug ── */
  function nook(t, T) {
    const { boy, girl } = B, HIM = [-.07, .235], HER = [.05, .225], WIN = [-.172, .103], LIGHTS = [.17, .13];
    const close = ease.inOut(seg(t, 5.6, 6));
    const hx = lerp(HIM[0], -.034, close), hz = lerp(HIM[1], .232, close), gx = lerp(HER[0], .03, close), gz = lerp(HER[1], .226, close);
    const toEachOther = ease.inOut(seg(t, 2.9, 3.3)), cheat = (1 - close) * .45;
    const seeLights = ease.inOut(seg(t, 2, 2.6));
    place(boy, 'nook', hx, hz, turnTo(face(hx, hz, WIN[0], WIN[1]), face(hx, hz, gx, gz) - cheat, toEachOther));
    place(girl, 'nook', gx, gz, turnTo(turnTo(face(gx, gz, WIN[0], WIN[1]), face(gx, gz, LIGHTS[0], LIGHTS[1]), seeLights), face(gx, gz, hx, hz) + cheat, ease.inOut(seg(t, 3.6, 4))));
    const bc = clipAt([[0, 'Idle'], [3.2, 'Kneel', { once: true, fade: .25 }], [4.5, 'Kneel_Idle', { fade: .3 }], [5.2, 'Kneel_StandUp', { once: true, fade: .2 }], [5.8, 'Idle']], t);
    act(boy.m, bc[1], bc[2]); act(girl.m, 'Idle');
    set.nook.bulbs.forEach((b, i) => {
      b.set(ease.out(seg(t, 1.4 + i * .15, 1.6 + i * .15)) * (.85 + .15 * Math.sin(T * 3 + i)));
      if (t > 1.4 + i * .15 && kit.once(`ting${i}`)) kit.sfx('ting', { volume: .45, rate: 1 + i * .045 });
    });
    set.nook.strung.forEach((s, i) => { s.photo.material.emissiveIntensity = .2 + .45 * seg(t, 1.5 + i * .33, 1.9 + i * .33); s.hang.rotation.z = .03 * Math.sin(T * 1.4 + i); });
    /* the heart with the card's words, on his hands while he kneels (the kneel ends with them together, palms up) */
    const k = ease.back(seg(t, 3.9, 4.4)) * (1 - ease.in(seg(t, 5.1, 5.35)));
    sign.root.scale.setScalar(Math.max(.001, k)); sign.root.visible = k > .002;
    sign.root.position.set(0, H * .44 + .006 * Math.sin(T * 2), .075);
    sign.root.rotation.set(-.15, -(set.turntable.rotation.y + boy.m.root.rotation.y) * .85, 0);   // the words face us, not only her
    if (t > 4 && kit.once('sign-sparkle')) kit.sfx('sparkle', { volume: .45 });
    const shy = seg(t, 4.4, 4.7) * (1 - seg(t, 5.3, 5.5));            // she covers her mouth
    if (shy && girl.b.armR) { girl.m.aim(girl.b.armR, [-.1, -.2, .9], shy); girl.m.aim(girl.b.foreR, [.25, .95, .25], shy); }
    const hug = ease.smooth(seg(t, 5.9, 6.4));
    if (hug) for (const c of [boy, girl]) if (c.b.armR) {
      c.m.aim(c.b.armR, [-.42, .05, .9], hug); c.m.aim(c.b.foreR, [.8, .1, .6], hug);
      c.m.aim(c.b.armL, [.42, .05, .9], hug); c.m.aim(c.b.foreL, [-.8, .1, .6], hug);
      c.m.bend(c.b.head, .1, 0, 0, hug);
    }
    if (t > 6.2 && kit.once('hug')) {
      kit.sfx('sparkle', { volume: .55 });
      const q = set.inRoom('nook', lerp(hx, gx, .5), lerp(hz, gz, .5)), p = onStage(q.x, 0, q.z);
      hearts.burst(20, () => ({ x: p.x, y: H + .03, z: p.z, vx: (rng() - .5) * .2, vy: .12 + rng() * .15, vz: (rng() - .5) * .08, gravity: -.1, drag: .7,
        color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#ffd27a'][(rng() * 4) | 0], size: .02 + rng() * .016, life: 2.6, shape: 'heart', spin: (rng() - .5) * 2.5 }));
    }
  }

  /* ── episode 6: cut, the bow ── */
  function finaleAct(t, T, dt) {
    const { boy, girl } = A, FROM = [[-.2, .24], [-.12, .265]], FRONT = [[-.085, .325], [.03, .338]];   // clear of the sofa's back
    const walk = ease.inOut(seg(t, 2.2, 3.2));
    [[boy, 0], [girl, 1]].forEach(([c, i]) => {
      const x = lerp(FROM[i][0], FRONT[i][0], walk), z = lerp(FROM[i][1], FRONT[i][1], walk);
      place(c, 'living', x, z, turnTo(face(FROM[i][0], FROM[i][1], FRONT[i][0], FRONT[i][1]), 0, ease.inOut(seg(t, 3, 3.4))));
    });
    const walkOf = c => [[0, 'Idle'], [2.2, 'Walking_A', { speed: .155 / c.stride }], [3.2, 'Idle'], [5, 'Cheer', { once: true }], [6.4, c === boy ? 'Dance_A' : ['Dance_B', 'Dance_A']]];
    const cb = clipAt(walkOf(boy), t), cg = clipAt(walkOf(girl), t);
    act(boy.m, cb[1], cb[2]); act(girl.m, cg[1], cg[2]);
    const hands = seg(t, 3.3, 3.8) * (1 - seg(t, 4.9, 5.1));         // hand in hand, then the cheer and the dance
    if (hands) {
      if (boy.b.armL) { boy.m.aim(boy.b.armL, [.55, -.75, .15], hands); boy.m.aim(boy.b.foreL, [.7, -.55, .2], hands); }
      if (girl.b.armR) { girl.m.aim(girl.b.armR, [-.55, -.75, .15], hands); girl.m.aim(girl.b.foreR, [-.7, -.55, .2], hands); }
    }
    const bow = Math.sin(Math.PI * seg(t, 3.9, 4.8));
    if (bow) for (const c of [boy, girl]) { c.m.bend(c.b.spine, .3, 0, 0, bow); c.m.bend(c.b.chest, .35, 0, 0, bow); }
    const cut = seg(t, .1, .3) * (1 - seg(t, 1.2, 1.5));
    bubbleAt(bubbles.cut, cut, new THREE.Vector3(.42, 0, .17), .2);
    void dt;
  }

  function pt(v) { return { x: v.x, z: v.z }; }
};
