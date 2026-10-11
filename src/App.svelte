<script lang="ts">
  import { ingredients, recipes, ingredientName } from './lib/data';
  import { matchRecipes } from './lib/matching';
  import type { MatchResult, Recipe } from './lib/types';
  import IngredientPicker from './lib/components/IngredientPicker.svelte';
  import SelectedTags from './lib/components/SelectedTags.svelte';
  import RecipeCard from './lib/components/RecipeCard.svelte';
  import RecipeDetail from './lib/components/RecipeDetail.svelte';
  import Gacha from './lib/components/Gacha.svelte';

  let tab = $state<'search' | 'gacha'>('search');
  let selected = $state<string[]>([]);
  let includeSeasonings = $state(false);
  let maxMissing = $state(2);
  let matches = $state<MatchResult[] | null>(null);
  let opened = $state<Recipe | null>(null);

  function toggle(id: string) {
    selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
  }

  function search() {
    matches = matchRecipes(selected, recipes, ingredients, { maxMissing, includeSeasonings });
    opened = null;
  }
</script>

<main>
  <h1>こんだて旅</h1>
  <nav>
    <button aria-pressed={tab === 'search'} onclick={() => (tab = 'search')}>具材から探す</button>
    <button aria-pressed={tab === 'gacha'} onclick={() => (tab = 'gacha')}>献立ガチャ</button>
  </nav>

  {#if tab === 'search'}
    <SelectedTags {selected} names={ingredientName} onremove={toggle} />
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
      <button class="primary" onclick={search} disabled={selected.length === 0}>この具材で作れる料理</button>
    </div>

    {#if matches}
      <h2>結果（{matches.length}件）</h2>
      <div class="cards">
        {#each matches as m (m.recipe.id)}
          <RecipeCard recipe={m.recipe} names={ingredientName} missing={m.missing} onselect={(r) => (opened = r)} />
        {:else}
          <p class="muted">条件に合うレシピがありません。具材を増やすか、許容する不足数を増やしてください。</p>
        {/each}
      </div>
    {/if}

    {#if opened}
      <RecipeDetail recipe={opened} names={ingredientName} onclose={() => (opened = null)} />
    {/if}

    <h2>具材</h2>
    <IngredientPicker {ingredients} {selected} ontoggle={toggle} />
  {:else}
    <Gacha {recipes} onpick={(r) => { opened = r; }} />
    {#if opened}
      <RecipeDetail recipe={opened} names={ingredientName} onclose={() => (opened = null)} />
    {/if}
  {/if}
</main>
