/* Điệu valse đêm hội: her ball gown, for story.js (template.json "story" loads this file before it). The shared couple
   (templates/_models) come as they are, him in his bomber jacket and her in her blazer; she gets a ball gown's skirt
   built here, a bell from her waist to the floor that hangs straight down under her hips whichever way they tilt. The
   story moves it: flare, twist and sway come in as numbers, so this file holds no time of its own.
     NM_WALTZ.wardrobe(kit) → { dressPrincess(m) } */
(window.NM_WALTZ = window.NM_WALTZ || {}).wardrobe = kit => {
  const { THREE, lerp } = kit;
  const TAU = Math.PI * 2;
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .6, ...o }));
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

  /* ── the skirt: a bell from her waist to the floor, pleated, a ruffled tier and a lace hem. In her model's own units
        (metres, she is 1.70 m), measured from her hips: wide enough round the hem for her steps to stay inside it ── */
  const SKIRT = { top: .09, floor: .012, waist: .17, front: .36, side: .36, back: .46, NS: 64, NV: 16 };
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
      c.fillStyle = '#e4b04a'; c.fillRect(0, 0, w, h * .05);           // a gold sash at the top
    });
  }
  /** the skirt's radius at s (0 at the waist, 1 at the hem) and angle a (0 in front, her +z): a bell, longer behind */
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
  /** shapes the skirt from the waist (top, above its origin) down to `hem` (below it): flare (0..1) widens the hem and
      lifts it, twist (radians) drags the hem behind a turn, sway (-1..1) swings it to one side */
  function shapeSkirt(mesh, hem, flare, twist, sway, T) {
    const { NS, NV, top } = SKIRT, p = mesh.geometry.attributes.position, len = top - hem;
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

  /* ── the princess: her gown's skirt, hung from her hips but kept upright and turning only the way they turn ── */
  function dressPrincess(m) {
    const hips = m.node('hips'), legL = m.node('upperleg.l'), legR = m.node('upperleg.r'), skirt = makeSkirt();
    if (!hips) return { skirt, pose() {} };
    m.scene.add(skirt);                                                // in her model's own space: its units are hers
    const vH = new THREE.Vector3(), vL = new THREE.Vector3(), vR = new THREE.Vector3(), inv = new THREE.Matrix4();
    const inScene = (b, out) => { b.updateWorldMatrix(true, false); return out.setFromMatrixPosition(b.matrixWorld).applyMatrix4(inv); };
    return {
      skirt,
      /** o: flare, twist, sway (see shapeSkirt) and drop (how far, in her units, she has sunk: the hem stays on the floor) */
      pose(o, T) {
        m.scene.updateWorldMatrix(true, false); inv.copy(m.scene.matrixWorld).invert();
        inScene(hips, vH);
        if (legL && legR) { inScene(legL, vL); inScene(legR, vR); skirt.rotation.y = Math.atan2(-(vL.z - vR.z), vL.x - vR.x); }   // her hips' heading
        skirt.position.copy(vH);
        const floor = -m.scene.position.y / (m.scene.scale.y || 1);        // where her feet stand, in her own units
        shapeSkirt(skirt, floor + SKIRT.floor + (o.drop || 0) - vH.y, o.flare || 0, o.twist || 0, o.sway || 0, T);
      }
    };
  }

  return { dressPrincess };
};
