import { type AppData, emptyAppData, mergeAppData } from "./app-data";
import { AutoBackup, type BackupResult } from "./auto-backup";
import { type BackupEnvelope, parseBackup, sortBackupNames } from "./backup";
import type { Result } from "./pack";
import { type LoadStatus, loadAppData, type RestoreCandidate } from "./persistence";
import type { Services } from "./ports";
import type { Pack } from "./types";

/** アプリ全体のユーザーデータ。変更のたびに保存し、自動バックアップを予約する。 */
class AppStore {
  data = $state<AppData>(emptyAppData());
  ready = $state(false);
  loadStatus = $state<LoadStatus>("empty");
  /** 起動時に見つかった、復元できる自動バックアップ（ユーザーの確認待ち） */
  restoreCandidate = $state<RestoreCandidate | null>(null);
  lastBackup = $state<{ at: string; result: BackupResult } | null>(null);
  backupNames = $state<string[]>([]);
  services = $state.raw<Services | null>(null);

  private auto: AutoBackup | null = null;
  private saveChain: Promise<unknown> = Promise.resolve();

  async init(services: Services) {
    this.services = services;
    this.auto = new AutoBackup(services.backupTarget, {
      onResult: (result) => {
        this.lastBackup = { at: new Date().toISOString(), result };
        void this.refreshBackupList();
      },
    });
    const loaded = await loadAppData(services.store, services.backupTarget);
    this.data = loaded.data;
    this.loadStatus = loaded.status;
    this.restoreCandidate = loaded.restoreCandidate;
    this.ready = true;
    await this.refreshBackupList();
    // 画面を閉じる・隠す直前に、待機中のバックアップを書き出す（最善努力）
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void this.auto?.flush();
    });
    addEventListener("pagehide", () => void this.auto?.flush());
  }

  /** データを変更して保存する */
  mutate(fn: (d: AppData) => void) {
    fn(this.data);
    this.persist();
  }

  snapshot(): AppData {
    return $state.snapshot(this.data) as AppData;
  }

  private persist() {
    const text = JSON.stringify(this.snapshot());
    const store = this.services?.store;
    if (store) {
      // 保存は順番に1つずつ行う
      this.saveChain = this.saveChain
        .then(() => store.save(text))
        .catch((e) => console.error("データの保存に失敗しました", e));
    }
    this.auto?.schedule(() => this.snapshot());
  }

  // ---- 復元 ----

  /** バックアップの内容を現在のデータに反映する。replace: 置き換え / merge: 統合 */
  applyBackup(env: BackupEnvelope, mode: "replace" | "merge") {
    this.data = mode === "replace" ? env.data : mergeAppData(this.snapshot(), env.data);
    this.restoreCandidate = null;
    this.persist();
  }

  acceptRestoreCandidate() {
    if (this.restoreCandidate) this.applyBackup(this.restoreCandidate.envelope, "replace");
  }

  dismissRestoreCandidate() {
    this.restoreCandidate = null;
  }

  // ---- バックアップ ----

  async backupNow(): Promise<BackupResult> {
    const result = (await this.auto?.runNow(this.snapshot())) ?? {
      status: "error" as const,
      message: "初期化されていません",
    };
    return result;
  }

  /** 自動バックアップのファイルを1つ読み込んで検証する */
  async readBackup(name: string): Promise<Result<BackupEnvelope>> {
    const target = this.services?.backupTarget;
    if (!target) return { ok: false, errors: ["初期化されていません"] };
    try {
      return await parseBackup(await target.read(name));
    } catch {
      return { ok: false, errors: ["ファイルを読み込めませんでした"] };
    }
  }

  async refreshBackupList() {
    try {
      this.backupNames = sortBackupNames((await this.services?.backupTarget.list()) ?? []);
    } catch {
      this.backupNames = [];
    }
  }

  // ---- パック ----

  installPack(pack: Pack) {
    this.mutate((d) => {
      d.packs = [...d.packs.filter((p) => p.id !== pack.id), pack];
      d.disabledPacks = d.disabledPacks.filter((id) => id !== pack.id);
    });
  }

  removePack(id: string) {
    this.mutate((d) => {
      d.packs = d.packs.filter((p) => p.id !== id);
      d.disabledPacks = d.disabledPacks.filter((x) => x !== id);
    });
  }

  setPackEnabled(id: string, enabled: boolean) {
    this.mutate((d) => {
      const rest = d.disabledPacks.filter((x) => x !== id);
      d.disabledPacks = enabled ? rest : [...rest, id];
    });
  }
}

export const appStore = new AppStore();

/** パントリー（家にある具材） */
export const pantry = {
  get ids() {
    return appStore.data.pantry;
  },
  toggle(id: string) {
    appStore.mutate((d) => {
      d.pantry = d.pantry.includes(id) ? d.pantry.filter((x) => x !== id) : [...d.pantry, id];
    });
  },
  clear() {
    appStore.mutate((d) => {
      d.pantry = [];
    });
  },
};

/** 「作った・食べた」の履歴 */
export const history = {
  get entries() {
    return appStore.data.history;
  },
  add(recipeId: string, at: Date = new Date()) {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    appStore.mutate((d) => {
      d.history = [{ id, recipeId, at: at.toISOString() }, ...d.history];
    });
  },
  remove(id: string) {
    appStore.mutate((d) => {
      d.history = d.history.filter((e) => e.id !== id);
    });
  },
};
