import { t } from '../i18n/index.js';
import {
  generateStructure,
  saveCoursework,
  loadCoursework,
  buildDocumentText,
} from '../services/coursework.service.js';

let currentData = null;

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderSheet(data) {
  const output = document.getElementById('coursework-output');
  const sheet = document.getElementById('coursework-sheet');
  const meta = document.getElementById('coursework-meta');
  if (!output || !sheet) return;

  currentData = data;
  output.hidden = false;

  if (meta) {
    meta.textContent = `${data.typeLabel} · ${data.subjectLabel} · «${data.topic}»`;
  }

  sheet.innerHTML = data.sections.map((section) => `
    <section class="coursework-sheet__section">
      <h3 class="coursework-sheet__heading">${escapeHtml(section.title)}</h3>
      <div class="coursework-sheet__body">${escapeHtml(section.content).replace(/\n/g, '<br>')}</div>
    </section>
  `).join('');

  output.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function copyDocument() {
  const text = buildDocumentText(currentData);
  const status = document.getElementById('coursework-copy-status');
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    if (status) {
      status.textContent = t('coursework.copied');
      status.hidden = false;
      setTimeout(() => { status.hidden = true; }, 2500);
    }
  } catch {
    const sheet = document.getElementById('coursework-sheet');
    if (!sheet) return;
    const range = document.createRange();
    range.selectNodeContents(sheet);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
    selection.removeAllRanges();
    if (status) {
      status.textContent = t('coursework.copied');
      status.hidden = false;
      setTimeout(() => { status.hidden = true; }, 2500);
    }
  }
}

function printDocument() {
  if (!currentData) return;
  const text = buildDocumentText(currentData);
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(currentData.topic)}</title>
      <style>
        body { font-family: Georgia, serif; line-height: 1.65; color: #111; padding: 40px; max-width: 780px; margin: 0 auto; }
        h1 { font-size: 18px; text-align: center; margin-bottom: 28px; }
        h2 { font-size: 14px; margin: 24px 0 10px; text-transform: uppercase; letter-spacing: 0.08em; }
        pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; margin: 0; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(currentData.typeLabel)}<br>«${escapeHtml(currentData.topic)}»</h1>
      <pre>${escapeHtml(text)}</pre>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function init() {
  const form = document.getElementById('coursework-form');
  if (!form) return;

  const saved = loadCoursework();
  if (saved?.sections?.length) {
    document.getElementById('cw-topic').value = saved.topic || '';
    document.getElementById('cw-subject').value = saved.subject || 'russian';
    document.getElementById('cw-type').value = saved.type || 'course';
    document.getElementById('cw-requirements').value = saved.requirements || '';
    renderSheet(saved);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const topic = document.getElementById('cw-topic').value.trim();
    if (!topic) return;

    const subject = document.getElementById('cw-subject').value;
    const type = document.getElementById('cw-type').value;
    const requirements = document.getElementById('cw-requirements').value.trim();
    const data = generateStructure(topic, subject, type, requirements);
    saveCoursework(data);
    renderSheet(data);
  });

  document.getElementById('cw-copy')?.addEventListener('click', copyDocument);
  document.getElementById('cw-print')?.addEventListener('click', printDocument);
}

init();
