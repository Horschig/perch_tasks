import type { ItemOrderMode, TodoItem } from './types';
import { DEFAULT_PROPERTY_IDS } from './constants';
import { generateId } from './uuid';

export function createItem(text: string): TodoItem {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    text,
    labelId: null,
    note: '',
    noteCollapsed: true,
    propertyIds: [],
    children: [],
    collapsed: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function addItem(items: TodoItem[], text: string): TodoItem[] {
  return [...items, createItem(text)];
}

export function addChild(items: TodoItem[], parentId: string, text: string): TodoItem[] {
  return mapTree(items, (item) => {
    if (item.id === parentId) {
      return {
        ...item,
        collapsed: false,
        children: [...item.children, createItem(text)],
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });
}

export function removeItem(items: TodoItem[], id: string): TodoItem[] {
  const filtered = items.filter((item) => item.id !== id);
  return filtered.map((item) => ({
    ...item,
    children: removeItem(item.children, id),
  }));
}

export function findItem(items: TodoItem[], id: string): TodoItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findItem(item.children, id);
    if (found) return found;
  }
  return null;
}

export function toggleCollapse(items: TodoItem[], id: string): TodoItem[] {
  return mapTree(items, (item) => {
    if (item.id === id) {
      return { ...item, collapsed: !item.collapsed };
    }
    return item;
  });
}

export function updateItemText(items: TodoItem[], id: string, text: string): TodoItem[] {
  return mapTree(items, (item) => {
    if (item.id === id) {
      return { ...item, text, updatedAt: new Date().toISOString() };
    }
    return item;
  });
}

export function updateItemNote(items: TodoItem[], id: string, note: string): TodoItem[] {
  return mapTree(items, (item) => {
    if (item.id === id) {
      return { ...item, note, updatedAt: new Date().toISOString() };
    }
    return item;
  });
}

export function toggleItemNoteCollapsed(items: TodoItem[], id: string): TodoItem[] {
  return mapTree(items, (item) => {
    if (item.id === id) {
      return {
        ...item,
        noteCollapsed: !item.noteCollapsed,
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });
}

export function moveItem(
  items: TodoItem[],
  itemId: string,
  targetParentId: string | null,
  targetIndex: number,
): TodoItem[] {
  const siblingItems = targetParentId === null
    ? items
    : findItem(items, targetParentId)?.children ?? null;

  if (!siblingItems) return items;

  const itemIndex = siblingItems.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) return items;

  const orderedIds = siblingItems.map((item) => item.id);
  const [movedId] = orderedIds.splice(itemIndex, 1);
  const boundedIndex = Math.max(0, Math.min(targetIndex, orderedIds.length));
  orderedIds.splice(boundedIndex, 0, movedId);

  return reorderSiblings(items, targetParentId, orderedIds);
}

export function reorderSiblings(
  items: TodoItem[],
  parentId: string | null,
  orderedIds: string[],
): TodoItem[] {
  if (parentId === null) {
    return reorderList(items, orderedIds);
  }

  let changed = false;

  const nextItems = items.map((item) => {
    if (item.id === parentId) {
      const children = reorderList(item.children, orderedIds);
      if (children !== item.children) {
        changed = true;
        return {
          ...item,
          children,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    }

    if (item.children.length === 0) return item;

    const children = reorderSiblings(item.children, parentId, orderedIds);
    if (children !== item.children) {
      changed = true;
      return { ...item, children };
    }

    return item;
  });

  return changed ? nextItems : items;
}

export function sortItems(items: TodoItem[], mode: ItemOrderMode): TodoItem[] {
  if (mode === 'manual') return items;

  return items
    .map((item, index) => ({
      item: item.children.length > 0
        ? { ...item, children: sortItems(item.children, mode) }
        : item,
      index,
    }))
    .sort((left, right) => {
      const scoreDelta = getSortScore(right.item, mode) - getSortScore(left.item, mode);
      if (scoreDelta !== 0) return scoreDelta;
      return left.index - right.index;
    })
    .map(({ item }) => item);
}

function mapTree(
  items: TodoItem[],
  fn: (item: TodoItem) => TodoItem,
): TodoItem[] {
  return items.map((item) => {
    const mapped = fn(item);
    if (mapped.children === item.children && mapped !== item) {
      return { ...mapped, children: mapTree(item.children, fn) };
    }
    if (mapped === item) {
      const newChildren = mapTree(item.children, fn);
      if (newChildren === item.children) return item;
      return { ...item, children: newChildren };
    }
    return { ...mapped, children: mapTree(mapped.children, fn) };
  });
}

function reorderList(items: TodoItem[], orderedIds: string[]): TodoItem[] {
  if (orderedIds.length !== items.length) return items;

  const itemById = new Map(items.map((item) => [item.id, item]));
  if (orderedIds.some((id) => !itemById.has(id))) return items;

  const reordered = orderedIds.map((id) => itemById.get(id)!);
  const unchanged = reordered.every((item, index) => item === items[index]);

  return unchanged ? items : reordered;
}

function getSortScore(item: TodoItem, mode: ItemOrderMode): number {
  const isUrgent = item.propertyIds.includes(DEFAULT_PROPERTY_IDS.urgent);
  const isImportant = item.propertyIds.includes(DEFAULT_PROPERTY_IDS.important);

  switch (mode) {
    case 'urgent-first':
      return isUrgent ? 1 : 0;
    case 'important-first':
      return isImportant ? 1 : 0;
    case 'urgent-then-important':
      return Number(isUrgent) * 2 + Number(isImportant);
    default:
      return 0;
  }
}
