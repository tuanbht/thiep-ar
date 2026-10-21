/* The buyer's photos for the 3D acts that have no photo of their own (showtime.js, dancer.js): loaded small as they come
   in, in a new order each play, and polaroids that show them in turn whenever they are in view, each fading into the
   next (lovestory.js and the flower letter do the same in their own code). An act loads this file beside itself:
     const photos = window.NM_PHOTOS({ THREE, card });
     photos.count                           how many photos the card has; with none, an act shows no polaroid
     const p = photos.polaroid({ width })   { root, height }: it stands on root's y = 0, its photo facing +z
     photos.tick(T)                         each frame; T is the act's own seconds (still while it is paused)
     photos.shuffle()                       a new order, when a play starts over
   Its meshes, materials and textures hang from the act's own root, so the act's dispose frees them. */
window.NM_PHOTOS = ({ THREE, card }) => {
  const TURN = 2.8, FADE = .6;                                           // seconds a photo shows, and its fade to the next
  const PX = 640;                                                        // kept this big at most: ten full-size ones fill a phone
  const urls = Array.isArray(card.photos) && card.photos.length ? card.photos : card.photo ? [card.photo] : [];
  const shuffle = list => { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
  const small = img => {
    const k = Math.min(1, PX / Math.max(img.width, img.height));
    if (k === 1) return img;
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  };
  let imgs = [];
  const polaroids = [];
  shuffle(urls).forEach(url => {                                         // each after the others as it comes in, so none moves
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgs = [...imgs, small(img)]; polaroids.forEach(p => p.paint()); };
    img.src = url;
  });
  /** a polaroid in view: it and everything it hangs from visible, and not shrunk to nothing */
  const inView = obj => { for (let o = obj; o; o = o.parent) if (!o.visible) return false; return obj.matrixWorld.getMaxScaleOnAxis() > 1e-3; };

  function polaroid({ width = .22 } = {}) {
    const W = 512, H = 620, X = 30, S = 452, height = width * H / W;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const start = polaroids.length;                                      // a second polaroid starts on the second photo
    let shown = start, mix = 0, seenSince = null, from = start;
    const draw = (c, img, alpha) => {                                    // the photo fills its square: its middle, never stretched
      const k = Math.max(S / img.width, S / img.height), w = img.width * k, h = img.height * k;
      c.save(); c.globalAlpha = alpha; c.beginPath(); c.rect(X, X, S, S); c.clip(); c.drawImage(img, X + (S - w) / 2, X + (S - h) / 2, w, h); c.restore();
    };
    function paint() {
      const c = cv.getContext('2d'), n = imgs.length;
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
      if (n) { draw(c, imgs[shown % n], 1); if (mix > 0) draw(c, imgs[(shown + 1) % n], mix); }
      else { c.fillStyle = '#fde4ea'; c.fillRect(X, X, S, S); }         // its photo is still on the way
      c.strokeStyle = '#2b2440'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath();        // a heart doodled in pen
      c.moveTo(440, 586); c.bezierCurveTo(400, 556, 410, 520, 438, 532); c.bezierCurveTo(462, 515, 478, 552, 440, 586); c.stroke();
      tex.needsUpdate = true;
    }
    paint();
    const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const face = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });                  // the photo as it is, whatever the light
    const box = new THREE.Mesh(new THREE.BoxGeometry(width, height, .004), [white, white, white, white, face, white]);
    box.position.y = height / 2; box.castShadow = true;
    const root = new THREE.Group(); root.add(box);
    polaroids.push({
      paint,
      /** in view: the photos in turn, from the one it showed when it came into view */
      turn(T) {
        if (imgs.length < 2 || !inView(root)) {
          seenSince = null;
          if (mix > 0) { if (mix >= .5) shown += 1; mix = 0; paint(); }   // left in the middle of a fade: settle on one photo
          return;
        }
        if (seenSince === null) { seenSince = T; from = shown; }
        const k = (T - seenSince) / TURN, step = Math.floor(k), into = (k - step) * TURN;
        const m = into > TURN - FADE ? (into - TURN + FADE) / FADE : 0;
        if (from + step !== shown || Math.abs(m - mix) > .02 || (m === 0 && mix !== 0)) { shown = from + step; mix = m; paint(); }
      },
      rewind() { shown = from = start; mix = 0; seenSince = null; paint(); }
    });
    return { root, height };
  }

  return {
    count: urls.length,
    polaroid,
    tick: T => polaroids.forEach(p => p.turn(T)),
    shuffle() { imgs = shuffle(imgs); polaroids.forEach(p => p.rewind()); }
  };
};
