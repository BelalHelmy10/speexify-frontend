import assert from "node:assert/strict";
import test from "node:test";
import {
  buildResourcePickerIndex,
  formatUnitOptionLabel,
} from "../lib/resourcePickerIndex.js";

test("unit labels add the unit number without duplicating existing prefixes", () => {
  assert.equal(
    formatUnitOptionLabel({ title: "Hello & Goodbye", order: 1 }),
    "Unit 1 · Hello & Goodbye"
  );
  assert.equal(
    formatUnitOptionLabel({ title: "Unit 2 - Home & Family", order: 2 }),
    "Unit 2 - Home & Family"
  );
});

test("resource picker indexes the Speexify four-part hierarchy", () => {
  const bandGroups = [
    { level: "A0", bands: ["A0"] },
    { level: "A1", bands: ["A1.1", "A1.2"] },
    { level: "A2", bands: ["A2.1", "A2.2"] },
    { level: "B1", bands: ["B1.1", "B1.2"] },
    { level: "B2", bands: ["B2.1", "B2.2"] },
    { level: "C1", bands: ["C1.1", "C1.2"] },
    { level: "C2", bands: ["C2.1", "C2.2"] },
  ];
  const bandCodes = bandGroups.flatMap(({ bands }) => bands);
  const book = {
    _id: "book-speexify-english-for-life",
    title: "English for Life",
    order: 1,
  };
  const tracks = [
    {
      _id: "track-speexify-general",
      name: "Speexify General",
      order: -2,
      books: [book],
      levels: bandGroups.map(({ level, bands }, levelOrder) => ({
        _id: `level-speexify-general-${level.toLowerCase()}`,
        code: level,
        order: levelOrder,
        subLevels: bands.map((band) => {
          const order = bandCodes.indexOf(band);
          const title =
            band === "A0" ? "A0 / Pre-A1 · First Steps" : `${band} · Band`;

          return {
            _id: `sublevel-speexify-general-${band.toLowerCase()}`,
            title,
            code: band,
            order,
            units: [
              {
                _id: `unit-speexify-english-for-life-${band.toLowerCase()}-01`,
                title: band === "A0" ? "Hello & Goodbye" : `${band} topic`,
                order: 1,
                resources: [],
                bookLevel: {
                  _id: `booklevel-speexify-english-for-life-${band.toLowerCase()}`,
                  title,
                  code: band,
                  order,
                  book,
                },
              },
            ],
          };
        }),
      })),
    },
  ];

  const index = buildResourcePickerIndex(tracks);

  assert.equal(index.trackOptions[0].label, "Speexify General");
  assert.equal(
    index.booksByTrackId["track-speexify-general"][0].label,
    "English for Life"
  );
  assert.equal(
    index.bookLevelsByBookId["book-speexify-english-for-life"][0].label,
    "A0 / Pre-A1 · First Steps"
  );
  assert.deepEqual(
    index.bookLevelsByBookId["book-speexify-english-for-life"].map(
      ({ code }) => code
    ),
    bandCodes
  );
  assert.equal(
    index.unitOptionsByBookLevelId[
      "booklevel-speexify-english-for-life-a0"
    ][0].label,
    "Unit 1 · Hello & Goodbye"
  );
});
