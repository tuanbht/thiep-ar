/* Hai Đứa Mình — The Series: the set, built for story.js (template.json "story": ["set.js", "story.js"]).
   A round revolving stage in the middle of the card, split by three walls into three rooms that open outwards: Phòng
   khách (living room), Bếp (kitchen), Góc cửa sổ (window nook). The room in play faces the phone; its two walls meet at the
   stage's centre like an isometric room, so both lean towards the viewer and what hangs on them is easy to see. Around it
   the studio: a lighting truss at the back with the "ĐANG QUAY" light and the "VỖ TAY" box, a camera on a tripod and the
   director's chair in front, the clapperboard that opens each episode, and the film wheel of the finale.
   window.NM_SITCOM_SET(kit) builds it all and returns what the story moves. Units: card widths, +y up, the act faces +z
   (the card's bottom edge). A room's own space: its corner at the stage's centre, its opening towards +z, its left wall
   along 60 degrees to the left of +z and its right wall 60 degrees to the right. */
window.NM_SITCOM_SET = kit => {
  const { THREE, stage, keep } = kit;
  const R = .355, BASE = .03, WALL = .33, T = .012, CENTER_Z = -.035;
  const S60 = Math.sin(Math.PI / 3), C60 = .5, D30 = Math.PI / 6;
  const ROOMS = { living: 0, kitchen: 2 * Math.PI / 3, nook: -2 * Math.PI / 3 };   // where each room faces on the turntable
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  /* ── materials and shapes ── */
  const mats = new Map();
  const mat = (color, o = {}) => {
    const key = `${color}|${o.r ?? .8}|${o.m ?? 0}|${o.e ?? ''}|${o.phys ? 1 : 0}`;
    if (!mats.has(key)) {
      const M = o.phys ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
      const m = keep(new M({ color, roughness: o.r ?? .8, metalness: o.m ?? 0, ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}),
        ...(o.phys ? { sheen: 1, sheenColor: new THREE.Color(o.sheen ?? '#ffc2d4'), sheenRoughness: .45 } : {}) }));
      if (o.m) { m.envMap = kit.env; m.envMapIntensity = .8; }
      mats.set(key, m);
    }
    return mats.get(key);
  };
  const own = (color, o = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .6, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0 }));
  /** a box with soft, rounded edges, like a clay toy */
  const softGeo = new Map();
  function soft(w, h, d, r = Math.min(w, h, d) * .22) {
    const key = [w, h, d, r].map(v => v.toFixed(4)).join();
    if (!softGeo.has(key)) {
      const rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4), iw = w - 2 * rr, ih = h - 2 * rr, k = Math.min(iw, ih) * .15;
      const s = new THREE.Shape(), x0 = -iw / 2, y0 = -ih / 2;
      s.moveTo(x0 + k, y0); s.lineTo(x0 + iw - k, y0); s.quadraticCurveTo(x0 + iw, y0, x0 + iw, y0 + k); s.lineTo(x0 + iw, y0 + ih - k);
      s.quadraticCurveTo(x0 + iw, y0 + ih, x0 + iw - k, y0 + ih); s.lineTo(x0 + k, y0 + ih); s.quadraticCurveTo(x0, y0 + ih, x0, y0 + ih - k);
      s.lineTo(x0, y0 + k); s.quadraticCurveTo(x0, y0, x0 + k, y0);
      const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-4, d - 2 * rr), bevelEnabled: true, bevelThickness: rr, bevelSize: rr, bevelSegments: 3, curveSegments: 4 });
      g.center(); softGeo.set(key, keep(g));
    }
    return softGeo.get(key);
  }
  const mesh = (geo, m, at = [0, 0, 0], shadow = true) => {
    const x = new THREE.Mesh(geo, m); x.position.set(...at); x.castShadow = shadow; x.receiveShadow = true; return x;
  };
  const box = (w, h, d, m, at) => mesh(keep(new THREE.BoxGeometry(w, h, d)), m, at);
  const cyl = (rt, rb, h, m, at, seg = 16) => mesh(keep(new THREE.CylinderGeometry(rt, rb, h, seg)), m, at);
  const ball = (r, m, at, seg = 12) => mesh(keep(new THREE.SphereGeometry(r, seg, Math.max(6, seg * .75 | 0))), m, at);
  const tex = (w, h, draw, o = {}) => {
    const t = kit.canvasTexture(w, h, draw);
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.repeat); }
    return t;
  };

  /** a spot on a room's wall, in the room's own space: r along the wall from the corner, h up, out from its surface; ry
      turns a thing to face out of that wall */
  const onWall = (side, r, h = 0, out = 0) => {
    const o = out + T / 2;
    return side < 0 ? { x: -S60 * r + .5 * o, y: h, z: C60 * r + S60 * o, ry: D30 } : { x: S60 * r - .5 * o, y: h, z: C60 * r + S60 * o, ry: -D30 };
  };
  const put = (o, p, turn = 0) => { o.position.set(p.x, p.y, p.z); o.rotation.y = p.ry + turn; return o; };

  /* ── the revolving stage ── */
  const turntable = new THREE.Group(); turntable.position.set(0, 0, CENTER_Z); stage.add(turntable);
  const film = tex(1024, 64, (c, w, h) => {                            // its rim: a strip of film
    c.fillStyle = '#1d1720'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f7ead8'; for (let x = 6; x < w; x += 28) { c.fillRect(x, 6, 14, 10); c.fillRect(x, h - 16, 14, 10); }
    c.fillStyle = '#f4b9c9'; for (let x = 10; x < w; x += 128) c.fillRect(x, 22, 112, 20);
  }, { repeat: [7, 1] });
  const rim = mesh(keep(new THREE.CylinderGeometry(R + .012, R + .018, BASE, 72, 1, false)),
    [own('#ffffff', { r: .55 }), mat('#f3e2cf', { r: .7 }), mat('#f3e2cf', { r: .7 })], [0, BASE / 2, 0]);
  rim.material[0].map = film; rim.material[0].needsUpdate = true;
  turntable.add(rim);

  const wallpaper = {
    living: tex(512, 512, (c, w, h) => {                               // pink with small dots over a darker wainscot
      c.fillStyle = '#f6c9d6'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.55)'; for (let y = 18; y < h * .66; y += 36) for (let x = (y / 36 % 2) * 18 + 9; x < w; x += 36) { c.beginPath(); c.arc(x, y, 3.2, 0, 7); c.fill(); }
      c.fillStyle = '#e9aabd'; c.fillRect(0, h * .7, w, h * .3); c.fillStyle = '#fff4e6'; c.fillRect(0, h * .69, w, 9);
      c.strokeStyle = 'rgba(160,70,100,.18)'; c.lineWidth = 3; for (let x = 32; x < w; x += 64) c.strokeRect(x - 26, h * .74, 52, h * .2);
    }),
    kitchen: tex(512, 512, (c, w, h) => {                              // mint above, white tiles below
      c.fillStyle = '#bfe6d8'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#f5fbf8'; c.fillRect(0, h * .5, w, h * .5);
      c.strokeStyle = '#a9d4c4'; c.lineWidth = 3;
      for (let y = h * .5; y <= h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      for (let x = 0; x <= w; x += 32) { c.beginPath(); c.moveTo(x, h * .5); c.lineTo(x, h); c.stroke(); }
    }),
    nook: tex(512, 512, (c, w, h) => {                                 // lilac with little stars
      c.fillStyle = '#e3d3ee'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.6)';
      for (let y = 20; y < h; y += 46) for (let x = (y / 46 % 2) * 23 + 12; x < w; x += 46) {
        c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.5 : 6, a = -Math.PI / 2 + i * Math.PI / 5; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } c.fill();
      }
      c.fillStyle = '#d2bde3'; c.fillRect(0, h * .78, w, h * .22);
    })
  };
  /* walls and floors light themselves a little, so a room stays its own colour whichever way it faces the sun */
  const wallMat = Object.fromEntries(Object.entries(wallpaper).map(([k, t]) => [k, keep(new THREE.MeshStandardMaterial({ map: t, roughness: .92,
    emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .2 }))]));
  const trim = mat('#f1dcc4', { r: .6 });
  /* the three walls, each an arm from the centre; its two faces belong to the rooms on either side */
  for (const [deg, px, nx] of [[60, 'kitchen', 'living'], [180, 'nook', 'kitchen'], [-60, 'living', 'nook']]) {
    const a = deg * Math.PI / 180;
    const w = box(T, WALL, R, [wallMat[px], wallMat[nx], trim, trim, trim, trim], [Math.sin(a) * R / 2, BASE + WALL / 2, Math.cos(a) * R / 2]);
    w.rotation.y = a; turntable.add(w);
    const cap = box(T + .008, .012, R + .004, trim, [Math.sin(a) * R / 2, BASE + WALL + .006, Math.cos(a) * R / 2]); cap.rotation.y = a; turntable.add(cap);
  }
  const floorTex = {
    living: tex(512, 512, (c, w, h) => {                               // light planks
      c.fillStyle = '#ecd2ae'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 40) {
        c.fillStyle = (y / 40) % 2 ? '#e6c79f' : '#efd7b6'; c.fillRect(0, y, w, 38);
        c.fillStyle = 'rgba(120,80,40,.25)'; c.fillRect(0, y + 38, w, 2); c.fillRect(((y * 7) % 300) + 60, y, 2, 38);
      }
    }),
    kitchen: tex(512, 512, (c, w, h) => {                              // checks
      for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { c.fillStyle = (x + y) / 64 % 2 ? '#fff4e6' : '#f4b9c9'; c.fillRect(x, y, 64, 64); }
    }),
    nook: tex(512, 512, (c, w, h) => {                                 // soft carpet
      c.fillStyle = '#d9c4e6'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 2200; i++) { c.fillStyle = `rgba(255,255,255,${.05 + (i % 7) * .015})`; c.fillRect((i * 97) % w, (i * 61) % h, 3, 3); }
    })
  };
  for (const [name, phi] of Object.entries(ROOMS)) {
    const f = mesh(keep(new THREE.CircleGeometry(R, 24, phi - 5 * Math.PI / 6, 2 * Math.PI / 3)),
      keep(new THREE.MeshStandardMaterial({ map: floorTex[name], roughness: .85, emissive: 0xffffff, emissiveMap: floorTex[name], emissiveIntensity: .12 })), [0, BASE + .0005, 0], false);
    f.rotation.x = -Math.PI / 2; turntable.add(f);
  }
  const rooms = Object.fromEntries(Object.entries(ROOMS).map(([name, phi]) => {
    const g = new THREE.Group(); g.position.y = BASE; g.rotation.y = phi; g.name = name; turntable.add(g); return [name, g];
  }));
  /** a point in a room's own space, in the turntable's: for placing the two of them, who stand on the turntable */
  const inRoom = (name, x, z) => {
    const a = ROOMS[name]; return { x: x * Math.cos(a) + z * Math.sin(a), z: -x * Math.sin(a) + z * Math.cos(a), ry: a };
  };

  /* ── the living room: the door, a wall of frames, the TV, the sofa ── */
  const L = rooms.living;
  const wood = mat('#c98f5c', { r: .55 }), woodLight = mat('#e2b98c', { r: .6 }), cream = mat('#fff4e6', { r: .7 });
  const doorway = box(.104, .21, .002, mat('#3b2a4a', { r: 1 }), [0, 0, 0]); put(doorway, onWall(-1, .275, .105, .001)); L.add(doorway);
  for (const [r, h, w, hh] of [[.22, .107, .012, .218], [.33, .107, .012, .218], [.275, .218, .12, .014]]) {
    const t = box(w, hh, .01, woodLight, [0, 0, 0]); put(t, onWall(-1, r, h, .005)); L.add(t);
  }
  const doorHinge = new THREE.Group(); put(doorHinge, onWall(-1, .225, 0, .008)); L.add(doorHinge);   // hinged on the corner's side
  const doorTex = tex(128, 256, (c, w, h) => {
    c.fillStyle = '#e7a9bb'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c97f97'; c.lineWidth = 6; c.strokeRect(18, 18, w - 36, h * .42); c.strokeRect(18, h * .52, w - 36, h * .42);
  });
  const doorSlab = box(.1, .205, .01, [mat('#d993a8'), mat('#d993a8'), mat('#d993a8'), mat('#d993a8'),
    keep(new THREE.MeshStandardMaterial({ map: doorTex, roughness: .7 })), keep(new THREE.MeshStandardMaterial({ map: doorTex, roughness: .7 }))], [-.05, .1025, 0]);
  const knob = ball(.006, mat('#f2c14e', { r: .3, m: .6 }), [-.088, .1, .008]);
  doorHinge.add(doorSlab, knob);
  const door = { hinge: doorHinge, open: k => { doorHinge.rotation.y = D30 + 1.45 * k; } };

  const lampLight = new THREE.PointLight(0xffc27a, 0, .9, 1.6);
  const tvLight = new THREE.PointLight(0xb9d4ff, 0, .7, 1.8);
  const frames = [
    kit.photo({ frame: 'wood', width: .075, aspect: 1.25, slot: 1, of: 12 }),
    kit.photo({ frame: 'wood', width: .092, aspect: .75, slot: 2, of: 12 }),
    kit.photo({ frame: 'white', width: .068, aspect: 1, slot: 3, of: 12 })
  ];
  put(frames[0].root, onWall(-1, .09, .22, .006)); put(frames[1].root, onWall(-1, .175, .255, .006)); put(frames[2].root, onWall(-1, .17, .16, .006));
  frames[0].root.rotation.z = .03; frames[2].root.rotation.z = -.05;
  frames.forEach(f => L.add(f.root));
  const tv = kit.photo({ frame: 'screen', width: .2, aspect: .5625, slot: 0, of: 12, glow: .8 });
  put(tv.root, onWall(1, .2, .19, .009)); L.add(tv.root);
  const tvCabinet = mesh(soft(.19, .05, .05, .008), wood); put(tvCabinet, onWall(1, .2, .025, .03)); L.add(tvCabinet);
  for (const r of [.13, .27]) { const k = mesh(soft(.05, .006, .03, .002), woodLight); put(k, onWall(1, r, .052, .03)); }
  const plantAt = (parent, p, s = 1) => {                              // a pot with a round little plant
    const g = new THREE.Group(); put(g, p); parent.add(g);
    g.add(cyl(.016 * s, .012 * s, .026 * s, mat('#f08fa8'), [0, .013 * s, 0]));
    for (const [x, y, z, r] of [[0, .045, 0, .02], [.012, .036, .006, .014], [-.011, .038, -.004, .015], [0, .06, .004, .012]])
      g.add(ball(r * s, mat('#7cc49a', { r: .9 }), [x * s, y * s, z * s], 10));
    return g;
  };
  plantAt(L, onWall(1, .3, .05, .03), .85);

  const velvet = mat('#d9577a', { r: .85, phys: true, sheen: '#ffb3c6' });
  const sofa = new THREE.Group(); sofa.position.set(.083, 0, .256); sofa.rotation.y = 5 * Math.PI / 6; L.add(sofa);   // facing the TV
  sofa.add(mesh(soft(.2, .05, .084, .012), velvet, [0, .036, 0]));
  sofa.add(mesh(soft(.2, .085, .03, .012), velvet, [0, .085, -.032]));
  for (const x of [-.104, .104]) sofa.add(mesh(soft(.028, .062, .084, .01), velvet, [x, .055, 0]));
  for (const x of [-.048, .048]) sofa.add(mesh(soft(.094, .018, .07, .008), mat('#e8768f', { r: .9, phys: true, sheen: '#ffd0dc' }), [x, .062, .006]));   // seat top .071: where the chair clips sit them
  for (const x of [-.09, .09]) for (const z of [-.035, .035]) sofa.add(cyl(.004, .003, .012, wood, [x, .006, z], 8));
  const table = new THREE.Group(); put(table, onWall(1, .2, 0, .085)); L.add(table);
  table.add(cyl(.03, .03, .007, woodLight, [0, .042, 0], 24), cyl(.005, .008, .04, wood, [0, .02, 0], 10), cyl(.016, .016, .004, wood, [0, .002, 0], 16));
  const bowl = new THREE.Group(); bowl.position.set(.01, .046, -.005); table.add(bowl);
  bowl.add(cyl(.014, .01, .012, mat('#e5484d', { r: .6 }), [0, .006, 0], 14));
  for (let i = 0; i < 7; i++) bowl.add(ball(.0045, mat('#fff8e7', { r: .9 }), [Math.cos(i * 2.4) * .007, .013 + (i % 3) * .002, Math.sin(i * 2.4) * .007], 6));
  const remote = box(.026, .005, .009, mat('#3a3341', { r: .5 }), [-.012, .048, .008]); remote.rotation.y = .4; table.add(remote);
  const rug = mesh(keep(new THREE.CircleGeometry(.105, 32)), keep(new THREE.MeshStandardMaterial({ roughness: 1, map: tex(256, 256, (c, w) => {
    for (let i = 6; i > 0; i--) { c.fillStyle = i % 2 ? '#fff4e6' : '#f6c9d6'; c.beginPath(); c.arc(w / 2, w / 2, w / 2 * i / 6, 0, 7); c.fill(); }
  }) })), [.1, .001, .2], false);
  rug.rotation.x = -Math.PI / 2; L.add(rug);
  const floorLamp = new THREE.Group(); put(floorLamp, onWall(-1, .045, 0, .035)); L.add(floorLamp);
  const shadeMat = mat('#fff4e6', { r: .8, e: '#ffcf8a', ei: 0 });
  floorLamp.add(cyl(.016, .018, .006, wood, [0, .003, 0]), cyl(.0025, .0025, .23, mat('#3b2a4a', { r: .4, m: .4 }), [0, .118, 0], 8),
    mesh(keep(new THREE.CylinderGeometry(.018, .028, .035, 18, 1, true)), shadeMat, [0, .232, 0]));
  const lampGlow = kit.glow({ color: 0xffc879, size: .14, opacity: 0 }); lampGlow.position.set(0, .225, 0); floorLamp.add(lampGlow);
  lampLight.position.set(0, .22, .02); floorLamp.add(lampLight);
  tvLight.position.set(0, 0, .06); tv.root.add(tvLight);

  /* ── the kitchen: a counter and a stove on the left, the fridge and a calendar on the right ── */
  const K = rooms.kitchen;
  const counter = mesh(soft(.25, .085, .062, .008), cream); put(counter, onWall(-1, .185, .0425, .033)); K.add(counter);
  const top = box(.258, .008, .068, mat('#f4b9c9', { r: .4 }), [0, 0, 0]); put(top, onWall(-1, .185, .089, .036)); K.add(top);
  for (const r of [.1, .19, .27]) { const h = mesh(soft(.03, .005, .006, .002), mat('#7cc49a', { r: .4 })); put(h, onWall(-1, r, .072, .066)); K.add(h); }
  const stoveTop = mesh(soft(.075, .004, .055, .002), mat('#2e2834', { r: .35 })); put(stoveTop, onWall(-1, .205, .095, .036)); K.add(stoveTop);
  for (const dr of [-.018, .018]) {
    const ring = mesh(keep(new THREE.TorusGeometry(.011, .0018, 6, 18)), mat('#56505c', { r: .4 })); ring.rotation.x = Math.PI / 2;
    const p = onWall(-1, .205 + dr, .098, .036); ring.position.set(p.x, p.y, p.z); K.add(ring);
  }
  const pan = new THREE.Group(); put(pan, onWall(-1, .187, .099, .042)); K.add(pan);
  pan.add(cyl(.019, .016, .007, mat('#3a3341', { r: .35, m: .5 }), [0, .0035, 0], 20), box(.032, .004, .007, mat('#c98f5c'), [0, .005, .03]));
  pan.children[1].rotation.y = Math.PI / 2;
  const egg = new THREE.Group(); egg.position.y = .008; pan.add(egg);
  egg.add(mesh(keep(new THREE.CircleGeometry(.011, 16)), mat('#ffffff', { r: .6 }), [0, 0, 0], false), ball(.005, mat('#ffc23d', { r: .4 }), [.001, .002, 0], 10));
  egg.children[0].rotation.x = -Math.PI / 2;
  const shelf = box(.12, .006, .03, woodLight, [0, 0, 0]); put(shelf, onWall(-1, .12, .225, .015)); K.add(shelf);
  ['#f6c9d6', '#ffd27a', '#bfe6d8'].forEach((cl, i) => {
    const p = onWall(-1, .085 + i * .035, .242, .016), j = new THREE.Group(); j.position.set(p.x, p.y, p.z); K.add(j);
    j.add(cyl(.009, .009, .026, mat('#ffffff', { r: .2 }), [0, 0, 0], 12), cyl(.0095, .0095, .006, mat(cl, { r: .5 }), [0, .016, 0], 12));
  });
  const alarm = new THREE.Group(); put(alarm, onWall(-1, .205, .3, .004)); K.add(alarm);
  const alarmBody = cyl(.013, .013, .006, mat('#ffffff', { r: .5 }), [0, 0, 0], 18); alarmBody.rotation.x = Math.PI / 2; alarm.add(alarmBody);
  const alarmLed = ball(.0028, own('#ff3b3b', { e: 0xff2020, ei: 0 }), [.006, -.005, .004], 8); alarm.add(alarmLed);
  const alarmGlow = kit.glow({ color: 0xff3030, size: .07, opacity: 0 }); alarmGlow.position.set(.006, -.005, .008); alarm.add(alarmGlow);
  const fridge = new THREE.Group(); put(fridge, onWall(1, .105, 0, .037)); K.add(fridge);
  fridge.add(mesh(soft(.095, .215, .072, .014), mat('#fff0f3', { r: .35 }), [0, .1075, 0]),
    box(.09, .0025, .002, mat('#e9b7c4'), [0, .145, .0365]), box(.006, .05, .008, mat('#e5809c', { r: .3 }), [-.036, .175, .04]),
    box(.006, .04, .008, mat('#e5809c', { r: .3 }), [-.036, .1, .04]));
  const prints = [kit.photo({ frame: 'white', width: .046, aspect: 1.15, slot: 4, of: 12 }), kit.photo({ frame: 'white', width: .048, aspect: .85, slot: 5, of: 12 })];
  prints[0].root.position.set(.012, .18, .039); prints[0].root.rotation.z = .07;
  prints[1].root.position.set(.006, .1, .039); prints[1].root.rotation.z = -.06;
  prints.forEach((p, i) => {
    fridge.add(p.root);
    p.root.add(cyl(.005, .005, .004, mat(['#ff6f91', '#ffd27a'][i], { r: .4 }), [0, p.height / 2 - .004, .004], 12));
    p.root.children[1].rotation.x = Math.PI / 2;
  });
  const calendar = new THREE.Group(); put(calendar, onWall(1, .27, .2, .004)); K.add(calendar);
  calendar.add(box(.07, .1, .003, [cream, cream, cream, cream, keep(new THREE.MeshStandardMaterial({ roughness: .8, map: tex(140, 200, (c, w, h) => {
    c.fillStyle = '#fffaf3'; c.fillRect(0, 0, w, h); c.fillStyle = '#e5484d'; c.fillRect(0, 0, w, 22);
    c.fillStyle = '#fff'; c.font = `700 14px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('THÁNG 10', w / 2, 12);
    c.fillStyle = '#7b5a6a'; for (let i = 0; i < 28; i++) c.fillRect(12 + (i % 7) * 17, 132 + (i / 7 | 0) * 16, 10, 8);
    c.strokeStyle = '#e5484d'; c.lineWidth = 2.5; c.beginPath(); c.arc(12 + 3 * 17 + 5, 132 + 2 * 16 + 4, 9, 0, 7); c.stroke();
  }) })), cream], [0, 0, 0]));
  const calPhoto = kit.photo({ frame: 'none', width: .058, aspect: .62, slot: 6, of: 12 }); calPhoto.root.position.set(0, .011, .002); calendar.add(calPhoto.root);
  const fruit = new THREE.Group(); put(fruit, onWall(-1, .29, .093, .036)); K.add(fruit);
  fruit.add(cyl(.016, .01, .008, mat('#ffffff', { r: .3 }), [0, .004, 0], 16));
  [['#ff8a3d', .006, 0], ['#e5484d', -.007, .003], ['#9ccc65', .001, -.007]].forEach(([cl, x, z]) => fruit.add(ball(.0075, mat(cl, { r: .5 }), [x, .012, z], 10)));

  /* ── the window nook: the city through a glass door on the left, string lights with photos on the right ── */
  const N = rooms.nook;
  const city = tex(440, 480, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#2a1f45'); sky.addColorStop(.6, '#5b3f6e'); sky.addColorStop(1, '#c46f8f');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff6d8'; for (let i = 0; i < 40; i++) c.fillRect((i * 131) % w, (i * 53) % (h * .45), 2, 2);
    c.fillStyle = '#ffe9b0'; c.beginPath(); c.arc(w * .76, h * .17, 22, 0, 7); c.fill();
    const towers = [[0, .58, 60], [55, .5, 52], [100, .62, 46], [140, .44, 64], [200, .56, 50], [245, .4, 58], [300, .52, 54], [350, .46, 62], [405, .6, 40]];
    for (const [x, top, wd] of towers) {
      c.fillStyle = '#3b2a4a'; c.fillRect(x, h * top, wd, h);
      for (let y = h * top + 10; y < h - 10; y += 16) for (let wx = x + 7; wx < x + wd - 8; wx += 13)
        if (((wx * 7 + y * 3) | 0) % 5 < 3) { c.fillStyle = ((wx + y) | 0) % 3 ? '#ffd27a' : '#ffb3c6'; c.fillRect(wx, y, 6, 8); }
    }
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14); c.fillRect(0, 0, 14, h); c.fillRect(w - 14, 0, 14, h);
    c.fillRect(w / 2 - 6, 0, 12, h); c.fillRect(0, h * .55, w, 10);
  });
  const glassDoor = mesh(keep(new THREE.PlaneGeometry(.22, .24)), keep(new THREE.MeshBasicMaterial({ map: city, toneMapped: false })), [0, 0, 0], false);
  put(glassDoor, onWall(-1, .2, .155, .003)); N.add(glassDoor);
  const sill = box(.236, .008, .02, cream, [0, 0, 0]); put(sill, onWall(-1, .2, .032, .01)); N.add(sill);
  for (const r of [.075, .325]) { const d = mesh(soft(.03, .25, .012, .005), mat('#f39ab6', { r: .95, phys: true })); put(d, onWall(-1, r, .16, .012)); N.add(d); }
  const wireAt = t => onWall(1, .035 + .3 * t, .292 - .065 * 4 * t * (1 - t), .012);
  const wirePts = Array.from({ length: 13 }, (_, i) => { const p = wireAt(i / 12); return new THREE.Vector3(p.x, p.y, p.z); });
  N.add(mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wirePts), 40, .0013, 4)), mat('#3b2a4a', { r: .6 }), [0, 0, 0], false));
  const bulbs = Array.from({ length: 9 }, (_, i) => {
    const p = wireAt(.06 + i * .11), m = own('#fff1c9', { e: 0xffc15a, ei: 0 });
    const b = ball(.0055, m, [p.x, p.y - .006, p.z], 10); N.add(b);
    const g = kit.glow({ color: 0xffcf7a, size: .05, opacity: 0 }); g.position.set(p.x, p.y - .006, p.z + .002); N.add(g);
    return { mesh: b, glow: g, set(k) { m.emissiveIntensity = 2.2 * k; g.material.opacity = .9 * k; } };
  });
  const strung = [0, 1, 2, 3].map(i => {
    const t = .17 + i * .22, p = wireAt(t), ph = kit.photo({ frame: 'white', width: .062, aspect: 1, slot: 7 + i, of: 12, glow: .35 });
    const hang = new THREE.Group(); hang.position.set(p.x, p.y - .004, p.z + .004); hang.rotation.y = p.ry; N.add(hang);
    ph.root.position.y = -ph.height / 2; ph.root.rotation.z = (i % 2 ? -1 : 1) * .06; hang.add(ph.root);
    hang.add(box(.006, .014, .005, mat('#e2b98c'), [0, -.002, .003]));
    return { hang, photo: ph };
  });
  const beanbag = ball(.06, mat('#f39ab6', { r: .95, phys: true }), [.06, .03, .2], 18); beanbag.scale.set(1, .62, .95); N.add(beanbag);
  const shag = mesh(keep(new THREE.CircleGeometry(.1, 28)), mat('#cdb4e3', { r: 1 }), [0, .001, .21], false); shag.rotation.x = -Math.PI / 2; N.add(shag);
  plantAt(N, { x: 0, y: 0, z: .045, ry: 0 }, 1.1);

  /* ── the studio around the stage ── */
  const steel = mat('#3b2a4a', { r: .4, m: .5 });
  const studio = new THREE.Group(); stage.add(studio);
  for (const x of [-.47, .47]) studio.add(cyl(.007, .009, .62, steel, [x, .31, -.31], 10), cyl(.03, .034, .01, steel, [x, .005, -.31], 16));
  const bar = cyl(.007, .007, .96, steel, [0, .62, -.31], 10); bar.rotation.z = Math.PI / 2; studio.add(bar);
  const spots = [-.27, 0, .27].map(x => {
    const g = new THREE.Group(); g.position.set(x, .605, -.31); studio.add(g);   // aimed at the room in play, in the act's own space
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(x * .3, .12, CENTER_Z + .08).sub(g.position).normalize());
    const body = cyl(.02, .016, .045, steel, [0, 0, .01], 14); body.rotation.x = Math.PI / 2; g.add(body);
    const lens = own('#fff8e7', { e: 0xfff1cf, ei: 0 }); const l = mesh(keep(new THREE.CircleGeometry(.017, 18)), lens, [0, 0, .0335], false); g.add(l);
    const glow = kit.glow({ color: 0xfff0d0, size: .1, opacity: 0 }); glow.position.z = .04; g.add(glow);
    const cone = mesh(keep(new THREE.ConeGeometry(.12, .55, 24, 1, true)), keep(new THREE.MeshBasicMaterial({ color: 0xfff4e0, transparent: true, opacity: 0,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })), [0, 0, .3], false);
    cone.rotation.x = -Math.PI / 2; cone.renderOrder = 2; g.add(cone);
    return { set(k) { lens.emissiveIntensity = 2 * k; glow.material.opacity = .8 * k; cone.material.opacity = .045 * k; } };
  });
  /** a lit sign: a box whose face is the words on red; set(k) lights it (0 off .. 1 on) */
  function lightbox(text, w, h, at, o = {}) {
    const face = tex(Math.round(w * 2000), Math.round(h * 2000), (c, cw, ch) => {
      c.fillStyle = o.bg ?? '#e5484d'; rounded(c, 0, 0, cw, ch, ch * .2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = ch * .06; rounded(c, ch * .1, ch * .1, cw - ch * .2, ch * .8, ch * .14); c.stroke();
      c.fillStyle = '#fff6f2'; c.font = `900 ${ch * .5}px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cw / 2, ch * .54);
    });
    const faceMat = keep(new THREE.MeshStandardMaterial({ map: face, roughness: .4, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0, color: '#8a5a62' }));
    const shell = mat('#2a2230', { r: .5 });
    const b = box(w, h, .02, [shell, shell, shell, shell, faceMat, shell], at);
    const glow = kit.glow({ color: o.glow ?? 0xff4a5a, size: w * 1.6, opacity: 0 }); glow.position.z = .016; b.add(glow);
    return { root: b, set(k) { faceMat.emissiveIntensity = .05 + 1.1 * k; faceMat.color.set(k > .5 ? '#ffffff' : '#8a5a62'); glow.material.opacity = .55 * k; } };
  }
  function rounded(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
  const applause = lightbox('VỖ TAY', .2, .058, [0, .54, -.305]);
  studio.add(applause.root);
  for (const x of [-.07, .07]) studio.add(cyl(.0012, .0012, .055, steel, [x, .59, -.305], 4));
  const onAir = lightbox('● ĐANG QUAY', .13, .034, [-.47, .5, -.295], { glow: 0xff3b3b });
  studio.add(onAir.root);

  const camera = new THREE.Group(); camera.position.set(-.42, 0, .165); camera.rotation.y = Math.atan2(.42, CENTER_Z - .165); studio.add(camera);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094 + .5, leg = cyl(.0022, .0022, .17, steel, [Math.cos(a) * .022, .075, Math.sin(a) * .022], 6);
    leg.rotation.set(Math.sin(a) * .28, 0, -Math.cos(a) * .28); camera.add(leg);
  }
  const body = new THREE.Group(); body.position.y = .17; camera.add(body);
  body.add(mesh(soft(.055, .05, .085, .01), mat('#4a4152', { r: .45 }), [0, 0, 0]), cyl(.019, .021, .03, mat('#2a2230', { r: .3 }), [0, 0, .055], 18),
    mesh(soft(.03, .022, .004, .003), mat('#2a2230', { r: .4 }), [-.035, .012, -.01]));
  body.children[1].rotation.x = Math.PI / 2;
  const tally = ball(.0045, own('#ff3b3b', { e: 0xff2020, ei: 0 }), [0, .03, .03], 8); body.add(tally);
  const camScreen = kit.photo({ frame: 'screen', width: .03, aspect: .7, slot: 11, of: 12, glow: .7 });
  camScreen.root.position.set(-.038, .012, -.01); camScreen.root.rotation.y = -Math.PI / 2; body.add(camScreen.root);

  const chair = new THREE.Group(); chair.position.set(.42, 0, .17); chair.rotation.y = Math.atan2(-.42, CENTER_Z - .17); studio.add(chair);
  const canvasRed = mat('#b8324a', { r: .9 }), chairWood = mat('#8a5a3c', { r: .6 });
  for (const x of [-.032, .032]) {
    for (const s of [-1, 1]) { const leg = box(.004, .085, .004, chairWood, [x, .042, 0]); leg.rotation.x = s * .45; chair.add(leg); }
    chair.add(box(.004, .004, .055, chairWood, [x, .078, 0]), box(.004, .07, .004, chairWood, [x, .11, -.024]));
  }
  chair.add(box(.068, .004, .05, canvasRed, [0, .072, 0]));
  chair.add(box(.07, .03, .003, [canvasRed, canvasRed, canvasRed, canvasRed, keep(new THREE.MeshStandardMaterial({ roughness: .9, map: tex(280, 120, (c, w, h) => {
    c.fillStyle = '#b8324a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff4e6'; c.font = `800 ${h * .34}px ${SANS}`; c.textAlign = 'center';
    c.textBaseline = 'middle'; c.fillText('ĐẠO DIỄN', w / 2, h / 2);
  }) })), canvasRed], [0, .128, -.024]));

  /* ── the clapperboard that opens each episode ── */
  const clapper = new THREE.Group(); clapper.position.set(0, 0, .255); stage.add(clapper);
  const slateCv = document.createElement('canvas'); slateCv.width = 640; slateCv.height = 460;
  const slateTex = keep(new THREE.CanvasTexture(slateCv)); slateTex.colorSpace = THREE.SRGBColorSpace; slateTex.anisotropy = 4;
  let slateWords = { show: '', episode: '', title: '' };
  function paintSlate() {
    const c = slateCv.getContext('2d'), w = 640, h = 460;
    c.fillStyle = '#26212b'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 4; c.strokeRect(14, 14, w - 28, h - 28);
    c.beginPath(); c.moveTo(14, 118); c.lineTo(w - 14, 118); c.moveTo(360, 118); c.lineTo(360, h - 14); c.stroke();
    c.fillStyle = '#ffffff'; kit.fitText(c, slateWords.show, { x: 30, y: 22, w: w - 60, h: 90 }, { maxLines: 1, max: 70 });
    c.fillStyle = '#f6c9d6'; c.font = `800 46px ${SANS}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(slateWords.episode, 36, 182);
    c.fillStyle = '#ffffff'; kit.fitText(c, slateWords.title, { x: 30, y: 200, w: 320, h: 230 }, { maxLines: 3, max: 64 });
    slateTex.needsUpdate = true;
  }
  kit.canvasTexture(4, 4, () => paintSlate());                          // repaints the slate when the handwriting arrives
  const slateDark = mat('#26212b', { r: .6 });
  const slate = box(.16, .115, .008, [slateDark, slateDark, slateDark, slateDark, keep(new THREE.MeshStandardMaterial({ map: slateTex, roughness: .8,
    emissive: 0xffffff, emissiveMap: slateTex, emissiveIntensity: .25 })), slateDark], [0, .0775, 0]);
  clapper.add(slate);
  const stripes = tex(256, 32, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = '#26212b';
    for (let x = -h; x < w; x += 40) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 20, 0); c.lineTo(x + 40, 0); c.lineTo(x + 20, h); c.fill(); }
  });
  const stripeMat = keep(new THREE.MeshStandardMaterial({ map: stripes, roughness: .6 }));
  clapper.add(box(.16, .018, .009, [slateDark, slateDark, slateDark, slateDark, stripeMat, stripeMat], [0, .144, 0]));
  const stickHinge = new THREE.Group(); stickHinge.position.set(-.08, .154, 0); clapper.add(stickHinge);
  stickHinge.add(box(.162, .018, .009, [slateDark, slateDark, slateDark, slateDark, stripeMat, stripeMat], [.081, .009, 0]));
  const slatePhoto = kit.photo({ frame: 'white', width: .056, aspect: .78, slot: 0, of: 12, glow: .4 });
  slatePhoto.root.position.set(.042, .062, .0055); slatePhoto.root.rotation.z = -.04; clapper.add(slatePhoto.root);
  const slateHero = kit.photo({ frame: 'white', width: .056, aspect: .78, hero: true, glow: .4 });
  slateHero.root.position.copy(slatePhoto.root.position); slateHero.root.rotation.z = -.04; clapper.add(slateHero.root);

  /* ── the film wheel of the finale: every photo going round, the first one in the middle ── */
  const wheel = new THREE.Group(); wheel.position.set(0, .62, -.13); stage.add(wheel);
  const ring = mesh(keep(new THREE.TorusGeometry(.2, .009, 8, 64)), mat('#17141c', { r: .5 }), [0, 0, -.004], false); wheel.add(ring);
  const reel = Array.from({ length: 8 }, (_, i) => {
    const ph = kit.photo({ frame: 'film', width: .1, aspect: .75, slot: i, of: 8, turn: 1.3, glow: .45 });
    wheel.add(ph.root); return ph;
  });
  const hero = kit.photo({ frame: 'white', width: .15, aspect: 1.25, hero: true, glow: .6, border: .07 });
  wheel.add(hero.root);
  const heroGlow = kit.glow({ color: 0xffd9a0, size: .42, opacity: 0, depthTest: false }); heroGlow.position.z = -.01; wheel.add(heroGlow);

  return {
    R, BASE, CENTER_Z, ROOMS, turntable, rooms, inRoom, onWall,
    living: { door, frames, tv, tvLight, sofa, table, bowl, remote, lamp: { light: lampLight, glow: lampGlow, shade: shadeMat } },
    kitchen: { pan, egg, alarm: { led: alarmLed.material, glow: alarmGlow }, prints, calendar, fridge },
    nook: { bulbs, strung, glassDoor },
    studio: { spots, applause, onAir, tally: tally.material, camera },
    clapper: {
      root: clapper, stick: stickHinge, photo: slatePhoto, hero: slateHero,
      set(words) { slateWords = words; paintSlate(); }
    },
    wheel: { root: wheel, ring, reel, hero, heroGlow },
    /** a speech bubble that faces the phone, its words in the sitcom's hand */
    bubble(text, o = {}) {
      return kit.picture((c, px) => {
        c.fillStyle = '#ffffff'; c.strokeStyle = '#3b2a4a'; c.lineWidth = px * .03;
        rounded(c, px * .06, px * .1, px * .88, px * .58, px * .2); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(px * (o.tail ?? .3), px * .66); c.lineTo(px * ((o.tail ?? .3) - .04), px * .86); c.lineTo(px * ((o.tail ?? .3) + .14), px * .66);
        c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#ffffff'; c.fillRect(px * ((o.tail ?? .3) - .02), px * .62, px * .18, px * .06);
        c.fillStyle = o.ink ?? '#d9577a'; kit.fitText(c, text, { x: px * .12, y: px * .16, w: px * .76, h: px * .46 }, { maxLines: 1, max: px * .3 });
      }, { size: o.size ?? .1, px: 256 });
    }
  };
};
