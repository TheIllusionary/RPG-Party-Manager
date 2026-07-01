import type { IAttack, IBuff, IEnemy, IEquipment, IPlayer, ISubclass, StatAbbr } from '../../types';

export interface IRollFormulaResult {
  total: number;
  rolls: number[];
  modifier: number;
  critBonus?: number;
}

export type AdvantageState = 'normal' | 'advantage' | 'disadvantage';

export interface IRollWithAdvantageResult {
  roll: number;
  rolls: number[];
}

export interface IDamageModifierBreakdown {
  label: string;
  multiplier: number;
}

export interface IEffectiveDamageModifiers {
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
}

export interface ISaveModifiersResult {
  saveBonus: number;
  advantageState: AdvantageState;
}

export interface IHpApplyResult {
  hpCurrent: number;
  hpTemp: number;
  ultCurrent: number;
}

export interface IResourceConversionFailure {
  ok: false;
  error: string;
}

export interface ICastSpellSuccess {
  ok: true;
  hpCurrent: number;
  hpTemp: number;
  ultCurrent: number;
  recentSpells: number[];
  manaCurrent?: number;
  costPaid: number;
  costResource: string;
}

export type ICastSpellResult = IResourceConversionFailure | ICastSpellSuccess;

export interface IHpManaConversionSuccess {
  ok: true;
  hpCurrent: number;
  hpTemp: number;
  ultCurrent: number;
  manaCurrent: number;
}

export type IHpManaConversionResult = IResourceConversionFailure | IHpManaConversionSuccess;

export interface ISpellCostPreview {
  cost: number;
  resource: string;
  canCast: boolean;
  reason?: string;
}

export type CcModifierResult = 'normal' | 'resistant' | 'immune' | 'vulnerable';

export type ParseAbilitiesFn = (abilitiesText: string) => IAttack[];
export type RollFormulaFn = (formula: string, isCrit?: boolean) => IRollFormulaResult;
export type GetDamageMultiplierFn = (
  damageType: string,
  player: IPlayer,
  equipment: IEquipment,
  subclassData?: ISubclass | null,
) => number;
export type GetCCModifierFn = (
  ccEffect: string,
  entity: IPlayer | IEnemy,
  equipment?: IEquipment | null,
) => CcModifierResult;
export type CalculateEffectiveACFn = (
  player: IPlayer,
  equipment: IEquipment,
  buffsDatabase?: IBuff[],
) => number;
export type GetSaveModifiersFn = (
  player: IPlayer,
  ccEffect: string,
  equipment: IEquipment,
  buffsDatabase?: IBuff[],
  saveStatKey?: StatAbbr | string | null,
) => ISaveModifiersResult;
