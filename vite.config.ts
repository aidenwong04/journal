import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The renderer is served by Vite in dev and loaded as static files by
// Electron's main process in production. Base is relative so the built
// index.html works when loaded via file:// from inside the packaged app.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
