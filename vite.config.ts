import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite-plus'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // Expose CONVEX_URL (the name `convex deploy --cmd-url-env-var-name` and `convex dev` write) to the client.
  // Only that exact name: a broader CONVEX_ prefix would also leak CONVEX_DEPLOY_KEY into the bundle.
  envPrefix: ['VITE_', 'CONVEX_URL'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // `vp check` runs lint + types only, as in the other games: the code keeps hand-aligned tables
  // (option tables etc.) that the formatter would explode. `vp fmt` still works and matches the house style.
  check: { fmt: false },
  fmt: {
    singleQuote: true,
    semi: false,
    printWidth: 120,
    ignorePatterns: ['dist/**', 'convex/_generated/**', 'legacy/**'],
  },
  lint: {
    ignorePatterns: ['dist/**', 'convex/_generated/**', 'legacy/**'],
  },
})
