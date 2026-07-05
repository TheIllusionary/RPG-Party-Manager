import { useCallback, useEffect, useState } from 'react';

import { getCompendiumSpells } from '../../services/compendiumBridge';
import type { MasterSpell } from '../../services/compendium/fiveETools/types';
import type { ISRDSpell } from '../../types/srd';

function masterSpellToSrdSpell(spell: MasterSpell): ISRDSpell {
  return {
    id: spell.id,
    index: spell.index,
    name: spell.name,
    level: spell.level,
    school: spell.schoolLabel || spell.school,
    castingTime: spell.castingTime,
    range: spell.range,
    duration: spell.duration,
    ritual: spell.ritual,
    concentration: spell.concentration,
    description: spell.description,
    higherLevel: spell.higherLevel,
    components: spell.components,
    material: spell.material,
    classes: spell.classes,
    damageFormula: spell.damageFormula,
    damageType: spell.damageType,
    saveType: spell.saveType,
    logicBlock: {
      id: crypto.randomUUID(),
      name: 'Default Spell Logic',
      description: '',
      triggers: [],
      conditions: [],
      effects: [],
    },
    source: spell.source,
  };
}

export interface UseCompendiumSpellsResult {
  spells: ISRDSpell[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useCompendiumSpells(): UseCompendiumSpellsResult {
  const [spells, setSpells] = useState<ISRDSpell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const masterSpells = await getCompendiumSpells();
      const adapted = masterSpells.map(masterSpellToSrdSpell);
      setSpells(adapted);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setSpells([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { spells, loading, error, reload };
}
