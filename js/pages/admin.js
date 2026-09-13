import { t } from '../i18n/index.js';
import { isAdmin } from '../services/auth.service.js';
import { listTeachers, createTeacher, updateTeacher } from '../services/teacher.service.js';

async function renderTeachers() {
  const tbody = document.getElementById('teachers-body');
  if (!tbody) return;
  tbody.replaceChildren();

  const result = await listTeachers();
  if (!result.success) {
    tbody.innerHTML = `<tr><td colspan="4">${t('common.error')}</td></tr>`;
    return;
  }

  const teachers = result.teachers;
  const activeCount = teachers.filter((t) => t.status === 'active').length;
  document.getElementById('stat-teachers')?.replaceChildren(document.createTextNode(String(teachers.length)));
  document.getElementById('stat-active')?.replaceChildren(document.createTextNode(String(activeCount)));
  document.getElementById('stat-new')?.replaceChildren(document.createTextNode(String(teachers.filter((t) => !t.lastLogin).length)));
  document.getElementById('stat-checks')?.replaceChildren(document.createTextNode('—'));

  teachers.forEach((teacher) => {
    const tr = document.createElement('tr');
    const statusLabel = teacher.status === 'active' ? t('admin.active') : t('admin.inactive');
    tr.innerHTML = `
      <td>${teacher.firstName} ${teacher.lastName}</td>
      <td><code class="admin-code">${teacher.code}</code></td>
      <td><span class="badge ${teacher.status === 'active' ? 'badge--gold' : ''}">${statusLabel}</span></td>
      <td class="admin-actions"></td>`;

    const actions = tr.querySelector('.admin-actions');
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'btn btn--ghost btn--sm';
    toggleBtn.textContent = teacher.status === 'active' ? t('admin.deactivate') : t('admin.activate');
    toggleBtn.addEventListener('click', async () => {
      await updateTeacher(teacher.id, { status: teacher.status === 'active' ? 'inactive' : 'active' });
      renderTeachers();
    });

    const codeBtn = document.createElement('button');
    codeBtn.type = 'button';
    codeBtn.className = 'btn btn--ghost btn--sm';
    codeBtn.textContent = t('admin.newCode');
    codeBtn.addEventListener('click', async () => {
      await updateTeacher(teacher.id, { regenerateCode: true });
      renderTeachers();
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn--ghost btn--sm';
    delBtn.textContent = t('admin.delete');
    delBtn.addEventListener('click', async () => {
      if (confirm(`${teacher.firstName} ${teacher.lastName}?`)) {
        await updateTeacher(teacher.id, { delete: true });
        renderTeachers();
      }
    });

    actions.append(toggleBtn, codeBtn, delBtn);
    tbody.appendChild(tr);
  });
}

function init() {
  if (!isAdmin()) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('teacher-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('teacher-first')?.value || '';
    const lastName = document.getElementById('teacher-last')?.value || '';
    const result = await createTeacher(firstName, lastName);
    if (result.success) {
      e.target.reset();
      renderTeachers();
    }
  });

  renderTeachers();
}

init();
