/* The buy flow in a real browser: the shop, the order, the test payment, and the gift opened with a fake camera that
   films the flower-letter print, against the local Supabase (pnpm db:start). It starts its own dev server on port
   3300; Next runs one dev server per project, so while yours runs, point the tests at it: E2E_BASE_URL=http://localhost:3001. */
import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

export const PORT = 3300;
const EXISTING = process.env.E2E_BASE_URL;
export const CAMERA = path.join(
  os.tmpdir(),
  "gift-cards-e2e",
  "cam-flower-letter.y4m",
);

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: EXISTING ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Pixel 7"],
        launchOptions: {
          args: [
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--ignore-gpu-blocklist",
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            `--use-file-for-fake-video-capture=${CAMERA}`,
          ],
        },
      },
    },
  ],
  webServer: EXISTING
    ? undefined
    : {
        command: `pnpm exec next dev --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
          PAYMENT_PROVIDER: "test",
        },
      },
});
