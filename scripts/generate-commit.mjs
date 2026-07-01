#!/usr/bin/env node
/**
 * Generates a PR-style commit message from the current git diff.
 * Output: docs/LAST_COMMIT_MSG.txt (review before committing)
 *
 * Optional: set OPENAI_API_KEY (+ OPENAI_MODEL, default gpt-4o-mini) for LLM draft.
 * Without a key, produces a structured heuristic draft from the diff.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = join(ROOT, 'docs', 'LAST_COMMIT_MSG.txt');
const TEMPLATE_FILE = join(ROOT, 'docs', 'PR_TEMPLATE.md');
const MAX_DIFF_CHARS = 48_000;

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 }).trim();
  } catch {
    return '';
  }
}

function getDiffBundle() {
  const staged = run('git diff --cached');
  const unstaged = run('git diff');
  const stagedStat = run('git diff --cached --stat');
  const unstagedStat = run('git diff --stat');
  const untracked = run('git ls-files --others --exclude-standard');

  let diff = '';
  let stat = '';
  let mode = 'none';

  if (staged) {
    diff = staged;
    stat = stagedStat;
    mode = 'staged';
  } else if (unstaged) {
    diff = unstaged;
    stat = unstagedStat;
    mode = 'unstaged';
  } else {
    diff = run('git diff HEAD');
    stat = run('git diff HEAD --stat');
    mode = diff ? 'head' : 'none';
  }

  return { diff, stat, mode, untracked: untracked ? untracked.split('\n').filter(Boolean) : [] };
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n… [diff truncated — ${text.length - max} chars omitted]`;
}

function inferArea(filePaths) {
  const areas = new Set();
  for (const f of filePaths) {
    if (f.includes('features/battle')) areas.add('battle');
    else if (f.includes('features/inventory')) areas.add('inventory');
    else if (f.includes('features/bestiary')) areas.add('bestiary');
    else if (f.includes('features/campaign')) areas.add('campaign');
    else if (f.includes('features/auth')) areas.add('auth');
    else if (f.startsWith('api/')) areas.add('api');
    else if (f.includes('types/')) areas.add('types');
    else if (f.startsWith('docs/')) areas.add('docs');
    else if (f.includes('shared/utils/combatUtils')) areas.add('combat');
    else if (f.includes('webapp/')) areas.add('webapp');
  }
  return [...areas].join(', ') || 'general';
}

function parseChangedFiles(stat, untracked) {
  const fromStat = stat
    .split('\n')
    .slice(0, -1)
    .map((line) => line.replace(/\s+\|\s+\d+.*$/, '').trim())
    .filter(Boolean);
  return [...new Set([...fromStat, ...untracked])];
}

function inferCommitType(files) {
  if (files.some((f) => f.startsWith('docs/') || f === '.cursorrules')) return 'docs';
  if (files.some((f) => f.includes('test'))) return 'test';
  if (files.some((f) => f.startsWith('scripts/'))) return 'chore';
  if (files.some((f) => f.startsWith('api/'))) return 'feat';
  return 'feat';
}

function buildHeuristicDraft({ diff, stat, mode, untracked, branch, template }) {
  const files = parseChangedFiles(stat, untracked);
  const area = inferArea(files);
  const type = inferCommitType(files);
  const titleHint = files.length === 1
    ? `${type}: update ${relative(ROOT, files[0]).replace(/\\/g, '/')}`
    : `${type}: update ${area} (${files.length} files)`;

  const fileList = files.map((f) => `- \`${f}\``).join('\n') || '- _(no file list — empty diff?)_';
  const diffPreview = diff
    ? truncate(diff, 4_000)
    : untracked.length
      ? `_(no textual diff; ${untracked.length} untracked file(s))_`
      : '_(empty diff)_';

  const patchHint = files.some((f) => f.includes('features/') && !f.includes('docs'))
    ? '- Review changed UI/features and describe what DMs will notice at the table.'
    : '- Documentation or tooling change — note if players/DMs see anything new.';

  return `## Summary

${titleHint}

_Source: heuristic draft (${mode} changes on \`${branch}\`). Set OPENAI_API_KEY for an LLM-generated version._

---

### 🎮 Patch Notes

${patchHint}

- 
- 

**How to test at the table:**

- [ ] Open a campaign and verify party roster loads
- [ ] 
- [ ] 

---

### 🛠️ Technical Details

**Area:** ${area}

**Changes:**

${files.slice(0, 12).map((f) => `- \`${f}\``).join('\n') || '- '}
${files.length > 12 ? `- … and ${files.length - 12} more file(s)` : ''}

**Data model impact:**

- [ ] No schema changes
- [ ] \`IAppData\` / MongoDB fields changed — list fields:
- [ ] Migration or \`migrationUtils\` update required

**Files touched:**

${fileList}

**Diff preview (for review / paste into Cursor):**

\`\`\`diff
${diffPreview}
\`\`\`

**Verification:**

- [ ] \`npm run build --prefix webapp\`
- [ ] \`npx tsc -b --prefix webapp\` (if types changed)
- [ ] \`npm run dev --prefix api\` + manual smoke test
- [ ] Entry added to \`docs/CHANGELOG_AI.md\`

---

<!-- Template reference preserved below -->

${template.trim()}
`;
}

async function callOpenAI({ diff, stat, branch, template }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const system = `You write PR descriptions for "RPG Party Manager", a D&D 5e homebrew DM tool.
Follow the user's template exactly. You MUST include both sections:
- "### 🎮 Patch Notes" (plain language for DMs; Portuguese is OK)
- "### 🛠️ Technical Details" (for developers: architecture, files, data model)
Fill in concrete bullets from the diff. Output markdown only — no outer code fences.`;

  const user = `Template to follow:

${template}

---

Git branch: ${branch}
Diff stat:
${stat || '(no stat)'}

Git diff:
${truncate(diff || '(empty diff)', MAX_DIFF_CHARS)}

Generate the complete PR description. Start with "## Summary" and one sentence.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn(`OpenAI API error (${res.status}): ${err.slice(0, 200)}`);
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function main() {
  const { diff, stat, mode, untracked } = getDiffBundle();
  const branch = run('git branch --show-current') || 'unknown';
  const template = readFileSync(TEMPLATE_FILE, 'utf8');

  if (!diff && untracked.length === 0) {
    console.error('Nothing to describe. Stage changes first: git add -A');
    process.exit(1);
  }

  console.log(`Collecting diff (${mode}) on branch "${branch}"…`);

  let body = await callOpenAI({ diff, stat, branch, template });
  if (body) {
    console.log('LLM draft generated via OpenAI.');
  } else {
    if (!process.env.OPENAI_API_KEY) {
      console.log('No OPENAI_API_KEY — using heuristic draft. Set the key for LLM output.');
    }
    body = buildHeuristicDraft({ diff, stat, mode, untracked, branch, template });
  }

  mkdirSync(join(ROOT, 'docs'), { recursive: true });
  writeFileSync(OUT_FILE, `${body.trim()}\n`, 'utf8');

  console.log(`\nWrote ${relative(ROOT, OUT_FILE)}`);
  console.log('Review the file, then commit with:');
  console.log('  git commit -F docs/LAST_COMMIT_MSG.txt');
  console.log('Or copy sections into: gh pr create --body-file docs/LAST_COMMIT_MSG.txt');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
