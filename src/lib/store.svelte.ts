import { localStore } from "./storage";
import type { HistoryEntry } from "./types";

class PantryStore {
  /** パントリーに登録した具材 id */
  ids = $state<string[]>(localStore.get<string[]>("pantry", []));

  toggle(id: string) {
    this.ids = this.ids.includes(id) ? this.ids.filter((x) => x !== id) : [...this.ids, id];
    this.save();
  }

  clear() {
    this.ids = [];
    this.save();
  }

  private save() {
    localStore.set("pantry", $state.snapshot(this.ids));
  }
}

class HistoryStore {
  /** 新しい順 */
  entries = $state<HistoryEntry[]>(localStore.get<HistoryEntry[]>("history", []));

  add(recipeId: string, at: Date = new Date()) {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    this.entries = [{ id, recipeId, at: at.toISOString() }, ...this.entries];
    this.save();
  }

  remove(id: string) {
    this.entries = this.entries.filter((e) => e.id !== id);
    this.save();
  }

  private save() {
    localStore.set("history", $state.snapshot(this.entries));
  }
}

export const pantry = new PantryStore();
export const history = new HistoryStore();
