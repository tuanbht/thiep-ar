/* Dạo biển hoàng hôn: the beach, built in code for story.js (template.json "story" loads this file first). The sky page (a
   sunset, a dusk painted over it that fades in, the sun, the far sea in front), the sea on the card with its foam and wet
   sand, the sand, a palm, shells and a starfish, crabs, gulls, a driftwood stick and the stone it lies across, a bottle
   with a message and a driftwood bench. The story places and times them; the waves lap, the gulls fly and the crabs' legs
   go by T, the act's own time.
     NM_BEACH.scenery(kit, layout) → the builders; layout: { PAGE, HORIZON, SUN, BACK, SHORE, DECAL, STICK, SURGES, BENCH } */
(window.NM_BEACH = window.NM_BEACH || {}).scenery = (kit, { PAGE, HORIZON, SUN, BACK, SHORE, DECAL, STICK, SURGES, BENCH }) => {
  const { THREE, stage, ease, seg, clamp, lerp } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;
  const PX = 1024 / PAGE.width;                                      // the page's canvas: pixels per card width
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .7, ...o }));
  const geo = g => kit.keep(g);
  const H2 = [0, 0];
  /** a heart's outline, about 2 wide: the notch at t = 0, the tip at t = π, the right lobe first; fills `out` (no garbage) */
  const heartXY = (t, out = H2) => {
    out[0] = Math.sin(t) ** 3; out[1] = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 + .18;
    return out;
  };

  /* ── the sky page: a sunset, a dusk painted over it that fades in, the sun, and the far sea in front ── */
  const SUNSET = [[0, '#5b4a8f'], [.28, '#a35d9c'], [.52, '#ec7f8e'], [.74, '#ff9f6e'], [.9, '#ffcd78'], [1, '#ffeab2']];
  const DUSK = [[0, '#121539'], [.32, '#2b2862'], [.6, '#5f3a7e'], [.82, '#b9557f'], [.94, '#ee8069'], [1, '#ffad74']];
  const pageX = x => (x + PAGE.width / 2) * PX, pageY = (y, h) => h - y * PX;
  const pageZ = x => PAGE.z + PAGE.curve * (x / (PAGE.width / 2)) ** 2;   // where the page stands at x: its ends come forward
  /** a fluffy heart of a cloud, its underside lit by the low sun */
  function heartCloud(c, x, y, s, body, belly, rim, r) {
    const g = c.createLinearGradient(0, y - s * .5, 0, y + s * .45); g.addColorStop(0, body); g.addColorStop(1, belly);
    c.fillStyle = g; kit.heartPath(c, x, y, s); c.fill();
    for (let i = 0; i < 18; i++) {                                   // puffs along the outline
      const [hx, hy] = heartXY(i / 18 * TAU);
      c.beginPath(); c.arc(x + hx * s * .47, y - (hy - .18) * s * .47 - s * .06, s * (.09 + .05 * r()), 0, TAU); c.fill();
    }
    c.save(); c.beginPath(); c.rect(x - s, y + s * .05, s * 2, s); c.clip();
    c.strokeStyle = rim; c.globalAlpha = .75; c.lineWidth = s * .05; kit.heartPath(c, x, y, s); c.stroke(); c.restore();
  }
  /** a long thin cloud low over the sea, its belly gilded */
  function streak(c, x, y, w, h, body, rim) {
    c.fillStyle = body; c.beginPath(); c.ellipse(x, y, w, h, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(x - w * .35, y - h * .5, w * .45, h * .8, 0, 0, TAU); c.fill();
    c.strokeStyle = rim; c.lineWidth = h * .45; c.beginPath(); c.ellipse(x, y + h * .15, w * .92, h * .75, 0, .15, Math.PI - .15); c.stroke();
  }
  function paintSky(c, W, Hc, night) {
    const r = seeded(night ? 31 : 17), hz = pageY(HORIZON, Hc), sx = pageX(SUN.x), sy = pageY(.3, Hc);
    const g = c.createLinearGradient(0, 0, 0, hz);
    for (const [k, col] of night ? DUSK : SUNSET) g.addColorStop(k, col);
    c.fillStyle = g; c.fillRect(0, 0, W, hz + 2);
    const glow = c.createRadialGradient(sx, night ? hz : sy, 0, sx, night ? hz : sy, night ? 330 : 440);
    glow.addColorStop(0, night ? 'rgba(255,160,110,.6)' : 'rgba(255,246,205,.95)'); glow.addColorStop(.3, night ? 'rgba(240,110,120,.3)' : 'rgba(255,214,140,.5)');
    glow.addColorStop(1, 'rgba(255,190,150,0)'); c.fillStyle = glow; c.fillRect(0, 0, W, hz + 2);
    if (night) for (let i = 0; i < 70; i++) {                         // faint stars; the bright ones twinkle in front of it
      c.fillStyle = `rgba(255,248,230,${.25 + .5 * r()})`; c.beginPath(); c.arc(r() * W, r() * hz * .6, .8 + r() * 1.3, 0, TAU); c.fill();
    }
    const body = night ? '#5a3f7c' : '#d27a9c', rim = night ? '#ff8f86' : '#fff0b8';
    streak(c, pageX(-.3), pageY(.245, Hc), 170, 7, body, rim); streak(c, pageX(.3), pageY(.27, Hc), 140, 6, body, rim);
    streak(c, pageX(-.05), pageY(.36, Hc), 120, 5, night ? '#6b4682' : '#e48ba0', rim); streak(c, pageX(.42), pageY(.4, Hc), 90, 5, body, rim);
    heartCloud(c, pageX(-.36), pageY(.56, Hc), 120, night ? '#4c3a77' : '#f6a3b8', night ? '#a35485' : '#ffc9a0', rim, r);
    heartCloud(c, pageX(.33), pageY(.62, Hc), 92, night ? '#463873' : '#ee9ab6', night ? '#9a4f84' : '#ffc29c', rim, r);
    heartCloud(c, pageX(-.1), pageY(.69, Hc), 58, night ? '#3f346c' : '#e28fb1', night ? '#8c4a80' : '#ffb898', rim, r);
    c.fillStyle = night ? '#2b2c62' : '#4a4f93'; c.fillRect(0, hz, W, Hc - hz);
  }
  function paintSea(c, W, Hc) {                                        // only below the horizon: the rest is cut away
    const r = seeded(5), hz = pageY(HORIZON, Hc), sx = pageX(SUN.x);
    const g = c.createLinearGradient(0, hz, 0, Hc);
    g.addColorStop(0, '#f0b0a6'); g.addColorStop(.1, '#b685b0'); g.addColorStop(.45, '#6268a9'); g.addColorStop(1, '#30508e');
    c.fillStyle = g; c.fillRect(0, hz, W, Hc - hz);
    for (let i = 0; i < 560; i++) {                                    // ripples: fine near the horizon, broad in front
      const k = Math.pow(r(), 1.5), y = hz + 3 + k * (Hc - hz - 5), len = 5 + (8 + 50 * k) * r(), x = r() * W;
      c.strokeStyle = `rgba(255,${(205 + 40 * r()) | 0},225,${.1 + .2 * r()})`; c.lineWidth = .8 + k * 2.4;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.stroke();
    }
    for (let i = 0; i < 300; i++) {                                    // the sun's path: golden dashes, wider towards you
      const k = r(), y = hz + 2 + k * (Hc - hz - 4), spread = 8 + 75 * k, x = sx + (r() + r() + r() - 1.5) * spread, len = 6 + (6 + 34 * k) * r();
      c.globalAlpha = .5 + .5 * r(); c.strokeStyle = ['#fff4c2', '#ffd27a', '#ffb36b', '#ffe9a6'][(r() * 4) | 0]; c.lineWidth = 1 + k * 2.6;
      c.beginPath(); c.moveTo(x - len / 2, y); c.lineTo(x + len / 2, y); c.stroke();
    }
    c.globalAlpha = 1;
    const line = c.createLinearGradient(sx - 260, 0, sx + 260, 0);
    line.addColorStop(0, 'rgba(255,236,190,0)'); line.addColorStop(.5, 'rgba(255,240,200,.95)'); line.addColorStop(1, 'rgba(255,236,190,0)');
    c.fillStyle = line; c.fillRect(sx - 260, hz, 520, 3);
  }
  /** the page, hinged at its foot so it can fold up: { root, dusk, sea, sun, sunGlow } */
  function makePage() {
    const o = { width: PAGE.width, height: PAGE.height, curve: PAGE.curve, z: 0 };
    const root = new THREE.Group(); root.position.z = PAGE.z;
    const sky = kit.backdrop((c, w, h) => paintSky(c, w, h, false), { ...o, order: -4 });
    const dusk = kit.backdrop((c, w, h) => paintSky(c, w, h, true), { ...o, order: -3 }); dusk.position.z = .002; dusk.material.opacity = 0;
    const sea = kit.backdrop(paintSea, { ...o, order: -2, alphaTest: .5 }); sea.position.z = .008;   // cut away above the horizon: the sun sets behind it
    const back = new THREE.Mesh(sky.geometry, mat(0xf3e6cf, { roughness: 1, side: THREE.BackSide })); back.position.z = -.002;   // the page's paper back
    const disc = kit.canvasTexture(256, 256, (c, w) => {
      const s = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      s.addColorStop(0, '#fffbe8'); s.addColorStop(.55, '#ffe58c'); s.addColorStop(.85, '#ffc356'); s.addColorStop(.97, '#ffad48'); s.addColorStop(1, 'rgba(255,170,70,0)');
      c.fillStyle = s; c.fillRect(0, 0, w, w);
    });
    const sun = new THREE.Mesh(geo(new THREE.PlaneGeometry(SUN.r * 2, SUN.r * 2)), kit.keep(new THREE.MeshBasicMaterial({ map: disc, transparent: true, toneMapped: false })));
    sun.position.set(SUN.x, .3, .005);
    const sunGlow = kit.glow({ color: 0xffd08a, size: .42, opacity: .75 }); sunGlow.position.set(SUN.x, .3, .004);
    root.add(back, sky, dusk, sun, sunGlow, sea);
    return { root, dusk, sea, sun, sunGlow };
  }

  /* ── the sea on the card: a strip of water whose waves move its corners, a lace of foam along its edge, wet sand ── */
  const NX = 64, NZ = 12;
  const DEEP = new THREE.Color('#2f4c8c'), MID = new THREE.Color('#3f86b0'), SHALLOW = new THREE.Color('#68cfc8'), GOLD = new THREE.Color('#ffc46a');
  let water, foam, wet;
  const strip = (rows, o = {}) => {                                  // a grid NX wide and `rows` deep, its corners moved every frame
    const g = new THREE.BufferGeometry(), n = (NX + 1) * rows, idx = [], uv = new Float32Array(n * 2);
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    for (let j = 0; j < rows; j++) for (let i = 0; i <= NX; i++) uv.set([i / NX * (o.repeat || 1), j / (rows - 1)], (j * (NX + 1) + i) * 2);
    g.setIndex(idx); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    if (o.colors) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage));
    return geo(g);
  };
  function makeSea() {
    water = new THREE.Mesh(strip(NZ + 1, { colors: true }), kit.keep(new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true,
      roughness: .2, metalness: .15, envMap: kit.env, envMapIntensity: .9 })));
    const lace = kit.canvasTexture(256, 64, (c, w, h) => {
      const r = seeded(9);
      for (let i = 0; i < 900; i++) {
        const v = Math.pow(r(), .55), y = v * h * .92, a = (.15 + .85 * v) * (r() < .8 ? 1 : .4);
        c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.arc(r() * w, y, 1 + 3.5 * r() * v, 0, TAU); c.fill();
      }
      c.fillStyle = 'rgba(255,255,255,.95)'; c.fillRect(0, h * .8, w, h * .1);
    });
    lace.wrapS = THREE.RepeatWrapping; lace.flipY = false;
    foam = new THREE.Mesh(strip(3, { repeat: 7 }), kit.keep(new THREE.MeshStandardMaterial({ map: lace, transparent: true, depthWrite: false, roughness: 1,
      emissive: 0xffffff, emissiveIntensity: .12 })));
    wet = new THREE.Mesh(strip(3, { colors: true }), kit.keep(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })));
    for (const m of [water, foam, wet]) { m.frustumCulled = false; stage.add(m); }
  }
  /** how far the story's big waves have run up the sand at x: SURGES are { at, peak, end, reach, x, wide } */
  const surgeK = (g, s) => (g < s.at || g > s.end ? 0 : g < s.peak ? ease.out(seg(g, s.at, s.peak)) : 1 - ease.inOut(seg(g, s.peak, s.end)));
  const surgeAt = (x, g, s) => surgeK(g, s) * s.reach * Math.exp(-(((x - s.x) / s.wide) ** 2)) * (1 + .1 * Math.sin(x * 9 + s.at));
  const fillIn = g => ease.out(seg(g, .15, 1));
  /** where the water's edge is at x: it laps by T, flows in at the start, and the big waves run up the sand */
  function edge(x, g, T) {
    let z = SHORE + .011 * Math.sin(T * 1.9 + .4 * Math.sin(x * 5)) + .006 * Math.sin(x * 11 + T * .7) + .004 * Math.sin(x * 23 - T * 1.3);
    for (const s of SURGES) z += surgeAt(x, g, s);
    return lerp(BACK + .004, z, fillIn(g));
  }
  /** how far up the sand it is wet: just past the lapping, and where a big wave reached, for a while after */
  function wetLine(x, g, zEdge) {
    let z = zEdge + .012 + .006 * (1 + Math.sin(x * 13));
    for (const s of SURGES) if (g > s.at) {
      const reached = SHORE + s.reach * Math.exp(-(((x - s.x) / s.wide) ** 2)) * (g < s.peak ? ease.out(seg(g, s.at, s.peak)) : 1);
      z = Math.max(z, lerp(reached, zEdge, ease.smooth(seg(g, s.peak + .8, s.end + 2.5))));
    }
    return z;
  }
  const cTmp = new THREE.Color(), WET = [.34, .26, 0];             // how dark the wet band is, from the water's edge up
  function poseSea(g, T, night) {
    const wp = water.geometry.attributes.position, wc = water.geometry.attributes.color;
    const fp = foam.geometry.attributes.position, kp = wet.geometry.attributes.position, kc = wet.geometry.attributes.color;
    const calm = fillIn(g);
    for (let i = 0; i <= NX; i++) {
      const x = -.5 + i / NX, zf = edge(x, g, T), zw = wetLine(x, g, zf);
      for (let j = 0; j <= NZ; j++) {
        const s = j / NZ, k = 1 - Math.pow(1 - s, 1.7), z = lerp(BACK, zf, k), n = j * (NX + 1) + i;
        const swell = (.0034 * Math.sin(58 * z - 2.3 * T + 2.5 * x) + .0016 * Math.sin(31 * x + 1.6 * T) + .001 * Math.sin(95 * z + 40 * x - 3.2 * T)) * (1 - .8 * s) * calm;
        wp.setXYZ(n, x, j === NZ ? .0032 : .0062 + swell, z);
        cTmp.copy(DEEP).lerp(MID, clamp(s * 1.6)).lerp(SHALLOW, clamp((s - .55) / .45));
        const path = Math.exp(-(((x - SUN.x) / (.05 + .05 * s)) ** 2)) * (.55 + .45 * Math.sin(T * 3.1 + z * 90 + x * 30)) * (1 - .4 * night);
        cTmp.lerp(GOLD, .55 * path);
        wc.setXYZW(n, cTmp.r, cTmp.g, cTmp.b, s < .62 ? .97 : lerp(.97, .3, (s - .62) / .38));
      }
      fp.setXYZ(i, x, .0068, zf - .024); fp.setXYZ(NX + 1 + i, x, .0066, zf - .006); fp.setXYZ(2 * (NX + 1) + i, x, .0064, zf + .004);
      kp.setXYZ(i, x, DECAL, zf - .01); kp.setXYZ(NX + 1 + i, x, DECAL, lerp(zf, zw, .55)); kp.setXYZ(2 * (NX + 1) + i, x, DECAL, zw);
      for (let row = 0; row < 3; row++) kc.setXYZW(row * (NX + 1) + i, .45, .3, .18, WET[row] * calm);
    }
    water.geometry.computeVertexNormals();
    wp.needsUpdate = wc.needsUpdate = fp.needsUpdate = kp.needsUpdate = kc.needsUpdate = true;
    foam.material.map.offset.x = .02 * Math.sin(T * .8); foam.material.opacity = .85 * calm;
  }

  /* ── the sand: warm, finer towards you, with wind ripples and bits of shell ── */
  function makeSand() {
    const tex = kit.canvasTexture(1024, 640, (c, w, h) => {
      const r = seeded(3), g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#e8c08c'); g.addColorStop(.35, '#f0d0a0'); g.addColorStop(1, '#f6dfb4');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let y = 8; y < h; y += 11 + r() * 9) {                       // wind ripples
        const ph = r() * 9, amp = 2 + r() * 3;
        for (const [dy, col] of [[0, 'rgba(176,120,70,.16)'], [2.5, 'rgba(255,248,230,.35)']]) {
          c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath();
          for (let x = 0; x <= w; x += 12) c.lineTo(x, y + dy + amp * Math.sin(x * .018 + ph) + 1.5 * Math.sin(x * .07 + ph * 2));
          c.stroke();
        }
      }
      for (let i = 0; i < 14000; i++) {                                 // grains
        c.fillStyle = r() < .55 ? `rgba(255,250,236,${.25 + .4 * r()})` : `rgba(140,96,56,${.12 + .3 * r()})`;
        c.fillRect(r() * w, r() * h, 1 + r() * 1.4, 1 + r() * 1.4);
      }
      for (let i = 0; i < 70; i++) {                                    // shell bits and pebbles
        c.fillStyle = ['#fff4ea', '#f7c9c0', '#d9b48c', '#c9a27a', '#ffffff'][(r() * 5) | 0];
        c.beginPath(); c.ellipse(r() * w, r() * h, 1.5 + 3 * r(), 1 + 2 * r(), r() * 3, 0, TAU); c.fill();
      }
    });
    const sand = new THREE.Mesh(geo(new THREE.PlaneGeometry(1, kit.card.depth)), mat(0xffffff, { map: tex, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2; sand.position.y = .0005; sand.receiveShadow = true;
    stage.add(sand);
  }

  /* ── a palm tree: a ringed trunk bending towards the sea, fronds that sway, coconuts ── */
  function frondGeometry() {
    const g = new THREE.PlaneGeometry(1, 1, 4, 10), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i), s = p.getY(i) + .5, w = .046 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.05)), .7) + .004;
      p.setXYZ(i, u * 2 * w, .05 * Math.sin(Math.PI * s * .75) - .1 * s * s - Math.abs(u) * w * .9, s * .19);
    }
    g.computeVertexNormals();
    return geo(g);
  }
  /** { root, sway (the trunk, to rock), crown, fronds } */
  function makePalm() {
    const root = new THREE.Group(), sway = new THREE.Group(); root.add(sway);
    const barkA = mat('#a87a4e', { roughness: .9 }), barkB = mat('#8b5f3a', { roughness: .9 });
    const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(-.004, .12, .004), V3(-.025, .25, .012), V3(-.07, .36, .02)]);
    const N = 12;
    for (let i = 0; i < N; i++) {
      const a = curve.getPointAt(i / N), b = curve.getPointAt((i + 1) / N), r0 = lerp(.02, .011, i / N), r1 = lerp(.02, .011, (i + 1) / N);
      const ring = new THREE.Mesh(geo(new THREE.CylinderGeometry(r1 * 1.25, r0 * .92, a.distanceTo(b) * 1.04, 10)), i % 2 ? barkA : barkB);
      ring.position.copy(a).lerp(b, .5); ring.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); ring.castShadow = true;
      sway.add(ring);
    }
    const crown = new THREE.Group(); crown.position.copy(curve.getPointAt(1)); sway.add(crown);
    const leaf = kit.canvasTexture(128, 512, (c, w, h) => {
      c.lineCap = 'round';
      for (let k = 0; k < 46; k++) {                                     // leaflets from the midrib out to the edges
        const y = h * (.03 + .94 * k / 46);
        for (const s of [-1, 1]) {
          c.strokeStyle = ['#3f9a46', '#2f7d3a', '#57b04f'][k % 3]; c.lineWidth = 7;
          c.beginPath(); c.moveTo(w / 2, y); c.quadraticCurveTo(w / 2 + s * w * .25, y + 10, w / 2 + s * w * .48, y + 34); c.stroke();
        }
      }
      c.strokeStyle = '#c8d97a'; c.lineWidth = 6; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
    });
    const leafM = mat(0xffffff, { map: leaf, alphaTest: .4, side: THREE.DoubleSide, roughness: .8 });
    const fg = frondGeometry(), fronds = [];
    for (let i = 0; i < 9; i++) {
      const arm = new THREE.Group(); arm.rotation.y = i * TAU / 9 + .3; crown.add(arm);
      const f = new THREE.Mesh(fg, leafM); f.castShadow = true; f.rotation.x = -.15 + .25 * (i % 3) / 2; arm.add(f); fronds.push(f);
    }
    const nut = mat('#6b4423', { roughness: .6 }), ng = geo(new THREE.SphereGeometry(.011, 12, 10));
    for (const [x, y, z] of [[.008, -.012, .006], [-.009, -.013, .004], [0, -.014, -.01]]) { const c = new THREE.Mesh(ng, nut); c.position.set(x, y, z); c.castShadow = true; crown.add(c); }
    return { root, sway, crown, fronds };
  }

  /* ── shells and a starfish on the sand ── */
  function scallop(colors) {
    const g = new THREE.BufferGeometry(), pos = [], col = [], idx = [], NT = 14, NR = 5, c = new THREE.Color();
    for (let ri = 0; ri <= NR; ri++) for (let ti = 0; ti <= NT; ti++) {
      const r = ri / NR, th = lerp(-1.2, 1.2, ti / NT), rib = .06 * Math.abs(Math.cos(th * 7)) * r, Rr = r * (1 + .05 * Math.cos(th * 14));
      pos.push(Math.sin(th) * Rr, .32 * (1 - r * r) + rib, -Math.cos(th) * Rr + .5);
      c.set(colors[ti % 2]); if (ri === NR) c.lerp(new THREE.Color('#ffffff'), .3); col.push(c.r, c.g, c.b);
    }
    for (let ri = 0; ri < NR; ri++) for (let ti = 0; ti < NT; ti++) { const a = ri * (NT + 1) + ti, b = a + 1, d = a + NT + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
    g.setIndex(idx); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return new THREE.Mesh(geo(g), mat(0xffffff, { vertexColors: true, roughness: .5, side: THREE.DoubleSide }));
  }
  function conch() {
    const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(.42 * Math.sin(Math.PI * Math.pow(t, .8)) * (1 + .12 * Math.sin(t * 40)), t * 1.4)); }
    const g = new THREE.LatheGeometry(pts, 14), c = new THREE.Color(), col = [];
    for (let i = 0; i < g.attributes.position.count; i++) { c.set(Math.sin(g.attributes.position.getY(i) * 26) > .3 ? '#c8875a' : '#fbead7'); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return new THREE.Mesh(geo(g), mat(0xffffff, { vertexColors: true, roughness: .45 }));
  }
  function starfish() {
    const s = new THREE.Shape();
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .42 : 1;
      if (!i) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else { const m = Math.PI / 2 + (i - .5) * Math.PI / 5, rm = i % 2 ? .62 : .66; s.quadraticCurveTo(Math.cos(m) * rm, Math.sin(m) * rm, Math.cos(a) * r, Math.sin(a) * r); }
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: .12, bevelEnabled: true, bevelThickness: .14, bevelSize: .12, bevelSegments: 3, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    const star = new THREE.Group(), body = new THREE.Mesh(geo(g), mat('#ff8a57', { roughness: .65 })); star.add(body);
    const dot = geo(new THREE.SphereGeometry(.07, 6, 5)), dm = mat('#ffe2c4');
    for (let i = 0; i < 5; i++) for (const r of [.3, .55, .78]) {
      const a = Math.PI / 2 + i * TAU / 5, d = new THREE.Mesh(dot, dm); d.position.set(Math.cos(a) * r, .28, -Math.sin(a) * r); star.add(d);
    }
    return star;
  }
  /** the shells and the starfish where they lie, each with the story time it pops out of the sand: [{ m, s, at }] */
  const SHELLS = [[.36, .21, .4, .022, 'star', .8], [-.4, .22, 2, .018, 'pink', .95], [.2, .25, -.6, .015, 'white', 1.05], [-.08, .27, 1.1, .02, 'conch', 1.15],
    [.43, .05, -1.2, .016, 'pink', 1.25], [-.3, -.05, .5, .014, 'white', 1.3], [.31, -.08, 2.4, .018, 'conch', 1.4]];
  function makeShells() {
    return SHELLS.map(([x, z, r, s, kind, at]) => {
      const m = kind === 'star' ? starfish() : kind === 'conch' ? conch() : scallop(kind === 'pink' ? ['#ffb3b0', '#ff8f95'] : ['#fff7ee', '#f3dccb']);
      m.position.set(x, kind === 'conch' ? s * .3 : .002, z); m.rotation.y = r; if (kind === 'conch') m.rotation.z = R;
      m.traverse(o => { if (o.isMesh) o.castShadow = true; });
      stage.add(m); return { m, s, at };
    });
  }

  /* ── a little crab: a shell on six legs, eyes on stalks, two claws; pose() walks it sideways and waves its claws ── */
  function makeCrab(color) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const red = mat(color, { roughness: .5 }), pale = mat('#ffb09a', { roughness: .6 }), black = mat('#1d1720', { roughness: .3 });
    const shell = new THREE.Mesh(geo(new THREE.SphereGeometry(.016, 16, 10).scale(1.25, .55, .95)), red); shell.position.y = .012; shell.castShadow = true; body.add(shell);
    const eyes = [-1, 1].map(s => {
      const e = new THREE.Group(); e.position.set(s * .007, .017, .01); body.add(e);
      const stalk = new THREE.Mesh(geo(new THREE.CylinderGeometry(.0013, .0013, .008, 5)), pale); stalk.position.y = .004; e.add(stalk);
      const ball = new THREE.Mesh(geo(new THREE.SphereGeometry(.0034, 8, 6)), black); ball.position.y = .009; e.add(ball);
      return e;
    });
    const claws = [-1, 1].map(s => {
      const c = new THREE.Group(); c.position.set(s * .016, .011, .01); body.add(c);
      const arm = new THREE.Mesh(geo(new THREE.CylinderGeometry(.0022, .0022, .012, 5)), red); arm.rotation.z = s * 1.1; arm.position.set(s * .004, .002, .003); c.add(arm);
      const pin = new THREE.Group(); pin.position.set(s * .009, .006, .007); c.add(pin);
      const big = new THREE.Mesh(geo(new THREE.SphereGeometry(.0065, 10, 8).scale(.8, 1, .7)), red); big.castShadow = true; pin.add(big);
      const jaw = new THREE.Mesh(geo(new THREE.ConeGeometry(.0028, .009, 6)), red); jaw.position.set(0, .007, .002); jaw.rotation.x = .3; pin.add(jaw);
      return { c, jaw };
    });
    const legs = [];
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const hip = new THREE.Group(); hip.position.set(s * .014, .009, .004 - i * .006); hip.rotation.y = s * (i - 1) * .35; body.add(hip);
      const leg = new THREE.Mesh(geo(new THREE.CylinderGeometry(.0013, .001, .016, 4)), red); leg.position.set(s * .006, -.003, 0); leg.rotation.z = s * 1.05; hip.add(leg);
      legs.push({ hip, s, i });
    }
    /** at (x, z) facing `turn`, `out` of the sand (0..1), walking (0..1: legs going), claws up by `cheer` (0..1); ph keeps two crabs apart */
    function pose(x, z, turn, out, walk, cheer, T, ph) {
      root.position.set(x, -.02 * (1 - out), z); root.scale.setScalar(Math.max(.001, out)); root.rotation.y = turn;
      body.position.y = .002 * Math.abs(Math.sin(T * 18)) * walk;
      for (const l of legs) l.hip.rotation.z = l.s * .3 * Math.sin(T * 22 + l.i * 2 + (l.s > 0 ? 0 : 1.5)) * walk;
      claws.forEach((k, j) => { k.c.rotation.z = (j ? -1 : 1) * (.15 + (.9 + .2 * Math.sin(T * 14)) * cheer); k.jaw.rotation.x = .3 + .35 * Math.abs(Math.sin(T * (3 + j) + ph)); });
      eyes.forEach((e, j) => { e.rotation.z = .2 * Math.sin(T * 1.3 + j + ph * 2); });
    }
    stage.add(root);
    return { root, pose };
  }

  /* ── seagulls: little pictures with three wingbeats on one strip (each bird shows its own); they fly by T ── */
  let gulls = [];
  function makeGulls() {
    const frames = new THREE.CanvasTexture((() => {
      const cv = document.createElement('canvas'); cv.width = 384; cv.height = 128;
      const c = cv.getContext('2d'); c.lineJoin = c.lineCap = 'round';
      [-34, 0, 26].forEach((lift, f) => {
        c.save(); c.translate(64 + f * 128, 70);
        for (const s of [-1, 1]) {                                    // the wings: pale grey on top, black tips
          c.fillStyle = '#eef2f8'; c.strokeStyle = '#2b2f45'; c.lineWidth = 6;
          c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(s * 22, lift - 6, s * 34, lift * .8 - 2); c.quadraticCurveTo(s * 46, lift * .6, s * 58, lift + 4);
          c.quadraticCurveTo(s * 40, lift * .55 + 12, s * 24, lift * .3 + 10); c.quadraticCurveTo(s * 12, 6, 0, 8); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#2b2f45'; c.beginPath(); c.moveTo(s * 50, lift * .65 + 2); c.quadraticCurveTo(s * 54, lift + 1, s * 58, lift + 4); c.quadraticCurveTo(s * 50, lift * .6 + 8, s * 44, lift * .55 + 8); c.fill();
        }
        c.fillStyle = '#ffffff'; c.strokeStyle = '#2b2f45'; c.lineWidth = 6;
        c.beginPath(); c.ellipse(0, 4, 12, 8, 0, 0, TAU); c.fill(); c.stroke();
        c.beginPath(); c.arc(9, -2, 7, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = '#ffb02e'; c.beginPath(); c.moveTo(15, -2); c.lineTo(25, 0); c.lineTo(15, 2); c.fill();
        c.restore();
      });
      return cv;
    })());
    frames.colorSpace = THREE.SRGBColorSpace; kit.keep(frames);
    gulls = [{ y: .6, z: -.21, period: 9, off: 1.2, dir: 1, size: .075 }, { y: .53, z: -.24, period: 11, off: 6.5, dir: -1, size: .062 },
      { y: .67, z: -.19, period: 13, off: 3.4, dir: 1, size: .055 }].map(o => {
      const t = kit.keep(frames.clone()); t.repeat.set(1 / 3, 1); t.needsUpdate = true;
      const s = new THREE.Sprite(kit.keep(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }))); s.renderOrder = 4;
      stage.add(s); return { ...o, s, t };
    });
  }
  /** across the sky and round again; `show` fades them (in once the page is up, out as dusk comes) */
  function poseGulls(T, show) {
    for (const b of gulls) {
      const k = ((T + b.off) % b.period) / b.period, x = b.dir * lerp(-.72, .72, k);
      b.s.position.set(x, b.y + .02 * Math.sin(T * 1.3 + b.off) + .006 * Math.sin(T * 6 + b.off), Math.max(b.z, pageZ(x) + .02));   // in front of the page's ends
      b.t.offset.x = [0, 1, 2, 1][Math.floor((T * 7 + b.off) % 4)] / 3;
      b.s.scale.set(b.size * b.dir * 1.5, b.size * .5, 1);
      b.s.material.opacity = clamp(1.6 - Math.abs(x) * 2.2) * show;
    }
  }

  /* ── props: a driftwood branch, a bottle with a rolled-up note in it ── */
  function makeStick() {
    const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(.003, .04, .002), V3(-.002, .09, -.002), V3(.002, STICK.len, 0)]);
    const wood = mat('#b49a7c', { roughness: .95 }), g = new THREE.Group();
    const shaft = new THREE.Mesh(geo(new THREE.TubeGeometry(curve, 16, .0032, 6)), wood); shaft.castShadow = true; g.add(shaft);
    const twig = new THREE.Mesh(geo(new THREE.CylinderGeometry(.0012, .0018, .022, 5)), wood); twig.position.set(.006, .05, 0); twig.rotation.z = -.7; g.add(twig);
    stage.add(g);
    return g;                                                        // its grip end at the origin, its tip up +y
  }
  /** { root, cork, roll }: the cork is the story's to pop off, the rolled note to hide when it flies out */
  function makeBottle() {
    const g = new THREE.Group();
    const pts = [[0, 0], [.0115, 0], [.0125, .003], [.0125, .031], [.0118, .037], [.008, .043], [.0047, .048], [.0045, .057], [.0054, .059], [.0054, .062], [.0044, .063]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const glass = new THREE.Mesh(geo(new THREE.LatheGeometry(pts, 20)), kit.keep(new THREE.MeshStandardMaterial({ color: 0xbff3e4, transparent: true, opacity: .42,
      roughness: .05, metalness: .1, envMap: kit.env, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false })));
    glass.renderOrder = 2; g.add(glass);
    const paper = mat('#fff6e2', { roughness: .8 });
    const roll = new THREE.Mesh(geo(new THREE.CylinderGeometry(.0068, .0068, .03, 12)), paper); roll.position.y = .02; g.add(roll);
    const tie = new THREE.Mesh(geo(new THREE.TorusGeometry(.007, .0012, 6, 16)), mat('#e8436d')); tie.rotation.x = R; tie.position.y = .02; g.add(tie);
    const cork = new THREE.Mesh(geo(new THREE.CylinderGeometry(.0048, .0042, .011, 10)), mat('#c99560', { roughness: .9 })); cork.castShadow = true;
    stage.add(g, cork);                                              // the cork flies on its own once it pops
    return { root: g, cork, roll };
  }
  /** a beach stone, rounded and a little flat: r across, its top h above the sand (its foot sunk in a little) */
  function makeStone(r, h) {
    const s = new THREE.Mesh(geo(new THREE.DodecahedronGeometry(1, 1)), mat('#9d958c', { roughness: 1, flatShading: true }));
    s.scale.set(r, h * .54, r * .85); s.position.y = h * .46; s.castShadow = s.receiveShadow = true;
    const g = new THREE.Group(); g.add(s); stage.add(g);
    return g;
  }
  /** a driftwood bench: a weathered plank across two stones, its top BENCH.top above the sand. The group stands on the
      sand, so scaling its height raises the bench out of it */
  function makeBench() {
    const { x0, x1, z, depth, top, thick } = BENCH, g = new THREE.Group();
    const grain = kit.canvasTexture(256, 32, (c, w, h) => {
      const r = seeded(77); c.fillStyle = '#c4b097'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const y = r() * h; c.strokeStyle = `rgba(${r() < .5 ? '120,98,74' : '236,226,210'},${.25 + .3 * r()})`; c.lineWidth = 1 + 2 * r();
        c.beginPath(); c.moveTo(0, y); for (let x = 16; x <= w; x += 16) c.lineTo(x, y + 2 * Math.sin(x * .03 + i)); c.stroke();
      }
    });
    const plank = new THREE.Mesh(geo(new THREE.BoxGeometry(x1 - x0, thick, depth)), mat(0xffffff, { map: grain, roughness: .95 }));
    plank.position.set((x0 + x1) / 2, top - thick / 2, z); plank.castShadow = plank.receiveShadow = true; g.add(plank);
    for (const x of [x0 + .016, x1 - .016]) g.add(makeStone(.024, top - thick).translateX(x).translateZ(z));
    stage.add(g);
    return g;
  }

  return { heartXY, seeded, V3, mat, geo, pageZ, surgeAt, makePage, makeSea, poseSea, makeSand, makePalm, makeShells, makeCrab, makeGulls, poseGulls, makeStick, makeBottle, makeStone, makeBench };
};
