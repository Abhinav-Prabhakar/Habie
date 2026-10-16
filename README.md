# Habie

A mobile habit-tracker UI with three linked screens. It's design only; no data is saved.

| Route          | Screen                                  | Reached from                                      |
|----------------|-----------------------------------------|---------------------------------------------------|
| `#home`        | Home / Today's habits (default)         | Tab bar                                           |
| `#tracker`     | My Habits Tracker                       | Tab bar, garden "See insights"                    |
| `#habits`      | Habit garden + habit cards              | Tab bar, Home grid icon                           |
| `#habit/<id>`  | Habit detail (fill tank, log, heatmap)  | Any habit row or card, Tracker cards              |
| `#new`         | New habit builder                       | `+` on Home or Habits, "New habit" card           |
| `#settings`    | Profile, badges, buddy, preferences     | Tab bar                                           |
| `#chat`        | Chat buddy                              | Home bubble or frog, buddy card, Help & feedback  |

State lives in memory and resets on reload. Checking a habit, logging units or planting a new
habit updates every screen and plays a small confetti celebration.

Open `index.html` in a browser. On phones the app fills the screen; on wider windows it
shows as a centred phone-width column.

- `index.html` – markup for all three screens
- `styles.css` – styling (authored on a 541px-wide design canvas)
- `app.js` – scales the canvas to the window, hash routing, and the in-memory habit data
- `assets/3d/` – 3D illustrations from [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji)
  (MIT licence, see `assets/3d/LICENSE`); some are recoloured to match the palette
- `reference/` – the original mockups
