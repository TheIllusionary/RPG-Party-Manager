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
import OwlbearMap from '../features/battle/components/OwlbearMap';
import PlayerSheetView from '../features/PlayerSheet/PlayerSheetView';
import { mergeCampaignData } from '../data/defaultData';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';
import { SyncService } from '../services/syncService';
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
import { setLastCampaignId } from '../services/api';

const SAVE_DEBOUNCE_MS = 800;

function GameApp({ campaign, onBackToCampaigns }: IGameAppProps) {
  const { classes: compendiumClasses } = useCompendiumClasses();
  const { subclasses: compendiumSubclasses } = useCompendiumSubclasses();
  const { races: compendiumRaces } = useCompendiumRaces();

  const [config, setConfig] = useState<IStoredAppConfig>({
    theme: 'dark',
    fullscreenOnStartup: false,
    startupView: 'party-minimized',
    uiScale: '100%',
    defaultRollMode: 'manual',
  });

  const [activeTab, setActiveTab] = useState<AppTab>('players');
  const [activeSheetPlayerId, setActiveSheetPlayerId] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [battleMode, setBattleMode] = useState(false);
  const [enemies, setEnemies] = useState<IEnemy[]>([]);
  const [minimizedEnemies, setMinimizedEnemies] = useState<IMinimizedMap>({});

  const [saveMessage, setSaveMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const [campaignId, setCampaignId] = useState(campaign._id);
  const [dataError, setDataError] = useState<string | null>(null);
  const syncServiceRef = useRef(new SyncService());
  const [syncing, setSyncing] = useState(false);

  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load configuration and campaign-specific state from Dexie
  useEffect(() => {
    async function loadSettings() {
      setLoadingSettings(true);
      try {
        const [configRecord, settingsRecord] = await Promise.all([
          db.campaignState.get('global_app_config'),
          db.campaignState.get(`campaign_${campaign._id}_settings`),
        ]);

        if (configRecord?.data) {
          setConfig(configRecord.data);
        }

        if (settingsRecord?.data) {
          const sd = settingsRecord.data;
          if (sd.activeTab) setActiveTab(sd.activeTab);
          if (sd.battleMode !== undefined) setBattleMode(sd.battleMode);
          if (sd.enemies) setEnemies(sd.enemies);
          if (sd.minimizedEnemies) setMinimizedEnemies(sd.minimizedEnemies);
        }
      } catch (err) {
        console.error('Failed to load campaign settings from Dexie:', err);
      } finally {
        setLoadingSettings(false);
      }
    }

    loadSettings();
  }, [campaign._id]);

  // Save global configuration when modified
  useEffect(() => {
    if (loadingSettings) return;
    db.campaignState.put({
      id: 'global_app_config',
      campaignId: 'global',
      type: 'config',
      data: config,
      updatedAt: Date.now(),
    }).catch((err) => console.error('Failed to save global app config:', err));
  }, [config, loadingSettings]);

  // Save campaign-specific settings when updated
  useEffect(() => {
    if (loadingSettings) return;
    db.campaignState.put({
      id: `campaign_${campaignId}_settings`,
      campaignId: campaignId,
      type: 'config',
      data: {
        activeTab,
        battleMode,
        enemies,
        minimizedEnemies,
      },
      updatedAt: Date.now(),
    }).catch((err) => console.error('Failed to save campaign settings:', err));
  }, [campaignId, activeTab, battleMode, enemies, minimizedEnemies, loadingSettings]);

  const switchTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    setCampaignId(campaign._id);
    setLastCampaignId(campaign._id);
  }, [campaign._id]);

  // Periodic Background Sync
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const runSync = async () => {
      setSyncing(true);
      try {
        await syncServiceRef.current.sync();
      } catch (e) {
        console.error('Background sync failed', e);
      } finally {
        setSyncing(false);
      }
    };
    
    runSync(); // Immediate hydration/sync on mount
    interval = setInterval(runSync, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [campaignId]);

  const dbPlayers = useLiveQuery(() => db.players.where({ campaignId }).and(p => !p.isDeleted).toArray(), [campaignId]);
  const dbLibrary = useLiveQuery(() => db.library.where({ campaignId }).and(m => !m.isDeleted).toArray(), [campaignId]);
  const dbBuffs = useLiveQuery(() => db.buffs.where({ campaignId }).and(b => !b.isDeleted).toArray(), [campaignId]);
  const dbSubclasses = useLiveQuery(() => db.subclasses.where({ campaignId }).and(s => !s.isDeleted).toArray(), [campaignId]);
  const dbItems = useLiveQuery(() => db.items.where({ campaignId }).and(i => !i.isDeleted).toArray(), [campaignId]);
  const dbCampaignState = useLiveQuery(() => db.campaignState.where({ campaignId }).and(s => !s.isDeleted).toArray(), [campaignId]);

  const dataLoading = dbPlayers === undefined || dbLibrary === undefined || dbCampaignState === undefined;

  const data: IAppData | null = dataLoading ? null : mergeCampaignData({
    players: dbPlayers || [],
    library: dbLibrary || [],
    buffsDatabase: dbBuffs || [],
    subclasses: dbSubclasses?.filter(s => !s.id.startsWith('custom_')) || [],
    customSubclasses: dbSubclasses?.filter(s => s.id.startsWith('custom_')) || [],
    customItems: dbItems || [],
    equipment: dbCampaignState?.find(s => s.type === 'equipment')?.data,
    notebook: dbCampaignState?.find(s => s.type === 'notebook')?.data,
    training: dbCampaignState?.find(s => s.type === 'training')?.data,
    chaos: dbCampaignState?.find(s => s.type === 'chaos')?.data,
    logicBlocks: dbCampaignState?.find(s => s.type === 'logicBlocks')?.data,
    bestiaryFavorites: dbCampaignState?.find(s => s.type === 'bestiaryFavorites')?.data,
    bestiaryReview: dbCampaignState?.find(s => s.type === 'bestiaryReview')?.data,
  });

  useEffect(() => {
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

  const updateData: UpdateAppDataFn = async <K extends IAppDataField>(key: K, newData: IAppData[K]) => {
    const cId = campaignId;
    const timestamp = Date.now();
    try {
      if (['players', 'library', 'buffsDatabase', 'subclasses', 'customSubclasses', 'customItems'].includes(key)) {
        let table: any;
        if (key === 'players') table = db.players;
        else if (key === 'library') table = db.library;
        else if (key === 'buffsDatabase') table = db.buffs;
        else if (key === 'subclasses' || key === 'customSubclasses') table = db.subclasses;
        else if (key === 'customItems') table = db.items;

        if (table) {
          const arr = (newData as any[]) || [];
          const currentRecords = await table.where({ campaignId: cId }).and((r: any) => !r.isDeleted).toArray();
          const newRecordsMap = new Map(arr.map(r => [r.id, r]));
          
          const toPut = [];
          for (const item of arr) {
            toPut.push({ ...item, campaignId: cId, updatedAt: timestamp, isDeleted: false });
          }
          for (const curr of currentRecords) {
            if (key === 'subclasses' && curr.id.startsWith('custom_')) continue;
            if (key === 'customSubclasses' && !curr.id.startsWith('custom_')) continue;

            if (!newRecordsMap.has(curr.id)) {
              toPut.push({ ...curr, updatedAt: timestamp, isDeleted: true });
            }
          }
          await table.bulkPut(toPut);
          return;
        }
      }

      // Singletons
      const typeMapping: Record<string, string> = {
        equipment: 'equipment',
        notebook: 'notebook',
        training: 'training',
        chaos: 'chaos',
        logicBlocks: 'logicBlocks',
        bestiaryFavorites: 'bestiaryFavorites',
        bestiaryReview: 'bestiaryReview'
      };
      const stype = typeMapping[key as string];
      if (stype) {
        await db.campaignState.put({
          id: `${cId}_${stype}`,
          campaignId: cId,
          type: stype as any,
          data: newData,
          updatedAt: timestamp,
          isDeleted: false
        });
      }
    } catch (err) {
      console.error('Dexie update failed', err);
    }
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
        
        for (const [k, v] of Object.entries(merged)) {
          await updateData(k as IAppDataField, v);
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

        {/* 1.5 - Party Sheet */}
        <button className={`nav-item ${activeTab === 'playerSheet' ? 'active' : ''}`} onClick={() => switchTab('playerSheet')} title="Party Sheet">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </button>

        {/* Notebook */}
        <button className={`nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => switchTab('map')} title="Battlemap (Owlbear Rodeo)">
          <div className="nav-icon">🗺️</div>
          <span className="nav-label">Map</span>
        </button>
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
          campaignId={campaignId}
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
          bestiaryFavorites={data.bestiaryFavorites || []}
          onOpenSheet={(id) => {
            setActiveSheetPlayerId(id);
            switchTab('playerSheet');
          }}
        />
      )}
      {activeTab === 'playerSheet' && (
        <PlayerSheetView
          players={data.players}
          updatePlayers={(d) => updateData('players', d)}
          activeSheetPlayerId={activeSheetPlayerId}
          setActiveSheetPlayerId={setActiveSheetPlayerId}
          equipment={data.equipment}
          subclasses={data.subclasses || []}
          logicBlocks={data.logicBlocks ?? []}
          buffsDatabase={data.buffsDatabase || []}
          config={config}
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
      {activeTab === 'map' && (
        <OwlbearMap />
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
          bestiaryFavorites={data.bestiaryFavorites || []}
          updateBestiaryFavorites={(favs) => updateData('bestiaryFavorites', favs)}
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
