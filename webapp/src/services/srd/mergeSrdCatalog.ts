import type { IAppData } from '../../types';
import type { ISRDCatalog, ISRDPersistBatch } from '../../types/srd';
import { createEmptySrdCatalog } from '../../types/srd';

function mergeByIndex<T extends { index: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((item) => [item.index, item]));
  for (const item of incoming) {
    map.set(item.index, item);
  }
  return [...map.values()];
}

export function mergeSrdCatalogs(base: ISRDCatalog, incoming: ISRDCatalog): ISRDCatalog {
  return {
    ...base,
    ...incoming,
    importedAt: incoming.importedAt ?? base.importedAt,
    spells: mergeByIndex(base.spells, incoming.spells),
    equipment: mergeByIndex(base.equipment, incoming.equipment),
    subclasses: mergeByIndex(base.subclasses ?? [], incoming.subclasses ?? []),
  };
}

export function mergeSrdCatalogIntoAppData(
  data: IAppData,
  batch: ISRDPersistBatch,
): IAppData {
  const catalog: ISRDCatalog = data.srdCatalog ?? createEmptySrdCatalog();

  return {
    ...data,
    srdCatalog: {
      ...catalog,
      importedAt: new Date().toISOString(),
      spells: mergeByIndex(catalog.spells, batch.spells ?? []),
      equipment: mergeByIndex(catalog.equipment, batch.equipment ?? []),
      subclasses: mergeByIndex(catalog.subclasses ?? [], batch.subclasses ?? []),
    },
  };
}
