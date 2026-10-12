# vetcongweb

WebGL reimplementation of the 2003 FPS **Vietcong** (Pterodon / Illusion Softworks). Abandonedware fan project focused on multiplayer (singleplayer first).

**Not for resale.** Do not distribute original game assets. Users must own a legitimate copy of the game. This is an engine/recompile effort referencing public specs.

## References
- [OpenVietcong/vc-spec](https://github.com/OpenVietcong/vc-spec) — file format documentation (BES models, CBF archives, etc.)
- [OpenVietcong/libvc](https://github.com/OpenVietcong/libvc) — C library for documented formats
- [OpenVietcong/blender-plugin-vietcong](https://github.com/OpenVietcong/blender-plugin-vietcong) — BES import/export
- Other community tools: vietcong-unpacker, VC_Scripter

## Tech
- Three.js (WebGL)
- Pointer lock FPS controls
- Basic scene, movement, simple shooting stub
- Future: asset loaders for BES/CBF, networking (WebRTC/WebSocket), multiplayer sync

## Run
Open `index.html` in a modern browser (or serve via `npx serve` / any static server). Click canvas to capture mouse.

## Status
Prototype only. Singleplayer movement/shooting skeleton. Multiplayer and asset pipeline planned.

MIT License. Respect original IP; this is non-commercial fan work on abandoned title.
