# Mudanças Recentes — RPG Party Manager

Documento resumindo evoluções no frontend, API, desktop e infraestrutura local.  
**Fuso horário de referência:** BRT (UTC−3), salvo indicação contrária.

**Última atualização deste arquivo:** `2026-07-02 · 24:15 (BRT)`

---

## Índice cronológico (mais recente primeiro)

| Data · Hora (BRT) | Seção | Resumo |
|-------------------|-------|--------|
| 2026-07-02 · 24:15 | [§20](#20-filtros-de-magias-no-compendium-jul2026) | Filtros por nível, classe, duração, casting time, componentes e mais |
| 2026-07-02 · 23:45 | [§19](#19-ui-combate-inline-jul2026) | Barra rápida de dano/cura, badges de resistência, painel Encounter/Scene |
| 2026-07-02 · 23:00 | [§18](#18-motor-de-regras-no-combate-jul2026) | Regras disparam em dano/cura/turno/magia; monstros e NPCs incluídos |
| 2026-07-02 · 22:30 | [§17](#17-regras-afetam-mana-e-hp-jul2026) | Regras `compute` ativas passam a calcular mana máxima e HP na party |
| 2026-07-02 · 22:00 | [§16](#16-regras-na-campanha-jul2026) | Aba Regras na campanha: ativar/desativar blocos; `logicBlocks` salvo no MongoDB |
| 2026-07-02 · 21:15 | [§15](#15-soft-delete-de-regras-e-atributos-de-classe-jul2026) | Exclusão de regras com tombstone; mapeamento D&D 5e classe → atributo |
| 2026-07-02 · 20:30 | [§14](#14-sync-dashboard-e-console-jul2026) | DM Dashboard não tenta mais sync na nuvem; menos ruído no console Electron |
| 2026-07-02 · 19:00 | [§13](#13-root-layout-global-jul2026) | `RootLayout` centraliza conteúdo; filhos sem wrappers duplicados |
| 2026-07-02 · 18:00 | [§12](#12-vertical-block-builder-jul2026) | Editor de regras em pilha vertical, labels amigáveis, layout split |
| 2026-07-02 · 14:30 | [§11](#11-editor-visual-de-regras-jul2026) | Editor node-based com React Flow, debug em tempo real, sync local |
| 2026-07-02 · 12:00 | [§10](#10-motor-de-regras-e-player-view-jul2026) | `RuleEvaluator`, `PlayerViewService`, WebSocket broadcast |
| 2026-07-02 · 10:00 | [§9](#9-infraestrutura-documental-e-electron-jul2026) | Camada NoSQL local, `Actor`, `LogicBlock`, persistência JSON |
| 2026-07-02 · 03:24 | [§8](#8-distribuição-desktop-e-api-na-nuvem-jul2026) | Releases públicos, CI Electron, Render |
| 2026-07-01 · 17:06 | [§7](#7-campanhas-typescript-e-ux-jul2026) | Delete campanha, modal de nível da party, tipos centralizados |
| 2026-07-01 · 15:12 | [§6](#6-autenticação-e-campanhas-contexto-anterior) | JWT, MongoDB, Electron dev |
| 2026-07-01 · 03:01 | [§5](#5-refatoração-do-playermanager-jul2026) | God component → `features/battle/` |
| 2026-06-30 · 19:05 | — | Layout webapp, equipamento, Enemy Library, fixes DB |
| 2026-06-21 | [§1–§4](#1-subclasses-customizadas-jun2026) | Subclasses, import JSON, normalização, nível/XP |

---

## 20. Filtros de magias no Compendium (jul/2026)

**Data · Hora (BRT):** `2026-07-02 · 24:15`

### O que mudou para o DM

- Na aba **Spells** do Compendium, a barra lateral ganhou um painel **Filtros** acima da busca.
- É possível filtrar por **nível** (pílulas Cantrip–9), **escola**, **classe**, **casting time**, **duração**, **alcance**, **ritual**, **concentração**, **componentes** (V / S / M), **com dano** e **com save**.
- A busca por texto também procura na descrição, classes e metadados da magia.
- O contador mostra quantas magias passaram nos filtros (`X of Y shown`); **Limpar** remove todos os filtros ativos.

### Detalhes técnicos

- `spellFilterUtils.ts` — estado, opções dinâmicas a partir do catálogo SRD local, função `filterSpells`.
- `SpellFiltersPanel.tsx` — UI sem modais; CSS em `compendium.css`.

---

## 19. UI de combate inline (jul/2026)

**Data · Hora (BRT):** `2026-07-02 · 23:45`

### O que mudou para o DM

- No modo **Fight!**, cada card de jogador e monstro ganhou uma **barra de ação rápida** abaixo do HP: valor numérico, tipo de dano, botões **Damage** (vermelho) e **Heal** (verde). O dano passa pelo `RuleEngine` (resistências, imunidades, pipeline).
- **Badges** mostram resistências, imunidades, vulnerabilidades e condições ativas; botão **+** adiciona condição inline (sem modal).
- Painel superior **Encounter / Scene** lista regras com escopo `encounter` e o botão **Avançar Turno** dispara `on_turn_start` no motor para testar regras ambientais (ex.: sala de lava).

### Detalhes técnicos

- Hook `useRuleEngineCombat` sincroniza atores com `RuleEngine` e expõe ações via `ICombatState`.
- CSS em `combat-inline.css` (inputs escuros, botões contrastantes; sem Tailwind).

---

## 18. Motor de regras no combate (jul/2026)

**Data · Hora (BRT):** `2026-07-02 · 23:00`

### O que mudou para o DM

- Regras **ativas** na campanha agora **executam de verdade** na mesa — não são só visuais.
- **Jogadores, monstros e NPCs** entram no motor (`actor.kind`: `player` / `monster` / `npc`).
- Gatilhos ligados:
  - `manual` — pools derivados (mana/HP máx.) e efeitos passivos
  - `on_damage` / `on_heal` — após dano ou cura (ataques, delta manual, buffs de turno)
  - `on_turn_start` / `on_turn_end` — botão “Resolve Turn” no combate
  - `on_spell_cast` — ao conjurar magia na party
- HP máximo de inimigos respeita regras `compute` com condição de monstro/NPC.

### Detalhes técnicos

- `actorBridge.ts` — `IPlayer` / `IEnemy` ↔ `Actor`
- `campaignRulesRuntime.ts` — `RuleEvaluator` + `LogicEngine` centralizados
- `LogicBlock.computeTarget` para fórmulas (`manaMax`, `hpMax`)
- Variáveis de contexto: `damage`, `healed`, `amount`, `spellLevel`

---

## 17. Regras afetam mana e HP (jul/2026)

**Data · Hora (BRT):** `2026-07-02 · 22:30`

### O que mudou para o DM

- Regras **ativas** na aba Regras da campanha agora **alteram mana máxima e HP** exibidos nos cards da party.
- A regra padrão **Mana Maximum** (`CON × 2 + nível`) substitui a fórmula antiga enquanto estiver ligada.
- Mudar atributos do personagem (CON, INT, classe, nível) ou a fórmula da regra reflete imediatamente no valor calculado.
- Desligar a regra na aba Regras volta ao cálculo legado (INT/WIS/CHA para mana).

### Detalhes técnicos

- `resolvePlayerResources()` + `playerToActor()` ligam `IPlayer` ao `RuleEvaluator`.
- `LogicBlock.computeTarget`: `manaMax` | `hpMax` (regra seed `mana_max_formula` já define `manaMax`).
- Blocos com **efeitos** (`effects`) e gatilho `manual` também podem ajustar pools via `LogicEngine`.
- Gatilhos de combate (`on_damage`, `on_turn_start`, etc.) ainda não disparam automaticamente na party.

---

## 16. Regras na campanha (jul/2026)

**Data · Hora (BRT):** `2026-07-02 · 22:00`

### O que mudou para o DM

- Nova aba **Regras** dentro da campanha (barra inferior, ícone de pergaminho).
- Lista as regras homebrew da campanha com interruptor **ativar/desativar** por regra.
- Campanhas novas ou sem regras recebem a regra padrão **Mana Maximum** (desativável).
- No app **Electron**, botão **Importar do DM Dashboard** traz blocos criados no editor completo para a campanha ativa.

### Detalhes técnicos

- `IAppData.logicBlocks`; persistência via `PUT /campaigns/:id/data` (MongoDB).
- `CampaignRulesPanel` em `features/campaign/`; `mergeLogicBlocksById` no `mergeCampaignData`.
- Criação/edição completa continua no **DM Dashboard**; avaliação em combate ver [§18](#18-motor-de-regras-no-combate-jul2026).

---

## 15. Soft delete de regras e atributos de classe (jul/2026)

**Data · Hora (BRT):** `2026-07-02 · 21:15`

### O que mudou para o DM

- **Excluir regra** no Editor de Regras agora faz *soft delete*: a regra some da lista, mas fica marcada como `deleted` no JSON para o sync não “ressuscitar” o bloco.
- No construtor de fórmulas, use **“Atributo de conjuração (classe)”** ou **“Atributo principal (classe)”** — o motor lê a classe do ator (`customAttributes.classType`) e pega o atributo certo (Mago → INT, Ladino → DEX, etc.).

### Detalhes técnicos

- `LogicBlock.deleted` + `updatedAt`; `mergeLogicBlocksById()` no `SyncService` e API `CampaignSync.logicBlocks`.
- `RuleEvaluator` / `LogicEngine` ignoram blocos deletados; `dashboardIpc` tombstone órfãos no disco.
- Mapa em `shared/schema/classAbilityMap.ts` (PT/EN).

---

## 14. Sync dashboard e console (jul/2026)

**Data · Hora (BRT):** `2026-07-02 · 20:30`

### O que mudou para o DM

- O **DM Test Dashboard** grava atores e blocos de regra apenas no disco local — não dispara mais tentativas repetidas de sincronização com a API (menos avisos `POST /sync failed` no terminal Electron).
- Painel de atores sem avisos React de `key` duplicada no console do DevTools.

### Detalhes técnicos

- `isCloudSyncableCampaignId()` em `types/sync.ts`; `saveLocal(..., { cloudSync: false })` no `dashboardIpc`.
- `SyncService.syncRemote` ignora IDs locais (`dm-dashboard-test`) e deduplica mensagens de erro idênticas.
- `ActorPanel`: `key` nos campos numéricos mapeados; classes CSS em `dashboard.css` (sem Tailwind).

---

## 13. Root Layout Global (jul/2026)

**Data · Hora (BRT):** `2026-07-02 · 19:00`

### O que mudou para o DM

- Todas as telas autenticadas passam a respeitar **margens laterais** e **largura máxima centralizada** — o conteúdo não encosta mais na borda esquerda da janela.
- Campanhas exibidas em **grid responsivo** (1 / 2 / 3 colunas) com espaçamento consistente.
- Party Roster, Subclasses e Editor de Regras herdam o mesmo container pai.

### Detalhes técnicos

- Novo `RootLayout.tsx`: shell `min-h-screen flex flex-col`, conteúdo em `max-w-7xl mx-auto px-4 gap-4`.
- `GameApp` usa `RootLayout` com `toolbar` = bottom-nav; filhos sem `app-page` / `pb-24` próprios.
- Removidos `min-h-screen` e `max-w-7xl` duplicados em `CampaignList`, `DmDashboard`, `BlockEditor`, `SubclassManager`.

---

## 12. Vertical Block Builder (jul/2026)

**Data · Hora (BRT):** `2026-07-02 · 18:00`

### O que mudou para o DM

- O **Editor de Regras** deixou de usar canvas de nós (React Flow) e passou a um **Vertical Block Builder**: blocos empilhados em coluna, responsivos em mobile.
- **Labels amigáveis** em todos os dropdowns (ex.: "Constituição (CON)" em vez de `actor.stats.con`).
- Layout em **duas colunas**: lista de regras à esquerda; editor da regra selecionada à direita.
- Blocos de **gatilho** (Passiva, Ao Receber Dano, Ação Manual), **fórmula** (passos matemáticos) e **condições** com ícones Lucide para adicionar/remover.
- Painel de **preview** continua mostrando o resultado da fórmula por ator.

### Detalhes técnicos

- `SchemaResolver.ts` — mapa nome amigável → caminho técnico; UI nunca expõe dot-paths.
- `formulaStack.ts` — compila/descompila `VerticalRuleDraft` ↔ `RuleExpression`.
- `VerticalBlockBuilder.tsx`, `BlockEditor.tsx`, `useRulesEditor.ts` — stack flex, grid `lg:grid-cols-12`, design system base-4.
- Removidos nós React Flow, `rulesGraphCompiler.ts` e `ActorFieldSelect.tsx`.

---

## 11. Editor Visual de Regras (jul/2026)

**Data · Hora (BRT):** `2026-07-02 · 14:30`

### O que mudou para o DM

- Novo **Visual Rules Editor** no DM Dashboard: monte fórmulas homebrew arrastando blocos **Variable**, **Valor** e **Math** (soma, subtração, multiplicação, divisão).
- Menu lateral para adicionar blocos e alternar entre regras da campanha.
- **Debug Panel** no rodapé mostra o resultado da fórmula para cada ator em tempo real (ex.: Mana = CON×2 + Level).
- Alterações são salvas automaticamente no `campaign.json` local (Electron).

### Detalhes técnicos

- `@xyflow/react` + nós customizados em `webapp/src/components/RulesEditor/`.
- Estado serializado como `LogicBlock[]` com `compute: RuleExpression` compatível com `RuleEvaluator`.
- Layout do grafo persistido em `customAttributes._rulesEditorFlow`.
- IPC: `dm:list-logic-blocks`, `dm:save-logic-blocks` → `SyncService.saveLocal()`.

---

## 10. Motor de Regras e Player View (jul/2026)

**`2026-07-02 · 12:00 (BRT)`** — sessão Cursor (infra de negócio RPG)

### RuleEvaluator (`webapp/src/engine/RuleEvaluator.ts`)
- Função `evaluate(actor, rule): number` — avalia blocos `LogicBlock` definidos em JSON.
- Mapa de operadores `add`, `subtract`, `multiply`, `divide` — **sem `eval()`**.
- Suporta árvore `RuleExpression` em `rule.compute` (ex.: Mana = Constitution × 2 + Level).
- Agnóstico à SRD: lê paths como `actor.stats.con`, `actor.customAttributes.level`.
- Comentários no código explicam como adicionar novos blocos só via JSON.

### Player View (`webapp/src/services/PlayerViewService.ts`)
- `sanitizeForPlayerView(actor): PlayerViewDTO` — whitelist: `name`, `hp`, `mana`, `statusEffects`, equipamento visível.
- Remove segredos do DM: `dmNotes`, `realHP` (quando oculto), `aiPrompt`, etc.

### WebSocket (`webapp/src/services/WebSocketServer.ts`)
- Servidor local `ws://127.0.0.1:8765` (porta via `PLAYER_VIEW_WS_PORT`).
- `persistActorAndBroadcast()` grava no store JSON e envia DTO sanitizado a todos os clientes.

### Arquivos principais
| Arquivo | Papel |
|---------|--------|
| `webapp/src/engine/RuleEvaluator.ts` | Cálculo numérico homebrew |
| `webapp/src/services/homebrew/LogicEngine.ts` | Mutação do actor via `effects` |
| `webapp/src/services/PlayerViewService.ts` | Sanitização + orquestração de broadcast |
| `webapp/src/services/WebSocketServer.ts` | Broadcast WebSocket |
| `webapp/src/services/actorPersistence.ts` | Persistência + disparo de broadcast |

---

## 9. Infraestrutura Documental e Electron (jul/2026)

**`2026-07-02 · 10:00 (BRT)`** — sessão Cursor

### Decisão arquitetural
- Persistência **orientada a documentos** (JSON), sem SQLite.
- Single-tenant; sync futuro usuário único.
- Entidades: `CampaignState`, `EncounterState`, `Actor`, `LogicBlock`.

### Implementação
- `FileSystemDocumentStore` — um `.json` por documento em `{userData}/documents/`.
- Tipos em `webapp/src/types/domain/` com `CustomAttributes` / `HomebrewRules` como `Record<string, unknown>`.
- Bootstrap no processo principal do Electron (`electron/bootstrap/infrastructure.cjs`).
- Build: `npm run build:electron-services --prefix webapp` → `electron/lib/`.

---

## 8. Distribuição Desktop e API na Nuvem (jul/2026)

| Data · Hora (BRT) | Mudança |
|-------------------|---------|
| `2026-07-02 · 03:24` | Releases publicados no repo público `RPG-Party-Manager-Releases` |
| `2026-07-02 · 03:06` | Fix loop de `postinstall` no CI de release |
| `2026-07-02 · 03:00` | Alias `PartyManager-Setup.exe` + script `publish:electron` |
| `2026-07-01 · 17:12` | GitHub Actions publica Electron a cada push na `main` |
| `2026-07-01 · 17:06` | Deploy API Render na `main` (commit `cc2b527`) |

### Destaques
- **API produção:** `https://rpg-party-manager-api.onrender.com`
- **Download fixo:** `…/RPG-Party-Manager-Releases/releases/latest/download/PartyManager-Setup.exe`
- **Auto-update:** `electron-updater` lê `latest.yml` do repo público de releases.
- **Secret CI:** `RELEASES_REPO_TOKEN` no repo privado.

---

## 7. Campanhas, TypeScript e UX (jul/2026)

**`2026-07-01 · 17:06 (BRT)`** — commit `cc2b527`

### API e campanhas
- `DELETE /campaigns/:id` — remove campanha + `CampaignData`.
- Botão 🗑️ com confirmação em `CampaignList`.

### Party / combate
- **Set Party Level** via modal (`PartyLevelModal`) — substituiu `window.prompt`.
- Hook `usePartyState`: `openPartyLevelModal()`, `applyPartyLevel()`.

### TypeScript
- Tipos por domínio: `types/api.ts`, `battle.ts`, `campaign.ts`, `bestiary.ts`, `inventory.ts`, `auth.ts`, `app.ts`.
- `services/api.ts` totalmente tipado (sem `@ts-nocheck`).
- Layout feature-driven consolidado em `webapp/src/features/`.

### Automação de commits/PRs
- **`2026-07-01 · ~03:00 (BRT)`** — `npm run commit:ai` → `docs/LAST_COMMIT_MSG.txt` a partir do git diff + `PR_TEMPLATE.md`.

---

## 5. Refatoração do PlayerManager (jul/2026)

**`2026-07-01 · 03:01 (BRT)`** — commit `75a9069` (e sessões `2026-07-01` anteriores)

O monólito (~4.800 linhas) foi dividido em módulo coeso em **`webapp/src/features/battle/`** (não mais `components/PlayerManagerModule/`).

### Estrutura atual
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

### Separação de responsabilidades
| Camada | Responsabilidade |
|--------|------------------|
| `usePartyState` | Jogadores, HP/Mana, nível/XP, buffs/CC, descansos |
| `useCombatState` | Inimigos, targeting, modal de ataque, VTT, `battleNotes` |
| Componentes | JSX e estado visual (dropdowns CC nos cards) |

### O que não mudou
- Regras em `shared/utils/combatUtils.ts`.
- Contrato com `GameApp.tsx`.

---

## 1. Subclasses Customizadas (jun/2026)

**`2026-06-21 · 11:00 – 23:50 (BRT)`** — bestiário e subclasses (commits `b807c6d` … `e2f8673`); integração UI em jul/2026.

### Modelagem de dados
- Schema `ISubclass`: resistências, traços passivos, `abilities[]` (formato de ataque do bestiário).
- `resourceTrait: 'standard' | 'vampire'`.
- `subclassId` em `IPlayer`.
- Seed: **Blood Magic** (`sub_blood_magic`).

### Motor de combate (`combatUtils.ts`)
- `getEffectiveDamageModifiers(player, subclassData)`.
- Colisão: vulnerabilidades da subclasse removem resistências base do mesmo tipo.
- `isVampirePlayer`, `castSpellOnPlayer`, etc.

### UI
- **`SubclassManager`** — aba na navegação.
- Dropdown de subclasse e habilidades no card do jogador em combate.

---

## 2. Importação de JSON Legado (Campanhas)

**`2026-06-21 – 2026-07-01 (BRT)`** — fluxo estável após normalização

### Fluxo (`CampaignList`)
1. **Importar JSON** ao lado de **+ Create**.
2. Validação (`players` ou `equipment`; aceita `data` / `partyManagerData`).
3. `POST /campaigns` → `PUT /campaigns/:id/data` com payload normalizado.

### API
- `PATCH /campaigns/:id` — renomear campanha.
- Botão ✎ inline na lista.

---

## 3. Normalização de Dados (Data Hydration)

**`2026-06-21 – 2026-07-01 (BRT)`**

### `webapp/src/shared/utils/migrationUtils.ts`
- `normalizeImportedData()` — hidrata saves antigos.
- Templates default para player, enemy, buff.
- Mapeia `subclass` → `subclassId`, `customSubclasses` → `subclasses`.

### Integração
- `mergeCampaignData()` → `normalizeImportedData()` antes do merge de catálogo.

---

## 4. Edição Direta de Nível

**`2026-06-21 – 2026-07-01 (BRT)`** — modal da party em `2026-07-01 · 17:06`

### Comportamento
- Nível editável manualmente; `xp` ajustado ao threshold mínimo D&D 5e.
- `hpCurrent` limitado ao novo `hpMax` ao reduzir nível.

### UI
- **Lv. X** clicável no card → input inline.
- **Set Party Level** — modal para todos com `inParty: true` (desde `2026-07-01 · 17:06`).

---

## 6. Autenticação e Campanhas (contexto anterior)

**`2026-06-30 · 19:05 (BRT)`** e anteriores

- JWT + rotas protegidas `/campaigns`.
- `CampaignList` → `GameApp` com persistência MongoDB.
- Electron + scripts `npm run dev` na raiz do monorepo.
- Defaults cloud em `shared/cloudDefaults.js` → API Render quando não há `.env` local.

---

## Como testar

| Área | Passos |
|------|--------|
| Subclasses | Aba Subclasses → criar → equipar no card → testar em Battle Mode |
| Import JSON | Campaigns → Importar JSON → renomear com ✎ |
| Nível | Lv. no card ou **Set Party Level** (modal) |
| Campanhas | Criar / renomear / deletar na lista |
| Build | `npm run build --prefix webapp` |
| Electron + infra local | `npm run build:electron-services --prefix webapp` → `npm run electron:dev --prefix webapp` |
| Player View WS | Conectar em `ws://127.0.0.1:8765`, enviar `{ "type": "subscribe" }` |

---

## Documentação relacionada

| Arquivo | Conteúdo |
|---------|----------|
| `docs/PROJECT_OVERVIEW.md` | Visão geral, automação deploy/CI/commits |
| `docs/CHANGELOG_AI.md` | Log de sessões de agentes IA |
| `architecture.md` | Design técnico (parcialmente legado) |

---

*Formato de timestamp: `AAAA-MM-DD · HH:MM (BRT)` — horários de commit quando disponíveis; sessões Cursor sem commit usam hora estimada da sessão.*
