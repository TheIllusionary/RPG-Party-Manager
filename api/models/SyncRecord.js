import mongoose from 'mongoose';

const syncRecordSchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  tableName: { type: String, required: true, index: true },
  campaignId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  updatedAt: { type: Number, required: true, index: true },
  isDeleted: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

// Compound index for extremely fast UPSERTs and pulling
syncRecordSchema.index({ userId: 1, campaignId: 1, tableName: 1, id: 1 }, { unique: true });
syncRecordSchema.index({ userId: 1, campaignId: 1, updatedAt: 1 });

export default mongoose.model('SyncRecord', syncRecordSchema);
