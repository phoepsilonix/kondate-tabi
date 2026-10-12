<script lang="ts">
import type { Recipe } from "../types";

interface Props {
	recipe: Recipe;
	names: Map<string, string>;
	missing?: string[];
	/** 補足（例: 3日前に作った） */
	note?: string;
	onselect: (recipe: Recipe) => void;
}
let { recipe, names, missing, note, onselect }: Props = $props();

const main = $derived(
	recipe.ingredients
		.slice(0, 4)
		.map((i) => names.get(i.id) ?? i.id)
		.join("、"),
);
</script>

<button type="button" class="card" onclick={() => onselect(recipe)}>
  <div class="name">
    {recipe.name}
    {#if missing !== undefined}
      {#if missing.length === 0}
        <span class="badge">作れる</span>
      {:else}
        <span class="badge warn">あと{missing.length}品</span>
      {/if}
    {/if}
  </div>
  <div class="meta">{main}ほか ／ {recipe.minutes}分</div>
  {#if note}
    <div class="meta">{note}</div>
  {/if}
  {#if missing && missing.length > 0}
    <div class="meta">不足: {missing.map((id) => names.get(id) ?? id).join('、')}</div>
  {/if}
</button>
