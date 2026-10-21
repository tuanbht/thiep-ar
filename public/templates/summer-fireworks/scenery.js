/* Pháo hoa mùa hạ: the summer festival by the river, built in code for story.js (template.json "story" loads this file
   first, then fireworks.js). The sky page (a dusk, and a night painted over it that fades in: the far bank with its hills,
   roofs and festival lights, the river winding away), the two banks and the river between them, a wooden arched bridge,
   three stalls with striped awnings, strings of red and white paper lanterns, a bamboo branch hung with wish strips, a
   goldfish tub, and what the two of them hold: a cotton candy, a paper fan, two wish strips. The story places and times
   them; the water, the lanterns, the strips and the fish move by T, the act's own time.
     NM_SUMMER.scenery(kit, layout) → the builders; layout: { PAGE, HORIZON, BANK, RIVER, BRIDGE } */
(window.NM_SUMMER = window.NM_SUMMER || {}).scenery = (kit, { PAGE, HORIZON, BANK, RIVER, BRIDGE }) => {
  const { THREE, stage, lerp } = kit;
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .78, ...o }));
  const geo = g => kit.keep(g);
  /** a mesh that casts and takes shadows, at (x, y, z) */
  const part = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), SC = new THREE.Vector3(), PO = new THREE.Vector3(), COL = new THREE.Color();
  /** many copies of one mesh in a single draw: each [x, y, z, rx, ry, rz, sx, sy, sz] (turns and sizes optional), colours optional */
  function instances(g, m, list, colors) {
    const im = new THREE.InstancedMesh(g, m, list.length);
    list.forEach((k, i) => {
      im.setMatrixAt(i, M4.compose(PO.set(k[0], k[1], k[2]), Q.setFromEuler(E.set(k[3] || 0, k[4] || 0, k[5] || 0)), SC.set(k[6] ?? 1, k[7] ?? k[6] ?? 1, k[8] ?? k[6] ?? 1)));
      if (colors) im.setColorAt(i, COL.set(colors[i]));
    });
    im.castShadow = im.receiveShadow = true;
    return im;
  }
  const DEPTH = kit.card.depth / 2;                                  // the card's half depth: z from -DEPTH to DEPTH
  /** the bridge deck's height at x (on the bank beyond its ends) */
  const deckY = x => { const k = (x - BRIDGE.x) / BRIDGE.half; return BANK + (Math.abs(k) < 1 ? BRIDGE.rise * (1 - k * k) : 0); };

  /* ── the sky page: a dusk, a night painted over it; the far bank, its hills, roofs and lights; the river going away ── */
  const PX = 1024 / PAGE.width;
  const pageX = x => (x + PAGE.width / 2) * PX, pageY = (y, h) => h - y * PX;
  const pageZ = x => PAGE.z + PAGE.curve * (x / (PAGE.width / 2)) ** 2;   // where the page stands at x: its ends come forward
  const DUSK = [[0, '#2f3b7c'], [.3, '#6b519f'], [.58, '#ca709f'], [.8, '#f89d86'], [1, '#ffd59c']];
  const NIGHT = [[0, '#060a24'], [.42, '#121b4b'], [.74, '#232d66'], [.9, '#373671'], [1, '#56467f']];
  function ridge(c, W, base, amp, seed, fill) {                       // a line of hills, filled down to the bottom
    const r = seeded(seed), k = [r() * 9, r() * 9, r() * 9];
    c.fillStyle = fill; c.beginPath(); c.moveTo(0, c.canvas.height);
    for (let x = 0; x <= W; x += 6) c.lineTo(x, base - amp * (.55 + .25 * Math.sin(x * .006 + k[0]) + .15 * Math.sin(x * .017 + k[1]) + .05 * Math.sin(x * .05 + k[2])));
    c.lineTo(W, c.canvas.height); c.closePath(); c.fill();
  }
  function paintPage(c, W, H, night) {
    const r = seeded(night ? 41 : 23), hz = pageY(HORIZON, H);
    const g = c.createLinearGradient(0, 0, 0, hz);
    for (const [k, col] of night ? NIGHT : DUSK) g.addColorStop(k, col);
    c.fillStyle = g; c.fillRect(0, 0, W, hz + 4);
    if (night) for (let i = 0; i < 120; i++) {                       // faint stars; the bright ones twinkle in front of it
      c.fillStyle = `rgba(255,248,230,${.2 + .5 * r()})`; c.beginPath(); c.arc(r() * W, r() * hz * .75, .7 + 1.2 * r(), 0, TAU); c.fill();
    }
    for (let i = 0; i < 7; i++) {                                     // long soft clouds: lit pink at dusk, dark at night
      const x = r() * W, y = hz * (.2 + .5 * r()), w = 90 + 140 * r(), h = 6 + 8 * r();
      c.fillStyle = night ? 'rgba(40,46,104,.55)' : 'rgba(255,190,200,.5)'; c.beginPath(); c.ellipse(x, y, w, h, 0, 0, TAU); c.fill();
      c.fillStyle = night ? 'rgba(80,70,140,.35)' : 'rgba(255,236,214,.55)'; c.beginPath(); c.ellipse(x - w * .2, y + h * .4, w * .6, h * .45, 0, 0, TAU); c.fill();
    }
    ridge(c, W, hz - 34, 70, 3, night ? '#1a1f4c' : '#8b6fae');      // far mountains, hazy
    ridge(c, W, hz - 6, 40, 8, night ? '#121637' : '#6a5590');       // near hills
    for (let i = 0; i < 46; i++) {                                    // trees along the far bank
      const x = r() * W, s = 7 + 10 * r();
      c.fillStyle = night ? ['#0d1230', '#141a3f'][i % 2] : ['#4f477a', '#5b4f86'][i % 2];
      c.beginPath(); c.arc(x, hz - s * .6, s, 0, TAU); c.fill();
    }
    const town = seeded(5);                                          // little roofs with lit windows; brighter at night
    for (let i = 0; i < 16; i++) {
      const x = 40 + town() * (W - 80), w = 22 + 26 * town(), h = 12 + 12 * town(), y = hz - 2;
      c.fillStyle = night ? '#191c3f' : '#5a4c7c'; c.fillRect(x, y - h, w, h);
      c.fillStyle = night ? '#2a2550' : '#7a5d88'; c.beginPath(); c.moveTo(x - 5, y - h); c.lineTo(x + w / 2, y - h - 9 - 5 * town()); c.lineTo(x + w + 5, y - h); c.fill();
      for (let k = 0; k < 2; k++) if (town() < .8) { c.fillStyle = night ? '#ffcf7a' : 'rgba(255,214,150,.8)'; c.fillRect(x + 4 + k * (w - 12) * .8, y - h + 4, 4, 4); }
    }
    for (let s = 0; s < 3; s++) {                                     // strings of festival lights on the far bank
      const x0 = W * (.08 + .3 * s), y0 = hz - 18 - 8 * s;
      for (let i = 0; i < 14; i++) {
        const t = i / 13, x = x0 + t * W * .26, y = y0 + 9 * Math.sin(Math.PI * t);
        c.fillStyle = night ? ['#ff8a6a', '#ffe0a0'][i % 2] : ['rgba(255,140,110,.85)', 'rgba(255,236,190,.9)'][i % 2];
        c.beginPath(); c.arc(x, y, night ? 2.4 : 2, 0, TAU); c.fill();
      }
    }
    /* below the horizon: the banks going away and the river narrowing into the distance */
    const land = c.createLinearGradient(0, hz, 0, H);
    land.addColorStop(0, night ? '#151a3c' : '#6b5a7e'); land.addColorStop(1, night ? '#232a3e' : '#7c6b62');
    c.fillStyle = land; c.fillRect(0, hz, W, H - hz);
    for (let i = 0; i < 40; i++) {                                    // furrows and paths: denser towards the horizon
      const k = Math.pow(i / 40, 1.8), y = hz + k * (H - hz);
      c.strokeStyle = night ? 'rgba(90,100,150,.18)' : 'rgba(255,220,190,.16)'; c.lineWidth = 1 + 2 * k;
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
    const riv = t => {                                                // the river's edges at t: 0 at the page's foot, 1 at the horizon
      const y = lerp(H, hz, t), mid = lerp(pageX((RIVER.x0 + RIVER.x1) / 2), pageX(.06), t) + 26 * Math.sin(t * 5.5) * t;
      const half = lerp((RIVER.x1 - RIVER.x0) / 2 * PX, 2, Math.pow(t, .7));
      return [mid - half, mid + half, y];
    };
    const wg = c.createLinearGradient(0, hz, 0, H);
    wg.addColorStop(0, night ? '#5a4f8a' : '#ffd8b0'); wg.addColorStop(1, night ? '#1d2a5e' : '#7f78b4');
    c.fillStyle = wg; c.beginPath();
    for (let i = 0; i <= 30; i++) { const [a, , y] = riv(i / 30); c[i ? 'lineTo' : 'moveTo'](a, y); }
    for (let i = 30; i >= 0; i--) { const [, b, y] = riv(i / 30); c.lineTo(b, y); }
    c.closePath(); c.fill();
    for (let i = 0; i < 60; i++) {                                    // glints on the far water
      const t = Math.pow(r(), 1.4), [a, b, y] = riv(t), x = lerp(a, b, .2 + .6 * r()), len = (b - a) * .25 * r();
      c.strokeStyle = night ? 'rgba(255,214,160,.45)' : 'rgba(255,250,235,.6)'; c.lineWidth = 1 + 1.5 * (1 - t);
      c.beginPath(); c.moveTo(x - len / 2, y); c.lineTo(x + len / 2, y); c.stroke();
    }
    for (let i = 0; i < 18; i++) {                                    // far stalls and lanterns on both banks, smaller towards the horizon
      const t = .08 + .8 * r(), side = i % 2 ? 1 : -1, [a, b, y] = riv(t), s = lerp(26, 5, t), x = side < 0 ? a - s * (1.2 + 3 * r()) : b + s * (1.2 + 3 * r());
      c.fillStyle = night ? '#2c2346' : '#8b5b6e'; c.fillRect(x - s * .6, y - s * .8, s * 1.2, s * .8);
      c.fillStyle = ['#e85a5a', '#f2f0ea', '#5b8fd6'][i % 3]; c.beginPath(); c.moveTo(x - s * .75, y - s * .8); c.lineTo(x + s * .75, y - s * .8); c.lineTo(x, y - s * 1.25); c.fill();
      c.fillStyle = night ? '#ffc070' : 'rgba(255,200,140,.85)'; c.beginPath(); c.arc(x, y - s * .45, Math.max(1.5, s * .14), 0, TAU); c.fill();
    }
  }
  /** the page standing at the card's back edge: { root, night } (night: the layer to fade in) */
  function makePage() {
    const o = { width: PAGE.width, height: PAGE.height, curve: PAGE.curve, z: 0 };
    const root = new THREE.Group(); root.position.z = PAGE.z;
    const dusk = kit.backdrop((c, w, h) => paintPage(c, w, h, false), { ...o, order: -4 });
    const night = kit.backdrop((c, w, h) => paintPage(c, w, h, true), { ...o, order: -3 });
    night.position.z = .002; night.material.opacity = 0;
    const back = new THREE.Mesh(dusk.geometry, mat(0xe9dcc6, { roughness: 1, side: THREE.BackSide })); back.position.z = -.002;   // the page's paper back
    root.add(back, dusk, night);
    return { root, night };
  }

  /* ── the ground: two banks with a lane of packed earth, grass at their edges; stones along the river ── */
  function bankTexture(x0, x1, seed) {
    const w = Math.round(512 * (x1 - x0) / .5), h = 640;
    return kit.canvasTexture(w, h, (c) => {
      const r = seeded(seed), g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#9c8a72'); g.addColorStop(.5, '#b9a283'); g.addColorStop(1, '#c8b392');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {                                // grit
        c.fillStyle = r() < .5 ? `rgba(255,246,226,${.15 + .3 * r()})` : `rgba(96,72,52,${.1 + .25 * r()})`;
        c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
      }
      for (let i = 0; i < 90; i++) {                                  // pebbles
        c.fillStyle = ['#d8cbb6', '#8e8274', '#a99a86', '#efe6d6'][(r() * 4) | 0];
        c.beginPath(); c.ellipse(r() * w, r() * h, 2 + 4 * r(), 2 + 3 * r(), r() * 3, 0, TAU); c.fill();
      }
      for (const [y0, y1] of [[0, 90], [h - 46, h]]) for (let i = 0; i < 700; i++) {   // grass at the back and the front edge
        const x = r() * w, y = y0 + r() * (y1 - y0), l = 6 + 12 * r();
        c.strokeStyle = ['#5f8a4a', '#4c7a3e', '#79a259', '#3f6634'][(r() * 4) | 0]; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * 6, y - l); c.stroke();
      }
    });
  }
  /** { tint: the materials to darken as night falls } */
  function makeGround() {
    const side = mat('#7a5f45', { roughness: 1 }), under = mat('#5b4634', { roughness: 1 }), tint = [side];
    for (const [x0, x1, seed] of [[-.5, RIVER.x0, 11], [RIVER.x1, .5, 12]]) {
      const top = mat(0xffffff, { map: bankTexture(x0, x1, seed), roughness: .95 }); tint.push(top);
      const slab = part(geo(new THREE.BoxGeometry(x1 - x0, BANK, DEPTH * 2)), [side, side, top, under, side, side], (x0 + x1) / 2, BANK / 2, 0);
      slab.castShadow = false; stage.add(slab);
    }
    const bed = new THREE.Mesh(geo(new THREE.PlaneGeometry(RIVER.x1 - RIVER.x0, DEPTH * 2).rotateX(-Math.PI / 2)), mat('#1e2a44', { roughness: 1 }));
    bed.position.set((RIVER.x0 + RIVER.x1) / 2, .001, 0); stage.add(bed);
    /* stones along both edges of the river, a little into the water */
    const r = seeded(77), sg = geo(new THREE.IcosahedronGeometry(1, 1)), n = 2 * 22;
    const stones = new THREE.InstancedMesh(sg, mat(0xffffff, { roughness: .9 }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const left = i < n / 2, k = (i % (n / 2)) / (n / 2 - 1), z = lerp(-DEPTH + .01, DEPTH - .01, k) + (r() - .5) * .01;
      const s = .011 + .006 * r(), x = left ? RIVER.x0 + .003 + .004 * r() : RIVER.x1 - .003 - .004 * r();
      m4.compose(V3(x, BANK - .002, z), q.setFromEuler(e.set(r(), r() * 3, r())), V3(s * 1.2, s * .7, s));
      stones.setMatrixAt(i, m4); stones.setColorAt(i, col.set(['#9aa0a8', '#7d848f', '#b5b0a6', '#8a8f86'][(r() * 4) | 0]));
    }
    stones.castShadow = stones.receiveShadow = true; stage.add(stones); tint.push(stones.material);
    return { tint };
  }

  /* ── the river: water that flows towards you, dusk colours turning to night, lit by each firework's flash ── */
  function makeRiver() {
    const w = RIVER.x1 - RIVER.x0;
    const m = kit.keep(new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uFlash: { value: new THREE.Color(0, 0, 0) }, uWarm: { value: 0 } },
      vertexShader: `varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime, uNight, uWarm; uniform vec3 uFlash; varying vec2 vP;
        void main() {
          float far = clamp((${DEPTH.toFixed(4)} - vP.y) / ${(DEPTH * 2).toFixed(4)}, 0.0, 1.0);
          vec3 dusk = mix(vec3(.24, .27, .55), vec3(.95, .62, .58), far * far), night = mix(vec3(.025, .04, .12), vec3(.12, .12, .3), far * far);
          vec3 col = mix(dusk, night, uNight);
          float a = sin(vP.y * 95.0 - uTime * 2.4 + sin(vP.x * 46.0 + uTime * .8) * 1.7), b = sin(vP.y * 41.0 - uTime * 1.4 + vP.x * 27.0);
          float rip = smoothstep(.62, 1.0, a * b), edge = smoothstep(${(w / 2 - .03).toFixed(4)}, ${(w / 2).toFixed(4)}, abs(vP.x));
          col += rip * mix(vec3(.3, .22, .28), vec3(.16, .18, .34), uNight) + edge * vec3(.05, .06, .09);
          col += uWarm * vec3(1.0, .55, .25) * (.05 + .25 * rip) * (1.0 - far);     // lantern light on the near water
          col += uFlash * (.22 + .5 * rip + .2 * far);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }));
    const water = new THREE.Mesh(geo(new THREE.PlaneGeometry(w, DEPTH * 2, 4, 8).rotateX(-Math.PI / 2)), m);
    water.position.set((RIVER.x0 + RIVER.x1) / 2, .006, 0); water.receiveShadow = false; stage.add(water);
    return { water, uniforms: m.uniforms };
  }

  /* ── the arched bridge: a plank deck over the river, beams along its sides, railings, two lantern posts in front ── */
  function makeBridge() {
    const root = new THREE.Group(), N = 28, W = BRIDGE.width, x0 = BRIDGE.x - BRIDGE.half - .02, x1 = BRIDGE.x + BRIDGE.half + .02;
    const planks = kit.canvasTexture(512, 64, (c, w, h) => {            // planks across the deck, grain along them
      const r = seeded(31); c.fillStyle = '#9a6a45'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        c.fillStyle = ['#a0704b', '#8f603e', '#a8774f', '#93653f'][(r() * 4) | 0]; c.fillRect(x, 0, 15, h);
        c.fillStyle = 'rgba(60,34,18,.65)'; c.fillRect(x + 15, 0, 1.5, h);
        for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(70,40,20,.25)'; c.fillRect(x + 2 + r() * 11, 0, 1, h); }
      }
    });
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {                                    // the deck: its top curve, a little thickness under it
      const x = lerp(x0, x1, i / N), y = deckY(x) + .003;
      pos.push(x, y, BRIDGE.z - W / 2, x, y, BRIDGE.z + W / 2); uv.push(i / N, 0, i / N, 1);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const dg = new THREE.BufferGeometry(); dg.setIndex(idx); dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    dg.computeVertexNormals();
    const deck = part(geo(dg), mat(0xffffff, { map: planks, roughness: .85, side: THREE.DoubleSide })); root.add(deck);
    const beamM = mat('#6e4329', { roughness: .8 }), railM = mat('#7c4a2c', { roughness: .7 }), capM = mat('#b8442f', { roughness: .55 });
    const postList = [], capList = [];
    const arch = (z, dy, r) => new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => { const x = lerp(x0 + .01, x1 - .01, i / 12); return V3(x, deckY(x) + dy, z); }));
    for (const s of [-1, 1]) {
      const z = BRIDGE.z + s * W / 2;
      root.add(part(geo(new THREE.TubeGeometry(arch(z, -.006), 40, .007, 6)), beamM));            // the side beam under the deck's edge
      root.add(part(geo(new THREE.TubeGeometry(arch(z, .046), 40, .0035, 6)), railM));            // the handrail
      for (let i = 0; i <= 8; i++) {                                                               // posts up to it
        const x = lerp(x0 + .02, x1 - .02, i / 8), h = i === 0 || i === 8 ? .064 : .046;
        postList.push([x, deckY(x) + h / 2, z, 0, 0, 0, .007, h, .007]);
        if (h > .05) capList.push([x, deckY(x) + h + .003, z, 0, 0, 0, .011, .006, .011]);
      }
    }
    const unit = geo(new THREE.BoxGeometry(1, 1, 1));
    root.add(instances(unit, railM, postList), instances(unit, capM, capList));
    for (const x of [BRIDGE.x - BRIDGE.half * .45, BRIDGE.x + BRIDGE.half * .45]) for (const s of [-1, 1])   // piers in the water
      root.add(part(geo(new THREE.CylinderGeometry(.006, .007, deckY(x), 8)), beamM, x, deckY(x) / 2, BRIDGE.z + s * W * .38));
    const posts = [x0 - .012, x1 + .012].map(x => {                                                    // lantern posts at its front ends
      const g = new THREE.Group(); g.position.set(x, BANK, BRIDGE.z + W / 2 + .012); root.add(g);
      g.add(part(geo(new THREE.BoxGeometry(.012, .12, .012)), railM, 0, .06, 0));
      g.add(part(geo(new THREE.BoxGeometry(.03, .006, .03)), capM, 0, .123, 0));
      return g;
    });
    stage.add(root);
    return { root, posts };                                            // a lantern sits on each post at y .15
  }

  /* ── paper lanterns: a ribbed paper barrel with black rims, red or white; lit, it glows from inside ── */
  const LANTERN_PROFILE = [[.001, -.5], [.56, -.5], [.6, -.42], [.78, -.33], [.92, -.2], [.99, -.07], [.99, .07], [.92, .2], [.78, .33], [.6, .42], [.56, .5], [.001, .5]];
  let lanternGeo = null, paperTex = null, glowMask = null;
  function lanternParts() {
    if (lanternGeo) return;
    lanternGeo = geo(new THREE.LatheGeometry(LANTERN_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 18));
    const rows = LANTERN_PROFILE.length - 1;                          // the lathe's v runs point to point: rims are the end rows
    const paint = (c, w, h, mask) => {
      c.fillStyle = mask ? '#ffffff' : '#fffaf0'; c.fillRect(0, 0, w, h);
      if (!mask) for (let k = 0; k < 9; k++) { const y = h * (2 + k * (rows - 4) / 8) / rows; c.fillStyle = 'rgba(80,30,20,.35)'; c.fillRect(0, y - 1, w, 2); }   // the ribs
      else for (let k = 0; k < 9; k++) { const y = h * (2 + k * (rows - 4) / 8) / rows; c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, y - 1, w, 2); }
      c.fillStyle = '#16110f'; c.fillRect(0, 0, w, h * 2 / rows); c.fillRect(0, h * (rows - 2) / rows, w, h * 2 / rows);   // black rims
    };
    paperTex = kit.canvasTexture(32, 128, (c, w, h) => paint(c, w, h, false));
    glowMask = kit.canvasTexture(32, 128, (c, w, h) => paint(c, w, h, true));
    paperTex.flipY = glowMask.flipY = false;                          // the lathe's v goes up from its foot
  }
  /** one lantern, h tall: { root, body, glow, light(k) } */
  function makeLantern(color, h = .04, glowColor) {
    lanternParts();
    const red = color === 'red';
    const m = mat(red ? '#e5413b' : '#fbf1de', { map: paperTex, emissive: red ? '#ff5a36' : '#ffd08a', emissiveMap: glowMask, emissiveIntensity: 0, roughness: .9 });
    const root = new THREE.Group(), body = new THREE.Mesh(lanternGeo, m);
    body.scale.set(h * .42, h, h * .42); body.castShadow = true; root.add(body);
    const glow = kit.glow({ color: glowColor ?? (red ? 0xff7a50 : 0xffd9a0), size: h * 3.2, opacity: 0 }); root.add(glow);
    return { root, body, glow, light(k) { m.emissiveIntensity = 1.3 * k; glow.material.opacity = .75 * k; } };
  }
  /** a rope between two pole tops with lanterns hanging under it; poles of bamboo. { lanterns: [{ root, at, … }] } */
  function makeString(a, b, n, sag, colors, poles = [true, true]) {
    const pts = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return V3(lerp(a[0], b[0], t), lerp(a[1], b[1], t) - 4 * sag * t * (1 - t), lerp(a[2], b[2], t)); });
    stage.add(part(geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .0012, 4)), mat('#2a201c')));
    const poleM = mat('#b9a56a', { roughness: .7 });
    [a, b].forEach((p, i) => { if (poles[i]) stage.add(part(geo(new THREE.CylinderGeometry(.0045, .006, p[1] - BANK + .01, 8)), poleM, p[0], (p[1] + BANK) / 2, p[2])); });
    return Array.from({ length: n }, (_, i) => {
      const t = (i + .5) / n, l = makeLantern(colors[i % colors.length]);
      l.root.position.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t) - 4 * sag * t * (1 - t) - .024, lerp(a[2], b[2], t));
      stage.add(l.root);
      return l;
    });
  }

  /* ── stalls: a counter with a cloth front, a back board, posts, a striped awning with a scalloped edge, a sign ── */
  function makeStall({ x, z, w, d, stripes, sign, ink }) {
    const root = new THREE.Group(); root.position.set(x, BANK, z); stage.add(root);
    const wood = mat('#8a5b3a'), dark = mat('#5e3b25'), H = .085, front = d / 2;
    const cloth = kit.canvasTexture(256, 96, (c, cw, ch) => {
      c.fillStyle = stripes[0]; c.fillRect(0, 0, cw, ch);
      c.fillStyle = stripes[1]; c.fillRect(0, ch * .72, cw, ch * .12);
      c.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(cw * (i + .5) / 6, ch * .38, ch * .14, 0, TAU); c.fill(); }
    });
    const counter = part(geo(new THREE.BoxGeometry(w, H, d * .5)), [wood, wood, mat('#a8774f'), wood, mat(0xffffff, { map: cloth }), wood], 0, H / 2, front - d * .25);
    root.add(counter);
    root.add(part(geo(new THREE.BoxGeometry(w, .25, .008)), wood, 0, .125, -front + .004));                       // the back board
    root.add(part(geo(new THREE.BoxGeometry(w * .9, .006, .03)), dark, 0, .17, -front + .02));                   // a shelf on it
    for (const sx of [-1, 1]) for (const [pz, ph] of [[front - .004, .225], [-front + .004, .27]])
      root.add(part(geo(new THREE.BoxGeometry(.008, ph, .008)), dark, sx * (w / 2 - .004), ph / 2, pz));
    const awn = kit.canvasTexture(256, 64, (c, cw, ch) => { const n = 8; for (let i = 0; i < n; i++) { c.fillStyle = stripes[i % 2]; c.fillRect(i * cw / n, 0, cw / n + 1, ch); } });
    const len = Math.hypot(d + .03, .05), tilt = Math.atan2(.05, d + .03);
    const roof = part(geo(new THREE.PlaneGeometry(w + .02, len)), mat(0xffffff, { map: awn, side: THREE.DoubleSide, roughness: .9 }), 0, .25, .015);
    roof.rotation.x = -Math.PI / 2 + tilt; root.add(roof);
    const val = kit.canvasTexture(256, 48, (c, cw, ch) => {            // the scalloped edge hanging in front
      const n = 8; for (let i = 0; i < n; i++) {
        c.fillStyle = stripes[i % 2]; c.fillRect(i * cw / n, 0, cw / n + 1, ch * .45);
        c.beginPath(); c.arc((i + .5) * cw / n, ch * .45, cw / n / 2, 0, Math.PI); c.fill();
      }
    });
    const valance = part(geo(new THREE.PlaneGeometry(w + .02, .03)), mat(0xffffff, { map: val, alphaTest: .4, side: THREE.DoubleSide }), 0, .212, front + .03);
    root.add(valance);
    const board = kit.canvasTexture(512, 128, (c, cw, ch) => {
      c.fillStyle = '#fff6e4'; c.fillRect(0, 0, cw, ch); c.strokeStyle = ink; c.lineWidth = 10; c.strokeRect(8, 8, cw - 16, ch - 16);
      c.fillStyle = ink; kit.fitText(c, sign, { x: 24, y: 10, w: cw - 48, h: ch - 20 }, { maxLines: 1, font: '"Be Vietnam Pro", "Segoe UI", sans-serif', weight: 800, max: 86 });
    });
    const signBoard = part(geo(new THREE.BoxGeometry(w * .82, w * .82 / 4, .006)), [dark, dark, dark, dark, mat(0xffffff, { map: board, emissive: 0xffffff, emissiveMap: board, emissiveIntensity: .15 }), dark], 0, .292, front - .01);
    signBoard.rotation.x = -.12; root.add(signBoard);
    return { root, top: BANK + H, front: z + front, x, z, w };
  }

  /* ── what is on the counters ── */
  const FLUFF = new Map();
  /** a cotton candy: a lumpy pink cloud on a stick; its grip at the origin, the cloud up +y */
  function makeCandy(color = '#ff9cc8', s = 1) {
    if (!FLUFF.has(color)) {
      const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, v = new THREE.Vector3(), r = seeded(color.length * 7 + 3);
      const bumps = Array.from({ length: 14 }, () => V3(r() - .5, r() - .5, r() - .5).normalize());
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).normalize(); let k = 1;
        for (const b of bumps) k += .16 * Math.max(0, v.dot(b) - .55) / .45;
        p.setXYZ(i, v.x * k, v.y * k * .92, v.z * k);
      }
      g.computeVertexNormals();
      FLUFF.set(color, { g: geo(g), m: mat(color, { roughness: 1, emissive: color, emissiveIntensity: .12 }) });
    }
    const { g, m } = FLUFF.get(color), root = new THREE.Group();
    root.add(part(geo(new THREE.CylinderGeometry(.0016, .0016, .05 * s, 6)), mat('#f4ead8'), 0, .025 * s, 0));
    const cloud = part(g, m, 0, .062 * s, 0); cloud.scale.setScalar(.024 * s); root.add(cloud);
    return { root, cloud };
  }
  /** the cotton candy stand on the counter: a machine's tub with a pink cloud spinning in it, three candies in a block */
  function makeCandyStand(stall) {
    const g = new THREE.Group(); g.position.set(stall.x - .035, stall.top, stall.front - .035); stage.add(g);
    const metal = mat('#c9ced6', { metalness: .6, roughness: .3, envMap: kit.env });
    g.add(part(geo(new THREE.CylinderGeometry(.03, .024, .028, 20, 1, true)), mat('#e8eef5', { metalness: .4, roughness: .3, side: THREE.DoubleSide, envMap: kit.env }), 0, .02, 0));
    g.add(part(geo(new THREE.CylinderGeometry(.016, .018, .008, 14)), metal, 0, .004, 0));
    const spin = makeCandy('#ffb3d6', .8); spin.root.position.set(0, -.02, 0); spin.root.scale.set(1.3, .5, 1.3); g.add(spin.root);
    const block = part(geo(new THREE.BoxGeometry(.04, .016, .02)), mat('#d9b27c'), .065, .008, .006); g.add(block);
    const candies = ['#ff9cc8', '#9fd8ff', '#fff0f6'].map((c, i) => { const k = makeCandy(c, .9); k.root.position.set(.052 + i * .013, .012, .006); k.root.rotation.z = (i - 1) * .18; g.add(k.root); return k; });
    return { root: g, spin, candies };
  }
  /** the grill stall's counter: drumsticks on a grill, a pot of stew, bowls, buns in a crate beside it */
  function makeGrill(stall, models) {
    const g = new THREE.Group(); g.position.set(stall.x, stall.top, stall.front - .035); stage.add(g);
    g.add(part(geo(new THREE.BoxGeometry(.07, .012, .035)), mat('#2c2a2e', { roughness: .6 }), -.025, .006, 0));
    g.add(instances(geo(new THREE.BoxGeometry(.068, .002, .002)), mat('#6b6f78', { metalness: .5, roughness: .4 }), Array.from({ length: 6 }, (_, i) => [-.025, .0125, -.015 + i * .006])));
    const ham = models.ham; if (ham) for (let i = 0; i < 3; i++) {
      const h = i ? ham.root.clone() : ham.root; h.position.set(-.045 + i * .02, .016, (i % 2 ? -.004 : .004)); h.rotation.y = .4 + i * .9; g.add(h);
    }
    if (models.pot) { models.pot.root.position.set(.04, 0, -.004); g.add(models.pot.root); }
    if (models.bowls) { models.bowls.root.position.set(.042, 0, .022); g.add(models.bowls.root); }
    if (models.buns) { models.buns.root.position.set(stall.x + stall.w / 2 + .03, BANK, stall.front - .02); models.buns.root.rotation.y = -.3; stage.add(models.buns.root); }
    return g;
  }
  /** goldfish swimming round a shallow tub of water; poses by T */
  function makeGoldfish(x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z); stage.add(g);
    g.add(part(geo(new THREE.CylinderGeometry(.052, .048, .022, 28, 1, true)), mat('#4f8fd8', { side: THREE.DoubleSide, roughness: .5 }), 0, .011, 0));
    g.add(part(geo(new THREE.TorusGeometry(.052, .0035, 6, 28).rotateX(Math.PI / 2)), mat('#2f6fbf'), 0, .022, 0));
    const water = new THREE.Mesh(geo(new THREE.CircleGeometry(.05, 28).rotateX(-Math.PI / 2)), mat('#8fd3f5', { transparent: true, opacity: .55, roughness: .1, emissive: '#2a6c9a', emissiveIntensity: .25 }));
    water.position.y = .017; water.renderOrder = 2;
    const floor = new THREE.Mesh(geo(new THREE.CircleGeometry(.048, 28).rotateX(-Math.PI / 2)), mat('#cfe9f7')); floor.position.y = .002; g.add(floor);
    const bodyG = geo(new THREE.SphereGeometry(1, 10, 8)), tailG = geo(new THREE.ConeGeometry(.6, 1, 4));
    const fish = ['#ff6a2a', '#ff8c3a', '#f24a2a', '#ffb070', '#ff5a1f', '#ffffff'].map((c, i) => {
      const f = new THREE.Group(), m = mat(c, { roughness: .4, emissive: c, emissiveIntensity: .15 });
      const b = new THREE.Mesh(bodyG, m); b.scale.set(.004, .0035, .008); f.add(b);
      const t = new THREE.Mesh(tailG, m); t.scale.set(.006, .006, .002); t.rotation.x = Math.PI / 2; t.position.z = -.009; f.add(t);
      g.add(f); return { f, t, r: .015 + .026 * ((i * 7) % 5) / 4, w: (i % 2 ? 1 : -1) * (.9 + .25 * i), ph: i * 1.7 };
    });
    g.add(water);
    return {
      root: g,
      pose(T) {
        for (const k of fish) {
          const a = k.ph + T * k.w;
          k.f.position.set(Math.cos(a) * k.r, .01, Math.sin(a) * k.r); k.f.rotation.y = -a + (k.w > 0 ? 0 : Math.PI);
          k.t.rotation.y = .5 * Math.sin(T * 9 + k.ph);
        }
      }
    };
  }

  /* ── the wish bamboo: a jointed green stalk in a pot of stones, leafy branches hung with paper strips, and a high bough
        arching over to the left where her strip goes at the stop ── */
  function makeBamboo(x, z) {
    const root = new THREE.Group(); root.position.set(x, BANK, z); stage.add(root);
    const green = mat('#6fae4f', { roughness: .55 }), node = mat('#a8c97a', { roughness: .5 });
    root.add(part(geo(new THREE.CylinderGeometry(.032, .026, .045, 16)), mat('#7e5a3c'), 0, .0225, 0));
    root.add(instances(geo(new THREE.DodecahedronGeometry(.008)), mat('#9a9a92'), Array.from({ length: 7 }, (_, i) => [Math.cos(i / 7 * TAU) * .02, .046, Math.sin(i / 7 * TAU) * .02, i, i * 2, 0])));
    const H = .56, segs = 8, cyl = geo(new THREE.CylinderGeometry(.95, 1, 1, 10));
    root.add(instances(cyl, green, Array.from({ length: segs }, (_, i) => { const r = lerp(.011, .007, i / segs); return [0, .04 + (i + .5) * H / segs, 0, 0, 0, 0, r, H / segs - .004, r]; })),
      instances(cyl, node, Array.from({ length: segs }, (_, i) => { const r = 1.2 * lerp(.011, .007, i / segs); return [0, .04 + i * H / segs, 0, 0, 0, 0, r, .006, r]; })));
    const leaf = kit.canvasTexture(64, 256, (c, w, h) => {
      c.fillStyle = '#4f9a3c'; c.beginPath(); c.moveTo(w / 2, 0); c.quadraticCurveTo(w, h * .35, w / 2, h); c.quadraticCurveTo(0, h * .35, w / 2, 0); c.fill();
      c.strokeStyle = '#8cc56a'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, 6); c.lineTo(w / 2, h - 6); c.stroke();
    });
    const leafM = mat(0xffffff, { map: leaf, alphaTest: .4, side: THREE.DoubleSide, roughness: .7 }), leafG = geo(new THREE.PlaneGeometry(.018, .066).translate(0, -.033, 0));
    const r = seeded(91), colors = ['#ff8fb3', '#ffd66b', '#8fd0ff', '#b9e48a', '#c9a3ff', '#ffb27a'];
    const stripG = geo(new THREE.PlaneGeometry(.016, .05).translate(0, -.025, 0)), strips = [], tips = [], leaves = [];
    /* branches: [height on the stalk, way out (x, z), length, droop, strips]; the first two reach out low to the left, behind
       where the two of them stand: they tie their strips on their ends */
    const BR = [[.2, -1, -.05, .1, 0, 0], [.22, -1, .05, .24, .03, 0], [.31, 1, .3, .1, .06, 2], [.36, -1, -.6, .12, .08, 3], [.42, 1, -.4, .11, .05, 3],
      [.47, -.8, .7, .1, .06, 2], [.53, .7, .5, .09, .04, 2], [.6, .2, -.6, .07, .03, 1]];
    const branch = (pts, n, strip) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      root.add(part(geo(new THREE.TubeGeometry(curve, 14, .0026, 5)), green));
      for (let k = 0; k < n; k++) {                                   // leaves in fans along it, more at its end
        const p = curve.getPointAt(.25 + .75 * Math.sqrt(k / (n - 1)));
        leaves.push([p.x, p.y, p.z, .5 + r() * .9, r() * TAU, (r() - .5) * 1.4]);
      }
      for (let k = 0; k < strip; k++) strips.push({ p: curve.getPointAt(.4 + .5 * (k + .5) / strip), ph: r() * TAU, color: colors[(strips.length * 5) % colors.length] });
      return curve;
    };
    for (const [y, dx, dz, len, droop, n] of BR) {
      const d = V3(dx, 0, dz).normalize(), end = V3(d.x * len, y + .03 - droop, d.z * len);
      branch([V3(0, y, 0), V3(d.x * len * .5, y + .035, d.z * len * .5), end], 12, n);
      tips.push(end);
    }
    const bough = branch([V3(0, H - .02, 0), V3(-.06, H + .1, .01), V3(-.13, H + .14, .02), V3(-.2, H + .12, .025)], 16, 0);   // arching over to the left
    root.add(instances(leafG, leafM, leaves));
    const hung = instances(stripG, mat(0xffffff, { side: THREE.DoubleSide, roughness: .9 }), strips.map(k => [k.p.x, k.p.y, k.p.z]), strips.map(k => k.color));
    root.add(hung);
    return {
      root, tips: tips.map(p => p.clone().add(root.position)), hook: bough.getPointAt(.82).add(root.position),
      pose(T, gust) {
        strips.forEach(({ p, ph }, i) => hung.setMatrixAt(i, M4.compose(p, Q.setFromEuler(E.set(.2 * Math.sin(T * 1.6 + ph) * (1 + gust), .5 * Math.sin(T * .9 + ph), .25 * Math.sin(T * 1.3 + ph * 2) * (1 + gust))), SC.set(1, 1, 1))));
        hung.instanceMatrix.needsUpdate = true;
      }
    };
  }

  /* ── the carriers: a paper fan, two wish strips ── */
  /** a round paper fan with a bamboo handle: summer flowers round its rim, the card's words in the middle;
      { root, size } at full size (a fan .44 wide), its handle's end at the origin */
  function makeFan(text) {
    const W = 512, ri = seeded(57), blooms = Array.from({ length: 11 }, (_, i) => ({ a: -2.6 + i * .5 + (ri() - .5) * .2, s: .8 + .4 * ri(), c: ['#e94f7a', '#3d6fd1', '#f08a3c', '#9c5bd1'][i % 4] }));
    const shape = (c, k) => { c.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, cs = Math.cos(a), sn = Math.sin(a); c[i ? 'lineTo' : 'moveTo'](W / 2 + Math.sign(cs) * Math.abs(cs) ** .8 * W * .48 * k, W * .47 + Math.sign(sn) * Math.abs(sn) ** .8 * W * .42 * k); } c.closePath(); };
    const tex = kit.canvasTexture(W, W, c => {
      c.save(); c.shadowColor = 'rgba(40,20,40,.3)'; c.shadowBlur = 14; c.fillStyle = '#fffaf0'; shape(c, 1); c.fill(); c.restore();
      c.save(); shape(c, 1); c.clip();
      c.strokeStyle = 'rgba(160,120,80,.16)'; c.lineWidth = 3;            // the ribs under the paper
      for (let i = 0; i < 26; i++) { const a = Math.PI * (1.05 + .9 * i / 25); c.beginPath(); c.moveTo(W / 2, W * .98); c.lineTo(W / 2 + Math.cos(a) * W, W * .98 + Math.sin(a) * W); c.stroke(); }
      for (const b of blooms) {                                        // morning glories round the rim
        const x = W / 2 + Math.cos(b.a) * W * .43, y = W * .47 + Math.sin(b.a) * W * .37, s = 30 * b.s;
        c.fillStyle = b.c; c.beginPath(); for (let k = 0; k < 5; k++) { const a = k * TAU / 5; c.ellipse(x + Math.cos(a) * s * .45, y + Math.sin(a) * s * .45, s * .5, s * .38, a, 0, TAU); } c.fill();
        c.fillStyle = '#fff4c0'; c.beginPath(); c.arc(x, y, s * .22, 0, TAU); c.fill();
        c.fillStyle = '#5aa04a'; c.beginPath(); c.ellipse(x + s * .7, y + s * .5, s * .32, s * .16, .6, 0, TAU); c.fill();
      }
      c.restore();
      c.strokeStyle = '#2f3f8f'; c.lineWidth = 7; shape(c, .97); c.stroke();
      c.fillStyle = '#26306e'; kit.fitText(c, text, { x: W * .14, y: W * .17, w: W * .72, h: W * .6 }, { maxLines: 4 });
    });
    const back = kit.canvasTexture(256, 256, (c, w) => { c.fillStyle = '#f2e6cf'; c.beginPath(); c.ellipse(w / 2, w * .47, w * .48, w * .42, 0, 0, TAU); c.fill(); });
    const S = .44, root = new THREE.Group();
    const front = new THREE.Mesh(geo(new THREE.PlaneGeometry(S, S)), kit.keep(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .05, roughness: .9,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .45 })));
    const rear = new THREE.Mesh(front.geometry, kit.keep(new THREE.MeshStandardMaterial({ map: back, transparent: true, alphaTest: .05, side: THREE.BackSide, roughness: .95 })));
    for (const m of [front, rear]) { m.position.y = S * .53 + .09; m.castShadow = true; root.add(m); }
    root.add(part(geo(new THREE.CylinderGeometry(.008, .01, .12, 8)), mat('#c8a46a'), 0, .06, -.002));
    return { root, size: S };
  }
  /** a wish strip of coloured paper: { root (its top at the origin), sheet, w, h }; big: the card's words on it */
  function makeStrip(color, text, big) {
    const W = 256, H = 512;
    const tex = kit.canvasTexture(W, H, c => {
      c.fillStyle = color; c.fillRect(0, 0, W, H);
      const r = seeded(color.length + 5);
      for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,255,255,${.08 + .12 * r()})`; c.fillRect(r() * W, r() * H, 1 + 6 * r(), 1); }   // fibres in the paper
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 6; c.strokeRect(14, 14, W - 28, H - 28);
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(W / 2, 34, 11, 0, TAU); c.fill();
      c.fillStyle = 'rgba(120,40,70,.85)'; kit.heartPath(c, W / 2, H - 52, 34); c.fill();
      if (text) { c.fillStyle = '#5a1f3c'; kit.fitText(c, text, { x: 24, y: 58, w: W - 48, h: H - 136 }, { maxLines: 6 }); }
    });
    const w = big ? .19 : .03, h = w * H / W, root = new THREE.Group();
    const sheet = new THREE.Mesh(geo(new THREE.PlaneGeometry(w, h).translate(0, -h / 2 - w * .1, 0)), kit.keep(new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide,
      roughness: .9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: big ? .4 : .3 })));
    sheet.castShadow = true; root.add(sheet);
    return { root, sheet, w, h };
  }

  return { V3, mat, geo, part, seeded, deckY, pageZ, makePage, makeGround, makeRiver, makeBridge, makeLantern, makeString, makeStall, makeCandy,
    makeCandyStand, makeGrill, makeGoldfish, makeBamboo, makeFan, makeStrip };
};
