import type { Services } from "./ports";

export const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** 実行環境に合った保存先・ファイル入出力を用意する（Tauri 用は必要なときだけ読み込む） */
export async function createServices(): Promise<Services> {
  if (isTauri()) {
    const t = await import("./adapters/tauri");
    return {
      store: new t.TauriFileDataStore(),
      backupTarget: new t.TauriBackupTarget(),
      files: new t.TauriFileIO(),
    };
  }
  const b = await import("./adapters/browser");
  return {
    store: new b.LocalStorageDataStore(),
    backupTarget: new b.LocalStorageBackupTarget(),
    files: new b.BrowserFileIO(),
  };
}
