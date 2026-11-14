import Phaser from 'phaser';
import { drawMenuArena } from '../art/table.js';
import { online } from '../systems/online.js';
import { sfx } from '../systems/audio.js';

export class LobbyScene extends Phaser.Scene {
  constructor() { super('Lobby'); }
  create(): void {
    drawMenuArena(this);
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;flex-direction:column;overflow:auto;padding:16px;box-sizing:border-box;background:#07111bd9;z-index:20;font-family:Arial;color:#eaf7ff';
    panel.innerHTML = `<section style="width:min(420px,85vw);flex-shrink:0;margin:auto 0;box-sizing:border-box;padding:24px;background:#102635;border:1px solid #388a99;border-radius:16px"><p style="color:#70dce9;letter-spacing:3px">ROKUMON / PRIVATE MATCH</p><h1>Across the table.</h1><p>Invite a friend. Each player uses their own mouse or touchscreen.</p><button data-create>Create a room</button><p>Or enter your friend's room code</p><form><input aria-label="Room code" maxlength="6" autocomplete="off" placeholder="ROOM CODE" style="text-transform:uppercase;width:150px;padding:12px;font-size:18px"><button type="submit">Join room</button></form><p data-status role="status" style="min-height:54px;line-height:1.5"></p><button data-back>Back to menu</button><p style="font-size:12px;color:#a5bdce">Matches continue if you switch tabs. Leaving ends the room.</p></section>`;
    document.body.append(panel);
    panel.querySelectorAll('button').forEach(button => button.style.cssText = 'padding:12px 18px;margin:4px 4px 4px 0;background:#16788a;border:1px solid #69d4e1;border-radius:6px;color:white;font-size:16px;cursor:pointer');
    const status = panel.querySelector<HTMLElement>('[data-status]')!;
    let starting = false;
    online.listener = message => {
      if (message.type === 'room') {
        status.textContent = `Room ${online.code} · ${message.status === 'playing' ? 'Opponent connected…' : 'Share this code with your friend. Waiting for them to join.'}`;
      }
      if (message.type === 'state' && message.world && !starting) { starting = true; this.scene.start('Online', { world: message.world }); }
      if (message.type === 'error' || message.type === 'closed') status.textContent = message.message || message.reason || 'Connection ended.';
    };
    panel.querySelector('[data-create]')!.addEventListener('click', () => { sfx.unlock(); status.textContent = 'Creating room…'; online.connect({ type: 'create' }); });
    panel.querySelector('form')!.addEventListener('submit', event => { event.preventDefault(); const code = panel.querySelector('input')!.value.trim().toUpperCase(); if (!/^[A-Z0-9]{6}$/.test(code)) { status.textContent = 'Enter the 6-character room code.'; return; } sfx.unlock(); status.textContent = 'Joining room…'; online.connect({ type: 'join', code }); });
    panel.querySelector('[data-back]')!.addEventListener('click', () => { online.close(); this.scene.start('Menu'); });
    this.events.once('shutdown', () => { panel.remove(); online.listener = null; });
  }
}

