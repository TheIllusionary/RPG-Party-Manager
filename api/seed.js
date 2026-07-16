/**
 * Cloud Compendium Seed Script
 *
 * Uploads locally-processed ETL data (from seedMasterCompendium.ts output)
 * into the MongoDB Atlas Compendium collection for cloud sync.
 *
 * Prerequisites:
 *   1. Run `npm run seed:master-compendium --prefix webapp` first to populate
 *      the local FileSystemDocumentStore (~/AppData/Roaming/party-manager/documents/).
 *   2. Ensure MONGO_URI is set in api/.env pointing to your Atlas cluster.
 *
 * Usage:
 *   cd api && node seed.js
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Compendium from './models/Compendium.js'

dotenv.config({ override: true })

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const __filename = fileURLToPath(import.meta.url)

// Resolve the webapp root and user data store path
const WEBAPP_ROOT = resolve(__dirname, '..', 'webapp')
const APP_DATA_BASE = resolve(
  process.env.APPDATA ||
    resolve(
      process.env.HOME || process.env.USERPROFILE || '/tmp',
      'AppData',
      'Roaming',
    ),
  'party-manager',
  'documents',
)

const COLLECTIONS = [
  { dir: 'compendium-spells', entityType: 'spell' },
  { dir: 'compendium-items', entityType: 'item' },
  { dir: 'compendium-monsters', entityType: 'monster' },
  { dir: 'compendium-classes', entityType: 'class' },
  { dir: 'compendium-subclasses', entityType: 'subclass' },
  { dir: 'compendium-races', entityType: 'race' },
]

async function seedCollection(collectionDir, entityType) {
  const dirPath = resolve(APP_DATA_BASE, collectionDir)
  if (!existsSync(dirPath)) {
    console.log(
      `[Seed] Skipping ${entityType} — directory not found: ${dirPath}`,
    )
    console.log(
      `[Seed]   → Run \`npm run seed:master-compendium --prefix webapp\` first.`,
    )
    return 0
  }

  const files = readdirSync(dirPath, { withFileTypes: true }).filter(
    f => f.isFile() && f.name.endsWith('.json'),
  )

  if (files.length === 0) {
    console.log(`[Seed] Skipping ${entityType} — no JSON files found.`)
    return 0
  }

  console.log(
    `[Seed] Uploading ${files.length} ${entityType} entries to MongoDB...`,
  )

  let written = 0
  for (const file of files) {
    try {
      const raw = readFileSync(resolve(dirPath, file.name), 'utf8')
      const entry = JSON.parse(raw)

      await Compendium.findOneAndUpdate(
        { entityType, entityKey: entry.entityKey || entry.id },
        {
          $set: {
            entityType,
            entityKey: entry.entityKey || entry.id,
            data: entry,
          },
        },
        { upsert: true, new: true },
      )

      written += 1
      if (written % 100 === 0) {
        console.log(`  ... ${written}/${files.length} ${entityType}`)
      }
    } catch (err) {
      console.warn(`  [Warning] Failed to upload ${file.name}:`, err.message)
    }
  }

  console.log(`  → Uploaded ${written} ${entityType}`)
  return written
}

async function main() {
  console.log('[Seed] Connecting to MongoDB...')

  if (!process.env.MONGO_URI) {
    console.error(
      'MONGO_URI not set. Create api/.env with your Atlas connection string.',
    )
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI)

  const { host, name } = mongoose.connection
  console.log(`[Seed] Connected to ${host}/${name}`)

  let total = 0
  for (const { dir, entityType } of COLLECTIONS) {
    total += await seedCollection(dir, entityType)
  }

  console.log(`\n[Seed] Done. Uploaded ${total} total entries.`)
  await mongoose.disconnect()
}

main().catch(err => {
  console.error('[Seed] Fatal error:', err)
  process.exit(1)
})
