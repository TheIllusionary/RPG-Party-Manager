import './dashboard.css';

import BlockEditor from '../../components/RulesEditor/BlockEditor';
import AppNavBar from '../../shared/components/AppNavBar';
import RootLayout from '../../shared/components/RootLayout';
import ActorPanel from './components/ActorPanel';
import RuleDebugConsole from './components/RuleDebugConsole';
import VttStatusPanel from './components/VttStatusPanel';
import { useLocalActorStore } from './hooks/useLocalActorStore';

export interface DmDashboardProps {
  onBack?: () => void;
}

export default function DmDashboard({ onBack }: DmDashboardProps) {
  const store = useLocalActorStore();

  return (
    <RootLayout
      variant="dashboard"
      header={
        <AppNavBar
          title="DM Test Dashboard"
          crumbs={[
            ...(onBack ? [{ label: 'Campaigns', onClick: onBack }] : []),
            { label: 'DM Dashboard' },
          ]}
          actions={
            <>
              <button
                type="button"
                className="dm-dashboard-btn dm-dashboard-btn--muted"
                onClick={() => void store.refresh()}
              >
                Refresh
              </button>
              <button
                type="button"
                className="dm-dashboard-btn dm-dashboard-btn--seed"
                onClick={() => void store.seedSampleData()}
              >
                Seed sample
              </button>
            </>
          }
        />
      }
    >
      <div className="dm-dashboard-page">
        <p className="dm-dashboard-intro">
          Local NoSQL → RuleEvaluator → Player View WebSocket · Cloud API by default
        </p>

        {store.error && (
          <p className="dm-dashboard-alert dm-dashboard-alert--error">{store.error}</p>
        )}
        {!store.electronAvailable && (
          <p className="dm-dashboard-alert dm-dashboard-alert--warn">
            Browser mode: IPC unavailable. Run{' '}
            <code>npm run electron:dev</code> inside <code>webapp/</code>.
          </p>
        )}

        <div className="dm-dashboard-grid">
          <section className="dm-dashboard-section stack">
            <h2 className="dm-dashboard-section-title">Actor Panel (NoSQL)</h2>
            <ActorPanel store={store} />
          </section>

          <section className="dm-dashboard-section stack">
            <h2 className="dm-dashboard-section-title">Rule Engine Debug</h2>
            <RuleDebugConsole store={store} />
          </section>

          <section className="dm-dashboard-section stack">
            <h2 className="dm-dashboard-section-title">VTT / Sync Status</h2>
            <VttStatusPanel store={store} />
          </section>

          <section className="dm-dashboard-section dm-dashboard-section--wide stack">
            <h2 className="dm-dashboard-section-title">Rules Editor</h2>
            <BlockEditor actors={store.actors} />
          </section>
        </div>
      </div>
    </RootLayout>
  );
}
