/**
 * Force YouTube to deliver H.264 (avc1) hardware accelerated streams.
 * Blocks software VP9 and AV1 decoders which overload Raspberry Pi 3B+ CPU.
 */

(function() {
  'use strict';

  if (window.MediaSource) {
    const originalIsTypeSupported = window.MediaSource.isTypeSupported.bind(window.MediaSource);
    window.MediaSource.isTypeSupported = function(type) {
      if (!type) return false;
      const lower = type.toLowerCase();
      if (lower.includes('vp9') || lower.includes('vp09') || lower.includes('av01') || lower.includes('av1')) {
        return false;
      }
      return originalIsTypeSupported(type);
    };
  }

  const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;
  HTMLMediaElement.prototype.canPlayType = function(type) {
    if (!type) return '';
    const lower = type.toLowerCase();
    if (lower.includes('vp9') || lower.includes('vp09') || lower.includes('av01') || lower.includes('av1')) {
      return '';
    }
    return originalCanPlayType.call(this, type);
  };

  console.log('[h264ify] Enforcing H.264 hardware acceleration for YouTube TV');
})();
