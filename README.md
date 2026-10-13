# nutrapproved

## Adding a compound and its review

One key ties everything together: the compound `id` (lowercase letters, digits, dashes), e.g. `zinc-picolinate`.

| Part | Location |
|---|---|
| Review (source of truth) | `supplement-finder/reviews/<id>.json` |
| Finder list entry (copied from the review) | `supplement-finder/compounds.json` |
| Structure drawing (optional, found by name) | `supplement-finder/structures/<id>.svg` |
| Review page | `supplement-finder/reviews/review.html?id=<id>` |

### Review file structure

```
{
  "id": "<id>",                     must equal the file name
  "compound": { ... },              index fields, see below; shared by all languages
  "scores": { evidence, pricing, benefits, safety },   0-10; optional "total"
  "references": [ "...", ... ],
  "en": { ... },                    text blocks, one per language; missing language falls back to en
  "cs": { ... }
}
```

`compound` block (copied unchanged into `compounds.json`):

| Field | Meaning |
|---|---|
| `name` | `{ "en": ..., "cs": ... }` |
| `aliases` | other names, used by search |
| `type` | mineral, vitamin, amino acid derivative, herbal extract, ... |
| `form` | complex, ionic, hydrate, extract, free molecule, ... (general class, not the specific variant) |
| `active` | the active substance, e.g. magnesium |
| `goals` | list, e.g. sleep, stress, muscle |
| `dose` | `{ min, max, unit, basis, per }`; `basis` says what the amount refers to (elemental magnesium) |
| `upper_limit` | `{ value, unit, basis, source }` or `null` |
| `timing` | when to take it |
| `vegan` | true / false |

Language block (`en`, `cs`): `subtitle`, `about` (paragraphs), `structure_alt`, `facts` (`[label, value]` rows such as formula and molar mass; dose and timing rows are added automatically from `compound`), `positives`, `negatives`, `foods`, `scores_note`, `recommendations`. Sections that are left out are not shown. Text supports `**bold**` and `*italic*`.

### Steps

1. Write `reviews/<id>.json` (copy `magnesium-bisglycinate.json` as a template).
2. Copy its `compound` block into `compounds.json` as `{ "id": "<id>", ...compound, "review": true }`.
3. Optional: add `structures/<id>.svg`. Without it the placeholder is shown.
4. New `type`, `form`, `goals`, `basis` or `timing` values need a Czech entry `value.<text>` in `i18n/cs.json`.
5. Run `python3 supplement-finder/scripts/check_compounds.py`. It fails if the pairing is broken or if the `compounds.json` entry differs from the review's `compound` block.
