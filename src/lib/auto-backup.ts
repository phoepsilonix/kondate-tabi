import { type AppData, isEmptyAppData } from "./app-data";
import {
  backupFileName,
  backupTimeOf,
  createBackup,
  DEFAULT_RETENTION,
  parseBackup,
  type RetentionOptions,
  selectBackupsToPrune,
  serializeBackup,
  sortBackupNames,
} from "./backup";
import type { BackupTarget } from "./ports";

export type BackupResult =
  | { status: "written"; name: string }
  | { status: "unchanged" }
  | { status: "skipped-empty" }
  | { status: "error"; message: string };

export interface AutoBackupOptions {
  /** 最後の変更からこの時間(ms)待ってから書き出す（既定 3秒） */
  debounceMs?: number;
  /** この時間(ms)以内に作った最新のバックアップは、新しい世代を増やさず上書きする（既定 10分） */
  minGenerationMs?: number;
  retention?: RetentionOptions;
  now?: () => Date;
  onResult?: (r: BackupResult) => void;
}

export class AutoBackup {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: (() => AppData) | undefined;
  private lastChecksum: string | undefined;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private target: BackupTarget,
    private opts: AutoBackupOptions = {},
  ) {}

  /** データ変更のたびに呼ぶ。少し待ってまとめて書き出す。 */
  schedule(getData: () => AppData): void {
    this.pending = getData;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.opts.debounceMs ?? 3000);
  }

  /** 待機中の書き出しがあれば、今すぐ実行する（画面を閉じる直前などに呼ぶ） */
  async flush(): Promise<BackupResult | null> {
    clearTimeout(this.timer);
    const getData = this.pending;
    this.pending = undefined;
    return getData ? this.run(getData(), false) : null;
  }

  /** 変更がなくても今すぐバックアップする（「今すぐバックアップ」ボタン用） */
  runNow(data: AppData): Promise<BackupResult> {
    clearTimeout(this.timer);
    this.pending = undefined;
    return this.run(data, true);
  }

  private run(data: AppData, force: boolean): Promise<BackupResult> {
    // 書き込みは1つずつ順番に行う
    const next = this.chain.then(() => this.execute(data, force));
    this.chain = next.catch(() => undefined);
    return next;
  }

  private async execute(data: AppData, force: boolean): Promise<BackupResult> {
    let result: BackupResult;
    try {
      result = await this.write(data, force);
    } catch (e) {
      result = { status: "error", message: e instanceof Error ? e.message : String(e) };
    }
    this.opts.onResult?.(result);
    return result;
  }

  private async write(data: AppData, force: boolean): Promise<BackupResult> {
    // 空のデータで、すでにあるバックアップを押し出さない
    if (isEmptyAppData(data)) return { status: "skipped-empty" };
    const now = (this.opts.now ?? (() => new Date()))();
    const env = await createBackup(data, now);
    const names = sortBackupNames(await this.target.list());
    if (!force && env.checksum === (await this.latestChecksum(names))) {
      return { status: "unchanged" };
    }
    // 直近のバックアップが新しければ上書きし、操作のたびに世代が増えないようにする
    const latestTime = names.length > 0 ? backupTimeOf(names[0]) : null;
    const minGen = this.opts.minGenerationMs ?? 10 * 60 * 1000;
    const name =
      latestTime !== null && now.getTime() - latestTime < minGen ? names[0] : backupFileName(now);
    await this.target.write(name, serializeBackup(env));
    this.lastChecksum = env.checksum;
    const after = new Set([...names, name]);
    for (const old of selectBackupsToPrune(
      [...after],
      now.getTime(),
      this.opts.retention ?? DEFAULT_RETENTION,
    )) {
      await this.target.remove(old).catch(() => undefined);
    }
    return { status: "written", name };
  }

  private async latestChecksum(sortedNames: string[]): Promise<string | undefined> {
    if (this.lastChecksum) return this.lastChecksum;
    if (sortedNames.length === 0) return undefined;
    try {
      const parsed = await parseBackup(await this.target.read(sortedNames[0]));
      return parsed.ok ? parsed.value.checksum : undefined;
    } catch {
      return undefined;
    }
  }
}
