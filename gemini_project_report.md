# RPG Party Manager — Comprehensive Project Report

## 1. Executive Summary

**RPG Party Manager** is a desktop-first Dungeon Master (DM) control panel built for D&D 5e-style homebrew campaigns. It evolved from a monolithic legacy Excel VBA workbook (`Party Manager 2.7.xlsm`) into a modern, modular React single-page application (SPA), complete with an optional Electron shell and an embedded Virtual Tabletop (VTT, via Owlbear Rodeo).

The project manages everything a DM needs to run a session: party rosters, combat tracking, HP/Mana/Condition states, custom subclass data, individual inventory/gold, and a massive 800+ monster bestiary with structured attack editing.

## 2. What Was Made (Project History & Migration)

The project underwent a significant migration and iterative modernization.
- **VBA Extraction:** The original logic (`GetAC`, `AwardEXP`, `RandomHP`, etc.) was extracted from Excel via Python into a `macros.txt` reference file.
- **Frontend Modernization:** Migrated to a React 19 + Vite 7 stack with a feature-driven layout (`webapp/src/features/`). UI styling transitioned to a custom, modern plain CSS design system, shedding an earlier Tailwind implementation.
- **Rules Engine & Combat Pipeline:** A major sprint (June - July 2026) introduced a custom **Homebrew Rules Engine** using a Visual Block Builder. This allows for dynamic evaluation of logic (e.g., triggering on `on_damage`, `on_heal`) altering base stats like Max HP and Mana in real-time during combat.
- **Backend & Cloud Features:** While the core app runs locally (offline-first), a Node.js/Express API with MongoDB and JWT auth was introduced to support multi-user login and cloud saving/syncing via `/sync` endpoints.

## 3. Core Features

| Feature Area | Capabilities |
| :--- | :--- |
| **Party & Combat Management** | Roster view, HP, temp HP, custom Mana system, limit break meters. Battle mode includes an enemy panel, auto/manual dice rolling, damage modifiers (resistances/vulnerabilities), and bulk targeting. |
| **Homebrew Rules Engine** | Node-based/vertical block visual editor for creating custom game logic. Active evaluation during combat modifies actor state based on triggers. |
| **Subclasses & Progression** | Data-driven subclasses with passive traits and structured attacks. Milestone leveling synced with standard 5e XP thresholds. |
| **Inventory & Equipment** | Per-player bags, gold tracking, and a paper-doll equipment visualizer with stat/AC/damage modifiers mapped to 10 distinct slots + wondrous items. |
| **Bestiary & Compendium** | Built-in 800+ SRD monsters (`default_monsters.json`) plus custom entries. Features a structured attack editor, buff database, spell filtering, and a 5e.tools ETL pipeline. |
| **Campaign Tools** | Quest notebook, stat-based training progression tracker, and chaos/random event tables (Magic Fumble, Wild Magic, Weather). |
| **Desktop & VTT Integration** | Electron wrapper provides a native desktop experience with Owlbear Rodeo embedded directly into the combat screen. |

## 4. Architecture

The application employs a highly modular, loosely coupled architecture tailored for offline reliability but capable of cloud sync.

### Tech Stack
- **Frontend:** React 19, Vite 7, JavaScript (with partial TypeScript migration for domain models), plain CSS.
- **Backend (Optional):** Node.js, Express, Mongoose, JWT.
- **Desktop:** Electron 41.
- **Database:** MongoDB (Local or Atlas) + LocalStorage + JSON file persistence.

### Architectural Patterns
- **Lifted State (No Redux):** The root `App.jsx` component holds the canonical data object, passing down state slices and updater callbacks to feature components (e.g., `PlayerManager`, `Equipment`).
- **Offline-First Persistence:** By default, every change auto-saves to `localStorage`. A `SyncService` pushes differences to the cloud API (`/sync`) with a 30-second auto-retry. Save states can also be exported/imported as JSON files.
- **Combat Pipeline (`combatUtils.js`):** Centralizes dice parsing, attack resolution, and modifiers. Evaluates rules on the fly before applying damage, CC (crowd control), or temp HP to actor models.

### Repository Layout
- `api/`: Express API and MongoDB models.
- `webapp/src/core/`: Main entry point and global state components.
- `webapp/src/features/`: Domain-driven features (battle, campaign, inventory, compendium).
- `webapp/src/shared/`: Utility functions (combat math, schema resolvers).
- `webapp/electron/`: Main Electron process handling IPC for VTT overlays and window management.

## 5. Scalability & Deployment

### Scalability Characteristics
- **Client-Side Heavy:** The application delegates almost all compute (combat logic, dice rolling, rules evaluation) to the client's browser/Electron instance. This zero-compute backend approach scales incredibly well, as the server merely acts as a dumb JSON state store.
- **Bestiary Loading:** The current `default_monsters.json` is ~63k lines. While sufficient for desktop memory, future scalability efforts may require lazy-loading or pagination by Challenge Rating (CR).
- **Database Scalability:** Uses MongoDB, which inherently scales horizontally. The document structure (`CampaignSync` model) stores serialized JSON dumps, reducing relational query overhead.

### Deployment & CI/CD Pipelines
- **Automated Desktop Releases:** GitHub Actions are configured to build the Vite frontend and NSIS installer upon pushes to `main`. It publishes executable installers (`PartyManager-Setup.exe`) and `latest.yml` to a public releases repository.
- **Auto-Update:** The packaged Electron app utilizes `electron-updater` to poll the public repository on startup and download updates in the background.
- **API Hosting:** The Express backend supports zero-config cloud deployments (historically hosted on Render) using standard environment variables (`MONGO_URI`, `JWT_SECRET`).

## 6. Future Roadmap (Known Gaps)
- **Multiplayer/Player View:** Expanding the WebSocket implementation to broadcast DM actions securely to player devices.
- **TypeScript:** Continuing the migration from JSX to strict TSX for robust UI component typing.
- **Encounter Builder:** Integrating the drafted `EncounterBuilder.jsx` UI into the active `App.jsx` routing.
- **Automated Testing:** Implementation of unit tests, especially for the complex logic inside `combatUtils.js` and `RuleEvaluator.ts`.
