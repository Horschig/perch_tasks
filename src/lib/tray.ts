import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu, MenuItem } from '@tauri-apps/api/menu';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Image } from '@tauri-apps/api/image';
import { resolveResource } from '@tauri-apps/api/path';

async function loadTrayIcon(): Promise<Image | undefined> {
  // Try the built-in window icon first
  const icon = await defaultWindowIcon();
  if (icon) return icon;
  // Fallback: load icon from disk
  try {
    const path = await resolveResource('icons/32x32.png');
    return await Image.fromPath(path);
  } catch {
    return undefined;
  }
}

async function toggleWindow(): Promise<void> {
  const appWindow = getCurrentWindow();
  const visible = await appWindow.isVisible();
  if (visible) {
    await appWindow.hide();
  } else {
    await appWindow.show();
    await appWindow.unminimize();
    await appWindow.setFocus();
  }
}

export async function setupTray(): Promise<void> {
  const appWindow = getCurrentWindow();
  const icon = await loadTrayIcon();

  const showHideItem = await MenuItem.new({
    id: 'show-hide',
    text: 'Show / Hide',
    action: async () => {
      await toggleWindow();
    },
  });

  const quitItem = await MenuItem.new({
    id: 'quit',
    text: 'Exit',
    action: async () => {
      await appWindow.destroy();
    },
  });

  const menu = await Menu.new({ items: [showHideItem, quitItem] });

  await TrayIcon.new({
    id: 'main-tray',
    icon: icon ?? undefined,
    tooltip: 'Perch Tasks',
    menu,
    menuOnLeftClick: false,
    action: async (event) => {
      if (event.type === 'DoubleClick' && event.button === 'Left') {
        await toggleWindow();
      }
    },
  });
}
