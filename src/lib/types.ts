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
  tags: string[];
}

export interface Dataset {
  ingredients: Ingredient[];
  recipes: Recipe[];
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
}
