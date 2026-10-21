/* The three.js a template's scene.js is given: the library plus the loader a model needs, and SkeletonUtils, so one
   loaded character can stand in two places (a copy shares its geometry and textures). The Studio and the player hand
   scenes the same one, so an act looks the same in both. */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export const THREE_FOR_SCENES = { ...THREE, GLTFLoader, SkeletonUtils };
