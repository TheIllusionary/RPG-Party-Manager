import type { IAppData, ICampaign, IUser } from './index';

export interface IApiErrorBody {
  error?: string;
}

export interface IAuthResponse {
  token: string;
  user: IUser;
}

export interface ICampaignListItem extends ICampaign {
  lastAccessed?: string;
  createdAt?: string;
}

export interface ICreateCampaignPayload {
  name?: string;
  description?: string;
}

export interface IUpdateCampaignPayload {
  name?: string;
  description?: string;
}

export interface ICreateCampaignResponse {
  campaign: ICampaign;
}

export type ICampaignDataDto = IAppData;

export interface IRequestOptions extends Omit<RequestInit, 'body'> {
  body?: string;
}
