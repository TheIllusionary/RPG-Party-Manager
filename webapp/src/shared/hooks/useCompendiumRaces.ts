import { useCallback, useEffect, useState } from 'react';
import { getCompendiumRaces } from '../../services/compendiumBridge';
import type { MasterRace } from '../../services/compendium/fiveETools/types';

export interface UseCompendiumRacesResult {
  races: MasterRace[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useCompendiumRaces(): UseCompendiumRacesResult {
  const [races, setRaces] = useState<MasterRace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const masterRaces = await getCompendiumRaces();
      setRaces(masterRaces);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setRaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { races, loading, error, reload };
}
