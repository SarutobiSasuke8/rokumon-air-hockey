import type { RunState } from '../game/state.js';
type Point = { x: number; y: number };
export type MatchSnapshot = { run: RunState; puck: Point; player: Point; ai: Point };
export type Message = { type: string; code?: string; side?: 'player' | 'ai'; status?: string; message?: string; reason?: string; world?: MatchSnapshot; events?: Array<{ type: string; speed?: number }> };
class OnlineConnection {
  socket: WebSocket | null = null;
  side: 'player' | 'ai' = 'player';
  code = '';
  listener: ((message: Message) => void) | null = null;
  connect(request: { type: string; code?: string }): void {
    this.close();
    const endpoint = import.meta.env.VITE_MATCH_SERVER_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/match`;
    const socket = this.socket = new WebSocket(endpoint);
    const timeout = window.setTimeout(() => { if (socket.readyState === WebSocket.CONNECTING) socket.close(); }, 8000);
    socket.onopen = () => { clearTimeout(timeout); this.send(request); };
    socket.onmessage = event => {
      if (this.socket !== socket) return;
      let message: Message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.side) this.side = message.side;
      if (message.code) this.code = message.code;
      this.listener?.(message);
    };
    socket.onclose = () => { clearTimeout(timeout); if (this.socket === socket) this.listener?.({ type: 'closed', reason: 'Connection closed. Return to the menu to create or join another room.' }); };
    socket.onerror = () => { if (this.socket === socket) this.listener?.({ type: 'error', message: 'Match service unavailable. Solo practice is still available.' }); };
  }
  send(message: object): void { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message)); }
  close(): void { const old = this.socket; this.socket = null; if (old) { old.onclose = null; old.close(); } }
}
export const online = new OnlineConnection();
