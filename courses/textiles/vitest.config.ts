import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Didactics ships TypeScript source, so Vitest compiles it too.
    server: { deps: { inline: ['didactics'] } },
  },
});
