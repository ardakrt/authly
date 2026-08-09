import {
  Download,
  ExternalLink,
  Globe,
  HardDrive,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeading } from '../components/PageHeading';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import type { ThemePreference } from '../app/themeContext';
import type { Language } from '../utils/translations';
import type { AppSettings } from '@shared/schemas/settings';
import type { UpdateInfo } from '@shared/schemas/update';

const themes: ReadonlyArray<{
  value: ThemePreference;
  labelKey: 'themeSystem' | 'themeLight' | 'themeDark';
  icon: typeof Monitor;
}> = [
  { value: 'system', labelKey: 'themeSystem', icon: Monitor },
  { value: 'light', labelKey: 'themeLight', icon: Sun },
  { value: 'dark', labelKey: 'themeDark', icon: Moon },
];

const languages: ReadonlyArray<{
  value: Language;
  labelKey: 'langTr' | 'langEn';
}> = [
  { value: 'tr', labelKey: 'langTr' },
  { value: 'en', labelKey: 'langEn' },
];

export function SettingsPage(): React.JSX.Element {
  const { preference, setPreference } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [showExportForm, setShowExportForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    void window.authapp
      .getSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  const toggleCloseToTray = async () => {
    if (!settings) return;
    const next = !settings.closeToTray;
    const updated = await window.authapp.updateSettings({ closeToTray: next });
    setSettings(updated);
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const info = await window.authapp.checkUpdate();
      setUpdateInfo(info);
    } catch {
      setUpdateInfo({
        hasUpdate: false,
        currentVersion: '0.1.0',
        latestVersion: '0.1.0',
        error: 'Güncelleme denetimi gerçekleştirilemedi.',
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportPassword || exportPassword.length < 4) {
      setStatusMsg({ type: 'error', message: 'Yedek parolası en az 4 karakter olmalıdır.' });
      return;
    }
    setBusy(true);
    setStatusMsg(null);
    try {
      const result = await window.authapp.exportBackup({ password: exportPassword });
      if (result.success) {
        setStatusMsg({
          type: 'success',
          message: `${result.exportedCount} ${t('exportSuccess')}`,
        });
        setShowExportForm(false);
        setExportPassword('');
      }
    } catch (err) {
      setStatusMsg({
        type: 'error',
        message: err instanceof Error ? err.message : 'Yedekleme başarısız.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPassword) {
      setStatusMsg({ type: 'error', message: 'Lütfen yedek parolasını girin.' });
      return;
    }
    setBusy(true);
    setStatusMsg(null);
    try {
      const result = await window.authapp.importBackup({ password: importPassword });
      if (result.success) {
        setStatusMsg({
          type: 'success',
          message: `${result.importedCount} ${t('importSuccess')}`,
        });
        setShowImportForm(false);
        setImportPassword('');
      }
    } catch (err) {
      setStatusMsg({
        type: 'error',
        message: err instanceof Error ? err.message : 'İçe aktarma başarısız.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="workspace settings-minimal-wrapper">
      <PageHeading title={t('settingsTitle')} description={t('settingsSubtitle')} />

      {statusMsg ? (
        <div
          className={statusMsg.type === 'success' ? 'success-banner' : 'error-banner'}
          role="status"
        >
          {statusMsg.message}
        </div>
      ) : null}

      <div className="settings-minimal-list">
        {/* Appearance Row */}
        <section className="setting-row-minimal">
          <div className="setting-label-group">
            <div className="setting-icon-box">
              <Palette size={20} />
            </div>
            <h2 className="setting-title">{t('appearance')}</h2>
          </div>
          <div className="glass-pill-group" role="group" aria-label={t('appearance')}>
            {themes.map(({ value, labelKey, icon: Icon }) => (
              <button
                type="button"
                key={value}
                className={`glass-pill-btn ${preference === value ? 'is-active' : ''}`}
                aria-pressed={preference === value}
                onClick={() => setPreference(value)}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Language Row */}
        <section className="setting-row-minimal">
          <div className="setting-label-group">
            <div className="setting-icon-box">
              <Globe size={20} />
            </div>
            <h2 className="setting-title">{t('language')}</h2>
          </div>
          <div className="glass-pill-group" role="group" aria-label={t('language')}>
            {languages.map(({ value, labelKey }) => (
              <button
                type="button"
                key={value}
                className={`glass-pill-btn ${language === value ? 'is-active' : ''}`}
                aria-pressed={language === value}
                onClick={() => setLanguage(value)}
              >
                <span>{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* System Tray Row */}
        <section className="setting-row-minimal">
          <div className="setting-label-group">
            <div className="setting-icon-box">
              <HardDrive size={20} />
            </div>
            <h2 className="setting-title">{t('trayBehavior')}</h2>
          </div>
          <button
            type="button"
            className={`toggle-switch-btn ${settings?.closeToTray ? 'is-checked' : ''}`}
            onClick={() => void toggleCloseToTray()}
            aria-label={t('trayBehavior')}
          >
            <span className="toggle-switch-dot" />
          </button>
        </section>

        {/* Encrypted Backup Row */}
        <section className="setting-row-minimal">
          <div className="setting-label-group">
            <div className="setting-icon-box">
              <ShieldCheck size={20} />
            </div>
            <h2 className="setting-title">{t('backup')}</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="glass-pill-btn secondary-link"
              onClick={() => {
                setShowExportForm(!showExportForm);
                setShowImportForm(false);
                setStatusMsg(null);
              }}
            >
              <Download size={14} />
              <span>{t('exportBtn')}</span>
            </button>
            <button
              type="button"
              className="glass-pill-btn secondary-link"
              onClick={() => {
                setShowImportForm(!showImportForm);
                setShowExportForm(false);
                setStatusMsg(null);
              }}
            >
              <Upload size={14} />
              <span>{t('importBtn')}</span>
            </button>
          </div>
        </section>

        {/* Export Form Popover Modal */}
        {showExportForm && (
          <form
            className="account-form-card"
            onSubmit={(e) => void handleExport(e)}
            style={{ marginTop: '1rem' }}
          >
            <div
              className="form-card-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3>{t('exportModalTitle')}</h3>
                <p>{t('exportModalDesc')}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowExportForm(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="form-grid">
              <label className="form-full-width">
                <span>{t('passwordLabel')}</span>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="********"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                />
              </label>
            </div>
            <div className="form-actions-row">
              <button
                type="button"
                className="secondary-link"
                onClick={() => setShowExportForm(false)}
              >
                {t('cancel')}
              </button>
              <button type="submit" className="primary-link form-submit-btn" disabled={busy}>
                <Download size={16} />
                <span>{busy ? t('checking') : t('submitExport')}</span>
              </button>
            </div>
          </form>
        )}

        {/* Import Form Popover Modal */}
        {showImportForm && (
          <form
            className="account-form-card"
            onSubmit={(e) => void handleImport(e)}
            style={{ marginTop: '1rem' }}
          >
            <div
              className="form-card-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3>{t('importModalTitle')}</h3>
                <p>{t('importModalDesc')}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowImportForm(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="form-grid">
              <label className="form-full-width">
                <span>{t('passwordLabel')}</span>
                <input
                  type="password"
                  required
                  placeholder="********"
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                />
              </label>
            </div>
            <div className="form-actions-row">
              <button
                type="button"
                className="secondary-link"
                onClick={() => setShowImportForm(false)}
              >
                {t('cancel')}
              </button>
              <button type="submit" className="primary-link form-submit-btn" disabled={busy}>
                <Upload size={16} />
                <span>{busy ? t('checking') : t('submitImport')}</span>
              </button>
            </div>
          </form>
        )}

        {/* Updates Row */}
        <section className="setting-row-minimal">
          <div className="setting-label-group">
            <div className="setting-icon-box">
              <RefreshCw size={20} className={checkingUpdate ? 'animate-spin' : undefined} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 className="setting-title">{t('updates')}</h2>
              <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 500 }}>
                {updateInfo?.hasUpdate
                  ? `v${updateInfo.latestVersion} (${t('newVersion')})`
                  : t('upToDate')}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {updateInfo?.hasUpdate && updateInfo.releaseUrl && (
              <button
                type="button"
                className="primary-link"
                onClick={() => void window.authapp.openExternalUrl(updateInfo.releaseUrl!)}
              >
                <ExternalLink size={14} />
              </button>
            )}
            <button
              type="button"
              className="glass-pill-btn secondary-link"
              disabled={checkingUpdate}
              onClick={() => void handleCheckUpdate()}
            >
              <span>{checkingUpdate ? t('checking') : t('checkUpdateBtn')}</span>
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
