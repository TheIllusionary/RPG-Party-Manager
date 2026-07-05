import mongoose from 'mongoose';

const campaignSyncSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    logicBlocks: { type: mongoose.Schema.Types.Mixed },
    clientUpdatedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

campaignSyncSchema.index({ userId: 1, campaignId: 1 }, { unique: true });

export default mongoose.model('CampaignSync', campaignSyncSchema);
