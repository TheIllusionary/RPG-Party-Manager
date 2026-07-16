import { clearAuthTokenFromSync, pushAuthTokenToSync } from './syncBridge'
import type {
  IAuthResponse,
  ICampaignDataDto,
  ICampaignListItem,
  ICreateCampaignPayload,
  ICreateCampaignResponse,
  IRequestOptions,
  IUpdateCampaignPayload,
} from '../types/api'
import type { ICampaign, IUser } from '../types'
import db from './db'

const getApiBase = () => {
  if (typeof process !== 'undefined' && process.env?.VITE_API_URL) {
    return process.env.VITE_API_URL
  }
  try {
    const metaEnv = new Function('return import.meta.env')()
    if (metaEnv?.VITE_API_URL) {
      return metaEnv.VITE_API_URL
    }
  } catch {
    // Ignore
  }
  return 'https://rpg-party-manager-api.onrender.com'
}

const API_BASE = getApiBase()

let memoryToken: string | null = null
let memoryUser: IUser | null = null
let memoryLastCampaignId: string | null = null

export async function bootstrapPersistentState(): Promise<void> {
  try {
    const [authSession, lastCampaign] = await Promise.all([
      db.campaignState.get('global_auth_session'),
      db.campaignState.get('global_last_campaign_id'),
    ])
    if (authSession?.data) {
      memoryToken = authSession.data.token
      memoryUser = authSession.data.user
    }
    if (lastCampaign?.data) {
      memoryLastCampaignId = lastCampaign.data
    }
  } catch (err) {
    console.error('[API] Failed to bootstrap persistent state from Dexie:', err)
  }
}

export function getStoredToken(): string | null {
  return memoryToken
}

export function getStoredUser(): IUser | null {
  return memoryUser
}

export function getLastCampaignId(): string | null {
  return memoryLastCampaignId
}

export function setLastCampaignId(campaignId: string): void {
  memoryLastCampaignId = campaignId
  db.campaignState
    .put({
      id: 'global_last_campaign_id',
      campaignId: 'global',
      type: 'globalSettings',
      data: campaignId,
      updatedAt: Date.now(),
    })
    .catch(err => console.error('[API] Failed to save last campaign ID:', err))
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function request<T>(
  path: string,
  options: IRequestOptions = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const hint = API_BASE.includes('localhost')
      ? 'Is the API running?'
      : 'The cloud API may be waking up (Render free tier) — wait ~30s and try again.'
    throw new Error(`Network error (${API_BASE}): ${message}. ${hint}`)
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `API request failed (${res.status})`)
  }

  return res.json() as Promise<T>
}

export function getStoredUserSync(): IUser | null {
  return memoryUser
}

export function getStoredUserSyncParsed(): IUser | null {
  return memoryUser
}

export function getStoredUserFromMemory(): IUser | null {
  return memoryUser
}

export function setAuthSession({ token, user }: IAuthResponse): void {
  memoryToken = token
  memoryUser = user
  pushAuthTokenToSync(token)
  db.campaignState
    .put({
      id: 'global_auth_session',
      campaignId: 'global',
      type: 'globalSettings',
      data: { token, user },
      updatedAt: Date.now(),
    })
    .catch(err =>
      console.error('[API] Failed to save auth session to Dexie:', err),
    )
}

export function clearAuthSession(): void {
  memoryToken = null
  memoryUser = null
  memoryLastCampaignId = null
  clearAuthTokenFromSync()
  db.campaignState
    .delete('global_auth_session')
    .catch(err =>
      console.error('[API] Failed to delete auth session from Dexie:', err),
    )
  db.campaignState
    .delete('global_last_campaign_id')
    .catch(err =>
      console.error('[API] Failed to delete last campaign ID from Dexie:', err),
    )
}

export function register(
  username: string,
  password: string,
): Promise<IAuthResponse> {
  return request<IAuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function login(
  username: string,
  password: string,
): Promise<IAuthResponse> {
  return request<IAuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function fetchMe(): Promise<IUser> {
  return request<IUser>('/auth/me')
}

export function listCampaigns(): Promise<ICampaignListItem[]> {
  return request<ICampaignListItem[]>('/campaigns')
}

export function createCampaign(
  payload: ICreateCampaignPayload = {},
): Promise<ICreateCampaignResponse> {
  return request<ICreateCampaignResponse>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCampaign(
  campaignId: string,
  payload: IUpdateCampaignPayload = {},
): Promise<ICampaign> {
  return request<ICampaign>(`/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteCampaign(campaignId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/campaigns/${campaignId}`, {
    method: 'DELETE',
  })
}

export function getCampaignData(campaignId: string): Promise<ICampaignDataDto> {
  return request<ICampaignDataDto>(`/campaigns/${campaignId}/data`)
}

export function updateCampaignData(
  campaignId: string,
  data: ICampaignDataDto,
): Promise<ICampaignDataDto> {
  return request<ICampaignDataDto>(`/campaigns/${campaignId}/data`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// ===== COMPENDIUM ENDPOINTS =====
export function fetchCompendiumSpells(): Promise<any[]> {
  return request<any[]>('/compendium/spell')
}

export function fetchCompendiumItems(): Promise<any[]> {
  return request<any[]>('/compendium/item')
}

export function fetchCompendiumMonsters(): Promise<any[]> {
  return request<any[]>('/compendium/monster')
}

export function fetchCompendiumClasses(): Promise<any[]> {
  return request<any[]>('/compendium/class')
}

export function fetchCompendiumSubclasses(): Promise<any[]> {
  return request<any[]>('/compendium/subclass')
}

export function fetchCompendiumRaces(): Promise<any[]> {
  return request<any[]>('/compendium/race')
}
