import { t } from '../i18n/index.js';
import { isTeacher } from '../services/auth.service.js';
import { analyzeWork, validateFile } from '../services/file-analysis.service.js';
import { renderMarkdown } from '../utils/markdown.js';

let selectedFile = null;

function clearFile() {
  selectedFile = null;
  ['file-camera', 'file-photo', 'file-doc'].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
  const preview = document.getElementById('file-preview');
  const previewImg = document.getElementById('file-preview-img');
  const fileName = document.getElementById('file-name');
  if (preview) preview.hidden = true;
  if (previewImg) {
    previewImg.hidden = true;
    previewImg.removeAttribute('src');
  }
  if (fileName) fileName.textContent = '';
}

function showFile(file) {
  const preview = document.getElementById('file-preview');
  const previewImg = document.getElementById('file-preview-img');
  const fileName = document.getElementById('file-name');
  if (!preview || !fileName) return;

  fileName.textContent = file.name;
  preview.hidden = false;

  if (file.type.startsWith('image/') && previewImg) {
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewImg.hidden = false;
    previewImg.onload = () => URL.revokeObjectURL(url);
  } else if (previewImg) {
    previewImg.hidden = true;
    previewImg.removeAttribute('src');
  }
}

function bindFileInput(id) {
  document.getElementById(id)?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateFile(file);
    if (!check.ok) {
      clearFile();
      document.getElementById('file-name').textContent = t('common.error');
      return;
    }
    selectedFile = file;
    showFile(file);
  });
}

async function runProgressStages() {
  const list = document.getElementById('progress-list');
  const stages = ['received', 'recognized', 'tasks', 'checking', 'recommendations'];
  list.replaceChildren();
  for (let i = 0; i < stages.length; i++) {
    const li = document.createElement('li');
    li.textContent = t(`checkWork.stages.${stages[i]}`);
    li.className = i < stages.length - 1 ? 'done' : 'active';
    list.appendChild(li);
    await new Promise((r) => setTimeout(r, 400));
    if (i > 0) list.children[i - 1]?.classList.replace('active', 'done');
  }
}

function init() {
  if (!isTeacher()) {
    document.getElementById('check-auth').hidden = false;
    document.getElementById('check-flow').hidden = true;
    return;
  }

  bindFileInput('file-camera');
  bindFileInput('file-photo');
  bindFileInput('file-doc');

  document.getElementById('file-remove')?.addEventListener('click', clearFile);

  document.getElementById('btn-analyze')?.addEventListener('click', async () => {
    if (!selectedFile) return;

    const progress = document.getElementById('check-progress');
    const resultEl = document.getElementById('check-result');
    const resultBody = document.getElementById('result-body');
    progress.hidden = false;
    resultEl.hidden = true;

    await runProgressStages();

    const meta = {
      subject: document.getElementById('meta-subject')?.value || '',
      grade: document.getElementById('meta-grade')?.value || '',
      topic: document.getElementById('meta-topic')?.value || '',
      workType: document.getElementById('meta-type')?.value || '',
      maxGrade: Number(document.getElementById('meta-max')?.value) || 5,
      gradingSystem: '5-балльная',
    };

    const result = await analyzeWork(selectedFile, meta);
    progress.hidden = true;

    if (!result.success) {
      resultBody.replaceChildren();
      const err = document.createElement('p');
      err.className = 'check-result__error';
      err.textContent = t('common.error');
      resultBody.appendChild(err);
      resultEl.hidden = false;
      return;
    }

    renderMarkdown(result.analysis, resultBody);
    resultEl.hidden = false;
  });
}

init();
