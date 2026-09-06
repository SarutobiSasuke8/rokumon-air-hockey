export type MatchStatus = "serving" | "playing" | "goal" | "complete";

export interface RunState {
  seed: number;
  playerScore: number;
  aiScore: number;
  elapsedMs: number;
  status: MatchStatus;
  winner: "player" | "ai" | null;
}

export function createRunState(seed = 1): RunState {
  return {
    seed,
    playerScore: 0,
    aiScore: 0,
    elapsedMs: 0,
    status: "serving",
    winner: null,
  };
}

export function snapshotRun(state: RunState): RunState {
  return JSON.parse(JSON.stringify(state));
}
