const PRODUCTION_PROTOCOL = 'authapp:';
const PRODUCTION_HOST = 'app';

export function isTrustedRendererUrl(rawUrl: string, developmentUrl?: string): boolean {
  try {
    const candidate = new URL(rawUrl);

    if (developmentUrl) {
      const developmentOrigin = new URL(developmentUrl).origin;
      return candidate.origin === developmentOrigin;
    }

    return candidate.protocol === PRODUCTION_PROTOCOL && candidate.host === PRODUCTION_HOST;
  } catch {
    return false;
  }
}
