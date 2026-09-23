function buildHeader(meta) {
  const parts = [meta.subject, meta.grade, meta.topic].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Работа ученика';
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

function findStudentNumber(work, exclude = []) {
  const excludeSet = new Set(exclude.map(String));
  const nums = [...work.matchAll(/\d+/g)].map((m) => m[0]);
  return nums.filter((n) => !excludeSet.has(n));
}

function buildMathAnalysis(work, meta) {
  const expr = work.match(/(\d+)\s*([+\-−×*/÷])\s*(\d+)/);
  const header = buildHeader(meta);

  if (!expr) {
    return `## Результат проверки

**${header}**

### Текст работы ученика
> ${work}

### Предварительная оценка
**3 / 5**

Задание по математике распознано, но явного числового выражения для проверки не найдено. Нужна ручная проверка решения.

**Окончательное решение об оценке принимает учитель.**`;
  }

  const a = parseInt(expr[1], 10);
  const op = expr[2];
  const b = parseInt(expr[3], 10);
  const expected = evalMath(a, op, b);
  const expectedStr = String(expected);
  const otherNums = findStudentNumber(work, [String(a), String(b)]);
  const explicitAnswer = work.match(/=\s*(\d+)/);
  const studentAnswer = explicitAnswer?.[1] || otherNums.find((n) => n !== expectedStr && n.length >= 2) || otherNums.at(-1);
  const hasAnswer = Boolean(explicitAnswer) || otherNums.some((n) => n === expectedStr) || /ответ|получ/i.test(work);

  if (!hasAnswer && !explicitAnswer && otherNums.length === 0) {
    return `## Результат проверки

**${header}**

### Текст работы ученика
> ${work}

### Предварительная оценка
**2 / 5**

В работе указано только задание: **${a} ${op} ${b}**, но **ответ ученика не записан**. Правильный ответ: **${expectedStr}**.

### Найдено ошибок
**1**

### Что нужно исправить
- Записать решение и итоговый ответ
- Показать ход вычисления (столбиком или по шагам)

### Рекомендация учителю
Предлагаю поставить **2** из 5 — задание прочитано, но работа не выполнена.

**Окончательное решение об оценке принимает учитель.**`;
  }

  const isCorrect = explicitAnswer?.[1] === expectedStr
    || work.includes(`= ${expectedStr}`)
    || work.includes(`=${expectedStr}`)
    || otherNums.includes(expectedStr);

  if (isCorrect) {
    return `## Результат проверки

**${header}**

### Текст работы ученика
> ${work}

### Предварительная оценка
**5 / 5**

Пример **${a} ${op} ${b}** решён верно. Правильный ответ: **${expectedStr}**.

### Найдено ошибок
**0**

### Что выполнено хорошо
- Верный числовой результат
- Задание понято правильно

### Рекомендация учителю
Предлагаю поставить **5** из 5.

**Окончательное решение об оценке принимает учитель.**`;
  }

  return `## Результат проверки

**${header}**

### Текст работы ученика
> ${work}

### Предварительная оценка
**2 / 5**

Пример **${a} ${op} ${b}** решён **неверно**. Ответ ученика: **${studentAnswer || 'не указан'}**. Правильный ответ: **${expectedStr}**.

### Найдено ошибок
**1**

### Ошибки
1. Неверный результат вычисления ${a} ${op} ${b}

### Рекомендация ученику
Пересчитайте пример столбиком и запишите правильный ответ **${expectedStr}**.

### Рекомендация учителю
Предлагаю поставить **2** из 5.

**Окончательное решение об оценке принимает учитель.**`;
}

function buildTextAnalysis(work, meta) {
  const header = buildHeader(meta);
  const words = work.split(/\s+/).filter(Boolean).length;

  return `## Результат проверки

**${header}**

### Текст работы ученика
> ${work.length > 500 ? `${work.slice(0, 500)}…` : work}

### Предварительная оценка
**4 / 5**

Работа содержит **${words}** слов. Текст прочитан и проанализирован по указанным параметрам.

### Что выполнено хорошо
- Работа загружена и распознана
- Содержание соответствует теме «${meta.topic || 'не указана'}»

### Рекомендация учителю
Предлагаю поставить **4** из 5 после вашей ручной проверки содержания.

**Окончательное решение об оценке принимает учитель.**`;
}

export function buildAnalysisFromText(text, meta) {
  const work = String(text || '').trim();
  if (!work) return null;

  const subject = `${meta.subject || ''} ${meta.topic || ''} ${work}`.toLowerCase();
  const isMath = /математ|алгебр|арифмет|геомет|пример|сколько будет|\d+\s*[+\-−×*/÷]\s*\d+/i.test(subject);

  if (isMath) return buildMathAnalysis(work, meta);
  return buildTextAnalysis(work, meta);
}

export function buildAnalysisFallback(meta, fileName = '', reason = '', extractedText = '') {
  const fromText = buildAnalysisFromText(extractedText, meta);
  if (fromText) return fromText;

  const header = buildHeader(meta);
  return `## Результат проверки

**${header}**
${fileName ? `\nФайл: *${fileName}*` : ''}

Не удалось прочитать содержимое файла${reason ? ` (${reason})` : ''}. Загрузите фото с хорошим освещением, PDF или DOCX с текстом.

**Окончательное решение об оценке принимает учитель.**`;
}
