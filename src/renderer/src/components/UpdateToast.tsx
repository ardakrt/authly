import { ArrowUpCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UpdateInfo } from '@shared/schemas/update';
import { useLanguage } from '../hooks/useLanguage';

export function UpdateToast(): React.JSX.Element | null {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    let isMounted = true;
    void window.authapp
      .checkUpdate()
      .then((info) => {
        if (isMounted && info.hasUpdate && info.releaseUrl) {
          setUpdateInfo(info);
          setVisible(true);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  if (!visible || !updateInfo) return null;

  const handleInstall = () => {
    if (updateInfo.releaseUrl) {
      void window.authapp.openExternalUrl(updateInfo.releaseUrl);
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <div className="update-toast-wrapper" role="dialog" aria-label={t('updateFound')}>
      <div className="update-toast-card">
        <div className="update-toast-content">
          <div className="update-toast-icon">
            <ArrowUpCircle size={20} />
          </div>
          <div className="update-toast-text">
            <strong>v{updateInfo.latestVersion}</strong>
            <span>{t('updateFound')}</span>
          </div>
          <button
            type="button"
            className="update-toast-close"
            onClick={handleDismiss}
            aria-label={t('cancel')}
          >
            <X size={14} />
          </button>
        </div>
        <div className="update-toast-actions">
          <button
            type="button"
            className="glass-pill-btn secondary-link update-btn-later"
            onClick={handleDismiss}
          >
            {t('later')}
          </button>
          <button type="button" className="primary-link update-btn-install" onClick={handleInstall}>
            {t('installUpdate')}
          </button>
        </div>
      </div>
    </div>
  );
}
