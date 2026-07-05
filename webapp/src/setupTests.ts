import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock the electron window methods
if (!globalThis.window.electron) {
    (globalThis.window as any).electron = {
        ipcRenderer: {
            invoke: vi.fn(),
            on: vi.fn(),
            removeAllListeners: vi.fn(),
            send: vi.fn()
        }
    };
}

// Mock crypto.randomUUID
if (!globalThis.crypto.randomUUID) {
    globalThis.crypto.randomUUID = () => '00000000-0000-0000-0000-000000000000';
}
