/* Dạo biển hoàng hôn (a sunset walk on the beach), told by the shared act _acts/lovestory.js; the beach itself (sky, sea,
   sand, palm, shells, crabs, gulls, the stick and the bottle) is built by scenery.js, loaded first. Three chapters, each
   ending at a stop:
     1 · 0–6.2 s     the sky folds up like a pop-up page, the sea flows in, the palm springs up; she leads him along the
                     waterline by the hand, footprints pressing into the sand behind them; a big wave runs up the beach,
                     they hop away from it hand in hand and laugh, and a note with the card's first words (note1) comes up
     2 · 6.2–12.8 s  he picks up a driftwood stick and draws a glowing heart in the sand; a bottle bobs in and a wave rolls
                     it to her feet; she picks it up, the cork pops and the card's photo flies out of it, unrolling into a
                     polaroid with its caption (caption)
     3 · 12.8–19 s   they sit side by side facing the sea as the sun goes down and dusk comes; she traces a heart in the air,
                     sparkles rise off the sun's path on the water into a heart round the setting sun, she leans on his
                     shoulder, he puts his arm round her, and a banner with the last words (note2) rises
   Everything is a function of g, the story's clock (it holds still at a stop), so any chapter can be played on its own;
   the lapping waves, the gulls and the twinkling go by T, the act's own time. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, tween, ease, seg, clamp, lerp, rng, words } = kit;
  const TAU = Math.PI * 2, R = Math.PI / 2;                          // R: facing +x, the way they walk in
  const PAGE = { width: 1.1, height: .78, curve: .08, z: -.3 };      // the painted sky, standing at the card's back edge
  const HORIZON = .2;                                                // where the far sea meets the sky on it
  const SUN = { x: .06, r: .052 };
  const BACK = -.3125, SHORE = -.165;                                // the card's back edge; where the water rests
  const DECAL = .0024;                                               // marks on the sand, a hair above it
  const HEART = { x: -.11, z: .17, w: .085 };                        // the heart he draws in the sand (w: half its width)
  const STICK = { x: -.314, z: .081, len: .2 };                      // a driftwood branch, its grip end where PickUp's hand comes down
  const BOTTLE = { x: .16, z: -.06 };                                // where the wave leaves the bottle: PickUp's reach from her spot
  const SEAT = { boy: [-.04, -.01, Math.PI - .2], girl: [.08, -.02, -Math.PI + .2] };   // sitting on the sand, facing the sunset
  const PHOTO_AT = [-.17, .33, -.07], PHOTO_ASIDE = [.4, .3, -.18];
  /** the story's big waves: the one they hop away from, the one that brings the bottle */
  const SURGES = [{ at: 3.7, peak: 4.45, end: 5.8, reach: .15, x: -.15, wide: .75 }, { at: 8.6, peak: 9.3, end: 10.8, reach: .12, x: .17, wide: .32 }];
  const S = window.NM_BEACH.scenery(kit, { PAGE, HORIZON, SUN, BACK, SHORE, DECAL, STICK, SURGES });
  const { heartXY, seeded, V3, mat, geo, pageZ } = S;
  const rand = seeded(817);                                          // the beach's own seed: the same stars and sparkles every time
  const bump = (g, a, b, c, d) => ease.smooth(seg(g, a, b)) * (1 - ease.smooth(seg(g, c, d)));
  const SUNSET_LIGHT = { hemi: new THREE.Color('#ffd9c2'), ground: new THREE.Color('#9a7184'), sun: new THREE.Color('#ffc08a') };
  const DUSK_LIGHT = { hemi: new THREE.Color('#b9a8ea'), ground: new THREE.Color('#6e5080'), sun: new THREE.Color('#ff9f8c') };
  let boy, girl, hat, flower, page, palm, shells, crabs;
  let stick, bottle, cork, scroll, groove, glowLine, heartFill, prints, glints, note, banner, photo, splash, hearts, sparks, stars, particles;

  /* ── the pose a character holds at story time g: which clip ── */
  const BOY = [                                                      // [from g, clip, options]
    [0, 'Idle'], [.6, 'Walking_A', { speed: .9, fade: .25 }], [3.55, 'Idle', { fade: .15 }], [3.62, 'Jump_Full_Short', { once: true, fade: .1 }],
    [4.75, 'Idle', { fade: .3 }], [6.3, 'Walking_A', { speed: 1.6, fade: .2 }], [7.05, 'Idle', { fade: .15 }], [7.1, 'PickUp', { once: true, fade: .15 }],
    [8.4, 'Idle', { fade: .3 }], [13.05, 'Walking_A', { speed: 1.75, fade: .25 }], [14.6, 'Idle', { fade: .2 }],
    [14.7, 'Sit_Floor_Down', { once: true, fade: .2 }], [15.7, 'Sit_Floor_Idle', { fade: .3 }]
  ];
  const GIRL = [
    [0, 'Idle'], [.6, 'Walking_A', { speed: .9, fade: .25 }], [3.55, 'Idle', { fade: .15 }], [3.62, 'Jump_Full_Short', { once: true, fade: .1 }],
    [4.55, 'Cheer', { once: true, fade: .2 }], [6.15, 'Idle', { fade: .35 }], [8.5, 'Walking_A', { speed: 1.45, fade: .2 }],
    [9.9, 'Idle', { fade: .15 }], [9.95, 'PickUp', { once: true, fade: .15 }], [11.25, 'Idle', { fade: .3 }],
    [13.5, 'Walking_A', { speed: .9, fade: .2 }], [14.1, 'Idle', { fade: .2 }], [14.8, 'Sit_Floor_Down', { once: true, fade: .2 }],
    [15.8, 'Sit_Floor_Idle', { fade: .3 }]
  ];
  const clipAt = (list, g) => { let c = list[0]; for (const x of list) if (g >= x[0]) c = x; return c; };

  /* where each of them is: [from g, x, z, facing, ease into it]; a walk goes in, then at its pace, then out */
  const BOY_WAY = [
    [0, -.41, -.03, R], [.6, -.41, -.03, R], [.9, -.397, -.03, R, 'in'], [3.25, -.176, -.03, R, 'linear'], [3.55, -.16, -.03, R, 'out'],
    [3.8, -.16, -.03, 0], [3.95, -.16, -.03, 0], [4.32, -.16, .07, 0], [5.05, -.16, .07, 0], [5.4, -.16, .07, .25],
    [6.2, -.16, .07, .25], [6.4, -.17, .077, -1.95], [7.05, -.26, .13, -R], [8.3, -.26, .13, -R], [8.6, -.26, .13, R],
    [10.5, -.26, .13, R], [10.85, -.26, .13, .55], [13.05, -.26, .13, .55], [13.3, -.24, .115, 2.14], [14.4, -.055, .0, 2.14, 'linear'],
    [14.6, ...SEAT.boy]
  ];
  const GIRL_WAY = [
    [0, -.29, -.075, R], [.6, -.29, -.075, R], [.9, -.277, -.075, R, 'in'], [3.25, -.056, -.075, R, 'linear'], [3.55, -.04, -.075, R, 'out'],
    [3.8, -.04, -.075, 0], [3.95, -.04, -.075, 0], [4.32, -.04, .025, 0], [5.05, -.04, .025, 0], [5.4, -.04, .025, -.25],
    [6.2, -.04, .025, -.25], [6.6, -.04, .025, -.9], [7.95, -.04, .025, -.9], [8.2, -.04, .025, -.1], [8.5, -.04, .025, -.1], [8.75, -.025, .01, 2.33], [9.7, .09, -.095, 2.33, 'linear'],
    [9.9, .106, -.109, R], [11.25, .106, -.109, R], [11.6, .106, -.109, -.45], [13.3, .106, -.109, -.45], [13.55, .1, -.095, -.3],
    [14.1, .08, -.025, -.3], [14.7, ...SEAT.girl]
  ];
  const keysOf = way => [1, 2, 3].map(i => way.map(k => [k[0], k[i], k[4] || 'smooth']));   // x, z and facing, each as tween keys
  const BOY_KEYS = keysOf(BOY_WAY), GIRL_KEYS = keysOf(GIRL_WAY);
  const wayAt = (keys, g) => keys.map(k => tween(g, k));

  /* ── summer clothes: the palette texture's swatches recoloured, some parts moved onto the skin swatch ── */
  const cell = (cx, cy) => ({ cx, cy });
  /** moves the UV islands of `mesh` that sit in swatch `from` onto swatch `to` (a sleeve onto skin: a bare arm); `above`
      keeps to the triangles higher than that in the model's own units (a strap, not the belt in the same leather) */
  function remap(mesh, from, to, above = -Infinity) {
    const uv = mesh?.geometry?.attributes.uv, pos = mesh?.geometry?.attributes.position; if (!uv) return;
    const idx = mesh.geometry.index, n = idx ? idx.count : uv.count, move = new Set();
    for (let i = 0; i < n; i += 3) {                                   // which corners first, then move them: moving as we go
      const v = [0, 1, 2].map(k => (idx ? idx.getX(i + k) : i + k));   // would take the next triangle's centre out of the swatch
      const u0 = (uv.getX(v[0]) + uv.getX(v[1]) + uv.getX(v[2])) / 3, v0 = (uv.getY(v[0]) + uv.getY(v[1]) + uv.getY(v[2])) / 3;
      if (Math.floor(u0 * 8) !== from.cx || Math.floor(v0 * 4) !== from.cy) continue;
      if ((pos.getY(v[0]) + pos.getY(v[1]) + pos.getY(v[2])) / 3 > above) v.forEach(j => move.add(j));
    }
    move.forEach(j => uv.setXY(j, uv.getX(j) + (to.cx - from.cx) / 8, uv.getY(j) + (to.cy - from.cy) / 4));
    uv.needsUpdate = true;
  }
  /** the palette with swatches recoloured: each keeps its own shading, scaled onto the new colour */
  function repaint(m, part, colours) {
    const material = m.node(part)?.material, img = material?.map?.image;
    if (!img || !img.width) return;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
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
  function dressBoy() {                                              // an aqua beach shirt, navy trousers rolled up, bare feet
    const skin = cell(0, 0);
    for (const arm of ['Barbarian_ArmLeft', 'Barbarian_ArmRight']) [cell(7, 2), cell(6, 0), cell(3, 0)].forEach(c => remap(boy.node(arm), c, skin));
    for (const leg of ['Barbarian_LegLeft', 'Barbarian_LegRight']) { remap(boy.node(leg), cell(3, 2), skin); remap(boy.node(leg), cell(6, 0), cell(7, 1)); }
    remap(boy.node('Barbarian_Body'), cell(6, 0), cell(0, 1), .78);  // the strap across his chest: the shirt now
    repaint(boy, 'Barbarian_Body', { '1,0': '#6b4128', '0,1': '#27b5b0', '1,1': '#1f9e9f', '7,0': '#1f9e9f', '7,1': '#34507f',
      '2,1': '#fffaf0', '6,0': '#a0673c', '3,0': '#e9c46a' });         // the beard and brows brown: a young man, not a grey one
  }
  function dressGirl() {                                             // a coral sundress with a white collar and sash, bare arms and legs
    const skin = cell(0, 0);
    for (const arm of ['Rogue_ArmLeft', 'Rogue_ArmRight']) { remap(girl.node(arm), cell(5, 2), skin); remap(girl.node(arm), cell(5, 0), skin); }
    for (const leg of ['Rogue_LegLeft', 'Rogue_LegRight']) remap(girl.node(leg), cell(7, 1), skin);
    repaint(girl, 'Rogue_Body', { '0,1': '#ff6f7d', '1,1': '#fff6ea', '7,1': '#ff6f7d', '6,0': '#ff6f7d', '5,0': '#fff6ea', '3,2': '#fff1e0', '3,0': '#f2c14e' });
  }
  /* a straw sun hat with a coral band (model units: it sits on his head bone) */
  function makeHat() {
    const g = new THREE.Group(), straw = mat(0xf0cf86, { roughness: .85 }), under = mat(0xc99a52, { roughness: .9 }), band = mat(0xff6f7d, { roughness: .6 });
    const crown = new THREE.Mesh(geo(new THREE.CylinderGeometry(.36, .43, .3, 28)), straw); crown.position.y = .15;
    const top = new THREE.Mesh(geo(new THREE.SphereGeometry(.36, 28, 10, 0, TAU, 0, Math.PI / 2).scale(1, .32, 1)), straw); top.position.y = .3;
    const brim = new THREE.Mesh(geo(new THREE.CylinderGeometry(.62, .64, .035, 40)), [straw, straw, under]);
    const ribbon = new THREE.Mesh(geo(new THREE.CylinderGeometry(.435, .44, .09, 28)), band); ribbon.position.y = .055;
    for (const x of [crown, top, brim, ribbon]) { x.castShadow = true; g.add(x); }
    return g;
  }
  /* a hibiscus behind her ear: five petals round a red heart and a yellow stamen (model units, on her head bone) */
  function makeFlower() {
    const g = new THREE.Group(), petal = mat(0xfff4f6, { roughness: .6, side: THREE.DoubleSide, emissive: 0xffd0dc, emissiveIntensity: .15 });
    const pg = geo(new THREE.SphereGeometry(.16, 12, 8).scale(1, .22, .7).translate(.15, 0, 0));
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(pg, petal); p.rotation.y = i * TAU / 5; p.rotation.z = .25; g.add(p); }
    const mid = new THREE.Mesh(geo(new THREE.SphereGeometry(.07, 10, 8)), mat(0xe8436d)); mid.position.y = .02; g.add(mid);
    const st = new THREE.Mesh(geo(new THREE.CylinderGeometry(.012, .012, .2, 6)), mat(0xffd34d)); st.position.y = .1; st.rotation.z = -.3; g.add(st);
    return g;
  }

  /* each crab's way: [from g, x, z], always sideways; and when it lifts its claws (a wave, a clap) */
  const CRAB_WAYS = [
    [[0, .3, .17], [1.3, .3, .17], [2.4, .1, .2], [3.55, .1, .2], [4.4, .29, .17], [8.7, .29, .17], [9.7, .07, .25], [13.2, .07, .25], [14.4, .22, .03]],
    [[0, .62, .05], [15, .62, .05], [16.3, .26, .02]]
  ];
  const CRAB_KEYS = CRAB_WAYS.map(way => [1, 2].map(i => way.map(k => [k[0], k[i]])));
  const CRAB_CHEERS = [[2.45, 3.2], [10.5, 11.1], [16.4, 16.9], [17.6, 18.1]];
  /* the first stars of the evening, one after another as the sky darkens */
  const STAR_KEYS = Array.from({ length: 26 }, (_, i) => `star${i}`);
  const STARS = Array.from({ length: 26 }, (_, i) => { const x = (rand() - .5) * 1.02; return { x, y: .43 + rand() * .32, z: pageZ(x) + .02 + .02 * rand(),
    color: ['#ffffff', '#fff2c4', '#cfe0ff'][i % 3], size: .012 + rand() * .014, life: 1e6, shape: i % 3 ? 'glow' : 'star', twinkle: 1.5 + rand() * 3 }; });

  /* ── the heart in the sand: a groove that appears behind the stick's tip, and a gold glow along it ── */
  const GN = 120;
  const HS = [0, 0];
  /** a point of the heart on the sand, the near lobe first; fills `out` (no garbage) */
  function heartOnSand(t, out = HS) { const h = heartXY(-t); out[0] = HEART.x + h[0] * HEART.w; out[1] = HEART.z - h[1] * HEART.w; return out; }
  function makeGroove() {
    const ribbon = (w, y) => {                                       // a band along the heart, drawn up to wherever the tip is
      const pos = [], uv = [], idx = [];
      for (let i = 0; i <= GN; i++) {
        const t = i / GN * TAU, [x, z] = heartOnSand(t), [x2, z2] = heartOnSand(t + .01), dx = x2 - x, dz = z2 - z, l = Math.hypot(dx, dz) || 1;
        pos.push(x - dz / l * w, y, z + dx / l * w, x + dz / l * w, y, z - dx / l * w); uv.push(i / GN, 0, i / GN, 1);
        if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = new THREE.BufferGeometry(); g.setIndex(idx);
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      return geo(g);
    };
    const across = kit.canvasTexture(4, 64, (c, w, h) => {           // a hollow: a pale lip, a shadowed groove, a pale lip
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,246,226,0)'); g.addColorStop(.16, 'rgba(255,246,226,.9)'); g.addColorStop(.36, 'rgba(128,78,40,.95)');
      g.addColorStop(.64, 'rgba(104,62,32,.95)'); g.addColorStop(.84, 'rgba(255,246,226,.85)'); g.addColorStop(1, 'rgba(255,246,226,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    groove = new THREE.Mesh(ribbon(.0105, DECAL + .0004), kit.keep(new THREE.MeshBasicMaterial({ map: across, transparent: true, depthWrite: false, side: THREE.DoubleSide })));
    const soft = kit.canvasTexture(4, 64, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    glowLine = new THREE.Mesh(ribbon(.028, DECAL + .0008), kit.keep(new THREE.MeshBasicMaterial({ map: soft, color: 0xffc35a, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })));
    const inside = kit.canvasTexture(256, 256, (c, w) => {            // the finished heart glows from inside
      c.beginPath(); for (let i = 0; i <= 64; i++) { const [x, y] = heartXY(i / 64 * TAU); c[i ? 'lineTo' : 'moveTo'](w / 2 + x * 100, w / 2 - y * 100); }
      const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, 110); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(1, 'rgba(255,190,90,.25)');
      c.fillStyle = gr; c.shadowColor = 'rgba(255,210,130,1)'; c.shadowBlur = 18; c.fill();
    });
    heartFill = new THREE.Mesh(geo(new THREE.PlaneGeometry(2.56 * HEART.w, 2.56 * HEART.w).rotateX(-Math.PI / 2)), kit.keep(new THREE.MeshBasicMaterial({ map: inside,
      color: 0xffb860, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
    heartFill.position.set(HEART.x, DECAL + .0006, HEART.z);
    stage.add(heartFill, groove, glowLine);
  }

  /* ── footprints: little hollows where a foot comes down; a big wave smooths the ones it reaches away ── */
  function makePrints() {
    const list = [];
    for (const [who, clips, keys, foot] of [['boy', BOY, BOY_KEYS, .016], ['girl', GIRL, GIRL_KEYS, .013]]) {
      clips.forEach(([at, clip, o], i) => {
        if (clip !== 'Walking_A') return;
        const end = clips[i + 1] ? clips[i + 1][0] : at + 1, step = .535 / (o?.speed || 1);
        for (let t = at + step * .7, side = 1; t < end + .05; t += step, side = -side) {
          const [x, z, f] = wayAt(keys, t);
          if (Math.abs(x) > .48 || Math.abs(z) > .29) continue;
          list.push({ who, at: t + .08, x: x + Math.cos(f) * foot * side, z: z - Math.sin(f) * foot * side, f, side });
        }
      });
    }
    for (const [x, z] of [[-.16, .07], [-.04, .025]]) for (const side of [-1, 1]) list.push({ who: x < -.1 ? 'boy' : 'girl', at: 4.34, x: x + side * .018, z: z + .006, f: 0, side, land: true });
    for (const p of list) {                                          // when a wave first covers it
      p.gone = 1e9;                                                   // not Infinity: seg(g, Infinity, Infinity + .4) is NaN
      for (const s of SURGES) for (let g = s.at; g < s.peak + .01; g += .02) if (g > p.at && SHORE + .006 + S.surgeAt(p.x, g, s) > p.z) { p.gone = Math.min(p.gone, g); break; }
    }
    const shape = kit.canvasTexture(64, 128, (c, w, h) => {          // a bare foot: a sole and five toes, as a soft hollow
      c.fillStyle = 'rgba(255,255,255,1)'; c.shadowColor = 'rgba(255,255,255,1)'; c.shadowBlur = 6;
      c.beginPath(); c.ellipse(w * .52, h * .62, w * .22, h * .27, .08, 0, TAU); c.fill();
      for (const [x, y, r] of [[.38, .22, .1], [.53, .19, .075], [.64, .22, .062], [.73, .27, .055], [.79, .33, .05]]) { c.beginPath(); c.arc(w * x, h * y, w * r, 0, TAU); c.fill(); }
    });
    const n = list.length, mesh = kit.keep(new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), kit.keep(new THREE.ShaderMaterial({
      uniforms: { map: { value: shape }, tint: { value: new THREE.Color('#7a5232') }, light: { value: 1 } },
      vertexShader: `attribute float aAlpha; varying float vA; varying vec2 vUv;
        void main() { vUv = uv; vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 tint; uniform float light; varying float vA; varying vec2 vUv;
        void main() { float a = texture2D(map, vUv).a * vA; if (a < .01) discard; gl_FragColor = vec4(tint * light, a); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide          // a left foot is a right one mirrored
    })), n));
    mesh.geometry.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    list.forEach((p, i) => {
      const len = p.who === 'boy' ? .03 : .025;
      m4.compose(V3(p.x, DECAL + .0002, p.z), q.setFromEuler(e.set(0, p.f, 0)), V3(len * .55 * p.side, 1, -len));   // -len: toes forward
      mesh.setMatrixAt(i, m4);
    });
    mesh.frustumCulled = false; stage.add(mesh);
    return { mesh, list };
  }

  /* ── glints: the sparkles that rise off the sun's path and gather into a heart round the setting sun ── */
  const GLINTS = 46;
  function makeGlints() {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(GLINTS * 3), alpha = new Float32Array(GLINTS), size = new Float32Array(GLINTS);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    const tex = kit.canvasTexture(64, 64, (c, w) => {
      const s = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); s.addColorStop(0, 'rgba(255,250,220,1)'); s.addColorStop(.3, 'rgba(255,214,140,.55)'); s.addColorStop(1, 'rgba(255,170,120,0)');
      c.fillStyle = s; c.fillRect(0, 0, w, w); c.fillStyle = '#fffaf0';
      c.beginPath(); c.moveTo(w / 2, 2); c.quadraticCurveTo(w * .54, w * .46, w - 2, w / 2); c.quadraticCurveTo(w * .54, w * .54, w / 2, w - 2);
      c.quadraticCurveTo(w * .46, w * .54, 2, w / 2); c.quadraticCurveTo(w * .46, w * .46, w / 2, 2); c.fill();
    });
    const m = kit.keep(new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, halfH: { value: 400 } },
      vertexShader: `attribute float aAlpha, aSize; uniform float halfH; varying float vA;
        void main() { vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = aAlpha <= 0.0 ? 0.0 : aSize * projectionMatrix[1][1] * halfH / max(.001, -mv.z); }`,
      fragmentShader: `uniform sampler2D map; varying float vA;
        void main() { vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(t.rgb, t.a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    const pts = new THREE.Points(geo(g), m); pts.frustumCulled = false; pts.renderOrder = 6;
    const v2 = new THREE.Vector2();
    pts.onBeforeRender = r => { r.getDrawingBufferSize(v2); m.uniforms.halfH.value = v2.y / 2; };
    const list = Array.from({ length: GLINTS }, (_, i) => {
      const t = i / GLINTS * TAU, [hx, hy] = heartXY(t);
      return { hx, hy, x0: SUN.x + (rand() - .5) * .09, z0: -.17 - rand() * .1, delay: rand() * .7, ph: rand() * TAU, size: .022 + rand() * .012 };
    });
    stage.add(pts);
    return { pts, list, pos, alpha, size };
  }

  /* ── where things are in someone's hands ── */
  const mStage = new THREE.Matrix4(), qInv = new THREE.Quaternion(), vShoulder = new THREE.Vector3(), vTmp = new THREE.Vector3();
  const vMeet = new THREE.Vector3(), vTip = new THREE.Vector3(), vHand = new THREE.Vector3(), vHand2 = new THREE.Vector3(), vDir = new THREE.Vector3();
  const vGrip = new THREE.Vector3(), vFrom = new THREE.Vector3(), vAim = new THREE.Vector3(), vCenter = new THREE.Vector3();
  const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qC = new THREE.Quaternion(), UP = V3(0, 1, 0), Z = V3(0, 0, 1);
  const STAFF_TIP = V3(-.276, .002, .198), STICK_DOWN = V3(.9, 0, -.3).normalize();   // where he leans on it; the way it lies once he lets go (on the card)
  const STICK_REST = V3(STICK.x, .0035, STICK.z), qStickRest = new THREE.Quaternion().setFromUnitVectors(UP, V3(-.63, 0, .78).normalize());   // lying on the sand
  /** a bone's place on the stage */
  const at = (m, bone, out) => { const b = m.node(bone); b.updateWorldMatrix(true, false); return out.setFromMatrixPosition(b.matrixWorld).applyMatrix4(mStage); };
  /** the way from a shoulder to a point on the stage, in that character's own space: what aim() wants */
  const D = [0, 0, 0], U = [0, 0, 0];                                  // directions handed to aim(), filled in place: no garbage every frame
  const toward = (m, side, target) => { at(m, `upperarm.${side}`, vShoulder); vShoulder.subVectors(target, vShoulder).applyQuaternion(qInv.copy(m.root.quaternion).invert()); return vShoulder.toArray(D); };
  /** an arm reaching for a point: the upper arm a little below the line, the forearm along it */
  function reach(m, side, target, k) {
    if (k <= 0) return;
    const d = toward(m, side, target); U[0] = d[0]; U[1] = d[1] - .25 * Math.hypot(d[0], d[2]); U[2] = d[2];
    m.aim(`upperarm.${side}`, U, k); m.aim(`lowerarm.${side}`, d, k);
  }
  /** a direction in a character's own space, on the stage */
  const own = (m, x, y, z, out) => out.set(x, y, z).normalize().applyQuaternion(m.root.quaternion);

  return {
    seconds: [6.2, 6.6, 6.2],

    build() {
      /* the two of them: the Barbarian bare-headed in a straw hat, the Rogue in a sundress with a flower */
      boy = kit.model('boy').fit({ height: .3 }); girl = kit.model('girl').fit({ height: .288 });   // bare-headed, they stand eye to eye
      stage.add(boy.root, girl.root);
      dressBoy(); dressGirl();
      hat = makeHat(); boy.node('head')?.add(hat); hat.position.set(0, .7, .02); hat.rotation.x = -.26;
      flower = makeFlower(); girl.node('head')?.add(flower); flower.position.set(.41, .6, .08); flower.scale.setScalar(.8); flower.rotation.set(.3, 0, -1.25);

      /* the beach */
      page = S.makePage(); stage.add(page.root);
      S.makeSand(); S.makeSea();
      palm = S.makePalm(); palm.root.position.set(-.44, 0, -.17); palm.root.rotation.y = Math.PI - .35; stage.add(palm.root);
      shells = S.makeShells();
      crabs = [S.makeCrab('#e8553b'), S.makeCrab('#ff7f8a')];
      S.makeGulls();
      makeGroove();
      prints = makePrints();
      stick = S.makeStick();
      bottle = S.makeBottle(); cork = bottle.cork; scroll = bottle.roll;
      glints = makeGlints();

      /* the card's words and photo */
      note = kit.sign({ text: words('note1', 'Đi cùng em đến cuối bờ biển'), width: .4, aspect: .56, paper: '#fffaf0', ink: '#1f4a6e', accent: '#ff8a7a', glow: .45 });
      banner = kit.sign({ text: words('note2', 'Mỗi hoàng hôn đều muốn có em!'), style: 'banner', width: .62, accent: '#ff6f7d', paper: '#fffaf0', glow: .6 });
      photo = kit.polaroid({ width: .22, caption: words('caption', 'Biển, hoàng hôn và em'), glow: .5, halo: true, haloColor: 0xffd9a0 });
      for (const p of [note, banner, photo]) { p.root.traverse(o => { o.castShadow = false; }); stage.add(p.root); }   // the light is behind: paper in the air would shadow the sand

      /* particles */
      splash = kit.particles({ max: 120 });
      hearts = kit.particles({ max: 140 });
      sparks = kit.particles({ max: 320, additive: true });
      stars = kit.particles({ max: 60, additive: true });
      particles = [splash, hearts, sparks, stars];
      stage.add(splash.root, hearts.root, sparks.root, stars.root);
    },

    reset() {
      for (const x of particles) x.clear();
      boy.stop(); girl.stop();
    },

    pose({ g, T, dt, held }) {
      stage.updateWorldMatrix(true, false); mStage.copy(stage.matrixWorld).invert();
      const night = ease.inOut(seg(g, 13.6, 17.6));

      /* light: a low sun behind them on the left throws long shadows across the card (not off its front edge); dusk comes */
      const L = kit.lights, elev = lerp(.74, .6, night);                     // about 42 degrees high at sunset, 34 at dusk
      L.hemi.color.copy(SUNSET_LIGHT.hemi).lerp(DUSK_LIGHT.hemi, night); L.hemi.groundColor.copy(SUNSET_LIGHT.ground).lerp(DUSK_LIGHT.ground, night);
      L.hemi.intensity = lerp(1.15, .78, night); L.sun.color.copy(SUNSET_LIGHT.sun).lerp(DUSK_LIGHT.sun, night); L.sun.intensity = lerp(1.6, .7, night);
      L.sun.position.set(-.951 * Math.cos(elev) * 1.5, .1 + Math.sin(elev) * 1.5, -.31 * Math.cos(elev) * 1.5);

      /* the page folds up, the sun goes down behind the sea, dusk paints over the sunset */
      const fold = ease.inOut(seg(g, .05, .75)), wob = g > .75 ? Math.exp(-6 * (g - .75)) * Math.sin(14 * (g - .75)) : 0;
      const { dusk, sun, sunGlow, sea } = page;
      page.root.rotation.x = R * (1 - fold) - .1 * wob;
      dusk.material.opacity = night;
      const sy = lerp(.31, .195, ease.inOut(seg(g, 13.6, 18.2)));
      sun.position.y = sy; sunGlow.position.y = sy;
      sun.material.color.setRGB(1, lerp(1, .78, night), lerp(1, .62, night));
      sunGlow.material.opacity = lerp(.8, .5, night) * (1 + .04 * Math.sin(T * 2)) * fold * fold;   // a sprite: it would shine through the page lying flat
      sunGlow.material.color.setRGB(1, lerp(.82, .62, night), lerp(.55, .5, night));
      sea.material.color.setRGB(lerp(1, .66, night), lerp(1, .6, night), lerp(1, .78, night));

      /* the sea, the palm, the shells, the gulls */
      S.poseSea(g, T, night);
      const grow = ease.elastic(seg(g, .35, 1.25));
      palm.root.scale.set(Math.max(.001, lerp(.6, 1, grow)), Math.max(.001, grow), Math.max(.001, lerp(.6, 1, grow)));
      palm.sway.rotation.z = .025 * Math.sin(T * 1.1) + .2 * (1 - seg(g, .35, 1.3)) * Math.sin(g * 12);
      palm.fronds.forEach((f, i) => { f.rotation.z = .08 * Math.sin(T * 1.7 + i) + .12 * night * Math.sin(T * .9 + i * 2); });
      shells.forEach(({ m, s, at: t0 }) => m.scale.setScalar(Math.max(.0001, s * ease.back(seg(g, t0, t0 + .35)))));
      S.poseGulls(T, (1 - night) * clamp(g - 1));                       // in once the page is up, home as dusk comes

      /* the sweethearts: where they are, which way they look, which clip */
      const [bx, bz, br] = wayAt(BOY_KEYS, g), [gx, gz, gr] = wayAt(GIRL_KEYS, g);
      boy.root.position.set(bx, 0, bz); boy.root.rotation.y = br; girl.root.position.set(gx, 0, gz); girl.root.rotation.y = gr;
      const bc = clipAt(BOY, g), gc = clipAt(GIRL, g);
      boy.play(bc[1], bc[2]); girl.play(gc[1], gc[2]);

      /* bodies first (spines and chests), so every reach below starts from the shoulders where they end up */
      const laugh = bump(g, 4.35, 4.5, 5.2, 5.5), ha = Math.sin(g * 26);
      const draw = ease.inOut(seg(g, 8.65, 10.45)), drawing = bump(g, 8.5, 8.7, 10.45, 10.7);
      const rest = ease.smooth(seg(g, 17.1, 17.6)), sway = .03 * Math.sin(T * 1.4) * seg(g, 17.6, 18.4);   // she rests on him; at the stop they rock
      if (laugh) boy.bend('chest', -.08 + .03 * ha, 0, 0, laugh);
      if (drawing) { boy.bend('spine', .18 * drawing, 0, 0); boy.bend('chest', .32 * drawing, 0, 0); }
      if (rest) girl.bend('chest', 0, 0, .12, rest);
      if (sway) { boy.bend('spine', 0, 0, sway); girl.bend('spine', 0, 0, sway); }

      /* chapter 1: hand in hand along the waterline (his left in her right), and through the hop */
      const hands = (g < 6.25 ? 1 : 1 - ease.smooth(seg(g, 6.25, 6.45))) * (1 - bump(g, 4.45, 4.6, 4.95, 5.15));
      if (hands > 0) {
        at(boy, 'upperarm.l', vMeet).add(at(girl, 'upperarm.r', vTmp)).multiplyScalar(.5); vMeet.y -= .045;
        reach(boy, 'l', vMeet, hands); reach(girl, 'r', vMeet, hands);
      }
      const wonder = bump(g, .05, .3, .55, .8);                         // the sky folding up over them: they look up at it
      if (wonder) { boy.bend('head', -.35 * wonder, .2 * Math.sin(g * 5), 0); girl.bend('head', -.35 * wonder, -.25 * Math.sin(g * 4), 0); }
      const lookBack = bump(g, 1.1, 1.5, 2.6, 3);                    // she leads him, turning to smile at him
      if (lookBack) girl.bend('head', 0, -.55, 0, lookBack);
      const startle = bump(g, 3.45, 3.55, 3.75, 3.9);                // the wave! both look at it
      if (startle) { girl.bend('head', 0, .7, 0, startle); boy.bend('head', 0, .5, 0, startle); }
      if (laugh) {
        boy.bend('head', -.2 + .07 * ha, 0, 0, laugh);
        boy.aim('upperarm.r', [-.5, .8, .2], laugh); boy.aim('lowerarm.r', [.6, .55, -.55], laugh);   // a hand to the back of his head
      }
      const tip = bump(g, 5.5, 5.9, 6.2, 6.45);                        // at the stop: heads tipped together
      if (tip) { boy.bend('head', 0, 0, -.1, tip); girl.bend('head', 0, 0, .14, tip); }
      if (g > 3.9 && g < 4.4 && kit.once('splash')) splash.burst(34, i => ({ x: -.13 + (rng() - .5) * .22, y: .008, z: -.07 + (rng() - .5) * .05, vx: (rng() - .5) * .2,
        vy: .25 + rng() * .25, vz: .05 + rng() * .1, gravity: -1.4, drag: .4, color: i % 3 ? '#e6fbff' : '#ffffff', size: .012 + rng() * .01, life: .8, shape: i % 4 ? 'glow' : 'drop', floor: .004 }));
      if (g > 4.6 && g < 5.2 && kit.once('giggle')) hearts.burst(12, () => ({ x: -.1 + (rng() - .5) * .1, y: .3, z: .05, vx: (rng() - .5) * .2, vy: .16 + rng() * .12,
        gravity: -.1, drag: .6, color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .024 + rng() * .016, life: 2.2, shape: 'heart', spin: (rng() - .5) * 3 }));
      const n1 = ease.back(seg(g, 5.15, 5.85)) * (1 - ease.in(seg(g, 6.25, 6.7)));
      note.root.scale.setScalar(Math.max(.001, n1));
      note.root.position.set(-.1, .48 + .1 * seg(g, 6.25, 6.7) + .008 * Math.sin(T * 1.6), -.02);
      note.root.rotation.set(-.12, 0, .035 * Math.sin(T * .9));

      /* footprints: each comes when its foot lifts, a wave smooths away those it covers */
      const pa = prints.mesh.geometry.attributes.aAlpha;
      prints.list.forEach((p, i) => { pa.array[i] = .62 * seg(g, p.at, p.at + .15) * (1 - seg(g, p.gone, p.gone + .4)); });
      pa.needsUpdate = true; prints.mesh.material.uniforms.light.value = lerp(1, .55, night);

      /* the crabs scuttle sideways, legs going; they wave their claws at what they see */
      crabs.forEach((c, i) => {
        const [kx, kz] = CRAB_KEYS[i], x = tween(g, kx), z = tween(g, kz), speed = Math.hypot(x - tween(g - .05, kx), z - tween(g - .05, kz)) / .05;
        let cheer = 0; for (const [a, b] of CRAB_CHEERS) cheer = Math.max(cheer, bump(g, a, a + .15, b - .15, b));
        c.pose(x, z, i ? .5 : -.3 + .25 * Math.sin(g * .7), i ? 1 : ease.back(seg(g, 1.05, 1.35)), clamp(speed * 12), cheer, T, i);   // the first digs itself out
        c.root.visible = i ? g > 14.9 : g > 1;
      });

      /* chapter 2: he picks up the stick and draws a heart in the sand */
      const [hx, hz] = heartOnSand(draw * TAU);
      vTip.set(hx, .002, hz);
      if (drawing) {
        boy.bend('head', .3 * drawing, -.5 * (hx - HEART.x) / HEART.w * drawing, 0);
        reach(boy, 'r', vTip, drawing);
      }
      const show = bump(g, 8.2, 8.35, 8.45, 8.65);                     // turning round, he holds it up to you like a wand
      if (show) { boy.aim('upperarm.r', [-.35, .75, .45], show); boy.aim('lowerarm.r', [-.1, .95, .3], show); }
      if (g > 8.42 && g < 8.8 && kit.once('wand')) { at(boy, 'handslot.r', vTmp); sparks.burst(14, () => ({ x: vTmp.x, y: vTmp.y + .08, z: vTmp.z, vx: (rng() - .5) * .2, vy: (rng() - .3) * .2,
        vz: (rng() - .5) * .2, drag: 2, color: ['#fff1b8', '#ffd1dc', '#ffffff'][(rng() * 3) | 0], size: .016 + rng() * .01, life: .7, shape: 'sparkle', spin: 4 })); }
      const planted = ease.smooth(seg(g, 8.5, 8.7)), staff = ease.smooth(seg(g, 10.45, 10.85)), fall = ease.in(seg(g, 13, 13.35));
      at(boy, 'handslot.r', vHand);
      if (g < 7.65) { stick.position.copy(STICK_REST); stick.quaternion.copy(qStickRest); }
      else {
        vTip.lerp(STAFF_TIP, staff);                                   // its tip on the sand: on the line he draws, then by his right foot
        own(boy, -.25, .55, .8, vDir);                                 // held up and forward
        if (planted > 0) vDir.lerp(vTmp.subVectors(vTip, vHand).normalize(), planted * (1 - fall)).normalize();
        vGrip.copy(vHand).lerp(vTmp.copy(vTip).addScaledVector(vDir, -STICK.len), planted);   // it slides in his hand to touch the sand
        if (fall > 0) { vDir.lerp(STICK_DOWN, fall).normalize(); vGrip.copy(vTip).addScaledVector(vDir, -STICK.len); vGrip.y = Math.max(vGrip.y, .0035); }   // let go, it topples
        const lift = ease.smooth(seg(g, 7.65, 7.95));                  // from the sand into his hand
        stick.position.copy(STICK_REST).lerp(vGrip, lift);
        stick.quaternion.copy(qStickRest).slerp(qA.setFromUnitVectors(UP, vDir), lift);
      }
      groove.geometry.setDrawRange(0, Math.floor(draw * GN) * 6);
      glowLine.geometry.setDrawRange(0, Math.floor(draw * GN) * 6);
      const flash = bump(g, 10.4, 10.55, 10.75, 11.5), done = ease.smooth(seg(g, 10.4, 11.1));
      glowLine.material.opacity = (.8 * drawing + .9 * flash + .45 * done) * (1 - .3 * night) * (1 + .1 * Math.sin(T * 3));
      heartFill.material.opacity = (.45 * done + .5 * flash) * (1 - .25 * night) * (1 + .12 * Math.sin(T * 2.2));
      if (drawing > .5 && dt && rng() < dt * 30) sparks.emit({ x: hx, y: .006, z: hz, vx: (rng() - .5) * .06, vy: .05 + rng() * .06, vz: (rng() - .5) * .06,
        drag: 1.5, color: rng() < .6 ? '#ffe7a3' : '#fff6dc', size: .012 + rng() * .008, life: .6, shape: 'sparkle', spin: 4 });
      if (g > 10.45 && g < 10.9 && kit.once('heart-done')) hearts.burst(9, i => { const [x, y] = heartXY(i / 9 * TAU); return { x: HEART.x + x * HEART.w, y: .01, z: HEART.z - y * HEART.w,
        vx: x * .04, vy: .22 + rng() * .1, gravity: -.05, drag: .6, color: ['#ff4f7b', '#ff8fab', '#ffd166'][i % 3], size: .016 + rng() * .008, life: 1.4, shape: 'heart', spin: (rng() - .5) * 3 }; });

      /* chapter 2: she notices the bottle, points, goes to it as a wave rolls it up the sand, picks it up */
      const notice = bump(g, 7.85, 8, 8.45, 8.6), point = bump(g, 8.1, 8.25, 8.5, 8.65);   // she sees the bottle, turns to the front and points it out
      if (notice) girl.bend('head', 0, .55, 0, notice);
      if (point) {
        const d = toward(girl, 'l', bottle.root.position), h = Math.hypot(d[0], d[2]);
        U[0] = d[0]; U[1] = d[1] + .5 * h; U[2] = d[2]; girl.aim('upperarm.l', U, point); d[1] += .3 * h; girl.aim('lowerarm.l', d, point);
      }
      const hold = bump(g, 11.3, 11.6, 14.3, 14.6);                   // both hands round it, at her chest (before her hands are read)
      if (hold) {
        girl.aim('upperarm.r', [-.15, -.35, .9], hold); girl.aim('lowerarm.r', [.45, .25, .85], hold);
        girl.aim('upperarm.l', [.15, -.35, .9], hold); girl.aim('lowerarm.l', [-.45, .25, .85], hold);
      }
      const bs = SURGES[1], ride = ease.out(seg(g, bs.at + .1, bs.peak));
      at(girl, 'handslot.r', vHand2);
      bottle.root.visible = g > 7;
      bottle.root.scale.setScalar(Math.max(.001, ease.out(seg(g, 7, 7.5))));
      /* afloat (bobbing, its neck up a little), rolled up the sand by the wave, lying there; then upright in her hands */
      const bob = 1 - ride, roll = 9 * ride;
      qA.setFromAxisAngle(UP, .5 + .3 * Math.sin(T * .9) * bob)
        .multiply(qB.setFromAxisAngle(Z, -R + (.3 + .12 * Math.sin(T * 1.7)) * bob)).multiply(qC.setFromAxisAngle(UP, roll));
      vFrom.set(lerp(.21, BOTTLE.x, ride), lerp(.009 + .003 * Math.sin(T * 2.2), .012, ride), lerp(lerp(-.28, -.2, seg(g, 7, 8.6)), BOTTLE.z, ride));
      const taken = ease.smooth(seg(g, 10.45, 10.65)), up = ease.smooth(seg(g, 11.3, 11.6)), down = ease.smooth(seg(g, 15.1, 15.35));
      vGrip.copy(vHand2);
      if (up > 0) { at(girl, 'handslot.l', vTmp); vGrip.lerp(vTmp.add(vHand2).multiplyScalar(.5), up); vGrip.y -= .015 * up; }   // between her hands
      vGrip.lerp(vTmp.set(.172, .001, -.031), down);                  // set down on the sand beside her as she sits
      bottle.root.position.copy(vFrom).lerp(vGrip, taken);
      qB.setFromAxisAngle(UP, gr).multiply(qC.setFromAxisAngle(Z, .12 * Math.sin(T * 1.4) * up * (1 - down)));
      bottle.root.quaternion.copy(qA).slerp(qB, taken);
      const pop = seg(g, 11.6, 12.25), neck = vTmp.set(0, .064, 0).applyQuaternion(bottle.root.quaternion).multiplyScalar(bottle.root.scale.x).add(bottle.root.position);
      if (g < 11.6) { cork.position.copy(neck); cork.quaternion.copy(bottle.root.quaternion); }   // in the bottle's neck, then it pops off onto the sand
      else { cork.position.set(lerp(neck.x, .2, pop), lerp(neck.y, .005, pop) + .32 * pop * (1 - pop), lerp(neck.z, -.02, pop)); cork.rotation.set(11 * pop, 0, 5 * pop + (pop >= 1 ? R : 0)); }
      cork.scale.setScalar(bottle.root.scale.x);
      if (g > 11.6 && g < 12 && kit.once('pop')) sparks.burst(22, () => ({ x: bottle.root.position.x, y: bottle.root.position.y + .065, z: bottle.root.position.z, vx: (rng() - .5) * .25,
        vy: .2 + rng() * .25, vz: (rng() - .5) * .2, gravity: -.3, drag: 1.4, color: ['#fff1b8', '#ffd1dc', '#ffffff'][(rng() * 3) | 0], size: .016 + rng() * .01, life: 1, shape: 'sparkle', spin: 4 }));
      scroll.visible = g < 11.7;

      /* the photo flies out of the bottle, unrolling into a polaroid; in the last chapter it moves aside */
      const rise = ease.out(seg(g, 11.7, 12.4)), unroll = ease.back(seg(g, 11.95, 12.5)), aside = ease.inOut(seg(g, 12.85, 13.6));
      const from = vFrom.copy(bottle.root.position); from.y += .05;
      const px = lerp(lerp(from.x, PHOTO_AT[0], rise), PHOTO_ASIDE[0], aside), py = lerp(lerp(from.y, PHOTO_AT[1], rise), PHOTO_ASIDE[1], aside);
      const pz = lerp(lerp(from.z, PHOTO_AT[2], rise), PHOTO_ASIDE[2], aside);
      const ps = g < 11.7 ? 0 : lerp(.2, 1, ease.out(seg(g, 11.7, 12.3))) * lerp(1, .5, aside);
      photo.root.position.set(px, py + .006 * Math.sin(T * 1.3), pz);
      photo.root.scale.set(Math.max(.001, ps * lerp(.08, 1, unroll)), Math.max(.001, ps), Math.max(.001, ps));
      photo.root.rotation.set(-.08, lerp(.25, -.3, aside) * rise + .06 * Math.sin(T * .8), .04 * Math.sin(T * .6));
      photo.halo.material.opacity = .55 * ease.out(seg(g, 12.2, 12.7)) * (1 - .5 * aside) * (1 + .08 * Math.sin(T * 3));
      if (g > 11.7 && g < 12.8 && dt && rng() < dt * 14) {
        const a = rng() * TAU, s = photo.root.scale.y;
        sparks.emit({ x: px + Math.cos(a) * .14 * s, y: py + .13 * s + Math.sin(a) * .15 * s, z: pz + .01, color: '#fff1b8', size: .018, life: .9, shape: 'sparkle', spin: 3 });
      }

      /* chapter 3: sitting side by side; she traces a heart in the air; the sparkles rise into a heart round the sun */
      const trace = bump(g, 15.95, 16.15, 16.9, 17.1), tt = ease.inOut(seg(g, 16.15, 16.9)) * TAU;
      if (trace) {
        const [ax, ay] = heartXY(tt);                                  // a little heart in the air out to her right, where you see it from behind
        const target = vAim.copy(girl.root.position).addScaledVector(own(girl, 1, 0, 0, vTmp), -.16 + ax * .04).addScaledVector(own(girl, 0, 0, 1, vTmp), .02);
        target.y = .15 + (ay - .18) * .045;
        reach(girl, 'r', target, trace);
        girl.bend('head', -.15 * trace, 0, 0);
        if (dt && g > 16.15 && g < 16.9) { const f = at(girl, 'handslot.r', vTmp); for (let i = 0; i < 2; i++) sparks.emit({ x: f.x + (rng() - .5) * .006, y: f.y + .01, z: f.z, vy: .01, color: i ? '#ffd1dc' : '#fff1b8', size: .022, life: 1.6, shape: 'sparkle', spin: 3 }); }
      }
      const center = vCenter.set(SUN.x, sy + .075, PAGE.z + .045), breathe = 1 + .035 * Math.sin(T * 2.4);
      glints.list.forEach((p, i) => {
        const k = ease.inOut(seg(g, 16.6 + p.delay, 17.7 + p.delay)), on = seg(g, 16.6 + p.delay, 16.8 + p.delay);
        const tx = center.x + p.hx * .12 * breathe, ty = center.y + (p.hy - .18) * .12 * breathe, tz = center.z;
        const cx = lerp(p.x0, tx, .3), cy = .34, cz = lerp(p.z0, tz, .6);
        const x = lerp(lerp(p.x0, cx, k), lerp(cx, tx, k), k), y = lerp(lerp(.01, cy, k), lerp(cy, ty, k), k), z = lerp(lerp(p.z0, cz, k), lerp(cz, tz, k), k);
        glints.pos[i * 3] = x; glints.pos[i * 3 + 1] = y; glints.pos[i * 3 + 2] = z;
        glints.alpha[i] = on * (.65 + .35 * Math.sin(T * 5 + p.ph)); glints.size[i] = p.size * (1 + .25 * Math.sin(T * 3 + p.ph));
      });
      const ga = glints.pts.geometry.attributes; ga.position.needsUpdate = ga.aAlpha.needsUpdate = ga.aSize.needsUpdate = true;
      if (g > 17.5 && g < 17.9 && kit.once('sky-heart')) sparks.burst(30, i => { const [x, y] = heartXY(i / 30 * TAU); return { x: center.x + x * .12, y: center.y + (y - .18) * .12, z: center.z + .01,
        vx: x * .06, vy: (y - .1) * .06, drag: 1.2, color: '#fff1c4', size: .02, life: 1.2, shape: 'glow' }; });

      /* she leans her head on his shoulder; his arm goes round her */
      const hug = ease.smooth(seg(g, 17.3, 17.9));
      if (rest) { girl.bend('head', 0, 0, .34, rest); boy.bend('head', 0, 0, -.12, rest); }
      if (hug) { boy.aim('upperarm.r', [-.85, .25, -.4], hug); boy.aim('lowerarm.r', [-.3, .1, -.95], hug); }

      /* the stars come out, the sun's path glitters, a banner with the last words rises */
      STARS.forEach((st, i) => { if (night > .25 + i * .026 && kit.once(STAR_KEYS[i])) stars.emit(st); });
      if (dt && rng() < dt * lerp(4, 14, night)) {                     // glitter on the sun's path: on the near water and the far sea
        const near = rng() < .55, k = rng();
        sparks.emit(near ? { x: SUN.x + (rng() - .5) * .1, y: .009, z: lerp(-.3, SHORE - .02, k), color: '#fff1c4', size: .01 + rng() * .01, life: .5 + rng() * .4, shape: 'sparkle', spin: 2 }
          : { x: SUN.x + (rng() - .5) * (.03 + .1 * k), y: lerp(HORIZON - .01, .01, k), z: PAGE.z + .012, color: '#ffe7a3', size: .008 + rng() * .008, life: .5 + rng() * .4, shape: 'sparkle', spin: 2 });
      }
      const b = ease.elastic(seg(g, 17.75, 18.75));
      banner.root.scale.setScalar(Math.max(.001, b));
      banner.root.position.set(.04, .655 + .006 * Math.sin(T * 1.5), .05);
      banner.root.rotation.set(-.1, 0, .02 * Math.sin(T * 1.1));
      if (g > 18 && g < 18.5 && kit.once('love')) hearts.burst(16, () => ({ x: .03 + (rng() - .5) * .08, y: .22, z: -.03, vx: (rng() - .5) * .15, vy: .12 + rng() * .1,
        gravity: -.05, drag: .6, color: ['#ff4f7b', '#ff8fab', '#ffc2d1'][(rng() * 3) | 0], size: .02 + rng() * .014, life: 2.4, shape: 'heart', spin: (rng() - .5) * 3 }));
      if (held && dt && g > 18.5 && rng() < dt * 1.2) hearts.emit({ x: .03 + (rng() - .5) * .1, y: .2, z: -.03, vy: .05, sway: .03, color: '#ff8fab', size: .018, life: 2.4, shape: 'heart' });

      for (const x of particles) x.update(dt, T);
    }
  };
};
