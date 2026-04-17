import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ContextMenu from '../components/ContextMenu.svelte';
import TodoInput from '../components/TodoInput.svelte';
import TodoItem from '../components/TodoItem.svelte';
import TodoTree from '../components/TodoTree.svelte';
import type { Label, TodoItem as TodoItemModel } from '../lib/types';

const stateMocks = vi.hoisted(() => ({
  actionAddChild: vi.fn(),
  actionCycleLabel: vi.fn(),
  actionRemoveItem: vi.fn(),
  actionToggleCollapse: vi.fn(),
  actionToggleItemNoteCollapsed: vi.fn(),
  actionToggleProperty: vi.fn(),
  actionUpdateItemNote: vi.fn(),
  actionUpdateItemText: vi.fn(),
  getState: vi.fn(() => ({ items: [] as TodoItemModel[] })),
}));

vi.mock('../lib/state.svelte', () => ({
  actionAddChild: stateMocks.actionAddChild,
  actionCycleLabel: stateMocks.actionCycleLabel,
  actionRemoveItem: stateMocks.actionRemoveItem,
  actionToggleCollapse: stateMocks.actionToggleCollapse,
  actionToggleItemNoteCollapsed: stateMocks.actionToggleItemNoteCollapsed,
  actionToggleProperty: stateMocks.actionToggleProperty,
  actionUpdateItemNote: stateMocks.actionUpdateItemNote,
  actionUpdateItemText: stateMocks.actionUpdateItemText,
  getState: stateMocks.getState,
}));

function makeItem(overrides: Partial<TodoItemModel> = {}): TodoItemModel {
  return {
    id: 'item-1',
    text: 'Parent task',
    labelId: null,
    note: '',
    noteCollapsed: true,
    propertyIds: [],
    children: [],
    collapsed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const labels: Label[] = [
  { id: 'label-on-hold', name: 'on hold', color: '#6b7280', order: 0 },
  { id: 'label-done', name: 'done', color: '#16a34a', order: 1 },
];

function makeTreeProps() {
  return {
    activeChildComposerParentId: null,
    activeNoteEditorItemId: null,
    activeRenameItemId: null,
    canReorder: false,
    hoveredAddTargetId: null,
    onCloseChildComposer: vi.fn(),
    onContextMenu: vi.fn(),
    onHoverAddTarget: vi.fn(),
    onNoteEditorHandled: vi.fn(),
    onReorderItems: vi.fn(),
    onRenameHandled: vi.fn(),
    onRequestAddChild: vi.fn(),
    parentItemId: null,
  };
}

function renderInteractiveTodoItem(overrides: Partial<TodoItemModel> = {}) {
  let activeNoteEditorItemId: string | null = null;
  let activeRenameItemId: string | null = null;

  const item = makeItem(overrides);
  const baseProps = {
    item,
    labels,
    properties: [],
    depth: 0,
    reorderEnabled: false,
    searchQuery: '',
    onContextMenu: vi.fn(),
  };

  let rerender: ((props: Record<string, unknown>) => Promise<void>) | null = null;

  const sync = async () => {
    if (!rerender) return;

    await rerender({
      ...baseProps,
      activeNoteEditorItemId,
      activeRenameItemId,
      onNoteEditorHandled: async () => {
        activeNoteEditorItemId = null;
        await sync();
      },
      onRenameHandled: async () => {
        activeRenameItemId = null;
        await sync();
      },
    });
  };

  const rendered = render(TodoItem, {
    ...baseProps,
    activeNoteEditorItemId,
    activeRenameItemId,
    onNoteEditorHandled: async () => {
      activeNoteEditorItemId = null;
      await sync();
    },
    onRenameHandled: async () => {
      activeRenameItemId = null;
      await sync();
    },
  });

  rerender = rendered.rerender;
  return rendered;
}

function renderInteractiveTodoTree(itemOverrides: Partial<TodoItemModel> = {}) {
  let activeChildComposerParentId: string | null = null;
  let activeNoteEditorItemId: string | null = null;
  let activeRenameItemId: string | null = null;
  let hoveredAddTargetId: string | null = null;

  const items = [makeItem(itemOverrides)];
  let rerender: ((props: Record<string, unknown>) => Promise<void>) | null = null;

  const sync = async () => {
    if (!rerender) return;

    await rerender({
      items,
      labels,
      properties: [],
      parentItemId: null,
      depth: 0,
      searchQuery: '',
      canReorder: false,
      hoveredAddTargetId,
      onContextMenu: vi.fn(),
      onReorderItems: vi.fn(),
      activeChildComposerParentId,
      activeNoteEditorItemId,
      activeRenameItemId,
      onHoverAddTarget: async (itemId: string | null) => {
        hoveredAddTargetId = itemId;
        await sync();
      },
      onRequestAddChild: async (itemId: string) => {
        activeChildComposerParentId = itemId;
        await sync();
      },
      onCloseChildComposer: async () => {
        activeChildComposerParentId = null;
        await sync();
      },
      onNoteEditorHandled: async () => {
        activeNoteEditorItemId = null;
        await sync();
      },
      onRenameHandled: async () => {
        activeRenameItemId = null;
        await sync();
      },
    });
  };

  const rendered = render(TodoTree, {
    items,
    labels,
    properties: [],
    parentItemId: null,
    depth: 0,
    searchQuery: '',
    canReorder: false,
    hoveredAddTargetId,
    onContextMenu: vi.fn(),
    onReorderItems: vi.fn(),
    activeChildComposerParentId,
    activeNoteEditorItemId,
    activeRenameItemId,
    onHoverAddTarget: async (itemId: string | null) => {
      hoveredAddTargetId = itemId;
      await sync();
    },
    onRequestAddChild: async (itemId: string) => {
      activeChildComposerParentId = itemId;
      await sync();
    },
    onCloseChildComposer: async () => {
      activeChildComposerParentId = null;
      await sync();
    },
    onNoteEditorHandled: async () => {
      activeNoteEditorItemId = null;
      await sync();
    },
    onRenameHandled: async () => {
      activeRenameItemId = null;
      await sync();
    },
  });

  rerender = rendered.rerender;
  return rendered;
}

describe('TodoTree search rendering', () => {
  it('shows matching descendants even when their ancestor is collapsed during search', () => {
    const treeProps = makeTreeProps();

    render(TodoTree, {
      items: [
        makeItem({
          id: 'parent',
          collapsed: true,
          children: [makeItem({ id: 'child', text: 'Deep child match' })],
        }),
      ],
      labels: [],
      properties: [],
      depth: 0,
      searchQuery: 'deep',
      ...treeProps,
    });

    expect(
      screen.getByText((_, element) => element?.textContent === 'Deep child match')
    ).toBeTruthy();
  });
});

describe('TodoInput', () => {
  it('submits the current text when the add button is clicked', async () => {
    const onSubmit = vi.fn();

    render(TodoInput, {
      onSubmit,
    });

    const input = screen.getByLabelText('Add todo...');
    await fireEvent.input(input, { target: { value: 'Clicked add task' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(onSubmit).toHaveBeenCalledWith('Clicked add task');
  });
});

describe('TodoItem interactions', () => {
  it('renders a drag handle only when reordering is enabled', async () => {
    const onRenameHandled = vi.fn();
    const { rerender } = render(TodoItem, {
      item: makeItem(),
      labels,
      properties: [],
      depth: 0,
      reorderEnabled: true,
      searchQuery: '',
      onContextMenu: vi.fn(),
      activeNoteEditorItemId: null,
      activeRenameItemId: null,
      onNoteEditorHandled: vi.fn(),
      onRenameHandled,
    });

    expect(screen.getByRole('button', { name: /drag item/i })).toBeTruthy();

    await rerender({
      item: makeItem(),
      labels,
      properties: [],
      depth: 0,
      reorderEnabled: false,
      searchQuery: '',
      onContextMenu: vi.fn(),
      activeNoteEditorItemId: null,
      activeRenameItemId: null,
      onNoteEditorHandled: vi.fn(),
      onRenameHandled,
    });

    expect(screen.queryByRole('button', { name: /drag item/i })).toBeNull();
  });

  it('cycles the label on single click instead of starting inline rename', async () => {
    renderInteractiveTodoItem();

    const swipeTrack = screen.getByText('Parent task').closest('.swipe-track') as HTMLElement;
    await fireEvent.click(swipeTrack);

    expect(stateMocks.actionCycleLabel).toHaveBeenCalledWith('item-1');
    expect(screen.queryByDisplayValue('Parent task')).toBeNull();
  });

  it('does not start inline rename on double click', async () => {
    renderInteractiveTodoItem();

    await fireEvent.dblClick(screen.getByText('Parent task'));

    expect(screen.queryByDisplayValue('Parent task')).toBeNull();
  });

  it('removes an item on a strong left swipe', async () => {
    renderInteractiveTodoItem();

    const swipeTrack = screen.getByText('Parent task').closest('.swipe-track') as HTMLElement;
    await fireEvent.mouseDown(swipeTrack, { button: 0, clientX: 240, clientY: 20 });
    await fireEvent.mouseMove(window, { buttons: 1, clientX: 140, clientY: 24 });
    await fireEvent.mouseUp(window, { button: 0, clientX: 140, clientY: 24 });

    expect(stateMocks.actionRemoveItem).toHaveBeenCalledWith('item-1');
  });

  it('keeps the swipe delete action hidden until the row is revealed', async () => {
    const { container } = renderInteractiveTodoItem();

    const swipeShell = container.querySelector('.swipe-shell') as HTMLElement;
    expect(swipeShell.classList.contains('delete-visible')).toBe(false);

    const swipeTrack = screen.getByText('Parent task').closest('.swipe-track') as HTMLElement;
    await fireEvent.mouseDown(swipeTrack, { button: 0, clientX: 240, clientY: 20 });
    await fireEvent.mouseMove(window, { buttons: 1, clientX: 200, clientY: 24 });

    expect(swipeShell.classList.contains('delete-visible')).toBe(true);
  });

  it('keeps a saved note hidden until the note is expanded', () => {
    render(TodoItem, {
      item: makeItem({ note: 'Remember to attach the quote.' }),
      labels,
      properties: [],
      depth: 0,
      reorderEnabled: false,
      searchQuery: '',
      onContextMenu: vi.fn(),
      activeNoteEditorItemId: null,
      activeRenameItemId: null,
      onNoteEditorHandled: vi.fn(),
      onRenameHandled: vi.fn(),
    });

    expect(screen.queryByText('Remember to attach the quote.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand note' })).toBeTruthy();
  });

  it('shows a saved note preview when the note is already expanded', () => {
    render(TodoItem, {
      item: makeItem({ note: 'Remember to attach the quote.', noteCollapsed: false }),
      labels,
      properties: [],
      depth: 0,
      reorderEnabled: false,
      searchQuery: '',
      onContextMenu: vi.fn(),
      activeNoteEditorItemId: null,
      activeRenameItemId: null,
      onNoteEditorHandled: vi.fn(),
      onRenameHandled: vi.fn(),
    });

    expect(screen.getByText('Remember to attach the quote.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Collapse note' })).toBeTruthy();
  });

  it('toggles note visibility from the note chip', async () => {
    render(TodoItem, {
      item: makeItem({ note: 'Remember to attach the quote.' }),
      labels,
      properties: [],
      depth: 0,
      reorderEnabled: false,
      searchQuery: '',
      onContextMenu: vi.fn(),
      activeNoteEditorItemId: null,
      activeRenameItemId: null,
      onNoteEditorHandled: vi.fn(),
      onRenameHandled: vi.fn(),
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Expand note' }));

    expect(stateMocks.actionToggleItemNoteCollapsed).toHaveBeenCalledWith('item-1');
  });

  it('opens the inline note editor when requested and saves note changes', async () => {
    const onNoteEditorHandled = vi.fn();

    render(TodoItem, {
      item: makeItem(),
      labels,
      properties: [],
      depth: 0,
      reorderEnabled: false,
      searchQuery: '',
      onContextMenu: vi.fn(),
      activeNoteEditorItemId: 'item-1',
      activeRenameItemId: null,
      onNoteEditorHandled,
      onRenameHandled: vi.fn(),
    });

    const editor = await screen.findByPlaceholderText(/add a note/i);
    await fireEvent.input(editor, { target: { value: 'New note text' } });
    await fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true });

    expect(onNoteEditorHandled).toHaveBeenCalledWith('item-1');
    expect(stateMocks.actionUpdateItemNote).toHaveBeenCalledWith('item-1', 'New note text');
  });

  it('shows an inline add-sub-item icon on the row and adds to the parent without a separate affordance row', async () => {
    renderInteractiveTodoTree({
      id: 'parent',
      children: [makeItem({ id: 'child', text: 'Child task' })],
    });

    const childNode = screen.getByText('Child task').closest('.tree-node') as HTMLElement;
    await fireEvent.mouseEnter(childNode);

    const addSubItemButton = screen.getByRole('button', { name: /add sub-item/i });
    expect(childNode.querySelector('.child-affordance')).toBeNull();
    await fireEvent.click(addSubItemButton);

    expect(screen.getAllByRole('button', { name: /add sub-item/i }).length).toBe(1);
    const input = screen.getByPlaceholderText(/sub-item/i);
    await fireEvent.input(input, { target: { value: 'New sibling subitem' } });
    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(stateMocks.actionAddChild).toHaveBeenCalledWith('parent', 'New sibling subitem');
  });

  it('shows the inline add-sub-item icon even when the parent is folded', async () => {
    renderInteractiveTodoTree({
      id: 'parent',
      collapsed: true,
      children: [makeItem({ id: 'child', text: 'Hidden child task' })],
    });

    const parentNode = screen.getByText('Parent task').closest('.tree-node') as HTMLElement;
    await fireEvent.mouseEnter(parentNode);

    expect(screen.getByRole('button', { name: 'Add sub-item' })).toBeTruthy();
  });

  it('reports reordered sibling ids when a drag finalize event arrives', async () => {
    const treeProps = makeTreeProps();
    const { container } = render(TodoTree, {
      items: [
        makeItem({ id: 'first', text: 'First item' }),
        makeItem({ id: 'second', text: 'Second item' }),
      ],
      labels: [],
      properties: [],
      depth: 0,
      searchQuery: '',
      ...treeProps,
      canReorder: true,
    });

    const zone = container.querySelector('.todo-tree') as HTMLElement;

    zone.dispatchEvent(new CustomEvent('finalize', {
      bubbles: true,
      detail: {
        items: [
          makeItem({ id: 'second', text: 'Second item' }),
          makeItem({ id: 'first', text: 'First item' }),
        ],
        info: {},
      },
    }));

    expect(treeProps.onReorderItems).toHaveBeenCalledWith(null, ['second', 'first']);
  });
});

describe('ContextMenu actions', () => {
  it('includes a rename action', () => {
    stateMocks.getState.mockReturnValue({ items: [makeItem()] as TodoItemModel[] });

    render(ContextMenu, {
      x: 100,
      y: 100,
      itemId: 'item-1',
      properties: [],
      onClose: vi.fn(),
    });

    expect(screen.getByRole('menuitem', { name: /rename/i })).toBeTruthy();
  });

  it('shows an add note action when the item has no note', () => {
    stateMocks.getState.mockReturnValue({ items: [makeItem()] as TodoItemModel[] });

    render(ContextMenu, {
      x: 100,
      y: 100,
      itemId: 'item-1',
      properties: [],
      onClose: vi.fn(),
    });

    expect(screen.getByRole('menuitem', { name: /add note/i })).toBeTruthy();
  });

  it('shows an edit note action when the item already has a note', () => {
    stateMocks.getState.mockReturnValue({ items: [makeItem({ note: 'Existing note' })] as TodoItemModel[] });

    render(ContextMenu, {
      x: 100,
      y: 100,
      itemId: 'item-1',
      properties: [],
      onClose: vi.fn(),
    });

    expect(screen.getByRole('menuitem', { name: /edit note/i })).toBeTruthy();
  });
});