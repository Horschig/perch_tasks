# Changelog

## 0.2.6 - 2026-04-24

PR: #6 - enh - add settings about metadata and document PR workflow

## Summary
- add a small About section in Settings that shows the current app version
- add a clickable GitHub repository link in Settings
- document the default feature-branch and pull-request workflow in Copilot instructions
- keep the search regression coverage on the feature branch instead of pushing directly to main

## Testing
- npx vitest run src/tests/settings.test.ts
- npm run ci:validate

## 0.2.5 - 2026-04-22

PR: #5 - enh: add startup controls and fix regressions

## Summary
- restore the search composer width and add a Playwright browser regression for it
- add startup preferences for launch-at-login and folded vs unfolded startup, with strict persistence parsing
- enforce single-instance behavior and reveal the existing window on second launch
- fix the nested drag-handle regression where expanding a child list disabled sibling reordering

## Validation
- npm test
- npm run test:browser -- browser-tests/toolbar-width.spec.ts
- npm run check
- npm run build
- npm run app:build

## 0.2.4 - 2026-04-22

PR: #4 - fix: restore regressions and add startup controls

This update restores the expanding search bar, fixes drag reordering after unfolding items, keeps Perch Tasks to a single running instance, and adds Settings controls for launch at login plus fixed folded or unfolded startup behavior.

- Search in the toolbar expands again instead of staying cramped.
- Drag handles stay available after child lists are unfolded.
- Perch Tasks focuses the existing window instead of opening a second instance.
- Settings now include launch-at-login and folded or unfolded startup behavior.
- Added regression coverage for the toolbar search layout and drag-handle state so these UI issues are caught earlier.

## 0.2.3 - 2026-04-17

PR: #3 - Fix automatic release dispatch after metadata bump

## Summary
- stop relying on a push-triggered publish workflow for the version bump commit
- dispatch the publish workflow explicitly from the metadata workflow after the bump commit is pushed
- pass the exact release commit SHA into the publish workflow so builds, tagging, and notes come from the correct revision

## Root Cause
The version bump commit is pushed by the `Release Metadata After Merge` workflow using `GITHUB_TOKEN`. GitHub does not trigger a second workflow run from that push, so `Publish Release Assets` never starts for the bump commit.

## Fix
- switch `Publish Release Assets` to `workflow_dispatch`
- trigger it from `Release Metadata After Merge` with the exact bump commit SHA
- build, tag, and publish from that SHA instead of the ambient workflow event SHA

## 0.2.2 - 2026-04-17

PR: #2 - Fix release workflow sequencing after merge

This fixes release workflow sequencing after merge. Previously, publish-release-assets could race the merged PR push instead of waiting for the auto-generated version bump commit. This change gates publishing on the bump commit and hardens changelog note extraction.

## 0.2.1 - 2026-04-17

PR: #1 - Enhance Linux build and automate release publishing

## Summary
- add a cross-platform Tauri launcher for the npm desktop scripts
- add Linux desktop bundle validation to PR checks, including the `xdg-utils` dependency needed for AppImage packaging
- add a GitHub Releases workflow that builds Windows and Linux assets from the post-merge version bump commit
- update the README and repo instructions to reflect the cross-platform build and release flow

## What To Test On GitHub
- PR validation should run frontend checks plus Windows and Linux desktop bundle builds
- after merge, the version bump and changelog workflow should still run on `main`
- the new release workflow should then tag that bumped commit and publish Windows and Linux assets to GitHub Releases

## Local Verification
- `npm run app:build` succeeded on Windows and produced MSI plus NSIS bundles
- `npm run app:build -- --bundles appimage,deb` succeeded in WSL Ubuntu from a Linux-side checkout after installing `xdg-utils`
- a fresh local rerun of `npm run ci:validate` was blocked by a locked `node_modules/@esbuild/win32-x64/esbuild.exe` in this working copy, so I left that for CI to verify cleanly on GitHub

Entries are prepended automatically from merged pull request descriptions.
