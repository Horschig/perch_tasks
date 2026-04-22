import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppState, TodoItem } from '../lib/types';
import { DEFAULT_PROPERTY_IDS, createDefaultState } from '../lib/constants';

function makeItem(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 'item-1',
    text: 'Test item',
    labelId: null,
    note: '',
    noteCollapsed: true,
    propertyIds: [],
    children: [],
    collapsed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createStore(initialState: AppState | null) {
  let savedState: unknown = null;

  return {
    adapter: {
      get: vi.fn(async () => initialState),
      set: vi.fn(async (_key: string, value: unknown) => {
        savedState = value;
      }),
      save: vi.fn(async () => undefined),
    },
    getSavedState() {
      return savedState;
    },
  };
}

async function loadStateModule(initialState: AppState | null) {
  vi.resetModules();
  const stateModule = await import('../lib/state.svelte');
  const store = createStore(initialState);
  await stateModule.initState(store.adapter);
  return { stateModule, store };
}

afterEach(() => {
  try {
    vi.runOnlyPendingTimers();
  } catch {
    // The suite mixes real and fake timers; ignore when fake timers were not enabled.
  }
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('state ordering', () => {
  it('applies a saved automatic order once on load and resets back to manual mode', async () => {
    const initialState: AppState = {
      ...createDefaultState(),
      items: [
        makeItem({ id: 'normal', text: 'Normal' }),
        makeItem({ id: 'urgent', text: 'Urgent', propertyIds: [DEFAULT_PROPERTY_IDS.urgent] }),
      ],
      settings: {
        ...createDefaultState().settings,
        itemOrderMode: 'urgent-first',
      },
    };

    const { stateModule, store } = await loadStateModule(initialState);

    expect(stateModule.getItems().map((item) => item.id)).toEqual(['urgent', 'normal']);
    expect(stateModule.getItemOrderMode()).toBe('manual');
    expect((store.getSavedState() as AppState | null)?.settings.itemOrderMode).toBe('manual');
  });

  it('keeps manual reordering available after applying an automatic sort', async () => {
    vi.useFakeTimers();

    const initialState: AppState = {
      ...createDefaultState(),
      items: [
        makeItem({ id: 'normal', text: 'Normal' }),
        makeItem({ id: 'urgent', text: 'Urgent', propertyIds: [DEFAULT_PROPERTY_IDS.urgent] }),
      ],
    };

    const { stateModule } = await loadStateModule(initialState);

    stateModule.actionSetItemOrderMode('urgent-first');

    expect(stateModule.getItems().map((item) => item.id)).toEqual(['urgent', 'normal']);
    expect(stateModule.getItemOrderMode()).toBe('manual');

    stateModule.actionReorderItems(null, ['normal', 'urgent']);

    expect(stateModule.getItems().map((item) => item.id)).toEqual(['normal', 'urgent']);
  });

  it('updates startup settings and persists them through the debounced save path', async () => {
    vi.useFakeTimers();

    const { stateModule, store } = await loadStateModule(createDefaultState());

    stateModule.actionSetStartupMode('folded');
    stateModule.actionSetAutostartEnabled(true);
    vi.runOnlyPendingTimers();

    expect(stateModule.getState().settings.startupMode).toBe('folded');
    expect(stateModule.getState().settings.autostartEnabled).toBe(true);
    expect((store.getSavedState() as AppState | null)?.settings.startupMode).toBe('folded');
    expect((store.getSavedState() as AppState | null)?.settings.autostartEnabled).toBe(true);
  });
});