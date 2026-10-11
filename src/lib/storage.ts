// 保存先の抽象化。現状は localStorage（Tauri の WebView でも端末内に永続化される）。
// 後で SQLite や Tauri のファイル保存に置き換える場合は、この実装を差し替える。
export interface KeyValueStore {
  get<T>(key: string, fallback: T): T;
  set(key: string, value: unknown): void;
}

const PREFIX = 'kondate-tabi:';

export const localStore: KeyValueStore = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // 保存できなくてもアプリは動かし続ける
    }
  },
};
