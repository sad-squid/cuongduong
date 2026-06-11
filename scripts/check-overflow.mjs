import { chromium } from 'playwright'

const browser = await chromium.launch()
const motifs = ['layout.motifCake', 'layout.motifHello', 'layout.motifPokemon', 'layout.motifMinecraft', 'layout.motifValorant', 'layout.motifLol']

for (const w of [320, 375, 414]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  const info = await page.evaluate(() => {
    const html = document.documentElement
    const header = document.querySelector('header')
    const headerInner = header ? header.querySelector('div > div') : null
    const scrollWidth = html.scrollWidth
    const clientWidth = html.clientWidth
    const headerChildren = headerInner ? [...headerInner.children].map((el) => {
      const r = el.getBoundingClientRect()
      return { text: el.textContent?.slice(0, 50), w: r.width, right: r.right }
    }) : []
    return { scrollWidth, clientWidth, horizScroll: scrollWidth > clientWidth, headerChildren }
  })
  console.log(`=== ${w}px ===`)
  console.log(JSON.stringify(info, null, 2))

  await ctx.close()
}
await browser.close()
