// FILE: src/components/pwa/InstallAppBanner.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'edstop-install-banner-dismissed-at';
const DISMISS_DAYS = 14;

const isStandaloneDisplay = () => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

const isIosDevice = () => {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

const recentlyDismissed = () => {
  if (typeof window === 'undefined') return true;

  const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
  if (!dismissedAt) return false;

  const dismissedTime = Number(dismissedAt);
  if (Number.isNaN(dismissedTime)) return false;

  const dismissWindow = DISMISS_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - dismissedTime < dismissWindow;
};

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  const isIos = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    if (isStandaloneDisplay() || recentlyDismissed()) {
      return;
    }

    if (isIos) {
      const timer = window.setTimeout(() => {
        setShowBanner(true);
        setShowIosHelp(true);
      }, 1500);

      return () => window.clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowBanner(false);
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isIos]);

  const handleInstall = async () => {
    if (isIos) {
      setShowIosHelp(true);
      return;
    }

    if (!deferredPrompt) {
      setShowBanner(false);
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setShowBanner(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-3xl border border-white/10 bg-slate-950/95 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur-xl sm:bottom-5 sm:p-5">
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-xl font-black shadow-lg shadow-purple-500/25">
          E
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-black sm:text-base">Install EdStop</h2>
              <p className="mt-1 text-xs leading-5 text-white/60 sm:text-sm">
                Add EdStop to your home screen for faster food, essentials, orders, and campus services.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install app banner"
              className="rounded-full px-2 py-1 text-lg leading-none text-white/45 transition hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>

          {showIosHelp && (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-xs leading-5 text-white/70">
              On iPhone or iPad, tap the browser share button, then choose <span className="font-bold text-white">Add to Home Screen</span>.
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-white/90"
            >
              {isIos ? 'Show Install Steps' : 'Install App'}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/[0.09] hover:text-white"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
