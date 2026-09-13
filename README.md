# JEREN EDUCATION

**Premium Education × Technology**

Цифровая образовательная платформа нового поколения для учителей и учащихся.

**Создатель:** Jeren Gulmyradowa

---

## Возможности

- 📚 **Библиотека** — поиск и каталог образовательных материалов
- 📖 **Словари** — поиск по словарям русского языка (демо-база)
- ✓ **Тесты** — интерактивные тесты с таймером
- ◎ **Ударение** — тренажёр правильного ударения
- 📝 **Курсовые работы** — конструктор структуры работы
- ✦ **Ария** — AI-помощница (демо-режим, backend в разработке)
- 🌐 **RU / TM** — двуязычный интерфейс

---

## Структура проекта

```
jeren-education/
├── index.html
├── css/           — Design System
├── js/
│   ├── i18n/      — Локализация RU / TM
│   ├── components/— Header, Footer, Language Switcher
│   ├── services/  — API-слой (словари, тесты, Ария...)
│   ├── pages/     — Логика страниц
│   └── utils/
├── pages/         — HTML-страницы разделов
├── data/          — JSON-данные (демо)
└── assets/        — Изображения, иконки
```

> Оригинальные материалы хранятся отдельно в `../словари/` и не изменяются.

---

## Локальный запуск

```powershell
cd jeren-education
# ES modules требуют HTTP-сервер:
python -m http.server 8080
# Открыть: http://localhost:8080
```

---

## GitHub Pages

1. Создайте репозиторий на GitHub
2. Загрузите содержимое папки `jeren-education/`
3. Settings → Pages → Source: `main` branch, folder: `/ (root)`
4. Обновите `YOUR_USERNAME` в `robots.txt` и `sitemap.xml`

---

## Будущее развитие

- [ ] Backend API + авторизация
- [ ] Подключение полных словарей (ozhegov.txt, JSON)
- [ ] AI «Ария» через backend (без API-ключей во frontend)
- [ ] Загрузка материалов учителями
- [ ] Личные кабинеты и профили

---

© 2026 JEREN EDUCATION · Created by Jeren Gulmyradowa
