import type { IBuff, ILibrary, IMonster } from './index';

export type IBestiaryReviewStatus = '' | 'in-progress' | 'reviewed';

export interface IBestiaryReview {
  [monsterId: string]: IBestiaryReviewStatus | boolean | { reviewed?: boolean };
}

export interface IEnemyLibraryProps {
  library?: ILibrary;
  updateLibrary?: (library: ILibrary) => void;
  buffsDatabase?: IBuff[];
  updateBuffsDatabase?: (buffs: IBuff[]) => void;
  bestiaryReview?: IBestiaryReview;
  updateBestiaryReview?: (review: IBestiaryReview) => void;
}

export interface IEncounterCombatant {
  id: string;
  baseId: string;
  name: string;
  hpCurrent: number;
  hpMax: number;
  ac: number;
  exp?: number;
}

export interface ILibraryMonster extends IMonster {
  hpFormula?: string;
  exp?: number;
}

export interface IEncounterBuilderProps {
  data: IEncounterCombatant[];
  updateData: (data: IEncounterCombatant[]) => void;
  library: ILibraryMonster[];
}
