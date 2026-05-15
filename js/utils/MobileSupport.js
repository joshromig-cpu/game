// Mobile / touch-device support helpers.
//
// Two responsibilities:
//
//   1. Reliably detect whether on-screen touch controls should be shown.
//      Modern iPads on iOS 13+ report a desktop UA, so Phaser's
//      game.device.os.desktop returns true for them. We fall back to
//      touch-capability + iOS hints so iPad gets the touch UI.
//
//   2. Unlock the WebAudio context on the first real user gesture.
//      iOS Safari starts the AudioContext suspended and only allows
//      playback to resume from within a synchronous user-gesture handler.
//
// Toggle DEBUG_MODE to force-show touch controls on desktop (useful for
// testing in browser dev tools).

const DEBUG_MODE = false;

const MobileSupport = {
  // Cached detection — computed once when first needed.
  _isTouchDevice: null,

  isTouchDevice(scene) {
    if (this._isTouchDevice !== null) return this._isTouchDevice;
    if (DEBUG_MODE) return (this._isTouchDevice = true);

    const dev = scene && scene.sys && scene.sys.game && scene.sys.game.device;
    const os  = dev && dev.os;

    // iPadOS 13+ reports a Mac UA but supports multi-touch, so test that too.
    const hasTouch = ('ontouchstart' in window)
      || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1)
      || (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);

    const isMobileOS = !!(os && (os.iOS || os.android || os.iPhone || os.iPad));
    const notDesktop = !!(os && !os.desktop);

    this._isTouchDevice = !!(isMobileOS || (hasTouch && (notDesktop || this._isAppleDevice())));
    return this._isTouchDevice;
  },

  _isAppleDevice() {
    // Detect iPad-as-Mac specifically: Mac UA + multi-touch points.
    const ua = (navigator.userAgent || '').toLowerCase();
    const isMacLike = ua.includes('mac') || ua.includes('iphone') || ua.includes('ipad');
    const multi = (navigator.maxTouchPoints || 0) > 1;
    return isMacLike && multi;
  },

  // Call from any user-gesture handler. iOS will not start audio
  // unless this resume is triggered inside the gesture's call stack.
  unlockAudio(scene) {
    try {
      const ctx = scene && scene.sound && scene.sound.context;
      if (ctx && ctx.state === 'suspended' && ctx.resume) {
        // Phaser also exposes its own helper for the same purpose; either is fine.
        const p = ctx.resume();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) { /* no-op — audio may not exist yet */ }
  },

  // Install a one-time gesture listener on the canvas to unlock audio.
  // Safe to call multiple times — it self-removes after the first gesture.
  installAudioUnlock(game) {
    if (!game) return;
    let unlocked = false;
    const tryUnlock = () => {
      if (unlocked) return;
      unlocked = true;
      try {
        const snd = game.sound;
        if (snd && snd.context && snd.context.state === 'suspended') {
          const p = snd.context.resume();
          if (p && p.catch) p.catch(() => {});
        }
      } catch (e) { /* no-op */ }
      window.removeEventListener('touchstart', tryUnlock, true);
      window.removeEventListener('touchend',   tryUnlock, true);
      window.removeEventListener('mousedown',  tryUnlock, true);
      window.removeEventListener('keydown',    tryUnlock, true);
    };
    window.addEventListener('touchstart', tryUnlock, true);
    window.addEventListener('touchend',   tryUnlock, true);
    window.addEventListener('mousedown',  tryUnlock, true);
    window.addEventListener('keydown',    tryUnlock, true);
  },
};

// Expose for Phaser scene code.
window.MobileSupport = MobileSupport;
window.DEBUG_MODE = DEBUG_MODE;
