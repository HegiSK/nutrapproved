# Supplement Finder (browser-only, Python is all you need)

A static page with instant search (typo-tolerant) and filters. No server, database,
Docker, Node or API keys. The page downloads `compounds.json` and searches it in the browser.

```
index.html / styles.css / app.js   the website
compounds.json                     the compound list (edit this)
structures/                        structure drawings (SVG) shown on the cards
vendor/minisearch.js               small open-source search library (MIT licence, included)
images/placeholder.svg             default product image
scripts/check_compounds.py         checks compounds.json for mistakes
```

## Preview on your computer

```bash
cd supplement-finder
python3 scripts/check_compounds.py     # optional: validates compounds.json
python3 -m http.server 8000
```

Open http://localhost:8000 . (Do not double-click index.html; browsers block loading
compounds.json from file:// addresses.) Stop the server with Ctrl+C.

## Change compounds

Edit `compounds.json` (keep the same fields), run the check script, refresh the page.
Each compound needs a unique `id` (a lowercase slug). Put the structure drawing in `structures/<id>.svg` (named exactly like the compound `id`); without one the placeholder is shown.
Set `"review": true` when `reviews/<id>.json` exists.
`dose.basis` says what the amount refers to (e.g. elemental magnesium); `upper_limit` can be `null`.

## Publish with GitHub Pages

Commit and push this folder, then in the repo: Settings -> Pages -> deploy from your branch.
The page will be at `https://<user>.github.io/<repo>/supplement-finder/`.

## Limits

The whole file is downloaded by every visitor, so this suits a catalog up to a few thousand
compounds. Beyond that, a search server (such as Typesense) becomes worthwhile.
