/* Suất Chiếu Đặc Biệt, told by the shared act _acts/lovestory.js on the drive-in lot of set.js, in the car of car.js,
   before the screen of screen.js. Six chapters, each ending at a stop (the next tap plays on; after the last, the letter):
     1 ·  0–7     Đèn chiếu bật: night. The convertible rolls into the middle bay and stops; the street lights come on one
                  by one; the projector clicks on, its beam grows with dust in it, the screen turns white and counts
                  down 5-4-3-2-1 to a heart; she points at the screen, he turns to her
     2 ·  7–14    Trailer: SẮP CHIẾU and the film's title (slot title), four quick cuts of photos with the taglines (tag1-4),
                  the screen's light jumping at each cut; she hugs the popcorn box, he sneaks his hand in, she slaps it, they
                  laugh; the trailer ends on the title (CHIẾU NGAY SAU ĐÂY)
     3 ·  14–22   Phim chính: every photo in turn, slow push-ins, letterbox bars, the subtitles (sub1-3); each photo's
                  colour lights the car and them; she leans her head on his shoulder, his arm goes over the seat behind her
     4 ·  22–29   Mưa: rain, thunder far off; the gravel turns wet, two puddles show the screen; he presses a button and the
                  soft top unfolds over them; they look at each other
     5 ·  29–37   Giải lao: GIẢI LAO and its clock; the rain stops, the top folds away; they hop out and run to the photo
                  booth (she goes round the back of the car): four flashes, four poses (wave, point, cheer, a hug); the strip
                  of four photos slides out and she holds it up
     6 ·  37–45   Còn tiếp…: HẾT flickers and turns into the closing words (slot ending) over the first photo in a heart; they
                  run back, hop in, stand and face each other, she hugs him, the horn goes beep beep, fireworks behind the
                  screen, the string lights blaze
   The main film runs on its own clock from chapter 3 (on through the stops), so every photo shows even when the taps come
   quickly. Taps: the car (beep beep, hearts), the popcorn (it jumps), the projector (the beam flashes, a short countdown),
   any photo, the screen too (the act shows it big). Sounds (template.json "sound"): projector, beep, car, pop, rain,
   thunder, softtop, flash, strip, honk, firework, sparkle; the soft music for the main film. */
(window.NM_STORIES = window.NM_STORIES || {})[document.currentScript.src] = kit => {
  const { THREE, stage, ease, seg, lerp, clamp, rng } = kit;
  const H = .24, HG = H * .945;                                       // him (1.80 m) and her, in card widths
  const SECONDS = [7, 7, 8, 7, 8, 8];
  const TAU = Math.PI * 2;
  const ARMS = { boy: [.265, .328], girl: [.23, .308] };              // upper arm, forearm to the fist (metres)
  const NIGHT = { hemi: new THREE.Color('#7f7ec4'), ground: new THREE.Color('#2b2238'), sun: new THREE.Color('#a9b8ff') };
  const words = kit.words;
  const TAGS = [words('tag1', 'Một ngày bình thường…'), words('tag2', '…họ tìm thấy nhau'), words('tag3', 'Cùng nhau đi qua mưa nắng'), words('tag4', 'Chuyện tình chưa có hồi kết')];
  const SUBS = [words('sub1', 'Cảm ơn em đã đến bên anh.'), words('sub2', 'Mỗi ngày có em là một thước phim đẹp.'), words('sub3', 'Mình xem phim cùng nhau đến già nhé.')];
  let props, set, car, screen, boy, girl, hearts, sparks, fireworks, probe, camera = null;
  let c = 0, lt = 0, held = false, T = 0, dt = 0, filmT0 = null, chapterSeen = -1;
  const poked = { car: -9, pop: -9, proj: -9, boy: -9, girl: -9 };
  const R = {}, eStrip = new THREE.Euler();                           // the runs (makeRoutes), the strip's turn

  const prog = (ch, a, b) => (c < ch ? 0 : c > ch ? 1 : seg(lt, a, b));
  const pulse = (ch, a, b) => (c === ch ? Math.sin(Math.PI * seg(lt, a, b)) : 0);
  const once = (ch, x, key) => c === ch && lt >= x && kit.once(key);

  /* ── maths on the stage ── */
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), vS = new THREE.Vector3(), vE = new THREE.Vector3(), vD = new THREE.Vector3(), vP = new THREE.Vector3(), vT = new THREE.Vector3();
  const qInv = new THREE.Quaternion(), AIM = [0, 0, 0];
  const onStage = (o, out) => stage.worldToLocal(o.getWorldPosition(out));
  const turnTo = (a, b, k) => a + (((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI) * k;
  /** an arm reaching for a point on the stage: the elbow found from the two bones' lengths, bent down and out */
  function reach(p, side, target, k) {
    if (k <= 0) return;
    const m = p.m, s = m.scene.scale.x, [ua, fa] = ARMS[p.key], a = ua * s, b = fa * s, out = side === 'l' ? 1 : -1;
    onStage(m.node(`upperarm.${side}`), vS);
    vD.subVectors(target, vS); const L = clamp(vD.length(), .3 * (a + b), .995 * (a + b)); vD.normalize();
    const cosA = clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    vP.set(out * .5, -1, -.2).applyQuaternion(m.root.quaternion); vP.addScaledVector(vD, -vP.dot(vD)).normalize();
    vE.copy(vS).addScaledVector(vD, a * cosA).addScaledVector(vP, a * sinA);
    qInv.copy(m.root.quaternion).invert();
    m.aim(`upperarm.${side}`, vT.subVectors(vE, vS).applyQuaternion(qInv).toArray(AIM), k);
    m.aim(`lowerarm.${side}`, vT.copy(vS).addScaledVector(vD, L).sub(vE).applyQuaternion(qInv).toArray(AIM), k);
  }
  /** a point in someone's own frame (card widths: +x their left, +z ahead), on the stage */
  const inFrame = (p, x, y, z, out) => out.set(x, y, z).applyAxisAngle(UP, p.m.root.rotation.y).add(p.m.root.position);
  const UP = new THREE.Vector3(0, 1, 0);
  /** a path through points [x, z], measured: where s along it is, and which way it runs there */
  function path(pts) {
    const P = pts.map(p => new THREE.Vector2(p[0], p[1])), Ls = [0];
    for (let i = 1; i < P.length; i++) Ls.push(Ls[i - 1] + P[i].distanceTo(P[i - 1]));
    return { length: Ls[Ls.length - 1], at(s) {
      let i = 1; while (i < P.length - 1 && Ls[i] < s) i++;
      const a = P[i - 1], b = P[i], k = clamp((s - Ls[i - 1]) / (Ls[i] - Ls[i - 1] || 1));
      return [lerp(a.x, b.x, k), lerp(a.y, b.y, k), Math.atan2(b.x - a.x, b.y - a.y)];
    } };
  }
  const yawToPhone = (x, z, fallback = 0) => {
    if (!camera) return fallback;
    camera.getWorldPosition(v2); stage.worldToLocal(v2); return Math.atan2(v2.x - x, v2.z - z);
  };

  /* ── the couple ── */
  const place = (p, x, y, z, yaw) => { p.m.root.position.set(x, y, z); p.m.root.rotation.y = yaw; };
  /** in their seat; slide: how far over towards the other (she on his right, so her left; he the other way) */
  const seated = (p, slide = 0) => {
    const s = car.seat(p.key), d = slide * -p.side; place(p, s.x + Math.cos(s.yaw) * d, s.y, s.z - Math.sin(s.yaw) * d, s.yaw);
  };
  /** a run along route r between lt a and b in chapter ch (Running_A, its feet keeping pace) */
  function run(p, r, a, b) {
    const ramp = .22, v = r.length / (b - a - 2 * ramp + 2 * ramp / 3), e0 = v * ramp / 3;   // an even pace, eased in and out
    const s = kit.tween(lt, [[a, 0], [a + ramp, e0, 'in'], [b - ramp, r.length - e0, 'linear'], [b, r.length, 'out']]), [x, z, h] = r.at(s);
    place(p, x, set.FLOOR, z, h);
    const pace = Math.min(1, seg(lt, a, a + ramp), 1 - seg(lt, b - ramp, b)) ** 2;
    p.m.play('Running_A', { speed: Math.max(.4, v * pace / (2 * p.H)), fade: .2 });
  }
  /** a hop: from a to b (stage points) over lt t0…t1, an arc this high */
  function hop(p, a, b, t0, t1, up, yaw) {
    const k = seg(lt, t0, t1), e = ease.inOut(k);
    place(p, lerp(a.x, b.x, e), lerp(a.y, b.y, e) + up * Math.sin(Math.PI * k), lerp(a.z, b.z, e), yaw);
    p.m.play('Jump_Full_Short', { once: true, speed: 2.4, fade: .12 });
  }

  /* ── the lot's light: night, the lamps, the screen's colour on everything ── */
  const cG = new THREE.Color();
  function lights() {
    const L = kit.lights, lampsOn = [0, 1, 2, 3].map(i => (c > 0 ? 1 : ease.out(seg(lt, 1.2 + i * .45, 1.32 + i * .45)) * (lt < 1.5 + i * .45 ? .6 + .4 * Math.sin(lt * 70) ** 2 : 1)));
    const rain = rainK(), finale = prog(5, 3.3, 4.2);
    const base = lerp(.55, 1, (lampsOn[0] + lampsOn[3]) / 2) * (1 - .25 * rain);
    const bright = clamp(screen.light.intensity / 3.1);
    cG.copy(screen.glow).multiplyScalar(1 / Math.max(.3, screen.glow.r, screen.glow.g, screen.glow.b));
    L.hemi.color.copy(NIGHT.hemi).lerp(cG, .6 * bright);             // the picture's colour spills over the lot
    L.hemi.groundColor.copy(NIGHT.ground).lerp(cG, .35 * bright);
    L.hemi.intensity = .5 * base + .25 * finale; L.sun.color.copy(NIGHT.sun); L.sun.intensity = .28 * base;
    set.sideLights.forEach((l, i) => { l.intensity = .55 * Math.max(lampsOn[i * 2], lampsOn[i * 2 + 1]) * (1 + .5 * finale); });
    set.lampsAt(lampsOn);
    for (let i = 0; i < 4; i++) if (once(0, 1.2 + i * .45, `lamp${i}`)) kit.sfx('pop', { volume: .18, rate: 1.7 + i * .1 });   // each switch's click
    const chase = (i, speed = 6, n = 4) => .55 + .45 * (Math.floor(T * speed + i) % n === 0 ? 1 : .35);
    set.bulbsAt((g, i) => {
      if (g === 'lamp') return lampsOn[i % 4] * 1.2;
      if (g === 'string') return Math.min(lampsOn[0], lampsOn[2]) * (.8 + .12 * Math.sin(T * 3 + i * 1.7)) * (1 - finale) + finale * (1.1 + .5 * (Math.sin(T * 9 - i * .6) > .3 ? 1 : 0));
      if (g === 'gate') return lampsOn[1] * chase(i);
      if (g === 'stand') return lampsOn[0] * (.55 + .5 * prog(4, .4, 1));
      if (g === 'booth') return lampsOn[0] * .5 + prog(4, 1.5, 2) * .6;
      return 1;
    });
    set.standLight.intensity = .35 * lampsOn[0] + .5 * prog(4, .4, 1);
    set.sky.material.color.setScalar(1 - .25 * rain);
  }
  const rainK = () => (c === 3 ? ease.smooth(seg(lt, .2, 1.2)) : c === 4 ? 1 - ease.smooth(seg(lt, 0, .9)) : 0);

  /* ── the screen, chapter by chapter ── */
  function projection() {
    const st = { T, power: 0, shots: [], puddles: 0, rain: rainK() };
    const on = prog(0, 2.75, 3.4);                                   // the projector's white light
    st.power = on * (c === 0 ? 1 : 0) + (c > 0 ? 1 : 0);
    if (c === 0) {                                                    // the countdown leader: 5…1 and a heart, the sweep going round
      const t0 = 3.6, step = .6, i = Math.floor((lt - t0) / step);
      if (lt >= t0) {
        const n = i >= 5 ? 0 : 5 - i;
        st.leader = { n, sweep: n ? ((lt - t0) / step) % 1 : (T * .8) % 1, k: ease.smooth(seg(lt, t0, t0 + .25)) };
        for (let k = 0; k < 6; k++) if (lt >= t0 + k * step && kit.once(`beep${k}`)) kit.sfx('beep', { volume: .5, rate: k === 5 ? 1.5 : 1 });
      }
    } else if (c === 1) {                                             // the trailer
      const cutAt = [1.5, 2.7, 3.9, 5.1], n = screen.reel.count();
      st.leader = lt < .35 ? { n: 0, sweep: (T * .8) % 1, k: 1 - seg(lt, 0, .35) } : null;
      if (lt < 1.6) st.card = { key: 'soon', k: ease.smooth(seg(lt, .2, .55)) * (1 - seg(lt, 1.45, 1.6)) };
      cutAt.forEach((a, i) => {
        if (lt >= a && lt < a + 1.2) {
          st.shots = [{ j: Math.floor(i * Math.max(1, n) / 4), move: [0, 3, 1, 5][i], p: .15 + (lt - a) / 1.2 * .85, k: 1 }];
          st.cap = TAGS[i]; st.capK = ease.smooth(seg(lt, a + .12, a + .3)) * (1 - seg(lt, a + 1.05, a + 1.18));
          st.flash = .9 * (1 - seg(lt, a, a + .14));
          if (kit.once(`cut${i}`)) kit.sfx('pop', { volume: .25, rate: .7 });
        }
      });
      if (lt >= 6.3) st.card = { key: 'title', k: ease.smooth(seg(lt, 6.3, 6.7)) };
      st.flash = Math.max(st.flash || 0, .7 * pulse(1, 6.28, 6.45));
    } else if (c === 2 || c === 3) {                                  // the main film, on its own clock
      if (filmT0 === null) filmT0 = T;
      st.shots = screen.film(T - filmT0);
      st.bars = c === 2 ? ease.smooth(seg(lt, 0, .6)) : 1;
      if (c === 2) {
        const at = [[.6, 3], [3.2, 5.5], [5.7, 99]].findIndex(([a, b]) => lt >= a && lt < b);
        if (at >= 0) { st.sub = SUBS[at]; st.subK = ease.smooth(seg(lt, [.6, 3.2, 5.7][at], [.6, 3.2, 5.7][at] + .3)); }
        st.flash = .5 * pulse(2, 0, .18);
      }
      if (c === 3) st.puddles = ease.smooth(seg(lt, 1, 2.6));
    } else if (c === 4) {                                             // the break
      if (filmT0 !== null && lt < .7) { st.shots = screen.film(T - filmT0); st.shotK = 1 - seg(lt, 0, .6); st.bars = 1 - seg(lt, .2, .7); }
      st.card = { key: 'break', k: ease.smooth(seg(lt, .3, .8)) };
      st.puddles = 1 - ease.smooth(seg(lt, 0, 3));
    } else {                                                          // HẾT, then the closing words over the first photo in a heart
      const end = c === 5 && lt < 2.3, fl = Math.sin(T * 47) > -.2 ? 1 : .45;
      st.card = end ? { key: 'end', k: ease.smooth(seg(lt, 0, .35)) * (lt > 1.6 ? fl * (1 - seg(lt, 2.05, 2.3)) : 1) } : { key: 'more', k: ease.smooth(seg(lt, 2.1, 2.7)) };
      if (once(5, 2.2, 'more')) kit.sfx('sparkle', { volume: .6 });
    }
    const pk = T - poked.proj;                                        // a tap on the projector: a flash and a quick 3-2-1
    if (pk >= 0 && pk < 1.9) {
      const n = 3 - Math.floor(pk / .55); st.flash = Math.max(st.flash || 0, .8 * (1 - seg(pk, 0, .2)));
      if (n > 0) st.leader = { n, sweep: (pk / .55) % 1, k: 1 - seg(pk, 1.6, 1.9) };
      for (let k = 0; k < 3; k++) if (pk >= k * .55 && kit.once(`tap-beep${poked.proj.toFixed(3)}-${k}`)) kit.sfx('beep', { volume: .45 });
    }
    screen.show(st);
  }

  return {
    seconds: SECONDS,

    build() {
      props = window.NM_DRIVEIN_PROPS(kit);
      set = window.NM_DRIVEIN_SET(kit, props);
      car = window.NM_DRIVEIN_CAR(kit, props, set);
      screen = window.NM_DRIVEIN_SCREEN(kit, set);
      boy = { key: 'boy', H, side: 1, m: kit.model('boy').fit({ height: H }) };
      girl = { key: 'girl', H: HG, side: -1, m: kit.model('girl').fit({ height: HG }) };
      for (const p of [boy, girl]) {
        stage.add(p.m.root); set.night(p.m.root, .8);
        const hit = new THREE.Mesh(kit.keep(new THREE.CylinderGeometry(.035, .035, p.H * .8, 8)), kit.keep(new THREE.MeshBasicMaterial()));
        hit.visible = false; hit.userData.proxy = true; hit.position.y = p.H * .5; p.m.root.add(hit);
        kit.onTap(hit, () => { poked[p.key] = T; });
      }
      kit.onTap(car.root, () => { poked.car = T; });                  // anywhere on the car (the ticket keeps its own: it shows its photo)
      kit.onTap(car.popcorn, () => { poked.pop = T; });
      kit.onTap(set.podium, () => { poked.proj = T; });
      hearts = kit.particles({ max: 160 }); sparks = kit.particles({ max: 300, additive: true }); fireworks = kit.particles({ max: 900, additive: true });
      stage.add(hearts.root, sparks.root, fireworks.root);
      probe = new THREE.Mesh(kit.keep(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3))),
        kit.keep(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false })));
      probe.frustumCulled = false; probe.raycast = () => {}; probe.onBeforeRender = (r, s, cam) => { camera = cam; }; stage.add(probe);
      makeRoutes();
    },

    reset() {
      [hearts, sparks, fireworks, set.rain].forEach(p => p.clear());
      boy.m.stop(); girl.m.stop(); filmT0 = null; chapterSeen = -1;
      for (const k in poked) poked[k] = -9;
      set.strip.visible = false; car.top.set(0); set.wet(0);
    },

    pose(f) {
      c = f.chapter; lt = Math.min(f.t, SECONDS[c]); held = f.held; T = f.T; dt = f.dt;
      if (c !== chapterSeen) { if (c < 2) filmT0 = null; chapterSeen = c; }
      kit.music(c === 2 ? 'soft' : 'music');
      projection();
      lights();
      lot();
      couple();
      taps();
      [hearts, sparks, fireworks].forEach(p => p.update(dt, T));
    }
  };

  /* ── where they run: built once the lot is up ── */
  function makeRoutes() {
    const B = set.booth, at = (x, z) => { v1.set(x, 0, z).applyMatrix4(B.matrix); return [v1.x, v1.z]; };
    B.updateMatrix();
    const inside = set.boothProp.has('inside') ? set.boothProp.point('inside', new THREE.Vector3()) : new THREE.Vector3();
    const door = set.boothProp.has('door') ? set.boothProp.point('door', new THREE.Vector3()) : new THREE.Vector3(0, 0, set.boothSize[2] / 2);
    const lx = .031, out = door.z + .07;
    R.in = { boy: at(inside.x - lx, inside.z), girl: at(inside.x + lx, inside.z) };
    R.door = { boy: at(door.x - lx, door.z + .03), girl: at(door.x + lx, door.z + .03) };
    R.front = { boy: at(door.x - .03, out + .025), girl: at(door.x + .075, out) };
    R.faceOut = B.rotation.y;
    const side = (s, z) => { const p = car.onStage(new THREE.Vector3(s * 1.32, 0, z)); return [p.x, p.z]; };
    R.land = { boy: side(1, -.15), girl: side(-1, -.15) };
    const tail = car.onStage(new THREE.Vector3(0, 0, -3.15)), tailL = car.onStage(new THREE.Vector3(1.3, 0, -2.9)), tailR = car.onStage(new THREE.Vector3(-1.3, 0, -2.9));
    R.toBooth = { boy: path([R.land.boy, [lerp(R.land.boy[0], R.door.boy[0], .5), R.door.boy[1] + .08], R.door.boy]),
      girl: path([R.land.girl, [tailR.x, tailR.z], [tail.x, tail.z], [tailL.x, tailL.z], [R.door.girl[0] + .03, R.door.girl[1] + .1], R.door.girl]) };
    R.toCar = { boy: path([R.front.boy, [lerp(R.front.boy[0], R.land.boy[0], .5), R.front.boy[1] + .02], R.land.boy]),
      girl: path([R.front.girl, [tailL.x, tailL.z + .02], [tail.x, tail.z + .02], [tailR.x, tailR.z], R.land.girl]) };
  }

  /* ── the lot: the car, the lamps, the projector, rain, the top, the booth, fireworks ── */
  function lot() {
    /* the car rolls in and stops; its headlights go out for the show */
    const roll = c === 0 ? ease.out(seg(lt, .15, 3.1)) : 1;
    car.at(.42 * (1 - roll));
    if (once(0, .1, 'car')) kit.sfx('car', { volume: .6 });
    /* the projector clicks on, its beam grows with a flicker; a tap flashes it */
    if (once(0, 2.6, 'projector')) kit.sfx('projector', { volume: .6 });
    const on = prog(0, 2.7, 3.6) * (c === 0 && lt < 3.5 ? .7 + .3 * (Math.sin(lt * 53) > 0 ? 1 : 0) : 1), pk = T - poked.proj;
    set.beamAt(on * (1 + 1.6 * (pk >= 0 && pk < .5 ? 1 - pk / .5 : 0)), T, dt);
    /* rain, the wet gravel, the thunder */
    const rk = rainK();
    set.rainAt(rk, T, dt);
    set.wet(c === 3 ? ease.smooth(seg(lt, .4, 3)) : c === 4 ? 1 - .5 * seg(lt, 0, 8) : c > 4 ? .5 : 0);
    if (once(3, 0, 'rain')) kit.sfx('rain', { volume: .7 });          // 7 s, faded in and out: again now and then while it waits
    if (c === 3 && held && kit.once(`rain${Math.floor(T / 6.5)}`)) kit.sfx('rain', { volume: .6 });
    if (once(3, 1.3, 'thunder')) kit.sfx('thunder', { volume: .7 });
    const bolt = c === 3 ? Math.max(pulse(3, 1.3, 1.5), .7 * pulse(3, 1.62, 1.75)) : 0;
    set.skyFlash.material.opacity = .38 * bolt;
    /* the soft top: up in the rain, away at the break */
    const top = c === 3 ? ease.inOut(seg(lt, 2.2, 3.6)) : c === 4 ? 1 - ease.inOut(seg(lt, .3, 1.3)) : 0;
    car.top.set(top);
    if (once(3, 2.2, 'softtop')) kit.sfx('softtop', { volume: .7 });
    if (once(4, .3, 'softtop-down')) kit.sfx('softtop', { volume: .5, rate: 1.15 });
    /* the booth: its curtain sways at each flash, the flash itself */
    const FL = [4.2, 4.7, 5.2, 5.7];
    let flash = 0; FL.forEach((a, i) => {                             // the sound whines first: its bulb pops .52 s in
      const k = c === 4 ? 1 - seg(lt, a, a + .22) : 0; if (c === 4 && lt >= a) flash = Math.max(flash, k);
      if (once(4, a - .5, `flash${i}`)) kit.sfx('flash', { volume: .7 });
    });
    set.flash.light.intensity = 9 * flash; set.flash.glow.material.opacity = flash; set.flash.mesh.material.emissiveIntensity = .2 + 4 * flash;
    set.boothLamp.forEach(m => { m.emissiveIntensity = (c === 4 ? .8 : .4) + 6 * flash; });
    set.curtainAt(c === 4 ? .4 + flash : 0, T);
    /* the strip: out of the slot, then in her hands */
    stripAt();
    /* the radio plays to them, the car's own bounce and kernels */
    car.update(T, dt, c < 3 ? 1 : 0);
    /* fireworks behind the screen at the end, on through the stop */
    if (c === 5 && lt >= 3.5) {
      const SHOW = [3.5, 4.0, 4.5, 5.1, 5.6, 6.2, 6.8, 7.4];
      SHOW.forEach((a, i) => { if (lt >= a) shell(`fw${i}`); });
      if (held) shell(`fw-held${Math.floor(T / .8)}`);
      SHOW.forEach((a, i) => { if (i % 2 === 0 && lt >= a - .05 && kit.once(`bang${i}`)) kit.sfx('firework', { volume: .55, rate: .9 + .1 * i % .3 }); });
      if (held && kit.once(`bang-held${Math.floor(T / 1.6)}`)) kit.sfx('firework', { volume: .45 });
    }
    if (c === 5 && lt > 3.3 && dt && rng() < dt * 5) hearts.emit({ x: car.root.position.x + (rng() - .5) * .2, y: .22, z: car.root.position.z + (rng() - .5) * .2, vy: .08, sway: .03, color: ['#ff6f91', '#ffb3c8', '#ffc56b'][(rng() * 3) | 0], size: .018, life: 2.4, shape: 'heart' });
    if (c === 2 && lt > 1.5 && dt && rng() < dt * 1.6) hearts.emit({ x: car.root.position.x + (rng() - .5) * .1, y: .22, z: car.root.position.z - .02, vx: (rng() - .5) * .02, vy: .05, vz: -.04, sway: .02, color: '#ff8fab', size: .016, life: 3, shape: 'heart' });
  }
  function shell(key) {
    if (!kit.once(key)) return;
    const x = (rng() - .5) * 1.3, y = Math.abs(x) > .62 ? .55 + rng() * .4 : .96 + rng() * .2, z = -.45;
    const cols = [['#ffd166', '#fff1b8'], ['#ff6f91', '#ffd1dc'], ['#9be7ff', '#ffffff'], ['#c5a3ff', '#ffd1dc'], ['#ffc56b', '#ff6f91']][(rng() * 5) | 0];
    fireworks.burst(34, i => { const a = i / 34 * TAU + rng() * .2, s = .1 + rng() * .06; return { x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, gravity: -.1, drag: 1.4,
      color: cols[i % 3 ? 0 : 1], size: .016 + rng() * .008, life: 1.1 + rng() * .5, shape: i % 4 ? 'glow' : 'sparkle', twinkle: i % 2 ? 10 : 0 }; });
    for (let k = 1; k < 6; k++) fireworks.emit({ x: x + (rng() - .5) * .004, y: y - k * .035, z, vy: -.01, color: cols[1], size: .009, life: .25 + k * .05, shape: 'glow' });
  }

  /* the strip: it slides out of the slot after the last flash, she takes it and holds it up; at the end she tosses it up
     across the booth's front, over its door, where it hangs for everyone to see */
  function stripAt() {
    const S = set.strip, out = prog(4, 5.9, 6.45), take = prog(4, 6.75, 7.15), toss = prog(5, .05, .65);
    S.visible = c >= 5 || (c === 4 && lt >= 5.9);
    if (!S.visible) return;
    if (once(4, 5.9, 'strip')) kit.sfx('strip', { volume: .7 });
    set.booth.updateMatrixWorld(true);
    onStage(set.slot, v1); const by = set.booth.rotation.y;
    const sx = Math.max(.05, ease.out(out));
    const slotPos = v2.set(Math.cos(by), 0, -Math.sin(by)).multiplyScalar(set.STRIP.w / 2 * sx).add(v1);
    let pos = slotPos, yaw = by, k = 0;
    if (take > 0) {                                                   // overhead in her hands
      const l = girl.m.node('handslot.l'), r = girl.m.node('handslot.r');
      if (l && r) { onStage(l, vS); onStage(r, vE); vS.add(vE).multiplyScalar(.5).add(vP.set(0, .062, 0)); pos = slotPos.clone().lerp(vS, ease.inOut(take)); }
      yaw = turnTo(by, yawToPhone(pos.x, pos.z, by), take); k = take;
    }
    if (toss > 0) {                                                   // up across the booth's front
      const roof = set.booth.localToWorld(vT.set(0, set.boothSize[1] - set.STRIP.h / 2 - .012, set.boothSize[2] / 2 + .012)); stage.worldToLocal(roof);   // across its front, over the door
      pos = pos.clone().lerp(roof, ease.inOut(toss)); pos.y += .12 * Math.sin(Math.PI * toss); yaw = turnTo(yaw, by, toss);
      if (once(5, .1, 'toss')) kit.sfx('sparkle', { volume: .45 });
    }
    S.position.copy(pos); S.scale.set(lerp(sx, 1, Math.max(take, toss)), 1, 1);
    eStrip.set(0, yaw, (k * (1 - toss) * .04 + toss * .015) * Math.sin(T * 2.3)); S.quaternion.setFromEuler(eStrip);
  }

  /* ── the couple, chapter by chapter ── */
  function couple() {
    for (const p of [boy, girl]) whereAndClip(p);
    gestures();
  }
  function whereAndClip(p) {
    const m = p.m, k = p.key;
    if (c <= 3 || (c === 4 && lt < 1.05)) {                           // in their seats (she slides over to lean on him)
      seated(p, p === girl ? .022 * (prog(2, .8, 1.8) - prog(3, 1.5, 2.2) + prog(3, 3.9, 4.6) - prog(4, 0, .6)) : 0);
      m.play('Sit_Chair_Idle', { fade: .3 });
      return;
    }
    if (c === 4) {
      const st = car.stand(k, 0), se = car.seat(k);
      if (lt < 1.75) {                                                 // up from the seat, in the car
        const e = ease.inOut(seg(lt, 1.05, 1.75));
        place(p, lerp(se.x, st.x, e), lerp(se.y, st.y, e), lerp(se.z, st.z, e), se.yaw);
        m.play('Sit_Chair_StandUp', { once: true, speed: 1.5, fade: .2 });
      } else if (lt < 2.2) {                                           // a hop over the door
        hop(p, st, { x: R.land[k][0], y: set.FLOOR, z: R.land[k][1] }, 1.75, 2.2, .045, turnTo(se.yaw, se.yaw + (p === boy ? -1 : 1) * Math.PI / 2, ease.out(seg(lt, 1.75, 2)) * .7));
        if (once(4, 2.15, `land-${k}`)) kit.sfx('pop', { volume: .2, rate: .5 });
      } else if (lt < (p === boy ? 3.1 : 3.65)) {                      // to the booth (she goes round the back of the car)
        run(p, R.toBooth[k], 2.2, p === boy ? 3.1 : 3.65);
      } else if (lt < 4.05) {                                          // in at the door, round to face out
        const wait = p === boy && lt < 3.62;                       // he waits at the door for her
        if (wait) { place(p, R.door[k][0], set.FLOOR, R.door[k][1], turnTo(R.faceOut + Math.PI, R.faceOut + .9, ease.inOut(seg(lt, 3.1, 3.4)))); m.play('Idle', { fade: .25 }); return; }
        const e = ease.inOut(seg(lt, 3.65, 4.0));
        place(p, lerp(R.door[k][0], R.in[k][0], e), set.FLOOR, lerp(R.door[k][1], R.in[k][1], e), turnTo(R.faceOut + Math.PI, R.faceOut, ease.inOut(seg(lt, 3.75, 4.05))));
        m.play('Walking_A', { speed: .8, fade: .2 });
      } else if (lt < 6.3) {                                           // the four poses
        place(p, R.in[k][0], set.FLOOR, R.in[k][1], R.faceOut);
        const pose = lt < 4.7 ? 'Wave' : lt < 5.2 ? 'Point' : 'Idle';
        m.play(pose, { fade: .12 });
      } else {                                                         // out in front, the strip held up
        const e = ease.inOut(seg(lt, 6.3, 6.85));
        place(p, lerp(R.in[k][0], R.front[k][0], e), set.FLOOR, lerp(R.in[k][1], R.front[k][1], e), R.faceOut + (p === boy ? .15 : -.1) * e);
        m.play(lt < 6.85 ? 'Walking_A' : 'Idle', { speed: .8, fade: .25 });
      }
      return;
    }
    /* chapter 6: back to the car, a hop in, up in it facing each other */
    const st = car.stand(k, prog(5, 2.2, 2.8)), se = car.seat(k), arrive = p === boy ? 1.0 : 1.5, leave = p === boy ? 0 : .45;
    if (lt < leave) { place(p, R.front[k][0], set.FLOOR, R.front[k][1], R.faceOut - .1); m.play('Idle', { fade: .2 }); return; }
    if (lt < arrive) { run(p, R.toCar[k], leave, arrive); return; }
    if (lt < arrive + .45) { hop(p, { x: R.land[k][0], y: set.FLOOR, z: R.land[k][1] }, car.stand(k, 0), arrive, arrive + .45, .05, se.yaw + (p === boy ? 1 : -1) * Math.PI / 2 * (1 - ease.inOut(seg(lt, arrive, arrive + .45)))); return; }
    const face = turnTo(se.yaw, se.yaw + (p === boy ? -1 : 1) * Math.PI / 2, ease.inOut(seg(lt, 1.95, 2.5)));
    place(p, st.x, st.y, st.z, face);
    m.play('Idle', { fade: .3 });
  }

  /** what their arms and heads do over the clips: bend the back first, then aim */
  function gestures() {
    const b = boy.m, g = girl.m;
    /* seated, the clip's soles sink under the car's sill: tuck the shins back (−55° at the knee) */
    const tuck = c <= 3 ? 1 : c === 4 ? 1 - ease.inOut(seg(lt, .95, 1.35)) : 0;
    if (tuck) for (const m of [b, g]) { m.bend('LeftLeg', -.96 * tuck, 0, 0); m.bend('RightLeg', -.96 * tuck, 0, 0); }
    /* 1: she points at the screen, he turns to her */
    const point = pulse(0, 4.2, 6.6) ** .5 * (c === 0 ? 1 : 0) + (c === 0 && held ? 0 : 0);
    if (point) { g.aim('upperarm.r', [-.28, .62, .73], point); g.aim('lowerarm.r', [-.18, .55, .82], point); }
    const turn = c === 0 ? ease.inOut(seg(lt, 5, 5.6)) : c === 1 ? 1 - ease.inOut(seg(lt, 0, .5)) : 0;
    if (turn) { b.bend('neck', 0, -.3 * turn, 0); b.bend('head', -.04 * turn, -.45 * turn, 0); }
    /* 2: the popcorn: in her hands; his hand sneaks in, a slap, a laugh */
    const hold = c === 1 ? ease.smooth(seg(lt, .2, .8)) : c >= 2 && c <= 3 ? 1 : 0;
    const pop = car.popcorn;
    if (hold && c <= 1) {
      const lap = inFrame(girl, .004, .08, -.004, v1);                 // over her knees
      reach(girl, 'l', lap.clone().add(inFrame(girl, .012, 0, 0, v2).sub(girl.m.root.position)), hold);
      reach(girl, 'r', lap.clone().add(inFrame(girl, -.012, 0, 0, v2).sub(girl.m.root.position)), hold * (1 - pulse(1, 3.3, 3.75)));
      pop.position.copy(lap).add(new THREE.Vector3(0, -.024, 0)); pop.rotation.y = girl.m.root.rotation.y;
    } else {                                                          // otherwise it rides on the bench between them
      const s1 = car.seat('boy'), s2 = car.seat('girl');
      pop.position.set((s1.x + s2.x) / 2 - Math.sin(s1.yaw) * .03, s1.y + .062, (s1.z + s2.z) / 2 - Math.cos(s1.yaw) * .03); pop.rotation.y = s1.yaw;
      pop.visible = c <= 3 || c === 5;
    }
    if (c === 1) pop.visible = true;
    const sneak = pulse(1, 2.3, 3.6) ** .6, slap = pulse(1, 3.3, 3.7);
    if (sneak) { onStage(pop, v1); v1.y += car.PB.h + .004; reach(boy, 'r', v1, sneak); b.bend('chest', 0, 0, -.06 * sneak); }
    if (slap) { b.node('handslot.r') && onStage(b.node('handslot.r'), v2); reach(girl, 'r', v2, slap); }
    if (once(1, .5, 'pop0')) { car.pop(5, .8); kit.sfx('pop', { volume: .4 }); }
    if (once(1, 3.1, 'pop1')) { car.pop(6, 1); kit.sfx('pop', { volume: .45, rate: 1.2 }); }
    if (once(1, 3.48, 'pop2')) { car.pop(10, 1.3); kit.sfx('pop', { volume: .5, rate: .9 }); }
    const laugh = c === 1 ? ease.smooth(seg(lt, 3.75, 4.1)) * (1 - ease.smooth(seg(lt, 5.4, 5.9))) : 0;
    if (laugh) for (const m of [b, g]) { m.bend('chest', (-.06 + .05 * Math.sin(T * 21)) * laugh, 0, 0); m.bend('head', -.22 * laugh, 0, 0); }
    /* 3: she leans her head on his shoulder; his arm along the seat behind her */
    const lean = c === 2 ? ease.inOut(seg(lt, 1, 2.1)) : c === 3 ? 1 - ease.inOut(seg(lt, 1.4, 1.9)) + ease.inOut(seg(lt, 4.6, 5.4)) * .8 : 0;
    if (lean) { g.bend('spine', 0, 0, -.2 * lean); g.bend('chest', 0, 0, -.22 * lean); g.bend('head', 0, .1 * lean, -.32 * lean); b.bend('chest', 0, 0, -.06 * lean); }
    const arm = c === 2 ? ease.inOut(seg(lt, 1.7, 2.8)) : c === 3 ? 1 - ease.inOut(seg(lt, 1.3, 1.7)) + ease.inOut(seg(lt, 4.8, 5.6)) : 0;
    if (arm) { b.aim('upperarm.r', [-.9, .3, -.3], arm); b.aim('lowerarm.r', [-.8, -.2, -.56], arm); }   // along the seat's back, behind her
    /* 4: his hand to the button; both look up at the top; they look at each other */
    const press = pulse(3, 1.5, 2.4) ** .6;
    if (press) { inFrame(boy, -.03, .118, .085, v1); reach(boy, 'r', v1, press); }
    const up = c === 3 ? ease.inOut(seg(lt, 2.4, 2.9)) * (1 - ease.inOut(seg(lt, 3.5, 4))) : 0;
    if (up) for (const m of [b, g]) m.bend('head', -.35 * up, 0, 0);
    const look = c === 3 ? ease.inOut(seg(lt, 3.9, 4.5)) : 0;
    if (look) { b.bend('neck', 0, -.32 * look, 0); b.bend('head', 0, -.4 * look, 0); g.bend('neck', 0, .32 * look, 0); g.bend('head', .03 * look, .42 * look, 0); }
    /* 5: in the booth, a pose a flash: wave, point (the clips), cheer, a hug; then the strip held up */
    if (c === 4 && lt >= 5.2 && lt < 5.7) {
      const k = ease.out(seg(lt, 5.15, 5.3));
      for (const m of [b, g]) { m.aim('upperarm.l', [.55, .82, .12], k); m.aim('lowerarm.l', [.25, 1, .1], k); m.aim('upperarm.r', [-.55, .82, .12], k); m.aim('lowerarm.r', [-.25, 1, .1], k); }
    }
    if (c === 4 && lt >= 5.65 && lt < 6.4) {
      const k = ease.out(seg(lt, 5.62, 5.8));
      b.aim('upperarm.l', [.8, .35, -.3], k); b.aim('lowerarm.l', [.55, .2, -.8], k);
      g.bend('head', 0, 0, .3 * k); g.aim('upperarm.r', [-.7, -.55, -.35], k); g.aim('lowerarm.r', [-.3, -.2, -.93], k);
    }
    const raise = c === 4 ? ease.inOut(seg(lt, 6.75, 7.2)) : c === 5 ? 1 - ease.inOut(seg(lt, .25, .6)) : 0;   // up, then the toss
    if (raise) {
      const bob = .05 * Math.sin(T * 3);
      g.aim('upperarm.r', [-.3, .9, .22], raise); g.aim('lowerarm.r', [.05 + bob, 1, .12], raise);
      g.aim('upperarm.l', [.3, .9, .22], raise); g.aim('lowerarm.l', [-.05 - bob, 1, .12], raise);
    }
    const cheer = c === 4 ? ease.inOut(seg(lt, 7, 7.4)) : c === 5 ? 1 - ease.inOut(seg(lt, 0, .3)) : 0;
    if (cheer) { b.aim('upperarm.r', [-.45, .82, .3], cheer); b.aim('lowerarm.r', [-.3 + .1 * Math.sin(T * 7), 1, .25], cheer); }
    /* 6: a hug in the car: his arms round her waist, hers round his neck (one still holding the strip up) */
    const hug = c === 5 ? ease.inOut(seg(lt, 2.6, 3.2)) : 0;
    if (hug) {
      b.aim('upperarm.l', [.45, -.35, .82], hug); b.aim('lowerarm.l', [-.75, 0, .66], hug); b.aim('upperarm.r', [-.45, -.35, .82], hug); b.aim('lowerarm.r', [.75, 0, .66], hug);
      g.aim('upperarm.l', [.35, .35, .87], hug); g.aim('lowerarm.l', [-.8, .2, .55], hug);
      g.aim('upperarm.r', [-.35, .35, .87], hug); g.aim('lowerarm.r', [.8, .2, .55], hug);
      g.bend('head', .1 * hug, 0, .15 * hug); b.bend('head', .08 * hug, 0, -.1 * hug);
    }
    if (once(5, 3.3, 'honk')) { car.honk(T); kit.sfx('honk', { volume: .7 }); }
  }

  /* ── taps: the car beeps and hearts rise; the popcorn jumps; the couple glow ── */
  function taps() {
    const pc = T - poked.car;
    if (pc >= 0 && pc < .05 && kit.once(`tap-car${poked.car.toFixed(3)}`)) {
      car.honk(T); kit.sfx('honk', { volume: .7 });
      hearts.burst(14, () => ({ x: car.root.position.x + (rng() - .5) * .16, y: .16, z: car.root.position.z + (rng() - .5) * .25, vx: (rng() - .5) * .1, vy: .16 + rng() * .1, gravity: -.05, drag: .6, sway: .02,
        color: ['#ff6f91', '#ffb3c8', '#ffc56b'][(rng() * 3) | 0], size: .02 + rng() * .01, life: 1.8, shape: 'heart' }));
    }
    const pp = T - poked.pop;
    if (pp >= 0 && pp < .05 && kit.once(`tap-pop${poked.pop.toFixed(3)}`)) { car.pop(16, 1.4); kit.sfx('pop', { volume: .55 }); }
    for (const p of [boy, girl]) {
      const pk = T - poked[p.key];
      if (pk >= 0 && pk < .05 && kit.once(`tap-${p.key}${poked[p.key].toFixed(3)}`)) {
        kit.sfx('sparkle', { volume: .4 }); onStage(p.m.node('head') || p.m.root, v1);
        sparks.burst(14, () => ({ x: v1.x, y: v1.y + .02, z: v1.z, vx: (rng() - .5) * .2, vy: .08 + rng() * .1, drag: 1.5, color: ['#ffd36e', '#fff1b8', '#ff8fab'][(rng() * 3) | 0], size: .014, life: .8, shape: rng() < .5 ? 'heart' : 'sparkle', spin: 3 }));
      }
    }
  }
};
