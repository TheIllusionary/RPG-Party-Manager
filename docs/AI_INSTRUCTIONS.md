# RPG Party Manager — AI Collaboration Rules

You are working on a D&D 5e homebrew DM tool (React + TypeScript + Vite + Express + MongoDB).
Follow these rules so humans and AI agents can collaborate without breaking the codebase.

---

## 1. Role: Architect First

Before writing code:

1. Read `src/types/index.ts` for canonical data shapes (`IPlayer`, `IEnemy`, `IAppData`, etc.).
2. Read `architecture.md` and `docs/mudancas-recentes.md` for domain context.
3. Identify the **feature** that owns the change (`battle`, `inventory`, `bestiary`, `campaign`, `auth`).
4. Prefer extending existing hooks/utils over duplicating logic in components.

Do not create new top-level folders without updating this file and `README.md`.

---

## 2. State Reading (Single Source of Truth)

| Concern | Location |
|---------|----------|
| Global campaign state | `IAppData` in `webapp/src/types/index.ts` |
| Document-oriented domain (local) | `webapp/src/types/domain/` — `CampaignState`, `Actor`, `LogicBlock` |
| Local JSON persistence (Electron) | `webapp/src/services/persistence/` → `userData/documents/` |
| Player View sanitize + WS | `webapp/src/services/PlayerViewService.ts`, `WebSocketServer.ts` |
| Offline sync (Electron) | `webapp/src/services/SyncService.ts` → `userData/campaign.json` + `POST/GET /sync` |
| Homebrew logic engine | `webapp/src/services/homebrew/LogicEngine.ts` |
| Rule computation (numeric) | `webapp/src/engine/RuleEvaluator.ts` |
| Defaults & merge | `webapp/src/data/defaultData.ts` |
| Legacy import normalization | `webapp/src/shared/utils/migrationUtils.ts` |
| Combat math (D&D rules) | `webapp/src/shared/utils/combatUtils.ts` — **do not change formulas casually** |
| Battle runtime (enemies, VTT) | `GameApp.tsx` local state + `features/battle/hooks/` |
| API persistence | `api/routes/campaigns.js`, `webapp/src/services/api.ts` |

Never store derived values (level, max HP) in MongoDB when they can be computed from `xp` + stats.

---

## 3. Feature-Driven Layout (mandatory)

```
webapp/src/
├── core/              App.tsx, GameApp.tsx, main.tsx
├── features/
│   ├── battle/        Party roster, combat mode, VTT, attack resolution
│   ├── inventory/     Equipment, CharacterEquipment
│   ├── bestiary/      EnemyLibrary, EncounterBuilder, default_monsters.json
│   ├── campaign/      CampaignList, Notebook, Training, Chaos, SubclassManager
│   └── auth/          AuthScreen
├── shared/
│   └── utils/         combatUtils, migrationUtils (cross-feature only)
├── types/             index.ts — all shared interfaces
├── data/              defaultData, attackSchema
└── services/          api.ts
```

**Rules:**

- UI that belongs to one domain → `features/<domain>/`.
- Cross-feature pure functions → `shared/utils/`.
- Feature-specific hooks → `features/<domain>/hooks/` (e.g. `usePartyState`, `useCombatState`).
- **No** `components/PlayerManagerModule/` or god components >500 lines without splitting.
- Visual-only UI state (dropdowns open, modals) stays in **components**, not combat hooks.

---

## 4. Change Tracking (required for every session)

After meaningful changes, append a short entry to `docs/CHANGELOG_AI.md`:

```markdown
## YYYY-MM-DD — [Agent/Person name or "Cursor"]
- **Area:** battle | api | types | docs | …
- **Summary:** one-line what changed
- **Files:** key paths touched
```

Also update `docs/mudancas-recentes.md` when the change affects user-visible behavior (Portuguese OK).

---

## 5. RPG & Homebrew Rules

- **Level** is derived from `xp` via D&D 5e thresholds (`features/battle/utils/partyUtils.ts`).
  Direct level edits must set `xp` to the minimum threshold for that level.
- **Damage types**, resistances, immunities, vulnerabilities use string labels from `constants.ts` / `combatUtils.ts`.
- **Subclasses** (`ISubclass`) override player traits; `subclassId` on `IPlayer` links them.
- **Vampire / Blood Magic** uses `resourceTrait: 'vampire'` — mana merges into HP pool.
- Enemy attacks: structured `IAttack[]` preferred; fallback `parseAbilities()` for legacy text.
- Do not break `combatUtils.ts` signatures without updating all callers in `features/battle/`.

---

## 6. TypeScript & Quality

- New code: `.ts` / `.tsx` only under `webapp/src/`.
- Type props with interfaces from `src/types/`; use `// TODO: fix any` sparingly, never silently.
- Run `npm run build --prefix webapp` after structural changes.
- Do not commit `.env`, credentials, or `node_modules`.
- Do not create git commits unless the user explicitly asks.

---

## 7. API & Environment

- Backend: `api/` — Express + Mongoose. Env: `api/.env` from `api/.env.example`.
- Required: `MONGO_URI`, `PORT`, `JWT_SECRET`.
- Frontend proxies `/api` → `localhost:3001` in Vite dev.

---

## 8. PR & Documentation

- Use `docs/PR_TEMPLATE.md` for pull requests.
- Patch notes = player/DM-facing; technical = architecture and data model.

**Commits & PRs (mandatory when asked):**

- Always read the current `git diff` (`git diff --cached` first, else `git diff`).
- Fill `docs/PR_TEMPLATE.md` structure with **both** sections filled in:
  - **### 🎮 Patch Notes** — what changed for DMs/players (no jargon).
  - **### 🛠️ Technical Details** — architecture, files, data model, verification.
- For local draft generation, run `npm run commit:ai` → review `docs/LAST_COMMIT_MSG.txt` before committing.
- Append a line to `docs/CHANGELOG_AI.md` after meaningful merges.

---

## 9. UI Design System (mandatory for all new/changed UI)

Every React component and CSS change must follow these spacing and layout rules. **Before finishing UI work, verify:** (1) nothing is touching another element without `gap`/`padding`, (2) all spacing uses the 4px scale, (3) the layout "breathes".

### Spacing scale

- **Never** use arbitrary pixel values (`margin: 13px`, `padding: 27px`, `gap-[13px]`).
- **Always** use Tailwind's base-4 scale: `p-4` (16px), `p-8` (32px), `gap-4`, `mt-4`, etc.
- Prefer **`gap`** on Flexbox/Grid parents over per-item `margin`.

### Touch rule (hierarchy)

- Headers and buttons must **never** touch adjacent content.
- Apply **`mt-4` or `pt-4`** (min 16px) between a title/header and the next element.
- Main containers need **minimum `p-4`** so content does not hit window edges.

### Safe layout

- **Mobile-first:** `container mx-auto px-4` on main pages; grids use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- No fixed pixel widths on main containers.
- Vertical lists: **`flex flex-col gap-4`**.
- Avoid `position: absolute` / `fixed` unless required; check for overlap.
- Center main content via **`RootLayout`** + `layout.css` (`.app-wrapper`, `.main-content`). **No Tailwind** — use plain CSS / CSS Modules only.
- Use shared primitives from `webapp/src/styles/design-system.css` and `AppNavBar` for in-app navigation (never rely on browser back).

### Icons & collapse

- Use **`lucide-react`** for expand/collapse and add actions (`ChevronDown`, `ChevronUp`, `Plus`, `Minus`, `Trash2`) — not raw `+` / `−` / `×` text.
- Collapse controls must work **per item**, not only “all at once”.

### Readable text blocks

- Trait/ability prose: **`max-w-prose`**, **`leading-relaxed`**, **`gap-4`** between paragraphs.

### Interactive feedback

- Buttons: **`px-4 py-2`** (horizontal padding > vertical).
- All clickable elements: **`hover:opacity-80`** or **`hover:bg-opacity-90`**.

### Copy

- **Do not** prefix add-action buttons with `+` (use `Add Enemy`, not `+ Add Enemy`).
- **Do not** expose technical dot-paths (`actor.stats.int`) in DM UI — use `shared/schema/SchemaResolver.ts` + `<select>` with friendly labels.
- Rules editor uses **Vertical Block Builder** (flex stack) — no `react-flow` / graph canvas for DM-facing UI.

### Scoped CSS (when Tailwind is not used)

- Map custom CSS to the 4px scale: `0.25rem` (4px), `0.5rem` (8px), `0.75rem` (12px), `1rem` (16px), `1.25rem` (20px), `1.5rem` (24px), `2rem` (32px).
- Use `display: flex; flex-direction: column; gap: 1rem` instead of ad-hoc margins.
