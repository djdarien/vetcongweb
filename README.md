# vetcongweb

Procedural Vietcong-style FPS. Mobile-friendly with settings menu. Fully generated content.

**Not for resale.** Non-commercial fan project.

## Play online (GitHub Pages)

Once Pages is enabled, open:

**https://djdarien.github.io/vetcongweb/**

Enable Pages (one-time):
1. Repo Settings → Pages
2. Source: GitHub Actions
3. Push to main triggers deploy

Singleplayer works on Pages. Multiplayer needs a self-hosted server.

## Local setup
```bash
git clone https://github.com/djdarien/vetcongweb.git
cd vetcongweb
npm install
npm start
```
Open http://localhost:3000

## Settings
Click **MENU** (or Esc) for:
- Graphics Quality (Low / Medium / High)
- Shadows on/off
- Fog on/off
- Look Sensitivity (mobile touch look)

Settings saved in the browser.

## Controls
**Desktop:** WASD, Space, R, Mouse, Click, Esc for menu
**Mobile:** Left joystick, right-side drag look, FIRE / JUMP / R. Menu for settings.

## Maps
- Stream — jungle river
- Halong Port — docks and warehouses

## Multiplayer
```bash
npm run server
```
Then open the page in multiple clients (local only).

## Tests
```bash
npm test
```

MIT License.
