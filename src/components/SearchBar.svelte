<script lang="ts">
  interface Props {
    value: string;
    onInput: (query: string) => void;
    onClose: () => void;
  }

  let { value, onInput, onClose }: Props = $props();
  let inputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (inputEl) inputEl.focus();
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<div class="search-bar">
  <span class="search-icon">🔍</span>
  <input
    bind:this={inputEl}
    type="text"
    {value}
    oninput={(e) => onInput((e.target as HTMLInputElement).value)}
    onkeydown={handleKeydown}
    placeholder="Search..."
    aria-label="Search todos"
  />
  <button class="search-close" onclick={onClose} aria-label="Close search">✕</button>
</div>

<style>
  .search-bar {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-md);
    border-bottom: 1px solid var(--color-separator);
    background: var(--color-bg-hover);
    flex-shrink: 0;
  }

  .search-icon {
    font-size: 12px;
    flex-shrink: 0;
  }

  input {
    flex: 1;
    padding: var(--space-xs) 0;
    font-size: 13px;
    background: none;
    user-select: text;
  }

  input::placeholder {
    color: var(--color-text-tertiary);
  }

  .search-close {
    font-size: 11px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-control);
    color: var(--color-text-tertiary);
    transition: background var(--transition-fast);
  }

  .search-close:hover {
    background: var(--color-bg-active);
  }
</style>
