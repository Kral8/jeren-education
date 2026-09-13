import { getItem, setItem } from '../utils/storage.js';

const DEFAULT_SECTIONS = [
  'titlePage', 'contents', 'introduction', 'relevance',
  'goal', 'tasks', 'object', 'subject',
  'mainPart', 'conclusion', 'bibliography',
];

export function generateStructure(topic, subject, type, requirements = '') {
  return DEFAULT_SECTIONS.map((key) => ({
    id: key,
    title: key,
    content: key === 'introduction'
      ? `Тема: ${topic}\nПредмет: ${subject}\nТип: ${type}${requirements ? `\nТребования: ${requirements}` : ''}`
      : '',
    filled: false,
  }));
}

export function saveCoursework(data) {
  setItem('coursework_draft', data);
}

export function loadCoursework() {
  return getItem('coursework_draft', null);
}

export function generateBibliographyPlaceholder() {
  return [
    '[Добавьте проверенный источник — автор, название, год, издательство]',
    '[Добавьте учебник или методическое пособие по предмету]',
    '[Добавьте научную статью или монографию по теме]',
  ];
}
