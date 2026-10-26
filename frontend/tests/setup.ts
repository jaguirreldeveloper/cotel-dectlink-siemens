import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Leaflet to avoid canvas issues in jsdom
vi.mock('leaflet', () => {
  const mockMap = {
    setView: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    fitBounds: vi.fn(),
    getBounds: vi.fn(() => ({ getSouthWest: () => ({ lat: -1, lng: -1 }), getNorthEast: () => ({ lat: 1, lng: 1 }) })),
    getCenter: vi.fn(() => ({ lat: 0, lng: 0 })),
    getZoom: vi.fn(() => 10)
  };

  const mockLayer = {
    addTo: vi.fn(() => mockLayer),
    remove: vi.fn(),
    bindPopup: vi.fn(() => mockLayer),
    unbindPopup: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  };

  return {
    map: vi.fn(() => mockMap),
    tileLayer: vi.fn(() => mockLayer),
    marker: vi.fn(() => mockLayer),
    circleMarker: vi.fn(() => mockLayer),
    polyline: vi.fn(() => mockLayer),
    polygon: vi.fn(() => mockLayer),
    circle: vi.fn(() => mockLayer),
    latLng: vi.fn((lat, lng) => ({ lat, lng })),
    latLngBounds: vi.fn((sw, ne) => ({ sw, ne })),
    icon: vi.fn(() => ({ options: {} })),
    divIcon: vi.fn(() => ({ options: {} })),
    control: {
      scale: vi.fn(() => mockLayer),
      zoom: vi.fn(() => mockLayer)
    },
    DomEvent: {
      on: vi.fn(),
      off: vi.fn()
    },
    Browser: {
      touch: false,
      mobile: false
    }
  };
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));