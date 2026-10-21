/* Đạp xe đón bình minh: the two of them, for story.js (template.json "story" loads this file before it): their clothes
   (each KayKit character wears one small palette of 8 x 4 flat swatches: parts move onto other swatches, swatches are
   repainted), a two-bone reach for legs and arms (feet on the pedals, hands on the grips, a knee on the ground), and the
   carriers of the card's words that are not the act's own: a page torn from a notebook, the road sign's plank.
     NM_DAWN.cast(kit) → { dressBoy(m), dressGirl(m), ik(m, a, b, end, target, pole, k), at(m, bone, out), notePage(text),
                           plank(text) } */
(window.NM_DAWN = window.NM_DAWN || {}).cast = kit => {
  const { THREE, fitText, HAND } = kit;
  const TAU = Math.PI * 2;

  /** moves the triangles of `part` that sit in swatch `from` ("col,row") and pass `test` on their middle (the model's own
      units, standing in a T) onto swatch `to`: a gauntlet becomes a bare hand, a boot's top a trouser leg */
  function remap(m, part, from, to, test = () => true) {
    const g = m.node(part)?.geometry; if (!g) return;
    const uv = g.attributes.uv, pos = g.attributes.position, idx = g.index, n = idx ? idx.count : uv.count, move = new Set();
    const [fx, fy] = from.split(',').map(Number), [tx, ty] = to.split(',').map(Number), c = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < n; i += 3) {                                  // which corners first, then move them: moving as we go
      const v = [0, 1, 2].map(k => (idx ? idx.getX(i + k) : i + k));    // would take the next triangle's middle out of the swatch
      const u0 = (uv.getX(v[0]) + uv.getX(v[1]) + uv.getX(v[2])) / 3, v0 = (uv.getY(v[0]) + uv.getY(v[1]) + uv.getY(v[2])) / 3;
      if (Math.floor(u0 * 8) !== fx || Math.floor(v0 * 4) !== fy) continue;
      c.x = (pos.getX(v[0]) + pos.getX(v[1]) + pos.getX(v[2])) / 3; c.y = (pos.getY(v[0]) + pos.getY(v[1]) + pos.getY(v[2])) / 3;
      c.z = (pos.getZ(v[0]) + pos.getZ(v[1]) + pos.getZ(v[2])) / 3;
      if (test(c)) v.forEach(j => move.add(j));
    }
    move.forEach(j => uv.setXY(j, uv.getX(j) + (tx - fx) / 8, uv.getY(j) + (ty - fy) / 4));
    uv.needsUpdate = true;
  }
  /** the palette with swatches repainted: { "col,row": [colour, shade] }, each keeping `shade` of its own light and dark */
  function repaint(m, part, colours) {
    const material = m.node(part)?.material, img = material?.map?.image;
    if (!img || !img.width) return;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0);
    const w = img.width / 8, h = img.height / 4;
    for (const [key, [hex, shade]] of Object.entries(colours)) {
      const [cx, cy] = key.split(',').map(Number), d = c.getImageData(cx * w, cy * h, w, h), p = d.data;
      let mean = 0; for (let i = 0; i < p.length; i += 4) mean += p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11;
      mean /= p.length / 4;
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      for (let i = 0; i < p.length; i += 4) {
        const k = 1 + ((p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / (mean || 1) - 1) * shade;
        p[i] = Math.min(255, r * k); p[i + 1] = Math.min(255, g * k); p[i + 2] = Math.min(255, b * k);
      }
      c.putImageData(d, cx * w, cy * h);
    }
    const old = material.map, t = kit.keep(new THREE.CanvasTexture(cv));
    t.colorSpace = old.colorSpace; t.flipY = old.flipY; t.wrapS = old.wrapS; t.wrapT = old.wrapT;
    t.magFilter = old.magFilter; t.minFilter = old.minFilter; t.anisotropy = 4;
    material.map = t; material.needsUpdate = true; old.dispose();
  }
  /** him: black hair, a white shirt with its sleeves rolled to the elbow, navy trousers, brown shoes (the Knight's armour
      gone: gauntlets to hands, vambraces to forearms, boots to trouser legs and shoes, the red crest to a pocket) */
  function dressBoy(m) {
    for (const arm of ['Knight_ArmLeft', 'Knight_ArmRight']) {
      remap(m, arm, '3,0', '0,0', c => Math.abs(c.x) > .74); remap(m, arm, '7,0', '0,0', c => Math.abs(c.x) > .56); remap(m, arm, '6,0', '4,0');
    }
    for (const leg of ['Knight_LegLeft', 'Knight_LegRight']) {
      remap(m, leg, '3,0', '5,1', c => c.y < .1); remap(m, leg, '3,0', '7,1'); remap(m, leg, '7,0', '7,1'); remap(m, leg, '6,0', '7,1');
    }
    remap(m, 'Knight_Body', '7,1', '3,0', c => c.y > .66); remap(m, 'Knight_Body', '0,1', '7,0');
    repaint(m, 'Knight_Body', { '1,0': ['#33313d', .8], '3,0': ['#f7f5f0', .45], '7,0': ['#eef0f4', .45], '4,0': ['#e3e2dc', .5],
      '7,1': ['#2c3d6e', .8], '5,1': ['#6b4630', .8], '6,0': ['#5e3b26', .9] });
  }
  /** her: the hood dusty rose, a honey knit top with long sleeves, a red skirt with a cream sash, dark tights, brown boots,
      chestnut hair; the cowl on her shoulders becomes the scarf (its two ends are built in bike.js) */
  function dressGirl(m, scarf, hood) {
    for (const arm of ['Rogue_ArmLeft', 'Rogue_ArmRight']) { remap(m, arm, '5,2', '0,0', c => Math.abs(c.x) > .84); remap(m, arm, '5,2', '0,1'); remap(m, arm, '5,0', '0,1'); }
    remap(m, 'Rogue_Body', '0,1', '7,1', c => c.y < .55); remap(m, 'Rogue_Body', '6,0', '0,1', c => c.y > .66);
    remap(m, 'Rogue_Body', '3,0', '7,1'); remap(m, 'Rogue_Body', '5,0', '7,1'); remap(m, 'Rogue_Body', '1,1', '2,2');
    for (const leg of ['Rogue_LegLeft', 'Rogue_LegRight']) { remap(m, leg, '7,1', '4,1'); remap(m, leg, '0,0', '4,1'); }
    repaint(m, 'Rogue_Body', { '1,1': [hood, .7], '0,1': ['#e6a640', .7], '7,1': ['#d23c3f', .7], '4,1': ['#3d3248', .7],
      '3,2': ['#6e4632', .8], '1,0': ['#5b3324', .8], '2,2': [scarf, .5], '6,0': ['#f4ead6', .5] });
  }

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

  return { dressBoy, dressGirl, ik, at, own, frame, notePage, plankTexture, HAND };
};
