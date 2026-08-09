import { ArrowRight, Plus, Search, Settings } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ open, onClose }: SearchDialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();

  const actions = useMemo(
    () => [
      { label: t('cmdAddAccount'), path: '/add', icon: Plus },
      { label: t('cmdOpenSettings'), path: '/settings', icon: Settings },
    ],
    [t],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr');
    if (!normalizedQuery) return actions;
    return actions.filter((action) =>
      action.label.toLocaleLowerCase('tr').includes(normalizedQuery),
    );
  }, [query, actions]);

  const choose = (path: string): void => {
    setQuery('');
    onClose();
    navigate(path);
  };

  return (
    <dialog
      ref={dialogRef}
      className="search-dialog spotlight-liquid-glass"
      aria-labelledby="search-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="search-dialog__panel">
        <label className="search-field" htmlFor="account-search">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only" id="search-title">
            {t('navSearch')}
          </span>
          <input
            ref={inputRef}
            id="account-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchPlaceholder')}
            autoComplete="off"
          />
          <kbd>Esc</kbd>
        </label>
        <div className="search-results" aria-live="polite">
          <p className="search-results__meta">{t('searchNoAccounts')}</p>
          {filteredActions.map(({ label, path, icon: Icon }) => (
            <button key={path} type="button" onClick={() => choose(path)}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          ))}
          {filteredActions.length === 0 ? (
            <p className="search-results__empty">{t('searchNoMatch')}</p>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
