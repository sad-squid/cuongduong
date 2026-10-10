# cuongduong.dev

Personal site for Cuong Duong: software engineer in Tokyo.

A single CRT screen. The name is generated as a point field that denoises from the background lattice, reacts to the cursor, and tears like a lost signal; clicks send a pulse through the lattice and scramble the tagline words they reach. Everything runs on two canvases with typed-array physics and only animates while something is moving. Reduced motion and low frame rates are respected.

Built with React 19, Vite, TypeScript, TanStack Router and i18next (English, Japanese, Vietnamese). Deployed on Vercel.

```
pnpm install
pnpm dev      # local dev
pnpm test     # engine tests (Vitest)
pnpm build    # production build
```

- `src/crt/` animation engine: `NameField`, `Lattice`, `CrtController`, and the tagline and log stores
- `src/pages/` Home, About, Work, Notes (unlinked), NotFound ("no signal")
- `src/components/` footer doors, language switch, ⌘K command palette
