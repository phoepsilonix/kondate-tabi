<script lang="ts">
  import { onDestroy } from 'svelte';
  import { fly } from 'svelte/transition';
  import type { Recipe } from '../types';

  interface Props {
    recipes: Recipe[];
    onpick: (recipe: Recipe) => void;
  }
  let { recipes, onpick }: Props = $props();

  let count = $state(1);
  let spinning = $state(false);
  let rolling = $state('');
  let results = $state<Recipe[]>([]);
  let history = $state<Recipe[]>([]);
  let timer: ReturnType<typeof setInterval> | undefined;

  const TICKS = 16;
  const INTERVAL_MS = 70;

  function pickDistinct(n: number): Recipe[] {
    const pool = [...recipes];
    const out: Recipe[] = [];
    while (out.length < n && pool.length > 0) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
  }

  function spin() {
    if (spinning || recipes.length === 0) return;
    spinning = true;
    results = [];
    let ticks = 0;
    timer = setInterval(() => {
      rolling = recipes[Math.floor(Math.random() * recipes.length)].name;
      if (++ticks >= TICKS) {
        clearInterval(timer);
        results = pickDistinct(count);
        history.push(...results);
        spinning = false;
      }
    }, INTERVAL_MS);
  }

  onDestroy(() => clearInterval(timer));
</script>

<div class="options">
  <label><input type="radio" bind:group={count} value={1} /> 1品</label>
  <label><input type="radio" bind:group={count} value={3} /> 3品</label>
  <button class="primary" onclick={spin} disabled={spinning || recipes.length === 0}>ガチャを回す</button>
  <span class="muted">候補 {recipes.length}品</span>
</div>

<div class="slot">
  {#if spinning}
    {#key rolling}
      <div in:fly={{ y: -12, duration: 100 }}>{rolling}</div>
    {/key}
  {:else if results.length > 0}
    {#each results as r (r.id)}
      <div><button onclick={() => onpick(r)}>{r.name}</button></div>
    {/each}
  {:else}
    <span class="muted">ボタンを押すと今日の献立が決まります</span>
  {/if}
</div>

{#if history.length > 0}
  <h2>履歴</h2>
  <p>{history.map((r) => r.name).join(' → ')}</p>
  <button onclick={() => (history = [])}>履歴を消す</button>
{/if}
