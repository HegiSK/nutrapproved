// Landing-page score card: shows a random reviewed compound, never the same one twice in a row.
const { lang, ready, t, value } = window.i18n;
const KEYS = ['evidence', 'pricing', 'benefits', 'safety', 'bioavailability'];
const SHOWN = ['evidence', 'pricing', 'benefits']; // bars on the card
const card = document.getElementById('featured');
const band = (n) => (n <= 3 ? 'lo' : n <= 7 ? 'mid' : 'hi');
const fmt = (n) => n.toLocaleString({ en: 'en-US', cs: 'cs-CZ' }[lang] ?? 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const store = { get: () => { try { return localStorage.getItem('featured'); } catch { return null; } },
                set: (v) => { try { localStorage.setItem('featured', v); } catch {} } };

async function run() {
  const compounds = await (await fetch('supplement-finder/compounds.json')).json();
  const ids = compounds.filter((c) => c.review).map((c) => c.id);
  const last = store.get();
  const pool = ids.length > 1 ? ids.filter((id) => id !== last) : ids;
  const id = pool[Math.floor(Math.random() * pool.length)];
  const r = await (await fetch(`supplement-finder/reviews/${id}.json`)).json();
  const c = r.compound;
  const all = KEYS.filter((k) => r.scores?.[k] != null);
  const total = r.scores.total ?? all.reduce((a, k) => a + r.scores[k], 0) / all.length; // same overall as the review page
  const scores = SHOWN.filter((k) => r.scores?.[k] != null);
  store.set(id);
  await ready;
  card.href = `supplement-finder/reviews/review.html?id=${encodeURIComponent(id)}`;
  card.innerHTML = `
    <div class="mock-top">
      <div><b>${esc(c.name[lang] ?? c.name.en)}</b><small>${esc([c.type, c.form].filter(Boolean).map(value).join(' · '))}</small></div>
      <div class="mock-score"><strong class="${band(total)}">${fmt(total)}</strong><small>${esc(t('mock.score'))}</small></div>
    </div>
    <span class="mock-cta" aria-hidden="true">${esc(t('mock.cta'))}</span>
    <div class="mock-rows">${scores.map((k) => `
      <div class="mock-row ${band(r.scores[k])}"><span>${esc(t(`review.score.${k}`))}</span><i style="--v:${r.scores[k] * 10}%"></i><span>${fmt(r.scores[k])}</span></div>`).join('')}
    </div>`;
  card.removeAttribute('aria-busy');
}
run().catch((e) => { console.error('featured card:', e); card.hidden = true; });
