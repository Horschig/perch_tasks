import { describe, it, expect } from 'vitest';
import { cycleLabel } from '../lib/labels';
import type { Label } from '../lib/types';

const labels: Label[] = [
  { id: 'a', name: 'on hold', color: '#999', order: 0 },
  { id: 'b', name: 'in progress', color: '#00f', order: 1 },
  { id: 'c', name: 'done', color: '#0f0', order: 2 },
];

describe('cycleLabel', () => {
  it('returns first label when current is null', () => {
    expect(cycleLabel(null, labels)).toBe('a');
  });

  it('cycles from first to second', () => {
    expect(cycleLabel('a', labels)).toBe('b');
  });

  it('cycles from second to third', () => {
    expect(cycleLabel('b', labels)).toBe('c');
  });

  it('cycles from last back to null', () => {
    expect(cycleLabel('c', labels)).toBeNull();
  });

  it('returns null when current label not found in list', () => {
    expect(cycleLabel('deleted-id', labels)).toBeNull();
  });

  it('returns null when labels list is empty', () => {
    expect(cycleLabel(null, [])).toBeNull();
  });

  it('respects sort order', () => {
    const reversed: Label[] = [
      { id: 'c', name: 'done', color: '#0f0', order: 2 },
      { id: 'a', name: 'on hold', color: '#999', order: 0 },
      { id: 'b', name: 'in progress', color: '#00f', order: 1 },
    ];
    // Should still cycle in order: a -> b -> c -> null
    expect(cycleLabel(null, reversed)).toBe('a');
    expect(cycleLabel('a', reversed)).toBe('b');
    expect(cycleLabel('b', reversed)).toBe('c');
  });
});
