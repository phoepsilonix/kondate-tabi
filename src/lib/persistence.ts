import { type AppData, emptyAppData, parseAppData } from "./app-data";
import { type BackupEnvelope, parseBackup, sortBackupNames } from "./backup";
import type { BackupTarget, DataStore } from "./ports";

export type LoadStatus = "ok" | "empty" | "corrupt";

export interface RestoreCandidate {
  name: string;
  envelope: BackupEnvelope;
}

export interface LoadResult {
  data: AppData;
  status: LoadStatus;
  /** データが空・壊れていて、使える自動バックアップが見つかったとき */
  restoreCandidate: RestoreCandidate | null;
}

/** 新しい順に調べて、最初に読み込める（形式・チェックサムが正しい）バックアップを返す */
export async function findLatestValidBackup(
  target: BackupTarget,
): Promise<RestoreCandidate | null> {
  let names: string[];
  try {
    names = sortBackupNames(await target.list());
  } catch {
    return null;
  }
  for (const name of names) {
    try {
      const parsed = await parseBackup(await target.read(name));
      if (parsed.ok) return { name, envelope: parsed.value };
    } catch {
      // 読めないファイルは飛ばして次へ
    }
  }
  return null;
}

/**
 * 起動時にデータを読み込む。読み込みに失敗しても例外にせず、アプリが起動できるようにする。
 * - 正常: そのまま使う
 * - 空 / 壊れている: 空のデータで起動し、使えるバックアップがあれば復元の候補として返す
 *   （壊れたデータは消さずに脇へ退避する）
 */
export async function loadAppData(store: DataStore, target: BackupTarget): Promise<LoadResult> {
  let status: LoadStatus;
  let raw: string | null = null;
  try {
    raw = await store.load();
    if (raw === null) {
      status = "empty";
    } else {
      let parsed: AppData | null = null;
      try {
        parsed = parseAppData(JSON.parse(raw));
      } catch {
        parsed = null;
      }
      if (parsed) return { data: parsed, status: "ok", restoreCandidate: null };
      await store.saveAside(raw).catch(() => undefined);
      status = "corrupt";
    }
  } catch {
    status = "corrupt"; // 保存先そのものが読めない場合
  }
  return { data: emptyAppData(), status, restoreCandidate: await findLatestValidBackup(target) };
}
