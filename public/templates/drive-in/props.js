/* Suất Chiếu Đặc Biệt: the six Grab3D props (CC0) the lot is dressed with: the 1960s convertible, the film projector,
   the street lights, the cotton candy, the phone booth (the photo booth) and the retro radio. Each comes through one
   function: its GLB when template.json "models" lists it (convertible, projector, light1…light4, candy, booth, radio:
   ../_props/<file>.glb), else a stand-in built here to the same contract, so a GLB drops in by listing it.
   The contract (the GLBs' and the stand-ins'): metres, +y up, the front facing +z, the origin at the bottom centre;
   the glTF scene's extras carry "size" ([x, y, z] metres) and "points" ({ name: [x, y, z] } metres, in its own frame):
     convertible  seatL, seatR (the driver's seat is seatL: +x is the car's own left), dash (the dashboard's top middle)
     projector    lens, beamDir (a direction)
     street light lamp
     phone booth  door (the doorway's middle, on the floor), inside (the floor's middle)
   window.NM_DRIVEIN_PROPS(kit) returns { M, convertible(), projector(), streetLight(i), cottonCandy(), phoneBooth(),
   radio() }; each gives { root, size, point(name, out) }: root is scaled to the card (M card widths a metre), and
   point() says where a named point is in root's parent's space, wherever root has been put. */
window.NM_DRIVEIN_PROPS = kit => {
  const { THREE, keep } = kit;
  const M = 1 / 7.5;                                                  // card widths a metre: he is 1.80 m and .24 tall

  /* ── materials and shapes, in metres ── */
  const mats = new Map();
  const mat = (color, o = {}) => {
    const key = `${color}|${o.r ?? .7}|${o.m ?? 0}|${o.e ?? ''}|${o.ei ?? 1}|${o.op ?? 1}|${o.side ?? 0}`;
    if (!mats.has(key)) {
      const m = keep(new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .7, metalness: o.m ?? 0, side: o.side ?? THREE.FrontSide,
        transparent: (o.op ?? 1) < 1, opacity: o.op ?? 1, depthWrite: (o.op ?? 1) >= 1, ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}) }));
      if (o.m || o.env) { m.envMap = kit.env; m.envMapIntensity = o.env ?? 1; }
      mats.set(key, m);
    }
    return mats.get(key);
  };
  const mesh = (geo, m, at = [0, 0, 0], rot) => {
    const x = new THREE.Mesh(keep(geo), m); x.position.set(...at); if (rot) x.rotation.set(...rot);
    x.castShadow = true; x.receiveShadow = true; return x;
  };
  const box = (w, h, d, m, at, rot) => mesh(new THREE.BoxGeometry(w, h, d), m, at, rot);
  const cyl = (rt, rb, h, m, at, rot, seg = 18) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, at, rot);
  const ball = (r, m, at, seg = 14) => mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg * .7 | 0)), m, at);
  /** a box with rounded edges (bodywork, cushions) */
  const softGeo = new Map();
  function soft(w, h, d, r = Math.min(w, h, d) * .25) {
    const key = [w, h, d, r].map(v => v.toFixed(3)).join();
    if (!softGeo.has(key)) {
      const rr = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3), iw = w - 2 * rr, ih = h - 2 * rr;
      const s = new THREE.Shape(); s.moveTo(-iw / 2, -ih / 2); s.lineTo(iw / 2, -ih / 2); s.lineTo(iw / 2, ih / 2); s.lineTo(-iw / 2, ih / 2); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-3, d - 2 * rr), bevelEnabled: true, bevelThickness: rr, bevelSize: rr, bevelSegments: 3, curveSegments: 3 });
      g.center(); softGeo.set(key, keep(g));
    }
    return softGeo.get(key);
  }
  const chrome = mat('#e9edf2', { r: .18, m: .95, env: 1.4 });

  /* ── the stand-ins ── */
  /** a 1960s convertible, pastel blue, brown leather bench seats, fins and whitewalls; the top is down */
  function convertible() {
    const g = new THREE.Group(), paint = mat('#9fc3e8', { r: .28, m: .15, env: 1 }), leather = mat('#c9774e', { r: .55 });
    const tyre = mat('#22202a', { r: .85 }), white = mat('#f4f1ea', { r: .6 }), dark = mat('#3a3346', { r: .6 }), glass = mat('#cfe6ff', { r: .05, op: .22, env: 1.2 });
    const L = 4.7, W = 1.86, BELT = .86, CAB = [-1.0, .52];                // the cabin runs from z -1.0 to .52
    g.add(mesh(soft(W, .42, L, .16), paint, [0, .47, 0]));                // the lower body
    g.add(mesh(soft(W, .3, L / 2 - CAB[1], .12), paint, [0, BELT - .15, (L / 2 + CAB[1]) / 2]));   // the hood
    g.add(mesh(soft(W, .3, L / 2 + CAB[0], .12), paint, [0, BELT - .15, (CAB[0] - L / 2) / 2]));         // the trunk
    for (const s of [1, -1]) {
      g.add(mesh(soft(.1, .3, CAB[1] - CAB[0] + .1, .04), paint, [s * (W / 2 - .05), BELT - .15, (CAB[0] + CAB[1]) / 2]));   // the doors
      const fin = mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.1, 0), new THREE.Vector2(1.25, .2), new THREE.Vector2(.9, .14)]),
        { depth: .08, bevelEnabled: false }), paint, [s * (W / 2 - .12) - .04, BELT - .02, -L / 2 + 1.25], [0, Math.PI / 2, 0]);
      g.add(fin);                                                         // a tail fin
      g.add(mesh(new THREE.CylinderGeometry(.075, .075, .05, 16), mat('#ff3b4f', { r: .3, e: '#ff2236', ei: 1.4 }), [s * (W / 2 - .2), BELT - .1, -L / 2 - .02], [Math.PI / 2, 0, 0]));   // tail lights
      g.add(mesh(new THREE.CylinderGeometry(.11, .11, .05, 18), mat('#fff8e0', { r: .2, e: '#ffe9b0', ei: .8 }), [s * (W / 2 - .3), .6, L / 2 + .01], [Math.PI / 2, 0, 0]));   // headlights
      g.add(box(.05, .03, CAB[1] - CAB[0] + 3.2, chrome, [s * (W / 2 + .005), .6, (CAB[0] + CAB[1]) / 2 + .2]));     // a chrome line along the side
      for (const z of [1.45, -1.5]) {                                     // wheels with whitewalls
        g.add(cyl(.34, .34, .24, tyre, [s * (W / 2 - .2), .34, z], [0, 0, Math.PI / 2], 24));
        g.add(cyl(.2, .2, .245, white, [s * (W / 2 - .2), .34, z], [0, 0, Math.PI / 2], 20));
        g.add(cyl(.11, .11, .25, chrome, [s * (W / 2 - .2), .34, z], [0, 0, Math.PI / 2], 16));
      }
    }
    for (const z of [L / 2 + .04, -L / 2 - .04]) g.add(mesh(soft(W + .06, .12, .1, .04), chrome, [0, .36, z]));   // bumpers
    g.add(box(W - .22, .03, CAB[1] - CAB[0], dark, [0, .23, (CAB[0] + CAB[1]) / 2]));                             // the floor
    g.add(mesh(soft(W - .26, .32, .3, .08), dark, [0, .7, CAB[1] - .06]));                                        // the dashboard
    const wheel = mesh(new THREE.TorusGeometry(.19, .022, 8, 28), white, [.38, .86, CAB[1] - .3], [-.95, 0, 0]); g.add(wheel);   // the steering wheel
    g.add(cyl(.02, .02, .3, dark, [.38, .78, CAB[1] - .2], [.6, 0, 0], 8));
    for (const [z, h] of [[-.2, .45], [-.88, .43]]) {                     // a front and a back bench, leather, piped
      g.add(mesh(soft(W - .3, .16, .52, .07), leather, [0, h - .08, z]));
      g.add(mesh(soft(W - .3, .5, .14, .06), leather, [0, h + .2, z - .3], [-.12, 0, 0]));
    }
    const shield = new THREE.Group(); shield.position.set(0, BELT, CAB[1] - .02); shield.rotation.x = -.42; g.add(shield);   // the windshield, raked back
    shield.add(box(W - .2, .44, .012, glass, [0, .22, 0]));
    for (const s of [1, -1]) shield.add(box(.035, .46, .035, chrome, [s * (W / 2 - .1), .22, 0]));
    shield.add(box(W - .16, .035, .035, chrome, [0, .45, 0]));
    g.userData.size = [W, 1.3, L];
    g.userData.points = { seatL: [.36, .45, -.2], seatR: [-.36, .45, -.2], dash: [0, .86, CAB[1] - .1] };
    return g;
  }

  /** a projector on its own: a green-grey body, two reels on arms, the lens to the front */
  function projector() {
    const g = new THREE.Group(), body = mat('#4f6b5e', { r: .45, m: .4, env: .8 }), black = mat('#1f1d24', { r: .5, m: .3 });
    g.add(mesh(soft(.32, .34, .52, .05), body, [0, .2, 0]), mesh(soft(.22, .2, .24, .04), body, [0, .2, -.34]));
    g.add(cyl(.065, .075, .2, black, [0, .22, .34], [Math.PI / 2, 0, 0]), cyl(.05, .05, .02, mat('#9fd0ff', { r: .05, e: '#cfe8ff', ei: .6 }), [0, .22, .445], [Math.PI / 2, 0, 0]));
    for (const z of [.2, -.2]) {
      g.add(box(.03, .26, .03, black, [0, .45, z * .7]));
      const reel = cyl(.19, .19, .045, mat('#b8bcc6', { r: .3, m: .8, env: 1 }), [0, .6, z], [0, 0, Math.PI / 2], 28); g.add(reel);
      g.add(cyl(.12, .12, .05, mat('#2b2834', { r: .7 }), [0, .6, z], [0, 0, Math.PI / 2], 20));
    }
    g.userData.size = [.34, .8, .9];
    g.userData.points = { lens: [0, .22, .46], beamDir: [0, 0, 1] };
    return g;
  }

  /** a cast-iron street light: a fluted pole, an arm over the lot, a lantern */
  function streetLight() {
    const g = new THREE.Group(), iron = mat('#2f3340', { r: .45, m: .55, env: .7 });
    g.add(cyl(.16, .2, .4, iron, [0, .2, 0], null, 12), cyl(.06, .09, 3.6, iron, [0, 2.2, 0], null, 10), ball(.1, iron, [0, 4.02, 0], 10));
    const arm = mesh(new THREE.TorusGeometry(.26, .03, 6, 16, Math.PI * .6), iron, [0, 3.82, .26], [0, Math.PI / 2, Math.PI * .2]); g.add(arm);
    g.add(cyl(.05, .22, .22, iron, [0, 3.88, .5], null, 14), cyl(.12, .12, .24, mat('#fff1c8', { r: .3, e: '#ffc56b', ei: 1.6 }), [0, 3.66, .5], null, 14));
    g.userData.size = [.4, 4.1, .8];
    g.userData.points = { lamp: [0, 3.62, .5] };
    return g;
  }

  /** cotton candy on a paper cone: a pink cloud */
  function cottonCandy() {
    const g = new THREE.Group(), pink = mat('#ffb3d1', { r: 1, e: '#ff9fc4', ei: .12 });
    g.add(cyl(.035, .006, .22, mat('#fff4e2', { r: .8 }), [0, .11, 0], null, 12));
    for (const [x, y, z, r] of [[0, .32, 0, .11], [.06, .3, .03, .08], [-.06, .31, -.02, .085], [.01, .4, .02, .075], [-.02, .27, .07, .07]]) g.add(ball(r, pink, [x, y, z], 12));
    g.userData.size = [.25, .48, .22];
    return g;
  }

  /** a red booth with windows on three sides, a door at the front and a lit sign under its roof */
  function phoneBooth() {
    const g = new THREE.Group(), red = mat('#e0475c', { r: .45, m: .1, env: .6 }), glass = mat('#d8ecff', { r: .05, op: .16, env: 1 });
    const W = 1, H = 2.45;
    g.add(box(W + .1, .1, W + .1, red, [0, .05, 0]), mesh(soft(W + .12, .16, W + .12, .05), red, [0, H - .02, 0]), mesh(soft(W - .1, .12, W - .1, .05), red, [0, H + .1, 0]));
    for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(box(.08, H - .1, .08, red, [x * W / 2, H / 2, z * W / 2]));
    g.add(box(W - .08, .18, W - .08, mat('#fff4ea', { r: .5, e: '#fff1d6', ei: .7 }), [0, H - .2, 0]));   // the sign band
    for (const [x, z, ry] of [[0, -W / 2, 0], [-W / 2, 0, Math.PI / 2], [W / 2, 0, Math.PI / 2], [0, W / 2 - .02, 0]]) {
      const pane = new THREE.Group(); pane.position.set(x, 0, z); pane.rotation.y = ry; g.add(pane);
      pane.add(box(W - .1, H - .55, .01, glass, [0, (H - .3) / 2 + .1, 0]));
      for (let k = 1; k < 3; k++) pane.add(box(.03, H - .55, .03, red, [-(W - .1) / 2 + k * (W - .1) / 3, (H - .3) / 2 + .1, 0]));
      for (let k = 1; k < 6; k++) pane.add(box(W - .1, .03, .03, red, [0, .35 + k * (H - .65) / 6, 0]));
      pane.add(box(W - .1, .3, .04, red, [0, .25, 0]));
    }
    g.userData.size = [W + .12, H + .16, W + .12];
    g.userData.points = { door: [0, 0, W / 2], inside: [0, 0, 0] };
    return g;
  }

  /** a cream radio: a speaker cloth, a dial and two knobs */
  function radio() {
    const g = new THREE.Group();
    g.add(mesh(soft(.32, .2, .13, .04), mat('#f2e2c4', { r: .45 }), [0, .1, 0]));
    g.add(box(.15, .11, .01, mat('#b9905e', { r: .9 }), [-.06, .1, .066]), box(.09, .05, .01, mat('#ffe6a8', { r: .3, e: '#ffcf7a', ei: .5 }), [.09, .13, .066]));
    for (const x of [.06, .12]) g.add(cyl(.018, .018, .02, mat('#7a4a2e', { r: .4 }), [x, .06, .07], [Math.PI / 2, 0, 0], 12));
    g.userData.size = [.32, .2, .13];
    return g;
  }

  /* ── one function per prop: the GLB when it is listed, else the stand-in ── */
  const vP = new THREE.Vector3();
  function prop(name, make) {
    const m = kit.model(name), root = new THREE.Group(); root.name = `prop-${name}`; root.scale.setScalar(M);
    let size, points, extras, inner;
    if (m.scene) {
      root.add(m.root); inner = m.scene;
      m.scene.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
      extras = m.scene.userData || {};
    } else {
      inner = make(); root.add(inner); extras = inner.userData || {};
    }
    size = extras.size; points = extras.points || {};
    return {
      root, size: (size || [1, 1, 1]).map(v => v * M), glb: !!m.scene, extras,
      /** a named part (a wheel, a reel, the lamp), or null */
      part: n => inner.getObjectByName(n) || null,
      /** a named point in root's parent's space (null when the prop has none) */
      point(n, out = new THREE.Vector3()) {
        const p = points[n]; if (!p) return null;
        root.updateMatrix(); return out.set(p[0], p[1], p[2]).applyMatrix4(root.matrix);
      },
      /** a named direction (beamDir) in root's parent's space */
      dir(n, out = new THREE.Vector3()) {
        const p = points[n]; if (!p) return null;
        return out.set(p[0], p[1], p[2]).applyQuaternion(root.quaternion).normalize();
      },
      has: n => !!points[n],
      local: (n, out = vP) => (points[n] ? out.set(...points[n]) : null)
    };
  }

  return {
    M,
    convertible: () => prop('convertible', convertible),
    projector: () => prop('projector', projector),
    streetLight: i => prop(`light${i + 1}`, streetLight),
    cottonCandy: () => prop('candy', cottonCandy),
    phoneBooth: () => prop('booth', phoneBooth),
    radio: () => prop('radio', radio)
  };
};
