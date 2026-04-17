# Changelog

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
