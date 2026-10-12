import { describe, expect, it } from "vitest";
import { emptyAppData } from "./app-data";
import {
  backupFileName,
  backupTimeOf,
  createBackup,
  parseBackup,
  selectBackupsToPrune,
  serializeBackup,
} from "./backup";

const sample = () => ({
  ...emptyAppData(),
  pantry: ["egg", "rice"],
  history: [{ id: "h1", recipeId: "r01", at: "2026-10-01T00:00:00.000Z" }],
});

describe("backup format", () => {
  it("書き出したものを読み込める", async () => {
    const env = await createBackup(sample(), new Date("2026-10-12T03:15:00Z"));
    const parsed = await parseBackup(serializeBackup(env));
    expect(parsed.ok && parsed.value.data).toEqual(sample());
  });

  it("内容が書き換わっていたらチェックサムで弾く", async () => {
    const text = serializeBackup(await createBackup(sample()));
    const parsed = await parseBackup(text.replace('"egg"', '"milk"'));
    expect(parsed.ok).toBe(false);
  });

  it("別のアプリのファイルや壊れた JSON を弾く", async () => {
    expect((await parseBackup("{")).ok).toBe(false);
    expect((await parseBackup(JSON.stringify({ app: "other", type: "backup" }))).ok).toBe(false);
  });

  it("新しい formatVersion は読み込まない", async () => {
    const env = { ...(await createBackup(sample())), formatVersion: 99 };
    expect((await parseBackup(JSON.stringify(env))).ok).toBe(false);
  });
});

describe("backup file names", () => {
  it("ファイル名と時刻が相互に変換できる", () => {
    const at = new Date("2026-10-12T03:15:00Z");
    const name = backupFileName(at);
    expect(name).toBe("kondate-tabi-20261012T031500Z.json");
    expect(backupTimeOf(name)).toBe(at.getTime());
    expect(backupTimeOf("memo.json")).toBeNull();
  });
});

describe("selectBackupsToPrune", () => {
  const name = (iso: string) => backupFileName(new Date(iso));
  it("直近の世代と、日ごとの最新を残し、それ以外を削除候補にする", () => {
    const now = Date.parse("2026-10-12T12:00:00Z");
    const keepRecent = ["2026-10-12T11:00:00Z", "2026-10-12T10:00:00Z", "2026-10-12T09:00:00Z"].map(
      name,
    );
    const dailyOld = name("2026-10-08T20:00:00Z");
    const sameDayOlder = name("2026-10-08T08:00:00Z");
    const tooOld = name("2026-09-01T08:00:00Z");
    const result = selectBackupsToPrune(
      [...keepRecent, dailyOld, sameDayOlder, tooOld, "my-notes.json"],
      now,
      { recent: 3, daily: 7 },
    );
    expect(result.sort()).toEqual([sameDayOlder, tooOld].sort());
  });
});
