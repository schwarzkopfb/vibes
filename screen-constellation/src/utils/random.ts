const MULBERRY_SEED = 0x6d2b79f5;
const UINT32_MAX = 4294967296;
const HASH_MULTIPLIER = 31;

export function mulberry32(seed: number): () => number {
  let state = seed | 0;

  return () => {
    state |= 0;
    state = (state + MULBERRY_SEED) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_MAX;
  };
}

export function hashStringToSeed(str: string): number {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash * HASH_MULTIPLIER + str.charCodeAt(i)) | 0;
  }

  return hash >>> 0;
}
