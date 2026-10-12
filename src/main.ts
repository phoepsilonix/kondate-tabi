import { mount } from "svelte";
import App from "./App.svelte";
import "./app.css";
import { createServices } from "./lib/services";
import { appStore } from "./lib/store.svelte";

// 保存データの読み込みに失敗しても、アプリは起動する（復元は画面から行う）
try {
  await appStore.init(await createServices());
} catch (e) {
  console.error("初期化に失敗しました", e);
}

const target = document.getElementById("app");
if (!target) throw new Error("#app が見つかりません");

export default mount(App, { target });
