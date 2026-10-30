// The deterministic event id (research R3). UUIDv7-shaped: 48-bit unix-millisecond time, version 7, then the sequence number in the counter fields, variant 10, zero-filled elsewhere. No randomness:
// the same (time, seq) gives the same id on every machine and on every read, so a rebuild, an upcast of a version 0 entry and a replay agree, and ids sort by (time, seq). Pure — no crypto, no clock.
const hex = (n: number, width: number): string => n.toString(16).padStart(width, "0");

export function uuid7(timeMs: number, seq: number): string {
  if (!Number.isInteger(timeMs) || timeMs < 0 || timeMs > 0xffffffffffff) throw new Error(`uuid7: time ${timeMs} is not a 48-bit millisecond count`);
  if (!Number.isInteger(seq) || seq < 0 || seq >= 2 ** 44) throw new Error(`uuid7: seq ${seq} is outside 0…2^44-1`);
  const high = Math.floor(seq / 2 ** 32) & 0xfff; // rand_a: the high 12 bits of the counter
  const low = seq % 2 ** 32; // rand_b: the low 32 bits of the counter
  const s = `${hex(timeMs, 12)}7${hex(high, 3)}8${hex(low, 15)}`;
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
