import { defineConfig } from 'astro/config';

export default defineConfig({
  devToolbar: { enabled: false },
  // Підкаталог для GitHub Pages; на основному хостингу не задається.
  base: process.env.ASTRO_BASE || undefined,
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  // Без вбудованих скриптів: так працює сувора політика CSP на продакшені.
  vite: { build: { assetsInlineLimit: 0 } },
});
