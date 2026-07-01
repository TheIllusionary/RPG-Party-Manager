import mongoose from 'mongoose';

const campaignDataSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      unique: true,
      index: true,
    },
    players: { type: mongoose.Schema.Types.Mixed, default: [] },
    equipment: { type: mongoose.Schema.Types.Mixed, default: {} },
    library: { type: mongoose.Schema.Types.Mixed, default: [] },
    encounters: { type: mongoose.Schema.Types.Mixed, default: [] },
    training: { type: mongoose.Schema.Types.Mixed, default: {} },
    chaos: { type: mongoose.Schema.Types.Mixed, default: { customTables: [] } },
    notebook: { type: mongoose.Schema.Types.Mixed, default: { pages: [] } },
    bestiaryReview: { type: mongoose.Schema.Types.Mixed, default: {} },
    buffsDatabase: { type: mongoose.Schema.Types.Mixed, default: [] },
    subclasses: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('CampaignData', campaignDataSchema);
