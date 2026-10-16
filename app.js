// Habie — screen sizing, routing and the (in-memory) habit model behind every screen.
// Screens are laid out in 541-unit-wide design pixels and zoomed to fit the app column.
(function () {
  const DESIGN_WIDTH = 541;
  const DESIGN_HEIGHT = 1172;
  const MAX_APP_WIDTH = 440;
  const TAB_ROUTES = ['home', 'tracker', 'habits', 'settings'];
  const ROUTES = [...TAB_ROUTES, 'chat', 'habit', 'new'];
  const ICON = (name) => `assets/3d/${name}.png`;

  const app = document.getElementById('app');
  const stage = document.getElementById('stage');
  const screens = [...document.querySelectorAll('.screen')];
  const tabbar = document.querySelector('.tabbar');
  let scale = 1;

  // ---------- data ----------
  const TIMES = {
    morning:   { label: 'Morning',   icon: 'sunrise' },
    afternoon: { label: 'Afternoon', icon: 'sun' },
    evening:   { label: 'Evening',   icon: 'crescent-moon' },
  };
  const COLORS = [
    { c: '#18b7f2', t: '#e2f6fe' }, { c: '#fb8c3c', t: '#fff0e2' }, { c: '#7b6cf6', t: '#efedff' },
    { c: '#f0679b', t: '#ffe9f1' }, { c: '#f25a5a', t: '#ffeceb' }, { c: '#22ae63', t: '#e3f7eb' },
    { c: '#e9b200', t: '#fff7d9' },
  ];
  const habits = [
    { id: 'water',    name: 'Drink Water',   icon: 'droplet',                  unitIcon: 'glass-water', unit: 'glass',  goal: 8, done: 3, color: 0, time: 'morning',   note: 'Every 30 minutes', streak: 12, best: 21 },
    { id: 'workout',  name: 'Workout',       icon: 'biceps',                   unitIcon: 'stopwatch',   unit: '10 min', goal: 3, done: 0, color: 1, time: 'morning',   note: 'For 30 minutes',   streak: 4,  best: 15 },
    { id: 'read',     name: 'Read',          icon: 'books',                    unitIcon: 'open-book',   unit: '5 pages',goal: 4, done: 4, color: 2, time: 'evening',   note: '20 pages a day',   streak: 9,  best: 30 },
    { id: 'meditate', name: 'Meditate',      icon: 'person-in-lotus-position', unitIcon: 'cherry-blossom', unit: '5 min', goal: 2, done: 2, color: 3, time: 'morning', note: '10 calm minutes', streak: 6, best: 18 },
    { id: 'fruit',    name: 'Eat Fruit',     icon: 'red-apple',                unitIcon: 'red-apple',   unit: 'fruit',  goal: 3, done: 3, color: 4, time: 'afternoon', note: '3 pieces a day',   streak: 3,  best: 11 },
    { id: 'journal',  name: 'Write Journal', icon: 'memo',                     unitIcon: 'pencil',      unit: 'entry',  goal: 1, done: 1, color: 5, time: 'evening',   note: 'End of the day',   streak: 7,  best: 14 },
  ];
  const isDone = (h) => h.done >= h.goal;
  const find = (id) => habits.find((h) => h.id === id) || habits[0];
  const colorOf = (h) => COLORS[h.color % COLORS.length];
  let currentHabit = habits[0];
  let filter = 'all';

  // Deterministic pseudo-random history so each habit gets its own heatmap.
  function history(h) {
    let seed = [...h.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 233280;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    return Array.from({ length: 35 }, (_, i) => {
      if (i >= 31) return -1;                        // days after today
      if (i === 30) return Math.min(3, Math.round((h.done / h.goal) * 3));
      const r = rnd();
      return r < 0.12 ? 0 : r < 0.3 ? 1 : r < 0.55 ? 2 : 3;
    });
  }

  // ---------- rendering ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const checkSvg = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4 9.3 3.3 3.2L14 5.8"/></svg>';

  function renderHome() {
    const list = $('#home-habits');
    list.innerHTML = ['water', 'workout', 'journal'].map((id) => {
      const h = find(id);
      return `<a class="habit${isDone(h) ? ' is-done' : ''}" href="#habit/${h.id}">
        <span class="h-ic" style="background:${colorOf(h).t}"><img src="${ICON(h.icon)}" alt=""></span>
        <span class="h-t">${h.name}</span><span class="h-s">${h.note}</span>
        <button class="h-check${isDone(h) ? ' done' : ''}" data-toggle="${h.id}" aria-label="Mark ${h.name} done">${checkSvg}</button>
      </a>`;
    }).join('');

    const done = habits.filter(isDone).length;
    $('#pc-bar').innerHTML = habits.map((h, i) =>
      `<span class="seg${i < done ? ' on' : ''}">${i === done - 1 ? '<i></i>' : ''}</span>`).join('') +
      `<b>${done}/${habits.length}</b>`;
    const left = habits.length - done;
    const next = habits.find((h) => !isDone(h));
    $('#pc-left').textContent = left ? `${left} habit${left > 1 ? 's' : ''} left` : 'All done!';
    $('#pc-next').innerHTML = next ? `<em>Next:</em> ${next.name}` : '<em>Next:</em> Rest well';
  }

  function renderTracker() {
    const done = habits.filter(isDone).length;
    $('#sk-foot').textContent = `${done} / ${habits.length} Habits completed today`;
    const water = find('water');
    $('#tr-water-segs').innerHTML = Array.from({ length: water.goal }, (_, i) => `<i class="${i < water.done ? 'on' : ''}"></i>`).join('');
    $('#tr-water-badge').textContent = `${water.done}/${water.goal}`;
    const q = water.done / water.goal;
    $('#tr-water-q').textContent = q >= 1 ? 'Great' : q >= 0.5 ? 'Good' : 'Poor';
  }

  function renderGarden() {
    const n = habits.length, done = habits.filter(isDone).length;
    const R = 118, C = 2 * Math.PI * R, gap = 26;
    const seg = C / n;
    let svg = '';
    habits.forEach((h, i) => {
      const col = isDone(h) ? colorOf(h).c : '#eceef3';
      svg += `<circle cx="150" cy="150" r="${R}" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round"
        stroke-dasharray="${seg - gap} ${C}" transform="rotate(${-90 + (i * 360) / n + (gap / C) * 180} 150 150)"/>`;
    });
    $('#garden-ring').innerHTML = svg;
    $('#garden-orbit').innerHTML = habits.map((h, i) => {
      const a = ((-90 + (i + 0.5) * (360 / n)) * Math.PI) / 180;
      const x = 150 + R * Math.cos(a), y = 150 + R * Math.sin(a);
      return `<a class="orbit-ic${isDone(h) ? ' on' : ''}" href="#habit/${h.id}" style="left:${x}px;top:${y}px"><img src="${ICON(h.icon)}" alt="${h.name}"></a>`;
    }).join('');
    const plant = done === n ? 'sunflower' : done >= n * 0.6 ? 'potted-plant' : done >= n * 0.3 ? 'herb' : 'seedling';
    const img = $('#garden-plant');
    if (!img.src.endsWith(plant + '.png')) img.src = ICON(plant);
    img.style.setProperty('--grow', 0.7 + 0.3 * (done / n));
    $('#garden-count').innerHTML = `<b>${done}</b>/${n}`;
    $('#garden-msg').textContent = done === n ? 'Full bloom! Every habit done today.' :
      done >= n / 2 ? 'Your garden is blooming. Keep it up!' : 'Water your habits to help it grow.';
  }

  function renderHabitGrid() {
    const list = habits.filter((h) => filter === 'all' || h.time === filter);
    $('#habit-grid').innerHTML = list.map((h) => {
      const col = colorOf(h);
      const pips = Array.from({ length: h.goal }, (_, i) =>
        `<img class="${i < h.done ? 'on' : ''}" src="${ICON(h.unitIcon)}" alt="">`).join('');
      return `<a class="hcard${isDone(h) ? ' is-done' : ''}" href="#habit/${h.id}" style="--hc:${col.c};--ht:${col.t}">
        <span class="hc-blob"><img src="${ICON(h.icon)}" alt=""></span>
        <span class="hc-streak"><img src="${ICON('fire')}" alt="">${h.streak}</span>
        <span class="hc-name">${h.name}</span>
        <span class="hc-time"><img src="${ICON(TIMES[h.time].icon)}" alt="">${TIMES[h.time].label}</span>
        <span class="hc-pips${h.goal > 4 ? ' many' : ''}">${pips}</span>
        <span class="hc-bar"><i style="width:${(h.done / h.goal) * 100}%"></i></span>
        <button class="hc-check${isDone(h) ? ' done' : ''}" data-toggle="${h.id}" aria-label="Mark ${h.name} done">${checkSvg}</button>
      </a>`;
    }).join('') + `<a class="hcard hcard-add" href="#new"><span class="add-plus">+</span><span>New habit</span></a>`;
  }

  function renderDetail() {
    const h = currentHabit, col = colorOf(h);
    const scr = $('.screen-habit');
    scr.style.setProperty('--hc', col.c);
    scr.style.setProperty('--ht', col.t);
    $('#d-icon').src = ICON(h.icon);
    $('#d-name').textContent = h.name;
    $('#d-time').innerHTML = `<img src="${ICON(TIMES[h.time].icon)}" alt="">${TIMES[h.time].label}`;
    $('#d-note').textContent = h.note;
    const pct = Math.min(1, h.done / h.goal);
    $('#d-wave').style.setProperty('--fill', pct);
    $('#d-pct').textContent = Math.round(pct * 100) + '%';
    $('#d-count').textContent = `${h.done} of ${h.goal} · ${h.unit}`;
    $('#d-units').innerHTML = Array.from({ length: h.goal }, (_, i) =>
      `<button class="unit${i < h.done ? ' on' : ''}" data-unit="${i}" aria-label="${i + 1} ${h.unit}"><img src="${ICON(h.unitIcon)}" alt=""></button>`).join('');
    $('#d-log').textContent = isDone(h) ? 'Done for today' : `Log 1 ${h.unit}`;
    $('#d-log').classList.toggle('is-done', isDone(h));
    $('#d-streak').textContent = h.streak;
    $('#d-best').textContent = h.best;
    const hist = history(h);
    const rate = Math.round((hist.slice(0, 31).filter((v) => v > 0).length / 31) * 100);
    $('#d-rate').textContent = rate + '%';
    $('#d-heat').innerHTML = hist.map((v, i) =>
      `<i class="lv${v}${i === 30 ? ' today' : ''}"></i>`).join('');
  }

  function renderAll() {
    renderHome(); renderTracker(); renderGarden(); renderHabitGrid(); renderDetail();
  }

  // ---------- celebration ----------
  const fx = $('.fx');
  const toast = $('.toast');
  let toastTimer;
  function celebrate(x, y, text) {
    const colors = ['#fc894b', '#7b6cf6', '#18b7f2', '#f0679b', '#22ae63', '#f8b84e'];
    for (let i = 0; i < 34; i++) {
      const p = document.createElement('i');
      p.className = 'confetti';
      p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};` +
        `width:${8 + Math.random() * 8}px;height:${5 + Math.random() * 6}px;border-radius:${Math.random() > 0.5 ? '50%' : '3px'}`;
      fx.appendChild(p);
      const ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 160;
      p.animate([
        { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist - 60}px)) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist * 1.2}px), calc(-50% + ${Math.sin(ang) * dist + 160}px)) rotate(${Math.random() * 900}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
    }
    $('.toast-text').textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  function stagePoint(e) {
    const r = stage.getBoundingClientRect();
    // getBoundingClientRect is in zoomed (CSS) pixels; convert back to design pixels.
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
  }
  function afterChange(h, e, wasDone) {
    renderAll();
    if (!wasDone && isDone(h)) {
      const done = habits.filter(isDone).length;
      const [x, y] = stagePoint(e);
      celebrate(x, y, done === habits.length ? 'Perfect day! Every habit done' : `${h.name} done · ${done}/${habits.length} today`);
    }
  }

  // ---------- new habit form ----------
  const draft = { icon: 'running-shoe', color: 1, time: 'morning', goal: 3, days: [1, 1, 1, 1, 1, 0, 0] };
  const NEW_ICONS = ['running-shoe', 'books', 'person-in-lotus-position', 'droplet', 'green-salad', 'bed', 'toothbrush',
    'guitar', 'pill', 'mobile-phone-off', 'brain', 'headphone', 'sunflower', 'pencil', 'teacup-without-handle', 'footprints', 'broccoli', 'carrot'];
  function renderDraft() {
    const col = COLORS[draft.color];
    const scr = $('.screen-new');
    scr.style.setProperty('--hc', col.c);
    scr.style.setProperty('--ht', col.t);
    $('#n-preview-icon').src = ICON(draft.icon);
    $('#n-icons').innerHTML = NEW_ICONS.map((ic) =>
      `<button class="pick${ic === draft.icon ? ' on' : ''}" data-icon="${ic}"><img src="${ICON(ic)}" alt=""></button>`).join('');
    $('#n-colors').innerHTML = COLORS.map((c, i) =>
      `<button class="swatch${i === draft.color ? ' on' : ''}" data-color="${i}" style="--sw:${c.c}" aria-label="Colour ${i + 1}"></button>`).join('');
    $$('#n-times .time-opt').forEach((b) => b.classList.toggle('on', b.dataset.time === draft.time));
    $$('#n-days .day').forEach((b, i) => b.classList.toggle('on', !!draft.days[i]));
    $('#n-goal').textContent = draft.goal;
    $('#n-goal-pips').innerHTML = Array.from({ length: draft.goal }, () => `<img src="${ICON(draft.icon)}" alt="">`).join('');
    const days = draft.days.filter(Boolean).length;
    $('#n-preview-meta').innerHTML = `<img src="${ICON(TIMES[draft.time].icon)}" alt="">${TIMES[draft.time].label} · ${days === 7 ? 'Every day' : days + ' days a week'}`;
  }

  // ---------- interactions ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-toggle]');
    if (t) {
      e.preventDefault(); e.stopPropagation();
      const h = find(t.dataset.toggle), was = isDone(h);
      h.done = was ? 0 : h.goal;
      if (!was) h.streak += 1; else h.streak = Math.max(0, h.streak - 1);
      afterChange(h, e, was);
      return;
    }
    const unit = e.target.closest('[data-unit]');
    if (unit) {
      const h = currentHabit, was = isDone(h), i = +unit.dataset.unit;
      h.done = i < h.done ? i : i + 1;            // tap a filled unit to undo back to it
      afterChange(h, e, was);
      return;
    }
    if (e.target.closest('#d-log')) {
      const h = currentHabit, was = isDone(h);
      if (!was) { h.done += 1; afterChange(h, e, was); }
      return;
    }
    const f = e.target.closest('[data-filter]');
    if (f) {
      filter = f.dataset.filter;
      $$('[data-filter]').forEach((b) => b.classList.toggle('on', b === f));
      renderHabitGrid();
      return;
    }
    const day = e.target.closest('.week-strip .wday');
    if (day) { $$('.week-strip .wday').forEach((d) => d.classList.toggle('sel', d === day)); return; }
    const pick = e.target.closest('[data-icon]');
    if (pick) { draft.icon = pick.dataset.icon; renderDraft(); return; }
    const sw = e.target.closest('[data-color]');
    if (sw) { draft.color = +sw.dataset.color; renderDraft(); return; }
    const time = e.target.closest('[data-time]');
    if (time) { draft.time = time.dataset.time; renderDraft(); return; }
    const d = e.target.closest('#n-days .day');
    if (d) { const i = $$('#n-days .day').indexOf(d); draft.days[i] = draft.days[i] ? 0 : 1; renderDraft(); return; }
    const step = e.target.closest('[data-step]');
    if (step) { draft.goal = Math.max(1, Math.min(8, draft.goal + +step.dataset.step)); renderDraft(); return; }
    if (e.target.closest('#n-create')) {
      const name = $('#n-name').value.trim() || 'Morning run';
      const id = 'h' + Date.now();
      habits.push({ id, name, icon: draft.icon, unitIcon: draft.icon, unit: 'time', goal: draft.goal, done: 0,
        color: draft.color, time: draft.time, note: `${draft.goal}× a day`, streak: 0, best: 0 });
      renderAll();
      location.hash = 'habits';
      setTimeout(() => celebrate(DESIGN_WIDTH / 2, 360, `${name} planted in your garden`), 350);
      return;
    }
    const sw2 = e.target.closest('.switch');
    if (sw2) { sw2.setAttribute('aria-pressed', sw2.getAttribute('aria-pressed') !== 'true'); return; }
    const buddy = e.target.closest('[data-buddy]');
    if (buddy) {
      $$('[data-buddy]').forEach((b) => b.classList.toggle('on', b === buddy));
      $('#buddy-name').textContent = buddy.dataset.name;
      $('.hero-bear').src = ICON(buddy.dataset.buddy);
      $('.hero-bear').alt = buddy.dataset.name;
      return;
    }
    const theme = e.target.closest('[data-theme-swatch]');
    if (theme) { $$('[data-theme-swatch]').forEach((b) => b.classList.toggle('on', b === theme)); }
  });

  // ---------- sizing & routing ----------
  function fit() {
    let width = Math.min(window.innerWidth, MAX_APP_WIDTH);
    // On wide (desktop) windows, also fit the whole design height so nothing scrolls.
    if (window.innerWidth > MAX_APP_WIDTH) width = Math.min(width, window.innerHeight * DESIGN_WIDTH / DESIGN_HEIGHT);
    scale = width / DESIGN_WIDTH;
    app.style.width = width + 'px';
    stage.style.zoom = scale;
    stage.style.height = (window.innerHeight / scale) + 'px';
  }

  function route() {
    const [name, param] = location.hash.slice(1).split('/');
    const target = ROUTES.includes(name) ? name : 'home';
    if (target === 'habit') { currentHabit = find(param); renderDetail(); }
    if (target === 'new') renderDraft();
    screens.forEach((s) => {
      const active = s.dataset.route === target;
      s.classList.toggle('active', active);
      s.toggleAttribute('inert', !active);
      if (active) s.querySelector('.scroll').scrollTop = 0;
    });
    const tab = TAB_ROUTES.indexOf(target);
    tabbar.classList.toggle('hidden', tab < 0);
    if (tab >= 0) {
      tabbar.style.setProperty('--i', tab);
      $$('.tab', tabbar).forEach((a, i) => {
        a.classList.toggle('active', i === tab);
        if (i === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    }
  }

  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', route);
  fit();
  renderAll();
  renderDraft();
  route();
  // Enable transitions only after the first screen is shown.
  requestAnimationFrame(() => document.body.classList.add('ready'));
})();
