import Dexie, { type EntityTable } from 'dexie'
import type {
  IPlayer,
  IMonster,
  IBuff,
  ISubclass,
  IInventoryItem,
} from '../types'
import type { Actor } from '../types/domain'

export interface IBaseRecord {
  id: string
  campaignId: string
  updatedAt: number
  isDeleted?: boolean // Tombstone flag for soft-deletes
}

export interface PlayerRecord extends IPlayer, IBaseRecord {}
export interface MonsterRecord extends IMonster, IBaseRecord {}
export interface BuffRecord extends IBuff, IBaseRecord {}
export interface SubclassRecord extends ISubclass, IBaseRecord {}
export interface ItemRecord extends IInventoryItem, IBaseRecord {}

/** Unified actor record for Phase 2+ persistence (coexists with legacy PlayerRecord / MonsterRecord). */
export interface ActorRecord extends Omit<Actor, 'updatedAt'>, IBaseRecord {}

export interface CampaignStateRecord extends IBaseRecord {
  type:
    | 'equipment'
    | 'notebook'
    | 'training'
    | 'chaos'
    | 'logicBlocks'
    | 'bestiaryFavorites'
    | 'config'
    | 'battleNotes'
    | 'enemies'
    | 'minimizedEnemies'
    | 'battleMode'
    | 'vttSettings'
    | 'globalSettings'
  data: any
}

const db = new Dexie('RPGPartyManagerDB') as Dexie & {
  players: EntityTable<PlayerRecord, 'id'>
  library: EntityTable<MonsterRecord, 'id'>
  buffs: EntityTable<BuffRecord, 'id'>
  subclasses: EntityTable<SubclassRecord, 'id'>
  items: EntityTable<ItemRecord, 'id'>
  campaignState: EntityTable<CampaignStateRecord, 'id'>
  actors: EntityTable<ActorRecord, 'id'>
}

// V1 Schema: Indexing on ID, campaignId, and updatedAt for efficient sync querying
db.version(1).stores({
  players: 'id, campaignId, updatedAt, isDeleted',
  library: 'id, campaignId, updatedAt, isDeleted',
  buffs: 'id, campaignId, updatedAt, isDeleted',
  subclasses: 'id, campaignId, updatedAt, isDeleted',
  items: 'id, campaignId, updatedAt, isDeleted',
  campaignState: 'id, campaignId, type, updatedAt, isDeleted',
})

db.version(2)
  .stores({
    // No new indexes, just a data migration
  })
  .upgrade(async tx => {
    // Migrate standalone items
    const items = await tx.table('items').toArray()
    for (const item of items) {
      if (!item.category) item.category = 'gear'
      if (!item.rarity) item.rarity = 'Common'
      if (!item.equipState) item.equipState = 'carried'
      if (item.requiresAttunement === undefined) item.requiresAttunement = false
      if (item.isAttuned === undefined) item.isAttuned = false

      // Migrate flat modifiers to modifiers.stats
      if (
        item.modifiers &&
        !item.modifiers.stats &&
        Object.keys(item.modifiers).length > 0
      ) {
        const flatMods = { ...item.modifiers }
        item.modifiers = { stats: flatMods }
      }
      await tx.table('items').put(item)
    }

    // Migrate items embedded in campaignState (equipment)
    const equipmentStates = await tx
      .table('campaignState')
      .where('type')
      .equals('equipment')
      .toArray()
    for (const state of equipmentStates) {
      if (state.data && state.data.inventories) {
        for (const sectionId in state.data.inventories) {
          const inventory = state.data.inventories[sectionId]
          for (const item of inventory) {
            if (!item.category) item.category = 'gear'
            if (!item.rarity) item.rarity = 'Common'
            if (!item.equipState) item.equipState = 'carried'
            if (item.requiresAttunement === undefined)
              item.requiresAttunement = false
            if (item.isAttuned === undefined) item.isAttuned = false

            if (
              item.modifiers &&
              !item.modifiers.stats &&
              Object.keys(item.modifiers).length > 0
            ) {
              const flatMods = { ...item.modifiers }
              item.modifiers = { stats: flatMods }
            }
          }
        }
        await tx.table('campaignState').put(state)
      }
    }
  })

// V3: Add unified actors table for Actor-based persistence (Phase 2 migration)
db.version(3).stores({
  actors: 'id, campaignId, kind, updatedAt, isDeleted',
})

export default db
