import { t } from '../i18n/index.js';
import { generateStructure, saveCoursework, loadCoursework, generateBibliographyPlaceholder } from '../services/coursework.service.js';

const SECTION_KEYS = [
  'titlePage', 'contents', 'introduction', 'relevance',
  'goal', 'tasks', 'object', 'subject', 'mainPart', 'conclusion', 'bibliography',
];

export function init() {
  const form = document.getElementById('coursework-form');
  const sectionsEl = document.getElementById('coursework-sections');
  if (!form) return;

  const saved = loadCoursework();
  if (saved) renderSections(saved.sections, sectionsEl);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const topic = document.getElementById('cw-topic').value;
    const subject = document.getElementById('cw-subject').value;
    const type = document.getElementById('cw-type').value;
    const requirements = document.getElementById('cw-requirements').value;
    const sections = generateStructure(topic, subject, type, requirements).map((s) => ({
      ...s,
      title: t(`coursework.sectionTitles.${s.id}`),
    }));
    if (sections.find((s) => s.id === 'bibliography')) {
      sections.find((s) => s.id === 'bibliography').content =
        generateBibliographyPlaceholder().join('\n');
    }
    saveCoursework({ topic, subject, type, sections });
    renderSections(sections, sectionsEl);
    sectionsEl.scrollIntoView({ behavior: 'smooth' });
  });
}

function renderSections(sections, el) {
  el.innerHTML = sections.map((s, i) => `
    <div class="coursework-section">
      <div class="coursework-section__title">${i + 1}. ${s.title}</div>
      <textarea class="form-textarea" rows="3" data-idx="${i}">${s.content || ''}</textarea>
    </div>`).join('');

  el.querySelectorAll('textarea').forEach((ta) => {
    ta.addEventListener('change', () => {
      const data = loadCoursework();
      if (data) {
        data.sections[parseInt(ta.dataset.idx, 10)].content = ta.value;
        saveCoursework(data);
      }
    });
  });
}

init();
