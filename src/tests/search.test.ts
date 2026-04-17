import { describe, it, expect } from 'vitest';
import { filterTree, highlightText } from '../lib/search';
import type { TodoItem } from '../lib/types';

function makeItem(id: string, text: string, children: TodoItem[] = []): TodoItem {
  return {
    id,
    text,
    labelId: null,
    note: '',
    noteCollapsed: true,
    propertyIds: [],
    children,
    collapsed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('filterTree', () => {
  it('returns all items when query is empty', () => {
    const items = [makeItem('a', 'Task A'), makeItem('b', 'Task B')];
    expect(filterTree(items, '')).toEqual(items);
  });

  it('filters out non-matching items', () => {
    const items = [makeItem('a', 'Call Mark'), makeItem('b', 'Draft email')];
    const result = filterTree(items, 'call');
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Call Mark');
  });

  it('is case-insensitive', () => {
    const items = [makeItem('a', 'Call Mark')];
    const result = filterTree(items, 'CALL');
    expect(result).toHaveLength(1);
  });

  it('keeps parent when child matches', () => {
    const items = [
      makeItem('parent', 'Parent', [makeItem('child', 'Matching child')]),
    ];
    const result = filterTree(items, 'matching');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('parent');
    expect(result[0].children).toHaveLength(1);
  });

  it('hides non-matching children', () => {
    const items = [
      makeItem('parent', 'Parent', [
        makeItem('c1', 'Matching'),
        makeItem('c2', 'Not this'),
      ]),
    ];
    const result = filterTree(items, 'matching');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe('c1');
  });

  it('preserves full ancestor chain for deep match', () => {
    const items = [
      makeItem('root', 'Root', [
        makeItem('mid', 'Middle', [makeItem('deep', 'Deep match')]),
      ]),
    ];
    const result = filterTree(items, 'deep');
    expect(result).toHaveLength(1);
    expect(result[0].children[0].children[0].text).toBe('Deep match');
  });

  it('returns empty array when nothing matches', () => {
    const items = [makeItem('a', 'Task A')];
    expect(filterTree(items, 'zzz')).toEqual([]);
  });
});

describe('highlightText', () => {
  it('returns single segment for empty query', () => {
    const result = highlightText('Hello', '');
    expect(result).toEqual([{ text: 'Hello', highlight: false }]);
  });

  it('highlights matching portion', () => {
    const result = highlightText('Call Mark', 'mark');
    expect(result).toEqual([
      { text: 'Call ', highlight: false },
      { text: 'Mark', highlight: true },
    ]);
  });

  it('highlights multiple occurrences', () => {
    const result = highlightText('abc abc', 'abc');
    expect(result).toEqual([
      { text: 'abc', highlight: true },
      { text: ' ', highlight: false },
      { text: 'abc', highlight: true },
    ]);
  });

  it('is case-insensitive', () => {
    const result = highlightText('Hello HELLO', 'hello');
    expect(result).toEqual([
      { text: 'Hello', highlight: true },
      { text: ' ', highlight: false },
      { text: 'HELLO', highlight: true },
    ]);
  });
});
