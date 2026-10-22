/* Sinh nhật Ông: the courtyard, built for story.js (template.json "story": ["set.js", "story.js"]).
   A Vietnamese family courtyard (sân nhà) late on a golden afternoon. Red-brick tiles on a low brick base; at the back the
   house's ochre wall with a window and open green shutters, a band of breeze blocks (hoa gió) and a fish-scale tiled eave,
   the sky behind it; on the left a pergola of bougainvillea with a birdcage hanging from it (a red-whiskered bulbul, chào
   mào); on the right a bonsai (cây cảnh) in a blue glazed pot on a porcelain stool, four little frames ready on its
   branches; in the middle Ông's rocking chair behind the low tea table (a teapot and cups on a tray, the photo album lying
   closed); at the front a cờ tướng board on a stool and a gift box. The last chapter's things wait hidden: a tray of
   peach-shaped longevity buns (bánh thọ đào), a small cake with candles, the first photo in a wooden frame on a spring in
   the gift box, paper lanterns, the banner between two balloons.
   window.NM_GRANDPA_SET(kit) builds it all and returns what the story moves. Units: card widths, +y up, the act faces +z
   (the card's bottom edge). m() turns metres into card widths at Ông's scale (1.75 m tall, fitted .311 card widths), so
   his chair and table are the sizes his clips sit at. */
window.NM_GRANDPA_SET = kit => {
  const { THREE, stage, keep, words, lerp } = kit;
  const OLD = .32 * .972, PER_M = OLD / 1.749, m = x => x * PER_M;
  const FLOOR = .014, SEAT = m(.39), SETTLE = m(.29), TABLE_H = .075;
  const CHAIR = { x: -.1, z: -.115, turn: .1 }, TABLE = { x: -.005, z: .085, turn: -.04 }, BONSAI = { x: .32, z: -.12 };
  const GIFT = { x: -.335, z: .2, turn: .28 }, CHESS = { x: .345, z: .195, turn: -.35 }, CAGE = { x: -.38, y: FLOOR + .405, z: -.06 };
  const WALL_Z = -.255, WIN = { x: .135, y: FLOOR + .225, w: .19, h: .18 };
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', SERIF = 'Georgia, "Times New Roman", "Noto Serif", serif';
  const seeded = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

  /* ── materials and shapes ── */
  const mats = new Map();
  const mat = (color, o = {}) => {
    const key = `${color}|${o.r ?? .8}|${o.m ?? 0}|${o.e ?? ''}|${o.ei ?? 1}|${o.flat ? 1 : 0}`;
    if (!mats.has(key)) {
      const x = keep(new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .8, metalness: o.m ?? 0, flatShading: !!o.flat,
        ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}) }));
      if (o.m) { x.envMap = kit.env; x.envMapIntensity = .8; }
      mats.set(key, x);
    }
    return mats.get(key);
  };
  const painted = (map, o = {}) => keep(new THREE.MeshStandardMaterial({ map, roughness: o.r ?? .85, side: o.side ?? THREE.FrontSide,
    ...(o.glow ? { emissive: 0xffffff, emissiveMap: map, emissiveIntensity: o.glow } : {}), ...(o.cut ? { alphaTest: .5 } : {}) }));
  const mesh = (geo, mm, at = [0, 0, 0], shadow = true) => { const x = new THREE.Mesh(geo, mm); x.position.set(...at); x.castShadow = shadow; x.receiveShadow = true; return x; };
  const box = (w, h, d, mm, at) => mesh(keep(new THREE.BoxGeometry(w, h, d)), mm, at);
  const cyl = (rt, rb, h, mm, at, seg = 16) => mesh(keep(new THREE.CylinderGeometry(rt, rb, h, seg)), mm, at);
  const ball = (r, mm, at, seg = 12) => mesh(keep(new THREE.SphereGeometry(r, seg, Math.max(6, seg * .75 | 0))), mm, at);
  const tex = (w, h, draw, o = {}) => {
    const t = kit.canvasTexture(w, h, draw);
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.repeat); }
    return t;
  };
  const group = (parent, at = [0, 0, 0], turn = 0) => { const g = new THREE.Group(); g.position.set(...at); g.rotation.y = turn; parent.add(g); return g; };
  /** a rod between two points: a chair's leg, a stool's, a string */
  const rod = (a, b, r, mm, seg = 8) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
    const x = mesh(keep(new THREE.CylinderGeometry(r, r, d.length(), seg)), mm);
    x.position.copy(A).add(B).multiplyScalar(.5); x.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return x;
  };
  /** a tube through points, its radius going from r0 at the first to r1 at the last: a trunk, a branch, a runner */
  function tube(points, r0, r1, mm, seg = 20, radial = 7) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const geo = keep(new THREE.TubeGeometry(curve, seg, r0, radial, false)), pos = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i <= seg; i++) {
      curve.getPointAt(i / seg, c); const k = 1 + (r1 / r0 - 1) * i / seg;
      for (let j = 0; j <= radial; j++) { const n = i * (radial + 1) + j; v.fromBufferAttribute(pos, n).sub(c).multiplyScalar(k).add(c); pos.setXYZ(n, v.x, v.y, v.z); }
    }
    return mesh(geo, mm);
  }
  const rounded = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };

  /* ── the courtyard: red-brick tiles (gạch tàu) on a low brick base ── */
  const tiles = tex(1024, 640, (c, w, h) => {
    const r = seeded(11), cols = 18, rows = 11, tw = w / cols, th = h / rows;
    c.fillStyle = '#c9b294'; c.fillRect(0, 0, w, h);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * tw + 2.5, y = j * th + 2.5, ww = tw - 5, hh = th - 5;
      c.fillStyle = `hsl(${(11 + r() * 9).toFixed(1)},${(48 + r() * 14).toFixed(1)}%,${(41 + r() * 11).toFixed(1)}%)`; c.fillRect(x, y, ww, hh);
      const gr = c.createRadialGradient(x + ww * (.25 + r() * .5), y + hh * (.25 + r() * .5), 1, x + ww / 2, y + hh / 2, ww * .75);
      gr.addColorStop(0, 'rgba(255,214,170,.22)'); gr.addColorStop(1, 'rgba(110,40,20,.16)'); c.fillStyle = gr; c.fillRect(x, y, ww, hh);
      for (let k = 0; k < 7; k++) {
        c.fillStyle = r() < .5 ? `rgba(90,30,15,${(.12 + r() * .18).toFixed(2)})` : `rgba(255,226,190,${(.12 + r() * .2).toFixed(2)})`;
        c.fillRect(x + r() * (ww - 4), y + r() * (hh - 4), 1.5 + r() * 3, 1.5 + r() * 3);
      }
    }
    c.strokeStyle = 'rgba(96,128,64,.4)'; c.lineWidth = 3;               // a little moss in the joints near the wall
    for (let k = 0; k < 40; k++) { const x = ((r() * cols) | 0) * tw, y = ((r() * 3) | 0) * th; c.beginPath(); c.moveTo(x, y + r() * th); c.lineTo(x, y + r() * th); c.stroke(); }
  });
  const brick = tex(512, 32, (c, w, h) => {
    const r = seeded(5); c.fillStyle = '#d9c7a8'; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 2; row++) for (let x = row ? -14 : 0; x < w; x += 28) { c.fillStyle = `hsl(${12 + r() * 8},${45 + r() * 10}%,${38 + r() * 10}%)`; c.fillRect(x + 1, row * 16 + 1, 26, 14); }
  }, { repeat: [3, 1] });
  const brickSide = painted(brick, { r: .9 });
  stage.add(box(.96, FLOOR, .6, [brickSide, brickSide, painted(tiles, { r: .88 }), brickSide, brickSide, brickSide], [0, FLOOR / 2, 0]));

  /* ── the house: an ochre wall, a window with open green shutters, breeze blocks, a tiled eave; the sky behind ── */
  const wallTex = tex(1024, 458, (c, w, h) => {
    const r = seeded(21);
    c.fillStyle = '#e8b45f'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 70; k++) {                                      // the lime-wash, uneven
      const x = r() * w, y = r() * h, rr = 30 + r() * 90, g = c.createRadialGradient(x, y, 0, x, y, rr), light = r() < .5;
      g.addColorStop(0, light ? 'rgba(255,226,160,.35)' : 'rgba(176,112,48,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    for (let k = 0; k < 9; k++) {                                       // rain streaks under the eave
      const x = r() * w, len = 40 + r() * 120, g = c.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, 'rgba(120,80,40,.22)'); g.addColorStop(1, 'rgba(120,80,40,0)'); c.fillStyle = g; c.fillRect(x, 0, 4 + r() * 10, len);
    }
    const dado = h * .8;                                                // a darker band at its foot
    c.fillStyle = '#c98b47'; c.fillRect(0, dado, w, h - dado);
    c.fillStyle = '#f6d9a0'; c.fillRect(0, dado - 6, w, 7); c.fillStyle = 'rgba(90,50,20,.3)'; c.fillRect(0, dado + 1, w, 3);
    c.strokeStyle = 'rgba(110,70,30,.35)'; c.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) { let x = r() * w, y = r() * dado; c.beginPath(); c.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (r() - .5) * 18; y += 6 + r() * 10; c.lineTo(x, y); } c.stroke(); }
  });
  const wallSide = mat('#d9a456', { r: .95 });
  stage.add(box(.96, .43, .03, [wallSide, wallSide, wallSide, wallSide,
    keep(new THREE.MeshStandardMaterial({ map: wallTex, roughness: .95, emissive: 0xffffff, emissiveMap: wallTex, emissiveIntensity: .12 })), wallSide], [0, FLOOR + .215, WALL_Z - .015]));
  const room = tex(256, 256, (c, w, h) => {                             // the room inside: dim, a cream curtain drawn aside
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2c1d13'); g.addColorStop(1, '#4a3020'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#5c4030'; c.fillRect(w * .55, h * .58, w * .4, h * .3);
    c.fillStyle = '#efe0c2'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w * .34, 0); c.quadraticCurveTo(w * .16, h * .5, w * .26, h); c.lineTo(0, h); c.fill();
    c.strokeStyle = 'rgba(150,120,90,.5)'; c.lineWidth = 3; for (let x = 14; x < w * .28; x += 16) { c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x * .55, h * .5, x * .8, h); c.stroke(); }
  });
  stage.add(mesh(keep(new THREE.PlaneGeometry(WIN.w, WIN.h)), keep(new THREE.MeshBasicMaterial({ map: room })), [WIN.x, WIN.y, WALL_Z + .001], false));
  const green = mat('#2f7d58', { r: .55 }), greenDark = mat('#245f43', { r: .6 }), iron = mat('#3a3330', { r: .4, m: .4 });
  for (const [w, h, x, y] of [[WIN.w + .024, .012, 0, WIN.h / 2 + .006], [WIN.w + .024, .012, 0, -WIN.h / 2 - .006], [.012, WIN.h, -WIN.w / 2 - .006, 0], [.012, WIN.h, WIN.w / 2 + .006, 0]])
    stage.add(box(w, h, .012, green, [WIN.x + x, WIN.y + y, WALL_Z + .006]));
  stage.add(box(WIN.w + .04, .01, .028, mat('#efd8ac', { r: .7 }), [WIN.x, WIN.y - WIN.h / 2 - .016, WALL_Z + .014]));
  for (let i = 1; i < 7; i++) stage.add(cyl(.0016, .0016, WIN.h, iron, [WIN.x - WIN.w / 2 + WIN.w * i / 7, WIN.y, WALL_Z + .004], 6));
  const louvre = tex(128, 256, (c, w, h) => {
    c.fillStyle = '#3f8f63'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2b6a48'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
    for (let y = 18; y < h - 14; y += 11) { c.fillStyle = '#2c6b49'; c.fillRect(14, y, w - 28, 4); c.fillStyle = '#6dbb8f'; c.fillRect(14, y + 4, w - 28, 2); }
    c.fillStyle = '#2b6a48'; c.fillRect(10, h / 2 - 5, w - 20, 10);
  });
  const shutter = painted(louvre, { r: .6 });
  for (const s of [-1, 1]) {                                           // hinged at the window's sides, opened back towards the wall
    const hinge = group(stage, [WIN.x + s * (WIN.w / 2 + .012), WIN.y - WIN.h / 2, WALL_Z + .008], s * (Math.PI - .42));
    hinge.add(box(WIN.w / 2, WIN.h, .006, [greenDark, greenDark, greenDark, greenDark, shutter, shutter], [-s * WIN.w / 4, WIN.h / 2, 0]));
  }
  const vent = tex(512, 128, (c, w, h) => {                            // breeze blocks: two rows of four-petalled holes
    c.fillStyle = '#efe4cc'; c.fillRect(0, 0, w, h); const s = h / 2;
    for (let j = 0; j < 2; j++) for (let i = 0; i < w / s; i++) {
      const x = i * s, y = j * s; c.fillStyle = '#4f3c2a';
      for (const [dx, dy] of [[.3, .3], [.7, .3], [.3, .7], [.7, .7]]) { c.beginPath(); c.arc(x + s * dx, y + s * dy, s * .17, 0, 7); c.fill(); }
      c.strokeStyle = '#c9b48e'; c.lineWidth = 4; c.strokeRect(x + 2, y + 2, s - 4, s - 4);
    }
  });
  stage.add(box(.25, .062, .008, [wallSide, wallSide, wallSide, wallSide, painted(vent, { r: .9 }), wallSide], [-.12, FLOOR + .372, WALL_Z + .004]));
  const roofTex = tex(1024, 96, (c, w, h) => {                         // fish-scale tiles (ngói vảy cá)
    const r = seeded(31); c.fillStyle = '#7a3420'; c.fillRect(0, 0, w, h);
    for (let row = 0, y = -6; y < h + 14; row++, y += 12) for (let x = (row % 2) * 11 - 11; x < w + 22; x += 22) {
      c.fillStyle = `hsl(${12 + r() * 8},${52 + r() * 10}%,${36 + r() * 12}%)`; c.beginPath(); c.arc(x, y, 11, 0, Math.PI); c.fill();
      c.strokeStyle = 'rgba(60,20,10,.45)'; c.lineWidth = 1.5; c.stroke();
    }
  });
  const ROOF_D = .085, ROOF_A = .5;
  const roof = box(1.0, .01, ROOF_D, [mat('#7a3420'), mat('#7a3420'), painted(roofTex, { r: .8 }), mat('#5a2618'), mat('#7a3420'), mat('#7a3420')], [0, FLOOR + .455, WALL_Z - .022]);
  roof.rotation.x = ROOF_A; stage.add(roof);
  stage.add(box(1.0, .012, .006, mat('#5a3a26', { r: .6 }), [0, FLOOR + .455 - ROOF_D / 2 * Math.sin(ROOF_A) - .004, WALL_Z - .022 + ROOF_D / 2 * Math.cos(ROOF_A) + .002]));
  stage.add(kit.backdrop((c, w, h) => {                                // the late-afternoon sky over the roofs
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffd28e'); g.addColorStop(.5, '#ffc583'); g.addColorStop(1, '#ffb070'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const sun = c.createRadialGradient(w * .8, h * .3, 0, w * .8, h * .3, w * .24);
    sun.addColorStop(0, 'rgba(255,250,224,1)'); sun.addColorStop(.1, 'rgba(255,240,196,.95)'); sun.addColorStop(.32, 'rgba(255,222,160,.35)'); sun.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = sun; c.fillRect(0, 0, w, h);
    const r = seeded(41); c.fillStyle = 'rgba(255,238,222,.7)';
    for (const [cx, cy, s] of [[.16, .18, 1], [.42, .1, .7], [.6, .22, .85], [.94, .12, .6]]) for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(w * cx + (k - 2.5) * 24 * s, h * cy + (r() - .5) * 10, 36 * s, 15 * s, 0, 0, 7); c.fill(); }
    c.fillStyle = 'rgba(160,104,70,.45)';                               // the neighbours' roofs, far off
    c.beginPath(); c.moveTo(0, h * .5); c.lineTo(w * .12, h * .42); c.lineTo(w * .26, h * .49); c.lineTo(w * .26, h); c.lineTo(0, h); c.fill();
    c.beginPath(); c.moveTo(w * .66, h * .52); c.lineTo(w * .8, h * .43); c.lineTo(w * .96, h * .51); c.lineTo(w * .96, h); c.lineTo(w * .66, h); c.fill();
    for (const [x, top, lean] of [[.3, .2, .03], [.37, .27, -.02], [.6, .22, .025]]) {   // areca palms: a slim trunk, drooping fronds
      const cx = w * (x + lean), cy = h * top;
      c.strokeStyle = 'rgba(128,84,60,.6)'; c.lineWidth = 5; c.beginPath(); c.moveTo(w * x, h); c.quadraticCurveTo(w * x, h * .6, cx, cy); c.stroke();
      c.lineWidth = 2.5;
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI * (.08 + .84 * k / 8), ex = cx + Math.cos(a) * 64, ey = cy + Math.abs(Math.sin(a)) * -18 + 34 + (k % 2) * 8, mx = cx + Math.cos(a) * 34, my = cy + Math.sin(a) * 30;
        c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
        for (let j = 1; j < 7; j++) {
          const u = j / 7, px = (1 - u) * (1 - u) * cx + 2 * u * (1 - u) * mx + u * u * ex, py = (1 - u) * (1 - u) * cy + 2 * u * (1 - u) * my + u * u * ey;
          c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * 4, py + 12 - u * 4); c.stroke();
        }
      }
    }
    for (let k = 0; k < 46; k++) {                                     // the gardens next door, beside and below the wall
      const x = (k % 2 ? w * .9 : w * .1) + (r() - .5) * w * .24, y = h * (.5 + r() * .5), rr = 26 + r() * 40;
      c.fillStyle = `rgba(${70 + r() * 40 | 0},${100 + r() * 40 | 0},${50 + r() * 20 | 0},.92)`; c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,200,120,.25)'; c.beginPath(); c.arc(x + rr * .3, y - rr * .35, rr * .45, 0, 7); c.fill();
    }
  }, { width: 1.1, height: .8, curve: .02, z: -.33 }));

  /* ── the pergola of bougainvillea (hoa giấy) ── */
  const timber = mat('#7b5233', { r: .75 }), PX = [-.465, -.27], PZ = [-.215, .095], TOP = FLOOR + .4;
  for (const x of PX) for (const z of PZ) stage.add(box(.014, TOP - FLOOR, .014, timber, [x, (TOP + FLOOR) / 2, z]));
  for (const x of PX) stage.add(box(.016, .016, PZ[1] - PZ[0] + .05, timber, [x, TOP + .008, (PZ[0] + PZ[1]) / 2]));
  for (let i = 0; i < 6; i++) stage.add(box(PX[1] - PX[0] + .07, .01, .01, timber, [(PX[0] + PX[1]) / 2, TOP + .021, PZ[0] - .015 + i * (PZ[1] - PZ[0] + .03) / 5]));
  stage.add(cyl(.03, .022, .045, mat('#b5603a', { r: .8 }), [PX[0] + .022, FLOOR + .0225, PZ[1] + .024], 18));
  const LEAVES = 160, BLOOMS = 140;
  const leaves = new THREE.InstancedMesh(keep(new THREE.IcosahedronGeometry(.0085, 0)), mat('#ffffff', { r: .8, flat: true }), LEAVES);
  const blooms = new THREE.InstancedMesh(keep(new THREE.IcosahedronGeometry(.006, 0)), mat('#ffffff', { r: .6, flat: true }), BLOOMS);
  const dummy = new THREE.Object3D(), tint = new THREE.Color(), rb = seeded(51);
  const LEAF = ['#3e7d3a', '#4f9444', '#2f6a33', '#5aa04c'], BLOOM = ['#d61f7f', '#e8409a', '#c4166d', '#f05aa8'];
  let nl = 0, nb = 0;
  const putIn = (im, i, x, y, z, s, color) => {
    dummy.position.set(x, y, z); dummy.rotation.set(rb() * 6, rb() * 6, rb() * 6); dummy.scale.set(s, s * (.5 + rb() * .3), s * (1.1 + rb() * .4));
    dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, tint.set(color));
  };
  const sprig = (x, y, z) => {
    if (nl < LEAVES) putIn(leaves, nl++, x, y, z, .8 + rb() * .6, LEAF[(rb() * 4) | 0]);
    if (rb() < .85 && nb < BLOOMS) putIn(blooms, nb++, x + (rb() - .5) * .012, y + (rb() - .3) * .01, z + (rb() - .5) * .012, .8 + rb() * .5, BLOOM[(rb() * 4) | 0]);
  };
  for (let i = 0; i < 86; i++) sprig(lerp(-.5, -.26, rb() ** 1.5), TOP + .03 + (rb() - .5) * .022, lerp(-.24, .12, rb()));       // over the rafters, thicker on the left
  for (let i = 0; i < 30; i++) { const x = lerp(-.5, -.27, rb()); if (Math.abs(x - CAGE.x) > .085) sprig(x, TOP + .01 - rb() * .07, .1 + rb() * .02); }   // hanging over the front beam, clear of the cage
  for (let i = 0; i < 40; i++) { const a = i * .9; sprig(PX[0] + Math.cos(a) * .012, FLOOR + .04 + i / 40 * (TOP - FLOOR - .04), PZ[1] + Math.sin(a) * .012); }   // up the front post
  leaves.count = nl; blooms.count = nb;
  for (const im of [leaves, blooms]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; stage.add(im); }

  /* ── the birdcage, and the bulbul in it ── */
  const cage = group(stage, [CAGE.x, CAGE.y, CAGE.z]); cage.scale.setScalar(1.25);   // a size the bird can be seen at
  const bamboo = mat('#c79a5b', { r: .6 }), RC = .036, HC = .072;
  const bars = tex(512, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = '#c99d5e'; for (let x = 0; x < w; x += 512 / 30) c.fillRect(x, 0, 5, h); c.fillRect(0, h - 9, w, 9); c.fillRect(0, h * .42, w, 5); });
  const barMat = keep(new THREE.MeshStandardMaterial({ map: bars, alphaTest: .5, side: THREE.DoubleSide, roughness: .6 }));
  cage.add(cyl(.0011, .0011, .024, mat('#3a2a1a'), [0, -.012, 0], 5));
  cage.add(mesh(keep(new THREE.TorusGeometry(.005, .0012, 6, 14)), mat('#c9a25a', { r: .3, m: .5 }), [0, -.026, 0]));
  cage.add(ball(.0055, bamboo, [0, -.033, 0], 10));
  const domeY = -.035 - RC, baseY = domeY - HC;
  cage.add(mesh(keep(new THREE.SphereGeometry(RC, 30, 10, 0, Math.PI * 2, 0, Math.PI / 2)), barMat, [0, domeY, 0]));
  cage.add(mesh(keep(new THREE.CylinderGeometry(RC, RC, HC, 30, 1, true)), barMat, [0, domeY - HC / 2, 0]));
  cage.add(cyl(RC + .003, RC + .003, .008, mat('#8a5a2e', { r: .6 }), [0, baseY - .002, 0], 24));
  cage.add(cyl(RC + .0015, RC + .0015, .011, mat('#a8452e', { r: .6 }), [0, baseY + .0055, 0], 24));
  const perch = cyl(.0014, .0014, RC * 1.9, bamboo, [0, baseY + .03, 0], 6); perch.rotation.z = Math.PI / 2; cage.add(perch);
  cage.add(cyl(.0055, .0045, .007, mat('#2f56a8', { r: .3 }), [RC * .55, baseY + .0145, -.01], 12));
  const brown = mat('#7a6656', { r: .7 }), cream = mat('#f4efe6', { r: .7 }), black = mat('#2b2420', { r: .5 }), redPatch = mat('#d8262a', { r: .5 });
  const bird = group(cage, [0, baseY + .031, 0]);                      // stands on the perch, looking out (+z)
  const birdBody = ball(.0085, brown, [0, .011, 0], 14); birdBody.scale.set(1, .92, 1.35); birdBody.rotation.x = -.3;
  const belly = ball(.0072, cream, [0, .0085, .0035], 12); belly.scale.set(.95, .85, 1.1);
  const tail = box(.0075, .002, .016, brown, [0, .008, -.016]); tail.rotation.x = -.5;
  bird.add(birdBody, belly, tail, ball(.0028, redPatch, [0, .0048, -.0085], 8),
    cyl(.0007, .0007, .006, black, [.003, .003, .001], 5), cyl(.0007, .0007, .006, black, [-.003, .003, .001], 5));
  const birdHead = group(bird, [0, .0165, .006]);
  const crest = mesh(keep(new THREE.ConeGeometry(.0028, .011, 8)), black, [0, .011, .0005]); crest.rotation.x = -.5;
  birdHead.add(ball(.0062, black, [0, .004, .004], 12), crest, ball(.0019, redPatch, [.0047, .0036, .0074], 8), ball(.0019, redPatch, [-.0047, .0036, .0074], 8),
    ball(.0022, cream, [.0041, .0004, .0072], 8), ball(.0022, cream, [-.0041, .0004, .0072], 8), ball(.001, mat('#000000', { r: .3 }), [.0046, .0058, .0075], 6), ball(.001, mat('#000000', { r: .3 }), [-.0046, .0058, .0075], 6));
  const beakTop = mesh(keep(new THREE.ConeGeometry(.0017, .006, 8)), mat('#4a4a4a', { r: .4 }), [0, .0042, .0114]); beakTop.rotation.x = Math.PI / 2;
  const jaw = group(birdHead, [0, .0034, .0095]);
  const beakLow = mesh(keep(new THREE.ConeGeometry(.0012, .0044, 8)), mat('#4a4a4a', { r: .4 }), [0, 0, .0022]); beakLow.rotation.x = Math.PI / 2; jaw.add(beakLow);
  birdHead.add(beakTop);
  const beakTip = new THREE.Object3D(); beakTip.position.set(0, .0042, .016); birdHead.add(beakTip);

  /* ── the bonsai: a porcelain stool, a blue glazed pot, a twisting trunk, cloud-shaped pads; four frames for the photos ── */
  const bonsai = group(stage, [BONSAI.x, FLOOR, BONSAI.z], -.15); bonsai.scale.setScalar(1.2);   // big enough for photos you can see
  const blueWhite = tex(512, 128, (c, w, h) => {
    c.fillStyle = '#f7f4ec'; c.fillRect(0, 0, w, h); c.fillStyle = '#2f56a8'; c.fillRect(0, 10, w, 6); c.fillRect(0, h - 16, w, 6);
    c.strokeStyle = '#2f56a8';
    for (let i = 0; i < 6; i++) {
      const x = (i + .5) * w / 6; c.lineWidth = 5; c.beginPath(); c.arc(x, h / 2, 22, 0, 7); c.stroke();
      c.lineWidth = 3; c.beginPath(); c.arc(x - 6, h / 2, 9, 0, Math.PI); c.stroke(); c.beginPath(); c.arc(x + 6, h / 2, 9, Math.PI, 0); c.stroke();
      c.beginPath(); c.moveTo(x + w / 12 - 12, h / 2 + 4); c.quadraticCurveTo(x + w / 12, h / 2 - 12, x + w / 12 + 12, h / 2 + 4); c.stroke();
    }
  });
  bonsai.add(mesh(keep(new THREE.LatheGeometry([[.026, 0], [.031, .006], [.035, .018], [.036, .028], [.034, .04], [.029, .05]].map(([x, y]) => new THREE.Vector2(x, y)), 28)), painted(blueWhite, { r: .3 })));
  bonsai.add(cyl(.029, .029, .003, mat('#f7f4ec', { r: .3 }), [0, .0505, 0], 24));
  const glaze = tex(512, 96, (c, w, h) => {
    c.fillStyle = '#2b4f9f'; c.fillRect(0, 0, w, h); c.fillStyle = '#3d6cc4'; c.fillRect(0, 0, w, 16);
    c.strokeStyle = '#f2f4f8'; c.lineWidth = 4; c.beginPath(); for (let x = 0; x <= w; x += 4) c.lineTo(x, h * .6 + Math.sin(x / w * Math.PI * 16) * 7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, 20, w, 6);
  });
  const pot = mesh(keep(new THREE.CylinderGeometry(.074, .062, .045, 36, 1, true)), painted(glaze, { r: .25, side: THREE.DoubleSide }), [0, .075, 0]); pot.scale.z = .66; bonsai.add(pot);
  const potRim = mesh(keep(new THREE.TorusGeometry(.074, .004, 6, 36)), mat('#3d6cc4', { r: .25 }), [0, .0975, 0]); potRim.rotation.x = Math.PI / 2; potRim.scale.y = .66; bonsai.add(potRim);
  const soil = cyl(.071, .071, .004, mat('#4a3020', { r: 1 }), [0, .093, 0], 28); soil.scale.z = .66; bonsai.add(soil);
  for (const [x, z] of [[-.03, .012], [.02, -.015], [.045, .01]]) { const moss = ball(.012, mat('#5f8f3a', { r: 1 }), [x, .095, z], 8); moss.scale.set(1, .25, .8); bonsai.add(moss); }
  const bark = mat('#6b4a33', { r: .85 });
  bonsai.add(tube([[-.012, .094, 0], [-.03, .14, .008], [.012, .19, -.004], [.022, .23, .002], [-.008, .28, 0], [.004, .33, 0], [0, .36, 0]], .013, .004, bark, 28, 8));
  for (const [x, z, a] of [[-.022, .006, 2.6], [.016, .01, .5], [0, -.016, 4.4]]) bonsai.add(tube([[0, .1, 0], [x * 1.4, .096, z * 1.4], [x * 2.4, .094, z * 2.4]], .006, .002, bark, 6, 5));
  const PADS = [[-.085, .19, .02, .045], [.088, .225, 0, .042], [-.07, .27, -.01, .038], [.068, .3, .012, .036], [0, .35, 0, .04]];
  const trunkAt = y => [lerp(-.03, .02, Math.sin(y * 30) * .5 + .5) * .5, y, 0];
  const pine = [mat('#3f7a3a', { r: .85, flat: true }), mat('#4f8f45', { r: .85, flat: true }), mat('#2f6a35', { r: .85, flat: true })];
  PADS.forEach(([x, y, z, s], i) => {
    if (x) bonsai.add(tube([trunkAt(y - .02), [x * .55, y - .01, z * .5], [x * .92, y - .004, z]], .0045, .0022, bark, 8, 6));
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7 + i, blob = mesh(keep(new THREE.IcosahedronGeometry(s * (.55 + (k % 2) * .18), 1)), pine[(k + i) % 3], [x + Math.cos(a) * s * .42, y + (k === 3 ? s * .16 : 0), z + Math.sin(a) * s * .28]);
      blob.scale.y = .42; bonsai.add(blob);
    }
  });
  const FRAME = .079;                                                   // .095 card widths, in the tree's own (1.2x) space
  const ornaments = [[0, -.108, .188, .04], [1, .1, .147, .036], [2, -.1, .276, .034], [3, .1, .251, .04]].map(([i, x, y, z]) => {
    const hang = group(bonsai, [x, y + FRAME / 2 + .012, z]);             // hung from a pad on a red string, swaying
    hang.add(cyl(.0007, .0007, .012, mat('#c41e3a', { r: .6 }), [0, -.006, 0], 4));
    const photo = kit.photo({ frame: 'wood', width: FRAME, aspect: 1, slot: i, of: 4, turn: 2.8 + i * .37, glow: .45, color: '#c8945e', border: .07 });
    photo.root.position.y = -.012 - FRAME / 2; hang.add(photo.root);
    hang.add(ball(.0028, mat('#f0b93a', { r: .3, m: .4 }), [0, -.012, .003], 8));
    return { hang, photo };
  });

  /* ── Ông's rocking chair (ghế bập bênh): dark wood, cane seat and back. rock(a) tips it on its runners ── */
  const wood = mat('#5b351f', { r: .5 });
  const caneTex = tex(256, 256, (c, w, h) => {                          // hexagonal cane weave
    c.fillStyle = '#ddb06a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#9c6a32'; c.lineWidth = 3.5;
    for (let k = -2 * h; k < 2 * w; k += 18) {
      c.beginPath(); c.moveTo(k, 0); c.lineTo(k + h * .58, h); c.stroke();
      c.beginPath(); c.moveTo(k, 0); c.lineTo(k - h * .58, h); c.stroke();
    }
    for (let y = 0; y < h; y += 15.6) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  }, { repeat: [2, 2] });
  const cane = keep(new THREE.MeshStandardMaterial({ map: caneTex, roughness: .8, side: THREE.DoubleSide }));
  const chair = group(stage, [CHAIR.x, FLOOR, CHAIR.z], CHAIR.turn);
  const RR = .2, ARM_Y = SEAT + .042;                                   // the runners' radius; the armrests' height
  const rocker = group(chair, [0, RR, 0]), body = group(rocker, [0, -RR, 0]);
  for (const s of [-1, 1]) {
    const pts = [[s * .05, .012, -.104]];
    for (let a = -.46; a <= .44 + 1e-6; a += .1) pts.push([s * .05, RR - RR * Math.cos(a), RR * Math.sin(a)]);
    body.add(tube(pts, .0034, .0034, wood, 26, 6), ball(.0034, wood, pts[pts.length - 1], 8), ball(.0034, wood, pts[0], 8));
    body.add(rod([s * .05, .003, .034], [s * .05, ARM_Y, .037], .0032, wood));                          // a front leg, up to the armrest
    body.add(rod([s * .05, .003, -.03], [s * .05, SEAT + .135, -.082], .0034, wood));                   // a back leg, on up as the back post
    body.add(rod([s * .05, .03, -.025], [s * .05, .03, .034], .0022, wood));                            // a side stretcher
    body.add(box(.012, .006, .102, wood, [s * .058, ARM_Y + .003, -.008]), ball(.0042, wood, [s * .058, ARM_Y + .003, .043], 8));
  }
  body.add(box(.108, .007, .084, [wood, wood, cane, wood, wood, wood], [0, SEAT - .0035, 0]));
  body.add(box(.108, .012, .006, wood, [0, SEAT - .012, .041]), rod([-.05, .022, .034], [.05, .022, .034], .0022, wood));
  const chairBack = box(.094, .1, .003, cane, [0, SEAT + .072, -.06]); chairBack.rotation.x = -.235; body.add(chairBack);
  body.add(rod([-.054, SEAT + .132, -.081], [.054, SEAT + .132, -.081], .0045, wood), rod([-.05, SEAT + .02, -.05], [.05, SEAT + .02, -.05], .003, wood));
  const rock = a => { rocker.rotation.x = a; rocker.position.z = RR * a; };

  /* ── the low tea table: a tray with the teapot and two cups, the album lying closed ── */
  const tableWood = mat('#7a4526', { r: .45 });
  const grain = tex(512, 256, (c, w, h) => {
    const r = seeded(61); c.fillStyle = '#86502c'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(${r() < .5 ? '60,30,14' : '170,110,64'},${(.08 + r() * .12).toFixed(2)})`; c.fillRect(0, y, w, 1 + r() * 2); }
    c.strokeStyle = 'rgba(60,30,14,.3)'; c.lineWidth = 2;
    for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(r() * w, r() * h, 30 + r() * 30, 6 + r() * 6, 0, 0, 7); c.stroke(); }
    c.fillStyle = 'rgba(255,220,170,.14)'; c.fillRect(0, h * .1, w, h * .12);
  });
  const table = group(stage, [TABLE.x, FLOOR, TABLE.z], TABLE.turn);
  table.add(box(.34, .009, .13, [tableWood, tableWood, painted(grain, { r: .4 }), tableWood, tableWood, tableWood], [0, TABLE_H - .0045, 0]));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) table.add(box(.012, TABLE_H - .009, .012, tableWood, [sx * .155, (TABLE_H - .009) / 2, sz * .054]));
  table.add(box(.31, .012, .004, tableWood, [0, TABLE_H - .015, .06]), box(.31, .012, .004, tableWood, [0, TABLE_H - .015, -.06]), box(.31, .005, .11, tableWood, [0, .022, 0]));
  const porcelain = mat('#f6f2ea', { r: .3 }), cobalt = mat('#2f56a8', { r: .4 }), tea = mat('#a8742a', { r: .2 }), clay = mat('#8a4524', { r: .45 }), gold = mat('#f0b93a', { r: .35, m: .3 });
  const teacup = () => {
    const g = new THREE.Group();
    g.add(cyl(.0062, .0045, .008, porcelain, [0, .004, 0], 16), cyl(.0063, .0059, .0018, cobalt, [0, .0068, 0], 16), cyl(.0052, .0052, .0004, tea, [0, .0072, 0], 14));
    return g;
  };
  const teaSet = group(table, [-.125, TABLE_H, -.01]);
  teaSet.add(cyl(.04, .038, .005, mat('#6b2416', { r: .35 }), [0, .0025, 0], 28));
  const trayRim = mesh(keep(new THREE.TorusGeometry(.039, .0016, 6, 32)), gold, [0, .005, 0]); trayRim.rotation.x = Math.PI / 2; teaSet.add(trayRim);
  const teapot = group(teaSet, [-.01, .005, -.012], .4);
  const potBody = ball(.016, clay, [0, .0125, 0], 18); potBody.scale.y = .78;
  const handle = mesh(keep(new THREE.TorusGeometry(.008, .0019, 6, 14, Math.PI * 1.2)), clay, [-.017, .013, 0]); handle.rotation.z = Math.PI * .4;
  teapot.add(potBody, cyl(.008, .009, .003, clay, [0, .0235, 0], 14), ball(.0028, clay, [0, .0262, 0], 8), rod([.012, .01, 0], [.028, .021, 0], .0024, clay), handle);
  const cupA = teacup(); cupA.position.set(.02, .005, .014); const cupB = teacup(); cupB.position.set(.018, .005, -.016); teaSet.add(cupA, cupB);

  /* ── the photo album: it lies closed on the table; it stands up on its easel, opens, and its pages turn ── */
  const PW = .13, PH = .16, SNAP = .11;                               // its pages, and the photos on them
  const album = group(table);                                           // placed by the story; its origin is the spine's foot, the pages face +z
  const leather = mat('#8c1d2a', { r: .55 }), pagesEdge = mat('#efe4cc', { r: .9 });
  const coverTex = tex(256, 337, (c, w, h) => {
    const r = seeded(71); c.fillStyle = '#8c1d2a'; c.fillRect(0, 0, w, h);
    for (let k = 0; k < 300; k++) { c.fillStyle = `rgba(${r() < .5 ? '60,8,16' : '190,70,80'},.25)`; c.fillRect(r() * w, r() * h, 2, 2); }
    c.strokeStyle = '#e8c06a'; c.lineWidth = 6; c.strokeRect(16, 16, w - 32, h - 32); c.lineWidth = 2; c.strokeRect(27, 27, w - 54, h - 54);
    c.fillStyle = '#f2cf7a'; kit.fitText(c, 'Album', { x: 34, y: h * .26, w: w - 68, h: h * .22 }, { maxLines: 1 });
    kit.fitText(c, 'kỷ niệm', { x: 34, y: h * .5, w: w - 68, h: h * .16 }, { maxLines: 1 });
    for (const [x, y] of [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]]) { c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); }
  });
  const spread = tex(1024, 683, (c, w, h) => {                         // both pages: paper, the gutter, photo corners, the card's line
    c.fillStyle = '#fbf3e3'; c.fillRect(0, 0, w, h);
    const gut = c.createLinearGradient(w / 2 - 60, 0, w / 2 + 60, 0);
    gut.addColorStop(0, 'rgba(120,90,60,0)'); gut.addColorStop(.5, 'rgba(120,90,60,.35)'); gut.addColorStop(1, 'rgba(120,90,60,0)'); c.fillStyle = gut; c.fillRect(w / 2 - 60, 0, 120, h);
    const s = Math.round(SNAP / (PW * 2) * w), cy = Math.round((1 - .58) * h);
    for (const cx of [w / 4, w * 3 / 4]) {
      c.fillStyle = '#3a2a22';
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = cx + sx * (s / 2 + 4), y = cy + sy * (s / 2 + 4);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - sx * 34, y); c.lineTo(x, y - sy * 34); c.fill();
      }
    }
    c.fillStyle = '#e8a0b0';
    for (const [x, y] of [[60, 50], [w - 60, 50], [w / 2 - 90, h - 150], [w / 2 + 90, h - 150]]) kit.heartPath(c, x, y, 26), c.fill();
    c.fillStyle = '#8a1f2c'; kit.fitText(c, words('album', 'Những ngày vui bên Ông'), { x: 50, y: h - 132, w: w - 100, h: 118 }, { maxLines: 1, max: 96 });
  });
  const pageMat = keep(new THREE.MeshStandardMaterial({ map: spread, roughness: .9, emissive: 0xffffff, emissiveMap: spread, emissiveIntensity: .3 }));
  const pageGeo = side => { const g = keep(new THREE.PlaneGeometry(PW, PH)), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * .5 + (side > 0 ? .5 : 0)); return g; };
  const rightHalf = group(album);
  rightHalf.add(mesh(pageGeo(1), pageMat, [PW / 2, PH / 2, 0], false), box(PW, PH, .005, pagesEdge, [PW / 2, PH / 2, -.0026]), box(PW + .004, PH + .004, .002, leather, [PW / 2 + .001, PH / 2, -.0062]));
  const hinge = group(album, [0, 0, .0001]);
  hinge.add(mesh(pageGeo(-1), pageMat, [-PW / 2, PH / 2, 0], false), box(PW, PH, .002, pagesEdge, [-PW / 2, PH / 2, -.0011]),
    box(PW + .004, PH + .004, .002, [leather, leather, leather, leather, leather, painted(coverTex, { r: .5, glow: .15 })], [-PW / 2 - .001, PH / 2, -.0032]));
  album.add(cyl(.0042, .0042, PH + .004, leather, [0, PH / 2, -.003], 10));
  const FLIP = 1.7;                                                     // seconds a spread shows: the album's photos turn this often
  const albumPhotos = [-1, 1].map((s, i) => {
    const p = kit.photo({ frame: 'white', width: SNAP, aspect: 1, slot: i, of: 2, turn: FLIP, glow: .4, depth: .002, border: .05 });
    p.root.position.set(s * PW / 2, PH * .58, .0011); (s < 0 ? hinge : rightHalf).add(p.root);
    return p;
  });
  const leafTex = tex(256, 341, (c, w, h) => {
    c.fillStyle = '#f7eedb'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(200,150,120,.25)';
    for (let y = 18; y < h; y += 22) for (let x = 18; x < w; x += 22) { c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
    c.fillStyle = '#e8a0b0'; kit.heartPath(c, w / 2, h / 2, 60); c.fill();
  });
  const leafHinge = group(album, [0, 0, .0035]);
  leafHinge.add(mesh(keep(new THREE.PlaneGeometry(PW * .97, PH * .97)), painted(leafTex, { side: THREE.DoubleSide, glow: .25 }), [PW * .485, PH / 2, 0], false));
  leafHinge.visible = false;
  const easel = group(album, [0, PH * .72, -.0075]);                     // its easel, folded out behind it while it stands
  easel.add(box(.018, .116, .003, tableWood, [0, -.058, 0])); easel.rotation.x = .72;
  album.add(box(PW * 2 + .01, .004, .009, tableWood, [0, .002, .004]));
  const ledge = album.children[album.children.length - 1];

  /* ── the newspaper: Báo Nhà Mình, a special issue, one of the card's photos on its front page under the card's headline ── */
  const NW = .13, NH = .165, NPX = 512 / NW, PHOTO_Y = .072, PHOTO_W = NW * .9, PHOTO_A = .72;   // the page; its photo's middle, width, shape
  const newsPhoto = kit.photo({ frame: 'none', width: PHOTO_W, aspect: PHOTO_A, slot: 2, of: 4, turn: 3.4, glow: .4, depth: .0008 });
  const photoTop = Math.round((NH - PHOTO_Y - PHOTO_W * PHOTO_A / 2) * NPX), photoBottom = Math.round((NH - PHOTO_Y + PHOTO_W * PHOTO_A / 2) * NPX);
  const columns = (c, x0, y0, x1, y1, n, r) => {
    const cw = (x1 - x0 - (n - 1) * 14) / n; c.fillStyle = '#8f877a';
    for (let i = 0; i < n; i++) for (let y = y0; y < y1; y += 9) c.fillRect(x0 + i * (cw + 14), y, cw * (y + 9 >= y1 || r() < .1 ? .55 : 1), 4);
  };
  const frontPage = tex(512, 650, (c, w, h) => {
    const r = seeded(81); c.fillStyle = '#f4efe2'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d1a17';
    kit.fitText(c, 'BÁO NHÀ MÌNH', { x: 24, y: 4, w: w - 48, h: 52 }, { maxLines: 1, font: SERIF, weight: 900, max: 50 });
    c.fillRect(20, 57, w - 40, 3.5); c.fillRect(20, 64, w - 40, 1.5);
    c.font = `700 12px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SỐ ĐẶC BIỆT  ·  MỪNG SINH NHẬT ÔNG  ·  GIÁ: MỘT CÁI ÔM', w / 2, 76);
    c.fillRect(20, 86, w - 40, 1.5);
    c.fillStyle = '#b3202a'; kit.fitText(c, words('headline', 'Ông lên báo!'), { x: 14, y: 88, w: w - 28, h: photoTop - 92 }, { maxLines: 2, font: SERIF, weight: 900, max: 92 });
    c.strokeStyle = '#1d1a17'; c.lineWidth = 4; c.strokeRect((w - PHOTO_W * NPX) / 2 - 4, photoTop - 4, PHOTO_W * NPX + 8, photoBottom - photoTop + 8);
    c.fillStyle = '#4a453d'; c.font = `italic 600 16px ${SERIF}`; c.fillText('Nhân vật của năm: Ông nhà mình', w / 2, photoBottom + 19);
    columns(c, 22, photoBottom + 34, w - 22, h - 12, 3, r);
  });
  const backPage = tex(512, 650, (c, w, h) => {
    const r = seeded(83); c.fillStyle = '#f2ecdd'; c.fillRect(0, 0, w, h); c.fillStyle = '#1d1a17';
    c.font = `700 15px ${SANS}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('BÁO NHÀ MÌNH', 22, 26); c.textAlign = 'right'; c.fillText('TRANG 8', w - 22, 26);
    c.fillRect(20, 40, w - 40, 2.5);
    c.fillStyle = '#2f7d58'; c.fillRect(22, 56, 120, 26); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = `800 15px ${SANS}`; c.fillText('THỂ THAO', 82, 70);
    c.fillStyle = '#1d1a17'; kit.fitText(c, 'Ông thắng ba ván cờ tướng liền!', { x: 20, y: 90, w: w - 40, h: 100 }, { maxLines: 2, font: SERIF, weight: 900, max: 44 });
    c.strokeStyle = '#1d1a17'; c.lineWidth = 2; const bx = 30, by = 210, d = 22;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(bx + i * d, by); c.lineTo(bx + i * d, by + 9 * d); c.stroke(); }
    for (let j = 0; j < 10; j++) { c.beginPath(); c.moveTo(bx, by + j * d); c.lineTo(bx + 8 * d, by + j * d); c.stroke(); }
    c.fillStyle = '#b3202a'; for (const [i, j] of [[4, 9], [2, 7], [6, 6], [1, 5]]) { c.beginPath(); c.arc(bx + i * d, by + j * d, 8, 0, 7); c.fill(); }
    c.fillStyle = '#1d1a17'; for (const [i, j] of [[4, 0], [3, 2], [7, 3]]) { c.beginPath(); c.arc(bx + i * d, by + j * d, 8, 0, 7); c.fill(); }
    columns(c, 230, 210, w - 22, 410, 2, r);
    c.strokeStyle = '#1d1a17'; c.strokeRect(22, 430, w - 44, 92); c.fillStyle = '#1d1a17'; c.font = `800 16px ${SANS}`; c.fillText('THỜI TIẾT', w / 2, 450);
    c.font = `italic 600 18px ${SERIF}`; c.fillText('Chiều nay nắng vàng, gió nhẹ:', w / 2, 478); c.fillText('rất hợp pha một ấm trà.', w / 2, 503);
    columns(c, 22, 540, w - 22, h - 14, 3, r);
  });
  const newsEdge = mat('#e9e2d1', { r: .95 });
  const newspaper = new THREE.Group(); stage.add(newspaper);
  newspaper.add(box(NW, NH, .0012, [newsEdge, newsEdge, newsEdge, newsEdge, painted(frontPage, { glow: .32, r: .95 }), painted(backPage, { glow: .2, r: .95 })], [0, NH / 2, 0]));
  newsPhoto.root.position.set(0, PHOTO_Y, .0011); newspaper.add(newsPhoto.root);

  /* ── Ông's own cup (the story keeps it in his hand) ── */
  const cup = teacup(); cup.scale.setScalar(1.4); stage.add(cup);                  // a size that shows in his hand

  /* ── the cờ tướng board on a stool, mid-game ── */
  const chess = group(stage, [CHESS.x, FLOOR, CHESS.z], CHESS.turn), stoolWood = mat('#8a5a34', { r: .6 });
  chess.add(cyl(.044, .044, .007, stoolWood, [0, .0505, 0], 24));
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) chess.add(rod([sx * .024, .048, sz * .024], [sx * .032, 0, sz * .032], .003, stoolWood));
  const boardTex = tex(256, 285, (c, w, h) => {
    c.fillStyle = '#e8c48a'; c.fillRect(0, 0, w, h); const x0 = 22, y0 = 22, dx = (w - 44) / 8, dy = (h - 44) / 9;
    c.strokeStyle = '#5a3a1a'; c.lineWidth = 2; c.strokeRect(x0 - 7, y0 - 7, 8 * dx + 14, 9 * dy + 14);
    for (let j = 0; j < 10; j++) { c.beginPath(); c.moveTo(x0, y0 + j * dy); c.lineTo(x0 + 8 * dx, y0 + j * dy); c.stroke(); }
    for (let i = 0; i < 9; i++) {
      c.beginPath(); c.moveTo(x0 + i * dx, y0);
      if (i === 0 || i === 8) c.lineTo(x0 + i * dx, y0 + 9 * dy); else { c.lineTo(x0 + i * dx, y0 + 4 * dy); c.moveTo(x0 + i * dx, y0 + 5 * dy); c.lineTo(x0 + i * dx, y0 + 9 * dy); }
      c.stroke();
    }
    for (const j of [0, 7]) { c.beginPath(); c.moveTo(x0 + 3 * dx, y0 + j * dy); c.lineTo(x0 + 5 * dx, y0 + (j + 2) * dy); c.moveTo(x0 + 5 * dx, y0 + j * dy); c.lineTo(x0 + 3 * dx, y0 + (j + 2) * dy); c.stroke(); }
    c.fillStyle = '#7a3a1a'; c.font = `800 13px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SỞ HÀ', x0 + 2 * dx, y0 + 4.5 * dy); c.fillText('HÁN GIỚI', x0 + 6 * dx, y0 + 4.5 * dy);
  });
  chess.add(box(.07, .004, .078, [stoolWood, stoolWood, painted(boardTex, { r: .6 }), stoolWood, stoolWood, stoolWood], [0, .0562, 0]));
  const pieceTop = red => painted(tex(64, 64, (c, w, h) => {
    c.fillStyle = '#f4e6c8'; c.fillRect(0, 0, w, h); c.strokeStyle = red ? '#b3202a' : '#222'; c.lineWidth = 5; c.beginPath(); c.arc(32, 32, 24, 0, 7); c.stroke();
    c.fillStyle = c.strokeStyle; c.font = `900 26px ${SANS}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(red ? 'T' : 'X', 32, 34);
  }), { r: .5 });
  const pieceSide = mat('#e9d6ae', { r: .6 }), tops = [pieceTop(false), pieceTop(true)], pieceGeo = keep(new THREE.CylinderGeometry(.0034, .0034, .0026, 14));
  const gx = i => -.029 + i * .00725, gz = j => -.033 + j * .00733;
  [[4, 0, 0], [3, 0, 0], [2, 0, 0], [0, 0, 0], [7, 2, 0], [1, 2, 0], [2, 3, 0], [6, 3, 0], [4, 5, 1], [4, 9, 1], [5, 9, 1], [6, 9, 1], [8, 7, 1], [1, 7, 1], [7, 6, 1], [0, 6, 1], [3, 4, 0]].forEach(([i, j, red]) => {
    chess.add(mesh(pieceGeo, [pieceSide, tops[red], pieceSide], [gx(i), .0597, gz(j)]));
  });

  /* ── the gift box at the front: its lid flies open and the first photo springs up in a wooden frame ── */
  const gift = group(stage, [GIFT.x, FLOOR, GIFT.z], GIFT.turn), giftRed = mat('#c41e3a', { r: .45 });
  gift.add(box(.066, .052, .066, giftRed, [0, .026, 0]), box(.068, .0525, .012, gold, [0, .02625, 0]), box(.012, .0525, .068, gold, [0, .02625, 0]));
  const lid = group(gift, [0, .052, -.035]);                            // hinged along its back edge
  lid.add(box(.072, .013, .072, giftRed, [0, .0065, .035]), box(.0725, .0135, .012, gold, [0, .0065, .035]), box(.012, .0135, .0725, gold, [0, .0065, .035]));
  for (const s of [-1, 1]) { const loop = mesh(keep(new THREE.TorusGeometry(.011, .0032, 6, 16)), gold, [s * .011, .02, .035]); loop.rotation.set(0, Math.PI / 2, s * .5); loop.scale.set(1, 1, .5); lid.add(loop); }
  lid.add(ball(.0045, gold, [0, .015, .035], 8));
  const hero = kit.photo({ frame: 'wood', width: .26, aspect: 1, hero: true, glow: .55, border: .07, color: '#c48a52' });   // the buyer's first photo, the biggest
  const heroRoot = new THREE.Group(); heroRoot.visible = false; heroRoot.add(hero.root); stage.add(heroRoot);
  for (const s of [-1, 1]) { const loop = mesh(keep(new THREE.TorusGeometry(.021, .006, 8, 18)), giftRed, [s * .021, hero.height / 2 + .01, .006]); loop.rotation.z = s * .5; loop.scale.y = .7; heroRoot.add(loop); }
  heroRoot.add(ball(.009, giftRed, [0, hero.height / 2 + .01, .009], 12));
  for (const s of [-1, 1]) { const tail = box(.007, .03, .003, giftRed, [s * .012, hero.height / 2 - .008, .009]); tail.rotation.z = s * .35; heroRoot.add(tail); }

  /* ── the party on the table: a tray of peach buns and a little cake with three candles ── */
  const party = group(table, [0, TABLE_H, 0]);
  const cake = group(party, [-.005, 0, -.018]), frosting = mat('#fff3e6', { r: .55 }), pinkCream = mat('#ff9fb4', { r: .5 });
  cake.add(cyl(.036, .036, .003, porcelain, [0, .0015, 0], 32), cyl(.026, .027, .024, frosting, [0, .015, 0], 32));
  const piping = mesh(keep(new THREE.TorusGeometry(.0255, .0028, 8, 36)), pinkCream, [0, .027, 0]); piping.rotation.x = Math.PI / 2; cake.add(piping);
  const band = mesh(keep(new THREE.TorusGeometry(.0268, .0022, 6, 36)), pinkCream, [0, .006, 0]); band.rotation.x = Math.PI / 2; cake.add(band);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; cake.add(ball(.0032, i % 2 ? pinkCream : frosting, [Math.cos(a) * .02, .0285, Math.sin(a) * .02], 8)); }
  const stripe = col => tex(32, 64, (c, w, h) => { c.fillStyle = '#fffaf2'; c.fillRect(0, 0, w, h); c.strokeStyle = col; c.lineWidth = 6; for (let y = -w; y < h + w; y += 14) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 10); c.stroke(); } });
  const flames = [[-.011, -.004, '#2f56a8'], [.0, .008, '#d42a4c'], [.011, -.003, '#2f9a5b']].map(([x, z, col]) => {
    cake.add(cyl(.0022, .0022, .02, painted(stripe(col), { r: .6 }), [x, .0365, z], 10), cyl(.0004, .0004, .003, mat('#2a2018'), [x, .048, z], 4));
    const flame = ball(.0028, keep(new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffb347', emissiveIntensity: 2.2 })), [x, .0525, z], 10);
    flame.scale.set(1, 1.8, 1); flame.castShadow = false;
    const halo = kit.glow({ color: 0xffc070, size: .045, opacity: .85 }); halo.position.set(x, .053, z);
    cake.add(flame, halo);
    return { flame, halo, base: new THREE.Vector3(x, .0525, z) };
  });
  const buns = group(party, [.075, 0, .006]);
  buns.add(cyl(.045, .041, .005, mat('#b3202a', { r: .3 }), [0, .0025, 0], 30));
  const bunRim = mesh(keep(new THREE.TorusGeometry(.044, .0016, 6, 36)), gold, [0, .005, 0]); bunRim.rotation.x = Math.PI / 2; buns.add(bunRim);
  const bunTex = tex(64, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ff6f8e'); g.addColorStop(.32, '#ffc2cd'); g.addColorStop(.62, '#fff4ea'); g.addColorStop(1, '#fff8ef');
    c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(200,60,90,.55)'; c.fillRect(w * .25 - 1.5, 0, 3, h * .55);
  });
  const bunGeo = keep(new THREE.SphereGeometry(.0105, 18, 14)), bp = bunGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {                                  // a peach: the top drawn up to a soft point
    const y = bp.getY(i) / .0105, up = Math.max(0, y);
    bp.setXYZ(i, bp.getX(i) * (1 - .22 * up ** 3), bp.getY(i) + .0055 * up ** 4, bp.getZ(i) * (1 - .22 * up ** 3));
  }
  bunGeo.computeVertexNormals();
  const bunMat = painted(bunTex, { r: .7, glow: .08 }), leafGeo = keep(new THREE.CircleGeometry(.0055, 10)), bunLeaf = keep(new THREE.MeshStandardMaterial({ color: '#4f9444', roughness: .7, side: THREE.DoubleSide }));
  [[0, .0, 0, 1.13], ...Array.from({ length: 6 }, (_, i) => [Math.cos(i / 6 * Math.PI * 2) * .023, 0, Math.sin(i / 6 * Math.PI * 2) * .023, 1])].forEach(([x, y, z, s], i) => {
    const b = new THREE.Group(); b.position.set(x, .005 + .0095 * s + (i ? 0 : .012), z); b.rotation.y = i * 1.3; b.scale.setScalar(s); buns.add(b);
    b.add(mesh(bunGeo, bunMat));
    for (const k of [-1, 1]) { const l = mesh(leafGeo, bunLeaf, [k * .006, -.007, .006], false); l.scale.set(1, 2, 1); l.rotation.set(-1.1, 0, k * .7); b.add(l); }
  });

  /* ── red paper lanterns, rising at the end ── */
  const lanternTex = tex(256, 128, (c, w, h) => {
    c.fillStyle = '#d42a2a'; c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { c.fillStyle = 'rgba(110,0,20,.35)'; c.fillRect(x, 0, 3, h); }
    c.fillStyle = '#f2c14e'; c.fillRect(0, 0, w, 10); c.fillRect(0, h - 10, w, 10);
    c.strokeStyle = '#ffd56b'; c.lineWidth = 4; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc((i + .5) * w / 4, h / 2, 16, 0, 7); c.stroke(); }
  });
  const lanterns = Array.from({ length: 7 }, (_, i) => {
    const g = new THREE.Group(); stage.add(g);
    const shell = keep(new THREE.MeshStandardMaterial({ map: lanternTex, emissive: 0xff7a3a, emissiveMap: lanternTex, emissiveIntensity: .9, roughness: .7 }));
    const b = mesh(keep(new THREE.SphereGeometry(.02, 16, 12)), shell, [0, 0, 0], false); b.scale.set(1, .82, 1); g.add(b);
    g.add(cyl(.008, .009, .005, gold, [0, .0175, 0], 12), cyl(.009, .008, .005, gold, [0, -.0175, 0], 12), cyl(.0014, .0014, .02, mat('#c41e3a'), [0, -.03, 0], 6));
    const halo = kit.glow({ color: 0xffa04a, size: .1, opacity: .7 }); g.add(halo);
    g.visible = false;
    return { root: g, halo, i };
  });

  /* ── the banner, carried open by two balloons ── */
  const BW = .46, BH = .095;
  const bannerTex = tex(1024, 205, (c, w, h) => {
    c.fillStyle = '#c8102e'; rounded(c, 0, 0, w, h, 18); c.fill();
    c.strokeStyle = '#f2c14e'; c.lineWidth = 7; rounded(c, 12, 12, w - 24, h - 24, 12); c.stroke(); c.lineWidth = 2; rounded(c, 24, 24, w - 48, h - 48, 8); c.stroke();
    c.fillStyle = '#f2c14e';
    for (const x of [58, w - 58]) for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; c.beginPath(); c.ellipse(x + Math.cos(a) * 14, h / 2 + Math.sin(a) * 14, 9, 13, a + Math.PI / 2, 0, 7); c.fill(); }
    c.save(); c.shadowColor = 'rgba(80,0,10,.55)'; c.shadowBlur = 8; c.shadowOffsetY = 3; c.fillStyle = '#ffe28a';
    kit.fitText(c, words('banner', 'Chúc Ông sống lâu trăm tuổi'), { x: 96, y: 22, w: w - 192, h: h - 44 }, { maxLines: 1, max: 132 });
    c.restore();
  });
  const banner = new THREE.Group(); stage.add(banner);
  const clothMat = keep(new THREE.MeshStandardMaterial({ map: bannerTex, roughness: .8, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: bannerTex, emissiveIntensity: .38 }));
  const cloth = mesh(keep(new THREE.PlaneGeometry(1, BH)), clothMat, [0, 0, 0], false); banner.add(cloth);
  const bannerRed = mat('#a50e24', { r: .6 });
  const roll = cyl(.008, .008, BH + .008, bannerRed, [0, 0, .003], 14); banner.add(roll);
  banner.add(cyl(.003, .003, BH + .012, gold, [-BW / 2, 0, 0], 8));
  const balloon = color => {
    const g = new THREE.Group(), b = ball(.026, mat(color, { r: .22 }), [0, .088, 0], 22); b.scale.set(1, 1.18, 1);
    g.add(b, cyl(.0045, .001, .006, mat(color, { r: .3 }), [0, .057, 0], 8), cyl(.0006, .0006, .056, mat('#fff4e0'), [0, .028, 0], 4));
    return g;
  };
  const balloons = [balloon('#e0312f'), balloon('#f2b632')]; balloons.forEach(b => banner.add(b));
  const unroll = k => {                                                 // 0: all on the roll at the left end; 1: open
    const w = Math.max(.002, BW * k);
    cloth.scale.x = w; cloth.position.x = -BW / 2 + w / 2; bannerTex.repeat.x = Math.max(.004, k);
    roll.position.x = -BW / 2 + w; roll.scale.set(1.15 - .55 * k, 1, 1.15 - .55 * k);
    balloons[0].position.set(-BW / 2, BH / 2, 0); balloons[1].position.set(-BW / 2 + w, BH / 2, 0);
  };
  unroll(0);

  return {
    FLOOR, SEAT, SETTLE, TABLE_H, OLD, CHAIR, TABLE, CAGE, GIFT, m,
    chair: { root: chair, body, rock },
    table, teaSet, cup, ornaments, bonsai,
    album: { root: album, hinge, leaf: leafHinge, easel, ledge, photos: albumPhotos, FLIP, PW, PH },
    newspaper: { root: newspaper, photo: newsPhoto, W: NW, H: NH },
    bird: { root: bird, head: birdHead, jaw, tip: beakTip, cage },
    gift: { root: gift, lid }, hero: { root: heroRoot, photo: hero },
    party: { root: party, cake, flames, buns },
    lanterns,
    banner: { root: banner, unroll, balloons, W: BW, H: BH },
    /** a speech bubble that faces the phone, his words in the handwriting face */
    bubble(text, o = {}) {
      return kit.picture((c, px) => {
        c.fillStyle = '#fffaf0'; c.strokeStyle = '#6b3a1f'; c.lineWidth = px * .026;
        rounded(c, px * .05, px * .1, px * .9, px * .58, px * .18); c.fill(); c.stroke();
        const t = o.tail ?? .3;
        c.beginPath(); c.moveTo(px * t, px * .66); c.lineTo(px * (t - .05), px * .88); c.lineTo(px * (t + .14), px * .66); c.closePath(); c.fill(); c.stroke();
        c.fillRect(px * (t - .02), px * .62, px * .18, px * .06);
        c.fillStyle = o.ink ?? '#a3271f'; kit.fitText(c, text, { x: px * .1, y: px * .14, w: px * .8, h: px * .5 }, { maxLines: o.lines ?? 2, max: px * .2 });
      }, { size: o.size ?? .13, px: 320 });
    }
  };
};
