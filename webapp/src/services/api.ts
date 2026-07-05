import { DEFAULT_API_URL } from '../config/cloudDefaults';
import { clearAuthTokenFromSync, pushAuthTokenToSync } from './syncBridge';
import type {
  IAuthResponse,
  ICampaignDataDto,
  ICampaignListItem,
  ICreateCampaignPayload,
  ICreateCampaignResponse,
  IRequestOptions,
  IUpdateCampaignPayload,
} from '../types/api';
import type { ICampaign, IUser } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
const TOKEN_KEY = 'partyManagerAuthToken';
const USER_KEY = 'partyManagerAuthUser';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: IRequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const hint = API_BASE.includes('localhost')
      ? 'Is the API running?'
      : 'The cloud API may be waking up (Render free tier) — wait ~30s and try again.';
    throw new Error(`Network error (${API_BASE}): ${message}. ${hint}`);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `API request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export function getStoredUser(): IUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IUser;
  } catch {
    return null;
  }
}

export function setAuthSession({ token, user }: IAuthResponse): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  pushAuthTokenToSync(token);
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('partyManagerLastCampaignId');
  clearAuthTokenFromSync();
}

export function register(username: string, password: string): Promise<IAuthResponse> {
  return request<IAuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function login(username: string, password: string): Promise<IAuthResponse> {
  return request<IAuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function fetchMe(): Promise<IUser> {
  return request<IUser>('/auth/me');
}

export function listCampaigns(): Promise<ICampaignListItem[]> {
  return request<ICampaignListItem[]>('/campaigns');
}

export function createCampaign(
  payload: ICreateCampaignPayload = {},
): Promise<ICreateCampaignResponse> {
  return request<ICreateCampaignResponse>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCampaign(
  campaignId: string,
  payload: IUpdateCampaignPayload = {},
): Promise<ICampaign> {
  return request<ICampaign>(`/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteCampaign(campaignId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/campaigns/${campaignId}`, {
    method: 'DELETE',
  });
}

export function getCampaignData(campaignId: string): Promise<ICampaignDataDto> {
  return request<ICampaignDataDto>(`/campaigns/${campaignId}/data`);
}

export function updateCampaignData(
  campaignId: string,
  data: ICampaignDataDto,
): Promise<ICampaignDataDto> {
  return request<ICampaignDataDto>(`/campaigns/${campaignId}/data`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
