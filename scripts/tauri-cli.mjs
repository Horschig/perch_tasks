import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const [subcommand, ...tauriArgs] = args;

if (!subcommand) {
  console.error('Usage: node ./scripts/tauri-cli.mjs <tauri-command> [args...]');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const cargoBin = path.join(homedir(), '.cargo', 'bin');
const pathEntries = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
const nextPath = pathEntries.includes(cargoBin)
  ? (process.env.PATH ?? '')
  : [cargoBin, ...pathEntries].join(path.delimiter);

const child = spawn(
  'npx',
  ['tauri', subcommand, ...tauriArgs],
  {
    cwd: workspaceRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PATH: nextPath,
    },
  },
);

child.on('error', (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`tauri process exited due to signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});