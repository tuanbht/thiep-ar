/* Đạp xe đón bình minh: the two of them, for story.js (template.json "story" loads this file before it): a two-bone
   reach for legs and arms (feet on the pedals, hands on the grips, a knee on the ground), and the carriers of the card's
   words that are not the act's own: a page torn from a notebook, the road sign's plank.
     NM_DAWN.cast(kit) → { ik(m, a, b, end, target, pole, k), at(m, bone, out), own(m, v), frame(), notePage(text),
                           plankTexture(text) } */
(window.NM_DAWN = window.NM_DAWN || {}).cast = kit => {
  const { THREE, fitText, HAND } = kit;
  const TAU = Math.PI * 2;

  /* ── a two-bone reach: a hip, a knee and a foot (or a shoulder, an elbow and a hand) ── */
  const mStage = new THREE.Matrix4(), qInv = new THREE.Quaternion();
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vE = new THREE.Vector3(), vD = new THREE.Vector3(), vP = new THREE.Vector3(), vT = new THREE.Vector3();
  const lens = new Map(), D = [0, 0, 0];
  /** a bone's place on the stage */
  const at = (m, bone, out) => { const b = m.node(bone); b.updateWorldMatrix(true, false); return out.setFromMatrixPosition(b.matrixWorld).applyMatrix4(mStage); };
  /** a direction on the stage, in the character's own space (what aim() wants; the characters stand on the stage), into D */
  const own = (m, v) => vT.copy(v).applyQuaternion(qInv.copy(m.root.quaternion).invert()).toArray(D);
  /** bends a → b → end so `end` reaches `target` (stage space), the middle joint towards `pole` (a stage direction); the
      bone lengths are measured the first time */
  function ik(m, a, b, end, target, pole, k = 1) {
    if (k <= 0) return;
    const key = `${m.root.name}|${a}`;
    if (!lens.has(key)) { at(m, a, vA); at(m, b, vB); at(m, end, vE); lens.set(key, [vA.distanceTo(vB), vB.distanceTo(vE)]); }
    const [l1, l2] = lens.get(key);
    at(m, a, vA); vD.subVectors(target, vA);
    const d = THREE.MathUtils.clamp(vD.length(), Math.abs(l1 - l2) + 1e-5, l1 + l2 - 1e-5); vD.normalize();
    vP.copy(pole).addScaledVector(vD, -pole.dot(vD)).normalize();
    const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d), out = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    vB.copy(vA).addScaledVector(vD, along).addScaledVector(vP, out);
    m.aim(a, own(m, vE.subVectors(vB, vA)), k);
    at(m, b, vB); m.aim(b, own(m, vE.subVectors(target, vB)), k);
  }
  /** call once a frame before any reach: where the stage is */
  function frame() { kit.stage.updateWorldMatrix(true, false); mStage.copy(kit.stage.matrixWorld).invert(); }

  /* ── the first words: a page torn out of a notebook, a doodle of the sunrise in its corner ── */
  function notePage(text) {
    const W = 1024, Hh = 680, width = .4, height = width * Hh / W;
    const tex = kit.canvasTexture(W, Hh, (c, w, h) => {
      c.save(); c.shadowColor = 'rgba(30,30,60,.3)'; c.shadowBlur = 16; c.shadowOffsetY = 6; c.fillStyle = '#fffaf0';
      c.beginPath(); c.moveTo(16, 40);                               // its top edge torn along the spiral
      for (let x = 16; x <= w - 16; x += 22) c.lineTo(x, 34 + ((x / 22) % 2 ? 10 : 0));
      c.lineTo(w - 16, h - 18); c.lineTo(16, h - 18); c.closePath(); c.fill(); c.restore();
      c.fillStyle = 'rgba(40,40,70,.18)'; for (let x = 60; x < w - 40; x += 64) { c.beginPath(); c.arc(x, 58, 9, 0, TAU); c.fill(); }
      c.strokeStyle = 'rgba(70,110,190,.3)'; c.lineWidth = 3; for (let y = 140; y < h - 40; y += 72) { c.beginPath(); c.moveTo(30, y); c.lineTo(w - 30, y); c.stroke(); }
      c.strokeStyle = 'rgba(225,80,90,.45)'; c.beginPath(); c.moveTo(120, 80); c.lineTo(120, h - 20); c.stroke();
      c.save(); c.translate(w - 150, h - 110); c.strokeStyle = '#e38b3a'; c.lineWidth = 6; c.lineCap = 'round';   // a sun over a hill, in pencil
      c.beginPath(); c.arc(0, 18, 34, Math.PI, 0); c.stroke();
      for (let i = 0; i < 7; i++) { const a = Math.PI + (i + .5) / 7 * Math.PI; c.beginPath(); c.moveTo(Math.cos(a) * 46, 18 + Math.sin(a) * 46); c.lineTo(Math.cos(a) * 62, 18 + Math.sin(a) * 62); c.stroke(); }
      c.strokeStyle = '#5a8f4a'; c.beginPath(); c.moveTo(-90, 34); c.quadraticCurveTo(-20, -6, 90, 34); c.stroke();
      c.restore();
      c.fillStyle = '#ff6f91'; kit.heartPath(c, 76, h - 70, 40); c.fill();
      c.fillStyle = '#26357a'; fitText(c, text, { x: 150, y: 90, w: w - 330, h: h - 170 }, { maxLines: 3 });
    });
    const back = kit.canvasTexture(64, 64, (c, w) => { c.fillStyle = '#f6efe0'; c.fillRect(0, 0, w, w); });
    const geo = kit.keep(new THREE.PlaneGeometry(width, height)), root = new THREE.Group();
    const front = new THREE.Mesh(geo, kit.keep(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .05, roughness: .9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .5 })));
    const rear = new THREE.Mesh(geo, kit.keep(new THREE.MeshStandardMaterial({ map: back, roughness: .95, side: THREE.BackSide })));
    root.add(front, rear);
    return { root, width, height };
  }

  /* ── the road sign's plank: weathered boards, painted words, nails, an arrow up the hill ── */
  function plankTexture(text) {
    const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(77), grain = Array.from({ length: 60 }, () => [r(), r(), r(), r()]);
    return kit.canvasTexture(1024, 460, (c, w, h) => {
      for (let i = 0; i < 3; i++) {                                    // three boards, each its own brown
        const y = i * h / 3, g = c.createLinearGradient(0, y, 0, y + h / 3);
        g.addColorStop(0, ['#b98552', '#a8743f', '#b37d48'][i]); g.addColorStop(1, ['#9c6a3c', '#8f5f32', '#9a673a'][i]);
        c.fillStyle = g; c.fillRect(0, y, w, h / 3);
        c.fillStyle = 'rgba(50,25,10,.55)'; c.fillRect(0, y + h / 3 - 4, w, 4);
      }
      c.strokeStyle = 'rgba(70,40,20,.28)'; c.lineWidth = 2.5;
      for (const [a, b, k, l] of grain) { const y = a * h, x = b * w * .8; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 60, y + 6 * (k - .5), x + 140, y - 6, x + 120 + l * 200, y + 4 * (k - .5)); c.stroke(); }
      c.fillStyle = 'rgba(60,30,12,.45)'; for (const [x, y] of [[.2, .55], [.8, .2]]) { c.beginPath(); c.ellipse(x * w, y * h, 16, 9, .2, 0, TAU); c.fill(); }   // knots
      c.strokeStyle = '#4a2a14'; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14);
      c.fillStyle = '#d9d2c4'; for (const [x, y] of [[30, 30], [w - 30, 30], [30, h - 30], [w - 30, h - 30]]) { c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fill(); }
      c.save(); c.translate(w - 92, h / 2); c.rotate(-.6);              // the arrow: on up the hill
      c.fillStyle = '#fff3d9'; c.beginPath(); c.moveTo(-34, 10); c.lineTo(10, 10); c.lineTo(10, 30); c.lineTo(46, 0); c.lineTo(10, -30); c.lineTo(10, -10); c.lineTo(-34, -10); c.fill(); c.restore();
      const box = { x: 60, y: 40, w: w - 230, h: h - 80 };
      c.fillStyle = 'rgba(55,28,10,.9)';                               // painted letters: a dark edge (the words drawn round about), cream on top
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.save(); c.translate(Math.cos(a) * 7, Math.sin(a) * 7 + 3); fitText(c, text, box, { maxLines: 2 }); c.restore(); }
      c.fillStyle = '#fff4dc'; fitText(c, text, box, { maxLines: 2 });
    });
  }

  return { ik, at, own, frame, notePage, plankTexture, HAND };
};
