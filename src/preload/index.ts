import {
  getUpdateStateRequestSchema,
  installUpdateRequestSchema,
  updateInfoSchema,
  updateStateSchema,
} from '@shared/schemas/update';
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC_CHANNELS, UPDATE_STATE_EVENT } from '@shared/ipc/channels';
import {
  accountDtoSchema,
  createAccountRequestSchema,
  deleteAccountRequestSchema,
  updateAccountRequestSchema,
  type CreateAccountRequest,
  type DeleteAccountRequest,
  type UpdateAccountRequest,
} from '@shared/schemas/account';
import { runtimeInfoSchema } from '@shared/schemas/runtime';
import type { AuthappApi } from '@shared/types/electron-api';
import {
  copyTotpRequestSchema,
  parsedOtpAuthSchema,
  parseOtpAuthUriRequestSchema,
  totpCodeSchema,
} from '@shared/schemas/totp';
import {
  exportBackupRequestSchema,
  exportBackupResultSchema,
  importBackupRequestSchema,
  importBackupResultSchema,
  type ExportBackupRequest,
  type ImportBackupRequest,
} from '@shared/schemas/backup';
import {
  appSettingsSchema,
  updateSettingsRequestSchema,
  type UpdateSettingsRequest,
} from '@shared/schemas/settings';
import {
  lockStatusSchema,
  removePinRequestSchema,
  setPinRequestSchema,
  verifyPinRequestSchema,
  type RemovePinRequest,
  type SetPinRequest,
  type VerifyPinRequest,
} from '@shared/schemas/lock';

const api: AuthappApi = Object.freeze({
  getRuntimeInfo: async () =>
    runtimeInfoSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.getRuntimeInfo, {})),
  listAccounts: async () =>
    accountDtoSchema.array().parse(await ipcRenderer.invoke(IPC_CHANNELS.listAccounts, {})),
  createAccount: async (request: CreateAccountRequest) =>
    accountDtoSchema.parse(
      await ipcRenderer.invoke(
        IPC_CHANNELS.createAccount,
        createAccountRequestSchema.parse(request),
      ),
    ),
  updateAccount: async (request: UpdateAccountRequest) =>
    accountDtoSchema.parse(
      await ipcRenderer.invoke(
        IPC_CHANNELS.updateAccount,
        updateAccountRequestSchema.parse(request),
      ),
    ),
  deleteAccount: async (request: DeleteAccountRequest) => {
    await ipcRenderer.invoke(IPC_CHANNELS.deleteAccount, deleteAccountRequestSchema.parse(request));
  },
  getTotpCodes: async () =>
    totpCodeSchema.array().parse(await ipcRenderer.invoke(IPC_CHANNELS.getTotpCodes, {})),
  parseOtpAuthUri: async (uri: string) =>
    parsedOtpAuthSchema.parse(
      await ipcRenderer.invoke(
        IPC_CHANNELS.parseOtpAuthUri,
        parseOtpAuthUriRequestSchema.parse({ uri }),
      ),
    ),
  copyTotp: async (accountId: string) => {
    await ipcRenderer.invoke(IPC_CHANNELS.copyTotp, copyTotpRequestSchema.parse({ accountId }));
  },
  exportBackup: async (request: ExportBackupRequest) =>
    exportBackupResultSchema.parse(
      await ipcRenderer.invoke(IPC_CHANNELS.exportBackup, exportBackupRequestSchema.parse(request)),
    ),
  importBackup: async (request: ImportBackupRequest) =>
    importBackupResultSchema.parse(
      await ipcRenderer.invoke(IPC_CHANNELS.importBackup, importBackupRequestSchema.parse(request)),
    ),
  getSettings: async () =>
    appSettingsSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.getSettings, {})),
  updateSettings: async (request: UpdateSettingsRequest) =>
    appSettingsSchema.parse(
      await ipcRenderer.invoke(
        IPC_CHANNELS.updateSettings,
        updateSettingsRequestSchema.parse(request),
      ),
    ),
  getLockStatus: async () =>
    lockStatusSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.getLockStatus, {})),
  verifyPin: async (request: VerifyPinRequest) => {
    const result = await ipcRenderer.invoke(
      IPC_CHANNELS.verifyPin,
      verifyPinRequestSchema.parse(request),
    );
    return Boolean(result);
  },
  setPin: async (request: SetPinRequest) => {
    await ipcRenderer.invoke(IPC_CHANNELS.setPin, setPinRequestSchema.parse(request));
  },
  removePin: async (request: RemovePinRequest) => {
    await ipcRenderer.invoke(IPC_CHANNELS.removePin, removePinRequestSchema.parse(request));
  },
  lockApp: async () => {
    await ipcRenderer.invoke(IPC_CHANNELS.lockApp, {});
  },
  checkUpdate: async () =>
    updateInfoSchema.parse(await ipcRenderer.invoke(IPC_CHANNELS.checkUpdate, {})),
  getUpdateState: async () =>
    updateStateSchema.parse(
      await ipcRenderer.invoke(IPC_CHANNELS.getUpdateState, getUpdateStateRequestSchema.parse({})),
    ),
  installUpdate: async () => {
    await ipcRenderer.invoke(IPC_CHANNELS.installUpdate, installUpdateRequestSchema.parse({}));
  },
  onUpdateState: (listener: Parameters<AuthappApi['onUpdateState']>[0]) => {
    const handler = (_event: IpcRendererEvent, rawState: unknown) => {
      listener(updateStateSchema.parse(rawState));
    };
    ipcRenderer.on(UPDATE_STATE_EVENT, handler);
    return () => ipcRenderer.removeListener(UPDATE_STATE_EVENT, handler);
  },
});

contextBridge.exposeInMainWorld('authapp', api);
