import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { IAttack, IPlayer, ISubclass, StatAbbr } from './index';

export type NotebookPageType = 'quest' | 'note';

export interface INotebookPage {
  id: string;
  title: string;
  content: string;
  type: NotebookPageType;
  createdAt: number;
}

export interface INotebookData {
  pages: INotebookPage[];
}

export interface INotebookProps {
  notebookData: INotebookData;
  updateNotebookData: (data: INotebookData) => void;
}

export interface ITrainingEntry {
  id: string;
  name: string;
  stat: StatAbbr;
  goal: number;
  progress: number;
  lastRollDisplay: string;
}

export type ITrainingData = Record<string, ITrainingEntry[]>;

export interface ITrainingProps {
  players: IPlayer[];
  trainingData: ITrainingData;
  updateTrainingData: (data: ITrainingData) => void;
}

export interface IChaosRow {
  id: string;
  min: number;
  max: number;
  event: string;
  description: string;
}

export interface IChaosTable {
  id: string;
  name: string;
  rows: IChaosRow[];
  isDefault?: boolean;
}

export interface IChaosData {
  customTables: IChaosTable[];
}

export interface IChaosProps {
  chaosData: IChaosData;
  updateChaosData: (data: IChaosData) => void;
}

export interface ISubclassManagerProps {
  subclasses?: ISubclass[];
  updateSubclasses: (subclasses: ISubclass[]) => void;
}

export interface IDamageModEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  pillClass: string;
}

export interface IAttackEditorProps {
  attack: IAttack;
  onChange: (attack: IAttack) => void;
  onRemove: () => void;
}

export interface ICampaignListProps {
  user: { username: string };
  onSelectCampaign: (campaign: import('./index').ICampaign) => void;
  onLogout: () => void;
}

export type IDescriptionPart =
  | { type: 'text'; value: string }
  | { type: 'dice'; value: string; count: number; sides: number };

export interface IInlineDiceProps {
  count: number;
  sides: number;
  label: string;
}

export interface IDescriptionDisplayProps {
  text: string;
}

export interface IChaosResultPanelProps {
  roll: number | null;
  row: IChaosRow | null;
  tableId: string;
}

export interface IChaosTableRowItemProps {
  row: IChaosRow;
  highlighted: boolean;
  rowRef: RefObject<HTMLDivElement | null>;
  isEditing: boolean;
  onChange: (row: IChaosRow) => void;
  onDelete: () => void;
}

export interface IChaosTableProps {
  table: IChaosTable;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (table: IChaosTable) => void;
}

export interface ITrainingEntryProps {
  entry: ITrainingEntry;
  player: IPlayer;
  onChange: (entry: ITrainingEntry) => void;
  onRemove: () => void;
}

export interface IPlayerTrainingCardProps {
  player: IPlayer;
  entries: ITrainingEntry[];
  onUpdate: (entries: ITrainingEntry[]) => void;
}
