import React, { useState, useRef, useEffect } from 'react';
import './Chaos.css';

// ── Default Tables (read-only, not stored in state) ───────────────────────────
const DEFAULT_TABLES = [
  {
    id: 'default-magic-fumble',
    name: 'Magic Fumble',
    isDefault: true,
    rows: [
      { id: 'mf-1',  min: 1,   max: 5,   event: 'Damage Focus',       description: 'Focus damaged, see Item Damage Chart' },
      { id: 'mf-2',  min: 6,   max: 10,  event: 'Slippery',           description: 'Ground below your feet becomes slick in a 5 foot radius, Dexterity save DC 10 or fall Prone' },
      { id: 'mf-3',  min: 11,  max: 15,  event: 'Very Slippery',      description: 'Ground below your feet becomes slick in a 10 foot radius, Dexterity save DC 15 or fall Prone' },
      { id: 'mf-4',  min: 15,  max: 19,  event: 'Knockback',          description: 'You are thrown back 10 feet and fall Prone + Take [1d6] Bludgeoning Damage' },
      { id: 'mf-5',  min: 20,  max: 24,  event: 'Headache',           description: 'Make Concentration checks at a Disadvantage + Immediate check for any ongoing Concentration' },
      { id: 'mf-6',  min: 25,  max: 28,  event: 'Migraine',           description: 'All Concentration checks Fail for [1d4] rounds + Immediately Fail any ongoing Concentration check' },
      { id: 'mf-7',  min: 29,  max: 33,  event: 'Coarse Throat',      description: 'Unable to use Verbal (V) Components for [1d4] rounds + Unable to speak above a whisper' },
      { id: 'mf-8',  min: 34,  max: 37,  event: 'Graze Self',         description: 'Your spell hits you for 1/2 Damage' },
      { id: 'mf-9',  min: 38,  max: 41,  event: 'Hit Self',           description: 'Your spell hits you for Normal Damage' },
      { id: 'mf-10', min: 42,  max: 45,  event: 'Wound Self',         description: 'Your spell hits you for Critical Damage' },
      { id: 'mf-11', min: 46,  max: 50,  event: 'Spill Components',   description: 'Your components pouch spills onto the ground within 5 feet of you, unable to use Material (M) Components until gathered' },
      { id: 'mf-12', min: 51,  max: 55,  event: 'Smoke Cloud',        description: 'A cloud of smoke envelops you creating a Heavily Obscured area with a radius of 5 feet, creatures inside are Blinded' },
      { id: 'mf-13', min: 56,  max: 60,  event: 'Rooted',             description: 'Restrained until you break free, Strength check DC 10' },
      { id: 'mf-14', min: 61,  max: 65,  event: 'Horrific Vision',    description: 'The spell\'s target becomes a horrific sight to you for [1d4] rounds + You are Frightened' },
      { id: 'mf-15', min: 66,  max: 70,  event: 'Loud Bang',          description: 'Stunned until the end of your next turn + Deafened for [1d4] rounds' },
      { id: 'mf-16', min: 71,  max: 75,  event: 'Nauseating Odor',    description: 'Poisoned for [1d4] rounds' },
      { id: 'mf-17', min: 76,  max: 77,  event: 'Weakened',           description: 'Heavily Encumbered for [1d4] rounds THEN Encumbered until Short Rest' },
      { id: 'mf-18', min: 78,  max: 82,  event: 'Burst of Light',     description: 'Blinded for [1d4] rounds' },
      { id: 'mf-19', min: 83,  max: 87,  event: 'Numb Hands',         description: 'Unable to use Somatic (S) Components for [1d4] rounds + Your attacks have Disadvantage' },
      { id: 'mf-20', min: 88,  max: 91,  event: 'Graze Ally',         description: 'Hit random ally within attack range for 1/2 Damage' },
      { id: 'mf-21', min: 92,  max: 95,  event: 'Hit Ally',           description: 'Hit random ally within attack range for Normal Damage' },
      { id: 'mf-22', min: 96,  max: 99,  event: 'Wound Ally',         description: 'Hit random ally within attack range for Critical Damage' },
      { id: 'mf-23', min: 100, max: 100, event: 'Disastrous Result',   description: 'Roll twice on this chart; if rolled again, re-roll' },
    ],
  },
  {
    id: 'default-wild-magic',
    name: 'Wild Magic Surge',
    isDefault: true,
    rows: [
      { id: 'wm-1',  min: 1,   max: 2,   event: 'Fireball',            description: 'Roll on this table at the start of each of your turns for the next minute, ignoring this result on subsequent rolls.' },
      { id: 'wm-2',  min: 3,   max: 4,   event: 'Healing',             description: 'For the next minute, you can see any invisible creature if you have line of sight to it.' },
      { id: 'wm-3',  min: 5,   max: 6,   event: 'Color Change',        description: 'A modron chosen and controlled by the DM appears in an unoccupied space within 5 feet of you, then disappears 1 minute later.' },
      { id: 'wm-4',  min: 7,   max: 8,   event: 'Fireball on Self',    description: 'You cast Fireball as a 3rd-level spell centered on yourself.' },
      { id: 'wm-5',  min: 9,   max: 10,  event: 'Magic Missiles',      description: 'You cast Magic Missile as a 5th-level spell.' },
      { id: 'wm-6',  min: 11,  max: 12,  event: 'Grass Feet',          description: 'Roll a d10. Your height changes by a number of inches equal to the roll. If the roll is odd, you shrink. If the roll is even, you grow.' },
      { id: 'wm-7',  min: 13,  max: 14,  event: 'Animal Chorus',       description: 'You cast Confusion centered on yourself.' },
      { id: 'wm-8',  min: 15,  max: 16,  event: 'Potion Burst',        description: 'For the next minute, you regain 5 hit points at the start of each of your turns.' },
      { id: 'wm-9',  min: 17,  max: 18,  event: 'Teleport',            description: 'You teleport up to 60 feet to an unoccupied space of your choice that you can see.' },
      { id: 'wm-10', min: 19,  max: 20,  event: 'Summoned Butterflies', description: 'You are transported to the Astral Plane until the end of your next turn, after which time you return to the space you previously occupied or the nearest unoccupied space if that space is occupied.' },
      { id: 'wm-11', min: 21,  max: 22,  event: 'Maximize Spell',      description: 'Maximize the damage of the next damaging spell you cast within the next minute.' },
      { id: 'wm-12', min: 23,  max: 24,  event: 'Age Change',          description: 'You age [1d10] × 10 years.' },
      { id: 'wm-13', min: 25,  max: 26,  event: 'Unicorn',             description: 'You conjure [1d10] bursts of confetti, each dealing [1d6] damage.' },
      { id: 'wm-14', min: 27,  max: 28,  event: 'Flumph',              description: 'You cast Levitate on yourself.' },
      { id: 'wm-15', min: 29,  max: 30,  event: 'Heal',                description: 'A unicorn controlled by the DM appears in a space within 5 feet of you, then disappears 1 minute later.' },
      { id: 'wm-16', min: 31,  max: 32,  event: 'Invisibility',        description: 'You can\'t speak for the next minute. Whenever you try, pink bubbles float out of your mouth.' },
      { id: 'wm-17', min: 33,  max: 34,  event: 'Grass',               description: 'A spectral shield hovers near you for the next minute, granting you a +2 bonus to AC and immunity to Magic Missile.' },
      { id: 'wm-18', min: 35,  max: 36,  event: 'Fire Resistance',     description: 'You are immune to being intoxicated by alcohol for the next [5d6] days.' },
      { id: 'wm-19', min: 37,  max: 38,  event: 'Fog Cloud',           description: 'Your hair falls out but grows back within 24 hours.' },
      { id: 'wm-20', min: 39,  max: 40,  event: 'Aging Leap',          description: 'Until the spell ends, any flammable object you touch that isn\'t being worn or carried by another creature bursts into flame.' },
      { id: 'wm-21', min: 41,  max: 42,  event: 'Summon Aberration',   description: 'You regain [2d10] hit points.' },
      { id: 'wm-22', min: 43,  max: 44,  event: 'Butterfly Storm',     description: 'You turn into a potted plant until the start of your next turn. While a plant, you are incapacitated and have vulnerability to all damage. If you drop to 0 hit points, your pot breaks, and your form reverts.' },
      { id: 'wm-23', min: 45,  max: 46,  event: 'Mushroom Growth',     description: 'For the next minute, you can teleport up to 20 feet as a bonus action on each of your turns.' },
      { id: 'wm-24', min: 47,  max: 48,  event: 'Grease',              description: 'You cast Levitate on a random creature within 60 feet of you.' },
      { id: 'wm-25', min: 49,  max: 50,  event: 'Color Spray',         description: 'A creature that is friendly to you appears within 5 feet of you. Roll a d6 to determine the creature: 1, modron; 2, flumph; 3, modron; 4, unicorn; 5, modron; 6, modron. The creature disappears 1 minute later.' },
      { id: 'wm-26', min: 51,  max: 52,  event: 'Glowing Skin',        description: 'Your size increases by one size category for the next minute.' },
      { id: 'wm-27', min: 53,  max: 54,  event: 'Phantom Appearance',  description: 'The next time you cast a spell that deals damage within the next minute, don\'t roll the damage dice. Instead, use the highest number possible for each die.' },
      { id: 'wm-28', min: 55,  max: 56,  event: 'Frozen Ground',       description: 'For the next minute, each time you finish casting a spell that has a casting time of 1 action, roll a d4. On a 1, the spell has no effect, but you can choose the target of the spell.' },
      { id: 'wm-29', min: 57,  max: 58,  event: 'Web Burst',           description: 'You teleport to a random unoccupied space within 120 feet of you.' },
      { id: 'wm-30', min: 59,  max: 60,  event: 'Potion Explosion',    description: 'An illusory duplicate of yourself appears and mimics your actions, interposing itself between you and harmful spells and attacks.' },
      { id: 'wm-31', min: 61,  max: 62,  event: 'Animal Speech',       description: 'For the next minute, you can only communicate by whispering.' },
      { id: 'wm-32', min: 63,  max: 64,  event: 'Smoke Screen',        description: 'A spectral monkey appears and distracts your enemies.' },
      { id: 'wm-33', min: 65,  max: 66,  event: 'Feather Fall',        description: 'Up to three creatures you choose within 30 feet of you take [4d10] lightning damage.' },
      { id: 'wm-34', min: 67,  max: 68,  event: 'Levitate Target',     description: 'You are frightened by the nearest creature until the end of your next turn.' },
      { id: 'wm-35', min: 69,  max: 70,  event: 'Pixie Dust',          description: 'Each creature within 30 feet of you becomes invisible until the end of your next turn.' },
      { id: 'wm-36', min: 71,  max: 72,  event: 'Paralysis',           description: 'You gain resistance to all damage for the next minute.' },
      { id: 'wm-37', min: 73,  max: 74,  event: 'Random Polymorph',    description: 'A random creature within 60 feet of you becomes poisoned for [1d4] hours.' },
      { id: 'wm-38', min: 75,  max: 76,  event: 'Lightning Strike',    description: 'You glow with bright light in a 30-foot radius for the next minute. Any creature that ends its turn within 5 feet of you is blinded until the end of its next turn.' },
      { id: 'wm-39', min: 77,  max: 78,  event: 'Mage Hand Frenzy',    description: 'You cast Polymorph on yourself. If you fail the saving throw, you turn into a sheep for the spell\'s duration.' },
      { id: 'wm-40', min: 79,  max: 80,  event: 'Charm Person',        description: 'Illusory butterflies and flower petals flutter in the air within 10 feet of you for the next minute.' },
      { id: 'wm-41', min: 81,  max: 82,  event: 'Random Flight',       description: 'You can take one additional action immediately.' },
      { id: 'wm-42', min: 83,  max: 84,  event: 'Color Burst',         description: 'Each creature within 30 feet of you takes [1d10] necrotic damage. You regain hit points equal to the sum of the necrotic damage dealt.' },
      { id: 'wm-43', min: 85,  max: 86,  event: 'Gold Rain',           description: 'You cast Mirror Image.' },
      { id: 'wm-44', min: 87,  max: 88,  event: 'Size Reduction',      description: 'You cast Fly on a random creature within 60 feet of you.' },
      { id: 'wm-45', min: 89,  max: 90,  event: 'Mass Healing',        description: 'You become invisible until the start of your next turn or until you attack or cast a spell.' },
      { id: 'wm-46', min: 91,  max: 92,  event: 'Animal Companions',   description: 'If you die within the next minute, you immediately come back to life as if by the Reincarnate spell.' },
      { id: 'wm-47', min: 93,  max: 94,  event: 'Gravel Storm',        description: 'Your size decreases by one size category for the next minute.' },
      { id: 'wm-48', min: 95,  max: 96,  event: 'Gem Rain',            description: 'You and all creatures within 30 feet of you gain vulnerability to piercing damage for the next minute.' },
      { id: 'wm-49', min: 97,  max: 98,  event: 'Time Stutter',        description: 'You are surrounded by faint, ethereal music for the next minute.' },
      { id: 'wm-50', min: 99,  max: 100, event: 'Reroll',              description: 'You regain all expended sorcery points.' },
    ],
  },
  {
    id: 'default-random-weather',
    name: 'Random Weather',
    isDefault: true,
    rows: [
      { id: 'rw-1',  min: 1,  max: 2,  event: 'Clear Skies',         description: 'Bright sun, no clouds. Visibility excellent. No weather effects.' },
      { id: 'rw-2',  min: 3,  max: 4,  event: 'Partly Cloudy',       description: 'Scattered clouds, mild breeze. No significant weather effects.' },
      { id: 'rw-3',  min: 5,  max: 6,  event: 'Overcast',            description: 'Heavy cloud cover, dim light outdoors. No precipitation.' },
      { id: 'rw-4',  min: 7,  max: 8,  event: 'Windy',               description: 'Strong gusts (20–30 mph). Ranged weapon attacks at Disadvantage outdoors.' },
      { id: 'rw-5',  min: 9,  max: 10, event: 'Light Rain',          description: 'Steady light rain. Lightly Obscured outdoors. Open flames extinguished on a failed DC 10 CON save.' },
      { id: 'rw-6',  min: 11, max: 12, event: 'Heavy Rain',          description: 'Downpour. Heavily Obscured beyond 60 ft. Loud noise (Perception checks at Disadvantage). Open flames extinguished.' },
      { id: 'rw-7',  min: 13, max: 14, event: 'Thunderstorm',        description: 'Heavy rain + lightning. Every 10 minutes, DC 12 DEX save or take [1d6] Lightning damage from a nearby strike. Heavily Obscured.' },
      { id: 'rw-8',  min: 15, max: 15, event: 'Fog',                 description: 'Dense fog. Heavily Obscured within 30 ft, Lightly Obscured beyond. Darkvision halved.' },
      { id: 'rw-9',  min: 16, max: 16, event: 'Hail',                description: 'Icy pellets. Difficult terrain outdoors. Each minute of exposure: [1d4] bludgeoning damage.' },
      { id: 'rw-10', min: 17, max: 17, event: 'Snow',                description: 'Light snowfall. Difficult terrain (outdoors). Lightly Obscured. Tracks visible for 1 hour.' },
      { id: 'rw-11', min: 18, max: 18, event: 'Blizzard',            description: 'Heavy snow + wind. Heavily Obscured beyond 15 ft. Difficult terrain. Extreme cold (DC 10 CON save each hour or gain Exhaustion).' },
      { id: 'rw-12', min: 19, max: 19, event: 'Extreme Heat',        description: 'Scorching sun. Each hour without water/shade: DC 10 CON save or gain a level of Exhaustion. No cold damage vulnerabilities apply.' },
      { id: 'rw-13', min: 20, max: 20, event: 'Supernatural Weather', description: 'Unnatural phenomenon: DM\'s choice — ball lightning, colored rain, silent storm. Magical effects possible.' },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function rollDice(count, sides) {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

// Parses description text and returns an array of {type:'text'|'dice', value, count, sides}
function parseDescription(text) {
  const parts = [];
  const regex = /\[(\d+)d(\d+)\]/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'dice', value: match[0], count: parseInt(match[1]), sides: parseInt(match[2]) });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts;
}

// ── InlineDice ────────────────────────────────────────────────────────────────
function InlineDice({ count, sides, label }) {
  const [result, setResult] = useState(null);
  const [rolling, setRolling] = useState(false);

  function handleRoll() {
    setRolling(true);
    setResult(null);
    setTimeout(() => {
      const r = rollDice(count, sides);
      setResult(r);
      setRolling(false);
    }, 350);
  }

  return (
    <button
      className={`inline-dice-btn${rolling ? ' rolling' : ''}${result !== null ? ' rolled' : ''}`}
      onClick={handleRoll}
      title={`Roll ${label}`}
    >
      {rolling ? '🎲' : result !== null ? `🎲 ${result}` : label}
    </button>
  );
}

// ── DescriptionDisplay ────────────────────────────────────────────────────────
function DescriptionDisplay({ text }) {
  const parts = parseDescription(text);
  return (
    <span className="desc-display">
      {parts.map((p, i) =>
        p.type === 'text'
          ? <span key={i}>{p.value}</span>
          : <InlineDice key={i} count={p.count} sides={p.sides} label={p.value} />
      )}
    </span>
  );
}

// ── ResultPanel ───────────────────────────────────────────────────────────────
function ResultPanel({ roll, row, tableId }) {
  if (!row) return null;
  return (
    <div className="result-panel" key={`${tableId}-${roll}`}>
      <div className="result-roll-badge">🎲 Rolled: <span>{roll}</span></div>
      <div className="result-event">{row.event}</div>
      <div className="result-desc">
        <DescriptionDisplay text={row.description} />
      </div>
    </div>
  );
}

// ── TableRow ──────────────────────────────────────────────────────────────────
function TableRowItem({ row, highlighted, rowRef, isEditing, onChange, onDelete }) {
  if (isEditing) {
    return (
      <div className={`chaos-row editing-row`}>
        <input
          className="input row-input-range"
          type="number"
          value={row.min}
          onChange={e => onChange({ ...row, min: parseInt(e.target.value) || 0 })}
          placeholder="Min"
        />
        <span className="row-range-sep">–</span>
        <input
          className="input row-input-range"
          type="number"
          value={row.max}
          onChange={e => onChange({ ...row, max: parseInt(e.target.value) || 0 })}
          placeholder="Max"
        />
        <input
          className="input row-input-event"
          type="text"
          value={row.event}
          onChange={e => onChange({ ...row, event: e.target.value })}
          placeholder="Event name"
        />
        <input
          className="input row-input-desc"
          type="text"
          value={row.description}
          onChange={e => onChange({ ...row, description: e.target.value })}
          placeholder="Description (use [XdY] for dice)"
        />
        <button className="delete-btn small-btn row-del-btn" onClick={onDelete} title="Remove row">×</button>
      </div>
    );
  }

  return (
    <div
      ref={highlighted ? rowRef : null}
      className={`chaos-row${highlighted ? ' highlighted' : ''}`}
    >
      <span className="row-range">{row.min === row.max ? row.min : `${row.min}–${row.max}`}</span>
      <span className="row-event">{row.event}</span>
      <span className="row-desc">{row.description}</span>
    </div>
  );
}

// ── ChaosTable ────────────────────────────────────────────────────────────────
function ChaosTable({ table, onDelete, onDuplicate, onUpdate }) {
  const [rollResult, setRollResult] = useState(null); // { roll, row }
  const [rolling, setRolling] = useState(false);
  const highlightRef = useRef(null);

  useEffect(() => {
    if (rollResult && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [rollResult]);

  function handleRoll() {
    setRolling(true);
    setTimeout(() => {
      const tableMin = Math.min(...table.rows.map(r => r.min));
      const tableMax = Math.max(...table.rows.map(r => r.max));
      const roll = Math.floor(Math.random() * (tableMax - tableMin + 1)) + tableMin;
      const matchedRow = table.rows.find(r => roll >= r.min && roll <= r.max);
      setRollResult({ roll, row: matchedRow });
      setRolling(false);
    }, 500);
  }

  function handleRowChange(updatedRow) {
    onUpdate({
      ...table,
      rows: table.rows.map(r => r.id === updatedRow.id ? updatedRow : r),
    });
  }

  function handleAddRow() {
    const maxVal = table.rows.length > 0 ? Math.max(...table.rows.map(r => r.max)) + 1 : 1;
    onUpdate({
      ...table,
      rows: [...table.rows, { id: generateId(), min: maxVal, max: maxVal, event: '', description: '' }],
    });
  }

  function handleDeleteRow(rowId) {
    onUpdate({ ...table, rows: table.rows.filter(r => r.id !== rowId) });
  }

  const isEditing = !table.isDefault;
  const tableMin = table.rows.length > 0 ? Math.min(...table.rows.map(r => r.min)) : 1;
  const tableMax = table.rows.length > 0 ? Math.max(...table.rows.map(r => r.max)) : 100;

  return (
    <div className={`glass-panel chaos-table-card${isEditing ? ' custom-table' : ''}`}>
      {/* Header */}
      <div className="chaos-table-header">
        <div className="chaos-table-title-group">
          <span className="chaos-table-name">{table.name}</span>
          {table.isDefault && <span className="lock-badge">🔒 Default</span>}
          <span className="dice-range-badge">d{tableMax - tableMin + 1 === tableMax ? tableMax : `${tableMin}–${tableMax}`}</span>
        </div>
        <div className="chaos-table-actions">
          <button
            className={`chaos-roll-btn${rolling ? ' rolling' : ''}`}
            onClick={handleRoll}
            disabled={rolling || table.rows.length === 0}
            title="Roll on this table"
          >
            <span className="roll-btn-icon">{rolling ? '⚡' : '⚔️'}</span>
            <span>{rolling ? 'Rolling…' : 'Roll'}</span>
          </button>
          <button className="small-btn btn chaos-action-btn" onClick={onDuplicate} title="Duplicate table">📋</button>
          {!table.isDefault && (
            <button
              className="delete-btn small-btn chaos-action-btn"
              onClick={() => {
                if (window.confirm(`Delete table "${table.name}"?`)) onDelete();
              }}
              title="Delete table"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Rows */}
      <div className="chaos-rows-list">
        <div className="chaos-rows-header">
          <span>Range</span>
          <span>Event</span>
          <span>Description</span>
          {isEditing && <span></span>}
        </div>
        {table.rows.map(row => (
          <TableRowItem
            key={row.id}
            row={row}
            highlighted={rollResult?.row?.id === row.id}
            rowRef={highlightRef}
            isEditing={isEditing}
            onChange={handleRowChange}
            onDelete={() => handleDeleteRow(row.id)}
          />
        ))}
        {table.rows.length === 0 && (
          <div className="no-rows-msg">No rows yet. Add one below.</div>
        )}
      </div>

      {/* Add Row (edit mode) */}
      {isEditing && (
        <button className="btn btn-primary add-row-btn" onClick={handleAddRow}>+ Add Row</button>
      )}

      {/* Name editing */}
      {isEditing && (
        <div className="chaos-table-name-edit">
          <label className="name-edit-label">Table Name</label>
          <input
            className="input"
            value={table.name}
            onChange={e => onUpdate({ ...table, name: e.target.value })}
            placeholder="Table name"
          />
        </div>
      )}

      {/* Result Panel */}
      {rollResult && (
        <ResultPanel roll={rollResult.roll} row={rollResult.row} tableId={table.id} />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Chaos({ chaosData, updateChaosData }) {
  const customTables = chaosData?.customTables ?? [];
  const allTables = [...DEFAULT_TABLES, ...customTables];

  function handleUpdate(updatedTable) {
    updateChaosData({
      ...chaosData,
      customTables: customTables.map(t => t.id === updatedTable.id ? updatedTable : t),
    });
  }

  function handleDelete(tableId) {
    updateChaosData({
      ...chaosData,
      customTables: customTables.filter(t => t.id !== tableId),
    });
  }

  function handleDuplicate(table) {
    const newTable = {
      ...table,
      id: generateId(),
      name: `Copy of ${table.name}`,
      isDefault: false,
      rows: table.rows.map(r => ({ ...r, id: generateId() })),
    };
    updateChaosData({
      ...chaosData,
      customTables: [...customTables, newTable],
    });
  }

  function handleNewTable() {
    const newTable = {
      id: generateId(),
      name: 'New Table',
      isDefault: false,
      rows: [],
    };
    updateChaosData({
      ...chaosData,
      customTables: [...customTables, newTable],
    });
  }

  function scrollToTable(id) {
    const el = document.getElementById(`table-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="chaos-layout">
      {/* Side Navigation Menu */}
      <aside className="chaos-sidenav glass-panel">
        <h3 className="sidenav-title">Tables</h3>
        <div className="sidenav-links">
          {allTables.map(table => (
            <button
              key={table.id}
              className="sidenav-link-btn"
              onClick={() => scrollToTable(table.id)}
              title={`Scroll to ${table.name}`}
            >
              <span className="sidenav-link-icon">{table.isDefault ? '🔒' : '📝'}</span>
              <span className="sidenav-link-text">{table.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="chaos-container">
        {/* Page Header */}
        <div className="chaos-page-header">
          <div className="chaos-page-title-group">
            <h2 className="chaos-page-title">🎲 Chaos</h2>
            <p className="chaos-page-subtitle">Fumble &amp; Random Tables</p>
          </div>
          <button className="btn btn-primary new-table-btn" onClick={handleNewTable}>
            + New Table
          </button>
        </div>

        {/* Tables */}
        <div className="chaos-tables-list">
          {allTables.map(table => (
            <div id={`table-${table.id}`} key={table.id} className="chaos-table-wrapper">
              <ChaosTable
                table={table}
                onDelete={() => handleDelete(table.id)}
                onDuplicate={() => handleDuplicate(table)}
                onUpdate={handleUpdate}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
