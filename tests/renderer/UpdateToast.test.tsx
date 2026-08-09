import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UpdateToast } from '../../src/renderer/src/components/UpdateToast';
import { LanguageProvider } from '../../src/renderer/src/app/LanguageProvider';

function renderToast(): void {
  render(
    <LanguageProvider>
      <UpdateToast />
    </LanguageProvider>,
  );
}

describe('UpdateToast', () => {
  it('automatically checks for update on startup and displays toast when update is available', async () => {
    vi.mocked(window.authapp.checkUpdate).mockResolvedValueOnce({
      hasUpdate: true,
      currentVersion: '0.1.0',
      latestVersion: '0.2.1',
      releaseUrl: 'https://github.com/ardakrt/authly/releases/tag/v0.2.1',
    });

    renderToast();

    expect(
      await screen.findByRole('dialog', { name: 'Güncelleme Bulundu' }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('v0.2.1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yükle' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Daha sonra' })).toBeInTheDocument();
  });

  it('opens external URL and closes when install is clicked', async () => {
    vi.mocked(window.authapp.checkUpdate).mockResolvedValueOnce({
      hasUpdate: true,
      currentVersion: '0.1.0',
      latestVersion: '0.2.1',
      releaseUrl: 'https://github.com/ardakrt/authly/releases/tag/v0.2.1',
    });

    const user = userEvent.setup();
    renderToast();

    const installBtn = await screen.findByRole('button', { name: 'Yükle' }, { timeout: 4000 });
    await user.click(installBtn);

    expect(window.authapp.openExternalUrl).toHaveBeenCalledWith(
      'https://github.com/ardakrt/authly/releases/tag/v0.2.1',
    );
    expect(screen.queryByRole('dialog', { name: 'Güncelleme Bulundu' })).not.toBeInTheDocument();
  });

  it('dismisses toast when later button is clicked', async () => {
    vi.mocked(window.authapp.checkUpdate).mockResolvedValueOnce({
      hasUpdate: true,
      currentVersion: '0.1.0',
      latestVersion: '0.2.1',
      releaseUrl: 'https://github.com/ardakrt/authly/releases/tag/v0.2.1',
    });

    const user = userEvent.setup();
    renderToast();

    const laterBtn = await screen.findByRole('button', { name: 'Daha sonra' }, { timeout: 4000 });
    await user.click(laterBtn);

    expect(screen.queryByRole('dialog', { name: 'Güncelleme Bulundu' })).not.toBeInTheDocument();
  });
});
