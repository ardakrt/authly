import { useContext } from 'react';
import { LanguageContext, type LanguageContextValue } from '../app/languageContext';

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
