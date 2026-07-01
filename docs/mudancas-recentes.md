# Mudanças Recentes — RPG Party Manager

Documento resumindo as evoluções implementadas no frontend e na API relacionadas a subclasses, importação de saves legados, normalização de dados, edição de nível e refatoração do `PlayerManager`.

---

## 1. Subclasses Customizadas (Data Override)

### Modelagem de dados
- Novo schema de subclasse com:
  - `resistances`, `immunities`, `vulnerabilities` (arrays de strings)
  - `passiveTraits: [{ name, description }]`
  - `abilities: []` — mesmo formato de ataque do Bestiário (`toHit`, `damage`, `dc`, `save`, `cc`, etc.)
  - `resourceTrait: 'standard' | 'vampire'`
- Campo `subclassId` nos jogadores para equipar uma subclasse.
- Seed de exemplo: **Blood Magic** (`sub_blood_magic`).

### Arquivos principais
| Arquivo | Alteração |
|---------|-----------|
| `webapp/src/data/attackSchema.js` | Factories `createEmptyAttack()` e `createEmptySubclass()` |
| `webapp/src/data/defaultData.js` | `DEFAULT_SUBCLASSES`, merge em `mergeCampaignData()` |
| `api/data/defaultData.js` | Espelho do frontend |
| `api/models/CampaignData.js` | Campo `subclasses` |
| `api/routes/campaigns.js` | `subclasses` em `GAME_STATE_FIELDS` |

### Motor de combate (`combatUtils.js`)
- `getEffectiveDamageModifiers(player, subclassData)` — merge de resistências/imunidades/vulnerabilidades do jogador + subclasse.
- **Regra de colisão:** vulnerabilidades da subclasse removem resistências/imunidades base do mesmo tipo.
- `getDamageMultiplier` / `getDamageModifierBreakdown` aceitam `subclassData` opcional.
- `isVampirePlayer(player, subclassData)` — `resourceTrait` da subclasse tem precedência.
- Funções de dano contra inimigos: `getEnemyDamageMultiplier`, `getEnemyDamageModifierBreakdown`.
- `castSpellOnPlayer` / `getSpellCostPreview` consideram subclasse.

### UI
- **`SubclassManager`** — nova aba na navegação (ícone de estrela) para criar/editar subclasses.
- Modificadores de dano **mutuamente exclusivos** por tipo (última seleção vence).
- **`PlayerManager`** — dropdown de subclasse, traços passivos, botões de habilidades (ataque jogador → inimigo no combate).

---

## 2. Importação de JSON Legado (Campanhas)

### Fluxo (`CampaignList.jsx`)
1. Botão **Importar JSON** ao lado de **+ Create**.
2. Leitura via `FileReader` + validação (`players` ou `equipment` na raiz; aceita `data` / `partyManagerData`).
3. `POST /campaigns` — campanha provisória `"Campanha Importada"`.
4. `PUT /campaigns/:id/data` — payload normalizado e mesclado.

### API
- `PATCH /campaigns/:id` — renomear campanha (metadados; o `PUT /data` não cobre nome).
- `updateCampaign()` em `webapp/src/services/api.js`.

### Renomear campanha
- Botão ✎ inline na lista de campanhas.

---

## 3. Normalização de Dados (Data Hydration)

### `webapp/src/utils/migrationUtils.js`
- `normalizeImportedData(importedData, defaultData)` — hidratação profunda de saves antigos.
- `DEFAULT_PLAYER_TEMPLATE` — garante `recentSpells: []`, `resourceTrait`, `subclassId`, arrays de resistência/CC, etc.
- `DEFAULT_ENEMY_TEMPLATE` / `DEFAULT_BUFF_TEMPLATE` — para entidades aninhadas.
- Mapeia `subclass` legado → `subclassId`; `customSubclasses` → `subclasses`.
- Garante estrutura de `chaos`, `notebook`, `equipment`.

### Integração
- `mergeCampaignData()` chama `normalizeImportedData()` antes do merge de catálogo (buffs/subclasses padrão).
- Importação em `CampaignList` usa `normalizeImportedData` → `mergeCampaignData` → `toApiPayload`.

---

## 4. Edição Direta de Nível

### Comportamento
- Nível deixa de depender apenas do XP acumulado para edição manual.
- Ao definir nível (1–20), o `xp` é ajustado para o **threshold mínimo** D&D 5e da tabela existente.
- `hpCurrent` é limitado ao novo `hpMax` ao reduzir nível.

### UI (`PlayerManager`)
- **Lv. X** clicável no card do jogador → input inline.
- Botão **Set Party Level** na barra superior (prompt nativo; aplica a todos com `inParty: true`).
- Funções: `getXpForLevel()`, `setLevel()`, `setPartyLevel()`.

---

## 5. Refatoração do PlayerManager (God Component → Módulo)

O arquivo monolítico (~4.800 linhas) foi dividido em uma estrutura coesa.

### Nova estrutura
```
webapp/src/components/
├── PlayerManager.jsx                    # ~4 linhas (re-export + CSS)
└── PlayerManagerModule/
    ├── PlayerManagerRoot.jsx            # Orquestrador (~18 linhas)
    ├── PlayerManagerView.jsx            # Layout e composição
    ├── constants.js                     # DAMAGE_TYPES, CC, XP thresholds, etc.
    ├── partyUtils.js                    # getLevelInfo, getXpForLevel, calculateModifier
    ├── hooks/
    │   ├── usePartyState.js             # Estado e lógica dos jogadores
    │   └── useCombatState.js            # Batalha, inimigos, VTT, ataques
    ├── components/
    │   ├── PlayerCard.jsx
    │   ├── EnemyCard.jsx
    │   ├── CombatHeader.jsx
    │   ├── FloatingActionBar.jsx
    │   ├── VttOverlay.jsx
    │   ├── PartyXpModal.jsx
    │   └── AttackResolutionModal.jsx
    └── styles/
        └── PlayerManager.css
```

### Separação de responsabilidades
| Camada | Responsabilidade |
|--------|------------------|
| `usePartyState` | Jogadores, HP/Mana inline, nível/XP, `recentSpells`, buffs/CC, descansos |
| `useCombatState` | Inimigos, alvos em massa, modal de ataque, VTT, `battleNotes` |
| Componentes visuais | JSX e interação; recebem `party` e `combat` via props |
| `PlayerManagerRoot` | Conecta hooks + `battleNotes` compartilhado entre party/combat |

### O que não mudou
- Regras de negócio em `combatUtils.js` (HP↔Mana, vampiro, Limit Break, etc.).
- Caminhos de sprites (`./sprites/...`).
- Contrato de props com `GameApp.jsx`.

### CSS
- Estilos movidos para `PlayerManagerModule/styles/PlayerManager.css`.
- O `PlayerManager.jsx` raiz importa esse CSS.

---

## 6. Autenticação e Campanhas (contexto anterior)

Referência rápida de mudanças já presentes no projeto:
- JWT + rotas protegidas `/campaigns`.
- `CampaignList` → `GameApp` com persistência MongoDB.
- Electron + `run.bat` para dev local.

---

## Como testar

1. **Subclasses:** aba Subclasses → criar/editar → equipar no card do jogador → testar habilidade em Battle Mode.
2. **Import JSON:** Campaigns → Importar JSON → selecionar save antigo → renomear com ✎.
3. **Nível:** clicar em Lv. no card ou **Set Party Level** no grupo.
4. **Refatoração:** fluxo completo Party + Fight + VTT + ataques; `npm run build` na pasta `webapp/`.

---

## Arquivos legados / limpeza opcional

- `webapp/src/components/PlayerManager.css` — cópia antiga; o CSS ativo está em `PlayerManagerModule/styles/`.
- `PlayerManagerModule/components/_*.txt` — fragmentos usados na extração automática dos cards; podem ser removidos.
- `PlayerManagerModule/scripts/buildCards.mjs` — script de geração dos cards; útil se for reextrair JSX.

---

*Última atualização: julho de 2026*
