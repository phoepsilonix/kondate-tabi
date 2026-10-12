<script lang="ts">
import type { Facet, Tag } from "../types";

interface Props {
	facets: Facet[];
	tags: Tag[];
	counts: Map<string, number>;
	selected: string[];
	ontoggle: (id: string) => void;
	onclear: () => void;
}
let { facets, tags, counts, selected, ontoggle, onclear }: Props = $props();

// レシピが1件もないタグは表示しない
const groups = $derived(
	facets
		.map((facet) => ({
			facet,
			items: tags.filter(
				(t) => t.facet === facet.id && (counts.get(t.id) ?? 0) > 0,
			),
		}))
		.filter((g) => g.items.length > 0),
);
</script>

<details open>
  <summary>絞り込み<span class="muted">（同じ軸はいずれか／別の軸は全て満たす）</span></summary>
  {#each groups as { facet, items } (facet.id)}
    <fieldset>
      <legend>{facet.name}</legend>
      {#each items as tag (tag.id)}
        <label class="chip">
          <input type="checkbox" checked={selected.includes(tag.id)} onchange={() => ontoggle(tag.id)} />
          {tag.name}<span class="muted">({counts.get(tag.id)})</span>
        </label>
      {/each}
    </fieldset>
  {/each}
  {#if selected.length > 0}
    <button type="button" onclick={onclear}>絞り込みをクリア</button>
  {/if}
</details>
