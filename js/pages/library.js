import { t } from '../i18n/index.js';
import { searchMaterials, toggleFavorite, isFavorite } from '../services/library.service.js';

const basePath = document.body.dataset.base || '../';

const CATEGORIES = [
  'all', 'russian', 'literature', 'pedagogy', 'methodology',
  'materials', 'coursework', 'notes', 'presentations', 'tests', 'recommendations',
];

export async function init() {
  const grid = document.getElementById('library-grid');
  const searchInput = document.getElementById('library-search');
  const filtersEl = document.getElementById('library-filters');
  if (!grid) return;

  let activeCategory = 'all';

  filtersEl.innerHTML = CATEGORIES.map((cat) =>
    `<button class="filter-btn${cat === 'all' ? ' filter-btn--active' : ''}" data-cat="${cat}">
      ${cat === 'all' ? t('library.allCategories') : t(`library.categories.${cat}`)}
    </button>`
  ).join('');

  filtersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    filtersEl.querySelectorAll('.filter-btn').forEach((b) =>
      b.classList.toggle('filter-btn--active', b === btn)
    );
    render(searchInput.value, activeCategory);
  });

  searchInput?.addEventListener('input', () => render(searchInput.value, activeCategory));

  async function render(query, category) {
    const items = await searchMaterials(query, category, basePath);
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state" data-i18n="library.noResults">${t('library.noResults')}</div>`;
      return;
    }
    grid.innerHTML = items.map((item) => {
      const fav = isFavorite(item.id);
      const catLabel = t(`library.categories.${item.category}`);
      return `
        <article class="card card--interactive">
          <div class="card__header">
            <span class="badge badge--gold">${catLabel}</span>
            <h3 class="card__title">${item.title}</h3>
            <p class="card__subtitle">${item.author} · ${item.year}</p>
          </div>
          <div class="card__body">${item.description}</div>
          <div class="card__footer">
            <button class="btn btn--ghost btn--sm fav-btn" data-id="${item.id}">
              ${fav ? t('library.removeFavorite') : t('library.addFavorite')}
            </button>
            <span class="badge badge--muted">${item.type.toUpperCase()}</span>
          </div>
        </article>`;
    }).join('');

    grid.querySelectorAll('.fav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleFavorite(btn.dataset.id);
        render(query, category);
      });
    });
  }

  window.addEventListener('langchange', () => render(searchInput?.value || '', activeCategory));

  await render('', 'all');
}

init();
