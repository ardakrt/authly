import { app } from 'electron';
import electronUpdater, {
  type AppUpdater,
  type ProgressInfo,
  type UpdateInfo as ElectronUpdateInfo,
} from 'electron-updater';
import { updateStateSchema, type UpdateInfo, type UpdateState } from '@shared/schemas/update';

const INSTALL_DELAY_MS = 750;

function getAutoUpdater(): AppUpdater {
  const { autoUpdater } = electronUpdater;
  return autoUpdater;
}

function normalizeReleaseNotes(info: ElectronUpdateInfo): string | undefined {
  if (typeof info.releaseNotes === 'string') return info.releaseNotes;
  if (Array.isArray(info.releaseNotes)) {
    return info.releaseNotes.map((item) => item.note).join('\n\n') || undefined;
  }
  return undefined;
}

export interface UpdateServiceOptions {
  updater?: AppUpdater;
  isPackaged?: boolean;
  currentVersion?: string;
  beforeInstall?: () => void;
  installDelayMs?: number;
}

export class UpdateService {
  private readonly updater: AppUpdater;
  private readonly isPackaged: boolean;
  private readonly currentVersion: string;
  private readonly beforeInstall: () => void;
  private readonly installDelayMs: number;
  private readonly listeners = new Set<(state: UpdateState) => void>();
  private state: UpdateState;
  private installRequested = false;
  private installScheduled = false;

  constructor(options: UpdateServiceOptions = {}) {
    this.updater = options.updater ?? getAutoUpdater();
    this.isPackaged = options.isPackaged ?? app.isPackaged;
    this.currentVersion = options.currentVersion ?? app.getVersion();
    this.beforeInstall = options.beforeInstall ?? (() => {});
    this.installDelayMs = options.installDelayMs ?? INSTALL_DELAY_MS;
    this.state = updateStateSchema.parse({
      phase: 'idle',
      currentVersion: this.currentVersion,
    });

    this.updater.autoDownload = false;
    this.updater.autoInstallOnAppQuit = true;
    this.updater.autoRunAppAfterInstall = true;
    this.registerUpdaterEvents();
  }

  getState(): UpdateState {
    return { ...this.state };
  }

  onStateChange(listener: (state: UpdateState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async checkForUpdates(): Promise<UpdateInfo> {
    if (!this.isPackaged) {
      const error = 'Güncelleme denetimi yalnızca kurulu uygulamada kullanılabilir.';
      this.setState({ phase: 'error', currentVersion: this.currentVersion, error });
      return {
        hasUpdate: false,
        currentVersion: this.currentVersion,
        latestVersion: this.currentVersion,
        error,
      };
    }

    try {
      this.setState({ phase: 'checking', currentVersion: this.currentVersion });
      const result = await this.updater.checkForUpdates();
      const info = result?.updateInfo;
      const latestVersion = info?.version ?? this.currentVersion;
      const hasUpdate = this.isNewerVersion(latestVersion, this.currentVersion);

      this.setState({
        phase: hasUpdate ? 'available' : 'idle',
        currentVersion: this.currentVersion,
        latestVersion,
      });

      return {
        hasUpdate,
        currentVersion: this.currentVersion,
        latestVersion,
        releaseUrl: hasUpdate
          ? `https://github.com/ardakrt/authly/releases/tag/v${latestVersion}`
          : undefined,
        releaseNotes: info ? normalizeReleaseNotes(info) : undefined,
        publishedAt: info?.releaseDate,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Güncelleme sunucusuna bağlanılamadı.';
      this.setState({
        phase: 'error',
        currentVersion: this.currentVersion,
        error: message,
      });
      return {
        hasUpdate: false,
        currentVersion: this.currentVersion,
        latestVersion: this.currentVersion,
        error: message,
      };
    }
  }

  async downloadAndInstall(): Promise<void> {
    if (!this.isPackaged) throw new Error('Güncelleme yalnızca kurulu uygulamada yüklenebilir.');
    if (this.state.phase === 'downloading') return;

    this.installRequested = true;
    if (this.state.phase === 'downloaded') {
      this.scheduleInstall();
      return;
    }

    if (this.state.phase !== 'available') {
      const updateInfo = await this.checkForUpdates();
      if (!updateInfo.hasUpdate) {
        throw new Error(updateInfo.error ?? 'Yüklenecek yeni sürüm bulunamadı.');
      }
    }

    try {
      this.setState({
        phase: 'downloading',
        currentVersion: this.currentVersion,
        latestVersion: this.state.latestVersion,
        progress: 0,
      });
      await this.updater.downloadUpdate();
      this.setState({
        phase: 'downloaded',
        currentVersion: this.currentVersion,
        latestVersion: this.state.latestVersion,
        progress: 100,
      });
      this.scheduleInstall();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Güncelleme indirilemedi.';
      this.setState({
        phase: 'error',
        currentVersion: this.currentVersion,
        latestVersion: this.state.latestVersion,
        error: message,
      });
      throw error;
    }
  }

  isNewerVersion(latest: string, current: string): boolean {
    const parse = (version: string) => version.split('.').map((part) => parseInt(part, 10) || 0);
    const latestParts = parse(latest);
    const currentParts = parse(current);
    const maxLength = Math.max(latestParts.length, currentParts.length);

    for (let index = 0; index < maxLength; index++) {
      const latestPart = latestParts[index] ?? 0;
      const currentPart = currentParts[index] ?? 0;
      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    return false;
  }

  private registerUpdaterEvents(): void {
    this.updater.on('checking-for-update', () => {
      this.setState({ phase: 'checking', currentVersion: this.currentVersion });
    });
    this.updater.on('update-available', (info) => {
      this.setState({
        phase: 'available',
        currentVersion: this.currentVersion,
        latestVersion: info.version,
      });
    });
    this.updater.on('update-not-available', (info) => {
      this.setState({
        phase: 'idle',
        currentVersion: this.currentVersion,
        latestVersion: info.version,
      });
    });
    this.updater.on('download-progress', (progress: ProgressInfo) => {
      this.setState({
        phase: 'downloading',
        currentVersion: this.currentVersion,
        latestVersion: this.state.latestVersion,
        progress: Math.min(100, Math.max(0, progress.percent)),
        bytesPerSecond: Math.max(0, progress.bytesPerSecond),
      });
    });
    this.updater.on('update-downloaded', (info) => {
      this.setState({
        phase: 'downloaded',
        currentVersion: this.currentVersion,
        latestVersion: info.version,
        progress: 100,
      });
      if (this.installRequested) this.scheduleInstall();
    });
    this.updater.on('error', (error) => {
      this.setState({
        phase: 'error',
        currentVersion: this.currentVersion,
        latestVersion: this.state.latestVersion,
        error: error.message,
      });
    });
  }

  private scheduleInstall(): void {
    if (this.installScheduled) return;
    this.installScheduled = true;
    setTimeout(() => {
      this.beforeInstall();
      this.updater.quitAndInstall(true, true);
    }, this.installDelayMs);
  }

  private setState(state: UpdateState): void {
    this.state = updateStateSchema.parse(state);
    const snapshot = this.getState();
    for (const listener of this.listeners) listener(snapshot);
  }
}
