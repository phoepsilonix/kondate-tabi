<script lang="ts">
  import { daysLabel, daysSince } from "../history";
  import type { HistoryEntry, Recipe } from "../types";

  interface Props {
    entries: HistoryEntry[];
    recipes: Map<string, Recipe>;
    onopen: (recipe: Recipe) => void;
    onremove: (id: string) => void;
  }
  let { entries, recipes, onopen, onremove }: Props = $props();
  const rows = $derived(entries.map((e) => ({ e, recipe: recipes.get(e.recipeId) })));
</script>

{#if entries.length === 0}
  <p class="muted">まだ記録がありません。レシピ詳細の「作った・食べた」ボタンで記録できます。</p>
{:else}
  <ul class="history">
    {#each rows as { e, recipe } (e.id)}
      <li>
        <span class="muted"
          >{new Date(e.at).toLocaleDateString("ja-JP")}（{daysLabel(daysSince(Date.parse(e.at)))}）</span
        >
        {#if recipe}
          <button type="button" onclick={() => onopen(recipe)}>{recipe.name}</button>
        {:else}
          <span>{e.recipeId}（データなし）</span>
        {/if}
        <button type="button" onclick={() => onremove(e.id)} aria-label="この記録を削除">
          削除
        </button>
      </li>
    {/each}
  </ul>
{/if}
