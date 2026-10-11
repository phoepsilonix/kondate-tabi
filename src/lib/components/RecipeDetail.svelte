<script lang="ts">
  import type { Recipe } from '../types';

  interface Props {
    recipe: Recipe;
    names: Map<string, string>;
    tagNames: Map<string, string>;
    onclose: () => void;
  }
  let { recipe, names, tagNames, onclose }: Props = $props();
</script>

<section class="detail">
  <h2>{recipe.name}（{recipe.minutes}分）</h2>
  <p class="muted">{recipe.tags.map((t) => tagNames.get(t) ?? t).join(' / ')}</p>
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
  <button onclick={onclose}>閉じる</button>
</section>
