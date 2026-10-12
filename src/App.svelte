<script lang="ts">
import Gacha from "./lib/components/Gacha.svelte";
import HistoryList from "./lib/components/HistoryList.svelte";
import IngredientPicker from "./lib/components/IngredientPicker.svelte";
import RecipeCard from "./lib/components/RecipeCard.svelte";
import RecipeDetail from "./lib/components/RecipeDetail.svelte";
import SelectedTags from "./lib/components/SelectedTags.svelte";
import TagFilter from "./lib/components/TagFilter.svelte";
import {
	facets,
	ingredientName,
	ingredients,
	recipes,
	tagName,
	tags,
	tagsById,
} from "./lib/data";
import { filterByTags } from "./lib/filter";
import {
	daysLabel,
	daysSince,
	historyWeights,
	lastMadeAt,
} from "./lib/history";
import { matchRecipes } from "./lib/matching";
import { history, pantry } from "./lib/store.svelte";
import type { Recipe, ResultRow } from "./lib/types";

let tab = $state<"search" | "gacha" | "pantry" | "history">("search");
let selected = $state<string[]>([]);
let selectedTags = $state<string[]>([]);
let usePantry = $state(true);
let includeSeasonings = $state(false);
let maxMissing = $state(2);
let rows = $state<ResultRow[] | null>(null);
let opened = $state<Recipe | null>(null);

// タグ絞り込み後の候補（検索・ガチャ共通）
const pool = $derived(filterByTags(recipes, tagsById, selectedTags));

const tagCounts = new Map<string, number>();
for (const r of recipes)
	for (const t of r.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);

const recipeById = new Map(recipes.map((r) => [r.id, r]));
const last = $derived(lastMadeAt(history.entries));
const weights = $derived(historyWeights(recipes, history.entries));
// 検索に使う具材 = パントリー + 今回選んだもの
const effective = $derived(
	usePantry ? [...new Set([...pantry.ids, ...selected])] : selected,
);

const lastLabel = (id: string) => {
	const t = last.get(id);
	return t === undefined ? undefined : daysLabel(daysSince(t));
};

const toggle = (list: string[], id: string) =>
	list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

function search() {
	rows =
		effective.length > 0
			? matchRecipes(effective, pool, ingredients, {
					maxMissing,
					includeSeasonings,
					weights,
				})
			: pool.map((recipe) => ({ recipe }));
	opened = null;
}
</script>

<main>
  <h1>こんだて旅</h1>
  <nav>
    <button aria-pressed={tab === 'search'} onclick={() => (tab = 'search')}>探す</button>
    <button aria-pressed={tab === 'gacha'} onclick={() => (tab = 'gacha')}>献立ガチャ</button>
    <button aria-pressed={tab === 'pantry'} onclick={() => (tab = 'pantry')}>パントリー</button>
    <button aria-pressed={tab === 'history'} onclick={() => (tab = 'history')}>履歴</button>
  </nav>

  {#if tab === 'search' || tab === 'gacha'}
  <TagFilter
    {facets}
    {tags}
    counts={tagCounts}
    selected={selectedTags}
    ontoggle={(id) => (selectedTags = toggle(selectedTags, id))}
    onclear={() => (selectedTags = [])}
  />
  {/if}

  {#if tab === 'search'}
    <h2>具材（なくてもOK）</h2>
    <SelectedTags {selected} names={ingredientName} onremove={(id) => (selected = toggle(selected, id))} />
    <div class="options">
      <label><input type="checkbox" bind:checked={usePantry} /> パントリーの具材も使う（{pantry.ids.length}品）</label>
      <label><input type="checkbox" bind:checked={includeSeasonings} /> 調味料も不足に数える</label>
      <label>
        許容する不足数
        <select bind:value={maxMissing}>
          <option value={0}>0（作れるもののみ）</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
        </select>
      </label>
      <button class="primary" onclick={search} disabled={effective.length === 0 && selectedTags.length === 0}>
        この条件で探す
      </button>
    </div>

    {#if rows}
      <h2>結果（{rows.length}件）</h2>
      <div class="cards">
        {#each rows as row (row.recipe.id)}
          <RecipeCard recipe={row.recipe} names={ingredientName} missing={row.missing} note={lastLabel(row.recipe.id) && `${lastLabel(row.recipe.id)}に作った`} onselect={(r) => (opened = r)} />
        {:else}
          <p class="muted">条件に合うレシピがありません。条件をゆるめてみてください。</p>
        {/each}
      </div>
    {/if}

    {#if opened}
      <RecipeDetail recipe={opened} names={ingredientName} tagNames={tagName} lastMade={lastLabel(opened.id)} onmade={(r) => history.add(r.id)} onclose={() => (opened = null)} />
    {/if}

    <h2>具材一覧</h2>
    <IngredientPicker {ingredients} {selected} ontoggle={(id) => (selected = toggle(selected, id))} />
  {:else if tab === 'gacha'}
    <Gacha recipes={pool} {weights} onpick={(r) => (opened = r)} />
    {#if opened}
      <RecipeDetail recipe={opened} names={ingredientName} tagNames={tagName} lastMade={lastLabel(opened.id)} onmade={(r) => history.add(r.id)} onclose={() => (opened = null)} />
    {/if}
  {:else if tab === 'pantry'}
    <h2>パントリー（{pantry.ids.length}品）</h2>
    <p class="muted">家にある具材を登録しておくと、「探す」で毎回選び直さなくても使われます。登録内容はこの端末に保存されます。</p>
    <IngredientPicker {ingredients} selected={pantry.ids} ontoggle={(id) => pantry.toggle(id)} />
    <button onclick={() => pantry.clear()} disabled={pantry.ids.length === 0}>すべて外す</button>
  {:else}
    <h2>履歴</h2>
    <HistoryList
      entries={history.entries}
      recipes={recipeById}
      onopen={(r) => { opened = r; tab = 'search'; }}
      onremove={(id) => history.remove(id)}
    />
  {/if}
</main>
