# Product Requirements Document — Perch Tasks

## 1. Product Overview

A lightweight, always-on-top desktop todo application for Windows, inspired by Windows Sticky Notes. Built with **Tauri 2 + Svelte 5 + TypeScript**, featuring a translucent frosted-glass window following Apple's **Liquid Glass** design principles.

Users can quickly capture tasks, organize them with collapsible sub-items, track status via cycling labels, and annotate items with color-coded properties — all in a compact, floating window that stays visible while working.

## 2. Target Users

Individual knowledge workers who need a persistent, low-friction task capture and tracking surface that floats above their workspace.

## 3. Design Language — Liquid Glass Adaptation

Apple's Liquid Glass design system emphasizes three core principles adapted for this desktop app:

### 3.1 Hierarchy
- **Functional layer** (title bar, toolbar, settings panel) floats above the **content layer** (todo list).
- Navigation and controls use glass-like translucent styling; the todo list content uses standard opaque/semi-opaque surfaces.
- Clear visual separation between interactive controls and content.

### 3.2 Harmony
- Rounded, concentric shapes: window corners, list item corners, buttons, and badges all share a harmonious curvature.
- Smooth, fluid transitions: fold/unfold animations, label cycling, item insertion/removal.
- Color language is restrained; accent colors reserved for labels and property indicators.

### 3.3 Consistency
- Platform-aware: respects Windows dark/light mode.
- Controls behave predictably. Same gestures/interactions work the same everywhere.
- Typography hierarchy: item text > sub-item text > label badges > property indicators.

### 3.4 Visual Specifics
- **Window**: Semi-transparent frosted background (acrylic/mica-like effect via Tauri), rounded corners.
- **Controls**: Glass-styled buttons with subtle translucency and hover glow.
- **Labels**: Pill-shaped badges with user-defined colored backgrounds, appearing after item text.
- **Properties**: Small colored circles when collapsed; expand inline on item hover to show text.
- **Fold indicators**: Subtle chevron (▸/▾) before items that have children.
- **Spacing**: Generous padding, breathing room between items. No visual clutter.

## 4. Functional Requirements

### 4.1 Core Todo Management

| ID | Requirement | Details |
|------|-------------|---------|
| F-01 | Add item | User can add a new top-level todo item via an input field or keyboard shortcut. |
| F-02 | Add sub-item | User can add a child item under any existing item. |
| F-03 | Unlimited nesting | Sub-items can have their own sub-items (tree structure, unlimited depth). |
| F-04 | Fold/unfold | Clicking the chevron on a parent item collapses/expands all its descendants. |
| F-05 | Edit item text | Clicking on item text enters inline edit mode. |
| F-06 | Delete item | Swipe-to-delete gesture removes an item (and all its descendants). |
| F-07 | Reorder items | Drag-and-drop to reorder items and sub-items within their parent scope. |

### 4.2 Labels (Status Tracking)

| ID | Requirement | Details |
|------|-------------|---------|
| F-08 | One label per item | Each item can have zero or one label assigned. |
| F-09 | Cycle on click | Clicking the label area cycles through labels in ascending user-defined order: (none) → label₁ → label₂ → … → labelₙ → (none). |
| F-10 | Visual display | Label appears as a pill-shaped badge after the item text with the label's configured background color. |
| F-11 | User-defined labels | Users create, rename, reorder, delete, and color-code labels in Settings. |
| F-12 | Ascending order | Label cycle order matches the ascending order set by the user in settings. |

**Default labels (shipped out-of-box):**
1. "on hold" — gray background
2. "waiting for reply" — amber/orange background
3. "in progress" — blue background
4. "done" — green background

### 4.3 Properties (Metadata Annotations)

| ID | Requirement | Details |
|------|-------------|---------|
| F-13 | Multiple properties | Each item can have zero or more properties assigned simultaneously. |
| F-14 | Assign via context menu | Right-clicking an item opens a context menu with a "Properties" sub-menu listing all available properties as checkboxes. |
| F-15 | Color-coded indicators | When not hovering, assigned properties appear as small colored dots/circles next to the item. |
| F-16 | Inline expansion on hover | Hovering over an item expands it to show the full property text inline below the item text. |
| F-17 | User-defined properties | Users create, rename, delete, and color-code properties in Settings. |

**Default properties (shipped out-of-box):**
1. "Urgent" — red indicator
2. "Important" — orange indicator

### 4.4 Window Behavior

| ID | Requirement | Details |
|------|-------------|---------|
| F-18 | Always-on-top toggle | User can toggle whether the window floats above all other windows. |
| F-19 | Translucent window | Window uses a frosted/acrylic translucent background. |
| F-20 | Minimize to system tray | Closing/minimizing sends the app to the system tray; tray icon click restores it. |
| F-21 | Window resizing | The window is freely resizable; content scrolls vertically. |
| F-22 | Window position memory | The app remembers its last position and size across restarts. |

### 4.5 Search & Filter

| ID | Requirement | Details |
|------|-------------|---------|
| F-23 | Text search | A search field filters the visible items by matching text in item names. |
| F-24 | Highlight matches | Matching text is highlighted in search results. |
| F-25 | Collapse non-matching | Non-matching items without matching descendants are hidden; parent chain of matching items stays visible. |

### 4.6 Settings

| ID | Requirement | Details |
|------|-------------|---------|
| F-26 | Settings panel | A slide-out or modal settings panel accessible from a gear icon. |
| F-27 | Label management | CRUD operations on labels: name, color, sort order. Drag to reorder. |
| F-28 | Property management | CRUD operations on properties: name, color. |
| F-29 | Always-on-top toggle | Toggle in settings (also accessible from title bar). |
| F-30 | Theme | Follow system dark/light mode (auto-detect). |

## 5. Non-Functional Requirements

| ID | Requirement | Details |
|------|-------------|---------|
| NF-01 | Startup time | App should launch and be interactive within 2 seconds. |
| NF-02 | Bundle size | Tauri produces a compact installer (<15 MB). |
| NF-03 | Persistence | All data saved to a local JSON file in the OS app-data directory. Auto-save on every change with debounce. |
| NF-04 | Platform | Windows 10/11. (macOS/Linux can be targeted later with minimal changes.) |
| NF-05 | Accessibility | Keyboard navigation for all features. ARIA labels. High-contrast mode support. |
| NF-06 | Security | No network access. Local file I/O only. Tauri's strict CSP. No eval(). |

## 6. Data Model (Conceptual)

```
TodoItem {
  id: string (UUID)
  text: string
  labelId: string | null
  propertyIds: string[]
  children: TodoItem[]
  collapsed: boolean
  createdAt: ISO timestamp
  updatedAt: ISO timestamp
}

Label {
  id: string (UUID)
  name: string
  color: string (hex)
  order: number
}

Property {
  id: string (UUID)
  name: string
  color: string (hex)
}

AppState {
  items: TodoItem[]
  labels: Label[]
  properties: Property[]
  settings: {
    alwaysOnTop: boolean
    windowPosition: { x, y, width, height }
    theme: "auto" | "light" | "dark"
  }
}
```

## 7. User Interaction Flow

### Adding an item
1. The left floating toolbar opens with the add composer visible by default.
2. User types text and presses Enter to submit.
3. The composer stays open until the user clicks the pen icon, clicks the `x`, or opens search.
4. New item appears at the bottom of the top-level list.

### Adding a sub-item
1. User right-clicks an item → "Add sub-item" or clicks the inline `↳` symbol on the right side of a parent row, even when its child list is folded.
2. New child input appears indented under the parent.
3. Types text, presses Enter. Child is added.

### Cycling a label
1. User clicks the label badge area (right side of item row).
2. Label advances to next in order. If none → first label → second → … → none.
3. Badge appears/changes/disappears with smooth transition.

### Assigning properties
1. User right-clicks an item → "Properties" submenu.
2. Checkboxes for each defined property. User toggles desired ones.
3. Colored dots appear next to item immediately.

### Hovering for property details
1. User hovers over an item with properties.
2. After a brief delay (~200ms), the item row gently expands to show property names in colored text below the main text.
3. On mouse leave, the expansion collapses.

### Swiping to delete
1. User swipes left on an item (or uses trackpad gesture).
2. A red "Delete" area reveals underneath.
3. Completing the swipe or tapping "Delete" removes the item and all its children.
4. Fallback: right-click → "Delete" for users without touch/trackpad.

### Folding/unfolding
1. User clicks the chevron (▸) on a parent item.
2. All children collapse with a smooth animation. Chevron becomes ▾.
3. Clicking again expands children.

### Searching
1. User clicks the search icon or presses Ctrl+F.
2. The left add text field temporarily disappears, but the pen button remains visible; the right floating toolbar expands into a search composer with the search icon on the left, input in the middle, and cancel on the right.
3. Typing filters the list in real-time; non-matching items fade/hide.
4. Pressing Escape or clicking the cancel button clears search, restores the full list, and brings the add composer back if it was visible before search opened.

## 8. Example Rendering

```
─────────────────────────────────────
  📌 Perch Tasks              ☐ □ ✕
─────────────────────────────────────
  ✎ Add todo...                 ✕

  ▾ Call Mark                   ● ●
    └ Tell him about last week
    └ Ask about Mike

  ▾ Draft mail to Karl    [in progress]
    └ Include nice greeting  [drafted¹]
    └ Include project status [done]

  ▸ Draft mail to Mike     [on hold]
     ● ●                  (3 sub-items)

─────────────────────────────────────
  🔍   ⚙   ⇥
─────────────────────────────────────
```

¹ "drafted" would be a user-defined label if the user adds it.

## 9. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Native shell | Tauri 2 | Lightweight, secure, native Windows APIs for always-on-top, system tray, transparent windows. |
| Frontend | Svelte 5 | Reactive, small bundle, fast rendering, excellent DX. |
| Language | TypeScript 5 | Type safety, IDE support. |
| Build | Vite | Fast dev server, HMR. |
| Styling | CSS (custom) | Liquid Glass effects via CSS backdrop-filter, blur, gradients. No framework needed. |
| Persistence | JSON file | Via Tauri fs API, saved to OS app-data directory. |
| Drag & drop | svelte-dnd-action or custom | Tree-aware drag and drop for reordering. |
| Testing | Vitest | Unit and component testing. |

## 10. Out of Scope (v1)

- Cloud sync / multi-device
- Collaboration / sharing
- Reminders / due dates / notifications
- Rich text / markdown in items
- Multiple boards / lists
- Import / export
- macOS / Linux builds (future but not blocked)

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Tauri transparent/acrylic window support on Windows | Tauri 2 supports `transparent: true` and Windows acrylic effects. Test early. |
| Drag-and-drop in nested tree structure | Use a proven library or implement carefully. Scope DnD to same-depth first, cross-depth if feasible. |
| Swipe-to-delete on desktop (no touch) | Provide right-click → Delete as fallback. Swipe works on trackpad. |
| Performance with deep nesting | Virtualize list if >500 visible items; unlikely for a sticky notes use case. |

## 12. Success Criteria

1. App launches in <2s, window is translucent and always-on-top.
2. User can add, edit, delete, reorder items and sub-items.
3. Labels cycle correctly on click in user-defined order.
4. Properties can be assigned via right-click and show on hover.
5. Settings allow full CRUD on labels and properties.
6. Data persists across restarts.
7. System tray integration works (minimize/restore).
8. Search filters items in real-time.
