import {
  Download,
  ExternalLink,
  HardDrive,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
  Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeading } from '../components/PageHeading';
import { useTheme } from '../hooks/useTheme';
import type { ThemePreference } from '../app/themeContext';
import type { AppSettings } from '@shared/schemas/settings';
import type { UpdateInfo } from '@shared/schemas/update';

const themes: ReadonlyArray<{
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: 'system', label: 'Sistem', icon: Monitor },
  { value: 'light', label: 'A??k', icon: Sun },
  { value: 'dark', label: 'Koyu', icon: Moon },
];

export function SettingsPage(): React.JSX.Element {
  const { preference, setPreference } = useTheme();
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
        error: 'G?ncelleme denetimi ger?ekle?tirilemedi.',
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportPassword || exportPassword.length < 4) {
      setStatusMsg({ type: 'error', message: 'Yedek parolas? en az 4 karakter olmal?d?r.' });
      return;
    }
    setBusy(true);
    setStatusMsg(null);
    try {
      const result = await window.authapp.exportBackup({ password: exportPassword });
      if (result.success) {
        setStatusMsg({
          type: 'success',
          message: `${result.exportedCount} adet hesap ba?ar?yla ?ifreli yedek dosyas?na aktar?ld?.`,
        });
        setShowExportForm(false);
        setExportPassword('');
      }
    } catch (err) {
      setStatusMsg({
        type: 'error',
        message: err instanceof Error ? err.message : 'Yedekleme ba?ar?s?z.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPassword) {
      setStatusMsg({ type: 'error', message: 'L?tfen yedek parolas?n? girin.' });
      return;
    }
    setBusy(true);
    setStatusMsg(null);
    try {
      const result = await window.authapp.importBackup({ password: importPassword });
      if (result.success) {
        setStatusMsg({
          type: 'success',
          message: `Yedekten ${result.importedCount} hesap ba?ar?yla i?e aktar?ld?. (${result.skippedCount} atland?)`,
        });
        setShowImportForm(false);
        setImportPassword('');
      }
    } catch (err) {
      setStatusMsg({
        type: 'error',
        message: err instanceof Error ? err.message : '??e aktarma ba?ar?s?z.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="workspace settings-page">
      <PageHeading
        title="Ayarlar"
        description="Uygulama g?r?n?m?n? ki?iselle?tirin, verilerinizi yedekleyin ve g?ncellemeleri kontrol edin."
      />

      {statusMsg ? (
        <div
          className={statusMsg.type === 'success' ? 'success-banner' : 'error-banner'}
          role="status"
        >
          {statusMsg.message}
        </div>
      ) : null}

      <section className="settings-section" aria-labelledby="appearance-title">
        <div>
          <h2 id="appearance-title">G?r?n?m ve Tema</h2>
          <p>Uygulaman?z?n renk ve tema tercihini belirleyin.</p>
        </div>
        <div className="theme-options" role="group" aria-label="Tema">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              type="button"
              key={value}
              className={preference === value ? 'is-active' : undefined}
              aria-pressed={preference === value}
              onClick={() => setPreference(value)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section" aria-labelledby="tray-title">
        <div>
          <h2 id="tray-title">Sistem Tepsisi ve Uygulama Davran???</h2>
          <p>Kapatma butonuna bas?ld???nda uygulaman?n nas?l davranaca??n? ayarlay?n.</p>
        </div>
        <div className="status-list">
          <div>
            <dt className="status-title">
              <HardDrive size={18} />
              <span>Pencere Kapat?ld???nda Sistem Tepsisine K???lt</span>
            </dt>
            <dd>
              <button
                type="button"
                className={`chip-btn ${settings?.closeToTray ? 'is-selected' : ''}`}
                onClick={() => void toggleCloseToTray()}
              >
                {settings?.closeToTray
                  ? 'Etkin (Tepside ?al???r)'
                  : 'Devre D??? (Uygulama Kapan?r)'}
              </button>
            </dd>
          </div>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="backup-title">
        <div>
          <h2 id="backup-title">?ifreli Yedekleme ve Kurtarma</h2>
          <p>
            T?m hesaplar?n?z? PBKDF2 + AES-256-GCM ile parola korumal? dosyaya aktar?n veya geri
            y?kleyin.
          </p>
        </div>
        <div className="form-actions-row" style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            className="secondary-link"
            onClick={() => {
              setShowExportForm(!showExportForm);
              setShowImportForm(false);
              setStatusMsg(null);
            }}
          >
            <Download size={18} />
            <span>?ifreli Yedek ?ndir (D??a Aktar)</span>
          </button>

          <button
            type="button"
            className="secondary-link"
            onClick={() => {
              setShowImportForm(!showImportForm);
              setShowExportForm(false);
              setStatusMsg(null);
            }}
          >
            <Upload size={18} />
            <span>Yedek Dosyas? Y?kle (??e Aktar)</span>
          </button>
        </div>

        {showExportForm && (
          <form
            className="account-form-card"
            onSubmit={(e) => void handleExport(e)}
            style={{ marginTop: '1rem' }}
          >
            <div className="form-card-header">
              <h3>?ifreli D??a Aktarma Parolas?</h3>
              <p>Yedek dosyas?n? korumak i?in g??l? bir parola belirleyin.</p>
            </div>
            <div className="form-grid">
              <label className="form-full-width">
                <span>Yedek Parolas? (En az 4 karakter)</span>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="????????"
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
                ?ptal
              </button>
              <button type="submit" className="primary-link form-submit-btn" disabled={busy}>
                <Download size={18} />
                <span>{busy ? 'D??a Aktar?l?yor...' : 'Yede?i Olu?tur ve Kaydet'}</span>
              </button>
            </div>
          </form>
        )}

        {showImportForm && (
          <form
            className="account-form-card"
            onSubmit={(e) => void handleImport(e)}
            style={{ marginTop: '1rem' }}
          >
            <div className="form-card-header">
              <h3>Yedek Dosyas? Parolas?</h3>
              <p>Yedek olu?turulurken kullan?lan parolay? girin.</p>
            </div>
            <div className="form-grid">
              <label className="form-full-width">
                <span>Yedek Parolas?</span>
                <input
                  type="password"
                  required
                  placeholder="????????"
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
                ?ptal
              </button>
              <button type="submit" className="primary-link form-submit-btn" disabled={busy}>
                <Upload size={18} />
                <span>{busy ? '?ifre ??z?l?yor...' : 'Dosyay? Se? ve ??e Aktar'}</span>
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="settings-section" aria-labelledby="update-title">
        <div>
          <h2 id="update-title">G?ncellemeler</h2>
          <p>GitHub ?zerinden uygulaman?n en g?ncel s?r?m?n? kontrol edin.</p>
        </div>
        <div className="status-list">
          <div>
            <dt className="status-title">
              <RefreshCw size={18} />
              <span>GitHub S?r?m Denetimi</span>
            </dt>
            <dd style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="secondary-link"
                disabled={checkingUpdate}
                onClick={() => void handleCheckUpdate()}
              >
                <RefreshCw size={16} className={checkingUpdate ? 'animate-spin' : undefined} />
                <span>{checkingUpdate ? 'Denetleniyor...' : 'G?ncellemeleri Denetle'}</span>
              </button>
              {updateInfo?.hasUpdate && updateInfo.releaseUrl && (
                <button
                  type="button"
                  className="primary-link"
                  onClick={() => void window.authapp.openExternalUrl(updateInfo.releaseUrl!)}
                >
                  <ExternalLink size={16} />
                  <span>S?r?m? ?ncele (v${updateInfo.latestVersion})</span>
                </button>
              )}
            </dd>
          </div>
        </div>

        {updateInfo && (
          <div
            style={{ marginTop: '0.75rem' }}
            className={
              updateInfo.hasUpdate
                ? 'success-banner'
                : updateInfo.error
                  ? 'error-banner'
                  : 'success-banner'
            }
            role="status"
          >
            {updateInfo.hasUpdate
              ? `Yeni bir s?r?m mevcut: v${updateInfo.latestVersion} (Mevcut: v${updateInfo.currentVersion})`
              : updateInfo.error
                ? updateInfo.error
                : `Uygulaman?z g?ncel (v${updateInfo.currentVersion}).`}
          </div>
        )}
      </section>
    </section>
  );
}
