export type DockEdge = 'left' | 'right' | 'top' | 'bottom';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MonitorLike {
  position: { x: number; y: number };
  size: { width: number; height: number };
  workArea: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  };
}

export const FOLDED_TAB_THICKNESS = 52;
export const FOLDED_TAB_LENGTH = 140;

export function detectReservedEdge(monitor: MonitorLike): DockEdge | null {
  const topInset = monitor.workArea.position.y - monitor.position.y;
  const leftInset = monitor.workArea.position.x - monitor.position.x;
  const rightInset = monitor.position.x + monitor.size.width
    - (monitor.workArea.position.x + monitor.workArea.size.width);
  const bottomInset = monitor.position.y + monitor.size.height
    - (monitor.workArea.position.y + monitor.workArea.size.height);

  const candidates: Array<{ edge: DockEdge; inset: number }> = [
    { edge: 'top', inset: topInset },
    { edge: 'left', inset: leftInset },
    { edge: 'right', inset: rightInset },
    { edge: 'bottom', inset: bottomInset },
  ];

  const reserved = candidates
    .filter((candidate) => candidate.inset > 0)
    .sort((left, right) => right.inset - left.inset)[0];

  return reserved?.edge ?? null;
}

export function getAllowedDockEdges(monitor: MonitorLike): DockEdge[] {
  const reservedEdge = detectReservedEdge(monitor);
  return ['left', 'right', 'top', 'bottom'].filter((edge) => edge !== reservedEdge) as DockEdge[];
}

export function getFoldedRectForEdge(edge: DockEdge): Pick<Rect, 'width' | 'height'> {
  if (edge === 'left' || edge === 'right') {
    return { width: FOLDED_TAB_THICKNESS, height: FOLDED_TAB_LENGTH };
  }

  return { width: FOLDED_TAB_LENGTH, height: FOLDED_TAB_THICKNESS };
}

export function getCenteredFoldedRectForEdge(edge: DockEdge, monitor: MonitorLike): Rect {
  const foldedSize = getFoldedRectForEdge(edge);
  const workAreaLeft = monitor.workArea.position.x;
  const workAreaTop = monitor.workArea.position.y;
  const workAreaRight = workAreaLeft + monitor.workArea.size.width;
  const workAreaBottom = workAreaTop + monitor.workArea.size.height;

  if (edge === 'left') {
    return {
      x: workAreaLeft,
      y: workAreaTop + Math.round((monitor.workArea.size.height - foldedSize.height) / 2),
      width: foldedSize.width,
      height: foldedSize.height,
    };
  }

  if (edge === 'right') {
    return {
      x: workAreaRight - foldedSize.width,
      y: workAreaTop + Math.round((monitor.workArea.size.height - foldedSize.height) / 2),
      width: foldedSize.width,
      height: foldedSize.height,
    };
  }

  if (edge === 'top') {
    return {
      x: workAreaLeft + Math.round((monitor.workArea.size.width - foldedSize.width) / 2),
      y: workAreaTop,
      width: foldedSize.width,
      height: foldedSize.height,
    };
  }

  return {
    x: workAreaLeft + Math.round((monitor.workArea.size.width - foldedSize.width) / 2),
    y: workAreaBottom - foldedSize.height,
    width: foldedSize.width,
    height: foldedSize.height,
  };
}

export function snapFoldedRect(
  rect: Rect,
  monitor: MonitorLike,
  preferredEdge?: DockEdge,
): { edge: DockEdge; rect: Rect } {
  const allowedEdges = getAllowedDockEdges(monitor);
  const edge = preferredEdge && allowedEdges.includes(preferredEdge)
    ? preferredEdge
    : getNearestDockEdge(rect, monitor, allowedEdges);
  const foldedSize = getFoldedRectForEdge(edge);
  const workAreaLeft = monitor.workArea.position.x;
  const workAreaTop = monitor.workArea.position.y;
  const workAreaRight = workAreaLeft + monitor.workArea.size.width;
  const workAreaBottom = workAreaTop + monitor.workArea.size.height;

  if (edge === 'left') {
    return {
      edge,
      rect: {
        x: workAreaLeft,
        y: clamp(rect.y, workAreaTop, workAreaBottom - foldedSize.height),
        width: foldedSize.width,
        height: foldedSize.height,
      },
    };
  }

  if (edge === 'right') {
    return {
      edge,
      rect: {
        x: workAreaRight - foldedSize.width,
        y: clamp(rect.y, workAreaTop, workAreaBottom - foldedSize.height),
        width: foldedSize.width,
        height: foldedSize.height,
      },
    };
  }

  if (edge === 'top') {
    return {
      edge,
      rect: {
        x: clamp(rect.x, workAreaLeft, workAreaRight - foldedSize.width),
        y: workAreaTop,
        width: foldedSize.width,
        height: foldedSize.height,
      },
    };
  }

  return {
    edge,
    rect: {
      x: clamp(rect.x, workAreaLeft, workAreaRight - foldedSize.width),
      y: workAreaBottom - foldedSize.height,
      width: foldedSize.width,
      height: foldedSize.height,
    },
  };
}

export function restoreExpandedRect(
  size: Pick<Rect, 'width' | 'height'>,
  monitor: MonitorLike,
  edge: DockEdge,
  anchorRect: Rect,
): Rect {
  const workAreaLeft = monitor.workArea.position.x;
  const workAreaTop = monitor.workArea.position.y;
  const workAreaRight = workAreaLeft + monitor.workArea.size.width;
  const workAreaBottom = workAreaTop + monitor.workArea.size.height;

  if (edge === 'left') {
    return {
      x: workAreaLeft,
      y: clamp(
        Math.round(anchorRect.y + anchorRect.height / 2 - size.height / 2),
        workAreaTop,
        workAreaBottom - size.height,
      ),
      width: size.width,
      height: size.height,
    };
  }

  if (edge === 'right') {
    return {
      x: workAreaRight - size.width,
      y: clamp(
        Math.round(anchorRect.y + anchorRect.height / 2 - size.height / 2),
        workAreaTop,
        workAreaBottom - size.height,
      ),
      width: size.width,
      height: size.height,
    };
  }

  if (edge === 'top') {
    return {
      x: clamp(
        Math.round(anchorRect.x + anchorRect.width / 2 - size.width / 2),
        workAreaLeft,
        workAreaRight - size.width,
      ),
      y: workAreaTop,
      width: size.width,
      height: size.height,
    };
  }

  return {
    x: clamp(
      Math.round(anchorRect.x + anchorRect.width / 2 - size.width / 2),
      workAreaLeft,
      workAreaRight - size.width,
    ),
    y: workAreaBottom - size.height,
    width: size.width,
    height: size.height,
  };
}

function getNearestDockEdge(rect: Rect, monitor: MonitorLike, allowedEdges: DockEdge[]): DockEdge {
  const workAreaLeft = monitor.workArea.position.x;
  const workAreaTop = monitor.workArea.position.y;
  const workAreaRight = workAreaLeft + monitor.workArea.size.width;
  const workAreaBottom = workAreaTop + monitor.workArea.size.height;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  const allowedEdgeSet = new Set<DockEdge>(allowedEdges);
  const distances = [
    { edge: 'left', distance: Math.abs(centerX - workAreaLeft) },
    { edge: 'right', distance: Math.abs(workAreaRight - centerX) },
    { edge: 'top', distance: Math.abs(centerY - workAreaTop) },
    { edge: 'bottom', distance: Math.abs(workAreaBottom - centerY) },
  ] satisfies Array<{ edge: DockEdge; distance: number }>;

  const eligibleDistances = distances.filter((entry) => allowedEdgeSet.has(entry.edge));

  return eligibleDistances.sort((left, right) => left.distance - right.distance)[0]?.edge ?? 'right';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}