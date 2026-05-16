import { getApps } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getConsent } from '../components/CookieConsent.tsx';

let analyticsInitialized = false;

export async function bootstrapAnalyticsFromConsent(): Promise<void> {
  if (analyticsInitialized) return;
  const consent = getConsent();
  if (!consent || !consent.analytics) return;

  try {
    const supported = await isSupported();
    if (!supported) return;
    const apps = getApps();
    if (apps.length === 0) return;
    getAnalytics(apps[0]);
    analyticsInitialized = true;
  } catch {
  }
}

export function enableAnalyticsNow(): void {
  if (analyticsInitialized) return;
  isSupported().then(supported => {
    if (!supported) return;
    const apps = getApps();
    if (apps.length === 0) return;
    try {
      getAnalytics(apps[0]);
      analyticsInitialized = true;
    } catch {
    }
  });
}
