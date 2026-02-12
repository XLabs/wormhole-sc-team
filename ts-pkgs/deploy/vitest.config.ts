import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000,
  },
  ssr: {
    noExternal: [],
    external: ['@xlabs-xyz/ledger-ethers-signer'],
  },
});
