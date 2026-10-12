import { emptyAppData } from "../app-data";
import type { BackupTarget, DataStore, FileIO } from "../ports";

const PREFIX = "kondate-tabi:";

/** ブラウザ（開発・確認用）。端末のブラウザのデータを消すと一緒に消える。 */
export class LocalStorageDataStore implements DataStore {
  async load() {
    const text = localStorage.getItem(`${PREFIX}data`);
    if (text !== null) return text;
    // 旧バージョン（パントリー・履歴を別々のキーに保存していた）からの引き継ぎ
    const pantry = localStorage.getItem(`${PREFIX}pantry`);
    const history = localStorage.getItem(`${PREFIX}history`);
    if (pantry === null && history === null) return null;
    try {
      return JSON.stringify({
        ...emptyAppData(),
        pantry: JSON.parse(pantry ?? "[]"),
        history: JSON.parse(history ?? "[]"),
      });
    } catch {
      return null;
    }
  }
  async save(text: string) {
    localStorage.setItem(`${PREFIX}data`, text);
  }
  async saveAside(text: string) {
    localStorage.setItem(`${PREFIX}data.corrupt-${Date.now()}`, text);
  }
}

/** ブラウザ版の自動バックアップ。アプリ外には保存できないため、再インストールには耐えない（動作確認用）。 */
export class LocalStorageBackupTarget implements BackupTarget {
  private key = (name: string) => `${PREFIX}backup:${name}`;
  describe() {
    return "ブラウザ内（開発用。ブラウザのデータを消すと失われます）";
  }
  async list() {
    const prefix = this.key("");
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
  }
  async read(name: string) {
    const t = localStorage.getItem(this.key(name));
    if (t === null) throw new Error(`not found: ${name}`);
    return t;
  }
  async write(name: string, text: string) {
    localStorage.setItem(this.key(name), text);
  }
  async remove(name: string) {
    localStorage.removeItem(this.key(name));
  }
}

export class BrowserFileIO implements FileIO {
  async exportText(suggestedName: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "saved" as const;
  }

  pickText(): Promise<{ name: string; text: string } | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.onchange = async () => {
        const file = input.files?.[0];
        resolve(file ? { name: file.name, text: await file.text() } : null);
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}
