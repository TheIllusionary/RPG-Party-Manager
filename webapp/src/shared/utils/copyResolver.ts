export function applyMods(target: any, mods: any): any {
  let result = target;

  // 1. Handle wildcard text replacement (replaceTxt)
  if (mods['*'] && mods['*'].mode === 'replaceTxt') {
    const replace = mods['*'].replace;
    const withText = mods['*'].with;
    const flags = mods['*'].flags || 'g';
    if (replace && withText) {
      const regex = new RegExp(replace, flags);
      const str = JSON.stringify(result);
      result = JSON.parse(str.replace(regex, withText));
    }
  }

  // Helper to process a single mod action
  const processMod = (key: string, mod: any) => {
    if (!mod || typeof mod !== 'object') return;
    
    // Ensure the target array exists if we are going to modify it
    if (!result[key]) {
        result[key] = [];
    }
    const targetArray = result[key];
    
    if (Array.isArray(targetArray)) {
      if (mod.mode === 'replaceArr') {
        const replaceTarget = mod.replace;
        const newItems = mod.items;
        const idx = targetArray.findIndex((item: any) => item.name === replaceTarget || item === replaceTarget);
        if (idx !== -1) {
          if (Array.isArray(newItems)) targetArray.splice(idx, 1, ...newItems);
          else targetArray.splice(idx, 1, newItems);
        }
      } else if (mod.mode === 'appendArr') {
        const newItems = mod.items;
        if (Array.isArray(newItems)) targetArray.push(...newItems);
        else targetArray.push(newItems);
      } else if (mod.mode === 'removeArr') {
        const removeTarget = mod.names || mod.name;
        const namesToRemove = Array.isArray(removeTarget) ? removeTarget : [removeTarget];
        for (const name of namesToRemove) {
          const idx = targetArray.findIndex((item: any) => item.name === name || item === name);
          if (idx !== -1) targetArray.splice(idx, 1);
        }
      }
    }
  };

  // 2. Handle specific array replacements (replaceArr, appendArr, removeArr)
  for (const [key, modOrArray] of Object.entries(mods)) {
    if (key === '*') continue;
    
    if (Array.isArray(modOrArray)) {
      for (const mod of modOrArray) {
        processMod(key, mod);
      }
    } else {
      processMod(key, modOrArray);
    }
  }

  return result;
}

export function resolveMonsterCopy(monster: any, allMonstersMap: Map<string, any>): any {
  if (!monster || !monster._copy) return monster;

  const baseName = monster._copy.name;
  const baseSource = monster._copy.source || monster.source;
  if (!baseName || !baseSource) return monster;

  const baseKey = `${baseName.toLowerCase()}|${baseSource.toLowerCase()}`;
  const baseMonsterRaw = allMonstersMap.get(baseKey);

  if (!baseMonsterRaw) {
    console.warn(`[Warning] Could not resolve base monster: ${baseKey}`);
    return monster;
  }

  // Recursively resolve the base monster in case it's also a copy
  const resolvedBase = resolveMonsterCopy(baseMonsterRaw, allMonstersMap);

  // Deep clone to prevent mutating the base
  const child = JSON.parse(JSON.stringify(resolvedBase));

  // Merge child's explicit attributes (overriding base)
  for (const key of Object.keys(monster)) {
    if (key === '_copy') continue;
    child[key] = monster[key];
  }

  // Apply _mod modifications
  if (monster._copy._mod) {
    return applyMods(child, monster._copy._mod);
  }

  return child;
}
