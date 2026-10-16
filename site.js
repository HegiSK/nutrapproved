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

  // Arriving from another page with #section: start at the top, then glide down once the page is ready.
  if (location.hash.length > 1) {
    history.scrollRestoration = 'manual';
    const go = () => { const y = targetY(location.hash); if (y != null) { scrollTo({ top: 0, behavior: 'instant' }); setTimeout(() => glide(y), 250); } };
    const ready = window.i18n && window.i18n.ready ? window.i18n.ready : Promise.resolve();
    Promise.all([ready, new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r)))]).then(() => requestAnimationFrame(go));
  }
})();
