<script lang="ts">
  import { tick } from 'svelte';
  import { dragHandle } from 'svelte-dnd-action';
  import type { TodoItem, Label, Property } from '../lib/types';
  import { highlightText } from '../lib/search';
  import {
    actionCycleLabel,
    actionRemoveItem,
    actionToggleCollapse,
    actionToggleItemNoteCollapsed,
    actionUpdateItemNote,
    actionUpdateItemText,
  } from '../lib/state.svelte';

  interface Props {
    item: TodoItem;
    labels: Label[];
    properties: Property[];
    depth: number;
    reorderEnabled: boolean;
    searchQuery: string;
    onContextMenu: (e: { x: number; y: number; itemId: string }) => void;
    showAddChildTrigger?: boolean;
    onRequestAddChild?: (itemId: string) => void;
    activeNoteEditorItemId: string | null;
    activeRenameItemId: string | null;
    onNoteEditorHandled: (itemId: string) => void;
    onRenameHandled: (itemId: string) => void;
  }

  let {
    item,
    labels,
    properties,
    depth,
    reorderEnabled,
    searchQuery,
    onContextMenu,
    showAddChildTrigger = false,
    onRequestAddChild = () => {},
    activeNoteEditorItemId,
    activeRenameItemId,
    onNoteEditorHandled,
    onRenameHandled,
  }: Props = $props();

  let editing = $state(false);
  let editText = $state('');
  let noteEditing = $state(false);
  let noteText = $state('');
  let hovered = $state(false);
  let rowFocused = $state(false);
  let editInput: HTMLInputElement | undefined = $state();
  let noteInput: HTMLTextAreaElement | undefined = $state();
  let swipeTrackEl: HTMLDivElement | undefined = $state();
  let swipeOffset = $state(0);

  let activeGestureSource: 'pointer' | 'mouse' | null = null;
  let pointerId: number | null = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerStartOffset = 0;
  let pointerTracking = false;
  let pointerSwiping = $state(false);
  let suppressNextRowClick = false;

  const DELETE_ACTION_WIDTH = 88;
  const DELETE_COMMIT_THRESHOLD = 72;
  const SWIPE_ACTIVATION_THRESHOLD = 12;

  const hasChildren = $derived(item.children.length > 0);
  const hasNote = $derived(Boolean(item.note.trim()));
  const isNoteExpanded = $derived(noteEditing || (hasNote && !item.noteCollapsed));
  const isSearchMode = $derived(Boolean(searchQuery.trim()));
  const isExpanded = $derived(!hasChildren ? false : isSearchMode || !item.collapsed);
  const currentLabel = $derived(labels.find((l) => l.id === item.labelId) ?? null);
  const assignedProperties = $derived(
    properties.filter((p) => item.propertyIds.includes(p.id))
  );
  const textSegments = $derived(highlightText(item.text, searchQuery));

  const propertyBackground = $derived.by(() => {
    if (assignedProperties.length === 0) return '';
    const colors = assignedProperties.slice(0, 5).map((p) => p.color);
    if (colors.length === 1) {
      return `radial-gradient(circle at 50% 50%, color-mix(in srgb, ${colors[0]} 18%, transparent) 0%, transparent 70%)`;
    }
    // Overlapping radial blobs at scattered positions for a mesh/sparkle effect
    const positions = [
      '20% 25%', '80% 20%', '50% 75%', '25% 65%', '75% 55%',
    ];
    const gradients = colors.map((c, i) => {
      const pos = positions[i % positions.length];
      return `radial-gradient(ellipse at ${pos}, color-mix(in srgb, ${c} 20%, transparent) 0%, transparent 60%)`;
    });
    return gradients.join(', ');
  });

  function startEditing() {
    noteEditing = false;
    editing = true;
    editText = item.text;
  }

  function startNoteEditing() {
    editing = false;
    noteEditing = true;
    noteText = item.note;
    swipeOffset = 0;
  }

  function handleNoteToggleClick(event: MouseEvent) {
    event.stopPropagation();
    if (noteEditing || !hasNote) return;
    actionToggleItemNoteCollapsed(item.id);
  }

  function handleChevronClick(e: MouseEvent) {
    e.stopPropagation();
    actionToggleCollapse(item.id);
  }

  function handleRowClick() {
    if (suppressNextRowClick) {
      suppressNextRowClick = false;
      return;
    }
    if (editing || noteEditing) return;
    if (swipeOffset !== 0) {
      swipeOffset = 0;
      return;
    }
    actionCycleLabel(item.id);
  }

  function canStartSwipe(target: EventTarget | null, button: number) {
    if (editing || noteEditing || button !== 0) return false;
    return !(target instanceof HTMLElement && target.closest('button, input, textarea'));
  }

  function beginSwipe(clientX: number, clientY: number, source: 'pointer' | 'mouse', nextPointerId: number | null = null) {
    activeGestureSource = source;
    pointerId = nextPointerId;
    pointerStartX = clientX;
    pointerStartY = clientY;
    pointerStartOffset = swipeOffset;
    pointerTracking = true;
    pointerSwiping = false;
    if (source === 'pointer' && nextPointerId !== null) {
      swipeTrackEl?.setPointerCapture?.(nextPointerId);
    }
  }

  function updateSwipe(clientX: number, clientY: number) {
    if (!pointerTracking) return false;

    const deltaX = clientX - pointerStartX;
    const deltaY = clientY - pointerStartY;

    if (!pointerSwiping) {
      if (Math.abs(deltaX) < SWIPE_ACTIVATION_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return false;
      }
      pointerSwiping = true;
      suppressNextRowClick = true;
    }

    swipeOffset = Math.min(0, Math.max(-DELETE_ACTION_WIDTH, pointerStartOffset + deltaX));
    return true;
  }

  $effect(() => {
    if (editing) {
      tick().then(() => {
        editInput?.focus();
        editInput?.select();
      });
    }
  });

  $effect(() => {
    if (noteEditing) {
      tick().then(() => {
        noteInput?.focus();
        noteInput?.select();
      });
    }
  });

  $effect(() => {
    if (activeRenameItemId === item.id) {
      startEditing();
      onRenameHandled(item.id);
    }
  });

  $effect(() => {
    if (activeNoteEditorItemId === item.id) {
      startNoteEditing();
      onNoteEditorHandled(item.id);
    }
  });

  function handleEditKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      finishEdit();
    }
    if (e.key === 'Escape') {
      editing = false;
    }
  }

  function finishEdit() {
    if (editText.trim() && editText.trim() !== item.text) {
      actionUpdateItemText(item.id, editText.trim());
    }
    editing = false;
  }

  function finishNoteEdit() {
    const nextNote = noteText.trim();
    if (nextNote !== item.note) {
      actionUpdateItemNote(item.id, nextNote);
    }
    noteEditing = false;
  }

  function cancelNoteEdit() {
    noteEditing = false;
    noteText = item.note;
  }

  function handleNoteKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      cancelNoteEdit();
      return;
    }

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      finishNoteEdit();
    }
  }

  function handleRowPointerDown(event: PointerEvent) {
    if (!canStartSwipe(event.target, event.button)) return;
    beginSwipe(event.clientX, event.clientY, 'pointer', event.pointerId);
  }

  function handleRowMouseDown(event: MouseEvent) {
    if (!canStartSwipe(event.target, event.button)) return;
    beginSwipe(event.clientX, event.clientY, 'mouse');
  }

  function handleRowPointerMove(event: PointerEvent) {
    if (activeGestureSource !== 'pointer' || event.pointerId !== pointerId) return;
    if (updateSwipe(event.clientX, event.clientY) && event.cancelable) {
      event.preventDefault();
    }
  }

  function handleWindowMouseMove(event: MouseEvent) {
    if (activeGestureSource !== 'mouse') return;
    updateSwipe(event.clientX, event.clientY);
  }

  function finishSwipeInteraction() {
    const capturedPointerId = pointerId;

    if (pointerSwiping) {
      if (swipeOffset <= -DELETE_COMMIT_THRESHOLD) {
        actionRemoveItem(item.id);
        swipeOffset = 0;
      } else if (swipeOffset <= -DELETE_ACTION_WIDTH / 2) {
        swipeOffset = -DELETE_ACTION_WIDTH;
      } else {
        swipeOffset = 0;
      }
    }

    pointerTracking = false;
    pointerSwiping = false;
    pointerId = null;
    activeGestureSource = null;
    if (capturedPointerId !== null) {
      swipeTrackEl?.releasePointerCapture?.(capturedPointerId);
    }
  }

  function handleRowPointerUp(event: PointerEvent) {
    if (activeGestureSource !== 'pointer') return;
    if (pointerId !== null && event.pointerId !== pointerId) return;
    finishSwipeInteraction();
  }

  function handleRowPointerCancel() {
    finishSwipeInteraction();
  }

  function handleWindowMouseUp() {
    if (activeGestureSource !== 'mouse') return;
    finishSwipeInteraction();
  }

  function handleSwipeDelete(event: MouseEvent) {
    event.stopPropagation();
    actionRemoveItem(item.id);
  }

  function handleRowKeydown(e: KeyboardEvent) {
    if (editing || noteEditing) return;
    if ((e.target as HTMLElement).closest('input, textarea')) return;

    if (e.key === 'F2') {
      e.preventDefault();
      startEditing();
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      actionCycleLabel(item.id);
    }
  }

  function handleRightClick(e: MouseEvent) {
    e.preventDefault();
    suppressNextRowClick = false;
    swipeOffset = 0;
    onContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id });
  }

  function handleFocusOut(e: FocusEvent) {
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(e.relatedTarget as Node | null)) {
      rowFocused = false;
    }
  }

  function handleNoteAreaClick(event: MouseEvent) {
    event.stopPropagation();
  }

  function handleDragHandleClick(event: MouseEvent) {
    event.stopPropagation();
  }

  function handleAddChildClick(event: MouseEvent) {
    event.stopPropagation();
    onRequestAddChild(item.id);
  }

  function safeDragHandle(node: HTMLElement, enabled: boolean) {
    let action: ReturnType<typeof dragHandle> | undefined;

    if (enabled) {
      try {
        action = dragHandle(node);
      } catch {
        action = undefined;
      }
    }

    return {
      update(nextEnabled: boolean) {
        if (!action && nextEnabled) {
          try {
            action = dragHandle(node);
          } catch {
            action = undefined;
          }
        }
      },
      destroy() {
        action?.destroy?.();
      },
    };
  }
</script>

<svelte:window onmousemove={handleWindowMouseMove} onmouseup={handleWindowMouseUp} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="todo-item"
  class:hovered
  style:padding-left="{depth * 20 + 8}px"
  oncontextmenu={handleRightClick}
  onmouseenter={() => hovered = true}
  onmouseleave={() => hovered = false}
  onfocusin={() => rowFocused = true}
  onfocusout={handleFocusOut}
  role="treeitem"
  tabindex="0"
  aria-selected="false"
  aria-expanded={hasChildren ? isExpanded : undefined}
  onkeydown={handleRowKeydown}
>
  <div class="swipe-shell" class:delete-visible={pointerSwiping || swipeOffset < 0}>
    <button class="swipe-delete-action" onclick={handleSwipeDelete} aria-label="Delete item">
      Delete
    </button>

    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={swipeTrackEl}
      class="swipe-track"
      class:dragging={pointerSwiping}
      style:transform={`translateX(${swipeOffset}px)`}
      onclick={handleRowClick}
      onmousedown={handleRowMouseDown}
      onpointerdown={handleRowPointerDown}
      onpointermove={handleRowPointerMove}
      onpointerup={handleRowPointerUp}
      onpointercancel={handleRowPointerCancel}
    >
      <div class="item-card">
        <div class="item-row" class:has-property-bg={propertyBackground} style:--property-bg={propertyBackground || 'none'}>
          {#if reorderEnabled}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <span
              class="drag-handle-btn"
              use:safeDragHandle={reorderEnabled}
              onclick={handleDragHandleClick}
              aria-label={`Drag item ${item.text}`}
            >
              <span>⋮⋮</span>
            </span>
          {/if}

          <button
            class="chevron"
            class:has-children={hasChildren}
            class:collapsed={!isExpanded}
            onclick={handleChevronClick}
            aria-label={item.collapsed ? 'Expand' : 'Collapse'}
            tabindex={hasChildren ? 0 : -1}
          >
            {#if hasChildren}
              ▸
            {/if}
          </button>

          {#if editing}
            <input
              bind:this={editInput}
              class="edit-input"
              type="text"
              bind:value={editText}
              onkeydown={handleEditKeydown}
              onblur={finishEdit}
            />
          {:else}
            <span class="item-text">
              {#each textSegments as seg}
                {#if seg.highlight}
                  <mark>{seg.text}</mark>
                {:else}
                  {seg.text}
                {/if}
              {/each}
            </span>
          {/if}

          {#if currentLabel}
            <span
              class="label-badge"
              style:background-color={currentLabel.color}
            >
              {currentLabel.name}
            </span>
          {/if}

          {#if hasNote && !noteEditing}
            <button
              type="button"
              class="note-toggle"
              class:expanded={!item.noteCollapsed}
              onclick={handleNoteToggleClick}
              aria-label={item.noteCollapsed ? 'Expand note' : 'Collapse note'}
            >
              <span class="note-toggle-label">Note</span>
              <span class="note-toggle-arrow">▸</span>
            </button>
          {/if}

          {#if showAddChildTrigger}
            <button
              type="button"
              class="child-add-trigger"
              onclick={handleAddChildClick}
              aria-label="Add sub-item"
            >
              ↳
            </button>
          {/if}
        </div>

        {#if noteEditing}
          <div class="note-editor" onclick={handleNoteAreaClick} onmousedown={handleNoteAreaClick}>
            <textarea
              bind:this={noteInput}
              bind:value={noteText}
              class="note-textarea"
              placeholder="Add a note..."
              rows="3"
              onkeydown={handleNoteKeydown}
            ></textarea>
            <div class="note-actions">
              <button class="note-action secondary" type="button" onclick={cancelNoteEdit}>Cancel</button>
              <button class="note-action primary" type="button" onclick={finishNoteEdit}>Save note</button>
            </div>
          </div>
        {:else if isNoteExpanded}
          <div class="note-preview" onclick={handleNoteAreaClick} onmousedown={handleNoteAreaClick}>
            <span class="note-label">Note</span>
            <p>{item.note}</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .todo-item {
    display: inline-flex;
    max-width: 100%;
    transition: background var(--transition-fast);
  }

  .swipe-shell {
    position: relative;
    display: inline-block;
    max-width: 100%;
    margin-bottom: 2px;
    border-radius: var(--radius-card);
    overflow: hidden;
  }

  .swipe-delete-action {
    position: absolute;
    inset: 0 0 0 auto;
    width: 88px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #dc2626;
    color: white;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    z-index: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-fast);
  }

  .swipe-shell.delete-visible .swipe-delete-action {
    opacity: 1;
    pointer-events: auto;
  }

  .swipe-track {
    position: relative;
    display: inline-block;
    max-width: 100%;
    z-index: 1;
    transition: transform var(--transition-normal);
    touch-action: pan-y;
  }

  .swipe-track.dragging {
    transition: none;
  }

  .todo-item.hovered .item-card {
    background: var(--color-surface-elevated);
    border-color: var(--glass-highlight);
    box-shadow: var(--shadow-md);
  }

  .item-card {
    display: inline-flex;
    flex-direction: column;
    width: fit-content;
    max-width: 100%;
    border-radius: var(--radius-card);
    background: var(--color-card-solid);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .item-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    width: fit-content;
    max-width: 100%;
    min-height: 32px;
    padding: var(--space-xs) var(--space-sm) var(--space-xs) 0;
    background: transparent;
    overflow: hidden;
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .drag-handle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-control);
    color: var(--color-text-tertiary);
    cursor: grab;
    flex-shrink: 0;
  }

  .drag-handle-btn:hover {
    background: var(--color-bg-active);
    color: var(--color-text-secondary);
  }

  .drag-handle-btn:active {
    cursor: grabbing;
  }

  .item-row.has-property-bg::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--property-bg);
    pointer-events: none;
    transition: opacity var(--transition-fast);
  }

  .todo-item.hovered .item-row.has-property-bg::before {
    opacity: 1.5;
  }

  .chevron {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: var(--color-text-tertiary);
    border-radius: var(--radius-control);
    flex-shrink: 0;
    transition: transform var(--transition-fast), color var(--transition-fast);
  }

  .chevron.has-children {
    cursor: pointer;
    color: var(--color-text-secondary);
  }

  .chevron.has-children:hover {
    background: var(--color-bg-active);
  }

  .chevron:not(.collapsed) {
    transform: rotate(90deg);
  }

  .item-text {
    flex: 0 1 auto;
    font-size: 13px;
    cursor: default;
    user-select: text;
    word-break: break-word;
    min-width: 0;
    max-width: min(480px, calc(100vw - 112px));
  }

  .item-text mark {
    background: rgba(37, 99, 235, 0.2);
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }

  .edit-input {
    flex: 0 1 auto;
    width: min(280px, calc(100vw - 136px));
    max-width: 100%;
    font-size: 13px;
    padding: 2px var(--space-xs);
    border-radius: var(--radius-control);
    background: var(--color-bg-active);
    user-select: text;
  }

  .label-badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 500;
    padding: 1px 8px;
    border-radius: var(--radius-badge);
    color: white;
    white-space: nowrap;
    transition: opacity var(--transition-fast);
    line-height: 1.6;
  }

  .label-badge:hover {
    opacity: 0.85;
  }

  .note-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    padding: 1px 8px;
    border-radius: var(--radius-badge);
    color: var(--color-text-secondary);
    background: color-mix(in srgb, var(--color-bg-active) 72%, transparent);
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .note-toggle:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  .note-toggle-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .note-toggle-arrow {
    font-size: 10px;
    line-height: 1;
    transition: transform var(--transition-fast);
  }

  .note-toggle.expanded .note-toggle-arrow {
    transform: rotate(90deg);
  }

  .child-add-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border-radius: 999px;
    color: var(--color-text-secondary);
    background: color-mix(in srgb, var(--color-bg-active) 72%, transparent);
    transition: background var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
  }

  .child-add-trigger:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  .child-add-trigger:active {
    transform: translateY(1px);
  }

  .note-preview,
  .note-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: 0 var(--space-sm) var(--space-sm) 28px;
    cursor: default;
  }

  .note-preview {
    color: var(--color-text-secondary);
  }

  .note-preview p {
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .note-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
  }

  .note-textarea {
    width: 100%;
    min-height: 72px;
    padding: var(--space-xs) var(--space-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-control);
    background: var(--color-surface-elevated);
    color: var(--color-text-primary);
    font: inherit;
    font-size: 12px;
    line-height: 1.5;
    resize: vertical;
    user-select: text;
  }

  .note-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-xs);
  }

  .note-action {
    padding: 4px 10px;
    border-radius: var(--radius-control);
    font-size: 11px;
  }

  .note-action.secondary:hover {
    background: var(--color-bg-hover);
  }

  .note-action.primary {
    background: var(--color-bg-active);
    font-weight: 600;
  }

  @keyframes expand-in {
    from {
      opacity: 0;
      max-height: 0;
    }
    to {
      opacity: 1;
      max-height: 40px;
    }
  }
</style>
