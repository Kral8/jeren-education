const TEST_ITEMS = [
  {
    q: 'В каком слове на месте пропуска пишется НН?',
    options: ['деревянный', 'стеклянный', 'оловянный', 'серебряный'],
    correct: 1,
    explain: 'В прилагательных на -янный пишется НН: стеклянный.',
  },
  {
    q: 'Кто автор «Евгения Онегина»?',
    options: ['Лермонтов', 'Пушкин', 'Тургенев', 'Гоголь'],
    correct: 1,
    explain: 'Роман в стихах написал А.С. Пушкин.',
  },
  {
    q: 'Где верно поставлено ударение?',
    options: ['каталОг', 'катАлог', 'каталог', 'каталóg'],
    correct: 0,
    explain: 'Норма: каталОг.',
  },
];

function extractCount(message) {
  const match = message.match(/(\d+)\s*вопрос/i);
  return match ? Math.min(10, Math.max(1, parseInt(match[1], 10))) : 3;
}

export function buildServerFallback(message) {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (/тест|вопрос|контрольн|викторин/.test(lower)) {
    const count = extractCount(text);
    let body = `Готово! Ниже тест для школьников (${count} вопроса).\n\n`;
    for (let i = 0; i < count; i += 1) {
      const item = TEST_ITEMS[i % TEST_ITEMS.length];
      const letter = ['а', 'б', 'в', 'г'][item.correct];
      body += `### Вопрос ${i + 1}\n${item.q}\n`;
      item.options.forEach((opt, idx) => {
        body += `${['а', 'б', 'в', 'г'][idx]}) ${opt}\n`;
      });
      body += `\n**Ответ:** ${letter}) ${item.options[item.correct]}\n`;
      body += `**Пояснение:** ${item.explain}\n\n---\n\n`;
    }
    body += '_Ответ подготовлен резервным режимом платформы._';
    return body;
  }

  if (/урок|конспект|план/.test(lower)) {
    return 'Могу составить план урока. Напишите класс, предмет и тему — подготовлю структуру занятия с заданиями.';
  }

  const intro = lower.trim();
  if (
    /(кто\s+ты|ты\s+кто|кто\s+такая|что\s+ты|что\s+умеешь|чем\s+можешь|чем\s+помож|расскажи\s+о\s+себе|представься)/.test(intro)
    || /^(привет|здравств|добрый|hello|hi)(?:\s|$|[?.!,])/i.test(intro)
    || /^(ты\s+)?(кто|что)\??$/.test(intro)
    || (/привет/.test(intro) && intro.length < 48)
  ) {
    return `Здравствуйте! Я **Ария** — интеллектуальный помощник JEREN EDUCATION для учителей.

**Чем могу помочь:**
- подготовить урок и конспект;
- создать тесты и задания с ответами;
- разобрать русский язык и литературу;
- проверить текст ученика;
- помочь с методическими материалами и курсовой работой.

Напишите класс, предмет и задачу — например: «Создай 5 вопросов по литературе для 8 класса».`;
  }

  if (text.length < 400) {
    return `Я на связи и готова помочь.

Уточните, пожалуйста, **предмет**, **класс** и **формат** — тест, задания, конспект или разбор текста.

Если нужен быстрый тест — напишите: «Создай 3 вопроса по русскому языку с ответами».`;
  }

  return null;
}

function evalMath(a, op, b) {
  switch (op) {
    case '+': return a + b;
    case '-':
    case '−': return a - b;
    case '*':
    case '×': return a * b;
    case '/':
    case '÷': return b !== 0 ? Math.round((a / b) * 1000) / 1000 : NaN;
    default: return NaN;
  }
}

export function buildWorkAnalysisFromText(text, meta = {}) {
  const work = String(text || '').trim();
  if (!work) {
    return `## Результат проверки

Не удалось прочитать текст работы. Загрузите DOCX, TXT, PDF или чёткое фото.

**Окончательное решение об оценке принимает учитель.**`;
  }

  const subjectLine = `${meta.subject || ''} ${meta.topic || ''} ${work}`.toLowerCase();
  const expr = work.match(/(\d+)\s*([+\-−×*/÷])\s*(\d+)/);
  const isMath = /математ|алгебр|арифмет|геомет|пример|сколько будет/i.test(subjectLine) || expr;

  if (isMath && expr) {
    const a = parseInt(expr[1], 10);
    const op = expr[2];
    const b = parseInt(expr[3], 10);
    const expected = evalMath(a, op, b);
    const expectedStr = String(expected);
    const explicit = work.match(/=\s*(\d+)/);
    const nums = [...work.matchAll(/\d+/g)].map((m) => m[0]).filter((n) => n !== String(a) && n !== String(b));
    const hasAnswer = Boolean(explicit) || nums.includes(expectedStr);

    if (!hasAnswer) {
      return `## Результат проверки

### Текст работы ученика
> ${work}

### Предварительная оценка
**2 / 5**

В работе только задание **${a} ${op} ${b}**, ответ не записан. Правильный ответ: **${expectedStr}**.

### Рекомендация учителю
Предлагаю поставить **2** из 5.

**Окончательное решение об оценке принимает учитель.**`;
    }

    const studentAnswer = explicit?.[1] || nums.find((n) => n !== expectedStr);
    const isCorrect = explicit?.[1] === expectedStr || nums.includes(expectedStr);

    if (isCorrect) {
      return `## Результат проверки

### Текст работы ученика
> ${work}

### Предварительная оценка
**5 / 5**

Пример **${a} ${op} ${b}** решён верно. Ответ **${expectedStr}** правильный.

### Рекомендация учителю
Предлагаю поставить **5** из 5.

**Окончательное решение об оценке принимает учитель.**`;
    }

    return `## Результат проверки

### Текст работы ученика
> ${work}

### Предварительная оценка
**2 / 5**

Неверный ответ. Правильно: **${expectedStr}**${studentAnswer ? `, у ученика: **${studentAnswer}**` : ''}.

### Рекомендация учителю
Предлагаю поставить **2** из 5.

**Окончательное решение об оценке принимает учитель.**`;
  }

  return `## Результат проверки

### Текст работы ученика
> ${work.length > 500 ? `${work.slice(0, 500)}…` : work}

### Предварительная оценка
**4 / 5**

Текст работы прочитан. Предмет: «${meta.subject || 'не указан'}», класс: ${meta.grade || 'не указан'}, тема: «${meta.topic || 'не указана'}».

### Рекомендация учителю
Предлагаю поставить **4** из 5 после вашей проверки.

**Окончательное решение об оценке принимает учитель.**`;
}
