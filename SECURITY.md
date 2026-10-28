# Security

To report a potential vulnerability, use [GitHub private vulnerability reporting](https://github.com/ardakrt/authly/security/advisories/new) when available. Otherwise, open an issue requesting a private contact without including account secrets, OTP codes, PINs, passwords or backup contents.

## Boundaries

- Electron main owns database access, OS-backed secret encryption and TOTP generation. The sandboxed renderer receives safe metadata and display codes through named IPC methods; stored secrets are not returned by account-list or import responses.
- Account writes validate Base32 keys. QR migration parsing bounds input and rejects malformed or unsupported data. Selected QR accounts are encrypted before one atomic database transaction, with PIN lock checks before and after asynchronous encryption.
- Corrupt or unreadable legacy accounts remain in the vault. Code generation isolates their failure so healthy accounts remain usable. Unavailable codes cannot be copied from the interface.
- The application PIN gates access; it is not an independent encryption key for the vault. An unlocked OS session or compromised operating system is outside this protection boundary.
- TOTP is generated offline. Update operations contact GitHub, and the stylesheet currently references Google Fonts. See the README for platform-specific storage and backup details.

Never attach a real vault, unencrypted backup, raw QR content, secret key or generated code to an issue or log. Automated tests and runtime smoke use synthetic fixtures and isolated storage.
