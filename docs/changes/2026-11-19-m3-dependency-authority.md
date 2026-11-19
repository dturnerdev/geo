# M3 dependency authority

## Applied

The two packages named by the M3 feature file are now exact-pinned and allowlisted:

- `ts-fsrs` 6.0.0, MIT — FE13 FSRS-6 memory model.
- `@open-spaced-repetition/binding-wasm32-wasip1` 0.6.1, MIT — FE17 optimiser Worker binding.

Changes made:

- `docs/spec/07-architecture-and-standards.md`: added the two rows to the existing Package/Version/Licence/Used by table, immediately after `troika-three-text`. No other 07 text changed.
- `AGENTS.md`: appended `ts-fsrs@6.0.0` and `@open-spaced-repetition/binding-wasm32-wasip1@0.6.1` to the existing Allowed runtime dependencies list, preserving every existing entry and the wording.
- `tools/ci/dependency-allowlist.json`: added the two package names as name-only entries in sorted order.
- `docs/legal/licence-register.md`: added the two sorted table rows to the existing dependency register.

No other dependencies changed. No `package.json` or lockfile was touched. No ADRs, feature behaviour, AC wording, package import rules or network behaviour changed.

Implementation remains blocked until the M3 contracts fix lands.

## Lookup record

Commands run:

```sh
npm view ts-fsrs@6 version license dist-tags --json
npm view @open-spaced-repetition/binding-wasm32-wasip1@0.6.1 version license dist-tags --json
```

Results:

```json
{
  "version": "6.0.0",
  "license": "MIT",
  "dist-tags": {
    "latest": "6.0.0",
    "beta": "6.0.0-beta.15"
  }
}
```

```json
{
  "version": "0.6.1",
  "license": "MIT",
  "dist-tags": {
    "beta": "0.6.0-beta.7",
    "latest": "0.6.1"
  }
}
```

Both match the supervisor-approved exact candidates (`ts-fsrs` 6.0.0 MIT; `@open-spaced-repetition/binding-wasm32-wasip1` 0.6.1 MIT).

## Checks

- `git diff --check`: clean, no whitespace errors.
- `git status --porcelain`: clean after commit `6e950b3`.
- `git diff --name-only origin/main...HEAD`: lists the five intended changed paths (`AGENTS.md`, `docs/changes/2026-11-19-m3-dependency-authority.md`, `docs/legal/licence-register.md`, `docs/spec/07-architecture-and-standards.md`, `tools/ci/dependency-allowlist.json`); commit `6e950b3` contains the changes.
- Repository-wide `rg -U` search for both package names and the exact version strings: all existing references located; the edited anchors were present exactly once.
- Every edited Markdown table row has four columns.
- `tools/ci/dependency-allowlist.json` remains valid JSON.

## Review these

- Confirm the sorted positions of the two name-only allowlist entries match the existing file ordering convention.
- Confirm British English and the four-column row wording in both Markdown tables.
- Commit `6e950b3` is the supervisor's committed hand-back, and the branch and PR contain the changes.
