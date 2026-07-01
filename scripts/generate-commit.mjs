#!/usr/bin/env node
/**
 * Generates a PR-style message from git diff + docs/PR_TEMPLATE.md
 * Output: docs/LAST_COMMIT_MSG.txt
 *
 * Env:
 *   OPENAI_API_KEY   — optional; enables LLM fill
 *   OPENAI_MODEL     — default gpt-4o-mini
 *   GIT_BASE_BRANCH  — default main (diff when working tree clean)
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = join(ROOT, 'docs', 'LAST_COMMIT_MSG.txt');
const TEMPLATE_FILE = join(ROOT, 'docs', 'PR_TEMPLATE.md');
const MAX_DIFF_CHARS = 64_000;
const BASE_BRANCH = process.env.GIT_BASE_BRANCH || 'main';

const TECH_LEAD_INSTRUCTION = `Atue como um Tech Lead. Com base neste DIFF do git, preencha o JSON abaixo com conteúdo real e específico (não deixe strings vazias).
- "summary": uma frase do que o PR entrega
- "patchNotes": array de bullets em linguagem amigável para Mestres de D&D (português OK)
- "testSteps": array de itens de checklist markdown (- [ ] ...)
- "area": áreas afetadas (battle, api, types, docs, etc.)
- "technicalChanges": array de bullets técnicos (arquitetura, TypeScript, API, hooks)
- "dataModelImpact": bloco markdown com checkboxes [x] ou [ ] conforme o diff
- "filesTouched": array de paths importantes (máx 25, depois "… +N more")
Responda APENAS JSON válido, sem markdown fence.`;

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
  } catch {
    return '';
  }
}

function branchExists(name) {
  return Boolean(run(`git rev-parse --verify ${name}`));
}

function countFilesInBundle(bundle) {
  const fromStat = parseStatCount(bundle.stat);
  const fromNames = parseNameStatus(bundle.nameStatus).length;
  return Math.max(fromStat, fromNames, bundle.untracked?.length ?? 0);
}

function getDiffBundle() {
  const useBranchOnly = process.argv.includes('--branch') || process.env.COMMIT_AI_USE_BRANCH === '1';
  const useLocalOnly = process.argv.includes('--local');

  const staged = run('git diff --cached');
  if (staged && !useBranchOnly) {
    return {
      diff: staged,
      stat: run('git diff --cached --stat'),
      nameStatus: run('git diff --cached --name-status'),
      mode: 'staged',
      untracked: [],
    };
  }

  const unstaged = run('git diff');
  const untracked = run('git ls-files --others --exclude-standard');
  const untrackedList = untracked ? untracked.split('\n').filter(Boolean) : [];

  const localBundle = {
    diff: unstaged,
    stat: run('git diff --stat') || (untrackedList.length ? `${untrackedList.length} untracked file(s)` : ''),
    nameStatus: run('git diff --name-status') + (untrackedList.length ? '\n' + untrackedList.map((f) => `A\t${f}`).join('\n') : ''),
    mode: unstaged ? 'unstaged' : untrackedList.length ? 'untracked' : 'none',
    untracked: untrackedList,
  };

  const base = branchExists(BASE_BRANCH) ? BASE_BRANCH : branchExists('master') ? 'master' : null;
  const branchBundle = base
    ? {
        diff: run(`git diff ${base}...HEAD`),
        stat: run(`git diff ${base}...HEAD --stat`),
        nameStatus: run(`git diff ${base}...HEAD --name-status`),
        mode: `branch vs ${base}`,
        untracked: [],
      }
    : null;

  if (useLocalOnly && (localBundle.diff || localBundle.untracked.length)) {
    return localBundle;
  }

  if (useBranchOnly && branchBundle?.diff) {
    return branchBundle;
  }

  const localCount = countFilesInBundle(localBundle);
  const branchCount = branchBundle ? countFilesInBundle(branchBundle) : 0;

  if (branchBundle?.diff && (localCount === 0 || branchCount > localCount)) {
    if (localCount > 0 && branchCount > localCount) {
      console.log(`Using branch diff (${branchCount} files vs ${localCount} unstaged). Pass --local for unstaged only.`);
    }
    return branchBundle;
  }

  if (localBundle.diff || localBundle.untracked.length) {
    return localBundle;
  }

  if (branchBundle?.diff) return branchBundle;

  return { diff: '', stat: '', nameStatus: '', mode: 'none', untracked: [] };
}

function truncate(text, max) {
  if (!text || text.length <= max) return text || '';
  return `${text.slice(0, max)}\n\n… [diff truncated — ${text.length - max} chars omitted]`;
}

function parseNameStatus(nameStatus) {
  const files = [];
  for (const line of nameStatus.split('\n').filter(Boolean)) {
    const parts = line.split('\t');
    const status = parts[0];
    if (status.startsWith('R') || status.startsWith('C')) {
      files.push({ status, path: parts[2], from: parts[1] });
    } else {
      files.push({ status, path: parts[1] });
    }
  }
  return files;
}

function parseStatCount(stat) {
  const m = stat.match(/(\d+) files? changed/);
  return m ? parseInt(m[1], 10) : 0;
}

function inferAreas(filePaths) {
  const areas = new Set();
  for (const f of filePaths) {
    if (f.includes('features/battle')) areas.add('battle');
    if (f.includes('features/inventory')) areas.add('inventory');
    if (f.includes('features/bestiary')) areas.add('bestiary');
    if (f.includes('features/campaign')) areas.add('campaign');
    if (f.includes('features/auth')) areas.add('auth');
    if (f.startsWith('api/')) areas.add('api');
    if (f.includes('/types/')) areas.add('types');
    if (f.startsWith('docs/') || f === '.cursorrules') areas.add('docs');
    if (f.includes('shared/utils/combatUtils')) areas.add('combat');
    if (f.startsWith('scripts/')) areas.add('tooling');
  }
  return [...areas];
}

function analyzeDiffHeuristic({ diff, stat, nameStatus, mode, branch }) {
  const entries = parseNameStatus(nameStatus);
  const paths = entries.map((e) => e.path).filter(Boolean);
  const fileCount = parseStatCount(stat) || paths.length;
  const areas = inferAreas(paths);

  const added = entries.filter((e) => e.status === 'A').length;
  const deleted = entries.filter((e) => e.status === 'D').length;
  const renamed = entries.filter((e) => e.status.startsWith('R')).length;
  const modified = entries.filter((e) => e.status === 'M').length;

  const hasTs = paths.some((p) => p.endsWith('.ts') || p.endsWith('.tsx'));
  const hasApi = paths.some((p) => p.startsWith('api/'));
  const hasBattle = paths.some((p) => p.includes('features/battle'));
  const hasTypes = paths.some((p) => p.includes('types/index'));
  const hasDocs = paths.some((p) => p.startsWith('docs/') || p === '.cursorrules');
  const hasScripts = paths.some((p) => p.startsWith('scripts/'));
  const removedGodComponent = paths.some((p) => p.includes('PlayerManager.jsx') && entries.find((e) => e.path === p)?.status === 'D');
  const hasSubclass = paths.some((p) => p.includes('SubclassManager'));
  const hasMigration = paths.some((p) => p.includes('migrationUtils'));
  const hasAuth = paths.some((p) => p.includes('auth/') || p.includes('routes/auth'));

  const patchNotes = [];
  const technical = [];

  if (hasApi && hasAuth) {
    patchNotes.push('Campanhas agora são salvas no servidor com login por usuário — suas mesas persistem entre sessões e dispositivos.');
    technical.push('API Express + MongoDB: rotas `auth` (JWT) e `campaigns` (CRUD + auto-save de `CampaignData`).');
  }
  if (hasBattle) {
    patchNotes.push('Tela de Party/Combate reorganizada: cards de jogadores e inimigos mais estáveis, com modo batalha, VTT e resolução de ataques.');
    technical.push('Refatoração `PlayerManager` → `features/battle/` (hooks `usePartyState`/`useCombatState` + componentes `PlayerCard`, `EnemyCard`, modais).');
    technical.push('Correção de runtime: estado visual de dropdown CC movido para os cards (não mais em hooks de combate).');
  }
  if (hasSubclass) {
    patchNotes.push('Subclasses homebrew editáveis com resistências, traços passivos e habilidades usáveis em combate.');
    technical.push('`SubclassManager` + `ISubclass` em `types/index.ts`; integração com `combatUtils` para modificadores de dano.');
  }
  if (hasMigration) {
    patchNotes.push('Importação de saves JSON antigos com normalização automática de jogadores, buffs e inimigos.');
    technical.push('`shared/utils/migrationUtils.ts` + fluxo de import em `CampaignList`.');
  }
  if (hasTs) {
    patchNotes.push('Base do app migrada para TypeScript — menos erros silenciosos ao carregar a campanha.');
    technical.push('Migração JS → TS/TSX; `tsconfig.app.json`; tipos canônicos em `webapp/src/types/index.ts`.');
  }
  if (paths.some((p) => p.includes('partyUtils') || p.includes('usePartyState'))) {
    patchNotes.push('Mestre pode definir nível individual ou do grupo inteiro; o XP é ajustado automaticamente nos thresholds D&D 5e.');
    technical.push('`setLevel` / `setPartyLevel` em `usePartyState`; thresholds em `partyUtils.ts`.');
  }
  if (hasDocs) {
    patchNotes.push('Documentação e regras para colaboração humano + IA (README, changelog de agentes, template de PR).');
    technical.push('`.cursorrules`, `docs/CHANGELOG_AI.md`, `docs/PR_TEMPLATE.md`, README profissional.');
  }
  if (hasScripts) {
    technical.push('Pipeline `npm run commit:ai` → `docs/LAST_COMMIT_MSG.txt` para mensagens de commit/PR.');
  }
  if (removedGodComponent) {
    technical.push('Removido monólito `PlayerManager.jsx` (~4.3k linhas) em favor da estrutura feature-driven.');
  }

  if (patchNotes.length === 0) {
    patchNotes.push(`Atualização em ${fileCount} arquivo(s) — revise o diff para impacto na mesa.`);
  }
  if (technical.length === 0) {
    technical.push(`Alterações em: ${areas.join(', ') || 'geral'}.`);
  }

  technical.push(`Diff: ${fileCount} files — ${added} added, ${modified} modified, ${deleted} deleted, ${renamed} renamed (${mode} on \`${branch}\`).`);

  const schemaChanged = paths.some((p) => p.includes('CampaignData') || p.includes('defaultData') || p.includes('types/index'));
  const dataModelImpact = schemaChanged
    ? `- [ ] No schema changes\n- [x] \`IAppData\` / MongoDB fields changed — players, equipment, subclasses, buffsDatabase, library, etc.\n- [x] Migration or \`migrationUtils\` update required`
    : `- [x] No schema changes\n- [ ] \`IAppData\` / MongoDB fields changed — list fields:\n- [ ] Migration or \`migrationUtils\` update required`;

  const testSteps = [
    '- [ ] Login e lista de campanhas carregam',
    '- [ ] Abrir campanha → Party Roster renderiza sem tela branca',
    '- [ ] Modo batalha: adicionar inimigo e resolver um ataque',
  ];
  if (hasSubclass) testSteps.push('- [ ] Criar/editar subclasse e equipar em um jogador');
  if (hasApi) testSteps.push('- [ ] Auto-save persiste após editar HP de um jogador');

  const filesTouched = paths.slice(0, 25).map((p) => `- \`${p}\``);
  if (paths.length > 25) filesTouched.push(`- … +${paths.length - 25} more files`);

  const verification = [
    '- [x] `npm run build --prefix webapp`',
    '- [x] `npx tsc -b --prefix webapp`',
    '- [ ] `npm run dev --prefix api` + smoke test manual',
    '- [x] Entry added to `docs/CHANGELOG_AI.md`',
  ];

  const typeLabel = hasApi && hasBattle ? 'feat' : hasDocs && !hasBattle ? 'docs' : 'refactor';
  const summary = `${typeLabel}: RPG Party Manager v1.1 — TypeScript, API MongoDB, feature-driven battle module (${fileCount} files)`;

  return {
    summary,
    patchNotes,
    testSteps,
    area: areas.join(', ') || 'general',
    technicalChanges: technical,
    dataModelImpact,
    filesTouched,
    verification,
  };
}

function fillTemplate(template, data) {
  const toBullets = (arr) => (Array.isArray(arr) ? arr.map((l) => (l.startsWith('-') ? l : `- ${l}`)).join('\n') : String(arr));
  const toLines = (arr) => (Array.isArray(arr) ? arr.join('\n') : String(arr));

  return template
    .replace('{{SUMMARY}}', data.summary || '_No summary_')
    .replace('{{PATCH_NOTES}}', toBullets(data.patchNotes))
    .replace('{{TEST_STEPS}}', toLines(data.testSteps))
    .replace('{{AREA}}', data.area || 'general')
    .replace('{{TECHNICAL_CHANGES}}', toBullets(data.technicalChanges))
    .replace('{{DATA_MODEL_IMPACT}}', data.dataModelImpact || '- [ ] No schema changes')
    .replace('{{FILES_TOUCHED}}', toLines(data.filesTouched))
    .replace('{{VERIFICATION}}', toLines(data.verification));
}

async function callLLM({ diff, stat, nameStatus, branch, template }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const userPayload = `${TECH_LEAD_INSTRUCTION}

Template structure (placeholders you must fill via JSON keys):
- summary → {{SUMMARY}}
- patchNotes → {{PATCH_NOTES}}
- testSteps → {{TEST_STEPS}}
- area → {{AREA}}
- technicalChanges → {{TECHNICAL_CHANGES}}
- dataModelImpact → {{DATA_MODEL_IMPACT}} (markdown checkboxes)
- filesTouched → {{FILES_TOUCHED}} (array of markdown list lines with file paths)
- verification → {{VERIFICATION}} (checkbox list)

Branch: ${branch}
Stat:
${stat}

Name-status:
${truncate(nameStatus, 12_000)}

Diff:
${truncate(diff, MAX_DIFF_CHARS)}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a Tech Lead for a D&D 5e homebrew DM tool. Output only valid JSON with the requested keys. Patch notes in Portuguese for DMs. Technical details in clear English or Portuguese.',
        },
        { role: 'user', content: userPayload },
      ],
    }),
  });

  if (!res.ok) {
    console.warn(`OpenAI API error (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return null;
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed.filesTouched && Array.isArray(parsed.filesTouched)) {
      parsed.filesTouched = parsed.filesTouched.map((f) => {
        const path = String(f).replace(/^-\s*|`/g, '').trim();
        return f.startsWith('-') ? f : `- \`${path}\``;
      });
    }
    return parsed;
  } catch (e) {
    console.warn('Failed to parse LLM JSON:', e.message);
    return null;
  }
}

async function main() {
  const template = readFileSync(TEMPLATE_FILE, 'utf8');
  const branch = run('git branch --show-current') || 'unknown';
  const bundle = getDiffBundle();

  if (!bundle.diff && !bundle.nameStatus && bundle.untracked.length === 0) {
    console.error('Nothing to describe. Make changes or ensure branch diverges from', BASE_BRANCH);
    process.exit(1);
  }

  console.log(`Analyzing diff (${bundle.mode}) on branch "${branch}"…`);

  let data = await callLLM({ ...bundle, branch, template });
  if (data) {
    console.log('LLM draft generated via OpenAI.');
  } else {
    if (!process.env.OPENAI_API_KEY) {
      console.log('No OPENAI_API_KEY — using diff analyzer (heuristic). Set key for LLM output.');
    }
    data = analyzeDiffHeuristic({ ...bundle, branch });
  }

  const body = fillTemplate(template, data);
  mkdirSync(join(ROOT, 'docs'), { recursive: true });
  writeFileSync(OUT_FILE, `${body.trim()}\n`, 'utf8');

  console.log(`\nWrote ${relative(ROOT, OUT_FILE)}`);
  console.log(`  Summary: ${data.summary}`);
  console.log(`  Patch notes: ${data.patchNotes?.length ?? 0} bullets`);
  console.log(`  Technical: ${data.technicalChanges?.length ?? 0} bullets`);
  console.log('\nReview, then: git commit -F docs/LAST_COMMIT_MSG.txt');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
