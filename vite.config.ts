import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The API console talks to the FastAPI backend. To avoid CORS during local dev, requests to
// /api are proxied to the backend (default http://localhost:8000). Override with VITE_API_TARGET.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // The repo lives on a Windows drive (/mnt/c/...) accessed from WSL2, where inotify events
    // don't cross the 9p mount — without polling the watcher never fires, Vite keeps serving the
    // module it transformed at startup, and edits appear to do nothing. Costs a little CPU.
    watch: { usePolling: true, interval: 300 },
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
