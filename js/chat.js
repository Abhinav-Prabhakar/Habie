// The buddy's brain. With an API key (Settings → Buddy brain) it talks to an OpenAI-compatible
// model that can read and change everything in the app through tool calls. Without one, a small
// local responder answers from the habit data.
import { CONFIG } from '../config.js';
import {
  store, ICON, TIMES, TIME_ORDER, IDEAS, NEW_ICONS, COLORS, ACCENTS, BUDDIES, todayKey, addDays, monIndex, habitsOn, isDone, val,
  habitById, dayStats, streak, bestStreak, habitStreak, habitRate, totals, unlocked, BADGES, fmtNum, buddy, color,
  isQuit, isWeekly, isRest, daysClean, weekCount, noteOf, setNote, patterns, dueOn, perfect,
} from './store.js';
import { esc, checkSvg } from './fx.js';
import { marked } from '../assets/vendor/marked.esm.js';
import DOMPurify from '../assets/vendor/purify.es.mjs';

const TIPS = [
  'Stack a new habit onto an old one: “After I pour my coffee, I’ll drink a glass of water.”',
  'Make it tiny. Two minutes of reading still counts and keeps the streak alive.',
  'Put your cues where you can see them — shoes by the door, a book on your pillow.',
  'Missed a day? Never miss twice. One slip is an accident, two is a new habit.',
  'Log it right after you do it. The little check is part of the reward.',
  'Pair something you need to do with something you love, like a podcast on your walk.',
];
export const CHIP_TEXT = { tips: 'Give me a habit tip', goals: 'Help me set up a goal', schedule: 'What’s my schedule today?', progress: 'How am I doing?' };

/* ---------- API key: one pasted on this device, else the one the Pages deploy added ---------- */
const KEY_SLOT = 'habie.apiKey';
const deployedKey = (() => { try { return CONFIG.apiKeyEncoded ? atob(CONFIG.apiKeyEncoded).split('').reverse().join('') : ''; } catch (e) { return ''; } })();
export const ownKey = () => { try { return localStorage.getItem(KEY_SLOT) || ''; } catch (e) { return ''; } };
export const hasDeployedKey = () => !!deployedKey;
export const getKey = () => ownKey() || deployedKey;
export const setKey = (k) => { try { k ? localStorage.setItem(KEY_SLOT, k.trim()) : localStorage.removeItem(KEY_SLOT); } catch (e) { /* private mode */ } };

const ICONS = [...NEW_ICONS, 'fire', 'trophy', 'crown', 'gem-stone', 'glowing-star', 'high-voltage', 'rainbow', 'sun', 'sunrise', 'crescent-moon', 'cloud', 'stopwatch', 'waving-hand'];
const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// What the model (or a custom endpoint) sees about the user's garden.
export function context() {
  const k = todayKey(), s = store.state, tt = totals();
  return {
    today: k, weekday: DAY_NAMES[monIndex(k)], name: s.name || null, buddy: buddy().name, streak: streak(), bestStreak: bestStreak(),
    level: tt.level, xp: tt.xp, habitsDone: tt.done, perfectDays: tt.perfectDays, badges: unlocked(),
    settings: s.settings, sleepLastNight: s.sleep[addDays(k, -1)] || null, streakFreezes: s.freezes, restDayToday: isRest(k),
    timerRunning: s.timer ? { habit: s.timer.id, minutes: Math.round((Date.now() - s.timer.start) / 6000) / 10 } : null,
    habits: s.habits.map((h) => ({
      id: h.id, name: h.name, icon: h.icon, time: h.time, type: h.kind, goal: h.goal, step: h.step, unit: h.unit,
      repeat: h.freq, ...(h.freq === 'days' ? { days: DAY_NAMES.filter((_, i) => h.days[i]) } : h.freq === 'interval' ? { everyDays: h.every } : { perWeek: h.perWeek, thisWeek: weekCount(h, k) }),
      reminder: h.remind ? h.reminder : null, color: h.color,
      today: isQuit(h) ? { slipped: !isDone(h, k), daysClean: daysClean(h) } : { value: val(h, k), done: isDone(h, k), scheduled: habitsOn(k).includes(h) },
      note: noteOf(h, k), streak: habitStreak(h), rate30d: habitRate(h),
    })),
  };
}

/* ---------- tools ---------- */
const fn = (name, description, properties = {}, required = []) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } });
const str = (description, extra) => ({ type: 'string', description, ...extra });
const num = (description) => ({ type: 'number', description });
const bool = (description) => ({ type: 'boolean', description });
const HABIT_FIELDS = {
  name: str('Short name, e.g. "Drink water"'),
  type: str('count: check off or count up to a goal; amount: litres of water; timer: minutes with a start/stop timer; quit: a habit to break, counting days since the last slip', { enum: ['count', 'amount', 'timer', 'quit'] }),
  repeat: str('days: on chosen weekdays; interval: every N days; weekly: N times a week on any days', { enum: ['days', 'interval', 'weekly'] }),
  every: { type: 'integer', minimum: 2, maximum: 30, description: 'With repeat "interval": every this many days' },
  per_week: { type: 'integer', minimum: 1, maximum: 6, description: 'With repeat "weekly": times per week' },
  icon: str('Icon id', { enum: ICONS }),
  time: str('Time of day', { enum: TIME_ORDER }),
  goal: num('Daily target in the unit, e.g. 2.5 (litres) or 20 (pages)'),
  step: num('How much one tap adds, e.g. 0.25, 5 or 1'),
  unit: str('Unit, e.g. "L", "min", "pages", "times"'),
  days: { type: 'array', items: { type: 'string', enum: DAY_NAMES }, description: 'Days of the week it is scheduled' },
  reminder: str('Reminder time HH:MM (24h), or "off"'),
  color: { type: 'integer', minimum: 0, maximum: COLORS.length - 1, description: '0 blue, 1 orange, 2 purple, 3 pink, 4 red, 5 green, 6 yellow' },
};
const DATE = str('Day as YYYY-MM-DD; defaults to today');
const TOOLS = [
  fn('add_habit', 'Create a new habit.', HABIT_FIELDS, ['name']),
  fn('update_habit', 'Change any fields of an existing habit (rename, goal, schedule, reminder, icon…).', { id: str('Habit id'), ...HABIT_FIELDS }, ['id']),
  fn('delete_habit', 'Delete a habit and its history. Only after the user has clearly asked for it.', { id: str('Habit id') }, ['id']),
  fn('log_habit', 'Record progress on a habit for a day. Give one of value, add, done or (quit habits) slip.', {
    id: str('Habit id'), date: DATE, value: num('Set the total for the day (minutes for timers)'), add: num('Add this much to the day'),
    done: bool('true marks it complete, false clears it'), slip: bool('Quit habits: true logs a slip that day, false removes it'),
  }, ['id']),
  fn('timer', 'Start or stop the live timer of a timer habit (today only). Stopping logs the minutes.', { id: str('Habit id'), action: str('start or stop', { enum: ['start', 'stop'] }) }, ['id', 'action']),
  fn('add_note', 'Save how a check-in felt: a mood from 1 (rough) to 5 (great) and/or a short note.', {
    id: str('Habit id'), date: DATE, mood: { type: 'integer', minimum: 0, maximum: 5, description: '1 rough, 2 meh, 3 okay, 4 good, 5 great; 0 clears' }, text: str('Short note'),
  }, ['id']),
  fn('set_rest_day', 'Mark a day as a rest day (nothing due, streak safe) or undo it.', { date: DATE, rest: bool('true to rest, false to undo') }, ['rest']),
  fn('get_patterns', 'Read the statistical patterns found in the user’s history (sleep, weekdays, habit pairs, mood).'),
  fn('log_sleep', 'Record hours slept on the night before the given day.', { hours: num('Hours slept, 3–12'), date: DATE }, ['hours']),
  fn('get_history', 'Read logged values for past days.', { days: { type: 'integer', minimum: 1, maximum: 60, description: 'How many days back, default 7' }, id: str('Only this habit') }),
  fn('update_settings', 'Change app settings.', {
    dark: bool('Dark mode'), accent: str('Colour theme', { enum: Object.keys(ACCENTS) }), sounds: bool('Sounds'),
    focus: bool('Focus mode: hide finished habits'), reminders: bool('Reminder notifications'),
  }),
  fn('update_profile', 'Change the user’s name or their buddy.', { name: str('User’s first name'), buddy: str('Buddy', { enum: BUDDIES.map((b) => b.id) }) }),
  fn('open_screen', 'Show a screen of the app.', { screen: str('Screen', { enum: ['home', 'insights', 'habits', 'buddy', 'settings', 'new'] }), habit_id: str('With screen "habits", open this habit') }, ['screen']),
  fn('start_fresh', 'Wipe all habits, history, streaks and badges. Only after the user has explicitly confirmed.', { confirmed: bool('The user said yes to wiping everything') }, ['confirmed']),
];

const clampDays = (list) => DAY_NAMES.map((d) => (list.includes(d) ? 1 : 0));
function habitPatch(a) {
  const p = {};
  if (a.name) p.name = String(a.name).slice(0, 40);
  if (a.icon && ICONS.includes(a.icon)) { p.icon = a.icon; p.unitIcon = a.icon; }
  if (TIME_ORDER.includes(a.time)) p.time = a.time;
  if (a.goal > 0) p.goal = +a.goal;
  if (a.step > 0) p.step = +a.step;
  if (a.unit) p.unit = String(a.unit).slice(0, 12);
  if (['count', 'amount', 'timer', 'quit'].includes(a.type)) p.kind = a.type;
  else if (p.unit) p.kind = p.unit === 'L' ? 'amount' : p.unit === 'min' && /meditat|workout|yoga|exercise|practice|focus|walk/i.test(a.name || '') ? 'timer' : 'count';
  const defaults = { amount: { goal: 2.5, step: 0.25, unit: 'L' }, timer: { goal: 10, step: 5, unit: 'min' }, quit: { goal: 1, step: 1, unit: 'day', freq: 'days' } }[p.kind];
  if (defaults) Object.entries(defaults).forEach(([k, v]) => { if (p[k] === undefined || (p.kind === 'quit' && k !== 'freq')) p[k] = v; });
  if (Array.isArray(a.days) && a.days.length) p.days = clampDays(a.days.map((d) => String(d).slice(0, 3).toLowerCase()));
  if (['days', 'interval', 'weekly'].includes(a.repeat)) p.freq = a.repeat;
  if (a.every >= 2) { p.every = Math.min(30, Math.round(a.every)); p.freq ||= 'interval'; }
  if (a.per_week >= 1) { p.perWeek = Math.min(6, Math.round(a.per_week)); p.freq ||= 'weekly'; }
  if (a.reminder === 'off') p.remind = false;
  else if (/^\d{1,2}:\d{2}$/.test(a.reminder || '')) { p.reminder = a.reminder.padStart(5, '0'); p.remind = true; }
  if (Number.isInteger(a.color)) p.color = Math.abs(a.color) % COLORS.length;
  return p;
}
const habitLink = (h) => ({ label: `Open ${h.name}`, href: `#habits/${h.id}` });

// Runs one tool call. ops are the app's own functions, so changes celebrate and re-render like taps do.
function run(name, a, ops, out) {
  const s = store.state, k = todayKey();
  const day = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') && d <= k ? d : k);
  const find = (id) => habitById(id) || s.habits.find((h) => h.name.toLowerCase() === String(id || '').toLowerCase());
  switch (name) {
    case 'add_habit': {
      const p = habitPatch(a);
      const h = { name: 'New habit', icon: 'seedling', unitIcon: 'seedling', color: s.habits.length % COLORS.length, time: 'morning', goal: 1, step: 1,
        unit: 'times', kind: 'count', freq: 'days', every: 2, perWeek: 3, days: [1, 1, 1, 1, 1, 1, 1], reminder: '08:00', remind: false, ...p, id: 'h' + Date.now().toString(36) + s.habits.length, created: k };
      if (h.step > h.goal) h.step = h.goal;
      s.habits.push(h); ops.changed(h.id); out.push(habitLink(h));
      return { ok: true, id: h.id };
    }
    case 'update_habit': {
      const h = find(a.id); if (!h) return { error: 'No habit with that id' };
      Object.assign(h, habitPatch(a));
      if (h.step > h.goal) h.step = h.goal;
      ops.changed(h.id); out.push(habitLink(h));
      return { ok: true };
    }
    case 'delete_habit': {
      const h = find(a.id); if (!h) return { error: 'No habit with that id' };
      s.habits = s.habits.filter((x) => x !== h);
      Object.values(s.log).forEach((d) => delete d[h.id]);
      ops.changed();
      return { ok: true };
    }
    case 'log_habit': {
      const h = find(a.id); if (!h) return { error: 'No habit with that id' };
      const d = day(a.date);
      if (isQuit(h)) {
        const slipped = a.slip === true || (a.slip === undefined && a.done !== true && (a.value > 0 || a.add > 0));
        ops.setValue(h, d, slipped ? 1 : 0);
        return { ok: true, slipped, daysClean: daysClean(h) };
      }
      const v = a.done === true ? h.goal : a.done === false ? 0 : a.add != null ? val(h, d) + +a.add : a.value != null ? +a.value : h.goal;
      ops.setValue(h, d, v);
      return { ok: true, value: val(h, d), goal: h.goal, done: isDone(h, d) };
    }
    case 'timer': {
      const h = find(a.id); if (!h) return { error: 'No habit with that id' };
      if (h.kind !== 'timer') return { error: 'Not a timer habit' };
      ops.timer(h, a.action);
      return { ok: true };
    }
    case 'add_note': {
      const h = find(a.id); if (!h) return { error: 'No habit with that id' };
      const patch = {};
      if (Number.isInteger(a.mood)) patch.mood = Math.max(0, Math.min(5, a.mood));
      if (typeof a.text === 'string') patch.text = a.text.slice(0, 280);
      setNote(h, day(a.date), patch); ops.changed(h.id); out.push(habitLink(h));
      return { ok: true };
    }
    case 'set_rest_day': {
      const d = day(a.date);
      if (a.rest) s.rest[d] = true; else delete s.rest[d];
      ops.changed();
      return { ok: true };
    }
    case 'get_patterns': return patterns().map((f) => f.text.replace(/\*\*/g, ''));
    case 'log_sleep': {
      const hrs = Math.max(0, Math.min(14, +a.hours || 0));
      s.sleep[addDays(day(a.date), -1)] = Math.round(hrs * 2) / 2;
      ops.changed(); out.push({ label: 'See sleep', href: '#insights' });
      return { ok: true };
    }
    case 'get_history': {
      const n = Math.min(60, a.days || 7), list = a.id ? [find(a.id)].filter(Boolean) : s.habits, rows = {};
      for (let i = n - 1; i >= 0; i--) {
        const d = addDays(k, -i);
        rows[d] = { sleep: s.sleep[addDays(d, -1)] || null, ...Object.fromEntries(list.filter((h) => d >= h.created).map((h) => [h.id, val(h, d)])) };
      }
      return rows;
    }
    case 'update_settings': {
      const st = s.settings;
      ['dark', 'sounds', 'focus'].forEach((x) => { if (typeof a[x] === 'boolean') st[x] = a[x]; });
      if (ACCENTS[a.accent]) st.accent = a.accent;
      if (typeof a.reminders === 'boolean') ops.setReminders(a.reminders);
      ops.theme(); ops.changed();
      return { ok: true };
    }
    case 'update_profile': {
      if (typeof a.name === 'string') s.name = a.name.trim().slice(0, 16);
      if (BUDDIES.some((b) => b.id === a.buddy)) s.buddy = a.buddy;
      ops.changed();
      return { ok: true };
    }
    case 'open_screen': {
      const h = a.habit_id && find(a.habit_id);
      ops.go(a.screen === 'habits' && h ? `#habits/${h.id}` : `#${a.screen}`);
      return { ok: true };
    }
    case 'start_fresh':
      if (a.confirmed !== true) return { error: 'Ask the user to confirm first' };
      ops.reset();
      return { ok: true };
    default: return { error: 'Unknown tool' };
  }
}

function system() {
  const b = buddy().name;
  return `You are ${b}, the friendly buddy inside Habie, a playful habit tracker on iPad. You can read and change everything in the app with tools: create, edit and delete habits (check-ins, litres, timers, quit habits; on weekdays, every few days or N times a week), log progress, slips or sleep for any past day, run timers, save moods and notes, set rest days, read patterns, change settings, the theme, the user's name and buddy, and open screens.
- Streaks: rest days pause everything without breaking the streak. Every 7-day streak earns a freeze (max 3) that automatically saves the streak on a missed day.
- Act, don't describe: when the user asks for a change, call the tools right away, then confirm in one short sentence. Combine several tool calls in one turn when useful.
- When the user mentions doing something ("I drank a glass of water", "read 10 pages"), log it on the matching habit. A glass of water is 0.25 L.
- Pick fitting icons, units, steps and times when creating habits. Keep goals small and realistic.
- Ask before deleting a habit unless the request is explicit. Never call start_fresh unless the user has said yes to wiping everything.
- Keep replies short and warm: 1–3 sentences for changes and chit-chat; longer only when the user asks to explain or plan something.
- Format with Markdown (bold, lists, tables, code). Write maths in LaTeX: $…$ inline, $$…$$ on its own line.
- Dates are YYYY-MM-DD. Use only habit ids from the data below.
Current data:
${JSON.stringify(context())}`;
}

/* ---------- talking to the model ---------- */
const plain = (html) => html.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function history() {
  return store.state.chat.filter((m) => !m.typing && m.text).slice(-13, -1)
    .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: plain(m.text) }));
}
/* ---------- Markdown + LaTeX ---------- */
marked.use({ gfm: true, breaks: true });
DOMPurify.addHook('afterSanitizeAttributes', (n) => {
  if (n.tagName === 'A' && !(n.getAttribute('href') || '').startsWith('#')) { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener noreferrer'); }
});
let katexLoad;                                                     // KaTeX is big, so it loads the first time math shows up
const loadKatex = () => (katexLoad ||= import('../assets/vendor/katex/katex.mjs').then((m) => m.default));
// $$…$$ and \[…\] are display math; \(…\) and $…$ inline. A lone "$5" stays money.
const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$(?=\S)((?:\\\$|[^$\n])+?)(?<=\S)\$(?!\d)/g;

// Model text → safe HTML: math is cut out first so Markdown can't mangle it, then put back rendered.
export async function format(text) {
  const maths = [];
  const src = text.trim().replace(/```[\s\S]*?```|`[^`\n]+`/g, (code) => code.replace(/\$/g, '\u0000'))   // no math inside code
    .replace(MATH, (m, d1, d2, i1, i2) => { maths.push({ tex: d1 || d2 || i1 || i2, display: !!(d1 || d2) }); return `\u0001${maths.length - 1}\u0001`; })
    .replace(/\u0000/g, '$');
  let html = DOMPurify.sanitize(marked.parse(src), { FORBID_TAGS: ['img', 'style', 'iframe', 'form', 'input', 'video', 'audio'], FORBID_ATTR: ['style'] });
  if (maths.length) {
    let katex = null;
    try { katex = await loadKatex(); } catch (e) { /* offline before it was cached: show the TeX */ }
    html = html.replace(/\u0001(\d+)\u0001/g, (_, i) => {
      const { tex, display } = maths[+i];
      if (!katex) return `<code>${esc(tex)}</code>`;
      return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'htmlAndMathml', trust: false, maxExpand: 500 });
    });
  }
  return html;
}

async function call(model, messages, key, tools = TOOLS) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 45000);
  try {
    const res = await fetch(`${CONFIG.apiBase}/chat/completions`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, ...(tools ? { tools, tool_choice: 'auto' } : {}), temperature: 0.4, max_tokens: 600 }),
    });
    if (!res.ok) { const e = new Error(String(res.status)); e.status = res.status; throw e; }
    const data = await res.json();
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) throw new Error('empty');
    return msg;
  } finally { clearTimeout(timer); }
}

async function agent(text, img, ops) {
  const key = getKey();
  const content = img ? [{ type: 'text', text: text || 'I shared a photo.' }, { type: 'image_url', image_url: { url: img } }] : text;
  const messages = [{ role: 'system', content: system() }, ...history(), { role: 'user', content }];
  const actions = [];
  let models = CONFIG.models.slice(), lastErr;
  for (let round = 0; round < 6; round++) {
    let msg;
    while (models.length) {
      try { msg = await call(models[0], messages, key); break; } catch (e) {
        lastErr = e;
        if (e.status === 401 || e.status === 403) throw e;      // a bad key won't work on any model
        models.shift();
      }
    }
    if (!msg) throw lastErr || new Error('no model');
    const calls = msg.tool_calls || [];
    if (!calls.length) {
      const seen = new Set();
      return { from: 'bot', md: true, text: await format(msg.content || 'Done!'), actions: actions.filter((x) => !seen.has(x.href) && seen.add(x.href)).slice(-3) };
    }
    messages.push({ role: 'assistant', content: msg.content || null, tool_calls: calls });
    for (const c of calls) {
      let result;
      try { result = run(c.function.name, JSON.parse(c.function.arguments || '{}'), ops, actions); } catch (e) { result = { error: String(e.message || e) }; }
      messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(result) });
    }
    messages[0].content = system();                                // refreshed so the next round sees the changes
  }
  return { from: 'bot', text: 'All done!', actions: actions.slice(-3) };
}

// The Insights card's write-up: the buddy explains the patterns and suggests one small change each.
export async function writeInsights(found) {
  const key = getKey(); if (!key) throw new Error('no key');
  const k = todayKey(), s = store.state;
  const days = Array.from({ length: 28 }, (_, i) => addDays(k, -i - 1)).reverse().map((d) => {
    const st = dayStats(d);
    return { date: d, weekday: DAY_NAMES[monIndex(d)], done: st.done, due: st.total, sleep: s.sleep[addDays(d, -1)] || null, rest: isRest(d) || undefined };
  }).filter((d) => d.due || d.rest);
  const data = { patterns: found.map((f) => f.text.replace(/\*\*/g, '')), days, habits: context().habits.map(({ name, type, repeat, streak, rate30d }) => ({ name, type, repeat, streak, rate30d })), streak: streak(), freezes: s.freezes };
  const messages = [
    { role: 'system', content: `You are ${buddy().name}, the warm habit buddy in Habie. From the user's real statistics, write 3 short bullets. Each names a pattern, its likely cause, and one tiny, concrete thing to try. Use only numbers present in the data. Bold the key number in each. No heading, no intro or outro, under 90 words.` },
    { role: 'user', content: JSON.stringify(data) },
  ];
  let lastErr;
  for (const model of CONFIG.models) {
    try { const msg = await call(model, messages, key, null); return await format(msg.content || ''); } catch (e) { lastErr = e; if (e.status === 401 || e.status === 403) break; }
  }
  throw lastErr || new Error('failed');
}

export async function reply(text, img, ops) {
  if (CONFIG.chatEndpoint) {
    try {
      const res = await fetch(CONFIG.chatEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(CONFIG.chatHeaders || {}) },
        body: JSON.stringify({ message: text, image: img || null, history: history(), context: context() }),
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      return { from: 'bot', md: true, text: await format(data.reply || data.message || '…'), actions: data.actions || null };
    } catch (e) {
      return { from: 'bot', text: 'I couldn’t reach my brain just now. Here’s what I know offline:', ...local(text, img) };
    }
  }
  if (getKey()) {
    try { return await agent(text, img, ops); } catch (e) {
      const why = e.status === 401 || e.status === 403 ? 'My API key was turned down. Check it in Settings → Buddy brain.'
        : e.status === 429 ? 'I’m out of free thinking for the moment. Try again in a little while.'
        : navigator.onLine === false ? 'You’re offline, so I’m using my simple brain.' : 'I couldn’t reach my brain just now.';
      return { from: 'bot', text: `${why} Here’s what I know offline:`, ...local(text, img) };
    }
  }
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));
  return { from: 'bot', ...local(text, img) };
}

/* ---------- offline responder ---------- */
function habitChips(list, k) {
  return list.map((h) => `<a class="m-habit${isDone(h, k) ? ' done' : ''}" href="#habits/${h.id}" style="--hc:${color(h)}"><img src="${ICON(h.icon)}" alt="">${esc(h.name)}${isDone(h, k) ? checkSvg : ''}</a>`).join('');
}

function local(text, img) {
  const k = todayKey(), s = dayStats(k), list = habitsOn(k), pending = list.filter((h) => !isDone(h, k));
  const t = (text || '').toLowerCase();
  const has = (...w) => w.some((x) => t.includes(x));
  const b = buddy().name, name = esc(store.state.name);
  if (img) return { text: 'What a lovely photo! Capturing moments like this is a habit worth keeping. Want to log something for today?', actions: [{ label: 'Open today', href: '#home' }] };
  if (has('water', 'drink', 'hydrat', 'litre', 'liter')) {
    const w = store.state.habits.find((h) => h.unit === 'L' || /water/i.test(h.name));
    if (w) { const v = val(w, k); return { text: `You’ve had <b>${fmtNum(v)} ${esc(w.unit)}</b> of ${fmtNum(w.goal)} today. ${v >= w.goal ? 'Fully hydrated!' : `Just ${fmtNum(w.goal - v)} to go.`}`, actions: [{ label: 'Log water', href: `#habits/${w.id}` }] }; }
  }
  if (has('sleep', 'tired', 'rest', 'bed')) {
    const sl = store.state.sleep[addDays(k, -1)];
    return { text: sl ? `You slept <b>${fmtNum(sl)}h</b> last night. ${sl >= 7 ? 'Nicely rested!' : 'Try winding down a little earlier tonight.'}` : 'You haven’t logged last night’s sleep yet.', actions: [{ label: 'Log sleep', action: 'sleep' }] };
  }
  if (t === CHIP_TEXT.progress.toLowerCase() || has('progress', 'how am i', 'doing', 'status', 'streak')) {
    const st = streak();
    return { text: s.total ? `You’ve done <b>${s.done} of ${s.total}</b> today and your streak is <b>${st} day${st === 1 ? '' : 's'}</b>. ${pending.length ? 'Still to go:' : 'Everything’s done — perfect day!'}` : 'No habits yet. Shall we plant one?',
      cards: pending.length ? habitChips(pending, k) : '', actions: pending.length ? null : [{ label: s.total ? 'See insights' : 'New habit', href: s.total ? '#insights' : '#new' }] };
  }
  if (t === CHIP_TEXT.tips.toLowerCase() || has('tip', 'advice', 'help me', 'motivat', 'hard', 'struggl')) {
    return { text: TIPS[Math.floor(Math.random() * TIPS.length)], actions: [{ label: 'Another tip', say: 'tips' }, { label: 'My progress', say: 'progress' }] };
  }
  if (t === CHIP_TEXT.goals.toLowerCase() || has('goal', 'new habit', 'set up', 'setup', 'add a habit', 'create')) {
    const idea = IDEAS[Math.floor(Math.random() * IDEAS.length)];
    return { text: `Let’s set one up! Pick something tiny you can do in two minutes. How about <b>${idea.name.toLowerCase()}</b>?`, actions: [{ label: 'Create a habit', href: '#new' }, { label: 'Another idea', say: 'goals' }] };
  }
  if (t === CHIP_TEXT.schedule.toLowerCase() || has('schedule', 'plan', 'agenda', 'what’s on', "what's on")) {
    const by = TIME_ORDER.map((tm) => [tm, list.filter((h) => h.time === tm)]).filter(([, l]) => l.length);
    return { text: by.length ? 'Here’s your day:' : 'Your day is wide open — no habits scheduled.', cards: by.map(([tm, l]) =>
      `<div class="m-sched"><span><img src="${ICON(TIMES[tm].icon)}" alt="">${TIMES[tm].label}</span>${habitChips(l, k)}</div>`).join('') };
  }
  if (has('thank', 'thx', 'love')) return { text: 'Anytime! I’m always here cheering for you.' };
  if (has('hi', 'hello', 'hey', 'morning', 'evening')) return { text: `Hey${name ? ' ' + name : ''}! I’m ${b}. Ask me for tips, your schedule, or how you’re doing.` };
  return { text: 'I can only do simple things on my own. Add an API key in Settings → Buddy brain and I can set up and change anything for you.',
    actions: [{ label: 'Buddy brain', action: 'api-key' }, { label: 'Habit tips', say: 'tips' }, { label: 'My progress', say: 'progress' }] };
}
