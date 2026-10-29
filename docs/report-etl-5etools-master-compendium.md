# Architecture Report — Master Compendium (5e.tools → MongoDB)

**Project:** RPG Party Manager — Offline-first D&D 5e VTT  
**Source of Truth:** [5etools-src](https://github.com/5etools-mirror-3/5etools-src) (JSON) + [5etools-img](https://github.com/5etools-mirror-3/5etools-img) (assets)  
**Scope of this document:** structural mapping and TypeScript parser design. **No** seed script or MongoDB connection.  
**Date:** 2026-07-02 (BRT)

---

## Context and objective

The app today normalizes SRD content via `dnd5eapi.co` (`ISRDSpell`, `ISRDEquipmentItem` in `webapp/src/types/srd.ts`). The Master Compendium expands this to the full 5e.tools corpus (PHB, MM, TCE, XPHB, adventures, etc.), requiring:

1. **Book-partitioned ingestion** (`source` = short code: `PHB`, `MM`, `TCE`…).
2. **Inline tag sanitization** (`{@damage 8d6}`, `{@spell fireball|PHB}`…) present in nearly all narrative text.
3. **Media resolution** via the `5etools-img` repository, decoupled from JSON.

---

## 1. SRC Repository Mapping (The JSON)

### 1.1 General organization of `data/`

5e.tools **does not use a single monolithic JSON**. Each domain has a folder or root file, indices, and separate _fluff_ files:

| Domain       | File pattern                                    | Array root key            | Index                      |
| ------------ | ----------------------------------------------- | ------------------------- | -------------------------- |
| Spells       | `data/spells/spells-{SOURCE}.json`              | `"spell": [...]`          | `data/spells/index.json`   |
| Classes      | `data/class/class-{name}.json`                  | `"class": [...]`          | `data/class/index.json`    |
| Bestiary     | `data/bestiary/bestiary-{SOURCE}.json`          | `"monster": [...]`        | `data/bestiary/index.json` |
| Items (base) | `data/items-base.json`, `data/items.json`, etc. | `"baseitem"`, `"item"`, … | various                    |
| Books        | `data/books.json`                               | `"book": [...]`           | —                          |

Recurring auxiliary files in each domain:

- **`sources.json`** — cross-referenced metadata (e.g., which classes learn each spell).
- **`fluff-{domain}-{SOURCE}.json`** — lore + **images** (no stats).
- **`fluff-index.json`** — `SOURCE → fluff file` map.
- **`foundry.json`** — Foundry VTT export (useful as reference, not primary source).
- **`_meta.internalCopies`** — indicates duplicated/copied arrays within the same file (e.g., `subclass`, `subclassFeature`).

### 1.2 `data/spells/` — item schema

Each spell is an object within `"spell": [ ... ]`. Canonical 5e.tools identity:

```
{name}|{source}   →   e.g.: "Fireball|PHB"
```

Observed fields (real sample from `spells-phb.json`):

| Field                                             | Type                        | Purpose                                                   |
| ------------------------------------------------- | --------------------------- | --------------------------------------------------------- |
| `name`                                            | string                      | Display name                                              |
| `source`                                          | string                      | **Book code** (`PHB`, `XPHB`, `TCE`…)                     |
| `page`                                            | number                      | Page in book                                              |
| `srd` / `basicRules` / `srd52` / `basicRules2024` | boolean                     | SRD / basic rules availability flags                      |
| `otherSources`                                    | `{ source, page }[]`        | Secondary appearance in another book                      |
| `referenceSources`                                | string[]                    | References in adventures/other products                   |
| `reprintedAs`                                     | string[]                    | Reprint `"Name\|SOURCE"` (e.g., `"Fireball\|XPHB"`)       |
| `level`                                           | number                      | 0 = cantrip                                               |
| `school`                                          | string                      | **Internal code** (`V`, `E`, `A`…) — not long text        |
| `time`                                            | `{ number, unit }[]`        | Structured casting time                                   |
| `range`                                           | object                      | `type` + `distance` (`feet`, `self`, `sight`…)            |
| `components`                                      | `{ v?, s?, m? }`            | Components; `m` can be long string                        |
| `duration`                                        | array                       | `instant`, `timed`, `permanent`, `special` + sub-objects  |
| `entries`                                         | `(string \| EntryObject)[]` | **Description with `{@…}` tags**                          |
| `entriesHigherLevel`                              | EntryObject[]               | Upcast text                                               |
| `scalingLevelDice`                                | object                      | Per-level formulas (alternative to `{@scaledamage}` tags) |
| `damageInflict`                                   | string[]                    | Types (`fire`, `acid`…)                                   |
| `savingThrow`                                     | string[]                    | Saves (`dexterity`…)                                      |
| `miscTags` / `areaTags`                           | string[]                    | Internal taxonomy for 5e.tools filters                    |
| `hasFluff` / `hasFluffImages`                     | boolean                     | Indicates fluff/image existence in sidecar                |

**Important:** the list of **classes that know the spell is not in the spell object**. It lives in:

```
data/spells/sources.json
  └── { SPELL_SOURCE: { "Spell Name": { "class": [ { "name": "Wizard", "source": "PHB" }, … ] } } }
```

That is, the ETL must **join** `spells-*.json` + `sources.json` to populate `classes[]` in the internal schema.

### 1.3 `data/class/` — item schema

File per class (`class-wizard.json`), index in `class/index.json`:

```json
{ "wizard": "class-wizard.json", "fighter": "class-fighter.json", … }
```

Each file contains multiple arrays (even `_meta.internalCopies`):

| Array               | Content                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `class[]`           | Class definition — **multiple editions in the same file** (e.g., `source: "PHB"` classic + `source: "XPHB"` one) |
| `subclass[]`        | Subclasses (School of Evocation, etc.)                                                                           |
| `classFeature[]`    | Features numbered by level                                                                                       |
| `subclassFeature[]` | Subclass features                                                                                                |

Relevant fields in `class[]`:

- `source`, `page`, `edition` (`classic` \| `one`)
- `hd`, `proficiency`, `spellcastingAbility`, `casterProgression`
- `startingProficiencies`, `startingEquipment` — **strings with tags** `{@item …}`
- `classTableGroups` — progression table columns (may contain `{@filter …}`)
- `classFeatures` — list of references `"Feature Name|Class||level|SOURCE?"` or objects `{ classFeature, gainSubclassFeature }`
- `hasFluff` / `hasFluffImages`

Feature/subclass keys follow pipe-delimited:

```
Arcane Tradition|Wizard||2
Cantrip Formulas|Wizard||3|TCE
Wizard Subclass|Wizard|XPHB|3
```

### 1.4 Where Source / book lives (PHB, TCE, …)

| Level                  | Where                                                                            | Example                                                                |
| ---------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Per entity**         | Field `source` in spell, monster, class, item                                    | `"source": "PHB"`                                                      |
| **Book catalog**       | `data/books.json` → `"book": [{ id, source, name, group, cover, published, … }]` | `"id": "PHB"`, `"name": "Player's Handbook (2014)"`                    |
| **Per-domain sidecar** | Filename                                                                         | `spells-tce.json`, `bestiary-mm.json`                                  |
| **Inline tags**        | Pipe after name                                                                  | `{@item longsword\|phb}`, `{@spell fireball\|PHB\|optional link text}` |
| **Reprints**           | `reprintedAs`                                                                    | `"Fireball\|XPHB"` links 2014 edition → 2024                           |
| **Cross-references**   | `otherSources`, `referenceSources`                                               | appearances in adventures                                              |

**Golden rule for compound key in MongoDB:**

```text
entityKey = `${normalize(name)}|${source.toUpperCase()}`
```

Tags use `source` **case-insensitive** in practice (`phb` ≡ `PHB`).

### 1.5 The tag challenge — exact patterns

General syntax (documented in the [Renderer Demo](https://5etools.vercel.app/renderdemo.html) and [5e-tools-tags](https://github.com/Jklein64/5e-tools-tags) extension):

```text
{@tag}
{@tag content}
{@tag content|source}
{@tag content|source|link text}
{@tag content|source|text|…}    ← additional pipes (class, subclass, level…)
{@tag content|source|…}*          ← * suffix on homebrew (alternate display)
```

#### Mechanical tags (high priority in sanitizer)

| Tag                | Exact pattern                                   | Real example                                | Suggested cleanup                     |
| ------------------ | ----------------------------------------------- | ------------------------------------------- | ------------------------------------- |
| `{@dice …}`        | `{@dice EXPR}` or `{@dice EXPR\|EXPR\|display}` | `{@dice 4d4 × 10\|4d4 × 10\|Starting Gold}` | Extract EXPR or 3rd segment (display) |
| `{@damage …}`      | `{@damage FORM}`                                | `{@damage 8d6}`, `{@damage 1d4 + 2}`        | → `8d6` / `1d4 + 2`                   |
| `{@scaledamage …}` | `{@scaledamage base\|slotMin-slotMax\|perSlot}` | `{@scaledamage 8d6\|3-9\|1d6}`              | → readable text or structured object  |
| `{@scaledice …}`   | `{@scaledice …}`                                | scaling variants                            | same                                  |
| `{@hit …}`         | `{@hit MOD}`                                    | `{@hit 4}`, `{@hit +6}`                     | → `+4 to hit` or just `+4`            |
| `{@h}`             | literal `{@h}`                                  | before hit damage                           | → `"Hit: "` or remove                 |
| `{@atk …}`         | `{@atk m\|r\|a}[w\|s][,…]`                      | `{@atk mw}`, `{@atk mw,rw}`                 | → `"Melee Weapon Attack:"` etc.       |
| `{@dc …}`          | `{@dc …}`                                       | Ability DCs                                 | extract number/text                   |
| `{@d20}`           | `{@d20}`                                        |                                             | → `d20`                               |
| `{@recharge N}`    | `{@recharge 5}`                                 |                                             | → `(Recharge 5-6)`                    |
| `{@status …}`      | `{@status id}` or `{@status id\|display}`       | `{@status concentration}`                   | → condition name                      |
| `{@condition …}`   | `{@condition id\|source?}`                      | `{@condition blinded}`                      | → `"blinded"` + optional ref          |

#### Cross-reference tags (medium priority — preserve as links)

| Tag                                               | Pattern                                       | Example                                           |
| ------------------------------------------------- | --------------------------------------------- | ------------------------------------------------- |
| `{@spell …}`                                      | `{@spell name\|source?\|display?}`            | `{@spell fireball}`, `{@spell tiny servant\|XGE}` |
| `{@item …}`                                       | `{@item name\|source?\|display?}`             | `{@item quarterstaff\|phb}`                       |
| `{@creature …}`                                   | `{@creature name\|source?\|display?}`         | `{@creature air elemental}`                       |
| `{@class …}`                                      | `{@class name\|source?\|display?\|subclass?}` | `{@class wizard\|phb}`                            |
| `{@classFeature …}`                               | `{@classFeature …}`                           | features with level pipes                         |
| `{@subclassFeature …}`                            | same                                          |                                                   |
| `{@skill …}`                                      | `{@skill arcana}`                             |                                                   |
| `{@filter …}`                                     | `{@filter text\|page\|filters…}`              | UI filter links — **do not** resolve in ETL       |
| `{@book …}` / `{@adventure …}`                    | chapter/section                               | book/adventure navigation                         |
| `{@object …}`                                     | `{@object Ballista\|DMG}`                     |                                                   |
| `{@feat …}`, `{@race …}`, `{@background …}`, etc. | same pipe pattern                             | see full list below                               |

List of content tags recognized by the 5e.tools ecosystem (case-insensitive):

`@action`, `@adventure`, `@area`, `@atk`, `@b`, `@background`, `@bold`, `@book`, `@boon`, `@chance`, `@class`, `@classFeature`, `@color`, `@condition`, `@creature`, `@cult`, `@d20`, `@damage`, `@dc`, `@deity`, `@dice`, `@disease`, `@feat`, `@filter`, `@footnote`, `@h`, `@hazard`, `@hit`, `@homebrew`, `@i`, `@italic`, `@item`, `@language`, `@link`, `@loader`, `@note`, `@object`, `@optfeature`, `@psionic`, `@race`, `@recharge`, `@reward`, `@s`, `@scaledice`, `@scaledamage`, `@sense`, `@skill`, `@spell`, `@status`, `@strike`, `@subclassFeature`, `@table`, `@tags`, `@trap`, `@variantrule`, `@vehicle`, `@5etools`

#### Formatting tags (low priority)

| Tag                      | Example           | Cleanup                            |
| ------------------------ | ----------------- | ---------------------------------- |
| `{@b …}` / `{@bold …}`   | `{@b Strength}`   | keep text; optional `**Strength**` |
| `{@i …}` / `{@italic …}` | `{@i Rod of Law}` | keep text; optional `*Rod of Law*` |
| `{@s …}`                 | strikethrough     | keep text                          |
| `{@footnote …}`          | footnotes         | move to `footnotes[]` array        |

Alternative markers in fluff (not `{@tag}`):

- `{@i …}` in lore text (magic item semantic italic).
- `EntryObject` objects with `"type": "entries"`, `"inset"`, `"table"`, `"list"`, `"image"` — **not string tags**.

### 1.6 Regex — identification and cleanup

**A single global `replace` is not enough.** The 5e.tools renderer uses a dedicated parser (nested tags, variable pipes, `*` suffix).

#### Step 1 — Tokenizer (capture regex)

```typescript
/** Captures each inline tag; groups: (1) tagName (2) body up to '}' */
const FIVEE_TAG_PATTERN = /\{@([a-zA-Z0-9]+)\s+([^}]*)\}|\{@([a-zA-Z0-9]+)\}/g
```

For body with pipes, additional parse:

```typescript
/** Split tag body respecting pipes (not escaped) */
function splitTagPayload(raw: string): string[] {
  return raw.split('|').map(s => s.trim())
}
```

#### Step 2 — Per-family regex (mechanical replacement)

```typescript
// Damage / dice — extract expression
/\{@damage\s+([^}|]+)(?:\|[^}]*)?\}/gi        → '$1'
/\{@dice\s+([^}|]+)(?:\|([^}|]+))?(?:\|[^}]*)?\}/gi  → '$2' ?? '$1'

// Condition / status — first segment
/\{@condition\s+([^|}\s]+)(?:\|[^}]*)?\}/gi  → '$1'
/\{@status\s+([^|}\s]+)(?:\|[^}]*)?\}/gi      → '$1'

// References — keep display name (1st segment or 3rd if present)
/\{@spell\s+([^|}]+)(?:\|[^|}]*)?(?:\|([^}]+))?\}/gi → '$2' ?? '$1'
/\{@item\s+([^|}]+)(?:\|[^|}]*)?(?:\|([^}]+))?\}/gi  → '$2' ?? '$1'
/\{@creature\s+([^|}]+)(?:\|[^|}]*)?(?:\|([^}]+))?\}/gi → '$2' ?? '$1'

// Bestiary attack
/\{@hit\s+([^}]+)\}/gi                         → '+$1' (normalize sign)
/\{@h\}/gi                                     → 'Hit: '
/\{@atk\s+([^}]+)\}/gi                         → mapAtkCodes('$1') // mw→Melee Weapon

// Formatting — strip wrapper
/\{@(?:b|bold|i|italic)\s+([^}]+)\}/gi       → '$1'

// Scaling (preserve or parse structured)
/\{@scaledamage\s+([^|}]+)\|([^|}]+)\|([^}]+)\}/gi
```

#### Step 3 — Recommended strategy (2 layers)

1. **`plainText`** — plain text for search/UI (mechanical tags resolved, refs as simple names).
2. **`richRefs[]`** — graph `{ kind, name, source?, display? }` extracted from `{@spell}`, `{@item}`, `{@creature}` tags for linking in the Compendium.

Avoid regex-only for nested `entries` (`EntryObject[]`); use recursive JSON walker.

---

## 2. Relationship with the IMG Repository (The Assets)

### 2.1 Principle: JSON **does not** embed binaries

Stats and lore live in **src**; images/tokens live in **img**. The link is:

1. **Flags on the main record** — `hasFluff`, `hasFluffImages`, `hasToken`.
2. **Fluff sidecar file** — `fluff-spells-phb.json`, `fluff-bestiary-mm.json`, `fluff-items.json` (global or per source).
3. **`href` object within `images[]`** — relative path to the img repo root.

Real example (`fluff-spells-phb.json`):

```json
{
  "name": "Fireball",
  "source": "PHB",
  "images": [
    {
      "type": "image",
      "href": { "type": "internal", "path": "spells/PHB/Fireball.webp" },
      "width": 449,
      "height": 1000
    }
  ]
}
```

Monster example (`fluff-bestiary-mm.json`):

```json
"href": { "type": "internal", "path": "bestiary/MM/Aarakocra.webp" }
```

Item example (`fluff-items.json`):

```json
"href": { "type": "internal", "path": "items/DMG/Alchemy Jug.webp" }
```

Spell fluff index:

```json
// data/spells/fluff-index.json
{ "PHB": "fluff-spells-phb.json", "TCE": "fluff-spells-tce.json", … }
```

### 2.2 Path naming patterns

| Type                | Relative path (img repo)                       | Note                                 |
| ------------------- | ---------------------------------------------- | ------------------------------------ |
| Spell art           | `spells/{SOURCE}/{Spell Name}.webp`            | Not every spell has art; subset only |
| Monster portrait    | `bestiary/{SOURCE}/{Monster Name}.webp`        | `{SOURCE}` = MM, VGM, XMM…           |
| VTT token           | `bestiary/tokens/{SOURCE}/{Monster Name}.webp` | `hasToken: true` in JSON             |
| Magic item          | `items/{SOURCE}/{Item Name}.webp`              |                                      |
| Class / cover       | `classes/…`, `covers/{SOURCE}.webp`            | via `books.json` → `cover.path`      |
| Audio (rare)        | `bestiary/{slug}.opus`                         | e.g., `soundClip.path` on monster    |
| External (homebrew) | `"type": "external", "url": "https://…"`       | not in the official img repo         |

**Conventions:**

- Folder separator `/`; **case-sensitive** on Linux (names preserve game capitalization: `Mordenkainen's Sword.webp`).
- Predominant format: **`.webp`** (tokens without aggressive compression; art ~85% quality).
- `{SOURCE}` in path **coincides** with the entity `source` field (e.g., `PHB`, `MM`, `DMG`), not with the JSON file slug.

### 2.3 URL resolution (runtime)

Configurable base (Electron / local server):

```text
ASSET_BASE = file:///…/5etools-img/   (offline)
           | https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/
```

Final URL:

```text
${ASSET_BASE}${href.path}
→ …/spells/PHB/Fireball.webp
```

Fallback when `hasFluffImages` but fluff missing: token → portrait → `blank.webp` / `blank-friendly.webp` at the img root.

### 2.4 How to persist in MongoDB (recommended design)

**Do not** hardcode absolute URLs. Store **stable** references + resolve on the frontend:

```typescript
interface CompendiumAssetRef {
  kind: 'internal' | 'external'
  /** Relative path to 5etools-img root (internal) */
  path?: string
  /** Full URL (external / homebrew) */
  url?: string
  role: 'portrait' | 'token' | 'spellArt' | 'itemArt' | 'cover' | 'audio'
  width?: number
  height?: number
  credit?: string
}

interface CompendiumMediaBundle {
  portrait?: CompendiumAssetRef
  token?: CompendiumAssetRef
  gallery?: CompendiumAssetRef[]
}
```

Entity document (spell / monster / item):

```typescript
{
  _id: "fireball|PHB",           // or ObjectId + compound unique index
  entityKey: "fireball|PHB",
  source: "PHB",
  name: "Fireball",
  // … normalized fields …
  media: {
    portrait: { kind: 'internal', path: 'spells/PHB/Fireball.webp', role: 'spellArt', width: 449, height: 1000 }
  },
  provenance: {
    dataRepo: '5etools-src',
    dataPath: 'data/spells/spells-phb.json',
    fluffPath: 'data/spells/fluff-spells-phb.json',
    imgRepo: '5etools-img',
    ingestedAt: '2026-07-02T…'
  }
}
```

**Suggested MongoDB indexes:**

- `{ entityKey: 1 }` unique
- `{ source: 1, entityType: 1 }`
- `{ name: 'text', 'search.plainText': 'text' }`
- `{ 'media.token.path': 1 }` sparse (VTT)

**Optional separate collection `compendium_assets`** to deduplicate shared paths and cache hash/blurhash in the future.

**Offline-first:** in the Electron seed, copy a subset of `5etools-img` to `userData/compendium-assets/` and store `path` relative to that folder; field `bundled: true`.

---

## 3. Parser Interface Design (TypeScript)

Aligned with the existing schema (`ISRDSpell`, `IEnemy`, `LogicBlock`) but **source-agnostic** for 5e.tools.

### 3.1 RAW types (5e.tools input)

```typescript
/** Book code — PHB, MM, TCE, XPHB, … */
export type FiveESourceCode = string

export interface FiveEEntityRef {
  name: string
  source: FiveESourceCode
}

/** Media href in fluff JSON */
export interface FiveEMediaHref {
  type: 'internal' | 'external'
  path?: string
  url?: string
}

export interface FiveEImageBlock {
  type: 'image'
  href: FiveEMediaHref
  width?: number
  height?: number
  credit?: string
}

/** Generic entry block (renderer) */
export type FiveEEntry = string | FiveEEntryObject | FiveEEntryObject[]

export interface FiveEEntryObject {
  type: string
  name?: string
  entries?: FiveEEntry
  [key: string]: unknown
}

export interface FiveESpellRaw {
  name: string
  source: FiveESourceCode
  page?: number
  level: number
  school: string
  time?: Array<{ number: number; unit: string }>
  range?: Record<string, unknown>
  components?: { v?: boolean; s?: boolean; m?: string | boolean }
  duration?: Array<Record<string, unknown>>
  entries?: FiveEEntry
  entriesHigherLevel?: FiveEEntryObject[]
  scalingLevelDice?: Record<string, unknown>
  damageInflict?: string[]
  savingThrow?: string[]
  miscTags?: string[]
  areaTags?: string[]
  ritual?: boolean
  concentration?: boolean
  srd?: boolean
  basicRules?: boolean
  reprintedAs?: string[]
  hasFluff?: boolean
  hasFluffImages?: boolean
  [key: string]: unknown
}

export interface FiveESpellClassEntry {
  name: string
  source: FiveESourceCode
}

/** Portion of data/spells/sources.json */
export type FiveESpellSourcesMap = Record<
  FiveESourceCode,
  Record<string, { class?: FiveESpellClassEntry[]; [key: string]: unknown }>
>

export interface FiveESpellFluffRaw {
  name: string
  source: FiveESourceCode
  entries?: FiveEEntry
  images?: FiveEImageBlock[]
}

export interface FiveEClassRaw {
  name: string
  source: FiveESourceCode
  page?: number
  edition?: 'classic' | 'one' | string
  hd?: { number: number; faces: number }
  proficiency?: string[]
  spellcastingAbility?: string
  casterProgression?: 'full' | 'half' | 'third' | 'none' | string
  classFeatures?: Array<string | Record<string, unknown>>
  startingEquipment?: Record<string, unknown>
  hasFluff?: boolean
  hasFluffImages?: boolean
  [key: string]: unknown
}

export interface FiveEMonsterRaw {
  name: string
  source: FiveESourceCode
  page?: number
  size?: string[]
  type?: Record<string, unknown> | string
  ac?: Array<number | Record<string, unknown>>
  hp?: { average?: number; formula?: string }
  speed?: Record<string, number | string>
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
  cr?: string | number | Record<string, unknown>
  trait?: FiveEEntryObject[]
  action?: FiveEEntryObject[]
  bonus?: FiveEEntryObject[]
  reaction?: FiveEEntryObject[]
  legendary?: FiveEEntryObject[]
  hasToken?: boolean
  hasFluff?: boolean
  hasFluffImages?: boolean
  [key: string]: unknown
}
```

### 3.2 Normalized types (Master Compendium output)

```typescript
import type { LogicBlock } from '../types/domain/logic-block'

export type CompendiumEntityType =
  | 'spell'
  | 'monster'
  | 'item'
  | 'class'
  | 'subclass'
  | 'feat'
  | 'race'

export interface ParsedInlineTag {
  tag: string
  raw: string
  segments: string[]
  displayText: string
  ref?: {
    kind:
      | CompendiumEntityType
      | 'condition'
      | 'skill'
      | 'damage'
      | 'dice'
      | 'unknown'
    name?: string
    source?: string
  }
}

export interface SanitizedText {
  plainText: string
  markdown?: string
  tags: ParsedInlineTag[]
}

export interface CompendiumAssetRef {
  kind: 'internal' | 'external'
  path?: string
  url?: string
  role: 'portrait' | 'token' | 'spellArt' | 'itemArt' | 'cover' | 'audio'
  width?: number
  height?: number
  credit?: string
}

export interface MasterSpell {
  id: string
  entityKey: string
  index: string
  name: string
  source: string
  page?: number
  level: number
  school: string
  schoolLabel: string
  castingTime: string
  range: string
  duration: string
  ritual: boolean
  concentration: boolean
  components: string[]
  material?: string
  description: string
  higherLevel?: string
  classes: string[]
  damageFormula?: string
  damageType?: string
  saveType?: string
  search: SanitizedText
  media?: { spellArt?: CompendiumAssetRef; gallery?: CompendiumAssetRef[] }
  logicBlock: LogicBlock
  provenance: CompendiumProvenance
  sourceFlags: { srd?: boolean; basicRules?: boolean; edition?: string }
  reprintedAs?: string[]
}

export interface MasterMonster {
  id: string
  entityKey: string
  name: string
  source: string
  cr: string
  ac: number
  hpAverage?: number
  hpFormula?: string
  abilities: Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>
  traits: Array<{ name: string; description: string; search: SanitizedText }>
  actions: Array<{
    name: string
    description: string
    attacks?: NormalizedAttack[]
    search: SanitizedText
  }>
  media?: { portrait?: CompendiumAssetRef; token?: CompendiumAssetRef }
  provenance: CompendiumProvenance
}

export interface CompendiumProvenance {
  provider: '5etools'
  dataPath: string
  fluffPath?: string
  sourceFile: string
  ingestedAt: string
  version?: string
}

export interface NormalizedAttack {
  toHit?: number
  reach?: string
  range?: string
  damage?: Array<{ formula: string; type: string; average?: number }>
  save?: string
}
```

### 3.3 Parser options and results

```typescript
export interface FiveEToolsSanitizerOptions {
  /** defaultSource applied when tag omits |SOURCE| */
  defaultSource?: string
  /** 'plain' | 'markdown' | 'both' */
  outputFormat?: 'plain' | 'markdown' | 'both'
  /** Extract structured refs beyond text */
  extractRefs?: boolean
  /** Map tag → custom handler */
  tagHandlers?: Partial<Record<string, FiveETagHandler>>
}

export type FiveETagHandler = (
  tag: string,
  segments: string[],
  raw: string,
  ctx: FiveETagContext,
) => SanitizedText | string

export interface FiveETagContext {
  defaultSource: string
  entityType?: CompendiumEntityType
}

export interface ParseEntriesResult {
  blocks: Array<{ type: string; name?: string; body: SanitizedText }>
  merged: SanitizedText
}
```

### 3.4 `FiveEToolsSanitizer` class signature

```typescript
export class FiveEToolsSanitizer {
  constructor(options?: FiveEToolsSanitizerOptions);

  /** Regex tokenizer + per-tag dispatch */
  parseInlineTags(input: string, ctx?: FiveETagContext): SanitizedText;

  /** Recursive walker for string | EntryObject | arrays */
  parseEntries(entries: FiveEEntry | undefined, ctx?: FiveETagContext): ParseEntriesResult;

  /** Mechanical shortcuts */
  stripDamageTags(text: string): string;
  stripDiceTags(text: string): string;
  stripConditionTags(text: string): string;
  stripFormattingTags(text: string): string;

  /** Convert bestiary codes */
  parseAtkTag(payload: string): string;
  parseHitTag(modifier: string): string;
  parseScaledDamageTag(segments: string[]): { base: string; slotRange?: string; perSlot?: string };

  /** Resolve {@spell foo|bar|baz} → ParsedInlineTag */
  parseReferenceTag(tag: string, segments: string[]): ParsedInlineTag;
}

export class FiveEToolsSpellAdapter {
  constructor(
    private sanitizer: FiveEToolsSanitizer,
    private schoolLabels: Record<string, string>,
  );

  /** Join spell + sources.json class list + optional fluff */
  toMasterSpell(
    raw: FiveESpellRaw,
    classList: FiveESpellClassEntry[] | undefined,
    fluff?: FiveESpellFluffRaw,
  ): MasterSpell;

  buildEntityKey(name: string, source: string): string;
  formatCastingTime(time: FiveESpellRaw['time']): string;
  formatRange(range: FiveESpellRaw['range']): string;
  formatDuration(duration: FiveESpellRaw['duration']): string;
  extractComponents(components: FiveESpellRaw['components']): { list: string[]; material?: string };
  buildLogicBlock(raw: FiveESpellRaw, sanitized: SanitizedText): LogicBlock;
}

export class FiveEToolsMonsterAdapter {
  constructor(private sanitizer: FiveEToolsSanitizer);

  toMasterMonster(
    raw: FiveEMonsterRaw,
    fluff?: { images?: FiveEImageBlock[]; entries?: FiveEEntry },
  ): MasterMonster;

  parseActionBlock(action: FiveEEntryObject): {
    name: string;
    description: string;
    attacks?: NormalizedAttack[];
    search: SanitizedText;
  };

  inferTokenPath(raw: FiveEMonsterRaw): CompendiumAssetRef | undefined;
  inferPortraitPath(raw: FiveEMonsterRaw, fluff?: FiveEImageBlock[]): CompendiumAssetRef | undefined;
}

export class FiveEToolsMediaResolver {
  constructor(private assetBaseUrl: string);

  resolve(ref: CompendiumAssetRef): string;
  resolveInternalPath(path: string): string;

  /** bestiary/tokens/{SOURCE}/{Name}.webp */
  defaultTokenPath(name: string, source: string): string;
  /** spells/{SOURCE}/{Name}.webp */
  defaultSpellArtPath(name: string, source: string): string;
  /** bestiary/{SOURCE}/{Name}.webp */
  defaultPortraitPath(name: string, source: string): string;
  /** items/{SOURCE}/{Name}.webp */
  defaultItemArtPath(name: string, source: string): string;
}

/** High-level orchestrator (no I/O — transformation only) */
export class FiveEToolsCompendiumParser {
  constructor(
    private sanitizer: FiveEToolsSanitizer,
    private spellAdapter: FiveEToolsSpellAdapter,
    private monsterAdapter: FiveEToolsMonsterAdapter,
    private mediaResolver: FiveEToolsMediaResolver,
  );

  parseSpellBundle(args: {
    spells: FiveESpellRaw[];
    sources?: FiveESpellSourcesMap;
    fluffByKey?: Map<string, FiveESpellFluffRaw>;
    sourceCode: string;
  }): MasterSpell[];

  parseMonsterBundle(args: {
    monsters: FiveEMonsterRaw[];
    fluffByKey?: Map<string, { images?: FiveEImageBlock[] }>;
    sourceCode: string;
  }): MasterMonster[];

  /** Normalize key for fluff/source maps */
  static entityMapKey(name: string, source: string): string;
}
```

### 3.5 Mapping → current app schema

| 5e.tools field       | Current internal field | Notes                                         |
| -------------------- | ---------------------- | --------------------------------------------- |
| `name` + `source`    | `id`, `index`          | generate stable slug                          |
| sanitized `entries`  | `description`          | `ISRDSpell.description`                       |
| `entriesHigherLevel` | `higherLevel`          |                                               |
| `school` code        | `school` label         | conversion table                              |
| join `sources.json`  | `classes[]`            | **required**                                  |
| `damageInflict[0]`   | `damageType`           | prefer tags/`scalingLevelDice` if present     |
| `savingThrow[0]`     | `saveType`             |                                               |
| fluff `images[0]`    | new `media.spellArt`   | extension beyond SRD API                      |
| —                    | `logicBlock`           | generate via `buildLogicBlock()` + RuleEngine |
| —                    | `source: '5etools'`    | distinguish from `'dnd5eapi'`                 |

---

## Next steps (outside this document)

1. Validate these interfaces in `webapp/src/services/compendium/fiveETools/` (types + sanitizer unit tests only).
2. Define **ingestion subset** (e.g., PHB + MM + TCE + XPHB) vs full corpus (~GB img).
3. Seed script: mirrored clone → parse → bulkWrite MongoDB → sync local assets Electron.
4. Extend `ISRDCatalog` or new `masterCompendium` collection with provenance flag.

---

## References

- [5etools-src — data/spells](https://github.com/5etools-mirror-3/5etools-src/tree/main/data/spells)
- [5etools-src — data/class](https://github.com/5etools-mirror-3/5etools-src/tree/main/data/class)
- [5etools-img](https://github.com/5etools-mirror-3/5etools-img)
- [Renderer Demo (tag syntax)](https://5etools.vercel.app/renderdemo.html)
- [5e-tools-tags — tag list](https://github.com/Jklein64/5e-tools-tags)
- Current internal schema: `webapp/src/types/srd.ts`, `webapp/src/types/domain/logic-block.ts`
