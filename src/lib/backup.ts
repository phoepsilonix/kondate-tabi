import { type AppData, parseAppData } from "./app-data";
import type { Result } from "./pack";

export const BACKUP_FORMAT_VERSION = 1;
const APP_ID = "kondate-tabi";

/** バックアップファイルの外枠。自動バックアップも手動エクスポートも同じ形式。 */
export interface BackupEnvelope {
  app: typeof APP_ID;
  type: "backup";
  formatVersion: number;
  createdAt: string;
  /** data を JSON.stringify した文字列の SHA-256（16進） */
  checksum: string;
  data: AppData;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createBackup(data: AppData, now: Date = new Date()): Promise<BackupEnvelope> {
  return {
    app: APP_ID,
    type: "backup",
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: now.toISOString(),
    checksum: await sha256Hex(JSON.stringify(data)),
    data,
  };
}

export const serializeBackup = (env: BackupEnvelope) => JSON.stringify(env, null, 2);

export async function parseBackup(text: string): Promise<Result<BackupEnvelope>> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["JSON として読み込めません"] };
  }
  if (typeof raw !== "object" || raw === null)
    return { ok: false, errors: ["形式が正しくありません"] };
  const o = raw as Record<string, unknown>;
  if (o.app !== APP_ID || o.type !== "backup") {
    return { ok: false, errors: ["こんだて旅のバックアップファイルではありません"] };
  }
  if (typeof o.formatVersion !== "number" || o.formatVersion > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      errors: ["新しいバージョンのアプリで作られたバックアップです。アプリを更新してください"],
    };
  }
  const data = parseAppData(o.data);
  if (!data) return { ok: false, errors: ["バックアップの内容が正しくありません"] };
  if (typeof o.checksum !== "string" || o.checksum !== (await sha256Hex(JSON.stringify(o.data)))) {
    return {
      ok: false,
      errors: ["チェックサムが一致しません（ファイルが壊れている可能性があります）"],
    };
  }
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : "";
  return {
    ok: true,
    value: {
      app: APP_ID,
      type: "backup",
      formatVersion: o.formatVersion,
      createdAt,
      checksum: o.checksum,
      data,
    },
  };
}

// ---- ファイル名と世代管理 ----

const NAME_RE = /^kondate-tabi-(\d{8}T\d{6}Z)\.json$/;

export function backupFileName(at: Date): string {
  return `kondate-tabi-${at.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z.json`;
}

/** バックアップのファイル名から作成時刻(ms)を取り出す。自動バックアップのファイル名でなければ null */
export function backupTimeOf(name: string): number | null {
  const m = NAME_RE.exec(name);
  if (!m) return null;
  const s = m[1];
  const t = Date.parse(
    `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`,
  );
  return Number.isNaN(t) ? null : t;
}

/** 自動バックアップのファイル名だけを、新しい順に並べる */
export function sortBackupNames(names: readonly string[]): string[] {
  return names
    .map((name) => ({ name, t: backupTimeOf(name) }))
    .filter((x): x is { name: string; t: number } => x.t !== null)
    .sort((a, b) => b.t - a.t)
    .map((x) => x.name);
}

export interface RetentionOptions {
  /** 直近何世代を残すか */
  recent: number;
  /** 過去何日分について、1日1件（その日の最新）を残すか */
  daily: number;
}
export const DEFAULT_RETENTION: RetentionOptions = { recent: 5, daily: 7 };
const DAY_MS = 24 * 60 * 60 * 1000;

/** 削除してよいバックアップ名を返す。自動バックアップの形式でないファイルには触れない。 */
export function selectBackupsToPrune(
  names: readonly string[],
  now: number,
  opts: RetentionOptions = DEFAULT_RETENTION,
): string[] {
  const sorted = sortBackupNames(names);
  const keep = new Set(sorted.slice(0, opts.recent));
  const seenDays = new Set<number>();
  for (const name of sorted) {
    const day = Math.floor((backupTimeOf(name) as number) / DAY_MS);
    if (seenDays.has(day)) continue;
    seenDays.add(day);
    if (now - day * DAY_MS < opts.daily * DAY_MS) keep.add(name);
  }
  return sorted.filter((n) => !keep.has(n));
}
