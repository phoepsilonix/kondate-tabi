import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// Tauri 用: 固定ポートで待ち受け、Rust 側のログを隠さない
export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // TS側と合わせてES2024以降をターゲットに
    target: ["es2024"],
    //sourcemap: !!process.env.TAURI_DEBUG,

    // Oxc(またはRolldown内蔵高速ミニファイア)による圧縮を明示
    //minify: "oxc",
    minify: true,
    //minify: "rolldown",
    cssMinify: true,
    chunkSizeWarningLimit: 500,
  },
});
