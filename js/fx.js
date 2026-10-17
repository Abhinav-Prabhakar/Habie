// Effects: number count-ups, confetti, toasts, synthesised sounds and haptics.
import { ICON, store } from './store.js';

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const checkSvg = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4 9.3 3.3 3.2L14 5.8"/></svg>';

// Stage scale, kept in sync by the app's fit() so effects can work in design pixels.
export const view = { scale: 1 };

export function countTo(el, to, decimals = 0, suffix = '') {
  if (!el) return;
  const from = parseFloat(el.dataset.v || '0');
  el.dataset.v = to;
  const run = (el._count = (el._count || 0) + 1);          // a newer count on the same element wins
  const fmt = (v) => String(decimals ? Math.round(v * 10 ** decimals) / 10 ** decimals : Math.round(v));
  if (REDUCED || from === to || Number.isNaN(from)) { el.textContent = fmt(to) + suffix; return; }
  const start = performance.now(), dur = 750;
  const step = (t) => {
    if (el._count !== run) return;
    const p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function ring(pct, size = 40, stroke = 4, col = 'var(--hc)') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" class="ring-track" stroke-width="${stroke}"/>` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c * Math.min(1, pct)} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}

export function stagePoint(e) {
  const stage = $('#stage'), r = stage.getBoundingClientRect();
  const x = e && e.clientX != null ? e.clientX : r.left + r.width / 2;
  const y = e && e.clientY != null ? e.clientY : r.top + r.height / 2;
  return [(x - r.left) / view.scale, (y - r.top) / view.scale];
}

export function confetti(x, y, count = 40, spread = 1) {
  if (REDUCED) return;
  const fx = $('.fx');
  const colors = ['#fc894b', '#7b6cf6', '#18b7f2', '#f0679b', '#22ae63', '#f8b84e'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.className = 'confetti';
    p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};width:${8 + Math.random() * 8}px;height:${5 + Math.random() * 6}px;border-radius:${Math.random() > 0.5 ? '50%' : '3px'}`;
    fx.appendChild(p);
    const ang = Math.random() * Math.PI * 2, dist = (90 + Math.random() * 190) * spread;
    p.animate([
      { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist - 80}px)) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(calc(-50% + ${Math.cos(ang) * dist * 1.25}px), calc(-50% + ${Math.sin(ang) * dist + 240}px)) rotate(${Math.random() * 900}deg)`, opacity: 0 },
    ], { duration: 1300 + Math.random() * 600, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
  }
}
export function rain() {
  if (REDUCED) return;
  const w = $('#stage').offsetWidth;
  for (let i = 0; i < 7; i++) setTimeout(() => confetti(120 + Math.random() * (w - 240), 80 + Math.random() * 220, 28, 1.3), i * 170);
}

let toastTimer;
export function toast(text, icon = 'party-popper') {
  const el = $('.toast');
  $('#toast-img').src = ICON(icon);
  $('.toast-text').textContent = text;
  el.classList.remove('show'); void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// Sounds are synthesised so the app ships no audio files.
let actx;
export function sound(kind) {
  if (!store.state.settings.sounds) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { pop: [660], tap: [880], undo: [440, 330], done: [660, 880], perfect: [523, 659, 784, 1047], level: [392, 523, 659, 784, 1047], soft: [520] }[kind] || [600];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.09;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(kind === 'tap' ? 0.06 : 0.16, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      o.connect(g).connect(actx.destination);
      o.start(t0); o.stop(t0 + 0.3);
    });
  } catch (e) { /* audio unavailable */ }
}
export const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };
