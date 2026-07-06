import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import { createEmptyAttack, createEmptySubclass } from '../../data/attackSchema';
import type { IAttack, ISubclass } from '../../types';
import type { IDamageModEditorProps, IAttackEditorProps, ISubclassManagerProps } from '../../types/campaign';

import './SubclassManager.css';

const DAMAGE_TYPES = [
  'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
  'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder',
];

const DAMAGE_MOD_KEYS = ['resistances', 'immunities', 'vulnerabilities'] as const;

const normDamageType = (t: string) => (t || '').toLowerCase().trim();

function DamageModEditor({ label, items, onChange, pillClass }: IDamageModEditorProps) {
  const [draft, setDraft] = useState('');

  const addType = (val: string) => {
    if (!val || items.some((item) => normDamageType(item) === normDamageType(val))) return;
    onChange([...items, val]);
    setDraft('');
  };

  return (
    <div className="subclass-mod-row">
      <span className="subclass-mod-label">{label}</span>
      <div className="subclass-mod-pills">
        <select
          className="input pill-select-add"
          value={draft}
          onChange={(e) => addType(e.target.value)}
        >
          <option value="">Select a damage type</option>
          {DAMAGE_TYPES.filter((t) => !items.some((item) => normDamageType(item) === normDamageType(t))).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {items.map((item) => (
          <span
            key={item}
            className={`damage-pill ${pillClass}`}
            onClick={() => onChange(items.filter((x) => x !== item))}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onChange(items.filter((x) => x !== item))}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function AttackEditor({ attack, onChange, onRemove }: IAttackEditorProps) {
  const update = (patch: Partial<IAttack>) => onChange({ ...attack, ...patch });
  const updateDamage = (dIdx: number, patch: Partial<IAttack['damage'][number]>) => {
    const damage = [...(attack.damage || [])];
    damage[dIdx] = { ...damage[dIdx], ...patch };
    update({ damage });
  };

  return (
    <div className="structured-attack-card subclass-attack-card">
      <div className="subclass-attack-header">
        <input className="input" placeholder="Attack name" value={attack.name || ''} onChange={(e) => update({ name: e.target.value })} />
        <select className="input" value={attack.type || 'melee'} onChange={(e) => update({ type: e.target.value })}>
          <option value="melee">Melee</option>
          <option value="ranged">Ranged</option>
          <option value="melee/ranged">Melee/Ranged</option>
        </select>
        <button type="button" className="app-icon-btn" onClick={onRemove} aria-label="Remove attack">
          <Trash2 className="icon-sm" />
        </button>
      </div>
      <div className="subclass-attack-fields">
        <label>
          To Hit
          <input type="number" className="input" value={attack.toHit ?? ''} onChange={(e) => update({ toHit: e.target.value === '' ? null : parseInt(e.target.value, 10) })} />
        </label>
        <label>
          DC
          <input type="number" className="input" value={attack.dc ?? ''} onChange={(e) => update({ dc: e.target.value === '' ? null : parseInt(e.target.value, 10) })} />
        </label>
        <label>
          Save
          <select className="input" value={attack.save || ''} onChange={(e) => update({ save: e.target.value || null })}>
            <option value="">None</option>
            {['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {(attack.damage || []).map((dmg, dIdx) => (
        <div key={dIdx} className="subclass-damage-row">
          <input className="input" placeholder="Formula (1d8+2)" value={dmg.formula || ''} onChange={(e) => updateDamage(dIdx, { formula: e.target.value })} />
          <select className="input" value={dmg.type || 'slashing'} onChange={(e) => updateDamage(dIdx, { type: e.target.value })}>
            {DAMAGE_TYPES.map((t) => <option key={t} value={t.toLowerCase()}>{t}</option>)}
          </select>
        </div>
      ))}
      <textarea className="input" placeholder="Description / flavor" value={attack.description || ''} onChange={(e) => update({ description: e.target.value })} rows={2} />
      <label className="subclass-checkbox-row">
        <input type="checkbox" checked={!!attack.halfOnSuccess} onChange={(e) => update({ halfOnSuccess: e.target.checked })} />
        Half damage on successful save
      </label>
    </div>
  );
}

export default function SubclassManager({ subclasses = [], updateSubclasses }: ISubclassManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [traitName, setTraitName] = useState('');
  const [traitDesc, setTraitDesc] = useState('');
  const [expandedTraits, setExpandedTraits] = useState<Record<number, boolean>>({});

  const selected = subclasses.find((s) => s.id === selectedId) ?? null;

  const updateSelected = (patch: Partial<ISubclass>) => {
    if (!selected) return;
    updateSubclasses(subclasses.map((s) => (s.id === selected.id ? { ...s, ...patch } : s)));
  };

  const updateDamageModCategory = (category: typeof DAMAGE_MOD_KEYS[number], newItems: string[]) => {
    if (!selected) return;

    const oldItems = selected[category] || [];
    const added = newItems.filter(
      (t) => !oldItems.some((o) => normDamageType(o) === normDamageType(t)),
    );

    const patch: Partial<ISubclass> = { [category]: newItems };

    if (added.length > 0) {
      DAMAGE_MOD_KEYS.filter((k) => k !== category).forEach((key) => {
        patch[key] = (selected[key] || []).filter(
          (t) => !added.some((a) => normDamageType(a) === normDamageType(t)),
        );
      });
    }

    updateSelected(patch);
  };

  const selectSubclass = (id: string) => {
    setSelectedId(id);
    setIsEditing(false);
    setExpandedTraits({});
  };

  const addSubclass = () => {
    const sub = createEmptySubclass();
    updateSubclasses([...subclasses, sub]);
    setSelectedId(sub.id);
    setIsEditing(true);
  };

  const removeSubclass = (id: string) => {
    if (!window.confirm('Delete this subclass?')) return;
    const next = subclasses.filter((s) => s.id !== id);
    updateSubclasses(next);
    setSelectedId(next[0]?.id ?? null);
    setIsEditing(false);
  };

  const addTrait = () => {
    if (!traitName.trim() || !selected) return;
    updateSelected({
      passiveTraits: [
        ...(selected.passiveTraits || []),
        { name: traitName.trim(), description: traitDesc.trim() },
      ],
    });
    setTraitName('');
    setTraitDesc('');
  };

  const addAbility = () => {
    if (!selected) return;
    updateSelected({ abilities: [...(selected.abilities || []), createEmptyAttack()] });
  };

  const toggleTraitExpanded = (index: number) => {
    setExpandedTraits((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="subclass-manager stack">
      <div className="app-page-header mb-4">
        <h2 className="app-page-title">Subclasses customizadas</h2>
      </div>

      <div className="subclass-layout">
        <aside className="subclass-list glass-panel">
          <p className="app-section-title">Subclasses</p>
          <div className="stack-sm">
            {subclasses.length === 0 && (
              <p className="subclass-empty m-0">Nenhuma subclasse ainda.</p>
            )}
            {subclasses.map((sub) => (
              <button
                key={sub.id}
                type="button"
                className={`subclass-list-item ${sub.id === selectedId ? 'active' : ''}`}
                onClick={() => selectSubclass(sub.id)}
              >
                <strong>{sub.name || 'Sem título'}</strong>
                {sub.baseClass && <span>{sub.baseClass}</span>}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={addSubclass}
          >
            <Plus className="icon-sm" aria-hidden />
            Nova Subclasse
          </button>
        </aside>

        {selected ? (
          <div className="subclass-editor glass-panel stack-lg">
            <div className="subclass-editor-header">
              <div className="stack text-center">
                <h3 className="app-page-title app-page-title--sm">{selected.name || 'Subclass'}</h3>
                {selected.baseClass && (
                  <p className="m-0 text-sm text-muted">{selected.baseClass}</p>
                )}
              </div>
              <div className="app-button-row">
                {!isEditing ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-with-icon"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="icon-sm" aria-hidden />
                    Editar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Concluir edição
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-with-icon"
                  onClick={() => removeSubclass(selected.id)}
                >
                  <Trash2 className="icon-sm" aria-hidden />
                  Delete
                </button>
              </div>
            </div>

            {!isEditing ? (
              <div className="stack-lg">
                {selected.description && (
                  <section className="app-section">
                    <h4 className="app-section-title">Description</h4>
                    <p className="app-prose m-0">{selected.description}</p>
                  </section>
                )}

                <section className="app-section">
                  <h4 className="app-section-title">Passive Traits</h4>
                  <div className="stack">
                    {(selected.passiveTraits || []).length === 0 && (
                      <p className="subclass-empty m-0">No traits defined.</p>
                    )}
                    {(selected.passiveTraits || []).map((trait, idx) => {
                      const open = !!expandedTraits[idx];
                      return (
                        <div key={`${trait.name}-${idx}`} className="subclass-trait-item">
                          <button
                            type="button"
                            className="subclass-trait-toggle"
                            onClick={() => toggleTraitExpanded(idx)}
                          >
                            <strong className="text-primary">{trait.name}</strong>
                            {open ? (
                              <ChevronUp className="icon-sm" />
                            ) : (
                              <ChevronDown className="icon-sm" />
                            )}
                          </button>
                          {open && trait.description && (
                            <p className="app-prose mt-4 mb-0">{trait.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="app-section">
                  <h4 className="app-section-title">Abilities</h4>
                  <div className="stack">
                    {(selected.abilities || []).length === 0 && (
                      <p className="subclass-empty m-0">No attacks defined.</p>
                    )}
                    {(selected.abilities || []).map((atk, idx) => (
                      <div key={atk.id || idx} className="subclass-trait-item">
                        <strong>{atk.name || 'Unnamed attack'}</strong>
                        {atk.description && (
                          <p className="app-prose mt-4 mb-0">{atk.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="stack-lg">
                <div className="subclass-form-grid">
                  <label>
                    Name
                    <input className="input" value={selected.name} onChange={(e) => updateSelected({ name: e.target.value })} />
                  </label>
                  <label>
                    Base Class
                    <input className="input" value={selected.baseClass || ''} onChange={(e) => updateSelected({ baseClass: e.target.value })} placeholder="e.g. Wizard" />
                  </label>
                  <label>
                    Resource Trait
                    <select className="input" value={selected.resourceTrait || 'standard'} onChange={(e) => updateSelected({ resourceTrait: e.target.value })}>
                      <option value="standard">Standard (Mana)</option>
                      <option value="vampire">Blood Magic (HP)</option>
                    </select>
                  </label>
                </div>

                <label className="subclass-full-field">
                  Description
                  <textarea className="input" rows={3} value={selected.description || ''} onChange={(e) => updateSelected({ description: e.target.value })} />
                </label>

                <section className="subclass-section subclass-section--flush">
                  <h4 className="app-section-title">Damage Modifiers</h4>
                  <DamageModEditor label="Resistances" items={selected.resistances || []} pillClass="pill-resistance" onChange={(v) => updateDamageModCategory('resistances', v)} />
                  <DamageModEditor label="Immunities" items={selected.immunities || []} pillClass="pill-immunity" onChange={(v) => updateDamageModCategory('immunities', v)} />
                  <DamageModEditor label="Vulnerabilities" items={selected.vulnerabilities || []} pillClass="pill-vulnerability" onChange={(v) => updateDamageModCategory('vulnerabilities', v)} />
                  <p className="subclass-hint">Each damage type can only be in one modifier list — latest selection wins.</p>
                </section>

                <section className="subclass-section subclass-section--flush">
                  <h4 className="app-section-title">Passive Traits</h4>
                  <div className="subclass-trait-list">
                    {(selected.passiveTraits || []).map((trait, idx) => (
                      <div key={idx} className="subclass-trait-item">
                        <strong>{trait.name}</strong>
                        <p className="app-prose mt-2 mb-0">{trait.description}</p>
                        <button
                          type="button"
                          className="app-icon-btn"
                          onClick={() =>
                            updateSelected({
                              passiveTraits: selected.passiveTraits.filter((_, i) => i !== idx),
                            })
                          }
                          aria-label="Remove trait"
                        >
                          <Trash2 className="icon-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="subclass-trait-add">
                    <input className="input" placeholder="Trait name" value={traitName} onChange={(e) => setTraitName(e.target.value)} />
                    <input className="input" placeholder="Description" value={traitDesc} onChange={(e) => setTraitDesc(e.target.value)} />
                    <button type="button" className="btn btn-secondary btn-with-icon" onClick={addTrait}>
                      <Plus className="icon-sm" aria-hidden />
                      Add Trait
                    </button>
                  </div>
                </section>

                <section className="subclass-section subclass-section--flush">
                  <div className="subclass-section-header">
                    <h4 className="app-section-title m-0">Abilities / Attacks</h4>
                    <button type="button" className="btn btn-secondary btn-with-icon" onClick={addAbility}>
                      <Plus className="icon-sm" aria-hidden />
                      Add Attack
                    </button>
                  </div>
                  {(selected.abilities || []).map((atk, idx) => (
                    <AttackEditor
                      key={atk.id || idx}
                      attack={atk}
                      onChange={(next) => {
                        const abilities = [...(selected.abilities || [])];
                        abilities[idx] = next;
                        updateSelected({ abilities });
                      }}
                      onRemove={() =>
                        updateSelected({
                          abilities: (selected.abilities || []).filter((_, i) => i !== idx),
                        })
                      }
                    />
                  ))}
                </section>
              </div>
            )}
          </div>
        ) : (
          <div className="subclass-editor glass-panel subclass-empty-editor">
            <p className="text-secondary">
              Escolha uma subclasse na lista ao lado ou crie uma nova para ver detalhes e editar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
