// One template for all supplement reviews: review.html?id=<id> loads <id>.json from this folder
// (shared data plus one block per language) and renders it. Add a review = add a JSON file.
const { t, lang, ready } = window.i18n;
const root = document.getElementById('review');
const num = (n, d = 1) => n.toLocaleString({ en: 'en-US', cs: 'cs-CZ' }[lang] ?? 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const mass = (n) => `${num(n, 2)} g/mol`;
const SCORE_KEYS = ['evidence', 'pricing', 'benefits', 'safety', 'bioavailability'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Text from the JSON is escaped first; only **bold** and *italic* are turned into markup.
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
const list = (items) => `<ul>${(items ?? []).map((x) => `<li>${md(x)}</li>`).join('')}</ul>`;
const section = (cls, title, body) => `<section class="panel ${cls}"><h2>${esc(title)}</h2>${body}</section>`;

function notFound() {
  document.title = `${t('review.nf.title')} | ${t('hero.title')}`;
  root.innerHTML = `<div class="panel notfound"><h2>${esc(t('review.nf.title'))}</h2><p>${esc(t('review.nf.text'))}</p>
    <a class="btn" href="../index.html">${esc(t('review.nf.link'))}</a></div>`;
}

function render(r) {
  const c = r[lang] ?? r.en;           // fall back to English if a language block is missing
  const k = r.compound;                 // index fields (name, dose, timing...) are shared by all languages
  const name = k.name[lang] ?? k.name.en;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const { value: tv } = window.i18n;
  // Dose and timing come from the compound block, so they are written once and cannot drift from the finder.
  const doseText = k.dose ? `${k.dose.min === k.dose.max ? k.dose.min : `${k.dose.min}–${k.dose.max}`} ${k.dose.unit} ${tv(k.dose.basis)} ${t('card.per_day')}` : null;
  const upperText = k.upper_limit ? `${k.upper_limit.value} ${k.upper_limit.unit} ${tv(k.upper_limit.basis)} ${t('card.per_day')} (${k.upper_limit.source})` : null;
  const doseRows = [
    ...(doseText ? [[t('review.fact.dose'), doseText]] : []),
    ...(k.timing ? [[t('review.fact.timing'), cap(tv(k.timing))]] : []),
    ...(upperText ? [[t('review.fact.upper'), upperText]] : []),
    ...(c.dosing ?? []),
  ];
  // Reviews with a `forms` list get the boxed layout; older ones keep the plain fact list.
  const forms = r.forms ?? [];
  const label = (f) => c.form_labels?.[f.key] ?? f.key;
  const pct = (f) => `≈ ${num(f.active_percent)} %`;
  const table = (cls, head, rows) => `<table class="${cls}">${head ? `<thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>` : ''}<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  let specs;
  if (forms.length) {
    const [main, ...others] = forms;
    specs = `<div class="specbox"><h3>${esc(name)} <span>(${esc(label(main))})</span></h3>` +
      table('spec', null, [
        [t('review.spec.formula'), main.formula],
        [t('review.spec.mass'), mass(main.molar_mass)],
        [cap(tv(k.dose?.basis ?? 'elemental')), pct(main)],
        ...(main.cas ? [[t('review.spec.cas'), main.cas]] : []),
      ]) + `</div>` +
      (others.length ? `<h3 class="sub-h">${esc(t('review.forms.other'))}</h3>` +
        table('forms-tbl', [t('review.spec.form'), t('review.spec.formula'), t('review.spec.mass'), cap(tv(k.dose?.basis ?? 'elemental'))],
          others.map((f) => [label(f), f.formula, mass(f.molar_mass), pct(f)])) : '') +
      (c.forms_note ? `<p class="note">${md(c.forms_note)}</p>` : '');
  } else {
    const facts = [...(c.facts ?? []), ...doseRows];
    specs = facts.length ? `<dl>${facts.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>` : '';
  }
  const dosing = forms.length && doseRows.length
    ? `<h3 class="sub-h">${esc(t('review.dosing'))}</h3>${table('dosing', null, doseRows)}` : '';
  const scores = SCORE_KEYS.filter((k) => r.scores?.[k] != null);
  const total = r.scores?.total ?? (scores.length ? scores.reduce((a, k) => a + r.scores[k], 0) / scores.length : null);

  document.title = `${name} – ${t('review.suffix')} | ${t('hero.title')}`;
  const left = section('', t('review.about'),
    (c.about ?? []).map((p) => `<p>${md(p)}</p>`).join('') +
    `<div class="structure"><img src="../structures/${esc(r.id)}.svg" alt="${esc(c.structure_alt ?? name)}" onerror="this.parentNode.remove()"></div>` +
    specs + dosing);

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

  const refs = r.references?.length ? section('full', t('review.refs'), `<ol>${r.references.map((x) => `<li>${md(x)}</li>`).join('')}</ol>`) : '';

  root.innerHTML = `<p class="crumb"><a href="../index.html">${esc(t('review.back'))}</a></p>
    <h1>${esc(name)}</h1><p class="sub">${esc(c.subtitle ?? '')}</p>
    <div class="r-grid">${left}${right}${score}${refs}</div>`;
}

async function start() {
  await ready;
  const id = new URLSearchParams(location.search).get('id') ?? '';
  if (!/^[a-z0-9-]+$/.test(id)) return notFound();   // also keeps ids from escaping this folder
  try {
    const res = await fetch(`${id}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    render(await res.json());
  } catch (err) {
    console.error(err);
    notFound();
  }
}
start();
