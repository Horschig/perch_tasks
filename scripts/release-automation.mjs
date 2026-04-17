const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function incrementPatchVersion(version) {
  const match = SEMVER_PATTERN.exec(version);

  if (!match) {
    throw new Error(`Expected a semantic version, received "${version}".`);
  }

  const major = Number.parseInt(match[1], 10);
  const minor = Number.parseInt(match[2], 10);
  const patch = Number.parseInt(match[3], 10) + 1;

  return `${major}.${minor}.${patch}`;
}

export function updateCargoPackageVersion(manifestContent, nextVersion) {
  const lineEnding = manifestContent.includes('\r\n') ? '\r\n' : '\n';
  const hasTrailingNewline = manifestContent.endsWith(lineEnding);
  const lines = manifestContent.split(/\r?\n/);

  let inPackageSection = false;
  let updated = false;

  const nextLines = lines.map((line) => {
    if (/^\[package\]\s*$/.test(line)) {
      inPackageSection = true;
      return line;
    }

    if (inPackageSection && /^\[.*\]\s*$/.test(line)) {
      inPackageSection = false;
    }

    if (inPackageSection && !updated && /^version\s*=\s*".*"\s*$/.test(line)) {
      updated = true;
      return `version = "${nextVersion}"`;
    }

    return line;
  });

  if (!updated) {
    throw new Error('Could not find the [package] version in src-tauri/Cargo.toml.');
  }

  const content = nextLines.join(lineEnding);
  return hasTrailingNewline ? `${content}${lineEnding}` : content;
}

export function normalizePrDescription(prBody) {
  const trimmed = prBody?.trim();
  return trimmed ? trimmed : 'No PR description provided.';
}

export function formatChangelogDate(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid merged-at timestamp: "${value}".`);
  }

  return date.toISOString().slice(0, 10);
}

export function buildChangelogEntry({ nextVersion, prNumber, prTitle, prBody, mergedAt }) {
  const issueLabel = prNumber ? `#${prNumber}` : 'manual';
  const title = prTitle?.trim() || 'Untitled PR';
  const body = normalizePrDescription(prBody);
  const dateLabel = formatChangelogDate(mergedAt);

  return [
    `## ${nextVersion} - ${dateLabel}`,
    '',
    `PR: ${issueLabel} - ${title}`,
    '',
    body,
  ].join('\n');
}

export function prependChangelogEntry(existingContent, entry) {
  const header = '# Changelog';
  const trimmedEntry = entry.trim();

  if (!existingContent?.trim()) {
    return `${header}\n\n${trimmedEntry}\n`;
  }

  const trimmedExisting = existingContent.trimStart();

  if (trimmedExisting.startsWith(header)) {
    const remainder = trimmedExisting.slice(header.length).trimStart();
    return remainder
      ? `${header}\n\n${trimmedEntry}\n\n${remainder.trimEnd()}\n`
      : `${header}\n\n${trimmedEntry}\n`;
  }

  return `${header}\n\n${trimmedEntry}\n\n${trimmedExisting.trimEnd()}\n`;
}