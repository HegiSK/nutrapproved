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
