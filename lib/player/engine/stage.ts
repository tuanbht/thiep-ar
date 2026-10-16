/* The three.js stage both modes draw on: a transparent canvas over the camera picture (camera mode) or over the night
   sky (preview), one camera at the origin looking down -z, and a loop that runs every act's update before each frame.
   A 3D act is lit by its own scene.js under physical lights, ACES and soft shadows, as in the Studio; a film is unlit. */
import * as THREE from 'three';

export type Tick = (dt: number, now: number) => void;

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 0.02, 50);
  private readonly ticks = new Set<Tick>();
  private readonly resized = new Set<() => void>();
  private last = 0;
  private readonly onResize = () => this.resize();
  private readonly observer: ResizeObserver | null;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;   // three r186 dropped PCFSoftShadowMap (it fell back to this anyway)
    this.renderer.setClearColor(0x000000, 0);
    const c = this.renderer.domElement;
    c.className = 'stage-canvas';
    container.appendChild(c);
    this.resize();
    // the box it fills: the whole screen on the gift page, a panel in the shop's preview
    this.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(this.onResize) : null;
    this.observer?.observe(container);
    window.addEventListener('resize', this.onResize);
    this.renderer.setAnimationLoop(now => this.frame(now));
  }

  /** a 3D act is tone-mapped like the Studio's light box; a film keeps its own colours. Set before building the act. */
  lightFor(kind: 'film' | '3d') {
    this.renderer.toneMapping = kind === '3d' ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    this.renderer.toneMappingExposure = kind === '3d' ? 1.05 : 1;
  }

  onTick(t: Tick): () => void {
    this.ticks.add(t);
    return () => { this.ticks.delete(t); };
  }

  /** after the stage changed size */
  onResized(f: () => void): () => void {
    this.resized.add(f);
    return () => { this.resized.delete(f); };
  }

  get size(): { width: number; height: number } {
    return { width: this.container.clientWidth || window.innerWidth, height: this.container.clientHeight || window.innerHeight };
  }

  resize() {
    const { width, height } = this.size;
    if (!width || !height) return;
    this.renderer.setSize(width, height, true);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    for (const f of this.resized) f();
  }

  private frame(now: number) {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    for (const t of this.ticks) {
      try { t(dt, now); } catch (e) { console.error('[stage] a frame update failed', e); }
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.observer?.disconnect();
    this.renderer.setAnimationLoop(null);
    this.ticks.clear();
    this.resized.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();                          // give the WebGL context back now, not at garbage collection
    this.renderer.domElement.remove();
  }
}
