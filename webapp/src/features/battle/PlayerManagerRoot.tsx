import React, { useState, useEffect } from 'react';
import usePartyState from './hooks/usePartyState';
import useCombatState from './hooks/useCombatState';
import PlayerManagerView from './PlayerManagerView';
import type { IPlayerManagerShellProps } from '../../types/battle';
import db from '../../services/db';

/**
 * Thin orchestrator: wires party + combat hooks and renders the view layer.
 */
export default function PlayerManagerRoot({
  campaignId,
  library,
  updateLibrary,
  subclasses,
  logicBlocks,
  config,
  configModalOpen,
  compendiumClasses,
  compendiumSubclasses,
  compendiumRaces,
  ...props
}: IPlayerManagerShellProps) {
  const [battleNotes, setBattleNotes] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(true);

  // Load battle notes from Dexie
  useEffect(() => {
    async function loadNotes() {
      if (!campaignId) return;
      setLoadingNotes(true);
      try {
        const record = await db.campaignState.get(`campaign_${campaignId}_notes`);
        if (record) {
          setBattleNotes(record.data || '');
        } else {
          setBattleNotes('');
        }
      } catch (err) {
        console.error('Failed to load battle notes:', err);
      } finally {
        setLoadingNotes(false);
      }
    }
    loadNotes();
  }, [campaignId]);

  // Save battle notes to Dexie
  useEffect(() => {
    if (loadingNotes || !campaignId) return;
    db.campaignState.put({
      id: `campaign_${campaignId}_notes`,
      campaignId: campaignId,
      type: 'battleNotes',
      data: battleNotes,
      updatedAt: Date.now(),
    }).catch((err) => console.error('Failed to save battle notes:', err));
  }, [campaignId, battleNotes, loadingNotes]);

  const party = usePartyState({ 
    ...props,
    campaignId,
    subclasses,
    logicBlocks,
    config,
    compendiumClasses, 
    compendiumSubclasses, 
    compendiumRaces, 
    setBattleNotes 
  });

  const combat = useCombatState({ 
    ...props, 
    campaignId,
    library,
    updateLibrary,
    subclasses,
    logicBlocks,
    config,
    battleNotes, 
    setBattleNotes 
  }, party);

  return (
    <PlayerManagerView 
      {...props} 
      campaignId={campaignId}
      party={party} 
      combat={combat} 
      library={library}
      updateLibrary={updateLibrary}
      subclasses={subclasses}
      logicBlocks={logicBlocks}
      config={config}
      configModalOpen={configModalOpen}
      compendiumClasses={compendiumClasses}
      compendiumSubclasses={compendiumSubclasses}
      compendiumRaces={compendiumRaces}
    />
  );
}
