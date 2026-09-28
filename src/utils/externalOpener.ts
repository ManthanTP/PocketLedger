import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const OFFICIAL_LANDING_PAGE_URL = 'https://pocket-ledger-pro.vercel.app/download.html';

/**
 * Opens the landing / APK download page in the device's external web browser
 * (e.g. Chrome, Firefox, Edge, Safari) rather than loading inside the Capacitor WebView.
 */
export async function openLandingPageInExternalBrowser(url: string = OFFICIAL_LANDING_PAGE_URL): Promise<void> {
  const targetUrl = url || OFFICIAL_LANDING_PAGE_URL;

  // On Native Android/iOS: use Capacitor Browser plugin to launch system browser
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({
        url: targetUrl,
        windowName: '_system',
      });
      return;
    } catch (nativeErr) {
      console.warn('Capacitor Browser.open failed, falling back to window.open:', nativeErr);
    }
  }

  // Web environment or native fallback
  try {
    const newWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      window.location.href = targetUrl;
    }
  } catch (err) {
    console.error('Failed to open external browser:', err);
    window.location.href = targetUrl;
  }
}
