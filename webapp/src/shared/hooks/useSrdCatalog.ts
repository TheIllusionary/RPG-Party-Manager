import { useCallback, useEffect, useRef, useState } from 'react';

import { getSrdCatalog } from '../../services/srdBridge';
import { mergeSrdCatalogs } from '../../services/srd/mergeSrdCatalog';
import type { ISRDCatalog } from '../../types/srd';
import { createEmptySrdCatalog } from '../../types/srd';

export interface UseSrdCatalogResult {
  catalog: ISRDCatalog;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Loads spells/equipment from the local NoSQL store (Electron) or sessionStorage (browser),
 * merged with any `campaignCatalog` already on the active campaign document.
 */
export function useSrdCatalog(campaignCatalog?: ISRDCatalog | null): UseSrdCatalogResult {
  const campaignRef = useRef(campaignCatalog);
  campaignRef.current = campaignCatalog;

  const catalogKey = `${campaignCatalog?.importedAt ?? ''}:${campaignCatalog?.spells.length ?? 0}:${campaignCatalog?.equipment.length ?? 0}`;

  const [catalog, setCatalog] = useState<ISRDCatalog>(() =>
    campaignCatalog ? { ...campaignCatalog } : createEmptySrdCatalog(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const local = await getSrdCatalog();
      const base = campaignRef.current ?? createEmptySrdCatalog();
      setCatalog(mergeSrdCatalogs(base, local));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setCatalog(campaignRef.current ?? createEmptySrdCatalog());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [catalogKey, reload]);

  return { catalog, loading, error, reload };
}
