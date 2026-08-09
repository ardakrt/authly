import { isAbsolute, relative, resolve } from 'node:path';

export function resolveRendererAsset(rendererRoot: string, requestUrl: string): string | null {
  try {
    const url = new URL(requestUrl);
    if (url.protocol !== 'authapp:' || url.host !== 'app') return null;

    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath.includes('\0')) return null;

    const segments = decodedPath.split(/[\\/]+/).filter(Boolean);
    if (segments.some((segment) => segment === '.' || segment === '..')) return null;

    const root = resolve(rendererRoot);
    const candidate = resolve(root, ...(segments.length > 0 ? segments : ['index.html']));
    const relativePath = relative(root, candidate);

    if (relativePath.startsWith('..') || isAbsolute(relativePath)) return null;
    return candidate;
  } catch {
    return null;
  }
}
