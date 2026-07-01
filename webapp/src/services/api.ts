// @ts-nocheck — TODO: type API client options and responses
import { DEFAULT_API_URL } from '../config/cloudDefaults';

const API_BASE = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
const TOKEN_KEY = 'partyManagerAuthToken';
const USER_KEY = 'partyManagerAuthUser';

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getAuthHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API request failed (${res.status})`);
  }

  return res.json();
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('partyManagerLastCampaignId');
}

export function register(username, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function fetchMe() {
  return request('/auth/me');
}

export function listCampaigns() {
  return request('/campaigns');
}

export function createCampaign({ name, description } = {}) {
  return request('/campaigns', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export function updateCampaign(campaignId, { name, description } = {}) {
  return request(`/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, description }),
  });
}

export function getCampaignData(campaignId) {
  return request(`/campaigns/${campaignId}/data`);
}

export function updateCampaignData(campaignId, data) {
  return request(`/campaigns/${campaignId}/data`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
