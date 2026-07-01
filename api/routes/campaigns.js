import { Router } from 'express';
import mongoose from 'mongoose';
import Campaign from '../models/Campaign.js';
import CampaignData from '../models/CampaignData.js';
import { DEFAULT_DATA } from '../data/defaultData.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

const GAME_STATE_FIELDS = [
  'players',
  'equipment',
  'library',
  'encounters',
  'training',
  'chaos',
  'notebook',
  'bestiaryReview',
  'buffsDatabase',
  'subclasses',
];

function pickGameState(body) {
  const state = {};
  for (const field of GAME_STATE_FIELDS) {
    if (body[field] !== undefined) {
      state[field] = body[field];
    }
  }
  return state;
}

function toGameStateResponse(doc) {
  const obj = doc.toObject();
  const state = {};
  for (const field of GAME_STATE_FIELDS) {
    state[field] = obj[field];
  }
  return state;
}

async function findOwnedCampaign(campaignId, userId) {
  if (!mongoose.Types.ObjectId.isValid(campaignId)) return null;
  return Campaign.findOne({ _id: campaignId, userId });
}

// GET /campaigns — list campaigns for the authenticated user
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.user.id })
      .sort({ lastAccessed: -1 })
      .lean();
    res.json(campaigns);
  } catch (err) {
    console.error('GET /campaigns error:', err);
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
});

// POST /campaigns — create campaign + default game state
router.post('/', async (req, res) => {
  try {
    const name = req.body?.name?.trim() || 'Nova Campanha';
    const description = req.body?.description?.trim() || '';

    const campaign = await Campaign.create({
      userId: req.user.id,
      name,
      description,
      lastAccessed: new Date(),
    });

    const campaignData = await CampaignData.create({
      campaignId: campaign._id,
      ...DEFAULT_DATA,
    });

    res.status(201).json({
      campaign: campaign.toObject(),
      data: toGameStateResponse(campaignData),
    });
  } catch (err) {
    console.error('POST /campaigns error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PATCH /campaigns/:id — update campaign metadata (name, description)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await findOwnedCampaign(id, req.user.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (req.body?.name !== undefined) {
      const trimmed = String(req.body.name).trim();
      if (trimmed) campaign.name = trimmed;
    }
    if (req.body?.description !== undefined) {
      campaign.description = String(req.body.description).trim();
    }

    await campaign.save();
    res.json(campaign.toObject());
  } catch (err) {
    console.error('PATCH /campaigns/:id error:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// DELETE /campaigns/:id — remove campaign and its game state
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await findOwnedCampaign(id, req.user.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await CampaignData.deleteOne({ campaignId: id });
    await Campaign.deleteOne({ _id: id });

    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /campaigns/:id error:', err);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// GET /campaigns/:id/data
router.get('/:id/data', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await findOwnedCampaign(id, req.user.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    campaign.lastAccessed = new Date();
    await campaign.save();

    let campaignData = await CampaignData.findOne({ campaignId: id });
    if (!campaignData) {
      campaignData = await CampaignData.create({
        campaignId: id,
        ...DEFAULT_DATA,
      });
    }

    res.json(toGameStateResponse(campaignData));
  } catch (err) {
    console.error('GET /campaigns/:id/data error:', err);
    res.status(500).json({ error: 'Failed to fetch campaign data' });
  }
});

// PUT /campaigns/:id/data
router.put('/:id/data', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await findOwnedCampaign(id, req.user.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const update = pickGameState(req.body);
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No valid game state fields provided' });
    }

    campaign.lastAccessed = new Date();
    await campaign.save();

    const campaignData = await CampaignData.findOneAndUpdate(
      { campaignId: id },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.json(toGameStateResponse(campaignData));
  } catch (err) {
    console.error('PUT /campaigns/:id/data error:', err);
    res.status(500).json({ error: 'Failed to update campaign data' });
  }
});

export default router;
