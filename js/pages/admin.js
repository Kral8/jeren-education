import { t } from '../i18n/index.js';
import { isAdmin } from '../services/auth.service.js';
import { listTeachers, createTeacher, updateTeacher } from '../services/teacher.service.js';
import { listAccessRequests, resolveAccessRequest, testEmail } from '../services/access-request.service.js';

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function renderAccessRequests() {
  const tbody = document.getElementById('requests-body');
  if (!tbody) return;
  tbody.replaceChildren();

  const result = await listAccessRequests();
  if (!result.success) {
    tbody.innerHTML = `<tr><td colspan="7">${t('common.error')}</td></tr>`;
    return;
  }

  const pending = result.requests.filter((r) => r.status === 'pending');
  document.getElementById('stat-pending-requests')?.replaceChildren(document.createTextNode(String(pending.length)));

  if (!result.requests.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted">${t('admin.noRequests')}</td></tr>`;
    return;
  }

  result.requests.forEach((req) => {
    const tr = document.createElement('tr');
    const statusKey = req.status === 'pending' ? 'admin.requestPending' : req.status === 'approved' ? 'admin.requestApproved' : 'admin.requestRejected';
    const statusClass = req.status === 'pending' ? 'badge--gold' : req.status === 'approved' ? 'badge--success' : 'badge--muted';
    const deliveryLabel = req.deliveryMethod === 'email' ? t('admin.deliveryEmail') : t('admin.deliveryScreen');

    const location = [req.city, req.region, req.country].filter(Boolean).join(', ') || '—';
    tr.innerHTML = `
      <td>
        <strong>${req.lastName} ${req.firstName}</strong>
        <div class="text-small text-muted">${formatDate(req.createdAt)}</div>
        <span class="badge badge--muted">${deliveryLabel}</span>
        ${req.autoApproved ? `<span class="badge badge--gold">${t('admin.autoApproved')}</span>` : ''}
      </td>
      <td>${req.email || '—'}</td>
      <td class="text-small">${location}</td>
      <td>${req.organization}</td>
      <td>${req.phone || '—'}</td>
      <td>
        <span class="badge ${statusClass}">${t(statusKey)}</span>
        ${req.emailSent ? `<div class="text-small text-muted">${t('admin.emailSent')}</div>` : ''}
        ${req.emailFailed ? `<div class="text-small text-muted">${t('admin.emailFailed')}${req.emailError ? `: ${req.emailError}` : ''}</div>` : ''}
      </td>
      <td class="admin-actions"></td>`;

    const actions = tr.querySelector('.admin-actions');
    if (req.status === 'pending') {
      const approveBtn = document.createElement('button');
      approveBtn.type = 'button';
      approveBtn.className = 'btn btn--primary btn--sm';
      approveBtn.textContent = t('admin.approve');
      approveBtn.addEventListener('click', async () => {
        approveBtn.disabled = true;
        await resolveAccessRequest(req.id, 'approve');
        renderAccessRequests();
        renderTeachers();
      });

      const rejectBtn = document.createElement('button');
      rejectBtn.type = 'button';
      rejectBtn.className = 'btn btn--ghost btn--sm';
      rejectBtn.textContent = t('admin.reject');
      rejectBtn.addEventListener('click', async () => {
        if (!confirm(`${req.lastName} ${req.firstName}?`)) return;
        rejectBtn.disabled = true;
        await resolveAccessRequest(req.id, 'reject');
        renderAccessRequests();
      });

      actions.append(approveBtn, rejectBtn);
    } else if (req.status === 'approved' && (req.emailFailed || req.deliveryMethod === 'email')) {
      const resendBtn = document.createElement('button');
      resendBtn.type = 'button';
      resendBtn.className = 'btn btn--ghost btn--sm';
      resendBtn.textContent = t('admin.resendEmail');
      resendBtn.addEventListener('click', async () => {
        resendBtn.disabled = true;
        await resolveAccessRequest(req.id, 'resend-email');
        renderAccessRequests();
      });
      actions.append(resendBtn);
    }

    tbody.appendChild(tr);
  });
}

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
  const activeCount = teachers.filter((item) => item.status === 'active').length;
  document.getElementById('stat-teachers')?.replaceChildren(document.createTextNode(String(teachers.length)));
  document.getElementById('stat-active')?.replaceChildren(document.createTextNode(String(activeCount)));
  document.getElementById('stat-new')?.replaceChildren(document.createTextNode(String(teachers.filter((item) => !item.lastLogin).length)));
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

  document.getElementById('email-test-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email-test-address')?.value.trim();
    const resultEl = document.getElementById('email-test-result');
    if (!email || !resultEl) return;
    resultEl.hidden = false;
    resultEl.textContent = t('common.loading');
    const result = await testEmail(email, 'JER-TEST-000', 'Test', 'User');
    resultEl.textContent = result.success
      ? t('admin.emailTestOk')
      : `${t('admin.emailTestFail')}: ${result.error || 'unknown'}`;
  });

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

  renderAccessRequests();
  renderTeachers();
  setInterval(renderAccessRequests, 15000);
}

init();
