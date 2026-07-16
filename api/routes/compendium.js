import { Router } from 'express'
import Compendium from '../models/Compendium.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const ENTITY_TYPES = ['spell', 'item', 'monster', 'class', 'subclass', 'race']

function toResponse(doc) {
  return { ...doc.data, id: doc.data.id || doc.entityKey }
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

    const docs = await Compendium.find({ entityType }).lean()
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

    const bulkOps = entries.map(entry => ({
      updateOne: {
        filter: { entityType, entityKey: entry.entityKey || entry.id },
        update: {
          $set: {
            entityType,
            entityKey: entry.entityKey || entry.id,
            data: entry,
          },
        },
        upsert: true,
      },
    }))

    const result = await Compendium.bulkWrite(bulkOps)
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
