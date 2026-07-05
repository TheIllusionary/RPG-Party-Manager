import { useCallback, useEffect, useState } from 'react';
import { getCompendiumClasses } from '../../services/compendiumBridge';
import type { MasterClass } from '../../services/compendium/fiveETools/types';

export interface UseCompendiumClassesResult {
  classes: MasterClass[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useCompendiumClasses(): UseCompendiumClassesResult {
  const [classes, setClasses] = useState<MasterClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const masterClasses = await getCompendiumClasses();
      setClasses(masterClasses);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { classes, loading, error, reload };
}
