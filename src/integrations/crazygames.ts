// CrazyGames SDK v3 lifecycle reporting (lingxi-cc-20261109-11).
//
// The SDK script is only loaded when the game runs on a CrazyGames host, or
// locally with ?crazygames=1 for testing. Everywhere else (the Rokumon hub,
// itch.io, a plain link) nothing is loaded and every call is a no-op.
// No ads are requested: this build reports gameplay start and stop, loading,
// and a happy moment on a win. Ads need a separate decision.
import type Phaser from "phaser";

export const CRAZYGAMES_SDK_URL = "https://sdk.crazygames.com/crazygames-sdk-v3.js";

type CgGame = {
  gameplayStart(): void;
  gameplayStop(): void;
  loadingStart(): void;
  loadingStop(): void;
  happytime(): void;
};
type CgSdk = { init(): Promise<void>; environment?: string; game: CgGame };
type CgWindow = { CrazyGames?: { SDK?: CgSdk } };

/** True on CrazyGames hosts, or anywhere with ?crazygames=1 (local testing). */
export function shouldUseCrazyGames(hostname: string, search: string): boolean {
  if (new URLSearchParams(search).get("crazygames") === "1") return true;
  const host = hostname.toLowerCase();
  return host === "crazygames.com" || host.endsWith(".crazygames.com");
}

/**
 * Wraps the SDK so a missing script, a failed init or a thrown call can never
 * interrupt play. Calls before init resolves are dropped, not queued.
 */
export function createCrazyGames(getSdk: () => CgSdk | undefined) {
  let ready = false;
  let playing = false;
  const call = (name: keyof CgGame) => {
    if (!ready) return;
    try {
      getSdk()?.game?.[name]?.();
    } catch {
      /* Optional platform reporting must never interrupt play. */
    }
  };
  return {
    async init(): Promise<boolean> {
      try {
        const sdk = getSdk();
        if (!sdk) return false;
        await sdk.init();
        ready = true;
        return true;
      } catch {
        return false;
      }
    },
    get ready() {
      return ready;
    },
    loadingStart: () => call("loadingStart"),
    loadingStop: () => call("loadingStop"),
    happytime: () => call("happytime"),
    gameplayStart() {
      if (!ready || playing) return;
      playing = true;
      call("gameplayStart");
    },
    gameplayStop() {
      if (!playing) return;
      playing = false;
      call("gameplayStop");
    },
  };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("CrazyGames SDK failed to load"));
    document.head.appendChild(el);
  });
}

/** Hook the SDK to scene lifecycle. Gameplay runs only while the Game scene is live and unpaused. */
export async function installCrazyGames(game: Phaser.Game): Promise<void> {
  if (!shouldUseCrazyGames(window.location.hostname, window.location.search)) return;
  try {
    await loadScript(CRAZYGAMES_SDK_URL);
  } catch {
    return;
  }
  const cg = createCrazyGames(() => (window as unknown as CgWindow).CrazyGames?.SDK);
  if (!(await cg.init())) return;

  const gameScene = game.scene.getScene("Game");
  const overScene = game.scene.getScene("GameOver");
  if (gameScene) {
    gameScene.events.on("start", cg.gameplayStart);
    gameScene.events.on("resume", cg.gameplayStart);
    gameScene.events.on("pause", cg.gameplayStop);
    gameScene.events.on("shutdown", cg.gameplayStop);
    if (game.scene.isActive("Game") && !game.scene.isPaused("Game")) cg.gameplayStart();
  }
  overScene?.events.on("start", () => {
    const data = overScene.sys.settings.data as { won?: boolean } | undefined;
    if (data?.won) cg.happytime();
  });
}
