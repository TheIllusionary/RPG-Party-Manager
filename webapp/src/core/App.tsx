import { useState, useEffect } from 'react';
import '../index.css';

import AuthScreen from '../features/auth/AuthScreen';
import CampaignList from '../features/campaign/CampaignList';
import GameApp from './GameApp';
import {
  clearAuthSession,
  fetchMe,
  getStoredUser,
  setAuthSession,
} from '../services/api';
import type { ICampaign, IUser } from '../types';

function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<IUser | null>(() => getStoredUser());
  const [activeCampaign, setActiveCampaign] = useState<ICampaign | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!getStoredUser()) {
        setBooting(false);
        return;
      }

      try {
        const profile = await fetchMe();
        if (!cancelled) {
          setUser(profile);
        }
      } catch {
        clearAuthSession();
        if (!cancelled) {
          setUser(null);
          setActiveCampaign(null);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  const handleAuthenticated = ({ token, user: authUser }: { token: string; user: IUser }) => {
    setAuthSession({ token, user: authUser });
    setUser(authUser);
    setActiveCampaign(null);
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    setActiveCampaign(null);
  };

  if (booting) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (!activeCampaign) {
    return (
      <CampaignList
        user={user}
        onSelectCampaign={setActiveCampaign}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <GameApp
      campaign={activeCampaign}
      onBackToCampaigns={() => setActiveCampaign(null)}
    />
  );
}

export default App;
