/* Điệu nhảy hoàng hôn (a dance at dusk), told by the shared act _acts/lovestory.js; the hilltop itself (the sky page with
   the city far below, the grass and its path, the old lamp, the bench, trees, lavender, the shoes and the three things
   that carry the card's words) is built by scenery.js, loaded first. Three chapters of about ten seconds, each ending at
   a stop:
     1 · 0–10 s      dusk over the city, its lights coming on street by street. He strolls in from the left, whistling,
                     hands in his pockets; she comes from the right, nose in the air, dance shoes swinging from her hand.
                     They pretend not to see each other (she shakes her head, he shrugs); the old lamp flickers on, he
                     leans on its post and holds out his hand, and an enamel plate swings down from the lamp with the
                     card's first words (note1)
     2 · 10–20.5 s   she sits on the bench to change her shoes while he swings round the lamppost, feet off the ground;
                     she rolls her eyes but her foot is tapping, then she joins him and they tap side by side, hops and
                     kicks in step, music notes flying; the notes gather into a frame of bulbs round the card's photo
                     with its caption (caption)
     3 · 20.5–31 s   night comes: hand in hand they sway, he twirls her under his arm in a ring of sparkles, they spin as a
                     ripple of light runs through the city, he dips her as a shooting star crosses the sky; they come up
                     forehead to forehead and a ribbon unrolls above them with the last words (note2)
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own;
   the twinkling, the swaying and the bulbs' chase go by T, the act's own time. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, lerp, rng, words } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;                          // R: facing +x
  const FLOOR = .008;                                                // the hilltop stands this far off the card
  const H = .3, HER = H * .945;                                      // their heights (her 1.70 m to his 1.80)
  const PAGE = { width: 1.12, height: .78, curve: .08, z: -.3 };     // the painted sky, at the card's back edge
  const LAMP = { x: -.05, z: -.075, bar: .55, chain: .018 };         // the post; the bar the plate hangs from, its chains
  const BENCH = { x: .28, z: -.12, turn: -.5, len: .17, seat: .102 * HER / .4 };   // its seat at the height Sit_Chair sits her at
  const PATH = [[-.56, .17], [-.36, .1], [-.17, .055], [0, .03], [.18, 0], [.36, -.06], [.56, -.15]];
  const SIT_BACK = .066 * HER / .4;                                  // Sit_Chair settles her hips this far behind her feet
  const SIT = [BENCH.x + Math.sin(BENCH.turn) * SIT_BACK, BENCH.z + Math.cos(BENCH.turn) * SIT_BACK];
  const PHOTO_AT = [.17, .33, -.02], PHOTO_ASIDE = [.385, .29, -.12], RIBBON_AT = [.03, .645, .04];
  const SWAP = 13.35;                                                // the moment her new shoes are on
  const NEW = '#c99df3', OLD = '#f5f2ec';                           // her lilac dance shoes; the white trainers she takes off
  const S = window.NM_TWILIGHT.scenery(kit, { PAGE, FLOOR, LAMP, BENCH, PATH });
  const { pageZ } = S;
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  const LIGHT = {                                                    // dusk, twilight, night
    hemi: ['#ffd8c8', '#cdb8ff', '#9aa6ff'].map(c => new THREE.Color(c)), ground: ['#7a5a78', '#4d3b6a', '#2c2850'].map(c => new THREE.Color(c)),
    sun: ['#ffc79a', '#d4c2ff', '#aebcff'].map(c => new THREE.Color(c))
  };
  let boy, girl, page, city, lamp, plate, photo, marquee, ribbon, newShoes, oldShoes, worn, trees;
  let notes, sparks, hearts, stars, flies, particles;

  /* ── who plays which clip, from story time g: [from g, clip, options] ── */
  const BOY = [
    [0, 'Idle'], [.4, 'Walking_A', { speed: 1, fade: .25 }], [3.4, 'Idle', { fade: .25 }], [6, 'Walking_A', { speed: 1.5, fade: .2 }],
    [6.8, 'Idle', { fade: .2 }], [11.35, 'Running_A', { speed: .55, fade: .2 }], [13.65, 'Idle', { fade: .2 }], [15.6, 'Walking_A', { speed: 1.8, fade: .2 }],
    [16.5, 'Idle', { fade: .2 }], [20.7, 'Walking_A', { speed: .8, fade: .2 }], [21.15, 'Idle', { fade: .2 }]
  ];
  const GIRL = [
    [0, 'Idle'], [.8, 'Walking_A', { speed: 1.27, fade: .25 }], [3.9, 'Idle', { fade: .25 }], [10.45, 'Walking_A', { speed: 1.9, fade: .2 }],
    [11.75, 'Idle', { fade: .15 }], [12.05, 'Sit_Chair_Down', { once: true, fade: .2 }], [12.85, 'Sit_Chair_Idle', { fade: .3 }],
    [14.8, 'Sit_Chair_StandUp', { once: true, fade: .2 }], [15.6, 'Walking_A', { speed: 1.65, fade: .2 }], [16.7, 'Idle', { fade: .2 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };

  /* where each of them is: [from g, x, z, facing, ease into it]; a walk goes in, then at its pace, then out */
  const BOY_WAY = [
    [0, -.46, .137, 1.86], [.4, -.46, .137, 1.86], [.7, -.445, .133, 1.86, 'in'], [3.1, -.215, .074, 1.86, 'linear'], [3.4, -.2, .07, 1.86, 'out'],
    [3.9, -.2, .07, -.45], [5, -.2, .07, -.45], [5.35, -.2, .07, .5], [6, -.2, .07, .7], [6.8, -.12, -.02, 1.05], [10.8, -.12, -.02, 1.05],
    [11.2, -.12, -.02, .67],                                         // the swing round the post takes over here (see swingAt)
    [13.8, -.135, -.048, 1.2], [15.6, -.135, -.048, 1.2], [15.75, -.13, -.044, .83], [16.5, -.035, .06, .83, 'linear'], [16.85, -.035, .06, 0],
    [19.4, -.035, .06, 0], [19.7, -.012, .06, .18], [20.6, -.012, .06, .18], [21.15, -.006, .05, R], [22.8, -.006, .05, R], [23.05, .025, .05, R],
    [24.5, .025, .05, R], [24.75, -.04, .05, R], [25.6, -.04, .05, R + TAU], [26, .055, .05, R + TAU], [27.6, .055, .05, R + TAU], [28, .035, .05, R + TAU]
  ];
  const GIRL_WAY = [
    [0, .44, -.1, -1.25], [.8, .44, -.1, -1.25], [1.1, .427, -.096, -1.25, 'in'], [3.6, .143, .001, -1.25, 'linear'], [3.9, .13, .005, -1.25, 'out'],
    [4.2, .13, .005, .55], [5.1, .13, .005, .55], [5.4, .13, .005, -.25], [7.5, .13, .005, -.25], [7.9, .12, .005, -.75], [10.3, .12, .005, -.75],
    [10.45, .12, .005, 2.1], [10.7, .127, .001, 2.1, 'in'], [11.5, SIT[0] - .008, SIT[1] + .005, 2.1, 'linear'], [11.75, ...SIT, 2.1, 'out'],
    [12.05, ...SIT, BENCH.turn], [15.4, ...SIT, BENCH.turn], [15.6, ...SIT, -.77], [16.6, .161, .044, -.77, 'linear'], [16.75, .155, .05, -.77, 'out'],
    [16.85, .155, .05, 0], [19.4, .155, .05, 0], [19.7, .132, .05, -.18], [20.6, .132, .05, -.18], [21.15, .136, .05, -R],
    [22.8, .136, .05, -R], [23.1, .11, .05, -R], [24.5, .11, .05, -R - 2 * TAU], [24.75, .17, .05, -R - 2 * TAU], [25.65, .17, .05, -R - 3 * TAU], [26, .118, .05, -R - 3 * TAU],   // close for the dip: his arm round her back
    [27.6, .118, .05, -R - 3 * TAU], [28, .09, .05, -R - 3 * TAU]
  ];
  /* the stars that come out one by one as night falls, chosen once: a replay shows the same sky */
  const STARS = (r => Array.from({ length: 30 }, (_, i) => { const x = (r() - .5) * 1.04; return { key: `star${i}`, at: 19 + i * .3, x, y: .4 + r() * .36, z: pageZ(x) + .01,
    color: ['#ffffff', '#fff2c4', '#cfe0ff'][i % 3], size: .01 + r() * .014, life: 1e6, shape: i % 3 ? 'glow' : 'star', twinkle: 1.5 + r() * 3 }; }))(S.seeded(2024));
  const keysOf = way => [1, 2, 3].map(i => way.map(k => [k[0], k[i], k[4] || 'smooth']));
  const BOY_KEYS = keysOf(BOY_WAY), GIRL_KEYS = keysOf(GIRL_WAY);
  const wayAt = (keys, g) => keys.map(k => tween(g, k));
  /** the swing round the lamppost (11.2–13.8): his left hand on the post, running, then flying with his feet off the ground */
  const P0 = Math.atan2(-.02 - LAMP.z, -.12 - LAMP.x), P1 = Math.atan2(-.048 - LAMP.z, -.135 - LAMP.x) - TAU;
  function swingAt(g) {
    const k = ease.inOut(seg(g, 11.2, 13.8)), phi = lerp(P0, P1, k), fly = bump(g, 12.45, 12.75, 13.15, 13.45);
    const r = Math.hypot(-.02 - LAMP.z, -.12 - LAMP.x) + .008 * fly;
    return { x: LAMP.x + r * Math.cos(phi), z: LAMP.z + r * Math.sin(phi), face: Math.atan2(Math.sin(phi), -Math.cos(phi)), lift: .032 * fly,
      lean: .18 * bump(g, 11.3, 11.7, 13.3, 13.75) + .3 * fly };
  }
  /** the tap routine (16.85–19.4), the same for both, a beat of .32 s: two hops, a kick each side, a shuffle, a jump with a click */
  const TAP = 16.85, BEAT = .32;
  function tapAt(g) {
    const t = g - TAP, on = t >= 0 && t < 8 * BEAT, b = Math.floor(t / BEAT), f = (t - b * BEAT) / BEAT;
    if (!on) return { on: 0, hop: 0, kick: 0, side: 0, slide: 0, b: -1, f: 0, jump: 0 };
    const jump = b >= 6 ? Math.sin(Math.PI * (t - 6 * BEAT) / (2 * BEAT)) : 0;
    return { on: 1, b, f, hop: b < 6 ? .016 * Math.sin(Math.PI * f) : .055 * jump, jump, kick: b === 2 || b === 3 ? Math.min(1, 1.6 * Math.sin(Math.PI * f)) : 0, side: b === 2 ? 'r' : 'l',
      slide: b === 4 ? -.022 * ease.inOut(f) : b === 5 ? -.022 * (1 - ease.inOut(f)) : 0 };
  }

  /* ── where things are in someone's hands ── */
  const mStage = new THREE.Matrix4(), qInv = new THREE.Quaternion(), vS = new THREE.Vector3(), vT = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
  const vC = new THREE.Vector3(), vD = new THREE.Vector3();
  const at = (m, bone, out) => { const b = m.node(bone); b.updateWorldMatrix(true, false); return out.setFromMatrixPosition(b.matrixWorld).applyMatrix4(mStage); };
  const D = [0, 0, 0], U = [0, 0, 0];                                  // directions handed to aim(), filled in place
  const toward = (m, side, target) => { at(m, `upperarm.${side}`, vS); vS.subVectors(target, vS).applyQuaternion(qInv.copy(m.root.quaternion).invert()); return vS.toArray(D); };
  /** an arm reaching for a point: in reach, the elbow bends (out, and down by `sag`: up when it is less than 0) so the hand
      lands on it; out of reach, the arm points at it, the upper arm a little below the line */
  const LEN = new Map(), vI = new THREE.Vector3(), vN = new THREE.Vector3(), vQ = new THREE.Vector3(), vE = new THREE.Vector3(), vL = new THREE.Vector3();
  function reach(m, side, target, k, sag = .25) {
    if (k <= 0) return;
    const key = m.root.name + side;
    if (!LEN.has(key)) { at(m, `lowerarm.${side}`, vL); LEN.set(key, [at(m, `upperarm.${side}`, vI).distanceTo(vL), vL.distanceTo(at(m, `handslot.${side}`, vI))]); }
    const [a, b] = LEN.get(key), d = toward(m, side, target), dist = vI.fromArray(d).length();
    if (dist >= (a + b) * .999) {
      const s = sag * Math.min(1, (dist - a - b) / (.3 * (a + b)));
      U[0] = d[0]; U[1] = d[1] - s * Math.hypot(d[0], d[2]); U[2] = d[2];
      m.aim(`upperarm.${side}`, U, k); m.aim(`lowerarm.${side}`, d, k); return;
    }
    const A = Math.acos(Math.min(1, Math.max(-1, (a * a + dist * dist - b * b) / (2 * a * dist))));
    vN.copy(vI).normalize(); vQ.set(side === 'r' ? -1 : 1, -.3 - 2.5 * sag, -.3); vQ.addScaledVector(vN, -vQ.dot(vN)).normalize();
    vE.copy(vN).multiplyScalar(Math.cos(A)).addScaledVector(vQ, Math.sin(A));          // the upper arm, to the elbow
    vI.addScaledVector(vE, -a);                                                        // the forearm, from the elbow to the point
    m.aim(`upperarm.${side}`, vE.toArray(U), k); m.aim(`lowerarm.${side}`, vI.toArray(D), k);
  }
  /** both arms (own space, the right one given; the left mirrored) */
  const arms = (m, up, low, k) => { if (k <= 0) return; m.aim('upperarm.r', up, k); m.aim('lowerarm.r', low, k);
    m.aim('upperarm.l', [-up[0], up[1], up[2]], k); m.aim('lowerarm.l', [-low[0], low[1], low[2]], k); };
  /** her new shoes, on her feet: a lilac skin over the trainers she has on (their own triangles, pushed out a little along
      their normals and skinned to the same bones, so it bends with every step), and on each foot's bone a bow on the toe
      and a strap round the ankle, placed where the file stands the foot (its bind pose: flat on the ground, toes to +z, in
      metres) through the bone's inverse bind matrix (the bones are in centimetres; the bind matrices carry that) */
  function fitShoes(m, color) {
    let skin = null; m.scene?.traverse(o => { if (o.isSkinnedMesh && !skin) skin = o; });
    if (!skin) return [];
    const sk = skin.skeleton, src = skin.geometry, { position: pos, normal: nrm, skinIndex: si, skinWeight: sw } = src.attributes;
    const at = b => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[b]).invert());
    const feet = ['l', 'r'].map(side => { const fi = sk.bones.indexOf(m.node(`foot.${side}`)), ti = sk.bones.indexOf(m.node(`toes.${side}`)); return { side, fi, ti, ankle: at(fi), box: new THREE.Box3() }; });
    const v = new THREE.Vector3(), n = new THREE.Vector3(), shod = new Uint8Array(pos.count);
    for (let i = 0; i < pos.count; i++) for (const f of feet) {        // the trainers: what a foot carries, below the ankle
      let w = 0; for (let k = 0; k < 4; k++) { const b = si.getComponent(i, k); if (b === f.fi || b === f.ti) w += sw.getComponent(i, k); }
      if (w > .5 && v.fromBufferAttribute(pos, i).applyMatrix4(skin.bindMatrix).y < f.ankle.y * .62) { shod[i] = 1; f.box.expandByPoint(v); }
    }
    const P = [], N = [], SI = [], SW = [], I = [], fresh = new Map(), idx = src.index, count = idx ? idx.count : pos.count;
    for (let t = 0; t < count; t += 3) {
      const tri = [0, 1, 2].map(k => (idx ? idx.getX(t + k) : t + k));
      if (!tri.every(i => shod[i])) continue;
      for (const i of tri) {
        if (!fresh.has(i)) {
          fresh.set(i, fresh.size); n.fromBufferAttribute(nrm, i).normalize(); v.fromBufferAttribute(pos, i).addScaledVector(n, .004);   // 4 mm out
          P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z);
          for (let k = 0; k < 4; k++) { SI.push(si.getComponent(i, k)); SW.push(sw.getComponent(i, k)); }
        }
        I.push(fresh.get(i));
      }
    }
    const g = kit.keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); g.setIndex(I);
    const lilac = kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .32, metalness: .35, emissive: color, emissiveIntensity: .25 }));
    const shell = new THREE.SkinnedMesh(g, lilac); shell.frustumCulled = false; shell.castShadow = true;
    shell.position.copy(skin.position); shell.quaternion.copy(skin.quaternion); shell.scale.copy(skin.scale);
    skin.parent.add(shell); shell.bind(sk, skin.bindMatrix);
    const pink = kit.keep(new THREE.MeshStandardMaterial({ color: 0xff7aa0, roughness: .5 })), loopG = kit.keep(new THREE.SphereGeometry(.016, 8, 6).scale(1.5, .8, .7));
    const strapG = kit.keep(new THREE.TorusGeometry(.046, .0045, 6, 24).rotateX(Math.PI / 2));
    const trims = feet.map(f => {                                      // a bow on the toe, a strap round the ankle: in the file's metres, then onto the bone
      const b = f.box, trim = new THREE.Group(), holder = new THREE.Group();
      for (const sx of [-1, 1]) { const loop = new THREE.Mesh(loopG, pink); loop.position.set((b.min.x + b.max.x) / 2 + sx * .017, b.max.y * .72, b.max.z - .055); loop.rotation.z = sx * .4; trim.add(loop); }
      const strap = new THREE.Mesh(strapG, lilac); strap.position.set(f.ankle.x, b.max.y + .006, f.ankle.z + .01); trim.add(strap);
      trim.traverse(o => { o.castShadow = true; });
      holder.matrixAutoUpdate = false; holder.matrix.copy(sk.boneInverses[f.fi]); holder.add(trim); m.node(`foot.${f.side}`).add(holder);
      return trim;
    });
    return [shell, ...trims];
  }

  return {
    seconds: [10, 10.5, 10.5],

    build() {
      /* the two of them, the shared couple at their own heights */
      boy = kit.model('boy').fit({ height: H }); girl = kit.model('girl').fit({ height: HER });
      stage.add(boy.root, girl.root);
      boy.root.rotation.order = girl.root.rotation.order = 'YXZ';      // turn first, then lean: a lean goes the way they face

      /* the hilltop */
      page = S.makePage(); stage.add(page.root);
      city = S.makeCityLights(); stage.add(city.pts);
      stage.add(S.makeGround());
      lamp = S.makeLamp(); stage.add(lamp.root, lamp.pool);
      stage.add(S.makeBench());
      trees = [S.makeTree(5, .36, 0), S.makeTree(9, .3, 1)];
      trees[0].root.position.set(-.41, FLOOR, -.19); trees[1].root.position.set(.43, FLOOR, -.185); trees[1].root.rotation.y = 2;
      trees.forEach(t => stage.add(t.root));
      stage.add(S.makeLavender([[-.33, .2, 11], [-.44, .05, 9], [.05, .16, 9], [.36, .06, 10], [-.2, -.05, 8], [.15, -.1, 8], [.45, -.06, 7]]));
      stage.add(S.makeTufts([[-.41, -.19, 10], [.43, -.185, 10], [LAMP.x, LAMP.z, 6]]));
      newShoes = S.makePair(NEW, true); oldShoes = S.makePair(OLD, false);
      stage.add(newShoes.root, oldShoes.root);
      worn = fitShoes(girl, NEW);                                     // the same pair once they are on her feet

      /* the card's words and photo, each on its own carrier */
      plate = S.makePlate(words('note1', 'Hoàng hôn đẹp thế này, nhảy với anh nhé?'), .44);
      photo = kit.polaroid({ width: .27, caption: words('caption', 'Điệu nhảy của riêng mình'), glow: .5, halo: true, haloColor: 0xffd9a0, captionMax: 68 });
      marquee = S.makeMarquee(photo.width, photo.height); photo.root.add(marquee.root);
      ribbon = S.makeRibbon(words('note2', 'Mỗi ngày bên em đều là vũ điệu'), .62, .17);
      for (const p of [plate, photo, ribbon]) { p.root.traverse(o => { o.castShadow = false; }); stage.add(p.root); }

      /* particles */
      notes = kit.particles({ max: 140 }); sparks = kit.particles({ max: 360, additive: true }); hearts = kit.particles({ max: 120 });
      stars = kit.particles({ max: 60, additive: true }); flies = kit.particles({ max: 60, additive: true });
      particles = [notes, sparks, hearts, stars, flies];
      particles.forEach(p => stage.add(p.root));
    },

    reset() {
      for (const p of particles) p.clear();
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();
      const twi = ease.smooth(seg(g, 5, 19)), night = ease.inOut(seg(g, 20.5, 26.5));
      const note = (x, y, z, o = {}) => notes.emit({ x, y, z, vx: (rng() - .5) * .08, vy: .1 + rng() * .06, sway: .03, color: ['#ffe08a', '#fff4e0', '#ffb3c9', '#d9c4ff'][(rng() * 4) | 0],
        size: .026 + rng() * .012, life: 1.8, shape: 'note', spin: (rng() - .5) * 2, ...o });
      const tapSparks = (x, z) => sparks.burst(7, () => ({ x: x + (rng() - .5) * .02, y: FLOOR + .004, z: z + (rng() - .5) * .015, vx: (rng() - .5) * .25, vy: .08 + rng() * .14,
        vz: (rng() - .5) * .15, gravity: -.5, drag: 2, color: rng() < .6 ? '#ffd774' : '#fff6dc', size: .012 + rng() * .008, life: .5, shape: 'sparkle', spin: 4 }));

      /* light: dusk, then twilight, then night; the painted night fades in over the dusk */
      const L = kit.lights, mix3 = (list, out) => out.copy(list[0]).lerp(list[1], twi).lerp(list[2], night);
      mix3(LIGHT.hemi, L.hemi.color); mix3(LIGHT.ground, L.hemi.groundColor); mix3(LIGHT.sun, L.sun.color);
      L.hemi.intensity = lerp(lerp(1.05, .85, twi), .62, night); L.sun.intensity = lerp(lerp(1.35, 1, twi), .7, night);
      page.night.material.opacity = .32 * twi + .68 * night;
      const u = city.pts.material.uniforms;
      u.uG.value = g; u.uT.value = T; u.uBright.value = lerp(.7, 1.15, Math.max(twi * .5, night));
      u.uWave.value = g > 6.8 && g < 8.2 ? lerp(-.65, .65, seg(g, 6.8, 8.2)) : g > 24.8 && g < 26.4 ? lerp(-.65, .65, seg(g, 24.8, 26.4)) : -9;   // ripples of light through town

      /* the lamp flickers on as they meet, and flares while he swings round it */
      const on = g < 4.9 ? 0 : g < 5 ? .8 : g < 5.08 ? .1 : g < 5.2 ? .9 : g < 5.26 ? .25 : ease.out(seg(g, 5.26, 5.6));
      const flare = 1 + .7 * bump(g, 12.5, 12.7, 13.2, 13.5), flick = 1 + .05 * Math.sin(T * 13) * Math.sin(T * 7.3);
      lamp.glass.emissiveIntensity = 1.9 * on * flare; lamp.halo.material.opacity = .85 * on * flick * Math.min(flare, 1.3);
      lamp.halo.scale.setScalar(.24 * Math.min(flare, 1.15)); lamp.light.intensity = 1.6 * on * flare * flick; lamp.pool.material.opacity = .5 * on * (.9 + .1 * flare);
      if (g > 5.2 && g < 5.6 && kit.once('lamp-on')) sparks.burst(18, () => ({ x: LAMP.x, y: FLOOR + LAMP.bar + .072, z: LAMP.z + .01, vx: (rng() - .5) * .3, vy: (rng() - .3) * .25,
        vz: (rng() - .5) * .2, drag: 2, color: ['#fff1b8', '#ffd28a', '#ffffff'][(rng() * 3) | 0], size: .014 + rng() * .01, life: .8, shape: 'sparkle', spin: 4 }));
      trees.forEach((t, i) => { t.crown.rotation.z = .025 * Math.sin(T * .9 + i * 2); t.crown.rotation.x = .015 * Math.sin(T * .7 + i); });

      /* ── where they are ── */
      let [bx, bz, br] = wayAt(BOY_KEYS, g), [gx, gz, gr] = wayAt(GIRL_KEYS, g);
      let by = FLOOR, gy = FLOOR, bLean = 0, gDip = 0;
      if (g > 11.2 && g < 13.8) { const s = swingAt(g), k = bump(g, 11.2, 11.45, 13.55, 13.8); bx = lerp(bx, s.x, k); bz = lerp(bz, s.z, k); br = lerp(br, s.face, k); by += s.lift; bLean = s.lean; }
      const tap = tapAt(g);
      if (tap.on) { by += tap.hop; gy += tap.hop; bx += tap.slide; gx += tap.slide; }
      const sway = g > 21.2 && g < 22.9 ? Math.sin((g - 21.2) / 1.7 * TAU) * bump(g, 21.2, 21.4, 22.6, 22.9) : 0;   // step-touch, hand in hand
      const bob = .005 * Math.abs(Math.sin((g - 21.2) / 1.7 * TAU)) * bump(g, 21.2, 21.4, 22.6, 22.9);
      bx += .012 * sway; gx += .012 * sway; by += bob; gy += bob;
      gDip = .15 * bump(g, 26, 26.55, 27.1, 27.6);                   // a little lean from her feet: the rest is her back arching
      boy.root.position.set(bx, by, bz); boy.root.rotation.set(.22 * bump(g, 25.95, 26.5, 27.1, 27.6), br, bLean);
      girl.root.position.set(gx, gy, gz); girl.root.rotation.set(-gDip, gr, 0);
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g);
      boy.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);

      /* ── chapter 1: strolling in, pretending not to see each other, the lamp, the invitation ── */
      const pockets = bump(g, .3, .7, 3.4, 3.8);                      // hands in his pockets, whistling
      if (pockets) arms(boy, [-.15, -.95, -.25], [.4, -.45, .55], pockets);
      if (g > 1 && g < 3.4 && kit.once(`whistle${Math.floor(g / .55)}`)) { at(boy, 'head', vA); note(vA.x + .02, vA.y + .06, vA.z + .03, { size: .022 }); }
      const nose = bump(g, .9, 1.3, 3.9, 4.3) + bump(g, 4.3, 4.5, 5.2, 5.4);   // nose in the air
      if (nose) girl.bend('head', -.22 * nose, 0, 0);
      const glance = bump(g, 2.1, 2.35, 2.55, 2.8);                   // they glance at each other and snap away
      if (glance) { boy.bend('head', 0, -.6 * glance, 0); girl.bend('head', 0, .7 * glance, 0); }
      const shake = bump(g, 4.15, 4.3, 4.85, 5);                     // she shakes her head, arms folded
      if (shake) { girl.bend('head', 0, .38 * Math.sin((g - 4.15) * 20) * shake, 0); arms(girl, [-.3, -.35, .9], [.95, .15, .3], bump(g, 4, 4.25, 5.1, 5.4)); }
      const shrug = bump(g, 4.3, 4.55, 4.9, 5.15);                   // he shrugs, palms up
      if (shrug) { arms(boy, [-.45, -.8, .25], [-.55, .4, .75], shrug); boy.bend('head', 0, 0, .25 * shrug); boy.bend('chest', -.08 * shrug, 0, 0); }
      const look = bump(g, 5.05, 5.35, 6.3, 6.7);                    // the lamp! both look up at it
      if (look) { boy.bend('head', -.42 * look, 0, 0); girl.bend('head', -.38 * look, 0, 0); }
      const point = bump(g, 5.3, 5.5, 5.9, 6.1);
      if (point) { boy.aim('upperarm.r', [-.3, .8, .4], point); boy.aim('lowerarm.r', [-.2, .9, .35], point); }
      const lean = bump(g, 6.6, 7, 10.7, 11.1) + bump(g, 11.1, 11.25, 13.6, 13.8);   // his left hand on the post (and through the swing)
      reach(boy, 'l', vT.set(LAMP.x, FLOOR + .21 + .02 * bLean, LAMP.z), lean, .1);
      if (g < 11) boy.bend('spine', 0, 0, -.12 * bump(g, 6.7, 7.1, 10.6, 11));
      const view = bump(g, 6.8, 7.1, 7.6, 7.9);                      // a look back at the city as its lights ripple
      if (view) { boy.bend('head', -.1 * view, .8 * view, 0); girl.bend('head', -.1 * view, -.9 * view, 0); }
      const offer = bump(g, 7.9, 8.3, 10.3, 10.6);                   // he holds out his hand to her, with a little bow
      if (offer) { boy.aim('upperarm.r', [-.12, -.2, 1], offer); boy.aim('lowerarm.r', [.05, .2, 1], offer); boy.bend('chest', .12 * offer, 0, 0); boy.bend('head', -.05 * offer, 0, .12 * offer); }
      const muse = bump(g, 8.4, 8.8, 10.2, 10.4);                    // she thinks it over, a hand to her cheek (the other holds the shoes)
      if (muse) { girl.aim('upperarm.r', [-.3, -.4, .85], muse); girl.aim('lowerarm.r', [.35, .9, .25], muse); girl.bend('head', .05 * muse, .2 * muse, .18 * muse); }
      if (g > 6.85 && g < 7.4 && kit.once('ripple1')) for (let i = 0; i < 3; i++) note(.1 * (i - 1), .3 + .02 * i, -.2, { vy: .06, life: 2.2 });

      /* the enamel plate swings down from the lamp's bar; in chapter 2 it folds away */
      const pIn = seg(g, 8.4, 8.9), pOut = ease.in(seg(g, 10, 10.45)), swing = g < 8.4 ? -1.3 : -1.3 * Math.exp(-3.6 * (g - 8.4)) * Math.abs(Math.cos(7 * (g - 8.4)));
      plate.root.position.set(LAMP.x, FLOOR + LAMP.bar, LAMP.z + .03);    // in front of the post: it swings down and bounces off it
      plate.root.scale.setScalar(Math.max(.001, ease.back(pIn) * (1 - pOut)));
      plate.root.rotation.set(lerp(swing, -1.4, pOut) - .03 * (1 + Math.sin(T * 1.7)) * pIn, 0, .02 * Math.sin(T * 1.1) * pIn);
      if (g > 8.4 && g < 8.8 && kit.once('plate')) sparks.burst(16, i => ({ x: LAMP.x + (i / 15 - .5) * .4, y: FLOOR + LAMP.bar - .02, z: LAMP.z + .03, vy: .05 + rng() * .1,
        vx: (rng() - .5) * .1, drag: 1.5, color: '#fff1b8', size: .014, life: .9, shape: 'sparkle', spin: 3 }));

      /* ── chapter 2: her shoes, his swing round the post, her tapping foot, then the two of them in step ── */
      const tease = bump(g, 10.1, 10.3, 10.6, 10.8);                  // "wait!" a finger up as she goes
      if (tease) { girl.aim('upperarm.r', [-.35, .6, .5], tease); girl.aim('lowerarm.r', [-.1, 1, .1], tease); }
      const watch = bump(g, 10.3, 10.6, 11, 11.2);
      if (watch) { boy.bend('head', 0, -.5 * watch, 0); arms(boy, [-.45, -.8, .25], [-.55, .4, .75], bump(g, 10.45, 10.6, 10.85, 11)); }
      /* the shoes: swinging from her left hand, set at her feet as she bends, on; the old pair lands by the bench */
      at(girl, 'handslot.l', vA);
      const reachDown = bump(g, 12.75, 13.1, 13.5, 13.85), toFeet = ease.inOut(seg(g, 12.8, 13.25));
      if (reachDown) { girl.bend('spine', .3 * reachDown, 0, 0); girl.bend('chest', .35 * reachDown, 0, 0); arms(girl, [-.1, -.7, .7], [.05, -.6, .8], reachDown); }
      at(girl, 'foot.l', vB).add(at(girl, 'foot.r', vC)).multiplyScalar(.5); vB.y = FLOOR + .004;
      newShoes.root.visible = g < SWAP;
      newShoes.root.position.copy(vA).lerp(vB, toFeet); newShoes.root.position.y -= .006 * (1 - toFeet);
      newShoes.root.rotation.set(lerp(R + .15 * Math.sin(T * 3.1 + 1) * (1 - toFeet), 0, toFeet), gr + .3 * Math.sin(T * 2.3) * (1 - toFeet), 0);
      newShoes.root.scale.setScalar(Math.max(.001, 1.6 * (1 - seg(g, SWAP - .15, SWAP))));   // her size: big enough to see swinging from her hand
      if (g > SWAP && g < SWAP + .4 && kit.once('swap')) sparks.burst(26, () => ({ x: vB.x, y: FLOOR + .01, z: vB.z, vx: (rng() - .5) * .3, vy: .1 + rng() * .25, vz: (rng() - .5) * .3,
        gravity: -.4, drag: 1.8, color: ['#f1eaff', '#ffd1dc', '#fff1b8'][(rng() * 3) | 0], size: .014 + rng() * .01, life: .9, shape: 'sparkle', spin: 4 }));
      const drop = ease.back(seg(g, SWAP + .05, SWAP + .4));
      oldShoes.root.visible = g > SWAP;
      oldShoes.root.position.set(BENCH.x + .095, FLOOR + .03 * (1 - seg(g, SWAP + .05, SWAP + .3)), BENCH.z + .07); oldShoes.root.rotation.y = -.7;
      oldShoes.root.scale.setScalar(Math.max(.001, 1.6 * drop));
      worn.forEach(w => { w.visible = g > SWAP - .05; });                // the new pair on her feet, out of the sparkles
      /* her eye roll, arms folded, and the foot that taps along anyway */
      const fold = bump(g, 13.75, 14, 14.65, 14.85);
      if (fold) { arms(girl, [-.3, -.35, .9], [.95, .15, .3], fold); girl.bend('head', -.22 * fold - .12 * Math.sin((g - 13.8) * 5) * fold, .3 * Math.sin((g - 13.8) * 5) * fold, 0); }
      const tapFoot = bump(g, 13.9, 14, 14.7, 14.8), beat = Math.max(0, Math.sin((g - 13.9) * 21));
      if (tapFoot) girl.bend('lowerleg.r', -.45 * beat * tapFoot, 0, 0);
      if (tapFoot && kit.once(`foot${Math.floor((g - 13.9) * 21 / TAU)}`)) { at(girl, 'foot.r', vC); note(vC.x, vC.y + .03, vC.z + .02, { size: .02, life: 1.2 }); }
      /* his swing: the left arm reaches the post (above), his legs fly out; music notes and the lamp's flare */
      const tada = bump(g, 13.75, 14, 14.45, 14.7);
      if (tada) { arms(boy, [-.85, .3, .3], [-.55, .8, .2], tada); boy.bend('chest', -.1 * tada, 0, 0); }
      const fly = bump(g, 12.5, 12.7, 13.15, 13.4);
      if (fly) { boy.aim('upperleg.r', [-.5, -.75, -.35], fly); boy.aim('upperleg.l', [-.25, -.85, -.4], fly); boy.aim('upperarm.r', [-.85, .2, -.2], fly); }
      for (const [t0, key] of [[12.6, 'swing1'], [13.3, 'swing2']]) if (g > t0 && g < t0 + .4 && kit.once(key)) {
        at(boy, 'head', vA); for (let i = 0; i < 4; i++) note(vA.x + (rng() - .5) * .05, vA.y + .05, vA.z, { vx: (rng() - .5) * .2 });
      }
      const beckon = bump(g, 14.65, 14.85, 15.35, 15.55);             // "come on!"
      if (beckon) { boy.aim('upperarm.r', [-.25, -.25, .95], beckon); boy.aim('lowerarm.r', [-.1, .45 + .45 * Math.sin((g - 14.65) * 16), .9], beckon); }

      /* the routine, in step: arms swing, then out with jazz hands, then up for the jump with a heel click */
      if (tap.on || g >= 19.3) {
        const swingArms = tap.on && tap.b < 2 ? Math.sin((g - TAP) / BEAT * Math.PI) : 0;
        for (const m of [boy, girl]) {
          if (tap.on && tap.b < 2) { m.aim('upperarm.r', [-.25, -.9, .35 * swingArms], 1); m.aim('upperarm.l', [.25, -.9, -.35 * swingArms], 1); }
          else if (tap.on && tap.b < 6) arms(m, [-.72, .12, .55], [-.42, .85, .3], 1);   // jazz hands, a little forward: no hand in the other's way
          if (tap.kick) { m.aim(`upperleg.${tap.side}`, [0, -.22, 1], tap.kick); m.aim(`lowerleg.${tap.side}`, [0, -.05, 1], tap.kick); m.bend('spine', -.12 * tap.kick, 0, 0); }
          if (tap.jump > 0) { arms(m, [-.5, .85, .15], [-.4, .9, .1], tap.jump); m.aim('lowerleg.r', [0, -.6, -.8], tap.jump); m.aim('lowerleg.l', [0, -.6, -.8], tap.jump); }
        }
        const fin = ease.smooth(seg(g, 19.38, 19.65)) * (1 - ease.smooth(seg(g, 20.6, 21)));   // ta-da: the outer arms up, hand in hand
        if (fin) {
          boy.aim('upperarm.r', [-.55, .8, .2], fin); boy.aim('lowerarm.r', [-.4, .9, .1], fin); girl.aim('upperarm.l', [.55, .8, .2], fin); girl.aim('lowerarm.l', [.4, .9, .1], fin);
          at(boy, 'upperarm.l', vA).add(at(girl, 'upperarm.r', vB)).multiplyScalar(.5); vA.y -= .01; vA.z += .03;   // and the inner hands joined between them
          reach(boy, 'l', vA, fin, .15); reach(girl, 'r', vA, fin, .15);
          boy.bend('spine', 0, 0, -.08 * fin); girl.bend('spine', 0, 0, .08 * fin); boy.bend('head', 0, 0, -.1 * fin * (1 + .3 * Math.sin(T * 2))); girl.bend('head', 0, 0, .12 * fin);
        }
        if (tap.on && tap.f < .25 && tap.b > 0 && kit.once(`tap${tap.b}`)) {
          for (const m of [boy, girl]) { at(m, 'foot.l', vC); tapSparks(vC.x, vC.z); }
          note(.06 + (rng() - .5) * .1, .3, .08);
        }
      }
      if (g > 19.4 && g < 19.7 && kit.once('land')) { for (const m of [boy, girl]) { at(m, 'foot.r', vC); tapSparks(vC.x, vC.z); at(m, 'foot.l', vC); tapSparks(vC.x, vC.z); } }
      /* the notes gather into a ring above them: the photo comes out of it in a frame of bulbs */
      const ph = ease.back(seg(g, 19.75, 20.3)), aside = ease.inOut(seg(g, 20.6, 21.4)), pc = vD.set(PHOTO_AT[0], PHOTO_AT[1] + photo.height / 2, PHOTO_AT[2]);
      if (g > 19.42 && g < 19.8 && kit.once('gather')) notes.burst(18, i => {
        const a = i / 18 * TAU, d = .24, drag = 3.2;
        return { x: pc.x + Math.cos(a) * d, y: pc.y + Math.sin(a) * d * .8, z: pc.z + .02, vx: (-Math.cos(a) * d + Math.sin(a) * .1) * drag, vy: (-Math.sin(a) * d * .8 - Math.cos(a) * .1) * drag,
          drag, color: ['#ffe08a', '#fff4e0', '#ffb3c9', '#d9c4ff'][i % 4], size: .03, life: .75, shape: 'note', spin: 3 };
      });
      if (g > 19.75 && g < 20.1 && kit.once('flash')) sparks.burst(30, () => { const a = rng() * TAU, s = .15 + rng() * .2; return { x: pc.x, y: pc.y, z: pc.z + .02,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2.2, color: ['#fff1b8', '#ffd28a', '#ffffff'][(rng() * 3) | 0], size: .016 + rng() * .01, life: .9, shape: 'sparkle', spin: 4 }; });
      photo.root.position.set(lerp(PHOTO_AT[0], PHOTO_ASIDE[0], aside), lerp(PHOTO_AT[1], PHOTO_ASIDE[1], aside) + .006 * Math.sin(T * 1.3), lerp(PHOTO_AT[2], PHOTO_ASIDE[2], aside));
      photo.root.scale.setScalar(Math.max(.001, ph * lerp(1, .48, aside)));
      photo.root.rotation.set(-.06, -.12 * aside + .05 * Math.sin(T * .8), .03 * Math.sin(T * .6));
      photo.halo.material.opacity = .55 * ph * (1 - .5 * aside) * (1 + .08 * Math.sin(T * 3));
      marquee.pose(seg(g, 19.85, 20.25) * (1 - .35 * aside), T, photo.root.scale.x);

      /* ── chapter 3: hand in hand, the twirl, the spins, the dip, foreheads together ── */
      const hold = bump(g, 20.95, 21.25, 22.8, 22.95) + bump(g, 27.65, 28, 40, 41);   // his right hand in her left, in front of them
      if (hold) {
        at(boy, 'upperarm.r', vA).add(at(girl, 'upperarm.l', vB)).multiplyScalar(.5); vA.y -= g > 27 ? .07 : .045; vA.z += .015;
        reach(boy, 'r', vA, hold); reach(girl, 'l', vA, hold);
      }
      const back = bump(g, 27.65, 28, 40, 41);                        // and the other two hands joined behind
      if (back) { at(boy, 'upperarm.l', vB).add(at(girl, 'upperarm.r', vC)).multiplyScalar(.5); vB.y -= .07; vB.z -= .015; reach(boy, 'l', vB, back); reach(girl, 'r', vB, back); }
      const skirt = bump(g, 21.1, 21.4, 22.7, 22.95);                 // her free hand out to the side, his rests at his side
      if (skirt) { girl.aim('upperarm.r', [-.6, -.75, .1], skirt); girl.aim('lowerarm.r', [-.75, -.55, .2], skirt); }
      const twirl = bump(g, 22.9, 23.15, 24.45, 24.7);                // his right hand up high, her left up to it, and round she goes
      if (twirl) {
        vA.set((bx + gx) / 2, FLOOR + .31, (bz + gz) / 2 + .025);    // joined above her head
        reach(boy, 'r', vA, twirl, 0); reach(girl, 'l', vA, twirl, 0);
        girl.aim('upperarm.r', [-.85, .1, .2], twirl); girl.aim('lowerarm.r', [-.8, .35, .1], twirl);
        boy.aim('upperarm.l', [.55, -.7, -.2], twirl); boy.aim('lowerarm.l', [-.75, -.15, .25], twirl);   // his left hand on his hip
      }
      const spin = bump(g, 24.65, 24.85, 25.6, 25.8);                 // spinning apart, arms up and out
      if (spin) for (const m of [boy, girl]) arms(m, [-.6, .7, .15], [-.45, .85, .1], spin);
      const dip = bump(g, 25.95, 26.4, 27.2, 27.6);
      if (dip) {                                                      // she arches back over his arm, he leans over her
        girl.bend('spine', -.35 * dip, 0, 0); girl.bend('chest', -.35 * dip, 0, 0); girl.bend('head', -.3 * dip, 0, 0);
        boy.bend('chest', .22 * dip, 0, 0); boy.bend('head', .1 * dip, 0, 0);
        at(girl, 'spine', vA); vA.x -= Math.sin(gr) * .022 - Math.cos(gr) * .01; vA.z -= Math.cos(gr) * .022 + Math.sin(gr) * .01;   // behind her back, on the near side:
        reach(boy, 'r', vA, dip, .1);                                                                                         // his arm round her
        at(boy, 'upperarm.r', vB); reach(girl, 'l', vB, dip * .9, .15);                               // her hand on his shoulder
        girl.aim('upperarm.r', [-.75, -.35, -.4], dip); girl.aim('lowerarm.r', [-.7, -.2, -.6], dip);  // her other arm thrown back
        girl.aim('upperleg.r', [0, -.8, .6], dip * .7); girl.aim('lowerleg.r', [0, -.5, .85], dip * .7);   // and a leg out along the ground
      }
      const close = ease.smooth(seg(g, 28.05, 28.8)), rock = .03 * Math.sin(T * 1.4) * seg(g, 29.5, 30.5);
      if (close) for (const m of [boy, girl]) { m.bend('chest', .2 * close, 0, 0); m.bend('head', .3 * close, 0, 0); }
      if (rock) { boy.bend('spine', 0, 0, rock); girl.bend('spine', 0, 0, rock); }
      /* as she turns, a ring of sparkles off her hem */
      const spinRate = Math.abs(tween(g, GIRL_KEYS[2]) - tween(g - .05, GIRL_KEYS[2])) / .05;
      if (dt && spinRate > 3) for (let i = 0; i < 2; i++) {
        const a = rng() * TAU; sparks.emit({ x: gx + Math.cos(a) * .05, y: FLOOR + .03 + rng() * .04, z: gz + Math.sin(a) * .05, vx: -Math.sin(a) * .1, vz: Math.cos(a) * .1, vy: .04,
          drag: 1.5, color: rng() < .5 ? '#f1d9ff' : '#fff1b8', size: .012 + rng() * .008, life: .7, shape: 'sparkle', spin: 4 });
      }
      if (g > 21.3 && g < 26 && kit.once(`beat${Math.floor(g / .45)}`)) note(.065 + (rng() - .5) * .25, .32 + rng() * .05, .02 + (rng() - .5) * .1, { size: .022 });
      /* the shooting star, just as he dips her */
      if (g > 26.25 && g < 27.05 && dt) {
        const k = seg(g, 26.25, 27.05), x = lerp(.52, .08, k), y = lerp(.77, .64, ease.out(k));
        sparks.emit({ x, y, z: pageZ(x) + .012, color: '#fffbe6', size: .034, life: .5, shape: 'sparkle', spin: 4 });
        sparks.emit({ x: x + .012, y: y + .004, z: pageZ(x) + .012, color: '#ffe7a3', size: .022, life: .8, shape: 'glow' });
      }
      if (g > 28.4 && g < 28.9 && kit.once('love')) hearts.burst(16, () => ({ x: .064 + (rng() - .5) * .06, y: .3, z: .06, vx: (rng() - .5) * .18, vy: .12 + rng() * .12,
        gravity: -.06, drag: .7, color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .022 + rng() * .014, life: 2.4, shape: 'heart', spin: (rng() - .5) * 3 }));
      if (held && dt && g > 30 && rng() < dt * 1.1) hearts.emit({ x: .064 + (rng() - .5) * .08, y: .3, z: .06, vy: .05, sway: .03, color: '#ff8fab', size: .018, life: 2.4, shape: 'heart' });

      /* the stars come out one by one; fireflies over the grass; the ribbon unrolls with a sparkle at its roll */
      for (const st of STARS) if (g > st.at && kit.once(st.key)) stars.emit(st);
      if (g > 26.5 && dt && rng() < dt * 3) flies.emit({ x: (rng() - .5) * .9, y: FLOOR + .03 + rng() * .2, z: (rng() - .5) * .45, vx: (rng() - .5) * .03, vy: .012, sway: .04,
        color: rng() < .5 ? '#e6ff8a' : '#ffe48a', size: .014 + rng() * .01, life: 4 + rng() * 3, shape: 'glow', twinkle: 6 });
      const un = ease.inOut(seg(g, 28.8, 30.1)), rIn = ease.back(seg(g, 28.55, 28.85));
      ribbon.root.position.set(RIBBON_AT[0], RIBBON_AT[1] + .006 * Math.sin(T * 1.5), RIBBON_AT[2]);
      ribbon.root.scale.setScalar(Math.max(.001, rIn)); ribbon.root.rotation.set(-.1, 0, .015 * Math.sin(T * 1.1));
      const head = ribbon.unroll(un);
      if (g > 28.8 && g < 30.1 && dt) sparks.emit({ x: RIBBON_AT[0] + head, y: RIBBON_AT[1] + (rng() - .5) * .12, z: RIBBON_AT[2] + .02, vx: (rng() - .5) * .05, vy: (rng() - .5) * .05,
        drag: 1, color: rng() < .5 ? '#fff1b8' : '#ffd1dc', size: .016 + rng() * .01, life: .8, shape: 'sparkle', spin: 3 });

      for (const p of particles) p.update(dt, T);
    }
  };
};
