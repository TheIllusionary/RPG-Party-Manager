import type { CustomAttributes, DocumentId, DocumentMeta, IsoTimestamp } from './common';

export interface EncounterCombatantRef {
  actorId: DocumentId;
  initiative?: number;
  isActive?: boolean;
}

/**
 * Active encounter / session slice — optimized for fast read/write during combat.
 * Persisted as its own document for state recovery between app restarts.
 */
export interface EncounterState extends DocumentMeta {
  campaignId: DocumentId;
  name: string;
  round: number;
  turnIndex: number;
  combatants: EncounterCombatantRef[];
  /** DM-only tactical notes — never broadcast. */
  battlefieldNotes?: string;
  /** Notes safe to show on Player View overlays. */
  playerVisibleNotes?: string;
  activeActorId?: DocumentId;
  customAttributes?: CustomAttributes;
  updatedAt: IsoTimestamp;
}
