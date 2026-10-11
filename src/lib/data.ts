import raw from './data/mock.json';
import type { Dataset } from './types';

const data = raw as Dataset;

export const ingredients = data.ingredients;
export const recipes = data.recipes;
export const ingredientName = new Map(ingredients.map((i) => [i.id, i.name]));
