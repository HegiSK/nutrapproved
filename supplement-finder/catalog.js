// Shared by the finder page and the landing page's search suggestions:
// loads products.json, translates it to the page language and builds the search index.
import MiniSearch from './vendor/minisearch.js';

const { t, value: tv } = window.i18n; // i18n.js is loaded in the page <head>
const DATA_URL = new URL('products.json', import.meta.url);
// search_en keeps the English name and ingredients searchable when the page is shown in another language.
const SEARCH_FIELDS = ['name', 'ingredients', 'brand', 'category', 'form', 'goals', 'description', 'search_en'];

export const LOCALE = { en: 'en-US', cs: 'cs-CZ' }[window.i18n.lang] ?? 'en-US';
export const money = (n, digits = 2) =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
export const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

// Translate the displayed values of a product. Facets, chips and search then all work in the page language.
function localize(p) {
  return {
    ...p,
    name: t(`product.${p.id}`) === `product.${p.id}` ? p.name : t(`product.${p.id}`),
    form: tv(p.form),
    category: tv(p.category),
    goals: asArray(p.goals).map(tv),
    ingredients: asArray(p.ingredients).map(tv),
    search_en: [p.name, ...asArray(p.ingredients)].join(' '),
  };
}

export async function loadCatalog() {
  await window.i18n.ready; // strings must be loaded before data is localized
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const products = (await res.json()).map(localize);
  const index = new MiniSearch({
    fields: SEARCH_FIELDS,
    idField: 'id',
    extractField: (doc, field) => asArray(doc[field]).join(' '),
  });
  index.addAll(products);
  return { products, index, url: DATA_URL };
}

// Ids matching the text query, best match first.
// strict: no typo tolerance for very short input, so live suggestions stay relevant.
export function searchIds(index, q, { strict = false } = {}) {
  return index
    .search(q, { prefix: true, fuzzy: strict && q.length < 4 ? false : 0.2, combineWith: 'AND', boost: { name: 3, ingredients: 2, brand: 1.5 } })
    .map((r) => r.id);
}
