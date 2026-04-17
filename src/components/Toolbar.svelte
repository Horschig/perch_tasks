<script lang="ts">
  import { tick } from 'svelte';

  interface Props {
    bottomOffset?: string;
    showRootAddComposer: boolean;
    showSearchComposer: boolean;
    searchQuery: string;
    addDraft: string;
    onToggleSearch: () => void;
    onToggleAdd: () => void;
    onToggleFold: () => void;
    onSearchInput: (query: string) => void;
    onAddDraftInput: (draft: string) => void;
    onSubmitAdd: () => void;
    onCloseActiveMode: () => void;
    onOpenSettings: () => void;
  }

  let {
    bottomOffset = 'var(--space-md)',
    showRootAddComposer,
    showSearchComposer,
    searchQuery,
    addDraft,
    onToggleSearch,
    onToggleAdd,
    onToggleFold,
    onSearchInput,
    onAddDraftInput,
    onSubmitAdd,
    onCloseActiveMode,
    onOpenSettings,
  }: Props = $props();
  let addInputEl: HTMLInputElement | undefined = $state();
  let searchInputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (showRootAddComposer) {
      tick().then(() => addInputEl?.focus());
    }
  });

  $effect(() => {
    if (showSearchComposer) {
      tick().then(() => searchInputEl?.focus());
    }
  });

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onCloseActiveMode();
      return;
    }
  }

  function handleAddKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      onSubmitAdd();
    }
  }

  async function handleFocusOut(event: FocusEvent, mode: 'search' | 'add') {
    if (mode !== 'search' || !showSearchComposer) return;

    const currentTarget = event.currentTarget as HTMLElement;
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && currentTarget.contains(nextTarget)) return;

    await tick();

    if (!showSearchComposer) return;

    const activeElement = document.activeElement;
    if (activeElement instanceof Node && currentTarget.contains(activeElement)) return;

    onCloseActiveMode();
  }

  function handleSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    onSearchInput(value);
  }

  function handleAddInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    onAddDraftInput(value);
  }

  function handleModeIconClick(mode: 'search' | 'add') {
    if (mode === 'add') {
      onCloseActiveMode();
      return;
    }

    searchInputEl?.focus();
  }
</script>

<div class="toolbar toolbar-left" style:bottom={bottomOffset}>
  {#if showRootAddComposer}
    <div class="toolbar-composer add-composer">
      <button
        class="toolbar-btn mode-icon-btn"
        type="button"
        onclick={() => handleModeIconClick('add')}
        title="Add todo"
        aria-label="Add todo"
      >
        ✎
      </button>
      <input
        bind:this={addInputEl}
        class="mode-input"
        type="text"
        value={addDraft}
        oninput={handleAddInput}
        onkeydown={handleAddKeydown}
        placeholder="Add todo..."
        aria-label="Add todo text"
      />
      <button
        class="toolbar-btn close-btn"
        type="button"
        onclick={onCloseActiveMode}
        aria-label="Close add composer"
        title="Close add composer"
      >
        ✕
      </button>
    </div>
  {:else}
    <button
      class="toolbar-btn add-btn"
      type="button"
      onclick={onToggleAdd}
      title="Add todo"
      aria-label="Add todo"
    >
      ✎
    </button>
  {/if}
</div>

<div class="toolbar toolbar-right" style:bottom={bottomOffset} onfocusout={(event) => handleFocusOut(event, 'search')}>
  {#if showSearchComposer}
    <div class="toolbar-composer search-composer">
      <button
        class="toolbar-btn mode-icon-btn"
        type="button"
        onclick={() => handleModeIconClick('search')}
        title="Search"
        aria-label="Search"
      >
        🔍
      </button>
      <input
        bind:this={searchInputEl}
        class="mode-input"
        type="text"
        value={searchQuery}
        oninput={handleSearchInput}
        onkeydown={handleSearchKeydown}
        placeholder="Search..."
        aria-label="Search todos"
      />
      <button
        class="toolbar-btn close-btn"
        type="button"
        onclick={onCloseActiveMode}
        aria-label="Close search"
        title="Close search"
      >
        ✕
      </button>
    </div>
  {:else}
    <button
      class="toolbar-btn search-btn"
      type="button"
      onclick={onToggleSearch}
      title="Search (Ctrl+F)"
      aria-label="Search"
    >
      🔍
    </button>
  {/if}
  <button
    class="toolbar-btn settings-btn"
    type="button"
    onclick={onOpenSettings}
    title="Settings"
    aria-label="Settings"
  >
    ⚙
  </button>
  <button
    class="toolbar-btn fold-btn"
    type="button"
    onclick={onToggleFold}
    title="Fold to screen edge"
    aria-label="Fold to screen edge"
  >
    ⇥
  </button>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    position: fixed;
    bottom: var(--space-md);
    padding: var(--space-xs);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-surface-elevated) 96%, var(--glass-bg));
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    z-index: 200;
    gap: var(--space-xs);
    width: max-content;
    max-width: calc(100vw - 2 * var(--space-md));
  }

  .toolbar-left {
    left: var(--space-md);
  }

  .toolbar-right {
    right: var(--space-md);
  }

  .toolbar-composer {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    min-width: clamp(132px, 42vw, 188px);
    max-width: clamp(132px, 42vw, 188px);
    min-height: 28px;
  }

  .mode-input {
    flex: 1;
    min-width: 0;
    padding: var(--space-xs) 0;
    font-size: 13px;
    color: var(--color-text-primary);
    background: none;
    border: none;
    outline: none;
    user-select: text;
  }

  .mode-input::placeholder {
    color: var(--color-text-tertiary);
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-control);
    font-size: 13px;
    flex-shrink: 0;
    transition: background var(--transition-fast);
  }

  .toolbar-btn:hover {
    background: var(--color-bg-hover);
  }

  .mode-icon-btn {
    font-size: 14px;
  }

  .fold-btn {
    font-size: 15px;
    font-weight: 600;
  }

  .close-btn {
    font-size: 11px;
    color: var(--color-text-tertiary);
  }

  .close-btn:hover {
    background: var(--color-bg-active);
  }
</style>
