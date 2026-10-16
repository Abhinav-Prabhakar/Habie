// The buddy's brain. If CONFIG.chatEndpoint is set, messages go to that API;
// otherwise a small local responder answers from the habit data.
import { CONFIG } from '../config.js';
import { store, ICON, TIMES, TIME_ORDER, IDEAS, todayKey, addDays, habitsOn, isDone, val, habitById, dayStats, streak, fmtNum, buddy, color } from './store.js';
import { esc, checkSvg } from './fx.js';

const TIPS = [
  'Stack a new habit onto an old one: “After I pour my coffee, I’ll drink a glass of water.”',
  'Make it tiny. Two minutes of reading still counts and keeps the streak alive.',
  'Put your cues where you can see them — shoes by the door, a book on your pillow.',
  'Missed a day? Never miss twice. One slip is an accident, two is a new habit.',
  'Log it right after you do it. The little check is part of the reward.',
  'Pair something you need to do with something you love, like a podcast on your walk.',
];
export const CHIP_TEXT = { tips: 'Give me a habit tip', goals: 'Help me set up a goal', schedule: 'What’s my schedule today?', progress: 'How am I doing?' };

// What the API receives as context, so a real model can answer about the user's day.
export function context() {
  const k = todayKey(), s = store.state;
  return {
    name: s.name, buddy: buddy().name, date: k, streak: streak(),
    today: habitsOn(k).map((h) => ({ id: h.id, name: h.name, time: h.time, value: val(h, k), goal: h.goal, unit: h.unit, done: isDone(h, k) })),
    sleepLastNight: s.sleep[addDays(k, -1)] || null,
  };
}

export async function reply(text, img) {
  if (CONFIG.chatEndpoint) {
    try {
      const history = store.state.chat.filter((m) => !m.typing && m.text).slice(-20)
        .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text.replace(/<[^>]+>/g, '') }));
      const res = await fetch(CONFIG.chatEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(CONFIG.chatHeaders || {}) },
        body: JSON.stringify({ message: text, image: img || null, history, context: context() }),
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      return { from: 'bot', text: esc(data.reply || data.message || '…').replace(/\n/g, '<br>'), actions: data.actions || null };
    } catch (e) {
      return { from: 'bot', text: 'I couldn’t reach my brain just now. Here’s what I know offline:', ...local(text, img) };
    }
  }
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));
  return { from: 'bot', ...local(text, img) };
}

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
    const w = habitById('water');
    if (w) { const v = val(w, k); return { text: `You’ve had <b>${fmtNum(v)} L</b> of ${fmtNum(w.goal)} L today. ${v >= w.goal ? 'Fully hydrated!' : `Just ${fmtNum(w.goal - v)} L to go.`}`, actions: [{ label: 'Log water', href: '#habits/water' }] }; }
  }
  if (has('sleep', 'tired', 'rest', 'bed')) {
    const sl = store.state.sleep[addDays(k, -1)];
    return { text: sl ? `You slept <b>${fmtNum(sl)}h</b> last night. ${sl >= 7 ? 'Nicely rested!' : 'Try winding down a little earlier tonight.'}` : 'You haven’t logged last night’s sleep yet.', actions: [{ label: 'Log sleep', action: 'sleep' }] };
  }
  if (t === CHIP_TEXT.progress.toLowerCase() || has('progress', 'how am i', 'doing', 'status', 'streak')) {
    const st = streak();
    return { text: s.total ? `You’ve done <b>${s.done} of ${s.total}</b> today and your streak is <b>${st} day${st === 1 ? '' : 's'}</b>. ${pending.length ? 'Still to go:' : 'Everything’s done — perfect day!'}` : 'No habits yet. Shall we plant one?',
      cards: pending.length ? habitChips(pending, k) : '', actions: pending.length ? null : [{ label: 'See insights', href: '#insights' }] };
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
  if (has('hi', 'hello', 'hey', 'morning', 'evening')) return { text: `Hey ${name}! I’m ${b}. Ask me for tips, your schedule, or how you’re doing.` };
  return { text: 'I’m still learning to chat properly, but I can already help with these:', actions: [{ label: 'Habit tips', say: 'tips' }, { label: 'Schedule', say: 'schedule' }, { label: 'My progress', say: 'progress' }] };
}
