import Dexie, { type EntityTable } from 'dexie';

export interface CompendiumCacheRecord {
  id: string; // e.g. 'spells', 'items', 'monsters'
  data: any[];
}

const compendiumDb = new Dexie('CompendiumCacheDB') as Dexie & {
  cache: EntityTable<CompendiumCacheRecord, 'id'>;
};

compendiumDb.version(1).stores({
  cache: 'id'
});

export default compendiumDb;
