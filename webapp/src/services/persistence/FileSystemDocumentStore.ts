import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { DocumentId } from '../../types/domain';
import type {
  DocumentCollection,
  DocumentFilter,
  DocumentRecord,
  DocumentStoreOptions,
  IDocumentStore,
} from './IDocumentStore';

function collectionDir(basePath: string, collection: DocumentCollection): string {
  return path.join(basePath, collection);
}

function documentPath(
  basePath: string,
  collection: DocumentCollection,
  id: DocumentId,
): string {
  const safeId = id.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(collectionDir(basePath, collection), `${safeId}.json`);
}

/**
 * File-system document store for Electron `userData` (single-tenant).
 * Each document is one JSON file — no SQLite, no relational schema.
 */
export class FileSystemDocumentStore implements IDocumentStore {
  readonly basePath: string;
  private readonly prettyPrint: boolean;

  constructor(options: DocumentStoreOptions) {
    this.basePath = options.basePath;
    this.prettyPrint = options.prettyPrint ?? process.env.NODE_ENV !== 'production';
  }

  private async ensureCollection(collection: DocumentCollection): Promise<void> {
    await mkdir(collectionDir(this.basePath, collection), { recursive: true });
  }

  async get<T extends DocumentRecord>(
    collection: DocumentCollection,
    id: DocumentId,
  ): Promise<T | null> {
    const filePath = documentPath(this.basePath, collection, id);
    try {
      const raw = await readFile(filePath, 'utf8');
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async put<T extends DocumentRecord>(
    collection: DocumentCollection,
    document: T,
  ): Promise<void> {
    await this.ensureCollection(collection);
    const filePath = documentPath(this.basePath, collection, document.id);
    const json = this.prettyPrint
      ? JSON.stringify(document, null, 2)
      : JSON.stringify(document);
    await writeFile(filePath, `${json}\n`, 'utf8');
  }

  async delete(collection: DocumentCollection, id: DocumentId): Promise<boolean> {
    const filePath = documentPath(this.basePath, collection, id);
    try {
      await unlink(filePath);
      return true;
    } catch (err: unknown) {
      if (isNodeError(err) && err.code === 'ENOENT') return false;
      throw err;
    }
  }

  async list(collection: DocumentCollection): Promise<DocumentId[]> {
    await this.ensureCollection(collection);
    const dir = collectionDir(this.basePath, collection);
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.json'))
      .map((e) => e.name.replace(/\.json$/, ''));
  }

  async query<T extends DocumentRecord>(
    collection: DocumentCollection,
    filter?: DocumentFilter<T>,
  ): Promise<T[]> {
    const ids = await this.list(collection);
    const results: T[] = [];
    for (const id of ids) {
      const doc = await this.get<T>(collection, id);
      if (!doc) continue;
      if (!filter || filter(doc)) results.push(doc);
    }
    return results;
  }

  async update<T extends DocumentRecord>(
    collection: DocumentCollection,
    id: DocumentId,
    mutator: (current: T | null) => T,
  ): Promise<T> {
    const current = await this.get<T>(collection, id);
    const next = mutator(current);
    await this.put(collection, next);
    return next;
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return typeof err === 'object' && err !== null && 'code' in err;
}
