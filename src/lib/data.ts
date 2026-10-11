import base from './data/base.json';
import type { Pack } from './types';

// src/lib/data/packs/*.json に置いたパックは自動で読み込まれる
const extraPacks = Object.values(
  import.meta.glob<Pack>('./data/packs/*.json', { eager: true, import: 'default' }),
);

export const packs: Pack[] = [base as Pack, ...extraPacks];

/** id が重複した場合は先に読み込んだ方（標準パック）を優先する */
function mergeById<T extends { id: string }>(lists: (T[] | undefined)[]): T[] {
  const map = new Map<string, T>();
  for (const list of lists) {
    for (const item of list ?? []) if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()];
}

export const facets = mergeById(packs.map((p) => p.facets));
export const tags = mergeById(packs.map((p) => p.tags));
export const ingredients = mergeById(packs.map((p) => p.ingredients));
export const recipes = mergeById(packs.map((p) => p.recipes));

export const ingredientName = new Map(ingredients.map((i) => [i.id, i.name]));
export const tagsById = new Map(tags.map((t) => [t.id, t]));
export const tagName = new Map(tags.map((t) => [t.id, t.name]));
