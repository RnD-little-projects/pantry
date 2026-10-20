# Backup — 2026-09-22 (unit-test work)

## What was backed up
- `backups/pantry-backup-20260922-auth-actions.test.ts.bak`: exact copy of
  `src/__tests__/auth-actions.test.ts` taken before adding new tests.
- No production files were modified by the test work (new files only under
  `src/__tests__/`).

## Why this is a partial backup
Shell execution (`powershell`, `git`, `npm`) is blocked in this session by a
sandbox setup failure (`SetNamedSecurityInfoW failed: 1340`), so a full-tree
zip and `git status` baseline could not be captured here. The planned
`backups/pantry-backup-<timestamp>.zip` step is therefore NOT done.

## To capture a full backup manually (recommended before running tests)
Run from the project root (`C:\Users\User\Desktop\Projects\pantry`):

```powershell
git status --short
Compress-Archive -Path * -DestinationPath backups\pantry-backup-20260922-full.zip -Force
```

Exclusions worth applying manually: `node_modules`, `.next`, `storage`.

## Restore
- If a new test file breaks the suite: delete the added file(s) under
  `src/__tests__/` and re-run `npm test`.
- If `src/__tests__/auth-actions.test.ts` was modified: copy the `.bak` file
  back over it, then re-run `npm test`.
- Do NOT delete this `backups/` folder until the test work is verified.
