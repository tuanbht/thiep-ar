/* Máy bay giấy: paper, built in code for story.js (loaded after city.js). A sheet that folds into a dart along its real
   creases (the two top corners over, in half down the middle, the wings out) and opens again; the dashed trails the
   planes leave; the sheets that carry the card's words; threads; his coral tie; a stack of paper.
     NM_PLANES.paper(kit) → { plane(o), trails(max), memo(text) (heart(k) draws hers), letter(text), threads(n), tie(), stack(), FACE } */
(window.NM_PLANES = window.NM_PLANES || {}).paper = kit => {
  const { THREE, clamp, lerp, seg } = kit;
  const TAU = Math.PI * 2;
  const CORAL = '#f26b5b', INK = '#2c3038', PAPER = '#fbf8f0';
  const LEN = Math.SQRT2, KEEL = .16, GAP = .07, DIHEDRAL = .14;     // a sheet 1 wide, √2 long; the keel's depth at the tail
  const XH = KEEL * .5 / LEN;                                        // where the wing's crease crosses the folded corner's edge
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const DIAG = { a: V(0, 0, LEN), d: V(1, 0, -1).normalize() };       // the right corner's crease
  const HINGE = { a: V(KEEL, 0, 0), d: V(-KEEL, 0, LEN).normalize() }; // the right wing's crease, tail to nose
  const AXIS = { a: V(0, 0, 0), d: V(0, 0, 1) };                     // down the middle
  const q = new THREE.Quaternion();
  const turn = (v, ax, ang) => { if (ang) { q.setFromAxisAngle(ax.d, ang); v.sub(ax.a).applyQuaternion(q).add(ax.a); } return v; };
  const mirror = ([x, z]) => {                                        // a point of the folded corner, back where it starts: over the crease
    const p = turn(V(x, 0, z), DIAG, Math.PI); return [p.x, p.z];
  };
  /* the right half in pieces, each a triangle where it lies once the corner is folded over: [points (x, z), a piece of the
     corner, turns with the wing] */
  const PIECES = [
    [[[0, 0], [KEEL, 0], [0, LEN]], false, false],
    [[[KEEL, 0], [.5, 0], [.5, LEN - .5]], false, true],
    [[[KEEL, 0], [.5, LEN - .5], [0, LEN]], false, true],
    [[[0, LEN], [0, LEN - .5], [XH, LEN - .5]], true, false],
    [[[0, LEN], [XH, LEN - .5], [.5, LEN - .5]], true, true]
  ];
  const VERTS = [];                                                   // [x, z flat on the table, corner, wing, side]
  for (const side of [1, -1]) for (const [pts, corner, wing] of PIECES) {
    const flat = pts.map(p => (corner ? mirror(p) : p)).map(([x, z]) => [x * side, z]);
    const [a, b, c] = flat, up = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0;   // the written face up
    for (const p of up ? [a, b, c] : [a, c, b]) VERTS.push([p[0], p[1], corner, wing, side]);
  }
  const vP = V(0, 0, 0), FOLDED = V(0, KEEL * .55, LEN * .48), PITCH = Math.atan2(KEEL, LEN);
  /** k: 0 flat, 1 a plane (corners by .35, the middle by .7, the wings by 1); flex: the wings' give, in radians */
  function shape(pos, k, flex) {
    const f1 = clamp(k / .35), f2 = clamp((k - .3) / .4), f3 = clamp((k - .62) / .38);
    const cy = lerp(0, FOLDED.y, f2), cz = lerp(LEN / 2, FOLDED.z, f2), pitch = PITCH * f3, cp = Math.cos(pitch), sp = Math.sin(pitch);
    VERTS.forEach(([x, z, corner, wing, side], i) => {
      vP.set(Math.abs(x), 0, z);
      if (corner) { turn(vP, DIAG, -Math.PI * f1); vP.y += .008 * f1; }   // over onto the sheet, a hair above it
      if (wing) turn(vP, HINGE, -(Math.PI / 2 - DIHEDRAL) * f3 + flex * f3);
      turn(vP, AXIS, (Math.PI / 2 - GAP) * f2);
      const px = vP.x * side, py = vP.y - cy, pz = vP.z - cz;           // its middle at the origin, the wings level
      pos.setXYZ(i, px, py * cp - pz * sp, py * sp + pz * cp);
    });
  }
  /** a sheet that folds: { root, set(k, flex) }; o.face: a texture for its written face (the other side stays plain) */
  function plane(o = {}) {
    const g = kit.keep(new THREE.BufferGeometry()), n = VERTS.length;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(VERTS.flatMap(([x, z]) => [z / LEN, x + .5])), 2));
    const root = new THREE.Group(), glow = o.glow ?? .32;
    const front = kit.keep(new THREE.MeshStandardMaterial({ color: o.color ?? PAPER, roughness: .9, side: o.face ? THREE.FrontSide : THREE.DoubleSide,
      map: o.face || PLAIN, emissive: 0xffffff, emissiveMap: o.face || PLAIN, emissiveIntensity: glow }));
    const m = new THREE.Mesh(g, front); m.castShadow = true; root.add(m);
    if (o.face) {                                                    // the back of a written sheet is blank
      const back = new THREE.Mesh(g, kit.keep(new THREE.MeshStandardMaterial({ color: PAPER, roughness: .95, side: THREE.BackSide, map: PLAIN, emissive: 0xffffff, emissiveMap: PLAIN, emissiveIntensity: glow * .8 })));
      back.castShadow = true; root.add(back);
    }
    let last = -1, lastFlex = 0;
    return {
      root, front,
      set(k, flex = 0) {
        if (Math.abs(k - last) < 1e-4 && Math.abs(flex - lastFlex) < 1e-4) return;
        last = k; lastFlex = flex; shape(g.attributes.position, k, flex);
        g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
      }
    };
  }
  /** turns a flat sheet's written face to the phone: its long side across, upright */
  const FACE = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(1, 0, 0)));

  /* plain office paper, faintly ruled: the planes' own */
  const PLAIN = kit.canvasTexture(256, 182, (c, W, H) => {
    c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(90,110,140,.18)'; c.lineWidth = 2; for (let y = 22; y < H; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.strokeStyle = 'rgba(200,90,80,.2)'; c.beginPath(); c.moveTo(30, 0); c.lineTo(30, H); c.stroke();
  });

  /* the creases a sheet keeps once it has been a plane, drawn on its face (canvas: long side across, the nose at the right) */
  function creases(c, W, H) {
    const X = z => z / LEN * W, Y = x => (.5 - x) * H;
    c.save(); c.strokeStyle = 'rgba(60,70,90,.16)'; c.lineWidth = 3;
    for (const [x0, z0, x1, z1] of [[0, 0, 0, LEN], [KEEL, 0, 0, LEN], [-KEEL, 0, 0, LEN], [.5, LEN - .5, 0, LEN], [-.5, LEN - .5, 0, LEN]]) {
      c.beginPath(); c.moveTo(X(z0), Y(x0)); c.lineTo(X(z1), Y(x1)); c.stroke();
    }
    c.restore();
  }
  /** a heart drawn by hand up to k (0..1) of its outline, then filled: { x, y } its middle, s its width */
  function drawnHeart(c, x, y, s, k) {
    if (k <= 0) return;
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const t = Math.PI + i / 64 * TAU;                                // from the bottom tip, up the left, round and back
      pts.push([x + Math.sin(t) ** 3 * s * .5, y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 * s * .5 - s * .05]);
    }
    const n = Math.max(1, Math.round(k * 64));
    if (k >= 1) { c.fillStyle = 'rgba(242,107,91,.3)'; c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.fill(); }
    c.strokeStyle = CORAL; c.lineWidth = s * .09; c.lineCap = c.lineJoin = 'round';
    c.beginPath(); for (let i = 0; i <= n; i++) (i ? c.lineTo : c.moveTo).call(c, pts[i][0], pts[i][1]); c.stroke();
  }

  /** the sheet from his stack she draws a heart on: typed report lines, the card's first words written over them and her
      heart in the corner; heart(k) draws it up to k */
  function memo(text) {
    let k = 0;
    const draw = (c, W, H) => {
      c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(60,66,78,.5)'; c.font = '700 30px "Be Vietnam Pro", "Segoe UI", sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText('BÁO CÁO TUẦN · SỐ 12', 60, 52);
      c.fillStyle = 'rgba(60,66,78,.12)';                             // typed lines, too faint to read
      for (let i = 0; i < 9; i++) { const w = 560 + ((i * 137) % 300); c.fillRect(60, 98 + i * 64, i === 8 ? w * .4 : w, 14); }
      c.strokeStyle = 'rgba(60,66,78,.3)'; c.lineWidth = 3; c.beginPath(); c.moveTo(60, 78); c.lineTo(W - 60, 78); c.stroke();
      c.fillStyle = INK; kit.fitText(c, text, { x: 70, y: 110, w: W - 330, h: H - 170 }, { maxLines: 3, max: 120 });
      drawnHeart(c, W - 150, H - 150, 190, k);
    };
    const tex = kit.canvasTexture(1024, 724, draw);
    return { tex, heart(v) { const n = Math.round(clamp(v) * 24) / 24; if (n === k) return; k = n; const c = tex.image.getContext('2d'); c.clearRect(0, 0, 1024, 724); draw(c, 1024, 724); tex.needsUpdate = true; } };
  }
  /** the plane he wrote on: the card's second words, the creases, a little plane and its dashed path in the corner */
  function letter(text) {
    return kit.canvasTexture(1024, 724, (c, W, H) => {
      c.fillStyle = PAPER; c.fillRect(0, 0, W, H); creases(c, W, H);
      c.fillStyle = INK; kit.fitText(c, text, { x: 80, y: 70, w: W - 160, h: H - 200 }, { maxLines: 3, max: 124 });
      c.strokeStyle = 'rgba(44,48,56,.55)'; c.lineWidth = 5; c.setLineDash([16, 12]);
      c.beginPath(); c.moveTo(90, H - 70); c.bezierCurveTo(260, H - 150, 380, H - 30, 560, H - 92); c.stroke(); c.setLineDash([]);
      c.fillStyle = INK; c.beginPath(); c.moveTo(616, H - 112); c.lineTo(560, H - 120); c.lineTo(574, H - 92); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(616, H - 112); c.lineTo(574, H - 92); c.lineTo(580, H - 76); c.closePath(); c.fill();
      c.font = '700 54px "Dancing Script", cursive'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText('gửi em', W - 80, H - 80);
    });
  }

  /* ── dashed trails: each dash a point drawn as a short stroke along the way it was flying ── */
  function trails(max) {
    const g = kit.keep(new THREE.BufferGeometry());
    const A = {}, attr = (name, n) => { A[name] = new Float32Array(max * n); g.setAttribute(name, new THREE.BufferAttribute(A[name], n).setUsage(THREE.DynamicDrawUsage)); };
    attr('position', 3); attr('aDir', 3); attr('aColor', 3); attr('aAlpha', 1); attr('aSize', 1);
    const m = kit.keep(new THREE.ShaderMaterial({
      uniforms: { uHalfH: { value: 400 }, uAspect: { value: 1 } },
      vertexShader: `attribute vec3 aDir, aColor; attribute float aAlpha, aSize; uniform float uHalfH, uAspect;
        varying vec3 vColor; varying float vAlpha; varying vec2 vD;
        void main() { vColor = aColor; vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0), a = projectionMatrix * mv, b = projectionMatrix * modelViewMatrix * vec4(position + aDir, 1.0);
          vec2 d = b.xy / b.w - a.xy / a.w; d.x *= uAspect; vD = length(d) > 1e-6 ? normalize(d) : vec2(1.0, 0.0);
          gl_Position = a; gl_PointSize = aAlpha <= 0.0 ? 0.0 : aSize * projectionMatrix[1][1] * uHalfH / max(0.001, -mv.z); }`,
      fragmentShader: `varying vec3 vColor; varying float vAlpha; varying vec2 vD;
        void main() { vec2 p = gl_PointCoord - 0.5; p.y = -p.y;
          float u = dot(p, vD), v = dot(p, vec2(-vD.y, vD.x));
          float a = (1.0 - smoothstep(0.32, 0.46, abs(u))) * (1.0 - smoothstep(0.07, 0.12, abs(v))) * vAlpha;
          if (a < 0.02) discard; gl_FragColor = vec4(vColor, a); }`,
      transparent: true, depthWrite: false
    }));
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5;
    const v2 = new THREE.Vector2(), col = new THREE.Color();
    pts.onBeforeRender = r => { r.getDrawingBufferSize(v2); m.uniforms.uHalfH.value = v2.y / 2; m.uniforms.uAspect.value = v2.x / Math.max(1, v2.y); };
    let n = 0;
    return {
      root: pts,
      begin() { n = 0; },
      /** one dash at p, along d (a vector: only its way counts), a its opacity, s its length */
      dash(p, d, a, s, color) {
        if (n >= max || a <= .01) return;
        A.position.set([p.x, p.y, p.z], n * 3); A.aDir.set([d.x, d.y, d.z], n * 3); col.set(color); A.aColor.set([col.r, col.g, col.b], n * 3);
        A.aAlpha[n] = a; A.aSize[n] = s; n++;
      },
      end() { A.aAlpha.fill(0, n); for (const k of Object.keys(A)) g.attributes[k].needsUpdate = true; }
    };
  }

  /** threads from the planes down to what they carry: n segments, set(i, from, to) */
  function threads(n) {
    const g = kit.keep(new THREE.BufferGeometry()), p = new Float32Array(n * 6);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3).setUsage(THREE.DynamicDrawUsage));
    const lines = new THREE.LineSegments(g, kit.keep(new THREE.LineBasicMaterial({ color: 0x4a4f58, transparent: true, opacity: .85 })));
    lines.frustumCulled = false;
    return { root: lines, set(i, a, b) { p.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); g.attributes.position.needsUpdate = true; }, opacity(v) { lines.material.opacity = .85 * v; lines.visible = v > .01; } };
  }

  /** his tie: a knot and a blade, coral; its top at the origin, hanging down -y, its face to +z */
  function tie() {
    const s = new THREE.Shape([[-.35, 0], [.35, 0], [.2, -.45], [.55, -2.6], [0, -3.2], [-.55, -2.6], [-.2, -.45]].map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: .25, bevelEnabled: true, bevelThickness: .08, bevelSize: .06, bevelSegments: 1 });
    geo.translate(0, 0, -.12); geo.scale(.01, .01, .01);
    const m = new THREE.Mesh(kit.keep(geo), kit.keep(new THREE.MeshStandardMaterial({ color: CORAL, roughness: .55, emissive: CORAL, emissiveIntensity: .12 })));
    m.castShadow = true;
    const root = new THREE.Group(); root.add(m); return root;
  }
  /** a stack of paper: n sheets high, its top face ruled */
  function stack() {
    const side = kit.canvasTexture(64, 64, (c, W, H) => { c.fillStyle = '#f1ede3'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(80,80,80,.35)'; c.lineWidth = 1; for (let y = 2; y < H; y += 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } });
    const top = kit.keep(new THREE.MeshStandardMaterial({ map: PLAIN, roughness: .9, emissive: 0xffffff, emissiveMap: PLAIN, emissiveIntensity: .25 }));
    const edge = kit.keep(new THREE.MeshStandardMaterial({ map: side, roughness: .9 }));
    const m = new THREE.Mesh(kit.keep(new THREE.BoxGeometry(.046, .016, .064)), [edge, edge, top, edge, edge, edge]); m.castShadow = true; m.position.y = .008;
    const root = new THREE.Group(); root.add(m);
    return { root, set(h) { m.scale.y = Math.max(.05, h); m.position.y = .008 * Math.max(.05, h); } };
  }

  return { plane, trails, memo, letter, threads, tie, stack, FACE };
};
