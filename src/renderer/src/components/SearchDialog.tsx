import { ArrowRight, Plus, Search, Settings } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

const actions = [
  { label: 'Yeni hesap ekle', path: '/add', icon: Plus },
  { label: 'Ayarları aç', path: '/settings', icon: Settings },
] as const;

export function SearchDialog({ open, onClose }: SearchDialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

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
  }, [query]);

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
            Hesaplarda ara
          </span>
          <input
            ref={inputRef}
            id="account-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hesap veya komut ara"
            autoComplete="off"
          />
          <kbd>Esc</kbd>
        </label>
        <div className="search-results" aria-live="polite">
          <p className="search-results__meta">
            Kayıtlı hesap yok. Kullanılabilir uygulama komutları:
          </p>
          {filteredActions.map(({ label, path, icon: Icon }) => (
            <button key={path} type="button" onClick={() => choose(path)}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          ))}
          {filteredActions.length === 0 ? (
            <p className="search-results__empty">Bu aramayla eşleşen komut yok.</p>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
