import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';

export async function readAutostartEnabled(): Promise<boolean> {
  return isEnabled();
}

export async function setAutostartEnabled(value: boolean): Promise<void> {
  if (value) {
    await enable();
    return;
  }

  await disable();
}