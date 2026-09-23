/**
 * Renders safe document model into DOM (textContent only)
 */

export function renderHtmlDocument(html, container) {
  container.replaceChildren();
  const article = document.createElement('article');
  article.className = 'je-reader__html';
  article.innerHTML = html;
  container.appendChild(article);
  applyCopyProtection(container);
}

export function renderDocument(sections, container, options = {}) {
  container.replaceChildren();
  const frag = document.createDocumentFragment();

  sections.forEach((section, index) => {
    if (section.type === 'heading') {
      const h = document.createElement(`h${Math.min(section.level || 2, 3)}`);
      h.className = 'je-reader__heading';
      h.id = section.id || `je-sec-${index}`;
      h.textContent = section.text;
      frag.appendChild(h);
    } else {
      const p = document.createElement('p');
      p.className = 'je-reader__paragraph';
      p.textContent = section.text;
      frag.appendChild(p);
    }
  });

  container.appendChild(frag);
  applyCopyProtection(container);
}

export function applyCopyProtection(container) {
  container.classList.add('je-reader__protected');
  container.addEventListener('contextmenu', (e) => e.preventDefault());
  container.addEventListener('copy', (e) => e.preventDefault());
  container.addEventListener('cut', (e) => e.preventDefault());
  container.addEventListener('selectstart', (e) => e.preventDefault());
}

export function renderToc(toc, container, scrollRoot, tocTitle = 'Содержание') {
  container.replaceChildren();
  if (!toc?.length) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  const title = document.createElement('div');
  title.className = 'je-reader-toc__title';
  title.textContent = tocTitle;
  container.appendChild(title);

  toc.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `je-reader-toc__item je-reader-toc__item--l${item.level || 1}`;
    btn.textContent = item.text;
    btn.addEventListener('click', () => {
      const target = scrollRoot.querySelector(`#${CSS.escape(item.id)}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    container.appendChild(btn);
  });
}
