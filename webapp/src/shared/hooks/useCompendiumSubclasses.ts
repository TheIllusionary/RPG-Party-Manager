import { useCallback, useEffect, useState } from 'react';
import { getCompendiumSubclasses } from '../../services/compendiumBridge';
import type { MasterSubclass } from '../../services/compendium/fiveETools/types';

export interface UseCompendiumSubclassesResult {
  subclasses: MasterSubclass[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useCompendiumSubclasses(): UseCompendiumSubclassesResult {
  const [subclasses, setSubclasses] = useState<MasterSubclass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const masterSubclasses = await getCompendiumSubclasses();
      setSubclasses(masterSubclasses);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setSubclasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { subclasses, loading, error, reload };
}
