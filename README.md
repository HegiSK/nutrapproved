# nutrapproved

## Adding a supplement review

All reviews use one template, `review.html`, which loads `reviews/<id>.json` for the address `review.html?id=<id>`.

1. Copy `reviews/magnesium-bisglycinate.json` to `reviews/<new-id>.json` (lowercase letters, digits and dashes only) and edit it.
   Shared data (`scores`, `references`, `structure` image) sits at the top; text sits in one block per language (`en`, `cs`). A missing language falls back to English.
2. Optional: put the structure drawing next to it as `reviews/<new-id>.svg` and set `"structure"`.
3. In `supplement-finder/products.json` add `"review": "<new-id>"` to each product that should link to the review. Search suggestions and finder cards then show the review link.

Sections that are left out of the JSON are not shown.
