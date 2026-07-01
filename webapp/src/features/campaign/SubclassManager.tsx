import { useState } from 'react';
import './SubclassManager.css';
import { createEmptyAttack, createEmptySubclass } from '../../data/attackSchema';

const DAMAGE_TYPES = [
  'Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning',
  'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder',
];

const DAMAGE_MOD_KEYS = ['resistances', 'immunities', 'vulnerabilities'];

import type { IAttack, ISubclass } from '../../types';
import type { IDamageModEditorProps, IAttackEditorProps, ISubclassManagerProps } from '../../types/campaign';

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
          {DAMAGE_TYPES.filter(t => !items.some((item) => normDamageType(item) === normDamageType(t))).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {items.map((item) => (
          <span key={item} className={`damage-pill ${pillClass}`} onClick={() => onChange(items.filter(x => x !== item))}>
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
        <button type="button" className="delete-btn" onClick={onRemove}>×</button>
      </div>
      <div className="subclass-attack-fields">
        <label>
          To Hit
          <input type="number" className="input" value={attack.toHit ?? ''} onChange={(e) => update({ toHit: e.target.value === '' ? null : parseInt(e.target.value) })} />
        </label>
        <label>
          DC
          <input type="number" className="input" value={attack.dc ?? ''} onChange={(e) => update({ dc: e.target.value === '' ? null : parseInt(e.target.value) })} />
        </label>
        <label>
          Save
          <select className="input" value={attack.save || ''} onChange={(e) => update({ save: e.target.value || null })}>
            <option value="">None</option>
            {['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {(attack.damage || []).map((dmg, dIdx) => (
        <div key={dIdx} className="subclass-damage-row">
          <input className="input" placeholder="Formula (1d8+2)" value={dmg.formula || ''} onChange={(e) => updateDamage(dIdx, { formula: e.target.value })} />
          <select className="input" value={dmg.type || 'slashing'} onChange={(e) => updateDamage(dIdx, { type: e.target.value })}>
            {DAMAGE_TYPES.map(t => <option key={t} value={t.toLowerCase()}>{t}</option>)}
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
  const [selectedId, setSelectedId] = useState(subclasses[0]?.id || null);
  const [traitName, setTraitName] = useState('');
  const [traitDesc, setTraitDesc] = useState('');

  const selected = subclasses.find(s => s.id === selectedId) || null;

  const updateSelected = (patch) => {
    if (!selected) return;
    updateSubclasses(subclasses.map(s => s.id === selected.id ? { ...s, ...patch } : s));
  };

  /** One damage type can only live in one modifier list; latest selection wins. */
  const updateDamageModCategory = (category, newItems) => {
    if (!selected) return;

    const oldItems = selected[category] || [];
    const added = newItems.filter(
      (t) => !oldItems.some((o) => normDamageType(o) === normDamageType(t))
    );

    const patch = { [category]: newItems };

    if (added.length > 0) {
      DAMAGE_MOD_KEYS.filter((k) => k !== category).forEach((key) => {
        patch[key] = (selected[key] || []).filter(
          (t) => !added.some((a) => normDamageType(a) === normDamageType(t))
        );
      });
    }

    updateSelected(patch);
  };

  const addSubclass = () => {
    const sub = createEmptySubclass();
    updateSubclasses([...subclasses, sub]);
    setSelectedId(sub.id);
  };

  const removeSubclass = (id) => {
    if (!window.confirm('Delete this subclass?')) return;
    const next = subclasses.filter(s => s.id !== id);
    updateSubclasses(next);
    setSelectedId(next[0]?.id || null);
  };

  const addTrait = () => {
    if (!traitName.trim()) return;
    updateSelected({
      passiveTraits: [...(selected.passiveTraits || []), { name: traitName.trim(), description: traitDesc.trim() }],
    });
    setTraitName('');
    setTraitDesc('');
  };

  const addAbility = () => {
    updateSelected({ abilities: [...(selected.abilities || []), createEmptyAttack()] });
  };

  return (
    <div className="subclass-manager">
      <div className="manager-header">
        <h2>Custom Subclasses</h2>
        <button type="button" className="btn btn-primary" onClick={addSubclass}>+ New Subclass</button>
      </div>

      <div className="subclass-layout">
        <aside className="subclass-list glass-panel">
          {subclasses.length === 0 && (
            <p className="subclass-empty">No subclasses yet.</p>
          )}
          {subclasses.map((sub) => (
            <button
              key={sub.id}
              type="button"
              className={`subclass-list-item ${sub.id === selectedId ? 'active' : ''}`}
              onClick={() => setSelectedId(sub.id)}
            >
              <strong>{sub.name}</strong>
              {sub.baseClass && <span>{sub.baseClass}</span>}
            </button>
          ))}
        </aside>

        {selected ? (
          <div className="subclass-editor glass-panel">
            <div className="subclass-editor-header">
              <h3>Edit Subclass</h3>
              <button type="button" className="btn btn-secondary" onClick={() => removeSubclass(selected.id)}>Delete</button>
            </div>

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
              <textarea className="input" rows={2} value={selected.description || ''} onChange={(e) => updateSelected({ description: e.target.value })} />
            </label>

            <section className="subclass-section">
              <h4>Damage Modifiers (Data Override)</h4>
              <DamageModEditor label="Resistances" items={selected.resistances || []} pillClass="pill-resistance" onChange={(v) => updateDamageModCategory('resistances', v)} />
              <DamageModEditor label="Immunities" items={selected.immunities || []} pillClass="pill-immunity" onChange={(v) => updateDamageModCategory('immunities', v)} />
              <DamageModEditor label="Vulnerabilities" items={selected.vulnerabilities || []} pillClass="pill-vulnerability" onChange={(v) => updateDamageModCategory('vulnerabilities', v)} />
              <p className="subclass-hint">Each damage type can only be resistant, immune, or vulnerable — the last selection wins. Subclass vulnerabilities also override base player resistances/immunities in combat.</p>
            </section>

            <section className="subclass-section">
              <h4>Passive Traits</h4>
              <div className="subclass-trait-list">
                {(selected.passiveTraits || []).map((trait, idx) => (
                  <div key={idx} className="subclass-trait-item">
                    <strong>{trait.name}</strong>
                    <p>{trait.description}</p>
                    <button type="button" className="delete-btn" onClick={() => updateSelected({ passiveTraits: selected.passiveTraits.filter((_, i) => i !== idx) })}>×</button>
                  </div>
                ))}
              </div>
              <div className="subclass-trait-add">
                <input className="input" placeholder="Trait name" value={traitName} onChange={(e) => setTraitName(e.target.value)} />
                <input className="input" placeholder="Description" value={traitDesc} onChange={(e) => setTraitDesc(e.target.value)} />
                <button type="button" className="btn btn-secondary" onClick={addTrait}>+ Add Trait</button>
              </div>
            </section>

            <section className="subclass-section">
              <div className="subclass-section-header">
                <h4>Abilities / Attacks</h4>
                <button type="button" className="btn btn-secondary" onClick={addAbility}>+ Add Attack</button>
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
                  onRemove={() => updateSelected({ abilities: (selected.abilities || []).filter((_, i) => i !== idx) })}
                />
              ))}
            </section>
          </div>
        ) : (
          <div className="subclass-editor glass-panel subclass-empty-editor">
            <p>Select or create a subclass to edit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
