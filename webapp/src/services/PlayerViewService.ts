import type { Actor } from '../types/domain';
import type {
  PlayerViewDTO,
  PlayerViewHpDTO,
  PlayerViewSnapshotDTO,
} from '../types/player-view';

import type { WebSocketServer } from './WebSocketServer';

function buildHpDto(actor: Actor): PlayerViewHpDTO | undefined {
  const hp = actor.resources.hp;
  if (!hp) return undefined;

  switch (actor.visibility.hp) {
    case 'hidden':
      // `realHP` exists on the actor but is intentionally omitted here.
      return undefined;
    case 'approximate': {
      const referenceMax = actor.realHP ?? hp.max;
      const referenceCurrent = actor.realHP ?? hp.current;
      if (referenceMax === undefined || referenceMax <= 0) {
        return { label: 'Unknown' };
      }
      const ratio = referenceCurrent / referenceMax;
      if (ratio <= 0) return { label: 'Down' };
      if (ratio <= 0.25) return { label: 'Bloodied' };
      if (ratio <= 0.5) return { label: 'Wounded' };
      return { label: 'Healthy' };
    }
    case 'visible':
    default:
      return {
        current: hp.current,
        max: hp.max,
        label: hp.label,
      };
  }
}

function pickVisibleCustomAttributes(actor: Actor): Record<string, unknown> | undefined {
  const keys = actor.visibility.playerVisibleAttributeKeys;
  if (!keys?.length || !actor.customAttributes) return undefined;

  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in actor.customAttributes) {
      picked[key] = actor.customAttributes[key];
    }
  }
  return Object.keys(picked).length > 0 ? picked : undefined;
}

/**
 * Strips DM secrets and returns only Player View–safe fields.
 * Whitelist: `name`, `hp`, `mana`, `statusEffects`, visible equipment, approved custom keys.
 */
export function sanitizeForPlayerView(actor: Actor): PlayerViewDTO {
  const dto: PlayerViewDTO = {
    id: actor.id,
    name: actor.name,
  };

  const hp = buildHpDto(actor);
  if (hp) dto.hp = hp;

  if (actor.visibility.resources === 'visible') {
    if (actor.resources.mana) {
      dto.mana = {
        current: actor.resources.mana.current,
        max: actor.resources.mana.max,
        label: actor.resources.mana.label,
      };
    }
    if (actor.resources.spellSlots) {
      dto.spellSlots = structuredClone(actor.resources.spellSlots);
    }
  }

  if (actor.conditions?.length) {
    dto.statusEffects = [...actor.conditions];
  }

  if (actor.equipment?.items) {
    const visible = actor.equipment.items
      .filter((item) => item.visibleToPlayers)
      .map((item) => item.name);
    if (visible.length > 0) dto.visibleEquipment = visible;
  }

  const custom = pickVisibleCustomAttributes(actor);
  if (custom) dto.customAttributes = custom;

  return dto;
}

export function sanitizeActorsForPlayerView(actors: Actor[]): PlayerViewDTO[] {
  return actors.map(sanitizeForPlayerView);
}

/**
 * Coordinates sanitization and WebSocket broadcast when actor documents change.
 */
export class PlayerViewService {
  constructor(private readonly webSocketServer: WebSocketServer) {}

  sanitizeForPlayerView(actor: Actor): PlayerViewDTO {
    return sanitizeForPlayerView(actor);
  }

  /**
   * Called after an actor is written to the local document store.
   * Sanitizes once per change and pushes the clean DTO to all connected clients.
   */
  onActorChanged(actor: Actor): void {
    const dto = this.sanitizeForPlayerView(actor);
    this.webSocketServer.broadcastActorUpdate(dto);
  }

  onActorsChanged(actors: Actor[], snapshotMeta?: Omit<PlayerViewSnapshotDTO, 'actors' | 'broadcastAt'>): void {
    const payload: PlayerViewSnapshotDTO = {
      schemaVersion: 1,
      ...snapshotMeta,
      actors: sanitizeActorsForPlayerView(actors),
      broadcastAt: new Date().toISOString(),
    };
    this.webSocketServer.broadcastSnapshot(payload);
  }
}
