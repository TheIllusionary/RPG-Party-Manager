import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Package, Sparkles, User, Shield } from 'lucide-react';

import { useCompendiumSpells } from '../../shared/hooks/useCompendiumSpells';
import { useCompendiumItems } from '../../shared/hooks/useCompendiumItems';
import { useCompendiumClasses } from '../../shared/hooks/useCompendiumClasses';
import { useCompendiumSubclasses } from '../../shared/hooks/useCompendiumSubclasses';
import { useCompendiumRaces } from '../../shared/hooks/useCompendiumRaces';
import type { CompendiumTab } from '../../types/compendium';
import type { ISRDEquipmentItem, ISRDSpell } from '../../types/srd';
import type { MasterRace } from '../../services/compendium/fiveETools/types';
import ItemCard from './ItemCard';
import SpellCard from './SpellCard';
import ClassDetailView from './ClassDetailView';
import RaceDetailView from './RaceDetailView';
import SpellFiltersPanel from './SpellFiltersPanel';
import UniversalFilterPanel from './UniversalFilterPanel';
import {
  buildSpellFilterOptions,
  DEFAULT_SPELL_FILTERS,
  filterSpells,
  type SpellFilterState,
} from './spellFilterUtils';
import db from '../../services/db';

import './compendium.css';

function sortSpells(spells: ISRDSpell[]): ISRDSpell[] {
  return [...spells].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });
}

function sortItems(items: ISRDEquipmentItem[]): ISRDEquipmentItem[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export interface CompendiumViewProps {
  activeTab?: CompendiumTab;
  hideHeader?: boolean;
}

export default function CompendiumView({ activeTab: propActiveTab, hideHeader = false }: CompendiumViewProps = {}) {
  const { spells: compendiumSpells, loading: loadingSpells, error: errorSpells, reload: reloadSpells } = useCompendiumSpells();
  const { items: compendiumItems, loading: loadingItems, error: errorItems, reload: reloadItems } = useCompendiumItems();
  const { classes: compendiumClasses, loading: loadingClasses, error: errorClasses, reload: reloadClasses } = useCompendiumClasses();
  const { subclasses: compendiumSubclasses, loading: loadingSubclasses, error: errorSubclasses, reload: reloadSubclasses } = useCompendiumSubclasses();

  const { races: compendiumRaces, loading: loadingRaces, error: errorRaces, reload: reloadRaces } = useCompendiumRaces();

  const [internalActiveTab, setInternalActiveTab] = useState<CompendiumTab>('spells');
  const activeTab = propActiveTab ?? internalActiveTab;
  const setActiveTab = propActiveTab ? () => {} : setInternalActiveTab;

  const [searches, setSearches] = useState<Record<string, string>>({ spells: '', items: '', classes: '', races: '' });
  const [spellFilters, setSpellFilters] = useState<SpellFilterState>(DEFAULT_SPELL_FILTERS);
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [initializedSources, setInitializedSources] = useState(false);

  useEffect(() => {
    setViewMode('list');
  }, [activeTab]);

  const spells = useMemo(() => sortSpells(compendiumSpells), [compendiumSpells]);
  const items = useMemo(() => sortItems(compendiumItems), [compendiumItems]);
  const classes = useMemo(() => [...compendiumClasses].sort((a, b) => a.name.localeCompare(b.name)), [compendiumClasses]);
  const races = useMemo(() => [...compendiumRaces].sort((a, b) => a.name.localeCompare(b.name)) as MasterRace[], [compendiumRaces]);

  const loading = loadingSpells || loadingItems || loadingClasses || loadingSubclasses || loadingRaces;
  const error = errorSpells || errorItems || errorClasses || errorSubclasses || errorRaces;

  useEffect(() => {
    if (!loading) {
      console.log('Compendium Data Loaded:', { spells: spells.length, items: items.length });
    }
  }, [loading, spells.length, items.length]);

  const reload = useCallback(async () => {
    await Promise.all([reloadSpells(), reloadItems(), reloadClasses(), reloadSubclasses(), reloadRaces()]);
  }, [reloadSpells, reloadItems, reloadClasses, reloadSubclasses, reloadRaces]);

  const spellFilterOptions = useMemo(() => buildSpellFilterOptions(spells), [spells]);

  const availableSources = useMemo(() => {
    const s = new Set<string>();
    for (const item of items) if (item.source) s.add(item.source);
    for (const spell of spells) if (spell.source) s.add(spell.source);
    for (const cls of classes) if (cls.source) s.add(cls.source);
    for (const race of races) if (race.source) s.add(race.source);
    return Array.from(s).sort();
  }, [items, spells, classes, races]);

  useEffect(() => {
    if (availableSources.length > 0 && !initializedSources) {
      setSelectedSources(availableSources);
      setInitializedSources(true);
    }
  }, [availableSources, initializedSources]);

  const filteredSpells = useMemo(() => {
    const bySource = spells.filter((s) => selectedSources.includes(s.source));
    return filterSpells(bySource, spellFilters, searches.spells);
  }, [spells, spellFilters, searches.spells, selectedSources]);

  const filteredItems = useMemo(() => {
    const bySource = items.filter((i) => selectedSources.includes(i.source));
    const q = (searches.items || '').trim().toLowerCase();
    if (!q) return bySource;
    return bySource.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, searches.items, selectedSources]);

  const filteredClasses = useMemo(() => {
    const bySource = classes.filter((c) => selectedSources.includes(c.source));
    const q = (searches.classes || '').trim().toLowerCase();
    if (!q) return bySource;
    return bySource.filter((c) => c.name.toLowerCase().includes(q));
  }, [classes, searches.classes, selectedSources]);

  const filteredRaces = useMemo(() => {
    const bySource = races.filter((r) => selectedSources.includes(r.source));
    const q = (searches.races || '').trim().toLowerCase();
    if (!q) return bySource;
    return bySource.filter((r) => r.name.toLowerCase().includes(q));
  }, [races, searches.races, selectedSources]);



  const selectedSpell = filteredSpells.find((s) => s.id === selectedSpellId) ?? null;
  const selectedItem = filteredItems.find((i) => i.id === selectedItemId) ?? null;
  const selectedClass = filteredClasses.find((c) => c.id === selectedClassId) ?? null;
  const selectedRace = filteredRaces.find((r) => r.id === selectedRaceId) ?? null;

  const listCount = activeTab === 'spells' ? filteredSpells.length : activeTab === 'items' ? filteredItems.length : activeTab === 'races' ? filteredRaces.length : filteredClasses.length;
  const totalCount = activeTab === 'spells' ? spells.length : activeTab === 'items' ? items.length : activeTab === 'races' ? races.length : classes.length;

  return (
    <div className="compendium-view">
      {!hideHeader && (
      <header className="compendium-header glass-panel">
        <div className="compendium-header__intro">
          <h1 className="compendium-header__title">
            <BookOpen size={24} aria-hidden />
            Compendium
          </h1>
          <p className="compendium-header__subtitle">
            Spells and equipment from the local ETL catalog.
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="compendium-link-btn"
              onClick={async () => {
                if (window.confirm('Are you sure you want to force wipe the Dexie monsters library? This will clear all local cached monsters.')) {
                  await db.library.clear();
                  alert('Dexie library cleared! You may now run the ETL pipeline and reload.');
                }
              }}
            >
              ⚠️ Force Wipe Dexie Library
            </button>
          </div>
        </div>

        <nav className="compendium-tabs" aria-label="Compendium sections">
          <button
            type="button"
            className={`compendium-tab ${activeTab === 'spells' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('spells'); setViewMode('list'); }}
          >
            <Sparkles size={16} aria-hidden />
            Spells
            <span className="compendium-tab__count">{spells.length}</span>
          </button>
          <button
            type="button"
            className={`compendium-tab ${activeTab === 'items' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('items'); setViewMode('list'); }}
          >
            <Package size={16} aria-hidden />
            Items
            <span className="compendium-tab__count">{items.length}</span>
          </button>
          <button
            type="button"
            className={`compendium-tab ${activeTab === 'classes' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('classes'); setViewMode('list'); }}
          >
            <User size={16} aria-hidden />
            Classes
            <span className="compendium-tab__count">{classes.length}</span>
          </button>
          <button
            type="button"
            className={`compendium-tab ${activeTab === 'races' ? 'is-active' : ''}`}
            onClick={() => { setActiveTab('races'); setViewMode('list'); }}
          >
            <Shield size={16} aria-hidden />
            Races
            <span className="compendium-tab__count">{races.length}</span>
          </button>
        </nav>
      </header>
      )}

      {error && (
        <p className="compendium-flash compendium-flash--error" role="alert">
          {error}
          <button type="button" className="compendium-link-btn" onClick={() => void reload()}>
            Retry
          </button>
        </p>
      )}

      <div className="compendium-layout glass-panel">
        <aside className="compendium-sidebar">
          <UniversalFilterPanel
            availableSources={availableSources}
            selectedSources={selectedSources}
            onChange={setSelectedSources}
          />
          {activeTab === 'spells' && (
            <SpellFiltersPanel
              filters={spellFilters}
              options={spellFilterOptions}
              onChange={setSpellFilters}
              onClear={() => setSpellFilters(DEFAULT_SPELL_FILTERS)}
            />
          )}

          <label className="compendium-search">
            <span className="compendium-search__label">
              {activeTab === 'spells' ? 'Search spells' : (activeTab === 'items' ? 'Search items' : 'Search classes')}
            </span>
            <input
              type="search"
              className="input compendium-search__input"
              placeholder={activeTab === 'spells' ? 'Search spells…' : (activeTab === 'items' ? 'Search items…' : 'Search classes…')}
              value={searches[activeTab] || ''}
              onChange={(e) => setSearches(prev => ({ ...prev, [activeTab]: e.target.value }))}
            />
          </label>

          <p className="compendium-list-meta" aria-live="polite">
            {loading ? 'Loading…' : `${listCount} of ${totalCount} shown`}
          </p>
        </aside>

        <main className="compendium-main-content">
          {viewMode === 'list' && (
          <ul className="compendium-list" role="listbox" aria-label={activeTab === 'spells' ? 'Spells' : (activeTab === 'items' ? 'Items' : 'Classes')}>
            {loading && (
              <li className="compendium-list__empty">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem 0' }}>
                  <span className="spinner" style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Fetching data from server...
                </div>
              </li>
            )}
            {!loading && activeTab === 'spells' && filteredSpells.length === 0 && (
              <li className="compendium-list__empty">
                No spells found. Adjust the filters or import the SRD.
              </li>
            )}
            {!loading && activeTab === 'items' && filteredItems.length === 0 && (
              <li className="compendium-list__empty">
                No items found. Run the ETL to populate the local database.
              </li>
            )}
            {!loading && activeTab === 'classes' && filteredClasses.length === 0 && (
              <li className="compendium-list__empty">
                No classes found. Run the ETL.
              </li>
            )}
            {!loading &&
              activeTab === 'spells' &&
              filteredSpells.map((spell) => (
                <li key={spell.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={spell.id === selectedSpellId}
                    className={`compendium-list__item ${spell.id === selectedSpellId ? 'is-selected' : ''}`}
                    onClick={() => { setSelectedSpellId(spell.id); setViewMode('detail'); }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span className="compendium-list__item-name">{spell.name}</span>
                        <span className="compendium-list__item-meta">
                          {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`} · {spell.school}
                        </span>
                      </div>
                      <div className="compendium-list__item-tags" style={{ display: 'flex', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span>{spell.castingTime}</span> · 
                        <span>{spell.range}</span> · 
                        <span>{spell.duration}</span>
                        {spell.components?.length > 0 && (
                          <> · <span>Components: {spell.components.join(', ')}</span></>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            {!loading &&
              activeTab === 'items' &&
              filteredItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={item.id === selectedItemId}
                    className={`compendium-list__item ${item.id === selectedItemId ? 'is-selected' : ''}`}
                    onClick={() => { setSelectedItemId(item.id); setViewMode('detail'); }}
                  >
                    <span className="compendium-list__item-name">{item.name}</span>
                    <span className="compendium-list__item-meta">{item.category}</span>
                  </button>
                </li>
              ))}
            {!loading &&
              activeTab === 'classes' &&
              filteredClasses.map((cls) => (
                <li key={cls.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={cls.id === selectedClassId}
                    className={`compendium-list__item ${cls.id === selectedClassId ? 'is-selected' : ''}`}
                    onClick={() => { setSelectedClassId(cls.id); setViewMode('detail'); }}
                  >
                    <span className="compendium-list__item-name">{cls.name}</span>
                    <span className="compendium-list__item-meta">{cls.source}</span>
                  </button>
                </li>
              ))}
            {!loading &&
              activeTab === 'races' &&
              filteredRaces.map((race) => (
                <li key={race.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={race.id === selectedRaceId}
                    className={`compendium-list__item ${race.id === selectedRaceId ? 'is-selected' : ''}`}
                    onClick={() => { setSelectedRaceId(race.id); setViewMode('detail'); }}
                  >
                    <span className="compendium-list__item-name">{race.name}</span>
                    <span className="compendium-list__item-meta">
                      {race.subraces?.length ? `${race.subraces.length} subraces` : race.source}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
          )}

          {viewMode === 'detail' && (
          <div className="compendium-detail-pane">
            <div className="compendium-detail-header">
              <button className="btn btn-secondary small-btn" onClick={() => setViewMode('list')} style={{ marginBottom: '1rem' }}>
                &larr; Back to List
              </button>
            </div>
            {!loading && activeTab === 'spells' && selectedSpell && <SpellCard spell={selectedSpell} />}
            {!loading && activeTab === 'items' && selectedItem && <ItemCard item={selectedItem} />}
            {!loading && activeTab === 'classes' && selectedClass && (
              <ClassDetailView masterClass={selectedClass} availableSubclasses={compendiumSubclasses.filter(sc => sc.classId === selectedClass.entityKey)} />
            )}
            {!loading && activeTab === 'races' && selectedRace && (
              <RaceDetailView race={selectedRace} />
            )}
          </div>
          )}
        </main>
      </div>
    </div>
  );
}
