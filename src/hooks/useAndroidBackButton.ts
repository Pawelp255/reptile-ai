import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/** Root tab routes where hardware back should minimize the app instead of navigating. */
export const ANDROID_ROOT_TAB_PATHS = [
  '/today',
  '/reptiles',
  '/add-event',
  '/journal',
  '/settings',
] as const;

export function isAndroidRootTabPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return (ANDROID_ROOT_TAB_PATHS as readonly string[]).includes(normalized);
}

/**
 * Android hardware back: pop in-app history on nested routes; minimize on root tabs.
 */
export function useAndroidBackButton() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const listener = App.addListener('backButton', () => {
      if (isAndroidRootTabPath(location.pathname)) {
        void App.minimizeApp();
        return;
      }

      if (window.history.length > 1) {
        navigate(-1);
        return;
      }

      void App.minimizeApp();
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [location.pathname, navigate]);
}
