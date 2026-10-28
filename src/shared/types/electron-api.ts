import type { RuntimeInfo } from '../schemas/runtime';
import type {
  AccountDto,
  CreateAccountRequest,
  ImportAccountsRequest,
  DeleteAccountRequest,
  UpdateAccountRequest,
} from '../schemas/account';
import type { ParsedOtpAuth, TotpCode } from '../schemas/totp';
import type {
  ExportBackupRequest,
  ExportBackupResult,
  ImportBackupRequest,
  ImportBackupResult,
} from '../schemas/backup';
import type { AppSettings, UpdateSettingsRequest } from '../schemas/settings';
import type { UpdateInfo, UpdateState } from '../schemas/update';
import type {
  LockStatus,
  RemovePinRequest,
  SetPinRequest,
  VerifyPinRequest,
} from '../schemas/lock';

export interface AuthappApi {
  getRuntimeInfo: () => Promise<RuntimeInfo>;
  listAccounts: () => Promise<AccountDto[]>;
  createAccount: (request: CreateAccountRequest) => Promise<AccountDto>;
  importAccounts: (request: ImportAccountsRequest) => Promise<AccountDto[]>;
  updateAccount: (request: UpdateAccountRequest) => Promise<AccountDto>;
  deleteAccount: (request: DeleteAccountRequest) => Promise<void>;
  getTotpCodes: () => Promise<TotpCode[]>;
  parseOtpAuthUri: (uri: string) => Promise<ParsedOtpAuth>;
  copyTotp: (accountId: string) => Promise<void>;
  exportBackup: (request: ExportBackupRequest) => Promise<ExportBackupResult>;
  importBackup: (request: ImportBackupRequest) => Promise<ImportBackupResult>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (request: UpdateSettingsRequest) => Promise<AppSettings>;
  getLockStatus: () => Promise<LockStatus>;
  verifyPin: (request: VerifyPinRequest) => Promise<boolean>;
  setPin: (request: SetPinRequest) => Promise<void>;
  removePin: (request: RemovePinRequest) => Promise<void>;
  lockApp: () => Promise<void>;
  recordActivity: () => Promise<void>;
  onLockStatus: (listener: (status: LockStatus) => void) => () => void;
  checkUpdate: () => Promise<UpdateInfo>;
  getUpdateState: () => Promise<UpdateState>;
  installUpdate: () => Promise<void>;
  onUpdateState: (listener: (state: UpdateState) => void) => () => void;
}
