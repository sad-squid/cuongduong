import { chromium } from 'playwright'
import { writeFileSync, renameSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'capture-output')
mkdirSync(OUT_DIR, { recursive: true })

const URL = process.env.CAPTURE_URL ?? 'http://localhost:5173/about?capture=1'
const DURATION_MS = Number(process.env.CAPTURE_MS ?? 5500)
const SIZE = 900

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: SIZE, height: SIZE },
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT_DIR, size: { width: SIZE, height: SIZE } },
})
const recStartWall = performance.now()

const page = await context.newPage()

let captureStartWall = 0
const events = []
await context.exposeBinding('__onGlitch__', () => {
  if (captureStartWall === 0) return
  events.push(performance.now() - captureStartWall)
})

await page.addInitScript(() => {
  // Bridge: window.__onGlitch__ is the binding, but GlitchText calls window.__onGlitch__(t).
  // The binding signature is (source, ...args), so it already works.
})

await page.goto(URL, { waitUntil: 'networkidle' })

// CSS-only framing: keep the whole React tree but tag the h1's ancestor chain,
// hide everything else, and fullscreen-center the chain.
await page.evaluate(() => {
  const h1 = document.querySelector('h1')
  if (!h1) return
  h1.setAttribute('data-cap', 'h1')
  let el = h1.parentElement
  while (el && el !== document.body) {
    el.setAttribute('data-cap', 'chain')
    el = el.parentElement
  }
  const style = document.createElement('style')
  style.textContent = `
    html, body, #root { margin:0 !important; padding:0 !important; height:100vh !important; width:100vw !important; overflow:hidden !important; }
    body *:not([data-cap]):not([data-cap="h1"] *) { display: none !important; }
    [data-cap="chain"] {
      all: unset;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100vw !important;
      height: 100vh !important;
      position: static !important;
      box-sizing: border-box !important;
    }
    [data-cap="h1"] {
      font-size: 14vw !important;
      line-height: 1 !important;
      margin: 0 !important;
      padding: 0 2vw !important;
      white-space: nowrap !important;
      text-align: center !important;
      font-family: 'Space Grotesk', sans-serif !important;
      font-weight: 700 !important;
    }
    [data-cap="h1"] * { font-family: inherit !important; }
  `
  document.head.appendChild(style)
})

// Small settle
await page.waitForTimeout(500)

// Zero the capture clock and start events
captureStartWall = performance.now()
const trimOffsetSec = (captureStartWall - recStartWall) / 1000

// Trigger a hover to start cycling languages
await page.hover('h1')

await page.waitForTimeout(DURATION_MS)

const rel = events.filter((t) => t >= 0 && t <= DURATION_MS)

await context.close()
await browser.close()

// Find the produced webm and rename
const files = readdirSync(OUT_DIR).filter((f) => f.endsWith('.webm'))
files.sort()
const src = files.at(-1)
const webmPath = join(OUT_DIR, 'glitch.webm')
if (src && src !== 'glitch.webm') renameSync(join(OUT_DIR, src), webmPath)

writeFileSync(
  join(OUT_DIR, 'events.json'),
  JSON.stringify({ events: rel, trimOffsetSec, durationMs: DURATION_MS }, null, 2),
)

console.log(
  `Captured ${rel.length} glitch events -> ${webmPath} (trim offset ${trimOffsetSec.toFixed(2)}s)`,
)
