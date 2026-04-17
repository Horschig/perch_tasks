<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { Property } from '../lib/types';
  import {
    actionRemoveItem,
    actionToggleProperty,
    getState,
  } from '../lib/state.svelte';
  import { findItem } from '../lib/tree';

  interface Props {
    x: number;
    y: number;
    itemId: string;
    properties: Property[];
    onClose: () => void;
    onEditNote?: (itemId: string) => void;
    onRename?: (itemId: string) => void;
  }

  const VIEWPORT_MARGIN = 8;

  let { x, y, itemId, properties, onClose, onEditNote = () => {}, onRename = () => {} }: Props = $props();
  let menuEl: HTMLDivElement | undefined = $state();
  let adjustedX = $state(0);
  let adjustedY = $state(0);

  $effect(() => {
    adjustedX = x;
    adjustedY = y;
    tick().then(positionMenu);
  });

  const item = $derived(findItem(getState().items, itemId));
  const hasNote = $derived(Boolean(item?.note?.trim()));
  const itemPropertyIds = $derived(item?.propertyIds ?? []);

  onMount(() => {
    tick().then(positionMenu);

    function handleClickOutside(e: MouseEvent) {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  });

  function handleDelete() {
    actionRemoveItem(itemId);
    onClose();
  }

  function handleRename() {
    onRename(itemId);
    onClose();
  }

  function handleEditNote() {
    onEditNote(itemId);
    onClose();
  }

  function handleToggleProperty(propertyId: string) {
    actionToggleProperty(itemId, propertyId);
  }

  function positionMenu() {
    if (!menuEl) return;

    const rect = menuEl.getBoundingClientRect();
    adjustedX = clamp(x, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN));
    adjustedY = clamp(y, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN));
    menuEl.focus();
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={menuEl}
  class="context-menu"
  style:left="{adjustedX}px"
  style:top="{adjustedY}px"
  role="menu"
  tabindex="-1"
  onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
>
  <button class="menu-item" onclick={handleRename} role="menuitem">
    Rename
  </button>

  <button class="menu-item" onclick={handleEditNote} role="menuitem">
    {hasNote ? 'Edit note' : 'Add note'}
  </button>

  {#if properties.length > 0}
    <div class="menu-separator"></div>
    <div class="menu-label">Properties</div>
    {#each properties as prop}
      <button
        class="menu-item property-item"
        onclick={() => handleToggleProperty(prop.id)}
        role="menuitemcheckbox"
        aria-checked={itemPropertyIds.includes(prop.id)}
      >
        <span class="check" class:checked={itemPropertyIds.includes(prop.id)}>
          {itemPropertyIds.includes(prop.id) ? '✓' : ''}
        </span>
        <span class="prop-dot" style:background-color={prop.color}></span>
        {prop.name}
      </button>
    {/each}
  {/if}

  <div class="menu-separator"></div>
  <button class="menu-item delete-item" onclick={handleDelete} role="menuitem">
    Delete
  </button>
</div>

<style>
  .context-menu {
    position: fixed;
    min-width: 180px;
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-md);
    padding: var(--space-xs);
    z-index: 1000;
    backdrop-filter: blur(var(--glass-blur));
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    padding: var(--space-xs) var(--space-sm);
    font-size: 13px;
    border-radius: var(--radius-control);
    text-align: left;
    transition: background var(--transition-fast);
  }

  .menu-item:hover {
    background: var(--color-bg-hover);
  }

  .menu-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-tertiary);
    padding: var(--space-xs) var(--space-sm) 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .menu-separator {
    height: 1px;
    background: var(--color-separator);
    margin: var(--space-xs) 0;
  }

  .delete-item {
    color: #dc2626;
  }

  .delete-item:hover {
    background: rgba(220, 38, 38, 0.1);
  }

  .check {
    width: 14px;
    font-size: 11px;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .check.checked {
    color: #16a34a;
    font-weight: 700;
  }

  .prop-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
