import type {
  CustomAttributes,
  DocumentId,
  HomebrewRules,
  IsoTimestamp,
} from './common'

export type ActorKind = 'player' | 'npc' | 'monster'

export type VisibilityLevel = 'visible' | 'hidden' | 'approximate'

export interface ActorVisibility {
  /** How HP is exposed on the Player View. */
  hp: VisibilityLevel
  /** Mana, spell slots, and similar pools. */
  resources: 'visible' | 'hidden'
  /** DM-only notes vs player-readable notes. */
  notes: 'dm_only' | 'player_visible'
  /** Keys from `customAttributes` safe to broadcast. */
  playerVisibleAttributeKeys?: string[]
}

export interface ActorResourcePool {
  current: number
  max?: number
  label?: string
}

export interface ActorSpellSlots {
  [level: string]: ActorResourcePool
}

export interface ActorResources {
  hp?: ActorResourcePool
  tempHp?: ActorResourcePool
  mana?: ActorResourcePool
  limitBreak?: ActorResourcePool
  spellSlots?: ActorSpellSlots
  [poolName: string]: ActorResourcePool | ActorSpellSlots | undefined
}

export interface ActorEquipmentItem {
  id: DocumentId
  name: string
  slot?: string
  visibleToPlayers: boolean
}

export interface ActorEquipment {
  items: ActorEquipmentItem[]
}

/** Attack definition matching legacy IAttack shape for RuleEngine compatibility. */
export interface ActorAttack {
  id?: string
  name: string
  description?: string
  type?: string
  toHit?: number | null
  dc?: number | null
  save?: string | null
  reach?: string | boolean
  range?: string | boolean
  damage?: { average?: number; formula: string; type: string }[]
  halfOnSuccess?: boolean
  cc?: string
  ccCustom?: string
}

/** Buff definition matching legacy IBuff shape for RuleEngine compatibility. */
export interface ActorBuff {
  id: string
  name: string
  description?: string
  type?: string
  oncePerRest?: string
  turnType?: string
  turnFormula?: string
  additionalDamage?: string
  additionalAC?: number
  dodge?: boolean
  extraMovement?: number
  extraAction?: boolean
  savingThrowBonus?: number
}

/**
 * Unified combatant document — players, NPCs, and monsters share the same shape
 * so homebrew logic blocks can target any actor without branching on type.
 */
export interface Actor {
  id: DocumentId
  kind: ActorKind
  name: string
  /** Player controlling this character (maps legacy `IPlayer.player`). */
  playerName?: string
  portraitUrl?: string
  inParty?: boolean
  initiative?: number
  stats: Record<string, number>
  resources: ActorResources
  equipment?: ActorEquipment
  /** Attacks available to this actor (maps legacy `IEnemy.attacks` / subclass abilities). */
  attacks?: ActorAttack[]
  /** Active buff identifiers (maps legacy `IPlayer.buffs` / `IEnemy.buffs`). */
  buffs?: string[]
  /** Per-buff enabled/disabled state (maps legacy `buffStates`). */
  buffStates?: Record<string, boolean>
  /** Per-buff spent/available state (maps legacy `spentBuffs`). */
  spentBuffs?: Record<string, boolean>
  /** Subclass identifier (maps legacy `IPlayer.subclassId`). */
  subclassId?: string | null
  /** Optional second subclass (maps legacy `IPlayer.optionalSubclassId`). */
  optionalSubclassId?: string | null
  /** UI-only inline editing flag (maps legacy `IPlayer.editing` / `IEnemy.editing`). */
  editing?: boolean
  conditions?: string[]
  visibility: ActorVisibility
  /** DM-only secret notes — never sent to Player View. */
  dmNotes?: string
  /** True HP when `visibility.hp` is hidden/approximate — never broadcast. */
  realHP?: number
  /** LLM / AI prompts for DM tooling — never broadcast. */
  aiPrompt?: string
  /** Notes players may read when `visibility.notes === 'player_visible'`. */
  playerNotes?: string
  homebrewRules?: HomebrewRules
  customAttributes?: CustomAttributes
  updatedAt: IsoTimestamp
}
