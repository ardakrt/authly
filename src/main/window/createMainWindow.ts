import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BrowserWindow, session } from 'electron';
import { buildContentSecurityPolicy } from '../security/contentSecurityPolicy';
import { isTrustedRendererUrl } from '../security/trustedRenderer';

function installDevelopmentCsp(developmentUrl: string): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!isTrustedRendererUrl(details.url, developmentUrl)) {
      callback({});
      return;
    }

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [buildContentSecurityPolicy(true)],
        'X-Content-Type-Options': ['nosniff'],
      },
    });
  });
}

export async function createMainWindow(developmentUrl?: string): Promise<BrowserWindow> {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler(() => false);

  if (developmentUrl) installDevelopmentCsp(developmentUrl);

  const window = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: process.env['AUTHAPP_SMOKE_SCREENSHOT_DIR'] ? 320 : 360,
    minHeight: 560,
    show: false,
    backgroundColor: '#07070a',
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: true,
      devTools: Boolean(developmentUrl) && !process.env['AUTHAPP_DISABLE_DEVTOOLS'],
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  if (developmentUrl) {
    window.webContents.on('console-message', (details) => {
      if (details.level === 'error') process.stderr.write(`[renderer] ${details.message}\n`);
    });
    window.webContents.on('preload-error', (_event, _preloadPath, error) => {
      process.stderr.write(`[preload] ${error.message}\n`);
    });
    window.webContents.once('did-finish-load', async () => {
      const result: unknown = await window.webContents.executeJavaScript(`
        Promise.allSettled([
          window.authapp?.listAccounts?.(),
          window.authapp?.getTotpCodes?.()
        ]).then((items) => items.map((item) =>
          item.status === 'fulfilled' ? 'ok' : String(item.reason?.message ?? 'failed')
        ))
      `);
      process.stderr.write(`[renderer-probe] ${JSON.stringify(result)}\n`);
    });
  }
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isTrustedRendererUrl(targetUrl, developmentUrl)) event.preventDefault();
  });
  if (process.env['AUTHAPP_SMOKE_TEST'] === '1') {
    window.webContents.once('did-finish-load', async () => {
      try {
        const appShellReady: unknown = await window.webContents.executeJavaScript(
          'Boolean(document.querySelector(".app-shell"))',
          true,
        );
        if (appShellReady !== true) throw new Error('Renderer app shell was not created.');

        const accountFlowReady: unknown = await window.webContents.executeJavaScript(`
          (async () => {
            const api = window.authapp;
            const fixture = {
              issuer: 'Smoke fixture', accountName: 'fixture', secret: 'JBSWY3DPEHPK3PXP',
              algorithm: 'SHA1', digits: 6, period: 30, favorite: false, groupId: null,
            };
            const imported = await api.importAccounts({
              accounts: [fixture, { ...fixture, accountName: 'second fixture' }],
            });
            if (imported.length !== 2 || imported.some((item) => 'secret' in item || 'encryptedSecret' in item)) {
              throw new Error('Account import contract failed.');
            }
            const codes = await api.getTotpCodes();
            if (codes.length !== 2 || codes.some((item) => !/^\\d{6}$/.test(item.code))) {
              throw new Error('Account generation failed.');
            }
            let invalidRejected = false;
            try { await api.createAccount({ ...fixture, secret: 'INVALID!' }); }
            catch { invalidRejected = true; }
            if (!invalidRejected) throw new Error('Invalid secret was accepted.');
            let rollbackRejected = false;
            try {
              await api.importAccounts({ accounts: [fixture, {
                ...fixture, groupId: 'a4ff59c6-2df2-4136-86ba-78bd57a617d8',
              }] });
            } catch { rollbackRejected = true; }
            if (!rollbackRejected || (await api.listAccounts()).length !== 2) {
              throw new Error('Atomic account import failed.');
            }
            await api.setPin({ pin: '1357' });
            await api.lockApp();
            if (!(await api.getLockStatus()).isLocked) throw new Error('Runtime lock failed.');
            let lockedReadRejected = false;
            try { await api.getTotpCodes(); } catch { lockedReadRejected = true; }
            if (!lockedReadRejected) throw new Error('Locked account read was accepted.');
            await api.verifyPin({ pin: '1357' });
            const readyDeadline = Date.now() + 3000;
            while (!document.querySelector('.account-card') && Date.now() < readyDeadline) {
              await new Promise((resolve) => setTimeout(resolve, 25));
            }
            if (!document.querySelector('.account-card')) throw new Error('Account view did not reload after unlock.');
            await api.removePin({ currentPin: '1357' });
            for (const account of imported) await api.deleteAccount({ id: account.id });
            const single = await api.createAccount(fixture);
            await api.deleteAccount({ id: single.id });
            return (await api.listAccounts()).length === 0;
          })()
        `);
        if (accountFlowReady !== true) throw new Error('Account flow smoke failed.');

        const screenshotDirectory = process.env['AUTHAPP_SMOKE_SCREENSHOT_DIR'];
        if (screenshotDirectory) {
          await mkdir(screenshotDirectory, { recursive: true });
          for (const width of [320, 375, 414, 768]) {
            window.setSize(width, 720);
            await new Promise((resolve) => setTimeout(resolve, 120));
            const image = await window.webContents.capturePage();
            await writeFile(join(screenshotDirectory, `authapp-${width}.png`), image.toPNG());
          }
          process.stdout.write(`AUTHAPP_SMOKE_SCREENSHOTS=${screenshotDirectory}\n`);
        }
        process.stdout.write('AUTHAPP_SMOKE_READY\n');
      } catch (error) {
        process.exitCode = 1;
        const message = error instanceof Error ? error.message : 'Unknown visual smoke error';
        process.stderr.write(`AUTHAPP_SMOKE_CAPTURE_FAILED: ${message}\n`);
      } finally {
        window.close();
      }
    });
    window.webContents.once('did-fail-load', () => {
      process.exitCode = 1;
      process.stderr.write('AUTHAPP_SMOKE_LOAD_FAILED\n');
      window.close();
    });
  }

  window.once('ready-to-show', () => {
    window.show();
    window.focus();
  });

  if (developmentUrl) {
    await window.loadURL(developmentUrl);
    if (process.env['AUTHAPP_OPEN_DEVTOOLS'] === '1') {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    await window.loadURL('authapp://app/index.html');
  }

  if (!window.isVisible() && !process.env['AUTHAPP_SMOKE_TEST']) {
    window.show();
    window.focus();
  }

  return window;
}
