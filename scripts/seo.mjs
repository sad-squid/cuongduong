import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const root = join(dirname(new URL(import.meta.url).pathname), '..')
const dist = join(root, 'dist')
const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const seo = read('src/content/seo.json')
const names = { en: 'Cuong Duong', ja: 'Cuong Duong（コン）', vi: 'Cuong Duong (Dương Trí Cường)' }
const links = { github: 'https://github.com/sad-squid/', linkedin: 'https://linkedin.com/in/cuongduong-dev/' }
const langs = ['en', 'ja', 'vi']
const pages = ['home', 'about', 'work']
const ogLocale = { en: 'en_US', ja: 'ja_JP', vi: 'vi_VN' }
const template = readFileSync(join(dist, 'index.html'), 'utf8')

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const pathFor = (lang, page) => {
  const base = page === 'home' ? '/' : `/${page}`
  return lang === 'en' ? base : `/${lang}${base === '/' ? '' : base}`
}
const urlFor = (lang, page) => `${seo.site}${pathFor(lang, page) === '/' ? '/' : pathFor(lang, page)}`
const fileFor = (lang, page) => (pathFor(lang, page) === '/' ? 'index.html' : `${pathFor(lang, page).slice(1)}.html`)

const person = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${seo.site}/#person`,
  name: 'Cuong Duong',
  alternateName: ['Cuong Tri Duong', 'Dương Trí Cường', 'コン'],
  jobTitle: 'Software Engineer',
  worksFor: { '@type': 'Organization', name: 'SmartNews' },
  address: { '@type': 'PostalAddress', addressLocality: 'Tokyo', addressCountry: 'JP' },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of Minnesota' },
  knowsLanguage: ['en', 'vi', 'ja'],
  url: `${seo.site}/`,
  image: `${seo.site}${seo.image}`,
  sameAs: [links.github, links.linkedin],
}

const { '@context': context, ...personNode } = person

const website = {
  '@type': 'WebSite',
  '@id': `${seo.site}/#website`,
  url: `${seo.site}/`,
  name: 'Cuong Duong',
  alternateName: ['cuongduong.dev', 'Dương Trí Cường'],
  inLanguage: langs,
  publisher: { '@id': person['@id'] },
}

const graphFor = (lang, page, title) => ({
  '@context': context,
  '@graph': [
    personNode,
    ...(page === 'home' ? [website] : []),
    ...(page === 'about'
      ? [
          {
            '@type': 'ProfilePage',
            '@id': `${urlFor(lang, page)}#profile`,
            url: urlFor(lang, page),
            name: title,
            inLanguage: lang,
            isPartOf: { '@id': website['@id'] },
            mainEntity: { '@id': person['@id'] },
          },
        ]
      : []),
  ],
})

const stripHead = (html) =>
  html
    .replace(/\s*<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta name="description"[^>]*>/g, '')
    .replace(/\s*<meta property="og:[^>]*>/g, '')
    .replace(/\s*<meta name="twitter:[^>]*>/g, '')

const render = ({ lang, title, description, url, alternates, body, robots, jsonLd }) => {
  const head = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    robots ? `<meta name="robots" content="${robots}" />` : '',
    url ? `<link rel="canonical" href="${url}" />` : '',
    ...(alternates ?? []).map(([hreflang, href]) => `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Cuong Duong" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    url ? `<meta property="og:url" content="${url}" />` : '',
    `<meta property="og:locale" content="${ogLocale[lang]}" />`,
    `<meta property="og:image" content="${seo.site}${seo.image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(title)}" />`,
    `<meta name="twitter:description" content="${escape(description)}" />`,
    `<meta name="twitter:image" content="${seo.site}${seo.image}" />`,
    jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ')
  return stripHead(template)
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/\s*<\/head>/, `\n    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body ?? ''}</div>`)
}

const write = (file, html) => {
  mkdirSync(dirname(join(dist, file)), { recursive: true })
  writeFileSync(join(dist, file), html)
}

for (const lang of langs) {
  const copy = read(`src/i18n/locales/${lang}.json`)
  const nav = pages.map((page) => `<a href="${pathFor(lang, page)}">${escape(page === 'home' ? copy.footer.home : copy[page].title)}</a>`).join(' ')
  for (const page of pages) {
    const { title, description } = seo.pages[lang][page]
    const heading = page === 'home' ? names[lang] : `${copy[page].title} · ${names[lang]}`
    const alternates = [...langs.map((l) => [l, urlFor(l, page)]), ['x-default', urlFor('en', page)]]
    const body = `<div class="sr-only"><h1>${escape(heading)}</h1><p>${escape(description)}</p><nav>${nav}</nav></div>`
    write(fileFor(lang, page), render({ lang, title, description, url: urlFor(lang, page), alternates, body, jsonLd: graphFor(lang, page, title) }))
  }
}

for (const lang of langs) {
  const { title, description } = read(`src/i18n/locales/${lang}.json`).play
  const path = lang === 'en' ? '/play' : `/${lang}/play`
  write(`${path.slice(1)}.html`, render({ lang, title: `${title} · ${names[lang]}`, description, url: `${seo.site}${path}`, robots: 'noindex' }))
}

write('404.html', render({ lang: 'en', title: 'Not found · Cuong Duong', description: seo.pages.en.home.description, robots: 'noindex' }))

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...langs.flatMap((lang) =>
    pages.map((page) =>
      [
        '  <url>',
        `    <loc>${urlFor(lang, page)}</loc>`,
        ...langs.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urlFor(l, page)}" />`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor('en', page)}" />`,
        '  </url>',
      ].join('\n'),
    ),
  ),
  '</urlset>',
  '',
].join('\n')
write('sitemap.xml', sitemap)
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${seo.site}/sitemap.xml\n`)

console.log(`seo: ${langs.length * pages.length} pages, 404.html, sitemap.xml, robots.txt`)
