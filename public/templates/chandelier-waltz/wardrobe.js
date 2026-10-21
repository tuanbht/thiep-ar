/* Điệu valse đêm hội: the couple's ball clothes, for story.js (template.json "story" loads this file before it). Each
   KayKit character wears one small palette texture of flat swatches (8 across, 4 down, each a light-to-dark gradient):
   the Knight's swatches become a prince's ivory coat with gold trim, a wine cape, dark trousers, black boots and dark
   brown hair; the Mage's become a rose bodice with lace cuffs, a gold sash and dark brown hair, and she gets a ball
   gown's skirt built here, with her cape (a sheer blush wrap now) draped over its back. The story moves the skirt and
   the capes: flare, twist and sway come in as numbers, so this file holds no time of its own.
     NM_WALTZ.wardrobe(kit) → { dressPrince(m), dressPrincess(m) } */
(window.NM_WALTZ = window.NM_WALTZ || {}).wardrobe = kit => {
  const { THREE, clamp, lerp } = kit;
  const TAU = Math.PI * 2;
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .6, ...o }));
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

  /* ── the palette: swatches recoloured, some parts moved onto a spare swatch ── */
  const cell = (cx, cy) => ({ cx, cy });
  /** moves the UV islands of `mesh` that sit in swatch `from` onto swatch `to`, only the triangles between heights lo and
      hi in the model's own units (his boots, not his coat in the same grey) */
  function remap(mesh, from, to, lo = -Infinity, hi = Infinity) {
    const uv = mesh?.geometry?.attributes.uv, pos = mesh?.geometry?.attributes.position; if (!uv) return;
    const idx = mesh.geometry.index, n = idx ? idx.count : uv.count, move = new Set();
    for (let i = 0; i < n; i += 3) {                                   // which corners first, then move them: moving as we go
      const v = [0, 1, 2].map(k => (idx ? idx.getX(i + k) : i + k));   // would take the next triangle's centre out of the swatch
      const u0 = (uv.getX(v[0]) + uv.getX(v[1]) + uv.getX(v[2])) / 3, v0 = (uv.getY(v[0]) + uv.getY(v[1]) + uv.getY(v[2])) / 3;
      if (Math.floor(u0 * 8) !== from.cx || Math.floor(v0 * 4) !== from.cy) continue;
      const y = (pos.getY(v[0]) + pos.getY(v[1]) + pos.getY(v[2])) / 3;
      if (y >= lo && y < hi) v.forEach(j => move.add(j));
    }
    move.forEach(j => uv.setXY(j, uv.getX(j) + (to.cx - from.cx) / 8, uv.getY(j) + (to.cy - from.cy) / 4));
    uv.needsUpdate = true;
  }
  /** the palette with swatches recoloured ("x,y": colour): each keeps its own shading, scaled onto the new colour */
  function repaint(m, colours) {
    let material = null; m.scene.traverse(o => { if (!material && o.isMesh && o.material?.map) material = o.material; });
    const img = material?.map?.image; if (!img || !img.width) return null;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d'), w = img.width / 8, h = img.height / 4; c.drawImage(img, 0, 0);
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
    return material;
  }

  /* ── a cape that sways: its rest shape kept, every vertex moved from it each frame ── */
  function cloth(node) {                                               // (the packed models keep their vertices interleaved)
    if (!node?.geometry) return null;
    const geo = node.geometry, p = geo.attributes.position, base = new Float32Array(p.count * 3);
    let top = -Infinity, bottom = Infinity;
    for (let i = 0; i < p.count; i++) {
      base[i * 3] = p.getX(i); base[i * 3 + 1] = p.getY(i); base[i * 3 + 2] = p.getZ(i);
      top = Math.max(top, base[i * 3 + 1]); bottom = Math.min(bottom, base[i * 3 + 1]);
    }
    return { node, geo, base, top, len: top - bottom || 1, rx: node.rotation.x, rz: node.rotation.z };
  }
  /** lift: how far (radians) the hem swings out behind; side: how far it swings to one side (the turn throws it out);
      ripple: how much a wave runs down it; lean: how far the body it hangs from bends forward (it keeps hanging down) */
  function swing(cl, lift, side, ripple, T, lean = 0) {
    if (!cl) return;
    cl.node.rotation.x = cl.rx + lift * .5 - lean; cl.node.rotation.z = cl.rz + side * .4;
    const p = cl.geo.attributes.position, b = cl.base;
    for (let i = 0; i < p.count; i++) {
      const s = (cl.top - b[i * 3 + 1]) / cl.len;                    // 0 at the shoulders, 1 at the hem
      p.setXYZ(i, b[i * 3] + cl.len * s * s * side * .12 * Math.sin(T * 4 + b[i * 3] * 3),
        b[i * 3 + 1] + cl.len * s * s * lift * .1,
        b[i * 3 + 2] - cl.len * s * s * (lift * .14 + ripple * .05 * Math.sin(T * 7 - s * 5 + b[i * 3] * 4)));
    }
    p.needsUpdate = true; cl.geo.computeVertexNormals();
  }

  /* ── the prince: an ivory coat with gold trim, a wine cape and cravat, dark trousers, black boots, dark brown hair ── */
  function dressPrince(m) {
    for (const leg of ['Knight_LegLeft', 'Knight_LegRight']) remap(m.node(leg), cell(3, 0), cell(4, 3), -Infinity, .3);   // greaves: boots now
    remap(m.node('Knight_Body'), cell(7, 1), cell(5, 3), 1);          // the dark at his throat: a white cravat
    repaint(m, {
      '3,0': '#f4ead6', '4,0': '#e9dcc0', '7,0': '#e0ae48',            // the coat, its lining, the gold trim
      '0,1': '#8a1f3d', '1,1': '#f2c65a', '6,0': '#7a1c36', '2,1': '#f2c65a',   // the cape and the rosette, its ribbon, the sash and its clasp
      '7,1': '#2f2834', '4,3': '#231d26', '5,3': '#fffaf0', '1,0': '#4a2c20'   // trousers, boots, cravat, hair and brows
    });
    const cape = cloth(m.node('Knight_Cape'));
    return {
      /** the cape: lift (0..1, out behind), side (-1..1), ripple (0..1), lean (radians his chest bends forward) */
      pose(lift, side, ripple, T, lean = 0) { swing(cape, lift, side, ripple, T, lean); }
    };
  }

  /* ── the princess's skirt: a bell from her sash to the floor, pleated, a ruffled tier and a lace hem ── */
  const SKIRT = { top: .19, hem: -.37, waist: .43, front: .6, side: .7, back: .8, NS: 64, NV: 16 };   // in her hips' own space (model units)
  function skirtTexture() {
    return kit.canvasTexture(1024, 256, (c, w, h) => {
      const r = seeded(41), g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#f5a3ba'); g.addColorStop(.4, '#ee8aa8'); g.addColorStop(.8, '#dc6890'); g.addColorStop(1, '#c75381');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) {                                   // pleats: soft light and shade running down
        const x = (i + .5) * w / 16, s = c.createLinearGradient(x - w / 32, 0, x + w / 32, 0);
        s.addColorStop(0, 'rgba(140,30,70,.1)'); s.addColorStop(.5, 'rgba(255,236,242,.16)'); s.addColorStop(1, 'rgba(140,30,70,.1)');
        c.fillStyle = s; c.fillRect(x - w / 32, h * .06, w / 16, h);
      }
      const tier = c.createLinearGradient(0, h * .36, 0, h * .56);       // an overskirt's ruffled edge across the middle
      tier.addColorStop(0, 'rgba(255,222,232,0)'); tier.addColorStop(1, 'rgba(255,222,232,.75)');
      c.fillStyle = tier; c.fillRect(0, h * .36, w, h * .2);
      c.fillStyle = 'rgba(255,226,236,.95)';
      for (let i = 0; i <= 40; i++) { c.beginPath(); c.arc(i * w / 40, h * .56, w / 80 + 1, 0, Math.PI); c.fill(); }
      c.fillStyle = '#fff7f2';                                          // the lace hem: scallops with eyelets
      c.fillRect(0, h * .88, w, h * .12);
      for (let i = 0; i <= 64; i++) { c.beginPath(); c.arc(i * w / 64, h * .88, w / 128 + 1, Math.PI, 0); c.fill(); }
      c.fillStyle = 'rgba(214,120,150,.55)';
      for (let i = 0; i < 64; i++) { c.beginPath(); c.arc((i + .5) * w / 64, h * .94, 2.2, 0, TAU); c.fill(); }
      for (let i = 0; i < 160; i++) {                                   // a scatter of gold embroidery
        c.fillStyle = r() < .5 ? 'rgba(255,226,140,.9)' : 'rgba(255,248,220,.8)';
        const x = r() * w, y = h * (.1 + .7 * r()); c.beginPath(); c.arc(x, y, 1.2 + r() * 1.6, 0, TAU); c.fill();
      }
      c.fillStyle = '#e4b04a'; c.fillRect(0, 0, w, h * .05);           // the sash's gold edge at the top
    });
  }
  /** the skirt's radius at s (0 at the sash, 1 at the hem) and angle a (0 in front, her +z): a bell, longer behind */
  const bell = (s, a) => {
    const c = Math.cos(a), hem = c > 0 ? lerp(SKIRT.side, SKIRT.front, c) : lerp(SKIRT.side, SKIRT.back, -c);
    return lerp(SKIRT.waist, hem, 1 - Math.pow(1 - s, 2.3));
  };
  function makeSkirt() {
    const { NS, NV } = SKIRT, n = (NS + 1) * (NV + 1), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NS; i++) {
      const k = j * (NS + 1) + i; uv[k * 2] = i / NS * 2; uv[k * 2 + 1] = 1 - j / NV;   // the pattern twice round
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NS; i++) { const a = j * (NS + 1) + i, b = a + 1, c = a + NS + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = kit.keep(new THREE.BufferGeometry()); geo.setIndex(idx);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const map = skirtTexture(); map.wrapS = THREE.RepeatWrapping;
    const mesh = new THREE.Mesh(geo, mat(0xffffff, { map, roughness: .42, metalness: .05, side: THREE.DoubleSide, envMap: kit.env, envMapIntensity: .8 }));
    mesh.castShadow = true; mesh.frustumCulled = false;
    return mesh;
  }
  /** shapes the skirt: flare (0..1) widens the hem and lifts it, twist (radians) drags the hem behind a turn, sway
      (-1..1) swings it to one side, drop: how far (model units) she has sunk, so the hem stays on the floor */
  function shapeSkirt(mesh, flare, twist, sway, drop, T) {
    const { NS, NV, top, hem } = SKIRT, p = mesh.geometry.attributes.position;
    const len = top - hem - drop;                                      // she sinks: the hem stays on the floor
    for (let j = 0; j <= NV; j++) {
      const s = j / NV, ss = s * s;
      for (let i = 0; i <= NS; i++) {
        const a0 = i / NS * TAU, a = a0 + twist * ss * (1 - .4 * s);
        const pleat = 1 + .035 * Math.sin(a0 * 16) * s, scallop = s > .99 ? .02 * Math.abs(Math.sin(a0 * 10)) : 0;
        const ripple = flare * .06 * Math.sin(a0 * 6 - T * 9) * ss;
        const r = bell(s, a0) * pleat * (1 + flare * .55 * ss + ripple);
        p.setXYZ(j * (NS + 1) + i, Math.sin(a) * r + sway * .12 * ss, top - s * len + flare * .16 * ss + scallop, Math.cos(a) * r);
      }
    }
    p.needsUpdate = true; mesh.geometry.computeVertexNormals();
  }

  /* ── the princess: a rose bodice, lace cuffs and hem, a gold sash, dark brown hair, a blush wrap over the skirt ── */
  function dressPrincess(m) {
    repaint(m, {
      '0,1': '#f39ab3', '4,0': '#fff6f0', '3,0': '#fff1d6', '5,0': '#e9b44c', '2,2': '#e9b44c', '1,1': '#f2c65a',   // bodice, lace, pearl buttons, sash, purse, hair clasp
      '2,1': '#ffc9d6', '7,1': '#d9668b', '3,2': '#f3c2a0', '1,0': '#3b241c'                                       // the wrap, stockings, slippers, hair
    });
    const brows = m.node('Mage_Head')?.geometry, bp = brows?.attributes.position, buv = brows?.attributes.uv;
    if (bp) {                                                          // her brows: inner ends raised a little, a softer look
      for (let i = 0; i < bp.count; i++) {
        const x = Math.abs(bp.getX(i)), y = bp.getY(i);
        if (Math.floor(buv.getX(i) * 8) !== 1 || Math.floor(buv.getY(i) * 4) !== 0 || x < .08 || x > .33 || y < 1.66 || y > 1.81 || bp.getZ(i) < .28) continue;
        bp.setY(i, y + .015 + .05 * clamp(1 - (x - .09) / .22));
      }
      bp.needsUpdate = true;
    }
    const hips = m.node('hips'), skirt = makeSkirt(); hips?.add(skirt);
    shapeSkirt(skirt, 0, 0, 0, 0, 0);
    /* her wrap: its own sheer material, and draped over the skirt's back instead of through it */
    const capeNode = m.node('Mage_Cape');
    if (capeNode) {
      capeNode.material = kit.keep(capeNode.material.clone()); capeNode.material.transparent = true; capeNode.material.opacity = .82;
      capeNode.material.side = THREE.DoubleSide;
      m.root.updateMatrixWorld(true);
      const hy = hips ? m.scene.worldToLocal(hips.getWorldPosition(new THREE.Vector3())).y : .39;   // her hips' height, model units
      const p = capeNode.geometry.attributes.position, chestTop = 1.2;   // the wrap hangs from about here
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), my = chestTop + y, s = clamp((SKIRT.top + hy - my) / (SKIRT.top - SKIRT.hem));
        if (s <= 0) continue;
        const a = Math.atan2(x, z), want = bell(s, a) * 1.06 + .03, r = Math.hypot(x, z);
        if (r < want) p.setXYZ(i, x * want / (r || 1), y, z * want / (r || 1));
      }
      p.needsUpdate = true; capeNode.geometry.computeVertexNormals();
    }
    const cape = cloth(capeNode);
    return {
      skirt,
      /** the skirt (flare, twist, sway, drop: see shapeSkirt) and the wrap (lift, side, ripple, lean: see swing) */
      pose(o, T) {
        shapeSkirt(skirt, o.flare || 0, o.twist || 0, o.sway || 0, o.drop || 0, T);
        swing(cape, o.lift || 0, o.side || 0, o.ripple || 0, T, o.lean || 0);
      }
    };
  }

  return { dressPrince, dressPrincess };
};
