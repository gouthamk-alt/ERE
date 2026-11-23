import { build } from 'esbuild';

// Lambda disables require(ESM). Bundle the sanitizer and its ESM parser together.
await build({
  entryPoints: ['sanitize-html'],
  outfile: 'server/generated/sanitize-html.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
});
