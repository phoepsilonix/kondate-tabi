import base from "./data/base.json";
import { knownIdsOf } from "./pack";
import { appStore } from "./store.svelte";
import type { Pack } from "./types";

// src/lib/data/packs/*.json に置いたパックは同梱パックとして自動で読み込まれる
const bundled = Object.values(
  import.meta.glob<Pack>("./data/packs/*.json", { eager: true, import: "default" }),
);
const basePack = base as Pack;

/** id が重複した場合は先に並んだ方（標準パック）を優先する */
function mergeById<T extends { id: string }>(lists: (T[] | undefined)[]): T[] {
  const map = new Map<string, T>();
  for (const list of lists) {
    for (const item of list ?? []) if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}

/** 標準パック・同梱パック・取り込んだパックをまとめた、検索対象のデータ */
class Catalog {
  /** 全パック（無効なものも含む）。同じ id なら、取り込んだパックが同梱パックを置き換える */
  readonly all = $derived.by(() => {
    const map = new Map<string, Pack>([[basePack.id, basePack]]);
    for (const p of bundled) map.set(p.id, p);
    for (const p of appStore.data.packs) map.set(p.id, p);
    return [...map.values()];
  });
  /** 標準パックと、有効なパック */
  readonly active = $derived(
    this.all.filter((p) => p.id === basePack.id || !appStore.data.disabledPacks.includes(p.id)),
  );
  readonly facets = $derived(mergeById(this.active.map((p) => p.facets)));
  readonly tags = $derived(mergeById(this.active.map((p) => p.tags)));
  readonly ingredients = $derived(mergeById(this.active.map((p) => p.ingredients)));
  readonly recipes = $derived(mergeById(this.active.map((p) => p.recipes)));

  readonly ingredientName = $derived(new Map(this.ingredients.map((i) => [i.id, i.name])));
  readonly tagsById = $derived(new Map(this.tags.map((t) => [t.id, t])));
  readonly tagName = $derived(new Map(this.tags.map((t) => [t.id, t.name])));
  /** 履歴からの参照用に、無効なパックのレシピも含める */
  readonly recipeById = $derived(
    new Map(mergeById(this.all.map((p) => p.recipes)).map((r) => [r.id, r])),
  );
  /** タグごとのレシピ数（絞り込みの表示用） */
  readonly tagCounts = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const r of this.recipes) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return counts;
  });

  isBase = (id: string) => id === basePack.id;
  isInstalled = (id: string) => appStore.data.packs.some((p) => p.id === id);

  /** 取り込み時の参照チェック用。同じ id のパックを更新する場合に備えて、そのパック自身は除く */
  knownIdsExcluding(packId: string) {
    return knownIdsOf(this.all.filter((p) => p.id !== packId));
  }
}

export const catalog = new Catalog();
