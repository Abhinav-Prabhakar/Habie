// Progressive Web App: service worker registration and the install flow.
// Chromium browsers fire `beforeinstallprompt`; iPadOS Safari doesn't, so there we show
// Share → Add to Home Screen instructions instead.
import { toast } from './fx.js';

let deferred = null;
let onChange = () => {};

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function installState() {
  // README mock-ups (?mockup) show Habie as the installed Home Screen app.
  const mock = document.documentElement.classList.contains('mockup');
  return { installed: mock || standalone(), canPrompt: !!deferred, ios: ios() };
}

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  onChange();
  return outcome === 'accepted';
}

export function initPWA(changed) {
  onChange = changed || onChange;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; onChange(); });
  addEventListener('appinstalled', () => { deferred = null; onChange(); toast('Habie is on your Home Screen', 'seedling'); });
  matchMedia('(display-mode: standalone)').addEventListener?.('change', onChange);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w && w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) toast('A fresh version of Habie is ready — reopen to update', 'sparkles');
        });
      });
    }).catch(() => { /* offline support unavailable */ });
  }
}
