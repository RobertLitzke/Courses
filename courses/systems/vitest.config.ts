import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // The live figures' tests run the system simulations for many seconds of
    // their own clock; on a busy CI runner that can take longer than 5 s.
    testTimeout: 30_000,
    // Didactics ships TypeScript source, so Vitest compiles it too.
    server: { deps: { inline: ['didactics'] } },
  },
});
