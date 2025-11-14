import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],        // Dual output: ESM and CommonJS
  dts: true,                      // Generate .d.ts files
  sourcemap: true,                // Generate source maps
  clean: true,                    // Clean dist before build
  splitting: false,               // No code splitting (single bundle)
  treeshake: true,                // Tree shaking for smaller bundle
  minify: false,                  // Don't minify (library code should be readable)
  target: 'node18',               // Node.js 18+
  outDir: 'dist',
  external: [
    'zeromq',                     // Don't bundle dependencies
    'msgpackr',
    '@solana/web3.js'
  ],
});
