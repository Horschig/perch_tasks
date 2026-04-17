import { describe, expect, it } from 'vitest';

import {
  buildChangelogEntry,
  incrementPatchVersion,
  prependChangelogEntry,
  updateCargoPackageVersion,
} from './release-automation.mjs';

describe('incrementPatchVersion', () => {
  it('increments the patch segment', () => {
    expect(incrementPatchVersion('0.2.0')).toBe('0.2.1');
  });

  it('rejects non-semantic versions', () => {
    expect(() => incrementPatchVersion('0.2')).toThrow('Expected a semantic version');
  });
});

describe('updateCargoPackageVersion', () => {
  it('updates only the package version', () => {
    const manifest = [
      '[package]',
      'name = "perch-tasks"',
      'version = "0.2.0"',
      '',
      '[dependencies]',
      'tauri = "2"',
      '',
    ].join('\n');

    expect(updateCargoPackageVersion(manifest, '0.2.1')).toContain('version = "0.2.1"');
    expect(updateCargoPackageVersion(manifest, '0.2.1')).toContain('[dependencies]');
  });
});

describe('buildChangelogEntry', () => {
  it('formats a changelog section from PR metadata', () => {
    expect(
      buildChangelogEntry({
        nextVersion: '0.2.1',
        prNumber: '42',
        prTitle: 'Add CI automation',
        prBody: 'Ship the new workflows.',
        mergedAt: '2026-04-17T08:00:00.000Z',
      }),
    ).toBe([
      '## 0.2.1 - 2026-04-17',
      '',
      'PR: #42 - Add CI automation',
      '',
      'Ship the new workflows.',
    ].join('\n'));
  });

  it('falls back when the PR body is empty', () => {
    expect(
      buildChangelogEntry({
        nextVersion: '0.2.1',
        prNumber: '',
        prTitle: '',
        prBody: '   ',
        mergedAt: '2026-04-17T08:00:00.000Z',
      }),
    ).toContain('No PR description provided.');
  });
});

describe('prependChangelogEntry', () => {
  it('prepends under the changelog header', () => {
    const result = prependChangelogEntry('# Changelog\n\n## 0.2.0 - 2026-04-16\n\nInitial release.\n', '## 0.2.1 - 2026-04-17\n\nNew entry.');

    expect(result).toBe([
      '# Changelog',
      '',
      '## 0.2.1 - 2026-04-17',
      '',
      'New entry.',
      '',
      '## 0.2.0 - 2026-04-16',
      '',
      'Initial release.',
      '',
    ].join('\n'));
  });

  it('creates the header when the file is empty', () => {
    expect(prependChangelogEntry('', '## 0.2.1 - 2026-04-17\n\nNew entry.')).toBe('# Changelog\n\n## 0.2.1 - 2026-04-17\n\nNew entry.\n');
  });
});