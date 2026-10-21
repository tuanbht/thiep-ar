/* Đạp xe đón bình minh: the old blue bicycle and the small things the story hands about, built in code for story.js
   (template.json "story" loads this file before it). The bicycle is drawn below in small numbers and shown K times as big,
   sized to the shared couple (1.80 m at .3): the saddle on a long post and the bars on a tall stem, so his knees bend
   about a right angle at the bottom of a stroke, his hands reach the grips with the elbows bent and a foot reaches the
   ground at a stop.
     NM_DAWN.bike(kit) → { root, frame, steer, set(o), K, SADDLE, RACK, GRIPS, BELL, BASKET, AXLE, R, pedal(i, out), ... }
       its own space (frame's: true size, the K inside it): on the ground between the wheels, +z where it goes, +x the
       rider's left (as a character's). SADDLE … AXLE and R are in that space.
       set({ dist, crank, steer, bell, stand, lamp }): wheels turned by the distance ridden, the cranks, the bars, the bell's
       lever, the kickstand (0 up, 1 down) and the front lamp (0 off, 1 on)
     NM_DAWN.props(kit) → { ringBox(), camera(), folded() } */
(window.NM_DAWN = window.NM_DAWN || {}).bike = kit => {
  const { THREE } = kit;
  const TAU = Math.PI * 2;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .55, ...o }));
  const geo = g => kit.keep(g);
  const mesh = (g, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo(g), m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  /** a round tube along points (a frame tube, a stay, a bar) */
  const tube = (pts, r, m, parent, n = 12) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p))), n, r, 8), m, parent);

  const K = 1.45, POST = .03, STEM = .02;                            // shown K times as drawn; the saddle's post and the bars' stem lengthened
  const R = .03, RIM = .0255, AXLE = .08;                            // wheel radius with its tyre; the axles either side of the middle
  const BB = V3(0, .028, -.004), CRANK = .012;                       // the bottom bracket, the crank's length
  const SADDLE = V3(0, .052 + POST, -.032), RACK = V3(0, .072, -.104);   // where a rider sits: the saddle's top, the rack's cushion
  const HEAD = V3(0, .088, .05);                                     // the head tube's top: the bars turn about it
  const GRIPS = [V3(.028, .103 + STEM, .021), V3(-.028, .103 + STEM, .021)];   // left, right (the right one rings the bell)
  const BELL = V3(-.022, .108 + STEM, .03), BASKET = V3(0, .088, .098);

  const blue = mat('#4a80c4', { roughness: .4, metalness: .25, envMap: kit.env, envMapIntensity: .6 });
  const chrome = mat('#dde2ea', { roughness: .22, metalness: .85, envMap: kit.env, envMapIntensity: 1.2 });
  const cream = mat('#f3e8d2', { roughness: .45 });
  const rubber = mat('#2b2830', { roughness: .8 });
  const leather = mat('#7a4a2c', { roughness: .5 });

  const root = new THREE.Group(), frame = new THREE.Group(), body = new THREE.Group(); root.add(frame); frame.add(body); body.scale.setScalar(K);

  /* ── wheels: a tyre, a rim, a disc of spokes and a hub; they turn about the axle (local x) ── */
  const spokes = kit.canvasTexture(256, 256, (c, w) => {
    c.translate(w / 2, w / 2); c.lineCap = 'round';
    for (let i = 0; i < 18; i++) {                                   // spokes cross from either flange
      const a = i / 18 * TAU, b = a + (i % 2 ? .5 : -.5);
      c.strokeStyle = '#4b5361'; c.lineWidth = 4.5; c.beginPath(); c.moveTo(Math.cos(b) * 15, Math.sin(b) * 15); c.lineTo(Math.cos(a) * 126, Math.sin(a) * 126); c.stroke();
      c.strokeStyle = '#e9edf3'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(Math.cos(b) * 15, Math.sin(b) * 15); c.lineTo(Math.cos(a) * 126, Math.sin(a) * 126); c.stroke();
    }
    c.fillStyle = '#9aa3b0'; c.beginPath(); c.arc(0, 0, 18, 0, TAU); c.fill();
    c.fillStyle = '#e9edf3'; c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fill();
    c.fillStyle = '#ff5d5d'; c.fillRect(104, -5, 18, 10);            // a red reflector clip on the spokes: you see it turn
  });
  const spokeM = kit.keep(new THREE.MeshStandardMaterial({ map: spokes, transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .35, metalness: .5 }));
  function wheel(z, parent) {
    const hub = new THREE.Group(); hub.position.set(0, R, z); parent.add(hub);
    const spin = new THREE.Group(); hub.add(spin);
    const tyre = mesh(new THREE.TorusGeometry(R - .0042, .0042, 10, 40), rubber, spin); tyre.rotation.y = Math.PI / 2;
    const rim = mesh(new THREE.TorusGeometry(RIM, .0016, 6, 40), chrome, spin); rim.rotation.y = Math.PI / 2;
    const disc = mesh(new THREE.CircleGeometry(RIM, 32), spokeM, spin); disc.rotation.y = Math.PI / 2; disc.castShadow = false;
    mesh(new THREE.CylinderGeometry(.0035, .0035, .014, 10).rotateZ(Math.PI / 2), chrome, spin);
    const guard = mesh(new THREE.TorusGeometry(R + .0035, .0028, 6, 24, Math.PI * .85), cream, hub);   // a mudguard over the top
    guard.rotation.set(0, Math.PI / 2, z > 0 ? .25 : .5); guard.scale.set(1, 1, 3.2);
    return { hub, spin };
  }
  const rear = wheel(-AXLE, body);

  /* ── the frame: a step-through loop, stays to the back wheel, the rack, the saddle ── */
  tube([[0, .074, .052], [0, .062, .035], [0, .045, .016], [0, .033, .002], [0, .028, -.004]], .0042, blue, body);   // the swooping down tube
  tube([[0, .081, .051], [0, .07, .03], [0, .056, .008], [0, .047, -.006]], .003, blue, body);                      // and its twin above it
  tube([[0, .028, -.004], [0, .038, -.016], [0, .047, -.028]], .0042, blue, body);                                  // the seat tube
  for (const s of [-1, 1]) {
    tube([[0, .028, -.004], [s * .006, .029, -.04], [s * .007, R, -AXLE]], .0022, blue, body);                   // chain stays
    tube([[0, .046, -.027], [s * .005, .04, -.05], [s * .007, R, -AXLE]], .002, blue, body);                     // seat stays
  }
  mesh(new THREE.CylinderGeometry(.006, .006, .006, 12).rotateZ(Math.PI / 2), blue, body, BB.x, BB.y, BB.z);       // the bottom bracket shell
  mesh(new THREE.CylinderGeometry(.0018, .0018, SADDLE.y - .042, 6), chrome, body, 0, (SADDLE.y + .042) / 2, -.031);   // the seat post, out of the tube to the saddle
  const saddle = mesh(new THREE.SphereGeometry(.011, 14, 8).scale(1, .4, 1.45), leather, body, 0, SADDLE.y - .002, SADDLE.z);
  saddle.rotation.x = .08;
  for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(.0024, .0007, 4, 10), chrome, body, s * .006, SADDLE.y - .006, -.04);   // its springs
  /* the rack over the back wheel and a little checked cushion on it: her seat */
  const rack = new THREE.Group(); rack.position.set(0, RACK.y - .006, RACK.z); body.add(rack);
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(.0024, .0024, .076), chrome, rack, s * .012, 0, 0);
    tube([[s * .012, RACK.y - .006, -.138], [s * .01, .05, -.11], [s * .008, R, -AXLE]], .0014, chrome, body, 6);   // struts to the axle
    tube([[s * .012, RACK.y - .006, -.068], [s * .008, .052, -.05], [s * .005, .046, -.03]], .0013, chrome, body, 6);   // and to the seat stays
  }
  for (const z of [-.032, -.012, .008, .028]) mesh(new THREE.BoxGeometry(.026, .0016, .0018), chrome, rack, 0, 0, z);
  const plaid = kit.canvasTexture(64, 64, (c, w) => {
    c.fillStyle = '#e9dcc0'; c.fillRect(0, 0, w, w);
    c.fillStyle = 'rgba(200,64,64,.55)'; for (let i = 0; i < w; i += 16) { c.fillRect(i, 0, 6, w); c.fillRect(0, i, w, 6); }
    c.fillStyle = 'rgba(60,90,150,.35)'; for (let i = 8; i < w; i += 16) { c.fillRect(i, 0, 2, w); c.fillRect(0, i, w, 2); }
  });
  mesh(new THREE.BoxGeometry(.03, .006, .056), mat('#ffffff', { map: plaid, roughness: .9 }), rack, 0, .0045, -.002);

  /* ── the drive on the right side (the side you see when it goes your right): chainring, cranks, pedals, a chain guard ── */
  const crank = new THREE.Group(); crank.position.copy(BB); body.add(crank);
  const ring = mesh(new THREE.CylinderGeometry(.0105, .0105, .0016, 24).rotateZ(Math.PI / 2), chrome, crank, -.008, 0, 0);
  for (let i = 0; i < 5; i++) {                                      // a five-armed spider inside the ring
    const a = i / 5 * TAU, s = mesh(new THREE.BoxGeometry(.0018, .0016, .009), chrome, crank, -.0088, Math.sin(a) * .005, Math.cos(a) * .005); s.rotation.x = -a;
  }
  ring.castShadow = false;
  const pedals = [-1, 1].map(s => {                                  // [right, left]: the right arm points where the left's does not
    const arm = new THREE.Group(); arm.position.x = s * .01; crank.add(arm);
    mesh(new THREE.BoxGeometry(.0018, CRANK + .003, .003), chrome, arm, 0, -CRANK / 2, 0);
    const pedal = new THREE.Group(); pedal.position.set(s * .004, -CRANK, 0); arm.add(pedal);
    mesh(new THREE.BoxGeometry(.008, .0026, .006), rubber, pedal, s * .002, 0, 0);
    mesh(new THREE.BoxGeometry(.0084, .001, .0012), chrome, pedal, s * .002, 0, .0028);
    return { arm, pedal, side: s };
  });
  pedals[1].arm.rotation.x = Math.PI;
  const guardShape = new THREE.Shape(); guardShape.moveTo(.013, -.014); guardShape.lineTo(-.078, -.006); guardShape.quadraticCurveTo(-.084, 0, -.078, .006);
  guardShape.lineTo(.013, .014); guardShape.quadraticCurveTo(.02, 0, .013, -.014);
  const chainGuard = mesh(new THREE.ShapeGeometry(guardShape), mat('#3e6eaf', { side: THREE.DoubleSide, roughness: .4, metalness: .2 }), body, -.0125, BB.y + .002, BB.z);
  chainGuard.rotation.y = -Math.PI / 2;

  /* ── the kickstand on the left: up along the chain stay, down to the ground ── */
  const stand = new THREE.Group(); stand.position.set(.009, .028, -.03); body.add(stand);
  mesh(new THREE.CylinderGeometry(.0013, .0011, .03, 6), chrome, stand, 0, -.015, 0);
  mesh(new THREE.BoxGeometry(.004, .0012, .004), chrome, stand, 0, -.03, 0);

  /* ── the front: it turns about the head tube: fork, wheel, bars, grips, the bell, the basket and the lamp ── */
  mesh(new THREE.CylinderGeometry(.0048, .0048, .03, 12), blue, body, 0, .072, .052).rotation.x = -.25;   // the head tube
  const steer = new THREE.Group(); steer.position.copy(HEAD); steer.rotation.x = -.25; body.add(steer);
  const front = new THREE.Group(); front.rotation.x = .25; steer.add(front);   // back upright inside: parts are placed as the bike stands
  const at = (x, y, z) => [x - HEAD.x, y - HEAD.y, z - HEAD.z];      // the frame's numbers, in the turning part's own place
  for (const s of [-1, 1]) tube([at(s * .0055, .066, .056), at(s * .0065, .048, .061), at(s * .007, R, AXLE)], .002, blue, front, 6);   // fork blades
  const fw = wheel(AXLE, front); fw.hub.position.set(...at(0, R, AXLE));
  tube([at(0, .086, .05), at(0, .1 + STEM, .053)], .0026, chrome, front, 4);                                                // the stem
  tube([[.028, .103, .021], [.03, .103, .036], [.018, .101, .055], [0, .1, .056], [-.018, .101, .055], [-.03, .103, .036], [-.028, .103, .021]]
    .map(([x, y, z]) => at(x, y + STEM, z)), .0018, chrome, front, 24);                                                     // swept-back bars
  for (const g of GRIPS) { const m = mesh(new THREE.CylinderGeometry(.0028, .0028, .011, 8), cream, front, ...at(g.x, g.y, g.z)); m.rotation.x = Math.PI / 2; }
  /* the bell: a domed cup on the right bar, a thumb lever that flicks */
  const bell = new THREE.Group(); bell.position.set(...at(BELL.x, BELL.y, BELL.z)); front.add(bell);
  mesh(new THREE.SphereGeometry(.0052, 14, 8, 0, TAU, 0, Math.PI / 2).scale(1, .75, 1), chrome, bell, 0, 0, 0);
  mesh(new THREE.CylinderGeometry(.0054, .0054, .0012, 14), chrome, bell, 0, -.0006, 0);
  const lever = new THREE.Group(); lever.position.set(-.004, -.001, -.003); bell.add(lever);
  mesh(new THREE.BoxGeometry(.0012, .0012, .007), mat('#e8c547', { metalness: .6, roughness: .3 }), lever, 0, 0, -.0035);
  /* the wicker basket on the front: the note waits in it */
  const wicker = kit.canvasTexture(128, 96, (c, w, h) => {
    c.fillStyle = '#b07d45'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 * 8; x < w; x += 16) {
      const g = c.createLinearGradient(x, y, x + 16, y + 8); g.addColorStop(0, '#e2b778'); g.addColorStop(1, '#c08a4c');
      c.fillStyle = g; c.beginPath(); c.ellipse(x + 8, y + 4, 8, 3.4, 0, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(80,45,20,.55)'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 2, h);
    c.fillStyle = '#8a5a2e'; c.fillRect(0, 0, w, 7); c.fillRect(0, h - 6, w, 6);
  });
  const basketM = mat('#ffffff', { map: wicker, roughness: .85 });
  const basket = new THREE.Group(); basket.position.set(...at(BASKET.x, BASKET.y, BASKET.z)); front.add(basket);
  const BW = .044, BH = .03, BD = .034;
  for (const [w, d, x, z, ry] of [[BW, .002, 0, BD / 2, 0], [BW, .002, 0, -BD / 2, 0], [BD, .002, BW / 2, 0, Math.PI / 2], [BD, .002, -BW / 2, 0, Math.PI / 2]])
    mesh(new THREE.BoxGeometry(w, BH, d), basketM, basket, x, 0, z).rotation.y = ry;
  mesh(new THREE.BoxGeometry(BW, .002, BD), basketM, basket, 0, -BH / 2, 0);
  mesh(new THREE.TorusGeometry(.016, .0016, 6, 20, Math.PI), mat('#8a5a2e'), basket, 0, BH / 2, 0).rotation.y = Math.PI / 2;   // its handle
  for (const s of [-1, 1]) tube([at(s * .014, .074, .086), at(s * .009, .066, .074), at(s * .006, .062, .062)], .0011, chrome, front, 4);   // its stays
  /* the lamp under the basket, and the light it throws on the road */
  const lampBody = mesh(new THREE.CylinderGeometry(.0055, .0045, .009, 12).rotateX(Math.PI / 2), chrome, front, ...at(0, .072, .114));
  const lens = mesh(new THREE.CircleGeometry(.0048, 14), mat('#fff6d8', { emissive: 0xffd88a, emissiveIntensity: 0 }), front, ...at(0, .072, .1187));
  lens.castShadow = false; lampBody.castShadow = false;
  const lampGlow = kit.glow({ color: 0xffd68a, size: .05, opacity: 0 }); lampGlow.position.set(...at(0, .072, .121)); front.add(lampGlow);
  const pool = kit.canvasTexture(128, 128, (c, w) => {                // a soft warm cone on the road ahead
    const g = c.createRadialGradient(w / 2, w * .12, 0, w / 2, w * .12, w * .9);
    g.addColorStop(0, 'rgba(255,226,160,.95)'); g.addColorStop(.45, 'rgba(255,200,120,.4)'); g.addColorStop(1, 'rgba(255,190,110,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(w * .42, 0); c.lineTo(w * .58, 0); c.lineTo(w, w); c.lineTo(0, w); c.closePath(); c.fill();
  });
  const beam = new THREE.Mesh(geo(new THREE.PlaneGeometry(.11, .2).rotateX(-Math.PI / 2)), kit.keep(new THREE.MeshBasicMaterial({ map: pool, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending })));
  beam.position.set(0, .0025, .21 * K); beam.scale.setScalar(K); beam.renderOrder = 2; root.add(beam);   // on the ground, not turning with the bars (it would swing past the card)

  /* the back: a red reflector on the mudguard */
  mesh(new THREE.BoxGeometry(.008, .005, .0016), mat('#d8343f', { emissive: 0xd8343f, emissiveIntensity: .25 }), body, 0, .052, -AXLE - .032).rotation.x = .5;

  const eHead = new THREE.Euler(-.25, 0, 0), qTurn = new THREE.Quaternion(), UP = V3(0, 1, 0);
  return {
    root, frame, steer, front, basket, bell, K, R: R * K, AXLE: AXLE * K, CRANK: CRANK * K, BB: BB.clone().multiplyScalar(K),
    SADDLE: SADDLE.clone().multiplyScalar(K), RACK: RACK.clone().multiplyScalar(K), GRIPS: GRIPS.map(g => g.clone().multiplyScalar(K)),
    BELL: BELL.clone().multiplyScalar(K), BASKET: BASKET.clone().multiplyScalar(K),
    /** a pedal's middle in the frame's own space (i: 0 right, 1 left) at the present crank */
    pedal(i, out = V3()) { pedals[i].pedal.updateWorldMatrix(true, false); return frame.worldToLocal(out.setFromMatrixPosition(pedals[i].pedal.matrixWorld)); },
    /** a grip in the frame's own space (i: 0 left, 1 right), where the bars are turned */
    grip(i, out = V3()) { front.updateWorldMatrix(true, false); return frame.worldToLocal(front.localToWorld(out.set(...at(GRIPS[i].x, GRIPS[i].y, GRIPS[i].z)))); },
    set(o = {}) {
      const roll = (o.dist ?? 0) / (R * K);
      rear.spin.rotation.x = roll; fw.spin.rotation.x = roll;
      crank.rotation.x = o.crank ?? 0;
      for (const p of pedals) p.pedal.rotation.x = -crank.rotation.x - p.arm.rotation.x;   // pedals stay level under the feet
      steer.quaternion.setFromEuler(eHead).multiply(qTurn.setFromAxisAngle(UP, o.steer ?? 0));   // about the head tube's own slant
      lever.rotation.y = -1.1 * (o.bell ?? 0);
      stand.rotation.x = 1.35 * (1 - (o.stand ?? 0)) + .3 * (o.stand ?? 0);   // up along the stay, or down and a little back
      stand.rotation.z = .35 * (o.stand ?? 0);
      const lamp = o.lamp ?? 0;
      lens.material.emissiveIntensity = 2.2 * lamp; lampGlow.material.opacity = .9 * lamp; beam.material.opacity = .7 * lamp;
    }
  };
};

/* ── the little things: a ring box, an instant camera, a folded note ── */
(window.NM_DAWN = window.NM_DAWN || {}).props = kit => {
  const { THREE } = kit;
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .55, ...o }));
  const mesh = (g, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(kit.keep(g), m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };

  /** a red velvet ring box, its lid hinged at the back; a gold ring with a stone in it. { root, lid, ring, stone } */
  function ringBox() {
    const root = new THREE.Group(), velvet = mat('#c22f4a', { roughness: .95 }), gold = mat('#f2c25c', { metalness: .9, roughness: .2, envMap: kit.env, envMapIntensity: 1.5 });
    const S = .016;
    mesh(new THREE.BoxGeometry(S, S * .55, S), velvet, root, 0, S * .275, 0);
    mesh(new THREE.BoxGeometry(S * .8, S * .05, S * .8), mat('#fff3e8', { roughness: 1 }), root, 0, S * .56, 0);   // the satin inside
    const lid = new THREE.Group(); lid.position.set(0, S * .55, -S / 2); root.add(lid);
    mesh(new THREE.BoxGeometry(S, S * .38, S), velvet, lid, 0, S * .19, S / 2);
    mesh(new THREE.BoxGeometry(S * 1.02, S * .06, S * 1.02), gold, lid, 0, 0, S / 2);   // a gold rim on the lid's edge
    const ring = new THREE.Group(); ring.position.set(0, S * .72, 0); root.add(ring);
    mesh(new THREE.TorusGeometry(S * .26, S * .06, 8, 24), gold, ring);
    const stone = mesh(new THREE.OctahedronGeometry(S * .13, 0), kit.keep(new THREE.MeshStandardMaterial({ color: 0xeaf6ff, metalness: .2, roughness: .05,
      envMap: kit.env, envMapIntensity: 3, emissive: 0xbfe6ff, emissiveIntensity: .35 })), ring, 0, S * .3, 0);
    return { root, lid, ring, stone };
  }

  /** a little instant camera, cream and mint, its lens to +z; { root, flash, slot }: the flash to light, the slot the print comes out of */
  function camera() {
    const root = new THREE.Group(), body = mat('#f4ecd8', { roughness: .5 }), mint = mat('#7fcfb8', { roughness: .45 }), black = mat('#22232b', { roughness: .3 });
    mesh(new THREE.BoxGeometry(.034, .026, .018), body, root);
    mesh(new THREE.BoxGeometry(.035, .009, .019), mint, root, 0, -.006, 0);
    mesh(new THREE.CylinderGeometry(.0085, .0095, .007, 20).rotateX(Math.PI / 2), black, root, .002, .001, .011);
    mesh(new THREE.CylinderGeometry(.005, .005, .002, 16).rotateX(Math.PI / 2), mat('#5d6f94', { metalness: .6, roughness: .1, envMap: kit.env }), root, .002, .001, .0148);
    const flash = mesh(new THREE.BoxGeometry(.008, .005, .002), mat('#ffffff', { emissive: 0xffffff, emissiveIntensity: 0 }), root, -.011, .008, .0095);
    mesh(new THREE.BoxGeometry(.004, .004, .003), mat('#e8436d'), root, .012, .014, .004);   // the shutter button
    const slot = new THREE.Group(); slot.position.set(0, .013, 0); root.add(slot);
    return { root, flash, slot };
  }

  /** a note folded in four, to sit in the basket and pass from hand to hand */
  function folded() {
    const paper = kit.canvasTexture(64, 64, (c, w) => {
      c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, w);
      c.strokeStyle = 'rgba(60,90,160,.35)'; c.lineWidth = 2; for (let y = 12; y < w; y += 10) { c.beginPath(); c.moveTo(4, y); c.lineTo(w - 4, y); c.stroke(); }
      c.fillStyle = '#ff6f91'; kit.heartPath(c, w * .7, w * .62, 20); c.fill();
    });
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(.022, .016, .0016), mat('#ffffff', { map: paper, roughness: .9, emissive: 0xffffff, emissiveMap: paper, emissiveIntensity: .25 }), g);
    return g;
  }
  return { ringBox, camera, folded };
};
