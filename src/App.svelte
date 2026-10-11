<script lang="ts">
  import { facets, tags, tagsById, tagName, ingredients, recipes, ingredientName } from './lib/data';
  import { matchRecipes } from './lib/matching';
  import { filterByTags } from './lib/filter';
  import type { Recipe, ResultRow } from './lib/types';
  import IngredientPicker from './lib/components/IngredientPicker.svelte';
  import SelectedTags from './lib/components/SelectedTags.svelte';
  import TagFilter from './lib/components/TagFilter.svelte';
  import RecipeCard from './lib/components/RecipeCard.svelte';
  import RecipeDetail from './lib/components/RecipeDetail.svelte';
  import Gacha from './lib/components/Gacha.svelte';

  let tab = $state<'search' | 'gacha'>('search');
  let selected = $state<string[]>([]);
  let selectedTags = $state<string[]>([]);
  let includeSeasonings = $state(false);
  let maxMissing = $state(2);
  let rows = $state<ResultRow[] | null>(null);
  let opened = $state<Recipe | null>(null);

  // タグ絞り込み後の候補（検索・ガチャ共通）
  const pool = $derived(filterByTags(recipes, tagsById, selectedTags));

  const tagCounts = new Map<string, number>();
  for (const r of recipes) for (const t of r.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  function search() {
    rows =
      selected.length > 0
        ? matchRecipes(selected, pool, ingredients, { maxMissing, includeSeasonings })
        : pool.map((recipe) => ({ recipe }));
    opened = null;
  }
</script>

<main>
  <h1>こんだて旅</h1>
  <nav>
    <button aria-pressed={tab === 'search'} onclick={() => (tab = 'search')}>探す</button>
    <button aria-pressed={tab === 'gacha'} onclick={() => (tab = 'gacha')}>献立ガチャ</button>
  </nav>

  <TagFilter
    {facets}
    {tags}
    counts={tagCounts}
    selected={selectedTags}
    ontoggle={(id) => (selectedTags = toggle(selectedTags, id))}
    onclear={() => (selectedTags = [])}
  />

  {#if tab === 'search'}
    <h2>具材（なくてもOK）</h2>
    <SelectedTags {selected} names={ingredientName} onremove={(id) => (selected = toggle(selected, id))} />
    <div class="options">
      <label><input type="checkbox" bind:checked={includeSeasonings} /> 調味料も不足に数える</label>
      <label>
        許容する不足数
        <select bind:value={maxMissing}>
          <option value={0}>0（作れるもののみ）</option>
          <option value={1}>1</option>
          <option value={2}>2</option>
        </select>
      </label>
      <button class="primary" onclick={search} disabled={selected.length === 0 && selectedTags.length === 0}>
        この条件で探す
      </button>
    </div>

    {#if rows}
      <h2>結果（{rows.length}件）</h2>
      <div class="cards">
        {#each rows as row (row.recipe.id)}
          <RecipeCard recipe={row.recipe} names={ingredientName} missing={row.missing} onselect={(r) => (opened = r)} />
        {:else}
          <p class="muted">条件に合うレシピがありません。条件をゆるめてみてください。</p>
        {/each}
      </div>
    {/if}

    {#if opened}
      <RecipeDetail recipe={opened} names={ingredientName} tagNames={tagName} onclose={() => (opened = null)} />
    {/if}

    <h2>具材一覧</h2>
    <IngredientPicker {ingredients} {selected} ontoggle={(id) => (selected = toggle(selected, id))} />
  {:else}
    <Gacha recipes={pool} onpick={(r) => (opened = r)} />
    {#if opened}
      <RecipeDetail recipe={opened} names={ingredientName} tagNames={tagName} onclose={() => (opened = null)} />
    {/if}
  {/if}
</main>
