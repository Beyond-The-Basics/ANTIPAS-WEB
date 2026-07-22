import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The API console talks to the FastAPI backend. To avoid CORS during local dev, requests to
// /api are proxied to the backend (default http://localhost:8000). Override with VITE_API_TARGET.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
