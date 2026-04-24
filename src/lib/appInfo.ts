import packageInfo from '../../package.json';

type PackageRepository = string | { url?: string } | undefined;

function normalizeRepositoryUrl(url: string): string {
  return url.replace(/^git\+/, '').replace(/\.git$/, '');
}

function resolveRepositoryUrl(repository: PackageRepository, homepage?: string): string {
  if (homepage) {
    return homepage;
  }

  if (typeof repository === 'string') {
    return normalizeRepositoryUrl(repository);
  }

  if (repository?.url) {
    return normalizeRepositoryUrl(repository.url);
  }

  throw new Error('Package repository URL is not configured.');
}

export const APP_VERSION = packageInfo.version;
export const GITHUB_REPOSITORY_URL = resolveRepositoryUrl(
  packageInfo.repository as PackageRepository,
  packageInfo.homepage,
);