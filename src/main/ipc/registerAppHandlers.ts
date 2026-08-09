import { shell } from 'electron';
import {
  checkUpdateRequestSchema,
  openExternalUrlRequestSchema,
  updateInfoSchema,
} from '@shared/schemas/update';
import type { UpdateService } from '../services/UpdateService';
import { app, clipboard, ipcMain, type IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc/channels';
import {
  accountDtoSchema,
  createAccountRequestSchema,
  deleteAccountRequestSchema,
  listAccountsRequestSchema,
  updateAccountRequestSchema,
} from '@shared/schemas/account';
import { runtimeInfoRequestSchema, runtimeInfoSchema } from '@shared/schemas/runtime';
import { isTrustedRendererUrl } from '../security/trustedRenderer';
import type { AccountService } from '../services/AccountService';
import {
  copyTotpRequestSchema,
  getTotpCodesRequestSchema,
  parsedOtpAuthSchema,
  parseOtpAuthUriRequestSchema,
  totpCodeSchema,
} from '@shared/schemas/totp';
import type { TotpService } from '../services/TotpService';
import {
  exportBackupRequestSchema,
  exportBackupResultSchema,
  importBackupRequestSchema,
  importBackupResultSchema,
} from '@shared/schemas/backup';
import {
  appSettingsSchema,
  getSettingsRequestSchema,
  updateSettingsRequestSchema,
} from '@shared/schemas/settings';
import {
  lockStatusSchema,
  removePinRequestSchema,
  setPinRequestSchema,
  verifyPinRequestSchema,
} from '@shared/schemas/lock';
import type { BackupService } from '../services/BackupService';
import type { SettingsService } from '../services/SettingsService';
import type { LockService } from '../services/LockService';

function assertTrustedSender(event: IpcMainInvokeEvent, developmentUrl?: string): void {
  const senderUrl = event.senderFrame?.url;
  if (!senderUrl || !isTrustedRendererUrl(senderUrl, developmentUrl)) {
    throw new Error('Bu işlem güvenilmeyen bir uygulama yüzeyinden çağrılamaz.');
  }
}

export function registerAppHandlers(
  accountService: AccountService,
  totpService: TotpService,
  backupService: BackupService,
  settingsService: SettingsService,
  lockService: LockService,
  updateService: UpdateService,
  developmentUrl?: string,
): void {
  ipcMain.handle(IPC_CHANNELS.getRuntimeInfo, (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      runtimeInfoRequestSchema.parse(rawRequest);
      return runtimeInfoSchema.parse({
        appName: app.getName(),
        appVersion: app.getVersion(),
        platform: process.platform,
        packaged: app.isPackaged,
      });
    } catch {
      throw new Error('Uygulama bilgileri güvenli biçimde alınamadı.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.listAccounts, (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      lockService.assertNotLocked();
      listAccountsRequestSchema.parse(rawRequest);
      return accountDtoSchema.array().parse(accountService.list());
    } catch {
      throw new Error('Hesaplar güvenli biçimde okunamadı.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.createAccount, async (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      lockService.assertNotLocked();
      return accountDtoSchema.parse(
        await accountService.create(createAccountRequestSchema.parse(rawRequest)),
      );
    } catch {
      throw new Error('Hesap güvenli biçimde kaydedilemedi.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.updateAccount, async (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      lockService.assertNotLocked();
      return accountDtoSchema.parse(
        await accountService.update(updateAccountRequestSchema.parse(rawRequest)),
      );
    } catch {
      throw new Error('Hesap güvenli biçimde güncellenemedi.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.deleteAccount, (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      lockService.assertNotLocked();
      accountService.delete(deleteAccountRequestSchema.parse(rawRequest).id);
    } catch {
      throw new Error('Hesap güvenli biçimde silinemedi.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.getTotpCodes, async (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      lockService.assertNotLocked();
      getTotpCodesRequestSchema.parse(rawRequest);
      return totpCodeSchema.array().parse(await accountService.getTotpCodes());
    } catch {
      throw new Error('Kodlar güvenli biçimde üretilemedi.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.parseOtpAuthUri, (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      const { uri } = parseOtpAuthUriRequestSchema.parse(rawRequest);
      return parsedOtpAuthSchema.parse(totpService.parseUri(uri));
    } catch {
      throw new Error('otpauth bağlantısı okunamadı.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.copyTotp, async (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      const { accountId } = copyTotpRequestSchema.parse(rawRequest);
      const value = (await accountService.getTotpCodes()).find(
        (item) => item.accountId === accountId,
      );
      if (!value) throw new Error('Account not found.');
      clipboard.writeText(value.code);
      setTimeout(() => {
        if (clipboard.readText() === value.code) clipboard.clear();
      }, 15_000);
    } catch {
      throw new Error('Kod panoya kopyalanamadı.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.exportBackup, async (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      const { password } = exportBackupRequestSchema.parse(rawRequest);
      return exportBackupResultSchema.parse(await backupService.exportBackup(password));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Yedek dışa aktarılamadı.', {
        cause: err,
      });
    }
  });

  ipcMain.handle(IPC_CHANNELS.importBackup, async (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      const { password } = importBackupRequestSchema.parse(rawRequest);
      return importBackupResultSchema.parse(await backupService.importBackup(password));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Yedek içe aktarılamadı.', {
        cause: err,
      });
    }
  });

  ipcMain.handle(IPC_CHANNELS.getSettings, (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      getSettingsRequestSchema.parse(rawRequest);
      return appSettingsSchema.parse(settingsService.getSettings());
    } catch {
      throw new Error('Ayarlar okunamadı.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.updateSettings, (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      const request = updateSettingsRequestSchema.parse(rawRequest);
      return appSettingsSchema.parse(settingsService.updateSettings(request));
    } catch {
      throw new Error('Ayarlar güncellenemedi.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.getLockStatus, (event) => {
    try {
      assertTrustedSender(event, developmentUrl);
      return lockStatusSchema.parse(lockService.getStatus());
    } catch {
      throw new Error('Kilit durumu okunamadı.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.verifyPin, (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      const { pin } = verifyPinRequestSchema.parse(rawRequest);
      return lockService.verifyPin(pin);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'PIN doğrulanamadı.', { cause: err });
    }
  });

  ipcMain.handle(IPC_CHANNELS.setPin, (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      const { pin, currentPin } = setPinRequestSchema.parse(rawRequest);
      lockService.setPin(pin, currentPin);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'PIN oluşturulamadı.', { cause: err });
    }
  });

  ipcMain.handle(IPC_CHANNELS.removePin, (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      const { currentPin } = removePinRequestSchema.parse(rawRequest);
      lockService.removePin(currentPin);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'PIN kaldırılamadı.', { cause: err });
    }
  });

  ipcMain.handle(IPC_CHANNELS.lockApp, (event) => {
    try {
      assertTrustedSender(event, developmentUrl);
      lockService.lockApp();
    } catch {
      throw new Error('Uygulama kilitlenemedi.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.checkUpdate, async (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      checkUpdateRequestSchema.parse(rawRequest);
      const updateInfo = await updateService.checkForUpdates();
      return updateInfoSchema.parse(updateInfo);
    } catch {
      throw new Error('G?ncelleme denetimi ger?ekle?tirilemedi.');
    }
  });

  ipcMain.handle(IPC_CHANNELS.openExternalUrl, async (event, rawRequest: unknown) => {
    try {
      assertTrustedSender(event, developmentUrl);
      const { url } = openExternalUrlRequestSchema.parse(rawRequest);
      await shell.openExternal(url);
    } catch {
      throw new Error('Ba?lant? a??lamad?.');
    }
  });
}

export function removeAppHandlers(): void {
  for (const channel of Object.values(IPC_CHANNELS)) ipcMain.removeHandler(channel);
}
