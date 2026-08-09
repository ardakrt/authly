import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LanguageContext } from './languageContext';
import type { Language } from '../utils/translations';
import { translations } from '../utils/translations';

const STORAGE_KEY = 'authapp.language';

function readInitialLanguage(): Language {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'tr' || stored === 'en') return stored;
  return 'tr';
}

export function LanguageProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    void window.authapp
      .getSettings()
      .then((settings) => {
        if (settings.language === 'tr' || settings.language === 'en') {
          setLanguageState(settings.language);
          window.localStorage.setItem(STORAGE_KEY, settings.language);
        }
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((nextLang: Language) => {
    setLanguageState(nextLang);
    window.localStorage.setItem(STORAGE_KEY, nextLang);
    void window.authapp.updateSettings({ language: nextLang }).catch(() => {});
  }, []);

  const t = useCallback(
    (key: keyof typeof translations.tr): string => {
      const dict = translations[language] ?? translations.tr;
      return dict[key] ?? translations.tr[key] ?? key;
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
