// OS・環境ごとの違い（ブラウザ／デスクトップ／将来のモバイル）を閉じ込める窓口。
// 共通ロジックはここにある型だけに依存するので、偽物の実装を使ってテストできる。

/** メインのデータの保存先（アプリ内の保存領域） */
export interface DataStore {
  load(): Promise<string | null>;
  save(text: string): Promise<void>;
  /** 読み込めなかったデータを、消さずに脇へ退避する */
  saveAside(text: string): Promise<void>;
}

/** 自動バックアップの保存先（アプリの保存領域の外が望ましい） */
export interface BackupTarget {
  /** 保存先の説明（画面に表示する） */
  describe(): string;
  list(): Promise<string[]>;
  read(name: string): Promise<string>;
  /** 同名があれば置き換える。途中で止まっても元のファイルを壊さないこと */
  write(name: string, text: string): Promise<void>;
  remove(name: string): Promise<void>;
}

/** ユーザーが明示的に行うファイルの書き出し・読み込み */
export interface FileIO {
  exportText(suggestedName: string, text: string): Promise<"saved" | "cancelled">;
  pickText(): Promise<{ name: string; text: string } | null>;
}

export interface Services {
  store: DataStore;
  backupTarget: BackupTarget;
  files: FileIO;
}
