import { mount } from 'svelte';
import '../app.css';
import Toolbar from '../components/Toolbar.svelte';

mount(Toolbar, {
  target: document.getElementById('app')!,
  props: {
    bottomOffset: '12px',
    showRootAddComposer: false,
    showSearchComposer: true,
    searchQuery: 'write tests',
    addDraft: '',
    onToggleSearch: () => undefined,
    onToggleAdd: () => undefined,
    onToggleFold: () => undefined,
    onSearchInput: () => undefined,
    onAddDraftInput: () => undefined,
    onSubmitAdd: () => undefined,
    onCloseActiveMode: () => undefined,
    onOpenSettings: () => undefined,
  },
});