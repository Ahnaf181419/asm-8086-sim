# Plan 003: Establish a real viewport-testing baseline so responsive work can be verified

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `docs/plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 862ee4a..HEAD -- asm-8086-sim/package.json asm-8086-sim/vite.config.ts asm-8086-sim/.github asm-8086-sim/../.github/workflows/deploy.yml`
> If any of those changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none — but plans 004, 005 and 007 depend on **this**
- **Category**: tests
- **Planned at**: commit `862ee4a`, 2026-10-01

## Why this matters

This repo has a strong test culture: 611 tests, content contracts that pin
lesson counts and assert every code snippet assembles, and characterization
tests written one-describe-per-defect. None of it can see a layout bug.

`vitest` runs in `jsdom`. jsdom parses CSS but does not compute layout: it has
no box model, `getBoundingClientRect()` returns zeros, media queries do not
evaluate against a real viewport, and `scrollWidth` is always `0`. So the
statements "the page scrolls sideways on a phone", "this button is 22px tall",
and "the nav eats four screens before the lesson starts" are all unassertable
today.

That matters because the remaining mobile plans (004 touch targets and phone
breakpoint, 005 lessons nav, 007 hardware lab) each restructure layout. Without
a viewport-level check, every one of them lands on manual inspection alone, and
nothing stops the next change from silently undoing them.

This plan adds the smallest honest baseline: Playwright with a phone-sized
project, and three assertions that encode the rules the other plans depend on —
no horizontal document overflow, minimum touch-target size, and a content-first
lessons route.

**This is a real tradeoff and you should surface it in your report.** It adds a
devDependency with a browser download (~130 MB for Chromium), a second CI job,
and a new command contributors must know. If the operator would rather not take
that on, the alternative is documented manual verification, and plans 004/005/007
should be re-sequenced to state that explicitly. Do not decide this unilaterally
if the operator has expressed a preference; if they have not, proceed.

## Current state

Files in scope, and their role:

- `package.json` — scripts and dependency manifest. No browser-testing
  dependency today.
- `vite.config.ts` — Vite + vitest config. The `test` block configures
  coverage; there is no browser/e2e configuration.
- `.github/workflows/deploy.yml` (at the **repo root**, one level above
  `asm-8086-sim/`) — the only CI workflow. Runs lint, typecheck, test and the
  Pages build, then deploys.
- `tests/` — 20 vitest spec files. `tests/pages-smoke.spec.tsx` is the closest
  existing thing to an integration test and is the file to learn the house
  style from.

### Current scripts (`package.json`)

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "oxlint",
  "preview": "vite preview",
  "test": "vitest run",
  "build:pages": "tsc -b && PAGES_BASE=/asm-8086-sim/ vite build",
  "preview:pages": "PAGES_BASE=/asm-8086-sim/ vite preview",
  "typecheck": "tsc -b",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

Current devDependencies: `@testing-library/react`, `@types/node`,
`@types/react`, `@types/react-dom`, `@vitejs/plugin-react`,
`@vitest/coverage-v8`, `jsdom`, `oxlint`, `typescript`, `vite`, `vitest`.

There is **no** `playwright` or `@playwright/test`. A stray `.playwright-mcp/`
directory exists at the repo root but it is gitignored tooling scratch, not a
dependency — do not treat it as an existing setup.

### Current vitest config (`vite.config.ts`)

```ts
export default defineConfig({
  base,
  plugins: [react(), cspMeta()],
  test: {
    coverage: {
      include: ['src'],
      exclude: ['src/data/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text', 'html'],
    },
  },
})
```

The file also defines a `cspMeta()` Vite plugin that injects a
Content-Security-Policy meta tag **on the built page only** (`apply: 'build'`).
Playwright will run against a build or the dev server; either is fine, but know
that the built page carries a CSP.

### Current CI (`.github/workflows/deploy.yml`, repo root)

The `build` job runs, in order: checkout, setup-node (Node 22, npm cache keyed
on `asm-8086-sim/package-lock.json`), `npm ci`, `npm run lint`,
`npm run typecheck`, `npm test`, `npm run build:pages`, SPA fallback copy,
then the Pages upload. Actions are **pinned by commit SHA** with the version
tag in a trailing comment — this is deliberate supply-chain hardening and any
action you add must follow it.

The workflow has `defaults.run.working-directory: asm-8086-sim`.

### TypeScript project layout

Three tsconfigs, composed by `tsconfig.json` via project references:
`tsconfig.app.json` (`include: ["src"]`), `tsconfig.test.json`
(`include: ["tests"]`, `types: ["node", "vite/client"]`), and
`tsconfig.node.json` (`include: ["vite.config.ts"]`). `npm run typecheck` is
`tsc -b`, which builds all three.

**This matters**: a new `e2e/` directory containing `.ts` files will be in *no*
tsconfig, so `tsc -b` will not check it — mirroring a problem this repo already
fixed once (the comment in `tsconfig.test.json` says `tests/` was in no tsconfig
and could drift). Follow the precedent: give the new directory its own project.

### Repo conventions to match

- Test files: one `describe` per concern, explanatory comments naming the
  defect a test pins. See the header of `tests/audit-2026-09-12-fixes.spec.ts`.
- `tests/pages-smoke.spec.tsx` documents *why* it is slow and why it needs an
  explicit timeout — match that habit of explaining non-obvious test config.
- `AGENTS.md` (repo root) is the conventions file. Read it first. It lists the
  gate: tests + lint + typecheck + build, all green.

## Commands you will need

Run from `asm-8086-sim/`.

| Purpose        | Command                          | Expected on success        |
|----------------|----------------------------------|----------------------------|
| Install        | `npm ci`                         | exit 0                     |
| Lint           | `npm run lint`                   | exit 0, no output          |
| Typecheck      | `npm run typecheck`              | exit 0, no output          |
| Unit tests     | `npm test`                       | exit 0, 611 tests pass     |
| Build          | `npm run build`                  | exit 0, "✓ built in …"     |
| Preview build  | `npm run preview`                | serves `dist/` on :4173    |
| E2E (new)      | `npm run test:e2e`               | exit 0, 3 tests pass       |

## Scope

**In scope**:

- `asm-8086-sim/package.json` (add devDependency + scripts)
- `asm-8086-sim/vite.config.ts` (**one change only**: exclude `e2e/**` from vitest's
  file discovery — see step 6b. An earlier draft of this plan put this file out of
  scope, which made the plan impossible to complete: vitest's default glob matches
  `e2e/*.spec.ts` and Playwright's `test.describe()` throws inside it.)
- `asm-8086-sim/package-lock.json` (regenerated by npm)
- `asm-8086-sim/playwright.config.ts` (create)
- `asm-8086-sim/e2e/mobile-layout.spec.ts` (create)
- `asm-8086-sim/tsconfig.e2e.json` (create)
- `asm-8086-sim/tsconfig.json` (add the new project reference)
- `asm-8086-sim/.gitignore` (ignore Playwright output dirs)
- `.github/workflows/deploy.yml` (repo root — add an e2e job)
- `asm-8086-sim/README.md` (document the new command)
- `asm-8086-sim/docs/plans/README.md` (status row only)

**Out of scope** (do NOT touch):

- Any file under `src/`. This plan adds verification; it fixes nothing. If a
  new e2e test fails, **that is the expected outcome** — see step 6. Do not
  "fix" the app to make a test pass here; those fixes belong to plans 001, 002,
  004, 005 and 007.
- Adding a **browser mode** to the vitest config. Playwright has its own config
  file. The only permitted `vite.config.ts` change is the `exclude` in step 6b.
- Any existing file under `tests/`. The vitest suite stays exactly as it is.
- `.github/workflows/deploy.yml`'s existing `build` and `deploy` jobs' steps.
  Add a new job; do not reorder or modify the existing ones.

## Git workflow

- Branch: `advisor/003-viewport-verification-baseline`
- Conventional commits, scoped. Use `test(e2e): …` or `ci: …` as fits the
  commit. Example of the repo's style: `test(hardware): align isBareAsm in
  hardwareScaffold with comment-stripped BARE_BLOCKER`.
- Do **not** push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add Playwright as a devDependency

```
npm install --save-dev --no-audit --no-fund @playwright/test
npx playwright install --with-deps chromium
```

Install **only Chromium**. Installing all three engines triples the download
and CI time for no benefit here — the assertions are layout-level, not
engine-compatibility-level.

**Verify**: `node -e "require('@playwright/test'); console.log('ok')"` → prints
`ok`.

**Verify**: `npx playwright --version` → prints a version.

If `npx playwright install --with-deps` fails because the environment cannot
install system packages, retry without `--with-deps`. If the browser download
itself fails (no network), that is a STOP condition.

### Step 2: Ignore Playwright's output directories

Add to `asm-8086-sim/.gitignore`:

```
# Playwright
/test-results/
/playwright-report/
/blob-report/
/.playwright/
```

**Verify**: `git check-ignore -v test-results` → prints a match from
`.gitignore`.

### Step 3: Write the Playwright config

Create `asm-8086-sim/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

// Layout verification, not browser-compatibility testing: one engine, two
// viewports. The vitest suite runs in jsdom, which computes no layout at all —
// getBoundingClientRect() returns zeros and media queries never match — so
// every responsive rule in this app was unverifiable before this config
// existed. These tests are the only thing that can see a layout regression.
export default defineConfig({
  testDir: './e2e',
  // The whole suite is a handful of page loads; serial keeps the output
  // readable and the webServer single.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // html is not optional: step 6 and the CI artifact upload both need
  // playwright-report/ to exist.
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['iPhone SE'],
        // Two explicit overrides, both necessary — verified against Playwright
        // 1.63: devices['iPhone SE'] is 320x568 and defaults to WEBKIT.
        // Only Chromium is installed, and 375x667 is the width these rules are
        // written against (the narrowest mainstream phone still in wide use).
        defaultBrowserType: 'chromium',
        viewport: { width: 375, height: 667 },
      },
    },
    {
      // A desktop pass so the mobile rules cannot be "fixed" by breaking the
      // layout the app was actually designed for.
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  // Tests run against the production build, not the dev server: the built page
  // carries the CSP meta tag injected by cspMeta() in vite.config.ts, and a CSP
  // violation that only appears in the build is exactly the kind of bug worth
  // catching here.
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

**Verify**: `npx tsc --noEmit -p tsconfig.e2e.json` — will fail until step 5
creates that tsconfig. Skip this verification until step 5 and note that you
did.

### Step 4: Write the three baseline assertions

Create `asm-8086-sim/e2e/mobile-layout.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

// The three rules the mobile plans depend on. Each is currently EXPECTED TO
// FAIL on the phone project — that is the point: they encode the target state
// so plans 001, 002, 004 and 005 have something to turn green, and so nothing
// later silently undoes them.

const ROUTES = ['/', '/lessons', '/hardware', '/reference'] as const

test.describe('no horizontal document overflow', () => {
  for (const route of ROUTES) {
    test(`${route} does not scroll sideways`, async ({ page }) => {
      await page.goto(route)
      // Let lazy route chunks and the CodeMirror editor settle.
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => {
        const el = document.documentElement
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
      })
      // 1px of slack for sub-pixel rounding on fractional device ratios.
      expect(
        overflow.scrollWidth,
        `${route}: document is ${overflow.scrollWidth}px wide in a ${overflow.clientWidth}px viewport`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1)
    })
  }
})

test.describe('touch targets', () => {
  test('every visible control is at least 44px on its smaller axis', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'touch-size rule applies to the phone project')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const tooSmall = await page.evaluate(() => {
      const out: { label: string; w: number; h: number }[] = []
      for (const el of document.querySelectorAll('button, a, select, [role="button"]')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue // not rendered
        if (Math.min(r.width, r.height) < 44) {
          out.push({
            label: (el.textContent ?? '').trim().slice(0, 30) || el.tagName,
            w: Math.round(r.width),
            h: Math.round(r.height),
          })
        }
      }
      return out
    })

    expect(tooSmall, `controls below 44px: ${JSON.stringify(tooSmall, null, 2)}`).toEqual([])
  })
})

test.describe('lessons route is content-first on a phone', () => {
  test('the lesson heading is reachable without scrolling past the whole nav', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'phone-only layout rule')
    await page.goto('/lessons')
    await page.waitForLoadState('networkidle')
    const h1 = page.getByRole('heading', { level: 1 }).first()
    await expect(h1).toBeVisible()
    const box = await h1.boundingBox()
    expect(box, 'lesson heading has no box').not.toBeNull()
    // One viewport height of slack: the heading may sit below a compact header,
    // but not below 24 stacked nav links.
    expect(
      box!.y,
      `lesson heading starts ${Math.round(box!.y)}px down the page`,
    ).toBeLessThan(667)
  })
})
```

**Verify**: the file exists and `npx tsc --noEmit -p tsconfig.e2e.json` passes
after step 5.

### Step 5: Give the e2e directory its own TypeScript project

`tsc -b` builds only the referenced projects, and `e2e/` is in none of them —
the same gap `tsconfig.test.json` was created to close for `tests/`. Read that
file first; its header comment explains the precedent you are following.

Create `asm-8086-sim/tsconfig.e2e.json`:

```jsonc
{
  /* e2e/ is in no other tsconfig, so `tsc -b` would never typecheck it and a
     Playwright spec could drift out of sync with the app. Its own project,
     rather than joining tsconfig.test.json, keeps Playwright's types out of
     the vitest suite — the two runners have incompatible global `expect`
     declarations and merging them breaks both. */
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.e2e.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["e2e", "playwright.config.ts"]
}
```

Then add the reference to `asm-8086-sim/tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.test.json" },
    { "path": "./tsconfig.e2e.json" }
  ]
}
```

**Verify**: `npm run typecheck` → exit 0 (it now builds four projects).

**Verify**: `npx tsc --noEmit -p tsconfig.e2e.json` → exit 0.

### Step 6: Add the scripts and run the suite — expect failures

Add to `package.json` scripts:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:report": "playwright show-report"
```

Run it:

```
npm run test:e2e
```

**This is expected to FAIL**, and the failures are the deliverable. Record in
your report, precisely:

- which routes overflow horizontally on the phone project, and by how many px
- the full list of controls under 44px, with their measured sizes
- how far down the page the lesson heading starts

Do **not** modify anything under `src/` to make these pass. That is explicitly
out of scope; those are plans 001, 002, 004 and 005.

If the **desktop** project fails any assertion, that *is* worth reporting
loudly — it means something is broken at the width the app was designed for,
which is a different and more urgent problem.

**Verify**: `npm run test:e2e` runs to completion and produces a report (it may
exit non-zero). `npx playwright show-report` opens it.

### Step 6b: Keep vitest out of the e2e directory

`npm test` is `vitest run`, and vitest's default include glob
(`**/*.{test,spec}.?(c|m)[jt]s?(x)`) matches `e2e/mobile-layout.spec.ts`.
Vitest loads it, Playwright's `test.describe()` detects it is not running under
the Playwright runner, and throws:

```
Error: Playwright Test did not expect test.describe() to be called here.
 Test Files  1 failed | 22 passed (23)
      Tests  611 passed (611)
```

The 611 real tests still pass, but `npm test` exits non-zero and the gate is
red. The two runners must not see each other's files.

In `vite.config.ts`, add an `exclude` to the existing `test` block. Import
`configDefaults` from `vitest/config` so the default exclusions (node_modules,
dist, …) are preserved rather than replaced:

```ts
import { configDefaults, defineConfig, type Plugin } from 'vitest/config'
```

```ts
  test: {
    // vitest's default glob matches e2e/*.spec.ts, where Playwright's
    // test.describe() throws because it is not running under the Playwright
    // runner. The two runners share a file-naming convention and must not
    // share a search path. Spreading configDefaults.exclude keeps
    // node_modules/dist/etc. excluded rather than replacing the defaults.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      include: ['src'],
      exclude: ['src/data/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text', 'html'],
    },
  },
```

This is the **only** change permitted in `vite.config.ts`. Do not touch `base`,
`plugins`, or the `cspMeta()` function.

**Verify**: `npm test` → exit 0, `Test Files 22 passed (22)`, 611 tests pass,
and no mention of `e2e/`.

**Verify**: `npm run test:e2e` still discovers and runs the e2e specs (the
exclude affects vitest only).

### Step 7: Add a CI job

In `.github/workflows/deploy.yml` (repo root), add a new job alongside the
existing `build` job. Do not modify `build` or `deploy`.

```yaml
  e2e:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: asm-8086-sim
    steps:
      # pinned by commit SHA (supply-chain hardening); tags in comments
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: asm-8086-sim/package-lock.json

      - name: Install
        run: npm ci

      - name: Install Playwright browser
        run: npx playwright install --with-deps chromium

      - name: Layout tests
        run: npm run test:e2e

      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: asm-8086-sim/playwright-report/
          retention-days: 7
```

Two things to get right:

1. **Pin the new action by SHA.** The SHA above for `upload-artifact` is
   illustrative — look up the current one for the version you want and put the
   real SHA in, with the version tag in a trailing comment, matching the three
   existing `uses:` lines in this file.
2. **Do not add `e2e` to the `deploy` job's `needs:`** yet. The tests are
   expected to fail until plans 001/002/004/005 land, and gating deployment on
   them would block the site. Leave it as an independent signal. A note in the
   plan index records this as a follow-up.

**Verify**: `python3 -c "import yaml,sys; yaml.safe_load(open('../.github/workflows/deploy.yml')); print('valid')"`
→ prints `valid`. (If PyYAML is unavailable, use any YAML validator, or
`gh workflow view` if authenticated. State which you used.)

**Verify**: `git diff ../.github/workflows/deploy.yml` shows only an added job
— no changes inside `build` or `deploy`.

### Step 8: Document the command

In `asm-8086-sim/README.md`, add to the Test section:

```
    npm run test:e2e            # Playwright layout checks at 375px and 1440px
    npm run test:e2e:report     # open the last HTML report
```

And add one short paragraph under it explaining that these are layout
assertions that jsdom cannot make, and that they run against the production
build via `npm run preview`.

Also add a line to `AGENTS.md` (repo root) in the Commands table, matching its
existing format:

| E2E layout tests | `npm run test:e2e` |

**Verify**: `grep -c "test:e2e" README.md ../AGENTS.md` → at least 1 in each.

### Step 9: Run the full gate

```
npm run lint && npm run typecheck && npm test && npm run build
```

**Verify**: all four exit 0; `npm test` count ≥ 611, no failures. (The e2e
suite is deliberately not part of this gate — it is expected red.)

## Test plan

The tests *are* the deliverable here, so the "test plan" is really a
self-check that the harness itself is trustworthy:

1. **Prove the overflow assertion can fail.** Temporarily add
   `<div style="width: 3000px">x</div>` to a route, run the phone project,
   confirm the test fails with a sensible message, then revert. A test that
   cannot fail is worthless. Confirm you reverted:
   `git diff -- src/` must be empty.

2. **Prove the touch-target assertion can pass.** Temporarily add
   `button { min-height: 44px; min-width: 44px }` to `global.css`, re-run,
   confirm the touch test goes green, then revert. This proves the selector and
   measurement logic work and that plan 004 has a reachable target. Confirm you
   reverted: `git diff -- src/` must be empty.

3. **Desktop project is green.** All three describes must pass at 1440×900
   today. If they do not, report it prominently.

Record the outcome of all three in your report.

## Done criteria

ALL must hold:

- [ ] `npm run lint` exits 0
- [ ] `npm run typecheck` exits 0 and builds four projects
- [ ] `npm test` exits 0, count ≥ 611, no failures
- [ ] `npm run build` exits 0
- [ ] `npm run test:e2e` runs to completion and produces a report
- [ ] `git diff -- src/` is **empty** (this plan changes no application code)
- [ ] `git diff -- tests/` is **empty** (the vitest suite is untouched)
- [ ] `@playwright/test` appears in `devDependencies`, not `dependencies`
- [ ] `git check-ignore test-results` matches
- [ ] The new CI job exists and the `build`/`deploy` jobs are byte-identical to
      before (`git diff` shows additions only)
- [ ] `docs/plans/README.md` status row for plan 003 updated to DONE
- [ ] Your report lists: the failing routes with px overflow, the
      under-44px controls with sizes, the lesson-heading offset, the three
      self-check outcomes, and an explicit note on the dependency tradeoff

## STOP conditions

Stop and report back (do not improvise) if:

- The Playwright browser download fails (no network, or a sandbox that forbids
  it). Note `--with-deps` needs sudo and will fail in most sandboxes — retrying
  without it is expected and fine; it yields chrome-headless-shell, which is
  sufficient for these assertions. Report it; do not fall back to a headless-shell hack or to asserting
  layout in jsdom — jsdom cannot do it and a fake pass is worse than no test.
- `npm run preview` will not serve the build, so `webServer` never comes up.
  Report the error rather than switching to the dev server: the CSP that only
  exists in the build is part of what is being verified.
- The **desktop** project fails an assertion. That is a pre-existing bug at the
  app's design width and is out of this plan's scope — report it and stop.
- `npm test` (vitest) starts failing after adding Playwright. The two runners
  should not interact; if they do, the likely cause is type-global collision,
  and the fix is the separate tsconfig in step 5. If that does not resolve it,
  stop.
- The operator has previously said they do not want new dependencies. Surface
  the tradeoff and wait.

## Maintenance notes

For whoever owns this next:

- **These tests are expected red until plans 001/002/004/005 land.** The index
  records that. Do not delete or skip them to get a green board — turning them
  green is the point of the other plans.
- **`deploy` does not depend on `e2e`.** Once the mobile plans land and the
  suite is green, add `e2e` to the `deploy` job's `needs:` so a layout
  regression blocks the site. That is the intended end state and is recorded as
  a follow-up in the index.
- **The 44px threshold is a guideline, not a spec**, and the assertion is
  deliberately strict (`min(width, height)`). A control that is 200×30 fails.
  If a specific control is genuinely fine at 30px tall, the honest move is an
  explicit allow-list in the test with a comment saying why — not lowering the
  global threshold.
- **`networkidle` is used to wait for lazy chunks.** The app code-splits
  `CodeEditor` (~404 kB) and every lesson; if a future change makes something
  load later still, these tests may flake. Prefer waiting on a specific
  element over increasing timeouts.
- A reviewer should check that `src/` and `tests/` are absent from the diff.
  The temptation to "just fix the one small thing" while adding the test is
  exactly what this plan's scope rules exist to prevent.

## Follow-up explicitly deferred

- Visual regression (screenshot diffing) — a bigger commitment with snapshot
  churn, and not needed to verify the rules the other plans target.
- Testing the hardware route's board layout in depth — plan 007 restructures it
  and should bring its own assertions.
- Adding `e2e` to `deploy`'s `needs:`, once the suite is green.
