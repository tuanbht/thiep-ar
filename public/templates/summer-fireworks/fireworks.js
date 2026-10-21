/* Pháo hoa mùa hạ: the fireworks, for story.js (loaded after scenery.js). Every shell is a function of time: a rocket climbs
   on a trail of sparks and bursts into stars that fly out against the air and sink (a chrysanthemum, a peony, a willow
   with long drooping gold tails, a tilted ring, a heart, a crackling glitter, and a frame that the card's photo takes
   over), each star with a short tail of fading points; the same stars glint on the river below as long streaks, and each
   burst lights up the sky round it and, for a moment, the scene in its colour.
     NM_SUMMER.fireworks(kit, layout) → { root, flash, at, pose(time, T, idle) }; layout: { RIVER, Z, SHOW }
   SHOW: the shells, [{ at, x, y, kind, colors, r, n, x0, rise, life, frame }]; `time` is the story's clock, so a shell
   in the air when a stop comes would freeze there: none is. While a stop holds, `idle` (0..1) lets small shells go up
   at the sides by T, the act's own time. */
(window.NM_SUMMER = window.NM_SUMMER || {}).fireworks = (kit, { RIVER, Z, SHOW }) => {
  const { THREE, ease, seg, clamp, lerp } = kit;
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const MAX = 5200, MAXR = 900;                                      // points in the sky; glints on the water

  /* ── one Points cloud for the sky, one for the water; each point a soft dot with a bright core ── */
  function cloud(max, draw, blend = THREE.AdditiveBlending) {
    const g = kit.keep(new THREE.BufferGeometry());
    const a = { position: new Float32Array(max * 3), aColor: new Float32Array(max * 3), aSize: new Float32Array(max), aAlpha: new Float32Array(max) };
    for (const [k, v] of Object.entries(a)) g.setAttribute(k, new THREE.BufferAttribute(v, k === 'position' || k === 'aColor' ? 3 : 1).setUsage(THREE.DynamicDrawUsage));
    const tex = kit.canvasTexture(64, 64, draw);
    const m = kit.keep(new THREE.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uHalfH: { value: 400 } },
      vertexShader: `attribute vec3 aColor; attribute float aSize, aAlpha; uniform float uHalfH; varying vec3 vC; varying float vA;
        void main() { vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = aAlpha <= 0.0 ? 0.0 : aSize * projectionMatrix[1][1] * uHalfH / max(.001, -mv.z); }`,
      fragmentShader: `uniform sampler2D uMap; varying vec3 vC; varying float vA;
        void main() { vec4 t = texture2D(uMap, gl_PointCoord); float k = t.a * vA; if (k < .004) discard;
          gl_FragColor = vec4(vC * t.rgb * k, k); }`,
      transparent: true, depthWrite: false, blending: blend
    }));
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 7;
    const v2 = new THREE.Vector2();
    pts.onBeforeRender = r => { r.getDrawingBufferSize(v2); m.uniforms.uHalfH.value = v2.y / 2; };
    let n = 0;
    const col = new THREE.Color();
    return {
      pts, a,
      begin() { n = 0; },
      /** one point: where, its colour (a THREE.Color or hex), size in card widths, brightness */
      put(x, y, z, c, size, alpha) {
        if (n >= max || alpha <= .004) return;
        a.position[n * 3] = x; a.position[n * 3 + 1] = y; a.position[n * 3 + 2] = z;
        const cc = c.isColor ? c : col.set(c); a.aColor[n * 3] = cc.r; a.aColor[n * 3 + 1] = cc.g; a.aColor[n * 3 + 2] = cc.b;
        a.aSize[n] = size; a.aAlpha[n] = alpha; n++;
      },
      end() {
        a.aAlpha.fill(0, n);
        for (const k of Object.keys(a)) g.attributes[k].needsUpdate = true;
        g.setDrawRange(0, Math.max(n, 1));
      }
    };
  }
  const dot = (c, w) => {                                            // a hot white core in a coloured glow
    const s = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    s.addColorStop(0, 'rgba(255,255,255,1)'); s.addColorStop(.18, 'rgba(255,255,255,.95)'); s.addColorStop(.4, 'rgba(255,255,255,.35)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = s; c.fillRect(0, 0, w, w);
  };
  const streak = (c, w) => {                                         // a glint on the water: long up and down, thin across
    const s = c.createLinearGradient(0, 0, 0, w); s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(.5, 'rgba(255,255,255,1)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = s; c.beginPath(); c.ellipse(w / 2, w / 2, w * .09, w * .5, 0, 0, TAU); c.fill();
  };
  const sky = cloud(MAX, dot), water = cloud(MAXR, streak);
  const root = new THREE.Group(); root.add(sky.pts, water.pts);
  const glowTex = kit.canvasTexture(128, 128, (c, w) => {            // the sky round a burst: a flat glow facing you (a sprite would tilt
    const s = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);   // through the photo when it is near)
    s.addColorStop(0, 'rgba(255,255,255,1)'); s.addColorStop(.3, 'rgba(255,255,255,.45)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = s; c.fillRect(0, 0, w, w);
  });
  const bloomGeo = kit.keep(new THREE.PlaneGeometry(1, 1));
  const blooms = Array.from({ length: 6 }, () => {
    const b = new THREE.Mesh(bloomGeo, kit.keep(new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
    b.renderOrder = 2; root.add(b); return b;
  });

  /* ── the shells: each star's way out is worked out once (a seeded direction), its place at any time by formula ── */
  const H2 = [0, 0];
  const heartXY = t => { H2[0] = Math.sin(t) ** 3; H2[1] = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 + .18; return H2; };
  const KIND = {                                                     // drag, gravity, star life, tail points, tail spacing, star size, stars
    chrysanthemum: { k: 2.6, G: .1, life: 2.0, tail: 6, gap: .035, size: .034, n: 110 },
    peony: { k: 3.2, G: .08, life: 1.6, tail: 2, gap: .03, size: .04, n: 90 },
    willow: { k: 2.0, G: .2, life: 3.2, tail: 10, gap: .07, size: .03, n: 70 },
    ring: { k: 2.8, G: .07, life: 1.8, tail: 3, gap: .03, size: .036, n: 64 },
    heart: { k: 2.4, G: .03, life: 2.8, tail: 3, gap: .03, size: .038, n: 84 },
    glitter: { k: 3.5, G: .09, life: 1.7, tail: 1, gap: .03, size: .024, n: 140 },
    frame: { k: 2.6, G: 0, life: 2.4, tail: 3, gap: .03, size: .03, n: 64 }
  };
  function prepare(s, i) {
    const K = KIND[s.kind], r = seeded(1000 + i * 37 + Math.round(s.at * 100)), n = s.n ?? K.n;
    const stars = Array.from({ length: n }, (_, j) => {
      let d;
      if (s.kind === 'ring') { const a = j / n * TAU, t = s.tilt ?? .5; d = [Math.cos(a), Math.sin(a) * Math.cos(t), Math.sin(a) * Math.sin(t)]; }
      else if (s.kind === 'heart') { const h = heartXY(j / n * TAU); d = [h[0], h[1] - .2, 0]; }
      else if (s.kind === 'frame') { const a = j / n * TAU; d = [Math.cos(a), Math.sin(a), 0]; }
      else { const y = 1 - 2 * (j + .5) / n, rr = Math.sqrt(1 - y * y), a = j * 2.39996; d = [Math.cos(a) * rr, y, Math.sin(a) * rr * .45]; }   // a sphere, flattened towards you
      const jit = s.kind === 'chrysanthemum' || s.kind === 'peony' || s.kind === 'glitter' || s.kind === 'willow' ? .82 + .3 * r() : 1;
      return { d, jit, c: s.colors[(s.kind === 'peony' || s.kind === 'chrysanthemum') && s.colors.length > 1 ? (d[1] > .35 || j % 3 === 0 ? 1 : 0) : j % s.colors.length],
        ph: r() * TAU, tw: 8 + 10 * r(), late: r() };
    });
    const colors = s.colors.map(c => new THREE.Color(c));
    stars.forEach(st => { st.col = colors[s.colors.indexOf(st.c)] || colors[0]; });
    return { ...s, K, stars, colors, rise: s.rise ?? .8, x0: s.x0 ?? s.x + (r() - .5) * .06, y0: s.y0 ?? .2, z: s.z ?? Z, life: s.life ?? K.life, r: s.r ?? .22 };
  }
  const shells = SHOW.map(prepare);
  const WHITE = new THREE.Color('#fff6e0'), cTmp = new THREE.Color();
  const flash = new THREE.Color(), at = new THREE.Vector3(0, .6, Z);
  /** where a star is, t seconds after its burst: out against the air, then sinking */
  function place(sh, st, t, out) {
    const K = sh.K, v = sh.r * K.k * st.jit, s = (1 - Math.exp(-K.k * t)) / K.k;
    out[0] = sh.x + st.d[0] * v * s; out[1] = sh.y + st.d[1] * v * s - K.G * (t / K.k - s / K.k) * (sh.kind === 'willow' ? 1.6 : 1); out[2] = sh.z + st.d[2] * v * s;
    return out;
  }
  const P = [0, 0, 0];
  let bloomI = 0;
  /** draws shell `sh` at its own time `t` (seconds since its launch); returns its flash (0..1) */
  function drawShell(sh, t, T, frameTo) {
    if (t < 0) return 0;
    const K = sh.K;
    if (t < sh.rise) {                                               // the rocket climbing on a trail of sparks
      const k = ease.out(t / sh.rise);
      for (let i = 0; i < 7; i++) {
        const kk = ease.out(Math.max(0, t - i * .035) / sh.rise), w = .004 * Math.sin(t * 30 + i);
        sky.put(lerp(sh.x0, sh.x, kk) + w, lerp(sh.y0, sh.y, kk), sh.z, i ? cTmp.copy(sh.colors[0]).lerp(WHITE, .6) : WHITE, (i ? .012 : .018) * (1 - i / 8), (1 - i / 7) * .9);
      }
      return k > .98 ? .15 : 0;
    }
    const tb = t - sh.rise, life = sh.life;
    if (tb > life + K.tail * K.gap) return 0;
    const fade = 1 - ease.smooth(seg(tb, life * .55, life));
    for (const st of sh.stars) {
      const late = sh.kind === 'glitter' ? st.late * .25 : 0;
      for (let i = 0; i <= K.tail; i++) {
        const ti = tb - i * K.gap - late; if (ti < 0) break;
        place(sh, st, ti, P);
        let x = P[0], y = P[1], z = P[2], a = fade * (1 - i / (K.tail + 1)) * (i ? .7 : 1);
        if (sh.kind === 'frame' && frameTo) {                          // the stars gather onto the photo's edge
          const g = ease.inOut(seg(ti, .45, 1.15)), f = frameTo(st, P);
          x = lerp(x, f[0], g); y = lerp(y, f[1], g); z = lerp(z, f[2], g); a *= 1 - .6 * seg(ti, 1.3, 2.2);
        }
        if (sh.kind === 'glitter' || (sh.kind === 'willow' && ti > life * .55)) a *= .45 + .55 * Math.abs(Math.sin(T * st.tw + st.ph + i));   // crackle
        const hot = 1 - seg(ti, 0, .12);
        a *= .3 + .7 * seg(ti, 0, .1);                                  // the stars light up as they leave: no white blob at the burst
        cTmp.copy(st.col).lerp(WHITE, hot * .7);
        sky.put(x, y, z, cTmp, K.size * (i ? .8 - .5 * i / (K.tail + 1) : 1) * (1 + .25 * hot), a * (1 - .45 * hot));
        if (i === 0 && ti < life * .8) mirror(x, y, cTmp, a);
      }
    }
    const fl = Math.exp(-tb * 4.5) * (sh.kind === 'glitter' ? .6 : 1);
    if (fl > .02 && bloomI < blooms.length) {                       // the sky glowing round the burst
      const b = blooms[bloomI++]; b.position.set(sh.x, sh.y, sh.z - .01); b.material.color.copy(sh.colors[0]).lerp(WHITE, .15);
      b.material.opacity = .3 * fl * ease.out(seg(tb, 0, .08)); b.scale.setScalar(sh.r * 2.6 * (.6 + .4 * ease.out(seg(tb, 0, .4))));
    }
    return fl;
  }
  /** a star's glint on the river: below it, nearer you the higher it is, squeezed into the water's width */
  const MID = (RIVER.x0 + RIVER.x1) / 2, HALF = (RIVER.x1 - RIVER.x0) / 2 - .012;
  function mirror(x, y, c, a) {
    const xr = MID + clamp((x - MID) * .42, -HALF, HALF), zr = clamp(.3 - (y - .38) * .62, -.3, .3);
    water.put(xr, .0075, zr, c, .034 + .04 * clamp((zr + .3) / .6), a * .5);
  }

  /* ── small shells for while a stop holds: one every 1.7 s, at the sides, by the act's own time ── */
  const IDLE_COLORS = [['#ffd166', '#ff8fab'], ['#9be7ff', '#ffffff'], ['#c5a3ff', '#ff8fab'], ['#b8ff9a', '#ffe08a'], ['#ff9a6b', '#fff1b8']];
  const idleShells = new Map();
  function idleShell(k) {
    if (!idleShells.has(k)) {
      const r = seeded(500 + k * 13), side = k % 2 ? 1 : -1;
      idleShells.set(k, prepare({ at: 0, x: side * (.3 + .12 * r()), y: .6 + .16 * r(), kind: ['peony', 'chrysanthemum', 'ring', 'glitter'][k % 4], colors: IDLE_COLORS[k % IDLE_COLORS.length], r: .09 + .04 * r(), n: 40, rise: .7, tilt: .3 + .6 * r() }, 900 + k));
      if (idleShells.size > 12) idleShells.delete(idleShells.keys().next().value);
    }
    return idleShells.get(k);
  }
  let idleFrom = null, idleTo = null;

  return {
    root, flash, at,
    /** the photo frame's corners for the 'frame' shell: frameTo(star, place) → [x, y, z] */
    frameTo: null,
    pose(time, T, idle = 0) {
      sky.begin(); water.begin(); bloomI = 0;
      flash.setRGB(0, 0, 0); let best = 0;
      for (const sh of shells) {
        if (time < sh.at - .01 || time > sh.at + sh.rise + sh.life + 1) continue;
        const f = drawShell(sh, time - sh.at, T, this.frameTo);
        if (f > 0) { flash.r += sh.colors[0].r * f; flash.g += sh.colors[0].g * f; flash.b += sh.colors[0].b * f; if (f > best) { best = f; at.set(sh.x, sh.y, sh.z); } }
      }
      if (idle > 0) { if (idleFrom === null) idleFrom = T; idleTo = null; }   // a stop began: small shells, one every 1.7 s
      else if (idleFrom !== null && idleTo === null) idleTo = T;      // it ended: none new, those up there finish
      if (idleFrom !== null) {
        const last = Math.floor(((idleTo ?? T) - idleFrom - .5) / 1.7);
        let alive = false;
        for (let k = Math.max(0, last - 3); k <= last; k++) {
          const t = T - idleFrom - .5 - k * 1.7, sh = idleShell(k);
          if (t < 0 || t > sh.rise + sh.life + .5) continue;
          alive = true;
          const f = drawShell(sh, t, T, null) * .6 * (idleTo === null ? clamp(idle * 2) : 1);
          if (f > 0) { flash.r += sh.colors[0].r * f; flash.g += sh.colors[0].g * f; flash.b += sh.colors[0].b * f; }
        }
        if (idleTo !== null && !alive) idleFrom = idleTo = null;
      }
      for (let i = bloomI; i < blooms.length; i++) blooms[i].material.opacity = 0;
      sky.end(); water.end();
    },
    /** a new stop (or a replay): no shells left over from the last hold */
    reset() { idleFrom = idleTo = null; }
  };
};
