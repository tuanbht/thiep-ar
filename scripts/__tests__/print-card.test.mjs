import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { encode } from '@msgpack/msgpack';
import { describe, expect, it } from 'vitest';
import { features, withLock } from '../print-card.mjs';

describe('features', () => {
  it('counts the points the tracker matches with and the points it tracks', () => {
    const mind = encode({ v: 2, dataList: [{ matchingData: [{ maximaPoints: [1, 2, 3], minimaPoints: [4] }, { maximaPoints: [5], minimaPoints: [] }],
      trackingData: [{ points: [1, 2] }, { points: [3] }] }] });
    expect(features(Buffer.from(mind))).toEqual({ match: 5, tracking: [2, 1] });
  });
});

describe('withLock', () => {
  const lockIn = async () => path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'lock-')), 'compile.lock');

  it('runs one job at a time, and frees the lock even when a job fails', async () => {
    const file = await lockIn(), order = [];
    const job = (name, ms) => withLock(file, async () => { order.push(`${name}+`); await new Promise(r => setTimeout(r, ms)); order.push(`${name}-`); return name; }, { wait: 5 });
    expect(await Promise.all([job('a', 30), job('b', 5)])).toEqual(['a', 'b']);
    expect([order[0][0], order[2][0]].sort()).toEqual(['a', 'b']);       // either may go first, but never both at once
    expect(order).toEqual([`${order[0][0]}+`, `${order[0][0]}-`, `${order[2][0]}+`, `${order[2][0]}-`]);
    await expect(withLock(file, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(await fs.stat(file).catch(() => null)).toBeNull();
  });

  it('takes over a lock left behind by a run that died', async () => {
    const file = await lockIn();
    await fs.writeFile(file, 'old');
    const past = new Date(Date.now() - 60 * 60_000); await fs.utimes(file, past, past);
    expect(await withLock(file, async () => 'mine', { wait: 5, stale: 60_000 })).toBe('mine');
  });
});
