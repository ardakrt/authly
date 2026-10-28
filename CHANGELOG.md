# Changelog

## 0.3.11

- Validate and normalize Base32 account keys before storage; isolate unreadable legacy accounts so healthy codes remain available.
- Reject malformed migration QR data and unsupported HOTP accounts; save selected QR accounts atomically.
- Reload accounts after PIN unlock and clear sensitive views when the application locks.
- Enforce inactivity locking in main, lock on system lock/suspend, and revoke pending sensitive operations across lock sessions.
- Restore grouped accounts and backups atomically; continue reading legacy backups and report missing group metadata without skipping accounts.
- Add regression coverage and real Electron account/lock/unlock smoke checks.
