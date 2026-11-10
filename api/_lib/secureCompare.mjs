import { createHash, timingSafeEqual } from 'node:crypto';

// Hash both sides before comparing so a length mismatch cannot bail out early.
export function secretsMatch(left, right) {
  const a = createHash('sha256').update(String(left)).digest();
  const b = createHash('sha256').update(String(right)).digest();
  return timingSafeEqual(a, b);
}
