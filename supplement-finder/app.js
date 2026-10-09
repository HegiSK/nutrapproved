// Supplement Finder: search and filtering run entirely in the browser.
// products.json is downloaded once (catalog.js); MiniSearch (vendor/) provides typo-tolerant search.
import { loadCatalog, searchIds, money, asArray } from './catalog.js';

// ---- Settings -------------------------------------------------------------
const FACETS = ['form', 'category', 'goals', 'brand', 'ingredients'].map((field) => ({ field, labelKey: `facet.${field}` }));
const FLAGS = ['vegan', 'gluten_free', 'in_stock'];
const PER_PAGE = 12;

// ---- State ----------------------------------------------------------------
const state = {
  q: '',
  sel: Object.fromEntries(FACETS.map((f) => [f.field, new Set()])),
  flags: Object.fromEntries(FLAGS.map((f) => [f, false])),
  minPrice: '',
  maxPrice: '',
  sort: 'relevance',
  page: 1,
};
let products = [];
let index = null;

// ---- DOM ------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const els = {
  q: $('q'), grid: $('grid'), count: $('count'), facets: $('facets'), chips: $('chips'),
  error: $('error'), more: $('load-more'), sort: $('sort'),
  min: $('min-price'), max: $('max-price'), clear: $('clear-all'),
};

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Strings come from i18n/<lang>.json; i18n.js is loaded in the page <head>.
const { t, plural } = window.i18n;

// ---- Search + filter logic -----------------------------------------------
// Returns the ids matching the text query (in relevance order), or null if no query.
function textMatches() {
  const q = state.q.trim();
  if (!q) return null;
  return searchIds(index, q);
}

// Does product p pass the filters? `exclude` skips one facet so its other options stay visible.
function passes(p, exclude = null) {
  for (const { field } of FACETS) {
    if (field === exclude) continue;
    const sel = state.sel[field];
    if (sel.size && !asArray(p[field]).some((v) => sel.has(v))) return false;
  }
  for (const f of FLAGS) if (state.flags[f] && !p[f]) return false;
  if (state.minPrice !== '' && p.price < Number(state.minPrice)) return false;
  if (state.maxPrice !== '' && p.price > Number(state.maxPrice)) return false;
  return true;
}

function compute() {
  const ids = textMatches(); // null = everything
  const byId = new Map(products.map((p) => [p.id, p]));
  const pool = ids ? ids.map((id) => byId.get(id)).filter(Boolean) : products;

  // Results: all filters applied.
  let results = pool.filter((p) => passes(p));
  const cmpName = (a, b) => a.name.localeCompare(b.name);
  if (state.sort === 'price_asc') results = [...results].sort((a, b) => a.price - b.price || cmpName(a, b));
  else if (state.sort === 'price_desc') results = [...results].sort((a, b) => b.price - a.price || cmpName(a, b));
  else if (state.sort === 'name_asc' || (state.sort === 'relevance' && !ids)) results = [...results].sort(cmpName);
  // relevance with a query keeps MiniSearch's order

  // Facet counts: each facet is counted over products passing all OTHER filters.
  const facetData = {};
  for (const { field } of FACETS) {
    const counts = new Map();
    for (const p of pool) {
      if (!passes(p, field)) continue;
      for (const v of asArray(p[field])) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    facetData[field] = counts;
  }
  return { results, facetData };
}

// ---- Rendering ------------------------------------------------------------
function cardHtml(p) {
  const tags = [
    p.vegan ? `<span class="tag">${esc(t('flag.vegan'))}</span>` : '',
    p.gluten_free ? `<span class="tag">${esc(t('flag.gluten_free'))}</span>` : '',
    p.in_stock ? '' : `<span class="tag out">${esc(t('tag.out'))}</span>`,
  ].join('');
  const ingr = asArray(p.ingredients).join(', ');
  return `
    <article class="card">
      <img src="${esc(p.image_url || 'images/placeholder.svg')}" alt="${esc(p.name)}" loading="lazy">
      <div class="body">
        <h3>${esc(p.name)}</h3>
        <p class="brand">${esc(p.brand)}</p>
        <p class="meta">${esc(p.form)} · ${esc(p.category)}</p>
        ${ingr ? `<p class="ingr">${esc(ingr)}</p>` : ''}
        <div class="tags">${tags}</div>
        <div class="foot"><span class="price">${money(p.price)}</span>${p.review ? `<a class="review-link" href="../review.html?id=${encodeURIComponent(p.review)}">${esc(t('card.review'))}</a>` : ''}</div>
      </div>
    </article>`;
}

function renderFacets(facetData) {
  els.facets.innerHTML = FACETS.map(({ field, labelKey }) => {
    const counts = new Map(facetData[field]);
    for (const v of state.sel[field]) if (!counts.has(v)) counts.set(v, 0); // keep ticked values visible
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (!rows.length) return '';
    const items = rows
      .map(
        ([value, n]) => `
        <label class="check ${n === 0 ? 'zero' : ''}">
          <input type="checkbox" data-field="${esc(field)}" data-value="${esc(value)}" ${state.sel[field].has(value) ? 'checked' : ''}>
          <span>${esc(value)}</span><span class="n">${n}</span>
        </label>`
      )
      .join('');
    return `<section class="group"><h3>${esc(t(labelKey))}</h3><div class="list">${items}</div></section>`;
  }).join('');
}

function renderChips() {
  const chips = [];
  for (const { field } of FACETS)
    for (const v of state.sel[field])
      chips.push(`<button class="chip" data-chip-field="${esc(field)}" data-chip-value="${esc(v)}">${esc(v)} ×</button>`);
  for (const f of FLAGS) if (state.flags[f]) chips.push(`<button class="chip" data-chip-flag="${f}">${esc(f === 'in_stock' ? t('flag.chip.in_stock') : t(`flag.${f}`))} ×</button>`);
  if (state.minPrice !== '') chips.push(`<button class="chip" data-chip-price="min">${esc(t('chip.min', { price: money(Number(state.minPrice)) }))} ×</button>`);
  if (state.maxPrice !== '') chips.push(`<button class="chip" data-chip-price="max">${esc(t('chip.max', { price: money(Number(state.maxPrice)) }))} ×</button>`);
  els.chips.innerHTML = chips.join('');
}

function showError(msg) {
  els.error.hidden = !msg;
  els.error.textContent = msg ?? '';
}

function render({ append = false } = {}) {
  const { results, facetData } = compute();
  const start = (state.page - 1) * PER_PAGE;
  const html = results.slice(start, start + PER_PAGE).map(cardHtml).join('');
  if (append) els.grid.insertAdjacentHTML('beforeend', html);
  else els.grid.innerHTML = html || `<p class="empty">${esc(t('empty'))}</p>`;
  els.count.textContent = plural('count', results.length);
  els.more.hidden = results.length <= state.page * PER_PAGE;
  renderFacets(facetData);
  renderChips();
}

const reset = () => { state.page = 1; render(); };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

// ---- Events ---------------------------------------------------------------
els.q.addEventListener('input', debounce(() => { state.q = els.q.value; reset(); }, 120));
els.sort.addEventListener('change', () => { state.sort = els.sort.value; reset(); });
els.min.addEventListener('input', debounce(() => { state.minPrice = els.min.value; reset(); }, 300));
els.max.addEventListener('input', debounce(() => { state.maxPrice = els.max.value; reset(); }, 300));
els.more.addEventListener('click', () => { state.page += 1; render({ append: true }); });

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.field) {
    const set = state.sel[t.dataset.field];
    t.checked ? set.add(t.dataset.value) : set.delete(t.dataset.value);
    reset();
  } else if (t.dataset.flag) {
    state.flags[t.dataset.flag] = t.checked;
    reset();
  }
});

els.chips.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.chipField) state.sel[b.dataset.chipField].delete(b.dataset.chipValue);
  if (b.dataset.chipFlag) {
    state.flags[b.dataset.chipFlag] = false;
    document.querySelector(`[data-flag="${b.dataset.chipFlag}"]`).checked = false;
  }
  if (b.dataset.chipPrice === 'min') { state.minPrice = ''; els.min.value = ''; }
  if (b.dataset.chipPrice === 'max') { state.maxPrice = ''; els.max.value = ''; }
  reset();
});

els.clear.addEventListener('click', () => {
  for (const s of Object.values(state.sel)) s.clear();
  for (const f of FLAGS) { state.flags[f] = false; document.querySelector(`[data-flag="${f}"]`).checked = false; }
  state.minPrice = state.maxPrice = '';
  els.min.value = els.max.value = '';
  state.q = ''; els.q.value = '';
  reset();
});

// ---- Start ----------------------------------------------------------------
async function start() {
  try {
    ({ products, index } = await loadCatalog());
  } catch (err) {
    console.error(err);
    showError(t('error.load', { url: 'products.json', msg: err.message }));
    return;
  }

  const prices = products.map((p) => p.price);
  if (prices.length) {
    els.min.placeholder = t('price.min.placeholder', { price: money(Math.floor(Math.min(...prices)), 0) });
    els.max.placeholder = t('price.max.placeholder', { price: money(Math.ceil(Math.max(...prices)), 0) });
  }
  // Deep link from the landing page: ?q=magnesium preloads the search.
  const initialQ = new URLSearchParams(location.search).get('q')?.trim();
  if (initialQ) { state.q = initialQ; els.q.value = initialQ; }
  render();
}
start();
