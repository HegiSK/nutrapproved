// One template for all supplement reviews: review.html?id=<id> loads reviews/<id>.json
// (shared data plus one block per language) and renders it. Add a review = add a JSON file.
const { t, lang, ready } = window.i18n;
const root = document.getElementById('review');
const num = (n) => n.toLocaleString({ en: 'en-US', cs: 'cs-CZ' }[lang] ?? 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const SCORE_KEYS = ['evidence', 'pricing', 'benefits', 'safety'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Text from the JSON is escaped first; only **bold** and *italic* are turned into markup.
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
const list = (items) => `<ul>${(items ?? []).map((x) => `<li>${md(x)}</li>`).join('')}</ul>`;
const section = (cls, title, body) => `<section class="panel ${cls}"><h2>${esc(title)}</h2>${body}</section>`;

function notFound() {
  document.title = `${t('review.nf.title')} | ${t('hero.title')}`;
  root.innerHTML = `<div class="panel notfound"><h2>${esc(t('review.nf.title'))}</h2><p>${esc(t('review.nf.text'))}</p>
    <a class="btn" href="supplement-finder/index.html">${esc(t('review.nf.link'))}</a></div>`;
}

function render(r) {
  const c = r[lang] ?? r.en;           // fall back to English if a language block is missing
  const scores = SCORE_KEYS.filter((k) => r.scores?.[k] != null);
  const total = r.scores?.total ?? (scores.length ? scores.reduce((a, k) => a + r.scores[k], 0) / scores.length : null);
  const dir = new URL(`reviews/${r.id}.json`, location.href);

  document.title = `${c.name} – ${t('review.suffix')} | ${t('hero.title')}`;
  const left = section('', t('review.about'),
    (c.about ?? []).map((p) => `<p>${md(p)}</p>`).join('') +
    (r.structure ? `<div class="structure"><img src="${esc(new URL(r.structure, dir).href)}" alt="${esc(c.structure_alt ?? c.name)}"></div>` : '') +
    (c.facts?.length ? `<dl>${c.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''));

  const f = c.foods;
  const foods = f ? section('', f.title,
    (f.warning ? `<p class="warn">${md(f.warning)}</p>` : '') +
    `<table class="foods"><thead><tr>${f.columns.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>` +
    f.rows.map(([name, serving, form, amount]) => `<tr><td>${esc(name)}<small>${esc(serving)}</small></td><td>${esc(form)}</td><td>${esc(amount)}</td></tr>`).join('') +
    `</tbody></table>` + (f.note ? `<p class="note">${md(f.note)}</p>` : '')) : '';

  const right = `<div class="stack">
    ${c.positives?.length ? section('pos', t('review.pos'), list(c.positives)) : ''}
    ${c.negatives?.length ? section('neg', t('review.neg'), list(c.negatives)) : ''}
    ${foods}</div>`;

  const score = scores.length ? section('full', t('review.score'),
    `<div class="score-wrap"><div>${scores.map((k) =>
      `<div class="bar-row"><span>${esc(t(`review.score.${k}`))}</span><div class="track"><div class="fill" style="width:${r.scores[k] * 10}%"></div></div><b>${num(r.scores[k])}</b></div>`).join('')}</div>
      <div class="total"><div class="lbl">${esc(t('review.total'))}</div><div class="num">${num(total)}</div><div class="of">${esc(t('review.outof'))}</div></div></div>` +
    (c.scores_note ? `<p class="note">${md(c.scores_note)}</p>` : '')) : '';

  const rec = c.recommendations;
  const recs = rec?.items?.length ? section('full', t('review.recs'),
    `<div class="products">${rec.items.map((p) => `<div class="product"><span class="tag">${esc(p.tag)}</span><h3>${esc(p.name)}</h3><p>${esc(p.text)}</p><span class="price">${esc(p.price)}</span></div>`).join('')}</div>` +
    (rec.note ? `<p class="note">${md(rec.note)}</p>` : '')) : '';

  const refs = r.references?.length ? section('full', t('review.refs'), `<ol>${r.references.map((x) => `<li>${md(x)}</li>`).join('')}</ol>`) : '';

  root.innerHTML = `<p class="crumb"><a href="supplement-finder/index.html">${esc(t('review.back'))}</a></p>
    <h1>${esc(c.name)}</h1><p class="sub">${esc(c.subtitle ?? '')}</p>
    <div class="r-grid">${left}${right}${score}${recs}${refs}</div>`;
}

async function start() {
  await ready;
  const id = new URLSearchParams(location.search).get('id') ?? '';
  if (!/^[a-z0-9-]+$/.test(id)) return notFound();   // also keeps ids from escaping the reviews/ folder
  try {
    const res = await fetch(`reviews/${id}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    render(await res.json());
  } catch (err) {
    console.error(err);
    notFound();
  }
}
start();
