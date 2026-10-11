<script lang="ts">
  import type { Recipe } from '../types';

  interface Props {
    recipe: Recipe;
    names: Map<string, string>;
    missing?: string[];
    onselect: (recipe: Recipe) => void;
  }
  let { recipe, names, missing = [], onselect }: Props = $props();

  const main = $derived(
    recipe.ingredients.slice(0, 4).map((i) => names.get(i.id) ?? i.id).join('、'),
  );
</script>

<button class="card" onclick={() => onselect(recipe)}>
  <div class="name">
    {recipe.name}
    {#if missing.length === 0}
      <span class="badge">作れる</span>
    {:else}
      <span class="badge warn">あと{missing.length}品</span>
    {/if}
  </div>
  <div class="meta">{main}ほか ／ {recipe.minutes}分</div>
  {#if missing.length > 0}
    <div class="meta">不足: {missing.map((id) => names.get(id) ?? id).join('、')}</div>
  {/if}
</button>
