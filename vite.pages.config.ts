import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname, "pages"),
  base: "/games/",
  publicDir: path.resolve(__dirname, "public"),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "dist-pages"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: path.resolve(__dirname, "pages/index.html"),
        yinYang: path.resolve(__dirname, "pages/yin-yang/index.html"),
      },
    },
  },
});
