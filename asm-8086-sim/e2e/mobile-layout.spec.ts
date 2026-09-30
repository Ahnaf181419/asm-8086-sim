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
