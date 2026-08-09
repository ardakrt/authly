import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AccountDto } from '@shared/schemas/account';
import type { TotpCode } from '@shared/schemas/totp';
import { PageHeading } from '../components/PageHeading';
import { useLanguage } from '../hooks/useLanguage';

export function HomePage(): React.JSX.Element {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [codes, setCodes] = useState<TotpCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const [activeMenuAccountId, setActiveMenuAccountId] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<AccountDto | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountDto | null>(null);
  const [editIssuer, setEditIssuer] = useState('');
  const [editAccountName, setEditAccountName] = useState('');
  const [editingBusy, setEditingBusy] = useState(false);

  const { t } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextAccounts, nextCodes] = await Promise.all([
        window.authapp.listAccounts(),
        window.authapp.getTotpCodes(),
      ]);
      setAccounts(nextAccounts);
      setCodes(nextCodes);
      setError(false);
    } catch (reason) {
      if (import.meta.env.DEV) {
        console.error(
          'Account refresh failed:',
          reason instanceof Error ? reason.message : 'unknown error',
        );
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const refreshTimer = window.setInterval(() => void refresh(), 1000);
    const smoothTimer = window.setInterval(() => setNow(Date.now()), 100);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(refreshTimer);
      window.clearInterval(smoothTimer);
    };
  }, [refresh]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveMenuAccountId(null);
      }
    };
    if (activeMenuAccountId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuAccountId]);

  const handleOpenEdit = (account: AccountDto) => {
    setActiveMenuAccountId(null);
    setEditingAccount(account);
    setEditIssuer(account.issuer);
    setEditAccountName(account.accountName);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editIssuer.trim() || !editAccountName.trim()) return;
    setEditingBusy(true);
    try {
      await window.authapp.updateAccount({
        id: editingAccount.id,
        issuer: editIssuer.trim(),
        accountName: editAccountName.trim(),
        algorithm: editingAccount.algorithm,
        digits: editingAccount.digits,
        period: editingAccount.period,
        favorite: editingAccount.favorite,
        groupId: editingAccount.groupId,
      });
      setEditingAccount(null);
      await refresh();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Account update failed:', err);
      }
    } finally {
      setEditingBusy(false);
    }
  };

  const handleOpenDelete = (account: AccountDto) => {
    setActiveMenuAccountId(null);
    setDeletingAccount(account);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;
    setDeletingBusy(true);
    try {
      await window.authapp.deleteAccount({ id: deletingAccount.id });
      setDeletingAccount(null);
      await refresh();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Account delete failed:', err);
      }
    } finally {
      setDeletingBusy(false);
    }
  };

  async function handleCopy(accountId: string): Promise<void> {
    await window.authapp.copyTotp(accountId);
    setCopiedAccountId(accountId);
    window.setTimeout(() => {
      setCopiedAccountId((prev) => (prev === accountId ? null : prev));
    }, 1800);
  }

  return (
    <>
      <section className="workspace" aria-labelledby="accounts-title">
        <PageHeading
          title={accounts.length ? t('codesTitle') : t('codesTitleEmpty')}
          description={t('codesSubtitle')}
          action={
            <Link className="primary-link primary-link--large" to="/add">
              <Plus size={18} />
              <span>{t('addAccountBtn')}</span>
            </Link>
          }
        />

        {error ? (
          <div className="error-banner" role="alert">
            Kodlar okunamadı.
          </div>
        ) : null}

        <div className="account-surface-glass" id="accounts-title">
          {loading ? (
            <div className="loading-state">
              <span />
              <span />
              <span />
            </div>
          ) : accounts.length === 0 ? (
            <div className="empty-state liquid-glass-card">
              <div className="empty-state__icon liquid-glass-pill">
                <KeyRound size={28} />
              </div>
              <h2>{t('emptyTitle')}</h2>
              <p>{t('emptyDesc')}</p>
              <Link className="primary-link" to="/add">
                <Plus size={18} />
                <span>{t('addFirstAccount')}</span>
              </Link>
            </div>
          ) : (
            <div className="account-grid">
              {accounts.map((account) => {
                const value = codes.find((item) => item.accountId === account.id);
                const periodMs = (value?.period ?? 30) * 1000;
                const msRemaining = periodMs - (now % periodMs);
                const progress = (msRemaining / periodMs) * 100;
                const secondsLeft = Math.ceil(msRemaining / 1000);
                const isCopied = copiedAccountId === account.id;
                const isMenuOpen = activeMenuAccountId === account.id;

                return (
                  <article className="account-card liquid-glass-card" key={account.id}>
                    <div className="account-card__top">
                      <span className="service-avatar liquid-glass-pill">
                        {account.issuer.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="account-meta">
                        <h2>{account.issuer}</h2>
                        <p>{account.accountName}</p>
                      </div>

                      <button
                        type="button"
                        className="icon-button liquid-glass-pill"
                        aria-label={t('optionsMenu')}
                        onClick={() => setActiveMenuAccountId(isMenuOpen ? null : account.id)}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <div className="account-card-dropdown" ref={dropdownRef}>
                          <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => handleOpenEdit(account)}
                          >
                            <Pencil size={14} />
                            <span>{t('editAccount')}</span>
                          </button>
                          <button
                            type="button"
                            className="dropdown-item dropdown-item--destructive"
                            onClick={() => handleOpenDelete(account)}
                          >
                            <Trash2 size={14} />
                            <span>{t('deleteAccountBtn')}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="otp-row">
                      <strong className="otp-code">
                        {value ? value.code.replace(/(.{3})/g, '$1 ').trim() : '------'}
                      </strong>
                      <button
                        className={`copy-button liquid-glass-pill ${isCopied ? 'is-copied' : ''}`}
                        onClick={() => void handleCopy(account.id)}
                      >
                        {isCopied ? (
                          <>
                            <Check size={15} /> {t('copied')}
                          </>
                        ) : (
                          <>
                            <Copy size={15} /> {t('copy')}
                          </>
                        )}
                      </button>
                    </div>

                    <div className="countdown">
                      <span style={{ width: `${progress}%` }} />
                      <small>
                        {secondsLeft} {t('secLeft')}
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {deletingAccount && (
        <div className="custom-modal-overlay" role="dialog" aria-modal="true">
          <div className="custom-modal-card">
            <div className="modal-header-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="form-card-header">
              <h3>{t('deleteConfirmTitle')}</h3>
              <p>
                <strong>
                  {deletingAccount.issuer} ({deletingAccount.accountName})
                </strong>{' '}
                {t('deleteConfirmDesc')}
              </p>
            </div>
            <div className="form-actions-row">
              <button
                type="button"
                className="secondary-link"
                disabled={deletingBusy}
                onClick={() => setDeletingAccount(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="primary-link destructive-btn"
                disabled={deletingBusy}
                onClick={() => void handleConfirmDelete()}
              >
                {deletingBusy ? t('saving') : t('deleteAccountBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingAccount && (
        <div className="custom-modal-overlay" role="dialog" aria-modal="true">
          <form className="custom-modal-card" onSubmit={(e) => void handleSaveEdit(e)}>
            <div
              className="form-card-header"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div>
                <h3>{t('editTitle')}</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setEditingAccount(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label>
                <span>{t('serviceName')}</span>
                <input
                  required
                  maxLength={120}
                  value={editIssuer}
                  onChange={(e) => setEditIssuer(e.target.value)}
                />
              </label>

              <label>
                <span>{t('accountNameEmail')}</span>
                <input
                  required
                  maxLength={240}
                  value={editAccountName}
                  onChange={(e) => setEditAccountName(e.target.value)}
                />
              </label>
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="secondary-link"
                disabled={editingBusy}
                onClick={() => setEditingAccount(null)}
              >
                {t('cancel')}
              </button>
              <button type="submit" className="primary-link" disabled={editingBusy}>
                <Save size={16} />
                <span>{editingBusy ? t('saving') : t('editSaveBtn')}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
