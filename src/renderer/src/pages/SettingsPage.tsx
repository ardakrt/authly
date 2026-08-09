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
  { value: 'light', label: 'Açık', icon: Sun },
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
          message: `${result.exportedCount} adet hesap başarıyla şifreli yedek dosyasına aktarıldı.`,
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
          message: `Yedekten ${result.importedCount} hesap başarıyla içe aktarıldı. (${result.skippedCount} atlandı)`,
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
    <section className="workspace settings-page">
      <PageHeading
        title="Ayarlar"
        description="Uygulama görünümünü kişiselleştirin, verilerinizi yedekleyin ve güncellemeleri kontrol edin."
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
          <h2 id="appearance-title">Görünüm ve Tema</h2>
          <p>Uygulamanızın renk ve tema tercihini belirleyin.</p>
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
          <h2 id="tray-title">Sistem Tepsisi ve Uygulama Davranışı</h2>
          <p>Kapatma butonuna basıldığında uygulamanın nasıl davranacağını ayarlayın.</p>
        </div>
        <div className="status-list">
          <div>
            <dt className="status-title">
              <HardDrive size={18} />
              <span>Pencere Kapatıldığında Sistem Tepsisine Küçült</span>
            </dt>
            <dd>
              <button
                type="button"
                className={`chip-btn ${settings?.closeToTray ? 'is-selected' : ''}`}
                onClick={() => void toggleCloseToTray()}
              >
                {settings?.closeToTray
                  ? 'Etkin (Tepside Çalışır)'
                  : 'Devre Dışı (Uygulama Kapanır)'}
              </button>
            </dd>
          </div>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="backup-title">
        <div>
          <h2 id="backup-title">Şifreli Yedekleme ve Kurtarma</h2>
          <p>
            Tüm hesaplarınızı PBKDF2 + AES-256-GCM ile parola korumalı dosyaya aktarın veya geri
            yükleyin.
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
            <span>Şifreli Yedek İndir (Dışa Aktar)</span>
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
            <span>Yedek Dosyası Yükle (İçe Aktar)</span>
          </button>
        </div>

        {showExportForm && (
          <form
            className="account-form-card"
            onSubmit={(e) => void handleExport(e)}
            style={{ marginTop: '1rem' }}
          >
            <div className="form-card-header">
              <h3>Şifreli Dışa Aktarma Parolası</h3>
              <p>Yedek dosyasını korumak için güçlü bir parola belirleyin.</p>
            </div>
            <div className="form-grid">
              <label className="form-full-width">
                <span>Yedek Parolası (En az 4 karakter)</span>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="••••••••"
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
                İptal
              </button>
              <button type="submit" className="primary-link form-submit-btn" disabled={busy}>
                <Download size={18} />
                <span>{busy ? 'Dışa Aktarılıyor...' : 'Yedeği Oluştur ve Kaydet'}</span>
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
              <h3>Yedek Dosyası Parolası</h3>
              <p>Yedek oluşturulurken kullanılan parolayı girin.</p>
            </div>
            <div className="form-grid">
              <label className="form-full-width">
                <span>Yedek Parolası</span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
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
                İptal
              </button>
              <button type="submit" className="primary-link form-submit-btn" disabled={busy}>
                <Upload size={18} />
                <span>{busy ? 'Şifre Çözülüyor...' : 'Dosyayı Seç ve İçe Aktar'}</span>
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="settings-section" aria-labelledby="update-title">
        <div>
          <h2 id="update-title">Güncellemeler</h2>
          <p>GitHub üzerinden uygulamanın en güncel sürümünü kontrol edin.</p>
        </div>
        <div className="status-list">
          <div>
            <dt className="status-title">
              <RefreshCw size={18} />
              <span>GitHub Sürüm Denetimi</span>
            </dt>
            <dd style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="secondary-link"
                disabled={checkingUpdate}
                onClick={() => void handleCheckUpdate()}
              >
                <RefreshCw size={16} className={checkingUpdate ? 'animate-spin' : undefined} />
                <span>{checkingUpdate ? 'Denetleniyor...' : 'Güncellemeleri Denetle'}</span>
              </button>
              {updateInfo?.hasUpdate && updateInfo.releaseUrl && (
                <button
                  type="button"
                  className="primary-link"
                  onClick={() => void window.authapp.openExternalUrl(updateInfo.releaseUrl!)}
                >
                  <ExternalLink size={16} />
                  <span>Sürümü İncele (v{updateInfo.latestVersion})</span>
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
              ? `Yeni bir sürüm mevcut: v${updateInfo.latestVersion} (Mevcut: v${updateInfo.currentVersion})`
              : updateInfo.error
                ? updateInfo.error
                : `Uygulamanız güncel (v${updateInfo.currentVersion}).`}
          </div>
        )}
      </section>
    </section>
  );
}
