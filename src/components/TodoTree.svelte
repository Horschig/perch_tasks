<script lang="ts">
  import {
    SHADOW_ITEM_MARKER_PROPERTY_NAME,
    SHADOW_PLACEHOLDER_ITEM_ID,
    dragHandleZone,
  } from 'svelte-dnd-action';
  import { actionAddChild } from '../lib/state.svelte';
  import type { TodoItem, Label, Property } from '../lib/types';
  import TodoInput from './TodoInput.svelte';
  import TodoItemComponent from './TodoItem.svelte';
  import TodoTree from './TodoTree.svelte';

  type SortableTodoItem = TodoItem & Record<string, unknown>;
  interface Props {
    items: TodoItem[];
    labels: Label[];
    properties: Property[];
    parentItemId: string | null;
    depth: number;
    canReorder: boolean;
    searchQuery: string;
    hoveredAddTargetId: string | null;
    onContextMenu: (e: { x: number; y: number; itemId: string }) => void;
    activeChildComposerParentId: string | null;
    activeNoteEditorItemId: string | null;
    activeRenameItemId: string | null;
    onHoverAddTarget: (itemId: string | null) => void;
    onNoteEditorHandled: (itemId: string) => void;
    onReorderItems: (parentId: string | null, orderedIds: string[]) => void;
    onRequestAddChild: (itemId: string) => void;
    onCloseChildComposer: () => void;
    onRenameHandled: (itemId: string) => void;
  }

  let {
    items,
    labels,
    properties,
    parentItemId,
    depth,
    canReorder,
    searchQuery,
    hoveredAddTargetId,
    onContextMenu,
    activeChildComposerParentId,
    activeNoteEditorItemId,
    activeRenameItemId,
    onHoverAddTarget,
    onNoteEditorHandled,
    onReorderItems,
    onRequestAddChild,
    onCloseChildComposer,
    onRenameHandled,
  }: Props = $props();

  let localItems = $state<SortableTodoItem[]>([]);

  const isSearchMode = $derived(Boolean(searchQuery.trim()));
  const childDetailOffset = $derived(`${depth * 20 + 32}px`);
  const reorderEnabled = $derived(canReorder && localItems.length > 1);

  $effect(() => {
    localItems = items as SortableTodoItem[];
  });

  function handleTreeMouseLeave() {
    if (depth === 0) {
      onHoverAddTarget(null);
    }
  }

  function handleNodeHover(itemId: string) {
    onHoverAddTarget(parentItemId ?? itemId);
  }

  function handleSubmitChild(itemId: string, text: string) {
    actionAddChild(itemId, text);
    onCloseChildComposer();
  }

  function handleReorderConsider(event: CustomEvent<{ items: unknown[]; info: unknown }>) {
    localItems = event.detail.items as SortableTodoItem[];
  }

  function handleReorderFinalize(event: CustomEvent<{ items: unknown[]; info: unknown }>) {
    localItems = event.detail.items as SortableTodoItem[];
    onReorderItems(parentItemId, getOrderedIds(localItems));
  }

  function getZoneType(parentId: string | null): string {
    return parentId ?? '__root__';
  }

  function getZoneOptions() {
    return {
      items: localItems,
      type: getZoneType(parentItemId),
      dragDisabled: !reorderEnabled,
      dropFromOthersDisabled: true,
      flipDurationMs: 0,
      delayTouchStart: true,
      zoneItemTabIndex: -1,
      zoneTabIndex: -1,
    };
  }

  function getOrderedIds(nextItems: SortableTodoItem[]): string[] {
    return nextItems
      .filter((item) => item.id !== SHADOW_PLACEHOLDER_ITEM_ID)
      .map((item) => item.id);
  }

  function getItemKey(item: SortableTodoItem): string {
    const shadowHint = item[SHADOW_ITEM_MARKER_PROPERTY_NAME];
    return shadowHint ? `${item.id}_${String(shadowHint)}` : item.id;
  }

  function isShadowItem(item: SortableTodoItem): boolean {
    return Boolean(item[SHADOW_ITEM_MARKER_PROPERTY_NAME]);
  }

  function getChildren(item: SortableTodoItem): TodoItem[] {
    return Array.isArray(item.children) ? item.children : [];
  }

  function getShadowHint(item: SortableTodoItem): string | undefined {
    const value = item[SHADOW_ITEM_MARKER_PROPERTY_NAME];
    return value ? String(value) : undefined;
  }

  function safeDragHandleZone(node: HTMLElement, options: ReturnType<typeof getZoneOptions>) {
    let action: { update?: (nextOptions: ReturnType<typeof getZoneOptions>) => void; destroy?: () => void } | undefined;
    const handleConsiderEvent = (event: Event) => handleReorderConsider(event as CustomEvent<{ items: unknown[]; info: unknown }>);
    const handleFinalizeEvent = (event: Event) => handleReorderFinalize(event as CustomEvent<{ items: unknown[]; info: unknown }>);

    node.addEventListener('consider', handleConsiderEvent);
    node.addEventListener('finalize', handleFinalizeEvent);

    try {
      action = dragHandleZone(node, options);
    } catch {
      action = undefined;
    }

    return {
      update(nextOptions: ReturnType<typeof getZoneOptions>) {
        if (!action) {
          try {
            action = dragHandleZone(node, nextOptions);
          } catch {
            action = undefined;
          }
          return;
        }

        action.update?.(nextOptions);
      },
      destroy() {
        node.removeEventListener('consider', handleConsiderEvent);
        node.removeEventListener('finalize', handleFinalizeEvent);
        action?.destroy?.();
      },
    };
  }
</script>

<div
  class="todo-tree"
  use:safeDragHandleZone={getZoneOptions()}
  onmouseleave={handleTreeMouseLeave}
  role={depth === 0 ? 'tree' : 'group'}
  aria-label={parentItemId ? 'Sub-item list' : 'Todo list'}
>
  {#each localItems as item (getItemKey(item))}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="tree-node"
      data-is-dnd-shadow-item-hint={getShadowHint(item)}
      onmouseenter={() => !isShadowItem(item) && handleNodeHover(item.id)}
      onfocusin={() => !isShadowItem(item) && handleNodeHover(item.id)}
    >
      <TodoItemComponent
        item={item}
        {labels}
        {properties}
        {depth}
        reorderEnabled={reorderEnabled}
        {searchQuery}
        {onContextMenu}
        showAddChildTrigger={!isShadowItem(item) && hoveredAddTargetId === item.id && activeChildComposerParentId !== item.id}
        {onRequestAddChild}
        {activeNoteEditorItemId}
        {activeRenameItemId}
        {onNoteEditorHandled}
        {onRenameHandled}
      />

      {#if !isShadowItem(item) && getChildren(item).length > 0 && (isSearchMode || !item.collapsed)}
        <div class="children">
          <TodoTree
            items={getChildren(item)}
            {labels}
            {properties}
            parentItemId={item.id}
            depth={depth + 1}
            {canReorder}
            {searchQuery}
            {hoveredAddTargetId}
            {onContextMenu}
            {activeChildComposerParentId}
            {activeNoteEditorItemId}
            {activeRenameItemId}
            {onHoverAddTarget}
            {onNoteEditorHandled}
            {onReorderItems}
            {onRequestAddChild}
            {onCloseChildComposer}
            {onRenameHandled}
          />
        </div>
      {/if}

      {#if !isShadowItem(item) && activeChildComposerParentId === item.id}
        <div class="child-composer" style:padding-left={childDetailOffset}>
          <TodoInput
            placeholder="Add sub-item..."
            icon="↳"
            compact={true}
            autoFocus={true}
            onSubmit={(text) => handleSubmitChild(item.id, text)}
            onCancel={onCloseChildComposer}
          />
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .todo-tree {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .tree-node {
    position: relative;
    max-width: 100%;
    align-self: flex-start;
  }

  .children {
    overflow: hidden;
    animation: fold-in 150ms ease;
    margin-bottom: var(--space-sm);
  }

  .child-composer {
    padding-right: var(--space-sm);
  }

  .child-composer {
    padding-bottom: var(--space-xs);
  }

  @keyframes fold-in {
    from {
      opacity: 0;
      max-height: 0;
    }
    to {
      opacity: 1;
      max-height: 2000px;
    }
  }
</style>
