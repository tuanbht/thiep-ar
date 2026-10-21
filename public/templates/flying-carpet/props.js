/* Thảm bay đêm trăng: the things the story carries and moves, built in code (template.json "story" loads this file after
   scenery.js, before story.js): the flying rug, a woven cloth whose corners ripple, flap in the wind, bow and curl up shyly,
   with a fringe of tassels at both ends; his black hair; the tails of her headscarf and of his sash; the three things the
   card's words appear on (a scroll that unrolls, a night cloud the stars write on, a woven banner the sky lanterns lift);
   and the cast's new colours.
     NM_CARPET.props(kit) → { rug, hair, tail, flutter, scroll, cloudNote, banner, dress } */
(window.NM_CARPET = window.NM_CARPET || {}).props = kit => {
  const { THREE, ease, clamp, lerp, fitText } = kit;
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .8, ...o }));
  const geo = g => kit.keep(g);
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo(g), m); o.position.set(x, y, z); o.castShadow = true; return o; };
  const C = { rose: '#b72f4a', navy: '#232a5c', gold: '#f0b54a', cream: '#fff0d4', plum: '#6d2457', ink: '#3d1838' };

  /* ── the rug: L long (its +z is its front), W wide, lying in its own xz plane; riders sit on its middle ── */
  function wovenTop(c, w, h) {                                       // a rose field, a navy border with a gold zigzag, a heart medallion
    const r = seeded(31);
    c.fillStyle = C.rose; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(${y % 6 ? '255,220,220' : '60,0,20'},${.05 + r() * .05})`; c.fillRect(0, y, w, 1.5); }   // the weave
    const band = (k, fill) => { c.fillStyle = fill; c.fillRect(k, k, w - 2 * k, h - 2 * k); };
    band(0, C.navy); band(30, C.cream); band(42, C.rose);
    c.strokeStyle = C.gold; c.lineWidth = 5; c.lineJoin = 'round';     // the running zigzag in the border, all round
    const zig = (x0, y0, x1, y1, n) => { c.beginPath(); for (let i = 0; i <= n; i++) { const t = i / n, o = i % 2 ? 7 : -7, dx = (y1 - y0) ? o : 0, dy = (x1 - x0) ? o : 0; c.lineTo(lerp(x0, x1, t) + dx, lerp(y0, y1, t) + dy); } c.stroke(); };
    zig(15, 15, w - 15, 15, 34); zig(15, h - 15, w - 15, h - 15, 34); zig(15, 15, 15, h - 15, 40); zig(w - 15, 15, w - 15, h - 15, 40);
    for (let x = 52; x < w - 48; x += 22) for (const y of [36, h - 36]) { c.fillStyle = (x / 22) % 2 < 1 ? C.rose : C.navy; c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 5, y); c.lineTo(x, y + 5); c.lineTo(x - 5, y); c.fill(); }
    for (let y = 52; y < h - 48; y += 22) for (const x of [36, w - 36]) { c.fillStyle = (y / 22) % 2 < 1 ? C.rose : C.navy; c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 5, y); c.lineTo(x, y + 5); c.lineTo(x - 5, y); c.fill(); }
    const star = (x, y, s, fill) => { c.fillStyle = fill; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? s * .45 : s; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); };
    for (let y = 80, row = 0; y < h - 60; y += 46, row++) for (let x = 74 + (row % 2) * 32; x < w - 60; x += 64) star(x, y, 11, row % 2 ? C.gold : C.cream);   // little eight-point stars
    const lozenge = (x, y, rx, ry, fill, stroke) => { c.beginPath(); c.moveTo(x, y - ry); c.lineTo(x + rx, y); c.lineTo(x, y + ry); c.lineTo(x - rx, y); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 5; c.stroke(); } };
    lozenge(w / 2, h / 2, w * .34, h * .3, C.navy, C.gold); lozenge(w / 2, h / 2, w * .25, h * .22, C.cream, C.navy); lozenge(w / 2, h / 2, w * .16, h * .14, C.gold);
    c.fillStyle = C.rose; kit.heartPath(c, w / 2, h / 2 + 4, w * .2); c.fill(); c.strokeStyle = C.cream; c.lineWidth = 4; c.stroke();
    for (const [x, y] of [[54, 54], [w - 54, 54], [54, h - 54], [w - 54, h - 54]]) { lozenge(x, y, 30, 30, C.navy, C.gold); star(x, y, 9, C.gold); }   // the corners
  }
  function wovenBack(c, w, h) {                                      // its underside: the same rug, faded and coarse
    c.fillStyle = '#c9707e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7d3a55'; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14);
    c.fillStyle = 'rgba(255,236,210,.35)'; c.beginPath(); c.moveTo(w / 2, h * .22); c.lineTo(w * .82, h / 2); c.lineTo(w / 2, h * .78); c.lineTo(w * .18, h / 2); c.fill();
  }
  function threads(c, w, h) {                                        // the fringe: cream threads in tassels, knotted at the top
    const r = seeded(5);
    for (let x = 4; x < w; x += 10) {
      c.strokeStyle = r() < .2 ? '#f0b54a' : '#fff4dc'; c.lineWidth = 3;
      for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * 1.6, 10); c.lineTo(x + k * 2.6 + (r() - .5) * 3, h - 2 - r() * 8); c.stroke(); }
      c.fillStyle = '#e8c48a'; c.beginPath(); c.ellipse(x, 9, 4, 6, 0, 0, TAU); c.fill();
    }
  }
  function rug({ L = .36, W = .3, nx = 18, nz = 24 } = {}) {
    const root = new THREE.Group(), g = geo(new THREE.PlaneGeometry(W, L, nx, nz).rotateX(-Math.PI / 2));
    const pos = g.attributes.position, n = pos.count, bx = new Float32Array(n), bz = new Float32Array(n);
    for (let i = 0; i < n; i++) { bx[i] = pos.getX(i); bz[i] = pos.getZ(i); }
    const top = kit.canvasTexture(512, 616, wovenTop), under = kit.canvasTexture(256, 308, wovenBack);
    const face = new THREE.Mesh(g, mat('#ffffff', { map: top, roughness: .95, emissive: 0xffffff, emissiveMap: top, emissiveIntensity: .1 }));
    const back = new THREE.Mesh(g, mat('#ffffff', { map: under, roughness: 1, side: THREE.BackSide }));
    face.castShadow = back.castShadow = true; face.receiveShadow = true; root.add(face, back);
    const tasselTex = kit.canvasTexture(256, 64, threads); tasselTex.wrapS = THREE.RepeatWrapping;
    const ends = [0, nz].map(row => {                                // the fringe at the back (row 0) and at the front (row nz)
      const fg = geo(new THREE.BufferGeometry()), fp = new Float32Array((nx + 1) * 6), uv = new Float32Array((nx + 1) * 4), idx = [];
      for (let i = 0; i <= nx; i++) { uv.set([i / nx * 3, 1], i * 2); uv.set([i / nx * 3, 0], (nx + 1 + i) * 2); if (i < nx) idx.push(i, nx + 1 + i, i + 1, i + 1, nx + 1 + i, nx + 2 + i); }
      fg.setAttribute('position', new THREE.BufferAttribute(fp, 3).setUsage(THREE.DynamicDrawUsage)); fg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); fg.setIndex(idx);
      const m = new THREE.Mesh(fg, mat('#ffffff', { map: tasselTex, alphaTest: .4, side: THREE.DoubleSide, roughness: .9 })); m.castShadow = true; m.frustumCulled = false; root.add(m);
      return { m, row, out: row ? 1 : -1 };
    });
    const FL = .026;                                                 // how long the tassels hang
    let state = {};
    /** the cloth's height at (x, z) in its own space, before a corner curls */
    function heightAt(x, z, o = state) {
      const { T = 0, wind = 0, bow = 0, sag = 0, wave = 0 } = o, s = x / (W / 2), u = z / (L / 2);
      const e = .2 + .8 * ease.smooth(Math.max(clamp((Math.abs(s) - .55) / .4), clamp((Math.abs(u + .05) - .42) / .5)));   // calm where they sit
      return e * (.0045 * Math.sin(T * 3.1 - z * 26 + s * 1.5) + .0028 * Math.sin(T * 4.7 + x * 30 - z * 9))   // a slow swell running back
        + wind * e * .012 * Math.sin(T * 10 - z * 36) * (.65 - u * .45)                     // in the wind its back flaps hardest
        + wind * .02 * Math.max(0, u) ** 2 - .005 * e * e                                   // its front lifts into the wind; the rim droops
        - bow * .055 * Math.max(0, (u - .15) / .85) ** 2                                     // a bow: its front edge dips
        - sag * .012 * (1 - e) + wave * .035 * Math.max(0, u - .35) * s * s * Math.sin(T * 8 + s * 2);   // weight in the middle; its corners wave
    }
    /** o: { T, wind, bow, sag, wave, curl (0..1), side (which front corner curls: 1 its +x, -1 its -x) } */
    function update(o) {
      state = o;
      const curl = o.curl || 0, cs = o.side || 1, f = .11;            // the curl rolls the corner up past a fold line f in from it
      const cx = cs * W / 2, cz = L / 2, dl = Math.hypot(cx, cz), ox = cx / dl, oz = cz / dl, k = curl * Math.PI * 1.05 / f;
      for (let i = 0; i < n; i++) {
        let x = bx[i], z = bz[i], y = heightAt(x, z, o);
        const b = f - ((cx - x) * ox + (cz - z) * oz);              // how far past the fold line, towards the corner
        if (b > 0 && k > 1e-4) { const a = b * k, along = Math.sin(a) / k; y += (1 - Math.cos(a)) / k; x += ox * (along - b); z += oz * (along - b); }
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true; g.computeVertexNormals();
      const wind = o.wind || 0, T = o.T || 0;
      for (const end of ends) {                                      // tassels hang off each end; in the wind they stream back
        const fa = end.m.geometry.attributes.position, fp = fa.array, back = end.out < 0;
        const dy = back ? -1 + wind * .75 : -1 + wind * .45, dz = back ? -.25 - wind * 1.1 : .3 - wind * .9, dl2 = Math.hypot(dy, dz);
        for (let i = 0; i <= nx; i++) {
          const v = end.row * (nx + 1) + i, x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v), sw = .25 * Math.sin(T * (9 + wind * 8) + i * 1.3) * (.3 + wind);
          fp[i * 3] = x; fp[i * 3 + 1] = y; fp[i * 3 + 2] = z;
          fp[(nx + 1 + i) * 3] = x + sw * FL * .3; fp[(nx + 1 + i) * 3 + 1] = y + FL * (dy + sw * .4) / dl2; fp[(nx + 1 + i) * 3 + 2] = z + FL * dz / dl2;
        }
        fa.needsUpdate = true;
      }
    }
    update({});
    return { root, L, W, update, heightAt, face };
  }

  /* ── his black hair, in his head bone's own units (the head runs x ±.54, y −.1 to .95, its face at z .53) ── */
  function hair() {
    const g = new THREE.Group(), m = mat('#2a2125', { roughness: .62 });
    const cap = mesh(new THREE.SphereGeometry(1, 22, 14, 0, TAU, 0, Math.PI * .56), m, 0, .45, -.01);   // hugging the crown, low at the back
    cap.scale.set(.59, .565, .57); cap.rotation.x = -.52; g.add(cap);
    for (const [x, y, z, sx, rz, rx] of [[-.26, .83, .42, .9, .5, .45], [.0, .87, .43, 1, .32, .5], [.25, .84, .41, .85, .18, .47]]) {
      const t = mesh(new THREE.SphereGeometry(.17, 12, 8), m, x, y, z); t.scale.set(sx * 1.2, .45, .7); t.rotation.set(rx, 0, rz); g.add(t);   // a fringe swept to one side
    }
    for (const s of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(.06, .22, .14), m, s * .55, .5, .16); b.rotation.z = s * .04; g.add(b); }   // sideburns
    return g;
  }

  /* ── cloth tails that stream in the wind: a strip on a pin, rippling down its length (her headscarf, his sash) ── */
  function tail(color, trim, w, len, arc = 2.2) {
    const tex = kit.canvasTexture(64, 256, (c, W, H) => { c.fillStyle = color; c.fillRect(0, 0, W, H); c.fillStyle = trim; c.fillRect(0, 0, 6, H); c.fillRect(W - 6, 0, 6, H); c.fillRect(0, H - 14, W, 8); });
    const g = new THREE.PlaneGeometry(w, len, 6, 10).translate(0, -len / 2, 0), gp = g.attributes.position, R = w / arc;
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i); gp.setXYZ(i, R * Math.sin(x / R), gp.getY(i), R * (1 - Math.cos(x / R))); }   // curled across, as cloth drapes: no edge-on sliver
    g.computeVertexNormals();
    const pin = new THREE.Group(), strip = mesh(g, mat('#ffffff', { map: tex, side: THREE.DoubleSide, roughness: .7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .12 }));
    pin.add(strip);
    const p = strip.geometry.attributes.position, base = Float32Array.from({ length: p.count * 3 }, (_, i) => p.array[i]);
    return { pin, strip, base, len };
  }
  /** lift: how far (radians) it streams back from hanging; amp: how much it ripples */
  function flutter(t, lift, T, amp, ph = 0) {
    t.pin.rotation.x = lift;
    const p = t.strip.geometry.attributes.position, b = t.base;
    for (let i = 0; i < p.count; i++) {
      const s = -b[i * 3 + 1] / t.len;                               // 0 at the pin, 1 at its end
      p.setZ(i, b[i * 3 + 2] - t.len * s * s * (amp * .09 * Math.sin(T * 11 + ph - s * 5) + lift * .1));
      p.setX(i, b[i * 3] + t.len * s * s * amp * .03 * Math.sin(T * 7 + ph));
    }
    p.needsUpdate = true; t.strip.geometry.computeVertexNormals();
  }

  /** a canvas-faced plane revealed from one edge without squashing: set(k) shows k of it (the texture is cut, not squeezed) */
  function wipe(tex, w, h, axis, material) {
    const g = axis === 'x' ? new THREE.PlaneGeometry(w, h).translate(w / 2, 0, 0) : new THREE.PlaneGeometry(w, h).translate(0, -h / 2, 0);
    const m = new THREE.Mesh(geo(g), material);
    return { m, set(k) {
      k = Math.max(.001, k);
      if (axis === 'x') { m.scale.x = k; tex.repeat.set(k, 1); tex.offset.set(0, 0); } else { m.scale.y = k; tex.repeat.set(1, k); tex.offset.set(0, 1 - k); }
    } };
  }

  /* ── the first words: a parchment scroll between two gilded rods, unrolling downwards from its top rod ── */
  function scroll(text) {
    const W = .5, H = .22, root = new THREE.Group();
    const tex = kit.canvasTexture(1024, 450, (c, w, h) => {
      const r = seeded(11), g = c.createLinearGradient(0, 0, 0, h);
      [[0, '#efd6a2'], [.1, '#fbf0d6'], [.9, '#fbf0d6'], [1, '#ecd09a']].forEach(([k, col]) => g.addColorStop(k, col)); c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 420; i++) { c.fillStyle = `rgba(140,96,48,${.03 + r() * .07})`; c.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 2); }
      c.strokeStyle = '#c9952f'; c.lineWidth = 9; c.strokeRect(30, 26, w - 60, h - 52); c.strokeStyle = C.plum; c.lineWidth = 3; c.strokeRect(46, 42, w - 92, h - 84);
      for (const [x, y] of [[46, 42], [w - 46, 42], [46, h - 42], [w - 46, h - 42]]) {   // a crescent and a star at each corner
        c.fillStyle = '#c9952f'; c.beginPath(); c.arc(x, y, 17, 0, TAU); c.fill(); c.fillStyle = '#fbf0d6'; c.beginPath(); c.arc(x + 6, y - 4, 14, 0, TAU); c.fill();
        c.fillStyle = C.plum; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 3 : 7; c.lineTo(x - 5 + Math.cos(a) * rr, y + 3 + Math.sin(a) * rr); } c.fill();
      }
      c.fillStyle = C.ink; fitText(c, text, { x: 78, y: 52, w: w - 156, h: h - 104 }, { maxLines: 3 });
    });
    const paper = wipe(tex, W, H, 'y', mat('#ffffff', { map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .5, roughness: .9, side: THREE.DoubleSide }));
    root.add(paper.m);
    const gild = mat('#d9a441', { roughness: .35, metalness: .6, emissive: 0x6b4a10, emissiveIntensity: .3 }), wood = mat('#7a3f2a', { roughness: .5 });
    const rod = r => { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(r, r, W + .03, 12).rotateZ(Math.PI / 2), wood));
      for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(r * 1.6, 10, 8), gild, s * (W / 2 + .022), 0, 0)); return g; };
    const topRod = rod(.008), roll = rod(.011); root.add(topRod, roll);
    return { root, W, H, set(k) { paper.set(k); roll.position.y = -H * Math.max(.001, k); roll.scale.setScalar(lerp(1.5, 1, k)); } };
  }

  /* ── the second words: a night cloud that the stars write on, left to right ── */
  function cloudNote(text) {
    const W = .54, H = .236, root = new THREE.Group();
    const lumps = [[.2, .62, .2], [.36, .42, .24], [.55, .36, .27], [.74, .44, .23], [.86, .62, .17], [.5, .7, .3], [.14, .78, .13], [.3, .8, .2], [.7, .8, .22], [.9, .82, .1]];
    const shape = kit.canvasTexture(1024, 448, (c, w, h) => {
      const blob = (grow) => { c.beginPath(); for (const [x, y, r] of lumps) { c.moveTo(x * w + r * h * 1.1 + grow, y * h); c.arc(x * w, y * h, r * h * 1.1 + grow, 0, TAU); } };
      c.save(); c.shadowColor = 'rgba(190,200,255,.75)'; c.shadowBlur = 30; c.fillStyle = '#9c9be0'; blob(4); c.fill(); c.restore();
      const g = c.createLinearGradient(0, h * .1, 0, h); g.addColorStop(0, '#7f7fcf'); g.addColorStop(1, '#4d4c97'); c.fillStyle = g; blob(0); c.fill();
      c.save(); blob(0); c.clip(); c.strokeStyle = 'rgba(215,215,255,.55)'; c.lineWidth = 10;   // moonlit tops on the lumps
      for (const [x, y, r] of lumps) { c.beginPath(); c.arc(x * w, y * h, r * h * 1.05, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); } c.restore();
    });
    const words = kit.canvasTexture(1024, 448, (c, w, h) => {
      c.save(); c.shadowColor = '#ffcf5c'; c.shadowBlur = 22; c.fillStyle = '#fff6d2';
      fitText(c, text, { x: 84, y: 96, w: w - 168, h: h - 120 }, { maxLines: 3 }); c.restore();
      c.fillStyle = '#fffbea'; fitText(c, text, { x: 84, y: 96, w: w - 168, h: h - 120 }, { maxLines: 3 });
    });
    const body = new THREE.Mesh(geo(new THREE.PlaneGeometry(W, H)), kit.keep(new THREE.MeshBasicMaterial({ map: shape, transparent: true, alphaTest: .02, depthWrite: false, toneMapped: false })));
    const line = wipe(words, W, H, 'x', kit.keep(new THREE.MeshBasicMaterial({ map: words, transparent: true, depthWrite: false, toneMapped: false })));
    line.m.position.set(-W / 2, 0, .002); body.renderOrder = 7; line.m.renderOrder = 8; root.add(body, line.m);
    return { root, W, H, body, write: line.set, ink: line.m.material };
  }

  /* ── the last words: a woven runner with tassels, hung from a gilded rod under three sky lanterns ── */
  function banner(text) {
    const W = .62, H = .2, root = new THREE.Group();
    const tex = kit.canvasTexture(1024, 330, (c, w, h) => {
      const r = seeded(19), fr = 54;                                 // fr: the fringe at each end
      c.fillStyle = '#fff3dc'; c.fillRect(fr, 0, w - 2 * fr, h);
      for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(120,60,40,${.03 + r() * .03})`; c.fillRect(fr, y, w - 2 * fr, 1.4); }
      c.fillStyle = C.plum; c.fillRect(fr, 0, w - 2 * fr, 26); c.fillRect(fr, h - 26, w - 2 * fr, 26); c.fillRect(fr, 0, 22, h); c.fillRect(w - fr - 22, 0, 22, h);
      c.strokeStyle = C.gold; c.lineWidth = 4; for (const y of [13, h - 13]) { c.beginPath(); for (let x = fr + 4, i = 0; x < w - fr; x += 16, i++) c.lineTo(x, y + (i % 2 ? 6 : -6)); c.stroke(); }
      for (let y = 40; y < h - 30; y += 30) for (const x of [fr + 11, w - fr - 11]) { c.fillStyle = C.gold; c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 7, y); c.lineTo(x, y + 7); c.lineTo(x - 7, y); c.fill(); }
      for (let y = 6; y < h; y += 9) for (const [x0, d] of [[fr, -1], [w - fr, 1]]) {   // the tassels at its ends
        c.strokeStyle = r() < .25 ? C.gold : '#f6e4c4'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + d * (fr - 6 - r() * 10), y + (r() - .5) * 4); c.stroke();
      }
      c.fillStyle = '#5a1d47'; fitText(c, text, { x: fr + 36, y: 30, w: w - 2 * fr - 72, h: h - 60 }, { maxLines: 2 });
    });
    const cloth = wipe(tex, W, H, 'y', mat('#ffffff', { map: tex, transparent: true, alphaTest: .3, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .45, roughness: .9 }));
    root.add(cloth.m);
    const gild = mat('#d9a441', { roughness: .35, metalness: .6, emissive: 0x6b4a10, emissiveIntensity: .3 });
    root.add(mesh(new THREE.CylinderGeometry(.006, .006, W - .06, 10).rotateZ(Math.PI / 2), gild), ...[-1, 1].map(s => mesh(new THREE.SphereGeometry(.01, 10, 8), gild, s * (W / 2 - .03), 0, 0)));
    return { root, W, H, set: cloth.set };
  }

  /* ── the cast's colours: each palette is one texture of 8 x 4 flat swatches ── */
  const cell = (cx, cy) => ({ cx, cy });
  /** moves the triangles of `part` that sit in swatch `from` onto swatch `to`, those between heights lo and hi (model units) */
  function remap(part, from, to, lo = -Infinity, hi = Infinity) {
    const uv = part?.geometry?.attributes.uv, pos = part?.geometry?.attributes.position; if (!uv) return;
    const idx = part.geometry.index, n = idx ? idx.count : uv.count, move = new Set();
    for (let i = 0; i < n; i += 3) {                                 // find them all first: moving as we go would take a shared
      const v = [0, 1, 2].map(k => (idx ? idx.getX(i + k) : i + k));  // corner out of the swatch before its next triangle is seen
      const u0 = (uv.getX(v[0]) + uv.getX(v[1]) + uv.getX(v[2])) / 3, v0 = (uv.getY(v[0]) + uv.getY(v[1]) + uv.getY(v[2])) / 3;
      const y = (pos.getY(v[0]) + pos.getY(v[1]) + pos.getY(v[2])) / 3;
      if (Math.floor(u0 * 8) === from.cx && Math.floor(v0 * 4) === from.cy && y > lo && y < hi) v.forEach(j => move.add(j));
    }
    move.forEach(j => uv.setXY(j, uv.getX(j) + (to.cx - from.cx) / 8, uv.getY(j) + (to.cy - from.cy) / 4));
    uv.needsUpdate = true;
  }
  /** the palette with swatches in new colours, each keeping its own light and shade */
  function repaint(m, part, colours) {
    const material = m.node(part)?.material, img = material?.map?.image;
    if (!img || !img.width) return;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0);
    const w = img.width / 8, h = img.height / 4;
    for (const [key, hex] of Object.entries(colours)) {
      const [cx, cy] = key.split(',').map(Number), d = c.getImageData(cx * w, cy * h, w, h), p = d.data;
      let mean = 0; for (let i = 0; i < p.length; i += 4) mean += p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11;
      mean /= p.length / 4;
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      for (let i = 0; i < p.length; i += 4) {
        const k = (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / (mean || 1);
        p[i] = Math.min(255, r * k); p[i + 1] = Math.min(255, g * k); p[i + 2] = Math.min(255, b * k);
      }
      c.putImageData(d, cx * w, cy * h);
    }
    const old = material.map, t = kit.keep(new THREE.CanvasTexture(cv));
    t.colorSpace = old.colorSpace; t.flipY = old.flipY; t.wrapS = old.wrapS; t.wrapT = old.wrapT;
    t.magFilter = old.magFilter; t.minFilter = old.minFilter; t.anisotropy = 4;
    material.map = t; material.needsUpdate = true; old.dispose();
  }
  /** him: clean-shaven, a white shirt (the chest strap gone into it), a deep green sash and trousers, gold buckle;
      her: the hood a plum headscarf, a coral outfit with a gold belt, bare hands, dark hair under the scarf */
  function dress(boy, girl) {
    const skin = cell(0, 0);
    remap(boy.node('Barbarian_Head'), cell(1, 0), skin, -Infinity, 1.5);   // the beard (the brows stay, above it)
    remap(boy.node('Barbarian_Body'), cell(6, 0), cell(0, 1), .78);
    for (const arm of ['Barbarian_ArmLeft', 'Barbarian_ArmRight']) remap(boy.node(arm), cell(6, 0), cell(7, 2));
    repaint(boy, 'Barbarian_Body', { '0,1': '#f4efe4', '1,1': '#f4efe4', '7,0': '#f4efe4', '7,2': '#efe8da', '2,1': '#2f8a5a', '6,0': '#1d5a3c',
      '7,1': '#1f4a37', '3,0': '#e8b84a', '3,2': '#5a3a28', '1,0': '#241c1e' });
    for (const arm of ['Rogue_ArmLeft', 'Rogue_ArmRight']) remap(girl.node(arm), cell(5, 2), skin);
    repaint(girl, 'Rogue_Body', { '1,1': '#7b2f63', '0,1': '#ff6f61', '7,1': '#e85d5d', '6,0': '#e2a93b', '3,0': '#f2c35a', '5,0': '#ffe2b8',
      '3,2': '#7b2f63', '1,0': '#4a2c22' });
  }

  return { rug, hair, tail, flutter, scroll, cloudNote, banner, dress };
};
