import { describe, expect, it } from "vitest";
import { MemoryBackupTarget, MemoryDataStore } from "./adapters/memory";
import { emptyAppData } from "./app-data";
import { backupFileName, createBackup, serializeBackup } from "./backup";
import { loadAppData } from "./persistence";

const sample = { ...emptyAppData(), pantry: ["egg"] };

async function addBackup(target: MemoryBackupTarget, iso: string, data = sample) {
  const at = new Date(iso);
  target.files.set(backupFileName(at), serializeBackup(await createBackup(data, at)));
}

describe("loadAppData", () => {
  it("正常なデータはそのまま使い、バックアップを探さない", async () => {
    const r = await loadAppData(
      new MemoryDataStore(JSON.stringify(sample)),
      new MemoryBackupTarget(),
    );
    expect(r.status).toBe("ok");
    expect(r.data.pantry).toEqual(["egg"]);
    expect(r.restoreCandidate).toBeNull();
  });

  it("データがなく、バックアップがあれば復元候補として返す（再インストール後など）", async () => {
    const target = new MemoryBackupTarget();
    await addBackup(target, "2026-10-01T00:00:00Z");
    const r = await loadAppData(new MemoryDataStore(null), target);
    expect(r.status).toBe("empty");
    expect(r.data.pantry).toEqual([]);
    expect(r.restoreCandidate?.envelope.data.pantry).toEqual(["egg"]);
  });

  it("データが壊れていても起動でき、元のデータを退避して復元候補を返す", async () => {
    const store = new MemoryDataStore("{broken");
    const target = new MemoryBackupTarget();
    await addBackup(target, "2026-10-01T00:00:00Z");
    const r = await loadAppData(store, target);
    expect(r.status).toBe("corrupt");
    expect(store.aside).toEqual(["{broken"]);
    expect(r.restoreCandidate).not.toBeNull();
  });

  it("最新のバックアップが壊れていたら、次に新しい正常なものを使う", async () => {
    const target = new MemoryBackupTarget();
    await addBackup(target, "2026-10-01T00:00:00Z", { ...sample, pantry: ["rice"] });
    target.files.set(backupFileName(new Date("2026-10-02T00:00:00Z")), "{broken");
    const r = await loadAppData(new MemoryDataStore(null), target);
    expect(r.restoreCandidate?.envelope.data.pantry).toEqual(["rice"]);
  });

  it("保存先が読めなくても例外にならない", async () => {
    const store = new MemoryDataStore();
    store.load = async () => {
      throw new Error("denied");
    };
    const r = await loadAppData(store, new MemoryBackupTarget());
    expect(r.status).toBe("corrupt");
    expect(r.restoreCandidate).toBeNull();
  });
});
