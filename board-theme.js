/* Visual preference is stored separately from the saved game. */
(() => {
  'use strict';
  const select = document.getElementById('board-theme');
  const board = document.getElementById('board');
  const status = document.getElementById('board-theme-status');
  const key = 'dudecCheckersBoardThemeV1';
  let state = 'loading';
  let storageFailed = false;
  try {
    if (localStorage.getItem(key) === 'd1') select.value = 'd1';
  } catch { /* The classic board remains available without storage. */ }
  function refresh() {
    const custom = select.value === 'd1';
    board.classList.toggle('theme-d1', custom && state === 'ready');
    status.textContent = custom && state === 'error'
      ? 'Не вдалося відкрити d1.png. Поки показуємо класичну дошку.'
      : custom && state === 'loading'
        ? 'Завантажуємо дошку d1…'
        : storageFailed ? 'Вибір діє зараз, але не вдалося його зберегти.' : '';
  }
  select.addEventListener('change', () => {
    try { localStorage.setItem(key, select.value); storageFailed = false; }
    catch { storageFailed = true; }
    refresh();
  });
  const artwork = new Image();
  artwork.onload = () => { state = 'ready'; refresh(); };
  artwork.onerror = () => { state = 'error'; refresh(); };
  refresh();
  artwork.src = 'd1.png';
})();
