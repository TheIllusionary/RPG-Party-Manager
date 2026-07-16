import mongoose from 'mongoose'

/**
 * Compendium entry schema — stores pre-processed game data from 5e.tools ETL
 * that the desktop client syncs locally. One collection per entity type.
 */

const compendiumSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ['spell', 'item', 'monster', 'class', 'subclass', 'race'],
      index: true,
    },
    entityKey: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    // The full pre-processed JSON document (MasterSpell, MasterItem, etc.)
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'compendium',
  },
)

compendiumSchema.index({ entityType: 1, entityKey: 1 })

export default mongoose.model('Compendium', compendiumSchema)
