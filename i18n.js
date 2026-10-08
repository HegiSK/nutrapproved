// Tiny client-side i18n. Elements opt in with data-i18n (text), data-i18n-placeholder,
// data-i18n-aria (aria-label). The English text already in the HTML is the fallback.
// Language order: ?lang=xx  >  saved choice  >  browser language  >  English.
// Dictionaries live in i18n/<lang>.json. Add a language: add it to SUPPORTED and add the file.
(function () {
  var SUPPORTED = { en: 'EN', cs: 'CS' };
  var DEFAULT = 'en';
  var root = document.documentElement;
  var base = new URL('i18n/', document.currentScript.src).href;

  function stored() { try { return localStorage.getItem('lang'); } catch (e) { return null; } }
  function save(l) { try { localStorage.setItem('lang', l); } catch (e) {} }

  function detect() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q && SUPPORTED[q]) { save(q); return q; }
    var s = stored();
    if (s && SUPPORTED[s]) return s;
    var nav = (navigator.language || '').slice(0, 2).toLowerCase();
    return SUPPORTED[nav] ? nav : DEFAULT;
  }

  var lang = detect();
  var dict = {};
  var fallback = {};
  root.lang = lang;
  root.classList.add('i18n-loading'); // hides the page until strings are applied (no English flash)

  function load(l) {
    return fetch(base + l + '.json').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function t(key, vars) {
    var s = dict[key];
    if (s == null) s = fallback[key];
    if (s == null) return key;
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : s;
  }
  // Plural form by count: keys key.one / key.few / key.many / key.other (per CLDR for the language).
  function plural(key, n, vars) {
    var rule = new Intl.PluralRules(lang).select(n);
    var k = (dict[key + '.' + rule] != null || fallback[key + '.' + rule] != null) ? key + '.' + rule : key + '.other';
    var v = { n: n };
    for (var x in vars) v[x] = vars[x];
    return t(k, v);
  }
  // Translate a data value (category, form, ingredient...) or return it unchanged.
  function value(raw) {
    var s = dict['value.' + raw];
    return s != null ? s : raw;
  }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (dict[k] != null) el.textContent = dict[k];
    });
    [['placeholder', 'data-i18n-placeholder'], ['aria-label', 'data-i18n-aria']].forEach(function (p) {
      document.querySelectorAll('[' + p[1] + ']').forEach(function (el) {
        var k = el.getAttribute(p[1]);
        if (dict[k] != null) el.setAttribute(p[0], dict[k]);
      });
    });
  }

  function addSwitcher() {
    var host = document.querySelector('.nav .inner');
    if (!host || host.querySelector('.lang')) return;
    var box = document.createElement('div');
    box.className = 'lang';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Language');
    Object.keys(SUPPORTED).forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = SUPPORTED[l];
      b.setAttribute('aria-pressed', String(l === lang));
      b.addEventListener('click', function () {
        if (l === lang) return;
        save(l);
        var u = new URL(location.href);
        u.searchParams.delete('lang');
        location.href = u.href; // reload so all strings and data are rebuilt in the new language
      });
      box.appendChild(b);
    });
    host.appendChild(box);
  }

  var domReady = new Promise(function (res) {
    if (document.readyState !== 'loading') res();
    else document.addEventListener('DOMContentLoaded', res);
  });

  var loading = Promise.all([
    load(lang),
    lang === DEFAULT ? null : load(DEFAULT).catch(function () { return {}; }),
  ]).then(function (r) {
    dict = r[0];
    fallback = r[1] || dict;
  }).catch(function (err) {
    console.error('i18n: could not load ' + lang + '.json, using page defaults', err);
  });

  var ready = Promise.all([loading, domReady]).then(function () {
    apply();
    addSwitcher();
    root.classList.remove('i18n-loading');
  });
  setTimeout(function () { root.classList.remove('i18n-loading'); }, 3000); // never leave the page hidden

  window.i18n = { lang: lang, ready: ready, t: t, plural: plural, value: value };
})();
