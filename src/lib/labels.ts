import type { Label } from './types';

export function cycleLabel(currentLabelId: string | null, labels: Label[]): string | null {
  if (labels.length === 0) return null;

  const sorted = [...labels].sort((a, b) => a.order - b.order);

  if (currentLabelId === null) {
    return sorted[0].id;
  }

  const currentIndex = sorted.findIndex((l) => l.id === currentLabelId);
  if (currentIndex === -1) return null;

  const nextIndex = currentIndex + 1;
  if (nextIndex >= sorted.length) return null;

  return sorted[nextIndex].id;
}
