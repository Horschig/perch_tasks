import type { AppSettings, AppState, Label, Property, TodoItem } from './types';
import { createDefaultState, SCHEMA_VERSION } from './constants';

// Abstraction over the store to allow mocking in tests
export interface StoreAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  save(): Promise<void>;
}

const STATE_KEY = 'appState';

function migrateState(data: Record<string, unknown>): AppState {
  const version = (data.schemaVersion as number) ?? 0;
  const defaults = createDefaultState();
  let state = mergeState(defaults, data);

  // Migration pipeline: add cases as schema evolves
  if (version < 1) {
    state = mergeState(defaults, data);
  }

  if (version < 2) {
    state = {
      ...state,
      settings: {
        ...defaults.settings,
        ...state.settings,
      },
    };
  }

  if (version < 3) {
    state = {
      ...state,
      items: normalizeTodoItems(state.items),
    };
  }

  if (version < 4) {
    state = {
      ...state,
      items: normalizeTodoItems(state.items),
    };
  }

  return { ...state, schemaVersion: SCHEMA_VERSION };
}

export async function loadState(store: StoreAdapter): Promise<AppState> {
  try {
    const raw = await store.get(STATE_KEY);
    if (!raw || typeof raw !== 'object') {
      return createDefaultState();
    }
    return migrateState(raw as Record<string, unknown>);
  } catch {
    return createDefaultState();
  }
}

export async function saveState(store: StoreAdapter, state: AppState): Promise<void> {
  await store.set(STATE_KEY, state);
  await store.save();
}

function mergeState(defaults: AppState, data: Record<string, unknown>): AppState {
  const settings = isRecord(data.settings) ? data.settings : {};

  return {
    schemaVersion: SCHEMA_VERSION,
    items: isTodoItemArray(data.items) ? normalizeTodoItems(data.items) : defaults.items,
    labels: isLabelArray(data.labels) ? data.labels : defaults.labels,
    properties: isPropertyArray(data.properties) ? data.properties : defaults.properties,
    settings: {
      ...defaults.settings,
      ...settings as Partial<AppSettings>,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTodoItemArray(value: unknown): value is TodoItem[] {
  return Array.isArray(value);
}

function normalizeTodoItems(items: TodoItem[]): TodoItem[] {
  return items.map((item) => ({
    ...item,
    note: typeof item.note === 'string' ? item.note : '',
    noteCollapsed: typeof item.noteCollapsed === 'boolean' ? item.noteCollapsed : true,
    children: normalizeTodoItems(item.children ?? []),
  }));
}

function isLabelArray(value: unknown): value is Label[] {
  return Array.isArray(value);
}

function isPropertyArray(value: unknown): value is Property[] {
  return Array.isArray(value);
}
