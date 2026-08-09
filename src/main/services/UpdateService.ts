import { app } from 'electron';
import type { UpdateInfo } from '@shared/schemas/update';

export class UpdateService {
  constructor(
    private readonly repoOwner: string = 'ardakrt',
    private readonly repoName: string = 'authapp',
  ) {}

  async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = app.getVersion();
    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'authapp-desktop-app',
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (response.status === 404) {
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          error: 'Henüz GitHub üzerinde yayınlanmış bir sürüm bulunamadı.',
        };
      }

      if (!response.ok) {
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          error: `GitHub API yanıt vermedi (${response.status})`,
        };
      }

      const data = (await response.json()) as {
        tag_name?: string;
        name?: string;
        html_url?: string;
        body?: string;
        published_at?: string;
      };

      const rawLatest = data.tag_name || data.name || '';
      const latestVersion = rawLatest.replace(/^v/, '').trim();

      if (!latestVersion) {
        return {
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          error: 'Sürüm bilgisi okunamadı.',
        };
      }

      const hasUpdate = this.isNewerVersion(latestVersion, currentVersion);

      return {
        hasUpdate,
        currentVersion,
        latestVersion,
        releaseUrl:
          data.html_url || `https://github.com/${this.repoOwner}/${this.repoName}/releases`,
        releaseNotes: data.body || undefined,
        publishedAt: data.published_at || undefined,
      };
    } catch (err) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        error: err instanceof Error ? err.message : 'Güncelleme sunucusuna bağlanılamadı.',
      };
    }
  }

  isNewerVersion(latest: string, current: string): boolean {
    const parse = (v: string) => v.split('.').map((p) => parseInt(p, 10) || 0);
    const latestParts = parse(latest);
    const currentParts = parse(current);
    const maxLen = Math.max(latestParts.length, currentParts.length);

    for (let i = 0; i < maxLen; i++) {
      const l = latestParts[i] ?? 0;
      const c = currentParts[i] ?? 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  }
}
