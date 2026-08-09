import { useCallback, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { SearchDialog } from '../components/SearchDialog';
import { LockScreenOverlay } from '../components/LockScreenOverlay';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { AddAccountPage } from '../pages/AddAccountPage';
import { HomePage } from '../pages/HomePage';
import { SettingsPage } from '../pages/SettingsPage';

export function App(): React.JSX.Element {
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  useKeyboardShortcuts(openSearch);

  return (
    <div className="app-wrapper app-shell">
      <LockScreenOverlay />
      {/* Background Ambient Glows & Noise Texture */}
      <div className="bg-glow-one" aria-hidden="true" />
      <div className="bg-glow-two" aria-hidden="true" />
      <div className="grain-overlay" aria-hidden="true" />

      <AppHeader onOpenSearch={openSearch} />

      <main className="app-main" id="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/add" element={<AddAccountPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <SearchDialog open={searchOpen} onClose={closeSearch} />
    </div>
  );
}
