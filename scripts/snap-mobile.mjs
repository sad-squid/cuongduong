import { chromium } from 'playwright'

const URL = 'http://localhost:5173'
const OUT = '/tmp/snap'

const breakpoints = [
  { w: 375, h: 812, tag: '375-iphone' },
  { w: 768, h: 1024, tag: '768-ipad' },
  { w: 1440, h: 900, tag: '1440-desktop' },
]

const routes = ['/', '/about', '/work']

const browser = await chromium.launch()
for (const { w, h, tag } of breakpoints) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  for (const route of routes) {
    await page.goto(URL + route, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    const label = route === '/' ? 'home' : route.slice(1)
    await page.screenshot({ path: `${OUT}-${label}-${tag}.png`, fullPage: true })
    console.log(`saved ${label} @ ${tag}`)
  }
  await context.close()
}
await browser.close()
