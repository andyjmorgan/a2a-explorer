import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5199,
    proxy: {
      // Set VITE_PROXY_TARGET=https://a2a-explorer.donkeywork.dev (or any other backend)
      // to iterate on the frontend against a live backend. Auth is Bearer-token based,
      // stored in localStorage under "a2a-explorer-auth" — log in on the upstream once,
      // then in http://localhost:5199 DevTools run:
      //   localStorage.setItem("a2a-explorer-auth", '<value copied from upstream tab>')
      "/api": {
        target: process.env.VITE_PROXY_TARGET ?? "http://localhost:5050",
        changeOrigin: !!process.env.VITE_PROXY_TARGET,
        secure: true,
      },
    },
  },
});
