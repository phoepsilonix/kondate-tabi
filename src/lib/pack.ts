import type { Pack } from "./types";

export type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/** 参照チェックに使う、すでに存在する id の集合 */
export interface KnownIds {
  facets: ReadonlySet<string>;
  tags: ReadonlySet<string>;
  ingredients: ReadonlySet<string>;
}

export const RESERVED_PACK_IDS = ["base"];
const PACK_ID_RE = /^[a-z0-9][a-z0-9_-]*$/;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function knownIdsOf(packs: readonly Pack[]): KnownIds {
  const ids = (pick: (p: Pack) => { id: string }[] | undefined) =>
    new Set(packs.flatMap((p) => (pick(p) ?? []).map((x) => x.id)));
  return {
    facets: ids((p) => p.facets),
    tags: ids((p) => p.tags),
    ingredients: ids((p) => p.ingredients),
  };
}

/**
 * 外部から読み込んだパックを検証する。
 * - パック独自の具材・レシピの id は「パックid.名前」にする（他パックとの衝突防止）
 * - レシピが参照する具材・タグは、既存または同じパック内に存在すること
 */
export function validatePack(raw: unknown, known: KnownIds): Result<Pack> {
  if (!isObj(raw)) return { ok: false, errors: ["パックの形式が正しくありません"] };
  const errors: string[] = [];
  const id = raw.id;
  if (typeof id !== "string" || !PACK_ID_RE.test(id)) {
    errors.push("パックの id は半角の英小文字・数字・_ - のみ使えます");
  } else if (RESERVED_PACK_IDS.includes(id)) {
    errors.push(`id「${id}」は予約されています`);
  }
  if (!isStr(raw.name)) errors.push("パックの name がありません");
  if (!isStr(raw.version)) errors.push("パックの version がありません");
  if (errors.length > 0 || typeof id !== "string") return { ok: false, errors };

  const facetIds = new Set(known.facets);
  const tagIds = new Set(known.tags);
  const ingredientIds = new Set(known.ingredients);

  for (const f of list(raw.facets)) {
    if (!isObj(f) || !isStr(f.id) || !isStr(f.name)) errors.push("facets の形式が正しくありません");
    else if (facetIds.has(f.id)) errors.push(`軸「${f.id}」はすでに存在します`);
    else facetIds.add(f.id);
  }
  for (const t of list(raw.tags)) {
    if (!isObj(t) || !isStr(t.id) || !isStr(t.name) || !isStr(t.facet)) {
      errors.push("tags の形式が正しくありません");
    } else if (tagIds.has(t.id)) {
      errors.push(`タグ「${t.id}」はすでに存在します`);
    } else {
      tagIds.add(t.id);
      if (!facetIds.has(t.facet)) errors.push(`タグ「${t.id}」の軸「${t.facet}」が見つかりません`);
    }
  }
  for (const i of list(raw.ingredients)) {
    if (!isObj(i) || !isStr(i.id) || !isStr(i.name) || !isStr(i.category)) {
      errors.push("ingredients の形式が正しくありません");
    } else if (!i.id.startsWith(`${id}.`)) {
      errors.push(`具材の id「${i.id}」は「${id}.」で始めてください`);
    } else ingredientIds.add(i.id);
  }
  const recipeIds = new Set<string>();
  for (const r of list(raw.recipes)) {
    if (!isObj(r) || !isStr(r.id) || !isStr(r.name)) {
      errors.push("recipes の形式が正しくありません");
      continue;
    }
    if (!r.id.startsWith(`${id}.`))
      errors.push(`レシピの id「${r.id}」は「${id}.」で始めてください`);
    if (recipeIds.has(r.id)) errors.push(`レシピの id「${r.id}」が重複しています`);
    recipeIds.add(r.id);
    const steps = r.steps;
    if (!Array.isArray(steps) || !steps.every((s) => typeof s === "string")) {
      errors.push(`レシピ「${r.name}」の steps が正しくありません`);
    }
    if (typeof r.minutes !== "number" || !(r.minutes >= 0)) {
      errors.push(`レシピ「${r.name}」の minutes が正しくありません`);
    }
    for (const ing of list(r.ingredients)) {
      if (!isObj(ing) || !isStr(ing.id) || typeof ing.amount !== "string") {
        errors.push(`レシピ「${r.name}」の材料の形式が正しくありません`);
      }
    }
    if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) {
      errors.push(`レシピ「${r.name}」に材料がありません`);
    }
    if (!Array.isArray(r.tags)) errors.push(`レシピ「${r.name}」の tags が正しくありません`);
  }
  // 参照の確認は、パック内の具材・タグを登録し終えてから
  for (const r of list(raw.recipes)) {
    if (!isObj(r)) continue;
    for (const ing of list(r.ingredients)) {
      if (isObj(ing) && isStr(ing.id) && !ingredientIds.has(ing.id)) {
        errors.push(`レシピ「${String(r.name)}」の具材「${ing.id}」が見つかりません`);
      }
    }
    for (const t of list(r.tags)) {
      if (typeof t === "string" && !tagIds.has(t)) {
        errors.push(`レシピ「${String(r.name)}」のタグ「${t}」が見つかりません`);
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors: [...new Set(errors)] };
  return { ok: true, value: raw as unknown as Pack };
}

export function summarizePack(p: Pack) {
  return {
    recipes: p.recipes?.length ?? 0,
    ingredients: p.ingredients?.length ?? 0,
    tags: p.tags?.length ?? 0,
  };
}
