import React from 'react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Define global MediaPipe mocks
(global as any).Pose = class MockPose {
  private onResultsCallback: any;
  public options: any;

  constructor() {}
  
  setOptions(options: any) {
    this.options = options;
  }
  
  onResults(callback: any) {
    this.onResultsCallback = callback;
  }
  
  async send({ image }: { image: any }) {
    if (this.onResultsCallback) {
      // Simulate landmark points (e.g. ankles at y=0.8, hips at y=0.5)
      this.onResultsCallback({
        image: { width: 640, height: 480 },
        poseLandmarks: Array.from({ length: 33 }, (_, idx) => ({
          x: 0.5,
          y: idx === 27 || idx === 28 ? 0.8 : 0.5, // ankles lower down
          visibility: 0.95
        }))
      });
    }
  }
  
  close() {}
};

// Mock the MediaPipe connections objects
(global as any).POSE_CONNECTIONS = [];
(global as any).drawConnectors = vi.fn();
(global as any).drawLandmarks = vi.fn();

// Node 22+ ships its own (disabled) global localStorage that shadows jsdom's;
// install a small in-memory Storage so components can read/write it in tests.
{
  const store = new Map<string, string>();
  const memoryStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true, writable: true });
  if (typeof window !== 'undefined') Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true, writable: true });
}

// Mock ResizeObserver
(global as any).ResizeObserver = class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock recharts ResponsiveContainer
vi.mock('recharts', async (importOriginal) => {
  const original: any = await importOriginal();
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      React.createElement('div', { style: { width: '800px', height: '600px' } }, children)
    ),
  };
});

// Mock URL Object methods
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'mock-video-stream-url');
  window.URL.revokeObjectURL = vi.fn();

  window.scrollTo = vi.fn() as any;

  // Mock Alert dialogs
  window.alert = vi.fn();

  // Mock Clipboard APIs
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    },
  });

  // Mock Video prototypes
  window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.HTMLMediaElement.prototype.load = vi.fn();

  // Mock requestVideoFrameCallback on HTMLVideoElement
  (window.HTMLVideoElement.prototype as any).requestVideoFrameCallback = vi.fn().mockImplementation((cb) => {
    const metadata = { mediaTime: 0.2, presentationTime: 1234 };
    const timer = setTimeout(() => cb(Date.now(), metadata), 16); // simulate 60fps frame tick
    return timer;
  });
}

// Access-code gate is covered separately; render the app directly in tests
vi.mock('../src/AuthGate', () => ({ default: ({ children }: { children: any }) => children }));
