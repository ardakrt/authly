import { KeyRound, Plus, Search, Settings } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import logoIcon from '../assets/logo.png';
import { useLanguage } from '../hooks/useLanguage';

export function AppHeader({ onOpenSearch }: { onOpenSearch: () => void }): React.JSX.Element {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <header className="navbar-wrapper">
      <nav className="navbar-liquid-glass" aria-label="Ana Navigasyon">
        <div className="navbar-left">
          <button
            className="brand-button"
            type="button"
            onClick={() => navigate('/')}
            aria-label="Authly Ana Sayfası"
          >
            <span className="brand-mark" aria-hidden="true">
              <img src={logoIcon} alt="" className="brand-logo-img" />
            </span>
            <span className="brand-wordmark">{t('brand')}</span>
          </button>

          <div className="navbar-divider" aria-hidden="true" />

          <div className="navbar-links">
            <NavLink
              to="/"
              className={({ isActive }) => `navbar-nav-item ${isActive ? 'is-active' : ''}`}
              end
            >
              <KeyRound size={14} aria-hidden="true" />
              <span>{t('navCodes')}</span>
            </NavLink>

            <NavLink
              to="/add"
              className={({ isActive }) => `navbar-nav-item ${isActive ? 'is-active' : ''}`}
            >
              <Plus size={14} aria-hidden="true" />
              <span>{t('navAdd')}</span>
            </NavLink>
          </div>
        </div>

        <div className="navbar-right">
          <button
            className="search-trigger-glass"
            type="button"
            onClick={onOpenSearch}
            aria-label={t('navSearch')}
          >
            <Search size={14} aria-hidden="true" />
            <span className="search-trigger__label">{t('navSearch')}</span>
            <kbd>{t('navSearchKbd')}</kbd>
          </button>

          <NavLink
            className={({ isActive }) => `navbar-icon-btn ${isActive ? 'is-active' : ''}`}
            to="/settings"
            aria-label={t('navSettings')}
          >
            <Settings size={18} aria-hidden="true" />
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
