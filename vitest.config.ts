import { defineConfig } from "vitest/config";

// 純粋な TypeScript のテスト用（Svelte コンポーネントは対象外）
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
