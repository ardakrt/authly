import { createContext } from 'react';
import type { Language } from '../utils/translations';
import { translations } from '../utils/translations';

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.tr) => string;
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'tr',
  setLanguage: () => {},
  t: (key) => translations.tr[key] ?? key,
});
