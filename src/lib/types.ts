export interface TodoItem {
  id: string;
  text: string;
  labelId: string | null;
  note: string;
  noteCollapsed: boolean;
  propertyIds: string[];
  children: TodoItem[];
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Property {
  id: string;
  name: string;
  color: string;
}

export type ItemOrderMode = 'manual' | 'urgent-first' | 'important-first' | 'urgent-then-important';
export type StartupMode = 'unfolded' | 'folded';

export interface AppSettings {
  alwaysOnTop: boolean;
  autostartEnabled: boolean;
  itemOrderMode: ItemOrderMode;
  startupMode: StartupMode;
  windowPosition: { x: number; y: number; width: number; height: number } | null;
  theme: 'auto' | 'light' | 'dark';
}

export interface AppState {
  schemaVersion: number;
  items: TodoItem[];
  labels: Label[];
  properties: Property[];
  settings: AppSettings;
}
