import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/renderer/src/app/App';
import { ThemeProvider } from '../../src/renderer/src/app/ThemeProvider';

function renderApp(): void {
  render(
    <MemoryRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('App shell and user interface', () => {
  it('uses the packaged Authly logo in the application header', async () => {
    renderApp();

    const brandButton = screen.getByRole('button', { name: 'Authly Ana Sayfası' });
    expect(brandButton.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('logo.png'),
    );
  });

  it('shows an empty state when no accounts exist', async () => {
    renderApp();

    expect(await screen.findByRole('heading', { name: 'Henüz hesap eklenmedi' })).toBeVisible();
    expect(screen.queryByText(/\b\d{3}\s\d{3}\b/)).not.toBeInTheDocument();
  });

  it('supports the settings and search keyboard shortcuts', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.keyboard('{Control>},{/Control}');
    expect(await screen.findByRole('heading', { name: 'Ayarlar' })).toBeVisible();

    await user.keyboard('{Control>}f{/Control}');
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('open'));
    expect(screen.getByPlaceholderText('Hesap veya komut ara')).toHaveFocus();
  });

  it('changes the selected theme using settings', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Koyu' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: 'Koyu' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the installed package version in settings', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('v0.3.5 (Kurulu)')).toBeVisible();
  });
});
