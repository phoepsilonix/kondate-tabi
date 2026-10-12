import { open, save } from "@tauri-apps/plugin-dialog";
import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  rename,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { BackupTarget, DataStore, FileIO } from "../ports";

// 権限は src-tauri/capabilities/default.json で次の場所だけに限定している
//   メインのデータ:     $APPDATA/data/
//   自動バックアップ:   $DOCUMENT/kondate-tabi/backup/  （アプリの保存領域の外。アンインストールで消えにくい）
const DATA_DIR = "data";
const BACKUP_DIR = "kondate-tabi/backup";

/** 一時ファイルに書いてから置き換える（途中で止まっても元のファイルを壊さない） */
async function writeAtomic(path: string, text: string, baseDir: BaseDirectory) {
  const tmp = `${path}.tmp`;
  await writeTextFile(tmp, text, { baseDir });
  await rename(tmp, path, { oldPathBaseDir: baseDir, newPathBaseDir: baseDir });
}

export class TauriFileDataStore implements DataStore {
  private file = `${DATA_DIR}/data.json`;

  private async ensureDir() {
    await mkdir(DATA_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }

  async load() {
    if (!(await exists(this.file, { baseDir: BaseDirectory.AppData }))) return null;
    return readTextFile(this.file, { baseDir: BaseDirectory.AppData });
  }

  async save(text: string) {
    await this.ensureDir();
    await writeAtomic(this.file, text, BaseDirectory.AppData);
  }

  async saveAside(text: string) {
    await this.ensureDir();
    await writeTextFile(`${DATA_DIR}/data.corrupt-${Date.now()}.json`, text, {
      baseDir: BaseDirectory.AppData,
    });
  }
}

export class TauriBackupTarget implements BackupTarget {
  describe() {
    return "ドキュメント/kondate-tabi/backup";
  }

  async list() {
    if (!(await exists(BACKUP_DIR, { baseDir: BaseDirectory.Document }))) return [];
    const entries = await readDir(BACKUP_DIR, { baseDir: BaseDirectory.Document });
    return entries.filter((e) => e.isFile).map((e) => e.name);
  }

  read(name: string) {
    return readTextFile(`${BACKUP_DIR}/${name}`, { baseDir: BaseDirectory.Document });
  }

  async write(name: string, text: string) {
    await mkdir(BACKUP_DIR, { baseDir: BaseDirectory.Document, recursive: true });
    await writeAtomic(`${BACKUP_DIR}/${name}`, text, BaseDirectory.Document);
  }

  remove(name: string) {
    return remove(`${BACKUP_DIR}/${name}`, { baseDir: BaseDirectory.Document });
  }
}

export class TauriFileIO implements FileIO {
  async exportText(suggestedName: string, text: string) {
    const path = await save({
      defaultPath: suggestedName,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return "cancelled" as const;
    await writeTextFile(path, text);
    return "saved" as const;
  }

  async pickText() {
    const path = await open({ multiple: false, filters: [{ name: "JSON", extensions: ["json"] }] });
    if (typeof path !== "string") return null;
    return { name: path.split(/[\\/]/).pop() ?? path, text: await readTextFile(path) };
  }
}
