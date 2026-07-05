import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';

import PlayerManager from '../features/battle/PlayerManager';
import Equipment from '../features/inventory/Equipment';
import CharacterEquipment from '../features/inventory/CharacterEquipment';
import Training from '../features/campaign/Training';
import Chaos from '../features/campaign/Chaos';
import EnemyLibrary from '../features/bestiary/EnemyLibrary';
import SubclassManager from '../features/campaign/SubclassManager';
import CampaignRulesPanel from '../features/campaign/CampaignRulesPanel';
import CompendiumView from '../features/compendium/CompendiumView';
import Notebook from '../features/campaign/Notebook';
import { mergeCampaignData, toApiPayload } from '../data/defaultData';
import { getCampaignData, updateCampaignData } from '../services/campaignBridge';
import { getSrdCatalog } from '../services/srdBridge';
import { mergeSubclassesById } from '../shared/utils/subclassMergeUtils';
import { useCompendiumClasses } from '../shared/hooks/useCompendiumClasses';
import { useCompendiumSubclasses } from '../shared/hooks/useCompendiumSubclasses';
import { useCompendiumRaces } from '../shared/hooks/useCompendiumRaces';
import AppNavBar from '../shared/components/AppNavBar';
import RootLayout from '../shared/components/RootLayout';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import type { IAppData, IEnemy } from '../types';
import type { IMinimizedMap } from '../types/battle';
import type { AppTab, IAppDataField, IGameAppProps, IStoredAppConfig, UpdateAppDataFn } from '../types/app';

const SAVE_DEBOUNCE_MS = 800;

function GameApp({ campaign, onBackToCampaigns }: IGameAppProps) {
  const { classes: compendiumClasses } = useCompendiumClasses();
  const { subclasses: compendiumSubclasses } = useCompendiumSubclasses();
  const { races: compendiumRaces } = useCompendiumRaces();

  const [config, setConfig] = useState<IStoredAppConfig>(() => {
    const saved = localStorage.getItem('partyManagerConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          theme: parsed.theme || 'dark',
          fullscreenOnStartup: parsed.fullscreenOnStartup ?? false,
          startupView: parsed.startupView || 'party-minimized',
          uiScale: parsed.uiScale || '100%',
          defaultRollMode: parsed.defaultRollMode || 'manual',
        };
      } catch (e) {
        console.error(e);
      }
    }
    return {
      theme: 'dark',
      fullscreenOnStartup: false,
      startupView: 'party-minimized',
      uiScale: '100%',
      defaultRollMode: 'manual',
    };
  });

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const savedConfig = localStorage.getItem('partyManagerConfig');
    let startupView = 'party-minimized';
    if (savedConfig) {
      try {
        startupView = JSON.parse(savedConfig).startupView || 'party-minimized';
      } catch {
        /* ignore */
      }
    }
    if (startupView === 'last') {
      return (localStorage.getItem('partyManagerLastTab') as AppTab) || 'players';
    }
    return 'players';
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const [battleMode, setBattleMode] = useState(() => {
    const savedConfig = localStorage.getItem('partyManagerConfig');
    let startupView = 'party-minimized';
    if (savedConfig) {
      try {
        startupView = JSON.parse(savedConfig).startupView || 'party-minimized';
      } catch (e) {}
    }
    if (startupView === 'last') {
      return localStorage.getItem('partyManagerBattleMode') === 'true';
    }
    return false;
  });
  const [enemies, setEnemies] = useState<IEnemy[]>(() => {
    const saved = localStorage.getItem('partyManagerEnemies');
    return saved ? JSON.parse(saved) : [];
  });
  const [minimizedEnemies, setMinimizedEnemies] = useState<IMinimizedMap>(() => {
    const saved = localStorage.getItem('partyManagerMinimizedEnemies');
    return saved ? JSON.parse(saved) : {};
  });

  const switchTab = (tab: AppTab) => {
    setActiveTab(tab);
    localStorage.setItem('partyManagerLastTab', tab);
    window.scrollTo(0, 0);
  };
  const [saveMessage, setSaveMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const [campaignId, setCampaignId] = useState(campaign._id);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [data, setData] = useState<IAppData | null>(null);

  const skipSaveRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const campaignIdRef = useRef<string | null>(null);

  useEffect(() => {
    campaignIdRef.current = campaignId;
  }, [campaignId]);

  // Load selected campaign data from MongoDB
  useEffect(() => {
    let cancelled = false;

    async function loadCampaign() {
      try {
        setDataLoading(true);
        setDataError(null);
        setCampaignId(campaign._id);

        localStorage.setItem('partyManagerLastCampaignId', campaign._id);

        const remoteData = await getCampaignData(campaign._id);
        if (cancelled) return;

        skipSaveRef.current = true;
        setData(mergeCampaignData(remoteData));
      } catch (err) {
        console.error('Failed to load campaign:', err);
        if (!cancelled) {
          setDataError(err instanceof Error ? err.message : 'Failed to connect to API');
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadCampaign();
    return () => { cancelled = true; };
  }, [campaign._id]);

  // Debounced auto-save to MongoDB (replaces localStorage for partyManagerData)
  const persistCampaignData = useCallback(async (payload: IAppData) => {
    const id = campaignIdRef.current;
    if (!id) return;
    await updateCampaignData(id, toApiPayload(payload));
  }, []);

  useEffect(() => {
    if (!campaignId || !data) return;

    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      persistCampaignData(data).catch((err) => {
        console.error('Auto-save failed:', err);
        setSaveMessage('❌ Save failed');
        setTimeout(() => setSaveMessage(''), 2500);
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [data, campaignId, persistCampaignData]);

  useEffect(() => {
    localStorage.setItem('partyManagerBattleMode', String(battleMode));
  }, [battleMode]);

  useEffect(() => {
    localStorage.setItem('partyManagerEnemies', JSON.stringify(enemies));
  }, [enemies]);

  useEffect(() => {
    localStorage.setItem('partyManagerMinimizedEnemies', JSON.stringify(minimizedEnemies));
  }, [minimizedEnemies]);

  useEffect(() => {
    localStorage.setItem('partyManagerConfig', JSON.stringify(config));
    
    // Apply body theme class
    document.body.classList.remove('theme-bio');
    if (config.theme === 'bio') {
      document.body.classList.add('theme-bio');
    }

    // Apply UI Scaling
    const scale = config.uiScale || '100%';
    document.documentElement.style.fontSize = scale === '110%' ? '17.6px' : scale === '120%' ? '19.2px' : '16px';
  }, [config]);

  // Fullscreen Sync Effect
  useEffect(() => {
    const syncFullscreen = async () => {
      try {
        if (config.fullscreenOnStartup) {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } else {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          }
        }
      } catch (err) {
        console.warn("Fullscreen toggle failed or not supported in this environment:", err);
      }
    };
    syncFullscreen();
  }, [config.fullscreenOnStartup]);

  const handleConfigChange = <K extends keyof IStoredAppConfig>(key: K, value: IStoredAppConfig[K]) => {
    setConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateData: UpdateAppDataFn = <K extends IAppDataField>(key: K, newData: IAppData[K]) => {
    setData(prev => (prev ? { ...prev, [key]: newData } : prev));
  };

  // ===== EXPORT / IMPORT =====
  const handleExport = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `party-manager-save-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flashSave('💾 Saved!');
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(String(evt.target?.result ?? ''));
        const merged = mergeCampaignData({
          ...parsed,
          training: parsed.training || {},
          chaos: parsed.chaos || { customTables: [] },
        });
        skipSaveRef.current = true;
        setData(merged);
        if (campaignId) {
          await persistCampaignData(merged);
        }
        flashSave('✅ Loaded!');
      } catch {
        flashSave('❌ Invalid file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const flashSave = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 2500);
  };

  if (dataLoading) {
    return (
      <RootLayout>
        <div className="centered-placeholder">
          <div className="glass-panel">
            <p className="text-secondary">Loading campaign...</p>
          </div>
        </div>
      </RootLayout>
    );
  }

  if (dataError || !data) {
    return (
      <RootLayout>
        <div className="centered-placeholder">
          <div className="glass-panel">
            <p className="error-title">Failed to load campaign</p>
            <p className="text-sm text-secondary">{dataError}</p>
            <button className="btn btn-spaced" type="button" onClick={onBackToCampaigns}>
              Back to Campaigns
            </button>
          </div>
        </div>
      </RootLayout>
    );
  }

  return (
    <RootLayout
      padForToolbar
      header={
        <AppNavBar
          title={campaign.name}
          crumbs={[
            { label: 'Campanhas', onClick: onBackToCampaigns },
            { label: campaign.name },
          ]}
        />
      }
      toolbar={
        <nav className="bottom-nav">
        {/* 1 — Party */}
        <button className={`nav-item ${activeTab === 'players' ? 'active' : ''}`} onClick={() => switchTab('players')} title="Party Roster">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>

        {/* Notebook */}
        <button className={`nav-item ${activeTab === 'notebook' ? 'active' : ''}`} onClick={() => switchTab('notebook')} title="Quest Log / Notes">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </button>

        {/* 2 — Inventory */}
        <button className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => switchTab('inventory')} title="Inventory">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="2" y="11" width="20" height="11" rx="1.5" strokeWidth="1.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 11a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5" strokeWidth="1.5" />
            <path strokeLinecap="round" d="M2 13h20" strokeWidth="1.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13v2a3 3 0 0 0 6 0v-2" strokeWidth="1.5" />
          </svg>
        </button>

        {/* 3 — Character Equipment */}
        <button className={`nav-item ${activeTab === 'charequip' ? 'active' : ''}`} onClick={() => switchTab('charequip')} title="Character Equipment">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="16" />
            <polygon points="12,2 10,7 14,7" fill="currentColor" stroke="none" opacity="0.7" />
            <line x1="7" y1="16" x2="17" y2="16" />
            <line x1="12" y1="16" x2="12" y2="21" />
            <circle cx="12" cy="21" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </button>

        {/* 4 — Training */}
        <button className={`nav-item ${activeTab === 'training' ? 'active' : ''}`} onClick={() => switchTab('training')} title="Training">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </button>

        {/* 5 — Chaos */}
        <button className={`nav-item ${activeTab === 'chaos' ? 'active' : ''}`} onClick={() => switchTab('chaos')} title="Chaos Tables">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="3" />
            <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </button>

        {/* Subclasses */}
        <button className={`nav-item ${activeTab === 'subclasses' ? 'active' : ''}`} onClick={() => switchTab('subclasses')} title="Custom Subclasses">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
          </svg>
        </button>

        {/* Rules */}
        <button className={`nav-item ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => switchTab('rules')} title="Campaign Rules">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
            <path d="M12 6h4M12 10h4M12 14h4" />
            <path d="M8 6h.01M8 10h.01M8 14h.01" />
          </svg>
        </button>

        {/* Compendium */}
        <button className={`nav-item ${activeTab === 'compendium' ? 'active' : ''}`} onClick={() => switchTab('compendium')} title="Compendium">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <path d="M8 7h8M8 11h6" />
          </svg>
        </button>

        {/* 6 — Database */}
        <button className={`nav-item ${activeTab === 'bestiary' ? 'active' : ''}`} onClick={() => switchTab('bestiary')} title="Database">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </button>

        {/* Divider */}
        <span style={{ width: '1px', background: 'rgba(255, 255, 255, 0.15)', alignSelf: 'stretch', margin: '6px 4px' }}></span>

        {/* Save to File */}
        <button className="nav-item" onClick={handleExport} title="Save to File" style={{ color: 'var(--text-secondary)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        {/* Load from File */}
        <button className="nav-item" onClick={() => importRef.current?.click()} title="Load from File" style={{ color: 'var(--text-secondary)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>

        {/* Config button */}
        <button className="nav-item" onClick={() => setIsConfigModalOpen(true)} title="Settings" style={{ color: 'var(--text-secondary)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* Save message popup above bottom-nav */}
        {saveMessage && (
          <span className="save-flash" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '10px', pointerEvents: 'none', background: 'rgba(15, 17, 21, 0.95)', border: 'var(--glass-border)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--glass-shadow)', whiteSpace: 'nowrap' }}>
            {saveMessage}
          </span>
        )}

        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </nav>
      }
    >
      <ErrorBoundary>
      {activeTab === 'players' && (
        <PlayerManager
          data={data.players}
          updateData={(d) => updateData('players', d)}
          equipment={data.equipment}
          battleMode={battleMode}
          setBattleMode={setBattleMode}
          enemies={enemies}
          setEnemies={setEnemies}
          minimizedEnemies={minimizedEnemies}
          setMinimizedEnemies={setMinimizedEnemies}
          library={data.library || []}
          updateLibrary={(l) => updateData('library', l)}
          buffsDatabase={data.buffsDatabase || []}
          updateBuffsDatabase={(b) => updateData('buffsDatabase', b)}
          subclasses={data.subclasses || []}
          logicBlocks={data.logicBlocks ?? []}
          config={config}
          configModalOpen={isConfigModalOpen}
          compendiumClasses={compendiumClasses}
          compendiumSubclasses={compendiumSubclasses}
          compendiumRaces={compendiumRaces}
        />
      )}
      {activeTab === 'notebook' && (
        <Notebook
          notebookData={data.notebook || { pages: [] }}
          updateNotebookData={(d) => updateData('notebook', d)}
        />
      )}
      {activeTab === 'inventory' && (
        <Equipment
          data={data.equipment}
          updateData={(d) => updateData('equipment', d)}
          players={data.players}
          buffsDatabase={data.buffsDatabase || []}
          updateBuffsDatabase={(b) => updateData('buffsDatabase', b)}
          customItems={data.customItems || []}
          updateCustomItems={(items) => updateData('customItems', items)}
        />
      )}
      {activeTab === 'charequip' && (
        <CharacterEquipment
          data={data.equipment}
          updateData={(d) => updateData('equipment', d)}
          players={data.players}
          buffsDatabase={data.buffsDatabase || []}
          updateBuffsDatabase={(b) => updateData('buffsDatabase', b)}
          customItems={data.customItems || []}
          updateCustomItems={(items) => updateData('customItems', items)}
        />
      )}
      {activeTab === 'training' && (
        <Training
          players={data.players}
          trainingData={data.training}
          updateTrainingData={(d) => updateData('training', d)}
        />
      )}
      {activeTab === 'chaos' && (
        <Chaos chaosData={data.chaos} updateChaosData={(d) => updateData('chaos', d)} />
      )}
      {activeTab === 'subclasses' && (
        <SubclassManager
          subclasses={data.subclasses || []}
          updateSubclasses={(s) => updateData('subclasses', s)}
        />
      )}
      {activeTab === 'rules' && (
        <CampaignRulesPanel
          logicBlocks={data.logicBlocks ?? []}
          updateLogicBlocks={(blocks) => updateData('logicBlocks', blocks)}
        />
      )}
      {activeTab === 'compendium' && (
        <CompendiumView />
      )}
      {activeTab === 'bestiary' && (
        <EnemyLibrary
          library={data.library || []}
          updateLibrary={(l) => updateData('library', l)}
          buffsDatabase={data.buffsDatabase || []}
          updateBuffsDatabase={(b) => updateData('buffsDatabase', b)}
          bestiaryReview={data.bestiaryReview || {}}
          updateBestiaryReview={(r) => updateData('bestiaryReview', r)}
        />
      )}
      </ErrorBoundary>

      {/* Settings Modal Dialog Overlay */}
      {isConfigModalOpen && (
        <div className="global-modal-overlay" onClick={() => setIsConfigModalOpen(false)}>
          <div className="glass-panel damage-heal-popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', border: '1px solid var(--primary)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', width: '100%', textAlign: 'center' }}>
              ⚙️ Application Settings
            </h3>
            
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Theme Configuration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Theme Accent</label>
                <select
                  className="input"
                  value={config.theme}
                  onChange={(e) => handleConfigChange('theme', e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: 'var(--glass-border)' }}
                >
                  <option value="dark">Dark Default (Indigo & Pink Glass)</option>
                  <option value="bio">Bio Theme (Rose Pink & Emerald Sage)</option>
                </select>
              </div>

              {/* Startup View Mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Startup Page View</label>
                <select
                  className="input"
                  value={config.startupView}
                  onChange={(e) => handleConfigChange('startupView', e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: 'var(--glass-border)' }}
                >
                  <option value="last">Last Visited Page (Restore last session)</option>
                  <option value="party-minimized">Always Party Manager (Cards Minimized)</option>
                  <option value="party-expanded">Always Party Manager (Cards Expanded)</option>
                </select>
              </div>

              {/* Startup Fullscreen Switch */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Startup in Fullscreen</span>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                  <input
                    type="checkbox"
                    checked={config.fullscreenOnStartup}
                    onChange={(e) => handleConfigChange('fullscreenOnStartup', e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: config.fullscreenOnStartup ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                    borderRadius: '20px', transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '14px', width: '14px', left: config.fullscreenOnStartup ? '22px' : '4px', bottom: '3px',
                      backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              {/* UI Scaling */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>UI Scaling</span>
                <select
                  className="input"
                  value={config.uiScale}
                  onChange={(e) => handleConfigChange('uiScale', e.target.value)}
                  style={{ width: '120px', padding: '0.2rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', border: 'var(--glass-border)' }}
                >
                  <option value="100%">Normal (100%)</option>
                  <option value="110%">Medium (110%)</option>
                  <option value="120%">Large (120%)</option>
                </select>
              </div>

              {/* Mock Config Options */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Other Settings</h4>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Default Roll Mode</span>
                  <select
                    className="input"
                    value={config.defaultRollMode}
                    onChange={(e) => handleConfigChange('defaultRollMode', e.target.value)}
                    style={{ width: '120px', padding: '0.2rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', border: 'var(--glass-border)' }}
                  >
                    <option value="manual">Manual Roll</option>
                    <option value="auto">Auto Roll</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Auto-Save to File (Mock)</span>
                  <select disabled className="input" style={{ width: '120px', padding: '0.2rem', fontSize: '0.8rem', opacity: 0.6 }} defaultValue="none">
                    <option value="none">Disabled</option>
                    <option value="5">5 Min</option>
                    <option value="15">15 Min</option>
                  </select>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '1.5rem' }}>
              <button className="btn" onClick={() => setIsConfigModalOpen(false)} style={{ minWidth: '100px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </RootLayout>
  );
}

export default GameApp;
