import { describe, it, expect, vi } from 'vitest';
import { loadState, saveState } from '../lib/persistence';
import type { StoreAdapter } from '../lib/persistence';
import { createDefaultState, SCHEMA_VERSION } from '../lib/constants';

function createMockStore(data: Record<string, unknown> = {}): StoreAdapter {
  const store = new Map<string, unknown>(Object.entries(data));
  return {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    save: vi.fn(async () => {}),
  };
}

describe('loadState', () => {
  it('returns default state when store is empty', async () => {
    const store = createMockStore();
    const state = await loadState(store);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.items).toEqual([]);
    expect(state.labels).toHaveLength(4);
    expect(state.properties).toHaveLength(2);
    expect(state.settings.itemOrderMode).toBe('manual');
    expect(state.settings.startupWindowMode).toBe('unfolded');
  });

  it('returns stored state when present', async () => {
    const saved = createDefaultState();
    saved.items = [{ id: 'x', text: 'Test', labelId: null, note: '', noteCollapsed: true, propertyIds: [], children: [], collapsed: false, createdAt: '', updatedAt: '' }];
    const store = createMockStore({ appState: saved });
    const state = await loadState(store);
    expect(state.items).toHaveLength(1);
    expect(state.items[0].text).toBe('Test');
  });

  it('migrates state without schema version', async () => {
    const old = { items: [], labels: [], properties: [], settings: { alwaysOnTop: true, windowPosition: null, theme: 'auto' as const } };
    const store = createMockStore({ appState: old });
    const state = await loadState(store);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.settings.itemOrderMode).toBe('manual');
    expect(state.settings.startupWindowMode).toBe('unfolded');
  });

  it('fills missing settings fields when loading an older saved state', async () => {
    const saved = {
      ...createDefaultState(),
      schemaVersion: SCHEMA_VERSION,
      settings: {
        alwaysOnTop: false,
        theme: 'dark' as const,
        windowPosition: null,
      },
    };
    const store = createMockStore({ appState: saved });

    const state = await loadState(store);

    expect(state.settings.alwaysOnTop).toBe(false);
    expect(state.settings.theme).toBe('dark');
    expect(state.settings.itemOrderMode).toBe('manual');
    expect(state.settings.startupWindowMode).toBe('unfolded');
  });

  it('adds default note metadata when loading items saved before note visibility existed', async () => {
    const saved = {
      ...createDefaultState(),
      items: [{ id: 'legacy', text: 'Legacy item', labelId: null, propertyIds: [], children: [], collapsed: false, createdAt: '', updatedAt: '' }],
    };
    const store = createMockStore({ appState: saved });

    const state = await loadState(store);

    expect(state.items[0].note).toBe('');
    expect(state.items[0].noteCollapsed).toBe(true);
  });

  it('returns defaults on error', async () => {
    const store: StoreAdapter = {
      get: vi.fn(async () => { throw new Error('fail'); }),
      set: vi.fn(async () => {}),
      save: vi.fn(async () => {}),
    };
    const state = await loadState(store);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.items).toEqual([]);
  });
});

describe('saveState', () => {
  it('writes state to store and saves', async () => {
    const store = createMockStore();
    const state = createDefaultState();
    await saveState(store, state);
    expect(store.set).toHaveBeenCalledWith('appState', state);
    expect(store.save).toHaveBeenCalled();
  });
});
