<script lang="ts">
import { summarizeAppData } from "../app-data";
import type { RestoreCandidate } from "../persistence";

interface Props {
  candidate: RestoreCandidate;
  corrupt: boolean;
  onaccept: () => void;
  ondismiss: () => void;
}
let { candidate, corrupt, onaccept, ondismiss }: Props = $props();

const summary = $derived(summarizeAppData(candidate.envelope.data));
const when = $derived(new Date(candidate.envelope.createdAt).toLocaleString("ja-JP"));
</script>

<section class="banner">
  <p>
    <strong>バックアップが見つかりました。</strong>
    {#if corrupt}保存データを読み込めなかったため、元のデータは別ファイルに退避しました。{/if}
  </p>
  <p class="muted">
    {when} ／ パントリー {summary.pantry}品・履歴 {summary.history}件・取り込みパック {summary.packs}件
  </p>
  <button class="primary" onclick={onaccept}>このバックアップから復元</button>
  <button onclick={ondismiss}>復元しない</button>
</section>
