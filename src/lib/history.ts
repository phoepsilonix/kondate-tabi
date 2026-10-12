import type { HistoryEntry, Recipe } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** レシピ id → 最後に作った日時（ms） */
export function lastMadeAt(history: readonly HistoryEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of history) {
    const t = Date.parse(e.at);
    if (Number.isNaN(t)) continue;
    if (t > (map.get(e.recipeId) ?? -Infinity)) map.set(e.recipeId, t);
  }
  return map;
}

export function daysSince(ms: number, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - ms) / DAY_MS));
}

export function daysLabel(days: number): string {
  return days === 0 ? "今日" : `${days}日前`;
}

/**
 * 履歴からレシピの重みを作る（純粋関数）。
 * 一度も作っていない: 3 ／ 最近作った: 小さく ／ 7日で 1 ／ 21日以上で 3
 */
export function historyWeights(
  recipes: readonly Recipe[],
  history: readonly HistoryEntry[],
  now: number = Date.now(),
): Map<string, number> {
  const last = lastMadeAt(history);
  const weights = new Map<string, number>();
  for (const r of recipes) {
    const t = last.get(r.id);
    weights.set(r.id, t === undefined ? 3 : Math.min(3, Math.max(0.1, daysSince(t, now) / 7)));
  }
  return weights;
}
