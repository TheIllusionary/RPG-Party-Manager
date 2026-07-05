import { Router } from 'express';
import mongoose from 'mongoose';
import Campaign from '../models/Campaign.js';
import CampaignSync from '../models/CampaignSync.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

function toClientDocument(doc) {
  return {
    id: doc.campaignId.toString(),
    name: doc.name,
    updatedAt: doc.clientUpdatedAt.toISOString(),
    data: doc.data,
    logicBlocks: doc.logicBlocks ?? undefined,
  };
}

function parseClientUpdatedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

async function findOwnedCampaign(campaignId, userId) {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) return null;
  return Campaign.findOne({ _id: campaignId, userId });
}

// GET /sync?campaignId=...
router.get('/', async (req, res) => {
  try {
    const { campaignId } = req.query;
    if (!campaignId || typeof campaignId !== 'string') {
      return res.status(400).json({ error: 'campaignId query parameter is required' });
    }

    const owned = await findOwnedCampaign(campaignId, req.user.id);
    if (!owned) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const syncDoc = await CampaignSync.findOne({
      userId: req.user.id,
      campaignId,
    });

    if (!syncDoc) {
      return res.status(404).json({ error: 'No sync snapshot for this campaign' });
    }

    return res.json(toClientDocument(syncDoc));
  } catch (err) {
    console.error('GET /sync error:', err);
    return res.status(500).json({ error: 'Failed to load sync snapshot' });
  }
});

// POST /sync — push full campaign document (offline-first)
router.post('/', async (req, res) => {
  try {
    const { id, name, updatedAt, data, logicBlocks } = req.body ?? {};

    if (!id || !name || !updatedAt || data === undefined) {
      return res.status(400).json({
        error: 'Body must include id, name, updatedAt, and data',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid campaign id' });
    }

    const clientUpdatedAt = parseClientUpdatedAt(updatedAt);
    if (!clientUpdatedAt) {
      return res.status(400).json({ error: 'Invalid updatedAt timestamp' });
    }

    const owned = await findOwnedCampaign(id, req.user.id);
    if (!owned) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const existing = await CampaignSync.findOne({
      userId: req.user.id,
      campaignId: id,
    });

    if (existing && existing.clientUpdatedAt > clientUpdatedAt) {
      return res.status(409).json({
        error: 'Conflict',
        document: toClientDocument(existing),
      });
    }

    const syncDoc = await CampaignSync.findOneAndUpdate(
      { userId: req.user.id, campaignId: id },
      {
        userId: req.user.id,
        campaignId: id,
        name: String(name).trim(),
        data,
        ...(logicBlocks !== undefined ? { logicBlocks } : {}),
        clientUpdatedAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (owned.name !== name) {
      owned.name = String(name).trim();
      await owned.save();
    }

    return res.json(toClientDocument(syncDoc));
  } catch (err) {
    console.error('POST /sync error:', err);
    return res.status(500).json({ error: 'Failed to save sync snapshot' });
  }
});

export default router;
