# Copilot Instructions

Authapp is a Windows-first offline Electron/React/TypeScript authenticator.

- Read `AGENTS.md`, the active task, and Git/ACKit state before editing.
- Preserve user changes and keep work task-first, docs-first, and test-backed.
- Treat Electron main as the security boundary. Never expose Node, filesystem, database, encryption, or raw IPC to the renderer.
- Never log secrets or OTP values; never add plaintext storage or insecure fallbacks.
- Validate IPC at runtime with shared Zod schemas.
- Run focused tests, then `npm run verify`, `ackit scan --ci`, and `git diff --check`.
- Commit, push, release, deployment, and permission changes require explicit authorization.
