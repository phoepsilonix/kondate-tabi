<script lang="ts">
import { summarizeAppData } from "../app-data";
import type { BackupResult } from "../auto-backup";
import {
  type BackupEnvelope,
  backupFileName,
  backupTimeOf,
  createBackup,
  parseBackup,
  serializeBackup,
} from "../backup";
import { catalog } from "../catalog.svelte";
import { summarizePack, validatePack } from "../pack";
import { appStore } from "../store.svelte";
import type { Pack } from "../types";

type Message = { kind: "ok" | "error"; text: string; details?: string[] };

let message = $state<Message | null>(null);
let pendingBackup = $state<{ env: BackupEnvelope; source: string } | null>(null);
let pendingPack = $state<{ pack: Pack; update: boolean } | null>(null);

const files = $derived(appStore.services?.files ?? null);
const when = (iso: string) => new Date(iso).toLocaleString("ja-JP");
const nameTime = (name: string) => when(new Date(backupTimeOf(name) ?? 0).toISOString());

function describe(r: BackupResult): Message {
  switch (r.status) {
    case "written":
      return { kind: "ok", text: "バックアップを保存しました" };
    case "unchanged":
      return { kind: "ok", text: "前回のバックアップから変更はありません" };
    case "skipped-empty":
      return { kind: "ok", text: "保存するデータがまだありません" };
    case "error":
      return { kind: "error", text: "バックアップに失敗しました", details: [r.message] };
  }
}

async function backupNow() {
  message = describe(await appStore.backupNow());
}

async function exportBackup() {
  if (!files) return;
  try {
    const env = await createBackup(appStore.snapshot());
    const r = await files.exportText(backupFileName(new Date()), serializeBackup(env));
    message = r === "saved" ? { kind: "ok", text: "エクスポートしました" } : null;
  } catch (e) {
    message = { kind: "error", text: "エクスポートに失敗しました", details: [String(e)] };
  }
}

async function importBackup() {
  if (!files) return;
  try {
    const f = await files.pickText();
    if (!f) return;
    const r = await parseBackup(f.text);
    if (!r.ok) {
      message = { kind: "error", text: "バックアップを読み込めませんでした", details: r.errors };
      return;
    }
    message = null;
    pendingBackup = { env: r.value, source: f.name };
  } catch (e) {
    message = { kind: "error", text: "ファイルを読み込めませんでした", details: [String(e)] };
  }
}

async function previewAutoBackup(name: string) {
  const r = await appStore.readBackup(name);
  if (!r.ok) {
    message = { kind: "error", text: "バックアップを読み込めませんでした", details: r.errors };
    return;
  }
  message = null;
  pendingBackup = { env: r.value, source: name };
}

function applyBackup(mode: "replace" | "merge") {
  if (!pendingBackup) return;
  appStore.applyBackup(pendingBackup.env, mode);
  pendingBackup = null;
  message = { kind: "ok", text: mode === "replace" ? "復元しました" : "統合しました" };
}

async function importPack() {
  if (!files) return;
  try {
    const f = await files.pickText();
    if (!f) return;
    let raw: unknown;
    try {
      raw = JSON.parse(f.text);
    } catch {
      message = { kind: "error", text: "パックを読み込めませんでした", details: ["JSON として読み込めません"] };
      return;
    }
    const id = typeof (raw as { id?: unknown })?.id === "string" ? (raw as { id: string }).id : "";
    const v = validatePack(raw, catalog.knownIdsExcluding(id));
    if (!v.ok) {
      message = { kind: "error", text: "パックを取り込めません", details: v.errors };
      return;
    }
    message = null;
    pendingPack = { pack: v.value, update: catalog.all.some((p) => p.id === v.value.id) };
  } catch (e) {
    message = { kind: "error", text: "ファイルを読み込めませんでした", details: [String(e)] };
  }
}

function installPack() {
  if (!pendingPack) return;
  appStore.installPack(pendingPack.pack);
  message = { kind: "ok", text: `「${pendingPack.pack.name}」を取り込みました` };
  pendingPack = null;
}

const kindLabel = (id: string) =>
  catalog.isBase(id) ? "標準" : catalog.isInstalled(id) ? "取り込み" : "同梱";
</script>

<h2>バックアップ</h2>
{#if !files}
  <p class="error">保存機能を初期化できませんでした。アプリを再起動してください。</p>
{/if}
<div class="panel">
  <p>
    データを変更すると、自動でバックアップします（保存先: {appStore.services?.backupTarget.describe() ?? "—"}）。
  </p>
  {#if appStore.lastBackup}
    <p class="muted">最後の自動バックアップ: {when(appStore.lastBackup.at)}</p>
  {/if}
  <div class="options">
    <button type="button" onclick={backupNow} disabled={!files}>今すぐバックアップ</button>
    <button type="button" onclick={exportBackup} disabled={!files}>エクスポート（ファイルに保存）</button>
    <button type="button" onclick={importBackup} disabled={!files}>ファイルから復元</button>
  </div>
  <p class="muted">バックアップには、パントリーや履歴などの個人のデータが含まれます。共有するときはご注意ください。</p>

  {#if appStore.backupNames.length > 0}
    <h3>自動バックアップの一覧</h3>
    <ul class="history">
      {#each appStore.backupNames.slice(0, 5) as name (name)}
        <li>
          <span>{nameTime(name)}</span>
          <button type="button" onclick={() => previewAutoBackup(name)}>復元…</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if pendingBackup}
  {@const s = summarizeAppData(pendingBackup.env.data)}
  <section class="banner">
    <p><strong>{pendingBackup.source}</strong> を読み込みました。</p>
    <p class="muted">
      {pendingBackup.env.createdAt ? when(pendingBackup.env.createdAt) : ""} ／ パントリー {s.pantry}品・履歴
      {s.history}件・取り込みパック {s.packs}件
    </p>
    <button type="button" class="primary" onclick={() => applyBackup("replace")}>今のデータを置き換える</button>
    <button type="button" onclick={() => applyBackup("merge")}>今のデータに統合する</button>
    <button type="button" onclick={() => (pendingBackup = null)}>キャンセル</button>
  </section>
{/if}

<h2>データパック</h2>
<div class="panel">
  <ul class="packs">
    {#each catalog.all as p (p.id)}
      {@const c = summarizePack(p)}
      <li>
        <label>
          <input
            type="checkbox"
            checked={catalog.isBase(p.id) || !appStore.data.disabledPacks.includes(p.id)}
            disabled={catalog.isBase(p.id)}
            onchange={(e) => appStore.setPackEnabled(p.id, e.currentTarget.checked)}
          />
          {p.name}
        </label>
        <span class="muted">
          [{kindLabel(p.id)}] v{p.version} ／ レシピ{c.recipes}品
        </span>
        {#if catalog.isInstalled(p.id)}
          <button type="button" onclick={() => appStore.removePack(p.id)}>削除</button>
        {/if}
      </li>
    {/each}
  </ul>
  <button type="button" onclick={importPack} disabled={!files}>パックを読み込む</button>
  <p class="muted">共有するパックは、ご自身で書いた内容のみにしてください。</p>
</div>

{#if pendingPack}
  {@const c = summarizePack(pendingPack.pack)}
  <section class="banner">
    <p>
      <strong>{pendingPack.pack.name}</strong>（v{pendingPack.pack.version}）を
      {pendingPack.update ? "更新" : "追加"}します。
    </p>
    <p class="muted">レシピ {c.recipes}品・具材 {c.ingredients}種・タグ {c.tags}個</p>
    <button type="button" class="primary" onclick={installPack}>{pendingPack.update ? "更新する" : "追加する"}</button>
    <button type="button" onclick={() => (pendingPack = null)}>キャンセル</button>
  </section>
{/if}

{#if message}
  <div class={message.kind === "error" ? "error" : "ok"} role="status">
    <p>{message.text}</p>
    {#if message.details}
      <ul>
        {#each message.details.slice(0, 8) as d}<li>{d}</li>{/each}
        {#if message.details.length > 8}<li>ほか {message.details.length - 8}件</li>{/if}
      </ul>
    {/if}
  </div>
{/if}
