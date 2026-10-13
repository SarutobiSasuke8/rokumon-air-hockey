type HubSdk = { ready(): void; score(value: number): void; gameOver(value: number, durationMs?: number): void; event(name: string, data?: Record<string, string | number | boolean>): void };
function call<K extends keyof HubSdk>(name: K, ...args: Parameters<HubSdk[K]>): void {
  try {
    const sdk = (globalThis as typeof globalThis & { window?: { Hub?: HubSdk } }).window?.Hub;
    if (sdk && typeof sdk[name] === "function") (sdk[name] as (...args: unknown[]) => void)(...args);
  } catch { /* Optional platform activity must never interrupt play. */ }
}
export const hub = {
  version: 1,
  ready: () => call("ready"),
  score: (value: number) => call("score", value),
  gameOver: (value: number, durationMs?: number) => call("gameOver", value, durationMs),
  event: (name: string, data?: Record<string, string | number | boolean>) => call("event", name, data),
};
