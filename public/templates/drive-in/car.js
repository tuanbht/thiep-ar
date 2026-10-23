/* Suất Chiếu Đặc Biệt: the convertible and what is in it, for story.js. The car (props.js, a Grab3D 1960s convertible)
   parks in the middle bay, its nose to the screen and turned a little, so the couple show their faces when they turn
   to each other; the ticket with the first photo is clipped on top of the windshield, the radio sits on the dashboard,
   the popcorn box rides between them, and the soft top (built here, cream canvas on four bows, a big clear rear window
   so they still show under it) unfolds over them in the rain.
   window.NM_DRIVEIN_CAR(kit, props, set) returns { root, at(z), seat(who, out), stand(who, out), top, ticket, popcorn,
   radio, honk(T), update(T, dt) }. Units: card widths; the car's own parts are in metres under root (scale M). */
window.NM_DRIVEIN_CAR = (kit, props, set) => {
  const { THREE, stage, keep, rng, clamp, ease, lerp } = kit;
  const M = props.M;
  const PARK = { x: -.015, z: .06, yaw: Math.PI - .2 };                // the nose to the screen, turned a little to the right
  const SEAT_UP = { boy: .0588, girl: .0612 }, SETTLE = .0396;        // Sit_Chair: the seat top over the feet, the hips behind them
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const SERIF = '"Playfair Display", "Times New Roman", "Noto Serif", Georgia, serif';

  const car = props.convertible();
  const root = new THREE.Group(); root.name = 'car'; stage.add(root);    // where it is parked; a bounce on top of that
  const body = new THREE.Group(); root.add(body); body.add(car.root); set.night(car.root);
  const size = car.size;                                              // card widths: width, height, length
  const P = n => car.local(n, new THREE.Vector3());                     // a point in the car's own metres
  const seatL = P('seatL') || new THREE.Vector3(.36, .45, -.2), seatR = P('seatR') || new THREE.Vector3(-.36, .45, -.2);
  const dash = P('dash') || new THREE.Vector3(0, .86, .45);
  const W = size[0] / M;                                              // metres
  const HEADER = P('windshieldTop') || new THREE.Vector3(0, dash.y + .41, dash.z - .16);   // the windshield's top bar
  const FOLD = P('topFold') || new THREE.Vector3(0, seatL.y + .55, seatL.z - .9);          // where the folded top sits
  const BELT = (P('rear') || new THREE.Vector3(0, seatL.y + .4, 0)).y;                        // the top of the doors and the rear deck
  const HINGE = new THREE.Vector3(0, FOLD.y - .1, FOLD.z + .06);
  /** where each of them sits: the GLB's own measured roots for Sit_Chair (extras.sit), else from the seat */
  const sitRoot = who => {
    const t = car.extras.sit && car.extras.sit[who] && car.extras.sit[who][who === 'boy' ? 'seatL' : 'seatR'];
    if (t) return new THREE.Vector3(t[0], t[1], t[2]);
    const s = who === 'boy' ? seatL : seatR; return new THREE.Vector3(s.x, s.y - SEAT_UP[who] / M, s.z + SETTLE / M);
  };
  const ROOT = { boy: sitRoot('boy'), girl: sitRoot('girl') };
  const wheels = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].map(n => car.part(n)).filter(Boolean);
  const wheelR = (car.extras.parts && car.extras.parts.radius) || .32, ROLL = .42;

  /** the car d card widths short of its bay, backed up along its heading (it rolls in nose first) */
  function at(d) {
    root.position.set(PARK.x - d * Math.sin(PARK.yaw), set.FLOOR, PARK.z - d * Math.cos(PARK.yaw)); root.rotation.y = PARK.yaw;
    wheels.forEach(w => { w.rotation.x = (ROLL - d) / M / wheelR; });   // the wheels roll it in
  }
  at(0);

  /* ── where they sit, and where they stand in it ── */
  const vS = new THREE.Vector3();
  /** the root for 'boy' (the driver's seat, seatL) or 'girl' (seatR) sitting (Sit_Chair_*) on the stage: { x, y, z, yaw } */
  function seat(who, out = {}) {
    root.updateMatrixWorld(true);
    vS.copy(ROOT[who]); car.root.localToWorld(vS); stage.worldToLocal(vS);
    out.x = vS.x; out.y = vS.y; out.z = vS.z; out.yaw = root.rotation.y + body.rotation.y;
    return out;
  }
  /** standing in the car where their feet were (k: 0 there, 1 a step in towards each other) */
  function stand(who, k = 0, out = {}) {
    const s = ROOT[who].clone(); s.x *= 1 - .62 * k;
    root.updateMatrixWorld(true); vS.copy(s); car.root.localToWorld(vS); stage.worldToLocal(vS);
    out.x = vS.x; out.y = vS.y; out.z = vS.z; out.yaw = root.rotation.y;
    return out;
  }
  /** a point in the car's own metres, on the stage */
  const onStage = (p, out = new THREE.Vector3()) => { root.updateMatrixWorld(true); out.copy(p); car.root.localToWorld(out); return stage.worldToLocal(out); };

  /* ── the soft top: four bows that sweep up from behind the back seat, canvas between them, a clear rear window ── */
  const headZ = (ROOT.boy.z + ROOT.girl.z) / 2 - .17, headY = ROOT.boy.y + 1.62;   // over his head when he sits
  const BOWS = [                                                      // deployed: [z, y of the top, how wide] in metres
    [FOLD.z - .04, BELT + .2, W - .26], [headZ - .6, headY - .03, W - .22], [headZ - .15, headY + .02, W - .22], [HEADER.z, HEADER.y + .02, W - .24]];
  const BASE = BELT;                                                  // where the canvas meets the doors
  const K = 15, NB = BOWS.length;
  const topGeo = keep(new THREE.BufferGeometry());
  const topPos = new Float32Array(NB * K * 3), topUv = new Float32Array(NB * K * 2), idx = [];
  for (let b = 0; b < NB; b++) for (let i = 0; i < K; i++) topUv.set([i / (K - 1), b / (NB - 1)], (b * K + i) * 2);
  const groups = [[], [], []];                                        // the clear windows, the canvas, (spare)
  for (let b = 0; b < NB - 1; b++) for (let i = 0; i < K - 1; i++) {
    const a = b * K + i, c = a + K, u = Math.abs((i + .5) / (K - 1) * 2 - 1);
    const glass = b === 0 ? u < .6 : u > .86;                         // the rear window between its pillars; the side windows under the roof
    groups[glass ? 0 : 1].push(a, c, a + 1, a + 1, c, c + 1);
  }
  let start = 0; for (let g = 0; g < 3; g++) { idx.push(...groups[g]); topGeo.addGroup(start, groups[g].length, g); start += groups[g].length; }
  topGeo.setIndex(idx); topGeo.setAttribute('position', new THREE.BufferAttribute(topPos, 3)); topGeo.setAttribute('uv', new THREE.BufferAttribute(topUv, 2));
  const canvasTex = kit.canvasTexture(256, 256, (c, w, h) => {      // dark canvas, its weave, a piped seam at each bow
    c.fillStyle = '#3a3550'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1; for (let y = 0; y < h; y += 3) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.fillStyle = 'rgba(241,230,214,.55)'; for (let k = 0; k <= 3; k++) c.fillRect(0, Math.min(h - 3, h * k / 3), w, 3);
  });
  const topMats = [
    keep(new THREE.MeshStandardMaterial({ color: '#cfe4ff', roughness: .05, metalness: .1, transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false, envMap: set.env, envMapIntensity: 1.2 })),
    keep(new THREE.MeshStandardMaterial({ map: canvasTex, roughness: .85, side: THREE.DoubleSide })),
    keep(new THREE.MeshStandardMaterial({ color: '#3a3550', roughness: .85, side: THREE.DoubleSide }))];
  const topMesh = new THREE.Mesh(topGeo, topMats); topMesh.castShadow = true; topMesh.frustumCulled = false; topMesh.raycast = () => {};
  car.root.add(topMesh);
  const folded = BOWS.map((_, b) => [FOLD.z - .02 - b * .05, FOLD.y - .04 + b * .02]);
  /** k 0..1: folded behind the back seat … up over them; the front bow leads */
  function topAt(k) {
    topMesh.visible = k > .001;
    for (let b = 0; b < NB; b++) {
      const kb = ease.inOut(clamp(k * 1.25 - (NB - 1 - b) * .08)), [dz, dy, dw] = BOWS[b], [fz, fy] = folded[b];
      const a0 = Math.atan2(fy - HINGE.y, fz - HINGE.z), a1 = Math.atan2(dy - HINGE.y, dz - HINGE.z);   // round the hinge, up and over
      const r0 = Math.hypot(fz - HINGE.z, fy - HINGE.y), r1 = Math.hypot(dz - HINGE.z, dy - HINGE.y);
      const ang = lerp(a0, a1, kb), r = lerp(r0, r1, kb);
      const cz = HINGE.z + Math.cos(ang) * r, top = HINGE.y + Math.sin(ang) * r;
      const arch = lerp(.08, Math.max(.05, top - BASE), kb), w = lerp(W - .3, dw, kb);
      for (let i = 0; i < K; i++) {
        const u = i / (K - 1) * 2 - 1, h = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 6)), 1 / 6);
        topPos.set([u * w / 2, top - arch * (1 - h), cz], (b * K + i) * 3);
      }
    }
    topGeo.attributes.position.needsUpdate = true; topGeo.computeVertexNormals(); topGeo.computeBoundingSphere();
  }
  topAt(0);

  /* ── the ticket on top of the windshield: a vintage stub, the first photo on its left ── */
  const ticket = new THREE.Group(); ticket.position.copy(HEADER).add(new THREE.Vector3(.0, .02, -.02)); ticket.rotation.set(-.18, Math.PI, 0);
  ticket.scale.setScalar(1 / M); car.root.add(ticket);                // its own units are card widths again
  const TW = .19, TH = .085;
  const ticketTex = set.paint(1024, 468, (c, w, h) => {
    c.fillStyle = '#f6ead6'; c.beginPath();
    c.moveTo(24, 0); c.lineTo(w - 24, 0); c.arc(w, 0, 24, Math.PI, Math.PI / 2, true); c.lineTo(w, h - 24); c.arc(w, h, 24, -Math.PI / 2, Math.PI, true);
    c.lineTo(24, h); c.arc(0, h, 24, 0, -Math.PI / 2, true); c.lineTo(0, 24); c.arc(0, 0, 24, Math.PI / 2, 0, true); c.closePath(); c.fill();
    c.strokeStyle = '#e0475c'; c.lineWidth = 8; c.strokeRect(30, 30, w - 60, h - 60);
    c.setLineDash([10, 12]); c.lineWidth = 4; c.beginPath(); c.moveTo(w * .76, 40); c.lineTo(w * .76, h - 40); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#e0475c'; c.textAlign = 'center'; c.textBaseline = 'middle';
    kit.fitText(c, 'VÉ XEM PHIM', { x: w * .47, y: 50, w: w * .27, h: 80 }, { maxLines: 1, max: 60, font: SERIF, weight: 900 });
    c.fillStyle = '#3a2540'; kit.fitText(c, 'SUẤT CHIẾU ĐẶC BIỆT', { x: w * .47, y: 140, w: w * .27, h: 60 }, { maxLines: 1, max: 40, font: SANS, weight: 900 });
    c.font = `700 30px ${SANS}`; c.fillText('Hàng A · Ghế đôi', w * .605, 240); c.fillText('Giá vé: một nụ cười', w * .605, 290);
    c.fillStyle = '#ff6f91'; kit.heartPath(c, w * .605, 370, 70); c.fill();
    c.save(); c.translate(w * .88, h / 2); c.rotate(-Math.PI / 2); c.fillStyle = '#e0475c'; c.font = `900 46px ${SERIF}`; c.fillText('Nº 0001', 0, 0); c.restore();
  });
  const ticketGeo = keep(new THREE.PlaneGeometry(TW, TH));
  ticket.add(new THREE.Mesh(ticketGeo, keep(new THREE.MeshStandardMaterial({ map: ticketTex, roughness: .8, transparent: true, alphaTest: .3,
    emissive: 0xffffff, emissiveMap: ticketTex, emissiveIntensity: .45 }))));
  ticket.add(new THREE.Mesh(ticketGeo, keep(new THREE.MeshStandardMaterial({ color: '#efe1c8', roughness: .9, side: THREE.BackSide }))));   // its plain back
  const heroTicket = kit.photo({ hero: true, frame: 'none', width: .1, aspect: .66, glow: .55, depth: .002 });
  heroTicket.root.position.set(-TW / 2 + .058, 0, .0016); ticket.add(heroTicket.root);
  for (const x of [-.05, .05]) ticket.add(new THREE.Mesh(keep(new THREE.BoxGeometry(.008, .016, .006)), keep(new THREE.MeshStandardMaterial({ color: '#d8dde6', metalness: .8, roughness: .3, envMap: set.env }))).translateX(x).translateY(-TH / 2 - .002));
  ticket.traverse(o => { if (o.isMesh) o.castShadow = false; });

  /* ── the radio on the dashboard, playing to them ── */
  const radio = props.radio(); radio.root.scale.setScalar(1); radio.root.position.copy(dash).add(new THREE.Vector3(0, 0, -.05)); radio.root.rotation.y = Math.PI;
  car.root.add(radio.root); set.night(radio.root);
  const notes = kit.particles({ max: 40 }); stage.add(notes.root);

  /* ── the popcorn box: red and white stripes, heaped with popcorn, kernels that jump out ── */
  const popcorn = new THREE.Group(); popcorn.name = 'popcorn'; stage.add(popcorn);
  const PB = { w: .032, h: .042 };
  const stripeTex = kit.canvasTexture(128, 128, (c, w, h) => {
    for (let x = 0; x < w; x += 16) { c.fillStyle = (x / 16) % 2 ? '#fff6ea' : '#e0475c'; c.fillRect(x, 0, 16, h); }
    c.fillStyle = '#ffc56b'; c.fillRect(0, h * .42, w, h * .18); c.fillStyle = '#e0475c'; c.font = `900 22px ${SANS}`; c.textAlign = 'center'; c.fillText('BẮP', w / 2, h * .56);
  });
  const boxGeo = keep(new THREE.CylinderGeometry(PB.w * .62, PB.w * .45, PB.h, 4, 1, true)); boxGeo.rotateY(Math.PI / 4);
  const boxMesh = new THREE.Mesh(boxGeo, keep(new THREE.MeshStandardMaterial({ map: stripeTex, roughness: .7, side: THREE.DoubleSide })));
  boxMesh.position.y = PB.h / 2; boxMesh.castShadow = true; popcorn.add(boxMesh);
  const kernelGeo = keep(new THREE.IcosahedronGeometry(1, 0)), kernelMat = keep(new THREE.MeshStandardMaterial({ color: '#fff4d6', roughness: .9, emissive: '#ffe6a8', emissiveIntensity: .25 }));
  const heap = new THREE.InstancedMesh(kernelGeo, kernelMat, 26), mK = new THREE.Matrix4(), qK = new THREE.Quaternion(), eK = new THREE.Euler(), vK = new THREE.Vector3();
  const rk = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(404);
  for (let i = 0; i < 26; i++) {
    const a = rk() * 6.28, r = Math.sqrt(rk()) * PB.w * .5, s = .0046 + rk() * .002;
    heap.setMatrixAt(i, mK.compose(vK.set(Math.cos(a) * r, PB.h + .002 + rk() * .008 * (1 - r / PB.w), Math.sin(a) * r), qK.setFromEuler(eK.set(rk() * 6, rk() * 6, rk() * 6)), new THREE.Vector3(s, s * .85, s)));
  }
  heap.castShadow = true; popcorn.add(heap);
  const hitBox = new THREE.Mesh(keep(new THREE.BoxGeometry(.06, .07, .06)), keep(new THREE.MeshBasicMaterial())); hitBox.visible = false; hitBox.userData.proxy = true; hitBox.position.y = PB.h / 2; popcorn.add(hitBox);
  const flying = new THREE.InstancedMesh(kernelGeo, kernelMat, 40); flying.frustumCulled = false; flying.raycast = () => {}; stage.add(flying);
  const pops = Array.from({ length: 40 }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: .005, r: 0 }));
  let popNext = 0;
  /** n kernels jump out of the box, as high as `up` */
  function pop(n, up = 1) {
    popcorn.updateMatrixWorld(true); const top = popcorn.localToWorld(new THREE.Vector3(0, PB.h + .006, 0)); stage.worldToLocal(top);
    for (let i = 0; i < n; i++) {
      const q = pops[popNext]; popNext = (popNext + 1) % pops.length;
      q.life = 1.1; q.p.copy(top).add(new THREE.Vector3((rng() - .5) * .02, 0, (rng() - .5) * .02));
      q.v.set((rng() - .5) * .22, (.25 + rng() * .3) * up, (rng() - .5) * .22); q.s = .0045 + rng() * .0025; q.r = rng() * 6;
    }
  }
  function kernelsAt(dt) {
    for (let i = 0; i < pops.length; i++) {
      const q = pops[i];
      if (q.life > 0) { q.life -= dt; q.v.y -= 1.1 * dt; q.p.addScaledVector(q.v, dt); if (q.p.y < set.FLOOR + q.s) { q.p.y = set.FLOOR + q.s; q.v.multiplyScalar(.3); q.v.y = Math.abs(q.v.y) * .4; } q.r += dt * 8; }
      const s = q.life > 0 ? q.s * Math.min(1, q.life * 3) : 0;
      flying.setMatrixAt(i, mK.compose(q.p, qK.setFromEuler(eK.set(q.r, q.r * .7, 0)), vK.set(s, s, s)));
    }
    flying.instanceMatrix.needsUpdate = true;
  }

  /* ── the horn: a bounce, the headlights wink ── */
  let honked = -9;
  const heads = [];
  car.root.traverse(o => { if (o.isMesh && o.material && o.material.emissive && o.material.emissive.getHex() === 0xffe9b0) heads.push(o.material); });

  return {
    root, body, size, PARK, at, seat, stand, onStage, HEADER, dash,
    top: { set: topAt }, ticket, heroTicket, radio, notes, popcorn, popHit: hitBox, pop, PB,
    honk(T) { honked = T; },
    /** each frame: the horn's bounce, flying kernels, the radio's notes (k: how much music) */
    update(T, dt, music = 0) {
      const h = T - honked, b = h >= 0 && h < .9 ? Math.sin(h * 22) * Math.exp(-h * 5) : 0;
      body.position.y = .004 * Math.abs(b); body.rotation.z = .01 * b;
      heads.forEach(m => { m.emissiveIntensity = .8 + (h >= 0 && h < .9 ? 2.5 * (Math.sin(h * 14) > 0 ? 1 : 0) : 0); });
      kernelsAt(dt);
      if (music > 0 && dt && rng() < dt * 1.6 * music) {
        const p = onStage(radio.root.position.clone().add(new THREE.Vector3(0, .25, 0)));
        notes.emit({ x: p.x, y: p.y, z: p.z, vx: (rng() - .5) * .03, vy: .045, sway: .02, color: ['#ffc56b', '#ff6f91', '#9fc3e8'][(rng() * 3) | 0], size: .016, life: 2.2, shape: 'note' });
      }
      notes.update(dt, T);
    }
  };
};
