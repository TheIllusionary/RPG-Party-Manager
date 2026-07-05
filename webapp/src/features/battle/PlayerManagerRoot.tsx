import React, { useState } from 'react';
import usePartyState from './hooks/usePartyState';
import useCombatState from './hooks/useCombatState';
import PlayerManagerView from './PlayerManagerView';
import type { IPlayerManagerShellProps } from '../../types/battle';

/**
 * Thin orchestrator: wires party + combat hooks and renders the view layer.
 */
export default function PlayerManagerRoot({
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
  const [battleNotes, setBattleNotes] = useState(
    () => localStorage.getItem('battleNotes') || '',
  );

  const party = usePartyState({ 
    ...props,
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
    subclasses,
    logicBlocks,
    config,
    battleNotes, 
    setBattleNotes 
  }, party);

  return (
    <PlayerManagerView 
      {...props} 
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
