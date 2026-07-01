import React, { useState } from 'react';
import usePartyState from './hooks/usePartyState';
import useCombatState from './hooks/useCombatState';
import PlayerManagerView from './PlayerManagerView';

/**
 * Thin orchestrator: wires party + combat hooks and renders the view layer.
 */
export default function PlayerManagerRoot(props) {
  const [battleNotes, setBattleNotes] = useState(() => localStorage.getItem('battleNotes') || '');

  const party = usePartyState({ ...props, setBattleNotes });
  const combat = useCombatState({ ...props, battleNotes, setBattleNotes }, party);

  return <PlayerManagerView {...props} party={party} combat={combat} />;
}
