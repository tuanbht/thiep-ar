/* The Zalo QR code, if one has been saved in public/contact/ (the page shows only what is there). */
import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { ZALO_QR_FILES } from "./contact";

export function zaloQrSrc(
  root = path.join(process.cwd(), "public"),
): string | null {
  for (const f of ZALO_QR_FILES)
    if (existsSync(path.join(root, "contact", f))) return `/contact/${f}`;
  return null;
}
