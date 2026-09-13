import { t } from '../i18n/index.js';
import { getUser, getRole, isAuthenticated, logout } from '../services/auth.service.js';

const SECTIONS = [
  { key: 'aria', href: 'aria.html', icon: 'А', roles: ['admin', 'teacher', 'guest'] },
  { key: 'checkWork', href: 'check-work.html', icon: '✓', roles: ['admin', 'teacher'] },
  { key: 'library', href: 'library.html', icon: '📚', roles: ['admin', 'teacher', 'guest'] },
  { key: 'dictionaries', href: 'dictionaries.html', icon: 'Aa', roles: ['admin', 'teacher', 'guest'] },
  { key: 'admin', href: 'admin.html', icon: '⚙', roles: ['admin'] },
];

function init() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  const user = getUser();
  const role = getRole();
  const welcome = document.getElementById('dashboard-welcome');

  if (role === 'admin') {
    welcome.textContent = t('dashboard.adminWelcome');
  } else if (role === 'guest') {
    welcome.textContent = t('dashboard.guestWelcome');
  } else {
    welcome.textContent = `${t('dashboard.welcome')}, ${user?.displayName || ''}!`;
  }

  const section = document.querySelector('.section.container');
  section?.querySelector('.profile-card')?.remove();

  if (role === 'teacher' && user) {
    const profile = document.createElement('div');
    profile.className = 'profile-card card';
    profile.innerHTML = `
      <div class="profile-card__name">${user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ')}</div>
      <div class="profile-card__role">${t('dashboard.teacherRole')}</div>
      <div class="profile-card__status">${t('dashboard.active')}</div>`;
    section?.insertBefore(profile, document.getElementById('dashboard-grid'));
  }

  const grid = document.getElementById('dashboard-grid');
  grid.replaceChildren();
  SECTIONS.filter((s) => s.roles.includes(role)).forEach((section) => {
    const card = document.createElement('a');
    card.href = section.href;
    card.className = 'dashboard-card card card--interactive';
    card.innerHTML = `<div class="dashboard-card__icon">${section.icon}</div>
      <div class="dashboard-card__title">${t(`dashboard.sections.${section.key}`)}</div>`;
    grid.appendChild(card);
  });

  document.getElementById('dashboard-logout')?.addEventListener('click', async () => {
    await logout();
    window.location.href = 'login.html';
  });
}

init();
