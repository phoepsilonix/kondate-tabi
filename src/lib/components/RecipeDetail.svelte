<script lang="ts">
  import type { Recipe } from "../types";

  interface Props {
    recipe: Recipe;
    names: Map<string, string>;
    tagNames: Map<string, string>;
    /** 前回作った日の表示（なければ undefined） */
    lastMade?: string;
    onmade: (recipe: Recipe) => void;
    onclose: () => void;
  }
  let { recipe, names, tagNames, lastMade, onmade, onclose }: Props = $props();
</script>

<section class="detail">
  <h2>{recipe.name}（{recipe.minutes}分）</h2>
  <p class="muted">{recipe.tags.map((t) => tagNames.get(t) ?? t).join(" / ")}</p>
  <p class="muted">{lastMade ? `前回: ${lastMade}` : "まだ作っていません"}</p>
  <h3>材料</h3>
  <ul>
    {#each recipe.ingredients as ing (ing.id)}
      <li>{names.get(ing.id) ?? ing.id} {ing.amount}</li>
    {/each}
  </ul>
  <h3>手順</h3>
  <ol>
    {#each recipe.steps as step}
      <li>{step}</li>
    {/each}
  </ol>
  <button type="button" class="primary" onclick={() => onmade(recipe)}>今日作った・食べた</button>
  <button type="button" onclick={onclose}>閉じる</button>
</section>
