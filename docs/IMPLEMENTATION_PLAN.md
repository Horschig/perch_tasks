# Perch Tasks — Implementation Plan

## 1. Recommended Approach with Rationale

### Strategy: Tauri 2 shell + Svelte 5 frontend + plugin-based persistence

**Why this is the best fit:**

1. **Tauri 2 `create-tauri-app` scaffold with Svelte + TypeScript template** gives us a working Vite + Svelte 5 + Tauri 2 skeleton in one command (`npm create tauri-app`). Zero manual wiring of the build pipeline.

2. **`@tauri-apps/plugin-store` (LazyStore) for persistence** instead of raw `plugin-fs`. The store plugin provides a debounced, auto-saving, JSON-based key-value store in the OS app-data directory. It handles serialization, file creation, and graceful-exit saves automatically — exactly what the PRD requires ("Auto-save on every change with debounce"). Writing a custom persistence layer over `plugin-fs` would re-implement what `plugin-store` already does.

3. **`@tauri-apps/plugin-window-state` for window position memory.** This plugin automatically saves/restores window position, size, and state across restarts. The PRD's F-22 requirement is met with zero custom code.

4. **Tauri 2 `windowEffects` config for frosted glass.** The `WindowConfig` supports `windowEffects: { effects: ["mica"] }` (Windows 11) or `"acrylic"` (Windows 10/11) natively. Combined with `transparent: true` and `decorations: false` (custom titlebar), this delivers the Liquid Glass aesthetic without CSS hacks or platform shims. Documentation reference: https://v2.tauri.app/reference/config/#windoweffectsconfig

5. **`svelte-dnd-action` (v0.9.69) for drag-and-drop.** Production-ready, 107K weekly downloads, explicit support for Svelte 5, nested dnd-zones (Trello-style boards are a first-class example), keyboard accessibility, drag handles, and touch support. The PRD's F-07 (reorder within parent scope) maps directly to its `type`-scoped zones. No custom DnD implementation needed.

6. **Svelte 5 runes (`$state`, `$derived`, `$effect`) for state management** instead of legacy stores. Runes are the Svelte 5 way — they provide fine-grained reactivity, are simpler than stores for deeply nested tree state, and work seamlessly with TypeScript.

7. **Custom titlebar over native decorations.** `decorations: false` + `shadow: true` gives us the borderless, rounded-corner window on Windows 11 that the Liquid Glass design needs. The custom titlebar gives us full control over the always-on-top toggle, minimize-to-tray, and theming.

8. **TDD with Vitest** for all pure logic (tree operations, label cycling, search/filter, serialization). UI components tested with `@testing-library/svelte` where interaction matters.

---

## 2. Project Structure

```
ToDo_app/
├── docs/
│   ├── PRD.md
│   └── IMPLEMENTATION_PLAN.md
├── src/                          # Svelte frontend source
│   ├── app.css                   # Global styles + Liquid Glass variables
│   ├── app.d.ts                  # Svelte/TypeScript ambient declarations
│   ├── App.svelte                # Root component: layout shell
│   ├── main.ts                   # Svelte mount + tray setup
│   ├── lib/
│   │   ├── types.ts              # Data model interfaces (TodoItem, Label, Property, AppState)
│   │   ├── constants.ts          # Default labels, properties, config
│   │   ├── state.svelte.ts       # Global reactive state (runes-based)
│   │   ├── persistence.ts        # Load/save via @tauri-apps/plugin-store
│   │   ├── tree.ts               # Pure tree operations (add, delete, move, find, flatten)
│   │   ├── search.ts             # Search/filter logic (match, highlight, ancestor chain)
│   │   ├── labels.ts             # Label cycling logic
│   │   ├── uuid.ts               # UUID generation (crypto.randomUUID wrapper)
│   │   ├── theme.ts              # Dark/light mode detection + switching
│   │   └── tray.ts               # System tray setup and event handling
│   ├── components/
│   │   ├── TitleBar.svelte       # Custom titlebar with drag region, window controls
│   │   ├── SearchBar.svelte      # Legacy search/filter prototype (runtime search lives in Toolbar)
│   │   ├── TodoTree.svelte       # Recursive tree container with dnd-zones
│   │   ├── TodoItem.svelte       # Single item row: text, label badge, property dots
│   │   ├── TodoInput.svelte      # Inline add-item input for sub-item composition
│   │   ├── LabelBadge.svelte     # Pill-shaped label display, click-to-cycle
│   │   ├── PropertyDots.svelte   # Collapsed dot indicators
│   │   ├── PropertyExpand.svelte # Expanded property text (on hover)
│   │   ├── ContextMenu.svelte    # Right-click menu (add sub-item, properties, delete)
│   │   ├── Settings.svelte       # Settings panel (slide-out)
│   │   ├── LabelManager.svelte   # Label CRUD within Settings
│   │   ├── PropertyManager.svelte# Property CRUD within Settings
│   │   └── Toolbar.svelte        # Floating bottom toolbar: search/add composer, settings, fold
│   └── tests/                    # Vitest test files
│       ├── tree.test.ts
│       ├── search.test.ts
│       ├── labels.test.ts
│       ├── persistence.test.ts
│       ├── state.test.ts
│       └── components/
│           ├── TodoItem.test.ts
│           ├── LabelBadge.test.ts
│           └── Settings.test.ts
├── src-tauri/                    # Tauri backend (Rust)
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Window config, plugins, capabilities
│   ├── capabilities/
│   │   └── default.json          # Permissions for store, window-state, fs
│   ├── icons/                    # App icons (generated by tauri icon)
│   └── src/
│       └── lib.rs                # Minimal Rust: plugin registration
├── index.html                    # Vite entry point
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── svelte.config.js
├── vite.config.ts
├── vitest.config.ts              # Vitest configuration
├── .gitignore
└── README.md
```

---

## 3. Architecture Overview

```
┌───────────────────────────────────────────────────────┐
│                    Tauri Shell (Rust)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ plugin-store │  │ plugin-      │  │ tray-icon    │ │
│  │ (JSON file   │  │ window-state │  │ (system tray)│ │
│  │  in AppData) │  │ (pos/size)   │  │              │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                │                  │         │
│         │       IPC (Tauri commands)        │         │
├─────────┼────────────────┼──────────────────┼─────────┤
│         ▼                ▼                  ▼         │
│  ┌────────────────────────────────────────────────┐   │
│  │              Svelte 5 Frontend                 │   │
│  │                                                │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │         State Layer (Runes)              │  │   │
│  │  │  state.svelte.ts                         │  │   │
│  │  │  - AppState ($state)                     │  │   │
│  │  │  - Derived views ($derived)              │  │   │
│  │  │  - Auto-save effect ($effect)            │  │   │
│  │  └────────┬────────────────────┬────────────┘  │   │
│  │           │                    │               │   │
│  │  ┌────────▼────────┐  ┌───────▼────────────┐  │   │
│  │  │  Pure Logic      │  │  UI Components     │  │   │
│  │  │  - tree.ts       │  │  - TitleBar        │  │   │
│  │  │  - search.ts     │  │  - TodoTree        │  │   │
│  │  │  - labels.ts     │  │  - TodoItem        │  │   │
│  │  │  - persistence   │  │  - Settings        │  │   │
│  │  └─────────────────┘  │  - ContextMenu      │  │   │
│  │                       │  - SearchBar        │  │   │
│  │                       └────────────────────┘  │   │
│  └────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

**Data flow:**
1. On launch: `plugin-window-state` restores window position. `persistence.ts` loads `AppState` from `plugin-store` (LazyStore). State initializes with loaded data or defaults.
2. User interactions mutate `$state` objects via pure functions from `tree.ts`, `labels.ts`, etc.
3. A `$effect` in `state.svelte.ts` watches for changes and calls `store.set()` which auto-saves with debounce (default 100ms).
4. On minimize/close: tray handler hides the window instead of quitting. Tray click restores.
5. Theme changes detected via `window.matchMedia('(prefers-color-scheme: dark)')` listener.

---

## 4. Module List with Responsibilities

| Module | File | Responsibility | SOLID principle |
|--------|------|---------------|-----------------|
| **Types** | `lib/types.ts` | `TodoItem`, `Label`, `Property`, `AppState`, `Settings` interfaces. Single source of truth for data shapes. | ISP — small focused interfaces |
| **Constants** | `lib/constants.ts` | Default labels (on hold, waiting, in progress, done), default properties (urgent, important), initial settings. | OCP — new defaults without changing logic |
| **State** | `lib/state.svelte.ts` | Reactive `$state` instances, `$derived` views (filtered tree, sorted labels), `$effect` for auto-persist. Single entry point for all state reads/writes. | SRP — only state coordination |
| **Persistence** | `lib/persistence.ts` | `loadState()`, `saveState()` via `LazyStore`. Handles first-run defaults and migration. | SRP — only I/O. DIP — depends on abstract store interface |
| **Tree Ops** | `lib/tree.ts` | `addItem()`, `addChild()`, `removeItem()`, `moveItem()`, `findItem()`, `flattenTree()`, `toggleCollapse()`. All pure functions taking/returning immutable-style data. | SRP — only tree manipulation. OCP — new operations don't change existing |
| **Search** | `lib/search.ts` | `filterTree()`, `highlightMatches()`, `getAncestorChain()`. Pure functions. | SRP |
| **Labels** | `lib/labels.ts` | `cycleLabel()`, `getNextLabel()`. Pure functions. | SRP |
| **UUID** | `lib/uuid.ts` | `generateId()` wrapping `crypto.randomUUID()`. | SRP — replaceable for tests |
| **Theme** | `lib/theme.ts` | `detectTheme()`, `onThemeChange()` listener setup. | SRP |
| **Tray** | `lib/tray.ts` | `setupTray()` — creates tray icon, menu, and click-to-restore handler. | SRP |
| **TitleBar** | `components/TitleBar.svelte` | Custom titlebar with drag region, minimize/maximize/close buttons, always-on-top pin. | SRP — only window chrome |
| **SearchBar** | `components/SearchBar.svelte` | Legacy search input prototype retained for reference; runtime search now expands inside the Toolbar. | SRP |
| **TodoTree** | `components/TodoTree.svelte` | Recursive component: renders `TodoItem` children within a `dndzone`. Handles consider/finalize events. | SRP — only tree rendering + DnD |
| **TodoItem** | `components/TodoItem.svelte` | Item row: chevron, text (inline editable), label badge, property dots. Right-click dispatches context menu. Hover triggers property expand. | SRP — single item rendering |
| **TodoInput** | `components/TodoInput.svelte` | Inline "Add sub-item..." composer reused in the tree. | SRP |
| **LabelBadge** | `components/LabelBadge.svelte` | Pill badge displaying label name + color. Click dispatches cycle. | SRP |
| **PropertyDots** | `components/PropertyDots.svelte` | Colored dots for assigned properties. | SRP |
| **PropertyExpand** | `components/PropertyExpand.svelte` | Expanded property names shown on hover. | SRP |
| **ContextMenu** | `components/ContextMenu.svelte` | Positioned context menu: add sub-item, properties submenu (checkboxes), delete. | SRP |
| **Settings** | `components/Settings.svelte` | Slide-out panel shell. Delegates to LabelManager + PropertyManager. | SRP |
| **LabelManager** | `components/LabelManager.svelte` | CRUD list for labels: name, color picker, drag-to-reorder. | SRP |
| **PropertyManager** | `components/PropertyManager.svelte` | CRUD list for properties: name, color picker. | SRP |
| **Toolbar** | `components/Toolbar.svelte` | Split floating controls: persistent left add surface, right-side search composer, settings, and fold controls. The pen button remains visible while search is active. | SRP |

---

## 5. Step-by-Step Implementation Checklist

### Phase 0: Project Scaffolding

**Step 0.1 — Scaffold Tauri + Svelte project**
- Run `npm create tauri-app@latest` with TypeScript + Svelte template
- Or manually: `npm create vite@latest . -- --template svelte-ts` then `npx tauri init`
- Verify `npm run tauri dev` opens a window
- **Test:** Window opens with Svelte hello-world
- **Validate:** `npm run tauri dev` succeeds

**Step 0.2 — Install plugins and dependencies**
- `npm run tauri add store`
- `npm run tauri add window-state`
- `npm install svelte-dnd-action`
- `npm install -D vitest @testing-library/svelte jsdom`
- Add `tray-icon` feature to `src-tauri/Cargo.toml`: `tauri = { features = ["tray-icon"] }`
- **Validate:** Project compiles without errors

**Step 0.3 — Configure Tauri window for Liquid Glass**
- Edit `src-tauri/tauri.conf.json`:
  ```json
  {
    "app": {
      "windows": [{
        "title": "Perch Tasks",
        "width": 340,
        "height": 520,
        "minWidth": 280,
        "minHeight": 300,
        "decorations": false,
        "transparent": true,
        "shadow": true,
        "alwaysOnTop": true,
        "visible": false,
        "windowEffects": {
          "effects": ["mica"],
          "state": "followsWindowActiveState"
        }
      }],
      "trayIcon": {
        "iconPath": "icons/icon.png",
        "tooltip": "Perch Tasks"
      }
    }
  }
  ```
- Add `"tauri > macOSPrivateApi": true` if targeting macOS later
- **Validate:** Window appears transparent with mica effect, no native titlebar

**Step 0.4 — Configure capabilities/permissions**
- `src-tauri/capabilities/default.json`:
  ```json
  {
    "identifier": "main-capability",
    "windows": ["main"],
    "permissions": [
      "core:default",
      "core:window:default",
      "core:window:allow-start-dragging",
      "core:window:allow-set-always-on-top",
      "core:window:allow-close",
      "core:window:allow-minimize",
      "core:window:allow-toggle-maximize",
      "core:window:allow-show",
      "core:window:allow-hide",
      "store:default",
      "window-state:default"
    ]
  }
  ```
- **Validate:** No permission errors at runtime

**Step 0.5 — Configure Vitest**
- Create `vitest.config.ts` with jsdom environment, resolve aliases
- **Test:** `npx vitest run` executes (no tests yet, but no config errors)

**Step 0.6 — Set up .gitignore and initial git commit**
- Ignore: `node_modules/`, `src-tauri/target/`, `dist/`, `.venv/`, `*.xlsx`
- **Commit:** `enh - scaffold Tauri 2 + Svelte 5 project`

---

### Phase 1: Data Model & Pure Logic (TDD)

**Step 1.1 — Define types**
- Create `src/lib/types.ts` with `TodoItem`, `Label`, `Property`, `AppSettings`, `AppState`
- **Test first:** Type-check test file that creates valid instances
- **Commit:** `enh - define core data model types`

**Step 1.2 — Define constants and defaults**
- Create `src/lib/constants.ts` with default labels, properties, empty initial state
- **Test first:** `constants.test.ts` — default labels have required fields, correct count, ascending order
- **Commit:** `enh - add default labels and properties`

**Step 1.3 — UUID utility**
- Create `src/lib/uuid.ts` — thin wrapper
- **Test first:** `uuid.test.ts` — generates strings, uniqueness check
- **Commit:** `enh - add UUID generation utility`

**Step 1.4 — Tree operations (core)**
- Create `src/lib/tree.ts`
- **Test first for each function:**
  - `addItem(items, text)` → returns new array with appended item
  - `addChild(items, parentId, text)` → returns tree with new child under parent
  - `removeItem(items, id)` → returns tree without item and its descendants
  - `findItem(items, id)` → returns item or null
  - `toggleCollapse(items, id)` → returns tree with toggled collapsed flag
  - `updateItemText(items, id, text)` → returns tree with updated text
- **Test edge cases:** remove non-existent ID, add child to deeply nested parent, toggle on leaf node
- **Commit:** `enh - implement core tree operations with tests`

**Step 1.5 — Tree move operation**
- `moveItem(items, itemId, targetParentId, targetIndex)` for DnD support
- **Test first:** move to different parent, move within same parent, move to root, move between depths
- **Edge case:** moving a parent into its own descendant (must be prevented)
- **Commit:** `enh - implement tree move operation`

**Step 1.6 — Label cycling logic**
- Create `src/lib/labels.ts`
- `cycleLabel(currentLabelId, sortedLabels)` → returns next label ID or null
- **Test first:**
  - null → first label
  - first → second
  - last → null (cycle back to none)
  - current label deleted from list → null
- **Commit:** `enh - implement label cycling logic`

**Step 1.7 — Search/filter logic**
- Create `src/lib/search.ts`
- `filterTree(items, query)` → returns tree with only matching items + ancestor chains
- `highlightText(text, query)` → returns segments array for rendering
- **Test first:**
  - empty query returns all items
  - matching leaf keeps parent visible
  - non-matching subtree hidden entirely
  - case-insensitive matching
  - nested match preserves full ancestor chain
- **Commit:** `enh - implement search and filter logic`

---

### Phase 2: Persistence & State Management

**Step 2.1 — Persistence layer**
- Create `src/lib/persistence.ts`
- `loadState(): Promise<AppState>` — loads from LazyStore, returns defaults on first run
- `saveState(state: AppState): Promise<void>` — writes to store
- **Test first:** Mock the store module; verify load returns defaults when empty, save serializes correctly
- **Commit:** `enh - implement persistence layer via plugin-store`

**Step 2.2 — Reactive state module**
- Create `src/lib/state.svelte.ts`
- Wraps `AppState` in `$state`
- Exposes action functions that call tree/label/search pure functions and update state
- `$derived` for `sortedLabels`, `filteredItems`
- `$effect` that calls `saveState()` on any change (debounced via store's built-in debounce)
- **Test first:** State actions produce correct state transitions (unit test the exported functions)
- **Commit:** `enh - implement reactive state management`

---

### Phase 3: Window Chrome & Layout

**Step 3.1 — Global CSS / Liquid Glass design tokens**
- Create `src/app.css` with:
  - CSS variables for colors, radii, spacing, blur, transparency
  - Dark/light mode via `@media (prefers-color-scheme)` and `.dark` / `.light` class
  - Base reset, font setup (system-ui)
- **Validate:** Visually inspect in dev mode
- **Commit:** `enh - add Liquid Glass CSS design tokens and base styles`

**Step 3.2 — Custom TitleBar component**
- Create `src/components/TitleBar.svelte`
- Drag region via `data-tauri-drag-region`
- Minimize, maximize, close buttons using `@tauri-apps/api/window`
- Always-on-top pin toggle
- App title
- **Test:** Renders title, buttons exist, pin toggle dispatches event
- **Validate:** Drag to move window works, buttons work, pin toggles always-on-top
- **Commit:** `enh - implement custom titlebar with window controls`

**Step 3.3 — App shell layout**
- Wire `App.svelte`: TitleBar → scrollable todo list → persistent left add composer plus right floating search/settings/fold controls
- **Validate:** Layout renders correctly, scrolling works, frosted glass visible behind content
- **Commit:** `enh - implement app shell layout`

**Step 3.4 — System tray**
- Create `src/lib/tray.ts`
- `setupTray()`: create tray icon with "Show" and "Quit" menu items
- Close button hides window instead of quitting
- Tray click restores window
- **Validate:** Minimize to tray, click tray icon restores, "Quit" exits app
- **Commit:** `enh - implement system tray with minimize/restore`

**Step 3.5 — Theme detection**
- Create `src/lib/theme.ts`
- Detect system dark/light mode
- Apply CSS class to root element
- Listen for changes
- **Validate:** Switching Windows dark/light mode updates app appearance
- **Commit:** `enh - implement system theme detection and switching`

---

### Phase 4: Core Todo UI

**Step 4.1 — TodoInput component**
- Create `src/components/TodoInput.svelte`
- Input field, Enter to submit, Escape to cancel
- Accepts `onSubmit` callback and optional `placeholder`
- **Test:** Renders input, fires onSubmit with text on Enter, clears after submit
- **Commit:** `enh - implement TodoInput component`

**Step 4.2 — TodoItem component (basic)**
- Create `src/components/TodoItem.svelte`
- Displays item text, chevron if has children, indentation based on depth
- Click text → inline edit mode (contenteditable or swap to input)
- **Test:** Renders text, shows chevron when children exist, entering edit mode
- **Commit:** `enh - implement basic TodoItem component`

**Step 4.3 — TodoTree component (recursive rendering)**
- Create `src/components/TodoTree.svelte`
- Recursive: renders `TodoItem` for each item, and nested `TodoTree` for children (when expanded)
- Each level is a `dndzone` from `svelte-dnd-action`
- **Test:** Renders flat list, renders nested children when expanded
- **Validate:** Items display with proper indentation
- **Commit:** `enh - implement recursive TodoTree component`

**Step 4.4 — Fold/unfold**
- Wire chevron click in TodoItem → `toggleCollapse` → state update
- Animate expand/collapse with CSS transitions (height + opacity)
- **Validate:** Clicking chevron collapses/expands children with smooth animation
- **Commit:** `enh - implement fold/unfold with animation`

**Step 4.5 — Add top-level item**
- Wire TodoInput at bottom of tree → `addItem` → state update
- New item appears at end with smooth entry animation
- **Validate:** Type text + Enter → new item appears, persists after restart
- **Commit:** `enh - wire add top-level item flow`

**Step 4.6 — Add sub-item (via context menu or inline button)**
- Right-click item → "Add sub-item" or click the row-end `↳` trigger on a parent row, including folded parents → inline TodoInput below parent
- On submit → `addChild` → state update, parent auto-expands
- **Validate:** Sub-item appears indented, parent shows chevron
- **Commit:** `enh - implement add sub-item flow`

---

### Phase 5: Labels & Properties

**Step 5.1 — LabelBadge component**
- Create `src/components/LabelBadge.svelte`
- Pill shape, background from label color, truncated text
- **Test:** Renders with correct color and text
- **Commit:** `enh - implement LabelBadge component`

**Step 5.2 — Label cycling in TodoItem**
- Click label area → `cycleLabel` → state update
- Badge appears/changes/disappears with CSS transition
- **Validate:** Cycling through all labels and back to none
- **Commit:** `enh - implement label cycling on click`

**Step 5.3 — PropertyDots component**
- Create `src/components/PropertyDots.svelte`
- Small colored circles for each assigned property
- **Test:** Renders correct number of dots with correct colors
- **Commit:** `enh - implement PropertyDots component`

**Step 5.4 — PropertyExpand (hover reveal)**
- Create `src/components/PropertyExpand.svelte`
- Shows property names in colored text below item on hover
- ~200ms delay before expanding, collapse on mouse leave
- **Validate:** Hover shows properties, leave hides them, smooth animation
- **Commit:** `enh - implement property expansion on hover`

**Step 5.5 — ContextMenu component**
- Create `src/components/ContextMenu.svelte`
- Positioned at cursor on right-click
- Items: "Add sub-item", "Properties >" (submenu with checkboxes), "Delete"
- Closes on click outside or Escape
- **Test:** Renders menu items, checkbox states match assigned properties
- **Commit:** `enh - implement context menu with property assignment`

---

### Phase 6: Drag & Drop

**Step 6.1 — DnD within same level**
- Wire `svelte-dnd-action` on each `TodoTree` level
- `consider` and `finalize` events update items array in state
- Scoped by depth: items only drag within their sibling group
- **Validate:** Drag items to reorder, animation is smooth, state persists
- **Commit:** `enh - implement drag-and-drop reordering within same level`

**Step 6.2 — DnD across levels (optional, if feasible)**
- Allow dragging items between different parent contexts
- Use `type` prop on dndzone to scope or unify zones
- Must prevent dragging parent into its own descendant
- **Validate:** Item can be moved to different parent, tree integrity maintained
- **Commit:** `enh - implement cross-level drag-and-drop`

---

### Phase 7: Delete & Search

**Step 7.1 — Swipe-to-delete**
- Implement horizontal swipe gesture on TodoItem (pointer events / touch events)
- Reveal red "Delete" zone on swipe left
- Complete swipe → `removeItem` → state update
- **Validate:** Swipe reveals delete, completing removes item + children
- **Commit:** `enh - implement swipe-to-delete gesture`

**Step 7.2 — Right-click delete (fallback)**
- "Delete" option in context menu → `removeItem`
- Confirmation not required per PRD (kept simple)
- **Validate:** Right-click delete works
- **Commit:** `enh - add right-click delete fallback`

**Step 7.3 — SearchBar component**
- Create `src/components/SearchBar.svelte`
- Ctrl+F activates, Escape clears and closes
- Real-time filter via `filterTree` as user types
- **Test:** Filter function called on input, clear on Escape
- **Commit:** `enh - implement search bar component`

**Step 7.4 — Search results rendering**
- TodoTree uses filtered tree when search is active
- Non-matching items hidden, matching text highlighted
- Parent chain of matches stays visible
- **Validate:** Search filters in real-time, highlighting visible, Escape restores full list
- **Commit:** `enh - implement search result rendering with highlight`

---

### Phase 8: Settings Panel

**Step 8.1 — Settings shell**
- Create `src/components/Settings.svelte`
- Slide-out panel from right, triggered by gear icon in Toolbar
- Close on click outside or Escape
- **Validate:** Panel slides in/out smoothly
- **Commit:** `enh - implement settings panel shell`

**Step 8.2 — LabelManager**
- Create `src/components/LabelManager.svelte`
- List of labels with: name input, color picker, drag-to-reorder (svelte-dnd-action), delete button
- Add new label button
- **Test:** Adding label updates state, reorder changes sort order
- **Validate:** Label changes reflected immediately in todo items
- **Commit:** `enh - implement label CRUD in settings`

**Step 8.3 — PropertyManager**
- Create `src/components/PropertyManager.svelte`
- List of properties with: name input, color picker, delete button
- Add new property button
- **Test:** Adding/removing property updates state
- **Validate:** Property changes reflected in context menu and item display
- **Commit:** `enh - implement property CRUD in settings`

**Step 8.4 — Always-on-top setting**
- Toggle in settings + TitleBar pin
- Calls `window.setAlwaysOnTop()` from Tauri API
- Persisted in state
- **Validate:** Toggle works, persists across restart
- **Commit:** `enh - implement always-on-top toggle`

---

### Phase 9: Polish & Edge Cases

**Step 9.1 — Keyboard navigation**
- Tab through items, Enter to edit, Escape to stop editing
- Arrow keys in DnD (built into svelte-dnd-action)
- Ctrl+N or focused input for new item shortcut
- **Validate:** Full workflow possible without mouse
- **Commit:** `enh - implement keyboard navigation`

**Step 9.2 — Animations & transitions**
- Item add/remove: height transition with opacity fade
- Fold/unfold: smooth collapse
- Label cycle: color crossfade
- Settings panel: slide-in
- **Validate:** All animations smooth at 60fps
- **Commit:** `cos - polish animations and transitions`

**Step 9.3 — Scrolling behavior**
- Vertical scroll for overflowing content
- DnD auto-scrolls parent container (built into svelte-dnd-action)
- Frosted glass remains fixed behind scrolling content
- **Validate:** Long lists scroll properly, glass effect stable
- **Commit:** `fix - handle scrolling with frosted glass background`

**Step 9.4 — Empty state**
- Friendly message when no items exist
- **Commit:** `enh - add empty state illustration`

**Step 9.5 — Error handling**
- Persistence failures: retry + silent fallback
- Invalid state on load: reset to defaults with warning
- **Commit:** `fix - add error handling for persistence edge cases`

---

### Phase 10: Final Validation

**Step 10.1 — Full test suite pass**
- Run `npx vitest run` — all tests green
- **Validate:** Coverage report shows critical paths covered

**Step 10.2 — Manual smoke test**
- Walk through every PRD requirement (F-01 through F-30, NF-01 through NF-06)
- Test on Windows 10 and Windows 11

**Step 10.3 — Build and bundle**
- `npm run tauri build`
- Verify installer size < 15MB (NF-02)
- Install and test from installer
- **Commit:** `enh - finalize build configuration`

**Step 10.4 — README**
- Document: setup, dev commands, architecture overview, build instructions
- **Commit:** `doc - add README with setup and build instructions`

---

## 6. Risks, Edge Cases, and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Mica/acrylic not available on Windows 10 pre-1903** | Medium | Fall back to `"blur"` or solid semi-transparent background. Detect OS version at startup. |
| **`windowEffects` + `transparent: true` + `decorations: false` combination produces visual artifacts** | Medium | Test early (Step 0.3). If problematic, use `"acrylic"` instead of `"mica"`, or fall back to CSS `backdrop-filter: blur()` over a transparent window. |
| **svelte-dnd-action nested zones: drag into own descendant** | High | `tree.ts moveItem()` must validate no circular reference. Reject the move if target is a descendant of the dragged item. |
| **svelte-dnd-action Svelte 5 event syntax** | Low | Library supports both `on:consider`/`on:finalize` and `onconsider`/`onfinalize` (Svelte 5 prefers the latter). Use the new syntax consistently. |
| **Deep nesting performance (>10 levels)** | Low | Unlikely in a sticky notes use case. If needed, limit max depth or virtualize. |
| **Swipe-to-delete conflict with text selection / DnD** | Medium | Swipe only activates on horizontal gesture > threshold. DnD uses vertical/multi-directional. Add `delayTouchStart` option on dndzone. |
| **LazyStore data corruption on crash** | Low | Plugin-store writes atomically. For extra safety, keep a backup key with previous state. |
| **Window state plugin conflict with custom position logic** | Low | Use only `plugin-window-state` for position memory. Do not implement manual `x`/`y` persistence. |
| **Custom titlebar not draggable over interactive elements** | Medium | `data-tauri-drag-region` only works on the element it's applied to. Ensure the drag region div has no interactive children covering it. |
| **Context menu clipped by window edge** | Medium | Calculate position to flip menu when near edges. |
| **Search with special regex characters** | Low | Escape user input before using in match logic. Use `String.includes()` rather than regex. |
| **First-run state load race condition** | Medium | Await `loadState()` before rendering. Use Svelte `{#await}` or loading flag. |

---

## 7. Validation Plan

### Automated Testing (Vitest)

| Layer | What to test | How |
|-------|-------------|-----|
| **Types** | Type-checking compiles | TypeScript build |
| **Tree ops** | All CRUD operations, edge cases, circular move prevention | Unit tests with assertions on returned tree shape |
| **Label cycling** | Full cycle, boundary cases, deleted label handling | Unit tests |
| **Search/filter** | Query matching, ancestor preservation, empty query, case insensitivity | Unit tests |
| **Persistence** | Load defaults, save/load round-trip, migration | Unit tests with mocked store |
| **State** | Action functions produce correct transitions | Unit tests (import and call directly) |
| **Components** | TodoItem renders text/label/dots, LabelBadge shows color, Settings CRUD | `@testing-library/svelte` |

### Manual Testing Checklist

- [ ] Window appears transparent with frosted glass effect
- [ ] Custom titlebar: drag to move, minimize, maximize, close
- [ ] Always-on-top: pin works, persists
- [ ] Add item via input + Enter
- [ ] Add sub-item via right-click
- [ ] Edit item text inline
- [ ] Fold/unfold children
- [ ] Label cycling: click through all → none
- [ ] Property assignment via context menu
- [ ] Property dots visible, expand on hover
- [ ] Drag-and-drop reorder within level
- [ ] Swipe-to-delete + right-click delete
- [ ] Search: filter, highlight, Escape to clear
- [ ] Settings: add/edit/delete/reorder labels
- [ ] Settings: add/edit/delete properties
- [ ] Minimize to tray, tray click restores
- [ ] Dark/light mode switching
- [ ] Data persists after restart
- [ ] Window position/size restored after restart
- [ ] Keyboard navigation for all features
- [ ] Startup time < 2 seconds
- [ ] Installer size < 15 MB

---

## 8. Assumptions

1. **Windows 10/11 is the primary target.** macOS/Linux support is out of scope for v1 but the architecture doesn't preclude it.
2. **Node.js and Rust toolchain are pre-installed** on the development machine (Tauri 2 prerequisites).
3. **No CI/CD pipeline** is needed for v1. Build and test locally.
4. **No authentication, network access, or cloud storage.** Pure local app.
5. **Dataset size is small** (< 500 items). No virtualization needed.
6. **`crypto.randomUUID()`** is available in the Tauri webview (WebView2 on Windows supports it).
7. **svelte-dnd-action v0.9.69** remains compatible with Svelte 5. The library explicitly note Svelte 5 support. If a breaking change occurs, the action API is stable enough to pin the version.
8. **The PRD's data model is final.** If requirements shift (e.g., adding due dates), the modular architecture allows extension without restructuring.
9. **Windows acrylic/mica effects** are available via Tauri's `windowEffects` configuration without additional Rust code. Verified from the Tauri config reference: `WindowEffect` enum includes `mica`, `micaDark`, `micaLight`, `acrylic`, `blur`.
10. **The Tauri store plugin** handles file location (`$APPDATA`), atomic writes, and debounced auto-save. We do not need to manage the file path ourselves.

---

## Documentation References Used

- Tauri 2 Create Project: https://v2.tauri.app/start/create-project/
- Tauri 2 Configuration Reference: https://v2.tauri.app/reference/config/
- Tauri 2 WindowConfig (`windowEffects`, `transparent`, `decorations`, `alwaysOnTop`): https://v2.tauri.app/reference/config/#windowconfig
- Tauri 2 WindowEffectsConfig (mica, acrylic, blur): https://v2.tauri.app/reference/config/#windoweffectsconfig
- Tauri 2 System Tray: https://v2.tauri.app/learn/system-tray/
- Tauri 2 Window Customization: https://v2.tauri.app/learn/window-customization/
- Tauri 2 File System Plugin: https://v2.tauri.app/plugin/file-system/
- Tauri 2 Store Plugin: https://v2.tauri.app/plugin/store/
- Tauri 2 Window State Plugin: https://v2.tauri.app/plugin/window-state/
- svelte-dnd-action (npm): https://www.npmjs.com/package/svelte-dnd-action
