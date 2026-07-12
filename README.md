# RPG Party Manager

A desktop-first **Dungeon Master control panel** for D&D 5e-style homebrew tables. Track your party, run combat, manage inventory, browse an 800+ monster bestiary, roll chaos tables, and persist everything to MongoDB — with an optional Electron shell and embedded VTT (Owlbear Rodeo).

Evolved from the legacy Excel workbook *Party Manager 2.7.xlsm*.

---

## Features

| Area | What you can do |
|------|-----------------|
| **Party & combat** | HP, mana, temp HP, conditions (CC), buffs, limit break meter, battle mode, enemy roster, attack resolution (manual/auto roll), bulk targeting, VTT overlay |
| **Homebrew rules** | Custom mana formula, vampire/blood-magic resource trait, milestone level editing (XP synced to 5e thresholds) |
| **Subclasses** | Data-driven subclasses with resistances, passive traits, and structured attacks usable in combat |
| **Inventory** | Per-player bags, gold, paper-doll equipment with stat/AC/damage modifiers |
| **Bestiary** | Built-in `default_monsters.json` + custom library, structured attack editor, buff database |
| **Campaign tools** | Quest notebook, training tracker, chaos/random tables |
| **Campaigns & auth** | Multi-user login (JWT), multiple campaigns per user, auto-save to MongoDB, JSON import/export |
| **Desktop** | Electron app spawns API + Vite; `run.bat` for Windows |

---

## Tech stack

- **Frontend:** React 19, TypeScript, Vite 7 — feature-driven layout under `webapp/src/features/`
- **Backend:** Node.js, Express, Mongoose, JWT (`api/`)
- **Database:** MongoDB (local or Atlas)
- **Desktop:** Electron (optional)

Deep architecture: see [`architecture.md`](architecture.md) and [`docs/mudancas-recentes.md`](docs/mudancas-recentes.md).

---

## Project structure

```
RPG-Party-Manager/
├── api/                 Express API + MongoDB models
├── webapp/              React SPA (+ Electron)
│   └── src/
│       ├── core/        App, GameApp, main entry
│       ├── features/    battle | inventory | bestiary | campaign | auth
│       ├── shared/      combatUtils, migrationUtils
│       ├── types/       IPlayer, IEnemy, IAppData, …
│       ├── data/        defaultData, attackSchema
│       └── services/    api client
├── docs/                CHANGELOG_AI, PR template, change logs
├── .cursorrules         Rules for AI/human collaboration
└── architecture.md      System design reference
```

---

## Development setup

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+
- **MongoDB** 6+ — local (`mongodb://127.0.0.1:27017`) or [MongoDB Atlas](https://www.mongodb.com/atlas)

### 1. Clone and install

```bash
git clone <repo-url>
cd RPG-Party-Manager
npm install
```

This runs `postinstall` for both `api/` and `webapp/`.

### 2. API environment (optional)

No setup required — the project ships with **cloud defaults** in `shared/cloudDefaults.js` (hosted API on Render + MongoDB Atlas). Clone, install, and run.

To use a **local MongoDB** or custom secrets, copy the example file:

```bash
cp api/.env.example api/.env
```

Edit `api/.env` only when overriding defaults:

```env
MONGO_URI=mongodb://127.0.0.1:27017/rpg_party_manager
PORT=3001
JWT_SECRET=your-own-secret
```

### 3. Seed database (optional)

```bash
npm run seed --prefix api
```

Creates a default campaign with sample players and data.

### 4. Run development

**Zero-config (cloud API — no local MongoDB):**

```bash
npm run dev --prefix webapp
```

Opens Vite at [http://localhost:5173](http://localhost:5173) and talks to the hosted API on Render.

**Full local stack** (API + Vite hot reload):

```bash
npm run dev:web
```

Open [http://localhost:5173](http://localhost:5173). API listens on port **3001**; Vite proxies `/api`.

**Desktop** (API + Electron):

```bash
npm run dev
# or on Windows:
run.bat
```

### 5. Production build

```bash
npm run build --prefix webapp
npm run build:electron   # Windows desktop package
```

---

## Commands reference

| Command | Description |
|---------|-------------|
| `npm run dev:web` | API + Vite dev server |
| `npm run dev` | API + Electron |
| `npm run build --prefix webapp` | Production frontend build |
| `npm run dev --prefix api` | API only (watch mode) |
| `npm run seed --prefix api` | Reset & seed MongoDB |
| `npm run commit:ai` | Generate PR-style commit message → `docs/LAST_COMMIT_MSG.txt` |
| `npm run build:electron` | Build Windows installer locally (no upload) |
| `npm run publish:electron` | Build + upload to GitHub Releases (`GH_TOKEN` required) |

### Desktop auto-update (Electron)

The packaged app checks the **public releases repo** on startup (`electron-updater`) and downloads updates in the background.

**Public download (share with players):**

- Latest installer: https://github.com/GuilhermeDanzer/RPG-Party-Manager-Releases/releases/latest/download/PartyManager-Setup.exe
- Releases page: https://github.com/GuilhermeDanzer/RPG-Party-Manager-Releases/releases

Source code stays in the private repo; only installers and `latest.yml` are published publicly.

**Local build (no publish):**

```bash
npm run build:electron
# Output: webapp/dist-electron/PartyManager-Setup-<version>.exe
```

**Portable build (unpacked directory):**

To package the application as a portable directory (which doesn't require installation and can be run directly on Windows):

```bash
# Run the portable build script:
python webapp/scripts/build-portable.py
# Output directory: webapp/dist-packaged/Party Manager-win32-x64/
# Executable is at: webapp/dist-packaged/Party Manager-win32-x64/Party Manager.exe
```

**Release on push to `main` (CI — recommended):**

Every push to `main` that changes `webapp/**` triggers GitHub Actions:

1. Sets version to `1.0.<build>` (monotonic — each CI run bumps the number)
2. Builds the Vite frontend + NSIS installer
3. Publishes `PartyManager-Setup-<version>.exe`, `PartyManager-Setup.exe`, and `latest.yml` to the [public releases repo](https://github.com/GuilhermeDanzer/RPG-Party-Manager-Releases/releases)

Installed apps check for updates on startup and download in the background (`electron-updater`).

> **Note:** Only `webapp/` changes trigger a desktop release. API-only commits (Render deploy) do not rebuild the installer.

**Release via GitHub tag (optional, semver):**

```bash
git tag v1.2.0
git push origin v1.2.0
```

CI uses the tag as the version (`1.2.0`) instead of `1.0.<build>`.

**Legacy tag + main flow:**

```bash
# Bump version in webapp/package.json manually if you prefer (optional with main CI)
git tag v1.0.1
git push origin v1.0.1
```

**Manual publish from your machine:**

```bash
$env:GH_TOKEN = "ghp_..."   # GitHub PAT with repo scope (needs access to RPG-Party-Manager-Releases)
npm run publish:electron --prefix webapp
```

### AI-assisted commits

```bash
git add -A
npm run commit:ai          # optional: OPENAI_API_KEY=sk-... for LLM draft
# review docs/LAST_COMMIT_MSG.txt
git commit -F docs/LAST_COMMIT_MSG.txt
gh pr create --body-file docs/LAST_COMMIT_MSG.txt
```

## Contributing & AI agents

- Read **`.cursorrules`** before making changes.
- Log sessions in **`docs/CHANGELOG_AI.md`**.
- Use **`docs/PR_TEMPLATE.md`** for pull requests (patch notes + technical sections).
- Shared types live in **`webapp/src/types/index.ts`** — update interfaces when changing data shape.

---

## License

Private project — see repository owner for usage terms.
