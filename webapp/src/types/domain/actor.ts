import type { CustomAttributes, DocumentId, HomebrewRules, IsoTimestamp } from './common';

export type ActorKind = 'player' | 'npc' | 'monster';

export type VisibilityLevel = 'visible' | 'hidden' | 'approximate';

export interface ActorVisibility {
  /** How HP is exposed on the Player View. */
  hp: VisibilityLevel;
  /** Mana, spell slots, and similar pools. */
  resources: 'visible' | 'hidden';
  /** DM-only notes vs player-readable notes. */
  notes: 'dm_only' | 'player_visible';
  /** Keys from `customAttributes` safe to broadcast. */
  playerVisibleAttributeKeys?: string[];
}

export interface ActorResourcePool {
  current: number;
  max?: number;
  label?: string;
}

export interface ActorSpellSlots {
  [level: string]: ActorResourcePool;
}

export interface ActorResources {
  hp?: ActorResourcePool;
  mana?: ActorResourcePool;
  spellSlots?: ActorSpellSlots;
  [poolName: string]: ActorResourcePool | ActorSpellSlots | undefined;
}

export interface ActorEquipmentItem {
  id: DocumentId;
  name: string;
  slot?: string;
  visibleToPlayers: boolean;
}

export interface ActorEquipment {
  items: ActorEquipmentItem[];
}

/**
 * Unified combatant document — players, NPCs, and monsters share the same shape
 * so homebrew logic blocks can target any actor without branching on type.
 */
export interface Actor {
  id: DocumentId;
  kind: ActorKind;
  name: string;
  portraitUrl?: string;
  inParty?: boolean;
  initiative?: number;
  stats: Record<string, number>;
  resources: ActorResources;
  equipment?: ActorEquipment;
  conditions?: string[];
  visibility: ActorVisibility;
  /** DM-only secret notes — never sent to Player View. */
  dmNotes?: string;
  /** True HP when `visibility.hp` is hidden/approximate — never broadcast. */
  realHP?: number;
  /** LLM / AI prompts for DM tooling — never broadcast. */
  aiPrompt?: string;
  /** Notes players may read when `visibility.notes === 'player_visible'`. */
  playerNotes?: string;
  homebrewRules?: HomebrewRules;
  customAttributes?: CustomAttributes;
  updatedAt: IsoTimestamp;
}
