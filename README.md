<div align="center">
  <h1>Perch Tasks</h1>
  <p><strong>A compact desktop todo app with a transparent glass-like window, nested tasks, and a foldout tab that snaps to the screen edge.</strong></p>
  <p>
    <img alt="Desktop app" src="https://img.shields.io/badge/app-desktop-444?style=flat-square">
    <img alt="Local storage" src="https://img.shields.io/badge/storage-local%20only-2E8B57?style=flat-square">
    <img alt="Glass UI" src="https://img.shields.io/badge/look-glass%20transparency-5A7FFF?style=flat-square">
    <img alt="Foldout edge tab" src="https://img.shields.io/badge/window-folds%20to%20edge-8B5CF6?style=flat-square">
  </p>
</div>

Perch Tasks is a small transparent desktop todo app for people who want their list nearby without giving half the screen to it. The window has a glass-style translucent surface, can stay pinned above your work, and can collapse into a slim tab that snaps to the side of the screen for quick fold and unfold.

## Highlights

- Glass-style transparent window instead of a solid opaque panel.
- Fold-to-edge mode that snaps to the side of the screen so the app can disappear and come back quickly.
- Nested tasks and subtasks for turning one item into a small working tree.
- Inline notes, labels, and custom properties for keeping things organized without much overhead.
- Fast search with highlighted matches.
- Drag-and-drop ordering for manual rearranging.
- Tray behavior and always-on-top pinning so it stays available without taking over.
- Local-only storage on your own machine.

## First few minutes

1. Launch Perch Tasks.
2. Click the pen button to add your first task.
3. Press `Enter` to save it right away.
4. Add sub-tasks if the task needs a few steps underneath it.
5. Press `Ctrl+F` or open search to jump to anything quickly.
6. Pin the window if you want it hovering above your other apps.
7. Fold it to the edge of the screen when you want it close but out of the way.

## A few things to know

- Closing the window hides the app to the system tray instead of quitting it.
- Double-clicking the tray icon shows or hides the app.
- The tray menu lets you exit fully.
- Search temporarily opens matching branches so buried tasks are easier to spot.
- Your todos stay local. No account, cloud sync, or server setup is required.

## Downloads

Windows and Linux builds are published in [GitHub Releases](https://github.com/Horschig/perch_tasks/releases).

## Running from source

If you are opening the repository itself, you can run or build the app with Node.js and Rust installed.

<details>
  <summary>Show source-run steps</summary>

  <br>

  1. Install Node.js 22 or newer.
  2. Install Rust.
  3. Install dependencies:

  ```text
  npm ci
  ```

  For the browser regression tests, install Chromium once:

  ```text
  npx playwright install chromium
  ```

  4. Start the desktop app in development mode:

  ```text
  npm run app:dev
  ```

  5. Create a local build:

  ```text
  npm run app:build
  ```
</details>

## Release notes

See [CHANGELOG.md](./CHANGELOG.md) for recent changes.