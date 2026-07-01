/**
 * Database seed — triggers lazy creation of the MongoDB database and collections.
 */
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import Campaign from './models/Campaign.js';
import CampaignData from './models/CampaignData.js';
import User from './models/User.js';
import { DEFAULT_DATA } from './data/defaultData.js';
import { connectDB, disconnectDB, getMongoUri, maskMongoUri } from './config/db.js';

dotenv.config({ override: true });

const SEED_USER = { username: 'dm', password: 'dungeon123' };

async function seed() {
  console.log('Starting seed...');
  console.log(`  URI: ${maskMongoUri(getMongoUri())}`);

  await connectDB();

  await CampaignData.deleteMany({});
  await Campaign.deleteMany({});
  await User.deleteMany({});
  console.log('Cleared users, campaigns, and campaign data');

  const passwordHash = await bcrypt.hash(SEED_USER.password, 10);
  const user = await User.create({
    username: SEED_USER.username,
    passwordHash,
  });
  console.log(`Created user: ${user.username} (password: ${SEED_USER.password})`);

  const campaign = await Campaign.create({
    userId: user._id,
    name: 'Campanha Padrão',
    description: 'Campanha padrão criada pelo script de seed',
    lastAccessed: new Date(),
  });
  console.log(`Created campaign: "${campaign.name}" (${campaign._id})`);

  await CampaignData.create({
    campaignId: campaign._id,
    ...DEFAULT_DATA,
  });
  console.log('Created CampaignData with DEFAULT_DATA');

  console.log('Seed complete — login with dm / dungeon123');
  await disconnectDB();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
