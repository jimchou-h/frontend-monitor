import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:8788",
      "/errors/upload": "http://localhost:8788",
      "/tracks/upload": "http://localhost:8788",
    },
  },
  build: {
    outDir: "dist",
  },
});
