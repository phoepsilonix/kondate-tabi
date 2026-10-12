import type { Ingredient, MatchOptions, MatchResult, Recipe } from "./types";

const SEASONING = "調味料";

/**
 * 選択された具材 id とレシピのマッチ度を計算する純粋関数。
 * 並び順: 不足数の少ない順（完全一致が先頭）。同数の場合は random() で少しばらつかせる（weights があれば重みを反映）。
 */
export function matchRecipes(
  selectedIds: readonly string[],
  recipes: readonly Recipe[],
  ingredients: readonly Ingredient[],
  options: MatchOptions = {},
): MatchResult[] {
  const { maxMissing = 2, includeSeasonings = false, random = Math.random, weights } = options;
  const selected = new Set(selectedIds);
  const seasoningIds = new Set(
    ingredients.filter((i) => i.category === SEASONING).map((i) => i.id),
  );

  const scored: { result: MatchResult; jitter: number }[] = [];
  for (const recipe of recipes) {
    const required = recipe.ingredients
      .map((i) => i.id)
      .filter((id) => includeSeasonings || !seasoningIds.has(id));
    if (required.length === 0) continue;

    const missing = required.filter((id) => !selected.has(id));
    if (missing.length === required.length) continue; // 1つも使えないものは除外
    if (missing.length > maxMissing) continue;

    scored.push({
      result: { recipe, missing, isPerfect: missing.length === 0 },
      // 重みが大きいほど jitter が小さくなり、同順位の中で前に来やすい
      jitter: random() / (weights?.get(recipe.id) ?? 1),
    });
  }

  scored.sort((a, b) => a.result.missing.length - b.result.missing.length || a.jitter - b.jitter);
  return scored.map((s) => s.result);
}
