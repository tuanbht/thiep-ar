/* "Pin here": the act stays where it is without the printed card. The phone's gyroscope turns the three.js camera
   as the phone turns, so the act holds its place in the room. */
import * as THREE from 'three';

const Z = new THREE.Vector3(0, 0, 1);
const LIE_FLAT = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));   // -90 degrees about x: the camera looks out of the back of the phone
const RAD = Math.PI / 180;

/** The camera's rotation for a device orientation (degrees) and the screen's turn (degrees). */
export function orientationQuaternion(alpha: number, beta: number, gamma: number, screenAngle: number): THREE.Quaternion {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta * RAD, alpha * RAD, -gamma * RAD, 'YXZ'));
  q.multiply(LIE_FLAT);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, -screenAngle * RAD));
  return q;
}

type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

/** iOS asks before giving a page the gyroscope, and only from a tap. */
export async function askForGyroscope(): Promise<boolean> {
  const D = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
  if (!D) return false;
  if (typeof D.requestPermission !== 'function') return true;
  try { return (await D.requestPermission()) === 'granted'; } catch { return false; }
}

/** Follows the gyroscope; `latest` is null until the first reading. */
export class Gyro {
  latest: THREE.Quaternion | null = null;
  private readonly onEvent = (e: DeviceOrientationEvent) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    const angle = (screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : 0);
    this.latest = orientationQuaternion(e.alpha, e.beta, e.gamma, angle);
  };
  start() { window.addEventListener('deviceorientation', this.onEvent); }
  stop() { window.removeEventListener('deviceorientation', this.onEvent); this.latest = null; }
}
