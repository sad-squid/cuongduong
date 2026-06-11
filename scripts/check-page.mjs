import { chromium } from 'playwright'

const browser = await chromium.launch()
for (const w of [375, 768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  const info = await page.evaluate(() => {
    const main = document.querySelector('main')
    const grid = main.querySelector('div > div')
    const cells = [...main.querySelectorAll('.now-bullet, [class*="tagline"]')]
    const allBoxes = [...main.querySelectorAll('main > div > div > div')]
    return {
      bodyHeight: document.body.scrollHeight,
      mainHeight: main.scrollHeight,
      gridChildren: grid ? grid.children.length : 0,
      childInfo: grid ? [...grid.children].map((el, i) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return { i, tag: el.tagName, w: r.width, h: r.height, top: r.top, left: r.left, display: cs.display, vis: cs.visibility }
      }) : [],
    }
  })
  console.log(`=== ${w}px ===`)
  console.log(JSON.stringify(info, null, 2))
  await ctx.close()
}
await browser.close()
