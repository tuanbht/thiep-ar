import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { zaloQrSrc } from "../contact-server";

const roots: string[] = [];
const root = (files: string[]) => {
  const r = mkdtempSync(path.join(os.tmpdir(), "contact-"));
  roots.push(r);
  mkdirSync(path.join(r, "contact"));
  for (const f of files) writeFileSync(path.join(r, "contact", f), "x");
  return r;
};

afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

describe("zaloQrSrc", () => {
  it("finds the saved QR code, png first", () => {
    expect(zaloQrSrc(root(["zalo-qr.jpg"]))).toBe("/contact/zalo-qr.jpg");
    expect(zaloQrSrc(root(["zalo-qr.webp", "zalo-qr.png"]))).toBe(
      "/contact/zalo-qr.png",
    );
  });

  it("is null until one is saved", () => {
    expect(zaloQrSrc(root([]))).toBeNull();
    expect(zaloQrSrc(root(["other.png"]))).toBeNull();
  });
});
