// Data: the persisted state, dates, and everything derived from the log.
// Nothing in here touches the DOM.

export const STORE_KEY = 'habie.v3';
export const LEVEL_XP = 400;
export const ICON = (name) => `assets/3d/${name}.png`;

export const TIMES = {
  morning:   { label: 'Morning',   icon: 'sunrise' },
  afternoon: { label: 'Afternoon', icon: 'sun' },
  evening:   { label: 'Evening',   icon: 'crescent-moon' },
};
export const TIME_ORDER = ['morning', 'afternoon', 'evening'];
export const COLORS = ['#18b7f2', '#fb8c3c', '#7b6cf6', '#f0679b', '#f25a5a', '#22ae63', '#e9b200'];
export const ACCENTS = { lavender: 'Lavender', peach: 'Peach', mint: 'Mint', rose: 'Rose' };
export const BUDDIES = [
  { id: 'bear-orange', name: 'Nino' }, { id: 'frog', name: 'Ribbit' }, { id: 'fox', name: 'Foxy' },
  { id: 'panda', name: 'Bamboo' }, { id: 'penguin', name: 'Pip' }, { id: 'owl', name: 'Hoot' }, { id: 'unicorn', name: 'Sparkle' },
];
// The icon picker's tabs. NEW_ICONS is every pickable icon.
export const ICON_GROUPS = [
  { id: 'health', label: 'Health', icons: ['droplet', 'pill', 'toothbrush', 'tooth', 'bed', 'sleeping-face', 'zzz', 'stethoscope', 'adhesive-bandage', 'lungs', 'anatomical-heart', 'eye', 'soap', 'shower', 'bathtub', 'lotion-bottle', 'no-entry', 'cigarette', 'wine-glass', 'beer-mug'] },
  { id: 'food', label: 'Food', icons: ['green-salad', 'broccoli', 'carrot', 'red-apple', 'apple', 'avocado', 'banana', 'strawberry', 'watermelon', 'leafy-green', 'cooking', 'bowl-with-spoon', 'hot-beverage', 'teacup-without-handle', 'glass-of-milk', 'cup-with-straw', 'baby-bottle', 'chocolate-bar', 'lollipop', 'birthday-cake'] },
  { id: 'move', label: 'Move', icons: ['running-shoe', 'footprints', 'biceps', 'bicycle', 'basketball', 'soccer-ball', 'tennis', 'volleyball', 'badminton', 'ping-pong', 'skateboard', 'roller-skate', 'ice-skate', 'skis', 'kite', 'yo-yo', 'mountain', 'camping', 'national-park', 'flag-in-hole'] },
  { id: 'mind', label: 'Mind', icons: ['person-in-lotus-position', 'brain', 'books', 'open-book', 'notebook', 'ledger', 'memo', 'pencil', 'graduation-cap', 'crystal-ball', 'thinking-face', 'smiling-face-with-halo', 'red-heart', 'sparkling-heart', 'cherry-blossom', 'mobile-phone-off', 'hourglass-done', 'infinity'] },
  { id: 'home', label: 'Home', icons: ['house', 'broom', 'sponge', 'basket', 'dog', 'cat-face', 'paw-prints', 'sunflower', 'tulip', 'rose', 'hibiscus', 'cactus', 'deciduous-tree', 'evergreen-tree', 'potted-plant', 'herb', 'seedling', 'wrapped-gift'] },
  { id: 'work', label: 'Work', icons: ['laptop', 'desktop-computer', 'keyboard', 'envelope', 'telephone-receiver', 'speaking-head', 'spiral-calendar', 'calendar', 'alarm-clock', 'clipboard', 'chart-increasing', 'money-bag', 'coin', 'credit-card', 'bullseye', 'rocket', 'key', 'bulb'] },
  { id: 'create', label: 'Create', icons: ['guitar', 'headphone', 'musical-note', 'musical-keyboard', 'violin', 'drum', 'saxophone', 'microphone', 'artist-palette', 'paintbrush', 'camera', 'video-game', 'puzzle-piece', 'chess-pawn', 'sparkles', 'star', 'globe-showing-americas', 'speech-balloon'] },
];
export const NEW_ICONS = ICON_GROUPS.flatMap((g) => g.icons);
export const IDEAS = [
  { name: 'Morning run', icon: 'running-shoe', time: 'morning', color: 1 },
  { name: 'No phone in bed', icon: 'mobile-phone-off', time: 'evening', color: 2 },
  { name: 'Floss', icon: 'toothbrush', time: 'evening', color: 0 },
  { name: 'Eat greens', icon: 'green-salad', time: 'afternoon', color: 5 },
  { name: 'Practice guitar', icon: 'guitar', time: 'evening', color: 3 },
  { name: 'Vitamins', icon: 'pill', time: 'morning', color: 6 },
];
export const QUOTES = [
  'Small steps every day add up to big changes.',
  'You don’t have to be perfect, just consistent.',
  'Motivation gets you going. Habit keeps you growing.',
  'Every day is a fresh page. Water your garden.',
  'Progress, not perfection.',
];

/* ---------- dates ---------- */
const pad = (n) => String(n).padStart(2, '0');
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dateOf = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
export const todayKey = () => keyOf(new Date());
export const monIndex = (k) => (dateOf(k).getDay() + 6) % 7;          // 0 = Monday
export const fmtDay = (k, opts) => dateOf(k).toLocaleDateString('en-GB', opts);
export const nowHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const fmtNum = (v) => String(Math.round(v * 100) / 100);

/* ---------- state ---------- */
// A habit: { id, name, icon, unitIcon, color, time, created, goal, step, unit, reminder, remind,
//   kind: 'count' | 'amount' (litres, water tank) | 'timer' (minutes, start/stop) | 'quit' (days since a slip),
//   freq: 'days' (days[] = Mon..Sun) | 'interval' (every N days from created) | 'weekly' (perWeek times a week) }
export function defaultHabits(created) {
  const all = [1, 1, 1, 1, 1, 1, 1];
  const base = { freq: 'days', days: all, remind: false, created };
  return [
    { ...base, id: 'water', name: 'Drink Water', icon: 'droplet', kind: 'amount', goal: 2.5, step: 0.25, unit: 'L', color: 0, time: 'morning', reminder: '09:00', remind: true },
    { ...base, id: 'workout', name: 'Workout', icon: 'biceps', unitIcon: 'stopwatch', kind: 'timer', goal: 30, step: 10, unit: 'min', color: 1, time: 'morning', days: [1, 1, 1, 1, 1, 1, 0], reminder: '07:30', remind: true },
    { ...base, id: 'read', name: 'Read', icon: 'books', unitIcon: 'open-book', kind: 'count', goal: 20, step: 5, unit: 'pages', color: 2, time: 'evening', reminder: '21:00' },
    { ...base, id: 'meditate', name: 'Meditate', icon: 'person-in-lotus-position', unitIcon: 'cherry-blossom', kind: 'timer', goal: 10, step: 5, unit: 'min', color: 3, time: 'morning', reminder: '07:00' },
    { ...base, id: 'fruit', name: 'Eat Fruit', icon: 'red-apple', unitIcon: 'red-apple', kind: 'count', goal: 3, step: 1, unit: 'fruits', color: 4, time: 'afternoon', reminder: '13:00' },
    { ...base, id: 'journal', name: 'Write Journal', icon: 'memo', unitIcon: 'pencil', kind: 'count', goal: 1, step: 1, unit: 'entry', color: 5, time: 'evening', reminder: '22:00', remind: true },
    { ...base, id: 'run', name: 'Go for a Run', icon: 'running-shoe', kind: 'count', freq: 'weekly', perWeek: 3, goal: 1, step: 1, unit: 'run', color: 6, time: 'afternoon', reminder: '17:30' },
    { ...base, id: 'plants', name: 'Water Plants', icon: 'potted-plant', kind: 'count', freq: 'interval', every: 3, goal: 1, step: 1, unit: 'time', color: 5, time: 'evening', reminder: '19:00' },
    { ...base, id: 'sugar', name: 'No Sweets', icon: 'lollipop', kind: 'quit', goal: 1, step: 1, unit: 'day', color: 3, time: 'afternoon', reminder: '15:00' },
  ];
}

const EXTRA = { rest: {}, frozen: {}, freezes: 1, freezeCheck: null, freezeEarned: null, notes: {}, timer: null, insight: null };

// A brand-new garden: no habits, no history, no name yet.
export function blankState(keep) {
  return {
    v: 3, name: '', buddy: 'bear-orange', habits: [], log: {}, sleep: {}, chat: [], notified: {},
    settings: { dark: matchMedia('(prefers-color-scheme: dark)').matches, accent: 'lavender', sounds: true, reminders: false, focus: false },
    sort: 'time', demo: false, installDismissed: false, ...structuredClone(EXTRA), ...keep,
  };
}

// Older saves predate habit types, rest days and freezes: fill in what's missing.
function normalize(s) {
  Object.entries(EXTRA).forEach(([k, v]) => { if (s[k] === undefined) s[k] = structuredClone(v); });
  s.habits.forEach((h) => { h.kind ||= 'count'; h.freq ||= 'days'; h.days ||= [1, 1, 1, 1, 1, 1, 1]; });
  return s;
}

// Six believable weeks of history, only for the README mock-ups (?demo).
// Sleep drives the odds, so the Patterns card has something real to find.
export function seed() {
  const t = todayKey();
  const habits = defaultHabits(addDays(t, -60));
  let r0 = 20240319;
  const rnd = () => (r0 = (r0 * 9301 + 49297) % 233280) / 233280;
  const log = {}, sleep = {}, notes = {}, rest = {}, frozen = {};
  const state = { v: 3, name: 'Lukman', buddy: 'bear-orange', habits, log, sleep, chat: [], notified: {}, notes, rest, frozen,
    settings: { dark: matchMedia('(prefers-color-scheme: dark)').matches, accent: 'lavender', sounds: true, reminders: false, focus: false },
    sort: 'time', demo: true, installDismissed: false, freezes: 2, freezeCheck: addDays(t, -1), freezeEarned: null, timer: null, insight: null };
  const moods = ['', 'Rough one', 'Okay', 'Felt good', 'Really good', 'Loved it'];
  for (let d = 42; d >= 1; d--) {
    const k = addDays(t, -d);
    log[k] = {};
    const slept = 5.5 + Math.round(rnd() * 7) / 2;
    sleep[addDays(k, -1)] = slept;
    if (d === 19) { rest[k] = true; continue; }       // a sick day
    const strong = d <= 9 && d !== 6;                 // the current streak, with one frozen day in it
    habits.forEach((h) => {
      if (h.kind === 'quit') { if (d === 23 || d === 31) log[k][h.id] = 1; return; }
      if (h.freq === 'days' && !h.days[monIndex(k)]) return;
      if (h.freq === 'interval' && Math.round((dateOf(k) - dateOf(h.created)) / 864e5) % h.every) return;
      const odds = (slept >= 7 ? 0.9 : 0.55) - (h.id === 'read' && slept < 7 ? 0.25 : 0) + (h.freq === 'weekly' ? -0.35 : 0);
      const x = rnd();
      if ((strong && h.freq !== 'weekly') || x < odds) log[k][h.id] = h.goal;
      else if (x < odds + 0.15 && h.goal > h.step) log[k][h.id] = Math.max(h.step, Math.floor((h.goal * rnd()) / h.step) * h.step);
      if (log[k][h.id] && rnd() < 0.18) {
        const m = slept >= 7 ? 4 + Math.round(rnd()) : 2 + Math.round(rnd() * 2);
        (notes[k] ||= {})[h.id] = { mood: m, text: rnd() < 0.5 ? moods[m] : '' };
      }
    });
    if (d === 6) { frozen[k] = true; log[k].journal = 0; }
  }
  log[t] = { water: 1.25, read: 20, meditate: 10, fruit: 3 };
  sleep[addDays(t, -1)] = 8;
  notes[t] = { meditate: { mood: 5, text: 'So calm this morning' } };
  return state;
}

export function load() {
  const params = new URLSearchParams(location.search);
  if (params.has('reset')) { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } }
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // Gardens that started from the old demo history begin again, keeping only preferences.
      if (s && s.v === 3 && s.demo && !params.has('demo')) return blankState({ buddy: s.buddy, settings: s.settings, installDismissed: s.installDismissed, name: s.name === 'Lukman' ? '' : s.name });
      if (s && s.v === 3) return normalize(s);
    }
  } catch (e) { /* storage unavailable: fall through to a blank garden */ }
  return params.has('demo') ? seed() : blankState();
}

export const store = { state: load() };
let saveTimer;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const s = store.state;
      const copy = { ...s, chat: s.chat.filter((m) => !m.typing).map((m) => (m.img ? { ...m, img: null, text: m.text || 'Shared a photo' } : m)).slice(-80) };
      localStorage.setItem(STORE_KEY, JSON.stringify(copy));
    } catch (e) { /* quota or private mode: keep working in memory */ }
  }, 120);
}

/* ---------- derived ---------- */
const S = () => store.state;
const between = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 864e5);
export const habitById = (id) => S().habits.find((h) => h.id === id);
export const val = (h, k) => (S().log[k] && S().log[k][h.id]) || 0;
export const isQuit = (h) => h.kind === 'quit';
export const isWeekly = (h) => h.freq === 'weekly';
// A quit habit is "done" on any day without a slip; everything else when the goal is reached.
export const isDone = (h, k) => (isQuit(h) ? val(h, k) === 0 : val(h, k) >= h.goal - 1e-9);
export const isRest = (k) => !!S().rest[k];
export const isFrozen = (k) => !!S().frozen[k];
export function scheduled(h, k) {
  if (k < h.created) return false;
  if (h.freq === 'interval') return between(h.created, k) % Math.max(1, h.every || 1) === 0;
  if (h.freq === 'weekly' || isQuit(h)) return true;
  return !!h.days[monIndex(k)];
}
const byTime = (a, b) => TIME_ORDER.indexOf(a.time) - TIME_ORDER.indexOf(b.time);
// What shows on a day's list (quit habits live in their own section).
export const habitsOn = (k) => S().habits.filter((h) => !isQuit(h) && scheduled(h, k)).sort(byTime);
export const quitHabits = () => S().habits.filter(isQuit);
// What a day is judged on: no rest day, no weekly habits (they're judged per week).
export const dueOn = (k) => (isRest(k) ? [] : habitsOn(k).filter((h) => !isWeekly(h)));
export function dayStats(k) {
  const list = dueOn(k);
  return { total: list.length, done: list.filter((h) => isDone(h, k)).length };
}
export const perfect = (k) => { const s = dayStats(k); return s.total > 0 && s.done === s.total; };
// Streak days: perfect or protected by a freeze. Rest days and empty days neither count nor break it.
export const kept = (k) => perfect(k) || isFrozen(k);
export const skipped = (k) => !kept(k) && (isRest(k) || dueOn(k).length === 0);
export const color = (h) => COLORS[h.color % COLORS.length];
export const buddy = () => BUDDIES.find((b) => b.id === S().buddy) || BUDDIES[0];
export const stepOf = (h) => (h.kind === 'amount' ? 0.25 : h.step);
export function setVal(h, k, v) {
  const max = h.kind === 'amount' ? h.goal * 2 : h.kind === 'timer' ? Math.max(h.goal * 4, 240) : h.goal;
  v = Math.max(0, Math.min(max, Math.round(v * 1000) / 1000));
  S().log[k] = S().log[k] || {};
  S().log[k][h.id] = v;
  return v;
}
const firstDay = () => S().habits.reduce((m, h) => (h.created < m ? h.created : m), todayKey());

// The run of kept days ending on k (today doesn't break it until it's over).
export function runEnding(k) {
  const start = firstDay(), t = todayKey();
  let n = 0;
  for (let i = 0; i < 730 && k >= start; i++, k = addDays(k, -1)) {
    if (perfect(k)) n++;                              // frozen days hold the streak but don't add to it
    else if (!isFrozen(k) && !skipped(k) && k !== t) break;
  }
  return n;
}
export const streak = () => runEnding(todayKey());
export function bestStreak() {
  let best = 0, run = 0;
  const t = todayKey();
  for (let k = firstDay(); k <= t; k = addDays(k, 1)) {
    if (perfect(k)) best = Math.max(best, ++run);
    else if (!isFrozen(k) && !skipped(k) && k !== t) run = 0;
  }
  return best;
}

// Freezes: when a day ends unkept while a streak is running, a freeze is spent to protect it.
// Returns the days that were frozen so the app can say so.
export function settleDays() {
  const s = S(), t = todayKey(), used = [];
  let k = s.freezeCheck ? addDays(s.freezeCheck, 1) : addDays(t, -1);
  if (between(k, t) > 60) k = addDays(t, -60);
  for (; k < t; k = addDays(k, 1)) {
    if (kept(k) || skipped(k)) continue;
    if (s.freezes > 0 && runEnding(addDays(k, -1)) > 0) { s.freezes--; s.frozen[k] = true; used.push(k); }
  }
  s.freezeCheck = addDays(t, -1);
  return used;
}
// Every 7 days of streak earns a freeze, up to 3 in the bank. Returns true when one was earned.
export function maybeEarnFreeze() {
  const s = S(), t = todayKey(), st = streak();
  if (!st || st % 7 || s.freezes >= 3 || s.freezeEarned === t || !perfect(t)) return false;
  s.freezes++; s.freezeEarned = t;
  return true;
}

// Weekly habits: how many check-ins in the Mon–Sun week holding k.
export function weekCount(h, k) {
  const mon = addDays(k, -monIndex(k));
  let n = 0;
  for (let i = 0; i < 7; i++) { const d = addDays(mon, i); if (d >= h.created && isDone(h, d)) n++; }
  return n;
}
export const weekMet = (h, k) => weekCount(h, k) >= (h.perWeek || 1);
// Quit habits: days since the last slip (or since it started).
export function daysClean(h) {
  const t = todayKey();
  for (let k = t, i = 0; k >= h.created && i < 3650; k = addDays(k, -1), i++) if (!isDone(h, k)) return i;
  return between(h.created, t) + 1;
}

export function habitStreak(h) {
  const t = todayKey();
  if (isQuit(h)) return daysClean(h);
  if (isWeekly(h)) {                                  // in weeks
    let n = weekMet(h, t) ? 1 : 0;
    for (let k = addDays(t, -monIndex(t) - 1); k >= h.created; k = addDays(k, -7)) { if (!weekMet(h, k)) break; n++; }
    return n;
  }
  let n = isDone(h, t) ? 1 : 0;
  for (let i = 1; i < 400; i++) {
    const k = addDays(t, -i);
    if (k < h.created) break;
    if (!scheduled(h, k) || isRest(k)) continue;
    if (isDone(h, k)) n++;
    else if (!isFrozen(k)) break;
  }
  return n;
}
export function habitBest(h) {
  if (isQuit(h)) {
    let best = 0, run = 0;
    for (let k = h.created; k <= todayKey(); k = addDays(k, 1)) { if (isDone(h, k)) best = Math.max(best, ++run); else run = 0; }
    return best;
  }
  if (isWeekly(h)) {
    let best = 0, run = 0, t = todayKey();
    for (let k = addDays(h.created, -monIndex(h.created)); k <= t; k = addDays(k, 7)) {
      if (weekMet(h, k)) best = Math.max(best, ++run); else if (addDays(k, 6) < t) run = 0;
    }
    return best;
  }
  let best = 0, run = 0;
  for (let d = 365; d >= 0; d--) {
    const k = addDays(todayKey(), -d);
    if (!scheduled(h, k) || isRest(k)) continue;
    if (isDone(h, k)) best = Math.max(best, ++run); else if (d && !isFrozen(k)) run = 0;
  }
  return Math.max(best, habitStreak(h));
}
export function habitRate(h, days = 30) {
  const t = todayKey();
  if (isWeekly(h)) {                                  // share of the last 4 full weeks that hit the target
    let met = 0, n = 0;
    for (let w = 1; w <= 4; w++) { const k = addDays(t, -monIndex(t) - 7 * w); if (addDays(k, 6) < h.created) continue; n++; if (weekMet(h, k)) met++; }
    return n ? Math.round((met / n) * 100) : 0;
  }
  let sched = 0, done = 0;
  for (let d = 0; d < days; d++) {
    const k = addDays(t, -d);
    if (!scheduled(h, k) || isRest(k)) continue;
    if (d === 0 && !isDone(h, k)) continue;        // today isn't over yet
    sched++; if (isDone(h, k)) done++;
  }
  return sched ? Math.round((done / sched) * 100) : 0;
}
export function totals() {
  let done = 0, perfectDays = 0;
  Object.keys(S().log).forEach((k) => {
    S().habits.forEach((h) => { if (!isQuit(h) && scheduled(h, k) && val(h, k) > 0 && isDone(h, k)) done++; });
    if (perfect(k)) perfectDays++;
  });
  const xp = done * 10 + perfectDays * 25;
  return { done, perfectDays, xp, level: Math.floor(xp / LEVEL_XP) + 1, into: xp % LEVEL_XP };
}

/* ---------- notes & mood ---------- */
export const MOODS = [
  { v: 1, icon: 'pensive-face', label: 'Rough' }, { v: 2, icon: 'neutral-face', label: 'Meh' }, { v: 3, icon: 'slightly-smiling-face', label: 'Okay' },
  { v: 4, icon: 'smiling-face-with-smiling-eyes', label: 'Good' }, { v: 5, icon: 'star-struck', label: 'Great' },
];
export const noteOf = (h, k) => (S().notes[k] && S().notes[k][h.id]) || null;
export function setNote(h, k, patch) {
  const day = (S().notes[k] ||= {});
  const n = { mood: 0, text: '', ...day[h.id], ...patch };
  if (!n.mood && !n.text.trim()) delete day[h.id]; else day[h.id] = n;
  if (!Object.keys(day).length) delete S().notes[k];
}

/* ---------- patterns: plain statistics the Insights card and the AI build on ---------- */
// Each finding: { icon, text, score }. Needs a couple of weeks of history to say anything.
export function patterns() {
  const t = todayKey(), out = [];
  const days = Array.from({ length: 56 }, (_, i) => addDays(t, -i - 1)).filter((k) => k >= firstDay() && dueOn(k).length);
  if (days.length < 10) return out;
  const pct = (a) => Math.round(a * 100);
  const rate = (ks, h) => {
    const rows = ks.flatMap((k) => (h ? (dueOn(k).includes(h) ? [isDone(h, k)] : []) : dueOn(k).map((x) => isDone(x, k))));
    return rows.length >= 4 ? { r: rows.filter(Boolean).length / rows.length, n: rows.length } : null;
  };
  const slept = (k) => S().sleep[addDays(k, -1)];
  const rested = days.filter((k) => slept(k) >= 7), short = days.filter((k) => slept(k) && slept(k) < 7);
  if (rested.length >= 3 && short.length >= 3) {
    const a = rate(rested), b = rate(short);
    if (a && b && a.r - b.r >= 0.12) out.push({ icon: 'sleeping-face', score: a.r - b.r, text: `After 7h+ of sleep you finish **${pct(a.r)}%** of your habits, vs **${pct(b.r)}%** after shorter nights.` });
    let top = null;
    S().habits.filter((h) => !isQuit(h) && !isWeekly(h)).forEach((h) => {
      const x = rate(rested, h), y = rate(short, h);
      if (x && y && x.r - y.r >= 0.2 && (!top || x.r - y.r > top.d)) top = { h, d: x.r - y.r, x, y };
    });
    if (top) out.push({ icon: top.h.icon, score: top.d, text: `You ${top.h.name.toLowerCase()} far more after a good night: **${pct(top.x.r)}%** of days with 7h+ sleep, **${pct(top.y.r)}%** without.` });
  }
  // habit pairs: does doing A go with doing B?
  const daily = S().habits.filter((h) => !isQuit(h) && h.freq === 'days');
  let pair = null;
  daily.forEach((a) => daily.forEach((b) => {
    if (a === b) return;
    const both = days.filter((k) => dueOn(k).includes(a) && dueOn(k).includes(b));
    const withA = both.filter((k) => isDone(a, k)), noA = both.filter((k) => !isDone(a, k));
    if (withA.length < 6 || noA.length < 4) return;
    const x = withA.filter((k) => isDone(b, k)).length / withA.length, y = noA.filter((k) => isDone(b, k)).length / noA.length;
    if (x - y >= 0.3 && (!pair || x - y > pair.d)) pair = { a, b, x, y, d: x - y };
  }));
  if (pair) out.push({ icon: pair.b.icon, score: pair.d, text: `On days you **${pair.a.name.toLowerCase()}**, you also ${pair.b.name.toLowerCase()} **${pct(pair.x)}%** of the time, vs **${pct(pair.y)}%** when you skip it.` });
  // weekdays
  const names = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
  const wd = names.map((_, i) => rate(days.filter((k) => monIndex(k) === i))).map((x, i) => x && { ...x, i }).filter(Boolean);
  if (wd.length >= 4) {
    wd.sort((a, b) => b.r - a.r);
    const hi = wd[0], lo = wd[wd.length - 1];
    if (hi.r - lo.r >= 0.2) out.push({ icon: 'spiral-calendar', score: (hi.r - lo.r) * 0.9, text: `**${names[hi.i]}** are your strongest days (${pct(hi.r)}%). **${names[lo.i]}** need some love (${pct(lo.r)}%).` });
  }
  // time of day
  const tod = TIME_ORDER.map((tm) => {
    const rows = days.flatMap((k) => dueOn(k).filter((h) => h.time === tm).map((h) => isDone(h, k)));
    return rows.length >= 8 ? { tm, r: rows.filter(Boolean).length / rows.length } : null;
  }).filter(Boolean).sort((a, b) => b.r - a.r);
  if (tod.length >= 2 && tod[0].r - tod.at(-1).r >= 0.15) out.push({ icon: TIMES[tod[0].tm].icon, score: (tod[0].r - tod.at(-1).r) * 0.8, text: `You're a ${tod[0].tm} person: **${pct(tod[0].r)}%** of ${tod[0].tm} habits get done, vs **${pct(tod.at(-1).r)}%** in the ${tod.at(-1).tm}.` });
  // mood
  const moods = S().habits.map((h) => {
    const m = Object.keys(S().notes).map((k) => S().notes[k][h.id]?.mood).filter(Boolean);
    return m.length >= 3 ? { h, avg: m.reduce((a, b) => a + b, 0) / m.length, n: m.length } : null;
  }).filter(Boolean).sort((a, b) => b.avg - a.avg);
  if (moods.length && moods[0].avg >= 3.8) out.push({ icon: 'smiling-face-with-smiling-eyes', score: (moods[0].avg - 3) / 3, text: `**${moods[0].h.name}** lifts your mood most: you rate it **${moods[0].avg.toFixed(1)}/5** on average.` });
  return out.sort((a, b) => b.score - a.score).slice(0, 4);
}

const countDays = (fn) => Object.keys(S().log).filter(fn).length;
export const BADGES = [
  { id: 'early', name: 'Early Bird', icon: '1st-place-medal', b: ['#fff3d6', '#ffe2a8'], goal: 7, desc: 'mornings done',
    cur: () => countDays((k) => habitsOn(k).some((h) => h.time === 'morning' && isDone(h, k))) },
  { id: 'fire', name: 'On Fire', icon: 'fire', b: ['#ffe8dc', '#ffc9ad'], goal: 7, desc: 'day streak', cur: () => bestStreak() },
  { id: 'hydrated', name: 'Hydrated', icon: 'droplet', b: ['#dff4ff', '#b9e6ff'], goal: 10, desc: 'water goals',
    cur: () => countDays((k) => S().habits.some((h) => h.kind === 'amount' && scheduled(h, k) && isDone(h, k))) },
  { id: 'liftoff', name: 'Lift-off', icon: 'rocket', b: ['#ebe8ff', '#d3cdff'], goal: 7, desc: 'active days',
    cur: () => countDays((k) => S().habits.some((h) => !isQuit(h) && val(h, k) > 0)) },
  { id: 'diamond', name: 'Diamond', icon: 'gem-stone', b: ['#e2f7ff', '#c5ecfb'], goal: 15, desc: 'perfect days', cur: () => totals().perfectDays },
  { id: 'champion', name: 'Champion', icon: 'trophy', b: ['#fff3d6', '#ffd98a'], goal: 300, desc: 'habits done', cur: () => totals().done },
  { id: 'royal', name: 'Royalty', icon: 'crown', b: ['#fff0e0', '#ffd5a8'], goal: 10, desc: 'level', cur: () => totals().level },
  { id: 'rainbow', name: 'All-rounder', icon: 'rainbow', b: ['#ffe9f1', '#e5dcff'], goal: 14, desc: 'day streak', cur: () => bestStreak() },
  { id: 'sprout', name: 'First Sprout', icon: 'seedling', b: ['#e4f8e9', '#c3efcf'], goal: 1, desc: 'habit done', cur: () => totals().done },
  { id: 'gardener', name: 'Gardener', icon: 'potted-plant', b: ['#e4f8e9', '#bfe9c9'], goal: 5, desc: 'habits planted', cur: () => S().habits.length },
  { id: 'hattrick', name: 'Hat-trick', icon: '3rd-place-medal', b: ['#ffeede', '#ffd6b5'], goal: 3, desc: 'day streak', cur: () => bestStreak() },
  { id: 'silver', name: 'Silver Streak', icon: '2nd-place-medal', b: ['#eef1f6', '#d6dde8'], goal: 21, desc: 'day streak', cur: () => bestStreak() },
  { id: 'legend', name: 'Legend', icon: 'dragon', b: ['#e2f7ec', '#bdebd2'], goal: 30, desc: 'day streak', cur: () => bestStreak() },
  { id: 'century', name: 'Centurion', icon: 'hundred-points', b: ['#ffe8e8', '#ffcaca'], goal: 100, desc: 'habits done', cur: () => totals().done },
  { id: 'galaxy', name: 'Galaxy Brain', icon: 'milky-way', b: ['#e8e6ff', '#cdc8ff'], goal: 1000, desc: 'habits done', cur: () => totals().done },
  { id: 'owl', name: 'Night Owl', icon: 'owl', b: ['#ebe8ff', '#d6d0ff'], goal: 7, desc: 'evenings done',
    cur: () => countDays((k) => habitsOn(k).some((h) => h.time === 'evening' && isDone(h, k))) },
  { id: 'sunny', name: 'Sunny Side', icon: 'sun-with-face', b: ['#fff6d6', '#ffe9a0'], goal: 7, desc: 'afternoons done',
    cur: () => countDays((k) => habitsOn(k).some((h) => h.time === 'afternoon' && isDone(h, k))) },
  { id: 'dreamer', name: 'Sweet Dreams', icon: 'sleeping-face', b: ['#e2efff', '#c6dcff'], goal: 7, desc: 'nights of 7h+', cur: () => Object.values(S().sleep).filter((h) => h >= 7).length },
  { id: 'weekend', name: 'Weekend Hero', icon: 'sports-medal', b: ['#fff0e0', '#ffdcb5'], goal: 4, desc: 'perfect weekend days', cur: () => countDays((k) => monIndex(k) >= 5 && perfect(k)) },
  { id: 'chatty', name: 'Chatterbox', icon: 'speech-balloon', b: ['#e6f6ff', '#c4e8fb'], goal: 20, desc: 'buddy messages', cur: () => S().chat.filter((m) => m.from === 'me').length },
  { id: 'star', name: 'Shooting Star', icon: 'shooting-star', b: ['#fff3d6', '#ffe0a0'], goal: 5, desc: 'level', cur: () => totals().level },
  { id: 'comet', name: 'Comet', icon: 'comet', b: ['#e9e6ff', '#d2ccff'], goal: 50, desc: 'perfect days', cur: () => totals().perfectDays },
];
export const unlocked = () => BADGES.filter((b) => b.cur() >= b.goal).map((b) => b.id);
export const progressText = (h, v) => `${fmtNum(v)} of ${fmtNum(h.goal)} ${h.unit}`;
