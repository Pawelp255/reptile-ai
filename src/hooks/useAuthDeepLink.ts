import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { parseAuthDeepLink, replaceBrowserUrl } from '@/lib/auth/authDeepLink';

/**
 * Routes email confirmation / password-reset links into the SPA on native platforms.
 * Requires Android App Links (and iOS Universal Links) for https://reptilita.com/auth/*.
 */
export function useAuthDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const routeAuthUrl = (incomingUrl: string) => {
      const internalPath = parseAuthDeepLink(incomingUrl);
      if (!internalPath) return;

      replaceBrowserUrl(internalPath);
      navigate(internalPath, { replace: true });
    };

    const listener = App.addListener('appUrlOpen', (event) => {
      routeAuthUrl(event.url);
    });

    void App.getLaunchUrl().then((result) => {
      if (result?.url) {
        routeAuthUrl(result.url);
      }
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [navigate]);
}
