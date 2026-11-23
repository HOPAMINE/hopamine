# Zima HQ  ·  `hq/` in HOPAMINE/hopamine

The team's SOP + roadmap for the Zima Network, built from modules so anyone can add, remove or update a section without touching code.

- **Project Director:** Mawuli · **Dev leads:** Vishav, Jonathan
- **Product:** https://zima.hopamine.xyz · repo `HOPAMINE/hopamine`
- **Design:** Hopamine visual language (fonts go in `assets/fonts/`)

## Run it locally (live reload)

```bash
npm run dev            # → http://localhost:4321
# no Node? python3 -m http.server 4321
```

Edit anything in `modules/` and save. The page re-renders within ~2 seconds. A pink **Local · live reload** badge means you're looking at your machine.

> Double-clicking `index.html` won't work: browsers block loading the module files from disk. Always use the local server.

## How it's built

```
index.html            shell (never needs editing)
assets/hq.css         Hopamine design tokens + components
assets/hq.js          renderer: manifest → modules → blocks; live reload on localhost
modules/manifest.json order of sections + on/off switch per module + hero text
modules/NN-name.json  one section each
modules/_template.json copy this to start a new section
scripts/check.mjs     validator (runs on every Vercel build)
```

### Add a section
1. `cp modules/_template.json modules/13-whatever.json`
2. Edit it (id, stamp, title, blocks).
3. Add `{ "file": "13-whatever.json", "on": true }` to `modules/manifest.json` where you want it to appear.

### Remove or hide a section
Set `"on": false` in the manifest. The file stays, so you can switch it back on.

### Block types
`text, quote, cards, panels, tracks, board, team, table, steps, ladder, ring, checklist, code, dosdonts, swatches`. Copy a block from any module to see its shape. Text supports `**bold**`, `*italic*`, `` `code` `` and `[links](https://…)`.

Grounds: `cream | blue | ink | lime | cobalt`.

### Check before you push
```bash
npm run check
```

## Pipeline

| Environment | Where | When it updates |
|---|---|---|
| Local | `localhost:4321` | every save |
| Preview | unique Vercel URL per branch | every push to a non-main branch |
| Production | the pinned HQ link | every merge to `main` |

Vercel project: **zima-hq** (team *hopamine*), framework *Other*, no install, build = `node scripts/check.mjs` (a broken module fails the deploy instead of breaking the page), output `.`.
Protection: Vercel Authentication — team members only. To show someone outside the team, open the deployment in Vercel → **Share** → copy the temporary link.

### Updating from your phone
Open HOPAMINE/hopamine in the Claude app → Code tab (HQ is in `hq/`). Ask for the change in plain words ("move S1·3 to done, Sprint 1 progress 40%"). Claude edits the module, runs the check, pushes a branch → Vercel gives you a preview link → merge the PR when it looks right.

### Where it lives
- Repo: **HOPAMINE/hopamine**, folder `hq/` (the Next.js product build ignores it).
- Vercel project **zima-hq** → Root Directory `hq`; the ignored build step skips deploys when `hq/` didn't change.
- From the repo root: `cd hq && npm run dev`.
