import type { HistoryEntry, Pack } from "./types";

export const APP_DATA_VERSION = 1;

/** アプリが保存するユーザーデータ全体（バックアップの中身もこれ） */
export interface AppData {
  schemaVersion: number;
  /** パントリーに登録した具材 id */
  pantry: string[];
  /** 「作った・食べた」の記録（新しい順） */
  history: HistoryEntry[];
  /** 取り込んだパック */
  packs: Pack[];
  /** 無効にしたパックの id */
  disabledPacks: string[];
}

export function emptyAppData(): AppData {
  return { schemaVersion: APP_DATA_VERSION, pantry: [], history: [], packs: [], disabledPacks: [] };
}

export function isEmptyAppData(d: AppData): boolean {
  return d.pantry.length === 0 && d.history.length === 0 && d.packs.length === 0;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null;

function isHistoryEntry(v: unknown): v is HistoryEntry {
  return (
    isObj(v) &&
    typeof v.id === "string" &&
    typeof v.recipeId === "string" &&
    typeof v.at === "string" &&
    !Number.isNaN(Date.parse(v.at))
  );
}

/** パックの最低限の形だけ確認する（参照先の整合性は取り込み時の validatePack で確認済みの前提） */
function isPackShape(v: unknown): v is Pack {
  return (
    isObj(v) &&
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.version === "string" &&
    ["facets", "tags", "ingredients", "recipes"].every(
      (k) => v[k] === undefined || Array.isArray(v[k]),
    )
  );
}

/** 保存データ・バックアップの中身を検証して AppData にする。形が正しくなければ null。 */
export function parseAppData(raw: unknown): AppData | null {
  if (!isObj(raw)) return null;
  const version = raw.schemaVersion;
  if (typeof version !== "number" || version > APP_DATA_VERSION) return null;
  const pantry = strings(raw.pantry);
  const disabledPacks = strings(raw.disabledPacks ?? []);
  if (!pantry || !disabledPacks) return null;
  if (!Array.isArray(raw.history) || !raw.history.every(isHistoryEntry)) return null;
  if (!Array.isArray(raw.packs) || !raw.packs.every(isPackShape)) return null;
  return {
    schemaVersion: APP_DATA_VERSION,
    pantry,
    history: raw.history,
    packs: raw.packs,
    disabledPacks,
  };
}

/** 現在のデータに取り込むデータを統合する（パントリーは和集合、履歴は id で重複除去、パックは取り込み側を優先） */
export function mergeAppData(current: AppData, incoming: AppData): AppData {
  const historyById = new Map<string, HistoryEntry>();
  for (const e of [...current.history, ...incoming.history]) historyById.set(e.id, e);
  const packs = new Map(current.packs.map((p) => [p.id, p]));
  for (const p of incoming.packs) packs.set(p.id, p);
  return {
    schemaVersion: APP_DATA_VERSION,
    pantry: [...new Set([...current.pantry, ...incoming.pantry])],
    history: [...historyById.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    packs: [...packs.values()],
    disabledPacks: [...new Set([...current.disabledPacks, ...incoming.disabledPacks])],
  };
}

export function summarizeAppData(d: AppData) {
  return { pantry: d.pantry.length, history: d.history.length, packs: d.packs.length };
}
