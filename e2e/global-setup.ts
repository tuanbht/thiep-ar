/* The fake camera: the flower-letter card (its shop picture, the printed design at 960 px) on a grey table, turned a
   little, as a short y4m loop Chromium plays as its camera. Made once into the temp folder (never into the repo). */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { CAMERA } from '../playwright.config';

export default function globalSetup() {
  if (existsSync(CAMERA)) return;
  mkdirSync(path.dirname(CAMERA), { recursive: true });
  const print = path.resolve('public/thumbs/flower-letter.jpg');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x5c5854:s=640x480', '-i', print, '-filter_complex',
    '[1:v]scale=512:320,rotate=6*PI/180:ow=rotw(6*PI/180):oh=roth(6*PI/180):c=0x5c5854,gblur=sigma=0.6[c];[0:v][c]overlay=(W-w)/2:(H-h)/2',
    '-frames:v', '1', `${CAMERA}.png`]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', `${CAMERA}.png`, '-t', '6', '-r', '15', '-pix_fmt', 'yuv420p', CAMERA]);
}
