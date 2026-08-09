import { join } from 'node:path';
import { app, BrowserWindow, protocol } from 'electron';
import { LocalDatabase } from './database/LocalDatabase';
import { AccountRepository } from './database/repositories/AccountRepository';
import { SettingsRepository } from './database/repositories/SettingsRepository';
import { registerAppHandlers, removeAppHandlers } from './ipc/registerAppHandlers';
import { ElectronSafeStorageVault } from './security/ElectronSafeStorageVault';
import { registerLocalProtocol } from './security/localProtocol';
import { AccountService } from './services/AccountService';
import { TotpService } from './services/TotpService';
import { BackupService } from './services/BackupService';
import { SettingsService } from './services/SettingsService';
import { LockService } from './services/LockService';
import { UpdateService } from './services/UpdateService';
import { createMainWindow } from './window/createMainWindow';
import { TrayService } from './window/TrayService';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'authapp',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false,
    },
  },
]);

const isSmokeTest = process.env['AUTHAPP_SMOKE_TEST'] === '1';

if (isSmokeTest) {
  const smokeUserData = join(app.getPath('temp'), `authapp-smoke-userdata-${process.pid}`);
  app.setPath('userData', smokeUserData);
}

const hasSingleInstanceLock = isSmokeTest || app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

const developmentUrl = process.env['ELECTRON_RENDERER_URL'];
let localDatabase: LocalDatabase | undefined;
let trayService: TrayService | undefined;

app.whenReady().then(async () => {
  if (!developmentUrl) registerLocalProtocol(join(__dirname, '../renderer'));
  const databasePath = isSmokeTest ? ':memory:' : join(app.getPath('userData'), 'authapp.db');
  localDatabase = new LocalDatabase(databasePath);
  const vault = new ElectronSafeStorageVault();
  if (isSmokeTest) {
    const encrypted = await vault.encryptSecret('runtime-smoke-value');
    const decrypted = await vault.decryptSecret(encrypted);
    if (decrypted.secret !== 'runtime-smoke-value') throw new Error('Vault smoke failed.');
  }
  const totpService = new TotpService();
  const accountService = new AccountService(
    new AccountRepository(localDatabase.connection),
    vault,
    totpService,
  );
  const settingsService = new SettingsService(new SettingsRepository(localDatabase.connection));
  const backupService = new BackupService(accountService);
  const lockService = new LockService(new SettingsRepository(localDatabase.connection));
  const updateService = new UpdateService();

  registerAppHandlers(
    accountService,
    totpService,
    backupService,
    settingsService,
    lockService,
    updateService,
    developmentUrl,
  );

  const mainWindow = await createMainWindow(developmentUrl);
  if (!isSmokeTest) {
    trayService = new TrayService(settingsService);
    trayService.init(mainWindow);
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createMainWindow(developmentUrl);
  });
});

app.on('second-instance', () => {
  const [window] = BrowserWindow.getAllWindows();
  if (!window) return;
  if (window.isMinimized()) window.restore();
  if (!window.isVisible()) window.show();
  window.focus();
});

app.on('window-all-closed', () => {
  removeAppHandlers();
  trayService?.destroy();
  localDatabase?.close();
  if (process.platform !== 'darwin') app.quit();
});
