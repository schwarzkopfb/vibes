export const TWO_PI = Math.PI * 2;

export function lerp(min: number, max: number, t: number) {
  return min + (max - min) * t;
}

