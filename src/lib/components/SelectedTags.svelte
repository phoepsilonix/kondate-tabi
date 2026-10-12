<script lang="ts">
interface Props {
	selected: string[];
	names: Map<string, string>;
	onremove: (id: string) => void;
}
let { selected, names, onremove }: Props = $props();
</script>

<div class="tags">
  {#each selected as id (id)}
    <button type="button" class="tag" onclick={() => onremove(id)} title="クリックで解除">
      {names.get(id) ?? id} ×
    </button>
  {:else}
    <span class="muted">具材を選んでください</span>
  {/each}
</div>
