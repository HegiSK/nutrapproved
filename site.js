// Main bar hover effect: feeds the cursor position to the glow in site.css (--mx / --my).
document.addEventListener('pointermove', (e) => {
  const a = e.target.closest?.('.nav a');
  if (!a) return;
  const r = a.getBoundingClientRect();
  a.style.setProperty('--mx', `${e.clientX - r.left}px`);
  a.style.setProperty('--my', `${e.clientY - r.top}px`);
});
