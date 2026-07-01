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

## 2026-07-01 — Cursor

- **Area:** docs | structure | typescript
- **Summary:** Feature-driven layout (`src/core`, `src/features/*`, `src/shared`, `src/types`), TS migration, removed legacy `PlayerManagerModule` junk, fixed `setCcDropdownPlayerId` runtime error by moving CC dropdown state into `PlayerCard`/`EnemyCard`.
- **Files:** `webapp/src/features/**`, `webapp/src/types/index.ts`, `webapp/tsconfig*.json`, `docs/CHANGELOG_AI.md`, `.cursorrules`, `README.md`

## 2026-07-01 — Cursor

- **Area:** docs
- **Summary:** Added AI collaboration rules (`.cursorrules`), professional README, PR template, and consolidated project documentation pipeline.
- **Files:** `.cursorrules`, `README.md`, `docs/PR_TEMPLATE.md`, `docs/CHANGELOG_AI.md`, legacy `webapp/src/components/` cleanup

## 2026-07-01 — Cursor

- **Area:** docs | tooling
- **Summary:** Added `scripts/generate-commit.mjs` and `npm run commit:ai` to draft PR/commit messages from git diff into `docs/LAST_COMMIT_MSG.txt`; updated `.cursorrules` commit/PR rules.
- **Files:** `scripts/generate-commit.mjs`, `scripts/commit-ai.sh`, `package.json`, `.cursorrules`, `README.md`, `.gitignore`
