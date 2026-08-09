import { Delete, KeyRound, Lock, ShieldAlert, Unlock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { LockStatus } from '@shared/schemas/lock';
import { useLanguage } from '../hooks/useLanguage';

export function LockScreenOverlay({
  onUnlock,
}: {
  onUnlock?: () => void;
}): React.JSX.Element | null {
  const [status, setStatus] = useState<LockStatus | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { t } = useLanguage();

  const checkStatus = useCallback(async () => {
    try {
      const next = await window.authapp.getLockStatus();
      setStatus(next);
    } catch {
      // ignore status check error
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    void window.authapp.getLockStatus().then((next) => {
      if (isMounted) setStatus(next);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleVerify = useCallback(
    async (pinToTest: string) => {
      if (pinToTest.length < 4) {
        setError('PIN en az 4 haneli olmalıdır.');
        return;
      }
      setVerifying(true);
      setError('');
      try {
        await window.authapp.verifyPin({ pin: pinToTest });
        setPin('');
        await checkStatus();
        if (onUnlock) onUnlock();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'PIN hatalı.');
        setPin('');
      } finally {
        setVerifying(false);
      }
    },
    [checkStatus, onUnlock],
  );

  const addDigit = useCallback(
    (digit: string) => {
      if (pin.length < 12) {
        setPin((prev) => prev + digit);
        setError('');
      }
    },
    [pin.length],
  );

  const backspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }, []);

  useEffect(() => {
    if (!status?.isLocked) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        addDigit(e.key);
      } else if (e.key === 'Backspace') {
        backspace();
      } else if (e.key === 'Enter') {
        void handleVerify(pin);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [status?.isLocked, pin, addDigit, backspace, handleVerify]);

  if (!status?.isLocked) return null;

  return (
    <div className="lock-overlay" role="dialog" aria-modal="true" aria-label={t('lockTitle')}>
      <div className="lock-card liquid-glass-card">
        <div className="lock-header">
          <div className="lock-icon-badge liquid-glass-pill">
            <Lock size={32} />
          </div>
          <h2>{t('lockTitle')}</h2>
          <p>{t('lockSubtitle')}</p>
        </div>

        {error ? (
          <div className="error-banner" role="alert">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="pin-display">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span key={i} className={`pin-dot ${i < pin.length ? 'is-filled' : ''}`} />
          ))}
        </div>

        <div className="pin-keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              className="keypad-btn liquid-glass-pill"
              onClick={() => addDigit(digit)}
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            className="keypad-btn keypad-btn--action liquid-glass-pill"
            onClick={backspace}
            aria-label={t('lockClear')}
          >
            <Delete size={20} />
          </button>
          <button
            type="button"
            className="keypad-btn liquid-glass-pill"
            onClick={() => addDigit('0')}
          >
            0
          </button>
          <button
            type="button"
            className="keypad-btn keypad-btn--submit liquid-glass-pill"
            onClick={() => void handleVerify(pin)}
            disabled={verifying || pin.length < 4}
            aria-label={t('lockUnlock')}
          >
            {verifying ? <Unlock size={20} /> : <KeyRound size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
