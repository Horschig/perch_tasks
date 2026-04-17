<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';

  interface Props {
    alwaysOnTop: boolean;
    onTogglePin: () => void;
    onOpenSettings: () => void;
  }

  let { alwaysOnTop, onTogglePin, onOpenSettings }: Props = $props();

  const appWindow = getCurrentWindow();

  async function minimize() {
    await appWindow.hide();
  }

  async function close() {
    await appWindow.hide();
  }

  async function handleTitlebarMousedown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    await appWindow.startDragging();
  }
</script>

<header class="titlebar">
  <div
    class="titlebar-content"
    role="presentation"
    onmousedown={handleTitlebarMousedown}
  >
    <div class="titlebar-left">
      <button
        class="titlebar-btn pin-btn"
        class:active={alwaysOnTop}
        onclick={onTogglePin}
        title={alwaysOnTop ? 'Unpin from top' : 'Pin to top'}
        aria-label={alwaysOnTop ? 'Unpin from top' : 'Pin to top'}
      >
        📌
      </button>
      <span class="titlebar-title">Perch Tasks</span>
    </div>

    <div class="titlebar-right">
      <button
        class="titlebar-btn"
        onclick={onOpenSettings}
        title="Settings"
        aria-label="Settings"
      >
        ⚙
      </button>
      <button
        class="titlebar-btn"
        onclick={minimize}
        title="Hide to tray"
        aria-label="Hide to tray"
      >
        ─
      </button>
      <button
        class="titlebar-btn close-btn"
        onclick={close}
        title="Close to tray"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  </div>
</header>

<style>
  .titlebar {
    position: relative;
    height: var(--titlebar-height);
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-separator);
  }

  .titlebar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 var(--space-sm);
    cursor: default;
  }

  .titlebar-left,
  .titlebar-right {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .titlebar-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-left: var(--space-xs);
  }

  .titlebar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-control);
    font-size: 12px;
    transition: background var(--transition-fast);
  }

  .titlebar-btn:hover {
    background: var(--color-bg-hover);
  }

  .titlebar-btn:active {
    background: var(--color-bg-active);
  }

  .pin-btn.active {
    color: #2563eb;
  }

  .close-btn:hover {
    background: rgba(220, 38, 38, 0.15);
    color: #dc2626;
  }
</style>
