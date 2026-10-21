/* Điệu valse đêm hội: what the stops show, for story.js (template.json "story" loads this file before it). An invitation
   card with a gold edge (its wine back has a heart seal), words written in gold light with sparkles that fly to them
   from the floor, an ornate gold frame for the photo, and a flock: points (sparkles or petals) whose every position the
   story computes, so they can be told as a function of time like everything else.
     NM_WALTZ.keepsakes(kit) → { makeInvitation(text), makeWords(text), makeFrame(photo width), makeFlock(n, additive) } */
(window.NM_WALTZ = window.NM_WALTZ || {}).keepsakes = kit => {
  const { THREE, HAND } = kit;
  const TAU = Math.PI * 2;
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rounded = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  const goldFill = (c, x0, y0, x1, y1) => {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#fbe6a0'); g.addColorStop(.3, '#d9a440'); g.addColorStop(.55, '#f6d27a'); g.addColorStop(.8, '#a8731f'); g.addColorStop(1, '#e8bf62');
    return g;
  };
  /** a curl of gold: a spiral out from (x, y), s big, turning dir (1 or -1) */
  function curl(c, x, y, s, a0, dir) {
    c.beginPath();
    for (let i = 0; i <= 24; i++) { const t = i / 24, a = a0 + dir * t * 4.2, r = s * (1 - .8 * t); c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.stroke();
  }

  /* ── the invitation: cream with a double gold edge, "Thư mời" and the words; its back wine with a heart seal ── */
  function makeInvitation(text) {
    const width = .42, aspect = .64, height = width * aspect, PW = 1024, PH = Math.round(PW * aspect);
    const front = kit.canvasTexture(PW, PH, (c, w, h) => {
      c.save(); c.shadowColor = 'rgba(60,20,30,.3)'; c.shadowBlur = 16; c.fillStyle = '#fff8ea'; rounded(c, 12, 12, w - 24, h - 24, 34); c.fill(); c.restore();
      const paper = c.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, w * .6); paper.addColorStop(0, 'rgba(255,255,255,0)'); paper.addColorStop(1, 'rgba(232,206,160,.35)');
      c.fillStyle = paper; rounded(c, 12, 12, w - 24, h - 24, 34); c.fill();
      c.strokeStyle = goldFill(c, 0, 0, w, h); c.lineWidth = 16; rounded(c, 30, 30, w - 60, h - 60, 26); c.stroke();
      c.strokeStyle = '#b07c26'; c.lineWidth = 3; rounded(c, 54, 54, w - 108, h - 108, 18); c.stroke();
      c.strokeStyle = '#c99434'; c.lineWidth = 5; c.lineCap = 'round';
      for (const [x, y, sx, sy] of [[70, 70, 1, 1], [w - 70, 70, -1, 1], [70, h - 70, 1, -1], [w - 70, h - 70, -1, -1]]) {   // corner flourishes
        curl(c, x + sx * 34, y + sy * 8, 22, sx > 0 ? Math.PI : 0, sx * sy); curl(c, x + sx * 8, y + sy * 34, 22, sy > 0 ? -Math.PI / 2 : Math.PI / 2, -sx * sy);
        c.fillStyle = '#e8436d'; kit.heartPath(c, x + sx * 6, y + sy * 6, 22); c.fill();
      }
      c.fillStyle = '#8a1f3d'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 112px ${HAND}`; c.fillText('Thư mời', w / 2, 122);
      c.strokeStyle = '#c99434'; c.lineWidth = 4;                       // a swash and a heart under the title
      c.beginPath(); c.moveTo(w / 2 - 230, 196); c.bezierCurveTo(w / 2 - 120, 172, w / 2 - 60, 214, w / 2 - 22, 194); c.stroke();
      c.beginPath(); c.moveTo(w / 2 + 230, 196); c.bezierCurveTo(w / 2 + 120, 172, w / 2 + 60, 214, w / 2 + 22, 194); c.stroke();
      c.fillStyle = '#d9a440'; kit.heartPath(c, w / 2, 194, 30); c.fill();
      c.fillStyle = '#3f1027'; kit.fitText(c, text, { x: 104, y: 222, w: w - 208, h: h - 300 }, { maxLines: 3 });
      c.fillStyle = '#c99434'; for (const dx of [-40, 0, 40]) { c.beginPath(); c.arc(w / 2 + dx, h - 72, dx ? 6 : 9, 0, TAU); c.fill(); }
    });
    const back = kit.canvasTexture(PW, PH, (c, w, h) => {
      c.fillStyle = '#7d1a37'; rounded(c, 12, 12, w - 24, h - 24, 34); c.fill();
      const v = c.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * .62); v.addColorStop(0, 'rgba(255,120,150,.25)'); v.addColorStop(1, 'rgba(40,0,10,.35)');
      c.fillStyle = v; rounded(c, 12, 12, w - 24, h - 24, 34); c.fill();
      c.strokeStyle = goldFill(c, 0, 0, w, h); c.lineWidth = 14; rounded(c, 34, 34, w - 68, h - 68, 24); c.stroke();
      c.strokeStyle = '#d9a440'; c.lineWidth = 4; c.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; curl(c, w / 2 + Math.cos(a) * 150, h / 2 + Math.sin(a) * 120, 34, a, i % 2 ? 1 : -1); }
      c.fillStyle = '#b3123e'; c.beginPath(); c.arc(w / 2, h / 2, 96, 0, TAU); c.fill();   // a wax seal pressed with a heart
      c.strokeStyle = '#7a0a27'; c.lineWidth = 8; c.stroke();
      c.fillStyle = '#f6d27a'; kit.heartPath(c, w / 2, h / 2 + 4, 110); c.fill();
    });
    const geo = kit.keep(new THREE.PlaneGeometry(width, height));
    const face = (map, side) => kit.keep(new THREE.MeshStandardMaterial({ map, side, roughness: .75, transparent: true, alphaTest: .05,
      emissive: 0xffffff, emissiveMap: map, emissiveIntensity: .42 }));
    const root = new THREE.Group();
    root.add(new THREE.Mesh(geo, face(front, THREE.FrontSide)), new THREE.Mesh(geo, face(back, THREE.BackSide)));
    return { root, width, height };
  }

  /* ── words in gold light: big handwriting, gilded, outlined dark so they read on the wall or the windows ── */
  function makeWords(text) {
    const PW = 1024, PH = 400, width = .68, height = width * PH / PW;
    let painted = 0;
    const tex = kit.canvasTexture(PW, PH, (c, w, h) => {
      const box = { x: 40, y: 24, w: w - 80, h: h - 48 }, o = { maxLines: 2 };
      c.save(); c.shadowColor = 'rgba(40,6,30,.9)'; c.shadowBlur = 26; c.fillStyle = 'rgba(52,12,40,.9)';
      for (const [dx, dy] of [[-5, 0], [5, 0], [0, -5], [0, 5], [-4, -4], [4, 4], [-4, 4], [4, -4]]) { c.save(); c.translate(dx, dy); kit.fitText(c, text, box, o); c.restore(); }
      c.restore();
      c.fillStyle = goldFill(c, 0, 0, w * .3, h); kit.fitText(c, text, box, o);
      painted++;
    });
    const mesh = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(width, height)), kit.keep(new THREE.MeshBasicMaterial({ map: tex, transparent: true,
      depthWrite: false, opacity: 0, toneMapped: false })));
    mesh.renderOrder = 7;
    let cache = null, at = -1;
    /** where the lit pixels of the words are, in the plane's own units: up to n of them, the same set every time */
    function points(n) {
      if (cache && at === painted) return cache;
      const c = tex.image.getContext('2d', { willReadFrequently: true }), d = c.getImageData(0, 0, PW, PH).data, all = [];
      for (let y = 3; y < PH; y += 7) for (let x = 3; x < PW; x += 7) {
        const i = (y * PW + x) * 4;
        if (d[i + 3] > 200 && d[i] > 150 && d[i + 1] > 100) all.push([(x / PW - .5) * width, (.5 - y / PH) * height]);   // gold, not the dark rim
      }
      const r = seeded(97);
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      cache = all.slice(0, n); at = painted;
      while (cache.length < n) cache.push(all.length ? all[cache.length % all.length] : [0, 0]);   // short words: some points share a place
      return cache;
    }
    return { mesh, width, height, points };
  }

  /* ── an ornate gold frame for the polaroid (photo.width wide): beads, corner rosettes, a crest and a ribbon bow ── */
  function makeFrame(pw) {
    const ph = pw * 620 / 512, fw = pw + .09, fh = ph + .13, PX = 1024 / fw, PH = Math.round(fh * PX);
    const open = { w: (pw - .012) * PX, h: (ph - .01) * PX };
    const cx = 512, cy = PH - (.045 + ph / 2) * PX;                    // the opening's middle: the crest takes the top
    const tex = kit.canvasTexture(1024, PH, (c, w, h) => {
      const x0 = cx - open.w / 2 - 70, y0 = cy - open.h / 2 - 70, x1 = cx + open.w / 2 + 70, y1 = cy + open.h / 2 + 70;
      c.fillStyle = goldFill(c, x0, y0, x1, y1); c.strokeStyle = '#5b3a0e'; c.lineWidth = 5;
      rounded(c, x0, y0, x1 - x0, y1 - y0, 40); c.fill(); c.stroke();
      c.strokeStyle = '#fff1c2'; c.lineWidth = 4; rounded(c, x0 + 14, y0 + 14, x1 - x0 - 28, y1 - y0 - 28, 30); c.stroke();
      c.fillStyle = '#7a4f12'; rounded(c, cx - open.w / 2 - 16, cy - open.h / 2 - 16, open.w + 32, open.h + 32, 12); c.fill();
      for (let i = 0; i < 84; i++) {                                    // beads all round the band
        const t = i / 84, per = 2 * (x1 - x0 + y1 - y0 - 120), d = t * per, ww = x1 - x0 - 60, hh = y1 - y0 - 60;
        let bx, by; if (d < ww) { bx = x0 + 30 + d; by = y0 + 34; } else if (d < ww + hh) { bx = x1 - 34; by = y0 + 30 + d - ww; } else if (d < 2 * ww + hh) { bx = x1 - 30 - (d - ww - hh); by = y1 - 34; } else { bx = x0 + 34; by = y1 - 30 - (d - 2 * ww - hh); }
        c.fillStyle = i % 2 ? '#fff0b8' : '#b5832c'; c.beginPath(); c.arc(bx, by, 7, 0, TAU); c.fill();
      }
      for (const [x, y] of [[x0 + 18, y0 + 18], [x1 - 18, y0 + 18], [x0 + 18, y1 - 18], [x1 - 18, y1 - 18]]) {   // corner rosettes
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; c.fillStyle = k % 2 ? '#f6d27a' : '#d9a440'; c.beginPath(); c.ellipse(x + Math.cos(a) * 26, y + Math.sin(a) * 26, 20, 11, a, 0, TAU); c.fill(); c.strokeStyle = '#5b3a0e'; c.lineWidth = 3; c.stroke(); }
        c.fillStyle = '#e8436d'; c.beginPath(); c.arc(x, y, 15, 0, TAU); c.fill(); c.stroke();
      }
      const top = y0 - 4;                                               // the crest: a shell of gold, a heart, a wine bow
      c.fillStyle = goldFill(c, cx - 150, top - 150, cx + 150, top); c.strokeStyle = '#5b3a0e'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(cx - 170, top + 10); c.bezierCurveTo(cx - 160, top - 120, cx + 160, top - 120, cx + 170, top + 10); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#a8731f'; c.lineWidth = 4; for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(cx, top + 4); c.lineTo(cx + k * 34, top - 78 + Math.abs(k) * 12); c.stroke(); }
      c.fillStyle = '#b3123e'; kit.heartPath(c, cx, top - 42, 70); c.fill(); c.strokeStyle = '#5b0a1f'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#8a1f3d';                                          // a wine bow on top
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx, top - 112); c.bezierCurveTo(cx + s * 80, top - 170, cx + s * 120, top - 90, cx + s * 20, top - 104); c.fill(); }
      c.beginPath(); c.arc(cx, top - 108, 16, 0, TAU); c.fill();
      c.clearRect(cx - open.w / 2, cy - open.h / 2, open.w, open.h);    // the opening the photo shows through
    });
    const mesh = new THREE.Mesh(kit.keep(new THREE.PlaneGeometry(fw, fh)), kit.keep(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .1,
      roughness: .35, metalness: .3, envMap: kit.env, envMapIntensity: .8, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .3 })));
    const offset = (PH / 2 - cy) / PX;                                  // the opening's middle, from the plane's middle (model units, up)
    return { mesh, offset, width: fw, height: fh };
  }

  /* ── a flock: n points of light or petals; the story sets every point's place, size, shape and brightness ── */
  function makeFlock(n, additive = false) {
    const g = kit.keep(new THREE.BufferGeometry()), pos = new Float32Array(n * 3), alpha = new Float32Array(n), size = new Float32Array(n),
      shape = new Float32Array(n), col = new Float32Array(n * 3), rot = new Float32Array(n);
    for (const [name, arr, k] of [['position', pos, 3], ['aAlpha', alpha, 1], ['aSize', size, 1], ['aShape', shape, 1], ['aColor', col, 3], ['aRot', rot, 1]])
      g.setAttribute(name, new THREE.BufferAttribute(arr, k).setUsage(THREE.DynamicDrawUsage));
    const atlas = kit.canvasTexture(256, 128, (c) => {
      const s = c.createRadialGradient(64, 64, 0, 64, 64, 60); s.addColorStop(0, 'rgba(255,255,255,1)'); s.addColorStop(.3, 'rgba(255,255,255,.5)'); s.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = s; c.fillRect(0, 0, 128, 128); c.fillStyle = '#fff';
      c.beginPath(); c.moveTo(64, 4); c.quadraticCurveTo(68, 60, 124, 64); c.quadraticCurveTo(68, 68, 64, 124); c.quadraticCurveTo(60, 68, 4, 64); c.quadraticCurveTo(60, 60, 64, 4); c.fill();
      const p = c.createLinearGradient(192, 10, 192, 118); p.addColorStop(0, '#ffffff'); p.addColorStop(1, '#e6d0d6'); c.fillStyle = p;   // a petal
      c.beginPath(); c.moveTo(192, 10); c.bezierCurveTo(240, 36, 232, 100, 192, 118); c.bezierCurveTo(152, 100, 144, 36, 192, 10); c.fill();
    });
    const m = kit.keep(new THREE.ShaderMaterial({
      uniforms: { map: { value: atlas }, halfH: { value: 400 } },
      vertexShader: `attribute float aAlpha, aSize, aShape, aRot; attribute vec3 aColor; uniform float halfH; varying float vA, vS, vR; varying vec3 vC;
        void main() { vA = aAlpha; vS = aShape; vR = aRot; vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = aAlpha <= 0.0 ? 0.0 : aSize * projectionMatrix[1][1] * halfH / max(.001, -mv.z); }`,
      fragmentShader: `uniform sampler2D map; varying float vA, vS, vR; varying vec3 vC;
        void main() { vec2 p = gl_PointCoord - .5; float c = cos(vR), s = sin(vR); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + .5;
          if (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1.) discard;
          vec4 t = texture2D(map, vec2((vS + p.x) * .5, 1. - p.y)); float a = t.a * vA; if (a < .01) discard; gl_FragColor = vec4(vC * t.rgb, a); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    }));
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 8;
    const v2 = new THREE.Vector2(), color = new THREE.Color();
    pts.onBeforeRender = r => { r.getDrawingBufferSize(v2); m.uniforms.halfH.value = v2.y / 2; };
    return {
      root: pts, n,
      /** point i: at (x, y, z), size s, shape 0 (light) or 1 (petal), brightness a, turned rot, colour */
      set(i, x, y, z, s, sh, a, r, hex) {
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; size[i] = s; shape[i] = sh; alpha[i] = a; rot[i] = r;
        if (hex) { color.set(hex); col[i * 3] = color.r; col[i * 3 + 1] = color.g; col[i * 3 + 2] = color.b; }
      },
      hide() { alpha.fill(0); g.attributes.aAlpha.needsUpdate = true; },
      done() { for (const a of Object.values(g.attributes)) a.needsUpdate = true; }
    };
  }

  return { makeInvitation, makeWords, makeFrame, makeFlock, seeded };
};
