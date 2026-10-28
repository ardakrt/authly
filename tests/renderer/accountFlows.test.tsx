import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from '../../src/renderer/src/pages/HomePage';
import { AddAccountPage } from '../../src/renderer/src/pages/AddAccountPage';
import { processScannedQrContent } from '../../src/renderer/src/utils/qrDecoder';

vi.mock('../../src/renderer/src/utils/qrDecoder', () => ({
  processScannedQrContent: vi.fn(),
  decodeQrFromImageFile: vi.fn(),
}));

const input = {
  issuer: 'Fixture',
  accountName: 'fixture',
  secret: 'JBSWY3DPEHPK3PXP',
  algorithm: 'SHA1' as const,
  digits: 6,
  period: 30,
  favorite: false,
  groupId: null,
};

afterEach(() => vi.resetAllMocks());

describe('account recovery and atomic import UI', () => {
  it('keeps broken accounts visible and disables copying only for missing codes', async () => {
    const healthy = {
      ...input,
      id: 'a4ff59c6-2df2-4136-86ba-78bd57a617d8',
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 1,
    };
    const broken = {
      ...healthy,
      id: '810dc456-3f63-4dc4-b943-bf272fba2cfa',
      issuer: 'Broken fixture',
    };
    vi.mocked(window.authapp.listAccounts).mockResolvedValue([healthy, broken]);
    vi.mocked(window.authapp.getTotpCodes).mockResolvedValue([
      { accountId: healthy.id, code: '000000', period: 30, remaining: 15 },
    ]);
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Broken fixture')).toBeVisible();
    expect(screen.getByText('Kod üretilemedi')).toBeVisible();
    const buttons = screen.getAllByRole('button', { name: 'Kopyala' });
    expect(buttons[0]).toBeEnabled();
    expect(buttons[1]).toBeDisabled();
  });

  it('submits a selected batch in one call, retains the preview on failure and retries once', async () => {
    const user = userEvent.setup();
    const accounts = [input, { ...input, accountName: 'second' }];
    vi.mocked(processScannedQrContent).mockResolvedValue(accounts);
    vi.mocked(window.authapp.importAccounts)
      .mockRejectedValueOnce(new Error('Storage unavailable'))
      .mockResolvedValueOnce([]);
    render(
      <MemoryRouter initialEntries={['/add']}>
        <Routes>
          <Route path="/add" element={<AddAccountPage />} />
          <Route path="/" element={<p>Import complete</p>} />
        </Routes>
      </MemoryRouter>,
    );
    // The paste event supplies fixture text without accessing the system clipboard.
    const event = new Event('paste');
    Object.defineProperty(event, 'clipboardData', {
      value: { files: [], getData: () => 'fixture migration' },
    });
    window.dispatchEvent(event);
    const save = await screen.findByRole('button', { name: /Seçili 2 Hesabı Kaydet/ });
    await user.click(save);
    expect(await screen.findByText(/Hiçbir hesap kaydedilmedi/)).toBeVisible();
    expect(window.authapp.createAccount).not.toHaveBeenCalled();
    expect(window.authapp.importAccounts).toHaveBeenCalledWith({ accounts });
    await user.click(save);
    await waitFor(() => expect(screen.getByText('Import complete')).toBeVisible());
    expect(window.authapp.importAccounts).toHaveBeenCalledTimes(2);
  });
});
