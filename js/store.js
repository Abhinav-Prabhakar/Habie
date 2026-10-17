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
export function defaultHabits(created) {
  const all = [1, 1, 1, 1, 1, 1, 1];
  return [
    { id: 'water', name: 'Drink Water', icon: 'droplet', kind: 'amount', goal: 2.5, step: 0.25, unit: 'L', color: 0, time: 'morning', days: all, reminder: '09:00', remind: true, created },
    { id: 'workout', name: 'Workout', icon: 'biceps', unitIcon: 'stopwatch', kind: 'count', goal: 30, step: 10, unit: 'min', color: 1, time: 'morning', days: [1, 1, 1, 1, 1, 1, 0], reminder: '07:30', remind: true, created },
    { id: 'read', name: 'Read', icon: 'books', unitIcon: 'open-book', kind: 'count', goal: 20, step: 5, unit: 'pages', color: 2, time: 'evening', days: all, reminder: '21:00', remind: false, created },
    { id: 'meditate', name: 'Meditate', icon: 'person-in-lotus-position', unitIcon: 'cherry-blossom', kind: 'count', goal: 10, step: 5, unit: 'min', color: 3, time: 'morning', days: all, reminder: '07:00', remind: false, created },
    { id: 'fruit', name: 'Eat Fruit', icon: 'red-apple', unitIcon: 'red-apple', kind: 'count', goal: 3, step: 1, unit: 'fruits', color: 4, time: 'afternoon', days: all, reminder: '13:00', remind: false, created },
    { id: 'journal', name: 'Write Journal', icon: 'memo', unitIcon: 'pencil', kind: 'count', goal: 1, step: 1, unit: 'entry', color: 5, time: 'evening', days: all, reminder: '22:00', remind: true, created },
  ];
}

// A brand-new garden: no habits, no history, no name yet.
export function blankState(keep) {
  return {
    v: 3, name: '', buddy: 'bear-orange', habits: [], log: {}, sleep: {}, chat: [], notified: {},
    settings: { dark: matchMedia('(prefers-color-scheme: dark)').matches, accent: 'lavender', sounds: true, reminders: false, focus: false },
    sort: 'time', demo: false, installDismissed: false, ...keep,
  };
}

// Six believable weeks of history, only for the README mock-ups (?demo).
export function seed() {
  const t = todayKey();
  const habits = defaultHabits(addDays(t, -60));
  let s = 20240319;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const log = {}, sleep = {};
  for (let d = 42; d >= 1; d--) {
    const k = addDays(t, -d);
    log[k] = {};
    const strong = d <= 4;                         // the current streak
    habits.forEach((h) => {
      if (!h.days[monIndex(k)]) return;
      const r = rnd();
      if (strong || r < (d === 5 ? 0.4 : 0.8)) log[k][h.id] = h.goal;
      else if (r < 0.92) log[k][h.id] = Math.max(h.step, Math.floor((h.goal * rnd()) / h.step) * h.step);
    });
    if (d === 5) log[k].journal = 0;                // break the streak before it
    sleep[k] = 6 + Math.round(rnd() * 6) / 2;
  }
  sleep[addDays(t, -1)] = 8.5;
  log[t] = { water: 1.25, read: 20, meditate: 10, fruit: 3 };
  return {
    v: 3, name: 'Lukman', buddy: 'bear-orange', habits, log, sleep, chat: [], notified: {},
    settings: { dark: matchMedia('(prefers-color-scheme: dark)').matches, accent: 'lavender', sounds: true, reminders: false, focus: false },
    sort: 'time', demo: true, installDismissed: false,
  };
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
      if (s && s.v === 3) return s;
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
export const habitById = (id) => S().habits.find((h) => h.id === id);
export const val = (h, k) => (S().log[k] && S().log[k][h.id]) || 0;
export const isDone = (h, k) => val(h, k) >= h.goal - 1e-9;
export const scheduled = (h, k) => k >= h.created && !!h.days[monIndex(k)];
export const habitsOn = (k) => S().habits.filter((h) => scheduled(h, k))
  .sort((a, b) => TIME_ORDER.indexOf(a.time) - TIME_ORDER.indexOf(b.time));
export function dayStats(k) {
  const list = habitsOn(k);
  return { total: list.length, done: list.filter((h) => isDone(h, k)).length };
}
export const perfect = (k) => { const s = dayStats(k); return s.total > 0 && s.done === s.total; };
export const color = (h) => COLORS[h.color % COLORS.length];
export const buddy = () => BUDDIES.find((b) => b.id === S().buddy) || BUDDIES[0];
export const stepOf = (h) => (h.kind === 'amount' ? 0.25 : h.step);
export function setVal(h, k, v) {
  v = Math.max(0, Math.min(h.kind === 'amount' ? h.goal * 2 : h.goal, Math.round(v * 1000) / 1000));
  S().log[k] = S().log[k] || {};
  S().log[k][h.id] = v;
  return v;
}

export function streak() {
  let k = todayKey(), n = 0;
  if (perfect(k)) n++;
  k = addDays(k, -1);
  while (perfect(k)) { n++; k = addDays(k, -1); }
  return n;
}
export function bestStreak() {
  let best = 0, run = 0;
  for (let d = 90; d >= 0; d--) {
    const k = addDays(todayKey(), -d);
    if (perfect(k)) best = Math.max(best, ++run); else if (d) run = 0;
  }
  return best;
}
export function habitStreak(h) {
  let n = isDone(h, todayKey()) ? 1 : 0;
  for (let i = 1; i < 400; i++) {
    const k = addDays(todayKey(), -i);
    if (k < h.created) break;
    if (!scheduled(h, k)) continue;
    if (!isDone(h, k)) break;
    n++;
  }
  return n;
}
export function habitBest(h) {
  let best = 0, run = 0;
  for (let d = 120; d >= 0; d--) {
    const k = addDays(todayKey(), -d);
    if (!scheduled(h, k)) continue;
    if (isDone(h, k)) best = Math.max(best, ++run); else if (d) run = 0;
  }
  return Math.max(best, habitStreak(h));
}
export function habitRate(h, days = 30) {
  let sched = 0, done = 0;
  for (let d = 0; d < days; d++) {
    const k = addDays(todayKey(), -d);
    if (!scheduled(h, k)) continue;
    if (d === 0 && !isDone(h, k)) continue;        // today isn't over yet
    sched++; if (isDone(h, k)) done++;
  }
  return sched ? Math.round((done / sched) * 100) : 0;
}
export function totals() {
  let done = 0, perfectDays = 0;
  Object.keys(S().log).forEach((k) => {
    S().habits.forEach((h) => { if (scheduled(h, k) && isDone(h, k)) done++; });
    if (perfect(k)) perfectDays++;
  });
  const xp = done * 10 + perfectDays * 25;
  return { done, perfectDays, xp, level: Math.floor(xp / LEVEL_XP) + 1, into: xp % LEVEL_XP };
}
const countDays = (fn) => Object.keys(S().log).filter(fn).length;
export const BADGES = [
  { id: 'early', name: 'Early Bird', icon: '1st-place-medal', b: ['#fff3d6', '#ffe2a8'], goal: 7, desc: 'mornings done',
    cur: () => countDays((k) => habitsOn(k).some((h) => h.time === 'morning' && isDone(h, k))) },
  { id: 'fire', name: 'On Fire', icon: 'fire', b: ['#ffe8dc', '#ffc9ad'], goal: 7, desc: 'day streak', cur: () => bestStreak() },
  { id: 'hydrated', name: 'Hydrated', icon: 'droplet', b: ['#dff4ff', '#b9e6ff'], goal: 10, desc: 'water goals',
    cur: () => { const w = habitById('water'); return w ? countDays((k) => isDone(w, k)) : 0; } },
  { id: 'liftoff', name: 'Lift-off', icon: 'rocket', b: ['#ebe8ff', '#d3cdff'], goal: 7, desc: 'active days',
    cur: () => countDays((k) => S().habits.some((h) => val(h, k) > 0)) },
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
