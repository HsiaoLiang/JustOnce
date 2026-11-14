import { test } from "node:test";
import assert from "node:assert/strict";
import { areasInBbox, formatMiles, haversineMiles, parseBbox, publicPin } from "../geo";
import { getArea } from "../areas";

test("haversine distance between two London stations", () => {
  const miles = haversineMiles({ lat: 51.5079, lng: -0.0877 }, { lat: 51.5308, lng: -0.1238 }); // London Bridge → King's Cross
  assert.ok(miles > 2.0 && miles < 2.4, `got ${miles}`);
  assert.equal(haversineMiles({ lat: 51.5, lng: -0.1 }, { lat: 51.5, lng: -0.1 }), 0);
});

test("public pins are stable and stay 150–400 m from the area centre", () => {
  const centre = getArea("hackney")!;
  for (const id of ["sony-a7-iii-28-70mm", "polaroid-onestep-2", "cmabc123", "x"]) {
    const a = publicPin(id, "hackney")!;
    assert.deepEqual(publicPin(id, "hackney"), a, "same pin every time");
    const metres = haversineMiles(centre, a) * 1609.34;
    assert.ok(metres >= 140 && metres <= 410, `${id}: ${metres} m`);
  }
  assert.notDeepEqual(publicPin("a", "hackney"), publicPin("b", "hackney"));
  assert.equal(publicPin("a", "nowhere"), null);
});

test("bounding boxes are validated and clipped to London", () => {
  assert.deepEqual(parseBbox("-0.1,51.5,0.0,51.6"), [-0.1, 51.5, 0, 51.6]);
  assert.equal(parseBbox("0,51.6,-0.1,51.5"), null); // reversed
  assert.equal(parseBbox("a,b,c,d"), null);
  assert.equal(parseBbox("10,10,11,11"), null); // not London
  assert.deepEqual(parseBbox("-2,51,2,52"), [-0.6, 51.25, 0.35, 51.72]);
});

test("areas inside a box are found by their centre", () => {
  const east = areasInBbox([-0.09, 51.52, -0.04, 51.55]);
  assert.ok(east.includes("hackney") && east.includes("dalston") && east.includes("bethnal-green"));
  assert.ok(!east.includes("brixton"));
});

test("distances read naturally", () => {
  assert.equal(formatMiles(1.234), "1.2 miles away");
  assert.equal(formatMiles(0.04), "Under 0.1 miles away");
  assert.equal(formatMiles(12.6), "13 miles away");
});
