/* Máy bay giấy (paper planes), told by the shared act _acts/lovestory.js; the street is built by city.js, the paper by
   paper.js and the flying by flight.js, all loaded first. The card is drawn in pencil greys on cream with one colour,
   coral: her scarf, his tie, the heart she draws and the glow at the end. Four chapters, each ending at a stop:
     1 · 0–10 s   a windy morning street: he walks in with a stack of papers, she waits at the crossing; a gust snatches
                  his top sheet and slaps it onto her face; she peels it off, laughs, draws a little coral heart on it and
                  brings it back to him; the light turns green and the wind hurries her across the road and in at her
                  door; the sheet lifts out of his hand with the card's first words (note1) on it, by her heart
     2 · 10–20 s  her window lights up across the road; he waves, she doesn't see; he folds plane after plane and throws
                  them: one is swirled off by a gust into the alley, one bumps her window just as she looks away and is
                  swept down after it, the third is blown away over the roofs; he slumps onto the pavement, and that
                  last plane comes back on the wind and opens in the air before him: the card's second words (note2)
     3 · 20–30 s  it folds up again, circles him and dives into the alley; the lost planes there wake and rise in a
                  swirl: some circle him and nudge him up and on down the street, some fly to her window and tug her
                  scarf till she comes out of her door and across the road; both are led to the same corner, where six
                  planes bring down the card's photo hanging under them, with its caption
     4 · 30–40 s  face to face: he holds out the sheet, she knows her heart on it and jumps for joy; warm colour seeps out
                  from where they stand, across the road, up the walls and into the sky, the lamp lights, all the planes
                  circle them in a heart and two of them raise a banner with the last words (note3)
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own;
   the wind, the flutter and the circling go by T, the act's own time, so they go on while the act waits. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;
  const L = {                                                        // the street (city.js builds it from this)
    FRONT: -.165,                                                    // the fronts of the two blocks across the road
    A: { x0: -.5, x1: -.08, h: .56 }, B: { x0: .02, x1: .5, h: .68 },
    ROAD: [-.1, .045], CROSS: [.04, .19],                            // the road (z); the zebra crossing (x)
    WIN: { x0: .21, x1: .35, y0: .42, y1: .63, floor: .28 },         // her window, and the floor of her room behind it (the sill at her hips)
    DOOR: { x0: .06, x1: .16, h: .34 },                              // her door, tall enough for her (she is .2835)
    LAMP: [-.45, .085], POST: [-.37, .08], SIGNAL: [.215, .06]
  };
  const NOTE1_AT = [-.1, .5, .1], NOTE2_AT = [.0, .47, .12];         // where the words are read at stops 1 and 2
  const MEET = [.07, .17];                                           // the corner they are both led to
  const HEART = [.07, .25, -.07], HEART_W = .5;                      // the planes' heart round them at the end
  const PLANE = .062, NOTE_SCALE = .3 / PLANE;                       // a plane's size; the scale at which a sheet is read (.3 tall)
  const CORAL = '#f26b5b';
  const GREY_LIGHT = { hemi: new THREE.Color('#f2f0eb'), ground: new THREE.Color('#8d8a86'), sun: new THREE.Color('#ffffff') };
  const WARM_LIGHT = { hemi: new THREE.Color('#ffe2c6'), ground: new THREE.Color('#b8897a'), sun: new THREE.Color('#ffca94') };
  let city, paper, fly, boy, girl, tie, pen, stack, memo, fleet, sheet, trails, wind, threads, photo, develop, banner, glowCoral, heartGlow;
  let leaves, scraps, sparks, hearts, puffs, scarf, warmBoy, warmGirl;

  /* ── who does what: [from g, clip, options] ── */
  const BOY = [
    [0, 'Idle'], [.2, 'Walking_A', { speed: 1.42 }], [2.55, 'Idle', { fade: .2 }],
    [4.1, 'Walking_A', { speed: 1.25 }], [4.8, 'Idle', { fade: .25 }],
    [12.75, 'Throw', { once: true, speed: 1.3, key: 1, fade: .1 }], [13.85, 'Idle', { fade: .25 }],
    [14.6, 'Throw', { once: true, speed: 1.3, key: 2, fade: .1 }], [15.7, 'Idle', { fade: .25 }],
    [16.5, 'Throw', { once: true, speed: 1.3, key: 3, fade: .1 }], [17.6, 'Idle', { fade: .25 }],
    [17.95, 'Sit_Floor_Down', { once: true, fade: .2 }], [18.95, 'Sit_Floor_Idle', { fade: .3 }],
    [23.55, 'Sit_Floor_StandUp', { once: true, fade: .2 }], [24.65, 'Idle', { fade: .2 }], [24.75, 'Walking_A', { speed: 1.23 }], [26.05, 'Idle', { fade: .25 }],
    [31.55, 'Use_Item', { once: true, fade: .2 }], [32.75, 'Idle', { fade: .4 }], [34.2, 'Walking_A', { speed: .6 }], [34.7, 'Idle', { fade: .25 }]
  ];
  const GIRL = [
    [0, 'Idle'], [5.5, 'Walking_A', { speed: 1.4 }], [6.35, 'Idle', { fade: .2 }],
    [6.4, 'Use_Item', { once: true, fade: .2, speed: 1.2 }], [7.5, 'Idle', { fade: .2 }], [7.95, 'Running_A', { speed: .72, fade: .15 }], [9.05, 'Idle'],
    [10.6, 'Walking_A', { speed: 1.7 }], [11.3, 'Idle', { fade: .2 }],
    [24.45, 'Walking_A', { speed: 1.3 }], [25.0, 'Idle'], [25.1, 'Walking_A', { speed: 1.75 }], [27.45, 'Idle', { fade: .25 }],
    [32.55, 'Cheer', { once: true, fade: .2 }], [34.15, 'Idle', { fade: .3 }], [34.2, 'Walking_A', { speed: .6 }], [34.7, 'Idle', { fade: .25 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));

  /* ── where each of them is: [from g, x, z, facing, ease into it (smooth by default)] ── */
  const BOY_WAY = [
    [0, -.57, .21, R], [.2, -.57, .21, R, 'linear'], [2.5, -.24, .21, R, 'linear'], [2.65, -.235, .21, R, 'out'],
    [4.1, -.235, .21, R], [4.8, -.15, .205, R * .95], [6.6, -.15, .205, 1.35], [7.4, -.15, .205, 1.35], [8.0, -.15, .205, 2.2], [8.9, -.15, .205, 2.45],
    [9.3, -.15, .205, .7], [10.9, -.15, .205, .7], [11.2, -.15, .205, 2.0],
    [12.1, -.15, .205, 2.0], [12.2, -.15, .205, 1.55], [12.55, -.15, .205, 1.55], [12.75, -.15, .205, 2.27],
    [13.95, -.15, .205, 2.27], [14.1, -.15, .205, 1.55], [14.4, -.15, .205, 1.55], [14.6, -.15, .205, 2.27],
    [15.8, -.15, .205, 2.27], [15.95, -.15, .205, 1.55], [16.3, -.15, .205, 1.55], [16.5, -.15, .205, 2.27],
    [17.55, -.15, .205, 2.27], [17.95, -.15, .205, .35], [23.6, -.15, .205, .35], [24.6, -.15, .205, .9], [24.75, -.15, .205, 1.25],
    [26.0, MEET[0] - .07, MEET[1], 1.3, 'linear'], [26.35, MEET[0] - .07, MEET[1], .35, 'out'],
    [30.4, MEET[0] - .07, MEET[1], .35], [31.4, MEET[0] - .07, MEET[1], 1.35], [34.2, MEET[0] - .07, MEET[1], 1.35], [34.7, MEET[0] - .05, MEET[1], 1.1]
  ];
  const GIRL_WAY = [   // (in her room she keeps .06 back from the wall: her toes are that far ahead of her)
    [0, .1, .14, -.7], [2.7, .1, .14, -.7], [3.0, .1, .14, -1.25], [5.5, .1, .14, -1.25], [6.35, .0, .19, -1.45, 'linear'],
    [7.3, .0, .19, -1.45], [7.45, .0, .19, -.4], [7.8, .0, .19, -.2], [7.95, .0, .19, 2.4], [8.35, .1, .085, 2.95, 'linear'],
    [8.85, .11, -.14, 3.1, 'linear'], [9.05, .11, -.2, 3.14, 'out'],
    [10.59, .11, -.2, 3.14], [10.6, .4, -.225, -R], [11.3, .28, -.225, -R, 'linear'], [11.5, .28, -.225, 0],
    [15.6, .28, -.225, 0], [15.8, .28, -.225, -.55], [16.6, .28, -.225, -.55], [16.9, .28, -.225, .1],
    [23.0, .28, -.225, .1], [23.3, .28, -.225, 0], [24.3, .28, -.225, 0], [24.5, .28, -.225, R], [25.0, .41, -.225, R, 'linear'],
    [25.09, .41, -.205, R], [25.1, .11, -.215, 0], [25.5, .11, -.14, 0, 'linear'], [27.4, MEET[0] + .07, MEET[1], 0, 'linear'], [27.7, MEET[0] + .07, MEET[1], -.35, 'out'],
    [30.4, MEET[0] + .07, MEET[1], -.35], [31.4, MEET[0] + .07, MEET[1], -1.35], [34.2, MEET[0] + .07, MEET[1], -1.35], [34.7, MEET[0] + .05, MEET[1], -1.1]
  ];
  const keysOf = way => [1, 2, 3].map(i => way.map(k => [k[0], k[i], k[4] || 'smooth']));
  const BOY_KEYS = keysOf(BOY_WAY), GIRL_KEYS = keysOf(GIRL_WAY);
  const wayAt = (keys, g) => [tween(g, keys[0]), tween(g, keys[1]), tween(g, keys[2])];
  const inRoom = g => g >= 10.6 && g < 25.1, inside = g => (g > 9.04 && g < 10.6) || (g > 25.0 && g < 25.1);
  const sitK = g => ease.inOut(seg(g, 18.0, 18.85)) * (1 - ease.inOut(seg(g, 23.6, 24.45)));
  const boyAt = (g, out) => { const [x, z] = wayAt(BOY_KEYS, g); return out.set(x, 0, z); };
  const girlAt = (g, out) => { const [x, z] = wayAt(GIRL_KEYS, g); return out.set(x, inRoom(g) ? L.WIN.floor : 0, z); };

  /* ── arms: poses in a character's own space, [upper arm, forearm], for the right arm (the left mirrors x) ── */
  const ARM = {
    carry: [[-.12, -.85, .45], [.3, .05, .95]],                       // the stack carried at the belly
    hold: [[-.18, -.6, .78], [.5, .45, .75]],                         // a hand in front of the chest
    dismay: [[-.6, .55, .4], [.25, .92, .05]],                        // hands up by the head: oh no
    face: [[-.25, .15, .95], [.55, .78, .3]],                         // hands at her face, peeling the sheet off
    mouth: [[-.22, -.1, .97], [.5, .85, .2]],                         // a hand to the mouth: a giggle, a gasp
    sill: [[-.32, -.5, .8], [.12, .05, 1]],                           // forearms on the sill
    fold: [[-.22, -.55, .8], [.65, .3, .7]],                          // both hands together in front: folding
    offer: [[-.3, -.12, .95], [-.12, .3, .95]],                       // a hand held out
    take: [[-.1, -.6, .8], [.85, .2, .5]],                            // across to the stack in the other hand
    tuck: [[-.15, -.5, .85], [.85, .5, .15]],                         // a hand to the chest: into the jacket
    head: [[-.4, .05, .9], [.55, .8, .2]],                            // sitting with his head in his hands
    scarf: [[-.12, -.45, .88], [.75, .6, .3]],                        // holding her scarf against the wind
    wave: g => [[-.45, .85, .25], [-.1 + .45 * Math.sin(g * 14), 1, .25]],
    draw: g => [[-.2, -.55, .8], [.42 + .1 * Math.sin(g * 16), .42 + .08 * Math.cos(g * 16), .75]]
  };
  const ARMS = {
    boy: {
      r: [[0, null, 0], [3.5, 'dismay', .25], [4.15, null, .35], [6.55, 'reach', .35], [7.15, 'hold', .3], [9.3, null, .5],
        [10.3, 'hold', .3], [10.62, 'tuck', .2], [10.9, null, .3], [11.35, 'wave', .2], [11.85, null, .2],
        [11.95, 'take', .15], [12.12, 'fold', .12], [12.62, null, .12], [13.82, 'take', .15], [13.97, 'fold', .12], [14.47, null, .12],
        [15.72, 'take', .15], [15.87, 'fold', .12], [16.37, null, .12], [18.95, 'head', .5], [19.3, null, .6],
        [31.5, null, 0], [32.55, 'offer', .4], [33.95, null, .4], [34.5, 'hand', .5]],
      l: [[0, 'carry', 0], [3.5, 'dismay', .25], [4.15, 'carry', .35], [12.12, 'fold', .12], [12.62, 'carry', .2], [13.97, 'fold', .12], [14.47, 'carry', .2],
        [15.87, 'fold', .12], [16.37, 'carry', .2], [17.75, null, .4], [18.95, 'head', .5], [19.3, null, .6]]
    },
    girl: {
      r: [[0, 'scarf', 0], [3.3, null, .05], [3.42, 'face', .15], [3.8, 'hold', .3], [4.05, 'mouth', .2], [4.5, 'draw', .25], [5.45, 'hold', .3],
        [6.4, null, .2], [7.4, null, 0], [7.45, 'wave', .15], [7.9, null, .15], [11.45, 'sill', .3], [23.2, 'mouth', .25], [24.2, null, .3],
        [31.3, 'mouth', .25], [32.5, null, .2], [33.8, 'reach', .3], [34.25, 'hold', .3]],
      l: [[0, 'scarf', 0], [3.3, null, .05], [3.42, 'face', .15], [3.8, 'hold', .3], [5.45, null, .4], [11.45, 'sill', .3], [23.2, null, .3],
        [31.3, 'mouth', .25], [32.5, null, .2], [34.5, 'hand', .5]]
    }
  };
  const mStage = new THREE.Matrix4(), vS = new THREE.Vector3(), vT = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3(), qInv = new THREE.Quaternion();
  const stagePos = (o, out) => { o.updateWorldMatrix(true, false); return out.setFromMatrixPosition(o.matrixWorld).applyMatrix4(mStage); };
  /** the way from a character's shoulder to a point on the stage, in its own space */
  const toward = (m, side, p) => { stagePos(m.node(`upperarm.${side}`), vS); vT.copy(p).sub(vS).applyQuaternion(qInv.copy(m.root.quaternion).invert()); return [vT.x, vT.y, vT.z]; };
  const LEN = new Map(), vE = new THREE.Vector3(), vN = new THREE.Vector3(), vQ = new THREE.Vector3(), vD = new THREE.Vector3();
  /** a two-bone reach: the upper arm's and the forearm's way that put the hand on p, the elbow down and out */
  function ik(m, side, p) {
    const key = `${m.root.name}${side}`;
    if (!LEN.has(key)) { const a = stagePos(m.node(`upperarm.${side}`), vS).distanceTo(stagePos(m.node(`lowerarm.${side}`), vT)); LEN.set(key, [a, vT.distanceTo(stagePos(m.node(`handslot.${side}`), vE))]); }
    const [a, b] = LEN.get(key);
    vD.fromArray(toward(m, side, p)); const d = vD.length(); vN.copy(vD).normalize();
    if (d >= (a + b) * .995) return [vN.toArray(), vN.toArray()];
    const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * Math.max(d, 1e-4)), -1, 1));
    vQ.set(side === 'r' ? -.45 : .45, -1, -.35); vQ.addScaledVector(vN, -vQ.dot(vN)).normalize();
    vE.copy(vN).multiplyScalar(Math.cos(A)).addScaledVector(vQ, Math.sin(A));
    return [vE.toArray(), vD.addScaledVector(vE, -a).normalize().toArray()];
  }
  const TARGET = { boy: new THREE.Vector3(), girl: new THREE.Vector3() };   // where 'reach' and 'hand' go this frame
  const poseOf = (name, side, m, g) => {
    if (name === 'reach' || name === 'hand') return ik(m, side, TARGET[m.root.name]);
    const p = typeof ARM[name] === 'function' ? ARM[name](g) : ARM[name];
    return side === 'l' ? p.map(d => [-d[0], d[1], d[2]]) : p;
  };
  function arms(m, keys, g) {
    for (const side of ['r', 'l']) {
      const list = keys[side]; let i = 0;
      while (i + 1 < list.length && g >= list[i + 1][0]) i++;
      const [t0, now, blend] = list[i], prev = i > 0 ? list[i - 1][1] : null;
      const k = blend ? ease.inOut(clamp((g - t0) / blend)) : 1;
      let pose = null, w = 1;
      if (now && prev) { const a = poseOf(prev, side, m, g), b = poseOf(now, side, m, g); pose = a.map((d, j) => d.map((v, n) => lerp(v, b[j][n], k))); }
      else if (now) { pose = poseOf(now, side, m, g); w = k; }
      else if (prev) { pose = poseOf(prev, side, m, g); w = 1 - k; }
      if (pose && w > 0) { m.aim(`upperarm.${side}`, pose[0], w); m.aim(`lowerarm.${side}`, pose[1], w); }
    }
  }

  /* ── the two of them in pencil greys (their own texture with its colour taken out), each with one coral thing built
        here; warm(k) brings their own colours back in as the warmth reaches them ── */
  const canvas = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw && draw(cv.getContext('2d'), w, h); return cv; };
  function dress(m) {
    let mt = null; m.scene.traverse(o => { if (!mt && o.isMesh && o.material && o.material.map) mt = o.material; });
    const img = mt && mt.map && mt.map.image; if (!img || !img.width) return () => {};
    const W = img.width, H = img.height, hot = canvas(W, H, c => c.drawImage(img, 0, 0));
    const grey = canvas(W, H, c => {
      c.drawImage(img, 0, 0);
      c.globalCompositeOperation = 'saturation'; c.fillStyle = '#808080'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'screen'; c.fillStyle = '#2a2826'; c.fillRect(0, 0, W, H);   // a shade lighter, like pencil on cream
    });
    const mix = canvas(W, H, c => c.drawImage(grey, 0, 0));
    const old = mt.map, t = kit.keep(new THREE.CanvasTexture(mix));
    t.flipY = old.flipY; t.colorSpace = old.colorSpace; t.wrapS = old.wrapS; t.wrapT = old.wrapT; t.magFilter = old.magFilter; t.minFilter = old.minFilter; t.anisotropy = 4;
    mt.map = t; mt.needsUpdate = true; old.dispose();
    let k = -1;
    return v => {
      const n = Math.round(clamp(v) * 16) / 16; if (n === k) return; k = n;
      const c = mix.getContext('2d'); c.globalAlpha = 1; c.drawImage(grey, 0, 0); c.globalAlpha = n; c.drawImage(hot, 0, 0); c.globalAlpha = 1; t.needsUpdate = true;
    };
  }
  /** a group on one of a model's bones that keeps the model's own frame as it stands at rest (card widths from its feet,
      +x its left, +y up, +z where it faces): what is built in it goes where the bone goes. Make it before the model moves */
  function onBone(m, bone) {
    const b = m.node(bone), grp = new THREE.Group(); if (!b) return grp;
    m.root.updateMatrixWorld(true);
    new THREE.Matrix4().copy(b.matrixWorld).invert().multiply(m.root.matrixWorld).decompose(grp.position, grp.quaternion, grp.scale);
    b.add(grp); return grp;
  }
  /** her coral scarf, in her chest's onBone frame (her fit to .2835): a loop round her neck and its two ends hanging in
      front, one mesh so that the wind (flutter) can take them */
  function makeScarf(frame) {
    const m = kit.keep(new THREE.MeshStandardMaterial({ color: CORAL, roughness: .8, side: THREE.DoubleSide, emissive: CORAL, emissiveIntensity: .08 }));
    const loop = new THREE.Mesh(kit.keep(new THREE.TorusGeometry(.0128, .0042, 8, 24)), m);
    loop.rotation.x = R; loop.position.set(0, .2265, -.0055); loop.castShadow = true; frame.add(loop);
    const g = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
    [[-.003, .05, 0], [.007, .042, .0015]].forEach(([x, len, z]) => {   // one end a little longer than the other
      const N = 8, base = pos.length / 3;
      for (let i = 0; i <= N; i++) for (const sd of [-1, 1]) { pos.push(x + sd * .0055, -len * i / N, z); uv.push((sd + 1) / 2, 1 - i / N); }
      for (let i = 0; i < N; i++) { const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    });
    g.setIndex(idx); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const ends = new THREE.Mesh(kit.keep(g), m); ends.position.set(.003, .2235, .0115); ends.rotation.x = -.3; ends.castShadow = true; frame.add(ends);
    return ends;
  }

  /* ── her scarf's ends: they stream in the wind, rippling, and a plane can pull them ── */
  function cloth(node) {
    if (!node || !node.geometry) return null;
    const geo = node.geometry, p = geo.attributes.position, base = new Float32Array(p.count * 3);
    let top = -Infinity, bottom = Infinity;
    for (let i = 0; i < p.count; i++) { base[i * 3] = p.getX(i); base[i * 3 + 1] = p.getY(i); base[i * 3 + 2] = p.getZ(i); top = Math.max(top, base[i * 3 + 1]); bottom = Math.min(bottom, base[i * 3 + 1]); }
    return { node, geo, base, top, len: top - bottom || 1, rx: node.rotation.x, rz: node.rotation.z };
  }
  /** lift: how far it streams back (radians); side: how far it blows to her left (+) or right (-); amp: its ripple */
  function flutter(cl, lift, side, amp, T) {
    if (!cl) return;
    cl.node.rotation.x = cl.rx + lift; cl.node.rotation.z = cl.rz + side;
    const p = cl.geo.attributes.position, b = cl.base;
    for (let i = 0; i < p.count; i++) {
      const s = (cl.top - b[i * 3 + 1]) / cl.len;
      p.setXYZ(i, b[i * 3] + side * .4 * s * s * cl.len, b[i * 3 + 1], b[i * 3 + 2] - cl.len * s * s * (amp * .09 * Math.sin(T * 12 - s * 5) + lift * .1));
    }
    p.needsUpdate = true; cl.geo.computeVertexNormals();
  }

  /* ── wind you can see: dashed curls that blow through, drawn with the trails' dashes ── */
  const GUSTS = [];                                                  // [from g, seconds, curve]
  const curveOf = pts => { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal'); c.arcLengthDivisions = 80; return c; };
  function addGust(t0, dur, pts) { GUSTS.push([t0, dur, curveOf(pts)]); }
  /* step 1: the gust that takes his sheet; step 2: the swirl at her window and the one that sweeps the planes down;
     step 3: the stir in the alley; step 4: soft warm curls */
  for (const [y, z, dy, d] of [[.12, .26, .05, 0], [.24, .2, -.04, .08], [.36, .24, .06, .15], [.2, .05, .05, .2], [.46, .12, -.05, .3]])
    addGust(2.45 + d, 1.25, [[-.62, y, z], [-.3, y + dy, z + .02], [0, y - dy, z - .02], [.25, y + dy * .6, z], [.4, y + .06, z - .02], [.45, y + .12, z - .04], [.4, y + .14, z - .03]]);
  for (const [y, z, d] of [[.3, .2, 0], [.42, .1, .12], [.18, .12, .25]]) addGust(7.3 + d, 1.1, [[-.5, y, z], [-.2, y + .03, z - .05], [.05, y - .02, -.05], [.12, y + .02, -.14]]);
  addGust(13.95, 1.0, [[.0, .5, .02], [.17, .6, -.04], [.22, .66, -.06], [.16, .72, -.05], [.08, .66, -.03], [.06, .58, -.05], [.0, .45, -.1], [-.03, .3, -.15]]);
  addGust(16.15, .9, [[.3, .4, -.1], [.18, .34, -.11], [.06, .28, -.13], [-.02, .18, -.17], [-.03, .08, -.21]]);
  addGust(17.2, 1.0, [[-.2, .3, .15], [.0, .45, .1], [.2, .6, .0], [.4, .75, -.05], [.52, .86, -.04]]);
  for (let k = 0; k < 4; k++) {                                       // the alley stirs: curls rising out of it
    const pts = []; for (let i = 0; i <= 8; i++) { const a = k * 1.6 + i * 1.1, r = .015 + i * .006; pts.push([-.03 + Math.cos(a) * r, .04 + i * .07, -.2 + Math.sin(a) * r * .7 + i * .012]); }
    addGust(21.85 + k * .22, 1.2, pts);
  }
  const GUST_DIR = new THREE.Vector3(), GUST_P = new THREE.Vector3();
  function drawWind(g, T) {
    for (const [t0, dur, c] of GUSTS) {
      const u = (g - t0) / dur; if (u < 0 || u > 1.35) continue;
      for (let j = 0; j < 9; j++) {
        const s = u * 1.25 - j * .045; if (s < 0 || s > 1) continue;
        c.getPointAt(s, GUST_P); c.getTangentAt(s, GUST_DIR);
        wind.dash(GUST_P, GUST_DIR, .75 * (1 - j / 9) * (1 - seg(u, 1.05, 1.35)), .03, '#69707a');
      }
    }
    if (g > 33.5 && g < 40) for (let k = 0; k < 3; k++) {             // at the end: warm curls drifting round them, by T
      const s = ((T * .18 + k / 3) % 1);
      for (let j = 0; j < 6; j++) {
        const a = (s - j * .02) * TAU, r = .34 + .03 * Math.sin(a * 3 + k);
        GUST_P.set(MEET[0] + Math.cos(a) * r, .12 + k * .1 + .05 * Math.sin(a * 2), MEET[1] - .12 + Math.sin(a) * r * .5); GUST_DIR.set(-Math.sin(a), 0, Math.cos(a) * .5);
        wind.dash(GUST_P, GUST_DIR, .4 * (1 - j / 6) * ease.smooth(seg(g, 33.5, 35)), .02, '#e7a37f');
      }
    }
  }

  /* ── the planes' days: legs from flight.js ── */
  const RELEASE = [-.063, .2, .19];                                  // where his hand lets a plane go
  const PILE = Array.from({ length: 16 }, (_, i) => {                // the lost planes lying in the alley
    const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(i * 131 + 7);
    return { p: [-.068 + r() * .078, .004 + (i % 3) * .0055, -.25 + r() * .07], yaw: r() * TAU, roll: (r() - .5) * .9 };
  });
  /** up out of the alley in a corkscrew, then out over the street to `to` */
  function rise(from, t0, ph, to) {
    const pts = [from];
    for (let i = 1; i <= 6; i++) { const a = ph + i * 1.05, r = .008 + i * .003; pts.push([-.03 + Math.cos(a) * r, from[1] + i * .085, -.205 + Math.sin(a) * r + i * .006]); }   // narrow enough for the alley
    pts.push([lerp(-.03, to[0], .5), .66, lerp(-.15, to[2], .5)], to);
    return fly.legs.path(pts, t0, t0 + 1.3, { ease: 'inOut' });
  }

  return {
    seconds: [10, 10, 10, 10],

    build() {
      city = window.NM_PLANES.city(kit, L);
      paper = window.NM_PLANES.paper(kit);
      fly = window.NM_PLANES.flight(kit, paper);

      /* the two of them in pencil greys, his tie and her scarf coral (the shared couple: her 1.70 m to his 1.80) */
      boy = kit.model('boy').fit({ height: .3 }); girl = kit.model('girl').fit({ height: .3 * .945 });
      warmBoy = dress(boy); warmGirl = dress(girl);
      stage.add(boy.root, girl.root);
      boy.root.name = 'boy'; girl.root.name = 'girl';
      tie = paper.tie(); onBone(boy, 'chest').add(tie); tie.position.set(0, .2415, .0135); tie.rotation.x = -.06; tie.scale.set(1.25, 1.55, 1);   // knotted at his collar, down his front
      scarf = cloth(makeScarf(onBone(girl, 'chest')));
      pen = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.0028, .0028, .03, 8)), kit.keep(new THREE.MeshStandardMaterial({ color: CORAL, roughness: .5 })));
      stage.add(pen);
      stack = paper.stack(); stage.add(stack.root);

      /* the card's words: the sheet she draws on, the plane he writes on, the photo, the banner */
      memo = paper.memo(words('note1', 'Một cơn gió đưa em đến bên anh'));
      const letter = paper.letter(words('note2', 'Bao nhiêu cánh máy bay cũng chỉ bay về em'));
      photo = kit.polaroid({ width: .25, caption: words('caption', 'Ngày định mệnh của mình'), glow: .5, halo: true, haloColor: 0xfff1d6 });
      develop = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(.25 * 452 / 512, .25 * 452 / 512)), kit.keep(new THREE.MeshBasicMaterial({ color: 0xf6f3ec, transparent: true, toneMapped: false })));
      develop.position.set(0, .25 * (620 - 30 - 226) / 512, .0035); photo.root.add(develop);   // the photo comes up out of white, as a print develops
      banner = kit.sign({ text: words('note3', 'Cuối cùng anh đã tìm thấy em'), style: 'banner', width: .54, accent: CORAL, paper: '#fffaf0', glow: .45 });
      stage.add(photo.root, banner.root);
      threads = paper.threads(6); stage.add(threads.root);
      glowCoral = kit.glow({ color: 0xff8a70, size: .5, opacity: 0 }); glowCoral.position.set(MEET[0], .2, MEET[1] - .06); stage.add(glowCoral);
      heartGlow = kit.glow({ color: 0xff7a68, size: .08, opacity: 0 }); stage.add(heartGlow);

      /* the planes: three he throws, sixteen lost in the alley, two more from his stack; and the sheet with her heart */
      const LEG = fly.legs, SHEET = .055;                         // SHEET: the size of his paper sheet in a hand
      const hand = (m, slot) => (g, T, out) => stagePos(m.node(slot), out);
      const hands = m => (g, T, out) => { stagePos(m.node('handslot.r'), out); stagePos(m.node('handslot.l'), vA); return out.lerp(vA, .5).add(vB.set(0, .012, 0)); };
      const eHold = new THREE.Euler(0, 0, 0, 'YXZ'), qHold = new THREE.Quaternion();
      const facing = (m, pitch = -.5) => (g, T, q) => q.setFromEuler(eHold.set(pitch, m.root.rotation.y, 0));   // nose where he faces
      const flatIn = m => (g, T, q) => q.setFromEuler(eHold.set(-.5, m.root.rotation.y, 0));    // a sheet in front of him to fold, its nose up a little
      const headOf = (who, g, T, out, up = .1) => {
        (who === 'boy' ? boyAt : girlAt)(g, out);
        return out.add(vB.set(0, (who === 'boy' ? lerp(.27, .12, sitK(g)) : .26) + up, 0));
      };
      const throwLegs = (t0, path) => [[t0, LEG.hold(hands(boy), flatIn(boy), { fold: g => ease.inOut(seg(g, t0 + .17, t0 + .62)) }), .15],
        [t0 + .67, LEG.hold(hand(boy, 'handslot.r'), facing(boy, -.35), { fold: 1 }), .12], [path[0], path[1], .1]];
      const ORBIT_HIM = (j, n) => LEG.orbit((g, T, out) => headOf('boy', g, T, out, .08), (g, T) => .1 - .065 * bump(g, 23.2, 23.4, 23.55, 23.75) - .05 * bump(g, 24.55, 24.7, 24.85, 25.0), 2.3, j * TAU / n, { tilt: .4 });
      const ORBIT_HER = (j, n) => LEG.orbit((g, T, out) => (g < 24.5 ? out.set(.28, .57, -.08) : g < 25.3 ? out.set(.11, .3, -.09) : headOf('girl', g, T, out, .1)), .075, 2.6, j * TAU / n, { tilt: 1.2, bob: .01 });
      const FREE = j => LEG.orbit((g, T, out) => out.set(.07 + .1 * Math.sin(j), .6 + .04 * (j % 3), .03), .2 + .02 * (j % 3), 1.25 + .15 * (j % 2), j * 1.3, { tilt: 1 + .1 * (j % 2) });   // upright rings, in front of the walls
      const HEART_LEG = (j, n) => LEG.heart(HEART, HEART_W, j / n, .13);
      /* the squadron that brings the photo: its middle over time (stage space), and each plane's place in the V */
      const SQUAD = [[24.0, .07, .92, -.1], [25.8, .07, .92, -.1], [28.2, .07, .78, .0], [30.0, .07, .78, .0], [31.2, .41, .8, -.06]];
      const SLOTS = [[0, .02, .02], [-.055, .008, -.005], [.055, .008, -.005], [-.105, -.002, -.03], [.105, -.002, -.03], [0, .03, -.05]];
      const SQUAD_KEYS = [1, 2, 3].map(i => SQUAD.map(s => [s[0], s[i]]));
      const squadAt = (g, T, out) => out.set(tween(g, SQUAD_KEYS[0]), tween(g, SQUAD_KEYS[1]) + .01 * Math.sin(T * 1.4), tween(g, SQUAD_KEYS[2]));
      const SQUAD_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.12, .55, 0, 'YXZ'));
      const squadLeg = j => LEG.custom((g, T, o) => {
        squadAt(g, T, o.p); o.p.x += SLOTS[j][0]; o.p.y += SLOTS[j][1] + .006 * Math.sin(T * 3 + j); o.p.z += SLOTS[j][2];
        o.q = o.qq.copy(SQUAD_Q); o.fold = 1; o.scale = 1; o.trail = 0; o.show = true; o.flex = 1;
      });
      /* the banner's two planes, one at each end */
      const BANNER_AT = [.06, .64, .07], bannerUp = g => ease.out(seg(g, 37.2, 38.2));
      const bannerLeg = side => LEG.custom((g, T, o) => {
        const k = ease.elastic(seg(g, 37.6, 38.6));
        o.p.set(BANNER_AT[0] + side * (.29 * Math.max(.15, k)), lerp(.9, BANNER_AT[1], bannerUp(g)) + .03 + .008 * Math.sin(T * 2 + side), BANNER_AT[2] + .01);
        o.q = o.qq.setFromEuler(eHold.set(-.1, side > 0 ? R - .3 : -R + .3, side * .2)); o.fold = 1; o.scale = 1; o.trail = 0; o.show = true; o.flex = 1;
      });

      const P0 = [...throwLegs(11.95, [13.4, LEG.path([RELEASE, [.0, .33, .1], [.1, .45, .0], [.17, .53, -.06], [.21, .6, -.07], [.16, .67, -.04], [.07, .64, -.02],
        [.03, .54, -.06], [.0, .4, -.12], [-.025, .25, -.17], [-.03, .12, -.2], [-.035, .02, -.228]], 13.4, 15.3)]), [15.3, LEG.rest([-.035, .006, -.23], 2.4, .3), .25]];
      const P1 = [...throwLegs(13.8, [15.25, LEG.path([RELEASE, [.03, .36, .08], [.15, .5, -.05], [.235, .555, -.14]], 15.25, 15.9)]),
        [15.9, LEG.path([[.235, .555, -.14], [.25, .5, -.135], [.23, .42, -.13], [.2, .36, -.125]], 15.9, 16.3, { ease: 'in' }), .06],
        [16.3, LEG.path([[.2, .36, -.125], [.12, .33, -.11], [.04, .26, -.13], [-.02, .15, -.18], [-.022, .02, -.222]], 16.3, 16.9), .1],
        [16.9, LEG.rest([-.02, .012, -.225], -.8, -.4), .25]];
      const P2 = [...throwLegs(15.72, [17.15, LEG.path([RELEASE, [.03, .4, .1], [.18, .58, .0], [.33, .7, -.05], [.45, .8, -.06], [.52, .88, -.02], [.5, .93, .05]], 17.15, 18.2)]),
        [18.2, LEG.path([[.5, .93, .05], [.42, .86, .1], [.28, .72, .14], [.14, .58, .15], [.04, .5, .13], NOTE2_AT], 18.2, 19.3, { ease: 'out' }), .15],
        [19.2, LEG.hold((g, T, out) => out.set(NOTE2_AT[0], NOTE2_AT[1] + .008 * Math.sin(T * 1.5), NOTE2_AT[2]), (g, T, q) => q.copy(paper.FACE).premultiply(qHold.setFromEuler(eHold.set(0, .04 * Math.sin(T * .9), 0))),
          { fold: g => (g < 19.95 ? 1 - ease.inOut(seg(g, 19.25, 19.85)) : ease.inOut(seg(g, 20.05, 20.55))), scale: g => lerp(1, NOTE_SCALE, ease.inOut(seg(g, 19.3, 19.9)) * (1 - ease.inOut(seg(g, 20.0, 20.5)))) }), .6],
        [20.55, LEG.orbit((g, T, out) => headOf('boy', g, T, out, .06), .1, 3.2, 0, { tilt: .3 }), .3],
        [21.35, LEG.path([[-.1, .38, .25], [-.06, .42, .05], [-.035, .3, -.12], [-.03, .12, -.2]], 21.35, 21.9, { ease: 'in' }), .2],
        [21.9, rise([-.03, .12, -.2], 21.9, 0, [-.1, .5, .15]), .05], [23.0, ORBIT_HIM(0, 4), .6], [33.3, HEART_LEG(0, 13), 1.3]];
      /* the one that tugs her scarf: at her window it hooks the scarf and pulls; then it leads her out and over the road */
      const TUG = LEG.custom((g, T, o) => {
        if (g < 25.2) { const pull = bump(g, 23.15, 23.4, 24.0, 24.35); o.p.set(.28 + .02 * Math.sin(T * 5), .52 + .01 * Math.sin(T * 7), lerp(-.07, -.112, pull) + .01 * Math.sin(T * 4)); }
        else { girlAt(g, o.p); o.p.y += .2; o.p.z += .1 + .012 * Math.sin(T * 6); o.p.x += .015 * Math.sin(T * 4); }
        o.fold = 1; o.scale = 1; o.q = null; o.trail = 1; o.show = true; o.flex = 1;
      });
      /* the lost planes: S0–S2 go to him, S3–S6 to her (S3 tugs), S7–S12 fetch the photo, S13 roams, S14–S15 raise the banner */
      const pileLegs = i => {
        const r = PILE[i], order = [0, 1, 2, 3, 4, 5, 6, 13, 14, 15, 7, 8, 9, 10, 11, 12].indexOf(i), t = 22.05 + order * .075;
        const legs = [[0, LEG.rest(r.p, r.yaw, r.roll), 0]];
        if (i <= 2) return [...legs, [t, rise(r.p, t, i * 2, [-.15, .45, .2]), .15], [t + 1.1, ORBIT_HIM(i + 1, 4), .6], [33.3, HEART_LEG(i + 1, 13), 1.3]];
        if (i <= 6) return [...legs, [t, rise(r.p, t, i * 2, [.24, .6, -.05]), .15], [t + 1.1, i === 3 ? TUG : ORBIT_HER(i - 4, 3), .6], [33.3, HEART_LEG(i + 1, 13), 1.3]];
        if (i <= 12) return [...legs, [t + .4, rise(r.p, t + .4, i * 2, [.07 + SLOTS[i - 7][0], .9, -.1]), .15], [t + 1.6, squadLeg(i - 7), .5]];
        if (i === 13) return [...legs, [t, rise(r.p, t, i * 2, [.3, .55, .05]), .15], [t + 1.1, FREE(i), .6], [33.3, HEART_LEG(8, 13), 1.3]];
        return [...legs, [t, rise(r.p, t, i * 2, [.3, .55, .05]), .15], [t + 1.1, FREE(i), .6], [36.8, bannerLeg(i === 14 ? -1 : 1), 1.0]];
      };
      /* the last two sheets on his stack: up off it as he gets up, folding themselves on the way */
      const X = side => [[0, LEG.hidden(), 0], [23.7, LEG.path([[-.21, .02, .22], [-.21 + side * .03, .12, .23], [-.18 + side * .06, .28, .2], [.05 + side * .1, .5, .1]], 23.7, 24.6,
        { fold: g => ease.inOut(seg(g, 23.75, 24.35)), ease: 'out' }), .2], [24.6, FREE(side > 0 ? 3 : 5), .6], [33.3, HEART_LEG(side > 0 ? 11 : 12, 13), 1.3]];
      fleet = fly.fleet([
        { legs: [[0, LEG.hidden(), 0], ...P0, [22.6, rise([-.035, .006, -.23], 22.6, 1, [.2, .6, .1]), .15], [23.9, FREE(1), .6], [33.3, HEART_LEG(9, 13), 1.3]] },
        { legs: [[0, LEG.hidden(), 0], ...P1, [22.7, rise([-.02, .012, -.225], 22.7, 3, [-.1, .62, .1]), .15], [24.0, FREE(2), .6], [33.3, HEART_LEG(10, 13), 1.3]] },
        { legs: [[0, LEG.hidden(), 0], ...P2], face: letter },          // the one he wrote on
        ...PILE.map((_, i) => ({ legs: pileLegs(i) })),
        { legs: X(1) }, { legs: X(-1) }
      ], { size: PLANE });

      /* the sheet from his stack: blown onto her face, drawn on, given back, held up at stop 1, kept, shown again at the end */
      const eTumble = new THREE.Euler(0, 0, 0, 'YXZ'), qLand = new THREE.Quaternion();
      const SHEET_Q = (g, T, q) => q.setFromEuler(eTumble.set(g * 9, g * 6.3, g * 4.1));   // tumbling
      const faceOf = (g, T, out) => { stagePos(girl.node('head'), out); return out.add(vB.set(Math.sin(girl.root.rotation.y) * .03, .008, Math.cos(girl.root.rotation.y) * .03)); };
      const qTurn = new THREE.Quaternion(), eTurn = new THREE.Euler(0, 0, 0, 'YXZ');
      /** a sheet held up, its written face the way the holder looks (yaw more), tipped back by pitch */
      const shown = (m, yaw = 0, pitch = -.25) => (g, T, q) => q.copy(paper.FACE).premultiply(qTurn.setFromEuler(eTurn.set(pitch, m.root.rotation.y + yaw, 0)));
      sheet = fly.fleet([{ face: memo.tex, glow: .4, legs: [
        [0, LEG.hidden(), 0],
        [2.62, LEG.hold((g, T, out) => stagePos(boy.node('handslot.l'), out).add(vB.set(0, .03, 0)), flatIn(boy), { fold: 0 }), .05],
        [2.7, LEG.custom((g, T, o) => {                                  // tumbling through the air onto her face
          const k = ease.inOut(seg(g, 2.7, 3.33)); stagePos(boy.node('handslot.l'), vA).add(vB.set(0, .03, 0)); faceOf(g, T, vS);
          o.p.lerpVectors(vA, vS, k); o.p.y += .16 * Math.sin(Math.PI * k); o.q = SHEET_Q(g, T, o.qq).slerp(shown(girl, 0, 0)(g, T, qLand), ease.in(k)); o.fold = 0; o.scale = 1; o.trail = 0; o.show = true; o.flex = 0;
        }), .05],
        [3.33, LEG.hold(faceOf, shown(girl, 0, 0), { fold: 0 }), .05],
        [3.75, LEG.hold(hands(girl), shown(girl, 0, -.7), { fold: 0 }), .3],
        [4.5, LEG.hold((g, T, out) => stagePos(girl.node('handslot.l'), out).add(vB.set(0, .025, 0)), shown(girl, .5, -.55), { fold: 0, scale: g => lerp(1, 1.5, ease.inOut(seg(g, 4.5, 4.8))) }), .3],
        [6.3, LEG.hold((g, T, out) => stagePos(girl.node('handslot.r'), out).add(vB.set(0, .02, 0)), shown(girl, -.4, -.2), { fold: 0, scale: g => lerp(1.5, 1, ease.inOut(seg(g, 6.3, 6.7))) }), .25],
        [6.95, LEG.hold((g, T, out) => stagePos(boy.node('handslot.r'), out).add(vB.set(0, .02, 0)), shown(boy, .6, -.35), { fold: 0 }), .15],
        [9.3, LEG.hold((g, T, out) => out.set(NOTE1_AT[0], NOTE1_AT[1] + .008 * Math.sin(T * 1.6), NOTE1_AT[2]), (g, T, q) => q.copy(paper.FACE).premultiply(qHold.setFromEuler(eHold.set(-.08, .04 * Math.sin(T * .9), .03 * Math.sin(T * .7)))),
          { fold: 0, scale: g => lerp(1, .3 / SHEET, ease.inOut(seg(g, 9.35, 9.95)) * (1 - ease.inOut(seg(g, 10.0, 10.5)))) }), .65],
        [10.05, LEG.hold((g, T, out) => stagePos(boy.node('handslot.r'), out).add(vB.set(0, .02, 0)), shown(boy, .6, -.35), { fold: 0, scale: g => 1 - ease.in(seg(g, 10.55, 10.85)) }), .5],
        [10.9, LEG.hidden(), 0],
        [31.75, LEG.hold((g, T, out) => stagePos(boy.node('handslot.r'), out).add(vB.set(0, .03, 0)), shown(boy, .55, -.15), { fold: 0, scale: g => 1.7 * ease.back(seg(g, 31.75, 32.2)) }), 0],
        [33.85, LEG.hold((g, T, out) => stagePos(girl.node('handslot.r'), out).add(vB.set(0, -.012, .01)), shown(girl, -.6, -.35), { fold: 0, scale: g => lerp(1.7, .95, seg(g, 33.9, 34.4)) }), .35]
      ] }], { size: SHEET })[0];
      trails = paper.trails(420); wind = paper.trails(260);
      stage.add(trails.root, wind.root);

      /* particles: leaves and paper scraps on the wind, sparkles, hearts, dust */
      leaves = kit.particles({ max: 90 }); scraps = kit.particles({ max: 60 }); sparks = kit.particles({ max: 200, additive: true });
      hearts = kit.particles({ max: 140 }); puffs = kit.particles({ max: 60 });
      stage.add(leaves.root, scraps.root, sparks.root, hearts.root, puffs.root);
    },

    reset() {
      [leaves, scraps, sparks, hearts, puffs].forEach(p => p.clear());
      boy.stop(); girl.stop();
    },

    pose(f) {
      const { g, T, dt, held } = f;
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();

      /* light: a grey morning; at the end the warmth comes in */
      const warm = ease.inOut(seg(g, 33.1, 37.6));
      kit.lights.hemi.color.copy(GREY_LIGHT.hemi).lerp(WARM_LIGHT.hemi, warm); kit.lights.hemi.groundColor.copy(GREY_LIGHT.ground).lerp(WARM_LIGHT.ground, warm);
      kit.lights.hemi.intensity = lerp(1.05, 1.15, warm); kit.lights.sun.color.copy(GREY_LIGHT.sun).lerp(WARM_LIGHT.sun, warm); kit.lights.sun.intensity = lerp(1.3, 1.5, warm);
      city.warm(warm, MEET, T);
      warmBoy(ease.smooth(seg(g, 33.0, 34.1))); warmGirl(ease.smooth(seg(g, 33.0, 34.1)));

      /* the street: the crossing light, her door, her room, her curtains */
      city.signal.set(g > 7.3 && g < 10);
      city.door.rotation.y = -1.45 * (bump(g, 8.45, 8.75, 9.1, 9.5) + bump(g, 25.0, 25.3, 26.4, 26.9));
      const lamp = ease.smooth(seg(g, 10.35, 10.75)) * (1 - ease.smooth(seg(g, 25.4, 26)) * .7);
      city.herRoom.m.emissiveIntensity = .35 * lamp;
      const open = ease.inOut(seg(g, 10.45, 11.0));                     // her curtains open when she comes to the window
      city.curtains.forEach(c => { const s = c.userData.side; c.scale.x = lerp(1.75, .7, open); c.position.x = (s < 0 ? L.WIN.x0 : L.WIN.x1) - s * .02 * c.scale.x; });

      /* the two of them: where they are and which way they look */
      const [bx, bz, br] = wayAt(BOY_KEYS, g), [gx, gz, gr] = wayAt(GIRL_KEYS, g);
      boy.root.position.set(bx, 0, bz); boy.root.rotation.y = br;
      girl.root.position.set(gx, inRoom(g) ? L.WIN.floor : 0, gz); girl.root.rotation.y = gr;
      girl.root.visible = !inside(g);
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g);
      boy.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);

      /* bodies and heads: a start when the gust takes his sheet and when it slaps her face, looking at things, laughing,
         slumping, leaning out, looking up */
      const startle = bump(g, 2.68, 2.8, 3.1, 3.45), slap = bump(g, 3.33, 3.43, 3.65, 3.95);
      boy.bend('head', -.3 * startle - .35 * bump(g, 9.35, 9.6, 9.9, 10.3) + .3 * bump(g, 9.9, 10.1, 10.3, 10.6) - .45 * bump(g, 11.0, 11.3, 11.7, 12.0) - .3 * bump(g, 12.15, 12.3, 12.5, 12.65)
        - .3 * bump(g, 14.0, 14.15, 14.35, 14.5) - .3 * bump(g, 15.9, 16.05, 16.25, 16.4) + .4 * bump(g, 18.9, 19.3, 19.4, 19.8) - .35 * bump(g, 19.4, 19.8, 20.2, 20.7)
        - .45 * bump(g, 26.4, 26.9, 30.2, 30.8) + .15 * bump(g, 34.6, 35.0, 60, 61), .25 * Math.sin(T * 9) * bump(g, 14.2, 14.3, 14.6, 14.75), .18 * bump(g, 34.6, 35.0, 60, 61));
      boy.bend('chest', -.2 * startle + .3 * bump(g, 4.75, 4.95, 5.25, 5.5) + .25 * bump(g, 18.95, 19.3, 19.4, 19.8) + .12 * bump(g, 23.45, 23.6, 23.7, 23.9), 0, 0);   // a bow sorry; slumped; a nudge
      girl.bend('head', -.35 * slap - .4 * bump(g, 3.8, 4.0, 4.2, 4.4) + .35 * bump(g, 4.05, 4.25, 4.45, 4.65) + .3 * bump(g, 4.6, 4.75, 5.3, 5.45) - .3 * bump(g, 11.5, 11.8, 15.5, 15.7)
        - .45 * bump(g, 26.8, 27.3, 30.2, 30.8) - .25 * bump(g, 23.3, 23.5, 24.0, 24.3), .25 * bump(g, 7.3, 7.45, 7.6, 7.8), -.2 * bump(g, 34.6, 35.0, 60, 61));
      girl.bend('chest', -.25 * slap + .05 * Math.sin(T * 26) * bump(g, 4.05, 4.15, 4.55, 4.7) + .25 * bump(g, 23.25, 23.45, 24.0, 24.3), 0, 0);   // giggling; leaning out of the window

      /* hands: his reach for the sheet, then the two of them holding hands at the end */
      if (g > 6.4 && g < 7.3) stagePos(girl.node('handslot.r'), TARGET.boy);
      if (g > 33.6 && g < 34.4) stagePos(boy.node('handslot.r'), TARGET.girl);
      if (g > 34.4) { stagePos(boy.node('upperarm.r'), vA); stagePos(girl.node('upperarm.l'), vS); TARGET.boy.lerpVectors(vA, vS, .5).add(vB.set(0, -.055, .04)); TARGET.girl.copy(TARGET.boy); }
      arms(boy, ARMS.boy, g); arms(girl, ARMS.girl, g);

      /* her scarf's ends in the wind (stronger in the gusts, pulled out by a plane at her window): they hang in front of her,
         so the wind lifts them forward, off her chest */
      const gust = bump(g, 2.6, 2.9, 3.4, 4.0) + bump(g, 7.3, 7.5, 8.2, 8.6);
      const tug = bump(g, 23.15, 23.4, 24.0, 24.35);
      flutter(scarf, -(.25 + .3 * gust + .35 * Math.sin(T * 1.3) * .2 + .9 * tug + .3 * (g > 25.4 && g < 27.4 ? 1 : 0)), -.15 - .3 * gust + .1 * Math.sin(T * .8), .5 + gust, T);

      /* what they hold: his stack, her pen */
      const left = stagePos(boy.node('handslot.l'), vA);
      const sheets = 1 - .15 * (g > 12.1) - .15 * (g > 13.95) - .15 * (g > 15.85);
      stack.set(sheets);
      if (g < 17.85) { stack.root.position.copy(left).add(vB.set(0, -.012, 0)); stack.root.rotation.set(0, br, 0); }
      else { stack.root.position.set(-.215, .002, .23); stack.root.rotation.set(0, .5, 0); }
      stack.root.visible = g < 23.75;
      pen.visible = g > 4.4 && g < 5.55;
      if (pen.visible) { stagePos(girl.node('handslot.r'), vA); pen.position.copy(vA).add(vB.set(0, .012, 0)); pen.rotation.set(.5, gr, .4); pen.scale.setScalar(ease.back(seg(g, 4.4, 4.6)) * (1 - seg(g, 5.45, 5.55)) + .001); }

      /* the heart she draws on his sheet, and its glow when he shows it to her again */
      memo.heart(seg(g, 4.75, 5.4));
      fly.update(fleet, g, T, held, trails, g > 33.3 ? { size: .03, color: '#b9533d', dashes: 15 } : { size: .026 });   // the heart's trails long and warm, like everything by then   // the heart's trails warm, like everything else by then
      fly.update([sheet], g, T, held, null);
      heartGlow.material.opacity = .9 * bump(g, 32.1, 32.5, 34.0, 34.5) * (1 + .15 * Math.sin(T * 6));
      heartGlow.position.copy(sheet.plane.root.position).add(vB.set(0, 0, .01));

      /* the wind: dashed curls blowing through, leaves and scraps of paper */
      wind.begin(); drawWind(g, T); wind.end();
      if (dt && (gust > .2 || rng() < dt * .8)) {
        const k = gust > .2 ? 3 : 1;
        const vx = .1 + rng() * .1 * k, x0 = -.5 + rng() * .1;           // across the card, gone at its far edge
        if (rng() < dt * 10 * k) leaves.emit({ x: x0, y: .05 + rng() * .4, z: -.05 + rng() * .32, vx, vy: (rng() - .3) * .06, vz: (rng() - .5) * .04, sway: .05,
          color: ['#9a9d9a', '#7f8481', '#b5b7b2'][(rng() * 3) | 0], size: .016 + rng() * .01, life: (.48 - x0) / vx, shape: 'leaf', spin: (rng() - .5) * 8 });
      }
      if (g > 2.65 && kit.once('gust')) scraps.burst(10, () => ({ x: -.3 + rng() * .1, y: .12 + rng() * .2, z: .2 + rng() * .05, vx: .3 + rng() * .2, vy: .1 + rng() * .15, vz: (rng() - .5) * .1, drag: .4, sway: .08,
        color: '#f6f3ec', size: .016 + rng() * .01, life: 1.5, shape: 'petal', spin: (rng() - .5) * 10 }));
      if (g > 3.33 && kit.once('slap')) puffs.burst(8, () => ({ x: gx, y: .24, z: gz + .05, vx: (rng() - .5) * .3, vy: (rng() - .3) * .2, vz: (rng() - .5) * .2, drag: 3, color: '#ffffff', size: .02, grow: 1, life: .5, shape: 'glow' }));
      if (g > 4.3 && kit.once('laugh')) hearts.burst(6, () => ({ x: gx + (rng() - .5) * .04, y: .3, z: gz + .03, vx: (rng() - .5) * .1, vy: .08 + rng() * .06, drag: .5, color: ['#ffffff', '#e9e6df'][(rng() * 2) | 0], size: .016, life: 1.4, shape: 'note', spin: (rng() - .5) * 2 }));
      if (g > 5.4 && kit.once('drawn')) hearts.burst(8, () => { stagePos(sheet.plane.root, vA); return { x: vA.x, y: vA.y + .02, z: vA.z, vx: (rng() - .5) * .12, vy: .1 + rng() * .08, drag: .6, color: CORAL, size: .014 + rng() * .008, life: 1.5, shape: 'heart', spin: (rng() - .5) * 3 }; });
      if (g > 18.85 && kit.once('slump')) puffs.burst(10, i => ({ x: bx + Math.cos(i) * .04, y: .01, z: bz + Math.sin(i) * .03, vx: Math.cos(i) * .12, vy: .03, vz: Math.sin(i) * .08, drag: 3, color: '#e9e7e2', size: .022, grow: 1, life: .7, shape: 'glow' }));
      if (g > 15.9 && kit.once('bonk')) sparks.burst(8, () => ({ x: .235, y: .555, z: -.14, vx: (rng() - .5) * .2, vy: (rng() - .3) * .2, vz: rng() * .1, drag: 2.5, color: '#ffffff', size: .014, life: .5, shape: 'sparkle', spin: 4 }));
      if (g > 21.9 && g < 23.6 && dt && rng() < dt * 22) sparks.emit({ x: -.03 + (rng() - .5) * .07, y: .02 + rng() * .5, z: -.2 + (rng() - .5) * .05, vy: .12 + rng() * .1, drag: .5, color: '#fffdf5', size: .012 + rng() * .01, life: .9, shape: 'sparkle', spin: 3 });

      /* chapter 3: the photo comes up out of white under the squadron, which brings it down to them */
      const sq = fleet.slice(10, 16).map(P => P.plane.root.position), shownPhoto = g > 25.0;
      const pk = ease.back(seg(g, 25.0, 25.5)), aside = ease.inOut(seg(g, 30.0, 31.2)), ps = lerp(1, .64, aside);
      photo.root.visible = shownPhoto;
      if (shownPhoto) {
        vA.set((sq[0].x + sq[5].x) / 2, Math.min(sq[1].y, sq[2].y) - .07, (sq[1].z + sq[2].z) / 2);
        const sway = .04 * Math.sin(T * 1.2);
        photo.root.scale.setScalar(Math.max(.001, pk * ps));
        photo.root.position.set(vA.x, vA.y - photo.height * ps, vA.z + .01);
        photo.root.rotation.set(-.06, .1 * Math.sin(T * .7) - .15 * aside, sway);
        photo.halo.material.opacity = .45 * ease.smooth(seg(g, 26.5, 27.5)) * (1 - .75 * aside) * (1 + .08 * Math.sin(T * 3));
        develop.material.opacity = 1 - ease.inOut(seg(g, 25.6, 27.2));
        const top = photo.root.position.y + photo.height * ps, half = photo.width * ps / 2 * .9;
        for (const [n, j, side] of [[0, 1, -1], [1, 3, -1], [2, 2, 1], [3, 4, 1]]) threads.set(n, sq[j], vT.set(photo.root.position.x + side * half * Math.cos(sway), top + side * half * Math.sin(sway), photo.root.position.z));
        threads.set(4, sq[0], vT.set(photo.root.position.x, top, photo.root.position.z)); threads.set(5, sq[5], vT.set(photo.root.position.x, top, photo.root.position.z));
      }
      threads.opacity(shownPhoto ? pk : 0);
      if (g > 25.0 && kit.once('develop')) sparks.burst(20, () => ({ x: .07 + (rng() - .5) * .25, y: .7 + rng() * .2, z: -.05, vx: (rng() - .5) * .2, vy: (rng() - .3) * .2, drag: 1.5, color: '#fffbe8', size: .016, life: 1, shape: 'sparkle', spin: 3 }));

      /* chapter 4: the warm glow round them, hearts, the banner the two planes raise */
      glowCoral.material.opacity = .55 * ease.smooth(seg(g, 33.2, 35)) * (1 + .1 * Math.sin(T * 2.4));
      glowCoral.scale.setScalar(lerp(.2, .75, ease.out(seg(g, 33.2, 35.5))));
      if (g > 32.75 && kit.once('known')) hearts.burst(22, () => ({ x: MEET[0] + (rng() - .5) * .06, y: .3, z: MEET[1], vx: (rng() - .5) * .4, vy: .14 + rng() * .25, vz: (rng() - .5) * .15,
        gravity: -.18, drag: .9, color: [CORAL, '#ff9a8a', '#fff1e6'][(rng() * 3) | 0], size: .02 + rng() * .02, life: 2.4, shape: 'heart', spin: (rng() - .5) * 4 }));
      if (g > 34.6 && kit.once('hands')) hearts.burst(12, () => ({ x: MEET[0] + (rng() - .5) * .04, y: .2, z: MEET[1] + .03, vx: (rng() - .5) * .2, vy: .12 + rng() * .1, drag: .7, color: [CORAL, '#ffd2c4'][(rng() * 2) | 0], size: .018, life: 2, shape: 'heart', spin: (rng() - .5) * 3 }));
      if (held && g > 39 && dt && rng() < dt * 1.4) hearts.emit({ x: MEET[0] + (rng() - .5) * .2, y: .32, z: MEET[1], vy: .07, sway: .03, color: [CORAL, '#ffb3a6'][(rng() * 2) | 0], size: .018, life: 2.4, shape: 'heart' });
      const b = ease.elastic(seg(g, 37.6, 38.6));
      banner.root.scale.set(Math.max(.001, b), Math.max(.001, ease.out(seg(g, 37.4, 37.8))), 1);
      banner.root.position.set(.06, lerp(.9, .64, ease.out(seg(g, 37.2, 38.2))) + .006 * Math.sin(T * 1.5), .07);
      banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      banner.root.visible = g > 37.2;

      [leaves, scraps, sparks, hearts, puffs].forEach(p => p.update(dt, T));
    }
  };
};
