import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), visualizer({ open: true, filename: 'bundle-analysis.html' })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
         target: 'https://localhost:8080',
      },
      "/ws": {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  css: {
    postcss: "./postcss.config.js", // Kiểm tra xem postcss có được chỉ định đúng không
  },
  define: {
    global: {}, // polyfill tránh lỗi "global is not defined"
  },
});
