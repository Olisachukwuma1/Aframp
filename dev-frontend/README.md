# 🛠️ dev-frontend — Contributor Sandbox

This directory is the **safe workspace** for contributors on the `dev-frontend` branch.

## Rules

| ✅ Allowed                               | ❌ Forbidden                                    |
| ---------------------------------------- | ----------------------------------------------- |
| Create files inside `dev-frontend/`      | Modify anything in `app/`                       |
| Open PRs targeting `dev-frontend` branch | Modify anything in `components/`                |
| Add new components, pages, hooks here    | Modify anything in `lib/`                       |
| Write tests inside `dev-frontend/`       | Modify `next.config.mjs`                        |
| Add docs here                            | Modify `styles/`, `public/`, `types/`, `hooks/` |

## Why?

The main frontend (`app/`, `components/`, `lib/`, etc.) is the production codebase.
Contributors using this branch experiment and build new features in isolation here
before they are reviewed, tested, and merged into `main`.

The CI workflow `.github/workflows/dev-frontend-guard.yml` **automatically fails**
any push or PR on this branch that touches a protected main-frontend path.

### Narrow exception: issue-assigned files

The guard exists to stop sandbox work from breaking production — not to block a fix
a maintainer has asked for by name. A short `ALLOWED_EXACT` list in the workflow
exempts the specific files an assigned issue requires, each annotated with its
issue number. A sandbox copy of a real fix is not a fix, so the exception is
limited to:

| File                               | Issue                                                  |
| ---------------------------------- | ------------------------------------------------------ |
| `components/onramp/zar-onramp.tsx` | [#660](https://github.com/kellymusk/Aframp/issues/660) |
| `lib/navigation.ts`                | #660                                                   |
| the two matching test files        | #660                                                   |

Everything else under a protected prefix is still a violation, and the list is not
a general escape hatch — adding to it needs a maintainer to name the file and the
issue in review.

## Getting Started

1. Clone the repo and check out `dev-frontend`:

   ```bash
   git checkout dev-frontend
   ```

2. Create your feature directory under `dev-frontend/`:

   ```bash
   mkdir dev-frontend/my-feature
   cd dev-frontend/my-feature
   ```

3. Build your feature. Reference the main frontend code **read-only** for patterns.

4. Open a PR against `dev-frontend`. The guard CI will verify you haven't
   accidentally edited any production files.

5. Once reviewed and approved, a maintainer will cherry-pick or merge your
   changes into `main` with full test coverage.

## Questions?

Open an issue on GitHub or ping a maintainer in the PR.
