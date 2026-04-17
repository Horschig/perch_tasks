<script lang="ts">
  interface Props {
    placeholder?: string;
    onSubmit: (text: string) => void;
    onCancel?: () => void;
    autoFocus?: boolean;
    icon?: string;
    compact?: boolean;
  }

  let {
    placeholder = 'Add todo...',
    onSubmit,
    onCancel = () => {},
    autoFocus = false,
    icon = '+',
    compact = false,
  }: Props = $props();
  let text = $state('');
  let inputEl: HTMLInputElement | undefined = $state();

  const submitLabel = $derived(placeholder.replace(/\.\.\.$/, ''));

  $effect(() => {
    if (autoFocus && inputEl) {
      inputEl.focus();
      inputEl.select();
    }
  });

  function submit() {
    if (!text.trim()) return;
    onSubmit(text.trim());
    text = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      submit();
    }
    if (e.key === 'Escape') {
      text = '';
      onCancel();
      (e.target as HTMLInputElement).blur();
    }
  }
</script>

<div class="todo-input" class:compact>
  <button class="submit-btn" type="button" onclick={submit} aria-label={submitLabel}>
    <span class="input-icon">{icon}</span>
  </button>
  <input
    bind:this={inputEl}
    type="text"
    bind:value={text}
    onkeydown={handleKeydown}
    {placeholder}
    aria-label={placeholder}
  />
</div>

<style>
  .todo-input {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) 0;
  }

  .submit-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: var(--color-bg-active);
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
    transition: background var(--transition-fast), transform var(--transition-fast);
  }

  .submit-btn:hover {
    background: var(--color-bg-hover);
  }

  .submit-btn:active {
    transform: translateY(1px);
  }

  .input-icon {
    color: var(--color-text-primary);
    font-size: 16px;
    font-weight: 600;
    width: 20px;
    text-align: center;
  }

  input {
    flex: 1;
    padding: var(--space-xs) 0;
    font-size: 13px;
    color: var(--color-text-primary);
  }

  .todo-input.compact {
    gap: var(--space-xs);
    padding: 0;
  }

  .todo-input.compact .submit-btn {
    width: 24px;
    height: 24px;
  }

  .todo-input.compact .input-icon {
    width: 16px;
    font-size: 13px;
  }

  input::placeholder {
    color: var(--color-text-tertiary);
  }
</style>
