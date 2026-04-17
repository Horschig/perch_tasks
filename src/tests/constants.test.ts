import { describe, it, expect } from 'vitest';
import { DEFAULT_LABELS, DEFAULT_PROPERTIES, SCHEMA_VERSION, createDefaultState } from '../lib/constants';

describe('DEFAULT_LABELS', () => {
  it('has 4 default labels', () => {
    expect(DEFAULT_LABELS).toHaveLength(4);
  });

  it('labels are in ascending order', () => {
    for (let i = 1; i < DEFAULT_LABELS.length; i++) {
      expect(DEFAULT_LABELS[i].order).toBeGreaterThan(DEFAULT_LABELS[i - 1].order);
    }
  });

  it('each label has required fields', () => {
    for (const label of DEFAULT_LABELS) {
      expect(label.id).toBeTruthy();
      expect(label.name).toBeTruthy();
      expect(label.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof label.order).toBe('number');
    }
  });
});

describe('DEFAULT_PROPERTIES', () => {
  it('has 2 default properties', () => {
    expect(DEFAULT_PROPERTIES).toHaveLength(2);
  });

  it('each property has required fields', () => {
    for (const prop of DEFAULT_PROPERTIES) {
      expect(prop.id).toBeTruthy();
      expect(prop.name).toBeTruthy();
      expect(prop.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('createDefaultState', () => {
  it('creates a state with schema version', () => {
    const state = createDefaultState();
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('defaults to manual item ordering', () => {
    const state = createDefaultState();
    expect(state.settings.itemOrderMode).toBe('manual');
  });

  it('creates a state with empty items', () => {
    const state = createDefaultState();
    expect(state.items).toEqual([]);
  });

  it('creates independent copies', () => {
    const a = createDefaultState();
    const b = createDefaultState();
    a.labels.push({ id: 'x', name: 'x', color: '#000000', order: 99 });
    expect(b.labels).toHaveLength(4);
  });
});
