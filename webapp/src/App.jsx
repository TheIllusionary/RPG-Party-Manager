import { useState, useEffect, useRef } from 'react';
import './index.css';

import PlayerManager from './components/PlayerManager';
import Equipment from './components/Equipment';
import CharacterEquipment from './components/CharacterEquipment';
import Training from './components/Training';
import Chaos from './components/Chaos';
import EnemyLibrary from './components/EnemyLibrary';
import Notebook from './components/Notebook';

const DEFAULT_DATA = {
  players: [
    { id: '1', name: 'Aelar', classType: 'Rogue', xp: 0, inParty: true, hpBase: 24, hpCurrent: 24, manaCurrent: 0, ultMax: 100, ultCurrent: 0, ac: 15, str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 12, background: 'Criminal', race: 'Elf', alignment: 'CG', features: 'Sneak Attack, Darkvision' },
    { id: '2', name: 'Thorgar', classType: 'Barbarian', xp: 0, inParty: true, hpBase: 35, hpCurrent: 35, manaCurrent: 0, ultMax: 100, ultCurrent: 0, ac: 14, str: 17, dex: 14, con: 16, int: 8, wis: 10, cha: 10, background: 'Outlander', race: 'Dwarf', alignment: 'CN', features: 'Rage, Unarmored Defense' },
    { id: '3', name: 'Lyra', classType: 'Wizard', xp: 0, inParty: true, hpBase: 18, hpCurrent: 18, manaCurrent: 20, ultMax: 100, ultCurrent: 0, ac: 12, str: 8, dex: 13, con: 14, int: 17, wis: 12, cha: 10, background: 'Sage', race: 'Human', alignment: 'LN', features: 'Arcane Recovery, Spellcasting' },
    { id: '4', name: 'Kaelen', classType: 'Cleric', xp: 0, inParty: true, hpBase: 27, hpCurrent: 27, manaCurrent: 15, ultMax: 100, ultCurrent: 0, ac: 18, str: 14, dex: 10, con: 15, int: 10, wis: 16, cha: 12, background: 'Acolyte', race: 'Half-Elf', alignment: 'LG', features: 'Divine Domain, Channel Divinity' }
  ],
  equipment: { inventories: {}, equipped: {}, playerGold: {} },
  library: [
    { id: 'l1', name: 'Goblin', classType: 'Enemy', ac: 13, hpMax: 7, str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8, features: 'Nimble Escape: Can take Disengage or Hide as a bonus action.', background: 'Goblinoid, CR 1/4', proficiency: 2, skills: { Stealth: true }, saves: {} },
    { id: 'l2', name: 'Orc', classType: 'Enemy', ac: 13, hpMax: 15, str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10, features: 'Aggressive: Can move up to its speed toward a hostile creature as a bonus action.', background: 'Humanoid, CR 1/2', proficiency: 2, skills: { Intimidation: true }, saves: {} },
    { id: 'l3', name: 'Troll', classType: 'Enemy', ac: 15, hpMax: 84, str: 18, dex: 13, con: 20, int: 7, wis: 9, cha: 7, features: 'Keen Smell: Advantage on Perception checks relying on smell.\nRegeneration: Regains 10 HP at start of turn unless hit with fire or acid.', background: 'Giant, CR 5', proficiency: 3, skills: { Perception: true }, saves: { con: true } },
    { id: 'l4', name: 'Red Dragon', classType: 'Boss', ac: 19, hpMax: 256, str: 26, dex: 10, con: 25, int: 16, wis: 15, cha: 19, features: 'Legendary Resistance (3/Day).\nFrightful Presence.\nFire Breath (Recharge 5-6): 15d6 fire damage in a 60ft cone (Dex save).', background: 'Dragon, CR 17', proficiency: 6, skills: { Perception: true, Stealth: true }, saves: { dex: true, con: true, wis: true, cha: true } }
  ],
  encounters: [],
  training: {},
  chaos: { customTables: [] },
  notebook: { pages: [] },
  bestiaryReview: {},
  buffsDatabase: [
    {
      id: 'b1',
      name: 'Regeneration',
      description: 'Regain 1d6 HP at the start of your turn.',
      type: 'turn',
      oncePerRest: 'none',
      turnType: 'healHP',
      turnFormula: '1d6'
    },
    {
      id: 'b2',
      name: 'Haste',
      description: 'Target gains +2 AC, extra action, and double movement speed.',
      type: 'toggle',
      oncePerRest: 'none',
      additionalDamage: '',
      additionalAC: 2,
      dodge: false,
      extraMovement: 30,
      extraAction: true
    },
    {
      id: 'b3',
      name: 'Second Wind',
      description: 'Once per short rest, heal 1d10.',
      type: 'turn',
      oncePerRest: 'short',
      turnType: 'healHP',
      turnFormula: '1d10'
    },
    {
      id: 'b4',
      name: 'Action Surge',
      description: 'Once per short rest, gain an extra action.',
      type: 'toggle',
      oncePerRest: 'short',
      additionalDamage: '',
      additionalAC: 0,
      dodge: false,
      extraMovement: 0,
      extraAction: true
    },
    {
      id: 'b5',
      name: 'Bless',
      description: 'Target gains a +2 bonus to saving throws and attack rolls.',
      type: 'toggle',
      oncePerRest: 'none',
      additionalDamage: '',
      additionalAC: 0,
      dodge: false,
      extraMovement: 0,
      extraAction: false,
      savingThrowBonus: 2
    },
    {
      id: 'b6',
      name: 'Bane',
      description: 'Target suffers a -2 penalty to saving throws and attack rolls.',
      type: 'toggle',
      oncePerRest: 'none',
      additionalDamage: '',
      additionalAC: 0,
      dodge: false,
      extraMovement: 0,
      extraAction: false,
      savingThrowBonus: -2
    },
    {
      id: 'b7',
      name: 'Rage',
      description: 'Barbarian Rage. Gain +2 additional melee damage, and +1 to saving throws.',
      type: 'toggle',
      oncePerRest: 'long',
      additionalDamage: '2',
      additionalAC: 0,
      dodge: false,
      extraMovement: 10,
      extraAction: false,
      savingThrowBonus: 1
    },
    {
      id: 'b8',
      name: 'Shield of Faith',
      description: 'A shimmering field surrounds the target, granting +2 AC.',
      type: 'toggle',
      oncePerRest: 'none',
      additionalDamage: '',
      additionalAC: 2,
      dodge: false,
      extraMovement: 0,
      extraAction: false
    },
    {
      id: 'b9',
      name: 'Blur',
      description: 'Your body becomes blurred. Attacks against you have disadvantage (Dodge mode active).',
      type: 'toggle',
      oncePerRest: 'none',
      additionalDamage: '',
      additionalAC: 0,
      dodge: true,
      extraMovement: 0,
      extraAction: false
    },
    {
      id: 'b10',
      name: 'Divine Smite',
      description: 'Deal an extra 2d8 radiant damage on your next hit (Once per short rest).',
      type: 'fixed',
      oncePerRest: 'short',
      additionalDamage: '2d8',
      additionalAC: 0,
      dodge: false,
      extraMovement: 0,
      extraAction: false
    },
    {
      id: 'b11',
      name: 'Slow',
      description: 'Target AC is reduced by 2, and movement is reduced by 15 ft.',
      type: 'toggle',
      oncePerRest: 'none',
      additionalDamage: '',
      additionalAC: -2,
      dodge: false,
      extraMovement: -15,
      extraAction: false
    },
    {
      id: 'b12',
      name: 'Hunter\'s Mark',
      description: 'You deal an extra 1d6 damage when hitting the marked target.',
      type: 'toggle',
      oncePerRest: 'none',
      additionalDamage: '1d6',
      additionalAC: 0,
      dodge: false,
      extraMovement: 0,
      extraAction: false
    },
    {
      id: 'b13',
      name: 'Lay on Hands',
      description: 'Once per long rest, heal a target for 15 HP.',
      type: 'fixed',
      oncePerRest: 'long',
      additionalDamage: '',
      additionalAC: 0,
      dodge: false,
      extraMovement: 0,
      extraAction: false
    }
  ]
};

function App() {
  const [config, setConfig] = useState(() => {
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

  const [activeTab, setActiveTab] = useState(() => {
    const savedConfig = localStorage.getItem('partyManagerConfig');
    let startupView = 'party-minimized';
    if (savedConfig) {
      try {
        startupView = JSON.parse(savedConfig).startupView || 'party-minimized';
      } catch (e) {}
    }
    if (startupView === 'last') {
      return localStorage.getItem('partyManagerLastTab') || 'players';
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
  const [enemies, setEnemies] = useState(() => {
    const saved = localStorage.getItem('partyManagerEnemies');
    return saved ? JSON.parse(saved) : [];
  });
  const [minimizedEnemies, setMinimizedEnemies] = useState(() => {
    const saved = localStorage.getItem('partyManagerMinimizedEnemies');
    return saved ? JSON.parse(saved) : {};
  });

  const switchTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('partyManagerLastTab', tab);
    window.scrollTo(0, 0);
  };
  const [saveMessage, setSaveMessage] = useState('');
  const importRef = useRef(null);

  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('partyManagerData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge to ensure new default buffs are populated even if older save lacks them
        let mergedBuffs = parsed.buffsDatabase || [];
        DEFAULT_DATA.buffsDatabase.forEach(defBuff => {
          if (!mergedBuffs.some(b => b.name.toLowerCase() === defBuff.name.toLowerCase())) {
            mergedBuffs.push(defBuff);
          }
        });
        // Merge to ensure new keys exist even if older save lacks them
        return {
          ...DEFAULT_DATA,
          ...parsed,
          library: (parsed.library && parsed.library.length > 0) ? parsed.library : DEFAULT_DATA.library,
          training: parsed.training || {},
          chaos: parsed.chaos || { customTables: [] },
          notebook: parsed.notebook || { pages: [] },
          bestiaryReview: parsed.bestiaryReview || {},
          buffsDatabase: mergedBuffs,
        };
      }
      catch (e) {
        console.error("Failed to parse saved data:", e);
      }
    }
    return DEFAULT_DATA;
  });

  useEffect(() => {
    localStorage.setItem('partyManagerData', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem('partyManagerBattleMode', battleMode);
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

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateData = (key, newData) => {
    setData(prev => ({ ...prev, [key]: newData }));
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

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        setData({ ...DEFAULT_DATA, ...parsed, training: parsed.training || {}, chaos: parsed.chaos || { customTables: [] } });
        flashSave('✅ Loaded!');
      } catch {
        flashSave('❌ Invalid file');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = '';
  };

  const flashSave = (msg) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 2500);
  };

  return (
    <>
      <div className="container">
        <main>
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
              config={config}
              configModalOpen={isConfigModalOpen}
            />
          )}
          {activeTab === 'notebook' && (
            <Notebook
              notebookData={data.notebook || { pages: [] }}
              updateNotebookData={(d) => updateData('notebook', d)}
            />
          )}
          {activeTab === 'inventory' && <Equipment data={data.equipment} updateData={(d) => updateData('equipment', d)} players={data.players} buffsDatabase={data.buffsDatabase || []} updateBuffsDatabase={(b) => updateData('buffsDatabase', b)} />}
          {activeTab === 'charequip' && <CharacterEquipment data={data.equipment} updateData={(d) => updateData('equipment', d)} players={data.players} buffsDatabase={data.buffsDatabase || []} updateBuffsDatabase={(b) => updateData('buffsDatabase', b)} />}
          {activeTab === 'training' && <Training players={data.players} trainingData={data.training} updateTrainingData={(d) => updateData('training', d)} />}
          {activeTab === 'chaos' && <Chaos chaosData={data.chaos} updateChaosData={(d) => updateData('chaos', d)} />}
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
        </main>
      </div>

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
    </>
  );
}

export default App;
