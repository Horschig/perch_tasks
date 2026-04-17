import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildChangelogEntry,
  incrementPatchVersion,
  prependChangelogEntry,
  updateCargoPackageVersion,
} from './release-automation.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const packageJsonPath = path.join(workspaceRoot, 'package.json');
const packageLockPath = path.join(workspaceRoot, 'package-lock.json');
const cargoManifestPath = path.join(workspaceRoot, 'src-tauri', 'Cargo.toml');
const tauriConfigPath = path.join(workspaceRoot, 'src-tauri', 'tauri.conf.json');
const changelogPath = path.join(workspaceRoot, 'CHANGELOG.md');

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      parsed[key] = 'true';
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readOptionalText(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return '';
    }

    throw error;
  }
}

const args = parseArgs(process.argv.slice(2));
const dryRun = args['dry-run'] === 'true' || process.env.DRY_RUN === '1';
const prNumber = args['pr-number'] ?? process.env.PR_NUMBER ?? '';
const prTitle = args['pr-title'] ?? process.env.PR_TITLE ?? '';
const prBody = args['pr-body'] ?? process.env.PR_BODY ?? '';
const mergedAt = args['merged-at'] ?? process.env.MERGED_AT ?? new Date().toISOString();

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const packageLock = JSON.parse(await readFile(packageLockPath, 'utf8'));
const cargoManifest = await readFile(cargoManifestPath, 'utf8');
const tauriConfig = JSON.parse(await readFile(tauriConfigPath, 'utf8'));
const existingChangelog = await readOptionalText(changelogPath);

const currentVersion = packageJson.version;
const nextVersion = incrementPatchVersion(currentVersion);

packageJson.version = nextVersion;
packageLock.version = nextVersion;

if (packageLock.packages?.['']) {
  packageLock.packages[''].version = nextVersion;
}

tauriConfig.version = nextVersion;

const nextCargoManifest = updateCargoPackageVersion(cargoManifest, nextVersion);
const changelogEntry = buildChangelogEntry({
  nextVersion,
  prNumber,
  prTitle,
  prBody,
  mergedAt,
});
const nextChangelog = prependChangelogEntry(existingChangelog, changelogEntry);

if (dryRun) {
  console.log(`Dry run: ${currentVersion} -> ${nextVersion}`);
  console.log(changelogEntry);
  process.exit(0);
}

await Promise.all([
  writeFile(packageJsonPath, serializeJson(packageJson), 'utf8'),
  writeFile(packageLockPath, serializeJson(packageLock), 'utf8'),
  writeFile(cargoManifestPath, nextCargoManifest, 'utf8'),
  writeFile(tauriConfigPath, serializeJson(tauriConfig), 'utf8'),
  writeFile(changelogPath, nextChangelog, 'utf8'),
]);

console.log(`Updated release metadata: ${currentVersion} -> ${nextVersion}`);