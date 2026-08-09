export const IPC_CHANNELS = {
  getRuntimeInfo: 'app:get-runtime-info',
  listAccounts: 'accounts:list',
  createAccount: 'accounts:create',
  updateAccount: 'accounts:update',
  deleteAccount: 'accounts:delete',
  getTotpCodes: 'totp:list',
  parseOtpAuthUri: 'totp:parse-uri',
  copyTotp: 'totp:copy',
  exportBackup: 'backup:export',
  importBackup: 'backup:import',
  getSettings: 'settings:get',
  updateSettings: 'settings:update',
  getLockStatus: 'lock:status',
  verifyPin: 'lock:verify',
  setPin: 'lock:set-pin',
  removePin: 'lock:remove-pin',
  lockApp: 'lock:lock-app',
  checkUpdate: 'app:check-update',
  getUpdateState: 'app:get-update-state',
  installUpdate: 'app:install-update',
} as const;

export const UPDATE_STATE_EVENT = 'app:update-state';
