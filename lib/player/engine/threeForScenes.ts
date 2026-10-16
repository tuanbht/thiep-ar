/* The three.js a template's scene.js is given: the library plus the loader a model needs. The Studio and the
   player hand scenes the same one, so an act looks the same in both. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const THREE_FOR_SCENES = { ...THREE, GLTFLoader };
