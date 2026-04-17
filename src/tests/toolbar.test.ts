import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Toolbar from '../components/Toolbar.svelte';

interface ToolbarProps {
  bottomOffset?: string;
  showRootAddComposer: boolean;
  showSearchComposer: boolean;
  searchQuery: string;
  addDraft: string;
  onToggleSearch: () => void;
  onToggleAdd: () => void;
  onToggleFold: () => void;
  onSearchInput: (query: string) => void;
  onAddDraftInput: (draft: string) => void;
  onSubmitAdd: () => void;
  onCloseActiveMode: () => void;
  onOpenSettings: () => void;
}

function renderToolbar(overrides: Partial<ToolbarProps> = {}) {
  const props = {
    bottomOffset: '12px',
    showRootAddComposer: true,
    showSearchComposer: false,
    searchQuery: '',
    addDraft: '',
    onToggleSearch: vi.fn(),
    onToggleAdd: vi.fn(),
    onToggleFold: vi.fn(),
    onSearchInput: vi.fn(),
    onAddDraftInput: vi.fn(),
    onSubmitAdd: vi.fn(),
    onCloseActiveMode: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  };

  return {
    ...render(Toolbar, props),
    props,
  };
}

describe('Toolbar', () => {
  it('renders the root add composer open by default alongside search, settings, and fold', () => {
    const { container } = renderToolbar();

    const leftLabels = Array.from(container.querySelectorAll('.toolbar-left button')).map((button) => button.getAttribute('aria-label'));
    const rightLabels = Array.from(container.querySelectorAll('.toolbar-right button')).map((button) => button.getAttribute('aria-label'));

    expect(leftLabels).toEqual(['Add todo', 'Close add composer']);
    expect(screen.getByLabelText('Add todo text')).toBeTruthy();
    expect(rightLabels).toEqual(['Search', 'Settings', 'Fold to screen edge']);
  });

  it('renders search mode on the right while keeping the pen button visible on the left', async () => {
    const { container, props } = renderToolbar({ showRootAddComposer: false, showSearchComposer: true });

    const leftLabels = Array.from(container.querySelectorAll('.toolbar-left button')).map((button) => button.getAttribute('aria-label'));
    expect(leftLabels).toEqual(['Add todo']);
    expect(screen.queryByLabelText('Add todo text')).toBeNull();
    expect(screen.getByLabelText('Search todos')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Fold to screen edge' })).toBeTruthy();

    const input = screen.getByLabelText('Search todos');
    await fireEvent.keyDown(input, { key: 'Escape' });

    expect(props.onCloseActiveMode).toHaveBeenCalledTimes(1);
  });

  it('closes add mode instead of submitting when the visible pen icon is clicked', async () => {
    const { props } = renderToolbar({ showRootAddComposer: true, addDraft: '' });

    await fireEvent.click(screen.getByRole('button', { name: 'Add todo' }));

    expect(props.onCloseActiveMode).toHaveBeenCalledTimes(1);
    expect(props.onSubmitAdd).not.toHaveBeenCalled();
  });

  it('keeps the add composer open when focus leaves it', async () => {
    renderToolbar({ showRootAddComposer: true });

    const addInput = screen.getByLabelText('Add todo text');
    const searchButton = screen.getByRole('button', { name: 'Search' });
    searchButton.focus();
    await fireEvent.focusOut(addInput, { relatedTarget: searchButton });

    expect(screen.getByLabelText('Add todo text')).toBeTruthy();
  });

  it('closes search mode on escape', async () => {
    const { props } = renderToolbar({ showRootAddComposer: false, showSearchComposer: true });

    await fireEvent.keyDown(screen.getByLabelText('Search todos'), { key: 'Escape' });

    expect(props.onCloseActiveMode).toHaveBeenCalledTimes(1);
  });
});