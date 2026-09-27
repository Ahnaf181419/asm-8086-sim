import { expect, test } from '@playwright/test'

// The three rules the mobile plans depend on. Each is currently EXPECTED TO
// FAIL on the phone project — that is the point: they encode the target state
// so the layout plans have something to turn green, and so nothing later
// silently undoes them.

const ROUTES = ['/', '/lessons', '/hardware', '/reference'] as const

test.describe('no horizontal document overflow', () => {
  for (const route of ROUTES) {
    test(`${route} does not scroll sideways`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => {
        const el = document.documentElement
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
      })
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
        if (r.width === 0 || r.height === 0) continue
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
    expect(
      box!.y,
      `lesson heading starts ${Math.round(box!.y)}px down the page`,
    ).toBeLessThan(667)
  })
})

test.describe('hardware lab view model', () => {
  test('opens on a single usable pane on a phone', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'phone-only layout rule')
    await page.goto('/hardware')
    await page.waitForLoadState('networkidle')
    const m = await page.evaluate(() => {
      const split = document.querySelector('.hw-split-layout')!
      const pane = document.querySelector('.hw-editor-pane')!.getBoundingClientRect()
      return { sw: split.scrollWidth, cw: split.clientWidth, paneW: pane.width, vw: window.innerWidth }
    })
    expect(m.sw, 'split layout scrolls horizontally').toBeLessThanOrEqual(m.cw + 1)
    expect(m.paneW, 'editor pane wider than viewport').toBeLessThanOrEqual(m.vw)
  })

  test('the Split control is withdrawn on a phone and offered on desktop', async ({ page }, testInfo) => {
    await page.goto('/hardware')
    await page.waitForLoadState('networkidle')
    const split = page.locator('[data-view="split"]')
    if (testInfo.project.name === 'phone') await expect(split).toBeHidden()
    else await expect(split).toBeVisible()
  })
})

test.describe('hardware lab disclosures do not widen the page', () => {
  // The overflow describe above measures /hardware in its DEFAULT state, where
  // the Studio drawer is closed (studioOpen starts false) and the I/O port map
  // is a collapsed <details>. Neither table is rendered, so neither was ever
  // measured — which is how an unconstrained .hw-port-table survived the whole
  // mobile series. Open both, then measure.
  test('opening the Studio drawer and the port map keeps the page at viewport width', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'phone-only layout rule')
    await page.goto('/hardware')
    await page.waitForLoadState('networkidle')

    await page.locator('[data-view="studio"]').click()
    await expect(page.locator('.hw-studio-drawer.open')).toBeVisible()

    const portMap = page.locator('details.hw-port-map-panel')
    await portMap.locator('summary').click()
    await expect(page.locator('table.hw-port-table')).toBeVisible()

    const overflow = await page.evaluate(() => {
      const el = document.documentElement
      return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
    })
    expect(
      overflow.scrollWidth,
      `with Studio and the port map open the document is ${overflow.scrollWidth}px wide in a ${overflow.clientWidth}px viewport`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1)
  })
})

test.describe('lessons nav is a sidebar on desktop and a disclosure on a phone', () => {
  // This is the assertion that was missing. The unit test counted `.lessons-nav a`
  // nodes, and a CLOSED <details> keeps its children in the DOM — so the desktop
  // sidebar could vanish with every test still green. Visibility is the contract,
  // not DOM presence.
  test('the lesson list is visible without interaction on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop-only layout rule')
    await page.goto('/lessons')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.lessons-nav a').first()).toBeVisible()
    await expect(page.locator('.lessons-nav a').nth(5)).toBeVisible()
    // The summary is chrome for the collapsed form and must not show here.
    await expect(page.locator('.lessons-nav-summary')).toBeHidden()
  })

  test('the list starts collapsed on a phone and opens when tapped', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'phone-only layout rule')
    await page.goto('/lessons')
    await page.waitForLoadState('networkidle')
    const summary = page.locator('.lessons-nav-summary')
    await expect(summary).toBeVisible()
    await expect(page.locator('.lessons-nav a').first()).toBeHidden()
    await summary.click()
    await expect(page.locator('.lessons-nav a').first()).toBeVisible()
  })
})

test.describe('every theme meets AA on secondary text', () => {
  const THEMES = ['green', 'amber', 'cyan', 'slate'] as const
  // --text-faint carries register sign values, the shortcut hint and the
  // console empty state — not decoration. The green theme was contrast-tuned
  // and the other three were not; three of four measured below AA before this
  // test existed.
  for (const theme of THEMES) {
    test(`${theme} secondary text clears 4.5:1`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'palette is viewport-independent')
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
      await page.waitForTimeout(150)
      const result = await page.evaluate(() => {
        const lum = (c: string) => {
          const m = c.match(/\d+/g)!.map(Number)
          const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
          return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2])
        }
        const ratio = (a: string, b: string) => {
          const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
          return +((x + 0.05) / (y + 0.05)).toFixed(2)
        }
        const bgOf = (el: HTMLElement) => {
          let e: HTMLElement | null = el
          while (e) {
            const b = getComputedStyle(e).backgroundColor
            if (b && !b.includes('rgba(0, 0, 0, 0)')) return b
            e = e.parentElement
          }
          return 'rgb(0, 0, 0)'
        }
        const out: { sel: string; ratio: number }[] = []
        for (const sel of ['.reg-signed', '.statusbar .hint', '.console-empty', '.topbar .meta', '.mem-ascii']) {
          const el = document.querySelector(sel) as HTMLElement | null
          if (!el) continue
          out.push({ sel, ratio: ratio(getComputedStyle(el).color, bgOf(el)) })
        }
        return { measured: out.length, low: out.filter((r) => r.ratio < 4.5) }
      })
      // Guard the guard: if the selectors stop matching, the filter above goes
      // empty and the test would pass having measured nothing.
      console.log(`measured ${result.measured}`)
      expect(result.measured, 'no secondary-text selectors matched').toBeGreaterThanOrEqual(4)
      expect(result.low, `below AA: ${JSON.stringify(result.low)}`).toEqual([])
    })
  }
})

test.describe('lesson measure', () => {
  // Monospace at a 900px column ran ~100 characters per line. The face is a
  // deliberate keep, so the measure is what is capped.
  test('body paragraphs stay under 85 characters per line on desktop and tables do not clip', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop-only layout rule')
    await page.goto('/lessons/machine-basics')
    await page.waitForLoadState('networkidle')
    const m = await page.evaluate(() => {
      const p = document.querySelector('.lessons-content p') as HTMLElement
      const c = document.createElement('canvas').getContext('2d')!
      const cs = getComputedStyle(p)
      c.font = `${cs.fontSize} ${cs.fontFamily}`
      const adv = c.measureText('0'.repeat(100)).width / 100
      return { cpl: p.getBoundingClientRect().width / adv, w: document.documentElement.scrollWidth, vw: window.innerWidth }
    })
    expect(m.cpl).toBeLessThanOrEqual(85)
    expect(m.w).toBeLessThanOrEqual(m.vw)
  })
})
