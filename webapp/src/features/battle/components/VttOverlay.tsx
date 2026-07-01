import React from 'react';
import type { IVttOverlayProps } from '../../../types/battle';

export default function VttOverlay({ combat, battleMode, data }: IVttOverlayProps) {
  const {
    isVttOpen,
    vttInputVal,
    setVttInputVal,
    handleLoadVtt,
    handleReloadVtt,
    setIsVttFullscreen,
    handleOpenInBrowser,
    vttPlaceholderRef,
    vttLoading,
    battleNotes,
    setBattleNotes,
  } = combat;

  return (
    <>
      {battleMode && isVttOpen && (
        <div className="battle-vtt-column">
          <div className="vtt-embedded-panel glass-panel">
            <div className="vtt-toolbar">
              <div className="vtt-toolbar-left">
                <input
                  type="text"
                  className="input vtt-url-input"
                  placeholder="Enter Room ID (e.g. room-abc) or full URL..."
                  value={vttInputVal}
                  onChange={(e) => setVttInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLoadVtt();
                  }}
                />
                <button type="button" className="btn btn-primary vtt-btn" onClick={handleLoadVtt}>Load</button>
                <button type="button" className="btn btn-secondary vtt-btn" onClick={handleReloadVtt}>Reload</button>
              </div>
              <div className="vtt-toolbar-right">
                <button type="button" className="btn btn-secondary vtt-btn" onClick={() => setIsVttFullscreen(true)} title="Enter Fullscreen VTT">
                  🖥️ Fullscreen
                </button>
                <button type="button" className="btn btn-secondary vtt-btn" onClick={handleOpenInBrowser}>
                  🌐 Open in Browser
                </button>
              </div>
            </div>
            <div className="vtt-view-placeholder" ref={vttPlaceholderRef}>
              {vttLoading && (
                <div className="vtt-loading-overlay">
                  <div className="vtt-spinner" />
                  <span>Loading Owlbear Rodeo...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!battleMode && data.length === 0 && (
        <div className="empty-state">
          <p>Your party is empty. Add a player to begin your adventure.</p>
        </div>
      )}

      {battleMode && (
        <div className="battle-notes-footer-section">
          <div className="vtt-notes-panel glass-panel">
            <h3>Notes & Combat Logs</h3>
            <textarea
              className="input vtt-notes-textarea"
              placeholder="Write scratchpad notes, initiative order, encounter descriptions, loot, or status effects..."
              value={battleNotes}
              onChange={(e) => setBattleNotes(e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
}
