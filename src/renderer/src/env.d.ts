/// <reference types="vite/client" />

import type { AuthappApi } from '@shared/types/electron-api';

declare global {
  interface Window {
    authapp: AuthappApi;
  }
}

export {};
