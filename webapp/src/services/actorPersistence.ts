import type { Actor } from '../types/domain';
import type { DocumentId } from '../types/domain';

import {
  DOCUMENT_COLLECTIONS,
  type DocumentRecord,
  type IDocumentStore,
} from './persistence';
import type { PlayerViewService } from './PlayerViewService';

/**
 * Persists an actor to the local JSON document store and triggers Player View broadcast.
 * Call this instead of `documentStore.put` directly when actor changes should reach clients.
 */
export async function persistActorAndBroadcast(
  store: IDocumentStore,
  playerViewService: PlayerViewService,
  actor: Actor,
): Promise<void> {
  const document: Actor = {
    ...actor,
    updatedAt: new Date().toISOString(),
  };

  await store.put(DOCUMENT_COLLECTIONS.actors, document as DocumentRecord & Actor);
  playerViewService.onActorChanged(document);
}

export async function deleteActorAndBroadcast(
  store: IDocumentStore,
  playerViewService: PlayerViewService,
  actorId: DocumentId,
  remainingActors: Actor[],
): Promise<boolean> {
  const deleted = await store.delete(DOCUMENT_COLLECTIONS.actors, actorId);
  if (deleted) {
    playerViewService.onActorsChanged(remainingActors);
  }
  return deleted;
}
