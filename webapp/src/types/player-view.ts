/** Resource pool exposed to players (sanitized). */
export interface PlayerViewResourceDTO {
  current: number;
  max?: number;
  label?: string;
}

export interface PlayerViewSpellSlotsDTO {
  [level: string]: PlayerViewResourceDTO;
}

export interface PlayerViewHpDTO {
  /** Omitted when HP is hidden. */
  current?: number;
  max?: number;
  /** e.g. "Bloodied" when approximate visibility is used. */
  label?: string;
}

/**
 * Sanitized actor payload — safe to broadcast over WebSocket to Player View / VTT overlays.
 * Only whitelisted fields; DM secrets (`dmNotes`, `realHP`, `aiPrompt`) are stripped upstream.
 */
export interface PlayerViewDTO {
  id: string;
  name: string;
  hp?: PlayerViewHpDTO;
  mana?: PlayerViewResourceDTO;
  spellSlots?: PlayerViewSpellSlotsDTO;
  statusEffects?: string[];
  visibleEquipment?: string[];
  /** Only keys listed in `Actor.visibility.playerVisibleAttributeKeys`. */
  customAttributes?: Record<string, unknown>;
}

/** @deprecated Use PlayerViewDTO */
export type PlayerViewActorDTO = PlayerViewDTO;

export interface PlayerViewSnapshotDTO {
  schemaVersion: number;
  encounterId?: string;
  encounterName?: string;
  round?: number;
  turnIndex?: number;
  playerVisibleNotes?: string;
  actors: PlayerViewDTO[];
  broadcastAt: string;
}

/** Outbound WebSocket messages (DM app → Player View clients). */
export type PlayerViewServerMessage =
  | { type: 'snapshot'; payload: PlayerViewSnapshotDTO }
  | { type: 'actor_updated'; payload: PlayerViewDTO }
  | { type: 'ping'; payload: { ts: number } };

/** Inbound WebSocket messages (Player View clients → DM app). */
export type PlayerViewClientMessage =
  | { type: 'subscribe'; payload: { encounterId?: string } }
  | { type: 'pong'; payload: { ts: number } };
