import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import { join } from 'node:path';
import type { SettingsService } from '../services/SettingsService';

const TRAY_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAuSURBVHgB7YwxEQAwCAMt/jW00IAlpBwMcmw6+s7E+RQQCQGRkBAQCRkR8Y75AQt9CQ2/q18eAAAAAElFTkSuQmCC';

export class TrayService {
  private tray: Tray | null = null;
  private isQuitting = false;

  constructor(private readonly settingsService: SettingsService) {}

  init(mainWindow: BrowserWindow): void {
    if (this.tray) return;

    const iconPath = join(__dirname, '../../resources/tray-icon.png');
    const icon = nativeImage.createFromPath(iconPath).isEmpty()
      ? nativeImage.createFromDataURL(TRAY_ICON_DATA_URL)
      : nativeImage.createFromPath(iconPath);
    this.tray = new Tray(icon);
    this.tray.setToolTip('Authly — Güvenli Authenticator');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Authly'yi Göster",
        click: () => {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: 'separator' },
      {
        label: 'Çıkış',
        click: () => {
          this.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.on('double-click', () => {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    });

    mainWindow.on('close', (event) => {
      const settings = this.settingsService.getSettings();
      if (!this.isQuitting && settings.closeToTray && process.env['AUTHAPP_SMOKE_TEST'] !== '1') {
        event.preventDefault();
        mainWindow.hide();
      }
    });
  }

  setQuitting(value: boolean): void {
    this.isQuitting = value;
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
