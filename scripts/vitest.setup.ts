import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: (media: string) => ({ media, matches: false, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => true }) });
