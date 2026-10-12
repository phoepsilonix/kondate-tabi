import { describe, expect, it, vi } from "vitest";
import { emptyAppData } from "./app-data";
import { AutoBackup } from "./auto-backup";
import { MemoryBackupTarget } from "./adapters/memory";

const data = (pantry: string[]) => ({ ...emptyAppData(), pantry });

function setup(startIso = "2026-10-12T00:00:00Z", debounceMs = 1000) {
  let t = Date.parse(startIso);
  const target = new MemoryBackupTarget();
  const auto = new AutoBackup(target, { now: () => new Date(t), debounceMs });
  return { target, auto, advance: (ms: number) => (t += ms) };
}

describe("AutoBackup", () => {
  it("空のデータはバックアップしない", async () => {
    const { auto, target } = setup();
    expect((await auto.runNow(emptyAppData())).status).toBe("skipped-empty");
    expect(target.files.size).toBe(0);
  });

  it("内容が同じなら新しく書かない", async () => {
    const { auto, target, advance } = setup();
    await auto.runNow(data(["egg"]));
    advance(60 * 60 * 1000);
    await auto.flush();
    auto.schedule(() => data(["egg"]));
    expect((await auto.flush())?.status).toBe("unchanged");
    expect(target.files.size).toBe(1);
  });

  it("短い間隔の変更は同じファイルを上書きし、時間が空くと新しい世代を作る", async () => {
    const { auto, target, advance } = setup();
    await auto.runNow(data(["egg"]));
    advance(60 * 1000);
    auto.schedule(() => data(["egg", "rice"]));
    await auto.flush();
    expect(target.files.size).toBe(1);
    advance(30 * 60 * 1000);
    auto.schedule(() => data(["egg", "rice", "milk"]));
    await auto.flush();
    expect(target.files.size).toBe(2);
  });

  it("変更後しばらくしてから自動で書き出す（debounce）", async () => {
    const { auto, target } = setup(undefined, 20);
    auto.schedule(() => data(["egg"]));
    auto.schedule(() => data(["egg", "rice"]));
    expect(target.files.size).toBe(0);
    // ハッシュ計算は非同期なので、書き出しが済むまで待つ
    await vi.waitFor(() => expect(target.files.size).toBe(1));
    expect([...target.files.values()][0]).toContain('"rice"');
  });

  it("書き込みに失敗しても例外にならず error を返す", async () => {
    const { auto, target } = setup();
    target.write = async () => {
      throw new Error("disk full");
    };
    const r = await auto.runNow(data(["egg"]));
    expect(r).toEqual({ status: "error", message: "disk full" });
  });
});
