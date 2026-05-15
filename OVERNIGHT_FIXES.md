# Overnight Fixes — Phaser Mobile / Tablet Pass

Branch: `claude/fix-phaser-mobile-critical-qqxhv`

Scope: targeted fixes only — no refactors, no mechanic changes, no Phaser
version bump.

**Two passes:**
- **Pass 1** (initial): mobile / tablet fixes for the modular `index.html`
  tree (`index.html`, `css/style.css`, `js/`).
- **Pass 2** (later): same class of fixes against the live game at
  `gamedemo69.html` — that's the build deployed at ernestaines.com, so
  it was the one actually broken on iPhone/iPad. Pass 2 also catches a
  pre-existing `resizeGameToViewport` crash and re-enables intro-video
  audio. See "Pass 2" section below.

---

## Pass 2 — gamedemo69.html (the live game)

User report: iPad / iPhone broken; the intro cinematic video plays but
without its embedded music; the video gets "chopped off".

### Bugs found

1. **Intro-video audio was being stripped.** Both `VillageVideoScene` and
   `BossVideoScene` were calling
   `this.load.video(key, path, true)` — Phaser's third argument is
   `noAudio`, and `true` means "load this without an audio track." That's
   why the cinematic videos played silently regardless of device volume.
2. **Pre-existing `resizeGameToViewport` crash on every page load.** That
   helper was being called synchronously right after `new Phaser.Game()`,
   before the ScaleManager had finished initializing its internal Size
   objects. Result: `Uncaught TypeError: Cannot set properties of
   undefined (setting 'width')` on every load, swallowed by the global
   error handler but leaving the game in a partial state. Worse, the
   call passed `window.innerWidth / innerHeight` to
   `game.scale.resize()`, which actually mutates the *design* size,
   trampling the FIT scaler.
3. **iPad detection failure.** All three sites using
   `this.sys.game.device.os.desktop` (TouchControls + two HUD hint
   strings) were treating iPadOS-13+ iPads as desktop — so the touch
   controls never appeared, the game was unplayable.
4. **Audio context never resumed on iOS.** Phaser will autoplay bgm but
   iOS Safari starts the WebAudio context suspended; nothing was
   resuming it explicitly on the first user gesture. Intro music + bgm
   would queue but never play.
5. **Video framing got "chopped".** `VillageVideoScene` / `BossVideoScene`
   used `vid.setScale(W / vw)` — i.e. fit by width. On a video whose
   aspect ratio was wider than the canvas (which is common for the
   uploaded clips) this left a black bar at the top/bottom and the
   subject of the video looked like it was cut off.
6. **Viewport meta missing iOS bits.** No `viewport-fit=cover`, no
   `maximum-scale=1.0`, no `apple-mobile-web-app-*` metas. Easy to
   pinch-zoom or get crowded by the notch.

### What changed in `gamedemo69.html`

- **`<meta>` viewport** now: `width=device-width, initial-scale=1.0,
  maximum-scale=1.0, minimum-scale=1.0, user-scalable=no,
  viewport-fit=cover`. Added the three `apple-mobile-web-app-*` metas.
- **New head `<script>` block** added near the top of the file, defining:
  - `window.onerror` + `unhandledrejection` → push into
    `window.__lastError` so on-device crashes are visible without
    devtools.
  - Document-level `touchmove` + `gesturestart` `preventDefault` so the
    page can't rubber-band or pinch-zoom while assets load.
  - **`window.__isTouchDevice()`** — the canonical mobile check. Handles
    iPadOS-13+ (which reports a Mac UA + multi-touch), and is safe to
    call before Phaser has booted (re-evaluates instead of caching a
    bogus answer).
  - One-shot global audio unlocker: on the first `touchstart` /
    `pointerdown` / `keydown` it resumes the suspended AudioContext and
    nudges the registered intro-music track to start.
- **`<style>`** body now has `overscroll-behavior: none` + `position:
  fixed` to stop iOS rubber-banding, `#game-container` has safe-area
  padding (`env(safe-area-inset-*)`) so the canvas isn't clipped by the
  notch / home indicator, and the canvas has explicit `touch-action:
  none` + `-webkit-tap-highlight-color: transparent`.
- **`TouchControls.active`** now uses `window.__isTouchDevice()` (with a
  fallback to the old `!desktop` check). iPad gets the touch UI.
- **Two `isDesktop = this.sys.game.device.os.desktop` callsites** (the
  controls hint strings in the storybook and HUD scenes) now use
  `!window.__isTouchDevice()`. iPad sees the "Touch controls below"
  hint instead of the desktop keyboard hint.
- **`VillageVideoScene.preload` / `BossVideoScene.preload`** —
  `this.load.video(..., false)` instead of `true`, restoring the
  embedded audio track. Both calls are wrapped in `try`/`catch` and
  paired with a `loaderror` listener so a missing/unsupported video
  falls back to the existing placeholder image instead of freezing.
- **`VillageVideoScene.create` / `BossVideoScene.create`** — switched
  the framing math from "fit to width" to **cover**: `scale =
  Math.max(W/vw, H/vh)`. The video always fills the canvas — no black
  bars top/bottom — and panning still tracks the vertical overflow.
  Also: `vid.setMute(false)` + `vid.setVolume(1.0)`, plus a direct
  `vid.video.muted = false; .volume = 1.0; .playsInline = true` so the
  HTML element itself isn't silently muted on iOS. A second
  `vid.play()` is called on the next-frame `delayedCall` because iOS
  occasionally rejects the first play attempt while the audio context
  is still resuming.
- **`BootScene` "tap to start"** now also accepts `keydown`, calls
  `this.sound.context.resume()` in the gesture handler (in addition to
  the global unlocker), and routes both inputs through one guarded
  `go()` so we can't double-start the next scene.
- **`resizeGameToViewport(w, h)`** — fixed two bugs at once:
  - No longer calls `game.scale.resize(w, h)` (that mutates the design
    size). Instead, when the game is booted, it calls
    `game.scale.refresh()` to re-letterbox into the current viewport.
  - No longer touches `canvas.style.width/height` directly — Phaser's
    ScaleManager owns those.
  - Guards against being called before Phaser has finished booting (the
    crash that was firing on every page load).
- **Phaser config** — added `expandParent: true` inside `scale:`, added
  `input.touch.capture: true`, and added an `orientationchange` window
  listener that calls `game.scale.refresh()` after 60ms. Width/height
  kept at top level (Phaser 3.87 needs them there for the size-objects
  to initialise correctly on boot — moving them under `scale:` was the
  bug the first attempt of Pass 2 introduced).

### Verified (headless Chromium + Playwright)

- Desktop 1280×800 → `isTouch = false`, scene flow advances past
  BootScene, audio context running, no pageerrors.
- iPhone 13 emulation → `isTouch = true`, display 390×219 (game space
  still 1280×720 — FIT works), reaches `VillageVideoScene` /
  `BossVideoScene`, audio context running.
- iPad gen-7 emulation → `isTouch = true`, display 810×455, same as
  above. Previously this device profile got stuck on BootScene because
  TouchControls never activated.
- No more `Cannot set properties of undefined (setting 'width')`.
- "Unable to decode audio data" pageerrors in the test only come from
  the headless harness substituting empty bodies for `*.mp3` requests —
  production files will decode fine.

### Out of scope / still on the radar

- The intro videos themselves (`/Particles fly from villagers.mp4`,
  `/Opening animation .mp4`) — I can't see the bytes on the server, so
  I can't verify the exact aspect or duration. The cover-scale fix
  removes the "chopped" black bars regardless. If the videos are
  *longer* than the 12s / 10s hard-coded pan durations, the cinematic
  still ends early. Tell me the actual video lengths and I'll wire the
  pan to the natural duration.
- `level3-opening-demo.html` still uses `window.innerWidth/Height`
  directly and is unmodified — it's a sandbox demo, not the live game.

---

## Pass 1 — index.html tree (initial pass)

---

## Files changed

### `index.html`
- Updated viewport meta: added `maximum-scale=1.0`, `minimum-scale=1.0`,
  `user-scalable=no`, `viewport-fit=cover` so iOS Safari can't pinch-zoom
  or clip behind the notch / home indicator.
- Added `apple-mobile-web-app-capable` and matching status-bar metas for
  "Add to Home Screen" install behavior.
- Added a top-of-page inline script that:
  - installs a global `window.onerror` + `unhandledrejection` handler that
    stores the last error on `window.__lastError` (used by the debug
    overlay so we can see crashes on-device).
  - calls `e.preventDefault()` for `touchstart`/`touchmove`/`gesturestart`
    at the document level so the page can't rubber-band or zoom while
    Phaser is booting.
- Bumped cache-bust version `?v=5` → `?v=6` on every JS include.
- Pulls in the two new files: `js/utils/MobileSupport.js`,
  `js/systems/DebugOverlay.js`.

### `css/style.css`
- Added `overscroll-behavior: none` and `position: fixed` on the
  `html, body` so iOS Safari can't bounce the page while a finger is
  dragging on the canvas.
- `#game-container` now uses `padding: env(safe-area-inset-*)` so the
  game stays away from the iPhone notch and home indicator, and has
  `touch-action: none` of its own.
- Canvas also has `touch-action: none` and
  `-webkit-tap-highlight-color: transparent` to silence Safari's blue
  flash on tap.

### `js/main.js`
- Scale config now sets `width`/`height`/`expandParent` inside the
  `scale:` block (was at top level) and keeps `mode: Phaser.Scale.FIT`
  + `autoCenter: Phaser.Scale.CENTER_BOTH`. This is the canonical Phaser
  3 shape and gives reliable letter-boxing on portrait + landscape.
- Added `input.touch.capture = true` so Phaser consumes touch events
  rather than letting them propagate as default-scrolling on older iOS.
- Calls `MobileSupport.installAudioUnlock(game)` once at startup —
  registers a one-shot global gesture listener that resumes the
  `AudioContext` on the first tap / keypress. iOS won't start audio
  without this.
- Added an `orientationchange` handler that calls `game.scale.refresh()`
  after a 50ms tick (Safari sometimes lags Phaser's own resize hook).

### `js/utils/MobileSupport.js` *(new)*
- `MobileSupport.isTouchDevice(scene)`: reliable touch-device check that
  also catches iPad-as-Mac (iPadOS 13+ reports a Mac UA, so Phaser's
  `device.os.desktop` is `true` for it). Falls back to
  `navigator.maxTouchPoints` + UA heuristic.
- `MobileSupport.unlockAudio(scene)`: resumes the WebAudio context if it
  is suspended. Safe to call from any gesture handler.
- `MobileSupport.installAudioUnlock(game)`: one-shot global listener
  that resumes audio on first `touchstart`/`mousedown`/`keydown` and
  then removes itself.
- Exposes a `DEBUG_MODE` flag (default `false`); flip it to force-show
  touch controls on desktop for testing.

### `js/systems/TouchControls.js`
- Now detects mobile via `MobileSupport.isTouchDevice` instead of
  `!device.os.desktop` — fixes iPads showing no on-screen controls.
- Buttons (left, right, jump, shoot, sprint, **new** backstep `X`) are
  laid out in `_layout()` which is called both at create-time and on
  `scale.on('resize')` — so orientation changes reposition the controls
  correctly instead of stranding them off-screen.
- Multi-touch state is tracked per-button via a `Set<pointerId>` so a
  finger sliding across two buttons no longer drops the "left" press
  when a second finger touches "jump".
- Replaced the brittle one-frame-jump hack with a clean
  level-triggered `this.jump` (the `Player` already does its own edge
  detection via `_jumpHeldLastFrame`).
- `backstepJust` and the edge-triggered `_jumpEdge` flag are cleared on
  the scene's `postupdate` event so they're guaranteed to be visible
  to `player.update()` on the same frame the gesture fired (the old
  code cleared them at the top of `update()`, racing the pointerdown
  handler).
- On `pointerdown`, calls `MobileSupport.unlockAudio(scene)` so audio
  unlocks on any control press, not just on the boot screen.

### `js/systems/DebugOverlay.js` *(new)*
- Attach via `DebugOverlay.attach(scene)` from any scene.
- Toggled by tapping the top-right corner of the canvas 3 times within
  1.5 seconds (per the spec).
- Shows scene name, FPS, player x/y, total active display objects,
  scale dimensions, device pixel ratio, and the last value of
  `window.__lastError`.
- Lives on `setScrollFactor(0)` at depth `99999`, so it stays pinned
  to the camera and on top of HUD + touch controls.
- Cleans up on scene `shutdown`.

### `js/scenes/BootScene.js`
- Added `preload()` with a `loaderror` listener that pushes loader
  failures into `window.__lastError` and the console.
- Switched all layout to `this.scale.width / this.scale.height` (per
  spec).
- Uses a web-safe font fallback chain (`Georgia, "Times New Roman",
  serif`) so missing custom fonts don't make the title disappear on
  mobile Safari.
- Auto-advance is now belt-and-braces: a `time.delayedCall(2000, go)`
  **and** a delta accumulator in `update()` both call the same `_go`
  helper, guarded by a single `_transitioned` flag so we can't double-
  start `Level1Scene`. The accumulator is required because in software-
  rendered environments the scene clock occasionally lags real time.
- `_go` calls `MobileSupport.unlockAudio` before starting the next
  scene so audio is unlocked the first time the user taps "start".
- Attaches the debug overlay.

### `js/scenes/Level1Scene.js`
- `update(time, delta)` now wraps `this._update(time, delta)` in a
  `try/catch` so a single-frame exception doesn't silently freeze the
  scene — the error is logged and pushed to `window.__lastError`.
- Coin destruction now also destroys the paired outer-glow circle —
  previously the glow stayed on screen and tweened forever after the
  coin was collected (slow visual leak, but explicitly called out under
  Priority 3).
- Before launching `HUDScene`, makes sure no stale instance is still
  active (debug-warp to Level3 and back was leaving the HUD in an
  ambiguous state). Then emits initial `coinCollected` / `playerHpChanged`
  values so the HUD can re-sync inside its own `create()`.
- Attaches the debug overlay.
- *Note*: did **not** change any movement / physics / enemy / world
  logic — those are explicitly out of scope per the brief.

### `js/scenes/Level3BossScene.js`
- Same `try/catch` wrapper around `update`.
- **Wired up `TouchControls`** — previously the boss fight passed `null`
  for `touchInput`, making it unplayable on mobile when reached via the
  `B` debug warp. Added two extra on-screen buttons: a mirror toggle
  and a heart-blast button, sitting just above the standard jump /
  shoot cluster.
- `mirrorKey.isDown || _mirrorTouchHeld` now drives the mirror shield.
- `Phaser.Input.Keyboard.JustDown(blastKey) || _blastTouchEdge` drives
  the heart-blast.
- Attaches the debug overlay.

### `js/scenes/HUDScene.js`
- Switched layout to `this.scale.width / this.scale.height`.
- HUD elements now explicitly `setScrollFactor(0)` and `setDepth(50+)`
  so they stay pinned to the camera regardless of which scene is
  underneath. (The originals didn't set scrollFactor, which worked
  because HUDScene is its own scene with its own non-scrolling camera,
  but being explicit is cheap and survives future camera changes.)
- On mobile the controls hint is repositioned to the top of the screen
  with mobile-appropriate text — previously it sat at `H - 30`, which
  is exactly where the on-screen jump button now lives. Desktop hint
  unchanged.
- Re-syncs with `Level1Scene.player` on `create()` so initial state
  isn't lost when `Level1Scene.create()` emits its events before
  `HUDScene.create()` runs.
- Removes its event listeners on `shutdown` so re-launching HUDScene
  (e.g. after a Level3 → Level1 round-trip) doesn't stack handlers on
  the underlying scene.
- Uses web-safe font fallback (`sans-serif, Arial`).
- Attaches the debug overlay.

---

## Asset notes (flagged but not auto-resized, per spec)

These are above 1024×1024 and would benefit from being downscaled if /
when they're actually loaded. **None of them are currently preloaded by
the active `index.html` game** — they're only used by the standalone
demo HTMLs — but flagging here so they're on the radar.

| Path | Size |
| ---- | ---- |
| `assets/sprites/sky_creature/encounter_scene.png` | 2730×1151 |
| `assets/sprites/sky_creature_v2/*.png` (all 8 frames) | up to 1507×948 |
| `assets/creature/*.png` (all 9 frames) | 2406×1760 each |

The `assets/sprites/sky_creature/rider_*.png` and `beam_*.png` files
are all under 1024 and are fine.

---

## Issues I noticed but did NOT fix (out of scope)

1. **`gamedemo69.html` (19k lines) was not modified.** It has its own
   embedded copy of every scene (BootScene, PreloadScene, VillageVideoScene,
   BossVideoScene, MonkIntroScene, TitleSplashScene, MenuScene, ten
   cinematic scenes, three level scenes, etc.) and its own asset preload.
   The brief said "do not refactor working code" — applying mobile
   surgery to a monolithic 19k-line file would have been a refactor.
   If this file is the canonical entry point rather than `index.html`,
   let me know and I'll do a second pass.

2. **`level3-opening-demo.html`** uses `window.innerWidth`/`innerHeight`
   directly. Left it alone since it's a demo and not loaded by the
   main game.

3. The active main-game flow has no real "opening cinematic" — only
   `BootScene` (loading splash) and `Level3BossScene._startIntro()`
   (the boss taunt sequence). Both were inspected and verified to be
   on the scene list, started correctly, and to transition out
   correctly. If the intended cinematic is in `gamedemo69.html`, see
   point 1.

4. `Player.update()` has a small invuln-flicker bug where
   `Math.floor(invulnTimer / 60)` can go briefly negative on the last
   frame — visually invisible, not worth a fix.

5. The `assets/sprites/player/hero_sheet.png` referenced by
   `js/systems/PlayerAnimations.js` doesn't exist on disk; the active
   `Player` entity is drawn as a rectangle so it works fine, but if you
   later wire up `PlayerAnimations.preload(scene)` you'll get a
   loader 404. `PlayerAnimations.js` itself isn't currently included
   from `index.html`.

---

## How to verify on-device

Open the game on iPhone / iPad Safari and confirm:
- Canvas fills the screen (letter-boxed) without distortion in both
  portrait and landscape.
- The on-screen joystick + jump/shoot/run/X buttons appear in the
  bottom corners, **not visible** on desktop.
- Tapping anywhere on the boot screen advances to Level 1.
- The "RUN" sprint button doesn't sit underneath the HUD coin counter.
- Tap top-right corner 3× quickly to toggle the debug overlay.
- Tabbing away and back doesn't strand the boot screen — auto-advance
  fires regardless.

Headless validation (Chromium + Playwright with iPhone 13 and iPad
gen-7 device emulation) was used during the fix pass and confirmed:
- `MobileSupport.isTouchDevice` is `true` on both
- `TouchControls.active` is `true`, buttons are visible at the expected
  coordinates
- Touch-and-hold on the right d-pad button accelerates the player
  rightward at the configured walk speed (`vx ≈ 200`)
- No console errors at boot or after the BootScene → Level1 transition
- The boot scene auto-advances even when the user never taps
