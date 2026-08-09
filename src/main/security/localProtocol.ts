import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { protocol } from 'electron';
import { buildContentSecurityPolicy } from './contentSecurityPolicy';
import { resolveRendererAsset } from './rendererAssetPath';

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function registerLocalProtocol(rendererRoot: string): void {
  protocol.handle('authapp', async (request) => {
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const assetPath = resolveRendererAsset(rendererRoot, request.url);
    if (!assetPath) return new Response('Not found', { status: 404 });

    try {
      const content = await readFile(assetPath);
      const extension = extname(assetPath).toLowerCase();
      const headers = new Headers({
        'Content-Type': MIME_TYPES[extension] ?? 'application/octet-stream',
        'Content-Security-Policy': buildContentSecurityPolicy(false),
        'X-Content-Type-Options': 'nosniff',
      });

      return new Response(Uint8Array.from(content), { status: 200, headers });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}
