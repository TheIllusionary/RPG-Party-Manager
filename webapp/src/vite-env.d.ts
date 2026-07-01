/// <reference types="vite/client" />

interface ElectronIpcRenderer {
  on: (channel: string, listener: (...args: unknown[]) => void) => void;
  off: (channel: string, listener: (...args: unknown[]) => void) => void;
  send: (channel: string, ...args: unknown[]) => void;
}

interface Window {
  require?: (module: string) => { ipcRenderer: ElectronIpcRenderer };
}
