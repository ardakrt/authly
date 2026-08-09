import { useContext } from 'react';
import { ThemeContext } from '../app/themeContext';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('Tema ayarları kullanılamıyor.');
  return context;
}
