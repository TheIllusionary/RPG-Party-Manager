import { useCallback, useEffect, useState } from 'react';

import { getCompendiumItems } from '../../services/compendiumBridge';
import type { MasterItem } from '../../services/compendium/fiveETools/types';
import type { ISRDEquipmentItem } from '../../types/srd';
import type { IInventoryItem } from '../../types';

/**
 * Adapts a local `MasterItem` document into the `ISRDEquipmentItem` shape
 * that `ItemCard` already renders. This avoids any structural UI changes.
 */
function masterItemToSrdEquipment(item: MasterItem): ISRDEquipmentItem {
  const inventoryItem: IInventoryItem = {
    id: item.id,
    name: item.name,
    description: item.description,
    weight: item.weight != null ? `${item.weight} lb.` : undefined,
    type: item.type,
    rarity: item.rarity,
    category: item.category,
  };

  return {
    id: item.id,
    index: item.index,
    name: item.name,
    description: item.description,
    category: item.category,
    weaponCategory: item.weaponCategory,
    armorCategory: item.armorCategory,
    cost: item.cost,
    weight: item.weight != null ? `${item.weight} lb.` : undefined,
    damageFormula: item.damageFormula,
    damageType: item.damageType,
    armorClass: item.armorClass,
    inventoryItem,
    source: item.source,
  };
}

export interface UseCompendiumItemsResult {
  items: ISRDEquipmentItem[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Fetches compendium items from the local document store (via IPC bridge)
 * and adapts them into `ISRDEquipmentItem[]` so the existing `ItemCard`
 * component can render them without modification.
 */
export function useCompendiumItems(): UseCompendiumItemsResult {
  const [items, setItems] = useState<ISRDEquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const masterItems = await getCompendiumItems();
      const adapted = masterItems.map(masterItemToSrdEquipment);
      setItems(adapted);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { items, loading, error, reload };
}
