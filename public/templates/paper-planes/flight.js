/* Máy bay giấy: how the paper planes fly, for story.js (loaded after paper.js). A plane's day is a list of legs, each
   saying where it is at story time g and act time T: lying somewhere, in a hand, along a path, circling something,
   round a heart. Where one leg hands over to the next the two are blended, so nothing jumps. A flying plane points
   where it goes, banks into its turns, its wings give a little, and it leaves a dashed trail: dashes pinned to moments
   of T, so they stay where it was while it flies on.
     NM_PLANES.flight(kit, paper) → { fleet(n, opts), legs: { hidden, rest, hold, path, orbit, heart, custom }, update } */
(window.NM_PLANES = window.NM_PLANES || {}).flight = (kit, paper) => {
  const { THREE, clamp, lerp, ease } = kit;
  const V = () => new THREE.Vector3();
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

  /* ── legs: at(g, T, out) fills out = { p, fold, scale, q (a fixed turn, or null: it points where it flies), trail, show } ── */
  const state = () => ({ p: V(), fold: 1, scale: 1, q: null, qq: new THREE.Quaternion(), trail: 0, show: true, flex: 1 });
  const legs = {
    hidden: () => ({ at(g, T, o) { o.show = false; o.trail = 0; o.q = null; } }),
    /** lying still at p: yaw its heading, roll how far it has tipped over */
    rest(p, yaw = 0, roll = 0, o2 = {}) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(o2.pitch ?? 0, yaw, roll, 'YXZ'));
      return { at(g, T, o) { o.p.set(p[0], p[1], p[2]); o.fold = o2.fold ?? 1; o.scale = o2.scale ?? 1; o.q = o.qq.copy(q); o.trail = 0; o.show = true; o.flex = 0; } };
    },
    /** wherever fn(g, T, out) puts it (a hand, a sheet held up), turned by face(g, T, quaternion) */
    hold(fn, face, o2 = {}) {
      return { at(g, T, o) { fn(g, T, o.p); o.q = face ? face(g, T, o.qq) : null; o.fold = typeof o2.fold === 'function' ? o2.fold(g) : o2.fold ?? 1;
        o.scale = typeof o2.scale === 'function' ? o2.scale(g) : o2.scale ?? 1; o.trail = 0; o.show = true; o.flex = o2.flex ?? 0; } };
    },
    /** along points (stage space) from story time t0 to t1, eased; it stays at the end afterwards */
    path(pts, t0, t1, o2 = {}) {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal', .5);
      curve.arcLengthDivisions = 160;
      const e = ease[o2.ease || 'linear'];
      return { curve, at(g, T, o) {
        curve.getPointAt(clamp(e(clamp((g - t0) / (t1 - t0)))), o.p);
        o.fold = typeof o2.fold === 'function' ? o2.fold(g) : o2.fold ?? 1; o.scale = typeof o2.scale === 'function' ? o2.scale(g) : o2.scale ?? 1;
        o.q = null; o.trail = o2.trail ?? 1; o.show = true; o.flex = 1;
      } };
    },
    /** round a centre that may move (center(g, T, out)): radius r, w radians a second (by T, so it goes on at a stop), ph its
        place in the ring, tilt how far the ring leans from flat, bob how much it rises and falls */
    orbit(center, r, w, ph = 0, o2 = {}) {
      const c = V();
      return { at(g, T, o) {
        center(g, T, c);
        const a = ph + w * T, rr = typeof r === 'function' ? r(g, T) : r, tilt = o2.tilt ?? 0;
        o.p.set(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * Math.sin(tilt) + (o2.bob ?? .012) * Math.sin(T * 1.7 + ph * 3), c.z + Math.sin(a) * rr * Math.cos(tilt));
        o.fold = 1; o.scale = 1; o.q = null; o.trail = o2.trail ?? 1; o.show = true; o.flex = 1;
      } };
    },
    /** round a heart standing up facing the phone: middle (x, y, z), w wide; u0 its place, speed laps a second (by T) */
    heart(mid, w, u0, speed) {
      const pts = [], len = [0], k = w / 32;
      for (let i = 0; i <= 200; i++) {
        const t = Math.PI + i / 200 * Math.PI * 2;                     // from the tip, up the left and round
        pts.push(new THREE.Vector3(mid[0] + 16 * Math.sin(t) ** 3 * k, mid[1] + (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5) * k, mid[2]));
        if (i) len.push(len[i - 1] + pts[i].distanceTo(pts[i - 1]));
      }
      const total = len[200];
      return { at(g, T, o) {
        const u = (((u0 + speed * T) % 1) + 1) % 1, want = u * total;
        let i = 0; while (i < 199 && len[i + 1] < want) i++;
        o.p.lerpVectors(pts[i], pts[i + 1], (want - len[i]) / ((len[i + 1] - len[i]) || 1));
        o.fold = 1; o.scale = 1; o.q = null; o.trail = 1; o.show = true; o.flex = 1;
      } };
    },
    /** anything else: fn(g, T, out) fills the whole state */
    custom: fn => ({ at: fn })
  };

  /* ── a fleet of planes, each with its legs: [[from g, leg, blend seconds], …] ── */
  function fleet(list, o = {}) {
    return list.map((spec, i) => {
      const plane = paper.plane(spec.face ? { face: spec.face, glow: spec.glow } : { glow: spec.glow });
      plane.root.scale.setScalar(o.size ?? .055); kit.stage.add(plane.root);
      return { ...spec, i, plane, size: spec.size ?? o.size ?? .055, now: state(), a: state(), b: state(), a2: state(), b2: state(),
        qa: new THREE.Quaternion(), qb: new THREE.Quaternion(), seed: (i * 7.31) % 6.28 };
    });
  }
  /** where plane P is at (g, T): the leg it is on, blended with the one before as it hands over. turn: work out its turn
      too where a leg with a fixed turn blends with a flying one (the look-ahead that works out a turn passes false) */
  function where(P, g, T, out, turn = true) {
    const L = P.legs; let i = 0;
    while (i + 1 < L.length && g >= L[i + 1][0]) i++;
    const [t0, leg, blend] = L[i];
    if (!blend || i === 0 || g >= t0 + blend) { leg.at(g, T, out); return out; }
    const k = ease.smooth(clamp((g - t0) / blend)), A = turn ? P.a : P.a2, B = turn ? P.b : P.b2;
    L[i - 1][1].at(g, T, A); leg.at(g, T, B);
    out.p.lerpVectors(A.p, B.p, k); out.fold = lerp(A.fold, B.fold, k); out.scale = lerp(A.scale, B.scale, k);
    out.trail = lerp(A.trail, B.trail, k); out.flex = lerp(A.flex, B.flex, k); out.show = A.show || B.show;
    if (!A.show) { out.p.copy(B.p); out.scale = B.scale * k; }         // coming out of nowhere: grow where it appears
    if (!B.show) { out.p.copy(A.p); out.scale = A.scale * (1 - k); }
    out.q = null;
    if (turn && (A.q || B.q)) {                                        // a fixed turn on either side: blend towards it
      const qa = A.q ? P.qa.copy(A.q) : flyTurn(P, g, T, P.qa), qb = B.q ? P.qb.copy(B.q) : flyTurn(P, g, T, P.qb);
      out.q = out.qq.copy(qa).slerp(qb, k);
    }
    return out;
  }
  const s0 = state(), s1 = state(), s2 = state(), vA = V(), vB = V(), eul = new THREE.Euler(0, 0, 0, 'YXZ');
  let RUN = 1;
  /** the turn of a plane flying: its nose where it goes, banking into the turn */
  function flyTurn(P, g, T, q) {
    const e = .03;
    where(P, g - e * RUN, T - e, s0, false); where(P, g, T, s1, false); where(P, g + e * RUN, T + e, s2, false);
    vA.subVectors(s1.p, s0.p); vB.subVectors(s2.p, s1.p);
    if (vA.lengthSq() < 1e-12 && vB.lengthSq() < 1e-12) return P.lastQ ? q.copy(P.lastQ) : q.identity();
    const turnRate = vA.lengthSq() > 1e-12 && vB.lengthSq() > 1e-12 ? wrap(Math.atan2(vB.x, vB.z) - Math.atan2(vA.x, vA.z)) / e : 0;
    vA.add(vB);
    const yaw = Math.atan2(vA.x, vA.z), pitch = -Math.atan2(vA.y, Math.hypot(vA.x, vA.z)) * .75, roll = clamp(-turnRate * .22, -.7, .7);
    eul.set(pitch, yaw, roll + .06 * Math.sin(T * 5 + P.seed)); return q.setFromEuler(eul);
  }

  /* ── every frame: place each plane, fold it, flex it, draw its trail ── */
  const past = state(), prev = V(), dir = V();
  function update(planes, g, T, held, trails, o = {}) {
    RUN = held ? 0 : 1;
    const DT = o.every ?? .05, N = o.dashes ?? 9;
    if (trails) trails.begin();
    for (const P of planes) {
      const s = where(P, g, T, P.now);
      P.plane.root.visible = s.show && s.scale > .002;
      if (!P.plane.root.visible) continue;
      P.plane.root.position.copy(s.p);
      P.plane.root.scale.setScalar(P.size * s.scale);
      if (s.q) P.plane.root.quaternion.copy(s.q);
      else flyTurn(P, g, T, P.plane.root.quaternion);
      (P.lastQ = P.lastQ || new THREE.Quaternion()).copy(P.plane.root.quaternion);
      P.plane.set(s.fold, s.flex * (.1 * Math.sin(T * 9 + P.seed) + .04 * Math.sin(T * 23 + P.seed * 2)));
      if (s.trail <= .01 || !trails) continue;
      prev.copy(s.p);                                                // dashes at fixed moments of T, so they stay put
      const t0 = Math.floor(T / DT) * DT;
      for (let j = 0; j < N; j++) {
        const tj = t0 - j * DT, gj = g - (T - tj) * RUN;
        where(P, gj, tj, past, false);
        if (!past.show || past.trail <= .01) break;
        dir.subVectors(prev, past.p);
        if (j && dir.lengthSq() > 1e-8) trails.dash(past.p, dir, past.trail * s.trail * .75 * (1 - j / N), o.size ?? .02, o.color ?? '#3d424b');
        prev.copy(past.p);
      }
    }
    if (trails) trails.end();
  }
  return { fleet, legs, update };
};
