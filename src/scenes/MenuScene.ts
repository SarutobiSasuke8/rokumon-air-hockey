import Phaser from "phaser";
import { MATCH } from "../game/constants.js";
import { sfx } from "../systems/audio.js";
import { drawMenuArena } from "../art/table.js";

type Difficulty = "easy" | "normal" | "hard";
const DIFFICULTY_KEY = "rokumon-air-hockey:difficulty";
const isDifficulty = (value: unknown): value is Difficulty => value === "easy" || value === "normal" || value === "hard";

export class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }

  create(): void {
    drawMenuArena(this);
    const text = (x: number, y: number, value: string, size: number, colour: string, bold = false) =>
      this.add.text(x, y, value, { fontFamily: "Arial, sans-serif", fontSize: size, color: colour, fontStyle: bold ? "bold" : "normal" }).setDepth(6);
    const button = (x: number, y: number, width: number, height: number, label: string, onPress: () => void, primary = false) => {
      const fill = primary ? 0x0d667c : 0x132638;
      const edge = primary ? 0x53d7e8 : 0x55738b;
      const box = this.add.rectangle(x, y, width, height, fill).setStrokeStyle(1.5, edge).setDepth(6).setInteractive({ useHandCursor: true });
      const caption = text(x, y, label, primary ? 21 : 17, "#effbff", true).setOrigin(0.5);
      box.on("pointerover", () => box.setFillStyle(primary ? 0x127c93 : 0x203b50));
      box.on("pointerout", () => box.setFillStyle(fill));
      box.on("pointerdown", onPress);
      return { box, caption };
    };

    text(76, 80, "ROKUMON  /  ARCADE", 13, "#9ab7cd", true);
    text(72, 108, "AIR\nHOCKEY", 54, "#f0f7ff", true).setLineSpacing(-10);
    text(76, 233, "Move your cyan mallet. Hit the puck left.\nDefend the cyan goal on your right.", 17, "#c5d6e5").setLineSpacing(5);
    text(76, 291, "SOLO OPPONENT", 12, "#9ab7cd", true);
    text(524, 291, "1 / 2 / 3", 12, "#9ab7cd").setOrigin(1, 0);

    let selected: Difficulty = "easy";
    const registryChoice: unknown = this.registry.get("difficulty");
    if (isDifficulty(registryChoice)) selected = registryChoice;
    else {
      try {
        const stored = window.localStorage.getItem(DIFFICULTY_KEY);
        if (isDifficulty(stored)) selected = stored;
      } catch { /* Blocked storage still permits a choice for this session. */ }
    }
    this.registry.set("difficulty", selected);
    const descriptions: Record<Difficulty, string> = {
      easy: "Easy: a slower opponent. A good place to learn.",
      normal: "Normal: quicker reactions and sharper shots.",
      hard: "Hard: fast defence. Find the angles to score.",
    };
    const description = text(76, 362, descriptions[selected], 15, "#b8cedf");
    const choices: Array<{ value: Difficulty; box: Phaser.GameObjects.Rectangle; caption: Phaser.GameObjects.Text }> = [];
    const refreshChoices = () => {
      for (const choice of choices) {
        const active = choice.value === selected;
        choice.box.setFillStyle(active ? 0x164c57 : 0x132638).setStrokeStyle(active ? 2 : 1, active ? 0x72e7cf : 0x55738b);
        choice.caption.setColor(active ? "#b7ffea" : "#c5d6e5").setText(`${active ? "• " : ""}${choice.value.toUpperCase()}`);
      }
      description.setText(descriptions[selected]);
    };
    const choose = (value: Difficulty) => {
      selected = value;
      this.registry.set("difficulty", selected);
      try { window.localStorage.setItem(DIFFICULTY_KEY, selected); } catch { /* Session choice remains active. */ }
      refreshChoices();
    };
    (["easy", "normal", "hard"] as const).forEach((value, index) => {
      const control = button(148 + index * 152, 331, 144, 44, value.toUpperCase(), () => choose(value));
      control.box.off("pointerout").on("pointerout", refreshChoices);
      choices.push({ value, ...control });
    });
    refreshChoices();

    let leaving = false;
    const start = (scene: "Game" | "Lobby") => {
      if (leaving) return;
      leaving = true;
      sfx.unlock();
      sfx.serve();
      this.scene.start(scene);
    };
    button(184, 412, 216, 54, "PLAY SOLO", () => start("Game"), true);
    button(416, 412, 216, 54, "ONLINE MATCH", () => start("Lobby"));
    text(300, 445, "Space: solo   ·   Online: private room code", 13, "#afc4d6").setOrigin(0.5, 0);

    const soundLabel = () => `ALL SOUND ${sfx.muted ? "OFF" : "ON"}`;
    const musicLabel = () => sfx.musicEnabled ? `MUSIC ON${sfx.muted ? " (MUTED)" : ""}` : "MUSIC OFF";
    const sound = button(184, 479, 216, 36, soundLabel(), () => {
      sfx.unlock(); sfx.toggleMute(); sound.caption.setText(soundLabel()); music.caption.setText(musicLabel());
    });
    const music = button(416, 479, 216, 36, musicLabel(), () => {
      sfx.unlock(); sfx.toggleMusic(); music.caption.setText(musicLabel());
    });
    sound.caption.setFontSize(14);
    music.caption.setFontSize(14);

    text(740, 110, `FIRST TO ${MATCH.winScore}`, 18, "#7de7f4", true).setOrigin(0.5);
    text(740, 143, "Move • line up • flick", 17, "#d5e7f5", true).setOrigin(0.5);
    text(740, 490, "Mouse / touch drag / WASD / arrows", 13, "#a5bfd2").setOrigin(0.5);
    const keyboard = this.input.keyboard;
    const solo = () => start("Game");
    const easy = () => choose("easy");
    const normal = () => choose("normal");
    const hard = () => choose("hard");
    keyboard?.on("keydown-SPACE", solo);
    keyboard?.on("keydown-ONE", easy);
    keyboard?.on("keydown-TWO", normal);
    keyboard?.on("keydown-THREE", hard);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off("keydown-SPACE", solo);
      keyboard?.off("keydown-ONE", easy);
      keyboard?.off("keydown-TWO", normal);
      keyboard?.off("keydown-THREE", hard);
    });
  }
}
