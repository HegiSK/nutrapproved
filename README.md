# nutrapproved

## Adding a supplement review

All reviews use one template, `supplement-finder/reviews/review.html`, which loads `supplement-finder/reviews/<id>.json` for the address `supplement-finder/reviews/review.html?id=<id>`.

1. Copy `supplement-finder/reviews/magnesium-bisglycinate.json` to `supplement-finder/reviews/<new-id>.json` (lowercase letters, digits and dashes only) and edit it.
   The `id` inside the file must equal the file name. Shared data (`scores`, `references`) sits at the top; text sits in one block per language (`en`, `cs`). A missing language falls back to English.
2. Optional: put the structure drawing in `supplement-finder/structures/<new-id>.svg`. It is found by name, no field needed.
3. In `supplement-finder/compounds.json` give the compound the same `id` and add `"review": true`. Finder cards and search suggestions then show the review link. Run `python3 supplement-finder/scripts/check_compounds.py` to verify the pairing.

Sections that are left out of the JSON are not shown.
