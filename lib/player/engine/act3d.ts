/* A 3D act: the template's scene.js, built into a host group with the same three.js the Studio gives it. Where the
   host stands (on the card, or facing the phone) is the session's business. */
import * as THREE from 'three';
import { loadSceneScript, type SceneApi } from './loadSceneScript';
import { THREE_FOR_SCENES } from './threeForScenes';
import type { Card } from '../core/card';
import type { Template } from '../core/template';
import type { Act } from './types';

export interface Act3d extends Act {
  readonly kind: '3d';
  /** the scene's anchor: it stands up along +z and faces -y */
  readonly host: THREE.Group;
  readonly api: SceneApi;
  /** turn the act round its own up (radians); `turned` is the sum, so the preview can undo it */
  turn(rad: number): void;
  readonly turned: number;
}

export interface Act3dOptions {
  card: Card;
  tpl: Template;
  tdir: string;
  onStop(chapter: number): void;
}

export async function createAct3d(o: Act3dOptions): Promise<Act3d> {
  const factory = await loadSceneScript(`${o.tdir}/${o.tpl.scene || 'scene.js'}`);
  const host = new THREE.Group();
  host.name = 'act';
  const api = factory({ anchor: { object3D: host }, card: o.card, tpl: o.tpl, THREE: THREE_FOR_SCENES, onStop: o.onStop, dir: o.tdir });
  let turned = 0;
  return {
    kind: '3d',
    host,
    api,
    ready: api.ready ?? Promise.resolve(),
    async unlock() { /* nothing to unlock: no media */ },
    play: i => api.play(i),
    pause: () => api.pause(),
    resume: () => api.resume(),
    turn(rad) { if (api.turn) { api.turn(rad); turned += rad; } },
    get turned() { return turned; },
    dispose() {
      try { api.dispose?.(); } catch (e) { console.error('[act] the scene did not dispose cleanly', e); }
      host.removeFromParent();
    }
  };
}
