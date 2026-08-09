import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveRendererAsset } from '../../src/main/security/rendererAssetPath';

describe('renderer asset path containment', () => {
  const root = resolve('out/renderer');

  it('resolves root and nested application assets', () => {
    expect(resolveRendererAsset(root, 'authapp://app/')).toBe(resolve(root, 'index.html'));
    expect(resolveRendererAsset(root, 'authapp://app/assets/index.js')).toBe(
      resolve(root, 'assets/index.js'),
    );
  });

  it('rejects other schemes, hosts, malformed encodings, and null bytes', () => {
    expect(resolveRendererAsset(root, 'https://app/index.html')).toBeNull();
    expect(resolveRendererAsset(root, 'authapp://other/index.html')).toBeNull();
    expect(resolveRendererAsset(root, 'authapp://app/%E0%A4%A')).toBeNull();
    expect(resolveRendererAsset(root, 'authapp://app/%00secret')).toBeNull();
  });
});
