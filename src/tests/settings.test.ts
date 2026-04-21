import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Settings from '../components/Settings.svelte';

const stateMocks = vi.hoisted(() => ({
  actionSetItemOrderMode: vi.fn(),
  actionSetLabels: vi.fn(),
  actionSetProperties: vi.fn(),
  actionSetStartupWindowMode: vi.fn(),
  getItemOrderMode: vi.fn(() => 'manual'),
  getLabels: vi.fn(() => []),
  getProperties: vi.fn(() => []),
  getStartupWindowMode: vi.fn(() => 'unfolded'),
}));

const autostartMocks = vi.hoisted(() => ({
  getAutostartEnabled: vi.fn(async () => false),
  setAutostartEnabled: vi.fn(async () => undefined),
}));

vi.mock('../lib/state.svelte', () => ({
  actionSetItemOrderMode: stateMocks.actionSetItemOrderMode,
  actionSetLabels: stateMocks.actionSetLabels,
  actionSetProperties: stateMocks.actionSetProperties,
  actionSetStartupWindowMode: stateMocks.actionSetStartupWindowMode,
  getItemOrderMode: stateMocks.getItemOrderMode,
  getLabels: stateMocks.getLabels,
  getProperties: stateMocks.getProperties,
  getStartupWindowMode: stateMocks.getStartupWindowMode,
}));

vi.mock('../lib/autostart', () => ({
  getAutostartEnabled: autostartMocks.getAutostartEnabled,
  setAutostartEnabled: autostartMocks.setAutostartEnabled,
}));

describe('Settings', () => {
  it('shows startup window mode and launch-at-login controls', async () => {
    render(Settings, { onClose: vi.fn() });

    await waitFor(() => {
      expect(autostartMocks.getAutostartEnabled).toHaveBeenCalled();
    });

    expect(screen.getByLabelText('Startup window')).toBeTruthy();
    expect(screen.getByLabelText('Launch at login')).toBeTruthy();
  });

  it('updates the startup window mode setting from the select control', async () => {
    render(Settings, { onClose: vi.fn() });

    await fireEvent.change(screen.getByLabelText('Startup window'), {
      target: { value: 'folded' },
    });

    expect(stateMocks.actionSetStartupWindowMode).toHaveBeenCalledWith('folded');
  });

  it('updates launch-at-login through the autostart wrapper', async () => {
    autostartMocks.getAutostartEnabled.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    render(Settings, { onClose: vi.fn() });

    const checkbox = await screen.findByLabelText('Launch at login');
    await fireEvent.click(checkbox);

    await waitFor(() => {
      expect(autostartMocks.setAutostartEnabled).toHaveBeenCalledWith(true);
    });

    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });
});