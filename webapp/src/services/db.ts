import Dexie, { type EntityTable } from 'dexie';
import type { IPlayer, IMonster, IBuff, ISubclass, IInventoryItem } from '../types';

export interface IBaseRecord {
    id: string;
    campaignId: string;
    updatedAt: number;
    isDeleted?: boolean; // Tombstone flag for soft-deletes
}

export interface PlayerRecord extends IPlayer, IBaseRecord {}
export interface MonsterRecord extends IMonster, IBaseRecord {}
export interface BuffRecord extends IBuff, IBaseRecord {}
export interface SubclassRecord extends ISubclass, IBaseRecord {}
export interface ItemRecord extends IInventoryItem, IBaseRecord {}

export interface CampaignStateRecord extends IBaseRecord {
    type: 'equipment' | 'notebook' | 'training' | 'chaos' | 'logicBlocks' | 'bestiaryFavorites' | 'config' | 'battleNotes' | 'enemies' | 'minimizedEnemies' | 'battleMode' | 'vttSettings' | 'globalSettings';
    data: any; 
}

const db = new Dexie('RPGPartyManagerDB') as Dexie & {
  players: EntityTable<PlayerRecord, 'id'>;
  library: EntityTable<MonsterRecord, 'id'>;
  buffs: EntityTable<BuffRecord, 'id'>;
  subclasses: EntityTable<SubclassRecord, 'id'>;
  items: EntityTable<ItemRecord, 'id'>;
  campaignState: EntityTable<CampaignStateRecord, 'id'>;
};

// V1 Schema: Indexing on ID, campaignId, and updatedAt for efficient sync querying
db.version(1).stores({
  players: 'id, campaignId, updatedAt, isDeleted',
  library: 'id, campaignId, updatedAt, isDeleted',
  buffs: 'id, campaignId, updatedAt, isDeleted',
  subclasses: 'id, campaignId, updatedAt, isDeleted',
  items: 'id, campaignId, updatedAt, isDeleted',
  campaignState: 'id, campaignId, type, updatedAt, isDeleted'
});

export default db;
