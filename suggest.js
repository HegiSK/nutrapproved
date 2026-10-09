// Landing page: live product suggestions that drop down from the search box.
import { loadCatalog, searchIds, money } from './supplement-finder/catalog.js';

const form = document.getElementById('search');
const input = form?.querySelector('input[name="q"]');
if (form && input) init();

function init() {
  const { t, plural } = window.i18n;
  const MAX = 6;
  const list = document.createElement('ul');
  list.id = 'suggest-list';
  list.className = 'suggest';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  form.appendChild(list);

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', list.id);
  input.setAttribute('aria-expanded', 'false');
  input.autocomplete = 'off';

  let catalog = null;
  let loading = null;
  let rows = [];     // current <a> options
  let active = -1;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const finderUrl = (q) => `supplement-finder/index.html?q=${encodeURIComponent(q)}`;
  const load = () => (loading ??= loadCatalog().then((c) => (catalog = c)).catch((e) => { console.error(e); loading = null; }));

  function setActive(i) {
    rows[active]?.classList.remove('on');
    active = i;
    const row = rows[i];
    if (row) {
      row.classList.add('on');
      row.scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', row.id);
    } else input.removeAttribute('aria-activedescendant');
  }
  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    setActive(-1);
  }
  function open() {
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function render() {
    const q = input.value.trim();
    if (!q || !catalog) return close();
    const byId = new Map(catalog.products.map((p) => [p.id, p]));
    const hits = searchIds(catalog.index, q, { strict: true }).map((id) => byId.get(id)).filter(Boolean);
    const img = (p) => new URL(p.image_url || 'images/placeholder.svg', catalog.url).href;
    let html = hits.slice(0, MAX).map((p, i) => `
      <li role="presentation"><a id="sg-${i}" role="option" href="${finderUrl(p.name)}">
        <img src="${esc(img(p))}" alt="" width="40" height="40">
        <span class="txt"><b>${esc(p.name)}</b><small>${esc(p.brand)} · ${esc(p.category)}</small></span>
        <span class="pr">${money(p.price)}</span>
      </a></li>`).join('');
    if (!hits.length) html = `<li class="none">${esc(t('suggest.none'))}</li>`;
    else html += `<li role="presentation"><a id="sg-all" role="option" class="all" href="${finderUrl(q)}">${esc(plural('suggest.all', hits.length))}</a></li>`;
    list.innerHTML = html;
    rows = [...list.querySelectorAll('a')];
    setActive(-1);
    open();
  }

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => { await load(); render(); }, 80);
  });
  input.addEventListener('focus', () => { load().then(() => { if (input.value.trim()) render(); }); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return close();
    if (list.hidden || !rows.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((active + 1) % rows.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((active - 1 + rows.length) % rows.length); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); location.href = rows[active].href; }
  });
  document.addEventListener('pointerdown', (e) => { if (!form.contains(e.target)) close(); });
  list.addEventListener('mousemove', (e) => {
    const i = rows.indexOf(e.target.closest('a'));
    if (i >= 0 && i !== active) setActive(i);
  });
}
