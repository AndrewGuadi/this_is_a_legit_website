'use strict';
const filters = document.querySelector('[data-filters]');
if (filters) {
  filters.hidden = false;
  const cards = Array.from(document.querySelectorAll('[data-genre]'));
  const status = document.querySelector('[data-filter-status]');
  filters.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-filter]');
    if (!button || !filters.contains(button)) return;
    filters.querySelectorAll('button').forEach(function (item) {
      const selected = item === button;
      item.setAttribute('aria-pressed', String(selected));
      item.classList.toggle('active', selected);
    });
    let visible = 0;
    cards.forEach(function (card) {
      const match = button.dataset.filter === 'all' || card.dataset.genre === button.dataset.filter;
      card.hidden = !match;
      if (match) visible += 1;
    });
    if (status) status.textContent = visible + ' concept' + (visible === 1 ? '' : 's') + ' shown.';
  });
}
