/* A 3D template's scene.js is a plain script that sets window.NM_SCENE; the Studio and the player load it the same way.
   Load each script once, one at a time, and keep the function it defined. */
import type { Object3D } from "three";

export interface SceneApi {
  play(chapter: number): void;
  pause(): void;
  resume(): void;
  turn?(rad: number): void;
  repaint?(): void;
  ready?: Promise<void>;
  clips?(): { name: string; duration: number }[];
  clip?(name: string): boolean;
  /** Why the template's model.glb did not load, or null. */
  modelError?(): string | null;
  dispose?(): void;
}

export interface SceneArgs {
  anchor: { object3D: Object3D };
  card: unknown;
  tpl: unknown;
  THREE: unknown;
  onStop: (chapter: number) => void;
  dir: string;
}

export type SceneFactory = (args: SceneArgs) => SceneApi;

declare global {
  interface Window {
    NM_SCENE?: SceneFactory;
  }
}

const loaded = new Map<string, Promise<SceneFactory>>();
let queue: Promise<unknown> = Promise.resolve();

export function loadSceneScript(url: string): Promise<SceneFactory> {
  const hit = loaded.get(url);
  if (hit) return hit;
  const job = queue.then(
    () =>
      new Promise<SceneFactory>((resolve, reject) => {
        window.NM_SCENE = undefined;
        const s = document.createElement("script");
        s.src = url;
        s.async = false;
        s.onload = () =>
          window.NM_SCENE
            ? resolve(window.NM_SCENE)
            : reject(new Error(`${url} did not define window.NM_SCENE`));
        s.onerror = () => reject(new Error(`${url} could not be loaded`));
        document.head.appendChild(s);
      }),
  );
  queue = job.catch(() => undefined);
  job.catch(() => loaded.delete(url));
  loaded.set(url, job);
  return job;
}
