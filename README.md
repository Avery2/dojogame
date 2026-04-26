# Dojo Fighter

A sumi-e ink 2D fighting game. Browser-only, GitHub Pages deploy, no backend.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build to dist/
npm run preview    # serve the built bundle
```

## Controls (defaults — fully remappable in Configure)

| Action  | P1   | P2     |
|---------|------|--------|
| Move    | WASD | Arrows |
| Light   | J    | 1      |
| Heavy   | K    | 2      |
| Special | L    | 3      |
| Throw   | J+K  | 1+2    |
| Block   | hold back away from opponent |
| Pause   | Esc  |        |
| Hitboxes (debug) | F2 |   |

Crouch with `down`. Jump with `up`. Cancels chain `light → heavy → special`. Combos
scale damage. Counter-hit fires when you strike during opponent startup. Throws
beat blocks; tech with simultaneous Light+Heavy.

## Phase status

- **V1** — Local 2P + crouch / high-low / overhead / cancels / throws + tech /
  aerials / counter-hit / knockdown + wakeup / damage scaling / pause menu /
  full Config UI / touch overlay (auto-enabled on coarse-pointer devices).
- **V2** — AI + WebRTC remote (stubbed).
- **V3** — second fighter `oni` (data scaffolded; fighter-select not yet).

## Configure

Open from Title or Pause. Three tabs:
- **Keybinds** — click a slot, press a key.
- **Moves** — pick a move, edit any field. Live preview canvas at the bottom.
- **Rules** — round time, health, gravity, scaling table, etc.

All settings persist to `localStorage` and can be exported/imported as JSON.

## Deploy

The `.github/workflows/deploy.yml` workflow builds on every push to `main`
and publishes `dist/` to GitHub Pages. Enable it once in the repo settings:

1. **Settings → Pages → Source = "GitHub Actions"**.
2. Push to `main`. The workflow builds and deploys automatically.
3. Site will live at `https://<user>.github.io/<repo>/`.
