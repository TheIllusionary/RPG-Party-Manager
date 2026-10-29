/**
 * Shared cloud defaults — used when no .env / process.env override is set.
 * API_URL points to the Render web service (see render.yaml).
 *
 * Secrets (MONGO_URI, JWT_SECRET) are never committed. Provide them via
 * Render env vars (production) or api/.env (local).
 */
export const CLOUD_DEFAULTS = {
  API_URL: 'https://rpg-party-manager-api.onrender.com',
  PORT: '3001',
};
