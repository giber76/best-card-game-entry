// Ember Court — a small seeded random source (mulberry32) so a screenshot seed
// always deals the same hands. The live game seeds from the clock; the ?shot=
// scenes seed from the query, which makes every screenshot reproducible.

export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle driven by a seeded rng; returns the same array.
export function shuffleInPlace(rng, items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    const held = items[index];
    items[index] = items[other];
    items[other] = held;
  }
  return items;
}
