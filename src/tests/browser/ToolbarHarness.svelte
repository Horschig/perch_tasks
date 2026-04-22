<script lang="ts">
  import Toolbar from '../../components/Toolbar.svelte';

  let showSearchComposer = $state(false);
  let searchQuery = $state('');

  function handleToggleSearch() {
    showSearchComposer = true;
  }

  function handleCloseActiveMode() {
    showSearchComposer = false;
    searchQuery = '';
  }
</script>

<div class="toolbar-harness">
  <Toolbar
    showRootAddComposer={false}
    {showSearchComposer}
    {searchQuery}
    addDraft=""
    onToggleSearch={handleToggleSearch}
    onToggleAdd={() => {}}
    onToggleFold={() => {}}
    onSearchInput={(query) => {
      searchQuery = query;
    }}
    onAddDraftInput={() => {}}
    onSubmitAdd={() => {}}
    onCloseActiveMode={handleCloseActiveMode}
    onOpenSettings={() => {}}
  />
</div>

<style>
  :global(body) {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(104, 150, 255, 0.28), transparent 35%),
      linear-gradient(180deg, #10203a 0%, #08121e 100%);
  }

  .toolbar-harness {
    min-height: 100vh;
  }
</style>