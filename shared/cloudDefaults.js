/**
 * Shared cloud defaults — used when no .env / process.env override is set.
 * API_URL points to the Render web service (see render.yaml).
 *
 * MONGO_URI / JWT_SECRET: set in Render env vars (production) or api/.env (local).
 * Prefer a dedicated Atlas user with readWrite only on rpg_party_manager.
 */
export const CLOUD_DEFAULTS = {
  API_URL: 'https://rpg-party-manager-api.onrender.com',
  JWT_SECRET: 'CHANGE_ME_JWT_SECRET',
  PORT: '3001',
};
