import { CLOUD_DEFAULTS } from '../../shared/cloudDefaults.js';

/**
 * Fills missing process.env keys from shared cloud defaults (never overrides explicit env).
 */
export function applyCloudDefaults() {
  const applied = [];

  if (!process.env.MONGO_URI && !process.env.MONGODB_URI && CLOUD_DEFAULTS.MONGO_URI) {
    process.env.MONGO_URI = CLOUD_DEFAULTS.MONGO_URI;
    applied.push('MONGO_URI');
  }

  if (!process.env.JWT_SECRET && CLOUD_DEFAULTS.JWT_SECRET) {
    process.env.JWT_SECRET = CLOUD_DEFAULTS.JWT_SECRET;
    applied.push('JWT_SECRET');
  }

  if (!process.env.PORT && CLOUD_DEFAULTS.PORT) {
    process.env.PORT = CLOUD_DEFAULTS.PORT;
    applied.push('PORT');
  }

  if (applied.length > 0) {
    console.log(`[config] Using cloud defaults for: ${applied.join(', ')}`);
  }
}

export { CLOUD_DEFAULTS };
