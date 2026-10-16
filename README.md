# Habie

A mobile habit-tracker UI with three linked screens. It's design only; no data is saved.

| Route      | Screen                         | Reached from                                      |
|------------|--------------------------------|---------------------------------------------------|
| `#home`    | Home / Today's habits (default)| Tracker tab bar, chat back button                 |
| `#tracker` | My Habits Tracker              | Home tab bar                                      |
| `#chat`    | Chat buddy                     | Home: "Let's start small!" bubble or the frog     |

Open `index.html` in a browser. On phones the app fills the screen; on wider windows it
shows as a centred phone-width column. Habits and Settings in the tab bar have no screens yet.

- `index.html` – markup for all three screens
- `styles.css` – styling (authored on a 541px-wide design canvas)
- `app.js` – scales the canvas to the window and handles hash routing
- `assets/3d/` – 3D illustrations from [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji)
  (MIT licence, see `assets/3d/LICENSE`); some are recoloured to match the palette
- `reference/` – the original mockups
