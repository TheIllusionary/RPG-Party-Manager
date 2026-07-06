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

export default function CompendiumView() {
  const { spells: compendiumSpells, loading: loadingSpells, error: errorSpells, reload: reloadSpells } = useCompendiumSpells();
  const { items: compendiumItems, loading: loadingItems, error: errorItems, reload: reloadItems } = useCompendiumItems();
  const { classes: compendiumClasses, loading: loadingClasses, error: errorClasses, reload: reloadClasses } = useCompendiumClasses();
  const { subclasses: compendiumSubclasses, loading: loadingSubclasses, error: errorSubclasses, reload: reloadSubclasses } = useCompendiumSubclasses();

  const { races: compendiumRaces, loading: loadingRaces, error: errorRaces, reload: reloadRaces } = useCompendiumRaces();

  const [activeTab, setActiveTab] = useState<CompendiumTab>('spells');
  const [searches, setSearches] = useState<Record<string, string>>({ spells: '', items: '', classes: '', races: '' });
  const [spellFilters, setSpellFilters] = useState<SpellFilterState>(DEFAULT_SPELL_FILTERS);
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [initializedSources, setInitializedSources] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'spells') {
      if (filteredSpells.length === 0) { setSelectedSpellId(null); return; }
      if (!selectedSpellId || !filteredSpells.some((s) => s.id === selectedSpellId)) setSelectedSpellId(filteredSpells[0].id);
    } else if (activeTab === 'items') {
      if (filteredItems.length === 0) { setSelectedItemId(null); }
      else if (!selectedItemId || !filteredItems.some((i) => i.id === selectedItemId)) setSelectedItemId(filteredItems[0].id);
    } else if (activeTab === 'classes') {
      if (filteredClasses.length === 0) { setSelectedClassId(null); }
      else if (!selectedClassId || !filteredClasses.some((c) => c.id === selectedClassId)) setSelectedClassId(filteredClasses[0].id);
    } else if (activeTab === 'races') {
      if (filteredRaces.length === 0) { setSelectedRaceId(null); }
      else if (!selectedRaceId || !filteredRaces.some((r) => r.id === selectedRaceId)) setSelectedRaceId(filteredRaces[0].id);
    }
  }, [activeTab, filteredSpells, filteredItems, filteredClasses, filteredRaces, selectedSpellId, selectedItemId, selectedClassId, selectedRaceId]);

  const selectedSpell = filteredSpells.find((s) => s.id === selectedSpellId) ?? null;
  const selectedItem = filteredItems.find((i) => i.id === selectedItemId) ?? null;
  const selectedClass = filteredClasses.find((c) => c.id === selectedClassId) ?? null;
  const selectedRace = filteredRaces.find((r) => r.id === selectedRaceId) ?? null;

  const listCount = activeTab === 'spells' ? filteredSpells.length : activeTab === 'items' ? filteredItems.length : activeTab === 'races' ? filteredRaces.length : filteredClasses.length;
  const totalCount = activeTab === 'spells' ? spells.length : activeTab === 'items' ? items.length : activeTab === 'races' ? races.length : classes.length;

  return (
    <div className="compendium-view">
      <header className="compendium-header glass-panel">
        <div className="compendium-header__intro">
          <h1 className="compendium-header__title">
            <BookOpen size={24} aria-hidden />
            Compendium
          </h1>
          <p className="compendium-header__subtitle">
            Spells and equipment from the local ETL catalog.
          </p>
        </div>

        <nav className="compendium-tabs" aria-label="Compendium sections">
          <button
            type="button"
            className={`compendium-tab ${activeTab === 'spells' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('spells')}
          >
            <Sparkles size={16} aria-hidden />
            Spells
            <span className="compendium-tab__count">{spells.length}</span>
          </button>
          <button
            type="button"
            className={`compendium-tab ${activeTab === 'items' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            <Package size={16} aria-hidden />
            Items
            <span className="compendium-tab__count">{items.length}</span>
          </button>
          <button
            type="button"
            className={`compendium-tab ${activeTab === 'classes' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            <User size={16} aria-hidden />
            Classes
            <span className="compendium-tab__count">{classes.length}</span>
          </button>
          <button
            type="button"
            className={`compendium-tab ${activeTab === 'races' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('races')}
          >
            <Shield size={16} aria-hidden />
            Races
            <span className="compendium-tab__count">{races.length}</span>
          </button>
        </nav>
      </header>

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
              {activeTab === 'spells' ? 'Buscar magia' : (activeTab === 'items' ? 'Search items' : 'Search classes')}
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

          <ul className="compendium-list" role="listbox" aria-label={activeTab === 'spells' ? 'Spells' : (activeTab === 'items' ? 'Items' : 'Classes')}>
            {loading && (
              <li className="compendium-list__empty">Loading catalog…</li>
            )}
            {!loading && activeTab === 'spells' && filteredSpells.length === 0 && (
              <li className="compendium-list__empty">
                Nenhuma magia encontrada. Ajuste os filtros ou importe o SRD.
              </li>
            )}
            {!loading && activeTab === 'items' && filteredItems.length === 0 && (
              <li className="compendium-list__empty">
                Nenhum item encontrado. Execute o ETL para popular o banco local.
              </li>
            )}
            {!loading && activeTab === 'classes' && filteredClasses.length === 0 && (
              <li className="compendium-list__empty">
                Nenhuma classe encontrada. Execute o ETL.
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
                    onClick={() => setSelectedSpellId(spell.id)}
                  >
                    <span className="compendium-list__item-name">{spell.name}</span>
                    <span className="compendium-list__item-meta">
                      {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`} · {spell.school}
                    </span>
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
                    onClick={() => setSelectedItemId(item.id)}
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
                    onClick={() => setSelectedClassId(cls.id)}
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
                    onClick={() => setSelectedRaceId(race.id)}
                  >
                    <span className="compendium-list__item-name">{race.name}</span>
                    <span className="compendium-list__item-meta">
                      {race.subraces?.length ? `${race.subraces.length} subraces` : race.source}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </aside>

        <main className="compendium-detail-pane">
          {!loading && activeTab === 'spells' && selectedSpell && <SpellCard spell={selectedSpell} />}
          {!loading && activeTab === 'items' && selectedItem && <ItemCard item={selectedItem} />}
          {!loading && activeTab === 'classes' && selectedClass && (
            <ClassDetailView masterClass={selectedClass} availableSubclasses={compendiumSubclasses.filter(sc => sc.classId === selectedClass.entityKey)} />
          )}
          {!loading && activeTab === 'races' && selectedRace && (
            <RaceDetailView race={selectedRace} />
          )}
          {!loading && activeTab === 'spells' && !selectedSpell && (
            <div className="compendium-detail-placeholder">
              <Sparkles size={40} strokeWidth={1.2} aria-hidden />
              <p>Select a spell from the list.</p>
            </div>
          )}
          {!loading && activeTab === 'items' && !selectedItem && (
            <div className="compendium-detail-placeholder">
              <Package size={40} strokeWidth={1.2} aria-hidden />
              <p>Select an item from the list.</p>
            </div>
          )}
          {!loading && activeTab === 'classes' && !selectedClass && (
            <div className="compendium-detail-placeholder">
              <User size={40} strokeWidth={1.2} aria-hidden />
              <p>Select a class from the list.</p>
            </div>
          )}
          {!loading && activeTab === 'races' && !selectedRace && (
            <div className="compendium-detail-placeholder">
              <Shield size={40} strokeWidth={1.2} aria-hidden />
              <p>Select a race from the list.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
