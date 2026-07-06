import { readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import os from 'node:os';
import dotenv from 'dotenv';
import { FileSystemDocumentStore } from '../services/persistence/FileSystemDocumentStore.js';
import { DOCUMENT_COLLECTIONS } from '../services/persistence/IDocumentStore.js';

import { FiveEToolsSanitizer } from '../services/compendium/fiveETools/sanitizer.js';
import {
  FiveEToolsSpellAdapter,
  resolveSpellClassesFromSources,
} from '../services/compendium/fiveETools/spellAdapter.js';
import { FiveEToolsMonsterAdapter } from '../services/compendium/fiveETools/monsterAdapter.js';
import { FiveEToolsClassAdapter } from '../services/compendium/fiveETools/classAdapter.js';
import { FiveEToolsRaceAdapter } from '../services/compendium/fiveETools/raceAdapter.js';
import { FiveEToolsItemAdapter } from '../services/compendium/fiveETools/itemAdapter.js';
import { FIVEE_SPELL_SCHOOL_LABELS } from '../services/compendium/fiveETools/schoolLabels.js';
import type {
  FiveESpellFile,
  FiveESpellRaw,
  FiveESpellSourcesMap,
  MasterSpell,
  MasterMonster,
  MasterClass,
  MasterRace,
  MasterItem,
} from '../services/compendium/fiveETools/types.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const WEBAPP_ROOT = resolve(__dirname, '../..');
const REPO_ROOT = resolve(WEBAPP_ROOT, '..');

dotenv.config({ path: resolve(REPO_ROOT, 'api/.env'), override: true });
dotenv.config({ override: true });

const PHB_SOURCE = 'PHB';

function getBasePath(): string {
  const packageJson = JSON.parse(readFileSync(resolve(WEBAPP_ROOT, 'package.json'), 'utf8'));
  const appName = packageJson.name;
  const appData = process.env.APPDATA || resolve(os.homedir(), 'AppData', 'Roaming');
  return resolve(appData, appName, 'documents');
}

function getStore(): FileSystemDocumentStore {
  return new FileSystemDocumentStore({ basePath: getBasePath(), prettyPrint: false });
}

function flushCollection(collection: string) {
  const storePath = resolve(getBasePath(), collection);
  try {
    if (existsSync(storePath)) {
      rmSync(storePath, { recursive: true, force: true });
      console.log(`[Flush] Cleared existing documents in ${collection}`);
    }
  } catch (err) {
    console.error(`[Flush] Failed to clear ${collection}:`, err);
  }
}

function getSpellsDataDir(): string {
  const configured = process.env.FIVEETOOLS_SPELLS_DIR;
  if (configured) return resolve(configured);

  return resolve(REPO_ROOT, 'vendor/5etools-src/data/spells');
}

function getBestiaryDataDir(): string {
  return resolve(REPO_ROOT, 'vendor/5etools-src/data/bestiary');
}

function getClassDataDir(): string {
  return resolve(REPO_ROOT, 'vendor/5etools-src/data/class');
}

function getRaceDataDir(): string {
  return resolve(REPO_ROOT, 'vendor/5etools-src/data');
}

function getItemsDataDir(): string {
  return resolve(REPO_ROOT, 'vendor/5etools-src/data');
}

function loadJsonFile<T>(filePath: string): T {
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function seedAllSpells(): Promise<void> {
  flushCollection(DOCUMENT_COLLECTIONS.compendiumSpells);
  const spellsDir = getSpellsDataDir();
  const sourcesFile = resolve(spellsDir, 'sources.json');

  console.log('\nMaster Compendium seed — Phase 1 (Spells All Books)');
  const sourcesMap = loadJsonFile<FiveESpellSourcesMap>(sourcesFile);
  
  const sanitizer = new FiveEToolsSanitizer({ defaultSource: PHB_SOURCE, extractRefs: true });
  const adapter = new FiveEToolsSpellAdapter(sanitizer, FIVEE_SPELL_SCHOOL_LABELS);
  const store = getStore();
  let upserted = 0;

  const files = readdirSync(spellsDir, { withFileTypes: true }).filter(
    (f) => f.isFile() && f.name.startsWith('spells-') && f.name.endsWith('.json')
  );

  for (const file of files) {
    const payload = loadJsonFile<FiveESpellFile>(resolve(spellsDir, file.name));
    const spells = payload.spell ?? [];
    for (const raw of spells) {
      try {
        const classList = resolveSpellClassesFromSources(sourcesMap, raw.source, raw.name);
        const master = adapter.toMasterSpell(raw, classList);
        await store.put(DOCUMENT_COLLECTIONS.compendiumSpells, master);
        upserted += 1;
      } catch (err: unknown) {
        console.warn(`  [Warning] Failed to parse spell ${raw.name}:`, err);
      }
    }
  }

  console.log(`  Successfully upserted ${upserted} spells`);
}

async function seedMonsters(): Promise<void> {
  flushCollection(DOCUMENT_COLLECTIONS.compendiumMonsters);
  const dataDir = getBestiaryDataDir();
  console.log('\nMaster Compendium seed — Phase 2 (Monsters All Books)');

  const sanitizer = new FiveEToolsSanitizer({ defaultSource: PHB_SOURCE, extractRefs: true });
  const adapter = new FiveEToolsMonsterAdapter(sanitizer);
  const store = getStore();
  let upserted = 0;

  const files = readdirSync(dataDir, { withFileTypes: true }).filter(
    (f) => f.isFile() && f.name.startsWith('bestiary-') && f.name.endsWith('.json')
  );

  for (const file of files) {
    const payload = loadJsonFile<any>(resolve(dataDir, file.name));
    const monsters = payload.monster ?? [];
    for (const raw of monsters) {
      try {
        const master = adapter.toMasterDocument(raw);
        await store.put(DOCUMENT_COLLECTIONS.compendiumMonsters, master);
        upserted += 1;
      } catch (err: unknown) {
        console.warn(`  [Warning] Failed to parse monster ${raw.name}:`, err);
      }
    }
  }

  console.log(`  Successfully upserted ${upserted} monsters`);
}

async function seedClasses(): Promise<void> {
  flushCollection(DOCUMENT_COLLECTIONS.compendiumClasses);
  flushCollection(DOCUMENT_COLLECTIONS.compendiumSubclasses);
  const dataDir = getClassDataDir();
  console.log('\nMaster Compendium seed — Phase 3 (Classes)');

  const files = readdirSync(dataDir, { withFileTypes: true }).filter(
    (f) => f.name.startsWith('class-') && f.name.endsWith('.json') && !f.name.startsWith('class-sidekick')
  );

  const sanitizer = new FiveEToolsSanitizer({ defaultSource: PHB_SOURCE, extractRefs: true });
  const adapter = new FiveEToolsClassAdapter(sanitizer);
  const store = getStore();
  let upserted = 0;

  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.json')) continue;

    const payload = loadJsonFile<any>(resolve(dataDir, file.name));
    const classes = payload.class ?? [];
    const classFeatures = payload.classFeature ?? [];
    const subclassFeatures = payload.subclassFeature ?? [];
    const subclasses = payload.subclass ?? [];

    for (const raw of classes) {
      raw.subclasses = subclasses.filter((sc: any) => sc.className === raw.name && sc.classSource === raw.source);
      try {
        const { masterClass, masterSubclasses } = adapter.toMasterDocument(raw, classFeatures, subclassFeatures);
        await store.put(DOCUMENT_COLLECTIONS.compendiumClasses, masterClass);
        for (const sc of masterSubclasses) {
           await store.put(DOCUMENT_COLLECTIONS.compendiumSubclasses, sc);
        }
        upserted += 1;
      } catch (err: unknown) {
        console.warn(`  [Warning] Failed to parse class ${raw.name}:`, err);
      }
    }
  }

  console.log(`  Successfully upserted ${upserted} classes from ${files.length} files`);
}

async function seedRaces(): Promise<void> {
  flushCollection(DOCUMENT_COLLECTIONS.compendiumRaces);
  const dataDir = getRaceDataDir();
  const file = resolve(dataDir, 'races.json');
  console.log('\nMaster Compendium seed — Phase 4 (Races)');

  const payload = loadJsonFile<any>(file);
  const races = payload.race ?? [];
  
  const fluffFile = resolve(dataDir, 'fluff-races.json');
  let fluffRaces: any[] = [];
  try {
     const fluffPayload = loadJsonFile<any>(fluffFile);
     fluffRaces = fluffPayload.raceFluff ?? [];
  } catch(e) {}

  console.log(`  Loaded ${races.length} races from races.json and ${fluffRaces.length} fluff records`);
  
  // Merge fluff
  for (const r of races) {
     const fluff = fluffRaces.find(f => f.name === r.name && f.source === r.source);
     if (fluff && fluff.entries) {
        r.entries = r.entries ? [...r.entries, ...fluff.entries] : [...fluff.entries];
     }
  }
  
  const sanitizer = new FiveEToolsSanitizer({ defaultSource: PHB_SOURCE, extractRefs: true });
  const adapter = new FiveEToolsRaceAdapter(sanitizer);
  const store = getStore();
  let upserted = 0;

  for (const raw of races) {
    try {
      const master = adapter.toMasterDocument(raw);
      await store.put(DOCUMENT_COLLECTIONS.compendiumRaces, master);
      upserted += 1;
    } catch (err: unknown) {
      console.warn(`  [Warning] Failed to parse race ${raw.name}:`, err);
    }
  }

  console.log(`  Successfully upserted ${upserted} races`);
}

async function seedItems(): Promise<void> {
  flushCollection(DOCUMENT_COLLECTIONS.compendiumItems);
  const dataDir = getItemsDataDir();
  console.log('\nMaster Compendium seed — Phase 5 (Items)');

  const sanitizer = new FiveEToolsSanitizer({ defaultSource: PHB_SOURCE, extractRefs: true });
  const adapter = new FiveEToolsItemAdapter(sanitizer);
  const store = getStore();
  let upserted = 0;

  const itemFiles = ['items.json', 'items-base.json', 'vehicles.json'];
  
  const rawItemsMap = new Map<string, any>();
  const itemTypeMap = new Map<string, any[]>();
  const allItems: any[] = [];

  for (const filename of itemFiles) {
    const file = resolve(dataDir, filename);
    let payload: any = {};
    try {
      payload = loadJsonFile<any>(file);
    } catch(e) {
      console.warn(`  [Warning] Could not load ${filename}`);
      continue;
    }
    const items = payload.item ?? [];
    const baseitems = payload.baseitem ?? [];
    const vehicles = payload.vehicle ?? [];
    
    if (payload.itemType) {
      for (const it of payload.itemType) {
        if (it.abbreviation && it.entries) {
          itemTypeMap.set(it.abbreviation, it.entries);
        }
      }
    }
    
    const combined = [...items, ...baseitems, ...vehicles];
    console.log(`  Loaded ${combined.length} items from ${filename}`);

    for (const raw of combined) {
      const source = raw.source || PHB_SOURCE;
      const key = `${raw.name}|${source.toUpperCase()}`;
      rawItemsMap.set(key, raw);
      allItems.push(raw);
    }
  }

  function resolveCopy(raw: any, visited = new Set<string>()): any {
    if (!raw || !raw._copy) return raw;

    const copyRef = raw._copy;
    const source = copyRef.source || raw.source || PHB_SOURCE;
    const key = `${copyRef.name}|${source.toUpperCase()}`;
    
    if (visited.has(key)) return raw;
    visited.add(key);

    const baseRaw = rawItemsMap.get(key);
    if (!baseRaw) return raw;

    const resolvedBase = resolveCopy(baseRaw, visited);
    const merged = JSON.parse(JSON.stringify(resolvedBase));

    for (const [k, v] of Object.entries(raw)) {
      if (k === '_copy') continue;
      if (k === 'entries' && copyRef._mod && copyRef._mod.entries) continue; // handle via mod
      merged[k] = v; // Override base with specific fields
    }
    
    // Advanced _mod for entries
    if (copyRef._mod && copyRef._mod.entries && Array.isArray(copyRef._mod.entries)) {
      if (!merged.entries) merged.entries = [];
      for (const mod of copyRef._mod.entries) {
        if (mod.mode === 'appendArr' && mod.items) {
          merged.entries.push(...mod.items);
        } else if (mod.mode === 'prependArr' && mod.items) {
          merged.entries.unshift(...mod.items);
        } else if (mod.mode === 'replaceArr' && mod.replace && mod.items) {
          const idx = merged.entries.findIndex((e: any) => 
            typeof e === 'string' ? e.includes(mod.replace) : e.name === mod.replace
          );
          if (idx !== -1) {
            merged.entries.splice(idx, 1, ...mod.items);
          }
        } else if (mod.mode === 'removeArr' && mod.names) {
          merged.entries = merged.entries.filter((e: any) => !mod.names.includes(e.name));
        }
      }
    }

    return merged;
  }

  for (const raw of allItems) {
    try {
      const resolved = resolveCopy(raw);
      
      // Inject generic itemType rules (e.g., Vehicles)
      if (resolved.type) {
        const types = resolved.type.split('|')[0].split(',');
        for (const t of types) {
          const genericEntries = itemTypeMap.get(t.trim());
          if (genericEntries) {
            resolved.entries = resolved.entries ? [...genericEntries, ...resolved.entries] : [...genericEntries];
          }
        }
      }

      // Skip seeding pure baseitems if they are only for inheritance, but for now we'll seed all
      // Or we can just seed everything. The adapter handles it.
      const master = adapter.toMasterItem(resolved);
      await store.put(DOCUMENT_COLLECTIONS.compendiumItems, master);
      upserted += 1;
    } catch (err: unknown) {
      console.warn(`  [Warning] Failed to parse item ${raw.name}:`, err);
    }
  }

  console.log(`  Successfully upserted ${upserted} items`);
}

async function runAllSeeds() {
  await seedAllSpells();
  await seedMonsters();
  await seedClasses();
  await seedRaces();
  await seedItems();
  console.log('\nAll seeds complete!');
}

runAllSeeds().catch((err: Error) => {
  console.error('Seed failed:', err.message);
  if (err.message.includes('ENOENT')) {
    console.error(
      '\nClone 5etools-src and set FIVEETOOLS_SPELLS_DIR to data/spells, e.g.:\n' +
        '  git clone https://github.com/5etools-mirror-3/5etools-src vendor/5etools-src\n',
    );
  }
  process.exit(1);
});
