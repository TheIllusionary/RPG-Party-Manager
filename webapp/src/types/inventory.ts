import type { IBuff, IEquipment, IInventoryItem, IPlayer } from './index';

export interface IEquipmentProps {
  data: IEquipment;
  updateData: (data: IEquipment) => void;
  players: IPlayer[];
  buffsDatabase?: IBuff[];
  updateBuffsDatabase?: (buffs: IBuff[]) => void;
}

export interface ICharacterEquipmentProps extends IEquipmentProps {}

export interface IGoldModalState {
  id: string;
}

export type IEditingItemsMap = Record<string, IInventoryItem>;
