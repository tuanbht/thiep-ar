/* MindAR's image tracker (mind-ar 1.2.5), used without its A-Frame or three.js wrappers. */
declare module "mind-ar/dist/mindar-image.prod.js" {
  export interface ControllerUpdate {
    type: string;
    targetIndex: number;
    /** column-major 4x4, or null when the target was lost */
    worldMatrix: number[] | null;
  }
  export interface ControllerOptions {
    inputWidth: number;
    inputHeight: number;
    maxTrack?: number;
    filterMinCF?: number | null;
    filterBeta?: number | null;
    warmupTolerance?: number | null;
    missTolerance?: number | null;
    onUpdate?: (data: ControllerUpdate) => void;
  }
  export class Controller {
    constructor(options: ControllerOptions);
    readonly inputWidth: number;
    readonly inputHeight: number;
    addImageTargets(src: string): Promise<{ dimensions: [number, number][] }>;
    dummyRun(input: HTMLVideoElement): Promise<void> | void;
    processVideo(input: HTMLVideoElement): void;
    stopProcessVideo(): void;
    /** stops processing and closes the tracker's worker */
    dispose(): void;
    getProjectionMatrix(): number[];
  }
}
