import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// .env.local (local Supabase keys) reaches the tests, so the database suite runs against `pnpm db:start`'s database
const localEnv = existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {};

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'node',
    env: localEnv as Record<string, string>,
    include: ['{lib,components,app}/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', 'e2e/**', '.next/**'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      include: ['lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
      exclude: [
        '**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.d.ts', 'lib/db/database.types.ts',
        // need a GPU, a camera or a real browser: the Playwright specs (e2e/) cover them
        'lib/player/engine/{stage,arSource,act3d,filmAct,preview,pin,session,loadSceneScript}.ts',
        'components/player/**/*.tsx'
      ],
      thresholds: { lines: 80 }
    }
  }
});
