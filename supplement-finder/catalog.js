// Shared by the finder page and the landing page's search suggestions:
// loads compounds.json, translates it to the page language and builds the search index.
import MiniSearch from './vendor/minisearch.js';

const { t, value: tv } = window.i18n; // i18n.js is loaded in the page <head>
const DATA_URL = new URL('compounds.json', import.meta.url);
// search_en keeps the English name and aliases searchable when the page is shown in another language.
const SEARCH_FIELDS = ['name', 'aliases', 'active', 'type', 'form', 'goals', 'search_en'];

export const LOCALE = { en: 'en-US', cs: 'cs-CZ' }[window.i18n.lang] ?? 'en-US';
export const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

// Translate the displayed values of a compound. Facets, chips and search then all work in the page language.
function localize(c) {
  const dose = c.dose && {
    ...c.dose,
    basis: tv(c.dose.basis),
    text: `${c.dose.min === c.dose.max ? c.dose.min : `${c.dose.min}–${c.dose.max}`} ${c.dose.unit} ${tv(c.dose.basis)} ${t('card.per_day')}`,
  };
  const upper = c.upper_limit && {
    ...c.upper_limit,
    text: `${c.upper_limit.value} ${c.upper_limit.unit} ${tv(c.upper_limit.basis)} (${c.upper_limit.source})`,
  };
  return {
    ...c,
    image: `structures/${c.id}.svg`, // by convention; the card falls back to the placeholder if the file is missing
    name: c.name[window.i18n.lang] ?? c.name.en,
    type: tv(c.type),
    form: tv(c.form),
    goals: asArray(c.goals).map(tv),
    dose,
    upper_limit: upper,
    search_en: [c.name.en, ...asArray(c.aliases)].join(' '),
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
    .search(q, { prefix: true, fuzzy: strict && q.length < 4 ? false : 0.2, combineWith: 'AND', boost: { name: 3, aliases: 2, active: 1.5 } })
    .map((r) => r.id);
}
