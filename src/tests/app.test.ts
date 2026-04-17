import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import App from '../App.svelte';

const appWindowMocks = vi.hoisted(() => ({
  outerPosition: vi.fn(async () => ({ x: 0, y: 0 })),
  outerSize: vi.fn(async () => ({ width: 340, height: 520 })),
  setAlwaysOnTop: vi.fn(async () => undefined),
  setFocus: vi.fn(async () => undefined),
  setMinSize: vi.fn(async () => undefined),
  setPosition: vi.fn(async () => undefined),
  setResizable: vi.fn(async () => undefined),
  setSize: vi.fn(async () => undefined),
  show: vi.fn(async () => undefined),
  startDragging: vi.fn(async () => undefined),
  startResizeDragging: vi.fn(async () => undefined),
  unminimize: vi.fn(async () => undefined),
}));

const tauriPositionMocks = vi.hoisted(() => ({
  cursorPosition: vi.fn(async () => ({ x: 0, y: 0 })),
  currentMonitor: vi.fn(async () => ({
    name: 'Primary',
    position: { x: 0, y: 0 },
    size: { width: 1920, height: 1080 },
    scaleFactor: 1,
    workArea: {
      position: { x: 0, y: 0 },
      size: { width: 1920, height: 1040 },
    },
  })),
  monitorFromPoint: vi.fn(async () => ({
    name: 'Primary',
    position: { x: 0, y: 0 },
    size: { width: 1920, height: 1080 },
    scaleFactor: 1,
    workArea: {
      position: { x: 0, y: 0 },
      size: { width: 1920, height: 1040 },
    },
  })),
}));

const stateMocks = vi.hoisted(() => ({
  actionAddItem: vi.fn(),
  actionReorderItems: vi.fn(),
  actionSetAlwaysOnTop: vi.fn(),
  actionSetSearch: vi.fn(),
  getFilteredItems: vi.fn(() => []),
  getLabels: vi.fn(() => []),
  getProperties: vi.fn(() => []),
  getSearchQuery: vi.fn(() => ''),
  getState: vi.fn(() => ({ settings: { alwaysOnTop: true, itemOrderMode: 'manual' } })),
  initState: vi.fn(async () => undefined),
  isInitialized: vi.fn(() => true),
}));

const coreMocks = vi.hoisted(() => ({
  invoke: vi.fn(async () => false),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => appWindowMocks,
  cursorPosition: tauriPositionMocks.cursorPosition,
  currentMonitor: tauriPositionMocks.currentMonitor,
  monitorFromPoint: tauriPositionMocks.monitorFromPoint,
  PhysicalPosition: class PhysicalPosition {
    x: number;
    y: number;

    constructor(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
  },
  PhysicalSize: class PhysicalSize {
    width: number;
    height: number;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
  },
}));

vi.mock('@tauri-apps/plugin-store', () => ({
  LazyStore: class {
    async get() {
      return null;
    }

    async set() {}

    async save() {}
  },
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: coreMocks.invoke,
}));

vi.mock('../lib/tray', () => ({
  setupTray: vi.fn(async () => undefined),
}));

vi.mock('../lib/state.svelte', () => ({
  actionAddItem: stateMocks.actionAddItem,
  actionReorderItems: stateMocks.actionReorderItems,
  actionSetAlwaysOnTop: stateMocks.actionSetAlwaysOnTop,
  actionSetSearch: stateMocks.actionSetSearch,
  getFilteredItems: stateMocks.getFilteredItems,
  getLabels: stateMocks.getLabels,
  getProperties: stateMocks.getProperties,
  getSearchQuery: stateMocks.getSearchQuery,
  getState: stateMocks.getState,
  initState: stateMocks.initState,
  isInitialized: stateMocks.isInitialized,
}));

describe('App', () => {
  it('applies the unfolded minimum window size on startup', async () => {
    render(App);

    await waitFor(() => {
      const minSizeCalls = appWindowMocks.setMinSize.mock.calls as unknown[][];
      const minSize = minSizeCalls.at(0)?.[0] as { width: number; height: number } | undefined;
      expect(minSize).toMatchObject({ width: 280, height: 220 });
    });

    expect(coreMocks.invoke).toHaveBeenCalledWith('migrate_legacy_store');
  });

  it('folds into the mid-right edge tab and temporarily removes the minimum size constraint', async () => {
    render(App);

    await fireEvent.click(await screen.findByRole('button', { name: 'Fold to screen edge' }));

    const foldoutButton = await screen.findByRole('button', { name: 'Open todo list' });

    await waitFor(() => {
      expect(foldoutButton).toBeTruthy();
    });

    expect(appWindowMocks.setMinSize).toHaveBeenCalledWith(undefined);
    expect(appWindowMocks.setResizable).toHaveBeenCalledWith(false);
    expect(foldoutButton.textContent).toContain('⇤');

    const setSizeCalls = appWindowMocks.setSize.mock.calls as unknown[][];
    const setPositionCalls = appWindowMocks.setPosition.mock.calls as unknown[][];
    const sizeCall = setSizeCalls.at(-1)?.[0] as { width: number; height: number } | undefined;
    const positionCall = setPositionCalls.at(-1)?.[0] as { x: number; y: number } | undefined;

    expect(sizeCall).toMatchObject({ width: 52, height: 140 });
    expect(positionCall).toMatchObject({ x: 1868, y: 450 });
  });

  it('re-snaps the folded window to an edge after a cancelled drag', async () => {
    appWindowMocks.setPosition.mockClear();
    appWindowMocks.setSize.mockClear();
    render(App);

    await fireEvent.click(await screen.findByRole('button', { name: 'Fold to screen edge' }));
    const foldoutButton = await screen.findByRole('button', { name: 'Open todo list' });

    appWindowMocks.setPosition.mockClear();
    appWindowMocks.setSize.mockClear();

    await fireEvent.pointerDown(foldoutButton, { pointerId: 1, clientX: 40, clientY: 60 });
    await fireEvent.pointerMove(foldoutButton, { pointerId: 1, clientX: -128, clientY: 130 });
    await fireEvent.pointerCancel(foldoutButton, { pointerId: 1 });

    await waitFor(() => {
      const setPositionCalls = appWindowMocks.setPosition.mock.calls as unknown[][];
      const positionCall = setPositionCalls.at(-1)?.[0] as { x: number; y: number } | undefined;
      expect(positionCall).toMatchObject({ x: 1868, y: 450 });
    });
  });

  it('unfolds centered next to the folded tab', async () => {
    render(App);

    await fireEvent.click(await screen.findByRole('button', { name: 'Fold to screen edge' }));
    const foldoutButton = await screen.findByRole('button', { name: 'Open todo list' });

    appWindowMocks.setPosition.mockClear();
    appWindowMocks.setSize.mockClear();

    await fireEvent.pointerDown(foldoutButton, { pointerId: 1, clientX: 40, clientY: 60 });
    await fireEvent.pointerUp(foldoutButton, { pointerId: 1, clientX: 40, clientY: 60 });

    await waitFor(() => {
      const setPositionCalls = appWindowMocks.setPosition.mock.calls as unknown[][];
      const positionCall = setPositionCalls.at(-1)?.[0] as { x: number; y: number } | undefined;
      expect(positionCall).toMatchObject({ x: 1580, y: 260 });
    });
  });

  it('shows the root add composer open by default on the left and search, settings, and fold on the right', async () => {
    const { container } = render(App);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fold to screen edge' })).toBeTruthy();
    });

    const leftLabels = Array.from(container.querySelectorAll('.toolbar-left button')).map((button) => button.getAttribute('aria-label'));
    const rightLabels = Array.from(container.querySelectorAll('.toolbar-right button')).map((button) => button.getAttribute('aria-label'));

    expect(leftLabels).toEqual(['Add todo', 'Close add composer']);
    expect(screen.getByLabelText('Add todo text')).toBeTruthy();
    expect(rightLabels).toEqual(['Search', 'Settings', 'Fold to screen edge']);
  });

  it('moves root add into the toolbar and removes the bottom composer dock', async () => {
    const { container } = render(App);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add todo' })).toBeTruthy();
    });

    expect(container.querySelector('.composer-dock')).toBeNull();
    expect(container.querySelector('.content .root-composer')).toBeNull();
    expect(screen.getByLabelText('Add todo text')).toBeTruthy();
  });

  it('opens search in place of the default add composer and restores add when search closes', async () => {
    stateMocks.actionSetSearch.mockClear();
    const { container } = render(App);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Search' })).toBeTruthy();
    });

    expect(screen.getByLabelText('Add todo text')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Search todos')).toBeTruthy();
    });

    const leftLabels = Array.from(container.querySelectorAll('.toolbar-left button')).map((button) => button.getAttribute('aria-label'));
    expect(leftLabels).toEqual(['Add todo']);
    expect(screen.queryByLabelText('Add todo text')).toBeNull();

    await fireEvent.keyDown(await screen.findByLabelText('Search todos'), { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByLabelText('Add todo text')).toBeTruthy();
    });

    expect(stateMocks.actionSetSearch).toHaveBeenCalledWith('');
  });

  it('submits a root todo from the default add composer and keeps it visible', async () => {
    stateMocks.actionAddItem.mockClear();
    render(App);

    const addInput = await screen.findByLabelText('Add todo text');
    await fireEvent.input(addInput, { target: { value: '  Toolbar task  ' } });
    await fireEvent.keyDown(addInput, { key: 'Enter' });

    expect(stateMocks.actionAddItem).toHaveBeenCalledWith('Toolbar task');
    expect(screen.getByLabelText('Add todo text')).toBeTruthy();
    expect((screen.getByLabelText('Add todo text') as HTMLInputElement).value).toBe('');
  });

  it('closes add mode when the visible pen icon is clicked', async () => {
    render(App);

    await waitFor(() => {
      expect(screen.getByLabelText('Add todo text')).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Add todo' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('Add todo text')).toBeNull();
    });
  });

  it('keeps add mode open and preserves the draft when focus leaves it', async () => {
    render(App);

    const addInput = await screen.findByLabelText('Add todo text');
    await fireEvent.input(addInput, { target: { value: 'Draft todo' } });
    const searchButton = screen.getByRole('button', { name: 'Search' });
    searchButton.focus();
    await fireEvent.focusOut(addInput, { relatedTarget: searchButton });

    expect(screen.getByLabelText('Add todo text')).toBeTruthy();
    expect((screen.getByLabelText('Add todo text') as HTMLInputElement).value).toBe('Draft todo');
  });

  it('closes an empty search bar when focus leaves it', async () => {
    render(App);

    await fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    const searchInput = await screen.findByLabelText('Search todos');
    searchInput.focus();

    const outsideButton = document.createElement('button');
    document.body.appendChild(outsideButton);
    outsideButton.focus();
    await fireEvent.focusOut(searchInput, { relatedTarget: outsideButton });

    await waitFor(() => {
      expect(screen.queryByLabelText('Search todos')).toBeNull();
    });

    outsideButton.remove();
  });
});