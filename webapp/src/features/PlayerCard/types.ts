import type { IPlayer } from '@/types';
import type { MasterClass, MasterRace, MasterSubrace } from '@/services/compendium/fiveETools/types';

export interface ISharedPlayerProps {
  player: IPlayer;
  computedPlayer: IPlayer;
  updatePlayer: (id: string, field: keyof IPlayer, value: any) => void;
}

export interface IPlayerHeaderProps extends ISharedPlayerProps {
  battleMode?: boolean;
  isTargetSelected: (type: string, id: string) => boolean;
  toggleTargetSelection: (type: string, id: string) => void;
  spriteState: string;
  spriteName: string;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  playerEditField: { id: string; field: string } | null;
  playerEditValue: string;
  focusAndSelectRef: React.RefObject<HTMLInputElement>;
  setPlayerEditValue: (value: string) => void;
  commitPlayerEdit: (player: IPlayer) => void;
  cancelPlayerEdit: () => void;
  startPlayerEdit: (player: IPlayer, field: string) => void;
  getLevelInfo: (xp: number) => { level: number };
  compendiumRaces?: MasterRace[];
  compendiumClasses?: MasterClass[];
  compendiumSubclasses?: MasterSubrace[];
  ALL_CC_EFFECTS: string[];
  addCc: (id: string, effect: string) => void;
  removeCc: (id: string, effect: string) => void;
  isPlayerMinimized: (id: string) => boolean;
  setMinimizedPlayers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  calculateEffectiveAC: (player: IPlayer) => number;
  toggleParty: (id: string) => void;
  removePlayer: (id: string) => void;
  onOpenCodex: () => void;
}

export interface IPlayerAttributesProps extends ISharedPlayerProps {
  statsList: string[];
  getEquipmentBonus: (id: string, stat: string) => number;
  effectiveStat: (player: IPlayer, stat: string) => number;
  formatModifier: (val: number) => string;
  calculateModifier: (stat: number) => number;
}
