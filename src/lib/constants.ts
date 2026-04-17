import type { Label, Property, AppState, AppSettings, ItemOrderMode } from './types';

export const SCHEMA_VERSION = 4;

export const DEFAULT_PROPERTY_IDS = {
  important: 'prop-important',
  urgent: 'prop-urgent',
} as const;

export const ITEM_ORDER_MODES: Array<{ value: ItemOrderMode; label: string }> = [
  { value: 'manual', label: 'Manual order' },
  { value: 'urgent-first', label: 'Urgent first' },
  { value: 'important-first', label: 'Important first' },
  { value: 'urgent-then-important', label: 'Urgent, then important' },
];

export const DEFAULT_LABELS: Label[] = [
  { id: 'label-on-hold', name: 'on hold', color: '#6b7280', order: 0 },
  { id: 'label-waiting', name: 'waiting for reply', color: '#d97706', order: 1 },
  { id: 'label-in-progress', name: 'in progress', color: '#2563eb', order: 2 },
  { id: 'label-done', name: 'done', color: '#16a34a', order: 3 },
];

export const DEFAULT_PROPERTIES: Property[] = [
  { id: DEFAULT_PROPERTY_IDS.urgent, name: 'Urgent', color: '#dc2626' },
  { id: DEFAULT_PROPERTY_IDS.important, name: 'Important', color: '#ea580c' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  alwaysOnTop: true,
  itemOrderMode: 'manual',
  windowPosition: null,
  theme: 'auto',
};

export function createDefaultState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    items: [],
    labels: [...DEFAULT_LABELS],
    properties: [...DEFAULT_PROPERTIES],
    settings: { ...DEFAULT_SETTINGS },
  };
}
