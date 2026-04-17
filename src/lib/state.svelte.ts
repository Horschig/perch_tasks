import type { AppState, TodoItem, Label, Property, ItemOrderMode } from './types';
import { createDefaultState } from './constants';
import { addItem, addChild, removeItem, toggleCollapse, toggleItemNoteCollapsed, updateItemNote, updateItemText, moveItem, reorderSiblings, sortItems } from './tree';
import { cycleLabel } from './labels';
import { filterTree } from './search';
import type { StoreAdapter } from './persistence';
import { loadState, saveState } from './persistence';

let appState = $state<AppState>(createDefaultState());
let searchQuery = $state('');
let initialized = $state(false);
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let store: StoreAdapter | null = null;

const SAVE_DEBOUNCE_MS = 300;

function scheduleSave() {
  if (!store) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (store) await saveState(store, appState);
  }, SAVE_DEBOUNCE_MS);
}

// -- Initialization --

export async function initState(storeAdapter: StoreAdapter): Promise<void> {
  store = storeAdapter;
  appState = await loadState(store);

  if (appState.settings.itemOrderMode !== 'manual') {
    appState = applyAutomaticOrderMode(appState, appState.settings.itemOrderMode);
    await saveState(store, appState);
  }

  initialized = true;
}

// -- Getters --

export function getState(): AppState {
  return appState;
}

export function getItems(): TodoItem[] {
  return appState.items;
}

export function getLabels(): Label[] {
  return [...appState.labels].sort((a, b) => a.order - b.order);
}

export function getProperties(): Property[] {
  return appState.properties;
}

export function getSearchQuery(): string {
  return searchQuery;
}

export function getFilteredItems(): TodoItem[] {
  const orderedItems = getOrderedItems();
  if (!searchQuery.trim()) return orderedItems;
  return filterTree(orderedItems, searchQuery);
}

export function getItemOrderMode(): ItemOrderMode {
  return appState.settings.itemOrderMode;
}

export function isInitialized(): boolean {
  return initialized;
}

// -- Actions: Items --

export function actionAddItem(text: string): void {
  appState.items = addItem(appState.items, text);
  scheduleSave();
}

export function actionAddChild(parentId: string, text: string): void {
  appState.items = addChild(appState.items, parentId, text);
  scheduleSave();
}

export function actionRemoveItem(id: string): void {
  appState.items = removeItem(appState.items, id);
  scheduleSave();
}

export function actionToggleCollapse(id: string): void {
  appState.items = toggleCollapse(appState.items, id);
  scheduleSave();
}

export function actionUpdateItemText(id: string, text: string): void {
  appState.items = updateItemText(appState.items, id, text);
  scheduleSave();
}

export function actionUpdateItemNote(id: string, note: string): void {
  appState.items = updateItemNote(appState.items, id, note);
  scheduleSave();
}

export function actionToggleItemNoteCollapsed(id: string): void {
  appState.items = toggleItemNoteCollapsed(appState.items, id);
  scheduleSave();
}

export function actionMoveItem(itemId: string, targetParentId: string | null, targetIndex: number): void {
  appState.items = moveItem(appState.items, itemId, targetParentId, targetIndex);
  scheduleSave();
}

export function actionReorderItems(parentId: string | null, orderedIds: string[]): void {
  appState.items = reorderSiblings(appState.items, parentId, orderedIds);
  scheduleSave();
}

export function actionSetItems(items: TodoItem[]): void {
  appState.items = items;
  scheduleSave();
}

// -- Actions: Labels --

export function actionCycleLabel(itemId: string): void {
  const item = findItemInTree(appState.items, itemId);
  if (!item) return;
  const sorted = getLabels();
  const nextLabelId = cycleLabel(item.labelId, sorted);
  appState.items = updateItemLabel(appState.items, itemId, nextLabelId);
  scheduleSave();
}

export function actionSetLabel(itemId: string, labelId: string | null): void {
  appState.items = updateItemLabel(appState.items, itemId, labelId);
  scheduleSave();
}

export function actionSetLabels(labels: Label[]): void {
  appState.labels = labels;
  scheduleSave();
}

// -- Actions: Properties --

export function actionToggleProperty(itemId: string, propertyId: string): void {
  appState.items = updateItemProperty(appState.items, itemId, propertyId);
  scheduleSave();
}

export function actionSetProperties(properties: Property[]): void {
  appState.properties = properties;
  scheduleSave();
}

// -- Actions: Settings --

export function actionSetAlwaysOnTop(value: boolean): void {
  appState.settings = { ...appState.settings, alwaysOnTop: value };
  scheduleSave();
}

export function actionSetItemOrderMode(value: ItemOrderMode): void {
  appState = value === 'manual'
    ? {
        ...appState,
        settings: { ...appState.settings, itemOrderMode: 'manual' },
      }
    : applyAutomaticOrderMode(appState, value);
  scheduleSave();
}

// -- Actions: Search --

export function actionSetSearch(query: string): void {
  searchQuery = query;
}

// -- Helpers --

function getOrderedItems(): TodoItem[] {
  const orderMode = getItemOrderMode();
  if (orderMode === 'manual') return appState.items;
  return sortItems(appState.items, orderMode);
}

function applyAutomaticOrderMode(state: AppState, mode: Exclude<ItemOrderMode, 'manual'>): AppState {
  return {
    ...state,
    items: sortItems(state.items, mode),
    settings: {
      ...state.settings,
      itemOrderMode: 'manual',
    },
  };
}

function findItemInTree(items: TodoItem[], id: string): TodoItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findItemInTree(item.children, id);
    if (found) return found;
  }
  return null;
}

function updateItemLabel(items: TodoItem[], id: string, labelId: string | null): TodoItem[] {
  return items.map((item) => {
    if (item.id === id) {
      return { ...item, labelId, updatedAt: new Date().toISOString() };
    }
    if (item.children.length > 0) {
      return { ...item, children: updateItemLabel(item.children, id, labelId) };
    }
    return item;
  });
}

function updateItemProperty(items: TodoItem[], id: string, propertyId: string): TodoItem[] {
  return items.map((item) => {
    if (item.id === id) {
      const has = item.propertyIds.includes(propertyId);
      const propertyIds = has
        ? item.propertyIds.filter((p) => p !== propertyId)
        : [...item.propertyIds, propertyId];
      return { ...item, propertyIds, updatedAt: new Date().toISOString() };
    }
    if (item.children.length > 0) {
      return { ...item, children: updateItemProperty(item.children, id, propertyId) };
    }
    return item;
  });
}
