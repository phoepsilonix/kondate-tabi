export interface Ingredient {
  id: string;
  name: string;
  category: string;
}

export interface RecipeIngredient {
  id: string;
  amount: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  minutes: number;
  /** タグ id の配列 */
  tags: string[];
}

/** 軸（ファセット）。例: 地域、料理ジャンル、形態 */
export interface Facet {
  id: string;
  name: string;
}

/** タグ。1つのレシピが複数の軸・複数のタグを持てる。id は「軸.名前」形式（例: genre.washoku） */
export interface Tag {
  id: string;
  name: string;
  facet: string;
}

/** データパック。標準データも追加の地域パックも同じ形式。id は他パックと被らないようにする */
export interface Pack {
  id: string;
  name: string;
  version: string;
  description?: string;
  facets?: Facet[];
  tags?: Tag[];
  ingredients?: Ingredient[];
  recipes?: Recipe[];
}

/** 結果一覧の1行。具材マッチを使わない場合 missing は undefined */
export interface ResultRow {
  recipe: Recipe;
  missing?: string[];
}

export interface MatchResult {
  recipe: Recipe;
  /** 不足している材料の id（調味料を除外する設定の場合は主材料のみ） */
  missing: string[];
  isPerfect: boolean;
}

export interface MatchOptions {
  /** 許容する不足材料数（既定 2） */
  maxMissing?: number;
  /** true の場合、調味料も「必要な材料」として数える（既定 false: 家にある前提） */
  includeSeasonings?: boolean;
  /** 同順位の並び替えに使う乱数（既定 Math.random。テスト時に差し替え可） */
  random?: () => number;
  /** レシピ id ごとの重み（大きいほど同順位の中で前に来やすい。履歴から作る。既定は全て 1） */
  weights?: ReadonlyMap<string, number>;
}

/** 「作った・食べた」の記録 */
export interface HistoryEntry {
  id: string;
  recipeId: string;
  /** ISO 8601 形式の日時 */
  at: string;
}
