// Checks that the categories and the demo seed stay in step with each other.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { CATEGORIES, CATEGORY_GROUPS, categoriesInGroup, categoryBySlug } from "../catalogue";
import { parseSearch } from "../search-params";
import { LISTINGS } from "../../server/seed/data";

const publicDir = path.resolve(import.meta.dirname, "../../../public");

test("every category has a unique id and slug, a group and a tile image", () => {
  assert.equal(new Set(CATEGORIES.map((c) => c.id)).size, CATEGORIES.length);
  assert.equal(new Set(CATEGORIES.map((c) => c.slug)).size, CATEGORIES.length);
  const grouped = CATEGORY_GROUPS.flatMap((g) => categoriesInGroup(g.id));
  assert.equal(grouped.length, CATEGORIES.length);
  for (const c of CATEGORIES) assert.ok(existsSync(path.join(publicDir, c.image)), `missing ${c.image}`);
});

test("the fashion categories are searchable by slug", () => {
  for (const slug of ["clothing", "shoes", "bags", "jewellery", "watches", "accessories", "costumes"]) {
    const category = categoryBySlug(slug);
    assert.ok(category, slug);
    assert.equal(parseSearch({ category: slug }).category, category.id);
  }
});

test("the demo seed has at least two listings in every category, with photos on disk", () => {
  for (const c of CATEGORIES) {
    assert.ok(LISTINGS.filter((l) => l.category === c.id).length >= 2, `${c.label} needs at least two seed listings`);
  }
  for (const l of LISTINGS) {
    for (const photo of l.photos) assert.ok(existsSync(path.join(publicDir, photo)), `missing ${photo}`);
  }
  assert.equal(new Set(LISTINGS.map((l) => l.id)).size, LISTINGS.length);
});
