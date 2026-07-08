import type { LogicBlock } from '../../../types/domain/logic-block';

/** Código de livro — PHB, MM, TCE, XPHB, … */
export type FiveESourceCode = string;

export interface FiveEEntityRef {
  name: string;
  source: FiveESourceCode;
}

export interface FiveEMediaHref {
  type: 'internal' | 'external';
  path?: string;
  url?: string;
}

export interface FiveEImageBlock {
  type: 'image';
  href: FiveEMediaHref;
  width?: number;
  height?: number;
  credit?: string;
}

export type FiveEEntry = string | FiveEEntryObject | FiveEEntryObject[];

export interface FiveEEntryObject {
  type: string;
  name?: string;
  entries?: FiveEEntry;
  [key: string]: unknown;
}

export interface FiveESpellRaw {
  name: string;
  source: FiveESourceCode;
  page?: number;
  level: number;
  school: string;
  time?: Array<{ number: number; unit: string }>;
  range?: Record<string, unknown>;
  components?: { v?: boolean; s?: boolean; m?: string | boolean };
  duration?: Array<Record<string, unknown>>;
  entries?: FiveEEntry;
  entriesHigherLevel?: FiveEEntryObject[];
  scalingLevelDice?: Record<string, unknown>;
  damageInflict?: string[];
  savingThrow?: string[];
  miscTags?: string[];
  areaTags?: string[];
  ritual?: boolean;
  concentration?: boolean;
  srd?: boolean;
  basicRules?: boolean;
  reprintedAs?: string[];
  hasFluff?: boolean;
  hasFluffImages?: boolean;
  [key: string]: unknown;
}

export interface FiveESpellClassEntry {
  name: string;
  source: FiveESourceCode;
}

export type FiveESpellSourcesMap = Record<
  FiveESourceCode,
  Record<string, { class?: FiveESpellClassEntry[]; [key: string]: unknown }>
>;

export interface FiveESpellFluffRaw {
  name: string;
  source: FiveESourceCode;
  entries?: FiveEEntry;
  images?: FiveEImageBlock[];
}

export interface FiveESpellFile {
  spell: FiveESpellRaw[];
}

export type CompendiumEntityType =
  | 'spell'
  | 'monster'
  | 'item'
  | 'class'
  | 'subclass'
  | 'feat'
  | 'race';

export interface ParsedInlineTag {
  tag: string;
  raw: string;
  segments: string[];
  displayText: string;
  ref?: {
    kind: CompendiumEntityType | 'condition' | 'skill' | 'damage' | 'dice' | 'unknown';
    name?: string;
    source?: string;
  };
}

export interface SanitizedText {
  plainText: string;
  markdown?: string;
  tags: ParsedInlineTag[];
}

export interface CompendiumAssetRef {
  kind: 'internal' | 'external';
  path?: string;
  url?: string;
  role: 'portrait' | 'token' | 'spellArt' | 'itemArt' | 'cover' | 'audio';
  width?: number;
  height?: number;
  credit?: string;
}

export interface CompendiumProvenance {
  provider: '5etools';
  dataPath: string;
  fluffPath?: string;
  sourceFile: string;
  ingestedAt: string;
  version?: string;
}

export interface MasterSpell {
  id: string;
  campaignId?: string;
  entityKey: string;
  index: string;
  name: string;
  source: string;
  page?: number;
  level: number;
  school: string;
  schoolLabel: string;
  castingTime: string;
  range: string;
  duration: string;
  ritual: boolean;
  concentration: boolean;
  components: string[];
  material?: string;
  description: string;
  higherLevel?: string;
  classes: string[];
  damageFormula?: string;
  damageType?: string;
  saveType?: string;
  search: SanitizedText;
  media?: { spellArt?: CompendiumAssetRef; gallery?: CompendiumAssetRef[] };
  logicBlock: LogicBlock;
  provenance: CompendiumProvenance;
  sourceFlags: { srd?: boolean; basicRules?: boolean; edition?: string };
  reprintedAs?: string[];
}

/* ── 5e.tools Item types ─────────────────────────────────────────────── */

/**
 * Raw item shape from 5e.tools JSON files:
 * `items.json`, `items-base.json`, `magicvariants.json`.
 */
export interface FiveEItemRaw {
  name: string;
  source: FiveESourceCode;
  page?: number;
  type?: string;
  rarity?: string;
  weight?: number;
  value?: number;
  entries?: FiveEEntry;
  weaponCategory?: string;
  dmg1?: string;
  dmgType?: string;
  property?: string[];
  range?: string;
  ac?: number;
  strength?: string;
  stealth?: boolean;
  srd?: boolean;
  basicRules?: boolean;
  /** Magic item flag (magic variants). */
  wondrous?: boolean;
  reqAttune?: boolean | string;
  baseItem?: string;
  tier?: string;
  /** Inherited from the base item for magic variants. */
  inherits?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FiveEItemFile {
  item?: FiveEItemRaw[];
  baseitem?: FiveEItemRaw[];
  itemGroup?: FiveEItemRaw[];
}

/**
 * Normalized item document persisted in the local `compendium-items` collection.
 * Parallel to `MasterSpell`.
 */
export interface MasterItem {
  id: string;
  campaignId?: string;
  entityKey: string;
  index: string;
  name: string;
  source: string;
  page?: number;
  type?: string;
  rarity?: string;
  weight?: number;
  /** Value in copper pieces (5e.tools stores value in cp). */
  valueCp?: number;
  /** Human-readable cost string, e.g. "50 gp". */
  cost?: string;
  category: string;
  weaponCategory?: string;
  armorCategory?: string;
  armorClass?: number;
  damageFormula?: string;
  damageType?: string;
  properties?: string[];
  description: string;
  requiresAttunement?: boolean | string;
  magic?: boolean;
  search: SanitizedText;
  media?: { itemArt?: CompendiumAssetRef; gallery?: CompendiumAssetRef[] };
  provenance: CompendiumProvenance;
  sourceFlags: { srd?: boolean; basicRules?: boolean; edition?: string };
}

export interface MasterMonster {
  id: string;
  campaignId?: string;
  entityKey: string;
  index: string;
  name: string;
  source: string;
  size?: string;
  type?: string;
  alignment?: string;
  cr?: string;
  ac?: string;
  hp?: string;
  speed?: string;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  saves?: Record<string, string>;
  skills?: Record<string, string>;
  senses?: string[];
  languages?: string[];
  passivePerception?: number;
  actions?: Array<{ name: string; desc: string }>;
  traits?: Array<{ name: string; desc: string }>;
  search: SanitizedText;
  provenance: CompendiumProvenance;
  sourceFlags: { srd?: boolean; basicRules?: boolean; edition?: string };
}

export interface MasterSubclass {
  id: string;
  campaignId?: string;
  entityKey: string;
  index: string;
  classId: string;
  name: string;
  shortName: string;
  source: string;
  features: Array<{ name: string; desc: string; level: number; stats?: IExtractedStats }>;
  search: SanitizedText;
  provenance: CompendiumProvenance;
  sourceFlags: { srd?: boolean; basicRules?: boolean; edition?: string };
}

export interface MasterClass {
  id: string;
  campaignId?: string;
  entityKey: string;
  index: string;
  name: string;
  source: string;
  hitDice?: string;
  proficiencies?: {
    armor?: string[];
    weapons?: string[];
    skills?: string;
  };
  skills?: string[];
  saves?: string[];
  resistances?: string[];
  immunities?: string[];
  conditionImmunities?: string[];
  features?: Array<{ name: string; desc: string; level: number; stats?: IExtractedStats }>;
  subclasses?: MasterSubclass[];
  search: SanitizedText;
  provenance: CompendiumProvenance;
  sourceFlags: { srd?: boolean; basicRules?: boolean; edition?: string };
}

export interface MasterRace {
  id: string;
  campaignId?: string;
  entityKey: string;
  index: string;
  name: string;
  source: string;
  size?: string;
  speed?: string;
  /** Fixed ability score improvements from the base race. */
  ability?: Array<Record<string, number>>;
  /** Structured ASI choice blocks (e.g. "Choose 1 of: +1 STR, +1 DEX…"). */
  abilityChoices?: IChoiceObject[];
  /** Structured skill proficiency choice blocks. */
  skillChoices?: IChoiceObject[];
  /** Structured language choice blocks. */
  languageChoices?: IChoiceObject[];
  skills?: string[];
  saves?: string[];
  resistances?: string[];
  immunities?: string[];
  conditionImmunities?: string[];
  traits?: Array<{ name: string; desc: string; stats?: IExtractedStats }>;
  /** Parsed subraces for this base race. */
  subraces?: MasterSubrace[];
  search: SanitizedText;
  provenance: CompendiumProvenance;
  sourceFlags: { srd?: boolean; basicRules?: boolean; edition?: string };
}

export interface FiveEToolsSanitizerOptions {
  defaultSource?: string;
  outputFormat?: 'plain' | 'markdown' | 'both';
  extractRefs?: boolean;
  tagHandlers?: Partial<Record<string, FiveETagHandler>>;
}

export type FiveETagHandler = (
  tag: string,
  segments: string[],
  raw: string,
  ctx: FiveETagContext,
) => SanitizedText | string;

export interface FiveETagContext {
  defaultSource: string;
  entityType?: CompendiumEntityType;
}

export interface ParseEntriesResult {
  blocks: Array<{ type: string; name?: string; body: SanitizedText }>;
  merged: SanitizedText;
}

export interface IExtractedStats {
  acBonus?: number;
  hpMaxBonus?: number;
  speedBonus?: number;
  resistances?: string[];
  immunities?: string[];
  vulnerabilities?: string[];
}

/**
 * A structured representation of a 5etools `{"choose": {"from": [...], "count": N}}` block.
 * Produced by parseChooseObject() and stored on MasterRace / MasterSubrace.
 */
export interface IChoiceObject {
  type: 'ability' | 'skill' | 'tool' | 'language';
  count: number;
  /** The concrete list of options the player can pick from. */
  options: string[];
  /** The level at which this choice is unlocked (e.g. 1 for race, 4/8/12 for class ASIs). Defaults to 1 if not present. */
  level?: number;
}

/** A subrace linked back to its parent MasterRace via parentEntityKey. */
export interface MasterSubrace {
  id: string;
  entityKey: string;
  /** Matches MasterRace.entityKey of the parent race. */
  parentEntityKey: string;
  name: string;
  source: string;
  speed?: string;
  /** Fixed ability score improvements (e.g. +1 INT for High Elf). */
  ability?: Array<Record<string, number>>;
  /** Structured ASI choice blocks. */
  abilityChoices?: IChoiceObject[];
  /** Structured skill proficiency choice blocks. */
  skillChoices?: IChoiceObject[];
  /** Structured language choice blocks. */
  languageChoices?: IChoiceObject[];
  skills?: string[];
  saves?: string[];
  resistances?: string[];
  immunities?: string[];
  conditionImmunities?: string[];
  traits?: Array<{ name: string; desc: string; stats?: IExtractedStats }>;
}
