import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy } from '../../src/main/security/contentSecurityPolicy';
import { isTrustedRendererUrl } from '../../src/main/security/trustedRenderer';

describe('Electron renderer security policy', () => {
  it('keeps the production CSP offline and script-restricted', () => {
    const policy = buildContentSecurityPolicy(false);

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("connect-src 'none'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain('http:');
  });

  it('allows only the local app origin in production', () => {
    expect(isTrustedRendererUrl('authapp://app/index.html')).toBe(true);
    expect(isTrustedRendererUrl('authapp://attacker/index.html')).toBe(false);
    expect(isTrustedRendererUrl('https://example.com')).toBe(false);
    expect(isTrustedRendererUrl('not a url')).toBe(false);
  });

  it('permits the Vite React preamble only in development', () => {
    expect(buildContentSecurityPolicy(true)).toContain("script-src 'self' 'unsafe-inline'");
    expect(buildContentSecurityPolicy(false)).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('limits development trust to the configured origin', () => {
    const developmentUrl = 'http://localhost:5173';

    expect(isTrustedRendererUrl('http://localhost:5173/#/settings', developmentUrl)).toBe(true);
    expect(isTrustedRendererUrl('http://localhost:4173', developmentUrl)).toBe(false);
    expect(isTrustedRendererUrl('https://localhost:5173', developmentUrl)).toBe(false);
  });
});
