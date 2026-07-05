import type { DocumentId } from '../../types/domain';

/** Named document collections (maps to subfolders on disk). */
export const DOCUMENT_COLLECTIONS = {
  campaigns: 'campaigns',
  encounters: 'encounters',
  actors: 'actors',
  logicBlocks: 'logic-blocks',
  compendiumItems: 'compendium-items',
  compendiumSpells: 'compendium-spells',
  compendiumMonsters: 'compendium-monsters',
  compendiumClasses: 'compendium-classes',
  compendiumSubclasses: 'compendium-subclasses',
  compendiumRaces: 'compendium-races',
  syncQueue: 'sync-queue',
} as const;

export type DocumentCollection =
  (typeof DOCUMENT_COLLECTIONS)[keyof typeof DOCUMENT_COLLECTIONS];

export interface DocumentRecord {
  id: DocumentId;
  [key: string]: unknown;
}

export type DocumentFilter<T extends DocumentRecord = DocumentRecord> = (
  doc: T,
) => boolean;

export interface IDocumentStore {
  readonly basePath: string;

  get<T extends DocumentRecord>(
    collection: DocumentCollection,
    id: DocumentId,
  ): Promise<T | null>;

  put<T extends DocumentRecord>(
    collection: DocumentCollection,
    document: T,
  ): Promise<void>;

  delete(collection: DocumentCollection, id: DocumentId): Promise<boolean>;

  list(collection: DocumentCollection): Promise<DocumentId[]>;

  query<T extends DocumentRecord>(
    collection: DocumentCollection,
    filter?: DocumentFilter<T>,
  ): Promise<T[]>;

  /** Atomic read-modify-write for a single document. */
  update<T extends DocumentRecord>(
    collection: DocumentCollection,
    id: DocumentId,
    mutator: (current: T | null) => T,
  ): Promise<T>;
}

export interface DocumentStoreOptions {
  basePath: string;
  /** Pretty-print JSON files (default: true in dev). */
  prettyPrint?: boolean;
}
