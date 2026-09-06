/** Rokumon Games Event API v1. The Games Hub addon replaces this safe no-op.
 * This project is not integrated into a hub; kept as a stable seam only. */
export const hub = {
  version: 1,
  ready(): void {},
  score(_value: number): void {},
  gameOver(_value: number, _durationMs?: number): void {},
  event(_name: string, _data?: unknown): void {},
};
