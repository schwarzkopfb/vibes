const MULBERRY_SEED = 0x6d2b79f5;
const UINT32_MAX = 4294967296;
const HASH_MULTIPLIER = 31;

export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + MULBERRY_SEED) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_MAX;
  };
}

export function hashStringToSeed(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * HASH_MULTIPLIER + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

