import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://massage-therapy-production.up.railway.app", // Backend Spring Boot  http://192.168.1.177:5000
        // target: 'https://localhost:5000',
        changeOrigin: true,
        secure: false,
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
