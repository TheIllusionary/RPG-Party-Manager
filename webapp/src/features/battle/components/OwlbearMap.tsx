import React, { useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';

export default function OwlbearMap() {
  const [vttRoomUrl, setVttRoomUrl] = useState('');
  const [vttInputVal, setVttInputVal] = useState('');
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    // Load last used URL
    const saved = localStorage.getItem('rpg_party_manager_vtt_url');
    if (saved) {
      setVttRoomUrl(saved);
      setVttInputVal(saved);
    }
  }, []);

  useEffect(() => {
    // The SDK is meant to run inside Owlbear plugins, but we'll register the ready listener
    // just in case it works or establishes a handshake with the iframe.
    try {
      OBR.onReady(() => {
        console.log('Owlbear Rodeo SDK is ready!');
        setSdkReady(true);
      });
    } catch (e) {
      console.warn('Owlbear SDK failed to initialize in host mode:', e);
    }
  }, []);

  const handleLoadVtt = () => {
    let targetUrl = vttInputVal.trim();
    if (!targetUrl) targetUrl = 'https://owlbear.rodeo';
    else if (targetUrl.startsWith('room/')) targetUrl = `https://owlbear.rodeo/${targetUrl}`;
    else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) targetUrl = `https://owlbear.rodeo/room/${targetUrl}`;
    
    setVttRoomUrl(targetUrl);
    setVttInputVal(targetUrl);
    localStorage.setItem('rpg_party_manager_vtt_url', targetUrl);
  };

  const handleReloadVtt = () => {
    const current = vttRoomUrl;
    setVttRoomUrl('');
    setTimeout(() => setVttRoomUrl(current), 50);
  };

  const handleOpenInBrowser = () => {
    const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;
    if (ipc) {
      ipc.send('vtt-open-browser', { url: vttRoomUrl });
    } else {
      window.open(vttRoomUrl, '_blank');
    }
  };

  return (
    <div className="battle-vtt-column" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="vtt-embedded-panel glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="vtt-toolbar" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="vtt-toolbar-left" style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <input
              type="text"
              className="input vtt-url-input"
              placeholder="Enter Room ID (e.g. room-abc) or full URL..."
              value={vttInputVal}
              onChange={(e) => setVttInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLoadVtt();
              }}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-primary vtt-btn" onClick={handleLoadVtt}>Load</button>
            <button type="button" className="btn btn-secondary vtt-btn" onClick={handleReloadVtt}>Reload</button>
          </div>
          <div className="vtt-toolbar-right" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {sdkReady && <span style={{ color: 'var(--color-green)', fontSize: '0.8rem', marginRight: '0.5rem' }}>SDK Ready</span>}
            <button type="button" className="btn btn-secondary vtt-btn" onClick={handleOpenInBrowser}>
              🌐 Open in Browser
            </button>
          </div>
        </div>
        <div className="vtt-view-placeholder" style={{ flex: 1, backgroundColor: '#000', position: 'relative' }}>
          {vttRoomUrl ? (
            <iframe
              src={vttRoomUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="clipboard-read; clipboard-write; display-capture"
              title="Owlbear Rodeo Battlemap"
            />
          ) : (
            <div className="vtt-loading-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <span style={{ color: 'var(--color-text-dim)' }}>Enter an Owlbear Rodeo URL to load the map.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
