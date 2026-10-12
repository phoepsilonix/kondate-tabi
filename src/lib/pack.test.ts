import { describe, expect, it } from "vitest";
import { emptyAppData, mergeAppData } from "./app-data";
import base from "./data/base.json";
import tohoku from "./data/packs/tohoku.json";
import { knownIdsOf, validatePack } from "./pack";
import type { Pack } from "./types";

const known = knownIdsOf([base as Pack]);

describe("validatePack", () => {
  it("同梱の東北パックは検証を通る", () => {
    expect(validatePack(tohoku, known).ok).toBe(true);
  });

  it("id の接頭辞がないレシピ・存在しない参照を弾く", () => {
    const bad = {
      id: "test",
      name: "テスト",
      version: "1",
      recipes: [
        {
          id: "no-prefix",
          name: "A",
          ingredients: [{ id: "egg", amount: "1" }],
          steps: [],
          minutes: 5,
          tags: [],
        },
        {
          id: "test.b",
          name: "B",
          ingredients: [{ id: "unknown", amount: "1" }],
          steps: [],
          minutes: 5,
          tags: ["x.y"],
        },
      ],
    };
    const r = validatePack(bad, known);
    expect(r.ok).toBe(false);
    const msg = !r.ok ? r.errors.join("\n") : "";
    expect(msg).toContain("test.");
    expect(msg).toContain("unknown");
    expect(msg).toContain("x.y");
  });

  it("予約された id や、不正なパック id を弾く", () => {
    expect(validatePack({ id: "base", name: "a", version: "1" }, known).ok).toBe(false);
    expect(validatePack({ id: "日本語", name: "a", version: "1" }, known).ok).toBe(false);
    expect(validatePack("text", known).ok).toBe(false);
  });
});

describe("mergeAppData", () => {
  it("パントリーは和集合、履歴は id で重複除去して新しい順に並べる", () => {
    const a = {
      ...emptyAppData(),
      pantry: ["egg"],
      history: [{ id: "1", recipeId: "r01", at: "2026-10-01T00:00:00Z" }],
    };
    const b = {
      ...emptyAppData(),
      pantry: ["egg", "rice"],
      history: [
        { id: "1", recipeId: "r01", at: "2026-10-01T00:00:00Z" },
        { id: "2", recipeId: "r02", at: "2026-10-05T00:00:00Z" },
      ],
    };
    const m = mergeAppData(a, b);
    expect(m.pantry).toEqual(["egg", "rice"]);
    expect(m.history.map((h) => h.id)).toEqual(["2", "1"]);
  });
});
