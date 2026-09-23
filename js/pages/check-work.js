import { t } from '../i18n/index.js';
import { isTeacher, verifySession } from '../services/auth.service.js';
import { analyzeWork, validateFile, extractSuggestedGrade, readDocumentText } from '../services/file-analysis.service.js';
import { renderMarkdown } from '../utils/markdown.js';

let selectedFile = null;
let extractedText = '';
let flowReady = false;

function $(id) {
  return document.getElementById(id);
}

function setAuthView(isAllowed) {
  $('check-auth').hidden = isAllowed;
  $('check-flow').hidden = !isAllowed;
}

function clearFile() {
  selectedFile = null;
  extractedText = '';
  ['file-camera', 'file-photo', 'file-doc'].forEach((id) => {
    const input = $(id);
    if (input) input.value = '';
  });

  const preview = $('file-preview');
  const previewImg = $('file-preview-img');
  const fileName = $('file-name');
  const dropzone = $('check-dropzone');

  if (preview) preview.hidden = true;
  if (previewImg) {
    previewImg.hidden = true;
    previewImg.removeAttribute('src');
  }
  if (fileName) fileName.textContent = '';
  const textPreview = $('file-text-preview');
  if (textPreview) {
    textPreview.hidden = true;
    textPreview.textContent = '';
  }
  dropzone?.classList.remove('check-dropzone--filled');
}

async function showExtractedText(file, mime) {
  const textPreview = $('file-text-preview');
  if (!textPreview) return;

  extractedText = await readDocumentText(file, mime);
  if (extractedText) {
    textPreview.hidden = false;
    textPreview.textContent = extractedText.length > 280
      ? `${extractedText.slice(0, 280)}…`
      : extractedText;
  } else {
    textPreview.hidden = true;
    textPreview.textContent = '';
  }
}

function showFile(file) {
  const preview = $('file-preview');
  const previewImg = $('file-preview-img');
  const fileName = $('file-name');
  const dropzone = $('check-dropzone');
  if (!preview || !fileName) return;

  fileName.textContent = file.name;
  preview.hidden = false;
  dropzone?.classList.add('check-dropzone--filled');

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

function handleSelectedFile(file) {
  if (!file) return;
  const check = validateFile(file);
  if (!check.ok) {
    clearFile();
    showToast(t(`checkWork.errors.${check.error}`));
    return;
  }
  selectedFile = file;
  showFile(file);
  showExtractedText(file, check.mime);
}

function showToast(message) {
  const toast = $('check-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 4000);
}

function bindFileInput(id) {
  $(id)?.addEventListener('change', (e) => {
    handleSelectedFile(e.target.files?.[0]);
  });
}

function bindDropzone() {
  const dropzone = $('check-dropzone');
  if (!dropzone) return;

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('check-dropzone--hover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('check-dropzone--hover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    handleSelectedFile(e.dataTransfer?.files?.[0]);
  });

  dropzone.addEventListener('click', () => {
    $('file-photo')?.click();
  });
}

function setAnalyzing(active) {
  const btn = $('btn-analyze');
  if (!btn) return;
  btn.disabled = active;
  btn.classList.toggle('btn--loading', active);
  btn.dataset.loading = active ? 'true' : 'false';
}

function renderResult(analysis, fallback = false) {
  const resultEl = $('check-result');
  const resultBody = $('result-body');
  const gradeEl = $('result-grade');
  if (!resultEl || !resultBody) return;

  const grade = extractSuggestedGrade(analysis);
  if (gradeEl) {
    if (grade) {
      gradeEl.hidden = false;
      gradeEl.innerHTML = `
        <span class="check-grade__label">${t('checkWork.suggestedGrade')}</span>
        <span class="check-grade__value">${grade.score}<span class="check-grade__max">/${grade.max}</span></span>
        <span class="check-grade__hint">${t('checkWork.gradeHint')}</span>`;
    } else {
      gradeEl.hidden = true;
      gradeEl.replaceChildren();
    }
  }

  renderMarkdown(analysis, resultBody);
  resultEl.hidden = false;

  if (fallback) {
    showToast(t('checkWork.fallbackNote'));
  }

  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function bindAnalyze() {
  $('btn-analyze')?.addEventListener('click', async () => {
    if (!selectedFile) {
      showToast(t('checkWork.noFile'));
      return;
    }

    const meta = {
      subject: $('meta-subject')?.value.trim() || '',
      grade: $('meta-grade')?.value.trim() || '',
      topic: $('meta-topic')?.value.trim() || '',
    };

    $('check-result').hidden = true;
    setAnalyzing(true);

    try {
      const result = await analyzeWork(selectedFile, meta, extractedText);
      if (!result.success) {
        showToast(t('checkWork.analyzeError'));
        return;
      }
      renderResult(result.analysis, result.fallback);
    } catch (error) {
      console.error('[CheckWork]', error);
      showToast(t('checkWork.analyzeError'));
    } finally {
      setAnalyzing(false);
    }
  });
}

function setupFlow() {
  if (flowReady) return;
  flowReady = true;

  bindFileInput('file-camera');
  bindFileInput('file-photo');
  bindFileInput('file-doc');
  bindDropzone();
  $('file-remove')?.addEventListener('click', clearFile);
  bindAnalyze();
}

async function refreshAuthState() {
  await verifySession();
  const allowed = isTeacher();
  setAuthView(allowed);
  if (allowed) setupFlow();
}

function init() {
  refreshAuthState();
  window.addEventListener('authchange', () => {
    refreshAuthState();
  });
}

init();
