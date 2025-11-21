import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5179,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5002",
        changeOrigin: true,
      },
    },
  },
});
