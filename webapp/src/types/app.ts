import type { Dispatch, SetStateAction } from 'react';
import type { IAppConfig, IAppData, ICampaign, IEnemy } from './index';
import type { IMinimizedMap } from './battle';

export type AppTab =
  | 'players'
  | 'notebook'
  | 'inventory'
  | 'charequip'
  | 'training'
  | 'chaos'
  | 'subclasses'
  | 'bestiary';

export interface IGameAppProps {
  campaign: ICampaign;
  onBackToCampaigns: () => void;
}

export type IAppDataField = keyof IAppData;

export type UpdateAppDataFn = <K extends IAppDataField>(
  field: K,
  value: IAppData[K],
) => void;

export interface IGameAppBattleState {
  battleMode: boolean;
  setBattleMode: Dispatch<SetStateAction<boolean>>;
  enemies: IEnemy[];
  setEnemies: Dispatch<SetStateAction<IEnemy[]>>;
  minimizedEnemies: IMinimizedMap;
  setMinimizedEnemies: Dispatch<SetStateAction<IMinimizedMap>>;
}

export interface IStoredAppConfig extends IAppConfig {
  theme: string;
  fullscreenOnStartup: boolean;
  startupView: 'party-minimized' | 'last' | string;
  uiScale: string;
  defaultRollMode: 'auto' | 'manual' | string;
}
