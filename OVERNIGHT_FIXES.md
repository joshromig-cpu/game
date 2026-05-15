# Overnight Fixes — Phaser Mobile / Tablet Pass

Branch: `claude/fix-phaser-mobile-critical-qqxhv`

Scope: targeted fixes only — no refactors, no mechanic changes, no Phaser
version bump. All changes are in the active `index.html` game tree
(`index.html`, `css/style.css`, `js/`). The standalone `gamedemo69.html`
and `level3-opening-demo.html` files were **not** modified (see note at
end).

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
