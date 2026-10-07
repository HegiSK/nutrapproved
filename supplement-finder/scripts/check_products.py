#!/usr/bin/env python3
"""Checks products.json for mistakes before you publish.  Run: python3 scripts/check_products.py"""
import json
import os
import sys

path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "products.json")
try:
    with open(path, encoding="utf-8") as f:
        products = json.load(f)
except json.JSONDecodeError as e:
    sys.exit(f"products.json is not valid JSON: {e}")

REQUIRED = {
    "id": str, "name": str, "brand": str, "form": str, "category": str,
    "ingredients": list, "price": (int, float),
    "vegan": bool, "gluten_free": bool, "in_stock": bool,
}
errors, seen = [], set()
if not isinstance(products, list):
    sys.exit("products.json must be a list ([ ... ]) of products.")
for i, p in enumerate(products, start=1):
    label = f"#{i} ({p.get('name', '?')})"
    for key, typ in REQUIRED.items():
        if key not in p:
            errors.append(f"{label}: missing '{key}'")
        elif not isinstance(p[key], typ) or (typ is not bool and isinstance(p[key], bool)):
            errors.append(f"{label}: '{key}' has the wrong type (expected {typ})")
    if p.get("id") in seen:
        errors.append(f"{label}: duplicate id '{p.get('id')}'")
    seen.add(p.get("id"))
    if isinstance(p.get("price"), (int, float)) and p["price"] < 0:
        errors.append(f"{label}: negative price")

if errors:
    print("\n".join(errors))
    sys.exit(f"\n{len(errors)} problem(s) found.")
print(f"OK: {len(products)} products look good.")
