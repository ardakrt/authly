# Development and packaging

[← Back to Authly](../../README.md)

## Requirements

- Node.js 20.19 or newer.
- npm 11 or newer; the repository declares its package-manager version in `package.json`.
- Windows 10/11 x64, or a modern x64 Linux distribution.
- On Linux, an installed and unlocked GNOME Keyring or KWallet service.

## Start locally

```bash
git clone https://github.com/ardakrt/authly.git
cd authly
npm ci
npm run dev
```

Dependency installation sets up Electron and its native dependencies. The development command starts the renderer and Electron application together.

## Verification

```bash
npm run verify
```

The pipeline runs formatting checks, ESLint, Vitest, strict TypeScript checks, the production build, and the Electron runtime smoke check. Individual commands:

```bash
npm run format:check
npm run lint
npm test
npm run typecheck
npm run build
npm run smoke
npm run smoke:visual
```

`smoke:visual` additionally captures the runtime smoke views into a temporary directory reported by the script. Passing static checks alone does not prove packaged Windows/Linux behavior.

The Electron smoke also exercises the real sandboxed preload and main-process account handlers with an isolated in-memory database. It verifies encrypted batch import, TOTP generation, invalid-secret rejection, database rollback after a later insert fails, and account cleanup. It does not access the system clipboard or the user's vault.

### Account input and import boundaries

- Creation, secret updates and backup payloads share canonical Base32 validation. Spaces, hyphens, case and valid padding are normalized; invalid characters, padding and trailing bits are rejected before storage.
- A legacy unreadable account remains visible with an unavailable-code state. Its failure does not prevent healthy accounts from generating or copying codes.
- Google Authenticator migration QR input is bounded to 128 KiB and 100 accounts. Truncated protobuf data, overflowing lengths, unknown algorithms/digit counts and non-TOTP accounts are rejected before the confirmation preview.
- The named `importAccounts` bridge validates both sides of IPC, checks the renderer origin and PIN lock, and rechecks the lock after encryption. Every selected account is inserted in one SQLite transaction; any failure leaves the batch unsaved.
- These changes do not migrate the database or delete existing accounts. A malformed legacy secret must be replaced from the original provider or the affected account removed.

## Packaging

Windows NSIS installer:

```bash
npm run package:win
```

Linux AppImage and Debian package:

```bash
npm run package:linux
```

Both commands run the verification pipeline before packaging. Outputs are written to `dist/`; run platform-specific builds in a suitable build environment. Published binaries are listed on [GitHub Releases](https://github.com/ardakrt/authly/releases).

If an AppImage or Debian package is available:

```bash
chmod +x Authly-*.AppImage
./Authly-*.AppImage

# Debian / Ubuntu
sudo apt install ./Authly-*.deb
```

## Source layout

```text
src/main/              Electron lifecycle, local storage, IPC, and services
src/main/security/     OS secret storage and renderer trust boundaries
src/preload/           Validated renderer bridge
src/renderer/          React interface, themes, and translations
src/shared/            Shared types, schemas, and IPC channel definitions
tests/                 Automated tests
scripts/               Runtime smoke checks
resources/             Application and tray icons
.github/readme/        Documentation assets and screenshot capture
```

## Refresh the README screenshots

Install development dependencies and make Playwright and Chrome available. The capture script starts a local renderer-only Vite server, injects synthetic IPC responses, and saves PNGs in `.github/readme/images/`:

```bash
node .github/readme/capture.mjs
```

If Playwright is installed outside this project, set `PLAYWRIGHT_MODULE` to its module path before running the script. Real account databases, master PINs, backup files, and TOTP secrets are never needed for this capture. External renderer requests are blocked. Screenshots demonstrate UI states; they do not test the Electron encryption or backup implementation.

## Working with local data

The application keeps runtime data in Electron's user-data directory. The internal application identifier remains `authapp`, so the usual paths are `%APPDATA%\authapp` on Windows and `~/.config/authapp` on Linux.

Use synthetic accounts when developing or taking screenshots. Keep local databases, backups, PIN hashes, and account secrets out of the repository.
