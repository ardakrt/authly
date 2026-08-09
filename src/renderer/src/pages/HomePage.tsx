import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AccountDto } from '@shared/schemas/account';
import type { TotpCode } from '@shared/schemas/totp';
import { PageHeading } from '../components/PageHeading';

export function HomePage(): React.JSX.Element {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [codes, setCodes] = useState<TotpCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

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
    // Smooth 100ms ticker for fluid progress line
    const smoothTimer = window.setInterval(() => setNow(Date.now()), 100);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(refreshTimer);
      window.clearInterval(smoothTimer);
    };
  }, [refresh]);

  async function remove(account: AccountDto): Promise<void> {
    if (!window.confirm(`${account.issuer} (${account.accountName}) hesabı silinsin mi?`)) return;
    await window.authapp.deleteAccount({ id: account.id });
    await refresh();
  }

  async function handleCopy(accountId: string): Promise<void> {
    await window.authapp.copyTotp(accountId);
    setCopiedAccountId(accountId);
    window.setTimeout(() => {
      setCopiedAccountId((prev) => (prev === accountId ? null : prev));
    }, 1800);
  }

  return (
    <section className="workspace" aria-labelledby="accounts-title">
      <PageHeading
        title={accounts.length ? 'Doğrulama Kodları' : 'İki Adımlı Doğrulama Kodları'}
        description="Kodlar cihazınızda çevrimdışı ve güvenle üretilir."
        action={
          <Link className="primary-link primary-link--large" to="/add">
            <Plus size={18} />
            <span>Hesap Ekle</span>
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
            <h2>Henüz hesap eklenmedi</h2>
            <p>
              QR kod görseli yükleyerek, panodan yapıştırarak veya kurulum anahtarı girerek ilk
              hesabınızı ekleyin.
            </p>
            <Link className="primary-link" to="/add">
              <Plus size={18} />
              <span>İlk Hesabını Ekle</span>
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
                      className="icon-button liquid-glass-pill"
                      aria-label="Hesabı sil"
                      onClick={() => void remove(account)}
                    >
                      <Trash2 size={16} />
                    </button>
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
                          <Check size={15} /> Kopyalandı
                        </>
                      ) : (
                        <>
                          <Copy size={15} /> Kopyala
                        </>
                      )}
                    </button>
                  </div>

                  <div className="countdown">
                    <span style={{ width: `${progress}%` }} />
                    <small>{secondsLeft} sn</small>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
