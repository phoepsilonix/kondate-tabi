<script lang="ts">
  import type { Ingredient } from '../types';

  interface Props {
    ingredients: Ingredient[];
    selected: string[];
    ontoggle: (id: string) => void;
  }
  let { ingredients, selected, ontoggle }: Props = $props();

  const groups = $derived.by(() => {
    const map = new Map<string, Ingredient[]>();
    for (const item of ingredients) {
      const list = map.get(item.category);
      if (list) list.push(item);
      else map.set(item.category, [item]);
    }
    return [...map];
  });
</script>

{#each groups as [category, items] (category)}
  <fieldset>
    <legend>{category}</legend>
    {#each items as item (item.id)}
      <label class="chip">
        <input type="checkbox" checked={selected.includes(item.id)} onchange={() => ontoggle(item.id)} />
        {item.name}
      </label>
    {/each}
  </fieldset>
{/each}
