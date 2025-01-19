import { defineConfig } from 'tsup';

export default defineConfig([
  {
    format: 'esm',
    outDir: 'dist/esm',
    sourcemap: true,
    dts: true,
    clean: true,
    entry: {
      index: 'src/index.ts',
      'plugin.vite': 'src/plugins/vite.ts',
    },
  },
  {
    format: 'cjs',
    outDir: 'dist/cjs',
    sourcemap: true,
    dts: true,
    clean: true,
    entry: {
      index: 'src/index.ts',
      'plugin.vite': 'src/plugins/vite.ts',
    },
  },
]);
