import React, { useState } from 'react'
import type { IBuff } from '@/types'

export interface IBuffsSubTabProps {
  buffsDatabase: IBuff[]
  updateBuffsDatabase: (buffs: IBuff[]) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defaultBuffDraft = (): any => ({
  id: Date.now().toString(),
  name: 'New Buff/Debuff',
  description: '',
  type: 'fixed',
  oncePerRest: 'none',
  additionalDamage: '',
  additionalAC: 0,
  dodge: false,
  extraMovement: 0,
  extraAction: false,
  advantageAttack: false,
  disadvantageAttack: false,
  advantageSave: false,
  advantageSaveStats: {} as Record<string, boolean>,
  disadvantageSave: false,
  disadvantageSaveStats: {} as Record<string, boolean>,
  savingThrowBonus: 0,
  turnType: 'healHP',
  turnFormula: '1d6',
})

export default function BuffsSubTab({
  buffsDatabase,
  updateBuffsDatabase,
}: IBuffsSubTabProps) {
  const [buffSearchTerm, setBuffSearchTerm] = useState('')
  const [editingBuffId, setEditingBuffId] = useState<string | null>(null)
  const [buffDraft, setBuffDraft] = useState<any>(null)

  const startCreateBuff = () => {
    setBuffDraft(defaultBuffDraft())
    setEditingBuffId('new')
  }

  const startEditBuff = (buff: any) => {
    setBuffDraft({
      id: buff.id,
      name: buff.name || '',
      description: buff.description || '',
      type: buff.type || 'toggle',
      oncePerRest: buff.oncePerRest || 'none',
      additionalDamage: buff.additionalDamage || '',
      additionalAC: buff.additionalAC || 0,
      dodge: buff.dodge || false,
      extraMovement: buff.extraMovement || 0,
      extraAction: buff.extraAction || false,
      advantageAttack: buff.advantageAttack || false,
      disadvantageAttack: buff.disadvantageAttack || false,
      advantageSave: buff.advantageSave || false,
      advantageSaveStats: buff.advantageSaveStats || {},
      disadvantageSave: buff.disadvantageSave || false,
      disadvantageSaveStats: buff.disadvantageSaveStats || {},
      savingThrowBonus: buff.savingThrowBonus || 0,
      turnType: buff.turnType || 'healHP',
      turnFormula: buff.turnFormula || '1d6',
    })
    setEditingBuffId(buff.id)
  }

  const saveBuff = () => {
    if (!buffDraft?.name?.trim()) {
      alert('Buff name is required!')
      return
    }
    if (editingBuffId === 'new') {
      updateBuffsDatabase([...buffsDatabase, buffDraft])
    } else {
      updateBuffsDatabase(
        buffsDatabase.map(b => (b.id === editingBuffId ? buffDraft : b)),
      )
    }
    setEditingBuffId(null)
    setBuffDraft(null)
  }

  const cancelBuffEdit = () => {
    setEditingBuffId(null)
    setBuffDraft(null)
  }

  const deleteBuff = (id: string) => {
    if (window.confirm('Delete this Buff/Debuff from the database?')) {
      updateBuffsDatabase(buffsDatabase.filter(b => b.id !== id))
      if (editingBuffId === id) {
        setEditingBuffId(null)
        setBuffDraft(null)
      }
    }
  }

  const renderBuffEditor = () => {
    if (!editingBuffId || !buffDraft) return null
    return (
      <div
        className="buff-editor-panel glass-panel"
        style={{
          padding: '1rem',
          border: '1px solid var(--primary)',
          background: 'rgba(255, 255, 255, 0.02)',
          margin: '0.5rem 0',
          textAlign: 'left',
        }}>
        <h3>
          {editingBuffId === 'new' ? 'Create Buff/Debuff' : 'Edit Buff/Debuff'}
        </h3>
        <div
          className="detail-mods-grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1rem',
          }}>
          <div className="combat-stat-box">
            <label>Name</label>
            <input
              type="text"
              className="input"
              value={buffDraft.name}
              onChange={e =>
                setBuffDraft({ ...buffDraft, name: e.target.value })
              }
            />
          </div>
          <div className="combat-stat-box">
            <label>Type</label>
            <select
              className="input"
              value={buffDraft.type}
              onChange={e =>
                setBuffDraft({ ...buffDraft, type: e.target.value })
              }>
              <option value="toggle">Toggle (Active/Inactive toggle)</option>
              <option value="turn">Turn (Triggers once per turn)</option>
              <option value="fixed">Fixed (Passive / Constant effect)</option>
            </select>
          </div>
          <div className="combat-stat-box">
            <label>Rest Limitation</label>
            <select
              className="input"
              value={buffDraft.oncePerRest || 'none'}
              onChange={e =>
                setBuffDraft({ ...buffDraft, oncePerRest: e.target.value })
              }>
              <option value="none">No Limit (Can toggle/use freely)</option>
              <option value="short">Once per Short Rest</option>
              <option value="long">Once per Long Rest</option>
            </select>
          </div>
        </div>

        <div className="combat-stat-box" style={{ marginTop: '1rem' }}>
          <label>Description</label>
          <textarea
            className="input rp-textarea"
            style={{ width: '100%', minHeight: '60px' }}
            value={buffDraft.description}
            onChange={e =>
              setBuffDraft({ ...buffDraft, description: e.target.value })
            }
          />
        </div>

        {(buffDraft.type === 'toggle' || buffDraft.type === 'fixed') && (
          <div
            style={{
              marginTop: '1rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '1rem',
            }}>
            <h4>Toggle/Fixed Properties</h4>
            <div
              className="detail-mods-grid"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                marginTop: '0.5rem',
              }}>
              <div className="combat-stat-box">
                <label>AC Modifier</label>
                <input
                  type="number"
                  className="input"
                  value={buffDraft.additionalAC || 0}
                  onChange={e =>
                    setBuffDraft({
                      ...buffDraft,
                      additionalAC: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="combat-stat-box">
                <label>Extra Damage Formula (e.g. 1d4)</label>
                <input
                  type="text"
                  className="input"
                  value={buffDraft.additionalDamage || ''}
                  placeholder="e.g. 1d4 or 2"
                  onChange={e =>
                    setBuffDraft({
                      ...buffDraft,
                      additionalDamage: e.target.value,
                    })
                  }
                />
              </div>
              <div className="combat-stat-box">
                <label>Extra Movement speed</label>
                <input
                  type="number"
                  className="input"
                  value={buffDraft.extraMovement || 0}
                  onChange={e =>
                    setBuffDraft({
                      ...buffDraft,
                      extraMovement: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="combat-stat-box">
                <label>Saving Throw Bonus</label>
                <input
                  type="number"
                  className="input"
                  value={buffDraft.savingThrowBonus || 0}
                  onChange={e =>
                    setBuffDraft({
                      ...buffDraft,
                      savingThrowBonus: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                marginTop: '1rem',
              }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}>
                <input
                  type="checkbox"
                  checked={buffDraft.dodge || false}
                  onChange={e =>
                    setBuffDraft({ ...buffDraft, dodge: e.target.checked })
                  }
                />
                Dodge (gives disadvantage on attacks against target)
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}>
                <input
                  type="checkbox"
                  checked={buffDraft.extraAction || false}
                  onChange={e =>
                    setBuffDraft({
                      ...buffDraft,
                      extraAction: e.target.checked,
                    })
                  }
                />
                Extra Action
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}>
                <input
                  type="checkbox"
                  checked={buffDraft.advantageAttack || false}
                  onChange={e =>
                    setBuffDraft({
                      ...buffDraft,
                      advantageAttack: e.target.checked,
                    })
                  }
                />
                Advantage on Attack rolls
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}>
                <input
                  type="checkbox"
                  checked={buffDraft.disadvantageAttack || false}
                  onChange={e =>
                    setBuffDraft({
                      ...buffDraft,
                      disadvantageAttack: e.target.checked,
                    })
                  }
                />
                Disadvantage on Attack rolls
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}>
                <input
                  type="checkbox"
                  checked={buffDraft.advantageSave || false}
                  onChange={e =>
                    setBuffDraft({
                      ...buffDraft,
                      advantageSave: e.target.checked,
                    })
                  }
                />
                Advantage on Saving Throws
              </label>
              {buffDraft.advantageSave && (
                <div
                  style={{
                    marginLeft: '1.5rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginTop: '0.25rem',
                    marginBottom: '0.5rem',
                  }}>
                  {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => (
                    <label
                      key={stat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px',
                      }}>
                      <input
                        type="checkbox"
                        checked={buffDraft.advantageSaveStats?.[stat] ?? false}
                        onChange={e => {
                          const current = buffDraft.advantageSaveStats || {}
                          setBuffDraft({
                            ...buffDraft,
                            advantageSaveStats: {
                              ...current,
                              [stat]: e.target.checked,
                            },
                          })
                        }}
                      />
                      {stat.toUpperCase()}
                    </label>
                  ))}
                </div>
              )}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}>
                <input
                  type="checkbox"
                  checked={buffDraft.disadvantageSave || false}
                  onChange={e =>
                    setBuffDraft({
                      ...buffDraft,
                      disadvantageSave: e.target.checked,
                    })
                  }
                />
                Disadvantage on Saving Throws
              </label>
              {buffDraft.disadvantageSave && (
                <div
                  style={{
                    marginLeft: '1.5rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginTop: '0.25rem',
                    marginBottom: '0.5rem',
                  }}>
                  {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => (
                    <label
                      key={stat}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px',
                      }}>
                      <input
                        type="checkbox"
                        checked={
                          buffDraft.disadvantageSaveStats?.[stat] ?? false
                        }
                        onChange={e => {
                          const current = buffDraft.disadvantageSaveStats || {}
                          setBuffDraft({
                            ...buffDraft,
                            disadvantageSaveStats: {
                              ...current,
                              [stat]: e.target.checked,
                            },
                          })
                        }}
                      />
                      {stat.toUpperCase()}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {buffDraft.type === 'turn' && (
          <div
            style={{
              marginTop: '1rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '1rem',
            }}>
            <h4>Turn Property</h4>
            <div
              className="detail-mods-grid"
              style={{
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '0.5rem',
              }}>
              <div className="combat-stat-box">
                <label>Turn Effect Type</label>
                <select
                  className="input"
                  value={buffDraft.turnType}
                  onChange={e =>
                    setBuffDraft({ ...buffDraft, turnType: e.target.value })
                  }>
                  <option value="healHP">Heal HP</option>
                  <option value="damageHP">Damage HP (e.g. poison/burn)</option>
                  <option value="healTempHP">Gain Temp HP</option>
                  <option value="healMana">Heal Mana</option>
                  <option value="damageMana">Damage/Drain Mana</option>
                </select>
              </div>
              <div className="combat-stat-box">
                <label>Dice Formula / Value (e.g. 1d6 or 5)</label>
                <input
                  type="text"
                  className="input"
                  value={buffDraft.turnFormula}
                  placeholder="e.g. 1d6 or 5"
                  onChange={e =>
                    setBuffDraft({ ...buffDraft, turnFormula: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: '1.25rem',
            justifyContent: 'flex-end',
          }}>
          <button className="btn btn-success" onClick={saveBuff}>
            Save
          </button>
          <button className="btn btn-secondary" onClick={cancelBuffEdit}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const filteredBuffs = buffsDatabase.filter(
    b =>
      b.name.toLowerCase().includes(buffSearchTerm.toLowerCase()) ||
      (b.description || '')
        .toLowerCase()
        .includes(buffSearchTerm.toLowerCase()),
  )

  return (
    <div className="db-subtab-container">
      <div className="library-header">
        <h2>Buffs & Debuffs Database</h2>
        <button className="btn btn-primary" onClick={startCreateBuff}>
          Create Buff/Debuff
        </button>
      </div>

      <div className="library-search-bar" style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          className="input search-input"
          placeholder="🔍 Search buffs & debuffs by name or description..."
          value={buffSearchTerm}
          onChange={e => setBuffSearchTerm(e.target.value)}
        />
      </div>

      <div className="library-table-container glass-panel">
        <table className="library-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Rest Limit</th>
              <th>Description</th>
              <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {editingBuffId === 'new' && buffDraft && (
              <tr className="buff-editor-row">
                <td colSpan={5} style={{ padding: '0.5rem 1rem' }}>
                  {renderBuffEditor()}
                </td>
              </tr>
            )}
            {filteredBuffs.map(b => (
              <React.Fragment key={b.id}>
                <tr className="monster-row">
                  <td>
                    <strong>{b.name}</strong>
                  </td>
                  <td>
                    <span
                      className={`class-badge ${b.type === 'turn' ? 'default' : b.type === 'toggle' ? 'boss' : 'enemy'}`}
                      style={{ textTransform: 'capitalize' }}>
                      {b.type}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color:
                          b.oncePerRest === 'none'
                            ? 'var(--text-muted)'
                            : 'var(--warning)',
                      }}>
                      {b.oncePerRest === 'short'
                        ? 'Once per Short Rest'
                        : b.oncePerRest === 'long'
                          ? 'Once per Long Rest'
                          : 'No Limit'}
                    </span>
                  </td>
                  <td
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                    }}>
                    {b.description}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      paddingRight: '1.5rem',
                      whiteSpace: 'nowrap',
                    }}>
                    <button
                      className="btn small-btn"
                      onClick={() => startEditBuff(b)}
                      style={{ marginRight: '0.4rem' }}>
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => deleteBuff(b.id)}>
                      ×
                    </button>
                  </td>
                </tr>
                {editingBuffId === b.id && buffDraft && (
                  <tr className="buff-editor-row">
                    <td colSpan={5} style={{ padding: '0.5rem 1rem' }}>
                      {renderBuffEditor()}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {buffsDatabase.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: 'var(--text-muted)',
                  }}>
                  No Buffs or Debuffs in the database. Click "Create
                  Buff/Debuff" to add one!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
