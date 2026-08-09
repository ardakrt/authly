import { useEffect, useState } from 'react';
import type { UpdateState } from '@shared/schemas/update';

export function useUpdateState(): UpdateState | null {
  const [state, setState] = useState<UpdateState | null>(null);

  useEffect(() => {
    let mounted = true;
    void window.authapp
      .getUpdateState()
      .then((nextState) => {
        if (mounted) setState(nextState);
      })
      .catch(() => {});

    const unsubscribe = window.authapp.onUpdateState((nextState) => {
      if (mounted) setState(nextState);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return state;
}
