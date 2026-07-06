import type { IInventoryItem } from './index';
import type { LogicBlock } from './domain';

/** Canonical SRD spell stored in `IAppData.srdCatalog`. */
export interface ISRDSpell {
  id: string;
  index: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  ritual: boolean;
  concentration: boolean;
  description: string;
  higherLevel?: string;
  components: string[];
  material?: string;
  classes: string[];
  damageFormula?: string;
  damageType?: string;
  saveType?: string;
  /** Rules-engine block (damage formula, conditions, metadata). */
  logicBlock: LogicBlock;
  source: string;
  apiUpdatedAt?: string;
}

/** Canonical SRD equipment stored in `IAppData.srdCatalog`. */
export interface ISRDEquipmentItem {
  id: string;
  index: string;
  name: string;
  description: string;
  category: string;
  weaponCategory?: string;
  armorCategory?: string;
  cost?: string;
  weight?: string;
  damageFormula?: string;
  damageType?: string;
  armorClass?: number;
  /** Normalized inventory template for loot / shop UIs. */
  inventoryItem: IInventoryItem;
  logicBlock?: LogicBlock;
  source: string;
  apiUpdatedAt?: string;
}

/** SRD subclass reference from dnd5eapi.co — merged into campaign `subclasses`. */
export interface ISRDDndSubclass {
  id: string;
  index: string;
  name: string;
  description: string;
  baseClass: string;
  classIndex: string;
  passiveTraits: { name: string; description: string }[];
  source: string;
  apiUpdatedAt?: string;
  /** Ready-to-use campaign subclass document. */
  subclass: import('./index').ISubclass;
}

export interface ISRDCatalog {
  source: string;
  apiBaseUrl?: string;
  importedAt: string | null;
  spells: ISRDSpell[];
  equipment: ISRDEquipmentItem[];
  subclasses?: ISRDDndSubclass[];
}

export interface ISRDPersistBatch {
  spells?: ISRDSpell[];
  equipment?: ISRDEquipmentItem[];
  subclasses?: ISRDDndSubclass[];
}

export type SRDImportPhase =
  | 'idle'
  | 'listing'
  | 'spells'
  | 'equipment'
  | 'subclasses'
  | 'done'
  | 'error'
  | 'cancelled';

export interface SRDImportProgress {
  phase: SRDImportPhase;
  category: 'spells' | 'equipment' | 'subclasses' | null;
  completed: number;
  total: number;
  isDownloading: boolean;
  lastError: string | null;
}

export const INITIAL_SRD_IMPORT_PROGRESS: SRDImportProgress = {
  phase: 'idle',
  category: null,
  completed: 0,
  total: 0,
  isDownloading: false,
  lastError: null,
};

export function createEmptySrdCatalog(): ISRDCatalog {
  return {
    source: 'legacy-srd',
    importedAt: null,
    spells: [],
    equipment: [],
    subclasses: [],
  };
}
