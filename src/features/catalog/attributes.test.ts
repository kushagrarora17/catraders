import { expect, test } from "bun:test";
import { groupAttributeValues } from "./attributes";

const viscosity = { _id: "a1", title: "Viscosity Grade", sortOrder: 1 };
const spec = { _id: "a2", title: "Specification", sortOrder: 3 };
const pack = { _id: "a3", title: "Pack Size", sortOrder: 2 };

test("groups values by attribute in sort order", () => {
  expect(
    groupAttributeValues([
      { label: "ACEA C3", sortOrder: 2, attribute: spec },
      { label: "5W-30", sortOrder: 2, attribute: viscosity },
      { label: "API SP", sortOrder: 1, attribute: spec },
      { label: "4 L", sortOrder: null, attribute: pack },
      null,
      { label: "orphan", sortOrder: 1, attribute: null },
    ]),
  ).toEqual([
    { attribute: "Viscosity Grade", values: ["5W-30"] },
    { attribute: "Pack Size", values: ["4 L"] },
    { attribute: "Specification", values: ["API SP", "ACEA C3"] },
  ]);
});

test("handles missing attributes", () => {
  expect(groupAttributeValues(null)).toEqual([]);
});
