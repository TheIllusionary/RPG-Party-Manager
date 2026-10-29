import { Router } from 'express'
import mongoose from 'mongoose'
import Compendium from '../models/Compendium.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const ENTITY_TYPES = ['spell', 'item', 'monster', 'class', 'subclass', 'race']

/**
 * Maps API entity type (singular) to the per-type MongoDB collection name.
 * Data is stored in separate collections: compendium_spells, compendium_monsters, etc.
 */
const COLLECTION_MAP = {
  spell: 'compendium_spells',
  item: 'compendium_items',
  monster: 'compendium_monsters',
  class: 'compendium_classes',
  subclass: 'compendium_subclasses',
  race: 'compendium_races',
}

function toResponse(doc) {
  // Per-type collections store the full entry as the document itself,
  // so we return it directly with a guaranteed id field.
  return { ...doc, id: doc.id || doc.entityKey || doc._id?.toString() }
}

// GET /compendium/:entityType — fetch all entries of a type
router.get('/:entityType', async (req, res) => {
  try {
    const { entityType } = req.params
    if (!ENTITY_TYPES.includes(entityType)) {
      return res
        .status(400)
        .json({ error: `Invalid entity type. Use: ${ENTITY_TYPES.join(', ')}` })
    }

    const collectionName = COLLECTION_MAP[entityType]
    // Query the per-type collection directly (e.g. compendium_spells)
    // Fall back to the generic 'compendium' collection if the per-type one doesn't exist
    const db = mongoose.connection.db
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' })
    }

    let docs = []
    try {
      const collection = db.collection(collectionName)
      docs = await collection.find({}).toArray()
    } catch {
      // Collection might not exist — try the generic compendium collection as fallback
      console.warn(
        `Collection ${collectionName} not found, falling back to compendium collection`,
      )
      docs = await Compendium.find({ entityType }).lean()
    }

    res.json(docs.map(toResponse))
  } catch (err) {
    console.error(`GET /compendium/${req.params.entityType} error:`, err)
    res.status(500).json({ error: 'Failed to fetch compendium data' })
  }
})

// Seed endpoint: POST /compendium/seed — bulk upsert compendium entries
router.post('/seed', async (req, res) => {
  try {
    const { entityType, entries } = req.body || {}
    if (!entityType || !ENTITY_TYPES.includes(entityType)) {
      return res
        .status(400)
        .json({ error: `entityType required. Use: ${ENTITY_TYPES.join(', ')}` })
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array required' })
    }

    const collectionName = COLLECTION_MAP[entityType]
    const db = mongoose.connection.db
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' })
    }

    const collection = db.collection(collectionName)
    const bulkOps = entries.map(entry => ({
      updateOne: {
        filter: { entityKey: entry.entityKey || entry.id },
        update: {
          $set: {
            entityKey: entry.entityKey || entry.id,
            ...entry,
          },
        },
        upsert: true,
      },
    }))

    const result = await collection.bulkWrite(bulkOps)
    res.json({
      ok: true,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    })
  } catch (err) {
    console.error('POST /compendium/seed error:', err)
    res.status(500).json({ error: 'Failed to seed compendium data' })
  }
})

export default router
