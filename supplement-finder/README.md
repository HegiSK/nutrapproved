# Supplement Finder (browser-only, Python is all you need)

A static page with instant search (typo-tolerant) and filters. No server, database,
Docker, Node or API keys. The page downloads `products.json` and searches it in the browser.

```
index.html / styles.css / app.js   the website
products.json                      your product data (edit this)
vendor/minisearch.js               small open-source search library (MIT licence, included)
images/placeholder.svg             default product image
scripts/check_products.py          checks products.json for mistakes
```

## Preview on your computer

```bash
cd supplement-finder
python3 scripts/check_products.py     # optional: validates products.json
python3 -m http.server 8000
```

Open http://localhost:8000 . (Do not double-click index.html; browsers block loading
products.json from file:// addresses.) Stop the server with Ctrl+C.

## Change products

Edit `products.json` (keep the same fields), run the check script, refresh the page.
Each product needs a unique string `id`. Put real images in `images/` and set `image_url`.

## Publish with GitHub Pages

Commit and push this folder, then in the repo: Settings -> Pages -> deploy from your branch.
The page will be at `https://<user>.github.io/<repo>/supplement-finder/`.

## Limits

The whole file is downloaded by every visitor, so this suits a catalog up to a few thousand
products. Beyond that, a search server (such as Typesense) becomes worthwhile.
