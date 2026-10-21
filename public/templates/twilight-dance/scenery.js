/* Điệu nhảy hoàng hôn: the hilltop, built in code for story.js (template.json "story" loads this file first). The sky page
   (a dusk, and a night painted over it that fades in) with a city far below whose windows and streets light up, the grass
   and its cobbled path, the old streetlamp, the bench, two trees, lavender, the two pairs of shoes, and the three things
   that carry the card's words: an enamel plate that hangs from the lamp, a frame of bulbs round the photo and a ribbon
   that unrolls. The story places and times them; what twinkles or sways goes by T, the act's own time.
     NM_TWILIGHT.scenery(kit, layout) → the builders; layout: { PAGE, FLOOR, LAMP, BENCH, PATH } */
(window.NM_TWILIGHT = window.NM_TWILIGHT || {}).scenery = (kit, { PAGE, FLOOR, LAMP, BENCH, PATH }) => {
  const { THREE, lerp } = kit;
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const mat = (color, o = {}) => kit.keep(new THREE.MeshStandardMaterial({ color, roughness: .7, ...o }));
  const geo = g => kit.keep(g);
  const mesh = (g, m, shadow = true) => { const x = new THREE.Mesh(geo(g), m); x.castShadow = shadow; x.receiveShadow = true; return x; };
  const PX = 1024 / PAGE.width;                                      // the page's canvas: pixels per card width
  const pageX = x => (x + PAGE.width / 2) * PX, pageY = (y, h) => h - y * PX;
  const pageZ = x => PAGE.z + PAGE.curve * (x / (PAGE.width / 2)) ** 2;   // where the page stands at x: its ends come forward
  const HZ = .25;                                                    // the far hills' line on the page, where the sky begins
  /** a painting made once and copied after: the act repaints canvases when the handwriting face arrives, and these hold no words */
  const paintOnce = draw => { let cv = null; return (c, w, h) => { if (!cv) { cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); } c.drawImage(cv, 0, 0); }; };

  /* ── the city far below: laid out once (the page repaints when the handwriting face arrives) ── */
  const CITY = (() => {
    const r = seeded(97), towers = [], lights = [], streets = [];
    const row = (base, x0, x1, hMin, hMax, wMin, wMax, tall) => {
      for (let x = x0; x < x1;) {
        const w = wMin + r() * (wMax - wMin), down = Math.abs(x - .12) < .16 && tall;    // the middle of town stands taller
        const h = (hMin + r() * (hMax - hMin)) * (down ? 1.7 + r() * .9 : 1);
        const roof = down && r() < .35 ? (r() < .5 ? 'spire' : 'mast') : r() < .2 ? 'gable' : 'flat';
        towers.push({ x, w, h, base, roof, seed: (r() * 1e9) | 0 });
        x += w + r() * .006;
      }
    };
    row(.205, -.58, .58, .012, .03, .012, .03, false);                // far rows: small and hazy
    row(.165, -.58, .58, .018, .05, .016, .04, true);
    row(.11, -.58, .58, .02, .055, .022, .05, true);                  // the near rows: bigger, more windows
    for (const t of towers) {                                          // the brightest windows twinkle on their own
      const n = Math.round(t.w * t.h * 9000 * (t.base < .15 ? 1 : .5));
      for (let i = 0; i < n && lights.length < 150; i++) if (r() < .12) lights.push({ x: t.x + t.w * (.15 + .7 * r()), y: t.base + t.h * (.1 + .8 * r()), c: r() < .8 ? '#ffd98a' : '#fff4dc', s: .006 + .004 * r() });
      if (t.roof === 'mast') lights.push({ x: t.x + t.w / 2, y: t.base + t.h + .022, c: '#ff5a5a', s: .011, blink: 1 });
    }
    for (let k = 0; k < 3; k++) {                                      // avenues of street lamps running off into the distance
      const y0 = .06 + k * .028, y1 = .19 - k * .01, x0 = -.56 + r() * .3, x1 = .1 + r() * .45, list = [];
      for (let i = 0; i <= 28; i++) {
        const t = i / 28, x = lerp(x0, x1, t), y = lerp(y0, y1, t * t) + .008 * Math.sin(t * 7 + k);
        list.push([x, y]); if (i % 2 === 0) lights.push({ x, y, c: k === 1 ? '#ffffff' : '#ffb85c', s: .007 + .003 * (1 - t) });
      }
      streets.push(list);
    }
    const bridge = Array.from({ length: 15 }, (_, i) => { const t = i / 14; return [lerp(-.42, -.06, t), .088 + .028 * Math.sin(Math.PI * t)]; });
    bridge.forEach(([x, y], i) => { if (i % 2 === 0) lights.push({ x, y: y + .006, c: '#fff1c9', s: .008 }); });
    const stars = Array.from({ length: 110 }, () => [r() * 1.12 - .56, HZ + .06 + r() * (PAGE.height - HZ - .08), .5 + r() * 1.4, r()]);
    const hills = [0, 1].map(k => Array.from({ length: 33 }, (_, i) => HZ - .015 - k * .035 + .012 * Math.sin(i * .9 + k * 2) + .01 * r()));
    return { towers, lights, streets, bridge, stars, hills };
  })();

  /* ── the sky page: dusk, and night over it (same city, its windows lit) ── */
  const DUSK = [[0, '#2a2163'], [.32, '#4f3a8f'], [.56, '#9a4f9e'], [.75, '#e0708d'], [.89, '#ff9e6c'], [1, '#ffd486']];
  const NIGHT = [[0, '#070a24'], [.38, '#151a4a'], [.64, '#2c2462'], [.84, '#55346f'], [.96, '#8e4872'], [1, '#b85c7a']];
  function paintCity(c, W, H, night) {
    const r = seeded(night ? 7 : 5);
    CITY.hills.forEach((hs, k) => {                                    // far hills, hazy violet
      c.fillStyle = night ? ['#2a2658', '#211d4b'][k] : ['#8a5a9e', '#6c4a8c'][k];
      c.beginPath(); c.moveTo(0, H);
      hs.forEach((y, i) => c.lineTo(i / (hs.length - 1) * W, pageY(y, H))); c.lineTo(W, H); c.fill();
    });
    const sil = night ? ['#1b1840', '#16133a', '#110e30'] : ['#5b4688', '#4a3a78', '#3a2d66'];
    for (const t of CITY.towers) {
      const k = t.base > .19 ? 0 : t.base > .15 ? 1 : 2, x = pageX(t.x), w = t.w * PX, y = pageY(t.base + t.h, H), h = t.h * PX, b = pageY(t.base, H) + 40;
      c.fillStyle = sil[k]; c.fillRect(x, y, w, b - y);
      if (t.roof === 'gable') { c.beginPath(); c.moveTo(x - 1, y); c.lineTo(x + w / 2, y - w * .45); c.lineTo(x + w + 1, y); c.fill(); }
      if (t.roof === 'spire') { c.beginPath(); c.moveTo(x + w * .3, y); c.lineTo(x + w / 2, y - 26); c.lineTo(x + w * .7, y); c.fill(); }
      if (t.roof === 'mast') c.fillRect(x + w / 2 - 1, y - 20, 2, 20);
      if (!night) { c.fillStyle = 'rgba(255,190,120,.35)'; c.fillRect(x + w - 2, y, 2, h); }      // the afterglow catches their sides
      const rw = seeded(t.seed);                                         // windows: a few lit at dusk, most at night
      for (let wy = y + 3; wy < y + h - 2; wy += 4 + k) for (let wx = x + 2; wx < x + w - 2; wx += 3 + k) {
        const lit = rw(); if (lit > (night ? .62 : .16)) continue;
        c.fillStyle = lit < .05 ? '#fff4dc' : night ? '#ffd27a' : 'rgba(255,214,140,.8)'; c.fillRect(wx, wy, 1 + (k > 1), 1 + (k > 0));
      }
    }
    const ry = y => pageY(y, H);                                        // the river under the bridge, holding the sky's colour
    c.fillStyle = night ? '#2a2c66' : '#ffb98a'; c.beginPath(); c.moveTo(0, ry(.1));
    c.bezierCurveTo(W * .25, ry(.07), W * .45, ry(.1), W * .6, ry(.085)); c.lineTo(W * .6, ry(.07)); c.bezierCurveTo(W * .45, ry(.082), W * .25, ry(.055), 0, ry(.08)); c.fill();
    c.strokeStyle = night ? '#e8d7a0' : '#5b3f73'; c.lineWidth = 2;   // the bridge's arch
    c.beginPath(); CITY.bridge.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo'](pageX(x), ry(y))); c.stroke();
    c.beginPath(); c.moveTo(pageX(-.42), ry(.088)); c.lineTo(pageX(-.06), ry(.088)); c.stroke();
    for (const st of CITY.streets) {                                    // the avenues: dotted lines of light
      st.forEach(([x, y], i) => { c.fillStyle = night ? (i % 3 ? '#ffb85c' : '#ffffff') : 'rgba(255,190,120,.7)'; c.beginPath(); c.arc(pageX(x), ry(y), 1.3 + (1 - i / st.length) * 1.4, 0, TAU); c.fill(); });
    }
    c.fillStyle = night ? '#0c1022' : '#2b2440';                         // the hill falling away in front, bushes on its edge
    c.beginPath(); c.moveTo(0, H); c.lineTo(0, ry(.05));
    for (let i = 0; i <= 40; i++) { const x = i / 40 * W; c.lineTo(x, ry(.035 + .02 * Math.sin(i * .7) + .012 * r())); }
    c.lineTo(W, H); c.fill();
    for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(r() * W, ry(.04 + .015 * r()), 6 + 10 * r(), 0, TAU); c.fill(); }
  }
  function paintSky(c, W, H, night) {
    const r = seeded(night ? 31 : 17), hz = pageY(HZ, H);
    const g = c.createLinearGradient(0, 0, 0, hz);
    for (const [k, col] of night ? NIGHT : DUSK) g.addColorStop(k, col);
    c.fillStyle = g; c.fillRect(0, 0, W, hz + 4);
    const sx = pageX(.2), glow = c.createRadialGradient(sx, hz, 0, sx, hz, night ? 260 : 420);   // where the sun went down
    glow.addColorStop(0, night ? 'rgba(255,140,120,.35)' : 'rgba(255,240,190,.95)'); glow.addColorStop(.35, night ? 'rgba(200,90,130,.18)' : 'rgba(255,190,120,.45)');
    glow.addColorStop(1, 'rgba(255,170,140,0)'); c.fillStyle = glow; c.fillRect(0, 0, W, hz + 4);
    for (const [x, y, s, a] of CITY.stars) {                           // faint stars at dusk, many at night
      if (!night && y < .62) continue;
      c.fillStyle = `rgba(255,248,232,${night ? .35 + .6 * a : .25 + .3 * a})`; c.beginPath(); c.arc(pageX(x), pageY(y, H), s, 0, TAU); c.fill();
    }
    const cloud = (x, y, w, h, body, rim) => {                         // long thin clouds, their bellies lit from below
      c.fillStyle = body; c.beginPath(); c.ellipse(x, y, w, h, 0, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(x + w * .3, y - h * .6, w * .5, h * .9, 0, 0, TAU); c.fill();
      c.strokeStyle = rim; c.lineWidth = h * .5; c.beginPath(); c.ellipse(x, y + h * .2, w * .94, h * .7, 0, .2, Math.PI - .2); c.stroke();
    };
    const body = night ? '#2c2558' : '#b45f9e', rim = night ? '#6b4a86' : '#ffd08a';
    [[-.36, .36, 150, 8], [.3, .41, 120, 7], [-.05, .5, 100, 6], [.42, .57, 80, 6], [-.4, .62, 70, 5], [.12, .31, 170, 6]]
      .forEach(([x, y, w, h], i) => cloud(pageX(x) + r() * 20, pageY(y, H), w, h, i === 5 && !night ? '#e68a8f' : body, rim));
    const mx = pageX(-.3), my = pageY(.66, H);                          // a thin new moon
    c.fillStyle = night ? 'rgba(255,240,200,.25)' : 'rgba(255,240,210,.12)'; c.beginPath(); c.arc(mx, my, 34, 0, TAU); c.fill();
    c.fillStyle = night ? '#fff1c4' : '#fde7c8'; c.beginPath(); c.arc(mx, my, 17, 0, TAU); c.fill();
    c.fillStyle = night ? NIGHT[1][1] : DUSK[1][1]; c.beginPath(); c.arc(mx + 7, my - 5, 15, 0, TAU); c.fill();
    paintCity(c, W, H, night);
  }
  function makePage() {
    const o = { width: PAGE.width, height: PAGE.height, curve: PAGE.curve, z: PAGE.z };
    const dusk = kit.backdrop(paintOnce((c, w, h) => paintSky(c, w, h, false)), { ...o, order: -3 });
    const night = kit.backdrop(paintOnce((c, w, h) => paintSky(c, w, h, true)), { ...o, z: PAGE.z + .002, order: -2 });
    night.material.opacity = 0; night.material.depthWrite = false;
    const root = new THREE.Group(); root.add(dusk, night);
    return { root, dusk, night };
  }

  /* ── soft round lights: one texture, and points that use it (alpha per light, one size for all) ── */
  const DOT = kit.canvasTexture(64, 64, (c, w) => {
    const s = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); s.addColorStop(0, 'rgba(255,255,255,1)'); s.addColorStop(.18, 'rgba(255,255,255,.9)');
    s.addColorStop(.45, 'rgba(255,255,255,.25)'); s.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = s; c.fillRect(0, 0, w, w);
  });
  const sizeToScreen = (pts, u) => { const v2 = new THREE.Vector2(); pts.onBeforeRender = rd => { rd.getDrawingBufferSize(v2); u.halfH.value = v2.y / 2; }; };
  function glowPoints(n, color) {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), alpha = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const m = kit.keep(new THREE.ShaderMaterial({
      uniforms: { map: { value: DOT }, uSize: { value: .03 }, uColor: { value: new THREE.Color(color) }, halfH: { value: 400 } },
      vertexShader: `attribute float aAlpha; uniform float uSize, halfH; varying float vA;
        void main() { vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = aAlpha <= 0.0 ? 0.0 : uSize * projectionMatrix[1][1] * halfH / max(.001, -mv.z); }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 uColor; varying float vA;
        void main() { float a = texture2D(map, gl_PointCoord).a * vA; if (a < .01) discard; gl_FragColor = vec4(uColor, min(a, 1.0)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    const pts = new THREE.Points(geo(g), m); pts.frustumCulled = false; pts.renderOrder = 6; sizeToScreen(pts, m.uniforms);
    return { pts, pos, alpha, u: m.uniforms, attr: g.attributes.aAlpha };
  }

  /* ── the city's lights as points on the page: each comes on at its own time (a wave from left to right), twinkles by
        T and flares as a ripple of light runs through town; all worked out in the shader, nothing per frame but uniforms ── */
  function makeCityLights() {
    const L = CITY.lights, n = L.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), a = new Float32Array(n * 4);
    const cc = new THREE.Color(), r = seeded(3);
    L.forEach((p, i) => {
      pos.set([p.x, p.y, pageZ(p.x) + .006], i * 3); cc.set(p.c); col.set([cc.r, cc.g, cc.b], i * 3);
      a.set([.4 + 2.6 * (p.x + .56) / 1.12 + .3 * r(), r() * TAU, p.blink ? 4 : 1.2 + 3 * r(), p.s], i * 4);   // on at, phase, rate, size
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aLight', new THREE.BufferAttribute(a, 4));
    const m = kit.keep(new THREE.ShaderMaterial({
      uniforms: { map: { value: DOT }, uG: { value: 0 }, uT: { value: 0 }, uWave: { value: -9 }, uBright: { value: .8 }, halfH: { value: 400 } },
      vertexShader: `attribute vec3 aColor; attribute vec4 aLight; uniform float uG, uT, uWave, uBright, halfH; varying vec3 vC; varying float vA;
        void main() { vC = aColor; float on = smoothstep(aLight.x, aLight.x + .25, uG);
          float tw = .62 + .38 * sin(uT * aLight.z + aLight.y), wave = exp(-pow((position.x - uWave) / .07, 2.0));
          vA = on * tw * uBright * (1.0 + 1.6 * wave); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = vA <= 0.0 ? 0.0 : aLight.w * (1.0 + .9 * wave) * projectionMatrix[1][1] * halfH / max(.001, -mv.z); }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA;
        void main() { vec4 t = texture2D(map, gl_PointCoord); float a = t.a * vA; if (a < .01) discard; gl_FragColor = vec4(vC * t.rgb, min(a, 1.0)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    const pts = new THREE.Points(geo(g), m); pts.frustumCulled = false; pts.renderOrder = 2; sizeToScreen(pts, m.uniforms);
    return { pts, u: m.uniforms };
  }

  /* ── the hilltop: grass with a cobbled path through it, a little raised off the card like a diorama ── */
  const path = new THREE.CatmullRomCurve3(PATH.map(([x, z]) => V3(x, 0, z)));
  function paintGround(c, W, H) {
    const r = seeded(41), X = x => (x + .5) * W, Z = z => (z + .3125) / .625 * H, S = W;     // S: pixels per card width
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#355b49'); g.addColorStop(.5, '#4a774f'); g.addColorStop(1, '#5d8a56');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {                                     // patches, lighter and darker
      c.fillStyle = r() < .5 ? 'rgba(120,170,100,.18)' : 'rgba(30,60,50,.2)';
      c.beginPath(); c.ellipse(r() * W, r() * H, 30 + 70 * r(), 16 + 40 * r(), r() * 3, 0, TAU); c.fill();
    }
    c.lineCap = 'round';
    for (let i = 0; i < 7000; i++) {                                  // blades
      const x = r() * W, y = r() * H, l = 4 + 7 * r(), lean = (r() - .5) * 5;
      c.strokeStyle = ['#2c4f3d', '#3f6b47', '#6a9a5c', '#88b46c', '#2f5a45'][(r() * 5) | 0]; c.lineWidth = 1 + r() * 1.2;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + lean, y - l); c.stroke();
    }
    const N = 140, half = .052 * S, pts = path.getSpacedPoints(N), tan = V3();
    c.strokeStyle = '#5a4a4a'; c.lineWidth = half * 2 + 8; c.lineJoin = 'round';   // the path's bed, then its stones
    c.beginPath(); pts.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](X(p.x), Z(p.z))); c.stroke();
    const stone = ['#cdb9a0', '#bda88f', '#d9c7ad', '#b49e8a', '#c8b29c', '#a8927f'];
    for (let i = 0; i < N; i++) {
      const p = pts[i]; path.getTangentAt(i / N, tan); const a = Math.atan2(tan.z, tan.x);
      for (let k = 0; k < 4; k++) {
        const off = (-1.5 + k + (i % 2) * .5 - .25) * half / 2.1;
        if (Math.abs(off) > half * .86) continue;
        c.save(); c.translate(X(p.x) - Math.sin(a) * off, Z(p.z) + Math.cos(a) * off); c.rotate(a + (r() - .5) * .25);
        c.fillStyle = stone[(r() * stone.length) | 0]; c.beginPath(); c.roundRect(-5.5 - r() * 2, -half / 4.6, 11 + r() * 3, half / 2.3, 4); c.fill();
        c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-4, -half / 6, 6, 2); c.restore();
      }
    }
    for (const side of [-1, 1]) {                                     // a curb of long stones on each side
      c.strokeStyle = '#8f7f78'; c.lineWidth = 7; c.setLineDash([16, 4]);
      c.beginPath(); for (let i = 0; i <= N; i++) { const p = path.getPointAt(Math.min(1, i / N)); path.getTangentAt(Math.min(1, i / N), tan); const a = Math.atan2(tan.z, tan.x);
        c[i ? 'lineTo' : 'moveTo'](X(p.x) - Math.sin(a) * side * (half + 3), Z(p.z) + Math.cos(a) * side * (half + 3)); }
      c.stroke(); c.setLineDash([]);
    }
    for (let i = 0; i < 260; i++) {                                    // wildflowers, away from the path
      const x = r() * W, y = r() * H, p = V3(x / W - .5, 0, y / H * .625 - .3125), near = path.getPointAt(nearest(p));
      if (near.distanceTo(p) < .075) continue;
      c.fillStyle = ['#fff7ec', '#ffc8dc', '#ffe08a', '#d8c4ff'][(r() * 4) | 0]; c.beginPath(); c.arc(x, y, 1.6 + r() * 1.8, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(70,52,52,.55)'; c.beginPath(); c.ellipse(X(LAMP.x), Z(LAMP.z), 22, 14, 0, 0, TAU); c.fill();   // trodden earth round the lamp
  }
  const nearest = p => { let best = 0, d = 9; for (let i = 0; i <= 60; i++) { const q = path.getPointAt(i / 60), e = q.distanceToSquared(p); if (e < d) { d = e; best = i / 60; } } return best; };
  function makeGround() {
    const s = new THREE.Shape(), n = 48, r = seeded(12);                // a slab of hill with a soft, uneven edge
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, c = Math.cos(a), sn = Math.sin(a);
      const k = Math.pow(Math.pow(Math.abs(c), 6) + Math.pow(Math.abs(sn), 6), -1 / 6);   // a squircle, then wobbled
      const x = .485 * c * k + (r() - .5) * .012, y = .29 * sn * k + (r() - .5) * .012;
      i ? s.lineTo(x, y) : s.moveTo(x, y);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: FLOOR, bevelEnabled: false, curveSegments: 4 }).rotateX(-Math.PI / 2);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) + .5, 1 - (pos.getZ(i) + .3125) / .625);   // the painting, laid flat
    const top = mat(0xffffff, { map: kit.canvasTexture(1024, 640, paintOnce(paintGround)), roughness: .95 });
    const side = mat(0x4a3b3e, { roughness: 1 });
    const m = new THREE.Mesh(geo(g), [top, side]); m.receiveShadow = true;
    return m;
  }

  /* blades of grass along the slab's edge and round the trees, one instanced mesh */
  function makeTufts(spots) {
    const r = seeded(77), list = [];
    for (let i = 0; i < 150; i++) { const a = r() * TAU, c = Math.cos(a), s = Math.sin(a), k = Math.pow(Math.pow(Math.abs(c), 6) + Math.pow(Math.abs(s), 6), -1 / 6);
      list.push([.47 * c * k * (.94 + .06 * r()), .275 * s * k * (.92 + .08 * r()), .7 + .6 * r()]); }
    for (const [x, z, n] of spots) for (let i = 0; i < n; i++) list.push([x + (r() - .5) * .06, z + (r() - .5) * .04, .6 + .5 * r()]);
    const g = new THREE.ConeGeometry(.0035, .028, 3).translate(0, .014, 0);
    const m = kit.keep(new THREE.InstancedMesh(geo(g), mat(0xffffff, { roughness: .9 }), list.length * 3));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cl = new THREE.Color();
    list.forEach(([x, z, s], i) => [-1, 0, 1].forEach((d, j) => {
      m4.compose(V3(x + d * .004, FLOOR, z + (r() - .5) * .004), q.setFromEuler(e.set((r() - .5) * .5, r() * 3, d * .35)), V3(1, s * (1 - .25 * Math.abs(d)), 1));
      m.setMatrixAt(i * 3 + j, m4); m.setColorAt(i * 3 + j, cl.set(['#3d6b47', '#5d8f55', '#2f5a45', '#7aa862'][(r() * 4) | 0]));
    }));
    m.castShadow = false; m.receiveShadow = true;
    return m;
  }

  /* ── the old streetlamp: a stone plinth, a fluted iron post, a bar under the lantern, the lantern with its glass ── */
  function makeLamp() {
    const root = new THREE.Group(), iron = mat(0x2f4a46, { roughness: .4, metalness: .55 }), stone = mat(0x8d8290, { roughness: .9 });   // old green iron
    root.position.set(LAMP.x, FLOOR, LAMP.z);
    const add = (g, m, y, o = {}) => { const x = mesh(g, m); x.position.y = y; Object.assign(x.rotation, o); root.add(x); return x; };
    add(new THREE.CylinderGeometry(.04, .045, .018, 8), stone, .009);
    add(new THREE.CylinderGeometry(.024, .032, .034, 12), iron, .035);
    add(new THREE.CylinderGeometry(.016, .023, .032, 12), iron, .068);
    add(new THREE.CylinderGeometry(.0095, .0125, LAMP.bar - .05, 10), iron, .05 + (LAMP.bar - .05) / 2);
    for (const y of [.085, .21, .45]) add(new THREE.TorusGeometry(.0135, .0034, 6, 14), iron, y, { x: Math.PI / 2 });
    add(new THREE.CylinderGeometry(.0035, .0035, .2, 6), iron, LAMP.bar, { z: Math.PI / 2 });          // the bar the plate hangs from
    for (const s of [-1, 1]) {
      const ball = mesh(new THREE.SphereGeometry(.0065, 10, 8), iron); ball.position.set(s * .1, LAMP.bar, 0); root.add(ball);
      const curl = mesh(new THREE.TorusGeometry(.016, .002, 5, 12, Math.PI * 1.2), iron); curl.position.set(s * .02, LAMP.bar + .014, 0); curl.rotation.z = s > 0 ? -.3 : Math.PI + .3; root.add(curl);
    }
    add(new THREE.CylinderGeometry(.021, .011, .022, 8), iron, LAMP.bar + .03);
    const glassMat = mat(0xfff3cf, { emissive: 0xffbe5c, emissiveIntensity: 0, roughness: .2, transparent: true, opacity: .85 });
    const glass = add(new THREE.CylinderGeometry(.031, .023, .066, 4, 1), glassMat, LAMP.bar + .074, { y: Math.PI / 4 });
    glass.castShadow = false;
    for (let i = 0; i < 4; i++) {                                      // the lantern's four iron ribs
      const a = i / 4 * TAU, rib = mesh(new THREE.BoxGeometry(.0035, .066, .0035), iron);
      rib.position.set(Math.cos(a) * .0245, LAMP.bar + .074, Math.sin(a) * .0245); rib.rotation.set(Math.sin(a) * .09, 0, -Math.cos(a) * .09); root.add(rib);
    }
    add(new THREE.ConeGeometry(.042, .032, 4), iron, LAMP.bar + .123, { y: Math.PI / 4 });
    add(new THREE.SphereGeometry(.0085, 10, 8), iron, LAMP.bar + .146);
    const light = new THREE.PointLight(0xffb867, 0, 1.2, 1.5); light.position.y = LAMP.bar + .07; root.add(light);
    const halo = kit.glow({ color: 0xffc879, size: .24, opacity: 0 }); halo.position.y = LAMP.bar + .072; root.add(halo);
    const pool = new THREE.Mesh(geo(new THREE.PlaneGeometry(.5, .5).rotateX(-Math.PI / 2)), kit.keep(new THREE.MeshBasicMaterial({ map: kit.canvasTexture(128, 128, (c, w) => {
      const s = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); s.addColorStop(0, 'rgba(255,214,150,.85)'); s.addColorStop(.4, 'rgba(255,190,120,.3)'); s.addColorStop(1, 'rgba(255,170,100,0)');
      c.fillStyle = s; c.fillRect(0, 0, w, w); }), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
    pool.position.set(LAMP.x, FLOOR + .0015, LAMP.z + .06);            // the light on the cobbles, warm (unlit: it is the light)
    return { root, glass: glassMat, light, halo, pool };
  }

  /* ── the bench: three wooden slats and a back on curly iron sides; its seat at the height the sitting clip sits at ── */
  function makeBench() {
    const root = new THREE.Group(), wood = mat(0x9a6440, { roughness: .8 }), iron = mat(0x23283a, { roughness: .45, metalness: .5 });
    root.position.set(BENCH.x, FLOOR, BENCH.z); root.rotation.y = BENCH.turn;
    const L = BENCH.len, S = BENCH.seat;
    for (let i = 0; i < 3; i++) { const s = mesh(new THREE.BoxGeometry(L, .005, .014), wood); s.position.set(0, S - .0025, .018 - i * .017); root.add(s); }
    for (let i = 0; i < 2; i++) { const s = mesh(new THREE.BoxGeometry(L, .014, .004), wood); s.position.set(0, S + .022 + i * .02, -.03 - i * .002); s.rotation.x = -.15; root.add(s); }
    for (const sx of [-1, 1]) {
      const side = new THREE.Group(); side.position.x = sx * (L / 2 - .012); root.add(side);
      const leg = (x, z, h, tilt) => { const b = mesh(new THREE.BoxGeometry(.004, h, .005), iron); b.position.set(0, h / 2, z); b.rotation.x = tilt; side.add(b); };
      leg(0, .016, S, .12); leg(0, -.024, S + .05, -.08);
      const arm = mesh(new THREE.TorusGeometry(.016, .0022, 5, 12, Math.PI), iron); arm.rotation.y = Math.PI / 2; arm.position.set(0, S + .012, .0); side.add(arm);
      const rail = mesh(new THREE.BoxGeometry(.004, .004, .046), iron); rail.position.set(0, S - .004, -.004); side.add(rail);
    }
    return root;
  }

  /* ── a tree: a crooked trunk and a crown of low-poly clumps that sways a little ── */
  function makeTree(seed, h, tint = 0) {
    const r = seeded(seed), root = new THREE.Group(), bark = mat(0x5a4038, { roughness: .9, flatShading: true });
    const trunk = mesh(new THREE.CylinderGeometry(.008, .014, h * .55, 6), bark); trunk.position.y = h * .27; trunk.rotation.z = (r() - .5) * .12; root.add(trunk);
    const crown = new THREE.Group(); crown.position.y = h * .55; root.add(crown);
    const greens = [['#2f5f4a', '#3f7356', '#4f8560'], ['#3a5f4f', '#4c7055', '#5f8a5c']][tint];
    for (let i = 0; i < 6; i++) {
      const s = h * (.16 + .1 * r()), b = mesh(new THREE.IcosahedronGeometry(s, 0), mat(greens[i % 3], { roughness: .85, flatShading: true }));
      const a = i / 6 * TAU + r(); b.position.set(Math.cos(a) * h * .13 * (i ? 1 : 0), h * (.08 + .17 * r()) + (i ? 0 : h * .12), Math.sin(a) * h * .1 * (i ? 1 : 0));
      b.rotation.set(r() * 3, r() * 3, r() * 3); crown.add(b);
    }
    return { root, crown };
  }

  /* ── lavender: grey-green stems with violet spikes, in clumps (one instanced mesh of spikes) ── */
  function makeLavender(spots) {
    const r = seeded(23), list = [];
    for (const [x, z, n] of spots) for (let i = 0; i < n; i++) { const a = r() * TAU, d = .016 * Math.sqrt(r()); list.push([x + Math.cos(a) * d, z + Math.sin(a) * d * .8, .03 + .02 * r(), (r() - .5) * .5, (r() - .5) * .5]); }
    const root = new THREE.Group();
    const spikes = kit.keep(new THREE.InstancedMesh(geo(new THREE.SphereGeometry(1, 6, 5)), mat(0xffffff, { roughness: .7, emissive: 0x3a2266, emissiveIntensity: .25 }), list.length));
    const stems = kit.keep(new THREE.InstancedMesh(geo(new THREE.CylinderGeometry(.0009, .0011, 1, 3).translate(0, .5, 0)), mat(0x6f8a68, { roughness: .9 }), list.length));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cl = new THREE.Color();
    list.forEach(([x, z, h, tx, tz], i) => {
      q.setFromEuler(e.set(tx, 0, tz));
      m4.compose(V3(x, FLOOR, z), q, V3(1, h, 1)); stems.setMatrixAt(i, m4);
      const tip = V3(0, h, 0).applyQuaternion(q);
      m4.compose(V3(x + tip.x, FLOOR + tip.y - .004, z + tip.z), q, V3(.0035, .011, .0035)); spikes.setMatrixAt(i, m4);
      spikes.setColorAt(i, cl.set(['#8e6fd0', '#a589e3', '#7a5cc2', '#b79cf0'][(r() * 4) | 0]));
    });
    spikes.castShadow = stems.castShadow = false;
    root.add(stems, spikes);
    return root;
  }

  /* ── shoes: a sole with a little heel, a toe cap and a strap (her dance shoes, and the pair she takes off) ── */
  function makeShoe(color, heel) {
    const g = new THREE.Group(), m = mat(color, { roughness: .3, metalness: heel ? .35 : .1, emissive: color, emissiveIntensity: heel ? .3 : .08 }), sole = mat(heel ? 0xb88ad0 : 0x2b2230, { roughness: .6 });
    const base = mesh(new THREE.BoxGeometry(.011, .003, .028), sole); base.position.set(0, .0015 + (heel ? .003 : 0), 0); base.rotation.x = heel ? .2 : 0; g.add(base);
    const toe = mesh(new THREE.SphereGeometry(.0068, 10, 8, 0, TAU, 0, Math.PI / 2).scale(1, .9, 1.5), m); toe.position.set(0, .002, .006); g.add(toe);
    const back = mesh(new THREE.BoxGeometry(.011, .008, .006), m); back.position.set(0, .006 + (heel ? .005 : 0), -.011); g.add(back);
    if (heel) { const h = mesh(new THREE.CylinderGeometry(.0018, .0012, .007, 6), sole); h.position.set(0, .0035, -.012); g.add(h); }
    const strap = mesh(new THREE.TorusGeometry(.0058, .0012, 4, 10, Math.PI), m); strap.rotation.y = Math.PI / 2; strap.position.set(0, .006 + (heel ? .003 : 0), -.003); g.add(strap);
    if (heel) { const bow = mesh(new THREE.SphereGeometry(.0034, 8, 6).scale(1.6, .8, .8), mat(0xff7aa0, { roughness: .5 })); bow.position.set(0, .006, .012); g.add(bow); }   // a pink bow on each toe
    return g;
  }
  function makePair(color, heel) {
    const root = new THREE.Group(), a = makeShoe(color, heel), b = makeShoe(color, heel);
    a.position.x = -.008; b.position.x = .008; b.rotation.y = .12; a.rotation.y = -.08; root.add(a, b);
    return { root, shoes: [a, b] };
  }

  /* ── the first words: an enamel plate on two short chains under the lamp's bar ── */
  function makePlate(text, w) {
    const h = w * .46, W = 1024, H = Math.round(W * .46);
    const tex = kit.canvasTexture(W, H, (c) => {
      c.fillStyle = '#272c48'; c.beginPath(); c.roundRect(6, 6, W - 12, H - 12, 46); c.fill();        // an iron rim
      c.fillStyle = '#fff6e6'; c.beginPath(); c.roundRect(22, 22, W - 44, H - 44, 34); c.fill();      // the enamel
      c.strokeStyle = '#c99a4a'; c.lineWidth = 6; c.beginPath(); c.roundRect(42, 42, W - 84, H - 84, 24); c.stroke();
      c.strokeStyle = 'rgba(201,154,74,.55)'; c.lineWidth = 2; c.beginPath(); c.roundRect(54, 54, W - 108, H - 108, 18); c.stroke();
      c.fillStyle = '#7a5c9e';                                          // corner stars and the screws that hold it up
      for (const [x, y] of [[80, 80], [W - 80, 80], [80, H - 80], [W - 80, H - 80]]) { c.beginPath(); c.arc(x, y, 11, 0, TAU); c.fill(); c.fillStyle = '#c9b8e8'; c.fillRect(x - 7, y - 1.5, 14, 3); c.fillStyle = '#7a5c9e'; }
      const notes = [[150, H - 70, -.2], [W - 150, 66, .2]];
      c.fillStyle = '#d07a98'; for (const [x, y, a] of notes) { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.ellipse(0, 10, 13, 9, -.4, 0, TAU); c.fill(); c.fillRect(9, -30, 5, 40); c.restore(); }
      c.fillStyle = '#4a2350'; kit.fitText(c, text, { x: 84, y: 58, w: W - 168, h: H - 116 }, { maxLines: 3, max: 120 });
    });
    const plate = new THREE.Group(), face = kit.keep(new THREE.MeshStandardMaterial({ map: tex, roughness: .5, metalness: .1, transparent: true, alphaTest: .05,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .42 }));
    const front = new THREE.Mesh(geo(new THREE.PlaneGeometry(w, h)), face); front.position.set(0, -h / 2 - LAMP.chain, .0026);
    const back = mesh(new THREE.BoxGeometry(w * .985, h * .97, .004), mat(0x272c48, { roughness: .5, metalness: .4 })); back.position.set(0, -h / 2 - LAMP.chain, 0);
    plate.add(front, back);
    for (const s of [-1, 1]) {                                         // two short chains of links
      for (let i = 0; i < 3; i++) { const l = mesh(new THREE.TorusGeometry(.003, .0009, 4, 8), mat(0x3a3f55, { metalness: .6, roughness: .4 }));
        l.position.set(s * .08, -.003 - i * LAMP.chain / 3, 0); l.rotation.y = i % 2 ? Math.PI / 2 : 0; plate.add(l); }
    }
    return { root: plate, h };
  }

  /* ── the photo's frame: a little marquee of bulbs round the polaroid, chasing like a stage sign (the bulbs one instanced
        mesh, their glows one set of points: two draws, not seventy) ── */
  function makeMarquee(pw, ph) {
    const root = new THREE.Group(), gold = mat(0xd9a84e, { roughness: .35, metalness: .7 }), M = .022, w = pw + 2 * M, h = ph + 2 * M;
    for (const [x, y, bw, bh] of [[0, h / 2, w + .01, .012], [0, -h / 2, w + .01, .012], [-w / 2, 0, .012, h], [w / 2, 0, .012, h]]) {
      const b = mesh(new THREE.BoxGeometry(bw, bh, .008), gold); b.position.set(x, y + ph / 2, -.006); root.add(b);
    }
    const per = (a, b, n) => Array.from({ length: n }, (_, i) => [lerp(a[0], b[0], (i + .5) / n), lerp(a[1], b[1], (i + .5) / n)]);
    const spots = [...per([-w / 2, h / 2], [w / 2, h / 2], 9), ...per([w / 2, h / 2], [w / 2, -h / 2], 10), ...per([w / 2, -h / 2], [-w / 2, -h / 2], 9), ...per([-w / 2, -h / 2], [-w / 2, h / 2], 10)];
    const n = spots.length, bulbs = kit.keep(new THREE.InstancedMesh(geo(new THREE.SphereGeometry(.0052, 8, 6)), kit.keep(new THREE.MeshBasicMaterial({ color: 0xffffff })), n));
    const m4 = new THREE.Matrix4(), lit = new THREE.Color('#fff4cf'), dim = new THREE.Color('#7a5a3a'), cl = new THREE.Color();
    spots.forEach(([x, y], i) => { m4.makeTranslation(x, y + ph / 2, .001); bulbs.setMatrixAt(i, m4); bulbs.setColorAt(i, dim); });
    root.add(bulbs);
    const glows = glowPoints(n, '#ffd28a');
    spots.forEach(([x, y], i) => glows.pos.set([x, y + ph / 2, .006], i * 3));
    root.add(glows.pts);
    /** on: 0..1; T: the act's time; scale: how big the photo stands now (its glows shrink with it); the bulbs chase round */
    const pose = (on, T, scale) => {
      for (let i = 0; i < n; i++) {
        const k = on * ((i + Math.floor(T * 7)) % 3 ? 1 : .25);
        bulbs.setColorAt(i, cl.copy(dim).lerp(lit, k)); glows.alpha[i] = .9 * k;
      }
      bulbs.instanceColor.needsUpdate = true; glows.attr.needsUpdate = true; glows.u.uSize.value = .036 * scale;
    };
    return { root, pose };
  }

  /* ── the last words: a ribbon that unrolls from the left, its rolled-up part a little scroll that runs along ── */
  function makeRibbon(text, w, h) {
    const W = 1024, H = Math.round(W * h / w), N = 72, n = H * .34;
    const shape = (c, fill) => {                                       // a ribbon with forked ends and a gilt edge
      c.fillStyle = fill; c.beginPath(); c.moveTo(0, 8); c.lineTo(W, 8); c.lineTo(W - n, H / 2); c.lineTo(W, H - 8); c.lineTo(0, H - 8); c.lineTo(n, H / 2); c.closePath(); c.fill();
      c.strokeStyle = '#c98a5a'; c.lineWidth = 7; c.beginPath(); c.moveTo(n * .2, 24); c.lineTo(W - n * .2, 24); c.moveTo(n * .2, H - 24); c.lineTo(W - n * .2, H - 24); c.stroke();
    };
    const tex = kit.canvasTexture(W, H, (c) => {
      shape(c, '#fff6e8');
      c.fillStyle = '#e07a9a'; for (const x of [n + 30, W - n - 30]) { kit.heartPath(c, x, H / 2, 40); c.fill(); }
      c.fillStyle = '#4a2350'; kit.fitText(c, text, { x: n + 70, y: 32, w: W - 2 * n - 140, h: H - 64 }, { maxLines: 2, max: 96 });
    });
    const backTex = kit.canvasTexture(W, H, c => shape(c, '#ead8bf'));
    const g = geo(new THREE.PlaneGeometry(w, h, N, 1)), pos = g.attributes.position, base = Float32Array.from({ length: pos.count }, (_, i) => pos.getX(i));
    const front = new THREE.Mesh(g, kit.keep(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .05, side: THREE.FrontSide, roughness: .8,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .5 })));
    const back = new THREE.Mesh(g, kit.keep(new THREE.MeshStandardMaterial({ map: backTex, transparent: true, alphaTest: .05, side: THREE.BackSide, roughness: .9,
      emissive: 0xffffff, emissiveMap: backTex, emissiveIntensity: .25 })));
    const root = new THREE.Group(); root.add(front, back);
    /** k: how much is unrolled, 0..1; the rest is wound into a roll at the free end (a spiral, so its turns do not touch) */
    const unroll = k => {
      const head = -w / 2 + k * w, R = .011;
      for (let i = 0; i < pos.count; i++) {
        const x0 = base[i];
        if (x0 <= head) { pos.setX(i, x0); pos.setZ(i, 0); continue; }
        const s = x0 - head, r = Math.max(.004, R - .0011 * s / (TAU * R)), a = s / r;
        pos.setX(i, head + r * Math.sin(a)); pos.setZ(i, r * (1 - Math.cos(a)));
      }
      pos.needsUpdate = true; g.computeVertexNormals();
      return head;
    };
    unroll(0);
    return { root, unroll };
  }

  return { seeded, pageZ, makePage, makeCityLights, makeGround, makeTufts, makeLamp, makeBench, makeTree, makeLavender, makePair, makePlate, makeMarquee, makeRibbon };
};
