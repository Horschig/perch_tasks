import { describe, expect, it } from 'vitest';
import {
  detectReservedEdge,
  getCenteredFoldedRectForEdge,
  getAllowedDockEdges,
  restoreExpandedRect,
  snapFoldedRect,
} from '../lib/foldout';

const monitor = {
  name: 'Primary',
  position: { x: 0, y: 0 },
  size: { width: 1920, height: 1080 },
  scaleFactor: 1,
  workArea: {
    position: { x: 0, y: 0 },
    size: { width: 1920, height: 1040 },
  },
};

describe('foldout helpers', () => {
  it('detects the taskbar edge from the monitor work area', () => {
    expect(detectReservedEdge(monitor)).toBe('bottom');
    expect(getAllowedDockEdges(monitor)).toEqual(['left', 'right', 'top']);
  });

  it('snaps a folded tab to the nearest allowed edge and clamps it to the work area', () => {
    const result = snapFoldedRect(
      { x: 1860, y: 980, width: 52, height: 140 },
      monitor,
    );

    expect(result.edge).toBe('right');
    expect(result.rect.x).toBe(1868);
    expect(result.rect.y).toBe(900);
  });

  it('centers the default folded tab on the requested edge', () => {
    const rect = getCenteredFoldedRectForEdge('right', monitor);

    expect(rect).toEqual({ x: 1868, y: 450, width: 52, height: 140 });
  });

  it('restores the expanded window bounds anchored to the current dock edge', () => {
    const rect = restoreExpandedRect(
      { width: 340, height: 520 },
      monitor,
      'left',
      { x: 0, y: 320, width: 52, height: 140 },
    );

    expect(rect).toEqual({ x: 0, y: 130, width: 340, height: 520 });
  });
});