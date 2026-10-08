import { defineConfig } from "vite";
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: [".preview.niteshift.dev"],
    headers: {
      "Content-Security-Policy":
        "frame-ancestors 'self' https://niteshift.dev https://*.niteshift.dev",
    },
  },
  build: { chunkSizeWarningLimit: 650 },
});
