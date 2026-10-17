// Habie — the iPad app: rendering, routing and interaction.
import {
  store, save, ICON, TIMES, TIME_ORDER, COLORS, ACCENTS, BUDDIES, AVATARS, TONES, avatarSrc, ICON_GROUPS, IDEAS, QUOTES, LEVEL_XP, BADGES,
  keyOf, dateOf, addDays, todayKey, monIndex, fmtDay, nowHHMM, fmtNum, blankState,
  habitById, val, isDone, scheduled, habitsOn, dayStats, perfect, color, buddy, stepOf, setVal,
  streak, bestStreak, habitStreak, habitBest, habitRate, totals, unlocked, progressText,
  isQuit, isWeekly, quitHabits, dueOn, isRest, isFrozen, settleDays, maybeEarnFreeze, weekCount, daysClean, MOODS, noteOf, setNote, patterns,
} from './store.js';
import { $, $$, esc, checkSvg, view, REDUCED, countTo, ring, stagePoint, confetti, rain, toast, sound, buzz } from './fx.js';
import { reply, CHIP_TEXT, getKey, ownKey, setKey, hasDeployedKey, writeInsights } from './chat.js';
import { initPWA, installState, promptInstall } from './pwa.js';

const S = () => store.state;
const DESIGN_W = 1180, MIN_H = 700;
const SECTIONS = ['home', 'insights', 'habits', 'buddy', 'settings'];
const ALIAS = { tracker: 'insights', chat: 'buddy', habit: 'habits' };
const stage = $('#stage'), app = $('#app'), scrim = $('#scrim');
const params = new URLSearchParams(location.search);
if (params.has('mockup')) document.documentElement.classList.add('mockup');

let viewDay = todayKey();
let filter = 'all';
let selId = null;
let iconGroup = null;                     // the icon picker's open tab
let lastChange = { id: null, at: 0 };
const justChanged = (h) => lastChange.id === h.id && performance.now() - lastChange.at < 700;

/* =========================================================================
   Theme & shared bits
   ========================================================================= */
function applyTheme() {
  const root = document.documentElement;
  root.dataset.mode = S().settings.dark ? 'dark' : 'light';
  root.dataset.accent = S().settings.accent;
  $('meta[name=theme-color]').content = getComputedStyle(root).getPropertyValue('--h1').trim() || '#7372c8';
}
function renderAvatar() {
  const a = S().avatar, src = avatarSrc(a), label = (AVATARS.find((x) => x.id === a.id) || AVATARS[0]).label;
  $$('[data-avatar-img]').forEach((img) => { if (!img.src.endsWith(src)) img.src = src; img.alt = `${label}, ${a.tone === 'default' ? 'yellow' : a.tone} skin tone`; });
}
// Swipe (or the arrows) to change the figure, tap to change the skin tone.
function changeAvatar(step, tone) {
  const a = S().avatar, img = $('#p-ava');
  if (tone) a.tone = TONES[(TONES.indexOf(a.tone) + 1) % TONES.length];
  else a.id = AVATARS[(AVATARS.findIndex((x) => x.id === a.id) + step + AVATARS.length) % AVATARS.length].id;
  save(); sound('tap'); buzz(8);
  if (REDUCED) { renderAvatar(); return; }
  img.classList.add('swap');
  const out = tone ? [{ transform: 'scale(1)' }, { transform: 'scale(.6) rotate(-10deg)', opacity: 0 }] : [{ transform: 'none' }, { transform: `translateX(${-step * 70}px) rotate(${-step * 12}deg)`, opacity: 0 }];
  img.animate(out, { duration: 160, easing: 'cubic-bezier(.4,0,1,1)' }).onfinish = () => {
    renderAvatar();
    const inn = tone ? [{ transform: 'scale(.6) rotate(10deg)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'none' }]
      : [{ transform: `translateX(${step * 70}px) rotate(${step * 12}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }];
    img.animate(inn, { duration: 340, easing: 'cubic-bezier(.3,1.4,.5,1)' }).onfinish = () => img.classList.remove('swap');
  };
}
{
  let sx = 0, sy = 0, down = false;
  const box = $('#avatar');
  box.addEventListener('pointerdown', (e) => { if (e.target.closest('.ava-arrow')) return; down = true; sx = e.clientX; sy = e.clientY; });
  box.addEventListener('pointerup', (e) => {
    if (!down) return; down = false;
    const dx = (e.clientX - sx) / view.scale, dy = (e.clientY - sy) / view.scale;
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) changeAvatar(dx < 0 ? 1 : -1);
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) changeAvatar(0, true);
  });
  box.addEventListener('pointercancel', () => { down = false; });
}
function renderBuddy() {
  const b = buddy();
  $$('[data-buddy-img]').forEach((img) => { if (!img.src.endsWith(b.id + '.png')) img.src = ICON(b.id); });
  $$('[data-buddy-name]').forEach((el) => { el.textContent = b.name; });
}
const emptyState = (title, sub) =>
  `<div class="empty"><img src="${ICON('seedling')}" alt=""><b>${title}</b><span>${sub}</span><a class="empty-btn" href="#new">New habit</a></div>`;
const plantFor = (done, n) => (n && done === n ? 'sunflower' : n && done / n >= 0.6 ? 'potted-plant' : n && done / n >= 0.3 ? 'herb' : 'seedling');

const playSvg = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4.5 2.8v10.4a.8.8 0 0 0 1.2.7l8.4-5.2a.8.8 0 0 0 0-1.4L5.7 2.1a.8.8 0 0 0-1.2.7z" fill="currentColor"/></svg>';
const pauseSvg = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3.5" y="2.5" width="3" height="11" rx="1"/><rect x="9.5" y="2.5" width="3" height="11" rx="1"/></svg>';
const timing = (h) => S().timer && S().timer.id === h.id;
const timerMin = () => (Date.now() - S().timer.start) / 60000;
const liveVal = (h, k) => val(h, k) + (timing(h) && S().timer.day === k ? timerMin() : 0);
const mmss = (min) => { const sec = Math.floor(min * 60); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
const freqText = (h) => (isQuit(h) ? 'Every day' : isWeekly(h) ? `${h.perWeek}× a week` : h.freq === 'interval' ? `Every ${h.every} days`
  : ((n) => (n === 7 ? 'Every day' : n === 5 && !h.days[5] && !h.days[6] ? 'Weekdays' : `${n} days a week`))(h.days.filter(Boolean).length));

// The round button on every habit row: logs a step, runs a timer, or (for quit habits) logs a slip.
function checkButton(h, k, size = 46) {
  const done = isDone(h, k);
  if (isQuit(h)) {
    return `<button class="h-check quit${done ? ' done' : ' slipped'}" data-slip="${h.id}" data-day="${k}" aria-label="${done ? 'Log a slip' : 'Undo slip'} for ${esc(h.name)}">${ring(done ? 1 : 0, size, 4, '#24b064')}<span class="h-check-in">${done ? `<b>${daysClean(h)}</b>` : '<b>!</b>'}</span></button>`;
  }
  if (h.kind === 'timer' && k === todayKey() && !done) {
    const run = timing(h);
    return `<button class="h-check timer${run ? ' running' : ''}" data-timer="${h.id}" aria-label="${run ? 'Stop' : 'Start'} timer for ${esc(h.name)}">${ring(liveVal(h, k) / h.goal, size, 4)}<span class="h-check-in">${run ? pauseSvg : playSvg}</span></button>`;
  }
  return `<button class="h-check${done ? ' done' : ''}" data-step-habit="${h.id}" data-day="${k}" aria-label="Log ${esc(h.name)}">${ring(val(h, k) / h.goal, size, 4)}<span class="h-check-in">${done ? checkSvg : '<b>+</b>'}</span></button>`;
}
const subText = (h, k) => {
  const v = val(h, k), done = isDone(h, k);
  if (isQuit(h)) return done ? `${daysClean(h)} day${daysClean(h) === 1 ? '' : 's'} clean` : 'Slipped today. Fresh start tomorrow';
  if (h.kind === 'timer' && timing(h)) return `<span data-timer-live="${h.id}">${mmss(liveVal(h, k))}</span> of ${h.goal} min · running`;
  const week = isWeekly(h) ? ` · ${weekCount(h, k)}/${h.perWeek} this week` : '';
  if (h.goal > 1 || h.kind === 'amount') return progressText(h, v) + week;
  return (done ? 'Done' : isWeekly(h) || h.freq === 'interval' ? freqText(h) : TIMES[h.time].label) + week;
};
// Day dots shared by the week strips: perfect, frozen, rest, or a progress ring.
function dayDot(d, cls, ring_) {
  if (perfect(d)) return `<span class="${cls} perfect">${checkSvg}</span>`;
  if (isFrozen(d)) return `<span class="${cls} frozen" title="Saved by a freeze"><img src="${ICON('ice')}" alt="Freeze"></span>`;
  if (isRest(d)) return `<span class="${cls} rest" title="Rest day"><img src="${ICON('beach-with-umbrella')}" alt="Rest"></span>`;
  return ring_();
}

/* =========================================================================
   Sidebar
   ========================================================================= */
function renderSidebar() {
  const k = todayKey(), s = dayStats(k), tt = totals();
  $('#side-count').textContent = `${s.done}/${s.total}`;
  $('#side-ring').setAttribute('stroke-dasharray', `${s.total ? (s.done / s.total) * 170 : 0} 170`);
  const plant = plantFor(s.done, s.total), img = $('#side-plant');
  if (!img.src.endsWith(plant + '.png')) img.src = ICON(plant);
  $('#side-streak').textContent = streak();
  const left = s.total - s.done, nb = $('#nb-home');
  nb.textContent = s.total ? (left ? left : '✓') : '';
  nb.classList.toggle('done', s.total > 0 && !left);
  $('#side-name').textContent = S().name || 'You';
  renderAvatar();
  $('#side-level').textContent = `Level ${tt.level} · ${tt.xp} XP`;
  const inst = installState();
  $('#install-btn').hidden = inst.installed;
  $('#install-row').hidden = inst.installed;
}

/* =========================================================================
   Today
   ========================================================================= */
function renderHome() {
  const k = todayKey(), list = habitsOn(k), s = dayStats(k);
  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  $('#home-date').textContent = fmtDay(k, { weekday: 'long', day: 'numeric', month: 'long' });
  $('#greet').textContent = S().name ? `Good ${part}, ${S().name}` : `Good ${part}`;
  $('#greet-sub').textContent = s.total && s.done === s.total ? 'Every habit done. What a day!' :
    { morning: 'Ready for a good day? Let’s grow something.', afternoon: 'Keep the momentum going.', evening: 'Time to wind down gently.' }[part];
  $('#home-bubble').textContent = !s.total ? 'Plant a habit!' : s.done === 0 ? 'Let’s start small!' : s.done === s.total ? 'Perfect day!' : s.done / s.total >= 0.5 ? 'More than halfway!' : 'Nice start!';

  // stats
  const w = S().habits.find((h) => h.kind === 'amount'), wv = w ? val(w, k) : 0, wg = w ? w.goal : 2.5;
  countTo($('#st-water'), wv, 2);
  $('#st-water-goal').textContent = `of ${fmtNum(wg)} L`;
  $('#st-water-bar').style.width = Math.min(100, (wv / wg) * 100) + '%';
  const sl = S().sleep[addDays(k, -1)] || 0;
  countTo($('#st-sleep'), sl, 1);
  $('#st-sleep-bar').style.width = Math.min(100, (sl / 9) * 100) + '%';
  $('#st-sleep-sub').textContent = sl ? (sl >= 7 ? 'well rested' : 'a bit short') : 'tap to log';
  const mins = S().habits.filter((h) => h.kind === 'timer' || (h.unit === 'min' && !isQuit(h)));
  const ev = Math.round(mins.reduce((a, h) => a + liveVal(h, k), 0)), eg = mins.filter((h) => scheduled(h, k)).reduce((a, h) => a + h.goal, 0) || 30;
  countTo($('#st-ex'), ev);
  $('#st-ex-bar').style.width = Math.min(100, (ev / eg) * 100) + '%';
  $('#st-ex-sub').textContent = `of ${eg} min`;

  // grouped list
  const focus = S().settings.focus;
  let hidden = 0;
  const groups = TIME_ORDER.map((t) => {
    let items = list.filter((h) => h.time === t);
    if (!items.length) return '';
    const done = items.filter((h) => isDone(h, k)).length;
    if (focus) { hidden += done; items = items.filter((h) => !isDone(h, k)); }
    return `<div class="group-h"><img src="${ICON(TIMES[t].icon)}" alt="">${TIMES[t].label}<em>${done}/${done + items.length - (focus ? 0 : done)}</em></div>` +
      items.map((h) => `<a class="habit${isDone(h, k) ? ' is-done' : ''}${justChanged(h) ? ' just' : ''}" href="#habits/${h.id}" style="--hc:${color(h)}">
        <span class="h-ic"><img src="${ICON(h.icon)}" alt=""></span>
        <span class="h-text"><span class="h-t">${esc(h.name)}</span><span class="h-s">${subText(h, k)}</span></span>
        ${checkButton(h, k)}</a>`).join('');
  }).join('');
  const quits = quitHabits(), rest = isRest(k);
  const quitRows = quits.length ? `<div class="group-h"><img src="${ICON('prohibited')}" alt="">Breaking free<em></em></div>` + quits.map((h) => `<a class="habit quit-row${isDone(h, k) ? '' : ' slipped'}" href="#habits/${h.id}" style="--hc:${color(h)}">
        <span class="h-ic"><img src="${ICON(h.icon)}" alt=""></span>
        <span class="h-text"><span class="h-t">${esc(h.name)}</span><span class="h-s">${subText(h, k)}</span></span>
        ${checkButton(h, k)}</a>`).join('') : '';
  const restBanner = rest ? `<div class="rest-banner"><img src="${ICON('beach-with-umbrella')}" alt=""><span><b>Rest day</b>Nothing is due and your streak is safe. Log anything you like.</span><button class="link" data-action="toggle-rest">Undo</button></div>` : '';
  const restRow = !rest && dueOn(k).length && !perfect(k) ? `<button class="rest-row" data-action="toggle-rest"><img src="${ICON('beach-with-umbrella')}" alt="">Not feeling it? Take a rest day</button>` : '';
  $('#home-groups').innerHTML = restBanner + (list.length || quits.length ? groups + quitRows : emptyState('Plant your first habit', 'Tiny habits grow into big changes.')) +
    (hidden ? `<div class="focus-note"><img src="${ICON('high-voltage')}" alt="">Focus mode is hiding ${hidden} finished habit${hidden > 1 ? 's' : ''}</div>` : '') + restRow;
  // group counts: done/total
  $$('#home-groups .group-h em').forEach((em, i) => {
    const t = TIME_ORDER.filter((x) => list.some((h) => h.time === x))[i];
    if (!t) return;
    const items = list.filter((h) => h.time === t);
    em.textContent = `${items.filter((h) => isDone(h, k)).length}/${items.length}`;
  });

  // progress card
  $('#pc-ring').setAttribute('stroke-dasharray', `${s.total ? (s.done / s.total) * 315 : 0} 315`);
  $('#pc-count').textContent = `${s.done}/${s.total}`;
  $('#pc-bar').innerHTML = dueOn(k).map((h, i) => `<span class="seg${i < s.done ? ' on' : ''}" style="--d:${i * 60}ms">${i === s.done - 1 ? '<i></i>' : ''}</span>`).join('');
  const left = s.total - s.done, next = dueOn(k).find((h) => !isDone(h, k)) || list.find((h) => !isDone(h, k) && !(isWeekly(h) && weekCount(h, k) >= h.perWeek));
  $('#pc-left').textContent = rest ? 'Rest day' : !s.total ? (list.length ? 'Nothing due today' : 'No habits yet') : left ? `${left} habit${left > 1 ? 's' : ''} left` : 'All done!';
  $('#pc-next').innerHTML = next ? `<em>Next:</em>${esc(next.name)}` : '<em>Next:</em>Rest well';

  // up next
  const un = $('#upnext');
  if (next) {
    un.style.setProperty('--hc', color(next));
    un.innerHTML = `<span class="un-ic"><img src="${ICON(next.icon)}" alt=""></span>
      <span class="un-t"><small>Up next</small><b>${esc(next.name)}</b><span>${next.remind ? `⏰ ${next.reminder}` : TIMES[next.time].label} · ${progressText(next, val(next, k))}</span></span>
      ${next.kind === 'timer' ? `<button class="un-btn" data-timer="${next.id}">${timing(next) ? 'Stop' : 'Start'}</button>` : `<button class="un-btn" data-step-habit="${next.id}" data-day="${k}">${next.kind === 'amount' ? '+250 ml' : next.goal > 1 ? `+${fmtNum(next.step)}` : 'Done'}</button>`}`;
  } else {
    un.style.setProperty('--hc', '#22ae63');
    un.innerHTML = `<span class="un-ic"><img src="${ICON(s.total ? 'sunflower' : 'seedling')}" alt=""></span>
      <span class="un-t"><small>${s.total ? 'All done' : 'Get started'}</small><b>${s.total ? 'Your garden is in full bloom' : 'Plant your first habit'}</b><span>${s.total ? 'Come back tomorrow to keep the streak.' : 'It takes ten seconds.'}</span></span>
      ${s.total ? '' : '<a class="un-btn" href="#new">New</a>'}`;
  }

  // this week (Mon..Sun)
  const mon = addDays(k, -monIndex(k));
  $('#home-week').innerHTML = Array.from({ length: 7 }, (_, i) => addDays(mon, i)).map((d, i) => {
    const ds = dayStats(d), lbl = fmtDay(d, { weekday: 'narrow' });
    let dot;
    if (d > k) dot = '<span class="d future"></span>';
    else dot = dayDot(d, 'd', () => `<span class="d" style="--dl:${i * 50}ms">${ring(ds.total ? ds.done / ds.total : 0, 30, 4, 'var(--a)')}</span>`);
    return `<span class="mw${d === k ? ' today' : ''}">${lbl}${dot}</span>`;
  }).join('');

  // buddy tip
  $('#home-tip').textContent = s.done === s.total && s.total ? 'You did everything today! I’m so proud of you.' :
    s.done / (s.total || 1) >= 0.5 ? 'You’re great! Keep going, you’re almost there!' : 'Small steps count. Want a tip to get going?';

  // bell
  const now = nowHHMM();
  $('#bell-dot').classList.toggle('on', S().settings.reminders && list.some((h) => h.remind && h.reminder <= now && !isDone(h, k)));
}

/* =========================================================================
   Insights
   ========================================================================= */
function renderInsights() {
  const t = todayKey(), st = streak(), ts = dayStats(t);
  countTo($('#sk-title'), st, 0, st === 1 ? ' day streak' : ' days streak');
  $('#sk-sub').textContent = st === 0 ? 'Finish today to start a new streak' : st >= 7 ? 'Unstoppable! Keep the fire going.' : st >= 3 ? 'Rise and good. You’re on a roll.' : 'Off to a great start';
  const sunday = addDays(t, -dateOf(t).getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  let runEnd = -1, runStart = -1;
  days.forEach((k, i) => { if (k <= t && (perfect(k) || isFrozen(k))) { if (runStart < 0 || i !== runEnd + 1) runStart = i; runEnd = i; } });
  const current = runEnd >= 0 && (days[runEnd] === t || days[runEnd] === addDays(t, -1));
  const track = current ? `<span class="sk-track" style="left:${(runStart / 7) * 100}%;width:${((runEnd - runStart + 1) / 7) * 100}%"></span><span class="sk-line" style="left:${((runStart + 0.5) / 7) * 100}%;width:${((runEnd - runStart) / 7) * 100}%"></span>` : '';
  $('#sk-week').innerHTML = track + days.map((k, i) => {
    const isT = k === t;
    let dot;
    if (k > t) dot = `<span class="num">${dateOf(k).getDate()}</span>`;
    else if (perfect(k)) dot = `<span class="dot${isT ? ' big' : ''}" style="--dl:${i * 70}ms">${checkSvg}</span>`;
    else if (isFrozen(k)) dot = `<span class="dot ice" title="Saved by a freeze"><img src="${ICON('ice')}" alt="Freeze"></span>`;
    else if (isRest(k)) dot = `<span class="dot rest" title="Rest day"><img src="${ICON('beach-with-umbrella')}" alt="Rest"></span>`;
    else if (isT) dot = `<span class="dot pending"><i style="--p:${ts.total ? ts.done / ts.total : 0}"></i></span>`;
    else dot = '<span class="dot miss"></span>';
    return `<div class="sk-day${isT ? ' today' : ''}"><span class="sk-l">${fmtDay(k, { weekday: 'short' })}</span><span class="sk-cell">${dot}</span></div>`;
  }).join('');
  const fz = S().freezes;
  $('#sk-foot').innerHTML = `${isRest(t) ? 'Rest day today' : `${ts.done} of ${ts.total} habits done today`}<span class="sk-freeze" title="Every 7-day streak earns a freeze, up to 3. A freeze saves your streak on a missed day."><img src="${ICON('ice')}" alt="">${fz} freeze${fz === 1 ? '' : 's'}</span>`;
  if (currentSection === 'insights' || !currentSection) renderPatterns();   // ~10 ms of statistics: only when it's on screen

  // week score
  let sched = 0, done = 0;
  days.filter((k) => k <= t).forEach((k) => { const s = dayStats(k); sched += s.total; done += s.done; });
  const pct = sched ? Math.round((done / sched) * 100) : 0;
  $('#wk-ring').setAttribute('stroke-dasharray', `${(pct / 100) * 390} 390`);
  countTo($('#wk-pct'), pct, 0, '%');
  $('#wk-sub').textContent = `${done} of ${sched} check-ins this week`;

  // sleep: 14 nights
  const nights = Array.from({ length: 14 }, (_, i) => addDays(t, i - 14));
  const vals = nights.map((k) => S().sleep[k] || 0), max = 11;
  $('#sleep-chart').innerHTML = `<span class="goal-line" style="bottom:calc(${(8 / max) * 100}% * .86 + 17px)"><span>8h goal</span></span>` +
    nights.map((k, i) => {
      const v = vals[i], wake = addDays(k, 1);
      return `<span class="sbar${wake === t ? ' today' : ''}"><i class="${!v ? 'none' : v < 7 ? 'short' : ''}" style="--h:${v ? (v / max) * 86 : 8}%;--dl:${i * 40}ms">${v ? `<em>${fmtNum(v)}h</em>` : ''}</i><span>${fmtDay(wake, { weekday: 'narrow' })}</span></span>`;
    }).join('');
  const logged = vals.filter(Boolean);
  $('#sleep-avg').textContent = logged.length ? `${(logged.reduce((a, b) => a + b, 0) / logged.length).toFixed(1)}h on average · ${logged.filter((v) => v >= 7).length} of ${logged.length} nights well rested` : 'Log your sleep to see it here';

  // level
  const tt = totals();
  $('#lv-num').textContent = `Level ${tt.level}`;
  $('#lv-title').textContent = titleFor(tt.level);
  $('#lv-bar').style.width = (tt.into / LEVEL_XP) * 100 + '%';
  $('#lv-label').textContent = `${LEVEL_XP - tt.into} XP to level ${tt.level + 1}`;

  // matrix: last 14 days
  const last = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
  let list = S().habits.slice();
  const score = (h) => { const s = last.filter((k) => scheduled(h, k)); return s.length ? s.filter((k) => isDone(h, k)).length / s.length : 0; };
  if (S().sort === 'best') list.sort((a, b) => score(b) - score(a));
  else if (S().sort === 'worst') list.sort((a, b) => score(a) - score(b));
  else list.sort((a, b) => TIME_ORDER.indexOf(a.time) - TIME_ORDER.indexOf(b.time));
  $('#sort-label').textContent = { time: 'By time of day', best: 'Strongest first', worst: 'Needs love first' }[S().sort];
  $('#matrix').innerHTML = `<div class="mx-row head"><span></span>${last.map((k) => `<span class="${k === t ? 'today' : ''}">${fmtDay(k, { weekday: 'narrow' })}<br>${dateOf(k).getDate()}</span>`).join('')}<span>rate</span></div>` +
    (list.map((h, r) => `<a class="mx-row" href="#habits/${h.id}" style="--hc:${color(h)}"><span class="mx-name"><img src="${ICON(h.icon)}" alt="">${esc(h.name)}</span>` +
      last.map((k, i) => `<span class="mx-c ${!scheduled(h, k) ? 'off' : isDone(h, k) ? 'on' : val(h, k) > 0 ? 'part' : ''}" style="--dl:${(r * 3 + i) * 12}ms"></span>`).join('') +
      `<span class="mx-rate">${Math.round(score(h) * 100)}%</span></a>`).join('') || emptyState('Nothing to show yet', 'Add a habit and its history appears here.'));

  // month calendar
  const first = keyOf(new Date(dateOf(t).getFullYear(), dateOf(t).getMonth(), 1));
  $('#month-title').textContent = fmtDay(t, { month: 'long', year: 'numeric' });
  const blanks = monIndex(first), dim = new Date(dateOf(t).getFullYear(), dateOf(t).getMonth() + 1, 0).getDate();
  $('#month-grid').innerHTML = Array.from({ length: blanks }, () => '<span class="md blank"></span>').join('') +
    Array.from({ length: dim }, (_, i) => {
      const k = addDays(first, i), s = dayStats(k), d = i + 1;
      if (k > t) return `<span class="md future">${d}</span>`;
      if (perfect(k)) return `<span class="md perfect${k === t ? ' today' : ''}" style="--dl:${i * 15}ms">${d}<img src="${ICON('sunflower')}" alt=""></span>`;
      if (isFrozen(k) || isRest(k)) return `<span class="md ${isRest(k) ? 'rest' : 'frozen'}${k === t ? ' today' : ''}" style="--dl:${i * 15}ms">${d}<img src="${ICON(isRest(k) ? 'beach-with-umbrella' : 'ice')}" alt=""></span>`;
      return `<span class="md${k === t ? ' today' : ''}" style="--dl:${i * 15}ms">${d}<i><b style="width:${s.total ? (s.done / s.total) * 100 : 0}%"></b></i></span>`;
    }).join('');

  countTo($('#tot-done'), tt.done);
  countTo($('#tot-perfect'), tt.perfectDays);
  countTo($('#tot-best'), bestStreak());
}
// Patterns: local statistics always; the buddy's write-up on top when there's an API key.
let insightBusy = false;
function renderPatterns() {
  const found = patterns(), box = $('#patterns'), ai = S().insight, k = todayKey();
  const list = found.map((f) => `<li><img src="${ICON(f.icon)}" alt=""><span>${esc(f.text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</span></li>`).join('');
  const canAsk = !!getKey() && found.length;
  $('#patterns-ask').hidden = !canAsk;
  $('#patterns-ask').disabled = insightBusy;
  $('#patterns-ask span').textContent = insightBusy ? 'Thinking…' : ai && ai.date === k ? 'Ask again' : `Ask ${buddy().name}`;
  box.innerHTML = !found.length
    ? `<p class="pt-empty"><img src="${ICON('magnifying-glass-tilted-left')}" alt="">Keep logging for about two weeks${Object.keys(S().sleep).length ? '' : ' (and log your sleep)'} and patterns in your days will show up here.</p>`
    : `<ul class="pt-list">${list}</ul>` + (ai && ai.html ? `<div class="pt-ai"><span class="pt-ai-h"><img src="${ICON(S().buddy)}" alt="">${buddy().name}’s read${ai.date === k ? '' : ` · ${fmtDay(ai.date, { day: 'numeric', month: 'short' })}`}</span><div class="m-md">${ai.html}</div></div>` : '');
}
async function askInsights() {
  if (insightBusy) return;
  insightBusy = true; renderPatterns();
  try {
    const html = await writeInsights(patterns());
    S().insight = { date: todayKey(), html }; save(); sound('soft');
  } catch (e) { toast('Couldn’t reach your buddy just now', 'cloud'); }
  insightBusy = false; renderPatterns();
}

const titleFor = (lv) => (lv >= 10 ? 'Habit Legend' : lv >= 5 ? 'Habit Hero' : lv >= 3 ? 'Rising Star' : 'Sprout');

/* =========================================================================
   Habits: list + detail
   ========================================================================= */
function renderHabits() {
  const t = todayKey(), k = viewDay;
  $('#habits-date').textContent = k === t ? `Today, ${fmtDay(k, { day: 'numeric', month: 'long' })}` : `Looking back at ${fmtDay(k, { weekday: 'long', day: 'numeric', month: 'long' })}`;
  const sunday = addDays(t, -dateOf(t).getDay());
  $('#week-strip').innerHTML = Array.from({ length: 7 }, (_, i) => addDays(sunday, i)).map((d) => {
    const cls = ['wday', d === t && 'today', d === k && 'sel', d > t && 'future', d <= t && perfect(d) && 'done'].filter(Boolean).join(' ');
    return `<button class="${cls}" data-day-pick="${d}" ${d > t ? 'disabled' : ''}><span>${fmtDay(d, { weekday: 'short' })}</span><b>${dateOf(d).getDate()}</b>${d <= t && perfect(d) ? '<i></i>' : ''}</button>`;
  }).join('');

  // garden
  const list = habitsOn(k), n = list.length, done = list.filter((h) => isDone(h, k)).length;
  const R = 118, C = 2 * Math.PI * R, gap = n > 1 ? 30 : 0, seg = n ? C / n : C;
  $('#garden-ring').innerHTML = (n ? '' : `<circle cx="150" cy="150" r="${R}" fill="none" class="ring-track" stroke-width="16"/>`) +
    list.map((h, i) => `<circle cx="150" cy="150" r="${R}" fill="none" stroke="${isDone(h, k) ? color(h) : 'var(--ring-off)'}" stroke-width="16" stroke-linecap="round"
      stroke-dasharray="${Math.max(0.1, seg - gap)} ${C}" transform="rotate(${-90 + (i * 360) / n + (gap / C) * 180} 150 150)"/>`).join('');
  const sc = 200 / 300;
  $('#garden-orbit').innerHTML = list.map((h, i) => {
    const a = ((-90 + (i + 0.5) * (360 / n)) * Math.PI) / 180;
    return `<a class="orbit-ic${isDone(h, k) ? ' on' : ''}${justChanged(h) ? ' just' : ''}" href="#habits/${h.id}" style="left:${(150 + R * Math.cos(a)) * sc}px;top:${(150 + R * Math.sin(a)) * sc}px"><img src="${ICON(h.icon)}" alt="${esc(h.name)}"></a>`;
  }).join('');
  const plant = plantFor(done, n), img = $('#garden-plant');
  if (!img.src.endsWith(plant + '.png')) {
    img.src = ICON(plant);
    if (!REDUCED) img.animate([{ scale: 0.4, opacity: 0 }, { scale: 1.12, opacity: 1 }, { scale: 1 }], { duration: 700, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  }
  img.style.setProperty('--grow', 0.75 + 0.25 * (n ? done / n : 0));
  $('#garden-count').innerHTML = `<b>${done}</b>/${n}`;
  $('#garden-msg').textContent = !n ? 'Nothing planted for this day.' : done === n ? 'Full bloom! Every habit done.' : done / n >= 0.5 ? 'Blooming nicely. Keep watering!' : 'Water your habits to help it grow.';
  $('#back-today').hidden = k === t;

  // list
  let items = list.filter((h) => filter === 'all' || h.time === filter);
  const hidden = S().settings.focus ? items.filter((h) => isDone(h, k)).length : 0;
  if (S().settings.focus) items = items.filter((h) => !isDone(h, k) || h.id === selId);
  const quits = quitHabits().filter((h) => filter === 'all' || h.time === filter);
  const unscheduled = S().habits.filter((h) => !isQuit(h) && !list.includes(h) && (filter === 'all' || h.time === filter));
  if (!selId || !habitById(selId)) selId = (items[0] || list[0] || quits[0] || S().habits[0] || {}).id || null;
  const row = (h, off) => `<a class="li${h.id === selId ? ' sel' : ''}${isDone(h, k) ? ' is-done' : ''}${justChanged(h) ? ' just' : ''}" href="#habits/${h.id}" style="--hc:${color(h)}${off ? ';opacity:.55' : ''}">
      <span class="h-ic"><img src="${ICON(h.icon)}" alt=""></span>
      <span class="li-text"><b>${esc(h.name)}</b><span><img src="${ICON(TIMES[h.time].icon)}" alt="">${off ? 'Not scheduled' : subText(h, k)}${isQuit(h) ? '' : `<span class="li-streak"><img src="${ICON('fire')}" alt="">${habitStreak(h)}${isWeekly(h) ? 'w' : ''}</span>`}</span></span>
      ${off || k > t || (isQuit(h) && k < h.created) ? '' : checkButton(h, k, 42)}</a>`;
  $('#habit-list').innerHTML = items.map((h) => row(h)).join('') +
    (hidden ? `<div class="focus-note"><img src="${ICON('high-voltage')}" alt="">${hidden} finished habit${hidden > 1 ? 's' : ''} hidden</div>` : '') +
    quits.map((h) => row(h)).join('') +
    unscheduled.map((h) => row(h, true)).join('') +
    `<a class="li li-add" href="#new"><span>+</span>New habit</a>`;
  renderDetail();
}

function renderDetail(animate) {
  const h = habitById(selId);
  $('#detail-inner').hidden = !h;
  $('#detail-empty').hidden = !!h;
  if (!h) return;
  const t = todayKey(), k = viewDay, v = liveVal(h, k), done = isDone(h, k), quit = isQuit(h);
  const pct = quit ? (done ? 1 : 0) : Math.min(1, v / h.goal);
  const box = $('#detail');
  box.style.setProperty('--hc', color(h));
  $('#d-icon').src = ICON(h.icon);
  $('#d-name').textContent = h.name;
  $('#d-time').innerHTML = `<img src="${ICON(TIMES[h.time].icon)}" alt="">${TIMES[h.time].label}`;
  $('#d-days').innerHTML = `<img src="${ICON(h.freq === 'days' ? 'calendar' : 'repeat-button')}" alt="">${freqText(h)}`;
  $('#d-wave').style.setProperty('--fill', quit ? Math.min(1, daysClean(h) / 30) : pct);
  countTo($('#d-pct'), quit ? daysClean(h) : Math.round(pct * 100), 0, quit ? 'd' : '%');
  $('#d-day-label').textContent = k === t ? 'Today' : fmtDay(k, { weekday: 'long', day: 'numeric', month: 'short' });
  $('#d-count').innerHTML = quit ? (done ? 'Clean' : 'Slipped') : isWeekly(h) ? `${weekCount(h, k)} of ${h.perWeek} this week` :
    h.kind === 'timer' ? `<span data-timer-live="${h.id}">${timing(h) ? mmss(v) : fmtNum(Math.round(v))}</span> of ${h.goal} min` : progressText(h, v);
  const special = $('#d-special');
  special.innerHTML = '';
  if (quit) {
    $('#d-units').innerHTML = ''; $('#d-amounts').innerHTML = '';
    const n = daysClean(h), best = habitBest(h);
    special.innerHTML = `<div class="quit-hero${done ? '' : ' slipped'}"><b>${n}</b><span>day${n === 1 ? '' : 's'} clean${best > n ? ` · best ${best}` : ''}</span>
      <p>${done ? (n >= best && n > 2 ? 'Your longest run yet. Keep going!' : 'Every clean day counts.') : 'One slip doesn’t undo your progress. Fresh start tomorrow.'}</p></div>`;
  } else if (h.kind === 'timer') {
    $('#d-units').innerHTML = ''; $('#d-amounts').innerHTML = '';
    const run = timing(h);
    special.innerHTML = `<div class="timer-box${run ? ' running' : ''}">
      <span class="timer-face">${ring(Math.min(1, v / h.goal), 132, 10)}<b data-timer-live="${h.id}" data-timer-fmt="clock">${mmss(v)}</b></span>
      <div class="timer-ctl">
        ${k === t ? `<button class="timer-go" data-timer="${h.id}">${run ? pauseSvg + 'Stop' : playSvg + (v > 0 ? 'Resume' : 'Start')}</button>` : ''}
        <div class="timer-adj"><button class="amt minus" data-minutes="-5" aria-label="Remove 5 minutes">−5</button><button class="amt" data-minutes="5">+5 min</button><button class="amt" data-minutes="${h.goal}">Full ${h.goal}</button></div>
      </div></div>`;
  } else if (h.kind === 'amount') {
    $('#d-units').innerHTML = '';
    $('#d-amounts').innerHTML = `
      <div class="litre-gauge"><i style="width:${pct * 100}%"></i>${[0.25, 0.5, 0.75].map((m) => `<span class="tick" style="left:${m * 100}%"></span>`).join('')}</div>
      <div class="gauge-l"><span>0 L</span><span>${fmtNum(h.goal / 2)} L</span><span>${fmtNum(h.goal)} L</span></div>
      <div class="amount-btns">
        <button class="amt minus" data-amount="-0.25" aria-label="Remove 250 ml"><svg width="18" height="18" viewBox="0 0 20 20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 10h12"/></svg></button>
        ${[0.1, 0.25, 0.5].map((a) => `<button class="amt" data-amount="${a}"><img src="${ICON('droplet')}" alt="" style="width:${16 + a * 28}px">+${Math.round(a * 1000)} ml</button>`).join('')}
      </div>`;
  } else {
    $('#d-amounts').innerHTML = '';
    const steps = Math.round(h.goal / h.step), filled = Math.round(v / h.step);
    $('#d-units').innerHTML = Array.from({ length: steps }, (_, i) =>
      `<button class="unit${i < filled ? ' on' : ''}${justChanged(h) && i === filled - 1 ? ' pop' : ''}" data-unit="${i}"><img src="${ICON(h.unitIcon || h.icon)}" alt=""><em>${fmtNum((i + 1) * h.step)}${steps > 1 ? '' : ' ' + h.unit}</em></button>`).join('');
  }
  const log = $('#d-log');
  log.hidden = h.kind === 'timer';
  log.disabled = k > t || (quit && k < h.created);
  log.textContent = quit ? (done ? 'I slipped' : 'Undo slip') : done ? 'Done for the day' : h.kind === 'amount' ? 'Log 250 ml' : h.goal === 1 ? 'Mark as done' : `Log ${fmtNum(h.step)} ${h.unit}`;
  log.classList.toggle('is-done', done && !quit);
  log.classList.toggle('slip', quit && done);
  $('#d-streak-l').textContent = quit ? 'days clean' : isWeekly(h) ? 'week streak' : 'day streak';
  countTo($('#d-streak'), habitStreak(h));
  countTo($('#d-best'), habitBest(h));
  countTo($('#d-rate'), habitRate(h), 0, '%');

  const start = addDays(t, -monIndex(t) - 28);
  const cells = Array.from({ length: 35 }, (_, i) => addDays(start, i));
  $('#d-heat-title').textContent = `${fmtDay(cells[0], { day: 'numeric', month: 'short' })} – ${fmtDay(cells[34], { day: 'numeric', month: 'short' })}`;
  $('#d-heat').innerHTML = cells.map((c, i) => {
    if (c > t) return '<i class="lv-1"></i>';
    if (!scheduled(h, c)) return '<i class="lvx"></i>';
    if (isRest(c)) return `<i class="lv-rest" title="Rest day"></i>`;
    if (quit) return `<i class="${isDone(h, c) ? 'lv3' : 'lv-slip'}${c === k ? ' today' : ''}" style="--dl:${i * 12}ms"></i>`;
    const p = val(h, c) / h.goal, lv = p >= 1 ? 3 : p >= 0.5 ? 2 : p > 0 ? 1 : 0;
    return `<i class="lv${lv}${c === k ? ' today' : ''}" style="--dl:${i * 12}ms" title="${fmtDay(c, { day: 'numeric', month: 'short' })}"></i>`;
  }).join('');
  renderNotes(h, k);
  $('#d-remind-time').value = h.reminder || '08:00';
  $('#d-remind-switch').setAttribute('aria-pressed', !!h.remind);

  if (animate && !REDUCED) {
    $$('#detail-inner > *').forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateX(26px)' }, { opacity: 1, transform: 'none' }],
      { duration: 420, delay: i * 45, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
  }
}

// Notes & mood for one habit on one day, plus the latest notes.
function renderNotes(h, k) {
  const n = noteOf(h, k) || { mood: 0, text: '' }, t = todayKey();
  $('#d-note-day').textContent = k === t ? 'Today' : fmtDay(k, { weekday: 'short', day: 'numeric', month: 'short' });
  $('#d-moods').innerHTML = MOODS.map((m) => `<button class="mood${n.mood === m.v ? ' on' : ''}" data-mood="${m.v}" aria-label="${m.label}"><img src="${ICON(m.icon)}" alt=""><span>${m.label}</span></button>`).join('');
  const ta = $('#d-note');
  if (document.activeElement !== ta) ta.value = n.text || '';
  ta.disabled = k > t;
  const recent = Object.keys(S().notes).filter((d) => d !== k && S().notes[d][h.id]).sort().reverse().slice(0, 4);
  $('#d-note-list').innerHTML = recent.map((d) => {
    const x = S().notes[d][h.id], m = MOODS.find((y) => y.v === x.mood);
    return `<div class="note-row">${m ? `<img src="${ICON(m.icon)}" alt="${m.label}">` : '<span class="note-dot"></span>'}<span><b>${fmtDay(d, { weekday: 'short', day: 'numeric', month: 'short' })}</b>${esc(x.text || m.label)}</span></div>`;
  }).join('');
}

/* =========================================================================
   Timers, slips & rest days
   ========================================================================= */
function stopTimer(silent) {
  const tm = S().timer; if (!tm) return;
  const h = habitById(tm.id); S().timer = null;
  if (!h) { save(); return; }
  const min = (Date.now() - tm.start) / 60000;
  const add = min < 0.33 ? 0 : Math.max(1, Math.round(min));
  if (add) setValue(h, tm.day, val(h, tm.day) + add);
  else { save(); renderAll(); }
  if (!silent && add) toast(`${add} min of ${h.name} logged`, h.unitIcon || h.icon);
}
function toggleTimer(h) {
  if (timing(h)) { stopTimer(); return; }
  if (S().timer) stopTimer(true);
  S().timer = { id: h.id, day: todayKey(), start: Date.now(), cheered: isDone(h, todayKey()) };
  selId = h.id; save(); renderAll(); sound('pop'); buzz(10);
  toast(`${h.name} timer started`, h.unitIcon || h.icon);
}
// Ticks once a second while a timer runs: live clocks and rings, a cheer when the goal is reached.
setInterval(() => {
  const tm = S().timer; if (!tm) return;
  const h = habitById(tm.id); if (!h) { S().timer = null; return; }
  const v = liveVal(h, tm.day);
  $$(`[data-timer-live="${h.id}"]`).forEach((el) => { el.textContent = mmss(v); });
  $$(`[data-timer="${h.id}"] circle:last-child, .timer-face circle:last-child`).forEach((c) => {
    const C = 2 * Math.PI * +c.getAttribute('r'); c.setAttribute('stroke-dasharray', `${C * Math.min(1, v / h.goal)} ${C}`);
  });
  if (selId === h.id && currentSection === 'habits' && viewDay === tm.day) {
    $('#d-wave').style.setProperty('--fill', Math.min(1, v / h.goal));
    const el = $('#d-pct'); el._count = (el._count || 0) + 1; el.dataset.v = Math.round(Math.min(1, v / h.goal) * 100); el.textContent = el.dataset.v + '%';
  }
  if (!tm.cheered && v >= h.goal) { tm.cheered = true; save(); sound('perfect'); buzz(30); toast(`${h.goal} minutes! Stop whenever you’re done`, 'timer-clock'); }
}, 1000);

function slip(h, k) {
  if (!isDone(h, k)) { setVal(h, k, 0); save(); renderAll(); toast('Slip removed. Still going strong', 'sparkles'); sound('pop'); return; }
  const n = daysClean(h);
  openDialog(`<div class="sh-hero"><img class="sh-big" src="${ICON(h.icon)}" alt=""></div>
    <h3 class="sh-title">Log a slip?</h3><p class="sh-sub">You’ve been clean for ${n} day${n === 1 ? '' : 's'}. A slip resets the counter, not your progress. Be kind to yourself.</p>
    <div class="sh-pair"><button class="sh-btn ghost" data-action="close">Not today</button><button class="sh-btn" data-action="confirm-slip" data-id="${h.id}" data-day="${k}">Log slip</button></div>`);
}
function toggleRest(k = todayKey()) {
  if (S().rest[k]) { delete S().rest[k]; toast('Rest day removed', 'calendar'); }
  else { S().rest[k] = true; toast('Rest day. Your streak is safe', 'beach-with-umbrella'); }
  save(); renderAll(); sound('pop');
}
function settle() {
  const used = settleDays();
  if (used.length) { save(); setTimeout(() => toast(used.length > 1 ? `${used.length} freezes saved your streak` : `A freeze saved your ${streak()}-day streak`, 'ice'), 1200); }
}

/* =========================================================================
   Buddy
   ========================================================================= */
function renderBuddyScreen() {
  $('#buddy-switch').innerHTML = BUDDIES.map((b) => `<button class="${b.id === S().buddy ? 'on' : ''}" data-buddy="${b.id}" aria-label="${b.name}"><img src="${ICON(b.id)}" alt=""></button>`).join('');
  renderChat(false);
}
function renderChat(animateLast) {
  const chat = S().chat;
  $('#chat-empty').hidden = chat.length > 0;
  $('#msgs').innerHTML = chat.map((m, i) => {
    const anim = animateLast && i === chat.length - 1 ? ' new' : '';
    if (m.typing) return `<div class="msg bot typing${anim}"><span class="m-ava"><img src="${ICON(S().buddy)}" alt=""></span><p><i></i><i></i><i></i></p></div>`;
    const acts = m.actions ? `<div class="m-actions">${m.actions.map((a) => a.href ? `<a class="m-act" href="${a.href}">${esc(a.label)}</a>` :
      a.say ? `<button class="m-act" data-say="${a.say}">${esc(a.label)}</button>` : `<button class="m-act" data-action="${a.action}">${esc(a.label)}</button>`).join('')}</div>` : '';
    const body = (m.img ? `<img class="m-img" src="${m.img}" alt="Shared photo">` : '') + (m.text ? (m.md ? `<div class="m-md">${m.text}</div>` : `<p>${m.text}</p>`) : '') + (m.cards ? `<div class="m-cards">${m.cards}</div>` : '') + acts;
    return m.from === 'me' ? `<div class="msg me${anim}">${body}</div>` : `<div class="msg bot${anim}"><span class="m-ava"><img src="${ICON(S().buddy)}" alt=""></span><div class="m-body">${body}</div></div>`;
  }).join('');
  const sc = $('#convo-scroll');
  requestAnimationFrame(() => sc.scrollTo({ top: sc.scrollHeight, behavior: REDUCED ? 'auto' : 'smooth' }));
}
// What the buddy's tools call, so its changes celebrate and re-render exactly like taps.
const chatOps = {
  setValue: (h, k, v) => setValue(h, k, v),
  changed: (id) => { if (id) { selId = id; lastChange = { id, at: performance.now() }; } save(); renderAll(); renderBuddy(); },
  theme: applyTheme,
  setReminders,
  go: (hash) => { location.hash = hash; },
  timer: (h, action) => { if ((action === 'start') !== !!timing(h)) toggleTimer(h); },
  reset: () => { const s = S(); store.state = blankState({ name: s.name, buddy: s.buddy, settings: s.settings, installDismissed: s.installDismissed, chat: s.chat }); selId = null; save(); renderAll(); },
};
async function userSays(text, img) {
  S().chat.push({ from: 'me', text: text ? esc(text) : '', img });
  S().chat.push({ typing: true });
  renderChat(true); sound('tap');
  $('#bp-status').textContent = `${buddy().name} is typing…`;
  const msg = await reply(text, img, chatOps);
  S().chat = S().chat.filter((m) => !m.typing);
  S().chat.push(msg);
  $('#bp-status').textContent = 'Your little habit buddy';
  save(); renderChat(true); sound('soft');
}

/* =========================================================================
   Settings
   ========================================================================= */
function renderSettings() {
  const tt = totals();
  if (document.activeElement !== $('#p-name')) $('#p-name').value = S().name;
  $('#p-level').textContent = `Lv ${tt.level}`;
  $('#p-title').textContent = titleFor(tt.level);
  $('#xp-bar').style.width = (tt.into / LEVEL_XP) * 100 + '%';
  $('#xp-ring').setAttribute('stroke-dasharray', `${(tt.into / LEVEL_XP) * 377} 377`);
  $('#xp-label').textContent = `${tt.into} / ${LEVEL_XP} XP to level ${tt.level + 1}`;
  countTo($('#p-streak'), streak());
  countTo($('#p-done'), tt.done);
  const un = unlocked();
  countTo($('#p-badges'), un.length);
  $('#badge-count').textContent = `${un.length} of ${BADGES.length} unlocked`;
  $('#badges').innerHTML = BADGES.slice().sort((a, b) => un.includes(b.id) - un.includes(a.id)).map((b, i) => {
    const on = un.includes(b.id), cur = Math.min(b.cur(), b.goal);
    return `<div class="badge${on ? '' : ' locked'}" style="--b1:${b.b[0]};--b2:${b.b[1]};--dl:${i * 50}ms;--dl2:${i * 0.5}s"><img src="${ICON(b.icon)}" alt="">
      <b>${b.name}</b><span>${on ? `${b.goal} ${b.desc}` : `${cur} / ${b.goal} ${b.desc}`}</span>
      ${on ? '' : `<span class="badge-prog"><i style="width:${(cur / b.goal) * 100}%"></i></span><i class="lock"><img src="${ICON('locked')}" alt=""></i>`}</div>`;
  }).join('');
  $('#buddies').innerHTML = BUDDIES.map((b) => `<button class="buddy${b.id === S().buddy ? ' on' : ''}" data-buddy="${b.id}"><img src="${ICON(b.id)}" alt=""><span>${b.name}</span></button>`).join('');
  $$('[data-setting]').forEach((s) => s.setAttribute('aria-pressed', !!S().settings[s.dataset.setting]));
  $$('[data-accent-pick]').forEach((b) => b.classList.toggle('on', b.dataset.accentPick === S().settings.accent));
  $('#pref-theme-sub').textContent = ACCENTS[S().settings.accent];
  $('#pref-dark-sub').textContent = S().settings.dark ? 'On' : 'Off';
  $('#pref-reminders-sub').textContent = S().settings.reminders ? `${S().habits.filter((h) => h.remind).length} active · while Habie is open` : 'Off';
  $('#brain-sub').textContent = ownKey() ? 'Smart · your own key' : hasDeployedKey() ? 'Smart · can change anything' : 'Simple · add an API key';
  const inst = installState();
  $('#install-sub').textContent = inst.installed ? 'Installed' : inst.canPrompt ? 'One tap to install' : 'Add it to your Home Screen';
}

function renderAll() {
  renderBuddy(); renderSidebar(); renderHome(); renderInsights(); renderHabits(); renderSettings();
}

/* =========================================================================
   Editor (form sheet)
   ========================================================================= */
let draft = null;
const newDraft = () => ({ id: null, name: '', icon: 'running-shoe', unitIcon: 'running-shoe', color: 1, time: 'morning', goal: 1, step: 1, unit: 'times', kind: 'count',
  freq: 'days', every: 2, perWeek: 3, days: [1, 1, 1, 1, 1, 1, 1], reminder: '08:00', remind: false });
const TYPE_HINTS = {
  count: 'Tap to check it off, or count up to a goal.',
  amount: 'Fill a water tank in litres, 250 ml at a time.',
  timer: 'Start a timer when you begin; the minutes are logged when you stop.',
  quit: 'For habits you’re breaking. Counts the days since your last slip.',
};
function setType(kind) {
  if (draft.kind === kind) return;
  draft.kind = kind;
  if (kind === 'amount') Object.assign(draft, { goal: 2.5, step: 0.25, unit: 'L', unitIcon: 'droplet' });
  else if (kind === 'timer') Object.assign(draft, { goal: 10, step: 5, unit: 'min', unitIcon: 'stopwatch' });
  else if (kind === 'quit') Object.assign(draft, { goal: 1, step: 1, unit: 'day', freq: 'days', days: [1, 1, 1, 1, 1, 1, 1] });
  else Object.assign(draft, { goal: 1, step: 1, unit: 'times', unitIcon: draft.icon });
}
function renderEditor() {
  const ed = $('#editor');
  ed.style.setProperty('--hc', COLORS[draft.color]);
  const editing = !!draft.id;
  $('#n-title').textContent = editing ? 'Edit habit' : 'New habit';
  $('#n-save-label').textContent = editing ? 'Save' : 'Plant it';
  $('#n-delete').hidden = !editing;
  $('#n-ideas').hidden = editing;
  $('#n-preview-icon').src = ICON(draft.icon);
  if (document.activeElement !== $('#n-name')) $('#n-name').value = draft.name;
  $('#n-ideas').innerHTML = IDEAS.map((idea, i) => `<button class="idea" data-idea="${i}"><img src="${ICON(idea.icon)}" alt="">${idea.name}</button>`).join('');
  const group = ICON_GROUPS.find((g) => g.id === iconGroup) || ICON_GROUPS[0];
  $('#n-icon-tabs').innerHTML = ICON_GROUPS.map((g) => `<button class="icon-tab${g === group ? ' on' : ''}" data-icon-group="${g.id}"><img src="${ICON(g.icons[0])}" alt="">${g.label}</button>`).join('');
  $('#n-icons').innerHTML = group.icons.map((ic) => `<button class="pick${ic === draft.icon ? ' on' : ''}" data-icon="${ic}"><img src="${ICON(ic)}" alt="" loading="lazy"></button>`).join('');
  $('#n-colors').innerHTML = COLORS.map((c, i) => `<button class="swatch${i === draft.color ? ' on' : ''}" data-color="${i}" style="--sw:${c}" aria-label="Colour ${i + 1}"></button>`).join('');
  $$('#n-times .time-opt').forEach((b) => b.classList.toggle('on', b.dataset.time === draft.time));
  $$('#n-types [data-type]').forEach((b) => b.classList.toggle('on', b.dataset.type === draft.kind));
  $('#n-type-hint').textContent = TYPE_HINTS[draft.kind];
  const quit = draft.kind === 'quit';
  $('#n-repeat-wrap').hidden = quit;
  $('#n-goal-h').hidden = quit; $('#n-goal-row').hidden = quit;
  $('#n-goal-h').textContent = draft.freq === 'weekly' ? 'Goal per session' : 'Daily goal';
  $$('#n-freqs [data-freq]').forEach((b) => b.classList.toggle('on', b.dataset.freq === draft.freq));
  $('#n-days').hidden = draft.freq !== 'days';
  $('#n-freq-step').hidden = draft.freq === 'days';
  $('#n-freq-label').textContent = draft.freq === 'interval' ? `Every ${draft.every || 2} days` : `${draft.perWeek || 3}× a week`;
  $('#n-days').innerHTML = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => `<button class="day${draft.days[i] ? ' on' : ''}" data-dayi="${i}">${d}</button>`).join('');
  if (draft.kind === 'timer') {
    $('#n-goal').textContent = `${draft.goal} min`;
    $('#n-goal-pips').innerHTML = `<img src="${ICON('timer-clock')}" alt="">`;
  } else if (draft.kind === 'amount') {
    $('#n-goal').textContent = `${fmtNum(draft.goal)} L`;
    $('#n-goal-pips').innerHTML = `<span class="mini-gauge"><i style="width:${(draft.goal / 4) * 100}%"></i></span>`;
  } else {
    const steps = Math.round(draft.goal / draft.step);
    $('#n-goal').textContent = draft.unit === 'times' ? `${steps}× a day` : `${fmtNum(draft.goal)} ${draft.unit}`;
    $('#n-goal-pips').innerHTML = Array.from({ length: Math.min(steps, 10) }, () => `<img src="${ICON(draft.unitIcon || draft.icon)}" alt="">`).join('');
  }
  $('#n-remind-time').value = draft.reminder;
  $('#n-remind-switch').setAttribute('aria-pressed', !!draft.remind);
  const days = draft.days.filter(Boolean).length, ok = quit || draft.freq !== 'days' || days;
  $('#n-preview-meta').innerHTML = `<img src="${ICON(TIMES[draft.time].icon)}" alt="">${TIMES[draft.time].label} · ${ok ? freqText(draft) : 'No days picked'}${quit ? ' · quit' : draft.kind === 'timer' ? ' · timer' : ''}`;
  $('#n-save').disabled = !ok;
}
function openEditor(h) {
  draft = h ? JSON.parse(JSON.stringify(h)) : newDraft();
  iconGroup = (ICON_GROUPS.find((g) => g.icons.includes(draft.icon)) || ICON_GROUPS[0]).id;
  const pre = sessionStorage.getItem('habie.prefill');
  if (!h && pre) { draft.name = pre; sessionStorage.removeItem('habie.prefill'); }
  renderEditor();
  closeOverlays(true);
  $('#editor').classList.add('open'); scrim.classList.add('on');
  if (!h) setTimeout(() => $('#n-name').focus({ preventScroll: true }), 450);
}
function closeEditor() {
  $('#editor').classList.remove('open');
  if (!anyOverlayOpen()) scrim.classList.remove('on');
  $('#n-name').blur();
  if (/^#(new|edit)/.test(location.hash)) history.replaceState(null, '', baseHash || '#home');
}
function saveDraft() {
  const name = $('#n-name').value.trim() || IDEAS.find((i) => i.icon === draft.icon)?.name || 'New habit';
  if (draft.kind !== 'quit' && draft.freq === 'days' && !draft.days.some(Boolean)) return;
  if (draft.id) {
    Object.assign(habitById(draft.id), { ...draft, name });
    save(); closeEditor(); renderAll();
    toast('Changes saved', draft.icon); sound('done');
  } else {
    const h = { ...draft, name, id: 'h' + Date.now().toString(36), created: todayKey() };
    S().habits.push(h);
    selId = h.id; lastChange = { id: h.id, at: performance.now() };
    save(); closeEditor(); renderAll();
    if (currentSection !== 'habits') location.hash = `#habits/${h.id}`;
    setTimeout(() => { confetti(stage.offsetWidth / 2 + 120, 300, 60); sound('perfect'); toast(`${name} planted in your garden`, 'seedling'); }, 350);
  }
}

/* =========================================================================
   Logging & celebrations
   ========================================================================= */
function snapshot() { return { level: totals().level, badges: unlocked(), perfect: perfect(todayKey()) }; }
function setValue(h, k, v, ev) {
  if (k > todayKey()) return;
  const before = snapshot(), wasDone = isDone(h, k);
  setVal(h, k, v);
  lastChange = { id: h.id, at: performance.now() };
  save(); renderAll();
  const nowDone = isDone(h, k);
  if (!wasDone && nowDone) {
    const [x, y] = stagePoint(ev);
    confetti(x, y); sound('done'); buzz(20);
    const after = snapshot();
    if (k === todayKey() && !before.perfect && after.perfect) {
      setTimeout(celebrateDay, 450);
      if (maybeEarnFreeze()) { save(); setTimeout(() => toast(`7 more days! You earned a streak freeze (${S().freezes}/3)`, 'ice'), 3600); }
    }
    else toast(`${h.name} done!`, h.icon);
    if (after.level > before.level) setTimeout(() => levelUp(after.level), 900);
    after.badges.filter((b) => !before.badges.includes(b)).forEach((id, i) => {
      const b = BADGES.find((x) => x.id === id);
      setTimeout(() => toast(`Badge unlocked: ${b.name}`, b.icon), 2600 + i * 2400);
    });
  } else if (val(h, k) > 0) { sound('pop'); buzz(8); } else sound('undo');
}
function stepHabit(h, k, ev) {
  if (isQuit(h)) return slip(h, k);
  if (isDone(h, k)) return setValue(h, k, 0, ev);
  setValue(h, k, val(h, k) + stepOf(h), ev);
  if (h.kind === 'amount' && currentSection === 'habits' && h.id === selId) splash(0.25);
}
function splash(amount) {
  if (REDUCED) return;
  const tank = $('#tank'), d = document.createElement('img');
  d.src = ICON('droplet'); d.className = 'splash-drop'; d.style.width = 24 + amount * 36 + 'px';
  tank.appendChild(d);
  d.animate([{ transform: 'translate(-50%, -110px) scale(.6)', opacity: 0 }, { transform: 'translate(-50%, -40px) scale(1)', opacity: 1, offset: 0.3 }, { transform: 'translate(-50%, 70px) scale(.7)', opacity: 0 }],
    { duration: 800, easing: 'cubic-bezier(.5,0,.8,.6)' }).onfinish = () => d.remove();
  tank.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 700 });
}

// Celebrations queue so a level-up never hides a perfect-day card.
const modal = $('#modal'), modalQueue = [];
function showModal(html, after) {
  if (modal.classList.contains('open')) { modalQueue.push([html, after]); return; }
  $('#modal-card').innerHTML = html;
  modal.classList.add('open'); scrim.classList.add('on');
  if (after) after();
}
function celebrateDay() {
  sound('perfect'); buzz([30, 40, 30]);
  const st = streak();
  showModal(`<div class="m-art"><span class="m-burst"></span><img class="m-buddy" src="${ICON(S().buddy)}" alt=""><img class="m-sun" src="${ICON('sunflower')}" alt=""></div>
    <h3>Perfect day!</h3><p>Every habit done. Your streak is now <b>${st} day${st === 1 ? '' : 's'}</b>.</p>
    <button class="sh-btn" data-action="close">Yay!</button>`, rain);
}
function levelUp(level) {
  sound('level');
  showModal(`<div class="m-art"><span class="m-burst gold"></span><img class="m-crown" src="${ICON('crown')}" alt=""><span class="m-level">${level}</span></div>
    <h3>Level ${level}!</h3><p>You’re now a ${titleFor(level)}. Keep showing up.</p><button class="sh-btn" data-action="close">Let’s go</button>`, rain);
}

/* =========================================================================
   Overlays
   ========================================================================= */
const dialog = $('#dialog'), notify = $('#notify'), palette = $('#palette');
const anyOverlayOpen = () => [dialog, notify, palette, modal, $('#editor')].some((el) => el.classList.contains('open'));
function openDialog(html, wide) {
  const card = $('#dialog-card');
  card.innerHTML = html; card.classList.toggle('wide', !!wide);
  dialog.classList.add('open'); scrim.classList.add('on');
}
function closeOverlays(keepScrim) {
  const hadModal = modal.classList.contains('open');
  [dialog, notify, palette, modal].forEach((el) => el.classList.remove('open'));
  if (!keepScrim && !$('#editor').classList.contains('open')) scrim.classList.remove('on');
  $('#search-input').blur();
  if (hadModal && modalQueue.length) setTimeout(() => showModal(...modalQueue.shift()), 400);
}

function openSleep() {
  const k = addDays(todayKey(), -1), v = S().sleep[k] || 7.5;
  openDialog(`<div class="sh-hero sleep-hero"><img class="sh-moon" src="${ICON('crescent-moon')}" alt=""><img class="sh-zzz" src="${ICON('zzz')}" alt=""><span class="star s1"></span><span class="star s2"></span><span class="star s3"></span></div>
    <h3 class="sh-title">How did you sleep?</h3><p class="sh-sub">Last night · ${fmtDay(k, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
    <div class="sleep-val"><b id="sleep-v">${fmtNum(v)}</b><span>hours</span></div>
    <input type="range" id="sleep-range" min="3" max="12" step="0.5" value="${v}" aria-label="Hours slept">
    <div class="range-l"><span>3h</span><span>7.5h</span><span>12h</span></div>
    <div class="sleep-faces" id="sleep-faces"></div>
    <button class="sh-btn" data-action="save-sleep">Save</button>`);
  sleepFace(v);
}
function sleepFace(v) {
  $('#sleep-v').textContent = fmtNum(v);
  const f = v < 6 ? ['sleeping-face', 'Running on empty'] : v < 7 ? ['smiling-face-with-smiling-eyes', 'Not bad'] : v < 9 ? ['star-struck', 'Sweet dreams!'] : ['hugging-face', 'Fully recharged'];
  $('#sleep-faces').innerHTML = `<img src="${ICON(f[0])}" alt="">${f[1]}`;
  $('#sleep-range').style.setProperty('--p', ((v - 3) / 9) * 100 + '%');
}
function openNotify() {
  if (notify.classList.contains('open')) { closeOverlays(); return; }
  const k = todayKey(), now = nowHHMM();
  const list = habitsOn(k).filter((h) => h.remind).sort((a, b) => a.reminder.localeCompare(b.reminder));
  $('#notify-body').innerHTML = `<div class="pop-title">Today’s reminders</div>
    ${!S().settings.reminders ? `<button class="sh-banner" data-action="enable-reminders"><img src="${ICON('bell-with-slash')}" alt=""><span><b>Reminders are off</b>Tap to turn them on</span></button>` : ''}
    <div class="n-list">${list.map((h, i) => {
      const done = isDone(h, k), past = h.reminder <= now;
      return `<a class="n-row${done ? ' done' : past ? ' due' : ''}" href="#habits/${h.id}" style="--hc:${color(h)};--dl:${i * 50}ms"><span class="n-time">${h.reminder}</span>
        <span class="s-ic"><img src="${ICON(h.icon)}" alt=""></span><span class="s-t"><b>${esc(h.name)}</b><span>${done ? 'Done' : past ? 'Waiting for you' : 'Coming up'}</span></span></a>`;
    }).join('') || `<p class="s-empty"><img src="${ICON('alarm-clock')}" alt="">No reminders set. Add one from any habit.</p>`}</div>`;
  closeOverlays();
  notify.classList.add('open');
}
let kbIndex = 0;
function openSearch() {
  closeOverlays();
  palette.classList.add('open'); scrim.classList.add('on');
  $('#search-input').value = ''; renderSearch('');
  setTimeout(() => $('#search-input').focus(), 150);
}
function renderSearch(q) {
  const k = todayKey(), qq = q.trim().toLowerCase();
  const res = S().habits.filter((h) => h.name.toLowerCase().includes(qq));
  kbIndex = 0;
  $('#search-results').innerHTML = res.map((h, i) => `<a class="s-row${i === 0 ? ' kb' : ''}" href="#habits/${h.id}" style="--hc:${color(h)};--dl:${i * 30}ms">
      <span class="s-ic"><img src="${ICON(h.icon)}" alt=""></span><span class="s-t"><b>${esc(h.name)}</b><span>${TIMES[h.time].label} · ${subText(h, k)}</span></span>
      ${isDone(h, k) ? `<span class="s-done">${checkSvg}</span>` : ''}</a>`).join('') +
    (qq ? `<a class="s-row s-new${res.length ? '' : ' kb'}" href="#new" data-prefill="${esc(q.trim())}"><span class="s-ic"><img src="${ICON('seedling')}" alt=""></span><span class="s-t"><b>Create “${esc(q.trim())}”</b><span>Plant it as a new habit</span></span></a>` :
      !res.length ? '<p class="s-empty">No habits yet</p>' : '');
}
function openInstall() {
  const inst = installState();
  if (inst.canPrompt) { promptInstall().then(renderAll); return; }
  const share = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg>';
  const add = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></svg>';
  openDialog(`<div class="sh-hero"><img class="sh-big" src="assets/icons/icon-192.png" alt="" style="border-radius:24px;box-shadow:0 18px 30px -14px rgba(60,50,150,.6)"></div>
    <h3 class="sh-title">Install Habie on your iPad</h3>
    <p class="sh-sub">${inst.ios ? 'Safari installs web apps from the Share menu.' : 'Use your browser’s menu to install Habie as an app.'} It then opens full screen from your Home Screen.</p>
    <div class="inst-steps">
      <div class="inst-step" style="--dl:0ms"><b>1</b><span class="ic">${share}</span><span>Tap <strong>Share</strong> in Safari’s toolbar</span></div>
      <div class="inst-step" style="--dl:300ms"><b>2</b><span class="ic">${add}</span><span>Choose <strong>Add to Home Screen</strong></span></div>
      <div class="inst-step" style="--dl:600ms"><b>3</b><span class="ic"><img src="assets/icons/icon-192.png" alt=""></span><span>Open <strong>Habie</strong> from your Home Screen</span></div>
    </div>
    <div class="inst-perks"><span><img src="${ICON('high-voltage')}" alt="">Full screen</span><span><img src="${ICON('shield')}" alt="">Works offline</span><span><img src="${ICON('alarm-clock')}" alt="">Reminders</span></div>
    <button class="sh-btn" data-action="close">Got it</button>`, true);
}
function maybeOfferInstall() {
  const inst = installState();
  if (inst.installed || S().installDismissed || params.has('mockup')) return;
  setTimeout(() => { if (!installState().installed && !anyOverlayOpen()) $('#install-banner').classList.add('open'); }, 6000);
}

/* =========================================================================
   Reminders
   ========================================================================= */
async function setReminders(on) {
  S().settings.reminders = on;
  if (on && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (e) { /* ignore */ } }
  if (on) toast('Reminders on — I’ll nudge you while Habie is open', 'alarm-clock');
  save(); renderAll(); checkReminders();
}
async function checkReminders() {
  renderHome();
  if (!S().settings.reminders) return;
  const k = todayKey(), now = nowHHMM();
  S().notified[k] = S().notified[k] || [];
  for (const h of habitsOn(k)) {
    if (!h.remind || isDone(h, k) || h.reminder > now || S().notified[k].includes(h.id)) continue;
    S().notified[k].push(h.id); save();
    const [hh, mm] = h.reminder.split(':').map(Number), due = new Date(); due.setHours(hh, mm, 0, 0);
    if (Date.now() - due.getTime() > 3600e3) continue;          // don't nudge for long-past reminders
    const text = `Time for ${h.name}!`;
    toast(text, 'alarm-clock'); sound('done');
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (reg) reg.showNotification('Habie', { body: text, icon: 'assets/icons/icon-192.png', tag: h.id });
        else new Notification('Habie', { body: text, icon: 'assets/icons/icon-192.png' });
      }
    } catch (e) { /* ignore */ }
  }
}

/* =========================================================================
   Routing & transitions
   ========================================================================= */
let currentSection = null, baseHash = '#home';
function parse() {
  let [name, param] = location.hash.slice(1).split('/');
  name = ALIAS[name] || name;
  return { name, param };
}
function route() {
  const { name, param } = parse();
  if (name === 'new' || name === 'edit') {
    if (!currentSection) show('home');
    const h = name === 'edit' ? habitById(param) : null;
    if (name === 'edit' && !h) { history.replaceState(null, '', baseHash); return; }
    openEditor(h);
    return;
  }
  if ($('#editor').classList.contains('open')) { $('#editor').classList.remove('open'); scrim.classList.remove('on'); }
  closeOverlays();
  const target = SECTIONS.includes(name) ? name : 'home';
  baseHash = location.hash || '#home';
  if (target === 'habits') {
    if (param && habitById(param)) {
      const changed = selId !== param;
      selId = param;
      if (currentSection === 'habits') { renderHabits(); if (changed) renderDetail(true); }
    }
    if (currentSection !== 'habits') viewDay = todayKey();
  }
  show(target);
}
function show(target) {
  const prev = currentSection;
  if (target === 'habits') renderHabits();
  if (target === 'buddy') renderBuddyScreen();
  if (target === 'insights') renderPatterns();
  $$('.nav').forEach((a, i) => { const on = SECTIONS[i] === target; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('.side-nav').style.setProperty('--i', SECTIONS.indexOf(target));
  if (prev === target) return;
  currentSection = target;
  document.title = target === 'home' ? 'Habie · Today' : `Habie · ${{ insights: 'Insights', habits: 'Habits', buddy: buddy().name, settings: 'Settings' }[target]}`;
  const next = $(`.screen[data-route="${target}"]`), old = prev && $(`.screen[data-route="${prev}"]`);
  $$('.screen').forEach((s) => { if (s !== next && s !== old) { s.classList.remove('active'); s.setAttribute('inert', ''); } });
  next.classList.add('active'); next.removeAttribute('inert');
  $$('.scroll', next).forEach((s) => { if (!s.classList.contains('convo-scroll')) s.scrollTop = 0; });
  if (!old || REDUCED) { if (old) old.classList.remove('active'); reveal(next); return; }
  old.setAttribute('inert', '');
  const dir = Math.sign(SECTIONS.indexOf(target) - SECTIONS.indexOf(prev)) || 1;
  old.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: `translateY(${-dir * 24}px) scale(.985)`, filter: 'blur(4px)' }],
    { duration: 260, easing: 'cubic-bezier(.4,0,1,1)' }).onfinish = () => { if (currentSection !== prev) old.classList.remove('active'); };
  next.animate([{ opacity: 0, transform: `translateY(${dir * 36}px)` }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 80, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  reveal(next);
}
function reveal(scr) {
  if (REDUCED) return;
  const els = $$('.reveal, .ins-grid > .card, .set-col > .card, .split-list > *', scr).filter((el, i, a) => a.indexOf(el) === i).slice(0, 16);
  els.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(26px) scale(.98)' }, { opacity: 1, transform: 'none' }],
    { duration: 560, delay: 120 + i * 55, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
}

/* =========================================================================
   Events
   ========================================================================= */
document.addEventListener('click', (e) => {
  const el = (sel) => e.target.closest(sel);
  let t;
  if (e.target === scrim || e.target === modal || e.target === dialog || e.target === $('#editor')) {
    if ($('#editor').classList.contains('open') && e.target !== modal) closeEditor();
    closeOverlays(); return;
  }
  if ((t = el('[data-timer]'))) {
    e.preventDefault(); e.stopPropagation();
    const h = habitById(t.dataset.timer); if (h) toggleTimer(h); return;
  }
  if ((t = el('[data-slip]'))) {
    e.preventDefault(); e.stopPropagation();
    const h = habitById(t.dataset.slip); if (h) slip(h, t.dataset.day || todayKey()); return;
  }
  if ((t = el('[data-minutes]'))) {
    const h = habitById(selId), m = +t.dataset.minutes;
    if (h) setValue(h, viewDay, m === h.goal ? h.goal : val(h, viewDay) + m, e); return;
  }
  if ((t = el('[data-mood]'))) {
    const h = habitById(selId), m = +t.dataset.mood;
    if (h && viewDay <= todayKey()) { setNote(h, viewDay, { mood: noteOf(h, viewDay)?.mood === m ? 0 : m, text: $('#d-note').value }); save(); renderNotes(h, viewDay); sound('tap'); bounce(`[data-mood="${m}"] img`); }
    return;
  }
  if ((t = el('[data-type]'))) { setType(t.dataset.type); renderEditor(); sound('tap'); return; }
  if ((t = el('[data-freq]'))) { draft.freq = t.dataset.freq; renderEditor(); sound('tap'); return; }
  if ((t = el('[data-freq-step]'))) {
    const d = +t.dataset.freqStep;
    if (draft.freq === 'interval') draft.every = Math.max(2, Math.min(30, (draft.every || 2) + d));
    else draft.perWeek = Math.max(1, Math.min(6, (draft.perWeek || 3) + d));
    renderEditor(); sound('tap'); return;
  }
  if ((t = el('[data-step-habit]'))) {
    e.preventDefault(); e.stopPropagation();
    const h = habitById(t.dataset.stepHabit);
    if (h) stepHabit(h, t.dataset.day || todayKey(), e);
    return;
  }
  if ((t = el('[data-unit]'))) {
    const h = habitById(selId), i = +t.dataset.unit, filled = Math.round(val(h, viewDay) / h.step);
    // Like star ratings: tap a unit to fill up to it; tap the last filled one to clear it.
    setValue(h, viewDay, (i + 1 === filled ? i : i + 1) * h.step, e); return;
  }
  if ((t = el('[data-amount]'))) {
    const h = habitById(selId), a = +t.dataset.amount;
    setValue(h, viewDay, val(h, viewDay) + a, e); if (a > 0) splash(a); return;
  }
  if ((t = el('[data-filter]'))) {
    filter = t.dataset.filter;
    $$('[data-filter]').forEach((b) => b.classList.toggle('on', b === t));
    renderHabits();
    if (!REDUCED) $$('#habit-list > *').forEach((c, i) => c.animate([{ opacity: 0, transform: 'translateX(-16px)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: i * 35, fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)' }));
    sound('tap'); return;
  }
  if ((t = el('[data-day-pick]'))) { viewDay = t.dataset.dayPick; renderHabits(); renderDetail(true); sound('tap'); return; }
  if ((t = el('[data-icon]'))) { draft.icon = t.dataset.icon; if (draft.kind !== 'amount') draft.unitIcon = t.dataset.icon; renderEditor(); bounce('#n-preview-icon'); sound('tap'); return; }
  if ((t = el('[data-idea]'))) {
    const idea = IDEAS[+t.dataset.idea];
    Object.assign(draft, { name: idea.name, icon: idea.icon, unitIcon: idea.icon, time: idea.time, color: idea.color });
    iconGroup = (ICON_GROUPS.find((g) => g.icons.includes(idea.icon)) || ICON_GROUPS[0]).id;
    $('#n-name').value = idea.name; renderEditor(); bounce('#n-preview-icon'); sound('pop'); return;
  }
  if ((t = el('[data-color]'))) { draft.color = +t.dataset.color; renderEditor(); sound('tap'); return; }
  if ((t = el('[data-time]'))) { draft.time = t.dataset.time; renderEditor(); sound('tap'); return; }
  if ((t = el('[data-dayi]'))) { const i = +t.dataset.dayi; draft.days[i] = draft.days[i] ? 0 : 1; renderEditor(); sound('tap'); return; }
  if ((t = el('[data-step]'))) {
    const d = +t.dataset.step;
    if (draft.kind === 'amount') draft.goal = Math.max(0.5, Math.min(4, draft.goal + d * 0.25));
    else if (draft.kind === 'timer') draft.goal = Math.max(5, Math.min(180, draft.goal + d * 5));
    else draft.goal = Math.max(draft.step, Math.min(draft.step * 10, draft.goal + d * draft.step));
    renderEditor(); sound('tap'); return;
  }
  if ((t = el('[data-avatar-step]'))) { changeAvatar(+t.dataset.avatarStep); return; }
  if ((t = el('[data-icon-group]'))) { iconGroup = t.dataset.iconGroup; renderEditor(); $('#n-icons').scrollTop = 0; sound('tap'); return; }
  if ((t = el('[data-setting]'))) {
    const key = t.dataset.setting, on = !S().settings[key];
    if (key === 'reminders') { setReminders(on); return; }
    const apply = () => { S().settings[key] = on; if (key === 'dark') applyTheme(); save(); renderAll(); };
    if (key === 'dark') themeTransition(t, apply); else apply();
    sound('pop'); return;
  }
  if ((t = el('[data-accent-pick]'))) {
    const acc = t.dataset.accentPick;
    themeTransition(t, () => { S().settings.accent = acc; applyTheme(); save(); renderAll(); });
    sound('pop'); return;
  }
  if ((t = el('[data-buddy]'))) {
    S().buddy = t.dataset.buddy; save(); renderAll(); renderBuddyScreen();
    toast(`Say hi to ${buddy().name}!`, S().buddy); sound('done');
    $$('[data-buddy-img]').forEach((img) => !REDUCED && img.animate([{ transform: 'scale(.5) rotate(-20deg)' }, { transform: 'scale(1.1) rotate(6deg)' }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.3,1.4,.5,1)' }));
    return;
  }
  if ((t = el('[data-say]'))) {
    if (currentSection !== 'buddy') location.hash = '#buddy';
    userSays(CHIP_TEXT[t.dataset.say] || t.dataset.say); return;
  }
  if ((t = el('[data-prefill]'))) { sessionStorage.setItem('habie.prefill', t.dataset.prefill); return; }
  if ((t = el('a[href^="#"]')) && notify.contains(t)) { closeOverlays(); return; }
  if ((t = el('a[href^="#"]')) && palette.contains(t)) { closeOverlays(); return; }

  if (!(t = el('[data-action]'))) return;
  e.preventDefault();
  const h = habitById(selId);
  switch (t.dataset.action) {
    case 'close': closeOverlays(); break;
    case 'search': openSearch(); break;
    case 'notifications': openNotify(); break;
    case 'sleep': openSleep(); break;
    case 'save-sleep': {
      const v = +$('#sleep-range').value;
      S().sleep[addDays(todayKey(), -1)] = v; save(); closeOverlays(); renderAll();
      toast(`${fmtNum(v)}h of sleep logged`, 'crescent-moon'); sound('done'); break;
    }
    case 'open-water': { const w = S().habits.find((x) => x.kind === 'amount'); location.hash = w ? `#habits/${w.id}` : '#new'; break; }
    case 'open-workout': { const w = S().habits.find((x) => x.kind === 'timer' || x.unit === 'min'); location.hash = w ? `#habits/${w.id}` : '#new'; break; }
    case 'log':
      if (h && isQuit(h)) slip(h, viewDay);
      else if (h && !isDone(h, viewDay)) { setValue(h, viewDay, val(h, viewDay) + stepOf(h), e); if (h.kind === 'amount') splash(0.25); }
      break;
    case 'confirm-slip': {
      const x = habitById(t.dataset.id); if (!x) break;
      setVal(x, t.dataset.day, 1); save(); closeOverlays(); renderAll();
      toast('Logged. Tomorrow is a fresh start', 'seedling'); sound('undo'); break;
    }
    case 'toggle-rest': toggleRest(); break;
    case 'ask-insights': askInsights(); break;
    case 'edit-habit': if (h) location.hash = `#edit/${h.id}`; break;
    case 'reset-day': if (h) { setValue(h, viewDay, 0); toast('Progress reset', 'hourglass-not-done'); } break;
    case 'delete-habit': {
      const target = draft && draft.id && $('#editor').classList.contains('open') ? habitById(draft.id) : h;
      if (!target) break;
      openDialog(`<div class="sh-hero"><img class="sh-big" src="${ICON('wastebasket')}" alt=""></div>
        <h3 class="sh-title">Delete “${esc(target.name)}”?</h3><p class="sh-sub">Its history goes too. This can’t be undone.</p>
        <div class="sh-pair"><button class="sh-btn ghost" data-action="close">Keep it</button><button class="sh-btn danger" data-action="confirm-delete" data-id="${target.id}">Delete</button></div>`);
      break;
    }
    case 'confirm-delete': {
      const id = t.dataset.id, gone = habitById(id);
      S().habits = S().habits.filter((x) => x.id !== id);
      Object.values(S().log).forEach((d) => delete d[id]);
      if (selId === id) selId = null;
      save(); closeOverlays(); if ($('#editor').classList.contains('open')) closeEditor(); renderAll();
      toast(`${gone.name} deleted`, 'wastebasket'); break;
    }
    case 'detail-remind':
      if (h) { h.remind = !h.remind; save(); renderAll(); if (h.remind && !S().settings.reminders) setReminders(true); }
      break;
    case 'draft-remind': draft.remind = !draft.remind; renderEditor(); break;
    case 'save-habit': saveDraft(); break;
    case 'close-editor': closeEditor(); break;
    case 'sort': {
      const order = ['time', 'best', 'worst'];
      S().sort = order[(order.indexOf(S().sort) + 1) % 3]; save(); renderInsights(); sound('tap'); break;
    }
    case 'share': {
      const s = dayStats(todayKey());
      share(`I’m on a ${streak()}-day streak in Habie and did ${s.done} of ${s.total} habits today!`); break;
    }
    case 'invite': share('I’m growing better habits with Habie. Come grow with me!'); break;
    case 'back-today': viewDay = todayKey(); renderHabits(); renderDetail(true); break;
    case 'enable-reminders': setReminders(true).then(() => { notify.classList.remove('open'); openNotify(); }); break;
    case 'privacy':
      openDialog(`<div class="sh-hero"><img class="sh-big" src="${ICON('shield')}" alt=""></div>
        <h3 class="sh-title">Your data stays on this iPad</h3>
        <p class="sh-sub">Everything is saved in this browser only.</p>
        <button class="sh-row" data-action="export"><img src="${ICON('outbox-tray')}" alt="">Export as a file</button>
        <button class="sh-row danger" data-action="confirm-reset"><img src="${ICON('wastebasket')}" alt="">Start fresh</button>`);
      break;
    case 'export': {
      const blob = new Blob([JSON.stringify({ ...S(), chat: [] }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `habie-${todayKey()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      closeOverlays(); toast('Exported your data', 'outbox-tray'); break;
    }
    case 'confirm-reset':
      openDialog(`<div class="sh-hero"><img class="sh-big" src="${ICON('seedling')}" alt=""></div>
        <h3 class="sh-title">Start a fresh garden?</h3><p class="sh-sub">This clears your habits, history, streaks and badges.</p>
        <div class="sh-pair"><button class="sh-btn ghost" data-action="close">Cancel</button><button class="sh-btn danger" data-action="reset-all">Start fresh</button></div>`);
      break;
    case 'reset-all': {
      const s = S();
      store.state = blankState({ name: s.name, buddy: s.buddy, settings: s.settings, installDismissed: s.installDismissed });
      selId = null; save(); closeOverlays(); renderAll(); location.hash = '#home';
      toast('A fresh garden. Let’s grow!', 'seedling'); break;
    }
    case 'api-key':
      openDialog(`<div class="sh-hero"><img class="sh-big" src="${ICON('brain')}" alt=""></div>
        <h3 class="sh-title">Buddy brain</h3>
        <p class="sh-sub">${getKey() ? `${buddy().name} uses an AI model and can set up, log and change anything you ask.` : `Paste an OpenAI-compatible API key so ${buddy().name} can set up, log and change anything you ask.`}
        ${hasDeployedKey() ? ' This copy of Habie already has a key built in. A key you paste here is used instead.' : ''} It stays on this iPad only.</p>
        <input id="key-input" class="sh-input" type="password" autocomplete="off" spellcheck="false" placeholder="${ownKey() ? 'Your key is saved' : 'sk-…'}" aria-label="API key">
        <div class="sh-pair">${ownKey() ? '<button class="sh-btn ghost" data-action="remove-key">Remove key</button>' : '<button class="sh-btn ghost" data-action="close">Cancel</button>'}<button class="sh-btn" data-action="save-key">Save</button></div>`);
      setTimeout(() => $('#key-input').focus({ preventScroll: true }), 300);
      break;
    case 'save-key': {
      const k = $('#key-input').value.trim();
      if (k) { setKey(k); toast(`${buddy().name} got smarter`, 'brain'); }
      closeOverlays(); renderSettings(); break;
    }
    case 'remove-key': setKey(''); closeOverlays(); renderSettings(); toast('Key removed', 'key'); break;
    case 'clear-chat': S().chat = []; save(); renderChat(false); break;
    case 'install': $('#install-banner').classList.remove('open'); openInstall(); break;
    case 'dismiss-install': S().installDismissed = true; save(); $('#install-banner').classList.remove('open'); break;
  }
});

function bounce(sel) {
  if (REDUCED) return;
  $(sel).animate([{ transform: 'scale(.6) rotate(-12deg)' }, { transform: 'scale(1.15) rotate(6deg)' }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.3,1.4,.5,1)' });
}
// Circular reveal for theme changes where the View Transitions API exists.
function themeTransition(origin, change) {
  if (!document.startViewTransition || REDUCED) { change(); return; }
  const r = origin.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(change);
  vt.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
    { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
}
async function share(text) {
  const data = { title: 'Habie', text, url: location.href.split('#')[0].split('?')[0] };
  try {
    if (navigator.share) { await navigator.share(data); return; }
    await navigator.clipboard.writeText(`${text} ${data.url}`);
    toast('Copied to clipboard', 'link');
  } catch (e) { if (e && e.name !== 'AbortError') toast('Couldn’t share right now', 'link'); }
}

// Inputs
$('#n-name').addEventListener('input', (e) => { draft.name = e.target.value; });
$('#n-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveDraft(); });
let noteTimer;
$('#d-note').addEventListener('input', (e) => {
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => { const h = habitById(selId); if (h) { setNote(h, viewDay, { text: e.target.value }); save(); } }, 400);
});
$('#d-note').addEventListener('blur', () => { const h = habitById(selId); if (h) renderNotes(h, viewDay); });
$('#n-remind-time').addEventListener('change', (e) => { draft.reminder = e.target.value || '08:00'; draft.remind = true; renderEditor(); });
$('#d-remind-time').addEventListener('change', (e) => {
  const h = habitById(selId); if (!h) return;
  h.reminder = e.target.value || '08:00'; h.remind = true; save(); renderAll();
  toast(`Reminder set for ${h.reminder}`, 'alarm-clock');
});
$('#p-name').addEventListener('change', (e) => { S().name = e.target.value.trim() || 'Friend'; save(); renderAll(); toast(`Nice to meet you, ${S().name}!`, 'waving-hand'); });
$('#p-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
$('#search-input').addEventListener('input', (e) => renderSearch(e.target.value));
document.addEventListener('input', (e) => { if (e.target.id === 'sleep-range') sleepFace(+e.target.value); });
$('#ask').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#ask-input'), text = input.value.trim();
  if (!text) return;
  input.value = ''; input.style.height = '';
  userSays(text);
});
$('#ask-input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#ask').requestSubmit(); } });
$('#ask-input').addEventListener('input', (e) => { e.target.style.height = ''; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'; });
$$('[data-attach]').forEach((inp) => inp.addEventListener('change', () => {
  const f = inp.files && inp.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => userSays('', r.result);
  r.readAsDataURL(f);
  inp.value = '';
}));

// Keyboard (Magic Keyboard / Smart Keyboard on iPad).
document.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
  if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); location.hash = '#new'; return; }
  if (mod && /^[1-5]$/.test(e.key)) { e.preventDefault(); location.hash = '#' + SECTIONS[+e.key - 1]; return; }
  if (e.key === 'Escape') { if ($('#editor').classList.contains('open')) closeEditor(); closeOverlays(); return; }
  if (palette.classList.contains('open') && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
    const rows = $$('#search-results .s-row');
    if (!rows.length) return;
    e.preventDefault();
    if (e.key === 'Enter') { rows[kbIndex].click(); location.hash = rows[kbIndex].getAttribute('href'); closeOverlays(); return; }
    kbIndex = (kbIndex + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
    rows.forEach((r, i) => r.classList.toggle('kb', i === kbIndex));
  }
});

// The mascots lean toward the pointer (trackpad or Apple Pencil hover).
stage.addEventListener('pointermove', (e) => {
  const r = stage.getBoundingClientRect();
  stage.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
  stage.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
}, { passive: true });

/* =========================================================================
   Boot
   ========================================================================= */
function fit() {
  // Fill the width (the iPad's 1180pt in landscape); on short, wide windows fit the height instead.
  let s = innerWidth / DESIGN_W;
  if (innerHeight / s < MIN_H) s = innerHeight / MIN_H;
  view.scale = s;
  app.style.width = DESIGN_W * s + 'px';
  stage.style.zoom = s;
  stage.style.height = innerHeight / s + 'px';
  $('#rotate').classList.toggle('on', devicePortrait());
}
// Ask to rotate only when the iPad itself is upright. The window's shape is not enough: Split View,
// Slide Over and Stage Manager give tall windows in landscape, and iPadOS can report a stale
// innerWidth/innerHeight right after launch or rotation.
function devicePortrait() {
  if (!navigator.maxTouchPoints) return false;                     // desktop browsers: any window shape is fine
  const o = screen.orientation && screen.orientation.type;
  if (o) return o.startsWith('portrait');
  if (typeof orientation === 'number') return orientation % 180 === 0;
  return screen.width < screen.height;
}
addEventListener('resize', fit);
addEventListener('orientationchange', () => setTimeout(fit, 250));
if (screen.orientation) screen.orientation.addEventListener('change', fit);
addEventListener('hashchange', route);
let lastDay = todayKey();
setInterval(() => {
  if (todayKey() !== lastDay) { lastDay = todayKey(); viewDay = lastDay; settle(); renderAll(); }
  checkReminders();
}, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { settle(); renderAll(); checkReminders(); } });

$('#sb-date').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
applyTheme();
fit();
settle();
renderAll();
save();                                    // persist the new garden on first launch
route();
initPWA(() => { renderSidebar(); renderSettings(); });
maybeOfferInstall();
setTimeout(checkReminders, 1500);

// Splash: let the seedling grow, then fade into the app.
const splashEl = $('#splash');
if (params.has('nosplash') || params.has('mockup')) splashEl.remove();
else Promise.all([document.fonts.ready, new Promise((r) => setTimeout(r, 1100))]).then(() => {
  splashEl.classList.add('out');
  setTimeout(() => splashEl.remove(), 600);
  reveal($(`.screen[data-route="${currentSection}"]`));
});
