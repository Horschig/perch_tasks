# Perch Tasks

Perch Tasks is a small desktop todo app built with Svelte, TypeScript, Vite, Tauri, and Rust.

## Local Development

Install dependencies from the repository root:

```powershell
npm ci
```

Run the frontend checks locally:

```powershell
npm run test
npm run check
npm run build
```

Run the combined frontend validation sequence:

```powershell
npm run ci:validate
```

Run the desktop app in development:

```powershell
npm run app:dev
```

Build the desktop bundle:

```powershell
npm run app:build
```

## GitHub Actions

- Every pull request runs frontend tests, Svelte checks, a frontend production build, and a Windows Tauri bundle build.
- The Windows workflow uploads the generated bundle as a GitHub Actions artifact for inspection.
- Every PR merged into main triggers a patch version bump and prepends the PR description to CHANGELOG.md.

## Changelog and Versioning

- The patch version is kept in sync across package.json, package-lock.json, src-tauri/Cargo.toml, and src-tauri/tauri.conf.json.
- CHANGELOG.md entries are generated directly from the merged PR description.
- Keep PR descriptions ready to be copied into release notes without further editing.

## Useful Script

Dry-run the release metadata automation locally:

```powershell
node .\scripts\bump-version-from-pr.mjs --dry-run
```