# Relatório de Arquitetura — Master Compendium (5e.tools → MongoDB)

**Projeto:** RPG Party Manager — VTT D&D 5e offline-first  
**Fonte da Verdade:** [5etools-src](https://github.com/5etools-mirror-3/5etools-src) (JSON) + [5etools-img](https://github.com/5etools-mirror-3/5etools-img) (assets)  
**Escopo deste documento:** mapeamento estrutural e design do parser TypeScript. **Sem** script de seed/conexão MongoDB.  
**Data:** 2026-07-02 (BRT)

---

## Contexto e objetivo

O app hoje normaliza conteúdo SRD via `dnd5eapi.co` (`ISRDSpell`, `ISRDEquipmentItem` em `webapp/src/types/srd.ts`). O Master Compendium expande isso para o corpus completo do 5e.tools (PHB, MM, TCE, XPHB, aventuras, etc.), exigindo:

1. **Ingestão particionada por livro** (`source` = código curto: `PHB`, `MM`, `TCE`…).
2. **Sanitização de tags inline** (`{@damage 8d6}`, `{@spell fireball|PHB}`…) presentes em quase todo texto narrativo.
3. **Resolução de mídia** via repositório `5etools-img`, desacoplada do JSON.

---

## 1. Mapeamento do Repositório SRC (O JSON)

### 1.1 Organização geral de `data/`

O 5e.tools **não usa um único JSON monolítico**. Cada domínio tem pasta ou arquivo raiz, índices e arquivos *fluff* separados:

| Domínio | Padrão de arquivo | Chave raiz do array | Índice |
|--------|-------------------|---------------------|--------|
| Spells | `data/spells/spells-{SOURCE}.json` | `"spell": [...]` | `data/spells/index.json` |
| Classes | `data/class/class-{name}.json` | `"class": [...]` | `data/class/index.json` |
| Bestiary | `data/bestiary/bestiary-{SOURCE}.json` | `"monster": [...]` | `data/bestiary/index.json` |
| Items (base) | `data/items-base.json`, `data/items.json`, etc. | `"baseitem"`, `"item"`, … | vários |
| Livros | `data/books.json` | `"book": [...]` | — |

Arquivos auxiliares recorrentes em cada domínio:

- **`sources.json`** — metadados cruzados (ex.: quais classes aprendem cada magia).
- **`fluff-{domain}-{SOURCE}.json`** — lore + **imagens** (sem stats).
- **`fluff-index.json`** — mapa `SOURCE → arquivo fluff`.
- **`foundry.json`** — export Foundry VTT (útil como referência, não como fonte primária).
- **`_meta.internalCopies`** — indica arrays duplicados/copiados dentro do mesmo arquivo (ex.: `subclass`, `subclassFeature`).

### 1.2 `data/spells/` — esquema do item

Cada magia é um objeto dentro de `"spell": [ ... ]`. Identidade canônica 5e.tools:

```
{name}|{source}   →   ex.: "Fireball|PHB"
```

Campos observados (amostra real de `spells-phb.json`):

| Campo | Tipo | Função |
|-------|------|--------|
| `name` | string | Nome display |
| `source` | string | **Código do livro** (`PHB`, `XPHB`, `TCE`…) |
| `page` | number | Página no livro |
| `srd` / `basicRules` / `srd52` / `basicRules2024` | boolean | Flags de disponibilidade SRD / regras básicas |
| `otherSources` | `{ source, page }[]` | Aparição secundária em outro livro |
| `referenceSources` | string[] | Referências em aventuras/outros produtos |
| `reprintedAs` | string[] | Reimpressão `"Name\|SOURCE"` (ex.: `"Fireball\|XPHB"`) |
| `level` | number | 0 = cantrip |
| `school` | string | **Código interno** (`V`, `E`, `A`…) — não texto longo |
| `time` | `{ number, unit }[]` | Casting time estruturado |
| `range` | objeto | `type` + `distance` (`feet`, `self`, `sight`…) |
| `components` | `{ v?, s?, m? }` | Componentes; `m` pode ser string longa |
| `duration` | array | `instant`, `timed`, `permanent`, `special` + sub-objetos |
| `entries` | `(string \| EntryObject)[]` | **Descrição com tags `{@…}`** |
| `entriesHigherLevel` | EntryObject[] | Texto de upcast |
| `scalingLevelDice` | objeto | Fórmulas por nível (alternativa a tags `{@scaledamage}`) |
| `damageInflict` | string[] | Tipos (`fire`, `acid`…) |
| `savingThrow` | string[] | Saves (`dexterity`…) |
| `miscTags` / `areaTags` | string[] | Taxonomia interna para filtros 5e.tools |
| `hasFluff` / `hasFluffImages` | boolean | Indica existência de fluff/imagem no sidecar |

**Importante:** a lista de **classes que conhecem a magia não fica no objeto spell**. Ela mora em:

```
data/spells/sources.json
  └── { SPELL_SOURCE: { "Spell Name": { "class": [ { "name": "Wizard", "source": "PHB" }, … ] } } }
```

Ou seja, o ETL deve **join** `spells-*.json` + `sources.json` para popular `classes[]` no schema interno.

### 1.3 `data/class/` — esquema do item

Arquivo por classe (`class-wizard.json`), índice em `class/index.json`:

```json
{ "wizard": "class-wizard.json", "fighter": "class-fighter.json", … }
```

Cada arquivo contém múltiplos arrays (mesmo `_meta.internalCopies`):

| Array | Conteúdo |
|-------|----------|
| `class[]` | Definição da classe — **várias edições no mesmo arquivo** (ex.: `source: "PHB"` classic + `source: "XPHB"` one) |
| `subclass[]` | Subclasses (School of Evocation, etc.) |
| `classFeature[]` | Features numeradas por nível |
| `subclassFeature[]` | Features de subclass |

Campos relevantes em `class[]`:

- `source`, `page`, `edition` (`classic` \| `one`)
- `hd`, `proficiency`, `spellcastingAbility`, `casterProgression`
- `startingProficiencies`, `startingEquipment` — **strings com tags** `{@item …}`
- `classTableGroups` — colunas da tabela de progressão (podem conter `{@filter …}`)
- `classFeatures` — lista de referências `"Feature Name|Class||level|SOURCE?"` ou objetos `{ classFeature, gainSubclassFeature }`
- `hasFluff` / `hasFluffImages`

Chaves de feature/subclass seguem pipe-delimited:

```
Arcane Tradition|Wizard||2
Cantrip Formulas|Wizard||3|TCE
Wizard Subclass|Wizard|XPHB|3
```

### 1.4 Onde fica Source / livro (PHB, TCE, …)

| Nível | Onde | Exemplo |
|-------|------|---------|
| **Por entidade** | Campo `source` em spell, monster, class, item | `"source": "PHB"` |
| **Catálogo de livros** | `data/books.json` → `"book": [{ id, source, name, group, cover, published, … }]` | `"id": "PHB"`, `"name": "Player's Handbook (2014)"` |
| **Sidecar por domínio** | Nome do arquivo | `spells-tce.json`, `bestiary-mm.json` |
| **Tags inline** | Pipe após nome | `{@item longsword\|phb}`, `{@spell fireball\|PHB\|optional link text}` |
| **Reimpressões** | `reprintedAs` | `"Fireball\|XPHB"` liga edição 2014 → 2024 |
| **Referências cruzadas** | `otherSources`, `referenceSources` | aparições em aventuras |

**Regra de ouro para chave composta no MongoDB:**

```text
entityKey = `${normalize(name)}|${source.toUpperCase()}`
```

Tags usam `source` **case-insensitive** na prática (`phb` ≡ `PHB`).

### 1.5 O desafio das tags — padrões exatos

Sintaxe geral (documentada no [Renderer Demo](https://5etools.vercel.app/renderdemo.html) e extensão [5e-tools-tags](https://github.com/Jklein64/5e-tools-tags)):

```text
{@tag}
{@tag conteúdo}
{@tag conteúdo|source}
{@tag conteúdo|source|texto do link}
{@tag conteúdo|source|texto|…}    ← pipes adicionais (class, subclass, nível…)
{@tag conteúdo|source|…}*          ← sufixo * em homebrew (display alternativo)
```

#### Tags mecânicas (prioridade alta no sanitizer)

| Tag | Padrão exato | Exemplo real | Limpeza sugerida |
|-----|--------------|--------------|------------------|
| `{@dice …}` | `{@dice EXPR}` ou `{@dice EXPR\|EXPR\|display}` | `{@dice 4d4 × 10\|4d4 × 10\|Starting Gold}` | Extrair EXPR ou 3º segmento (display) |
| `{@damage …}` | `{@damage FORM}` | `{@damage 8d6}`, `{@damage 1d4 + 2}` | → `8d6` / `1d4 + 2` |
| `{@scaledamage …}` | `{@scaledamage base\|slotMin-slotMax\|perSlot}` | `{@scaledamage 8d6\|3-9\|1d6}` | → texto legível ou objeto estruturado |
| `{@scaledice …}` | `{@scaledice …}` | variantes de scaling | idem |
| `{@hit …}` | `{@hit MOD}` | `{@hit 4}`, `{@hit +6}` | → `+4 to hit` ou só `+4` |
| `{@h}` | literal `{@h}` | antes do dano no hit | → `"Hit: "` ou remover |
| `{@atk …}` | `{@atk m\|r\|a}[w\|s][,…]` | `{@atk mw}`, `{@atk mw,rw}` | → `"Melee Weapon Attack:"` etc. |
| `{@dc …}` | `{@dc …}` | DCs de habilidade | extrair número/texto |
| `{@d20}` | `{@d20}` | | → `d20` |
| `{@recharge N}` | `{@recharge 5}` | | → `(Recharge 5-6)` |
| `{@status …}` | `{@status id}` ou `{@status id\|display}` | `{@status concentration}` | → nome da condição |
| `{@condition …}` | `{@condition id\|source?}` | `{@condition blinded}` | → `"blinded"` + ref opcional |

#### Tags de referência cruzada (prioridade média — preservar como links)

| Tag | Padrão | Exemplo |
|-----|--------|---------|
| `{@spell …}` | `{@spell name\|source?\|display?}` | `{@spell fireball}`, `{@spell tiny servant\|XGE}` |
| `{@item …}` | `{@item name\|source?\|display?}` | `{@item quarterstaff\|phb}` |
| `{@creature …}` | `{@creature name\|source?\|display?}` | `{@creature air elemental}` |
| `{@class …}` | `{@class name\|source?\|display?\|subclass?}` | `{@class wizard\|phb}` |
| `{@classFeature …}` | `{@classFeature …}` | features com pipes de nível |
| `{@subclassFeature …}` | idem | |
| `{@skill …}` | `{@skill arcana}` | |
| `{@filter …}` | `{@filter text\|page\|filters…}` | links de filtro UI — **não** resolve no ETL |
| `{@book …}` / `{@adventure …}` | capítulo/seção | navegação livro/aventura |
| `{@object …}` | `{@object Ballista\|DMG}` | |
| `{@feat …}`, `{@race …}`, `{@background …}`, etc. | mesmo padrão pipe | ver lista completa abaixo |

Lista de tags de conteúdo reconhecidas pelo ecossistema 5e.tools (case-insensitive):

`@action`, `@adventure`, `@area`, `@atk`, `@b`, `@background`, `@bold`, `@book`, `@boon`, `@chance`, `@class`, `@classFeature`, `@color`, `@condition`, `@creature`, `@cult`, `@d20`, `@damage`, `@dc`, `@deity`, `@dice`, `@disease`, `@feat`, `@filter`, `@footnote`, `@h`, `@hazard`, `@hit`, `@homebrew`, `@i`, `@italic`, `@item`, `@language`, `@link`, `@loader`, `@note`, `@object`, `@optfeature`, `@psionic`, `@race`, `@recharge`, `@reward`, `@s`, `@scaledice`, `@scaledamage`, `@sense`, `@skill`, `@spell`, `@status`, `@strike`, `@subclassFeature`, `@table`, `@tags`, `@trap`, `@variantrule`, `@vehicle`, `@5etools`

#### Tags de formatação (prioridade baixa)

| Tag | Exemplo | Limpeza |
|-----|---------|---------|
| `{@b …}` / `{@bold …}` | `{@b Strength}` | manter texto; opcional `**Strength**` |
| `{@i …}` / `{@italic …}` | `{@i Rod of Law}` | manter texto; opcional `*Rod of Law*` |
| `{@s …}` | strikethrough | manter texto |
| `{@footnote …}` | notas de rodapé | mover para array `footnotes[]` |

Marcadores alternativos no fluff (não `{@tag}`):

- `{@i …}` no texto de lore (itálico semântico de item mágico).
- Objetos `EntryObject` com `"type": "entries"`, `"inset"`, `"table"`, `"list"`, `"image"` — **não são tags string**.

### 1.6 Regex — identificação e limpeza

**Não basta um único `replace` global.** O renderer 5e.tools usa parser dedicado (tags aninhadas, pipes variáveis, sufixo `*`).

#### Passo 1 — Tokenizer (regex de captura)

```typescript
/** Captura cada tag inline; grupos: (1) tagName (2) corpo até '}' */
const FIVEE_TAG_PATTERN =
  /\{@([a-zA-Z0-9]+)\s+([^}]*)\}|\{@([a-zA-Z0-9]+)\}/g;
```

Para corpo com pipes, parse adicional:

```typescript
/** Split do corpo da tag respeitando pipes (não escaped) */
function splitTagPayload(raw: string): string[] {
  return raw.split('|').map((s) => s.trim());
}
```

#### Passo 2 — Regex por família (substituição mecânica)

```typescript
// Dano / dados — extrair expressão
/\{@damage\s+([^}|]+)(?:\|[^}]*)?\}/gi        → '$1'
/\{@dice\s+([^}|]+)(?:\|([^}|]+))?(?:\|[^}]*)?\}/gi  → '$2' ?? '$1'

// Condição / status — primeiro segmento
/\{@condition\s+([^|}\s]+)(?:\|[^}]*)?\}/gi  → '$1'
/\{@status\s+([^|}\s]+)(?:\|[^}]*)?\}/gi      → '$1'

// Referências — manter nome display (1º segmento ou 3º se existir)
/\{@spell\s+([^|}]+)(?:\|[^|}]*)?(?:\|([^}]+))?\}/gi → '$2' ?? '$1'
/\{@item\s+([^|}]+)(?:\|[^|}]*)?(?:\|([^}]+))?\}/gi  → '$2' ?? '$1'
/\{@creature\s+([^|}]+)(?:\|[^|}]*)?(?:\|([^}]+))?\}/gi → '$2' ?? '$1'

// Ataque bestiário
/\{@hit\s+([^}]+)\}/gi                         → '+$1' (normalizar sinal)
/\{@h\}/gi                                     → 'Hit: '
/\{@atk\s+([^}]+)\}/gi                         → mapAtkCodes('$1') // mw→Melee Weapon

// Formatação — strip wrapper
/\{@(?:b|bold|i|italic)\s+([^}]+)\}/gi       → '$1'

// Scaling (preservar ou parse estruturado)
/\{@scaledamage\s+([^|}]+)\|([^|}]+)\|([^}]+)\}/gi
```

#### Passo 3 — Estratégia recomendada (2 camadas)

1. **`plainText`** — texto corrido para busca/UI (tags mecânicas resolvidas, refs como nome simples).
2. **`richRefs[]`** — grafo `{ kind, name, source?, display? }` extraído das tags `{@spell}`, `{@item}`, `{@creature}` para linking no Compendium.

Evitar regex-only para `entries` aninhados (`EntryObject[]`); usar walker recursivo JSON.

---

## 2. Relacionamento com o Repositório IMG (Os Assets)

### 2.1 Princípio: JSON **não** embute binários

Stats e lore ficam no **src**; imagens/tokens ficam no **img**. A ligação é:

1. **Flags no registro principal** — `hasFluff`, `hasFluffImages`, `hasToken`.
2. **Arquivo fluff sidecar** — `fluff-spells-phb.json`, `fluff-bestiary-mm.json`, `fluff-items.json` (global ou por source).
3. **Objeto `href` dentro de `images[]`** — caminho relativo ao root do repo img.

Exemplo real (`fluff-spells-phb.json`):

```json
{
  "name": "Fireball",
  "source": "PHB",
  "images": [{
    "type": "image",
    "href": { "type": "internal", "path": "spells/PHB/Fireball.webp" },
    "width": 449,
    "height": 1000
  }]
}
```

Exemplo monstro (`fluff-bestiary-mm.json`):

```json
"href": { "type": "internal", "path": "bestiary/MM/Aarakocra.webp" }
```

Exemplo item (`fluff-items.json`):

```json
"href": { "type": "internal", "path": "items/DMG/Alchemy Jug.webp" }
```

Índice fluff de spells:

```json
// data/spells/fluff-index.json
{ "PHB": "fluff-spells-phb.json", "TCE": "fluff-spells-tce.json", … }
```

### 2.2 Padrões de nomenclatura de path

| Tipo | Path relativo (repo img) | Observação |
|------|--------------------------|------------|
| Spell art | `spells/{SOURCE}/{Spell Name}.webp` | Nem toda magia tem arte; só subset |
| Monster portrait | `bestiary/{SOURCE}/{Monster Name}.webp` | `{SOURCE}` = MM, VGM, XMM… |
| VTT token | `bestiary/tokens/{SOURCE}/{Monster Name}.webp` | `hasToken: true` no JSON |
| Magic item | `items/{SOURCE}/{Item Name}.webp` | |
| Class / cover | `classes/…`, `covers/{SOURCE}.webp` | via `books.json` → `cover.path` |
| Áudio (raro) | `bestiary/{slug}.opus` | ex.: `soundClip.path` no monster |
| Externo (homebrew) | `"type": "external", "url": "https://…"` | não está no repo img oficial |

**Convenções:**

- Separador de pastas `/`; **case-sensitive** no Linux (nomes preservam capitalização do jogo: `Mordenkainen's Sword.webp`).
- Formato predominante: **`.webp`** (tokens sem compressão agressiva; artes ~85% quality).
- `{SOURCE}` no path **coincide** com o campo `source` da entidade (ex.: `PHB`, `MM`, `DMG`), não com slug do arquivo JSON.

### 2.3 Resolução de URL (runtime)

Base configurável (Electron / servidor local):

```text
ASSET_BASE = file:///…/5etools-img/   (offline)
           | https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/
```

URL final:

```text
${ASSET_BASE}${href.path}
→ …/spells/PHB/Fireball.webp
```

Fallback quando `hasFluffImages` mas fluff ausente: token → portrait → `blank.webp` / `blank-friendly.webp` na raiz do img.

### 2.4 Como persistir no MongoDB (design recomendado)

**Não** gravar URL absoluta hardcoded. Gravar referência **estável** + resolver no front:

```typescript
interface CompendiumAssetRef {
  kind: 'internal' | 'external';
  /** Path relativo ao root do 5etools-img (internal) */
  path?: string;
  /** URL completa (external / homebrew) */
  url?: string;
  role: 'portrait' | 'token' | 'spellArt' | 'itemArt' | 'cover' | 'audio';
  width?: number;
  height?: number;
  credit?: string;
}

interface CompendiumMediaBundle {
  portrait?: CompendiumAssetRef;
  token?: CompendiumAssetRef;
  gallery?: CompendiumAssetRef[];
}
```

Documento de entidade (spell / monster / item):

```typescript
{
  _id: "fireball|PHB",           // ou ObjectId + unique index composto
  entityKey: "fireball|PHB",
  source: "PHB",
  name: "Fireball",
  // … campos normalizados …
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

**Índices MongoDB sugeridos:**

- `{ entityKey: 1 }` unique
- `{ source: 1, entityType: 1 }`
- `{ name: 'text', 'search.plainText': 'text' }`
- `{ 'media.token.path': 1 }` sparse (VTT)

**Coleção separada opcional `compendium_assets`** para deduplicar paths compartilhados e cache de hash/blurhash no futuro.

**Offline-first:** no seed Electron, copiar subset de `5etools-img` para `userData/compendium-assets/` e gravar `path` relativo a essa pasta; campo `bundled: true`.

---

## 3. Design da Interface do Parser (TypeScript)

Alinhado ao schema existente (`ISRDSpell`, `IEnemy`, `LogicBlock`) mas **source-agnostic** para 5e.tools.

### 3.1 Tipos RAW (entrada 5e.tools)

```typescript
/** Código de livro — PHB, MM, TCE, XPHB, … */
export type FiveESourceCode = string;

export interface FiveEEntityRef {
  name: string;
  source: FiveESourceCode;
}

/** href de mídia no JSON fluff */
export interface FiveEMediaHref {
  type: 'internal' | 'external';
  path?: string;
  url?: string;
}

export interface FiveEImageBlock {
  type: 'image';
  href: FiveEMediaHref;
  width?: number;
  height?: number;
  credit?: string;
}

/** Bloco genérico de entries (renderer) */
export type FiveEEntry =
  | string
  | FiveEEntryObject
  | FiveEEntryObject[];

export interface FiveEEntryObject {
  type: string;
  name?: string;
  entries?: FiveEEntry;
  [key: string]: unknown;
}

export interface FiveESpellRaw {
  name: string;
  source: FiveESourceCode;
  page?: number;
  level: number;
  school: string;
  time?: Array<{ number: number; unit: string }>;
  range?: Record<string, unknown>;
  components?: { v?: boolean; s?: boolean; m?: string | boolean };
  duration?: Array<Record<string, unknown>>;
  entries?: FiveEEntry;
  entriesHigherLevel?: FiveEEntryObject[];
  scalingLevelDice?: Record<string, unknown>;
  damageInflict?: string[];
  savingThrow?: string[];
  miscTags?: string[];
  areaTags?: string[];
  ritual?: boolean;
  concentration?: boolean;
  srd?: boolean;
  basicRules?: boolean;
  reprintedAs?: string[];
  hasFluff?: boolean;
  hasFluffImages?: boolean;
  [key: string]: unknown;
}

export interface FiveESpellClassEntry {
  name: string;
  source: FiveESourceCode;
}

/** Trecho de data/spells/sources.json */
export type FiveESpellSourcesMap = Record<
  FiveESourceCode,
  Record<string, { class?: FiveESpellClassEntry[]; [key: string]: unknown }>
>;

export interface FiveESpellFluffRaw {
  name: string;
  source: FiveESourceCode;
  entries?: FiveEEntry;
  images?: FiveEImageBlock[];
}

export interface FiveEClassRaw {
  name: string;
  source: FiveESourceCode;
  page?: number;
  edition?: 'classic' | 'one' | string;
  hd?: { number: number; faces: number };
  proficiency?: string[];
  spellcastingAbility?: string;
  casterProgression?: 'full' | 'half' | 'third' | 'none' | string;
  classFeatures?: Array<string | Record<string, unknown>>;
  startingEquipment?: Record<string, unknown>;
  hasFluff?: boolean;
  hasFluffImages?: boolean;
  [key: string]: unknown;
}

export interface FiveEMonsterRaw {
  name: string;
  source: FiveESourceCode;
  page?: number;
  size?: string[];
  type?: Record<string, unknown> | string;
  ac?: Array<number | Record<string, unknown>>;
  hp?: { average?: number; formula?: string };
  speed?: Record<string, number | string>;
  str: number; dex: number; con: number; int: number; wis: number; cha: number;
  cr?: string | number | Record<string, unknown>;
  trait?: FiveEEntryObject[];
  action?: FiveEEntryObject[];
  bonus?: FiveEEntryObject[];
  reaction?: FiveEEntryObject[];
  legendary?: FiveEEntryObject[];
  hasToken?: boolean;
  hasFluff?: boolean;
  hasFluffImages?: boolean;
  [key: string]: unknown;
}
```

### 3.2 Tipos normalizados (saída Master Compendium)

```typescript
import type { LogicBlock } from '../types/domain/logic-block';

export type CompendiumEntityType =
  | 'spell'
  | 'monster'
  | 'item'
  | 'class'
  | 'subclass'
  | 'feat'
  | 'race';

export interface ParsedInlineTag {
  tag: string;
  raw: string;
  segments: string[];
  displayText: string;
  ref?: {
    kind: CompendiumEntityType | 'condition' | 'skill' | 'damage' | 'dice' | 'unknown';
    name?: string;
    source?: string;
  };
}

export interface SanitizedText {
  plainText: string;
  markdown?: string;
  tags: ParsedInlineTag[];
}

export interface CompendiumAssetRef {
  kind: 'internal' | 'external';
  path?: string;
  url?: string;
  role: 'portrait' | 'token' | 'spellArt' | 'itemArt' | 'cover' | 'audio';
  width?: number;
  height?: number;
  credit?: string;
}

export interface MasterSpell {
  id: string;
  entityKey: string;
  index: string;
  name: string;
  source: string;
  page?: number;
  level: number;
  school: string;
  schoolLabel: string;
  castingTime: string;
  range: string;
  duration: string;
  ritual: boolean;
  concentration: boolean;
  components: string[];
  material?: string;
  description: string;
  higherLevel?: string;
  classes: string[];
  damageFormula?: string;
  damageType?: string;
  saveType?: string;
  search: SanitizedText;
  media?: { spellArt?: CompendiumAssetRef; gallery?: CompendiumAssetRef[] };
  logicBlock: LogicBlock;
  provenance: CompendiumProvenance;
  sourceFlags: { srd?: boolean; basicRules?: boolean; edition?: string };
  reprintedAs?: string[];
}

export interface MasterMonster {
  id: string;
  entityKey: string;
  name: string;
  source: string;
  cr: string;
  ac: number;
  hpAverage?: number;
  hpFormula?: string;
  abilities: Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>;
  traits: Array<{ name: string; description: string; search: SanitizedText }>;
  actions: Array<{ name: string; description: string; attacks?: NormalizedAttack[]; search: SanitizedText }>;
  media?: { portrait?: CompendiumAssetRef; token?: CompendiumAssetRef };
  provenance: CompendiumProvenance;
}

export interface CompendiumProvenance {
  provider: '5etools';
  dataPath: string;
  fluffPath?: string;
  sourceFile: string;
  ingestedAt: string;
  version?: string;
}

export interface NormalizedAttack {
  toHit?: number;
  reach?: string;
  range?: string;
  damage?: Array<{ formula: string; type: string; average?: number }>;
  save?: string;
}
```

### 3.3 Opções e resultados do parser

```typescript
export interface FiveEToolsSanitizerOptions {
  /** defaultSource aplicado quando tag omite |SOURCE| */
  defaultSource?: string;
  /** 'plain' | 'markdown' | 'both' */
  outputFormat?: 'plain' | 'markdown' | 'both';
  /** Extrair refs estruturadas além do texto */
  extractRefs?: boolean;
  /** Mapa tag → handler custom */
  tagHandlers?: Partial<Record<string, FiveETagHandler>>;
}

export type FiveETagHandler = (
  tag: string,
  segments: string[],
  raw: string,
  ctx: FiveETagContext,
) => SanitizedText | string;

export interface FiveETagContext {
  defaultSource: string;
  entityType?: CompendiumEntityType;
}

export interface ParseEntriesResult {
  blocks: Array<{ type: string; name?: string; body: SanitizedText }>;
  merged: SanitizedText;
}
```

### 3.4 Assinatura da classe `FiveEToolsSanitizer`

```typescript
export class FiveEToolsSanitizer {
  constructor(options?: FiveEToolsSanitizerOptions);

  /** Regex tokenizer + dispatch por tag */
  parseInlineTags(input: string, ctx?: FiveETagContext): SanitizedText;

  /** Walker recursivo para string | EntryObject | arrays */
  parseEntries(entries: FiveEEntry | undefined, ctx?: FiveETagContext): ParseEntriesResult;

  /** Atalhos mecânicos */
  stripDamageTags(text: string): string;
  stripDiceTags(text: string): string;
  stripConditionTags(text: string): string;
  stripFormattingTags(text: string): string;

  /** Converte códigos bestiário */
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

/** Orquestrador de alto nível (sem I/O — só transformação) */
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

  /** Normaliza chave para mapas fluff/sources */
  static entityMapKey(name: string, source: string): string;
}
```

### 3.5 Mapeamento → schema atual do app

| Campo 5e.tools | Campo interno atual | Notas |
|----------------|---------------------|-------|
| `name` + `source` | `id`, `index` | gerar slug estável |
| `entries` sanitizado | `description` | `ISRDSpell.description` |
| `entriesHigherLevel` | `higherLevel` | |
| `school` code | `school` label | tabela de conversão |
| join `sources.json` | `classes[]` | **obrigatório** |
| `damageInflict[0]` | `damageType` | preferir tags/`scalingLevelDice` se presente |
| `savingThrow[0]` | `saveType` | |
| fluff `images[0]` | novo `media.spellArt` | extensão além do SRD API |
| — | `logicBlock` | gerar via `buildLogicBlock()` + RuleEngine |
| — | `source: '5etools'` | distinguir de `'dnd5eapi'` |

---

## Próximos passos (fora deste documento)

1. Validar estas interfaces em `webapp/src/services/compendium/fiveETools/` (somente types + sanitizer unit tests).
2. Definir **subset de ingestão** (ex.: PHB + MM + TCE + XPHB) vs corpus completo (~GB img).
3. Script seed: clone espelhado → parse → bulkWrite MongoDB → sync assets locais Electron.
4. Estender `ISRDCatalog` ou nova coleção `masterCompendium` com flag de proveniência.

---

## Referências

- [5etools-src — data/spells](https://github.com/5etools-mirror-3/5etools-src/tree/main/data/spells)
- [5etools-src — data/class](https://github.com/5etools-mirror-3/5etools-src/tree/main/data/class)
- [5etools-img](https://github.com/5etools-mirror-3/5etools-img)
- [Renderer Demo (tag syntax)](https://5etools.vercel.app/renderdemo.html)
- [5e-tools-tags — lista de tags](https://github.com/Jklein64/5e-tools-tags)
- Schema interno atual: `webapp/src/types/srd.ts`, `webapp/src/types/domain/logic-block.ts`
