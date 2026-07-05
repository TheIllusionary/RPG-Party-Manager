import { useState, useEffect } from 'react';
import '../index.css';

import AuthScreen from '../features/auth/AuthScreen';
import CampaignList from '../features/campaign/CampaignList';
import DmDashboard from '../features/dashboard/DmDashboard';
import GameApp from './GameApp';
import RootLayout from '../shared/components/RootLayout';
import {
  clearAuthSession,
  fetchMe,
  getStoredToken,
  getStoredUser,
  setAuthSession,
} from '../services/api';
import { syncAuthFromStorage } from '../services/syncBridge';
import type { IAuthSession } from '../types/auth';
import type { ICampaign, IUser } from '../types';

function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<IUser | null>(() => getStoredUser());
  const [activeCampaign, setActiveCampaign] = useState<ICampaign | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

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
          syncAuthFromStorage(getStoredToken);
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

  const handleAuthenticated = ({ token, user: authUser }: IAuthSession) => {
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
      <RootLayout>
        <div className="centered-placeholder">
          <div className="glass-panel">
            <p className="text-secondary">Loading...</p>
          </div>
        </div>
      </RootLayout>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (!activeCampaign) {
    if (showDashboard) {
      return <DmDashboard onBack={() => setShowDashboard(false)} />;
    }

    return (
      <CampaignList
        user={user}
        onSelectCampaign={setActiveCampaign}
        onLogout={handleLogout}
        onOpenDashboard={() => setShowDashboard(true)}
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
