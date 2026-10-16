# Habie

A mobile habit-tracker UI with three linked screens. It's design only; no data is saved.

| Route          | Screen                                                     |
|----------------|------------------------------------------------------------|
| `#home`        | Today: water / sleep / exercise, progress, habit list      |
| `#tracker`     | Streak, sleep chart, weekly score, last-7-days per habit   |
| `#habits`      | Week strip, habit garden, time-of-day filters, habit cards |
| `#habit/<id>`  | Fill tank, logging (litres for water), stats, heatmap      |
| `#new`, `#edit/<id>` | Habit editor                                         |
| `#settings`    | Profile & level, badges, buddy, preferences, data          |
| `#chat`        | Local chat buddy with tips, schedule and progress          |

Everything is saved in the browser's localStorage (key `habie.v2`). The first launch seeds six
weeks of demo history; **Settings → Your data → Start fresh** clears it, and **Export** downloads
your data as JSON.

What works: logging (tap the round button to add a step; water is tracked in litres), streaks,
XP/levels and badges computed from your log, sleep logging, editing and deleting habits, search,
the menu drawer, dark mode, four colour themes, synthesised sounds, focus mode (hides finished
habits), share/invite (Web Share or clipboard) and reminders. Reminders use browser notifications
and only fire while Habie is open — there is no server or service worker.

Open `index.html` in a browser. On phones the app fills the screen; on wider windows it
shows as a centred phone-width column.

- `index.html` – markup for all three screens
- `styles.css` – styling (authored on a 541px-wide design canvas)
- `app.js` – scales the canvas to the window, hash routing, and the in-memory habit data
- `assets/3d/` – 3D illustrations from [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji)
  (MIT licence, see `assets/3d/LICENSE`); some are recoloured to match the palette
- `reference/` – the original mockups
