#!/usr/bin/env python3
"""Checks compounds.json for mistakes before you publish.  Run: python3 scripts/check_compounds.py"""
import json
import os
import re
import sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
try:
    with open(os.path.join(root, "compounds.json"), encoding="utf-8") as f:
        compounds = json.load(f)
except json.JSONDecodeError as e:
    sys.exit(f"compounds.json is not valid JSON: {e}")
if not isinstance(compounds, list):
    sys.exit("compounds.json must be a list ([ ... ]) of compounds.")

REQUIRED = {
    "id": str, "name": dict, "aliases": list, "type": str, "form": str, "active": str,
    "goals": list, "dose": dict, "timing": str, "vegan": bool,
}
DOSE_KEYS = {"min": (int, float), "max": (int, float), "unit": str, "basis": str, "per": str}
LIMIT_KEYS = {"value": (int, float), "unit": str, "basis": str, "source": str}
SLUG = re.compile(r"^[a-z0-9-]+$")
LANGS = ("en", "cs")

def check_keys(obj, spec, label, errors):
    for key, typ in spec.items():
        if key not in obj:
            errors.append(f"{label}: missing '{key}'")
        elif not isinstance(obj[key], typ) or (typ is not bool and isinstance(obj[key], bool)):
            errors.append(f"{label}: '{key}' has the wrong type (expected {typ})")

errors, seen = [], set()
for i, c in enumerate(compounds, start=1):
    label = f"#{i} ({c.get('id', '?')})"
    check_keys(c, REQUIRED, label, errors)
    if c.get("id") in seen:
        errors.append(f"{label}: duplicate id '{c.get('id')}'")
    seen.add(c.get("id"))
    for lang in LANGS:
        if not (isinstance(c.get("name"), dict) and c["name"].get(lang)):
            errors.append(f"{label}: name.{lang} is missing")
    if isinstance(c.get("dose"), dict):
        check_keys(c["dose"], DOSE_KEYS, f"{label} dose", errors)
        if c["dose"].get("min", 0) > c["dose"].get("max", 0):
            errors.append(f"{label}: dose.min is larger than dose.max")
    if c.get("upper_limit") is not None:  # null means no established limit
        check_keys(c["upper_limit"], LIMIT_KEYS, f"{label} upper_limit", errors)
    cid = c.get("id")
    if isinstance(cid, str) and not SLUG.match(cid):
        errors.append(f"{label}: id must be lowercase letters, digits and dashes")
    if c.get("review") is True:
        path = os.path.join(root, "reviews", f"{cid}.json")
        if not os.path.isfile(path):
            errors.append(f"{label}: review is true but reviews/{cid}.json does not exist")
        else:
            with open(path, encoding="utf-8") as rf:
                if json.load(rf).get("id") != cid:
                    errors.append(f"{label}: reviews/{cid}.json has a different id inside")
    elif "review" in c and c["review"] is not False:
        errors.append(f"{label}: 'review' must be true or false")
    if not os.path.isfile(os.path.join(root, "structures", f"{cid}.svg")):
        print(f"note: {label} has no structures/{cid}.svg (the placeholder is shown)")

# Reviews that no compound points to.
reviews_dir = os.path.join(root, "reviews")
linked = {c.get("id") for c in compounds if c.get("review") is True}
for name in sorted(os.listdir(reviews_dir)):
    if name.endswith(".json") and name[:-5] not in linked:
        errors.append(f"reviews/{name} is not linked: add review: true to compound '{name[:-5]}'")

if errors:
    print("\n".join(errors))
    sys.exit(f"\n{len(errors)} problem(s) found.")
print(f"OK: {len(compounds)} compounds look good.")
