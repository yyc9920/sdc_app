import { Capacitor } from '@capacitor/core';

export function isMobileBrowser(): boolean {
  if (Capacitor.isNativePlatform()) return false;

  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // iPadOS reports desktop UA but has touch support
  const isTabletWithTouch =
    'ontouchstart' in window && /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;

  return isMobileUA || isTabletWithTouch;
}
