// Main bar: a highlight pill slides to the hovered/focused item and rests on the current page.
(function () {
  const nav = document.querySelector('.nav');
  const inner = nav && nav.querySelector('.inner');
  if (!inner) return;
  const links = [...inner.querySelectorAll('a')];
  const current = inner.querySelector('a.active') || links[0];
  const bar = document.createElement('span');
  bar.className = 'nav-indicator';
  bar.setAttribute('aria-hidden', 'true');
  inner.prepend(bar);
  nav.classList.add('no-js');

  let target = current;
  function place(a, animate = true) {
    target = a;
    links.forEach((l) => l.classList.toggle('hot', l === a));
    if (!animate) bar.classList.remove('ready');
    bar.style.width = `${a.offsetWidth}px`;
    bar.style.transform = `translateX(${a.offsetLeft}px)`;
    if (!animate) { void bar.offsetWidth; }
    bar.classList.add('ready');
    nav.classList.remove('no-js');
  }
  const rest = () => place(current);

  links.forEach((a) => {
    a.addEventListener('pointerenter', () => place(a));
    a.addEventListener('focus', () => place(a));
    a.addEventListener('blur', rest);
  });
  inner.addEventListener('pointerleave', rest);
  // Labels change width after translation / on resize: keep the highlight aligned.
  new ResizeObserver(() => place(target, false)).observe(inner);
  place(current, false);
})();

// Smooth page scrolling for in-page links (Home, About us, Services...). Duration scales with distance;
// also glides to the section when another page links here with #section. Instant for reduced-motion users.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic
  let frame = 0;

  function targetY(hash) {
    if (!hash || hash === '#') return 0;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return null;
    const pad = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return Math.max(0, el.getBoundingClientRect().top + scrollY - pad);
  }
  function glide(y) {
    cancelAnimationFrame(frame);
    const from = scrollY, dist = y - from;
    if (reduce.matches || Math.abs(dist) < 2) { scrollTo({ top: y, behavior: 'instant' }); return; }
    const dur = Math.min(1100, Math.max(450, Math.abs(dist) * 0.45));
    const t0 = performance.now();
    const stop = () => cancelAnimationFrame(frame);
    addEventListener('wheel', stop, { once: true, passive: true });
    addEventListener('touchstart', stop, { once: true, passive: true });
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      scrollTo({ top: from + dist * ease(p), behavior: 'instant' });
      if (p < 1) frame = requestAnimationFrame(step);
    })(t0);
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.pathname !== location.pathname || !u.hash && a.getAttribute('href') !== '#') return;
    const y = targetY(u.hash || '#');
    if (y == null) return;
    e.preventDefault();
    history.pushState(null, '', u.hash || location.pathname + location.search);
    glide(y);
  });

  // Reloading starts at the top: the menu adds #section to the address, which must not glide the page down again.
  const nav0 = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const reloaded = nav0 && nav0.type === 'reload';
  if (reloaded) {
    history.scrollRestoration = 'manual';
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    scrollTo({ top: 0, behavior: 'instant' });
  }

  // Arriving from another page with #section: start at the top, then glide down once the page is ready.
  if (location.hash.length > 1 && !reloaded) {
    history.scrollRestoration = 'manual';
    const go = () => { const y = targetY(location.hash); if (y != null) { scrollTo({ top: 0, behavior: 'instant' }); setTimeout(() => glide(y), 250); } };
    const ready = window.i18n && window.i18n.ready ? window.i18n.ready : Promise.resolve();
    Promise.all([ready, new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r)))]).then(() => requestAnimationFrame(go));
  }
})();

// Scroll reveals (landing page): the header score card and each section fade and rise into place, siblings staggered.
// They replay every time a section comes back into view (menu clicks included): once an element is fully off screen it
// goes back to its hidden state. Skipped for reduced-motion users.
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const STEP = 200, DUR = 1300, HERO_DELAY = 500; // cards come in 200 ms apart; the header score card waits 0.5 s on first load
  const els = [];
  const card = document.querySelector('.home-hero .mock');
  if (card) { card.__rv = 0; card.__hero = true; els.push(card); }
  ['.band .section-title', '.band .section-sub', '.crit', '.people', '#blog .card', '.tile', '.cta', '.deco'].forEach((sel) =>
    document.querySelectorAll(sel).forEach((el, i) => { el.__rv = i; els.push(el); }));
  if (!els.length) return;

  // Titles, subtitles and dividers already in view when the page opens are simply there; the rest start hidden
  const inView = (el) => el.getBoundingClientRect().top < innerHeight * 0.94;
  els.forEach((el) => { if (!(el.matches('.section-title, .section-sub, .deco') && inView(el))) el.classList.add('reveal'); });

  function replayCard() { // restart the score bars and the overall-score pop
    card.classList.add('norun'); void card.offsetWidth; card.classList.remove('norun');
  }
  function show(el) {
    if (!el.classList.contains('reveal') || el.classList.contains('in')) return;
    // Per section: title first, then the subtitle, then the cards (200 ms apart; both service cards together, contact box last).
    // The waits only apply while the section's title is still fading in, so scrolling into a card later has no lag.
    const sec = el.closest('.band'), title = sec && sec.querySelector('.section-title');
    const lead = !!(title && title !== el && title.classList.contains('in'));
    let delay;
    if (el.__hero) delay = el.__seen ? 0 : HERO_DELAY;
    else if (el.matches('.section-title, .deco')) delay = 0;
    else if (el.matches('.section-sub')) delay = lead ? 220 : 0;
    else if (el.matches('.tile')) delay = lead ? 600 : 0;
    else if (el.matches('.cta')) delay = (lead ? 600 : 0) + (document.querySelector('.tile.in') ? 800 : 0);
    else delay = (lead ? 600 : 0) + (el.matches('.crit') ? Math.min(el.__rv, 5) * STEP : 0);
    if (el.__hero && el.__seen) replayCard();
    el.__seen = true;
    el.style.transitionDelay = `${delay}ms`;
    el.classList.add('in');
    clearTimeout(el.__t);
    el.__t = setTimeout(() => { el.classList.remove('reveal', 'in'); el.style.transitionDelay = ''; }, DUR + delay + 200);
  }
  function hide(el) {
    clearTimeout(el.__t);
    el.style.transitionDelay = '';
    el.classList.remove('in');
    el.classList.add('reveal');
  }
  const showIO = new IntersectionObserver((en) => en.forEach((e) => e.isIntersecting && show(e.target)),
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  const hideIO = new IntersectionObserver((en) => en.forEach((e) => { if (!e.isIntersecting && e.target.__seen) hide(e.target); }),
    { threshold: 0 });
  // Start once the page is actually visible (translations applied), so the entrance is seen
  const ready = window.i18n && window.i18n.ready ? window.i18n.ready : Promise.resolve();
  ready.then(() => setTimeout(() => els.forEach((el) => {
    showIO.observe(el); hideIO.observe(el);
    if (!el.classList.contains('reveal')) el.__seen = true; // shown from the start: eligible to replay later
  }), 150));
})();
