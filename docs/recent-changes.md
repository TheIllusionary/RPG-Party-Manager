# Recent Changes — RPG Party Manager

Document summarizing changes in the frontend, API, desktop, and local infrastructure.  
**Reference timezone:** BRT (UTC−3), unless otherwise noted.

**Last updated:** `2026-07-15 · 18:30 (BRT)`

## 21. Large Component Refactoring (Jul/2026)

**Date · Time (BRT):** `2026-07-15 · 18:30`

### What changed

- **EnemyLibrary.tsx** (1859 lines) had the **Buffs & Debuffs** sub-tab extracted into `BuffsSubTab.tsx` (~656 lines) and the monster detail preview extracted into `MonsterDetailPreview.tsx` (~310 lines).
- Created `webapp/src/features/bestiary/components/` directory following the `features/battle/components/` pattern.
- TypeScript build validated without errors after the changes.

### Technical details

- `BuffsSubTab` encapsulates all buff editing/creation state: `buffDraft`, `editingBuffId`, `buffSearchTerm`, and the full editor with toggle/fixed/turn properties.
- `MonsterDetailPreview` renders the preview card for attacks, stats, saves, skills, resistances, and roll results.
- `EnemyLibrary.tsx` keeps control of sub-tabs (`bestiary`, `buffs`, `items`), pagination, monster CRUD, and the inline attack editor.

### Files

| File                                                               | Change                                                    |
| ------------------------------------------------------------------ | --------------------------------------------------------- |
| `webapp/src/features/bestiary/EnemyLibrary.tsx`                    | Imports and uses `BuffsSubTab` and `MonsterDetailPreview` |
| `webapp/src/features/bestiary/components/BuffsSubTab.tsx`          | **New** — isolated Buffs & Debuffs sub-tab                |
| `webapp/src/features/bestiary/components/MonsterDetailPreview.tsx` | **New** — isolated monster detail preview                 |
| `docs/CHANGELOG_AI.md`                                             | Updated with refactoring entry                            |
| `docs/recent-changes.md`                                           | This section                                              |
| `docs/AI_INSTRUCTIONS.md`                                          | Updated directory layout                                  |

---

## Chronological index (most recent first)

| Date · Time (BRT)  | Section                                                       | Summary                                                                      |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 2026-07-02 · 24:15 | [§20](#20-spell-filters-in-compendium-jul2026)                | Filters by level, class, duration, casting time, components, and more        |
| 2026-07-02 · 23:45 | [§19](#19-inline-combat-ui-jul2026)                           | Quick damage/heal bar, resistance badges, Encounter/Scene panel              |
| 2026-07-02 · 23:00 | [§18](#18-rules-engine-in-combat-jul2026)                     | Rules fire on damage/heal/turn/spell; monsters and NPCs included             |
| 2026-07-02 · 22:30 | [§17](#17-rules-affect-mana-and-hp-jul2026)                   | Active `compute` rules now calculate max mana and HP in the party            |
| 2026-07-02 · 22:00 | [§16](#16-rules-in-the-campaign-jul2026)                      | Rules tab in campaign: enable/disable blocks; `logicBlocks` saved to MongoDB |
| 2026-07-02 · 21:15 | [§15](#15-soft-delete-for-rules-and-class-attributes-jul2026) | Rule deletion with tombstone; D&D 5e class → attribute mapping               |
| 2026-07-02 · 20:30 | [§14](#14-sync-dashboard-and-console-jul2026)                 | DM Dashboard no longer attempts cloud sync; less noise in Electron console   |
| 2026-07-02 · 19:00 | [§13](#13-global-root-layout-jul2026)                         | `RootLayout` centers content; children without duplicate wrappers            |
| 2026-07-02 · 18:00 | [§12](#12-vertical-block-builder-jul2026)                     | Rules editor in vertical stack, friendly labels, split layout                |
| 2026-07-02 · 14:30 | [§11](#11-visual-rules-editor-jul2026)                        | Node-based editor with React Flow, real-time debug, local sync               |
| 2026-07-02 · 12:00 | [§10](#10-rules-engine-and-player-view-jul2026)               | `RuleEvaluator`, `PlayerViewService`, WebSocket broadcast                    |
| 2026-07-02 · 10:00 | [§9](#9-document-infrastructure-and-electron-jul2026)         | Local NoSQL layer, `Actor`, `LogicBlock`, JSON persistence                   |
| 2026-07-02 · 03:24 | [§8](#8-desktop-distribution-and-cloud-api-jul2026)           | Public releases, Electron CI, Render                                         |
| 2026-07-01 · 17:06 | [§7](#7-campaigns-typescript-and-ux-jul2026)                  | Delete campaign, party level modal, centralized types                        |
| 2026-07-01 · 15:12 | [§6](#6-authentication-and-campaigns-prior-context)           | JWT, MongoDB, Electron dev                                                   |
| 2026-07-01 · 03:01 | [§5](#5-playermanager-refactoring-jul2026)                    | God component → `features/battle/`                                           |
| 2026-06-30 · 19:05 | —                                                             | Webapp layout, equipment, Enemy Library, DB fixes                            |
| 2026-06-21         | [§1–§4](#1-custom-subclasses-jun2026)                         | Subclasses, JSON import, normalization, level/XP                             |

---

## 20. Spell Filters in Compendium (Jul/2026)

**Date · Time (BRT):** `2026-07-02 · 24:15`

### What changed for the DM

- In the Compendium **Spells** tab, the sidebar now has a **Filters** panel above the search bar.
- You can filter by **level** (Cantrip–9 pills), **school**, **class**, **casting time**, **duration**, **range**, **ritual**, **concentration**, **components** (V / S / M), **with damage**, and **with save**.
- Text search also looks in the description, classes, and spell metadata.
- The counter shows how many spells passed the filters (`X of Y shown`); **Clear** removes all active filters.

### Technical details

- `spellFilterUtils.ts` — state, dynamic options from the local SRD catalog, `filterSpells` function.
- `SpellFiltersPanel.tsx` — UI without modals; CSS in `compendium.css`.

---

## 19. Inline Combat UI (Jul/2026)

**Date · Time (BRT):** `2026-07-02 · 23:45`

### What changed for the DM

- In **Fight!** mode, each player and monster card now has a **quick action bar** below HP: numeric value, damage type, **Damage** (red) and **Heal** (green) buttons. Damage goes through `RuleEngine` (resistances, immunities, pipeline).
- **Badges** show resistances, immunities, vulnerabilities, and active conditions; **+** button adds conditions inline (no modal).
- **Encounter / Scene** top panel lists rules with `encounter` scope and the **Advance Turn** button fires `on_turn_start` in the engine to test environmental rules (e.g., lava room).

### Technical details

- `useRuleEngineCombat` hook syncs actors with `RuleEngine` and exposes actions via `ICombatState`.
- CSS in `combat-inline.css` (dark inputs, contrasting buttons; no Tailwind).

---

## 18. Rules Engine in Combat (Jul/2026)

**Date · Time (BRT):** `2026-07-02 · 23:00`

### What changed for the DM

- **Active** campaign rules now **actually execute** at the table — they're not just visual.
- **Players, monsters, and NPCs** enter the engine (`actor.kind`: `player` / `monster` / `npc`).
- Connected triggers:
  - `manual` — derived pools (max mana/HP) and passive effects
  - `on_damage` / `on_heal` — after damage or healing (attacks, manual delta, turn buffs)
  - `on_turn_start` / `on_turn_end` — "Resolve Turn" button in combat
  - `on_spell_cast` — when casting a spell in the party
- Enemy max HP respects `compute` rules with monster/NPC condition.

### Technical details

- `actorBridge.ts` — `IPlayer` / `IEnemy` ↔ `Actor`
- `campaignRulesRuntime.ts` — centralized `RuleEvaluator` + `LogicEngine`
- `LogicBlock.computeTarget` for formulas (`manaMax`, `hpMax`)
- Context variables: `damage`, `healed`, `amount`, `spellLevel`

---

## 17. Rules Affect Mana and HP (Jul/2026)

**Date · Time (BRT):** `2026-07-02 · 22:30`

### What changed for the DM

- **Active** rules in the campaign Rules tab now **change max mana and HP** displayed on party cards.
- The default **Mana Maximum** rule (`CON × 2 + level`) replaces the old formula while enabled.
- Changing character attributes (CON, INT, class, level) or the rule formula reflects immediately in the calculated value.
- Disabling the rule in the Rules tab reverts to legacy calculation (INT/WIS/CHA for mana).

### Technical details

- `resolvePlayerResources()` + `playerToActor()` connect `IPlayer` to `RuleEvaluator`.
- `LogicBlock.computeTarget`: `manaMax` | `hpMax` (seed rule `mana_max_formula` already defines `manaMax`).
- Blocks with **effects** (`effects`) and `manual` trigger can also adjust pools via `LogicEngine`.
- Combat triggers (`on_damage`, `on_turn_start`, etc.) don't yet fire automatically in the party.

---

## 16. Rules in the Campaign (Jul/2026)

**Date · Time (BRT):** `2026-07-02 · 22:00`

### What changed for the DM

- New **Rules** tab inside the campaign (bottom bar, scroll icon).
- Lists the campaign's homebrew rules with a **enable/disable** toggle per rule.
- New or rule-less campaigns get the default **Mana Maximum** rule (can be disabled).
- In the **Electron** app, **Import from DM Dashboard** button brings blocks created in the full editor into the active campaign.

### Technical details

- `IAppData.logicBlocks`; persistence via `PUT /campaigns/:id/data` (MongoDB).
- `CampaignRulesPanel` in `features/campaign/`; `mergeLogicBlocksById` in `mergeCampaignData`.
- Full creation/editing continues in **DM Dashboard**; runtime evaluation in combat see [§18](#18-rules-engine-in-combat-jul2026).

---

## 15. Soft Delete for Rules and Class Attributes (Jul/2026)

**Date · Time (BRT):** `2026-07-02 · 21:15`

### What changed for the DM

- **Delete rule** in the Rules Editor now does _soft delete_: the rule disappears from the list but is marked as `deleted` in JSON so sync doesn't "resurrect" the block.
- In the formula builder, use **"Spellcasting ability (class)"** or **"Primary ability (class)"** — the engine reads the actor's class (`customAttributes.classType`) and picks the right attribute (Wizard → INT, Rogue → DEX, etc.).

### Technical details

- `LogicBlock.deleted` + `updatedAt`; `mergeLogicBlocksById()` in `SyncService` and API `CampaignSync.logicBlocks`.
- `RuleEvaluator` / `LogicEngine` ignore deleted blocks; `dashboardIpc` removes orphan tombstones on disk.
- Map in `shared/schema/classAbilityMap.ts` (PT/EN).

---

## 14. Sync Dashboard and Console (Jul/2026)

**Date · Time (BRT):** `2026-07-02 · 20:30`

### What changed for the DM

- The **DM Test Dashboard** saves actors and rule blocks to local disk only — no longer fires repeated API sync attempts (fewer `POST /sync failed` warnings in the Electron terminal).
- Actor panel without React duplicate `key` warnings in DevTools console.

### Technical details

- `isCloudSyncableCampaignId()` in `types/sync.ts`; `saveLocal(..., { cloudSync: false })` in `dashboardIpc`.
- `SyncService.syncRemote` ignores local IDs (`dm-dashboard-test`) and deduplicates identical error messages.
- `ActorPanel`: `key` on mapped numeric fields; CSS classes in `dashboard.css` (no Tailwind).

---

## 13. Global Root Layout (Jul/2026)

**Date · Time (BRT):** `2026-07-02 · 19:00`

### What changed for the DM

- All authenticated screens now respect **side margins** and **centered max width** — content no longer touches the left edge of the window.
- Campaigns displayed in **responsive grid** (1 / 2 / 3 columns) with consistent spacing.
- Party Roster, Subclasses, and Rules Editor inherit the same parent container.

### Technical details

- New `RootLayout.tsx`: `min-h-screen flex flex-col` shell, content in `max-w-7xl mx-auto px-4 gap-4`.
- `GameApp` uses `RootLayout` with `toolbar` = bottom-nav; children without their own `app-page` / `pb-24`.
- Removed duplicate `min-h-screen` and `max-w-7xl` in `CampaignList`, `DmDashboard`, `BlockEditor`, `SubclassManager`.

---

## 12. Vertical Block Builder (Jul/2026)

**Date · Time (BRT):** `2026-07-02 · 18:00`

### What changed for the DM

- The **Rules Editor** moved away from node-based canvas (React Flow) to a **Vertical Block Builder**: blocks stacked in a column, responsive on mobile.
- **Friendly labels** in all dropdowns (e.g., "Constitution (CON)" instead of `actor.stats.con`).
- **Two-column layout**: rule list on the left; selected rule editor on the right.
- **Trigger** blocks (Passive, On Receiving Damage, Manual Action), **formula** (math steps), and **conditions** with Lucide icons for add/remove.
- **Preview** panel continues showing the formula result per actor.

### Technical details

- `SchemaResolver.ts` — friendly name → technical path map; UI never exposes dot-paths.
- `formulaStack.ts` — compiles/decompiles `VerticalRuleDraft` ↔ `RuleExpression`.
- `VerticalBlockBuilder.tsx`, `BlockEditor.tsx`, `useRulesEditor.ts` — flex stack, `lg:grid-cols-12` grid, base-4 design system.
- Removed React Flow nodes, `rulesGraphCompiler.ts`, and `ActorFieldSelect.tsx`.

---

## 11. Visual Rules Editor (Jul/2026)

**Date · Time (BRT):** `2026-07-02 · 14:30`

### What changed for the DM

- New **Visual Rules Editor** in the DM Dashboard: build homebrew formulas by dragging **Variable**, **Value**, and **Math** blocks (add, subtract, multiply, divide).
- Side menu to add blocks and switch between campaign rules.
- **Debug Panel** in the footer shows the formula result for each actor in real time (e.g., Mana = CON×2 + Level).
- Changes are saved automatically to local `campaign.json` (Electron).

### Technical details

- `@xyflow/react` + custom nodes in `webapp/src/components/RulesEditor/`.
- State serialized as `LogicBlock[]` with `compute: RuleExpression` compatible with `RuleEvaluator`.
- Flow layout persisted in `customAttributes._rulesEditorFlow`.
- IPC: `dm:list-logic-blocks`, `dm:save-logic-blocks` → `SyncService.saveLocal()`.

---

## 10. Rules Engine and Player View (Jul/2026)

**`2026-07-02 · 12:00 (BRT)`** — Cursor session (RPG business infrastructure)

### RuleEvaluator (`webapp/src/engine/RuleEvaluator.ts`)

- `evaluate(actor, rule): number` function — evaluates `LogicBlock` blocks defined in JSON.
- Operator map `add`, `subtract`, `multiply`, `divide` — **no `eval()`**.
- Supports `RuleExpression` tree in `rule.compute` (e.g., Mana = Constitution × 2 + Level).
- SRD-agnostic: reads paths like `actor.stats.con`, `actor.customAttributes.level`.
- Code comments explain how to add new blocks via JSON only.

### Player View (`webapp/src/services/PlayerViewService.ts`)

- `sanitizeForPlayerView(actor): PlayerViewDTO` — whitelist: `name`, `hp`, `mana`, `statusEffects`, visible equipment.
- Removes DM secrets: `dmNotes`, `realHP` (when hidden), `aiPrompt`, etc.

### WebSocket (`webapp/src/services/WebSocketServer.ts`)

- Local server `ws://127.0.0.1:8765` (port via `PLAYER_VIEW_WS_PORT`).
- `persistActorAndBroadcast()` saves to JSON store and sends sanitized DTO to all clients.

### Key files

| File                                          | Role                                   |
| --------------------------------------------- | -------------------------------------- |
| `webapp/src/engine/RuleEvaluator.ts`          | Homebrew numeric calculation           |
| `webapp/src/services/homebrew/LogicEngine.ts` | Actor mutation via `effects`           |
| `webapp/src/services/PlayerViewService.ts`    | Sanitization + broadcast orchestration |
| `webapp/src/services/WebSocketServer.ts`      | WebSocket broadcast                    |
| `webapp/src/services/actorPersistence.ts`     | Persistence + broadcast trigger        |

---

## 9. Document Infrastructure and Electron (Jul/2026)

**`2026-07-02 · 10:00 (BRT)`** — Cursor session

### Architectural decision

- **Document-oriented** persistence (JSON), without SQLite.
- Single-tenant; future sync for single user.
- Entities: `CampaignState`, `EncounterState`, `Actor`, `LogicBlock`.

### Implementation

- `FileSystemDocumentStore` — one `.json` per document in `{userData}/documents/`.
- Types in `webapp/src/types/domain/` with `CustomAttributes` / `HomebrewRules` as `Record<string, unknown>`.
- Bootstrap in Electron main process (`electron/bootstrap/infrastructure.cjs`).
- Build: `npm run build:electron-services --prefix webapp` → `electron/lib/`.

---

## 8. Desktop Distribution and Cloud API (Jul/2026)

| Date · Time (BRT)    | Change                                                         |
| -------------------- | -------------------------------------------------------------- |
| `2026-07-02 · 03:24` | Releases published to public repo `RPG-Party-Manager-Releases` |
| `2026-07-02 · 03:06` | CI release `postinstall` loop fix                              |
| `2026-07-02 · 03:00` | `PartyManager-Setup.exe` alias + `publish:electron` script     |
| `2026-07-01 · 17:12` | GitHub Actions publishes Electron on every push to `main`      |
| `2026-07-01 · 17:06` | Render API deploy on `main` (commit `cc2b527`)                 |

### Highlights

- **Production API:** `https://rpg-party-manager-api.onrender.com`
- **Fixed download:** `…/RPG-Party-Manager-Releases/releases/latest/download/PartyManager-Setup.exe`
- **Auto-update:** `electron-updater` reads `latest.yml` from the public releases repo.
- **CI Secret:** `RELEASES_REPO_TOKEN` in the private repo.

---

## 7. Campaigns, TypeScript, and UX (Jul/2026)

**`2026-07-01 · 17:06 (BRT)`** — commit `cc2b527`

### API and campaigns

- `DELETE /campaigns/:id` — removes campaign + `CampaignData`.
- 🗑️ button with confirmation in `CampaignList`.

### Party / combat

- **Set Party Level** via modal (`PartyLevelModal`) — replaced `window.prompt`.
- `usePartyState` hook: `openPartyLevelModal()`, `applyPartyLevel()`.

### TypeScript

- Domain-specific types: `types/api.ts`, `battle.ts`, `campaign.ts`, `bestiary.ts`, `inventory.ts`, `auth.ts`, `app.ts`.
- Fully typed `services/api.ts` (no `@ts-nocheck`).
- Feature-driven layout consolidated in `webapp/src/features/`.

### Commit/PR automation

- **`2026-07-01 · ~03:00 (BRT)`** — `npm run commit:ai` → `docs/LAST_COMMIT_MSG.txt` from git diff + `PR_TEMPLATE.md`.

---

## 5. PlayerManager Refactoring (Jul/2026)

**`2026-07-01 · 03:01 (BRT)`** — commit `75a9069` (and earlier `2026-07-01` sessions)

The monolith (~4,800 lines) was split into a cohesive module in **`webapp/src/features/battle/`** (no longer `components/PlayerManagerModule/`).

### Current structure

```
webapp/src/features/battle/
├── PlayerManagerRoot.tsx
├── PlayerManagerView.tsx
├── hooks/
│   ├── usePartyState.ts
│   └── useCombatState.ts
├── components/
│   ├── PlayerCard.tsx
│   ├── EnemyCard.tsx
│   ├── CombatHeader.tsx
│   ├── PartyLevelModal.tsx
│   ├── PartyXpModal.tsx
│   ├── AttackResolutionModal.tsx
│   ├── VttOverlay.tsx
│   └── FloatingActionBar.tsx
└── styles/
    └── PlayerManager.css
```

### Separation of concerns

| Layer            | Responsibility                                       |
| ---------------- | ---------------------------------------------------- |
| `usePartyState`  | Players, HP/Mana, Level/XP, buffs/CC, rests          |
| `useCombatState` | Enemies, targeting, attack modal, VTT, `battleNotes` |
| Components       | JSX and visual state (CC dropdowns on cards)         |

### What didn't change

- Rules in `shared/utils/combatUtils.ts`.
- Contract with `GameApp.tsx`.

---

## 1. Custom Subclasses (Jun/2026)

**`2026-06-21 · 11:00 – 23:50 (BRT)`** — bestiary and subclasses (commits `b807c6d` … `e2f8673`); UI integration in Jul/2026.

### Data modeling

- `ISubclass` schema: resistances, passive traits, `abilities[]` (bestiary attack format).
- `resourceTrait: 'standard' | 'vampire'`.
- `subclassId` on `IPlayer`.
- Seed: **Blood Magic** (`sub_blood_magic`).

### Combat engine (`combatUtils.ts`)

- `getEffectiveDamageModifiers(player, subclassData)`.
- Collision: subclass vulnerabilities remove base resistances of the same type.
- `isVampirePlayer`, `castSpellOnPlayer`, etc.

### UI

- **`SubclassManager`** — navigation tab.
- Subclass dropdown and abilities on the player card in combat.

---

## 2. Legacy JSON Import (Campaigns)

**`2026-06-21 – 2026-07-01 (BRT)`** — stable flow after normalization

### Flow (`CampaignList`)

1. **Import JSON** next to **+ Create**.
2. Validation (`players` or `equipment`; accepts `data` / `partyManagerData`).
3. `POST /campaigns` → `PUT /campaigns/:id/data` with normalized payload.

### API

- `PATCH /campaigns/:id` — rename campaign.
- ✎ inline button on the list.

---

## 3. Data Normalization (Data Hydration)

**`2026-06-21 – 2026-07-01 (BRT)`**

### `webapp/src/shared/utils/migrationUtils.ts`

- `normalizeImportedData()` — hydrates old saves.
- Default templates for player, enemy, buff.
- Maps `subclass` → `subclassId`, `customSubclasses` → `subclasses`.

### Integration

- `mergeCampaignData()` → `normalizeImportedData()` before catalog merge.

---

## 4. Direct Level Editing

**`2026-06-21 – 2026-07-01 (BRT)`** — party modal in `2026-07-01 · 17:06`

### Behavior

- Level editable manually; `xp` adjusted to D&D 5e minimum threshold.
- `hpCurrent` capped to new `hpMax` when reducing level.

### UI

- **Lv. X** clickable on card → inline input.
- **Set Party Level** — modal for all with `inParty: true` (since `2026-07-01 · 17:06`).

---

## 6. Authentication and Campaigns (prior context)

**`2026-06-30 · 19:05 (BRT)`** and earlier

- JWT + protected routes `/campaigns`.
- `CampaignList` → `GameApp` with MongoDB persistence.
- Electron + `npm run dev` scripts at monorepo root.
- Cloud defaults in `shared/cloudDefaults.js` → Render API when no local `.env`.

---

## How to test

| Area                   | Steps                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Subclasses             | Subclasses tab → create → equip on card → test in Battle Mode                              |
| Import JSON            | Campaigns → Import JSON → rename with ✎                                                    |
| Level                  | Lv. on card or **Set Party Level** (modal)                                                 |
| Campaigns              | Create / rename / delete from list                                                         |
| Build                  | `npm run build --prefix webapp`                                                            |
| Electron + local infra | `npm run build:electron-services --prefix webapp` → `npm run electron:dev --prefix webapp` |
| Player View WS         | Connect to `ws://127.0.0.1:8765`, send `{ "type": "subscribe" }`                           |

---

## Related documentation

| File                       | Content                               |
| -------------------------- | ------------------------------------- |
| `docs/PROJECT_OVERVIEW.md` | Overview, deploy/CI/commit automation |
| `docs/CHANGELOG_AI.md`     | AI agent session log                  |
| `architecture.md`          | Technical design (partially outdated) |

---

_Timestamp format: `YYYY-MM-DD · HH:MM (BRT)` — commit times when available; Cursor sessions without commits use estimated session time._
