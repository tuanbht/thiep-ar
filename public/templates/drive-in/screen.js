/* Suất Chiếu Đặc Biệt: the big screen, for story.js. 1.25 card widths of cream canvas on a steel frame behind the
   card's far edge, and everything projected on it, kept cheap for phones:
   - each photo is drawn once onto a 16:9 canvas and kept: a landscape photo fills it, any other shows whole in the
     middle over the same photo blurred to fill the rest (as a phone video on a cinema screen); its average colour is
     taken then too, from a tiny canvas;
   - a shot moves only the texture's UV transform (a slow push-in, a pan), two planes dissolve one shot into the next;
   - letterbox bars are meshes; the subtitle and the trailer's tagline are small canvases redrawn when their words change;
   - grain is a small tiling noise whose offset jumps every frame; flicker is a small wobble of brightness;
   - the countdown leader is a canvas per number and a sweep drawn by a shader; the title cards (SẮP CHIẾU, the film's
     title, GIẢI LAO with its clock, HẾT, the closing words over the first photo in a heart) are canvases drawn once;
   - a spot light in front of the screen, aimed at the car, takes each photo's colour; the puddles show the picture
     upside down, rippled.
   A tap on the screen opens the photo on it (the act shows it big); with a title or the countdown on it, a tap plays on.
   window.NM_DRIVEIN_SCREEN(kit, set) returns { root, reel, film(ft), show(state), light, glow }. */
window.NM_DRIVEIN_SCREEN = (kit, set) => {
  const { THREE, stage, keep, clamp, lerp, ease, rng } = kit;
  const S = set.SCREEN, SW = S.w, SH = S.h;
  const FW = 640, FH = 360;                                           // a photo's canvas: the screen's shape
  const SERIF = '"Playfair Display", "Times New Roman", "Noto Serif", Georgia, serif';
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const PINK = '#ff6f91', GOLD = '#ffc56b', CREAM = '#f1e6d6';
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const sharp = t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };   // mipmapped: smooth when small, blurred in a puddle

  /* ── the screen itself: the canvas face, its steel frame, the posts and the tower's skirt ── */
  const root = new THREE.Group(); root.name = 'screen'; root.position.set(0, S.y0 + SH / 2, S.z); stage.add(root);
  const steel = keep(new THREE.MeshStandardMaterial({ color: '#2a2532', roughness: .55, metalness: .5 })); steel.envMap = set.env; steel.envMapIntensity = .6;
  const fabricTex = kit.canvasTexture(256, 144, (c, w, h) => {
    c.fillStyle = CREAM; c.fillRect(0, 0, w, h); const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(5);
    for (let i = 0; i < 2600; i++) { c.fillStyle = r() < .5 ? 'rgba(120,100,80,.05)' : 'rgba(255,255,255,.06)'; c.fillRect(r() * w, r() * h, 1.5, 1.5); }
    c.strokeStyle = 'rgba(120,100,80,.06)'; for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }   // its panels
  });
  const faceMat = keep(new THREE.MeshStandardMaterial({ map: fabricTex, color: '#6a6470', roughness: 1, emissive: CREAM, emissiveMap: fabricTex, emissiveIntensity: 0 }));   // grey in the dark; the projector's white is its glow
  const face = new THREE.Mesh(keep(new THREE.PlaneGeometry(SW, SH)), faceMat); face.receiveShadow = true; root.add(face);
  const frame = new THREE.Mesh(keep(new THREE.BoxGeometry(SW + .05, SH + .05, .022)), steel); frame.position.z = -.0125; frame.castShadow = true; root.add(frame);
  const groundY = -(S.y0 + SH / 2);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(keep(new THREE.BoxGeometry(.026, S.y0 + SH * .7, .026)), steel); post.position.set(s * SW * .33, groundY + (S.y0 + SH * .7) / 2, -.04); post.castShadow = true; root.add(post);
    const brace = new THREE.Mesh(keep(new THREE.BoxGeometry(.01, .36, .01)), steel); brace.position.set(s * SW * .33, groundY + .2, -.1); brace.rotation.x = .55; root.add(brace);
  }
  const skirtTex = kit.canvasTexture(1024, 140, (c, w, h) => {
    c.fillStyle = '#251a33'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.04)'; for (let x = 0; x < w; x += 46) c.fillRect(x, 0, 3, h);
    c.fillStyle = '#e0475c'; c.fillRect(0, 0, w, 10); c.fillStyle = GOLD; c.font = `900 54px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('★  RẠP NGOÀI TRỜI  ·  CHỈ HAI CHỖ  ★', w / 2, h / 2 + 8);
  });
  const skirt = new THREE.Mesh(keep(new THREE.PlaneGeometry(SW * .86, S.y0 - .01)), keep(new THREE.MeshStandardMaterial({ map: skirtTex, roughness: .9, emissive: 0xffffff, emissiveMap: skirtTex, emissiveIntensity: .25 })));
  skirt.position.set(0, groundY + (S.y0 - .01) / 2, -.03); root.add(skirt);

  /* ── the layers projected on it ── */
  const layer = (m, z, order, w = SW, h = SH) => {
    const p = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, h)), m); p.position.z = z; p.renderOrder = order; p.raycast = () => {}; root.add(p); return p;
  };
  const basic = o => keep(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false, ...o }));
  const shotA = layer(basic({}), .001, 10), shotB = layer(basic({}), .0015, 11);
  const card = layer(basic({}), .002, 12);
  const leaderMat = basic({}), leader = layer(leaderMat, .0022, 13);
  const sweepMat = keep(new THREE.ShaderMaterial({
    uniforms: { uSweep: { value: 0 }, uK: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uSweep, uK; varying vec2 vUv;
      void main() { vec2 p = vUv - 0.5; float r = length(p); if (r > 0.5) discard;
        float a = atan(p.x, p.y); a = a < 0.0 ? a + 6.28318 : a; float s = uSweep * 6.28318;
        float fill = a < s ? 0.42 : 0.0; float edge = smoothstep(0.05, 0.0, abs(a - s)) * 0.6;
        gl_FragColor = vec4(vec3(0.08, 0.06, 0.1) * fill + vec3(1.0) * edge, (fill + edge) * uK); }`,
    transparent: true, depthWrite: false
  }));
  const sweep = layer(sweepMat, .0024, 14, SH * .72, SH * .72);
  const barMat = keep(new THREE.MeshBasicMaterial({ color: '#000000', toneMapped: false }));
  const BAR = .115;                                                   // each bar's share of the picture's height
  const bars = [1, -1].map(s => { const b = layer(barMat, .003, 15, SW, SH * BAR); b.userData.s = s; b.visible = false; return b; });
  const subCanvas = canvas(1024, 112), subTex = sharp(keep(new THREE.CanvasTexture(subCanvas)));
  const SUB_W = SW * .68;                                             // over the picture's foot, clear of the stand and the sign in front
  const subtitle = layer(basic({ map: subTex }), .0034, 16, SUB_W, SUB_W * 112 / 1024);
  subtitle.position.y = -SH / 2 + SH * BAR + SUB_W * 112 / 1024 / 2 + .03;
  const capCanvas = canvas(1024, 256), capTex = sharp(keep(new THREE.CanvasTexture(capCanvas)));
  const caption = layer(basic({ map: capTex }), .0034, 16, SW * .86, SW * .86 / 4);
  caption.position.y = -SH * .22;
  const noise = canvas(128, 128); (c => { const d = c.createImageData(128, 128); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } c.putImageData(d, 0, 0); })(noise.getContext('2d'));
  const grainTex = keep(new THREE.CanvasTexture(noise)); grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping; grainTex.repeat.set(5, 2.8);
  const grainMat = basic({ map: grainTex, blending: THREE.AdditiveBlending }), grain = layer(grainMat, .004, 17);
  const vignetteTex = kit.canvasTexture(256, 144, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, h * .35, w / 2, h / 2, w * .62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const vignette = layer(basic({ map: vignetteTex }), .0042, 18);
  const flashMat = basic({ color: '#fffaf0' }), flash = layer(flashMat, .0045, 19);
  const clockHand = new THREE.Group(); clockHand.position.set(SW * .25, -SH * .06, .0026); root.add(clockHand);
  const handMat = basic({ color: '#ffc56b' });
  const hand = new THREE.Mesh(keep(new THREE.PlaneGeometry(.008, SH * .2)), handMat); hand.position.y = SH * .085; hand.renderOrder = 14; hand.raycast = () => {}; clockHand.add(hand);
  const haloTex = kit.canvasTexture(128, 128, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, w * .2, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.6, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
  const haloMat = keep(new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const halo = new THREE.Mesh(keep(new THREE.PlaneGeometry(SW * 1.5, SH * 1.75)), haloMat); halo.position.z = -.03; halo.renderOrder = 0;   // after the sky (order -1), or the sky paints over it halo.raycast = () => {}; root.add(halo);

  /* ── the light the screen throws on the lot: aimed at the car, each photo's colour ── */
  const light = new THREE.SpotLight(0xffffff, 0, 1.9, .95, .85, 1.1);
  light.position.set(0, -.04, .3); root.add(light); stage.add(light.target); light.target.position.set(0, .1, .06);
  const glow = new THREE.Color('#ffffff');                            // what the screen shows, on average, now (for the story's lights)

  /* ── the reel: the buyer's pictures (kit.photoAt, in this play's order), each drawn once for the screen ── */
  const reel = (() => {
    const cache = new WeakMap();                                      // picture -> what compose() made of it
    let shown = null;                                                 // the picture on the screen now, for a tap
    const tapZone = new THREE.Group(); tapZone.visible = false; root.add(tapZone);   // out of sight when no photo is on: the tap plays on
    const zone = new THREE.Mesh(keep(new THREE.PlaneGeometry(SW, SH)), keep(new THREE.MeshBasicMaterial()));
    zone.visible = false; zone.userData.proxy = true; zone.position.z = .008; tapZone.add(zone);
    kit.onTap(zone, () => (shown ? { photo: shown } : null));
    const drawn = pic => { if (!pic) return null; if (!cache.has(pic)) cache.set(pic, compose(pic)); return cache.get(pic); };
    return {
      count: () => kit.photoCount(),
      /** each frame: draw one picture that is not drawn yet, so ten never stall a frame */
      tick() { for (let j = 0, n = kit.photoCount(); j < n; j++) { const p = kit.photoAt(j); if (p && !cache.has(p)) { drawn(p); break; } } },
      /** place j's picture, drawn for the screen */
      at(j) { return kit.photoCount() ? drawn(kit.photoAt(j)) : blank; },
      hero() { const p = kit.heroPhoto(); return p ? drawn(p) : this.at(0); },
      /** what a tap on the screen opens: place j, the first photo (-1), or nothing (null) */
      target(j) { shown = j === null || !kit.photoCount() ? null : j === -1 ? kit.heroPhoto() : kit.photoAt(j); tapZone.visible = !!shown; }
    };
  })();

  /** a picture drawn once for the 16:9 screen: { tex: [two textures on one image], color, level, aspect } */
  function compose(img) {
    const c = canvas(FW, FH), x = c.getContext('2d'), a = img.width / img.height;
    if (a >= 1.6) {                                                   // wide: it fills the screen, cut where faces are not
      const k = Math.max(FW / img.width, FH / img.height), w = img.width * k, h = img.height * k;
      x.drawImage(img, (FW - w) / 2, (FH - h) * .35, w, h);
    } else {                                                          // any other: whole, over itself blurred
      const t1 = canvas(64, 36), t2 = canvas(16, 9), k = Math.max(64 / img.width, 36 / img.height);
      t1.getContext('2d').drawImage(img, (64 - img.width * k) / 2, (36 - img.height * k) / 2, img.width * k, img.height * k);
      t2.getContext('2d').drawImage(t1, 0, 0, 16, 9);
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(t2, -FW * .05, -FH * .05, FW * 1.1, FH * 1.1); x.globalAlpha = .5; x.drawImage(t1, -FW * .05, -FH * .05, FW * 1.1, FH * 1.1); x.globalAlpha = 1;
      x.fillStyle = 'rgba(12,8,20,.38)'; x.fillRect(0, 0, FW, FH);
      const h = FH, w = Math.min(FW, h * a);
      x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 26; x.drawImage(img, (FW - w) / 2, (FH - h) / 2, w, h); x.restore();
    }
    let color = new THREE.Color('#fff1dc'), level = .8;
    try {                                                             // its average colour, from a tiny copy
      const t = canvas(6, 6), tx = t.getContext('2d'); tx.drawImage(c, 0, 0, 6, 6);
      const d = tx.getImageData(0, 0, 6, 6).data; let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4; color = new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
      level = clamp(.45 + (.3 * r + .59 * g + .11 * b) / n / 255, .5, 1.1);
      const top = Math.max(color.r, color.g, color.b, 1e-3); color.multiplyScalar(1 / top).lerp(new THREE.Color('#ffffff'), .35);   // its hue, bright
    } catch (e) { /* a canvas we may not read: warm white */ }
    const t0 = sharp(keep(new THREE.CanvasTexture(c))), t1 = keep(t0.clone()); t1.needsUpdate = true;
    return { tex: [t0, t1], color, level, aspect: a, canvas: c };
  }
  const blank = (() => {                                              // no photo at all: a heart on plum, so the film still plays
    const c = canvas(FW, FH), x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, FW, FH); g.addColorStop(0, '#3a2550'); g.addColorStop(1, '#1d1328');
    x.fillStyle = g; x.fillRect(0, 0, FW, FH); x.fillStyle = PINK; kit.heartPath(x, FW / 2, FH * .54, FH * .55); x.fill();
    const t0 = sharp(keep(new THREE.CanvasTexture(c))), t1 = keep(t0.clone()); t1.needsUpdate = true;
    return { tex: [t0, t1], color: new THREE.Color('#ffb3c8'), level: .8, aspect: 16 / 9, canvas: c };
  })();

  /* ── shots: where a texture's window is at progress p of a move ── */
  const MOVES = [                                                     // [zoom from, zoom to, focus x from, to, focus y from, to]
    [1, 1.12, .5, .5, .62, .6], [1.13, 1.02, .42, .5, .58, .55], [1.1, 1.1, .32, .68, .56, .56], [1.02, 1.15, .66, .62, .6, .64],
    [1.14, 1.04, .58, .46, .62, .52], [1, 1.1, .38, .42, .5, .62]];
  function frameShot(tex, move, p) {
    const m = MOVES[((move % MOVES.length) + MOVES.length) % MOVES.length], e = ease.inOut(clamp(p)) * .7 + clamp(p) * .3;
    const z = lerp(m[0], m[1], e), fx = lerp(m[2], m[3], e), fy = lerp(m[4], m[5], e);
    tex.repeat.set(1 / z, 1 / z); tex.offset.set(fx * (1 - 1 / z), fy * (1 - 1 / z));
  }

  /** the main film at ft seconds in: the shots to show, dissolving one into the next; every photo comes once a round */
  function film(ft, n = reel.count()) {
    const per = clamp(15.2 / Math.max(1, n), 1.6, 2), mix = .45, i = Math.max(0, Math.floor(ft / per)), into = ft - i * per;
    const shot = (j, k) => ({ j, move: j + Math.floor(j / Math.max(1, n)) * 2, p: (ft - j * per + mix) / (per + mix), k });   // p runs on through its dissolves
    const shots = [shot(i, 1)];
    if (into > per - mix) shots.push(shot(i + 1, ease.smooth((into - per + mix) / mix)));
    return shots;
  }

  /* ── the words on the screen: drawn when they change ── */
  let subNow = null, capNow = null;
  function subtitleAt(text) {
    if (text === subNow) return; subNow = text;
    const c = subCanvas.getContext('2d'); c.clearRect(0, 0, 1024, 112);
    if (!text) { subTex.needsUpdate = true; return; }
    c.textAlign = 'center'; c.textBaseline = 'middle'; let size = 64;
    for (; size > 26; size -= 2) { c.font = `600 ${size}px ${SANS}`; if (c.measureText(text).width < 980) break; }
    c.lineJoin = 'round'; c.lineWidth = size * .2; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(text, 512, 58);
    c.fillStyle = '#fff6c8'; c.fillText(text, 512, 58); subTex.needsUpdate = true;
  }
  function captionAt(text) {
    if (text === capNow) return; capNow = text;
    const c = capCanvas.getContext('2d'); c.clearRect(0, 0, 1024, 256);
    if (text) {                                                       // a dark band behind, the letters outlined: readable over any photo
      const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(8,4,12,0)'); g.addColorStop(.22, 'rgba(8,4,12,.62)'); g.addColorStop(.78, 'rgba(8,4,12,.62)'); g.addColorStop(1, 'rgba(8,4,12,0)');
      c.fillStyle = g; c.fillRect(0, 0, 1024, 256);
      const say = text.toLocaleUpperCase('vi');
      c.strokeStyle = 'rgba(8,4,12,.9)'; c.lineWidth = 10; c.lineJoin = 'round'; c.fillStyle = 'rgba(0,0,0,0)';
      kit.fitText(c, say, { x: 40, y: 24, w: 944, h: 208 }, { maxLines: 2, max: 88, font: SERIF, weight: 900 });   // sizes the font; the outline under the fill
      const font = c.font, size = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
      const lines = []; let line = ''; for (const w of say.split(/\s+/)) { const next = line ? `${line} ${w}` : w; if (c.measureText(next).width <= 944 || !line) line = next; else { lines.push(line); line = w; } }
      if (line) lines.push(line);
      const lh = size * 1.22, top = 128 - lh * (lines.length - 1) / 2;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      lines.forEach((l, i) => c.strokeText(l, 512, top + i * lh));
      c.fillStyle = '#fff6e0'; lines.forEach((l, i) => c.fillText(l, 512, top + i * lh));
    }
    capTex.needsUpdate = true;
  }

  /* ── the cards: canvases drawn once (again when the fonts or the first photo come) ── */
  const title = kit.words('title', 'Chuyện Hai Đứa Mình'), ending = kit.words('ending', 'Còn tiếp… mãi mãi');
  const backdropDark = (c, w, h, tint = '#1a1024') => {
    c.fillStyle = tint; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h * .45, 20, w / 2, h / 2, w * .7); g.addColorStop(0, 'rgba(255,200,150,.14)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  };
  const cards = {
    soon: (c, w, h) => {
      backdropDark(c, w, h);
      c.fillStyle = GOLD; c.font = `900 54px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.save(); c.letterSpacing = '14px'; c.fillText('SẮP CHIẾU', w / 2 + 7, h * .2); c.restore();
      c.strokeStyle = GOLD; c.lineWidth = 3; c.beginPath(); c.moveTo(w * .3, h * .3); c.lineTo(w * .7, h * .3); c.stroke();
      c.fillStyle = '#fff4e2'; kit.fitText(c, title, { x: 70, y: h * .34, w: w - 140, h: h * .42 }, { maxLines: 2, max: 130, font: SERIF, weight: 900 });
      c.fillStyle = 'rgba(255,197,107,.85)'; c.font = `700 30px ${SANS}`; c.fillText('★  Một bộ phim của hai người  ★', w / 2, h * .86);
    },
    title: (c, w, h) => {
      backdropDark(c, w, h, '#120b1a');
      c.fillStyle = PINK; c.font = `900 40px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♥', w / 2, h * .17);
      c.fillStyle = '#fff4e2'; kit.fitText(c, title, { x: 70, y: h * .24, w: w - 140, h: h * .44 }, { maxLines: 2, max: 140, font: SERIF, weight: 900 });
      c.fillStyle = GOLD; c.font = `800 34px ${SANS}`; c.save(); c.letterSpacing = '8px'; c.fillText('CHIẾU NGAY SAU ĐÂY', w / 2 + 4, h * .8); c.restore();
    },
    break: (c, w, h) => {
      backdropDark(c, w, h, '#2a1236');
      c.fillStyle = '#ffe9c4'; c.textAlign = 'center'; c.textBaseline = 'middle';
      kit.fitText(c, 'GIẢI LAO', { x: 40, y: h * .2, w: w * .5, h: h * .34 }, { maxLines: 1, max: 150, font: SERIF, weight: 900 });
      c.fillStyle = GOLD; c.font = `700 32px ${SANS}`; c.fillText('Mời hai bạn ra quầy bắp ♥', w * .29, h * .66);
      const cx = w * .75, cy = h * .44, r = h * .3;                     // the clock's face; its hand is a mesh
      c.fillStyle = '#fff4e2'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.strokeStyle = '#e0475c'; c.lineWidth = 12; c.stroke();
      c.fillStyle = '#3a2540'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.fillRect(cx + Math.sin(a) * r * .8 - 4, cy - Math.cos(a) * r * .8 - 12, 8, 24); }
      c.font = `900 40px ${SERIF}`; c.fillText('10', cx, cy - r * .5); c.fillStyle = '#e0475c'; c.beginPath(); c.arc(cx, cy, 10, 0, 7); c.fill();
      c.fillStyle = '#fff4e2'; c.font = `800 30px ${SANS}`; c.fillText('PHÚT', cx, cy + r + 34);
    },
    end: (c, w, h) => {
      c.fillStyle = '#07050a'; c.fillRect(0, 0, w, h);
      const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * .6); g.addColorStop(0, 'rgba(255,230,190,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff4e2'; kit.fitText(c, 'HẾT', { x: 80, y: h * .2, w: w - 160, h: h * .6 }, { maxLines: 1, max: 230, font: SERIF, weight: 900 });
    },
    more: (c, w, h) => {
      const e = reel.hero();
      if (e) c.drawImage(e.canvas, 0, 0, w, h); else { c.fillStyle = '#2a1236'; c.fillRect(0, 0, w, h); }
      const hs = h * .9, hx = w / 2, hy = h * .58;
      c.save(); c.fillStyle = 'rgba(16,6,20,.58)'; c.beginPath(); c.rect(0, 0, w, h);   // dark round the heart, the photo in it
      kit.heartPath(c, hx, hy, hs); c.fill('evenodd'); c.restore();
      c.save(); c.shadowColor = PINK; c.shadowBlur = 30; c.strokeStyle = PINK; c.lineWidth = 12; kit.heartPath(c, hx, hy, hs); c.stroke(); c.restore();
      c.save(); c.strokeStyle = '#fff4e2'; c.lineWidth = 3; c.setLineDash([10, 12]); kit.heartPath(c, hx, hy, hs * .93); c.stroke(); c.restore();
      c.fillStyle = 'rgba(10,4,14,.6)'; c.fillRect(0, 0, w, h * .17);  // the closing words along the top, clear of anything in front
      c.save(); c.shadowColor = 'rgba(255,111,145,.9)'; c.shadowBlur = 16; c.fillStyle = '#ffd3df';
      kit.fitText(c, ending.toLocaleUpperCase('vi'), { x: 60, y: h * .01, w: w - 120, h: h * .15 }, { maxLines: 1, max: 66, font: SERIF, weight: 900 }); c.restore();
    },
    leader: n => (c, w, h) => {
      c.fillStyle = '#7a7280'; c.fillRect(0, 0, w, h);
      const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * .62); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#f6f0ea'; c.lineWidth = 6; for (const r of [h * .36, h * .3]) { c.beginPath(); c.arc(w / 2, h / 2, r, 0, 7); c.stroke(); }
      c.lineWidth = 3; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (n > 0) { c.fillStyle = '#121014'; c.font = `900 ${Math.round(h * .5)}px ${SERIF}`; c.lineWidth = 10; c.strokeStyle = '#f6f0ea'; c.strokeText(String(n), w / 2, h / 2 + h * .02); c.fillText(String(n), w / 2, h / 2 + h * .02); }
      else { c.fillStyle = PINK; kit.heartPath(c, w / 2, h / 2 + h * .03, h * .42); c.fill(); c.lineWidth = 8; c.strokeStyle = '#fff4e2'; c.stroke(); }
    }
  };
  const cardTex = new Map();
  const paintCard = (key, tex) => { const c = tex.image.getContext('2d'); c.clearRect(0, 0, tex.image.width, tex.image.height); (key.startsWith('leader') ? cards.leader(+key.slice(6)) : cards[key])(c, tex.image.width, tex.image.height); tex.needsUpdate = true; };
  function cardOf(key) {
    if (!cardTex.has(key)) {
      const draw = key.startsWith('leader') ? cards.leader(+key.slice(6)) : cards[key];
      cardTex.set(key, kit.canvasTexture(key.startsWith('leader') ? 512 : 1024, key.startsWith('leader') ? 288 : 576, draw));
    }
    return cardTex.get(key);
  }
  let moreHero = null;
  (window.NM_DRIVEIN_FONTS || Promise.resolve()).then(() => { cardTex.forEach((t, k) => paintCard(k, t)); const s = subNow, cp = capNow; subNow = capNow = null; subtitleAt(s); captionAt(cp); });

  /* ── the puddles: the screen's picture upside down, rippled, in each ── */
  const puddleMats = set.puddles.map((m, i) => {
    const p = set.PUDDLES[i], u0 = clamp(.5 + p.x / SW * 1.3, .2, .8);
    const mat = keep(new THREE.ShaderMaterial({
      uniforms: { uMap: { value: blank.tex[0] }, uXform: { value: new THREE.Matrix3() }, uK: { value: 0 }, uT: { value: 0 }, uRain: { value: 0 }, uU: { value: u0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D uMap; uniform mat3 uXform; uniform float uK, uT, uRain, uU; varying vec2 vUv;
        void main() { vec2 q = vUv - 0.5; float edge = 1.0 - smoothstep(0.28, 0.5, length(q * vec2(1.0, 1.1)) + 0.03 * sin(atan(q.y, q.x) * 3.0 + 1.0));
          vec2 rip = vec2(sin(vUv.y * 26.0 + uT * 4.0), cos(vUv.x * 21.0 - uT * 3.0)) * (0.003 + 0.008 * uRain);
          vec2 st = vec2(uU + (vUv.x - 0.5) * 0.55, 0.9 - vUv.y * 0.7) + rip;
          vec3 pic = texture2D(uMap, (uXform * vec3(st, 1.0)).xy, 2.5).rgb;   // blurred, the way water blurs it
          vec3 water = vec3(0.05, 0.035, 0.08);
          float sheen = 0.55 + 0.45 * smoothstep(0.0, 0.5, 1.0 - length(q) * 1.6);
          vec3 c = mix(water, pic * 0.8, 0.78 * sheen) + vec3(0.05) * smoothstep(0.96, 1.0, sin(vUv.x * 18.0 + vUv.y * 9.0 + uT * 1.3));
          gl_FragColor = vec4(c, edge * uK); }`,
      transparent: true, depthWrite: false
    }));
    m.material = mat; return mat;
  });

  /* ── one frame of what is projected ── */
  const cT = new THREE.Color(), WHITE = new THREE.Color('#ffffff');
  /** state: { power (0 dark … 1 the projector's white), leader: { n, sweep, k }, card: { key, k }, shots: [{ j, move, p, k }],
      hero (the shots show the first photo), bars, sub, cap (words), flash, puddles, rain, T, dt } */
  function show(st) {
    const T = st.T || 0;
    reel.tick();
    const power = st.power ?? 0, flick = 1 - .035 * (Math.sin(T * 61) * Math.sin(T * 23.7) + .5 * Math.sin(T * 97)) * (power > .1 ? 1 : 0);
    faceMat.emissiveIntensity = .9 * power;
    /* the photos: up to two shots, dissolving */
    let lead = null, color = new THREE.Color(0, 0, 0), level = 0, sum = 0;
    [shotA, shotB].forEach((plane, i) => {
      const s = (st.shots || [])[i], e = s ? (st.hero ? reel.hero() : reel.at(s.j)) : null;
      plane.visible = !!(s && e && s.k > .002);
      if (!plane.visible) return;
      const tex = e.tex[i]; if (!plane.material.map) plane.material.needsUpdate = true; plane.material.map = tex; frameShot(tex, s.move, s.p); tex.updateMatrix();
      plane.material.opacity = s.k * (st.shotK ?? 1); plane.material.color.setScalar(flick);
      if (!lead || s.k > lead.k) lead = { s, e, tex };
      color.add(cT.copy(e.color).multiplyScalar(s.k)); level += e.level * s.k; sum += s.k;
    });
    /* the cards and the leader */
    const ck = st.card ? st.card.k : 0;
    card.visible = ck > .002; if (card.visible) { const t = cardOf(st.card.key); if (card.material.map !== t) { if (!card.material.map) card.material.needsUpdate = true; card.material.map = t; } card.material.opacity = ck; card.material.color.setScalar(flick); }
    const lk = st.leader ? st.leader.k : 0;
    leader.visible = sweep.visible = lk > .002;
    if (leader.visible) { const t = cardOf(`leader${st.leader.n}`); if (leaderMat.map !== t) { if (!leaderMat.map) leaderMat.needsUpdate = true; leaderMat.map = t; } leaderMat.opacity = lk; sweepMat.uniforms.uSweep.value = st.leader.sweep; sweepMat.uniforms.uK.value = lk; }
    const clockK = st.card && st.card.key === 'break' ? ck : 0;
    clockHand.visible = clockK > .01; handMat.opacity = clockK; clockHand.rotation.z = -T * .9;
    /* bars, words, grain, the vignette, a flash */
    const bk = clamp(st.bars ?? 0);
    bars.forEach(b => { b.visible = bk > .002; b.scale.y = Math.max(.001, bk); b.position.y = b.userData.s * (SH / 2 - SH * BAR * bk / 2); });
    subtitleAt(st.sub || ''); subtitle.material.opacity = st.sub ? clamp(st.subK ?? 1) : 0; subtitle.visible = !!st.sub;
    captionAt(st.cap || ''); caption.material.opacity = st.cap ? clamp(st.capK ?? 1) : 0; caption.visible = !!st.cap;
    const lit = Math.max(power, ck, lk, sum);
    grainMat.opacity = .05 + .05 * lk + .04 * (st.card && st.card.key === 'end' ? ck : 0); grain.visible = lit > .05;
    grainTex.offset.set(rng(), rng());
    vignette.material.opacity = .55 * Math.min(1, lit);
    flashMat.opacity = clamp(st.flash ?? 0); flash.visible = flashMat.opacity > .002;
    /* what it shows on average: the photos' colour, the cards' cream, white light */
    if (sum > 0) { color.multiplyScalar(1 / sum); level /= sum; }
    const cardCol = st.card && st.card.key === 'more' && reel.hero() ? reel.hero().color : new THREE.Color(st.card && st.card.key === 'break' ? '#ffb38a' : '#ffe6c8');
    glow.setRGB(0, 0, 0).add(color.multiplyScalar(sum)).add(cT.copy(cardCol).multiplyScalar(ck * .6 + lk * .5)).add(cT.setRGB(1, .96, .9).multiplyScalar(power * (1 - Math.min(1, sum + ck + lk))));
    const bright = Math.min(1.2, sum * level + ck * .55 + lk * .5 + power * .7 * (1 - Math.min(1, sum + ck + lk)) + (st.flash ?? 0));
    light.color.copy(glow).lerp(WHITE, .18); light.intensity = 3.1 * bright * flick;
    haloMat.color.copy(glow); haloMat.opacity = .16 * bright;
    /* the puddles */
    const pk = st.puddles ?? 0;
    set.puddles.forEach((m, i) => {
      m.visible = pk > .01; const u = puddleMats[i].uniforms; u.uK.value = pk; u.uT.value = T; u.uRain.value = st.rain ?? 0;
      const tex = lead ? lead.tex : (card.visible ? card.material.map : blank.tex[0]);
      if (u.uMap.value !== tex) u.uMap.value = tex;
      if (tex.matrixAutoUpdate) tex.updateMatrix(); u.uXform.value.copy(tex.matrix);
    });
    /* the tap target: the photo on it now */
    const want = st.hero && sum > .3 ? -1 : st.card && st.card.key === 'more' && ck > .5 ? -1 : lead && sum > .3 ? lead.s.j : null;
    reel.target(want);
    if (st.card && st.card.key === 'more' && reel.hero() !== moreHero && reel.hero()) { moreHero = reel.hero(); if (cardTex.has('more')) paintCard('more', cardTex.get('more')); }
  }

  return { root, face, reel, film, show, light, glow, SW, SH };
};
