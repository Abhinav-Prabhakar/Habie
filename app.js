// Habie — screen sizing and hash routing.
// Screens are laid out in 541-unit-wide design pixels and zoomed to fit the app column.
(function () {
  const DESIGN_WIDTH = 541;
  const DESIGN_HEIGHT = 1172;
  const MAX_APP_WIDTH = 440;
  const ROUTES = ['home', 'tracker', 'chat'];

  const app = document.getElementById('app');
  const stage = document.getElementById('stage');
  const screens = [...document.querySelectorAll('.screen')];

  function fit() {
    let width = Math.min(window.innerWidth, MAX_APP_WIDTH);
    // On wide (desktop) windows, also fit the whole design height so nothing scrolls.
    if (window.innerWidth > MAX_APP_WIDTH) width = Math.min(width, window.innerHeight * DESIGN_WIDTH / DESIGN_HEIGHT);
    const scale = width / DESIGN_WIDTH;
    app.style.width = width + 'px';
    stage.style.zoom = scale;
    stage.style.height = (window.innerHeight / scale) + 'px';
  }

  function route() {
    const name = location.hash.slice(1);
    const target = ROUTES.includes(name) ? name : 'home';
    screens.forEach((s) => {
      const active = s.dataset.route === target;
      s.classList.toggle('active', active);
      s.toggleAttribute('inert', !active);
      if (active) s.querySelector('.scroll').scrollTop = 0;
    });
  }

  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', route);
  fit();
  route();
  // Enable transitions only after the first screen is shown.
  requestAnimationFrame(() => document.body.classList.add('ready'));
})();
