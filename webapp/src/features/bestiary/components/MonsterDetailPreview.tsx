import React from 'react'
import { parseAbilities, extractExtraEffects } from '@/shared/utils/combatUtils'

interface MonsterDetailPreviewProps {
  enemy: any
  previewRoll: any
  onRollAttack: (monsterId: string, attack: any) => void
  onClearRoll: (monsterId: string) => void
}

const calculateModifier = (score: number) =>
  Math.floor(((score || 10) - 10) / 2)
const formatModifier = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`)

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

export default function MonsterDetailPreview({
  enemy,
  previewRoll,
  onRollAttack,
  onClearRoll,
}: MonsterDetailPreviewProps) {
  return (
    <tr className="monster-details-preview-row">
      <td colSpan={7}>
        <div className="monster-battle-preview glass-panel">
          <div className="preview-card-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{enemy.name}</h3>
              <span
                className="details-subtitle"
                style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {enemy.background || 'Monster'}
              </span>
            </div>
            <span
              className={`class-badge ${(enemy.classType || 'Enemy').toLowerCase()}`}>
              {enemy.classType || 'Enemy'}
            </span>
          </div>

          <div className="details-divider" />

          {/* Attributes Grid */}
          <div className="details-stats-grid">
            {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => {
              const score = enemy[stat] || 10
              const mod = calculateModifier(score)
              return (
                <div key={stat} className="details-stat-box">
                  <span className="stat-label">{stat.toUpperCase()}</span>
                  <span className="stat-score">{score}</span>
                  <span className="stat-modifier">({formatModifier(mod)})</span>
                </div>
              )
            })}
          </div>

          <div className="details-divider" />

          {/* Combat Info */}
          <div className="details-combat-info">
            <div>
              <strong>Armor Class:</strong> 🛡️ {enemy.ac}
            </div>
            <div>
              <strong>Hit Points:</strong> ❤️ {enemy.hpMax || 20}
            </div>
            {enemy.cr && (
              <div>
                <strong>Challenge Rating:</strong> CR {enemy.cr}
              </div>
            )}
          </div>

          {/* Saves & Skills & Resists */}
          <div className="details-extra-combat-info">
            {Object.keys(enemy.saves || {}).some(k => enemy.saves[k]) && (
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
            {Object.keys(enemy.skills || {}).some(k => enemy.skills[k]) && (
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
                  <strong>Resistances:</strong> {enemy.resistances.join(', ')}
                </div>
              )}
            {Array.isArray(enemy.immunities) && enemy.immunities.length > 0 && (
              <div>
                <strong>Immunities:</strong> {enemy.immunities.join(', ')}
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

          <div className="details-divider" />

          {/* Abilities Description */}
          {enemy.abilities && (
            <div className="details-abilities-section">
              <h4>Traits & Abilities</h4>
              <div className="details-abilities-text">{enemy.abilities}</div>
            </div>
          )}

          {/* Interactive Attacks Section */}
          <div className="details-attacks-section">
            <h4>⚔️ Attacks & Actions</h4>
            <div className="details-attacks-grid">
              {(() => {
                const attacks =
                  Array.isArray(enemy.attacks) && enemy.attacks.length > 0
                    ? enemy.attacks
                    : parseAbilities(enemy.abilities)

                return (
                  <>
                    {attacks.map((atk: any, idx: number) => (
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
                            {atk.toHit !== undefined && atk.toHit !== null && (
                              <span className="to-hit-tag">
                                +{atk.toHit} to hit
                              </span>
                            )}
                            {atk.dc !== undefined && atk.dc !== null && (
                              <span
                                className="to-hit-tag"
                                style={{
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#f59e0b',
                                }}>
                                DC {atk.dc} {atk.save || 'Save'}
                              </span>
                            )}
                            {(() => {
                              const ccVal =
                                atk.cc === 'custom'
                                  ? atk.ccCustom
                                  : atk.cc ||
                                    (atk.description
                                      ? extractExtraEffects(atk.description)
                                      : '')
                              if (ccVal) {
                                return (
                                  <span
                                    className="to-hit-tag"
                                    style={{
                                      background: 'rgba(99, 102, 241, 0.15)',
                                      color: '#818cf8',
                                    }}>
                                    ✨ CC: {ccVal}
                                  </span>
                                )
                              }
                              return null
                            })()}
                            {(atk.damage || []).map((d: any, di: number) => (
                              <span key={di} className="dmg-tag">
                                {d.formula} {d.type}
                              </span>
                            ))}
                          </div>
                          <button
                            className="btn btn-primary roll-btn"
                            onClick={() => onRollAttack(enemy.id, atk)}
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
                              color: 'var(--text-secondary)',
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

          {/* Roll Results */}
          {previewRoll && (
            <div className="details-roll-result-panel glass-panel">
              <div className="roll-result-header">
                <h5>Roll Result: {previewRoll.name}</h5>
                <button
                  className="close-roll-btn"
                  onClick={() => onClearRoll(enemy.id)}>
                  ×
                </button>
              </div>
              <div className="roll-result-body">
                <div className="to-hit-result">
                  <span className="result-label">To Hit:</span>
                  <span
                    className={`result-value ${previewRoll.isCrit ? 'crit-success' : ''}`}>
                    🎯 {previewRoll.totalHit}
                  </span>
                  <span className="result-breakdown">
                    (d20: {previewRoll.d20} + bonus: {previewRoll.toHitBonus}){' '}
                    {previewRoll.isCrit ? 'CRITICAL!' : ''}
                  </span>
                </div>
                {previewRoll.damageRolls.length > 0 && (
                  <div className="damage-results">
                    <span className="result-label">Damage:</span>
                    <div className="damage-breakdown-list">
                      {previewRoll.damageRolls.map((dmg: any, di: number) => (
                        <div key={di} className="damage-result-item">
                          <span className="damage-total">💥 {dmg.total}</span>
                          <span className="damage-type">{dmg.type}</span>
                          <span className="damage-formula-breakdown">
                            ({dmg.formula}) [rolls: {dmg.rolls.join(',')}]{' '}
                            {dmg.critBonus > 0
                              ? `+ crit bonus: ${dmg.critBonus}`
                              : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}
