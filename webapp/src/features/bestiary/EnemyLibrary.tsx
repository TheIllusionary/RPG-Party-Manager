import React, { useState } from 'react'
import './EnemyLibrary.css'
import {
  parseAbilities,
  rollFormula,
  extractExtraEffects,
} from '../../shared/utils/combatUtils'
import type {
  IBestiaryReviewStatus,
  IEnemyLibraryProps,
} from '../../types/bestiary'
import type { IMonster } from '../../types'
import { useCompendiumMonsters } from '../../shared/hooks/useCompendiumMonsters'
import BuffsSubTab from './components/BuffsSubTab'
import MonsterDetailPreview from './components/MonsterDetailPreview'

const defaultMonsters = [] as IMonster[]

const CC_OPTIONS = [
  'Blind 🕶️',
  'Charmed ✨',
  'Deafened 🔇',
  'Frightened 😨',
  'Grappled ✊',
  'Incapacitated 😵',
  'Paralyzed ⏳',
  'Petrified 🗿',
  'Poisoned 🤢',
  'Prone 🛏️',
  'Restrained 🕸️',
  'Stunned 🌀',
  'Asleep 💤',
  'Slowed 🐢',
]

const mapToStandardCc = effect => {
  if (!effect) return ''
  const found = CC_OPTIONS.find(opt => {
    const baseWord = opt.split(' ')[0].toLowerCase()
    return effect.toLowerCase().includes(baseWord)
  })
  return found || 'custom'
}

const getCcDropdownState = atk => {
  if (atk.cc === 'custom') {
    return { dropdown: 'custom', customText: atk.ccCustom || '' }
  }
  if (atk.cc) {
    if (CC_OPTIONS.includes(atk.cc)) {
      return { dropdown: atk.cc, customText: '' }
    } else {
      const mapped = mapToStandardCc(atk.cc)
      if (mapped && mapped !== 'custom') {
        return { dropdown: mapped, customText: '' }
      }
      return { dropdown: 'custom', customText: atk.cc }
    }
  }
  if (atk.description) {
    const parsed = extractExtraEffects(atk.description)
    if (parsed) {
      const mapped = mapToStandardCc(parsed)
      if (mapped && mapped !== 'custom') {
        return { dropdown: mapped, customText: '' }
      }
      return { dropdown: 'custom', customText: parsed }
    }
  }
  return { dropdown: '', customText: '' }
}

const generateUniqueId = () =>
  Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5)

const DAMAGE_TYPES = [
  'Acid',
  'Bludgeoning',
  'Cold',
  'Fire',
  'Force',
  'Lightning',
  'Necrotic',
  'Piercing',
  'Poison',
  'Psychic',
  'Radiant',
  'Slashing',
  'Thunder',
]

export default function EnemyLibrary({
  library = [],
  updateLibrary = () => {},
  buffsDatabase = [],
  updateBuffsDatabase = () => {},
  bestiaryReview = {},
  updateBestiaryReview = () => {},
  bestiaryFavorites = [],
  updateBestiaryFavorites = () => {},
}: IEnemyLibraryProps) {
  const { monsters: compendiumMonsters, loading: loadingMonsters } =
    useCompendiumMonsters()
  const data = [...compendiumMonsters, ...library]
  const updateData = updateLibrary

  const [activeSubTab, setActiveSubTab] = useState('bestiary') // 'bestiary' | 'buffs' | 'items'
  const [buffSearchTerm, setBuffSearchTerm] = useState('')
  const [editingBuffId, setEditingBuffId] = useState(null)
  const [buffDraft, setBuffDraft] = useState(null)
  const [creatingMonster, setCreatingMonster] = useState(false)
  const [creatingNewMonsterId, setCreatingNewMonsterId] = useState<
    string | null
  >(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  React.useEffect(() => {
    // Self-heal corrupted library
    const hasDefaults = library.some((e: any) => e.isDefault)
    const uniqueIds = new Set()
    let hasDuplicates = false

    const cleanedLibrary = library.filter((e: any) => {
      if (e.isDefault) return false // strip leaked defaults
      if (uniqueIds.has(e.id)) {
        hasDuplicates = true
        return false
      }
      uniqueIds.add(e.id)
      return true
    })

    if (hasDefaults || hasDuplicates) {
      console.warn(
        'Bestiary self-healing: Removed',
        library.length - cleanedLibrary.length,
        'corrupted/duplicated monsters from library.',
      )
      updateLibrary(cleanedLibrary)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startCreateBuff = () => {
    setBuffDraft({
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
      advantageSaveStats: {},
      disadvantageSave: false,
      disadvantageSaveStats: {},
      savingThrowBonus: 0,
      turnType: 'healHP',
      turnFormula: '1d6',
    })
    setEditingBuffId('new')
  }

  const startEditBuff = buff => {
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
    if (!buffDraft.name.trim()) {
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

  const deleteBuff = id => {
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

        {/* Conditional Editor Fields based on Type */}
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

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(50)
  const [expandedEnemyId, setExpandedEnemyId] = useState(null)
  const [expandedOriginalName, setExpandedOriginalName] = useState('')
  const [detailsMonsterId, setDetailsMonsterId] = useState(null)
  const [previewRolls, setPreviewRolls] = useState({}) // { [monsterId]: rollResult }

  const toggleDetails = id => {
    if (detailsMonsterId === id) {
      setDetailsMonsterId(null)
    } else {
      setDetailsMonsterId(id)
      setExpandedEnemyId(null) // Close editor if open
    }
  }

  const rollPreviewAttack = (monsterId, attack) => {
    const d20 = Math.floor(Math.random() * 20) + 1
    const toHitBonus =
      attack.toHit !== undefined && attack.toHit !== null
        ? parseInt(attack.toHit)
        : 0
    const totalHit = d20 + toHitBonus
    const isCrit = d20 === 20

    const damageRolls = (attack.damage || []).map(dmg => {
      const result = rollFormula(dmg.formula, isCrit)
      return {
        formula: dmg.formula,
        type: dmg.type,
        total: result.total,
        rolls: result.rolls,
        modifier: result.modifier,
        critBonus: result.critBonus,
      }
    })

    setPreviewRolls(prev => ({
      ...prev,
      [monsterId]: {
        name: attack.name,
        d20,
        toHitBonus,
        totalHit,
        isCrit,
        damageRolls,
      },
    }))
  }

  const addEnemy = () => {
    if (creatingMonster) return
    setCreatingMonster(true)
    try {
      const newId = generateUniqueId()
      const newEnemy = {
        id: newId,
        name: 'New Monster',
        classType: 'Enemy',
        ac: 12,
        hpMax: 20,
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
        proficiency: 2,
        background: 'CR 1',
        abilities: '',
        features: '',
        isDefault: false,
      }
      updateData([...library, newEnemy])
      setExpandedEnemyId(newId)
      setExpandedOriginalName(newEnemy.name)
      setCreatingNewMonsterId(newId)
      setTimeout(() => {
        const el = document.getElementById(`monster-row-${newId}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setCreatingMonster(false)
      }, 300)
    } catch (e) {}
  }

  const updateEnemy = (id, field, value) => {
    updateData(library.map(e => (e.id === id ? { ...e, [field]: value } : e)))
  }

  const removeEnemy = id => {
    if (window.confirm('Delete this monster from the library?')) {
      if (expandedEnemyId === id) {
        setExpandedEnemyId(null)
        setExpandedOriginalName('')
      }
      updateData(library.filter(e => e.id !== id))
    }
  }

  const copyEnemy = enemy => {
    const newId = generateUniqueId()
    const copyName = `${enemy.name} (Copy)`
    const newEnemy = {
      ...enemy,
      id: newId,
      name: copyName,
      isDefault: false,
    }
    updateData([...library, newEnemy])
    setExpandedEnemyId(newId)
    setExpandedOriginalName(copyName)
  }

  const getSortName = e => {
    if (e.id === expandedEnemyId) {
      return expandedOriginalName || e.name
    }
    return e.name
  }

  const sortedData = [...defaultMonsters, ...data].sort((a, b) =>
    getSortName(a).localeCompare(getSortName(b)),
  )

  const filteredData = sortedData.filter(e => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.background || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFav = showFavoritesOnly
      ? bestiaryFavorites.includes(e.id)
      : true
    return matchesSearch && matchesFav
  })

  const totalPages =
    itemsPerPage === 'All'
      ? 1
      : Math.ceil(filteredData.length / (itemsPerPage as number))
  let paginatedData =
    itemsPerPage === 'All'
      ? filteredData
      : filteredData.slice(
          (currentPage - 1) * (itemsPerPage as number),
          currentPage * (itemsPerPage as number),
        )

  if (creatingNewMonsterId) {
    const newMonster = data.find(e => e.id === creatingNewMonsterId)
    if (newMonster && !paginatedData.some(e => e.id === creatingNewMonsterId)) {
      paginatedData = [newMonster, ...paginatedData]
      if (itemsPerPage !== 'All') paginatedData.pop()
    } else if (newMonster) {
      paginatedData = [
        newMonster,
        ...paginatedData.filter(e => e.id !== creatingNewMonsterId),
      ]
    }
  }

  const statsList = ['str', 'dex', 'con', 'int', 'wis', 'cha']
  const dndSkills = [
    { name: 'Acrobatics', stat: 'dex' },
    { name: 'Animal Handling', stat: 'wis' },
    { name: 'Arcana', stat: 'int' },
    { name: 'Athletics', stat: 'str' },
    { name: 'Deception', stat: 'cha' },
    { name: 'History', stat: 'int' },
    { name: 'Insight', stat: 'wis' },
    { name: 'Intimidation', stat: 'cha' },
    { name: 'Investigation', stat: 'int' },
    { name: 'Medicine', stat: 'wis' },
    { name: 'Nature', stat: 'int' },
    { name: 'Perception', stat: 'wis' },
    { name: 'Performance', stat: 'cha' },
    { name: 'Persuasion', stat: 'cha' },
    { name: 'Religion', stat: 'int' },
    { name: 'Sleight of Hand', stat: 'dex' },
    { name: 'Stealth', stat: 'dex' },
    { name: 'Survival', stat: 'wis' },
  ]

  const calculateModifier = score => Math.floor(((score || 10) - 10) / 2)
  const formatModifier = mod => (mod >= 0 ? `+${mod}` : `${mod}`)

  const renderPagination = (isTop = false) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem',
        borderTop: isTop ? 'none' : '1px solid rgba(255,255,255,0.1)',
        borderBottom: isTop ? '1px solid rgba(255,255,255,0.1)' : 'none',
      }}>
      <div>
        <span
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginRight: '1rem',
          }}>
          Showing{' '}
          {itemsPerPage === 'All'
            ? filteredData.length
            : Math.min(
                filteredData.length,
                (currentPage - 1) * (itemsPerPage as number) + 1,
              )}{' '}
          to{' '}
          {itemsPerPage === 'All'
            ? filteredData.length
            : Math.min(
                filteredData.length,
                currentPage * (itemsPerPage as number),
              )}{' '}
          of {filteredData.length} entries
        </span>
        <select
          className="input"
          style={{
            width: 'auto',
            padding: '0.2rem 0.5rem',
            display: 'inline-block',
          }}
          value={itemsPerPage}
          onChange={e => {
            setItemsPerPage(
              e.target.value === 'All' ? 'All' : Number(e.target.value),
            )
            setCurrentPage(1)
          }}>
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value="All">All</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          className="btn btn-secondary small-btn"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
          Previous
        </button>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 0.5rem',
            fontSize: '0.9rem',
          }}>
          Page
          <input
            type="number"
            className="input"
            style={{
              width: '3.5rem',
              textAlign: 'center',
              padding: '0.2rem',
              margin: '0 0.5rem',
              appearance: 'textfield',
              MozAppearance: 'textfield',
            }}
            value={currentPage}
            onChange={e => {
              let val = parseInt(e.target.value)
              if (e.target.value === '') {
                // Allow clearing temporarily while typing, but reset if blurred?
                // Best to just rely on integer parsing, but if blank, we can't update to NaN.
                // If blank we'll just ignore for the controlled input (it will revert immediately),
                // but if they highlight and replace, they need to be able to type.
              }
              if (!isNaN(val)) {
                if (val < 1) val = 1
                if (val > (totalPages || 1)) val = totalPages || 1
                setCurrentPage(val)
              }
            }}
          />
          of {totalPages || 1}
        </span>
        <button
          className="btn btn-secondary small-btn"
          disabled={currentPage >= totalPages || totalPages === 1}
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
          Next
        </button>
      </div>
    </div>
  )

  return (
    <div className="enemy-library-tab">
      {/* Database Tab Bar */}
      <div
        className="db-tabs-bar"
        style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '0.75rem',
          marginBottom: '1.25rem',
        }}>
        <button
          className={`btn ${activeSubTab === 'bestiary' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('bestiary')}>
          💀 Bestiary
        </button>
        <button
          className={`btn ${activeSubTab === 'buffs' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('buffs')}>
          ⚡ Buffs &amp; Debuffs
        </button>
        <button
          className={`btn ${activeSubTab === 'items' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('items')}>
          🛡️ Items
        </button>
      </div>

      {activeSubTab === 'items' && (
        <div
          className="db-subtab-container glass-panel"
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}>
          <h3>🛡️ Items Database</h3>
          <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>
            Work in progress — coming soon!
          </p>
        </div>
      )}

      {activeSubTab === 'buffs' && (
        <div className="db-subtab-container">
          <div className="library-header">
            <h2>Buffs &amp; Debuffs Database</h2>
            <button className="btn btn-primary" onClick={startCreateBuff}>
              + Create Buff/Debuff
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
                {buffsDatabase
                  .filter(
                    b =>
                      b.name
                        .toLowerCase()
                        .includes(buffSearchTerm.toLowerCase()) ||
                      (b.description || '')
                        .toLowerCase()
                        .includes(buffSearchTerm.toLowerCase()),
                  )
                  .map(b => (
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
                      No Buffs or Debuffs in the database. Click "+ Create
                      Buff/Debuff" to add one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'bestiary' && (
        <>
          <div className="library-header">
            <h2>Bestiary Database</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={addEnemy}
              disabled={creatingMonster}>
              {creatingMonster ? 'Creating…' : 'Create Monster'}
            </button>
          </div>

          <div
            className="library-search-bar"
            style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              className="input search-input"
              placeholder="🔍 Search monsters by name or type/CR..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className={`btn ${showFavoritesOnly ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly)
                setCurrentPage(1)
              }}
              style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
              ⭐ Favorites
            </button>
          </div>

          <div className="library-table-container glass-panel">
            {renderPagination(true)}
            <table className="library-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type / CR</th>
                  <th>Class</th>
                  <th>AC</th>
                  <th>Max HP</th>
                  <th>Review Status</th>
                  <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingMonsters && paginatedData.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: 'center',
                        padding: '2rem 0',
                        color: 'var(--text-muted)',
                      }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                        }}>
                        <span
                          className="spinner"
                          style={{ animation: 'spin 1s linear infinite' }}>
                          ⏳
                        </span>{' '}
                        Fetching data from server...
                      </div>
                    </td>
                  </tr>
                )}
                {paginatedData.map((enemy: any) => {
                  const isExpanded = expandedEnemyId === enemy.id
                  const miniSprite =
                    (enemy.classType || '').toLowerCase() === 'boss'
                      ? 'boss'
                      : 'enemy'
                  return (
                    <React.Fragment key={enemy.id}>
                      <tr
                        id={`monster-row-${enemy.id}`}
                        className={`monster-row ${isExpanded ? 'expanded-row' : ''}`}>
                        <td className="monster-name-cell">
                          <div
                            className="monster-name-avatar"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}>
                            <button
                              type="button"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                color: bestiaryFavorites.includes(enemy.id)
                                  ? '#fbbf24'
                                  : 'rgba(255,255,255,0.3)',
                                padding: 0,
                              }}
                              onClick={e => {
                                e.stopPropagation()
                                const newFavs = bestiaryFavorites.includes(
                                  enemy.id,
                                )
                                  ? bestiaryFavorites.filter(
                                      id => id !== enemy.id,
                                    )
                                  : [...bestiaryFavorites, enemy.id]
                                updateBestiaryFavorites(newFavs)
                              }}
                              title="Toggle Favorite">
                              {bestiaryFavorites.includes(enemy.id)
                                ? '⭐'
                                : '☆'}
                            </button>
                            <img
                              src={`./sprites/${miniSprite}.png`}
                              alt={enemy.classType}
                              className="monster-mini-sprite"
                            />
                            <strong>{enemy.name}</strong>
                          </div>
                        </td>
                        <td>{enemy.background || 'CR 1'}</td>
                        <td>
                          <span
                            className={`class-badge ${(enemy.classType || 'Enemy').toLowerCase()}`}>
                            {enemy.classType || 'Enemy'}
                          </span>
                        </td>
                        <td>🛡️ {enemy.ac}</td>
                        <td>❤️ {enemy.hpMax || 20}</td>
                        <td>
                          <select
                            value={String(bestiaryReview[enemy.id] ?? '')}
                            onChange={e =>
                              updateBestiaryReview({
                                ...bestiaryReview,
                                [enemy.id]: e.target
                                  .value as IBestiaryReviewStatus,
                              })
                            }
                            className={`review-status-select ${bestiaryReview[enemy.id] || 'blank'}`}>
                            <option value="">(Blank)</option>
                            <option value="in-progress">In Progress</option>
                            <option value="reviewed">Reviewed</option>
                          </select>
                        </td>
                        <td style={{ paddingRight: '1rem' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}>
                            <button
                              className="btn btn-secondary small-btn"
                              onClick={() => copyEnemy(enemy)}>
                              📋 Copy
                            </button>
                            <button
                              className="btn btn-secondary small-btn"
                              onClick={() => toggleDetails(enemy.id)}>
                              {detailsMonsterId === enemy.id
                                ? '▲ Collapse'
                                : '👁️ Details'}
                            </button>
                            {!enemy.isDefault ? (
                              <>
                                <button
                                  className="btn btn-secondary small-btn"
                                  onClick={() => {
                                    if (isExpanded) {
                                      if (enemy.id === creatingNewMonsterId) {
                                        setCreatingNewMonsterId(null)
                                        const futureFiltered =
                                          filteredData.filter(
                                            e => e.id !== creatingNewMonsterId,
                                          )
                                        const eNode = data.find(
                                          d => d.id === creatingNewMonsterId,
                                        )
                                        if (eNode) {
                                          const all = [
                                            ...futureFiltered,
                                            eNode,
                                          ].sort((a, b) =>
                                            getSortName(a).localeCompare(
                                              getSortName(b),
                                            ),
                                          )
                                          const idx = all.findIndex(
                                            d => d.id === creatingNewMonsterId,
                                          )
                                          if (
                                            idx !== -1 &&
                                            itemsPerPage !== 'All'
                                          ) {
                                            setCurrentPage(
                                              Math.floor(
                                                idx / (itemsPerPage as number),
                                              ) + 1,
                                            )
                                          }
                                        }
                                      }
                                      setExpandedEnemyId(null)
                                      setExpandedOriginalName('')
                                    } else {
                                      setExpandedEnemyId(enemy.id)
                                      setExpandedOriginalName(enemy.name)
                                      setDetailsMonsterId(null) // Close details drawer
                                    }
                                  }}>
                                  {isExpanded ? '▲ Collapse Edit' : '✏️ Edit'}
                                </button>
                                <button
                                  className="delete-btn"
                                  onClick={() => removeEnemy(enemy.id)}>
                                  ×
                                </button>
                              </>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-muted)',
                                  fontStyle: 'italic',
                                }}>
                                🔒 Default
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="detail-expanded-row">
                          <td colSpan={7}>
                            <div className="monster-detailed-editor glass-panel">
                              <div
                                className="editor-section-title"
                                style={{
                                  display: 'flex',
                                  gap: '1rem',
                                  alignItems: 'center',
                                  marginBottom: '1.5rem',
                                  flexWrap: 'wrap',
                                }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                  <label
                                    style={{
                                      display: 'block',
                                      fontSize: '0.75rem',
                                      color: 'var(--text-secondary)',
                                      textTransform: 'uppercase',
                                      marginBottom: '0.25rem',
                                    }}>
                                    Monster Name
                                  </label>
                                  <input
                                    type="text"
                                    className="input"
                                    value={enemy.name}
                                    onChange={e =>
                                      updateEnemy(
                                        enemy.id,
                                        'name',
                                        e.target.value,
                                      )
                                    }
                                    style={{
                                      margin: 0,
                                      width: '100%',
                                      fontSize: '1.1rem',
                                      fontWeight: 'bold',
                                    }}
                                  />
                                </div>
                                <div style={{ width: '120px' }}>
                                  <label
                                    style={{
                                      display: 'block',
                                      fontSize: '0.75rem',
                                      color: 'var(--text-secondary)',
                                      textTransform: 'uppercase',
                                      marginBottom: '0.25rem',
                                    }}>
                                    CR
                                  </label>
                                  <input
                                    type="text"
                                    className="input"
                                    value={enemy.cr || ''}
                                    onChange={e => {
                                      const val = e.target.value
                                      updateEnemy(enemy.id, 'cr', val)
                                      const currentBg = enemy.background || ''
                                      const typePart =
                                        currentBg.split(', CR ')[0] || ''
                                      updateEnemy(
                                        enemy.id,
                                        'background',
                                        typePart
                                          ? `${typePart}, CR ${val}`
                                          : `CR ${val}`,
                                      )
                                    }}
                                    style={{
                                      margin: 0,
                                      width: '100%',
                                      textAlign: 'center',
                                      fontSize: '1.1rem',
                                      fontWeight: 'bold',
                                    }}
                                    placeholder="e.g. 1/4"
                                  />
                                </div>
                              </div>

                              <div
                                className="rp-field full-width bestiary-abilities-field"
                                style={{ marginBottom: '1.25rem' }}>
                                <label
                                  style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    marginBottom: '0.25rem',
                                    fontWeight: 'bold',
                                  }}>
                                  Abilities
                                </label>
                                <textarea
                                  className="input rp-textarea"
                                  style={{
                                    width: '100%',
                                    minHeight: '120px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                    lineHeight: '1.4',
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    border:
                                      '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'var(--text-primary)',
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                  }}
                                  value={enemy.abilities || ''}
                                  onChange={e =>
                                    updateEnemy(
                                      enemy.id,
                                      'abilities',
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Actions, attacks, multiattacks..."
                                />
                              </div>

                              {/* Structured Attacks Editor */}
                              <div
                                className="rp-field full-width bestiary-attacks-editor"
                                style={{
                                  marginBottom: '1.25rem',
                                  borderTop:
                                    '1px solid rgba(255, 255, 255, 0.08)',
                                  paddingTop: '1rem',
                                }}>
                                <label
                                  style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    marginBottom: '0.5rem',
                                    fontWeight: 'bold',
                                  }}>
                                  Interactive Attacks (Overrides Raw Text
                                  Parser)
                                </label>

                                <div
                                  className="structured-attacks-list"
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                    marginBottom: '0.75rem',
                                  }}>
                                  {(enemy.attacks || []).map((atk, idx) => (
                                    <div
                                      key={idx}
                                      className="structured-attack-card"
                                      style={{
                                        background: 'rgba(0, 0, 0, 0.2)',
                                        border:
                                          '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '6px',
                                        padding: '0.75rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem',
                                      }}>
                                      <div
                                        style={{
                                          display: 'flex',
                                          gap: '0.5rem',
                                          alignItems: 'center',
                                        }}>
                                        <input
                                          type="text"
                                          className="input"
                                          placeholder="Attack Name (e.g. Bite)"
                                          value={atk.name}
                                          onChange={e => {
                                            const updated = [
                                              ...(enemy.attacks || []),
                                            ]
                                            updated[idx] = {
                                              ...atk,
                                              name: e.target.value,
                                            }
                                            updateEnemy(
                                              enemy.id,
                                              'attacks',
                                              updated,
                                            )
                                          }}
                                          style={{ margin: 0, flex: 2 }}
                                        />
                                        <select
                                          className="input"
                                          value={atk.type || 'melee'}
                                          onChange={e => {
                                            const updated = [
                                              ...(enemy.attacks || []),
                                            ]
                                            updated[idx] = {
                                              ...atk,
                                              type: e.target.value,
                                            }
                                            updateEnemy(
                                              enemy.id,
                                              'attacks',
                                              updated,
                                            )
                                          }}
                                          style={{ margin: 0, flex: 1 }}>
                                          <option value="melee">Melee</option>
                                          <option value="ranged">Ranged</option>
                                          <option value="melee/ranged">
                                            Melee/Ranged
                                          </option>
                                        </select>
                                        <button
                                          type="button"
                                          className="delete-btn"
                                          onClick={() => {
                                            const updated = (
                                              enemy.attacks || []
                                            ).filter((_, i) => i !== idx)
                                            updateEnemy(
                                              enemy.id,
                                              'attacks',
                                              updated,
                                            )
                                          }}
                                          style={{
                                            fontSize: '1.2rem',
                                            padding: '0.2rem 0.5rem',
                                          }}>
                                          ×
                                        </button>
                                      </div>

                                      <div
                                        style={{
                                          display: 'flex',
                                          gap: '0.5rem',
                                          flexWrap: 'wrap',
                                        }}>
                                        <div
                                          style={{ flex: 1, minWidth: '80px' }}>
                                          <label
                                            style={{
                                              fontSize: '0.7rem',
                                              color: 'var(--text-muted)',
                                              display: 'block',
                                              marginBottom: '0.1rem',
                                            }}>
                                            To Hit
                                          </label>
                                          <input
                                            type="number"
                                            className="input"
                                            value={
                                              atk.toHit !== undefined &&
                                              atk.toHit !== null
                                                ? atk.toHit
                                                : ''
                                            }
                                            onChange={e => {
                                              const updated = [
                                                ...(enemy.attacks || []),
                                              ]
                                              const val =
                                                e.target.value === ''
                                                  ? null
                                                  : parseInt(e.target.value)
                                              updated[idx] = {
                                                ...atk,
                                                toHit: val,
                                              }
                                              updateEnemy(
                                                enemy.id,
                                                'attacks',
                                                updated,
                                              )
                                            }}
                                            style={{ margin: 0 }}
                                            placeholder="e.g. 5"
                                          />
                                        </div>
                                        <div
                                          style={{ flex: 1, minWidth: '80px' }}>
                                          <label
                                            style={{
                                              fontSize: '0.7rem',
                                              color: 'var(--text-muted)',
                                              display: 'block',
                                              marginBottom: '0.1rem',
                                            }}>
                                            DC
                                          </label>
                                          <input
                                            type="number"
                                            className="input"
                                            value={
                                              atk.dc !== undefined &&
                                              atk.dc !== null
                                                ? atk.dc
                                                : ''
                                            }
                                            onChange={e => {
                                              const updated = [
                                                ...(enemy.attacks || []),
                                              ]
                                              const val =
                                                e.target.value === ''
                                                  ? null
                                                  : parseInt(e.target.value)
                                              updated[idx] = { ...atk, dc: val }
                                              updateEnemy(
                                                enemy.id,
                                                'attacks',
                                                updated,
                                              )
                                            }}
                                            style={{ margin: 0 }}
                                            placeholder="e.g. 15"
                                          />
                                        </div>
                                        <div
                                          style={{
                                            flex: 1,
                                            minWidth: '100px',
                                          }}>
                                          <label
                                            style={{
                                              fontSize: '0.7rem',
                                              color: 'var(--text-muted)',
                                              display: 'block',
                                              marginBottom: '0.1rem',
                                            }}>
                                            Save Type
                                          </label>
                                          <select
                                            className="input"
                                            value={atk.save || ''}
                                            onChange={e => {
                                              const updated = [
                                                ...(enemy.attacks || []),
                                              ]
                                              updated[idx] = {
                                                ...atk,
                                                save: e.target.value || null,
                                              }
                                              updateEnemy(
                                                enemy.id,
                                                'attacks',
                                                updated,
                                              )
                                            }}
                                            style={{ margin: 0 }}>
                                            <option value="">None</option>
                                            <option value="Strength">
                                              Strength
                                            </option>
                                            <option value="Dexterity">
                                              Dexterity
                                            </option>
                                            <option value="Constitution">
                                              Constitution
                                            </option>
                                            <option value="Intelligence">
                                              Intelligence
                                            </option>
                                            <option value="Wisdom">
                                              Wisdom
                                            </option>
                                            <option value="Charisma">
                                              Charisma
                                            </option>
                                          </select>
                                        </div>
                                        <div
                                          style={{ flex: 1, minWidth: '80px' }}>
                                          <label
                                            style={{
                                              fontSize: '0.7rem',
                                              color: 'var(--text-muted)',
                                              display: 'block',
                                              marginBottom: '0.1rem',
                                            }}>
                                            Reach
                                          </label>
                                          <input
                                            type="text"
                                            className="input"
                                            placeholder="e.g. 5 ft."
                                            value={
                                              typeof atk.reach === 'string'
                                                ? atk.reach
                                                : ''
                                            }
                                            onChange={e => {
                                              const updated = [
                                                ...(enemy.attacks || []),
                                              ]
                                              updated[idx] = {
                                                ...atk,
                                                reach: e.target.value,
                                              }
                                              updateEnemy(
                                                enemy.id,
                                                'attacks',
                                                updated,
                                              )
                                            }}
                                            style={{ margin: 0 }}
                                          />
                                        </div>
                                        <div
                                          style={{ flex: 1, minWidth: '80px' }}>
                                          <label
                                            style={{
                                              fontSize: '0.7rem',
                                              color: 'var(--text-muted)',
                                              display: 'block',
                                              marginBottom: '0.1rem',
                                            }}>
                                            Range
                                          </label>
                                          <input
                                            type="text"
                                            className="input"
                                            placeholder="e.g. 30/120 ft."
                                            value={
                                              typeof atk.range === 'string'
                                                ? atk.range
                                                : ''
                                            }
                                            onChange={e => {
                                              const updated = [
                                                ...(enemy.attacks || []),
                                              ]
                                              updated[idx] = {
                                                ...atk,
                                                range: e.target.value,
                                              }
                                              updateEnemy(
                                                enemy.id,
                                                'attacks',
                                                updated,
                                              )
                                            }}
                                            style={{ margin: 0 }}
                                          />
                                        </div>
                                      </div>

                                      <div
                                        style={{
                                          display: 'flex',
                                          gap: '0.5rem',
                                          flexWrap: 'wrap',
                                          marginTop: '0.2rem',
                                        }}>
                                        <div
                                          style={{
                                            flex: 1,
                                            minWidth: '150px',
                                          }}>
                                          <label
                                            style={{
                                              fontSize: '0.7rem',
                                              color: 'var(--text-muted)',
                                              display: 'block',
                                              marginBottom: '0.1rem',
                                            }}>
                                            Crowd Control (CC)
                                          </label>
                                          <select
                                            className="input"
                                            value={
                                              getCcDropdownState(atk).dropdown
                                            }
                                            onChange={e => {
                                              const val = e.target.value
                                              const updated = [
                                                ...(enemy.attacks || []),
                                              ]
                                              if (val === 'custom') {
                                                updated[idx] = {
                                                  ...atk,
                                                  cc: 'custom',
                                                  ccCustom: atk.ccCustom || '',
                                                }
                                              } else if (val) {
                                                updated[idx] = {
                                                  ...atk,
                                                  cc: val,
                                                  ccCustom: '',
                                                }
                                              } else {
                                                updated[idx] = {
                                                  ...atk,
                                                  cc: '',
                                                  ccCustom: '',
                                                }
                                              }
                                              updateEnemy(
                                                enemy.id,
                                                'attacks',
                                                updated,
                                              )
                                            }}
                                            style={{ margin: 0 }}>
                                            <option value="">None</option>
                                            {CC_OPTIONS.map(opt => (
                                              <option key={opt} value={opt}>
                                                {opt}
                                              </option>
                                            ))}
                                            <option value="custom">
                                              Custom...
                                            </option>
                                          </select>
                                        </div>

                                        {getCcDropdownState(atk).dropdown ===
                                          'custom' && (
                                          <div
                                            style={{
                                              flex: 1,
                                              minWidth: '150px',
                                            }}>
                                            <label
                                              style={{
                                                fontSize: '0.7rem',
                                                color: 'var(--text-muted)',
                                                display: 'block',
                                                marginBottom: '0.1rem',
                                              }}>
                                              Custom Effect Name (e.g. Frozen
                                              ❄️)
                                            </label>
                                            <input
                                              type="text"
                                              className="input"
                                              placeholder="Enter custom effect name"
                                              value={
                                                getCcDropdownState(atk)
                                                  .customText
                                              }
                                              onChange={e => {
                                                const updated = [
                                                  ...(enemy.attacks || []),
                                                ]
                                                updated[idx] = {
                                                  ...atk,
                                                  cc: 'custom',
                                                  ccCustom: e.target.value,
                                                }
                                                updateEnemy(
                                                  enemy.id,
                                                  'attacks',
                                                  updated,
                                                )
                                              }}
                                              style={{ margin: 0 }}
                                            />
                                          </div>
                                        )}
                                      </div>

                                      <div
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '0.2rem',
                                          marginTop: '0.2rem',
                                        }}>
                                        <label
                                          style={{
                                            fontSize: '0.7rem',
                                            color: 'var(--text-muted)',
                                            display: 'block',
                                          }}>
                                          Description / Notes (Flavor text or
                                          details)
                                        </label>
                                        <textarea
                                          className="input"
                                          placeholder="e.g. The targeted creature must succeed on a DC 16 Wisdom saving throw..."
                                          value={atk.description || ''}
                                          onChange={e => {
                                            const updated = [
                                              ...(enemy.attacks || []),
                                            ]
                                            updated[idx] = {
                                              ...atk,
                                              description: e.target.value,
                                            }
                                            updateEnemy(
                                              enemy.id,
                                              'attacks',
                                              updated,
                                            )
                                          }}
                                          style={{
                                            margin: 0,
                                            minHeight: '50px',
                                            width: '100%',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            fontSize: '0.85rem',
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            border:
                                              '1px solid rgba(255, 255, 255, 0.1)',
                                            color: 'var(--text-primary)',
                                            padding: '0.4rem 0.6rem',
                                            borderRadius: '6px',
                                          }}
                                        />
                                      </div>

                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.4rem',
                                          marginTop: '0.2rem',
                                        }}>
                                        <input
                                          type="checkbox"
                                          id={`half-on-save-${idx}`}
                                          checked={!!atk.halfOnSuccess}
                                          onChange={e => {
                                            const updated = [
                                              ...(enemy.attacks || []),
                                            ]
                                            updated[idx] = {
                                              ...atk,
                                              halfOnSuccess: e.target.checked,
                                            }
                                            updateEnemy(
                                              enemy.id,
                                              'attacks',
                                              updated,
                                            )
                                          }}
                                          style={{ cursor: 'pointer' }}
                                        />
                                        <label
                                          htmlFor={`half-on-save-${idx}`}
                                          style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                          }}>
                                          Half damage on successful save
                                        </label>
                                      </div>

                                      <div
                                        style={{
                                          borderTop:
                                            '1px dashed rgba(255, 255, 255, 0.05)',
                                          paddingTop: '0.5rem',
                                        }}>
                                        <label
                                          style={{
                                            display: 'block',
                                            fontSize: '0.7rem',
                                            color: 'var(--text-muted)',
                                            marginBottom: '0.25rem',
                                          }}>
                                          Damage Component
                                        </label>
                                        {(atk.damage || []).map((dmg, dIdx) => (
                                          <div
                                            key={dIdx}
                                            style={{
                                              display: 'flex',
                                              gap: '0.5rem',
                                              alignItems: 'center',
                                              marginBottom: '0.25rem',
                                            }}>
                                            <input
                                              type="text"
                                              className="input"
                                              placeholder="Formula (e.g. 1d6+2)"
                                              value={dmg.formula}
                                              onChange={e => {
                                                const updated = [
                                                  ...(enemy.attacks || []),
                                                ]
                                                const updatedDmg = [
                                                  ...(atk.damage || []),
                                                ]
                                                updatedDmg[dIdx] = {
                                                  ...dmg,
                                                  formula: e.target.value,
                                                }
                                                updated[idx] = {
                                                  ...atk,
                                                  damage: updatedDmg,
                                                }
                                                updateEnemy(
                                                  enemy.id,
                                                  'attacks',
                                                  updated,
                                                )
                                              }}
                                              style={{ margin: 0, flex: 2 }}
                                            />
                                            <select
                                              className="input"
                                              value={dmg.type || 'slashing'}
                                              onChange={e => {
                                                const updated = [
                                                  ...(enemy.attacks || []),
                                                ]
                                                const updatedDmg = [
                                                  ...(atk.damage || []),
                                                ]
                                                updatedDmg[dIdx] = {
                                                  ...dmg,
                                                  type: e.target.value,
                                                }
                                                updated[idx] = {
                                                  ...atk,
                                                  damage: updatedDmg,
                                                }
                                                updateEnemy(
                                                  enemy.id,
                                                  'attacks',
                                                  updated,
                                                )
                                              }}
                                              style={{ margin: 0, flex: 2 }}>
                                              {DAMAGE_TYPES.map(t => (
                                                <option
                                                  key={t}
                                                  value={t.toLowerCase()}>
                                                  {t}
                                                </option>
                                              ))}
                                            </select>
                                            <button
                                              type="button"
                                              className="delete-btn"
                                              onClick={() => {
                                                const updated = [
                                                  ...(enemy.attacks || []),
                                                ]
                                                const updatedDmg = (
                                                  atk.damage || []
                                                ).filter((_, i) => i !== dIdx)
                                                updated[idx] = {
                                                  ...atk,
                                                  damage: updatedDmg,
                                                }
                                                updateEnemy(
                                                  enemy.id,
                                                  'attacks',
                                                  updated,
                                                )
                                              }}
                                              style={{
                                                fontSize: '1rem',
                                                padding: '0.1rem 0.4rem',
                                              }}>
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          type="button"
                                          className="btn btn-secondary"
                                          onClick={() => {
                                            const updated = [
                                              ...(enemy.attacks || []),
                                            ]
                                            const updatedDmg = [
                                              ...(atk.damage || []),
                                              {
                                                formula: '1d6',
                                                type: 'slashing',
                                              },
                                            ]
                                            updated[idx] = {
                                              ...atk,
                                              damage: updatedDmg,
                                            }
                                            updateEnemy(
                                              enemy.id,
                                              'attacks',
                                              updated,
                                            )
                                          }}
                                          style={{
                                            marginTop: '0.4rem',
                                            padding: '0.2rem 0.5rem',
                                            fontSize: '0.75rem',
                                          }}>
                                          Add Damage Component
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {(!enemy.attacks ||
                                    enemy.attacks.length === 0) && (
                                    <div
                                      style={{
                                        fontSize: '0.8rem',
                                        color: 'var(--text-muted)',
                                        fontStyle: 'italic',
                                        padding: '0.25rem 0',
                                      }}>
                                      No structured attacks defined. The system
                                      will auto-parse standard weapon attacks
                                      (e.g. Talon, Javelin) from the raw text
                                      Abilities block above.
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => {
                                    const newAtk = {
                                      name: 'New Attack',
                                      type: 'melee',
                                      toHit: 0,
                                      dc: null,
                                      save: '',
                                      reach: '5 ft.',
                                      range: '',
                                      description: '',
                                      cc: '',
                                      ccCustom: '',
                                      damage: [
                                        { formula: '1d6', type: 'slashing' },
                                      ],
                                      halfOnSuccess: false,
                                    }
                                    const updated = [
                                      ...(enemy.attacks || []),
                                      newAtk,
                                    ]
                                    updateEnemy(enemy.id, 'attacks', updated)
                                  }}
                                  style={{
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.8rem',
                                  }}>
                                  Add Structured Attack
                                </button>
                              </div>

                              <div className="stats-skills-tab">
                                {statsList.map(stat => {
                                  const eff = enemy[stat] || 10
                                  const mod = calculateModifier(eff)
                                  const relatedSkills = dndSkills.filter(
                                    s => s.stat === stat,
                                  )
                                  const isSaveProficient = enemy.saves?.[stat]
                                  const profBonus =
                                    enemy.proficiency !== undefined
                                      ? enemy.proficiency
                                      : 2
                                  const saveBonus =
                                    mod + (isSaveProficient ? profBonus : 0)
                                  return (
                                    <div key={stat} className="stat-group">
                                      <div className="stat-group-header">
                                        <div
                                          className={`skill-checkbox save-checkbox ${isSaveProficient ? 'proficient' : ''}`}
                                          onClick={() => {
                                            const currentSaves =
                                              enemy.saves || {}
                                            updateEnemy(enemy.id, 'saves', {
                                              ...currentSaves,
                                              [stat]: !currentSaves[stat],
                                            })
                                          }}
                                          title="Toggle Save Proficiency">
                                          {isSaveProficient && (
                                            <span className="check-mark">
                                              ●
                                            </span>
                                          )}
                                        </div>
                                        <span className="stat-name">
                                          {stat.toUpperCase()}
                                        </span>
                                        <input
                                          type="number"
                                          className="stat-score-input"
                                          value={enemy[stat] || 10}
                                          onChange={e =>
                                            updateEnemy(
                                              enemy.id,
                                              stat,
                                              parseInt(e.target.value) || 0,
                                            )
                                          }
                                        />
                                        <span className="stat-mod-badge">
                                          {formatModifier(mod)}
                                        </span>
                                        <div className="stat-save-display">
                                          <span className="stat-save-display-label">
                                            Save
                                          </span>
                                          <span
                                            style={{
                                              color: isSaveProficient
                                                ? 'var(--primary)'
                                                : 'var(--text-primary)',
                                            }}>
                                            {formatModifier(saveBonus)}
                                          </span>
                                        </div>
                                      </div>
                                      {relatedSkills.length > 0 && (
                                        <div className="stat-group-skills">
                                          {relatedSkills.map(skill => {
                                            const isProficient =
                                              enemy.skills &&
                                              enemy.skills[skill.name]
                                            const skillBonus =
                                              mod +
                                              (isProficient ? profBonus : 0)
                                            return (
                                              <div
                                                key={skill.name}
                                                className={`skill-row ${isProficient ? 'proficient' : ''}`}
                                                onClick={() => {
                                                  const currentSkills =
                                                    enemy.skills || {}
                                                  updateEnemy(
                                                    enemy.id,
                                                    'skills',
                                                    {
                                                      ...currentSkills,
                                                      [skill.name]:
                                                        !currentSkills[
                                                          skill.name
                                                        ],
                                                    },
                                                  )
                                                }}>
                                                <div className="skill-checkbox">
                                                  {isProficient && (
                                                    <span className="check-mark">
                                                      ●
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="skill-bonus">
                                                  {formatModifier(skillBonus)}
                                                </div>
                                                <div className="skill-name">
                                                  {skill.name}
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}

                                <div className="rp-field full-width stats-skills-features">
                                  <label>Features & Traits</label>
                                  <textarea
                                    className="input rp-textarea mini-textarea"
                                    value={enemy.features || ''}
                                    onChange={e =>
                                      updateEnemy(
                                        enemy.id,
                                        'features',
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Special traits, immunities, resistances..."
                                  />
                                </div>

                                {/* Resistances & Vulnerabilities Editor */}
                                <div className="rp-field full-width player-resistances-section">
                                  <label>Resistances & Vulnerabilities</label>
                                  <div className="damage-mods-container">
                                    {/* Resistances */}
                                    <div className="damage-mod-row">
                                      <span className="damage-mod-type-label res-lbl">
                                        Resistances (1/2 dmg)
                                      </span>
                                      <div className="damage-mod-pills">
                                        {(enemy.resistances || []).map(r => (
                                          <span
                                            key={r}
                                            className="damage-pill pill-resistance">
                                            {r}
                                            <button
                                              type="button"
                                              className="pill-remove-btn"
                                              onClick={() => {
                                                const updated = (
                                                  enemy.resistances || []
                                                ).filter(x => x !== r)
                                                updateEnemy(
                                                  enemy.id,
                                                  'resistances',
                                                  updated,
                                                )
                                              }}>
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                        <select
                                          className="input pill-select-add"
                                          value=""
                                          onChange={e => {
                                            const val = e.target.value
                                            if (
                                              val &&
                                              !(
                                                enemy.resistances || []
                                              ).includes(val)
                                            ) {
                                              const updated = [
                                                ...(enemy.resistances || []),
                                                val,
                                              ]
                                              updateEnemy(
                                                enemy.id,
                                                'resistances',
                                                updated,
                                              )
                                            }
                                          }}>
                                          <option value="">Add</option>
                                          {DAMAGE_TYPES.filter(
                                            t =>
                                              !(
                                                enemy.resistances || []
                                              ).includes(t),
                                          ).map(t => (
                                            <option key={t} value={t}>
                                              {t}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {/* Immunities */}
                                    <div className="damage-mod-row">
                                      <span className="damage-mod-type-label imm-lbl">
                                        Immunities (0 dmg)
                                      </span>
                                      <div className="damage-mod-pills">
                                        {(enemy.immunities || []).map(i => (
                                          <span
                                            key={i}
                                            className="damage-pill pill-immunity">
                                            {i}
                                            <button
                                              type="button"
                                              className="pill-remove-btn"
                                              onClick={() => {
                                                const updated = (
                                                  enemy.immunities || []
                                                ).filter(x => x !== i)
                                                updateEnemy(
                                                  enemy.id,
                                                  'immunities',
                                                  updated,
                                                )
                                              }}>
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                        <select
                                          className="input pill-select-add"
                                          value=""
                                          onChange={e => {
                                            const val = e.target.value
                                            if (
                                              val &&
                                              !(
                                                enemy.immunities || []
                                              ).includes(val)
                                            ) {
                                              const updated = [
                                                ...(enemy.immunities || []),
                                                val,
                                              ]
                                              updateEnemy(
                                                enemy.id,
                                                'immunities',
                                                updated,
                                              )
                                            }
                                          }}>
                                          <option value="">Add</option>
                                          {DAMAGE_TYPES.filter(
                                            t =>
                                              !(
                                                enemy.immunities || []
                                              ).includes(t),
                                          ).map(t => (
                                            <option key={t} value={t}>
                                              {t}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {/* Vulnerabilities */}
                                    <div className="damage-mod-row">
                                      <span className="damage-mod-type-label vul-lbl">
                                        Vulnerabilities (2x dmg)
                                      </span>
                                      <div className="damage-mod-pills">
                                        {(enemy.vulnerabilities || []).map(
                                          v => (
                                            <span
                                              key={v}
                                              className="damage-pill pill-vulnerability">
                                              {v}
                                              <button
                                                type="button"
                                                className="pill-remove-btn"
                                                onClick={() => {
                                                  const updated = (
                                                    enemy.vulnerabilities || []
                                                  ).filter(x => x !== v)
                                                  updateEnemy(
                                                    enemy.id,
                                                    'vulnerabilities',
                                                    updated,
                                                  )
                                                }}>
                                                ×
                                              </button>
                                            </span>
                                          ),
                                        )}
                                        <select
                                          className="input pill-select-add"
                                          value=""
                                          onChange={e => {
                                            const val = e.target.value
                                            if (
                                              val &&
                                              !(
                                                enemy.vulnerabilities || []
                                              ).includes(val)
                                            ) {
                                              const updated = [
                                                ...(enemy.vulnerabilities ||
                                                  []),
                                                val,
                                              ]
                                              updateEnemy(
                                                enemy.id,
                                                'vulnerabilities',
                                                updated,
                                              )
                                            }
                                          }}>
                                          <option value="">Add</option>
                                          {DAMAGE_TYPES.filter(
                                            t =>
                                              !(
                                                enemy.vulnerabilities || []
                                              ).includes(t),
                                          ).map(t => (
                                            <option key={t} value={t}>
                                              {t}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* CC Resistances & Vulnerabilities Editor */}
                                <div
                                  className="rp-field full-width player-resistances-section"
                                  style={{ marginTop: '1.25rem' }}>
                                  <label>
                                    CC Resistances &amp; Vulnerabilities
                                  </label>
                                  <div className="damage-mods-container">
                                    {/* CC Resistances */}
                                    <div className="damage-mod-row">
                                      <span className="damage-mod-type-label res-lbl">
                                        CC Resistances (adv. on save)
                                      </span>
                                      <div className="damage-mod-pills">
                                        {(enemy.ccResistances || []).map(r => (
                                          <span
                                            key={r}
                                            className="damage-pill pill-resistance">
                                            {r}
                                            <button
                                              type="button"
                                              className="pill-remove-btn"
                                              onClick={() => {
                                                const updated = (
                                                  enemy.ccResistances || []
                                                ).filter(x => x !== r)
                                                updateEnemy(
                                                  enemy.id,
                                                  'ccResistances',
                                                  updated,
                                                )
                                              }}>
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                        <select
                                          className="input pill-select-add"
                                          value=""
                                          onChange={e => {
                                            const val = e.target.value
                                            if (
                                              val &&
                                              !(
                                                enemy.ccResistances || []
                                              ).includes(val)
                                            ) {
                                              const updated = [
                                                ...(enemy.ccResistances || []),
                                                val,
                                              ]
                                              updateEnemy(
                                                enemy.id,
                                                'ccResistances',
                                                updated,
                                              )
                                            }
                                          }}>
                                          <option value="">Add</option>
                                          {CC_OPTIONS.filter(
                                            t =>
                                              !(
                                                enemy.ccResistances || []
                                              ).includes(t),
                                          ).map(t => (
                                            <option key={t} value={t}>
                                              {t}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {/* CC Immunities */}
                                    <div className="damage-mod-row">
                                      <span className="damage-mod-type-label imm-lbl">
                                        CC Immunities (cannot be affected)
                                      </span>
                                      <div className="damage-mod-pills">
                                        {(enemy.ccImmunities || []).map(i => (
                                          <span
                                            key={i}
                                            className="damage-pill pill-immunity">
                                            {i}
                                            <button
                                              type="button"
                                              className="pill-remove-btn"
                                              onClick={() => {
                                                const updated = (
                                                  enemy.ccImmunities || []
                                                ).filter(x => x !== i)
                                                updateEnemy(
                                                  enemy.id,
                                                  'ccImmunities',
                                                  updated,
                                                )
                                              }}>
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                        <select
                                          className="input pill-select-add"
                                          value=""
                                          onChange={e => {
                                            const val = e.target.value
                                            if (
                                              val &&
                                              !(
                                                enemy.ccImmunities || []
                                              ).includes(val)
                                            ) {
                                              const updated = [
                                                ...(enemy.ccImmunities || []),
                                                val,
                                              ]
                                              updateEnemy(
                                                enemy.id,
                                                'ccImmunities',
                                                updated,
                                              )
                                            }
                                          }}>
                                          <option value="">Add</option>
                                          {CC_OPTIONS.filter(
                                            t =>
                                              !(
                                                enemy.ccImmunities || []
                                              ).includes(t),
                                          ).map(t => (
                                            <option key={t} value={t}>
                                              {t}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {/* CC Vulnerabilities */}
                                    <div className="damage-mod-row">
                                      <span className="damage-mod-type-label vul-lbl">
                                        CC Vulnerabilities (disadv. on save)
                                      </span>
                                      <div className="damage-mod-pills">
                                        {(enemy.ccVulnerabilities || []).map(
                                          v => (
                                            <span
                                              key={v}
                                              className="damage-pill pill-vulnerability">
                                              {v}
                                              <button
                                                type="button"
                                                className="pill-remove-btn"
                                                onClick={() => {
                                                  const updated = (
                                                    enemy.ccVulnerabilities ||
                                                    []
                                                  ).filter(x => x !== v)
                                                  updateEnemy(
                                                    enemy.id,
                                                    'ccVulnerabilities',
                                                    updated,
                                                  )
                                                }}>
                                                ×
                                              </button>
                                            </span>
                                          ),
                                        )}
                                        <select
                                          className="input pill-select-add"
                                          value=""
                                          onChange={e => {
                                            const val = e.target.value
                                            if (
                                              val &&
                                              !(
                                                enemy.ccVulnerabilities || []
                                              ).includes(val)
                                            ) {
                                              const updated = [
                                                ...(enemy.ccVulnerabilities ||
                                                  []),
                                                val,
                                              ]
                                              updateEnemy(
                                                enemy.id,
                                                'ccVulnerabilities',
                                                updated,
                                              )
                                            }
                                          }}>
                                          <option value="">Add</option>
                                          {CC_OPTIONS.filter(
                                            t =>
                                              !(
                                                enemy.ccVulnerabilities || []
                                              ).includes(t),
                                          ).map(t => (
                                            <option key={t} value={t}>
                                              {t}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Pre-configured Buffs Editor */}
                                <div
                                  className="rp-field full-width player-buffs-section"
                                  style={{ marginTop: '1.25rem' }}>
                                  <label>
                                    Pre-configured Buffs &amp; Debuffs
                                  </label>
                                  <div className="buffs-editor-container">
                                    <div className="buffs-editor-pills">
                                      {(enemy.buffs || []).map(b => (
                                        <span key={b} className="buff-pill">
                                          {b}
                                          <button
                                            type="button"
                                            className="pill-remove-btn"
                                            onClick={() => {
                                              const updated = (
                                                enemy.buffs || []
                                              ).filter(x => x !== b)
                                              updateEnemy(
                                                enemy.id,
                                                'buffs',
                                                updated,
                                              )
                                            }}>
                                            ×
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                    <select
                                      className="input buff-add-input"
                                      value=""
                                      onChange={e => {
                                        const val = e.target.value
                                        if (val) {
                                          const current = enemy.buffs || []
                                          if (!current.includes(val)) {
                                            updateEnemy(enemy.id, 'buffs', [
                                              ...current,
                                              val,
                                            ])
                                          }
                                        }
                                      }}
                                      style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        border:
                                          '1px solid rgba(255,255,255,0.1)',
                                        color: 'var(--text-primary)',
                                        padding: '0.4rem 0.5rem',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                      }}>
                                      <option value="">
                                        Add Buff/Debuff...
                                      </option>
                                      {buffsDatabase
                                        .filter(
                                          b =>
                                            !(enemy.buffs || []).includes(
                                              b.name,
                                            ),
                                        )
                                        .map(b => (
                                          <option key={b.id} value={b.name}>
                                            {b.name}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                </div>
                              </div>

                              <div
                                className="combat-tab-content integrated-combat"
                                style={{
                                  marginTop: '1rem',
                                  borderTop:
                                    '1px solid rgba(255, 255, 255, 0.08)',
                                  paddingTop: '1rem',
                                }}>
                                <div className="combat-stats-row mini-combat-row">
                                  <div className="combat-stat-box">
                                    <label>AC</label>
                                    <input
                                      type="number"
                                      className="input combat-input"
                                      value={enemy.ac}
                                      onChange={e =>
                                        updateEnemy(
                                          enemy.id,
                                          'ac',
                                          parseInt(e.target.value) || 0,
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="combat-stat-box">
                                    <label>Max HP</label>
                                    <input
                                      type="number"
                                      className="input combat-input"
                                      value={enemy.hpMax || 20}
                                      onChange={e =>
                                        updateEnemy(
                                          enemy.id,
                                          'hpMax',
                                          Math.max(
                                            1,
                                            parseInt(e.target.value) || 1,
                                          ),
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="combat-stat-box">
                                    <label>Prof Bonus</label>
                                    <input
                                      type="number"
                                      className="input combat-input"
                                      value={
                                        enemy.proficiency !== undefined
                                          ? enemy.proficiency
                                          : 2
                                      }
                                      onChange={e =>
                                        updateEnemy(
                                          enemy.id,
                                          'proficiency',
                                          parseInt(e.target.value) || 0,
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="combat-stat-box">
                                    <label>Class Type</label>
                                    <select
                                      className="input combat-input"
                                      value={enemy.classType || 'Enemy'}
                                      onChange={e =>
                                        updateEnemy(
                                          enemy.id,
                                          'classType',
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border:
                                          '1px solid rgba(255,255,255,0.1)',
                                        color: 'var(--text-primary)',
                                      }}>
                                      <option value="Enemy">Enemy</option>
                                      <option value="Boss">Boss</option>
                                    </select>
                                  </div>
                                  <div
                                    className="combat-stat-box"
                                    style={{ flex: 2 }}>
                                    <label>Type / CR / Notes</label>
                                    <input
                                      className="input combat-input"
                                      value={enemy.background || ''}
                                      onChange={e =>
                                        updateEnemy(
                                          enemy.id,
                                          'background',
                                          e.target.value,
                                        )
                                      }
                                      placeholder="e.g. Undead, CR 2, Legendary"
                                    />
                                  </div>
                                </div>

                                <div
                                  className="carrying-capacity mini-capacity"
                                  style={{ marginTop: '1rem' }}>
                                  <h4>Carrying</h4>
                                  <div className="capacity-bar">
                                    Max Load: {(enemy.str || 10) * 15} lbs
                                    <br />
                                    Push/Drag: {(enemy.str || 10) * 30} lbs
                                  </div>
                                </div>
                              </div>

                              <div
                                style={{
                                  marginTop: '1rem',
                                  display: 'flex',
                                  justifyContent: 'flex-end',
                                }}>
                                <button
                                  className="btn btn-primary"
                                  onClick={() => {
                                    setExpandedEnemyId(null)
                                    setExpandedOriginalName('')
                                  }}>
                                  💾 Save & Close
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {detailsMonsterId === enemy.id && (
                        <tr className="monster-details-preview-row">
                          <td colSpan={7}>
                            <div className="monster-battle-preview glass-panel">
                              <div className="preview-card-header">
                                <div>
                                  <h3
                                    style={{ margin: 0, fontSize: '1.25rem' }}>
                                    {enemy.name}
                                  </h3>
                                  <span
                                    className="details-subtitle"
                                    style={{
                                      fontSize: '0.8rem',
                                      color: 'var(--text-secondary)',
                                    }}>
                                    {enemy.background || 'Monster'}
                                  </span>
                                </div>
                                <span
                                  className={`class-badge ${(enemy.classType || 'Enemy').toLowerCase()}`}>
                                  {enemy.classType || 'Enemy'}
                                </span>
                              </div>

                              <div className="details-divider"></div>

                              {/* Attributes Grid */}
                              <div className="details-stats-grid">
                                {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(
                                  stat => {
                                    const score = enemy[stat] || 10
                                    const mod = calculateModifier(score)
                                    return (
                                      <div
                                        key={stat}
                                        className="details-stat-box">
                                        <span className="stat-label">
                                          {stat.toUpperCase()}
                                        </span>
                                        <span className="stat-score">
                                          {score}
                                        </span>
                                        <span className="stat-modifier">
                                          ({formatModifier(mod)})
                                        </span>
                                      </div>
                                    )
                                  },
                                )}
                              </div>

                              <div className="details-divider"></div>

                              {/* Combat Info (AC, HP) */}
                              <div className="details-combat-info">
                                <div>
                                  <strong>Armor Class:</strong> 🛡️ {enemy.ac}
                                </div>
                                <div>
                                  <strong>Hit Points:</strong> ❤️{' '}
                                  {enemy.hpMax || 20}
                                </div>
                                {enemy.cr && (
                                  <div>
                                    <strong>Challenge Rating:</strong> CR{' '}
                                    {enemy.cr}
                                  </div>
                                )}
                              </div>

                              {/* Saves & Skills & Resists */}
                              <div className="details-extra-combat-info">
                                {Object.keys(enemy.saves || {}).some(
                                  k => enemy.saves[k],
                                ) && (
                                  <div>
                                    <strong>Saving Throws: </strong>
                                    {Object.keys(enemy.saves)
                                      .filter(k => enemy.saves[k])
                                      .map(
                                        k =>
                                          `${k.toUpperCase()} ${formatModifier(calculateModifier(enemy[k]) + (enemy.proficiency !== undefined ? enemy.proficiency : 2))}`,
                                      )
                                      .join(', ')}
                                  </div>
                                )}
                                {Object.keys(enemy.skills || {}).some(
                                  k => enemy.skills[k],
                                ) && (
                                  <div>
                                    <strong>Skills: </strong>
                                    {Object.keys(enemy.skills)
                                      .filter(k => enemy.skills[k])
                                      .map(
                                        k =>
                                          `${k} ${formatModifier(calculateModifier(enemy[dndSkills.find(s => s.name === k)?.stat || 'str']) + (enemy.proficiency !== undefined ? enemy.proficiency : 2))}`,
                                      )
                                      .join(', ')}
                                  </div>
                                )}
                                {Array.isArray(enemy.resistances) &&
                                  enemy.resistances.length > 0 && (
                                    <div>
                                      <strong>Resistances:</strong>{' '}
                                      {enemy.resistances.join(', ')}
                                    </div>
                                  )}
                                {Array.isArray(enemy.immunities) &&
                                  enemy.immunities.length > 0 && (
                                    <div>
                                      <strong>Immunities:</strong>{' '}
                                      {enemy.immunities.join(', ')}
                                    </div>
                                  )}
                                {Array.isArray(enemy.vulnerabilities) &&
                                  enemy.vulnerabilities.length > 0 && (
                                    <div>
                                      <strong>Vulnerabilities:</strong>{' '}
                                      {enemy.vulnerabilities.join(', ')}
                                    </div>
                                  )}
                              </div>

                              <div className="details-divider"></div>

                              {/* Abilities Description */}
                              {enemy.abilities && (
                                <div className="details-abilities-section">
                                  <h4>Traits & Abilities</h4>
                                  <div className="details-abilities-text">
                                    {enemy.abilities}
                                  </div>
                                </div>
                              )}

                              {/* Interactive Attacks Section */}
                              <div className="details-attacks-section">
                                <h4>⚔️ Attacks & Actions</h4>
                                <div className="details-attacks-grid">
                                  {(() => {
                                    const attacks =
                                      Array.isArray(enemy.attacks) &&
                                      enemy.attacks.length > 0
                                        ? enemy.attacks
                                        : parseAbilities(enemy.abilities)

                                    return (
                                      <>
                                        {attacks.map((atk, idx) => (
                                          <div
                                            key={idx}
                                            className="details-attack-row"
                                            style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              alignItems: 'stretch',
                                              gap: '0.25rem',
                                              padding: '0.5rem 0.75rem',
                                            }}>
                                            <div
                                              style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                width: '100%',
                                              }}>
                                              <div className="details-attack-meta">
                                                <strong>{atk.name}</strong>
                                                {atk.toHit !== undefined &&
                                                  atk.toHit !== null && (
                                                    <span className="to-hit-tag">
                                                      +{atk.toHit} to hit
                                                    </span>
                                                  )}
                                                {atk.dc !== undefined &&
                                                  atk.dc !== null && (
                                                    <span
                                                      className="to-hit-tag"
                                                      style={{
                                                        background:
                                                          'rgba(245, 158, 11, 0.15)',
                                                        color: '#f59e0b',
                                                      }}>
                                                      DC {atk.dc}{' '}
                                                      {atk.save || 'Save'}
                                                    </span>
                                                  )}
                                                {(() => {
                                                  const ccVal =
                                                    atk.cc === 'custom'
                                                      ? atk.ccCustom
                                                      : atk.cc ||
                                                        (atk.description
                                                          ? extractExtraEffects(
                                                              atk.description,
                                                            )
                                                          : '')
                                                  if (ccVal) {
                                                    return (
                                                      <span
                                                        className="to-hit-tag"
                                                        style={{
                                                          background:
                                                            'rgba(99, 102, 241, 0.15)',
                                                          color: '#818cf8',
                                                        }}>
                                                        ✨ CC: {ccVal}
                                                      </span>
                                                    )
                                                  }
                                                  return null
                                                })()}
                                                {(atk.damage || []).map(
                                                  (d, di) => (
                                                    <span
                                                      key={di}
                                                      className="dmg-tag">
                                                      {d.formula} {d.type}
                                                    </span>
                                                  ),
                                                )}
                                              </div>
                                              <button
                                                className="btn btn-primary roll-btn"
                                                onClick={() =>
                                                  rollPreviewAttack(
                                                    enemy.id,
                                                    atk,
                                                  )
                                                }
                                                style={{
                                                  padding: '0.3rem 0.6rem',
                                                  fontSize: '0.8rem',
                                                }}>
                                                🎲 Roll
                                              </button>
                                            </div>
                                            {atk.description && (
                                              <div
                                                style={{
                                                  fontSize: '0.8rem',
                                                  color:
                                                    'var(--text-secondary)',
                                                  paddingLeft: '0.25rem',
                                                  fontStyle: 'italic',
                                                  wordBreak: 'break-word',
                                                }}>
                                                {atk.description}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                        {attacks.length === 0 && (
                                          <span className="no-attacks-msg">
                                            No attacks parsed or defined.
                                          </span>
                                        )}
                                      </>
                                    )
                                  })()}
                                </div>
                              </div>

                              {/* Roll Results Overlay/Panel */}
                              {previewRolls[enemy.id] &&
                                (() => {
                                  const roll = previewRolls[enemy.id]
                                  return (
                                    <div className="details-roll-result-panel glass-panel">
                                      <div className="roll-result-header">
                                        <h5>Roll Result: {roll.name}</h5>
                                        <button
                                          className="close-roll-btn"
                                          onClick={() =>
                                            setPreviewRolls(prev => ({
                                              ...prev,
                                              [enemy.id]: null,
                                            }))
                                          }>
                                          ×
                                        </button>
                                      </div>
                                      <div className="roll-result-body">
                                        <div className="to-hit-result">
                                          <span className="result-label">
                                            To Hit:
                                          </span>
                                          <span
                                            className={`result-value ${roll.isCrit ? 'crit-success' : ''}`}>
                                            🎯 {roll.totalHit}
                                          </span>
                                          <span className="result-breakdown">
                                            (d20: {roll.d20} + bonus:{' '}
                                            {roll.toHitBonus}){' '}
                                            {roll.isCrit ? 'CRITICAL!' : ''}
                                          </span>
                                        </div>
                                        {roll.damageRolls.length > 0 && (
                                          <div className="damage-results">
                                            <span className="result-label">
                                              Damage:
                                            </span>
                                            <div className="damage-breakdown-list">
                                              {roll.damageRolls.map(
                                                (dmg, di) => (
                                                  <div
                                                    key={di}
                                                    className="damage-result-item">
                                                    <span className="damage-total">
                                                      💥 {dmg.total}
                                                    </span>
                                                    <span className="damage-type">
                                                      {dmg.type}
                                                    </span>
                                                    <span className="damage-formula-breakdown">
                                                      ({dmg.formula}) [rolls:{' '}
                                                      {dmg.rolls.join(',')}]{' '}
                                                      {dmg.critBonus > 0
                                                        ? `+ crit bonus: ${dmg.critBonus}`
                                                        : ''}
                                                    </span>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
            {filteredData.length === 0 && (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p>No monsters found matching your search.</p>
              </div>
            )}

            {renderPagination(false)}
          </div>
        </>
      )}
    </div>
  )
}
