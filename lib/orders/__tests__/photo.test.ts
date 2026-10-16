import { describe, expect, it } from 'vitest';
import { sniffPhoto } from '../photo';
import { JPEG, PNG, WEBP } from './test-kit';

describe('sniffPhoto', () => {
  it('knows JPEG, PNG and WebP by their first bytes', () => {
    expect(sniffPhoto(JPEG)).toBe('jpg');
    expect(sniffPhoto(PNG)).toBe('png');
    expect(sniffPhoto(WEBP)).toBe('webp');
  });

  it('refuses anything else, whatever it is called', () => {
    expect(sniffPhoto(new TextEncoder().encode('<svg onload="alert(1)">'))).toBeNull();
    expect(sniffPhoto(new TextEncoder().encode('GIF89a...'))).toBeNull();
    expect(sniffPhoto(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20]))).toBeNull();   // RIFF but AVI
    expect(sniffPhoto(Uint8Array.from([0xff, 0xd8]))).toBeNull();
    expect(sniffPhoto(new Uint8Array())).toBeNull();
  });
});
