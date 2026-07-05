import { WebSocketServer as WsServer, type WebSocket } from 'ws';

import type {
  PlayerViewClientMessage,
  PlayerViewDTO,
  PlayerViewServerMessage,
  PlayerViewSnapshotDTO,
} from '../types/player-view';

export interface WebSocketServerOptions {
  port: number;
  host?: string;
  /** Initial snapshot sent when a client sends `{ type: "subscribe" }`. */
  getSnapshot?: () => PlayerViewSnapshotDTO;
}

export interface WebSocketServerHandle {
  readonly port: number;
  broadcast(message: PlayerViewServerMessage): void;
  broadcastActorUpdate(dto: PlayerViewDTO): void;
  broadcastSnapshot(payload: PlayerViewSnapshotDTO): void;
  close(): Promise<void>;
  getStatus(): { running: boolean; port: number; clientCount: number };
}

function parseClientMessage(raw: string): PlayerViewClientMessage | null {
  try {
    const parsed = JSON.parse(raw) as PlayerViewClientMessage;
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function sendJson(socket: WebSocket, message: PlayerViewServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

/**
 * Local WebSocket server for Player View consumers (Owlbear overlays, second screens).
 *
 * Broadcast contract:
 * - `broadcastActorUpdate` — single sanitized `PlayerViewDTO` after an actor document changes.
 * - `broadcastSnapshot` — full party state (also sanitized upstream by `PlayerViewService`).
 *
 * Default: `ws://127.0.0.1:8765` (override with `PLAYER_VIEW_WS_PORT`).
 */
export class WebSocketServer implements WebSocketServerHandle {
  readonly port: number;
  private readonly wss: WsServer;
  private readonly clients = new Set<WebSocket>();
  private readonly getSnapshot?: () => PlayerViewSnapshotDTO;

  constructor(options: WebSocketServerOptions) {
    const host = options.host ?? '127.0.0.1';
    this.port = options.port;
    this.getSnapshot = options.getSnapshot;
    this.wss = new WsServer({ host, port: options.port });

    this.wss.on('connection', (socket) => {
      this.clients.add(socket);

      socket.on('message', (data) => {
        const raw = typeof data === 'string' ? data : data.toString('utf8');
        const message = parseClientMessage(raw);
        if (!message) return;

        if (message.type === 'subscribe' && this.getSnapshot) {
          sendJson(socket, { type: 'snapshot', payload: this.getSnapshot() });
        }
      });

      socket.on('close', () => {
        this.clients.delete(socket);
      });

      socket.on('error', () => {
        this.clients.delete(socket);
      });
    });
  }

  broadcast(message: PlayerViewServerMessage): void {
    for (const client of this.clients) {
      sendJson(client, message);
    }
  }

  /** Push one sanitized actor DTO to every connected Player View client. */
  broadcastActorUpdate(dto: PlayerViewDTO): void {
    this.broadcast({ type: 'actor_updated', payload: dto });
  }

  broadcastSnapshot(payload: PlayerViewSnapshotDTO): void {
    this.broadcast({ type: 'snapshot', payload });
  }

  getStatus(): { running: boolean; port: number; clientCount: number } {
    return {
      running: true,
      port: this.port,
      clientCount: this.clients.size,
    };
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      for (const client of this.clients) {
        client.close();
      }
      this.wss.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export function createWebSocketServer(options: WebSocketServerOptions): WebSocketServer {
  return new WebSocketServer(options);
}
