import { chromium } from 'playwright'

const browser = await chromium.launch()
for (const w of [320, 375, 414]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)

  // Click the brand to open search
  await page.locator('header button').first().click()
  await page.waitForTimeout(400)

  const info = await page.evaluate(() => {
    const html = document.documentElement
    return {
      scrollWidth: html.scrollWidth,
      clientWidth: html.clientWidth,
      horizScroll: html.scrollWidth > html.clientWidth,
    }
  })
  await page.screenshot({ path: `/tmp/search-${w}.png`, fullPage: false })
  console.log(`=== ${w}px search open ===`, JSON.stringify(info))
  await ctx.close()
}
await browser.close()
