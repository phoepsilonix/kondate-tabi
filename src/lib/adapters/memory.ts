import type { BackupTarget, DataStore } from "../ports";

/** テスト用の、メモリ上だけの保存先 */
export class MemoryDataStore implements DataStore {
  text: string | null;
  aside: string[] = [];
  constructor(initial: string | null = null) {
    this.text = initial;
  }
  async load() {
    return this.text;
  }
  async save(text: string) {
    this.text = text;
  }
  async saveAside(text: string) {
    this.aside.push(text);
  }
}

export class MemoryBackupTarget implements BackupTarget {
  files = new Map<string, string>();
  describe() {
    return "メモリ（テスト用）";
  }
  async list() {
    return [...this.files.keys()];
  }
  async read(name: string) {
    const t = this.files.get(name);
    if (t === undefined) throw new Error(`not found: ${name}`);
    return t;
  }
  async write(name: string, text: string) {
    this.files.set(name, text);
  }
  async remove(name: string) {
    this.files.delete(name);
  }
}
