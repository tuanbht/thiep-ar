/* Chung ô ngày mưa (sharing an umbrella in the rain), told by the shared act _acts/lovestory.js. Three chapters, each
   ending at a stop:
     1 · 0–6.4 s     rain at a little country bus stop: she waits with no umbrella, hugging herself, looking up at the sky
                     and sneezing; he walks in under a big red umbrella and holds it out over her, out in the rain himself;
                     a note with the card's first words (note1) comes up out of the timetable board
     2 · 6.4–12.6 s  she beckons him in under it; side by side he tilts it towards her and she leans on his shoulder with
                     her hand on the handle under his; a puddle glows and the card's photo rises out of the water with its
                     caption
     3 · 12.6–19 s   the rain stops: the clouds part, the sun comes out and a rainbow draws itself over the card; he shakes
                     the umbrella shut and shoulders it, they jump into the big puddle arm in arm with a splash, a little bus
                     pulls up with its round headlights warm, petals drift in the clean air and a banner with the last words
                     (note2) rises
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own;
   the rain goes by T, the act's clock, so it keeps falling while the act waits at a stop. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;
  const rand = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(1406);   // the scenery's own seed: the same every time
  const H = .3, HER = H * .945, CROWN = .032;                        // their heights (her 1.70 m to his 1.80); the top of a head over its bone
  const POST = [-.37, -.12], LAMP = [.42, -.1];                     // the bus stop's post; the street lamp
  const PUDDLES = [{ x: 0, z: .17, rx: .165, rz: .072 }, { x: .3, z: .14, rx: .085, rz: .045 }, { x: -.3, z: .2, rx: .066, rz: .032 }];
  const READ = [.31, .12, .15], POSTER = [-.372, .178, -.104], PIN = .65;         // where the photo is read; pinned on the post at the end
  const BUS_STOP = -.1, BUS_Z = -.2;                                  // where the bus stops (its middle); its lane, clear of the page's curve
  const SKY = { width: 1.1, height: .75, curve: .12, z: -.3 };        // the painted sky at the back edge (it writes depth: keep things in front)
  const RAINY = { hemi: new THREE.Color('#c3d0e0'), ground: new THREE.Color('#56606e'), sun: new THREE.Color('#d6e0ec') };
  const CLEAR = { hemi: new THREE.Color('#fff1e0'), ground: new THREE.Color('#c8ae98'), sun: new THREE.Color('#ffe2b8') };
  let boy, girl, umb, umbLeft = false, stop, lamp, bus, note, banner, photo, pin, rainbow, clouds, rainSky, clearSky, waterGlow;
  let rain, splash, hearts, sparks, petals, ripples, puddles;

  /* the pose a character holds at story time g: which clip, where, which way it looks */
  const BOY = [                                                      // [from g, clip, options]
    [0, 'Walking_A', { speed: 1.82 }], [3.3, 'Idle', { fade: .25 }], [6.95, 'Walking_A', { speed: 1.2, fade: .15 }],
    [7.4, 'Idle', { fade: .25 }], [15.3, 'Jump_Full_Short', { once: true, speed: .85, fade: .15 }],
    [16.5, 'Cheer', { once: true, fade: .2 }], [18.15, 'Idle', { fade: .35 }]
  ];
  const GIRL = [
    [0, 'Idle'], [6.9, 'Walking_A', { speed: 1.55, fade: .15 }], [7.65, 'Idle', { fade: .25 }],
    [15.32, 'Jump_Full_Short', { once: true, speed: .85, fade: .15 }], [16.55, 'Cheer', { once: true, fade: .2 }], [18.2, 'Idle', { fade: .35 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));

  /* where each of them is: [from g, x, z, facing, ease into it (smooth by default)] */
  const BOY_WAY = [
    [0, .62, .015, -R], [.3, .62, .015, -R, 'linear'], [3.05, .12, .002, -R, 'linear'], [3.3, .1, 0, -R, 'out'], [3.6, .1, 0, -1.42],
    [6.95, .1, 0, -1.42], [7.4, .06, -.02, -1.3], [7.9, .06, -.02, -.24], [15.68, .06, -.02, -.2],
    [16.1, .042, .135, -.2, 'inOut'], [18.2, .042, .135, -.24]
  ];
  const GIRL_WAY = [
    [0, -.125, -.02, .35], [3.3, -.125, -.02, .35], [3.65, -.125, -.02, 1.02], [6.9, -.125, -.02, 1.02], [7.65, -.015, -.02, .9, 'linear'],
    [7.9, -.015, -.02, .24], [15.7, -.015, -.02, .2], [16.12, -.034, .135, .2, 'inOut'], [18.2, -.034, .135, .26]
  ];
  const wayAt = (way, g) => [1, 2, 3].map(i => tween(g, way.map(k => [k[0], k[i], k[4] || 'smooth'])));
  const skyZ = x => SKY.z + SKY.curve * (x / (SKY.width / 2)) ** 2;   // where the painted page stands at x (its ends come forward)
  const WIND = .16;                                                  // the rain slants from her side: the umbrella tilted to her keeps her dry

  /* arms in a character's own space, [upper arm, forearm], for the right arm (the left one mirrors x) */
  const ARM = {
    hug: [[-.2, -.5, .85], [.85, .35, .4]],                            // hugging herself in the cold
    palm: [[-.55, -.2, .8], [-.35, .5, .8]],                           // a hand out to the side to feel the rain
    chest: [[-.15, -.55, .8], [.6, .65, .3]],                          // hands together at her chest, shy
    carry: [[-.35, -.6, .7], [-.15, .65, .75]],                        // the umbrella up in front of him, walking
    offer: [[-.3, -.1, .95], [-.15, .5, .85]],                         // held out over her
    share: [[-.2, -.75, .4], [.05, .85, .5]],                          // between the two of them, at his shoulder
    tipBack: [[-.45, -.35, .8], [-.25, .8, .5]],                       // tipped back to look at the sky
    shoulder: [[-.3, -.75, .45], [-.15, .9, -.1]],                     // the shut umbrella on his shoulder
    pass: [[-.1, -.7, .7], [.55, .3, .75]],                            // a hand in front of his chest, to pass it to the other
    joy: [[-.85, .45, .2], [-.55, .82, .15]],                          // a free arm flung up and out in the jump
    beckon: g => { const k = Math.max(0, Math.sin((g - 6.5) * 13)); return [[-.15, -.5, .85], [.05, .05 + .55 * k, 1 - .45 * k]]; }   // come under here: palm up, low
  };
  /* each arm's poses through the story: [from g, pose (null: the clip's own), seconds to blend in] */
  const ARMS = {
    boy: {
      r: [[0, 'carry', 0], [3.45, 'offer', .55], [6.95, 'share', .6], [13.2, 'tipBack', .4], [13.75, 'share', .3], [14.52, 'pass', .15], [14.68, null, .35]],
      l: [[0, null, 0], [14.47, 'pass', .2], [14.68, 'shoulder', .35]]          // shut, it goes to his left shoulder: his right arm is hers
    },
    girl: {
      r: [[0, 'hug', 0], [1.15, 'palm', .3], [1.95, 'hug', .3], [4.4, 'chest', .4], [6.5, 'beckon', .25], [7.2, null, .4], [13.15, 'palm', .35], [13.8, null, .35], [15.57, 'joy', .2], [16.27, null, .3]],
      l: [[0, 'hug', 0], [4.4, 'chest', .4], [6.5, null, .4], [8.9, 'handle', .5], [12.75, null, .4], [14.95, 'link', .35], [16.5, null, .2], [18.15, 'link', .45]]
    }
  };
  const mStage = new THREE.Matrix4(), vS = new THREE.Vector3(), vT = new THREE.Vector3(), vA = new THREE.Vector3(), qInv = new THREE.Quaternion();
  /** the way from a character's shoulder to a point on the stage, in its own space: an arm aimed that way reaches for it */
  const toward = (m, side, p) => {
    const b = m.node(`upperarm.${side}`); b.updateWorldMatrix(true, false);
    vS.setFromMatrixPosition(b.matrixWorld).applyMatrix4(mStage);
    vT.copy(p).sub(vS).applyQuaternion(qInv.copy(m.root.quaternion).invert());
    return [vT.x, vT.y, vT.z];
  };
  const stagePos = (o, out) => { o.updateWorldMatrix(true, false); return out.setFromMatrixPosition(o.matrixWorld).applyMatrix4(mStage); };
  const TARGET = { handle: new THREE.Vector3(), link: new THREE.Vector3() };
  const LEN = new Map(), vE = new THREE.Vector3(), vN = new THREE.Vector3(), vQ = new THREE.Vector3(), vD = new THREE.Vector3();
  /** a two-bone reach: the upper arm's and the forearm's way (in the character's own space) that put its hand on p, the
      elbow bending down and out; straight at p when it is out of reach */
  function ik(m, side, p) {
    const key = `${m.root.name}${side}`;
    if (!LEN.has(key)) {
      const a = stagePos(m.node(`upperarm.${side}`), vS).distanceTo(stagePos(m.node(`lowerarm.${side}`), vT));
      LEN.set(key, [a, vT.distanceTo(stagePos(m.node(`handslot.${side}`), vE))]);
    }
    const [a, b] = LEN.get(key);
    vD.fromArray(toward(m, side, p)); const d = vD.length(); vN.copy(vD).normalize();
    if (d >= (a + b) * .995) return [vN.toArray(), vN.toArray()];
    const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * Math.max(d, 1e-4)), -1, 1));
    vQ.set(side === 'r' ? -.45 : .45, -1, -.35); vQ.addScaledVector(vN, -vQ.dot(vN)).normalize();   // the elbow's side
    vE.copy(vN).multiplyScalar(Math.cos(A)).addScaledVector(vQ, Math.sin(A));
    return [vE.toArray(), vD.addScaledVector(vE, -a).normalize().toArray()];
  }
  const REACH = {
    handle: (m, side) => ik(m, side, TARGET.handle),                    // on the umbrella's handle, under his
    link: (m, side) => ik(m, side, TARGET.link)                         // arm in arm: her hand on his forearm
  };
  const poseOf = (name, side, m, g) => {
    if (REACH[name]) return REACH[name](m, side);
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

  /* the umbrella through the story: [from g, the way its shaft points (stage space), seconds to blend in, how open];
     shut, it goes up on his shoulder */
  const UMB = [
    [0, [-.08, 1, -.1], 0, 1], [3.45, [-.4, .9, -.12], .7, 1], [6.95, [-.1, .97, -.1], .7, 1], [13.2, [-.08, .9, -.42], .45, 1],
    [13.75, [-.2, .9, -.38], .3, 1], [13.85, [-.2, .9, -.38], .4, 0], [14.6, [.15, .55, -.82], .45, 0]
  ];
  const FLIGHT = new THREE.CatmullRomCurve3([[READ[0], READ[1], READ[2]], [.3, .5, .1], [-.2, .62, .02], [POSTER[0], POSTER[1], POSTER[2]]].map(p => new THREE.Vector3(...p)));
  const vUp = new THREE.Vector3(), vUp0 = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), qW = new THREE.Quaternion();

  /* ── things built here ── */
  const canvas = (w, h, draw) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); return cv; };
  const texture = cv => { const t = kit.keep(new THREE.CanvasTexture(cv)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .6, ...o }));
  const geo = g => kit.keep(g);
  const mesh = (g, m, parent, [x, y, z] = [0, 0, 0]) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; parent && parent.add(o); return o; };
  const ramp = (c, x, y, w, h, cols) => { const gr = c.createLinearGradient(0, y, 0, y + h); cols.forEach((k, i) => gr.addColorStop(i / (cols.length - 1), k)); c.fillStyle = gr; c.fillRect(x, y, w, h); };

  /* the umbrella: eight panels on ribs round a shaft, a tip on top, a wooden J handle. Its origin is the grip, +y runs
     up the shaft. setOpen(k) folds the ribs down round the shaft: 1 open, 0 shut */
  function makeUmbrella() {
    const N = 8, RS = 6, AS = 4, Rc = .16, DOME = .055, SHAFT = .17, L = Math.hypot(Rc, DOME) * 1.04;   // a big golf umbrella, for two
    const RUN = SHAFT * .19, SLIDE = SHAFT * .39;                      // the runner under the hub when open, and how far it slides to shut
    const root = new THREE.Group(), top = new THREE.Group(); top.position.y = SHAFT; root.add(top);
    const panel = canvas(256, 256, c => {                            // one panel, hub at the top, rim at the bottom
      ramp(c, 0, 0, 256, 256, ['#f25a63', '#e5444f', '#d83a46']);
      c.fillStyle = 'rgba(90,10,20,.35)'; c.fillRect(0, 0, 5, 256); c.fillRect(251, 0, 5, 256);   // seams along the ribs
      c.fillStyle = '#fff1e2'; c.beginPath(); c.moveTo(0, 256);                                   // a scalloped cream hem
      for (let x = 0; x <= 256; x += 32) c.quadraticCurveTo(x + 16, 214, x + 32, 230);
      c.lineTo(256, 256); c.closePath(); c.fill();
      c.save(); c.translate(128, 158); c.scale(2.1, 1);                // a heart, drawn wide: the panel narrows towards the hub
      c.fillStyle = '#fff1e2'; kit.heartPath(c, 0, 0, 30); c.fill(); c.restore();
      for (const x of [62, 194]) { c.save(); c.translate(x, 204); c.scale(1.6, 1); c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); c.restore(); }
    });
    const tex = texture(panel);
    const nv = N * (RS + 1) * (AS + 1), pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = [];
    for (let p = 0; p < N; p++) for (let i = 0; i <= RS; i++) for (let j = 0; j <= AS; j++) {
      const v = (p * (RS + 1) + i) * (AS + 1) + j; uv[v * 2] = j / AS; uv[v * 2 + 1] = 1 - i / RS;
      if (i < RS && j < AS) idx.push(v, v + AS + 1, v + 1, v + 1, v + AS + 1, v + AS + 2);
    }
    const cg = geo(new THREE.BufferGeometry());
    cg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); cg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); cg.setIndex(idx);
    mesh(cg, mat('#ffffff', { map: tex, side: THREE.DoubleSide, roughness: .45, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .16 }), top);   // red even on a grey day
    const ribPos = new Float32Array(N * (RS + 1) * 2 * 3);              // ribs and stretchers under the canopy
    const ribGeo = geo(new THREE.BufferGeometry()); ribGeo.setAttribute('position', new THREE.BufferAttribute(ribPos, 3));
    top.add(new THREE.LineSegments(ribGeo, kit.keep(new THREE.LineBasicMaterial({ color: 0x4a2a2e }))));
    const steel = mat('#3a3a46', { roughness: .35, metalness: .6 }), wood = mat('#8a5434', { roughness: .5 });
    const tipG = geo(new THREE.SphereGeometry(.0042, 6, 5));
    const tips = Array.from({ length: N }, () => mesh(tipG, steel, top));
    const runner = mesh(geo(new THREE.CylinderGeometry(.006, .006, .018, 8)), steel, root);
    mesh(geo(new THREE.CylinderGeometry(.0034, .0034, SHAFT + .03, 8)), steel, root, [0, SHAFT / 2 - .015, 0]);
    mesh(geo(new THREE.ConeGeometry(.0055, .032, 8)), steel, top, [0, .018, 0]);
    mesh(geo(new THREE.CylinderGeometry(.0068, .0062, .055, 10)), wood, root, [0, -.012, 0]);
    const hook = mesh(geo(new THREE.TorusGeometry(.015, .0062, 8, 18, Math.PI)), wood, root, [.015, -.04, 0]); hook.rotation.z = Math.PI;
    let open = -1;
    const pts = [];
    function setOpen(k) {
      if (Math.abs(k - open) < 1e-4) return; open = k;
      pts.length = 0; pts.push([0, 0]);
      for (let i = 1, x = 0, y = 0; i <= RS; i++) {                   // a rib keeps its length; folding turns it down round the hub
        const s = (i - .5) / RS, a = .07 + (Math.atan2(Rc, 2 * DOME * s) - .07) * k;
        x += Math.sin(a) * L / RS; y -= Math.cos(a) * L / RS; pts.push([x, y]);
      }
      for (let p = 0; p < N; p++) {
        const a0 = p / N * TAU, a1 = (p + 1) / N * TAU, am = (a0 + a1) / 2;
        for (let i = 0; i <= RS; i++) for (let j = 0; j <= AS; j++) {
          const u = j / AS, s = i / RS, [rx, ry] = pts[i];
          const fold = (1 - k) * .016 * Math.sin(Math.PI * u) * Math.sin(Math.PI * s);   // shut, the cloth bunches out between ribs
          const v = (p * (RS + 1) + i) * (AS + 1) + j;
          pos[v * 3] = (Math.cos(a0) * (1 - u) + Math.cos(a1) * u) * rx + Math.cos(am) * fold;
          pos[v * 3 + 1] = ry + .014 * k * Math.sin(Math.PI * u) * s ** 4;                // open, the hem lifts between the rib ends
          pos[v * 3 + 2] = (Math.sin(a0) * (1 - u) + Math.sin(a1) * u) * rx + Math.sin(am) * fold;
        }
        const ca = Math.cos(a0), sa = Math.sin(a0);
        for (let i = 0; i < RS; i++) {
          const o = ((p * RS) + i) * 6, [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
          ribPos.set([ca * x0, y0 - .002, sa * x0, ca * x1, y1 - .002, sa * x1], o);
        }
        const o = (N * RS + p) * 6, [xm, ym] = pts[3], ry = -RUN - SLIDE * (1 - k);   // a stretcher from the runner to mid-rib
        ribPos.set([0, ry, 0, ca * xm, ym - .002, sa * xm], o);
        tips[p].position.set(ca * pts[RS][0], pts[RS][1], sa * pts[RS][0]);
      }
      runner.position.y = SHAFT - RUN - SLIDE * (1 - k);
      cg.attributes.position.needsUpdate = true; cg.computeVertexNormals(); cg.computeBoundingSphere();
      ribGeo.attributes.position.needsUpdate = true; ribGeo.setDrawRange(0, (N * RS + N) * 2);
    }
    setOpen(1);
    return { root, top, tips, setOpen, get open() { return open; }, R: Rc, DOME, SHAFT };
  }

  /* the bus stop: a wooden post with a round sign on top and the timetable board under it, on a little concrete foot */
  function makeStop() {
    const root = new THREE.Group(); root.position.set(POST[0], 0, POST[1]);
    const wood = mat('#7d5a3c', { roughness: .8 }), stone = mat('#b9b4aa', { roughness: .95 });
    mesh(geo(new THREE.BoxGeometry(.05, .022, .05)), stone, root, [0, .011, 0]).receiveShadow = true;
    mesh(geo(new THREE.BoxGeometry(.014, .44, .014)), wood, root, [0, .23, 0]);
    const round = texture(canvas(256, 256, c => {
      c.fillStyle = '#d8434f'; c.beginPath(); c.arc(128, 128, 126, 0, TAU); c.fill();
      c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(128, 128, 104, 0, TAU); c.fill();
      c.fillStyle = '#2f6f8f'; rounded(c, 70, 92, 116, 54, 14); c.fill();                   // a little bus
      c.fillStyle = '#cfe9f5'; for (const x of [80, 106, 132, 158]) { rounded(c, x, 100, 20, 18, 4); c.fill(); }
      c.fillStyle = '#26323f'; for (const x of [94, 162]) { c.beginPath(); c.arc(x, 148, 11, 0, TAU); c.fill(); }
      c.fillStyle = '#ffd36b'; c.beginPath(); c.arc(76, 132, 6, 0, TAU); c.fill();
      c.fillStyle = '#2b2f4a'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '800 30px "Be Vietnam Pro", "Segoe UI", sans-serif'; c.fillText('TRẠM HẸN', 128, 62);
      c.font = '800 40px "Be Vietnam Pro", "Segoe UI", sans-serif'; c.fillText('14', 128, 196);
    }));
    const disc = mesh(geo(new THREE.CylinderGeometry(.052, .052, .007, 32)), [mat('#d8434f'), mat('#ffffff', { map: round, emissive: 0xffffff, emissiveMap: round, emissiveIntensity: .25 }), mat('#d8434f')], root, [0, .42, .006]);
    disc.rotation.set(R, R, 0);                                       // its face to the front, the words upright
    const board = texture(canvas(160, 200, c => {
      c.fillStyle = '#fff6e6'; c.fillRect(0, 0, 160, 200);
      c.fillStyle = '#2f6f8f'; c.fillRect(0, 0, 160, 40);
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 20px "Be Vietnam Pro", sans-serif'; c.fillText('TUYẾN 14', 80, 21);
      c.fillStyle = '#2b2f4a'; c.font = '600 17px "Be Vietnam Pro", sans-serif';
      ['06:15   07:40', '09:05   10:30', '13:20   15:45', '17:20   18:40'].forEach((t, i) => c.fillText(t, 80, 64 + i * 30));
      c.fillStyle = '#d8434f'; kit.heartPath(c, 140, 154, 18); c.fill();
      c.font = '700 15px "Be Vietnam Pro", sans-serif'; c.fillStyle = '#2f6f8f'; c.fillText('Trạm Hẹn', 80, 186);
    }));
    const tt = mesh(geo(new THREE.BoxGeometry(.075, .094, .006)), [mat('#2f6f8f'), mat('#2f6f8f'), mat('#2f6f8f'), mat('#2f6f8f'),
      mat('#ffffff', { map: board, emissive: 0xffffff, emissiveMap: board, emissiveIntensity: .2 }), mat('#2f6f8f')], root, [0, .27, .011]);
    return { root, board: tt };
  }
  function rounded(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }

  /* the street lamp: a wooden pole, an iron arm and an enamel shade with a warm bulb, its light pooling on the card */
  function makeLamp() {
    const root = new THREE.Group(); root.position.set(LAMP[0], 0, LAMP[1]);
    const wood = mat('#5d4632', { roughness: .85 }), iron = mat('#2e3b48', { roughness: .45, metalness: .4 });
    mesh(geo(new THREE.CylinderGeometry(.008, .011, .46, 10)), wood, root, [0, .23, 0]);
    const curve = new THREE.CatmullRomCurve3([[0, .41, 0], [-.012, .45, .01], [-.05, .46, .03], [-.075, .44, .045]].map(p => new THREE.Vector3(...p)));
    mesh(geo(new THREE.TubeGeometry(curve, 16, .0035, 6)), iron, root);
    mesh(geo(new THREE.CylinderGeometry(.008, .03, .022, 18, 1, true)), mat('#3d6b5e', { side: THREE.DoubleSide, roughness: .4 }), root, [-.075, .43, .045]);
    const bulb = mesh(geo(new THREE.SphereGeometry(.009, 12, 8)), mat('#fff2c9', { emissive: 0xffc46b, emissiveIntensity: 0 }), root, [-.075, .418, .045]);
    const glow = kit.glow({ color: 0xffc879, size: .13, opacity: 0 }); glow.position.set(-.075, .415, .045); root.add(glow);
    const light = new THREE.PointLight(0xffb86b, 0, 1.2, 1.4); light.position.set(-.075, .4, .045); root.add(light);
    const pool = new THREE.Mesh(geo(new THREE.PlaneGeometry(.26, .2)), kit.keep(new THREE.MeshBasicMaterial({ map: texture(canvas(128, 128, (c, W) => {
      const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); g.addColorStop(0, 'rgba(255,200,120,.85)'); g.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, W);
    })), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
    pool.rotation.x = -R; pool.position.set(-.075, .006, .05); root.add(pool);
    return { root, bulb, glow, light, pool };
  }

  /* hydrangeas, the flower of the rainy season: leaves and round heads of little florets */
  function makeBush(x, z, tints, s = 1) {
    const root = new THREE.Group(); root.position.set(x, 0, z); root.scale.setScalar(s);
    const leafM = mat('#3f7a4c', { roughness: .7 }), leafG = geo(new THREE.SphereGeometry(1, 10, 6).scale(.032, .01, .02));
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + rand(), r = .022 + rand() * .02, l = mesh(leafG, leafM, root, [Math.cos(a) * r, .016 + rand() * .03, Math.sin(a) * r]);
      l.rotation.set(rand() * .6 - .3, -a, .35 + rand() * .3); l.castShadow = false;
    }
    const headG = geo(new THREE.IcosahedronGeometry(1, 2));
    tints.forEach((t, i) => {
      const flor = texture(canvas(128, 128, c => {                    // florets: four-petal stars in two tones
        c.fillStyle = t[1]; c.fillRect(0, 0, 128, 128);
        for (let k = 0; k < 46; k++) {
          const px = rand() * 128, py = rand() * 128, r = 6 + rand() * 4;
          c.fillStyle = rand() < .5 ? t[0] : t[2];
          for (let q = 0; q < 4; q++) { c.beginPath(); c.ellipse(px + Math.cos(q * R) * r * .6, py + Math.sin(q * R) * r * .6, r * .55, r * .38, q * R, 0, TAU); c.fill(); }
          c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(px, py, 1.6, 0, TAU); c.fill();
        }
      }));
      const a = i / tints.length * TAU + .4, r = i ? .028 : 0, h = mesh(headG, mat('#ffffff', { map: flor, roughness: .75 }), root, [Math.cos(a) * r, .052 + (i ? 0 : .012), Math.sin(a) * r]);
      h.scale.setScalar(.026 + rand() * .006);
    });
    return root;
  }

  /* puddles: dark glossy water lying on the card, a wobbly edge, the sky's light in them */
  function makePuddle(p, i) {
    const shape = new THREE.Shape();
    for (let k = 0; k <= 40; k++) {
      const a = k / 40 * TAU, w = 1 + .07 * Math.sin(a * 3 + i * 2) + .05 * Math.sin(a * 5 + i);
      const x = Math.cos(a) * p.rx * w, y = Math.sin(a) * p.rz * w;
      if (k) shape.lineTo(x, y); else shape.moveTo(x, y);
    }
    const water = texture(canvas(256, 128, (c, W, H) => {
      const g = c.createRadialGradient(W * .42, H * .4, 4, W / 2, H / 2, W * .6);
      g.addColorStop(0, '#8eaecd'); g.addColorStop(.5, '#56769b'); g.addColorStop(1, '#2f4766'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.6)';
      c.beginPath(); c.ellipse(W * .32, H * .3, W * .16, H * .06, -.1, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(W * .62, H * .66, W * .07, H * .035, -.1, 0, TAU); c.fill();
    }));
    water.repeat.set(1 / (p.rx * 2.3), 1 / (p.rz * 2.3)); water.offset.set(.5, .5);
    const m = new THREE.Mesh(geo(new THREE.ShapeGeometry(shape, 1)), kit.keep(new THREE.MeshBasicMaterial({ map: water, color: 0xffffff, toneMapped: false,
      transparent: true, opacity: .92, depthWrite: false })));
    m.rotation.x = -R; m.position.set(p.x, .0035, p.z); m.renderOrder = 1;
    return m;
  }

  /* the painted sky at the back: rain over rice fields and hills, then the same country washed clean in a warm light */
  function country(c, W, H, clear) {
    const sky = c.createLinearGradient(0, 0, 0, H * .72);
    if (clear) { sky.addColorStop(0, '#5fb0e8'); sky.addColorStop(.6, '#a9dcf5'); sky.addColorStop(1, '#ffe2bf'); }
    else { sky.addColorStop(0, '#6c7f94'); sky.addColorStop(.6, '#93a5b5'); sky.addColorStop(1, '#b6c2ca'); }
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(77);
    if (clear) {                                                      // a low sun, fair-weather clouds
      const sun = c.createRadialGradient(W * .84, H * .2, 0, W * .84, H * .2, W * .22);
      sun.addColorStop(0, 'rgba(255,246,214,1)'); sun.addColorStop(.25, 'rgba(255,236,190,.7)'); sun.addColorStop(1, 'rgba(255,236,190,0)');
      c.fillStyle = sun; c.fillRect(0, 0, W, H);
    }
    for (let i = 0; i < 9; i++) {                                     // clouds: heavy and grey, or white and small
      const x = r() * W, y = (clear ? .1 + r() * .25 : r() * .3) * H, s = (clear ? .5 : 1) * (60 + r() * 60);
      if (clear && x > W * .3 && x < W * .7) continue;
      for (let k = 0; k < 6; k++) {
        c.fillStyle = clear ? (k < 3 ? '#ffffff' : '#fff1de') : (k < 3 ? '#5d6e82' : '#7e8ea0');
        c.beginPath(); c.ellipse(x + (k - 2.5) * s * .42, y + (k % 2 ? -s * .18 : 0) + (k < 3 ? s * .08 : 0), s * .5, s * .32, 0, 0, TAU); c.fill();
      }
    }
    const hill = (y0, amp, col, seed) => {                           // a ridge across the whole width
      const rr = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(seed);
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) c.lineTo(x, y0 - amp * (.55 + .45 * Math.sin(x / W * 7 + seed)) - rr() * amp * .25);
      c.lineTo(W, H); c.closePath(); c.fill();
    };
    hill(H * .62, H * .16, clear ? '#8fb7c9' : '#8797a6', 3);
    hill(H * .7, H * .1, clear ? '#6fae86' : '#73887f', 8);
    c.fillStyle = clear ? '#9ed37a' : '#8ea283'; c.fillRect(0, H * .76, W, H * .24);   // rice fields, row on row
    for (let y = H * .77, k = 0; y < H; y += 7 + k * 1.6, k++) {
      c.strokeStyle = clear ? (k % 2 ? '#7fbf5f' : '#b9e39a') : (k % 2 ? '#7a8f72' : '#a3b39a'); c.lineWidth = 2 + k * .5;
      c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= W; x += 64) c.lineTo(x, y + Math.sin(x * .01 + k) * 2); c.stroke();
    }
    c.fillStyle = clear ? 'rgba(255,255,255,.55)' : 'rgba(210,222,232,.5)';   // water standing in the fields
    for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse(r() * W, H * (.8 + r() * .17), 30 + r() * 50, 3 + r() * 3, 0, 0, TAU); c.fill(); }
    c.fillStyle = clear ? '#d9c8a8' : '#a8a59c';                       // the road coming in from the right
    c.beginPath(); c.moveTo(W * .62, H * .765); c.quadraticCurveTo(W * .8, H * .8, W, H * .86); c.lineTo(W, H * .95); c.quadraticCurveTo(W * .78, H * .84, W * .6, H * .77); c.fill();
    c.fillStyle = clear ? '#e9796c' : '#9a6f68';                       // a farmhouse with a lit window
    c.beginPath(); c.moveTo(W * .2, H * .73); c.lineTo(W * .235, H * .69); c.lineTo(W * .27, H * .73); c.fill();
    c.fillStyle = clear ? '#fff4e2' : '#d4d0c6'; c.fillRect(W * .205, H * .73, W * .06, H * .045);
    c.fillStyle = '#ffd27a'; c.fillRect(W * .222, H * .742, W * .014, H * .016);
    c.strokeStyle = clear ? '#5a4a3e' : '#4f4a48'; c.lineWidth = 3;    // utility poles and their wires
    const poles = [[.08, .6], [.36, .63], [.56, .64], [.93, .58]];
    poles.forEach(([x, y]) => { c.beginPath(); c.moveTo(W * x, H * y); c.lineTo(W * x, H * .78); c.moveTo(W * x - 9, H * y + 6); c.lineTo(W * x + 9, H * y + 6); c.stroke(); });
    c.lineWidth = 1.2;
    for (let i = 0; i + 1 < poles.length; i++) { const [x0, y0] = poles[i], [x1, y1] = poles[i + 1]; c.beginPath(); c.moveTo(W * x0, H * y0 + 6); c.quadraticCurveTo(W * (x0 + x1) / 2, H * (y0 + y1) / 2 + 18, W * x1, H * y1 + 6); c.stroke(); }
    if (!clear) {                                                     // the rain's grey veil
      c.strokeStyle = 'rgba(235,242,250,.35)'; c.lineWidth = 1.4;
      for (let i = 0; i < 220; i++) { const x = r() * W, y = r() * H * .9, l = 14 + r() * 18; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * .12, y + l); c.stroke(); }
    }
  }

  /* the rainbow: seven bands painted on a strip that follows the sky's curve; it draws itself from left to right */
  function makeRainbow() {
    const S = 64, bands = ['#ff5f5f', '#ffa04a', '#ffe066', '#7fd67a', '#5fb8ff', '#7a7cf0', '#b77af0'], R0 = .7, BW = .0115, A0 = .68;
    const pos = [], col = [], idx = [], c = new THREE.Color();
    bands.forEach((b, k) => {
      c.set(b);
      for (let i = 0; i <= S; i++) for (const r of [R0 - k * BW, R0 - (k + 1) * BW]) {
        const a = Math.PI - A0 - i / S * (Math.PI - 2 * A0), x = Math.cos(a) * r;
        pos.push(x, .02 + Math.sin(a) * r, skyZ(x) + .008); col.push(c.r, c.g, c.b);
      }
    });
    for (let i = 0; i < S; i++) bands.forEach((_, k) => { const v = (k * (S + 1) + i) * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); });
    const g = geo(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, kit.keep(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })));
    return { mesh: m, count: S * bands.length * 6, R0, A0 };
  }

  /* a little country bus, ours: rounded, mint and cream, big round headlights; it faces -x, its door side to the phone */
  function makeBus() {
    const L = .3, H = .15, W = .12, Y0 = .022, root = new THREE.Group();
    const body = new THREE.Group(); body.position.y = Y0; root.add(body);
    const s = new THREE.Shape();
    s.moveTo(-L / 2 + .02, 0); s.lineTo(L / 2 - .02, 0); s.quadraticCurveTo(L / 2, 0, L / 2, .02); s.lineTo(L / 2, H - .03);
    s.quadraticCurveTo(L / 2, H, L / 2 - .03, H); s.lineTo(-L / 2 + .055, H); s.quadraticCurveTo(-L / 2, H, -L / 2, H - .055);
    s.lineTo(-L / 2, .02); s.quadraticCurveTo(-L / 2, 0, -L / 2 + .02, 0);
    const D = W - .016, bg = geo(new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 3, curveSegments: 10 }));
    bg.translate(0, 0, -D / 2);
    const side = c => {                                               // the long side: two tones, windows, the door, the route
      const w = 512, h = 256, X = x => (x + L / 2) / L * w, Yp = y => (1 - y / H) * h;
      c.fillStyle = '#fff4dc'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#58bfb1'; c.fillRect(0, Yp(.07), w, h);
      c.fillStyle = '#ef6b5b'; c.fillRect(0, Yp(.075), w, 9);
      c.fillStyle = '#3d9c90'; c.fillRect(0, Yp(.012), w, 14);
      return { X, Yp };
    };
    const glass = (c, X, Yp, lit) => {
      for (const [x0, x1] of [[-.105, -.06], [-.035, .0], [.01, .045], [.055, .09], [.1, .135]]) {
        c.fillStyle = lit ? '#ffffff' : '#35506b'; rounded(c, X(x0), Yp(.135), X(x1) - X(x0), Yp(.085) - Yp(.135), 10); c.fill();
        if (!lit) { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(X(x0) + 6, Yp(.085) - 4); c.lineTo(X(x0) + 18, Yp(.135) + 4); c.lineTo(X(x0) + 28, Yp(.135) + 4); c.lineTo(X(x0) + 16, Yp(.085) - 4); c.fill(); }
      }
      c.fillStyle = lit ? '#ffffff' : '#35506b'; rounded(c, X(-.13), Yp(.13), X(-.112) - X(-.13), Yp(.02) - Yp(.13), 6); c.fill();   // the door's window
    };
    const paint = texture(canvas(512, 256, c => {
      const { X, Yp } = side(c);
      c.strokeStyle = '#2b2f4a'; c.lineWidth = 3; rounded(c, X(-.135), Yp(.14), X(-.107) - X(-.135), Yp(.012) - Yp(.14), 6); c.stroke();
      glass(c, X, Yp, false);
      c.fillStyle = '#fff4dc'; c.beginPath(); c.arc(X(.04), Yp(.042), 22, 0, TAU); c.fill();
      c.fillStyle = '#2b2f4a'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 26px "Be Vietnam Pro", sans-serif'; c.fillText('14', X(.04), Yp(.042) + 1);
      c.font = '800 19px "Be Vietnam Pro", sans-serif'; c.fillStyle = '#fff4dc'; c.fillText('TRẠM HẸN', X(-.035), Yp(.042));
      c.fillStyle = '#ef6b5b'; kit.heartPath(c, X(.1), Yp(.042), 22); c.fill();
      c.fillStyle = '#2d2f36'; for (const x of [-.09, .09]) { c.beginPath(); c.arc(X(x), Yp(0), 30, Math.PI, TAU); c.fill(); }   // wheel arches
    }));
    paint.repeat.set(1 / L, 1 / H); paint.offset.set(.5, 0);
    const lit = texture(canvas(512, 256, c => { c.fillStyle = '#000'; c.fillRect(0, 0, 512, 256); const X = x => (x + L / 2) / L * 512, Yp = y => (1 - y / H) * 256; glass(c, X, Yp, true); }));
    lit.repeat.copy(paint.repeat); lit.offset.copy(paint.offset);
    const sideM = mat('#ffffff', { map: paint, emissive: 0xffc98a, emissiveMap: lit, emissiveIntensity: 0, roughness: .45 });
    const shell = mesh(bg, [sideM, mat('#fff4dc', { roughness: .45 })], body); shell.receiveShadow = true;
    const dark = mat('#2d2f36', { roughness: .7 }), chrome = mat('#dfe3e8', { roughness: .25, metalness: .7 });
    const windshield = mesh(geo(new THREE.PlaneGeometry(W * .72, .042)), mat('#35506b', { roughness: .15, emissive: 0xffc98a, emissiveIntensity: 0 }), body, [-L / 2 - .0085, .082, 0]);
    windshield.rotation.y = -R;
    mesh(geo(new THREE.BoxGeometry(.012, .016, W + .01)), dark, body, [-L / 2 - .006, .008, 0]);   // the bumper
    const lamps = [-1, 1].map(sd => {
      const l = mesh(geo(new THREE.CylinderGeometry(.0145, .0145, .006, 18)), mat('#fff6d8', { emissive: 0xffd27a, emissiveIntensity: 1.2, roughness: .2 }), body, [-L / 2 - .009, .036, sd * .036]);
      l.rotation.z = R;
      mesh(geo(new THREE.TorusGeometry(.0148, .0028, 6, 18)), chrome, body, [-L / 2 - .011, .036, sd * .036]).rotation.y = R;
      const gl = kit.glow({ color: 0xffd58a, size: .075, opacity: 0 }); gl.position.set(-L / 2 - .022, Y0 + .036, sd * .036); root.add(gl);
      return gl;
    });
    const wheels = [];
    const tyre = geo(new THREE.CylinderGeometry(.024, .024, .016, 18)), hub = geo(new THREE.CylinderGeometry(.011, .011, .018, 12));
    for (const x of [-.09, .09]) for (const z of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(x, .024, z * (W / 2 - .006)); root.add(w);
      mesh(tyre, dark, w).rotation.x = R; mesh(hub, chrome, w).rotation.x = R; wheels.push(w);
      const spoke = mesh(geo(new THREE.BoxGeometry(.016, .003, .019)), dark, w); spoke.rotation.x = R;
    }
    const sign = texture(canvas(128, 64, c => { c.fillStyle = '#2b2f4a'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#ffd36b'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 40px "Be Vietnam Pro", sans-serif'; c.fillText('14', 64, 34); }));
    mesh(geo(new THREE.BoxGeometry(.04, .022, .05)), [mat('#2b2f4a'), mat('#2b2f4a'), mat('#2b2f4a'), mat('#2b2f4a'), mat('#ffffff', { map: sign, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: .5 }), mat('#2b2f4a')], body, [-L / 2 + .045, H + .016, 0]);
    const beam = new THREE.Mesh(geo(new THREE.PlaneGeometry(.3, .2)), kit.keep(new THREE.MeshBasicMaterial({ map: texture(canvas(128, 128, (c, W2) => {
      const g = c.createRadialGradient(W2 * .15, W2 / 2, 0, W2 * .15, W2 / 2, W2 * .85); g.addColorStop(0, 'rgba(255,214,140,.9)'); g.addColorStop(1, 'rgba(255,214,140,0)');
      c.fillStyle = g; c.fillRect(0, 0, W2, W2);
    })), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
    beam.rotation.set(-R, 0, Math.PI); beam.position.set(-L / 2 - .14, .006, 0); root.add(beam);
    return { root, body, wheels, lamps, beam, sideM, windshield: windshield.material };
  }

  /* a soft grey rain cloud that whitens and drifts aside when the sky clears */
  function cloud(seed) {
    const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(seed);   // its puffs once: the act repaints pictures
    const puffs = Array.from({ length: 7 }, (_, i) => [.2 + .6 * i / 6 + (r() - .5) * .06, .56 - .14 * Math.sin(Math.PI * i / 6) - r() * .06, .13 + .07 * Math.sin(Math.PI * i / 6) + r() * .03]);
    return kit.picture((c, px) => {
      c.fillStyle = '#c9d2dc'; puffs.forEach(([x, y, s]) => { c.beginPath(); c.arc(x * px, (y + s * .25) * px, s * px, 0, TAU); c.fill(); });
      c.fillStyle = '#ffffff'; puffs.forEach(([x, y, s]) => { c.beginPath(); c.arc(x * px, y * px, s * .92 * px, 0, TAU); c.fill(); });
      c.fillRect(px * .2, px * .5, px * .6, px * .1);
    }, { size: .3 });
  }

  /* ── the rain ── */
  let landings = [], due = 0, drips = 0, rip = 0;
  /** a ring spreading on the water at (x, z), up to r across, for life seconds of T */
  function ripple(x, z, r, T, life = .55, flat = 1) { const q = ripples[rip++ % ripples.length]; q.at = T; q.life = life; q.r = r; q.flat = flat; q.m.position.set(x, .0045, z); }
  const hub = new THREE.Vector3(), axis = new THREE.Vector3(), heads = [new THREE.Vector3(), new THREE.Vector3()];
  /** the canopy's hub and the way the shaft points, in stage space */
  const findCanopy = () => { umb.root.updateWorldMatrix(true, true); stagePos(umb.top, hub); axis.set(0, 1, 0).applyMatrix4(umb.top.matrixWorld).applyMatrix4(mStage).sub(hub).normalize(); };
  /** where a drop falling at (x, z) lands, and on what */
  function surface(x, z, open) {
    if (open > .9) {
      const dx = x - hub.x, dz = z - hub.z, r = Math.hypot(dx, dz);
      if (r < umb.R * .9) return { y: hub.y - (axis.x * dx + axis.z * dz) / axis.y - umb.DOME * (r / umb.R) ** 2, on: 'umb', dx, dz, r };
    }
    for (const h of heads) if (Math.hypot(x - h.x, z - h.z) < .035) return { y: h.y, on: 'head' };
    for (const p of PUDDLES) if (((x - p.x) / p.rx) ** 2 + ((z - p.z) / p.rz) ** 2 < .75) return { y: .004, on: 'puddle' };
    return { y: .003, on: 'card' };
  }
  function weather(T, dt, pour, held, g) {
    findCanopy();
    [boy, girl].forEach((m, i) => { stagePos(m.node('head'), heads[i]); heads[i].y += CROWN; });
    const open = umb.open;
    if (dt) {
      const first = pour > .5 && kit.once('rain');                       // the first frame: it is raining already, not starting to
      due += 95 * pour * dt + (first ? 50 : 0);
      for (; due >= 1; due--) {
        const x = (rng() - .5) * 1.04, z = -.26 + rng() * .57;               // where it lands
        if (held && z > .03 && ((g < 7 && Math.abs(x + .12) < .24) || (g > 12 && g < 13 && Math.abs(x - READ[0]) < .16))) continue;   // keep the words clear
        const s = surface(x, z, open), y0 = first ? s.y + rng() * (.8 - s.y) : .78 + rng() * .05, v = 1.5 + rng() * .3, life = (y0 - s.y) / v;
        rain.emit({ x: x - WIND * life, y: y0, z, vx: WIND, vy: -v, size: .042 + rng() * .014, life, shape: 'drop', color: '#f2f8ff', rot: Math.atan2(WIND, v) });
        landings.push({ at: T + life, x, ...s });
      }
      drips += 10 * pour * (open > .9 ? 1 : 0) * dt;                     // water running off the rim, from the rib ends
      for (; drips >= 1; drips--) {
        const t = umb.tips[(rng() * umb.tips.length) | 0]; stagePos(t, vA);
        const s = surface(vA.x, vA.z, 0), fall = (Math.sqrt(.04 + 6.4 * Math.max(0, vA.y - s.y)) - .2) / 3.2;
        rain.emit({ x: vA.x, y: vA.y, z: vA.z, vy: -.2, gravity: -3.2, size: .02, life: fall, shape: 'drop', color: '#dcecff', rot: 0 });
        landings.push({ at: T + fall, x: vA.x, ...s });
      }
    }
    for (let i = landings.length - 1; i >= 0; i--) {
      const d = landings[i]; if (T < d.at) continue;
      landings.splice(i, 1);
      if (d.on === 'umb') {                                               // bounced off the canopy, outwards
        const ux = d.dx / (d.r || 1), uz = d.dz / (d.r || 1);
        splash.burst(2, () => ({ x: d.x, y: d.y + .004, z: d.z, vx: ux * (.1 + rng() * .14) + (rng() - .5) * .05, vy: .16 + rng() * .14, vz: uz * (.1 + rng() * .14), gravity: -2.4,
          color: '#eef7ff', size: .0075 + rng() * .004, life: .3, shape: 'glow' }));
      } else {
        if (d.on === 'puddle') ripple(d.x, d.z, .026 + rng() * .016, T, .5 + rng() * .2);
        splash.burst(d.on === 'head' ? 3 : 2, () => ({ x: d.x, y: d.y + .003, z: d.z, vx: (rng() - .5) * .16, vy: .12 + rng() * .12, vz: (rng() - .5) * .14, gravity: -2.2, floor: .004,
          color: '#eef7ff', size: .007 + rng() * .004, life: .26, shape: 'glow' }));
      }
    }
  }
  return {
    seconds: [6.4, 6.2, 6.4],

    build() {
      /* the two of them */
      boy = kit.model('boy').fit({ height: H }); girl = kit.model('girl').fit({ height: HER });
      stage.add(boy.root, girl.root);

      /* the umbrella, in his right hand all along */
      umb = makeUmbrella(); stage.add(umb.root); boy.hold(umb.root, 'handslot.r'); umb.root.position.set(0, 0, 0);

      /* the country bus stop, the lamp, hydrangeas, puddles */
      stop = makeStop(); stage.add(stop.root);
      lamp = makeLamp(); stage.add(lamp.root);
      stage.add(makeBush(-.45, .05, [['#8fb8ff', '#5f86e0', '#c0d6ff'], ['#c6a4ff', '#9a76e8', '#e2d0ff'], ['#9fc4ff', '#6a8fe6', '#d4e4ff']]));
      stage.add(makeBush(.45, .22, [['#ffb3d1', '#e57fae', '#ffd6e6'], ['#c6a4ff', '#9a76e8', '#e2d0ff'], ['#ffc2dc', '#ee8fb8', '#ffe2ee']], .9));
      puddles = PUDDLES.map((p, i) => { const m = makePuddle(p, i); stage.add(m); return m; });
      ripples = Array.from({ length: 30 }, () => {
        const m = new THREE.Mesh(geo(new THREE.RingGeometry(.8, 1, 36)), kit.keep(new THREE.MeshBasicMaterial({ color: 0xeef6ff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })));
        m.rotation.x = -R; m.renderOrder = 2; m.visible = false; stage.add(m);
        return { m, at: -9, life: 1, r: .03, flat: 1 };
      });
      waterGlow = kit.glow({ color: 0x9fd0ff, size: .15, opacity: 0, depthTest: false });
      waterGlow.position.set(PUDDLES[1].x, .012, PUDDLES[1].z); stage.add(waterGlow);

      /* the sky at the back: rain, then clear; the rainbow; clouds that part */
      rainSky = kit.backdrop((c, w, h) => country(c, w, h, false), { ...SKY, order: -4 });
      clearSky = kit.backdrop((c, w, h) => country(c, w, h, true), { ...SKY, z: SKY.z + .002, order: -3 });
      clearSky.material.opacity = 0; stage.add(rainSky, clearSky);
      rainbow = makeRainbow(); stage.add(rainbow.mesh);
      clouds = [[-.4, .75, -.25, .32, -1], [-.13, .79, -.27, .3, -1], [.15, .77, -.26, .34, 1], [.41, .76, -.23, .3, 1], [-.27, .71, -.14, .24, -1], [.3, .72, -.12, .26, 1]]
        .map(([x, y, z, s, side], i) => { const p = cloud(31 + i * 7); p.position.set(x, y, z); p.scale.setScalar(s); stage.add(p); return { p, x, y, z, s, side }; });

      /* the bus that comes at the end */
      bus = makeBus(); bus.root.position.set(.9, 0, BUS_Z); stage.add(bus.root);

      /* the card's words and photo */
      note = kit.sign({ text: words('note1', 'Mưa thì mình chung ô'), width: .4, aspect: .5, accent: '#f0727e', ink: '#2e3a6e', glow: .45 });
      banner = kit.sign({ text: words('note2', 'Che mưa cho em cả đời nhé!'), style: 'banner', width: .62, accent: '#e8505b', glow: .45 });
      photo = kit.polaroid({ width: .24, caption: words('caption', 'Ngày mưa có em'), glow: .5, halo: true, haloColor: 0xcfe4ff });
      pin = kit.picture((c, px) => { c.fillStyle = '#e8505b'; kit.heartPath(c, px / 2, px * .52, px * .8); c.fill();
        c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(px * .36, px * .38, px * .08, px * .05, -.6, 0, TAU); c.fill(); }, { size: .028 });
      stage.add(note.root, banner.root, photo.root, pin);

      /* particles */
      rain = kit.particles({ max: 240 });
      splash = kit.particles({ max: 380 });
      hearts = kit.particles({ max: 120 });
      sparks = kit.particles({ max: 260, additive: true });
      petals = kit.particles({ max: 160 });
      stage.add(rain.root, splash.root, hearts.root, sparks.root, petals.root);
    },

    reset() {
      [rain, splash, hearts, sparks, petals].forEach(p => p.clear());
      landings.length = 0; due = drips = 0; ripples.forEach(q => { q.at = -9; q.m.visible = false; });
      boy.stop(); girl.stop();
    },

    pose(f) {
      const { g, T, dt, held } = f;
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();

      /* light: a grey rainy afternoon, then the sun comes out low and warm */
      const sunny = ease.smooth(seg(g, 13, 14.6));
      kit.lights.hemi.color.copy(RAINY.hemi).lerp(CLEAR.hemi, sunny); kit.lights.hemi.groundColor.copy(RAINY.ground).lerp(CLEAR.ground, sunny);
      kit.lights.hemi.intensity = lerp(1, 1.15, sunny); kit.lights.sun.color.copy(RAINY.sun).lerp(CLEAR.sun, sunny); kit.lights.sun.intensity = lerp(.8, 1.55, sunny);
      const on = g < .4 ? 0 : g < .9 ? (Math.sin((g - .4) * 47) > -.2 ? 1 : .2) : 1, flicker = 1 + .05 * Math.sin(T * 13) * Math.sin(T * 7.3);
      lamp.glow.material.opacity = .75 * on * flicker * (1 - .4 * sunny); lamp.light.intensity = .9 * on * flicker * (1 - .5 * sunny);
      lamp.bulb.material.emissiveIntensity = 1.6 * on; lamp.pool.material.opacity = .26 * on * (1 - .6 * sunny);
      puddles.forEach(m => m.material.color.setRGB(lerp(.76, 1, sunny), lerp(.8, 1, sunny), lerp(.86, 1, sunny)));   // grey water, then the blue sky in it

      /* the sky: the clouds part, the clear sky comes through, the rainbow draws itself */
      const part = ease.inOut(seg(g, 13.1, 14.7));
      clearSky.material.opacity = ease.smooth(seg(g, 13.2, 14.5));
      clouds.forEach(({ p, x, y, z, s, side }, i) => {
        const px = x + side * .55 * part + .006 * Math.sin(T * .4 + i);
        p.position.set(px, y + .05 * part + .004 * Math.sin(T * .6 + i * 2), Math.max(z, skyZ(Math.min(.55, Math.abs(px))) + .07));   // sprites near the page get cut
        p.material.color.setRGB(lerp(.5, 1, part), lerp(.56, 1, part), lerp(.66, 1, part));   // rain clouds, whitening as they go
        p.material.opacity = 1 - ease.in(part); p.scale.setScalar(s * lerp(1, 1.15, part));
      });
      const arc = ease.inOut(seg(g, 14.1, 15.1));
      rainbow.mesh.geometry.setDrawRange(0, Math.floor(rainbow.count * arc / 42) * 42);
      rainbow.mesh.material.opacity = .82 * Math.min(1, arc * 3) * (1 + .05 * Math.sin(T * 2));
      if (arc > 0 && arc < 1 && dt) {                                  // sparkles where it is drawing
        const a = Math.PI - rainbow.A0 - arc * (Math.PI - 2 * rainbow.A0), r = rainbow.R0 - .04, x = Math.cos(a) * r;
        sparks.emit({ x, y: .02 + Math.sin(a) * r, z: skyZ(x) + .035, vx: (rng() - .5) * .05, vy: (rng() - .5) * .05,
          color: ['#fff6c9', '#ffffff', '#ffd1dc'][(rng() * 3) | 0], size: .02 + rng() * .015, life: .7, shape: 'sparkle', spin: 3 });
      }
      if (held && g > 18 && dt && rng() < dt * 2) {
        const a = rainbow.A0 + rng() * (Math.PI - 2 * rainbow.A0), r = rainbow.R0 - .04, x = Math.cos(a) * r;
        sparks.emit({ x, y: .02 + Math.sin(a) * r, z: skyZ(x) + .035, color: '#fffbe6', size: .018, life: 1.1, shape: 'sparkle', spin: 2 });
      }

      /* the sweethearts: where they are and which way they look */
      const [bx, bz, br] = wayAt(BOY_WAY, g), [gx, gz, gr] = wayAt(GIRL_WAY, g);
      const flyB = Math.sin(Math.PI * seg(g, 15.7, 16.1)), flyG = Math.sin(Math.PI * seg(g, 15.72, 16.12));   // a hop higher than the clip's
      const sway = ease.smooth(seg(g, 18.2, 18.8)) * .05 * Math.sin(T * 2.1);   // at the last stop they sway together
      boy.root.position.set(bx, .055 * flyB, bz); boy.root.rotation.y = br + sway;
      girl.root.position.set(gx, .055 * flyG, gz); girl.root.rotation.y = gr + sway;
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g);
      boy.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);

      /* bodies and heads */
      const hug = 1 - ease.smooth(seg(g, 4.3, 4.7));
      girl.bend('chest', .1 * bump(g, 2.4, 2.5, 2.6, 2.85) - .12 * bump(g, 1.05, 1.4, 1.75, 2) - .1 * bump(g, 4, 4.3, 4.55, 4.85)
        - .1 * bump(g, 13.1, 13.45, 13.75, 14.05), 0, .025 * Math.sin(T * 41) * hug * (1 - bump(g, 1.1, 1.3, 1.85, 2)));   // a shiver; looking up; a sneeze
      girl.bend('head', -.55 * bump(g, 1.05, 1.4, 1.75, 2) + .45 * bump(g, 2.42, 2.5, 2.58, 2.8) - .5 * bump(g, 4, 4.3, 4.55, 4.85) - .2 * bump(g, 7.95, 8.15, 8.45, 8.65)
        - .55 * bump(g, 13.1, 13.45, 13.75, 14.05) - .25 * bump(g, 16.2, 16.4, 16.9, 17.3),
        .5 * bump(g, .2, .45, .85, 1.05) + .3 * bump(g, 2.95, 3.1, 3.3, 3.5) - .28 * bump(g, 7.95, 8.15, 8.45, 8.65),
        -.3 * bump(g, 8.75, 9.35, 12.6, 12.85) - .16 * bump(g, 18.3, 18.8, 30, 31));   // her head on his shoulder
      girl.bend('spine', 0, 0, -.08 * bump(g, 8.75, 9.35, 12.6, 12.85));
      boy.bend('chest', -.1 * bump(g, 13.3, 13.6, 13.8, 14.1), 0, 0);
      boy.bend('head', -.5 * bump(g, 13.3, 13.6, 13.8, 14.1) - .12 * bump(g, 15.0, 15.15, 15.25, 15.35), .38 * Math.sin(T * 30) * bump(g, 5.25, 5.32, 5.55, 5.65)
        + .25 * bump(g, 7.95, 8.15, 8.45, 8.65) - .3 * bump(g, 14.95, 15.05, 15.2, 15.3), .15 * bump(g, 9, 9.4, 12.6, 12.85) + .12 * bump(g, 18.3, 18.8, 30, 31));

      /* arms after the bodies (a bend moves the shoulders): his first, then hers reaching for where his are now: the
         handle under his hand, then his arm */
      findCanopy();
      arms(boy, ARMS.boy, g);
      stagePos(umb.root, TARGET.handle).addScaledVector(axis, -.032);  // on the shaft just under his hand
      stagePos(boy.node('lowerarm.r'), TARGET.link).lerp(stagePos(boy.node('handslot.r'), vA), .4);
      arms(girl, ARMS.girl, g);

      /* the umbrella: in his hand (shut, in the left one), its shaft pointing the way the table says */
      if ((g >= 14.62) !== umbLeft) { umbLeft = g >= 14.62; boy.hold(umb.root, umbLeft ? 'handslot.l' : 'handslot.r'); umb.root.position.set(0, 0, 0); }
      let u = 0; while (u + 1 < UMB.length && g >= UMB[u + 1][0]) u++;
      const uk = UMB[u][2] ? ease.inOut(clamp((g - UMB[u][0]) / UMB[u][2])) : 1;
      vUp.fromArray(UMB[u][1]).normalize();
      if (u > 0 && uk < 1) vUp.lerp(vUp0.fromArray(UMB[u - 1][1]).normalize(), 1 - uk).normalize();
      const walkB = g < 3.3 ? 1 - seg(g, 3.05, 3.3) : 0;
      vUp.x += .04 * Math.sin(g * 9.1) * walkB; vUp.z += .03 * Math.sin(T * 1.3) * (1 - walkB) * (g < 13.7 ? 1 : .4);
      const shake = bump(g, 14.22, 14.27, 14.45, 14.52);
      vUp.x += .28 * Math.sin(g * 46) * shake; vUp.z += .12 * Math.cos(g * 46) * shake; vUp.normalize();
      const openK = u > 0 && UMB[u][3] !== UMB[u - 1][3] ? lerp(UMB[u - 1][3], UMB[u][3], ease.inOut(uk)) : UMB[u][3];
      umb.setOpen(openK);
      qW.setFromUnitVectors(Y, vUp); stage.getWorldQuaternion(qInv); qW.premultiply(qInv);
      umb.root.parent.getWorldQuaternion(qInv); umb.root.quaternion.copy(qInv.invert().multiply(qW));
      umb.root.updateWorldMatrix(true, true);
      if (shake && dt && rng() < dt * 40) {                              // shaken shut: the last water flies off
        const t = umb.tips[(rng() * 8) | 0]; stagePos(t, vA);
        splash.emit({ x: vA.x, y: vA.y, z: vA.z, vx: (rng() - .5) * .5, vy: .2 + rng() * .3, vz: (rng() - .5) * .4, gravity: -2.4, floor: .004,
          color: '#e6f3ff', size: .009 + rng() * .006, life: .6, shape: 'glow' });
      }

      /* the rain: falling, landing, splashing (by T); the canopy, their heads and the puddles each catch it */
      const pour = 1 - ease.smooth(seg(g, 12.75, 13.9));
      weather(T, dt, pour, held, g);

      /* footsteps in the wet as he walks in */
      if (g > .3 && g < 3.3 && dt) {
        const step = Math.floor((g - .3) / .345);
        if (kit.once(`step${step}`)) {
          const foot = boy.node(step % 2 ? 'foot.l' : 'foot.r'); stagePos(foot, vA);
          splash.burst(3, () => ({ x: vA.x, y: .006, z: vA.z, vx: (rng() - .5) * .14, vy: .12 + rng() * .1, vz: (rng() - .5) * .1, gravity: -2, floor: .004, color: '#e6f3ff', size: .007, life: .3, shape: 'glow' }));
        }
      }

      /* chapter 1: her palm catches a drop; a sneeze; a small heart when the umbrella comes over her */
      if (g > 1.6 && kit.once('palm')) { stagePos(girl.node('handslot.r'), vA); splash.burst(5, () => ({ x: vA.x, y: vA.y + .01, z: vA.z, vx: (rng() - .5) * .16, vy: .14 + rng() * .12, vz: (rng() - .5) * .12, gravity: -2, color: '#e6f3ff', size: .008, life: .4, shape: 'glow' })); }
      if (g > 2.55 && kit.once('sneeze')) {
        stagePos(girl.node('head'), vA); const fx = Math.sin(gr), fz = Math.cos(gr);
        splash.burst(10, () => ({ x: vA.x + fx * .11, y: vA.y + .05, z: vA.z + fz * .11, vx: fx * (.2 + rng() * .16) + (rng() - .5) * .14, vy: (rng() - .2) * .14, vz: fz * (.2 + rng() * .16) + (rng() - .5) * .14,
          drag: 2.6, color: '#ffffff', size: .016 + rng() * .016, grow: 1, life: .8, shape: 'glow' }));
      }
      if (g > 4.75 && kit.once('touched')) hearts.burst(8, () => ({ x: gx + (rng() - .5) * .05, y: .3, z: gz + .02, vx: (rng() - .5) * .12, vy: .1 + rng() * .08, gravity: -.06, drag: .6,
        color: ['#ff6f91', '#ff9fb6', '#ffc2d1'][(rng() * 3) | 0], size: .02 + rng() * .012, life: 1.8, shape: 'heart', spin: (rng() - .5) * 3 }));

      /* chapter 1's stop: the first note comes up out of the timetable board */
      const n = ease.back(seg(g, 5, 5.75)) * (1 - ease.in(seg(g, 6.45, 6.9)));
      stagePos(stop.board, vA);
      const rise = ease.out(seg(g, 5, 5.75));
      note.root.scale.setScalar(Math.max(.001, n));
      note.root.position.set(lerp(vA.x, -.12, rise), lerp(vA.y - .05, .63, rise) + .1 * seg(g, 6.45, 6.9) + .008 * Math.sin(T * 1.6), lerp(vA.z, .07, rise));
      note.root.rotation.set(-.12, lerp(.4, 0, rise), .04 * Math.sin(T * .9) + (1 - rise) * .3);
      if (g > 5.05 && kit.once('note')) sparks.burst(14, () => ({ x: vA.x, y: vA.y, z: vA.z + .01, vx: (rng() - .3) * .3, vy: .1 + rng() * .25, vz: rng() * .15, drag: 2,
        color: ['#fff1b8', '#ffd1dc', '#ffffff'][(rng() * 3) | 0], size: .018, life: .8, shape: 'sparkle', spin: 3 }));

      /* chapter 2: close under the umbrella; hearts as she leans on him */
      if (g > 9.3 && kit.once('lean')) hearts.burst(12, () => ({ x: (rng() - .5) * .06, y: .33, z: .0, vx: (rng() - .5) * .2, vy: .12 + rng() * .1, gravity: -.08, drag: .6,
        color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .022 + rng() * .014, life: 2, shape: 'heart', spin: (rng() - .5) * 3 }));

      /* chapter 2: the puddle glows and the photo rises out of the water, dripping; chapter 3 pins it on the post */
      const P1 = PUDDLES[1];
      waterGlow.material.opacity = .65 * bump(g, 9.4, 9.8, 10.6, 11.4) * (1 + .15 * Math.sin(T * 7));
      for (const [k, at] of [['w0', 9.45], ['w1', 9.62], ['w2', 9.8], ['w3', 10.05]]) if (g > at && kit.once(k)) ripple(P1.x, P1.z, .075, T, .9, .55);
      const lift = ease.out(seg(g, 9.9, 10.5)), stand = ease.inOut(seg(g, 10.15, 10.95)), grow = ease.out(seg(g, 9.9, 10.9));
      const fly = ease.inOut(seg(g, 12.65, 13.6));
      const up = [lerp(P1.x, READ[0], stand), lerp(.004, READ[1], lift * stand) + .006 * Math.sin(T * 1.3) * (1 - fly), lerp(P1.z + .05, READ[2], stand)];
      const at = fly > 0 ? FLIGHT.getPoint(fly, vT).toArray() : up;    // up, over the umbrella, down onto the post
      photo.root.position.set(at[0], at[1], at[2]);
      photo.root.scale.setScalar(Math.max(.001, g < 9.9 ? 0 : lerp(.35, 1, grow) * lerp(1, PIN, fly)));
      photo.root.rotation.set(lerp(lerp(-R, -.08, stand), 0, fly), lerp(-.12 + .06 * Math.sin(T * .8), 0, fly), lerp(.03 * Math.sin(T * .6), -.05, fly));
      photo.halo.material.opacity = .22 * ease.out(seg(g, 10.6, 11.2)) * (1 - fly) * (1 + .08 * Math.sin(T * 3));
      if (g > 9.95 && kit.once('surface')) {
        splash.burst(18, () => ({ x: P1.x + (rng() - .5) * .08, y: .01, z: P1.z + (rng() - .5) * .04, vx: (rng() - .5) * .3, vy: .3 + rng() * .3, vz: (rng() - .5) * .2, gravity: -2.4, floor: .004,
          color: '#e6f3ff', size: .009 + rng() * .008, life: .7, shape: 'glow' }));
        ripple(P1.x, P1.z, .08, T, 1, .55);
      }
      if (g > 10.5 && dt && (g < 12.65 || held && g < 12.7) && rng() < dt * 3 * (g < 12 ? 1 : .4)) {   // water running off its bottom edge
        const s = photo.root.scale.x, x = at[0] + (rng() - .5) * .2 * s, y = at[1], z = at[2] + .005;
        rain.emit({ x, y, z, vy: -.1, gravity: -3, size: .018, life: Math.max(.1, (Math.sqrt(.01 + 6 * y) - .1) / 3), shape: 'drop', color: '#d6ebff', rot: 0 });
        landings.push({ at: T + (Math.sqrt(.01 + 6 * y) - .1) / 3, x, y: .004, z, on: 'puddle' });
      }
      if (g > 10.5 && g < 12.6 && dt && rng() < dt * 4) {
        const a = rng() * TAU, s = photo.root.scale.x;
        sparks.emit({ x: at[0] + Math.cos(a) * .15 * s, y: at[1] + .145 * s + Math.sin(a) * .17 * s, z: at[2] + .01, color: '#e9f4ff', size: .018, life: 1, shape: 'sparkle', spin: 3 });
      }
      pin.scale.setScalar(Math.max(.001, .028 * ease.back(seg(g, 13.42, 13.7))));
      pin.position.set(POSTER[0], POSTER[1] + .24 * PIN * 620 / 512 - .006, POSTER[2] + .01);

      /* chapter 3: the jump into the puddle, a big splash, laughing */
      if (g > 16.1 && kit.once('splash')) {
        const p = PUDDLES[0];
        splash.burst(46, i => { const a = i / 46 * TAU + rng() * .2, s = .18 + rng() * .25; return { x: p.x + Math.cos(a) * .1, y: .01, z: p.z + Math.sin(a) * .05,
          vx: Math.cos(a) * s, vy: .5 + rng() * .45, vz: Math.sin(a) * s * .6, gravity: -2.8, floor: .004, color: i % 3 ? '#e6f3ff' : '#ffffff', size: .011 + rng() * .012, life: 1.1, shape: 'glow' }; });
        sparks.burst(16, () => ({ x: p.x + (rng() - .5) * .2, y: .05 + rng() * .1, z: p.z, vx: (rng() - .5) * .3, vy: .2 + rng() * .3, drag: 1.5, color: '#ffffff', size: .02, life: .8, shape: 'sparkle', spin: 4 }));
        ripple(p.x - .07, p.z, .085, T, 1.1, .7); ripple(p.x + .07, p.z, .085, T, 1.15, .7); ripple(p.x, p.z, .15, T, 1.4, .45);
      }
      puddles[0].scale.setScalar(1 + (g > 16.1 ? .06 * Math.exp(-5 * (g - 16.1)) * Math.sin(20 * (g - 16.1)) : 0));
      if (g > 16.3 && kit.once('laugh')) hearts.burst(26, () => ({ x: (rng() - .5) * .12, y: .3, z: .14, vx: (rng() - .5) * .45, vy: .16 + rng() * .3, vz: (rng() - .5) * .2,
        gravity: -.2, drag: .9, color: ['#ff4f7b', '#ff8fab', '#ffd1dc', '#e8436d'][(rng() * 4) | 0], size: .024 + rng() * .022, life: 2.4, shape: 'heart', spin: (rng() - .5) * 4 }));

      /* chapter 3: the bus pulls up, its headlights warm, a toot */
      const drive = ease.out(seg(g, 15.95, 17.2)), xb = lerp(.9, BUS_STOP, drive), stopT = g - 17.2;
      bus.root.visible = g > 15.95;
      bus.root.position.set(xb, 0, BUS_Z);
      bus.body.rotation.z = stopT > 0 ? -.05 * Math.exp(-6 * stopT) * Math.sin(16 * stopT) : 0;
      bus.wheels.forEach(w => { w.rotation.z = (xb - .9) / .024; });
      const beams = (g > 15.95 ? 1 : 0) * (1 + .05 * Math.sin(T * 3));
      bus.lamps.forEach(l => { l.material.opacity = .95 * beams; }); bus.beam.material.opacity = .55 * beams;
      bus.sideM.emissiveIntensity = .5 * ease.smooth(seg(g, 16.8, 17.6)); bus.windshield.emissiveIntensity = .3 * ease.smooth(seg(g, 16.8, 17.6));
      if (g > 17.3 && kit.once('toot')) hearts.burst(3, i => ({ x: BUS_STOP - .17, y: .14, z: BUS_Z + .05, vx: -.05 - i * .03, vy: .12, gravity: -.02, color: ['#ffd166', '#ff8fab', '#9be7ff'][i],
        size: .035, life: 1.6, shape: 'note', rot: 0, spin: (rng() - .5) * 1.5 }));

      /* chapter 3: petals in the clean air, the banner with the last words */
      if (g > 14.8 && dt && rng() < dt * (held ? 3 : 5)) {
        const left = rng() < .5, x = left ? -.45 : .45, z = left ? .05 : .22;
        petals.emit({ x: x + (rng() - .5) * .08, y: .08, z: z + (rng() - .5) * .06, vx: (left ? 1 : -1) * (.02 + rng() * .05), vy: .06 + rng() * .06, sway: .05,
          color: ['#8fb8ff', '#c6a4ff', '#ffb3d1', '#ffffff', '#9fc4ff'][(rng() * 5) | 0], size: .016 + rng() * .01, life: 5, shape: 'petal', spin: (rng() - .5) * 2 });
        if (rng() < .5) sparks.emit({ x: (rng() - .5) * .9, y: .1 + rng() * .45, z: (rng() - .5) * .4, vy: .02, color: '#fff6d8', size: .014 + rng() * .01, life: 1.4, shape: 'sparkle', twinkle: 6 });
      }
      const b = ease.elastic(seg(g, 16.9, 17.9));
      banner.root.scale.setScalar(Math.max(.001, b));
      banner.root.position.set(0, .62 + .006 * Math.sin(T * 1.5), .05);
      banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      if (held && g > 18.5 && dt && rng() < dt * 1.2) hearts.emit({ x: (rng() - .5) * .25, y: .32, z: .14, vy: .07, sway: .03, color: '#ff8fab', size: .018, life: 2.4, shape: 'heart' });

      ripples.forEach(q => {
        const k = (T - q.at) / q.life;
        q.m.visible = k >= 0 && k < 1;
        if (q.m.visible) { const s = q.r * (.15 + .85 * ease.out(k)); q.m.scale.set(s, s * q.flat, 1); q.m.material.opacity = .7 * (1 - k); }
      });
      [rain, splash, hearts, sparks, petals].forEach(x => x.update(dt, T));
    }
  };
};
