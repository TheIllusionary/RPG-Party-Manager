import type { IUser } from './index';
import type { IAuthResponse } from './api';

export interface IAuthScreenProps {
  onAuthenticated: (session: IAuthResponse) => void;
}

export interface IAuthSession {
  token: string;
  user: IUser;
}
