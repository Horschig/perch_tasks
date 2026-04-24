<script lang="ts">
  import { onMount } from 'svelte';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import {
    actionSetItemOrderMode,
    getLabels,
    getItemOrderMode,
    getProperties,
    actionSetLabels,
    actionSetProperties,
    actionSetStartupWindowMode,
    getStartupWindowMode,
  } from '../lib/state.svelte';
  import { ITEM_ORDER_MODES, STARTUP_WINDOW_MODES } from '../lib/constants';
  import { APP_VERSION, GITHUB_REPOSITORY_URL } from '../lib/appInfo';
  import { getAutostartEnabled, setAutostartEnabled } from '../lib/autostart';
  import { generateId } from '../lib/uuid';
  import type { ItemOrderMode, Label, Property, StartupWindowMode } from '../lib/types';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let itemOrderMode = $state<ItemOrderMode>(getItemOrderMode());
  let startupWindowMode = $state<StartupWindowMode>(getStartupWindowMode());
  let labels = $state<Label[]>(getLabels());
  let properties = $state<Property[]>(getProperties());
  let autostartEnabled = $state(false);
  let autostartPending = $state(true);
  let autostartError = $state('');

  onMount(() => {
    void refreshAutostart();
  });

  function updateItemOrderMode(value: ItemOrderMode) {
    actionSetItemOrderMode(value);
    itemOrderMode = getItemOrderMode();
  }

  function updateStartupWindowMode(value: StartupWindowMode) {
    actionSetStartupWindowMode(value);
    startupWindowMode = getStartupWindowMode();
  }

  async function refreshAutostart() {
    autostartPending = true;
    autostartError = '';

    try {
      autostartEnabled = await getAutostartEnabled();
    } catch {
      autostartError = 'Autostart status could not be loaded.';
    } finally {
      autostartPending = false;
    }
  }

  async function handleAutostartChange(event: Event) {
    const nextEnabled = (event.target as HTMLInputElement).checked;

    autostartPending = true;
    autostartError = '';

    try {
      await setAutostartEnabled(nextEnabled);
      autostartEnabled = await getAutostartEnabled();
    } catch {
      autostartEnabled = !nextEnabled;
      autostartError = 'Autostart could not be updated.';
    } finally {
      autostartPending = false;
    }
  }

  // -- Label management --

  function addLabel() {
    const maxOrder = labels.reduce((max, l) => Math.max(max, l.order), -1);
    labels = [...labels, { id: generateId(), name: 'New label', color: '#6b7280', order: maxOrder + 1 }];
    saveLabels();
  }

  function updateLabel(id: string, field: 'name' | 'color', value: string) {
    labels = labels.map((l) => (l.id === id ? { ...l, [field]: value } : l));
    saveLabels();
  }

  function removeLabel(id: string) {
    labels = labels.filter((l) => l.id !== id);
    // Re-order
    labels = labels.map((l, i) => ({ ...l, order: i }));
    saveLabels();
  }

  function moveLabelUp(index: number) {
    if (index <= 0) return;
    const arr = [...labels];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    labels = arr.map((l, i) => ({ ...l, order: i }));
    saveLabels();
  }

  function moveLabelDown(index: number) {
    if (index >= labels.length - 1) return;
    const arr = [...labels];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    labels = arr.map((l, i) => ({ ...l, order: i }));
    saveLabels();
  }

  function saveLabels() {
    actionSetLabels(labels);
  }

  // -- Property management --

  function addProperty() {
    properties = [...properties, { id: generateId(), name: 'New property', color: '#6b7280' }];
    saveProperties();
  }

  function updateProperty(id: string, field: 'name' | 'color', value: string) {
    properties = properties.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    saveProperties();
  }

  function removeProperty(id: string) {
    properties = properties.filter((p) => p.id !== id);
    saveProperties();
  }

  function saveProperties() {
    actionSetProperties(properties);
  }

  async function handleOpenRepository() {
    await openUrl(GITHUB_REPOSITORY_URL);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="settings-overlay" onclick={onClose} onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="settings-panel" onclick={(e) => e.stopPropagation()}>
    <div class="settings-header">
      <h2>Settings</h2>
      <button class="close-btn" onclick={onClose} aria-label="Close settings">✕</button>
    </div>

    <div class="settings-body">
      <section class="section">
        <h3>Window</h3>
        <p class="section-hint">Choose how the app starts and whether it launches with your desktop session.</p>

        <label class="field-label" for="startup-window-mode">Startup window</label>
        <select
          id="startup-window-mode"
          class="order-mode-select"
          bind:value={startupWindowMode}
          onchange={(event) => updateStartupWindowMode((event.target as HTMLSelectElement).value as StartupWindowMode)}
        >
          {#each STARTUP_WINDOW_MODES as mode}
            <option value={mode.value}>{mode.label}</option>
          {/each}
        </select>

        <label class="toggle-row" for="launch-at-login">
          <span class="toggle-copy">
            <span class="toggle-title">Launch at login</span>
            <span class="section-note">Registers Perch Tasks to start with Windows or Linux.</span>
          </span>
          <input
            id="launch-at-login"
            class="toggle-input"
            type="checkbox"
            checked={autostartEnabled}
            disabled={autostartPending}
            onchange={handleAutostartChange}
            aria-label="Launch at login"
          />
        </label>

        {#if autostartPending}
          <p class="section-note">Checking launch-at-login status...</p>
        {/if}

        {#if autostartError}
          <p class="field-error">{autostartError}</p>
        {/if}
      </section>

      <section class="section">
        <h3>Item order</h3>
        <p class="section-hint">Apply a one-time automatic order, then keep drag-and-drop available for manual fine-tuning.</p>

        <label class="field-label" for="item-order-mode">Apply order</label>
        <select
          id="item-order-mode"
          class="order-mode-select"
          bind:value={itemOrderMode}
          onchange={(event) => updateItemOrderMode((event.target as HTMLSelectElement).value as ItemOrderMode)}
        >
          {#each ITEM_ORDER_MODES as mode}
            <option value={mode.value}>{mode.label}</option>
          {/each}
        </select>

        <p class="section-note">Choosing an automatic option sorts the current list once and immediately keeps the list in manual mode.</p>
      </section>

      <!-- Labels Section -->
      <section class="section">
        <h3>Labels</h3>
        <p class="section-hint">Click an item to open its label picker.</p>

        <div class="item-list">
          {#each labels as label, i (label.id)}
            <div class="setting-item">
              <div class="item-order-btns">
                <button
                  class="order-btn"
                  onclick={() => moveLabelUp(i)}
                  disabled={i === 0}
                  aria-label="Move up"
                >▲</button>
                <button
                  class="order-btn"
                  onclick={() => moveLabelDown(i)}
                  disabled={i === labels.length - 1}
                  aria-label="Move down"
                >▼</button>
              </div>
              <input
                type="color"
                value={label.color}
                oninput={(e) => updateLabel(label.id, 'color', (e.target as HTMLInputElement).value)}
                class="color-picker"
                aria-label="Label color"
              />
              <input
                type="text"
                value={label.name}
                oninput={(e) => updateLabel(label.id, 'name', (e.target as HTMLInputElement).value)}
                class="name-input"
                aria-label="Label name"
              />
              <button
                class="remove-btn"
                onclick={() => removeLabel(label.id)}
                aria-label="Remove label"
              >✕</button>
            </div>
          {/each}
        </div>

        <button class="add-btn" onclick={addLabel}>+ Add label</button>
      </section>

      <!-- Properties Section -->
      <section class="section">
        <h3>Properties</h3>
        <p class="section-hint">Right-click items to assign properties. Shown as dots, expanded on hover.</p>

        <div class="item-list">
          {#each properties as prop (prop.id)}
            <div class="setting-item">
              <input
                type="color"
                value={prop.color}
                oninput={(e) => updateProperty(prop.id, 'color', (e.target as HTMLInputElement).value)}
                class="color-picker"
                aria-label="Property color"
              />
              <input
                type="text"
                value={prop.name}
                oninput={(e) => updateProperty(prop.id, 'name', (e.target as HTMLInputElement).value)}
                class="name-input"
                aria-label="Property name"
              />
              <button
                class="remove-btn"
                onclick={() => removeProperty(prop.id)}
                aria-label="Remove property"
              >✕</button>
            </div>
          {/each}
        </div>

        <button class="add-btn" onclick={addProperty}>+ Add property</button>
      </section>

      <section class="section section-about">
        <h3>About</h3>

        <dl class="meta-list">
          <div class="meta-row">
            <dt class="meta-label">Version</dt>
            <dd class="meta-value">{APP_VERSION}</dd>
          </div>
          <div class="meta-row">
            <dt class="meta-label">GitHub</dt>
            <dd class="meta-value">
              <button
                class="repo-link"
                type="button"
                onclick={handleOpenRepository}
                aria-label="Open GitHub repository"
              >
                {GITHUB_REPOSITORY_URL}
              </button>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</div>

<style>
  .settings-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.2);
    z-index: 900;
    display: flex;
    justify-content: flex-end;
    backdrop-filter: blur(2px);
    animation: overlay-in 150ms ease;
  }

  .settings-panel {
    width: 300px;
    max-width: 90vw;
    height: 100%;
    background: var(--color-panel-solid);
    border-left: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    animation: slide-in 200ms ease;
    overflow: hidden;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-separator);
  }

  .settings-header h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-control);
    font-size: 12px;
    transition: background var(--transition-fast);
  }

  .close-btn:hover {
    background: var(--color-bg-hover);
  }

  .settings-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-md) var(--space-lg);
  }

  .section {
    margin-bottom: var(--space-xl);
  }

  .section-about {
    margin-bottom: 0;
  }

  .section h3 {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xs);
  }

  .section-hint {
    font-size: 11px;
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-md);
  }

  .field-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-xs);
  }

  .order-mode-select {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-control);
    padding: var(--space-sm);
    font: inherit;
    color: var(--color-text-primary);
    background: var(--color-surface-elevated);
  }

  .section-note {
    margin-top: var(--space-sm);
    font-size: 11px;
    color: var(--color-text-tertiary);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }

  .toggle-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .toggle-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--color-text-secondary);
  }

  .toggle-input {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .field-error {
    margin-top: var(--space-xs);
    font-size: 11px;
    color: #b91c1c;
  }

  .item-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .meta-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-sm);
    border-radius: var(--radius-card);
    background: var(--color-bg-hover);
  }

  .meta-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--color-text-secondary);
  }

  .meta-value {
    font-size: 12px;
    color: var(--color-text-primary);
    word-break: break-word;
  }

  .repo-link {
    color: inherit;
    text-align: left;
    text-decoration: underline;
    text-decoration-color: var(--color-border);
    text-underline-offset: 2px;
  }

  .repo-link:hover {
    color: var(--color-text-secondary);
  }

  .setting-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs);
    border-radius: var(--radius-control);
    background: var(--color-bg-hover);
  }

  .item-order-btns {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .order-btn {
    font-size: 8px;
    width: 16px;
    height: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    color: var(--color-text-tertiary);
    transition: background var(--transition-fast);
  }

  .order-btn:hover:not(:disabled) {
    background: var(--color-bg-active);
    color: var(--color-text-primary);
  }

  .order-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .color-picker {
    width: 24px;
    height: 24px;
    border: none;
    border-radius: var(--radius-control);
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
  }

  .name-input {
    flex: 1;
    padding: var(--space-xs);
    font-size: 13px;
    border-radius: var(--radius-control);
    background: transparent;
    min-width: 0;
  }

  .name-input:focus {
    background: var(--color-bg-active);
  }

  .remove-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    border-radius: var(--radius-control);
    color: var(--color-text-tertiary);
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .remove-btn:hover {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .add-btn {
    margin-top: var(--space-sm);
    padding: var(--space-xs) var(--space-sm);
    font-size: 12px;
    color: var(--color-text-secondary);
    border-radius: var(--radius-control);
    transition: background var(--transition-fast);
  }

  .add-btn:hover {
    background: var(--color-bg-hover);
  }

  @keyframes overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
</style>
