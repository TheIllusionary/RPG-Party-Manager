/** Stat ability scores (D&D 6 abilities). */
export type StatAbbr = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export interface IAttackDamage {
  average?: number;
  formula: string;
  type: string;
}

export interface IAttack {
  id?: string;
  name: string;
  description?: string;
  type?: string;
  toHit?: number | null;
  dc?: number | null;
  save?: string | null;
  reach?: string | boolean;
  range?: string | boolean;
  damage?: IAttackDamage[];
  halfOnSuccess?: boolean;
  cc?: string;
  ccCustom?: string;
}

export interface IResolvedChoices {
  [level: number]: {
    asi?: Record<string, number>;
    proficiencies?: string[];
    languages?: string[];
  };
}

export interface IPlayer {
  id: string;
  name: string;
  player?: string;
  classType: string;
  xp: number;
  inParty: boolean;
  hpBase: number;
  hpCurrent: number;
  hpTemp?: number;
  manaBase?: number;
  manaCurrent: number;
  manaExhaustion?: number;
  manaModifier?: number;
  ultMax: number;
  ultCurrent: number;
  ac: number;
  proficiencyBonus?: number;
  passivePerception?: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  race?: string;
  alignment?: string;
  background?: string;
  features?: string;
  skills?: Record<string, boolean>;
  saves?: Partial<Record<StatAbbr, boolean>>;
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
  ccResistances?: string[];
  ccImmunities?: string[];
  ccVulnerabilities?: string[];
  cc?: string[];
  buffs?: string[];
  buffStates?: Record<string, boolean>;
  spentBuffs?: Record<string, boolean>;
  subclassId?: string | null;
  /** Optional second subclass (e.g. D&D multiclass or bonus archetype). */
  optionalSubclassId?: string | null;
  /** The selected subrace entity key (e.g. 'phb_race_elf_high-elf'). */
  subraceId?: string | null;
  /** ASI choices made by the player (stat abbr → chosen bonus, e.g. { str: 1 }). Legacy field. */
  asiChoices?: Record<string, number>;
  /** Skill/tool proficiency choices made at character creation (array of chosen skill names). Legacy field. */
  proficiencyChoices?: string[];
  /** Level-gated resolved choices (ASIs, skills, languages). */
  resolvedChoices?: IResolvedChoices;
  resourceTrait?: string;
  recentSpells?: number[];
  /** D&D 5e spell slots — used when mana rule is disabled. Keys "1"–"9". */
  spellSlots?: Record<string, { current: number; max: number }>;
  editing?: boolean;
}

export interface IEnemy {
  id: string;
  name: string;
  classType: string;
  ac: number;
  hp?: number;
  hpMax?: number;
  hpBase?: number;
  hpTemp?: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  proficiency?: number;
  background?: string;
  cr?: string;
  features?: string;
  abilities?: string;
  skills?: Record<string, boolean>;
  saves?: Partial<Record<StatAbbr, boolean>>;
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
  ccResistances?: string[];
  ccImmunities?: string[];
  ccVulnerabilities?: string[];
  cc?: string[];
  buffs?: string[];
  buffStates?: Record<string, boolean>;
  spentBuffs?: Record<string, boolean>;
  attacks?: IAttack[];
  editing?: boolean;
  limitBreakUsed?: boolean;
  bossHpStart?: number;
  isDefault?: boolean;
}

export type ItemCategory = 'weapon' | 'armor' | 'shield' | 'consumable' | 'wondrous' | 'gear' | 'tool';
export type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary' | 'Mythic/Artifact';
export type EquipState = 'equipped' | 'carried' | 'stowed';

export interface IInventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  weight: string;
  value?: string;
  type?: string; // Legacy slot type
  rarity: ItemRarity | string; // Allow string temporarily for migration safety
  category: ItemCategory | string;
  equipState: EquipState;
  requiresAttunement?: boolean;
  isAttuned?: boolean;
  
  // Mechanical payload
  damage?: { roll: string; type: string }[];
  properties?: string[];
  modifiers?: {
    stats?: Partial<Record<StatAbbr, number>>;
    resistances?: string[];
    immunities?: string[];
  } & Partial<Record<StatAbbr, number>>; // Allow flat stats for legacy compatibility
  
  setAttributes?: Partial<Record<StatAbbr, number>>;
  acBonus?: number;
  baseAC?: number;
  acModifierStat?: string;
  acModifierCap?: number | null;
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
  ccResistances?: string[];
  ccImmunities?: string[];
  ccVulnerabilities?: string[];
  buffs?: string[];
  isWondrousOnly?: boolean;
}

export type SlotItem = IInventoryItem | null | undefined;

export interface IEquippedSlots {
  head?: SlotItem;
  neck?: SlotItem;
  armor?: SlotItem;
  mainHand?: SlotItem;
  mainHand2?: SlotItem;
  offhand?: SlotItem;
  offhand2?: SlotItem;
  waist?: SlotItem;
  feet?: SlotItem;
  gloves?: SlotItem;
  __wondrous__?: IInventoryItem[];
}

export interface IEquipment {
  inventories: Record<string, IInventoryItem[]>;
  equipped: Record<string, IEquippedSlots>;
  playerGold: Record<string, number>;
}

export interface IBuff {
  id: string;
  name: string;
  description?: string;
  type?: string;
  oncePerRest?: string;
  turnType?: string;
  turnFormula?: string;
  additionalDamage?: string;
  additionalAC?: number;
  dodge?: boolean;
  extraMovement?: number;
  extraAction?: boolean;
  savingThrowBonus?: number;
}

export interface IPassiveTrait {
  name: string;
  description: string;
}

export interface ISubclass {
  id: string;
  name: string;
  description?: string;
  baseClass?: string;
  resourceTrait?: string;
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
  passiveTraits?: IPassiveTrait[];
  abilities?: IAttack[];
  source?: 'custom' | string;
  apiIndex?: string;
}

export interface IMonster extends IEnemy {
  hpMax: number;
  hpFormula?: string;
  exp?: number;
}

export type { INotebookPage, INotebookData, ITrainingEntry, ITrainingData, IChaosRow, IChaosTable, IChaosData } from './campaign';
export type { IBestiaryReview, IEncounterCombatant } from './bestiary';
export type { IApiErrorBody, IAuthResponse, ICampaignListItem, ICampaignDataDto } from './api';
export type { IAuthScreenProps, IAuthSession } from './auth';
export type { IEquipmentProps, ICharacterEquipmentProps } from './inventory';
export type { IEnemyLibraryProps, IEncounterBuilderProps } from './bestiary';
export type {
  ISRDCatalog,
  ISRDSpell,
  ISRDEquipmentItem,
  ISRDPersistBatch,
  SRDImportProgress,
  SRDImportPhase,
} from './srd';

export interface IAppData {
  players: IPlayer[];
  equipment: IEquipment;
  library: IMonster[];
  encounters: import('./bestiary').IEncounterCombatant[];
  training: import('./campaign').ITrainingData;
  chaos: import('./campaign').IChaosData;
  notebook: import('./campaign').INotebookData;
  bestiaryReview: import('./bestiary').IBestiaryReview;
  buffsDatabase: IBuff[];
  subclasses: ISubclass[];
  customSubclasses?: ISubclass[];
  customItems?: IInventoryItem[];
  /** Legacy SRD reference data (spells, equipment). */
  srdCatalog?: import('./srd').ISRDCatalog;
  /** Homebrew logic blocks — toggled per campaign; edited in DM Dashboard. */
  logicBlocks?: import('./domain').LogicBlock[];
  /** Array of favorite monster IDs */
  bestiaryFavorites?: string[];
}

export interface IAppConfig {
  theme: string;
  fullscreenOnStartup: boolean;
  startupView: string;
  uiScale: string;
  defaultRollMode: string;
}

export interface ICampaign {
  _id: string;
  name: string;
  description?: string;
  userId?: string;
}

export interface IUser {
  id: string;
  username: string;
}

export type {
  JsonPrimitive,
  JsonValue,
  JsonObject,
  JsonArray,
  DocumentId,
  IsoTimestamp,
  SchemaVersion,
  HomebrewRules,
  CustomAttributes,
  DocumentMeta,
  Actor,
  ActorKind,
  ActorVisibility,
  VisibilityLevel,
  ActorResourcePool,
  ActorSpellSlots,
  ActorResources,
  ActorEquipment,
  ActorEquipmentItem,
  LogicBlock,
  LogicTrigger,
  LogicCompareOp,
  LogicEffectOp,
  RuleArithmeticOp,
  RuleExpression,
  LogicCondition,
  LogicValueRef,
  LogicEffect,
  EncounterState,
  EncounterCombatantRef,
  CampaignState,
} from './domain';

export type {
  PlayerViewDTO,
  PlayerViewActorDTO,
  PlayerViewHpDTO,
  PlayerViewResourceDTO,
  PlayerViewSpellSlotsDTO,
  PlayerViewSnapshotDTO,
  PlayerViewServerMessage,
  PlayerViewClientMessage,
} from './player-view';

export type {
  SyncTimestamp,
  ISyncCampaignDocument,
  ISyncLocalMeta,
  ISyncPushPayload,
  ISyncPullResponse,
  ISyncConflictResponse,
  ISyncGameData,
} from './sync';

export type { ILibrary } from './battle';
export type {
  IPartyState,
  ICombatState,
  IPlayerManagerShellProps,
  IPlayerManagerViewProps,
  ICombatHeaderProps,
  IPlayerCardProps,
  IEnemyCardProps,
  IPartyXpModalProps,
  IPartyLevelModalProps,
  IVttOverlayProps,
  IAttackResolutionModalProps,
  IFloatingActionBarProps,
  IMinimizedMap,
  IActiveAttackState,
} from './battle';
