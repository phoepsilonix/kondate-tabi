use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::time::{SystemTime, UNIX_EPOCH};

// フロントと同じモックデータを共有（後で SQLite に置き換えやすいよう Repository 経由で参照）
const MOCK_JSON: &str = include_str!("../../src/lib/data/base.json");

const SEASONING: &str = "調味料";

#[derive(Debug, Clone, Deserialize)]
struct Ingredient {
    id: String,
    category: String,
    #[allow(dead_code)]
    name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RecipeIngredient {
    id: String,
    amount: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Recipe {
    id: String,
    name: String,
    ingredients: Vec<RecipeIngredient>,
    steps: Vec<String>,
    minutes: u32,
    tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct Dataset {
    ingredients: Vec<Ingredient>,
    recipes: Vec<Recipe>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MatchResult {
    recipe: Recipe,
    missing: Vec<String>,
    is_perfect: bool,
}

/// データ取得の抽象化。SQLite 版を作る場合はこの trait を実装する。
trait Repository {
    fn load(&self) -> Result<Dataset, String>;
}

struct MockRepository;

impl Repository for MockRepository {
    fn load(&self) -> Result<Dataset, String> {
        serde_json::from_str(MOCK_JSON).map_err(|e| format!("モックデータの読み込みに失敗: {e}"))
    }
}

/// 簡易な乱数（同順位の並びに少しばらつきを与える用途のみ。暗号用途ではない）
fn jitter(seed: u64) -> u64 {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as u64)
        .unwrap_or(0);
    let mut x = nanos ^ seed.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

fn match_recipes(
    data: &Dataset,
    selected: &[String],
    max_missing: usize,
    include_seasonings: bool,
) -> Vec<MatchResult> {
    let selected: HashSet<&str> = selected.iter().map(String::as_str).collect();
    let seasonings: HashSet<&str> = data
        .ingredients
        .iter()
        .filter(|i| i.category == SEASONING)
        .map(|i| i.id.as_str())
        .collect();

    let mut scored: Vec<(usize, u64, MatchResult)> = Vec::new();
    for (idx, recipe) in data.recipes.iter().enumerate() {
        let required: Vec<&str> = recipe
            .ingredients
            .iter()
            .map(|i| i.id.as_str())
            .filter(|id| include_seasonings || !seasonings.contains(id))
            .collect();
        if required.is_empty() {
            continue;
        }
        let missing: Vec<String> = required
            .iter()
            .filter(|id| !selected.contains(**id))
            .map(|id| id.to_string())
            .collect();
        if missing.len() == required.len() || missing.len() > max_missing {
            continue;
        }
        scored.push((
            missing.len(),
            jitter(idx as u64),
            MatchResult {
                recipe: recipe.clone(),
                is_perfect: missing.is_empty(),
                missing,
            },
        ));
    }
    scored.sort_by_key(|(m, j, _)| (*m, *j));
    scored.into_iter().map(|(_, _, r)| r).collect()
}

#[tauri::command]
fn find_matching_recipes(
    selected_ids: Vec<String>,
    max_missing: Option<usize>,
    include_seasonings: Option<bool>,
) -> Result<Vec<MatchResult>, String> {
    if selected_ids.is_empty() {
        return Err("具材が選択されていません".into());
    }
    let data = MockRepository.load()?;
    Ok(match_recipes(
        &data,
        &selected_ids,
        max_missing.unwrap_or(2),
        include_seasonings.unwrap_or(false),
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![find_matching_recipes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn perfect_match_comes_first() {
        let data = MockRepository.load().unwrap();
        let sel: Vec<String> = ["egg", "dashi"].iter().map(|s| s.to_string()).collect();
        let res = match_recipes(&data, &sel, 2, false);
        assert!(!res.is_empty());
        assert!(res[0].is_perfect);
    }
}
