import { useCallback, useEffect, useState } from 'react';
import { getCompendiumMonsters } from '../../services/compendiumBridge';
import type { MasterMonster } from '../../services/compendium/fiveETools/types';
import type { IMonster } from '../../types';

function masterMonsterToIMonster(master: MasterMonster): IMonster {
  // Try to parse numeric AC
  let ac = 10;
  if (master.ac) {
    const match = master.ac.match(/^\d+/);
    if (match) ac = parseInt(match[0], 10);
  }

  // Try to parse numeric HP
  let hpMax = 10;
  if (master.hp) {
    const match = master.hp.match(/^\d+/);
    if (match) hpMax = parseInt(match[0], 10);
  }

  const featuresText = (master.traits || [])
    .map((t) => `${t.name}: ${t.desc}`)
    .join('\n\n');

  const abilitiesText = (master.actions || [])
    .map((a) => `${a.name}: ${a.desc}`)
    .join('\n\n');

  const backgroundStr = `${master.type || 'Monster'}, CR ${master.cr || '?'}`;

  return {
    id: master.id,
    name: master.name,
    classType: 'Enemy',
    ac,
    hpMax,
    hpBase: hpMax,
    str: master.str || 10,
    dex: master.dex || 10,
    con: master.con || 10,
    int: master.int || 10,
    wis: master.wis || 10,
    cha: master.cha || 10,
    background: backgroundStr,
    features: featuresText,
    abilities: abilitiesText,
    isDefault: true,
  };
}

export interface UseCompendiumMonstersResult {
  monsters: IMonster[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useCompendiumMonsters(): UseCompendiumMonstersResult {
  const [monsters, setMonsters] = useState<IMonster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const masterList = await getCompendiumMonsters();
      const adapted = masterList.map(masterMonsterToIMonster);
      setMonsters(adapted);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setMonsters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { monsters, loading, error, reload };
}
