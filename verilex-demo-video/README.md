# Verilex demo video

A short Remotion composition that walks through the live app (landing →
sign up → situation search → results → source → grounded explanation)
using real screenshots captured from a running `verilex-client-new` +
`verilex-backend` (mock provider) instance — no fabricated UI.

## Regenerating the screenshots

With the backend (`LEGAL_PROVIDER=mock`) and frontend dev servers running
locally, run `node scripts/capture-screenshots.js` (adjust the hardcoded
Playwright import path and `BASE` URL for your environment). This
overwrites `public/screens/*.png`.

## Rendering

```
npx remotion render src/index.jsx DemoVideo out/verilex-demo.mp4 --codec=h264
```

If the sandboxed/bundled Chromium can't be auto-downloaded, pass
`--browser-executable=<path to a local Chromium/Chromium-headless-shell>`
(see `remotion.config.mjs`).
