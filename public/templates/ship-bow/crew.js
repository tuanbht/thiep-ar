/* Mũi thuyền lộng gió: the crew, built in code for story.js (loaded after scenery.js). How the two of them look (the
   Barbarian shaved, with dark hair, a striped sailor's shirt and a red kerchief; the Mage in a coral dress with a bow in
   her hair), the kerchief that becomes her blindfold and then a streamer in the wind, the gulls and the dolphins, and the
   things that carry the card's words: a tag on the mast, a page of the ship's log with the photo, a banner two gulls fly in.
     NM_SHIP.crew(kit, S) → the builders (S: what scenery.js built) */
(window.NM_SHIP = window.NM_SHIP || {}).crew = (kit, S) => {
  const { THREE, clamp, lerp, fitText, HAND } = kit;
  const { V3, mat, geo, mesh, seeded } = S;
  const TAU = Math.PI * 2;
  const HEAD_BONE = 1.241;                                           // where the head bone sits in a KayKit model, in its own units

  /* ── the palette: one texture of flat swatches, 8 across and 4 down ── */
  const cellOf = (uv, i) => [Math.floor(uv.getX(i) * 8), Math.floor(uv.getY(i) * 4)];
  /** the triangles of `mesh` whose middle sits in swatch [cx, cy] (and passes test(x, y, z) in model units): their corners */
  function corners(mesh, [cx, cy], test = () => true) {
    const g = mesh?.geometry; if (!g) return new Set();
    const uv = g.attributes.uv, pos = g.attributes.position, idx = g.index, out = new Set(), n = idx ? idx.count : uv.count;
    for (let i = 0; i < n; i += 3) {
      const v = [0, 1, 2].map(k => (idx ? idx.getX(i + k) : i + k));
      const u0 = v.reduce((s, j) => s + uv.getX(j), 0) / 3, v0 = v.reduce((s, j) => s + uv.getY(j), 0) / 3;
      if (Math.floor(u0 * 8) !== cx || Math.floor(v0 * 4) !== cy) continue;
      const m = [0, 1, 2].map(a => v.reduce((s, j) => s + [pos.getX(j), pos.getY(j), pos.getZ(j)][a], 0) / 3);
      if (test(...m)) v.forEach(j => out.add(j));
    }
    return out;
  }
  /** moves those corners' UVs from one swatch to another (a sleeve onto skin: a bare arm) */
  function remap(mesh, from, to, test) {
    const uv = mesh?.geometry?.attributes.uv; if (!uv) return;
    corners(mesh, from, test).forEach(j => uv.setXY(j, uv.getX(j) + (to[0] - from[0]) / 8, uv.getY(j) + (to[1] - from[1]) / 4));
    uv.needsUpdate = true;
  }
  /** the model's palette redrawn: swatches refilled with a colour (each keeps its light and shade), or painted by draw(c, x, y, w, h) */
  function repaint(m, fills) {
    let material = null; m.scene?.traverse(o => { if (!material && o.isMesh && o.material?.map) material = o.material; });
    const img = material?.map?.image; if (!img || !img.width) return;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
    const w = img.width / 8, h = img.height / 4;
    for (const [cx, cy, fill] of fills) {
      if (typeof fill === 'function') { fill(c, cx * w, cy * h, w, h); continue; }
      const d = c.getImageData(cx * w, cy * h, w, h), p = d.data;
      let mean = 0; for (let i = 0; i < p.length; i += 4) mean += p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11;
      mean /= p.length / 4;
      const [r, g, b] = [1, 3, 5].map(i => parseInt(fill.slice(i, i + 2), 16));
      for (let i = 0; i < p.length; i += 4) {
        const k = .35 + .65 * (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / (mean || 1);   // a softer shade: flat colours read better small
        p[i] = Math.min(255, r * k); p[i + 1] = Math.min(255, g * k); p[i + 2] = Math.min(255, b * k);
      }
      c.putImageData(d, cx * w, cy * h);
    }
    const old = material.map, t = kit.keep(new THREE.CanvasTexture(cv));
    t.colorSpace = old.colorSpace; t.flipY = old.flipY; t.wrapS = old.wrapS; t.wrapT = old.wrapT;
    t.magFilter = old.magFilter; t.minFilter = old.minFilter; t.anisotropy = 4;
    material.map = t; material.needsUpdate = true; old.dispose();
  }

  /* ── him: shaved, dark hair, a navy-and-white striped shirt with a navy collar, cream trousers ── */
  const SHIRT = [0, 1], NAVY = [1, 1], SKIN = [0, 0], TROUSERS = [7, 1];
  const SHIRT_TOP = 1.3, SHIRT_BOTTOM = .74;                          // the shirt's height on the model: its stripes run round it
  function stripes(c, x, y, w, h) {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const y0 = y + h * (.04 + .92 * i / n), y1 = y + h * (.04 + .92 * (i + 1) / n), shade = 1 - .18 * i / n;
      c.fillStyle = i % 2 ? `rgb(${248 * shade | 0},${246 * shade | 0},${238 * shade | 0})` : `rgb(${30 * shade | 0},${46 * shade | 0},${96 * shade | 0})`;
      c.fillRect(x, y0, w, y1 - y0 + 1);
    }
    c.fillStyle = '#1e2e60'; c.fillRect(x, y, w, h * .04 + 1); c.fillRect(x, y + h * .96, w, h * .04);
  }
  /** the shirt's corners: their UVs go down the stripes by height, so the stripes run round him */
  function stripeShirt(mesh, cells) {
    const uv = mesh?.geometry?.attributes.uv, pos = mesh?.geometry?.attributes.position; if (!uv) return;
    for (const [cell, test] of cells) {
      corners(mesh, cell, test).forEach(j => {
        const k = clamp((SHIRT_TOP - pos.getY(j)) / (SHIRT_TOP - SHIRT_BOTTOM));
        uv.setXY(j, (SHIRT[0] + .3 + .4 * clamp(.5 + pos.getX(j))) / 8, (SHIRT[1] + .04 + .92 * k) / 4);
      });
    }
    uv.needsUpdate = true;
  }
  /** the beard pulled into his face: a young man, clean-shaven */
  function shave(head) {
    const pos = head?.geometry?.attributes.position; if (!pos) return;
    corners(head, [1, 0], (x, y) => y < 1.6).forEach(j => pos.setXYZ(j, pos.getX(j) * .12, 1.45 + (pos.getY(j) - 1.45) * .12, pos.getZ(j) * .12));
    pos.needsUpdate = true; head.geometry.computeBoundingSphere();
  }
  /** his hair: a shell grown out of the top of his own head (it fits it exactly), a fringe swept by the wind, two tufts */
  function hairFor(head) {
    const g = head.geometry, pos = g.attributes.position, nor = g.attributes.normal, idx = g.index, uv = g.attributes.uv;
    const hairline = (x, z) => { const a = Math.atan2(x, z); return 1.9 - .2 * (1 - Math.cos(a)) - .14 * Math.max(0, -Math.cos(a)); };
    const out = [];
    for (let i = 0; i < idx.count; i += 3) {
      const v = [0, 1, 2].map(k => idx.getX(i + k));
      const [cx, cy] = cellOf(uv, v[0]); if (cx !== 0 || cy !== 0) continue;
      const m = [0, 1, 2].map(a => v.reduce((s, j) => s + [pos.getX(j), pos.getY(j), pos.getZ(j)][a], 0) / 3);
      if (m[1] < hairline(m[0], m[2])) continue;
      for (const j of v) {
        const lift = .05 + .05 * clamp((pos.getY(j) - 1.75) / .4);   // thicker on top
        out.push(pos.getX(j) + nor.getX(j) * lift, pos.getY(j) + nor.getY(j) * lift - HEAD_BONE, pos.getZ(j) + nor.getZ(j) * lift);
      }
    }
    const shell = new THREE.BufferGeometry(); shell.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); shell.computeVertexNormals();
    const dark = mat('#2b1c15', { roughness: .5, side: THREE.DoubleSide }), root = new THREE.Group();
    root.add(mesh(shell, dark));
    const lock = geo(new THREE.SphereGeometry(.1, 10, 8).scale(.8, 1.5, .5));   // a fringe swept to his right, clear of his brows
    for (const [x, y, z, rz, rx, s] of [[-.32, .76, .38, -1.05, .45, .9], [-.13, .8, .42, -1.15, .45, 1.1], [.08, .8, .42, -1.2, .45, 1.05], [.28, .76, .38, -1.25, .4, .85]]) {
      const l = mesh(lock, dark, x, y, z); l.rotation.set(rx, 0, rz); l.scale.multiplyScalar(s); root.add(l);
    }
    const tuft = geo(new THREE.ConeGeometry(.12, .4, 7));
    const tufts = [[.05, .98, -.05, -.9, .2], [-.18, .95, -.12, -1.05, .5]].map(([x, y, z, rx, rz]) => { const t = mesh(tuft, dark, x, y, z); t.rotation.set(rx, 0, rz); root.add(t); return t; });
    return { root, tufts };
  }
  function dressBoy(boy) {
    const body = boy.node('Barbarian_Body'), head = boy.node('Barbarian_Head');
    for (const arm of ['Barbarian_ArmLeft', 'Barbarian_ArmRight'].map(n => boy.node(n))) {
      remap(arm, [6, 0], NAVY, x => Math.abs(x) < .42); remap(arm, [6, 0], SKIN); remap(arm, [7, 2], SKIN); remap(arm, [2, 1], SKIN); remap(arm, [3, 0], SKIN);
    }
    remap(body, [6, 0], NAVY, (x, y) => y > .56 && y <= .74);           // a navy belt
    remap(body, [6, 0], TROUSERS, (x, y) => y <= .56);
    remap(body, [7, 0], NAVY);                                           // the fur on his shoulders: a sailor's collar
    stripeShirt(body, [[SHIRT], [[6, 0], (x, y) => y > .74]]);           // the strap across his chest: shirt now
    for (const leg of ['Barbarian_LegLeft', 'Barbarian_LegRight'].map(n => boy.node(n))) remap(leg, [6, 0], TROUSERS);
    shave(head);
    repaint(boy, [[SHIRT[0], SHIRT[1], stripes], [NAVY[0], NAVY[1], '#24356e'], [TROUSERS[0], TROUSERS[1], '#efe6d2'], [2, 1, '#efe6d2'],
      [3, 2, '#5a3a26'], [1, 0, '#3a2418'], [3, 0, '#e2b34a']]);
    const hair = hairFor(head); boy.node('head')?.add(hair.root);
    return hair;
  }

  /* ── her: a coral dress with a cream collar and buttons, a gold sash, bare calves and white shoes, a bow in her hair ── */
  function dressGirl(girl) {
    const body = girl.node('Mage_Body');
    for (const leg of ['Mage_LegLeft', 'Mage_LegRight'].map(n => girl.node(n))) { remap(leg, [7, 1], SKIN); remap(leg, [3, 2], SKIN, (x, y) => y > .13); }
    remap(body, [7, 1], [0, 1], (x, y) => y > .5);                      // the dark lining above the hem: dress
    repaint(girl, [[0, 1, '#ff7a64'], [7, 1, '#d9524a'], [3, 0, '#fff4e4'], [4, 0, '#fff4e4'], [5, 0, '#f2c14e'], [2, 2, '#fff4e4'], [3, 2, '#fffaf3'],
      [1, 0, '#201a24'], [1, 1, '#7cc4f5']]);                          // her hair tie sky blue, like her bow
    const bow = new THREE.Group(), blue = mat('#8fd0ff', { roughness: .45, emissive: 0x3d8fd0, emissiveIntensity: .15 }), knot = mat('#5fb2ee', { roughness: .45 });
    for (const s of [-1, 1]) { const l = mesh(new THREE.SphereGeometry(.15, 12, 10), blue, s * .17, 0, 0); l.scale.set(1.1, .75, .45); l.rotation.z = s * .35; bow.add(l); }
    bow.add(mesh(new THREE.SphereGeometry(.07, 10, 8), knot));
    for (const s of [-1, 1]) { const t = mesh(new THREE.BoxGeometry(.07, .22, .03), blue, s * .07, -.15, 0); t.rotation.z = s * .45; bow.add(t); }
    bow.position.set(.33, .9, .12); bow.rotation.set(.15, .45, -.55); girl.node('head')?.add(bow);
    return { bow };
  }
  /** his red kerchief with white dots: knotted at his collar; then a blindfold round her eyes, knotted behind; then a streamer
      that flies from her hand in the wind (stream.set(...) every frame, in the stage's space) */
  function makeKerchief() {
    const paint = kit.canvasTexture(128, 128, (c, w, h) => {
      c.fillStyle = '#d8323d'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff3e6';
      for (let y = 10, row = 0; y < h; y += 22, row++) for (let x = 6 + (row % 2) * 11; x < w; x += 22) { c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill(); }
    });
    const cloth = (rx, ry) => { const t = kit.keep(paint.clone()); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      return kit.keep(new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: .7, emissive: 0xff4a4a, emissiveIntensity: .1 })); };
    const neck = new THREE.Group(), knotted = cloth(1, 1);             // at his collar (his chest bone's units)
    const tri = new THREE.Shape(); tri.moveTo(-.2, 0); tri.lineTo(.2, 0); tri.lineTo(0, -.3); tri.closePath();
    const front = new THREE.Mesh(geo(new THREE.ShapeGeometry(tri)), knotted); front.position.set(0, .3, .37); front.rotation.x = -.3; neck.add(front);
    neck.add(mesh(new THREE.SphereGeometry(.07, 8, 6), knotted, 0, .3, .37));
    const band = new THREE.Group(), wrap = new THREE.Group(); band.add(wrap);   // round her eyes (her head bone's units)
    wrap.add(mesh(new THREE.CylinderGeometry(.6, .6, .17, 30, 1, true), cloth(6, 1), 0, .38, -.04));
    wrap.add(mesh(new THREE.SphereGeometry(.08, 8, 6), knotted, 0, .38, -.67));
    const tails = [-1, 1].map(sd => { const tl = new THREE.Mesh(geo(new THREE.PlaneGeometry(.11, .34).translate(0, -.17, 0)), knotted); tl.position.set(sd * .05, .38, -.7); band.add(tl); return tl; });
    const N = 12, len = .17, wid = .05, sm = cloth(1, 3);              // in her hand: a ribbon in the stage's space
    const g = new THREE.BufferGeometry(), pos = new Float32Array((N + 1) * 6), uv = new Float32Array((N + 1) * 4), idx = [];
    for (let i = 0; i <= N; i++) { uv.set([0, i / N, 1, i / N], i * 4); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const ribbon = new THREE.Mesh(geo(g), sm); ribbon.frustumCulled = false; ribbon.castShadow = true;
    const p = V3(), side = V3(), across = V3(), up = V3(0, 1, 0);
    /** from `at` along `dir` (a unit vector), rippling; `blow` (0..1) how hard; `k` (0..1) how much of it is out */
    function set(at, dir, blow, T, k = 1) {
      side.crossVectors(dir, up).normalize();
      const pa = ribbon.geometry.attributes.position;
      for (let i = 0; i <= N; i++) {
        const s = i / N, d = len * s * k, wave = (.01 + .018 * blow) * s * Math.sin(T * (8 + 6 * blow) - s * 6);
        p.copy(at).addScaledVector(dir, d).addScaledVector(side, wave); p.y += -(1 - blow) * d * .8 + .012 * blow * s * Math.sin(T * 5 + s * 4);
        const twist = .6 * Math.sin(T * 6 - s * 5) * blow, hw = wid / 2 * (1 - .3 * s);
        across.copy(up).multiplyScalar(Math.cos(twist)).addScaledVector(side, Math.sin(twist));
        pa.setXYZ(i * 2, p.x + across.x * hw, p.y + across.y * hw, p.z + across.z * hw); pa.setXYZ(i * 2 + 1, p.x - across.x * hw, p.y - across.y * hw, p.z - across.z * hw);
      }
      pa.needsUpdate = true; ribbon.geometry.computeVertexNormals();
    }
    return { neck, band, wrap, tails, ribbon, set };
  }

  /* ── a gull: white body and head, grey wings with black tips that beat or fold, a yellow beak, orange legs ── */
  const flat = (shape, m) => { const g = geo(new THREE.ShapeGeometry(shape).rotateX(Math.PI / 2)); const o = new THREE.Mesh(g, m); o.castShadow = true; return o; };
  function makeGull(size = .045) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(size);
    const white = mat('#ffffff', { roughness: .6 }), grey = mat('#cfd6e2', { roughness: .6, side: THREE.DoubleSide }), black = mat('#2a2e3a', { roughness: .5, side: THREE.DoubleSide });
    body.add(mesh(new THREE.SphereGeometry(.5, 14, 10).scale(.42, .38, 1), white));
    const head = new THREE.Group(); head.position.set(0, .2, .42); body.add(head);
    head.add(mesh(new THREE.SphereGeometry(.21, 12, 10), white));
    head.add(mesh(new THREE.ConeGeometry(.065, .26, 8).rotateX(Math.PI / 2), mat('#ffb02e', { roughness: .4 }), 0, -.03, .28));
    for (const s of [-1, 1]) head.add(mesh(new THREE.SphereGeometry(.038, 6, 5), mat('#15131a', { roughness: .2 }), s * .13, .05, .12));
    const tail = new THREE.Shape(); tail.moveTo(-.15, 0); tail.lineTo(.15, 0); tail.lineTo(.11, -.3); tail.lineTo(-.11, -.3); tail.closePath();
    const tl = flat(tail, grey); tl.position.set(0, .05, -.4); body.add(tl);
    const wings = [-1, 1].map(s => {
      const inner = new THREE.Group(); inner.position.set(s * .14, .12, .08); body.add(inner);
      const a = new THREE.Shape(); a.moveTo(0, .16); a.lineTo(s * .62, .1); a.lineTo(s * .62, -.12); a.lineTo(0, -.22); a.closePath();
      inner.add(flat(a, grey));
      const outer = new THREE.Group(); outer.position.x = s * .6; inner.add(outer);
      const b = new THREE.Shape(); b.moveTo(0, .1); b.lineTo(s * .38, .04); b.lineTo(s * .58, -.1); b.lineTo(0, -.12); b.closePath();
      outer.add(flat(b, grey));
      const tip = new THREE.Shape(); tip.moveTo(s * .34, .05); tip.lineTo(s * .58, -.1); tip.lineTo(s * .3, -.1); tip.closePath();
      const t = flat(tip, black); t.position.y = .004; outer.add(t);
      return { s, inner, outer };
    });
    const legs = new THREE.Group(); body.add(legs);
    for (const s of [-1, 1]) {
      legs.add(mesh(new THREE.CylinderGeometry(.022, .022, .26, 5), mat('#ff9a3c'), s * .1, -.36, .02));
      legs.add(mesh(new THREE.ConeGeometry(.07, .14, 3).rotateX(Math.PI / 2).scale(1, .3, 1), mat('#ff9a3c'), s * .1, -.49, .08));
    }
    /** flap: how hard (0 a glide); ph: where in the beat; fold: wings folded on the back (perched); legs: down; look: head turn */
    function pose({ flap = 0, ph = 0, fold = 0, legsDown = 0, look = 0, nod = 0 }) {
      for (const w of wings) {
        const up = .12 + flap * .8 * Math.sin(ph);
        w.inner.rotation.set(0, w.s * 1.45 * fold, w.s * lerp(up, -.25, fold));
        w.outer.rotation.set(0, w.s * .35 * fold, w.s * lerp(flap * .55 * Math.sin(ph - .8) + .08, -.2, fold));
      }
      legs.scale.setScalar(Math.max(.001, legsDown)); head.rotation.set(nod, look, 0);
    }
    pose({});
    return { root, body, pose };
  }

  /* ── a dolphin: a body turned on a lathe, grey-blue over a pale belly, a fin, flippers and flukes that beat ── */
  function makeDolphin(len = .11) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(len);
    const prof = [[0, 0], [.035, .03], [.065, .12], [.11, .26], [.155, .42], [.168, .55], [.152, .69], [.12, .79], [.085, .85], [.05, .885], [.042, .93], [.025, .985], [0, 1]];
    const g = new THREE.LatheGeometry(prof.map(([r, t]) => new THREE.Vector2(r, t)), 18).rotateX(Math.PI / 2).translate(0, 0, -.5).scale(.82, 1, 1);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), top = new THREE.Color('#58789b'), belly = new THREE.Color('#e8eef3'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { c.copy(belly).lerp(top, clamp((p.getY(i) + .035) / .07)); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    body.add(mesh(g, mat(0xffffff, { vertexColors: true, roughness: .35, metalness: .05, envMap: kit.env, envMapIntensity: .8 })));
    const dark = mat('#4f6e90', { roughness: .4, side: THREE.DoubleSide });
    const fin = new THREE.Shape(); fin.moveTo(-.1, 0); fin.quadraticCurveTo(-.06, .12, -.2, .2); fin.quadraticCurveTo(.0, .14, .1, 0); fin.closePath();
    const f = new THREE.Mesh(geo(new THREE.ShapeGeometry(fin).rotateY(-Math.PI / 2)), dark); f.position.set(0, .14, 0); body.add(f);
    for (const s of [-1, 1]) { const fl = mesh(new THREE.SphereGeometry(.1, 8, 6).scale(.22, .06, .5), dark, s * .12, -.08, .17); fl.rotation.set(.3, s * .5, s * .6); body.add(fl); }
    for (const s of [-1, 1]) body.add(mesh(new THREE.SphereGeometry(.018, 6, 5), mat('#15131a', { roughness: .2 }), s * .095, .045, .31));
    const tail = new THREE.Group(); tail.position.z = -.44; body.add(tail);
    const fk = new THREE.Shape(); fk.moveTo(0, .02); fk.quadraticCurveTo(.12, -.02, .23, -.16); fk.quadraticCurveTo(.1, -.12, 0, -.08);
    fk.quadraticCurveTo(-.1, -.12, -.23, -.16); fk.quadraticCurveTo(-.12, -.02, 0, .02);
    tail.add(new THREE.Mesh(geo(new THREE.ShapeGeometry(fk).rotateX(-Math.PI / 2)), dark));
    root.visible = false;
    const A = V3(), B = V3();
    /** one leap from a to b (on the water, [x, z]) h high, t (0..1) of the way; out of it (t < 0 or > 1) it is under the sea */
    function leap(t, a, b, h, T) {
      root.visible = t > -.04 && t < 1.04; if (!root.visible) return;
      const k = clamp(t, -.04, 1.04); A.set(a[0], 0, a[1]); B.set(b[0], 0, b[1]);
      root.position.lerpVectors(A, B, k); root.position.y = h * 4 * k * (1 - k) - .02;
      root.rotation.set(-Math.atan2(h * 4 * (1 - 2 * k), A.distanceTo(B)), Math.atan2(B.x - A.x, B.z - A.z), 0, 'YXZ');
      tail.rotation.x = .45 * Math.sin(T * 13);
    }
    return { root, leap };
  }

  /* ── the card's words: a tag on the bunting, a page of the ship's log with the photo, a banner two gulls fly in ── */
  const INK = '#1f3a68';
  /** a paper tag hung by a string from its eyelet: its top centre is the root; the back is a printed ticket */
  function makeTag(text, width = .36) {
    const W = 1024, H = Math.round(W * .58), h = width * .58;
    const shape = (c, fill) => {
      c.fillStyle = fill; c.beginPath(); c.moveTo(W * .5 - 150, 14); c.lineTo(W * .5 + 150, 14); c.lineTo(W - 14, 140); c.lineTo(W - 14, H - 40);
      c.quadraticCurveTo(W - 14, H - 14, W - 40, H - 14); c.lineTo(40, H - 14); c.quadraticCurveTo(14, H - 14, 14, H - 40); c.lineTo(14, 140); c.closePath(); c.fill();
    };
    const eyelet = c => { c.fillStyle = '#d9a441'; c.beginPath(); c.arc(W / 2, 62, 30, 0, TAU); c.fill(); c.fillStyle = '#3a2a1a'; c.beginPath(); c.arc(W / 2, 62, 15, 0, TAU); c.fill(); };
    const front = kit.canvasTexture(W, H, c => {
      shape(c, '#fffaf0');
      c.strokeStyle = '#e8434f'; c.lineWidth = 8; c.setLineDash([26, 16]); c.strokeRect(46, 124, W - 92, H - 164); c.setLineDash([]);
      eyelet(c);
      c.fillStyle = '#e8434f'; kit.heartPath(c, W - 92, H - 78, 44); c.fill();
      c.strokeStyle = 'rgba(31,58,104,.55)'; c.lineWidth = 5; c.beginPath();                 // a little anchor in the corner
      c.moveTo(84, H - 120); c.lineTo(84, H - 64); c.moveTo(62, H - 106); c.lineTo(106, H - 106); c.moveTo(60, H - 80); c.quadraticCurveTo(84, H - 50, 108, H - 80); c.stroke();
      c.fillStyle = INK; fitText(c, String(text ?? ''), { x: 90, y: 140, w: W - 180, h: H - 200 }, { maxLines: 3 });
    });
    const back = kit.canvasTexture(W, H, c => {
      shape(c, '#f6ead2'); eyelet(c);
      c.fillStyle = '#1f7f8c'; c.font = `800 ${H * .12}px "Be Vietnam Pro", Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('LỘNG GIÓ · SỐ 7', W / 2, H * .5);
      c.strokeStyle = '#1f7f8c'; c.lineWidth = 5; for (let i = 0; i < 2; i++) { c.beginPath(); for (let x = 60; x <= W - 60; x += 10) c.lineTo(x, H * (.68 + i * .08) + 9 * Math.sin(x * .05)); c.stroke(); }
    });
    const root = new THREE.Group(), card = new THREE.Group(); root.add(card);
    const plane = geo(new THREE.PlaneGeometry(width, h).translate(0, -h / 2, 0));
    const fm = kit.keep(new THREE.MeshStandardMaterial({ map: front, transparent: true, alphaTest: .4, roughness: .9, emissive: 0xffffff, emissiveMap: front, emissiveIntensity: .38 }));
    const bm = kit.keep(new THREE.MeshStandardMaterial({ map: back, transparent: true, alphaTest: .4, roughness: .9 }));
    const rear = new THREE.Mesh(plane, bm); rear.rotation.y = Math.PI;   // its own face, turned round: the print reads the right way
    card.add(new THREE.Mesh(plane, fm), rear);
    card.position.y = -.03;
    const string = mesh(new THREE.CylinderGeometry(.0012, .0012, .034, 4), mat('#e8434f'), 0, -.017, 0); root.add(string);
    return { root, card, width, height: h };
  }
  /** a page of the ship's log (landscape), pegged at its top, the card's photo clipped to its right half: { root, page, photo } */
  function makeLogPage(caption, width = .34) {
    const W = 1020, H = 810, h = width * H / W;
    const tex = kit.canvasTexture(W, H, (c, w, hh) => {
      const r = seeded(77);
      c.fillStyle = '#fbf3df'; c.fillRect(0, 0, w, hh);
      c.fillStyle = 'rgba(160,120,60,.08)'; for (let i = 0; i < 300; i++) c.fillRect(r() * w, r() * hh, 2 + r() * 4, 2 + r() * 4);
      c.fillStyle = '#1f3a68'; c.font = '800 44px "Be Vietnam Pro", Arial, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
      c.fillText('NHẬT KÝ HẢI TRÌNH', 46, 66);
      c.fillStyle = '#c4383c'; c.font = `700 42px ${HAND}`; c.textAlign = 'right'; c.fillText('trang 7', w - 40, 68);
      c.strokeStyle = '#1f3a68'; c.lineWidth = 4; c.beginPath(); c.moveTo(40, 104); c.lineTo(w - 40, 104); c.stroke();
      c.strokeStyle = 'rgba(31,58,104,.22)'; c.lineWidth = 2; for (let y = 160; y < hh - 20; y += 50) { c.beginPath(); c.moveTo(36, y); c.lineTo(w - 36, y); c.stroke(); }
      c.strokeStyle = 'rgba(196,56,60,.45)'; c.beginPath(); c.moveTo(92, 114); c.lineTo(92, hh - 16); c.stroke();
      c.fillStyle = 'rgba(31,58,104,.8)'; c.font = `700 38px ${HAND}`; c.textAlign = 'left';
      ['Gió: lộng', 'Biển: êm', 'Cá heo: ba chú', 'Tim: rộn ràng'].forEach((t, i) => c.fillText(t, 108, 196 + i * 100));
      c.save(); c.translate(250, hh - 104); c.strokeStyle = 'rgba(196,56,60,.6)'; c.lineWidth = 4;   // a compass rose stamp
      c.beginPath(); c.arc(0, 0, 56, 0, TAU); c.stroke();
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8, l = i % 2 ? 30 : 50; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(a) * l, -Math.cos(a) * l); c.stroke(); }
      c.restore();
    });
    const root = new THREE.Group(), page = new THREE.Group(); root.add(page);
    const pm = kit.keep(new THREE.MeshStandardMaterial({ map: tex, roughness: .9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .3, side: THREE.DoubleSide }));
    const sheet = new THREE.Mesh(geo(new THREE.PlaneGeometry(width, h).translate(0, -h / 2 - .012, 0)), pm); sheet.castShadow = true; page.add(sheet);
    const photo = kit.polaroid({ width: .19, caption, glow: .5, halo: true, haloColor: 0xffe2a8 });
    photo.root.position.set(width * .2, -.012 - h + .012, .003); photo.root.rotation.z = -.04; page.add(photo.root);
    const clip = mesh(new THREE.TorusGeometry(.009, .0016, 5, 12), mat('#c9933a', { metalness: .7, roughness: .3 }), width * .2, -h + photo.height + .004, .006);
    clip.scale.set(.6, 1.4, 1); page.add(clip);
    const peg = new THREE.Group(); root.add(peg);
    for (const s of [-1, 1]) { const leg = mesh(new THREE.BoxGeometry(.0055, .034, .004), mat('#c98d55', { roughness: .6 }), s * .0034, -.012, .002); leg.rotation.z = s * .08; peg.add(leg); }
    peg.add(mesh(new THREE.TorusGeometry(.004, .0012, 4, 10), mat('#9aa3ad', { metalness: .8, roughness: .3 }), 0, -.008, .006));
    return { root, page, photo, peg, height: h };
  }
  /** a ribbon banner with the card's last words, its ends in two gulls' beaks; it ripples (by T) */
  function makeBanner(text, width = .6) {
    const W = 1400, H = 340, h = width * H / W;
    const tex = kit.canvasTexture(W, H, c => {
      const n = 70;
      c.fillStyle = '#d23f4b'; for (const s of [0, 1]) { c.beginPath(); const x0 = s ? W - 150 : 0, x1 = s ? W : 150; c.moveTo(x0, 40); c.lineTo(x1, 40); c.lineTo(s ? W - 60 : 60, H / 2); c.lineTo(x1, H - 40); c.lineTo(x0, H - 40); c.fill(); }
      c.fillStyle = '#f15b5b'; c.fillRect(110, 18, W - 220, H - 36);
      c.strokeStyle = 'rgba(255,246,230,.75)'; c.lineWidth = 6; c.setLineDash([22, 14]); c.strokeRect(134, 40, W - 268, H - 80); c.setLineDash([]);
      c.fillStyle = '#fff8ec'; fitText(c, String(text ?? ''), { x: 160, y: 46, w: W - 320, h: H - 92 }, { maxLines: 2 });
      c.fillStyle = '#ffe08a'; for (const x of [n, W - n]) { c.beginPath(); c.arc(x + (x < W / 2 ? 70 : -70), H / 2, 14, 0, TAU); c.fill(); }
    });
    const g = new THREE.PlaneGeometry(width, h, 28, 3), cloth = new THREE.Mesh(geo(g), kit.keep(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .3,
      side: THREE.DoubleSide, roughness: .8, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .45 })));
    cloth.userData.base = Float32Array.from(g.attributes.position.array);
    const root = new THREE.Group(); root.add(cloth);
    const gulls = [-1, 1].map(s => { const gl = makeGull(.05); gl.root.position.set(s * (width / 2 + .012), h / 2 + .01, .01); gl.root.rotation.y = s * .5; root.add(gl.root); return gl; });
    /** the cloth waves along its length; `open` (0..1) how far it has unrolled */
    function wave(T, open) {
      const p = cloth.geometry.attributes.position, b = cloth.userData.base;
      for (let i = 0; i < p.count; i++) {
        const x = b[i * 3], k = x / width + .5;
        p.setXYZ(i, x * Math.max(.02, open), b[i * 3 + 1] + .004 * Math.sin(T * 3 + k * 7), .008 * Math.sin(T * 4.2 - k * 9) * (1 - Math.abs(k - .5) * 1.4));
      }
      p.needsUpdate = true; cloth.geometry.computeVertexNormals();
      gulls.forEach((gl, i) => { gl.root.position.x = (i ? 1 : -1) * (width / 2 + .012) * Math.max(.02, open); });
    }
    return { root, cloth, gulls, wave, width, height: h };
  }

  return { remap, repaint, dressBoy, dressGirl, makeKerchief, makeGull, makeDolphin, makeTag, makeLogPage, makeBanner };
};
