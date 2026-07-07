# CHANGELOG_AI — Agent & AI Session Log

All Cursor, Antigravity, or other AI agents **must** append a brief entry here after each meaningful change.
Humans are welcome to log sessions too.

Format:

```markdown
## YYYY-MM-DD — [Agent name]
- **Area:** battle | inventory | api | types | docs | …
- **Summary:** what changed in one line
- **Files:** comma-separated key paths
```

---

## 2026-07-02 — Cursor

- **Area:** compendium | api
- **Summary:** Fase 1 ETL 5e.tools: FiveEToolsSanitizer, SpellAdapter e seed PHB → MongoDB (`compendium_spells`).
- **Files:** `webapp/src/services/compendium/fiveETools/*`, `webapp/src/scripts/seedMasterCompendium.ts`, `webapp/package.json`, `api/.env.example`

## 2026-07-02 — Cursor

- **Area:** docs | compendium
- **Summary:** Relatório de arquitetura ETL 5e.tools → Master Compendium (JSON, tags, assets img, interfaces TypeScript do parser).
- **Files:** `docs/relatorio-etl-5etools-master-compendium.md`

## 2026-07-02 — Cursor

- **Area:** campaign | battle | rules
- **Summary:** Toggle Mana vs Spell Slots na aba Regras; spell slots D&D 5e nos cards quando mana rule desligada.
- **Files:** `castingSystem.ts`, `spellSlotUtils.ts`, `CampaignRulesPanel.tsx`, `usePartyState.ts`, `PlayerCard.tsx`, `SpellSlotsBar.tsx`

## 2026-07-02 — Cursor

- **Area:** battle | migration
- **Summary:** Corrigido HP inflado (680+ lvl 1): `actorToPlayer` não grava max HP em `hpBase`; repair automático na carga/party.
- **Files:** `shared/utils/actorBridge.ts`, `migrationUtils.ts`, `usePartyState.ts`

## 2026-07-02 — Cursor

- **Area:** campaign | battle | rules
- **Summary:** Toggle Mana vs Spell Slots na aba Regras; spell slots D&D 5e nos cards quando mana rule desligada.
- **Files:** `castingSystem.ts`, `spellSlotUtils.ts`, `CampaignRulesPanel.tsx`, `usePartyState.ts`, `PlayerCard.tsx`, `SpellSlotsBar.tsx`

## 2026-07-02 — Cursor

- **Area:** battle | engine | ui
- **Summary:** UI inline de combate rápido: QuickActionBar (dano/cura via RuleEngine), badges de resistência/condição, painel Encounter/Scene com Avançar Turno.
- **Files:** `features/battle/components/QuickActionBar.tsx`, `ActorModifierBadges.tsx`, `EncounterScenePanel.tsx`, `hooks/useRuleEngineCombat.ts`, `utils/ruleEngineCombat.ts`, `styles/combat-inline.css`, `PlayerCard.tsx`, `EnemyCard.tsx`, `PlayerManagerView.tsx`

## 2026-07-02 — Cursor

- **Area:** engine | types
- **Summary:** `RuleEngine` com escopos (global/encounter/actor/condition), pipeline de dano D&D 5e, `processEvent`, `advanceTurn`, tipos de modificadores.
- **Files:** `webapp/src/engine/*`, `types/domain/logic-block.ts`, `logicBlockUtils.ts`

## 2026-07-02 — Cursor

- **Area:** compendium | ui | srd
- **Summary:** Tela Compendium (Spells/Items) com listagem, busca, cards de detalhe; `getSrdCatalog` via IPC/sessionStorage.
- **Files:** `features/compendium/*`, `useSrdCatalog.ts`, `srdBridge.ts`, `srdIpc.ts`, `GameApp.tsx`

## 2026-07-02 — Cursor

- **Area:** battle | engine
- **Summary:** Motor de regras ligado ao combate: gatilhos (dano, cura, turno, magia), jogadores + monstros/NPCs via `actorBridge` e `LogicEngine`.
- **Files:** `campaignRulesRuntime.ts`, `actorBridge.ts`, `usePartyState.ts`, `useCombatState.ts`, `EnemyCard.tsx`

## 2026-07-02 — Cursor

- **Area:** battle | engine
- **Summary:** Regras `compute` da campanha agora alimentam `calculateMaxMana`/`calculateMaxHP` via `RuleEvaluator` + bridge `IPlayer`→`Actor`.
- **Files:** `webapp/src/shared/utils/campaignRulesResolver.ts`, `playerActorBridge.ts`, `usePartyState.ts`, `logic-block.ts`, `GameApp.tsx`

## 2026-07-02 — Cursor

- **Area:** campaign | types | ui
- **Summary:** `logicBlocks` em `IAppData`; aba Regras na campanha com toggle ativar/desativar e import do DM Dashboard (Electron).
- **Files:** `webapp/src/types/index.ts`, `webapp/src/features/campaign/CampaignRulesPanel.tsx`, `webapp/src/core/GameApp.tsx`, `webapp/src/data/defaultData.ts`, `webapp/src/shared/utils/logicBlockUtils.ts`, `webapp/src/shared/utils/migrationUtils.ts`

## 2026-07-02 — Cursor

- **Area:** ui | build
- **Summary:** Removed Tailwind; migrated RootLayout, Campaigns, Party Roster, Subclasses, Rules Editor to plain CSS (`layout.css`, `design-system.css`, component CSS).
- **Files:** `webapp/src/styles/layout.css`, `webapp/vite.config.js`, `webapp/package.json`, `RootLayout.tsx`, `CampaignList.*`, `SubclassManager.*`, `BlockEditor.css`, `VerticalBlockBuilder.css`, `PlayerManagerView.tsx`, `DmDashboard.tsx`, `.cursorrules`

## 2026-07-02 — Cursor

- **Area:** ui | layout
- **Summary:** Hard-coded `.app-shell` centering (`margin-inline: auto`, `max-width: 80rem`); `#root` full-width; headers/titles centered.
- **Files:** `webapp/src/styles/design-system.css`, `webapp/src/shared/components/RootLayout.tsx`, `webapp/src/index.css`, `AppNavBar.tsx`, feature CSS

## 2026-07-02 — Cursor

- **Area:** ui | layout
- **Summary:** Global `RootLayout` shell (max-w-7xl, gap-4); removed duplicate wrappers from CampaignList, GameApp, DmDashboard, BlockEditor, SubclassManager, PlayerManagerView.
- **Files:** `webapp/src/shared/components/RootLayout.tsx`, `webapp/src/core/App.tsx`, `webapp/src/core/GameApp.tsx`, `webapp/src/features/**`, `webapp/src/styles/design-system.css`, `.cursorrules`

## 2026-07-02 — Cursor

- **Area:** rules | schema | ui
- **Summary:** Vertical Block Builder replaces react-flow editor; `SchemaResolver` friendly labels; split sidebar + stack layout; removed legacy graph nodes.
- **Files:** `webapp/src/shared/schema/SchemaResolver.ts`, `webapp/src/components/RulesEditor/**`, `docs/mudancas-recentes.md`

## 2026-07-02 — Cursor

- **Area:** rules | schema | ui
- **Summary:** `ActorSchema` friendly field resolver; Rules Editor recipe UI with Select (no technical paths), delete/save, list-first flow; SubclassManager starts unselected.
- **Files:** `webapp/src/shared/schema/ActorSchema.ts`, `webapp/src/components/RulesEditor/**`, `webapp/src/features/campaign/SubclassManager.tsx`, `webapp/src/features/dashboard/DmDashboard.tsx`, `.cursorrules`

## 2026-07-02 — Cursor
- **Summary:** Design system CSS + AppNavBar breadcrumbs; responsive Party Roster grid; per-card collapse with lucide; SubclassManager view/edit modes + sidebar; Create Monster loading fix.
- **Files:** `webapp/src/styles/design-system.css`, `webapp/src/shared/components/AppNavBar.tsx`, `webapp/src/core/GameApp.tsx`, `webapp/src/features/battle/**`, `webapp/src/features/campaign/SubclassManager.*`, `webapp/src/features/bestiary/EnemyLibrary.tsx`, `.cursorrules`

## 2026-07-02 — Cursor
- **Summary:** Bridge JWT from renderer login to SyncService via IPC (`sync:set-auth-token`); dedupe missing-auth log spam; persist token to `sync-auth.token`.
- **Files:** `webapp/src/services/SyncService.ts`, `webapp/src/services/syncBridge.ts`, `webapp/src/electron-main/syncIpc.ts`, `webapp/src/services/api.ts`, `webapp/src/core/App.tsx`, `webapp/electron/main.cjs`

## 2026-07-02 — Cursor
- **Summary:** Mandatory UI design system in `.cursorrules` (4px spacing scale, touch rule, gap-first layout); removed `+` prefix from add buttons; dashboard/Rules Editor spacing aligned.
- **Files:** `.cursorrules`, `webapp/src/components/RulesEditor/*`, `webapp/src/features/dashboard/*`, multiple feature components

## 2026-07-02 — Cursor
- **Summary:** Visual Rules Editor with `@xyflow/react` (Variable/Math/Literal nodes), live RuleEvaluator debug panel, IPC persistence to `campaign.json` via SyncService.
- **Files:** `webapp/src/components/RulesEditor/*`, `webapp/src/electron-main/dashboardIpc.ts`, `webapp/src/services/dmDashboardBridge.ts`, `webapp/src/types/dashboard.ts`, `webapp/src/types/sync.ts`, `webapp/src/features/dashboard/DmDashboard.tsx`, `docs/mudancas-recentes.md`

## 2026-07-01 — Cursor

- **Area:** docs | structure | typescript
- **Summary:** Feature-driven layout (`src/core`, `src/features/*`, `src/shared`, `src/types`), TS migration, removed legacy `PlayerManagerModule` junk, fixed `setCcDropdownPlayerId` runtime error by moving CC dropdown state into `PlayerCard`/`EnemyCard`.
- **Files:** `webapp/src/features/**`, `webapp/src/types/index.ts`, `webapp/tsconfig*.json`, `docs/CHANGELOG_AI.md`, `.cursorrules`, `README.md`

## 2026-07-01 — Cursor

- **Area:** docs
- **Summary:** Added AI collaboration rules (`.cursorrules`), professional README, PR template, and consolidated project documentation pipeline.
- **Files:** `.cursorrules`, `README.md`, `docs/PR_TEMPLATE.md`, `docs/CHANGELOG_AI.md`, legacy `webapp/src/components/` cleanup

## 2026-07-02 — Cursor

- **Area:** engine | player-view | websocket
- **Summary:** RuleEvaluator (`evaluate(actor, rule)` with operator map), PlayerViewService + WebSocketServer broadcast on actor persist.
- **Files:** `webapp/src/engine/RuleEvaluator.ts`, `webapp/src/services/PlayerViewService.ts`, `webapp/src/services/WebSocketServer.ts`, `webapp/src/services/actorPersistence.ts`

## 2026-07-02 — Cursor

- **Area:** rules-editor | ui
- **Summary:** Condição "Tipo de ator" usa dropdown (player/npc/monster); normalização de valores ao carregar draft.
- **Files:** `VerticalBlockBuilder.tsx`, `formulaStack.ts`, `SchemaResolver.ts`, `VerticalBlockBuilder.css`

## 2026-07-02 — Cursor

- **Area:** types | migration
- **Summary:** Typed `migrationUtils.ts` and `defaultData.ts` for strict Electron `tsc` build (`IAppData`, generics, `unknown` imports).
- **Files:** `webapp/src/shared/utils/migrationUtils.ts`, `webapp/src/data/defaultData.ts`

## 2026-07-02 — Cursor

- **Area:** srd | sync | services
- **Summary:** `SRDIntegrationService` fetches spells/equipment from dnd5eapi.co with batching, adapters to LogicBlock/IInventoryItem, persists via SyncService; `useSRDSync` hook for progress UI.
- **Files:** `webapp/src/services/SRDIntegrationService.ts`, `webapp/src/services/srd/**`, `webapp/src/types/srd.ts`, `webapp/src/shared/hooks/useSRDSync.ts`, `webapp/src/electron-main/srdIpc.ts`, `webapp/src/services/SyncService.ts`

## 2026-07-02 — Cursor

- **Area:** homebrew | sync | schema
- **Summary:** Soft delete for logic blocks (tombstones + per-block merge on sync); D&D 5e class → spellcasting/primary ability mapping in RuleEvaluator.
- **Files:** `webapp/src/types/domain/logic-block.ts`, `webapp/src/shared/utils/logicBlockUtils.ts`, `webapp/src/shared/schema/classAbilityMap.ts`, `webapp/src/components/RulesEditor/useRulesEditor.ts`, `webapp/src/electron-main/dashboardIpc.ts`, `webapp/src/services/SyncService.ts`, `webapp/src/engine/RuleEvaluator.ts`, `api/routes/sync.js`, `api/models/CampaignSync.js`

## 2026-07-02 — Cursor

- **Area:** sync | dashboard | electron
- **Summary:** Stop cloud sync for DM dashboard sandbox (`dm-dashboard-test`); dedupe sync error logs; fix React `key` warnings in ActorCard.
- **Files:** `webapp/src/services/SyncService.ts`, `webapp/src/types/sync.ts`, `webapp/src/electron-main/dashboardIpc.ts`, `webapp/src/features/dashboard/components/ActorPanel.tsx`, `webapp/src/features/dashboard/dashboard.css`

## 2026-07-02 — Cursor
- **Summary:** Document-oriented domain layer (CampaignState, Actor, LogicBlock), FileSystem JSON store, homebrew LogicEngine, Player View WebSocket + sanitize DTOs; Electron main bootstrap.
- **Files:** `webapp/src/types/domain/**`, `webapp/src/services/persistence/**`, `webapp/src/services/homebrew/**`, `webapp/electron/bootstrap/`, `webapp/tsconfig.electron.json`

## 2026-07-02 — Cursor

- **Area:** dashboard | electron | ui
- **Summary:** DM Test Dashboard (Actor panel, RuleEvaluator debug, VTT/sync status) with IPC bridge and Tailwind layout.
- **Files:** `webapp/src/features/dashboard/**`, `webapp/src/electron-main/dashboardIpc.ts`, `webapp/src/services/dmDashboardBridge.ts`

## 2026-07-02 — Cursor

- **Area:** sync | api | electron
- **Summary:** SyncService offline-first (`campaign.json`, isDirty, push/pull `/sync`), CampaignSync MongoDB model, auto-retry 30s.
- **Files:** `webapp/src/services/SyncService.ts`, `webapp/src/types/sync.ts`, `api/routes/sync.js`, `api/models/CampaignSync.js`

## 2026-07-02 — Cursor

- **Area:** compendium
- **Summary:** Filtros de magias no Compendium (nível, escola, classe, casting time, duração, alcance, ritual, concentração, componentes V/S/M, dano e save) + busca ampliada.
- **Files:** `webapp/src/features/compendium/spellFilterUtils.ts`, `SpellFiltersPanel.tsx`, `CompendiumView.tsx`, `compendium.css`

## 2026-07-02 — Cursor

- **Summary:** Updated `docs/mudancas-recentes.md` with per-section timestamps (BRT) and recent infra/engine entries.
- **Files:** `docs/mudancas-recentes.md`

## 2026-07-01 — Cursor

- **Area:** docs | tooling
- **Summary:** Added `scripts/generate-commit.mjs` and `npm run commit:ai` to draft PR/commit messages from git diff into `docs/LAST_COMMIT_MSG.txt`; updated `.cursorrules` commit/PR rules.
- **Files:** `scripts/generate-commit.mjs`, `scripts/commit-ai.sh`, `package.json`, `.cursorrules`, `README.md`, `.gitignore`

## 2026-07-06 � Antigravity
- **Area:** tooling | battle | api
- **Summary:** Fix PR creation script to dynamically target fork and restore Auto PR functionality, fix PlayerCard combobox interpolation error, and set up electron:dev:local scripts.
- **Files:** package.json, webapp/package.json, scripts/commit-ai.sh, webapp/src/features/battle/components/PlayerCard.tsx


## 2026-07-06 � Agent
- **Area:** electron | docs
- **Summary:** Added electron-log for auto-updater events and enforced version bumps in github actions
- **Files:** webapp/electron/main.cjs, .github/workflows/release.yml
