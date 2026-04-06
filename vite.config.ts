import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig(async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const plugins = [react(), tailwindcss()];
  try {
    // @ts-expect-error
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch {
    void 0;
  }
  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
})
