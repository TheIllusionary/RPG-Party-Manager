# RPG Party Manager — Roadmap

Work in progress is tracked here and in GitHub issues.

## Security & reliability

- [ ] Rotate the production `JWT_SECRET` on Render (the code no longer ships a
      fallback, so the API requires an explicit secret).
- [ ] Add rate limiting and refresh-token rotation for the JWT auth flow.
- [ ] Harden the desktop auto-updater (signing + checksum verification).

## Features

- [ ] Re-add the Spells / Classes / Races / Subclasses database tabs that lived
      on an earlier branch (see history around `3aad251`).
- [ ] Cloud sync conflict UI for campaigns edited on multiple machines.
- [ ] Richer VTT integration (fog of war, token ownership) with Owlbear Rodeo.
- [ ] Dice roller history and house-rule toggles surfaced in settings.

## Platform

- [ ] Mobile/web companion view for players (read-only party/character sheet).
- [ ] Docker Compose for a self-hostable API + MongoDB deployment.
- [ ] Shrink the desktop bundle (compress the large PNG sprites, code-split the
      bestiary).

## Maintainer hygiene

- [ ] Keep `npm test` (Vitest) and `npm run build` green in CI.
- [ ] Document a reproducible Windows installer pipeline (see
      `webapp/scripts/build-portable.py`).
