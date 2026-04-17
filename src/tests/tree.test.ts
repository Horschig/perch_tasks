import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addItem,
  addChild,
  removeItem,
  findItem,
  toggleCollapse,
  toggleItemNoteCollapsed,
  updateItemNote,
  updateItemText,
  moveItem,
  sortItems,
} from '../lib/tree';

vi.mock('../lib/uuid', () => ({
  generateId: vi.fn(() => 'test-id-' + Math.random().toString(36).slice(2, 8)),
}));

import type { TodoItem } from '../lib/types';

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

describe('addItem', () => {
  it('appends a new item to the list', () => {
    const result = addItem([], 'New task');
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('New task');
    expect(result[0].children).toEqual([]);
    expect(result[0].labelId).toBeNull();
    expect(result[0].propertyIds).toEqual([]);
    expect(result[0].collapsed).toBe(false);
  });

  it('preserves existing items', () => {
    const existing = [makeItem({ id: 'existing' })];
    const result = addItem(existing, 'New task');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('existing');
  });
});

describe('addChild', () => {
  it('adds a child to a top-level parent', () => {
    const items = [makeItem({ id: 'parent' })];
    const result = addChild(items, 'parent', 'Child task');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].text).toBe('Child task');
  });

  it('adds a child to a deeply nested parent', () => {
    const items = [
      makeItem({
        id: 'grandparent',
        children: [makeItem({ id: 'parent', children: [] })],
      }),
    ];
    const result = addChild(items, 'parent', 'Deep child');
    expect(result[0].children[0].children).toHaveLength(1);
    expect(result[0].children[0].children[0].text).toBe('Deep child');
  });

  it('auto-expands collapsed parent when adding child', () => {
    const items = [makeItem({ id: 'parent', collapsed: true })];
    const result = addChild(items, 'parent', 'Child');
    expect(result[0].collapsed).toBe(false);
  });

  it('returns unchanged array if parent not found', () => {
    const items = [makeItem({ id: 'a' })];
    const result = addChild(items, 'nonexistent', 'Child');
    expect(result).toEqual(items);
  });
});

describe('removeItem', () => {
  it('removes a top-level item', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];
    const result = removeItem(items, 'a');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  it('removes a nested item', () => {
    const items = [
      makeItem({
        id: 'parent',
        children: [makeItem({ id: 'child' })],
      }),
    ];
    const result = removeItem(items, 'child');
    expect(result[0].children).toHaveLength(0);
  });

  it('removes item and all its descendants', () => {
    const items = [
      makeItem({
        id: 'parent',
        children: [
          makeItem({
            id: 'child',
            children: [makeItem({ id: 'grandchild' })],
          }),
        ],
      }),
    ];
    const result = removeItem(items, 'child');
    expect(result[0].children).toHaveLength(0);
  });

  it('returns unchanged array if id not found', () => {
    const items = [makeItem({ id: 'a' })];
    const result = removeItem(items, 'nonexistent');
    expect(result).toEqual(items);
  });
});

describe('findItem', () => {
  it('finds a top-level item', () => {
    const items = [makeItem({ id: 'a', text: 'Found' })];
    expect(findItem(items, 'a')?.text).toBe('Found');
  });

  it('finds a deeply nested item', () => {
    const items = [
      makeItem({
        id: 'root',
        children: [
          makeItem({
            id: 'mid',
            children: [makeItem({ id: 'deep', text: 'Deep item' })],
          }),
        ],
      }),
    ];
    expect(findItem(items, 'deep')?.text).toBe('Deep item');
  });

  it('returns null for non-existent id', () => {
    expect(findItem([], 'nope')).toBeNull();
  });
});

describe('toggleCollapse', () => {
  it('collapses an expanded item', () => {
    const items = [makeItem({ id: 'a', collapsed: false })];
    const result = toggleCollapse(items, 'a');
    expect(result[0].collapsed).toBe(true);
  });

  it('expands a collapsed item', () => {
    const items = [makeItem({ id: 'a', collapsed: true })];
    const result = toggleCollapse(items, 'a');
    expect(result[0].collapsed).toBe(false);
  });

  it('toggles on a nested item', () => {
    const items = [
      makeItem({
        id: 'parent',
        children: [makeItem({ id: 'child', collapsed: false })],
      }),
    ];
    const result = toggleCollapse(items, 'child');
    expect(result[0].children[0].collapsed).toBe(true);
  });
});

describe('updateItemText', () => {
  it('updates text on a top-level item', () => {
    const items = [makeItem({ id: 'a', text: 'Old' })];
    const result = updateItemText(items, 'a', 'New');
    expect(result[0].text).toBe('New');
  });

  it('updates text on a nested item', () => {
    const items = [
      makeItem({
        id: 'parent',
        children: [makeItem({ id: 'child', text: 'Old' })],
      }),
    ];
    const result = updateItemText(items, 'child', 'New');
    expect(result[0].children[0].text).toBe('New');
  });

  it('updates the updatedAt timestamp', () => {
    const items = [makeItem({ id: 'a', updatedAt: '2000-01-01T00:00:00.000Z' })];
    const result = updateItemText(items, 'a', 'New');
    expect(result[0].updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
  });
});

describe('updateItemNote', () => {
  it('updates the note on a top-level item', () => {
    const items = [makeItem({ id: 'a' })];
    const result = updateItemNote(items, 'a', 'Bring the revised draft');

    expect(result[0].note).toBe('Bring the revised draft');
  });

  it('updates the note on a nested item', () => {
    const items = [
      makeItem({
        id: 'parent',
        children: [makeItem({ id: 'child' })],
      }),
    ];
    const result = updateItemNote(items, 'child', 'Nested note');

    expect(result[0].children[0].note).toBe('Nested note');
  });
});

describe('toggleItemNoteCollapsed', () => {
  it('expands a collapsed note on a top-level item', () => {
    const items = [makeItem({ id: 'a', note: 'Has note', noteCollapsed: true })];
    const result = toggleItemNoteCollapsed(items, 'a');

    expect(result[0].noteCollapsed).toBe(false);
  });

  it('toggles note visibility on a nested item', () => {
    const items = [
      makeItem({
        id: 'parent',
        children: [makeItem({ id: 'child', note: 'Nested note', noteCollapsed: false })],
      }),
    ];

    const result = toggleItemNoteCollapsed(items, 'child');

    expect(result[0].children[0].noteCollapsed).toBe(true);
  });
});

describe('moveItem', () => {
  it('reorders items within the same level', () => {
    const items = [
      makeItem({ id: 'a', text: 'First' }),
      makeItem({ id: 'b', text: 'Second' }),
      makeItem({ id: 'c', text: 'Third' }),
    ];
    const result = moveItem(items, 'c', null, 0);
    expect(result[0].text).toBe('Third');
    expect(result[1].text).toBe('First');
    expect(result[2].text).toBe('Second');
  });

  it('returns unchanged array if item not found', () => {
    const items = [makeItem({ id: 'a' })];
    const result = moveItem(items, 'nonexistent', null, 0);
    expect(result).toEqual(items);
  });

  it('reorders nested siblings within the same parent', () => {
    const items = [
      makeItem({
        id: 'parent',
        children: [
          makeItem({ id: 'child-a', text: 'First child' }),
          makeItem({ id: 'child-b', text: 'Second child' }),
        ],
      }),
    ];

    const result = moveItem(items, 'child-b', 'parent', 0);

    expect(result[0].children.map((child) => child.id)).toEqual(['child-b', 'child-a']);
  });
});

describe('sortItems', () => {
  it('prioritizes urgent items while preserving manual order for ties', () => {
    const items = [
      makeItem({ id: 'normal-1', text: 'Normal 1' }),
      makeItem({ id: 'urgent', text: 'Urgent', propertyIds: ['prop-urgent'] }),
      makeItem({ id: 'normal-2', text: 'Normal 2' }),
    ];

    const result = sortItems(items, 'urgent-first');

    expect(result.map((item) => item.id)).toEqual(['urgent', 'normal-1', 'normal-2']);
  });

  it('supports combined urgent-then-important ordering recursively', () => {
    const items = [
      makeItem({
        id: 'parent',
        children: [
          makeItem({ id: 'child-important', propertyIds: ['prop-important'] }),
          makeItem({ id: 'child-both', propertyIds: ['prop-urgent', 'prop-important'] }),
          makeItem({ id: 'child-urgent', propertyIds: ['prop-urgent'] }),
          makeItem({ id: 'child-normal' }),
        ],
      }),
    ];

    const result = sortItems(items, 'urgent-then-important');

    expect(result[0].children.map((child) => child.id)).toEqual([
      'child-both',
      'child-urgent',
      'child-important',
      'child-normal',
    ]);
  });
});
