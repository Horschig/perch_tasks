import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Settings from '../components/Settings.svelte';

const stateMocks = vi.hoisted(() => ({
  actionSetItemOrderMode: vi.fn(),
  actionSetLabels: vi.fn(),
  actionSetProperties: vi.fn(),
  actionSetStartupMode: vi.fn(),
  getItemOrderMode: vi.fn(() => 'manual'),
  getLabels: vi.fn(() => []),
  getProperties: vi.fn(() => []),
  getStartupMode: vi.fn(() => 'unfolded'),
}));

vi.mock('../lib/state.svelte', () => ({
  actionSetItemOrderMode: stateMocks.actionSetItemOrderMode,
  actionSetLabels: stateMocks.actionSetLabels,
  actionSetProperties: stateMocks.actionSetProperties,
  actionSetStartupMode: stateMocks.actionSetStartupMode,
  getItemOrderMode: stateMocks.getItemOrderMode,
  getLabels: stateMocks.getLabels,
  getProperties: stateMocks.getProperties,
  getStartupMode: stateMocks.getStartupMode,
}));

describe('Settings', () => {
  it('renders launch controls and forwards launch preference changes', async () => {
    const onSetAutostartEnabled = vi.fn();

    render(Settings, {
      onClose: vi.fn(),
      autostartEnabled: false,
      autostartPending: false,
      onSetAutostartEnabled,
    });

    await fireEvent.click(screen.getByLabelText('Launch at login'));
    await fireEvent.change(screen.getByLabelText('Startup mode'), { target: { value: 'folded' } });

    expect(onSetAutostartEnabled).toHaveBeenCalledWith(true);
    expect(stateMocks.actionSetStartupMode).toHaveBeenCalledWith('folded');
  });
});