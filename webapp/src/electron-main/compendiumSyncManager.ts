import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { net } from 'electron'
import { getDesktopInfrastructure } from './infrastructure'
import { DOCUMENT_COLLECTIONS } from '../services/persistence/IDocumentStore'

const ENTITY_TYPES = [
  'spells',
  'items',
  'monsters',
  'classes',
  'subclasses',
  'races',
] as const

const COLLECTION_MAP: Record<string, string> = {
  spells: DOCUMENT_COLLECTIONS.compendiumSpells,
  items: DOCUMENT_COLLECTIONS.compendiumItems,
  monsters: DOCUMENT_COLLECTIONS.compendiumMonsters,
  classes: DOCUMENT_COLLECTIONS.compendiumClasses,
  subclasses: DOCUMENT_COLLECTIONS.compendiumSubclasses,
  races: DOCUMENT_COLLECTIONS.compendiumRaces,
}

const API_ENTITY_MAP: Record<string, string> = {
  spells: 'spell',
  items: 'item',
  monsters: 'monster',
  classes: 'class',
  subclasses: 'subclass',
  races: 'race',
}

const DEFAULT_API_URL = 'https://rpg-party-manager-api.onrender.com'

function getApiUrl(): string {
  const configured =
    process.env.API_URL || process.env.VITE_API_URL || DEFAULT_API_URL
  return configured.replace(/\/$/, '')
}

async function resolveAuthToken(): Promise<string | null> {
  const infra = getDesktopInfrastructure()
  if (!infra) return null

  const userDataPath = infra.documentStore.basePath.replace(/\/documents$/, '')
  try {
    const token = await readFile(
      path.join(userDataPath, 'sync-auth.token'),
      'utf8',
    )
    return token.trim() || null
  } catch {
    return null
  }
}

export class CompendiumSyncManager {
  /**
   * Initializes the Compendium. If the local compendium is empty,
   * it will attempt to fetch from the MongoDB API and write locally.
   */
  public async initializeCompendium(): Promise<void> {
    const infra = getDesktopInfrastructure()
    if (!infra) return

    try {
      const spellIds = await infra.documentStore.list(
        DOCUMENT_COLLECTIONS.compendiumSpells,
      )
      const itemIds = await infra.documentStore.list(
        DOCUMENT_COLLECTIONS.compendiumItems,
      )

      if (spellIds.length === 0 && itemIds.length === 0) {
        console.log(
          '[CompendiumSync] Local master data empty. Downloading from Cloud API...',
        )

        if (!net.isOnline()) {
          console.warn('[CompendiumSync] Cannot download master data: Offline.')
          return
        }

        await this.downloadMasterData(infra.documentStore)
      } else {
        console.log(
          `[CompendiumSync] Master data present (${spellIds.length} spells, ${itemIds.length} items). Skipping download.`,
        )
      }
    } catch (err) {
      console.error('[CompendiumSync] Failed to initialize:', err)
    }
  }

  /**
   * Downloads compendium data from the cloud API for all entity types
   * and persists each entity to the local FileSystemDocumentStore.
   */
  private async downloadMasterData(store: any): Promise<void> {
    const token = await resolveAuthToken()
    if (!token) {
      console.warn(
        '[CompendiumSync] Skipping download — no auth token available. Log in first.',
      )
      return
    }

    const apiUrl = getApiUrl()

    for (const entityType of ENTITY_TYPES) {
      const apiEntity = API_ENTITY_MAP[entityType]
      const collection = COLLECTION_MAP[entityType]

      console.log(
        `[CompendiumSync] Fetching ${entityType} from ${apiUrl}/compendium/${apiEntity}...`,
      )

      try {
        const response = await fetch(`${apiUrl}/compendium/${apiEntity}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}))
          console.error(
            `[CompendiumSync] Failed to fetch ${entityType}: ${response.status} ${errBody.error || ''}`,
          )
          continue
        }

        const data = await response.json()
        if (!Array.isArray(data)) {
          console.warn(
            `[CompendiumSync] Unexpected response for ${entityType}:`,
            typeof data,
          )
          continue
        }

        let written = 0
        for (const entity of data) {
          const id = entity.entityKey || entity.id
          if (!id) {
            console.warn(
              `[CompendiumSync] Skipping ${entityType} entry without id/entityKey`,
            )
            continue
          }
          try {
            await store.put(collection, entity)
            written += 1
          } catch (err: unknown) {
            console.warn(
              `[CompendiumSync] Failed to write ${entityType}/${id}:`,
              err instanceof Error ? err.message : String(err),
            )
          }
        }

        console.log(`[CompendiumSync] Downloaded ${written} ${entityType}`)
      } catch (err: unknown) {
        console.error(
          `[CompendiumSync] Network error fetching ${entityType}:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    }

    console.log('[CompendiumSync] Download complete.')
  }
}
