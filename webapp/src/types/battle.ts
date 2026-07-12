import type { Dispatch, SetStateAction } from 'react';
import type { ActorDamageModifiers } from '../engine/types';
import type { LogicBlock } from './domain';
import type {
  IAppConfig,
  IAttack,
  IBuff,
  IEnemy,
  IEquipment,
  IMonster,
  IPlayer,
  ISubclass,
  StatAbbr,
} from './index';

export interface TurnActorRef {
  type: 'player' | 'enemy';
  id: string;
  name: string;
}

/** Monster / bestiary collection stored in campaign data. */
export type ILibrary = IMonster[];

/** Map of entity id → minimized card flag. */
export type IMinimizedMap = Record<string, boolean>;

export interface ILevelInfo {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number | null;
  xpProgress?: number;
}

export interface IDndSkill {
  name: string;
  stat: StatAbbr;
}

export interface IPlayerBuffEntry {
  text: string;
  source: 'character' | 'wondrous' | 'item';
  sourceName: string;
  slotLabel?: string;
  name?: string;
  config?: IBuff;
}

export interface IEnemyBuffEntry {
  name: string;
  config?: IBuff;
}

export interface IPlayerSpriteInfo {
  spriteName: string;
  spriteState: 'normal' | 'ko' | 'powered' | 'winded' | 'hurt';
}

export interface IEnemySpriteInfo {
  spriteName: string;
  spriteState: 'normal' | 'ko' | 'powered' | 'hurt';
}

export interface IHpManaDeltaResult {
  hpCurrent: number;
  hpTemp: number;
  ultCurrent: number;
  manaCurrent?: number;
}

export interface IEnemyHpDeltaResult {
  hp: number;
  hpTemp: number;
  limitBreakUsed?: boolean;
}

export type IPlayerEditField = { id: string; field: keyof IPlayer | 'level' } | null;
export type IEnemyEditField = { id: string; field: keyof IEnemy } | null;

export type IInlineDeltaEdit =
  | { type: 'player'; id: string; field: 'hp' | 'mana' }
  | { type: 'enemy'; id: string; field: 'hp' }
  | null;

export type AttackResolutionMode = 'enemy-vs-player' | 'player-vs-enemy';

export type AttackManualStatus = 'hit' | 'miss' | 'fail' | 'none' | 'success';

export type AttackTargetSelection = Record<string, boolean | AttackManualStatus>;

export type AttackResultType =
  | 'hit'
  | 'miss'
  | 'crit'
  | 'crit_miss'
  | 'save_success'
  | 'save_failed';

export interface IDamageTypeBreakdown {
  type: string;
  label?: string;
  multiplier?: number;
}

export interface IAttackRollResult {
  playerId?: string;
  playerName?: string;
  enemyId?: string;
  enemyName?: string;
  ac: number;
  d20: number | null;
  d20Rolls: number[] | null;
  advantageState?: string;
  toHit: number;
  totalRoll: number;
  resultType: AttackResultType;
  totalDamageApplied: number;
  damageBreakdowns: string[];
  originalHp: number;
  newHp: number;
  maxHp: number;
  isSave: boolean;
  saveStat: string;
  saveBonus: number;
  dc: number;
  resolvedEffect: string | null;
  damageTypeBreakdowns?: IDamageTypeBreakdown[];
  activeCc?: string[];
}

export interface IActiveAttackState {
  mode: AttackResolutionMode;
  attacker: IPlayer | IEnemy;
  attack: IAttack;
  selectedTargets: AttackTargetSelection;
  rollResults: IAttackRollResult[] | null;
}

/** Props passed from GameApp into the battle module shell. */
export interface IPlayerManagerShellProps {
  campaignId?: string;
  data: IPlayer[];
  updateData: (players: IPlayer[]) => void;
  equipment: IEquipment;
  battleMode: boolean;
  setBattleMode: Dispatch<SetStateAction<boolean>>;
  enemies: IEnemy[];
  setEnemies: Dispatch<SetStateAction<IEnemy[]>>;
  minimizedEnemies: IMinimizedMap;
  setMinimizedEnemies: Dispatch<SetStateAction<IMinimizedMap>>;
  library: ILibrary;
  updateLibrary: (library: ILibrary) => void;
  buffsDatabase: IBuff[];
  updateBuffsDatabase: (buffs: IBuff[]) => void;
  subclasses: ISubclass[];
  logicBlocks?: import('./domain').LogicBlock[];
  config: IAppConfig;
  configModalOpen: boolean;
  compendiumClasses?: import('../services/compendium/fiveETools/types').MasterClass[];
  compendiumSubclasses?: import('../services/compendium/fiveETools/types').MasterSubclass[];
  compendiumRaces?: import('../services/compendium/fiveETools/types').MasterRace[];
  bestiaryFavorites?: string[];
  onOpenSheet?: (playerId: string) => void;
}

export interface IUsePartyStateParams {
  data: IPlayer[];
  updateData: (players: IPlayer[]) => void;
  equipment: IEquipment;
  subclasses: ISubclass[];
  logicBlocks?: import('./domain').LogicBlock[];
  buffsDatabase: IBuff[];
  config: IAppConfig;
  battleMode: boolean;
  setBattleNotes?: Dispatch<SetStateAction<string>>;
  compendiumClasses?: import('../services/compendium/fiveETools/types').MasterClass[];
  compendiumSubclasses?: import('../services/compendium/fiveETools/types').MasterSubclass[];
  compendiumRaces?: import('../services/compendium/fiveETools/types').MasterRace[];
}

export interface IUseCombatStateParams extends IPlayerManagerShellProps {
  battleNotes?: string;
  setBattleNotes?: Dispatch<SetStateAction<string>>;
}

export type UpdatePlayerFn = {
  (id: string, fields: Partial<IPlayer>): void;
  (id: string, field: keyof IPlayer, value: IPlayer[keyof IPlayer]): void;
};

export type IResourceConversionFailure = { ok: false; error: string };

export type ICastSpellSuccess = {
  ok: true;
  hpCurrent: number;
  hpTemp: number;
  ultCurrent: number;
  recentSpells: number[];
  manaCurrent?: number;
  costPaid: number;
  costResource: string;
};

export type ICastSpellResult = IResourceConversionFailure | ICastSpellSuccess;

export type IHpManaConversionSuccess = {
  ok: true;
  hpCurrent: number;
  hpTemp: number;
  ultCurrent: number;
  manaCurrent: number;
};

export type IHpManaConversionResult = IResourceConversionFailure | IHpManaConversionSuccess;

/** Party roster + derived stats/actions from `usePartyState`. */
export interface IPartyState {
  data: IPlayer[];
  updateData: (players: IPlayer[]) => void;
  focusAndSelectRef: (el: HTMLInputElement | null) => void;
  editingId: string | null;
  setEditingId: Dispatch<SetStateAction<string | null>>;
  inlineCastPlayerId: string | null;
  setInlineCastPlayerId: Dispatch<SetStateAction<string | null>>;
  actionToast: string;
  showActionToast: (msg: string) => void;
  playerEditField: IPlayerEditField;
  setPlayerEditField: Dispatch<SetStateAction<IPlayerEditField>>;
  playerEditValue: string;
  setPlayerEditValue: Dispatch<SetStateAction<string>>;
  buffInputPlayerId: string | null;
  setBuffInputPlayerId: Dispatch<SetStateAction<string | null>>;
  buffSearchText: string;
  setBuffSearchText: Dispatch<SetStateAction<string>>;
  expandedPlayers: Record<string, boolean>;
  setExpandedPlayers: Dispatch<SetStateAction<Record<string, boolean>>>;
  minimizedPlayers: IMinimizedMap;
  setMinimizedPlayers: Dispatch<SetStateAction<IMinimizedMap>>;
  isPlayerMinimized: (id: string) => boolean;
  partyXpModalOpen: boolean;
  setPartyXpModalOpen: Dispatch<SetStateAction<boolean>>;
  partyXpAmount: string;
  setPartyXpAmount: Dispatch<SetStateAction<string>>;
  partyLevelModalOpen: boolean;
  setPartyLevelModalOpen: Dispatch<SetStateAction<boolean>>;
  partyLevelInput: string;
  setPartyLevelInput: Dispatch<SetStateAction<string>>;
  xpModalId: string | null;
  setXpModalId: Dispatch<SetStateAction<string | null>>;
  xpModalType: string;
  setXpModalType: Dispatch<SetStateAction<string>>;
  xpInputValue: string;
  setXpInputValue: Dispatch<SetStateAction<string>>;
  getPlayerSubclass: (player: IPlayer) => ISubclass | null;
  getOptionalPlayerSubclass?: (player: IPlayer) => ISubclass | null;
  playerUsesVampire: (player: IPlayer) => boolean;
  computePlayerHpDelta: (player: IPlayer, amount: number, asTempHp?: boolean) => IHpManaDeltaResult;
  computePlayerManaDelta: (player: IPlayer, amount: number) => number;
  handleCastSpell: (playerId: string, spellLevel: number) => void;
  handleHpToMana: (playerId: string) => void;
  handleManaToHp: (playerId: string) => void;
  getEquipmentBonus: (playerId: string, stat: StatAbbr) => number;
  effectiveStat: (player: IPlayer, stat: StatAbbr) => number;
  addPlayer: () => void;
  calculateMaxHP: (player: IPlayer) => number;
  calculateMaxMana: (player: IPlayer) => number;
  getDefaultManaModifier: (player: IPlayer) => number;
  getSlotLabel: (slotId: string) => string;
  getPlayerBuffs: (player: IPlayer, equipment: IEquipment) => IPlayerBuffEntry[];
  handleRemoveBuffFromTop: (player: IPlayer, buff: IPlayerBuffEntry) => void;
  getPlayerBuffsWithConfig: (player: IPlayer, equipment: IEquipment) => IPlayerBuffEntry[];
  handleToggleBuff: (entity: IPlayer, buff: IPlayerBuffEntry) => void;
  getPlayerSpriteInfo: (player: IPlayer) => IPlayerSpriteInfo;
  updatePlayer: UpdatePlayerFn;
  startPlayerEdit: (player: IPlayer, field: keyof IPlayer | 'level') => void;
  commitPlayerEdit: (player: IPlayer) => void;
  cancelPlayerEdit: () => void;
  addCc: (playerId: string, effect: string) => void;
  removeCc: (playerId: string, effect: string) => void;
  getProficiencyBonus: (player: IPlayer) => number;
  toggleSaveProficiency: (id: string, stat: StatAbbr) => void;
  formatModifier: (score: number) => string;
  getLevelInfo: (xp: number) => ILevelInfo;
  getXpForLevel: (level: number) => number;
  calculateModifier: (score: number) => number;
  setLevel: (playerId: string, newLevel: number) => void;
  openPartyLevelModal: () => void;
  applyPartyLevel: () => void;
  toggleParty: (id: string) => void;
  removePlayer: (id: string) => void;
  shortRest: () => void;
  longRest: () => void;
  givePartyXP: (type: 'flat' | 'percent' | 'levelup') => void;
  calculateColor: (current: number, max: number) => string;
  calculateSkillBonus: (player: IPlayer, stat: StatAbbr, skillName: string) => number;
  toggleSkill: (playerId: string, skillName: string) => void;
  dndSkills: readonly IDndSkill[];
  statsList: readonly StatAbbr[];
  ALL_CC_EFFECTS: readonly string[];
  castingUsesMana: boolean;
  castingUsesSpellSlots: boolean;
  spellFatigueEnabled: boolean;
  playerQualifiesForSpellSlots: (player: IPlayer) => boolean;
  getPlayerSpellSlots: (player: IPlayer) => Record<string, { current: number; max: number }>;
  adjustPlayerSpellSlot: (playerId: string, slotLevel: number, delta: number) => void;
}

/** Combat / VTT / targeting state from `useCombatState`. */
export interface ICombatState {
  enemies: IEnemy[];
  setEnemies: Dispatch<SetStateAction<IEnemy[]>>;
  minimizedEnemies: IMinimizedMap;
  setMinimizedEnemies: Dispatch<SetStateAction<IMinimizedMap>>;
  battleMode: boolean;
  setBattleMode: Dispatch<SetStateAction<boolean>>;
  library: ILibrary;
  updateLibrary: (library: ILibrary) => void;
  buffsDatabase: IBuff[];
  config: IAppConfig;
  configModalOpen: boolean;
  equipment: IEquipment;
  inlineDeltaEdit: IInlineDeltaEdit;
  setInlineDeltaEdit: Dispatch<SetStateAction<IInlineDeltaEdit>>;
  inlineDeltaValue: string;
  setInlineDeltaValue: Dispatch<SetStateAction<string>>;
  actionToast: string;
  showActionToast: (msg: string) => void;
  selectedTargets: string[];
  setSelectedTargets: Dispatch<SetStateAction<string[]>>;
  bulkActionValue: string;
  setBulkActionValue: Dispatch<SetStateAction<string>>;
  bulkTempHp: boolean;
  setBulkTempHp: Dispatch<SetStateAction<boolean>>;
  targetKey: (type: 'player' | 'enemy', id: string) => string;
  isTargetSelected: (type: 'player' | 'enemy', id: string) => boolean;
  toggleTargetSelection: (type: 'player' | 'enemy', id: string) => void;
  clearTargetSelection: () => void;
  applyBulkHpToTargets: (isHeal: boolean) => void;
  applyBulkManaDrain: () => void;
  activeAttackState: IActiveAttackState | null;
  setActiveAttackState: Dispatch<SetStateAction<IActiveAttackState | null>>;
  autoRollEnabled: boolean;
  setAutoRollEnabled: Dispatch<SetStateAction<boolean>>;
  getEnemyAttacks: (enemy: IEnemy) => IAttack[];
  startAttackTargeting: (enemy: IEnemy, attack: IAttack) => void;
  startPlayerAttackTargeting: (player: IPlayer, attack: IAttack) => void;
  executePlayerAttack: () => void;
  executeAttack: () => void;
  enemyEditField: IEnemyEditField;
  setEnemyEditField: Dispatch<SetStateAction<IEnemyEditField>>;
  enemyEditValue: string;
  setEnemyEditValue: Dispatch<SetStateAction<string>>;
  enemySearchText: string;
  setEnemySearchText: Dispatch<SetStateAction<string>>;
  triggerEnemyLimitBreak: (id: string) => void;
  battleNotes: string;
  setBattleNotes: Dispatch<SetStateAction<string>>;
  startEnemyEdit: (enemy: IEnemy, field: keyof IEnemy) => void;
  commitEnemyEdit: (enemy: IEnemy) => void;
  cancelEnemyEdit: () => void;
  addEnemy: () => void;
  updateEnemy: (id: string, field: keyof IEnemy, val: IEnemy[keyof IEnemy]) => void;
  removeEnemy: (id: string) => void;
  toggleEnemySkill: (id: string, skill: string) => void;
  copyActiveEnemy: (id: string) => void;
  selectMonster: (enemyId: string, monster: IMonster) => void;
  createAndSelectMonster: (enemyId: string, name: string) => void;
  computeEnemyHpDelta: (enemy: IEnemy, amount: number, asTempHp?: boolean) => IEnemyHpDeltaResult;
  calculateEnemyMaxHP: (enemy: IEnemy) => number;
  startInlineDelta: (type: 'player' | 'enemy', id: string, field: 'hp' | 'mana') => void;
  cancelInlineDelta: () => void;
  commitInlineDelta: () => void;
  getEnemySpriteInfo: (enemy: IEnemy) => IEnemySpriteInfo;
  addEnemyCc: (enemyId: string, effect: string) => void;
  removeEnemyCc: (enemyId: string, effect: string) => void;
  getEnemyBuffsList: (enemy: IEnemy) => IEnemyBuffEntry[];
  handleRemoveEnemyBuff: (enemyId: string, buffName: string) => void;
  handleToggleBuff: (entity: IPlayer | IEnemy, buff: IPlayerBuffEntry | IEnemyBuffEntry, isPlayer: boolean) => void;
  handleToggleEnemyBuff: (entity: IEnemy, buff: IEnemyBuffEntry) => void;
  toggleSaveProficiency: (id: string, stat: StatAbbr, isEnemy?: boolean) => void;
  triggerTurnEffects: () => void;
  shortRest: () => void;
  longRest: () => void;
  buffInputEnemyId: string | null;
  setBuffInputEnemyId: Dispatch<SetStateAction<string | null>>;
  defaultMonsters: IMonster[];
  encounterRules: LogicBlock[];
  turnOrder: TurnActorRef[];
  currentTurnIndex: number;
  currentTurnActor: TurnActorRef | null;
  initiativeMode: 'none' | 'group' | 'individual';
  setInitiativeMode: Dispatch<SetStateAction<'none' | 'group' | 'individual'>>;
  customTurnOrder: string[];
  setCustomTurnOrder: Dispatch<SetStateAction<string[]>>;
  applyQuickDamage: (
    entityType: 'player' | 'enemy',
    entityId: string,
    amount: number,
    damageType: string,
  ) => void;
  applyQuickHeal: (entityType: 'player' | 'enemy', entityId: string, amount: number) => void;
  getModifiersFor: (entityId: string) => ActorDamageModifiers | null;
  advanceEncounterTurn: () => void;
}

export interface IPlayerManagerViewProps extends IPlayerManagerShellProps {
  party: IPartyState;
  combat: ICombatState;
}

export interface ICombatHeaderProps {
  party: IPartyState;
  combat: ICombatState;
  data: IPlayer[];
  enemies: IEnemy[];
  battleMode: boolean;
  setBattleMode: Dispatch<SetStateAction<boolean>>;
  minimizedEnemies: IMinimizedMap;
  setMinimizedEnemies: Dispatch<SetStateAction<IMinimizedMap>>;
  setEnemies: Dispatch<SetStateAction<IEnemy[]>>;
  isVttActive?: boolean;
  onToggleVtt?: () => void;
}

export interface IPlayerCardProps {
  player: IPlayer;
  party: IPartyState;
  combat: ICombatState;
  battleMode: boolean;
  equipment: IEquipment;
  subclasses: ISubclass[];
  buffsDatabase: IBuff[];
  compendiumClasses?: import('../services/compendium/fiveETools/types').MasterClass[];
  compendiumSubclasses?: import('../services/compendium/fiveETools/types').MasterSubclass[];
  compendiumRaces?: import('../services/compendium/fiveETools/types').MasterRace[];
  onOpenSheet?: (playerId: string) => void;
}

export interface IEnemyCardProps {
  enemy: IEnemy;
  party: IPartyState;
  combat: ICombatState;
  battleMode: boolean;
  minimizedEnemies: IMinimizedMap;
  library: ILibrary;
  updateLibrary: (library: ILibrary) => void;
  buffsDatabase: IBuff[];
  compendiumMonsters?: import('.').IMonster[];
  bestiaryFavorites?: string[];
}

export interface IPartyXpModalProps {
  party: IPartyState;
}

export interface IPartyLevelModalProps {
  party: IPartyState;
}

export interface IVttOverlayProps {
  combat: ICombatState;
  battleMode: boolean;
  data: IPlayer[];
}

export interface IAttackResolutionModalProps {
  party: IPartyState;
  combat: ICombatState;
  equipment: IEquipment;
  buffsDatabase: IBuff[];
}

export interface IFloatingActionBarProps {
  combat: ICombatState;
}
