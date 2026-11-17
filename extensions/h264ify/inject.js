/**
 * Force YouTube and web video players to deliver H.264 (avc1) hardware accelerated streams.
 * Blocks software VP9 and AV1 decoders which overload Raspberry Pi 3B+ CPU.
 */

(function() {
  'use strict';

  function isBlockedCodec(type) {
    if (!type || typeof type !== 'string') return false;
    const lower = type.toLowerCase();
    return (
      lower.includes('vp9') ||
      lower.includes('vp09') ||
      lower.includes('av01') ||
      lower.includes('av1') ||
      lower.includes('opus') && lower.includes('video')
    );
  }

  // 1. Hook MediaSource.isTypeSupported (MSE)
  if (window.MediaSource) {
    const origIsTypeSupported = window.MediaSource.isTypeSupported.bind(window.MediaSource);
    window.MediaSource.isTypeSupported = function(type) {
      if (isBlockedCodec(type)) {
        return false;
      }
      return origIsTypeSupported(type);
    };
  }

  // 2. Hook HTMLMediaElement.prototype.canPlayType
  const origCanPlayType = HTMLMediaElement.prototype.canPlayType;
  HTMLMediaElement.prototype.canPlayType = function(type) {
    if (isBlockedCodec(type)) {
      return '';
    }
    return origCanPlayType.call(this, type);
  };

  // 3. Hook navigator.mediaCapabilities.decodingInfo (Modern YouTube API)
  if (navigator.mediaCapabilities && navigator.mediaCapabilities.decodingInfo) {
    const origDecodingInfo = navigator.mediaCapabilities.decodingInfo.bind(navigator.mediaCapabilities);
    navigator.mediaCapabilities.decodingInfo = function(config) {
      if (config && config.video && config.video.contentType) {
        if (isBlockedCodec(config.video.contentType)) {
          return Promise.resolve({
            supported: false,
            smooth: false,
            powerEfficient: false,
            keySystemAccess: null,
            configuration: config
          });
        }
      }
      return origDecodingInfo(config);
    };
  }

  console.log('[h264ify] Enforcing H.264 hardware acceleration for YouTube TV (MediaSource + MediaCapabilities hooked)');
})();
