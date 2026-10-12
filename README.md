# vetcongweb

Procedural Vietcong-style FPS engine with multiplayer (Three.js / WebGL). Fully generated content.

**Not for resale.** Non-commercial fan project. No original game assets.

## Features
- Procedural jungle, cover, enemies with AI
- Movement, jump, reload, damage, score
- WebSocket multiplayer (player position sync)
- Optimized instancing and particle pool

## Singleplayer
Open `index.html` in a browser or `npx serve`.

## Multiplayer
1. `npm install`
2. `npm run server` (starts ws://localhost:8080)
3. Open `index.html` in multiple tabs/windows
4. Change `SERVER` in `js/main.js` for remote host

## Controls
WASD | Space jump | R reload | Mouse look | Click shoot | Esc unlock

## Status
Playable prototype. Multiplayer is basic position sync. Extend as needed.

MIT License.
