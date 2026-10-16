// Habie — a small habit tracker.
// Everything lives in one persisted `state` object; render functions read it and patch the DOM.
// Screens are laid out on a 541-unit-wide design canvas and zoomed to fit the app column.
(function () {
  'use strict';

  /* =========================================================================
     Constants
     ========================================================================= */
  const DESIGN_WIDTH = 541;
  const DESIGN_HEIGHT = 1172;
  const MAX_APP_WIDTH = 440;
  const STORE_KEY = 'habie.v2';
  const TAB_ROUTES = ['home', 'tracker', 'habits', 'settings'];
  const ROUTES = [...TAB_ROUTES, 'chat', 'habit', 'new', 'edit'];
  const ICON = (name) => `assets/3d/${name}.png`;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TIMES = {
    morning:   { label: 'Morning',   icon: 'sunrise' },
    afternoon: { label: 'Afternoon', icon: 'sun' },
    evening:   { label: 'Evening',   icon: 'crescent-moon' },
  };
  const TIME_ORDER = ['morning', 'afternoon', 'evening'];
  const COLORS = ['#18b7f2', '#fb8c3c', '#7b6cf6', '#f0679b', '#f25a5a', '#22ae63', '#e9b200'];
  const ACCENTS = { lavender: 'Lavender', peach: 'Peach', mint: 'Mint', rose: 'Rose' };
  const BUDDIES = [
    { id: 'bear-orange', name: 'Nino' }, { id: 'frog', name: 'Ribbit' }, { id: 'fox', name: 'Foxy' },
    { id: 'panda', name: 'Bamboo' }, { id: 'penguin', name: 'Pip' }, { id: 'owl', name: 'Hoot' }, { id: 'unicorn', name: 'Sparkle' },
  ];
  const NEW_ICONS = ['running-shoe', 'books', 'person-in-lotus-position', 'droplet', 'green-salad', 'bed', 'toothbrush',
    'guitar', 'pill', 'mobile-phone-off', 'brain', 'headphone', 'sunflower', 'pencil', 'teacup-without-handle', 'footprints', 'broccoli', 'carrot'];
  const IDEAS = [
    { name: 'Morning run', icon: 'running-shoe', time: 'morning', color: 1 },
    { name: 'No phone in bed', icon: 'mobile-phone-off', time: 'evening', color: 2 },
    { name: 'Floss', icon: 'toothbrush', time: 'evening', color: 0 },
    { name: 'Eat greens', icon: 'green-salad', time: 'afternoon', color: 5 },
    { name: 'Practice guitar', icon: 'guitar', time: 'evening', color: 3 },
    { name: 'Vitamins', icon: 'pill', time: 'morning', color: 6 },
  ];
  const QUOTES = [
    'Small steps every day add up to big changes.',
    'You don’t have to be perfect, just consistent.',
    'Motivation gets you going. Habit keeps you growing.',
    'Every day is a fresh page. Water your garden.',
    'Progress, not perfection.',
  ];
  const TIPS = [
    'Stack a new habit onto an old one: “After I pour my coffee, I’ll drink a glass of water.”',
    'Make it tiny. Two minutes of reading still counts and keeps the streak alive.',
    'Put your cues where you can see them — shoes by the door, a book on your pillow.',
    'Missed a day? Never miss twice. One slip is an accident, two is a new habit.',
    'Track it right after you do it. The little check is part of the reward.',
    'Pair something you need to do with something you love, like a podcast on your walk.',
  ];
  const LEVEL_XP = 400;

  /* =========================================================================
     Dates
     ========================================================================= */
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const todayKey = () => keyOf(new Date());
  const monIndex = (k) => (dateOf(k).getDay() + 6) % 7;         // 0 = Monday
  const fmtDay = (k, opts) => dateOf(k).toLocaleDateString('en-GB', opts);

  /* =========================================================================
     State
     ========================================================================= */
  function defaultHabits(created) {
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

  // A believable six weeks of history so the app feels alive on first launch.
  function seed() {
    const t = todayKey();
    const created = addDays(t, -60);
    const habits = defaultHabits(created);
    let s = 20240319;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const log = {}, sleep = {};
    for (let d = 42; d >= 1; d--) {
      const k = addDays(t, -d);
      log[k] = {};
      const strong = d <= 4;                        // the current streak
      habits.forEach((h) => {
        if (!h.days[monIndex(k)]) return;
        const r = rnd();
        if (strong || r < (d === 5 ? 0.4 : 0.8)) log[k][h.id] = h.goal;
        else if (r < 0.92) log[k][h.id] = Math.max(h.step, Math.floor((h.goal * rnd()) / h.step) * h.step);
      });
      if (d === 5) log[k].journal = 0;               // break the streak before it
      sleep[k] = 6 + Math.round(rnd() * 6) / 2;
    }
    sleep[addDays(t, -1)] = 8.5;
    log[t] = { water: 1.25, read: 20, meditate: 10, fruit: 3, journal: 1 };
    return {
      v: 2, name: 'Lukman', buddy: 'bear-orange', habits, log, sleep, chat: [], notified: {},
      settings: { dark: matchMedia('(prefers-color-scheme: dark)').matches, accent: 'lavender', sounds: true, reminders: false, focus: false },
      sort: 'time', demo: true,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.v === 2) return s; }
    } catch (e) { /* storage unavailable: fall through to fresh state */ }
    return seed();
  }
  let state = load();
  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const copy = { ...state, chat: state.chat.map((m) => (m.img ? { ...m, img: null, text: m.text || 'Shared a photo' } : m)).slice(-60) };
        localStorage.setItem(STORE_KEY, JSON.stringify(copy));
      } catch (e) { /* quota or privacy mode: keep working in memory */ }
    }, 150);
  }

  /* =========================================================================
     Derived data
     ========================================================================= */
  const habitById = (id) => state.habits.find((h) => h.id === id);
  const val = (h, k) => (state.log[k] && state.log[k][h.id]) || 0;
  const isDone = (h, k) => val(h, k) >= h.goal - 1e-9;
  const scheduled = (h, k) => k >= h.created && !!h.days[monIndex(k)];
  const habitsOn = (k) => state.habits.filter((h) => scheduled(h, k))
    .sort((a, b) => TIME_ORDER.indexOf(a.time) - TIME_ORDER.indexOf(b.time));
  function dayStats(k) {
    const list = habitsOn(k);
    return { total: list.length, done: list.filter((h) => isDone(h, k)).length };
  }
  const perfect = (k) => { const s = dayStats(k); return s.total > 0 && s.done === s.total; };
  const color = (h) => COLORS[h.color % COLORS.length];

  function streak() {
    let k = todayKey(), n = 0;
    if (perfect(k)) n++;
    k = addDays(k, -1);
    while (perfect(k)) { n++; k = addDays(k, -1); }
    return n;
  }
  function bestStreak() {
    let best = 0, run = 0;
    for (let d = 90; d >= 0; d--) {
      const k = addDays(todayKey(), -d);
      if (perfect(k)) best = Math.max(best, ++run); else if (d) run = 0;
    }
    return best;
  }
  function habitStreak(h) {
    let k = todayKey(), n = 0;
    if (isDone(h, k)) n++;
    for (let i = 1; i < 400; i++) {
      k = addDays(todayKey(), -i);
      if (k < h.created) break;
      if (!scheduled(h, k)) continue;
      if (!isDone(h, k)) break;
      n++;
    }
    return n;
  }
  function habitBest(h) {
    let best = 0, run = 0;
    for (let d = 120; d >= 0; d--) {
      const k = addDays(todayKey(), -d);
      if (!scheduled(h, k)) continue;
      if (isDone(h, k)) best = Math.max(best, ++run); else if (d) run = 0;
    }
    return best;
  }
  function habitRate(h, days = 30) {
    let sched = 0, done = 0;
    for (let d = 0; d < days; d++) {
      const k = addDays(todayKey(), -d);
      if (!scheduled(h, k)) continue;
      if (d === 0 && !isDone(h, k)) continue;      // today isn't over yet
      sched++; if (isDone(h, k)) done++;
    }
    return sched ? Math.round((done / sched) * 100) : 0;
  }
  function totals() {
    let done = 0, perfectDays = 0;
    Object.keys(state.log).forEach((k) => {
      state.habits.forEach((h) => { if (scheduled(h, k) && isDone(h, k)) done++; });
      if (perfect(k)) perfectDays++;
    });
    const xp = done * 10 + perfectDays * 25;
    return { done, perfectDays, xp, level: Math.floor(xp / LEVEL_XP) + 1, into: xp % LEVEL_XP };
  }
  function countDays(fn) { return Object.keys(state.log).filter(fn).length; }
  const BADGES = [
    { id: 'early', name: 'Early Bird', icon: '1st-place-medal', b: ['#fff3d6', '#ffe2a8'], goal: 7, desc: 'mornings done',
      cur: () => countDays((k) => habitsOn(k).some((h) => h.time === 'morning' && isDone(h, k))) },
    { id: 'fire', name: 'On Fire', icon: 'fire', b: ['#ffe8dc', '#ffc9ad'], goal: 7, desc: 'day streak', cur: () => bestStreak() },
    { id: 'hydrated', name: 'Hydrated', icon: 'droplet', b: ['#dff4ff', '#b9e6ff'], goal: 10, desc: 'water goals',
      cur: () => { const w = habitById('water'); return w ? countDays((k) => isDone(w, k)) : 0; } },
    { id: 'liftoff', name: 'Lift-off', icon: 'rocket', b: ['#ebe8ff', '#d3cdff'], goal: 7, desc: 'active days',
      cur: () => countDays((k) => state.habits.some((h) => val(h, k) > 0)) },
    { id: 'diamond', name: 'Diamond', icon: 'gem-stone', b: ['#e2f7ff', '#c5ecfb'], goal: 15, desc: 'perfect days', cur: () => totals().perfectDays },
    { id: 'champion', name: 'Champion', icon: 'trophy', b: ['#fff3d6', '#ffd98a'], goal: 300, desc: 'habits done', cur: () => totals().done },
    { id: 'royal', name: 'Royalty', icon: 'crown', b: ['#fff0e0', '#ffd5a8'], goal: 10, desc: 'level', cur: () => totals().level },
    { id: 'rainbow', name: 'All-rounder', icon: 'rainbow', b: ['#ffe9f1', '#e5dcff'], goal: 14, desc: 'day streak', cur: () => bestStreak() },
  ];
  const unlocked = () => BADGES.filter((b) => b.cur() >= b.goal).map((b) => b.id);

  const fmtNum = (v) => (Math.round(v * 100) / 100).toString();
  function amountText(h, v) {
    return h.kind === 'amount' ? `${fmtNum(v)} / ${fmtNum(h.goal)} ${h.unit}` : `${fmtNum(v)} / ${fmtNum(h.goal)} ${h.unit}`;
  }
  const buddy = () => BUDDIES.find((b) => b.id === state.buddy) || BUDDIES[0];

  /* =========================================================================
     DOM helpers
     ========================================================================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app'), stage = $('#stage'), tabbar = $('.tabbar');
  const screens = $$('.screen');
  const screenOf = (r) => $(`.screen[data-route="${r === 'edit' ? 'new' : r}"]`);
  let scale = 1;
  const checkSvg = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4 9.3 3.3 3.2L14 5.8"/></svg>';

  // Animate a number from its previous value; keeps the "count-up" feel on every update.
  function countTo(el, to, decimals = 0, suffix = '') {
    if (!el) return;
    const from = parseFloat(el.dataset.v || '0');
    el.dataset.v = to;
    const fmt = (v) => String(decimals ? Math.round(v * 10 ** decimals) / 10 ** decimals : Math.round(v));
    if (REDUCED || from === to) { el.textContent = fmt(to) + suffix; return; }
    const start = performance.now(), dur = 700;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * e;
      el.textContent = fmt(v) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const ring = (pct, size = 40, stroke = 4) => {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" class="ring-track" stroke-width="${stroke}"/>` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--hc)" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c * Math.min(1, pct)} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  };

  // Which unit just changed — lets a render add a one-off "pop" to exactly that element.
  let lastChange = { id: null, at: 0 };
  const justChanged = (h) => lastChange.id === h.id && performance.now() - lastChange.at < 600;

  /* =========================================================================
     Render: shared
     ========================================================================= */
  function applyTheme() {
    const root = document.documentElement;
    root.dataset.mode = state.settings.dark ? 'dark' : 'light';
    root.dataset.accent = state.settings.accent;
    $('meta[name=theme-color]').content = getComputedStyle(root).getPropertyValue('--h1').trim() || '#7372c8';
  }
  function renderBuddy() {
    const b = buddy();
    $$('[data-buddy-img]').forEach((img) => { img.src = ICON(b.id); });
    $$('[data-buddy-name]').forEach((el) => { el.textContent = b.name; });
  }

  /* =========================================================================
     Render: home
     ========================================================================= */
  function homeRow(h, k) {
    const v = val(h, k), done = isDone(h, k), pct = v / h.goal;
    const sub = h.kind === 'amount' ? `${fmtNum(v)} of ${fmtNum(h.goal)} L` :
      h.goal > 1 ? `${fmtNum(v)} of ${fmtNum(h.goal)} ${h.unit}` : (done ? 'Done today' : TIMES[h.time].label);
    return `<a class="habit${done ? ' is-done' : ''}${justChanged(h) ? ' just' : ''}" href="#habit/${h.id}" style="--hc:${color(h)}">
      <span class="h-ic"><img src="${ICON(h.icon)}" alt=""></span>
      <span class="h-text"><span class="h-t">${esc(h.name)}</span><span class="h-s">${sub}</span></span>
      <button class="h-check${done ? ' done' : ''}" data-step-habit="${h.id}" aria-label="Log ${esc(h.name)}">${ring(pct, 44, 4)}<span class="h-check-in">${done ? checkSvg : '<b>+</b>'}</span></button>
    </a>`;
  }
  function renderHome() {
    const k = todayKey(), list = habitsOn(k), stats = dayStats(k);
    const hour = new Date().getHours();
    const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    $('#greet').textContent = `Hey, ${state.name}`;
    $('#greet-sub').textContent = stats.total && stats.done === stats.total ? 'Every habit done. Amazing!' :
      { morning: 'Ready for a good day?', afternoon: 'Keep the momentum going', evening: 'Time to wind down gently' }[part];
    $('#home-bubble').textContent = stats.done === 0 ? 'Let’s start small!' : stats.done === stats.total ? 'Perfect day!' :
      stats.done / stats.total >= 0.5 ? 'More than halfway!' : 'Nice start!';

    // stat cards
    const w = habitById('water');
    const wv = w ? val(w, k) : 0, wg = w ? w.goal : 2.5;
    countTo($('#st-water'), wv, 2);
    $('#st-water-goal').textContent = `of ${fmtNum(wg)} L`;
    $('#st-water-bar').style.width = Math.min(100, (wv / wg) * 100) + '%';
    const sl = state.sleep[addDays(k, -1)] || 0;
    countTo($('#st-sleep'), sl, 1);
    $('#st-sleep-bar').style.width = Math.min(100, (sl / 9) * 100) + '%';
    $('#st-sleep-sub').textContent = sl ? (sl >= 7 ? 'well rested' : 'a bit short') : 'tap to log';
    const wo = habitById('workout');
    const ev = wo ? val(wo, k) : 0, eg = wo ? wo.goal : 30;
    countTo($('#st-ex'), ev);
    $('#st-ex-bar').style.width = Math.min(100, (ev / eg) * 100) + '%';
    $('#st-ex-sub').textContent = `of ${eg} min`;

    // progress card
    $('#pc-bar').innerHTML = list.map((h, i) =>
      `<span class="seg${i < stats.done ? ' on' : ''}" style="--d:${i * 60}ms">${i === stats.done - 1 ? '<i></i>' : ''}</span>`).join('') +
      `<b>${stats.done}/${stats.total}</b>`;
    const left = stats.total - stats.done;
    const next = list.find((h) => !isDone(h, k));
    $('#pc-left').textContent = !stats.total ? 'No habits yet' : left ? `${left} habit${left > 1 ? 's' : ''} left` : 'All done!';
    $('#pc-next').innerHTML = next ? `<em>Next:</em> ${esc(next.name)}` : '<em>Next:</em> Rest &amp; recharge';

    // list
    let rows = list;
    const hidden = state.settings.focus ? rows.filter((h) => isDone(h, k)).length : 0;
    if (state.settings.focus) rows = rows.filter((h) => !isDone(h, k));
    $('#home-list').innerHTML = rows.map((h) => homeRow(h, k)).join('') +
      (hidden ? `<div class="focus-note"><img src="${ICON('high-voltage')}" alt="">Focus mode · ${hidden} finished habit${hidden > 1 ? 's' : ''} hidden</div>` : '') +
      (!list.length ? emptyState('Plant your first habit', 'Tiny habits grow into big changes.') : '');

    // bell dot: a reminder time has passed for an unfinished habit
    const now = `${pad(hour)}:${pad(new Date().getMinutes())}`;
    $('#bell-dot').classList.toggle('on', list.some((h) => h.remind && h.reminder <= now && !isDone(h, k)));
  }
  const emptyState = (title, sub) =>
    `<div class="empty"><img src="${ICON('seedling')}" alt=""><b>${title}</b><span>${sub}</span><a class="empty-btn" href="#new">New habit</a></div>`;

  /* =========================================================================
     Render: tracker
     ========================================================================= */
  function renderTracker() {
    const t = todayKey(), st = streak();
    countTo($('#sk-title'), st, 0, st === 1 ? ' Day Streak' : ' Days Streak');
    const ts = dayStats(t);
    $('#sk-sub').textContent = st === 0 ? 'Finish today to start a streak' : st >= 7 ? 'Unstoppable!' : st >= 3 ? 'Rise and Good' : 'Off to a great start';

    // This week (Sun..Sat), with a pink track behind the current streak.
    const sunday = addDays(t, -dateOf(t).getDay());
    const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
    let runEnd = -1, runStart = -1;
    days.forEach((k, i) => { if (k <= t && perfect(k)) { if (runStart < 0 || i !== runEnd + 1) runStart = i; runEnd = i; } });
    const runIsCurrent = runEnd >= 0 && (days[runEnd] === t || days[runEnd] === addDays(t, -1));
    const track = runIsCurrent ? `<span class="sk-track" style="left:${(runStart / 7) * 100}%;width:${((runEnd - runStart + 1) / 7) * 100}%"></span><span class="sk-line" style="left:${((runStart + 0.5) / 7) * 100}%;width:${((runEnd - runStart) / 7) * 100}%"></span>` : '';
    $('#sk-week').innerHTML = track + days.map((k) => {
      const isT = k === t, label = fmtDay(k, { weekday: 'short' });
      let dot;
      if (k > t) dot = `<span class="num">${dateOf(k).getDate()}</span>`;
      else if (perfect(k)) dot = `<span class="dot${isT ? ' big' : ''}">${checkSvg}</span>`;
      else if (isT) dot = `<span class="dot pending"><i style="--p:${ts.total ? ts.done / ts.total : 0}"></i></span>`;
      else dot = '<span class="dot miss"></span>';
      return `<div class="sk-day${isT ? ' today' : ''}"><span class="sk-l">${label}</span>${dot}</div>`;
    }).join('');
    $('#sk-foot').textContent = `${ts.done} / ${ts.total} Habits completed today`;

    // sleep (last 7 nights)
    const nights = Array.from({ length: 7 }, (_, i) => addDays(t, i - 7));
    const vals = nights.map((k) => state.sleep[k] || 0);
    $('#sleep-bars').innerHTML = nights.map((k, i) =>
      `<span class="bar"><i style="--h:${Math.min(100, (vals[i] / 10) * 100)}%;--d:${i * 50}ms"></i><em>${fmtDay(addDays(k, 1), { weekday: 'narrow' })}</em></span>`).join('');
    const logged = vals.filter(Boolean);
    $('#sleep-avg').textContent = logged.length ? `${(logged.reduce((a, b) => a + b, 0) / logged.length).toFixed(1)}h average` : 'Tap to log sleep';

    // week score
    let sched = 0, done = 0;
    days.filter((k) => k <= t).forEach((k) => { const s = dayStats(k); sched += s.total; done += s.done; });
    const pct = sched ? Math.round((done / sched) * 100) : 0;
    $('#wk-ring').setAttribute('stroke-dasharray', `${(pct / 100) * 220} 220`);
    countTo($('#wk-pct'), pct, 0, '%');
    $('#wk-sub').textContent = `${done} of ${sched} check-ins`;

    // last 7 days per habit
    const last7 = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
    let list = state.habits.slice();
    const score = (h) => last7.filter((k) => scheduled(h, k) && isDone(h, k)).length;
    if (state.sort === 'best') list.sort((a, b) => score(b) - score(a));
    else if (state.sort === 'worst') list.sort((a, b) => score(a) - score(b));
    else list.sort((a, b) => TIME_ORDER.indexOf(a.time) - TIME_ORDER.indexOf(b.time));
    $('#tr-sort-label').textContent = { time: 'By time of day', best: 'Strongest first', worst: 'Needs love first' }[state.sort];
    $('#tr-list').innerHTML = list.map((h) => {
      const s = last7.filter((k) => scheduled(h, k)), d = score(h);
      const q = s.length ? d / s.length : 0;
      const label = q >= 0.85 ? 'Great' : q >= 0.5 ? 'Good' : 'Poor';
      return `<a class="card wcard" href="#habit/${h.id}" style="--hc:${color(h)}">
        <span class="w-ic"><img src="${ICON(h.icon)}" alt=""></span>
        <span class="w-t">${esc(h.name)}</span><span class="w-q q-${label.toLowerCase()}">${label}</span>
        <span class="w-segs">${last7.map((k, i) => `<i class="${!scheduled(h, k) ? 'off' : isDone(h, k) ? 'on' : val(h, k) > 0 ? 'part' : ''}" style="--d:${i * 40}ms"></i>`).join('')}</span>
        <span class="w-badge">${d}/${s.length}</span>
      </a>`;
    }).join('') || emptyState('Nothing to track yet', 'Add a habit and your week will show up here.');
  }

  /* =========================================================================
     Render: habits (garden)
     ========================================================================= */
  let viewDay = todayKey();
  let filter = 'all';
  function renderHabits() {
    const t = todayKey(), k = viewDay;
    $('#habits-date').textContent = k === t ? `Today, ${fmtDay(k, { day: 'numeric', month: 'long' })}` : fmtDay(k, { weekday: 'long', day: 'numeric', month: 'long' });

    const sunday = addDays(t, -dateOf(t).getDay());
    $('#week-strip').innerHTML = Array.from({ length: 7 }, (_, i) => addDays(sunday, i)).map((d) => {
      const cls = ['wday', d === t && 'today', d === k && 'sel', d > t && 'future', d <= t && perfect(d) && 'done'].filter(Boolean).join(' ');
      return `<button class="${cls}" data-day="${d}" ${d > t ? 'disabled' : ''}><span>${fmtDay(d, { weekday: 'short' })}</span><b>${dateOf(d).getDate()}</b>${d <= t && perfect(d) ? '<i></i>' : ''}</button>`;
    }).join('');

    // garden ring
    const list = habitsOn(k), n = list.length, done = list.filter((h) => isDone(h, k)).length;
    const R = 118, C = 2 * Math.PI * R, gap = n > 1 ? 26 : 0, seg = n ? C / n : C;
    $('#garden-ring').innerHTML = `<circle cx="150" cy="150" r="${R}" fill="none" class="ring-track" stroke-width="14" opacity="${n ? 0 : 1}"/>` +
      list.map((h, i) => `<circle cx="150" cy="150" r="${R}" fill="none" stroke="${isDone(h, k) ? color(h) : 'var(--ring-off)'}" stroke-width="14" stroke-linecap="round"
        stroke-dasharray="${Math.max(0.1, seg - gap)} ${C}" transform="rotate(${-90 + (i * 360) / n + (gap / C) * 180} 150 150)"/>`).join('');
    $('#garden-orbit').innerHTML = list.map((h, i) => {
      const a = ((-90 + (i + 0.5) * (360 / n)) * Math.PI) / 180;
      return `<a class="orbit-ic${isDone(h, k) ? ' on' : ''}${justChanged(h) ? ' just' : ''}" href="#habit/${h.id}" style="left:${150 + R * Math.cos(a)}px;top:${150 + R * Math.sin(a)}px"><img src="${ICON(h.icon)}" alt="${esc(h.name)}"></a>`;
    }).join('');
    const ratio = n ? done / n : 0;
    const plant = n && done === n ? 'sunflower' : ratio >= 0.6 ? 'potted-plant' : ratio >= 0.3 ? 'herb' : 'seedling';
    const img = $('#garden-plant');
    if (!img.src.endsWith(plant + '.png')) {
      img.src = ICON(plant);
      if (!REDUCED) img.animate([{ scale: 0.4, opacity: 0 }, { scale: 1.1, opacity: 1 }, { scale: 1 }], { duration: 650, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    }
    img.style.setProperty('--grow', 0.72 + 0.28 * ratio);
    $('#garden-count').innerHTML = `<b>${done}</b>/${n}`;
    $('#garden-msg').textContent = !n ? 'Nothing planted for this day.' : done === n ? 'Full bloom! Every habit done.' :
      ratio >= 0.5 ? 'Your garden is blooming. Keep it up!' : 'Water your habits to help it grow.';
    $('#back-today').hidden = k === t;
    $('#garden-insights').hidden = k !== t;

    // cards
    let cards = list.filter((h) => filter === 'all' || h.time === filter);
    const hidden = state.settings.focus ? cards.filter((h) => isDone(h, k)).length : 0;
    if (state.settings.focus) cards = cards.filter((h) => !isDone(h, k));
    $('#habit-grid').innerHTML = cards.map((h) => {
      const v = val(h, k), pct = Math.min(1, v / h.goal), done = isDone(h, k);
      const steps = Math.round(h.goal / h.step);
      const visual = h.kind === 'amount'
        ? `<span class="hc-amount"><b>${fmtNum(v)}</b> / ${fmtNum(h.goal)} L</span>`
        : `<span class="hc-pips${steps > 5 ? ' many' : ''}">${Array.from({ length: Math.min(steps, 8) }, (_, i) =>
            `<img class="${i < Math.round(v / h.step) ? 'on' : ''}" src="${ICON(h.unitIcon || h.icon)}" alt="">`).join('')}</span>`;
      return `<a class="hcard${done ? ' is-done' : ''}${justChanged(h) ? ' just' : ''}" href="#habit/${h.id}" style="--hc:${color(h)}">
        <span class="hc-blob"><img src="${ICON(h.icon)}" alt=""></span>
        <span class="hc-streak"><img src="${ICON('fire')}" alt="">${habitStreak(h)}</span>
        <span class="hc-name">${esc(h.name)}</span>
        <span class="hc-time"><img src="${ICON(TIMES[h.time].icon)}" alt="">${TIMES[h.time].label}</span>
        ${visual}
        <span class="hc-bar"><i style="width:${pct * 100}%"></i></span>
        <button class="hc-check${done ? ' done' : ''}" data-step-habit="${h.id}" data-day="${k}" aria-label="Log ${esc(h.name)}">${done ? checkSvg : '<b>+</b>'}</button>
      </a>`;
    }).join('') + (hidden ? `<div class="focus-note wide"><img src="${ICON('high-voltage')}" alt="">${hidden} finished habit${hidden > 1 ? 's' : ''} hidden</div>` : '') +
      `<a class="hcard hcard-add" href="#new"><span class="add-plus">+</span><span>New habit</span></a>`;
  }

  /* =========================================================================
     Render: habit detail
     ========================================================================= */
  let currentId = 'water';
  function renderDetail() {
    const h = habitById(currentId);
    if (!h) return;
    const k = todayKey(), v = val(h, k), done = isDone(h, k), pct = Math.min(1, v / h.goal);
    const scr = screenOf('habit');
    scr.style.setProperty('--hc', color(h));
    $('#d-icon').src = ICON(h.icon);
    $('#d-name').textContent = h.name;
    $('#d-time').innerHTML = `<img src="${ICON(TIMES[h.time].icon)}" alt="">${TIMES[h.time].label}`;
    const days = h.days.filter(Boolean).length;
    $('#d-streak-pill').innerHTML = `<img src="${ICON('calendar')}" alt="">${days === 7 ? 'Every day' : days + ' days a week'}`;
    $('#d-wave').style.setProperty('--fill', pct);
    countTo($('#d-pct'), Math.round(pct * 100), 0, '%');
    $('#d-count').textContent = h.kind === 'amount' ? `${fmtNum(v)} of ${fmtNum(h.goal)} L` : `${fmtNum(v)} of ${fmtNum(h.goal)} ${h.unit}`;

    if (h.kind === 'amount') {
      $('#d-units').innerHTML = '';
      $('#d-amounts').innerHTML = `
        <div class="litre-gauge"><i style="width:${pct * 100}%"></i>${[0.25, 0.5, 0.75].map((m) => `<span class="tick" style="left:${m * 100}%"></span>`).join('')}</div>
        <div class="gauge-l"><span>0 L</span><span>${fmtNum(h.goal / 2)} L</span><span>${fmtNum(h.goal)} L</span></div>
        <div class="amount-btns">
          <button class="amt minus" data-amount="-0.25" aria-label="Remove 250 ml"><svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 10h12"/></svg></button>
          ${[0.1, 0.25, 0.5].map((a) => `<button class="amt" data-amount="${a}"><img src="${ICON('droplet')}" alt="" style="width:${18 + a * 30}px">+${a * 1000} ml</button>`).join('')}
        </div>`;
    } else {
      $('#d-amounts').innerHTML = '';
      const steps = Math.round(h.goal / h.step), filled = Math.round(v / h.step);
      $('#d-units').innerHTML = Array.from({ length: steps }, (_, i) =>
        `<button class="unit${i < filled ? ' on' : ''}${justChanged(h) && i === filled - 1 ? ' pop' : ''}" data-unit="${i}" aria-label="${(i + 1) * h.step} ${h.unit}"><img src="${ICON(h.unitIcon || h.icon)}" alt=""><em>${fmtNum((i + 1) * h.step)}</em></button>`).join('');
    }
    $('#d-log').textContent = done ? 'Done for today' : h.kind === 'amount' ? 'Log 250 ml' : `Log ${fmtNum(h.step)} ${h.step === 1 && h.goal === 1 ? '' : h.unit}`.trim();
    $('#d-log').classList.toggle('is-done', done);
    countTo($('#d-streak'), habitStreak(h));
    countTo($('#d-best'), Math.max(habitBest(h), habitStreak(h)));
    countTo($('#d-rate'), habitRate(h), 0, '%');

    // heatmap: five weeks, Monday-first, ending with this week
    const start = addDays(k, -monIndex(k) - 28);
    const cells = Array.from({ length: 35 }, (_, i) => addDays(start, i));
    $('#d-heat-title').textContent = `${fmtDay(cells[0], { month: 'short', day: 'numeric' })} – ${fmtDay(cells[34], { month: 'short', day: 'numeric' })}`;
    $('#d-heat').innerHTML = cells.map((c, i) => {
      if (c > k) return `<i class="lv-1" title="${c}"></i>`;
      if (!scheduled(h, c)) return `<i class="lvx" title="${c}"></i>`;
      const p = val(h, c) / h.goal, lv = p >= 1 ? 3 : p >= 0.5 ? 2 : p > 0 ? 1 : 0;
      return `<i class="lv${lv}${c === k ? ' today' : ''}" style="--d:${i * 12}ms" title="${fmtDay(c, { day: 'numeric', month: 'short' })}"></i>`;
    }).join('');

    $('#d-remind-time').value = h.reminder || '08:00';
    $('#d-remind-switch').setAttribute('aria-pressed', !!h.remind);
    $('#d-buddy-msg').textContent = done ? `${h.name} done! I'm so proud of you.` :
      pct >= 0.5 ? 'You’re great! Keep going, you’re almost there!' : pct > 0 ? 'Nice start! Every little bit counts.' : 'Let’s do a tiny bit together?';
  }

  /* =========================================================================
     Render: editor
     ========================================================================= */
  let draft = null;
  function newDraft() {
    return { id: null, name: '', icon: 'running-shoe', color: 1, time: 'morning', goal: 1, step: 1, unit: 'times', kind: 'count',
      days: [1, 1, 1, 1, 1, 1, 1], reminder: '08:00', remind: false };
  }
  function renderEditor() {
    const scr = screenOf('new');
    scr.style.setProperty('--hc', COLORS[draft.color]);
    const editing = !!draft.id;
    $('#n-title').textContent = editing ? 'Edit Habit' : 'New Habit';
    $('#n-save-label').textContent = editing ? 'Save changes' : 'Plant this habit';
    $('#n-delete').hidden = !editing;
    $('#n-ideas').hidden = editing;
    $('#n-preview-icon').src = ICON(draft.icon);
    if (document.activeElement !== $('#n-name')) $('#n-name').value = draft.name;
    $('#n-ideas').innerHTML = IDEAS.map((idea, i) => `<button class="idea" data-idea="${i}"><img src="${ICON(idea.icon)}" alt="">${idea.name}</button>`).join('');
    $('#n-icons').innerHTML = NEW_ICONS.map((ic) =>
      `<button class="pick${ic === draft.icon ? ' on' : ''}" data-icon="${ic}"><img src="${ICON(ic)}" alt=""></button>`).join('');
    $('#n-colors').innerHTML = COLORS.map((c, i) =>
      `<button class="swatch${i === draft.color ? ' on' : ''}" data-color="${i}" style="--sw:${c}" aria-label="Colour ${i + 1}"></button>`).join('');
    $$('#n-times .time-opt').forEach((b) => b.classList.toggle('on', b.dataset.time === draft.time));
    $('#n-days').innerHTML = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) =>
      `<button class="day${draft.days[i] ? ' on' : ''}" data-dayi="${i}">${d}</button>`).join('');
    if (draft.kind === 'amount') {
      $('#n-goal').textContent = `${fmtNum(draft.goal)} L`;
      $('#n-goal-pips').innerHTML = `<span class="mini-gauge"><i style="width:${(draft.goal / 4) * 100}%"></i></span>`;
    } else {
      const steps = Math.round(draft.goal / draft.step);
      $('#n-goal').textContent = draft.unit === 'times' ? `${steps}× a day` : `${fmtNum(draft.goal)} ${draft.unit}`;
      $('#n-goal-pips').innerHTML = Array.from({ length: Math.min(steps, 10) }, () => `<img src="${ICON(draft.unitIcon || draft.icon)}" alt="">`).join('');
    }
    $('#n-remind-time').value = draft.reminder;
    $('#n-remind-switch').setAttribute('aria-pressed', !!draft.remind);
    const days = draft.days.filter(Boolean).length;
    $('#n-preview-meta').innerHTML = `<img src="${ICON(TIMES[draft.time].icon)}" alt="">${TIMES[draft.time].label} · ${days === 7 ? 'Every day' : days ? days + ' days a week' : 'No days picked'}`;
    $('#n-save').disabled = !days;
  }

  /* =========================================================================
     Render: settings
     ========================================================================= */
  function renderSettings() {
    const tt = totals();
    if (document.activeElement !== $('#p-name')) $('#p-name').value = state.name;
    $('#p-level').textContent = `Lv ${tt.level}`;
    $('#p-title').textContent = tt.level >= 10 ? 'Habit Legend' : tt.level >= 5 ? 'Habit Hero' : tt.level >= 3 ? 'Rising Star' : 'Sprout';
    $('#xp-bar').style.width = (tt.into / LEVEL_XP) * 100 + '%';
    $('#xp-ring').setAttribute('stroke-dasharray', `${(tt.into / LEVEL_XP) * 377} 377`);
    $('#xp-label').textContent = `${tt.into} / ${LEVEL_XP} XP to Lv ${tt.level + 1}`;
    countTo($('#p-streak'), streak());
    countTo($('#p-done'), tt.done);
    const un = unlocked();
    countTo($('#p-badges'), un.length);
    $('#badge-count').textContent = `${un.length} of ${BADGES.length} unlocked`;
    // unlocked first
    $('#badges').innerHTML = BADGES.slice().sort((a, b) => un.includes(b.id) - un.includes(a.id)).map((b) => {
      const on = un.includes(b.id), cur = Math.min(b.cur(), b.goal);
      return `<div class="badge${on ? '' : ' locked'}" style="--b1:${b.b[0]};--b2:${b.b[1]}"><img src="${ICON(b.icon)}" alt="">
        <b>${b.name}</b><span>${on ? `${b.goal} ${b.desc}` : `${cur} / ${b.goal} ${b.desc}`}</span>
        ${on ? '' : `<span class="badge-prog"><i style="width:${(cur / b.goal) * 100}%"></i></span><i class="lock"><img src="${ICON('locked')}" alt=""></i>`}</div>`;
    }).join('');
    $('#buddies').innerHTML = BUDDIES.map((b) =>
      `<button class="buddy${b.id === state.buddy ? ' on' : ''}" data-buddy="${b.id}" aria-label="${b.name}"><img src="${ICON(b.id)}" alt=""><span>${b.name}</span></button>`).join('');
    $$('[data-setting]').forEach((s) => s.setAttribute('aria-pressed', !!state.settings[s.dataset.setting]));
    $$('[data-accent-pick]').forEach((b) => b.classList.toggle('on', b.dataset.accentPick === state.settings.accent));
    $('#pref-theme-sub').textContent = ACCENTS[state.settings.accent];
    $('#pref-dark-sub').textContent = state.settings.dark ? 'On' : 'Off';
    const active = state.habits.filter((h) => h.remind).length;
    $('#pref-reminders-sub').textContent = state.settings.reminders ? `${active} active` : 'Off';
    $('#dr-name').textContent = state.name;
    $('#dr-level').textContent = `Level ${tt.level} · ${tt.xp} XP`;
  }

  function renderAll() {
    renderBuddy(); renderHome(); renderTracker(); renderHabits(); renderSettings();
    if (currentRoute === 'habit') renderDetail();
  }

  /* =========================================================================
     Logging & celebrations
     ========================================================================= */
  function snapshot() { return { level: totals().level, badges: unlocked(), perfect: perfect(todayKey()) }; }
  function setValue(h, k, v, ev) {
    const before = snapshot(), wasDone = isDone(h, k);
    v = Math.max(0, Math.min(h.kind === 'amount' ? h.goal * 2 : h.goal, Math.round(v * 1000) / 1000));
    state.log[k] = state.log[k] || {};
    state.log[k][h.id] = v;
    lastChange = { id: h.id, at: performance.now() };
    save();
    renderAll();
    const nowDone = isDone(h, k);
    if (!wasDone && nowDone) {
      const [x, y] = ev ? stagePoint(ev) : [DESIGN_WIDTH / 2, 400];
      confetti(x, y);
      sound('done'); buzz(20);
      const after = snapshot();
      if (k === todayKey() && !before.perfect && after.perfect) setTimeout(() => celebrateDay(), 500);
      else toast(`${h.name} done!`, h.icon);
      if (after.level > before.level) setTimeout(() => levelUp(after.level), 900);
      after.badges.filter((b) => !before.badges.includes(b)).forEach((id, i) => {
        const b = BADGES.find((x) => x.id === id);
        setTimeout(() => toast(`Badge unlocked: ${b.name}`, b.icon), 2600 + i * 2400);
      });
    } else if (v > 0) { sound('pop'); buzz(8); }
    else sound('undo');
  }
  // Tap behaviour shared by list rows and cards: add one step, or clear when already done.
  function stepHabit(h, k, ev) {
    if (isDone(h, k)) return setValue(h, k, 0, ev);
    setValue(h, k, val(h, k) + (h.kind === 'amount' ? 0.25 : h.step), ev);
  }

  const fx = $('.fx');
  function stagePoint(e) {
    const r = stage.getBoundingClientRect();
    const x = e.clientX ?? r.left + r.width / 2, y = e.clientY ?? r.top + r.height / 2;
    return [(x - r.left) / scale, (y - r.top) / scale];
  }
  function confetti(x, y, count = 36, spread = 1) {
    if (REDUCED) return;
    const colors = ['#fc894b', '#7b6cf6', '#18b7f2', '#f0679b', '#22ae63', '#f8b84e'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      p.className = 'confetti';
      p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};width:${8 + Math.random() * 8}px;height:${5 + Math.random() * 6}px;border-radius:${Math.random() > 0.5 ? '50%' : '3px'}`;
      fx.appendChild(p);
      const ang = Math.random() * Math.PI * 2, dist = (80 + Math.random() * 170) * spread;
      p.animate([
        { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist - 70}px)) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist * 1.25}px), calc(-50% + ${Math.sin(ang) * dist + 220}px)) rotate(${Math.random() * 900}deg)`, opacity: 0 },
      ], { duration: 1200 + Math.random() * 600, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
    }
  }
  function rain() {
    if (REDUCED) return;
    for (let i = 0; i < 6; i++) setTimeout(() => confetti(60 + Math.random() * 420, 80 + Math.random() * 200, 26, 1.2), i * 180);
  }
  const toastEl = $('.toast');
  let toastTimer;
  function toast(text, icon = 'party-popper') {
    $('#toast-img').src = ICON(icon);
    $('.toast-text').textContent = text;
    toastEl.classList.remove('show'); void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  // Sounds are synthesised so the app ships no audio files.
  let actx;
  function sound(kind) {
    if (!state.settings.sounds) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { pop: [660], undo: [440, 330], done: [660, 880], perfect: [523, 659, 784, 1047], level: [392, 523, 659, 784, 1047] }[kind] || [600];
      notes.forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.09;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        o.connect(g).connect(actx.destination);
        o.start(t0); o.stop(t0 + 0.3);
      });
    } catch (e) { /* audio unavailable */ }
  }
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };

  /* =========================================================================
     Overlays: sheet, drawer, search, modal
     ========================================================================= */
  const scrim = $('#scrim'), sheet = $('#sheet'), drawer = $('#drawer'), search = $('#search'), modal = $('#modal');
  let sheetKind = null;
  function openSheet(kind, html) {
    sheetKind = kind;
    $('#sheet-body').innerHTML = html;
    sheet.classList.add('open'); scrim.classList.add('on');
  }
  function closeOverlays() {
    const hadModal = modal.classList.contains('open');
    [sheet, drawer, search, modal].forEach((el) => el.classList.remove('open'));
    scrim.classList.remove('on');
    sheetKind = null;
    $('#search-input').blur();
    if (hadModal && modalQueue.length) setTimeout(() => showModal(...modalQueue.shift()), 380);
  }
  function openDrawer() {
    $('#dr-quote').textContent = QUOTES[new Date().getDate() % QUOTES.length];
    drawer.classList.add('open'); scrim.classList.add('on');
  }
  function openSearch() {
    search.classList.add('open'); scrim.classList.add('on');
    $('#search-input').value = '';
    renderSearch('');
    setTimeout(() => $('#search-input').focus(), 250);
  }
  function renderSearch(q) {
    const k = todayKey();
    const res = state.habits.filter((h) => h.name.toLowerCase().includes(q.toLowerCase()));
    $('#search-results').innerHTML = res.map((h) => `<a class="s-row" href="#habit/${h.id}" style="--hc:${color(h)}">
        <span class="s-ic"><img src="${ICON(h.icon)}" alt=""></span><span class="s-t"><b>${esc(h.name)}</b><span>${TIMES[h.time].label} · ${amountText(h, val(h, k))}</span></span>
        ${isDone(h, k) ? `<span class="s-done">${checkSvg}</span>` : ''}</a>`).join('') +
      (q.trim() ? `<a class="s-row s-new" href="#new" data-prefill="${esc(q.trim())}"><span class="s-ic"><img src="${ICON('seedling')}" alt=""></span><span class="s-t"><b>Create “${esc(q.trim())}”</b><span>Plant it as a new habit</span></span></a>` :
        !res.length ? '<p class="s-empty">No habits yet</p>' : '');
  }

  function sheetSleep() {
    const k = addDays(todayKey(), -1);
    const v = state.sleep[k] || 7.5;
    openSheet('sleep', `
      <div class="sh-hero sleep-hero"><img class="sh-moon" src="${ICON('crescent-moon')}" alt=""><img class="sh-zzz" src="${ICON('zzz')}" alt=""><span class="star s1"></span><span class="star s2"></span><span class="star s3"></span></div>
      <h3 class="sh-title">How did you sleep?</h3>
      <p class="sh-sub">Last night · ${fmtDay(k, { weekday: 'long' })}</p>
      <div class="sleep-val"><b id="sleep-v">${fmtNum(v)}</b><span>hours</span></div>
      <input type="range" id="sleep-range" min="3" max="12" step="0.5" value="${v}" aria-label="Hours slept">
      <div class="range-l"><span>3h</span><span>7.5h</span><span>12h</span></div>
      <div class="sleep-faces" id="sleep-faces"></div>
      <button class="sh-btn" data-action="save-sleep">Save</button>`);
    updateSleepFace(v);
  }
  function updateSleepFace(v) {
    $('#sleep-v').textContent = fmtNum(v);
    const face = v < 6 ? ['sleeping-face', 'Running on empty'] : v < 7 ? ['smiling-face-with-smiling-eyes', 'Not bad'] : v < 9 ? ['star-struck', 'Sweet dreams!'] : ['hugging-face', 'Fully recharged'];
    $('#sleep-faces').innerHTML = `<img src="${ICON(face[0])}" alt="">${face[1]}`;
    $('#sleep-range').style.setProperty('--p', ((v - 3) / 9) * 100 + '%');
  }
  function sheetNotifications() {
    const k = todayKey();
    const list = habitsOn(k).filter((h) => h.remind).sort((a, b) => a.reminder.localeCompare(b.reminder));
    const now = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
    openSheet('notify', `
      <h3 class="sh-title left">Today’s reminders</h3>
      ${!state.settings.reminders ? `<button class="sh-banner" data-action="enable-reminders"><img src="${ICON('bell-with-slash')}" alt=""><span><b>Reminders are off</b>Tap to turn them on</span></button>` : ''}
      <div class="n-list">${list.map((h) => {
        const done = isDone(h, k), past = h.reminder <= now;
        return `<a class="n-row${done ? ' done' : past ? ' due' : ''}" href="#habit/${h.id}" style="--hc:${color(h)}"><span class="n-time">${h.reminder}</span>
          <span class="s-ic"><img src="${ICON(h.icon)}" alt=""></span><span class="s-t"><b>${esc(h.name)}</b><span>${done ? 'Done' : past ? 'Waiting for you' : 'Coming up'}</span></span></a>`;
      }).join('') || `<p class="s-empty"><img src="${ICON('alarm-clock')}" alt="">No reminders set. Add one from any habit.</p>`}</div>`);
  }
  function sheetHabitMenu() {
    const h = habitById(currentId);
    openSheet('menu', `
      <div class="sh-head" style="--hc:${color(h)}"><span class="s-ic"><img src="${ICON(h.icon)}" alt=""></span><b>${esc(h.name)}</b></div>
      <button class="sh-row" data-action="edit-habit"><img src="${ICON('pencil')}" alt="">Edit habit</button>
      <button class="sh-row" data-action="reset-today"><img src="${ICON('hourglass-not-done')}" alt="">Reset today’s progress</button>
      <button class="sh-row danger" data-action="delete-habit"><img src="${ICON('wastebasket')}" alt="">Delete habit</button>`);
  }
  function sheetConfirmDelete() {
    const h = habitById(currentId);
    openSheet('confirm', `
      <div class="sh-hero"><img class="sh-big" src="${ICON('wastebasket')}" alt=""></div>
      <h3 class="sh-title">Delete “${esc(h.name)}”?</h3>
      <p class="sh-sub">Its history goes too. This can’t be undone.</p>
      <div class="sh-pair"><button class="sh-btn ghost" data-action="close-overlays">Keep it</button><button class="sh-btn danger" data-action="confirm-delete">Delete</button></div>`);
  }
  function sheetPrivacy() {
    openSheet('privacy', `
      <div class="sh-hero"><img class="sh-big" src="${ICON('shield')}" alt=""></div>
      <h3 class="sh-title">Your data stays here</h3>
      <p class="sh-sub">Everything is saved in this browser only.${state.demo ? ' The history you see started as demo data.' : ''}</p>
      <button class="sh-row" data-action="export"><img src="${ICON('outbox-tray')}" alt="">Export as a file</button>
      <button class="sh-row danger" data-action="confirm-reset"><img src="${ICON('wastebasket')}" alt="">Start fresh</button>`);
  }
  function sheetConfirmReset() {
    openSheet('confirm', `
      <div class="sh-hero"><img class="sh-big" src="${ICON('seedling')}" alt=""></div>
      <h3 class="sh-title">Start a fresh garden?</h3>
      <p class="sh-sub">This clears your history, streaks and badges. Your starter habits stay.</p>
      <div class="sh-pair"><button class="sh-btn ghost" data-action="close-overlays">Cancel</button><button class="sh-btn danger" data-action="reset-all">Start fresh</button></div>`);
  }

  // Celebrations queue up so a level-up never hides a perfect-day card.
  const modalQueue = [];
  function showModal(html, after) {
    if (modal.classList.contains('open')) { modalQueue.push([html, after]); return; }
    $('#modal-card').innerHTML = html;
    modal.classList.add('open'); scrim.classList.add('on');
    if (after) after();
  }
  function celebrateDay() {
    sound('perfect'); buzz([30, 40, 30]);
    showModal(`
      <div class="m-art"><span class="m-burst"></span><img class="m-buddy" src="${ICON(state.buddy)}" alt=""><img class="m-sun" src="${ICON('sunflower')}" alt=""></div>
      <h3>Perfect day!</h3>
      <p>Every habit done. Your streak is now <b>${streak()} day${streak() === 1 ? '' : 's'}</b>.</p>
      <button class="sh-btn" data-action="close-overlays">Yay!</button>`, rain);
  }
  function levelUp(level) {
    sound('level');
    showModal(`
      <div class="m-art"><span class="m-burst gold"></span><img class="m-crown" src="${ICON('crown')}" alt=""><span class="m-level">${level}</span></div>
      <h3>Level ${level}!</h3>
      <p>You’re growing fast. Keep showing up.</p>
      <button class="sh-btn" data-action="close-overlays">Let’s go</button>`, rain);
  }

  /* =========================================================================
     Chat buddy
     ========================================================================= */
  const msgs = $('#msgs');
  function renderChat(animateLast) {
    const scr = screenOf('chat');
    scr.classList.toggle('has-msgs', state.chat.length > 0);
    msgs.innerHTML = state.chat.map((m, i) => {
      const anim = animateLast && i === state.chat.length - 1 ? ' new' : '';
      if (m.typing) return `<div class="msg bot typing${anim}"><span class="m-ava"><img src="${ICON(state.buddy)}" alt=""></span><p><i></i><i></i><i></i></p></div>`;
      const body = (m.img ? `<img class="m-img" src="${m.img}" alt="Shared photo">` : '') + (m.text ? `<p>${m.text}</p>` : '') +
        (m.cards ? `<div class="m-cards">${m.cards}</div>` : '') +
        (m.actions ? `<div class="m-actions">${m.actions.map((a) => a.href ? `<a class="m-act" href="${a.href}">${a.label}</a>` : `<button class="m-act" data-say="${a.say}">${a.label}</button>`).join('')}</div>` : '');
      return m.from === 'me' ? `<div class="msg me${anim}">${body}</div>` :
        `<div class="msg bot${anim}"><span class="m-ava"><img src="${ICON(state.buddy)}" alt=""></span><div class="m-body">${body}</div></div>`;
    }).join('');
    const sc = $('.chat-scroll');
    requestAnimationFrame(() => sc.scrollTo({ top: sc.scrollHeight, behavior: REDUCED ? 'auto' : 'smooth' }));
  }
  function userSays(text, img) {
    state.chat.push({ from: 'me', text: text ? esc(text) : '', img });
    renderChat(true);
    sound('pop');
    state.chat.push({ typing: true });
    setTimeout(() => renderChat(true), 250);
    setTimeout(() => {
      state.chat = state.chat.filter((m) => !m.typing);
      state.chat.push(reply(text, img));
      save();
      renderChat(true);
    }, 900 + Math.random() * 500);
  }
  function habitChips(list, k) {
    return list.map((h) => `<a class="m-habit${isDone(h, k) ? ' done' : ''}" href="#habit/${h.id}" style="--hc:${color(h)}"><img src="${ICON(h.icon)}" alt="">${esc(h.name)}${isDone(h, k) ? checkSvg : ''}</a>`).join('');
  }
  function reply(text, img) {
    const k = todayKey(), s = dayStats(k), list = habitsOn(k), pending = list.filter((h) => !isDone(h, k));
    const t = (text || '').toLowerCase();
    const b = buddy().name;
    const has = (...w) => w.some((x) => t.includes(x));
    if (img) return { from: 'bot', text: 'What a lovely photo! Capturing moments like this is a habit worth keeping. Want to log something for today?', actions: [{ label: 'Open today', href: '#home' }] };
    if (has('water', 'drink', 'hydrat', 'litre', 'liter')) {
      const w = habitById('water');
      if (w) { const v = val(w, k); return { from: 'bot', text: `You’ve had <b>${fmtNum(v)} L</b> of ${fmtNum(w.goal)} L today. ${v >= w.goal ? 'Fully hydrated!' : `Just ${fmtNum(w.goal - v)} L to go.`}`, actions: [{ label: 'Log water', href: '#habit/water' }] }; }
    }
    if (has('sleep', 'tired', 'rest', 'bed')) {
      const sl = state.sleep[addDays(k, -1)];
      return { from: 'bot', text: sl ? `You slept <b>${fmtNum(sl)}h</b> last night. ${sl >= 7 ? 'Nicely rested!' : 'Try winding down a little earlier tonight.'}` : 'You haven’t logged last night’s sleep yet.', actions: [{ label: 'Log sleep', say: 'log-sleep' }] };
    }
    if (t === 'progress' || has('progress', 'how am i', 'doing', 'status', 'streak')) {
      const st = streak();
      return { from: 'bot', text: s.total ? `You’ve done <b>${s.done} of ${s.total}</b> today and your streak is <b>${st} day${st === 1 ? '' : 's'}</b>. ${pending.length ? 'Still to go:' : 'Everything’s done — perfect day!'}` : 'No habits yet. Shall we plant one?',
        cards: pending.length ? habitChips(pending, k) : '', actions: pending.length ? [] : [{ label: 'See insights', href: '#tracker' }] };
    }
    if (t === 'tips' || has('tip', 'advice', 'help me', 'motivat', 'hard', 'struggl')) {
      return { from: 'bot', text: TIPS[Math.floor(Math.random() * TIPS.length)], actions: [{ label: 'Another tip', say: 'tips' }, { label: 'My progress', say: 'progress' }] };
    }
    if (t === 'goals' || has('goal', 'new habit', 'set up', 'setup', 'add a habit', 'create')) {
      const idea = IDEAS[Math.floor(Math.random() * IDEAS.length)];
      return { from: 'bot', text: `Let’s set one up! Pick something tiny you can do in two minutes. How about <b>${idea.name.toLowerCase()}</b>?`, actions: [{ label: 'Create a habit', href: '#new' }, { label: 'Another idea', say: 'goals' }] };
    }
    if (t === 'schedule' || has('schedule', 'plan', 'agenda', 'what’s on', "what's on")) {
      const by = TIME_ORDER.map((tm) => [tm, list.filter((h) => h.time === tm)]).filter(([, l]) => l.length);
      return { from: 'bot', text: by.length ? 'Here’s your day:' : 'Your day is wide open — no habits scheduled.', cards: by.map(([tm, l]) =>
        `<div class="m-sched"><span><img src="${ICON(TIMES[tm].icon)}" alt="">${TIMES[tm].label}</span>${habitChips(l, k)}</div>`).join('') };
    }
    if (has('thank', 'thx', 'love')) return { from: 'bot', text: 'Anytime! I’m always here cheering for you.' };
    if (has('hi', 'hello', 'hey', 'morning', 'evening')) return { from: 'bot', text: `Hey ${esc(state.name)}! I’m ${b}. Ask me for tips, your schedule, or how you’re doing.` };
    return { from: 'bot', text: `I’m still a little ${b === 'Nino' ? 'bear' : 'buddy'} learning to talk, but I can help with these:`, actions: [{ label: 'Habit tips', say: 'tips' }, { label: 'Schedule', say: 'schedule' }, { label: 'My progress', say: 'progress' }] };
  }
  const CHIP_TEXT = { tips: 'Give me a habit tip', goals: 'Help me set up a goal', schedule: 'What’s my schedule today?', progress: 'How am I doing?' };

  /* =========================================================================
     Reminders
     ========================================================================= */
  function checkReminders() {
    renderHome();
    if (!state.settings.reminders) return;
    const k = todayKey(), now = `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;
    state.notified[k] = state.notified[k] || [];
    habitsOn(k).forEach((h) => {
      if (!h.remind || isDone(h, k) || h.reminder > now || state.notified[k].includes(h.id)) return;
      // Only nudge for reminders that came due in the last hour, not for every past one on open.
      const [hh, mm] = h.reminder.split(':').map(Number), due = new Date(); due.setHours(hh, mm, 0, 0);
      state.notified[k].push(h.id); save();
      if (Date.now() - due.getTime() > 3600e3) return;
      const text = `Time for ${h.name}!`;
      toast(text, 'alarm-clock'); sound('done');
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Habie', { body: text, icon: ICON(h.icon) }); } catch (e) { /* ignore */ }
    });
  }
  async function setReminders(on) {
    state.settings.reminders = on;
    if (on && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) { /* ignore */ }
    }
    if (on) toast('Reminders on — I’ll nudge you while Habie is open', 'alarm-clock');
    save(); renderSettings(); checkReminders();
  }

  /* =========================================================================
     Routing & transitions
     ========================================================================= */
  let currentRoute = null;
  const history = [];
  const depth = (r) => (TAB_ROUTES.includes(r) ? 0 : 1);
  function parse() {
    const [name, param] = location.hash.slice(1).split('/');
    return { name: ROUTES.includes(name) ? name : 'home', param };
  }
  function route() {
    const { name, param } = parse();
    if (location.hash === '#back') { goBack(); return; }
    closeOverlays();
    if (name === 'habit') { if (!habitById(param)) { location.replace('#habits'); return; } currentId = param; renderDetail(); }
    if (name === 'new') {
      draft = newDraft();
      const pre = sessionStorage.getItem('habie.prefill');
      if (pre) { draft.name = pre; sessionStorage.removeItem('habie.prefill'); }
      renderEditor();
    }
    if (name === 'edit') { const h = habitById(param); if (!h) { location.replace('#habits'); return; } draft = JSON.parse(JSON.stringify(h)); renderEditor(); }
    if (name === 'chat') renderChat(false);
    if (name === 'habits' && currentRoute !== 'habits') { viewDay = todayKey(); renderHabits(); }

    const prev = currentRoute ? screenOf(currentRoute) : null, next = screenOf(name);
    const prevName = currentRoute;
    currentRoute = name;
    if (history[history.length - 1] !== location.hash) history.push(location.hash);
    if (history.length > 30) history.shift();

    const tab = TAB_ROUTES.indexOf(name);
    tabbar.classList.toggle('hidden', tab < 0);
    if (tab >= 0) {
      tabbar.style.setProperty('--i', tab);
      $$('.tab', tabbar).forEach((a, i) => { a.classList.toggle('active', i === tab); if (i === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    }

    screens.forEach((s) => { if (s !== next && s !== prev) { s.classList.remove('active'); s.setAttribute('inert', ''); } });
    next.classList.add('active'); next.removeAttribute('inert');
    if (prev === next) return;
    if (prev) prev.setAttribute('inert', '');
    next.querySelector('.scroll').scrollTop = name === 'chat' ? 1e6 : 0;

    if (!prev || REDUCED) { if (prev) prev.classList.remove('active'); return; }
    let inK, outK, nextOnTop = true;
    const isBack = navBack; navBack = false;
    if (!isBack && (depth(name) > depth(prevName) || depth(name) === 1)) {   // push
      inK = [{ transform: 'translateX(100%)' }, { transform: 'none' }];
      outK = [{ transform: 'none', filter: 'brightness(1)' }, { transform: 'translateX(-28%)', filter: 'brightness(.85)' }];
    } else if (isBack || depth(name) < depth(prevName)) {   // pop
      nextOnTop = false;
      inK = [{ transform: 'translateX(-28%)', filter: 'brightness(.85)' }, { transform: 'none', filter: 'brightness(1)' }];
      outK = [{ transform: 'none' }, { transform: 'translateX(100%)' }];
    } else {                                         // tab to tab
      const dir = Math.sign(tab - TAB_ROUTES.indexOf(prevName)) || 1;
      inK = [{ transform: `translateX(${dir * 60}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }];
      outK = [{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 60}px)`, opacity: 0 }];
    }
    next.style.zIndex = nextOnTop ? 2 : 1; prev.style.zIndex = nextOnTop ? 1 : 2;
    const opts = { duration: depth(name) === 0 && depth(prevName) === 0 ? 380 : 480, easing: 'cubic-bezier(.2,.8,.2,1)' };
    next.animate(inK, opts);
    prev.animate(outK, opts).onfinish = () => {
      if (currentRoute !== prevName) prev.classList.remove('active');
      prev.style.zIndex = ''; next.style.zIndex = '';
    };
    reveal(next);
  }
  let navBack = false;
  function goBack() {
    navBack = true;
    history.pop();
    const target = history.pop();
    location.replace(target && target !== '#back' ? target : '#home');
  }
  // Stagger the cards on a screen in as it arrives.
  function reveal(scr) {
    if (REDUCED) return;
    $$('.reveal', scr).slice(0, 14).forEach((el, i) => {
      el.animate([{ opacity: 0, transform: 'translateY(22px) scale(.98)' }, { opacity: 1, transform: 'none' }],
        { duration: 520, delay: 90 + i * 45, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    });
  }

  /* =========================================================================
     Events
     ========================================================================= */
  modal.addEventListener('click', (e) => { if (e.target === modal) closeOverlays(); });
  document.addEventListener('click', (e) => {
    const el = (sel) => e.target.closest(sel);
    let t;

    if ((t = el('[data-step-habit]'))) {
      e.preventDefault(); e.stopPropagation();
      const h = habitById(t.dataset.stepHabit);
      if (h) stepHabit(h, t.dataset.day || todayKey(), e);
      return;
    }
    if ((t = el('[data-unit]'))) {
      const h = habitById(currentId), i = +t.dataset.unit, filled = Math.round(val(h, todayKey()) / h.step);
      setValue(h, todayKey(), (i < filled ? i : i + 1) * h.step, e);   // tap a filled unit to undo back to it
      return;
    }
    if ((t = el('[data-amount]'))) {
      const h = habitById(currentId), a = +t.dataset.amount;
      setValue(h, todayKey(), val(h, todayKey()) + a, e);
      if (a > 0) splash(a);
      return;
    }
    if ((t = el('[data-filter]'))) {
      filter = t.dataset.filter;
      $$('[data-filter]').forEach((b) => b.classList.toggle('on', b === t));
      renderHabits();
      if (!REDUCED) $$('#habit-grid > *').forEach((c, i) => c.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: i * 35, fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)' }));
      return;
    }
    if ((t = el('.wday[data-day]'))) { viewDay = t.dataset.day; renderHabits(); sound('pop'); return; }
    if ((t = el('[data-icon]'))) { draft.icon = t.dataset.icon; if (draft.kind !== 'amount') draft.unitIcon = t.dataset.icon; renderEditor(); bounce('#n-preview-icon'); return; }
    if ((t = el('[data-idea]'))) {
      const idea = IDEAS[+t.dataset.idea];
      Object.assign(draft, { name: idea.name, icon: idea.icon, unitIcon: idea.icon, time: idea.time, color: idea.color });
      $('#n-name').value = idea.name; renderEditor(); bounce('#n-preview-icon'); return;
    }
    if ((t = el('[data-color]'))) { draft.color = +t.dataset.color; renderEditor(); return; }
    if ((t = el('[data-time]'))) { draft.time = t.dataset.time; renderEditor(); return; }
    if ((t = el('[data-dayi]'))) { const i = +t.dataset.dayi; draft.days[i] = draft.days[i] ? 0 : 1; renderEditor(); return; }
    if ((t = el('[data-step]'))) {
      const d = +t.dataset.step;
      if (draft.kind === 'amount') draft.goal = Math.max(0.5, Math.min(4, draft.goal + d * 0.25));
      else draft.goal = Math.max(draft.step, Math.min(draft.step * 10, draft.goal + d * draft.step));
      renderEditor(); return;
    }
    if ((t = el('[data-setting]'))) {
      const key = t.dataset.setting, on = !state.settings[key];
      if (key === 'reminders') { setReminders(on); return; }
      // The theme change runs inside the view transition callback, so render there too.
      const apply = () => { state.settings[key] = on; if (key === 'dark') applyTheme(); save(); renderAll(); };
      if (key === 'dark') themeTransition(t, apply); else apply();
      sound('pop'); return;
    }
    if ((t = el('[data-accent-pick]'))) {
      const acc = t.dataset.accentPick;
      themeTransition(t, () => { state.settings.accent = acc; applyTheme(); save(); renderAll(); });
      sound('pop'); return;
    }
    if ((t = el('[data-buddy]'))) {
      state.buddy = t.dataset.buddy; save(); renderAll(); renderChat(false);
      toast(`Say hi to ${buddy().name}!`, state.buddy); sound('done'); return;
    }
    if ((t = el('[data-say]'))) {
      const s = t.dataset.say;
      if (s === 'log-sleep') { sheetSleep(); return; }
      userSays(CHIP_TEXT[s] || s); return;
    }
    if ((t = el('[data-prefill]'))) { sessionStorage.setItem('habie.prefill', t.dataset.prefill); return; }

    if (!(t = el('[data-action]'))) return;
    const a = t.dataset.action;
    if (a === 'back') { e.preventDefault(); goBack(); return; }
    e.preventDefault();
    switch (a) {
      case 'drawer': openDrawer(); break;
      case 'search': openSearch(); break;
      case 'notifications': sheetNotifications(); break;
      case 'close-overlays': closeOverlays(); break;
      case 'sleep': sheetSleep(); break;
      case 'save-sleep': {
        const v = +$('#sleep-range').value;
        state.sleep[addDays(todayKey(), -1)] = v; save(); closeOverlays(); renderAll();
        toast(`${fmtNum(v)}h of sleep logged`, 'crescent-moon'); sound('done'); break;
      }
      case 'open-water': location.hash = habitById('water') ? '#habit/water' : '#new'; break;
      case 'open-workout': location.hash = habitById('workout') ? '#habit/workout' : '#new'; break;
      case 'log': {
        const h = habitById(currentId);
        if (!isDone(h, todayKey())) { setValue(h, todayKey(), val(h, todayKey()) + (h.kind === 'amount' ? 0.25 : h.step), e); if (h.kind === 'amount') splash(0.25); }
        break;
      }
      case 'habit-menu': sheetHabitMenu(); break;
      case 'edit-habit': location.hash = `#edit/${currentId}`; break;
      case 'reset-today': setValue(habitById(currentId), todayKey(), 0); closeOverlays(); toast('Today’s progress reset', 'hourglass-not-done'); break;
      case 'delete-habit': sheetConfirmDelete(); break;
      case 'confirm-delete': {
        const h = habitById(currentId);
        state.habits = state.habits.filter((x) => x.id !== currentId);
        Object.values(state.log).forEach((d) => delete d[currentId]);
        save(); closeOverlays(); history.length = 0; location.hash = '#habits'; renderAll();
        toast(`${h.name} deleted`, 'wastebasket'); break;
      }
      case 'detail-remind': {
        const h = habitById(currentId); h.remind = !h.remind; save(); renderDetail(); renderSettings();
        if (h.remind && !state.settings.reminders) setReminders(true);
        break;
      }
      case 'draft-remind': draft.remind = !draft.remind; renderEditor(); break;
      case 'save-habit': saveDraft(); break;
      case 'sort': {
        const order = ['time', 'best', 'worst'];
        state.sort = order[(order.indexOf(state.sort) + 1) % order.length]; save(); renderTracker();
        if (!REDUCED) $$('#tr-list > *').forEach((c, i) => c.animate([{ opacity: 0, transform: 'translateX(18px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: i * 40, fill: 'backwards' }));
        break;
      }
      case 'share': {
        const s = dayStats(todayKey());
        share(`I'm on a ${streak()}-day streak in Habie and did ${s.done} of ${s.total} habits today!`);
        break;
      }
      case 'invite': share('I’m growing better habits with Habie. Come grow with me!'); break;
      case 'back-today': viewDay = todayKey(); renderHabits(); break;
      case 'enable-reminders': setReminders(true).then(() => sheetNotifications()); break;
      case 'privacy': sheetPrivacy(); break;
      case 'export': {
        const blob = new Blob([JSON.stringify({ ...state, chat: [] }, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob); link.download = `habie-${todayKey()}.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        closeOverlays(); toast('Exported your data', 'outbox-tray'); break;
      }
      case 'confirm-reset': sheetConfirmReset(); break;
      case 'reset-all': {
        const keep = { name: state.name, buddy: state.buddy, settings: state.settings };
        state = { ...seed(), ...keep, habits: defaultHabits(todayKey()), log: {}, sleep: {}, chat: [], demo: false };
        save(); closeOverlays(); renderAll(); location.hash = '#home'; toast('A fresh garden. Let’s grow!', 'seedling'); break;
      }
      case 'clear-chat': state.chat = []; save(); renderChat(false); break;
    }
  });

  function bounce(sel) {
    if (REDUCED) return;
    $(sel).animate([{ transform: 'scale(.6) rotate(-12deg)' }, { transform: 'scale(1.15) rotate(6deg)' }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  }
  // A droplet falls into the tank when water is logged.
  function splash(amount) {
    if (REDUCED) return;
    const tank = $('#tank');
    const d = document.createElement('img');
    d.src = ICON('droplet'); d.className = 'splash-drop';
    d.style.width = 30 + amount * 40 + 'px';
    tank.appendChild(d);
    d.animate([{ transform: 'translate(-50%, -140px) scale(.6)', opacity: 0 }, { transform: 'translate(-50%, -60px) scale(1)', opacity: 1, offset: 0.3 }, { transform: 'translate(-50%, 90px) scale(.7)', opacity: 0 }],
      { duration: 800, easing: 'cubic-bezier(.5,0,.8,.6)' }).onfinish = () => d.remove();
    tank.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.035)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 700 });
  }
  // Circular reveal for theme changes where the View Transitions API exists.
  function themeTransition(origin, change) {
    if (!document.startViewTransition || REDUCED) { change(); return; }
    const r = origin.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(change);
    vt.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
      { duration: 600, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
  }
  async function share(text) {
    const data = { title: 'Habie', text, url: location.href.split('#')[0] };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(`${text} ${data.url}`);
      toast('Copied to clipboard', 'link');
    } catch (e) { if (e && e.name !== 'AbortError') toast('Couldn’t share right now', 'link'); }
  }

  function saveDraft() {
    const name = $('#n-name').value.trim() || IDEAS.find((i) => i.icon === draft.icon)?.name || 'New habit';
    if (!draft.days.some(Boolean)) return;
    if (draft.id) {
      const h = habitById(draft.id);
      Object.assign(h, { ...draft, name });
      save(); renderAll();
      history.pop(); navBack = true;
      location.replace(`#habit/${h.id}`);
      toast('Changes saved', h.icon);
    } else {
      const h = { ...draft, name, id: 'h' + Date.now().toString(36), created: todayKey() };
      state.habits.push(h);
      lastChange = { id: h.id, at: performance.now() };
      save(); renderAll();
      history.pop(); navBack = true;
      location.replace('#habits');
      setTimeout(() => { confetti(DESIGN_WIDTH / 2, 380, 50); sound('perfect'); toast(`${name} planted in your garden`, 'seedling'); }, 450);
    }
  }

  // Inputs
  $('#n-name').addEventListener('input', (e) => { draft.name = e.target.value; });
  $('#n-remind-time').addEventListener('change', (e) => { draft.reminder = e.target.value || '08:00'; draft.remind = true; renderEditor(); });
  $('#d-remind-time').addEventListener('change', (e) => {
    const h = habitById(currentId); h.reminder = e.target.value || '08:00'; h.remind = true; save(); renderDetail();
    toast(`Reminder set for ${h.reminder}`, 'alarm-clock');
  });
  $('#p-name').addEventListener('change', (e) => { state.name = e.target.value.trim() || 'Friend'; save(); renderAll(); toast(`Nice to meet you, ${state.name}!`, 'waving-hand'); });
  $('#p-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
  $('#search-input').addEventListener('input', (e) => renderSearch(e.target.value));
  document.addEventListener('input', (e) => { if (e.target.id === 'sleep-range') updateSleepFace(+e.target.value); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlays(); });
  $('#ask').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#ask-input'), text = input.value.trim();
    if (!text) return;
    input.value = '';
    userSays(text);
  });
  $('#ask-input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#ask').requestSubmit(); } });
  $$('[data-attach]').forEach((inp) => inp.addEventListener('change', () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => userSays('', r.result);
    r.readAsDataURL(f);
    inp.value = '';
  }));

  // Swipe a sheet down to dismiss it.
  (function () {
    let y0 = null;
    sheet.addEventListener('pointerdown', (e) => { if (e.target.closest('input, button, a')) return; y0 = e.clientY; sheet.style.transition = 'none'; });
    window.addEventListener('pointermove', (e) => { if (y0 === null) return; const dy = Math.max(0, (e.clientY - y0) / scale); sheet.style.transform = `translateY(${dy}px)`; });
    window.addEventListener('pointerup', (e) => {
      if (y0 === null) return;
      const dy = (e.clientY - y0) / scale; y0 = null;
      sheet.style.transition = ''; sheet.style.transform = '';
      if (dy > 120) closeOverlays();
    });
  })();

  // Parallax on scroll for the hero art.
  $$('.screen .scroll').forEach((sc) => sc.addEventListener('scroll', () => {
    sc.closest('.screen').style.setProperty('--sy', Math.min(sc.scrollTop, 600));
  }, { passive: true }));

  /* =========================================================================
     Boot
     ========================================================================= */
  function fit() {
    let width = Math.min(window.innerWidth, MAX_APP_WIDTH);
    // On wide (desktop) windows, also fit the whole design height so nothing scrolls.
    if (window.innerWidth > MAX_APP_WIDTH) width = Math.min(width, window.innerHeight * DESIGN_WIDTH / DESIGN_HEIGHT);
    scale = width / DESIGN_WIDTH;
    app.style.width = width + 'px';
    stage.style.zoom = scale;
    stage.style.height = (window.innerHeight / scale) + 'px';
  }
  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', route);
  // Keep "today" honest if the app stays open past midnight, and fire reminders.
  let lastDay = todayKey();
  setInterval(() => {
    if (todayKey() !== lastDay) { lastDay = todayKey(); viewDay = lastDay; renderAll(); }
    checkReminders();
  }, 30000);

  applyTheme();
  fit();
  renderAll();
  renderChat(false);
  route();
  setTimeout(checkReminders, 1500);
  requestAnimationFrame(() => document.body.classList.add('ready'));
})();
