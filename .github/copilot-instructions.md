# Purpose

- Give coding agents a repo-specific guide for Perch Tasks.
- Keep CI, release automation, and Tauri/Svelte workflows aligned with the current project shape.

# Repository Summary

- Perch Tasks is a desktop todo app built with Svelte 5, TypeScript, Vite, Tauri 2, and Rust.
- The UI lives in src/ and the native shell lives in src-tauri/.
- Pull requests are validated in GitHub Actions and merged PRs into main automatically bump the patch version and prepend the PR description to CHANGELOG.md.

# Key Files

- package.json: frontend scripts, version source, and local validation entry points.
- package-lock.json: npm lockfile that must stay in sync with package.json version updates.
- src/App.svelte: top-level application shell.
- src/components/: UI components such as todo tree, input, toolbar, settings, and title bar.
- src/lib/: state, persistence, search, labels, foldout behavior, theming, and utilities.
- src/tests/: Vitest suites for frontend logic and UI behavior.
- src-tauri/Cargo.toml: Rust package metadata and native dependency declarations.
- src-tauri/tauri.conf.json: Tauri app metadata, bundle configuration, and version source.
- src-tauri/src/: Rust entry points and native integration code.
- scripts/tauri-cli.mjs: cross-platform Tauri development and build launcher used by npm scripts.
- scripts/tauri-dev.ps1: legacy Windows PowerShell launcher kept for local fallback.
- scripts/tauri-build.ps1: legacy Windows PowerShell build launcher kept for local fallback.
- scripts/bump-version-from-pr.mjs: post-merge automation that increments the patch version and writes the changelog entry.
- .github/workflows/pr-validation.yml: PR validation workflow, including Windows and Linux desktop bundle builds.
- .github/workflows/release-after-merge.yml: merged-PR release metadata workflow.
- .github/workflows/publish-release-assets.yml: tag-and-publish workflow for Windows and Linux release assets.
- CHANGELOG.md: prepend-only changelog fed from PR descriptions.
- README.md: developer setup, local commands, and workflow summary.

# Environment and Commands

- Install dependencies from the repo root with npm ci.
- Run frontend tests with npm run test.
- Run type and Svelte checks with npm run check.
- Run the frontend production build with npm run build.
- Run the combined frontend validation sequence with npm run ci:validate.
- Run the desktop app in development with npm run app:dev.
- Build the desktop app bundle with npm run app:build.
- Start the last local release build with npm run app:start.
- Dry-run the post-merge automation locally with node ./scripts/bump-version-from-pr.mjs --dry-run.

# Release Automation Rules

- Keep the version synchronized across package.json, package-lock.json, src-tauri/Cargo.toml, and src-tauri/tauri.conf.json.
- Merged PRs into main trigger an automatic patch bump only. Do not manually edit versions for routine changes.
- CHANGELOG.md entries are copied from the PR description. Keep PR descriptions release-note ready and user-facing.
- The version-bump commit on `main` also triggers publishing of Windows and Linux assets to GitHub Releases.
- The merged-PR workflow runs with write permissions on the base branch only. Do not change it to check out or execute untrusted PR head code.

# Engineering Expectations

- For every change, create or switch to a dedicated feature branch before editing; do not work directly on `main`.
- Open a pull request for every change set once the scoped work is ready; do not treat direct branch edits as complete delivery.
- Prefer focused edits that preserve the current Tauri/Svelte architecture.
- Keep business logic in small modules under src/lib/ instead of bloating App.svelte.
- Update tests when behavior changes.
- Match existing formatting in touched files; no repo-wide reformatting.
- Commit message prefixes should remain fix, enh, doc, or cos when you are asked to prepare commits.

# Security Notes

- Never commit secrets, tokens, or machine-specific credentials.
- Keep privileged GitHub Actions jobs minimal and avoid dependency installation in write-enabled workflows unless it is strictly required.
- Do not loosen artifact or build paths without checking what will be uploaded from CI.