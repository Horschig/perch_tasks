<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import {
    cursorPosition,
    currentMonitor,
    getCurrentWindow,
    monitorFromPoint,
    PhysicalPosition,
    PhysicalSize,
  } from '@tauri-apps/api/window';
  import { LazyStore } from '@tauri-apps/plugin-store';
  import Toolbar from './components/Toolbar.svelte';
  import TodoTree from './components/TodoTree.svelte';
  import Settings from './components/Settings.svelte';
  import ContextMenu from './components/ContextMenu.svelte';
  import { readAutostartEnabled, setAutostartEnabled as updateAutostartEnabled } from './lib/autostart';
  import type { DockEdge, Rect } from './lib/foldout';
  import { getCenteredFoldedRectForEdge, restoreExpandedRect, snapFoldedRect } from './lib/foldout';
  import {
    initState,
    getAutostartEnabled,
    getState,
    getFilteredItems,
    getLabels,
    getProperties,
    isInitialized,
    actionAddItem,
    actionReorderItems,
    actionSetAutostartEnabled,
    actionSetAlwaysOnTop,
    actionSetSearch,
    getSearchQuery,
  } from './lib/state.svelte';

  type ResizeDirection = 'East' | 'North' | 'NorthEast' | 'NorthWest' | 'South' | 'SouthEast' | 'SouthWest' | 'West';
  type ToolbarMode = 'search' | null;

  const DEFAULT_EXPANDED_SIZE = { width: 340, height: 520 };
  const DEFAULT_MIN_WINDOW_SIZE = { width: 280, height: 220 };
  const FOLD_DRAG_THRESHOLD = 6;
  const TOOLBAR_BOTTOM_OFFSET = 'var(--space-md)';

  let showSettings = $state(false);
  let toolbarMode = $state<ToolbarMode>(null);
  let showRootAddComposer = $state(true);
  let rootAddDraft = $state('');
  let restoreRootAddAfterSearch = $state(true);
  let contextMenu = $state<{ x: number; y: number; itemId: string } | null>(null);
  let hoveredAddTargetId = $state<string | null>(null);
  let activeChildComposerParentId = $state<string | null>(null);
  let activeNoteEditorItemId = $state<string | null>(null);
  let activeRenameItemId = $state<string | null>(null);
  let isFolded = $state(false);
  let foldedEdge = $state<DockEdge>('right');
  let foldedBounds = $state<Rect | null>(null);
  let expandedBounds = $state<Rect | null>(null);
  let autostartPending = $state(false);

  let foldPointerId: number | null = null;
  let foldPointerOrigin = { x: 0, y: 0 };
  let foldDragStartBounds: Rect | null = null;
  let foldDragScaleFactor = 1;
  let foldDidDrag = false;

  onMount(async () => {
    await invoke('migrate_legacy_store');

    const store = new LazyStore('perch-tasks.json');

    await initState({
      get: (key) => store.get(key),
      set: (key, value) => store.set(key, value as Record<string, unknown>),
      save: () => store.save(),
    });

    const appWindow = getCurrentWindow();
    const { settings } = getState();

    await appWindow.setAlwaysOnTop(settings.alwaysOnTop);
    void syncAutostartPreference();

    if (settings.startupMode === 'folded') {
      await handleFoldWindow();
      await revealMainWindow(appWindow);
      return;
    }

    await appWindow.setMinSize(new PhysicalSize(DEFAULT_MIN_WINDOW_SIZE.width, DEFAULT_MIN_WINDOW_SIZE.height));
    await revealMainWindow(appWindow);
  });

  async function revealMainWindow(appWindow = getCurrentWindow()) {
    await appWindow.show();
    await appWindow.unminimize();
    await appWindow.setFocus();
  }

  async function syncAutostartPreference() {
    try {
      const enabled = await readAutostartEnabled();
      if (enabled !== getAutostartEnabled()) {
        actionSetAutostartEnabled(enabled);
      }
    } catch (error) {
      console.warn('[autostart] failed to read startup registration', error);
    }
  }

  async function handleSetAutostartEnabled(value: boolean) {
    if (autostartPending) return;

    autostartPending = true;

    try {
      await updateAutostartEnabled(value);
      actionSetAutostartEnabled(value);
    } catch (error) {
      console.warn('[autostart] failed to update startup registration', error);
    } finally {
      autostartPending = false;
    }
  }

  function clearInlineUi() {
    hoveredAddTargetId = null;
    activeChildComposerParentId = null;
    activeNoteEditorItemId = null;
    activeRenameItemId = null;
  }

  function clearSearchState() {
    if (toolbarMode === 'search' || getSearchQuery().trim()) {
      actionSetSearch('');
    }
  }

  function closeSearch({ restoreAdd = restoreRootAddAfterSearch }: { restoreAdd?: boolean } = {}) {
    clearSearchState();
    toolbarMode = null;
    if (restoreAdd) {
      showRootAddComposer = true;
    }
  }

  function closeRootAddComposer() {
    showRootAddComposer = false;
    rootAddDraft = '';
  }

  function clearToolbarModeForInlineEditing() {
    if (toolbarMode === 'search' || getSearchQuery().trim()) {
      closeSearch();
    }
  }

  async function handleTogglePin() {
    const current = getState().settings.alwaysOnTop;
    const next = !current;
    actionSetAlwaysOnTop(next);
    await getCurrentWindow().setAlwaysOnTop(next);
  }

  function handleOpenSettings() {
    clearInlineUi();
    contextMenu = null;
    if (toolbarMode === 'search' || getSearchQuery().trim()) {
      closeSearch();
    }
    showSettings = !showSettings;
  }

  function handleOpenSearch() {
    clearInlineUi();
    contextMenu = null;

    if (toolbarMode === 'search') {
      closeSearch();
      return;
    }

    restoreRootAddAfterSearch = showRootAddComposer;
    showRootAddComposer = false;
    toolbarMode = 'search';
  }

  function handleOpenAdd() {
    if (toolbarMode === 'search') {
      closeSearch();
      return;
    }

    if (showRootAddComposer) {
      closeRootAddComposer();
      return;
    }

    showRootAddComposer = true;
  }

  function handleRootAddDraftInput(text: string) {
    rootAddDraft = text;
  }

  function handleAddItem() {
    const text = rootAddDraft.trim();

    if (!text) return;

    actionAddItem(text);
    rootAddDraft = '';
  }

  function handleCloseActiveToolbarMode() {
    if (toolbarMode === 'search') {
      closeSearch();
      return;
    }

    closeRootAddComposer();
  }

  function handleRequestAddChild(itemId: string) {
    clearToolbarModeForInlineEditing();
    contextMenu = null;
    activeRenameItemId = null;
    activeNoteEditorItemId = null;
    activeChildComposerParentId = itemId;
  }

  function handleCloseChildComposer() {
    activeChildComposerParentId = null;
  }

  function handleRequestRename(itemId: string) {
    clearToolbarModeForInlineEditing();
    contextMenu = null;
    activeChildComposerParentId = null;
    activeNoteEditorItemId = null;
    activeRenameItemId = itemId;
  }

  function handleRequestEditNote(itemId: string) {
    clearToolbarModeForInlineEditing();
    contextMenu = null;
    activeChildComposerParentId = null;
    activeRenameItemId = null;
    activeNoteEditorItemId = itemId;
  }

  function handleHoverAddTarget(itemId: string | null) {
    hoveredAddTargetId = itemId;
  }

  function handleNoteEditorHandled(itemId: string) {
    if (activeNoteEditorItemId === itemId) {
      activeNoteEditorItemId = null;
    }
  }

  function handleRenameHandled(itemId: string) {
    if (activeRenameItemId === itemId) {
      activeRenameItemId = null;
    }
  }

  function handleReorderItems(parentId: string | null, orderedIds: string[]) {
    actionReorderItems(parentId, orderedIds);
  }

  async function handleResizeMousedown(event: MouseEvent, direction: ResizeDirection) {
    event.preventDefault();
    await getCurrentWindow().startResizeDragging(direction);
  }

  async function handleDragMousedown(event: MouseEvent) {
    event.preventDefault();
    await getCurrentWindow().startDragging();
  }

  function handleContextMenu(event: { x: number; y: number; itemId: string }) {
    clearInlineUi();
    contextMenu = event;
  }

  function handleCloseContextMenu() {
    contextMenu = null;
  }

  async function handleToggleFold() {
    if (isFolded) {
      await handleUnfoldWindow();
      return;
    }

    await handleFoldWindow();
  }

  async function handleFoldWindow() {
    clearInlineUi();
    contextMenu = null;
    showSettings = false;
    closeSearch({ restoreAdd: false });
    closeRootAddComposer();

    const appWindow = getCurrentWindow();
    const currentRect = await readWindowRect();
    const monitor = await getMonitorForRect(currentRect);

    if (!monitor) return;

    const snapped = {
      edge: 'right' as const,
      rect: getCenteredFoldedRectForEdge('right', monitor),
    };

    await appWindow.setMinSize(undefined);
    await appWindow.setResizable(false);
    await applyWindowRect(snapped.rect);

    expandedBounds = currentRect;
    foldedEdge = snapped.edge;
    foldedBounds = snapped.rect;
    isFolded = true;
  }

  async function handleUnfoldWindow() {
    if (!foldedBounds) return;

    const appWindow = getCurrentWindow();
    const monitor = await getMonitorForRect(foldedBounds);

    if (!monitor) return;

    const size = expandedBounds
      ? { width: expandedBounds.width, height: expandedBounds.height }
      : DEFAULT_EXPANDED_SIZE;
    const nextRect = restoreExpandedRect(size, monitor, foldedEdge, foldedBounds);

    await appWindow.setResizable(true);
    await applyWindowRect(nextRect);
    await appWindow.setMinSize(new PhysicalSize(DEFAULT_MIN_WINDOW_SIZE.width, DEFAULT_MIN_WINDOW_SIZE.height));

    isFolded = false;
    foldedBounds = null;
    expandedBounds = nextRect;
    await appWindow.setFocus();
  }

  async function handleFoldoutPointerDown(event: PointerEvent) {
    if (!foldedBounds) return;

    const pointerPosition = readPointerScreenPosition(event);
    foldPointerId = event.pointerId;
    foldPointerOrigin = pointerPosition;
    foldDragStartBounds = foldedBounds;
    foldDidDrag = false;

    const monitor = await getMonitorForRect(foldedBounds);
    foldDragScaleFactor = monitor?.scaleFactor ?? 1;
    const target = event.currentTarget as HTMLElement | null;
    target?.setPointerCapture?.(event.pointerId);
  }

  async function handleFoldoutPointerMove(event: PointerEvent) {
    if (event.pointerId !== foldPointerId || !foldDragStartBounds || !foldedBounds) return;

    const pointerPosition = readPointerScreenPosition(event);
    const deltaX = Math.round((pointerPosition.x - foldPointerOrigin.x) * foldDragScaleFactor);
    const deltaY = Math.round((pointerPosition.y - foldPointerOrigin.y) * foldDragScaleFactor);

    if (!foldDidDrag && Math.abs(deltaX) < FOLD_DRAG_THRESHOLD && Math.abs(deltaY) < FOLD_DRAG_THRESHOLD) {
      return;
    }

    foldDidDrag = true;

    const nextRect = {
      ...foldedBounds,
      x: foldDragStartBounds.x + deltaX,
      y: foldDragStartBounds.y + deltaY,
    };

    foldedBounds = nextRect;
    await getCurrentWindow().setPosition(new PhysicalPosition(nextRect.x, nextRect.y));
  }

  async function handleFoldoutPointerUp(event: PointerEvent) {
    if (event.pointerId !== foldPointerId) return;

    const target = event.currentTarget as HTMLElement | null;
    target?.releasePointerCapture?.(event.pointerId);

    const wasDrag = foldDidDrag;
    foldPointerId = null;
    foldDragStartBounds = null;
    foldDidDrag = false;

    if (!foldedBounds) return;

    if (!wasDrag) {
      await handleUnfoldWindow();
      return;
    }

    const pointer = await cursorPosition();
    const monitor = (await monitorFromPoint(pointer.x, pointer.y)) ?? await getMonitorForRect(foldedBounds);

    if (!monitor) return;

    await resnapFoldedWindow(foldedBounds, monitor);
  }

  async function handleFoldoutPointerCancel(event: PointerEvent) {
    if (event.pointerId !== foldPointerId) return;

    const target = event.currentTarget as HTMLElement | null;
    target?.releasePointerCapture?.(event.pointerId);
    const nextBounds = foldedBounds;
    foldPointerId = null;
    foldDragStartBounds = null;
    foldDidDrag = false;

    if (!nextBounds) return;

    await resnapFoldedWindow(nextBounds);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (isFolded) return;

    if (event.key === 'f' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      clearInlineUi();
      contextMenu = null;
      if (toolbarMode !== 'search') {
        restoreRootAddAfterSearch = showRootAddComposer;
        showRootAddComposer = false;
        toolbarMode = 'search';
      }
    }

    if (event.key === 'Escape') {
      if (contextMenu) {
        contextMenu = null;
        return;
      }
      if (activeChildComposerParentId) {
        activeChildComposerParentId = null;
        return;
      }
      if (toolbarMode === 'search') {
        closeSearch();
        return;
      }
      if (showSettings) showSettings = false;
    }
  }

  async function readWindowRect(): Promise<Rect> {
    const appWindow = getCurrentWindow();
    const [position, size] = await Promise.all([appWindow.outerPosition(), appWindow.outerSize()]);

    return {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
    };
  }

  async function applyWindowRect(rect: Rect) {
    const appWindow = getCurrentWindow();
    await appWindow.setSize(new PhysicalSize(rect.width, rect.height));
    await appWindow.setPosition(new PhysicalPosition(rect.x, rect.y));
  }

  async function getMonitorForRect(rect: Rect) {
    return (await monitorFromPoint(
      Math.round(rect.x + rect.width / 2),
      Math.round(rect.y + rect.height / 2),
    )) ?? (await currentMonitor());
  }

  async function resnapFoldedWindow(anchorRect: Rect, monitor?: Awaited<ReturnType<typeof currentMonitor>>) {
    const resolvedMonitor = monitor ?? await getMonitorForRect(anchorRect);

    if (!resolvedMonitor) return;

    const snapped = snapFoldedRect(anchorRect, resolvedMonitor);
    foldedEdge = snapped.edge;
    foldedBounds = snapped.rect;
    await applyWindowRect(snapped.rect);
  }

  function readPointerScreenPosition(event: PointerEvent) {
    const clientX = Number.isFinite(event.clientX) ? event.clientX : 0;
    const clientY = Number.isFinite(event.clientY) ? event.clientY : 0;
    const hasUsableScreenCoordinates = Number.isFinite(event.screenX)
      && Number.isFinite(event.screenY)
      && !(event.screenX === 0 && event.screenY === 0 && (clientX !== 0 || clientY !== 0));

    if (hasUsableScreenCoordinates) {
      return { x: event.screenX, y: event.screenY };
    }

    return { x: clientX, y: clientY };
  }

  function getFoldoutArrow(edge: DockEdge): string {
    switch (edge) {
      case 'left':
        return '⇥';
      case 'right':
        return '⇤';
      case 'top':
        return '⇩';
      case 'bottom':
        return '⇧';
      default:
        return '⇤';
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isInitialized()}
  {#if isFolded && foldedBounds}
    <div class="foldout-shell" class:vertical={foldedEdge === 'left' || foldedEdge === 'right'}>
      <button
        class="foldout-tab"
        class:vertical={foldedEdge === 'left' || foldedEdge === 'right'}
        onpointerdown={handleFoldoutPointerDown}
        onpointermove={handleFoldoutPointerMove}
        onpointerup={handleFoldoutPointerUp}
        onpointercancel={handleFoldoutPointerCancel}
        aria-label="Open todo list"
        title="Click to unfold. Drag to move to another screen edge."
      >
        <span class="foldout-arrow">{getFoldoutArrow(foldedEdge)}</span>
      </button>
    </div>
  {:else}
    <div class="drag-handle" onmousedown={handleDragMousedown} role="presentation"></div>

    <main class="content">
      {#if getFilteredItems().length === 0 && getSearchQuery()}
        <div class="empty-state">
          <p class="empty-text">No matches found</p>
        </div>
      {:else}
        <div class="content-stack">
          {#if getFilteredItems().length === 0}
            <div class="empty-state">
              <p class="empty-icon">📝</p>
              <p class="empty-text">No todos yet</p>
              <p class="empty-hint">Use the pen in the toolbar to start a note.</p>
            </div>
          {:else}
            <TodoTree
              items={getFilteredItems()}
              labels={getLabels()}
              properties={getProperties()}
              parentItemId={null}
              depth={0}
              canReorder={getState().settings.itemOrderMode === 'manual' && !getSearchQuery().trim()}
              searchQuery={getSearchQuery()}
              {hoveredAddTargetId}
              onContextMenu={handleContextMenu}
              {activeChildComposerParentId}
              {activeNoteEditorItemId}
              {activeRenameItemId}
              onHoverAddTarget={handleHoverAddTarget}
              onNoteEditorHandled={handleNoteEditorHandled}
              onReorderItems={handleReorderItems}
              onRequestAddChild={handleRequestAddChild}
              onCloseChildComposer={handleCloseChildComposer}
              onRenameHandled={handleRenameHandled}
            />
          {/if}
        </div>
      {/if}
    </main>

    <Toolbar
      bottomOffset={TOOLBAR_BOTTOM_OFFSET}
      showRootAddComposer={showRootAddComposer && toolbarMode !== 'search'}
      showSearchComposer={toolbarMode === 'search'}
      searchQuery={getSearchQuery()}
      addDraft={rootAddDraft}
      onToggleSearch={handleOpenSearch}
      onToggleAdd={handleOpenAdd}
      onToggleFold={handleToggleFold}
      onSearchInput={(q) => actionSetSearch(q)}
      onAddDraftInput={handleRootAddDraftInput}
      onSubmitAdd={handleAddItem}
      onCloseActiveMode={handleCloseActiveToolbarMode}
      onOpenSettings={handleOpenSettings}
    />

    {#if showSettings}
      <Settings
        onClose={() => { showSettings = false; }}
        autostartEnabled={getAutostartEnabled()}
        {autostartPending}
        onSetAutostartEnabled={handleSetAutostartEnabled}
      />
    {/if}

    {#if contextMenu}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        itemId={contextMenu.itemId}
        properties={getProperties()}
        onEditNote={handleRequestEditNote}
        onRename={handleRequestRename}
        onClose={handleCloseContextMenu}
      />
    {/if}

    <div class="resize-handle resize-n" onmousedown={(e) => handleResizeMousedown(e, 'North')} role="presentation"></div>
    <div class="resize-handle resize-s" onmousedown={(e) => handleResizeMousedown(e, 'South')} role="presentation"></div>
    <div class="resize-handle resize-e" onmousedown={(e) => handleResizeMousedown(e, 'East')} role="presentation"></div>
    <div class="resize-handle resize-w" onmousedown={(e) => handleResizeMousedown(e, 'West')} role="presentation"></div>
    <div class="resize-handle resize-ne" onmousedown={(e) => handleResizeMousedown(e, 'NorthEast')} role="presentation"></div>
    <div class="resize-handle resize-nw" onmousedown={(e) => handleResizeMousedown(e, 'NorthWest')} role="presentation"></div>
    <div class="resize-handle resize-se" onmousedown={(e) => handleResizeMousedown(e, 'SouthEast')} role="presentation"></div>
    <div class="resize-handle resize-sw" onmousedown={(e) => handleResizeMousedown(e, 'SouthWest')} role="presentation"></div>
  {/if}
{:else}
  <div class="loading">
    <p>Loading...</p>
  </div>
{/if}

<style>
  .content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: calc(24px + var(--space-sm)) var(--space-md) calc(64px + var(--space-md));
    position: relative;
  }

  .content-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    align-items: flex-start;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    gap: var(--space-xs);
    color: var(--color-text-tertiary);
    align-self: stretch;
  }

  .empty-icon {
    font-size: 32px;
  }

  .empty-text {
    font-size: 14px;
    font-weight: 500;
  }

  .empty-hint {
    font-size: 12px;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: var(--color-text-tertiary);
  }

  /* Drag handle — invisible strip at the top for window dragging */
  .drag-handle {
    position: fixed;
    top: 0;
    left: 8px;
    right: 8px;
    height: 24px;
    z-index: 100;
    cursor: grab;
    -webkit-app-region: drag;
  }

  .foldout-shell {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--glass-bg) 92%, var(--color-panel-solid));
    box-shadow: var(--glass-inner-shadow);
  }

  .foldout-shell.vertical {
    align-items: stretch;
  }

  .foldout-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    width: 100%;
    height: 100%;
    padding: var(--space-sm);
    border-radius: 0;
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-panel-solid) 96%, white 4%), color-mix(in srgb, var(--glass-bg) 90%, var(--color-panel-solid)));
    color: var(--color-text-primary);
    box-shadow: inset 0 0 0 1px var(--glass-border);
    backdrop-filter: blur(calc(var(--glass-blur) * 1.15));
    -webkit-backdrop-filter: blur(calc(var(--glass-blur) * 1.15));
  }

  .foldout-tab.vertical {
    flex-direction: column;
  }

  .foldout-arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-bg-active) 72%, transparent);
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    box-shadow: var(--shadow-sm);
  }

  /* Resize handles */
  .resize-handle {
    position: fixed;
    z-index: 9999;
  }
  .resize-n  { top: 0; left: 8px; right: 8px; height: 4px; cursor: n-resize; }
  .resize-s  { bottom: 0; left: 8px; right: 8px; height: 4px; cursor: s-resize; }
  .resize-e  { top: 8px; right: 0; bottom: 8px; width: 4px; cursor: e-resize; }
  .resize-w  { top: 8px; left: 0; bottom: 8px; width: 4px; cursor: w-resize; }
  .resize-ne { top: 0; right: 0; width: 8px; height: 8px; cursor: ne-resize; }
  .resize-nw { top: 0; left: 0; width: 8px; height: 8px; cursor: nw-resize; }
  .resize-se { bottom: 0; right: 0; width: 8px; height: 8px; cursor: se-resize; }
  .resize-sw { bottom: 0; left: 0; width: 8px; height: 8px; cursor: sw-resize; }
</style>
