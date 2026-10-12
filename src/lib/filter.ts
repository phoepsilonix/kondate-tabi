import type { Recipe, Tag } from "./types";

/**
 * タグによる絞り込み（純粋関数）。
 * 同じ軸のタグ同士は OR、異なる軸同士は AND。
 * 例: (和食 または 中華) かつ 丼 かつ (肉 または 魚)
 */
export function filterByTags(
  recipes: readonly Recipe[],
  tagsById: ReadonlyMap<string, Tag>,
  selectedTagIds: readonly string[],
): Recipe[] {
  const byFacet = new Map<string, Set<string>>();
  for (const id of selectedTagIds) {
    const facet = tagsById.get(id)?.facet;
    if (!facet) continue;
    const set = byFacet.get(facet) ?? new Set<string>();
    set.add(id);
    byFacet.set(facet, set);
  }
  if (byFacet.size === 0) return [...recipes];
  const groups = [...byFacet.values()];
  return recipes.filter((r) => groups.every((ids) => r.tags.some((t) => ids.has(t))));
}
